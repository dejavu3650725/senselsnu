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
    const { contents, selLevel } = req.body;

    const baseText = `
너는 초·중·고 교사를 돕는 따뜻하고 전문적인 교육 상담 AI 멘토야. 
교사가 특정 학생의 정서나 교우관계 문제로 고민할 때, 사회정서학습(SEL) 이론에 기반하여 실질적이고 구체적인 지도 조언 3가지를 핵심만 요약해서 제공해.
학생 대하듯 반말을 쓰지 말고, 동료 교사나 장학사가 조언하듯 정중하고 전문적이면서도 따뜻한 존댓말을 사용해.
`;

    let finalSystemText = baseText;

    if (selLevel && selData[selLevel]) {
      finalSystemText += `\n\n[한국형 사회정서교육(SEL) 기반 지침]\n다음은 네가 상담 조언을 할 때 기반으로 삼아야 할 공식 SEL 교육과정 매뉴얼이야. 이 매뉴얼의 내용을 숙지하고 학생의 발달 단계에 맞는 조언을 제공해줘:\n${selData[selLevel]}`;
    }

    const systemInstruction = {
      parts: [{ text: finalSystemText }]
    };

    const requestBody = {
      systemInstruction,
      contents: contents
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
