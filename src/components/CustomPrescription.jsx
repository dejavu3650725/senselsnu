import React, { useState, useEffect, useRef } from 'react';
import { HeartPulse, Sparkles, Loader, RefreshCw, ChevronDown, ChevronUp, Users, ShieldAlert, Target, ClipboardCheck, MessageCircle } from 'lucide-react';
import { db } from '../firebase';
import { apiPost } from '../utils/apiClient';
import { doc, updateDoc } from 'firebase/firestore';
import { assessClass, buildAnonymizedProfile, deanonymizeText, CASEL } from '../utils/studentSignals';
import { seoulGradeLabel, standardByCode } from '../utils/seoulSel';
import { moralByCode, moralLevelLabel } from '../utils/moralCurriculum';

const TIER_STYLE = {
  urgent: { label: '긴급', color: '#c53030', bg: '#fff5f5', border: '#feb2b2' },
  high: { label: '높음', color: '#c05621', bg: '#fffaf0', border: '#fbd38d' },
  watch: { label: '관심', color: '#b7791f', bg: '#fffff0', border: '#f6e05e' },
};

const COMPETENCY_COLOR = {
  '자기인식': '#805ad5', '자기관리': '#3182ce', '관계인식': '#38a169', '관계관리': '#dd6b20', '공동체 가치의 인식과 관리': '#d53f8c', '공동체 가치': '#d53f8c', '정신건강 문제의 인식과 관리': '#c53030', '정신건강 인식·관리': '#c53030',
  // 구버전(CASEL) 호환
  '자기 인식': '#805ad5', '자기 관리': '#3182ce', '사회적 인식': '#38a169', '관계 기술': '#dd6b20', '책임 있는 의사결정': '#d53f8c',
};
const compColor = (name) => COMPETENCY_COLOR[name] || COMPETENCY_COLOR[String(name || '').replace(/\s/g, '')] || '#4a5568';

/** 구조화 처방 → 리포트/인쇄용 텍스트 */
export const prescriptionToText = (p) => {
  if (!p) return '';
  const lines = [];
  if (p.summary) lines.push(`■ 관찰 요약: ${p.summary}`);
  if (p.hypothesis) lines.push(`■ 가설: ${p.hypothesis}`);
  if (p.strengths) lines.push(`■ 강점·자원: ${p.strengths}`);
  if (p.focus?.length) lines.push(`■ 초점 역량: ${p.focus.map(f => `${f.competency} — ${f.why}`).join(' / ')}`);
  (p.actions || []).forEach((a, i) => {
    lines.push(`${i + 1}. [${a.competency}] ${a.title}`);
    if (a.how) lines.push(`   방법: ${a.how}`);
    if (a.script) lines.push(`   교사 말: "${a.script}"`);
    if (a.resource) lines.push(`   자료: ${a.resource}`);
    if (a.standard) lines.push(`   성취기준: [${a.standard}]`);
    if (a.moral) lines.push(`   교과 근거(도덕): [${a.moral}]`);
  });
  if (p.standards?.length) lines.push(`■ 근거 성취기준(서울 사회정서교육): ${p.standards.map(c => `[${c}]`).join(' ')}`);
  if (p.moralStandards?.length) lines.push(`■ 교과 근거(2022 도덕과 교육과정): ${p.moralStandards.map(c => `[${c}]`).join(' ')}`);
  if (p.peerPlan) lines.push(`■ 또래 연결: ${p.peerPlan}`);
  if (p.caution) lines.push(`■ 주의: ${p.caution}`);
  if (p.checkpoints?.length) lines.push(`■ 1주 후 확인: ${p.checkpoints.join(' · ')}`);
  if (p.escalation) lines.push(`■ 연계 기준: ${p.escalation}`);
  return lines.join('\n');
};

