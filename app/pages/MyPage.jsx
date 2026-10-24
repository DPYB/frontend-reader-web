import { useState, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../store/authStore';
import { useBooks } from '../store/booksStore';
import MyPageReadingList from '../features/mypage/MyPageReadingList';
import MyPageReadingCalendar from '../features/mypage/MyPageReadingCalendar';
import BookDetail from '../features/room/BookDetail';
import { useLanguage } from '../store/languageStore';
import { cropAndCompressAvatar } from '../utils/imageCompressor';
import { getProfileImagePresignedUrl, uploadImageToPresignedUrl, updateMe } from '../api/authApi';
import { showGlobalToast } from '../components/toastContext';
import './MyPage.css';

// 회원이 프로필 사진을 올리지 않았을 때 쓰는 기본 아바타 (깔끔한 기본 실루엣)
const DEFAULT_PROFILE_IMAGE = '/profile/default_avatar.svg';

// 백엔드 gender(MALE/FEMALE) → 화면 표시용 한글
const GENDER_LABEL = { MALE: '남성', FEMALE: '여성' };

export default function MyPage() {
  const { t, isEn } = useLanguage();
  const { member, isGuest, logout, setMember } = useAuth();
  const { books } = useBooks();
  const location = useLocation();

  const fileInputRef = useRef(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [previewAvatarUrl, setPreviewAvatarUrl] = useState(null);

  // 스몰 메뉴(탭): 'books' | 'calendar' | 'profile'
  const [selectedTab, setSelectedTab] = useState(null);
  const activeTab = selectedTab || location.state?.tab || 'books';
  const setActiveTab = setSelectedTab;
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
      // 메모리 및 Context 상태의 완전한 클린 리셋을 위해 전체 리로드 전환
      window.location.href = '/login';
    }
  }, [loggingOut, logout]);

  // member는 로그인 시점에 GET /users/me 응답으로 채워짐 (AuthProvider)
  const profileImage = previewAvatarUrl || member?.profileImageUrl || member?.profile_image_url || DEFAULT_PROFILE_IMAGE;
  const email = member?.email ?? '';
  const rawBirthDate = member?.birthDate || member?.birth_date;
  const birthDate = isGuest ? '2000년 1월 1일' : (rawBirthDate ?? '-');
  const nickname = member?.nickname ?? '';
  const gender = GENDER_LABEL[member?.gender] ?? (isGuest ? '-' : '선택 안 함');

  // 프로필 아바타 클릭 -> 파일 선택창 열기
  const handleAvatarClick = useCallback(() => {
    if (uploadingAvatar) return;
    fileInputRef.current?.click();
  }, [uploadingAvatar]);

  // 프로필 이미지 선택 및 R2 Presigned URL 업로드 처리
  const handleAvatarFileChange = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showGlobalToast(isEn ? 'Please select a valid image file.' : '이미지 파일만 선택할 수 있습니다.', 'error');
      e.target.value = '';
      return;
    }

    // 10MB 크기 제한
    if (file.size > 10 * 1024 * 1024) {
      showGlobalToast(t('mypage.avatarSizeError', '이미지 파일 크기는 10MB 이하여야 합니다.'), 'error');
      e.target.value = '';
      return;
    }

    setUploadingAvatar(true);
    let previewUrl = null;

    try {
      // 1:1 정방형 중앙 크롭 & 512x512 고품질 WebP로 압축
      const compressed = await cropAndCompressAvatar(file, { targetSize: 512, quality: 0.88 });
      previewUrl = compressed.previewUrl;
      setPreviewAvatarUrl(previewUrl);

      // 게스트 모드일 경우: 로컬 브라우저 상태만 임시 반영
      if (isGuest) {
        setMember((prev) => ({
          ...prev,
          profile_image_url: previewUrl,
          profileImageUrl: previewUrl,
        }));
        showGlobalToast(t('mypage.avatarGuestNotice', '체험 손님 모드에서는 브라우저 미리보기로만 임시 반영됩니다.'), 'info');
        return;
      }

      // 정회원 모드: 백엔드 Presigned URL 발급 -> R2 직접 PUT 전송 -> 회원 프로필 갱신
      try {
        const { presignedUrl, imageUrl } = await getProfileImagePresignedUrl({ contentType: 'image/webp' });
        await uploadImageToPresignedUrl(presignedUrl, compressed.blob, 'image/webp');
        await updateMe({ profile_image_url: imageUrl });

        setMember((prev) => ({
          ...prev,
          profile_image_url: imageUrl,
          profileImageUrl: imageUrl,
        }));
        showGlobalToast(t('mypage.avatarSuccess', '프로필 사진이 변경되었습니다.'), 'success');
      } catch (uploadErr) {
        // 백엔드 엔드포인트 미배포(404/500 등) 시 로컬 프리뷰를 유지하고 안내 메시지 제공
        console.warn('Presigned upload failed, keeping local preview fallback:', uploadErr);
        setMember((prev) => ({
          ...prev,
          profile_image_url: previewUrl,
          profileImageUrl: previewUrl,
        }));
        showGlobalToast(
          isEn ? 'Profile photo changed (local preview). Backend upload endpoint is in preparation.' : '프로필 사진이 임시 적용되었습니다. (백엔드 업로드 연동 준비 중)',
          'warning'
        );
      }
    } catch (compressErr) {
      console.error('Image compression failed:', compressErr);
      showGlobalToast(t('mypage.avatarFailed', '프로필 사진 업로드에 실패했습니다.'), 'error');
    } finally {
      setUploadingAvatar(false);
      e.target.value = '';
    }
  }, [isGuest, isEn, t, setMember]);

  // ── 알림 설정 ──
  const [notifyRecommend, setNotifyRecommend] = useState(true);
  const [notifyEvent, setNotifyEvent] = useState(false);

  return (
    <section className="mypage-container">
      {/* ── 상단 헤더: 타이틀 & 사용자 요약 ── */}
      <div className="mypage-header">
        <div className="mypage-title-area">
          <h1 className="mypage-title">
            {t('mypage.title', '마이페이지')} <span className="mypage-user-badge">{nickname || t('mypage.reader', '독서가')}</span>
          </h1>
          <p className="mypage-subtitle">
            {t('mypage.subtitle', '나의 독서 여정과 계정 설정을 관리하는 공간입니다.')}
          </p>
        </div>

        {/* ── 스몰 메뉴 (Tab Navigation: 독서 리스트 -> 독서 캘린더 -> 내 정보) ── */}
        <nav className="mypage-tab-nav" aria-label={t('mypage.title', '마이페이지 메뉴')}>
          <button
            type="button"
            className={`mypage-tab-btn ${activeTab === 'books' ? 'active' : ''}`}
            onClick={() => setActiveTab('books')}
          >
            <span>📚</span> {t('mypage.tabBooks', '독서 리스트')}
          </button>
          <button
            type="button"
            className={`mypage-tab-btn ${activeTab === 'calendar' ? 'active' : ''}`}
            onClick={() => setActiveTab('calendar')}
          >
            <span>📅</span> {t('mypage.tabCalendar', '독서 캘린더')}
          </button>
          <button
            type="button"
            className={`mypage-tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <span>👤</span> {t('mypage.tabProfile', '내 정보')}
          </button>
        </nav>
      </div>

      {/* ── 탭 1: 내 정보 (가로 3분할 카드 그리드) ── */}
      {activeTab === 'profile' && (
        <div className="mypage-profile-grid">
          {/* 1. 기본 정보 카드 */}
          <div className="mypage-profile-card">
            <h2 className="mypage-card-heading">{t('mypage.cardProfile', '👤 내 프로필')}</h2>
            <div className="mypage-avatar-wrap">
              <button
                type="button"
                className="mypage-avatar-btn"
                onClick={handleAvatarClick}
                disabled={uploadingAvatar}
                title={t('mypage.changeAvatar', '프로필 사진 변경')}
                aria-label={t('mypage.changeAvatar', '프로필 사진 변경')}
              >
                <img
                  className="mypage-avatar"
                  src={profileImage}
                  alt={nickname ? `${nickname}의 프로필 사진` : '프로필 사진'}
                  width={96}
                  height={96}
                  decoding="async"
                />
                <span className="mypage-avatar-overlay">
                  <span className="mypage-avatar-overlay-icon" aria-hidden="true">📷</span>
                  <span className="mypage-avatar-overlay-text">{t('mypage.changeAvatarShort', '변경')}</span>
                </span>
                {uploadingAvatar && (
                  <span className="mypage-avatar-spinner-wrap" aria-live="polite">
                    <span className="mypage-avatar-spinner" />
                  </span>
                )}
                <span className="mypage-avatar-badge" aria-hidden="true">📷</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
                className="mypage-avatar-input"
                onChange={handleAvatarFileChange}
                tabIndex={-1}
                aria-hidden="true"
              />
            </div>

            <dl className="mypage-info">
              <div className="mypage-info-row">
                <dt>{t('mypage.nickname', '닉네임')}</dt>
                <dd>{nickname || '-'}</dd>
              </div>
              <div className="mypage-info-row">
                <dt>{t('mypage.birthDate', '생년월일')}</dt>
                <dd>{birthDate}</dd>
              </div>
              <div className="mypage-info-row">
                <dt>{t('mypage.gender', '성별')}</dt>
                <dd>{isEn ? (member?.gender === 'MALE' ? 'Male' : member?.gender === 'FEMALE' ? 'Female' : 'Not specified') : gender}</dd>
              </div>
            </dl>
          </div>

          {/* 2. 계정 관리 카드 */}
          <div className="mypage-profile-card">
            <h2 className="mypage-card-heading">{t('mypage.cardAccount', '⚙️ 계정 정보')}</h2>
            <div className="mypage-fields-wrap">
              {/* 이메일 */}
              <div className="mypage-field mypage-field--row">
                <span className="mypage-field-label">{t('mypage.email', '이메일')}</span>
                <span className="mypage-field-value">{isGuest ? (isEn ? 'Guest demo account' : '게스트 체험 계정') : email}</span>
              </div>

              {/* 로그아웃 버튼 */}
              <div className="mypage-field mypage-field--row">
                <span className="mypage-field-label">{t('gnb.logout', '로그아웃')}</span>
                <button
                  type="button"
                  className="mypage-logout-btn"
                  onClick={handleLogout}
                  disabled={loggingOut}
                >
                  {loggingOut ? (isEn ? 'Logging out...' : '로그아웃 중...') : t('gnb.logout', '로그아웃')}
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
      {selectedBook && (() => {
        const bookIndex = books.findIndex(
          (b) =>
            b.bookId === selectedBook.bookId ||
            b.id === selectedBook.id ||
            String(b.bookId) === String(selectedBook.bookId) ||
            b.title === selectedBook.title
        );
        const hasPrev = bookIndex > 0;
        const hasNext = bookIndex >= 0 && bookIndex < books.length - 1;
        return (
          <BookDetail
            key={selectedBook.bookId || selectedBook.id || selectedBook.title}
            book={selectedBook}
            currentIndex={bookIndex >= 0 ? bookIndex : 0}
            totalBooks={books.length}
            hasPrev={hasPrev}
            hasNext={hasNext}
            onPrevBook={hasPrev ? () => setSelectedBook(books[bookIndex - 1]) : undefined}
            onNextBook={hasNext ? () => setSelectedBook(books[bookIndex + 1]) : undefined}
            prevBookTitle={hasPrev ? books[bookIndex - 1]?.title : null}
            nextBookTitle={hasNext ? books[bookIndex + 1]?.title : null}
            onClose={() => setSelectedBook(null)}
          />
        );
      })()}
    </section>
  );
}
