# HANDOFF (세션별 서술 로그, append-only)

## 2026-10-11: 로그인 페이지 언어 변환 기능(한국어/영어) 및 언어 스위처 추가
- 작업 브랜치: `feat/login-language-switcher`
- **사용자 요청**:
  - 언어 변환 기능 추가 (한국어, 영어).
  - 한국어: default (기존 UI).
  - 영어: `public/login_eng` (WebP 변환 반영).
  - 언어 변환 버튼은 로그인 페이지에 배치하며 위치는 `public/lang_switcher` 좌표 참고.
- **작업 내용**:
  1. `public/login_eng.webp`:
     - 원본 영문 로그인 배경 PNG(5.8MB)를 2560x1440 RGB 고품질 WebP(Q90, 1.2MB, 약 79% 경량화)로 최적화 변환 및 원본 소스 정리.
  2. 좌표 추출 및 정밀 배치 (`LANG_SWITCHER_POS`):
     - `public/lang_switcher.png` 기준 바운딩 박스 `(1214, 232, 1405, 292)`를 2560x1440 비율 기반 퍼센트 좌표(`left: 47.42%`, `top: 16.11%`, `width: 7.46%`, `height: 4.17%`)로 변환.
     - 2560x1440 캔버스 스케일링 레이어(`.login-cover-layer`) 내부에 언어 전환 스위처 배치하여 해상도별 왜곡 없는 완벽 정렬 보장.
  3. `app/store/languageStore.js` & `app/store/LanguageProvider.jsx`:
     - 글로벌 언어 상태 관리(`LanguageContext`, `useLanguage`), `localStorage` 영속화(`dpyb.language`), 기본값 한국어(`ko`) 제공.
     - 최상단 `app/App.jsx`에 `<LanguageProvider>` 감싸기 적용.
  4. `app/pages/LoginPage.jsx` & `app/pages/LoginPage.css`:
     - 언어 스위처 UI(`한국어 | ENG`) 구현 및 활성 언어 강조/스위칭 인터랙션 적용.
     - 언어 선택에 따른 배경 이미지 동적 교체: 한국어(`login-bg.webp`) vs 영어(`login_eng.webp`).
     - 툴팁 다국어화(`tooltipKo`/`tooltipEn`), 입력창 플레이스홀더(`이메일`/`Email`, `비밀번호`/`Password`), 에러 메시지 및 공지 팝업 모달 영문화 지원.
  5. 하네스 문서(`STATE.md`, `HANDOFF.md`, `HANDOFF_2026-09.md`) 갱신 및 5세션 상한 롤링 아카이빙 유지.
- **검증**:
  - `npm run check:harness` 통과 (HANDOFF, PLAN, STATE, DECISIONS, archive 정상)
  - `npm run lint` 통과 (0 errors, 0 warnings)
  - `npm run typecheck` 통과 (0 errors)
  - `npm run build` 통과 (Vite bundle 정상 빌드)

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


