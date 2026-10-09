# HANDOFF (세션별 서술 로그, append-only)

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

## 2026-10-09: 모바일 채팅 버튼 아바타 깜빡임 제거 및 미니 메뉴 좌측 정렬(오버플로 방지) 개선
- 작업 브랜치: `fix/mobile-chat-fab-image-and-menu-position`
- **사용자 요청**:
  - 모바일에서 채팅 FAB 버튼 클릭 시 아바타 이미지가 계속 바뀌며 깜빡이는 결함 수정.
  - 미니 퀵 액션 메뉴가 상단 우측으로 치우쳐져 화면 밖으로 넘어가던 문제를 좌측 정렬(뷰포트 안쪽으로 자연스럽게 전개)되도록 개선.
- **원인 분석**:
  1. **아바타 깜빡임**: `MobileChatFAB.jsx`에서 `isSpecialMotion && librarian.imageHover` 분기 처리로 인해, 사용자가 FAB 터치 시 `clickMotion`(500ms) 동안 `imageHover` 커서 gif/webp로 교체되었다가 다시 `profileImage`로 되돌아가는 깜빡임 발생.
  2. **메뉴 우측 치우침/오버플로**: `.lc-mobile-menu-popup`에 `right: 0` 또는 좌우 정렬 클래스가 누락되어 기본 `left: 0`으로 렌더링되면서 우측 하단 FAB에서 오른쪽 바깥으로 240px 메뉴가 튀어나가 화면에 잘리고 우측으로 치우침.
- **작업 내용**:
  1. `app/features/room/chat/MobileChatFAB.jsx`:
     - 원형 FAB 아바타 `src`를 `librarian.profileImage || librarian.image`로 고정하여 터치 시 이미지 전환 깜빡임 제거.
     - FAB 위치(`fabPos.x`)에 따라 화면 좌측/우측을 동적으로 판별하는 `menuAlignClass`(`align-left` / `align-right`) 적용.
  2. `app/features/room/LibrarianChat.css`:
     - `.lc-mobile-mini-menu`, `.lc-mobile-menu-popup`의 기본 정렬을 `right: 0`, `transform-origin: bottom right`로 설정하여 우측에 위치한 버튼 기준으로 메뉴가 좌측(화면 안쪽)으로 깔끔하게 펼쳐지도록 개선.
     - `.align-left`(`left: 0; right: auto`), `.align-right`(`right: 0; left: auto`) 클래스 매핑 완비.
  3. 하네스 문서(`STATE.md`, `HANDOFF.md`, `HANDOFF_2026-09.md`) 갱신 및 5세션 상한 롤링 아카이빙 유지.
- **검증**:
  - `npm run check:harness` 통과 (HANDOFF, PLAN, STATE, DECISIONS, archive 정상)
  - `npm run lint` 통과 (0 errors, 0 warnings)
  - `npm run typecheck` 통과 (0 errors)
  - `npm run build` 통과 (Vite bundle 정상 빌드)

## 2026-10-09: 로그인 페이지 접속 시 PC 환경 권장 이용 안내 팝업 모달 추가
- 작업 브랜치: `feat/login-pc-environment-notice-modal`
- **사용자 요청**:
  - 사이트 접속 시 로그인 페이지에서 "DPYB는 PC 환경에서 훨씬 쾌적하게 이용하실 수 있습니다." 문구를 담은 팝업 모달 노출.
- **작업 내용**:
  1. `app/pages/LoginPage.jsx`:
     - `showPcNotice` 상태 및 `localStorage` 기반 '오늘 하루 보지 않기'(`dpyb_pc_notice_dismissed`) 지원.
     - 키보드 ESC 키 및 백드롭 클릭 닫기 핸들러 연동.
     - PC 환경 권장 안내 팝업 모달 렌더링:
       - 헤드라인: 서비스 이용 안내 (💻 아이콘)
       - 강조 문구: `DPYB는 PC 환경에서 훨씬 쾌적하게 이용하실 수 있습니다.`
       - 상세 설명: 3D 인터랙티브 서재와 AI 사서 대화, 3단계 독서 토론 및 집중 타이머 등 DPYB의 모든 핵심 기능 최적화 안내
       - 액션: [오늘 하루 보지 않기] 체크박스 및 [확인] 버튼, 우측 상단 닫기(✕) 버튼.
  2. `app/pages/LoginPage.css`:
     - `.login-notice-backdrop`, `.login-notice-modal`, `.login-notice-highlight`, `.login-notice-confirm-btn` 등 DPYB 레트로 코지/글래스모피즘 스타일 및 반응형 모바일 뷰포트 레이아웃 구현 (`z-index: 100`).
  3. 하네스 문서(`STATE.md`, `HANDOFF.md`, `HANDOFF_2026-09.md`) 갱신 및 5세션 상한 롤링 아카이빙 유지.
- **검증**:
  - `npm run check:harness` 통과 (HANDOFF, PLAN, STATE, DECISIONS, archive 정상)
  - `npm run lint` 통과 (0 errors, 0 warnings)
  - `npm run typecheck` 통과 (0 errors)
  - `npm run build` 통과 (Vite bundle 정상 빌드)

