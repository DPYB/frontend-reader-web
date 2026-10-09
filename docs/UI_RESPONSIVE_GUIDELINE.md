# 📱 DPYB 디스플레이 규격별 UI/UX 가이드라인

> **버전**: v1.0.0  
> **적용 대상**: `frontend-reader-web` (DPYB 독서 플랫폼 프론트엔드)  
> **핵심 정책**: **Desktop/Laptop (마우스/키보드 환경)** vs **Mobile & Tablet (스마트폰부터 대형 태블릿까지 터치 디바이스 공통 통합 UX)**

---

## 1. 개요 및 설계 철학 (Overview & Philosophy)

DPYB 독서 플랫폼은 사용자 환경을 크게 두 가지 인터랙션 패러다임으로 이원화하여 최적의 독서 및 서재 탐색 경험을 제공합니다.

```
                  ┌────────────────────────────────────────────────────────┐
                  │                    DPYB 사용자 접속                    │
                  └───────────────────────────┬────────────────────────────┘
                                              │
                    ┌─────────────────────────┴────────────────────────┐
                    ▼                                                  ▼
   ┌──────────────────────────────────┐               ┌──────────────────────────────────┐
   │    Desktop / Laptop 전용 모드    │               │   Mobile & Tablet 통합 UX 모드   │
   ├──────────────────────────────────┤               ├──────────────────────────────────┤
   │ • 마우스 + 키보드 기반 정밀 제어 │               │ • 터치 + 제스처 기반 직관적 제어 │
   │ • 3D 서재 직접 마우스 호버/조작 │               │ • 대형 태블릿(12.9" 포함) ~ 폰  │
   │ • 사서 커서(마우스 추적/손전등)  │               │ • 선반 셀렉터 + 바텀시트 도서 목록│
   │ • 다열(Multi-column) 와이드 모달 │               │ • 플로팅 사서 FAB + 미니 팝업   │
   │ • 상단 풀 네비게이션 GNB         │               │ • 1열 수직 스크롤 모달 & 하단바 │
   └──────────────────────────────────┘               └──────────────────────────────────┘
```

---

## 2. 디스플레이 규격 및 디바이스 판별 기준 (Breakpoints & Detection)

### 2.1 디바이스 분류표

| 디바이스 구분 | 해상도(Viewport Width) | 포인터/인터랙션 환경 | 적용 UI 모드 | 주요 대상 기기 |
| :--- | :--- | :--- | :--- | :--- |
| **Mobile Phone** | `360px ~ 640px` | 터치 (`pointer: coarse`) | **Mobile/Tablet 통합** | iPhone, Galaxy S/Z Fold(접힘) 등 |
| **Mini / Standard Tablet** | `641px ~ 1024px` | 터치 (`pointer: coarse`) | **Mobile/Tablet 통합** | iPad mini, iPad 10.2", Galaxy Tab A |
| **Large Tablet / Foldable** | `1025px ~ 1366px` | 터치 (`pointer: coarse`) | **Mobile/Tablet 통합** | iPad Pro 11"/12.9", Galaxy Tab S9/Ultra |
| **Laptop / Desktop PC** | `1025px 이상` | 마우스 (`pointer: fine`) | **Desktop 전용** | MacBook, Windows 노트북, 데스크톱 PC |

> [!IMPORTANT]
> **대형 태블릿(iPad Pro, Galaxy Tab Ultra 등 1024px~1366px) 처리 기준**  
> 단순 가로 픽셀(`innerWidth`)만으로 판단할 경우 대형 태블릿이 데스크톱 뷰로 잘못 빠지는 현상이 발생합니다.  
> 따라서 **`window.innerWidth <= 1024px`** 또는 **`@media (hover: none) and (pointer: coarse)` (터치 기기)** 조건 시 **모바일/태블릿 통합 UX**가 우선 적용됩니다.

---

## 3. 주요 영역별 UI/UX 인터랙션 가이드라인

### 3.1 GNB (상단 네비게이션) & 하단 탭바

| 기능/요소 | Desktop / Laptop 모드 | Mobile & Tablet 통합 모드 |
| :--- | :--- | :--- |
| **상단 헤더** | 브랜드 로고 + 중앙 메뉴(서재/도서등록/기록/사서) + 우측 프로필 카드 | 컴팩트 알약(Capsule) 로고 + 우측 미니 액션(프로필/다크모드) |
| **하단 네비게이션** | 미노출 | **고정 Bottom Navigation Bar** (홈/서재, 등록, 리포트, 사서) |
| **Safe Area** | 일반 여백 | iOS Home Indicator 및 Android 제스처바 대응 (`env(safe-area-inset-bottom)`) |

