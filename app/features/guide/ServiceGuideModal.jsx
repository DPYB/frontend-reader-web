import { useState, useEffect, useCallback, useRef } from 'react';
import './ServiceGuideModal.css';

const GUIDE_IMAGES = [
  '/guide/0.png',
  '/guide/1.png',
  '/guide/2.png',
  '/guide/3.png',
  '/guide/4.png',
  '/guide/5.png',
];

const GUIDE_TITLES = [
  '서재 기본 안내',
  '사서와의 대화 & 추천',
  '도서 등록 및 관리',
  '문장 수집 & 카메라 OCR',
  '독서 타이머 & 집중 모드',
  '마이페이지 & 독서 캘린더',
];

import { dismissGuideForToday } from './guideStorage';

export default function ServiceGuideModal({ isOpen, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStartX, setTouchStartX] = useState(null);
  const [dontShowToday, setDontShowToday] = useState(false);
  const modalRef = useRef(null);

  const totalSlides = GUIDE_IMAGES.length;

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => Math.min(totalSlides - 1, prev + 1));
  }, [totalSlides]);

  const handleCloseModal = useCallback(() => {
    if (dontShowToday) {
      dismissGuideForToday();
    }
    onClose();
  }, [dontShowToday, onClose]);

  // 키보드 방향키 및 ESC 닫기 핸들러
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleCloseModal();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handlePrev, handleNext, handleCloseModal]);

  // 다음 이미지 사전 로드 (부드러운 전환)
  useEffect(() => {
    if (!isOpen) return;
    const nextIdx = currentIndex + 1;
    if (nextIdx < totalSlides) {
      const img = new Image();
      img.src = GUIDE_IMAGES[nextIdx];
    }
  }, [isOpen, currentIndex, totalSlides]);

  // 모바일 터치 스와이프
  const handleTouchStart = (e) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e) => {
    if (touchStartX === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diffX = touchEndX - touchStartX;

    // 최소 45px 이상 스와이프 시 슬라이드 이동
    if (diffX > 45) {
      handlePrev();
    } else if (diffX < -45) {
      handleNext();
    }
    setTouchStartX(null);
  };

  if (!isOpen) return null;

  const isFirst = currentIndex === 0;
  const isLast = currentIndex === totalSlides - 1;

  return (
    <div
      className="guide-modal-overlay"
      onClick={handleCloseModal}
      role="dialog"
      aria-modal="true"
      aria-label="서비스 이용 가이드"
    >
      <div
        className="guide-modal-container"
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 모달 상단 헤더 */}
        <div className="guide-modal-header">
          <div className="guide-header-title-wrap">
            <span className="guide-beta-badge">Beta Guide</span>
            <h3 className="guide-header-title">서비스 이용 가이드</h3>
            <span className="guide-step-tag">
              {currentIndex + 1} / {totalSlides} · {GUIDE_TITLES[currentIndex]}
            </span>
          </div>

          <button
            type="button"
            className="guide-close-icon-btn"
            onClick={handleCloseModal}
            aria-label="가이드 닫기"
          >
            ✕
          </button>
        </div>

        {/* 메인 슬라이드 뷰포트 */}
        <div
          className="guide-slide-viewport"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* 이전 버튼 (<) */}
          <button
            type="button"
            className={`guide-nav-btn prev ${isFirst ? 'disabled' : ''}`}
            onClick={handlePrev}
            disabled={isFirst}
            aria-label="이전 가이드 보기"
            title="이전 (◀)"
          >
            ‹
          </button>

          {/* 슬라이드 이미지 */}
          <div className="guide-image-wrapper">
            <img
              key={currentIndex}
              src={GUIDE_IMAGES[currentIndex]}
              alt={`서비스 이용 가이드 ${currentIndex + 1}페이지 - ${GUIDE_TITLES[currentIndex]}`}
              className="guide-slide-image"
              loading="eager"
            />
          </div>

          {/* 다음 버튼 (>) */}
          <button
            type="button"
            className={`guide-nav-btn next ${isLast ? 'disabled' : ''}`}
            onClick={handleNext}
            disabled={isLast}
            aria-label="다음 가이드 보기"
            title="다음 (▶)"
          >
            ›
          </button>
        </div>

        {/* 인디케이터 닷 (Dots Pagination) */}
        <div className="guide-dots-indicator">
          {GUIDE_IMAGES.map((_, idx) => (
            <button
              key={idx}
              type="button"
              className={`guide-dot ${idx === currentIndex ? 'active' : ''}`}
              onClick={() => setCurrentIndex(idx)}
              aria-label={`가이드 ${idx + 1}페이지로 이동`}
              title={`${idx + 1}페이지: ${GUIDE_TITLES[idx]}`}
            />
          ))}
        </div>

        {/* 모달 하단 푸터 & 오늘 하루 보지 않기 체크박스 */}
        <div className="guide-modal-footer">
          <label className="guide-dismiss-today-label">
            <input
              type="checkbox"
              className="guide-dismiss-checkbox"
              checked={dontShowToday}
              onChange={(e) => setDontShowToday(e.target.checked)}
            />
            <span className="guide-dismiss-text">오늘 하루 보지 않기</span>
          </label>

          <div className="guide-footer-actions">
            {!isLast ? (
              <>
                <button
                  type="button"
                  className="guide-action-btn secondary"
                  onClick={handleCloseModal}
                >
                  닫기
                </button>
                <button
                  type="button"
                  className="guide-action-btn primary"
                  onClick={handleNext}
                >
                  다음 ›
                </button>
              </>
            ) : (
              <button
                type="button"
                className="guide-action-btn primary complete"
                onClick={handleCloseModal}
              >
                서재 시작하기 ✨
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
