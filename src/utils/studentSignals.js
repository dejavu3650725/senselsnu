/**
 * 학생 신호 분석 유틸 (교사 대시보드 · 맞춤 처방 · 자리 배치 공용)
 *
 * Firestore students 문서(mood, nominations, conflicts, lonelySignals, alerts, messages ...)를
 * 학급 단위 관계 그래프로 변환하고, 학생별 위험 신호를 SEL(CASEL 5대 역량) 관점에서 구조화합니다.
 *
 * - 모든 계산은 브라우저에서만 이루어지며 외부로 전송되지 않습니다.
 * - 외부 AI에 보낼 때는 buildAnonymizedProfile()로 익명 ID(S1, S2...)만 사용합니다.
 */

export const CASEL = {
  selfAwareness: { key: 'selfAwareness', label: '자기 인식', desc: '자신의 감정·생각·가치를 알아차리기' },
  selfManagement: { key: 'selfManagement', label: '자기 관리', desc: '감정과 행동을 조절하고 스트레스 다루기' },
  socialAwareness: { key: 'socialAwareness', label: '사회적 인식', desc: '타인의 관점을 이해하고 공감하기' },
  relationshipSkills: { key: 'relationshipSkills', label: '관계 기술', desc: '건강한 관계 맺기·협력·갈등 해결' },
  responsibleDecision: { key: 'responsibleDecision', label: '책임 있는 의사결정', desc: '결과를 고려한 건설적 선택' },
};

const stripParticle = (s = '') => String(s).replace(/[은는이가랑하고의야아]$/g, '').trim();

/** 닉네임/실명/일부 표기로 학생 찾기 (소시오그램과 동일한 퍼지 매칭) */
export const makeResolver = (students) => {
  const byNick = new Map();
  const byReal = new Map();
  students.forEach(s => {
    if (s.nickname) byNick.set(s.nickname, s);
    if (s.realName) byReal.set(s.realName, s);
  });
  return (name) => {
    if (!name) return null;
    const raw = String(name).trim();
    if (byNick.has(raw)) return byNick.get(raw);
    if (byReal.has(raw)) return byReal.get(raw);
    const q = stripParticle(raw);
    if (!q) return null;
    return students.find(s =>
      (s.nickname && (s.nickname.includes(q) || q.includes(s.nickname))) ||
      (s.realName && (s.realName.includes(q) || q.includes(s.realName)))
    ) || null;
  };
};

/** 동일 인물 중복 문서 제거 (실명 기준, 최신 활동 우선) */
export const dedupeStudents = (studentsData = []) => {
  const map = new Map();
  studentsData.forEach(s => {
    const key = s.realName || s.nickname || s.id;
    const prev = map.get(key);
    if (!prev) { map.set(key, s); return; }
    const pt = prev.lastActive?.toMillis ? prev.lastActive.toMillis() : 0;
    const nt = s.lastActive?.toMillis ? s.lastActive.toMillis() : 0;
    if (nt > pt) map.set(key, s);
  });
  return Array.from(map.values());
};

/**
 * 학급 관계 그래프 생성
 * @returns {Map<id, node>} node = { student, given:Set, incoming:Set, mutual:Set, conflicts:Set, mutualConflicts:Set, received, lonelyCount, unackedAlerts:[], allAlerts:[] }
 */
export const buildClassGraph = (studentsData = []) => {
  const students = dedupeStudents(studentsData);
  const resolve = makeResolver(students);
  const graph = new Map();
  students.forEach(s => {
    graph.set(s.id, {
      student: s,
      given: new Set(),
      incoming: new Set(),
      mutual: new Set(),
      conflicts: new Set(),
      mutualConflicts: new Set(),
      received: 0,
      lonelyCount: (s.lonelySignals || []).length,
      allAlerts: (s.alerts || []).filter(a => a && a.timestamp),
      unackedAlerts: (s.alerts || []).filter(a => a && a.timestamp && (!s.alertsAckedAt || a.timestamp > s.alertsAckedAt)),
    });
  });

  students.forEach(s => {
    const me = graph.get(s.id);
    (s.nominations || []).forEach(n => {
      const t = resolve(n);
      if (t && t.id !== s.id && graph.has(t.id)) me.given.add(t.id);
    });
    (s.conflicts || []).forEach(n => {
      const t = resolve(n);
      if (t && t.id !== s.id && graph.has(t.id)) me.conflicts.add(t.id);
    });
  });

  graph.forEach((node, id) => {
    node.given.forEach(tid => {
      const t = graph.get(tid);
      t.incoming.add(id);
      t.received += 1;
      if (t.given.has(id)) { node.mutual.add(tid); t.mutual.add(id); }
    });
    node.conflicts.forEach(tid => {
      const t = graph.get(tid);
      if (t.conflicts.has(id)) { node.mutualConflicts.add(tid); t.mutualConflicts.add(id); }
    });
  });

  return graph;
};