---

### 3.2 3D 가상 서재 및 선반 도서 탐색 (Virtual Library)

```
[Mobile & Large Tablet UX]
┌──────────────────────────────────────────────┐
│  [1번선반] [2번선반] [3번선반] [4번선반] [5번] │ ◀── 상단 5단 선반 터치 셀렉터 레이어
├──────────────────────────────────────────────┤
│                                              │
│                  3D 서재 뷰                  │
│                                              │
├──────────────────────────────────────────────┤
│  ▲ 터치 시 바텀시트(MobileShelfSheet) 슬라이드 업│
│  ┌────────────────────────────────────────┐  │
│  │ 📚 2번 선반 (철학/인문) - 총 4권       │  │
│  │ -------------------------------------- │  │
│  │ [표지] 책 제목 - 저자 (상태: 완독)      │  │
│  │ [표지] 책 제목 - 저자 (상태: 읽는 중)   │  │
│  └────────────────────────────────────────┘  │
└──────────────────────────────────────────────┘
```

- **Desktop/Laptop**:
  - 마우스 호버로 책 3D 메쉬 하이라이트 및 클릭 시 카메라 줌인 애니메이션
  - 마우스 휠 및 드래그로 시야 전환
- **Mobile & Tablet (대형 태블릿 포함)**:
  - 3D 공간 내의 작은 책을 터치하기 어려운 점을 극복하기 위해 **선반 1~5번 터치 탭** 제공
  - 선반 선택 시 하단에서 부드럽게 올라오는 **`MobileShelfSheet` (바텀시트)**로 책 리스트를 카드 형태로 탐색
  - 책 카드 터치 시 바로 도서 상세/문장 수집 모달로 직관적 진입

---

### 3.3 AI 동물 사서 인터랙션 (Librarian Chatbot)

- **Desktop/Laptop**:
  - **사서 커서 (`LibrarianCursor`)**: 마우스 포인터를 따라다니는 귀여운 동물 사서 애니메이션 + 손전등 조명 효과 + 6초 주기 말풍선 인터랙션
  - **대화창**: 화면 우측 하단 고정형 플로팅 패널 (가로 400px x 세로 620px)
- **Mobile & Tablet (대형 태블릿 포함)**:
  - **드래그 가능 플로팅 버튼 (`MobileChatFAB`)**: 화면 좌/우 원하는 위치로 자유롭게 드래그 배치 가능
  - **사서 미니 팝업 액션**: FAB 터치 시 미니 메뉴(사서와 대화 / 독서 타이머 / 서재 테마 / 프로필) 노출
  - **대화창**: 하단 슬라이드업 **바텀시트 또는 모바일 풀스크린 뷰** (가상 키보드 오픈 시 레이아웃 깨짐 방지 `dvh` 적용)

---

### 3.4 도서 등록 (RegisterBook) & OCR 스캔

- **Desktop/Laptop**:
  - 좌/우 2열 그리드 (`1fr 1fr`): 좌측 카메라/이미지 업로드 + 우측 도서 정보 입력 폼
- **Mobile & Tablet (대형 태블릿 포함)**:
  - **단일 열(1-Column) 수직 스크롤**:
    1. 상단: 모바일 카메라 촬영 / 앨범 업로드 버튼 (손쉬운 한 손 조작)
    2. 중단: OCR 스캔 프리뷰 & 인식 텍스트 편집
    3. 하단: 도서 메타데이터(제목, 저자, 출판사, 완독일) 및 선반 배치 선택기
  - 버튼 크기: 최소 높이 48px 이상 터치 타겟 보장

---

### 3.5 도서 상세 (BookDetail) & 문장 수집 (SentenceCollectModal)

- **Desktop/Laptop**:
  - 3열 와이드 레이아웃: `[도서 표지/정보 (220px)] - [본문/필사 에디터 (1fr)] - [사서 코멘트/스크랩 (320px)]`
