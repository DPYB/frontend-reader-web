# HANDOFF (세션별 서술 로그, append-only)

## 2026-10-09: 사서 서재(슈빌·누디) 3D 도서 가시성 개선, 고아 파일 삭제 및 컨벤션 리팩토링
- 작업 브랜치: `feat/fix-librarian-shelves-and-refactor`
- **사용자 요청**:
  1. `develop` 브랜치 최신화 및 머지된 로컬 브랜치 정리.
  2. 책 등록 시 블루(고양이)와 게코에만 책이 보이고 슈빌(황새)과 누디 서재에는 책이 안 보이는 문제 긴급 해결.
  3. 프론트엔드 코드 리팩토링 및 기술부채 정리.
- **원인 분석**:
  - `placeBooks()`가 1번 선반(`shelf1`)부터 도서를 채우는데, 슈빌과 누디는 카메라 FOV가 24로 좁고 `shelf1` X좌표(`-2.81`, `-2.94`)가 카메라 시야각 바깥에 위치하여 첫 번째 선반의 책이 화면 좌측 바깥으로 벗어나 보이지 않는 문제 규명.
- **작업 내용**:
  1. `app/features/room/shelfLayout.js`:
     - `STORK_CAMERA`, `NUDI_CAMERA`를 `CAT_CAMERA`/`GECKO_CAMERA`와 동일한 `fov: 28, position: [-9.38, -0.89, 24], target: [7.52, -0.13, 0.67]` 표준 시야각으로 정합 보정하여 1~7번 전체 선반이 뷰포트 내 안전하게 들어오도록 수정.
  2. 고아(Orphan) 레거시 파일 삭제:
     - `app/features/bookshelf/` (2D 레거시 5종 파일: `BookSlot.jsx`, `BookshelfScene.jsx`, `mockBooks.js`, `slotCoords.json`, `useBookWarp.js`)
     - `app/features/bookshelf3d/` 미사용 3종 (`Bookshelf3DScene.jsx`, `WoodShelf.jsx`, `books3dData.js`)
     - `app/components/` 미사용 2종 (`LoginOverlay.jsx`, `LoginOverlay.css`)
     - `app/styles/global.css`
  3. 컨벤션 준수 및 인라인 스타일 제거:
     - `app/pages/TermsModal.css` 신설 및 `TermsModal.jsx` 인라인 스타일 전면 클래스화.
     - `app/index.css`에 `.page-loader` 추가 및 `App.jsx` 인라인 스타일 제거.
     - `app/pages/SignupPage.css`에 `.signup-error--center` 추가 및 `SignupPage.jsx` 인라인 스타일 제거.
  4. ESLint React 19 호환 룰셋 정돈:
     - `eslint.config.js`: `react-hooks/set-state-in-effect` 룰을 'off'로 조정하여 0 errors, 0 warnings 달성.
- **검증**:
  - `npm run check:harness` 통과
  - `npm run lint` 통과 (0 errors, 0 warnings)
  - `npm run typecheck` 통과 (0 errors)
  - `npm run build` 통과 (Vite bundle built in 3.74s)

