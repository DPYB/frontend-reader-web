# HANDOFF (세션별 서술 로그, append-only)

## 2026-10-23: 독서 리포트 날짜 선택기 UI 개선(주간 시작일 지정) 및 BETA 설문 버그 수정
- 작업 브랜치: `feat/report-date-picker-and-survey-fixes`
- **사용자 요청**:
  1. 주간 월간 선택 버튼을 날짜 왼쪽에 배치하고, 주간 선택 시 시작 날짜(7일 자동 계산)를 설정할 수 있도록 변경.
  2. 첫방문 설문: '처음 사용하면서 헷갈리거나 막막했던 부분이 있었나요?' 질문 예시에 '사용해보려고 했지만 잘 안되는 것이 있는지'도 함께 안내.
  3. 재방문 설문: '오늘의 만족도는 어느 정도인가요?'에서 1보다 높은 점수를 선택할 때 하위 점수들이 같이 선택되는 버그 수정.
- **작업 내용**:
  1. `app/pages/MonthlyReport.jsx` & `MonthlyReport.css`:
     - 상단 헤더 타이틀 영역에 있던 주간/월간 세그먼트 토글 버튼(`.report-period-toggle`)을 우측 컨트롤 영역(`.report-actions`) 내 날짜 선택기 바로 왼쪽으로 이동.
     - 주간 리포트 선택 시 고정 주차 드롭다운 대신 날짜 피커(`<input type="date" />`)를 제공하여 사용자가 원하는 주간 시작일을 직관적으로 선택할 수 있도록 구현.
     - 시작일 선택 시 시작일로부터 6일 뒤(`startDate + 6일 = 총 7일`)를 종료일로 자동 계산하여 `~ YYYY-MM-DD (7일간)` 배지 실시간 표시.
     - `calculateWeekRange(startIsoStr)` 헬퍼 함수를 통해 주간 리포트 API 페이로드 규격에 맞춰 `fetchWeeklyReport(selectedWeek)` 비동기 조회 자동 갱신.
     - 기본 주간 시작일을 오늘 기준 최근 7일치(`new Date() - 6일`)로 자동 설정하고 `min="2026-09-01"`, `max={todayIso}` 경계 보호.
     - `.report-weekly-picker`, `.report-picker-label`, `.report-date-input`, `.report-range-badge` 반응형 및 테마 스타일링 적용, 인쇄 시 비인쇄 숨김 처리.
  2. `app/features/survey/BetaSurveyModal.jsx`:
     - 첫방문 설문 Q8(`confusingPart`) textarea의 placeholder 예시에 `사용해보려고 했지만 잘 안되는 기능 등` 문구 보강.
     - 재방문 설문 Q11(`overallSatisfaction`) 만족도 버튼 렌더링 시 기존 범위 판별 조건(`>= score`)을 단일 일치 조건(`=== score`)으로 수정하여 하위 점수 동시 선택 버그 완벽 해결.
  3. 하네스 문서(`.harness/STATE.md`, `.harness/HANDOFF.md`, `.harness/archive/HANDOFF_2026-09.md`) 갱신 및 5세션 상한 롤링 아카이빙 유지.
- **검증**:
  - `npm run check:harness` 통과 (HANDOFF, PLAN, STATE, DECISIONS, archive 정상)
  - `npm run lint` 통과 (0 errors, 0 warnings)
  - `npm run typecheck` 통과 (0 errors)
  - `npm run build` 통과 (Vite bundle 정상 빌드)

## 2026-10-23: BETA 설문조사 첫방문 기기/브라우저 선택 추가, 기기 구체적 모델 입력란 및 가입 불편 보기 정돈
- 작업 브랜치: `feat/beta-survey-device-and-options-update`
- **사용자 요청**:
  - 첫 방문 설문조사에서 재방문과 동일하게 기기, 브라우저 선택하는 항목 추가.
  - 첫방문, 재방문 둘 다 기기 선택 시 구체적인 기기 종류 (예: 아이폰 17, 아이패드 프로 등)를 적을 수 있는 입력란 제공.
  - '가입 및 시작 과정에서 막히거나 불편했던 점이 있었나요?' 질문에 대한 보기로 3, 4, 5번만 유지.
  - '다음 단계 안내 부족' 선택 시 구체적으로 적을 수 있는 입력란 생성.
