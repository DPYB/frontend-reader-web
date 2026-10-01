import { useState, useEffect, useRef, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useAuth } from '../store/authStore';
import { useLibrarian } from '../store/librarianStore';
import { fetchMonthlyReport } from '../api/reportApi';
import { downloadReportAsPdf } from '../lib/pdfExport';
import { genreLabel } from '../data/genres';
import './MonthlyReport.css';

/**
 * 초기 및 빈 상태용 리포트 데이터 스켈레톤 (가짜 목데이터 주입 방지)
 */
const EMPTY_REPORT_DATA = {
  overview: {
    completedCount: 0,
    totalPages: 0,
    streakDays: 0,
    totalDurationMinutes: 0,
    goalBooksCount: 3,
    goalAchievementRate: 0,
  },
  rhythm: {
    dayOfWeek: [
      { day: '월', count: 0 },
      { day: '화', count: 0 },
      { day: '수', count: 0 },
      { day: '목', count: 0 },
      { day: '금', count: 0 },
      { day: '토', count: 0 },
      { day: '일', count: 0 },
    ],
    timeOfDay: [
      { time: '새벽', count: 0 },
      { time: '낮', count: 0 },
      { time: '저녁', count: 0 },
      { time: '심야', count: 0 },
    ],
    weather: [
      { condition: '맑음 (clear)', count: 0 },
      { condition: '흐림 (cloudy)', count: 0 },
      { condition: '비/눈 (rainy/snowy)', count: 0 },
    ],
    weatherBooks: [],
  },
  taste: {
    tags: [],
    genreStats: [],
    keywords: [],
    weatherPreferences: [],
  },
  balance: {
    diversityScore: 0,
    dominantGenre: null,
    isBiased: false,
    unreadGenres: [],
    analysisText: '이번 달 독서 기록이 축적되면 장르 밸런스를 분석해 드립니다.',
  },
  footprint: {
    topScraps: [],
    mostScrappedBooks: [],
    completedBooks: [],
    readingBooks: [],
  },
  librarianDiscovery: {
    readerType: null,
    keyTraits: [],
    message: null,
  },
  prescription: {
    recommendedGenre: '교양',
    suggestedGoalBooks: 3,
    advice: '',
    books: [],
  },
};

// 도넛 차트용 파스텔 톤 테마 색상 팔레트
const PIE_COLORS = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6', '#f97316'];

// 서비스 런칭 시점 (2026년 9월)
const SERVICE_START_YEAR = 2026;
const SERVICE_START_MONTH = 9;

// 서비스 런칭월부터 현재 월까지의 선택 가능 목록 동적 생성 (최신순 정렬)
function getAvailableMonths() {
  const list = [];
  const now = new Date();
  const curYear = now.getFullYear();
  const curMonth = now.getMonth() + 1;

  let y = curYear;
  let m = curMonth;

  // 만약 로컬 시간이 2026년 9월 이전(테스트 환경 등)인 경우 기본 2026년 9월 1개 노출
  if (y < SERVICE_START_YEAR || (y === SERVICE_START_YEAR && m < SERVICE_START_MONTH)) {
    return [{ year: SERVICE_START_YEAR, month: SERVICE_START_MONTH, label: `${SERVICE_START_YEAR}년 ${SERVICE_START_MONTH}월` }];
  }

  while (y > SERVICE_START_YEAR || (y === SERVICE_START_YEAR && m >= SERVICE_START_MONTH)) {
    list.push({
      year: y,
      month: m,
      label: `${y}년 ${m}월`,
    });
    m -= 1;
    if (m < 1) {
      m = 12;
      y -= 1;
    }
  }
  return list;
}

