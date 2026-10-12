# HANDOFF (세션별 서술 로그, append-only)

## 2026-10-12: 서비스 이용 가이드 영문 버튼 개선, 로그인 팝업 Try Out DPYB 문구 보정 및 모바일 햄버거 메뉴 영문화 검증
- 작업 브랜치: `feat/guide-login-and-menu-en-refinements`
- **사용자 요청**:
  1. 서비스 사용가이드에 영문버전 버튼 용어 수정: 다음 슬라이드 넘길 때 그냥 `next`라고만 적고, 그 왼쪽에 있는 close 버튼은 이전 슬라이드 보는 버튼(`prev`/`Previous`)으로 변경.
  2. 서비스 사용가이드 다음에 뜨는 팝업창에 Try DPYB라고 적혀 있는 문구를 `Try Out DPYB`로 변경.
  3. 햄버거 메뉴에 있는 내서재, 책등록, 독서 리포트, 마이페이지 영문 지원 적용.
- **작업 내용**:
  1. `app/features/guide/ServiceGuideModal.jsx` & `app/i18n/translations.js`:
     - 하단 푸터 액션 영역에서 기존 모달 닫기(`close`) 버튼을 이전 슬라이드로 이동하는 `Previous`(`이전`) 버튼으로 전면 전환 (`onClick={handlePrev}`, `disabled={isFirst}`, 첫 슬라이드에서는 숨김 처리).
     - 다음 버튼 텍스트를 `Next ›`에서 화살표 없는 간결한 `Next`(`다음`)로 개편.
     - 마지막 슬라이드에서도 이전 슬라이드를 다시 확인할 수 있도록 `Previous` 버튼을 함께 배치.
  2. `app/pages/LoginPage.jsx`:
     - 로그인 이용 안내 모달의 2번째 항목(테스트 운영 중) 설명 문구 영문 텍스트 내 `Try DPYB`를 `Try Out DPYB`로 변경.
     - 메인 캔버스 DPYB 체험 버튼 툴팁(`tooltipEn`)도 `Try Out DPYB (Explore without login)`로 정합성 일원화.
  3. `app/components/Gnb.jsx`:
     - 모바일 햄버거 드로어 네비게이션 내 1~4번 메인 메뉴(`My Library`, `Add Book`, `Reading Report`, `My Page`) 및 서브메뉴가 `useLanguage()` 및 다국어 사전을 통해 영어 모드 시 영문으로 완벽히 출력되는 상태 재검증 및 유지.
  4. 하네스 문서(`STATE.md`, `HANDOFF.md`, `HANDOFF_2026-09.md`) 갱신 및 5세션 상한 롤링 아카이빙 유지.
- **검증**:
  - `npm run check:harness` 통과 (HANDOFF, PLAN, STATE, DECISIONS, archive 정상)
  - `npm run lint` 통과 (0 errors, 0 warnings)
  - `npm run typecheck` 통과 (0 errors)
  - `npm run build` 통과 (Vite bundle 정상 빌드)

## 2026-10-11: 내 서재 및 전역 페이지 다국어(영어) 번역 지원
- 작업 브랜치: `feat/app-english-translation`
- **사용자 요청**:
  - 사용자가 로그인 페이지에서 영어를 선택(`lang === 'en'`)하여 내 서재 페이지(`/library`)에 들어왔을 때 GNB 메뉴를 포함한 모든 페이지의 텍스트들을 영어로 전환.