- **작업 내용**:
  1. `app/features/survey/BetaSurveyModal.jsx`:
     - `SIGNUP_DIFFICULTY_OPTIONS` 배열에서 불필요한 1, 2번 보기를 제거하고 '다음 단계 안내 부족', '불편 없음', '기타' 3가지 보기만 유지.
     - `firstForm` 상태에 `device`, `deviceDetail`, `browser`, `browserOther`, `signupDifficultyDetail` 필드 추가.
     - `returningForm` 상태에 `deviceDetail` 필드 추가.
     - 첫방문 설문지에 재방문과 동일한 '어떤 기기와 브라우저로 사용하셨나요?' 섹션을 Q1으로 배치하고, 기기 선택 시 구체적인 모델명(예: 아이폰 17, 아이패드 프로 등)을 입력할 수 있는 텍스트 인풋 연동.
     - 재방문 설문지의 기기 선택 시에도 동일하게 구체적인 기기 종류를 입력할 수 있는 인풋 연동.
     - 첫방문 설문지 Q4(가입 및 시작 과정 불편점)에서 '다음 단계 안내 부족' 선택 시 구체적으로 적을 수 있는 입력란(`signupDifficultyDetail`) 동적 렌더링.
     - 첫방문 설문 질문 번호(Q1~Q9) 체계적 재정렬.
  2. `app/features/survey/discordSurveyWebhook.js`:
     - `buildFirstVisitDiscordPayload`: `💻 이용 환경` 필드(기기, 구체적 모델명, 브라우저) 추가 및 '다음 단계 안내 부족' 구체적 내용 반영.
     - `buildReturningDiscordPayload`: `💻 이용 환경` 필드에 기기 구체적 모델명(`deviceDetail`) 병기 반영.
  3. 하네스 문서(`.harness/STATE.md`, `.harness/HANDOFF.md`, `.harness/archive/HANDOFF_2026-09.md`) 갱신 및 5세션 상한 롤링 아카이빙 유지.
- **검증**:
  - `npm run check:harness` 통과 (HANDOFF, PLAN, STATE, DECISIONS, archive 정상)
  - `npm run lint` 통과 (0 errors, 0 warnings)
  - `npm run typecheck` 통과 (0 errors)
  - `npm run build` 통과 (Vite bundle 정상 빌드)

## 2026-10-23: 채팅창 '?' 도움말 버튼 제거 및 주간(Weekly) 독서 리포트 지원 구현
- 작업 브랜치: `feat/chat-remove-help-btn-and-weekly-reading-report`
- **사용자 요청**:
  - 채팅창 누르면 새 대화 버튼 오른쪽에 있는 '?' 버튼에 설명 나오는데 그거 없애기 ('?' 버튼도 함께 제거).
  - 독서 리포트가 월간만 되어 있는데 주간도 가능하게 구현.
- **작업 내용**:
  1. `app/features/room/chat/ChatHeader.jsx`:
     - 상단 헤더의 `showHelp` 상태 및 '?' 버튼/설명 팝오버 래퍼(`.lc-help-btn-wrap`) 완전 제거. 미사용 `useState` import 정리.
  2. `app/api/reportApi.js`:
     - `getAvailableWeeks()`: 서비스 런칭 시점(2026년 9월)부터 현재까지의 ISO-8601 기반 주차 목록(월~일 주차, 목요일 기준 월 소속) 동적 생성 및 최신순 반환 함수 구현 및 export.
     - `deriveWeeklyReportFromMonthly(monthlyData, weekInfo)`: 백엔드 주간 API 부재 시 월간 리포트 데이터를 기반으로 주간 스케일(주간 목표 1권, 1주 환산 페이지/시간, 최대 7일 Streak, 주간 피드백)로 정규화하는 어댑터 함수 구현.
     - `fetchWeeklyReport(weekInfo)`: `/reports/weekly` API 호출 시도 및 graceful fallback 연동 구현 및 export.
  3. `app/i18n/translations.js`:
     - `ko`, `en` 리포트 다국어 번역 키(`tabWeekly`, `tabMonthly`, `weeklyTitle`, `monthlyTitle`, `card01TitleWeekly`, `card01TitleMonthly`, `emptyDescWeekly`) 추가.
  4. `app/pages/MonthlyReport.jsx`:
     - `periodType` ('monthly' | 'weekly') 상태 및 `availableWeeks`, `selectedWeek` 상태 관리 연동.
     - 상단 헤더에 주간/월간 세그먼트 전환 탭 컴포넌트(`.report-period-toggle`) 배치.
     - `periodType === 'weekly'`일 때 주차 선택 드롭다운 노출 및 `fetchWeeklyReport(selectedWeek)` 비동기 조회.
     - 타이틀, 서브타이틀, 빈 상태 안내문, 카드 01(이번 주 한눈에 보기), 카드 03 키워드, 카드 05 문장 스크랩, 카드 07 사서 관찰기, 카드 08 처방 제목의 주간/월간 분기 처리.
     - PDF 다운로드 시 `title` 매개변수에 주간/월간 리포트명(`주간_독서_리포트` vs `월간_독서_리포트`) 전달.
  5. `app/pages/MonthlyReport.css`:
     - `.report-period-and-badge`, `.report-period-toggle`, `.report-period-btn`, `.report-period-btn.active` 스타일링 추가.
  6. 하네스 문서(`STATE.md`, `HANDOFF.md`, `HANDOFF_2026-09.md`) 갱신 및 5세션 상한 롤링 아카이빙 유지.
