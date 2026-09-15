# HANDOFF (세션별 서술 로그, append-only)

## 2026-09-14: DPYB 조직 마이그레이션 및 프론트엔드 리팩토링
- 기존 저장소에서 AWS 의존성(배포 워크플로우 및 문서) 제거 완료
- `my-reading-room/` 서브디렉터리 구조를 프로젝트 루트로 평탄화(Flattening)
- 소스 디렉터리를 `src/`에서 `app/`으로 마이그레이션 및 path alias(`@`) 설정
- 패키지 식별자를 `frontend-reader-web`으로 변경
- TypeScript 점진적 도입 환경 구축 (`tsconfig.json`, `npm run typecheck`, TS7 및 ESLint 지원)
- 팀원 시각 에셋 보호를 위한 우클릭 방지, 드래그 차단, `ASSETS_LICENSE.md`, `public/README.md` 적용
- DPYB 듀얼 백엔드(`backend-core-api`, `backend-ai-agent`) 연동을 위한 Vite 프록시 및 `.env.example` 개편
- DPYB 조직 바이브 코딩 하네스(`.harness/`, `AGENTS.md`) 및 CI 워크플로우 적용

## 2026-09-15: 월간 독서 리포트 뷰 & 날씨 전송 & 원클릭 PDF 다운로드 구현
- 독서 기록 작성(`POST /api/v1/records`) 연동 및 Geolocation 기반 날씨 condition(`clear`, `rainy`, `cloudy` 등) 페이로드 전송 로직 구현
- AI Agent 월간 리포트 API 클라이언트(`app/api/reportApi.js`) 및 Vite 개발 프록시(`/api/v1/reports`, `/api/v1/records`) 설정
- 월간 독서 리포트 페이지(`MonthlyReport.jsx`, `MonthlyReport.css`) 구현:
  - 01~07번 완성형 와꾸 카드 렌더링 (한눈에 보기, 독서 리듬 차트, 취향/키워드 태그, 밸런스 게이지, 독서 흔적/인용구, 사서 말풍선, 다음 달 독서 처방)
  - 상단 타이틀 및 말풍선에 현재 활성화된 사서(블루/슈빌) 페르소나 및 닉네임 동적 반영
- `html2canvas` + `jspdf` 기반 클라이언트 사이드 원클릭 PDF 다운로드 유틸(`app/lib/pdfExport.js`) 및 인쇄 미디어 쿼리(Print Media) 적용:
  - 현재 사서명 기반 동적 파일명 `"{사서이름}_사서의_월간_독서_리포트.pdf"` 다운로드 지원
- 라우팅(`/reports`) 및 GNB 상단 메뉴에 '독서 리포트' 탭 추가
- `npm run lint`, `npm run typecheck`, `npm run build` 검증 완료

**다음 세션 시작 시**: 신규 백엔드 스펙에 맞춘 '사서 토론 모드 UI' 및 '독서 타이머 기능' 와꾸와 연동 작업 착수

**다음 세션 시작 시**: 새 저장소 `DPYB/frontend-reader-web` 원격 연결 후 브랜치 보호 규칙 확인 및 점진적 TypeScript 변환(도메인 타입, API 모듈 순) 착수

## 2026-09-15: 개발 단계용 인증 우회 스위치 도입
- 인증 백엔드 미연동 상태에서 로그인 화면에 막혀 서재/등록/마이페이지를 확인할 수 없던 문제 해소
- `app/store/authBypass.js` 신설 — `VITE_AUTH_BYPASS`(true/false/미설정) 판정과 가짜 회원(`BYPASS_MEMBER`) 정의
- `AuthProvider`: 우회 시 refresh 복원 스킵, `login()`은 API 호출 없이 즉시 authenticated, `logout()`은 로컬 상태만 정리
- `LoginPage`: 우회 시 이메일/비밀번호 입력 검증 없이 로그인 버튼 활성화 + 좌측 상단에 개발 모드 배지 표시
- 기본값을 `import.meta.env.DEV`로 두어 프로덕션 빌드에는 우회가 실리지 않도록 방어

**다음 세션 시작 시**: 인증 백엔드 연동이 끝나면 `BACKLOG.md`의 우회 제거 항목을 처리(`authBypass.js` 및 분기 삭제)