const recentUserMessages = (student, limit = 8) =>
  (student.messages || [])
    .filter(m => m && m.sender === 'user' && m.text)
    .slice(-limit)
    .map(m => ({ text: String(m.text).slice(0, 160), timestamp: m.timestamp }));

/**
 * 학생 1명 위험 신호 평가
 * tier: 'urgent'(긴급) | 'high'(높음) | 'watch'(관심) | 'ok'
 */
export const assessStudent = (node, graph) => {
  const s = node.student;
  const signals = [];
  const focus = new Set();
  let score = 0;

  if (node.unackedAlerts.length > 0) {
    const latest = node.unackedAlerts[node.unackedAlerts.length - 1];
    signals.push({ type: 'alert', label: '긴급 위기 신호', detail: latest.reason || '위기 신호 감지', weight: 100 });
    score += 100;
  } else if (node.allAlerts.length > 0) {
    signals.push({ type: 'alertHistory', label: '과거 위기 신호(확인됨)', detail: node.allAlerts[node.allAlerts.length - 1].reason || '', weight: 15 });
    score += 15;
  }

  if (s.mood === '힘듦') {
    signals.push({ type: 'mood', label: '기분 힘듦', detail: '스스로 보고한 정서 상태', weight: 40 });
    score += 40;
    focus.add('selfAwareness'); focus.add('selfManagement');
  } else if (s.mood === '보통') {
    score += 5;
  }

  if (node.mutualConflicts.size > 0) {
    signals.push({ type: 'mutualConflict', label: '상호 갈등', detail: `${node.mutualConflicts.size}명과 서로 갈등 언급`, ids: [...node.mutualConflicts], weight: 35 });
    score += 35;
    focus.add('relationshipSkills'); focus.add('responsibleDecision');
  }
  const oneWay = [...node.conflicts].filter(id => !node.mutualConflicts.has(id));
  if (oneWay.length > 0) {
    signals.push({ type: 'conflict', label: '갈등 신호', detail: `${oneWay.length}명과의 갈등을 스스로 언급`, ids: oneWay, weight: 20 });
    score += 20;
    focus.add('relationshipSkills'); focus.add('socialAwareness');
  }
  const mentionedBy = [];
  graph.forEach((other, oid) => { if (oid !== s.id && other.conflicts.has(s.id) && !node.conflicts.has(oid)) mentionedBy.push(oid); });
  if (mentionedBy.length > 0) {
    signals.push({ type: 'conflictTarget', label: '갈등 상대로 언급됨', detail: `${mentionedBy.length}명이 이 학생과의 갈등을 언급`, ids: mentionedBy, weight: 15 });
    score += 15;
    focus.add('socialAwareness');
  }

  if (node.lonelyCount > 0) {
    signals.push({ type: 'lonely', label: '외로움 신호', detail: `${node.lonelyCount}회 표현`, weight: 25 + Math.min(15, node.lonelyCount * 5) });
    score += 25 + Math.min(15, node.lonelyCount * 5);
    focus.add('relationshipSkills'); focus.add('selfAwareness');
  }

  const isolated = node.received === 0 && node.mutual.size === 0;
  if (isolated) {
    signals.push({ type: 'isolated', label: '관계망 고립', detail: '긍정 지목을 한 번도 받지 못함', weight: 25 });
    score += 25;
    focus.add('relationshipSkills'); focus.add('socialAwareness');
  } else if (node.received === 0) {
    signals.push({ type: 'lowReceived', label: '받은 지목 없음', detail: '지목은 했지만 받은 지목이 없음', weight: 12 });
    score += 12;
    focus.add('relationshipSkills');
  }

  let tier = 'ok';
  if (node.unackedAlerts.length > 0) tier = 'urgent';
  else if (score >= 40) tier = 'high';
  else if (score >= 15) tier = 'watch';

  if (focus.size === 0 && tier !== 'ok') focus.add('selfAwareness');

  return {
    id: s.id,
    tier,
    score,
    signals,
    focus: [...focus].map(k => CASEL[k]),
    isolated,
    quickAction: buildQuickAction(signals, node, graph),
  };
};

const nameOf = (graph, id) => graph.get(id)?.student?.realName || graph.get(id)?.student?.nickname || '친구';

