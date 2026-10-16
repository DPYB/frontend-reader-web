import { useState, useEffect, useRef, useCallback } from 'react';
import './BetaSurveyModal.css';

// 질문 상수 및 옵션 정의
const FIRST_VISIT_BOOK_RECORD_OPTIONS = [
  { id: 'paper', label: '① 종이 독서노트 / 다이어리', icon: '📓' },
  { id: 'memo', label: '② 메모 앱 (노션, 기본 메모 등)', icon: '📱' },
  { id: 'other_app', label: '③ 타 독서 앱 (밀리의 서재, 열품타 등)', icon: '📖' },
  { id: 'none', label: '④ 따로 기록하지 않음', icon: '💭' },
];

const SIGNUP_DIFFICULTY_OPTIONS = [
  { id: 'social_error', label: '① 소셜 로그인 오류' },
  { id: 'many_required', label: '② 필수 입력 항목이 많음' },
  { id: 'lack_guidance', label: '③ 다음 단계 안내 부족' },
  { id: 'no_issue', label: '④ 불편 없음' },
  { id: 'other', label: '⑤ 기타' },
];

const UNDERSTANDING_OPTIONS = [
  { id: 'immediate', label: '① 바로 이해됨' },
  { id: 'approximate', label: '② 대략 감은 옴' },
  { id: 'confusing', label: '③ 무엇을 하는 곳인지 잘 모르겠음' },
];

const DESIGN_RATINGS = [
  { score: 1, label: '매우 불만족', desc: '화면이 복잡하고 보기 어려워 사용에 방해가 됨' },
  { score: 2, label: '불만족', desc: '정리가 안 된 느낌이고 불편한 부분이 많음' },
  { score: 3, label: '보통', desc: '특별히 좋지도 나쁘지도 않음' },
  { score: 4, label: '만족', desc: '깔끔하고 보기 편하며 사용에 무리 없음' },
  { score: 5, label: '매우 만족', desc: '직관적이고 보기 좋아서 별다른 안내 없이도 쓸 수 있음' },
];

const FEATURE_OPTIONS = [
  '책 등록',
  '가상 서재',
  '독서 기록',
  'AI 동물 사서와의 대화',
  'AI 추천·리포트',
  '캘린더',
  '집중 타이머',
];

const AGE_OPTIONS = ['20대', '30대', '40대', '기타'];

const DEVICE_OPTIONS = ['PC', '모바일', '태블릿'];
const BROWSER_OPTIONS = ['Chrome', 'Safari', 'Edge', '기타'];
const SPEED_RATINGS = [
  { id: 'very_fast', label: '매우 빠름' },
  { id: 'good', label: '적당함' },
  { id: 'slow', label: '조금 느림' },
  { id: 'very_slow', label: '매우 느림 / 멈춤' },
];

/**
 * 이미지 파일 압축 (최대 해상도 1000px, JPEG 0.75 품질로 변환하여 DataURL 반환)
 */
