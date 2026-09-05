import React, { useMemo, useState, useEffect } from 'react';
import { CalendarDays, FileDown, Info } from 'lucide-react';
import { db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { seoulGradeLabel } from '../utils/seoulSel';
import { buildAnnualPlan, buildResultReport, downloadAnnualPlanDocx, downloadResultReportDocx } from '../utils/annualPlan';
import { buildClassReport, periodRange, monthKey } from '../utils/growth';

const AREA_COLOR = { '자기': '#805ad5', '대인관계': '#dd6b20', '공동체': '#d53f8c', '마음건강': '#c53030' };

/**
 * 연간 계획 — 학년만 맞으면 1분 안에 '우리 반 사회정서교육 연간 운영 계획서'(.docx)와
 * 학기 말 '운영 결과 보고'(.docx)가 나온다. 개인 정보는 어느 문서에도 들어가지 않는다.
 */
const AnnualPlan = ({ studentsData = [], teacherProfile, classCode, classLabel }) => {
  const gradeLabel = seoulGradeLabel(teacherProfile?.selLevel, teacherProfile?.gradeYear);
  const className = classLabel || teacherProfile?.className || '';
  const teacherName = teacherProfile?.teacherName || '';
  const [hours, setHours] = useState(1);
  const [school, setSchool] = useState(() => { try { return localStorage.getItem('sensel-school') || ''; } catch { return ''; } });
  const [busy, setBusy] = useState('');
  const [semester, setSemester] = useState(new Date().getMonth() >= 8 || new Date().getMonth() <= 1 ? 2 : 1);
  const [counts, setCounts] = useState({ consents: null, feedback: null });
  const plan = useMemo(() => buildAnnualPlan({ gradeLabel, selLevel: teacherProfile?.selLevel, gradeYear: teacherProfile?.gradeYear, className, teacherName, hoursPerWeek: hours }), [gradeLabel, teacherProfile?.selLevel, teacherProfile?.gradeYear, className, teacherName, hours]);
  useEffect(() => { try { if (school) localStorage.setItem('sensel-school', school); } catch { /* ignore */ } }, [school]);
  useEffect(() => {
    if (!classCode) return;
    (async () => {
      try {
        const [c, f] = await Promise.all([
          getDocs(query(collection(db, 'consents'), where('classCode', '==', classCode))),
          getDocs(query(collection(db, 'familyFeedback'), where('classCode', '==', classCode))),
        ]);
        setCounts({ consents: c.size, feedback: f.size });
      } catch { setCounts({ consents: null, feedback: null }); }
    })();
  }, [classCode]);

  const run = async (k, fn) => { setBusy(k); try { await fn(); } catch (e) { console.error(e); alert('문서 생성에 실패했습니다.'); } finally { setBusy(''); } };
  const downloadResult = () => {
    const period = periodRange('semester');
    const cr = buildClassReport(studentsData, { classCode, className, gradeLabel, from: period.from, to: period.to, periodLabel: period.label });
    const r = buildResultReport({ plan, studentsData, classReport: cr, consentCount: counts.consents, feedbackCount: counts.feedback, semester });
    return downloadResultReportDocx(r, { schoolName: school || '○○학교' });
  };

  return (
    <div className="glass-card" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '18px', flex: 1, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ background: 'var(--primary-light)', padding: '12px', borderRadius: '16px' }}><CalendarDays size={26} color="var(--primary-color)" /></div>
        <div>
          <h2 style={{ margin: 0, color: '#2d3748', fontSize: '1.7rem' }}>연간 계획</h2>
          <div style={{ color: '#718096', fontSize: '0.9rem' }}>{plan.year}학년도 · {gradeLabel} · 차시 {plan.totalLessons}개 · 성취기준 {plan.standards.length}개{!teacherProfile?.gradeYear && ' (챗봇 설정에서 학년을 고르면 정확해집니다)'}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ fontWeight: 800, color: '#2d3748' }}>📘 사회정서교육 연간 운영 계획서</div>
          <div style={{ fontSize: '0.84rem', color: '#4a5568', lineHeight: 1.55 }}>주차별 차시·서울 성취기준·도덕과 연계·아침 대화 주제·주간 미션·가정 연계 시점이 들어간 계획서입니다. 학교 교육과정 편성표에 맞춰 고쳐 쓰세요.</div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', fontSize: '0.85rem' }}>
            <input value={school} onChange={e => setSchool(e.target.value)} placeholder="학교명" style={{ flex: '1 1 160px', padding: '8px 10px', borderRadius: '10px', border: '1px solid #cbd5e1', fontFamily: 'inherit' }} />
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>주당
              <select value={hours} onChange={e => setHours(Number(e.target.value))} style={{ padding: '8px', borderRadius: '10px', border: '1px solid #cbd5e1', fontFamily: 'inherit' }}>
                <option value={1}>1차시</option><option value={2}>2차시</option>
              </select>
            </label>
          </div>
          <button className="btn btn-primary" disabled={!!busy} onClick={() => run('plan', () => downloadAnnualPlanDocx(plan, { schoolName: school || '○○학교' }))}><FileDown size={16} /> {busy === 'plan' ? '만드는 중…' : '계획서 내려받기 (.docx)'}</button>
        </div>
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ fontWeight: 800, color: '#2d3748' }}>📗 운영 결과 보고</div>
          <div style={{ fontSize: '0.84rem', color: '#4a5568', lineHeight: 1.55 }}>학급 데이터(참여·미션·기술 연습·맞춤 지도·조치 기록·동의·가정 회신)로 실적 표와 개요 문단이 자동으로 채워집니다. 학생 개인이 식별되는 정보는 넣지 않습니다.</div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '0.85rem' }}>
            <select value={semester} onChange={e => setSemester(Number(e.target.value))} style={{ padding: '8px', borderRadius: '10px', border: '1px solid #cbd5e1', fontFamily: 'inherit' }}>
              <option value={1}>1학기</option><option value={2}>2학기</option>
            </select>
            <span style={{ color: '#718096' }}>참여 {studentsData.filter(s => (s.skillLog || []).length || (s.missions || []).length).length}/{studentsData.length}명 · 동의 {counts.consents ?? '–'} · 가정 회신 {counts.feedback ?? '–'}</span>
          </div>
          <button className="btn btn-secondary" disabled={!!busy} onClick={() => run('result', downloadResult)}><FileDown size={16} /> {busy === 'result' ? '만드는 중…' : '결과 보고 내려받기 (.docx)'}</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', fontSize: '0.8rem', color: '#718096', lineHeight: 1.5 }}>
        <Info size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
        <span>배분 원칙: 각 학기 1주차는 오리엔테이션·소개편 통신문, 17주차는 되돌아보기·학급 리포트. 그 사이에 {gradeLabel} 차시를 순서대로 넣고, 영역이 바뀌는 첫 주에 영역편 통신문을 표시합니다.</span>
      </div>

      <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '14px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', minWidth: '880px' }}>
          <thead>
            <tr style={{ background: '#f7fafc' }}>
              {['학기', '주', '시작', '영역', '차시', '서울 성취기준', '도덕과', '아침 대화', '가정 연계'].map(h => <th key={h} style={{ padding: '8px', borderBottom: '1px solid #e2e8f0', textAlign: 'left', whiteSpace: 'nowrap', color: '#4a5568' }}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {plan.weeks.map((w, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #f1f5f9', background: w.index === 1 || w.index === 17 ? '#fffbea' : 'white' }}>
                <td style={{ padding: '6px 8px' }}>{w.semester}</td>
                <td style={{ padding: '6px 8px' }}>{w.index}</td>
                <td style={{ padding: '6px 8px', whiteSpace: 'nowrap' }}>{w.label}</td>
                <td style={{ padding: '6px 8px' }}>{w.areas.map(a => <span key={a} style={{ color: AREA_COLOR[a], fontWeight: 700 }}>{a}</span>)}</td>
                <td style={{ padding: '6px 8px', minWidth: '220px' }}>{w.lessons.map((l, j) => <div key={j}>{l.seq ? `${l.seq}차시 ` : ''}{l.title}{l.skill && <span style={{ color: '#a0aec0' }}> · {l.skill}</span>}</div>)}</td>
                <td style={{ padding: '6px 8px', color: '#553c9a', whiteSpace: 'nowrap' }}>{w.standards.join(', ')}</td>
                <td style={{ padding: '6px 8px', color: '#276749', whiteSpace: 'nowrap' }}>{w.moral.join(', ')}</td>
                <td style={{ padding: '6px 8px', color: '#4a5568' }}>{w.morning}</td>
                <td style={{ padding: '6px 8px', color: '#b7791f' }}>{w.family}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AnnualPlan;
