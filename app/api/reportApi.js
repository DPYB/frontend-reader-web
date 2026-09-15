/**
 * AI Agent 월간 독서 리포트 API 클라이언트.
 *
 * 엔드포인트: GET /api/v1/reports/monthly?year=YYYY&month=M
 * AI Agent 백엔드가 통계, 독서 취향, 사서 피드백 및 다음 달 도서 처방 데이터를 분석하여 반환합니다.
 */

import { authFetch } from './authApi';

/**
 * 특정 연/월의 월간 독서 리포트를 조회합니다.
 *
 * @param {object} params
 * @param {number} params.year - 조회 연도 (예: 2026)
 * @param {number} params.month - 조회 월 (1~12)
 * @returns {Promise<object>} 월간 독서 리포트 데이터
 */
export async function fetchMonthlyReport({ year, month }) {
  return authFetch(`/reports/monthly?year=${encodeURIComponent(year)}&month=${encodeURIComponent(month)}`);
}
