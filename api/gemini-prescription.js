/**
 * [AI 맞춤 처방] Vercel Serverless Function
 *
 * 개인정보 보호:
 * - 프론트엔드는 실명/닉네임을 보내지 않고, 익명 ID(S1, S2...)로 변환한 '구조화 프로필'만 전송합니다.
 * - 급우 이름이 섞인 대화 발화도 브라우저에서 익명 ID로 치환된 뒤 도착합니다.
 *
 * 처방 원리:
 * - CASEL 5대 사회정서역량(자기 인식·자기 관리·사회적 인식·관계 기술·책임 있는 의사결정)
 * - 한국형 사회정서교육(SEL) 프로그램 매뉴얼(학교급별)
 * - 강점 기반·비낙인·발달단계 적합·데이터 근거 인용·학생별 차별화
 */

import { selData } from '../src/data/selData.js';
import { verifyRequest } from './_auth.js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const FW = require('../src/data/selFramework.json'); // 교육부 한국형 사회정서교육 프레임워크 색인 (1차 로직)
const SEOUL = require('../src/data/seoulSel.json');   // 서울 사회정서교육 학년별 성취기준·차시 색인 (2차 로직)
const MORAL = require('../src/data/moralCurriculum.json'); // 2022 개정 도덕과 교육과정 (3차 로직: 교과 근거)

// ===== 도덕과 헬퍼 (src/utils/moralCurriculum.js와 동일 로직) =====
const MORAL_INDEX = {}; Object.values(MORAL.standards).forEach(l => l.forEach(s => { MORAL_INDEX[s.code] = s; }));
const moralLevelOf = (selLevel, gradeYear) => {
  const n = Number(gradeYear) || 0;
  if (selLevel === 'middle') return 'middle';
  if (selLevel === 'high') return 'high';
  if (n >= 5) return 'elementary56';
  if (n >= 1 && n <= 4) return 'elementary34';
  return selLevel === 'elementary_low' ? 'elementary34' : 'elementary56';
};
const MORAL_LEVEL_LABEL = { elementary34: '초등 3~4학년군', elementary56: '초등 5~6학년군', middle: '중학교', high: '고등학교 선택과목' };
const moralGuideText = (level, signalTypes, keys) => {
  const acts = []; signalTypes.forEach(t => { const a = MORAL.senselMapping.signalToActivity[t]; if (a && !acts.includes(a)) acts.push(a); });
  const seen = new Set(); const list = [];
  acts.forEach(k => { const act = MORAL.senselMapping.activities.find(a => a.key === k); (act?.codes[level] || []).forEach(c => { if (!seen.has(c) && MORAL_INDEX[c]) { seen.add(c); list.push(MORAL_INDEX[c]); } }); });
  const areas = []; keys.forEach(k => (MORAL.selCrosswalk[k] || []).forEach(a => { if (!areas.includes(a)) areas.push(a); }));
  const pool = (MORAL.standards[level] || []).filter(s => level === 'high' ? ['타인과 관계 맺기', '성찰 대상으로서 나', '다양성과 포용성'].includes(s.area) : areas.includes(s.area));
  pool.forEach(s => { if (!seen.has(s.code) && list.length < 8) { seen.add(s.code); list.push(s); } });
  const ideas = MORAL.areas.filter(a => areas.includes(a.name)).map(a => `- ${a.name}(핵심 가치 ${a.coreValue}): ${a.coreIdeas.join(' / ')}`).join('\n');
  return `[2022 개정 도덕과 교육과정 — ${MORAL_LEVEL_LABEL[level]} 성취기준 (교과 근거로 인용할 것)]\n${list.map(s => `[${s.code}] (${s.area}) ${s.text}${s.note ? ` — 취지: ${s.note.slice(0, 120)}` : ''}`).join('\n') || '(해당 없음)'}\n[도덕과 핵심 아이디어]\n${ideas || '-'}`;
};

