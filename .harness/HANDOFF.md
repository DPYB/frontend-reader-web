# HANDOFF (세션별 서술 로그, append-only)

## 2026-10-22: 사서 대화창 토론 모드 UI 비활성화 및 소셜 로그인 실패 원인 분석 점검
- 작업 브랜치: `feat/check-social-login-and-disable-debate`
- **사용자 요청**:
  - 카카오 로그인, 구글 로그인이 현재 동작하지 않는 원인을 프론트엔드와 백엔드 양쪽에서 점검하여 파악.
  - 사서 대화창 상단 모드 탭에서 토론 모드를 사용자가 선택하지 못하도록 UI적으로 비활성화(막아두기).
- **소셜 로그인 점검 결과**:
  1. **Google 소셜 로그인 실패 원인**:
     - `triggerGoogleLogin`에서 `window.google.accounts.id.prompt()`(One Tap) 호출 시, Google Cloud Console의 **'승인된 자바스크립트 원본(Authorized JavaScript Origins)'**에 현재 배포 도메인(예: `https://frontend-reader-web.pages.dev`, `https://dpyb.ai0208.xyz`)이 등록되어 있지 않으면 `notification.isNotDisplayed()`로 인해 즉시 `Google 로그인 창이 차단되었거나 표시할 수 없는 환경입니다` 에러 발생.
     - Cloudflare Pages 빌드 환경변수에 `VITE_GOOGLE_CLIENT_ID`가 미설정된 경우 즉시 클라이언트 ID 누락 에러 발생.
     - 백엔드 Cloud Run(`Core API 백엔드`) 환경변수에 `GOOGLE_CLIENT_ID`가 미설정되거나 불일치할 경우 백엔드 토큰 검증(audience mismatch) 실패(401).
  2. **Kakao 소셜 로그인 실패 원인**:
     - Kakao Developers 콘솔의 **[내 애플케이션] > [플랫폼] > [Web 플랫폼 등록]**에 배포 도메인이 등록되어 있지 않으면 Kakao SDK 실행 시 `KOE006`(미등록 도메인) 오류 발생.
     - Cloudflare Pages 환경변수에 `VITE_KAKAO_JAVASCRIPT_KEY`가 주입되지 않은 경우 SDK 초기화 실패.
- **토론 모드 UI 비활성화 작업 내용**:
  1. `app/i18n/translations.js`:
     - `chat.modeDebateDisabled` ('토론 모드는 준비 중입니다.' / 'Discussion mode is coming soon.'), `chat.modeDebateTag` ('준비중' / 'Coming Soon') 다국어 키 추가.
  2. `app/features/room/chat/ChatModeTabs.jsx`:
     - 토론 모드 버튼에 `disabled`, `aria-disabled="true"`, `lc-mode-tab--disabled` 부여.
     - '준비중' 뱃지 텍스트(`.lc-mode-tab-tag`) 렌더링 및 툴팁(`title`) 연동, 클릭 이벤트 차단.
  3. `app/features/room/LibrarianChat.css`:
     - `.lc-mode-tab.lc-mode-tab--disabled`, `.lc-mode-tab:disabled` 스타일 (`cursor: not-allowed`, `opacity: 0.55`, `pointer-events: auto`) 및 `.lc-mode-tab-tag` 뱃지 캡슐 스타일링 추가.
  4. `app/features/room/LibrarianChat.jsx`:
     - `handleChangeMode` 핸들러에서 `if (mode === 'debate') return;` 가드 로직을 추가하여 코드 레벨에서도 진입 차단.
  5. 하네스 문서(`STATE.md`, `HANDOFF.md`, `HANDOFF_2026-09.md`) 갱신 및 5세션 상한 롤링 아카이빙 유지.
- **검증**:
  - `npm run check:harness` 통과 (HANDOFF, PLAN, STATE, DECISIONS, archive 정상)
  - `npm run lint` 통과 (0 errors, 0 warnings)
  - `npm run typecheck` 통과 (0 errors)
  - `npm run build` 통과 (Vite bundle 정상 빌드)

