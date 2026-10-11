# HANDOFF (세션별 서술 로그, append-only)

## 2026-10-11: 도메인 초기 진입 로딩 대체 서비스 사용 가이드 우선 노출 및 로그인 팝업 연계
- 작업 브랜치: `feat/initial-service-guide-notice-flow`
- **사용자 요청**:
  - 도메인 접속 시 "불러오는 중이에요" 로딩 문구 대신 대기 시간이 지루하지 않도록 서비스 사용 가이드를 우선 띄우고, 사용자가 가이드를 닫으면 로그인 페이지 팝업창(PC 환경 권장/테스트 운영 중 안내)을 순차적으로 띄우도록 개선.
- **작업 내용**:
  1. `app/features/guide/guideStorage.js`:
     - 세션 스토리지 기반 `isGuideSeenInSession`, `markGuideSeenInSession` 유틸 추가로 동일 브라우징 세션 내 중복 모달 노출 방지.
  2. `app/features/guide/ServiceGuideModal.jsx`:
     - 가이드 모달 닫기(`handleCloseModal`) 시 `markGuideSeenInSession()` 자동 호출.
  3. `app/components/ProtectedRoute.jsx`:
     - `status === 'loading'` 단계에서 단순 텍스트("불러오는 중이에요...") 대신 미열람 상태인 경우 서비스 사용 가이드(`ServiceGuideModal`) 우선 표출.
     - 가이드 열람 중 백엔드 인증 확인이 비로그인으로 판별되어도 강제 리다이렉트 없이 가이드 열람을 지속 보장하고, 사용자가 닫았을 때 로그인 페이지로 안전하게 이동(`fromGuideClosed`).
     - 이미 열람한 경우 6프레임 냥이 순차 로딩 애니메이션(`LoadingSequence`) 표출로 대기 UX 개선.
  4. `app/pages/LoginPage.jsx`:
     - `ServiceGuideModal` 연동 및 `showGuide` 우선 표출 흐름 구축.
     - 사용자가 가이드를 닫았을 때(`handleCloseGuide`) 로그인 페이지 공지 팝업(`showPcNotice`)을 순차적으로 연계 활성화.
  5. `app/features/room/LibraryScene.jsx` & `app/App.jsx` & `app/pages/MyLibrary.jsx`:
     - 서재 진입 시 중복 가이드 팝업 방지(`!isGuideSeenInSession()`) 및 Suspense 폴백 텍스트를 `LoadingSequence` 애니메이션으로 통일.
  6. 하네스 문서(`STATE.md`, `HANDOFF.md`, `HANDOFF_2026-09.md`) 갱신 및 5세션 상한 롤링 아카이빙 유지.
- **검증**:
  - `npm run check:harness` 통과 (HANDOFF, PLAN, STATE, DECISIONS, archive 정상)
  - `npm run lint` 통과 (0 errors, 0 warnings)
  - `npm run typecheck` 통과 (0 errors)
  - `npm run build` 통과 (Vite bundle 정상 빌드)

## 2026-10-10: 블루(고양이) 서재 배경 이미지(readingroom_cat.webp) 교체 및 최적화
- 작업 브랜치: `feat/update-readingroom-cat-webp`
- **사용자 요청**:
  - `readingroom_cat` 블루 UI 이미지 파일 교체 반영 (WebP 변환 포함).
- **작업 내용**:
  1. `public/room/readingroom_cat.webp`:
     - 신규 제공된 원본 `readingroom_cat.png`(2560x1440, 6.1MB)를 3D 서재 표준 규격인 1920x1080 16:9 비율(Lanczos 리샘플링, RGB 고품질 WebP Q90)로 최적화 변환(557KB, 약 91% 용량 감축).
     - 원본 소스 PNG 정리 및 3D 서재 씬(`shelfLayout.js`의 `BG_SRC_CAT`)에서 최신 UI 배경이 즉시 노출되도록 반영.
  2. 하네스 문서(`STATE.md`, `HANDOFF.md`, `HANDOFF_2026-09.md`) 갱신 및 5세션 상한 롤링 아카이빙 유지.
- **검증**:
  - `npm run check:harness` 통과 (HANDOFF, PLAN, STATE, DECISIONS, archive 정상)
  - `npm run lint` 통과 (0 errors, 0 warnings)
  - `npm run typecheck` 통과 (0 errors)
  - `npm run build` 통과 (Vite bundle 정상 빌드)

## 2026-10-10: 로그인 페이지 회원가입 버튼 UI 비활성화
- 작업 브랜치: `feat/disable-signup-button-ui`
- **사용자 요청**:
  - 로그인 페이지에서 회원가입 버튼을 UI적으로 비활성화 처리.
