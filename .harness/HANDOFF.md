# HANDOFF (세션별 서술 로그, append-only)

## 2026-10-23: 고양이(블루) 사서 커서 이미지 신규 일러스트 교체 및 WebP 변환
- 작업 브랜치: `feat/cat-cursor-image-update`
- **사용자 요청**:
  - 새로 그린 블루 커서 이미지 적용 (`cat_01` = 기본 커서, `cat_02` = 클릭 시 잠깐 보여지는 커서).
  - 화질 저하 없이 WebP로 변환하고, 화면에 보이는 크기는 이전과 동일하게 유지.
- **작업 내용**:
  1. 원본(11811×11811 PNG) 분석: 캔버스 대비 캐릭터 알파 바운딩 박스 비율이 기존 `cat_03`/`cat_04`와 사실상 동일(기본 0.558×0.780 vs 0.563×0.780)함을 확인 → 정사각 리사이즈만으로 표시 크기(200px 박스) 유지.
  2. `public/cursors/cat/cat_01.webp`, `cat_02.webp` 생성: LANCZOS 600×600(표시 200px 기준 3x, 레티나 대응), WebP q92 / alpha_quality 100 (각 약 35KB / 32KB). 기존 300px 대비 해상도 2배.
  3. `public/cursors/cat/cat_01_cursor.png` 생성: OS 네이티브 CSS 커서용(91×128, 핫스팟 6 6 유지). CSS `cursor` 호환성을 위해 PNG 유지.
  4. `app/data/librarians.js`: 블루 `image`/`imageHover` 경로 교체, 클릭 포즈 앞발 끝 실측값으로 `tipHover`를 `{ x: 0.13, y: 0.346 }`로 보정(기본 `tip`은 실측 결과 동일하여 유지).
  5. `app/index.css`: `[data-librarian='cat']` 네이티브 커서 경로 교체.
  6. 레거시 에셋(`cat_03.webp`, `cat_04.webp`, `cat_03_cursor.png`) 제거. 원본 대용량 PNG는 배포 번들에 포함되지 않도록 `public/` 밖으로 이동.
- **검증**:
  - `npm run check:harness`, `npm run lint`, `npm run typecheck`, `npm run build` 통과
  - 기존/신규 이미지를 200px로 나란히 렌더링하여 표시 크기·포인터 위치 일치 확인

## 2026-10-22: BETA 피드백 설문조사 디스코드 웹훅 연동 및 실시간 알림 카드 구현
- 작업 브랜치: `feat/survey-discord-webhook-integration`
- **사용자 요청**:
  - BETA 피드백 설문조사 제출 시 디스코드 웹훅 채널(#beta-feedback)로 실시간 알림이 전송되도록 연동 구현 (옵션 A: 프론트엔드 직접 연동).
  - 웹후크 봇 이름 및 프로필 설정, 전송 포맷 최적화.
- **작업 내용**:
  1. `app/features/survey/discordSurveyWebhook.js` 신설:
     - `sendSurveyToDiscord(type, formData)`: Discord Webhook 엔드포인트 연동 (`VITE_DISCORD_SURVEY_WEBHOOK_URL`).
     - 첫 방문 설문: 연령대, 디자인 만족도(별점), 서비스 이해도, 유사 서비스 경험, 기존 독서 기록 방식, 회원가입 난이도, 사용 기능, 헷갈렸던 점을 체계적인 Discord Embed 카드로 포맷팅.
     - 재방문 설문: 기기/브라우저 환경, 종합 만족도(별점), 속도 체감, 유용한 기능, 재방문 이유, AI 사서 도움 정도, 불편사항, 버그 제보, 추가 희망 기능 등을 Discord Embed 카드로 포맷팅.
     - 이미지 첨부 지원: 불편사항/버그 캡처 이미지가 첨부된 경우, DataURL을 Blob으로 변환하여 `FormData` 멀티파트 첨부파일(`attachment://inconvenience.jpg`, `attachment://bug.jpg`)로 전송 및 Embed 내 인라인 렌더링.
  2. `app/features/survey/BetaSurveyModal.jsx`:
     - `handleSubmitFirstVisit` 및 `handleSubmitReturning`에 `sendSurveyToDiscord` 호출 연동 (로컬 스토리지 백업 보존 및 비동기 예외 안전 처리).
  3. `.env.example`:
     - `VITE_DISCORD_SURVEY_WEBHOOK_URL` 환경 변수 문서화.
  4. 하네스 문서(`STATE.md`, `HANDOFF.md`, `HANDOFF_2026-09.md`) 갱신 및 5세션 상한 롤링 아카이빙 유지.
- **검증**:
  - `npm run check:harness` 통과 (HANDOFF, PLAN, STATE, DECISIONS, archive 정상)
  - `npm run lint` 통과 (0 errors, 0 warnings)
  - `npm run typecheck` 통과 (0 errors)
  - `npm run build` 통과 (Vite bundle 정상 빌드)

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
