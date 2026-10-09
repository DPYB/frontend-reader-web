export default function ChatModeTabs({
  chatMode,
  onChangeMode,
}) {
  return (
    <div className="lc-mode-tabs">
      <button
        type="button"
        className={`lc-mode-tab ${chatMode === 'library' ? 'active' : ''}`}
        onClick={() => onChangeMode('library')}
      >
        📚 내 서재
      </button>
      <button
        type="button"
        className={`lc-mode-tab ${chatMode === 'chat' ? 'active' : ''}`}
        onClick={() => onChangeMode('chat')}
      >
        💬 대화·추천
      </button>
      <button
        type="button"
        className={`lc-mode-tab ${chatMode === 'debate' ? 'active' : ''}`}
        onClick={() => onChangeMode('debate')}
      >
        💡 토론
      </button>
    </div>
  );
}
