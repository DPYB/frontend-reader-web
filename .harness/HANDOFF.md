# HANDOFF (세션별 서술 로그, append-only)

## 2026-10-19: 사서 프로필 배경 통일, 블루 커서 화질 선명화 및 3D 도서 뒤표지 텍스처 완화
- 작업 브랜치: `feat/librarian-profile-bg-cursor-and-3d-backcover-opacity`
- **사용자 요청**:
  1. 사서들 프로필 사진 배경 컬러 통일.
  2. 블루 커서용 이미지 중 클릭 시 변경되는 모션 이미지(`cat_04.webp`) 화질 검토 및 개선/선명화(sharpen).
  3. 3D 도서로 볼 때 책의 뒷면(Back Cover) 텍스처 opacity 낮추기.
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

## 2026-10-18: 도서 상세 모달 내 이전/다음 도서 탐색 네비게이션 기능 추가
- 작업 브랜치: `feat/book-detail-prev-next-navigation`
- **사용자 요청**:
  - 서재 선반에서 도서 클릭 시(PC 환경) 현재 보고 있는 도서의 상세 모달을 닫지 않고도 다음/이전 책으로 바로 이동하여 탐색할 수 있는 네비게이션 버튼 제공.
- **작업 내용**:
  1. `app/i18n/translations.js`:
     - `bookDetail.prevBook` ('이전 도서' / 'Previous Book'), `bookDetail.nextBook` ('다음 도서' / 'Next Book') 다국어 키 추가.
  2. `app/features/room/BookDetail.css` 신설:
     - PC 전용 플로팅 대형 좌우 화살표 버튼(`.book-nav-float-btn`) 및 모달 상단 네비게이션 필(`.book-detail-nav-arrow-btn`) 스타일링.
     - 다크 글래스모피즘(`backdrop-filter: blur(12px)`), 은은한 호버 글로우 및 부드러운 스케일 트랜지션 적용.
  3. `app/features/room/BookDetail.jsx`:
     - 네비게이션 관련 props(`onPrevBook`, `onNextBook`, `hasPrev`, `hasNext`, `currentIndex`, `totalBooks`, `prevBookTitle`, `nextBookTitle`) 수신 및 컴팩트 상단 필(`{currentIndex + 1} / {totalBooks}`)과 PC 전용 좌우 플로팅 쉐브론 버튼 배치.
     - 키보드 좌/우 화살표 단축키(`ArrowLeft`, `ArrowRight`) 리스너 연동 (입력창/메모 편집 포커스 중 제외).
  4. `app/features/room/LibraryScene.jsx`:
     - 선반 내 전체 도서 목록(`sourceBooks`) 기반으로 현재 선택된 도서의 인덱스 추적 및 `onPrevBook`/`onNextBook` 핸들러 바인딩.
     - 도서 전환 시 React key(`key={book.id || book.bookId || book.title}`)를 통해 3D 뷰어, 상세 데이터, 문장 갤러리 및 타이머 세션 상태가 완벽히 초기화되어 stale state 없이 즉시 반영되도록 구현.
     - 배경 3D 책장에서도 선택된 책이 자동으로 슬라이드 아웃/인 애니메이션 동기화.
  5. `app/pages/MyPage.jsx`:
     - 마이페이지 독서 리스트 및 독서 캘린더 모달에서도 동일한 이전/다음 도서 탐색이 가능하도록 `useBooks` 연동 및 네비게이션 props 바인딩.
  6. 하네스 문서(`STATE.md`, `HANDOFF.md`, `HANDOFF_2026-09.md`) 갱신 및 5세션 상한 롤링 아카이빙 유지.
- **검증**:
  - `npm run check:harness` 통과 (HANDOFF, PLAN, STATE, DECISIONS, archive 정상)
  - `npm run lint` 통과 (0 errors, 0 warnings)
  - `npm run typecheck` 통과 (0 errors)
  - `npm run build` 통과 (Vite bundle 정상 빌드)

## 2026-10-18: 도서 직접 등록 시 책 표지 사진 촬영/업로드 및 R2 Presigned URL 연동
- 작업 브랜치: `feat/register-book-custom-cover-upload`
- **사용자 요청**:
  - 도서 직접 입력 모드에서 사용자가 책 표지를 사진 촬영하거나 선택하여 업로드할 수 있도록 지원하고, 이 사진이 서재 3D 책 모델의 앞표지(frontCover) 텍스처로 자동 적용되도록 구현.
  - Cloudflare R2 `dpyb-public/frontcover/beta/` 경로 연동.
