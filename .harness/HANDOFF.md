# HANDOFF (세션별 서술 로그, append-only)

## 2026-10-10: 로그인 페이지 이용 안내 팝업 모달 문구 정돈 (테스트 운영 중 설명 교체 및 DPYB 체험하기 항목 제거)
- 작업 브랜치: `feat/update-login-notice-content`
- **사용자 요청**:
  - `🧪 현재 테스트 운영 중` 항목 설명을 "로그인 없이 DPYB 체험하기 버튼을 눌러 AI 사서와 자유롭게 대화해 보세요."로 교체.
  - `🐾 DPYB 체험하기` 항목 제거.
  - 나머지 항목(PC 환경 권장, 문의 및 피드백 등)은 그대로 유지.
- **작업 내용**:
  1. `app/pages/LoginPage.jsx`:
     - `🧪 현재 테스트 운영 중` 카드의 설명 문구를 `로그인 없이 DPYB 체험하기 버튼을 눌러` / `AI 사서와 자유롭게 대화해 보세요.`로 업데이트.
     - 중복 안내가 된 `🐾 DPYB 체험하기` 카드 항목 제거.
  2. 하네스 문서(`STATE.md`, `HANDOFF.md`, `HANDOFF_2026-09.md`) 갱신 및 5세션 상한 롤링 아카이빙 유지.
- **검증**:
  - `npm run check:harness` 통과 (HANDOFF, PLAN, STATE, DECISIONS, archive 정상)
  - `npm run lint` 통과 (0 errors, 0 warnings)
  - `npm run typecheck` 통과 (0 errors)
  - `npm run build` 통과 (Vite bundle 정상 빌드)

## 2026-10-10: 기본 도서('방구석 미술관') 수정 및 삭제 UI 비활성화 보호
- 작업 브랜치: `feat/protect-default-book-actions`
- **사용자 요청**:
  - `dpyb@gmail.com` 계정에 유일하게 등록된 '방구석 미술관' 도서만 수정 및 삭제 기능(UI 버튼 클릭 불가)을 비활성화.
  - 이 다음에 새롭게 추가되는 책들은 기존과 동일하게 수정 및 삭제가 가능하도록 유지.
- **작업 내용**:
  1. `app/features/room/BookDetail.jsx`:
     - `useAuth()`에서 `member` 정보를 연동하고, 사용자 이메일(`dpyb@gmail.com` / `dpyb26@gmail.com`) 및 도서명(`방구석 미술관`)을 기반으로 `isProtectedBook` 판별 플래그 산출.
     - `수정` 버튼: `isProtectedBook`일 때 `disabled`, `cursor: not-allowed`, 흐림(`opacity: 0.45`), 비활성 테두리/텍스트 스타일 및 툴팁(`기본 도서는 수정할 수 없습니다`) 적용.
     - `삭제` 버튼: `isProtectedBook`일 때 `disabled`, `cursor: not-allowed`, 흐림(`opacity: 0.45`), 비활성 테두리/텍스트 스타일 및 툴팁(`기본 도서는 삭제할 수 없습니다`) 적용.
     - `handleSave` 및 `handleDelete` 핸들러에 `isProtectedBook` 방어 가드 추가 및 삭제 모달(`confirmDelete`) 방어.
     - 신규 추가된 도서는 `isProtectedBook`이 `false`로 판별되어 정상적으로 수정 및 삭제 가능.
  2. 하네스 문서(`STATE.md`, `HANDOFF.md`, `HANDOFF_2026-09.md`) 갱신 및 5세션 상한 롤링 아카이빙 유지.
- **검증**:
  - `npm run check:harness` 통과 (HANDOFF, PLAN, STATE, DECISIONS, archive 정상)
  - `npm run lint` 통과 (0 errors, 0 warnings)
  - `npm run typecheck` 통과 (0 errors)
  - `npm run build` 통과 (Vite bundle 정상 빌드)

