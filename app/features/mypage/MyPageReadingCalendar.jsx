import { useState, useEffect, useMemo, useCallback } from 'react';
import { useBooks } from '../../store/booksStore';
import { fetchMonthlyCalendar } from '../../api/recordApi';
import { coverImageSrc, onFallbackCover } from '../../lib/coverImage';
import { formatDuration } from '../../lib/timeFormat';

/**
 * 날짜 객체 또는 ISO 문자열을 'YYYY-MM-DD' 형식으로 변환 (로컬 타임존 기준)
 */
function toDateKey(dateInput) {
  if (!dateInput) return null;
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return null;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 시간 포맷팅 (예: '오후 3:24')
 */
function formatTimeOnly(dateInput) {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' });
}

export default function MyPageReadingCalendar({ onSelectBook }) {
  const { books } = useBooks();

  // 현재 달력 뷰 기준 연/월 (1-based)
  const today = useMemo(() => new Date(), []);
  const [currentYear, setCurrentYear] = useState(() => today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(() => today.getMonth() + 1);

  // 선택된 날짜 ('YYYY-MM-DD')
  const [selectedDate, setSelectedDate] = useState(() => toDateKey(today));

  // 전체 활동 목록 { [dateKey: 'YYYY-MM-DD']: Activity[] }
  const [activitiesByDate, setActivitiesByDate] = useState({});
  const [loading, setLoading] = useState(false);

  // books 배열을 bookId -> book 객체 매핑 테이블로 캐싱
  const booksMap = useMemo(() => {
    const map = new Map();
    if (Array.isArray(books)) {
      books.forEach((b) => {
        if (b.bookId != null) map.set(Number(b.bookId), b);
      });
    }
    return map;
  }, [books]);

  // 해당 월의 활동 데이터를 단일 API(fetchMonthlyCalendar)로 1회 조회
  const loadAllActivities = useCallback(async () => {
    setLoading(true);
    const dateMap = {};

    const addActivity = (dateStr, activity) => {
      const key = toDateKey(dateStr);
      if (!key) return;
      if (!dateMap[key]) dateMap[key] = [];
      dateMap[key].push(activity);
    };

    try {
      const calendarRes = await fetchMonthlyCalendar(currentYear, currentMonth);
      const rawActivities = Array.isArray(calendarRes?.activities)
        ? calendarRes.activities
        : Array.isArray(calendarRes)
          ? calendarRes
          : [];

      rawActivities.forEach((act) => {
        const rawDate = act.date || act.created_at || act.createdAt;
        const rawType = act.type;
        const bId = act.book_id ?? act.bookId;
        const matchedBook = bId != null ? booksMap.get(Number(bId)) : null;

        // 프론트엔드 호환용 book 객체 합성
        const resolvedBook = matchedBook || (bId != null ? {
          bookId: bId,
          title: act.book_title || act.bookTitle || '도서',
          coverUrl: act.book_cover_url || act.bookCoverUrl || '',
        } : null);

        let typeLabel = '독서 활동';
        let badgeBg = 'rgba(59, 130, 246, 0.15)';
        let badgeColor = '#3b82f6';
        let icon = '📖';

        if (rawType === 'TIMER_SESSION') {
          typeLabel = '집중 독서';
          badgeBg = 'rgba(255, 154, 60, 0.15)';
          badgeColor = 'var(--accent)';
          icon = '⏱️';
        } else if (rawType === 'SENTENCE_SCRAP') {
          typeLabel = '문장 수집';
          badgeBg = 'rgba(139, 92, 246, 0.15)';
          badgeColor = '#8b5cf6';
          icon = '📝';
        } else if (rawType === 'READING_RECORD') {
          typeLabel = '독서 기록';
          badgeBg = 'rgba(16, 185, 129, 0.15)';
          badgeColor = '#10b981';
          icon = '📖';
        } else if (rawType === 'BOOK_REGISTERED') {
          typeLabel = '도서 등록';
          badgeBg = 'rgba(59, 130, 246, 0.15)';
          badgeColor = '#3b82f6';
          icon = '📚';
        }

        const durSec = Number(act.duration_seconds ?? act.durationSeconds ?? act.duration ?? 0);

        addActivity(rawDate, {
          id: act.id,
          type: rawType,
          typeLabel,
          badgeBg,
          badgeColor,
          icon,
          book: resolvedBook,
          title: act.title,
          desc: act.desc,
          memo: act.memo,
          pageNumber: act.page_number ?? act.pageNumber,
          duration: durSec,
          weather: act.weather,
          timestamp: act.created_at || act.createdAt || rawDate,
        });
      });

      // 각 날짜별 활동을 최신 시간순 정렬
      Object.keys(dateMap).forEach((k) => {
        dateMap[k].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      });

      setActivitiesByDate(dateMap);
    } catch {
      setActivitiesByDate({});
    } finally {
      setLoading(false);
    }
  }, [currentYear, currentMonth, booksMap]);

  useEffect(() => {
    loadAllActivities();
  }, [loadAllActivities]);

  // 달력 매트릭스 계산 (현재 보고 있는 연/월)
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth - 1, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth, 0);

    const startDayOfWeek = firstDayOfMonth.getDay(); // 0(일) ~ 6(토)
    const totalDays = lastDayOfMonth.getDate(); // 28 ~ 31

    const days = [];

    // 앞쪽 빈칸 (이전 달 날짜 슬롯)
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push({ type: 'empty', key: `empty-${i}` });
    }

    // 이번 달 날짜들
    for (let d = 1; d <= totalDays; d++) {
      const monthStr = String(currentMonth).padStart(2, '0');
      const dayStr = String(d).padStart(2, '0');
      const dateKey = `${currentYear}-${monthStr}-${dayStr}`;
      const dayActivities = activitiesByDate[dateKey] || [];

      days.push({
        type: 'day',
        dayNumber: d,
        dateKey,
        activities: dayActivities,
        hasActivity: dayActivities.length > 0,
        isToday: dateKey === toDateKey(today),
        isSelected: dateKey === selectedDate,
      });
    }

    return days;
  }, [currentYear, currentMonth, activitiesByDate, selectedDate, today]);

  // 이번 달 통계 요약 (출석 일수, 총 독서 시간, 문장 수 등)
  const monthStats = useMemo(() => {
    const monthPrefix = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
    let activeDays = 0;
    let totalSeconds = 0;
    let totalScraps = 0;
    const activeBookSet = new Set();

    Object.entries(activitiesByDate).forEach(([dateKey, list]) => {
      if (dateKey.startsWith(monthPrefix) && list.length > 0) {
        activeDays += 1;
        list.forEach((act) => {
          if (act.duration) totalSeconds += act.duration;
          if (act.type === 'SENTENCE_SCRAP') totalScraps += 1;
          if (act.book?.bookId) activeBookSet.add(act.book.bookId);
        });
      }
    });

    return {
      activeDays,
      totalDurationStr: formatDuration(totalSeconds),
      totalScraps,
      activeBooksCount: activeBookSet.size,
    };
  }, [currentYear, currentMonth, activitiesByDate]);

  // 연/월 이동 핸들러
  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentYear((y) => y - 1);
      setCurrentMonth(12);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentYear((y) => y + 1);
      setCurrentMonth(1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleGoToday = () => {
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth() + 1);
    setSelectedDate(toDateKey(today));
  };

  // 선택된 날짜의 활동 목록
  const selectedDateActivities = activitiesByDate[selectedDate] || [];

  const formattedSelectedDateHeader = useMemo(() => {
    if (!selectedDate) return '';
    const [y, m, d] = selectedDate.split('-');
    return `${Number(y)}년 ${Number(m)}월 ${Number(d)}일`;
  }, [selectedDate]);

  return (
    <div className="mypage-reading-calendar">
      {/* 캘린더 상단 네비게이션 & 오늘 버튼 */}
      <div className="calendar-header-toolbar">
        <div className="calendar-month-nav">
          <button
            type="button"
            className="calendar-nav-btn"
            onClick={handlePrevMonth}
            aria-label="이전 달"
          >
            ◀
          </button>
          <h3 className="calendar-month-title">
            {currentYear}년 {currentMonth}월
          </h3>
          <button
            type="button"
            className="calendar-nav-btn"
            onClick={handleNextMonth}
            aria-label="다음 달"
          >
            ▶
          </button>
        </div>

        <button
          type="button"
          className="calendar-today-btn"
          onClick={handleGoToday}
        >
          오늘
        </button>
      </div>

      {/* 이번 달 독서 활동 요약 바 */}
      <div className="calendar-summary-bar">
        <div className="summary-stat-item">
          <span className="stat-label">🌟 이번 달 출석일</span>
          <span className="stat-value">{monthStats.activeDays}일</span>
        </div>
        <div className="summary-stat-divider" />
        <div className="summary-stat-item">
          <span className="stat-label">⏱️ 총 독서 시간</span>
          <span className="stat-value">{monthStats.totalDurationStr}</span>
        </div>
        <div className="summary-stat-divider" />
        <div className="summary-stat-item">
          <span className="stat-label">📝 수집 문장</span>
          <span className="stat-value">{monthStats.totalScraps}개</span>
        </div>
        <div className="summary-stat-divider" />
        <div className="summary-stat-item">
          <span className="stat-label">📚 함께한 도서</span>
          <span className="stat-value">{monthStats.activeBooksCount}권</span>
        </div>
      </div>

      {/* 캘린더 본문: 2단 가로 분할 레이아웃 (왼쪽: 캘린더, 오른쪽: 업데이트된 사항들) */}
      <div className="calendar-main-layout">
        {/* 왼쪽: 캘린더 그리드 */}
        <div className="calendar-left-pane">
          <div className="calendar-grid-card">
            {/* 요일 헤더 */}
            <div className="calendar-weekdays-row">
              <span className="weekday-cell sun">일</span>
              <span className="weekday-cell">월</span>
              <span className="weekday-cell">화</span>
              <span className="weekday-cell">수</span>
              <span className="weekday-cell">목</span>
              <span className="weekday-cell">금</span>
              <span className="weekday-cell sat">토</span>
            </div>

            {/* 날짜 셀 그리드 */}
            <div className="calendar-days-grid">
              {calendarDays.map((item) => {
                if (item.type === 'empty') {
                  return <div key={item.key} className="calendar-day-cell empty" />;
                }

                const { dayNumber, dateKey, hasActivity, isToday, isSelected, activities } = item;

                return (
                  <button
                    key={dateKey}
                    type="button"
                    className={`calendar-day-cell ${hasActivity ? 'has-activity' : ''} ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}`}
                    onClick={() => setSelectedDate(dateKey)}
                    aria-label={`${dateKey} 독서 활동 ${activities.length}건`}
                  >
                    <span className="day-number">{dayNumber}</span>

                    {/* 출석 체크인 배지 및 활동 카운트 */}
                    {hasActivity && (
                      <div className="attendance-badge-wrap">
                        <span className="attendance-stamp" title={`독서 활동 ${activities.length}건`}>
                          🐾
                        </span>
                        {activities.length > 1 && (
                          <span className="attendance-count">+{activities.length}</span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 오른쪽: 선택한 날짜의 독서 기록 상세 목록 (세로 길이 캘린더와 동일, 넘치면 상하 스크롤) */}
        <div className="calendar-right-pane">
          <div className="calendar-date-detail-section">
            <div className="detail-section-header">
              <h4 className="detail-header-title">
                📅 {formattedSelectedDateHeader} 독서 기록
                <span className="activity-count-tag">
                  {selectedDateActivities.length}건
                </span>
              </h4>
              {loading && <span className="detail-loading-tag">동기화 중...</span>}
            </div>

            {selectedDateActivities.length > 0 ? (
              <div className="calendar-activity-list">
                {selectedDateActivities.map((act) => (
                  <article
                    key={act.id}
                    className="calendar-activity-card"
                    onClick={() => act.book && onSelectBook?.(act.book)}
                    tabIndex={0}
                    role="button"
                    onKeyDown={(e) => {
                      if ((e.key === 'Enter' || e.key === ' ') && act.book) {
                        e.preventDefault();
                        onSelectBook?.(act.book);
                      }
                    }}
                  >
                    {/* 도서 표지 썸네일 */}
                    {act.book && (
                      <div className="activity-book-thumb">
                        <img
                          src={coverImageSrc(act.book.coverUrl)}
                          alt={act.book.title}
                          loading="lazy"
                          onError={onFallbackCover}
                        />
                      </div>
                    )}

                    {/* 활동 내용 */}
                    <div className="activity-card-body">
                      <div className="activity-card-meta-row">
                        <span
                          className="activity-type-badge"
                          style={{
                            background: act.badgeBg,
                            color: act.badgeColor,
                          }}
                        >
                          {act.icon} {act.typeLabel}
                        </span>
                        <span className="activity-time-stamp">
                          {formatTimeOnly(act.timestamp)}
                        </span>
                      </div>

                      <h5 className="activity-main-title">{act.title}</h5>

                      {act.desc && act.desc !== act.title && (
                        <p className="activity-desc-text">
                          {act.desc}
                        </p>
                      )}

                      {act.memo && (
                        <p className="activity-memo-text">
                          💭 {act.memo}
                        </p>
                      )}

                      {act.pageNumber != null && (
                        <span className="activity-page-pill">
                          p. {act.pageNumber}
                        </span>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="calendar-date-empty">
                <p className="empty-emoji">🍃</p>
                <p className="empty-text">
                  <strong>{formattedSelectedDateHeader}</strong>에는 기록된 독서 활동이 없어요.
                </p>
                <p className="empty-subtext">
                  책을 읽거나 문장을 수집하여 출석 도장을 남겨보세요!
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
