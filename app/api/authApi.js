/**
 * backend-auth REST API 클라이언트 + 토큰 관리 인프라 (CLIAR-163).
 *
 * 최종 인증 구조: Frontend → backend-auth REST API → Cognito → RDS
 * 프론트는 Cognito/Amplify SDK를 직접 사용하지 않고 backend-auth API만 호출한다.
 *
 * 토큰 관리 원칙:
 *  - Access Token: 프론트 메모리에만 보관 (localStorage 저장 금지)
 *  - Refresh Token: backend-auth가 HttpOnly Cookie로 설정 → JS에서 접근하지 않음
 *  - 인증 요청은 credentials: 'include'로 쿠키를 주고받는다
 *  - 401 발생 시 /auth/refresh(body 없음) 1회 시도 → 새 access_token으로 원 요청 1회 재시도
 *  - refresh도 401이면 세션 만료로 보고 onSessionExpired 콜백 호출
 */

import { fetchWithTimeout } from './fetchWithTimeout';
import { showGlobalToast } from '../components/toastContext';
import { CORE_API_BASE } from './apiBase';

// auth/users/terms는 모두 backend-core-api가 담당한다 (사용자 요청, 2026-09:
// Cloudflare Pages 배포를 위해 core-api/ai-agent 베이스 URL을 분리).
const API_BASE = CORE_API_BASE;

// ── JWT Payload Decoder (base64url) ──
export function parseJwtPayload(token) {
  if (!token || typeof token !== 'string') return null;
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (err) {
    console.warn('[authApi] JWT payload parse failed:', err);
    return null;
  }
}

// ── Access Token (메모리 보관) ──
let accessToken = null;
let currentRole = null;
let currentSub = null;

export function getAccessToken() {
  return accessToken;
}

export function getCurrentRole() {
  return currentRole;
}

export function getCurrentSub() {
  return currentSub;
}

export function isGuestSession() {
  return currentRole === 'guest';
}

export function setAccessToken(token) {
  accessToken = token || null;
  if (token) {
    const payload = parseJwtPayload(token);
    currentRole = payload?.role || null;
    currentSub = payload?.sub || null;
  } else {
    currentRole = null;
    currentSub = null;
  }
}

export function clearAccessToken() {
  accessToken = null;
  currentRole = null;
  currentSub = null;
}

// 세션 만료(refresh 실패) 시 호출될 콜백 — AuthProvider에서 등록
let onSessionExpired = null;

export function setOnSessionExpired(cb) {
  onSessionExpired = typeof cb === 'function' ? cb : null;
}

/**
 * 응답 본문을 안전하게 JSON으로 파싱 (204/빈 본문이면 null).
 * @param {Response} res
 */
