import React, { useState } from 'react';
import { BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import { codesForActivity, activityOf, moralLevelOf, moralLevelLabel, isNextBandNote } from '../utils/moralCurriculum';
import { seoulGradeLabel, standardsFor } from '../utils/seoulSel';

/**
 * 교과 근거 배지 — 이 화면의 활동이 구현하는 2022 도덕과 성취기준(+ 서울 사회정서교육 성취기준)을 코드로 표시
 * @param activity moralCurriculum.senselMapping.activities[].key
 * @param seoulAreas 서울 영역명 배열(선택)
 * @param dark 어두운 배경(소시오그램)용
 */
const CurriculumEvidence = ({ activity, teacherProfile, seoulAreas = [], dark = false, compact = false }) => {
  const [open, setOpen] = useState(false);
  const level = moralLevelOf(teacherProfile?.selLevel, teacherProfile?.gradeYear);
  const act = activityOf(activity);
  const codes = codesForActivity(activity, level);
  const gradeLabel = seoulGradeLabel(teacherProfile?.selLevel, teacherProfile?.gradeYear);
  const seoul = seoulAreas.length ? standardsFor(gradeLabel, seoulAreas).slice(0, 3) : [];
  if (!act || (!codes.length && !seoul.length)) return null;
  const nextBand = isNextBandNote(teacherProfile?.selLevel, teacherProfile?.gradeYear);
  const fg = dark ? '#cbd5e1' : '#553c9a';
  const bg = dark ? 'rgba(15,23,42,0.75)' : '#faf5ff';
  const border = dark ? 'rgba(255,255,255,0.12)' : '#e9d8fd';

  return (
    <div className="no-print" style={{ background: bg, border: `1px solid ${border}`, borderRadius: '10px', padding: compact ? '5px 10px' : '8px 12px', fontSize: '0.76rem', color: fg, lineHeight: 1.5, maxWidth: '100%' }}>
      <button onClick={() => setOpen(o => !o)} style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', width: '100%' }} aria-expanded={open}>
        <BookOpen size={13} />
        <b>교과 근거</b>
        {codes.map(s => <span key={s.code} title={s.text} style={{ background: dark ? 'rgba(255,255,255,0.08)' : 'white', border: `1px solid ${border}`, borderRadius: '8px', padding: '1px 7px', whiteSpace: 'nowrap' }}>[{s.code}]</span>)}
        {seoul.map(s => <span key={s.code} title={s.text} style={{ background: dark ? 'rgba(255,255,255,0.08)' : 'white', border: `1px solid ${border}`, borderRadius: '8px', padding: '1px 7px', whiteSpace: 'nowrap' }}>[{s.code}]</span>)}
        <span style={{ marginLeft: 'auto', opacity: 0.8 }}>{open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}</span>
      </button>
      {open && (
        <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ opacity: 0.9 }}>{act.rationale}</div>
          <div style={{ fontWeight: 700, marginTop: '2px' }}>2022 개정 도덕과 교육과정 · {moralLevelLabel(level)}{nextBand && ' (초1~2는 바른 생활 → 다음 학년군 연계)'}</div>
          {codes.map(s => <div key={s.code}>[{s.code}] ({s.area}) {s.text}</div>)}
          {seoul.length > 0 && <div style={{ fontWeight: 700, marginTop: '2px' }}>서울 사회정서교육 {gradeLabel} 성취기준</div>}
          {seoul.map(s => <div key={s.code}>[{s.code}] ({s.area}) {s.text}</div>)}
        </div>
      )}
    </div>
  );
};

export default CurriculumEvidence;
