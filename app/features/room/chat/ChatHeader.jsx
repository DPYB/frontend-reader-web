import { useState } from 'react';

export default function ChatHeader({
  librarian,
  chatMode,
  onNewChat,
  onClose,
}) {
  const [showHelp, setShowHelp] = useState(false);

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
          title="현재 대화를 비우고 새로운 세션으로 대화를 시작합니다"
        >
          ✨ 새 대화
        </button>

        {/* 모드별 맞춤 도움말 (?) 툴팁 - 상단 고정 */}
        <div
          className="lc-help-btn-wrap"
          onMouseEnter={() => setShowHelp(true)}
          onMouseLeave={() => setShowHelp(false)}
        >
          <span className="lc-help-btn" aria-label="도움말">
            ?
          </span>
          {showHelp && (
            <div className={`lc-help-popover ${chatMode === 'debate' ? 'debate-mode' : ''}`}>
              {chatMode === 'chat' && (
                <>
                  <strong>💬 추천 대화 가이드</strong>
                  <br />· 따뜻하고 힐링되는 소설 추천해줘
                  <br />· 오늘 날씨에 어울리는 책 있어?
                  <br />· 아몬드라는 책 어때?
                </>
              )}
              {chatMode === 'library' && (
                <>
                  <strong>📚 AI 서재 검색 가이드</strong>
                  <br />· 상단: 제목/저자 빠른 필터
                  <br />· 하단: AI 자연어 질의
                  <br /><em>(예: "읽고 있는 책 보여줘")</em>
                </>
              )}
              {chatMode === 'debate' && (
                <>
                  <strong>💡 4인 AI 독서 토론 가이드</strong>
                  <br />· <strong>평론가(이동진)</strong>: 미학·복선·화두
                  <br />· <strong>이야기꾼(설민석)</strong>: 시대 배경·교훈
                  <br />· <strong>상담사(오은영)</strong>: 인물 심리·공감
                  <br />· <strong>관찰가(강형욱)</strong>: 본능·행동 시그널
                </>
              )}
            </div>
          )}
        </div>

        <button
          type="button"
          className="lc-chat-close-btn"
          onClick={onClose}
          aria-label="대화창 닫기"
          title="대화창 닫기"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