- **작업 내용**:
  1. `app/i18n/translations.js`:
     - 한국어(`ko`) 및 영어(`en`) 사전 정의 (`common`, `status`, `genre`, `gnb`, `library`, `chat`, `debate`, `bookDetail`, `register`, `report`, `mypage`, `profiles`, `guide`).
     - 독서 상태(`formatReadingStatus`) 및 장르(`formatGenre`) 헬퍼 함수 구현.
  2. `app/store/LanguageProvider.jsx` & `app/store/languageStore.js`:
     - `t(keyOrKo, enFallback)` 함수 지원 (dot-notation, inline fallback, object 모두 지원).
     - `useLanguage()` re-export 및 `formatStatus`, `formatGenre`, `isEn`, `isKo` 전역 제공.
  3. `app/components/Gnb.jsx`:
     - 데스크톱 메뉴(`내 서재`, `책 등록`, `독서 리포트`, `마이페이지`, `로그아웃`).
     - 프로필 바텀시트 메뉴(`사서 프로필`, `라이트/다크 모드`, `로그아웃`).
     - 모바일 햄버거 드로어 전체 메뉴 및 서브메뉴(도서검색, ISBN촬영, 직접입력, 독서리스트, 캘린더, 내정보) 다국어화.
  4. `app/pages/MyLibrary.jsx` & `app/features/room/LibraryScene.jsx` & `app/features/room/MobileShelfSheet.jsx`:
     - 3D 서재 로딩 안내(`Preparing your library... 🐾`), 선반 탭(`Shelf {N}`), 빈 선반 안내, 책 호버 말풍선, 타이머 플로팅 버튼, 상태 배지 영문화.
  5. 사서 대화 및 토론 컴포넌트:
     - `ChatModeTabs`, `ChatHeader`, `ChatInputForm`, `ChatMessageList`, `DebateSetupSection`, `MobileChatFAB`, `LibrarianChat` 전체 UI 텍스트(탭, 플레이스홀더, 필터, 버튼, 토론 안내) 다국어화.
  6. `app/features/room/BookDetail.jsx`:
     - 도서 상세 메타 레이블, 페이지 입력 안내, 액션 버튼(수정, 삭제, 저장, 독서타이머, 문장수집, 탭), 삭제 확인 팝업 다국어화.
  7. `app/pages/RegisterBook.jsx`:
     - 도서 등록 탭(검색, 바코드/표지, 직접입력) 및 상세 등록 폼 헤더 영문화.
  8. `app/pages/MonthlyReport.jsx`, `app/pages/MyPage.jsx`, `app/pages/LibrarianProfiles.jsx`, `app/features/guide/ServiceGuideModal.jsx`:
     - 월간 리포트 카드 타이틀/지표, 마이페이지 탭 및 프로필/계정 카드, 사서 프로필 카드/버튼, 서비스 가이드 푸터 버튼 다국어화.
  9. 하네스 문서(`STATE.md`, `HANDOFF.md`, `HANDOFF_2026-09.md`) 갱신 및 5세션 상한 롤링 아카이빙 유지.
- **검증**:
  - `npm run check:harness` 통과 (HANDOFF, PLAN, STATE, DECISIONS, archive 정상)
  - `npm run lint` 통과 (0 errors, 0 warnings)
  - `npm run typecheck` 통과 (0 errors)
  - `npm run build` 통과 (Vite bundle 정상 빌드)

## 2026-10-11: 로그인 페이지 언어 변환 기능(한국어/영어) 및 언어 스위처 추가
- 작업 브랜치: `feat/login-language-switcher`
- **사용자 요청**:
  - 언어 변환 기능 추가 (한국어, 영어).
  - 한국어: default (기존 UI).
  - 영어: `public/login_eng` (WebP 변환 반영).
  - 언어 변환 버튼은 로그인 페이지에 배치하며 위치는 `public/lang_switcher` 좌표 참고.
- **작업 내용**:
  1. `public/login_eng.webp`:
     - 원본 영문 로그인 배경 PNG(5.8MB)를 2560x1440 RGB 고품질 WebP(Q90, 1.2MB, 약 79% 경량화)로 최적화 변환 및 원본 소스 정리.
  2. 좌표 추출 및 정밀 배치 (`LANG_SWITCHER_POS`):
     - `public/lang_switcher.png` 기준 바운딩 박스 `(1214, 232, 1405, 292)`를 2560x1440 비율 기반 퍼센트 좌표(`left: 47.42%`, `top: 16.11%`, `width: 7.46%`, `height: 4.17%`)로 변환.
     - 2560x1440 캔버스 스케일링 레이어(`.login-cover-layer`) 내부에 언어 전환 스위처 배치하여 해상도별 왜곡 없는 완벽 정렬 보장.
  3. `app/store/languageStore.js` & `app/store/LanguageProvider.jsx`:
     - 글로벌 언어 상태 관리(`LanguageContext`, `useLanguage`), `localStorage` 영속화(`dpyb.language`), 기본값 한국어(`ko`) 제공.
     - 최상단 `app/App.jsx`에 `<LanguageProvider>` 감싸기 적용.
  4. `app/pages/LoginPage.jsx` & `app/pages/LoginPage.css`:
     - 언어 스위처 UI(`한국어 | ENG`) 구현 및 활성 언어 강조/스위칭 인터랙션 적용.
     - 언어 선택에 따른 배경 이미지 동적 교체: 한국어(`login-bg.webp`) vs 영어(`login_eng.webp`).
     - 툴팁 다국어화(`tooltipKo`/`tooltipEn`), 입력창 플레이스홀더(`이메일`/`Email`, `비밀번호`/`Password`), 에러 메시지 및 공지 팝업 모달 영문화 지원.
  5. 하네스 문서(`STATE.md`, `HANDOFF.md`, `HANDOFF_2026-09.md`) 갱신 및 5세션 상한 롤링 아카이빙 유지.
