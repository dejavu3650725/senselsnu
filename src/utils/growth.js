/**
 * 학생 성장 기록 · 또래 친절 미션 · 가정 회신 로직
 * - 학생이 자기 화면에서 "이번 달 연습한 사회정서기술"(서울 자료의 기술 이름 그대로)과 배지를 본다.
 * - 매주 미션 하나(기술 이름과 연결) → "했어요" 한 번 → 교사·학급 리포트에 집계된다.
 * - 가정 리포트는 학급 단위 집계만 담고, 학생 개인 정보는 담지 않는다.
 */
import { SEOUL, seoulLevelOf } from './seoulSel.js';

export const dayKey = (d = new Date()) => d.toISOString().slice(0, 10);
export const monthKey = (d = new Date()) => d.toISOString().slice(0, 7);
/** ISO 주차 키 (예: 2026-W36) */
export const weekKey = (d = new Date()) => {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date - yearStart) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
};

/** 학교급별 사회정서기술 전체 목록 (영역 포함) */
export const skillsForLevel = (gradeLabel) => {
  const level = seoulLevelOf(gradeLabel);
  const out = [];
  Object.entries(SEOUL.skills[level] || {}).forEach(([area, list]) => list.forEach(skill => out.push({ area, skill })));
  return out;
};
export const areaOfSkill = (gradeLabel, skill) => (skillsForLevel(gradeLabel).find(s => s.skill === skill) || {}).area || '';

/** 또래 친절 미션 풀 — 서울 사회정서기술 이름으로 태그. 짧고, 오늘 당장 할 수 있고, 아무도 다치지 않는 것만. */
export const MISSION_POOL = [
  { id: 'thanks', area: '대인관계', skills: ['공감하기', '신뢰 관계 형성하기', '대인관계 맺기'], text: '이번 주에 고마웠던 친구에게 "고마워" 한 마디 직접 말하기', why: '고마움을 말로 전하면 관계가 단단해져요.' },
  { id: 'listen', area: '대인관계', skills: ['의사소통하기', '공감하기'], text: '친구가 말할 때 끝까지 듣고, "그래서 어떻게 됐어?" 한 번 물어보기', why: '끝까지 듣는 것이 공감의 시작이에요.' },
  { id: 'invite', area: '공동체', skills: ['소속감 갖기', '공동체와 연결하기', '공동체의 가치 탐구하기'], text: '쉬는 시간에 혼자 있는 친구에게 "같이 할래?" 먼저 말 걸기', why: '누구도 혼자가 아닌 반을 우리가 만들어요.' },
  { id: 'feeling', area: '자기', skills: ['감정 인식하기'], text: '오늘 느낀 감정을 단어 하나로 이름 붙이고, 그 이유를 한 줄로 적어 보기', why: '감정에 이름을 붙이면 감정을 다룰 수 있어요.' },
  { id: 'pause', area: '자기', skills: ['감정 조절하기', '행동 조절하기'], text: '화가 나거나 짜증 날 때 숨을 세 번 크게 쉬고 나서 말하기', why: '잠깐 멈추면 후회할 말을 줄일 수 있어요.' },
  { id: 'strength', area: '자기', skills: ['자아존중감 형성하기', '자기효능감 기르기'], text: '내가 잘한 일 하나를 찾아 나에게 "잘했어" 말해 주기', why: '스스로를 인정하는 연습이 자존감이 돼요.' },
  { id: 'perspective', area: '대인관계', skills: ['타인의 관점 이해하기'], text: '친구와 생각이 다를 때 "너는 왜 그렇게 생각해?" 먼저 물어보기', why: '다름은 틀림이 아니에요.' },
  { id: 'sorry', area: '대인관계', skills: ['갈등 해결하기', '관계 속 회복탄력성 키우기'], text: '실수했을 때 미루지 않고 그날 안에 사과하기', why: '빠른 사과가 관계를 회복시켜요.' },
  { id: 'role', area: '공동체', skills: ['협력하기', '책임을 이해하고 실천하기'], text: '모둠이나 우리 반에서 내가 맡은 역할을 말없이 한 번 더 하기', why: '책임은 작은 실천에서 자라요.' },
  { id: 'fair', area: '공동체', skills: ['책임 있는 의사 결정하기', '문제 해결하기'], text: '무언가를 정할 때 "다른 친구도 괜찮을까?" 한 번 생각하고 결정하기', why: '공정한 결정은 모두를 지켜요.' },
  { id: 'help', area: '마음건강', skills: ['마음건강 어려움에 대처하기', '마음건강 이해와 마음건강 어려움에 대처하기'], text: '힘든 날, 믿을 만한 어른이나 친구에게 "나 오늘 좀 힘들어" 한 마디 하기', why: '도움을 청하는 건 용기예요.' },
  { id: 'rest', area: '마음건강', skills: ['마음건강 이해하기', '스트레스 대처하기', '회복탄력성 높이기'], text: '자기 전 10분, 화면 없이 마음이 편해지는 일 하나 하기', why: '마음도 쉬어야 자라요.' },
];

