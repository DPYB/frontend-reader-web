import { DEBATE_PERSONAS } from '../../../data/debatePersonas';
import { useLanguage } from '../../../store/languageStore';

export default function DebateSetupSection({
  chatMode,
  debateCollapsed,
  setDebateCollapsed,
  debateStep,
  setDebateStep,
  debaterPersona,
  setDebaterPersona,
  selectedDebatePersona,
  selectedDebateBook,
  setSelectedDebateBook,
  debateBookQuery,
  setDebateBookQuery,
  debateLibraryBooks,
  books,
  loading,
  modeAnswers,
  modeMessages,
  onConcludeDebate,
}) {
  const { t, isEn, formatStatus } = useLanguage();

  if (chatMode !== 'debate') return null;

  // 상단 고정 배너 (대화 진행 중일 때)
  if (debateCollapsed) {
    return (
      <div
        className="lc-debate-banner lc-debate-banner-clickable"
        onClick={() => {
          setDebateCollapsed(false);
          setDebateStep('topic');
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setDebateCollapsed(false);
            setDebateStep('topic');
          }
        }}
        title={isEn ? 'Expand debate settings' : '토론 설정 펼치기'}
      >
        <span className="lc-debate-badge">DEBATE</span>
        <span className="lc-debate-banner-title">
          {selectedDebatePersona.icon} <strong>{selectedDebatePersona.name}</strong> ·{' '}
          {selectedDebateBook
            ? (isEn ? `Discussing 《${selectedDebateBook.title}》` : `《${selectedDebateBook.title}》 토론 중`)
            : t('debate.customTopicShort', '나만의 주제로 토론 중')}
        </span>
        <div className="lc-debate-banner-actions">
          <button
            type="button"
            className="lc-debate-mini-conclude-btn"
            onClick={(e) => {
              e.stopPropagation();
              onConcludeDebate();
            }}
            disabled={loading}
            title={isEn ? 'Wrap up debate and get recommendations' : '토론 끝내기 및 맞춤 책 추천받기'}
          >
            {t('debate.concludeBtn', '🏁 끝내기')}
          </button>
          <span className="lc-debate-banner-toggle">{t('debate.settingsToggle', '설정 ▾')}</span>
        </div>
      </div>
    );
  }

  // 설정 화면 (토론자/도서 선택 모드)
  return (
    <div className="lc-debate-view">
      {debateStep === 'debater' ? (
        /* [1단계] 토론 상대 선택 */
        <div className="lc-debate-step-box">
          <div className="lc-debate-step-header">
            <span className="lc-debate-step-tag">{t('debate.step1Tag', '1단계')}</span>
            <label className="lc-debate-label">
              {t('debate.step1Label', '토론 파트너 선택 (AI 전문 토론자 4인)')}
            </label>
          </div>
          <div className="lc-debater-grid">
            {DEBATE_PERSONAS.map((dp) => {
              const isSelected = debaterPersona === dp.id;
              return (
                <button
                  key={dp.id}
                  type="button"
                  className={`lc-debater-card ${isSelected ? 'active' : ''}`}
                  onClick={() => {
                    setDebaterPersona(dp.id);
                    setDebateStep('topic');
                  }}
                  disabled={loading}
                >
                  <div className="lc-debater-header">
                    <span className="lc-debater-icon">{dp.icon}</span>
                    <span className="lc-debater-name">{dp.name}</span>
                    <span className="lc-debater-tag">{dp.tag}</span>
                  </div>
                  <span className="lc-debater-title">{dp.title}</span>
                  <span className="lc-debater-desc">{dp.oneLiner}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        /* [2단계] 토론 주제 및 도서 선택 */
        <div className="lc-debate-step-box">
          {/* 2단계 상단: 현재 선택된 토론자 표시 + 토론자 변경 버튼 */}
          <div className="lc-debate-partner-bar">
            <div className="lc-debate-partner-bar-info">
              <span className="lc-debater-icon">{selectedDebatePersona.icon}</span>
              <strong className="lc-debate-partner-bar-name">{selectedDebatePersona.name}</strong>
              <span className="lc-debate-partner-bar-title">({selectedDebatePersona.title})</span>
            </div>
            <button
              type="button"
              className="lc-debate-change-partner-btn"
              onClick={() => setDebateStep('debater')}
              title={isEn ? 'Change to another debater' : '다른 토론자로 변경'}
            >
              {t('debate.changePartner', '파트너 변경 ↺')}
            </button>
          </div>

          <div className="lc-debate-step-header">
            <span className="lc-debate-step-tag">{t('debate.step2Tag', '2단계')}</span>
            <label className="lc-debate-label">
              {t('debate.step2Label', '토론할 주제나 책을 선택해 주세요')}
            </label>
          </div>

          {/* 최상단: 나만의 주제로 토론하기 (자유 주제) 버튼 */}
          <button
            type="button"
            className={`lc-debate-custom-topic-card ${selectedDebateBook === null ? 'selected' : ''}`}
            onClick={() => {
              setSelectedDebateBook(null);
              setDebateCollapsed(true);
            }}
            disabled={loading}
          >
            <div className="lc-debate-custom-topic-main">
              <span className="lc-debate-custom-topic-icon">✨</span>
              <div className="lc-debate-custom-topic-text">
                <span className="lc-debate-custom-topic-title">{t('debate.customTopicTitle', '나만의 주제로 토론하기')}</span>
                <span className="lc-debate-custom-topic-desc">
                  {t('debate.customTopicDesc', '서재의 책 없이도 원하는 주제나 질문으로 자유롭게 대화해요')}
                </span>
              </div>
            </div>
            <span className="lc-debate-start-arrow">{t('debate.startArrow', '시작 ➔')}</span>
          </button>

          {/* 내 서재 도서 선택 섹션 */}
          <div className="lc-debate-book-section">
            <div className="lc-debate-section-title">
              <span>{t('debate.orDebateWithBook', '📖 또는 내 서재의 책으로 토론하기')}</span>
              <span className="lc-debate-book-count">({books.length}{isEn ? ' books' : '권'})</span>
            </div>

            {books.length > 2 && (
              <input
                type="text"
                className="lc-debate-book-search-input"
                value={debateBookQuery}
                onChange={(e) => setDebateBookQuery(e.target.value)}
                placeholder={t('debate.searchBookPlaceholder', '서재 책 제목 또는 저자 검색...')}
              />
            )}

            <div className="lc-debate-book-list">
              {books.length === 0 ? (
                <div className="lc-debate-empty-books">
                  {isEn ? (
                    <>
                      No books registered in library.
                      <br />
                      Click <strong>'Debate Custom Topic'</strong> above to start right away!
                    </>
                  ) : (
                    <>
                      서재에 등록된 도서가 없습니다.
                      <br />
                      위의 <strong>'나만의 주제로 토론하기'</strong>를 눌러 바로 시작해 보세요!
                    </>
                  )}
                </div>
              ) : debateLibraryBooks.length === 0 ? (
                <div className="lc-debate-empty-books">
                  {t('debate.emptySearch', '일치하는 서재 도서가 없습니다.')}
                </div>
              ) : (
                debateLibraryBooks.map((b) => {
                  const bookId = b.bookId || b.id;
                  const isChosen = selectedDebateBook && (selectedDebateBook.bookId === bookId || selectedDebateBook.id === bookId);
                  return (
                    <div
                      key={bookId}
                      className={`lc-debate-book-item ${isChosen ? 'selected' : ''}`}
                      onClick={() => {
                        setSelectedDebateBook(b);
                        setDebateCollapsed(true);
                      }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSelectedDebateBook(b);
                          setDebateCollapsed(true);
                        }
                      }}
                    >
                      <div className="lc-debate-book-info">
                        <span className="lc-debate-book-title">{b.title}</span>
                        <div className="lc-debate-book-meta">
                          {b.author && <span>{b.author}</span>}
                          {b.status && <span className="lc-debate-book-badge">{formatStatus(b.status)}</span>}
                          {b.progress != null && <span>{b.progress}%</span>}
                        </div>
                      </div>
                      <span className="lc-debate-book-select-action">{t('debate.selectArrow', '선택 ➔')}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* 대화 히스토리가 이미 있는 상태에서 설정을 펼쳤을 때: '대화로 돌아가기' 버튼 */}
          {(modeAnswers?.debate?.text || modeMessages?.debate?.length > 0) && (
            <button
              type="button"
              className="lc-debate-return-btn"
              onClick={() => setDebateCollapsed(true)}
            >
              {t('debate.returnToChat', '대화창으로 돌아가기 ▾')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
