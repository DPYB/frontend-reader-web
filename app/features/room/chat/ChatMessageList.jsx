import MarkdownRenderer from '../MarkdownRenderer';
import LoadingSequence from '../../../components/LoadingSequence';

export default function ChatMessageList({
  currentMessages,
  recommendedBooks,
  books,
  librarian,
  librarianNames,
  selectedDebatePersona,
  chatMode,
  loading,
  turnCount,
  lastUserMessage,
  isBookRecommendationQuery,
  getRecommendationLoadingMessage,
  targetSwitchName,
  currentAnswer,
  isConcluded,
  debateSummary,
  onRegisterBook,
  onOpenDetail,
  messagesEndRef,
}) {
  return (
    <>
      {/* 사서 소개 팁 안내 (전문 장르 벗어난 추천 질문 시 부드럽게 안내) */}
      {chatMode !== 'library' && currentAnswer?.switchTo && (
        <div className="lc-switch-tip">
          <span className="lc-switch-tip-icon">💡</span>
          <span>
            이 장르는 <strong>{targetSwitchName}</strong>가 더 깊이 있게 추천할 수 있어요. 상단 프로필에서 언제든 사서를 변경해 보세요!
          </span>
        </div>
      )}

      {/* 🧠 토론 기억 저장 완료 뱃지 (피날레 시 백엔드 agent.debate_insights 자동 저장 연계) */}
      {isConcluded && !loading && (
        <div className="lc-debate-concluded-badge">
          <span className="lc-debate-concluded-icon">🧠</span>
          <div className="lc-debate-concluded-text">
            <strong>토론 인사이트가 서재 기억에 저장되었습니다</strong>
            {debateSummary ? (
              <span className="lc-debate-concluded-summary">"{debateSummary}"</span>
            ) : (
              <span>다음 대화에서도 사서가 오늘 나눈 통찰을 기억합니다.</span>
            )}
          </div>
        </div>
      )}

      {/* 💬 메신저형 멀티턴 대화 히스토리 리스트 */}
      <div className="lc-messages-list">
        {currentMessages.map((msg, mIdx) => {
          const isUser = msg.role === 'user';
          const isLastAssistant = !isUser && mIdx === currentMessages.length - 1;
          const msgRecommended = isLastAssistant ? recommendedBooks : (msg.recommendedBooks || []);

          return (
            <div key={mIdx} className={`lc-message-row ${isUser ? 'user' : 'assistant'}`}>
              <div className="lc-message-sender">
                {isUser
                  ? '👤 나'
                  : msg.senderName
                    ? `${msg.senderIcon || '🐾'} ${msg.senderName}`.trim()
                    : chatMode === 'debate'
                      ? `${selectedDebatePersona.icon} ${selectedDebatePersona.name}`
                      : `🐾 ${librarianNames[librarian.id] || librarian.displayName || librarian.name}`}
              </div>
              <div className="lc-message-bubble">
                {isUser ? (
                  msg.text
                ) : (
                  <MarkdownRenderer
                    text={msg.text}
                    recommendedBooks={msgRecommended}
                    libraryBooks={books}
                    onRegister={onRegisterBook}
                    onOpenDetail={onOpenDetail}
                  />
                )}
              </div>
            </div>
          );
        })}

        {/* 로딩 애니메이션 및 안내 문구 */}
        {loading && (
          <div className="lc-messages-loading-box">
            <LoadingSequence
              size={120}
              padding={20}
              label={
                turnCount <= 1 ? (
                  <>
                    따스한 햇살 아래 포근히 잠든{' '}
                    <strong>{librarianNames[librarian.id] || librarian.name} 사서</strong>를 살며시 깨우고 있어요...
                  </>
                ) : isBookRecommendationQuery(lastUserMessage) ? (
                  getRecommendationLoadingMessage(librarian.id)
                ) : (
                  ''
                )
              }
            />
          </div>
        )}
      </div>

      {/* 자동 스크롤 타깃 엘리먼트 */}
      <div ref={messagesEndRef} />
    </>
  );
}
