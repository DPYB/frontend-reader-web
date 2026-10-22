import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../store/authStore';
import { useLanguage } from '../store/languageStore';
import { AUTH_BYPASS } from '../store/authBypass';
import { ApiError } from '../api/authApi';
import { renderGoogleButton, triggerGoogleLogin, triggerKakaoLogin } from '../utils/socialAuth';
import ServiceGuideModal from '../features/guide/ServiceGuideModal';
import { shouldShowGuideModal, isGuideSeenInSession } from '../features/guide/guideStorage';
import { cdnUrl } from '../config/cdn';
import './LoginPage.css';

// 로그인 배경 이미지 — Cloudflare R2 `dpyb-public/background_UI/login/` (CDN: cdn.ai0208.xyz)
const LOGIN_BG_KO = cdnUrl('background_UI/login/login-bg.webp');
const LOGIN_BG_EN = cdnUrl('background_UI/login/login_eng.webp');

/**
 * 버튼/입력필드 이미지는 2560x1440 전체 화면 레이어 (투명 배경 + 위치 고정).
 */
const BUTTONS = [
  {
    id: 'login',
    src: '/button/login_btn.webp',
    tooltipKo: '로그인',
    tooltipEn: 'Log In',
    left: 55.9, top: 61.9, width: 5.6, height: 8.8,
  },
  {
    id: 'signup',
    src: '/button/signup_btn.webp',
    tooltipKo: '회원가입',
    tooltipEn: 'Sign Up',
    left: 40.9, top: 61.5, width: 7.8, height: 8.5,
  },
  {
    id: 'password',
    src: '/button/forgotpw_btn.webp',
    tooltipKo: '비밀번호 찾기 (BETA 기간 준비 중)',
    tooltipEn: 'Forgot Password (Coming Soon)',
    left: 50.2, top: 62.1, width: 4.3, height: 7.2,
  },
  {
    id: 'eye',
    // 비밀번호 보기 토글: 평소엔 회색(paw_gray), 누르면 비밀번호가 보이는 3초간
    // 분홍(paw_pink)으로 바뀌고 다시 회색으로 돌아온다. (아래 map에서 eyeActive로 스왑)
    src: '/button/paw_gray.webp',
    srcActive: '/button/paw_pink.webp',
    tooltipKo: '비밀번호 보기',
    tooltipEn: 'Show Password',
    left: 59.2, top: 53.3, width: 2.2, height: 3.8,
  },
  /*
   * 하단 3버튼 (2026-09 신규 UI). 기존 버튼들과 동일한 방식 — 배경 시안에 버튼이
   * 그려져 있고, 같은 좌표의 투명 2560x1440 레이어를 덮어 hover 밝기 효과를 준다.
   */
  {
    id: 'dpyb',
    src: '/button/dpyb_btn.webp',
    tooltipKo: 'DPYB 체험하기 (로그인 없이 둘러보기)',
    tooltipEn: 'Try Out DPYB (Explore without login)',
    left: 44.0, top: 80.42, width: 13.98, height: 3.75,
  },
  {
    id: 'kakao',
    src: '/button/kakao_btn.webp',
    tooltipKo: '카카오 로그인',
    tooltipEn: 'Kakao Login',
    left: 44.0, top: 85.83, width: 13.98, height: 3.75,
  },
  {
    id: 'google',
    src: '/button/google_btn.webp',
    tooltipKo: 'Google 로그인',
    tooltipEn: 'Google Login',
    left: 44.0, top: 91.25, width: 13.98, height: 3.75,
  },
];

// 입력 필드 위치 (bbox 비율)
const INPUT_FIELDS = {
  id: { left: 43.8, top: 45.6, width: 17.5, height: 3.8 },
  pw: { left: 43.8, top: 53.3, width: 15.4, height: 3.8 },
};

// 언어 변환 버튼 위치 (public/lang_switcher.png 좌표: 1214, 232, 1405, 292)
const LANG_SWITCHER_POS = {
  left: 47.42,
  top: 16.11,
  width: 7.46,
  height: 4.17,
};

