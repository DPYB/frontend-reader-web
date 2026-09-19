# HANDOFF (세션별 서술 로그, append-only)

## 2026-09-19: 누디 서재 전용 배경 이미지 적용
- 작업 브랜치: `feature/누디-서재-배경`
- **배경**: 사용자가 누디(nudi) 서재용 배경 이미지(`readingroom_nudi.png`, 2560x1440)를 제공. 블루/슈빌과 동일한 방식으로 내 서재 배경으로 적용.
- **수정 내용**:
  - `public/room/readingroom_nudi.png` → `readingroom_nudi.webp`로 변환(1920x1080, 6.4MB→474KB, cat/stork와 동일 해상도·포맷 규칙) 후 원본 PNG 삭제
  - `app/features/room/shelfLayout.js`:
    - `BG_SRC_NUDI = '/room/readingroom_nudi.webp'` 상수 추가
    - `BG_SRC_BY_LIBRARIAN`(사서id → 배경 매핑) 및 `getBgSrc(librarianId)` 헬퍼 신설 — 기존엔 `LibraryScene.jsx`에 `librarianId === 'stork' ? BG_SRC_STORK : BG_SRC_CAT` 3항 연산자로 cat/stork 2개만 하드코딩되어 있어 사서가 늘어날수록 분기가 불어나는 구조였음. 매핑 테이블 방식으로 바꿔 신규 사서 배경 추가 시 이 객체에 한 줄만 추가하면 되도록 확장성 확보
    - 카메라/선반 배치(`CAMERA_BY_LIBRARIAN`/`SHELVES_BY_LIBRARIAN`)는 누디 전용 값이 아직 없어 기존과 동일하게 고양이 기준으로 대체(변경 없음) — 배경 이미지만 전용화
  - `app/features/room/LibraryScene.jsx`: `BG_SRC_CAT`/`BG_SRC_STORK` 개별 import 및 3항 분기를 `getBgSrc(librarianId)` 호출로 교체
- **검증**: `npx eslint` 통과(기존 warning 1건 외 신규 0건), `npm run build` 성공(dist 삭제 완료)
- ⚠️ 누디 전용 카메라/선반 배치, 글로우 컬러(`GLOW_COLOR`)는 여전히 고양이 대체 중(BACKLOG 기존 항목 유지)

## 2026-09-19: 로그인 화면 UI 레이아웃 및 발바닥 버튼 인터랙션 개선
- **배경**:
  - 비밀번호 입력칸 우측 발바닥 버튼 클릭 시 비밀번호가 3초간 평문으로 표시되는 기능이 마우스 클릭 이벤트를 받지 못하는 현상 해결.
  - 이메일/비밀번호 입력칸의 가로 너비가 좁아 긴 계정 입력 시 잘리는 현상 개선.
  - 개발자도구를 닫거나 화면 세로 높이가 길어질 때 간편로그인 컨테이너가 위로 붕 뜨는 현상 개선.
- **수정 내용**:
  - `app/pages/LoginPage.css`:
    - `.login-hit-area`의 `z-index`를 `3`에서 `6`으로 상향하여 인풋 필드(`z-index: 4`) 위에서 항상 클릭 이벤트를 수신하도록 보장.
    - `.login-social-container`의 위치를 `top: 73%`에서 `bottom: 3.5vh` 기준으로 변경하여 화면 세로가 길어져도 하단에 안정적으로 고정되도록 개선.
    - 간편로그인 구분선(`login-social-divider`) 및 텍스트를 제거하여 일러스트 테마와 어울리도록 미니멀하게 정리.
  - `app/pages/LoginPage.jsx`:
    - `INPUT_FIELDS`의 `id` 너비를 `15.2%`에서 `17.5%`로 확장하여 긴 이메일이 잘리지 않도록 개선.
    - 발바닥 눈 버튼(`eye`) 히트 영역의 너비와 높이를 `width: 2.2%`, `height: 3.8%`, `left: 59.2%`로 최적화하여 클릭 범위를 넓힘.
    - 발바닥 클릭 타이머를 `useRef`(`eyeTimerRef`)로 관리하고 컴포넌트 언마운트 시 클린업 로직 추가.
    - 소셜 로그인 구분선 영역 제거.
- **검증**:
  - `npx tsc --noEmit` 통과 (0 errors).
  - `npm run lint` 통과 (기존 경고 6건 외 신규 경고/에러 0건).

## 2026-09-18: 해커톤 게스트 체험 모드(Guest JWT 발급, 조용한 갱신 및 UI 제한) 구현
- **배경**: 인증 생략에 따른 데이터 파이프라인 결함을 방지하기 위해 임시 출입증인 '게스트 JWT' 발급(`role: "guest"`, `sub: "guest-{uuid}"`) 및 조용한 갱신을 지원하고 게스트용 UI 쓰기 제한 및 403 에러 토스트 팝업 연동.
- **수정 내용**:
  - `app/api/authApi.js`:
    - `parseJwtPayload(token)`: base64url 디코더를 구현하여 JWT에서 `role`과 `sub`을 안전하게 파싱.
    - `loginAsGuest(guestId)`: `POST /api/v1/auth/guest` 호출 및 토큰/클레임 메모리 등록.
    - `refreshAccessToken()`: 게스트 세션일 때 기존 `guest_id(sub)`를 요청 바디에 담아 백그라운드에서 조용히 갱신 처리 (채팅 끊김 방지).
    - `authFetch()`: `_retry: true` 플래그로 401 Silent Refresh 무한 루프 1회 재시도 방어 및 403 발생 시 공통 토스트(`"체험 모드에서는 지원하지 않는 기능입니다"`) 알림 트리거.
  - `app/components/Toast.jsx`, `app/components/toastContext.js`, `app/components/Toast.css`:
    - 전역 토스트 Context 및 모듈 레벨에서 즉시 호출 가능한 `showGlobalToast()` 인프라 구축.
    - `App.jsx` 최상단에 `ToastProvider` 래핑.
  - `app/store/AuthProvider.jsx`:
    - 전역 Auth Context에 `role`, `isGuest` (`role === 'guest'`) 및 `loginAsGuest()` 노출.
    - 세션 복원 시 게스트 상태 유지 지원.
  - `app/pages/LoginPage.jsx`, `LoginPage.css`:
    - 로그인 하단 간편 로그인 영역에 `[🐾 DPYB 체험하기 (로그인 없이 둘러보기)]` CTA 버튼 추가 및 클릭 시 게스트 로그인 후 서재 진입 연동.
  - `app/pages/MyPage.jsx`:
    - 게스트 모드일 때 '비밀번호 변경', '계정 탈퇴' 폼과 버튼을 숨기고 "체험 모드 이용 중" 안내 박스 표시.
  - `app/features/room/BookDetail.jsx`:
    - 게스트 모드일 때 서재 도서 '삭제' 버튼 숨김 처리.
  - `app/components/Gnb.jsx`:
    - 게스트 로그인 시 로고 옆에 `🐾 체험 모드` 뱃지 렌더링.
- **검증**:
  - `npx tsc --noEmit` 통과 (0 errors).
  - `npm run lint` 통과 (기존 경고 6건 유지, 신규 에러/경고 0건).
  - `npm run build` 번들 정상 빌드 확인.

## 2026-09-18: 월간 독서 리포트 레거시 막대 버전 제거 및 Recharts 시각화 차트 기반 단일화
- **배경**: 팀 논의 결과 Recharts 기반 시각화(02 주간 흐름 곡선 그래프, 03 장르 점유율 도넛 차트, 06 날씨별 베스트 도서 매핑 Grid 카드)를 기본이자 단일 뷰로 채택하기로 결정됨에 따라, 임시로 보존했던 레거시 막대그래프 버전 및 비교 스위치 제거
- **수정 내용**:
  - `app/pages/MonthlyReport.jsx`:
    - `isLegacyView` 상태 및 액션 바 내 `[📊 Recharts 시각화 뷰로 보기 / ↩️ 원본 막대 뷰로 보기]` 토글 버튼 제거
    - 02번 카드(독서 리듬), 03번 카드(독서 취향), 06번 카드(날씨와 책)의 `isLegacyView` 삼항 연산자 조건부 분기를 걷어내고 Recharts 차트/Grid 컴포넌트만 직접 렌더링하도록 정리
  - `app/pages/MonthlyReport.css`:
    - 미사용 레거시 토글 버튼(`.report-view-toggle-btn`) 및 미사용 그리드 클래스(`.rhythm-grid`) 정리
  - 파일 삭제:
    - `app/pages/MonthlyReport.legacy.jsx` 및 `app/pages/MonthlyReport.legacy.css` 완전 삭제
- **검증**:
  - `npx tsc --noEmit` 통과 (0 errors)
  - `npm run lint` 통과 (기존 경고 6건 유지, 신규 경고/에러 0건)
  - `npm run build` 번들 정상 빌드 확인

