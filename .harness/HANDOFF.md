# HANDOFF (세션별 서술 로그, append-only)

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

## 2026-09-29: 모바일 UI/UX 상하 스크롤 및 한글 장르 표기 개편
- 작업 브랜치: `feat/mobile-scroll-ui`
- **사용자 요청**:
  1. (모바일) 선반 클릭시 보여지는 책 정보는 일반 웹과 동일하게 책 장르 한글(`genreLabel`)로 맞춤.
  2. 책 선택 후 나오는 책 상세내역과 수집 문장/독서 기록 부분을 상하 스크롤로 보기 가능하게 개선.
  3. 문장 수집 모달 UI를 상하 스크롤 1열 세로 배치로 변경.
  4. 책 등록 페이지 UI를 상하 스크롤 1열 세로 배치로 변경.
- **개선 내용**:
  1. `app/features/room/MobileShelfSheet.jsx`:
     - `genreLabel` 유틸을 임포트하여 `#LITERATURE`, `#PHILOSOPHY` 등 영문 enum 또는 raw 문자열을 KDC 표준 한글 라벨(`#문학`, `#철학` 등)로 변환 표시.
  2. `app/features/room/BookDetail.jsx`:
     - `isMobile` (<= 768px) 동적 반응형 분기 적용.
     - 모바일 다이얼로그 `width: 94vw`, `maxHeight: 90vh`, `overflowY: auto` 설정.
     - 다이얼로그 내부 3열 그리드를 단일 1열(`1fr`)로 전환, 가로 세파레이터를 수평 구분선(`height: 1px`, `width: 100%`)으로 변환하여 책 메타데이터와 수집 문장/타이머 히스토리를 상하 수직 스크롤로 감상 가능하게 개선.
  3. `app/features/room/SentenceCollectModal.jsx`:
     - `isMobile` 동적 반응형 분기 적용.
     - 다이얼로그 `width: 94vw`, `maxHeight: 92vh`, `overflowY: auto` 및 `gridTemplateColumns: 1fr` 수직 single-column 레이아웃 적용.
     - 모바일 화면에서 문장 스캔(카메라/이미지/웹캠) ➔ 문장/메모 입력 ➔ 저장된 문장 목록이 수직 순서로 정렬되어 자연스럽게 스크롤되도록 개선.
  4. `app/pages/RegisterBook.jsx`:
     - `isMobile` 동적 반응형 분기 적용.
     - 폼 grid columns를 `1fr` 수직 레이아웃으로 변경하고, 표지 미리보기 및 메타데이터 필드를 모바일 세로 배치(`flexDirection: column`)로 전환.
     - 하단 네비게이션바와 겹치지 않도록 `padding: 20px 16px 100px` 여유 공간 확보.
- **검증**:
  - `npx tsc --noEmit` 통과 (0 errors)
  - `npm run lint` 통과 (0 errors, 8 pre-existing warnings)
  - `npm run build` 성공 (Vite bundle built in 20.01s)

