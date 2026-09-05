/**
 * 공식 서식 .docx 생성 — 서울시교육청 동의 안내 양식·서면 심의/보고 양식을 학급 정보로 채워
 * 한컴오피스(HWP)·MS Word에서 열어 학교 양식에 맞게 수정할 수 있는 문서로 내려받는다.
 * docx 라이브러리는 필요할 때만 동적 로드.
 */
import forms from '../data/officialForms.json' with { type: 'json' };

export const FORMS = forms;

const today = () => { const d = new Date(); return `${d.getFullYear()}. ${String(d.getMonth() + 1).padStart(2, '0')}. ${String(d.getDate()).padStart(2, '0')}.`; };

const loadDocx = () => import('docx');

const mk = (D) => {
  const { Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, HeadingLevel, BorderStyle } = D;
  const p = (text, opt = {}) => new Paragraph({ alignment: opt.align || AlignmentType.LEFT, spacing: { after: opt.after ?? 120 }, children: [new TextRun({ text, bold: !!opt.bold, size: opt.size || 22, underline: opt.underline ? {} : undefined })] });
  const h = (text) => new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 240, before: 120 }, children: [new TextRun({ text, bold: true, size: 36 })] });
  const cell = (text, opt = {}) => new TableCell({ width: opt.width ? { size: Math.round(90 * opt.width), type: WidthType.DXA } : undefined, shading: opt.shade ? { fill: 'EDF2F7' } : undefined, verticalAlign: 'center', children: (Array.isArray(text) ? text : [text]).map(t => new Paragraph({ alignment: opt.center ? AlignmentType.CENTER : AlignmentType.LEFT, spacing: { after: 60 }, children: [new TextRun({ text: String(t), bold: !!opt.bold, size: opt.size || 20 })] })) });
  const table = (rows, widths) => {
    const n = rows[0]?.length || 1;
    const pct = widths || Array(n).fill(100 / n);
    return new Table({ width: { size: 9000, type: WidthType.DXA }, columnWidths: pct.map(w => Math.round(90 * w)), rows: rows.map(r => new TableRow({ children: r.map((c, i) => (c instanceof TableCell ? c : cell(c, { width: pct[i] }))) })) });
  };
  const blank = () => p('', { after: 80 });
  return { p, h, cell, table, blank, Paragraph, TextRun, AlignmentType, BorderStyle };
};

const download = async (D, doc, filename) => {
  const blob = await D.Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
};

/** 개인정보 수집·이용·제공 동의 안내(유형 2 전용 통합 안내 형식, 센셀 항목 기입) */
export const downloadConsentDocx = async ({ schoolName = '○○학교', className = '', teacherName = '', storeTranscripts = false, committeeApproved = false, dueDate = 'OO월 OO일(요일)' }) => {
  const D = await loadDocx(); const { p, h, cell, table, blank, AlignmentType } = mk(D);
  const g = forms.consentGuide.template; const e = forms.senselEntry;
  const children = [
    p(schoolName, { align: AlignmentType.RIGHT, size: 20 }),
    h(g.title.replace('(예시)', '')),
    ...g.intro.map(t => p(t)),
    p(`법적 근거: ${forms.consentGuide.legalBasis}`, { size: 20 }),
    committeeApproved ? p('※ 본 학습지원 소프트웨어는 학교운영위원회 심의를 거쳤습니다.', { size: 20 }) : p('※ 학습지원 소프트웨어 선정 심의 대상 여부와 관계없이 개인정보 동의 절차는 별개로 진행합니다.', { size: 20 }),
    p(`안내 사항을 충분히 읽어보신 후, 각 항목의 동의 여부를 체크하여 ${dueDate}까지 제출해 주시기 바랍니다.`),
    blank(),
    table([
      [cell(g.columns[0], { shade: true, bold: true, center: true, width: 18 }), cell(g.columns[1], { shade: true, bold: true, center: true, width: 82 })],
      [cell(e.name, { bold: true, center: true, width: 18 }), cell([
        `1. 수집·이용 목적: ${e.collect.purpose}`,
        `2. 수집 항목: ${storeTranscripts ? e.collect.itemsWithTranscript : e.collect.items}`,
        `3. 보유 및 이용 기간: ${e.collect.period}`,
        `4. ${e.collect.refusal}`,
        '',
        g.consentLine,
        '',
        '◆ 개인정보의 제3자 제공 고지',
        `   ${e.thirdParty.text}`,
        '',
        '◆ 개인정보 국외 이전 고지',
        `1. 개인정보를 이전받는 자: ${e.overseas.receiver}`,
        `2. 이전되는 국가, 시기 및 방법: ${e.overseas.whenHow}`,
        `3. 이전되는 개인정보 항목: ${e.overseas.items}`,
        `4. 보유 및 이용 기간: ${e.overseas.period}`,
        '',
        `◆ ${e.processor}`,
        `◆ ${e.rights}`,
      ], { width: 82 })],
    ]),
    blank(),
    p(`※ ${forms.consentGuide.under14}`, { bold: true, size: 20 }),
    blank(),
    ...g.signature.map(t => p(t, { align: AlignmentType.CENTER })),
    blank(),
    p(today(), { align: AlignmentType.CENTER }),
    p(`${schoolName}장 귀하`, { align: AlignmentType.CENTER, bold: true, size: 26 }),
    blank(),
    p(`담당: ${className ? className + ' ' : ''}${teacherName || '담임교사'} · 출처: 서울시교육청 창의미래교육과 「개인정보 수집·이용·제공 동의서 관련 안내」 예시 양식을 바탕으로 작성`, { size: 16 }),
  ];
  const doc = new D.Document({ sections: [{ children }] });
  await download(D, doc, `개인정보_수집이용제공_동의안내_센셀_${className || '학급'}.docx`);
};

