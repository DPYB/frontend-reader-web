# HANDOFF (세션별 서술 로그, append-only)

## 2026-10-23: 3D 책장 선반(Shelf Placement) 배치 영속화 API 연동
- 작업 브랜치: `feat/shelf-placements-persistence`
- **사용자 요청**:
  - 선반 단(0, 1, 2단) 및 좌우 순서 드래그 앤 드롭 배치가 localStorage에만 보관되어 새로고침/기기 변경 시 풀리는 문제를 해결하기 위해, 백엔드 DB(shelf_tier, shelf_order) 일괄 업데이트 API(`PUT /api/v1/library/books/shelf-placements`) 연동 및 복원 로직 구현.
- **작업 내용**:
  1. `app/api/bookApi.js`:
     - `updateShelfPlacements(assignments, librarianType)` 함수 구현: 선반별 도서 ID 목록(`{ "0": [id1, id2], "1": [id3] }`)과 사서 타입을 백엔드 `PUT /api/v1/library/books/shelf-placements`로 전송.
  2. `app/store/BooksProvider.jsx`:
     - `toFrontBook` 모델 변환 시 백엔드 응답의 `shelfTier` 및 `shelfOrder` 필드를 프론트 도서 모델에 보존.
  3. `app/features/room/LibraryScene.jsx`:
     - `handleGlobalPointerUp` 드래그 앤 드롭 종료 시 `saveShelfAssignments`(로컬스토리지) 직후 `updateShelfPlacements(newAssignments, librarianId)`를 호출하여 백엔드 DB에 영속화. 게스트 모드(`isGuest`) 예외 가드 및 에러 안전 처리.
     - `useEffect` 의존성 배열에 `isGuest` 추가하여 React Hook Lint 규칙 준수.
  4. `app/features/room/shelfBookStorage.js`:
     - `reconcileShelfGroups`: 로컬스토리지에 저장된 배치가 없을 때(!savedAssignments), 도서 자체의 `shelfTier`와 `shelfOrder`를 기반으로 선반 그룹을 복원하고 선반별 용량(capacity)을 고려하여 자동 배치되도록 개선.
  5. 하네스 문서(`.harness/STATE.md`, `.harness/HANDOFF.md`, `.harness/archive/HANDOFF_2026-09.md`) 갱신 및 5세션 상한 롤링 아카이빙 유지.
- **검증**:
  - `npm run check:harness` 통과 (HANDOFF, PLAN, STATE, DECISIONS, archive 정상)
  - `npm run lint` 통과 (0 errors, 0 warnings)
  - `npm run typecheck` 통과 (0 errors)
  - `npm run build` 통과 (Vite bundle 정상 빌드)

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

## 2026-10-23: BETA 설문조사 제출 후 폼 상태 초기화(리셋) 처리
- 작업 브랜치: `fix/beta-survey-reset-on-submit`
- **사용자 요청**:
  - 설문 제출 후에 다시 설문지로 들어가면 이전에 작성한 내용이 그대로 남아있는데, 제출 후에는 작성 내용이 리셋되도록 개선.
- **원인 분석**:
  - `BetaSurveyModal.jsx` 컴포넌트 내부에서 `firstForm`과 `returningForm`의 초기 객체가 `useState` 내 인라인 객체로만 관리되고 있었음.
  - 설문 제출 성공 시(`handleSubmitFirstVisit`, `handleSubmitReturning`) 완료 화면(`step === 'completed'`)으로 단계만 전환하고 폼 상태를 초기화하지 않았으며, 모달 닫힘(`!isOpen`) 처리 시에도 `setStep('select')`만 호출하고 폼 상태는 보존되어 모달 재진입 시 이전 작성 데이터가 그대로 노출됨.
