import React, { useEffect, useState } from 'react';
import { X, ClipboardCheck, ShieldCheck, ChevronDown, ChevronUp, BookOpen } from 'lucide-react';
import { auth, db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { GUIDE, VALUE_META, valueName, guideLevelOf, guideLevelLabel, schoolLevelGen } from '../utils/aiGuideline';

const STATUS_COLOR = { '충족': '#2f855a', '부분 충족': '#b7791f', '충족(절차)': '#2f855a' };

/**
 * 도입 점검 — 서울시교육청 「AI·에듀테크 공교육 도입 및 활용 가이드라인 v1.0」 기준으로
 * 센셀 도입 절차(사전 진단 → 1~4단계)와 필수 기준 5가지, 생성형 AI 위험 요소 대응을 한 화면에서 점검한다.
 * 교사의 체크 상태는 teachers/{uid}.guidelineChecks 에 저장된다.
 */
const GuidelineCheck = ({ onClose, teacherProfile, onSaved }) => {
  const [checks, setChecks] = useState({});
  const [open, setOpen] = useState({ pre: true, steps: true, mandatory: true, risks: false, values: false });
  const [saving, setSaving] = useState(false);
  const level = guideLevelOf(teacherProfile?.selLevel);
  const gen = schoolLevelGen(teacherProfile?.selLevel);

  useEffect(() => {
    (async () => {
      try {
        const u = auth.currentUser; if (!u) return;
        const s = await getDoc(doc(db, 'teachers', u.uid));
        if (s.exists() && s.data().guidelineChecks) setChecks(s.data().guidelineChecks);
      } catch (e) { console.error(e); }
    })();
  }, []);

  const toggle = async (key) => {
    const next = { ...checks, [key]: !checks[key] };
    setChecks(next);
    try {
      setSaving(true);
      const u = auth.currentUser; if (!u) return;
      await setDoc(doc(db, 'teachers', u.uid), { guidelineChecks: next }, { merge: true });
      if (onSaved) onSaved({ guidelineChecks: next });
    } catch (e) { console.error(e); } finally { setSaving(false); }
  };

  const preItems = GUIDE.adoption.units.flatMap(u => u.checks.map((c, i) => ({ key: `pre_${u.key}_${i}`, unit: u.name, ...c })));
  const stepItems = [
    { key: 'step1', n: 1, title: GUIDE.adoption.procedure.steps[0].name, desc: '교장·동료 교원 의견 수렴. 센셀은 학생 개인정보를 처리하므로 "학운위 심의가 필요한 학습지원 소프트웨어"에 해당합니다.' },
    { key: 'step2', n: 2, title: GUIDE.adoption.procedure.steps[1].name, desc: '아래 필수 기준 5가지 충족 여부를 확인합니다(센셀의 충족 상태 표시).' },
    { key: 'step3', n: 3, title: GUIDE.adoption.procedure.steps[2].name, desc: '선정 심의안 기안 → 회의 7일 전 안건 송부 → 홈페이지 공고 → 심의 → 결과 교장 이송. 완료 후 [챗봇 설정 › 학교 절차]에도 체크됩니다.' },
    { key: 'step4', n: 4, title: GUIDE.adoption.procedure.steps[3].name, desc: '보호자 안내문·동의서를 배부·수합합니다. 심의와 별개로 반드시 필요합니다.' },
  ];
  const doneCount = (keys) => keys.filter(k => checks[k]).length;
  const Section = ({ id, icon, title, sub, children }) => (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: '14px', overflow: 'hidden' }}>
      <button onClick={() => setOpen(o => ({ ...o, [id]: !o[id] }))} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', background: '#f8fafc', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
        {icon}<span style={{ fontWeight: 800, color: '#2d3748' }}>{title}</span><span style={{ fontSize: '0.8rem', color: '#718096' }}>{sub}</span>
        <span style={{ marginLeft: 'auto', color: '#a0aec0' }}>{open[id] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</span>
      </button>
      {open[id] && <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>{children}</div>}
    </div>
  );
  const Check = ({ k, children }) => (
    <label style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', cursor: 'pointer', fontSize: '0.86rem', lineHeight: 1.5, color: '#2d3748' }}>
      <input type="checkbox" checked={!!checks[k]} onChange={() => toggle(k)} style={{ marginTop: '3px' }} />
      <span>{children}</span>
    </label>
  );
  const ValueChip = ({ v }) => <span style={{ fontSize: '0.7rem', fontWeight: 700, color: VALUE_META[v]?.color, background: `${VALUE_META[v]?.color}14`, borderRadius: '8px', padding: '1px 7px', whiteSpace: 'nowrap' }}>{valueName(v)}</span>;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'white', padding: '26px 30px', borderRadius: '24px', width: '94%', maxWidth: '820px', maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 20px 40px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <ClipboardCheck size={24} color="var(--primary-color)" />
          <div>
            <h2 style={{ margin: 0, fontSize: '1.3rem', color: 'var(--text-main)' }}>도입 점검</h2>
            <div style={{ fontSize: '0.8rem', color: '#718096' }}>{GUIDE.meta.publisher} 「{GUIDE.meta.title}」({GUIDE.meta.published}) 기준 · {guideLevelLabel(level)}{saving && ' · 저장 중…'}</div>
          </div>
          <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer' }}><X size={22} color="#a0aec0" /></button>
        </div>

        <div style={{ background: '#faf5ff', border: '1px solid #e9d8fd', borderRadius: '12px', padding: '10px 14px', fontSize: '0.84rem', color: '#553c9a', lineHeight: 1.55 }}>
          <b>센셀의 분류:</b> {GUIDE.senselCompliance.classification.reason} · {GUIDE.senselCompliance.classification.aiType}
        </div>

        <Section id="steps" icon={<ShieldCheck size={18} color="#3182ce" />} title="단계별 도입 절차" sub={`${doneCount(stepItems.map(s => s.key))}/4 완료`}>
          {stepItems.map(s => (
            <Check key={s.key} k={s.key}><b>{s.n}단계 · {s.title}</b><br /><span style={{ color: '#4a5568' }}>{s.desc}</span></Check>
          ))}
          <div style={{ fontSize: '0.78rem', color: '#718096' }}>{GUIDE.adoption.procedure.steps[3].tip}</div>
        </Section>

        <Section id="mandatory" icon={<ShieldCheck size={18} color="#2f855a" />} title="필수 기준 5가지 (개인정보 보호법)" sub="센셀의 충족 상태">
          {GUIDE.adoption.mandatoryCriteria.map(c => {
            const st = GUIDE.senselCompliance.mandatoryCriteriaStatus.find(x => x.n === c.n);
            return (
              <div key={c.n} style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '10px', fontSize: '0.84rem', borderBottom: '1px dashed #edf2f7', paddingBottom: '8px' }}>
                <div><b>{c.n}. {c.name}</b><br /><span style={{ fontSize: '0.75rem', fontWeight: 700, color: STATUS_COLOR[st?.status] || '#718096' }}>{st?.status}</span></div>
                <div style={{ color: '#4a5568', lineHeight: 1.5 }}>
                  <ul style={{ margin: '0 0 4px', paddingLeft: '16px' }}>{c.items.map((it, i) => <li key={i}>{it}</li>)}</ul>
                  <div style={{ color: '#2d3748' }}>→ {st?.how}</div>
                </div>
              </div>
            );
          })}
        </Section>

        <Section id="pre" icon={<BookOpen size={18} color="#dd6b20" />} title="사전 진단 — 교육적 시선으로 함께 나누는 고민" sub={`${doneCount(preItems.map(p => p.key))}/${preItems.length}`}>
          {GUIDE.adoption.units.map(u => (
            <div key={u.key}>
              <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#2d3748', margin: '4px 0' }}>{u.name} — “{u.question}”</div>
              {u.checks.map((c, i) => (
                <Check key={i} k={`pre_${u.key}_${i}`}><ValueChip v={c.value} /> <span style={{ color: '#718096' }}>{c.lens}</span> · {c.text}</Check>
              ))}
            </div>
          ))}
          <div style={{ fontSize: '0.8rem', color: '#718096', marginTop: '4px' }}><b>{guideLevelLabel(level)} 성찰 질문</b>: {gen.reflection.map(r => `${r.q} — ${r.text}`).join(' / ')}</div>
        </Section>

        <Section id="risks" icon={<ShieldCheck size={18} color="#c53030" />} title="생성형 AI 위험 요소와 센셀의 대응" sub="가이드라인 7개 항목">
          {GUIDE.generativeAI.risks.map(r => {
            const st = GUIDE.senselCompliance.riskStatus.find(x => x.key === r.key);
            return (
              <div key={r.key} style={{ fontSize: '0.84rem', borderBottom: '1px dashed #edf2f7', paddingBottom: '8px' }}>
                <b>{r.name}</b> <span style={{ color: '#718096' }}>— {r.risks.join(' · ')}</span>
                <div style={{ color: '#2d3748', marginTop: '2px' }}>가이드라인 대응: {r.responses.join(' / ')}</div>
                <div style={{ color: '#2f855a', marginTop: '2px' }}>센셀: {st?.how}</div>
              </div>
            );
          })}
        </Section>

        <Section id="values" icon={<BookOpen size={18} color="#805ad5" />} title="5대 핵심 가치와 센셀" sub="주도성·합목적성·포용성·안전성·투명성">
          {GUIDE.senselCompliance.byCoreValue.map(v => (
            <div key={v.value} style={{ fontSize: '0.84rem' }}>
              <ValueChip v={v.value} /> <span style={{ color: '#4a5568' }}>{GUIDE.coreValues.find(c => c.key === v.value)?.text}</span>
              <ul style={{ margin: '4px 0 6px', paddingLeft: '18px', color: '#2d3748' }}>{v.how.map((h, i) => <li key={i}>{h}</li>)}</ul>
            </div>
          ))}
        </Section>

        <div style={{ fontSize: '0.75rem', color: '#a0aec0' }}>근거 법령: {GUIDE.meta.laws.join(' · ')}</div>
      </div>
    </div>
  );
};

export default GuidelineCheck;