/** 대시보드용 한 줄 개입 힌트 (규칙 기반, AI 호출 없음) */
const buildQuickAction = (signals, node, graph) => {
  const types = new Set(signals.map(sg => sg.type));
  if (types.has('alert')) return '오늘 중 1:1 안전 확인 면담 → 필요 시 Wee클래스·보호자 연계';
  if (types.has('mutualConflict')) {
    const other = [...node.mutualConflicts][0];
    return `${nameOf(graph, other)}와(과) 분리 후 각각 개별 경청 → 준비되면 중재 대화`;
  }
  if (types.has('lonely') || types.has('isolated')) {
    const helper = [...node.incoming][0] || [...node.mutual][0];
    return helper
      ? `${nameOf(graph, helper)}와(과) 짝 활동·역할 부여로 소속감 만들기`
      : '역할(도우미·모둠장)로 또래와 접점 만들기 + 쉬는 시간 관찰';
  }
  if (types.has('conflict')) return '갈등 상황 경청(판단 없이) → 감정 이름 붙이기 → 원하는 결과 묻기';
  if (types.has('mood')) return '하루 1회 짧은 정서 체크인(2분) + 감정 원인 탐색';
  if (types.has('conflictTarget')) return '관점 바꿔보기 대화(상대는 어떤 마음이었을까?)';
  return '지속 관찰';
};

/** 학급 전체 평가: 관심 필요 학생을 우선순위로 정렬 */
export const assessClass = (studentsData = []) => {
  const graph = buildClassGraph(studentsData);
  const results = [];
  graph.forEach(node => results.push({ ...assessStudent(node, graph), student: node.student, node }));
  const order = { urgent: 0, high: 1, watch: 2, ok: 3 };
  results.sort((a, b) => order[a.tier] - order[b.tier] || b.score - a.score);
  return { graph, results, atRisk: results.filter(r => r.tier !== 'ok') };
};

/**
 * 외부 AI 전송용 익명 프로필 생성
 * - 실명/닉네임 대신 S1, S2... 사용. 대화 원문은 학생 본인 발화만, 급우 이름은 익명 ID로 치환.
 * @returns { profile, anonById:Map, idByAnon:Map }
 */
export const buildAnonymizedProfile = (targetId, studentsData) => {
  const { graph, results } = assessClass(studentsData);
  const ids = [...graph.keys()];
  const anonById = new Map();
  const idByAnon = new Map();
  ids.forEach((id, i) => { anonById.set(id, `S${i + 1}`); idByAnon.set(`S${i + 1}`, id); });

  const node = graph.get(targetId);
  if (!node) return null;
  const assessment = results.find(r => r.id === targetId);
  const s = node.student;

  // 급우 이름을 익명 ID로 치환
  const replacers = [];
  graph.forEach((n, id) => {
    const anon = anonById.get(id);
    if (n.student.realName) replacers.push([n.student.realName, anon]);
    if (n.student.nickname) replacers.push([n.student.nickname, anon]);
  });
  replacers.sort((a, b) => b[0].length - a[0].length);
  const anonymizeText = (t) => {
    let out = String(t || '');
    replacers.forEach(([name, anon]) => { if (name && name.length >= 2) out = out.split(name).join(anon); });
    return out;
  };

  const describe = (id) => {
    const n = graph.get(id);
    return { id: anonById.get(id), gender: n.student.gender || '미상', mood: n.student.mood || '보통', received: n.received };
  };

  const profile = {
    id: anonById.get(targetId),
    gender: s.gender || '미상',
    mood: s.mood || '보통',
    tier: assessment?.tier,
    signals: (assessment?.signals || []).map(sg => ({ type: sg.type, label: sg.label, detail: anonymizeText(sg.detail), ids: (sg.ids || []).map(i => anonById.get(i)) })),
    focus: (assessment?.focus || []).map(f => f.label),
    relations: {
      mutual: [...node.mutual].map(describe),
      incoming: [...node.incoming].filter(i => !node.mutual.has(i)).map(describe),
      given: [...node.given].filter(i => !node.mutual.has(i)).map(describe),
      conflicts: [...node.conflicts].map(describe),
      mutualConflicts: [...node.mutualConflicts].map(describe),
      received: node.received,
      lonelyCount: node.lonelyCount,
    },
    alerts: node.allAlerts.slice(-3).map(a => ({ reason: anonymizeText(a.reason), when: a.timestamp })),
    recentMessages: recentUserMessages(s).map(m => ({ text: anonymizeText(m.text), when: m.timestamp })),
    classSize: ids.length,
  };

  return { profile, anonById, idByAnon, assessment };
};

/** 응답 텍스트 속 익명 ID(S3 등)를 실명으로 복원 */
export const deanonymizeText = (text, idByAnon, studentsData) => {
  if (!text) return '';
  return String(text).replace(/S(\d+)(?![0-9])/g, (m, num) => {
    const id = idByAnon.get(`S${num}`);
    const st = studentsData.find(x => x.id === id);
    return st ? st.realName || st.nickname || m : m;
  });
};
