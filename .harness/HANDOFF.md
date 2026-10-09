# HANDOFF (세션별 서술 로그, append-only)

## 2026-10-09: 로그인 페이지 소셜(카카오/구글) 로그인 버튼 UI 비활성화 및 DPYB 체험하기 호버 반짝임/선택 효과 적용
- 작업 브랜치: `feat/login-social-disabled-and-guest-hover-glow`
- **사용자 요청**:
  - 로그인 페이지에서 Kakao 로그인 및 Google 로그인 버튼 UI 적으로만 비활성화 처리.
  - DPYB 체험하기 버튼에 마우스 커서를 올렸을 때(Hover) 선택된 것처럼 반짝이는 인터랙션 효과 적용.
- **작업 내용**:
  1. `app/pages/LoginPage.jsx`:
     - `BUTTONS` 배열 내 `kakao` 및 `google` 툴팁을 `카카오 로그인 (준비 중)`, `Google 로그인 (준비 중)`으로 정돈.
     - `isButtonDisabled`: `kakao`, `google`을 비활성(`disabled = true`) 목록에 추가하여 클릭 인터랙션 차단.
     - `handleClick`: `case 'google'`, `case 'kakao'` 핸들러 분기 비활성화.
     - `LoginButton`: `isDpyb`(`btn.id === 'dpyb'`) 판별 및 호버 시 내부 쉬머 스윕(`.login-dpyb-sparkle-shine`)과 트윙클 별(`.login-dpyb-star`) 컴포넌트 렌더링.
  2. `app/pages/LoginPage.css`:
     - `.login-layer-img--dpyb-glow`: DPYB 체험하기 버튼 호버 시 웜 골드/앰버 글로우(`drop-shadow`) 및 펄스 호버 애니메이션(`dpyb-pulse-glow`) 적용.
     - `.login-hit-area--dpyb-hover`: 방사형 앰버 하이라이트 배경, 골드 네온 섀도우 및 스케일업(`transform: scale(1.025)`) 마이크로 인터랙션 구현.
     - `.login-dpyb-sparkle-shine` & `.login-dpyb-star`: 쉬머 스윕 광선 애니메이션(`@keyframes dpyb-shimmer-sweep`) 및 별빛 트윙클 애니메이션(`@keyframes dpyb-star-twinkle`) 구현.
     - `.login-hit-area--disabled .login-hit-tooltip`: 비활성 버튼 툴팁 디자인(준비 중 앰버 보더) 정비.
  3. 하네스 문서(`STATE.md`, `HANDOFF.md`, `HANDOFF_2026-09.md`) 갱신 및 5세션 상한 롤링 아카이빙 유지.
- **검증**:
  - `npm run check:harness` 통과 (HANDOFF, PLAN, STATE, DECISIONS, archive 정상)
  - `npm run lint` 통과 (0 errors, 0 warnings)
  - `npm run typecheck` 통과 (0 errors)
  - `npm run build` 통과 (Vite bundle 정상 빌드)

## 2026-10-09: 도서 등록 표지/바코드 촬영 OCR 파일 페이로드 바인딩 및 10/13자리 ISBN 인식 결함 해결
- 작업 브랜치: `fix/isbn-scan-file-payload-and-recognition`
- **사용자 요청**:
  - 도서 등록(`RegisterBook`) 화면에서 카메라 촬영 또는 이미지 업로드로 ISBN 인식 시도 시 "ISBN을 찾지 못했어요. 바코드 아래 13자리 숫자가 선명하게 보이도록 다시 찍어 주세요." 에러가 발생하며 정상적인 바코드/도서 사진임에도 인식이 되지 않는 결함 해결.
- **원인 분석**:
  1. **FormData 페이로드 바인딩 불일치**:
     - `RegisterBook.jsx`의 `handleFile`에서 `createOcrCover(file)`을 직접 `File` 객체로 호출했으나, `recordApi.js`의 `createOcrCover({ imageFile, modelId = null })`는 객체 구조분해 할당을 기대함.
     - `file` 객체에는 `imageFile` 속성이 존재하지 않아 `imageFile = undefined`로 평가되고, `form.append('image', undefined)`가 문자열 `"undefined"`를 전송함.
     - FastAPI 백엔드(`image: UploadFile = File(...)`)가 문자열을 수신하여 `422 Unprocessable Entity` (`Expected UploadFile, received: <class 'str'>`)를 반환하고, 프론트엔드가 이를 422 바코드 흐림 에러로 오인 표출.
  2. **ISBN-10 (2007년 이전 출판 도서) 미대응**:
     - 2007년 이전 출판 도서의 경우 바코드 텍스트나 하단 인쇄 문구에 10자리 ISBN(`ISBN 89-302-0063-X`)이 적혀있을 때, 프론트엔드 라인 파서가 13자리(`978/979`)만 필터링하여 유효한 ISBN을 놓칠 수 있는 구조.
