/**
 * 사서 캐릭터 및 무드 레지스트리.
 * 백엔드(backend-librarian/app/librarian/librarians.py)와 동기화된 데이터입니다.
 *
 * 날씨/시간대/기분 정보는 모든 사서가 활용 가능합니다.
 *
 * 장르 정의는 genres.js(백엔드 genre_type enum 단일 소스, 한글 라벨은 프론트가 정의)를 참조합니다.
 * KDC(한국십진분류법) 10대 대분류 개편에 맞춰, 각 사서는 이제 여러 개의 특화 장르를
 * 가질 수 있습니다(specialtyCodes 배열).
 *
 * MBTI·성격·독서 성향·말투 필드(mbti/personality/readingStyle/catchphrase)는
 * 기획팀 페르소나 문서(사서 페르소나 개요 v1, 2026-09)를 그대로 반영한 것으로,
 * 사서 프로필 페이지(app/pages/LibrarianProfiles.jsx)에서 사용합니다.
 * (말투·행동 설명 문단은 프로필에서 빼고, 대표 어미 예시 문장인 catchphrase만 노출합니다)
 *
 * 종결어미(speechInterjection)는 "~냥"처럼 단어에 바로 붙이지 않고 "무슨 책을 읽고
 * 있어 냥?"처럼 앞말과 띄어 씁니다. catchphrase를 포함한 모든 어미 예시 문구가
 * 이 규칙을 따릅니다(사용자 요청, 2026-09).
 *
 * ⚠️ 슈빌(stork)의 formalTone(존댓말) 설정은 기존 채팅 UI(LibrarianChat.jsx 등)의
 * 존댓말 문구들과 맞춰 그대로 유지했습니다. 페르소나 문서의 종결어미 예시 문장은
 * 반말체("~다두둥")로 되어 있어 존댓말 설정과 어긋나는 부분이 있는데, 실제 채팅
 * 응답 말투를 반말로 바꾸는 것은 이 문서 반영(프로필 콘텐츠 보완)보다 범위가 커서
 * 이번엔 프로필 표시용 텍스트에만 적용하고 채팅 말투는 손대지 않았습니다.
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
    mbti: 'INTJ',
    oneLiner: '본질과 의미를 파고드는 사색가',
    personality:
      '조용하고 신중하며 혼자 깊이 생각하는 것을 좋아해요. 겉으로 드러나는 현상보다 그 안에 숨겨진 원리와 본질을 이해하려 하고, 새로운 지식을 접하면 "왜 그런가?", "이것의 본질은 무엇인가?"를 먼저 생각해요.',
    readingStyle:
      '추상적이고 철학적인 주제에 관심이 많아요. 하나의 주제를 깊이 파고드는 책, 단순한 정보보다 사고할 거리를 주는 책을 선호하고, 지식이 서로 어떻게 연결되는지 이해하는 걸 즐겨요.',
    catchphrase: '겉으로 보이는 것보다 그 안에 있는 이유를 알고 싶어 냥.',
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
    mbti: 'ISTP',
    oneLiner: '원리와 작동 방식을 탐구하는 실용적 탐구자',
    personality:
      '관찰력이 뛰어나고 직접 확인하며 원리를 이해하는 것을 좋아해요. 이론만 듣기보다 실제로 어떻게 작동하는지 알아가는 것을 선호하고, 문제가 생기면 감정적으로 고민하기보다 원인을 분석하고 해결 방법을 찾아가요.',
    readingStyle:
      '과학적 원리와 기술의 작동 방식에 관심이 많아요. 실용적인 지식과 실제 사례가 담긴 책, "이론 → 실제 적용"으로 연결되는 책을 좋아하고, 새로운 기술이나 과학적 발견을 이해하는 걸 즐겨요.',
    catchphrase: '직접 보면 더 잘 이해할 수 있지 두둥.',
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
    persona: '부드러운 반말과 "~누누" 어미로 감성적으로 이야기해요',
    specialtyCodes: ['ARTS', 'LITERATURE'],
    speechInterjection: '누누',
    mbti: 'INFP',
    oneLiner: '감정과 이야기에 공감하는 감성가',
    personality:
      '감수성이 풍부하고 자신만의 독특한 세계를 중요하게 생각해요. 사람의 감정이나 관계, 이야기 속에 담긴 의미를 섬세하게 바라보고, 남들이 지나치는 작은 장면에서도 특별한 감정을 발견해요.',
    readingStyle:
      '문학 작품과 예술적 표현을 좋아해요. 감정과 여운이 오래 남는 책을 선호하고, 등장인물의 감정이나 내면을 깊이 이해하는 걸 즐기며, 정답이 하나로 정해지지 않은 이야기를 좋아해요.',
    catchphrase: '이 이야기가 마음에 오래 남는 이유가 있을 거야 누누.',
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
    persona: '친근한 반말과 "~크크" 어미로 공감하며 이야기해요',
    specialtyCodes: ['SOCIAL_SCIENCE', 'LANGUAGE', 'HISTORY'],
    speechInterjection: '크크',
    mbti: 'ENFJ',
    oneLiner: '사람과 사회의 이야기를 연결하는 공감형 탐구자',
    personality:
      '사람과 사회에 관심이 많으며 다양한 사람들의 생각과 이야기를 이해하려 해요. 개인의 행동이 사회와 문화 속에서 어떻게 만들어지는지 궁금해하고, 과거의 사건을 단순한 사실로 기억하기보다 "그 시대의 사람들은 왜 그렇게 행동했을까?"를 생각해요.',
    readingStyle:
      '사람, 사회, 문화에 관한 책을 좋아해요. 역사적 사건과 그 속에 담긴 사람들의 이야기에 관심이 많고, 언어가 사람들의 생각과 관계에 어떤 영향을 주는지 탐구하며, 다양한 관점과 가치관을 접할 수 있는 책을 선호해요.',
    catchphrase: '사람들의 이야기를 따라가다 보면 사회와 역사가 보이거든 크크.',
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
