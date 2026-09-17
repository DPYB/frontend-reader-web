/**
 * AI Agent 월간 독서 리포트 API 클라이언트.
 *
 * 엔드포인트: GET /api/v1/reports/monthly?year=YYYY&month=M
 * AI Agent 백엔드가 통계, 독서 취향, 사서 피드백 및 다음 달 도서 처방 데이터를 분석하여 반환합니다.
 */

import { authFetch } from './authApi';

/**
 * 백엔드 AI Agent 월간 독서 리포트 DTO(MonthlyReportResponse)를
 * 프론트엔드 리포트 UI 규격으로 정규화하는 어댑터 함수.
 *
 * @param {object|null} raw - 백엔드 원본 응답 DTO
 * @returns {object|null} 정규화된 리포트 객체
 */
export function normalizeMonthlyReport(raw) {
  if (!raw || typeof raw !== 'object') return null;

  // 01. 이번 달 한눈에 보기
  const overview = {
    completedCount: raw.overview?.completedBooksCount ?? raw.overview?.completedCount ?? 0,
    totalPages: raw.overview?.totalPagesRead ?? raw.overview?.totalPages ?? 0,
    streakDays: raw.habits?.longestStreakDays ?? raw.overview?.streakDays ?? 0,
    totalDurationMinutes: raw.overview?.totalDurationMinutes ?? 0,
    goalBooksCount: raw.overview?.goalBooksCount ?? 3,
    goalAchievementRate: raw.overview?.goalAchievementRate ?? 0,
  };

  // 02. 독서 리듬 (요일, 시간대, 날씨)
  const weekdayMap = raw.habits?.weekdayDistribution || {};
  const dayOfWeek = Array.isArray(raw.rhythm?.dayOfWeek)
    ? raw.rhythm.dayOfWeek
    : [
        { day: '월', count: weekdayMap.MON ?? 0 },
        { day: '화', count: weekdayMap.TUE ?? 0 },
        { day: '수', count: weekdayMap.WED ?? 0 },
        { day: '목', count: weekdayMap.THU ?? 0 },
        { day: '금', count: weekdayMap.FRI ?? 0 },
        { day: '토', count: weekdayMap.SAT ?? 0 },
        { day: '일', count: weekdayMap.SUN ?? 0 },
      ];

  const timeMap = raw.habits?.timeDistribution || {};
  const timeOfDay = Array.isArray(raw.rhythm?.timeOfDay)
    ? raw.rhythm.timeOfDay
    : [
        { time: '새벽', count: timeMap.dawn ?? 0 },
        { time: '낮', count: timeMap.day ?? 0 },
        { time: '저녁', count: timeMap.evening ?? 0 },
        { time: '심야', count: timeMap.night ?? 0 },
      ];

  const weatherMap = raw.habits?.weatherDistribution || {};
  const weather = Array.isArray(raw.rhythm?.weather)
    ? raw.rhythm.weather
    : [
        { condition: '맑음 (clear)', count: weatherMap.clear ?? 0 },
        { condition: '흐림 (cloudy)', count: weatherMap.cloudy ?? 0 },
        { condition: '비/눈 (rainy/snowy)', count: (weatherMap.rainy ?? 0) + (weatherMap.snowy ?? 0) },
      ];

  const rhythm = {
    dayOfWeek,
    timeOfDay,
    weather,
    avgCompletionDays: raw.habits?.avgCompletionDays ?? null,
    totalSessionCount: raw.habits?.totalSessionCount ?? 0,
    avgSessionDurationMinutes: raw.habits?.avgSessionDurationMinutes ?? null,
  };

  // 03. 독서 취향 & 키워드
  const topGenreTags = raw.preferences?.topGenres?.map((g) => g.genreName || g.genre) || [];
  const topSubjects = raw.preferences?.topSubjects || [];
  const tasteTags =
    Array.isArray(raw.taste?.tags) && raw.taste.tags.length > 0
      ? raw.taste.tags
      : Array.from(new Set([...topGenreTags, ...topSubjects]));

  const debateKeywords = raw.preferences?.debateKeywords || [];
  const tasteKeywords =
    Array.isArray(raw.taste?.keywords) && raw.taste.keywords.length > 0
      ? raw.taste.keywords
      : debateKeywords.length > 0
        ? debateKeywords
        : topSubjects;

  const taste = {
    tags: tasteTags,
    keywords: tasteKeywords,
    weatherPreferences: raw.preferences?.weatherPreferences || [],
  };

  // 04. 독서 밸런스
  const balance = {
    diversityScore: raw.balance?.diversityScore ?? 0,
    dominantGenre: raw.balance?.dominantGenre || null,
    isBiased: Boolean(raw.balance?.isBiased),
    unreadGenres: raw.balance?.unreadGenres || [],
    analysisText:
      raw.balance?.analysisText ||
      raw.aiAnalysis?.summary ||
      (raw.balance?.dominantGenre
        ? `${raw.balance.dominantGenre} 중심의 깊이 있는 탐독이 돋보였습니다.`
        : '균형 잡힌 독서 여정이 순조롭게 이어지고 있습니다.'),
  };

  // 05. 독서 흔적 (스크랩 및 기록)
  let topScraps = [];
  if (Array.isArray(raw.footprint?.topScraps) && raw.footprint.topScraps.length > 0) {
    topScraps = raw.footprint.topScraps;
  } else if (Array.isArray(raw.traces?.featuredRecords) && raw.traces.featuredRecords.length > 0) {
    const mostScrappedBookTitle = raw.traces?.mostScrappedBooks?.[0]?.title;
    topScraps = raw.traces.featuredRecords.map((rec) => ({
      text: rec.contentSnippet || rec.title,
      bookTitle:
        rec.title && rec.title !== rec.contentSnippet ? rec.title : mostScrappedBookTitle || '독서 기록',
    }));
  }

  const footprint = {
    topScraps,
    mostScrappedBooks: raw.traces?.mostScrappedBooks || [],
    completedBooks: raw.traces?.completedBooks || [],
    readingBooks: raw.traces?.readingBooks || [],
  };

  // 06. AI 사서 관찰기
  const librarianDiscovery = {
    readerType: raw.aiAnalysis?.readerType || null,
    keyTraits: raw.aiAnalysis?.keyTraits || [],
    message: raw.aiAnalysis?.summary || raw.librarianDiscovery?.message || null,
  };

  // 07. 다음 달 독서 처방
  const recommendedBooks = (raw.prescription?.recommendedBooks || raw.prescription?.books || []).map((b) => ({
    title: b.title,
    author: b.author || '저자 미상',
    coverUrl: b.coverUrl || '/covers/default_cover.png',
    reason: b.reason || '',
    genre: b.genre || '',
    isbn: b.isbn || '',
    publisher: b.publisher || '',
    pageCount: b.pageCount || null,
    description: b.description || '',
  }));

  const prescription = {
    recommendedGenre: raw.prescription?.recommendedGenre || '다양한 주제의 교양 도서',
    suggestedGoalBooks: raw.prescription?.suggestedGoalBooks || 3,
    advice: raw.prescription?.advice || '',
    books: recommendedBooks,
  };

  return {
    year: raw.year,
    month: raw.month,
    librarian: raw.librarian,
    overview,
    rhythm,
    taste,
    balance,
    footprint,
    librarianDiscovery,
    prescription,
  };
}

/**
 * 특정 연/월의 월간 독서 리포트를 조회합니다.
 *
 * @param {object} params
 * @param {number} params.year - 조회 연도 (예: 2026)
 * @param {number} params.month - 조회 월 (1~12)
 * @returns {Promise<object>} 정규화된 월간 독서 리포트 데이터
 */
export async function fetchMonthlyReport({ year, month }) {
  const raw = await authFetch(
    `/reports/monthly?year=${encodeURIComponent(year)}&month=${encodeURIComponent(month)}`
  );
  return normalizeMonthlyReport(raw);
}

