import { useState, useCallback } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../store/authStore';
import ServiceGuideModal from '../features/guide/ServiceGuideModal';
import { shouldShowGuideModal, isGuideSeenInSession } from '../features/guide/guideStorage';
import LoadingSequence from './LoadingSequence';

/**
 * ProtectedRoute — 로그인이 필요한 화면을 감싸는 가드.
 *
 * - status 'loading'(세션 복원 중): 서비스 이용 가이드 모달(미열람 시) 또는 LoadingSequence 표시
 * - 'unauthenticated': /login으로 이동하며, 로그인 후 원래 위치로 돌아오도록 from 전달
 * - 'authenticated': children 렌더
 */
export default function ProtectedRoute({ children }) {
  const { status } = useAuth();
  const location = useLocation();
  const [showGuide, setShowGuide] = useState(() => shouldShowGuideModal() && !isGuideSeenInSession());

  const handleCloseGuide = useCallback(() => {
    setShowGuide(false);
  }, []);

  // 도메인 접속 시 사용자가 대기 시간을 지루해하지 않도록 서비스 사용 가이드 우선 표출
  if (showGuide) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-main, #121212)' }}>
        <ServiceGuideModal
          isOpen={true}
          onClose={handleCloseGuide}
        />
      </div>
    );
  }

  if (status === 'loading') {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-main, #121212)',
        }}
      >
        <LoadingSequence size={120} label="서재로 들어가는 중이에요... 🐾" padding={40} />
      </div>
    );
  }

  if (status !== 'authenticated') {
    return <Navigate to="/login" replace state={{ from: location.pathname, fromGuideClosed: true }} />;
  }

  return children;
}