- **작업 내용**:
  1. `app/pages/LoginPage.jsx`:
     - `BUTTONS` 배열 내 `signup` 버튼 툴팁을 `회원가입 (준비 중)`으로 변경.
     - `isButtonDisabled`: `signup`을 비활성 조건에 추가하여 `disabled` 상태 및 `cursor: not-allowed` 스타일 적용.
     - `handleClick`: `case 'signup'` 진입 시 `isButtonDisabled('signup')` 가드를 적용하여 클릭 이벤트 차단.
  2. 하네스 문서(`STATE.md`, `HANDOFF.md`, `HANDOFF_2026-09.md`) 갱신 및 5세션 상한 롤링 아카이빙 유지.
- **검증**:
  - `npm run check:harness` 통과 (HANDOFF, PLAN, STATE, DECISIONS, archive 정상)
  - `npm run lint` 통과 (0 errors, 0 warnings)
  - `npm run typecheck` 통과 (0 errors)
  - `npm run build` 통과 (Vite bundle 정상 빌드)

## 2026-10-10: 로그인 페이지 이용 안내 팝업 모달 문구 정돈 (테스트 운영 중 설명 교체 및 DPYB 체험하기 항목 제거)
- 작업 브랜치: `feat/update-login-notice-content`
- **사용자 요청**:
  - `🧪 현재 테스트 운영 중` 항목 설명을 "로그인 없이 DPYB 체험하기 버튼을 눌러 AI 사서와 자유롭게 대화해 보세요."로 교체.
  - `🐾 DPYB 체험하기` 항목 제거.
  - 나머지 항목(PC 환경 권장, 문의 및 피드백 등)은 그대로 유지.
- **작업 내용**:
  1. `app/pages/LoginPage.jsx`:
     - `🧪 현재 테스트 운영 중` 카드의 설명 문구를 `로그인 없이 DPYB 체험하기 버튼을 눌러` / `AI 사서와 자유롭게 대화해 보세요.`로 업데이트.
     - 중복 안내가 된 `🐾 DPYB 체험하기` 카드 항목 제거.
  2. 하네스 문서(`STATE.md`, `HANDOFF.md`, `HANDOFF_2026-09.md`) 갱신 및 5세션 상한 롤링 아카이빙 유지.
- **검증**:
  - `npm run check:harness` 통과 (HANDOFF, PLAN, STATE, DECISIONS, archive 정상)
  - `npm run lint` 통과 (0 errors, 0 warnings)
  - `npm run typecheck` 통과 (0 errors)
  - `npm run build` 통과 (Vite bundle 정상 빌드)

## 2026-10-10: 기본 도서('방구석 미술관') 수정 및 삭제 UI 비활성화 보호
- 작업 브랜치: `feat/protect-default-book-actions`
- **사용자 요청**:
  - `dpyb@gmail.com` 계정에 유일하게 등록된 '방구석 미술관' 도서만 수정 및 삭제 기능(UI 버튼 클릭 불가)을 비활성화.
  - 이 다음에 새롭게 추가되는 책들은 기존과 동일하게 수정 및 삭제가 가능하도록 유지.
- **작업 내용**:
  1. `app/features/room/BookDetail.jsx`:
     - `useAuth()`에서 `member` 정보를 연동하고, 사용자 이메일(`dpyb@gmail.com` / `dpyb26@gmail.com`) 및 도서명(`방구석 미술관`)을 기반으로 `isProtectedBook` 판별 플래그 산출.
     - `수정` 버튼: `isProtectedBook`일 때 `disabled`, `cursor: not-allowed`, 흐림(`opacity: 0.45`), 비활성 테두리/텍스트 스타일 및 툴팁(`기본 도서는 수정할 수 없습니다`) 적용.
     - `삭제` 버튼: `isProtectedBook`일 때 `disabled`, `cursor: not-allowed`, 흐림(`opacity: 0.45`), 비활성 테두리/텍스트 스타일 및 툴팁(`기본 도서는 삭제할 수 없습니다`) 적용.
     - `handleSave` 및 `handleDelete` 핸들러에 `isProtectedBook` 방어 가드 추가 및 삭제 모달(`confirmDelete`) 방어.
     - 신규 추가된 도서는 `isProtectedBook`이 `false`로 판별되어 정상적으로 수정 및 삭제 가능.
  2. 하네스 문서(`STATE.md`, `HANDOFF.md`, `HANDOFF_2026-09.md`) 갱신 및 5세션 상한 롤링 아카이빙 유지.
- **검증**:
  - `npm run check:harness` 통과 (HANDOFF, PLAN, STATE, DECISIONS, archive 정상)
  - `npm run lint` 통과 (0 errors, 0 warnings)
  - `npm run typecheck` 통과 (0 errors)
  - `npm run build` 통과 (Vite bundle 정상 빌드)
