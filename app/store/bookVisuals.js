/**
 * 도서 시각 정보(책등 색/표지 색/두께/높이 계수) 로컬 브릿지 (CLIAR-186).
 *
 * backend-book은 현재 색상/두께를 저장하지 않는다. 사용자가 등록 시 고른 색·두께와
 * 3D 렌더링용 높이 계수를 bookId별로 localStorage에 임시 보관한다.
 * (후속 티켓에서 backend-book에 해당 필드가 추가되면 서버 값으로 이관 예정)
 *
 * 값이 없는 도서(예: 다른 기기에서 등록)는 bookId 해시로 결정론적 기본값을 만들어
 * 어디서 보든 같은 색/두께/높이로 안정적으로 렌더링되게 한다.
 */

import { getColorPresets } from '../features/register/ocrUtils';

const STORAGE_KEY = 'myReadingRoom.bookVisuals';

const THICKNESS_OPTIONS = [0.16, 0.22, 0.3];

function loadAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveAll(map) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // 저장 실패(용량 등)는 무시 — 다음 조회 시 결정론적 기본값으로 대체됨
  }
}

// 문자열(bookId) → 안정적인 양의 정수 해시
function hashString(str) {
  let hash = 0;
  const s = String(str);
  for (let i = 0; i < s.length; i += 1) {
    hash = (hash * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function deterministicVisual(bookId, librarianId = 'cat') {
  const h = hashString(bookId);
  const presets = getColorPresets(librarianId);
  const colorIdx = h % presets.length;
  const preset = presets[colorIdx];
  return {
    colorIdx,
    spineColor: preset.spine,
    coverColor: preset.cover,
    thickness: THICKNESS_OPTIONS[h % THICKNESS_OPTIONS.length],
    heightFactor: (h % 1000) / 1000,
  };
}

/**
 * bookId의 시각 정보를 반환. 저장된 값이 없으면 결정론적 기본값을 만들어 저장 후 반환.
 * @param {string|number} bookId
 * @param {string} [librarianId='cat']
 * @returns {{colorIdx?: number, spineColor: string, coverColor: string, thickness: number, heightFactor: number}}
 */
export function getVisual(bookId, librarianId = 'cat') {
  const key = String(bookId);
  const map = loadAll();
  if (map[key]) return map[key];
  const visual = deterministicVisual(key, librarianId);
  map[key] = visual;
  saveAll(map);
  return visual;
}

/**
 * 사용자가 고른 색/두께를 저장(등록 시 사용). heightFactor는 유지하거나 결정론적으로 생성.
 * @param {string|number} bookId
 * @param {{colorIdx?: number, spineColor?: string, coverColor?: string, thickness?: number}} patch
 */
export function setVisual(bookId, { colorIdx, spineColor, coverColor, thickness } = {}) {
  const key = String(bookId);
  const map = loadAll();
  const base = map[key] || deterministicVisual(key);
  map[key] = {
    colorIdx: colorIdx !== undefined ? colorIdx : base.colorIdx,
    spineColor: spineColor ?? base.spineColor,
    coverColor: coverColor ?? base.coverColor,
    thickness: thickness ?? base.thickness,
    heightFactor: base.heightFactor,
  };
  saveAll(map);
  return map[key];
}
