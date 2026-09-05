import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Printer, ArrowLeft, Info, Home } from 'lucide-react';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { ensureStudentSession } from '../utils/apiClient';
import { buildLetter, LETTER_KINDS } from '../utils/familyLink';
import { seoulGradeLabel } from '../utils/seoulSel';

/**
 * 가정통신문 인쇄 페이지 (/family/:classCode/:kind)
 * - kind: intro | 자기 | 대인관계 | 공동체 | 마음건강
 * - 고등: 서울시교육청 가정연계 가정통신문 예시 원문 구조 / 초·중: 학년 차시 자료로 자동 구성
 * - 학생 개인 데이터는 어떤 경우에도 포함하지 않는다.
 */
const FamilyLetter = () => {
  const { classCode, kind } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [cls, setCls] = useState(null);
  const [teacher, setTeacher] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [school, setSchool] = useState(params.get('school') || '');
  const [dateStr, setDateStr] = useState(new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }));

  useEffect(() => {
    const load = async () => {
      try {
        await ensureStudentSession(null);
        const c = await getDoc(doc(db, 'classes', classCode));
        if (c.exists()) {
          setCls(c.data());
          if (c.data().teacherUid) {
            const t = await getDoc(doc(db, 'teachers', c.data().teacherUid));
            if (t.exists()) setTeacher(t.data());
          }
        }
      } catch (e) { console.error('family letter load error', e); }
      finally { setLoaded(true); }
    };
    load();
  }, [classCode]);

  const kindInfo = LETTER_KINDS.find(k => k.key === kind) || LETTER_KINDS[0];
  const gradeLabel = seoulGradeLabel(teacher?.selLevel, teacher?.gradeYear);
  const className = cls?.className || '';
  const teacherName = cls?.teacherName ? `${cls.teacherName} 선생님` : '담임교사';
  const letter = loaded ? buildLetter({ kind: kindInfo.key, gradeLabel, className, schoolName: school, teacherName }) : null;

  return (
    <div className="consent-page">
      <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', flexWrap: 'wrap' }}>
        <button className="btn btn-secondary" onClick={() => navigate(-1)}><ArrowLeft size={16} /> 돌아가기</button>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {LETTER_KINDS.map(k => (
            <button key={k.key} className={`btn ${k.key === kindInfo.key ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '6px 10px', fontSize: '0.82rem' }} onClick={() => navigate(`/family/${classCode}/${k.key}${school ? `?school=${encodeURIComponent(school)}` : ''}`)}>{k.label}</button>
          ))}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          <button className="btn btn-primary" onClick={() => window.print()}><Printer size={16} /> 인쇄 / PDF 저장</button>
        </div>
      </div>
      <div className="no-print" style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '12px', fontSize: '0.85rem' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>학교명 <input value={school} onChange={e => setSchool(e.target.value)} placeholder="○○초등학교" style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--border-strong)' }} /></label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>날짜 <input value={dateStr} onChange={e => setDateStr(e.target.value)} style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--border-strong)', width: '160px' }} /></label>
      </div>
      <div className="no-print" style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', background: '#fffbea', border: '1px solid #f6e05e', borderRadius: '12px', padding: '10px 14px', marginBottom: '16px', fontSize: '0.85rem', color: '#744210', lineHeight: 1.55 }}>
        <Info size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
        <span>{letter?.source || '불러오는 중…'}. 학교 양식(결재·발신 명의)에 맞게 다듬어 사용하세요. 이 문서에는 학생 개인 정보가 들어가지 않습니다.</span>
      </div>

      {letter && (
        <div className="consent-doc" id="print-area">
          <div style={{ textAlign: 'center', fontSize: '0.85rem', letterSpacing: '0.4em', color: '#6b7280' }}>가 정 통 신 문</div>
          <div style={{ textAlign: 'center', fontSize: '0.9rem', color: '#6b7280', marginBottom: '8px' }}>{letter.school}{className ? ` · ${className}` : ''}</div>
          <h1 style={{ fontSize: '1.35rem' }}>{letter.title}</h1>
          <p style={{ marginTop: '14px' }}>존경하는 학부모님께,</p>
          <p>{letter.greeting}</p>

          {letter.kind === 'intro' ? (
            <>
              <p>{letter.levelNote}</p>
              <p>{letter.structure}</p>
              <table>
                <thead><tr><th style={{ width: '14%' }}>영역</th><th style={{ width: '32%' }}>사회정서기술</th><th>{letter.verbatim ? '소개' : `${gradeLabel.replace(/^./, '')}학년 학습 주제`}</th></tr></thead>
                <tbody>
                  {letter.skillIntro.map((s, i) => (
                    <tr key={i}><td style={{ background: 'var(--surface-3)', fontWeight: 700 }}>{s.area}</td><td>{s.skill}</td><td>{s.desc}</td></tr>
                  ))}
                </tbody>
              </table>
              <h2>가정과의 협력이 중요한 이유</h2>
              <p>{letter.whyFamily}</p>
              <h2>학부모님께 부탁드립니다</h2>
              <p>{letter.request}</p>
              <p>{letter.closing}</p>
            </>
          ) : (
            <>
              <div style={{ background: 'var(--surface-3)', borderRadius: '12px', padding: '12px 16px', margin: '12px 0' }}>
                <p style={{ margin: 0 }}>{letter.definition}</p>
              </div>
              <table>
                <tbody>
                  <tr><th>{letter.area} 영역 사회정서 핵심역량</th><td>{letter.competencies}</td></tr>
                  <tr><th>{letter.area} 영역 사회정서기술</th><td>{letter.skills.join(', ')}</td></tr>
                  <tr><th>학교에서의 학습활동</th><td>{letter.schoolActivities}</td></tr>
                </tbody>
              </table>
              <h2>{letter.common.tipsHeader}</h2>
              <p style={{ fontSize: '0.92rem', color: '#4a5568' }}>{letter.common.tipsIntro}</p>
              {letter.tips.map((t, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '12px', border: '1px solid var(--border)', borderRadius: '12px', padding: '12px 14px', marginBottom: '10px', breakInside: 'avoid' }}>
                  <div>
                    <div style={{ fontWeight: 800, color: 'var(--primary-color)', lineHeight: 1.4 }}>{t.skill}</div>
                    <div style={{ fontSize: '0.86rem', color: '#4a5568', marginTop: '6px', fontStyle: 'italic' }}>“{t.question}”</div>
                  </div>
                  <div style={{ fontSize: '0.92rem' }}>
                    <div style={{ color: '#4a5568', marginBottom: '6px' }}>{t.desc}</div>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#2f855a', marginBottom: '4px' }}>{letter.common.tipLabel}</div>
                    <ul style={{ margin: 0, paddingLeft: '18px', lineHeight: 1.6 }}>
                      {t.actions.map((a, j) => <li key={j}>{a}</li>)}
                    </ul>
                  </div>
                </div>
              ))}
              <h2>마무리 안내</h2>
              <p>{letter.closing}</p>
            </>
          )}

          <div style={{ textAlign: 'center', marginTop: '28px', lineHeight: 1.8 }}>
            <div>{dateStr}</div>
            <div style={{ fontWeight: 800, fontSize: '1.05rem' }}>{letter.school}장</div>
          </div>
          <p style={{ marginTop: '18px', fontSize: '0.78rem', color: '#9ca3af', textAlign: 'right' }}>출처: {letter.source}</p>
        </div>
      )}
    </div>
  );
};

export default FamilyLetter;
