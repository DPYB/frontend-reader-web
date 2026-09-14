# PLAN (미완료 계획)

완료된 항목은 여기 체크만 남기지 않고 `STATE.md`로 옮긴 뒤 이 문서에서 제거한다.

## 초기 안정화 및 브랜치 보호
- [ ] DPYB 브랜치 보호 규칙(Branch Protection) 적용 확인 및 main 브랜치 정렬

## 다음 마일스톤: 점진적 TypeScript 전환
- [ ] API 인터페이스 및 도메인 데이터 모델 타입 정의 (`app/types/`)
- [ ] 백엔드 연동 클라이언트(`.js` ➔ `.ts`) 마이그레이션 (`app/api/`)
- [ ] 전역 Context Provider 및 Store(`.jsx` ➔ `.tsx`) 마이그레이션
