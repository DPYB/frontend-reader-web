/**
 * 독서 시간 포맷팅 유틸리티 함수.
 *
 * 백엔드 정밀도 패치(PR #13)에 따라 durationSeconds(초 단위)를 우선 참조하여
 * 60초 미만은 초 단위(예: "13초"), 60초 이상은 분/초 단위로 포맷팅합니다.
 */

/**
 * 독서 시간(초 단위 우선)을 읽기 쉬운 한글 문자열로 변환합니다.
 *
 * @param {number|null|undefined} seconds - 독서 세션 초 단위 시간 (durationSeconds 또는 duration)
 * @param {number|null|undefined} [fallbackMinutes] - seconds가 없을 때 대체할 분 단위 시간
 * @returns {string} 예: "13초", "1분", "2분 15초"
 */
export function formatDuration(seconds, fallbackMinutes) {
  const sec = typeof seconds === 'number' && Number.isFinite(seconds) ? Math.max(0, Math.round(seconds)) : null;

  if (sec != null) {
    if (sec < 60) {
      return `${sec}초`;
    }
    const mins = Math.floor(sec / 60);
    const remainSecs = sec % 60;
    return remainSecs > 0 ? `${mins}분 ${remainSecs}초` : `${mins}분`;
  }

  // seconds가 없고 fallbackMinutes만 존재하는 경우
  if (typeof fallbackMinutes === 'number' && Number.isFinite(fallbackMinutes)) {
    const mins = Math.max(0, Math.round(fallbackMinutes));
    return mins > 0 ? `${mins}분` : '0초';
  }

  return '0초';
}

/**
 * 누적 독서 시간(분 단위)을 시간과 분으로 변환합니다.
 *
 * @param {number} totalMinutes - 누적 분 단위 시간
 * @returns {string} 예: "45분", "2시간 15분", "0분"
 */
export function formatTotalReadingTime(totalMinutes) {
  const mins = Math.max(0, Math.round(totalMinutes || 0));
  if (mins < 60) {
    return `${mins}분`;
  }
  const hours = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return remainMins > 0 ? `${hours}시간 ${remainMins}분` : `${hours}시간`;
}
