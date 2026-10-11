import { useLanguage } from '../../../store/languageStore';

export default function ChatModeTabs({
  chatMode,
  onChangeMode,
}) {
  const { t } = useLanguage();

  return (
    <div className="lc-mode-tabs">
      <button
        type="button"
        className={`lc-mode-tab ${chatMode === 'library' ? 'active' : ''}`}
        onClick={() => onChangeMode('library')}
      >
        {t('chat.modeLibrary', '📚 내 서재')}
      </button>
      <button
        type="button"
        className={`lc-mode-tab ${chatMode === 'chat' ? 'active' : ''}`}
        onClick={() => onChangeMode('chat')}
      >
        {t('chat.modeChat', '💬 대화·추천')}
      </button>
      <button
        type="button"
        className={`lc-mode-tab ${chatMode === 'debate' ? 'active' : ''}`}
        onClick={() => onChangeMode('debate')}
      >
        {t('chat.modeDebate', '💡 토론')}
      </button>
    </div>
  );
}
