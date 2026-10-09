import * as THREE from 'three';
import { getColorPresets } from '../register/ocrUtils';

// 배경 이미지 (public/room/) — CLIAR-180: 내 서재 UI 갱신, WebP로 변환(1920px, 16:9 비율 유지)
export const BG_SRC_CAT = '/room/readingroom_cat.webp';
// 슈빌(황새) 서재 배경: 라이트 모드 & 나이트 모드 전용 UI (2026-10)
export const BG_SRC_STORK_LIGHT = '/room/readingroom_stork_light.webp';
export const BG_SRC_STORK_NIGHT = '/room/readingroom_stork_night.webp';
export const BG_SRC_STORK = '/room/readingroom_stork_night.webp'; // 하위 호환 기본값
// 누디 서재 배경 (사용자 제공 readingroom_nudi.png → webp 변환, 2026-09).
export const BG_SRC_NUDI = '/room/readingroom_nudi.webp';
// 게코 서재 배경 (사용자 제공 readingroom_gecko.png → webp 변환, 2560x1440 → 1920x1080, 2026-09).
export const BG_SRC_GECKO = '/room/readingroom_gecko.webp';
export const BG_SRC = BG_SRC_CAT; // 기본값 (하위 호환)
// 배경 원본 비율 (원본 픽셀에 맞게 조정)
export const BG_ASPECT = 768 / 432;

// ─────────────────────────────────────────────────────────────
// 배포되는 "저장된 배치 설정" (source of truth).
// 개발 모드의 캘리브레이션 도구에서 값을 맞춘 뒤,
// "설정 JSON 복사" 버튼으로 복사한 내용을 아래에 그대로 붙여넣으면
// 모든 사용자에게 그 배치가 적용된다.
// 사서(cat/stork)별로 배경 그림이 다르므로 카메라/선반 배치도 독립적으로 관리한다.
// ─────────────────────────────────────────────────────────────

// 그림 투시에 맞춘 카메라 (고양이 서재)
const CAT_CAMERA = {
  fov: 28,
  position: [-9.38, -0.89, 24],
  target: [7.52, -0.13, 0.67],
};

/**
 * 고양이 서재 선반 배치.
 *  - id:      식별용 이름
 *  - pos:     선반 바닥면 중심 [x, y, z]
 *  - rotYdeg: 선반의 좌우 기울기(도)
 *  - width:   선반 폭(이 폭을 넘으면 다음 선반으로)
 *  - depth:   책 앞뒤 깊이
 *  - capacity: 이 선반의 최대 권수 (0=무제한, 초과 시 다음 선반으로)
 *
 * 5개 선반 모두 capacity: 10으로 맞춰 총 50권까지 수용한다(사용자 요청, 2026-09).
 * placeBooks()가 마지막 선반도 capacity를 지키도록 수정되어 있어, 50권을 넘는
 * 책은 어느 선반에도 배치되지 않아 화면에 보이지 않는다(등록 상한은 별도 처리 필요).
 */
const CAT_SHELVES = [
  {
    id: 'top',
    pos: [-1.09, 0.96, -0.4],
    rotXdeg: -7,
    rotYdeg: -3.5,
    rotZdeg: -2.5,
    width: 2.13,
    depth: 0.2,
    bookHeight: 0.8,
    heightVar: 0.27,
    capacity: 10, // 이 권수를 넘으면 다음 선반으로
  },
  {
    id: 'shelf2',
    pos: [-2.8, -0.18, 4.61],
    rotXdeg: -5,
    rotYdeg: -10.5,
    rotZdeg: -4,
    width: 1.65,
    depth: 0.2,
    bookHeight: 0.54,
    heightVar: 0.27,
    capacity: 10,
  },
  {
    id: 'shelf3',
    pos: [-2.8, -0.9, 4.6],
    rotXdeg: -11.5,
    rotYdeg: -14,
    rotZdeg: -4,
    width: 1.65,
    depth: 0.2,
    bookHeight: 0.54,
    heightVar: 0.27,
    capacity: 10,
  },
  {
    id: 'shelf4',
    pos: [-2.8, -1.65, 4.6],
    rotXdeg: -11.5,
    rotYdeg: -14,
    rotZdeg: -4,
    width: 1.65,
    depth: 0.2,
    bookHeight: 0.54,
    heightVar: 0.27,
    capacity: 10,
  },
  {
    id: 'shelf5',
    pos: [-2.75, -2.25, 4.6],
    rotXdeg: -7.5,
    rotYdeg: -38,
    rotZdeg: -5,
    width: 1.65,
    depth: 0.2,
    bookHeight: 0.54,
    heightVar: 0.27,
    capacity: 10,
  },
];

