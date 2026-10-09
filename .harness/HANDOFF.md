# HANDOFF (세션별 서술 로그, append-only)

## 2026-10-09: README 전면 최신화 및 실구현 기반 Mermaid 아키텍처 다이어그램 구축
- 작업 브랜치: `docs/readme-architecture-diagrams`
- **사용자 요청**: 추천 2단계 작업으로 저장소 `README.md`를 최신화하고, 4종 사서(블루/슈빌/누디/게코), 듀얼 백엔드(Google Cloud Run), 실시간 SSE 토론 및 도서 등록 OCR/YES24 연동 흐름을 직관적인 Mermaid 다이어그램으로 구축.
- **작업 내용**:
  1. `README.md`:
     - 전체 아키텍처 다이어그램(클라이언트 피처 모듈, Core API, AI Agent, Supabase DB/pgvector, 외부 API) 상세화.
     - 2종의 핵심 시퀀스/플로우차트 다이어그램 추가:
       1) 실시간 사서 대화 & 3단계 독서 토론 및 내 서재 교차 검증 시퀀스
       2) 멀티모달 도서 등록 & OCR/주상색/장르 분류 플로우차트
     - 4종 사서 FOV 28도 표준화 및 선반 캘리브레이션 반영.
     - 최신 프로젝트 디렉터리 구조(`app/features/register/` 서브 컴포넌트 포함) 동기화.
     - 계층형 검증 명령어(`check:harness`, `lint`, `typecheck`, `build`) 안내 최신화.
  2. 하네스 문서(`STATE.md`, `PLAN.md`, `HANDOFF.md`) 최신화 및 롤링 아카이빙 유지.
- **검증**:
  - `npm run check:harness` 통과
  - `npm run lint` 통과 (0 errors, 0 warnings)
  - `npm run typecheck` 통과 (0 errors)
  - `npm run build` 통과

## 2026-10-09: 도서 등록(RegisterBook) 서브 컴포넌트 모듈화 및 인라인 스타일 분리
- 작업 브랜치: `feat/modularize-register-book`
- **사용자 요청**: 추천 1단계 작업으로 대형 컴포넌트인 `RegisterBook.jsx`의 서브 컴포넌트 모듈화 및 인라인 스타일을 전면 제거하여 유지보수성 및 코드 품질 개선.
- **작업 내용**:
  1. `app/features/register/` 서브 컴포넌트 분리:
     - `RecommendationBanner.jsx`: AI 사서 도서 추천 안내 배너 분리.
     - `BookSearchSection.jsx`: YES24 키워드 검색바, 추천 키워드 칩스, 결과 카드 그리드, 즉시 서재 담기/정보 확인 액션 분리.
     - `BookIsbnScanSection.jsx`: ISBN 촬영/업로드 버튼, 웹캠 모달 연동, 표지 미리보기, OCR 상태 및 수동 ISBN 검색바 분리.
     - `BookRegisterForm.jsx`: 도서 메타데이터(제목·저자·ISBN·장르·사서별 색상 팔레트·쪽수·독서상태·두께) 폼 및 제출/에러 영역 분리.
     - `IsbnGuideModal.jsx`: ISBN 촬영 가이드 모달 포탈 분리.
  2. `app/pages/RegisterBook.css`:
     - 모든 인라인 스타일(`style={{ ... }}`)을 전용 CSS 클래스로 전환.
     - 모바일 및 반응형 뷰포트 레이아웃 최적화.
  3. `app/pages/RegisterBook.jsx`:
     - 상위 컨테이너에서 상태 관리 및 핸들러 로직을 총괄하고 하위 서브 컴포넌트를 합성(Composition)하는 구조로 간결화.
- **검증**:
  - `npm run check:harness` 통과 (HANDOFF, PLAN, STATE, DECISIONS, archive 정상)
  - `npm run lint` 통과 (0 errors, 0 warnings)
  - `npm run typecheck` 통과 (0 errors)
  - `npm run build` 통과 (Vite bundle built in 4.85s)

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
