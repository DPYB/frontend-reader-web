# BACKLOG (미해결 항목 및 기술 부채)

지금 하지 않지만 나중에 할 것들을 기록한다. 진행 중인 계획은 `PLAN.md`에 둔다.

- [ ] 3D 서재 렌더링 번들 사이즈 최적화 (Three.js dynamic import 코드 스플리팅)
- [ ] PWA(Progressive Web App) 오프라인 캐싱 및 설치 지원 검토
- [ ] ESLint React 19 호환 룰셋 미세 조정 (set-state-in-effect warning 정리)
- [ ] 개발용 인증 우회 제거 — 인증 백엔드 연동 완료 후 `app/store/authBypass.js`와 `AuthProvider`/`LoginPage` 분기, `VITE_AUTH_BYPASS` 삭제
- [ ] 신규 사서 누디(바다달팽이)·게코의 `librarian_type` enum 값(`SEA_SLUG`/`GECKO`)을 백엔드와 확정 후 `librarians.js`의 `typeCode` 교체
- [ ] 누디·게코의 전용 서재 배경·카메라 배치(shelfLayout.js) 및 글로우 컬러(LibraryScene.jsx) 추가 — 커서 스프라이트(image/imageHover/클릭모션)와 프로필 사진은 적용 완료, 서재 배경만 고양이 배치로 대체 표시 중
- [ ] 누디·게코·슈빌의 tip/tipHover 좌표는 실측이 아닌 추정치 — 실제 화면에서 커서 포인터 위치 육안 확인 후 미세 조정 필요
- [ ] 누디 "내 서재" 테마 배경 이미지(snail2) 반영 — 요청받았으나 워크스페이스에서 소스 파일을 찾지 못함. 파일 재확인 후 webp 변환·리사이즈하여 `public/room/`에 배치하고 `shelfLayout.js`(BG_SRC_NUDI + 카메라/선반)·`LibraryScene.jsx`(배경 분기·글로우) 연결 필요
- [ ] [해커톤 제출 전] 심사/시연용 데모 계정 사전 세팅 (월간 리포트 꺾은선/도넛 차트 및 날씨별 통계가 완벽히 차 있는 풍부한 독서 기록·세션 DB 시드 데이터 준비)
- [ ] [해커톤 제출 후] 점진적 TypeScript 전환 (`app/types/` 신설, `app/api/*.js` ➔ `.ts`, 전역 Store/Context ➔ `.tsx`, 주요 컴포넌트 순차 마이그레이션)
