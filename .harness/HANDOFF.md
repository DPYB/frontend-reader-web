# HANDOFF (세션별 서술 로그, append-only)

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

## 2026-10-09: 디스플레이 규격별 UI/UX 가이드라인 수립 및 표준 반응형 훅 도입 (태블릿~모바일 터치 통합)
- 작업 브랜치: `feat/responsive-tablet-mobile-unification`
- **사용자 요청**: 디스플레이 규격별 UI 가이드라인 수립 및 노트북/데스크톱이 아닌 환경(스마트폰부터 12.9" 대형 태블릿까지)을 모바일 터치 통합 UI/UX로 일원화.
- **작업 내용**:
  1. `docs/UI_RESPONSIVE_GUIDELINE.md` 공식 가이드라인 문서 작성:
     - Desktop/Laptop (마우스·키보드 전용) vs Mobile & Tablet (스마트폰 ~ 12.9" 대형 태블릿 터치 통합) 인터랙션 이원화 설계.
     - 뷰포트 규격, 포인터 감지(`pointer: coarse`), 3D 서재(선반 탭 셀렉터 & 바텀시트), 플로팅 사서 FAB, 단일 열 수직 스크롤 폼 규격 정립.
  2. `app/hooks/useResponsive.js` 표준 반응형 훅 구현:
     - 뷰포트 너비 및 터치 환경(`pointer: coarse`, `ontouchstart`, `maxTouchPoints`) 기반 `isUnifiedMobileUX` 플래그 제공.
  3. 6개 핵심 컴포넌트 하드코딩(`innerWidth <= 768`) 제거 및 일원화:
     - `LibrarianChat.jsx`: 플로팅 FAB & 바텀시트 챗봇
     - `LibraryScene.jsx`: 선반 탭 셀렉터 & 3D 서재 조작
     - `SentenceCollectModal.jsx`: 수직 1열 스크롤 & 문장 OCR 모달
     - `BookDetail.jsx`: 모바일/태블릿 맞춤 1열 도서 상세 모달
     - `RegisterBook.jsx`: 카메라/앨범 스캔 및 도서 등록 폼
     - `ScrapGallery.jsx`: 수직 카드 스크롤 갤러리
  4. `README.md`에 가이드라인 링크 및 핵심 요약 추가.
- **검증**:
  - `npm run check:harness` 통과 (HANDOFF, PLAN, STATE, DECISIONS, archive 정상)
  - `npm run lint` 통과 (0 errors, 0 warnings)
  - `npm run typecheck` 통과 (0 errors)
  - `npm run build` 통과 (Vite bundle 정상 빌드)

## 2026-10-09: AI 사서 대화(LibrarianChat) 서브 컴포넌트 모듈화 및 인라인 스타일 분리
- 작업 브랜치: `feat/modularize-librarian-chat`
- **사용자 요청**: 추천 3단계 작업으로 프론트엔드 최대 파일(82KB, 1950줄)이었던 `LibrarianChat.jsx`의 서브 컴포넌트 모듈화 및 80여 개 인라인 스타일을 전면 클래스화하여 유지보수성 및 코드 가독성 개선.
- **작업 내용**:
  1. `app/features/room/chat/` 서브 컴포넌트 6종 분리:
     - `ChatHeader.jsx`: 사서 이름/타이틀, [✨ 새 대화] 버튼, 모드별 도움말(?) 툴팁, 닫기 버튼
     - `ChatModeTabs.jsx`: [ 📚 내 서재 | 💬 대화·추천 | 💡 토론 ] 3대 모드 전환 탭
     - `DebateSetupSection.jsx`: 3단계 토론 파트너(4인) 선택 그리드, 도서/자유주제 선택 카드 및 상단 고정 토론 배너([🏁 끝내기] 미니 액션 포함)
     - `ChatMessageList.jsx`: 사용자/사서 멀티턴 버블, 사서 전환 팁 박스, 토론 인사이트 저장 완료 뱃지, 발바닥 로딩 애니메이션 및 자동 스크롤
     - `ChatBookCards.jsx`: 내 서재 도서 목록 카드([책 열기 ➔]) 및 추천 도서 바로 등록 카드([등록 ➔])
     - `ChatInputForm.jsx`: 자연어/토론 메시지 입력창, 전송 버튼, 2000자 초과 방어 카운터
     - `MobileChatFAB.jsx`: 모바일 드래그 가능 사서 FAB 버튼 및 팝업 미니 메뉴(대화/타이머/프로필/다크모드)
  2. `app/features/room/LibrarianChat.css`:
     - 80여 개의 인라인 스타일(`style={{ ... }}`)을 전용 CSS 클래스로 전면 전환.
  3. `app/features/room/LibrarianChat.jsx`:
     - 상위 컨테이너에서 SSE 스트리밍 통신, 사서별 세션 격리/복원, 드래그 상태 관리 및 서브 컴포넌트 합성(Composition) 구조로 간결화.
  4. 하네스 문서(`STATE.md`, `PLAN.md`, `HANDOFF.md`, `HANDOFF_2026-09.md`) 최신화 및 롤링 아카이빙 유지.
- **검증**:
  - `npm run check:harness` 통과 (HANDOFF, PLAN, STATE, DECISIONS, archive 정상)
  - `npm run lint` 통과 (0 errors, 0 warnings)
  - `npm run typecheck` 통과 (0 errors)
  - `npm run build` 통과 (Vite bundle built in 2.75s)



