import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../store/authStore';
import MyPageReadingList from '../features/mypage/MyPageReadingList';
import MyPageReadingCalendar from '../features/mypage/MyPageReadingCalendar';
import BookDetail from '../features/room/BookDetail';
import './MyPage.css';

// 회원이 프로필 사진을 올리지 않았을 때 쓰는 기본 아바타 (깔끔한 기본 실루엣)
const DEFAULT_PROFILE_IMAGE = '/profile/default_avatar.svg';

// 백엔드 gender(MALE/FEMALE) → 화면 표시용 한글
const GENDER_LABEL = { MALE: '남성', FEMALE: '여성' };

export default function MyPage() {
  const { member, isGuest, logout } = useAuth();
  const navigate = useNavigate();

  // 스몰 메뉴(탭): 'profile' | 'books' | 'calendar'
  const [activeTab, setActiveTab] = useState('profile');
  const [loggingOut, setLoggingOut] = useState(false);

  // 독서 리스트/캘린더에서 도서 클릭 시 상세 팝업 오픈
  const [selectedBook, setSelectedBook] = useState(null);

  const handleLogout = useCallback(async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logout();
    } catch {
      // ignore
    } finally {
      navigate('/login');
    }
  }, [loggingOut, logout, navigate]);

  // member는 로그인 시점에 GET /users/me 응답으로 채워짐 (AuthProvider)
  const profileImage = member?.profileImageUrl || member?.profile_image_url || DEFAULT_PROFILE_IMAGE;
  const email = member?.email ?? '';
  const rawBirthDate = member?.birthDate || member?.birth_date;
  const birthDate = isGuest ? '2000년 1월 1일' : (rawBirthDate ?? '-');
  const nickname = member?.nickname ?? '';
  const gender = GENDER_LABEL[member?.gender] ?? (isGuest ? '-' : '선택 안 함');

  // ── 알림 설정 ──
  const [notifyRecommend, setNotifyRecommend] = useState(true);
  const [notifyEvent, setNotifyEvent] = useState(false);

  return (
    <section className="mypage-container">
      {/* ── 상단 헤더: 타이틀 & 사용자 요약 ── */}
      <div className="mypage-header">
        <div className="mypage-title-area">
          <h1 className="mypage-title">
            마이페이지 <span className="mypage-user-badge">{nickname || '독서가'}</span>
          </h1>
          <p className="mypage-subtitle">
            나의 독서 여정과 계정 설정을 관리하는 공간입니다.
          </p>
        </div>

        {/* ── 스몰 메뉴 (Tab Navigation) ── */}
        <nav className="mypage-tab-nav" aria-label="마이페이지 메뉴">
          <button
            type="button"
            className={`mypage-tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <span>👤</span> 내 정보
          </button>
          <button
            type="button"
            className={`mypage-tab-btn ${activeTab === 'books' ? 'active' : ''}`}
            onClick={() => setActiveTab('books')}
          >
            <span>📚</span> 독서 리스트
          </button>
          <button
            type="button"
            className={`mypage-tab-btn ${activeTab === 'calendar' ? 'active' : ''}`}
            onClick={() => setActiveTab('calendar')}
          >
            <span>📅</span> 독서 캘린더
          </button>
        </nav>
      </div>

      {/* ── 탭 1: 내 정보 (가로 3분할 카드 그리드) ── */}
      {activeTab === 'profile' && (
        <div className="mypage-profile-grid">
          {/* 1. 기본 정보 카드 */}
          <div className="mypage-profile-card">
            <h2 className="mypage-card-heading">👤 내 프로필</h2>
            <div className="mypage-avatar-wrap">
              <img
                className="mypage-avatar"
                src={profileImage}
                alt="프로필 사진"
                width={96}
                height={96}
                decoding="async"
              />
            </div>

            <dl className="mypage-info">
              <div className="mypage-info-row">
                <dt>닉네임</dt>
                <dd>{nickname || '-'}</dd>
              </div>
              <div className="mypage-info-row">
                <dt>생년월일</dt>
                <dd>{birthDate}</dd>
              </div>
              <div className="mypage-info-row">
                <dt>성별</dt>
                <dd>{gender}</dd>
              </div>
            </dl>
          </div>

          {/* 2. 계정 관리 카드 */}
          <div className="mypage-profile-card">
            <h2 className="mypage-card-heading">🔐 계정 관리</h2>
            <div className="mypage-fields-wrap">
              {/* 이메일 */}
              <div className="mypage-field mypage-field--row">
                <span className="mypage-field-label">이메일</span>
                <span className="mypage-field-value">{isGuest ? '게스트 체험 계정' : email}</span>
              </div>

              {/* 로그아웃 버튼 */}
              <div className="mypage-field mypage-field--row">
                <span className="mypage-field-label">로그아웃</span>
                <button
                  type="button"
                  className="mypage-logout-btn"
                  onClick={handleLogout}
                  disabled={loggingOut}
                >
                  {loggingOut ? '로그아웃 중...' : '로그아웃'}
                </button>
              </div>

              {isGuest ? (
                <div className="mypage-guest-notice">
                  🐾 <strong>체험 모드 이용 중</strong><br />
                  체험 모드에서는 정보 수정, 비밀번호 변경, 탈퇴 기능을 지원하지 않습니다.
                </div>
              ) : (
                <>
                  {/* 비밀번호 변경 (비활성화) */}
                  <div className="mypage-field mypage-field--row">
                    <span className="mypage-field-label">비밀번호</span>
                    <button
                      type="button"
                      className="mypage-small-btn"
                      disabled
                      title="비밀번호 변경이 비활성화되어 있습니다."
                    >
                      변경
                    </button>
                  </div>

                  {/* 계정 탈퇴 (비활성화) */}
                  <div className="mypage-field mypage-field--row">
                    <span className="mypage-field-label">계정 탈퇴</span>
                    <button
                      type="button"
                      className="mypage-withdraw-btn"
                      disabled
                      title="계정 탈퇴가 비활성화되어 있습니다."
                    >
                      탈퇴하기
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* 3. 알림 및 환경 설정 카드 */}
          <div className="mypage-profile-card">
            <h2 className="mypage-card-heading">🔔 알림 설정</h2>
            <div className="mypage-fields-wrap">
              <p className="mypage-hint">
                ℹ️ 현재 알림 서비스는 준비 중이며, 설정 값은 화면에 임시 적용됩니다.
              </p>

              <label className="mypage-toggle-row">
                <span>추천 알림</span>
                <input
                  type="checkbox"
                  checked={notifyRecommend}
                  onChange={(e) => setNotifyRecommend(e.target.checked)}
                />
              </label>
              <label className="mypage-toggle-row">
                <span>이벤트·공지 알림</span>
                <input
                  type="checkbox"
                  checked={notifyEvent}
                  onChange={(e) => setNotifyEvent(e.target.checked)}
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* ── 탭 2: 독서 리스트 ── */}
      {activeTab === 'books' && (
        <MyPageReadingList onSelectBook={(book) => setSelectedBook(book)} />
      )}

      {/* ── 탭 3: 독서 캘린더 ── */}
      {activeTab === 'calendar' && (
        <MyPageReadingCalendar onSelectBook={(book) => setSelectedBook(book)} />
      )}

      {/* ── 도서 상세 모달 ── */}
      {selectedBook && (
        <BookDetail
          book={selectedBook}
          onClose={() => setSelectedBook(null)}
        />
      )}
    </section>
  );
}
