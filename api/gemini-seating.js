/**
 * [AI 자리 배치 제안] Vercel Serverless Function
 *
 * 보안 및 개인정보 보호 원칙:
 * 1. API 키는 코드에 쓰지 않고 환경 변수(process.env.GEMINI_API_KEY)로만 읽는다.
 * 2. 프론트엔드는 학생의 실명/닉네임을 절대 보내지 않는다.
 *    - 전송 전 익명 ID(S1, S2, ...)로 변환된 데이터만 이 함수에 도착한다.
 *    - Gemini에는 기분 상태와 익명 ID 간의 관계(지목) 정보만 전달된다.
 * 3. 대화 내용 원문, 학번, 사진 등은 전송하지 않는다.
 */

export default async function handler(req, res) {
  // 자가진단: 브라우저 주소창에서 /api/gemini-seating 을 열면(GET) 함수 상태를 보여줌
  if (req.method === 'GET') {
    return res.status(200).json({
      ok: true,
      service: 'gemini-seating',
      keyConfigured: !!process.env.GEMINI_API_KEY,
      hint: 'keyConfigured가 false면 GEMINI_API_KEY 환경 변수를 등록하고 재배포하세요.'
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY is not configured.' });
  }

  try {
    // req.body가 문자열로 오는 환경(일부 로컬 실행) 대비
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const { rows, cols, students } = body;

    // 요청 형식 검증
    if (
      !Number.isInteger(rows) || !Number.isInteger(cols) ||
      rows < 1 || cols < 1 || rows > 12 || cols > 12 ||
      !Array.isArray(students) || students.length === 0 || students.length > 100
    ) {
      return res.status(400).json({ error: 'Invalid request body' });
    }

    const studentLines = students.map(s =>
      `- ${String(s.id)}: 성별=${s.gender === '남' || s.gender === '여' ? s.gender : '미상'}, 기분=${String(s.mood || '보통')}, 긍정 지목한 친구=[${(Array.isArray(s.chosen) ? s.chosen : []).map(String).join(', ') || '없음'}], 받은 긍정 지목 수=${Number(s.received) || 0}, 갈등 신호 상대=[${(Array.isArray(s.conflictWith) ? s.conflictWith : []).map(String).join(', ') || '없음'}], 외로움 신호 횟수=${Number(s.lonely) || 0}`
    ).join('\n');

    const prompt = `
너는 초등학교 담임교사를 돕는 학급 자리 배치 전문가야. 사회정서학습(SEL) 관점에서 학생들의 정서 상태와 교우 관계 데이터를 분석해 최적의 자리 배치를 제안해줘.

[교실 구조]
- 좌석은 ${rows}행(row) x ${cols}열(col) 격자야. 좌석 수는 총 ${rows * cols}개.
- row 0 이 칠판/교탁과 가장 가까운 맨 앞줄이고, row가 커질수록 뒤쪽이야.
- col 0 이 왼쪽 끝, col이 커질수록 오른쪽이야.

[학생 데이터] (개인정보 보호를 위해 익명 ID로 표기됨)
${studentLines}

[배치 원칙 - 중요한 순서대로]
1. (최우선) '갈등 신호 상대'로 연결된 두 학생은 절대 옆자리·앞뒤·대각선으로 인접하게 배치하지 마. 가능한 한 서로 멀리 떨어뜨리되, 두 학생 모두 교사가 관찰할 수 있는 위치를 고려해.
2. 기분이 '힘듦'인 학생은 교사가 관찰하고 지원하기 쉬운 앞쪽(row 0~1)에 배치하되, '힘듦' 학생끼리 뭉치지 않게 분산해.
3. 받은 긍정 지목 수가 0이거나 외로움 신호가 있는 학생(고립 위험군)은 받은 지목이 많고 기분이 '건강'하며 갈등 신호가 없는 학생의 바로 옆자리에 배치해서 자연스러운 교류를 유도해. 외로움 신호 횟수가 많을수록 우선적으로 배려해.
4. 서로를 긍정 지목한(상호 지목) 쌍은 가급적 옆자리나 앞뒤로 인접하게 배치해 정서적 안정감을 줘.
5. 기분이 '건강'한 학생들은 특정 구역에 몰리지 않게 교실 전체에 고르게 분산해.
5-1. 남학생과 여학생이 특정 구역에 몰리지 않도록 고르게 섞어 배치해.
6. 모든 학생을 반드시 한 자리씩 배치해. (학생 수가 좌석 수보다 많으면 위 원칙의 우선순위가 높은 학생부터 배치)
7. 같은 좌석(row, col)에 두 명을 배치하는 것은 절대 금지.

[출력 형식]
반드시 아래 형식의 JSON만 출력해. 다른 텍스트를 붙이지 마.
{
  "assignments": [ { "id": "S1", "row": 0, "col": 0 }, ... ],
  "rationale": "전체 배치의 근거를 교사에게 설명하는 3~5문장 (존댓말)",
  "highlights": [ { "id": "S2", "reason": "이 학생을 이 위치에 배치한 구체적 근거 1~2문장 (존댓말)" } ]
}
- highlights에는 배치에 특별한 의도가 있는 학생 3~5명만 골라서 담아. 특히 갈등 분리 배치와 고립·외로움 학생 배려 배치는 반드시 highlights에 포함하고 그 이유를 설명해.
- rationale과 reason에서 학생을 지칭할 때도 익명 ID(S1 등)를 그대로 사용해. (화면에서 실명으로 자동 변환됨)
`;

    const requestBody = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.4
      }
    };

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      console.error('Gemini API Response Error:', response.status, errText);
      return res.status(500).json({ error: `Gemini API 호출 실패 (상태 ${response.status}). API 키가 유효한지 확인해주세요.` });
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // JSON 파싱 (모델이 코드블록 등을 붙였을 경우 대비)
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      try {
        const match = text.match(/\{[\s\S]*\}/);
        parsed = match ? JSON.parse(match[0]) : null;
      } catch {
        parsed = null;
      }
    }
    if (!parsed) {
      console.error('AI 응답 파싱 실패:', text.slice(0, 300));
      return res.status(500).json({ error: 'AI 응답을 해석할 수 없습니다. 다시 시도해주세요.' });
    }

    if (!Array.isArray(parsed.assignments)) {
      return res.status(500).json({ error: 'AI가 유효한 배치안을 생성하지 못했습니다. 다시 시도해주세요.' });
    }

    return res.status(200).json(parsed);
  } catch (error) {
    console.error('Gemini Seating Error:', error);
    return res.status(500).json({ error: `서버 처리 중 오류: ${error.message || 'Unknown error'}` });
  }
}
