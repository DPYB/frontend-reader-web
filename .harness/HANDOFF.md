# HANDOFF (세션별 서술 로그, append-only)

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