const CustomPrescription = ({ studentsData, teacherProfile, focusStudentId }) => {
  const [prescriptions, setPrescriptions] = useState({});
  const [loadingIds, setLoadingIds] = useState({});
  const [errors, setErrors] = useState({});
  const [notes, setNotes] = useState({});
  const [noteOpen, setNoteOpen] = useState({});
  const [isBatchRunning, setIsBatchRunning] = useState(false);
  const [showOk, setShowOk] = useState(false);
  const cardRefs = useRef({});

  const { results, atRisk } = assessClass(studentsData);
  const listed = showOk ? results : atRisk;

  useEffect(() => {
    if (focusStudentId && cardRefs.current[focusStudentId]) {
      cardRefs.current[focusStudentId].scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [focusStudentId]);

  const getStored = (student) => prescriptions[student.id] || student.aiPrescriptionData || null;

  // 다른 학생에게 이미 제안된 전략 제목 → 중복 방지용
  const collectAvoid = (exceptId) => {
    const titles = [];
    studentsData.forEach(s => {
      if (s.id === exceptId) return;
      const p = prescriptions[s.id] || s.aiPrescriptionData;
      (p?.actions || []).forEach(a => { if (a?.title) titles.push(`${a.title}${a.competency ? ` (${a.competency})` : ''}`); });
    });
    return [...new Set(titles)];
  };

  const generateFor = async (student) => {
    setLoadingIds(prev => ({ ...prev, [student.id]: true }));
    setErrors(prev => ({ ...prev, [student.id]: '' }));
    try {
      const built = buildAnonymizedProfile(student.id, studentsData);
      if (!built) throw new Error('학생 데이터를 찾을 수 없습니다.');
      const { profile, idByAnon } = built;

      const res = await apiPost('/api/gemini-prescription', {
        profile,
        selLevel: teacherProfile?.selLevel || '',
        gradeYear: teacherProfile?.gradeYear || null,
        avoidStrategies: collectAvoid(student.id),
        teacherNote: notes[student.id] || '',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.prescription) throw new Error(data.error || `처방 생성 실패 (HTTP ${res.status})`);

      // 익명 ID → 실명 복원
      const dz = (t) => deanonymizeText(t, idByAnon, studentsData);
      const p = data.prescription;
      const restored = {
        summary: dz(p.summary), hypothesis: dz(p.hypothesis), strengths: dz(p.strengths),
        focus: (p.focus || []).map(f => ({ competency: f.competency, why: dz(f.why) })),
        actions: (p.actions || []).map(a => ({
          title: dz(a.title), competency: a.competency, how: dz(a.how), script: dz(a.script),
          peers: (a.peers || []).map(dz), resource: a.resource ? String(a.resource) : '',
          standard: a.standard ? String(a.standard) : '',
          moral: a.moral ? String(a.moral) : '',
        })),
        standards: Array.isArray(p.standards) ? p.standards.map(String) : [],
        moralStandards: Array.isArray(p.moralStandards) ? p.moralStandards.map(String) : [],
        gradeLabel: data.gradeLabel || '', moralLevel: data.moralLevel || '',
        peerPlan: dz(p.peerPlan), caution: dz(p.caution),
        checkpoints: (p.checkpoints || []).map(dz), escalation: dz(p.escalation),
        level: data.level, generatedAt: new Date().toISOString(),
      };

      setPrescriptions(prev => ({ ...prev, [student.id]: restored }));
      try {
        await updateDoc(doc(db, 'students', student.id), {
          aiPrescriptionData: restored,
          aiPrescription: prescriptionToText(restored),
          aiPrescriptionAt: restored.generatedAt,
        });
      } catch (err) { console.error('처방 저장 실패:', err); }
    } catch (error) {
      console.error(error);
      setErrors(prev => ({ ...prev, [student.id]: error.message || '에러가 발생했습니다.' }));
    } finally {
      setLoadingIds(prev => ({ ...prev, [student.id]: false }));
    }
  };

  const generateAll = async () => {
    setIsBatchRunning(true);
    for (const r of atRisk) {
      if (!getStored(r.student)) await generateFor(r.student); // 순차 실행 → 앞 학생 전략을 뒤 학생 중복 방지에 반영
    }
    setIsBatchRunning(false);
  };

  const pendingCount = atRisk.filter(r => !getStored(r.student)).length;

  return (
    <div data-tour="page" className="glass-card" style={{ padding: '32px', display: 'flex', flexDirection: 'column', flex: 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px', flexWrap: 'wrap' }}>
        <div style={{ background: 'var(--primary-light)', padding: '12px', borderRadius: '16px' }}>
          <HeartPulse size={28} color="var(--primary-color)" />
        </div>
        <h2 style={{ color: '#2d3748', margin: 0, fontSize: '1.8rem' }}>SEL 맞춤 처방</h2>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ fontSize: '0.85rem', color: '#718096', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
            <input type="checkbox" checked={showOk} onChange={e => setShowOk(e.target.checked)} /> 안정 학생도 보기
          </label>
          <button
            onClick={generateAll}
            disabled={isBatchRunning || pendingCount === 0}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: isBatchRunning || pendingCount === 0 ? '#a0aec0' : 'linear-gradient(90deg, #805ad5, #4a90e2)', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: isBatchRunning || pendingCount === 0 ? 'not-allowed' : 'pointer' }}
          >
            {isBatchRunning ? <Loader size={16} /> : <Sparkles size={16} />}
            {isBatchRunning ? '순차 생성 중...' : `미생성 ${pendingCount}명 일괄 생성`}
          </button>
        </div>
      </div>
      <p style={{ color: '#718096', marginBottom: '8px', fontSize: '1rem', paddingLeft: '52px', lineHeight: 1.6 }}>
        별도 프롬프트 없이, 학생별 기분·관계망·갈등/외로움 신호·대화 내용을 교육부 <b>「한국형 사회정서교육」 4영역·6핵심역량</b>(1차 로직)과
        <b>서울특별시교육청 사회정서교육자료의 {seoulGradeLabel(teacherProfile?.selLevel, teacherProfile?.gradeYear)} 성취기준·차시</b>(2차 로직)에 비추어 분석해
        <b> 학생마다 다른 실천 3가지</b>를 제안합니다. 실명은 익명 ID로 바꾼 뒤 분석되며, 이미 제안된 전략은 다른 학생과 겹치지 않게 조정됩니다.
      </p>
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', paddingLeft: '52px', marginBottom: '24px' }}>
        {Object.values(CASEL).map(c => (
          <span key={c.key} title={`${c.domain} 영역 — ${c.desc}`} style={{ fontSize: '0.75rem', fontWeight: 'bold', color: compColor(c.label), background: `${compColor(c.label)}14`, border: `1px solid ${compColor(c.label)}55`, padding: '3px 10px', borderRadius: '10px' }}>{c.label}</span>
        ))}
        <span style={{ fontSize: '0.75rem', color: '#a0aec0', alignSelf: 'center' }}>
          · 근거: 교육부 한국형 사회정서교육 프로그램({({ elementary_low: '초등 저학년', elementary_high: '초등 고학년', middle: '중학교', high: '고등학교' })[teacherProfile?.selLevel] || '초등 고학년(기본값)'}) · 서울 사회정서교육 {seoulGradeLabel(teacherProfile?.selLevel, teacherProfile?.gradeYear)} 성취기준{!teacherProfile?.gradeYear && ' (챗봇 설정에서 학년을 고르면 정확해집니다)'} · KEDI·OECD 사회정서역량 조사
        </span>
      </div>

      {listed.length === 0 ? (
        <div style={{ padding: '40px', background: 'linear-gradient(135deg, #f8fafc 0%, #edf2f7 100%)', borderRadius: '20px', color: '#4a5568', textAlign: 'center', fontSize: '1.2rem', fontWeight: 'bold' }}>
          현재 특별히 관심이 필요한 학생이 없습니다. 🌟
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', gap: '20px', alignContent: 'start' }}>
          {listed.map(r => {
            const student = r.student;
            const t = TIER_STYLE[r.tier] || { label: '안정', color: '#38a169', bg: '#f0fff4', border: '#c6f6d5' };
            const p = getStored(student);
            const isLoading = !!loadingIds[student.id];
            const isFocused = focusStudentId === student.id;
            return (
              <div
                key={student.id}
                ref={el => { cardRefs.current[student.id] = el; }}
                style={{ background: 'white', border: isFocused ? '2px solid var(--primary-color)' : '1px solid #e2e8f0', borderRadius: '20px', padding: '22px', boxShadow: isFocused ? '0 0 0 4px rgba(74,144,226,0.15)' : '0 4px 12px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', gap: '12px', minWidth: 0 }}
              >
                {/* 헤더 */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <span style={{ fontSize: '1.9rem', lineHeight: 1 }}>{student.avatar || '👤'}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#2d3748', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      {student.realName}
                      {student.nickname && student.nickname !== student.realName && <span style={{ fontSize: '0.85rem', color: '#a0aec0', fontWeight: 500 }}>{student.nickname}</span>}
                      <span style={{ fontSize: '0.72rem', fontWeight: 'bold', color: t.color, background: t.bg, border: `1px solid ${t.border}`, padding: '2px 8px', borderRadius: '10px' }}>{t.label}</span>
                      <span style={{ fontSize: '0.72rem', color: '#718096' }}>기분 {student.mood || '?'} · {student.gender || '성별 미상'}</span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                      {r.signals.map((sg, i) => (
                        <span key={i} title={sg.detail} style={{ fontSize: '0.72rem', background: '#f7fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '2px 7px', color: '#4a5568' }}>{sg.label}</span>
                      ))}
                      {r.focus.map(f => (
                        <span key={f.key} style={{ fontSize: '0.72rem', fontWeight: 'bold', color: compColor(f.label), background: `${compColor(f.label)}14`, borderRadius: '8px', padding: '2px 7px' }}>초점: {f.label}</span>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => generateFor(student)}
                    disabled={isLoading || isBatchRunning}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 14px', background: 'linear-gradient(135deg, var(--primary-color) 0%, var(--primary-hover) 100%)', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold', fontSize: '0.85rem', cursor: isLoading ? 'wait' : 'pointer', whiteSpace: 'nowrap', opacity: isLoading || isBatchRunning ? 0.7 : 1 }}
                  >
                    {isLoading ? <Loader size={16} /> : p ? <RefreshCw size={16} /> : <Sparkles size={16} />}
                    {isLoading ? '분석 중' : p ? '다시 생성' : 'AI 처방'}
                  </button>
                </div>

                {/* 규칙 기반 즉시 힌트 */}
                <div style={{ fontSize: '0.85rem', color: '#4a5568', background: '#f8fafc', borderRadius: '10px', padding: '8px 12px' }}>
                  <b style={{ color: t.color }}>바로 할 수 있는 것:</b> {r.quickAction}
                </div>

                {/* 교사 메모 (선택) */}
                <div>
                  <button onClick={() => setNoteOpen(prev => ({ ...prev, [student.id]: !prev[student.id] }))} style={{ background: 'transparent', border: 'none', color: '#718096', fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', padding: 0 }}>
                    {noteOpen[student.id] ? <ChevronUp size={14} /> : <ChevronDown size={14} />} 교사 관찰 메모 추가 (선택 — 없어도 생성됩니다)
                  </button>
                  {noteOpen[student.id] && (
                    <textarea
                      value={notes[student.id] || ''}
                      onChange={e => setNotes(prev => ({ ...prev, [student.id]: e.target.value }))}
                      placeholder="예: 최근 급식 시간에 혼자 앉는 모습이 잦음 / 미술에 강점"
                      style={{ width: '100%', marginTop: '6px', minHeight: '60px', padding: '8px 10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.85rem', fontFamily: 'inherit', resize: 'vertical' }}
                    />
                  )}
                </div>

                {errors[student.id] && (
                  <div style={{ fontSize: '0.85rem', color: '#c53030', background: '#fff5f5', border: '1px solid #feb2b2', borderRadius: '10px', padding: '8px 12px' }}>⚠️ {errors[student.id]}</div>
                )}

                {/* 구조화 처방 */}
                {p && <PrescriptionView p={p} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const Section = ({ icon, title, color = '#4a5568', children }) => (
  <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
    <span style={{ color, marginTop: '2px', flexShrink: 0 }}>{icon}</span>
    <div style={{ minWidth: 0, flex: 1 }}>
      <div style={{ fontSize: '0.78rem', fontWeight: 'bold', color, marginBottom: '2px' }}>{title}</div>
      <div style={{ fontSize: '0.88rem', color: '#4a5568', lineHeight: 1.6, wordBreak: 'keep-all' }}>{children}</div>
    </div>
  </div>
);

const PrescriptionView = ({ p }) => (
  <div style={{ borderTop: '1px dashed #e2e8f0', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
    {p.summary && <Section icon={<Target size={15} />} title="관찰 요약" color="#2d3748">{p.summary}</Section>}
    {p.hypothesis && <Section icon={<MessageCircle size={15} />} title="조심스러운 가설" color="#805ad5">{p.hypothesis}</Section>}
    {p.strengths && <Section icon={<Sparkles size={15} />} title="강점·관계 자원" color="#38a169">{p.strengths}</Section>}

    {p.focus?.length > 0 && (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
        {p.focus.map((f, i) => (
          <div key={i} style={{ flex: '1 1 180px', background: `${compColor(f.competency)}0f`, border: `1px solid ${compColor(f.competency)}44`, borderRadius: '10px', padding: '8px 10px' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 'bold', color: compColor(f.competency) }}>초점 역량 · {f.competency}</div>
            <div style={{ fontSize: '0.82rem', color: '#4a5568', lineHeight: 1.5, marginTop: '2px' }}>{f.why}</div>
          </div>
        ))}
      </div>
    )}

    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {(p.actions || []).map((a, i) => (
        <div key={i} style={{ background: '#f8fafc', borderLeft: `4px solid ${compColor(a.competency)}`, borderRadius: '0 12px 12px 0', padding: '10px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 800, color: '#2d3748', fontSize: '0.95rem' }}>{i + 1}. {a.title}</span>
            <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: compColor(a.competency), background: `${compColor(a.competency)}14`, padding: '2px 7px', borderRadius: '8px' }}>{a.competency}</span>
            {a.peers?.length > 0 && <span style={{ fontSize: '0.7rem', color: '#718096' }}><Users size={11} style={{ verticalAlign: '-2px' }} /> {a.peers.join(', ')}</span>}
          </div>
          {a.how && <div style={{ fontSize: '0.86rem', color: '#4a5568', lineHeight: 1.6, marginTop: '4px', wordBreak: 'keep-all' }}>{a.how}</div>}
          {a.script && <div style={{ fontSize: '0.85rem', color: '#2b6cb0', marginTop: '6px', fontStyle: 'italic', lineHeight: 1.5 }}>🗣 "{a.script}"</div>}
          {a.resource && <div style={{ fontSize: '0.75rem', color: '#718096', marginTop: '4px' }}>📚 {a.resource}</div>}
          {a.standard && <div style={{ fontSize: '0.72rem', color: '#805ad5', marginTop: '2px' }} title={standardByCode(a.standard)?.text || ''}>🎯 [{a.standard}] {standardByCode(a.standard)?.text || ''}</div>}
          {a.moral && <div style={{ fontSize: '0.72rem', color: '#2f855a', marginTop: '2px' }} title={moralByCode(a.moral)?.text || ''}>📖 도덕 [{a.moral}] {moralByCode(a.moral)?.text || ''}</div>}
        </div>
      ))}
    </div>

    {p.standards?.length > 0 && (
      <div style={{ background: '#faf5ff', border: '1px solid #e9d8fd', borderRadius: '10px', padding: '8px 12px', fontSize: '0.78rem', color: '#553c9a', lineHeight: 1.55 }}>
        <b>근거 성취기준 · 서울 사회정서교육{p.gradeLabel ? ` ${p.gradeLabel}` : ''}</b>
        {p.standards.map(c => { const st = standardByCode(c); return <div key={c}>[{c}] {st ? `(${st.area}) ${st.text}` : ''}</div>; })}
      </div>
    )}
    {p.moralStandards?.length > 0 && (
      <div style={{ background: '#f0fff4', border: '1px solid #c6f6d5', borderRadius: '10px', padding: '8px 12px', fontSize: '0.78rem', color: '#276749', lineHeight: 1.55 }}>
        <b>교과 근거 · 2022 개정 도덕과 교육과정{p.moralLevel ? ` (${moralLevelLabel(p.moralLevel)})` : ''}</b>
        {p.moralStandards.map(c => { const st = moralByCode(c); return <div key={c}>[{c}] {st ? `(${st.area}) ${st.text}` : ''}</div>; })}
      </div>
    )}

    {p.peerPlan && <Section icon={<Users size={15} />} title="또래 연결 · 자리/모둠 제안" color="#dd6b20">{p.peerPlan}</Section>}
    {p.caution && <Section icon={<ShieldAlert size={15} />} title="피해야 할 접근" color="#c53030">{p.caution}</Section>}
    {p.checkpoints?.length > 0 && (
      <Section icon={<ClipboardCheck size={15} />} title="1주 후 확인 지표" color="#3182ce">
        {p.checkpoints.map((c, i) => <div key={i}>☐ {c}</div>)}
      </Section>
    )}
    {p.escalation && <div style={{ fontSize: '0.78rem', color: '#718096', borderTop: '1px solid #edf2f7', paddingTop: '8px' }}>🔗 연계 기준: {p.escalation}</div>}
    {p.generatedAt && <div style={{ fontSize: '0.72rem', color: '#a0aec0', textAlign: 'right' }}>생성 {new Date(p.generatedAt).toLocaleString('ko-KR')}</div>}
  </div>
);

export default CustomPrescription;
