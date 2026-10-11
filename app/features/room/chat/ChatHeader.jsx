import { useState } from 'react';
import { useLanguage } from '../../../store/languageStore';

export default function ChatHeader({
  librarian,
  chatMode,
  onNewChat,
  onClose,
}) {
  const [showHelp, setShowHelp] = useState(false);
  const { t, isEn } = useLanguage();

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

        {/* 모드별 맞춤 도움말 (?) 툴팁 - 상단 고정 */}
        <div
          className="lc-help-btn-wrap"
          onMouseEnter={() => setShowHelp(true)}
          onMouseLeave={() => setShowHelp(false)}
        >
          <span className="lc-help-btn" aria-label={t('chat.helpTitle', '도움말')}>
            ?
          </span>
          {showHelp && (
            <div className={`lc-help-popover ${chatMode === 'debate' ? 'debate-mode' : ''}`}>
              {chatMode === 'chat' && (
                isEn ? (
                  <>
                    <strong>💬 Recommendation Guide</strong>
                    <br />· Recommend a warm and healing novel
                    <br />· Any book that fits today's weather?
                    <br />· What do you think about Almond?
                  </>
                ) : (
                  <>
                    <strong>💬 추천 대화 가이드</strong>
                    <br />· 따뜻하고 힐링되는 소설 추천해줘
                    <br />· 오늘 날씨에 어울리는 책 있어?
                    <br />· 아몬드라는 책 어때?
                  </>
                )
              )}
              {chatMode === 'library' && (
                isEn ? (
                  <>
                    <strong>📚 AI Library Search Guide</strong>
                    <br />· Top: Quick filter by title/author
                    <br />· Bottom: Natural language query
                    <br /><em>(e.g., "Show me books I am reading")</em>
                  </>
                ) : (
                  <>
                    <strong>📚 AI 서재 검색 가이드</strong>
                    <br />· 상단: 제목/저자 빠른 필터
                    <br />· 하단: AI 자연어 질의
                    <br /><em>(예: "읽고 있는 책 보여줘")</em>
                  </>
                )
              )}
              {chatMode === 'debate' && (
                isEn ? (
                  <>
                    <strong>💡 4 AI Debaters Guide</strong>
                    <br />· <strong>Critic (Dong-jin Lee)</strong>: Aesthetics & topics
                    <br />· <strong>Storyteller (Min-seok Seol)</strong>: History & lessons
                    <br />· <strong>Counselor (Eun-young Oh)</strong>: Empathy & psychology
                    <br />· <strong>Observer (Hyeong-wook Kang)</strong>: Instinct & actions
                  </>
                ) : (
                  <>
                    <strong>💡 4인 AI 독서 토론 가이드</strong>
                    <br />· <strong>평론가(이동진)</strong>: 미학·복선·화두
                    <br />· <strong>이야기꾼(설민석)</strong>: 시대 배경·교훈
                    <br />· <strong>상담사(오은영)</strong>: 인물 심리·공감
                    <br />· <strong>관찰가(강형욱)</strong>: 본능·행동 시그널
                  </>
                )
              )}
            </div>
          )}
        </div>

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