## 2026-10-09: 대화창 기본 모드 내 서재(library) 지정 및 탭 모드 전환 롤백 결함 수정
- 작업 브랜치: `fix/default-library-mode-and-tab-switching`
- **사용자 요청**:
  - 채팅창 오픈 시 대화·추천 모드가 아닌 '내 서재' 모드가 default로 먼저 열리도록 변경.
  - 대화창 내에서 '내 서재', '대화·추천', '토론' 모드 탭 전환이 되지 않던 버그 해결.
- **원인 분석**:
  1. `LibrarianChat.jsx`의 세션 복원 `useEffect`가 `[librarian?.id, ..., onAnswer]`를 의존성으로 가지고 있어, 탭 클릭 시 `handleChangeMode` 내부의 `onAnswer(modeAnswers[mode])` 호출로 부모 `LibraryScene`이 리렌더링될 때마다 `useEffect`가 재실행되어 `setChatMode('chat')`로 강제 덮어쓰기(롤백)되던 문제 규명.
  2. `chatMode` 초기 상태가 `'chat'`으로 하드코딩되어 있던 문제.
- **작업 내용**:
  1. `app/features/room/LibrarianChat.jsx`:
     - `chatMode` 초기 상태를 `'library'`(내 서재 조회 모드)로 변경.
     - `prevLibrarianIdRef`, `prevUserIdRef`를 도입하여 실제 사서나 로그인 계정이 변경되었을 때만 세션 복원 및 기본 모드(`'library'`) 리셋이 수행되도록 방어.
     - 탭 전환(`handleChangeMode`) 시 `chatMode`가 안정적으로 유지되고 사용자 선택 모드로 즉각 전환되도록 보장.
  2. 하네스 문서(`STATE.md`, `HANDOFF.md`, `HANDOFF_2026-09.md`) 갱신 및 5세션 상한 롤링 아카이빙 유지.
- **검증**:
  - `npm run check:harness` 통과 (HANDOFF, PLAN, STATE, DECISIONS, archive 정상)
  - `npm run lint` 통과 (0 errors, 0 warnings)
  - `npm run typecheck` 통과 (0 errors)
  - `npm run build` 통과 (Vite bundle 정상 빌드)

## 2026-10-09: 모바일 채팅 FAB 미니 메뉴 백드롭 z-index 계층 분리 및 터치 인터랙션 정상화
- 작업 브랜치: `fix/mobile-chat-menu-backdrop-layering`
- **사용자 요청**:
  - 모바일에서 사서 채팅 FAB 버튼 클릭 시 미니 메뉴가 배경과 동일하게 블러 처리되고 메뉴 아이템 선택이 안 되는 결함 해결.
- **원인 분석**:
  1. `MobileChatFAB.jsx`에서 미니 메뉴 팝업 오픈 시 사용하는 백드롭 클래스가 대화 패널 전용 백드롭(`.lc-mobile-backdrop`, `z-index: 110`)으로 바인딩되어 있었음.
  2. 미니 메뉴 컨테이너(`.lc-mobile-fab-wrap`, `z-index: 85`/`90`)보다 백드롭(`z-index: 110`)이 더 높은 z-index로 렌더링되어 미니 메뉴 전체가 백드롭 블러(`backdrop-filter: blur(2px)`) 아래로 가려짐.
  3. 사용자가 메뉴 항목(사서와 대화하기, 타이머, 프로필, 테마 토글)을 터치할 때 최상위 백드롭(`z-index: 110`)이 탭 이벤트를 가로채 메뉴가 닫히기만 하고 항목 선택이 불가했음.
- **작업 내용**:
  1. `app/features/room/chat/MobileChatFAB.jsx`:
     - 미니 메뉴 전용 백드롭 클래스를 `lc-mobile-menu-backdrop` (`z-index: 84`)으로 정확히 분리.
     - 메뉴 오픈 시 `.lc-mobile-fab-wrap`에 `menu-open` 클래스를 부여하여 백드롭 상단으로 완벽 부상.
  2. `app/features/room/LibrarianChat.css`:
     - z-index 레이어링 재정립:
       - `.lc-mobile-menu-backdrop`: `z-index: 84` (3D 서재 및 일반 FAB 상단)
       - `.lc-mobile-fab-wrap.menu-open`: `z-index: 95` (메뉴 백드롭 상단)
       - `.lc-mobile-mini-menu`, `.lc-mobile-menu-popup`: `z-index: 100` (최상위 인터랙션)
     - `.lc-mobile-menu-item`에 `touch-action: manipulation`, `-webkit-tap-highlight-color: transparent`, `user-select: none` 적용하여 모바일 터치 반응성 보장.
     - 파일 하단에 중복 선언되어 있던 레거시 `.lc-mobile-fab-wrap`, `.lc-mobile-menu-popup` CSS 블록 정리.
  3. 하네스 문서(`STATE.md`, `HANDOFF.md`, `HANDOFF_2026-09.md`) 갱신 및 5세션 상한 롤링 아카이빙 유지.
- **검증**:
  - `npm run check:harness` 통과 (HANDOFF, PLAN, STATE, DECISIONS, archive 정상)
  - `npm run lint` 통과 (0 errors, 0 warnings)
  - `npm run typecheck` 통과 (0 errors)
  - `npm run build` 통과 (Vite bundle 정상 빌드)
