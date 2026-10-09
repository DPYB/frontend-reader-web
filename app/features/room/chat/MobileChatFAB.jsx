export default function MobileChatFAB({
  isMobile,
  open,
  setOpen,
  librarian,
  librarianNames,
  clickMotion,
  showMobileMenu,
  setShowMobileMenu,
  fabPos,
  onFabPointerDown,
  onOpenTimer,
  theme,
  setTheme,
  navigate,
}) {
  if (open) return null;

  if (isMobile) {
    const isSpecialMotion = clickMotion;
    const isCat = librarian.id === 'cat';
    const isStork = librarian.id === 'stork';
    const isNudi = librarian.id === 'nudi';
    const isGecko = librarian.id === 'gecko';

    return (
      <>
        {showMobileMenu && (
          <div
            className="lc-mobile-backdrop"
            onClick={() => setShowMobileMenu(false)}
          />
        )}
        <div
          className="lc-mobile-fab-wrap"
          style={
            fabPos
              ? { left: `${fabPos.x}px`, top: `${fabPos.y}px` }
              : { right: '16px', bottom: '100px' }
          }
        >
          <button
            type="button"
            className={`lc-mobile-fab-btn ${showMobileMenu ? 'active' : ''}`}
            onPointerDown={onFabPointerDown}
            aria-label="사서 메뉴 열기"
          >
            <div className="lc-mobile-fab-avatar">
              <img
                src={
                  isSpecialMotion && isCat
                    ? '/cursors/cat_hover.webp'
                    : isSpecialMotion && isStork
                      ? '/cursors/shoebill_hover.webp'
                      : isSpecialMotion && isNudi
                        ? '/cursors/nudi_hover.webp'
                        : isSpecialMotion && isGecko
                          ? '/cursors/gecko_hover.webp'
                          : librarian.avatar || librarian.image
                }
                alt={librarian.displayName || librarian.name}
                className="lc-mobile-fab-avatar-img"
              />
            </div>
            <span className="lc-mobile-fab-label">
              {librarianNames[librarian.id] || librarian.displayName || librarian.name}
            </span>
          </button>

          {showMobileMenu && (
            <div className="lc-mobile-menu-popup" role="menu">
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
                  <strong>사서와 대화하기</strong>
                  <span>도서 추천 <span className="lc-ampersand">&amp;</span> 독서 토론</span>
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
                  <strong>독서 타이머</strong>
                  <span>독서 시간 측정 <span className="lc-ampersand">&amp;</span> 집중 기록</span>
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
                  <strong>사서 프로필 <span className="lc-ampersand">&amp;</span> 변경</strong>
                  <span>다른 사서 프로필 둘러보기</span>
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
                  <strong>{theme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'}</strong>
                  <span>{theme === 'dark' ? '밝고 화사한 화면' : '눈이 편안한 밤 화면'}</span>
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
        aria-label="사서에게 질문하기"
      >
        <span className="lc-chat-toggle-icon">💬</span>
        사서에게 질문하기
      </button>
    </div>
  );
}
