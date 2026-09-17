import { useState, useEffect, useRef, useId } from 'react';
import { createPortal } from 'react-dom';
import { useBooks } from '../../store/booksStore';
import { getLibraryBook } from '../../api/bookApi';
import { createReadingSession } from '../../api/recordApi';
import { getUserLocation, getWeatherCondition } from '../../api/geolocation';
import { formatDuration } from '../../lib/timeFormat';
import './ReadingTimerModal.css';

/**
 * 시간을 '00:00' 또는 '00:00:00' 포맷으로 변환
 * @param {number} totalSeconds
 * @returns {string}
 */
function formatTime(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;

  const mm = String(mins).padStart(2, '0');
  const ss = String(secs).padStart(2, '0');

  if (hrs > 0) {
    const hh = String(hrs).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  }
  return `${mm}:${ss}`;
}

/**
 * ReadingTimerModal — 독서 집중 타이머 모달 (스톱워치 & 뽀모도로 모드 지원)
 *
 * @param {object} props
 * @param {object|null} [props.initialBook] - 특정 책 상세에서 열린 경우 책 객체
 * @param {() => void} props.onClose - 모달 닫기 핸들러
 * @param {(book: object) => void} [props.onOpenBookDetail] - 필요 시 도서 상세 모달 열기 핸들러
 * @param {() => void} [props.onSavedSession] - 세션 저장 성공 시 후속 새로고침 핸들러
 */
