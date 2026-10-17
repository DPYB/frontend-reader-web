# HANDOFF (세션별 서술 로그, append-only)

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
  4. `public/room/` 로컬 파일은 운영 CDN 정상 확인 후 별도 PR에서 제거 예정(롤백 안전망).
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

## 2026-10-15: 마이페이지 독서 캘린더 날짜별 책장 선반화 및 미니 책등 꽂기 UI 구현
- 작업 브랜치: `feat/mypage-calendar-bookshelf-view`
- **사용자 요청**:
  - 마이페이지 독서 캘린더에 각 날짜별 칸도 선반처럼 그날 읽은 책이 꽂아져 있는 것처럼 제작 요청.
- **작업 내용**:
  1. `app/features/mypage/MyPageReadingCalendar.jsx`:
     - `getMiniSpineProps(book, index)` 헬퍼 구현:
       - 도서의 `spineColor`, `heightFactor`, `thickness`를 우선 반영하고, 미지정 시 도서 id/제목 해시 기반으로 유려한 양장본 색상 및 68%~94% 범위의 자연스러운 책 높이/두께 편차 생성.
     - `calendarDays` 계산부에서 날짜별 활동(`dayActivities`)을 순회하여 당일 읽은 고유 도서 목록(`books: dayBooks`) 추출 및 중복 제거.
     - 달력 날짜 셀(`<button className="calendar-day-cell calendar-shelf-cell">`) 내부 구조 개편:
       - 상단(`.calendar-cell-top`): 날짜 번호 및 출석 발자국 스탬프(`🐾`).
       - 하단 선반 스테이지(`.calendar-shelf-stage`):
         - 선반 위 꽂힌 미니 책등 컨테이너(`.calendar-shelf-books`): 당일 읽은 책들을 세로 양장본 책등 형태로 선반 위에 나란히 렌더링 (최대 3권 + 초과 시 `+N` 배지).
         - 각 미니 책등(`.calendar-mini-book`): 3D 원통형 하이라이트(`mini-book-spine-shine`), 상하단 금박/은박 음각 밴드(`mini-book-spine-line`), 도서명 및 저자 툴팁, 호버 시 위로 살짝 뽑히는 리프팅 인터랙션 지원.
         - 선반 나무 받침대(`.calendar-shelf-plank`): 바닥에 따뜻하고 사실적인 목재 플랭크 텍스처 및 베벨 하이라이트/그림자 렌더링.
  2. `app/pages/MyPage.css`:
     - 캘린더 날짜 셀을 원목 서가 칸(compartment) 느낌의 깊이감 있는 배경 그라데이션 및 내부 그림자로 스타일링.
     - 다크 모드(`[data-theme='dark']`)에 맞춘 중후한 마호가니/월넛 목재 선반 텍스처와 미니 책등 그림자 최적화.
     - 모바일 및 태블릿 반응형 브레이크포인트(`max-width: 640px`)에서 선반 및 미니 책등의 크기를 적절히 축소(`height: 66px`, 책등 폭 8px)하여 모든 디바이스에서 균형 잡힌 레이아웃 유지.
  3. 하네스 문서(`STATE.md`, `HANDOFF.md`, `HANDOFF_2026-09.md`) 갱신 및 5세션 상한 롤링 아카이빙 유지.
- **검증**:
  - `npm run check:harness` 통과 (HANDOFF, PLAN, STATE, DECISIONS, archive 정상)
  - `npm run lint` 통과 (0 errors, 0 warnings)
  - `npm run typecheck` 통과 (0 errors)
  - `npm run build` 통과 (Vite bundle 정상 빌드)

## 2026-10-15: 도서 상세 3D 모델 육면체 선 제거, 좌측 기준 높이 고정 및 공유 버튼 비활성화
- 작업 브랜치: `feat/book-detail-height-fix-and-ui-refinements`
- **사용자 요청**:
  1. 도서 상세 3D 모델에 커서를 올렸을 때 나타나는 육면체 뼈대 테두리 선(Edges glow) 미노출 처리.
  2. 도서 상세 팝업의 세로 길이를 왼쪽(책정보) 높이에 맞춰 고정하고, 오른쪽 수집 문장 영역이 길어질 경우 우측 내부에서 스크롤되도록 개선.
  3. 수집 문장 슬라이드 카드의 `[공유]` 버튼 UI 비활성화.
- **작업 내용**:
  1. `app/features/bookshelf3d/Book3D.jsx` & `app/features/room/Book3DViewer.jsx`:
     - `Book3D`에 `showEdges = true`, `interactive = true` prop을 추가하여 호버 시 테두리 선 렌더링 및 당겨짐 애니메이션을 조건부로 분기.
     - `Book3DViewer`에서 `showEdges={false}`, `interactive={false}`를 전달하여 모달 내 3D 책 뷰어에서는 마우스 커서를 올려도 육면체 뼈대 선이 나타나지 않고 깔끔한 360도 OrbitControls 회전 조작에만 집중하도록 개선.
  2. `app/features/room/BookDetail.jsx`:
     - 모달 패널(`panelStyle`)의 데스크톱 세로 높이를 `height: 'fit-content'` 및 `maxHeight: 'calc(100dvh - 48px)'`로 설정.
     - 2단 그리드의 좌측 열(3D 책 뷰어 + 메타 카드)에 `height: 'fit-content'`를 적용하여 모달 전체 세로 길이가 좌측 도서 정보의 자연스러운 높이에 딱 맞춰 고정되도록 처리.
     - 우측 탭 영역에 `height: '100%'`, `overflow: 'hidden'`, 탭 콘텐츠 영역에 `overflow: 'hidden'`을 부여하여, 우측 내용이 많아져도 모달 전체가 늘어나지 않고 우측 카드 내부(`ScrapGallery`의 `overflowY: 'auto'`)에서만 부드럽게 스크롤되도록 보장.
  3. `app/features/room/ScrapGallery.jsx` & `app/i18n/translations.js`:
     - 수집 문장 슬라이드 카드 하단의 `[공유]` 버튼을 `disabled`, `opacity: 0.45`, `cursor: 'not-allowed'`로 UI 비활성화 처리하고 툴팁(`공유 기능 준비 중` / `Share feature coming soon`) 연동.
     - 비활성화에 따라 미사용된 `handleShare` 및 `copyNotice` 코드를 정리하여 ESLint 경고 방지.
  4. 하네스 문서(`STATE.md`, `HANDOFF.md`, `HANDOFF_2026-09.md`) 갱신 및 5세션 상한 롤링 아카이빙 유지.
- **검증**:
  - `npm run check:harness` 통과 (HANDOFF, PLAN, STATE, DECISIONS, archive 정상)
  - `npm run lint` 통과 (0 errors, 0 warnings)
  - `npm run typecheck` 통과 (0 errors)
  - `npm run build` 통과 (Vite bundle 정상 빌드)
