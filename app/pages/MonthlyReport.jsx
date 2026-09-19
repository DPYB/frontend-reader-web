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
import { useLibrarian } from '../store/librarianStore';
import { fetchMonthlyReport } from '../api/reportApi';
import { downloadReportAsPdf } from '../lib/pdfExport';
import { genreLabel } from '../data/genres';
import './MonthlyReport.css';

/**
 * 기본 Mock/Fallback 데이터 (AI 서버 연결 대기 또는 통계 데이터가 아직 누적되지 않았을 때 보여줄 감성 견본)
 */
const DEFAULT_FALLBACK_DATA = {
  overview: {
    completedCount: 4,
    totalPages: 1240,
    streakDays: 14,
  },
  rhythm: {
    dayOfWeek: [
      { day: '월', count: 3 },
      { day: '화', count: 2 },
      { day: '수', count: 5 },
      { day: '목', count: 4 },
      { day: '금', count: 7 },
      { day: '토', count: 12 },
      { day: '일', count: 9 },
    ],
    timeOfDay: [
      { time: '새벽', count: 4 },
      { time: '낮', count: 8 },
      { time: '저녁', count: 15 },
      { time: '심야', count: 12 },
    ],
    weather: [
      { condition: '맑음 (clear)', count: 16 },
      { condition: '흐림 (cloudy)', count: 9 },
      { condition: '비/눈 (rainy/snowy)', count: 14 },
    ],
    weatherBooks: [
      {
        condition: 'clear',
        label: '맑음',
        emoji: '☀️',
        count: 16,
        bookTitle: '코스모스',
        author: '칼 세이건',
        coverUrl: 'https://contents.kyobobook.co.kr/sih/fit-in/458x0/pdt/9788983711892.jpg',
        quote: '맑게 갠 하늘 아래, 무한한 우주의 신비를 만끽한 책',
      },
      {
        condition: 'rainy',
        label: '비/눈',
        emoji: '🌧️',
        count: 14,
        bookTitle: '이기적 유전자',
        author: '리처드 도킨스',
        coverUrl: 'https://contents.kyobobook.co.kr/sih/fit-in/458x0/pdt/9788932476506.jpg',
        quote: '빗소리와 함께 지적 호기심을 깨운 최고의 몰입 도서',
      },
      {
        condition: 'cloudy',
        label: '흐림',
        emoji: '☁️',
        count: 9,
        bookTitle: '불안을 넘어선 감각들',
        author: '엘레나 로페즈',
        coverUrl: 'https://contents.kyobobook.co.kr/sih/fit-in/458x0/pdt/9788932917245.jpg',
        quote: '차분한 회색빛 공기 속에서 내면을 위로해 준 문장들',
      },
    ],
  },
  taste: {
    tags: ['소설/문학', '철학/사상', '자연과학', '심리/에세이'],
    genreStats: [
      { name: '문학', count: 14, percentage: 38 },
      { name: '철학', count: 8, percentage: 22 },
      { name: '자연과학', count: 6, percentage: 16 },
      { name: '사회과학', count: 5, percentage: 14 },
      { name: '예술', count: 4, percentage: 10 },
    ],
    keywords: ['인공지능 윤리', '내면의 침묵', '자유의지', '기억의 조작', '시간의 비가역성'],
  },
  balance: {
    diversityScore: 78,
    analysisText: '문학과 과학철학 중심의 깊이 있는 탐독이 돋보였습니다. 다음 달에는 예술/인문 분야를 곁들이면 한층 균형 잡힌 독서가 완성될 거예요.',
  },
  footprint: {
    topScraps: [
      {
        text: '우리는 우리가 기억하는 것들의 총합이며, 동시에 망각을 선택한 것들의 결과물이다.',
        bookTitle: '기억의 숲을 거닐다',
      },
      {
        text: '밤하늘의 별들이 차갑게 빛나는 까닭은 그들이 영원을 살아가기 때문이 아닐까.',
        bookTitle: '코스모스 오디세이',
      },
    ],
  },
  librarianDiscovery: {
    message: null,
  },
  prescription: {
    recommendedGenre: '현대 예술 에세이',
    books: [
      {
        title: '불안을 넘어선 감각들',
        author: '엘레나 로페즈',
        coverUrl: 'https://contents.kyobobook.co.kr/sih/fit-in/458x0/pdt/9788932917245.jpg',
        reason: '사색적인 저녁 독서 패턴에 차분한 쉼표를 찍어줄 도서입니다.',
      },
      {
        title: '모든 순간의 기하학',
        author: '하워드 정',
        coverUrl: 'https://contents.kyobobook.co.kr/sih/fit-in/458x0/pdt/9788983711892.jpg',
        reason: '과학적 호기심과 인문학적 감성을 절묘하게 엮어낸 수작입니다.',
      },
    ],
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
  const { librarian } = useLibrarian();
  const reportRef = useRef(null);

  const availableMonths = useMemo(() => getAvailableMonths(), []);
  const [year, setYear] = useState(() => availableMonths[0]?.year || 2026);
  const [month, setMonth] = useState(() => availableMonths[0]?.month || 9);

  const [, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [reportData, setReportData] = useState(DEFAULT_FALLBACK_DATA);

  // 연/월 변경 시 백엔드 조회
  useEffect(() => {
    let cancelled = false;
    async function loadReport() {
      setLoading(true);
      try {
        const data = await fetchMonthlyReport({ year, month });
        if (!cancelled && data) {
          // 요일 데이터 체크 (전부 0인지 판별)
          const hasDayActivity = data.rhythm?.dayOfWeek?.some((d) => d.count > 0);
          const mergedDayOfWeek = hasDayActivity ? data.rhythm.dayOfWeek : DEFAULT_FALLBACK_DATA.rhythm.dayOfWeek;

          // 장르 데이터 정규화 (백엔드 genreStats 또는 fallback)
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
          } else {
            normalizedGenres = DEFAULT_FALLBACK_DATA.taste.genreStats;
          }

          // 날씨별 베스트 도서 매핑 (응답에 없으면 추천도서 및 fallback 조인)
          let finalWeatherBooks = DEFAULT_FALLBACK_DATA.rhythm.weatherBooks;
          if (Array.isArray(data.rhythm?.weatherBooks) && data.rhythm.weatherBooks.length > 0) {
            finalWeatherBooks = data.rhythm.weatherBooks;
          } else if (Array.isArray(data.prescription?.books) && data.prescription.books.length > 0) {
            const b1 = data.prescription.books[0];
            const b2 = data.prescription.books[1] || data.prescription.books[0];
            finalWeatherBooks = [
              {
                condition: 'clear',
                label: '맑음',
                emoji: '☀️',
                count: data.rhythm?.weather?.[0]?.count || 12,
                bookTitle: b1.title,
                author: b1.author,
                coverUrl: b1.coverUrl,
                quote: '맑은 날 가장 많은 시간과 페이지를 넘긴 책',
              },
              {
                condition: 'rainy',
                label: '비/눈',
                emoji: '🌧️',
                count: data.rhythm?.weather?.[2]?.count || 9,
                bookTitle: b2.title,
                author: b2.author,
                coverUrl: b2.coverUrl,
                quote: '비 내리는 날 사서와 함께 깊이 빠져든 책',
              },
              {
                condition: 'cloudy',
                label: '흐림',
                emoji: '☁️',
                count: data.rhythm?.weather?.[1]?.count || 6,
                bookTitle: DEFAULT_FALLBACK_DATA.rhythm.weatherBooks[2].bookTitle,
                author: DEFAULT_FALLBACK_DATA.rhythm.weatherBooks[2].author,
                coverUrl: DEFAULT_FALLBACK_DATA.rhythm.weatherBooks[2].coverUrl,
                quote: '흐린 날 차분한 마음으로 밑줄을 그은 책',
              },
            ];
          }

          setReportData({
            ...DEFAULT_FALLBACK_DATA,
            ...data,
            rhythm: {
              ...DEFAULT_FALLBACK_DATA.rhythm,
              ...data.rhythm,
              dayOfWeek: mergedDayOfWeek,
              weatherBooks: finalWeatherBooks,
            },
            taste: {
              ...DEFAULT_FALLBACK_DATA.taste,
              ...data.taste,
              genreStats: normalizedGenres,
            },
          });
        }
      } catch {
        if (!cancelled) {
          setReportData(DEFAULT_FALLBACK_DATA);
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
    if (!list || list.length === 0) return { name: '문학', percentage: 38 };
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

  // 사서별 맞춤 멘트 생성 (06번 섹션)
  const isStork = librarian.id === 'stork';
  const librarianSpeech =
    reportData.librarianDiscovery?.message ||
    (isStork
      ? `독자님의 ${month}월 독서는 깊은 사색과 절제된 집중이 깃들어 있었습니다. 비 오는 날과 심야 시간에 특히 철학적 문장에 많은 흔적을 남기셨더군요. 언제나 품격 있는 독서 여정을 제가 정성껏 보좌하겠습니다.`
      : `집사님의 ${month}월 독서는 호기심과 모험이 넘쳐났다 냥! 🐾 특히 주말 밤마다 책에 푹 빠져서 스크랩을 잔뜩 남겼어 냥. 내가 골라준 다음 달 처방 책도 마음에 쏙 들 거다 냥! 🐟📖`);

  const { overview, rhythm, taste, balance, footprint, librarianDiscovery, prescription } = reportData;

  return (
    <div className="report-container">
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
              <div className="overview-streak-badge">🔥 독서 Streak 달성 중!</div>
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
              <div className="taste-donut-chart-box">
                <ResponsiveContainer width={240} height={240}>
                  <PieChart>
                    <Pie
                      data={taste?.genreStats || []}
                      dataKey="percentage"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={68}
                      outerRadius={95}
                      paddingAngle={3}
                      stroke="none"
                    >
                      {(taste?.genreStats || []).map((_, index) => (
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
                {(taste?.genreStats || []).map((item, idx) => (
                  <div key={item.name} className="donut-legend-item">
                    <span className="legend-color-dot" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }} />
                    <span className="legend-name">{item.name}</span>
                    <span className="legend-val">{item.percentage}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 우측 키워드 및 태그 박스 */}
            <div className="taste-right-content">
              <div className="taste-tags-wrap">
                {taste?.tags?.map((tag) => (
                  <span key={tag} className="taste-tag">#{tag}</span>
                ))}
              </div>
              <div className="taste-keywords-box">
                <div className="taste-keywords-label">💬 이번 달 사서와 나눈 주요 대화 키워드</div>
                <div className="taste-keywords-list">
                  {taste?.keywords?.map((kw) => (
                    <span key={kw} className="taste-kw-chip">{kw}</span>
                  ))}
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
          <div className="footprint-scraps-grid">
            {footprint?.topScraps?.map((scrap, idx) => (
              <div key={idx} className="scrap-quote-card">
                <div className="scrap-quote-text">“{scrap.text}”</div>
                <div className="scrap-quote-book">— {scrap.bookTitle}</div>
              </div>
            ))}
          </div>
        </section>

        {/* 06. 날씨와 책 (아이콘 + 베스트 도서 표지 매핑 Grid 카드) */}
        <section className="report-card">
          <div className="report-card-header">
            <span className="report-card-num">06</span>
            <h2 className="report-card-title">날씨와 책 (날씨별 베스트 도서 매핑)</h2>
          </div>

          <div className="weather-books-grid">
            {(rhythm?.weatherBooks || []).map((wb, idx) => (
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
          <div className="prescription-grid">
            {prescription?.books?.map((book, idx) => (
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
        </section>
      </div>
    </div>
  );
}
