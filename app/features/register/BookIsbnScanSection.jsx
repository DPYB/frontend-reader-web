export default function BookIsbnScanSection({
  onOpenGuide,
  uploadInputRef,
  onInputChange,
  onOpenWebcam,
  previewUrl,
  ocrLoading,
  ocrError,
  ocrNotice,
  isbn,
  setIsbn,
  onSearchIsbn,
  isbnSearching,
}) {
  return (
    <div className="rb-scan-col">
      <div className="rb-scan-header">
        <span className="rb-scan-title">ISBN 촬영</span>
        <button
          type="button"
          onClick={onOpenGuide}
          className="rb-guide-btn"
        >
          🐾 가이드
        </button>
      </div>

      <span className="rb-scan-help-text">
        책 뒷면이나 표지 안쪽 바코드 아래 13자리 ISBN 숫자를 촬영해주세요.
      </span>

      <input
        ref={uploadInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={onInputChange}
      />

      <button
        type="button"
        onClick={onOpenWebcam}
        className="rb-scan-btn"
      >
        📷 사진 촬영
      </button>
      <button
        type="button"
        onClick={() => uploadInputRef.current?.click()}
        className="rb-scan-btn"
      >
        🖼️ 이미지 업로드
      </button>

      {previewUrl && (
        <div className="rb-cover-preview-box">
          <img src={previewUrl} alt="표지 미리보기" className="rb-cover-preview-img" />
        </div>
      )}

      {ocrLoading && (
        <div className="rb-ocr-loading-box">
          <div className="rb-spinner rb-ocr-spinner" />
          ISBN 인식 중입니다...
        </div>
      )}

      {ocrError && <span className="rb-ocr-error">{ocrError}</span>}
      {ocrNotice && <span className="rb-ocr-notice">{ocrNotice}</span>}

      {/* ISBN 직접 검색 입력란 */}
      <label className="rb-isbn-input-label">
        <span className="rb-isbn-input-title">ISBN 직접 입력</span>
        <div className="rb-isbn-input-row">
          <input
            type="text"
            value={isbn}
            onChange={(e) => setIsbn(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                onSearchIsbn();
              }
            }}
            placeholder="예: 9791164794348"
            className="rb-isbn-text-input"
          />
          <button
            type="button"
            onClick={onSearchIsbn}
            disabled={isbnSearching || ocrLoading}
            className="rb-isbn-search-btn"
          >
            {isbnSearching ? <span className="rb-spinner" /> : '조회'}
          </button>
        </div>
      </label>
    </div>
  );
}
