# HANDOFF 아카이브 (2026-10)

## 2026-10-23: BETA 설문조사 Google Sheets 연동 및 듀얼 파이프라인(디스코드+시트) 구축
- 작업 브랜치: `feat/survey-google-sheets-integration`
- **사용자 요청**:
  - BETA 피드백 설문조사 데이터를 나중에 GA4/대시보드 형태로 데이터 분석할 수 있도록 옵션 B(Google Sheets 연동) 구현 요청.
- **작업 내용**:
  1. `app/features/survey/googleSheetsSurvey.js` 신설:
     - `sendSurveyToGoogleSheets(type, form)`: Google Apps Script 웹 앱 엔드포인트 연동 (`VITE_GOOGLE_SHEETS_SURVEY_URL` 및 기본 URL 폴백).
     - Apps Script 302 리디렉션 및 브라우저 CORS 제약 회피를 위해 `mode: 'no-cors'`, `headers: { 'Content-Type': 'text/plain;charset=utf-8' }` 방식으로 안전하고 신속하게 스프레드시트에 행(Row) 누적 전송.
  2. `app/features/survey/BetaSurveyModal.jsx`:
     - `handleSubmitFirstVisit` 및 `handleSubmitReturning`에서 `Promise.allSettled`를 적용하여 Discord 실시간 알림 웹훅과 Google Sheets 데이터 저장을 병렬로 비동기 동시 전송.
     - 한쪽 네트워크 실패 시에도 상호 간섭 없이 안전한 전송 보장 및 UI 완료 처리.
  3. `.env.example`:
     - `VITE_GOOGLE_SHEETS_SURVEY_URL` 환경 변수 문서화.
  4. 하네스 문서(`.harness/STATE.md`, `.harness/HANDOFF.md`, `.harness/archive/HANDOFF_2026-09.md`) 갱신 및 5세션 상한 롤링 아카이빙 유지.
- **검증**:
  - `npm run check:harness` 통과 (HANDOFF, PLAN, STATE, DECISIONS, archive 정상)
  - `npm run lint` 통과 (0 errors, 0 warnings)
  - `npm run typecheck` 통과 (0 errors)
  - `npm run build` 통과 (Vite bundle 정상 빌드)
