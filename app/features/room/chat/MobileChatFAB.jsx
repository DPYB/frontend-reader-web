import { useLanguage } from '../../../store/languageStore';

export default function MobileChatFAB({
  isMobile,
  open,
  setOpen,
  librarian,
  librarianNames,
  showMobileMenu,
  setShowMobileMenu,
  fabPos,
  onFabPointerDown,
  onOpenTimer,
  onOpenGuide,
  theme,
  setTheme,
  navigate,
}) {
  const { t, isEn } = useLanguage();

  if (open) return null;

  if (isMobile) {
    const isLeftDocked = fabPos
      ? fabPos.x < (typeof window !== 'undefined' ? window.innerWidth / 2 : 200)
      : false;
    const menuAlignClass = isLeftDocked ? 'align-left' : 'align-right';

    return (
      <>
        {showMobileMenu && (
          <div
            className="lc-mobile-menu-backdrop"
            onClick={() => setShowMobileMenu(false)}
            aria-hidden="true"
          />
        )}
        <div
          className={`lc-mobile-fab-wrap ${showMobileMenu ? 'menu-open' : ''}`}
          style={
            fabPos
              ? { left: `${fabPos.x}px`, top: `${fabPos.y}px` }
              : { right: '16px', bottom: '100px' }
          }
        >
          <button
            type="button"
            className={`lc-mobile-fab ${showMobileMenu ? 'active' : ''}`}
            onPointerDown={onFabPointerDown}
            aria-label={isEn ? 'Open librarian menu' : '사서 메뉴 열기'}
          >
            <div className="lc-mobile-fab-avatar">
              <img
                src={librarian.profileImage || librarian.image}
                alt={librarian.displayName || librarian.name}
                className="lc-mobile-fab-avatar-img"
              />
            </div>
            <span className="lc-mobile-fab-label">
              {librarianNames[librarian.id] || librarian.displayName || librarian.name}
            </span>
          </button>

          {showMobileMenu && (
            <div className={`lc-mobile-menu-popup ${menuAlignClass}`} role="menu">
              {/* 1. 사서와 대화하기 */}
              <button
                type="button"
                className="lc-mobile-menu-item"
                onClick={() => {
                  setShowMobileMenu(false);
                  setOpen(true);
                }}
                role="menuitem"
              >
                <span className="lc-mobile-menu-item-icon">💬</span>
                <div className="lc-mobile-menu-item-text">
                  <strong>{t('chat.chatWithLibrarian', '사서와 대화하기')}</strong>
                  <span>{t('chat.menuChatDesc', '도서 추천 & 독서 토론')}</span>
                </div>
              </button>
              {/* 2. 독서 타이머 */}
              <button
                type="button"
                className="lc-mobile-menu-item"
                onClick={() => {
                  setShowMobileMenu(false);
                  if (onOpenTimer) onOpenTimer();
                }}
                role="menuitem"
              >
                <span className="lc-mobile-menu-item-icon">⏱️</span>
                <div className="lc-mobile-menu-item-text">
                  <strong>{t('chat.menuTimerTitle', '독서 타이머')}</strong>
                  <span>{t('chat.menuTimerDesc', '독서 시간 측정 & 집중 기록')}</span>
                </div>
              </button>
              {/* 3. 사서 프로필 & 변경 */}
              <button
                type="button"
                className="lc-mobile-menu-item"
                onClick={() => {
                  setShowMobileMenu(false);
                  navigate('/librarians');
                }}
                role="menuitem"
              >
                <span className="lc-mobile-menu-item-icon">✨</span>
                <div className="lc-mobile-menu-item-text">
                  <strong>{t('chat.menuProfileTitle', '사서 프로필 & 변경')}</strong>
                  <span>{t('chat.menuProfileDesc', '다른 사서 프로필 둘러보기')}</span>
                </div>
              </button>
              {/* 4. 나이트모드 / 라이트모드 스위치 */}
              <button
                type="button"
                className="lc-mobile-menu-item"
                onClick={() => {
                  setTheme(theme === 'dark' ? 'light' : 'dark');
                }}
                role="menuitem"
              >
                <span className="lc-mobile-menu-item-icon">{theme === 'dark' ? '☀️' : '🌙'}</span>
                <div className="lc-mobile-menu-item-text">
                  <strong>
                    {theme === 'dark'
                      ? t('chat.menuThemeLight', '라이트 모드로 전환')
                      : t('chat.menuThemeDark', '다크 모드로 전환')}
                  </strong>
                  <span>
                    {theme === 'dark'
                      ? t('chat.menuThemeLightDesc', '밝고 화사한 화면')
                      : t('chat.menuThemeDarkDesc', '눈이 편안한 밤 화면')}
                  </span>
                </div>
              </button>
              {/* 5. 서비스 이용 가이드 */}
              <button
                type="button"
                className="lc-mobile-menu-item"
                onClick={() => {
                  setShowMobileMenu(false);
                  if (onOpenGuide) onOpenGuide();
                }}
                role="menuitem"
              >
                <span className="lc-mobile-menu-item-icon">📖</span>
                <div className="lc-mobile-menu-item-text">
                  <strong>{t('chat.menuGuideTitle', '서비스 이용 가이드')}</strong>
                  <span>{t('chat.menuGuideDesc', '서재 이용 팁 & 사용 안내')}</span>
                </div>
              </button>
            </div>
          )}
        </div>
      </>
    );
  }

  return (
    <div className="lc-chat-toggle-wrap">
      <button
        type="button"
        className="lc-chat-toggle-btn"
        onClick={() => setOpen(true)}
        aria-label={t('chat.askLibrarian', '사서에게 질문하기')}
      >
        <div className="lc-chat-toggle-avatar-wrap">
          <img
            src={librarian.profileImage || librarian.image}
            alt=""
            className="lc-chat-toggle-avatar"
            width={26}
            height={26}
          />
        </div>
        <span className="lc-chat-toggle-label">{t('chat.askLibrarian', '사서에게 질문하기')}</span>
      </button>
    </div>
  );
}
