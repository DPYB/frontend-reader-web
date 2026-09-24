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
    const { logout, isGuest } = useAuth();
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);
    const profileWrapRef = useRef(null);
    const navigate = useNavigate();
    const location = useLocation();

    // 내 서재 페이지에서는 GNB를 배경 이미지 위에 투명 오버레이로 띄운다
    const isLibraryPage = location.pathname === '/library';

    const handleLogout = useCallback(async () => {
        if (loggingOut) return;
        setLoggingOut(true);
        setShowProfileMenu(false);
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
        navigate(path);
    }, [navigate]);

    // 외부 클릭 시 프로필 메뉴 닫기
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (profileWrapRef.current && !profileWrapRef.current.contains(e.target)) {
                setShowProfileMenu(false);
            }
        };
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                setShowProfileMenu(false);
            }
        };

        if (showProfileMenu) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleKeyDown);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [showProfileMenu]);

    // 페이지 변경 시 프로필 메뉴 닫기
    useEffect(() => {
        setShowProfileMenu(false);
    }, [location.pathname]);

    return (
        <>
            <header className={`gnb${isLibraryPage ? ' gnb--overlay' : ''}`}>
                <NavLink to="/library" className="gnb-left" aria-label="내 서재로 이동">
                    <span className="gnb-logo-wrap">
                        <img className="gnb-logo" src={librarian?.logoImage || `/logo/logo_${librarian?.id || 'cat'}.png`} alt="Don't Paw-get Your Book 로고" width={30} height={30} decoding="async" />
                    </span>
                    <img className="gnb-service-name" src={librarian?.nameImage || `/name/name_${librarian?.id || 'cat'}.png`} alt="Don't Paw-get Your Book" width={174} height={25} decoding="async" />
                    {isGuest && (
                        <span className="gnb-guest-badge">
                            🐾 체험 모드
                        </span>
                    )}
                </NavLink>

                {/* 데스크톱 상단 중앙 메뉴 (모바일에서는 하단 탭바) */}
                <nav className="gnb-menu" aria-label="메인 메뉴">
                    <NavLink to="/library" className={({ isActive }) => (isActive ? 'on' : undefined)}>내 서재</NavLink>
                    <NavLink to="/register" className={({ isActive }) => (isActive ? 'on' : undefined)}>책 등록</NavLink>
                    <NavLink to="/reports" className={({ isActive }) => (isActive ? 'on' : undefined)}>독서 리포트</NavLink>
                    <NavLink to="/mypage" className={({ isActive }) => (isActive ? 'on' : undefined)}>마이페이지</NavLink>
                </nav>

                <div className="gnb-right">
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
                                        <button className="gnb-sheet-btn gnb-sheet-btn--primary" onClick={() => goTo('/librarians')}>
                                            <SparklesIcon />
                                            <span>사서 프로필 & 변경</span>
                                        </button>

                                        {/* 프로필 메뉴 내 테마 빠른 토글 */}
                                        <div className="gnb-sheet-theme-row">
                                            <span className="gnb-sheet-theme-label">화면 테마</span>
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

            {/* 모바일 하단 고정 네비게이션 탭바 */}
            <nav className="gnb-mobile-bottom-bar" aria-label="모바일 하단 내비게이션">
                <NavLink
                    to="/library"
                    className={({ isActive }) => `gnb-mobile-tab${isActive ? ' on' : ''}`}
                    aria-label="내 서재"
                >
                    <span className="gnb-mobile-tab-icon">
                        <LibraryIcon />
                    </span>
                    <span className="gnb-mobile-tab-label">내 서재</span>
                </NavLink>

                <NavLink
                    to="/register"
                    className={({ isActive }) => `gnb-mobile-tab${isActive ? ' on' : ''}`}
                    aria-label="책 등록"
                >
                    <span className="gnb-mobile-tab-icon">
                        <RegisterIcon />
                    </span>
                    <span className="gnb-mobile-tab-label">책 등록</span>
                </NavLink>

                <NavLink
                    to="/reports"
                    className={({ isActive }) => `gnb-mobile-tab${isActive ? ' on' : ''}`}
                    aria-label="독서 리포트"
                >
                    <span className="gnb-mobile-tab-icon">
                        <ReportIcon />
                    </span>
                    <span className="gnb-mobile-tab-label">독서 리포트</span>
                </NavLink>

                <NavLink
                    to="/mypage"
                    className={({ isActive }) => `gnb-mobile-tab${isActive ? ' on' : ''}`}
                    aria-label="마이페이지"
                >
                    <span className="gnb-mobile-tab-icon">
                        <UserIcon />
                    </span>
                    <span className="gnb-mobile-tab-label">마이페이지</span>
                </NavLink>
            </nav>
        </>
    );
}