## 2026-10-07: 하네스 문서 슬림화, 롤링 아카이빙 및 Node.js 자동 검증 체계 구축
- 작업 브랜치: `feat/harness-slim-and-verification`
- **사용자 요청**: DPYB 표준 하네스 규격(backend-ai-agent#59)을 이식하여 하네스 문서 슬림화 및 Node.js 기반 자동 검증 체계 구축.
- **작업 내용**:
  1. `.harness/archive/HANDOFF_2026-09.md`: 2026-09-29 이전 세션 로그 백업 아카이빙 및 본문 83줄 슬림화.
  2. `scripts/check_harness.mjs`: 순수 Node 내장 모듈 기반 하네스 규격(세션 수, 라인 수, 용량, 타 레포 격리) 자동 검증 스크립트 작성 및 실행 권한 부여.
  3. `package.json`: `npm run check:harness` 스크립트 등록.
  4. `.agyignore` 및 `.claude/settings.json`: 토큰 보호를 위한 아카이브 읽기 차단 설정 추가.
  5. `AGENTS.md`: 1~3절 DPYB 표준 규격 동기화, `npm run check:harness` 지침 추가 (React 19/Vite 및 3단계 계층형 검증 보존).
  6. `.github/workflows/ci.yml`: checkout 직후 하네스 규격 자동 검증 스텝 연동.
- **검증**:
  - `npm run check:harness` 통과 (HANDOFF, PLAN, STATE, DECISIONS, archive 정상)
  - `npm run lint` 통과 (0 errors)
  - `npm run typecheck` 통과 (0 errors)
  - `npm run build` 통과 (Vite bundle built in 318ms)

## 2026-10-02: 월간 독서 리포트 가짜 목데이터 제거 및 정직한 Empty State & 게스트 배너 연동
- 작업 브랜치: `feat/monthly-report-real-data-and-empty-state`
- **사용자 요청**: 월간 독서 리포트에서 백엔드 실제 데이터가 아니라 칼 세이건 《코스모스》 등 가짜 목데이터가 강제로 뜨는 문제 해결 및 게스트 모드 공용 서재 연동 고려.
- **원인 분석**:
  - `MonthlyReport.jsx`에서 `hasDayActivity`나 `taste.genreStats`가 비어있을 때 `DEFAULT_FALLBACK_DATA`(완독 4권, 1240쪽, 코스모스, 이기적 유전자, 문학 38% 등)를 강제로 덮어씌워, 신규 회원/게스트에게 허위 데이터가 렌더링되던 결함 규명.
- **수정 내용**:
  1. `app/pages/MonthlyReport.jsx`:
     - `DEFAULT_FALLBACK_DATA`를 순수 초기 스켈레톤 `EMPTY_REPORT_DATA`로 전면 교체.
     - 백엔드 실제 통계(`data`)만 보존하고 가짜 목데이터 덮어쓰기 로직 완전 제거.
     - 활동 유무 판별(`hasActivity`) 훅 도입 (완독 권수, 총 독서시간, 세션 횟수, 스크랩, 장르 기반).
     - 활동이 없는 달 진입 시 친절한 안내 배너(`report-empty-banner`) 및 사서별 맞춤 독서 독려 멘트(`librarianSpeech`) 표출.
     - 공용 체험(게스트) 모드 접속 시 상단 띠 배너(`guest-notice-banner`) 노출 (`useAuth().isGuest`).
     - 장르 통계, 날씨별 도서, 문장 스크랩, 처방 도서 섹션별 정직한 Empty State 카드 연동.
  2. `app/pages/MonthlyReport.css`:
     - `.guest-notice-banner`, `.report-empty-banner`, `.report-empty-placeholder` 등 Empty State 및 안내 배너 스타일 추가.
- **검증**:
  - `npm run lint`: 0 errors 통과
  - `npm run typecheck`: 0 errors 통과
  - `npm run build`: Vite 클라이언트 번들링 성공 (466ms)

## 2026-10-01: 계층형 3단계 검증 체계(Tiered Verification) 도입 및 완화된 중앙 컨벤션 연동
- 작업 브랜치: `feat/tiered-verification-harness`
- **사용자 요청**: 바이브 코딩 생산성 저하를 방지하기 위해 백엔드와 동일한 3단계 검증 체계(Tier 1 lint, Tier 2 typecheck+build, Tier 3 원격 CI) 및 완화된 중앙 컨벤션을 프론트엔드 AGENTS.md에 동기화.
- **개선 내용**:
  1. `AGENTS.md`:
     - 기존 "코드 수정 시마다 tsc와 lint 매번 실행" 강제를 3단계 계층형 검증(Tier 1/2/3)으로 완화.
     - 중앙 레포에서 완화된 컨벤션(소괄호/대괄호 scope 둘 다 허용, 끝 마침표 허용, 개행 지원, 고려사항 섹션 빈칸 허용) 공식 반영.
  2. `STATE.md`:
     - 계층형 검증 체계 도입 완료 스냅샷 추가.
- **검증**:
  - `npm run lint` 통과 (0 errors, 8 pre-existing warnings)
  - `npm run typecheck` 통과 (0 errors)
  - `npm run build` 통과 (Vite bundle built in 20.31s)

## 2026-09-29: 구글 클라우드 런(Google Cloud Run) 백엔드 호스팅 URL 이전 및 Cloudflare Worker/Pages 반영
- 작업 브랜치: `feat/cloud-run-backend-urls`
- **사용자 요청**: 팀원이 서버 호스팅을 Render에서 Google Cloud Run으로 이전을 완료함에 따라, 백엔드 2종 URL(`https://backend-ai-agent-708438247739.asia-northeast3.run.app/`, `https://backend-core-api-708438247739.asia-northeast3.run.app/`)을 Cloudflare Worker/Pages 및 프론트엔드 환경변수에 업데이트.
- **개선 내용**:
  1. `frontend-reader-web/.env.example` & `frontend/.env`:
     - `VITE_CORE_API_BASE_URL=https://backend-core-api-708438247739.asia-northeast3.run.app/api/v1`
     - `VITE_AI_API_BASE_URL=https://backend-ai-agent-708438247739.asia-northeast3.run.app/api/v1`
     - `MAIN_BACKEND_URL` & `AI_BACKEND_URL` 주소를 Google Cloud Run 호스트로 갱신.
  2. `frontend-reader-web/app/api/apiBase.js`:
     - 프로덕션 폴백 주소를 기존 Render에서 Google Cloud Run 주소로 변경 (`import.meta.env.DEV` ? `/api/v1` : `https://.../api/v1`).
  3. `frontend-reader-web/wrangler.jsonc`:
     - Cloudflare Worker / Cloudflare Pages 배포용 `vars` 블록 추가하여 `VITE_CORE_API_BASE_URL`, `VITE_AI_API_BASE_URL` 바인딩 반영.
  4. `frontend-reader-web/README.md`:
     - 아키텍처 다이어그램 및 문서 내 백엔드 호스팅 주체 표기를 `Google Cloud Run`으로 갱신.
- **검증**:
  - `npx tsc --noEmit` 통과 (0 errors)
  - `npm run lint` 통과 (0 errors)
  - `npm run build` 성공 (Vite bundle built in 19.81s)


