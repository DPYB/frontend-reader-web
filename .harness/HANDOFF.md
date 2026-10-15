# HANDOFF (세션별 서술 로그, append-only)

## 2026-10-15: 도서 상세 모달 스케치 기반 전면 재정리 및 인터랙티브 3D 도서 연동
- 작업 브랜치: `feat/reorganize-book-detail-with-3d-book`
- **사용자 요청**:
  - 도서 선택(클릭) 시 열리는 상세 화면을 사용자가 제공한 스케치 레이아웃으로 전면 재정리.
  - 기존 2D 평면 이미지 대신, 앞표지/책등/종이 질감이 입혀진 3D 책 모델(`Book3D`)을 상세 모달 좌측 상단에 렌더링.
  - 스케치 규격 반영:
    - 좌측 상단: 3D 도서 (3D 회전 지원).
    - 좌측 하단 메타 카드: 제목, 저자, [장르] [Status] [현재/총쪽], [독서 타이머] [문장수집] [수정].
    - 우측 상단: [수집한 문장] [독서 타이머 기록] 탭.
    - 우측 문장 탭: [<] [>] 슬라이드 네비게이션, 상단 [문장 사진], 중간 [저장된 날짜] + [수정]/[삭제], 하단 [인식 결과] 박스, [사용자 메모] 박스, 바닥 [page number] + [공유] 버튼.
- **작업 내용**:
  1. `app/features/room/Book3DViewer.jsx` 신설:
     - `@react-three/fiber` 및 `@react-three/drei` 기반의 인터랙티브 3D 도서 뷰어 컴포넌트 구현.
     - 도서의 앞표지(+X)와 책등(+Z), 책배의 두께가 입체적으로 조화롭게 보이는 쿼터뷰 카메라 각도 및 은은한 방사형 그라데이션 배경, 조명(Ambient + Directional) 설정.
     - `OrbitControls`로 사용자가 마우스/터치로 360도 자유롭게 책을 돌려볼 수 있도록 지원 및 안내 칩 렌더링.
  2. `app/features/room/BookDetail.jsx`:
     - 좌측 평면 2D `<img>`를 제거하고 `<Book3DViewer>` 컴포넌트 배치.
     - 좌측 하단에 스케치 규격 메타 카드 구축:
       - 제목 및 저자 중앙 정렬, 메타 칩 한 줄(`[#장르]`, `[#상태]`, `[📖 현재/총쪽]`).
       - 하단에 3개 주요 액션 버튼 나란히 배치: `[독서 타이머]`, `[문장수집]`, `[수정]`.
       - 수정 모드 진입 시 `[완료]`, `[취소]` 및 비-게스트일 때 `[삭제]` 기능 자연스럽게 전환.
     - 우측 상단 탭 헤더에서 불필요한 수정/삭제 버튼을 정리하고 순수 탭 전환 버튼만 배치.
  3. `app/features/room/ScrapGallery.jsx`:
     - 스케치에 표시된 1문장 카드 중심 슬라이드(캐러셀) 뷰어로 전면 개편:
       - 좌우 [<] [>] 슬라이드 이동 버튼 및 키보드 좌우 방향키 단축키 지원.
       - 상단에 큼직한 문장 사진(스캔 이미지) 배치 및 클릭 시 전체화면 Lightbox 확대 모달 지원.
       - 중간에 저장된 날짜 뱃지, 순번 인디케이터(`1 / 5`), `[수정]`, `[삭제]` 버튼 배치.
       - 하단에 `[인식 결과]` 박스(OCR 문장 텍스트)와 `[사용자 메모]` 박스(생각/메모 텍스트) 독립 영역 분리.
       - 바닥에 `[p.쪽수]` 뱃지와 `[공유]` 버튼(원클릭 클립보드 복사 및 토스트 알림) 탑재.
  4. `app/i18n/translations.js`:
     - 신규 추가된 UI 요소(`rotate3dHint`, `unknownAuthor`, `deleteThisBook`, `scrapGallery.*`) 한국어 및 영어 1:1 완벽 번역 등록.
  5. 하네스 문서(`STATE.md`, `HANDOFF.md`, `HANDOFF_2026-09.md`) 갱신 및 5세션 상한 롤링 아카이빙 유지.
