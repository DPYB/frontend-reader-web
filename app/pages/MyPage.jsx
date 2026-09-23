import { useState } from 'react';
import { useAuth } from '../store/authStore';
import './MyPage.css';

// 회원이 프로필 사진을 올리지 않았을 때 쓰는 기본 아바타 (깔끔한 기본 실루엣)
const DEFAULT_PROFILE_IMAGE = '/profile/default_avatar.svg';

// 백엔드 gender(MALE/FEMALE) → 화면 표시용 한글
const GENDER_LABEL = { MALE: '남성', FEMALE: '여성' };

export default function MyPage() {
  const { member, isGuest } = useAuth();

  // member는 로그인 시점에 GET /users/me 응답으로 채워짐 (AuthProvider)
  // 백엔드 응답이 camelCase(birthDate) 또는 snake_case(birth_date) 양쪽 모두 지원되도록 처리
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
    <section className="mypage">
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
              {/* 비밀번호 변경 (비활성화) */}
              <div className="mypage-field">
                <div className="mypage-field-display">
                  <span className="mypage-field-label">비밀번호</span>
                  <button
                    type="button"
                    className="mypage-nickname-edit-btn"
                    disabled
                    title="비밀번호 변경이 비활성화되어 있습니다."
                  >
                    변경
                  </button>
                </div>
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
    </section>
  );
}