async function parseBody(res) {
  if (res.status === 204) return null;
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/**
 * 응답이 JSON이 아니라 HTML인지 판별한다.
 *
 * API 경로가 백엔드로 라우팅되지 않으면(배포 환경의 CloudFront SPA fallback,
 * 프록시 설정 누락 등) 프론트엔드의 index.html이 200으로 돌아온다. 이때 본문을
 * 문자열 그대로 넘기면 호출부는 필드가 전부 undefined인 '빈 응답'으로 오해하고
 * 엉뚱한 곳을 디버깅하게 되므로, 여기서 원인을 밝혀 에러로 만든다.
 */
function looksLikeHtml(body) {
  return typeof body === 'string' && /^\s*<(!doctype|html)/i.test(body);
}

/**
 * API 에러 객체. status와 백엔드가 준 code/detail을 담는다.
 */
export class ApiError extends Error {
  constructor(status, body) {
    // backend-auth는 오류를 detail에 담는다. detail은 문자열이거나
    // { code, message } 객체(예: EMAIL_NOT_VERIFIED)일 수 있다.
    const detail = body?.detail;
    const code = body?.code || detail?.code || body?.error || null;
    const message =
      body?.message ||
      detail?.message ||
      (typeof detail === 'string' ? detail : null) ||
      `요청 실패 (${status})`;
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.body = body;
  }
}

/**
 * refresh 진행 중이면 그 Promise를 공유해 동시 401에서 중복 refresh를 막는다.
 * @type {Promise<boolean>|null}
 */
let refreshPromise = null;

/**
 * Access Token 갱신.
 * - 일반 회원: Refresh Token이 HttpOnly Cookie에 있으므로 body는 없다.
 * - 게스트(role: "guest"): 백그라운드에서 POST /api/v1/auth/guest를 호출하되,
 *   기존 guest_id (sub) 값을 바디에 담아 세션 끊김을 방지한다.
 *
 * @returns {Promise<boolean>} 갱신 성공 여부
 */
export async function refreshAccessToken() {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      if (isGuestSession() && currentSub) {
        // 게스트 조용한 갱신: 기존 guest_id(sub)를 유지하여 호출
        const res = await fetchWithTimeout(`${API_BASE}/auth/guest`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ guest_id: currentSub }),
        });
        if (!res.ok) return false;
        const data = await parseBody(res);
        const token = data?.access_token || data?.accessToken;
        if (token) {
          setAccessToken(token);
          return true;
        }
        return false;
      }

      // 일반 회원 쿠키 기반 갱신
      const res = await fetchWithTimeout(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) return false;
      const data = await parseBody(res);
      const token = data?.access_token || data?.accessToken;
      if (token) {
        setAccessToken(token);
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/**
 * backend-auth 공통 fetch.
 * - credentials: 'include' 항상 포함
 * - auth=true(기본)면 Authorization: Bearer 자동 첨부
 * - 401이고 refresh 가능하면 refresh 후 1회 재시도 (_retry: true 방어)
 * - 게스트 토큰 만료 시 에러 팝업 없이 백그라운드에서 guest_id 포함 갱신 후 재시도
 * - 쓰기 액션 등에서 403 발생 시 공통 안내 토스트 팝업 트리거
 *
 * @param {string} path - '/auth/login' 등 baseUrl 기준 경로
 * @param {object} [options]
 * @param {string} [options.method='GET']
 * @param {object} [options.body] - JSON 직렬화할 본문 (FormData면 그대로 전송, Content-Type 미지정)
 * @param {boolean} [options.auth=true] - Authorization 헤더 첨부 여부
 * @param {boolean} [options._retry] - 내부 재시도 플래그 (무한 루프 방어)
 * @param {string} [options.baseUrl] - 이 호출에만 쓸 베이스 URL (미지정 시 backend-core-api 기본값).
 *   recordApi.js의 OCR 요청처럼 다른 백엔드(backend-ai-agent)로 보내야 하는 경우에 쓴다
 *   (사용자 요청, 2026-09: Cloudflare Pages 배포를 위해 core-api/ai-agent 베이스 URL을 분리).
 * @returns {Promise<any>} 파싱된 응답 본문
 * @throws {ApiError}
 */
export async function authFetch(path, { method = 'GET', body, auth = true, _retry = false, baseUrl } = {}) {
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  const headers = {};
  // FormData는 Content-Type을 지정하지 않아야 브라우저가 boundary를 포함해 자동 설정한다.
  if (body !== undefined && !isFormData) headers['Content-Type'] = 'application/json';
  if (auth && accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

  const effectiveBase = baseUrl || API_BASE;
  const res = await fetchWithTimeout(`${effectiveBase}${path}`, {
    method,
    headers,
    credentials: 'include',
    ...(body !== undefined ? { body: isFormData ? body : JSON.stringify(body) } : {}),
  });

  // 401 → refresh 1회 시도 후 재시도 (refresh/guest/login 자체는 제외)
  if (res.status === 401 && auth && !_retry && path !== '/auth/refresh' && path !== '/auth/guest') {
    if (accessToken) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        return authFetch(path, { method, body, auth, _retry: true, baseUrl });
      }
      clearAccessToken();
      if (onSessionExpired) onSessionExpired();
    }
    throw new ApiError(401, await parseBody(res));
  }

  // 403 Forbidden 발생 시 (특히 게스트 쓰기 제한 시) 공통 토스트 띄우기
  if (res.status === 403) {
    const errorBody = await parseBody(res);
    showGlobalToast('체험 모드에서는 지원하지 않는 기능입니다', 'warning');
    throw new ApiError(403, errorBody);
  }

  if (!res.ok) {
    throw new ApiError(res.status, await parseBody(res));
  }

  // 이름이 authFetch의 요청 body와 겹치지 않도록 data로 받는다.
  const data = await parseBody(res);
  if (looksLikeHtml(data)) {
    throw new ApiError(res.status, {
      detail: `API가 JSON 대신 HTML을 반환했습니다 (${effectiveBase}${path}). 요청이 백엔드로 라우팅되지 않고 있습니다 — 배포 환경이면 VITE_CORE_API_BASE_URL/VITE_AI_API_BASE_URL을, 로컬이면 vite.config.js의 프록시 설정을 확인하세요.`,
    });
  }
  return data;
}

// ============================================================
// 인증 엔드포인트 (CLIAR-164/165에서 화면과 연동)
// 요청 필드명은 backend-auth Swagger 계약 기준.
// ============================================================

