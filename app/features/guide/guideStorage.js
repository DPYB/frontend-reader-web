export const SERVICE_GUIDE_DISMISS_KEY = 'service_guide_dismissed_date';
export const SERVICE_GUIDE_SESSION_SEEN_KEY = 'service_guide_session_seen';

/**
 * 오늘 하루 보지 않기 설정 여부 확인
 * @returns {boolean} true: 오늘 아직 보지 않아서 표시해야 함, false: 오늘 하루 보지 않기 처리됨
 */
export function shouldShowGuideModal() {
  try {
    const dismissedDate = localStorage.getItem(SERVICE_GUIDE_DISMISS_KEY);
    if (!dismissedDate) return true;
    const todayStr = new Date().toDateString();
    return dismissedDate !== todayStr;
  } catch {
    return true;
  }
}

/**
 * 오늘 하루 보지 않기 저장
 */
export function dismissGuideForToday() {
  try {
    const todayStr = new Date().toDateString();
    localStorage.setItem(SERVICE_GUIDE_DISMISS_KEY, todayStr);
  } catch {
    // ignore
  }
}

/**
 * 이번 세션(탭 세션)에서 가이드 모달을 이미 보았는지 확인
 */
export function isGuideSeenInSession() {
  try {
    return sessionStorage.getItem(SERVICE_GUIDE_SESSION_SEEN_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * 이번 세션(탭 세션)에서 가이드 모달 확인 완료 표시
 */
export function markGuideSeenInSession() {
  try {
    sessionStorage.setItem(SERVICE_GUIDE_SESSION_SEEN_KEY, 'true');
  } catch {
    // ignore
  }
}

