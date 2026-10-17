# HANDOFF (세션별 서술 로그, append-only)

## 2026-10-17: 프로필 이미지 WebP 변환 및 레거시 에셋 정리
- 작업 브랜치: `feat/convert-profile-images-to-webp`
- **사용자 요청**:
  1. `public/profile/` 폴더 내 이미지들을 WebP로 변환.
  2. `default_avatar`의 용도 확인 및 미사용 시 삭제 여부 검토.
- **작업 내용**:
  1. 프로필 이미지 WebP 고품질 압축 변환:
     - `chris.png` (116KB) ➔ `chris.webp` (25KB, 78% 절감)
     - `clia.png` (129KB) ➔ `clia.webp` (27KB, 79% 절감)
     - `gecko.jpg` (29KB) ➔ `gecko.webp` (25KB, 15% 절감)
     - `nudi.png` (173KB) ➔ `nudi.webp` (28KB, 84% 절감)
     - 기존 WebP 에셋(`cat.webp`, `stork.webp`)과 함께 일관된 WebP 포맷 체계 완성.
  2. 코드 내 참조 경로 업데이트:
     - `app/data/librarians.js`: 누디(`profileImage: '/profile/nudi.webp'`) 및 게코(`profileImage: '/profile/gecko.webp'`) 경로 업데이트.
     - `app/store/AuthProvider.jsx`: 게스트/테스트 프로필 이미지 경로를 `/profile/clia.webp`로 업데이트.
     - `app/store/authBypass.js`: 바이패스 계정 프로필 이미지를 `/profile/chris.webp`로 업데이트.
  3. 레거시 이미지 정리:
     - `public/profile/chris.png`, `clia.png`, `gecko.jpg`, `nudi.jpg`, `nudi.png` 삭제.
  4. `default_avatar.svg` 용도 보존:
     - `app/pages/MyPage.jsx`에서 사용자가 프로필 이미지를 등록하지 않았을 때 사용하는 기본 실루엣 SVG 아바타(801바이트)로, 현재 정상 사용 중임을 확인하고 보존.
  5. 하네스 문서(`STATE.md`, `HANDOFF.md`, `HANDOFF_2026-09.md`) 갱신 및 5세션 상한 롤링 아카이빙 유지.
- **검증**:
  - `npm run check:harness` 통과 (HANDOFF, PLAN, STATE, DECISIONS, archive 정상)
  - `npm run lint` 통과 (0 errors, 0 warnings)
  - `npm run typecheck` 통과 (0 errors)
  - `npm run build` 통과 (Vite bundle 정상 빌드)

## 2026-10-17: 로그인 페이지 배경 이미지 Cloudflare R2 CDN 연결
- 작업 브랜치: `feat/r2-cdn-login-background-assets`
- **사용자 요청**:
  - Cloudflare R2 `dpyb-public/background_UI/login/`에 업로드한 로그인 페이지 배경 이미지 2종(`login-bg.webp`, `login_eng.webp`)을 프론트엔드에 연결하고 로컬 파일 정리.
- **작업 내용**:
  1. `app/pages/LoginPage.jsx`:
     - `cdnUrl` 헬퍼를 활용하여 `LOGIN_BG_KO`(`background_UI/login/login-bg.webp`) 및 `LOGIN_BG_EN`(`background_UI/login/login_eng.webp`) 절대 URL 연동.
     - `src={isEn ? LOGIN_BG_EN : LOGIN_BG_KO}`로 한국어/영어 배경을 R2 CDN에서 로드하도록 전환.
  2. `public/`:
     - 기존 로컬 파일 2종(`login-bg.webp`, `login_eng.webp`) 전체 삭제 (~2.27MB 저장소/번들 경량화).
  3. 하네스 문서(`STATE.md`, `HANDOFF.md`, `HANDOFF_2026-09.md`) 갱신 및 5세션 상한 롤링 아카이빙 유지.
- **검증**:
  - CDN 2개 파일 HEAD 요청 200 / `image/webp` 확인
  - `npm run check:harness`, `npm run lint`, `npm run typecheck`, `npm run build` 통과

