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

function MenuIcon() {
    return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" y1="6" x2="20" y2="6" />
            <line x1="4" y1="12" x2="20" y2="12" />
            <line x1="4" y1="18" x2="20" y2="18" />
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

    const goTo = useCallback((path) => {
        setShowProfileMenu(false);
        setShowMobileNavMenu(false);
        navigate(path);
    }, [navigate]);

    // 외부 클릭 시 프로필/모바일 메뉴 닫기
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (profileWrapRef.current && !profileWrapRef.current.contains(e.target)) {
                setShowProfileMenu(false);
            }
            if (navWrapRef.current && !navWrapRef.current.contains(e.target)) {
                setShowMobileNavMenu(false);
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
    useEffect(() => {
        setShowProfileMenu(false);
        setShowMobileNavMenu(false);
    }, [location.pathname]);

    const handleLogoClick = (e) => {
        if (window.innerWidth <= 768) {
            e.preventDefault();
            setShowMobileNavMenu((prev) => !prev);
        }
    };

    return (
        <>
            <header className={`gnb${isLibraryPage ? ' gnb--overlay' : ''}`}>
                <div className="gnb-left-wrap" ref={navWrapRef}>
                    <NavLink
                        to="/library"
                        className={`gnb-left${showMobileNavMenu ? ' active' : ''}`}
                        onClick={handleLogoClick}
                        aria-label={window.innerWidth <= 768 ? '메인 네비게이션 메뉴 열기' : '내 서재로 이동'}
                        aria-expanded={showMobileNavMenu}
                    >
                        <span className="gnb-logo-wrap">
                            <img className="gnb-logo" src={librarian?.logoImage || `/logo/logo_${librarian?.id || 'cat'}.png`} alt="Don't Paw-get Your Book 로고" width={32} height={32} decoding="async" />
                        </span>
                        <img className="gnb-service-name" src={librarian?.nameImage || `/name/name_${librarian?.id || 'cat'}.webp`} alt="Don't Paw-get Your Book" width={180} height={40} decoding="async" />
                        <span className="gnb-beta-badge gnb-beta-badge--desktop">
                            BETA
                        </span>
                        <span className="gnb-mobile-nav-arrow" aria-hidden="true">
                            {showMobileNavMenu ? '▴' : '▾'}
                        </span>
                    </NavLink>
                </div>

                {/* 데스크톱 상단 중앙 메뉴 */}
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

                    {/* 모바일 상단 우측: 전체 메뉴 열기 햄버거 버튼 */}
                    <button
                        className="gnb-mobile-menu-trigger-btn"
                        onClick={() => setShowMobileNavMenu((prev) => !prev)}
                        aria-label="전체 메뉴 열기"
                        title="전체 메뉴 열기"
                    >
                        <MenuIcon />
                    </button>

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

            {/* 모바일 상단 로고/햄버거 클릭 시 나타나는 전체 화면 네비게이션 메뉴 (소메뉴 미리보기 포함) */}
            {showMobileNavMenu && (
                <div className="gnb-fullscreen-nav-overlay" role="dialog" aria-modal="true" aria-label="전체 네비게이션 메뉴">
                    <div className="gnb-fullscreen-nav-container">
                        {/* 1. 모바일 전체 메뉴 헤더 */}
                        <div className="gnb-fullscreen-nav-header">
                            <div className="gnb-fullscreen-nav-brand">
                                <span className="gnb-logo-wrap">
                                    <img className="gnb-logo" src={librarian?.logoImage || `/logo/logo_${librarian?.id || 'cat'}.png`} alt="" width={32} height={32} decoding="async" />
                                </span>
                                <img className="gnb-service-name" src={librarian?.nameImage || `/name/name_${librarian?.id || 'cat'}.webp`} alt="Don't Paw-get Your Book" width={160} height={36} decoding="async" />
                                <span className="gnb-beta-badge">BETA</span>
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

                        {/* 2. 현재 사서 미니 프로필 카드 */}
                        <div
                            className="gnb-fullscreen-librarian-card"
                            onClick={() => goTo('/librarians')}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    goTo('/librarians');
                                }
                            }}
                        >
                            <img className="gnb-fullscreen-librarian-avatar" src={librarian.profileImage} alt="" width={44} height={44} decoding="async" />
                            <div className="gnb-fullscreen-librarian-info">
                                <div className="gnb-fullscreen-librarian-name-row">
                                    <strong className="gnb-fullscreen-librarian-name">{librarian.displayName} 사서</strong>
                                    <span className="gnb-fullscreen-librarian-badge">{librarian.species}</span>
                                </div>
                                <span className="gnb-fullscreen-librarian-genre">
                                    {librarian.specialtyGenre ? `#${librarian.specialtyGenre.split('·').join(' #')}` : '사서 라운지 바로가기'}
                                </span>
                            </div>
                            <span className="gnb-fullscreen-librarian-link">프로필 ➔</span>
                        </div>

                        {/* 3. 소메뉴 미리보기가 포함된 4대 핵심 메뉴 그리드 */}
                        <div className="gnb-fullscreen-nav-content">
                            <div className="gnb-fullscreen-nav-title">메뉴 바로가기</div>
                            <div className="gnb-fullscreen-menu-grid">
                                {/* 내 서재 */}
                                <NavLink
                                    to="/library"
                                    className={({ isActive }) => `gnb-fullscreen-card${isActive ? ' on' : ''}`}
                                    onClick={() => setShowMobileNavMenu(false)}
                                >
                                    <div className="gnb-fullscreen-card-head">
                                        <span className="gnb-fullscreen-card-icon"><LibraryIcon /></span>
                                        <strong className="gnb-fullscreen-card-title">내 서재</strong>
                                        <span className="gnb-fullscreen-card-arrow">➔</span>
                                    </div>
                                    <p className="gnb-fullscreen-card-desc">3D 인터랙티브 가상 서재 및 책장 도서 탐색</p>
                                    <div className="gnb-fullscreen-tags">
                                        <span className="gnb-fullscreen-tag">3D 가상 서재</span>
                                        <span className="gnb-fullscreen-tag">선반별 열람</span>
                                        <span className="gnb-fullscreen-tag">독서 상태 필터</span>
                                    </div>
                                </NavLink>

                                {/* 책 등록 */}
                                <NavLink
                                    to="/register"
                                    className={({ isActive }) => `gnb-fullscreen-card${isActive ? ' on' : ''}`}
                                    onClick={() => setShowMobileNavMenu(false)}
                                >
                                    <div className="gnb-fullscreen-card-head">
                                        <span className="gnb-fullscreen-card-icon"><RegisterIcon /></span>
                                        <strong className="gnb-fullscreen-card-title">책 등록</strong>
                                        <span className="gnb-fullscreen-card-arrow">➔</span>
                                    </div>
                                    <p className="gnb-fullscreen-card-desc">YES24 검색 &amp; 원스톱 내 서재 등록</p>
                                    <div className="gnb-fullscreen-tags">
                                        <span className="gnb-fullscreen-tag">YES24 도서 검색</span>
                                        <span className="gnb-fullscreen-tag">직접 입력</span>
                                        <span className="gnb-fullscreen-tag">표지·책등 커스텀</span>
                                    </div>
                                </NavLink>

                                {/* 독서 리포트 */}
                                <NavLink
                                    to="/reports"
                                    className={({ isActive }) => `gnb-fullscreen-card${isActive ? ' on' : ''}`}
                                    onClick={() => setShowMobileNavMenu(false)}
                                >
                                    <div className="gnb-fullscreen-card-head">
                                        <span className="gnb-fullscreen-card-icon"><ReportIcon /></span>
                                        <strong className="gnb-fullscreen-card-title">독서 리포트</strong>
                                        <span className="gnb-fullscreen-card-arrow">➔</span>
                                    </div>
                                    <p className="gnb-fullscreen-card-desc">월간 독서 통계 및 AI 성향 분석</p>
                                    <div className="gnb-fullscreen-tags">
                                        <span className="gnb-fullscreen-tag">월간 완독 차트</span>
                                        <span className="gnb-fullscreen-tag">장르 레이더</span>
                                        <span className="gnb-fullscreen-tag">AI 사서 총평</span>
                                    </div>
                                </NavLink>

                                {/* 마이페이지 */}
                                <NavLink
                                    to="/mypage"
                                    className={({ isActive }) => `gnb-fullscreen-card${isActive ? ' on' : ''}`}
                                    onClick={() => setShowMobileNavMenu(false)}
                                >
                                    <div className="gnb-fullscreen-card-head">
                                        <span className="gnb-fullscreen-card-icon"><UserIcon /></span>
                                        <strong className="gnb-fullscreen-card-title">마이페이지</strong>
                                        <span className="gnb-fullscreen-card-arrow">➔</span>
                                    </div>
                                    <p className="gnb-fullscreen-card-desc">독서 캘린더, 문장 스크랩 및 계정 설정</p>
                                    <div className="gnb-fullscreen-tags">
                                        <span className="gnb-fullscreen-tag">독서 잔디 캘린더</span>
                                        <span className="gnb-fullscreen-tag">문장 스크랩 갤러리</span>
                                        <span className="gnb-fullscreen-tag">사서 변경</span>
                                    </div>
                                </NavLink>
                            </div>
                        </div>

                        {/* 4. 모바일 전체 메뉴 푸터: 테마 전환 + 로그아웃 */}
                        <div className="gnb-fullscreen-footer">
                            <div className="gnb-fullscreen-theme-wrap">
                                <button
                                    type="button"
                                    className={`gnb-fullscreen-theme-btn${theme === 'light' ? ' on' : ''}`}
                                    onClick={() => setTheme('light')}
                                >
                                    <SunIcon />
                                    <span>라이트 모드</span>
                                </button>
                                <button
                                    type="button"
                                    className={`gnb-fullscreen-theme-btn${theme === 'dark' ? ' on' : ''}`}
                                    onClick={() => setTheme('dark')}
                                >
                                    <MoonIcon />
                                    <span>다크 모드</span>
                                </button>
                            </div>
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