## 2026-10-22: 로그인 페이지 소셜 로그인(카카오, Google) 및 회원가입 버튼 UI 활성화
- 작업 브랜치: `feat/enable-social-login-and-signup-ui`
- **사용자 요청**:
  - 카카오 로그인, 구글 로그인, 회원가입 버튼 UI적으로 막아둔 것 활성화 요청.
- **작업 내용**:
  1. `app/pages/LoginPage.jsx`:
     - `BUTTONS` 배열 내 `signup`, `kakao`, `google` 툴팁에서 `(준비 중)` / `(Coming Soon)` 문구 제거 및 정식 라벨로 복원.
     - `isButtonDisabled(id)` 함수에서 `signup`, `kakao`, `google` 비활성화 조건 제거 (요청 중 `loading`일 때만 클릭 방지).
     - `handleClick(id)` 핸들러에서 `signup`, `kakao`, `google` 정상 분기 활성화 (`navigate('/signup')`, `handleKakaoClick()`, `handleGoogleClick()`).
     - 호버 시 밝기 및 드롭섀도우 효과(`login-layer-img--hover`), 마우스 커서 포인터(`cursor: pointer`) 정상화.
  2. 하네스 문서(`STATE.md`, `HANDOFF.md`, `HANDOFF_2026-09.md`) 갱신 및 5세션 상한 롤링 아카이빙 유지.
- **검증**:
  - `npm run check:harness` 통과 (HANDOFF, PLAN, STATE, DECISIONS, archive 정상)
  - `npm run lint` 통과 (0 errors, 0 warnings)
  - `npm run typecheck` 통과 (0 errors)
  - `npm run build` 통과 (Vite bundle 정상 빌드)

## 2026-10-20: 3D 책장 도서 드래그 앤 드롭 이동 인터랙션 결함 수정 및 안정화
- 작업 브랜치: `fix/bookshelf-drag-drop-interaction-v2`
- **사용자 요청**:
  - 머지 완료 후 실제 서재에서 책 드래그 이동이 동작하지 않는 현상 재확인 및 해결.
- **원인 분석**:
  1. **ThreeEvent vs Native PointerEvent 좌표 누락**: `Book3D.jsx`의 `onPointerDown`에서 전달된 이벤트 `e`는 R3F `ThreeEvent`로, `e.clientX`가 직접 존재하지 않아 `undefined`가 됨. 이로 인해 `Math.hypot(NaN, NaN)`이 되어 6px 드래그 임계값 체크가 절대 true가 되지 못하고 드래그 모드가 발동되지 않음.
  2. **DragPlane의 3D 이벤트 차단**: 3D 공간의 거대한 투명 평면(`DragPlane`)이 `stopPropagation()`을 호출하여 레이캐스트 이벤트가 차단되거나 좌표계 왜곡이 발생함.
  3. **실시간 스냅 프리뷰 피드백 부재**: 드래그 중인 도서가 목표 선반 위에 올랐을 때 목표 선반 위치로 이동하는 시각적 스냅이 없어 사용자 체감이 부족했음.
  4. **드래그 종료 시 click 이벤트 간섭**: 마우스/터치를 뗐을 때 즉시 모달 열림(`onClick`)이 발동될 수 있는 레이스 컨디션 존재.
