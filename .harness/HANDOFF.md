# HANDOFF (세션별 서술 로그, append-only)

## 2026-09-21: AI 독서 토론 모드 진입 플로우 3단계 분리 및 주제/서재 도서 선택 UX 구현
- 작업 브랜치: `feat/debate-steps-setup`
- **사용자 요청**: 챗봇 토론 모드에서 토론자를 선택하면 바로 채팅창으로 넘어가는 흐름을 단계를 나누도록 개편해달라. 원하는 토론자 카드 선택 ➔ 토론 주제로 내 서재에 있는 책을 선택할 수 있도록 내 서재 책 리스트를 보여주고 ➔ 선택 후에 채팅을 시작하도록 하고, 내 서재 책 리스트 제일 위에 '나만의 주제로 토론하기' 버튼을 만들어달라.
- **수정 내용**: `app/features/room/LibrarianChat.jsx`
  - 토론 모드 단계 관리 상태 `debateStep`('debater' | 'topic') 및 선택 도서 상태 `selectedDebateBook`(null이면 나만의/자유 주제) 추가
  - **[1단계]**: 4인 토론 파트너 카드 렌더링. 클릭 시 `setDebaterPersona(dp.id); setDebateStep('topic');`로 2단계 진입
  - **[2단계]**:
    - 상단 선택 토론자 요약 뱃지 + `[파트너 변경 ↺]` 버튼 (언제든 1단계로 복귀)
    - 최상단 `✨ 나만의 주제로 토론하기` 카드 (`setSelectedDebateBook(null); setDebateCollapsed(true);`)
    - 내 서재 도서 섹션 (`books` 리스트 및 3권 이상 시 실시간 검색 `debateBookQuery` 제공). 책 클릭 시 해당 도서 지정 후 `setDebateCollapsed(true)`
    - 서재가 비어있는 경우 "등록된 도서가 없습니다. '나만의 주제로 토론하기'로 바로 시작해 보세요!" 친절한 안내 표기
  - **[3단계]**:
    - 상단 고정 배너: 선택 도서(`《도서명》 토론 중`) 또는 `나만의 주제로 토론 중` 동적 라벨 표기 및 `[설정 ▾]` 클릭 시 2단계 화면 아코디언 재펼치기 제공
    - 질문 입력창 플레이스홀더: 선택된 도서/자유주제에 맞춤형 라벨 반영
    - `streamChatMessage` 호출 시 `book_id` 및 `topic` 파라미터 전달 및 토론 마무리(`handleConcludeDebate`) 프롬프트 연동
- **수정 내용**: `app/features/room/LibrarianChat.css`
  - `.lc-debate-step-box`, `.lc-debate-partner-bar`, `.lc-debate-custom-topic-card`, `.lc-debate-book-item` 등 2단계 선택 화면 및 카드 호버/선택 스타일 추가
- **검증**: `npm run typecheck` 0 errors, `npm run lint` 0 errors, `npm run build` 성공
- **PR 생성**: `https://github.com/DPYB/frontend-reader-web/pull/48` (`feat/debate-steps-setup` ➔ `develop`)