- **Mobile & Tablet (대형 태블릿 포함)**:
  - **상하 수직 통합 카드 레이아웃 (`1fr`)**:
    1. 도서 기본 정보 헤더
    2. 독서 기록 및 감상문 작성 영역 (모바일 가상 키보드 입력 최적화)
    3. 수집한 문장 및 사서 추천 피드
  - 여백 및 패딩: 터치 스크롤에 방해되지 않도록 상하 패딩 최적화 (`maxHeight: 92vh`, `overflowY: auto`)

---

## 4. UI 컴포넌트 & 디자인 시스템 표준 규격

### 4.1 터치 타겟 & 간격 규격 (Touch Target Guidelines)

```css
/* 최소 터치 영역 보장 */
.touch-target {
  min-width: 44px;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

/* 터치 제스처 터치 피드백 */
.touch-interactive:active {
  transform: scale(0.97);
  transition: transform 0.1s ease;
}
```

### 4.2 Safe Area 및 Viewport Height 규격

- 모바일/태블릿 브라우저의 상단 URL 바 및 하단 네비게이션 바 동적 변화 대응:
  - `height: 100vh` 대신 **`height: 100dvh` (Dynamic Viewport Height)** 사용 권장
  - iOS Safe Area 인셋 적용:
    ```css
    padding-bottom: max(16px, env(safe-area-inset-bottom));
    padding-top: env(safe-area-inset-top);
    ```

---

## 5. 프론트엔드 코드 표준 구현체 (useResponsive Hook)

기존에 각 컴포넌트마다 `window.innerWidth <= 768`로 분기되던 방식을 **통일된 커스텀 훅(`useResponsive` 또는 `useDeviceLayout`)**으로 일원화합니다.

### 5.1 표준 훅 설계 (`app/hooks/useResponsive.js`)

```javascript
import { useState, useEffect } from 'react';

/**
 * 디바이스 및 터치 환경을 판별하는 표준 반응형 훅
 * - isTouchDevice: 태블릿, 모바일 등 터치 입력 환경 여부
 * - isMobileLayout: 스마트폰 ~ 대형 태블릿까지 통합 모바일 UX 적용 여부
 * - isDesktop: 노트북/데스크톱 마우스 환경
 */
export function useResponsive() {
  const [deviceState, setDeviceState] = useState(() => {
    if (typeof window === 'undefined') {
      return { isMobile: false, isTablet: false, isTouch: false, isDesktop: true };
    }
    const width = window.innerWidth;
    const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || window.matchMedia('(pointer: coarse)').matches;
    const isMobileWidth = width <= 768;
    const isTabletWidth = width > 768 && width <= 1280;
    
    // 노트북/데스크톱이 아닌 경우(터치 디바이스 또는 1200px 이하)는 모두 통합 모바일/태블릿 UX 적용
    const isUnifiedMobileUX = isMobileWidth || (isTouch && width <= 1366) || width <= 1024;

    return {
      isMobile: isMobileWidth,
      isTablet: isTabletWidth,
      isTouch,
      isDesktop: !isUnifiedMobileUX,
      isUnifiedMobileUX, // 모바일 & 태블릿 공통 레이아웃 플래그
    };
  });

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || window.matchMedia('(pointer: coarse)').matches;
      const isMobileWidth = width <= 768;
      const isTabletWidth = width > 768 && width <= 1280;
      const isUnifiedMobileUX = isMobileWidth || (isTouch && width <= 1366) || width <= 1024;

      setDeviceState({
        isMobile: isMobileWidth,
        isTablet: isTabletWidth,
        isTouch,
        isDesktop: !isUnifiedMobileUX,
        isUnifiedMobileUX,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return deviceState;
}
```

---

## 6. 결론 및 마이그레이션 로드맵

1. **문서화 완료**: 본 문서를 프로젝트 공식 가이드라인(`docs/UI_RESPONSIVE_GUIDELINE.md`)으로 관리.
2. **코드 통일 작업**:
   - `app/hooks/useResponsive.js` 공통 훅 도입
   - `LibraryScene`, `LibrarianChat`, `RegisterBook`, `SentenceCollectModal`, `ScrapGallery` 등에서 개별적으로 작성된 `innerWidth <= 768` 검사를 `useResponsive()`의 `isUnifiedMobileUX`로 교체
   - 대형 태블릿(iPad Pro, Galaxy Tab 등)에서도 모바일과 동일한 최적의 터치 서재/사서 경험 제공
