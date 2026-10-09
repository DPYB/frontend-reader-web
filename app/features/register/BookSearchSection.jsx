import LoadingSequence from '../../components/LoadingSequence';
import { coverImageSrc, onFallbackCover } from '../../lib/coverImage';

export default function BookSearchSection({
  searchQuery,
  setSearchQuery,
  onSearchSubmit,
  popularKeywords,
  onSelectKeywordChip,
  searchError,
  searchMeta,
  isSearching,
  hasSearched,
  searchResults,
  instantRegisteringKey,
  submitting,
  isLibraryFull,
  onInstantRegister,
  onSelectBookForDetail,
  onSwitchTab,
}) {
  return (
    <div className="rb-search-section">
      <form className="rb-search-bar-wrap" onSubmit={onSearchSubmit}>
        <span className="rb-search-icon">🔍</span>
        <input
          type="text"
          className="rb-search-input"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="도서명이나 저자명을 검색해보세요 (예: 불편한 편의점, 한강, 세이노)"
          autoFocus
        />
        {searchQuery && (
          <button
            type="button"
            className="rb-search-clear-btn"
            onClick={() => setSearchQuery('')}
            title="지우기"
          >
            ✕
          </button>
        )}
        <button
          type="submit"
          className="rb-search-submit-btn"
          disabled={isSearching || !searchQuery.trim()}
        >
          {isSearching ? <span className="rb-spinner" /> : '검색'}
        </button>
      </form>

      {/* 추천 키워드 칩스 */}
      <div className="rb-search-chips">
        <span>추천:</span>
        {popularKeywords.map((kw) => (
          <button
            key={kw}
            type="button"
            className="rb-chip-btn"
            onClick={() => onSelectKeywordChip(kw)}
          >
            {kw}
          </button>
        ))}
      </div>

      {searchError && (
        <div className="rb-search-error">
          {searchError}
        </div>
      )}

      {/* 검색 결과 목록 */}
      {searchMeta && (
        <div className="rb-search-meta">
          <span>
            ✨ <strong className="rb-search-meta-highlight">'{searchMeta.query}'</strong> 검색 결과 (총 {searchMeta.total}건)
          </span>
          <span className="rb-search-provider-note">YES24 서지정보</span>
        </div>
      )}

      {isSearching && searchResults.length === 0 && (
        <div className="rb-search-loading-wrap">
          <LoadingSequence label="도서 정보를 검색하고 있습니다..." />
        </div>
      )}

      {hasSearched && !isSearching && searchResults.length === 0 && !searchError && (
        <div className="rb-search-empty">
          <span className="rb-search-empty-icon">📚</span>
          <strong>'{searchQuery}'에 대한 검색 결과를 찾지 못했습니다.</strong>
          <span className="rb-search-empty-desc">도서명이나 저자의 오타를 확인하시거나 사진/바코드로 등록해보세요.</span>
          <div className="rb-search-empty-actions">
            <button
              type="button"
              className="rb-btn-select"
              onClick={() => onSwitchTab('camera')}
            >
              📷 사진 촬영으로 등록
            </button>
            <button
              type="button"
              className="rb-btn-select"
              onClick={() => onSwitchTab('manual')}
            >
              ✍️ 직접 입력하기
            </button>
          </div>
        </div>
      )}

      {searchResults.length > 0 && (
        <div className="rb-search-grid">
          {searchResults.map((item, idx) => {
            const key = item.isbn || `${item.title}-${idx}`;
            const isInstantRegistering = instantRegisteringKey === (item.isbn || item.title);

            return (
              <div key={key} className="rb-book-card">
                <div className="rb-card-top">
                  <div className="rb-card-cover-box">
                    <img
                      src={coverImageSrc(item.coverUrl)}
                      alt={item.title}
                      className="rb-card-cover-img"
                      onError={onFallbackCover}
                      loading="lazy"
                    />
                    {item.sideCoverUrl && (
                      <span className="rb-card-side-tag" title="책등 이미지 지원">책등</span>
                    )}
                  </div>

                  <div className="rb-card-content">
                    <div className="rb-card-title-row">
                      <h4 className="rb-card-title" title={item.title}>{item.title}</h4>
                      {typeof item.starScore === 'number' && item.starScore > 0 && (
                        <span className="rb-card-star">★ {item.starScore.toFixed(1)}</span>
                      )}
                    </div>

                    <div className="rb-card-meta">
                      {item.author && <span>{item.author}</span>}
                      {item.publisher && <span> · {item.publisher}</span>}
                    </div>

                    <div className="rb-card-badges">
                      {item.totalPages && (
                        <span className="rb-card-page-badge">📖 {item.totalPages}쪽</span>
                      )}
                      {item.publishedDate && (
                        <span className="rb-card-page-badge">📅 {item.publishedDate.slice(0, 10)}</span>
                      )}
                    </div>

                    {item.description && (
                      <p className="rb-card-desc" title={item.description}>
                        {item.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="rb-card-actions">
                  {item.isRegistered ? (
                    <div className="rb-btn-registered">
                      ✓ 내 서재에 있음
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="rb-btn-instant"
                        onClick={() => onInstantRegister(item)}
                        disabled={isInstantRegistering || submitting || isLibraryFull}
                        title="한 번의 클릭으로 기본 서재에 즉시 추가합니다"
                      >
                        {isInstantRegistering ? (
                          <>
                            <span className="rb-spinner" />
                            꽂는 중...
                          </>
                        ) : (
                          '📥 바로 서재에 담기'
                        )}
                      </button>

                      <button
                        type="button"
                        className="rb-btn-select"
                        onClick={() => onSelectBookForDetail(item)}
                        title="책 색상, 독서 상태, 현재 페이지 등을 직접 설정하여 등록합니다"
                      >
                        ✏️ 정보 확인
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
