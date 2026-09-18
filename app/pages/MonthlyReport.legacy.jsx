import { useState, useEffect, useRef } from 'react';
import { useLibrarian } from '../store/librarianStore';
import { fetchMonthlyReport } from '../api/reportApi';
import { downloadReportAsPdf } from '../lib/pdfExport';
import { genreLabel } from '../data/genres';
import './MonthlyReport.css';

/**
 * 기본 Mock 데이터 (AI 서버 연결 대기 또는 데이터가 아직 충분하지 않을 때 보여줄 견본 와꾸)
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
  },
  taste: {
    tags: ['SF / 디스토피아', '철학 에세이', '심리 스릴러', '서양 고전'],
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
    message: null, // 사서별 자동 생성
  },
  prescription: {
    recommendedGenre: '현대 예술 에세이',
    books: [
      {
        title: '불안을 넘어선 감각들',
        author: '엘레나 로페즈',
        coverUrl: '/covers/default_cover.png',
        reason: '사색적인 저녁 독서 패턴에 차분한 쉼표를 찍어줄 도서입니다.',
      },
      {
        title: '모든 순간의 기하학',
        author: '하워드 정',
        coverUrl: '/covers/default_cover.png',
        reason: '과학적 호기심과 인문학적 감성을 절묘하게 엮어낸 수작입니다.',
      },
    ],
  },
};

export default function MonthlyReport() {
  const { librarian } = useLibrarian();
  const reportRef = useRef(null);

  const currentDate = new Date();
  const [year, setYear] = useState(currentDate.getFullYear());
  const [month, setMonth] = useState(currentDate.getMonth() + 1);

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
          setReportData({
            ...DEFAULT_FALLBACK_DATA,
            ...data,
          });
        }
      } catch {
        // AI 에이전트 미연결 또는 초기 상태인 경우 fallback 데이터 유지
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

  // PDF 다운로드 핸들러 (사서 닉네임 연동)
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
            <option value="2026-9">2026년 9월</option>
            <option value="2026-8">2026년 8월</option>
            <option value="2026-7">2026년 7월</option>
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

        {/* 02. 독서 리듬 */}
        <section className="report-card">
          <div className="report-card-header">
            <span className="report-card-num">02</span>
            <h2 className="report-card-title">독서 리듬 (요일 / 시간대 / 날씨)</h2>
          </div>
          <div className="rhythm-grid">
            {/* 요일별 */}
            <div className="rhythm-subcard">
              <div className="rhythm-subcard-title">📅 요일별 독서 빈도</div>
              {rhythm?.dayOfWeek?.map((item) => (
                <div key={item.day} className="rhythm-bar-item">
                  <span className="rhythm-bar-label">{item.day}요일</span>
                  <div className="rhythm-bar-track">
                    <div className="rhythm-bar-fill" style={{ width: `${Math.min(100, item.count * 8)}%` }} />
                  </div>
                  <span className="rhythm-bar-count">{item.count}회</span>
                </div>
              ))}
            </div>

            {/* 시간대별 */}
            <div className="rhythm-subcard">
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

            {/* 날씨별 */}
            <div className="rhythm-subcard">
              <div className="rhythm-subcard-title">🌦️ 날씨와 함께한 독서</div>
              {rhythm?.weather?.map((item) => (
                <div key={item.condition} className="rhythm-bar-item">
                  <span className="rhythm-bar-label" style={{ width: 110 }}>{item.condition}</span>
                  <div className="rhythm-bar-track">
                    <div className="rhythm-bar-fill" style={{ width: `${Math.min(100, item.count * 5)}%` }} />
                  </div>
                  <span className="rhythm-bar-count">{item.count}회</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 03. 독서 취향 */}
        <section className="report-card">
          <div className="report-card-header">
            <span className="report-card-num">03</span>
            <h2 className="report-card-title">독서 취향 (장르 / 주제 태그 · 토론 키워드)</h2>
          </div>
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

        {/* 06. AI가 발견한 나 (사서 말풍선 디자인) */}
        <section className="report-card">
          <div className="report-card-header">
            <span className="report-card-num">06</span>
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

        {/* 07. 다음 달 독서 처방 */}
        <section className="report-card">
          <div className="report-card-header">
            <span className="report-card-num">07</span>
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
