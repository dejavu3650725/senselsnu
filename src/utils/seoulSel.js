/**
 * 서울 사회정서교육 2차 로직 헬퍼 (브라우저·서버 공용)
 * 원천: src/data/seoulSel.json — 서울특별시교육청 사회정서교육자료(초1~고3, 12권)에서 추출한
 *   학년별 성취기준([N사회정서AA-BB]) · 영역별 사회정서기술 · 학년별 차시 색인(학습 주제·학습 목표)
 * 교육부 프레임워크(selFramework.json)가 1차 뼈대이고, 이 파일은 그 위에 "우리 학년에서 실제로 가르치는 것"을 얹는다.
 */
import seoul from '../data/seoulSel.json' with { type: 'json' };

export const SEOUL = seoul;

/** 학교급(selLevel) + 학년(gradeYear) → 서울 자료 학년 라벨(초1…고3) */
export const seoulGradeLabel = (selLevel, gradeYear) => {
  const n = Number(gradeYear) || 0;
  if (selLevel === 'middle') return `중${n >= 1 && n <= 3 ? n : 1}`;
  if (selLevel === 'high') return `고${n >= 1 && n <= 3 ? n : 1}`;
  if (n >= 1 && n <= 6) return `초${n}`;
  return selLevel === 'elementary_low' ? '초2' : '초5';
};

export const seoulLevelOf = (gradeLabel = '') => ({ '초': 'elementary', '중': 'middle', '고': 'high' }[gradeLabel[0]] || 'elementary');

/** 교육부 역량 키 → 서울 영역명 */
const KEY_TO_AREA = {};
seoul.areas.forEach(a => a.competencies.forEach(k => { KEY_TO_AREA[k] = a.name; }));
export const areasForCompetencies = (keys = []) => {
  const out = [];
  keys.forEach(k => { const a = KEY_TO_AREA[k]; if (a && !out.includes(a)) out.push(a); });
  return out;
};

/** 신호 유형 → 서울 영역 */
export const areasForSignals = (signalTypes = []) => {
  const out = [];
  signalTypes.forEach(t => (seoul.signalToArea[t] || []).forEach(a => { if (!out.includes(a)) out.push(a); }));
  return out;
};

/** 학년 라벨 + 영역들 → 해당 학년의 성취기준 목록 */
export const standardsFor = (gradeLabel, areas = []) => {
  const level = seoulLevelOf(gradeLabel);
  const list = seoul.standards[level] || [];
  const gradeNum = Number(gradeLabel.slice(1));
  return list.filter(s => (level !== 'elementary' || s.grade === gradeNum) && (!areas.length || areas.includes(s.area)));
};

/** 학년 라벨 + 영역들 → 차시 목록 (학습 주제·목표·성취기준) */
export const lessonsFor = (gradeLabel, areas = [], limit = 6) => {
  const list = seoul.lessons[gradeLabel] || [];
  const filtered = list.filter(l => !areas.length || areas.includes(l.area));
  return filtered.slice(0, limit);
};

export const standardByCode = (code) => {
  for (const lv of Object.keys(seoul.standards)) {
    const hit = seoul.standards[lv].find(s => s.code === code);
    if (hit) return hit;
  }
  return null;
};

/** 프롬프트용 텍스트 — 학년 성취기준 + 차시 색인 */
export const seoulGuideText = (gradeLabel, areas = [], { maxStandards = 6, maxLessons = 6 } = {}) => {
  const st = standardsFor(gradeLabel, areas).slice(0, maxStandards);
  const ls = lessonsFor(gradeLabel, areas, maxLessons);
  const a = st.length ? st.map(s => `[${s.code}] (${s.area}) ${s.text}`).join('\n') : '(해당 없음)';
  const b = ls.length ? ls.map(l => `- ${l.seq ? l.seq + '차시 ' : ''}《${l.title}》 기술: ${l.skill || '-'} / 주제: ${l.lessonTopic || l.gradeTopic} / 목표: ${l.goal} / 근거: ${l.standards.join(', ')}`).join('\n') : '(해당 없음)';
  return `[서울 사회정서교육 ${gradeLabel} 성취기준]\n${a}\n\n[서울 사회정서교육자료 ${gradeLabel} 관련 차시]\n${b}`;
};

/** 서울 6역량 이름 (교육부 키 기준) */
export const seoulCompetencyName = (key) => (seoul.competencies.find(c => c.key === key) || {}).seoulName || key;