- **검증**:
  - `npm run check:harness` 통과 (HANDOFF, PLAN, STATE, DECISIONS, archive 정상)
  - `npm run lint` 통과 (0 errors, 0 warnings)
  - `npm run typecheck` 통과 (0 errors)
  - `npm run build` 통과 (Vite bundle 정상 빌드)

## 2026-10-15: 3D 도서 책등 타이틀 및 앞표지 이미지 텍스처 렌더링 (질감 오버레이 보존)
- 작업 브랜치: `feat/3d-book-cover-and-spine-textures`
- **사용자 요청**:
  - 3D 도서 메쉬에 표지 및 텍스트 텍스처 반영:
    - 책등(Spine): 도서 이름 (책 제목) 표시.
    - 앞표지(Front Cover): 책 표지 이미지 (`coverUrl`) 렌더링.
    - [중요 디테일] 이미지를 입히더라도 그 위로 입혔던 텍스처의 opacity를 낮춰서 종이/패브릭 질감이 자연스럽게 유지되도록 적용.
- **작업 내용**:
  1. `app/features/bookshelf3d/bookTextureHelper.js` 신설:
     - 책등(Spine) 동적 캔버스 텍스처 생성(`createSpineTexture`):
       - 128x1024 고해상도 세로 캔버스에 책등 기본색상(`spineColor`)과 상하 클래식 북바인딩 엠보싱 라인 렌더링.
       - 한글 도서의 경우 세로쓰기 가독성 정렬, 영문 도서의 경우 90도 회전 한 줄 레이아웃 자동 분기.
       - 배경 위로 `/book_texture.webp` 질감 텍스처를 opacity 0.35로 자연스럽게 합성.
     - 앞표지(Front Cover) 동적 캔버스 텍스처 생성(`createFrontCoverTexture`):
       - 512x768 (1:1.5 표준 도서 비율) 캔버스에 `coverUrl` 표지 이미지 비동기 로딩 및 렌더링.
       - 이미지 로드 후 그 위로 `/book_texture.webp` 질감 이미지를 `globalAlpha = 0.28`, `globalCompositeOperation = 'multiply'`로 덧씌워 종이/패브릭 질감 유지.
       - 이미지 미등록 또는 로드 실패 시 타이포그래피 기반 기본 표지 레이아웃 폴백.
  2. `app/features/bookshelf3d/Book3D.jsx`:
     - `title`, `author`, `coverUrl` prop 수신 및 `createSpineTexture`, `createFrontCoverTexture` 연동.
     - BoxGeometry 머티리얼 매핑 최적화: 앞표지(`+X`)에는 `dynamicCoverMap` 및 `bumpMap`, 책등(`+Z`)에는 `dynamicSpineMap` 및 `bumpMap`, 뒤표지(`-X`)에는 기존 `coverColor` 질감 유지.
     - 비동기 표지 로드 완료 시 `invalidate()` 트리거 및 언마운트 시 `.dispose()` 메모리 해제 처리.
  3. `app/features/room/LibraryScene.jsx`:
     - `Book3D` 호출부에 `title={b.title}`, `author={b.author}`, `coverUrl={b.coverUrl || b.cover_url || b.coverImage}` 속성 전달.
  4. 하네스 문서(`STATE.md`, `HANDOFF.md`, `HANDOFF_2026-09.md`) 갱신 및 5세션 상한 롤링 아카이빙 유지.
- **검증**:
  - `npm run check:harness` 통과
  - `npm run lint` 통과 (0 errors, 0 warnings)
  - `npm run typecheck` 통과 (0 errors)
  - `npm run build` 통과 (Vite bundle 정상 빌드)

## 2026-10-15: 다국어 번역 키 노출 및 언어 반전 결함 해결, 타이머·챗 버튼 영문화
- 작업 브랜치: `feat/fix-language-switching-and-labels`
- **사용자 요청**:
  1. 로그인 페이지에서 한국어/영어 선택 시, 로그인 후 페이지들의 텍스트가 반대로 작동하는 버그 해결 (한국어 선택 시 영어/키 이름 노출, 영어 선택 시 한국어 노출 현상).
  2. 영어로 바뀐 메뉴에 `gnb.myLibrary`처럼 `gnb` 등 내부 dot-notation 키가 화면에 노출되지 않도록 수정.
  3. 플로팅 타이머 및 사서 챗 버튼 텍스트 변경:
     - 독서 타이머 -> `Book Timer`
     - 사서에게 질문하기 -> `Start Chat`
