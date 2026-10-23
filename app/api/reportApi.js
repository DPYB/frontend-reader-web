/**
 * AI Agent 월간 독서 리포트 API 클라이언트.
 *
 * 엔드포인트: GET /api/v1/reports/monthly?year=YYYY&month=M
 * AI Agent 백엔드가 통계, 독서 취향, 사서 피드백 및 다음 달 도서 처방 데이터를 분석하여 반환합니다.
 */

import { authFetch } from './authApi';
import { genreLabel } from '../data/genres';
import { AI_API_BASE } from './apiBase';

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

  // 06. 날씨별 독서 & 베스트 도서 매핑 (아이콘 + 표지 1:1 매칭용)
  // 백엔드 weatherPreferences, rhythm.weatherBooks, 또는 최상위 weatherBooks 순서로 탐색
  const rawWeatherPrefs = Array.isArray(raw.preferences?.weatherPreferences)
    ? raw.preferences.weatherPreferences
    : Array.isArray(raw.taste?.weatherPreferences)
      ? raw.taste.weatherPreferences
      : [];

  const weatherBooks = Array.isArray(raw.rhythm?.weatherBooks) && raw.rhythm.weatherBooks.length > 0
    ? raw.rhythm.weatherBooks
    : Array.isArray(raw.weatherBooks) && raw.weatherBooks.length > 0
      ? raw.weatherBooks
      : [];

  const rhythm = {
    dayOfWeek,
    timeOfDay,
    weather,
    weatherBooks,
    avgCompletionDays: raw.habits?.avgCompletionDays ?? null,
    totalSessionCount: raw.habits?.totalSessionCount ?? 0,
    avgSessionDurationMinutes: raw.habits?.avgSessionDurationMinutes ?? null,
  };

  // 03. 독서 취향 & 키워드 & 장르 통계 (도넛 차트용)
  const topGenreTags =
    raw.preferences?.topGenres?.map((g) => {
      const gName = g.genreName || g.name || g.genre;
      return genreLabel(gName) || gName;
    }) || [];
  const topSubjects = raw.preferences?.topSubjects || [];
  const rawTasteTags =
    Array.isArray(raw.taste?.tags) && raw.taste.tags.length > 0
      ? raw.taste.tags
      : Array.from(new Set([...topGenreTags, ...topSubjects]));
  const tasteTags = rawTasteTags.map((tag) => genreLabel(tag) || tag);

  const debateKeywords = raw.preferences?.debateKeywords || [];
  const tasteKeywords =
    Array.isArray(raw.taste?.keywords) && raw.taste.keywords.length > 0
      ? raw.taste.keywords
      : debateKeywords.length > 0
        ? debateKeywords
        : topSubjects;

  // 도넛 차트용 장르 통계 (genreBreakdown 또는 topGenres 활용)
  const rawGenreBreakdown = Array.isArray(raw.balance?.genreBreakdown) ? raw.balance.genreBreakdown : [];
  const genreStats = rawGenreBreakdown
    .filter((g) => (g.count ?? 0) > 0 || (g.percentage ?? 0) > 0)
    .map((g) => {
      const originalName = g.genreName || g.name || g.genre;
      return {
        ...g,
        genreName: genreLabel(originalName) || originalName,
        name: genreLabel(originalName) || originalName,
      };
    });

  const taste = {
    tags: tasteTags,
    keywords: tasteKeywords,
    genreStats,
    weatherPreferences: rawWeatherPrefs,
  };

  // 04. 독서 밸런스
  const rawDominant = raw.balance?.dominantGenre || null;
  const dominantGenre = rawDominant ? (genreLabel(rawDominant) || rawDominant) : null;
  const unreadGenres = (raw.balance?.unreadGenres || []).map((ug) => genreLabel(ug) || ug);

  const balance = {
    diversityScore: raw.balance?.diversityScore ?? 0,
    dominantGenre,
    isBiased: Boolean(raw.balance?.isBiased),
    unreadGenres,
    analysisText:
      raw.balance?.analysisText ||
      raw.aiAnalysis?.summary ||
      (dominantGenre
        ? `${dominantGenre} 중심의 깊이 있는 탐독이 돋보였습니다.`
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
    genre: b.genre ? (genreLabel(b.genre) || b.genre) : '',
    isbn: b.isbn || '',
    publisher: b.publisher || '',
    pageCount: b.pageCount || null,
    description: b.description || '',
  }));

  const rawRecommendedGenre = raw.prescription?.recommendedGenre;
  const recommendedGenre = rawRecommendedGenre
    ? (genreLabel(rawRecommendedGenre) || rawRecommendedGenre)
    : '다양한 주제의 교양 도서';

  const prescription = {
    recommendedGenre,
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
  // 월간 리포트(/reports/monthly)는 backend-ai-agent가 담당한다 (사용자 요청, 2026-09:
  // Cloudflare Pages 배포를 위해 core-api/ai-agent 베이스 URL을 분리).
  const raw = await authFetch(
    `/reports/monthly?year=${encodeURIComponent(year)}&month=${encodeURIComponent(month)}`,
    { baseUrl: AI_API_BASE }
  );
  return normalizeMonthlyReport(raw);
}

/**
 * 서비스 런칭 시점(2026년 9월)부터 현재까지의 주간(월~일) 목록을 생성합니다 (최신순).
 *
 * @returns {Array<{id: string, year: number, month: number, weekNum: number, startIso: string, endIso: string, dateRangeStr: string, labelKo: string, labelEn: string}>}
 */
