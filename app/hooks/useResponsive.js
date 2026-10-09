import { useState, useEffect } from 'react';

/**
 * 디스플레이 규격 및 터치 환경 통합 반응형 훅 (useResponsive)
 * 
 * [UX 가이드라인]
 * - Desktop/Laptop (마우스/키보드 환경, 1025px+): 데스크톱 3D 서재 조작, 사서 커서, 다열 모달
 * - Mobile & Tablet (터치 디바이스 또는 1024px 이하): 스마트폰 ~ 12.9" 대형 태블릿 통합 UX
 *   (선반 셀렉터 + 바텀시트, 플로팅 사서 FAB, 1열 수직 스크롤 폼)
 */
export function useResponsive() {
  const getDeviceState = () => {
    if (typeof window === 'undefined') {
      return {
        isMobile: false,
        isTablet: false,
        isTouch: false,
        isDesktop: true,
        isUnifiedMobileUX: false,
      };
    }

    const width = window.innerWidth;
    const isTouch = 
      ('ontouchstart' in window) || 
      (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0) || 
      (typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches);

    const isMobileWidth = width <= 768;
    const isTabletWidth = width > 768 && width <= 1280;

    // 노트북/데스크톱 마우스 접속이 아닌 경우(스마트폰 + 태블릿 1366px 이하 터치 기기 포함) 통합 UX 적용
    const isUnifiedMobileUX = isMobileWidth || (isTouch && width <= 1366) || width <= 1024;

    return {
      isMobile: isMobileWidth,
      isTablet: isTabletWidth,
      isTouch,
      isDesktop: !isUnifiedMobileUX,
      isUnifiedMobileUX, // 모바일 & 태블릿 통합 레이아웃 제어 플래그
    };
  };

  const [deviceState, setDeviceState] = useState(getDeviceState);

  useEffect(() => {
    const handleResize = () => {
      setDeviceState(getDeviceState());
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return deviceState;
}

export default useResponsive;