// 그림 투시에 맞춘 카메라 (황새 서재)
const STORK_CAMERA = {
  fov: 28,
  position: [-9.38, -0.89, 24],
  target: [7.52, -0.13, 0.67],
};

// 황새 서재 선반 배치 (1~7번 선반)
const STORK_SHELVES = [
  {
    id: 'shelf1',
    pos: [-2.81, 0.6, -0.53],
    rotXdeg: -2.6,
    rotYdeg: 9.2,
    rotZdeg: 0.4,
    width: 1.67,
    depth: 0.2,
    bookHeight: 0.8,
    heightVar: 0.27,
    capacity: 8,
  },
  {
    id: 'shelf2',
    pos: [-3.76, -0.7, 2.81],
    rotXdeg: -0.2,
    rotYdeg: 6.7,
    rotZdeg: -1,
    width: 1.2,
    depth: 0.25,
    bookHeight: 0.75,
    heightVar: 0.27,
    capacity: 8,
  },
  {
    id: 'shelf3',
    pos: [-3.65, -1.98, 2.36],
    rotXdeg: 3.4,
    rotYdeg: 1.2,
    rotZdeg: 1,
    width: 0.66,
    depth: 0.35,
    bookHeight: 0.68,
    heightVar: 0.27,
    capacity: 4,
  },
  {
    id: 'shelf4',
    pos: [-1.18, 0.24, 1.16],
    rotXdeg: -4.6,
    rotYdeg: 9.3,
    rotZdeg: -2.3,
    width: 0.83,
    depth: 0.25,
    bookHeight: 0.69,
    heightVar: 0.24,
    capacity: 4,
  },
  {
    id: 'shelf5',
    pos: [-1.11, -0.49, 1.27],
    rotXdeg: -5.9,
    rotYdeg: 2.9,
    rotZdeg: 0.7,
    width: 0.97,
    depth: 0.25,
    bookHeight: 0.64,
    heightVar: 0.24,
    capacity: 5,
  },
  {
    id: 'shelf6',
    pos: [4.63, 0.98, 1.34],
    rotXdeg: 3.1,
    rotYdeg: -15.4,
    rotZdeg: 3.7,
    width: 2.24,
    depth: 0.3,
    bookHeight: 0.79,
    heightVar: 0.25,
    capacity: 10,
  },
  {
    id: 'shelf7',
    pos: [4.58, -0.57, 1.23],
    rotXdeg: 1.2,
    rotYdeg: -25.3,
    rotZdeg: -0.9,
    width: 1.75,
    depth: 0.3,
    bookHeight: 0.8,
    heightVar: 0.25,
    capacity: 8,
  },
];

// 그림 투시에 맞춘 카메라 (누디 서재, 사용자 캘리브레이션 결과 반영, 2026-09)
const NUDI_CAMERA = {
  fov: 28,
  position: [-9.38, -0.89, 24],
  target: [7.52, -0.13, 0.67],
};

