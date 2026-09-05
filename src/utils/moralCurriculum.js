/**
 * 2022 개정 도덕과 교육과정 헬퍼 (브라우저·서버 공용) — 3차 로직(교과 근거층)
 * 원천: src/data/moralCurriculum.json (교육부 고시 제2022-33호 [별책 6])
 * 역할: 센셀의 활동(긍정 추인법·기분 체크인·갈등 처리·자리 배치·가정 연계·위기 알림)이
 *       어느 도덕과 성취기준을 구현하는지 코드로 밝힌다.
 */
import moral from '../data/moralCurriculum.json' with { type: 'json' };

export const MORAL = moral;

/** selLevel(+학년) → 도덕과 학년군 키. 초1~2는 도덕 교과가 없어 3~4학년군을 '다음 학년군 연계'로 쓴다 */
export const moralLevelOf = (selLevel, gradeYear) => {
  const n = Number(gradeYear) || 0;
  if (selLevel === 'middle') return 'middle';
  if (selLevel === 'high') return 'high';
  if (n >= 5) return 'elementary56';
  if (n >= 1 && n <= 4) return 'elementary34';
  return selLevel === 'elementary_low' ? 'elementary34' : 'elementary56';
};
export const moralLevelLabel = (lv) => ({ elementary34: '초등 3~4학년군', elementary56: '초등 5~6학년군', middle: '중학교', high: '고등학교 선택과목' }[lv] || lv);
export const isNextBandNote = (selLevel, gradeYear) => selLevel === 'elementary_low' && (Number(gradeYear) || 0) <= 2;

const INDEX = {};
Object.values(moral.standards).forEach(list => list.forEach(s => { INDEX[s.code] = s; }));
export const moralByCode = (code) => INDEX[code] || null;

/** 활동 키 → 해당 학년군의 성취기준 목록 */
export const codesForActivity = (activityKey, level) => {
  const act = moral.senselMapping.activities.find(a => a.key === activityKey);
  return act ? (act.codes[level] || []).map(c => INDEX[c]).filter(Boolean) : [];
};
export const activityOf = (key) => moral.senselMapping.activities.find(a => a.key === key) || null;

/** 신호 유형 목록 → 활동 키(중복 제거) */
export const activitiesForSignals = (signalTypes = []) => {
  const out = [];
  signalTypes.forEach(t => { const a = moral.senselMapping.signalToActivity[t]; if (a && !out.includes(a)) out.push(a); });
  return out;
};

/** 신호 → 학년군 성취기준 (중복 제거) */
export const standardsForSignals = (signalTypes = [], level, limit = 6) => {
  const acts = activitiesForSignals(signalTypes);
  const seen = new Set(); const out = [];
  acts.forEach(k => codesForActivity(k, level).forEach(s => { if (!seen.has(s.code)) { seen.add(s.code); out.push(s); } }));
  return out.slice(0, limit);
};

/** 교육부 SEL 역량 키 → 도덕과 영역명 */
export const moralAreasForCompetencies = (keys = []) => {
  const out = [];
  keys.forEach(k => (moral.selCrosswalk[k] || []).forEach(a => { if (!out.includes(a)) out.push(a); }));
  return out;
};

/** 영역명 → 해당 학년군 성취기준 */
export const standardsForAreas = (areas = [], level) => {
  const list = moral.standards[level] || [];
  if (level === 'high') return list.filter(s => ['타인과 관계 맺기', '성찰 대상으로서 나', '다양성과 포용성', '민주시민과 윤리', '평화와 공존의 윤리'].includes(s.area));
  return list.filter(s => !areas.length || areas.includes(s.area));
};

/** 프롬프트용 텍스트 */
export const moralGuideText = (level, signalTypes = [], competencyKeys = []) => {
  const bySignal = standardsForSignals(signalTypes, level, 6);
  const areas = moralAreasForCompetencies(competencyKeys);
  const byArea = standardsForAreas(areas, level).filter(s => !bySignal.find(x => x.code === s.code)).slice(0, 4);
  const fmt = (s) => `[${s.code}] (${s.area}) ${s.text}${s.note ? ` — 취지: ${s.note.slice(0, 120)}` : ''}`;
  const ideas = moral.areas.filter(a => areas.includes(a.name)).map(a => `- ${a.name}(핵심 가치 ${a.coreValue}): ${a.coreIdeas.join(' / ')}`).join('\n');
  return `[2022 개정 도덕과 교육과정 — ${moralLevelLabel(level)} 성취기준 (교과 근거로 인용할 것)]\n${[...bySignal, ...byArea].map(fmt).join('\n') || '(해당 없음)'}\n\n[도덕과 핵심 아이디어]\n${ideas || '-'}`;
};
