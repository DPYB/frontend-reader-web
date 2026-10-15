import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useBooks } from '../../store/booksStore'
import { useAuth } from '../../store/authStore'
import { useLibrarian } from '../../store/librarianStore'
import { getLibraryBook, toReadingStatus } from '../../api/bookApi'
import { GENRE_DEFS, GENRE_NONE } from '../../data/genres'
import { getColorPresets } from '../register/ocrUtils'
import { getVisual, setVisual } from '../../store/bookVisuals'
import SentenceCollectModal from './SentenceCollectModal'
import ScrapGallery from './ScrapGallery'
import ReadingTimerModal from './ReadingTimerModal'
import ReadingSessionHistory from './ReadingSessionHistory'
import Book3DViewer from './Book3DViewer'
import { useResponsive } from '../../hooks/useResponsive'
import { useLanguage } from '../../store/languageStore'

const STATUS_OPTIONS = ['시작전', '읽는 중', '잠시 멈춤', '완독']

/**
 * BookDetail — 선택된 책의 상세 정보 팝업.
 *
 * @param {object} book - 선택된 책 데이터 (목록 요약: bookId/title/author/status 등)
 * @param {()=>void} onClose - 닫기 콜백
 * @param {()=>void} [onBackToShelf] - 선반으로 되돌아가기 콜백 (모바일 등)
 */
