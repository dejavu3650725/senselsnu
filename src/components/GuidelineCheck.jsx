import React, { useEffect, useState } from 'react';
import { ClipboardCheck, ShieldCheck, ChevronDown, ChevronUp, BookOpen, FileDown, Link2, Copy, Check, RefreshCw } from 'lucide-react';
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
const GuidelineCheck = ({ teacherProfile, onSaved, classCode, studentsData = [] }) => {
  const [checks, setChecks] = useState({});
  const [open, setOpen] = useState({ forms: true, pre: false, steps: false, mandatory: false, risks: false, values: false });
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

  const schoolDone = teacherProfile?.chatConfig?.committeeApproved === true && (teacherProfile?.chatConfig?.consentCollected === true || teacherProfile?.chatConfig?.consentConfirmed === true);
  const setSchoolDone = async (done) => {
    try {
      setSaving(true);
      const u = auth.currentUser; if (!u) return;
      const chatConfig = { ...(teacherProfile?.chatConfig || {}), committeeApproved: done, consentCollected: done, schoolProcessAt: done ? new Date().toISOString() : null };
      await setDoc(doc(db, 'teachers', u.uid), { chatConfig }, { merge: true });
      if (onSaved) onSaved({ chatConfig });
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
  const Card = ({ id, icon, title, sub, children, tone = 'blue', collapsible = false, right }) => {
    const isOpen = collapsible ? !!open[id] : true;
    return (
      <section className={`gc-card tone-${tone}`}>
        <div className={`gc-card-head ${collapsible ? 'clickable' : ''}`} onClick={collapsible ? () => setOpen(o => ({ ...o, [id]: !o[id] })) : undefined}>
          <span className="gc-ic">{icon}</span>
          <div className="gc-card-title"><b>{title}</b>{sub && <span>{sub}</span>}</div>
          {right}
          {collapsible && <span className="gc-chev">{isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</span>}
        </div>
        {isOpen && <div className="gc-card-body">{children}</div>}
      </section>
    );
  };
  const Check = ({ k, children }) => (
    <label className="gc-check"><input type="checkbox" checked={!!checks[k]} onChange={() => toggle(k)} /><span>{children}</span></label>
  );
  const ValueChip = ({ v }) => <span className="gc-vchip" style={{ color: VALUE_META[v]?.color, background: `${VALUE_META[v]?.color}14` }}>{valueName(v)}</span>;
  const agreeN = matched.filter(m => m.c?.agree).length, denyN = matched.filter(m => m.c && !m.c.agree).length, noneN = matched.filter(m => !m.c).length;

  return (
    <div data-tour="page" className="glass-card gc-page">
      <div className="gc-head">
        <div>
          <div className="gc-title"><ClipboardCheck size={20} /> 서류함 <span className="gc-title-sub">학교 제출용</span></div>
          <div className="gc-meta">{GUIDE.meta.publisher} 「{GUIDE.meta.title}」 {GUIDE.meta.published} · {guideLevelLabel(level)}{saving && ' · 저장 중…'}</div>
        </div>
        <button className={`gc-status ${schoolDone ? 'done' : ''}`} disabled={saving} onClick={() => setSchoolDone(!schoolDone)} title={schoolDone ? '클릭하면 완료 표시를 해제합니다' : '학운위 심의와 보호자 동의를 이미 마쳤다면 클릭'}>
          {schoolDone ? '✅ 학교 절차 완료' : '학교 절차를 이미 마쳤어요'}
        </button>
      </div>
      <div className="gc-class">센셀은 학생 개인정보를 처리하는 <b>학습지원 소프트웨어</b>이므로 <b>학운위 심의</b>와 <b>보호자 사전 동의</b>가 필요합니다. 교육용 AI로 분류되며 학생 실명은 AI에 전송되지 않습니다.</div>

      <div className="gc-grid">
        <div className="gc-col">
          <Card id="forms" icon={<FileDown size={17} />} title="공문·동의서 내려받기" sub="서울시교육청 공식 서식 · 한글(HWP)·Word에서 수정" tone="orange">
            <div className="gc-inputs">
              <input value={school} onChange={e => setSchool(e.target.value)} placeholder="학교명 (예: 서울○○초등학교)" />
              <input value={principal} onChange={e => setPrincipal(e.target.value)} placeholder="학교장 성명" />
            </div>
            <div className="gc-docs">
              {[
                { k: 'consent', label: '개인정보 수집·이용·제공 동의 안내', desc: '유형 2(AI·에듀테크 통합 안내) · 센셀 항목·국외 이전 고지 기입', fn: () => downloadConsentDocx(docOpts) },
                { k: 'committee', label: '학운위 서면 심의 서식 1~3', desc: '서면 심의 안건 · 결의서 · 결과 송부', fn: () => downloadCommitteeDocx(docOpts) },
                { k: 'report', label: '우선 사용 서면 보고 서식 4~5', desc: '학운위 구성 전 우선 사용 시 교육지원청 보고', fn: () => downloadReportDocx(docOpts) },
              ].map(b => (
                <button key={b.k} className="gc-doc" disabled={!!busy} onClick={() => run(b.k, b.fn)}>
                  <span className="gc-doc-ic"><FileDown size={16} /></span>
                  <span className="gc-doc-txt"><b>{busy === b.k ? '만드는 중…' : b.label}</b><span>{b.desc}</span></span>
                  <span className="gc-doc-ext">.docx</span>
                </button>
              ))}
            </div>
            <div className="gc-note">한컴오피스에서 열어 '다른 이름으로 저장 → HWP'. 결재·발신 명의·서식 번호는 학교 양식에 맞춰 고쳐 쓰세요.</div>
          </Card>

          <Card id="consent" icon={<Link2 size={17} />} title="보호자 전자 동의" sub="링크 전송 · 담임만 결과 열람" tone="green" right={<span className="gc-pills"><span className="gc-pill g">동의 {agreeN}</span><span className="gc-pill r">미동의 {denyN}</span><span className="gc-pill y">미회신 {noneN}</span></span>}>
            <div className="gc-linkrow">
              <code>{signUrl}</code>
              <button className="btn btn-primary" onClick={copySms}>{copied ? <Check size={14} /> : <Copy size={14} />} 전송 문구 복사</button>
              <button className="btn btn-secondary" onClick={() => window.open(signUrl, '_blank', 'noopener')}>미리보기</button>
              <button className="btn btn-secondary" onClick={loadConsents}><RefreshCw size={14} /></button>
            </div>
            <div className="gc-applyrow">
              <span>제출 <b>{(consents || []).length}</b>건 / 학생 {studentsData.length}명</span>
              <button className="btn btn-secondary" disabled={busy === 'apply' || !matched.some(m => m.c)} onClick={applyConsents}>{busy === 'apply' ? '반영 중…' : '학생 문서에 반영'}</button>
              {applied && <span className="gc-ok">{applied}</span>}
            </div>
            {unmatched.length > 0 && <div className="gc-warn">명단과 이름이 다른 제출 {unmatched.length}건: {unmatched.map(c => c.studentName).join(', ')}</div>}
            {matched.length > 0 && (
              <details className="gc-details">
                <summary>학생별 상태</summary>
                <div className="gc-students">
                  {matched.map(({ s, c }) => {
                    const st = c ? (c.agree ? 'g' : 'r') : s.consent?.status === 'granted' ? 'g' : s.consent?.status === 'denied' ? 'r' : 'n';
                    const label = c ? (c.agree ? '동의' : '미동의') : s.consent?.status === 'granted' ? '동의·반영' : s.consent?.status === 'denied' ? '미동의·반영' : '미회신';
                    return <span key={s.id} className={`gc-stu ${st}`}>{s.realName} <em>{label}</em></span>;
                  })}
                </div>
              </details>
            )}
            <div className="gc-note">미동의 학생은 대화는 하되 관계 신호·기록이 저장되지 않습니다(위기 알림은 유지). 종이 동의는 [챗봇 설정 › 학교 절차]에서 체크.</div>
          </Card>
        </div>

        <div className="gc-col">
          <Card id="steps" icon={<ShieldCheck size={17} />} title="도입 절차 4단계" sub={`${doneCount(stepItems.map(s => s.key))}/4 완료`} tone="blue">
            <div className="gc-steps">
              {stepItems.map(s => (
                <Check key={s.key} k={s.key}><b>{s.n}. {s.title}</b><span className="gc-desc">{s.desc}</span></Check>
              ))}
            </div>
            <div className="gc-note">{GUIDE.adoption.procedure.steps[3].tip}</div>
          </Card>

          <Card id="mandatory" icon={<ShieldCheck size={17} />} title="필수 기준 5가지" sub="개인정보 보호법 · 센셀 충족 상태" tone="teal" collapsible>
            <div className="gc-crit">
              {GUIDE.adoption.procedure.mandatoryCriteria.map(c => {
                const st = GUIDE.senselCompliance.mandatoryCriteriaStatus.find(x => x.n === c.n);
                return (
                  <div key={c.n} className="gc-crit-row">
                    <div className="gc-crit-head"><b>{c.n}. {c.name}</b><span className="gc-crit-st" style={{ color: STATUS_COLOR[st?.status] || '#718096' }}>{st?.status}</span></div>
                    <ul>{c.items.map((it, i) => <li key={i}>{it}</li>)}</ul>
                    <div className="gc-crit-how">→ {st?.how}</div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card id="pre" icon={<BookOpen size={17} />} title="사전 진단" sub={`교육적 시선 점검 ${doneCount(preItems.map(p => p.key))}/${preItems.length}`} tone="purple" collapsible>
            {GUIDE.adoption.units.map(u => (
              <div key={u.key} className="gc-unit">
                <div className="gc-unit-q">{u.name} — “{u.question}”</div>
                {u.checks.map((c, i) => <Check key={i} k={`pre_${u.key}_${i}`}><ValueChip v={c.value} /> <span className="gc-lens">{c.lens}</span> · {c.text}</Check>)}
              </div>
            ))}
            <div className="gc-note"><b>{guideLevelLabel(level)} 성찰 질문</b> · {gen.reflection.map(r => `${r.q} — ${r.text}`).join(' / ')}</div>
          </Card>

          <Card id="risks" icon={<ShieldCheck size={17} />} title="생성형 AI 위험 요소와 대응" sub="가이드라인 7개 항목" tone="red" collapsible>
            {GUIDE.generativeAI.risks.map(r => {
              const st = GUIDE.senselCompliance.riskStatus.find(x => x.key === r.key);
              return (
                <div key={r.key} className="gc-risk">
                  <b>{r.name}</b> <span className="gc-lens">{r.risks.join(' · ')}</span>
                  <div className="gc-desc">가이드라인: {r.responses.join(' / ')}</div>
                  <div className="gc-ok">센셀: {st?.how}</div>
                </div>
              );
            })}
          </Card>

          <Card id="values" icon={<BookOpen size={17} />} title="5대 핵심 가치와 센셀" sub="주도성·합목적성·포용성·안전성·투명성" tone="purple" collapsible>
            {GUIDE.senselCompliance.byCoreValue.map(v => (
              <div key={v.value} className="gc-value">
                <ValueChip v={v.value} /> <span className="gc-lens">{GUIDE.coreValues.find(c => c.key === v.value)?.text}</span>
                <ul>{v.how.map((h, i) => <li key={i}>{h}</li>)}</ul>
              </div>
            ))}
          </Card>
        </div>
      </div>

      <div className="gc-laws">근거 법령: {GUIDE.meta.laws.join(' · ')}</div>
    </div>
  );
};

export default GuidelineCheck;
