## 🎯 작업 요약
- **목적**:
  - 채팅창 상단 '새 대화' 버튼 우측의 '?' 도움말 버튼 및 모드별 가이드 팝오버를 완전히 제거하여 깔끔하고 심플한 채팅창 헤더 UI 제공.
  - 기존에 월간 단위로만 지원되던 사서 독서 리포트에 주간(Weekly) 독서 리포트를 추가하여 사용자가 주차별 독서 흐름과 통계를 세밀하게 확인하고 PDF로 다운로드할 수 있도록 지원.
- **주요 변경사항**:
  - `app/features/room/chat/ChatHeader.jsx`:
    - '?' 버튼 및 모드별 가이드 팝오버 래퍼(`.lc-help-btn-wrap`)와 관련 상태(`showHelp`) 완전 제거. 미사용 `useState` import 정리.
  2. `app/api/reportApi.js`:
    - 서비스 시작 시점(2026년 9월)부터 현재까지의 주차 목록을 동적으로 생성하는 `getAvailableWeeks()` 구현 및 export.
    - 백엔드 주간 전용 엔드포인트 부재 시 월간 리포트를 기반으로 1주 단위(주간 목표 1권, 1/4 독서량 및 세션, 7일 클램프 Streak)로 안전하게 환산하는 graceful fallback 함수 `deriveWeeklyReportFromMonthly` 및 `fetchWeeklyReport` 구현 및 export.
  3. `app/i18n/translations.js`:
    - 한국어(`ko`) 및 영어(`en`)에 주간 리포트 다국어 키(`tabWeekly`, `tabMonthly`, `weeklyTitle`, `monthlyTitle`, `card01TitleWeekly`, `card01TitleMonthly`, `emptyDescWeekly`) 추가.
  4. `app/pages/MonthlyReport.jsx`:
    - `periodType` ('monthly' | 'weekly') 상태 추가.
    - 상단 헤더에 주간/월간 전환 세그먼트 버튼 컴포넌트(`.report-period-toggle`) 및 주차 선택기 연동.
    - 타이틀, 서브타이틀, 빈 상태 안내문, 카드 제목(이번 주 한눈에 보기), 카드 03 키워드, 카드 05 문장 스크랩, 카드 07 사서 관찰기, 카드 08 처방 제목 주간/월간 분기 처리.
    - PDF 다운로드 시 파일명에 주간/월간 반영 (`주간_독서_리포트` vs `월간_독서_리포트`).
  5. `app/pages/MonthlyReport.css`:
    - 세그먼트 전환 토글 버튼 스타일(`.report-period-and-badge`, `.report-period-toggle`, `.report-period-btn`, `.report-period-btn.active`) 추가.
  6. 하네스 문서:
    - `.harness/STATE.md`, `.harness/HANDOFF.md`, `.harness/archive/HANDOFF_2026-09.md` 갱신 및 5세션 상한 롤링 아카이빙 유지.

---

## 🌐 적용 범위
- **채팅 헤더 컴포넌트**:
  - `app/features/room/chat/ChatHeader.jsx`
- **리포트 페이지 및 스타일**:
  - `app/pages/MonthlyReport.jsx`
  - `app/pages/MonthlyReport.css`
- **리포트 API 및 다국어 번역**:
  - `app/api/reportApi.js`
  - `app/i18n/translations.js`
- **하네스 문서**:
  - `.harness/STATE.md`
  - `.harness/HANDOFF.md`
  - `.harness/archive/HANDOFF_2026-09.md`

---

## 💬 고려사항 & 리뷰 포인트
- **백엔드 주간 API 호환성**: 백엔드(`/reports/weekly`) 엔드포인트가 아직 준비되지 않은 환경에서도 에러 없이 주간 통계를 확인할 수 있도록 프론트엔드 어댑터(`deriveWeeklyReportFromMonthly`)를 구축하여 graceful fallback을 보장합니다.
- **다국어 및 반응형 디자인**: 테마 변수(`--code-bg`, `--border`, `--accent`, `--text`)를 100% 활용하여 라이트/다크 모드 모두에서 매끄러운 세그먼트 UI를 유지하며, 한국어와 영어 모드 모두 자연스러운 텍스트를 제공합니다.

---

## ✅ 체크리스트
- [x] 채팅창 상단 '?' 버튼 및 안내 팝오버가 완전히 제거되었는지 확인했습니다.
- [x] 리포트 페이지 상단에서 주간 리포트 / 월간 리포트를 자유롭게 전환할 수 있는지 확인했습니다.
- [x] 주간 리포트 선택 시 주차 목록(ISO-8601 기준 주차 및 날짜 범위)이 정상 노출되는지 확인했습니다.
- [x] 주간 리포트에서도 통계 차트, 도넛 차트, AI 사서 관찰기, PDF 다운로드가 정상 작동하는지 확인했습니다.
- [x] 3단계 계층형 검증 통과 (`check:harness`, `lint`, `typecheck`, `build`).
