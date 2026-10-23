# HANDOFF (세션별 서술 로그, append-only)

## 2026-10-23: 책등(Spine) 텍스트 선명화·왜곡 보정·크기 통일 및 블루 서재 선반 이동 책 두께 일관성 개선
- 작업 브랜치: `fix/book-spine-text-and-thickness`
- **사용자 요청**:
  - 책등(Spine)에 들어가는 책 제목이 선명하지 않고 책 모양(두께/높이 비율)에 따라 글자가 늘어나는 문제 해결.
  - 책등 텍스트 크기는 책에 관계없이 모두 동일한 크기로 통일.
  - 고양이(블루) 서재에서 책을 다른 선반으로 옮겼을 때 책 두께가 이상하게 바뀌는 현상 해결.
- **원인 분석**:
  1. **책등 텍스트 흐림 & 왜곡 늘어남**:
     - 기존 `createSpineTexture`의 캔버스 크기가 128×1024로 고정되어 있어 화면 확대 및 고해상도 환경에서 텍스트가 흐려짐.
     - Three.js `BoxGeometry`의 +Z 면(책등) UV 매핑이 [0,1]x[0,1]로 매핑되는데, 책마다 3D 치수(`thickness / height`) 비율이 제각각임에도 1:8 고정 비율 캔버스 전체에 텍스트를 그려 두꺼운 책은 글자가 가로로 뚱뚱하게 늘어나고 얇은 책은 홀쭉해짐.
     - 글자 수에 따라 폰트 크기(26~42px)가 변동되어 책마다 글자 크기가 들쭉날쭉함.
  2. **블루 서재 선반 이동 시 두께 왜곡**:
     - `CAT_SHELVES`에서 상단 벽선반(선반 0)은 카메라 거리 $Z=-0.4$ ($D \approx 24.4$), 높이 0.8인 반면, 하단 책장 선반(선반 1~4)은 카메라 거리 $Z=4.61$ ($D \approx 19.39$)로 카메라에 5유닛 가까움.
     - 하단 선반의 원근 보정을 위해 `bookHeight`는 0.54로 줄였으나 `book.thickness`는 전혀 보정하지 않아, 하단 선반으로 옮기면 높이 대비 두께 비율이 1.5배 가까이 뚱뚱해지고 화면상 겉보기 두께도 비정상적으로 비대해짐.
     - 선반 폭(2.13 vs 1.65) 불균형으로 인해 권수에 따른 압축(squeeze) 왜곡 심화.
- **작업 내용**:
  1. `app/features/bookshelf3d/bookTextureHelper.js`:
     - `createSpineTexture(title, spineColor, sharedImg, dimensions)` 개선:
       - 캔버스 해상도를 256×2048(기존 대비 픽셀 4배)로 상향하고, Three.js 밉맵 필터링(`minFilter: LinearMipmapLinearFilter`, `generateMipmaps: true`)을 적용하여 텍스트 선명도 극대화.
       - 3D 메쉬의 종횡비(`meshAspect = thickness / height`)와 캔버스 종횡비(`canvasAspect = 256 / 2048`)를 계산하여, 가로 스케일 $S_x = \text{canvasAspect} / \text{meshAspect}$를 적용. 3D 박스 매핑 시 $1/S_x$로 확대되는 왜곡을 사전에 상쇄하여 월드 공간 상에서 글자의 가로:세로 비율이 정확히 1:1 원래 글꼴 비율로 렌더링되도록 구현.
       - 텍스트 크기 통일: 글자 수에 따른 가변 폰트 크기 로직을 제거하고 한글 58px / 자간 78px, 영문 52px 고정 크기로 전면 통일. 책등 높이 초과 시 말줄임표(…) 처리.
       - 상하 클래식 북바인딩 금박/은박 장식선 고해상도(256x2048) 좌표 및 라인 두께 스케일링.
  2. `app/features/bookshelf3d/Book3D.jsx`:
     - `dynamicSpineMap` 텍스처 생성 시 `size` 프로퍼티로부터 `thickness`와 `height`를 추출하여 `createSpineTexture`에 전달하고, 메모이제이션 의존성 배열에 추가.
  3. `app/features/room/shelfLayout.js`:
     - `CAT_SHELVES`에 선반별 `thicknessScale` 정의 (선반 0: `1.0`, 선반 1~4: `0.54 / 0.8 = 0.675`).
     - `placeBooks` 내 `shelfThicknessScale` 적용: 선반 높이 축소 및 카메라 원근 거리에 비례하여 두께를 스케일링함으로써 선반 0과 선반 1~4 간 책 이동 시에도 책의 물리적 종횡비(높이 대 두께 비)와 화면상 겉보기 두께가 완벽하게 일정하도록 개선.
     - 압축(squeeze) 판별 시에도 `shelfThicknessScale`을 반영하여 선반 폭(1.65) 내에서 도서 수용 시 불필요한 찌그러짐 방지.
  4. 하네스 문서(`STATE.md`, `HANDOFF.md`, `HANDOFF_2026-09.md`) 갱신 및 5세션 상한 롤링 아카이빙 유지.
- **검증**:
  - `npm run check:harness` 통과 (HANDOFF, PLAN, STATE, DECISIONS, archive 정상)
  - `npm run lint` 통과 (0 errors, 0 warnings)
  - `npm run typecheck` 통과 (0 errors)
  - `npm run build` 통과 (Vite bundle 정상 빌드)

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