- **작업 내용**:
  1. `app/api/recordApi.js`:
     - `createOcrCover`: `File`/`Blob` 인스턴스 직접 전달 및 `{ imageFile, modelId }` 객체 형태를 모두 지원하도록 유연화(`isFileLike` 분기)하고, 파일명(`filename`)을 명시하여 `FormData`에 온전한 멀티파트 파일 바이너리가 탑재되도록 수정.
     - `convertIsbn10To13`: 10자리 ISBN을 표준 13자리 ISBN(모듈로-10 가중치 체크섬 계산)으로 변환하는 유틸리티 구현.
     - `findIsbnInLines`: 1차 13자리 정규식 탐색 후, 2차 10자리 ISBN(`89-302-0063-X` 등) 발견 시 13자리로 자동 변환하여 서지 API 조회가 완벽히 연동되도록 보강.
  2. `app/pages/RegisterBook.jsx`:
     - `createOcrCover({ imageFile: file })`로 호출부 파라미터 구조 명시적 통일.
     - `describeCoverOcrError`: 에러 메시지 문구를 10자리/13자리 포괄 및 직접 입력 안내로 정돈.
  3. 하네스 문서(`STATE.md`, `HANDOFF.md`, `HANDOFF_2026-09.md`) 갱신 및 5세션 상한 롤링 아카이빙 유지.
- **검증**:
  - 사용자 실측 도서 이미지(`media_1791550411435.png`: `9788930200639` / `89-302-0063-X` - 논술프로그램세계명작 지킬 박사와 하이드) 백엔드 및 국립도서관 API 연동 200 OK 실측 검증 완료.
  - `npm run check:harness` 통과 (HANDOFF, PLAN, STATE, DECISIONS, archive 정상)
  - `npm run lint` 통과 (0 errors, 0 warnings)
  - `npm run typecheck` 통과 (0 errors)
  - `npm run build` 통과 (Vite bundle 정상 빌드)

## 2026-10-09: 로그인 페이지 이용 안내 팝업 모달 콘텐츠 전면 개편
- 작업 브랜치: `feat/login-welcome-notice-content-update`
- **사용자 요청**:
  - 로그인 페이지 접속 안내 팝업 창 내용을 전면 개편:
    - 타이틀: `Welcome to DPYB!`, `DPYB 이용 전 확인해주세요! 📚`
    - 1. `💻 PC 환경 권장`: `DPYB는 PC 환경에서 더욱 쾌적하게 이용하실 수 있어요.`
    - 2. `🧪 현재 테스트 운영 중`: `현재는 이메일을 통한 회원가입만 지원합니다.`
    - 3. `🐾 DPYB 체험하기`: `로그인 없이 채팅 기능을 체험해 보실 수 있어요.`
    - 4. `💌 문의 및 피드백`: 안내 문구 3줄 및 이메일(`dpyb26@gmail.com`) 연동
- **작업 내용**:
  1. `app/pages/LoginPage.jsx`:
     - 팝업 모달 헤더 구조 개선: `login-notice-welcome-tag`(`Welcome to DPYB!`) 및 `login-notice-title`(`DPYB 이용 전 확인해주세요! 📚`).
     - 4개 주요 안내 카드 구조화 (`login-notice-body`, `login-notice-item`):
       - PC 환경 권장 (💻)
       - 현재 테스트 운영 중 (🧪)
       - DPYB 체험하기 (🐾)
       - 문의 및 피드백 (💌) 안내 및 클릭 시 즉시 메일 앱이 연동되는 `mailto:dpyb26@gmail.com` 알약 링크 제공.
  2. `app/pages/LoginPage.css`:
     - 안내 항목 카드 디자인 정비: 아이콘 + 볼드 타이틀 수평 배치, 서브 설명 여백 및 가독성 확보.
     - 문의 및 피드백 전용 그라데이션 배경(`.login-notice-item--feedback`) 및 이메일 링크 버튼 호버 인터랙션 구현.
     - 반응형 모바일/소형 화면 뷰포트 최적화 (`max-height: min(90vh, 680px)` 및 부드러운 스크롤 지원).
  3. 하네스 문서(`STATE.md`, `HANDOFF.md`, `HANDOFF_2026-09.md`) 갱신 및 5세션 상한 롤링 아카이빙 유지.
- **검증**:
  - `npm run check:harness` 통과 (HANDOFF, PLAN, STATE, DECISIONS, archive 정상)
  - `npm run lint` 통과 (0 errors, 0 warnings)
  - `npm run typecheck` 통과 (0 errors)
  - `npm run build` 통과 (Vite bundle 정상 빌드)

## 2026-10-09: 회원가입 및 비밀번호 입력 필드 마스킹 불릿(•) 렌더링 글리프 누락 결함 수정
- 작업 브랜치: `fix/signup-password-masking-bullet-visibility`
- **사용자 요청**:
  - 회원가입(`SignupPage`) 및 비밀번호 재설정(`PasswordReset`) 입력란에서 비밀번호 보기 기능이 꺼져 있을 때(`type="password"`), 글자를 몇 자 입력했는지 마스킹 불릿 점(`•`)조차 보이지 않아 작성 중인지 인지하기 어려운 결함 해결.