- **작업 내용**:
  1. `app/features/bookshelf3d/Book3D.jsx`:
     - `onPointerDown`에서 R3F `ThreeEvent`의 `nativeEvent`로부터 `clientX`, `clientY`를 안전하게 추출하여 `onDragInitiate`로 전달.
     - `isDragging` 시 목표 선반 스냅 위치(`position`)를 기준으로 살짝 떠오르고(`lift = 0.22`, `forwardPull = 0.35`, `z + 0.18`), 크기가 1.08배 커지며 골드 글로우가 켜지도록 3D 모션 개선.
  2. `app/features/room/shelfBookStorage.js`:
     - `findTargetShelfIndex(clientX, clientY, sceneRect, bounds)` 신설 및 export: 16:9 컨테이너 좌표계(`sceneRect`)를 기준으로 각 선반의 2D 바운드 퍼센트(`top`, `height`, `left`, `width`)를 분석하여 현재 마우스/터치가 위치한 목표 선반 인덱스를 100% 오차 없이 정밀 판별.
  3. `app/features/room/ShelfDropZones.jsx`:
     - 레이캐스트 차단 우려가 있는 불필요한 히트박스를 제거하고, 순수하게 목표 선반(`activeTargetShelfIdx`) 바닥 및 후면의 은은한 글로우 하이라이트 평면만 그리는 시각적 가이드 컴포넌트로 최적화.
  4. `app/features/room/LibraryScene.jsx`:
     - 16:9 배경 박스에 `sceneContentRef` 연결.
     - `effectiveShelfGroups` 및 `placements` 연동: 도서 드래그 중 목표 선반(`hoveredDropShelfIdx`) 위에 있을 때 임시 선반 배치를 실시간 반영하여 책이 목표 선반 위치로 즉시 스냅 이동하는 프리뷰 제공.
     - `handleGlobalPointerMove`에서 `findTargetShelfIndex`로 `hoveredDropShelfIdx` 실시간 갱신.
     - `handleGlobalPointerUp`에서 목표 선반 이동 확정 및 `saveShelfAssignments` 영구 저장.
     - `justDroppedRef` 도입(150ms 보호 윈도우): 도서 드래그 완료 직후 발생하는 `onClick` 이벤트에서 도서 상세 모달이 열리지 않도록 완벽 분리.
     - 불필요하고 이벤트를 방해하던 3D `DragPlane` 제거.
  5. `app/index.css`:
     - `body.reading-room.is-dragging-book`에 `user-select: none !important; -webkit-user-select: none !important; touch-action: none !important;` 추가로 제스처 간섭 원천 차단.
  6. 하네스 문서(`STATE.md`, `HANDOFF.md`, `HANDOFF_2026-09.md`) 갱신 및 5세션 상한 롤링 아카이빙 유지.
- **검증**:
  - `npm run check:harness` 통과 (HANDOFF, PLAN, STATE, DECISIONS, archive 정상)
  - `npm run lint` 통과 (0 errors, 0 warnings)
  - `npm run typecheck` 통과 (0 errors)
  - `npm run build` 통과 (Vite bundle 정상 빌드)

## 2026-10-20: 3D 책장 도서 드래그 앤 드롭 이동 및 선반별 배치 영속화 구현
- 작업 브랜치: `feat/bookshelf-drag-and-drop-placement`
- **사용자 요청**:
  - 서재 선반에 책이 있을 때, 드래그로 사용자가 원하는 선반에 꽂을 수 있게 이동 가능하게 구현.
  - 백엔드 팀원에게 전달할 사항 정리.
- **작업 내용**:
  1. `app/features/room/shelfBookStorage.js` 신설:
     - `getShelfStorageKey(librarianId, userId)`: 사용자 계정 및 사서별 독립적인 로컬 스토리지 키 관리 (`myReadingRoom.shelfAssignments.{userId}.{librarianId}`).
     - `loadShelfAssignments`, `saveShelfAssignments`: 선반별 도서 ID 목록(`{ [shelfIndex]: string[] }`) 영속화.
     - `reconcileShelfGroups(books, shelves, savedAssignments)`: 삭제된 도서 자동 정리, 신규 등록 도서 빈 슬롯 자동 배치, 선반 capacity 한도 준수 정합성 보장.
     - `moveBookAssignment(currentGroups, bookId, targetShelfIdx)`: 도서의 선반 간 이동 및 새 assignments 생성.
  2. `app/features/room/ShelfDropZones.jsx` 신설:
     - 3D 공간 상에서 각 선반의 위치(pos), 크기(width, depth), 회전(euler)에 맞춘 투명 히트박스 배치.
     - 도서 드래그 중 마우스 호버 시 해당 선반 바닥 및 후면에 네온/골드 글로우 하이라이트 평면 렌더링으로 직관적인 드롭 타깃 시각 피드백 제공.
  3. `app/features/bookshelf3d/Book3D.jsx`:
     - `isDragging`, `dragPosition`, `onDragInitiate` props 추가.
     - 드래그 중인 도서는 3D 공간에서 마우스 포인터 월드 좌표를 즉각 추적(`lambda = 26`)하며, 앞으로 살짝 떠오르고(`z + 0.45`), 황금빛 테두리 글로우가 켜지도록 애니메이션 보강.
  4. `app/features/room/LibraryScene.jsx`:
     - 6px 이상 마우스 이동 시에만 도서 이동 드래그 모드로 전환하여, 가벼운 클릭 시 도서 상세 모달 오픈 경험과 완벽히 분리.
     - 도서 드래�  - `npm run typecheck` 통과 (0 errors)
  - `npm run build` 통과 (Vite bundle 정상 빌드)
