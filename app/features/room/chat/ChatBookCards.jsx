import { toKoreanStatus } from '../../../api/bookApi';

export default function ChatBookCards({
  chatMode,
  libraryBooks,
  recommendedBooks,
  loading,
  currentAnswer,
  onOpenDetail,
  onRegisterBook,
}) {
  return (
    <>
      {/* 1. 내 서재 도서 목록 카드 (일반 대화 및 서재 모드에서만 노출, 토론 모드에서는 제외) */}
      {chatMode !== 'debate' && libraryBooks.length > 0 && !loading && !currentAnswer?.text?.includes('### 📚') && (
        <div className="lc-chat-books-card-box">
          <div className="lc-chat-books-card-title">
            📖 내 서재 도서 ({libraryBooks.length}권):
          </div>
          <div className="lc-chat-books-card-list">
            {libraryBooks.map((b, idx) => {
              const bookId = b.book_id ?? b.bookId ?? b.id;
              const statusKr = toKoreanStatus(b.reading_status ?? b.readingStatus ?? b.status, b.progress ?? 0);
              const progress = b.progress != null ? `${b.progress}%` : null;
              return (
                <div key={bookId || idx} className="lc-chat-book-item">
                  <div className="lc-chat-book-item-info">
                    <span className="lc-chat-book-item-title">{b.title}</span>
                    {b.author && <span className="lc-chat-book-item-author">({b.author})</span>}
                    {(statusKr || progress) && (
                      <span className="lc-chat-book-item-status">
                        [{statusKr}{progress ? ` · ${progress}` : ''}]
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpenDetail(b)}
                    className="lc-chat-book-open-btn"
                  >
                    책 열기 ➔
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. 추천 도서 바로 등록 카드 리스트 (마크다운 본문에 ### 📖 카드가 없는 JSON 응답 대응) */}
      {recommendedBooks.length > 0 && !loading && !currentAnswer?.text?.includes('### 📖') && (
        <div className="lc-chat-books-card-box">
          <div className="lc-chat-books-card-title">
            📚 추천 도서 바로 서재에 등록하기:
          </div>
          <div className="lc-chat-books-card-list">
            {recommendedBooks.map((b, idx) => (
              <div key={idx} className="lc-chat-book-item">
                <div className="lc-chat-book-item-info">
                  <span className="lc-chat-book-item-title">{b.title}</span>
                  {b.author && <span className="lc-chat-book-item-author">({b.author})</span>}
                </div>
                <button
                  type="button"
                  onClick={() => onRegisterBook(b)}
                  className="lc-chat-book-reg-btn"
                >
                  등록 ➔
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