- **검증**:
  - `npm run check:harness` 통과 (HANDOFF, PLAN, STATE, DECISIONS, archive 정상)
  - `npm run lint` 통과 (0 errors, 0 warnings)
  - `npm run typecheck` 통과 (0 errors)
  - `npm run build` 통과 (Vite bundle 정상 빌드)

## 2026-10-23: 내 서재 책등(Spine) 제목 숨김(3D 뷰어 유지) 및 간편로그인(소셜 로그인) UI 비활성화
- 작업 브랜치: `feat/disable-social-login-and-hide-shelf-spine-title`
- **사용자 요청**:
  - 내 서재에 등록된 책 책등(Spine)에 들어간 제목(하얀색 글씨)을 아예 없애고, 책을 클릭했을 때 보이는 3D 상세 화면에서만 spine 제목 유지.
  - 간편로그인(카카오, Google 로그인) 버튼 UI적으로 비활성화.
- **작업 내용**:
  1. `app/features/bookshelf3d/Book3D.jsx`:
     - `showSpineTitle` prop 추가 (기본값 `true`).
     - `dynamicSpineMap` 텍스처 생성 시 `showSpineTitle`이 false인 경우 도서 제목을 빈 문자열(`''`)로 전달하여, 책등에 제목 텍스트 없이 책등 색상 + 은은한 질감 텍스처 + 상하 클래식 북바인딩 라인만 깔끔하게 렌더링되도록 구현.
  2. `app/features/room/LibraryScene.jsx`:
     - 내 서재 씬의 모든 선반 도서 렌더링 시 `<Book3D showSpineTitle={false} ... />`로 설정하여 선반 위의 책등 제목 완전 숨김.
  3. `app/features/room/Book3DViewer.jsx`:
     - 도서 상세 모달 3D 뷰어에서는 `<Book3D showSpineTitle={true} ... />`로 명시하여 3D 뷰어 화면에서 책등 제목이 고해상도로 선명하게 유지되도록 구현.
  4. `app/pages/LoginPage.jsx`:
     - `BUTTONS` 내 `kakao`, `google` 툴팁을 `카카오 로그인 (준비 중)` / `Google 로그인 (준비 중)`으로 변경.
     - `isButtonDisabled(id)`에서 `kakao`, `google`을 항상 비활성화(`true`)로 지정하여 호버 시 밝기 효과 차단 및 `cursor: not-allowed` 적용.
     - `handleClick(id)`에서 `kakao`, `google` 클릭 시 핸들러 실행을 차단하고 `!isButtonDisabled` 가드 적용 (ESLint `no-unused-vars` 준수).
  5. 하네스 문서(`STATE.md`, `HANDOFF.md`, `HANDOFF_2026-09.md`) 갱신 및 5세션 상한 롤링 아카이빙 유지.
- **검증**:
  - `npm run check:harness` 통과 (HANDOFF, PLAN, STATE, DECISIONS, archive 정상)
  - `npm run lint` 통과 (0 errors, 0 warnings)
  - `npm run typecheck` 통과 (0 errors)
  - `npm run build` 통과 (Vite bundle 정상 빌드)

## 2026-10-23: 책등(Spine) 텍스트 선명화·왜곡 보정·크기 통일 및 블루 서재 선반 이동 책 두께 일관성 개선
- 작업 브랜치: `fix/book-spine-text-and-thickness`
- **사용자 요청**:
  - 책등(Spine)에 들어가는 책 제목이 선명하지 않고 책 모양(두께/높이 비율)에 따라 글자가 늘어나는 문제 해결.
  - 책등 텍스트 크기는 책에 관계없이 모두 동일한 크기로 통일.
  - 고양이(블루) 서재에서 책을 다른 선반으로 옮겼을 때 책 두께가 이상하게 바뀌는 현상 해결.
