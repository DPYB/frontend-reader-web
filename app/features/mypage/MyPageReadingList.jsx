import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBooks } from '../../store/booksStore';
import { coverImageSrc, onFallbackCover } from '../../lib/coverImage';
import { genreLabel } from '../../data/genres';

export default function MyPageReadingList({ onSelectBook }) {
  const { books, loading, error, reload } = useBooks();
  const navigate = useNavigate();

  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('latest');

  // 독서 상태별 도서 수 계산
  const counts = useMemo(() => {
    let reading = 0;
    let completed = 0;
    let planned = 0;

    books.forEach((b) => {
      const st = b.readingStatus || (b.progress >= 100 ? 'COMPLETED' : b.status === '완독' ? 'COMPLETED' : b.status === '시작전' ? 'PLANNED' : 'READING');
      if (st === 'COMPLETED' || b.status === '완독') completed += 1;
      else if (st === 'READING' || b.status === '읽는 중' || (b.progress > 0 && b.progress < 100)) reading += 1;
      else planned += 1;
    });

    return {
      all: books.length,
      reading,
      completed,
      planned,
    };
  }, [books]);

  // 필터링 및 정렬
  const filteredBooks = useMemo(() => {
    return books
      .filter((b) => {
        // 상태 필터
        if (statusFilter !== 'ALL') {
          const isComp = b.readingStatus === 'COMPLETED' || b.status === '완독' || b.progress >= 100;
          const isRead = (b.readingStatus === 'READING' || b.status === '읽는 중' || (b.progress > 0 && b.progress < 100)) && !isComp;
          const isPlan = !isComp && !isRead;

          if (statusFilter === 'COMPLETED' && !isComp) return false;
          if (statusFilter === 'READING' && !isRead) return false;
          if (statusFilter === 'PLANNED' && !isPlan) return false;
        }

        // 검색어 필터 (제목 또는 저자)
        if (searchQuery.trim()) {
          const q = searchQuery.trim().toLowerCase();
          const matchTitle = (b.title || '').toLowerCase().includes(q);
          const matchAuthor = (b.author || '').toLowerCase().includes(q);
          if (!matchTitle && !matchAuthor) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'title') {
          return (a.title || '').localeCompare(b.title || '', 'ko');
        }
        if (sortBy === 'progress') {
          return (b.progress || 0) - (a.progress || 0);
        }
        // 기본: 최신순 (bookId 내림차순)
        return (Number(b.bookId) || 0) - (Number(a.bookId) || 0);
      });
  }, [books, statusFilter, searchQuery, sortBy]);

  const getStatusBadge = (book) => {
    if (book.readingStatus === 'COMPLETED' || book.status === '완독' || book.progress >= 100) {
      return { label: '완독', bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: 'rgba(16, 185, 129, 0.3)' };
    }
    if (book.readingStatus === 'READING' || book.status === '읽는 중' || (book.progress > 0 && book.progress < 100)) {
      return { label: '읽는 중', bg: 'rgba(255, 154, 60, 0.15)', color: 'var(--accent)', border: 'var(--accent-border)' };
    }
    return { label: '시작전', bg: 'rgba(148, 163, 184, 0.15)', color: '#94a3b8', border: 'rgba(148, 163, 184, 0.3)' };
  };

  return (
    <div className="mypage-reading-list">
      {/* 상단 필터 & 검색 툴바 */}
      <div className="mypage-list-toolbar">
        {/* 상태 필터 탭 */}
        <div className="mypage-status-pills">
          <button
            type="button"
            className={`mypage-status-pill ${statusFilter === 'ALL' ? 'active' : ''}`}
            onClick={() => setStatusFilter('ALL')}
          >
            전체 <span className="pill-count">{counts.all}</span>
          </button>
          <button
            type="button"
            className={`mypage-status-pill ${statusFilter === 'READING' ? 'active' : ''}`}
            onClick={() => setStatusFilter('READING')}
          >
            읽는 중 <span className="pill-count">{counts.reading}</span>
          </button>
          <button
            type="button"
            className={`mypage-status-pill ${statusFilter === 'COMPLETED' ? 'active' : ''}`}
            onClick={() => setStatusFilter('COMPLETED')}
          >
            완독 <span className="pill-count">{counts.completed}</span>
          </button>
          <button
            type="button"
            className={`mypage-status-pill ${statusFilter === 'PLANNED' ? 'active' : ''}`}
            onClick={() => setStatusFilter('PLANNED')}
          >
            시작전 <span className="pill-count">{counts.planned}</span>
          </button>
        </div>

        {/* 검색 및 정렬 드롭다운 */}
        <div className="mypage-filter-controls">
          <div className="mypage-search-box">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="도서명 또는 저자 검색..."
              className="mypage-search-input"
            />
            {searchQuery && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={() => setSearchQuery('')}
                aria-label="검색어 지우기"
              >
                ✕
              </button>
            )}
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="mypage-sort-select"
            aria-label="도서 정렬"
          >
            <option value="latest">최신 등록순</option>
            <option value="title">제목순</option>
            <option value="progress">진행률 높은순</option>
          </select>
        </div>
      </div>

      {/* 로딩 & 에러 상태 */}
      {loading && books.length === 0 && (
        <div className="mypage-list-empty">
          <div className="mypage-spinner" />
          <p>내 서재 도서 목록을 불러오는 중입니다...</p>
        </div>
      )}

      {error && (
        <div className="mypage-list-error">
          <p>{error}</p>
          <button type="button" onClick={reload} className="mypage-retry-btn">
            다시 시도
          </button>
        </div>
      )}

      {/* 도서 목록 카드 그리드 */}
      {!loading && filteredBooks.length > 0 && (
        <div className="mypage-books-grid">
          {filteredBooks.map((book) => {
            const badge = getStatusBadge(book);
            const progress = Math.min(100, Math.max(0, Number(book.progress) || 0));
            const curPage = book.currentPage != null ? book.currentPage : 0;
            const totalPage = book.totalPages || book.total_pages;
            const genre = genreLabel(book.genre) || (book.genre && book.genre !== 'NONE' ? book.genre : null);

            return (
              <article
                key={book.bookId}
                className="mypage-book-card"
                onClick={() => onSelectBook?.(book)}
                tabIndex={0}
                role="button"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectBook?.(book);
                  }
                }}
              >
                {/* 책 표지 영역 */}
                <div className="mypage-book-cover-wrap">
                  <img
                    src={coverImageSrc(book.coverUrl)}
                    alt={`${book.title} 표지`}
                    className="mypage-book-cover"
                    loading="lazy"
                    onError={onFallbackCover}
                  />
                  <span
                    className="mypage-book-status-badge"
                    style={{
                      background: badge.bg,
                      color: badge.color,
                      borderColor: badge.border,
                    }}
                  >
                    {badge.label}
                  </span>
                </div>

                {/* 책 정보 영역 */}
                <div className="mypage-book-info">
                  {genre && (
                    <span className="mypage-book-genre">
                      #{genre}
                    </span>
                  )}
                  <h3 className="mypage-book-title" title={book.title}>
                    {book.title}
                  </h3>
                  <p className="mypage-book-author" title={book.author}>
                    ✍️ {book.author || '저자 미입력'}
                  </p>

                  {/* 독서 진행률 바 */}
                  <div className="mypage-book-progress-area">
                    <div className="mypage-progress-meta">
                      <span className="progress-percent">{progress}%</span>
                      <span className="progress-pages">
                        {curPage} {totalPage ? `/ ${totalPage}p` : '쪽'}
                      </span>
                    </div>
                    <div className="mypage-progress-track">
                      <div
                        className="mypage-progress-fill"
                        style={{
                          width: `${progress}%`,
                          background: progress >= 100 ? '#10b981' : 'var(--accent)',
                        }}
                      />
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* 빈 상태 안내 */}
      {!loading && books.length === 0 && !error && (
        <div className="mypage-list-empty">
          <p className="empty-title">아직 내 서재에 등록된 도서가 없어요 📖</p>
          <p className="empty-desc">읽고 있는 책을 등록하고 나만의 독서 여정을 시작해 보세요.</p>
          <button
            type="button"
            className="mypage-primary-action-btn"
            onClick={() => navigate('/register-book')}
          >
            📚 새 책 등록하러 가기
          </button>
        </div>
      )}

      {!loading && books.length > 0 && filteredBooks.length === 0 && (
        <div className="mypage-list-empty">
          <p className="empty-title">검색 조건에 맞는 도서가 없습니다 🔍</p>
          <p className="empty-desc">필터나 검색어를 변경해 보세요.</p>
          <button
            type="button"
            className="mypage-reset-filter-btn"
            onClick={() => {
              setStatusFilter('ALL');
              setSearchQuery('');
            }}
          >
            필터 초기화
          </button>
        </div>
      )}
    </div>
  );
}