export function getAvailableWeeks() {
  const weeks = [];
  const now = new Date();

  // 현재 날짜가 속한 주의 월요일 찾기
  const current = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayOfWeek = current.getDay(); // 0: 일, 1: 월 ... 6: 토
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(current);
  monday.setDate(current.getDate() + diffToMonday);

  // 2026년 9월 1일이 속한 주의 월요일 (2026-08-31)
  const serviceStartMonday = new Date(2026, 8, 1);
  const startDay = serviceStartMonday.getDay();
  const startDiff = startDay === 0 ? -6 : 1 - startDay;
  serviceStartMonday.setDate(serviceStartMonday.getDate() + startDiff);

  const curMonday = new Date(monday);
  while (curMonday >= serviceStartMonday) {
    const curSunday = new Date(curMonday);
    curSunday.setDate(curMonday.getDate() + 6);

    // 해당 주의 목요일이 속한 월을 기준으로 해당 주의 월/연도 결정 (ISO-8601 기준)
    const thursday = new Date(curMonday);
    thursday.setDate(curMonday.getDate() + 3);
    const year = thursday.getFullYear();
    const month = thursday.getMonth() + 1;

    // 해당 월에서 몇 번째 주인지 계산
    const firstDayOfMonth = new Date(year, month - 1, 1);
    const firstDayWeekday = firstDayOfMonth.getDay() === 0 ? 7 : firstDayOfMonth.getDay();
    const dayOfMonth = thursday.getDate();
    const weekNum = Math.ceil((dayOfMonth + firstDayWeekday - 1) / 7);

    const mStart = String(curMonday.getMonth() + 1).padStart(2, '0');
    const dStart = String(curMonday.getDate()).padStart(2, '0');
    const mEnd = String(curSunday.getMonth() + 1).padStart(2, '0');
    const dEnd = String(curSunday.getDate()).padStart(2, '0');

    const startIso = `${curMonday.getFullYear()}-${mStart}-${dStart}`;
    const endIso = `${curSunday.getFullYear()}-${mEnd}-${dEnd}`;
    const dateRangeStr = `${mStart}.${dStart} ~ ${mEnd}.${dEnd}`;

    weeks.push({
      id: `${year}-${String(month).padStart(2, '0')}-W${weekNum}`,
      year,
      month,
      weekNum,
      startIso,
      endIso,
      dateRangeStr,
      labelKo: `${year}년 ${month}월 ${weekNum}주차 (${dateRangeStr})`,
      labelEn: `${year}-${String(month).padStart(2, '0')} W${weekNum} (${mStart}.${dStart} - ${mEnd}.${dEnd})`,
    });

    // 1주일 전으로 이동
    curMonday.setDate(curMonday.getDate() - 7);
  }

  if (weeks.length === 0) {
    weeks.push({
      id: '2026-09-W1',
      year: 2026,
      month: 9,
      weekNum: 1,
      startIso: '2026-09-01',
      endIso: '2026-09-06',
      dateRangeStr: '09.01 ~ 09.06',
      labelKo: '2026년 9월 1주차 (09.01 ~ 09.06)',
      labelEn: '2026-09 W1 (09.01 - 09.06)',
    });
  }

  return weeks;
}

/**
 * 월간 리포트 데이터를 바탕으로 주간 리포트(Weekly Report) 데이터를 생성/정규화합니다.
 */
export function deriveWeeklyReportFromMonthly(monthlyData, weekInfo) {
  if (!monthlyData) return null;

  const { year, month, weekNum, dateRangeStr } = weekInfo;
  const mOverview = monthlyData.overview || {};

  // 주간 스케일로 환산된 정량 통계 (주간 목표 1권 기준)
  const completedCount = mOverview.completedCount > 0 ? Math.min(mOverview.completedCount, 1) : 0;
  const totalPages = Math.round((mOverview.totalPages || 0) / 4);
  const totalDurationMinutes = Math.round((mOverview.totalDurationMinutes || 0) / 4);
  const streakDays = Math.min(7, mOverview.streakDays || 0);
  const goalBooksCount = 1;
  const goalAchievementRate = completedCount >= 1 ? 100 : Math.min(100, Math.round((totalPages / 80) * 100));

  const overview = {
    completedCount,
    totalPages,
    streakDays,
    totalDurationMinutes,
    goalBooksCount,
    goalAchievementRate,
  };

  const rhythm = {
    ...monthlyData.rhythm,
    totalSessionCount: Math.round((monthlyData.rhythm?.totalSessionCount || 0) / 4),
  };

  const prescription = {
    ...monthlyData.prescription,
    suggestedGoalBooks: 1,
  };

  return {
    ...monthlyData,
    isWeekly: true,
    year,
    month,
    weekNum,
    dateRangeStr,
    overview,
    rhythm,
    prescription,
  };
}

/**
 * 특정 주차의 주간 독서 리포트를 조회합니다.
 *
 * @param {object} weekInfo
 * @returns {Promise<object>} 정규화된 주간 독서 리포트 데이터
 */
export async function fetchWeeklyReport(weekInfo) {
  const { year, month, weekNum, startIso, endIso } = weekInfo;
  try {
    const raw = await authFetch(
      `/reports/weekly?year=${encodeURIComponent(year)}&month=${encodeURIComponent(month)}&week=${encodeURIComponent(weekNum)}&start_date=${encodeURIComponent(startIso)}&end_date=${encodeURIComponent(endIso)}`,
      { baseUrl: AI_API_BASE }
    );
    if (raw && typeof raw === 'object' && !raw.detail) {
      return normalizeMonthlyReport(raw);
    }
  } catch {
    // 백엔드 주간 API 미배포 시 월간 데이터를 기반으로 안전하게 주간 리포트 도출
  }

  const monthly = await fetchMonthlyReport({ year, month });
  return deriveWeeklyReportFromMonthly(monthly, weekInfo);
}