## 2026-09-18: 월간 독서 리포트 추천 도서 장르 한글 매핑 정규화
- 작업 브랜치: `fix/monthly-report-genre-mapping`
- **배경**: 월간 독서 리포트 08번 카드(다음 달 독서 처방) 추천 도서 카드에서 장르가 `#NATURAL_SCIENCE`와 같이 백엔드 영문 Enum 코드로 노출되는 결함 해결
- **수정 내용**:
  - `app/api/reportApi.js`:
    - `data/genres.js`의 `genreLabel()` 유틸 함수 임포트
    - 백엔드 DTO 정규화 어댑터 `normalizeMonthlyReport`에서 `prescription.books[].genre`를 `genreLabel(b.genre) || b.genre`로 변환하여 한글명(`자연과학` 등)으로 공급
    - `prescription.recommendedGenre`, `taste.tags`, `taste.genreStats[].name`, `balance.dominantGenre`, `balance.unreadGenres` 등 리포트 내 모든 장르/태그 필드에도 일괄 한글 라벨 정규화 적용
  - `app/pages/MonthlyReport.jsx`:
    - 08번 카드 추천 도서 목록 렌더링 시 `#{genreLabel(book.genre) || book.genre}` 방어 코드 적용
    - 추천 장르 테마 배너 `genreLabel(prescription?.recommendedGenre)` 적용
    - `taste.genreStats` 로컬 정규화 매핑에도 `genreLabel()` 보강
  - `app/pages/MonthlyReport.legacy.jsx`:
    - 레거시 뷰 추천 도서 카드 및 추천 테마 배너에도 동일하게 `genreLabel` 적용
- **검증**:
  - `npx tsc --noEmit` 타입 검사 통과 (0 errors)
  - `npm run lint` 통과 (기존 경고 6건 유지, 신규 경고/에러 0건)

## 2026-09-18: Google & Kakao 소셜 로그인 연동 및 기본 UI 레이아웃(와꾸) 구현
- 작업 브랜치: `feat/social-login-google-kakao`
- **원격 동기화**: `develop` 최신 커밋(`88be5ad`: 사서 프로필 카드 정렬 및 문구 정리) fast-forward 머지 후 작업 브랜치 분기
- **API 클라이언트 함수 추가 (`app/api/authApi.js`)**:
  - `loginWithGoogle(idToken)`: Google Identity Services credential 토큰을 `POST /api/v1/auth/social/google` 전송 및 access_token 메모리 등록
  - `loginWithKakao(kakaoAccessToken)`: Kakao JS SDK access_token을 `POST /api/v1/auth/social/kakao` 전송 및 access_token 메모리 등록
- **전역 상태 Provider 연동 (`app/store/AuthProvider.jsx`)**:
  - `loginWithGoogle`, `loginWithKakao` 메서드를 구현하여 `useAuth()` 훅에 노출
  - 개발 우회 모드(`AUTH_BYPASS`) 시에도 더미 소셜 사용자 계정으로 로그인되어 원활한 화면 전환 테스트 지원
- **소셜 인증 SDK 유틸 구현 (`app/utils/socialAuth.js`)**:
  - Google Identity Services SDK 동적 로더 및 `renderGoogleButton`, `triggerGoogleLogin` 구현
  - Kakao JavaScript SDK(2.7.4) 동적 로더 및 `triggerKakaoLogin` 팝업 로그인 구현
- **로그인 페이지 UI 레이아웃 (`app/pages/LoginPage.jsx`, `LoginPage.css`)**:
  - 기존 2560x1440 일러스트 레이어 및 비밀번호/로그인/회원가입 버튼에 영향을 주지 않도록 하단 중앙(`.login-social-container`)에 구분선 및 Google / Kakao 심플 버튼 와꾸 배치
  - 소셜 로그인 성공 시 대상 페이지(`from` / 기본 `/library`) 리다이렉트 연동
  - 추후 팀원/디자이너가 최종 전용 그래픽 버튼으로 교체하기 용이하도록 컴포넌트 및 클래스 분리
- **검증**:
  - `npx tsc --noEmit` 통과
  - `npm run lint` 통과 (기존 경고 6건 유지, 신규 경고/에러 0건)
  - `npm run build` 번들 정상 빌드 확인

## 2026-09-17: 로그인 불가 버그 수정 (AUTH_BYPASS + BooksProvider 401 레이스)

### 근본 원인
- `VITE_AUTH_BYPASS` 미설정 → DEV 모드에서 `AUTH_BYPASS=true`로 평가
- AUTH_BYPASS 로그인은 실제 `accessToken`을 메모리에 올리지 않음
- 로그인 후 `BooksProvider.reload()` → `authFetch('/library/books')` 호출 → 토큰 없어 401
- `authFetch` 401 핸들러가 `refreshAccessToken()` 시도 → refresh 쿠키 없어 실패 → `onSessionExpired()` 호출 → 강제 로그아웃
- 결과: 로그인 성공 직후 즉시 튕기는 무한 루프

### 수정 내용
1. **`app/api/authApi.js` 401 핸들러 수정** (line 161-170):
   - 기존: `accessToken` 유무와 무관하게 refresh 시도 → `onSessionExpired()` 호출
   - 변경: 원래 `accessToken`이 없었던 경우(AUTH_BYPASS 또는 미인증 상태)에는 refresh/`onSessionExpired` 경로를 타지 않고 그냥 `ApiError(401)` throw
   - AUTH_BYPASS 임포트 제거 (unused import)
2. **`.env.local`에 `VITE_AUTH_BYPASS=false` 추가**: 실제 백엔드 로그인 사용
   - `test@test.com` / `password`로 로그인 가능 (백엔드 curl 검증 완료)
3. Vite dev 서버 재시작 완료

### 현재 상태
- Vite: `http://localhost:5173` 실행 중
- 백엔드: `127.0.0.1:8000` (메인), `127.0.0.1:8001` (AI) 실행 중
- `test@test.com` / `password`로 로그인 가능 여부 사용자 검증 필요
- 브랜치: `feat/librarian-chat-session-isolation`

## 2026-09-14: DPYB 조직 마이그레이션 및 프론트엔드 리팩토링
- 기존 저장소에서 AWS 의존성(배포 워크플로우 및 문서) 제거 완료
- `my-reading-room/` 서브디렉터리 구조를 프로젝트 루트로 평탄화(Flattening)
- 소스 디렉터리를 `src/`에서 `app/`으로 마이그레이션 및 path alias(`@`) 설정
- 패키지 식별자를 `frontend-reader-web`으로 변경
- TypeScript 점진적 도입 환경 구축 (`tsconfig.json`, `npm run typecheck`, TS7 및 ESLint 지원)
- 팀원 시각 에셋 보호를 위한 우클릭 방지, 드래그 차단, `ASSETS_LICENSE.md`, `public/README.md` 적용
- DPYB 듀얼 백엔드(`backend-core-api`, `backend-ai-agent`) 연동을 위한 Vite 프록시 및 `.env.example` 개편
- DPYB 조직 바이브 코딩 하네스(`.harness/`, `AGENTS.md`) 및 CI 워크플로우 적용

## 2026-09-15: 개발 단계용 인증 우회 스위치 도입
- 인증 백엔드 미연동 상태에서 로그인 화면에 막혀 서재/등록/마이페이지를 확인할 수 없던 문제 해소
- `app/store/authBypass.js` 신설 — `VITE_AUTH_BYPASS`(true/false/미설정) 판정과 가짜 회원(`BYPASS_MEMBER`) 정의
- `AuthProvider`: 우회 시 refresh 복원 스킵, `login()`은 API 호출 없이 즉시 authenticated, `logout()`은 로컬 상태만 정리
- `LoginPage`: 우회 시 이메일/비밀번호 입력 검증 없이 로그인 버튼 활성화 + 좌측 상단에 개발 모드 배지 표시
- 기본값을 `import.meta.env.DEV`로 두어 프로덕션 빌드에는 우회가 실리지 않도록 방어

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

**다음 세션 시작 시**: 신규 백엔드 스펙에 맞춘 '사서 토론 모드 UI' 및 '독서 타이머 기능' 와꾸와 연동 작업 착수 (인증 백엔드 연동 완료 시 `BACKLOG.md`의 우회 제거 항목 함께 처리)

## 2026-09-15: 사서 특화 장르 KDC 개편 + 신규 사서 2종(누디/게코) 임시 추가
- 백엔드 `GenreType` enum(총류/철학/종교/사회과학/자연과학/기술과학/예술/언어/문학/역사, KDC 10대 대분류)에 맞춰
  `app/data/genres.js`의 `GENRE_DEFS`를 기존 15개 세부 장르 체계에서 이 10개로 전면 교체.
  - aliases에 기존 세부 키워드(소설·에세이·시·희곡·미스터리·SF·판타지·로맨스 등)를 문학으로,
    심리학·자기계발을 철학으로, 경제·경영·비즈니스를 사회과학으로, IT·컴퓨터·건강·요리를
    기술과학으로 흡수시켜 로컬 fallback 검색(`detectGenreCode`)이 계속 동작하게 함
  - '과학'은 자연과학 단독 별칭에서 제외(과학소설/SF와의 오분류 방지)
