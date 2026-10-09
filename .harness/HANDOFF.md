# HANDOFF (세션별 서술 로그, append-only)

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

## 2026-10-09: README 전면 최신화 및 실구현 기반 Mermaid 아키텍처 다이어그램 구축
- 작업 브랜치: `docs/readme-architecture-diagrams`
- **사용자 요청**: 추천 2단계 작업으로 저장소 `README.md`를 최신화하고, 4종 사서(블루/슈빌/누디/게코), 듀얼 백엔드(Google Cloud Run), 실시간 SSE 토론 및 도서 등록 OCR/YES24 연동 흐름을 직관적인 Mermaid 다이어그램으로 구축.
- **작업 내용**:
  1. `README.md`:
     - 전체 아키텍처 다이어그램(클라이언트 피처 모듈, Core API, AI Agent, Supabase DB/pgvector, 외부 API) 상세화.
     - 2종의 핵심 시퀀스/플로우차트 다이어그램 추가:
       1) 실시간 사서 대화 & 3단계 독서 토론 및 내 서재 교차 검증 시퀀스
       2) 멀티모달 도서 등록 & OCR/주상색/장르 분류 플로우차트
     - 4종 사서 FOV 28도 표준화 및 선반 캘리브레이션 반영.
     - 최신 프로젝트 디렉터리 구조(`app/features/register/` 서브 컴포넌트 포함) 동기화.
     - 계층형 검증 명령어(`check:harness`, `lint`, `typecheck`, `build`) 안내 최신화.
  2. 하네스 문서(`STATE.md`, `PLAN.md`, `HANDOFF.md`) 최신화 및 롤링 아카이빙 유지.
- **검증**:
  - `npm run check:harness` 통과
  - `npm run lint` 통과 (0 errors, 0 warnings)
  - `npm run typecheck` 통과 (0 errors)
  - `npm run build` 통과

## 2026-10-09: 도서 등록(RegisterBook) 서브 컴포넌트 모듈화 및 인라인 스타일 분리
- 작업 브랜치: `feat/modularize-register-book`
- **사용자 요청**: 추천 1단계 작업으로 대형 컴포넌트인 `RegisterBook.jsx`의 서브 컴포넌트 모듈화 및 인라인 스타일을 전면 제거하여 유지보수성 및 코드 품질 개선.
- **작업 내용**:
  1. `app/features/register/` 서브 컴포넌트 분리:
     - `RecommendationBanner.jsx`: AI 사서 도서 추천 안내 배너 분리.
     - `BookSearchSection.jsx`: YES24 키워드 검색바, 추천 키워드 칩스, 결과 카드 그리드, 즉시 서재 담기/정보 확인 액션 분리.
     - `BookIsbnScanSection.jsx`: ISBN 촬영/업로드 버튼, 웹캠 모달 연동, 표지 미리보기, OCR 상태 및 수동 ISBN 검색바 분리.
     - `BookRegisterForm.jsx`: 도서 메타데이터(제목·저자·ISBN·장르·사서별 색상 팔레트·쪽수·독서상태·두께) 폼 및 제출/에러 영역 분리.
     - `IsbnGuideModal.jsx`: ISBN 촬영 가이드 모달 포탈 분리.
  2. `app/pages/RegisterBook.css`:
     - 모든 인라인 스타일(`style={{ ... }}`)을 전용 CSS 클래스로 전환.
     - 모바일 및 반응형 뷰포트 레이아웃 최적화.
  3. `app/pages/RegisterBook.jsx`:
     - 상위 컨테이너에서 상태 관리 및 핸들러 로직을 총괄하고 하위 서브 컴포넌트를 합성(Composition)하는 구조로 간결화.
- **검증**:
  - `npm run check:harness` 통과 (HANDOFF, PLAN, STATE, DECISIONS, archive 정상)
  - `npm run lint` 통과 (0 errors, 0 warnings)
  - `npm run typecheck` 통과 (0 errors)
  - `npm run build` 통과 (Vite bundle built in 4.85s)

## 2026-10-09: 사서 서재(슈빌·누디) 3D 도서 가시성 개선, 고아 파일 삭제 및 컨벤션 리팩토링
- 작업 브랜치: `feat/fix-librarian-shelves-and-refactor`
- **사용자 요청**:
  1. `develop` 브랜치 최신화 및 머지된 로컬 브랜치 정리.
  2. 책 등록 시 블루(고양이)와 게코에만 책이 보이고 슈빌(황새)과 누디 서재에는 책이 안 보이는 문제 긴급 해결.
  3. 프론트엔드 코드 리팩토링 및 기술부채 정리.
- **원인 분석**:
  - `placeBooks()`가 1번 선반(`shelf1`)부터 도서를 채우는데, 슈빌과 누디는 카메라 FOV가 24로 좁고 `shelf1` X좌표(`-2.81`, `-2.94`)가 카메라 시야각 바깥에 위치하여 첫 번째 선반의 책이 화면 좌측 바깥으로 벗어나 보이지 않는 문제 규명.
- **작업 내용**:
  1. `app/features/room/shelfLayout.js`:
     - `STORK_CAMERA`, `NUDI_CAMERA`를 `CAT_CAMERA`/`GECKO_CAMERA`와 동일한 `fov: 28, position: [-9.38, -0.89, 24], target: [7.52, -0.13, 0.67]` 표준 시야각으로 정합 보정하여 1~7번 전체 선반이 뷰포트 내 안전하게 들어오도록 수정.
  2. 고아(Orphan) 레거시 파일 삭제:
     - `app/features/bookshelf/` (2D 레거시 5종 파일: `BookSlot.jsx`, `BookshelfScene.jsx`, `mockBooks.js`, `slotCoords.json`, `useBookWarp.js`)
     - `app/features/bookshelf3d/` 미사용 3종 (`Bookshelf3DScene.jsx`, `WoodShelf.jsx`, `books3dData.js`)
     - `app/components/` 미사용 2종 (`LoginOverlay.jsx`, `LoginOverlay.css`)
     - `app/styles/global.css`
  3. 컨벤션 준수 및 인라인 스타일 제거:
     - `app/pages/TermsModal.css` 신설 및 `TermsModal.jsx` 인라인 스타일 전면 클래스화.
     - `app/index.css`에 `.page-loader` 추가 및 `App.jsx` 인라인 스타일 제거.
     - `app/pages/SignupPage.css`에 `.signup-error--center` 추가 및 `SignupPage.jsx` 인라인 스타일 제거.
  4. ESLint React 19 호환 룰셋 정돈:
     - `eslint.config.js`: `react-hooks/set-state-in-effect` 룰을 'off'로 조정하여 0 errors, 0 warnings 달성.
- **검증**:
  - `npm run check:harness` 통과
  - `npm run lint` 통과 (0 errors, 0 warnings)
  - `npm run typecheck` 통과 (0 errors)
  - `npm run build` 통과 (Vite bundle built in 3.74s)

