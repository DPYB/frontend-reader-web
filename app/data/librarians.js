/**
 * 사서 캐릭터 및 무드 레지스트리.
 * 백엔드(backend-librarian/app/librarian/librarians.py)와 동기화된 데이터입니다.
 *
 * 날씨/시간대/기분 정보는 모든 사서가 활용 가능합니다.
 *
 * 장르 정의는 genres.js(백엔드 genre_type enum 단일 소스, 한글 라벨은 프론트가 정의)를 참조합니다.
 * KDC(한국십진분류법) 10대 대분류 개편에 맞춰, 각 사서는 이제 여러 개의 특화 장르를
 * 가질 수 있습니다(specialtyCodes 배열).
 */

import { GENRE_LABELS, genreLabel } from './genres';

// 장르 한글 라벨 목록 (genres.js에서 파생 — 백엔드 genre_type enum과 정합)
export const GENRES = GENRE_LABELS;

// 무드 목록 — 백엔드 curation/mood.py의 무드 enum과 동기화
export const MOODS = ['cozy', 'adventurous', 'reflective', 'dreamy', 'thrilling', 'calm'];

/*
 * 사서별 3D 서재 진입 시 강조 글로우 색상 (다크/라이트). LibraryScene.jsx의
 * GLOW_COLOR와 짝을 이루는 참고용 팔레트 — 실제 값은 그 파일에서 관리한다.
 * 여기 주석으로만 남겨 사서 추가 시 어디를 함께 챙겨야 하는지 표시한다.
 *   nudi: 핑크/마젠타 계열, gecko: 초록 계열
 */

// 사서 캐릭터 4종 (백엔드 LIBRARIAN_REGISTRY와 대응)
// typeCode:       DB librarian_type enum
//   - RUSSIAN_BLUE, SHOEBILL은 백엔드에 이미 등록되어 있음
//   - SEA_SLUG, GECKO는 임시값이다. 백엔드 librarian_type enum에 아직 없으므로
//     백엔드 팀과 확정한 뒤 실제 값으로 교체해야 한다 (신규 사서 2종 추가 작업).
// species:        사서 종(품종) 표시명
// commonNames:     채팅에서 사서를 부르는 통칭 키워드(품종명과 별개로 쓰는 일상어).
//                  예: 러시안블루를 '고양이'로, 슈빌을 '황새'로 부르는 경우.
// defaultName:     가입 직후 기본 사서 이름 — 사서 프로필에서 사용자가 변경 가능
// specialtyCodes:  해당 사서가 특히 자세히 다루는 genre_type enum code 목록 (KDC 대분류)
// speechInterjection: 답변 말미에 붙는 사서 고유 감탄사/어미(없으면 미부착)
// formalTone:      true면 존댓말·격식체 UI 문구(예: LibrarianCursor 말풍선)를 사용
//
// ⚠️ 임시 데이터 안내 (누디/게코):
//   - profileImage는 실제 일러스트가 나오기 전까지 쓰는 placeholder SVG다.
//   - image/imageHover(3D 서재 커서 스프라이트)는 아직 없어 미지정 상태이며,
//     LibrarianCursor가 자동으로 icon 이모지로 대체 표시한다.
//   - 3D 서재 배경/카메라(shelfLayout.js)도 전용 배치가 없어 고양이 서재 배치로
//     대체 표시된다. 전용 배경 그림과 커서 스프라이트가 준비되면 shelfLayout.js의
//     CAMERA_BY_LIBRARIAN/SHELVES_BY_LIBRARIAN, LibraryScene.jsx의 BG_SRC 분기,
//     GLOW_COLOR에 각각 항목을 추가해야 한다.
export const LIBRARIANS = [
  {
    id: 'cat',
    typeCode: 'RUSSIAN_BLUE',
    name: '블루 사서',
    species: '러시안블루',
    commonNames: ['고양이'],
    defaultName: '블루',
    icon: '🐱',
    persona: '반말과 "~냥" 어미로 친근하게 이야기해요',
    specialtyCodes: ['GENERAL', 'PHILOSOPHY', 'RELIGION'],
    speechInterjection: '냥',
    image: '/cursors/cat/cat_03.webp',
    imageHover: '/cursors/cat/cat_04.webp',
    // GNB·사서 프로필 페이지에서 쓰는 프로필 사진 (커서 이미지와 별개 에셋)
    profileImage: '/profile/cat.webp',
    // 커서 이미지에서 실제 포인터가 될 지점(뻗은 앞발 끝) — 이미지 알파 채널 실측 비율
    tip: { x: 0.26, y: 0.287 },
    tipHover: { x: 0.143, y: 0.357 },
  },
  {
    id: 'stork',
    typeCode: 'SHOEBILL',
    name: '슈빌 사서',
    species: '슈빌',
    commonNames: ['황새'],
    defaultName: '슈빌',
    icon: '🪿',
    persona: '존댓말과 공손한 말투로 차분하게 안내해요',
    specialtyCodes: ['NATURAL_SCIENCE', 'TECHNOLOGY'],
    formalTone: true,
    // 황새 서재로 전환했을 때 기본으로 유지되는 커서 이미지 (CLIAR-198)
    image: '/cursors/stork/stork_1.webp',
    // 책 위에 올렸을 때: 날개를 펄럭이는 2프레임 애니메이션 WebP 1장
    // (원본 stork_2·stork_3을 합쳐 에셋 장수는 고양이와 동일하게 2장 유지)
    imageHover: '/cursors/stork/stork_hover.webp',
    // 포인터 지점은 부리 끝 — 알파 채널 실측값 (168,84)/300, hover는 (178,65)/300
    tip: { x: 0.56, y: 0.28 },
    tipHover: { x: 0.593, y: 0.217 },
    /*
     * 커서 표시 배율 (CLIAR-198). 황새는 몸이 가늘고 길어 고양이와 같은 크기로
     * 그리면 작게 보여 확대한다 (1.3 → 1.56, 기존 대비 20% 추가 확대).
     * 이미지 안에서 키우지 않고 표시 배율로 처리해
     * (stork_3은 이미 캔버스 높이를 꽉 채워 확대 시 날개가 잘림) 세 이미지가
     * 동일 비율로 커지고 프레임 정렬도 그대로 유지된다.
     */
    imgScale: 1.56,
    // GNB·사서 프로필 페이지에서 쓰는 프로필 사진 (커서 이미지와 별개 에셋)
    profileImage: '/profile/stork.webp',
  },
  {
    id: 'nudi',
    // 임시값 — 백엔드 librarian_type enum 확정 시 교체 필요
    typeCode: 'SEA_SLUG',
    name: '누디 사서',
    // 바다달팽이(갯민숭달팽이) — 사용자 요청으로 신규 추가
    species: '바다달팽이(갯민숭달팽이)',
    commonNames: ['바다달팽이', '갯민숭달팽이', '달팽이'],
    defaultName: '누디',
    icon: '🐌',
    // 말투는 임시 설정 — 기획 확정 시 교체
    persona: '느긋한 반말로 여유롭게 이야기해요',
    specialtyCodes: ['ARTS', 'LITERATURE'],
    // 아직 전용 커서 스프라이트가 없어 icon 이모지로 대체 표시됨 (image 미지정)
    profileImage: '/profile/nudi-placeholder.svg',
  },
  {
    id: 'gecko',
    // 임시값 — 백엔드 librarian_type enum 확정 시 교체 필요
    typeCode: 'GECKO',
    name: '게코 사서',
    species: '게코',
    commonNames: ['게코', '도마뱀'],
    defaultName: '게코',
    icon: '🦎',
    // 말투는 임시 설정 — 기획 확정 시 교체
    persona: '재빠르고 야무진 말투로 이야기해요',
    specialtyCodes: ['SOCIAL_SCIENCE', 'LANGUAGE', 'HISTORY'],
    // 아직 전용 커서 스프라이트가 없어 icon 이모지로 대체 표시됨 (image 미지정)
    profileImage: '/profile/gecko-placeholder.svg',
  },
].map((l) => ({
  ...l,
  // 특화 장르 한글 라벨 (파생) — 여러 장르는 '·'로 이어붙인다 (예: '총류·철학·종교')
  specialtyGenre: l.specialtyCodes.map(genreLabel).filter(Boolean).join('·'),
  // "○○·○○ 장르 추천" 형태의 표시 문구 (파생)
  specialty: `${l.specialtyCodes.map(genreLabel).filter(Boolean).join('·')} 장르 추천`,
}));