export default function MonthlyReport() {
  const { isGuest } = useAuth();
  const { librarian } = useLibrarian();
  const reportRef = useRef(null);

  const availableMonths = useMemo(() => getAvailableMonths(), []);
  const [year, setYear] = useState(() => availableMonths[0]?.year || 2026);
  const [month, setMonth] = useState(() => availableMonths[0]?.month || 9);

  const [, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [reportData, setReportData] = useState(EMPTY_REPORT_DATA);

  // 이번 달 독서 활동 유무 판별 (완독, 세션, 스크랩, 장르 중 1개라도 존재하는지)
  const hasActivity = useMemo(() => {
    const ov = reportData.overview;
    const rh = reportData.rhythm;
    const fp = reportData.footprint;
    const ts = reportData.taste;
    const hasCount = (ov?.completedCount ?? 0) > 0 || (ov?.totalPages ?? 0) > 0 || (ov?.totalDurationMinutes ?? 0) > 0;
    const hasWeekly = rh?.dayOfWeek?.some((d) => d.count > 0) || (rh?.totalSessionCount ?? 0) > 0;
    const hasScraps = (fp?.topScraps?.length ?? 0) > 0 || (fp?.completedBooks?.length ?? 0) > 0 || (fp?.readingBooks?.length ?? 0) > 0;
    const hasGenres = (ts?.genreStats?.length ?? 0) > 0;
    return Boolean(hasCount || hasWeekly || hasScraps || hasGenres);
  }, [reportData]);

  // 연/월 변경 시 백엔드 조회
  useEffect(() => {
    let cancelled = false;
    async function loadReport() {
      setLoading(true);
      try {
        const data = await fetchMonthlyReport({ year, month });
        if (!cancelled && data) {
          // 요일 데이터 (백엔드 실제 데이터 유지)
          const dayOfWeek = Array.isArray(data.rhythm?.dayOfWeek) && data.rhythm.dayOfWeek.length > 0
            ? data.rhythm.dayOfWeek
            : EMPTY_REPORT_DATA.rhythm.dayOfWeek;

          // 장르 데이터 정규화 (백엔드 실제 데이터만 반영, 목데이터 주입 방지)
          let normalizedGenres = [];
          if (Array.isArray(data.taste?.genreStats) && data.taste.genreStats.length > 0) {
            normalizedGenres = data.taste.genreStats.map((g) => {
              const originalName = g.genreName || g.name || g.genre;
              return {
                name: genreLabel(originalName) || originalName,
                count: g.count ?? 0,
                percentage: Math.round(g.percentage ?? 0),
              };
            });
          }

          // 날씨별 베스트 도서 매핑 (실제 백엔드 제공 데이터만 바인딩)
          let finalWeatherBooks = [];
          if (Array.isArray(data.rhythm?.weatherBooks) && data.rhythm.weatherBooks.length > 0) {
            finalWeatherBooks = data.rhythm.weatherBooks;
          } else if (Array.isArray(data.taste?.weatherPreferences) && data.taste.weatherPreferences.length > 0) {
            const candidateBooks = [
              ...(Array.isArray(data.prescription?.books) ? data.prescription.books : []),
              ...(Array.isArray(data.footprint?.completedBooks) ? data.footprint.completedBooks : []),
              ...(Array.isArray(data.footprint?.readingBooks) ? data.footprint.readingBooks : []),
              ...(Array.isArray(data.footprint?.mostScrappedBooks) ? data.footprint.mostScrappedBooks : []),
            ];

            const findBookMeta = (title) => {
              if (!title) return null;
              return candidateBooks.find((b) => b.title === title || title.includes(b.title) || b.title?.includes(title));
            };

            const weatherLabelMap = {
              clear: { label: '맑음', emoji: '☀️' },
              rainy: { label: '비/눈', emoji: '🌧️' },
              cloudy: { label: '흐림', emoji: '☁️' },
            };

            finalWeatherBooks = data.taste.weatherPreferences
              .filter((wp) => wp.preferredBookTitle)
              .map((wp) => {
                const cond = (wp.weather || '').toLowerCase();
                const matchedKey = cond.includes('clear') || cond.includes('맑') ? 'clear' : cond.includes('cloud') || cond.includes('흐') ? 'cloudy' : 'rainy';
                const labelInfo = weatherLabelMap[matchedKey] || { label: wp.weather || '날씨', emoji: '📖' };
                const meta = findBookMeta(wp.preferredBookTitle);
                return {
                  condition: matchedKey,
                  label: labelInfo.label,
                  emoji: labelInfo.emoji,
                  count: wp.sessionCount ?? 1,
                  bookTitle: wp.preferredBookTitle,
                  author: meta?.author || wp.topGenreName || '저자 정보 없음',
                  coverUrl: meta?.coverUrl || '/covers/default_cover.png',
                  quote: `${labelInfo.label} 날 집중해서 읽은 책`,
                };
              });
          }

          setReportData({
            ...EMPTY_REPORT_DATA,
            ...data,
            rhythm: {
              ...EMPTY_REPORT_DATA.rhythm,
              ...data.rhythm,
              dayOfWeek,
              weatherBooks: finalWeatherBooks,
            },
            taste: {
              ...EMPTY_REPORT_DATA.taste,
              ...data.taste,
              genreStats: normalizedGenres,
            },
          });
        }
      } catch (err) {
        console.warn('[MonthlyReport] 리포트 로드 실패, 빈 스켈레톤 유지:', err);
        if (!cancelled) {
          setReportData(EMPTY_REPORT_DATA);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadReport();
    return () => {
      cancelled = true;
    };
  }, [year, month]);

  // 도넛 차트 1위 장르 계산
  const topGenre = useMemo(() => {
    const list = reportData.taste?.genreStats;
    if (!list || list.length === 0) return { name: '데이터 없음', percentage: 0 };
    return [...list].sort((a, b) => (b.percentage || b.count) - (a.percentage || a.count))[0];
  }, [reportData.taste?.genreStats]);

  // PDF 다운로드 핸들러
  const handlePdfDownload = async () => {
    if (!reportRef.current || downloading) return;
    setDownloading(true);
    try {
      await downloadReportAsPdf({
        element: reportRef.current,
        librarianName: librarian.displayName || librarian.name || '사서',
      });
    } catch (error) {
      console.error('[MonthlyReport] PDF 다운로드 에러:', error);
      alert('PDF 다운로드 생성 중 문제가 발생했습니다.');
    } finally {
      setDownloading(false);
    }
  };

  // 사서별 맞춤 멘트 생성 (07번 섹션)
  const libType = String(librarian.type || librarian.id || '').toUpperCase();
  const libName = librarian.displayName || librarian.name || '사서';
  const librarianSpeech = useMemo(() => {
    if (reportData.librarianDiscovery?.message) {
      return reportData.librarianDiscovery.message;
    }
    if (!hasActivity) {
      if (libType.includes('CAT') || libType.includes('BLUE')) {
        return `${libName} 사서다 냥! 🐾 ${month}월에는 아직 기록된 독서 활동이 없다 냥. 서재에서 책을 읽거나 타이머를 켜두면, 내가 멋지게 분석해 줄게 냥! 🐟📖`;
      }
      if (libType.includes('SHOEBILL') || libType.includes('STORK')) {
        return `${libName} 사서다두둥. 🏛️ ${month}월의 독서 관찰 기록이 아직 없다두둥. 서재에 책을 등록하고 독서 타이머를 시작해보라두둥.`;
      }
      if (libType.includes('SEA_SLUG') || libType.includes('NUDI')) {
        return `${libName} 사서야누누... 🌊 ${month}월에는 아직 마음에 닿은 책의 흔적이 없었어누누. 천천히 한 페이지를 펼치고 이야기를 들려줘누누.`;
      }
      if (libType.includes('GECKO')) {
        return `${libName} 사서다크크! 🦎 ${month}월에 함께 나눈 책 이야기가 아직 없다크크. 언제든 좋아하는 책을 펼치고 찾아와달라크크!`;
      }
      return `${month}월의 독서 기록이 아직 없습니다. 책을 읽고 타이머를 시작해 보세요!`;
    }
    if (libType.includes('SHOEBILL') || libType.includes('STORK')) {
      return `독자님의 ${month}월 독서는 깊은 사색과 절제된 집중이 깃들어 있었습니다두둥. 비 오는 날과 심야 시간에 특히 철학적 문장에 많은 흔적을 남기셨더군요. 언제나 품격 있는 독서 여정을 제가 정성껏 보좌하겠습니다두둥.`;
    }
    return `집사님의 ${month}월 독서는 호기심과 모험이 넘쳐났다 냥! 🐾 특히 주말 밤마다 책에 푹 빠져서 스크랩을 잔뜩 남겼어 냥. 내가 골라준 다음 달 처방 책도 마음에 쏙 들 거다 냥! 🐟📖`;
  }, [reportData.librarianDiscovery?.message, hasActivity, libType, libName, month]);

  const { overview, rhythm, taste, balance, footprint, librarianDiscovery, prescription } = reportData;

  return (
    <div className="report-container">
      {/* ── 공용 체험 모드 안내 띠 배너 (게스트 접속 시) ── */}
      {isGuest && (
        <div className="guest-notice-banner">
          <span className="guest-notice-badge">공용 체험 모드</span>
          <span className="guest-notice-text">
            현재 공용 서재 체험 계정으로 접속 중입니다. 다른 사용자와 서재가 공유되며, 매일 새벽에 초기화됩니다.
          </span>
        </div>
      )}

      {/* ── 리포트 상단 컨트롤 헤더 ── */}
      <div className="report-header">
        <div className="report-title-area">
          <h1 className="report-title">
            <span className="librarian-badge">
              [{librarian.displayName || librarian.name}]
            </span>
            사서의 월간 독서 리포트
          </h1>
          <p className="report-subtitle">
            {year}년 {month}월 동안 축적된 나의 독서 습관과 취향을 사서의 시선으로 분석했습니다.
          </p>
        </div>

        <div className="report-actions">
          <select
            className="report-month-select"
            value={`${year}-${month}`}
            onChange={(e) => {
              const [y, m] = e.target.value.split('-');
              setYear(Number(y));
              setMonth(Number(m));
            }}
          >
            {availableMonths.map((opt) => (
              <option key={`${opt.year}-${opt.month}`} value={`${opt.year}-${opt.month}`}>
                {opt.label}
              </option>
            ))}
          </select>

          <button
            className="report-download-btn"
            onClick={handlePdfDownload}
            disabled={downloading}
          >
            {downloading ? 'PDF 생성 중...' : '📄 PDF로 다운로드'}
          </button>
        </div>
      </div>

      {/* ── 활동 없는 달 친절한 안내 배너 ── */}
      {!hasActivity && (
        <div className="report-empty-banner">
          <div className="report-empty-icon">🌱</div>
          <div className="report-empty-content">
            <h3 className="report-empty-title">{year}년 {month}월 독서 기록 대기 중</h3>
            <p className="report-empty-desc">
              이번 달에는 아직 완료된 독서나 타이머 세션 기록이 없습니다. 서재에서 책을 읽거나 타이머를 시작하면 사서가 풍성한 분석을 완성해 드려요!
            </p>
          </div>
        </div>
      )}

      {/* ── 인쇄 및 PDF 캡처 대상 본문 래퍼 ── */}
      <div className="report-paper" ref={reportRef}>
        {/* 01. 이번 달 한눈에 보기 */}
        <section className="report-card">
          <div className="report-card-header">
            <span className="report-card-num">01</span>
            <h2 className="report-card-title">이번 달 한눈에 보기</h2>
          </div>
          <div className="overview-grid">
            <div className="overview-stat-box">
              <div className="overview-stat-label">완독 권수</div>
              <div className="overview-stat-val">{overview?.completedCount ?? 0} <span style={{ fontSize: 16 }}>권</span></div>
            </div>
            <div className="overview-stat-box">
              <div className="overview-stat-label">누적 완독 페이지</div>
              <div className="overview-stat-val">{overview?.totalPages ?? 0} <span style={{ fontSize: 16 }}>쪽</span></div>
            </div>
            <div className="overview-stat-box">
              <div className="overview-stat-label">연속 독서</div>
              <div className="overview-stat-val">{overview?.streakDays ?? 0} <span style={{ fontSize: 16 }}>일</span></div>
              <div className={`overview-streak-badge ${!hasActivity ? 'overview-empty-badge' : ''}`}>
                {hasActivity ? '🔥 독서 Streak 달성 중!' : '🌱 첫 독서를 기다리고 있어요'}
              </div>
            </div>
          </div>
        </section>

        {/* 02. 독서 리듬 (꺾은선 그래프) */}
        <section className="report-card">
          <div className="report-card-header">
            <span className="report-card-num">02</span>
            <h2 className="report-card-title">독서 리듬 (요일별 독서 궤적 · 시간대)</h2>
          </div>

          <div className="rhythm-modern-wrap">
            <div className="rhythm-linechart-card">
              <div className="rhythm-chart-header">
                <span className="rhythm-chart-badge">주간 흐름 곡선</span>
                <p className="rhythm-chart-desc">월요일부터 일요일까지 이어지는 나의 주간 독서 집중 궤적입니다.</p>
              </div>
              <div className="rhythm-linechart-container">
                <ResponsiveContainer width="100%" height={210}>
                  <LineChart data={rhythm?.dayOfWeek || []} margin={{ top: 16, right: 24, left: -20, bottom: 0 }}>
                    <XAxis
                      dataKey="day"
                      stroke="var(--text)"
                      tick={{ fill: 'var(--text)', fontSize: 13, fontWeight: 600 }}
                      tickFormatter={(val) => `${val}요일`}
                      tickLine={false}
                      axisLine={{ stroke: 'var(--border)' }}
                    />
                    <YAxis
                      stroke="var(--text)"
                      tick={{ fill: 'var(--text)', fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: 'var(--code-bg)',
                        borderColor: 'var(--border)',
                        borderRadius: '8px',
                        color: 'var(--text-h)',
                        fontSize: '13px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                      }}
                      formatter={(value) => [`${value}회 독서`, '빈도']}
                      labelFormatter={(label) => `${label}요일`}
                    />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="var(--accent)"
                      strokeWidth={3}
                      dot={{ r: 5, fill: 'var(--accent)', strokeWidth: 2, stroke: '#ffffff' }}
                      activeDot={{ r: 8, fill: 'var(--accent)', stroke: 'var(--bg)', strokeWidth: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 시간대별 분포 */}
            <div className="rhythm-subcard rhythm-time-card">
              <div className="rhythm-subcard-title">🕒 주요 독서 시간대</div>
              {rhythm?.timeOfDay?.map((item) => (
                <div key={item.time} className="rhythm-bar-item">
                  <span className="rhythm-bar-label">{item.time}</span>
                  <div className="rhythm-bar-track">
                    <div className="rhythm-bar-fill" style={{ width: `${Math.min(100, item.count * 6)}%` }} />
                  </div>
                  <span className="rhythm-bar-count">{item.count}회</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 03. 독서 취향 (도넛 차트) */}
        <section className="report-card">
          <div className="report-card-header">
            <span className="report-card-num">03</span>
            <h2 className="report-card-title">독서 취향 (장르 비율 도넛 · 토론 키워드)</h2>
          </div>

          <div className="taste-modern-grid">
            <div className="taste-donut-container">
              {taste?.genreStats && taste.genreStats.length > 0 ? (
                <>
                  <div className="taste-donut-chart-box">
                    <ResponsiveContainer width={240} height={240}>
                      <PieChart>
                        <Pie
                          data={taste.genreStats}
                          dataKey="percentage"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={68}
                          outerRadius={95}
                          paddingAngle={3}
                          stroke="none"
                        >
                          {taste.genreStats.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip
                          contentStyle={{
                            backgroundColor: 'var(--code-bg)',
                            borderColor: 'var(--border)',
                            borderRadius: '8px',
                            color: 'var(--text-h)',
                            fontSize: '13px',
                          }}
                          formatter={(val, name) => [`${val}%`, `${name}`]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    {/* 도넛 중앙 1위 장르 타이포그래피 */}
                    <div className="taste-donut-center-label">
                      <span className="donut-center-sub">1위 장르</span>
                      <strong className="donut-center-main">{topGenre.name}</strong>
                      <span className="donut-center-pct">{topGenre.percentage}%</span>
                    </div>
                  </div>

                  {/* 도넛 우측/하단 범례 */}
                  <div className="taste-donut-legend">
                    {taste.genreStats.map((item, idx) => (
                      <div key={item.name} className="donut-legend-item">
                        <span className="legend-color-dot" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }} />
                        <span className="legend-name">{item.name}</span>
                        <span className="legend-val">{item.percentage}%</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="report-empty-placeholder">
                  <span className="empty-placeholder-icon">📊</span>
                  <p className="empty-placeholder-text">
                    아직 집계된 장르 통계가 없습니다.<br />다양한 분야의 책을 읽고 서재에 등록해 보세요.
                  </p>
                </div>
              )}
            </div>

            {/* 우측 키워드 및 태그 박스 */}
            <div className="taste-right-content">
              <div className="taste-tags-wrap">
                {taste?.tags && taste.tags.length > 0 ? (
                  taste.tags.map((tag) => (
                    <span key={tag} className="taste-tag">#{tag}</span>
                  ))
                ) : (
                  <span className="taste-tag taste-tag-muted">#독서시작대기</span>
                )}
              </div>
              <div className="taste-keywords-box">
                <div className="taste-keywords-label">💬 이번 달 사서와 나눈 주요 대화 키워드</div>
                <div className="taste-keywords-list">
                  {taste?.keywords && taste.keywords.length > 0 ? (
                    taste.keywords.map((kw) => (
                      <span key={kw} className="taste-kw-chip">{kw}</span>
                    ))
                  ) : (
                    <p className="taste-keywords-empty">아직 사서와 나눈 독서 토론 키워드가 없습니다.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 04. 독서 밸런스 */}
        <section className="report-card">
          <div className="report-card-header">
            <span className="report-card-num">04</span>
            <h2 className="report-card-title">독서 밸런스 (장르 다양성 게이지 · 편독 분석)</h2>
          </div>
          <div style={{ marginBottom: 6, fontSize: 14, fontWeight: 600 }}>
            장르 다양성 지수: {balance?.diversityScore ?? 0}점 / 100점
          </div>
          <div className="balance-gauge-track">
            <div className="balance-gauge-fill" style={{ width: `${balance?.diversityScore ?? 0}%` }} />
          </div>
          <p className="balance-analysis-text">
            {balance?.analysisText}
          </p>
        </section>

        {/* 05. 내가 남긴 독서 흔적 */}
        <section className="report-card">
          <div className="report-card-header">
            <span className="report-card-num">05</span>
            <h2 className="report-card-title">내가 남긴 독서 흔적 (스크랩 · 인용구)</h2>
          </div>
          {footprint?.topScraps && footprint.topScraps.length > 0 ? (
            <div className="footprint-scraps-grid">
              {footprint.topScraps.map((scrap, idx) => (
                <div key={idx} className="scrap-quote-card">
                  <div className="scrap-quote-text">“{scrap.text}”</div>
                  <div className="scrap-quote-book">— {scrap.bookTitle}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="report-empty-placeholder">
              <span className="empty-placeholder-icon">✍️</span>
              <p className="empty-placeholder-text">
                이번 달에 수집된 문장 스크랩이 없습니다.<br />책을 읽으며 마음을 울린 문장을 카메라 OCR이나 수동으로 스크랩해 보세요.
              </p>
            </div>
          )}
        </section>

        {/* 06. 날씨와 책 (아이콘 + 베스트 도서 표지 매핑 Grid 카드) */}
        <section className="report-card">
          <div className="report-card-header">
            <span className="report-card-num">06</span>
            <h2 className="report-card-title">날씨와 책 (날씨별 베스트 도서 매핑)</h2>
          </div>

          {rhythm?.weatherBooks && rhythm.weatherBooks.length > 0 ? (
            <div className="weather-books-grid">
              {rhythm.weatherBooks.map((wb, idx) => (
                <div key={idx} className="weather-book-card">
                  <div className="weather-card-top">
                    <span className="weather-card-emoji">{wb.emoji}</span>
                    <div className="weather-card-meta">
                      <span className="weather-card-label">{wb.label}</span>
                      <span className="weather-card-count">{wb.count}회 독서</span>
                    </div>
                  </div>

                  <div className="weather-book-content">
                    <img
                      className="weather-book-cover"
                      src={wb.coverUrl || '/covers/default_cover.png'}
                      alt={wb.bookTitle}
                      onError={(e) => {
                        e.currentTarget.src = '/covers/default_cover.png';
                      }}
                    />
                    <div className="weather-book-details">
                      <h4 className="weather-book-title">{wb.bookTitle}</h4>
                      <p className="weather-book-author">{wb.author}</p>
                      <p className="weather-book-quote">"{wb.quote}"</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="report-empty-placeholder">
              <span className="empty-placeholder-icon">🌦️</span>
              <p className="empty-placeholder-text">
                날씨와 연계된 독서 기록이 아직 없습니다.<br />독서 타이머를 켜고 책을 읽으면 현재 날씨와 어울리는 도서가 기록됩니다.
              </p>
            </div>
          )}
        </section>

        {/* 07. AI가 발견한 나 (사서 말풍선 디자인) */}
        <section className="report-card">
          <div className="report-card-header">
            <span className="report-card-num">07</span>
            <h2 className="report-card-title">AI가 발견한 나 (사서 관찰기)</h2>
          </div>
          <div className="librarian-discovery-wrap">
            <div className="librarian-avatar-box">
              <img
                className="librarian-avatar-img"
                src={librarian.profileImage}
                alt={librarian.displayName}
              />
              <div className="librarian-avatar-name">{librarian.displayName}</div>
            </div>
            <div className="speech-bubble">
              {librarianDiscovery?.readerType && (
                <div className="librarian-reader-type">
                  <span className="reader-type-badge">✨ 독서가 유형</span>
                  <strong className="reader-type-title">{librarianDiscovery.readerType}</strong>
                </div>
              )}
              <div className="speech-bubble-text">{librarianSpeech}</div>
              {Array.isArray(librarianDiscovery?.keyTraits) && librarianDiscovery.keyTraits.length > 0 && (
                <div className="reader-traits-list">
                  {librarianDiscovery.keyTraits.map((trait) => (
                    <span key={trait} className="reader-trait-pill">#{trait}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* 08. 다음 달 독서 처방 */}
        <section className="report-card">
          <div className="report-card-header">
            <span className="report-card-num">08</span>
            <h2 className="report-card-title">다음 달 독서 처방 (추천 도서 · 장르)</h2>
          </div>
          <div className="prescription-genre-banner">
            추천 장르 테마: <span className="prescription-genre-highlight">{genreLabel(prescription?.recommendedGenre) || prescription?.recommendedGenre}</span>
          </div>
          {prescription?.advice && (
            <p className="prescription-advice-text">
              💡 {prescription.advice}
            </p>
          )}
          {prescription?.books && prescription.books.length > 0 ? (
            <div className="prescription-grid">
              {prescription.books.map((book, idx) => (
                <div key={idx} className="prescription-book-card">
                  <img
                    className="prescription-book-cover"
                    src={book.coverUrl || '/covers/default_cover.png'}
                    alt={book.title}
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                  <div className="prescription-book-info">
                    <h3 className="prescription-book-title">{book.title}</h3>
                    <p className="prescription-book-author">{book.author}</p>
                    {book.genre && (
                      <span className="prescription-book-genre">#{genreLabel(book.genre) || book.genre}</span>
                    )}
                    <p className="prescription-book-reason">{book.reason}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="report-empty-placeholder">
              <span className="empty-placeholder-icon">💊</span>
              <p className="empty-placeholder-text">
                독서 활동이 축적되면 사서가 딱 맞는 다음 달 처방 도서를 엄선해 드립니다.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
