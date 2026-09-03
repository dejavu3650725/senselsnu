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

const CASEL_GUIDE = `
[CASEL 5대 사회정서역량 — 처방의 이론적 틀]
1. 자기 인식(Self-awareness): 자신의 감정·생각·가치·강점을 정확히 알아차리기. (감정 이름 붙이기, 감정 온도계, 강점 찾기)
2. 자기 관리(Self-management): 감정·충동·스트레스를 조절하고 목표를 향해 행동하기. (호흡·진정 루틴, 작은 목표, 자기 점검표)
3. 사회적 인식(Social awareness): 타인의 관점·감정을 이해하고 공감하며 다양성을 존중하기. (관점 바꾸기, 표정·상황 읽기, 공감 대화)
4. 관계 기술(Relationship skills): 경청·명확한 의사소통·협력·갈등 해결·도움 요청. (짝 활동, 역할 부여, 갈등 중재 대화, 도움 요청 연습)
5. 책임 있는 의사결정(Responsible decision-making): 결과를 예측하고 안전·윤리를 고려해 건설적으로 선택하기. (선택-결과 따져보기, 사과·회복 계획)

[처방 설계 원칙 — 반드시 지킬 것]
A. 근거 인용: 모든 판단은 제공된 데이터(기분, 지목 관계, 갈등·외로움 신호, 대화 발화)를 직접 인용해 뒷받침한다. 데이터에 없는 사실을 지어내지 않는다.
B. 강점 기반·비낙인: "문제아", "산만", "의지 부족" 같은 단정·진단 표현 금지. 학생이 이미 가진 관계 자원(서로 지목한 친구, 이 학생을 지목한 친구)을 적극 활용한다.
C. 발달단계 적합: 해당 학교급 학생이 실제로 할 수 있는 활동과 말로 제안한다.
D. 실행 가능성: 담임교사가 교실에서 1주 안에, 추가 예산 없이 실행할 수 있는 수준으로 구체화한다. (언제·어디서·몇 분·무슨 말로)
E. 차별화: 아래 [이미 다른 학생에게 제안된 전략]과 제목·핵심 방법이 겹치지 않도록 이 학생의 데이터에 맞는 새로운 각도로 제안한다. 뻔한 "상담하세요", "칭찬하세요"류 일반론 금지.
F. 안전 최우선: 긴급 위기 신호(학교폭력·자해·가정 위험 등)가 있으면 첫 번째 실천은 반드시 당일 안전 확인 면담이며, 전문기관(Wee클래스/Wee센터, 학교폭력 사안 처리 절차, 보호자) 연계 기준을 escalation에 명시한다.
G. 문체: 동료 베테랑 교사가 조언하듯 따뜻하고 전문적인 존댓말. 학생을 지칭할 때는 제공된 익명 ID(S1 등)를 그대로 사용한다(화면에서 실명으로 자동 복원됨).
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
  "focus": [ { "competency": "CASEL 역량명(위 5개 중)", "why": "왜 이 역량이 지금 이 학생에게 우선인지 1~2문장" } ],
  "actions": [
    {
      "title": "실천 제목 (10자 내외, 다른 학생과 겹치지 않게)",
      "competency": "관련 CASEL 역량명",
      "how": "구체 절차 2~4문장 (언제·어디서·몇 분·어떻게)",
      "script": "교사가 실제로 학생에게 건넬 말 1~2문장 (따옴표 없이)",
      "peers": ["활용할 급우 익명 ID (없으면 빈 배열)"]
    }
  ],
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
    const { profile, selLevel, avoidStrategies, teacherNote, contents } = body;

    // 학교급: 교사 설정이 없으면 초등 고학년을 기본값으로 (별도 설정 없이도 동작)
    const level = selLevel && selData[selLevel] ? selLevel : 'elementary_high';

    // ===== 구버전 호환 (contents 직접 전달) =====
    if (!profile && Array.isArray(contents)) {
      const legacySystem = `너는 초·중·고 교사를 돕는 따뜻하고 전문적인 교육 상담 AI 멘토야. 사회정서학습(SEL) 이론에 기반하여 실질적이고 구체적인 지도 조언 3가지를 핵심만 요약해서 존댓말로 제공해.\n${CASEL_GUIDE}`;
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

    let systemText = `너는 사회정서학습(SEL) 전문 장학사이자 20년차 담임교사 멘토야. 담임교사가 학생 한 명을 위한 이번 주 맞춤 지도 계획을 세울 수 있도록, 제공된 데이터를 근거로 개별화된 처방을 작성해.\n`;
    systemText += `대상 학교급: ${LEVEL_LABEL[level]}\n`;
    systemText += CASEL_GUIDE;
    systemText += `\n[한국형 사회정서교육(SEL) 프로그램 매뉴얼 — ${LEVEL_LABEL[level]}]\n아래 매뉴얼의 활동·용어·발달단계 설명을 처방에 자연스럽게 녹여 사용해(활동명을 인용해도 좋음):\n${selData[level]}`;

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

    return res.status(200).json({ prescription: parsed, level });
  } catch (error) {
    console.error('Gemini Prescription Error:', error);
    return res.status(500).json({ error: `서버 처리 중 오류: ${error.message || 'Unknown error'}` });
  }
}
