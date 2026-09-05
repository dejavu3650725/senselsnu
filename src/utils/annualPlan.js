/**
 * 우리 반 사회정서교육 연간 계획서 · 운영 결과 보고 자동 생성
 * 원천: 서울 사회정서교육자료 학년 차시(seoulSel.json) + 성취기준, 2022 도덕과 성취기준(moralCurriculum.json),
 *       교육부 아침조회 대화 주제(selFramework.json), 가정 연계 시점(familyLink), 학급 데이터(growth)
 * 주차 배분: 1학기(3월 1주~7월 3주, 17주) · 2학기(9월 1주~1월 3주, 17주). 개관·평가 주간 제외 후 차시를 순서대로 배분.
 */
import { SEOUL, seoulLevelOf, lessonsFor, standardByCode } from './seoulSel.js';
import { codesForActivity, moralLevelOf, moralByCode } from './moralCurriculum.js';
import { topicsFor } from './selFramework.js';
import { MISSION_POOL } from './growth.js';

const LEVEL_FOR_TOPICS = (gradeLabel) => { const n = Number(gradeLabel.slice(1)); const lv = seoulLevelOf(gradeLabel); return lv === 'middle' ? 'middle' : lv === 'high' ? 'high' : n <= 3 ? 'elementary_low' : 'elementary_high'; };
const AREA_KEYS = { '자기': ['selfAwareness', 'selfManagement'], '대인관계': ['relationshipAwareness', 'relationshipManagement'], '공동체': ['communityValues'], '마음건강': ['mentalHealthAwareness'] };
const AREA_ACTIVITY = { '자기': 'moodCheckin', '대인관계': 'peerNomination', '공동체': 'seatingFairness', '마음건강': 'crisisAlert' };

/** 학년도 주차 목록 (연도 기준) */
export const schoolWeeks = (year = new Date().getMonth() >= 2 ? new Date().getFullYear() : new Date().getFullYear() - 1) => {
  const weeks = [];
  const push = (sem, start, count) => {
    const d = new Date(start);
    // 월요일로 맞춤
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    for (let i = 0; i < count; i++) {
      const s = new Date(d.getTime() + i * 7 * 86400000);
      weeks.push({ semester: sem, index: i + 1, start: s, label: `${s.getMonth() + 1}/${s.getDate()}` });
    }
  };
  push(1, `${year}-03-02`, 17);
  push(2, `${year}-09-01`, 17);
  return weeks;
};

