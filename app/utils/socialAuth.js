/**
 * 소셜 로그인 SDK 로더 및 인증 유틸 (Google & Kakao).
 */

const GOOGLE_GSI_URL = 'https://accounts.google.com/gsi/client';
const KAKAO_SDK_URL = 'https://developers.kakao.com/sdk/js/kakao.min.js';

/**
 * 외부 script 태그 동적 로드 헬퍼
 * @param {string} src
 * @param {string} id
 * @returns {Promise<void>}
 */
function loadScript(src, id) {
  return new Promise((resolve, reject) => {
    if (document.getElementById(id)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.id = id;
    script.src = src;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = (err) => reject(new Error(`Failed to load script: ${src} (${err?.message || ''})`));
    document.head.appendChild(script);
  });
}

/**
 * Google Identity Services SDK 로드
 */
export async function loadGoogleSdk() {
  if (window.google?.accounts?.id) {
    return window.google;
  }
  await loadScript(GOOGLE_GSI_URL, 'google-gsi-client');
  return window.google;
}

/**
 * Google Identity Services 표준 로그인 버튼 렌더링
 * @param {HTMLElement} parentElement - 버튼을 렌더링할 컨테이너
 * @param {string} clientId - Google OAuth 클라이언트 ID
 * @param {function(string): void} onSuccess - 토큰 수신 콜백
 * @param {function(Error): void} onError - 에러 콜백
 */
export async function renderGoogleButton(parentElement, clientId, onSuccess, onError) {
  if (!clientId || !parentElement) return;

  await loadGoogleSdk();

  window.google.accounts.id.initialize({
    client_id: clientId,
    callback: (response) => {
      if (response?.credential) {
        onSuccess(response.credential);
      } else {
        onError?.(new Error('Google 로그인 토큰을 가져오지 못했습니다.'));
      }
    },
  });

  window.google.accounts.id.renderButton(parentElement, {
    theme: 'outline',
    size: 'large',
    type: 'standard',
    shape: 'pill',
    text: 'signin_with',
    logo_alignment: 'left',
    width: 200,
  });
}

/**
 * Google 로그인 팝업/원탭 트리거
 * @param {string} clientId - Google OAuth 클라이언트 ID
 * @returns {Promise<string>} credential (ID Token)
 */
export async function triggerGoogleLogin(clientId) {
  if (!clientId) {
    throw new Error('Google Client ID가 설정되지 않았습니다.');
  }

  await loadGoogleSdk();

  return new Promise((resolve, reject) => {
    try {
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response) => {
          if (response?.credential) {
            resolve(response.credential);
          } else {
            reject(new Error('Google 로그인 토큰을 가져오지 못했습니다.'));
          }
        },
      });

      // 프롬프트(원탭) 표시 시도
      window.google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed()) {
          reject(new Error('Google 로그인 창이 차단되었거나 표시할 수 없는 환경입니다.'));
        } else if (notification.isSkippedMoment()) {
          reject(new Error('Google 로그인이 취소되었습니다.'));
        }
      });
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Kakao JavaScript SDK 로드 및 초기화
 * @param {string} jsKey - 카카오 Javascript 키
 */
export async function loadKakaoSdk(jsKey) {
  if (!window.Kakao) {
    await loadScript(KAKAO_SDK_URL, 'kakao-js-sdk');
  }

  if (window.Kakao && !window.Kakao.isInitialized()) {
    if (!jsKey) {
      throw new Error('Kakao Javascript Key가 설정되지 않았습니다.');
    }
    window.Kakao.init(jsKey);
  }

  return window.Kakao;
}

/**
 * Kakao 팝업 로그인 실행
 * @param {string} jsKey - 카카오 Javascript 키
 * @returns {Promise<string>} access_token
 */
export async function triggerKakaoLogin(jsKey) {
  const kakao = await loadKakaoSdk(jsKey);

  return new Promise((resolve, reject) => {
    const loginFn = kakao?.Auth?.login || kakao?.Auth?.loginWithKakaoAccount;
    if (typeof loginFn !== 'function') {
      reject(new Error('Kakao SDK 로그인 함수를 찾을 수 없습니다. (Kakao.Auth.login)'));
      return;
    }

    loginFn.call(kakao.Auth, {
      success: (authObj) => {
        if (authObj?.access_token) {
          resolve(authObj.access_token);
        } else {
          reject(new Error('카카오 액세스 토큰을 가져오지 못했습니다.'));
        }
      },
      fail: (err) => {
        reject(new Error(err?.error_description || '카카오 로그인에 실패했습니다.'));
      },
    });
  });
}
