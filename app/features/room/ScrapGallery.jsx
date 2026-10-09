import { useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useBooks } from '../../store/booksStore';
import { SCRAP_PAGE_SIZE } from '../../api/bookApi';
import { useResponsive } from '../../hooks/useResponsive';
import './ScrapGallery.css';

/**
 * ScrapGallery — 수집한 문장을 보여주는 세로 스크롤 갤러리.
 *
 * 카드 한 장 = 문장 사진 + 문장/메모 텍스트 + 페이지 번호.
 * 문장 카드를 탭/클릭하면 해당 카드가 선택되어 [수정], [삭제] 버튼이 나타납니다.
 *
 * @param {number|string} bookId - 대상 도서 ID
 * @param {boolean} [editing] - 전체 수정 모드 여부
 * @param {object} [ref] - { saveEdits(): Promise<void>, discardEdits(): void } 를 노출
 */

// 다음 페이지를 미리 당겨올 하단 여백(px).
const PREFETCH_MARGIN = 200;

// backend-book Scrap 도메인 제약 (sentence 1~2000, memo 0~2000)
const SENTENCE_MAX = 2000;
const MEMO_MAX = 2000;

const INITIAL_FEED = { items: [], nextPage: 0, totalPages: null, totalElements: null };

export default function ScrapGallery({ bookId, editing = false, ref }) {
  const { fetchScrapsPage, hydrateScrapMemos, editScrap, removeScrap } = useBooks();
  const scrollRef = useRef(null);
  // 동시/중복 요청 방지 (스크롤 이벤트는 연속으로 들어온다)
  const loadingRef = useRef(false);
  // 언마운트 후 늦게 도착한 응답으로 상태를 건드리지 않도록 하는 플래그
  const aliveRef = useRef(true);

  // 페이징 상태
  const [feed, setFeed] = useState(INITIAL_FEED);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 개별 카드 선택 및 인라인 수정 상태
  const [selectedScrapId, setSelectedScrapId] = useState(null);
  const [editingScrapId, setEditingScrapId] = useState(null);
  const [savingScrapId, setSavingScrapId] = useState(null);
  const { isUnifiedMobileUX: isMobile } = useResponsive();

  // 수정 중인 값 { [scrapId]: { text, memo, page } }
  const [drafts, setDrafts] = useState({});
  const [deletingId, setDeletingId] = useState(null);
  const [editError, setEditError] = useState('');
  // 삭제 확인 팝업 대상 카드
  const [pendingDelete, setPendingDelete] = useState(null);

  const { items, nextPage, totalPages, totalElements } = feed;
  const hasMore = totalPages === null || nextPage < totalPages;

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  /**
   * 페이지를 불러와 뒤에 이어 붙인다. reset=true면 목록을 새로 채운다.
   */
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

        // 이 페이지의 memo만 뒤이어 채운다 (목록 응답엔 memo가 없음)
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
            .catch(() => {
              // memo 조회 실패는 무시
            });
        }
      } catch {
        if (aliveRef.current) {
          setError('문장을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.');
        }
      } finally {
        loadingRef.current = false;
        if (aliveRef.current) setLoading(false);
      }
    },
    [bookId, fetchScrapsPage, hydrateScrapMemos]
  );

  useEffect(() => {
    loadPage(0, { reset: true });
  }, [loadPage]);

  /**
   * 스크롤 끝에 가까워지면 다음 페이지를 당겨온다. (모바일: 세로, 데스크톱: 가로)
   */
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || loadingRef.current || !hasMore) return;
    if (isMobile) {
      const remaining = el.scrollHeight - el.scrollTop - el.clientHeight;
      if (remaining < PREFETCH_MARGIN) {
        loadPage(nextPage);
      }
    } else {
      const remaining = el.scrollWidth - el.scrollLeft - el.clientWidth;
      if (remaining < PREFETCH_MARGIN) {
        loadPage(nextPage);
      }
    }
  }, [hasMore, isMobile, loadPage, nextPage]);

  const handleWheel = useCallback(
    (e) => {
      if (!isMobile && scrollRef.current) {
        if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && e.deltaY !== 0) {
          scrollRef.current.scrollLeft += e.deltaY;
        }
      }
    },
    [isMobile]
  );

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || loading || !hasMore || items.length === 0) return;
    if (isMobile) {
      if (el.scrollHeight <= el.clientHeight + 40) {
        loadPage(nextPage);
      }
    } else {
      if (el.scrollWidth <= el.clientWidth + 40) {
        loadPage(nextPage);
      }
    }
  }, [items.length, loading, hasMore, nextPage, loadPage, isMobile]);

  /** 현재 카드에 표시할 값 (수정 중이면 draft 우선) */
  const valueOf = useCallback(
    (it, field) => {
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

  /** 개별 문장 수정 모드 시작 */
  const handleStartEditCard = useCallback(
    (it) => {
      setEditingScrapId(it.id);
      setSelectedScrapId(it.id);
      setDrafts((prev) => ({
        ...prev,
        [it.id]: {
          text: it.text ?? '',
          memo: it.memo ?? '',
          page: it.page != null ? String(it.page) : '',
        },
      }));
      setEditError('');
    },
    []
  );

  /** 개별 문장 수정 취소 */
  const handleCancelSingleEdit = useCallback((id) => {
    setEditingScrapId(null);
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setEditError('');
  }, []);

  /** 개별 문장 수정 저장 */
  const handleSaveSingleEdit = useCallback(
    async (it) => {
      const draft = drafts[it.id];
      const textToSave = String(draft?.text !== undefined ? draft.text : it.text).trim();
      const memoToSave = String(draft?.memo !== undefined ? draft.memo : it.memo || '').trim();
      const pageToSave = draft?.page !== undefined && draft.page !== '' ? Number(draft.page) : it.page;

      if (!textToSave) {
        setEditError('문장은 비워 둘 수 없어요.');
        return;
      }

      setSavingScrapId(it.id);
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
        setEditingScrapId(null);
        setDrafts((prev) => {
          const next = { ...prev };
          delete next[it.id];
          return next;
        });
      } catch {
        if (aliveRef.current) setEditError('문장을 수정하지 못했어요. 잠시 후 다시 시도해 주세요.');
      } finally {
        if (aliveRef.current) setSavingScrapId(null);
      }
    },
    [drafts, editScrap]
  );

  /** 사진 또는 액션바의 삭제 클릭 — 확인 팝업을 띄운다 */
  const requestDelete = useCallback((it) => {
    setEditError('');
    setPendingDelete(it);
  }, []);

  const cancelDelete = useCallback(() => setPendingDelete(null), []);

  /** 카드(수집한 문장) 삭제 확인 시 실행 */
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
      if (selectedScrapId === id) setSelectedScrapId(null);
      if (editingScrapId === id) setEditingScrapId(null);
      setPendingDelete(null);
    } catch {
      if (aliveRef.current) setEditError('문장을 삭제하지 못했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      if (aliveRef.current) setDeletingId(null);
    }
  }, [pendingDelete, deletingId, removeScrap, selectedScrapId, editingScrapId]);

  /** 부모(BookDetail)의 상단 완료 버튼 호출용 */
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
      setEditError('문장은 비워 둘 수 없어요.');
      const err = new Error('문장은 비워 둘 수 없어요.');
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
    setEditingScrapId(null);
  }, [items, drafts, valueOf, editScrap]);

  /** 저장하지 않은 편집값을 버린다 (부모의 "취소" 버튼에서 호출) */
  const discardEdits = useCallback(() => {
    setDrafts({});
    setEditError('');
    setEditingScrapId(null);
    setPendingDelete(null);
  }, []);

  useImperativeHandle(ref, () => ({ saveEdits, discardEdits }), [saveEdits, discardEdits]);

  const editFieldStyle = {
    width: '100%',
    boxSizing: 'border-box',
    padding: '7px 10px',
    borderRadius: 6,
    border: '1px solid var(--border)',
    background: 'var(--bg)',
    color: 'var(--text-h)',
    fontSize: 15,
    fontFamily: 'inherit',
    lineHeight: 1.5,
    resize: 'vertical',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0, height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, paddingBottom: 2 }}>
        <span style={{ fontSize: 16.5, fontWeight: 700, color: 'var(--text-h)' }}>
          수집한 문장 {totalElements != null ? `(${totalElements})` : ''}
        </span>
        <span style={{ fontSize: 13.5, color: 'var(--text)' }}>
          {editing
            ? '문장·메모를 수정한 후 “완료”를 누르세요'
            : items.length > 0
              ? '문장을 선택하여 수정 및 삭제할 수 있어요'
              : ''}
        </span>
      </div>

      {editError && <p style={{ margin: 0, fontSize: 14.5, color: '#e05a4e', fontWeight: 600 }}>{editError}</p>}
      {error && <p style={{ margin: 0, fontSize: 14.5, color: '#e05a4e' }}>{error}</p>}

      {/* 문장 갤러리 피드 (데스크톱: 좌우 가로 스크롤, 모바일: 상하 세로 스크롤) */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        onWheel={handleWheel}
        className="scrap-gallery-strip"
        style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? 12 : 14,
          overflowY: isMobile ? 'auto' : 'hidden',
          overflowX: isMobile ? 'hidden' : 'auto',
          paddingBottom: isMobile ? 48 : 10,
          paddingRight: isMobile ? 4 : 10,
          alignItems: isMobile ? 'stretch' : 'stretch',
          flex: 1,
          minHeight: 0,
        }}
      >
        {items.map((it) => {
          const isSelected = selectedScrapId === it.id || editing;
          const isItemEditing = editingScrapId === it.id || (editing && editingScrapId === null);
          const isSavingItem = savingScrapId === it.id;

          return (
            <article
              key={it.id}
              onClick={() => {
                if (!isItemEditing) {
                  setSelectedScrapId((prev) => (prev === it.id ? null : it.id));
                }
              }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                padding: '14px 14px',
                borderRadius: 12,
                border: isSelected ? '1.5px solid var(--accent)' : '1px solid var(--border)',
                background: isSelected ? 'rgba(255, 154, 60, 0.04)' : 'var(--code-bg)',
                boxShadow: isSelected ? '0 2px 10px rgba(0,0,0,0.1)' : 'none',
                cursor: isItemEditing ? 'default' : 'pointer',
                transition: 'border-color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease',
                width: isMobile ? '100%' : 280,
                minWidth: isMobile ? 'auto' : 260,
                maxWidth: isMobile ? '100%' : 300,
                flexShrink: isMobile ? 1 : 0,
                boxSizing: 'border-box',
                overflowY: isMobile ? 'visible' : 'auto',
              }}
            >
              {isItemEditing ? (
                /* ── 개별 인라인 수정 폼 ── */
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }} onClick={(e) => e.stopPropagation()}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)' }}>문장</span>
                    <textarea
                      value={valueOf(it, 'text')}
                      onChange={(e) => patchDraft(it.id, 'text', e.target.value)}
                      rows={3}
                      maxLength={SENTENCE_MAX}
                      placeholder="수집할 문장을 입력하세요"
                      style={editFieldStyle}
                    />
                  </label>

                  <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)' }}>메모 / 생각</span>
                    <textarea
                      value={valueOf(it, 'memo')}
                      onChange={(e) => patchDraft(it.id, 'memo', e.target.value)}
                      rows={2}
                      maxLength={MEMO_MAX}
                      placeholder="나만의 생각이나 메모를 남겨보세요"
                      style={editFieldStyle}
                    />
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)' }}>페이지:</span>
                    <input
                      type="number"
                      min={0}
                      value={valueOf(it, 'page')}
                      onChange={(e) => patchDraft(it.id, 'page', e.target.value)}
                      placeholder="예: 128"
                      style={{ ...editFieldStyle, width: 100 }}
                    />
                  </label>

                  {!editing && (
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
                      <button
                        type="button"
                        onClick={() => handleSaveSingleEdit(it)}
                        disabled={isSavingItem}
                        style={{
                          padding: '6px 14px',
                          borderRadius: 6,
                          border: 'none',
                          background: 'var(--accent)',
                          color: '#fff',
                          fontWeight: 700,
                          fontSize: 14,
                          cursor: isSavingItem ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {isSavingItem ? '저장 중...' : '저장'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCancelSingleEdit(it.id)}
                        disabled={isSavingItem}
                        style={{
                          padding: '6px 12px',
                          borderRadius: 6,
                          border: '1px solid var(--border)',
                          background: 'transparent',
                          color: 'var(--text)',
                          fontWeight: 600,
                          fontSize: 14,
                          cursor: 'pointer',
                        }}
                      >
                        취소
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                /* ── 읽기 전용 뷰 ── */
                <div
                  style={{
                    display: 'flex',
                    flexDirection: isMobile ? 'row' : 'column',
                    gap: isMobile ? 12 : 10,
                    alignItems: isMobile ? 'flex-start' : 'stretch',
                  }}
                >
                  {/* 문장 사진 (스캔 원본) */}
                  {it.scrapImageUrl && (
                    <div
                      style={{
                        position: 'relative',
                        width: isMobile ? 80 : '100%',
                        height: isMobile ? 80 : 130,
                        flexShrink: 0,
                        borderRadius: 8,
                        border: '1px solid var(--border)',
                        background: 'var(--bg)',
                        overflow: 'hidden',
                      }}
                    >
                      <img
                        src={it.scrapImageUrl}
                        alt="수집 문장 이미지"
                        loading="lazy"
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      />
                    </div>
                  )}

                  {/* 텍스트 & 메모 & 페이지 */}
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <p
                      style={{
                        margin: 0,
                        fontSize: 15.5,
                        lineHeight: 1.55,
                        color: 'var(--text-h)',
                        wordBreak: 'break-word',
                      }}
                    >
                      “{it.text}”
                    </p>
                    {it.memo && (
                      <p
                        style={{
                          margin: '2px 0 0',
                          fontSize: 14,
                          color: 'var(--text)',
                          lineHeight: 1.45,
                          wordBreak: 'break-word',
                        }}
                      >
                        💭 {it.memo}
                      </p>
                    )}
                    {it.page != null && (
                      <div style={{ display: 'flex', alignItems: 'center', marginTop: 4 }}>
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            color: 'var(--accent)',
                            background: 'rgba(255, 154, 60, 0.1)',
                            padding: '2px 8px',
                            borderRadius: 4,
                          }}
                        >
                          p. {it.page}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── 문장 선택 시 나타나는 수정 & 삭제 버튼 ── */}
              {isSelected && !isItemEditing && (
                <div
                  style={{
                    display: 'flex',
                    gap: 8,
                    justifyContent: 'flex-end',
                    paddingTop: 8,
                    borderTop: '1px solid var(--border)',
                    marginTop: 'auto',
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => handleStartEditCard(it)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '5px 12px',
                      borderRadius: 6,
                      border: '1px solid var(--accent)',
                      background: 'transparent',
                      color: 'var(--accent)',
                      fontSize: 13.5,
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'background 0.15s ease',
                    }}
                  >
                    <span>✏️</span> 수정
                  </button>
                  <button
                    type="button"
                    onClick={() => requestDelete(it)}
                    disabled={deletingId === it.id}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '5px 12px',
                      borderRadius: 6,
                      border: '1px solid #e74c3c',
                      background: 'transparent',
                      color: '#e74c3c',
                      fontSize: 13.5,
                      fontWeight: 600,
                      cursor: deletingId === it.id ? 'wait' : 'pointer',
                      transition: 'background 0.15s ease',
                    }}
                  >
                    <span>🗑️</span> 삭제
                  </button>
                </div>
              )}
            </article>
          );
        })}

        {/* 다음 페이지 로딩 표시 */}
        {loading && (
          <div
            style={{
              padding: isMobile ? '16px 0' : '0 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14.5,
              color: 'var(--text)',
              flexShrink: 0,
            }}
          >
            문장을 불러오는 중...
          </div>
        )}
      </div>

      {!loading && items.length === 0 && !error && (
        <div style={{ padding: '24px 0', textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: 15.5, color: 'var(--text)' }}>
            아직 수집한 문장이 없어요 📖<br />
            <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>“문장 수집” 버튼을 눌러 첫 문장을 기록해 보세요.</span>
          </p>
        </div>
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
              aria-label="문장 삭제 확인"
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
                이 문장을 삭제하시겠어요?
              </p>
              <p style={{ margin: '0 0 18px', fontSize: 15, color: 'var(--text)', lineHeight: 1.5 }}>
                사진과 메모가 함께 지워지며 복구할 수 없습니다.
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
                  {deletingId === pendingDelete.id ? '삭제 중...' : '삭제'}
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
                  취소
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
