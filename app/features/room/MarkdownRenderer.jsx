/**
 * 마크다운 형식의 AI 사서 답변 텍스트를 파싱하여 깔끔한 React 컴포넌트로 렌더링하는 뷰어
 */

import { genreLabel } from '../../data/genres';
import { normalizeTitle } from './bookExtractor';

/**
 * 인라인 볼드(**...**), <br> 태그 및 특수문자를 React 노드로 안전하게 변환
 */
function renderInline(text) {
  if (!text) return null;

  // 낫표/화살괄호 내부의 불필요한 공백 정제 (예: 『 도서명 』 -> 『도서명』)
  const cleanedText = text
    .replace(/『\s+/g, '『')
    .replace(/\s+』/g, '』')
    .replace(/《\s+/g, '《')
    .replace(/\s+》/g, '》');

  // <br> 태그 및 **볼드** 패턴 분리 (<br>, <br/>, <br /> 모두 JSX <br />로 렌더링)
  const parts = cleanedText.split(/(<br\s*\/?>|\*\*[^*]+\*\*)/gi);
  return parts.map((part, i) => {
    if (!part) return null;
    if (/^<br\s*\/?>$/i.test(part)) {
      return <br key={`br-${i}`} />;
    }
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} style={{ color: 'var(--text-h)', fontWeight: 700 }}>
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

/**
 * 도서 카드를 감싸는 프리미엄 북 카드 컴포넌트
 * - type='recommend' (### 📖): [서재에 등록 ➔] 버튼
 * - type='library'   (### 📚): [책 열기 ➔] 버튼
 */
function BookCardView({ type = 'recommend', title, author, reason, status, genre, bookData, onRegister, onOpenDetail, keyPrefix }) {
  const isLibrary = type === 'library';
  // 백엔드 표준 장르 Enum(예: SCIENCE_FICTION) → 한글 라벨(SF). NONE/미매핑/빈값은 미표시.
  const genreText = !isLibrary && genre && genre !== 'NONE' ? genreLabel(genre) : '';

  return (
    <div
      key={`book-card-${keyPrefix}`}
      style={{
        margin: '10px 0',
        padding: '12px 14px',
        backgroundColor: 'var(--accent-bg, rgba(140, 90, 50, 0.05))',
        borderLeft: isLibrary ? '3.5px solid #10b981' : '3.5px solid var(--accent, #6366f1)',
        borderRadius: 8,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
      }}
    >
      {/* 도서 제목 + 액션 버튼 (헤더) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontWeight: 700,
            fontSize: 17.5,
            color: isLibrary ? '#10b981' : 'var(--accent, #6366f1)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flex: 1,
          }}
        >
          <span style={{ fontSize: 19 }}>{isLibrary ? '📚' : '📖'}</span>
          <span>{title}</span>
        </div>

        {/* 액션 버튼 */}
        {isLibrary && onOpenDetail && (
          <button
            type="button"
            onClick={() => onOpenDetail({ title, author, status })}
            style={{
              fontSize: 15,
              fontWeight: 600,
              padding: '4px 10px',
              borderRadius: 6,
              border: '1px solid rgba(16, 185, 129, 0.4)',
              background: '#10b981',
              color: '#fff',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            책 열기 ➔
          </button>
        )}
        {!isLibrary && onRegister && (
          <button
            type="button"
            onClick={() => onRegister(bookData || { title, author })}
            style={{
              fontSize: 15,
              fontWeight: 600,
              padding: '4px 10px',
              borderRadius: 6,
              border: '1px solid var(--accent-border, var(--accent))',
              background: 'var(--accent)',
              color: '#fff',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            등록 ➔
          </button>
        )}
      </div>

      {/* 저자 및 독서 상태 칩 */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        {author && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 15.5,
              color: 'var(--text-muted, #666)',
              backgroundColor: 'rgba(0, 0, 0, 0.03)',
              padding: '2px 8px',
              borderRadius: 4,
              width: 'fit-content',
              fontWeight: 500,
            }}
          >
            <span>👤 {author}</span>
          </div>
        )}
        {genreText && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 15.5,
              color: 'var(--accent, #6366f1)',
              backgroundColor: 'rgba(99, 102, 241, 0.08)',
              padding: '2px 8px',
              borderRadius: 4,
              width: 'fit-content',
              fontWeight: 600,
            }}
          >
            <span>🏷️ {genreText}</span>
          </div>
        )}
        {status && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 15.5,
              color: '#10b981',
              backgroundColor: 'rgba(16, 185, 129, 0.08)',
              padding: '2px 8px',
              borderRadius: 4,
              width: 'fit-content',
              fontWeight: 600,
            }}
          >
            <span>🔖 {status}</span>
          </div>
        )}
      </div>

      {/* 추천 이유 (외부 추천 도서인 경우) */}
      {reason && (
        <div
          style={{
            fontSize: 16.5,
            color: 'var(--text-h)',
            lineHeight: 1.6,
            marginTop: 2,
            backgroundColor: 'rgba(255, 255, 255, 0.6)',
            padding: '8px 10px',
            borderRadius: 6,
            border: '1px solid rgba(0, 0, 0, 0.04)',
          }}
        >
          <span style={{ fontWeight: 600, color: 'var(--accent, #6366f1)', marginRight: 4 }}>💡 추천 이유:</span>
          {renderInline(reason)}
        </div>
      )}
    </div>
  );
}