- `app/data/librarians.js`: 사서당 특화 장르가 여러 개일 수 있도록 `specialtyCode`(단수) →
  `specialtyCodes`(배열)로 구조 변경. 파생 필드(`specialtyGenre`, `specialty`)는 여러 장르를
  '·'로 이어붙여 표시 (예: "총류·철학·종교 장르 추천")
  - 블루: 총류·철학·종교 / 슈빌: 자연과학·기술과학 (기존 미스터리·스릴러, 비즈니스·경제에서 교체)
  - 신규 사서 **누디**(바다달팽이/갯민숭달팽이, id: `nudi`) 추가 — 예술·문학 특화, 기본 닉네임 "누디"
  - 신규 사서 **게코**(id: `gecko`) 추가 — 사회과학·언어·역사 특화, 기본 닉네임 "게코"
  - `typeCode`(`SEA_SLUG`, `GECKO`)는 백엔드 `librarian_type` enum에 아직 없는 임시값 — 백엔드 확정 필요
  - `findLibrarianByKeyword`가 사서별 `commonNames`(예: '고양이', '황새', '달팽이', '도마뱀') 배열을
    참조하도록 일반화(기존엔 cat/stork를 코드에 하드코딩)
  - `librarianForGenre`도 배열 매칭(`specialtyCodes.includes`)으로 변경
- `app/features/room/chatEngine.js`: `librarian.specialtyCode` → `specialtyCodes[0]`(대표 장르) 및
  `includes()` 매칭으로 수정. `librarian.id === 'cat' ? '냥' : ''` 하드코딩을 `librarian.speechInterjection`
  필드로 대체(사서가 2종에서 4종으로 늘어나며 사서별 어미를 데이터로 관리)
- `app/features/room/LibrarianChat.jsx`: 로딩 문구에서 '블루 사서'를 하드코딩하던 부분을
  일반화된 '사서'로 수정 (신규 사서로 채팅해도 엉뚱한 이름이 뜨지 않도록)
- 프로필 사진: 누디·게코는 실제 일러스트가 없어 `public/profile/{nudi,gecko}-placeholder.svg`
  임시 이미지(이모지 + "임시 이미지" 라벨) 배치. `image`/`imageHover`(3D 서재 커서 스프라이트)와
  전용 서재 배경(`shelfLayout.js`)·글로우 컬러(`LibraryScene.jsx`)는 아직 없어, 서재 진입 시
  고양이 서재 배치로 대체 표시됨(librarians.js 상단 주석에 후속 작업 지점 명시)
- `npm run typecheck`, `npm run lint`(기존 warning 5건만 유지), `npm run build` 통과 확인

**다음 세션 시작 시**: 백엔드와 `librarian_type` enum에 `SEA_SLUG`/`GECKO`(또는 확정된 코드명) 값을
맞춘 뒤 `librarians.js`의 `typeCode`를 교체. 누디·게코의 실제 프로필 일러스트·3D 서재 커서
스프라이트·전용 배경이 나오면 placeholder를 교체하고 `shelfLayout.js`/`LibraryScene.jsx`에
배치를 추가.

## 2026-09-15: 사서 프로필 페르소나 콘텐츠 보완 + 카드 4열 고정 그리드
- 기획팀 "사서 페르소나 개요" 문서를 반영해 `app/data/librarians.js`의 각 사서에 필드 추가:
  `mbti`, `oneLiner`(한 줄 요약), `personality`(성격), `readingStyle`(독서 성향),
  `speechStyle`(말투·행동), `catchphrase`(페르소나 핵심 문장)
  - 블루 INTJ(사색가) / 슈빌 ISTP(실용적 탐구자) / 누디 INFP(감성가) / 게코 ENFJ(공감형 탐구자)
  - 종결어미(`speechInterjection`)도 문서에 맞춰 갱신: 누디 '누누', 게코 '크크' (기존 미지정 → 확정)
  - ⚠️ 문서의 종결어미 예시 문장은 반말체("~다두둥")인데 슈빌의 기존 `formalTone: true`
    (존댓말 채팅 UI)와 어긋난다. 이번엔 프로필 표시 텍스트만 반영하고 채팅 응답 말투는
    건드리지 않았음 — 필요 시 별도 작업으로 슈빌 존댓말 정책을 재검토해야 함
- `app/pages/LibrarianProfiles.jsx`: MBTI 배지 + 한 줄 소개, 성격/독서 성향/말투·행동 섹션,
  페르소나 핵심 문장(인용구 스타일)을 카드에 추가 렌더링
- `app/pages/LibrarianProfiles.css`: 그리드를 `auto-fill`(가변 열)에서 `repeat(4, 1fr)` 고정
  4열로 변경해 카드 4개가 항상 한 줄에 나란히 놓이고 5번째부터 다음 줄로 내려가도록 함.
  1024px 이하 2열, 560px 이하 1열 반응형 유지. 새로 추가된 텍스트 섹션에 맞는 스타일
  (`.lp-oneliner`, `.lp-mbti`, `.lp-persona`, `.lp-catchphrase`) 추가
- `npm run typecheck`, `npm run lint`(기존 warning 5건만 유지), `npm run build` 통과 확인

**다음 세션 시작 시**: 슈빌의 존댓말(`formalTone`) 정책과 페르소나 문서의 반말 종결어미
예시가 어긋나는 부분을 기획팀과 재확인 필요.

## 2026-09-15: 사서 어미 띄어쓰기 통일 + 프로필 카드 말투·행동 문단 제거
- 사용자 피드백 반영: 사서 종결어미(냥/두둥/누누/크크)를 단어에 바로 붙이지 않고
  앞말과 띄어 쓰도록 전체 수정 (예: "무엇을 찾아드릴까요냥?" → "무엇을 찾아드릴까요 냥?")
  - `app/data/librarians.js`의 `catchphrase` 4건, `app/features/room/chatEngine.js`,
    `app/features/room/LibrarianChat.jsx`, `app/features/room/LibrarianCursor.jsx`,
    `app/pages/MonthlyReport.jsx`의 어미 부착 문구를 모두 띄어쓰기로 통일
  - `docs/*.md`(설계 문서)의 예시 문구는 과거 결정 기록이라 손대지 않음
- `app/data/librarians.js`: 프로필에 노출하던 `speechStyle`(말투·행동 설명 문단) 필드 제거.
  대표 어미 예시 문장인 `catchphrase`만 프로필에 남김 (사용자 요청)
- `app/pages/LibrarianProfiles.jsx`: 말투·행동 `<dd>` 렌더링 제거
- `npm run typecheck`, `npm run lint`(기존 warning 5건만 유지), `npm run build` 통과 확인

## 2026-09-15: 사서 프로필 카드 정리 (말투/MBTI 제거, 성격·독서성향 아코디언)
- 사용자 피드백 반영:
  - 특화 장르 아래 '말투'(persona) 행 제거 — `persona` 데이터 필드도 사용처가 없어 함께 삭제
  - MBTI 표시 제거 — 프로필의 MBTI 배지와 `.lp-mbti` 스타일, 각 사서의 `mbti` 데이터 필드 삭제
    (한 줄 소개 `oneLiner`는 유지)
  - 성격·독서 성향은 문단이 길어 `<details>`/`<summary>` 네이티브 아코디언으로 접어 둠
    (기본 닫힘, "성격 · 독서 성향 보기" 클릭 시 펼침). 커스텀 화살표(▾) 마커 스타일 추가
- 변경 파일: `app/data/librarians.js`(persona·mbti 필드 및 헤더 주석 정리),
  `app/pages/LibrarianProfiles.jsx`(말투 행·MBTI 배지 제거, 아코디언 도입),
  `app/pages/LibrarianProfiles.css`(`.lp-mbti` 제거, `.lp-details`/`.lp-details-summary` 추가)
- `npm run typecheck`, `npm run lint`(기존 warning 5건만 유지), `npm run build` 통과 확인

