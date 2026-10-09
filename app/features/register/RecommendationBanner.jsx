export default function RecommendationBanner({ fromRecommendation, onClose }) {
  if (!fromRecommendation) return null;

  return (
    <div className="rb-recommend-banner">
      <span>✨ <strong>AI 사서 추천 도서</strong> 정보가 자동으로 입력되었습니다. (필요 시 수정 가능)</span>
      <button
        type="button"
        className="rb-recommend-banner-close"
        onClick={onClose}
        aria-label="닫기"
      >
        ✕
      </button>
    </div>
  );
}
