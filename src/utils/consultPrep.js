import { buildClassGraph, dedupeStudents, hasBatchim } from './studentSignals';
import { skillCountsBetween, dayKey, missionById } from './growth';
import { MISSION_POOL } from './growth';

const name = (s) => s.realName || s.nickname || '?';
const eul = (s) => `${name(s)}${hasBatchim(name(s)) === false ? '를' : '을'}`;

/**
 * 학부모 상담 준비 카드 (교사 열람 전용)
 * - 상담 주간에 학생 1명당 30초 만에 '말할 거리'를 준비한다.
 * - 원칙: 강점 먼저, 숫자는 우리 아이 것만(다른 학생 이름·다른 학생의 보고는 절대 넣지 않음), 대화 원문 없음, 판정 아님.
 * - 갈등·위기는 "학생이 나무에게 이런 마음을 말한 적 있음" 수준으로만, 그것도 교사 확인 후 말할지 결정.
 */
export const buildConsultCards = (studentsData = [], { gradeLabel = '', className = '', from = '2000-01-01', to = dayKey() } = {}) => {
  const students = dedupeStudents(studentsData);
  const graph = buildClassGraph(students);
  return students.map(s => {
    const node = graph.get(s.id);
    const days = (s.sessionDates || []).filter(d => d >= from && d <= to).length;
    const skills = skillCountsBetween(s.skillLog || [], from, to).slice(0, 3);
    const missions = (s.missions || []).filter(m => m && String(m.doneAt || '').slice(0, 10) >= from).map(m => missionById(m.missionId)).filter(Boolean);
    const received = node?.received || 0;
    const mutual = node?.mutual?.size || 0;
    const given = node?.given?.size || 0;
    const lonely = (s.lonelySignals || []).filter(t => String(t).slice(0, 10) >= from).length;
    const conflicts = (s.conflictMentions || []).filter(m => m && String(m.timestamp).slice(0, 10) >= from).length || (s.conflicts || []).length;
    const alerts = (s.alerts || []).filter(a => a && String(a.timestamp).slice(0, 10) >= from).length;
    const mood = s.mood || '';

    // 강점 문장
    const strengths = [];
    if (received >= 3) strengths.push(`친구 ${received}명이 "같이 있고 싶은 친구"로 ${eul(s)} 꼽았습니다. 반에서 함께하고 싶어 하는 아이입니다.`);
    else if (received > 0) strengths.push(`친구 ${received}명이 "같이 있고 싶은 친구"로 ${eul(s)} 꼽았습니다.`);
    if (mutual > 0) strengths.push(`서로 좋아한다고 말한 단짝이 ${mutual}명 있습니다.`);
    if (given > 0) strengths.push(`${name(s)}도 친구 ${given}명을 좋게 말했습니다. 관계를 긍정적으로 보는 아이입니다.`);
    if (skills.length) strengths.push(`이번 기간에 나무와 이야기하며 연습한 사회정서기술: ${skills.map(k => `${k.skill}(${k.count}회)`).join(', ')}.`);
    if (missions.length) strengths.push(`친절 미션 ${missions.length}개를 완료했습니다. (예: "${missions[0].text}")`);
    if (days >= 5) strengths.push(`${days}일 동안 자기 마음을 말로 표현하는 연습을 했습니다. 꾸준함이 강점입니다.`);
    if (!strengths.length) strengths.push('아직 기록이 적어 데이터로 말할 강점은 없습니다. 선생님이 교실에서 본 장면 하나를 준비해 주세요.');

    // 관심 포인트 (교사만 보고, 말할지 결정)
    const watch = [];
    if (received === 0 && (days > 0 || given > 0)) watch.push('아직 친구들 지목에 이름이 오르지 않았습니다. 최근 짝·모둠 배치에서 어울림을 지켜보고 있다고 말할 수 있습니다. ("고립"이라는 말은 쓰지 마세요)');
    if (lonely > 0) watch.push(`나무에게 외로움을 ${lonely}번 표현한 적이 있습니다. 집에서 요즘 학교 친구 이야기를 어떻게 하는지 여쭤 보세요.`);
    if (conflicts > 0) watch.push(`친구와의 불편함을 ${conflicts}번 말한 적이 있습니다(학생 보고 기준, 상대 이름은 상담에서 언급하지 않음). 사실 확인이 된 것만 말하세요.`);
    if (alerts > 0) watch.push(`위기 범주 알림이 ${alerts}건 있었습니다. 이미 확인·조치한 내용을 바탕으로, 학교 절차에 따라 말하세요.`);
    if (mood === '힘듦') watch.push('최근 스스로 고른 기분이 "힘듦"입니다. 잠·식사·수면 등 생활 리듬을 가볍게 여쭤 보세요.');

    // 가정 제안 1개 (강점/관심에서 가장 맞는 미션)
    const area = lonely || received === 0 ? '공동체' : conflicts ? '대인관계' : mood === '힘듦' ? '마음건강' : skills[0]?.area || '자기';
    const suggest = MISSION_POOL.find(m => m.area === area) || MISSION_POOL[0];

    const lines = [];
    lines.push(`[학부모 상담 준비 — ${name(s)}] ${className} · 교사 열람용 · 기간 ${from.replace(/-/g, '.')}~${to.replace(/-/g, '.')}`);
    lines.push('■ 먼저 말할 강점');
    strengths.forEach(t => lines.push(`- ${t}`));
    lines.push('■ 함께 지켜볼 점 (말할지 선생님이 결정)');
    if (watch.length) watch.forEach(t => lines.push(`- ${t}`)); else lines.push('- 특별한 신호 없음. "잘 지내고 있어요"를 근거(위 강점)와 함께 말하세요.');
    lines.push('■ 가정에 부탁드릴 한 가지');
    lines.push(`- "${suggest.text}" — ${suggest.why}`);
    lines.push('■ 이 상담에서 하지 않을 것');
    lines.push('- 다른 학생의 이름·다른 학생이 한 말 언급 / 나무와의 대화 내용 인용(저장되지 않음) / 등급·점수·"위험" 같은 판정어');
    return { id: s.id, student: s, days, received, mutual, given, skills, missions: missions.length, lonely, conflicts, alerts, mood, strengths, watch, suggest, text: lines.join('\n') };
  }).sort((a, b) => name(a.student).localeCompare(name(b.student), 'ko'));
};
