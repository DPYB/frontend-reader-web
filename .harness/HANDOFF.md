# HANDOFF (세션별 서술 로그, append-only)

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

## 2026-10-09: 서비스 이용 가이드 모달 슬라이드 타이틀 및 내용 정합성 보정
- 작업 브랜치: `fix/service-guide-slide-descriptions`
- **사용자 요청**:
  - 로그인 후 노출되는 서비스 이용 가이드 팝업에서 슬라이드 이미지와 상단 설명 타이틀 불일치 수정:
    - 2/6: 도서 등록
    - 3/6: 도서 상세 및 관리
    - 6/6: 사서와의 대화 & 추천
- **원인 분석**:
  - `ServiceGuideModal.jsx` 내 `GUIDE_TITLES` 배열 인덱스가 실제 슬라이드 이미지(`/guide/0.png` ~ `/guide/5.png`)의 챕터 순서와 어긋나 있어 2/6 슬라이드에 '사서와의 대화 & 추천', 3/6 슬라이드에 '도서 등록 및 관리', 6/6 슬라이드에 '마이페이지 & 독서 캘린더'가 표시되던 문제.
- **작업 내용**:
  1. `app/features/guide/ServiceGuideModal.jsx`:
     - `GUIDE_TITLES` 배열을 실제 6개 슬라이드 내용에 맞게 1:1 정합 매핑:
       - 1/6: '서재 기본 안내'
       - 2/6: '도서 등록'
       - 3/6: '도서 상세 및 관리'
       - 4/6: '문장 수집 & 카메라 OCR'
       - 5/6: '독서 타이머 & 집중 모드'
       - 6/6: '사서와의 대화 & 추천'
  2. 하네스 문서(`STATE.md`, `HANDOFF.md`, `HANDOFF_2026-09.md`) 갱신 및 5세션 상한 롤링 아카이빙 유지.
- **검증**:
  - `npm run check:harness` 통과 (HANDOFF, PLAN, STATE, DECISIONS, archive 정상)
  - `npm run lint` 통과 (0 errors, 0 warnings)
  - `npm run typecheck` 통과 (0 errors)
  - `npm run build` 통과 (Vite bundle 정상 빌드)

## 2026-10-09: 모바일 사서 대화창 뷰포트 줌 방지, 내부 스크롤 보장 및 탭 터치 인터랙션 개선
- 작업 브랜치: `fix/mobile-chat-zoom-and-interaction`
- **사용자 요청**:
  - 모바일에서 대화·추천 모드 사용 시 뷰포트가 갑자기 줌인되어 채팅창을 나가거나 내부 스크롤이 불가능해지는 현상 및 내 서재/토론 모드 탭 클릭 불가 현상 해결.
- **원인 분석**:
  1. **모바일 뷰포트 자동 줌(Auto-Zoom)**: iOS Safari/웹킷 브라우저는 `font-size < 16px`인 `<input>`/`<textarea>` 포커스 시 화면을 강제 확대하며, 확대 시 `position: fixed` 요소가 화면 밖으로 벗어나 탭과 닫기 버튼 터치가 불가능해짐.
  2. **스크롤 컨테이너 CSS 누락**: `LibrarianChat.jsx`에서 바디 래퍼로 렌더링하던 `.lc-content-body`의 CSS 정의가 누락되어 패널 내부 메시지 리스트에 독립적인 스크롤 컨텍스트가 생성되지 않음.
  3. **모바일 백드롭 오버레이 부재**: 모바일 채팅 패널 오픈 시 패널 외 영역 터치로 닫을 수 있는 전용 백드롭(`lc-mobile-backdrop`)이 없어 탈출이 어려움.
  4. **스트리밍 완료 후 loading 상태 잠김 방어**: `streamResult` 반환 시점의 예외 상황에서 `loading` 상태가 풀리지 않을 경우 모드 탭 클릭이 차단될 위험 방어.
- **작업 내용**:
  1. `index.html`:
     - 뷰포트 메타 태그에 `maximum-scale=1.0, user-scalable=no, viewport-fit=cover, interactive-widget=resizes-content` 추가하여 가상 키보드 및 포커스 시 비정상 줌 방지.
  2. `app/features/room/LibrarianChat.css`:
     - `.lc-content-body` 스크롤 컨테이너 정의: `flex: 1 1 auto; min-height: 0; overflow-y: auto; overflow-x: hidden; -webkit-overflow-scrolling: touch; overscroll-behavior-y: contain; touch-action: pan-y;`.
     - 입력창 폰트 크기 표준화: `.lc-chat-input-field`, `.lc-library-search-input`, `.lc-debate-book-search-input`의 `font-size: 16px` 적용으로 모바일 줌 원천 차단.
     - 탭 터치 인터랙션 강화: `.lc-mode-tabs` 및 `.lc-mode-tab`에 `flex-shrink: 0`, `min-height: 36px`, `touch-action: manipulation`, `-webkit-tap-highlight-color: transparent` 적용.
     - `.lc-mobile-backdrop` 오버레이 추가 (`z-index: 110`, 바깥 탭 시 자동 닫힘).
     - 모바일 패널 높이를 `height: min(580px, calc(100dvh - 90px))`로 세로 플렉스 컨테이너화하여 키보드/하단바 간섭 방지.
  3. `app/features/room/LibrarianChat.jsx`:
     - 모바일 열림 시 `<div className="lc-mobile-backdrop" onClick={() => setOpen(false)} />` 렌더링.
     - `sendQuery` 함수 전체를 `try { ... } finally { if (!controller.signal.aborted) setLoading(false); }`로 감싸 어떤 경우에도 `loading` 상태 해제 보장.
  4. 하네스 문서(`STATE.md`, `HANDOFF.md`, `HANDOFF_2026-09.md`) 갱신 및 5세션 상한 롤링 아카이빙 유지.
- **검증**:
  - `npm run check:harness` 통과 (HANDOFF, PLAN, STATE, DECISIONS, archive 정상)
  - `npm run lint` 통과 (0 errors, 0 warnings)
  - `npm run typecheck` 통과 (0 errors)
  - `npm run build` 통과 (Vite bundle 정상 빌드)