/**
 * 마크다운 텍스트를 줄 단위로 분석하여 도서 카드(추천/내서재), 헤딩, 목록, 일반 단락으로 렌더링
 * @param {object} props
 * @param {string} props.text - 마크다운 텍스트
 * @param {Array} [props.recommendedBooks] - 백엔드 recommended_books 구조화 데이터
 * @param {Array} [props.libraryBooks] - 사용자의 실제 내 서재 도서 목록 (교차 검증용)
 * @param {(book: object) => void} [props.onRegister] - 추천 도서 등록 콜백
 * @param {(book: object) => void} [props.onOpenDetail] - 내 서재 도서 상세 열기 콜백
 */
export default function MarkdownRenderer({
  text,
  recommendedBooks = [],
  libraryBooks = [],
  onRegister,
  onOpenDetail,
}) {
  if (!text) return null;

  // <br>, <br/>, <BR> 태그를 마크다운 개행(\n)으로 정규화하여 텍스트 노출 방지
  const normalizedText = text.replace(/<br\s*\/?>/gi, '\n');
  const lines = normalizedText.split('\n');
  const elements = [];

  let currentList = [];
  let currentBook = null;

  const flushBook = (keyPrefix) => {
    if (currentBook) {
      // 내 서재 카드인 경우: 실제 서재(libraryBooks)에 존재하는지 엄격히 교차 검증
      if (currentBook.type === 'library') {
        const normTitle = normalizeTitle(currentBook.title);
        const inMyLibrary = libraryBooks.some((b) => {
          if (!b.title) return false;
          return normalizeTitle(b.title) === normTitle || b.title.trim() === currentBook.title.trim();
        });

        // 서재에 없는 도서명이면 잘못된 헤딩/서두이므로 일반 헤딩/텍스트로 안전 강등
        if (!inMyLibrary) {
          elements.push(
            <div
              key={`fallback-heading-${keyPrefix}`}
              style={{
                fontWeight: 700,
                fontSize: 17.5,
                color: 'var(--accent)',
                marginTop: elements.length > 0 ? 10 : 2,
                marginBottom: 4,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              📚 {currentBook.title}
            </div>
          );
          currentBook = null;
          return;
        }
      }

      elements.push(
        <BookCardView
          key={`book-card-${keyPrefix}-${currentBook.title}`}
          keyPrefix={`${keyPrefix}-${currentBook.title}`}
          type={currentBook.type}
          title={currentBook.title}
          author={currentBook.author}
          reason={currentBook.reason}
          status={currentBook.status}
          genre={currentBook.genre}
          bookData={currentBook.bookData}
          onRegister={onRegister}
          onOpenDetail={onOpenDetail}
        />
      );
      currentBook = null;
    }
  };

  const flushList = (keyPrefix) => {
    if (currentList.length > 0) {
      elements.push(
        <ul
          key={`${keyPrefix}-list`}
          style={{
            margin: '4px 0 8px 0',
            paddingLeft: 18,
            display: 'flex',
            flexDirection: 'column',
            gap: 3,
            lineHeight: 1.5,
          }}
        >
          {currentList.map((item, idx) => (
            <li key={idx} style={{ color: 'var(--text-h)', fontSize: 16.5 }}>
              {renderInline(item)}
            </li>
          ))}
        </ul>
      );
      currentList = [];
    }
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    // 1. 빈 줄
    if (!trimmed) {
      flushList(idx);
      return;
    }

    // 2-A. 추천 도서 카드 시작: ### 📖 {도서 제목}
    if (/^#{1,4}\s*📖\s*/.test(trimmed)) {
      flushList(idx);
      flushBook(idx);
      const rawTitle = trimmed.replace(/^#{1,4}\s*📖\s*/, '').trim();
      const title = rawTitle.replace(/^[『《"'\s]+|[』》"'\s]+$/g, '').trim();

      // API 응답의 recommended_books 배열에서 해당 도서 구조화 데이터 매칭 (CLIAR-229)
      const matchedRec = recommendedBooks.find(
        (b) =>
          (b.title || '').trim() === title ||
          normalizeTitle(b.title) === normalizeTitle(title) ||
          (b.title || '').trim().replace(/^[『《"'\s]+|[』》"'\s]+$/g, '') === title
      );

      currentBook = {
        type: 'recommend',
        title,
        author: matchedRec?.author || '',
        reason: matchedRec?.reason || '',
        genre: matchedRec?.genre || '',
        bookData: matchedRec || { title, author: '', page_count: null, totalPage: null },
      };
      return;
    }

    // 2-B. 내 서재 도서 카드 시작: ### 📚 {도서 제목} (내 서재에 실제 있을 때만 카드로 승격)
    if (/^#{1,4}\s*📚\s*/.test(trimmed)) {
      flushList(idx);
      flushBook(idx);
      const rawTitle = trimmed.replace(/^#{1,4}\s*📚\s*/, '').trim();
      const title = rawTitle.replace(/^[『《"'\s]+|[』》"'\s]+$/g, '').trim();
      currentBook = { type: 'library', title, author: '', status: '' };
      return;
    }

    // 2-C. 번호 매김 추천 도서 목록 포맷 (예: 1. 《살고 싶다는 농담》 - 백영옥 에세이 또는 1. 『천개의 파란』)
    // 에이전트가 ### 📖 대신 1. 《도서명》 형태로 추천을 보낸 경우에도 [등록 ➔] 추천 도서 카드로 자동 승격
    const numberedRecMatch = trimmed.match(/^\d+\.\s*(?:\*\*)?[『《]([^』》]+)[』》](?:\*\*)?(?:\s*[-–—:]\s*([^\n]+))?/);
    if (numberedRecMatch) {
      flushList(idx);
      flushBook(idx);
      const rawTitle = numberedRecMatch[1].trim();
      const rawAuthor = numberedRecMatch[2] ? numberedRecMatch[2].split(/[,\n]/)[0].trim() : '';

      const matchedRec = recommendedBooks.find(
        (b) =>
          (b.title || '').trim() === rawTitle ||
          normalizeTitle(b.title) === normalizeTitle(rawTitle)
      );

      currentBook = {
        type: 'recommend',
        title: rawTitle,
        author: matchedRec?.author || rawAuthor,
        reason: matchedRec?.reason || '',
        genre: matchedRec?.genre || '',
        bookData: matchedRec || { title: rawTitle, author: rawAuthor, page_count: null, totalPage: null },
      };
      return;
    }

    // 2-1. 도서 카드 내부 항목 파싱 (- **저자**:, - **추천 이유**:, - **독서 상태**:, 어떤 이야기냐면요:, 이런 마음일 때:)
    if (currentBook) {
      if (/^[-*•]?\s*(?:\*\*)?저자(?:\*\*)?\s*[:：]\s*/.test(trimmed)) {
        const rawAuthor = trimmed.replace(/^[-*•]?\s*(?:\*\*)?저자(?:\*\*)?\s*[:：]\s*/, '').trim();
        if (!currentBook.author) {
          currentBook.author = rawAuthor;
          if (currentBook.bookData) {
            currentBook.bookData.author = rawAuthor;
          }
        }
        return;
      }
      if (/^[-*•]?\s*(?:\*\*)?(?:추천\s*이유|추천\s*사유|어떤\s*이야기냐면요)(?:\*\*)?\s*[:：]\s*/.test(trimmed)) {
        const rawReason = trimmed.replace(/^[-*•]?\s*(?:\*\*)?(?:추천\s*이유|추천\s*사유|어떤\s*이야기냐면요)(?:\*\*)?\s*[:：]\s*/, '').trim();
        if (!currentBook.reason) {
          currentBook.reason = rawReason;
        }
        return;
      }
      if (/^[-*•]?\s*(?:\*\*)?이런\s*마음일\s*때(?:\s*추천해요)?(?:\*\*)?\s*[:：]\s*/.test(trimmed)) {
        const extraReason = trimmed.replace(/^[-*•]?\s*(?:\*\*)?이런\s*마음일\s*때(?:\s*추천해요)?(?:\*\*)?\s*[:：]\s*/, '').trim();
        if (extraReason) {
          currentBook.reason = currentBook.reason ? `${currentBook.reason} (${extraReason})` : extraReason;
        }
        return;
      }
      if (/^[-*•]\s*\*\*장르\*\*\s*[:：]\s*/.test(trimmed)) {
        if (!currentBook.genre) {
          currentBook.genre = trimmed.replace(/^[-*•]\s*\*\*장르\*\*\s*[:：]\s*/, '').trim();
        }
        return;
      }
      if (/^[-*•]\s*\*\*독서\s*상태\*\*\s*[:：]\s*/.test(trimmed)) {
        currentBook.status = trimmed.replace(/^[-*•]\s*\*\*독서\s*상태\*\*\s*[:：]\s*/, '').trim();
        return;
      }
      // 도서 카드가 끝난 후 일반 마크다운이 시작될 때 flush
      if (/^#{1,4}\s+/.test(trimmed) || /^\d+\.\s+/.test(trimmed)) {
        flushBook(idx);
      }
    }

    // 3-A. 수평 구분선 (---, ***, ___ )
    if (/^[-*_]{3,}$/.test(trimmed)) {
      flushList(idx);
      flushBook(idx);
      elements.push(
        <hr
          key={`hr-${idx}`}
          style={{
            border: 'none',
            borderTop: '1px solid var(--border-subtle, rgba(0, 0, 0, 0.08))',
            margin: '12px 0',
          }}
        />
      );
      return;
    }

    // 3-B. 도서 카드 외부에서 발생한 고아 메타데이터 라인 (저자: ..., 사유: ...) 필터링
    // 도서 카드가 저자/사유를 직접 렌더링하므로, 본문 텍스트에 중복 노출되는 노이즈를 방어한다.
    if (!currentBook && /^(?:[-*•]\s*)?(?:저자|작가|출판사|사유|추천\s*사유|추천\s*이유)\s*[:：]/i.test(trimmed)) {
      return;
    }

    // 3. 일반 헤딩 (###, ##, #)
    if (/^#{1,4}\s+/.test(trimmed)) {
      flushList(idx);
      flushBook(idx);
      const headingContent = trimmed.replace(/^#{1,4}\s+/, '');
      elements.push(
        <div
          key={idx}
          style={{
            fontWeight: 700,
            fontSize: 17.5,
            color: 'var(--accent)',
            marginTop: elements.length > 0 ? 10 : 2,
            marginBottom: 4,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          {renderInline(headingContent)}
        </div>
      );
      return;
    }

    // 4. 글머리 기호 목록 (- , * , • )
    if (/^[-*•]\s+/.test(trimmed)) {
      const listItemContent = trimmed.replace(/^[-*•]\s+/, '');
      currentList.push(listItemContent);
      return;
    }

    // 5. 번호 매김 목록 (1. , 2. )
    if (/^\d+\.\s+/.test(trimmed)) {
      flushList(idx);
      flushBook(idx);
      elements.push(
        <div
          key={idx}
          style={{
            margin: '4px 0',
            fontSize: 16.5,
            color: 'var(--text-h)',
            lineHeight: 1.5,
          }}
        >
          {renderInline(trimmed)}
        </div>
      );
      return;
    }


    // 6. 일반 본문 단락 (사서 서두/마무리 멘트 등)
    flushList(idx);
    flushBook(idx);
    elements.push(
      <p
        key={idx}
        style={{
          margin: '4px 0',
          fontSize: 16.5,
          color: 'var(--text-h)',
          lineHeight: 1.55,
        }}
      >
        {renderInline(trimmed)}
      </p>
    );
  });

  flushList('final');
  flushBook('final');

  return (
    <div
      style={{
        lineHeight: 1.55,
        wordBreak: 'break-word',
      }}
    >
      {elements}
    </div>
  );
}
