# BACKLOG (미해결 항목 및 기술 부채)

지금 하지 않지만 나중에 할 것들을 기록한다. 진행 중인 계획은 `PLAN.md`에 둔다.

- [ ] 3D 서재 렌더링 번들 사이즈 최적화 (Three.js dynamic import 코드 스플리팅)
- [ ] PWA(Progressive Web App) 오프라인 캐싱 및 설치 지원 검토
- [ ] ESLint React 19 호환 룰셋 미세 조정 (set-state-in-effect warning 정리)
- [ ] 개발용 인증 우회 제거 — 인증 백엔드 연동 완료 후 `app/store/authBypass.js`와 `AuthProvider`/`LoginPage` 분기, `VITE_AUTH_BYPASS` 삭제
- [ ] 신규 사서 누디(바다달팽이)·게코의 `librarian_type` enum 값(`SEA_SLUG`/`GECKO`)을 백엔드와 확정 후 `librarians.js`의 `typeCode` 교체
- [ ] 누디·게코의 실제 프로필 일러스트, 3D 서재 커서 스프라이트(image/imageHover), 전용 서재 배경·카메라 배치(shelfLayout.js) 및 글로우 컬러(LibraryScene.jsx) 추가 — 현재는 placeholder SVG + 고양이 서재 배치로 대체 표시 중
- [ ] 슈빌(stork)의 `formalTone`(존댓말 채팅 UI) 정책과 페르소나 문서의 반말 종결어미("~두둥") 예시가 어긋남 — 기획팀과 말투 정책 재확인 필요
