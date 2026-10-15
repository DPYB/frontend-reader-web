import { useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useBooks } from '../../store/booksStore';
import { SCRAP_PAGE_SIZE } from '../../api/bookApi';
import { useResponsive } from '../../hooks/useResponsive';
import { useLanguage } from '../../store/languageStore';
import './ScrapGallery.css';

/**
 * ScrapGallery — 스케치 디자인을 기반으로 한 수집 문장 슬라이드 뷰어.
 *
 * 레이아웃:
 *  - 좌우 네비게이션: [<] [>] 버튼
 *  - 상단: 문장 사진 (스캔 원본)
 *  - 중간: 저장된 날짜 + [수정] [삭제]
 *  - 하단 1: 인식 결과 (문장)
 *  - 하단 2: 사용자 메모
 *  - 바닥: page number (예: p.128) + [공유] 버튼
 */

const SENTENCE_MAX = 2000;
const MEMO_MAX = 2000;
const INITIAL_FEED = { items: [], nextPage: 0, totalPages: null, totalElements: null };

export default function ScrapGallery({ bookId, editing = false, ref }) {
  const { t } = useLanguage();
  const { fetchScrapsPage, hydrateScrapMemos, editScrap, removeScrap } = useBooks();
  const loadingRef = useRef(false);
  const aliveRef = useRef(true);

  // 페이징 상태
  const [feed, setFeed] = useState(INITIAL_FEED);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 현재 보고 있는 문장 인덱스 (0-indexed)
  const [currentIndex, setCurrentIndex] = useState(0);

  // 개별 문장 수정 상태 및 draft
  const [editingCardId, setEditingCardId] = useState(null);
  const [savingCardId, setSavingCardId] = useState(null);
  const [drafts, setDrafts] = useState({});
  const [deletingId, setDeletingId] = useState(null);
  const [editError, setEditError] = useState('');
  const [pendingDelete, setPendingDelete] = useState(null);
  const [zoomImage, setZoomImage] = useState(null);
  const [copyNotice, setCopyNotice] = useState(false);

  const { isUnifiedMobileUX: isMobile } = useResponsive();
  const { items, nextPage, totalPages, totalElements } = feed;
  const hasMore = totalPages === null || nextPage < totalPages;

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  /** 페이지 불러오기 */
  const loadPage = useCallback(
    async (pageToLoad, { reset = false } = {}) => {
      if (loadingRef.current) return;
      loadingRef.current = true;
      setLoading(true);
      setError('');
      try {
        const res = await fetchScrapsPage(bookId, { page: pageToLoad, size: SCRAP_PAGE_SIZE });
        if (!aliveRef.current) return;

        setFeed((prev) => ({
          items: reset ? res.items : [...prev.items, ...res.items],
          nextPage: pageToLoad + 1,
          totalPages: res.totalPages,
          totalElements: res.totalElements,
        }));

        if (res.items.length > 0) {
          hydrateScrapMemos(res.items)
            .then((memoMap) => {
              if (!aliveRef.current) return;
              setFeed((prev) => ({
                ...prev,
                items: prev.items.map((it) =>
                  memoMap[it.id] !== undefined ? { ...it, memo: memoMap[it.id] } : it
                ),
              }));
            })
            .catch(() => {});
        }
      } catch {
        if (aliveRef.current) {
          setError(t('scrapGallery.loadError', '문장을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.'));
        }
      } finally {
        loadingRef.current = false;
        if (aliveRef.current) setLoading(false);
      }
    },
    [bookId, fetchScrapsPage, hydrateScrapMemos, t]
  );

  useEffect(() => {
    loadPage(0, { reset: true });
    setCurrentIndex(0);
  }, [loadPage]);

  // currentIndex 보정
  useEffect(() => {
    if (items.length > 0 && currentIndex >= items.length) {
      setCurrentIndex(Math.max(0, items.length - 1));
    }
  }, [items.length, currentIndex]);

  const currentItem = items[currentIndex] || null;

  /** 이전 문장으로 이동 */
  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setEditError('');
    }
  }, [currentIndex]);

  /** 다음 문장으로 이동 */
  const handleNext = useCallback(() => {
    if (currentIndex < items.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setEditError('');
    } else if (hasMore && !loading) {
      loadPage(nextPage).then(() => {
        setCurrentIndex((prev) => prev + 1);
      });
    }
  }, [currentIndex, items.length, hasMore, loading, loadPage, nextPage]);

  // 키보드 좌우 화살표로 문장 넘기기 지원
  useEffect(() => {
    const handleKeyDown = (e) => {
      // 텍스트 편집 중에는 단축키 비활성화
      const tag = e.target.tagName?.toLowerCase();
      if (tag === 'textarea' || tag === 'input') return;

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePrev, handleNext]);

  /** 현재 카드에 표시할 값 */
  const valueOf = useCallback(
    (it, field) => {
      if (!it) return '';
      const draft = drafts[it.id];
      if (draft && draft[field] !== undefined) return draft[field];
      if (field === 'memo') return it.memo ?? '';
      if (field === 'page') return it.page != null ? String(it.page) : '';
      return it.text ?? '';
    },
    [drafts]
  );

  const patchDraft = useCallback((id, field, value) => {
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
    setEditError('');
  }, []);

  /** 개별 문장 수정 시작 */
  const handleStartEdit = useCallback((it) => {
    setEditingCardId(it.id);
    setDrafts((prev) => ({
      ...prev,
      [it.id]: {
        text: it.text ?? '',
        memo: it.memo ?? '',
        page: it.page != null ? String(it.page) : '',
      },
    }));
    setEditError('');
  }, []);

  /** 개별 문장 수정 취소 */
  const handleCancelEdit = useCallback((id) => {
    setEditingCardId(null);
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setEditError('');
  }, []);

  /** 개별 문장 수정 저장 */
  const handleSaveEdit = useCallback(
    async (it) => {
      const draft = drafts[it.id];
      const textToSave = String(draft?.text !== undefined ? draft.text : it.text).trim();
      const memoToSave = String(draft?.memo !== undefined ? draft.memo : it.memo || '').trim();
      const pageToSave = draft?.page !== undefined && draft.page !== '' ? Number(draft.page) : it.page;

      if (!textToSave) {
        setEditError(t('scrapGallery.sentenceRequired', '문장은 비워 둘 수 없어요.'));
        return;
      }

      setSavingCardId(it.id);
      setEditError('');
      try {
        await editScrap(it.id, {
          text: textToSave.slice(0, SENTENCE_MAX),
          memo: memoToSave.slice(0, MEMO_MAX),
          page: pageToSave,
          scrapImageUrl: it.scrapImageUrl,
        });

        if (!aliveRef.current) return;
        setFeed((prev) => ({
          ...prev,
          items: prev.items.map((item) =>
            item.id === it.id
              ? { ...item, text: textToSave, memo: memoToSave, page: pageToSave }
              : item
          ),
        }));
        setEditingCardId(null);
        setDrafts((prev) => {
          const next = { ...prev };
          delete next[it.id];
          return next;
        });
      } catch {
        if (aliveRef.current) {
          setEditError(t('scrapGallery.editError', '문장을 수정하지 못했어요. 잠시 후 다시 시도해 주세요.'));
        }
      } finally {
        if (aliveRef.current) setSavingCardId(null);
      }
    },
    [drafts, editScrap, t]
  );

  /** 삭제 확인 요청 */
  const requestDelete = useCallback((it) => {
    setEditError('');
    setPendingDelete(it);
  }, []);

  const cancelDelete = useCallback(() => setPendingDelete(null), []);

  /** 문장 삭제 실행 */
  const confirmDelete = useCallback(async () => {
    if (!pendingDelete || deletingId) return;
    const id = pendingDelete.id;
    setDeletingId(id);
    setEditError('');
    try {
      await removeScrap(id);
      if (!aliveRef.current) return;
      setFeed((prev) => ({
        ...prev,
        items: prev.items.filter((it) => it.id !== id),
        totalElements: prev.totalElements != null ? Math.max(0, prev.totalElements - 1) : null,
      }));
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      if (editingCardId === id) setEditingCardId(null);
      setPendingDelete(null);
    } catch {
      if (aliveRef.current) {
        setEditError(t('scrapGallery.deleteError', '문장을 삭제하지 못했어요. 잠시 후 다시 시도해 주세요.'));
      }
    } finally {
      if (aliveRef.current) setDeletingId(null);
    }
  }, [pendingDelete, deletingId, removeScrap, editingCardId, t]);

  /** 문장 공유 (클립보드 복사) */
  const handleShare = useCallback(
    async (it) => {
      if (!it) return;
      const textToCopy = `“${it.text}”${it.page ? ` (p.${it.page})` : ''}\n— DPYB 내 서재에서 수집한 문장`;
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(textToCopy);
        } else {
          const textarea = document.createElement('textarea');
          textarea.value = textToCopy;
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand('copy');
          document.body.removeChild(textarea);
        }
        setCopyNotice(true);
        setTimeout(() => setCopyNotice(false), 2400);
      } catch {
        // 복사 실패 무시
      }
    },
    []
  );

  /** 부모 BookDetail의 "완료" 저장 연동 */
  const saveEdits = useCallback(async () => {
    const dirty = items.filter((it) => {
      const d = drafts[it.id];
      if (!d) return false;
      const textChanged = d.text !== undefined && d.text !== (it.text ?? '');
      const memoChanged = d.memo !== undefined && d.memo !== (it.memo ?? '');
      const pageChanged = d.page !== undefined && String(d.page) !== String(it.page ?? '');
      return textChanged || memoChanged || pageChanged;
    });
    if (dirty.length === 0) return;

    const invalid = dirty.find((it) => !String(valueOf(it, 'text')).trim());
    if (invalid) {
      const msg = t('scrapGallery.sentenceRequired', '문장은 비워 둘 수 없어요.');
      setEditError(msg);
      const err = new Error(msg);
      err.handled = true;
      throw err;
    }

    const payloads = dirty.map((it) => ({
      id: it.id,
      text: String(valueOf(it, 'text')).trim().slice(0, SENTENCE_MAX),
      memo: String(valueOf(it, 'memo')).slice(0, MEMO_MAX),
      page: valueOf(it, 'page') !== '' ? Number(valueOf(it, 'page')) : it.page,
      scrapImageUrl: it.scrapImageUrl,
    }));

    await Promise.all(
      payloads.map((p) =>
        editScrap(p.id, { text: p.text, memo: p.memo, page: p.page, scrapImageUrl: p.scrapImageUrl })
      )
    );

    if (!aliveRef.current) return;
    const byId = new Map(payloads.map((p) => [p.id, p]));
    setFeed((prev) => ({
      ...prev,
      items: prev.items.map((it) =>
        byId.has(it.id)
          ? { ...it, text: byId.get(it.id).text, memo: byId.get(it.id).memo, page: byId.get(it.id).page }
          : it
      ),
    }));
    setDrafts({});
    setEditingCardId(null);
  }, [items, drafts, valueOf, editScrap, t]);

  /** 부모 BookDetail의 "취소" 연동 */
  const discardEdits = useCallback(() => {
    setDrafts({});
    setEditError('');
    setEditingCardId(null);
    setPendingDelete(null);
  }, []);

  useImperativeHandle(ref, () => ({ saveEdits, discardEdits }), [saveEdits, discardEdits]);

  // 날짜 포맷팅 (YYYY.MM.DD)
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (Number.isNaN(d.getTime())) return dateStr;
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}.${m}.${day}`;
    } catch {
      return dateStr;
    }
  };

  const isCurrentEditing = editingCardId === currentItem?.id || (editing && editingCardId === null);
  const isCurrentSaving = savingCardId === currentItem?.id;

  const arrowBtnStyle = (disabled) => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: isMobile ? 32 : 38,
    height: isMobile ? 32 : 38,
    borderRadius: '50%',
    border: '1px solid var(--border)',
    background: disabled ? 'transparent' : 'var(--code-bg)',
    color: disabled ? 'var(--text-muted, #777)' : 'var(--text-h)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.35 : 1,
    transition: 'all 0.15s ease',
    flexShrink: 0,
    fontSize: isMobile ? 16 : 19,
    fontWeight: 700,
    boxShadow: disabled ? 'none' : '0 2px 8px rgba(0,0,0,0.15)',
  });

  const sectionBoxStyle = {
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    padding: '10px 14px',
    boxSizing: 'border-box',
    width: '100%',
  };

  const textareaStyle = {
    width: '100%',
    boxSizing: 'border-box',
    padding: '8px 10px',
    borderRadius: 8,
    border: '1px solid var(--accent)',
    background: 'var(--code-bg)',
    color: 'var(--text-h)',
    fontSize: 15,
    fontFamily: 'inherit',
    lineHeight: 1.5,
    resize: 'vertical',
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        minWidth: 0,
        position: 'relative',
      }}
    >
      {/* 에러 및 안내 메시지 */}
      {editError && (
        <p style={{ margin: '0 0 8px', fontSize: 14, color: '#e05a4e', fontWeight: 600, textAlign: 'center' }}>
          {editError}
        </p>
      )}
      {error && (
        <p style={{ margin: '0 0 8px', fontSize: 14, color: '#e05a4e', textAlign: 'center' }}>
          {error}
        </p>
      )}

      {/* 로딩 표시 */}
      {loading && items.length === 0 && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text)' }}>
          {t('common.loading', '불러오는 중...')}
        </div>
      )}

      {/* 문장 0개 빈 화면 */}
      {!loading && items.length === 0 && !error && (
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            padding: 30,
            border: '1px dashed var(--border)',
            borderRadius: 14,
            background: 'var(--code-bg)',
          }}
        >
          <span style={{ fontSize: 36, marginBottom: 12 }}>📖</span>
          <p style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 700, color: 'var(--text-h)' }}>
            {t('scrapGallery.emptyTitle', '아직 수집한 문장이 없어요')}
          </p>
          <p style={{ margin: 0, fontSize: 14.5, color: 'var(--text)' }}>
            {t('scrapGallery.emptyDesc', '좌측 하단의 [문장 수집] 버튼을 눌러 첫 문장을 등록해 보세요.')}
          </p>
        </div>
      )}

      {/* 문장 슬라이드 뷰어 (스케치 디자인 충실 구현) */}
      {items.length > 0 && currentItem && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: isMobile ? 8 : 12,
            flex: 1,
            minHeight: 0,
          }}
        >
          {/* ── 좌측 이동 [<] 버튼 ── */}
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentIndex === 0}
            aria-label={t('scrapGallery.prev', '이전 문장')}
            title={t('scrapGallery.prev', '이전 문장')}
            style={arrowBtnStyle(currentIndex === 0)}
          >
            ‹
          </button>

          {/* ── 중앙 카드 영역 ── */}
          <div
            style={{
              flex: 1,
              minWidth: 0,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              background: 'var(--code-bg)',
              border: '1.5px solid var(--border)',
              borderRadius: 14,
              padding: isMobile ? '12px 14px' : '14px 18px',
              boxSizing: 'border-box',
              overflowY: 'auto',
              gap: 10,
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
            }}
          >
            {/* 1. 상단: 문장 사진 (스캔 원본) */}
            <div
              style={{
                width: '100%',
                height: isMobile ? 140 : 180,
                borderRadius: 10,
                border: '1px solid var(--border)',
                background: 'var(--bg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                position: 'relative',
                flexShrink: 0,
              }}
            >
              {currentItem.scrapImageUrl ? (
                <>
                  <img
                    src={currentItem.scrapImageUrl}
                    alt={t('scrapGallery.scannedPhoto', '문장 사진')}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      display: 'block',
                      cursor: 'zoom-in',
                    }}
                    onClick={() => setZoomImage(currentItem.scrapImageUrl)}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      top: 6,
                      right: 8,
                      padding: '2px 8px',
                      borderRadius: 6,
                      background: 'rgba(0,0,0,0.6)',
                      color: '#fff',
                      fontSize: 11,
                      pointerEvents: 'none',
                    }}
                  >
                    🔍 {t('scrapGallery.clickToZoom', '클릭 시 확대')}
                  </div>
                </>
              ) : (
                <div style={{ color: 'var(--text-muted, #888)', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>📷</span> {t('scrapGallery.noPhoto', '등록된 문장 사진 없음')}
                </div>
              )}
            </div>

            {/* 2. 중간: 저장된 날짜 + [수정] [삭제] */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
                flexShrink: 0,
              }}
            >
              {/* 저장된 날짜 뱃지 */}
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 10px',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: 'var(--bg)',
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--text)',
                }}
              >
                <span>📅</span> {formatDate(currentItem.createdAt) || t('scrapGallery.today', '오늘')}
              </div>

              {/* 페이지 순번 인디케이터 (예: 1 / 5) */}
              <span style={{ fontSize: 13, color: 'var(--text-muted, #888)', fontWeight: 600 }}>
                {currentIndex + 1} / {totalElements || items.length}
              </span>

              {/* [수정] [삭제] 버튼 그룹 */}
              <div style={{ display: 'flex', gap: 6 }}>
                {isCurrentEditing ? (
                  <>
                    <button
                      type="button"
                      onClick={() => handleSaveEdit(currentItem)}
                      disabled={isCurrentSaving}
                      style={{
                        padding: '4px 12px',
                        borderRadius: 6,
                        border: 'none',
                        background: 'var(--accent)',
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: 13.5,
                        cursor: isCurrentSaving ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {isCurrentSaving ? t('common.saving', '저장 중...') : t('common.save', '저장')}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCancelEdit(currentItem.id)}
                      disabled={isCurrentSaving}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 6,
                        border: '1px solid var(--border)',
                        background: 'transparent',
                        color: 'var(--text)',
                        fontWeight: 600,
                        fontSize: 13.5,
                        cursor: 'pointer',
                      }}
                    >
                      {t('common.cancel', '취소')}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => handleStartEdit(currentItem)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 3,
                        padding: '4px 10px',
                        borderRadius: 6,
                        border: '1px solid var(--accent)',
                        background: 'transparent',
                        color: 'var(--accent)',
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      <span>✏️</span> {t('common.edit', '수정')}
                    </button>
                    <button
                      type="button"
                      onClick={() => requestDelete(currentItem)}
                      disabled={deletingId === currentItem.id}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 3,
                        padding: '4px 10px',
                        borderRadius: 6,
                        border: '1px solid #e74c3c',
                        background: 'transparent',
                        color: '#e74c3c',
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: deletingId === currentItem.id ? 'wait' : 'pointer',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      <span>🗑️</span> {t('common.delete', '삭제')}
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* 3. 하단 1: 인식 결과 */}
            <div style={sectionBoxStyle}>
              <div
                style={{
                  fontSize: 12.5,
                  fontWeight: 700,
                  color: 'var(--text-muted, #888)',
                  marginBottom: 4,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <span>🔍</span> {t('scrapGallery.recognitionResult', '인식 결과')}
              </div>
              {isCurrentEditing ? (
                <textarea
                  value={valueOf(currentItem, 'text')}
                  onChange={(e) => patchDraft(currentItem.id, 'text', e.target.value)}
                  rows={3}
                  maxLength={SENTENCE_MAX}
                  placeholder={t('scrapGallery.sentencePlaceholder', '인식된 문장을 입력하세요')}
                  style={textareaStyle}
                />
              ) : (
                <p
                  style={{
                    margin: 0,
                    fontSize: 15.5,
                    lineHeight: 1.6,
                    color: 'var(--text-h)',
                    wordBreak: 'break-word',
                    fontWeight: 500,
                  }}
                >
                  “{currentItem.text}”
                </p>
              )}
            </div>

            {/* 4. 하단 2: 사용자 메모 */}
            <div style={sectionBoxStyle}>
              <div
                style={{
                  fontSize: 12.5,
                  fontWeight: 700,
                  color: 'var(--text-muted, #888)',
                  marginBottom: 4,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <span>💭</span> {t('scrapGallery.userMemo', '사용자 메모')}
              </div>
              {isCurrentEditing ? (
                <textarea
                  value={valueOf(currentItem, 'memo')}
                  onChange={(e) => patchDraft(currentItem.id, 'memo', e.target.value)}
                  rows={2}
                  maxLength={MEMO_MAX}
                  placeholder={t('scrapGallery.memoPlaceholder', '나만의 생각이나 메모를 남겨보세요')}
                  style={textareaStyle}
                />
              ) : (
                <p
                  style={{
                    margin: 0,
                    fontSize: 14.5,
                    lineHeight: 1.5,
                    color: currentItem.memo ? 'var(--text)' : 'var(--text-muted, #888)',
                    wordBreak: 'break-word',
                  }}
                >
                  {currentItem.memo || t('scrapGallery.noMemo', '남겨진 메모가 없습니다.')}
                </p>
              )}
            </div>

            {/* 5. 바닥: page number (좌측) + [공유] (우측) */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: 'auto',
                paddingTop: 4,
                flexShrink: 0,
              }}
            >
              {/* Page Number 칩 */}
              {isCurrentEditing ? (
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text)' }}>
                  <span>{t('scrapGallery.page', '페이지')}:</span>
                  <input
                    type="number"
                    min={0}
                    value={valueOf(currentItem, 'page')}
                    onChange={(e) => patchDraft(currentItem.id, 'page', e.target.value)}
                    placeholder="예: 128"
                    style={{
                      width: 80,
                      padding: '4px 8px',
                      borderRadius: 6,
                      border: '1px solid var(--border)',
                      background: 'var(--bg)',
                      color: 'var(--text-h)',
                      fontSize: 13,
                    }}
                  />
                </label>
              ) : (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '4px 10px',
                    borderRadius: 999,
                    background: 'rgba(255, 154, 60, 0.12)',
                    border: '1px solid rgba(255, 154, 60, 0.3)',
                    color: 'var(--accent)',
                    fontSize: 13.5,
                    fontWeight: 700,
                  }}
                >
                  📖 {currentItem.page != null ? `p. ${currentItem.page}` : t('scrapGallery.pageUnknown', 'p. 미입력')}
                </span>
              )}

              {/* [공유] 버튼 */}
              <button
                type="button"
                onClick={() => handleShare(currentItem)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '5px 14px',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: 'var(--bg)',
                  color: 'var(--text-h)',
                  fontSize: 13.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                }}
              >
                <span>🔗</span> {t('scrapGallery.share', '공유')}
              </button>
            </div>
          </div>

          {/* ── 우측 이동 [>] 버튼 ── */}
          <button
            type="button"
            onClick={handleNext}
            disabled={currentIndex >= items.length - 1 && !hasMore}
            aria-label={t('scrapGallery.next', '다음 문장')}
            title={t('scrapGallery.next', '다음 문장')}
            style={arrowBtnStyle(currentIndex >= items.length - 1 && !hasMore)}
          >
            ›
          </button>
        </div>
      )}

      {/* 공유 복사 완료 토스트 알림 */}
      {copyNotice && (
        <div
          style={{
            position: 'absolute',
            bottom: 16,
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '8px 18px',
            borderRadius: 999,
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(4px)',
            color: '#fff',
            fontSize: 13.5,
            fontWeight: 600,
            zIndex: 100,
            boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          📋 {t('scrapGallery.copiedNotice', '문장이 클립보드에 복사되었습니다!')}
        </div>
      )}

      {/* 문장 사진 확대 모달 (Lightbox) */}
      {zoomImage &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.85)',
              backdropFilter: 'blur(5px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1200,
              padding: 20,
              boxSizing: 'border-box',
            }}
            onClick={() => setZoomImage(null)}
          >
            <div
              style={{
                position: 'relative',
                maxWidth: '90vw',
                maxHeight: '90vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={zoomImage}
                alt="확대 사진"
                style={{
                  maxWidth: '100%',
                  maxHeight: '85vh',
                  objectFit: 'contain',
                  borderRadius: 10,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                }}
              />
              <button
                type="button"
                onClick={() => setZoomImage(null)}
                style={{
                  position: 'absolute',
                  top: -12,
                  right: -12,
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  border: 'none',
                  background: '#e74c3c',
                  color: '#fff',
                  fontSize: 18,
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                }}
              >
                ✕
              </button>
            </div>
          </div>,
          document.body
        )}

      {/* 문장 삭제 확인 팝업 */}
      {pendingDelete &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.5)',
              backdropFilter: 'blur(2px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1100,
            }}
            onClick={cancelDelete}
          >
            <div
              role="alertdialog"
              aria-label={t('scrapGallery.deleteModalTitle', '문장 삭제 확인')}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: 'min(300px, 88vw)',
                background: 'var(--bg)',
                color: 'var(--text-h)',
                border: '1px solid var(--border)',
                borderRadius: 14,
                padding: 22,
                boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
                textAlign: 'center',
              }}
            >
              <p style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 700 }}>
                {t('scrapGallery.deletePrompt', '이 문장을 삭제하시겠어요?')}
              </p>
              <p style={{ margin: '0 0 18px', fontSize: 15, color: 'var(--text)', lineHeight: 1.5 }}>
                {t('scrapGallery.deleteWarning', '사진과 메모가 함께 지워지며 복구할 수 없습니다.')}
              </p>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                <button
                  type="button"
                  onClick={confirmDelete}
                  disabled={deletingId === pendingDelete.id}
                  style={{
                    padding: '8px 20px',
                    borderRadius: 8,
                    border: 'none',
                    background: '#e74c3c',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: 15,
                    cursor: deletingId === pendingDelete.id ? 'not-allowed' : 'pointer',
                    opacity: deletingId === pendingDelete.id ? 0.7 : 1,
                  }}
                >
                  {deletingId === pendingDelete.id ? t('common.deleting', '삭제 중...') : t('common.delete', '삭제')}
                </button>
                <button
                  type="button"
                  onClick={cancelDelete}
                  disabled={deletingId === pendingDelete.id}
                  style={{
                    padding: '8px 20px',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    background: 'transparent',
                    color: 'var(--text-h)',
                    fontWeight: 600,
                    fontSize: 15,
                    cursor: 'pointer',
                  }}
                >
                  {t('common.cancel', '취소')}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