/** 이번 주 기본 미션 (교사가 따로 정하지 않으면 주차에 따라 자동 순환) */
export const defaultMission = (wk = weekKey()) => {
  const n = parseInt(wk.split('-W')[1] || '1', 10);
  return MISSION_POOL[n % MISSION_POOL.length];
};
export const missionById = (id) => MISSION_POOL.find(m => m.id === id) || null;

/** 이번 달 기술별 연습 횟수 (skillLog: [{skill, area, date}]) */
export const monthlySkillCounts = (skillLog = [], mk = monthKey()) => {
  const counts = {};
  skillLog.forEach(e => { if (e && e.skill && String(e.date || '').startsWith(mk)) counts[e.skill] = (counts[e.skill] || 0) + 1; });
  return Object.entries(counts).map(([skill, count]) => ({ skill, count })).sort((a, b) => b.count - a.count);
};

/** 배지 단계: 1회 🌱 / 3회 🌿 / 6회 🌳 */
export const badgeFor = (count) => (count >= 6 ? { icon: '🌳', label: '숲', level: 3 } : count >= 3 ? { icon: '🌿', label: '나무', level: 2 } : count >= 1 ? { icon: '🌱', label: '새싹', level: 1 } : { icon: '·', label: '아직', level: 0 });

/** 학급 월간 집계 (교사 브라우저에서 계산 → classReports 문서로 저장). 개인 식별 정보 없음. */
export const buildClassMonthly = (studentsData = [], { classCode, className, gradeLabel, mk = monthKey() }) => {
  const skillTotals = {};
  const areaTotals = {};
  let active = 0;
  let missionDone = 0;
  const weeksInMonth = new Set();
  studentsData.forEach(s => {
    const counts = monthlySkillCounts(s.skillLog || [], mk);
    if (counts.length) active += 1;
    counts.forEach(({ skill, count }) => {
      skillTotals[skill] = (skillTotals[skill] || 0) + count;
      const area = areaOfSkill(gradeLabel, skill);
      if (area) areaTotals[area] = (areaTotals[area] || 0) + count;
    });
    (s.missions || []).forEach(m => { if (m && String(m.doneAt || '').startsWith(mk)) { missionDone += 1; weeksInMonth.add(m.weekKey); } });
  });
  const topSkills = Object.entries(skillTotals).map(([skill, count]) => ({ skill, area: areaOfSkill(gradeLabel, skill), count })).sort((a, b) => b.count - a.count).slice(0, 5);
  const topAreas = Object.entries(areaTotals).sort((a, b) => b[1] - a[1]).map(([area]) => area);
  const denom = Math.max(1, studentsData.length * Math.max(1, weeksInMonth.size));
  return {
    classCode, className: className || '', gradeLabel, month: mk,
    studentCount: studentsData.length, activeCount: active,
    topSkills, topAreas,
    missionDone, missionRate: Math.min(100, Math.round((missionDone / denom) * 100)),
    generatedAt: new Date().toISOString(),
  };
};
