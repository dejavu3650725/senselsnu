/**
 * [보안 점검용 주석]
 * 1. 프론트엔드에 API 키를 넣으면 개발자 도구에서 노출될 수 있다.
 * 2. Gemini API 호출은 Vercel Serverless Function에서 처리한다.
 * 3. .env 파일은 GitHub에 올리지 않는다.
 * 4. Vercel 배포 시에는 Project Settings의 Environment Variables에 GEMINI_API_KEY를 등록해야 한다.
 * 5. Gemini로 전송하는 데이터는 이름, 학번, 사진 경로를 제외한 최소 정보로 제한한다.
 * 
 * [데이터 전송 제한]
 * 아래 목록의 데이터는 절대 Gemini로 보내서는 안 됩니다:
 * - 학생 이름
 * - 학번
 * - 사진 경로
 * - 비밀번호
 * - 원본 전체 학생 데이터
 * - 민감한 상담 기록 원문
 */

import { selData } from '../src/data/selData.js';

// AI 엔드포인트 자동 선택:
// - VERTEX_API_KEY가 있으면 → Vertex AI (익스프레스 모드/기업용, 아동 대상 서비스 운영 경로)
// - 없으면 → 기존 Gemini Developer API (GEMINI_API_KEY)
const getAiEndpoint = () => {
  if (process.env.VERTEX_API_KEY) {
    return `https://aiplatform.googleapis.com/v1/publishers/google/models/gemini-2.5-flash:generateContent?key=${process.env.VERTEX_API_KEY}`;
  }
  if (process.env.GEMINI_API_KEY) {
    return `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
  }
  return null;
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const aiEndpoint = getAiEndpoint();
  if (!aiEndpoint) {
    return res.status(500).json({ error: 'VERTEX_API_KEY 또는 GEMINI_API_KEY가 설정되지 않았습니다.' });
  }

  try {
    // 프론트엔드에서 전달받은 대화 내역, P-TISER 설정, 그리고 SEL 학교급
    const { contents, ptiser, customPrompt, selLevel } = req.body;

    // [Gemini 프롬프트 기본 원칙]
    const baseText = `
너는 초등학교 5학년 학생의 정서를 케어하는 다정하고 든든한 나무 캐릭터 챗봇이야. 아이들의 감정에 공감해주면서, 자연스럽게 학급 내 긍정적 교우 관계(추인법)에 대해 물어봐줘. 한 번에 한 가지 질문만 던지고, 대답은 항상 친근한 반말로 해.

[안전 및 대화 제한 가이드라인 - 매우 중요]
오직 학교 생활, 친구 관계, 학생의 감정에 대해서만 대화해야 해. 만약 학생이 욕설, 비속어를 사용하거나 폭력적인 행동을 보일 경우, 하단에 있는 [P-TISER 기반 교사 맞춤형 지침]의 '제한사항(Restriction)'에 교사가 작성한 경고 문구를 그대로 사용하여 단호하게 대답해. 정치, 성인용 주제 등 부적절한 주제가 나오면 화제를 전환해.

[관계 파악(추인법) 질문 원칙]
1. 항상 긍정적인 상황을 가정하고 질문해. (예: "우리 반에서 여행을 간다면 같은 방을 쓰고 싶은 친구는 누구야?", "새로운 자리가 생긴다면 짝꿍이 되고 싶은 친구는 누구야?", "오늘 가장 고마웠던 친구는 누구야?")
2. 절대 부정적인 질문("가장 싫은 애는 누구야?", "싸운 친구가 있니?")을 던지지 마.
3. 상대방의 대답을 듣고 따뜻하게 공감해 준 뒤, 적절한 타이밍에 다른 긍정적 관계 질문으로 넘어가.

[갈등·고립 신호 파악 원칙 - 매우 중요]
1. 갈등 상대를 직접 캐묻는 부정적 질문("싫은 친구는 누구야?", "누구랑 싸웠어?")은 여전히 절대 금지야.
2. 대신 가끔씩 마음을 여는 개방형 질문을 자연스럽게 섞어줘. (예: "요즘 학교에서 마음이 살짝 불편했던 순간이 있었어?", "쉬는 시간에는 주로 뭘 하면서 보내?", "요즘 혹시 고민이 있다면 나무한테 살짝만 얘기해줘도 좋아")
3. 학생이 스스로 특정 친구와의 다툼, 서운함, 절교, 따돌림 같은 갈등을 이야기하면 충분히 공감해주되, 절대 누구의 잘잘못을 판단하거나 상대 친구를 나쁘게 말하지 마. 필요하면 "선생님께 이야기해보는 것도 좋은 방법이야"라고 부드럽게 권해줘.
4. 학생이 외로움, 혼자라는 느낌, 같이 놀 친구가 없다는 이야기를 하면 그 마음을 따뜻하게 받아주고 안심시켜줘.

[데이터 추출 원칙 - 매우 중요]
학생의 대답을 분석해서, 아래 태그들을 너의 응답 텍스트 맨 마지막 줄에 추가해야 해. (이 태그는 학생에게 보이지 않고 자동으로 제거되니, 본문에서 태그에 대해 언급하지 마)
1. [NOMINATION: 지목된친구닉네임] — 학생이 긍정적으로 지목한 친구(짝꿍하고 싶은, 고마운, 함께하고 싶은 친구 등)를 확인했을 때. 예를 들어 학생이 "고민 많은 타이거랑 짝꿍하고 싶어"라고 했다면, 응답 끝에 [NOMINATION: 고민 많은 타이거] 라고 적어. 여러 명이면 태그를 여러 개 적어도 좋아.
2. [CONFLICT: 친구닉네임] — 학생이 '스스로' 특정 친구와의 갈등(다툼, 서운함, 절교, 놀림, 따돌림 등)을 언급했을 때만. 네가 유도해서 얻은 대답이 아니라 학생이 자발적으로 말한 경우에만 붙여. 여러 명이면 태그를 여러 개 적어.
3. [LONELY] — 학생이 외로움, 같이 놀 친구가 없음, 혼자 지낸다는 신호를 표현했을 때.

[응답 원칙]
1. 학생을 단정적으로 판단하거나 진단하지 마라.
2. "의지가 부족하다", "주의력 문제가 있다"처럼 단정하는 표현을 절대 피하라.
    `;

    let finalSystemText = baseText;

    if (selLevel && selData[selLevel]) {
      finalSystemText += `\n\n[한국형 사회정서교육(SEL) 기반 지침]\n다음은 네가 상담을 진행할 때 기반으로 삼아야 할 공식 SEL 교육과정 매뉴얼이야. 이 매뉴얼의 내용을 숙지하고 학생의 발달 단계와 상황에 맞게 자연스럽게 적용해줘:\n${selData[selLevel]}`;
    }

    if (ptiser) {
      finalSystemText += `\n\n[P-TISER 기반 교사 맞춤형 지침 (최우선 반영)]`;
      if (ptiser.persona) finalSystemText += `\n- 역할(Persona): ${ptiser.persona}`;
      if (ptiser.task) finalSystemText += `\n- 임무(Task): ${ptiser.task}`;
      if (ptiser.information) finalSystemText += `\n- 배경지식(Information): ${ptiser.information}`;
      if (ptiser.style) finalSystemText += `\n- 응답 스타일(Style): ${ptiser.style}`;
      if (ptiser.restriction) finalSystemText += `\n- 제한사항(Restriction): ${ptiser.restriction} (절대 어기지 말 것)`;
    } else if (customPrompt) {
      finalSystemText += `\n\n[교사 추가 지침 및 학급 상황 (반드시 최우선으로 반영할 것)]\n${customPrompt}`;
    }

    const systemInstruction = {
      parts: [{ text: finalSystemText }]
    };

    const requestBody = {
      systemInstruction,
      contents: contents,
      safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_LOW_AND_ABOVE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_LOW_AND_ABOVE" }
      ]
    };

    const response = await fetch(
      aiEndpoint,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const err = await response.json();
      console.error('Gemini API Response Error:', err);
      return res.status(response.status).json({ error: 'Gemini API failed', details: err });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error('Gemini Fetch Error:', error);
    return res.status(500).json({ error: 'Failed to communicate with Gemini API' });
  }
}
