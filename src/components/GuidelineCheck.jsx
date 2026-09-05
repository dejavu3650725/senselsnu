import React, { useEffect, useState } from 'react';
import { X, ClipboardCheck, ShieldCheck, ChevronDown, ChevronUp, BookOpen, FileDown, Link2, Copy, Check, RefreshCw } from 'lucide-react';
import { downloadConsentDocx, downloadCommitteeDocx, downloadReportDocx } from '../utils/officialDocs';
import { collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { GUIDE, VALUE_META, valueName, guideLevelOf, guideLevelLabel, schoolLevelGen } from '../utils/aiGuideline';

const STATUS_COLOR = { '충족': '#2f855a', '부분 충족': '#b7791f', '충족(절차)': '#2f855a' };

/**
 * 도입 점검 — 서울시교육청 「AI·에듀테크 공교육 도입 및 활용 가이드라인 v1.0」 기준으로
 * 센셀 도입 절차(사전 진단 → 1~4단계)와 필수 기준 5가지, 생성형 AI 위험 요소 대응을 한 화면에서 점검한다.
 * 교사의 체크 상태는 teachers/{uid}.guidelineChecks 에 저장된다.
 */
const GuidelineCheck = ({ onClose, teacherProfile, onSaved, classCode, studentsData = [] }) => {
  const [checks, setChecks] = useState({});
  const [open, setOpen] = useState({ forms: true, pre: false, steps: true, mandatory: true, risks: false, values: false });
  const [school, setSchool] = useState(() => { try { return localStorage.getItem('sensel-school') || ''; } catch { return ''; } });
  const [principal, setPrincipal] = useState('');
  const [busy, setBusy] = useState('');
  const [consents, setConsents] = useState(null);
  const [applied, setApplied] = useState('');
  const [copied, setCopied] = useState(false);
  const signUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/consent/${classCode}/sign`;
  const teacherName = teacherProfile?.teacherName ? `${teacherProfile.teacherName} 선생님` : '담임교사';
  const className = teacherProfile?.className || '';
  const smsText = `[${className || '우리 반'} 개인정보 수집·이용·제공 동의 안내]\n학급 사회정서교육 도우미 '센셀' 활용을 위해 보호자님의 동의를 받고자 합니다. 아래 링크에서 안내를 읽고 동의 여부를 제출해 주세요(만 14세 미만은 법정대리인 동의). 종이 동의서를 이미 제출하셨다면 다시 하지 않으셔도 됩니다.\n${signUrl}\n— ${teacherName}`;
  const run = async (key, fn) => { setBusy(key); try { await fn(); } catch (e) { console.error(e); alert('문서 생성에 실패했습니다.'); } finally { setBusy(''); } };
  const docOpts = { schoolName: school || '○○학교', principal: principal || '○○○', teacherName: teacherProfile?.teacherName || '○○○', className, storeTranscripts: teacherProfile?.chatConfig?.storeTranscripts === true && teacherProfile?.chatConfig?.consentConfirmed === true, committeeApproved: teacherProfile?.chatConfig?.committeeApproved === true };
  const loadConsents = async () => {
    if (!classCode) return;
    try { const snap = await getDocs(query(collection(db, 'consents'), where('classCode', '==', classCode))); setConsents(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => String(b.at).localeCompare(String(a.at)))); }
    catch (e) { console.error(e); setConsents([]); }
  };
  useEffect(() => { loadConsents(); }, [classCode]);
  const norm = (s) => String(s || '').replace(/\s/g, '');
  const latestByStudent = (consents || []).reduce((m, c) => { const k = norm(c.studentName); if (!m[k]) m[k] = c; return m; }, {});
  const matched = studentsData.map(s => ({ s, c: latestByStudent[norm(s.realName)] || null }));
  const unmatched = Object.values(latestByStudent).filter(c => !studentsData.some(s => norm(s.realName) === norm(c.studentName)));
  const applyConsents = async () => {
    setBusy('apply');
    let n = 0;
    try {
      for (const { s, c } of matched) {
        if (!c) continue;
        const status = c.agree ? 'granted' : 'denied';
        if (s.consent?.status === status && s.consent?.at === c.at) continue;
        await updateDoc(doc(db, 'students', s.id), { consent: { status, at: c.at, guardianName: c.guardianName || '', source: 'e-sign' } });
        n += 1;
      }
      setApplied(`${n}명 반영됨`);
    } catch (e) { console.error(e); setApplied('반영 실패'); } finally { setBusy(''); }
  };
  const copySms = async () => { try { await navigator.clipboard.writeText(smsText); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* ignore */ } };
  useEffect(() => { try { if (school) localStorage.setItem('sensel-school', school); } catch { /* ignore */ } }, [school]);
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

        <Section id="forms" icon={<FileDown size={18} color="#dd6b20" />} title="공문·동의서 내려받기 (서울시교육청 공식 서식)" sub="한글(HWP)·Word에서 열어 학교 양식에 맞게 수정">
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', fontSize: '0.84rem' }}>
            <input value={school} onChange={e => setSchool(e.target.value)} placeholder="학교명 (예: 서울○○초등학교)" style={{ flex: '1 1 200px', padding: '8px 10px', borderRadius: '10px', border: '1px solid #cbd5e1', fontFamily: 'inherit' }} />
            <input value={principal} onChange={e => setPrincipal(e.target.value)} placeholder="학교장 성명" style={{ flex: '0 1 140px', padding: '8px 10px', borderRadius: '10px', border: '1px solid #cbd5e1', fontFamily: 'inherit' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '8px' }}>
            {[
              { k: 'consent', label: '개인정보 수집·이용·제공 동의 안내', desc: '유형 2(AI·에듀테크 전용 통합 안내) 형식, 센셀 항목·국외 이전 고지 기입', fn: () => downloadConsentDocx(docOpts) },
              { k: 'committee', label: '학운위 서면 심의 서식 1~3', desc: '서면 심의 안건 · 결의서 · 결과 송부 (2026학년도 1학기까지 서면 허용)', fn: () => downloadCommitteeDocx(docOpts) },
              { k: 'report', label: '우선 사용 서면 보고 서식 4~5', desc: '학운위 구성 전 우선 사용 시 교육지원청 보고 공문·보고 양식', fn: () => downloadReportDocx(docOpts) },
            ].map(b => (
              <button key={b.k} className="btn btn-secondary" disabled={!!busy} onClick={() => run(b.k, b.fn)} style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '2px', padding: '10px 12px', textAlign: 'left', height: 'auto' }}>
                <span style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}><FileDown size={14} /> {busy === b.k ? '만드는 중…' : b.label} <span style={{ fontSize: '0.7rem', color: '#718096', fontWeight: 500 }}>.docx</span></span>
                <span style={{ fontSize: '0.76rem', color: '#718096', fontWeight: 400, lineHeight: 1.4 }}>{b.desc}</span>
              </button>
            ))}
          </div>
          <div style={{ fontSize: '0.76rem', color: '#718096' }}>.docx는 한컴오피스에서 그대로 열리며 '다른 이름으로 저장 → HWP'로 바꿀 수 있습니다. 결재·발신 명의·서식 번호는 학교 양식에 맞춰 고쳐 쓰세요.</div>

          <div style={{ borderTop: '1px dashed #e2e8f0', paddingTop: '10px', marginTop: '4px' }}>
            <div style={{ fontWeight: 800, color: '#2d3748', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}><Link2 size={15} /> 보호자 전자 동의 (링크 전송)</div>
            <div style={{ fontSize: '0.8rem', color: '#4a5568', lineHeight: 1.5, margin: '4px 0 8px' }}>종이 대신 링크로 받을 수 있습니다. e알리미·문자·알림장에 아래 문구를 붙여 보내면 보호자가 같은 양식 항목을 읽고 동의 여부를 제출하고, 담임만 결과를 봅니다.</div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
              <code style={{ fontSize: '0.78rem', background: '#f7fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '4px 8px' }}>{signUrl}</code>
              <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '0.82rem' }} onClick={copySms}>{copied ? <Check size={14} /> : <Copy size={14} />} 전송 문구 복사</button>
              <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.82rem' }} onClick={() => window.open(signUrl, '_blank', 'noopener')}>미리보기</button>
              <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.82rem' }} onClick={loadConsents}><RefreshCw size={14} /> 새로고침</button>
            </div>
            <div style={{ display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap', marginTop: '10px', fontSize: '0.86rem' }}>
              <span>제출 <b>{(consents || []).length}</b>건 · 동의 <b style={{ color: '#2f855a' }}>{matched.filter(m => m.c?.agree).length}</b> · 미동의 <b style={{ color: '#c53030' }}>{matched.filter(m => m.c && !m.c.agree).length}</b> · 미회신 <b style={{ color: '#b7791f' }}>{matched.filter(m => !m.c).length}</b> / 학생 {studentsData.length}명</span>
              <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.82rem' }} disabled={busy === 'apply' || !matched.some(m => m.c)} onClick={applyConsents}>{busy === 'apply' ? '반영 중…' : '학생 문서에 반영'}</button>
              {applied && <span style={{ fontSize: '0.8rem', color: '#2f855a' }}>{applied}</span>}
            </div>
            {unmatched.length > 0 && <div style={{ fontSize: '0.78rem', color: '#b7791f', marginTop: '4px' }}>명단과 이름이 일치하지 않는 제출 {unmatched.length}건: {unmatched.map(c => c.studentName).join(', ')} — [학생 관리]의 실명과 맞춰 주세요.</div>}
            {matched.length > 0 && (
              <details style={{ marginTop: '6px', fontSize: '0.8rem' }}>
                <summary style={{ cursor: 'pointer', color: '#718096' }}>학생별 상태 보기</summary>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                  {matched.map(({ s, c }) => (
                    <span key={s.id} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '2px 8px', background: c ? (c.agree ? '#f0fff4' : '#fff5f5') : (s.consent?.status ? '#f7fafc' : 'white') }}>
                      {s.realName} {c ? (c.agree ? '동의' : '미동의') : s.consent?.status === 'granted' ? '동의(반영됨)' : s.consent?.status === 'denied' ? '미동의(반영됨)' : '미회신'}
                    </span>
                  ))}
                </div>
              </details>
            )}
            <div style={{ fontSize: '0.76rem', color: '#718096', marginTop: '6px' }}>'반영'하면 미동의 학생은 챗봇 대화는 하되 관계 신호·기록이 저장되지 않습니다(위기 알림은 아동 보호를 위해 유지). 종이로 받은 동의는 [챗봇 설정 › 학교 절차]에서 수합 완료만 체크하면 됩니다.</div>
          </div>
        </Section>

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