function LoginButton({ btn, onClick, disabled, active, lang }) {
  const [hovered, setHovered] = useState(false);
  const isDpyb = btn.id === 'dpyb';
  const tooltip = lang === 'en' ? (btn.tooltipEn || btn.tooltipKo) : btn.tooltipKo;

  return (
    <>
      <img
        className={`login-layer-img${!disabled && (hovered || active) ? ' login-layer-img--hover' : ''}${disabled ? ' login-layer-img--disabled' : ''}${isDpyb && (hovered || active) ? ' login-layer-img--dpyb-glow' : ''}`}
        src={btn.src}
        alt=""
        width={2560}
        height={1440}
        decoding="async"
        draggable={false}
      />
      <button
        className={`login-hit-area${disabled ? ' login-hit-area--disabled' : ''}${isDpyb ? ' login-hit-area--dpyb' : ''}${isDpyb && hovered ? ' login-hit-area--dpyb-hover' : ''}`}
        style={{
          left: `${btn.left}%`,
          top: `${btn.top}%`,
          width: `${btn.width}%`,
          height: `${btn.height}%`,
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={disabled ? (e) => { e.preventDefault(); } : onClick}
        aria-disabled={disabled}
        aria-label={tooltip}
      >
        {isDpyb && hovered && (
          <div className="login-dpyb-sparkle-wrap">
            <span className="login-dpyb-sparkle-shine" />
            <span className="login-dpyb-star login-dpyb-star--1">✨</span>
            <span className="login-dpyb-star login-dpyb-star--2">✨</span>
          </div>
        )}
        {hovered && <span className="login-hit-tooltip">{tooltip}</span>}
      </button>
    </>
  );
}

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loginWithGoogle, loginWithKakao, loginAsGuest } = useAuth();
  const { lang, setLang, isEn, isKo } = useLanguage();
  const [eyeActive, setEyeActive] = useState(false);
  const [email, setEmail] = useState('');
  const [userPw, setUserPw] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const googleBtnRef = useRef(null);

  // 서비스 이용 가이드 모달 상태 (오늘 아직 보지 않았고 이번 세션에서 보지 않았을 때 첫 노출)
  const [showGuide, setShowGuide] = useState(() => {
    if (location.state?.fromGuideClosed) return false;
    return shouldShowGuideModal() && !isGuideSeenInSession();
  });

  // PC 환경 최적화 안내 팝업 상태 (오늘 하루 보지 않기 여부 검사)
  // 가이드가 먼저 뜨는 경우 가이드를 닫은 직후 순차적으로 표출
  const [showPcNotice, setShowPcNotice] = useState(() => {
    if (shouldShowGuideModal() && !isGuideSeenInSession() && !location.state?.fromGuideClosed) {
      return false;
    }
    try {
      const dismissed = localStorage.getItem('dpyb_pc_notice_dismissed');
      if (dismissed) {
        const exp = Number(dismissed);
        if (Date.now() < exp) return false;
      }
      return true;
    } catch {
      return true;
    }
  });
  const [dontShowPcNoticeToday, setDontShowPcNoticeToday] = useState(false);

  // 서비스 이용 가이드 닫기 핸들러 → 사용자가 닫으면 로그인 팝업창 순차 표출
  const handleCloseGuide = useCallback(() => {
    setShowGuide(false);
    try {
      const dismissed = localStorage.getItem('dpyb_pc_notice_dismissed');
      if (dismissed) {
        const exp = Number(dismissed);
        if (Date.now() < exp) return;
      }
      setShowPcNotice(true);
    } catch {
      setShowPcNotice(true);
    }
  }, []);

  const handleClosePcNotice = useCallback(() => {
    if (dontShowPcNoticeToday) {
      try {
        const tomorrow = new Date();
        tomorrow.setHours(23, 59, 59, 999);
        localStorage.setItem('dpyb_pc_notice_dismissed', String(tomorrow.getTime()));
      } catch {
        // 무시
      }
    }
    setShowPcNotice(false);
  }, [dontShowPcNoticeToday]);

  useEffect(() => {
    if (!showPcNotice) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleClosePcNotice();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showPcNotice, handleClosePcNotice]);

  const handleGuestLogin = async () => {
    if (loading) return;
    setLoading(true);
    setError('');
    try {
      await loginAsGuest();
      navigate('/library', { replace: true });
    } catch (err) {
      setError(err?.message || (isEn ? 'Failed to enter guest mode.' : '체험 모드 진입에 실패했습니다.'));
    } finally {
      setLoading(false);
    }
  };

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
  const kakaoJsKey = import.meta.env.VITE_KAKAO_JAVASCRIPT_KEY || '';

  // 개발용 우회 모드에서는 입력값 없이도 로그인 버튼이 눌리도록 검증을 건너뛴다.
  const isLoginEnabled =
    !loading && (AUTH_BYPASS || (email.trim().length > 0 && userPw.trim().length > 0));

  const eyeTimerRef = useRef(null);

  const handleEyeClick = useCallback(() => {
    if (eyeTimerRef.current) clearTimeout(eyeTimerRef.current);
    setEyeActive(true);
    eyeTimerRef.current = setTimeout(() => {
      setEyeActive(false);
      eyeTimerRef.current = null;
    }, 3000);
  }, []);

  useEffect(() => {
    return () => {
      if (eyeTimerRef.current) clearTimeout(eyeTimerRef.current);
    };
  }, []);

  const handleLogin = async () => {
    if (!isLoginEnabled) return;
    setLoading(true);
    setError('');
    try {
      await login({ email: email.trim(), password: userPw });
      navigate('/library', { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 403 && err.code === 'EMAIL_NOT_VERIFIED') {
          // 이메일 인증 미완료 → 인증 화면으로 유도 (email 전달)
          navigate('/signup', { state: { verifyEmail: email.trim() } });
          return;
        }
        if (err.status === 403) {
          setError(isEn ? 'This account has been deleted. Please log in with another account.' : '탈퇴한 계정이에요. 다른 계정으로 로그인해 주세요.');
        } else if (err.status === 401) {
          setError(isEn ? 'Invalid email or password.' : '이메일 또는 비밀번호가 올바르지 않습니다.');
        } else if (err.status === 429) {
          setError(isEn ? 'Too many requests. Please try again later.' : '요청이 많아요. 잠시 후 다시 시도해 주세요.');
        } else {
          setError(isEn ? 'An error occurred during login. Please try again.' : '로그인 중 오류가 발생했어요. 잠시 후 다시 시도해 주세요.');
        }
      } else {
        setError(isEn ? 'Unable to connect to the server. Please try again.' : '서버에 연결할 수 없어요. 잠시 후 다시 시도해 주세요.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSocialSuccess = useCallback(async (socialType, token) => {
    setLoading(true);
    setError('');
    try {
      if (socialType === 'google') {
        await loginWithGoogle(token);
      } else if (socialType === 'kakao') {
        await loginWithKakao(token);
      }
      navigate('/library', { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || '소셜 로그인 처리에 실패했습니다.');
      } else {
        setError('소셜 로그인 중 오류가 발생했습니다.');
      }
    } finally {
      setLoading(false);
    }
  }, [loginWithGoogle, loginWithKakao, navigate]);

  const handleGoogleClick = async () => {
    if (loading) return;
    if (AUTH_BYPASS) {
      await handleSocialSuccess('google', 'dummy_google_token');
      return;
    }
    if (!googleClientId) {
      setError('구글 클라이언트 ID가 설정되지 않았습니다 (.env.local 확인).');
      return;
    }
    try {
      setLoading(true);
      setError('');
      const idToken = await triggerGoogleLogin(googleClientId);
      await handleSocialSuccess('google', idToken);
    } catch (err) {
      setError(err?.message || '구글 로그인에 실패했습니다.');
      setLoading(false);
    }
  };

  const handleKakaoClick = async () => {
    if (loading) return;
    if (AUTH_BYPASS) {
      await handleSocialSuccess('kakao', 'dummy_kakao_token');
      return;
    }
    if (!kakaoJsKey) {
      setError('카카오 Javascript 키가 설정되지 않았습니다 (.env.local 확인).');
      return;
    }
    try {
      setLoading(true);
      setError('');
      const accessToken = await triggerKakaoLogin(kakaoJsKey);
      await handleSocialSuccess('kakao', accessToken);
    } catch (err) {
      setError(err?.message || '카카오 로그인에 실패했습니다.');
      setLoading(false);
    }
  };

  // Google One Tap / 버튼 로더 초기화 시도
  useEffect(() => {
    if (!googleClientId || AUTH_BYPASS) return;
    if (googleBtnRef.current) {
      renderGoogleButton(
        googleBtnRef.current,
        googleClientId,
        (token) => handleSocialSuccess('google', token),
        (err) => console.warn('Google button init failed:', err)
      ).catch(() => { });
    }
  }, [googleClientId, handleSocialSuccess]);

  const handleClick = (id) => {
    switch (id) {
      case 'login':
        handleLogin();
        break;
      case 'signup':
        // UI적으로 비활성화 처리 (준비 중)
        if (!isButtonDisabled('signup')) navigate('/signup');
        break;
      case 'password':
        // BETA 테스트 기간 동안 비밀번호 찾기 비활성화
        break;
      case 'eye':
        handleEyeClick();
        break;
      case 'google':
        if (!isButtonDisabled('google')) handleGoogleClick();
        break;
      case 'kakao':
        if (!isButtonDisabled('kakao')) handleKakaoClick();
        break;
      case 'dpyb':
        handleGuestLogin();
        break;
    }
  };

  /** 버튼별 비활성 조건 — 비밀번호찾기(준비 중 비활성), 로그인은 입력 검증, 회원가입/소셜/체험은 요청 중(loading)일 때 잠근다. */
  const isButtonDisabled = (id) => {
    if (id === 'password') return true;
    if (id === 'login') return !isLoginEnabled;
    if (id === 'signup' || id === 'kakao' || id === 'google' || id === 'dpyb') return loading;
    return false;
  };

  return (
    <div className="login-page">
      {/*
       * 16:9 cover 레이어 — 배경·버튼 이미지·클릭 영역·입력 필드를 모두 같은
       * 좌표계에 배치한다. 뷰포트를 "cover"하도록 확대·중앙 정렬하므로,
       * 창을 리사이즈해도 이미지와 버튼 좌표가 어긋나지 않는다.
       * (기존에는 object-fit: cover로 이미지만 확대되고 HTML 요소는
       *  컨테이너 %로 배치되어 좌표계가 달랐다.)
       */}
      <div className="login-cover-layer">
        <img
          className="login-bg-img"
          src={isEn ? LOGIN_BG_EN : LOGIN_BG_KO}
          alt="Don't Paw-get Your Book"
          width={2560}
          height={1440}
          decoding="async"
        />

        {/* 로고 (3D 젤리 스티커 효과) */}
        <img
          className="login-logo-3d"
          src="/button/logo_bl.webp"
          alt="Don't Paw-get Logo"
          width={2560}
          height={1440}
          decoding="async"
          draggable={false}
        />

        {/* 언어 변환 버튼 (public/lang_switcher.png 좌표 연동) */}
        <div
          className="login-lang-switcher"
          style={{
            left: `${LANG_SWITCHER_POS.left}%`,
            top: `${LANG_SWITCHER_POS.top}%`,
            width: `${LANG_SWITCHER_POS.width}%`,
            height: `${LANG_SWITCHER_POS.height}%`,
          }}
          role="group"
          aria-label={isEn ? 'Language Selector' : '언어 선택'}
        >
          <button
            type="button"
            className={`login-lang-btn ${isKo ? 'login-lang-btn--active' : ''}`}
            onClick={() => setLang('ko')}
            aria-pressed={isKo}
            aria-label="한국어 선택"
            title="한국어"
          >
            한국어
          </button>
          <span className="login-lang-divider" aria-hidden="true">|</span>
          <button
            type="button"
            className={`login-lang-btn ${isEn ? 'login-lang-btn--active' : ''}`}
            onClick={() => setLang('en')}
            aria-pressed={isEn}
            aria-label="Select English"
            title="English"
          >
            ENG
          </button>
        </div>

        {/* 입력 필드 이미지 레이어 (투명) */}
        <img
          className="login-layer-img login-layer-img--input"
          src="/Input_field/id.webp"
          alt=""
          width={2560}
          height={1440}
          decoding="async"
          draggable={false}
        />
        <img
          className="login-layer-img login-layer-img--input"
          src="/Input_field/pw.webp"
          alt=""
          width={2560}
          height={1440}
          decoding="async"
          draggable={false}
        />

        {/* 실제 입력 필드 (이미지 위에 투명하게 겹침) */}
        <input
          className="login-input-field"
          style={{
            left: `${INPUT_FIELDS.id.left}%`,
            top: `${INPUT_FIELDS.id.top}%`,
            width: `${INPUT_FIELDS.id.width}%`,
            height: `${INPUT_FIELDS.id.height}%`,
          }}
          type="email"
          placeholder={isEn ? 'Email' : '이메일'}
          value={email}
          onChange={(e) => { setEmail(e.target.value); if (error) setError(''); }}
          autoComplete="email"
        />
        <input
          className="login-input-field"
          style={{
            left: `${INPUT_FIELDS.pw.left}%`,
            top: `${INPUT_FIELDS.pw.top}%`,
            width: `${INPUT_FIELDS.pw.width}%`,
            height: `${INPUT_FIELDS.pw.height}%`,
          }}
          type={eyeActive ? 'text' : 'password'}
          placeholder={isEn ? 'Password' : '비밀번호'}
          value={userPw}
          onChange={(e) => { setUserPw(e.target.value); if (error) setError(''); }}
          onKeyDown={(e) => { if (e.key === 'Enter') handleLogin(); }}
          autoComplete="current-password"
        />

        {/* 버튼들 */}
        {BUTTONS.map((btn) => {
          // 눈 버튼은 비밀번호 표시 중(eyeActive)이면 분홍 이미지로 스왑
          const isEye = btn.id === 'eye';
          const resolvedBtn =
            isEye && eyeActive ? { ...btn, src: btn.srcActive } : btn;
          return (
            <LoginButton
              key={btn.id}
              btn={resolvedBtn}
              onClick={() => handleClick(btn.id)}
              disabled={isButtonDisabled(btn.id)}
              lang={lang}
            />
          );
        })}

        {/*
          소셜 로그인(Google/Kakao)·DPYB 체험하기 버튼은 위 BUTTONS 배열의 이미지 레이어
          방식으로 통합했다(2026-09 신규 UI). 예전에는 배경 시안에 이 버튼들이 없어 CSS로
          만든 별도 버튼(.login-social-container)을 화면 하단에 띄웠는데, 새 시안에 세
          버튼이 그려져 들어오면서 다른 버튼들과 같은 방식으로 맞췄다.
        */}
      </div>

      {/* 숨김 처리된 Google 표준 버튼 렌더링 컨테이너 (필요 시 One Tap 트리거) */}
      <div ref={googleBtnRef} style={{ display: 'none' }} />

      {/* 비밀번호 표시 상태 인디케이터 */}
      {eyeActive && (
        <div className="login-eye-indicator">
          {isEn ? 'Showing password...' : '비밀번호 표시 중...'}
        </div>
      )}

      {/* 로그인 에러 메시지 */}
      {error && <div className="login-error">{error}</div>}

      {/* 개발용 인증 우회 안내 (실제 로그인 연동 시 사라짐) */}
      {AUTH_BYPASS && (
        <div className="login-dev-badge">
          {isEn ? 'Dev Mode: Login with any credentials 🐾' : '개발 모드: 아무 값으로도 로그인됩니다 🐾'}
        </div>
      )}

      {/* Welcome to DPYB 안내 팝업 모달 */}
      {showPcNotice && (
        <div
          className="login-notice-backdrop"
          onClick={handleClosePcNotice}
          role="dialog"
          aria-modal="true"
          aria-labelledby="login-pc-notice-title"
        >
          <div
            className="login-notice-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="login-notice-close-btn"
              onClick={handleClosePcNotice}
              aria-label={isEn ? 'Close notice popup' : '안내 팝업 닫기'}
            >
              ✕
            </button>

            <div className="login-notice-header">
              <span className="login-notice-welcome-tag">Welcome to DPYB!</span>
              <h3 id="login-pc-notice-title" className="login-notice-title">
                {isEn ? 'Please check before using DPYB! 📚' : 'DPYB 이용 전 확인해주세요! 📚'}
              </h3>
            </div>

            <div className="login-notice-body">
              {/* 1. PC 환경 권장 */}
              <div className="login-notice-item">
                <div className="login-notice-item-header">
                  <span className="login-notice-item-icon">💻</span>
                  <strong className="login-notice-item-title">{isEn ? 'Recommended for PC' : 'PC 환경 권장'}</strong>
                </div>
                <p className="login-notice-item-desc">
                  {isEn ? 'DPYB is optimized for the best experience on PC desktop.' : 'DPYB는 PC 환경에서 더욱 쾌적하게 이용하실 수 있어요.'}
                </p>
              </div>

              {/* 2. 현재 테스트 운영 중 */}
              <div className="login-notice-item">
                <div className="login-notice-item-header">
                  <span className="login-notice-item-icon">🧪</span>
                  <strong className="login-notice-item-title">{isEn ? 'Currently in Beta Testing' : '현재 테스트 운영 중'}</strong>
                </div>
                <p className="login-notice-item-desc">
                  {isEn ? (
                    <>
                      Click &quot;Try Out DPYB&quot; without logging in
                      <br />
                      to freely chat with AI librarians.
                    </>
                  ) : (
                    <>
                      로그인 없이 DPYB 체험하기 버튼을 눌러
                      <br />
                      AI 사서와 자유롭게 대화해 보세요.
                    </>
                  )}
                </p>
              </div>

              {/* 3. 문의 및 피드백 */}
              <div className="login-notice-item login-notice-item--feedback">
                <div className="login-notice-item-header">
                  <span className="login-notice-item-icon">💌</span>
                  <strong className="login-notice-item-title">{isEn ? 'Inquiries & Feedback' : '문의 및 피드백'}</strong>
                </div>
                <div className="login-notice-feedback-text">
                  {isEn ? (
                    <>
                      <p>Have any questions or thoughts to share?</p>
                      <p>Feel free to reach out via email below.</p>
                      <p>Your feedback helps us create a better experience.</p>
                    </>
                  ) : (
                    <>
                      <p>궁금한 점이나 전하고 싶은 의견이 있으신가요?</p>
                      <p>아래 이메일로 편하게 보내주세요.</p>
                      <p>보내주신 이야기는 더 나은 서비스를 만드는 데 큰 도움이 됩니다.</p>
                    </>
                  )}
                </div>
                <a
                  href="mailto:dpyb26@gmail.com"
                  className="login-notice-email-link"
                  title={isEn ? 'Send Email' : '이메일 보내기'}
                >
                  ✉️ dpyb26@gmail.com
                </a>
              </div>
            </div>

            <div className="login-notice-footer">
              <label className="login-notice-dismiss-label">
                <input
                  type="checkbox"
                  className="login-notice-checkbox"
                  checked={dontShowPcNoticeToday}
                  onChange={(e) => setDontShowPcNoticeToday(e.target.checked)}
                />
                <span>{isEn ? "Don't show today" : '오늘 하루 보지 않기'}</span>
              </label>

              <button
                type="button"
                className="login-notice-confirm-btn"
                onClick={handleClosePcNotice}
              >
                {isEn ? 'OK' : '확인'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 서비스 이용 가이드 팝업 모달 */}
      <ServiceGuideModal
        isOpen={showGuide}
        onClose={handleCloseGuide}
      />
    </div>
  );
}