/** 연간 계획 모델 */
export const buildAnnualPlan = ({ gradeLabel, selLevel, gradeYear, className = '', teacherName = '', hoursPerWeek = 1, year }) => {
  const level = seoulLevelOf(gradeLabel);
  const moralLevel = moralLevelOf(selLevel, gradeYear);
  const weeks = schoolWeeks(year);
  const lessons = lessonsFor(gradeLabel, [], 100);
  // 개관·평가 주간: 각 학기 1주차(소개편·오리엔테이션), 각 학기 마지막 주(정리·가정 리포트)
  const teachable = weeks.filter(w => !(w.index === 1 || w.index === 17));
  const slots = teachable.length * Math.max(1, hoursPerWeek);
  const perSlot = lessons.length <= slots ? 1 : Math.ceil(lessons.length / slots);
  let li = 0;
  const rows = weeks.map(w => {
    const row = { ...w, lessons: [], areas: [], standards: [], moral: [], morning: '', family: '', mission: '' };
    if (w.index === 1) {
      row.family = w.semester === 1 ? '소개편 가정통신문 배부 · 보호자 동의(학운위 심의 후)' : '2학기 안내 · 학급 리포트 발송';
      row.lessons = [{ title: w.semester === 1 ? '오리엔테이션 — 사회정서교육을 살펴봐요' : '2학기 여는 활동 — 우리 반 약속 다시 세우기', skill: '', seq: '' }];
    } else if (w.index === 17) {
      row.family = '학급 리포트 발송 · 운영 결과 정리';
      row.lessons = [{ title: w.semester === 1 ? '1학기 되돌아보기 — 나의 성장 기록 나누기' : '한 해 되돌아보기 — 성장 배지 잔치', skill: '', seq: '' }];
    } else {
      for (let k = 0; k < perSlot * Math.max(1, hoursPerWeek) && li < lessons.length; k++) row.lessons.push(lessons[li++]);
    }
    row.areas = Array.from(new Set(row.lessons.map(l => l.area).filter(Boolean)));
    row.standards = Array.from(new Set(row.lessons.flatMap(l => l.standards || [])));
    row.moral = Array.from(new Set(row.areas.flatMap(a => codesForActivity(AREA_ACTIVITY[a], moralLevel).map(s => s.code)))).slice(0, 2);
    const keys = row.areas.flatMap(a => AREA_KEYS[a] || []);
    const topics = topicsFor(LEVEL_FOR_TOPICS(gradeLabel), keys, 30);
    row.morning = topics.length ? topics[(w.semester * 17 + w.index) % topics.length] : '';
    const pool = MISSION_POOL.filter(m => !row.areas.length || row.areas.includes(m.area));
    row.mission = pool.length ? pool[(w.semester * 17 + w.index) % pool.length].text : '';
    // 영역이 바뀌는 첫 주에 영역편 통신문
    return row;
  });
  let prevArea = '';
  rows.forEach(r => { const a = r.areas[0]; if (a && a !== prevArea && r.index !== 1 && r.index !== 17) { r.family = r.family || `${a} 영역 가정통신문 배부`; prevArea = a; } });

  const allStandards = Array.from(new Set(lessons.flatMap(l => l.standards || []))).map(c => standardByCode(c)).filter(Boolean);
  const moralAll = Array.from(new Set(rows.flatMap(r => r.moral))).map(c => moralByCode(c)).filter(Boolean);
  const skills = Object.entries(SEOUL.skills[level] || {}).map(([area, list]) => ({ area, list }));
  return {
    gradeLabel, level, moralLevel, className, teacherName, year: weeks[0]?.start.getFullYear(),
    hoursPerWeek, totalLessons: lessons.length, weeks: rows, standards: allStandards, moral: moralAll, skills,
    goals: SEOUL.competencies.map(c => `${c.seoulName}: ${c.description}`),
    basis: ['교육부 「한국형 사회정서교육」 4영역·6핵심역량 (2026학년도 전 학교 확대)', `서울특별시교육청 「사회정서교육자료」 ${gradeLabel} (성취기준 ${allStandards.length}개, 차시 ${lessons.length}개)`, '2022 개정 도덕과 교육과정 (교육부 고시 제2022-33호 [별책 6]) 연계 성취기준', '서울특별시교육청 「AI·에듀테크 공교육 도입 및 활용 가이드라인 v1.0」(2026.2) 준수'],
  };
};

/** 운영 결과 보고 모델 */
export const buildResultReport = ({ plan, studentsData = [], classReport, consentCount = null, feedbackCount = null, semester = 1 }) => {
  const done = studentsData.reduce((n, s) => n + (s.missions || []).length, 0);
  const skillEvents = studentsData.reduce((n, s) => n + (s.skillLog || []).length, 0);
  const active = studentsData.filter(s => (s.skillLog || []).length || (s.missions || []).length || (s.sessionDates || []).length).length;
  const prescribed = studentsData.filter(s => s.aiPrescriptionData).length;
  const alerts = studentsData.reduce((n, s) => n + (s.alerts || []).length, 0);
  const acked = studentsData.reduce((n, s) => n + (s.alertActions || []).length, 0);
  const seoulCited = Array.from(new Set(studentsData.flatMap(s => s.aiPrescriptionData?.standards || [])));
  const moralCited = Array.from(new Set(studentsData.flatMap(s => s.aiPrescriptionData?.moralStandards || [])));
  return {
    semester, className: plan.className, gradeLabel: plan.gradeLabel, teacherName: plan.teacherName,
    studentCount: studentsData.length, active, missionDone: done, skillEvents, prescribed, alerts, acked,
    topSkills: classReport?.topSkills || [], topAreas: classReport?.topAreas || [],
    consentCount, feedbackCount, seoulCited, moralCited,
    plannedLessons: plan.totalLessons,
    narrative: [
      `학급 사회정서교육은 서울 사회정서교육자료 ${plan.gradeLabel} 차시(${plan.totalLessons}개)와 교육부 한국형 사회정서교육 6핵심역량을 축으로 운영하였다.`,
      `학생은 대화형 도우미와 주간 친절 미션을 통해 사회정서기술을 일상에서 연습하였으며, ${active}명이 활동에 참여하고 미션 완료 ${done}회, 기술 연습 기록 ${skillEvents}회가 누적되었다.`,
      `교사는 관계 신호를 바탕으로 자리·모둠을 조정하고 ${prescribed}명에게 성취기준 근거 맞춤 지도를 실시하였으며, 위기 신호 ${alerts}건에 대해 ${acked}건의 확인·조치 기록을 남겼다.`,
      `가정에는 영역별 가정통신문과 학급 리포트를 배부하였고${feedbackCount != null ? ` 가정 실천 회신 ${feedbackCount}건을 받았다` : ''}. 학생 개인 정보는 가정 문서에 포함하지 않았다.`,
    ],
  };
};

