/**
 * 한국형 사회정서교육 프레임워크 접근 헬퍼 (브라우저·서버 공용)
 * 원천: src/data/selFramework.json (교육부 4영역·6핵심역량 + 6차시 색인 + 아침조회 주제 + OECD SSES 근거)
 */
import fw from '../data/selFramework.json' with { type: 'json' };

export const FRAMEWORK = fw;

/** key → { key, name, domainKey, domainName, elements } */
export const COMPETENCIES = (() => {
  const map = {};
  fw.domains.forEach(d => d.competencies.forEach(c => { map[c.key] = { ...c, domainKey: d.key, domainName: d.name }; }));
  return map;
})();

export const COMPETENCY_ORDER = Object.keys(COMPETENCIES);

/** 짧은 표시명 (UI 칩용) */
export const shortName = (key) => ({
  selfAwareness: '자기인식', selfManagement: '자기관리', relationshipAwareness: '관계인식',
  relationshipManagement: '관계관리', communityValues: '공동체 가치', mentalHealthAwareness: '정신건강 인식·관리',
}[key] || COMPETENCIES[key]?.name || key);

/** 신호 유형 목록 → 초점 역량 키 배열 (중복 제거, 순서 유지) */
export const focusForSignals = (signalTypes = []) => {
  const out = [];
  signalTypes.forEach(t => (fw.signalMapping[t] || []).forEach(k => { if (!out.includes(k)) out.push(k); }));
  return out;
};

/** 학교급 + 역량 키 → 해당 차시 목록 */
export const sessionsFor = (level, competencyKeys = []) => {
  const list = fw.programIndex[level] || fw.programIndex.elementary_high;
  if (!competencyKeys.length) return list;
  return list.filter(s => s.competencies.some(k => competencyKeys.includes(k)));
};

const LEVEL_TO_LABEL = { elementary_low: '초(저)', elementary_high: '초(고)', middle: '중', high: '고' };
const COMPETENCY_TO_TOPIC_AREAS = {
  selfAwareness: ['자기 이해', '감정과 행동'],
  selfManagement: ['감정과 행동', '성장 목표', '긍정적 사고'],
  relationshipAwareness: ['타인 이해', '소통과 협력'],
  relationshipManagement: ['소통과 협력', '관계'],
  communityValues: ['관계', '소통과 협력', '가치 추구'],
  mentalHealthAwareness: ['건강과 웰빙', '긍정적 사고'],
};

/** 학교급 + 역량 키 → 아침조회 대화 주제 (교육부 2026 콘텐츠) */
export const topicsFor = (level, competencyKeys = [], limit = 6) => {
  const lv = LEVEL_TO_LABEL[level] || '초(고)';
  const areas = new Set();
  competencyKeys.forEach(k => (COMPETENCY_TO_TOPIC_AREAS[k] || []).forEach(a => areas.add(a)));
  const items = fw.morningTalkTopics.items.filter(t => t.level === lv && (areas.size === 0 || areas.has(t.area)));
  return items.slice(0, limit).map(t => `${t.area} · ${t.topic}`);
};

/** 프롬프트용 6역량 요약 텍스트 */
export const competencyGuideText = () =>
  fw.domains.map(d =>
    `[${d.name}] ` + d.competencies.map(c => `${c.name}: ${c.elements.join(', ')}`).join(' / ')
  ).join('\n');
