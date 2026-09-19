import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../store/authStore';
import { AUTH_BYPASS } from '../store/authBypass';
import { ApiError } from '../api/authApi';
import { renderGoogleButton, triggerGoogleLogin, triggerKakaoLogin } from '../utils/socialAuth';
import './LoginPage.css';

/**
 * 버튼/입력필드 이미지는 2560x1440 전체 화면 레이어 (투명 배경 + 위치 고정).
 */
const BUTTONS = [
  {
    id: 'login',
    src: '/button/login_btn.webp',
    tooltip: '로그인',
    left: 55.9, top: 61.9, width: 5.6, height: 8.8,
  },
  {
    id: 'signup',
    src: '/button/signup_btn.webp',
    tooltip: '회원가입',
    left: 40.9, top: 61.5, width: 7.8, height: 8.5,
  },
  {
    id: 'password',
    src: '/button/forgotpw_btn.webp',
    tooltip: '비밀번호 찾기',
    left: 50.2, top: 62.1, width: 4.3, height: 7.2,
  },
  {
    id: 'eye',
    // 비밀번호 보기 토글: 평소엔 회색(paw_gray), 누르면 비밀번호가 보이는 3초간
    // 분홍(paw_pink)으로 바뀌고 다시 회색으로 돌아온다. (아래 map에서 eyeActive로 스왑)
    src: '/button/paw_gray.webp',
    srcActive: '/button/paw_pink.webp',
    tooltip: '비밀번호 보기',
    left: 59.2, top: 53.3, width: 2.2, height: 3.8,
  },
];

// 입력 필드 위치 (bbox 비율)
const INPUT_FIELDS = {
  id: { left: 43.8, top: 45.6, width: 17.5, height: 3.8 },
  pw: { left: 43.8, top: 53.3, width: 15.0, height: 3.8 },
};