// ===== 서울 2차 로직 헬퍼 (src/utils/seoulSel.js와 동일 로직) =====
const seoulGradeLabel = (selLevel, gradeYear) => {
  const n = Number(gradeYear) || 0;
  if (selLevel === 'middle') return `중${n >= 1 && n <= 3 ? n : 1}`;
  if (selLevel === 'high') return `고${n >= 1 && n <= 3 ? n : 1}`;
  if (n >= 1 && n <= 6) return `초${n}`;
  return selLevel === 'elementary_low' ? '초2' : '초5';
};
const seoulLevelOf = (g = '') => ({ '초': 'elementary', '중': 'middle', '고': 'high' }[g[0]] || 'elementary');
const seoulAreasForSignals = (types) => { const out = []; types.forEach(t => (SEOUL.signalToArea[t] || []).forEach(a => { if (!out.includes(a)) out.push(a); })); return out; };
const seoulStandardsFor = (g, areas) => {
  const lv = seoulLevelOf(g); const num = Number(g.slice(1));
  return (SEOUL.standards[lv] || []).filter(s => (lv !== 'elementary' || s.grade === num) && (!areas.length || areas.includes(s.area)));
};
const seoulLessonsFor = (g, areas, limit = 6) => (SEOUL.lessons[g] || []).filter(l => !areas.length || areas.includes(l.area)).slice(0, limit);
const seoulGuideText = (g, areas) => {
  const st = seoulStandardsFor(g, areas).slice(0, 6);
  const ls = seoulLessonsFor(g, areas, 6);
  return `[서울 사회정서교육 ${g} 성취기준 — 처방의 근거 코드로 인용할 것]\n${st.map(s => `[${s.code}] (${s.area}) ${s.text}`).join('\n') || '(해당 없음)'}\n\n[서울 사회정서교육자료 ${g} 관련 차시 — 활동을 변형해 개별 처방에 활용]\n${ls.map(l => `- ${l.seq ? l.seq + '차시 ' : ''}《${l.title}》 기술: ${l.skill || '-'} / 주제: ${l.lessonTopic || l.gradeTopic} / 목표: ${l.goal} / 근거: ${l.standards.join(', ')}`).join('\n') || '(해당 없음)'}`;
};

// ===== 프레임워크 헬퍼 (서버용, src/utils/selFramework.js와 동일 로직) =====
const COMP = {};
FW.domains.forEach(d => d.competencies.forEach(c => { COMP[c.key] = { ...c, domainName: d.name }; }));
const COMP_NAMES = Object.values(COMP).map(c => c.name);
const focusForSignals = (types) => { const out = []; types.forEach(t => (FW.signalMapping[t] || []).forEach(k => { if (!out.includes(k)) out.push(k); })); return out; };
const sessionsFor = (level, keys) => (FW.programIndex[level] || FW.programIndex.elementary_high).filter(sn => !keys.length || sn.competencies.some(k => keys.includes(k)));
const LEVEL_LABEL_SHORT = { elementary_low: '초(저)', elementary_high: '초(고)', middle: '중', high: '고' };
const AREAS = { selfAwareness: ['자기 이해', '감정과 행동'], selfManagement: ['감정과 행동', '성장 목표', '긍정적 사고'], relationshipAwareness: ['타인 이해', '소통과 협력'], relationshipManagement: ['소통과 협력', '관계'], communityValues: ['관계', '소통과 협력', '가치 추구'], mentalHealthAwareness: ['건강과 웰빙', '긍정적 사고'] };
const topicsFor = (level, keys, limit = 8) => {
  const lv = LEVEL_LABEL_SHORT[level] || '초(고)'; const areas = new Set(); keys.forEach(k => (AREAS[k] || []).forEach(a => areas.add(a)));
  return FW.morningTalkTopics.items.filter(t => t.level === lv && (areas.size === 0 || areas.has(t.area))).slice(0, limit).map(t => `${t.area} · ${t.topic}`);
};
/** 지도서 전문에서 특정 차시 본문 발췌 (제목 두 번째 등장 = 본문, 최대 n자) */
const manualExcerpt = (level, title, n = 2600) => {
  const text = selData[level] || '';
  const first = text.indexOf(title); if (first < 0) return '';
  const second = text.indexOf(title, first + title.length);
  const start = second > 0 ? second : first;
  return text.slice(start, start + n).replace(/\s+/g, ' ');
};

