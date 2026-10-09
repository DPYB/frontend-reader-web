import './TermsModal.css';

/**
 * TermsModal — 약관 전문 표시 모달.
 * content는 plain text(마크다운/HTML 아님)이므로 white-space: pre-wrap으로 줄바꿈만 살려서 표시.
 *
 * @param {string} name - 약관명 (예: '이용약관')
 * @param {string|null} content - 약관 전문. null이면 로딩/오류 상태로 간주
 * @param {boolean} loading
 * @param {string} error - 에러 메시지 (있으면 표시)
 * @param {()=>void} onClose
 */
export default function TermsModal({ name, content, loading, error, onClose }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${name} 전문`}
      onClick={onClose}
      className="terms-modal-backdrop"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="terms-modal-card"
      >
        <div className="terms-modal-header">
          <strong className="terms-modal-title">{name}</strong>
          <button
            onClick={onClose}
            aria-label="닫기"
            className="terms-modal-close-btn"
          >
            ✕
          </button>
        </div>

        <div className="terms-modal-body">
          {loading && <p className="terms-modal-loading">약관을 불러오는 중입니다...</p>}
          {!loading && error && <p className="signup-error">{error}</p>}
          {!loading && !error && (
            <p className="terms-modal-content">
              {content}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

