# HANDOFF (세션별 서술 로그, append-only)

## 2026-10-25: 로그아웃 클라이언트 상태 무조건 리셋 및 로그인 페이지 전체 리로드 전환
- 작업 브랜치: `feat/fix-logout-client-state-reset`
- **사용자 요청**:
  - 로그아웃 버튼을 눌렀을 때 화면이 바로 로그인 화면으로 전환되지 않고 새로고침해야 풀리는 현상 및 새로고침 시 /auth/refresh 401 에러가 발생하는 문제 해결.
- **원인 분석**:
  - 백엔드 `POST /api/v1/auth/logout`은 정상적으로 `refresh_token` 쿠키를 삭제하고 204를 반환하고 있었으나,
  - `AuthProvider.jsx`의 `logout()` 함수가 `apiLogout()` 호출 시 `try ... finally` 방어 없이 작성되어 있어 서버 통신 지연/예외 발생 시 클라이언트 메모리 상태(`member`, `role`, `status`) 초기화가 누락될 수 있었음.
  - 또한 `Gnb.jsx`와 `MyPage.jsx`에서 로그아웃 후 단순 SPA 내부 라우팅(`navigate('/login')`)을 수행하여, 복잡한 React Context(도서/사서/채팅) 및 Three.js 3D 씬 인메모리 캐시가 완전히 비워지지 않은 채 화면에 잔류하는 결함이 발생. 사용자가 의아해하며 F5(새로고침)를 누르자 방금 쿠키가 삭제된 상태에서 `/auth/refresh`를 호출해 401이 발생한 것.
- **작업 내용**:
  1. `app/store/AuthProvider.jsx`:
     - `logout()` 내부를 `try ... finally`로 전면 개편: 서버 로그아웃 API 성공/실패와 무관하게 `clearAccessToken()`, `clearChatSession()`, `setMember(null)`, `setRole(null)`, `setStatus('unauthenticated')`를 100% 즉시 동기 초기화.
  2. `app/components/Gnb.jsx`:
     - `handleLogout` 완료 시 `window.location.href = '/login'`으로 전환하여 브라우저의 모든 Context/메모리/3D 캐시를 클린 리셋하고 로그인 화면으로 즉시 전환.
  3. `app/pages/MyPage.jsx`:
     - `handleLogout` 완료 시 `window.location.href = '/login'`으로 전환 및 미사용 `useNavigate` import/변수 정리.
  4. 하네스 문서(`.harness/STATE.md`, `.harness/HANDOFF.md`, `.harness/archive/HANDOFF_2026-09.md`) 갱신 및 5세션 상한 롤링 아카이빙 유지.
- **검증**:
  - `npm run check:harness` 통과 (HANDOFF, PLAN, STATE, DECISIONS, archive 정상)
  - `npm run lint` 통과 (0 errors, 0 warnings)
  - `npm run typecheck` 통과 (0 errors)
  - `npm run build` 통과 (Vite bundle 정상 빌드)

## 2026-10-25: 회원가입 폼 비밀번호 유효성 검사 실시간 인라인 에러/성공 피드백 및 성별 기본값 정비
- 작업 브랜치: `feat/signup-validation-feedback`
- **사용자 요청**:
  - 회원가입 화면에서 비밀번호 복잡도 조건(8자 이상, 영문 대/소문자, 숫자, 특수문자) 미충족 시 어떤 조건이 빠졌는지 실시간으로 명확히 안내 문구를 띄워주고 버튼 비활성화 원인을 바로 알 수 있도록 개선.
- **원인 및 배경**:
  - 회원가입 페이지(`SignupPage.jsx`)의 비밀번호 정규식(`PW_RE`)은 영문 대문자(`A-Z`)를 필수로 요구하고 있었으나, 플레이스홀더에는 `"8자 이상 영문+숫자+특수문자"`로만 표기되어 사용자가 소문자만 입력하는 경우가 다수 발생.
  - 대문자 등 복잡도 조건이 누락되었을 때 시각적 인라인 에러 문구(`signup-error`)가 일체 표시되지 않아 사용자는 폼을 다 채웠는데도 '가입하기' 버튼이 `disabled`(🚫 커서) 상태로 멈추는 심각한 UX 마찰을 겪음.
  - 성별(`gender`) 라디오 버튼 역시 미선택 시 버튼이 잠기지만 기본값이 빈 문자열(`''`)로 설정되어 있어 미선택 누락 위험이 컸음.
