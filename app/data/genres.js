/**
 * 장르 정의 단일 소스 (Single Source of Truth).
 *
 * 백엔드 genre_type enum(DB 스키마, app/models/enums.py의 GenreType)과 1:1 대응합니다.
 * KDC(한국십진분류법) 10대 대분류를 그대로 채택한 체계로, 백엔드가 국립중앙도서관
 * KDC 분류기호(kdc_to_genre)나 자유 텍스트(parse_to_genre_and_subject)를 이 10개
 * 값 중 하나로 정규화해 저장합니다. 한글 라벨/검색 별칭은 프론트에서 자유롭게
 * 정의합니다(CLIAR-139).
 *
 *   code:    백엔드 enum 값 (저장/전송 시 사용)
 *   label:   UI 한글 표기 (표시 시 사용, 백엔드 GENRE_KOREAN_NAMES와 동일)
 *   aliases: 검색·추천 키워드 매칭용 (로컬 fallback detectGenre 등, 백엔드
 *            GENRE_KEYWORD_MAPPING의 세부 키워드를 대분류 수준으로 흡수)
 *
 * 이전엔 프론트 전용 세부 장르(소설·에세이·판타지 등 15종)를 썼으나, KDC 10대
 * 분류로 전면 교체했습니다(사서 특화 장르 개편). 세부 주제(예: 'SF', '에세이')는
 * 백엔드 book.subject 필드로 별도 관리되며 이 파일의 범위가 아닙니다.
 */

// 'NONE'은 미지정 값이라 선택 목록에서 제외
export const GENRE_DEFS = [
  {
    code: 'GENERAL',
    label: '교양',
    aliases: ['교양', '인문교양', '인문/교양', '상식', '잡지', '매거진', '백과사전', '사전', '총류', '총류/교양', 'general'],
  },
  {
    code: 'PHILOSOPHY',
    label: '철학',
    aliases: ['철학', '철학/사상', '인문', '인문학', '심리', '심리학', '자기계발', '독서법', '글쓰기', 'philosophy', 'humanities', 'psychology'],
  },
  { code: 'RELIGION', label: '종교', aliases: ['종교', 'religion'] },
  {
    code: 'SOCIAL_SCIENCE',
    label: '사회과학',
    aliases: ['사회과학', '사회', '사회학', '경제', '경영', '경제/경영', '비즈니스', 'business', 'economics', 'social_science'],
  },
  {
    code: 'NATURAL_SCIENCE',
    label: '자연과학',
    // '과학'만 단독으로 넣으면 '과학소설(SF)'처럼 문학 세부 키워드와 겹쳐 오분류될 수 있어 제외
    aliases: ['자연과학', 'natural_science'],
  },
  {
    code: 'TECHNOLOGY',
    label: '기술과학',
    aliases: [
      '기술과학', '기술', '기술/공학', '공학', '컴퓨터', '컴퓨터/it', 'it', 'it/컴퓨터',
      '코딩', '프로그래밍', 'ai', '인공지능', '파이썬', 'technology', '건강', '의학', '요리', '육아',
    ],
  },
  { code: 'ARTS', label: '예술', aliases: ['예술', '미술', '음악', 'art', 'arts'] },
  { code: 'LANGUAGE', label: '언어', aliases: ['언어', '어학', 'language'] },
  {
    code: 'LITERATURE',
    label: '문학',
    aliases: [
      '문학', '소설', '한국소설', '에세이', '산문', '수필', '시', '시집', '희곡', '시·희곡',
      '추리', '미스터리', '스릴러', '판타지', '로맨스', 'sf', '에스에프', '과학소설',
      'literature', 'fiction', 'novel', 'essay', 'poetry', 'mystery', 'thriller', 'fantasy', 'romance',
      'science fiction', 'science_fiction',
    ],
  },
  { code: 'HISTORY', label: '역사', aliases: ['역사', '지리', '여행', 'history'] },
];

// 미지정 값 (백엔드 default)
export const GENRE_NONE = 'NONE';

export const GENRE_CODES = GENRE_DEFS.map((g) => g.code);
export const GENRE_LABELS = GENRE_DEFS.map((g) => g.label);

const BY_CODE = new Map(GENRE_DEFS.map((g) => [g.code, g]));
const BY_LABEL = new Map(GENRE_DEFS.map((g) => [g.label, g]));

/**
 * enum code 또는 한글 텍스트 → UI 한글 label. 없으면 빈 문자열.
 * 영문 Enum(LITERATURE)뿐만 아니라, 백엔드가 국문("문학", "소설")이나
 * 세부 주제("SF", "에세이")로 내려주어도 유연하게 한글 라벨로 변환합니다.
 * @param {string} codeOrText
 * @returns {string}
 */
export function genreLabel(codeOrText) {
  if (!codeOrText || typeof codeOrText !== 'string') return '';
  const trimmed = codeOrText.trim();
  if (trimmed === 'NONE' || trimmed === '미지정') return '';

  // 1. 이미 정의된 표준 한글 라벨인 경우 ("문학", "철학" 등)
  if (BY_LABEL.has(trimmed)) return trimmed;

  // 2. 표준 Enum 코드인 경우 ("LITERATURE" 등)
  const byCode = BY_CODE.get(trimmed);
  if (byCode) return byCode.label;

  // 3. 국문/영문 별칭 또는 세부 주제에서 감지 ("소설", "SF", "에세이", "인문/철학" 등)
  const detectedCode = detectGenreCode(trimmed);
  if (detectedCode && BY_CODE.has(detectedCode)) {
    return BY_CODE.get(detectedCode).label;
  }

  // 4. 기타 유효한 한글 문자열이면 그대로 반환 (슬래시 앞부분 추출 등)
  const firstPart = trimmed.split('/')[0].trim();
  if (firstPart && firstPart.length <= 10) return firstPart;

  return '';
}

/**
 * 한글 label → enum code. 없으면 null.
 * @param {string} label
 * @returns {string|null}
 */
export function genreCode(label) {
  return BY_LABEL.get(label)?.code ?? null;
}

/**
 * 자유 텍스트에서 장르를 감지해 code를 반환 (별칭 기반). 없으면 null.
 * @param {string} text
 * @returns {string|null} genre code
 */
export function detectGenreCode(text) {
  const t = (text || '').toLowerCase();
  for (const g of GENRE_DEFS) {
    if (g.aliases.some((a) => t.includes(a.toLowerCase()))) return g.code;
  }
  return null;
}
