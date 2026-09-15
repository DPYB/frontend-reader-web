# STATE (완료 스냅샷)

단계가 끝나면 그 단계를 한 줄로 갱신한다. 세션별 서술은 `HANDOFF.md`에 남긴다.

## 완료된 단계
- 저장소 평탄화 및 `app/` 디렉터리 구조 마이그레이션
- `frontend-reader-web` 프로젝트 식별자 변경 및 AWS 의존성 제거
- 점진적 TypeScript 도입 환경 세팅 (`tsconfig.json`, `npm run typecheck`)
- 시각 에셋 무단 도용 방지(우클릭/드래그 차단) 및 저작권 라이선스 고지
- DPYB 조직 듀얼 백엔드(`backend-core-api`, `backend-ai-agent`) 프록시 개편
- DPYB 바이브 코딩 하네스(`.harness/`, `AGENTS.md`) 및 워크플로우 구성
- DPYB 컨벤션 분할 커밋 및 `develop` 브랜치 최초 원격 푸시 완료
- 월간 독서 리포트 뷰(01~07번 카드 레이아웃), 독서 기록 날씨 조건(`weather`) 전송 및 사서 맞춤형 원클릭 PDF 다운로드 기능 구현
- 개발 단계용 인증 우회 스위치(`VITE_AUTH_BYPASS`) 도입 — dev에서 로그인 무조건 통과