// 누디 서재 선반 배치 (1~5번 선반)
const NUDI_SHELVES = [
  {
    id: 'shelf1',
    pos: [-2.94, 0.39, -0.08],
    rotXdeg: -14,
    rotYdeg: 15.1,
    rotZdeg: -3,
    width: 1.36,
    depth: 0.2,
    bookHeight: 1.55,
    heightVar: 0.31,
    capacity: 6,
  },
  {
    id: 'shelf2',
    pos: [-1.03, 0.27, -0.97],
    rotXdeg: -10.7,
    rotYdeg: 8.8,
    rotZdeg: -3,
    width: 1.8,
    depth: 0.28,
    bookHeight: 1.05,
    heightVar: 0.34,
    capacity: 8,
  },
  {
    id: 'shelf3',
    pos: [-2.66, -1.23, -1.27],
    rotXdeg: 1.2,
    rotYdeg: 14.7,
    rotZdeg: 2.9,
    width: 1.3,
    depth: 0.2,
    bookHeight: 1.05,
    heightVar: 0.25,
    capacity: 6,
  },
  {
    id: 'shelf4',
    pos: [-1, -1.11, -1.28],
    rotXdeg: 5.1,
    rotYdeg: 10.7,
    rotZdeg: 2.5,
    width: 1.74,
    depth: 0.24,
    bookHeight: 0.8,
    heightVar: 0.24,
    capacity: 8,
  },
  {
    id: 'shelf5',
    pos: [-2.64, -2.54, -1.22],
    rotXdeg: 7.3,
    rotYdeg: 18.3,
    rotZdeg: 4.5,
    width: 1.37,
    depth: 0.2,
    bookHeight: 1.03,
    heightVar: 0.27,
    capacity: 6,
  },
  {
    id: 'shelf6',
    pos: [-0.75, -2.28, -1.75],
    rotXdeg: 6.4,
    rotYdeg: 17.8,
    rotZdeg: 4.8,
    width: 2.1,
    depth: 0.2,
    bookHeight: 0.95,
    heightVar: 0.27,
    capacity: 8,
  },
  {
    id: 'shelf7',
    pos: [-3.02, -2.91, 3.84],
    rotXdeg: 6.2,
    rotYdeg: 21.1,
    rotZdeg: 5.3,
    width: 2.302,
    depth: 0.4,
    bookHeight: 0.68,
    heightVar: 0.27,
    capacity: 14,
  },
];

// 그림 투시에 맞춘 카메라 (게코 서재, 사용자 캘리브레이션 결과 반영, 2026-09)
const GECKO_CAMERA = {
  fov: 28,
  position: [-9.38, -0.89, 24],
  target: [7.52, -0.13, 0.67],
};

// 게코 서재 선반 배치 (1~9번 선반)
const GECKO_SHELVES = [
  {
    id: 'shelf1',
    pos: [-1.38, 1.45, 0.66],
    rotXdeg: -27.1,
    rotYdeg: 12.5,
    rotZdeg: -7.8,
    width: 2.46,
    depth: 0.2,
    bookHeight: 0.95,
    heightVar: 0.3,
    capacity: 11,
  },
  {
    id: 'shelf2',
    pos: [0.12, 0.82, 1.94],
    rotXdeg: -25,
    rotYdeg: 10.5,
    rotZdeg: -10.3,
    width: 1.53,
    depth: 0.2,
    bookHeight: 0.85,
    heightVar: 0.28,
    capacity: 8,
  },
  {
    id: 'shelf3',
    pos: [1.21, 0.32, 3.11],
    rotXdeg: -23.5,
    rotYdeg: 8.6,
    rotZdeg: -10.8,
    width: 1.95,
    depth: 0.2,
    bookHeight: 0.8,
    heightVar: 0.25,
    capacity: 11,
  },
  {
    id: 'shelf4',
    pos: [-1.35, 0.05, 0.66],
    rotXdeg: -16.1,
    rotYdeg: 15.5,
    rotZdeg: -4.8,
    width: 2.6,
    depth: 0.2,
    bookHeight: 0.95,
    heightVar: 0.3,
    capacity: 11,
  },
  {
    id: 'shelf5',
    pos: [0.12, -0.32, 1.85],
    rotXdeg: -17.4,
    rotYdeg: 11.9,
    rotZdeg: -5.6,
    width: 1.45,
    depth: 0.2,
    bookHeight: 0.82,
    heightVar: 0.26,
    capacity: 8,
  },
  {
    id: 'shelf6',
    pos: [1.09, -0.66, 3.43],
    rotXdeg: -18,
    rotYdeg: 8,
    rotZdeg: -7.5,
    width: 1.96,
    depth: 0.2,
    bookHeight: 0.78,
    heightVar: 0.25,
    capacity: 11,
  },
  {
    id: 'shelf7',
    pos: [-1.34, -1.3, 0.64],
    rotXdeg: -13.8,
    rotYdeg: 9.7,
    rotZdeg: -3,
    width: 2.46,
    depth: 0.2,
    bookHeight: 0.85,
    heightVar: 0.26,
    capacity: 11,
  },
  {
    id: 'shelf8',
    pos: [0.8, -1.51, 0.2],
    rotXdeg: -8.3,
    rotYdeg: 12.9,
    rotZdeg: -3,
    width: 1.53,
    depth: 0.2,
    bookHeight: 0.8,
    heightVar: 0.25,
    capacity: 8,
  },
  {
    id: 'shelf9',
    pos: [1.72, -1.61, 2.1],
    rotXdeg: -10,
    rotYdeg: 7.1,
    rotZdeg: -4,
    width: 2,
    depth: 0.2,
    bookHeight: 0.75,
    heightVar: 0.24,
    capacity: 11,
  },
];