/** ---------- DOCX ---------- */
const loadDocx = () => import('docx');
const dl = async (D, doc, filename) => {
  const blob = await D.Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
};
const mk = (D) => {
  const { Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, PageOrientation } = D;
  const p = (text, o = {}) => new Paragraph({ alignment: o.align || AlignmentType.LEFT, spacing: { after: o.after ?? 100 }, children: [new TextRun({ text, bold: !!o.bold, size: o.size || 20 })] });
  const h = (text, size = 32) => new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200, before: 120 }, children: [new TextRun({ text, bold: true, size })] });
  const h2 = (text) => new Paragraph({ spacing: { after: 100, before: 200 }, children: [new TextRun({ text, bold: true, size: 24 })] });
  const cell = (text, o = {}) => new TableCell({ width: o.w ? { size: o.w, type: WidthType.DXA } : undefined, shading: o.shade ? { fill: 'EDF2F7' } : undefined, children: (Array.isArray(text) ? text : [text]).map(t => new Paragraph({ alignment: o.center ? AlignmentType.CENTER : AlignmentType.LEFT, spacing: { after: 40 }, children: [new TextRun({ text: String(t ?? ''), bold: !!o.bold, size: o.size || 16 })] })) });
  const table = (rows, pct, total = 9000) => { const ws = pct.map(x => Math.round(total * x / 100)); return new Table({ width: { size: total, type: WidthType.DXA }, columnWidths: ws, rows: rows.map((r, ri) => new TableRow({ tableHeader: ri === 0, children: r.map((c, i) => (c instanceof TableCell ? c : cell(c, { w: ws[i], shade: ri === 0, bold: ri === 0, center: ri === 0 }))) })) }); };
  return { p, h, h2, cell, table, Paragraph, AlignmentType, PageOrientation };
};

export const downloadAnnualPlanDocx = async (plan, { schoolName = '○○학교' } = {}) => {
  const D = await loadDocx(); const { p, h, h2, table, Paragraph, AlignmentType, PageOrientation } = mk(D);
  const grade = plan.gradeLabel.replace(/^./, '') + '학년';
  const cover = [
    p(schoolName, { align: AlignmentType.RIGHT }),
    h(`${plan.year}학년도 ${plan.className || grade} 사회정서교육 연간 운영 계획`, 34),
    p(`담임: ${plan.teacherName || '○○○'} · 주당 ${plan.hoursPerWeek}차시 · 총 ${plan.totalLessons}차시 (창의적 체험활동·도덕·학교자율시간 연계)`, { align: AlignmentType.CENTER }),
    h2('1. 목적 및 근거'),
    ...plan.basis.map(b => p(`- ${b}`)),
    h2('2. 목표 (서울 사회정서교육 6역량)'),
    ...plan.goals.map(g => p(`- ${g}`)),
    h2('3. 이 학년의 사회정서기술'),
    table([['영역', '사회정서기술'], ...plan.skills.map(s => [s.area, s.list.join(', ')])], [18, 82]),
    h2('4. 운영 방식'),
    p('- 수업: 서울 사회정서교육자료 차시를 주차별로 배분하고, 아침 활동으로 교육부 아침조회 대화 주제를 활용한다.'),
    p('- 일상 연습: 대화형 도우미(센셀)와 주간 친절 미션으로 배운 기술을 연습하고, 학생은 자신의 성장 기록을 본다.'),
    p('- 생활교육: 긍정 추인법 관계망을 바탕으로 자리·모둠을 조정하고, 관계 신호를 근거로 맞춤 지도한다(관계망은 교사만 열람).'),
    p('- 가정 연계: 학기 초 소개편, 영역 시작 시 영역편 가정통신문, 학기 말 학급 리포트를 배부한다. 학생 개인 정보는 가정 문서에 포함하지 않는다.'),
    p('- 개인정보: 학교운영위원회 심의와 보호자 동의를 거쳐 운영하며, 대화 원문은 기본 미저장·신호만 기록·학년도 종료 시 파기한다.'),
  ];
  const planRows = [['학기', '주', '시작', '영역', '차시(학습 주제)', '서울 성취기준', '도덕과 연계', '아침 대화 주제', '주간 미션', '가정 연계']];
  plan.weeks.forEach(w => planRows.push([
    `${w.semester}`, `${w.index}`, w.label, w.areas.join('·'),
    w.lessons.map(l => `${l.seq ? l.seq + '차시 ' : ''}${l.title}${l.skill ? ` (${l.skill})` : ''}`).join('\n'),
    w.standards.join(', '), w.moral.join(', '), w.morning, w.mission, w.family,
  ]));
  const appendix = [
    h2('6. 서울 사회정서교육 성취기준 (전체)'),
    table([['코드', '영역', '성취기준'], ...plan.standards.map(s => [s.code, s.area, s.text])], [16, 12, 72]),
    h2('7. 2022 개정 도덕과 교육과정 연계 성취기준'),
    table([['코드', '영역', '성취기준'], ...plan.moral.map(s => [s.code, s.area, s.text])], [16, 18, 66]),
    p(' '),
    p('※ 이 계획서는 센셀(SEN-SEL)이 서울특별시교육청 사회정서교육자료와 교육부·도덕과 교육과정을 바탕으로 자동 구성한 초안입니다. 학교 교육과정 편성표·창체 시수에 맞춰 수정하여 사용하세요.', { size: 16 }),
  ];
  const doc = new D.Document({
    sections: [
      { children: cover },
      { properties: { page: { size: { orientation: PageOrientation.LANDSCAPE }, margin: { top: 700, bottom: 700, left: 700, right: 700 } } }, children: [h2('5. 주차별 운영 계획'), table(planRows, [4, 4, 6, 8, 24, 12, 10, 12, 12, 8], 14500)] },
      { children: appendix },
    ],
  });
  await dl(D, doc, `사회정서교육_연간계획서_${plan.className || plan.gradeLabel}.docx`);
};