function LoginButton({ btn, onClick, disabled, active }) {
  const [hovered, setHovered] = useState(false);

  return (
    <>
      <img
        className={`login-layer-img${hovered || active ? ' login-layer-img--hover' : ''}${disabled ? ' login-layer-img--disabled' : ''}`}
        src={btn.src}
        alt=""
        width={2560}
        height={1440}
        decoding="async"
        draggable={false}
      />
      <button
        className={`login-hit-area${disabled ? ' login-hit-area--disabled' : ''}`}
        style={{
          left: `${btn.left}%`,
          top: `${btn.top}%`,
          width: `${btn.width}%`,
          height: `${btn.height}%`,
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={disabled ? undefined : onClick}
        disabled={disabled}
        aria-label={btn.tooltip}
      >
        {hovered && !disabled && <span className="login-hit-tooltip">{btn.tooltip}</span>}
      </button>
    </>
  );
}

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loginWithGoogle, loginWithKakao, loginAsGuest } = useAuth();
  // 보호 라우트에서 리다이렉트된 경우 로그인 후 원래 위치로 복귀
  const from = location.state?.from || '/library';
  const [eyeActive, setEyeActive] = useState(false);
  const [email, setEmail] = useState('');
  const [userPw, setUserPw] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const googleBtnRef = useRef(null);

  const handleGuestLogin = async () => {
    if (loading) return;
    setLoading(true);
    setError('');
    try {
      await loginAsGuest();
      navigate(from, { replace: true });
    } catch (err) {
      setError(err?.message || '체험 모드 진입에 실패했습니다.');
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
      navigate(from, { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 403 && err.code === 'EMAIL_NOT_VERIFIED') {
          // 이메일 인증 미완료 → 인증 화면으로 유도 (email 전달)
          navigate('/signup', { state: { verifyEmail: email.trim() } });
          return;
        }
        if (err.status === 403) {
          setError('탈퇴한 계정이에요. 다른 계정으로 로그인해 주세요.');
        } else if (err.status === 401) {
          setError('이메일 또는 비밀번호가 올바르지 않습니다.');
        } else if (err.status === 429) {
          setError('요청이 많아요. 잠시 후 다시 시도해 주세요.');
        } else {
          setError('로그인 중 오류가 발생했어요. 잠시 후 다시 시도해 주세요.');
        }
      } else {
        setError('서버에 연결할 수 없어요. 잠시 후 다시 시도해 주세요.');
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
      navigate(from, { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || '소셜 로그인 처리에 실패했습니다.');
      } else {
        setError('소셜 로그인 중 오류가 발생했습니다.');
      }
    } finally {
      setLoading(false);
    }
  }, [loginWithGoogle, loginWithKakao, navigate, from]);

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
      ).catch(() => {});
    }
  }, [googleClientId, handleSocialSuccess]);

  const handleClick = (id) => {
    switch (id) {
      case 'login':
        handleLogin();
        break;
      case 'signup':
        navigate('/signup');
        break;
      case 'password':
        navigate('/password/forgot');
        break;
      case 'eye':
        handleEyeClick();
        break;
    }
  };

  return (
    <div className="login-page">
      <img
        className="login-bg-img"
        src="/login-bg.webp"
        alt="Don't Paw-get Your Book"
        width={1920}
        height={1080}
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
        placeholder="이메일"
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
        placeholder="비밀번호"
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
            disabled={btn.id === 'login' && !isLoginEnabled}
          />
        );
      })}

      {/* 소셜 로그인 기본 버튼 와꾸 (디자이너 최종 그래픽 적용 전 임시 레이아웃) */}
      <div className="login-social-container">
        <div className="login-social-divider">
          <span>간편 로그인</span>
        </div>
        <div className="login-social-buttons">
          <button
            type="button"
            className="social-btn social-btn--google"
            onClick={handleGoogleClick}
            disabled={loading}
            aria-label="Google 계정으로 로그인"
          >
            <svg className="social-icon" viewBox="0 0 24 24" width="20" height="20">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span className="social-text">Google 로그인</span>
          </button>

          <button
            type="button"
            className="social-btn social-btn--kakao"
            onClick={handleKakaoClick}
            disabled={loading}
            aria-label="카카오 계정으로 로그인"
          >
            <svg className="social-icon" viewBox="0 0 24 24" width="20" height="20">
              <path
                fill="#000000"
                d="M12 3C6.48 3 2 6.48 2 10.77c0 2.78 1.87 5.22 4.67 6.55-.21.77-.75 2.78-.86 3.21-.13.54.2.53.42.38.17-.11 2.76-1.88 3.87-2.64.63.09 1.26.14 1.9.14 5.52 0 10-3.48 10-7.77C22 6.48 17.52 3 12 3z"
              />
            </svg>
            <span className="social-text">카카오 로그인</span>
          </button>
        </div>

        {/* DPYB 체험하기 (게스트 체험 모드) 버튼 */}
        <button
          type="button"
          className="guest-experience-btn"
          onClick={handleGuestLogin}
          disabled={loading}
          aria-label="DPYB 체험하기"
        >
          <span className="guest-paw-icon">🐾</span>
          <span className="guest-btn-text">DPYB 체험하기 (로그인 없이 둘러보기)</span>
        </button>

        {/* 숨김 처리된 Google 표준 버튼 렌더링 컨테이너 (필요 시 One Tap 트리거) */}
        <div ref={googleBtnRef} style={{ display: 'none' }} />
      </div>

      {/* 비밀번호 표시 상태 인디케이터 */}
      {eyeActive && (
        <div className="login-eye-indicator">
          비밀번호 표시 중...
        </div>
      )}

      {/* 로그인 에러 메시지 */}
      {error && <div className="login-error">{error}</div>}

      {/* 개발용 인증 우회 안내 (실제 로그인 연동 시 사라짐) */}
      {AUTH_BYPASS && (
        <div className="login-dev-badge">
          개발 모드: 아무 값으로도 로그인됩니다 🐾
        </div>
      )}
    </div>
  );
}
