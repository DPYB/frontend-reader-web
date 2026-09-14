# AGENTS.md — 개발 하네스 지침

## 1. 세션 시작 시 필수 읽기 순서
어떤 AI 도구(Claude Code, Codex, Antigravity, Kiro 등)로 세션을 시작하든 아래 순서대로 먼저 읽는다:
1. `.harness/HANDOFF.md` — 직전 세션이 어디서 멈췄는지
2. `.harness/STATE.md` — 지금까지 무엇이 완료되었는지
3. `.harness/ARCHITECTURE.md` — 기술 스택/폴더 구조/컨벤션
4. `.harness/PLAN.md` — 현재 진행 중이거나 제안된 계획
5. 필요 시 `.harness/DECISIONS.md`(과거 결정 이유), `.harness/BACKLOG.md`(미해결 부채)

## 2. 문서별 책임 (중복 기록 금지)

| 문서 | 담는 내용 | 담지 않는 내용 |
| :--- | :--- | :--- |
| `HANDOFF.md` | 세션마다 무엇을 했는지 (append-only 서술형 로그) | 단계별 완료 요약(STATE 몫), 결정 이유(DECISIONS 몫) |
| `STATE.md` | 지금까지 끝난 것의 단계 단위 요약 스냅샷 | 세션별 서술(HANDOFF 몫). 이슈 하나하나를 로그처럼 쌓지 않는다 |
| `ARCHITECTURE.md` | 지금의 기술 스택/폴더 구조/컨벤션 (현재 상태) | 왜 그렇게 정했는지(DECISIONS 몫), 진행 상황(STATE 몫) |
| `DECISIONS.md` | 결정 내용과 이유의 역사 (최신 결정이 맨 위로, append-only) | 구현 여부/진행 상황(STATE 몫) |
| `PLAN.md` | 아직 안 끝난 계획과 체크리스트만 | 완료된 항목 (체크만 남기지 말고 STATE로 옮긴 뒤 제거) |
| `BACKLOG.md` | 지금 하지 않지만 나중에 할 것 (버그, 기술부채, 아이디어) | 진행 중인 계획(PLAN 몫) |

## 3. 작업 워크플로우 (필수)

- **계획 수립 우선**: 새로운 기능/변경 요청을 받으면 바로 코드를 고치지 말고 `.harness/PLAN.md`에 계획 초안을 작성해 사용자에게 제시한다. (단순 질의응답, 사소한 오탈자 수정은 계획 없이 바로 가능)
- **사용자 승인 후 구현**: 사용자가 명시적으로 컨펌하면 구현을 시작한다. "확인 → 구현 → 기록" 순서는 항상 지킨다.
- **점진적 반영**: `PLAN.md`의 세부 체크리스트가 완료될 때마다 즉시 `.harness/STATE.md`에 한 줄로 반영하고 `PLAN.md`에서 제거한다.
- **세션 종료/인수인계**: 작업을 중단하거나 세션을 종료할 때 반드시 `.harness/HANDOFF.md`에 다음 세션을 위한 인수인계 서술을 남긴다.
- **중요 결정 기록**: 아키텍처나 정책의 중요한 결정은 `.harness/DECISIONS.md` 표 최상단에 이유와 함께 기록한다.
- **커밋**: 사용자가 명시적으로 요청했을 때만 수행하며, 변경된 파일만 선별해 스테이징한다 (`git add .` 지양). 커밋 제목은 국문 명사형 50자 이내로 작성한다.
- **인간 개입 및 머지 권한**: 커밋 및 PR 생성까지만 에이전트가 도울 수 있으며, `develop` 및 `main`으로의 **최종 PR 머지는 에이전트가 절대 자율 실행하지 않고 사람이 직접 검토 후 클릭**한다.

## 4. 이 레포 고유 정책
- **프론트엔드 스택**: React 19 + Vite 8 + TypeScript (점진적 적용)
- **3D 인터랙션**: Three.js, `@react-three/fiber`, `@react-three/drei` 기반 서재 렌더링
- **에셋 보호 정책**: 모든 시각 에셋(일러스트, 버튼, 커서 등)은 독점 저작물(`ASSETS_LICENSE.md`)이며 무단 도용 및 복제를 엄격히 금지함. 고해상도 디자인 원본(`design-src/`)은 gitignore 유지.
- **백엔드 연동**: DPYB 조직의 듀얼 백엔드 구조 (`MAIN_BACKEND_URL`: core-api, `AI_BACKEND_URL`: ai-agent) 연동

## 5. 브랜치 & 커밋 컨벤션
[DPYB `.github` 레포의 02-git-conventions.md](https://github.com/DPYB/.github/blob/main/docs/02-git-conventions.md)를 따른다.

## 6. 배포
[DPYB `.github` 레포의 04-deployment-policy.md](https://github.com/DPYB/.github/blob/main/docs/04-deployment-policy.md)를 따른다.