- **작업 내용**:
  1. `app/features/survey/BetaSurveyModal.jsx`:
     - 컴포넌트 외부에 `INITIAL_FIRST_FORM`, `INITIAL_RETURNING_FORM` 표준 초기 상태 상수 정의.
     - 폼 상태 리셋 헬퍼 함수 `resetForms()` 구현.
     - `handleSubmitFirstVisit` 및 `handleSubmitReturning`: 디스코드 웹훅 전송 및 로컬 저장 성공 후, `setFirstForm(INITIAL_FIRST_FORM)` / `setReturningForm(INITIAL_RETURNING_FORM)`을 즉시 호출하여 작성 내용 리셋.
     - 모달 닫힘(`!isOpen`) `useEffect` 핸들러: 모달 닫힘 애니메이션 타이머(300ms) 완료 시 `setStep('select')`와 함께 `resetForms()`를 실행하여 재진입 시 항상 깨끗한 빈 설문지로 시작되도록 보장.
  2. 하네스 문서(`.harness/STATE.md`, `.harness/HANDOFF.md`, `.harness/archive/HANDOFF_2026-09.md`) 갱신 및 5세션 상한 롤링 아카이빙 유지.
- **검증**:
  - `npm run check:harness` 통과 (HANDOFF, PLAN, STATE, DECISIONS, archive 정상)
  - `npm run lint` 통과 (0 errors, 0 warnings)
  - `npm run typecheck` 통과 (0 errors)
  - `npm run build` 통과 (Vite bundle 정상 빌드)

## 2026-10-23: 독서 리포트 날짜 선택기 UI 개선(주간 시작일 지정) 및 BETA 설문 버그 수정
- 작업 브랜치: `feat/report-date-picker-and-survey-fixes`
- **사용자 요청**:
  1. 주간 월간 선택 버튼을 날짜 왼쪽에 배치하고, 주간 선택 시 시작 날짜(7일 자동 계산)를 설정할 수 있도록 변경.
  2. 첫방문 설문: '처음 사용하면서 헷갈리거나 막막했던 부분이 있었나요?' 질문 예시에 '사용해보려고 했지만 잘 안되는 것이 있는지'도 함께 안내.
  3. 재방문 설문: '오늘의 만족도는 어느 정도인가요?'에서 1보다 높은 점수를 선택할 때 하위 점수들이 같이 선택되는 버그 수정.
- **작업 내용**:
  1. `app/pages/MonthlyReport.jsx` & `MonthlyReport.css`:
     - 상단 헤더 타이틀 영역에 있던 주간/월간 세그먼트 토글 버튼(`.report-period-toggle`)을 우측 컨트롤 영역(`.report-actions`) 내 날짜 선택기 바로 왼쪽으로 이동.
     - 주간 리포트 선택 시 고정 주차 드롭다운 대신 날짜 피커(`<input type="date" />`)를 제공하여 사용자가 원하는 주간 시작일을 직관적으로 선택할 수 있도록 구현.
     - 시작일 선택 시 시작일로부터 6일 뒤(`startDate + 6일 = 총 7일`)를 종료일로 자동 계산하여 `~ YYYY-MM-DD (7일간)` 배지 실시간 표시.
     - `calculateWeekRange(startIsoStr)` 헬퍼 함수를 통해 주간 리포트 API 페이로드 규격에 맞춰 `fetchWeeklyReport(selectedWeek)` 비동기 조회 자동 갱신.
     - 기본 주간 시작일을 오늘 기준 최근 7일치(`new Date() - 6일`)로 자동 설정하고 `min="2026-09-01"`, `max={todayIso}` 경계 보호.
     - `.report-weekly-picker`, `.report-picker-label`, `.report-date-input`, `.report-range-badge` 반응형 및 테마 스타일링 적용, 인쇄 시 비인쇄 숨김 처리.
  2. `app/features/survey/BetaSurveyModal.jsx`:
     - 첫방문 설문 Q8(`confusingPart`) textarea의 placeholder 예시에 `사용해보려고 했지만 잘 안되는 기능 등` 문구 보강.
     - 재방문 설문 Q11(`overallSatisfaction`) 만족도 버튼 렌더링 시 기존 범위 판별 조건(`>= score`)을 단일 일치 조건(`=== score`)으로 수정하여 하위 점수 동시 선택 버그 완벽 해결.
  3. 하네스 문서(`.harness/STATE.md`, `.harness/HANDOFF.md`, `.harness/archive/HANDOFF_2026-09.md`) 갱신 및 5세션 상한 롤링 아카이빙 유지.