export const downloadResultReportDocx = async (r, { schoolName = '○○학교' } = {}) => {
  const D = await loadDocx(); const { p, h, h2, table, AlignmentType } = mk(D);
  const children = [
    p(schoolName, { align: AlignmentType.RIGHT }),
    h(`${r.className || r.gradeLabel} 사회정서교육 운영 결과 보고 (${r.semester}학기)`, 32),
    p(`담임: ${r.teacherName || '○○○'} · 작성일 ${new Date().toLocaleDateString('ko-KR')}`, { align: AlignmentType.CENTER }),
    h2('1. 운영 개요'),
    ...r.narrative.map(t => p(t)),
    h2('2. 운영 실적'),
    table([['항목', '실적'],
      ['학생 수 / 활동 참여', `${r.studentCount}명 / ${r.active}명`],
      ['계획 차시', `${r.plannedLessons}차시`],
      ['주간 친절 미션 완료', `${r.missionDone}회`],
      ['사회정서기술 연습 기록', `${r.skillEvents}회`],
      ['많이 연습한 기술', r.topSkills.map(s => `${s.skill}(${s.count})`).join(', ') || '-'],
      ['맞춤 지도(성취기준 근거 처방)', `${r.prescribed}명`],
      ['위기 신호 / 확인·조치 기록', `${r.alerts}건 / ${r.acked}건`],
      ['보호자 동의 제출', r.consentCount != null ? `${r.consentCount}건` : '학교 양식(종이)'],
      ['가정 실천 회신', r.feedbackCount != null ? `${r.feedbackCount}건` : '-'],
    ], [35, 65]),
    h2('3. 근거 성취기준 (맞춤 지도에서 인용)'),
    p(`서울 사회정서교육: ${r.seoulCited.map(c => `[${c}]`).join(' ') || '-'}`),
    p(`2022 도덕과: ${r.moralCited.map(c => `[${c}]`).join(' ') || '-'}`),
    h2('4. 평가 및 개선'),
    p('- 잘된 점: '), p('- 어려웠던 점: '), p('- 다음 학기 개선 방향: '),
    p(' '),
    p('※ 학생 개인이 식별되는 정보는 포함하지 않았습니다. 개인별 기록은 담임 상담 기록으로 별도 관리합니다.', { size: 16 }),
  ];
  const doc = new D.Document({ sections: [{ children }] });
  await dl(D, doc, `사회정서교육_운영결과보고_${r.className || r.gradeLabel}_${r.semester}학기.docx`);
};