��처 opacity 낮추기.
- **작업 내용**:
  1. **사서 프로필 사진 4종 배경 컬러 `#F7F3ED` 통일**:
     - 사서 4종(`cat`, `stork`, `nudi`, `gecko`)의 프로필 이미지 배경을 분석하여 따뜻한 아이보리 톤(`#F7F3ED`, RGB: 247, 243, 237)으로 일괄 통일.
       - `cat.webp`, `stork.webp`: 기존 `#F7F3ED` 배경 유지.
       - `nudi.webp`: 투명 RGBA 채널을 `#F7F3ED` 캔버스에 합성하여 WebP(Q95)로 변환.
       - `gecko.webp`: 기존 순백색(`#FFFFFF`) 배경을 `#F7F3ED`로 치환/블렌딩하여 WebP(Q95)로 변환.
     - 통일된 4종 WebP 파일을 `public/profile/librarian/`에 배치하고, `app/data/librarians.js`의 `profileImage` 경로를 `/profile/librarian/{id}.webp`로 매핑.
     - CSS 스타일 레벨에서도 일관된 배경색 보장:
       - `app/pages/LibrarianProfiles.css`: `.lp-avatar`에 `background: #f7f3ed;` 지정 (다크모드에서도 일관된 톤 유지).
       - `app/components/Gnb.css`: `.gnb-profile`, `.gnb-sheet-librarian-avatar img`에 `background: #f7f3ed;` 지정.
       - `app/features/room/LibrarianChat.css`: `.lc-mobile-fab-avatar`, `.lc-chat-toggle-avatar-wrap`에 `background: #f7f3ed;` 지정.
  2. **블루 커서 클릭 모션 이미지(`cat_04.webp`) 화질 개선 및 선명화(Sharpen)**:
     - `public/cursors/cat/cat_04.webp` 화질 분석: 클릭 시 브라우저 서브픽셀 렌더링 및 모션 전환 시 엣지가 뭉개져 보이는 현상 확인.
     - Pillow 언샤프 마스크(`ImageFilter.UnsharpMask(radius=1.2, percent=160, threshold=3)`) 및 미세 콘트라스트(1.05x) 보정을 적용하고 손실을 최소화한 WebP Q98로 재인코딩하여 선명도 및 캐릭터 윤곽 복원.
     - `app/features/room/LibrarianCursor.css`: `.librarian-cursor-img`에 `image-rendering: -webkit-optimize-contrast; image-rendering: crisp-edges; transform: translateZ(0); backface-visibility: hidden;` 추가로 실시간 커서 트랜스폼 중 GPU 텍스처 보간 시 흐려짐(blur) 원천 차단.
  3. **3D 도서 뒤표지(Back Cover) 텍스처 투명도(Opacity) 완화**:
     - 원인 분석: 기존 앞표지/책등은 캔버스 합성으로 `globalAlpha = 0.35` 수준의 은은한 오버레이를 적용했으나, 뒤표지는 `Book3D.jsx`에서 raw grayscale 텍스처를 100% full opacity로 덮어씌워 지나치게 어둡고 탁해 보였음.
     - `app/features/bookshelf3d/bookTextureHelper.js`: `createBackCoverTexture(coverColor, sharedImg)` 신설. 텍스처 오버레이 `globalAlpha = 0.16`로 대폭 완화하여 부드럽고 고급스러운 종이 질감을 구현하고, 클래식 음각/양각 테두리 프레임 데코레이션 추가.
     - `app/features/bookshelf3d/Book3D.jsx`: `dynamicBackCoverMap` 캔버스 텍스처 메모이제이션 및 언마운트 시 dispose 처리, `backCover` 머티리얼에 `map: activeBackCoverMap`, `bumpScale: 0.005` 적용.
  4. 하네스 문서(`STATE.md`, `HANDOFF.md`, `HANDOFF_2026-09.md`) 갱신 및 5세션 상한 롤링 아카이빙 유지.
