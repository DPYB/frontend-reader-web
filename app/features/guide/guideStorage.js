export const SERVICE_GUIDE_DISMISS_KEY = 'service_guide_dismissed_date';

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
