import { useLanguage } from '../../../store/languageStore';

export default function ChatInputForm({
  input,
  setInput,
  loading,
  chatMode,
  selectedDebateBook,
  selectedDebatePersona,
  maxMessageLength,
  onSubmit,
}) {
  const { t, isEn } = useLanguage();

  const getPlaceholder = () => {
    if (loading) {
      return chatMode === 'debate'
        ? t('chat.inputPlaceholderDebateThinking', '토론 답변을 생각하는 중...')
        : t('chat.inputPlaceholderThinking', '답변을 생각하는 중...');
    }
    if (chatMode === 'debate') {
      if (isEn) {
        return selectedDebateBook
          ? `Ask ${selectedDebatePersona.name} about 《${selectedDebateBook.title}》`
          : `Share your thoughts or debate topic with ${selectedDebatePersona.name}`;
      }
      return selectedDebateBook
        ? `${selectedDebatePersona.name}에게 《${selectedDebateBook.title}》에 대한 생각이나 질문을 던져보세요`
        : `${selectedDebatePersona.name}에게 나누고 싶은 생각이나 토론 주제를 던져보세요`;
    }
    if (chatMode === 'library') {
      return t('chat.inputPlaceholderLibrary', '내 서재에 대해 자연어로 물어보세요 (예: 읽고 있는 책 보여줘)');
    }
    return t('chat.inputPlaceholderDefault', '무엇이든 물어보세요 (추천·검색·날씨 등)');
  };

  return (
    <form onSubmit={onSubmit} className="lc-chat-input-form">
      <div className="lc-chat-input-row">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value.slice(0, maxMessageLength))}
          maxLength={maxMessageLength}
          placeholder={getPlaceholder()}
          disabled={loading}
          className="lc-chat-input-field"
        />
        <button
          type="submit"
          disabled={loading}
          className="lc-chat-input-submit-btn"
        >
          ↵
        </button>
      </div>
      {/* 2000자에 근접했을 때만 카운터를 노출 */}
      {input.length > maxMessageLength * 0.8 && (
        <span
          className={`lc-chat-input-counter ${input.length >= maxMessageLength ? 'max-exceeded' : ''}`}
        >
          {input.length}/{maxMessageLength}
        </span>
      )}
    </form>
  );
}