- **검증**:
  - `npm run check:harness` 통과 (HANDOFF, PLAN, STATE, DECISIONS, archive 정상)
  - `npm run lint` 통과 (0 errors, 0 warnings)
  - `npm run typecheck` 통과 (0 errors)
  - `npm run build` 통과 (Vite bundle 정상 빌드)

## 2026-10-19: 도서 상세 모달 내 3D/2D 도서 뷰어 전환 기능 및 선호도 저장 구현
- 작업 브랜치: `feat/book-detail-2d-3d-toggle`
- **사용자 요청**:
  - 도서 상세 모달에서 보이는 3D 도서를 사용자가 원하는 대로 2D 평면 표지로도 볼 수 있도록 3D/2D 전환 기능 추가.
- **작업 내용**:
  1. `app/i18n/translations.js`:
     - `bookDetail.view3d` ('3D 도서' / '3D Book'), `bookDetail.view2d` ('2D 표지' / '2D Cover'), `bookDetail.cover2dHint` ('2D 도서 표지' / '2D Book Cover') 다국어 키 추가.
  2. `app/features/room/Book3DViewer.jsx`:
     - 뷰어 우측 상단에 3D / 2D 세그먼트 토글 버튼(`[ 🎲 3D ] [ 🖼️ 2D ]`) 추가.
     - 사용자의 뷰 모드 선택을 `localStorage` (`myReadingRoom.bookDetailViewMode`)에 영구 저장하여, 다른 도서를 탐색하거나 재방문 시에도 사용자가 선호하는 모드(2D/3D)가 일관되게 유지되도록 구현.
     - **2D 모드 렌더링**:
       - 표지 이미지(`coverUrl`)가 등록된 경우, 드롭 섀도우 및 부드러운 호버 스케일 효과가 적용된 고해상도 2D 표지 이미지 렌더링 (이미지 로드 실패 시 graceful fallback).
       - 표지 이미지가 없거나 로드 실패 시, 도서의 책등/표지 색상 그라데이션 및 양각 책등 주름 효과가 적용된 세련된 그래픽 북커버(제목, 저자 표시) 렌더링.
     - 뷰어 하단 안내 힌트 칩을 모드에 따라 실시간 전환 (`3D 도서 드래그 회전` ↔ `2D 도서 표지`).
  3. `app/features/room/BookDetail.css`:
     - 세그먼트 토글 버튼(`.book-viewer-mode-toggle`, `.book-viewer-mode-btn`), 2D 표지 컨테이너(`.book-viewer-2d-container`), 표지 이미지(`.book-viewer-2d-img`), 그래픽 북커버 Fallback(`.book-viewer-2d-fallback`) 스타일링 및 부드러운 페이드인 애니메이션 추가.
  4. 하네스 문서(`STATE.md`, `HANDOFF.md`, `HANDOFF_2026-09.md`) 갱신 및 5세션 상한 롤링 아카이빙 유지.
- **검증**:
  - `npm run check:harness` 통과 (HANDOFF, PLAN, STATE, DECISIONS, archive 정상)
  - `npm run lint` 통과 (0 errors, 0 warnings)
  - `npm run typecheck` 통과 (0 errors)
  - `npm run build` 통과 (Vite bundle 정상 빌드)


