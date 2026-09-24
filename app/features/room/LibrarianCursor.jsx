import { useState, useEffect, useRef } from 'react';
import { extractBooksFromAnswer } from './bookExtractor';
import './LibrarianCursor.css';

/**
 * LibrarianCursor — 마우스를 따라다니는 사서 이미지 + 우상단 말풍선.
 * 위치는 컨테이너의 CSS 변수(--mx, --my)를 따라감(부모가 mousemove로 갱신).
 * 실제 커서는 부모에서 숨김(cursor:none).
 *
 * 상세한 추천 도서 목록 및 등록 액션은 우측 하단 고정 패널(LibrarianChat)에서 전담하며,
 * 마우스 커서의 말풍선은 1~2줄의 가벼운 리액션/안내 문구만 표시합니다.
 *
 * @param {object} librarian - { name, icon, image }
 * @param {{text:string}|null} answer - 표시할 답변(없으면 말풍선 숨김)
 */
// 기본 표시 크기(px). 사서별 배율은 librarians.js의 imgScale로 조정한다.
const IMG_SIZE = 200;

// 말풍선 유지 시간 (6초 후 자동 소멸)
const BUBBLE_DURATION_MS = 6000;

/**
 * 포인터 지점 기본값 — 사서 데이터(librarians.js)에 tip이 없을 때만 사용.
 * 사서별 실측 좌표는 librarians.js의 tip/tipHover가 단일 소스다.
 */
const FALLBACK_TIP = { x: 0.26, y: 0.287 };

/**
 * 말풍선에 노출할 짧은 1~2줄 리액션 텍스트 생성
 */