// 사서 id별 기본 카메라/선반 배치.
export const CAMERA_BY_LIBRARIAN = {
  cat: CAT_CAMERA,
  stork: STORK_CAMERA,
  nudi: NUDI_CAMERA,
  gecko: GECKO_CAMERA,
};

export const SHELVES_BY_LIBRARIAN = {
  cat: CAT_SHELVES,
  stork: STORK_SHELVES,
  nudi: NUDI_SHELVES,
  gecko: GECKO_SHELVES,
};

// 사서 id별 모바일 선반 오버레이 이미지 폴더명
export const SHELVES_FOLDER_BY_LIBRARIAN = {
  cat: 'cat_shelves',
  stork: 'stork_shelves',
  nudi: 'nudi_shelves',
  gecko: 'gecko_shelves',
};

/** 사서 id에 맞는 모바일 선반 이미지 폴더명을 반환 (기본값: cat_shelves) */
export function getShelfFolder(librarianId) {
  return SHELVES_FOLDER_BY_LIBRARIAN[librarianId] || 'cat_shelves';
}

// 사서 id별 모바일 선반 터치 영역 좌표 (1번부터 순서대로)
export const SHELF_TOUCH_BOUNDS_BY_LIBRARIAN = {
  // 고양이(블루) 사서: 5개 선반
  cat: [
    { top: '32.5%', height: '8.5%', left: '8.0%', width: '15.0%' }, // 1번 선반 (상단)
    { top: '40.5%', height: '8.0%', left: '8.0%', width: '15.0%' }, // 2번 선반
    { top: '48.0%', height: '8.0%', left: '8.0%', width: '15.0%' }, // 3번 선반
    { top: '55.5%', height: '8.0%', left: '8.0%', width: '15.0%' }, // 4번 선반
    { top: '63.0%', height: '8.0%', left: '8.0%', width: '15.0%' }, // 5번 선반 (하단)
  ],
  // 황새(슈빌) 사서: 7개 선반
  stork: [
    { top: '28.0%', height: '15.5%', left: '1.0%', width: '12.0%' }, // 1번 선반 (좌측 상단)
    { top: '43.5%', height: '11.0%', left: '1.0%', width: '12.0%' }, // 2번 선반 (좌측 중단)
    { top: '54.5%', height: '13.0%', left: '1.5%', width: '12.0%' }, // 3번 선반 (좌측 하단)
    { top: '35.0%', height: '11.0%', left: '13.5%', width: '8.0%' }, // 4번 선반 (중앙 상단)
    { top: '45.5%', height: '8.5%', left: '13.5%', width: '8.0%' },  // 5번 선반 (중앙 하단)
    { top: '28.5%', height: '14.0%', left: '35.5%', width: '13.0%' }, // 6번 선반 (우측 상단)
    { top: '42.0%', height: '13.0%', left: '35.5%', width: '13.0%' }, // 7번 선반 (우측 하단)
  ],
  // 누디 사서: 7개 선반
  nudi: [
    { top: '22.0%', height: '24.0%', left: '2.5%', width: '8.5%' },  // 1번 선반 (좌측 상단)
    { top: '30.5%', height: '17.0%', left: '9.5%', width: '10.0%' }, // 2번 선반 (우측 상단)
    { top: '45.0%', height: '13.5%', left: '2.5%', width: '8.0%' },  // 3번 선반 (좌측 중단)
    { top: '46.5%', height: '11.5%', left: '9.5%', width: '9.5%' },  // 4번 선반 (우측 중단)
    { top: '58.0%', height: '13.0%', left: '2.5%', width: '8.5%' },  // 5번 선반 (좌측 하단)
    { top: '58.0%', height: '13.0%', left: '9.5%', width: '10.0%' }, // 6번 선반 (우측 하단)
    { top: '68.0%', height: '14.0%', left: '2.5%', width: '17.0%' }, // 7번 선반 (최하단)
  ],
  // 게코 사서: 9개 선반
  gecko: [
    { top: '21.0%', height: '18.0%', left: '9.0%', width: '12.5%' }, // 1번 선반 (1열 상단)
    { top: '29.5%', height: '13.0%', left: '20.5%', width: '7.5%' }, // 2번 선반 (2열 상단)
    { top: '34.5%', height: '13.0%', left: '27.0%', width: '9.5%' }, // 3번 선반 (3열 상단)
    { top: '33.0%', height: '17.0%', left: '9.0%', width: '12.5%' }, // 4번 선반 (1열 중단)
    { top: '39.0%', height: '13.0%', left: '20.5%', width: '7.5%' }, // 5번 선반 (2열 중단)
    { top: '42.5%', height: '13.0%', left: '27.0%', width: '9.5%' }, // 6번 선반 (3열 중단)
    { top: '46.0%', height: '14.0%', left: '9.0%', width: '12.5%' }, // 7번 선반 (1열 하단)
    { top: '49.5%', height: '12.0%', left: '20.5%', width: '7.5%' }, // 8번 선반 (2열 하단)
    { top: '52.0%', height: '11.0%', left: '27.0%', width: '9.5%' }, // 9번 선반 (3열 하단)
  ],
};

