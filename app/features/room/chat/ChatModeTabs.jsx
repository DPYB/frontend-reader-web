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
        className={`lc-mode-tab lc-mode-tab--disabled ${chatMode === 'debate' ? 'active' : ''}`}
        disabled
        aria-disabled="true"
        title={t('chat.modeDebateDisabled', '토론 모드는 준비 중입니다.')}
      >
        <span>{t('chat.modeDebate', '💡 토론')}</span>
        <span className="lc-mode-tab-tag">{t('chat.modeDebateTag', '준비중')}</span>
      </button>
    </div>
  );
}