- **작업 내용**:
  1. `app/utils/imageCompressor.js`:
     - `compressBookCover(file, { maxDimension: 1200, quality: 0.88 })`: 책 표지 종횡비를 유지하며 긴 축 기준 최대 1200px 리사이즈 및 고화질 WebP Blob 변환 유틸리티 구현.
  2. `app/api/bookApi.js`:
     - `getBookCoverPresignedUrl({ contentType })`: Core API(`POST /api/v1/library/books/cover/presigned-url`) 호출 함수 추가.
  3. `app/pages/RegisterBook.jsx` & `BookRegisterForm.jsx` & `RegisterBook.css`:
     - 표지 사진 마우스 호버 오버레이(`📷 표지 등록`), 카메라 촬영(`📷 촬영`), 앨범 선택(`🖼️ 앨범`), 표지 초기화(`✕ 제거`) 컨트롤 UI 추가.
     - 모바일에서는 후면 카메라(`capture="environment"`) 자동 실행, PC에서는 웹캠 촬영 모달(`WebcamCaptureModal`) 지원.
     - 표지 사진 업로드 시 대표 색상을 자동 추출(`extractDominantColorIndex`)하여 책등(spine) 컬러도 추천 프리셋으로 자동 매핑.
     - Cloudflare R2 버킷 `dpyb-public/frontcover/beta/`로 Presigned PUT 직접 전송 및 R2 CDN URL(`https://cdn.ai0208.xyz/frontcover/beta/{uuid}.webp`) 바인딩.
     - 백엔드 엔드포인트 미배포 상태에서도 에러 없이 로컬 Blob/Data URL로 3D 모델 및 등록 폼에 즉시 반영되는 Graceful Fallback 구현.
  4. 하네스 문서(`STATE.md`, `HANDOFF.md`, `HANDOFF_2026-09.md`) 갱신 및 5세션 상한 롤링 아카이빙 유지.
- **검증**:
  - `npm run check:harness` 통과 (HANDOFF, PLAN, STATE, DECISIONS, archive 정상)
  - `npm run lint` 통과 (0 errors, 0 warnings)
  - `npm run typecheck` 통과 (0 errors)
  - `npm run build` 통과 (Vite bundle 정상 빌드)

## 2026-10-18: 문장 수집 이미지 Cloudflare R2 Presigned URL 연동 및 WebP 최적화
- 작업 브랜치: `feat/quote-image-r2-upload`
- **사용자 요청**:
  - Cloudflare R2 `dpyb-public/quote/beta/` 경로 생성에 맞춰 문장 수집(Sentence Scrap) 사진 업로드 연동 및 백엔드 팀원 전달 사항 작성.
- **작업 내용**:
  1. `app/utils/imageCompressor.js`:
     - `compressQuoteImage(file, { maxDimension: 1600, quality: 0.85 })`: 문장 사진의 텍스트 가독성을 보존하기 위해 1:1 크롭 대신 **원본 가로세로 비율을 유지**하면서 최대 1600px 리사이즈 및 고화질 WebP Blob 압축 유틸리티 구현.
  2. `app/api/bookApi.js`:
     - `getQuoteImagePresignedUrl({ contentType })`: Core API(`POST /api/v1/library/scraps/presigned-url`) 호출 함수 추가.
  3. `app/features/room/SentenceCollectModal.jsx`:
     - 파일 업로드 및 카메라 촬영(`handleFile`) 시 `compressQuoteImage`로 사진을 압축(10MB 원본 ➔ 200~300KB WebP)하여 R2 버킷 `quote/beta/`로 Presigned PUT 직접 전송.
     - 발급된 R2 CDN URL(`https://cdn.ai0208.xyz/quote/beta/...`)을 `pendingImageUrl` 및 `createScrap`의 `scrapImageUrl`로 바인딩.
     - 백엔드 Presigned 엔드포인트 미배포 상태에서도 에러 없이 로컬 Blob/Data URL로 graceful fallback 작동 보장.
     - AI Agent OCR 전송 시에도 경량화된 WebP를 전송하여 네트워크 지연 대폭 단축.
  4. 하네스 문서(`STATE.md`, `HANDOFF.md`, `HANDOFF_2026-09.md`) 갱신 및 5세션 상한 롤링 아카이빙 유지.
- **검증**:
  - `npm run check:harness` 통과 (HANDOFF, PLAN, STATE, DECISIONS, archive 정상)
  - `npm run lint` 통과 (0 errors, 0 warnings)
  - `npm run typecheck` 통과 (0 errors)
  - `npm run build` 통과 (Vite bundle 정상 빌드)
