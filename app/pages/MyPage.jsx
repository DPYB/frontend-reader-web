import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { changePassword, deleteMe, logout, updateMe, ApiError } from '../api/authApi';
import { useAuth } from '../store/authStore';
import ImageCropModal from '../components/ImageCropModal';
import './MyPage.css';

// 회원이 프로필 사진을 올리지 않았을 때 쓰는 기본 아바타 (깔끔한 기본 실루엣)
const DEFAULT_PROFILE_IMAGE = '/profile/default_avatar.svg';

// 백엔드 gender(MALE/FEMALE) → 화면 표시용 한글
const GENDER_LABEL = { MALE: '남성', FEMALE: '여성' };
const GENDER_MAP = { 남성: 'MALE', 여성: 'FEMALE', '선택 안 함': null };

function maxBirthDateString() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yyyy = yesterday.getFullYear();
  const mm = String(yesterday.getMonth() + 1).padStart(2, '0');
  const dd = String(yesterday.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// 8자 이상, 영문 대/소문자·숫자·특수문자 포함
const PW_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

export default function MyPage() {
  const navigate = useNavigate();
  const { member, setMember, isGuest } = useAuth();

  // member는 로그인 시점에 GET /users/me 응답으로 채워짐 (AuthProvider)
  // 백엔드 응답이 camelCase(birthDate) 또는 snake_case(birth_date) 양쪽 모두 지원되도록 처리
  const profileImage = member?.profileImageUrl || member?.profile_image_url || DEFAULT_PROFILE_IMAGE;
  const email = member?.email ?? '';
  const rawBirthDate = member?.birthDate || member?.birth_date;
  const birthDate = rawBirthDate ?? (isGuest ? '체험 계정' : '-');
  const nickname = member?.nickname ?? '';
  const gender = GENDER_LABEL[member?.gender] ?? (isGuest ? '-' : '선택 안 함');

  // ── 프로필 사진 변경 ──
  const profileFileInputRef = useRef(null);
  const [cropImageFile, setCropImageFile] = useState(null);
  const [avatarLoading, setAvatarLoading] = useState(false);

  // ── 내 정보 수정 ──
  const [isEditingInfo, setIsEditingInfo] = useState(false);

  const [editNickname, setEditNickname] = useState('');
  const [editBirthDate, setEditBirthDate] = useState('');
  const [editGender, setEditGender] = useState('선택 안 함');
  const [infoLoading, setInfoLoading] = useState(false);
  const [infoError, setInfoError] = useState('');
  const [infoSuccess, setInfoSuccess] = useState(false);

  // ── 비밀번호 ──
  const [pwOpen, setPwOpen] = useState(false);
  const [curPw, setCurPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);

  // ── 알림 설정 ──
  const [notifyRecommend, setNotifyRecommend] = useState(true);
  const [notifyEvent, setNotifyEvent] = useState(false);

  // ── 계정 탈퇴 ──
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawLoading, setWithdrawLoading] = useState(false);

  // 비밀번호 변경 (로그인 상태)
  const handlePwSubmit = async (e) => {
    e.preventDefault();
    setPwSuccess(false);
    if (!curPw || !newPw || !confirmPw) {
      setPwError('모든 항목을 입력해 주세요.');
      return;
    }
    if (!PW_RE.test(newPw)) {
      setPwError('비밀번호는 8자 이상이며 영문 대/소문자, 숫자, 특수문자를 포함해야 합니다.');
      return;
    }
    if (newPw !== confirmPw) {
      setPwError('새 비밀번호가 일치하지 않습니다.');
      return;
    }
    if (newPw === curPw) {
      setPwError('현재 비밀번호와 다른 비밀번호를 사용해 주세요.');
      return;
    }
    setPwLoading(true);
    setPwError('');
    try {
      await changePassword({ currentPassword: curPw, newPassword: newPw });
      setPwSuccess(true);
      setCurPw('');
      setNewPw('');
      setConfirmPw('');
      setPwOpen(false);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          setPwError('현재 비밀번호가 올바르지 않습니다.');
        } else if (err.status === 400) {
          setPwError(err.message || '비밀번호 정책에 맞지 않습니다.');
        } else {
          setPwError('비밀번호 변경 중 오류가 발생했어요. 잠시 후 다시 시도해 주세요.');
        }
      } else {
        setPwError('서버에 연결할 수 없어요. 잠시 후 다시 시도해 주세요.');
      }
    } finally {
      setPwLoading(false);
    }
  };

  // 프로필 사진 파일 선택 시 크롭 모달 열기
  const handleProfileFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setCropImageFile(file);
    }
    // 재선택 가능하게 input 초기화
    e.target.value = '';
  };

  // 1:1 크롭 완료 시 백엔드 PATCH /users/me 호출
  const handleProfileCropComplete = async (croppedBlob, croppedDataUrl) => {
    setCropImageFile(null);
    if (isGuest) {
      // 게스트 모드일 때는 세션 내 즉각 반영
      setMember((prev) => ({ ...prev, profile_image_url: croppedDataUrl }));
      setInfoSuccess(true);
      return;
    }

    setAvatarLoading(true);
    setInfoError('');
    try {
      // Data URL을 profile_image_url로 전송
      const updated = await updateMe({ profile_image_url: croppedDataUrl });
      if (updated) {
        setMember(updated);
      } else {
        setMember((prev) => ({ ...prev, profile_image_url: croppedDataUrl }));
      }
      setInfoSuccess(true);
    } catch (err) {
      if (err instanceof ApiError) {
        setInfoError(err.message || '프로필 사진 변경 실패');
      } else {
        setInfoError('프로필 사진 저장 중 오류가 발생했습니다.');
      }
    } finally {
      setAvatarLoading(false);
    }
  };

  // 내 정보 수정 시작
  const handleStartEdit = () => {

    setEditNickname(member?.nickname ?? '');
    setEditBirthDate(member?.birthDate || member?.birth_date || '');
    const currentGender = member?.gender === 'MALE' ? '남성' : member?.gender === 'FEMALE' ? '여성' : '선택 안 함';
    setEditGender(currentGender);
    setInfoError('');
    setInfoSuccess(false);
    setIsEditingInfo(true);
  };

  const handleCancelEdit = () => {
    setIsEditingInfo(false);
    setInfoError('');
  };

  const handleSaveInfo = async (e) => {
    e.preventDefault();
    if (infoLoading) return;
    if (!editNickname.trim()) {
      setInfoError('닉네임을 입력해 주세요.');
      return;
    }
    setInfoLoading(true);
    setInfoError('');
    setInfoSuccess(false);

    try {
      const payload = {
        nickname: editNickname.trim(),
        birth_date: editBirthDate ? editBirthDate : null,
        gender: GENDER_MAP[editGender] ?? null,
      };
      const updated = await updateMe(payload);
      if (updated) {
        setMember(updated);
      }
      setInfoSuccess(true);
      setIsEditingInfo(false);
    } catch (err) {
      if (err instanceof ApiError) {
        setInfoError(err.message || '회원정보 수정 중 오류가 발생했습니다.');
      } else {
        setInfoError('서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.');
      }
    } finally {
      setInfoLoading(false);
    }
  };

  // 계정 탈퇴: DELETE /users/me 후 쿠키 정리를 위해 logout 호출 → 로그인 화면
  const handleWithdraw = async () => {
    if (withdrawLoading) return;
    setWithdrawLoading(true);
    try {
      await deleteMe();
      await logout(); // refresh_token/refresh_sub 쿠키 정리 + 메모리 토큰 제거
      navigate('/login');
    } catch {
      // 탈퇴 실패 시에도 안전하게 로그아웃 처리 후 로그인 화면으로
      try { await logout(); } catch { /* 무시 */ }
      navigate('/login');
    } finally {
      setWithdrawLoading(false);
      setWithdrawOpen(false);
    }
  };

  return (
    <section className="mypage">
      {/*
       * 예전엔 왼쪽 메뉴(내 정보/계정 관리/알림 설정)로 탭을 전환해 한 번에 한
       * 섹션만 보였는데, 내용을 잘게 숨겨두지 말고 한 페이지에서 스크롤로 전부
       * 보이도록 세 섹션을 세로로 나열한다(사용자 요청, 2026-09).
       */}
      <div className="mypage-layout">
        <h2 className="mypage-section-heading">내 정보</h2>
        {/* 내 정보 */}
        <div className="mypage-card">
          <div className="mypage-avatar-wrap">
            <img
              className="mypage-avatar"
              src={profileImage}
              alt="프로필 사진"
              width={97}
              height={102}
              decoding="async"
            />
            <input
              ref={profileFileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleProfileFileChange}
            />
            <button
              type="button"
              className="mypage-avatar-edit-btn"
              onClick={() => profileFileInputRef.current?.click()}
              disabled={avatarLoading}
              title="프로필 사진 변경"
              aria-label="프로필 사진 변경"
            >
              📷
            </button>
          </div>


          {infoSuccess && <p className="mypage-success">회원 정보가 수정되었습니다.</p>}

          {isEditingInfo ? (
            <form className="mypage-info-edit-form" onSubmit={handleSaveInfo}>
              <div className="mypage-info-edit-group">
                <label className="mypage-info-edit-label" htmlFor="mypage-nickname">닉네임</label>
                <input
                  id="mypage-nickname"
                  type="text"
                  className="mypage-text-input"
                  value={editNickname}
                  maxLength={50}
                  placeholder="닉네임 (2~50자)"
                  onChange={(e) => setEditNickname(e.target.value)}
                />
              </div>

              <div className="mypage-info-edit-group">
                <label className="mypage-info-edit-label" htmlFor="mypage-birthdate">생년월일</label>
                <input
                  id="mypage-birthdate"
                  type="date"
                  className="mypage-text-input"
                  value={editBirthDate}
                  max={maxBirthDateString()}
                  onChange={(e) => setEditBirthDate(e.target.value)}
                />
              </div>

              <div className="mypage-info-edit-group">
                <span className="mypage-info-edit-label">성별</span>
                <div className="mypage-gender-row">
                  {['남성', '여성', '선택 안 함'].map((opt) => (
                    <label key={opt} className="mypage-gender-option">
                      <input
                        type="radio"
                        name="mypage-gender"
                        value={opt}
                        checked={editGender === opt}
                        onChange={() => setEditGender(opt)}
                      />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>
              </div>

              {infoError && <p className="mypage-error">{infoError}</p>}

              <div className="mypage-btn-row mypage-btn-row--center">
                <button type="submit" className="mypage-btn mypage-btn--primary" disabled={infoLoading}>
                  {infoLoading ? '저장 중...' : '저장'}
                </button>
                <button type="button" className="mypage-btn mypage-btn--ghost" onClick={handleCancelEdit} disabled={infoLoading}>
                  취소
                </button>
              </div>
            </form>
          ) : (
            <>
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

              {!isGuest && (
                <div className="mypage-btn-row mypage-btn-row--center">
                  <button
                    type="button"
                    className="mypage-nickname-edit-btn"
                    onClick={handleStartEdit}
                  >
                    내 정보 수정
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* 계정 관리: 이메일/비밀번호 설정 + 탈퇴(마지막 줄) */}
        <h2 className="mypage-section-heading">계정 관리</h2>
        <div className="mypage-card mypage-card--section">
          {/* 이메일 (변경 불가 — 읽기 전용), 라벨과 값을 한 줄에 표시 */}
          <div className="mypage-field mypage-field--row">
            <span className="mypage-field-label">이메일</span>
            <span className="mypage-field-value">{isGuest ? '게스트 체험 계정' : email}</span>
          </div>

          {isGuest ? (
            <div style={{ padding: '16px 0', color: 'var(--text)', fontSize: 15, lineHeight: 1.6 }}>
              🐾 <strong>체험 모드 이용 중</strong><br />
              체험 모드에서는 회원정보 수정, 비밀번호 변경, 회원 탈퇴 기능을 지원하지 않습니다.
            </div>
          ) : (
            <>
              {/* 비밀번호 변경 */}
              <div className="mypage-field">
                <div className="mypage-field-display">
                  <span className="mypage-field-label">비밀번호</span>
                  <button
                    className="mypage-nickname-edit-btn"
                    onClick={() => { setPwOpen((v) => !v); setPwError(''); setPwSuccess(false); }}
                  >
                    {pwOpen ? '닫기' : '변경'}
                  </button>
                </div>

                {pwSuccess && <p className="mypage-success">비밀번호가 변경되었습니다.</p>}

                {pwOpen && (
                  <form className="mypage-field-edit" onSubmit={handlePwSubmit}>
                    <input
                      className="mypage-text-input"
                      type="password"
                      value={curPw}
                      onChange={(e) => setCurPw(e.target.value)}
                      placeholder="현재 비밀번호"
                      autoComplete="current-password"
                    />
                    <input
                      className="mypage-text-input"
                      type="password"
                      value={newPw}
                      onChange={(e) => setNewPw(e.target.value)}
                      placeholder="새 비밀번호"
                      autoComplete="new-password"
                    />
                    <input
                      className="mypage-text-input"
                      type="password"
                      value={confirmPw}
                      onChange={(e) => setConfirmPw(e.target.value)}
                      placeholder="새 비밀번호 확인"
                      autoComplete="new-password"
                    />
                    <p className="mypage-hint">
                      비밀번호는 8자 이상이며 영문 대/소문자, 숫자, 특수문자를 포함해야 합니다.
                    </p>
                    {pwError && <p className="mypage-error">{pwError}</p>}
                    <div className="mypage-btn-row">
                      <button type="submit" className="mypage-btn mypage-btn--primary" disabled={pwLoading}>
                        {pwLoading ? '변경 중...' : '변경하기'}
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* 계정 탈퇴 (마지막 줄, 버튼은 오른쪽) */}
              <div className="mypage-field mypage-field--row">
                <span className="mypage-field-label">계정 탈퇴</span>
                <button className="mypage-withdraw-btn" onClick={() => setWithdrawOpen(true)}>
                  탈퇴하기
                </button>
              </div>
            </>
          )}
        </div>

        {/* 알림 설정 */}
        <h2 className="mypage-section-heading">알림 설정</h2>
        <div className="mypage-card mypage-card--section">
          <p className="mypage-hint" style={{ color: 'var(--text-muted, #888)', marginBottom: 8 }}>
            ℹ️ 현재 알림 서비스(푸시/이메일 발송)는 준비 중이며, 설정 값은 로컬 화면에만 임시 적용됩니다.
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

      {/* 탈퇴 확인 모달 */}
      {withdrawOpen && (
        <div className="mypage-modal-overlay" onClick={() => setWithdrawOpen(false)}>
          <div className="mypage-modal" onClick={(e) => e.stopPropagation()}>
            <p className="mypage-modal-title">정말 탈퇴하시겠습니까?</p>
            <p className="mypage-modal-desc">
              탈퇴 시 모든 서재·문장 기록이 삭제되며 복구할 수 없습니다.
            </p>
            <div className="mypage-btn-row mypage-btn-row--center">
              <button className="mypage-btn mypage-btn--danger" onClick={handleWithdraw} disabled={withdrawLoading}>
                {withdrawLoading ? '처리 중...' : '탈퇴'}
              </button>
              <button className="mypage-btn mypage-btn--ghost" onClick={() => setWithdrawOpen(false)} disabled={withdrawLoading}>취소</button>
            </div>
          </div>
        </div>
      )}

      {/* 프로필 사진 1:1 크롭 모달 */}
      {cropImageFile && (
        <ImageCropModal
          imageSource={cropImageFile}
          title="프로필 사진 맞추기"
          aspectMode="square"
          onCropComplete={handleProfileCropComplete}
          onClose={() => setCropImageFile(null)}
        />
      )}
    </section>
  );
}