/** 서식 1~3 (서면 심의 안건·결의서·결과 송부) 한 파일 */
export const downloadCommitteeDocx = async ({ schoolName = '○○학교', principal = '○○○', teacherName = '○○○' }) => {
  const D = await loadDocx(); const { p, h, cell, table, blank, AlignmentType, Paragraph } = mk(D);
  const f1 = forms.committeeForms.form1, f2 = forms.committeeForms.form2, f3 = forms.committeeForms.form3;
  const pageBreak = () => new Paragraph({ pageBreakBefore: true, children: [] });
  const children = [
    p(`[${f1.name}]  ※ ${forms.committeeForms.note}`, { size: 18 }),
    h(f1.title),
    table([[cell('안건번호', { shade: true, center: true, width: 15 }), cell('제   호', { width: 25 }), cell('제안연월일', { shade: true, center: true, width: 20 }), cell(today(), { width: 40 })],
           [cell('', { width: 15 }), cell('', { width: 25 }), cell('제출자 / 담당자', { shade: true, center: true, width: 20 }), cell(`학교장 ${principal} / 교사 ${teacherName}`, { width: 40 })]]),
    blank(),
    p(`□ 안건명: ${f1.agenda}`, { bold: true, size: 24 }),
    p('1. 제안사유', { bold: true }),
    ...f1.reasons.map((r, i) => p(`  ${['가', '나', '다'][i]}. ${r.replace('○○○학교', schoolName)}`)),
    p('2. 제안내용', { bold: true }),
    p(`  - ${f1.content}`),
    table([
      f1.tableColumns.map(c => cell(c, { shade: true, bold: true, center: true })),
      [cell('센셀(SEN-SEL) — 학급 사회정서교육·생활교육 도우미 (AI 챗봇·소시오그램·자리 배치·맞춤 처방)'), cell('필수 기준(개인정보보호법 5항목) 충족 여부 확인 — [도입 점검] 화면 참조', { center: true }), cell('교육부 한국형 사회정서교육·서울 사회정서교육 성취기준에 근거한 학급 사회정서교육 운영에 필요')],
      [cell(''), cell(''), cell('')],
    ], [45, 20, 35]),
    p(`※ ${f1.tableNote}`, { size: 18 }),
    p('3. 기타 붙임', { bold: true }),
    p(`  - ${f1.attachment}`, { size: 20 }),
    pageBreak(),
    p(`[${f2.name}]`, { size: 18 }),
    h(f2.title),
    p(`□ 안건: ${f2.agenda}`, { bold: true }),
    p(f2.body.replace('○○학교', schoolName)),
    p(`□ ${f2.opinionNote}`),
    table([
      f2.tableColumns.map(c => cell(c, { shade: true, bold: true, center: true })),
      ...f2.rows.map(r => [cell(r, { center: true }), cell(''), cell(''), cell(''), cell(''), cell('')]),
    ], [14, 20, 8, 8, 20, 30]),
    blank(),
    p(today(), { align: AlignmentType.CENTER }),
    p(f2.closing.replace('○○○학교', schoolName), { align: AlignmentType.CENTER, bold: true, size: 26 }),
    pageBreak(),
    p(`[${f3.name}]`, { size: 18 }),
    h(f3.sender.replace('○○○학교', schoolName)),
    p(`수신  ${f3.to.replace('○○○학교', schoolName)}`),
    p('(경유)'),
    p(`제목  ${f3.title.replace('○○○학교', schoolName)}`),
    ...f3.body.map((b, i) => p(`${i + 1}. ${b.replace('○○○학교', schoolName)}`)),
    table([f3.tableColumns.map(c => cell(c, { shade: true, bold: true, center: true })), f3.row.map((c, i) => cell(i === 0 ? '2026년도 학습지원 소프트웨어(센셀 등) 선정 심의(안)' : c, { center: true }))], [55, 25, 20]),
    p(f3.attachment, { size: 20 }),
    blank(),
    p(f3.signer.replace('○○○학교', schoolName), { align: AlignmentType.CENTER, bold: true, size: 26 }),
  ];
  const doc = new D.Document({ sections: [{ children }] });
  await download(D, doc, `학운위_서면심의_서식1-3_${schoolName}.docx`);
};

