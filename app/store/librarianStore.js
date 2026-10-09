import { createContext, useContext } from 'react';

// 활성 사서 id
export const ACTIVE_LIBRARIAN_KEY = 'myReadingRoom.activeLibrarian';
// 사용자가 지정한 사서 이름 { [librarianId]: name }
export const LIBRARIAN_NAMES_KEY = 'myReadingRoom.librarianNames';
// 사서 채팅 세션 및 직전 대화/추천 복원용 (CLIAR-257)
// 사서 채팅 세션 및 직전 대화/추천 복원용 (CLIAR-257, State Leaking 방지)
export const CHAT_SESSION_STORAGE_KEY = 'myReadingRoom.chatSession';

/**
 * 사용자 ID, 모드, 사서 ID별 세션스토리지 키 생성.
 * 패턴: myReadingRoom.chatSession.{memberId || 'guest'}.{mode || 'chat'}.{librarianId}
 */
export function getChatSessionStorageKey(librarianId, memberId = 'guest', mode = 'chat') {
  const userKey = memberId || 'guest';
  const modeKey = mode || 'chat';
  if (librarianId) {
    return `${CHAT_SESSION_STORAGE_KEY}.${userKey}.${modeKey}.${librarianId}`;
  }
  return `${CHAT_SESSION_STORAGE_KEY}.${userKey}.${modeKey}`;
}

export function loadSavedChatSession(memberId = 'guest', mode = 'chat') {
  try {
    const key = getChatSessionStorageKey(null, memberId, mode);
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveChatSession(sessionData, memberId = 'guest', mode = 'chat') {
  try {
    const key = getChatSessionStorageKey(null, memberId, mode);
    sessionStorage.setItem(key, JSON.stringify(sessionData));
  } catch {
    // 무시
  }
}

export function loadSavedChatSessionByLibrarian(librarianId, memberId = 'guest', mode = 'chat') {
  try {
    if (!librarianId) return null;
    const key = getChatSessionStorageKey(librarianId, memberId, mode);
    const raw = sessionStorage.getItem(key);
    if (raw) return JSON.parse(raw);
    return null;
  } catch {
    return null;
  }
}

export function saveChatSessionByLibrarian(librarianId, sessionData, memberId = 'guest', mode = 'chat') {
  try {
    if (librarianId) {
      const key = getChatSessionStorageKey(librarianId, memberId, mode);
      sessionStorage.setItem(key, JSON.stringify(sessionData));
    }
  } catch {
    // 무시
  }
}

/**
 * 모든 사서 대화 세션 스토리지 캐시를 일괄 삭제 (로그아웃, 로그인, 게스트 전환, 세션 만료 시 호출).
 */
export function clearChatSession() {
  try {
    const keysToRemove = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k && (k === CHAT_SESSION_STORAGE_KEY || k.startsWith(`${CHAT_SESSION_STORAGE_KEY}.`))) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach((k) => sessionStorage.removeItem(k));
  } catch {
    // 무시
  }
}

export function clearChatSessionByLibrarian(librarianId, memberId = 'guest', mode = 'chat') {
  try {
    if (librarianId) {
      const key = getChatSessionStorageKey(librarianId, memberId, mode);
      sessionStorage.removeItem(key);
    }
  } catch {
    // 무시
  }
}

export const LibrarianContext = createContext(null);

export function useLibrarian() {
  const ctx = useContext(LibrarianContext);
  if (!ctx) throw new Error('useLibrarian must be used within a LibrarianProvider');
  return ctx;
}
