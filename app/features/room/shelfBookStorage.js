/**
 * 선반별 도서 커스텀 배치(드래그 앤 드롭 위치) 로컬 저장소 및 정합성 유틸리티.
 *
 * 백엔드에 선반 위치 API가 추가되기 전까지 사용자 계정 및 사서별로
 * localStorage에 선반별 도서 ID 목록을 영속화하여 관리합니다.
 * (후속 백엔드 API 연동 시 이 모듈에서 서버 저장 로직으로 교체 가능)
 */

const STORAGE_PREFIX = 'myReadingRoom.shelfAssignments';

/** 사용자 및 사서별 고유 스토리지 키 생성 */
export function getShelfStorageKey(librarianId = 'cat', userId = 'guest') {
  const safeUser = String(userId || 'guest').trim() || 'guest';
  const safeLib = String(librarianId || 'cat').trim() || 'cat';
  return `${STORAGE_PREFIX}.${safeUser}.${safeLib}`;
}

/**
 * 저장된 선반 배치 데이터를 로드합니다.
 * @param {string} librarianId
 * @param {string} userId
 * @returns {Record<number, string[]>|null} { [shelfIndex]: [bookId, ...] }
 */
export function loadShelfAssignments(librarianId = 'cat', userId = 'guest') {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(getShelfStorageKey(librarianId, userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * 선반 배치 데이터를 저장합니다.
 * @param {string} librarianId
 * @param {string} userId
 * @param {Record<number, string[]>} assignments
 */
export function saveShelfAssignments(librarianId = 'cat', userId = 'guest', assignments = {}) {
  if (typeof window === 'undefined') return;
  try {
    const key = getShelfStorageKey(librarianId, userId);
    localStorage.setItem(key, JSON.stringify(assignments));
  } catch {
    // 저장 용량 초과 등 예외 무시
  }
}

/**
 * 현재 도서 목록과 선반 용량(capacity), 저장된 배치를 결합하여
 * 각 선반별 실제 도서 배열(`Array<Book[]>`)을 생성합니다.
 *
 * - 삭제된 도서: 저장된 목록에서 자동으로 걸러짐.
 * - 신규 추가 도서: 아직 할당되지 않은 도서는 여유가 있는 첫 번째 선반부터 순서대로 자동 배치.
 * - 선반 capacity 초과 방지: 지정된 capacity 한도를 넘지 않도록 제한.
 *
 * @param {Array} books - 현재 전체 도서 목록
 * @param {Array} shelves - 선반 설정 배열
 * @param {Record<number, string[]>|null} savedAssignments - 저장된 배치
 * @returns {Array<Array<object>>} 각 선반(shelfIndex)에 들어갈 도서 배열의 배열
 */
export function reconcileShelfGroups(books = [], shelves = [], savedAssignments = null) {
  if (!shelves.length) return [];
  if (!books.length) return shelves.map(() => []);

  const bookMap = new Map();
  books.forEach((b) => {
    const idStr = String(b.id || b.bookId);
    bookMap.set(idStr, b);
  });

  // 저장된 배치가 전혀 없는 경우: 기존 순차 배치 로직 적용
  if (!savedAssignments || Object.keys(savedAssignments).length === 0) {
    let ptr = 0;
    return shelves.map((shelf) => {
      const cap = shelf.capacity && shelf.capacity > 0 ? shelf.capacity : Infinity;
      const take = Math.min(cap, books.length - ptr);
      const slice = books.slice(ptr, ptr + Math.max(0, take));
      ptr += slice.length;
      return slice;
    });
  }

  const assignedBookIds = new Set();
  const groups = shelves.map(() => []);

  // 1) 저장된 배치를 바탕으로 선반별 도서 매핑
  shelves.forEach((shelf, sIdx) => {
    const targetIds = savedAssignments[sIdx] || [];
    const cap = shelf.capacity && shelf.capacity > 0 ? shelf.capacity : Infinity;

    for (const rawId of targetIds) {
      if (groups[sIdx].length >= cap) break;
      const idStr = String(rawId);
      if (bookMap.has(idStr) && !assignedBookIds.has(idStr)) {
        groups[sIdx].push(bookMap.get(idStr));
        assignedBookIds.add(idStr);
      }
    }
  });

  // 2) 아직 어떤 선반에도 할당되지 않은 신규/미배치 도서들을 빈 자리에 차례대로 채움
  const unassignedBooks = books.filter((b) => {
    const idStr = String(b.id || b.bookId);
    return !assignedBookIds.has(idStr);
  });

  let unassignedPtr = 0;
  for (let sIdx = 0; sIdx < shelves.length && unassignedPtr < unassignedBooks.length; sIdx += 1) {
    const shelf = shelves[sIdx];
    const cap = shelf.capacity && shelf.capacity > 0 ? shelf.capacity : Infinity;
    while (groups[sIdx].length < cap && unassignedPtr < unassignedBooks.length) {
      groups[sIdx].push(unassignedBooks[unassignedPtr]);
      unassignedPtr += 1;
    }
  }

  return groups;
}

/**
 * 도서를 한 선반에서 다른 선반(또는 같은 선반 내 다른 위치)으로 이동한 후
 * 새로운 assignments 객체를 반환합니다.
 *
 * @param {Array<Array<object>>} currentGroups - 현재 선반별 도서 배열
 * @param {string|number} bookId - 이동할 도서 ID
 * @param {number} targetShelfIdx - 목표 선반 인덱스
 * @param {number} [targetIndex] - 목표 선반 내 삽입 인덱스 (기본값: 마지막)
 * @returns {Record<number, string[]>} 새로 갱신된 assignments 맵
 */
export function moveBookAssignment(currentGroups, bookId, targetShelfIdx, targetIndex = -1) {
  const idStr = String(bookId);
  const nextGroups = currentGroups.map((g) => [...g]);

  let movingBook = null;

  // 기존 선반에서 도서 제거
  for (let sIdx = 0; sIdx < nextGroups.length; sIdx += 1) {
    const foundIdx = nextGroups[sIdx].findIndex((b) => String(b.id || b.bookId) === idStr);
    if (foundIdx !== -1) {
      [movingBook] = nextGroups[sIdx].splice(foundIdx, 1);
      break;
    }
  }

  if (!movingBook) return {};

  const safeTargetShelf = Math.max(0, Math.min(nextGroups.length - 1, targetShelfIdx));
  const targetGroup = nextGroups[safeTargetShelf];

  if (targetIndex >= 0 && targetIndex <= targetGroup.length) {
    targetGroup.splice(targetIndex, 0, movingBook);
  } else {
    targetGroup.push(movingBook);
  }

  const newAssignments = {};
  nextGroups.forEach((group, sIdx) => {
    newAssignments[sIdx] = group.map((b) => String(b.id || b.bookId));
  });

  return newAssignments;
}
