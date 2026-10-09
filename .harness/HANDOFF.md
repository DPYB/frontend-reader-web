# HANDOFF (세션별 서술 로그, append-only)

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

## 2026-10-09: 사서 대화 세션 캐시 사용자/모드별 격리 및 상태 누수(State Leaking) 결함 해결
- 작업 브랜치: `fix/chat-session-isolation-per-user-mode`
- **사용자/백엔드 요청**:
  - 현상: 회원 계정(`dpyb`)의 토론 답변/메시지 내역이 로그아웃 후 게스트(체험하기) 대화 추천 모드에 그대로 노출되는 클라이언트 상태 누수(State Leaking) 결함 해결.
- **원인 분석**:
  1. `app/store/librarianStore.js`의 세션스토리지 키(`myReadingRoom.chatSession.${librarianId}`)에 `memberId` 및 `mode` 구분이 없어 모든 사용자와 대화/토론 모드가 단일 캐시 키를 공유.
  2. `clearChatSession()`이 단일 키(`myReadingRoom.chatSession`)만 `removeItem`하여 접미사 키(`myReadingRoom.chatSession.cat` 등)가 브라우저에 영구 잔존.
  3. 로그아웃 또는 게스트 로그인 시 이전 회원의 캐시가 클리어되지 않아 게스트 진입 시 브라우저가 이전 회원 토론 내역을 그대로 복원.
- **작업 내용**:
  1. `app/store/librarianStore.js`:
     - 세션 스토리지 키 격리 패턴 도입: `myReadingRoom.chatSession.{memberId || 'guest'}.{mode || 'chat'}.{librarianId}` (`getChatSessionStorageKey`).
     - `loadSavedChatSessionByLibrarian`, `saveChatSessionByLibrarian`, `clearChatSessionByLibrarian`에 `memberId`와 `mode` 파라미터 지원.
     - `clearChatSession()` 일괄 정리 로직 개선: `sessionStorage` 순회를 통해 `myReadingRoom.chatSession` 접두사로 시작하는 모든 키를 완벽히 일괄 제거.
  2. `app/store/AuthProvider.jsx`:
     - `login`, `loginWithGoogle`, `loginWithKakao`, `loginAsGuest` 호출 시 `clearChatSession()`을 선제 실행하여 계정 전환/게스트 진입 시 잔존 캐시 완벽 차단.
     - `logout` 및 `onSessionExpired` 시 `clearChatSession()` 연동 보장.
  3. `app/features/room/LibraryScene.jsx` & `LibrarianChat.jsx`:
     - `useAuth`로부터 현재 로그인 사용자 식별자(`currentUserId: member_id || 'guest'`)를 획득하여 사서별/모드별 세션 로드 및 저장 시 정확한 격리 키 전달.
     - 사용자 변경 및 사서 변경(`[librarian?.id, currentUserId]`) 시 안전한 세션 복원 및 빈 세션 초기화 연동.
  4. 하네스 문서(`STATE.md`, `HANDOFF.md`, `HANDOFF_2026-09.md`) 갱신 및 5세션 상한 롤링 아카이빙 유지.
- **검증**:
  - `npm run check:harness` 통과 (HANDOFF, PLAN, STATE, DECISIONS, archive 정상)
  - `npm run lint` 통과 (0 errors, 0 warnings)
  - `npm run typecheck` 통과 (0 errors)
  - `npm run build` 통과 (Vite bundle 정상 빌드)