export default function BookDetail({ book, onClose, onBackToShelf }) {
  const { t, formatStatus, formatGenre } = useLanguage()
  const { isGuest, member } = useAuth()
  const { activeId: librarianId } = useLibrarian()
  const presets = useMemo(() => getColorPresets(librarianId), [librarianId])
  const { removeBook, saveReadingProgress, saveBookMeta, reload } = useBooks()
  const [currentPage, setCurrentPage] = useState(0)
  const [totalPage, setTotalPage] = useState(0)
  const [status, setStatus] = useState(book.status || '시작전')
  const [genre, setGenre] = useState(book.genre || GENRE_NONE)
  // 책 표지 — 목록 요약값으로 먼저 보여 주고, 상세 조회 후 최신값으로 교체한다.
  const [coverUrl, setCoverUrl] = useState(book.coverUrl || null)
  const [editing, setEditing] = useState(false)

  // 도서 시각 정보 (책등/표지 색상 및 선택 인덱스)
  const initialVisual = useMemo(
    () => getVisual(book.bookId, librarianId),
    [book.bookId, librarianId]
  )
  const [selectedColorIdx, setSelectedColorIdx] = useState(() => {
    if (book.colorIdx != null && presets[book.colorIdx]) return book.colorIdx
    if (initialVisual?.colorIdx != null && presets[initialVisual.colorIdx]) return initialVisual.colorIdx
    const foundIdx = presets.findIndex((p) => p.spine === (book.spineColor || initialVisual?.spineColor))
    return foundIdx >= 0 ? foundIdx : 0
  })
  const [spineColor, setSpineColor] = useState(
    book.spineColor || initialVisual?.spineColor || presets[0]?.spine
  )
  const [coverColor, setCoverColor] = useState(
    book.coverColor || initialVisual?.coverColor || presets[0]?.cover
  )

  // 현재 페이지 저장 결과 안내 팝업 ("확인"으로 닫음)
  const [notice, setNotice] = useState(null)
  const [savingProgress, setSavingProgress] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [showSentenceModal, setShowSentenceModal] = useState(false)
  const [showTimer, setShowTimer] = useState(false)
  // 우측 패널 탭: 'scraps' (수집한 문장) | 'sessions' (독서 타이머 기록)
  const [rightTab, setRightTab] = useState('scraps')
  // 문장 수집 모달을 닫을 때 값을 올려 갤러리를 처음부터 다시 로드시킨다 (CLIAR-241)
  const [scrapVersion, setScrapVersion] = useState(0)
  // 독서 세션 저장 완료 시 값을 올려 세션 히스토리를 다시 로드시킨다
  const [sessionVersion, setSessionVersion] = useState(0)
  const [detail, setDetail] = useState(null) // 서버 상세(전체 메타 — 저장 시 full payload에 필요)
  const [saving, setSaving] = useState(false)
  const [actionError, setActionError] = useState(null)
  const { isUnifiedMobileUX: isMobile } = useResponsive()
  // 우측 문장 갤러리의 편집 내용을 "완료" 시 함께 저장하기 위한 핸들 (CLIAR-241)
  const galleryRef = useRef(null)

  // dpyb@gmail.com 계정의 기본 도서('방구석 미술관') 수정/삭제 보호 판별
  const userEmail = (member?.email || '').toLowerCase().trim()
  const bookTitle = (detail?.title || book?.title || '').trim()
  const isProtectedBook =
    (userEmail === 'dpyb@gmail.com' || userEmail === 'dpyb26@gmail.com') &&
    (bookTitle.includes('방구석 미술관') || bookTitle.replace(/\s+/g, '').includes('방구석미술관'))

  // 목록 요약엔 페이지/장르 등이 없어, 상세를 조회해 현재/총 페이지·상태를 초기화한다.
  useEffect(() => {
    let cancelled = false
      ; (async () => {
        try {
          const d = await getLibraryBook(book.bookId)
          if (cancelled) return
          setDetail(d)
          setCurrentPage(d.currentPage || 0)
          setTotalPage(d.totalPages || 0)
          if (d.genre) setGenre(d.genre)
          if (d.coverUrl) setCoverUrl(d.coverUrl)
          if (d.readingStatus) {
            // 서버 상태를 우선 반영(한글 매핑은 provider와 동일 규칙)
            const kr = {
              PLANNED: '시작전',
              READING: '읽는 중',
              COMPLETED: '완독',
            }[d.readingStatus]
            if (kr) setStatus(kr)
          }

          // 도서 시각 정보(spineColor, coverColor, colorIdx) 동기화
          const visual = getVisual(book.bookId, librarianId)
          if (visual) {
            const chosenIdx = visual.colorIdx != null && presets[visual.colorIdx]
              ? visual.colorIdx
              : presets.findIndex((p) => p.spine === visual.spineColor)
            if (chosenIdx >= 0) {
              setSelectedColorIdx(chosenIdx)
              setSpineColor(visual.spineColor || presets[chosenIdx].spine)
              setCoverColor(visual.coverColor || presets[chosenIdx].cover)
            }
          }
        } catch {
          // 상세 조회 실패 시 요약 기반 값 유지
        }
      })()
    return () => {
      cancelled = true
    }
  }, [book.bookId, librarianId, presets])

  // 색상 팔레트 클릭 핸들러
  const handleSelectColor = (idx) => {
    setSelectedColorIdx(idx)
    const chosen = presets[idx]
    if (chosen) {
      setSpineColor(chosen.spine)
      setCoverColor(chosen.cover)
    }
  }

  /**
   * "완료" 저장 — 진행 상태, 장르, 책 색상 및 우측 문장 편집을 저장한다.
   */
  const handleSave = async () => {
    if (saving || isProtectedBook) return
    setSaving(true)
    setActionError(null)
    try {
      const chosenPreset = presets[selectedColorIdx]
      const nextSpineColor = chosenPreset?.spine || spineColor
      const nextCoverColor = chosenPreset?.cover || coverColor

      await saveBookMeta(book.bookId, {
        title: detail?.title ?? book.title,
        author: detail?.author ?? book.author,
        isbn: detail?.isbn ?? null,
        genre: genre || GENRE_NONE,
        publisher: detail?.publisher ?? null,
        publishedDate: detail?.publishedDate ?? null,
        coverUrl: detail?.coverUrl ?? null,
        readingStatus: toReadingStatus(status),
        totalPages: detail?.totalPages ?? null,
        spineColor: nextSpineColor,
        coverColor: nextCoverColor,
        colorIdx: selectedColorIdx,
      })

      // 로컬 visual 정보 확실하게 저장
      setVisual(book.bookId, {
        colorIdx: selectedColorIdx,
        spineColor: nextSpineColor,
        coverColor: nextCoverColor,
      })

      // 우측 갤러리에서 고친 문장·메모도 함께 저장 (CLIAR-241)
      await galleryRef.current?.saveEdits()
      await reload?.()
      setEditing(false)
    } catch (err) {
      // 문장 검증 실패는 갤러리가 자체 메시지를 띄우므로(err.handled) 중복 안내를 피한다.
      if (!err?.handled) {
        setActionError('저장 중 문제가 발생했어요. 잠시 후 다시 시도해 주세요.')
      }
    } finally {
      setSaving(false)
    }
  }

  /**
   * 현재 읽은 페이지 저장 (입력란에서 엔터).
   * 수정 모드와 무관하게 바로 기록할 수 있고, 저장 결과를 팝업으로 알린다.
   */
  const handleSaveProgress = async () => {
    if (savingProgress) return
    const total = Number(totalPage) || 0
    const cur = Number(currentPage)

    if (!Number.isFinite(cur) || cur < 0) {
      setNotice({
        type: 'error',
        text: '현재 페이지는 0 이상의 숫자로 입력해 주세요.',
      })
      return
    }
    if (total > 0 && cur > total) {
      setNotice({ type: 'error', text: `총 ${total}쪽을 넘을 수 없어요.` })
      return
    }

    setSavingProgress(true)
    setActionError(null)
    try {
      await saveReadingProgress(book.bookId, cur, total || null)

      // 시작전 상태에서 1쪽 이상 저장한 경우 '읽는 중'으로 승격
      if (cur > 0 && status === '시작전') {
        setStatus('읽는 중')
        if (detail) {
          saveBookMeta(book.bookId, {
            title: detail.title ?? book.title,
            author: detail.author ?? book.author,
            isbn: detail.isbn ?? null,
            genre: detail.genre ?? genre ?? GENRE_NONE,
            publisher: detail.publisher ?? null,
            publishedDate: detail.publishedDate ?? null,
            coverUrl: detail.coverUrl ?? null,
            readingStatus: 'READING',
            totalPages: detail.totalPages ?? null,
          }).catch(() => { })
        }
      }

      setNotice({
        type: 'success',
        text: `현재 페이지가 ${cur}쪽으로 새로 저장되었습니다.`,
      })
    } catch {
      setNotice({
        type: 'error',
        text: '현재 페이지를 저장하지 못했어요. 잠시 후 다시 시도해 주세요.',
      })
    } finally {
      setSavingProgress(false)
    }
  }

  const handleDelete = async () => {
    if (isProtectedBook) {
      setConfirmDelete(false)
      return
    }
    try {
      await removeBook(book.bookId)
      onClose()
    } catch {
      setActionError('삭제 중 문제가 발생했어요. 잠시 후 다시 시도해 주세요.')
      setConfirmDelete(false)
    }
  }

  /*
   * 팝업 기본 스타일 (CLIAR-241).
   * 좌측 상세 + 우측 문장 갤러리 2단 구성을 담기 위해 폭을 크게 늘렸다.
   * 삭제 확인 등 단독 화면은 좁은 폭(narrowPanelStyle)을 그대로 쓴다.
   */
  const basePanelStyle = {
    position: 'fixed',
    top: isMobile ? 'calc(58px + env(safe-area-inset-top, 0px))' : '50%',
    left: '50%',
    transform: isMobile ? 'translateX(-50%)' : 'translate(-50%, -50%)',
    boxSizing: 'border-box',
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    borderRadius: 16,
    padding: isMobile ? '14px 14px 18px' : 20,
    boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
    color: 'var(--text-h)',
    zIndex: 95,
    fontSize: 18,
    lineHeight: 1.6,
  }

  const panelStyle = {
    ...basePanelStyle,
    width: isMobile ? '94vw' : 'min(1000px, 94%)',
    maxHeight: isMobile
      ? 'calc(100dvh - 72px - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px))'
      : 'calc(100dvh - 48px)',
    height: isMobile ? undefined : 'fit-content',
    display: 'flex',
    flexDirection: 'column',
    overflowY: isMobile ? 'auto' : 'hidden',
    overflowX: 'hidden',
  }

  const narrowPanelStyle = {
    ...basePanelStyle,
    top: '50%',
    transform: 'translate(-50%, -50%)',
    width: 320,
    maxWidth: '90vw',
    zIndex: 105,
  }

  const btnStyle = {
    padding: '6px 12px',
    borderRadius: 8,
    border: 'none',
    fontWeight: 700,
    cursor: 'pointer',
    fontSize: 16,
  }

  // 삭제 확인 팝업
  if (confirmDelete && !isProtectedBook) {
    return (
      <div style={narrowPanelStyle}>
        <p
          style={{
            margin: '0 0 16px',
            fontSize: 19,
            fontWeight: 600,
            textAlign: 'center',
          }}
        >
          {t('bookDetail.deleteConfirmTitle', '정말 삭제하시겠습니까?')}
        </p>
        <p
          style={{
            margin: '0 0 20px',
            fontSize: 16,
            color: 'var(--text)',
            textAlign: 'center',
          }}
        >
          {t('bookDetail.deleteConfirmDesc', '삭제된 도서는 복구할 수 없습니다.')}
        </p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          <button
            onClick={handleDelete}
            style={{ ...btnStyle, background: '#e74c3c', color: '#fff' }}
          >
            {t('common.delete', '삭제')}
          </button>
          <button
            onClick={() => setConfirmDelete(false)}
            style={{
              ...btnStyle,
              background: 'var(--border)',
              color: 'var(--text-h)',
            }}
          >
            {t('common.cancel', '취소')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* 모달 딤 배경 */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.55)',
          backdropFilter: 'blur(3px)',
          WebkitBackdropFilter: 'blur(3px)',
          zIndex: 90,
        }}
        aria-hidden="true"
      />

      <div style={panelStyle}>
        {/* 뒤로가기 / 선반으로 되돌아가기 — 최상단 왼쪽 (모바일 또는 onBackToShelf 전달 시) */}
        {(isMobile || onBackToShelf) && (
          <button
            type="button"
            onClick={() => {
              if (onBackToShelf) {
                onBackToShelf();
              } else {
                onClose();
              }
            }}
            aria-label="선반으로 되돌아가기"
            title="선반으로 되돌아가기"
            style={{
              position: 'absolute',
              top: 12,
              left: 12,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 32,
              height: 32,
              padding: 0,
              background: 'var(--code-bg)',
              border: '1px solid var(--border)',
              borderRadius: '50%',
              color: 'var(--text-h)',
              cursor: 'pointer',
              fontSize: 16,
              zIndex: 2,
              transition: 'all 0.15s ease',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        )}

        {/* 닫기 — 최상단 오른쪽 (사용자 요청, 2026-09) */}
        <button
          onClick={onClose}
          aria-label="닫기"
          title="닫기"
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            background: 'transparent',
            border: 'none',
            color: 'var(--text)',
            cursor: 'pointer',
            fontSize: 20,
            zIndex: 2,
          }}
        >
          ✕
        </button>

        {/*
         * 2단 레이아웃 (CLIAR-241): 왼쪽은 기존 책 상세, 오른쪽은 수집한 문장 갤러리.
         * 가운데 세로 구분선으로 영역을 나눈다.
         */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'minmax(250px, 300px) 1px minmax(0, 1fr)',
            gap: isMobile ? 16 : 20,
            alignItems: 'stretch',
            marginTop: isMobile ? 12 : 24,
            minHeight: 0,
            flex: isMobile ? 1 : 'none',
            minWidth: 0,
          }}
        >
          {/* ── 왼쪽: 3D 책 및 도서 메타 카드 ── */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              minWidth: 0,
              gap: 12,
              height: 'fit-content',
              overflowY: isMobile ? 'visible' : 'auto',
            }}
          >
            {/* 1. 상단: 3D 도서 뷰어 (스케치 3D 도서) */}
            <Book3DViewer
              title={detail?.title || book.title}
              author={detail?.author || book.author}
              coverUrl={coverUrl}
              spineColor={spineColor}
              coverColor={coverColor}
            />

            {/* 2. 하단: 메타 정보 카드 (스케치 하단 박스) */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                background: 'var(--code-bg)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                padding: isMobile ? '12px 14px' : '14px 16px',
                boxSizing: 'border-box',
                gap: 10,
              }}
            >
              {/* 도서 제목 + 저자 (중앙 정렬) */}
              <div style={{ textAlign: 'center' }}>
                <h3
                  style={{
                    margin: '0 0 4px',
                    fontSize: isMobile ? 18 : 20,
                    fontWeight: 700,
                    color: 'var(--text-h)',
                    wordBreak: 'keep-all',
                    lineHeight: 1.35,
                  }}
                >
                  {book.title}
                </h3>
                <p
                  style={{
                    margin: 0,
                    fontSize: isMobile ? 13 : 14.5,
                    color: 'var(--text)',
                    opacity: 0.9,
                    fontWeight: 500,
                  }}
                >
                  ✍️ {book.author || t('bookDetail.unknownAuthor', '저자 미입력')}
                </p>
              </div>

              {/* 메타 칩 한 줄: [장르] [Status] [현재/총쪽] */}
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px 8px',
                  fontSize: 14,
                }}
              >
                {/* 장르 선택 / 표시 */}
                {editing ? (
                  <select
                    value={genre}
                    onChange={(e) => setGenre(e.target.value)}
                    aria-label={t('register.fieldGenre', '장르')}
                    style={{
                      padding: '2px 8px',
                      borderRadius: 999,
                      border: '1px solid var(--accent)',
                      background: 'var(--accent-bg)',
                      color: 'var(--text-h)',
                      fontSize: 12.5,
                      fontWeight: 600,
                      cursor: 'pointer',
                      outline: 'none',
                    }}
                  >
                    {GENRE_DEFS.map((g) => (
                      <option key={g.code} value={g.code}>
                        #{g.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: 999,
                      border: '1px solid var(--accent-border)',
                      background: 'var(--accent-bg)',
                      color: 'var(--text-h)',
                      fontSize: 12.5,
                      fontWeight: 600,
                    }}
                  >
                    #{formatGenre(genre)}
                  </span>
                )}

                {/* 진행 상태 */}
                {editing ? (
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    aria-label={t('bookDetail.readingStatus', '진행 상태')}
                    style={{
                      padding: '2px 6px',
                      borderRadius: 8,
                      fontSize: 13,
                      border: '1px solid var(--border)',
                      background: 'var(--bg)',
                      color: 'var(--text-h)',
                    }}
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {formatStatus(s)}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: 999,
                      border: '1px solid var(--border)',
                      color: 'var(--text-h)',
                      fontSize: 12.5,
                    }}
                  >
                    {formatStatus(status)}
                  </span>
                )}

                {/* 페이지 📖 */}
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    color: 'var(--text)',
                    fontSize: 13,
                  }}
                >
                  📖
                  <input
                    type="number"
                    min={0}
                    max={Number(totalPage) || undefined}
                    value={currentPage}
                    onChange={(e) => setCurrentPage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleSaveProgress()
                      }
                    }}
                    disabled={savingProgress}
                    aria-label={t('bookDetail.currentPage', '현재 읽은 페이지')}
                    style={{
                      width: 44,
                      boxSizing: 'border-box',
                      padding: '2px 4px',
                      borderRadius: 6,
                      fontSize: 13,
                      textAlign: 'right',
                      border: '1px solid var(--border)',
                      background: 'var(--bg)',
                      color: 'var(--text-h)',
                    }}
                  />
                  <span>/ {Number(totalPage) > 0 ? totalPage : '-'} {t('bookDetail.pageUnit', '쪽')}</span>
                </span>
              </div>

              {/* 수정 모드 시: 책등 및 표지 색상 선택 팔레트 */}
              {editing && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 10px',
                    background: 'var(--bg)',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    marginTop: 2,
                  }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: 'var(--text-h)',
                    }}
                  >
                    🎨 {t('bookDetail.chooseColor', '책등 및 표지 색상')}
                  </span>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      flexWrap: 'wrap',
                    }}
                  >
                    {presets.map((p, i) => {
                      const isSelected = selectedColorIdx === i
                      return (
                        <button
                          type="button"
                          key={i}
                          onClick={() => handleSelectColor(i)}
                          title={`색상 ${i + 1}`}
                          aria-label={`색상 ${i + 1}`}
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: '50%',
                            border: isSelected ? '2px solid var(--accent)' : '1px solid rgba(0,0,0,0.18)',
                            boxShadow: isSelected
                              ? '0 0 0 2px var(--accent-border, rgba(255,154,60,0.4)), 0 2px 4px rgba(0,0,0,0.2)'
                              : '0 1px 3px rgba(0,0,0,0.15)',
                            transform: isSelected ? 'scale(1.15)' : 'scale(1)',
                            background: `linear-gradient(135deg, ${p.spine} 0 45%, ${p.cover} 45% 100%)`,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            padding: 0,
                          }}
                        />
                      )
                    })}
                  </div>
                </div>
              )}

              <span
                style={{
                  fontSize: 12,
                  color: 'var(--text-muted, #888)',
                  textAlign: 'center',
                  display: 'block',
                }}
              >
                {savingProgress
                  ? t('bookDetail.saving', '저장 중...')
                  : t('bookDetail.pressEnterToSave', '현재 페이지 입력 후 엔터 시 저장')}
              </span>

              {actionError && (
                <p
                  style={{
                    margin: 0,
                    fontSize: 13,
                    color: '#e05a4e',
                    textAlign: 'center',
                  }}
                >
                  {actionError}
                </p>
              )}

              {/* 하단 3개 액션 버튼: [독서 타이머] [문장수집] [수정] (스케치 그대로 반영) */}
              <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
                <button
                  onClick={() => setShowTimer(true)}
                  style={{
                    flex: 1,
                    padding: '8px 0',
                    borderRadius: 8,
                    border: '1px solid var(--accent)',
                    background: 'var(--accent)',
                    color: '#fff',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontSize: 13,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                    boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                  }}
                >
                  <span>⏱️</span> {t('bookDetail.readingTimer', '독서 타이머')}
                </button>
                <button
                  onClick={() => setShowSentenceModal(true)}
                  style={{
                    flex: 1,
                    padding: '8px 0',
                    borderRadius: 8,
                    border: '1px solid var(--accent-border)',
                    background: 'var(--accent-bg)',
                    color: 'var(--text-h)',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: 13,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                  }}
                >
                  <span>📸</span> {t('bookDetail.collectQuotes', '문장수집')}
                </button>

                {/* [수정] 버튼 — 수정 모드일 때는 [완료] / [취소] */}
                {editing ? (
                  <div style={{ display: 'flex', gap: 4, flex: 1.2 }}>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      style={{
                        flex: 1,
                        padding: '8px 0',
                        borderRadius: 8,
                        border: '1px solid var(--accent)',
                        background: 'var(--accent)',
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: 13,
                        cursor: saving ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {saving ? t('bookDetail.saving', '저장...') : t('common.done', '완료')}
                    </button>
                    <button
                      onClick={() => {
                        setEditing(false)
                        setActionError(null)
                        galleryRef.current?.discardEdits()
                        setGenre(detail?.genre || book.genre || GENRE_NONE)
                        setStatus(book.status || '시작전')
                        const origVisual = getVisual(book.bookId, librarianId)
                        if (origVisual) {
                          setSpineColor(origVisual.spineColor || book.spineColor)
                          setCoverColor(origVisual.coverColor || book.coverColor)
                          const fIdx = origVisual.colorIdx != null ? origVisual.colorIdx : presets.findIndex((p) => p.spine === origVisual.spineColor)
                          if (fIdx >= 0) setSelectedColorIdx(fIdx)
                        }
                      }}
                      disabled={saving}
                      style={{
                        padding: '8px 8px',
                        borderRadius: 8,
                        border: '1px solid var(--border)',
                        background: 'transparent',
                        color: 'var(--text)',
                        fontWeight: 600,
                        fontSize: 12.5,
                        cursor: saving ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {t('common.cancel', '취소')}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={isProtectedBook ? undefined : () => setEditing(true)}
                    disabled={isProtectedBook}
                    title={isProtectedBook ? t('bookDetail.defaultBookNoEdit', '기본 도서는 수정할 수 없습니다') : t('bookDetail.editTip', '도서 정보 및 기록 수정')}
                    style={{
                      flex: 1,
                      padding: '8px 0',
                      borderRadius: 8,
                      border: '1px solid var(--border)',
                      background: 'var(--bg)',
                      color: isProtectedBook ? 'var(--text-muted, #888)' : 'var(--text-h)',
                      fontWeight: 600,
                      cursor: isProtectedBook ? 'not-allowed' : 'pointer',
                      fontSize: 13,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4,
                      opacity: isProtectedBook ? 0.45 : 1,
                    }}
                  >
                    <span>✏️</span> {t('common.edit', '수정')}
                  </button>
                )}
              </div>

              {/* 수정 모드 중 삭제 옵션 */}
              {editing && !isGuest && !isProtectedBook && (
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: 2 }}>
                  <button
                    onClick={() => setConfirmDelete(true)}
                    style={{
                      padding: '3px 10px',
                      borderRadius: 6,
                      border: 'none',
                      background: 'transparent',
                      color: '#e74c3c',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      textDecoration: 'underline',
                    }}
                  >
                    🗑️ {t('bookDetail.deleteThisBook', '이 도서 삭제하기')}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ── 가운데 구분선 ── */}
          <div
            style={{
              background: 'var(--border)',
              width: isMobile ? '100%' : 1,
              height: isMobile ? 1 : 'auto',
              alignSelf: 'stretch',
              margin: isMobile ? '6px 0' : 0,
            }}
          />

          {/*
           * ── 오른쪽: 탭 전환 영역 (수집한 문장 갤러리 vs 독서 타이머 세션 기록) ──
           */}
          <div
            style={{
              flex: 1,
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
              overflow: isMobile ? 'visible' : 'hidden',
              height: isMobile ? undefined : '100%',
              minHeight: 0,
            }}
          >
            {/* 우측 상단 탭 헤더: [수집한 문장]  [독서 타이머 기록] */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                paddingBottom: 10,
                borderBottom: '1px solid var(--border)',
                marginBottom: 12,
                flexShrink: 0,
              }}
            >
              <button
                type="button"
                onClick={() => setRightTab('scraps')}
                style={{
                  padding: '6px 14px',
                  borderRadius: 8,
                  border: 'none',
                  background: rightTab === 'scraps' ? 'var(--accent)' : 'var(--code-bg)',
                  color: rightTab === 'scraps' ? '#fff' : 'var(--text)',
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  transition: 'all 0.15s ease',
                }}
              >
                <span>📸</span> {t('bookDetail.savedQuotesTab', '수집한 문장')}
              </button>
              <button
                type="button"
                onClick={() => setRightTab('sessions')}
                style={{
                  padding: '6px 14px',
                  borderRadius: 8,
                  border: 'none',
                  background: rightTab === 'sessions' ? 'var(--accent)' : 'var(--code-bg)',
                  color: rightTab === 'sessions' ? '#fff' : 'var(--text)',
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  transition: 'all 0.15s ease',
                }}
              >
                <span>⏱️</span> {t('bookDetail.timerHistoryTab', '독서 타이머 기록')}
              </button>
            </div>

            {/* 탭 콘텐츠 본문 (좌측 패널 높이에 맞추어 내부 스크롤 보장) */}
            <div style={{ flex: 1, minHeight: isMobile ? 320 : 0, overflow: 'hidden', display: 'flex' }}>
              {rightTab === 'scraps' ? (
                <ScrapGallery
                  key={`${book.bookId}-${scrapVersion}`}
                  ref={galleryRef}
                  bookId={book.bookId}
                  editing={editing}
                />
              ) : (
                <ReadingSessionHistory
                  bookId={book.bookId}
                  version={sessionVersion}
                  onOpenTimer={() => setShowTimer(true)}
                />
              )}
            </div>
          </div>
      </div>

      {showSentenceModal && (
        <SentenceCollectModal
          book={detail || book}
          onClose={() => {
            setShowSentenceModal(false)
            // 모달에서 문장을 추가/수정/삭제했을 수 있으니 갤러리를 새로 로드한다.
            setScrapVersion((v) => v + 1)
          }}
        />
      )}

      {/* 독서 집중 타이머 모달 */}
      {showTimer && (
        <ReadingTimerModal
          initialBook={book}
          onClose={() => setShowTimer(false)}
          onSavedSession={() => {
            setSessionVersion((v) => v + 1)
            setRightTab('sessions')
          }}
        />
      )}

      {/* 현재 페이지 저장 결과 안내 팝업 — "확인"으로 닫는다 (CLIAR-241) */}
      {notice &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.45)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1100,
            }}
            onClick={() => setNotice(null)}
          >
            <div
              role="alertdialog"
              aria-label="현재 페이지 저장 안내"
              onClick={(e) => e.stopPropagation()}
              style={{
                width: 'min(320px, 88vw)',
                background: 'var(--bg)',
                color: 'var(--text-h)',
                border: '1px solid var(--border)',
                borderRadius: 14,
                padding: 22,
                boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
                textAlign: 'center',
              }}
            >
              <p style={{ margin: '0 0 18px', fontSize: 18, lineHeight: 1.6 }}>
                {notice.type === 'success' ? '✅ ' : '⚠️ '}
                {notice.text}
              </p>
              <button
                autoFocus
                onClick={() => setNotice(null)}
                style={{
                  padding: '8px 28px',
                  borderRadius: 8,
                  border: 'none',
                  background:
                    notice.type === 'success' ? 'var(--accent)' : '#e74c3c',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 17,
                  cursor: 'pointer',
                }}
              >
                확인
              </button>
            </div>
          </div>,
          document.body,
        )}
      </div>
    </>
  )
}