const getAiEndpoint = () => {
  if (process.env.VERTEX_API_KEY) {
    return `https://aiplatform.googleapis.com/v1/publishers/google/models/gemini-2.5-flash:generateContent?key=${process.env.VERTEX_API_KEY}`;
  }
  if (process.env.GEMINI_API_KEY) {
    return `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
  }
  return null;
};

const LEVEL_LABEL = {
  elementary_low: '초등 저학년(1~3학년)',
  elementary_high: '초등 고학년(4~6학년)',
  middle: '중학교',
  high: '고등학교',
};

const KSEL_GUIDE = () => `
[처방의 이론적 틀 — 교육부 「한국형 사회정서교육」 4영역·6핵심역량 (2026학년도 전 학교 확대)]
정의: ${FW.definition.ko}
${FW.domains.map(d => `- [${d.name}] ` + d.competencies.map(c => `${c.name}: ${c.elements.join(', ')}`).join(' / ')).join('\n')}

[근거 — KEDI·OECD 사회정서역량 조사(2020) 시사점]
- ${FW.oecdSSES.keyFindings[0]}
- ${FW.oecdSSES.keyFindings[2]}
- ${FW.oecdSSES.implicationForSensel}

[처방 설계 원칙 — 반드시 지킬 것]
A. 근거 인용: 모든 판단은 제공된 데이터(기분, 지목 관계, 갈등·외로움 신호, 대화 발화)를 직접 인용해 뒷받침한다. 데이터에 없는 사실을 지어내지 않는다.
B. 강점 기반·비낙인: "문제아", "산만", "의지 부족" 같은 단정·진단 표현 금지. 학생이 이미 가진 관계 자원(서로 지목한 친구, 이 학생을 지목한 친구)을 적극 활용한다.
C. 학생 보고는 사실이 아닐 수 있다: 갈등·반복 호소 신호는 '학생이 말한 것'이다. 상대 학생을 가해자로 단정하지 말고, 교사의 직접 관찰·확인을 먼저 권한다. 반복 호소 학생에게는 관계인식(관점 취하기)과 공동체 가치(방관자 되지 않기·규칙) 역량을 다룬다.
D. 발달단계 적합: 해당 학교급 학생이 실제로 할 수 있는 활동과 말로 제안한다.
E. 실행 가능성: 담임교사가 교실에서 1주 안에, 추가 예산 없이 실행할 수 있는 수준으로 구체화한다. (언제·어디서·몇 분·무슨 말로) 아래 [활용 가능한 공식 자료]의 차시·아침조회 주제를 변형해 쓰면 좋다.
F. 차별화: [이미 다른 학생에게 제안된 전략]과 제목·핵심 방법이 겹치지 않도록 이 학생의 데이터에 맞는 새로운 각도로 제안한다. 뻔한 "상담하세요", "칭찬하세요"류 일반론 금지.
G. 안전 최우선: 긴급 위기 신호(학교폭력·자해·가정 위험 등)가 있으면 첫 번째 실천은 반드시 당일 안전 확인 면담이며, 전문기관(Wee클래스/Wee센터, 학교폭력 사안 처리 절차, 보호자) 연계 기준을 escalation에 명시한다.
H. 문체: 동료 베테랑 교사가 조언하듯 따뜻하고 전문적인 존댓말. 학생을 지칭할 때는 제공된 익명 ID(S1 등)를 그대로 사용한다(화면에서 실명으로 자동 복원됨).
I. 역량 명칭은 반드시 다음 6개 중에서만 쓴다: ${COMP_NAMES.join(' / ')}
`;

const buildProfileText = (p) => {
  const rel = p.relations || {};
  const fmt = (arr) => (arr && arr.length ? arr.map(x => `${x.id}(${x.gender}/${x.mood}/받은지목${x.received})`).join(', ') : '없음');
  const lines = [];
  lines.push(`- 대상 학생: ${p.id} (성별 ${p.gender}, 현재 기분 '${p.mood}', 위험도 ${p.tier || '미상'}, 학급 ${p.classSize || '?'}명)`);
  lines.push(`- 감지된 신호: ${(p.signals || []).length ? p.signals.map(s => `${s.label}${s.detail ? `(${s.detail})` : ''}${s.ids && s.ids.length ? ` 상대:${s.ids.join(',')}` : ''}`).join(' / ') : '없음'}`);
  lines.push(`- 규칙 기반 1차 초점 역량: ${(p.focus || []).join(', ') || '미정'}`);
  lines.push(`- 서로 지목한 친구(상호): ${fmt(rel.mutual)}`);
  lines.push(`- 이 학생을 지목한 친구(일방): ${fmt(rel.incoming)}`);
  lines.push(`- 이 학생이 지목한 친구(일방): ${fmt(rel.given)}`);
  lines.push(`- 갈등 언급 상대: ${fmt(rel.conflicts)} / 상호 갈등: ${fmt(rel.mutualConflicts)}`);
  lines.push(`- 받은 긍정 지목 수: ${rel.received ?? 0}, 외로움 신호: ${rel.lonelyCount ?? 0}회`);
  if (p.alerts && p.alerts.length) lines.push(`- 위기 알림 기록: ${p.alerts.map(a => a.reason).join(' / ')}`);
  if (p.recentMessages && p.recentMessages.length) {
    lines.push(`- 최근 학생 발화(챗봇에게, 최신순 아님·시간순):`);
    p.recentMessages.forEach(m => lines.push(`  · "${m.text}"`));
  } else {
    lines.push(`- 최근 학생 발화: 없음 (대화 데이터가 적으므로 관계·기분 데이터 중심으로 판단)`);
  }
  return lines.join('\n');
};

const OUTPUT_SCHEMA = `
[출력 형식] 반드시 아래 JSON만 출력 (다른 텍스트·코드블록 금지)
{
  "summary": "관찰 요약 2~3문장. 어떤 데이터가 어떤 신호를 보이는지 구체적으로 인용",
  "hypothesis": "학생의 마음 상태에 대한 조심스러운 가설 1~2문장 ('~일 수 있습니다' 어조, 단정 금지)",
  "strengths": "데이터에서 확인되는 이 학생의 관계 자원·강점 1~2문장 (없으면 잠재 자원)",
  "focus": [ { "competency": "한국형 6핵심역량 명칭 중 하나", "why": "왜 이 역량이 지금 이 학생에게 우선인지 1~2문장" } ],
  "actions": [
    {
      "title": "실천 제목 (10자 내외, 다른 학생과 겹치지 않게)",
      "competency": "관련 한국형 핵심역량 명칭",
      "how": "구체 절차 2~4문장 (언제·어디서·몇 분·어떻게)",
      "script": "교사가 실제로 학생에게 건넬 말 1~2문장 (따옴표 없이)",
      "peers": ["활용할 급우 익명 ID (없으면 빈 배열)"],
      "resource": "활용한 공식 자료 (예: 서울 초5 8~9차시 갈등, 이렇게 해결해요 / 교육부 초(고) 4차시 경청과 공감을 실천해요 / 아침조회 주제: 타인 이해 · 타인의 생각과 느낌) 또는 빈 문자열",
      "standard": "이 실천이 겨냥하는 서울 성취기준 코드 1개 (예: 5사회정서02-03) 또는 빈 문자열",
      "moral": "이 실천이 구현하는 도덕과 성취기준 코드 1개 (예: 6도02-02) 또는 빈 문자열"
    }
  ],
  "standards": ["이 처방 전체가 근거로 삼은 서울 성취기준 코드 1~3개 (제공된 목록에서만)"],
  "moralStandards": ["이 처방이 구현하는 2022 도덕과 성취기준 코드 1~2개 (제공된 목록에서만)"],
  "peerPlan": "또래 자원(상호 지목·받은 지목 친구)을 활용한 관계 연결 계획 1~2문장. 자리·모둠·역할 배치 제안 포함",
  "caution": "이 학생에게 특히 피해야 할 접근 1~2문장",
  "checkpoints": ["1주 후 확인할 관찰 지표 2~3개 (측정 가능하게)"],
  "escalation": "전문기관·보호자 연계가 필요한 기준 1문장 (긴급이 아니면 '해당 없음' 대신 예방적 기준을 적을 것)"
}
- focus는 1~2개, actions는 정확히 3개. 3개의 actions는 서로 다른 역량 또는 서로 다른 장면(개별 면담 / 수업·활동 / 또래·환경 조정)을 다룰 것.
`;

export default async function handler(req, res) {
  if (req.method === 'GET') {
    return res.status(200).json({ ok: true, service: 'gemini-prescription', keyConfigured: !!(process.env.VERTEX_API_KEY || process.env.GEMINI_API_KEY) });
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 인증: 교사(구글 로그인) 전용
  const authResult = await verifyRequest(req, { teacherOnly: true });
  if (!authResult.ok) return res.status(authResult.status).json({ error: authResult.error });

  const aiEndpoint = getAiEndpoint();
  if (!aiEndpoint) {
    return res.status(500).json({ error: 'VERTEX_API_KEY 또는 GEMINI_API_KEY가 설정되지 않았습니다.' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const { profile, selLevel, gradeYear, avoidStrategies, teacherNote, contents } = body;

    // 학교급: 교사 설정이 없으면 초등 고학년을 기본값으로 (별도 설정 없이도 동작)
    const level = selLevel && selData[selLevel] ? selLevel : 'elementary_high';

    // ===== 구버전 호환 (contents 직접 전달) =====
    if (!profile && Array.isArray(contents)) {
      const legacySystem = `너는 초·중·고 교사를 돕는 따뜻하고 전문적인 교육 상담 AI 멘토야. 사회정서학습(SEL) 이론에 기반하여 실질적이고 구체적인 지도 조언 3가지를 핵심만 요약해서 존댓말로 제공해.\n${KSEL_GUIDE()}`;
      const r = await fetch(aiEndpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ systemInstruction: { parts: [{ text: legacySystem }] }, contents })
      });
      const d = await r.json();
      return res.status(r.ok ? 200 : r.status).json(d);
    }

    if (!profile || typeof profile !== 'object' || !profile.id) {
      return res.status(400).json({ error: 'profile이 필요합니다.' });
    }

    const avoid = Array.isArray(avoidStrategies) ? avoidStrategies.filter(x => typeof x === 'string').slice(0, 40) : [];

    // 초점 역량(규칙 기반) → 관련 차시·아침조회 주제·지도서 발췌만 선택적으로 제공 (전문 주입 대신)
    const signalTypes = (profile.signals || []).map(sg => sg.type);
    const focusKeys = focusForSignals(signalTypes);
    const keys = focusKeys.length ? focusKeys : ['selfAwareness'];
    const sessions = sessionsFor(level, keys);
    const topics = topicsFor(level, keys);
    const excerpts = sessions.slice(0, 2).map(sn => `《${LEVEL_LABEL[level]} ${sn.session}차시 ${sn.title}》 ${manualExcerpt(level, sn.title)}`).join('\n\n');
    // 서울 2차 로직: 학년별 성취기준 + 차시 (신호 → 영역)
    const gradeLabel = seoulGradeLabel(level, gradeYear);
    const seoulAreas = seoulAreasForSignals(signalTypes);
    const seoulText = seoulGuideText(gradeLabel, seoulAreas);
    const moralLevel = moralLevelOf(level, gradeYear);
    const moralText = moralGuideText(moralLevel, signalTypes, keys);

    let systemText = `너는 사회정서교육(SEL) 전문 장학사이자 20년차 담임교사 멘토야. 담임교사가 학생 한 명을 위한 이번 주 맞춤 지도 계획을 세울 수 있도록, 제공된 데이터를 근거로 개별화된 처방을 작성해.\n`;
    systemText += `대상 학교급: ${LEVEL_LABEL[level]}\n`;
    systemText += KSEL_GUIDE();
    systemText += `\n[이 학생의 규칙 기반 초점 역량] ${keys.map(k => COMP[k].name).join(', ')}\n`;
    systemText += `\n[활용 가능한 공식 자료 — 교육부 한국형 사회정서교육 프로그램 ${LEVEL_LABEL[level]}]\n`;
    systemText += `- 관련 차시: ${sessions.map(sn => `${sn.session}차시 ${sn.title}(${sn.competencies.map(k => COMP[k].name).join('·')})`).join(' / ') || '없음'}\n`;
    systemText += `- 아침조회 대화 주제(교육부 2026): ${topics.join(' / ') || '없음'}\n`;
    if (excerpts) systemText += `\n[지도서 발췌 — 활동을 변형해 개별 처방에 활용]\n${excerpts}\n`;
    systemText += `\n[2차 로직 — 서울특별시교육청 사회정서교육자료 (${gradeLabel})]\n이 학년에서 실제로 가르치는 성취기준과 차시입니다. 처방의 focus·actions는 가능한 한 아래 성취기준 코드로 근거를 밝히고, 차시 활동을 개별 학생용으로 변형해 제안하세요.\n${seoulText}\n`;
    systemText += `\n[3차 로직 — 교과 근거]\n${moralText}\n담임교사가 이 처방을 도덕(또는 통합교과·창체) 수업과 연결할 수 있도록, 각 실천에 도덕과 성취기준 코드(moral)를 붙이세요. 초1~2 학급이면 3~4학년군 코드를 '다음 학년군 연계'로 씁니다.\n`;

    let userText = `[학생 데이터 (익명화)]\n${buildProfileText(profile)}\n`;
    if (avoid.length) {
      userText += `\n[이미 다른 학생에게 제안된 전략 — 제목·핵심 방법 중복 금지]\n${avoid.map(a => `- ${a}`).join('\n')}\n`;
    }
    if (teacherNote && typeof teacherNote === 'string' && teacherNote.trim()) {
      userText += `\n[교사 추가 메모 (선택)]\n${teacherNote.trim().slice(0, 600)}\n`;
    }
    userText += OUTPUT_SCHEMA;

    const requestBody = {
      systemInstruction: { parts: [{ text: systemText }] },
      contents: [{ role: 'user', parts: [{ text: userText }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.75,
      },
    };

    const response = await fetch(aiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      console.error('Gemini API Response Error:', response.status, errText);
      return res.status(500).json({ error: `Gemini API 호출 실패 (상태 ${response.status})` });
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    let parsed = null;
    try { parsed = JSON.parse(text); } catch {
      const m = text.match(/\{[\s\S]*\}/);
      if (m) { try { parsed = JSON.parse(m[0]); } catch { parsed = null; } }
    }
    if (!parsed || !Array.isArray(parsed.actions)) {
      console.error('처방 파싱 실패:', text.slice(0, 300));
      return res.status(500).json({ error: 'AI 응답을 해석할 수 없습니다. 다시 시도해주세요.' });
    }

    // 성취기준 코드 검증: 제공 목록에 없는 코드는 제거
    const validCodes = new Set(seoulStandardsFor(gradeLabel, []).map(s => s.code));
    if (Array.isArray(parsed.standards)) parsed.standards = parsed.standards.filter(c => validCodes.has(c)).slice(0, 3);
    parsed.actions.forEach(a => { if (a && a.standard && !validCodes.has(a.standard)) a.standard = ''; });
    const validMoral = new Set((MORAL.standards[moralLevel] || []).map(s => s.code));
    if (Array.isArray(parsed.moralStandards)) parsed.moralStandards = parsed.moralStandards.filter(c => validMoral.has(c)).slice(0, 2); else parsed.moralStandards = [];
    parsed.actions.forEach(a => { if (a && a.moral && !validMoral.has(a.moral)) a.moral = ''; });
    return res.status(200).json({ prescription: parsed, level, gradeLabel, moralLevel });
  } catch (error) {
    console.error('Gemini Prescription Error:', error);
    return res.status(500).json({ error: `서버 처리 중 오류: ${error.message || 'Unknown error'}` });
  }
}
