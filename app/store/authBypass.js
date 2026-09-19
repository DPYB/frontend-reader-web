/**
 * 개발용 인증 우회 스위치.
 *
 * 백엔드(backend-auth)가 아직 로컬에 붙지 않은 개발 단계에서 로그인 화면에 막혀
 * 서재/등록/마이페이지 화면을 볼 수 없는 문제를 피하기 위한 임시 장치다.
 * 우회가 켜지면 로그인 버튼은 입력값을 검증하지 않고 즉시 통과하며,
 * 실제 `POST /auth/login` 요청도 보내지 않는다.
 *
 * 판정 규칙 (VITE_AUTH_BYPASS):
 *  - 'true'  → 항상 우회 (프로덕션 빌드에서도 켜지므로 주의)
 *  - 'false' → 항상 실제 로그인 (로컬에서 인증 연동을 검증할 때)
 *  - 미설정  → `vite dev`에서만 우회, 프로덕션 빌드는 실제 로그인
 *
 * 인증 연동이 끝나면 이 모듈과 참조하는 분기(AuthProvider, LoginPage)를 제거한다.
 */

const FLAG = import.meta.env.VITE_AUTH_BYPASS;

function resolveBypass() {
  if (FLAG === 'true') return true;
  if (FLAG === 'false') return false;
  return Boolean(import.meta.env.DEV);
}

export const AUTH_BYPASS = resolveBypass();

/**
 * 우회 로그인 시 사용하는 가짜 회원 정보.
 * 실제 `GET /users/me` 응답과 같은 필드명을 써서 화면(마이페이지 등)이 그대로 동작한다.
 */
export const BYPASS_MEMBER = {
  member_id: 'dev-bypass-member',
  email: 'dev@dpyb.local',
  nickname: '개발중인 집사',
  birth_date: '2000-01-01',
  gender: 'FEMALE',
  profile_image_url: '/profile/chris.png',
};

