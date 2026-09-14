import { useCallback, useEffect, useMemo, useState } from 'react';
import { AuthContext } from './authStore';
import {
  login as apiLogin,
  logout as apiLogout,
  refreshAccessToken,
  getAccessToken,
  clearAccessToken,
  setOnSessionExpired,
  getMe,
} from '../api/authApi';
import { clearChatSession } from './librarianStore';
import { AUTH_BYPASS, BYPASS_MEMBER } from './authBypass';

/**
 * 인증 전역 상태 (CLIAR-163).
 *
 * - member: 로그인한 회원 정보 (null이면 비로그인)
 * - status: 'loading'(초기 복원 중) | 'authenticated' | 'unauthenticated'
 *
 * Access Token은 메모리(authApi 모듈)에만 있으므로 새로고침하면 사라진다.
 * 대신 세션 시작 시 refresh(HttpOnly Cookie)로 access_token 복원을 시도해
 * 쿠키가 살아있으면 로그인 상태를 유지한다.
 */
export function AuthProvider({ children }) {
  const [member, setMember] = useState(null);
  // 우회 모드에서는 복원할 세션이 없으므로 'loading' 없이 로그인 화면부터 시작한다.
  const [status, setStatus] = useState(AUTH_BYPASS ? 'unauthenticated' : 'loading');

  // refresh 실패(세션 만료) 시 상태 초기화
  useEffect(() => {
    setOnSessionExpired(() => {
      clearChatSession();
      setMember(null);
      setStatus('unauthenticated');
    });
    return () => setOnSessionExpired(null);
  }, []);

  // 세션 시작 시 access_token 복원 시도 (refresh 쿠키 기반)
  useEffect(() => {
    // 개발용 우회 모드: 백엔드 호출 없이 로그인 화면에서 대기
    if (AUTH_BYPASS) return;
    let cancelled = false;
    (async () => {
      const refreshed = await refreshAccessToken();
      if (cancelled) return;
      if (refreshed) {
        try {
          const me = await getMe();
          if (!cancelled) {
            setMember(me);
            setStatus('authenticated');
            return;
          }
        } catch {
          // getMe 실패 시 비로그인 처리
        }
      }
      if (!cancelled) {
        clearAccessToken();
        setStatus('unauthenticated');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async ({ email, password }) => {
    // 개발용 우회 모드: 입력값과 무관하게 가짜 회원으로 즉시 통과
    if (AUTH_BYPASS) {
      const data = { member: { ...BYPASS_MEMBER, email: email || BYPASS_MEMBER.email } };
      setMember(data.member);
      setStatus('authenticated');
      return data;
    }
    const data = await apiLogin({ email, password });
    setMember(data?.member ?? null);
    setStatus('authenticated');
    return data;
  }, []);

  const logout = useCallback(async () => {
    // 우회 모드에서는 서버 세션이 없으므로 로컬 상태만 정리한다.
    if (!AUTH_BYPASS) await apiLogout();
    clearChatSession();
    setMember(null);
    setStatus('unauthenticated');
  }, []);

  const value = useMemo(
    () => ({
      member,
      status,
      isAuthenticated: status === 'authenticated',
      login,
      logout,
      setMember,
      getAccessToken,
    }),
    [member, status, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