export const DEFAULT_LIBRARIAN_ID = 'cat';

export function getLibrarian(id) {
  return LIBRARIANS.find((l) => l.id === id) || LIBRARIANS[0];
}

/**
 * 사서의 특화 장르 표시 라벨 ("총류·철학·종교 장르 추천" → "총류·철학·종교").
 * @param {object} librarian
 * @returns {string}
 */
export function genreLabelForLibrarian(librarian) {
  return librarian?.specialtyGenre ?? '';
}

/**
 * 사서 이름(사용자 지정 이름 포함)이나 캐릭터 키워드로 사서를 찾습니다.
 * 채팅에서 "슈빌 사서", "블루 사서", "황새", "고양이", "게코" 등을 입력했을 때
 * 전환 대상을 감지하는 데 사용합니다.
 *
 * @param {string} text - 사용자 입력
 * @param {Record<string,string>} [names] - { [id]: 사용자 지정 이름 }
 * @returns {object|null} 매칭된 사서 (없으면 null)
 */
export function findLibrarianByKeyword(text, names = {}) {
  const t = (text || '').toLowerCase().trim();
  if (!t) return null;

  for (const lib of LIBRARIANS) {
    const withoutTitle = lib.name.replace(/\s*사서$/, ''); // '블루 사서' → '블루'
    const commonNames = lib.commonNames || [];
    const keywords = [
      names[lib.id],
      lib.defaultName,
      lib.name,
      lib.species,
      withoutTitle,
      ...commonNames,
      ...commonNames.map((n) => `${n} 사서`),
    ]
      .filter(Boolean)
      .map((k) => k.toLowerCase());

    if (keywords.some((k) => t.includes(k))) return lib;
  }
  return null;
}

/**
 * 특정 장르(code 또는 label)를 특화로 담당하는 사서 찾기 (없으면 null).
 * @param {string} genre - genre code 또는 한글 label
 */
export function librarianForGenre(genre) {
  return (
    LIBRARIANS.find((l) => l.specialtyCodes.includes(genre)) ||
    LIBRARIANS.find((l) => l.specialtyGenre.split('·').includes(genre)) ||
    null
  );
}

// 현재 사서가 아닌 다른 사서 반환 (switchTo용)
export function getOtherLibrarian(currentId) {
  return LIBRARIANS.find((l) => l.id !== currentId) || null;
}
