import { createPortal } from 'react-dom';

export default function IsbnGuideModal({ isOpen, onClose, maxImageSizeMb = 5 }) {
  if (!isOpen) return null;

  return createPortal(
    <div className="rb-modal-overlay" onClick={onClose}>
      <div className="rb-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="rb-modal-header">
          <h3 className="rb-modal-title">📷 ISBN 촬영 가이드</h3>
          <button
            type="button"
            className="rb-modal-close-btn"
            onClick={onClose}
            aria-label="닫기"
          >
            ✕
          </button>
        </div>
        <img
          src="/ISBN_guide.jpg"
          alt="책 뒷면 바코드 아래 ISBN 숫자를 촬영하는 예시"
          className="rb-modal-guide-img"
        />
        <span className="rb-modal-guide-caption">
          업로드 가능한 이미지 최대 크기: {maxImageSizeMb}MB / 지원 파일 형식: JPG, PNG
        </span>
      </div>
    </div>,
    document.body
  );
}
