# ARCHITECTURE (현재 상태)

이 문서는 지금 시점의 실제 기술 스택·구조·컨벤션만 담는다. 결정 이유는 `DECISIONS.md`, 진행 상황은 `STATE.md`를 본다.

## 기술 스택
- **프레임워크**: React 19, Vite 8
- **언어**: JavaScript (ES2022) + TypeScript (점진적 적용)
- **3D 그래픽**: Three.js, `@react-three/fiber`, `@react-three/drei`
- **라우팅**: React Router 7 (`react-router-dom`)
- **OCR**: `tesseract.js` (브라우저 클라이언트 사이드 Web Worker)
- **상태 관리**: React Context + Provider (`AuthProvider`, `BooksProvider`, `LibrarianProvider`, `ThemeProvider`)

## 저장소 구조
```text
frontend-reader-web/
├── app/                      # 애플리케이션 소스 루트
│   ├── api/                  # 백엔드 연동 클라이언트 (core-api, ai-agent)
│   ├── components/           # 공통 컴포넌트 (Gnb, ProtectedRoute 등)
│   ├── data/                 # 정적 데이터 (librarians, genres)
│   ├── features/             # 도메인 피처 (3D 서재, 사서 챗봇, OCR 등록)
│   ├── pages/                # 라우트 단위 페이지
│   ├── store/                # 전역 Context Provider 및 스토어
│   └── styles/               # 전역 스타일 및 테마 정의
├── public/                   # 정적 자산 (보호 대상 일러스트, 폰트, 커서)
├── .harness/                 # DPYB 바이브 코딩 하네스 문서
├── .github/                  # CI/CD 및 컨벤션 검증 워크플로우
├── ASSETS_LICENSE.md         # 시각 에셋 독점 저작권 라이선스
├── index.html                # 엔트리 HTML
├── vite.config.js            # Vite 번들러 및 듀얼 백엔드 프록시 설정
└── tsconfig.json             # TypeScript 컴파일러 설정
```

## 이 레포 고유 정책
- **시각 에셋 저작권 보호**: 모든 UI 이미지 및 일러스트는 Clia Lim 님의 독점 저작물로 보호되며, CSS 드래그 방지 및 JS 우클릭 방지가 적용되어 있습니다.
- **듀얼 백엔드 라우팅**:
  - `MAIN_BACKEND_URL`: `backend-core-api` (회원/인증, 서재 도서 CRUD, OCR 등)
  - `AI_BACKEND_URL`: `backend-ai-agent` (사서 채팅 `/api/v1/chat`, 추천 장르 `/api/v1/classify-genre`)
- **점진적 TS 마이그레이션**: 신규 기능 및 수정 모듈부터 `.ts`/`.tsx`로 전환하며 `npm run typecheck`로 무결성을 유지합니다.