/** 사서 id에 맞는 모바일 선반 터치 영역 배열을 반환 */
export function getShelfTouchBounds(librarianId) {
  return SHELF_TOUCH_BOUNDS_BY_LIBRARIAN[librarianId] || SHELF_TOUCH_BOUNDS_BY_LIBRARIAN.cat;
}

// 하위 호환용 기본 터치 좌표 (고양이 기준)
export const SHELF_TOUCH_BOUNDS = SHELF_TOUCH_BOUNDS_BY_LIBRARIAN.cat;

// 사서 id별 서재 배경 이미지 (라이트 / 다크 테마 분기 지원).
export const BG_SRC_BY_LIBRARIAN = {
  cat: BG_SRC_CAT,
  stork: {
    light: BG_SRC_STORK_LIGHT,
    dark: BG_SRC_STORK_NIGHT,
  },
  nudi: BG_SRC_NUDI,
  gecko: BG_SRC_GECKO,
};

/** 사서 id 및 테마(isDark)에 맞는 서재 배경 이미지를 반환 (없으면 고양이 기준) */
export function getBgSrc(librarianId, isDark = true) {
  const bg = BG_SRC_BY_LIBRARIAN[librarianId] || BG_SRC_CAT;
  if (typeof bg === 'object' && bg !== null) {
    return isDark ? bg.dark : bg.light;
  }
  return bg;
}

// 하위 호환용 기본값 (고양이 기준)
export const DEFAULT_CAMERA = CAT_CAMERA;
export const DEFAULT_SHELVES = CAT_SHELVES;

/** 사서 id에 맞는 기본 카메라 설정을 반환 (없으면 고양이 기준, 깊은 복사) */
export function getDefaultCamera(librarianId) {
  const cam = CAMERA_BY_LIBRARIAN[librarianId] || CAT_CAMERA;
  return JSON.parse(JSON.stringify(cam));
}

/** 사서 id에 맞는 기본 선반 배치를 반환 (없으면 고양이 기준, 깊은 복사) */
export function getDefaultShelves(librarianId) {
  const shelves = SHELVES_BY_LIBRARIAN[librarianId] || CAT_SHELVES;
  return JSON.parse(JSON.stringify(shelves));
}

// 선반에 bookHeight가 없을 때 기본 책 높이
const FALLBACK_BOOK_HEIGHT = 1.1;
const MIN_BOOK_HEIGHT = 0.3;

// 문자열 id → 0~1 사이 고정값 (heightFactor 없는 기존 책 대비용)
function hash01(str = '') {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 1000) / 1000;
}

const GAP = 0.02; // 책 사이 간격

const MIN_SQUEEZE = 0.02; // 압축 하한(너무 얇아지지 않게)

