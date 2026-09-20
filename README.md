# frontend-reader-web

귀여운 동물 사서가 큐레이션 해주는 나만의 가상 서재 **Don't Paw-get Your Book** 클라이언트 (Web)

3D 서재에 내 책을 꽂아두고, 사서 캐릭터(고양이 블루 / 황새 슈빌)와 대화하며 날씨·시간대·기분에 맞는 책을 추천받는 웹 애플리케이션입니다.

---

## 목차

- [주요 기능](#주요-기능)
- [기술 스택](#기술-스택)
- [시작하기](#시작하기)
- [프로젝트 구조](#프로젝트-구조)
- [백엔드 연동](#백엔드-연동)
- [상태 관리](#상태-관리)
- [라우팅](#라우팅)
- [개발 규칙](#개발-규칙)
- [관련 저장소](#관련-저장소)
- [라이선스 / 저작권](#라이선스--저작권)

---

## 주요 기능

| 기능 | 설명 |
|---|---|
| 3D 내 서재 | React Three Fiber로 렌더링한 책장에 등록한 책이 꽂힘. 책 클릭 시 상세/수정/삭제 |
| 사서 채팅 | 오케스트레이터에 스트리밍 요청. 날씨·무드 뱃지, 사서 전환 제안, 추천 도서 바로 등록 |
| 사서 캐릭터 | 마우스를 따라다니는 사서 커서(책 위 호버 시 모션 전환), 사서별 테마 컬러 |
| 라이트/다크 모드 | 다크 모드는 손전등 효과(커서 주변만 밝게) |
| 인증 | 회원가입·이메일 인증·로그인·비밀번호 찾기/재설정/변경·회원 탈퇴 |
| 책 등록 | 표지 촬영/업로드 → OCR로 제목·저자 인식 → 색상·두께 지정 후 등록 |
| 문장 수집 | 책 페이지 촬영 → OCR로 문장 추출 → 메모·페이지와 함께 스크랩 |

## 기술 스택

| 구분 | 사용 기술 |
|---|---|
| 프레임워크 | React 19, Vite 8 |
| 언어 | JavaScript, TypeScript (점진적 적용) |
| 라우팅 | React Router 7 |
| 3D | Three.js, @react-three/fiber, @react-three/drei |
| OCR | tesseract.js (브라우저 내 인식) |
| 개발 도구 | leva(3D 배치 캘리브레이션), ESLint 10, TypeScript |
| 상태 관리 | React Context + Provider (별도 상태 라이브러리 없음) |

## 시작하기

### 요구 사항

- Node.js 20 이상
- npm

### 설치 및 실행

```bash
npm install
npm run dev
```

기본 주소는 `http://localhost:5173` 입니다.

### 스크립트

| 명령 | 설명 |
|---|---|
| `npm run dev` | 개발 서버 실행 (HMR) |
| `npm run build` | 프로덕션 빌드 (`dist/`) |
| `npm run typecheck` | TypeScript 타입 검사 (`tsc --noEmit`) |
| `npm run lint` | ESLint 검사 |
| `npm run preview` | 빌드 결과 로컬 확인 |

> 커밋 전에 `npm run build`, `npm run typecheck`, `npm run lint`를 실행해 주세요.

### 로컬 백엔드 연동

개발 서버는 `/api` 요청을 로컬 백엔드로 프록시합니다 (`vite.config.js`).

```
/api/*  →  http://127.0.0.1:8000
```

`localhost` 대신 `127.0.0.1`을 명시한 이유는, Node가 IPv6(`::1`)를 우선 해석해
IPv4에만 바인딩하는 uvicorn 기본 설정과 어긋나 `ECONNREFUSED`가 발생하기 때문입니다.

## 프로젝트 구조

```text
frontend-reader-web/
├── public/                   # 정적 자산
│   └── cursors/              # 사서 커서 이미지 (cat/, stork/)
├── app/                      # 애플리케이션 소스 루트
│   ├── api/                  # 백엔드 API 클라이언트
│   │   ├── authApi.js        # backend-auth + 토큰 인프라(authFetch)
│   │   ├── bookApi.js        # backend-book 서재/문장수집
│   │   ├── chatApi.js        # discovery 사서 채팅(스트리밍)
│   │   └── geolocation.js
│   ├── components/           # 공통 컴포넌트 (Gnb, ProtectedRoute 등)
│   ├── data/                 # 정적 데이터 (librarians, genres)
│   ├── features/
│   │   ├── bookshelf3d/      # 3D 책 모델
│   │   ├── register/         # 책 등록(OCR 유틸)
│   │   └── room/             # 서재 씬, 사서 채팅/커서, 책 상세, 문장 수집
│   ├── pages/                # 라우트 단위 화면
│   ├── store/                # Context Provider + 스토어
│   └── styles/
├── docs/                     # 연동 및 개발 가이드 문서
├── index.html                # 엔트리 HTML
├── vite.config.js            # Vite 빌드 및 프록시 설정
├── tsconfig.json             # TypeScript 설정
└── package.json
```

## 백엔드 연동

백엔드는 두 서비스로 나뉘어 있고, 프론트는 경로별로 알맞은 서비스를 직접 호출합니다.

| 경로 | 서비스 | 담당 |
|---|---|---|
| `/api/v1/auth/*`, `/api/v1/users/*`, `/api/v1/terms`, `/api/v1/books/*`, `/api/v1/library/*`, `/api/v1/librarians*` | **backend-core-api** | 인증, 회원 정보, 약관, 서재 도서 CRUD, 문장 수집(scrap) |
| `/api/v1/chat`, `/api/v1/classify-genre`, `/api/v1/reports/*`, `/api/v1/ocr/*`, `/api/v1/vision/*` | **backend-ai-agent** | 사서 채팅/추천, 장르 분류, 월간 리포트, 이미지 OCR |

### API base URL

```js
// app/api/apiBase.js
export const CORE_API_BASE = import.meta.env.VITE_CORE_API_BASE_URL || '/api/v1';
export const AI_API_BASE = import.meta.env.VITE_AI_API_BASE_URL || '/api/v1';
```

- **로컬**: 환경변수 없이 상대 경로 → Vite 프록시(`vite.config.js`)가 경로별로 알맞은 로컬 백엔드로 전달
- **배포(Cloudflare Pages 등 정적 호스팅)**: 정적 파일만 서빙하므로 빌드 타임에 두 백엔드의
  절대 URL을 각각 주입해야 합니다. `authFetch`(`app/api/authApi.js`)는 기본이
  `CORE_API_BASE`이고, `backend-ai-agent`로 보내야 하는 호출(`chatApi.js`, `genreApi.js`,
  `reportApi.js`, `recordApi.js`의 OCR 함수)은 `authFetch(path, { baseUrl: AI_API_BASE })`로
  오버라이드합니다.
- 두 백엔드가 다른 도메인이면 Refresh Token(HttpOnly 쿠키)이 서드파티 쿠키로 취급되어
  브라우저가 차단할 수 있습니다. `credentials: 'include'`로 전송은 하지만, 브라우저의
  서드파티 쿠키 정책에 따라 동작이 달라질 수 있으니 실제 배포 후 로그인 유지 여부를 확인하세요.

### 인증 방식

- **Access Token**: 메모리에만 보관 (localStorage 저장하지 않음)
- **Refresh Token**: 백엔드가 HttpOnly 쿠키로 관리 (JS 접근 불가)
- 인증 요청은 `credentials: 'include'`로 쿠키를 함께 전송
- `401` 응답 시 `/auth/refresh`로 1회 갱신 후 원 요청을 재시도하고, 갱신도 실패하면 세션 만료 처리
- 이 로직은 `authApi.js`의 `authFetch`에 있으며, `bookApi.js`도 이를 재사용

## 상태 관리

별도 라이브러리 없이 Context + Provider로 구성합니다. 중첩 순서는 `App.jsx` 기준입니다.

```text
AuthProvider          # member, status(loading|authenticated|unauthenticated), login/logout
└── ThemeProvider     # light | dark (data-theme 속성 + localStorage)
    └── LibrarianProvider   # 활성 사서, 사용자 지정 사서 이름
        └── BooksProvider   # 서재 도서 목록(backend-book), 문장 수집
```

각 스토어는 Context 정의(`*Store.js`)와 Provider 구현(`*Provider.jsx`)을 분리해,
Fast Refresh가 깨지지 않게 하고 훅만 가볍게 import할 수 있도록 했습니다.

`BooksProvider`는 로그인 시 서버에서 도서 목록을 불러오고 로그아웃 시 비웁니다.
도서의 색상·두께 등 렌더링용 값은 백엔드가 저장하지 않아 `bookVisuals.js`가
`bookId`별로 로컬에 보관합니다(값이 없으면 `bookId` 해시로 결정론적 기본값 생성).

## 라우팅

| 경로 | 화면 | 인증 |
|---|---|---|
| `/login` | 로그인 | 불필요 |
| `/signup` | 회원가입 + 이메일 인증 | 불필요 |
| `/password/forgot` | 비밀번호 찾기·재설정 | 불필요 |
| `/library` | 내 서재 (3D) | 필요 |
| `/register` | 책 등록 | 필요 |
| `/mypage` | 마이페이지 | 필요 |
| `/librarians` | 사서 프로필 | 필요 |

인증이 필요한 화면은 `ProtectedRoute`로 감싸고, 비로그인 시 `/login`으로 이동합니다.
알 수 없는 경로는 `/library`로 리다이렉트합니다.

## 개발 규칙

### 브랜치

- `main`: 배포 / `develop`: 통합
- 작업 브랜치는 `develop`에서 분기하고, PR의 base도 `develop`
- `main`에 직접 커밋하지 않으며, 머지는 squash 후 브랜치를 삭제

### 커밋 메시지

```text
<type>[(scope)]: 명사형 제목
```

- `type`: `feat`, `fix`, `docs`, `refactor`, `chore`, `test`, `style`
- 제목은 한국어 명사형, 마침표 없이 작성
- 본문에는 변경 내역과 판단 근거를 정리

### 검증

커밋 전에 아래를 실행합니다.

```bash
npm run build
npm run typecheck
npm run lint
```

## 관련 저장소

| 저장소 | 역할 |
|---|---|
| `backend-auth` | 인증(Cognito 연동), 회원, 약관 |
| `backend-book` | 서재 도서 CRUD, 책장, 문장 수집 |
| `backend-discovery` | 오케스트레이터, 도서 추천 에이전트 |
| `backend-librarian` | 사서 페르소나, 날씨·무드 시그널 |
| `backend-record` | 이미지 OCR |
| `infra` | 관측 스택(Prometheus/Grafana/Loki), RCA Agent |

## 라이선스 / 저작권

이 프로젝트에 사용된 **UI 이미지·버튼·일러스트 등 모든 시각 에셋**은 [Clia Lim](https://github.com/clialim)이 직접 제작한 창작물입니다.

> **© 2026 Clia Lim. All Rights Reserved.**

- **대상**: `my-reading-room/public/`의 이미지 에셋(`button/`, `room/`, `profile/`, `cursors/`, `Input_field/`, 로고 등)과 `design-src/`의 원본 디자인 파일
- 저작권자의 사전 서면 허락 없이 **복제·재배포·2차 가공(수정·파생물 제작)·상업적 이용을 금지**합니다.
- 문의·이용 허락: [github.com/clialim](https://github.com/clialim)

폰트 등 서드파티 리소스는 각 제작자의 라이선스를 따릅니다.
소스 코드의 저작권/라이선스는 시각 에셋과 별개이며, 팀 프로젝트 정책을 따릅니다.
