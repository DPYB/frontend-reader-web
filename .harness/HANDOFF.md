# HANDOFF (세션별 서술 로그, append-only)

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

**다음 세션 시작 시 후보**:
1. **점진적 TypeScript 마이그레이션 착수** (`.harness/PLAN.md:9-12` 마일스톤)
   - `app/types/` 신설 및 핵심 모델(book, librarian, chat, report) 정의
   - `app/api/` 백엔드 연동 클라이언트 TS 전환
2. **누디 · 게코 신규 사서 3D 서재 테마 및 레이아웃 연동** (`.harness/BACKLOG.md:10` 과제)
   - `LibraryScene.jsx` 조명/글로우 테마 및 `shelfLayout.js` 카메라 뷰포트/책장 좌표 분기