- **원인 분석**:
  1. **책등 텍스트 흐림 & 왜곡 늘어남**:
     - 기존 `createSpineTexture`의 캔버스 크기가 128×1024로 고정되어 있어 화면 확대 및 고해상도 환경에서 텍스트가 흐려짐.
     - Three.js `BoxGeometry`의 +Z 면(책등) UV 매핑이 [0,1]x[0,1]로 매핑되는데, 책마다 3D 치수(`thickness / height`) 비율이 제각각임에도 1:8 고정 비율 캔버스 전체에 텍스트를 그려 두꺼운 책은 글자가 가로로 뚱뚱하게 늘어나고 얇은 책은 홀쭉해짐.
     - 글자 수에 따라 폰트 크기(26~42px)가 변동되어 책마다 글자 크기가 들쭉날쭉함.
  2. **블루 서재 선반 이동 시 두께 왜곡**:
     - `CAT_SHELVES`에서 상단 벽선반(선반 0)은 카메라 거리 $Z=-0.4$ ($D \approx 24.4$), 높이 0.8인 반면, 하단 책장 선반(선반 1~4)은 카메라 거리 $Z=4.61$ ($D \approx 19.39$)로 카메라에 5유닛 가까움.
     - 하단 선반의 원근 보정을 위해 `bookHeight`는 0.54로 줄였으나 `book.thickness`는 전혀 보정하지 않아, 하단 선반으로 옮기면 높이 대비 두께 비율이 1.5배 가까이 뚱뚱해지고 화면상 겉보기 두께도 비정상적으로 비대해짐.
     - 선반 폭(2.13 vs 1.65) 불균형으로 인해 권수에 따른 압축(squeeze) 왜곡 심화.
- **작업 내용**:
  1. `app/features/bookshelf3d/bookTextureHelper.js`:
     - `createSpineTexture(title, spineColor, sharedImg, dimensions)` 개선:
       - 캔버스 해상도를 256×2048(기존 대비 픽셀 4배)로 상향하고, Three.js 밉맵 필터링(`minFilter: LinearMipmapLinearFilter`, `generateMipmaps: true`)을 적용하여 텍스트 선명도 극대화.
       - 3D 메쉬의 종횡비(`meshAspect = thickness / height`)와 캔버스 종횡비(`canvasAspect = 256 / 2048`)를 계산하여, 가로 스케일 $S_x = \text{canvasAspect} / \text{meshAspect}$를 적용. 3D 박스 매핑 시 $1/S_x$로 확대되는 왜곡을 사전에 상쇄하여 월드 공간 상에서 글자의 가로:세로 비율이 정확히 1:1 원래 글꼴 비율로 렌더링되도록 구현.
       - 텍스트 크기 통일: 글자 수에 따른 가변 폰트 크기 로직을 제거하고 한글 58px / 자간 78px, 영문 52px 고정 크기로 전면 통일. 책등 높이 초과 시 말줄임표(…) 처리.
       - 상하 클래식 북바인딩 금박/은박 장식선 고해상도(256x2048) 좌표 및 라인 두께 스케일링.
  2. `app/features/bookshelf3d/Book3D.jsx`:
     - `dynamicSpineMap` 텍스처 생성 시 `size` 프로퍼티로부터 `thickness`와 `height`를 추출하여 `createSpineTexture`에 전달하고, 메모이제이션 의존성 배열에 추가.
  3. `app/features/room/shelfLayout.js`:
     - `CAT_SHELVES`에 선반별 `thicknessScale` 정의 (선반 0: `1.0`, 선반 1~4: `0.54 / 0.8 = 0.675`).
     - `placeBooks` 내 `shelfThicknessScale` 적용: 선반 높이 축소 및 카메라 원근 거리에 비례하여 두께를 스케일링함으로써 선반 0과 선반 1~4 간 책 이동 시에도 책의 물리적 종횡비(높이 대 두께 비)와 화면상 겉보기 두께가 완벽하게 일정하도록 개선.
     - 압축(squeeze) 판별 시에도 `shelfThicknessScale`을 반영하여 선반 폭(1.65) 내에서 도서 수용 시 불필요한 찌그러짐 방지.
  4. 하네스 문서(`STATE.md`, `HANDOFF.md`, `HANDOFF_2026-09.md`) 갱신 및 5세션 상한 롤링 아카이빙 유지.
- **검증**:
  - `npm run check:harness` 통과 (HANDOFF, PLAN, STATE, DECISIONS, archive 정상)
  - `npm run lint` 통과 (0 errors, 0 warnings)
  - `npm run typecheck` 통과 (0 errors)
  - `npm run build` 통과 (Vite bundle 정상 빌드)