- **원인 분석**:
  - `index.css` 전역에서 `button, input, textarea, select`에 `font-family: inherit` (`--sans`: `Chau Philomene One`, `Memoment Kkukkukk`)을 상속하도록 설정되어 있음.
  - 커스텀 폰트(`Chau Philomene One`, `Memoment Kkukkukk`)에는 브라우저 기본 비밀번호 마스킹 문자(불릿 `•` / `●`, U+2022) 글리프가 없거나 0-width로 렌더링되어, `type="password"` 상태에서 입력된 마스킹 문자가 화면상에 완전히 투명/공백으로 표시되는 현상 발생.
- **작업 내용**:
  1. `app/index.css`:
     - 전역 `input[type='password']`에 시스템 산세리프 폰트 스택(`-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans KR', sans-serif`) 및 `letter-spacing: 2px`을 적용하여 전역 모든 비밀번호 입력란에서 마스킹 불릿이 선명하게 렌더링되도록 보장.
  2. `app/pages/SignupPage.css`:
     - `.signup-field input[type='password']`, `.signup-pw-input-wrap input[type='password']`에 시스템 산세리프 폰트와 `letter-spacing: 2px`을 명시적으로 적용.
  3. 하네스 문서(`STATE.md`, `HANDOFF.md`, `HANDOFF_2026-09.md`) 갱신 및 5세션 상한 롤링 아카이빙 유지.
- **검증**:
  - `npm run check:harness` 통과 (HANDOFF, PLAN, STATE, DECISIONS, archive 정상)
  - `npm run lint` 통과 (0 errors, 0 warnings)
  - `npm run typecheck` 통과 (0 errors)
  - `npm run build` 통과 (Vite bundle 정상 빌드)

## 2026-10-09: 회원가입 버튼 활성화, 서비스 이용 가이드 슬라이드 줌인 및 모바일 채팅 FAB 5번째 메뉴 추가
- 작업 브랜치: `feat/signup-button-guide-zoom-and-mobile-fab-menu`
- **사용자 요청**:
  - 로그인 페이지(LoginPage) 회원가입 버튼 활성화 및 `/signup` 라우트 연동.
  - 서비스 이용 가이드 모달(ServiceGuideModal) 모바일/데스크톱 터치·클릭 슬라이드 줌인(확대/축소 및 내부 패닝) 기능 추가.
  - 모바일 채팅 플로팅 버튼(MobileChatFAB) 미니 메뉴 5번째 항목으로 '서비스 이용 가이드' 추가 및 연동.
- **작업 내용**:
  1. `app/pages/LoginPage.jsx`:
     - `BUTTONS` 배열 내 회원가입 툴팁을 `회원가입`으로 정돈 (BETA 비활성 문구 제거).
     - `handleClick`: `case 'signup': navigate('/signup'); break;` 활성화.
     - `isButtonDisabled`: 회원가입 버튼 disabled 예외 해제.
  2. `app/features/guide/ServiceGuideModal.jsx` & `ServiceGuideModal.css`:
     - `isZoomed` 상태 및 돋보기 배지(`.guide-zoom-badge`) 구현 (`터치하여 확대` ↔ `터치하여 축소`).
     - 이미지 래퍼(`.guide-image-wrapper`) 클릭/터치/키보드 줌인 토글 연동.
     - 줌인 상태(`.guide-image-wrapper.is-zoomed`): `overflow: auto`, `touch-action: pan-x pan-y`, `width: 220%` 적용으로 모바일 뷰포트에서도 슬라이드 내 모든 글씨와 화면을 선명하게 확대 및 상하좌우 부드러운 패닝 지원.
     - 줌 상태 중에는 슬라이드 넘김 스와이프를 억제하여 안전한 뷰포트 탐색 보장, 이전/다음/도트 이동 시 자동 줌 리셋.
  3. `app/features/room/chat/MobileChatFAB.jsx`:
     - `onOpenGuide` prop 연동 및 미니 팝업 5번째 메뉴로 `📖 서비스 이용 가이드` (`onOpenGuide()`) 추가.
  4. `app/features/room/LibrarianChat.jsx` & `LibraryScene.jsx`:
     - `LibraryScene`의 `setShowGuide(true)`를 `LibrarianChat` ➔ `MobileChatFAB`으로 관통 연결.
     - `LibrarianChat.css`의 `.lc-mobile-menu-popup`에 `max-height: min(340px, calc(100dvh - 120px))` 및 `overflow-y: auto`를 적용하여 5개 메뉴 쾌적한 스크롤 레이아웃 보장.
  5. 하네스 문서(`STATE.md`, `HANDOFF.md`, `HANDOFF_2026-09.md`) 갱신 및 5세션 상한 롤링 아카이빙 유지.
- **검증**:
  - `npm run check:harness` 통과 (HANDOFF, PLAN, STATE, DECISIONS, archive 정상)
  - `npm run lint` 통과 (0 errors, 0 warnings)
  - `npm run typecheck` 통과 (0 errors)
  - `npm run build` 통과 (Vite bundle 정상 빌드)