/** 서식 4~5 (우선 사용 및 사후 심의를 위한 서면 보고) */
export const downloadReportDocx = async ({ schoolName = '○○학교', principal = '○○○', teacherName = '○○○', reason = '학년 초 학운위 구성의 어려움과 정상적인 교육활동', nextDate = '2026.00.00.' }) => {
  const D = await loadDocx(); const { p, h, cell, table, blank, AlignmentType, Paragraph } = mk(D);
  const f4 = forms.committeeForms.form4, f5 = forms.committeeForms.form5;
  const pageBreak = () => new Paragraph({ pageBreakBefore: true, children: [] });
  const children = [
    p(`[${f4.name}]  ※ ${f4.toNote}`, { size: 18 }),
    h(schoolName),
    p(`수신자  ${f4.to}`), p('(경유)'), p(`제목  ${f4.title}`),
    p('1. 관련', { bold: true }), ...f4.related.map((r, i) => p(`  ${['가', '나'][i]}. ${r}`)),
    p(`2. ${f4.body.replace('○○○○에 의한 부득이한 사정', `${reason}에 의한 부득이한 사정`).replace('○○소프트웨어 등 ○○종', '센셀(SEN-SEL) 등 1종')}`),
    p(f4.attachment, { size: 20 }),
    pageBreak(),
    p(`[${f5.name}]`, { size: 18 }),
    h(f5.title),
    p(`제출자: ${schoolName}장 ${principal}   담당자: 교사 ${teacherName}`, { align: AlignmentType.RIGHT, size: 20 }),
    p('1. 사유', { bold: true }),
    p(`  가. ${f5.reasons[0]}`),
    p(`  나. ${reason}을 위하여 초·중등교육법 시행령 제60조에 따라 아래의 학습지원 소프트웨어를 우선 사용하고 차기 학운위(${nextDate}) 심의하고자 함`),
    p(`  ※ ${f5.reasonsNote}`, { size: 18 }),
    p('2. 학습지원 소프트웨어', { bold: true }),
    table([f5.tableColumns.map(c => cell(c, { shade: true, bold: true, center: true })), [cell('센셀(SEN-SEL) — 학급 사회정서교육·생활교육 도우미'), cell('필수 기준 충족 여부 확인 후 기재', { center: true }), cell('학급 사회정서교육 운영 및 생활교육(자리 배치·관계 지원)에 필요')]], [45, 20, 35]),
    p('3. 근거', { bold: true }), p(`  ${f5.basis}`),
    blank(),
    p(today(), { align: AlignmentType.CENTER }),
    p(f5.signer.replace('○○학교', schoolName), { align: AlignmentType.CENTER, bold: true, size: 26 }),
  ];
  const doc = new D.Document({ sections: [{ children }] });
  await download(D, doc, `학습지원SW_우선사용_서면보고_서식4-5_${schoolName}.docx`);
};
