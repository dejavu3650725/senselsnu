import { buildClassGraph, dedupeStudents } from './studentSignals';
import { skillCountsBetween, dayKey } from './growth';

const shift = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const name = (s) => s.realName || s.nickname || '?';
const inWin = (iso, from, to) => { const d = String(iso || '').slice(0, 10); return d >= from && d <= to; };

/**
 * 이번 주 브리핑 — 지난 7일 동안 '실제로 바뀐 것'만 모아 교사가 월요일 1분에 읽는다.
 * 대화 원문은 없다. 날짜가 붙은 신호(대화일·지목 로그·갈등 언급·외로움·위기·기술 연습·미션)만 센다.
 */
export const buildWeeklyBrief = (studentsData = [], { className = '', today = new Date() } = {}) => {
  const students = dedupeStudents(studentsData);
  const to = dayKey(today);
  const from = dayKey(shift(today, -6));
  const prevFrom = dayKey(shift(today, -13));
  const prevTo = dayKey(shift(today, -7));
  const graph = buildClassGraph(students);

  // 참여
  const daysIn = (s, a, b) => (s.sessionDates || []).filter(d => d >= a && d <= b).length;
  const active = students.filter(s => daysIn(s, from, to) > 0);
  const prevActive = students.filter(s => daysIn(s, prevFrom, prevTo) > 0);
  const quiet = prevActive.filter(s => daysIn(s, from, to) === 0);                      // 지난주엔 왔는데 이번 주 조용
  const never = students.filter(s => !(s.sessionDates || []).length && !(s.nominations || []).length); // 아직 한 번도
  const totalDays = active.reduce((n, s) => n + daysIn(s, from, to), 0);

  // 관계
  const newNoms = [];
  students.forEach(s => (s.nominationLog || []).forEach(n => { if (n && inWin(n.timestamp, from, to)) newNoms.push({ from: s, target: n.target }); }));
  const resolveByNick = (nick) => students.find(x => x.nickname === nick || x.realName === nick);
  const newMutual = [];
  const seenPair = new Set();
  newNoms.forEach(({ from: s, target }) => {
    const t = resolveByNick(target);
    if (!t || t.id === s.id) return;
    const a = graph.get(s.id), b = graph.get(t.id);
    if (a && b && a.mutual.has(t.id)) {
      const key = [s.id, t.id].sort().join('|');
      if (!seenPair.has(key)) { seenPair.add(key); newMutual.push([s, t]); }
    }
  });
  const isolated = [...graph.values()].filter(n => n.received === 0).map(n => n.student);

  // 신호
  const repeated = [];
  students.forEach(s => {
    const counts = {};
    (s.conflictMentions || []).forEach(m => { if (m && inWin(m.timestamp, from, to)) counts[m.target] = (counts[m.target] || 0) + 1; });
    Object.entries(counts).forEach(([target, c]) => { if (c >= 2) repeated.push({ student: s, target, count: c }); });
  });
  const conflictsThisWeek = students.reduce((n, s) => n + (s.conflictMentions || []).filter(m => m && inWin(m.timestamp, from, to)).length, 0);
  const lonely = students.filter(s => (s.lonelySignals || []).some(t => inWin(t, from, to)));
  const alerts = [];
  students.forEach(s => (s.alerts || []).forEach(a => { if (a && inWin(a.timestamp, from, to)) alerts.push({ student: s, reason: a.reason, acked: !!(s.alertsAckedAt && a.timestamp <= s.alertsAckedAt) }); }));
  const unacked = alerts.filter(a => !a.acked);

  // 성장
  const skillTotals = {};
  students.forEach(s => skillCountsBetween(s.skillLog || [], from, to).forEach(({ skill, count }) => { skillTotals[skill] = (skillTotals[skill] || 0) + count; }));
  const topSkills = Object.entries(skillTotals).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([skill, count]) => ({ skill, count }));
  const missionsDone = students.filter(s => (s.missions || []).some(m => m && inWin(m.doneAt, from, to))).length;

  // 이번 주 할 일 3가지 — 우선순위: 미확인 위기 > 반복 호소 > 외로움 > 고립(받은 지목 0) > 조용해진 아이 > 참여 독려
  const todos = [];
  if (unacked.length) todos.push({ tone: 'red', text: `${unacked.map(a => name(a.student)).join(', ')} — 위기 알림 확인·조치 기록 남기기`, menu: '대시보드' });
  if (repeated.length) todos.push({ tone: 'warn', text: `${repeated.map(r => name(r.student)).join(', ')} — 같은 친구를 ${repeated[0].count}회 이상 언급. 관계 신호에서 양쪽 관계망 확인 후 조용히 면담`, menu: '관계 신호' });
  if (lonely.length) todos.push({ tone: 'purple', text: `${lonely.map(name).join(', ')} — 외로움 신호. 쉬는 시간에 이름 부르고 오늘 좋았던 일 하나 묻기`, menu: '맞춤 처방' });
  if (isolated.length) todos.push({ tone: 'blue', text: `받은 지목 0인 학생 ${isolated.length}명(${isolated.slice(0, 3).map(name).join(', ')}${isolated.length > 3 ? ' 외' : ''}) — 다음 자리 배치에서 상호 지목 학생 옆에 두기`, menu: '자리 배치' });
  if (quiet.length) todos.push({ tone: 'gray', text: `${quiet.slice(0, 4).map(name).join(', ')}${quiet.length > 4 ? ` 외 ${quiet.length - 4}명` : ''} — 지난주엔 대화했는데 이번 주 조용함. 무슨 일 있는지 가볍게 확인`, menu: '학생 관리' });
  if (never.length) todos.push({ tone: 'gray', text: `아직 한 번도 안 들어온 학생 ${never.length}명 — 아침 5분 '나무 시간'으로 참여 독려`, menu: '학생 관리' });
  if (!todos.length) todos.push({ tone: 'green', text: '특별한 신호 없음 — 월요일 아침 활동 카드로 한 주 시작하고, 이번 주 미션을 알림장에 넣기', menu: '대시보드' });

  const brief = {
    from, to, className,
    participation: { active: active.length, total: students.length, totalDays, quiet, never },
    relations: { newNoms: newNoms.length, newMutual, isolated },
    signals: { conflictsThisWeek, repeated, lonely, alerts, unacked },
    growth: { topSkills, missionsDone },
    todos: todos.slice(0, 3),
  };
  brief.text = weeklyBriefToText(brief);
  return brief;
};