export default function ReadingTimerModal({ initialBook = null, onClose, onOpenBookDetail, onSavedSession }) {
  const { books, saveReadingProgress, saveBookMeta, reload } = useBooks();

  const titleId = useId();
  const bookSelectId = useId();
  const readPageInputId = useId();
  const memoInputId = useId();

  // 대상 도서 선택
  const [selectedBookId, setSelectedBookId] = useState(
    () => initialBook?.bookId || books[0]?.bookId || ''
  );

  // 대상 도서 상세 정보
  const currentBook = books.find((b) => b.bookId === selectedBookId) || initialBook;
  const [totalPages, setTotalPages] = useState(currentBook?.totalPage || 0);
  const [currentPage, setCurrentPage] = useState(0);

  // 타이머 모드: 'stopwatch' | 'pomodoro'
  const [timerMode, setTimerMode] = useState('stopwatch');
  // 뽀모도로 프리셋: 분 단위 (25분, 50분 등)
  const [pomodoroMinutes, setPomodoroMinutes] = useState(25);

  // 초 단위 타이머 상태
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  // 독서 완료 및 결과 저장 단계 ('running' | 'finish_step')
  const [isFinishing, setIsFinishing] = useState(false);
  const [elapsedTotalSeconds, setElapsedTotalSeconds] = useState(0);
  const [endPage, setEndPage] = useState('');
  const [readingMemo, setReadingMemo] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const timerRef = useRef(null);

  // 선택된 책의 상세(현재 페이지 및 총 페이지) 동기화
  useEffect(() => {
    if (!selectedBookId) return;
    let cancelled = false;

    (async () => {
      try {
        const d = await getLibraryBook(selectedBookId);
        if (cancelled) return;
        setTotalPages(d.totalPages || 0);
        setCurrentPage(d.currentPage || 0);
        setEndPage(d.currentPage ? String(d.currentPage) : '');
      } catch {
        // 상세 조회 실패 시 기존 도서 정보 유지
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedBookId]);

  // 타이머 모드 변경 시 시간 초기화
  const handleModeChange = (mode) => {
    if (isRunning) return; // 실행 중일 땐 모드 전환 방지
    setTimerMode(mode);
    if (mode === 'stopwatch') {
      setSeconds(0);
    } else {
      setSeconds(pomodoroMinutes * 60);
    }
  };

  const handlePomodoroPresetChange = (mins) => {
    if (isRunning) return;
    setPomodoroMinutes(mins);
    setSeconds(mins * 60);
  };

  // 타이머 인터벌 실행
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setSeconds((prev) => {
          if (timerMode === 'stopwatch') {
            return prev + 1;
          } else {
            if (prev <= 1) {
              clearInterval(timerRef.current);
              setIsRunning(false);
              return 0;
            }
            return prev - 1;
          }
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, timerMode]);

  // 시작 / 일시정지 토글
  const handleToggleTimer = () => {
    if (timerMode === 'pomodoro' && seconds === 0) {
      setSeconds(pomodoroMinutes * 60);
    }
    setIsRunning((prev) => !prev);
  };

  // 리셋
  const handleReset = () => {
    setIsRunning(false);
    if (timerMode === 'stopwatch') {
      setSeconds(0);
    } else {
      setSeconds(pomodoroMinutes * 60);
    }
  };

  // 독서 완료 처리 진입
  const handleFinishReading = () => {
    setIsRunning(false);
    const elapsed =
      timerMode === 'stopwatch'
        ? seconds
        : Math.max(0, pomodoroMinutes * 60 - seconds);

    setElapsedTotalSeconds(elapsed);
    setIsFinishing(true);
  };

  // 최종 저장 (진행률 갱신 및 독서 기록 저장)
  const handleSaveProgressAndRecord = async () => {
    if (!selectedBookId) {
      setErrorMessage('독서한 도서를 선택해 주세요.');
      return;
    }

    const pageNum = Number(endPage);
    if (Number.isNaN(pageNum) || pageNum < 0) {
      setErrorMessage('유효한 페이지 번호를 입력해 주세요.');
      return;
    }

    setSaving(true);
    setErrorMessage(null);

    try {
      // 1. 코어 서버의 독서 진행률 갱신
      await saveReadingProgress(selectedBookId, pageNum, totalPages > 0 ? totalPages : null);

      // 1-1. 시작전(PLANNED) 도서에서 1쪽 이상 읽은 경우, 서버 도서 상태도 '읽는 중(READING)'으로 승격
      if (pageNum > 0 && currentBook?.status === '시작전') {
        try {
          const latestDetail = await getLibraryBook(selectedBookId);
          await saveBookMeta(selectedBookId, {
            title: latestDetail.title,
            author: latestDetail.author,
            isbn: latestDetail.isbn,
            genre: latestDetail.genre,
            subject: latestDetail.subject,
            displayGenre: latestDetail.displayGenre,
            publisher: latestDetail.publisher,
            publishedDate: latestDetail.publishedDate,
            coverUrl: latestDetail.coverUrl,
            readingStatus: 'READING',
            totalPages: latestDetail.totalPages,
          });
        } catch {
          // 상태 승격 실패 시에도 독서 세션 저장은 계속 진행
        }
      }

      // 2. 독서 세션(타이머 기록) 작성: 백엔드 POST /books/{id}/reading-sessions 및 /records 폴백 연동
      const formattedDuration = formatDuration(elapsedTotalSeconds);
      const autoContent = readingMemo.trim()
        ? readingMemo.trim()
        : `⏱️ ${formattedDuration} 동안 독서 집중 완료 (${pageNum}쪽까지 읽음)`;

      // 현재 날씨 가져오기 (선택)
      let weather = null;
      try {
        const loc = await getUserLocation();
        if (loc?.latitude && loc?.longitude) {
          weather = await getWeatherCondition(loc.latitude, loc.longitude);
        }
      } catch {
        // 날씨 획득 실패 시 null 유지
      }

      await createReadingSession({
        bookId: selectedBookId,
        duration: elapsedTotalSeconds,
        pageNumber: pageNum,
        memo: autoContent,
        weather: weather || null,
      });

      // 전체 목록 새로고침
      await reload();
      if (onSavedSession) {
        onSavedSession();
      }

      // 완료 후 닫기
      onClose();
      if (onOpenBookDetail && currentBook) {
        onOpenBookDetail(currentBook);
      }
    } catch (err) {
      console.error('[ReadingTimerModal] 저장 실패:', err);
      setErrorMessage('독서 기록 저장에 실패했습니다. 다시 시도해 주세요.');
    } finally {
      setSaving(false);
    }
  };

  const modalContent = (
    <div className="rt-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <div className="rt-modal" onClick={(e) => e.stopPropagation()}>
        {/* 헤더 */}
        <div className="rt-header">
          <div className="rt-title-area">
            <span style={{ fontSize: 22 }}>⏱️</span>
            <h3 id={titleId}>{isFinishing ? '독서 완료 기록' : '독서 집중 타이머'}</h3>
          </div>
          <button className="rt-close-btn" onClick={onClose} aria-label="닫기">
            ✕
          </button>
        </div>

        {!isFinishing ? (
          <>
            {/* 도서 선택란 */}
            <div className="rt-book-select-area">
              <label htmlFor={bookSelectId} className="rt-label">읽을 책</label>
              {initialBook ? (
                <div className="rt-current-book-info">
                  <span className="rt-book-tag">선택됨</span>
                  <strong>{initialBook.title}</strong>
                  <span style={{ color: 'var(--text)', fontSize: 13 }}>
                    ({currentPage}/{totalPages || '-'}쪽)
                  </span>
                </div>
              ) : (
                <select
                  id={bookSelectId}
                  className="rt-select"
                  value={selectedBookId}
                  onChange={(e) => setSelectedBookId(e.target.value)}
                  disabled={isRunning}
                >
                  {books.length === 0 ? (
                    <option value="">서재에 등록된 도서가 없습니다</option>
                  ) : (
                    books.map((b) => (
                      <option key={b.bookId} value={b.bookId}>
                        {b.title} ({b.status})
                      </option>
                    ))
                  )}
                </select>
              )}
            </div>

            {/* 타이머 모드 탭 (스톱워치 vs 뽀모도로) */}
            <div className="rt-mode-tabs">
              <button
                type="button"
                className={`rt-mode-tab ${timerMode === 'stopwatch' ? 'active' : ''}`}
                onClick={() => handleModeChange('stopwatch')}
                disabled={isRunning}
              >
                스톱워치 (자유 독서)
              </button>
              <button
                type="button"
                className={`rt-mode-tab ${timerMode === 'pomodoro' ? 'active' : ''}`}
                onClick={() => handleModeChange('pomodoro')}
                disabled={isRunning}
              >
                뽀모도로 (집중 인터벌)
              </button>
            </div>

            {/* 뽀모도로 프리셋 버튼들 */}
            {timerMode === 'pomodoro' && (
              <div className="rt-presets">
                {[15, 25, 50].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    className={`rt-preset-btn ${pomodoroMinutes === mins ? 'active' : ''}`}
                    onClick={() => handlePomodoroPresetChange(mins)}
                    disabled={isRunning}
                  >
                    {mins}분 집중
                  </button>
                ))}
              </div>
            )}

            {/* 타이머 디스플레이 */}
            <div className="rt-display-container">
              <div className="rt-time-text">{formatTime(seconds)}</div>
              <div className="rt-mode-desc">
                <span className={`rt-status-pulse ${isRunning ? 'running' : 'paused'}`} />
                {isRunning
                  ? '책에 온전히 몰입하는 시간…'
                  : seconds === 0 && timerMode === 'stopwatch'
                    ? '준비되면 시작을 눌러주세요'
                    : '일시정지 상태'}
              </div>
            </div>

            {/* 타이머 컨트롤 버튼 */}
            <div className="rt-controls">
              <button
                type="button"
                className={`rt-btn ${isRunning ? 'rt-btn-secondary' : 'rt-btn-primary'}`}
                onClick={handleToggleTimer}
              >
                {isRunning ? '⏸️ 일시정지' : '▶️ 독서 시작'}
              </button>
              <button
                type="button"
                className="rt-btn rt-btn-secondary"
                onClick={handleReset}
                disabled={seconds === 0 && !isRunning}
              >
                🔄 초기화
              </button>
              <button
                type="button"
                className="rt-btn rt-btn-success"
                onClick={handleFinishReading}
                disabled={
                  timerMode === 'stopwatch'
                    ? seconds < 10
                    : pomodoroMinutes * 60 - seconds < 10
                }
                title="10초 이상 독서 후 완료할 수 있습니다"
              >
                ✅ 독서 완료
              </button>
            </div>
          </>
        ) : (
          /* 독서 완료 후 페이지 및 기록 저장 화면 */
          <div className="rt-summary-box">
            <div className="rt-summary-item">
              <span>집중 독서 시간</span>
              <strong>{formatTime(elapsedTotalSeconds)}</strong>
            </div>
            <div className="rt-summary-item">
              <span>도서명</span>
              <strong>{currentBook?.title || '선택된 도서'}</strong>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '4px 0' }} />

            <div className="rt-input-group">
              <label htmlFor={readPageInputId} className="rt-label">
                어디까지 읽으셨나요? (현재 페이지)
              </label>
              <div className="rt-input-row">
                <input
                  id={readPageInputId}
                  type="number"
                  className="rt-input"
                  min={0}
                  max={totalPages || undefined}
                  value={endPage}
                  onChange={(e) => setEndPage(e.target.value)}
                  placeholder={String(currentPage || 0)}
                  disabled={saving}
                />
                <span style={{ fontSize: 15, color: 'var(--text)' }}>
                  / {totalPages > 0 ? totalPages : '-'} 쪽
                </span>
              </div>
            </div>

            <div className="rt-input-group">
              <label htmlFor={memoInputId} className="rt-label">
                간단한 한 줄 감상이나 메모 (선택)
              </label>
              <textarea
                id={memoInputId}
                className="rt-textarea"
                value={readingMemo}
                onChange={(e) => setReadingMemo(e.target.value)}
                placeholder="오늘 읽은 내용 중 기억에 남는 생각이나 키워드를 남겨보세요."
                disabled={saving}
              />
            </div>

            {errorMessage && <p className="rt-error-msg">{errorMessage}</p>}

            <div className="rt-controls" style={{ marginTop: 8 }}>
              <button
                type="button"
                className="rt-btn rt-btn-secondary"
                onClick={() => setIsFinishing(false)}
                disabled={saving}
              >
                뒤로
              </button>
              <button
                type="button"
                className="rt-btn rt-btn-primary"
                onClick={handleSaveProgressAndRecord}
                disabled={saving}
              >
                {saving ? '저장 중...' : '독서 기록 저장'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