## 2026-10-09: 슈빌(황새) 서재 커서 크기 배율 최적화 (게코 < 슈빌 < 기존)
- 작업 브랜치: `feat/adjust-shoebill-cursor-size`
- **사용자 요청**:
  - 슈빌(황새) 커서 크기를 게코(`1.25`)보다는 크지만 기존 크기(`1.38`)보다는 작게 줄여서 밸런스 조정.
- **작업 내용**:
  1. `app/data/librarians.js`:
     - 슈빌 사서(`id: 'stork'`, 황새)의 `imgScale` 값을 `1.38`에서 `1.31`로 최적화.
     - 서재 씬(`LibrarianCursor.jsx`)에서 게코(`1.25`)보다 시각적 체격이 크면서도 화면 요소를 과도하게 가리지 않는 황금 비율(1.31) 확보.
  2. 하네스 문서(`STATE.md`, `HANDOFF.md`, `HANDOFF_2026-09.md`) 갱신 및 5세션 상한 롤링 아카이빙 유지.
- **검증**:
  - `npm run check:harness` 통과 (HANDOFF, PLAN, STATE, DECISIONS, archive 정상)
  - `npm run lint` 통과 (0 errors, 0 warnings)
  - `npm run typecheck` 통과 (0 errors)
  - `npm run build` 통과 (Vite bundle 정상 빌드)

## 2026-10-09: 로그인 페이지 소셜(카카오/구글) 로그인 버튼 UI 비활성화 및 DPYB 체험하기 호버 반짝임/선택 효과 적용
- 작업 브랜치: `feat/login-social-disabled-and-guest-hover-glow`
- **사용자 요청**:
  - 로그인 페이지에서 Kakao 로그인 및 Google 로그인 버튼 UI 적으로만 비활성화 처리.
  - DPYB 체험하기 버튼에 마우스 커서를 올렸을 때(Hover) 선택된 것처럼 반짝이는 인터랙션 효과 적용.
- **작업 내용**:
  1. `app/pages/LoginPage.jsx`:
     - `BUTTONS` 배열 내 `kakao` 및 `google` 툴팁을 `카카오 로그인 (준비 중)`, `Google 로그인 (준비 중)`으로 정돈.
     - `isButtonDisabled`: `kakao`, `google`을 비활성(`disabled = true`) 목록에 추가하여 클릭 인터랙션 차단.
     - `handleClick`: `case 'google'`, `case 'kakao'` 핸들러 분기 비활성화.
     - `LoginButton`: `isDpyb`(`btn.id === 'dpyb'`) 판별 및 호버 시 내부 쉬머 스윕(`.login-dpyb-sparkle-shine`)과 트윙클 별(`.login-dpyb-star`) 컴포넌트 렌더링.
  2. `app/pages/LoginPage.css`:
     - `.login-layer-img--dpyb-glow`: DPYB 체험하기 버튼 호버 시 웜 골드/앰버 글로우(`drop-shadow`) 및 펄스 호버 애니메이션(`dpyb-pulse-glow`) 적용.
     - `.login-hit-area--dpyb-hover`: 방사형 앰버 하이라이트 배경, 골드 네온 섀도우 및 스케일업(`transform: scale(1.025)`) 마이크로 인터랙션 구현.
     - `.login-dpyb-sparkle-shine` & `.login-dpyb-star`: 쉬머 스윕 광선 애니메이션(`@keyframes dpyb-shimmer-sweep`) 및 별빛 트윙클 애니메이션(`@keyframes dpyb-star-twinkle`) 구현.
     - `.login-hit-area--disabled .login-hit-tooltip`: 비활성 버튼 툴팁 디자인(준비 중 앰버 보더) 정비.
  3. 하네스 문서(`STATE.md`, `HANDOFF.md`, `HANDOFF_2026-09.md`) 갱신 및 5세션 상한 롤링 아카이빙 유지.
- **검증**:
  - `npm run check:harness` 통과 (HANDOFF, PLAN, STATE, DECISIONS, archive 정상)
  - `npm run lint` 통과 (0 errors, 0 warnings)
  - `npm run typecheck` 통과 (0 errors)
  - `npm run build` 통과 (Vite bundle 정상 빌드)