- **작업 내용**:
  1. `app/store/LanguageProvider.jsx`:
     - `t(keyOrKo, fallback)` 함수 버그 수정: 이전 구현에서 `enFallback !== undefined`를 무조건 인라인 번역으로 판단하여 한국어 모드에서 key 문자열(`gnb.myLibrary` 등)을 반환하고 영어 모드에서 fallback 한국어를 반환하던 로직을 전면 수정.
     - dot-notation key를 현재 활성 언어(`lang`) 번역 사전(`translations[lang]`)에서 우선 조회하도록 보정하여 한국어 선택 시 한국어 라벨, 영어 선택 시 영어 라벨이 정확하게 매핑되도록 처리.
     - 키가 누락되었을 경우에도 안전하게 fallback 및 반대 언어 사전으로 안전하게 폴백되도록 보장.
  2. `app/i18n/translations.js`:
     - 영문 번역 사전 내 플로팅 타이머(`library.readingTimer`, `chat.menuTimerTitle`) 라벨을 `Reading Timer`에서 `Book Timer`로 수정.
     - 영문 번역 사전 내 사서 챗 플로팅 버튼(`chat.askLibrarian`) 라벨을 `Ask Librarian`에서 `Start Chat`으로 수정.
     - 한국어/영어 번역 사전 202개 전 키 1:1 패리티 검증 완료.
  3. 하네스 문서(`STATE.md`, `HANDOFF.md`, `HANDOFF_2026-09.md`) 갱신 및 5세션 상한 롤링 아카이빙 유지.
- **검증**:
  - `npm run check:harness` 통과
  - `npm run lint` 통과 (0 errors, 0 warnings)
  - `npm run typecheck` 통과 (0 errors)
  - `npm run build` 통과 (Vite bundle 정상 빌드)

## 2026-10-12: 서비스 이용 가이드 영문 버튼 개선, 로그인 팝업 Try Out DPYB 문구 보정 및 모바일 햄버거 메뉴 영문화 검증
- 작업 브랜치: `feat/guide-login-and-menu-en-refinements`
- **사용자 요청**:
  1. 서비스 사용가이드에 영문버전 버튼 용어 수정: 다음 슬라이드 넘길 때 그냥 `next`라고만 적고, 그 왼쪽에 있는 close 버튼은 이전 슬라이드 보는 버튼(`prev`/`Previous`)으로 변경.
  2. 서비스 사용가이드 다음에 뜨는 팝업창에 Try DPYB라고 적혀 있는 문구를 `Try Out DPYB`로 변경.
  3. 햄버거 메뉴에 있는 내서재, 책등록, 독서 리포트, 마이페이지 영문 지원 적용.
- **작업 내용**:
  1. `app/features/guide/ServiceGuideModal.jsx` & `app/i18n/translations.js`:
     - 하단 푸터 액션 영역에서 기존 모달 닫기(`close`) 버튼을 이전 슬라이드로 이동하는 `Previous`(`이전`) 버튼으로 전면 전환 (`onClick={handlePrev}`, `disabled={isFirst}`, 첫 슬라이드에서는 숨김 처리).
     - 다음 버튼 텍스트를 `Next ›`에서 화살표 없는 간결한 `Next`(`다음`)로 개편.
     - 마지막 슬라이드에서도 이전 슬라이드를 다시 확인할 수 있도록 `Previous` 버튼을 함께 배치.
  2. `app/pages/LoginPage.jsx`:
     - 로그인 이용 안내 모달의 2번째 항목(테스트 운영 중) 설명 문구 영문 텍스트 내 `Try DPYB`를 `Try Out DPYB`로 변경.
     - 메인 캔버스 DPYB 체험 버튼 툴팁(`tooltipEn`)도 `Try Out DPYB (Explore without login)`로 정합성 일원화.
  3. `app/components/Gnb.jsx`:
     - 모바일 햄버거 드로어 네비게이션 내 1~4번 메인 메뉴(`My Library`, `Add Book`, `Reading Report`, `My Page`) 및 서브메뉴가 `useLanguage()` 및 다국어 사전을 통해 영어 모드 시 영문으로 완벽히 출력되는 상태 재검증 및 유지.
  4. 하네스 문서(`STATE.md`, `HANDOFF.md`, `HANDOFF_2026-09.md`) 갱신 및 5세션 상한 롤링 아카이빙 유지.