## 2026-10-17: 서재 배경 이미지 Cloudflare R2 CDN 연결
- 작업 브랜치: `feat/r2-cdn-background-assets`
- **사용자 요청**:
  - Cloudflare R2 `dpyb-public/background_UI/`에 업로드한 서재 배경 이미지 5종을 프론트엔드에 연결.
- **작업 내용**:
  1. `app/config/cdn.js` 신설:
     - `ASSET_BASE_URL` (기본값 `https://cdn.ai0208.xyz`, `VITE_ASSET_BASE_URL`로 덮어쓰기 가능) 및 `cdnUrl(path)` 헬퍼 제공.
  2. `app/features/room/shelfLayout.js`:
     - `BG_SRC_CAT/STORK_LIGHT/STORK_NIGHT/NUDI/GECKO`를 `public/room/` 로컬 경로에서 R2 CDN 절대 URL로 전환.
     - 배경은 CSS `background-image`로만 사용되므로 R2 CORS 설정 영향 없음.
  3. `.env.example`: `VITE_ASSET_BASE_URL` 항목 문서화.
  4. `public/room/` 로컬 서재 배경 파일 6종 전체 삭제 완료 (R2 CDN 전환에 따른 로컬 에셋 정리 및 저장소/번들 경량화).
  5. 하네스 문서(`STATE.md`, `HANDOFF.md`, `HANDOFF_2026-09.md`) 갱신 및 5세션 상한 롤링 아카이빙 유지.
- **검증**:
  - CDN 5개 파일 HEAD 요청 200 / `image/webp` 확인
  - `npm run check:harness`, `npm run lint`, `npm run typecheck`, `npm run build` 통과

## 2026-10-17: GNB BETA 뱃지 독립 분리 및 첫방문/재방문 설문조사 모달 구현
- 작업 브랜치: `feat/beta-survey-modal-and-badge-separation`
- **사용자 요청**:
  1. GNB 상단 브랜드 캡슐에 묶여 있던 `BETA` 뱃지를 독립된 버튼으로 분리.
  2. `BETA` 클릭 시 설문조사 모달 오픈:
     - 소개 및 감사 문구와 함께 [첫방문], [재방문] 2가지 선택 버튼 제공.
     - [첫방문] 클릭 시 첫방문자용 8개 설문 항목 진행.
     - [재방문] 클릭 시 재방문자용 12개 설문 항목 진행 (스크린샷 파일 첨부 및 미리보기/삭제 기능 포함).
     - 제출 완료 화면 및 안전한 로컬 저장(`localStorage`) 지원.
- **작업 내용**:
  1. `app/features/survey/BetaSurveyModal.jsx` & `BetaSurveyModal.css` 신설:
     - Glassmorphism & DPYB 테마(라이트/다크 모드 지원) 기반의 고급스러운 설문조사 모달 컴포넌트 구현.
     - Step 1: 환영 및 참여 부탁 메시지와 함께 [첫방문 설문](약 2분 소요)과 [재방문 설문](약 3분 소요) 카드형 버튼 제공.
     - Step 2 (첫방문): 유사 서비스 경험, 독서 기록 관리 방법, 가입/시작 불편점, 서비스 이해도, 화면 디자인/구성 1~5점 표, 사용 기능 다중선택, 헷갈렸던 점, 연령대 8개 문항 구현.
     - Step 2 (재방문): 사용 기기 및 브라우저, 오늘 사용 기능, 불편했던 점(+스크린샷 첨부), 오류/비정상 동작(+스크린샷 첨부), AI 사서 도움 여부, 가장 유용한 기능, 재방문 이유, 속도 만족도, 불필요한 기능, 있었으면 하는 기능, 오늘의 만족도(1~5점), 자유 개선 의견 12개 문항 구현.
     - 이미지 첨부 시 캔버스 압축(최대 1000px, JPEG 0.75) 헬퍼를 적용하여 가볍고 안전하게 base64 데이터로 변환/저장 및 미리보기 제공.
     - Step 3: 제출 완료 및 따뜻한 감사 안내 화면 제공, `localStorage('dpyb_beta_surveys')`에 결과 저장.
  2. `app/components/Gnb.jsx` & `Gnb.css`:
     - `.gnb-desktop-brand` 내 `NavLink`에서 `BETA`를 완전히 분리하여 우측에 독립된 글라스 버튼(`<button className="gnb-beta-badge">`)으로 배치.
     - 모바일 GNB 상단 우측의 `.gnb-beta-badge--mobile`도 클릭 시 동일하게 설문조사 모달이 열리도록 연동.
     - 호버 시 은은한 리프팅 및 액센트 글로우 인터랙션 스타일링.
  3. `app/i18n/translations.js`:
     - `gnb.betaSurvey`, `gnb.betaSurveyTooltip` 다국어 키 한국어 및 영어 추가.
  4. 하네스 문서(`STATE.md`, `HANDOFF.md`, `HANDOFF_2026-09.md`) 갱신 및 5세션 상한 롤링 아카이빙 유지.
