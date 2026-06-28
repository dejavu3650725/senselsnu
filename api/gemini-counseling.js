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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY is not configured.' });
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

[데이터 추출 원칙 - 매우 중요]
학생의 대답에서 '특정 친구(닉네임)'가 지목된 것을 확인했다면, 너의 응답 텍스트 맨 마지막 줄에 반드시 아래와 같은 형식의 태그를 추가해야 해.
[NOMINATION: 지목된친구닉네임]
예를 들어 학생이 "고민 많은 타이거랑 짝꿍하고 싶어"라고 했다면, 응답 끝에 [NOMINATION: 고민 많은 타이거] 라고 적어. 여러 명이면 각각 태그를 여러 개 적어도 좋아.

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
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
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