// ── 약관 ──
/**
 * 서비스 이용약관/개인정보처리방침/AI 분석 활용 동의 전문 조회 (로그인 불필요).
 * TERMS_OF_SERVICE → PRIVACY → AI_ANALYSIS 순서로 고정 반환.
 * AI_ANALYSIS는 선택 약관이라 DB에 없으면 배열에서 빠질 수 있다(에러 아님).
 * 필수 약관(TERMS_OF_SERVICE/PRIVACY) 미설정 시 503.
 * @returns {Promise<Array<{code: string, name: string, content: string, is_required: boolean}>>}
 */
export function getTerms() {
  return authFetch('/terms', { auth: false });
}

// ── 회원가입 / 이메일 인증 ──
export function signup(payload) {
  // payload: { email, password, nickname, birth_date, gender, 약관 동의 등 }
  return authFetch('/auth/signup', { method: 'POST', body: payload, auth: false });
}

export function confirmSignup({ email, code }) {
  return authFetch('/auth/signup/confirm', { method: 'POST', body: { email, code }, auth: false });
}

export function resendSignupCode({ email }) {
  return authFetch('/auth/signup/resend', { method: 'POST', body: { email }, auth: false });
}

// ── 로그인 / 로그아웃 ──
/**
 * 로그인. 성공 시 access_token을 메모리에 저장하고 응답을 반환한다.
 * Refresh Token은 backend-auth가 HttpOnly Cookie로 설정한다.
 * @returns {Promise<{access_token, id_token, expires_in, token_type, member}>}
 */
export async function login({ email, password }) {
  const data = await authFetch('/auth/login', {
    method: 'POST',
    body: { email, password },
    auth: false,
  });
  const token = data?.access_token || data?.accessToken;
  if (token) setAccessToken(token);
  return data;
}

/**
 * Google 소셜 로그인.
 * @param {string} idToken - Google Identity Services에서 발급받은 ID 토큰 (credential)
 * @returns {Promise<{access_token, id_token, expires_in, token_type, member}>}
 */
export async function loginWithGoogle(idToken) {
  const data = await authFetch('/auth/social/google', {
    method: 'POST',
    body: { token: idToken },
    auth: false,
  });
  const token = data?.access_token || data?.accessToken;
  if (token) setAccessToken(token);
  return data;
}

/**
 * Kakao 소셜 로그인.
 * @param {string} kakaoAccessToken - Kakao JS SDK에서 발급받은 access_token
 * @returns {Promise<{access_token, id_token, expires_in, token_type, member}>}
 */
export async function loginWithKakao(kakaoAccessToken) {
  const data = await authFetch('/auth/social/kakao', {
    method: 'POST',
    body: { token: kakaoAccessToken },
    auth: false,
  });
  const token = data?.access_token || data?.accessToken;
  if (token) setAccessToken(token);
  return data;
}

/**
 * 해커톤 게스트 체험 모드 로그인 (임시 출입증 JWT 발급).
 * POST /api/v1/auth/guest 호출 → role: "guest", sub: "guest-{uuid}" 토큰 발급.
 * @param {string} [guestId] - 기존 guest_id가 있다면 전달
 * @returns {Promise<{access_token, role, sub, member}>}
 */
export async function loginAsGuest(guestId = null) {
  const payload = guestId ? { guest_id: guestId } : {};
  const data = await authFetch('/auth/guest', {
    method: 'POST',
    body: payload,
    auth: false,
  });
  const token = data?.access_token || data?.accessToken;
  if (token) setAccessToken(token);
  return data;
}

export async function logout() {
  try {
    await authFetch('/auth/logout', { method: 'POST', auth: false });
  } finally {
    // 서버 실패 여부와 무관하게 메모리 토큰은 제거
    clearAccessToken();
  }
}

// ── 비밀번호 ──
export function forgotPassword({ email }) {
  return authFetch('/auth/password/forgot', { method: 'POST', body: { email }, auth: false });
}

export function resetPassword({ email, code, newPassword }) {
  return authFetch('/auth/password/reset', {
    method: 'POST',
    body: { email, code, new_password: newPassword },
    auth: false,
  });
}

export function changePassword({ currentPassword, newPassword }) {
  // member_id/sub/email은 보내지 않음 — Access Token으로 대상 판단
  return authFetch('/auth/password/change', {
    method: 'POST',
    body: { current_password: currentPassword, new_password: newPassword },
  });
}

// ── 사용자 (로그인 이후) ──
export function getMe() {
  return authFetch('/users/me');
}

export function updateMe(patch) {
  return authFetch('/users/me', { method: 'PATCH', body: patch });
}

export function deleteMe() {
  return authFetch('/users/me', { method: 'DELETE' });
}