## 2026-10-09: 챗버튼 사서 프로필 아바타 이미지(profileImage) 연동 누락 및 검정색 배경 렌더링 버그 수정
- 작업 브랜치: `fix/librarian-chat-button-avatar`
- **사용자 요청**: 챗버튼에 사서 프로필 이미지가 안 뜨고 검정색으로 표시되는 원인 분석 및 해결.
- **원인 분석**:
  1. `MobileChatFAB.jsx`에서 `librarian.profileImage`가 아닌 존재하지 않는 `librarian.avatar`와 커서 포인터 이미지(`librarian.image`)를 참조하고 있었으며, 클릭 특수 모션 경로(`/cursors/cat_hover.webp` 등)가 404 Not Found를 유발.
  2. `LibrarianChat.css`의 FAB 및 데스크톱 챗 토글 버튼 스타일에서 아바타 컨테이너 및 이미지 스타일(`.lc-mobile-fab-avatar-img`, `.lc-chat-toggle-avatar-wrap`)이 누락되어 검정색/깨진 배경으로 렌더링.
- **작업 내용**:
  1. `app/features/room/chat/MobileChatFAB.jsx`:
     - 모바일 플로팅 FAB 버튼 아바타 소스를 `librarian.profileImage`로 정상 연결.
     - 데스크톱 챗 토글 버튼(`.lc-chat-toggle-btn`)에도 사서 프로필 아바타(`lc-chat-toggle-avatar-wrap`) 추가.
  2. `app/features/room/LibrarianChat.css`:
     - `.lc-mobile-fab`, `.lc-mobile-fab-avatar-img`, `.lc-chat-toggle-avatar-wrap`, `.lc-chat-toggle-avatar` 전용 원형 스타일 및 테두리/배경색 정비.
  3. 하네스 문서(`STATE.md`, `HANDOFF.md`, `HANDOFF_2026-09.md`) 갱신 및 5세션 상한 롤링 아카이빙 유지.
- **검증**:
  - `npm run check:harness` 통과 (HANDOFF, PLAN, STATE, DECISIONS, archive 정상)
  - `npm run lint` 통과 (0 errors, 0 warnings)
  - `npm run typecheck` 통과 (0 errors)
  - `npm run build` 통과 (Vite bundle 정상 빌드)

## 2026-10-09: 로그인 페이지 비밀번호 입력 필드 마스킹 불릿(•) 글리프 누락 및 클릭 영역 간극 버그 수정
- 작업 브랜치: `fix/login-password-input`
- **사용자 요청**: 로그인 페이지에서 비밀번호 입력이 안 되는 원인 분석 및 해결.
- **원인 분석**:
  1. `app/index.css` 영문 폰트(`Chau Philomene One`)의 `unicode-range` 제약으로 인해 비밀번호 마스킹 문자(`•` U+2022)가 한글 폰트(`Memoment Kkukkukk`)로 위임되었으나, 폰트 내 불릿 글리프 누락/폭 0 문제로 마스킹 점이 렌더링되지 않아 입력 불가로 오인.
  2. 비밀번호 입력창(`INPUT_FIELDS.pw.width: 15.0%`)과 발바닥 눈 버튼(`left: 59.2%`) 사이에 0.4% 공백 간극이 존재하여 우측 클릭 시 포커스 누락 발생.
- **작업 내용**:
  1. `app/pages/LoginPage.css`:
     - `.login-input-field` 및 `[type="password"]`에 시스템 폰트 스택(`-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`) 명시 및 `letter-spacing: 2.5px`, `line-height: 1.3`, `z-index: 5` 적용.
     - `::placeholder`에 `letter-spacing: normal`, `font-family: var(--sans)` 보존.
  2. `app/pages/LoginPage.jsx`:
     - `INPUT_FIELDS.pw.width`를 `15.4%`로 조정하여 발바닥 눈 버튼(`59.2%`)과의 간극을 완전히 메움.
  3. 하네스 문서(`STATE.md`, `HANDOFF.md`, `HANDOFF_2026-09.md`) 갱신 및 5세션 상한 롤링 아카이빙 유지.
- **검증**:
  - `npm run check:harness` 통과
  - `npm run lint` 통과 (0 errors, 0 warnings)
  - `npm run typecheck` 통과 (0 errors)
  - `npm run build` 통과 (Vite bundle 정상 빌드)