- **검증**:
  - `npm run check:harness` 통과 (HANDOFF, PLAN, STATE, DECISIONS, archive 정상)
  - `npm run lint` 통과 (0 errors, 0 warnings)
  - `npm run typecheck` 통과 (0 errors)
  - `npm run build` 통과 (Vite bundle 정상 빌드)

## 2026-10-15: 도서 상세 장르 및 색상 수정 기능 추가, 마이페이지 소메뉴 중복 이모지 제거
- 작업 브랜치: `feat/book-edit-genre-color-and-mypage-tab-emojis`
- **사용자 요청**:
  1. 도서 선택 후 왼쪽 상세 영역의 [수정] 버튼을 눌렀을 때 장르 및 책 색상(책등/표지)을 수정할 수 있도록 기능 지원.
  2. 마이페이지 상단 소메뉴(탭)에 이모지가 2개씩 중복 노출되는 현상(`📚 📚 독서 리스트` 등) 수정.
- **작업 내용**:
  1. `app/i18n/translations.js`:
     - `mypage.tabBooks`, `mypage.tabCalendar`, `mypage.tabProfile` 번역값에서 중복 이모지를 제거하고 텍스트만 유지(`독서 리스트`, `독서 캘린더`, `내 정보` / `Reading List`, `Reading Calendar`, `My Profile`).
     - `bookDetail.chooseColor` 다국어 키 추가(`책등 및 표지 색상` / `Book Spine & Cover Color`).
  2. `app/features/room/BookDetail.jsx`:
     - `editing` 모드 진입 시 장르 영역을 전체 KDC 대분류 10종(`GENRE_DEFS`)을 선택할 수 있는 드롭다운(`<select>`)으로 전환.
     - `editing` 모드 시 활성 사서의 테마 컬러 팔레트 6종(`getColorPresets(librarianId)`) 원형 색상 스위처를 노출하여 사용자가 원하는 책 색상을 원클릭으로 선택할 수 있도록 구현.
     - 색상 스위처 클릭 시 상단 `Book3DViewer` 컴포넌트의 `spineColor`와 `coverColor`에 즉시 반영되어 실시간 3D 프리뷰 제공.
     - [완료] 클릭 시 `saveBookMeta` 및 `setVisual`을 통해 백엔드 및 로컬 시각 데이터와 동기화하고, [취소] 클릭 시 원래 장르와 색상으로 안전하게 롤백.
  3. `app/store/BooksProvider.jsx`:
     - `saveBookMeta` 실행 시 전달받은 `spineColor`, `coverColor`, `colorIdx`를 `setVisual` 및 전역 `books` 상태에 즉시 동기화하도록 보강.
  4. 하네스 문서(`STATE.md`, `HANDOFF.md`, `HANDOFF_2026-09.md`) 갱신 및 5세션 상한 롤링 아카이빙 유지.
- **검증**:
  - `npm run check:harness` 통과 (HANDOFF, PLAN, STATE, DECISIONS, archive 정상)
  - `npm run lint` 통과 (0 errors, 0 warnings)
  - `npm run typecheck` 통과 (0 errors)
  - `npm run build` 통과 (Vite bundle 정상 빌드)