- **검증**:
  - `npm run check:harness` 통과 (HANDOFF, PLAN, STATE, DECISIONS, archive 정상)
  - `npm run lint` 통과 (0 errors, 0 warnings)
  - `npm run typecheck` 통과 (0 errors)
  - `npm run build` 통과 (Vite bundle 정상 빌드)

## 2026-10-11: 내 서재 및 전역 페이지 다국어(영어) 번역 지원
- 작업 브랜치: `feat/app-english-translation`
- **사용자 요청**:
  - 사용자가 로그인 페이지에서 영어를 선택(`lang === 'en'`)하여 내 서재 페이지(`/library`)에 들어왔을 때 GNB 메뉴를 포함한 모든 페이지의 텍스트들을 영어로 전환.
- **작업 내용**:
  1. `app/i18n/translations.js`:
     - 한국어(`ko`) 및 영어(`en`) 사전 정의 (`common`, `status`, `genre`, `gnb`, `library`, `chat`, `debate`, `bookDetail`, `register`, `report`, `mypage`, `profiles`, `guide`).
     - 독서 상태(`formatReadingStatus`) 및 장르(`formatGenre`) 헬퍼 함수 구현.
  2. `app/store/LanguageProvider.jsx` & `app/store/languageStore.js`:
     - `t(keyOrKo, enFallback)` 함수 지원 (dot-notation, inline fallback, object 모두 지원).
     - `useLanguage()` re-export 및 `formatStatus`, `formatGenre`, `isEn`, `isKo` 전역 제공.
  3. `app/components/Gnb.jsx`:
     - 데스크톱 메뉴(`내 서재`, `책 등록`, `독서 리포트`, `마이페이지`, `로그아웃`).
     - 프로필 바텀시트 메뉴(`사서 프로필`, `라이트/다크 모드`, `로그아웃`).
     - 모바일 햄버거 드로어 전체 메뉴 및 서브메뉴(도서검색, ISBN촬영, 직접입력, 독서리스트, 캘린더, 내정보) 다국어화.
  4. `app/pages/MyLibrary.jsx` & `app/features/room/LibraryScene.jsx` & `app/features/room/MobileShelfSheet.jsx`:
     - 3D 서재 로딩 안내(`Preparing your library... 🐾`), 선반 탭(`Shelf {N}`), 빈 선반 안내, 책 호버 말풍선, 타이머 플로팅 버튼, 상태 배지 영문화.
  5. 사서 대화 및 토론 컴포넌트:
     - `ChatModeTabs`, `ChatHeader`, `ChatInputForm`, `ChatMessageList`, `DebateSetupSection`, `MobileChatFAB`, `LibrarianChat` 전체 UI 텍스트(탭, 플레이스홀더, 필터, 버튼, 토론 안내) 다국어화.
  6. `app/features/room/BookDetail.jsx`:
     - 도서 상세 메타 레이블, 페이지 입력 안내, 액션 버튼(수정, 삭제, 저장, 독서타이머, 문장수집, 탭), 삭제 확인 팝업 다국어화.
  7. `app/pages/RegisterBook.jsx`:
     - 도서 등록 탭(검색, 바코드/표지, 직접입력) 및 상세 등록 폼 헤더 영문화.
  8. `app/pages/MonthlyReport.jsx`, `app/pages/MyPage.jsx`, `app/pages/LibrarianProfiles.jsx`, `app/features/guide/ServiceGuideModal.jsx`:
     - 월간 리포트 카드 타이틀/지표, 마이페이지 탭 및 프로필/계정 카드, 사서 프로필 카드/버튼, 서비스 가이드 푸터 버튼 다국어화.
  9. 하네스 문서(`STATE.md`, `HANDOFF.md`, `HANDOFF_2026-09.md`) 갱신 및 5세션 상한 롤링 아카이빙 유지.
- **검증**:
  - `npm run check:harness` 통과 (HANDOFF, PLAN, STATE, DECISIONS, archive 정상)
  - `npm run lint` 통과 (0 errors, 0 warnings)
  - `npm run typecheck` 통과 (0 errors)
  - `npm run build` 통과 (Vite bundle 정상 빌드)

