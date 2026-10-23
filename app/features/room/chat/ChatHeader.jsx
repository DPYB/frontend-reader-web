import { useLanguage } from '../../../store/languageStore';

export default function ChatHeader({
  librarian,
  chatMode,
  onNewChat,
  onClose,
}) {
  void chatMode;
  const { t } = useLanguage();

  return (
    <div className="lc-chat-header">
      <span className="lc-chat-header-title">
        🐾 {librarian.displayName || librarian.name}
      </span>
      <div className="lc-chat-header-actions">
        {/* ✨ 새 대화 버튼 */}
        <button
          type="button"
          className="lc-new-chat-btn"
          onClick={onNewChat}
          title={t('chat.newChatTitle', '현재 대화를 비우고 새로운 세션으로 대화를 시작합니다')}
        >
          {t('chat.newChat', '✨ 새 대화')}
        </button>

        <button
          type="button"
          className="lc-chat-close-btn"
          onClick={onClose}
          aria-label={t('common.close', '대화창 닫기')}
          title={t('common.close', '대화창 닫기')}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
