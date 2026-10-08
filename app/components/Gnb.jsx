import { useState, useEffect, useRef, useCallback } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../store/themeStore';
import { useLibrarian } from '../store/librarianStore';
import { useAuth } from '../store/authStore';
import './Gnb.css';

function SunIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" />
        </svg>
    );
}

function MoonIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
    );
}

function LibraryIcon() {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m16 6 4 14" />
            <path d="M12 6v14" />
            <path d="M8 8v12" />
            <path d="M4 4v16" />
        </svg>
    );
}

function RegisterIcon() {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
            <path d="M12 8v6" />
            <path d="M9 11h6" />
        </svg>
    );
}

function ReportIcon() {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 3v18h18" />
            <path d="m19 9-5 5-4-4-3 3" />
        </svg>
    );
}

function UserIcon() {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
        </svg>
    );
}

function SparklesIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3z" />
        </svg>
    );
}

function LogoutIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
    );
}


function HamburgerIcon() {
    return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
    );
}

function CloseIcon() {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
    );
}

export default function Gnb() {
    const { theme, setTheme } = useTheme();
    const { librarian } = useLibrarian();
    const { logout } = useAuth();
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);
    const profileWrapRef = useRef(null);
    const [showMobileNavMenu, setShowMobileNavMenu] = useState(false);
    const [expandedSubmenu, setExpandedSubmenu] = useState(null); // 'register' | 'mypage' | null
    const navWrapRef = useRef(null);
    const navigate = useNavigate();
    const location = useLocation();

    // 내 서재 페이지에서는 GNB를 배경 이미지 위에 투명 오버레이로 띄운다
    const isLibraryPage = location.pathname === '/library';

    const handleLogout = useCallback(async () => {
        if (loggingOut) return;
        setLoggingOut(true);
        setShowProfileMenu(false);
        setShowMobileNavMenu(false);
        try {
            // backend-auth 로그아웃 (Refresh Token revoke + 쿠키 삭제) 후 메모리 토큰 제거
            await logout();
        } catch {
            // 로그아웃 실패해도 클라이언트 상태는 초기화하고 로그인 화면으로 이동
        } finally {
            navigate('/login');
        }
    }, [loggingOut, logout, navigate]);

    const goTo = useCallback((path, state) => {
        setShowProfileMenu(false);
        setShowMobileNavMenu(false);
        navigate(path, { state });
    }, [navigate]);

    // 외부 클릭 시 프로필/모바일 메뉴 닫기
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (profileWrapRef.current && !profileWrapRef.current.contains(e.target)) {
                setShowProfileMenu(false);
            }
        };
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                setShowProfileMenu(false);
                setShowMobileNavMenu(false);
            }
        };

        if (showProfileMenu || showMobileNavMenu) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleKeyDown);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [showProfileMenu, showMobileNavMenu]);

    // 페이지 변경 시 메뉴 닫기
    const prevPathRef = useRef(location.pathname);
    useEffect(() => {
        if (prevPathRef.current !== location.pathname) {
            prevPathRef.current = location.pathname;
            setShowProfileMenu((prev) => (prev ? false : prev));
            setShowMobileNavMenu((prev) => (prev ? false : prev));
        }
    }, [location.pathname]);

    const toggleSubmenu = (key, e) => {
        if (e) e.stopPropagation();
        setExpandedSubmenu((prev) => (prev === key ? null : key));
    };

    const handleBrandClick = (e) => {
        if (e) e.preventDefault();
        setShowMobileNavMenu((prev) => !prev);
    };

    return (
        <>
            <header className={`gnb${isLibraryPage ? ' gnb--overlay' : ''}`}>
                {/* 1. 모바일 좌측: 햄버거 메뉴 버튼 (누르면 서비스 이름 전환 및 드로어 토글) */}
                <div className="gnb-mobile-left" ref={navWrapRef}>
                    <button
                        type="button"
                        className={`gnb-mobile-hamburger-btn${showMobileNavMenu ? ' active' : ''}`}
                        onClick={handleBrandClick}
                        aria-label={showMobileNavMenu ? "메뉴 닫기" : "메뉴 열기"}
                        aria-expanded={showMobileNavMenu}
                    >
                        {showMobileNavMenu ? (
                            <img
                                className="gnb-service-name gnb-service-name--header"
                                src={librarian?.nameImage || `/name/name_${librarian?.id || 'cat'}.webp`}
                                alt="Don't Paw-get Your Book"
                                width={150}
                                height={36}
                                decoding="async"
                            />
                        ) : (
                            <span className="gnb-hamburger-icon-wrap">
                                <HamburgerIcon />
                            </span>
                        )}
                    </button>
                </div>

                {/* 2. 데스크톱 좌측: 로고 + 서비스 이름 (적절한 크기로 축소) */}
                <div className="gnb-desktop-brand">
                    <NavLink
                        to="/library"
                        className="gnb-desktop-brand-link"
                        aria-label="내 서재로 이동"
                    >
                        <span className="gnb-logo-wrap gnb-logo-wrap--desktop">
                            <img
                                className="gnb-logo"
                                src={librarian?.logoImage || `/logo/logo_${librarian?.id || 'cat'}.png`}
                                alt="Don't Paw-get Your Book 로고"
                                width={48}
                                height={48}
                                decoding="async"
                            />
                        </span>
                        <img
                            className="gnb-service-name gnb-service-name--desktop"
                            src={librarian?.nameImage || `/name/name_${librarian?.id || 'cat'}.webp`}
                            alt="Don't Paw-get Your Book"
                            width={160}
                            height={38}
                            decoding="async"
                        />
                        <span className="gnb-beta-badge gnb-beta-badge--desktop">
                            BETA
                        </span>
                    </NavLink>
                </div>

                {/* 3. 모바일 상단 중앙: 원형 glass 효과 배경 로고 */}
                <div className="gnb-mobile-center-logo">
                    <NavLink
                        to="/library"
                        className="gnb-mobile-glass-logo-link"
                        aria-label="내 서재로 이동"
                    >
                        <span className="gnb-logo-wrap gnb-logo-wrap--glass">
                            <img
                                className="gnb-logo"
                                src={librarian?.logoImage || `/logo/logo_${librarian?.id || 'cat'}.png`}
                                alt="Don't Paw-get Your Book 로고"
                                width={44}
                                height={44}
                                decoding="async"
                            />
                        </span>
                    </NavLink>
                </div>

                {/* 4. 데스크톱 상단 중앙: 네비게이션 메뉴 (중앙으로 다시 이동) */}
                <nav className="gnb-menu" aria-label="메인 메뉴">
                    <NavLink to="/library" className={({ isActive }) => (isActive ? 'on' : undefined)}>내 서재</NavLink>
                    <NavLink to="/register" className={({ isActive }) => (isActive ? 'on' : undefined)}>책 등록</NavLink>
                    <NavLink to="/reports" className={({ isActive }) => (isActive ? 'on' : undefined)}>독서 리포트</NavLink>
                    <NavLink to="/mypage" className={({ isActive }) => (isActive ? 'on' : undefined)}>마이페이지</NavLink>
                </nav>

                <div className="gnb-right">
                    {/* 모바일 상단: BETA 뱃지 */}
                    <span className="gnb-beta-badge gnb-beta-badge--mobile">
                        BETA
                    </span>

                    {/* 데스크톱 로그아웃 버튼 */}
                    <button className="gnb-logout-btn" onClick={handleLogout} disabled={loggingOut}>
                        {loggingOut ? '로그아웃 중...' : '로그아웃'}
                    </button>

                    <div className="gnb-profile-wrap" ref={profileWrapRef}>
                        <button
                            className={`gnb-profile-btn${showProfileMenu ? ' active' : ''}`}
                            onClick={() => setShowProfileMenu((prev) => !prev)}
                            aria-label="사서 프로필 메뉴"
                            aria-expanded={showProfileMenu}
                            aria-haspopup="dialog"
                        >
                            <span className="gnb-profile-name">{librarian.displayName}</span>
                            <div className="gnb-profile-avatar-wrap">
                                <img className="gnb-profile" src={librarian.profileImage} alt={`${librarian.displayName} 프로필`} width={32} height={32} decoding="async" />
                            </div>
                        </button>

                        {/* 프로필 팝업 / 바텀 시트 */}
                        {showProfileMenu && (
                            <>
                                <div
                                    className="gnb-profile-backdrop"
                                    onClick={() => setShowProfileMenu(false)}
                                    aria-hidden="true"
                                />
                                <div className="gnb-profile-sheet" role="dialog" aria-modal="true" aria-label="사서 프로필 상세">
                                    <div className="gnb-sheet-handle" />
                                    <div className="gnb-sheet-header">
                                        <div className="gnb-sheet-librarian-avatar">
                                            <img src={librarian.profileImage} alt="" width={56} height={56} decoding="async" />
                                        </div>
                                        <div className="gnb-sheet-librarian-info">
                                            <div className="gnb-sheet-name-row">
                                                <strong className="gnb-sheet-name">{librarian.displayName}</strong>
                                                <span className="gnb-sheet-species">{librarian.species}</span>
                                            </div>
                                            {librarian.specialtyGenre && (
                                                <span className="gnb-sheet-specialty">
                                                    #{librarian.specialtyGenre.split('·').join(' #')}
                                                </span>
                                            )}
                                        </div>
                                        <button
                                            className="gnb-sheet-close-btn"
                                            onClick={() => setShowProfileMenu(false)}
                                            aria-label="닫기"
                                        >
                                            <CloseIcon />
                                        </button>
                                    </div>

                                    {librarian.catchphrase && (
                                        <div className="gnb-sheet-quote">
                                            <p className="gnb-sheet-quote-text">&ldquo;{librarian.catchphrase}&rdquo;</p>
                                        </div>
                                    )}

                                    <div className="gnb-sheet-actions">
                                        <div className="gnb-sheet-action-row">
                                            <button className="gnb-sheet-btn gnb-sheet-btn--primary" onClick={() => goTo('/librarians')}>
                                                <SparklesIcon />
                                                <span>사서 프로필</span>
                                            </button>

                                            <div className="gnb-theme">
                                                <button
                                                    className={theme === 'light' ? 'on' : undefined}
                                                    onClick={() => setTheme('light')}
                                                    aria-label="라이트 모드 선택"
                                                >
                                                    <SunIcon />
                                                </button>
                                                <button
                                                    className={theme === 'dark' ? 'on' : undefined}
                                                    onClick={() => setTheme('dark')}
                                                    aria-label="다크 모드 선택"
                                                >
                                                    <MoonIcon />
                                                </button>
                                            </div>
                                        </div>

                                        <button className="gnb-sheet-btn gnb-sheet-btn--logout" onClick={handleLogout} disabled={loggingOut}>
                                            <LogoutIcon />
                                            <span>{loggingOut ? '로그아웃 중...' : '로그아웃'}</span>
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </header>

            {/* 모바일 햄버거 버튼 클릭 시 나타나는 85% 드로어 네비게이션 메뉴 (토글 소메뉴 포함) */}
            {showMobileNavMenu && (
                <div
                    className="gnb-fullscreen-nav-overlay"
                    role="dialog"
                    aria-modal="true"
                    aria-label="네비게이션 메뉴"
                    onClick={() => setShowMobileNavMenu(false)}
                >
                    <div
                        className="gnb-fullscreen-nav-container"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* 1. 모바일 전체 메뉴 헤더 (누른 후에는 로고가 아닌 서비스 이름 노출) */}
                        <div className="gnb-fullscreen-nav-header">
                            <div className="gnb-fullscreen-nav-brand" onClick={() => goTo('/library')}>
                                <img
                                    className="gnb-service-name gnb-service-name--drawer"
                                    src={librarian?.nameImage || `/name/name_${librarian?.id || 'cat'}.webp`}
                                    alt="Don't Paw-get Your Book"
                                    width={160}
                                    height={38}
                                    decoding="async"
                                />
                            </div>
                            <button
                                type="button"
                                className="gnb-fullscreen-close-btn"
                                onClick={() => setShowMobileNavMenu(false)}
                                aria-label="메뉴 닫기"
                            >
                                <CloseIcon />
                            </button>
                        </div>

                        {/* 2. 깔끔한 메뉴 리스트 (가운데 정렬 + 토글 소메뉴) */}
                        <nav className="gnb-fullscreen-nav-list" aria-label="모바일 메뉴 목록">
                            {/* 1. 내 서재 */}
                            <div className="gnb-fullscreen-nav-item-wrap">
                                <NavLink
                                    to="/library"
                                    className={({ isActive }) => `gnb-fullscreen-nav-link${isActive ? ' on' : ''}`}
                                    onClick={() => setShowMobileNavMenu(false)}
                                >
                                    <span className="gnb-fullscreen-nav-icon"><LibraryIcon /></span>
                                    <span className="gnb-fullscreen-nav-label">내 서재</span>
                                </NavLink>
                            </div>

                            {/* 2. 책 등록 (토글 기능 포함: 도서 검색 -> ISBN·표지 촬영 -> 직접 입력) */}
                            <div className="gnb-fullscreen-nav-item-wrap">
                                <div className="gnb-fullscreen-nav-row">
                                    <NavLink
                                        to="/register"
                                        className={({ isActive }) => `gnb-fullscreen-nav-link${isActive ? ' on' : ''}`}
                                        onClick={() => setShowMobileNavMenu(false)}
                                    >
                                        <span className="gnb-fullscreen-nav-icon"><RegisterIcon /></span>
                                        <span className="gnb-fullscreen-nav-label">책 등록</span>
                                    </NavLink>
                                    <button
                                        type="button"
                                        className={`gnb-fullscreen-nav-toggle${expandedSubmenu === 'register' ? ' open' : ''}`}
                                        onClick={(e) => toggleSubmenu('register', e)}
                                        aria-label="책 등록 세부 기능 토글"
                                    >
                                        <span className="gnb-fullscreen-toggle-arrow">{expandedSubmenu === 'register' ? '▲' : '▼'}</span>
                                    </button>
                                </div>
                                {expandedSubmenu === 'register' && (
                                    <div className="gnb-fullscreen-sublist">
                                        <button
                                            type="button"
                                            className="gnb-fullscreen-subitem"
                                            onClick={() => goTo('/register', { tab: 'search' })}
                                        >
                                            <span className="gnb-fullscreen-subicon">🔍</span>
                                            <span>도서 검색</span>
                                        </button>
                                        <button
                                            type="button"
                                            className="gnb-fullscreen-subitem"
                                            onClick={() => goTo('/register', { tab: 'camera' })}
                                        >
                                            <span className="gnb-fullscreen-subicon">📷</span>
                                            <span>ISBN·표지 촬영</span>
                                        </button>
                                        <button
                                            type="button"
                                            className="gnb-fullscreen-subitem"
                                            onClick={() => goTo('/register', { tab: 'manual' })}
                                        >
                                            <span className="gnb-fullscreen-subicon">✍️</span>
                                            <span>직접 입력</span>
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* 3. 독서 리포트 */}
                            <div className="gnb-fullscreen-nav-item-wrap">
                                <NavLink
                                    to="/reports"
                                    className={({ isActive }) => `gnb-fullscreen-nav-link${isActive ? ' on' : ''}`}
                                    onClick={() => setShowMobileNavMenu(false)}
                                >
                                    <span className="gnb-fullscreen-nav-icon"><ReportIcon /></span>
                                    <span className="gnb-fullscreen-nav-label">독서 리포트</span>
                                </NavLink>
                            </div>

                            {/* 4. 마이페이지 (토글 기능 포함: 사서 프로필 제외) */}
                            <div className="gnb-fullscreen-nav-item-wrap">
                                <div className="gnb-fullscreen-nav-row">
                                    <NavLink
                                        to="/mypage"
                                        className={({ isActive }) => `gnb-fullscreen-nav-link${isActive ? ' on' : ''}`}
                                        onClick={() => setShowMobileNavMenu(false)}
                                    >
                                        <span className="gnb-fullscreen-nav-icon"><UserIcon /></span>
                                        <span className="gnb-fullscreen-nav-label">마이페이지</span>
                                    </NavLink>
                                    <button
                                        type="button"
                                        className={`gnb-fullscreen-nav-toggle${expandedSubmenu === 'mypage' ? ' open' : ''}`}
                                        onClick={(e) => toggleSubmenu('mypage', e)}
                                        aria-label="마이페이지 세부 기능 토글"
                                    >
                                        <span className="gnb-fullscreen-toggle-arrow">{expandedSubmenu === 'mypage' ? '▲' : '▼'}</span>
                                    </button>
                                </div>
                                {expandedSubmenu === 'mypage' && (
                                    <div className="gnb-fullscreen-sublist">
                                        <button
                                            type="button"
                                            className="gnb-fullscreen-subitem"
                                            onClick={() => goTo('/mypage', { tab: 'books' })}
                                        >
                                            <span className="gnb-fullscreen-subicon">📚</span>
                                            <span>독서 리스트</span>
                                        </button>
                                        <button
                                            type="button"
                                            className="gnb-fullscreen-subitem"
                                            onClick={() => goTo('/mypage', { tab: 'calendar' })}
                                        >
                                            <span className="gnb-fullscreen-subicon">📅</span>
                                            <span>독서 캘린더</span>
                                        </button>
                                        <button
                                            type="button"
                                            className="gnb-fullscreen-subitem"
                                            onClick={() => goTo('/mypage', { tab: 'profile' })}
                                        >
                                            <span className="gnb-fullscreen-subicon">👤</span>
                                            <span>내 정보</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        </nav>

                        {/* 3. 모바일 전체 메뉴 푸터: 로그아웃 */}
                        <div className="gnb-fullscreen-footer">
                            <button
                                type="button"
                                className="gnb-fullscreen-logout-btn"
                                onClick={handleLogout}
                                disabled={loggingOut}
                            >
                                <LogoutIcon />
                                <span>{loggingOut ? '로그아웃 중...' : '로그아웃'}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
