/**
 * AI 추천 에이전트 답변 및 추천 도서 정보 유틸리티 (CLIAR-229)
 */

// 제목 해시로 0~5 사이의 색상 인덱스 자동 배정
export function getColorIndex(str) {
  if (!str) return 0;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % 6;
}

/**
 * 페이지 수 → 3D 두께 매핑 기준점 (CLIAR-247).
 * 실제 인쇄 도서는 페이지가 늘수록 책등이 대략 선형으로 두꺼워지므로, 3단계 고정
 * 버킷(얇음/보통/두꺼움) 대신 구간별 기준점을 두고 그 사이를 선형 보간한다.
 * 이러면 150쪽 책과 390쪽 책처럼 같은 "버킷"에 속하던 책들도 미세하게 다른
 * 두께로 렌더링돼 책장이 더 자연스러워 보인다.
 *
 *  - ~100쪽:      문고본/짧은 에세이 등 얇은 책
 *  - 100~300쪽:   가장 흔한 단행본 소설·에세이 분량
 *  - 300~600쪽:   두꺼운 소설/실용서
 *  - 600~1000쪽:  장편/전공서
 *  - 1000쪽 이상: 사전류·합본·두꺼운 전공서 (최대치로 고정)
 */
const THICKNESS_BREAKPOINTS = [
  { page: 0, thickness: 0.13 },
  { page: 100, thickness: 0.16 },
  { page: 300, thickness: 0.2 },
  { page: 600, thickness: 0.25 },
  { page: 1000, thickness: 0.3 },
  { page: 1600, thickness: 0.36 },
];

// 페이지 수 정보가 없을 때(수동 입력 전 등) 쓰는 평균값 — 기존 '보통' 두께와 동일
export const DEFAULT_THICKNESS = 0.22;

/**
 * 페이지 수에 따른 3D 도서 두께(thickness) 반환.
 * 구간 기준점(THICKNESS_BREAKPOINTS) 사이를 선형 보간하고, 범위 밖은 양 끝값으로 고정한다.
 * @param {number|null} pageCount
 * @returns {number}
 */
export function getBookThickness(pageCount) {
  if (typeof pageCount !== 'number' || Number.isNaN(pageCount) || pageCount <= 0) {
    return DEFAULT_THICKNESS;
  }

  const points = THICKNESS_BREAKPOINTS;
  if (pageCount <= points[0].page) return points[0].thickness;
  if (pageCount >= points[points.length - 1].page) return points[points.length - 1].thickness;

  for (let i = 0; i < points.length - 1; i += 1) {
    const cur = points[i];
    const next = points[i + 1];
    if (pageCount >= cur.page && pageCount <= next.page) {
      const ratio = (pageCount - cur.page) / (next.page - cur.page);
      return cur.thickness + (next.thickness - cur.thickness) * ratio;
    }
  }
  return DEFAULT_THICKNESS;
}

/**
 * 백엔드 API 응답의 recommended_books 배열을 프론트엔드 도서 구조로 매핑합니다. (CLIAR-229)
 * - 저자: recommended_books[i].author (쪽수 제외된 순수 저자명)
 * - 총 페이지 수: recommended_books[i].page_count (정수, 확인 불가 시 null)
 *
 * @param {Array<{title: string, author?: string, page_count?: number|null, reason?: string}>} recommendedBooks
 * @returns {Array<{title: string, author: string, page_count: number|null, totalPage: number|null, currentPage: number, colorIdx: number, thickness: number, reason: string}>}
 */
export function formatRecommendedBooks(recommendedBooks) {
  if (!Array.isArray(recommendedBooks) || recommendedBooks.length === 0) {
    return [];
  }

  return recommendedBooks.map((b) => {
    const title = (b.title || '').trim();
    const author = (b.author || '').trim();
    const pageCount =
      typeof b.page_count === 'number' && Number.isFinite(b.page_count) && b.page_count > 0
        ? b.page_count
        : null;

    return {
      title,
      author: author || '미상',
      isbn: b.isbn || '',
      publisher: b.publisher || '',
      cover_url: b.cover_url || b.coverUrl || '',
      coverUrl: b.cover_url || b.coverUrl || '',
      page_count: pageCount,
      totalPage: pageCount, // 확인 불가 시 null -> 수동 입력 유도
      genre: b.genre || 'NONE', // 추천 시점 판단된 표준 장르 Enum (CLIAR-244)
      currentPage: 0,
      colorIdx: getColorIndex(title),
      thickness: getBookThickness(pageCount),
      reason: b.reason || '',
      description: b.description || '',
    };
  });
}

/**
 * 도서명 공백 및 특수기호 무시 정규화 (책 매칭 및 비교용)
 * @param {string} str
 * @returns {string}
 */