## 2026-09-20: 마이페이지 3개 섹션을 한 페이지 세로 나열로 통합
- 작업 브랜치: `feat/마이페이지-한페이지통합`
- **사용자 요청**: 마이페이지가 왼쪽 메뉴(내 정보/계정 관리/알림 설정)로 탭을 전환해 한 번에 한 섹션만 보이던 구조라, 내용을 잘게 나누지 말고 한 페이지에서 전부 다 보이게(스크롤로) 정리해달라.
- **수정 내용**: `app/pages/MyPage.jsx`
  - `activeTab` 상태와 `MENU_ITEMS`, 왼쪽 사이드바(`<nav className="mypage-sidebar">`) 완전히 제거
  - 세 섹션(내 정보/계정 관리/알림 설정)을 각각 `<h2 className="mypage-section-heading">제목</h2>` + 카드로 구성해 세로로 나열. 조건부 탭 렌더링(`activeTab === 'xxx' && (...)`) 대신 항상 세 카드가 다 렌더링됨
  - 기존 각 섹션 로직(내 정보 조회/수정, 프로필 사진 크롭 업로드, 비밀번호 변경, 계정 탈퇴, 알림 토글)은 그대로 유지, 위치만 재배치
  - 원본 파일에 있던 JSX 태그 짝 불일치(`)}`/`</div>` 중복, 잘못 배치된 `mypage-content` div 등 잔여 오류도 이번에 함께 정리
- **수정 내용**: `app/pages/MyPage.css`
  - `.mypage-layout`을 `flex-direction: row`(사이드바+콘텐츠 2단) → `column`(세로 나열)으로 변경
  - `.mypage-sidebar`, `.mypage-sidebar-item`, `.mypage-sidebar-item--active`, `.mypage-content`, `.mypage-section-title`(더는 안 쓰임) 제거
  - `.mypage-section-heading`(각 섹션 위 제목) 신설
- **검증**: `npx eslint app/pages/MyPage.jsx` 0 errors/0 warnings, `npm run build` 성공(dist 삭제 완료)
- ⚠️ 실제 화면에서 세 섹션이 순서대로 잘 보이는지, 비밀번호 변경/탈퇴 모달 등 기존 인터랙션이 위치 변경 후에도 정상 동작하는지 육안 확인 권장.

## 2026-09-20: 게코 서재 전용 캘리브레이션 + 커서 크기 확대 + 편집 바 위치 조정
- 작업 브랜치: `feat/게코서재-이미지-테마` (이어서 처리)
- **사용자 요청**: (1) 게코 서재 3D 카메라/선반 배치를 캘리브레이션 도구로 직접 맞춘 결과를 반영 (2) 3D 서재 안에서 게코 캐릭터(마우스 커서)가 다른 사서보다 작게 보여 키워달라 — 처음엔 블루만큼(1.15배)으로 맞췄는데, 실제 화면에서 보니 여전히 작아서 거기서 다시 1.5배 추가 확대 요청 (3) 캘리브레이션 편집 바를 왼쪽 상단에서 왼쪽 하단으로 이동(개발자 도구 UI, 이전 턴에서 이미 로컬 수정했던 것을 이번에 커밋 범위에 포함).
- **수정 내용**: `app/features/room/shelfLayout.js`
  - `GECKO_CAMERA`(fov 28, 고양이와 동일 시점), `GECKO_SHELVES`(선반 2개: `top` capacity 12, `shelf2` capacity 8) 신설 — 사용자가 캘리브레이션 도구에서 복사한 JSON 그대로 반영
  - `CAMERA_BY_LIBRARIAN`/`SHELVES_BY_LIBRARIAN`에 `gecko` 등록 — 이제 게코도 고양이 폴백 없이 전용 배치 사용
- **수정 내용**: `app/data/librarians.js`
  - 게코 `imgScale`을 두 단계로 조정: 1차 1.15(고양이 커서 이미지 300x300 대비 캐릭터가 캔버스를 꽉 채우는 비율 79.3% vs 게코 800x1200 이미지의 캐릭터 비율 69.1% 차이를 트리밍 실측으로 계산해 보정) → 2차 그 값에서 다시 1.5배(1.15×1.5=1.725)로 최종 확대. 실측 방법: `magick <파일> -bordercolor white -border 2 -trim info:`로 흰 배경을 잘라내 캐릭터의 실제 바운딩 박스 크기를 구함.
  - 낡은 에셋 현황 주석("게코는 아직 전용 배치 없음")을 최신 상태(누디/게코 모두 캘리브레이션 완료)로 정정
- **수정 내용**: `app/features/room/LibraryScene.jsx`
  - 캘리브레이션 "선반 편집" 조작 바 위치를 `top: 10` → `bottom: 10`(왼쪽 하단)으로 이동. `isDev`에서만 노출되는 개발자 도구 UI라 프로덕션 화면에는 영향 없음.
- **검증**: `npx eslint`(대상 파일 전체) 0 errors(기존 무관 warning 1건만), `npm run build` 성공(dist 삭제 완료)
- ⚠️ 실제 화면에서 게코 서재의 3D 카메라/선반 배치가 게코 배경 이미지와 잘 맞는지, 커서 크기가 다른 사서와 시각적으로 비슷한지 육안 확인 권장. push + PR 진행.

## 2026-09-20: 게코 서재 배경 이미지 및 핑크+그레이 테마 컬러 적용
- 작업 브랜치: `feat/게코서재-이미지-테마`
- **사용자 요청**: 게코 서재 UI 이미지(`readingroom_gecko`)를 반영하고, 페이지 전반의 게코 테마 컬러 팔레트를 버튼 등 포인트는 핑크, 넓은 배경색은 그레이 계열로 구성해달라.
- **이미지 처리**: 사용자가 `public/readingroom_gecko.png`(2560x1440, PNG, ~7MB)로 제공. 다른 사서 서재 배경과 동일한 기준(1920x1080, webp, quality 88)으로 ImageMagick(`magick`)을 이용해 변환 → `public/room/readingroom_gecko.webp`(약 720KB)로 저장. 원본 png는 정리(삭제).
- **수정 내용**: `app/features/room/shelfLayout.js`
  - `BG_SRC_GECKO` 신설, `BG_SRC_BY_LIBRARIAN`에 `gecko` 등록
  - 카메라/선반 배치(`CAMERA_BY_LIBRARIAN`/`SHELVES_BY_LIBRARIAN`)는 이번 범위에 포함하지 않음 — 기존 폴백 로직(`getDefaultCamera`/`getDefaultShelves`)에 따라 게코는 여전히 고양이 배치로 대체 표시됨(배경 그림만 전용). 캘리브레이션은 추후 별도 작업 필요.
- **수정 내용**: `app/features/room/LibraryScene.jsx`
  - `GLOW_COLOR`에 `gecko: { dark: '#ff6fa5', light: '#d63d7c' }` 추가(3D 서재 책 선택/호버 시 테두리 강조색)
- **수정 내용**: `app/index.css`
  - `:root[data-librarian='gecko']`(다크), `:root[data-theme='light'][data-librarian='gecko']`(라이트) 블록 신설
  - 다른 사서들과 다르게 배경·테두리·코드박스 등 "넓은 면적"은 무채색 그레이 계열로, `--accent`/`--nav-fg` 등 포인트만 핑크로 구성(사용자 요청 반영)
  - 대비 검증: Node로 WCAG 상대 휘도 공식을 직접 계산해 확인. 다크 모드는 전부 여유 있게 통과. 라이트 모드에서 흰 글자(`--accent-fg`)를 얹는 `--accent`는 원래 후보(`#d63d7c`, 4.36:1)가 AA 기준(4.5:1)에 살짝 못 미쳐 `#c02f70`(5.41:1)로 조정
- **수정 내용**: `app/features/register/ocrUtils.js`
  - `COLOR_PRESETS_BY_LIBRARIAN`에 `gecko` 전용 핑크 계열 6색 팔레트 추가(기존엔 `cat` 팔레트를 그대로 대체해서 썼음)
- **수정 내용**: `app/data/librarians.js`
  - 낡은 주석(누디/게코 에셋 미적용 안내, "게코 초록 계열 미적용" 등) 정정 — 실제로는 게코 커서/프로필 이미지는 이전에 이미 적용되어 있었고, 이번에 배경/글로우/CSS 테마/책 색상까지 전부 적용 완료됨을 반영
- **검증**: `npx eslint`(대상 파일 전체) 0 errors(기존 무관 warning 1건만), `npm run build` 성공(dist 삭제 완료)
- ⚠️ 실제 화면에서 게코 서재 진입 시 배경 이미지, 버튼/액센트 색상(핑크), 배경(그레이) 렌더링 확인 권장. 3D 서재 카메라/선반은 아직 고양이 배치 그대로라 게코 서재 배경과 안 맞을 수 있음(추후 캘리브레이션 필요, 나머지 사서들과 동일 절차).

## 2026-09-20: Cloudflare 배포 실패 수정 — wrangler.jsonc(assets) 추가
- 작업 브랜치: `chore/배포용-API-분리라우팅` (같은 배포 준비 작업이라 이어서 처리)
- **배경**: Cloudflare에 Git 연동 빌드로 배포를 시도했는데, 빌드(`npm run build`)는 성공했지만 Deploy 단계(`npx wrangler deploy`)에서 `Error parsing file: vite.config.js`로 실패. 이 프로젝트는 최신 Cloudflare의 "통합 Workers + 정적 에셋(assets)" 흐름으로 생성되어 있어(별도 Pages 프로젝트가 아니라 Workers 설정 화면), 저장소에 `wrangler.jsonc`가 없으면 wrangler가 정적 SPA라는 걸 스스로 판단하지 못하고 아무 JS 파일이나 서버 스크립트로 착각해 파싱하려다 실패하는 게 원인이었음.
- **수정 내용**: 저장소 루트에 `wrangler.jsonc` 신설 — `assets.directory: "./dist"`(Vite 빌드 출력 폴더를 정적 파일로 서빙), `assets.not_found_handling: "single-page-application"`(React Router 새로고침 시 404 대신 index.html로 라우팅). Cloudflare 공식 "Migrate from Netlify to Workers" 가이드의 SPA 케이스와 동일한 스키마.
- **검증**: `npm run build` 성공(dist 생성 확인, 삭제 완료), `wrangler.jsonc`가 유효한 JSON인지 `node -e "JSON.parse(...)"`로 확인
- ⚠️ 실제 Cloudflare 재배포는 사용자가 대시보드에서 트리거해야 함(로컬에서 배포 여부를 검증할 수 없음). Deploy command는 기존 `npx wrangler deploy` 그대로 두면 됨(공식 가이드 권장사항). 재배포 후에도 실패하면 로그를 다시 확인 필요.

## 2026-09-20: Cloudflare Pages 배포 준비 — core-api/ai-agent 베이스 URL 분리
- 작업 브랜치: `chore/배포용-API-분리라우팅`
- **배경**: 해커톤 제출을 위해 Cloudflare Pages로 프론트를 배포하려는데, 백엔드가 `backend-core-api`(Render, `https://backend-core-api.onrender.com`)와 `backend-ai-agent`(Render, `https://backend-ai-agent-77ik.onrender.com`) 두 곳으로 나뉘어 있음을 확인. 기존 프론트 코드는 `authApi.js`/`chatApi.js`/`genreApi.js`/`recordApi.js`/`reportApi.js` 전부 단일 `VITE_API_BASE_URL` 환경변수만 썼는데, dev 서버에서는 `vite.config.js`의 proxy가 경로별로 두 백엔드로 나눠 보내줘서 문제가 안 보였을 뿐, 정적 호스팅(Pages)에는 이 proxy가 없어 프로덕션 빌드에서 채팅/OCR/장르분류/리포트 요청이 전부 core-api로 가서 404가 나는 구조적 결함이었음.
- **수정 내용**: `app/api/apiBase.js` 신설 — `CORE_API_BASE`(`VITE_CORE_API_BASE_URL` 기반), `AI_API_BASE`(`VITE_AI_API_BASE_URL` 기반) export. 값이 없으면 기존처럼 `/api/v1`(같은 오리진, dev 프록시) 폴백.
  - `authApi.js`: `API_BASE`를 `CORE_API_BASE`로 전환. `authFetch`에 `baseUrl` 옵션 추가(기본은 core-api, 다른 백엔드로 보내야 하는 호출만 오버라이드). HTML 감지 에러 메시지도 `effectiveBase` 기준으로 정정.
  - `bookApi.js`: `authFetch` 그대로 재사용이라 수정 불필요(자동으로 core-api 적용).
  - `chatApi.js`, `genreApi.js`: 자체 `API_BASE`를 `AI_API_BASE`로 전환(`/chat`, `/classify-genre`는 ai-agent 소관, vite proxy 규칙과 동일하게 유지).
  - `recordApi.js`: OCR 두 함수(`createOcrSentence`→`/ocr/sentences`, `createOcrCover`→`/ocr/covers`)만 `authFetch(path, { baseUrl: AI_API_BASE })`로 오버라이드. `records`/`reading-sessions`는 core-api 기본값 그대로 유지(vite proxy 규칙상 core-api 소관).
  - `reportApi.js`: `/reports/monthly` 호출에 `baseUrl: AI_API_BASE` 추가.
  - `.env.example`: `VITE_API_BASE_URL` 자리를 `VITE_CORE_API_BASE_URL`/`VITE_AI_API_BASE_URL` 두 개로 교체, 실제 Render 배포 URL을 예시값으로 채움.
  - `README.md`의 "백엔드 연동" 섹션을 4개 서비스+CloudFront 구조(낡은 설명)에서 core-api/ai-agent 2개 구조 + `authFetch baseUrl` 오버라이드 방식으로 갱신.
- **검증**: `npx eslint`(대상 파일 전체) 0 errors, `npm run build` 성공. 추가로 `VITE_CORE_API_BASE_URL`/`VITE_AI_API_BASE_URL`을 실제 값으로 주입해 빌드한 뒤 번들(`dist/assets/*.js`)을 grep해 각 URL이 의도한 위치(core-api URL은 `authApi.js` 쪽, ai-agent URL은 `chatApi.js` 등)에 정확히 들어갔는지 실증 확인. dist 삭제 완료.
- **Cloudflare Pages/Render 쪽에서 사람이 해야 할 일** (코드 변경 범위 밖):
  1. Cloudflare Pages 프로젝트 생성 시 환경변수에 `VITE_CORE_API_BASE_URL=https://backend-core-api.onrender.com/api/v1`, `VITE_AI_API_BASE_URL=https://backend-ai-agent-77ik.onrender.com/api/v1` 등록
  2. 두 Render 서비스의 `CORS_ORIGINS`(환경변수)에 Pages 배포 도메인(`https://ai0208.xyz`, `https://<project>.pages.dev`) 추가 — 지금 로컬 `.env`엔 `localhost`만 있어 그대로면 배포 후 CORS로 막힘
  3. `ai0208.xyz`를 Cloudflare 네임서버로 이전 후 Pages 커스텀 도메인으로 연결(진행 중, 사용자가 직접 처리)
  4. Refresh Token이 HttpOnly 쿠키인데 프론트(Pages)와 백엔드(Render)가 다른 도메인이라 서드파티 쿠키 취급될 수 있음 — 실배포 후 로그인 유지가 끊기면 이 지점부터 확인 필요(SameSite/도메인 설정 조정이 필요할 수 있음)
- ⚠️ Cloudflare R2 프로필 사진 마이그레이션(별도 작업, 아직 미착수)과는 독립적인 변경. 커밋만 진행, push/PR은 사용자 다음 지시 대기.

## 2026-09-20: 누디(nudi) 서재 전용 카메라/선반 배치 캘리브레이션 반영
- 작업 브랜치: `fix/누디서재-캘리브레이션`
- **배경**: 누디 서재는 지금까지 전용 카메라/선반 배치가 없어 `CAMERA_BY_LIBRARIAN`/`SHELVES_BY_LIBRARIAN`에 `nudi` 키가 없었고, `getDefaultCamera`/`getDefaultShelves` 폴백으로 고양이(cat) 값을 그대로 대체 사용하고 있었음(배경 이미지만 누디 전용). 사용자가 캘리브레이션 도구(leva 슬라이더)로 직접 카메라 시점과 선반 3개의 위치/회전/폭/깊이/bookHeight를 맞추고 "설정 JSON 복사" 결과를 전달.
- **수정 내용**: `app/features/room/shelfLayout.js`
  - `NUDI_CAMERA`(fov 24, position/target 지정), `NUDI_SHELVES`(선반 3개: `top`/`shelf3`/`shelf2`, 각 capacity 6) 신설 — 사용자가 캘리브레이션 도구에서 복사한 JSON 그대로 반영
  - `CAMERA_BY_LIBRARIAN`, `SHELVES_BY_LIBRARIAN`에 `nudi: NUDI_CAMERA` / `nudi: NUDI_SHELVES` 등록 — 이제 누디는 고양이 폴백 없이 전용 배치 사용
  - `BG_SRC_NUDI` 상단 주석에서 "전용 카메라/선반 배치가 아직 없다"는 낡은 설명 제거(더 이상 사실이 아님)
- ⚠️ 실제 화면에서 누디 서재 진입 시 카메라 시점과 3개 선반에 책이 올바르게 배치되는지(특히 각 선반 6권 초과 시 다음 선반으로 넘어가는지) 육안 확인 권장.
- **검증**: `npx eslint app/features/room/shelfLayout.js` 통과(0 issue), `npm run build` 성공(dist 삭제 완료)

## 2026-09-20: 고양이(cat) 서재 선반 5개 모두 10권씩(총 50권) 용량 통일 + 등록 상한 방어
- 작업 브랜치: `fix/누디서재-캘리브레이션` (누디 캘리브레이션 준비 중 사용자가 고양이 서재 캘리브레이션을 먼저 다시 다듬으며 나온 요청이라 같은 브랜치에서 처리)
- **사용자 요청**: (1) 캘리브레이션 도구로 고양이 서재 선반을 5개로 늘리는 중, 1번 선반(top)은 10권 채우면 다음 선반으로 잘 넘어가는데 나머지 선반들도 10권씩만 차도록 통일해달라 (2) 마지막 선반(5번)도 10권까지만 담고 그 이상은 "일단" 추가로 생성되지 않게 해달라 — 서비스에서 사용자당 총 50권까지만 등록할 것이므로 그 상한에 맞춰 방어해도 된다는 확인.
- **배경 확인**: `placeBooks()`(3D 배치 함수)가 기존엔 "마지막 선반은 capacity를 무시하고 남은 책을 전부 담는다"는 특례가 있었는데, 사용자가 캘리브레이션 도구를 직접 조작하는 과정에서 이미 이 특례를 없애는 방향으로 요청이 이어져 옴(직전 턴에서 함께 반영) — 이번엔 그 위에서 각 선반의 `capacity` 값 자체를 5개 모두 10으로 맞추는 마무리 작업.
- **수정 내용**: `app/features/room/shelfLayout.js`
  - `CAT_SHELVES`의 5개 선반(`top`/`shelf2`/`shelf3`/`shelf4`/`shelf5`) `capacity`를 모두 `10`으로 통일(기존 `shelf2`~`shelf4`는 `0`(무제한), `shelf5`는 `4`였음)
  - 선반 배치 주석을 최신 동작(마지막 선반도 capacity를 지킴, 5×10=50권 초과분은 어느 선반에도 배치되지 않아 화면에 안 보임)에 맞춰 갱신
- **수정 내용**: `app/pages/RegisterBook.jsx`
  - `MAX_LIBRARY_BOOKS = 50` 상수 도입. 3D 서재가 화면에 배치할 수 있는 한도(선반 5개 × 10권)와 정확히 일치시켜, "화면엔 안 보이는데 서버엔 등록된 책"이 생기지 않도록 등록 자체를 막음
  - `isLibraryFull = !ocrBookId && books.length >= MAX_LIBRARY_BOOKS` — 이미 등록된 책을 OCR로 다시 불러와 수정하는 흐름(`ocrBookId` 있음)은 신규 추가가 아니므로 상한에서 제외
  - `isLibraryFull`이면 제출 버튼을 비활성화하고 "서재 선반이 가득 찼어요. 최대 50권까지 등록할 수 있어요." 안내 문구를 표시. `handleSubmit`에도 동일 조건으로 이중 방어(버튼을 우회해 폼을 제출해도 막힘)
  - 이 로직은 현재 고양이(cat)에만 적용된 5×10 배치를 기준으로 하드코딩한 값이라, 추후 사서별로 선반 개수/용량이 달라지면 `MAX_LIBRARY_BOOKS`도 함께 재검토 필요(지금은 사서 공통 상한으로 취급)
- **검증**: `npx eslint app/pages/RegisterBook.jsx app/features/room/shelfLayout.js` — 기존 warning 1건(무관) 외 신규 이슈 없음, `npm run build` 성공(dist 삭제 완료)
- ⚠️ 실제 화면에서 50권 등록 후 51번째 시도 시 버튼이 비활성화되고 안내가 뜨는지, 5개 선반이 각각 정확히 10권씩 채워지는지 육안 확인 권장. 커밋만 진행, push/PR은 사용자 다음 지시 대기. 이어서 누디 서재 캘리브레이션 작업 예정.

## 2026-09-20: 캘리브레이션 버튼이 GNB 로고에 가려 클릭 안 되던 문제 수정
- 작업 브랜치: `fix/책상세-UI개선` (기존 PR #43에 이어서, 같은 서재 화면 UI 계열 수정이라 별도 브랜치를 새로 만들지 않고 여기에 포함)
- **사용자 요청**: 사서마다 3D 서재 선반 위치를 맞추는 캘리브레이션 버튼이 GNB 로고 뒤에 깔려 클릭이 안 됨. 누디 서재 캘리브레이션을 해보려는데 진입 자체가 막힘.
- **원인**: `Gnb.css`의 `.gnb--overlay`(서재 화면의 GNB 오버레이)가 `z-index: 30`으로 항상 최상단에 떠 있는데, `LibraryScene.jsx`의 캘리브레이션 진입 버튼과 선반 편집 바는 `position: absolute, top:10, left:10`만 있고 `z-index`가 없어(기본값) GNB보다 아래에 그려짐. 두 요소가 좌상단에서 겹치면서 로고가 버튼을 덮음.
- **수정 내용**: `app/features/room/LibraryScene.jsx`
  - 캘리브레이션 진입 버튼과 "선반 편집" 조작 바 두 곳에 `zIndex: 40`(GNB의 30보다 높은 값) 추가
- **검증**: `npx eslint app/features/room/LibraryScene.jsx` — 기존 warning 1건(무관, `set-state-in-effect`) 외 신규 이슈 없음, `npm run build` 성공(dist 삭제 완료)
- ⚠️ 실제 화면에서 캘리브레이션 버튼 클릭 및 진입 확인, 누디 서재 선반 위치 조정 작업은 사용자가 이어서 진행. 커밋만 진행, push/PR은 기존 PR #43에 반영.

## 2026-09-20: 책 선택 시 아웃라인 제거 및 책 상세 팝업 버튼 위치 개선
- 작업 브랜치: `fix/책상세-UI개선`
- **사용자 요청**: (1) 3D 서재에서 책을 클릭해 선택(확대)한 상태일 때도 정육면체 아웃라인(글로우)이 계속 켜져 있는데, 선택 후엔 꺼지길 원함(호버 시 색상 강조는 유지) (2) 책 상세 팝업에서 [수정][삭제] 버튼은 오른쪽 유지하되 우측 컬럼의 [수집한 문장][독서 타이머 기록] 탭과 같은 줄에 배치, (3) 최상단 닫기(✕) 버튼을 기존 왼쪽에서 오른쪽으로 이동.
- **수정 내용**: `app/features/bookshelf3d/Book3D.jsx`
  - `glowOn` 계산을 `hovered || selected`에서 `hovered && !selected`로 변경 — 선택(확대) 상태에서는 호버 중이어도 글로우가 꺼지고, 선택되지 않은 채 마우스만 올렸을 때만 테마색 아웃라인이 표시됨. 확대·회전 자체로 선택 여부가 충분히 드러난다고 판단해 별도 대안 없이 요청대로 반영
- **수정 내용**: `app/features/room/BookDetail.jsx`
  - 닫기(✕) 버튼 위치를 `position:absolute, top:12, left:12`에서 `top:12, right:12`로 이동
  - 기존에 팝업 최상단 `position:absolute, top:12, right:12`에 있던 [수정][삭제](수정 중엔 [완료][취소]) 버튼 블록을 그 자리에서 완전히 제거하고, 우측 컬럼 탭 헤더(`[📸 수집한 문장][⏱️ 독서 타이머 기록]`) 줄로 옮김 — 탭 헤더 컨테이너에 `justifyContent: 'space-between'`을 추가해 왼쪽엔 탭 버튼, 오른쪽엔 수정/삭제(또는 완료/취소) 버튼이 같은 가로줄에서 우측 정렬되도록 구성. 버튼 로직·스타일 값은 그대로 재사용(위치만 이동)
- **검증**: `npx eslint app/features/bookshelf3d/Book3D.jsx app/features/room/BookDetail.jsx` 통과(0 errors), `npm run build` 성공(dist 삭제 완료)
- ⚠️ 실제 화면에서 책 선택 시 아웃라인이 사라지는지, 팝업의 새 버튼 배치(특히 좁은 화면에서 탭+버튼이 겹치지 않는지) 육안 확인 권장. 커밋만 진행, push/PR은 사용자 다음 지시 대기.

## 2026-09-20: 책 등록 레이아웃 2단 개편 및 사서별 책 색상 팔레트 적용
- 작업 브랜치: `feat/책등록-웹캠촬영` (이어서 진행)
- **사용자 요청**: (1) 3단 그리드(촬영/인식결과/읽기기록)에서 표지 이미지가 커서 제목·저자·장르·책 색상이 아래로 밀리는 문제 — "읽기 기록" 제목을 없애고 그 칸의 총 페이지 수·현재 읽은 페이지 입력을 인식 결과 안, 책 색상 다음 순서로 이동 (2) 수정 버튼은 계속 오른쪽 상단에 (3) 책 색상 프리셋을 사서별 서재 테마 컬러에 맞춰 다르게.
- **수정 내용**: `app/pages/RegisterBook.jsx`
  - `form`의 `gridTemplateColumns`를 3단(`220px minmax(0,1fr) 200px`)에서 2단(`220px minmax(0,1fr)`)으로 축소, "읽기 기록" 컬럼 전체 제거
  - 인식 결과 섹션 내부를 `flex` 가로 배치로 재구성: 표지 이미지를 고정폭 130px로 작게 만들어 왼쪽에 두고(기존엔 `width:100%`라 좁은 컬럼에서 이미지가 세로로 길게 늘어나 텍스트를 밀어냈음), 오른쪽에 제목→저자→장르→책 색상→총 페이지 수→현재 읽은 페이지를 순서대로 세로 배치
  - "수정" 버튼은 기존과 동일하게 "인식 결과" 제목 옆 오른쪽 상단 유지(레이아웃 변경 후에도 그대로 유효)
  - 미사용이 된 `labelStyle` 변수 제거(총 페이지 수/현재 읽은 페이지 입력이 `compactFieldStyle`을 쓰도록 통일되며 더 이상 참조되지 않음)
- **사서별 책 색상 팔레트**: `app/features/register/ocrUtils.js`
  - `COLOR_PRESETS_BY_LIBRARIAN` 맵 신설 — 각 사서의 `index.css --accent` 색상을 기준으로 명도가 다른 6가지 변형을 만듦: `cat`(오렌지, 기존 팔레트 그대로), `stork`(보라 계열, `--accent #9b7bf0` 기준), `nudi`(청록 계열, `--accent #4fc4ac` 기준). `gecko`는 전용 테마 색이 아직 없어(배경/글로우 미적용 상태) `cat` 팔레트를 그대로 재사용
  - `getColorPresets(librarianId)` 헬퍼 추가, 없는 id는 `cat`으로 폴백
  - `extractDominantColorIndex(img, presets)`에 두 번째 매개변수 추가해 임의 팔레트 안에서 최근접색을 찾을 수 있도록 확장(기본값은 하위 호환용 `colorPresets`)
  - `RegisterBook.jsx`가 `useLibrarian()`의 `activeId`로 현재 서재의 사서를 읽어 `getColorPresets(librarianId)` 결과(`presets`)를 색상 선택 UI와 이미지 평균색 추출 양쪽에 사용
- **검증**: `npx eslint app/pages/RegisterBook.jsx app/features/register/ocrUtils.js` 통과(기존 warning 1건 외 신규 이슈 없음), `npm run build` 성공(dist 삭제 완료)
- ⚠️ 실제 화면에서 사서별(고양이/황새/누디) 서재로 책 등록 시 색상 팔레트가 각 서재 테마와 어울리는지, 새 2단 레이아웃에서 표지 미리보기·긴 제목 등이 깨지지 않는지 육안 확인 권장. 커밋만 하고 push/PR은 사용자 다음 지시 대기.

## 2026-09-20: 책 등록 이미지 업로드 크기 제한 축소(5MB) 및 ISBN 수동 입력란 추가
- 작업 브랜치: `feat/책등록-웹캠촬영` (이어서 진행)
- **사용자 요청**: (1) 서버가 허용하는 50MB는 여러 사용자가 동시에 쓰는 서비스 입장에서 부담이 크니 클라이언트 기준을 5MB로 낮출 것 (2) 바코드 인식이 실패하는 경우를 대비해 ISBN을 직접 입력할 수 있는 칸 추가.
- **수정 내용**: `app/pages/RegisterBook.jsx`
  - `MAX_IMAGE_SIZE_MB = 5` 상수 도입. 서버(`recordApi.js` 문서화 기준 최대 50MB)보다 훨씬 낮게 잡아, 클라이언트에서 먼저 걸러 불필요한 대용량 업로드로 서버에 부담을 주지 않도록 함
  - `handleFile()` 진입점에서 `file.size > MAX_IMAGE_SIZE_BYTES`면 즉시 `ocrError`로 안내하고 업로드/OCR 요청 자체를 보내지 않음(파일 선택·웹캠 캡처 모두 이 함수를 거치므로 두 경로 모두 자동 적용)
  - 가이드 팝업의 안내 문구도 50MB → `{MAX_IMAGE_SIZE_MB}MB`로 갱신(상수 참조라 값이 바뀌면 문구도 자동으로 맞춰짐)
  - "인식된 ISBN: {isbn}" 읽기 전용 텍스트를 **편집 가능한 입력란**으로 교체 — 라벨 "ISBN 직접 입력 (인식이 잘 안 될 때)"과 함께 항상 노출. 기존 `isbn` state를 그대로 재사용해 OCR 인식값이 있으면 채워서 보여주고, 사용자가 고치거나 처음부터 입력할 수 있음. 등록(`handleSubmit`)은 이미 `isbn` state를 그대로 전송하므로 별도 배선 없이 즉시 반영됨
- **검증**: `npx eslint app/pages/RegisterBook.jsx` 통과(기존 warning 1건 외 신규 이슈 없음), `npm run build` 성공(dist 삭제 완료)
- ⚠️ 커밋만 하고 push/PR은 사용자 다음 지시 대기.

## 2026-09-20: 책 등록 페이지 "ISBN 촬영 가이드" 팝업 추가
- 작업 브랜치: `feat/책등록-웹캠촬영` (웹캠 캡처 작업에 이어서 진행)
- **배경**: 사용자가 책 뒷면 바코드에서 ISBN을 찍는 방법을 보여주는 예시 이미지(`public/ISBN_guide.jpg`, 587x496)를 준비. "ISBN 촬영" 제목 옆에 가이드 버튼을 만들어 클릭 시 이 이미지가 팝업으로 뜨도록 요청.
- **시행착오**: 처음엔 사용자가 준비한 정사각형(1254x1254) PNG를 ImageMagick으로 상단 40px(약 1cm)를 잘라 webp로 변환해 적용했는데, 이후 사용자가 그 webp를 직접 삭제하고 이미 직사각형(587x496, 61KB)으로 편집된 새 파일(`ISBN_guide.jpg`)을 넣어 최종적으로 이 파일을 그대로 사용(추가 변환 불필요, 이미 충분히 작음).
- **수정 내용**: `app/pages/RegisterBook.jsx`
  - "ISBN 촬영" 제목 옆에 "🐾 가이드" 버튼 추가 (처음엔 ❓ 이모지였으나 사용자 요청으로 발바닥 🐾으로 교체 — 서비스 전반의 발바닥 테마와 통일)
  - 클릭 시 `guideOpen` 상태로 `WebcamCaptureModal`과 동일한 `createPortal` 기반 팝업을 띄우고 `/ISBN_guide.jpg`를 표시
  - 팝업 이미지 아래에 업로드 제약 안내 문구 추가: "업로드 가능한 이미지 최대 크기: 50MB / 지원 파일 형식: JPG, PNG" — `recordApi.js`에 문서화된 실제 서버 제약(`image/jpeg` 또는 `image/png`, 최대 50MB)과 동일한 값
- **검증**: `npx eslint app/pages/RegisterBook.jsx` 통과(기존 warning 1건 외 신규 이슈 없음), `npm run build` 성공
- ⚠️ 실제 화면에서 가이드 팝업 이미지 표시 및 문구 배치 육안 확인 권장. 커밋만 하고 push/PR은 사용자 다음 지시 대기.

## 2026-09-20: 책 등록 페이지 "사진 촬영" 버튼을 웹캠 캡처로 전환
- 작업 브랜치: `feat/책등록-웹캠촬영`
- **배경**: `RegisterBook.jsx`(책 등록, ISBN 촬영)의 "📷 사진 촬영" 버튼이 `<input type="file" capture="environment">`를 트리거했는데, 이 속성은 모바일에서만 OS 카메라 앱을 열고 데스크톱 브라우저에서는 무시되어 파일 탐색기만 뜬다. 이 서비스는 웹(데스크톱) 기준이라 실제로는 파일 선택창처럼 동작해 사용자가 원하는 "노트북 카메라 실행"이 안 됐음. 참고로 `SentenceCollectModal.jsx`(문장 수집)는 이미 이 문제를 해결한 `WebcamCaptureModal`(getUserMedia 기반)을 별도 버튼으로 갖고 있었음.
- **수정 내용**: `app/pages/RegisterBook.jsx`
  - `capture="environment"` `<input type="file">`과 그 ref(`captureInputRef`) 제거
  - "📷 사진 촬영" 버튼 클릭 시 기존 `app/features/room/WebcamCaptureModal`(재사용, 신규 컴포넌트 아님)을 여는 `webcamOpen` 상태로 교체 — 이 모달이 `navigator.mediaDevices.getUserMedia()`로 실제 웹캠 스트림을 열고 셔터 버튼으로 정지 프레임을 캡처해 File로 반환
  - `handleWebcamCapture(file)` 핸들러 추가: 모달을 닫고 캡처된 파일을 기존 `handleFile()`(OCR 인식 파이프라인)로 그대로 전달 — 파일 업로드 경로와 동일한 처리
  - "🖼️ 이미지 업로드" 버튼(일반 파일 선택)은 그대로 유지
- **권한 팝업 관련**: 별도 UI 구현 없음 — Chrome 등 주요 브라우저는 `getUserMedia()` 호출 시 위치 정보 요청과 동일한 방식으로 주소창 옆에 자동으로 카메라 접근 허용 팝업을 띄운다(브라우저 표준 동작). 거부 시 `WebcamCaptureModal`이 이미 `NotAllowedError`/`NotFoundError`를 구분해 안내 문구를 보여주는 로직을 갖고 있어 추가 처리 불필요.
- **검증**: `npx eslint app/pages/RegisterBook.jsx` 통과(기존 warning 1건 외 신규 이슈 없음), `npm run build` 성공
- ⚠️ 실제 브라우저에서 카메라 권한 허용/거부 시나리오 및 캡처된 이미지의 OCR 인식 흐름 육안 확인 권장. 커밋만 하고 push/PR은 사용자 다음 지시 대기.

## 2026-09-20: 토론 모드 UI 간소화, 채팅창 확장, 날씨 뱃지 정리
- 작업 브랜치: `fix/채팅-로딩위치` (로딩 위치 수정에 이어서 진행)
- **사용자 요청 요약**: (1) 탭 "사서 토론" → "토론" (2) 토론 대화 시작 전 화면엔 카드 4개만, 배너/대형 버튼 제거 (3) 토론자 카드 클릭 즉시 카드가 사라지고 상단 고정 배너(끝내기+설정)만 노출, 스크롤해도 고정 (4) "마무리" → "끝내기" 용어 통일 (5) 채팅창 세로 길이 확장 (6) "토론 대상 도서 선택" 드롭다운 제거, 토론자 선택은 카드 유지 (7) 날씨 뱃지 온도 반올림 및 중복 제거, description 간결화(괄호/"기온" 단어 제거)해 분위기 태그와 한 줄에 들어가도록.
- **수정 내용**: `app/features/room/LibrarianChat.jsx`
  - 탭 라벨 "💡 사서 토론" → "💡 토론"
  - 토론 상단 고정 배너를 스크롤 영역(`lc-content-body`) **바깥**, 탭 아래로 이동 — `chatMode === 'debate' && debateCollapsed`일 때만 렌더링되어 대화 시작 후(카드 클릭 시점)부터 나타나고 스크롤해도 항상 보임
  - 스크롤 영역 안의 토론 뷰는 `!debateCollapsed`(카드 선택 화면)일 때만 렌더링 — 도서 선택 드롭다운과 대형 "토론 마무리 및 맞춤 책 추천받기" 버튼 완전 제거, 토론자 4인 카드만 남김
  - 토론자 카드 `onClick`에 `setDebaterPersona(dp.id)` + `setDebateCollapsed(true)`를 함께 호출해 클릭 즉시 카드 화면이 사라지고 상단 고정 배너로 전환되도록 함(기존엔 첫 메시지를 보내야 접혔음)
  - 도서 선택 자체를 제거함에 따라 `debateBookId`/`setDebateBookId`/`selectedDebateBook` state와 모든 참조(배너 타이틀, `sendQuery`의 `bookId`, `handleConcludeDebate`의 도서명 조합)를 정리 — 이제 토론은 항상 "일반 주제"로 시작
  - 미니 배너 버튼/타이틀의 "마무리" 텍스트를 "끝내기"로 변경(`title`, 버튼 라벨)
  - 채팅창 `maxHeight`를 `min(420px, calc(100vh - 180px))` → `min(700px, calc(100vh - 173px))`로 확장(GNB 높이 약 60px + 여유 약 3cm 정도만 상단에 남기도록 상한 축소)
  - `app/features/room/LibrarianChat.css`: 미사용이 된 `.lc-debate-select`, `.lc-debate-conclude-btn` 스타일 제거(미니 배너의 `.lc-debate-mini-conclude-btn`은 계속 사용)
- **수정 내용**: `app/features/room/WeatherMoodBadge.jsx`
  - description(예: `"맑음(쾌청한 하늘), 기온 19.4°C"`)을 정리하는 후처리 체인 추가: 괄호 부연설명 제거 → `"기온"` 단어 제거 → 온도 소수점 반올림 → 결과 `"맑음, 19°C"`
  - description에 이미 `°C`가 포함되어 있으면 뱃지가 별도로 덧붙이던 근사 온도(`≈19°C`)를 표시하지 않도록 해 온도가 중복 표시(예: `"기온 18°C ≈18°C"`)되던 버그 수정
  - 문구가 짧아져 분위기 태그가 같은 줄에 들어가고 줄바꿈이 줄어듦
- **검증**: `npx eslint` 관련 파일 전체 통과(기존 warning만 유지, 신규 에러 0건), `npm run build` 성공(dist 삭제 완료)

## 2026-09-20: 채팅 로딩 인디케이터 위치를 메시지 목록 안으로 이동
- 작업 브랜치: `fix/채팅-로딩위치`
- **배경**: 질문을 보내면 로딩 애니메이션(LoadingSequence)이 메신저형 대화 히스토리(`lc-messages-list`) 위쪽에 렌더링되고 있어, 대화가 쌓일수록 로딩 표시가 스크롤 위로 밀려 안 보이는 문제. 자동 스크롤(`messagesEndRef`)은 메시지 목록 바로 아래에 있어 로딩 블록까지는 안 따라갔음.
- **수정 내용**: `app/features/room/LibrarianChat.jsx`
  - 기존에 메시지 목록보다 위에 있던 `{loading && (<LoadingSequence .../>)}` 블록을 `lc-messages-list`(`display:flex; flex-direction:column`) 내부, `.map()` 렌더링 뒤로 이동
  - 이제 로딩 블록이 방금 보낸 사용자 질문(마지막 메시지) 바로 아래에 나타나고, 응답이 오면 그 자리에서 사라지며 메신저형 UI 흐름과 자연스럽게 이어짐. 자동 스크롤도 메시지 목록 끝을 따라가므로 로딩 표시가 항상 화면에 보임
  - 로직/스타일 변경 없이 JSX 위치만 이동
- **검증**: `npx eslint app/features/room/LibrarianChat.jsx` 통과(기존 warning 1건 외 신규 이슈 없음), `npm run build` 성공(dist 삭제 완료)

## 2026-09-19: 백엔드 최신화 재검토 및 스트리밍 채팅 library_books 필드 반영
- 작업 브랜치: `fix/스트리밍-library-books`
- **배경**: 프론트/백엔드 매칭 검토를 진행하던 중 팀원이 두 백엔드 레포(backend-core-api, backend-ai-agent)를 모두 최신화. 이전 검토 시점과 달라진 부분을 다시 대조.
- **이전 검토 대비 변경 사항**:
  - **스트리밍 방식 불일치는 이미 해결되어 있었음**: `app/api/chatApi.js`의 `streamChatMessage()`가 팀원에 의해 SSE 파서로 완전히 재작성됨(`event:`/`data:` 라인 파싱, `metadata`/`token`/`books`/`switch_suggestion`/`done`/`error` 이벤트 처리). 백엔드(`backend-ai-agent/app/api/router.py`의 `_format_sse`)와 정확히 일치. 예전 검토에서 지적했던 "헤더 방식 vs SSE 방식" 불일치는 더 이상 유효하지 않음.
  - **`backend-core-api`에 공용 DB 보호 안전장치 추가됨**(PR #23): `main.py`의 lifespan이 `AUTO_CREATE_TABLES=true`이거나 SQLite 테스트 환경일 때만 `create_all`을 실행하도록 변경. 기존엔 `ENV in ("local","test")`이면 항상 실행돼 로컬 개발이 공용 Supabase 스키마를 건드릴 위험이 있었음. `.env`에 `AUTO_CREATE_TABLES` 미설정 시 기본값 `false`라 안전.
  - **`ChatResponse`에 `library_books` 필드 신규 추가**: 백엔드가 AI 응답 텍스트에서 내 서재 보유 도서를 구조화 추출(`_extract_library_books_from_text`)해 `library_books: List[LibraryBook]`(title/author/status)로 함께 반환하도록 확장됨. 비스트리밍(`sendChatMessage`)은 이미 `data.library_books || data.libraryBooks`로 방어적으로 받고 있어 문제 없었지만, **스트리밍(`streamChatMessage`)의 `done` 이벤트 처리부는 이 필드를 읽지 않아 항상 빈 배열을 반환**하는 결함이 있었음.
- **수정 내용**: `app/api/chatApi.js`
  - `done` 이벤트에서 `eventData.library_books`를 `finalLibraryBooks` 변수에 반영
  - 최종 반환값의 `libraryBooks`/`library_books`를 하드코딩된 `[]`에서 `finalLibraryBooks`로 교체
  - 이제 스트리밍 모드로 채팅해도 `LibrarianChat.jsx`가 참조하는 `library_books`/`libraryBooks`가 정상적으로 채워져 내 서재 도서 카드가 표시됨
- **덤으로 develop CI 복구**: 이 브랜치를 올렸을 때 CI가 실패했는데, 원인은 내 변경이 아니라 develop에 이미 있던 lint 에러 3건이었다(팀원이 최신화한 PR #39 `문장 수집 크롭 모달 임시 비활성화`, 신규 컴포넌트 `ImageCropModal.jsx` 유입 시점).
  - `SentenceCollectModal.jsx`: 크롭 모달 사용부는 주석 처리했지만 `import ImageCropModal`을 남겨둬 `no-unused-vars` 에러 → import도 함께 주석 처리(재활성화 시 사용부와 짝 맞춰 복원하도록 안내 주석 추가)
  - `ImageCropModal.jsx`: 미사용 `useMemo` import 제거 + `react-hooks/refs` 오탐 1건에 `eslint-disable-next-line` 적용. 이 규칙은 "렌더 본문에서 ref를 참조하는 함수를 JSX prop으로 전달"하는 패턴을 정적으로 플래그하는데, `handlePointerDown`은 `onPointerDown` 이벤트 시점에만 `ref.current`를 읽어 실제 결함이 아니다(같은 패턴의 코너 핸들은 통과하는데 `.map()` 호출부만 걸림). 크롭 기능 자체가 비활성화 상태라 **동작 로직은 건드리지 않고 lint만 통과**시켰다 — 처음엔 `useCallback` 래핑을 시도했지만 이 규칙엔 효과가 없어 되돌렸다.
  - ⚠️ 삽질 기록: `eslint-disable-next-line`을 여러 줄 설명 주석 위에 두면 "다음 줄"이 설명 주석이 되어 억제가 안 된다. 설명을 먼저 쓰고 disable 주석을 대상 줄 바로 위에 붙여야 한다.
- **검증**: `npx eslint app/api/chatApi.js` 통과(0 issue), 저장소 전체 `npx eslint .` 결과 **에러 0건**(경고 7건은 모두 기존 항목), `npm run build` 성공(dist 삭제 완료), PR #40 CI(build-and-test, Lint PR) 전부 통과 확인
- **남은 항목(변경 없음, 계속 유효)**:
  - `POST /api/v1/librarians`(사서 획득/보유 API)에 대응하는 프론트 호출 코드가 아직 없음 — 서버 영구 저장이 필요한 시점에 연동 필요(정책 결정 우선)
  - `backend-core-api`의 `records.py`만 `CamelModel`이 아닌 순수 `BaseModel`이라 snake_case로 응답(다른 라우터는 camelCase) — `recordApi.js`는 이미 알고 대응 중이라 실사용 문제는 없으나 표기법 혼재는 유지보수 리스크로 남음
  - `recordApi.js` 주석의 "backend-record" 레포명은 오래된 정보(실제로는 backend-ai-agent가 OCR 제공, 라우팅 자체는 정확함)

## 2026-09-20: 월간 독서 리포트 서비스 런칭 기준 동적 월 선택 목록 적용
- **배경**: 해커톤 제출 및 서비스 오픈(2026년 9월) 기준에 맞지 않는 7, 8월 하드코딩 옵션을 제거하고, 향후 10월 등 시간이 흐름에 따라 최신 월이 자동으로 드롭다운 목록 및 기본값으로 반영되도록 동적화 요청.
- **수정 내용**:
  - `app/pages/MonthlyReport.jsx`:
    - 서비스 시작 기준 상수(`SERVICE_START_YEAR = 2026`, `SERVICE_START_MONTH = 9`) 정의.
    - `getAvailableMonths()` 유틸 함수 신설: 현재 날짜 기준으로 서비스 시작월(2026년 9월)부터 현재 월까지의 연/월 목록을 역순(최신순)으로 자동 생성.
    - 기존 하드코딩된 `<option value="2026-9">`, `2026-8`, `2026-7` 태그를 `availableMonths.map()` 동적 렌더링으로 교체.
    - 초기 상태값(`year`, `month`)을 `availableMonths[0]`(최신 월) 기준으로 지정.
    - 서브타이틀(`{year}년 {month}월 동안 축적된 나의 독서 습관과 취향을 사서의 시선으로 분석했습니다.`)은 기존 동적 템플릿 유지.
- **검증**:
  - `npx tsc --noEmit` 통과 (0 errors).
  - `npm run lint` 통과 (기존 경고 6건 외 신규 0건).
  - `npm run build` 번들 정상 빌드 및 dist 디렉터리 정리 확인.

## 2026-09-19: 로그인 페이지 신규 UI 적용 및 소셜/체험 버튼 이미지 전환
- 작업 브랜치: `feat/로그인페이지-신규UI`
- **배경**: 새 로그인 시안(`loginPage_new`)에 Google 로그인·Kakao 로그인·DPYB 체험하기 버튼이 그려져 들어옴. 기존에는 이 세 버튼이 시안에 없어 CSS로 만든 별도 버튼을 화면 하단에 띄우고 있었음.
- **에셋 변환 (서재 이미지와 동일한 규칙)**:
  - `loginPage_new.png`(2560x1440, 5.5MB) → `public/login-bg.webp`(1920x1080, 779KB, quality 92)로 교체. 배경 에셋은 1920px webp 규칙을 따름
  - `google_button.png` / `kako_button.png` / `dpyb_button.png` → `public/button/{google,kakao,dpyb}_btn.webp`(각 2560x1440 유지, ~9.6KB). 버튼 오버레이는 좌표 정합을 위해 2560x1440 원본 해상도를 유지하는 기존 규칙을 따름(투명 배경 보존)
  - 변환 후 원본 PNG 4개 삭제
- **클릭 영역을 "선 안쪽"으로 정밀 산출**:
  - 세 버튼은 테두리 선만 그려져 있고 내부는 알파 0(완전 투명)임을 픽셀 단위로 확인
  - 알파 bbox는 366x63(선 외곽 포함), 선 두께는 상하좌우 약 3~4px → 내부 영역은 bbox 기준 x 4~361(358px), y 4~57(54px)
  - 이를 백분율로 환산해 히트 영역을 선 안쪽에 맞춤: `left 44.0%`, `width 13.98%`, `height 3.75%`, `top` dpyb 80.42% / kakao 85.83% / google 91.25%
- **수정 내용**:
  - `app/pages/LoginPage.jsx`:
    - `BUTTONS` 배열에 `dpyb`/`kakao`/`google` 3개 추가(기존 버튼과 동일한 이미지 레이어 + 히트 영역 방식, hover 밝기 효과 자동 적용)
    - `handleClick`에 `google`→`handleGoogleClick`, `kakao`→`handleKakaoClick`, `dpyb`→`handleGuestLogin` 연결
    - `isButtonDisabled(id)` 헬퍼 신설 — 로그인은 입력 검증(`!isLoginEnabled`), 소셜/체험은 요청 중(`loading`) 기준으로 분기(기존엔 로그인 버튼만 disabled 처리)
    - 기존 CSS 기반 소셜/체험 버튼 JSX(`.login-social-container` 블록) 제거. Google One Tap용 숨김 컨테이너(`googleBtnRef`)는 `renderGoogleButton`이 참조하므로 유지
  - `app/pages/LoginPage.css`: 미사용이 된 `.login-social-container`, `.login-social-buttons`, `.social-btn*`, `.social-icon`, `.guest-experience-btn`, `.guest-paw-icon` 제거
  - 기존 버튼(회원가입·비밀번호 찾기·로그인·발바닥 토글)과 입력 필드 좌표는 사용자 요청대로 현재 상태 그대로 유지(변경 없음)
- **검증**: `npx eslint app/pages/LoginPage.jsx` 통과(0 issue), `npm run build` 성공(dist 삭제 완료)
- ⚠️ 실제 화면에서 세 버튼의 클릭 영역이 선 안쪽에 정확히 맞는지, 16:9가 아닌 화면비에서 배경 `object-fit: cover` 크롭으로 좌표가 밀리지 않는지 육안 확인 권장

## 2026-09-19: 누디 사서 전용 컬러 팔레트(청록/그린) 전 페이지 적용
- 작업 브랜치: `feat/누디-컬러-팔레트`
- **배경**: 고양이(주황)·황새(보라)처럼 사서별 테마 컬러가 `data-librarian` 속성 기반으로 앱 전체(GNB, 채팅, 버튼 등)에 자동 적용되는 기존 구조가 있음. 누디는 이 구조에 아직 값이 없어 항상 고양이(주황) 팔레트로 대체 표시되고 있었음. 사용자가 누디 서재 배경 이미지(청록/그린 톤)와 어울리는 팔레트로 지정 요청.
- **수정 내용**:
  - `app/index.css`: `:root[data-librarian='nudi']`(다크) / `:root[data-theme='light'][data-librarian='nudi']`(라이트) 블록 신설. 색조는 청록(teal, H175 전후)으로 통일하고 명도만 계단식으로 나눠 배경/테두리/코드박스/답변박스 위계를 구성(고양이·황새와 동일 원칙). `--nav-fg`/`--accent-fg`도 각 배경 위에서 충분한 대비(라이트 5.1:1)가 나오도록 별도 계산
    - 이 CSS 변경만으로 `LibrarianProvider`가 이미 `document.documentElement.setAttribute('data-librarian', activeId)`로 속성을 세팅하고 있어(기존 코드, 변경 없음) GNB·채팅·사서 프로필 등 `var(--accent)` 등을 참조하는 모든 페이지에 자동 반영됨
  - `app/features/room/LibraryScene.jsx`: `GLOW_COLOR`(3D 서재 책 선택/호버 시 테두리 강조색)에 `nudi: { dark: '#4fc4ac', light: '#23907c' }` 추가
  - `app/data/librarians.js`: 상단 주석의 예정 팔레트 안내("nudi: 핑크/마젠타 계열")를 실제 적용된 값("청록/그린(teal) 계열, 적용 완료")으로 정정
  - (시행착오: 처음엔 핑크/마젠타 계열로 만들었다가, 사용자가 제공한 누디 서재 배경 사진(청록+그린 곡선 패턴)을 보고 청록/그린 계열로 전면 재작업)
- **검증**: `npx eslint` 통과(기존 warning 2건 외 신규 이슈 없음), `npm run build` 성공(dist 삭제 완료)
- ⚠️ 실제 화면에서 라이트/다크 모드 대비 및 배경 이미지와의 조화는 육안 확인 권장

## 2026-09-19: 누디 서재 전용 배경 이미지 적용
- 작업 브랜치: `feature/누디-서재-배경`
- **배경**: 사용자가 누디(nudi) 서재용 배경 이미지(`readingroom_nudi.png`, 2560x1440)를 제공. 블루/슈빌과 동일한 방식으로 내 서재 배경으로 적용.
- **수정 내용**:
  - `public/room/readingroom_nudi.png` → `readingroom_nudi.webp`로 변환(1920x1080, 6.4MB→474KB, cat/stork와 동일 해상도·포맷 규칙) 후 원본 PNG 삭제
  - `app/features/room/shelfLayout.js`:
    - `BG_SRC_NUDI = '/room/readingroom_nudi.webp'` 상수 추가
    - `BG_SRC_BY_LIBRARIAN`(사서id → 배경 매핑) 및 `getBgSrc(librarianId)` 헬퍼 신설 — 기존엔 `LibraryScene.jsx`에 `librarianId === 'stork' ? BG_SRC_STORK : BG_SRC_CAT` 3항 연산자로 cat/stork 2개만 하드코딩되어 있어 사서가 늘어날수록 분기가 불어나는 구조였음. 매핑 테이블 방식으로 바꿔 신규 사서 배경 추가 시 이 객체에 한 줄만 추가하면 되도록 확장성 확보
    - 카메라/선반 배치(`CAMERA_BY_LIBRARIAN`/`SHELVES_BY_LIBRARIAN`)는 누디 전용 값이 아직 없어 기존과 동일하게 고양이 기준으로 대체(변경 없음) — 배경 이미지만 전용화
  - `app/features/room/LibraryScene.jsx`: `BG_SRC_CAT`/`BG_SRC_STORK` 개별 import 및 3항 분기를 `getBgSrc(librarianId)` 호출로 교체
- **검증**: `npx eslint` 통과(기존 warning 1건 외 신규 0건), `npm run build` 성공(dist 삭제 완료)
- ⚠️ 누디 전용 카메라/선반 배치, 글로우 컬러(`GLOW_COLOR`)는 여전히 고양이 대체 중(BACKLOG 기존 항목 유지)

## 2026-09-19: 로그인 화면 UI 레이아웃 및 발바닥 버튼 인터랙션 개선
- **배경**:
  - 비밀번호 입력칸 우측 발바닥 버튼 클릭 시 비밀번호가 3초간 평문으로 표시되는 기능이 마우스 클릭 이벤트를 받지 못하는 현상 해결.
  - 이메일/비밀번호 입력칸의 가로 너비가 좁아 긴 계정 입력 시 잘리는 현상 개선.
  - 개발자도구를 닫거나 화면 세로 높이가 길어질 때 간편로그인 컨테이너가 위로 붕 뜨는 현상 개선.
- **수정 내용**:
  - `app/pages/LoginPage.css`:
    - `.login-hit-area`의 `z-index`를 `3`에서 `6`으로 상향하여 인풋 필드(`z-index: 4`) 위에서 항상 클릭 이벤트를 수신하도록 보장.
    - `.login-social-container`의 위치를 `top: 73%`에서 `bottom: 3.5vh` 기준으로 변경하여 화면 세로가 길어져도 하단에 안정적으로 고정되도록 개선.
    - 간편로그인 구분선(`login-social-divider`) 및 텍스트를 제거하여 일러스트 테마와 어울리도록 미니멀하게 정리.
  - `app/pages/LoginPage.jsx`:
    - `INPUT_FIELDS`의 `id` 너비를 `15.2%`에서 `17.5%`로 확장하여 긴 이메일이 잘리지 않도록 개선.
    - 발바닥 눈 버튼(`eye`) 히트 영역의 너비와 높이를 `width: 2.2%`, `height: 3.8%`, `left: 59.2%`로 최적화하여 클릭 범위를 넓힘.
    - 발바닥 클릭 타이머를 `useRef`(`eyeTimerRef`)로 관리하고 컴포넌트 언마운트 시 클린업 로직 추가.
    - 소셜 로그인 구분선 영역 제거.
- **검증**:
  - `npx tsc --noEmit` 통과 (0 errors).
  - `npm run lint` 통과 (기존 경고 6건 외 신규 경고/에러 0건).

## 2026-09-18: 해커톤 게스트 체험 모드(Guest JWT 발급, 조용한 갱신 및 UI 제한) 구현
- **배경**: 인증 생략에 따른 데이터 파이프라인 결함을 방지하기 위해 임시 출입증인 '게스트 JWT' 발급(`role: "guest"`, `sub: "guest-{uuid}"`) 및 조용한 갱신을 지원하고 게스트용 UI 쓰기 제한 및 403 에러 토스트 팝업 연동.
- **수정 내용**:
  - `app/api/authApi.js`:
    - `parseJwtPayload(token)`: base64url 디코더를 구현하여 JWT에서 `role`과 `sub`을 안전하게 파싱.
    - `loginAsGuest(guestId)`: `POST /api/v1/auth/guest` 호출 및 토큰/클레임 메모리 등록.
    - `refreshAccessToken()`: 게스트 세션일 때 기존 `guest_id(sub)`를 요청 바디에 담아 백그라운드에서 조용히 갱신 처리 (채팅 끊김 방지).
    - `authFetch()`: `_retry: true` 플래그로 401 Silent Refresh 무한 루프 1회 재시도 방어 및 403 발생 시 공통 토스트(`"체험 모드에서는 지원하지 않는 기능입니다"`) 알림 트리거.
  - `app/components/Toast.jsx`, `app/components/toastContext.js`, `app/components/Toast.css`:
    - 전역 토스트 Context 및 모듈 레벨에서 즉시 호출 가능한 `showGlobalToast()` 인프라 구축.
    - `App.jsx` 최상단에 `ToastProvider` 래핑.
  - `app/store/AuthProvider.jsx`:
    - 전역 Auth Context에 `role`, `isGuest` (`role === 'guest'`) 및 `loginAsGuest()` 노출.
    - 세션 복원 시 게스트 상태 유지 지원.
  - `app/pages/LoginPage.jsx`, `LoginPage.css`:
    - 로그인 하단 간편 로그인 영역에 `[🐾 DPYB 체험하기 (로그인 없이 둘러보기)]` CTA 버튼 추가 및 클릭 시 게스트 로그인 후 서재 진입 연동.
  - `app/pages/MyPage.jsx`:
    - 게스트 모드일 때 '비밀번호 변경', '계정 탈퇴' 폼과 버튼을 숨기고 "체험 모드 이용 중" 안내 박스 표시.
  - `app/features/room/BookDetail.jsx`:
    - 게스트 모드일 때 서재 도서 '삭제' 버튼 숨김 처리.
  - `app/components/Gnb.jsx`:
    - 게스트 로그인 시 로고 옆에 `🐾 체험 모드` 뱃지 렌더링.
- **검증**:
  - `npx tsc --noEmit` 통과 (0 errors).
  - `npm run lint` 통과 (기존 경고 6건 유지, 신규 에러/경고 0건).
  - `npm run build` 번들 정상 빌드 확인.

## 2026-09-18: 월간 독서 리포트 레거시 막대 버전 제거 및 Recharts 시각화 차트 기반 단일화
- **배경**: 팀 논의 결과 Recharts 기반 시각화(02 주간 흐름 곡선 그래프, 03 장르 점유율 도넛 차트, 06 날씨별 베스트 도서 매핑 Grid 카드)를 기본이자 단일 뷰로 채택하기로 결정됨에 따라, 임시로 보존했던 레거시 막대그래프 버전 및 비교 스위치 제거
- **수정 내용**:
  - `app/pages/MonthlyReport.jsx`:
    - `isLegacyView` 상태 및 액션 바 내 `[📊 Recharts 시각화 뷰로 보기 / ↩️ 원본 막대 뷰로 보기]` 토글 버튼 제거
    - 02번 카드(독서 리듬), 03번 카드(독서 취향), 06번 카드(날씨와 책)의 `isLegacyView` 삼항 연산자 조건부 분기를 걷어내고 Recharts 차트/Grid 컴포넌트만 직접 렌더링하도록 정리
  - `app/pages/MonthlyReport.css`:
    - 미사용 레거시 토글 버튼(`.report-view-toggle-btn`) 및 미사용 그리드 클래스(`.rhythm-grid`) 정리
  - 파일 삭제:
    - `app/pages/MonthlyReport.legacy.jsx` 및 `app/pages/MonthlyReport.legacy.css` 완전 삭제
- **검증**:
  - `npx tsc --noEmit` 통과 (0 errors)
  - `npm run lint` 통과 (기존 경고 6건 유지, 신규 경고/에러 0건)
  - `npm run build` 번들 정상 빌드 확인

## 2026-09-18: 월간 독서 리포트 추천 도서 장르 한글 매핑 정규화
- 작업 브랜치: `fix/monthly-report-genre-mapping`
- **배경**: 월간 독서 리포트 08번 카드(다음 달 독서 처방) 추천 도서 카드에서 장르가 `#NATURAL_SCIENCE`와 같이 백엔드 영문 Enum 코드로 노출되는 결함 해결
- **수정 내용**:
  - `app/api/reportApi.js`:
    - `data/genres.js`의 `genreLabel()` 유틸 함수 임포트
    - 백엔드 DTO 정규화 어댑터 `normalizeMonthlyReport`에서 `prescription.books[].genre`를 `genreLabel(b.genre) || b.genre`로 변환하여 한글명(`자연과학` 등)으로 공급
    - `prescription.recommendedGenre`, `taste.tags`, `taste.genreStats[].name`, `balance.dominantGenre`, `balance.unreadGenres` 등 리포트 내 모든 장르/태그 필드에도 일괄 한글 라벨 정규화 적용
  - `app/pages/MonthlyReport.jsx`:
    - 08번 카드 추천 도서 목록 렌더링 시 `#{genreLabel(book.genre) || book.genre}` 방어 코드 적용
    - 추천 장르 테마 배너 `genreLabel(prescription?.recommendedGenre)` 적용
    - `taste.genreStats` 로컬 정규화 매핑에도 `genreLabel()` 보강
  - `app/pages/MonthlyReport.legacy.jsx`:
    - 레거시 뷰 추천 도서 카드 및 추천 테마 배너에도 동일하게 `genreLabel` 적용
- **검증**:
  - `npx tsc --noEmit` 타입 검사 통과 (0 errors)
  - `npm run lint` 통과 (기존 경고 6건 유지, 신규 경고/에러 0건)

## 2026-09-18: Google & Kakao 소셜 로그인 연동 및 기본 UI 레이아웃(와꾸) 구현
- 작업 브랜치: `feat/social-login-google-kakao`
- **원격 동기화**: `develop` 최신 커밋(`88be5ad`: 사서 프로필 카드 정렬 및 문구 정리) fast-forward 머지 후 작업 브랜치 분기
- **API 클라이언트 함수 추가 (`app/api/authApi.js`)**:
  - `loginWithGoogle(idToken)`: Google Identity Services credential 토큰을 `POST /api/v1/auth/social/google` 전송 및 access_token 메모리 등록
  - `loginWithKakao(kakaoAccessToken)`: Kakao JS SDK access_token을 `POST /api/v1/auth/social/kakao` 전송 및 access_token 메모리 등록
- **전역 상태 Provider 연동 (`app/store/AuthProvider.jsx`)**:
  - `loginWithGoogle`, `loginWithKakao` 메서드를 구현하여 `useAuth()` 훅에 노출
  - 개발 우회 모드(`AUTH_BYPASS`) 시에도 더미 소셜 사용자 계정으로 로그인되어 원활한 화면 전환 테스트 지원
- **소셜 인증 SDK 유틸 구현 (`app/utils/socialAuth.js`)**:
  - Google Identity Services SDK 동적 로더 및 `renderGoogleButton`, `triggerGoogleLogin` 구현
  - Kakao JavaScript SDK(2.7.4) 동적 로더 및 `triggerKakaoLogin` 팝업 로그인 구현
- **로그인 페이지 UI 레이아웃 (`app/pages/LoginPage.jsx`, `LoginPage.css`)**:
  - 기존 2560x1440 일러스트 레이어 및 비밀번호/로그인/회원가입 버튼에 영향을 주지 않도록 하단 중앙(`.login-social-container`)에 구분선 및 Google / Kakao 심플 버튼 와꾸 배치
  - 소셜 로그인 성공 시 대상 페이지(`from` / 기본 `/library`) 리다이렉트 연동
  - 추후 팀원/디자이너가 최종 전용 그래픽 버튼으로 교체하기 용이하도록 컴포넌트 및 클래스 분리
- **검증**:
  - `npx tsc --noEmit` 통과
  - `npm run lint` 통과 (기존 경고 6건 유지, 신규 경고/에러 0건)
  - `npm run build` 번들 정상 빌드 확인

## 2026-09-17: 로그인 불가 버그 수정 (AUTH_BYPASS + BooksProvider 401 레이스)

### 근본 원인
- `VITE_AUTH_BYPASS` 미설정 → DEV 모드에서 `AUTH_BYPASS=true`로 평가
- AUTH_BYPASS 로그인은 실제 `accessToken`을 메모리에 올리지 않음
- 로그인 후 `BooksProvider.reload()` → `authFetch('/library/books')` 호출 → 토큰 없어 401
- `authFetch` 401 핸들러가 `refreshAccessToken()` 시도 → refresh 쿠키 없어 실패 → `onSessionExpired()` 호출 → 강제 로그아웃
- 결과: 로그인 성공 직후 즉시 튕기는 무한 루프

### 수정 내용
1. **`app/api/authApi.js` 401 핸들러 수정** (line 161-170):
   - 기존: `accessToken` 유무와 무관하게 refresh 시도 → `onSessionExpired()` 호출
   - 변경: 원래 `accessToken`이 없었던 경우(AUTH_BYPASS 또는 미인증 상태)에는 refresh/`onSessionExpired` 경로를 타지 않고 그냥 `ApiError(401)` throw
   - AUTH_BYPASS 임포트 제거 (unused import)
2. **`.env.local`에 `VITE_AUTH_BYPASS=false` 추가**: 실제 백엔드 로그인 사용
   - `test@test.com` / `password`로 로그인 가능 (백엔드 curl 검증 완료)
3. Vite dev 서버 재시작 완료

### 현재 상태
- Vite: `http://localhost:5173` 실행 중
- 백엔드: `127.0.0.1:8000` (메인), `127.0.0.1:8001` (AI) 실행 중
- `test@test.com` / `password`로 로그인 가능 여부 사용자 검증 필요
- 브랜치: `feat/librarian-chat-session-isolation`

## 2026-09-14: DPYB 조직 마이그레이션 및 프론트엔드 리팩토링
- 기존 저장소에서 AWS 의존성(배포 워크플로우 및 문서) 제거 완료
- `my-reading-room/` 서브디렉터리 구조를 프로젝트 루트로 평탄화(Flattening)
- 소스 디렉터리를 `src/`에서 `app/`으로 마이그레이션 및 path alias(`@`) 설정
- 패키지 식별자를 `frontend-reader-web`으로 변경
- TypeScript 점진적 도입 환경 구축 (`tsconfig.json`, `npm run typecheck`, TS7 및 ESLint 지원)
- 팀원 시각 에셋 보호를 위한 우클릭 방지, 드래그 차단, `ASSETS_LICENSE.md`, `public/README.md` 적용
- DPYB 듀얼 백엔드(`backend-core-api`, `backend-ai-agent`) 연동을 위한 Vite 프록시 및 `.env.example` 개편
- DPYB 조직 바이브 코딩 하네스(`.harness/`, `AGENTS.md`) 및 CI 워크플로우 적용

## 2026-09-15: 개발 단계용 인증 우회 스위치 도입
- 인증 백엔드 미연동 상태에서 로그인 화면에 막혀 서재/등록/마이페이지를 확인할 수 없던 문제 해소
- `app/store/authBypass.js` 신설 — `VITE_AUTH_BYPASS`(true/false/미설정) 판정과 가짜 회원(`BYPASS_MEMBER`) 정의
- `AuthProvider`: 우회 시 refresh 복원 스킵, `login()`은 API 호출 없이 즉시 authenticated, `logout()`은 로컬 상태만 정리
- `LoginPage`: 우회 시 이메일/비밀번호 입력 검증 없이 로그인 버튼 활성화 + 좌측 상단에 개발 모드 배지 표시
- 기본값을 `import.meta.env.DEV`로 두어 프로덕션 빌드에는 우회가 실리지 않도록 방어

## 2026-09-15: 월간 독서 리포트 뷰 & 날씨 전송 & 원클릭 PDF 다운로드 구현
- 독서 기록 작성(`POST /api/v1/records`) 연동 및 Geolocation 기반 날씨 condition(`clear`, `rainy`, `cloudy` 등) 페이로드 전송 로직 구현
- AI Agent 월간 리포트 API 클라이언트(`app/api/reportApi.js`) 및 Vite 개발 프록시(`/api/v1/reports`, `/api/v1/records`) 설정
- 월간 독서 리포트 페이지(`MonthlyReport.jsx`, `MonthlyReport.css`) 구현:
  - 01~07번 완성형 와꾸 카드 렌더링 (한눈에 보기, 독서 리듬 차트, 취향/키워드 태그, 밸런스 게이지, 독서 흔적/인용구, 사서 말풍선, 다음 달 독서 처방)
  - 상단 타이틀 및 말풍선에 현재 활성화된 사서(블루/슈빌) 페르소나 및 닉네임 동적 반영
- `html2canvas` + `jspdf` 기반 클라이언트 사이드 원클릭 PDF 다운로드 유틸(`app/lib/pdfExport.js`) 및 인쇄 미디어 쿼리(Print Media) 적용:
  - 현재 사서명 기반 동적 파일명 `"{사서이름}_사서의_월간_독서_리포트.pdf"` 다운로드 지원
- 라우팅(`/reports`) 및 GNB 상단 메뉴에 '독서 리포트' 탭 추가
- `npm run lint`, `npm run typecheck`, `npm run build` 검증 완료

**다음 세션 시작 시**: 신규 백엔드 스펙에 맞춘 '사서 토론 모드 UI' 및 '독서 타이머 기능' 와꾸와 연동 작업 착수 (인증 백엔드 연동 완료 시 `BACKLOG.md`의 우회 제거 항목 함께 처리)

## 2026-09-15: 사서 특화 장르 KDC 개편 + 신규 사서 2종(누디/게코) 임시 추가
- 백엔드 `GenreType` enum(총류/철학/종교/사회과학/자연과학/기술과학/예술/언어/문학/역사, KDC 10대 대분류)에 맞춰
  `app/data/genres.js`의 `GENRE_DEFS`를 기존 15개 세부 장르 체계에서 이 10개로 전면 교체.
  - aliases에 기존 세부 키워드(소설·에세이·시·희곡·미스터리·SF·판타지·로맨스 등)를 문학으로,
    심리학·자기계발을 철학으로, 경제·경영·비즈니스를 사회과학으로, IT·컴퓨터·건강·요리를
    기술과학으로 흡수시켜 로컬 fallback 검색(`detectGenreCode`)이 계속 동작하게 함
  - '과학'은 자연과학 단독 별칭에서 제외(과학소설/SF와의 오분류 방지)
- `app/data/librarians.js`: 사서당 특화 장르가 여러 개일 수 있도록 `specialtyCode`(단수) →
  `specialtyCodes`(배열)로 구조 변경. 파생 필드(`specialtyGenre`, `specialty`)는 여러 장르를
  '·'로 이어붙여 표시 (예: "총류·철학·종교 장르 추천")
  - 블루: 총류·철학·종교 / 슈빌: 자연과학·기술과학 (기존 미스터리·스릴러, 비즈니스·경제에서 교체)
  - 신규 사서 **누디**(바다달팽이/갯민숭달팽이, id: `nudi`) 추가 — 예술·문학 특화, 기본 닉네임 "누디"
  - 신규 사서 **게코**(id: `gecko`) 추가 — 사회과학·언어·역사 특화, 기본 닉네임 "게코"
  - `typeCode`(`SEA_SLUG`, `GECKO`)는 백엔드 `librarian_type` enum에 아직 없는 임시값 — 백엔드 확정 필요
  - `findLibrarianByKeyword`가 사서별 `commonNames`(예: '고양이', '황새', '달팽이', '도마뱀') 배열을
    참조하도록 일반화(기존엔 cat/stork를 코드에 하드코딩)
  - `librarianForGenre`도 배열 매칭(`specialtyCodes.includes`)으로 변경
- `app/features/room/chatEngine.js`: `librarian.specialtyCode` → `specialtyCodes[0]`(대표 장르) 및
  `includes()` 매칭으로 수정. `librarian.id === 'cat' ? '냥' : ''` 하드코딩을 `librarian.speechInterjection`
  필드로 대체(사서가 2종에서 4종으로 늘어나며 사서별 어미를 데이터로 관리)
- `app/features/room/LibrarianChat.jsx`: 로딩 문구에서 '블루 사서'를 하드코딩하던 부분을
  일반화된 '사서'로 수정 (신규 사서로 채팅해도 엉뚱한 이름이 뜨지 않도록)
- 프로필 사진: 누디·게코는 실제 일러스트가 없어 `public/profile/{nudi,gecko}-placeholder.svg`
  임시 이미지(이모지 + "임시 이미지" 라벨) 배치. `image`/`imageHover`(3D 서재 커서 스프라이트)와
  전용 서재 배경(`shelfLayout.js`)·글로우 컬러(`LibraryScene.jsx`)는 아직 없어, 서재 진입 시
  고양이 서재 배치로 대체 표시됨(librarians.js 상단 주석에 후속 작업 지점 명시)
- `npm run typecheck`, `npm run lint`(기존 warning 5건만 유지), `npm run build` 통과 확인

**다음 세션 시작 시**: 백엔드와 `librarian_type` enum에 `SEA_SLUG`/`GECKO`(또는 확정된 코드명) 값을
맞춘 뒤 `librarians.js`의 `typeCode`를 교체. 누디·게코의 실제 프로필 일러스트·3D 서재 커서
스프라이트·전용 배경이 나오면 placeholder를 교체하고 `shelfLayout.js`/`LibraryScene.jsx`에
배치를 추가.

## 2026-09-15: 사서 프로필 페르소나 콘텐츠 보완 + 카드 4열 고정 그리드
- 기획팀 "사서 페르소나 개요" 문서를 반영해 `app/data/librarians.js`의 각 사서에 필드 추가:
  `mbti`, `oneLiner`(한 줄 요약), `personality`(성격), `readingStyle`(독서 성향),
  `speechStyle`(말투·행동), `catchphrase`(페르소나 핵심 문장)
  - 블루 INTJ(사색가) / 슈빌 ISTP(실용적 탐구자) / 누디 INFP(감성가) / 게코 ENFJ(공감형 탐구자)
  - 종결어미(`speechInterjection`)도 문서에 맞춰 갱신: 누디 '누누', 게코 '크크' (기존 미지정 → 확정)
  - ⚠️ 문서의 종결어미 예시 문장은 반말체("~다두둥")인데 슈빌의 기존 `formalTone: true`
    (존댓말 채팅 UI)와 어긋난다. 이번엔 프로필 표시 텍스트만 반영하고 채팅 응답 말투는
    건드리지 않았음 — 필요 시 별도 작업으로 슈빌 존댓말 정책을 재검토해야 함
- `app/pages/LibrarianProfiles.jsx`: MBTI 배지 + 한 줄 소개, 성격/독서 성향/말투·행동 섹션,
  페르소나 핵심 문장(인용구 스타일)을 카드에 추가 렌더링
- `app/pages/LibrarianProfiles.css`: 그리드를 `auto-fill`(가변 열)에서 `repeat(4, 1fr)` 고정
  4열로 변경해 카드 4개가 항상 한 줄에 나란히 놓이고 5번째부터 다음 줄로 내려가도록 함.
  1024px 이하 2열, 560px 이하 1열 반응형 유지. 새로 추가된 텍스트 섹션에 맞는 스타일
  (`.lp-oneliner`, `.lp-mbti`, `.lp-persona`, `.lp-catchphrase`) 추가
- `npm run typecheck`, `npm run lint`(기존 warning 5건만 유지), `npm run build` 통과 확인

**다음 세션 시작 시**: 슈빌의 존댓말(`formalTone`) 정책과 페르소나 문서의 반말 종결어미
예시가 어긋나는 부분을 기획팀과 재확인 필요.

## 2026-09-15: 사서 어미 띄어쓰기 통일 + 프로필 카드 말투·행동 문단 제거
- 사용자 피드백 반영: 사서 종결어미(냥/두둥/누누/크크)를 단어에 바로 붙이지 않고
  앞말과 띄어 쓰도록 전체 수정 (예: "무엇을 찾아드릴까요냥?" → "무엇을 찾아드릴까요 냥?")
  - `app/data/librarians.js`의 `catchphrase` 4건, `app/features/room/chatEngine.js`,
    `app/features/room/LibrarianChat.jsx`, `app/features/room/LibrarianCursor.jsx`,
    `app/pages/MonthlyReport.jsx`의 어미 부착 문구를 모두 띄어쓰기로 통일
  - `docs/*.md`(설계 문서)의 예시 문구는 과거 결정 기록이라 손대지 않음
- `app/data/librarians.js`: 프로필에 노출하던 `speechStyle`(말투·행동 설명 문단) 필드 제거.
  대표 어미 예시 문장인 `catchphrase`만 프로필에 남김 (사용자 요청)
- `app/pages/LibrarianProfiles.jsx`: 말투·행동 `<dd>` 렌더링 제거
- `npm run typecheck`, `npm run lint`(기존 warning 5건만 유지), `npm run build` 통과 확인

## 2026-09-15: 사서 프로필 카드 정리 (말투/MBTI 제거, 성격·독서성향 아코디언)
- 사용자 피드백 반영:
  - 특화 장르 아래 '말투'(persona) 행 제거 — `persona` 데이터 필드도 사용처가 없어 함께 삭제
  - MBTI 표시 제거 — 프로필의 MBTI 배지와 `.lp-mbti` 스타일, 각 사서의 `mbti` 데이터 필드 삭제
    (한 줄 소개 `oneLiner`는 유지)
  - 성격·독서 성향은 문단이 길어 `<details>`/`<summary>` 네이티브 아코디언으로 접어 둠
    (기본 닫힘, "성격 · 독서 성향 보기" 클릭 시 펼침). 커스텀 화살표(▾) 마커 스타일 추가
- 변경 파일: `app/data/librarians.js`(persona·mbti 필드 및 헤더 주석 정리),
  `app/pages/LibrarianProfiles.jsx`(말투 행·MBTI 배지 제거, 아코디언 도입),
  `app/pages/LibrarianProfiles.css`(`.lp-mbti` 제거, `.lp-details`/`.lp-details-summary` 추가)
- `npm run typecheck`, `npm run lint`(기존 warning 5건만 유지), `npm run build` 통과 확인

## 2026-09-15: 독서 리포트 라이트 모드 대비 수정 + 구분자 & → 가운뎃점
- 라이트 모드에서 리포트 카드·월 선택 드롭다운 등이 어둡게 떠 안 보이던 문제 해결:
  - 원인은 `MonthlyReport.css`가 앱 테마에 없는 `--bg-card` 변수와 다크 계열 하드코딩
    fallback(`#0f172a`, `#1e293b`, `#334155` 등)을 써서, 라이트 테마에서도 다크 슬레이트
    색이 그대로 적용된 것
  - 모든 색을 앱 테마 변수(`--bg`/`--code-bg`/`--border`/`--text`/`--text-h`/`--accent*`)로
    교체. 표면 위계를 페이지(--bg) < 시트(--code-bg) < 카드(--bg) < 내부 박스(--code-bg)로
    번갈아 두어 라이트/다크 양쪽에서 카드가 구분되게 함
  - 월 선택 `<select>`와 `option`에 테마 배경/글자색을 명시(일부 브라우저가 option에 배경을
    상속하지 않아 라이트에서 흰 바탕+흰 글씨가 되는 것 방지)
  - `MonthlyReport.jsx`의 인라인 `var(--accent, #818cf8)` fallback도 정리
  - 사용자가 예시로 든 다크 계열 accent(#10b981/#f59e0b), 버튼 흰 글씨, @media print 블록은
    의도된 값이라 유지
- 카드 제목 구분자 " & "를 가운뎃점 " · "로 교체 (03·04·05·07번 카드 4곳)
- `npm run typecheck`, `npm run lint`(기존 warning 5건만 유지), `npm run build` 통과 확인
- ⚠️ 브라우저에서 라이트/다크·사서별(고양이/황새 테마) 실제 렌더링 육안 확인은 미완 —
  코드상 테마 변수로 통일했으나 실제 대비는 화면 확인 권장

## 2026-09-15: 누디·게코 실제 프로필 이미지 적용
- 사용자가 `public/cursors/snail/nudi.JPG`(누디), `public/cursors/gecko/gecko.JPG`(게코)로
  올린 사서 프로필 이미지를 `public/profile/nudi.jpg`, `public/profile/gecko.jpg`로 이동
  (기존 cat/stork 프로필과 같은 위치·명명 규칙). 비게 된 `cursors/snail`·`cursors/gecko` 폴더 삭제
- `app/data/librarians.js`: 누디·게코의 `profileImage`를 placeholder SVG에서 실제 이미지 경로로
  교체. 임시 placeholder(`nudi-placeholder.svg`, `gecko-placeholder.svg`) 삭제
- `app/pages/LibrarianProfiles.css`: `.lp-avatar img`의 `object-fit`을 `contain`→`cover`로 변경.
  기존 정사각 일러스트뿐 아니라 비율이 다른 실사진(누디=가로형, 게코=세로형)도 원형 아바타를
  여백 없이 채우도록 함 (GNB 프로필과 동일 방식)
- 남은 후속: 3D 서재용 커서 스프라이트(image/imageHover)와 전용 서재 배경은 아직 없음(BACKLOG 유지)
- `npm run typecheck`, `npm run lint`(기존 warning 5건만 유지), `npm run build` 통과 및 dist/profile에
  새 이미지 포함 확인

## 2026-09-16: 독서 집중 타이머 기능(스톱워치/뽀모도로) 및 코어 서버 연동 구현
- 독서 집중 타이머 모달 컴포넌트(`ReadingTimerModal.jsx`, `ReadingTimerModal.css`) 구현:
  - 서재 화면 우측 하단 플로팅 액션 버튼(FAB) 및 도서 상세 화면(`BookDetail.jsx`) '독서 타이머' 버튼 진입점 제공
  - 스톱워치(자유 카운트업) 모드 및 뽀모도로(15분/25분/50분 집중 인터벌 카운트다운) 모드 지원
  - 타이머 시작, 일시정지, 리셋, 독서 완료 인터랙션 및 상태 표시 펄스 애니메이션
- 독서 완료 후 페이지 및 기록 저장 연계:
  - 읽은 시간(분 단위) 자동 산출 및 어디까지 읽었는지 현재 페이지 입력란 제공
  - 한 줄 감상 및 날씨 조건 자동 첨부 지원
  - 코어 서버 API 연동: 진행률 갱신(`saveReadingProgress`) 및 독서 기록 작성(`POST /api/v1/records`) 동시 호출
  - 저장 완료 시 전역 서재 상태(`reload()`) 동기화
- `npm run typecheck`, `npm run lint`(기존 경고 5건만 유지), `npm run build` 통과 확인

## 2026-09-16: 사서 챗봇 내 Core API 내 서재 빠른 조회 모드 & AI 토론 모드 UI 구현
- 사서 챗봇(`LibrarianChat.jsx`, `LibrarianChat.css`) 상단 3개 모드 탭 구성:
  - `[ 📚 내 서재 | 💬 대화·추천 | 💡 사서 토론 ]`
- **📚 내 서재 빠른 조회 모드 (Core API 즉시 필터 & 백엔드 AI 에이전트 자연어 질의 지원)**:
  - 상단 검색창: 코어 서버 서재 데이터(`booksStore`) 기반으로 LLM 호출 대기 없이 제목/저자 즉시 필터링 및 진행률 렌더링
  - 하단 메시지 입력창: 내 서재 모드에서도 입력창을 노출하여 사용자가 자연어("읽고 있는 책 목록 보여줘", "김영하 작가 책 있어?" 등)로 질문 시 AI 백엔드 에이전트(`search_my_library`)로 전송되어 지능적인 질의응답 및 결과 카드 서빙
  - 목록 및 답변 카드에서 [책 열기 ➔] 원클릭 시 3D 서재 도서 상세 팝업(`BookDetail`) 즉시 연동
- **💡 사서 토론 모드 (AI Agent 4인 전문 토론자 연동)**:
  - AI 에이전트 백엔드(`backend-ai-agent`)의 4인 토론 파트너(`DEBATE_CRITIC`: 평론가/이동진 오마주, `DEBATE_STORYTELLER`: 이야기꾼/설민석 오마주, `DEBATE_COUNSELOR`: 상담사/오은영 오마주, `DEBATE_OBSERVER`: 관찰가/강형욱 오마주) 레지스트리(`app/data/debatePersonas.js`) 정의
  - 도서 선택 후 하단에 4인 전문 토론자 선택 카드 그리드 구성 (각 토론자별 성향/역할/오마주 태그 노출)
  - 질문 전송 시 `mode: 'DEBATE'`, `persona: debaterPersona`, `book_id` 파라미터 전달 연동
- `npm run typecheck`, `npm run lint`(기존 경고 5건만 유지), `npm run build` 통과 확인

**다음 세션 시작 시**: 토론 종료 버튼 및 피날레 도서 큐레이션 수신 UI 연계 검토

## 2026-09-16: AI 독서 토론 피날레(종료) 및 맞춤 도서 큐레이션 연동
- 작업 브랜치: `feat/debate-finale-curation`
- **토론 피날레 UI 및 트리거 액션 구현**:
  - `LibrarianChat.jsx`: 사서 토론 탭 내 도서/토론자 선택 영역 하단에 `[🏁 토론 마무리 및 맞춤 책 추천받기]` 버튼 추가
  - `handleConcludeDebate()`: 선택된 토론자 페르소나 및 대상 도서명을 바탕으로 마무리 총평 및 추천 도서 요청 문구를 조합하고 백엔드에 `action: 'conclude'` 파라미터 전송
  - `getContextualLoadingMessage`: 토론 마무리/피날레 질문 패턴 감지 시 사서별 맞춤 갈무리 대기 멘트 반환
- **토론 피날레 큐레이션 렌더링 & 서재 기억 저장 연계**:
  - `chatApi.js`: 응답의 `is_concluded`, `debate_summary` 필드를 프론트엔드로 안전하게 매핑
  - `LibrarianChat.jsx` / `LibrarianChat.css`:
    - 피날레 완료 시 `[🧠 토론 인사이트가 서재 기억에 저장되었습니다]` 뱃지 및 토론 요약 인용구(`debate_summary`) 강조 렌더링
    - 백그라운드 태스크(`agent.debate_insights` 벡터 저장)와 시각적 상태 완벽 일치화
    - 후속 엄선 추천 도서(`recommended_books`) 카드 자동 렌더링 및 `[등록 ➔]` 원클릭 서재 등록 연동
- **UI 스타일링**:
  - `LibrarianChat.css`: `.lc-debate-conclude-btn` 및 `.lc-debate-concluded-badge` 그라디언트/인터랙션 애니메이션 스타일링 추가
- `npm run typecheck`, `npm run lint`(기존 경고 5건 유지, 에러 0건), `npm run build` 통과 완료
- PR #8(`feat[room]: AI 독서 토론 피날레 및 도서 큐레이션 연동`) 생성, CI 및 DPYB PR 린터 전체 Pass 확인 후 `develop`에 머지 완료

## 2026-09-16: DPYB 하네스 v2 표준 반영 및 Git pre-commit 훅 설정
- DPYB 조직 표준(`.github/docs/03-vibe-coding-harness.md`) 개정 내용 동기화:
  - `.githooks/pre-commit` 훅 스크립트 추가 (소스 코드 수정 시 `STATE.md` 누락 방지 non-blocking 안내) 및 실행 권한(`chmod +x`) 부여
  - `package.json` scripts에 `"prepare": "git config core.hooksPath .githooks || true"` 추가하여 협업 시 자동 훅 경로 등록
  - 로컬 git 환경 `git config core.hooksPath .githooks` 설정 완료
## 2026-09-17: 사서 토론 UI 버그 수정 및 세로 스크롤 레이아웃 구조 개편
- 작업 브랜치: `fix/debate-layout-persona-name`
- **사서/페르소나 전환 버튼 이름 누락 방어 (`LibrarianChat.jsx`)**:
  - `switchTo` 제안 버튼 텍스트에서 이름이 누락되어 `"로 바꾸기"`로만 노출되던 결함 해결
  - 다단계 안전 fallback 체인(`librarianNames[id]` ➔ `LIBRARIANS` 레지스트리 ➔ `DEBATE_PERSONAS` 레지스트리 ➔ `switchTo.name` / `displayName` ➔ `switchTo.id`) 적용
- **사서 챗봇 세로 무한 확장 방지 및 스크롤 구조 재정립 (`LibrarianChat.jsx`, `LibrarianChat.css`)**:
  - 최상위 컨테이너(`box`): `height: min(700px, calc(100vh - 32px))`, `overflow: hidden`, `display: flex`, `flex-direction: column` 적용하여 뷰포트 하단 밀림 방지
  - 상단 헤더, 모드 탭, 하단 입력 폼에 `flexShrink: 0`을 명시하여 고정 높이 보장
  - 대화 스크롤 영역(`.lc-content-body`)의 `flex: 1 1 auto; min-height: 0; overflow-y: auto` 정상 작동 확보
- **사서 토론 모드 상단 설정 접기/펼치기 아코디언 UX 개선**:
  - 토론 모드 상단 배너(`.lc-debate-banner-clickable`) 클릭 또는 키보드 엔터/스페이스로 도서 셀렉터 및 4인 페르소나 카드 그리드를 접고 펼칠 수 있는 토글 UI 구현
  - 접힌 상태에서도 선택된 페르소나와 도서명이 한 줄 요약(`"🎬 평론가 · 『도서명』"`)으로 표시되어 맥락을 유지하면서 대화 스크롤 가용 영역을 대폭 확대
- `npm run typecheck`, `npm run lint`(기존 경고 5건 유지, 에러 0건), `npm run build` 통과 완료

## 2026-09-17: 장르 매핑 별칭 보강 및 도서 등록 폼 보조 라벨 연동
- **장르 매핑 별칭(`aliases`) 및 한글 라벨 변환 로직 보강 (`genres.js`)**:
  - `GENERAL`(교양): `'교양'`, `'인문교양'`, `'인문/교양'`, `'상식'`, `'잡지'`, `'매거진'`, `'백과사전'`, `'사전'`, `'총류'`, `'총류/교양'` 별칭 체계 구축
  - `PHILOSOPHY`(철학): `'독서법'`, `'글쓰기'`, `'심리'`, `'자기계발'` 등 보강
  - `TECHNOLOGY`(기술과학): `'코딩'`, `'파이썬'`, `'ai'`, `'인공지능'`, `'프로그래밍'`, `'컴퓨터/it'` 등 IT/소프트웨어 키워드 보강
  - `genreLabel()` 함수가 표준 Enum 코드뿐 아니라 국문 텍스트, 세부 주제, 슬래시 복합어 등도 안전하게 감지·변환하도록 fallback 강화
- **도서 등록 폼 내 세부 장르 보존 및 보조 라벨 표시 (`RegisterBook.jsx`)**:
  - `subject`, `displayGenre` 상태 추가 및 AI 추천 도서(`location.state.book`), OCR 도서 검색(`searchBookByIsbn`), 장르 자동 분류(`classifyGenre`) 수신 시 상태 동기화 및 전송 보존
  - `getGenreSubLabel()` 헬퍼 함수 구현: 서버 `displayGenre` 또는 `subject`를 우선 반영하고, `TECHNOLOGY`는 `"기술과학 (컴퓨터/IT)"`, `GENERAL`은 `"교양 (인문교양/상식)"`으로 보조 라벨을 명시
  - 수정 모드(`editing`)의 장르 드롭다운 옵션 및 하단 세부 분야 라벨, 비수정 모드의 컴팩트 뷰에 보조 라벨 통합 반영
- **DTO 및 전역 스토어 연계 (`bookApi.js`, `genreApi.js`, `BooksProvider.jsx`)**:
  - `classifyGenre`: 응답의 `subject`, `display_genre` 필드 추출 반환
  - `createLibraryBook`, `updateLibraryBookMeta`, `addBook`, `saveBookMeta`: `subject` 및 `displayGenre` 파라미터 전달 및 전역 상태 갱신 시 누락 없이 보존
- `npm run typecheck`, `npm run lint`(기존 warning 5건 유지, 에러 0건), `npm run build` 통과 완료

## 2026-09-15: 누디 프로필 이미지 파일명 정규화 + 전역 이미지 저장/복제 방지
- 누디 프로필 이미지: 새로 올린 `public/profile/nudi.JPG`(대문자 확장자)를 소문자
  `nudi.jpg`로 정규화. 코드(`librarians.js`)는 `/profile/nudi.jpg`를 참조하는데 대문자
  파일명은 Windows(대소문자 무시)에선 떠도 CI·프로덕션(Linux, 대소문자 구분)에서 404가
  나므로 실파일을 소문자로 맞춤. (게코는 이미 소문자라 문제 없음)
- 이미지 무단 저장/복제 방지 강화(모든 UI 이미지 대상):
  - `app/main.jsx`: 기존 `<img>` 우클릭 차단을 확장. `contextmenu`를 캡처 단계에서
    가로채 <img>/SVG <image>/<picture>/<canvas>/`.protected-asset`뿐 아니라
    CSS background-image가 실제로 적용된 요소(서재 배경·로그인 배경 등)에서도 차단.
    이미지를 바탕화면으로 끌어 저장하는 경로를 막기 위해 `dragstart`도 캡처 차단
  - `app/index.css`: img/picture/svg/canvas/.protected-asset에 user-drag:none,
    user-select:none, -webkit-touch-callout:none(iOS 롱프레스 저장 메뉴 차단) 추가.
    pointer-events는 건드리지 않아 버튼·링크 클릭은 그대로 동작
  - ⚠️ 완벽한 방지는 불가능(개발자도구·스크린샷 등). 일반적인 우클릭 저장/드래그
    저장/롱프레스 저장 경로를 막는 수준
- 검증: `npx tsc --noEmit` 통과, `npx eslint .` 기존 warning 5건만(0 errors),
  `npm run build` 성공 및 dist/profile에 nudi.jpg(소문자) 포함 확인
- ⚠️ 누디 "내 서재" 테마 배경 이미지(snail2)는 워크스페이스에서 찾지 못해 이번에
  반영하지 못함 — 사용자에게 파일 위치 재확인 요청 예정 (BACKLOG에 남김)

## 2026-09-17: 사서 챗봇 높이 컴팩트 복원, 토론 모드 자동 접힘 및 세션 격리 강화
- 작업 브랜치: `fix/debate-layout-persona-name`
- **챗봇 창 높이 컴팩트 복원 (`LibrarianChat.jsx`)**:
  - `maxHeight: min(420px, calc(100vh - 180px))` 및 `height: auto`로 축소하여 상단 사서 프로필/GNB를 절대 가리지 않고, 본문 내용 길이에 맞춰 유연하게 반응하도록 수정
- **사서 토론 모드 컴팩트 UX 및 피날레 액션 연계 (`LibrarianChat.jsx`, `LibrarianChat.css`)**:
  - 토론 모드 질문 전송 시 도서/4인 카드 설정 영역이 자동으로 100% 접히도록 개선 (`setDebateCollapsed(true)`)
  - 접힌 상태의 상단 한 줄 배너에 `"{아이콘} {토론자명} · 『{도서명}』과 토론 중"` 안내 및 미니 `[🏁 마무리]` 버튼을 탑재하여, 설정을 다시 펼치지 않고도 언제든 즉시 토론 피날레 및 도서 추천을 받을 수 있도록 연결
- **모드별 세션 및 커서 말풍선 실시간 동기화 (`LibrarianChat.jsx`)**:
  - 3개 모드(`library`, `chat`, `debate`) 전환 탭 클릭 시 해당 모드의 독립 답변(`modeAnswers[nextMode]`)을 커서 말풍선(`onAnswer`)에 즉시 반영하여 불일치 및 누적 현상 방지
  - 내 서재 조회 모드 목록 높이(`.lc-library-view`, `.lc-library-list`)도 컴팩트 창에 최적화
- `npm run lint`(기존 warning 5건 유지, 에러 0건), `npm run typecheck` 통과 완료

## 2026-09-17: 메신저형 멀티턴 대화 히스토리 UI 구현 및 토론 모드 내 서재 카드 억제
- 작업 브랜치: `fix/debate-layout-persona-name`
- **메신저형 멀티턴 대화 히스토리 도입 (`LibrarianChat.jsx`, `LibrarianChat.css`)**:
  - 모드별 독립 메시지 배열(`modeMessages: { chat: [], debate: [], library: [] }`) 관리 구조 도입
  - 사용자 질문(`role: 'user'`, 우측 액센트 말풍선)과 사서/토론자 답변(`role: 'assistant'`, 좌측 마크다운 말풍선)이 메신저처럼 순차적으로 쌓이도록 UI 개편
  - 대화 턴이 추가될 때마다 최신 메시지로 자동 부드럽게 스크롤(`messagesEndRef.current.scrollIntoView`) 연동
  - 추천 도서 등록 후 뒤로가기나 새로고침 시에도 대화 히스토리가 유지되도록 `sessionStorage` 동기화 구조 확장
- **토론 모드 내 서재 도서 카드 억제 (`LibrarianChat.jsx`)**:
  - 토론 모드(`chatMode === 'debate'`)에서는 서재에 있는 책이라도 `[📖 내 서재 도서: 책 열기]` 카드를 띄우지 않고, 오직 깊이 있는 도서 토론 및 마무리 추천 도서에만 집중되도록 조건 분기 적용
- `npm run lint`(기존 warning 5건 유지, 에러 0건), `npm run typecheck` 통과 완료

## 2026-09-17: 도움말(?) 아이콘 및 날씨/시간대/무드 태그 상단 고정 바 분리
- 작업 브랜치: `fix/debate-layout-persona-name`
- **도움말(?) 아이콘 최상단 헤더 고정 (`LibrarianChat.jsx`)**:
  - 본문 스크롤 영역에 흩어져 대화가 길어지면 위로 밀려 사라지던 `?` 아이콘을 최상단 헤더(사서명과 ✕ 닫기 버튼 사이)로 고정 배치
  - 마우스 호버 시 현재 활성화된 모드(`chat`, `library`, `debate`)에 맞춘 전용 가이드(추천 질문 팁 / 서재 검색 팁 / 4인 토론 가이드)를 동적으로 분기 노출
- **날씨·시간대·무드 태그 상단 고정 및 모드 분기 (`LibrarianChat.jsx`)**:
  - 본문 내부 스크롤 영역에서 탭 바로 아래 상단 고정 영역(`flexShrink: 0`)으로 이동하여, 대화를 많이 나눠도 날씨/무드 컨텍스트가 항상 시야에 고정 유지되도록 개선
  - 날씨 연계 추천 모드(`chatMode === 'chat'`)에서만 노출하고, 서재 조회나 책 토론 모드에서는 시각적 노이즈를 줄이기 위해 숨김 처리
- `npm run lint`(기존 warning 5건 유지, 에러 0건), `npm run typecheck` 통과 완료

## 2026-09-17: 모든 동물 사서 커서 말풍선 6초 자동 소멸 및 독서 세션 전용 히스토리 테이블 연동
- 작업 브랜치: `fix/debate-layout-persona-name`
- **모든 사서 커서 말풍선 6초 자동 사라짐 구현 (`LibrarianCursor.jsx`, `LibrarianCursor.css`)**:
  - 고양이(블루)뿐만 아니라 황새(슈빌), 누디, 게코 등 모든 사서가 공유하는 `LibrarianCursor`에 `prevBubbleText` 변경 감지 및 6초(`BUBBLE_DURATION_MS = 6000`) 타이머(`useEffect` + `setTimeout`) 연동
  - 새 메시지 수신 시 타이머 자동 리셋 및 CSS 부드러운 등장(`librarian-bubble-fadein`) 트랜지션 적용
- **독서 타이머 전용 세션 API 연동 및 폴백 지원 (`recordApi.js`, `ReadingTimerModal.jsx`)**:
  - 백엔드 신규 스펙인 `POST /api/v1/books/{id}/reading-sessions` 및 `GET /api/v1/books/{id}/reading-sessions`를 우선 호출하고, 미배포 환경에서는 기존 `POST/GET /api/v1/records`로 투명하게 fallback 되도록 `createReadingSession`, `fetchReadingSessions` 구현
  - `ReadingTimerModal`에서 타이머 완료 시 `createReadingSession`을 호출하고 완료 콜백(`onSavedSession`)을 트리거
- **문장수집과 분리된 도서 상세 독서 타이머 세션 전용 UI 구축 (`BookDetail.jsx`, `ReadingSessionHistory.jsx`, `ReadingSessionHistory.css`)**:
  - 도서 상세(`BookDetail`) 우측 패널에 `[ 📸 수집한 문장 | ⏱️ 독서 타이머 기록 ]` 탭 전환 헤더 추가
  - `ReadingSessionHistory` 컴포넌트:
    - 상단 누적 통계 바 (총 집중 시간, 완료한 세션 횟수, 미니 [⏱️ 타이머 시작] 버튼)
    - 독서 세션 히스토리 테이블 (일시 & 날씨 배지, 집중 시간 뱃지, 도달 페이지, 감상 메모/생각)
    - 빈 상태(Empty State) 시 타이머 시작 유도 CTA 버튼 제공
  - 타이머 모달에서 저장 완료 시 우측 탭이 자동으로 `⏱️ 독서 타이머 기록`으로 전환되고 목록이 실시간 갱신되도록 연계
- `npx tsc --noEmit` 통과, `npm run lint`(기존 warning 5건 유지, 에러 0건), `npm run build` 번들 검증 완료

## 2026-09-17: 독서 진행률 1% 이상 도서의 '시작전' 상태 불일치 해결
- 작업 브랜치: `fix/debate-layout-persona-name`
- **상태 변환기 자동 승격 로직 도입 (`bookApi.js`)**:
  - `toKoreanStatus(readingStatus, progress = 0)`: 코어 서버 DB에 아직 `PLANNED`로 남아 있더라도, `progress > 0`인 경우 화면상에서 자연스럽게 `'읽는 중'`으로 승격하도록 안전 장치 적용
- **전역 스토어 및 카드 렌더링 연동 (`BooksProvider.jsx`, `LibrarianChat.jsx`)**:
  - `toFrontBook`: 서버 목록 응답 변환 시 `summary.progress`를 함께 전달하여 `status`가 실시간으로 `'읽는 중'`으로 정규화되도록 반영
  - `saveReadingProgress`: 진행률 갱신 시 `res.progress > 0`이고 기존 상태가 `'시작전'`이면 전역 상태도 즉시 `'읽는 중'`으로 동기화
  - `LibrarianChat`: 내 서재 추천 카드 렌더링 시 `b.progress`를 전달하여 `[시작전 · 1%]` 대신 `[읽는 중 · 1%]`로 정확히 표기
- **타이머 및 도서 상세 저장 시 서버 메타데이터 동기화 (`ReadingTimerModal.jsx`, `BookDetail.jsx`)**:
  - `ReadingTimerModal`: 타이머 종료 후 1쪽 이상 저장(`pageNum > 0`) 시 서버 도서 상태도 `READING`(읽는 중)으로 명시적 승격 저장 호출
  - `BookDetail`: 현재 페이지 입력 저장(`cur > 0`) 시 서버 메타데이터의 `readingStatus`를 `READING`으로 함께 동기화
- `npx tsc --noEmit` 통과, `npm run lint`(기존 warning 5건 유지, 에러 0건), `npm run build` 번들 검증 완료

## 2026-09-17: AI 백엔드 월간 독서 리포트 스키마 정규화 및 실데이터 연동
- 작업 브랜치: `fix/report-schema-adapter`
- **백엔드 DTO ↔ 프론트엔드 UI 정규화 어댑터 도입 (`reportApi.js`)**:
  - AI 에이전트 백엔드(`backend-ai-agent`)의 `MonthlyReportResponse` Pydantic DTO 스키마와 프론트엔드 UI 기대 규격 간의 필드명/데이터 형태 불일치 해결
  - `normalizeMonthlyReport(raw)` 어댑터 함수 신설:
    - 01. 개요: `completedBooksCount` ➔ `completedCount`, `totalPagesRead` ➔ `totalPages`, `longestStreakDays` ➔ `streakDays`
    - 02. 습관: 객체 맵(`weekdayDistribution`, `timeDistribution`, `weatherDistribution`)을 프론트엔드 차트용 배열(`dayOfWeek`, `timeOfDay`, `weather`)로 매핑 변환
    - 03. 취향: `topGenres`, `topSubjects`, `debateKeywords` 추출 결합
    - 04. 밸런스: 다양성 점수(`diversityScore`), 주 장르 및 분석 텍스트 매핑
    - 05. 흔적: `featuredRecords`(문장 수집 스니펫) 및 `mostScrappedBooks`를 인용구 카드로 자동 가공
    - 06. 사서 관찰기: AI 심층 요약문(`summary`), 독서가 유형(`readerType`), 핵심 특성 태그(`keyTraits`) 보존
    - 07. 독서 처방: `recommendedBooks` 정식 서지정보 및 `advice` 조언 연계
  - `fetchMonthlyReport`에서 백엔드 호출 직후 `normalizeMonthlyReport`를 거쳐 반환하도록 연동
- **리포트 화면 실데이터 렌더링 및 UI 강화 (`MonthlyReport.jsx`, `MonthlyReport.css`)**:
  - 06번 사서 관찰기 섹션: AI가 분석한 독서가 유형 배지(`✨ 독서가 유형: 사색하는 몰입형 독서가`) 및 핵심 성향 태그(`keyTraits` 칩) 렌더링 추가
  - 07번 다음 달 독서 처방 섹션: 사서의 실시간 조언(`advice`) 배너 및 추천 도서 장르 태그(`genre`) 렌더링 추가
- `npx tsc --noEmit` 통과, `npm run lint`(기존 warning 5건 유지, 에러 0건), `npm run build` 번들 검증 완료

## 2026-09-17: 독서 타이머 60초 미만 시간 표기 정밀도 개선 및 백엔드 PR #13 연동
- 작업 브랜치: `fix/reading-session-duration-precision`
- **시간 포맷팅 유틸 신설 (`app/lib/timeFormat.js`)**:
  - `formatDuration(seconds, fallbackMinutes)`: 백엔드 정밀도 패치(PR #13)에 따라 `durationSeconds`를 우선 참조하여 60초 미만은 초 단위(`${seconds}초`), 60초 이상은 분/초(`${mins}분` 또는 `${mins}분 ${remainSecs}초`)로 자연스럽게 분기
  - `formatTotalReadingTime(totalMinutes)`: 누적 독서 시간을 시간 및 분(`X시간 Y분`, `X분`)으로 포맷팅
- **API 레이어 정밀도 보존 및 기본 메모 반영 (`app/api/recordApi.js`)**:
  - `createReadingSession`: `duration_seconds: durationSeconds`, `duration_minutes: Math.floor(durationSeconds / 60)`로 백엔드 전달, 기본 메모도 `formatDuration` 기반으로 `⏱️ 13초 독서 세션` 등으로 생성
  - `fetchReadingSessions`: 서버 응답의 `duration_seconds`/`durationSeconds`, `duration_minutes`/`durationMinutes` 누락 없이 정규화
- **독서 세션 히스토리 UI 및 타이머 모달 연동 (`ReadingSessionHistory.jsx`, `ReadingTimerModal.jsx`)**:
  - 세션 테이블 집중 시간 배지: `formatDuration(s.durationSeconds ?? s.duration, s.durationMinutes)` 적용
  - 상단 통계 바: 1분 미만 세션만 존재할 때도 `13초` 등으로 정확히 표현
  - 독서 타이머 모달: 완료 저장 기본 메모에 초 단위 정확도 반영
- `npx tsc --noEmit` 통과, `npm run lint`(기존 warning 5건 유지, 에러 0건), `npm run build` 번들 검증 완료

## 2026-09-17: 월간 독서 리포트 Recharts 시각화 업그레이드 & 날씨 도서 1:1 매핑 & 원본 비교 토글
- 작업 브랜치: `feat/report-recharts-visualization`
- **Recharts 라이브러리 도입 및 차트 시각화 구현 (`MonthlyReport.jsx`, `MonthlyReport.css`)**:
  - **02 독서 리듬**: 기존 가로형 막대그래프 대신 월요일~일요일 주간 독서 빈도를 부드러운 곡선(`LineChart` type="monotone")으로 연결. 테마 Accent 포인트 닷과 호버 툴팁 적용.
  - **03 나의 독서 취향**: 파스텔톤 도넛 차트(`PieChart` innerRadius/outerRadius) 구현. 도넛 정중앙에 1위 장르 명칭과 점유율(예: "문학 38%")을 굵은 타이포그래피 오버레이로 배치하고 범례 연동.
  - **06 날씨와 책**: 단순 텍스트 통계를 걷어내고, 날씨 아이콘(☀️, 🌧️, ☁️) + 백엔드 조인 베스트 도서 표지(교보문고 CDN) + 도서명/저자/인용구가 1:1 매칭되는 감성적 Grid 카드 레이아웃 구현.
- **원본 보존 및 실시간 비교 토글 스위치 제공**:
  - 상단 액션 바에 `[↩️ 원본 막대 뷰로 보기 / 📊 Recharts 시각화 뷰로 보기]` 토글 버튼 추가. 언제든 원본 막대 뷰와 신규 Recharts 뷰를 번갈아 확인하고 비교할 수 있도록 구현.
  - 원본 파일은 `MonthlyReport.legacy.jsx`, `MonthlyReport.legacy.css`로 안전하게 백업 보존.
- **API 및 데이터 정규화 레이어 확장 (`reportApi.js`)**:
  - `genreStats` 및 `weatherBooks` 필드 정규화 추가. 백엔드 실데이터 연동과 견본 데이터 스마트 병합 지원.
## 2026-09-17: 사서별(블루/슈빌/누디/게코) 대화 세션 및 말풍선 도화지 분리 격리
- 작업 브랜치: `feat/librarian-chat-session-isolation`
- **사서별 메시지 히스토리 도화지 및 세션 ID 분리 (`LibrarianChat.jsx`, `librarianStore.js`, `LibraryScene.jsx`)**:
  - `loadSavedChatSessionByLibrarian(librarianId)`, `saveChatSessionByLibrarian(librarianId, data)` 신설:
    - `sessionStorage` 키를 `myReadingRoom.chatSession.{librarianId}`로 세분화하여 사서별 독립 대화 히스토리 및 `sessionId` 보존.
  - 사서 전환 시(`librarian.id` 변경 감지 `useEffect`):
    - 이전 사서의 마지막 말풍선/질문이 새 사서 창에 잔류하지 않고 즉시 격리.
    - 해당 사서와 이전에 나눈 대화 기록이 있으면 복원하고, 첫 만남이면 깨끗한 빈 캔버스로 초기화.
    - 커서 말풍선(`LibraryScene.jsx`)도 해당 사서의 마지막 응답 상태로 함께 실시간 동기화.
  - `chatSessionId`가 사서별로 독립 유지되므로, 고양이와의 대화 컨텍스트가 슈빌·누디·게코의 LLM 프롬프트에 섞여 말투가 오염되는 현상 원천 차단.
- **인라인 강제 스위칭 버튼 정돈 및 안내 팁 메시지화**:
  - 특정 장르 질문 시 대화창 내부에서 맥락을 꼬이게 하던 `[OO로 바꾸기]` 강제 버튼을 제거.
  - "이 장르는 OO 사서가 더 깊이 있게 추천할 수 있어요. 상단 프로필에서 언제든 사서를 변경해 보세요!" 형태의 친절한 팁 안내 배너로 변경하여 사용자가 주도적으로 사서를 선택하도록 UX 정돈.
- `npx tsc --noEmit` 통과, `npm run lint`(기존 warning 6건 유지, 에러 0건), `npm run build` 번들 검증 완료.

## 2026-09-16: 누디 3D 서재 커서 적용 (좌클릭 2초 모션)
- `public/cursors/nudi/{nudi_01,nudi_02}.png`(사용자 업로드, 각 11~13KB)를 기존 cat/stork와
  동일한 `public/cursors/<id>/` 구조로 배치 확인. 용량이 이미 작아 webp 변환 없이 그대로 적용
  (요청에 따라 이번엔 포맷 변경 없이 반영만 함 — 최종 이미지 교체 예정)
- `app/data/librarians.js`: 누디에 `image`(nudi_01, 기본)·`imageHover`(nudi_02, 클릭 모션)·
  `clickMotionMs: 2000`·`tip`/`tipHover` 필드 추가
- `app/features/room/LibrarianCursor.jsx`: 기존 cat/stork는 "책 선택 중"에만 모션 이미지로
  바뀌는데(active prop, CLIAR-239), 누디는 요청대로 **좌클릭할 때마다 2초간 모션 이미지로
  전환됐다가 자동으로 기본 이미지로 복귀**하는 별도 로직을 추가:
  - `librarian.clickMotionMs`가 있으면(누디만 해당) window `mousedown`(좌클릭)을 구독해
    `imageHover`로 전환 후 `clickMotionMs` 뒤 자동 복귀하는 타이머 방식
  - 없는 사서(블루/슈빌)는 기존 `active` prop 방식 그대로 유지 — 회귀 없음
  - 사서 전환 시 클릭 모션 상태가 남지 않도록 렌더 중 동기화로 리셋(setState-in-effect
    lint 경고 회피, 기존 bubbleText 리셋과 같은 패턴)
- ⚠️ `tip`/`tipHover` 좌표는 800x800 원본 기준 추정치(코 위치)로 넣었음 — 실측 좌표가 아니라
  실제 화면에서 커서 포인터 위치가 살짝 어긋날 수 있음. 필요 시 조정 필요
- `npx eslint .`(기존 warning 5건만 유지, 신규 0), `npx tsc --noEmit`, `npm run build` 통과 확인

## 2026-09-16: 게코 3D 서재 커서 적용 (챗봇 답변 대기 중 thinking 이미지)
- 게코 커서 이미지 2장 적용. 원본 PNG가 각 ~500KB(800x1200)로 커서용으로 과해,
  ImageMagick으로 동일 해상도(800x1200) webp로 변환해 용량을 1/5로 줄임
  (gecko_01: 497KB→110KB, gecko_thinking: 476KB→104KB). 원본 PNG는 삭제.
  (누디 커서는 11~13KB라 그대로 뒀지만, 게코는 커서로 쓰기엔 무거워 변환)
- `app/data/librarians.js`: 게코에 `image`(gecko_01, 기본)·`thinkingImage`(gecko_thinking)·
  `tip` 필드 추가. 다른 사서의 imageHover(책 선택/클릭 모션)와 용도가 달라 thinking 전용
  필드(thinkingImage)를 신설
- 답변 대기 상태 전달 경로 신설:
  - `LibrarianChat.jsx`: 기존 내부 `loading` 상태를 `onLoadingChange(loading)` 콜백으로
    부모에 전달(useEffect)
  - `LibraryScene.jsx`: `chatLoading` 상태를 두고 `onLoadingChange`로 받아
    `LibrarianCursor`에 `thinking` prop으로 전달
  - `LibrarianCursor.jsx`: `thinking && librarian.thinkingImage`면 대기 이미지 표시,
    답변이 오면(thinking=false) 기본 이미지로 복귀. 표시 우선순위는
    대기(thinking) > 활성/클릭모션 > 기본
- 이미지 결정 로직을 삼항 중첩에서 if/else로 풀어 우선순위를 명확히 함
- ⚠️ 게코 `tip` 좌표는 800x1200 원본 기준 얼굴 부근 추정치 — 실측 아님. 화면 확인 후 조정 필요
- `npx eslint .`(기존 warning 5건만, 신규 0), `npx tsc --noEmit`, `npm run build` 통과 및
  dist/cursors/gecko에 webp 2장 포함 확인

## 2026-09-17: 사서 세션 캐시 격리 누수 수정 및 발신자 메타데이터 보존 (다중 인격 버그 영구 해소)
- 작업 브랜치: `feat/librarian-chat-session-isolation`
- **스토어 공용 키 Fallback 제거 (`app/store/librarianStore.js`)**:
  - `loadSavedChatSessionByLibrarian(librarianId)`에서 특정 사서의 데이터가 없을 때 공용 키(`myReadingRoom.chatSession`)로 떨어지며 블루의 대화 내역이 새 사서 창에 복사되던 문제 완전 제거 (데이터 없으면 정직하게 `null` 반환).
  - `saveChatSessionByLibrarian`도 공용 키를 오염시키지 않고 해당 사서 전용 키에만 저장하도록 격리.
- **메시지 발신자 메타데이터 보존 (`app/features/room/LibrarianChat.jsx`)**:
  - 메시지 생성 시점의 `senderIcon`과 `senderName`을 메시지 객체에 영구 박제하여, 현재 활성화된 사서 탭과 무관하게 발신자 이름표가 왜곡 없이 올바르게 렌더링되도록 수정.
- **검증**:
  - `npx tsc --noEmit` 통과
  - `npm run lint` 통과 (에러 0건)
  - `npm run build` 번들 빌드 정상 통과

## 2026-09-17: 사서 프로필 페이지 UI 정리
- 게코 한 줄 소개 줄바꿈 위치 수정: 데이터에 `\n`을 넣어 "…연결하는" 다음에서 항상
  줄바꿈되도록 함(기존엔 자연 줄바꿈으로 "탐구자"가 "탐/구자"로 잘림). CSS는
  `.lp-oneliner`에 `white-space: pre-line` 추가해 렌더링
- 카드 내부 수평 정렬 문제 해결: 한 줄 소개·특화 장르·페르소나 문장이 사서마다
  줄바꿈 수가 달라 그 아래 구분선(성격·독서 성향 보기)·문장·버튼 위치가 카드마다
  어긋났던 문제. `.lp-oneliner`/`.lp-meta-row--genre dd`/`.lp-catchphrase`에
  `min-height`(최대 예상 줄수 기준)를 부여해 4개 카드가 항상 수평으로 맞춰지게 함
- "이름 수정" 버튼 → "수정"으로 문구 축약
- 상단 안내 문구를 "사서를 고르고, 나만의 서재를 만들어보세요.🐾"로 교체
- 변경 파일: `app/data/librarians.js`(게코 oneLiner에 개행 추가),
  `app/pages/LibrarianProfiles.jsx`(버튼 문구·상단 안내·genre row 클래스 추가),
  `app/pages/LibrarianProfiles.css`(정렬용 min-height, pre-line)
- `npx eslint .`(신규 이슈 0), `npx tsc --noEmit`, `npm run build` 통과 확인

## 2026-09-18: 게코 클릭 모션을 animated webp 단일 파일로 통일 + 슈빌 클릭 이슈 수정
- **게코**: 클릭 모션 이미지가 `gecko_02.png`(포즈 전환)·`gecko_03.png`(손 인사) 2장으로
  분리돼 있어 누디(기본 1장+클릭 1장 구조)와 불일치했음. ImageMagick으로 2프레임
  애니메이션 webp 한 장(`gecko_hover.webp`, 91KB)으로 합쳐 구조를 통일:
  - 프레임 지속시간: gecko_02 0.5초 → gecko_03 1.5초(총 2초, 마지막 프레임에서 정지,
    `-loop 1`). `app/data/librarians.js`의 `clickMotionMs: 2000`을 애니메이션 총
    재생시간과 동일하게 맞춰 정확히 끝나는 시점에 기본 이미지(gecko_01)로 복귀
  - 원본 `gecko_02.png`/`gecko_03.png`는 webp로 합친 뒤 삭제 (재작업 중 실수로 두 파일이
    동일 파일로 겹쳐 올라온 적이 있어, 재업로드 후 SHA-256 해시로 실제로 다른 두 포즈인지
    확인하고 프레임 순서까지 시각 검증 완료)
- **슈빌**: 사용자가 "예전엔 hover 방식이었는데 클릭으로 바꿨더니 잘 안 트리거된다"고
  전달한 문제의 원인 확인 — `imageHover`가 여전히 `active` prop(=책 선택 중 상태,
  CLIAR-239)에만 반응하도록 남아 있어 실제 마우스 좌클릭과는 무관했음. 누디/게코와
  동일한 `clickMotionMs`(1200ms) 방식으로 통일해 좌클릭 시 `stork_hover.webp`
  (날개 펄럭임, 총 재생시간 1.16초)가 재생되고 자동 복귀하도록 수정
- 변경 파일: `app/data/librarians.js`(게코 imageHover/clickMotionMs/tipHover 추가,
  슈빌 clickMotionMs 추가), `public/cursors/gecko/gecko_hover.webp`(신규),
  `public/cursors/gecko/{gecko_02,gecko_03}.png`(삭제, webp로 합쳐짐)
- `LibrarianCursor.jsx`는 이미 `clickMotionMs` 유무로 분기하는 범용 로직이라 코드
  수정 없이 데이터만 추가해 두 사서 모두 적용됨
- `npx eslint .`(기존 warning 6건 유지, 신규 0), `npx tsc --noEmit`, `npm run build`
  통과 및 dist/cursors/{gecko,stork}에 산출물 포함 확인

## 2026-09-19: 블루(cat) 커서 클릭 모션을 누디와 동일한 방식으로 통일
- 블루도 슈빌과 같은 문제였음 — `imageHover`(cat_04)가 "책 선택 중"(active prop,
  CLIAR-239)에만 반응해 실제 좌클릭과는 무관했음. 사용자가 "누디와 동일하게"로
  명시해 요청, 누디와 동일한 `clickMotionMs`(2000ms) 방식으로 통일
- `app/data/librarians.js`: 블루에 `clickMotionMs: 2000` 추가 (기존 `image`/
  `imageHover`/`tip`/`tipHover`는 그대로 재사용, 신규 에셋 불필요)
- 이제 4개 사서(블루/누디/게코/슈빌) 모두 `clickMotionMs` 방식으로 통일 완료 —
  더 이상 `active` prop 기반의 구식 hover 방식을 쓰는 사서 없음
- `LibrarianCursor.jsx`는 이미 `clickMotionMs` 유무로 분기하는 범용 로직이라
  코드 수정 없이 데이터만 추가
- `npx eslint .`(신규 이슈 0), `npx tsc --noEmit`, `npm run build` 통과 확인

## 2026-09-20: 도서 추천 장르 '기술과학' 오분류(L-IT-erature) 수정 및 추천 말풍선 시인성 개선
- **원인 분석**: 챗봇 카드에서 `문학`(`LITERATURE`)으로 표시된 도서가 `[등록 ➔]`을 눌러 `RegisterBook.jsx`로 이동할 때 무조건 `기술과학 (컴퓨터/IT)`으로 변경되던 문제 해결. `genres.js`의 `detectGenreCode`가 `t.includes(alias)`를 수행할 때 `TECHNOLOGY`의 별칭 `'it'`이 `"literature"`의 부분 문자열(`l-IT-erature`)로 매칭되어 9번째인 문학보다 앞선 6번째 기술과학으로 오탐되던 치명적 결함 발견.
- **장르 유틸 보강 (`app/data/genres.js`)**:
  - `genreCode(str)`: 영문 Enum(`LITERATURE` 등)이 전달되어도 `BY_CODE`를 1순위로 조회하여 표준 코드 즉시 반환.
  - `detectGenreCode(str)`: 3글자 이하 영문 단축어('it', 'ai', 'sf')에 대해 단어 경계(`\b`) 독립 단어 정규식 검사를 적용하여 일반 영단어 내 부분 문자열 오탐 원천 차단.
- **등록 폼 장르 보존 (`app/pages/RegisterBook.jsx`)**:
  - `GENRE_CODES.includes(code)`를 최우선 적용하여 이미 검증된 추천 장르가 불필요한 별칭 탐색 없이 100% 온전히 보존되도록 개선.
## 2026-09-20: 추천 도서 응답 시 서재 도서 오인 방지 3중 방어막 및 번호 매김 추천 카드 복원
- **원인 분석**:
  - AI 에이전트가 추천 도서 표준 마크다운(`### 📖 {제목}`) 대신 일반 텍스트 문맥에서 `📚\n누디가 건네는 따뜻한 온기의 책` 또는 `### 📚 ...` 형태로 응답을 시작함.
  - 프론트엔드 `MarkdownRenderer`가 `### 📚`를 만나면 실제 서재 존재 여부를 묻지도 따지지도 않고 내 서재 도서 카드(`type: library`, `[책 열기 ➔]`)로 변환해버렸고, `LibrarianChat`의 자연어 제목 추출기 및 `LibrarianCursor`도 이를 내 서재 책으로 오탐하여 잘못된 액션 버튼과 커서 말풍선을 출력함.
  - 또한 에이전트가 추천 도서를 `1. 《살고 싶다는 농담》 - 백영옥 에세이` 번호 매김 형식으로 내려보내면서 표준 도서 카드(`[등록 ➔]`)가 아닌 단순 텍스트로 밀려나는 현상 복합 발생.
- **수정 내용**:
  1. **`app/features/room/MarkdownRenderer.jsx`**:
     - `libraryBooks` props를 받아 `type === 'library'` 도서 카드 생성 직전, 실제 사용자 서재(`libraryBooks`)에 해당 도서명이 존재하는지 엄격히 교차 검증 (`normalizeTitle` 비교).
     - 서재에 없는 도서명이면 잘못 생성된 도서 카드로 만들지 않고, 일반 텍스트/헤딩으로 안전 강등(Graceful Fallback) 처리.
     - `1. 《도서명》 - 저자` 또는 `1. 『도서명』` 번호 매김 목록 패턴을 감지하여 도서 추천 카드(`[등록 ➔]`)로 자동 승격 파싱. `어떤 이야기냐면요:`, `이런 마음일 때 추천해요:` 패턴을 추천 사유 필드로 스마트 정규화.
  2. **`app/features/room/bookExtractor.js`**:
     - `normalizeTitle(str)` 유틸 함수를 모듈 최상위로 export하여 공통 책 제목 정규화 기준으로 통합.
     - `extractLibraryBooksFromAnswer`: 40자 초과 문구는 섹션 타이틀로 간주해 서재 도서 추출에서 제외.
     - `extractBooksFromAnswer`: 번호 매김 낫표/화살괄호(`1. 《도서명》`, `1. 『도서명』`) 추천 목록도 fallback 추천 도서로 온전히 추출하도록 확장.
  3. **`app/features/room/LibrarianChat.jsx`**:
     - `MarkdownRenderer`에 `libraryBooks={books}`를 공급.
     - `libraryBooks` useMemo에서 추천 응답(`### 📖`, `recommended_books`, 번호 매김 추천 목록 `1. 《...》`)이 감지된 경우, 서재 자연어 자동 탐색에서 추천 책을 서재 책으로 오인하지 않도록 억제. React 컴파일러 불변성 규칙을 준수하도록 useMemo 선언 순서 정돈.
  4. **`app/features/room/LibrarianCursor.jsx`**:
     - `getShortBubbleText`에서 도서 추천 감지 로직을 최우선으로 배치하고, 추천 응답이 아닐 때만 `isLibrary`를 평가하여 "서재에서 책을 찾았다" 오알림 원천 차단.
- **검증**:
  - `npx tsc --noEmit` 통과 (0 errors).
  - `npm run lint` 통과 (기존 경고 6건 외 신규 0건).
  - `npm run build` 번들 정상 빌드(460ms) 확인.

