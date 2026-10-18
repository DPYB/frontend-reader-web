# HANDOFF (세션별 서술 로그, append-only)

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

## 2026-10-18: 마이페이지 프로필 사진 변경 및 R2 Presigned URL 연동
- 작업 브랜치: `feat/mypage-profile-image-upload`
- **사용자 요청**:
  - 사용자가 마이페이지에서 프로필 사진을 변경할 때 Cloudflare R2 `dpyb-public/profile/beta/`에 자동으로 저장되도록 구현.
- **작업 내용**:
  1. `app/utils/imageCompressor.js` 신설:
     - `cropAndCompressAvatar(file, { targetSize: 512, quality: 0.88 })`: 브라우저 Canvas 기반 1:1 정방형 중앙 크롭 및 고품질 WebP Blob 변환 유틸리티 구현.
  2. `app/api/authApi.js`:
     - `getProfileImagePresignedUrl({ contentType })`: 백엔드(`POST /api/v1/users/me/profile-image/presigned-url`) 호출 함수 구현.
     - `uploadImageToPresignedUrl(presignedUrl, blob, contentType)`: R2 버킷 직접 PUT 전송 함수 구현.
  3. `app/pages/MyPage.jsx` & `MyPage.css`:
     - 프로필 아바타 클릭 시 파일 선택창(`input[type="file"]`) 연동 및 카메라 호버 오버레이, 플로팅 카메라 배지(`📷`), 업로드 스피너 UI 구현.
     - 10MB 크기 제한 및 이미지 MIME 타입 검증, 게스트 체험 모드 시 로컬 브라우저 임시 반영 fallback 구현.
     - 백엔드 Presigned API 미배포 시에도 graceful fallback(로컬 프리뷰 보존 및 안내 토스트) 처리.
  4. `app/i18n/translations.js`:
     - `changeAvatar`, `changeAvatarShort`, `avatarUploading`, `avatarSuccess`, `avatarFailed`, `avatarGuestNotice`, `avatarSizeError` 다국어 키 추가.
  5. 하네스 문서(`STATE.md`, `HANDOFF.md`, `HANDOFF_2026-09.md`) 갱신 및 5세션 상한 롤링 아카이빙 유지.
- **검증**:
  - `npm run check:harness` 통과 (HANDOFF, PLAN, STATE, DECISIONS, archive 정상)
  - `npm run lint` 통과 (0 errors, 0 warnings)
  - `npm run typecheck` 통과 (0 errors)
  - `npm run build` 통과 (Vite bundle 정상 빌드)

## 2026-10-17: 프로필 이미지 Cloudflare R2 CDN 연결 및 로컬 에셋 정리
- 작업 브랜치: `feat/r2-cdn-profile-assets`
- **사용자 요청**:
  - Cloudflare R2 `dpyb-public/profile/`에 업로드된 사서 및 테스트 프로필 이미지 6종을 프론트엔드에 연결하고 로컬 파일 정리.
  - 버킷 구조:
    - `dpyb-public/profile/librarian/`: `cat.webp`, `gecko.webp`, `nudi.webp`, `stork.webp`
    - `dpyb-public/profile/test/`: `chris.webp`, `clia.webp`
- **작업 내용**:
  1. `app/data/librarians.js`:
     - `cdnUrl` 헬퍼를 활용하여 사서 4종의 `profileImage` 경로를 R2 CDN 경로(`profile/librarian/{id}.webp`)로 전환.
  2. `app/store/AuthProvider.jsx`:
     - 게스트/테스트 세션의 `profile_image_url`을 `cdnUrl('profile/test/clia.webp')`로 전환.
  3. `app/store/authBypass.js`:
     - 로컬 개발 우회 계정의 `profile_image_url`을 `cdnUrl('profile/test/chris.webp')`로 전환.
  4. `public/profile/`:
     - R2 CDN 전환에 따라 로컬 WebP 파일 6종(`cat.webp`, `chris.webp`, `clia.webp`, `gecko.webp`, `nudi.webp`, `stork.webp`) 전체 삭제.
     - 회원 기본 아바타 fallback인 `default_avatar.svg`는 로컬에 유지.
  5. 하네스 문서(`STATE.md`, `HANDOFF.md`, `HANDOFF_2026-09.md`) 갱신 및 5세션 상한 롤링 아카이빙 유지.
- **검증**:
  - CDN 6개 파일 HEAD 요청 200 / `image/webp` 확인
  - `npm run check:harness`, `npm run lint`, `npm run typecheck`, `npm run build` 통과