/**
 * 등록된 책 목록을 선반들에 배치.
 *  - 책은 선반 순서대로(위 선반부터) 채워짐. 선반의 capacity(권수)로 다음 선반 넘김(0/미설정=무제한).
 *  - 한 선반 안에서 width는 "squeeze 폭": 자연 두께 합이 width를 넘으면 그만큼 압축, 남으면 원래 두께 유지.
 *  - 책 행은 선반 중앙 정렬.
 * @param {Array} books - { id, title, thickness, heightFactor, spineColor, coverColor }
 * @param {Array} shelves - 선반 설정 배열
 * @returns {Array} placements - { ...book, position, size, rotation }
 */
export function placeBooks(books, shelves = DEFAULT_SHELVES) {
  const placements = [];
  if (!shelves.length) return placements;

  /*
   * 1) 책을 선반별로 분배 (capacity 기준).
   * capacity가 없거나 0이면 무제한(그 선반이 남은 책을 전부 담음).
   * 예전엔 "마지막 선반"은 capacity를 무시하고 항상 나머지 전부를 담았는데,
   * 각 선반을 정확히 N권씩만 채우고 싶다는 요청(2026-09)에 따라 마지막 선반도
   * 똑같이 capacity를 지키도록 변경했다. 모든 선반의 용량을 합친 것보다 책이
   * 많으면 그 초과분은 어느 선반에도 배치되지 않아 화면에 보이지 않는다.
   */
  let ptr = 0;
  const groups = shelves.map((shelf) => {
    const cap = shelf.capacity && shelf.capacity > 0 ? shelf.capacity : Infinity;
    const take = Math.min(cap, books.length - ptr);
    const slice = books.slice(ptr, ptr + Math.max(0, take));
    ptr += slice.length;
    return slice;
  });

  // 2) 각 선반 안에서 squeeze 배치
  shelves.forEach((shelf, i) => {
    const shelfBooks = groups[i];
    if (!shelfBooks.length) return;

    const euler = new THREE.Euler(
      THREE.MathUtils.degToRad(shelf.rotXdeg ?? 0),
      THREE.MathUtils.degToRad(shelf.rotYdeg ?? 0),
      THREE.MathUtils.degToRad(shelf.rotZdeg ?? 0),
      'XYZ'
    );
    const dirX = new THREE.Vector3(1, 0, 0).applyEuler(euler);
    const up = new THREE.Vector3(0, 1, 0).applyEuler(euler);

    const n = shelfBooks.length;
    const gaps = GAP * (n - 1);
    const sumT = shelfBooks.reduce((a, b) => a + b.thickness, 0);
    // 폭 초과 시에만 압축(squeeze). 여유 있으면 원래 두께 유지.
    let scale = 1;
    if (sumT + gaps > shelf.width) {
      scale = Math.max(MIN_SQUEEZE, (shelf.width - gaps) / sumT);
    }
    let cursor = -shelf.width / 2; // 왼쪽 끝부터 오른쪽으로 채움
    for (const book of shelfBooks) {
      const t = book.thickness * scale;
      const centerOffset = cursor + t / 2;
      cursor += t + GAP;

      const base = shelf.bookHeight ?? book.height ?? FALLBACK_BOOK_HEIGHT;
      const factor = typeof book.heightFactor === 'number' ? book.heightFactor : hash01(book.id);
      const height = Math.max(MIN_BOOK_HEIGHT, base - factor * (shelf.heightVar ?? 0));

      placements.push({
        ...book,
        shelfIndex: i,
        shelfId: shelf.id,
        rotation: [euler.x, euler.y, euler.z],
        size: [t, height, shelf.depth],
        position: [
          shelf.pos[0] + dirX.x * centerOffset + up.x * (height / 2),
          shelf.pos[1] + dirX.y * centerOffset + up.y * (height / 2),
          shelf.pos[2] + dirX.z * centerOffset + up.z * (height / 2),
        ],
      });
    }
  });

  return placements;
}

// 캘리브레이션 미리보기용 더미 책 생성 (사서별 테마 색상 적용, store에는 저장되지 않음)
export function makePreviewBooks(count, librarianId = 'cat') {
  const palette = getColorPresets(librarianId);
  return Array.from({ length: count }, (_, i) => {
    const p = palette[i % palette.length];
    return {
      id: `preview-${i}`,
      title: `미리보기 ${i + 1}`,
      colorIdx: i % palette.length,
      spineColor: p.spine,
      coverColor: p.cover,
      thickness: 0.16 + ((i * 7) % 5) * 0.03,
      heightFactor: ((i * 37) % 100) / 100,
    };
  });
}