- **작업 내용**:
  1. `app/pages/SignupPage.jsx`:
     - `getPasswordErrorMessage(pw)` 헬퍼 함수 신설: 8자 미만, 영문 대문자 누락, 영문 소문자 누락, 숫자 누락, 특수문자 누락 조건을 순차 검사하여 미충족된 규칙을 1초 만에 알 수 있는 친절한 한국어 에러 메시지 반환.
     - 비밀번호 인풋 플레이스홀더를 `"8자 이상 영문 대/소문자+숫자+특수문자"`로 명확히 수정.
     - 비밀번호 인풋 하단에 실시간 피드백 렌더링: 미충족 시 빨간색 에러 문구(`.signup-error`), 통과 시 초록색 성공 문구(`.signup-success`, "사용 가능한 안전한 비밀번호입니다.") 즉시 노출.
     - `form.gender` 기본값을 `'선택 안 함'`으로 설정하여 성별 미선택으로 인한 버튼 비활성화 방지.
  2. 하네스 문서(`.harness/STATE.md`, `.harness/HANDOFF.md`, `.harness/archive/HANDOFF_2026-09.md`) 갱신 및 5세션 상한 롤링 아카이빙 유지.
- **검증**:
  - `npm run check:harness` 통과 (HANDOFF, PLAN, STATE, DECISIONS, archive 정상)
  - `npm run lint` 통과 (0 errors, 0 warnings)
  - `npm run typecheck` 통과 (0 errors)
  - `npm run build` 통과 (Vite bundle 정상 빌드)

## 2026-10-24: PC(데스크톱) 내 서재 이용가이드 플로팅 버튼 추가 (타이머 위)
- 작업 브랜치: `feat/pc-guide-button-above-timer`
- **사용자 요청**:
  - PC로 접속해도 이용가이드가 보이게 해줘. 위치는 타이머 위에 두면 될 것 같아.
- **원인 및 배경**:
  - 모바일 UX에서는 사서 플로팅 FAB 미니 메뉴 내에 '서비스 이용 가이드'가 상시 포함되어 있어 언제든 모달을 열 수 있었으나, 데스크톱 환경에서는 최초 방문 시 1회 노출 후 닫히면 다시 열 수 있는 진입점이 없었음.
- **작업 내용**:
  1. `app/features/room/LibraryScene.jsx`:
     - 데스크톱(`!calibrating && !isMobile`) 환경에서 독서 타이머 버튼 바로 위(`bottom: min(136px, calc(2vh + 120px))`, `right: min(16px, 2vw)`)에 서비스 이용 가이드 플로팅 버튼(`.lc-guide-toggle-btn`) 배치.
     - 클릭 시 `setShowGuide(true)`를 호출하여 `ServiceGuideModal` 오픈 연동.
     - `t('library.serviceGuideOpen', '서비스 이용 가이드 열기')` 툴팁 및 `t('library.serviceGuide', '이용 가이드')` 라벨 적용.
  2. `app/features/room/LibrarianChat.css`:
     - `.lc-chat-toggle-btn`, `.lc-timer-toggle-btn` 스타일 그룹에 `.lc-guide-toggle-btn` 셀렉터를 추가하여 고불투명도 글래스모피즘, 다크모드, 호버/액티브 애니메이션 일관성 완비.
  3. `app/i18n/translations.js`:
     - 한국어(`ko.library`): `serviceGuide: '이용 가이드'`, `serviceGuideOpen: '서비스 이용 가이드 열기'` 추가.
     - 영어(`en.library`): `serviceGuide: 'User Guide'`, `serviceGuideOpen: 'Open Service User Guide'` 추가.
  4. 하네스 문서(`.harness/STATE.md`, `.harness/HANDOFF.md`, `.harness/archive/HANDOFF_2026-09.md`) 갱신 및 5세션 상한 롤링 아카이빙 유지.
- **검증**:
  - `npm run check:harness` 통과 (HANDOFF, PLAN, STATE, DECISIONS, archive 정상)
  - `npm run lint` 통과 (0 errors, 0 warnings)
  - `npm run typecheck` 통과 (0 errors)
  - `npm run build` 통과 (Vite bundle 정상 빌드)

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
