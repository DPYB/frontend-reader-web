import { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toKoreanStatus } from '../../api/bookApi';
import { genreLabel } from '../../data/genres';
import { coverImageSrc, onFallbackCover } from '../../lib/coverImage';
import './MobileShelfSheet.css';

function CloseIcon() {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
    );
}

function getDefaultHeight() {
    if (typeof window !== 'undefined') {
        return Math.min(Math.round(window.innerHeight * 0.54), 480);
    }
    return 440;
}

function getExpandedHeight() {
    if (typeof window !== 'undefined') {
        // 상단 GNB / 서비스 이름 바로 아래까지 (약 56px 여백 확보)
        return Math.max(380, window.innerHeight - 56);
    }
    return 700;
}

export default function MobileShelfSheet({
    activeShelfIdx,
    onSelectShelf,
    onClose,
    placements = [],
    allBooks = [],
    onOpenBookDetail,
}) {
    const navigate = useNavigate();

    // 2가지 높이 상태: default(기본 54vh) / expanded(서비스 이름 아래까지)
    const [isExpanded, setIsExpanded] = useState(false);
    const [sheetHeight, setSheetHeight] = useState(getDefaultHeight);
    const [prevShelfIdx, setPrevShelfIdx] = useState(activeShelfIdx);
    const [isDragging, setIsDragging] = useState(false);
    const dragRef = useRef({
        startY: 0,
        startHeight: 0,
        isDown: false,
        hasMoved: false,
    });

    // 닫고 다시 열거나 선반 탭을 변경할 때마다 항상 기본(default) 높이로 리셋
    if (activeShelfIdx !== prevShelfIdx) {
        setPrevShelfIdx(activeShelfIdx);
        setIsExpanded(false);
        setSheetHeight(getDefaultHeight());
    }

    // 화면 리사이즈 시 높이 보정
    useEffect(() => {
        const handleResize = () => {
            if (isExpanded) {
                setSheetHeight(getExpandedHeight());
            } else {
                setSheetHeight(getDefaultHeight());
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [isExpanded]);

    // 상단 드래그 핸들 포인터 이벤트 핸들러
    const handleDragStart = useCallback((e) => {
        dragRef.current = {
            isDown: true,
            startY: e.clientY,
            startHeight: sheetHeight,
            hasMoved: false,
        };
        setIsDragging(true);
        try {
            e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
            // 무시
        }
    }, [sheetHeight]);

    const handleDragMove = useCallback((e) => {
        if (!dragRef.current.isDown) return;
        const deltaY = dragRef.current.startY - e.clientY;
        if (Math.abs(deltaY) > 5) {
            dragRef.current.hasMoved = true;
        }
        const minH = Math.min(260, window.innerHeight * 0.32);
        const maxH = getExpandedHeight();
        const nextH = Math.max(minH, Math.min(maxH, dragRef.current.startHeight + deltaY));
        setSheetHeight(nextH);
    }, []);

    const handleDragEnd = useCallback((e) => {
        if (!dragRef.current.isDown) return;
        const deltaY = dragRef.current.startY - (e.clientY ?? dragRef.current.startY);
        const wasMoved = dragRef.current.hasMoved;
        dragRef.current.isDown = false;
        setIsDragging(false);
        try {
            e.currentTarget.releasePointerCapture(e.pointerId);
        } catch {
            // 무시
        }

        const defaultH = getDefaultHeight();
        const expandedH = getExpandedHeight();

        // 탭/클릭만 한 경우 (드래그 없이 터치): 토글
        if (!wasMoved) {
            setIsExpanded((prev) => {
                const next = !prev;
                setSheetHeight(next ? expandedH : defaultH);
                return next;
            });
            return;
        }

        // 2가지 범위 스냅 판정: 위로 드래그 시 확장(서비스 이름 아래), 아래로 드래그 시 기본 높이
        if (!isExpanded) {
            if (deltaY > 30) {
                setIsExpanded(true);
                setSheetHeight(expandedH);
            } else if (deltaY < -100) {
                onClose();
            } else {
                setSheetHeight(defaultH);
            }
        } else {
            if (deltaY < -30) {
                setIsExpanded(false);
                setSheetHeight(defaultH);
            } else {
                setSheetHeight(expandedH);
            }
        }
    }, [isExpanded, onClose]);

    // 5개 선반 목록
    const shelves = [0, 1, 2, 3, 4];

    // 현재 선택된 선반에 담긴 책 목록 (placements에서 shelfIndex matching, 없으면 순서 분배 fallback)
    const shelfBooks = useMemo(() => {
        if (activeShelfIdx === null || activeShelfIdx === undefined) return [];

        // 1) placements에서 해당 shelfIndex에 배치된 책 추출
        const fromPlacements = placements.filter((b) => b.shelfIndex === activeShelfIdx);
        if (fromPlacements.length > 0) return fromPlacements;

        // 2) fallback: allBooks를 10권씩 선반에 나누어 배분
        const chunkSize = 10;
        const start = activeShelfIdx * chunkSize;
        return allBooks.slice(start, start + chunkSize);
    }, [activeShelfIdx, placements, allBooks]);

    if (activeShelfIdx === null || activeShelfIdx === undefined) return null;

    const shelfNumber = activeShelfIdx + 1;

    return (
        <>
            {/* 모바일 바텀시트 딤 배경 */}
            <div className="mobile-shelf-backdrop" onClick={onClose} aria-hidden="true" />

            <div
                className={`mobile-shelf-sheet${isDragging ? ' is-dragging' : ''}`}
                style={{ height: `${sheetHeight}px` }}
                role="dialog"
                aria-modal="true"
                aria-label={`${shelfNumber}번 선반 도서 목록`}
            >
                {/* 상단 드래그 핸들 터치 영역 */}
                <div
                    className="mobile-shelf-handle-area"
                    onPointerDown={handleDragStart}
                    onPointerMove={handleDragMove}
                    onPointerUp={handleDragEnd}
                    onPointerCancel={handleDragEnd}
                    title="위아래로 드래그하여 창 크기 조절"
                    aria-label="선반 창 높이 조절"
                >
                    <div className="mobile-shelf-handle" />
                </div>

                {/* 선반 선택 탭 바 (1번~5번 선반) */}
                <div className="mobile-shelf-header">
                    <div className="mobile-shelf-tabs" role="tablist" aria-label="선반 선택">
                        {shelves.map((idx) => {
                            const isSelected = idx === activeShelfIdx;
                            // 각 선반별 도서 수 집계
                            const count = placements.filter((b) => b.shelfIndex === idx).length;
                            return (
                                <button
                                    key={idx}
                                    role="tab"
                                    aria-selected={isSelected}
                                    className={`mobile-shelf-tab${isSelected ? ' active' : ''}`}
                                    onClick={() => onSelectShelf(idx)}
                                >
                                    <span className="mobile-shelf-tab-label">{idx + 1}번 선반</span>
                                    {count > 0 && <span className="mobile-shelf-tab-badge">{count}</span>}
                                </button>
                            );
                        })}
                    </div>

                    <button className="mobile-shelf-close-btn" onClick={onClose} aria-label="닫기">
                        <CloseIcon />
                    </button>
                </div>

                <div className="mobile-shelf-subtitle">
                    <strong>📚 {shelfNumber}번 선반</strong>
                    <span className="mobile-shelf-count-text">총 {shelfBooks.length}권의 책이 꽂혀있어요</span>
                </div>

                {/* 수직 상하 스크롤 도서 리스트 */}
                <div className="mobile-shelf-body">
                    {shelfBooks.length === 0 ? (
                        <div className="mobile-shelf-empty">
                            <div className="mobile-shelf-empty-icon">📥</div>
                            <p className="mobile-shelf-empty-title">이 선반은 비어있어요</p>
                            <p className="mobile-shelf-empty-desc">새로운 책을 등록하여 {shelfNumber}번 선반을 채워보세요!</p>
                            <button
                                className="mobile-shelf-register-btn"
                                onClick={() => {
                                    onClose();
                                    navigate('/register');
                                }}
                            >
                                ➕ 책 등록하러 가기
                            </button>
                        </div>
                    ) : (
                        <div className="mobile-shelf-book-list">
                            {shelfBooks.map((book) => {
                                const statusText = toKoreanStatus(book.status || book.readingStatus);
                                const progressPct = Math.min(100, Math.max(0, Number(book.progress) || 0));
                                const rawGenre = book.genre || book.displayGenre || book.subject;
                                const displayGenre = genreLabel(rawGenre) || rawGenre;
                                const rawCoverUrl = book.coverUrl || book.cover_url || book.coverImage || book.cover_image;
                                const coverSrc = coverImageSrc(rawCoverUrl);

                                return (
                                    <div
                                        key={book.id || book.bookId}
                                        className="mobile-shelf-book-item"
                                        onClick={() => {
                                            onClose();
                                            onOpenBookDetail(book);
                                        }}
                                        role="button"
                                        tabIndex={0}
                                    >
                                        {/* 책 표지 / 스파인 섬네일 — 개별 책 상세와 동일한 이미지 규격 적용 */}
                                        <div
                                            className="mobile-shelf-book-cover"
                                            style={{
                                                backgroundColor: book.coverColor || book.spineColor || 'var(--code-bg)',
                                            }}
                                        >
                                            <img
                                                src={coverSrc}
                                                alt={`${book.title || '도서'} 표지`}
                                                width={48}
                                                height={68}
                                                decoding="async"
                                                onError={onFallbackCover}
                                            />
                                        </div>

                                        {/* 도서 메타 데이터 정보 */}
                                        <div className="mobile-shelf-book-info">
                                            <div className="mobile-shelf-book-title-row">
                                                <h4 className="mobile-shelf-book-title">{book.title || '제목 미상'}</h4>
                                                <span className={`mobile-shelf-status-badge status-${statusText}`}>
                                                    {statusText}
                                                </span>
                                            </div>

                                            <p className="mobile-shelf-book-author">
                                                {book.author ? `✍️ ${book.author}` : '저자 정보 없음'}
                                            </p>

                                            {displayGenre && (
                                                <span className="mobile-shelf-genre-tag">
                                                    #{displayGenre}
                                                </span>
                                            )}

                                            {/* 진행률 바 */}
                                            {statusText === '읽는 중' && (
                                                <div className="mobile-shelf-progress-wrap">
                                                    <div className="mobile-shelf-progress-bar">
                                                        <div
                                                            className="mobile-shelf-progress-fill"
                                                            style={{ width: `${progressPct}%` }}
                                                        />
                                                    </div>
                                                    <span className="mobile-shelf-progress-pct">{progressPct}%</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="mobile-shelf-arrow">➔</div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