export const weeklyBriefToText = (b) => {
  const L = [];
  L.push(`[이번 주 학급 브리핑] ${b.className} · ${b.from.replace(/-/g, '.')} ~ ${b.to.replace(/-/g, '.')}`);
  L.push(`1. 참여: ${b.participation.active}/${b.participation.total}명이 나무와 대화 (총 ${b.participation.totalDays}회)${b.participation.quiet.length ? ` · 이번 주 조용해진 학생 ${b.participation.quiet.length}명` : ''}`);
  L.push(`2. 관계: 새 긍정 지목 ${b.relations.newNoms}건${b.relations.newMutual.length ? ` · 새로 서로 지목한 짝 ${b.relations.newMutual.length}쌍` : ''} · 받은 지목 0인 학생 ${b.relations.isolated.length}명`);
  L.push(`3. 신호: 갈등 언급 ${b.signals.conflictsThisWeek}건(반복 호소 ${b.signals.repeated.length}명) · 외로움 ${b.signals.lonely.length}명 · 위기 알림 ${b.signals.alerts.length}건(미확인 ${b.signals.unacked.length})`);
  L.push(`4. 성장: ${b.growth.topSkills.length ? b.growth.topSkills.map(s => `${s.skill} ${s.count}회`).join(', ') : '연습 기록 없음'} · 이번 주 미션 완료 ${b.growth.missionsDone}명`);
  L.push('5. 이번 주 할 일:');
  b.todos.forEach((t, i) => L.push(`   ${i + 1}) ${t.text}`));
  L.push('※ 학생 개인 신호는 교사 열람 전용. 갈등·위기는 학생 보고 기준이며 사실 확인이 필요합니다.');
  return L.join('\n');
};
