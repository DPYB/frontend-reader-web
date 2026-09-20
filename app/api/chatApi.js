/**
 * 백엔드 사서 채팅 API 클라이언트 (v1).
 *
 * 개발 환경에서는 Vite proxy를 통해 /api → localhost:8000 으로 프록시됩니다.
 * 배포 환경에서는 VITE_API_BASE_URL(예: https://api.xxx.com/api/v1)을 빌드 타임에 주입해
 * 별도 도메인의 백엔드를 직접 호출합니다. 설정되지 않으면 상대 경로(/api/v1)를 사용합니다.
 * 백엔드 서버가 꺼져 있거나 에러 발생 시 null을 반환하여 프론트 로컬 fallback을 사용합니다.
 */

import { getAccessToken } from './authApi';
import { fetchWithTimeout } from './fetchWithTimeout';
import { AI_API_BASE } from './apiBase';

// 사서 채팅은 backend-ai-agent가 담당한다 (사용자 요청, 2026-09:
// Cloudflare Pages 배포를 위해 core-api/ai-agent 베이스 URL을 분리).
const API_BASE = AI_API_BASE;

/**
 * 로그인 상태면 Authorization 헤더를 포함한 헤더 객체를 반환합니다.
 * 비로그인 상태(토큰 없음)면 Authorization 헤더 없이 반환하여 오케스트레이터가
 * 비로그인 사용자로 처리하도록 합니다 (서재 조회 등 인증 필요 기능만 제한됨).
 * @returns {Record<string, string>}
 */
function buildHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  const token = getAccessToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

/**
 * 백엔드 표준 LibrarianType ENUM 규격 매핑:
 * CAT(또는 RUSSIAN_BLUE), SHOEBILL, SEA_SLUG, GECKO
 *
 * @param {string|null} id
 * @returns {string|null}
 */
export function normalizeLibrarianId(id) {
  if (!id) return null;
  const lower = String(id).trim().toLowerCase();
  if (lower === 'cat' || lower === 'russian_blue' || lower === '블루' || lower === '고양이') {
    return 'CAT';
  }
  if (lower === 'stork' || lower === 'shoebill' || lower === '슈빌' || lower === '황새') {
    return 'SHOEBILL';
  }
  if (lower === 'nudi' || lower === 'sea_slug' || lower === '누디' || lower === '바다달팽이' || lower === '달팽이') {
    return 'SEA_SLUG';
  }
  if (lower === 'gecko' || lower === '게코' || lower === '도마뱀') {
    return 'GECKO';
  }
  return String(id).toUpperCase();
}

/**
 * 위도/경도 값이 유효한 범위인지 검증합니다 (위도 -90~90, 경도 -180~180).
 * @param {*} latitude
 * @param {*} longitude
 * @returns {boolean}
 */
