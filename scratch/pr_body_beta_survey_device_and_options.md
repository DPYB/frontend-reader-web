## 🎯 작업 요약
- **목적**:
  - 첫 방문 설문조사에서도 재방문 설문과 동일하게 접속 기기 및 브라우저 환경을 선택할 수 있도록 추가.
  - 첫방문 및 재방문 설문 모두 기기(PC, 모바일, 태블릿) 선택 시 구체적인 기기 모델(예: 아이폰 17, 아이패드 프로, 갤럭시 S24 등)을 기재할 수 있는 입력란 제공.
  - '가입 및 시작 과정에서 막히거나 불편했던 점이 있었나요?' 질문의 보기를 3, 4, 5번('다음 단계 안내 부족', '불편 없음', '기타')으로 정돈.
  - '다음 단계 안내 부족' 선택 시 어떤 부분에서 안내가 부족했는지 상세히 기재할 수 있는 서브 입력란 제공.
- **주요 변경사항**:
  - `app/features/survey/BetaSurveyModal.jsx`:
    - `SIGNUP_DIFFICULTY_OPTIONS` 배열에서 1, 2번 보기를 제외하고 '① 다음 단계 안내 부족', '② 불편 없음', '③ 기타' 3가지 보기만 유지.
    - `firstForm` 상태에 `device`, `deviceDetail`, `browser`, `browserOther`, `signupDifficultyDetail` 필드 추가.
    - `returningForm` 상태에 `deviceDetail` 필드 추가.
    - 첫방문 설문지 시작 부분에 '어떤 기기와 브라우저로 사용하셨나요?' 섹션을 Q1으로 배치.
    - 첫방문 및 재방문 설문지의 기기 선택 시 구체적인 기기 종류를 입력할 수 있는 텍스트 인풋(`.beta-text-input`) 연동.
    - 첫방문 설문지 Q4(가입 및 시작 과정 불편점)에서 '다음 단계 안내 부족'(`lack_guidance`) 선택 시 구체적인 불편 내용을 입력할 수 있는 필드 노출.
    - 첫방문 설문 질문 번호(Q1~Q9) 체계적 재정렬.
  - `app/features/survey/discordSurveyWebhook.js`:
    - `buildFirstVisitDiscordPayload`: `💻 이용 환경` 필드(기기 및 모델명, 브라우저) 추가 및 '다음 단계 안내 부족' 상세 의견 반영.
    - `buildReturningDiscordPayload`: `💻 이용 환경` 필드에 기기 모델명(`deviceDetail`) 병기 반영.
  - 하네스 문서:
    - `.harness/STATE.md`, `.harness/HANDOFF.md`, `.harness/archive/HANDOFF_2026-09.md` 갱신 및 5세션 상한 롤링 아카이빙 유지.

---

## 🌐 적용 범위
- **설문조사 모달**:
  - `app/features/survey/BetaSurveyModal.jsx`
- **디스코드 웹훅 알림 연동**:
  - `app/features/survey/discordSurveyWebhook.js`
- **하네스 문서**:
  - `.harness/STATE.md`
  - `.harness/HANDOFF.md`
  - `.harness/archive/HANDOFF_2026-09.md`

---

## 💬 고려사항 & 리뷰 포인트
- **기기 세부 모델명 수집**: 기기 종류(PC/모바일/태블릿)를 누르면 부드럽게 세부 모델 입력란이 나타나므로, iOS/Android 등 특정 OS나 디바이스별 UX 이슈(예: 사파리 뷰포트, 특정 해상도 등)를 정확히 추적할 수 있습니다.
- **가입 안내 부족 피드백 심층 분석**: '다음 단계 안내 부족' 선택 시 구체적 입력란을 통해 신규 사용자 온보딩 병목 지점을 정밀하게 파악할 수 있습니다.
- **디스코드 웹훅 알림 동기화**: 첫방문과 재방문 설문 모두 이용 환경 필드에 기기 종류와 세부 모델명이 통일된 포맷(`기기: 모바일 (아이폰 17)\n브라우저: Safari`)으로 전송되도록 구현했습니다.

---

## ✅ 체크리스트
- [x] 첫 방문 설문조사에서 기기와 브라우저를 선택할 수 있는지 확인했습니다.
- [x] 첫방문 및 재방문 설문 모두 기기 선택 시 구체적인 기기 종류(예: 아이폰 17 등)를 입력할 수 있는지 확인했습니다.
- [x] 가입 및 시작 불편점 질문의 보기가 '다음 단계 안내 부족', '불편 없음', '기타'로 구성되어 있는지 확인했습니다.
- [x] '다음 단계 안내 부족' 선택 시 구체적인 입력란이 정상 노출되는지 확인했습니다.
- [x] 3단계 계층형 검증 통과 (`check:harness`, `lint`, `typecheck`, `build`).