- **검증**:
  - `npm run check:harness` 통과 (HANDOFF, PLAN, STATE, DECISIONS, archive 정상)
  - `npm run lint` 통과 (0 errors, 0 warnings)
  - `npm run typecheck` 통과 (0 errors)
  - `npm run build` 통과 (Vite bundle 정상 빌드)

## 2026-10-23: BETA 설문조사 첫방문 기기/브라우저 선택 추가, 기기 구체적 모델 입력란 및 가입 불편 보기 정돈
- 작업 브랜치: `feat/beta-survey-device-and-options-update`
- **사용자 요청**:
  - 첫 방문 설문조사에서 재방문과 동일하게 기기, 브라우저 선택하는 항목 추가.
  - 첫방문, 재방문 둘 다 기기 선택 시 구체적인 기기 종류 (예: 아이폰 17, 아이패드 프로 등)를 적을 수 있는 입력란 제공.
  - '가입 및 시작 과정에서 막히거나 불편했던 점이 있었나요?' 질문에 대한 보기로 3, 4, 5번만 유지.
  - '다음 단계 안내 부족' 선택 시 구체적으로 적을 수 있는 입력란 생성.
- **작업 내용**:
  1. `app/features/survey/BetaSurveyModal.jsx`:
     - `SIGNUP_DIFFICULTY_OPTIONS` 배열에서 불필요한 1, 2번 보기를 제거하고 '다음 단계 안내 부족', '불편 없음', '기타' 3가지 보기만 유지.
     - `firstForm` 상태에 `device`, `deviceDetail`, `browser`, `browserOther`, `signupDifficultyDetail` 필드 추가.
     - `returningForm` 상태에 `deviceDetail` 필드 추가.
     - 첫방문 설문지에 재방문과 동일한 '어떤 기기와 브라우저로 사용하셨나요?' 섹션을 Q1으로 배치하고, 기기 선택 시 구체적인 모델명(예: 아이폰 17, 아이패드 프로 등)을 입력할 수 있는 텍스트 인풋 연동.
     - 재방문 설문지의 기기 선택 시에도 동일하게 구체적인 기기 종류를 입력할 수 있는 인풋 연동.
     - 첫방문 설문지 Q4(가입 및 시작 과정 불편점)에서 '다음 단계 안내 부족' 선택 시 구체적으로 적을 수 있는 입력란(`signupDifficultyDetail`) 동적 렌더링.
     - 첫방문 설문 질문 번호(Q1~Q9) 체계적 재정렬.
  2. `app/features/survey/discordSurveyWebhook.js`:
     - `buildFirstVisitDiscordPayload`: `💻 이용 환경` 필드(기기, 구체적 모델명, 브라우저) 추가 및 '다음 단계 안내 부족' 구체적 내용 반영.
     - `buildReturningDiscordPayload`: `💻 이용 환경` 필드에 기기 구체적 모델명(`deviceDetail`) 병기 반영.
  3. 하네스 문서(`.harness/STATE.md`, `.harness/HANDOFF.md`, `.harness/archive/HANDOFF_2026-09.md`) 갱신 및 5세션 상한 롤링 아카이빙 유지.
- **검증**:
  - `npm run check:harness` 통과 (HANDOFF, PLAN, STATE, DECISIONS, archive 정상)
  - `npm run lint` 통과 (0 errors, 0 warnings)
  - `npm run typecheck` 통과 (0 errors)
  - `npm run build` 통과 (Vite bundle 정상 빌드)