export function normalizeTitle(str) {
  return (str || '')
    .trim()
    .replace(/[\s\-_:.,·'"`『』《》()（）]/g, '')
    .toLowerCase();
}

/**
 * 마크다운 텍스트에서 추천 도서 목록 추출 (fallback 용도)
 * 1) 표준 헤딩: ### 📖 {제목}
 * 2) 번호 매김 목록: 1. 《제목》 - 저자, 1. 『제목』 - 저자, 1. **《제목》** 등
 * @param {string} text - AI 사서의 답변 텍스트
 * @returns {Array<{title: string, author: string, page_count: null, totalPage: null, currentPage: number, colorIdx: number, thickness: number}>}
 */
export function extractBooksFromAnswer(text) {
  if (!text || typeof text !== 'string') return [];

  const books = [];
  const seenTitles = new Set();

  const addBook = (rawTitle, rawAuthor = '') => {
    const cleanTitle = (rawTitle || '')
      .trim()
      .replace(/^[『《"“'‘`<>\s]+|[』》"”'’`<>\s]+$/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (cleanTitle && cleanTitle.length >= 1 && cleanTitle.length <= 60 && !seenTitles.has(cleanTitle)) {
      seenTitles.add(cleanTitle);
      const cleanAuthor = (rawAuthor || '')
        .trim()
        .replace(/^[(\s]+|[)\s]+$/g, '')
        .trim();

      books.push({
        title: cleanTitle,
        author: cleanAuthor,
        page_count: null,
        totalPage: null,
        currentPage: 0,
        colorIdx: getColorIndex(cleanTitle),
        thickness: DEFAULT_THICKNESS,
      });
    }
  };

  // 1. 표준 마크다운 추천 도서 헤딩(### 📖 {도서명}) 패턴 추출
  const headingRegex = /^#{1,4}\s*📖\s*([^\n]+)/gm;
  let match;
  while ((match = headingRegex.exec(text)) !== null) {
    addBook(match[1]);
  }

  // 2. 표준 헤딩이 없는 경우: 번호 매김 형식(1. 《도서명》 - 저자 또는 1. 『도서명』) 추출
  if (books.length === 0) {
    const numberedBookRegex = /^\s*\d+\.\s*(?:\*\*)?[『《]([^』》]+)[』》](?:\*\*)?(?:\s*[-–—:]\s*([^\n]+))?/gm;
    while ((match = numberedBookRegex.exec(text)) !== null) {
      const title = match[1];
      const authorPart = match[2] || '';
      // 저자 부분에서 '에세이', '소설' 등 장르 수식어가 붙어 있는 경우 첫 단어/쉼표 전 저자 추출
      const cleanAuthor = authorPart.split(/[,\n]/)[0].trim();
      addBook(title, cleanAuthor);
    }
  }

  return books;
}

/**
 * 텍스트에서 내 서재 도서 목록(### 📚)을 추출합니다. (ADR 0006 / CLIAR-211)
 * 단독 이모지(📚)나 2자 이하/30자 초과의 서두 문구는 도서로 오탐하지 않도록 필터링합니다.
 * @param {string} text - AI 사서의 답변 텍스트
 * @returns {Array<{title: string, author: string, status: string}>} 추출된 내 서재 도서 목록
 */
export function extractLibraryBooksFromAnswer(text) {
  if (!text || typeof text !== 'string') return [];
  const books = [];
  const seenTitles = new Set();

  const headingBlockRegex = /^###\s*📚\s*([^\n]+?)\s*\n([\s\S]*?)(?=^###\s|$(?![\r\n]))/gm;
  let match;
  while ((match = headingBlockRegex.exec(text)) !== null) {
    const rawTitle = match[1];
    const body = match[2] || '';
    const cleanTitle = (rawTitle || '')
      .trim()
      .replace(/^[『《"“'‘`<>\s]+|[』》"”'’`<>\s]+$/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    // 단독 이모지이거나 너무 긴 섹션 문구(예: "누디가 건네는 따뜻한 온기의 책")는 필터링
    if (cleanTitle && cleanTitle.length >= 1 && cleanTitle.length <= 40 && !seenTitles.has(cleanTitle)) {
      seenTitles.add(cleanTitle);
      const authorMatch = body.match(/\*\*저자\*\*\s*[:：]\s*([^\n]+)/);
      const statusMatch = body.match(/\*\*독서\s*상태\*\*\s*[:：]\s*([^\n]+)/);
      const author = authorMatch ? authorMatch[1].trim() : '';
      const status = statusMatch ? statusMatch[1].trim() : '';
      books.push({
        title: cleanTitle,
        author: author || '미상',
        status: status || '보유 중',
      });
    }
  }

  return books;
}