## 2026-09-15: 독서 리포트 라이트 모드 대비 수정 + 구분자 & → 가운뎃점
- 라이트 모드에서 리포트 카드·월 선택 드롭다운 등이 어둡게 떠 안 보이던 문제 해결:
  - 원인은 `MonthlyReport.css`가 앱 테마에 없는 `--bg-card` 변수와 다크 계열 하드코딩
    fallback(`#0f172a`, `#1e293b`, `#334155` 등)을 써서, 라이트 테마에서도 다크 슬레이트
    색이 그대로 적용된 것
  - 모든 색을 앱 테마 변수(`--bg`/`--code-bg`/`--border`/`--text`/`--text-h`/`--accent*`)로
    교체. 표면 위계를 페이지(--bg) < 시트(--code-bg) < 카드(--bg) < 내부 박스(--code-bg)로
    번갈아 두어 라이트/다크 양쪽에서 카드가 구분되게 함
  - 월 선택 `<select>`와 `option`에 테마 배경/글자색을 명시(일부 브라우저가 option에 배경을
    상속하지 않아 라이트에서 흰 바탕+흰 글씨가 되는 것 방지)
  - `MonthlyReport.jsx`의 인라인 `var(--accent, #818cf8)` fallback도 정리
  - 사용자가 예시로 든 다크 계열 accent(#10b981/#f59e0b), 버튼 흰 글씨, @media print 블록은
    의도된 값이라 유지
- 카드 제목 구분자 " & "를 가운뎃점 " · "로 교체 (03·04·05·07번 카드 4곳)
- `npm run typecheck`, `npm run lint`(기존 warning 5건만 유지), `npm run build` 통과 확인
- ⚠️ 브라우저에서 라이트/다크·사서별(고양이/황새 테마) 실제 렌더링 육안 확인은 미완 —
  코드상 테마 변수로 통일했으나 실제 대비는 화면 확인 권장

## 2026-09-15: 누디·게코 실제 프로필 이미지 적용
- 사용자가 `public/cursors/snail/nudi.JPG`(누디), `public/cursors/gecko/gecko.JPG`(게코)로
  올린 사서 프로필 이미지를 `public/profile/nudi.jpg`, `public/profile/gecko.jpg`로 이동
  (기존 cat/stork 프로필과 같은 위치·명명 규칙). 비게 된 `cursors/snail`·`cursors/gecko` 폴더 삭제
- `app/data/librarians.js`: 누디·게코의 `profileImage`를 placeholder SVG에서 실제 이미지 경로로
  교체. 임시 placeholder(`nudi-placeholder.svg`, `gecko-placeholder.svg`) 삭제
- `app/pages/LibrarianProfiles.css`: `.lp-avatar img`의 `object-fit`을 `contain`→`cover`로 변경.
  기존 정사각 일러스트뿐 아니라 비율이 다른 실사진(누디=가로형, 게코=세로형)도 원형 아바타를
  여백 없이 채우도록 함 (GNB 프로필과 동일 방식)
- 남은 후속: 3D 서재용 커서 스프라이트(image/imageHover)와 전용 서재 배경은 아직 없음(BACKLOG 유지)
- `npm run typecheck`, `npm run lint`(기존 warning 5건만 유지), `npm run build` 통과 및 dist/profile에
  새 이미지 포함 확인

## 2026-09-16: 독서 집중 타이머 기능(스톱워치/뽀모도로) 및 코어 서버 연동 구현
- 독서 집중 타이머 모달 컴포넌트(`ReadingTimerModal.jsx`, `ReadingTimerModal.css`) 구현:
  - 서재 화면 우측 하단 플로팅 액션 버튼(FAB) 및 도서 상세 화면(`BookDetail.jsx`) '독서 타이머' 버튼 진입점 제공
  - 스톱워치(자유 카운트업) 모드 및 뽀모도로(15분/25분/50분 집중 인터벌 카운트다운) 모드 지원
  - 타이머 시작, 일시정지, 리셋, 독서 완료 인터랙션 및 상태 표시 펄스 애니메이션
- 독서 완료 후 페이지 및 기록 저장 연계:
  - 읽은 시간(분 단위) 자동 산출 및 어디까지 읽었는지 현재 페이지 입력란 제공
  - 한 줄 감상 및 날씨 조건 자동 첨부 지원
  - 코어 서버 API 연동: 진행률 갱신(`saveReadingProgress`) 및 독서 기록 작성(`POST /api/v1/records`) 동시 호출
  - 저장 완료 시 전역 서재 상태(`reload()`) 동기화
- `npm run typecheck`, `npm run lint`(기존 경고 5건만 유지), `npm run build` 통과 확인

## 2026-09-16: 사서 챗봇 내 Core API 내 서재 빠른 조회 모드 & AI 토론 모드 UI 구현
- 사서 챗봇(`LibrarianChat.jsx`, `LibrarianChat.css`) 상단 3개 모드 탭 구성:
  - `[ 📚 내 서재 | 💬 대화·추천 | 💡 사서 토론 ]`
- **📚 내 서재 빠른 조회 모드 (Core API 즉시 필터 & 백엔드 AI 에이전트 자연어 질의 지원)**:
  - 상단 검색창: 코어 서버 서재 데이터(`booksStore`) 기반으로 LLM 호출 대기 없이 제목/저자 즉시 필터링 및 진행률 렌더링
  - 하단 메시지 입력창: 내 서재 모드에서도 입력창을 노출하여 사용자가 자연어("읽고 있는 책 목록 보여줘", "김영하 작가 책 있어?" 등)로 질문 시 AI 백엔드 에이전트(`search_my_library`)로 전송되어 지능적인 질의응답 및 결과 카드 서빙
  - 목록 및 답변 카드에서 [책 열기 ➔] 원클릭 시 3D 서재 도서 상세 팝업(`BookDetail`) 즉시 연동
- **💡 사서 토론 모드 (AI Agent 4인 전문 토론자 연동)**:
  - AI 에이전트 백엔드(`backend-ai-agent`)의 4인 토론 파트너(`DEBATE_CRITIC`: 평론가/이동진 오마주, `DEBATE_STORYTELLER`: 이야기꾼/설민석 오마주, `DEBATE_COUNSELOR`: 상담사/오은영 오마주, `DEBATE_OBSERVER`: 관찰가/강형욱 오마주) 레지스트리(`app/data/debatePersonas.js`) 정의
  - 도서 선택 후 하단에 4인 전문 토론자 선택 카드 그리드 구성 (각 토론자별 성향/역할/오마주 태그 노출)
  - 질문 전송 시 `mode: 'DEBATE'`, `persona: debaterPersona`, `book_id` 파라미터 전달 연동
- `npm run typecheck`, `npm run lint`(기존 경고 5건만 유지), `npm run build` 통과 확인

**다음 세션 시작 시**: 토론 종료 버튼 및 피날레 도서 큐레이션 수신 UI 연계 검토

## 2026-09-16: AI 독서 토론 피날레(종료) 및 맞춤 도서 큐레이션 연동
- 작업 브랜치: `feat/debate-finale-curation`
- **토론 피날레 UI 및 트리거 액션 구현**:
  - `LibrarianChat.jsx`: 사서 토론 탭 내 도서/토론자 선택 영역 하단에 `[🏁 토론 마무리 및 맞춤 책 추천받기]` 버튼 추가
  - `handleConcludeDebate()`: 선택된 토론자 페르소나 및 대상 도서명을 바탕으로 마무리 총평 및 추천 도서 요청 문구를 조합하고 백엔드에 `action: 'conclude'` 파라미터 전송
  - `getContextualLoadingMessage`: 토론 마무리/피날레 질문 패턴 감지 시 사서별 맞춤 갈무리 대기 멘트 반환
- **토론 피날레 큐레이션 렌더링 & 서재 기억 저장 연계**:
  - `chatApi.js`: 응답의 `is_concluded`, `debate_summary` 필드를 프론트엔드로 안전하게 매핑
  - `LibrarianChat.jsx` / `LibrarianChat.css`:
    - 피날레 완료 시 `[🧠 토론 인사이트가 서재 기억에 저장되었습니다]` 뱃지 및 토론 요약 인용구(`debate_summary`) 강조 렌더링
    - 백그라운드 태스크(`agent.debate_insights` 벡터 저장)와 시각적 상태 완벽 일치화
    - 후속 엄선 추천 도서(`recommended_books`) 카드 자동 렌더링 및 `[등록 ➔]` 원클릭 서재 등록 연동
- **UI 스타일링**:
  - `LibrarianChat.css`: `.lc-debate-conclude-btn` 및 `.lc-debate-concluded-badge` 그라디언트/인터랙션 애니메이션 스타일링 추가
- `npm run typecheck`, `npm run lint`(기존 경고 5건 유지, 에러 0건), `npm run build` 통과 완료
- PR #8(`feat[room]: AI 독서 토론 피날레 및 도서 큐레이션 연동`) 생성, CI 및 DPYB PR 린터 전체 Pass 확인 후 `develop`에 머지 완료

## 2026-09-16: DPYB 하네스 v2 표준 반영 및 Git pre-commit 훅 설정
- DPYB 조직 표준(`.github/docs/03-vibe-coding-harness.md`) 개정 내용 동기화:
  - `.githooks/pre-commit` 훅 스크립트 추가 (소스 코드 수정 시 `STATE.md` 누락 방지 non-blocking 안내) 및 실행 권한(`chmod +x`) 부여
  - `package.json` scripts에 `"prepare": "git config core.hooksPath .githooks || true"` 추가하여 협업 시 자동 훅 경로 등록
  - 로컬 git 환경 `git config core.hooksPath .githooks` 설정 완료
## 2026-09-17: 사서 토론 UI 버그 수정 및 세로 스크롤 레이아웃 구조 개편
- 작업 브랜치: `fix/debate-layout-persona-name`
- **사서/페르소나 전환 버튼 이름 누락 방어 (`LibrarianChat.jsx`)**:
  - `switchTo` 제안 버튼 텍스트에서 이름이 누락되어 `"로 바꾸기"`로만 노출되던 결함 해결
  - 다단계 안전 fallback 체인(`librarianNames[id]` ➔ `LIBRARIANS` 레지스트리 ➔ `DEBATE_PERSONAS` 레지스트리 ➔ `switchTo.name` / `displayName` ➔ `switchTo.id`) 적용
- **사서 챗봇 세로 무한 확장 방지 및 스크롤 구조 재정립 (`LibrarianChat.jsx`, `LibrarianChat.css`)**:
  - 최상위 컨테이너(`box`): `height: min(700px, calc(100vh - 32px))`, `overflow: hidden`, `display: flex`, `flex-direction: column` 적용하여 뷰포트 하단 밀림 방지
  - 상단 헤더, 모드 탭, 하단 입력 폼에 `flexShrink: 0`을 명시하여 고정 높이 보장
  - 대화 스크롤 영역(`.lc-content-body`)의 `flex: 1 1 auto; min-height: 0; overflow-y: auto` 정상 작동 확보
- **사서 토론 모드 상단 설정 접기/펼치기 아코디언 UX 개선**:
  - 토론 모드 상단 배너(`.lc-debate-banner-clickable`) 클릭 또는 키보드 엔터/스페이스로 도서 셀렉터 및 4인 페르소나 카드 그리드를 접고 펼칠 수 있는 토글 UI 구현
  - 접힌 상태에서도 선택된 페르소나와 도서명이 한 줄 요약(`"🎬 평론가 · 『도서명』"`)으로 표시되어 맥락을 유지하면서 대화 스크롤 가용 영역을 대폭 확대
- `npm run typecheck`, `npm run lint`(기존 경고 5건 유지, 에러 0건), `npm run build` 통과 완료

## 2026-09-17: 장르 매핑 별칭 보강 및 도서 등록 폼 보조 라벨 연동
- **장르 매핑 별칭(`aliases`) 및 한글 라벨 변환 로직 보강 (`genres.js`)**:
  - `GENERAL`(교양): `'교양'`, `'인문교양'`, `'인문/교양'`, `'상식'`, `'잡지'`, `'매거진'`, `'백과사전'`, `'사전'`, `'총류'`, `'총류/교양'` 별칭 체계 구축
  - `PHILOSOPHY`(철학): `'독서법'`, `'글쓰기'`, `'심리'`, `'자기계발'` 등 보강
  - `TECHNOLOGY`(기술과학): `'코딩'`, `'파이썬'`, `'ai'`, `'인공지능'`, `'프로그래밍'`, `'컴퓨터/it'` 등 IT/소프트웨어 키워드 보강
  - `genreLabel()` 함수가 표준 Enum 코드뿐 아니라 국문 텍스트, 세부 주제, 슬래시 복합어 등도 안전하게 감지·변환하도록 fallback 강화
- **도서 등록 폼 내 세부 장르 보존 및 보조 라벨 표시 (`RegisterBook.jsx`)**:
  - `subject`, `displayGenre` 상태 추가 및 AI 추천 도서(`location.state.book`), OCR 도서 검색(`searchBookByIsbn`), 장르 자동 분류(`classifyGenre`) 수신 시 상태 동기화 및 전송 보존
  - `getGenreSubLabel()` 헬퍼 함수 구현: 서버 `displayGenre` 또는 `subject`를 우선 반영하고, `TECHNOLOGY`는 `"기술과학 (컴퓨터/IT)"`, `GENERAL`은 `"교양 (인문교양/상식)"`으로 보조 라벨을 명시
  - 수정 모드(`editing`)의 장르 드롭다운 옵션 및 하단 세부 분야 라벨, 비수정 모드의 컴팩트 뷰에 보조 라벨 통합 반영
- **DTO 및 전역 스토어 연계 (`bookApi.js`, `genreApi.js`, `BooksProvider.jsx`)**:
  - `classifyGenre`: 응답의 `subject`, `display_genre` 필드 추출 반환
  - `createLibraryBook`, `updateLibraryBookMeta`, `addBook`, `saveBookMeta`: `subject` 및 `displayGenre` 파라미터 전달 및 전역 상태 갱신 시 누락 없이 보존
- `npm run typecheck`, `npm run lint`(기존 warning 5건 유지, 에러 0건), `npm run build` 통과 완료

## 2026-09-15: 누디 프로필 이미지 파일명 정규화 + 전역 이미지 저장/복제 방지
- 누디 프로필 이미지: 새로 올린 `public/profile/nudi.JPG`(대문자 확장자)를 소문자
  `nudi.jpg`로 정규화. 코드(`librarians.js`)는 `/profile/nudi.jpg`를 참조하는데 대문자
  파일명은 Windows(대소문자 무시)에선 떠도 CI·프로덕션(Linux, 대소문자 구분)에서 404가
  나므로 실파일을 소문자로 맞춤. (게코는 이미 소문자라 문제 없음)
- 이미지 무단 저장/복제 방지 강화(모든 UI 이미지 대상):
  - `app/main.jsx`: 기존 `<img>` 우클릭 차단을 확장. `contextmenu`를 캡처 단계에서
    가로채 <img>/SVG <image>/<picture>/<canvas>/`.protected-asset`뿐 아니라
    CSS background-image가 실제로 적용된 요소(서재 배경·로그인 배경 등)에서도 차단.
    이미지를 바탕화면으로 끌어 저장하는 경로를 막기 위해 `dragstart`도 캡처 차단
  - `app/index.css`: img/picture/svg/canvas/.protected-asset에 user-drag:none,
    user-select:none, -webkit-touch-callout:none(iOS 롱프레스 저장 메뉴 차단) 추가.
    pointer-events는 건드리지 않아 버튼·링크 클릭은 그대로 동작
  - ⚠️ 완벽한 방지는 불가능(개발자도구·스크린샷 등). 일반적인 우클릭 저장/드래그
    저장/롱프레스 저장 경로를 막는 수준
- 검증: `npx tsc --noEmit` 통과, `npx eslint .` 기존 warning 5건만(0 errors),
  `npm run build` 성공 및 dist/profile에 nudi.jpg(소문자) 포함 확인
- ⚠️ 누디 "내 서재" 테마 배경 이미지(snail2)는 워크스페이스에서 찾지 못해 이번에
  반영하지 못함 — 사용자에게 파일 위치 재확인 요청 예정 (BACKLOG에 남김)

## 2026-09-17: 사서 챗봇 높이 컴팩트 복원, 토론 모드 자동 접힘 및 세션 격리 강화
- 작업 브랜치: `fix/debate-layout-persona-name`
- **챗봇 창 높이 컴팩트 복원 (`LibrarianChat.jsx`)**:
  - `maxHeight: min(420px, calc(100vh - 180px))` 및 `height: auto`로 축소하여 상단 사서 프로필/GNB를 절대 가리지 않고, 본문 내용 길이에 맞춰 유연하게 반응하도록 수정
- **사서 토론 모드 컴팩트 UX 및 피날레 액션 연계 (`LibrarianChat.jsx`, `LibrarianChat.css`)**:
  - 토론 모드 질문 전송 시 도서/4인 카드 설정 영역이 자동으로 100% 접히도록 개선 (`setDebateCollapsed(true)`)
  - 접힌 상태의 상단 한 줄 배너에 `"{아이콘} {토론자명} · 『{도서명}』과 토론 중"` 안내 및 미니 `[🏁 마무리]` 버튼을 탑재하여, 설정을 다시 펼치지 않고도 언제든 즉시 토론 피날레 및 도서 추천을 받을 수 있도록 연결
- **모드별 세션 및 커서 말풍선 실시간 동기화 (`LibrarianChat.jsx`)**:
  - 3개 모드(`library`, `chat`, `debate`) 전환 탭 클릭 시 해당 모드의 독립 답변(`modeAnswers[nextMode]`)을 커서 말풍선(`onAnswer`)에 즉시 반영하여 불일치 및 누적 현상 방지
  - 내 서재 조회 모드 목록 높이(`.lc-library-view`, `.lc-library-list`)도 컴팩트 창에 최적화
- `npm run lint`(기존 warning 5건 유지, 에러 0건), `npm run typecheck` 통과 완료

## 2026-09-17: 메신저형 멀티턴 대화 히스토리 UI 구현 및 토론 모드 내 서재 카드 억제
- 작업 브랜치: `fix/debate-layout-persona-name`
- **메신저형 멀티턴 대화 히스토리 도입 (`LibrarianChat.jsx`, `LibrarianChat.css`)**:
  - 모드별 독립 메시지 배열(`modeMessages: { chat: [], debate: [], library: [] }`) 관리 구조 도입
  - 사용자 질문(`role: 'user'`, 우측 액센트 말풍선)과 사서/토론자 답변(`role: 'assistant'`, 좌측 마크다운 말풍선)이 메신저처럼 순차적으로 쌓이도록 UI 개편
  - 대화 턴이 추가될 때마다 최신 메시지로 자동 부드럽게 스크롤(`messagesEndRef.current.scrollIntoView`) 연동
  - 추천 도서 등록 후 뒤로가기나 새로고침 시에도 대화 히스토리가 유지되도록 `sessionStorage` 동기화 구조 확장
- **토론 모드 내 서재 도서 카드 억제 (`LibrarianChat.jsx`)**:
  - 토론 모드(`chatMode === 'debate'`)에서는 서재에 있는 책이라도 `[📖 내 서재 도서: 책 열기]` 카드를 띄우지 않고, 오직 깊이 있는 도서 토론 및 마무리 추천 도서에만 집중되도록 조건 분기 적용
- `npm run lint`(기존 warning 5건 유지, 에러 0건), `npm run typecheck` 통과 완료

## 2026-09-17: 도움말(?) 아이콘 및 날씨/시간대/무드 태그 상단 고정 바 분리
- 작업 브랜치: `fix/debate-layout-persona-name`
- **도움말(?) 아이콘 최상단 헤더 고정 (`LibrarianChat.jsx`)**:
  - 본문 스크롤 영역에 흩어져 대화가 길어지면 위로 밀려 사라지던 `?` 아이콘을 최상단 헤더(사서명과 ✕ 닫기 버튼 사이)로 고정 배치
  - 마우스 호버 시 현재 활성화된 모드(`chat`, `library`, `debate`)에 맞춘 전용 가이드(추천 질문 팁 / 서재 검색 팁 / 4인 토론 가이드)를 동적으로 분기 노출
- **날씨·시간대·무드 태그 상단 고정 및 모드 분기 (`LibrarianChat.jsx`)**:
  - 본문 내부 스크롤 영역에서 탭 바로 아래 상단 고정 영역(`flexShrink: 0`)으로 이동하여, 대화를 많이 나눠도 날씨/무드 컨텍스트가 항상 시야에 고정 유지되도록 개선
  - 날씨 연계 추천 모드(`chatMode === 'chat'`)에서만 노출하고, 서재 조회나 책 토론 모드에서는 시각적 노이즈를 줄이기 위해 숨김 처리
- `npm run lint`(기존 warning 5건 유지, 에러 0건), `npm run typecheck` 통과 완료

## 2026-09-17: 모든 동물 사서 커서 말풍선 6초 자동 소멸 및 독서 세션 전용 히스토리 테이블 연동
- 작업 브랜치: `fix/debate-layout-persona-name`
- **모든 사서 커서 말풍선 6초 자동 사라짐 구현 (`LibrarianCursor.jsx`, `LibrarianCursor.css`)**:
  - 고양이(블루)뿐만 아니라 황새(슈빌), 누디, 게코 등 모든 사서가 공유하는 `LibrarianCursor`에 `prevBubbleText` 변경 감지 및 6초(`BUBBLE_DURATION_MS = 6000`) 타이머(`useEffect` + `setTimeout`) 연동
  - 새 메시지 수신 시 타이머 자동 리셋 및 CSS 부드러운 등장(`librarian-bubble-fadein`) 트랜지션 적용
- **독서 타이머 전용 세션 API 연동 및 폴백 지원 (`recordApi.js`, `ReadingTimerModal.jsx`)**:
  - 백엔드 신규 스펙인 `POST /api/v1/books/{id}/reading-sessions` 및 `GET /api/v1/books/{id}/reading-sessions`를 우선 호출하고, 미배포 환경에서는 기존 `POST/GET /api/v1/records`로 투명하게 fallback 되도록 `createReadingSession`, `fetchReadingSessions` 구현
  - `ReadingTimerModal`에서 타이머 완료 시 `createReadingSession`을 호출하고 완료 콜백(`onSavedSession`)을 트리거
- **문장수집과 분리된 도서 상세 독서 타이머 세션 전용 UI 구축 (`BookDetail.jsx`, `ReadingSessionHistory.jsx`, `ReadingSessionHistory.css`)**:
  - 도서 상세(`BookDetail`) 우측 패널에 `[ 📸 수집한 문장 | ⏱️ 독서 타이머 기록 ]` 탭 전환 헤더 추가
  - `ReadingSessionHistory` 컴포넌트:
    - 상단 누적 통계 바 (총 집중 시간, 완료한 세션 횟수, 미니 [⏱️ 타이머 시작] 버튼)
    - 독서 세션 히스토리 테이블 (일시 & 날씨 배지, 집중 시간 뱃지, 도달 페이지, 감상 메모/생각)
    - 빈 상태(Empty State) 시 타이머 시작 유도 CTA 버튼 제공
  - 타이머 모달에서 저장 완료 시 우측 탭이 자동으로 `⏱️ 독서 타이머 기록`으로 전환되고 목록이 실시간 갱신되도록 연계
- `npx tsc --noEmit` 통과, `npm run lint`(기존 warning 5건 유지, 에러 0건), `npm run build` 번들 검증 완료

## 2026-09-17: 독서 진행률 1% 이상 도서의 '시작전' 상태 불일치 해결
- 작업 브랜치: `fix/debate-layout-persona-name`
- **상태 변환기 자동 승격 로직 도입 (`bookApi.js`)**:
  - `toKoreanStatus(readingStatus, progress = 0)`: 코어 서버 DB에 아직 `PLANNED`로 남아 있더라도, `progress > 0`인 경우 화면상에서 자연스럽게 `'읽는 중'`으로 승격하도록 안전 장치 적용
- **전역 스토어 및 카드 렌더링 연동 (`BooksProvider.jsx`, `LibrarianChat.jsx`)**:
  - `toFrontBook`: 서버 목록 응답 변환 시 `summary.progress`를 함께 전달하여 `status`가 실시간으로 `'읽는 중'`으로 정규화되도록 반영
  - `saveReadingProgress`: 진행률 갱신 시 `res.progress > 0`이고 기존 상태가 `'시작전'`이면 전역 상태도 즉시 `'읽는 중'`으로 동기화
  - `LibrarianChat`: 내 서재 추천 카드 렌더링 시 `b.progress`를 전달하여 `[시작전 · 1%]` 대신 `[읽는 중 · 1%]`로 정확히 표기
- **타이머 및 도서 상세 저장 시 서버 메타데이터 동기화 (`ReadingTimerModal.jsx`, `BookDetail.jsx`)**:
  - `ReadingTimerModal`: 타이머 종료 후 1쪽 이상 저장(`pageNum > 0`) 시 서버 도서 상태도 `READING`(읽는 중)으로 명시적 승격 저장 호출
  - `BookDetail`: 현재 페이지 입력 저장(`cur > 0`) 시 서버 메타데이터의 `readingStatus`를 `READING`으로 함께 동기화
- `npx tsc --noEmit` 통과, `npm run lint`(기존 warning 5건 유지, 에러 0건), `npm run build` 번들 검증 완료

## 2026-09-17: AI 백엔드 월간 독서 리포트 스키마 정규화 및 실데이터 연동
- 작업 브랜치: `fix/report-schema-adapter`
- **백엔드 DTO ↔ 프론트엔드 UI 정규화 어댑터 도입 (`reportApi.js`)**:
  - AI 에이전트 백엔드(`backend-ai-agent`)의 `MonthlyReportResponse` Pydantic DTO 스키마와 프론트엔드 UI 기대 규격 간의 필드명/데이터 형태 불일치 해결
  - `normalizeMonthlyReport(raw)` 어댑터 함수 신설:
    - 01. 개요: `completedBooksCount` ➔ `completedCount`, `totalPagesRead` ➔ `totalPages`, `longestStreakDays` ➔ `streakDays`
    - 02. 습관: 객체 맵(`weekdayDistribution`, `timeDistribution`, `weatherDistribution`)을 프론트엔드 차트용 배열(`dayOfWeek`, `timeOfDay`, `weather`)로 매핑 변환
    - 03. 취향: `topGenres`, `topSubjects`, `debateKeywords` 추출 결합
    - 04. 밸런스: 다양성 점수(`diversityScore`), 주 장르 및 분석 텍스트 매핑
    - 05. 흔적: `featuredRecords`(문장 수집 스니펫) 및 `mostScrappedBooks`를 인용구 카드로 자동 가공
    - 06. 사서 관찰기: AI 심층 요약문(`summary`), 독서가 유형(`readerType`), 핵심 특성 태그(`keyTraits`) 보존
    - 07. 독서 처방: `recommendedBooks` 정식 서지정보 및 `advice` 조언 연계
  - `fetchMonthlyReport`에서 백엔드 호출 직후 `normalizeMonthlyReport`를 거쳐 반환하도록 연동
- **리포트 화면 실데이터 렌더링 및 UI 강화 (`MonthlyReport.jsx`, `MonthlyReport.css`)**:
  - 06번 사서 관찰기 섹션: AI가 분석한 독서가 유형 배지(`✨ 독서가 유형: 사색하는 몰입형 독서가`) 및 핵심 성향 태그(`keyTraits` 칩) 렌더링 추가
  - 07번 다음 달 독서 처방 섹션: 사서의 실시간 조언(`advice`) 배너 및 추천 도서 장르 태그(`genre`) 렌더링 추가
- `npx tsc --noEmit` 통과, `npm run lint`(기존 warning 5건 유지, 에러 0건), `npm run build` 번들 검증 완료

## 2026-09-17: 독서 타이머 60초 미만 시간 표기 정밀도 개선 및 백엔드 PR #13 연동
- 작업 브랜치: `fix/reading-session-duration-precision`
- **시간 포맷팅 유틸 신설 (`app/lib/timeFormat.js`)**:
  - `formatDuration(seconds, fallbackMinutes)`: 백엔드 정밀도 패치(PR #13)에 따라 `durationSeconds`를 우선 참조하여 60초 미만은 초 단위(`${seconds}초`), 60초 이상은 분/초(`${mins}분` 또는 `${mins}분 ${remainSecs}초`)로 자연스럽게 분기
  - `formatTotalReadingTime(totalMinutes)`: 누적 독서 시간을 시간 및 분(`X시간 Y분`, `X분`)으로 포맷팅
- **API 레이어 정밀도 보존 및 기본 메모 반영 (`app/api/recordApi.js`)**:
  - `createReadingSession`: `duration_seconds: durationSeconds`, `duration_minutes: Math.floor(durationSeconds / 60)`로 백엔드 전달, 기본 메모도 `formatDuration` 기반으로 `⏱️ 13초 독서 세션` 등으로 생성
  - `fetchReadingSessions`: 서버 응답의 `duration_seconds`/`durationSeconds`, `duration_minutes`/`durationMinutes` 누락 없이 정규화
- **독서 세션 히스토리 UI 및 타이머 모달 연동 (`ReadingSessionHistory.jsx`, `ReadingTimerModal.jsx`)**:
  - 세션 테이블 집중 시간 배지: `formatDuration(s.durationSeconds ?? s.duration, s.durationMinutes)` 적용
  - 상단 통계 바: 1분 미만 세션만 존재할 때도 `13초` 등으로 정확히 표현
  - 독서 타이머 모달: 완료 저장 기본 메모에 초 단위 정확도 반영
- `npx tsc --noEmit` 통과, `npm run lint`(기존 warning 5건 유지, 에러 0건), `npm run build` 번들 검증 완료

## 2026-09-17: 월간 독서 리포트 Recharts 시각화 업그레이드 & 날씨 도서 1:1 매핑 & 원본 비교 토글
- 작업 브랜치: `feat/report-recharts-visualization`
- **Recharts 라이브러리 도입 및 차트 시각화 구현 (`MonthlyReport.jsx`, `MonthlyReport.css`)**:
  - **02 독서 리듬**: 기존 가로형 막대그래프 대신 월요일~일요일 주간 독서 빈도를 부드러운 곡선(`LineChart` type="monotone")으로 연결. 테마 Accent 포인트 닷과 호버 툴팁 적용.
  - **03 나의 독서 취향**: 파스텔톤 도넛 차트(`PieChart` innerRadius/outerRadius) 구현. 도넛 정중앙에 1위 장르 명칭과 점유율(예: "문학 38%")을 굵은 타이포그래피 오버레이로 배치하고 범례 연동.
  - **06 날씨와 책**: 단순 텍스트 통계를 걷어내고, 날씨 아이콘(☀️, 🌧️, ☁️) + 백엔드 조인 베스트 도서 표지(교보문고 CDN) + 도서명/저자/인용구가 1:1 매칭되는 감성적 Grid 카드 레이아웃 구현.
- **원본 보존 및 실시간 비교 토글 스위치 제공**:
  - 상단 액션 바에 `[↩️ 원본 막대 뷰로 보기 / 📊 Recharts 시각화 뷰로 보기]` 토글 버튼 추가. 언제든 원본 막대 뷰와 신규 Recharts 뷰를 번갈아 확인하고 비교할 수 있도록 구현.
  - 원본 파일은 `MonthlyReport.legacy.jsx`, `MonthlyReport.legacy.css`로 안전하게 백업 보존.
- **API 및 데이터 정규화 레이어 확장 (`reportApi.js`)**:
  - `genreStats` 및 `weatherBooks` 필드 정규화 추가. 백엔드 실데이터 연동과 견본 데이터 스마트 병합 지원.
## 2026-09-17: 사서별(블루/슈빌/누디/게코) 대화 세션 및 말풍선 도화지 분리 격리
- 작업 브랜치: `feat/librarian-chat-session-isolation`
- **사서별 메시지 히스토리 도화지 및 세션 ID 분리 (`LibrarianChat.jsx`, `librarianStore.js`, `LibraryScene.jsx`)**:
  - `loadSavedChatSessionByLibrarian(librarianId)`, `saveChatSessionByLibrarian(librarianId, data)` 신설:
    - `sessionStorage` 키를 `myReadingRoom.chatSession.{librarianId}`로 세분화하여 사서별 독립 대화 히스토리 및 `sessionId` 보존.
  - 사서 전환 시(`librarian.id` 변경 감지 `useEffect`):
    - 이전 사서의 마지막 말풍선/질문이 새 사서 창에 잔류하지 않고 즉시 격리.
    - 해당 사서와 이전에 나눈 대화 기록이 있으면 복원하고, 첫 만남이면 깨끗한 빈 캔버스로 초기화.
    - 커서 말풍선(`LibraryScene.jsx`)도 해당 사서의 마지막 응답 상태로 함께 실시간 동기화.
  - `chatSessionId`가 사서별로 독립 유지되므로, 고양이와의 대화 컨텍스트가 슈빌·누디·게코의 LLM 프롬프트에 섞여 말투가 오염되는 현상 원천 차단.
- **인라인 강제 스위칭 버튼 정돈 및 안내 팁 메시지화**:
  - 특정 장르 질문 시 대화창 내부에서 맥락을 꼬이게 하던 `[OO로 바꾸기]` 강제 버튼을 제거.
  - "이 장르는 OO 사서가 더 깊이 있게 추천할 수 있어요. 상단 프로필에서 언제든 사서를 변경해 보세요!" 형태의 친절한 팁 안내 배너로 변경하여 사용자가 주도적으로 사서를 선택하도록 UX 정돈.
- `npx tsc --noEmit` 통과, `npm run lint`(기존 warning 6건 유지, 에러 0건), `npm run build` 번들 검증 완료.

## 2026-09-16: 누디 3D 서재 커서 적용 (좌클릭 2초 모션)
- `public/cursors/nudi/{nudi_01,nudi_02}.png`(사용자 업로드, 각 11~13KB)를 기존 cat/stork와
  동일한 `public/cursors/<id>/` 구조로 배치 확인. 용량이 이미 작아 webp 변환 없이 그대로 적용
  (요청에 따라 이번엔 포맷 변경 없이 반영만 함 — 최종 이미지 교체 예정)
- `app/data/librarians.js`: 누디에 `image`(nudi_01, 기본)·`imageHover`(nudi_02, 클릭 모션)·
  `clickMotionMs: 2000`·`tip`/`tipHover` 필드 추가
- `app/features/room/LibrarianCursor.jsx`: 기존 cat/stork는 "책 선택 중"에만 모션 이미지로
  바뀌는데(active prop, CLIAR-239), 누디는 요청대로 **좌클릭할 때마다 2초간 모션 이미지로
  전환됐다가 자동으로 기본 이미지로 복귀**하는 별도 로직을 추가:
  - `librarian.clickMotionMs`가 있으면(누디만 해당) window `mousedown`(좌클릭)을 구독해
    `imageHover`로 전환 후 `clickMotionMs` 뒤 자동 복귀하는 타이머 방식
  - 없는 사서(블루/슈빌)는 기존 `active` prop 방식 그대로 유지 — 회귀 없음
  - 사서 전환 시 클릭 모션 상태가 남지 않도록 렌더 중 동기화로 리셋(setState-in-effect
    lint 경고 회피, 기존 bubbleText 리셋과 같은 패턴)
- ⚠️ `tip`/`tipHover` 좌표는 800x800 원본 기준 추정치(코 위치)로 넣었음 — 실측 좌표가 아니라
  실제 화면에서 커서 포인터 위치가 살짝 어긋날 수 있음. 필요 시 조정 필요
- `npx eslint .`(기존 warning 5건만 유지, 신규 0), `npx tsc --noEmit`, `npm run build` 통과 확인

## 2026-09-16: 게코 3D 서재 커서 적용 (챗봇 답변 대기 중 thinking 이미지)
- 게코 커서 이미지 2장 적용. 원본 PNG가 각 ~500KB(800x1200)로 커서용으로 과해,
  ImageMagick으로 동일 해상도(800x1200) webp로 변환해 용량을 1/5로 줄임
  (gecko_01: 497KB→110KB, gecko_thinking: 476KB→104KB). 원본 PNG는 삭제.
  (누디 커서는 11~13KB라 그대로 뒀지만, 게코는 커서로 쓰기엔 무거워 변환)
- `app/data/librarians.js`: 게코에 `image`(gecko_01, 기본)·`thinkingImage`(gecko_thinking)·
  `tip` 필드 추가. 다른 사서의 imageHover(책 선택/클릭 모션)와 용도가 달라 thinking 전용
  필드(thinkingImage)를 신설
- 답변 대기 상태 전달 경로 신설:
  - `LibrarianChat.jsx`: 기존 내부 `loading` 상태를 `onLoadingChange(loading)` 콜백으로
    부모에 전달(useEffect)
  - `LibraryScene.jsx`: `chatLoading` 상태를 두고 `onLoadingChange`로 받아
    `LibrarianCursor`에 `thinking` prop으로 전달
  - `LibrarianCursor.jsx`: `thinking && librarian.thinkingImage`면 대기 이미지 표시,
    답변이 오면(thinking=false) 기본 이미지로 복귀. 표시 우선순위는
    대기(thinking) > 활성/클릭모션 > 기본
- 이미지 결정 로직을 삼항 중첩에서 if/else로 풀어 우선순위를 명확히 함
- ⚠️ 게코 `tip` 좌표는 800x1200 원본 기준 얼굴 부근 추정치 — 실측 아님. 화면 확인 후 조정 필요
- `npx eslint .`(기존 warning 5건만, 신규 0), `npx tsc --noEmit`, `npm run build` 통과 및
  dist/cursors/gecko에 webp 2장 포함 확인

## 2026-09-17: 사서 세션 캐시 격리 누수 수정 및 발신자 메타데이터 보존 (다중 인격 버그 영구 해소)
- 작업 브랜치: `feat/librarian-chat-session-isolation`
- **스토어 공용 키 Fallback 제거 (`app/store/librarianStore.js`)**:
  - `loadSavedChatSessionByLibrarian(librarianId)`에서 특정 사서의 데이터가 없을 때 공용 키(`myReadingRoom.chatSession`)로 떨어지며 블루의 대화 내역이 새 사서 창에 복사되던 문제 완전 제거 (데이터 없으면 정직하게 `null` 반환).
  - `saveChatSessionByLibrarian`도 공용 키를 오염시키지 않고 해당 사서 전용 키에만 저장하도록 격리.
- **메시지 발신자 메타데이터 보존 (`app/features/room/LibrarianChat.jsx`)**:
  - 메시지 생성 시점의 `senderIcon`과 `senderName`을 메시지 객체에 영구 박제하여, 현재 활성화된 사서 탭과 무관하게 발신자 이름표가 왜곡 없이 올바르게 렌더링되도록 수정.
- **검증**:
  - `npx tsc --noEmit` 통과
  - `npm run lint` 통과 (에러 0건)
  - `npm run build` 번들 빌드 정상 통과

## 2026-09-17: 사서 프로필 페이지 UI 정리
- 게코 한 줄 소개 줄바꿈 위치 수정: 데이터에 `\n`을 넣어 "…연결하는" 다음에서 항상
  줄바꿈되도록 함(기존엔 자연 줄바꿈으로 "탐구자"가 "탐/구자"로 잘림). CSS는
  `.lp-oneliner`에 `white-space: pre-line` 추가해 렌더링
- 카드 내부 수평 정렬 문제 해결: 한 줄 소개·특화 장르·페르소나 문장이 사서마다
  줄바꿈 수가 달라 그 아래 구분선(성격·독서 성향 보기)·문장·버튼 위치가 카드마다
  어긋났던 문제. `.lp-oneliner`/`.lp-meta-row--genre dd`/`.lp-catchphrase`에
  `min-height`(최대 예상 줄수 기준)를 부여해 4개 카드가 항상 수평으로 맞춰지게 함
- "이름 수정" 버튼 → "수정"으로 문구 축약
- 상단 안내 문구를 "사서를 고르고, 나만의 서재를 만들어보세요.🐾"로 교체
- 변경 파일: `app/data/librarians.js`(게코 oneLiner에 개행 추가),
  `app/pages/LibrarianProfiles.jsx`(버튼 문구·상단 안내·genre row 클래스 추가),
  `app/pages/LibrarianProfiles.css`(정렬용 min-height, pre-line)
- `npx eslint .`(신규 이슈 0), `npx tsc --noEmit`, `npm run build` 통과 확인

## 2026-09-18: 게코 클릭 모션을 animated webp 단일 파일로 통일 + 슈빌 클릭 이슈 수정
- **게코**: 클릭 모션 이미지가 `gecko_02.png`(포즈 전환)·`gecko_03.png`(손 인사) 2장으로
  분리돼 있어 누디(기본 1장+클릭 1장 구조)와 불일치했음. ImageMagick으로 2프레임
  애니메이션 webp 한 장(`gecko_hover.webp`, 91KB)으로 합쳐 구조를 통일:
  - 프레임 지속시간: gecko_02 0.5초 → gecko_03 1.5초(총 2초, 마지막 프레임에서 정지,
    `-loop 1`). `app/data/librarians.js`의 `clickMotionMs: 2000`을 애니메이션 총
    재생시간과 동일하게 맞춰 정확히 끝나는 시점에 기본 이미지(gecko_01)로 복귀
  - 원본 `gecko_02.png`/`gecko_03.png`는 webp로 합친 뒤 삭제 (재작업 중 실수로 두 파일이
    동일 파일로 겹쳐 올라온 적이 있어, 재업로드 후 SHA-256 해시로 실제로 다른 두 포즈인지
    확인하고 프레임 순서까지 시각 검증 완료)
- **슈빌**: 사용자가 "예전엔 hover 방식이었는데 클릭으로 바꿨더니 잘 안 트리거된다"고
  전달한 문제의 원인 확인 — `imageHover`가 여전히 `active` prop(=책 선택 중 상태,
  CLIAR-239)에만 반응하도록 남아 있어 실제 마우스 좌클릭과는 무관했음. 누디/게코와
  동일한 `clickMotionMs`(1200ms) 방식으로 통일해 좌클릭 시 `stork_hover.webp`
  (날개 펄럭임, 총 재생시간 1.16초)가 재생되고 자동 복귀하도록 수정
- 변경 파일: `app/data/librarians.js`(게코 imageHover/clickMotionMs/tipHover 추가,
  슈빌 clickMotionMs 추가), `public/cursors/gecko/gecko_hover.webp`(신규),
  `public/cursors/gecko/{gecko_02,gecko_03}.png`(삭제, webp로 합쳐짐)
- `LibrarianCursor.jsx`는 이미 `clickMotionMs` 유무로 분기하는 범용 로직이라 코드
  수정 없이 데이터만 추가해 두 사서 모두 적용됨
- `npx eslint .`(기존 warning 6건 유지, 신규 0), `npx tsc --noEmit`, `npm run build`
  통과 및 dist/cursors/{gecko,stork}에 산출물 포함 확인

## 2026-09-19: 블루(cat) 커서 클릭 모션을 누디와 동일한 방식으로 통일
- 블루도 슈빌과 같은 문제였음 — `imageHover`(cat_04)가 "책 선택 중"(active prop,
  CLIAR-239)에만 반응해 실제 좌클릭과는 무관했음. 사용자가 "누디와 동일하게"로
  명시해 요청, 누디와 동일한 `clickMotionMs`(2000ms) 방식으로 통일
- `app/data/librarians.js`: 블루에 `clickMotionMs: 2000` 추가 (기존 `image`/
  `imageHover`/`tip`/`tipHover`는 그대로 재사용, 신규 에셋 불필요)
- 이제 4개 사서(블루/누디/게코/슈빌) 모두 `clickMotionMs` 방식으로 통일 완료 —
  더 이상 `active` prop 기반의 구식 hover 방식을 쓰는 사서 없음
- `LibrarianCursor.jsx`는 이미 `clickMotionMs` 유무로 분기하는 범용 로직이라
  코드 수정 없이 데이터만 추가
- `npx eslint .`(신규 이슈 0), `npx tsc --noEmit`, `npm run build` 통과 확인