## 2026-10-09: 도서 등록 표지/바코드 촬영 OCR 파일 페이로드 바인딩 및 10/13자리 ISBN 인식 결함 해결
- 작업 브랜치: `fix/isbn-scan-file-payload-and-recognition`
- **사용자 요청**:
  - 도서 등록(`RegisterBook`) 화면에서 카메라 촬영 또는 이미지 업로드로 ISBN 인식 시도 시 "ISBN을 찾지 못했어요. 바코드 아래 13자리 숫자가 선명하게 보이도록 다시 찍어 주세요." 에러가 발생하며 정상적인 바코드/도서 사진임에도 인식이 되지 않는 결함 해결.
- **원인 분석**:
  1. **FormData 페이로드 바인딩 불일치**:
     - `RegisterBook.jsx`의 `handleFile`에서 `createOcrCover(file)`을 직접 `File` 객체로 호출했으나, `recordApi.js`의 `createOcrCover({ imageFile, modelId = null })`는 객체 구조분해 할당을 기대함.
     - `file` 객체에는 `imageFile` 속성이 존재하지 않아 `imageFile = undefined`로 평가되고, `form.append('image', undefined)`가 문자열 `"undefined"`를 전송함.
     - FastAPI 백엔드(`image: UploadFile = File(...)`)가 문자열을 수신하여 `422 Unprocessable Entity` (`Expected UploadFile, received: <class 'str'>`)를 반환하고, 프론트엔드가 이를 422 바코드 흐림 에러로 오인 표출.
  2. **ISBN-10 (2007년 이전 출판 도서) 미대응**:
     - 2007년 이전 출판 도서의 경우 바코드 텍스트나 하단 인쇄 문구에 10자리 ISBN(`ISBN 89-302-0063-X`)이 적혀있을 때, 프론트엔드 라인 파서가 13자리(`978/979`)만 필터링하여 유효한 ISBN을 놓칠 수 있는 구조.
- **작업 내용**:
  1. `app/api/recordApi.js`:
     - `createOcrCover`: `File`/`Blob` 인스턴스 직접 전달 및 `{ imageFile, modelId }` 객체 형태를 모두 지원하도록 유연화(`isFileLike` 분기)하고, 파일명(`filename`)을 명시하여 `FormData`에 온전한 멀티파트 파일 바이너리가 탑재되도록 수정.
     - `convertIsbn10To13`: 10자리 ISBN을 표준 13자리 ISBN(모듈로-10 가중치 체크섬 계산)으로 변환하는 유틸리티 구현.
     - `findIsbnInLines`: 1차 13자리 정규식 탐색 후, 2차 10자리 ISBN(`89-302-0063-X` 등) 발견 시 13자리로 자동 변환하여 서지 API 조회가 완벽히 연동되도록 보강.
  2. `app/pages/RegisterBook.jsx`:
     - `createOcrCover({ imageFile: file })`로 호출부 파라미터 구조 명시적 통일.
     - `describeCoverOcrError`: 에러 메시지 문구를 10자리/13자리 포괄 및 직접 입력 안내로 정돈.
  3. 하네스 문서(`STATE.md`, `HANDOFF.md`, `HANDOFF_2026-09.md`) 갱신 및 5세션 상한 롤링 아카이빙 유지.
- **검증**:
  - 사용자 실측 도서 이미지(`media_1791550411435.png`: `9788930200639` / `89-302-0063-X` - 논술프로그램세계명작 지킬 박사와 하이드) 백엔드 및 국립도서관 API 연동 200 OK 실측 검증 완료.
  - `npm run check:harness` 통과 (HANDOFF, PLAN, STATE, DECISIONS, archive 정상)
  - `npm run lint` 통과 (0 errors, 0 warnings)
  - `npm run typecheck` 통과 (0 errors)
  - `npm run build` 통과 (Vite bundle 정상 빌드)


