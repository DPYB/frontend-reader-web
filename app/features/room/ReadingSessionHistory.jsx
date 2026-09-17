import { useState, useEffect } from 'react';
import { fetchReadingSessions } from '../../api/recordApi';
import './ReadingSessionHistory.css';

/**
 * ReadingSessionHistory — 도서별 독서 타이머 집중 세션 히스토리 목록 UI.
 *
 * 타이머 모달을 통해 기록된 집중 독서 시간(분), 도달 페이지, 감상 메모, 날씨를
 * 테이블 및 세션 카드 형태로 깔끔하게 렌더링합니다.
 *
 * @param {object} props
 * @param {number|string} props.bookId - 대상 도서 ID
 * @param {number} [props.version=0] - 외부 변경(저장 등) 시 목록 재조회 트리거
 * @param {() => void} [props.onOpenTimer] - 타이머 열기 핸들러
 */
export default function ReadingSessionHistory({ bookId, version = 0, onOpenTimer }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    if (!bookId) return;
    let cancelled = false;

    (async () => {
      try {
        const data = await fetchReadingSessions(bookId);
        if (cancelled) return;
        const sorted = [...data].sort((a, b) => {
          const tA = new Date(a.createdAt || 0).getTime();
          const tB = new Date(b.createdAt || 0).getTime();
          return tB - tA;
        });
        setSessions(sorted);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        console.error('[ReadingSessionHistory] 조회 실패:', err);
        setError('독서 세션 기록을 불러오지 못했습니다.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [bookId, version, reloadCount]);

  // 누적 독서 시간 및 회차 계산
  const totalMinutes = sessions.reduce((acc, cur) => {
    const mins = cur.durationMinutes || Math.round((cur.duration || 0) / 60) || 0;
    return acc + mins;
  }, 0);

  const formatSessionDate = (isoStr) => {
    if (!isoStr) return '-';
    try {
      const d = new Date(isoStr);
      return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    } catch {
      return isoStr;
    }
  };

  const getWeatherIcon = (cond) => {
    switch (cond) {
      case 'clear': return '☀️';
      case 'cloudy': return '☁️';
      case 'rainy': return '🌧️';
      case 'snowy': return '❄️';
      default: return null;
    }
  };

  return (
    <div className="rsh-container">
      {/* 상단 통계 요약 바 */}
      <div className="rsh-summary-bar">
        <div className="rsh-stat-item">
          <span className="rsh-stat-label">총 독서 시간</span>
          <strong className="rsh-stat-value">{totalMinutes}분</strong>
        </div>
        <div className="rsh-stat-divider" />
        <div className="rsh-stat-item">
          <span className="rsh-stat-label">완료한 세션</span>
          <strong className="rsh-stat-value">{sessions.length}회</strong>
        </div>
        {onOpenTimer && (
          <button
            type="button"
            className="rsh-timer-quick-btn"
            onClick={onOpenTimer}
          >
            <span>⏱️</span> 타이머 시작
          </button>
        )}
      </div>

      {/* 세션 목록 바디 */}
      <div className="rsh-body">
        {loading ? (
          <div className="rsh-empty-state">
            <span className="rsh-spinner">⏳</span>
            <p>독서 기록을 불러오는 중…</p>
          </div>
        ) : error ? (
          <div className="rsh-empty-state">
            <p style={{ color: '#e05a4e' }}>{error}</p>
            <button
              type="button"
              className="rsh-retry-btn"
              onClick={() => {
                setLoading(true);
                setReloadCount((c) => c + 1);
              }}
            >
              다시 시도
            </button>
          </div>
        ) : sessions.length === 0 ? (
          <div className="rsh-empty-state">
            <span style={{ fontSize: 32 }}>⏱️</span>
            <p className="rsh-empty-title">아직 기록된 독서 세션이 없습니다.</p>
            <p className="rsh-empty-desc">
              독서 타이머를 켜고 몰입한 시간과 생각을 남겨보세요!
            </p>
            {onOpenTimer && (
              <button
                type="button"
                className="rsh-empty-action-btn"
                onClick={onOpenTimer}
              >
                독서 타이머 시작하기
              </button>
            )}
          </div>
        ) : (
          <div className="rsh-table-wrap">
            <table className="rsh-table">
              <thead>
                <tr>
                  <th style={{ width: '22%' }}>일시</th>
                  <th style={{ width: '16%' }}>집중 시간</th>
                  <th style={{ width: '14%' }}>도달 페이지</th>
                  <th>메모 및 생각</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s, idx) => {
                  const mins = s.durationMinutes || Math.max(1, Math.round((s.duration || 0) / 60));
                  const weatherIcon = getWeatherIcon(s.weather);
                  return (
                    <tr key={s.id || idx}>
                      <td className="rsh-td-date">
                        {formatSessionDate(s.createdAt)}
                        {weatherIcon && <span className="rsh-weather-badge">{weatherIcon}</span>}
                      </td>
                      <td className="rsh-td-duration">
                        <span className="rsh-duration-badge">⏱️ {mins}분</span>
                      </td>
                      <td className="rsh-td-page">
                        {s.pageNumber ? `${s.pageNumber}쪽` : '-'}
                      </td>
                      <td className="rsh-td-memo">
                        {s.memo || <span className="rsh-memo-empty">기록 없음</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