function getShortBubbleText(rawText, librarian, answer) {
  if (!rawText) return '';
  // <br> 태그 텍스트 노출 방지 및 개행 정규화
  const text = rawText.replace(/<br\s*\/?>/gi, '\n').trim();
  const libId = librarian?.id;

  // 1. 도서 추천 결과 (recommended_books 구조화 데이터 또는 ### 📖 또는 1. 《도서명》 마크다운)
  const backendRec = answer?.recommended_books || answer?.recommendedBooks || [];
  const hasRecPattern = text.includes('### 📖') || /^\s*\d+\.\s*(?:\*\*)?[『《]/m.test(text);
  const isRecommend = backendRec.length > 0 || hasRecPattern;
  const recommendedBooks = backendRec.length > 0 ? backendRec : (isRecommend ? extractBooksFromAnswer(text) : []);
  if (recommendedBooks.length >= 2) {
    const count = recommendedBooks.length;
    if (libId === 'stork') {
      return `✨ 두둥! 추천 도서 ${count}권을 선별했습니다 🪶\n아래 채팅창에서 확인해 보세요`;
    }
    if (libId === 'nudi') {
      return `✨ 마음에 닿을 추천 도서 ${count}권을 찾았어요 누누 🐌\n아래 채팅창에서 확인해 보세요`;
    }
    if (libId === 'gecko') {
      return `✨ 흥미로운 추천 도서 ${count}권을 골라왔지 크크! 🦎\n아래 채팅창에서 확인해봐`;
    }
    return `✨ 추천 도서 ${count}권을 찾았다 냥! 📚\n아래 채팅창에서 확인해보라 냥 🐾`;
  }
  if (recommendedBooks.length === 1) {
    const bookTitle = recommendedBooks[0].title || '';
    if (libId === 'stork') {
      return `✨ 두둥! 『${bookTitle}』 도서를 선별했습니다 🪶\n아래 채팅창에서 확인해 보세요`;
    }
    if (libId === 'nudi') {
      return `✨ 마음을 울릴 『${bookTitle}』을 골라봤어요 누누 🐌\n아래 채팅창에서 확인해 보세요`;
    }
    if (libId === 'gecko') {
      return `✨ 딱 어울리는 『${bookTitle}』을 골라왔어 크크! 🦎\n아래 채팅창에서 확인해봐`;
    }
    return `✨ 『${bookTitle}』 책을 찾았다 냥! 📚\n아래 채팅창에서 확인해보라 냥 🐾`;
  }

  // 2. 내 서재 도서 결과 (ADR 0006: library_books 백엔드 배열 또는 ### 📚 단락 - 추천 도서가 아닐 때만)
  const backendLib = answer?.library_books || answer?.libraryBooks || [];
  const isLibrary = !isRecommend && (backendLib.length > 0 || (/^###\s*📚\s*[^\n]+/m.test(text) && !text.includes('### 📖')));
  if (isLibrary) {
    if (libId === 'stork') {
      return `✨ 두둥! 서재에서 도서를 확인했습니다 🪶\n아래 채팅창에서 확인해 보세요`;
    }
    if (libId === 'nudi') {
      return `✨ 서재에서 소중한 책을 찾았어요 누누... 🐌\n아래 채팅창에서 확인해 보세요`;
    }
    if (libId === 'gecko') {
      return `✨ 서재에서 도서를 바로 찾아냈지 크크! 🦎\n아래 채팅창에서 확인해봐`;
    }
    return `✨ 서재에서 책을 찾았다 냥! 📚\n아래 채팅창에서 확인해보라 냥 🐾`;
  }

  // 3. 짧은 문구(로딩 중, 사서 변경 알림, 단순 안내 등)는 마크다운 기호 정제 후 표시
  if (text.length <= 80 && text.split('\n').length <= 2) {
    return text
      .replace(/^#{1,4}\s+/gm, '')
      .replace(/\*\*/g, '')
      .replace(/^[-*•]\s+/gm, '')
      .trim();
  }


  if (libId === 'stork') {
    return `✨ 두둥! 사서의 답변이 도착했습니다 🪶\n아래 채팅창에서 확인해 보세요`;
  }
  if (libId === 'nudi') {
    return `✨ 사서의 포근한 답변이 도착했어요 누누 🐌\n아래 채팅창에서 확인해 보세요`;
  }
  if (libId === 'gecko') {
    return `✨ 사서 답변이 도착했지 크크! 🦎\n아래 채팅창에서 확인해봐`;
  }
  return `✨ 사서 답변이 도착했다 냥! 📚\n아래 채팅창에서 확인해보라 냥 🐾`;
}

export default function LibrarianCursor({ librarian, answer, active, thinking }) {
  /*
   * 클릭 모션 전환 (누디 전용, 사용자 요청 2026-09).
   * 누디는 책 선택 여부와 무관하게, 좌클릭할 때마다 nudi_02(모션 이미지)로
   * clickMotionMs(2000ms)간 바뀌었다가 자동으로 기본 이미지(nudi_01)로 돌아온다.
   * librarian.clickMotionMs가 없는 사서(블루/슈빌)는 기존 방식(책 선택 중에만
   * 모션 이미지, CLIAR-239)을 그대로 사용한다.
   */
  const hasClickMotion = typeof librarian.clickMotionMs === 'number';
  const [clickActive, setClickActive] = useState(false);
  const clickTimerRef = useRef(null);

  // 사서를 전환하면 이전 사서의 클릭 모션 상태를 남기지 않는다. 이펙트 안에서
  // setState를 바로 호출하지 않도록, 위 bubbleText 리셋과 같은 렌더 중 동기화
  // 패턴을 사용한다(react-hooks/set-state-in-effect 회피).
  const [prevLibrarianId, setPrevLibrarianId] = useState(librarian.id);
  if (librarian.id !== prevLibrarianId) {
    setPrevLibrarianId(librarian.id);
    setClickActive(false);
  }

  useEffect(() => {
    if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
    if (!hasClickMotion) return;

    const handleStart = (e) => {
      if (e.type === 'mousedown' && e.button !== 0) return; // 좌클릭만
      setClickActive(true);
      if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
      clickTimerRef.current = setTimeout(() => setClickActive(false), librarian.clickMotionMs);
    };

    window.addEventListener('mousedown', handleStart);
    window.addEventListener('touchstart', handleStart, { passive: true });
    return () => {
      window.removeEventListener('mousedown', handleStart);
      window.removeEventListener('touchstart', handleStart);
      if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
    };
    // librarian.id로 의존성을 좁혀, 답변 갱신 등으로 librarian 객체 참조가 바뀌어도
    // 타이머가 불필요하게 재설정되지 않게 한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [librarian.id, hasClickMotion]);

  // 책을 선택(클릭)했을 때만 모션 이미지로 전환한다 (CLIAR-239). 예전에는 책 위에
  // 마우스를 올리기만 해도(hover) 바뀌었지만, 선택 상태에서만 움직이도록 변경했다.
  const useActive = hasClickMotion ? clickActive : active;

  /*
   * 표시 이미지 결정 (우선순위: 답변 대기 > 활성/모션 > 기본).
   * - thinkingImage가 있는 사서(게코)는 챗봇 답변을 기다리는 동안(thinking=true)
   *   대기 이미지를 보여주고, 답변이 오면(thinking=false) 기본 이미지로 돌아온다.
   * - 그 외에는 기존 로직(책 선택/클릭 모션 시 imageHover, 아니면 기본 image).
   */
  const showThinking = thinking && librarian.thinkingImage;
  let imgSrc;
  if (showThinking) {
    imgSrc = librarian.thinkingImage;
  } else if (useActive && librarian.imageHover) {
    imgSrc = librarian.imageHover;
  } else {
    imgSrc = librarian.image;
  }

  // 사서별 표시 크기 (imgScale 미지정 시 기본 배율)
  const imgSize = Math.round(IMG_SIZE * (librarian.imgScale ?? 1));

  // 포인터 지점(손끝·부리 끝)이 실제 커서 위치(--mx, --my)에 오도록 이미지를 이동.
  // 대기 이미지는 별도 앵커가 없으므로 기본 tip을 쓰고, 그 외에는 활성 시 tipHover.
  const tip =
    (showThinking ? librarian.tip : useActive ? librarian.tipHover : librarian.tip) ||
    librarian.tip ||
    FALLBACK_TIP;
  const offsetX = -(tip.x * imgSize);
  const offsetY = -(tip.y * imgSize);

  const bubbleText = answer?.text ? getShortBubbleText(answer.text, librarian, answer) : '';
  const [prevBubbleText, setPrevBubbleText] = useState('');
  const [bubbleHidden, setBubbleHidden] = useState(false);

  // 텍스트가 새로 바뀌면 말풍선 숨김 상태 해제 (렌더 중 상태 동기화)
  if (bubbleText !== prevBubbleText) {
    setPrevBubbleText(bubbleText);
    setBubbleHidden(false);
  }

  // 모든 동물 사서(블루/슈빌/누디/게코) 공통: 6초 후 말풍선 자동 소멸 타이머
  useEffect(() => {
    if (!bubbleText || bubbleHidden) return;

    const timer = setTimeout(() => {
      setBubbleHidden(true);
    }, BUBBLE_DURATION_MS);

    return () => clearTimeout(timer);
  }, [bubbleText, bubbleHidden]);

  const showBubble = Boolean(bubbleText) && !bubbleHidden;

  return (
    <div
      style={{
        position: 'absolute',
        left: 'var(--mx, 50%)',
        top: 'var(--my, 50%)',
        transform: `translate(${offsetX}px, ${offsetY}px)`,
        // GNB 오버레이(30)와 그 드롭다운(100)보다 위에 올려, 상단 바 위에서도
        // 사서 커서가 가려지지 않게 한다 (CLIAR-214). pointer-events:none이라 클릭을 막지 않는다.
        // CLIAR-283: 모든 모달(1000-1100)보다 위에 표시되도록 1200으로 설정
        zIndex: 1200,
        pointerEvents: 'none',
      }}
    >
      <div style={{ position: 'relative' }}>
        {/* 사서 이미지 (없으면 이모지) */}
        {imgSrc ? (
          /*
           * key에 src를 넣어 선택 상태가 바뀔 때마다 img 요소를 새로 마운트한다.
           * 황새 모션 이미지는 1회 재생 후 마지막 프레임에 멈추는 애니메이션 WebP라,
           * 같은 요소의 src만 교체하면 브라우저가 완료된 애니메이션을 다시 재생하지
           * 않을 수 있다. 요소를 새로 만들면 책을 선택할 때마다 처음부터 재생된다.
           */
          <img
            key={imgSrc}
            className={`librarian-cursor-img${useActive ? ' librarian-cursor-img--active' : ''}`}
            src={imgSrc}
            alt={librarian.name}
            style={{ width: imgSize, height: imgSize }}
            draggable={false}
          />
        ) : (
          <div style={{ fontSize: 94, lineHeight: 1 }}>{librarian.icon}</div>
        )}

        {/* 우상단 말풍선 (가벼운 1~2줄 리액션, 6초 자동 유지) */}
        {showBubble && bubbleText && (
          <div
            className="librarian-cursor-bubble"
            style={{
              position: 'absolute',
              left: '78%',
              bottom: '72%',
              width: 210,
              // CLIAR-301: 말풍선 배경을 기존보다 50% 흰색에 가깝게(더 밝게) 조정
              background: 'var(--bubble-bg)',
              color: 'var(--text-h)',
              border: '1px solid var(--border)',
              borderRadius: 14,
              padding: '10px 12px',
              fontSize: 17,
              lineHeight: 1.5,
              whiteSpace: 'pre-line',
              boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
            }}
          >
            {bubbleText}
            {/* 말풍선 꼬리 */}
            <span
              style={{
                position: 'absolute',
                left: -8,
                bottom: 16,
                width: 0,
                height: 0,
                borderTop: '6px solid transparent',
                borderBottom: '6px solid transparent',
                borderRight: '8px solid var(--border)',
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