- **검증**:
  - `npm run check:harness` 통과 (HANDOFF, PLAN, STATE, DECISIONS, archive 정상)
  - `npm run lint` 통과 (0 errors, 0 warnings)
  - `npm run typecheck` 통과 (0 errors)
  - `npm run build` 통과 (Vite bundle 정상 빌드)

## 2026-10-11: 도메인 초기 진입 로딩 대체 서비스 사용 가이드 우선 노출 및 로그인 팝업 연계
- 작업 브랜치: `feat/initial-service-guide-notice-flow`
- **사용자 요청**:
  - 도메인 접속 시 "불러오는 중이에요" 로딩 문구 대신 대기 시간이 지루하지 않도록 서비스 사용 가이드를 우선 띄우고, 사용자가 가이드를 닫으면 로그인 페이지 팝업창(PC 환경 권장/테스트 운영 중 안내)을 순차적으로 띄우도록 개선.
- **작업 내용**:
  1. `app/features/guide/guideStorage.js`:
     - 세션 스토리지 기반 `isGuideSeenInSession`, `markGuideSeenInSession` 유틸 추가로 동일 브라우징 세션 내 중복 모달 노출 방지.
  2. `app/features/guide/ServiceGuideModal.jsx`:
     - 가이드 모달 닫기(`handleCloseModal`) 시 `markGuideSeenInSession()` 자동 호출.
  3. `app/components/ProtectedRoute.jsx`:
     - `status === 'loading'` 단계에서 단순 텍스트("불러오는 중이에요...") 대신 미열람 상태인 경우 서비스 사용 가이드(`ServiceGuideModal`) 우선 표출.
     - 가이드 열람 중 백엔드 인증 확인이 비로그인으로 판별되어도 강제 리다이렉트 없이 가이드 열람을 지속 보장하고, 사용자가 닫았을 때 로그인 페이지로 안전하게 이동(`fromGuideClosed`).
     - 이미 열람한 경우 6프레임 냥이 순차 로딩 애니메이션(`LoadingSequence`) 표출로 대기 UX 개선.
  4. `app/pages/LoginPage.jsx`:
     - `ServiceGuideModal` 연동 및 `showGuide` 우선 표출 흐름 구축.
     - 사용자가 가이드를 닫았을 때(`handleCloseGuide`) 로그인 페이지 공지 팝업(`showPcNotice`)을 순차적으로 연계 활성화.
  5. `app/features/room/LibraryScene.jsx` & `app/App.jsx` & `app/pages/MyLibrary.jsx`:
     - 서재 진입 시 중복 가이드 팝업 방지(`!isGuideSeenInSession()`) 및 Suspense 폴백 텍스트를 `LoadingSequence` 애니메이션으로 통일.
  6. 하네스 문서(`STATE.md`, `HANDOFF.md`, `HANDOFF_2026-09.md`) 갱신 및 5세션 상한 롤링 아카이빙 유지.
- **검증**:
  - `npm run check:harness` 통과 (HANDOFF, PLAN, STATE, DECISIONS, archive 정상)
  - `npm run lint` 통과 (0 errors, 0 warnings)
  - `npm run typecheck` 통과 (0 errors)
  - `npm run build` 통과 (Vite bundle 정상 빌드)

## 2026-10-10: 블루(고양이) 서재 배경 이미지(readingroom_cat.webp) 교체 및 최적화
- 작업 브랜치: `feat/update-readingroom-cat-webp`
- **사용자 요청**:
  - `readingroom_cat` 블루 UI 이미지 파일 교체 반영 (WebP 변환 포함).
- **작업 내용**:
  1. `public/room/readingroom_cat.webp`:
     - 신규 제공된 원본 `readingroom_cat.png`(2560x1440, 6.1MB)를 3D 서재 표준 규격인 1920x1080 16:9 비율(Lanczos 리샘플링, RGB 고품질 WebP Q90)로 최적화 변환(557KB, 약 91% 용량 감축).
     - 원본 소스 PNG 정리 및 3D 서재 씬(`shelfLayout.js`의 `BG_SRC_CAT`)에서 최신 UI 배경이 즉시 노출되도록 반영.
  2. 하네스 문서(`STATE.md`, `HANDOFF.md`, `HANDOFF_2026-09.md`) 갱신 및 5세션 상한 롤링 아카이빙 유지.
- **검증**:
  - `npm run check:harness` 통과 (HANDOFF, PLAN, STATE, DECISIONS, archive 정상)
  - `npm run lint` 통과 (0 errors, 0 warnings)
  - `npm run typecheck` 통과 (0 errors)
  - `npm run build` 통과 (Vite bundle 정상 빌드)
