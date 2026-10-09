import LoadingSequence from '../../components/LoadingSequence';
import { coverImageSrc, onFallbackCover } from '../../lib/coverImage';
import { GENRE_DEFS, GENRE_NONE } from '../../data/genres';

export default function BookRegisterForm({
  activeTab,
  ocrDone,
  title,
  setTitle,
  author,
  setAuthor,
  isbn,
  setIsbn,
  genre,
  setGenre,
  genreLoading,
  subject,
  displayGenre,
  genreSubLabel,
  presets,
  colorIdx,
  setColorIdx,
  totalPage,
  setTotalPage,
  currentPage,
  setCurrentPage,
  derivedStatus,
  thickness,
  extraMeta,
  editing,
  setEditing,
  ocrLoading,
  isLibraryFull,
  maxLibraryBooks,
  submitError,
  submitting,
  allFilled,
  onSubmit,
}) {
  const formVisible = activeTab !== 'search' || (activeTab === 'search' && (ocrDone || title));

  if (!formVisible) return null;

  return (
    <div className="rb-detail-col">
      <div className="rb-detail-header">
        <span className="rb-detail-title">
          {activeTab === 'manual' ? '도서 정보 직접 입력' : '도서 정보 확인 및 수정'}
        </span>
        {ocrDone && activeTab === 'camera' && (
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            className={`rb-detail-edit-toggle ${editing ? 'active' : ''}`}
          >
            {editing ? '수정 완료' : '수정'}
          </button>
        )}
      </div>

      {ocrLoading ? (
        <LoadingSequence label="잠시만 기다려주세요..." />
      ) : (
        <div className="rb-detail-body">
          {/* 책 표지 */}
          <div className="rb-detail-cover-col">
            <img
              src={coverImageSrc(extraMeta.coverUrl)}
              alt={title ? `${title} 표지` : '책 표지'}
              className="rb-detail-cover-img"
              onError={onFallbackCover}
            />
            {extraMeta.sideCoverUrl && (
              <span className="rb-detail-cover-badge">
                ✨ YES24 고화질 표지 적용됨
              </span>
            )}
          </div>

          {/* 표지 옆 입력 필드 */}
          <div className="rb-detail-fields-col">
            {/* 제목 */}
            <label className="rb-field-label">
              <span className="rb-field-title">제목 *</span>
              {editing ? (
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="책 제목을 입력해주세요"
                  className="rb-field-input"
                  required
                />
              ) : (
                <div className="rb-field-view-text">{title || '(입력된 제목 없음)'}</div>
              )}
            </label>

            {/* 저자 */}
            <label className="rb-field-label">
              <span className="rb-field-title">저자 *</span>
              {editing ? (
                <input
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="저자명을 입력해주세요"
                  className="rb-field-input"
                  required
                />
              ) : (
                <div className="rb-field-view-text">{author || '(입력된 저자 없음)'}</div>
              )}
            </label>

            {/* ISBN */}
            <label className="rb-field-label">
              <span className="rb-field-title">ISBN</span>
              {editing ? (
                <input
                  value={isbn}
                  onChange={(e) => setIsbn(e.target.value)}
                  placeholder="13자리 ISBN (선택)"
                  className="rb-field-input"
                />
              ) : (
                <div className="rb-field-view-text">{isbn || '(미입력)'}</div>
              )}
            </label>

            {/* 장르 */}
            <label className="rb-field-label">
              <span className="rb-field-title">
                {genreLoading ? (
                  <span className="rb-genre-loading-label">
                    <span className="rb-spinner rb-genre-spinner" />
                    장르 (분류 중...)
                  </span>
                ) : (
                  '장르'
                )}
              </span>
              {editing ? (
                <div className="rb-genre-select-wrap">
                  <select
                    value={genre}
                    onChange={(e) => setGenre(e.target.value)}
                    className="rb-field-select"
                  >
                    <option value={GENRE_NONE}>미지정</option>
                    {GENRE_DEFS.map((g) => (
                      <option key={g.code} value={g.code}>
                        {g.label}
                      </option>
                    ))}
                  </select>
                  {(subject || displayGenre) && (
                    <span className="rb-genre-sub-text">
                      세부 분야: {displayGenre || subject}
                    </span>
                  )}
                </div>
              ) : (
                <div className="rb-field-view-text">{genreSubLabel}</div>
              )}
            </label>

            {/* 책 색상 팔레트 */}
            <label className="rb-field-label">
              <span className="rb-field-title">책등 및 표지 색상</span>
              <div className="rb-color-palette">
                {presets.map((p, i) => (
                  <button
                    type="button"
                    key={i}
                    disabled={!editing}
                    onClick={() => editing && setColorIdx(i)}
                    title={`색상 ${i + 1}`}
                    className={`rb-color-swatch ${colorIdx === i ? 'selected' : ''}`}
                    style={{
                      background: `linear-gradient(90deg, ${p.spine} 0 40%, ${p.cover} 40% 100%)`,
                    }}
                  />
                ))}
              </div>
            </label>

            {/* 총 페이지 수 & 현재 읽은 페이지 */}
            <div className="rb-pages-row">
              <label className="rb-field-label">
                <span className="rb-field-title">총 쪽수 (페이지) *</span>
                <input
                  type="number"
                  min={1}
                  value={totalPage}
                  onChange={(e) => setTotalPage(e.target.value)}
                  placeholder="예: 320"
                  className="rb-field-input"
                  required
                />
              </label>

              <label className="rb-field-label">
                <span className="rb-field-title">현재 읽은 쪽수 📖</span>
                <input
                  type="number"
                  min={0}
                  value={currentPage}
                  onChange={(e) => setCurrentPage(e.target.value)}
                  placeholder="예: 0"
                  className="rb-field-input"
                />
              </label>
            </div>

            {totalPage && (
              <span className="rb-status-thickness-info">
                독서 상태: <strong>{derivedStatus}</strong> · 두께: {thickness} (자동 계산)
              </span>
            )}
          </div>
        </div>
      )}

      {/* 최종 등록 버튼 */}
      <div className="rb-submit-col">
        {isLibraryFull && (
          <span className="rb-submit-error">
            서재 선반이 가득 찼어요. 최대 {maxLibraryBooks}권까지 등록할 수 있어요.
          </span>
        )}
        {submitError && (
          <span className="rb-submit-error">{submitError}</span>
        )}
        <button
          type="button"
          onClick={onSubmit}
          disabled={!allFilled || submitting || isLibraryFull}
          className={`rb-submit-btn ${allFilled && !submitting && !isLibraryFull ? 'active' : ''}`}
        >
          {submitting && <span className="rb-spinner rb-submit-spinner" />}
          {submitting ? '등록 중...' : '내 서재에 꽂기'}
        </button>
      </div>
    </div>
  );
}
