/**
 * DPYB BETA 설문조사 Google Sheets 연동 서비스
 *
 * - Google Apps Script 웹 앱 엔드포인트로 첫 방문 / 재방문 설문 데이터를 전송합니다.
 * - 스프레드시트의 '첫방문_설문', '재방문_설문' 시트에 행(Row)으로 자동 누적됩니다.
 */

const DEFAULT_SHEETS_URL =
  'https://script.google.com/macros/s/AKfycbxIynDhthoEn6FAr27_E929v3wL0dqQqUkdcHbhLpXrzxP6vppTSNCyItHpD2mQb4s-/exec';

const GOOGLE_SHEETS_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GOOGLE_SHEETS_SURVEY_URL) || DEFAULT_SHEETS_URL;

/**
 * 설문 응답을 Google Sheets 웹 앱 엔드포인트로 전송
 *
 * @param {'first_visit' | 'returning'} type - 설문 유형 ('first_visit' | 'returning')
 * @param {object} form - 설문 폼 데이터
 * @returns {Promise<boolean>}
 */
export async function sendSurveyToGoogleSheets(type, form) {
  if (!GOOGLE_SHEETS_URL) {
    console.warn('[GoogleSheetsSurvey] 구글 스프레드시트 웹 앱 URL이 설정되지 않았습니다.');
    return false;
  }

  const payload = {
    type,
    submittedAt: new Date().toISOString(),
    responses: form,
  };

  try {
    // Google Apps Script 웹 앱의 302 리디렉션 및 브라우저 CORS 제약을 회피하기 위해
    // mode: 'no-cors' 및 text/plain;charset=utf-8 로 전송합니다.
    await fetch(GOOGLE_SHEETS_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
    });
    return true;
  } catch (err) {
    console.error('[GoogleSheetsSurvey] 구글 스프레드시트 전송 실패:', err);
    return false;
  }
}
