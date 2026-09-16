/**
 * 독서 토론 클럽 AI 토론자(Debate Persona) 레지스트리.
 * 백엔드(backend-ai-agent/app/domain/personas/)와 1:1 매핑되는 4인의 전문 토론 파트너입니다.
 */

export const DEBATE_PERSONAS = [
  {
    id: 'DEBATE_CRITIC',
    name: '평론가',
    title: '미학적 평론가',
    tag: '이동진 오마주',
    icon: '🎬',
    oneLiner: '작품의 미학적 구조와 복선, 메타포를 다각도로 분석하고 별점과 화두를 제시합니다.',
    tone: '정교한 평론가 어조, 섬세한 텍스트 분석, 별점 및 화두',
    themeColor: '#e11d48',
  },
  {
    id: 'DEBATE_STORYTELLER',
    name: '이야기꾼',
    title: '극적 서사 분석가',
    tag: '설민석 오마주',
    icon: '🏛️',
    oneLiner: '시대적 배경과 역사적 맥락을 소환하여 피 끓는 몰입감과 시대적 교훈을 던집니다.',
    tone: '열정적인 하이텐션 어조, 생생한 서사 전개와 교훈',
    themeColor: '#d97706',
  },
  {
    id: 'DEBATE_COUNSELOR',
    name: '상담사',
    title: '마음 돌봄 멘토',
    tag: '오은영 오마주',
    icon: '🌱',
    oneLiner: '인물의 심리 메커니즘과 상처, 관계의 본질을 파고들며 독자의 마음을 보듬습니다.',
    tone: '따뜻하고 예리한 심리 분석, 내면 치유와 마음 돌봄 질문',
    themeColor: '#059669',
  },
  {
    id: 'DEBATE_OBSERVER',
    name: '관찰가',
    title: '행동 시그널 분석가',
    tag: '강형욱 오마주',
    icon: '🔍',
    oneLiner: '인물의 본능과 환경의 상호작용, 무의식적 행동 시그널을 직관적으로 직시합니다.',
    tone: '냉철하고 직관적인 행동 분석, 환경 결핍과 현실 시그널',
    themeColor: '#2563eb',
  },
];

export function getDebatePersona(id) {
  return DEBATE_PERSONAS.find((p) => p.id === id) || DEBATE_PERSONAS[0];
}
