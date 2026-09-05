/**
 * 오늘의 피드 — 교사가 아침에 1분 안에 보는 세 가지
 *  1) 오늘 챙길 학생 한 명(교사만 보는 관계 신호 기반)
 *  2) 오늘 아침 활동 카드(교육부 아침조회 대화 주제 + 서울 학년 학습 주제; 개인 정보 없음 → TV 화면에도 사용)
 *  3) 오늘 알림장 한 줄(개인 정보 없음)
 * 날짜별로 고정(같은 날은 같은 카드)되도록 날짜 해시로 고른다.
 */
import { assessClass } from './studentSignals.js';
import { topicsFor } from './selFramework.js';
import { lessonsFor, seoulLevelOf } from './seoulSel.js';
import { MISSION_POOL, defaultMission, missionById, weekKey, dayKey } from './growth.js';

const hash = (s) => { let h = 0; for (const ch of String(s)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; };
const topicLevel = (gradeLabel) => { const n = Number(gradeLabel.slice(1)); const lv = seoulLevelOf(gradeLabel); return lv === 'middle' ? 'middle' : lv === 'high' ? 'high' : n <= 3 ? 'elementary_low' : 'elementary_high'; };

/** 오늘의 아침 활동 카드 (개인 정보 없음) */
export const morningCard = (gradeLabel, date = new Date()) => {
  const dk = dayKey(date);
  const topics = topicsFor(topicLevel(gradeLabel), [], 200);
  const lessons = lessonsFor(gradeLabel, [], 100);
  const t = topics.length ? topics[hash(dk + 'topic') % topics.length] : '';
  const l = lessons.length ? lessons[hash(dk + 'lesson') % lessons.length] : null;
  const [area, topic] = t.includes(' · ') ? t.split(' · ') : ['', t];
  const questions = {
    elementary_low: [`오늘 ${topic}에 대해 한 사람씩 한 마디만 해 볼까요?`, '짝과 30초씩 이야기하고, 짝의 말을 한 문장으로 소개해요.'],
    elementary_high: [`"${topic}" — 나에게는 어떤 의미일까요? 한 줄로 적어 봅시다.`, '모둠에서 돌아가며 말하고, 가장 공감된 이야기에 손을 들어요.'],
    middle: [`"${topic}"에 대해 내 생각을 두 문장으로. 근거 하나를 붙여 봅시다.`, '옆 사람과 생각이 어디서 갈리는지 찾아보세요.'],
    high: [`"${topic}" — 오늘 하루 실천할 수 있는 행동 하나를 정해 봅시다.`, '이번 주 미션과 연결해 보세요.'],
  }[topicLevel(gradeLabel)];
  return { date: dk, area, topic, questions, lessonTopic: l ? (l.gradeTopic || l.lessonTopic || l.title) : '', lessonSkill: l?.skill || '', lessonStandards: l?.standards || [], minutes: 5 };
};

/** 오늘 챙길 학생 한 명 — 교사 전용. 신호가 없으면 '받은 지목이 적은 학생'을 조용히 챙기게 한다. */
export const studentOfTheDay = (studentsData = [], date = new Date()) => {
  const { results, atRisk } = assessClass(studentsData);
  if (!results.length) return null;
  const dk = dayKey(date);
  if (atRisk.length) {
    const urgent = atRisk.filter(r => r.tier === 'urgent');
    const pool = urgent.length ? urgent : atRisk.slice(0, Math.min(5, atRisk.length));
    const r = pool[hash(dk + 'student') % pool.length];
    return { id: r.id, name: r.student.realName || r.student.nickname, tier: r.tier, reason: r.signals.slice(0, 2).map(s => s.label).join(' · '), action: r.quickAction, focus: r.focus.map(f => f.label) };
  }
  const low = [...results].sort((a, b) => (a.node?.received ?? 0) - (b.node?.received ?? 0)).slice(0, 5);
  const r = low[hash(dk + 'student') % low.length];
  return { id: r.id, name: r.student.realName || r.student.nickname, tier: 'ok', reason: '특별한 신호는 없지만 오늘은 이 학생과 눈 맞추고 한마디', action: '쉬는 시간에 이름을 부르고 오늘 좋았던 일 하나를 물어봐 주세요.', focus: [] };
};

/** 오늘 알림장 한 줄 (개인 정보 없음) */
export const noticeOfTheDay = (gradeLabel, classMission, className = '', date = new Date()) => {
  const card = morningCard(gradeLabel, date);
  const wk = weekKey(date);
  const mission = (classMission && classMission.weekKey === wk && missionById(classMission.missionId)) || defaultMission(wk);
  const kid = seoulLevelOf(gradeLabel) === 'elementary' ? '아이' : '자녀';
  return `[${className || '우리 반'} 알림] 오늘 아침 활동은 "${card.topic}"이었습니다. 이번 주 친절 미션은 "${mission.text}"입니다. 저녁에 ${kid}에게 "오늘 ${card.topic} 얘기했다던데, 뭐라고 했어?" 한 번만 물어봐 주세요.`;
};