async function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 1000;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.75));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function BetaSurveyModal({ isOpen, onClose }) {
  // 'select' | 'first_visit' | 'returning' | 'completed'
  const [step, setStep] = useState('select');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const modalContentRef = useRef(null);

  // --- 첫방문 설문 상태 ---
  const [firstForm, setFirstForm] = useState({
    similarServiceUsed: '', // 'yes' | 'no'
    similarServiceName: '',
    bookRecordWays: [], // ids
    bookRecordWayOther: '',
    signupDifficulty: '',
    signupDifficultyOther: '',
    understanding: '',
    designScore: 0,
    featuresUsed: [],
    featuresOther: '',
    confusingPart: '',
    ageGroup: '',
    ageGroupOther: '',
  });

  // --- 재방문 설문 상태 ---
  const [returningForm, setReturningForm] = useState({
    device: '',
    browser: '',
    browserOther: '',
    featuresUsed: [],
    featuresOther: '',
    inconvenience: '',
    inconvenienceImage: null,
    inconvenienceImageName: '',
    bugEncounter: '',
    bugImage: null,
    bugImageName: '',
    aiHelpfulness: '',
    mostUsefulFeature: '',
    returnReason: '',
    speedSatisfaction: '',
    speedComment: '',
    unnecessaryFeature: '',
    desiredFeature: '',
    overallSatisfaction: 0,
    freeFeedback: '',
  });

  // 모달 오픈/닫힘 시 바디 스크롤 락 및 상태 리셋
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      // 잠시 후 초기화
      const timer = setTimeout(() => {
        setStep('select');
      }, 300);
      return () => clearTimeout(timer);
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // ESC 키로 닫기
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // 상단 스크롤 리셋
  const scrollToTop = useCallback(() => {
    if (modalContentRef.current) {
      modalContentRef.current.scrollTop = 0;
    }
  }, []);

  const handleSelectType = (type) => {
    setStep(type);
    scrollToTop();
  };

  const handleBackToSelect = () => {
    setStep('select');
    scrollToTop();
  };

  // --- 첫방문 핸들러 ---
  const toggleFirstBookRecord = (id) => {
    setFirstForm((prev) => {
      const exists = prev.bookRecordWays.includes(id);
      return {
        ...prev,
        bookRecordWays: exists
          ? prev.bookRecordWays.filter((item) => item !== id)
          : [...prev.bookRecordWays, id],
      };
    });
  };

  const toggleFirstFeature = (feat) => {
    setFirstForm((prev) => {
      const exists = prev.featuresUsed.includes(feat);
      return {
        ...prev,
        featuresUsed: exists
          ? prev.featuresUsed.filter((item) => item !== feat)
          : [...prev.featuresUsed, feat],
      };
    });
  };

  // --- 재방문 핸들러 ---
  const toggleReturningFeature = (feat) => {
    setReturningForm((prev) => {
      const exists = prev.featuresUsed.includes(feat);
      return {
        ...prev,
        featuresUsed: exists
          ? prev.featuresUsed.filter((item) => item !== feat)
          : [...prev.featuresUsed, feat],
      };
    });
  };

  const handleImageUpload = async (e, fieldPrefix) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('이미지 파일(PNG, JPG, WebP 등)만 첨부할 수 있습니다.');
      return;
    }

    try {
      const dataUrl = await compressImage(file);
      setReturningForm((prev) => ({
        ...prev,
        [`${fieldPrefix}Image`]: dataUrl,
        [`${fieldPrefix}ImageName`]: file.name,
      }));
    } catch {
      alert('이미지를 처리하는 중 문제가 발생했습니다.');
    }
  };

  const handleRemoveImage = (fieldPrefix) => {
    setReturningForm((prev) => ({
      ...prev,
      [`${fieldPrefix}Image`]: null,
      [`${fieldPrefix}ImageName`]: '',
    }));
  };

  // --- 제출 핸들러 ---
  const handleSubmitFirstVisit = (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const surveyData = {
      type: 'first_visit',
      submittedAt: new Date().toISOString(),
      responses: firstForm,
    };

    try {
      const existing = JSON.parse(localStorage.getItem('dpyb_beta_surveys') || '[]');
      existing.push(surveyData);
      localStorage.setItem('dpyb_beta_surveys', JSON.stringify(existing));
    } catch {
      // localStorage quota exceeded or error fallback
    }

    setTimeout(() => {
      setIsSubmitting(false);
      setStep('completed');
      scrollToTop();
    }, 400);
  };

  const handleSubmitReturning = (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const surveyData = {
      type: 'returning',
      submittedAt: new Date().toISOString(),
      responses: returningForm,
    };

    try {
      const existing = JSON.parse(localStorage.getItem('dpyb_beta_surveys') || '[]');
      existing.push(surveyData);
      localStorage.setItem('dpyb_beta_surveys', JSON.stringify(existing));
    } catch {
      // localStorage quota exceeded fallback
    }

    setTimeout(() => {
      setIsSubmitting(false);
      setStep('completed');
      scrollToTop();
    }, 400);
  };

  if (!isOpen) return null;

  return (
    <div
      className="beta-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="beta-modal-title"
    >
      <div className="beta-modal-card" ref={modalContentRef}>
        {/* 헤더 바 */}
        <header className="beta-modal-header">
          <div className="beta-modal-header-left">
            {step !== 'select' && step !== 'completed' && (
              <button
                type="button"
                className="beta-modal-back-btn"
                onClick={handleBackToSelect}
                aria-label="선택 화면으로 돌아가기"
              >
                <span className="beta-back-arrow">←</span>
                <span>방문 선택</span>
              </button>
            )}
            <span className="beta-header-badge">BETA FEEDBACK</span>
          </div>
          <button
            type="button"
            className="beta-modal-close-btn"
            onClick={onClose}
            aria-label="닫기"
          >
            ✕
          </button>
        </header>

        {/* 1. 방문 유형 선택 화면 */}
        {step === 'select' && (
          <div className="beta-select-step">
            <div className="beta-intro-hero">
              <div className="beta-paw-icon-wrap">🐾</div>
              <h2 id="beta-modal-title" className="beta-intro-title">
                Don&apos;t Paw-get Your Book!
              </h2>
              <p className="beta-intro-subtitle">
                소중한 피드백으로 더 따뜻하고 편리한 서재를 만들어갑니다
              </p>
            </div>

            <div className="beta-intro-message-box">
              <p>
                <strong>BETA 버전에 참여해 주셔서 진심으로 감사드립니다! 🌿</strong>
              </p>
              <p>
                DPYB는 여러분의 책 읽는 여정을 더 가치 있고 즐겁게 돕기 위해 지속적으로 다듬어지고 있습니다.
                서비스를 이용하시면서 느끼신 사소한 불편함, 좋았던 점, 혹은 떠오른 아이디어를 자유롭게 들려주세요.
              </p>
              <p className="beta-intro-guide-note">
                맞춤형 설문 진행을 위해 <strong>방문 유형</strong>을 선택해 주세요.
              </p>
            </div>

            <div className="beta-choice-grid">
              {/* 첫방문 버튼 */}
              <button
                type="button"
                className="beta-choice-card beta-choice-card--first"
                onClick={() => handleSelectType('first_visit')}
              >
                <div className="beta-choice-badge">첫 시작</div>
                <div className="beta-choice-icon">🌱</div>
                <h3 className="beta-choice-title">첫방문 설문</h3>
                <p className="beta-choice-desc">
                  서비스를 처음 방문하셨거나, 방금 가입하여 둘러보고 계신 분을 위한 설문입니다.
                </p>
                <div className="beta-choice-footer">
                  <span className="beta-choice-time">약 2분 소요</span>
                  <span className="beta-choice-arrow">시작하기 →</span>
                </div>
              </button>

              {/* 재방문 버튼 */}
              <button
                type="button"
                className="beta-choice-card beta-choice-card--returning"
                onClick={() => handleSelectType('returning')}
              >
                <div className="beta-choice-badge">다시 방문</div>
                <div className="beta-choice-icon">📚</div>
                <h3 className="beta-choice-title">재방문 설문</h3>
                <p className="beta-choice-desc">
                  서비스를 2회 이상 이용하셨거나, 실제로 기능을 여러 번 사용해 보신 분을 위한 설문입니다.
                </p>
                <div className="beta-choice-footer">
                  <span className="beta-choice-time">약 3분 소요</span>
                  <span className="beta-choice-arrow">시작하기 →</span>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* 2. 첫방문 설문지 */}
        {step === 'first_visit' && (
          <form className="beta-survey-form" onSubmit={handleSubmitFirstVisit}>
            <div className="beta-form-title-wrap">
              <span className="beta-form-kicker">FIRST VISIT SURVEY</span>
              <h2 className="beta-form-title">첫방문 설문조사 🌱</h2>
              <p className="beta-form-desc">
                처음 서비스를 접하셨을 때의 솔직한 느낌을 들려주세요.
              </p>
            </div>

            {/* Q1. 유사 서비스 사용 경험 */}
            <section className="beta-question-card">
              <label className="beta-question-label">
                <span className="beta-q-num">1</span>
                이 서비스와 비슷한 서비스를 평소 사용해 보신 적이 있나요?
              </label>
              <div className="beta-radio-row">
                <label className={`beta-radio-chip ${firstForm.similarServiceUsed === 'no' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="similarServiceUsed"
                    value="no"
                    checked={firstForm.similarServiceUsed === 'no'}
                    onChange={() => setFirstForm({ ...firstForm, similarServiceUsed: 'no' })}
                  />
                  <span>아니오 (사용해 본 적 없음)</span>
                </label>
                <label className={`beta-radio-chip ${firstForm.similarServiceUsed === 'yes' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="similarServiceUsed"
                    value="yes"
                    checked={firstForm.similarServiceUsed === 'yes'}
                    onChange={() => setFirstForm({ ...firstForm, similarServiceUsed: 'yes' })}
                  />
                  <span>예 (사용해 본 적 있음)</span>
                </label>
              </div>
              {firstForm.similarServiceUsed === 'yes' && (
                <div className="beta-sub-input-wrap">
                  <input
                    type="text"
                    className="beta-text-input"
                    placeholder="어떤 서비스인지 적어주세요 (예: 밀리의 서재, 북적북적, 노션 독서노트 등)"
                    value={firstForm.similarServiceName}
                    onChange={(e) => setFirstForm({ ...firstForm, similarServiceName: e.target.value })}
                  />
                </div>
              )}
            </section>

            {/* Q2. 평소 독서 기록 관리 방법 */}
            <section className="beta-question-card">
              <label className="beta-question-label">
                <span className="beta-q-num">2</span>
                평소 읽은 책이나 독서 기록을 어떻게 관리하시나요?
                <span className="beta-q-hint">(해당하는 것을 모두 선택해 주세요)</span>
              </label>
              <div className="beta-options-grid">
                {FIRST_VISIT_BOOK_RECORD_OPTIONS.map((opt) => (
                  <label
                    key={opt.id}
                    className={`beta-checkbox-card ${firstForm.bookRecordWays.includes(opt.id) ? 'checked' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={firstForm.bookRecordWays.includes(opt.id)}
                      onChange={() => toggleFirstBookRecord(opt.id)}
                    />
                    <span className="beta-option-icon">{opt.icon}</span>
                    <span className="beta-option-text">{opt.label}</span>
                  </label>
                ))}
              </div>
            </section>

            {/* Q3. 가입 및 시작 과정 불편점 */}
            <section className="beta-question-card">
              <label className="beta-question-label">
                <span className="beta-q-num">3</span>
                가입 및 시작 과정에서 막히거나 불편했던 점이 있었나요?
              </label>
              <div className="beta-options-list">
                {SIGNUP_DIFFICULTY_OPTIONS.map((opt) => (
                  <label
                    key={opt.id}
                    className={`beta-radio-row-item ${firstForm.signupDifficulty === opt.id ? 'selected' : ''}`}
                  >
                    <input
                      type="radio"
                      name="signupDifficulty"
                      value={opt.id}
                      checked={firstForm.signupDifficulty === opt.id}
                      onChange={() => setFirstForm({ ...firstForm, signupDifficulty: opt.id })}
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>
              {firstForm.signupDifficulty === 'other' && (
                <div className="beta-sub-input-wrap">
                  <input
                    type="text"
                    className="beta-text-input"
                    placeholder="불편하셨던 점을 구체적으로 알려주세요."
                    value={firstForm.signupDifficultyOther}
                    onChange={(e) => setFirstForm({ ...firstForm, signupDifficultyOther: e.target.value })}
                  />
                </div>
              )}
            </section>

            {/* Q4. 서비스 정체성 이해도 */}
            <section className="beta-question-card">
              <label className="beta-question-label">
                <span className="beta-q-num">4</span>
                서비스에 처음 접속했을 때, 이 서비스가 무엇을 하는 곳인지 바로 이해됐나요?
              </label>
              <div className="beta-options-list">
                {UNDERSTANDING_OPTIONS.map((opt) => (
                  <label
                    key={opt.id}
                    className={`beta-radio-row-item ${firstForm.understanding === opt.id ? 'selected' : ''}`}
                  >
                    <input
                      type="radio"
                      name="understanding"
                      value={opt.id}
                      checked={firstForm.understanding === opt.id}
                      onChange={() => setFirstForm({ ...firstForm, understanding: opt.id })}
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>
            </section>

            {/* Q5. 화면 디자인과 구성 (1~5점) */}
            <section className="beta-question-card">
              <label className="beta-question-label">
                <span className="beta-q-num">5</span>
                화면 디자인과 구성은 어떠셨나요? (1~5점)
              </label>
              <div className="beta-rating-table">
                {DESIGN_RATINGS.map((rate) => (
                  <label
                    key={rate.score}
                    className={`beta-rating-table-row ${firstForm.designScore === rate.score ? 'selected' : ''}`}
                  >
                    <input
                      type="radio"
                      name="designScore"
                      value={rate.score}
                      checked={firstForm.designScore === rate.score}
                      onChange={() => setFirstForm({ ...firstForm, designScore: rate.score })}
                    />
                    <span className="beta-rating-cell beta-rating-cell--score">
                      ⭐ {rate.score}점
                    </span>
                    <span className="beta-rating-cell beta-rating-cell--label">
                      {rate.label}
                    </span>
                    <span className="beta-rating-cell beta-rating-cell--desc">
                      {rate.desc}
                    </span>
                  </label>
                ))}
              </div>
            </section>

            {/* Q6. 사용해 본 기능 다중 선택 */}
            <section className="beta-question-card">
              <label className="beta-question-label">
                <span className="beta-q-num">6</span>
                사용해 본 기능을 모두 선택해 주세요.
              </label>
              <div className="beta-chip-grid">
                {FEATURE_OPTIONS.map((feat) => (
                  <button
                    type="button"
                    key={feat}
                    className={`beta-select-chip ${firstForm.featuresUsed.includes(feat) ? 'selected' : ''}`}
                    onClick={() => toggleFirstFeature(feat)}
                  >
                    <span className="beta-chip-check">
                      {firstForm.featuresUsed.includes(feat) ? '✓' : '+'}
                    </span>
                    <span>{feat}</span>
                  </button>
                ))}
              </div>
              <div className="beta-sub-input-wrap">
                <input
                  type="text"
                  className="beta-text-input"
                  placeholder="기타 사용해 보신 기능이 있다면 입력해 주세요"
                  value={firstForm.featuresOther}
                  onChange={(e) => setFirstForm({ ...firstForm, featuresOther: e.target.value })}
                />
              </div>
            </section>

            {/* Q7. 헷갈리거나 막막했던 부분 */}
            <section className="beta-question-card">
              <label className="beta-question-label">
                <span className="beta-q-num">7</span>
                처음 사용하면서 헷갈리거나 막막했던 부분이 있었나요?
              </label>
              <textarea
                className="beta-textarea"
                rows={3}
                placeholder="예: 책을 어떻게 등록하는지 모름, 다음 액션을 모르겠음, 버튼 위치를 찾기 어려움 등"
                value={firstForm.confusingPart}
                onChange={(e) => setFirstForm({ ...firstForm, confusingPart: e.target.value })}
              />
            </section>

            {/* Q8. 연령대 */}
            <section className="beta-question-card">
              <label className="beta-question-label">
                <span className="beta-q-num">8</span>
                연령대를 선택해 주세요.
              </label>
              <div className="beta-radio-row">
                {AGE_OPTIONS.map((age) => (
                  <label
                    key={age}
                    className={`beta-radio-chip ${firstForm.ageGroup === age ? 'selected' : ''}`}
                  >
                    <input
                      type="radio"
                      name="ageGroup"
                      value={age}
                      checked={firstForm.ageGroup === age}
                      onChange={() => setFirstForm({ ...firstForm, ageGroup: age })}
                    />
                    <span>{age}</span>
                  </label>
                ))}
              </div>
              {firstForm.ageGroup === '기타' && (
                <div className="beta-sub-input-wrap">
                  <input
                    type="text"
                    className="beta-text-input"
                    placeholder="연령대를 적어주세요 (예: 10대, 50대 이상 등)"
                    value={firstForm.ageGroupOther}
                    onChange={(e) => setFirstForm({ ...firstForm, ageGroupOther: e.target.value })}
                  />
                </div>
              )}
            </section>

            {/* 폼 하단 버튼 */}
            <div className="beta-form-actions">
              <button
                type="button"
                className="beta-btn-secondary"
                onClick={handleBackToSelect}
              >
                방문 선택으로
              </button>
              <button
                type="submit"
                className="beta-btn-primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? '제출 중... 🐾' : '첫방문 설문 제출하기'}
              </button>
            </div>
          </form>
        )}

        {/* 3. 재방문 설문지 */}
        {step === 'returning' && (
          <form className="beta-survey-form" onSubmit={handleSubmitReturning}>
            <div className="beta-form-title-wrap">
              <span className="beta-form-kicker">RETURNING VISIT SURVEY</span>
              <h2 className="beta-form-title">재방문 설문조사 📚</h2>
              <p className="beta-form-desc">
                다시 찾아와 주셔서 감사합니다! 서비스 개선을 위한 깊이 있는 의견을 들려주세요.
              </p>
            </div>

            {/* Q1. 기기 / 브라우저 */}
            <section className="beta-question-card">
              <label className="beta-question-label">
                <span className="beta-q-num">1</span>
                어떤 기기와 브라우저로 사용하셨나요?
              </label>
              <div className="beta-sub-question">
                <span className="beta-sub-title">📱 사용 기기</span>
                <div className="beta-radio-row">
                  {DEVICE_OPTIONS.map((dev) => (
                    <label
                      key={dev}
                      className={`beta-radio-chip ${returningForm.device === dev ? 'selected' : ''}`}
                    >
                      <input
                        type="radio"
                        name="device"
                        value={dev}
                        checked={returningForm.device === dev}
                        onChange={() => setReturningForm({ ...returningForm, device: dev })}
                      />
                      <span>{dev}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="beta-sub-question">
                <span className="beta-sub-title">🌐 브라우저</span>
                <div className="beta-radio-row">
                  {BROWSER_OPTIONS.map((brw) => (
                    <label
                      key={brw}
                      className={`beta-radio-chip ${returningForm.browser === brw ? 'selected' : ''}`}
                    >
                      <input
                        type="radio"
                        name="browser"
                        value={brw}
                        checked={returningForm.browser === brw}
                        onChange={() => setReturningForm({ ...returningForm, browser: brw })}
                      />
                      <span>{brw}</span>
                    </label>
                  ))}
                </div>
                {returningForm.browser === '기타' && (
                  <div className="beta-sub-input-wrap">
                    <input
                      type="text"
                      className="beta-text-input"
                      placeholder="사용 중인 브라우저를 입력해 주세요 (예: Whale, Firefox, Samsung Internet 등)"
                      value={returningForm.browserOther}
                      onChange={(e) => setReturningForm({ ...returningForm, browserOther: e.target.value })}
                    />
                  </div>
                )}
              </div>
            </section>

            {/* Q2. 오늘 사용해 본 기능 */}
            <section className="beta-question-card">
              <label className="beta-question-label">
                <span className="beta-q-num">2</span>
                오늘 사용해 본 기능을 모두 선택해 주세요.
              </label>
              <div className="beta-chip-grid">
                {FEATURE_OPTIONS.map((feat) => (
                  <button
                    type="button"
                    key={feat}
                    className={`beta-select-chip ${returningForm.featuresUsed.includes(feat) ? 'selected' : ''}`}
                    onClick={() => toggleReturningFeature(feat)}
                  >
                    <span className="beta-chip-check">
                      {returningForm.featuresUsed.includes(feat) ? '✓' : '+'}
                    </span>
                    <span>{feat}</span>
                  </button>
                ))}
              </div>
              <div className="beta-sub-input-wrap">
                <input
                  type="text"
                  className="beta-text-input"
                  placeholder="기타 사용해 보신 기능이 있다면 적어주세요"
                  value={returningForm.featuresOther}
                  onChange={(e) => setReturningForm({ ...returningForm, featuresOther: e.target.value })}
                />
              </div>
            </section>

            {/* Q3. 불편했던 점 (스크린샷 첨부 옵션) */}
            <section className="beta-question-card">
              <label className="beta-question-label">
                <span className="beta-q-num">3</span>
                선택한 기능 중 불편했던 점이 있었나요?
                <span className="beta-q-hint">(선택: 스크린샷 첨부 가능)</span>
              </label>
              <textarea
                className="beta-textarea"
                rows={3}
                placeholder="불편했던 경험이나 아쉬웠던 점을 편하게 적어주세요."
                value={returningForm.inconvenience}
                onChange={(e) => setReturningForm({ ...returningForm, inconvenience: e.target.value })}
              />
              <div className="beta-file-upload-box">
                {returningForm.inconvenienceImage ? (
                  <div className="beta-image-preview-wrap">
                    <img
                      src={returningForm.inconvenienceImage}
                      alt="불편 사항 스크린샷 미리보기"
                      className="beta-preview-thumb"
                    />
                    <div className="beta-preview-info">
                      <span className="beta-preview-name">{returningForm.inconvenienceImageName}</span>
                      <button
                        type="button"
                        className="beta-file-remove-btn"
                        onClick={() => handleRemoveImage('inconvenience')}
                      >
                        삭제 ✕
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="beta-file-upload-label">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, 'inconvenience')}
                      className="beta-file-input"
                    />
                    <span className="beta-upload-icon">📷</span>
                    <span className="beta-upload-text">스크린샷 이미지 첨부하기 (선택)</span>
                  </label>
                )}
              </div>
            </section>

            {/* Q4. 오류, 멈춤, 비정상 동작 (스크린샷 첨부 옵션) */}
            <section className="beta-question-card">
              <label className="beta-question-label">
                <span className="beta-q-num">4</span>
                오류, 멈춤, 비정상 동작을 겪으셨나요?
                <span className="beta-q-hint">(선택: 스크린샷 첨부 가능)</span>
              </label>
              <textarea
                className="beta-textarea"
                rows={3}
                placeholder="오류가 발생한 화면이나 당시 상황을 적어주세요."
                value={returningForm.bugEncounter}
                onChange={(e) => setReturningForm({ ...returningForm, bugEncounter: e.target.value })}
              />
              <div className="beta-file-upload-box">
                {returningForm.bugImage ? (
                  <div className="beta-image-preview-wrap">
                    <img
                      src={returningForm.bugImage}
                      alt="오류 스크린샷 미리보기"
                      className="beta-preview-thumb"
                    />
                    <div className="beta-preview-info">
                      <span className="beta-preview-name">{returningForm.bugImageName}</span>
                      <button
                        type="button"
                        className="beta-file-remove-btn"
                        onClick={() => handleRemoveImage('bug')}
                      >
                        삭제 ✕
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="beta-file-upload-label">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, 'bug')}
                      className="beta-file-input"
                    />
                    <span className="beta-upload-icon">📷</span>
                    <span className="beta-upload-text">오류 화면 스크린샷 첨부하기 (선택)</span>
                  </label>
                )}
              </div>
            </section>

            {/* Q5. AI 사서 답변 도움 여부 */}
            <section className="beta-question-card">
              <label className="beta-question-label">
                <span className="beta-q-num">5</span>
                AI 사서의 답변이 질문에 도움이 되었나요?
                <span className="beta-q-hint">(답변이 부정확하거나 기대와 달랐던 경험이 있나요?)</span>
              </label>
              <textarea
                className="beta-textarea"
                rows={3}
                placeholder="AI 사서와의 대화 경험이나 답변의 만족도/부족했던 점을 적어주세요."
                value={returningForm.aiHelpfulness}
                onChange={(e) => setReturningForm({ ...returningForm, aiHelpfulness: e.target.value })}
              />
            </section>

            {/* Q6. 가장 유용했던 기능 */}
            <section className="beta-question-card">
              <label className="beta-question-label">
                <span className="beta-q-num">6</span>
                가장 유용했던 기능은 무엇인가요?
              </label>
              <input
                type="text"
                className="beta-text-input"
                placeholder="예: 3D 가상 서재, AI 사서 추천, 독서 캘린더 등"
                value={returningForm.mostUsefulFeature}
                onChange={(e) => setReturningForm({ ...returningForm, mostUsefulFeature: e.target.value })}
              />
            </section>

            {/* Q7. 서비스를 다시 사용하고 싶은 가장 큰 이유 */}
            <section className="beta-question-card">
              <label className="beta-question-label">
                <span className="beta-q-num">7</span>
                이 서비스를 다시 사용하고 싶은 가장 큰 이유는 무엇인가요?
              </label>
              <textarea
                className="beta-textarea"
                rows={2}
                placeholder="예: 나만의 3D 책장을 채우는 재미, 귀여운 동물 사서와의 소통 등"
                value={returningForm.returnReason}
                onChange={(e) => setReturningForm({ ...returningForm, returnReason: e.target.value })}
              />
            </section>

            {/* Q8. 속도(로딩, 반응) 만족도 */}
            <section className="beta-question-card">
              <label className="beta-question-label">
                <span className="beta-q-num">8</span>
                속도(로딩, 반응)는 만족스러웠나요?
              </label>
              <div className="beta-radio-row">
                {SPEED_RATINGS.map((spd) => (
                  <label
                    key={spd.id}
                    className={`beta-radio-chip ${returningForm.speedSatisfaction === spd.id ? 'selected' : ''}`}
                  >
                    <input
                      type="radio"
                      name="speedSatisfaction"
                      value={spd.id}
                      checked={returningForm.speedSatisfaction === spd.id}
                      onChange={() => setReturningForm({ ...returningForm, speedSatisfaction: spd.id })}
                    />
                    <span>{spd.label}</span>
                  </label>
                ))}
              </div>
              <div className="beta-sub-input-wrap">
                <input
                  type="text"
                  className="beta-text-input"
                  placeholder="속도 관련 추가 의견이 있다면 적어주세요 (선택)"
                  value={returningForm.speedComment}
                  onChange={(e) => setReturningForm({ ...returningForm, speedComment: e.target.value })}
                />
              </div>
            </section>

            {/* Q9. 불필요하다고 느낀 기능 */}
            <section className="beta-question-card">
              <label className="beta-question-label">
                <span className="beta-q-num">9</span>
                불필요하다고 느낀 기능이 있었나요?
              </label>
              <input
                type="text"
                className="beta-text-input"
                placeholder="없으시면 비워두셔도 됩니다."
                value={returningForm.unnecessaryFeature}
                onChange={(e) => setReturningForm({ ...returningForm, unnecessaryFeature: e.target.value })}
              />
            </section>

            {/* Q10. 있었으면 하는 기능 */}
            <section className="beta-question-card">
              <label className="beta-question-label">
                <span className="beta-q-num">10</span>
                있었으면 하는 기능은 무엇인가요?
              </label>
              <textarea
                className="beta-textarea"
                rows={2}
                placeholder="예: 독서 통계 그래프, 친구와 책장 공유, 알림 기능 등"
                value={returningForm.desiredFeature}
                onChange={(e) => setReturningForm({ ...returningForm, desiredFeature: e.target.value })}
              />
            </section>

            {/* Q11. 오늘의 만족도 (1~5점) */}
            <section className="beta-question-card">
              <label className="beta-question-label">
                <span className="beta-q-num">11</span>
                오늘의 만족도는 어느 정도인가요? (1~5점)
              </label>
              <div className="beta-star-ratings">
                {[1, 2, 3, 4, 5].map((score) => (
                  <button
                    type="button"
                    key={score}
                    className={`beta-star-btn ${returningForm.overallSatisfaction >= score ? 'active' : ''}`}
                    onClick={() => setReturningForm({ ...returningForm, overallSatisfaction: score })}
                    aria-label={`${score}점`}
                  >
                    ⭐
                    <span className="beta-star-num">{score}점</span>
                  </button>
                ))}
              </div>
            </section>

            {/* Q12. 개선을 위해 꼭 전하고 싶은 의견 */}
            <section className="beta-question-card">
              <label className="beta-question-label">
                <span className="beta-q-num">12</span>
                개선을 위해 꼭 전하고 싶은 의견을 자유롭게 적어주세요.
              </label>
              <textarea
                className="beta-textarea"
                rows={4}
                placeholder="개발팀과 사서들에게 전하고 싶은 따뜻한 응원이나 솔직한 제안을 자유롭게 남겨주세요."
                value={returningForm.freeFeedback}
                onChange={(e) => setReturningForm({ ...returningForm, freeFeedback: e.target.value })}
              />
            </section>

            {/* 폼 하단 버튼 */}
            <div className="beta-form-actions">
              <button
                type="button"
                className="beta-btn-secondary"
                onClick={handleBackToSelect}
              >
                방문 선택으로
              </button>
              <button
                type="submit"
                className="beta-btn-primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? '제출 중... 🐾' : '재방문 설문 제출하기'}
              </button>
            </div>
          </form>
        )}

        {/* 4. 제출 완료 화면 */}
        {step === 'completed' && (
          <div className="beta-completed-step">
            <div className="beta-completed-icon">🐾</div>
            <h2 className="beta-completed-title">소중한 피드백 감사합니다!</h2>
            <p className="beta-completed-desc">
              남겨주신 의견은 Don&apos;t Paw-get Your Book 개발팀과 사서들이 하나하나 정성스럽게 검토하겠습니다.
              더 아늑하고 즐거운 독서 서재로 보답하겠습니다! 🌿
            </p>
            <div className="beta-completed-card">
              <span>설문 작성이 성공적으로 기록되었습니다.</span>
            </div>
            <button
              type="button"
              className="beta-btn-primary beta-btn-complete-close"
              onClick={onClose}
            >
              닫기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