function isValidCoords(latitude, longitude) {
  return (
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

/**
 * 사서에게 일반 JSON 채팅 메시지를 전송합니다 (단건 응답).
 *
 * @param {object} params
 * @param {string} params.message - 사용자 질문 메시지
 * @param {string|null} [params.sessionId] - 대화 세션 ID (첫 요청 시 null)
 * @param {string} [params.librarianId] - 사서 id ('cat' | 'stork', 미전달 시 백엔드 기본값 cat)
 * @param {number} [params.latitude] - 사용자 위치 위도 (날씨 연동용, 없으면 백엔드가 서울 기본값 사용)
 * @param {number} [params.longitude] - 사용자 위치 경도
 * @param {'chat'|'debate'|'discussion'} [params.mode='chat'] - 대화 모드 ('chat': 일반 대화, 'debate': 토론 모드)
 * @param {string|null} [params.persona=null] - 대상 페르소나 ID (DEBATE_CRITIC, DEBATE_STORYTELLER 등)
 * @param {string|number|null} [params.bookId=null] - 토론 대상 서재 도서 ID (토론 모드 시 전달)
 * @param {string|null} [params.topic=null] - 토론 논제 / 토픽
 * @param {'chat'|'conclude'} [params.action='chat'] - 토론 진행 / 즉시 마무리 큐레이션
 * @returns {Promise<{text: string, sessionId: string, switchTo: object|null, signals: object|null, libraryBooks: Array, library_books: Array, recommendedBooks: Array, recommended_books: Array}|null>} 응답 또는 null(실패 시)
 */
export async function sendChatMessage({
  message,
  sessionId = null,
  librarianId = null,
  latitude = null,
  longitude = null,
  mode = 'chat',
  persona = null,
  bookId = null,
  topic = null,
  action = 'chat',
}) {
  try {
    const payload = {
      message,
      stream: false,
    };
    if (mode === 'debate' || mode === 'DEBATE') {
      payload.mode = 'DEBATE';
    }
    if (persona) {
      payload.persona = persona;
    }
    if (action && action !== 'chat') {
      payload.action = action;
    }
    if (bookId) {
      payload.book_id = bookId;
    }
    if (topic) {
      payload.topic = topic;
    }
    if (sessionId) {
      payload.session_id = sessionId;
    }
    if (librarianId) {
      payload.librarian_id = normalizeLibrarianId(librarianId);
    }
    if (isValidCoords(latitude, longitude)) {
      payload.latitude = latitude;
      payload.longitude = longitude;
    } else if (latitude != null || longitude != null) {
      console.warn('[chatApi] 유효하지 않은 좌표라 전송하지 않습니다:', { latitude, longitude });
    }

    const response = await fetchWithTimeout(`${API_BASE}/chat`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorDetail = await response.text();
      console.warn(`[chatApi] 서버 응답 오류 (${response.status}):`, errorDetail);
      return null;
    }

    const data = await response.json();
    const libraryBooks = data.library_books || data.libraryBooks || [];
    const recommendedBooks = data.recommended_books || data.recommendedBooks || [];
    const isConcluded = Boolean(data.is_concluded ?? data.isConcluded ?? false);
    const debateSummary = data.debate_summary ?? data.debateSummary ?? null;
    return {
      text: data.message || data.reply || '',
      switchTo: data.switch_to ?? null,
      sessionId: data.session_id,
      signals: data.signals ?? null,
      libraryBooks,
      library_books: libraryBooks,
      recommendedBooks,
      recommended_books: recommendedBooks,
      isConcluded,
      is_concluded: isConcluded,
      debateSummary,
      debate_summary: debateSummary,
    };
  } catch (err) {
    console.warn('[chatApi] 백엔드 연결 실패, 로컬 fallback 사용:', err.message);
    return null;
  }
}

/**
 * 사서에게 실시간 SSE 스트리밍 대화 메시지를 요청합니다.
 * 백엔드 POST /chat/stream 엔드포인트와 연동하여 토큰 단위로 실시간 수신합니다.
 *
 * @param {object} params
 * @param {string} params.message - 사용자 질문 메시지
 * @param {string|null} [params.sessionId] - 대화 세션 ID (첫 요청 시 null)
 * @param {string} [params.librarianId] - 사서 id ('cat' | 'stork' | 'CAT' 등)
 * @param {number} [params.latitude] - 사용자 위치 위도 (날씨 연동용)
 * @param {number} [params.longitude] - 사용자 위치 경도
 * @param {'chat'|'debate'} [params.mode='chat'] - 대화 모드
 * @param {string|null} [params.persona=null] - 토론 페르소나 ID
 * @param {string|number|null} [params.bookId=null] - 토론 대상 서재 도서 ID
 * @param {string|null} [params.topic=null] - 토론 논제
 * @param {'chat'|'conclude'} [params.action='chat'] - 토론 액션
 * @param {(delta: string, fullText: string) => void} [params.onToken] - 실시간 텍스트 토큰 수신 콜백
 * @param {(books: Array) => void} [params.onBooks] - 추천 도서 수신 콜백
 * @param {(meta: object) => void} [params.onMetadata] - 메타데이터(세션, 날씨 등) 수신 콜백
 * @param {(suggestion: object) => void} [params.onSwitchSuggestion] - 사서 전환 제안 수신 콜백
 * @returns {Promise<{text: string, sessionId: string, switchTo: object|null, signals: object|null, libraryBooks: Array, library_books: Array, recommendedBooks: Array, recommended_books: Array, isConcluded: boolean, debateSummary: string|null}|null>} 최종 응답 또는 null(실패 시)
 */
export async function streamChatMessage({
  message,
  sessionId = null,
  librarianId = null,
  latitude = null,
  longitude = null,
  mode = 'chat',
  persona = null,
  bookId = null,
  topic = null,
  action = 'chat',
  onToken,
  onBooks,
  onMetadata,
  onSwitchSuggestion,
}) {
  try {
    const payload = {
      message,
      stream: true,
    };
    if (mode === 'debate' || mode === 'DEBATE') {
      payload.mode = 'DEBATE';
    }
    if (persona) {
      payload.persona = persona;
    }
    if (action && action !== 'chat') {
      payload.action = action;
    }
    if (bookId) {
      payload.book_id = bookId;
    }
    if (topic) {
      payload.topic = topic;
    }
    if (sessionId) {
      payload.session_id = sessionId;
    }
    if (librarianId) {
      payload.librarian_id = normalizeLibrarianId(librarianId);
    }
    if (isValidCoords(latitude, longitude)) {
      payload.latitude = latitude;
      payload.longitude = longitude;
    } else if (latitude != null || longitude != null) {
      console.warn('[chatApi] 유효하지 않은 좌표라 전송하지 않습니다:', { latitude, longitude });
    }

    const response = await fetchWithTimeout(`${API_BASE}/chat/stream`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorDetail = await response.text();
      console.warn(`[chatApi] 스트리밍 요청 오류 (${response.status}):`, errorDetail);
      return null;
    }

    if (!response.body) {
      console.warn('[chatApi] 스트리밍 응답 바디가 없습니다.');
      return null;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let accumulatedText = '';
    let currentSessionId = sessionId;
    let finalSwitchTo = null;
    let finalSignals = null;
    let finalBooks = [];
    let finalLibraryBooks = [];
    let finalIsConcluded = false;
    let finalDebateSummary = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split('\n\n');
      buffer = parts.pop() || '';

      for (const block of parts) {
        if (!block.trim()) continue;

        let eventType = 'message';
        let eventDataRaw = '';

        const lines = block.split('\n');
        for (const line of lines) {
          if (line.startsWith('event:')) {
            eventType = line.replace('event:', '').trim();
          } else if (line.startsWith('data:')) {
            eventDataRaw = line.replace('data:', '').trim();
          }
        }

        if (!eventDataRaw) continue;

        let eventData = null;
        try {
          eventData = JSON.parse(eventDataRaw);
        } catch {
          eventData = eventDataRaw;
        }

        if (eventType === 'metadata') {
          if (eventData?.session_id) {
            currentSessionId = eventData.session_id;
          }
          if (eventData?.signals) {
            finalSignals = eventData.signals;
          }
          onMetadata?.(eventData);
        } else if (eventType === 'token') {
          const delta = eventData?.delta || '';
          if (delta) {
            accumulatedText += delta;
            onToken?.(delta, accumulatedText);
          }
        } else if (eventType === 'books') {
          const books = eventData?.books || [];
          finalBooks = books;
          onBooks?.(books);
        } else if (eventType === 'switch_suggestion') {
          finalSwitchTo = eventData;
          onSwitchSuggestion?.(eventData);
        } else if (eventType === 'done') {
          if (eventData?.session_id) {
            currentSessionId = eventData.session_id;
          }
          if (eventData?.reply && !accumulatedText) {
            accumulatedText = eventData.reply;
            onToken?.(accumulatedText, accumulatedText);
          }
          if (eventData?.switch_suggestion) {
            finalSwitchTo = eventData.switch_suggestion;
          }
          if (eventData?.recommended_books) {
            finalBooks = eventData.recommended_books;
          }
          if (eventData?.library_books) {
            finalLibraryBooks = eventData.library_books;
          }
          if (eventData?.signals) {
            finalSignals = eventData.signals;
          }
          if (eventData?.is_concluded != null) {
            finalIsConcluded = Boolean(eventData.is_concluded);
          }
          if (eventData?.debate_summary) {
            finalDebateSummary = eventData.debate_summary;
          }
        } else if (eventType === 'error') {
          console.warn('[chatApi] SSE 스트리밍 에러 이벤트:', eventData);
        }
      }
    }

    return {
      text: accumulatedText,
      sessionId: currentSessionId,
      switchTo: finalSwitchTo,
      signals: finalSignals,
      libraryBooks: finalLibraryBooks,
      library_books: finalLibraryBooks,
      recommendedBooks: finalBooks,
      recommended_books: finalBooks,
      isConcluded: finalIsConcluded,
      is_concluded: finalIsConcluded,
      debateSummary: finalDebateSummary,
      debate_summary: finalDebateSummary,
    };
  } catch (err) {
    console.warn('[chatApi] 스트리밍 실패, fallback 처리:', err.message);
    return null;
  }
}

/**
 * 백엔드 헬스체크.
 * @returns {Promise<boolean>} 서버 정상 여부
 */
export async function checkHealth() {
  try {
    const response = await fetchWithTimeout(`${API_BASE}/health`);
    return response.ok;
  } catch {
    return false;
  }
}

