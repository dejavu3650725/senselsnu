import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Shield, Check, Info } from 'lucide-react';
import { db } from '../firebase';
import { doc, getDoc, addDoc, collection } from 'firebase/firestore';
import { ensureStudentSession } from '../utils/apiClient';
import { FORMS } from '../utils/officialDocs';

/**
 * 보호자 전자 동의 (/consent/:classCode/sign)
 * - 서울시교육청 「개인정보 수집·이용·제공 동의 안내」 예시 양식의 항목(수집·이용 동의 + 제3자 제공·국외 이전 고지)을 그대로 따른다.
 * - 제출 내용은 consents 컬렉션에 저장되고 담임교사만 열람한다. 학교 양식(종이)으로 받는 경우 이 화면 대신 인쇄본을 쓰면 된다.
 */
const ParentConsentSign = () => {
  const { classCode } = useParams();
  const [cls, setCls] = useState(null);
  const [cfg, setCfg] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [form, setForm] = useState({ studentName: '', grade: '', classNo: '', number: '', guardianName: '', agree: '', under14: false, relation: '보호자(법정대리인)' });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(() => { try { return localStorage.getItem(`sensel-consent-${classCode}`) === '1'; } catch { return false; } });
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        await ensureStudentSession(null);
        const c = await getDoc(doc(db, 'classes', classCode));
        if (c.exists()) {
          setCls(c.data());
          if (c.data().teacherUid) { const t = await getDoc(doc(db, 'teachers', c.data().teacherUid)); if (t.exists()) setCfg(t.data().chatConfig || null); }
        }
      } catch (e) { console.error(e); } finally { setLoaded(true); }
    })();
  }, [classCode]);

  const e = FORMS.senselEntry; const g = FORMS.consentGuide;
  const storeTranscripts = false; // 원문 저장 기능 없음
  const className = cls?.className || '우리 학급';
  const teacherName = cls?.teacherName ? `${cls.teacherName} 선생님` : '담임교사';
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const valid = form.studentName.trim() && form.guardianName.trim() && (form.agree === 'yes' || form.agree === 'no');

  const submit = async () => {
    if (!valid || submitting) return;
    setSubmitting(true); setError('');
    try {
      await addDoc(collection(db, 'consents'), {
        classCode, studentName: form.studentName.trim(), grade: form.grade.trim(), classNo: form.classNo.trim(), number: form.number.trim(),
        guardianName: form.guardianName.trim(), relation: form.relation, agree: form.agree === 'yes', under14: !!form.under14,
        at: new Date().toISOString(), version: 'seoul-2026-03',
      });
      setDone(true);
      try { localStorage.setItem(`sensel-consent-${classCode}`, '1'); } catch { /* ignore */ }
    } catch (err) { console.error(err); setError('제출에 실패했습니다. 잠시 후 다시 시도해 주세요.'); }
    finally { setSubmitting(false); }
  };

  const input = (k, placeholder, style = {}) => <input value={form[k]} onChange={ev => set(k, ev.target.value)} placeholder={placeholder} style={{ padding: '9px 12px', borderRadius: '10px', border: '1px solid var(--border-strong)', fontFamily: 'inherit', fontSize: '0.95rem', ...style }} />;

  return (
    <div className="consent-page">
      <div className="consent-doc">
        <div style={{ textAlign: 'center', marginBottom: '6px' }}><Shield size={28} color="#3b6fe0" /></div>
        <h1 style={{ fontSize: '1.3rem' }}>{g.template.title.replace('(예시)', '')}</h1>
        <p style={{ textAlign: 'center', color: '#6b7280', fontSize: '0.9rem' }}>{className} · {teacherName} · 전자 동의</p>
        {!loaded ? null : !cls ? (
          <p style={{ textAlign: 'center', color: '#c53030' }}>학급 정보를 찾을 수 없습니다. 링크를 다시 확인해 주세요.</p>
        ) : done ? (
          <div style={{ textAlign: 'center', padding: '28px 8px' }}>
            <div style={{ fontSize: '2.4rem' }}>✅</div>
            <h2 style={{ border: 'none', color: '#2f855a' }}>제출되었습니다. 감사합니다.</h2>
            <p style={{ color: '#4a5568' }}>담임교사만 열람하며, 동의 내용은 해당 학년도 종료 시까지 보관 후 파기합니다. 철회·열람·삭제는 담임교사에게 언제든 요청하실 수 있습니다.</p>
          </div>
        ) : (
          <>
            {g.template.intro.map((t, i) => <p key={i} style={{ fontSize: '0.95rem' }}>{t}</p>)}
            <p style={{ fontSize: '0.85rem', color: '#6b7280' }}>법적 근거: {g.legalBasis}{cfg?.committeeApproved ? ' · 본 학습지원 소프트웨어는 학교운영위원회 심의를 거쳤습니다.' : ''}</p>

            <table>
              <thead><tr><th style={{ width: '22%' }}>구분</th><th>개인정보 수집·이용·제공 동의 및 제3자 제공 등 고지</th></tr></thead>
              <tbody>
                <tr>
                  <td style={{ fontWeight: 700, background: 'var(--surface-3)' }}>{e.name}</td>
                  <td style={{ lineHeight: 1.7 }}>
                    <div>1. <b>수집·이용 목적</b>: {e.collect.purpose}</div>
                    <div>2. <b>수집 항목</b>: {storeTranscripts ? e.collect.itemsWithTranscript : e.collect.items}</div>
                    <div>3. <b>보유 및 이용 기간</b>: {e.collect.period}</div>
                    <div>4. {e.collect.refusal}</div>
                    <div style={{ margin: '10px 0', padding: '10px 12px', background: '#eef4ff', borderRadius: '10px', display: 'flex', gap: '18px', flexWrap: 'wrap', fontWeight: 700 }}>
                      <span>개인정보 수집·이용에</span>
                      <label style={{ cursor: 'pointer' }}><input type="radio" name="agree" checked={form.agree === 'yes'} onChange={() => set('agree', 'yes')} /> 동의합니다</label>
                      <label style={{ cursor: 'pointer' }}><input type="radio" name="agree" checked={form.agree === 'no'} onChange={() => set('agree', 'no')} /> 동의하지 않습니다</label>
                    </div>
                    <div style={{ fontWeight: 700, marginTop: '6px' }}>◆ 개인정보의 제3자 제공 고지</div>
                    <div>{e.thirdParty.text}</div>
                    <div style={{ fontWeight: 700, marginTop: '6px' }}>◆ 개인정보 국외 이전 고지</div>
                    <div>1. 개인정보를 이전받는 자: {e.overseas.receiver}</div>
                    <div>2. 이전되는 국가, 시기 및 방법: {e.overseas.whenHow}</div>
                    <div>3. 이전되는 개인정보 항목: {e.overseas.items}</div>
                    <div>4. 보유 및 이용 기간: {e.overseas.period}</div>
                    <div style={{ marginTop: '6px', fontSize: '0.88rem', color: '#4a5568' }}>◆ {e.processor}<br />◆ {e.rights}</div>
                  </td>
                </tr>
              </tbody>
            </table>

            <p style={{ fontWeight: 700, fontSize: '0.9rem', marginTop: '14px' }}>※ {g.under14}</p>
            <div className="consent-sign">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '8px', marginBottom: '8px' }}>
                {input('grade', '학년')}{input('classNo', '반')}{input('number', '번호')}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                {input('studentName', '학생 성명 (실명)')}
                {input('guardianName', '보호자(법정대리인) 성명')}
              </div>
              <label style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '0.9rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.under14} onChange={ev => set('under14', ev.target.checked)} /> 학생이 만 14세 미만이며, 본인은 법정대리인으로서 동의합니다.
              </label>
              <p style={{ fontSize: '0.82rem', color: '#6b7280', marginTop: '8px' }}>성명 입력은 서명을 갈음합니다. 제출 시각이 함께 기록됩니다.</p>
              {error && <p style={{ color: '#c53030', fontSize: '0.88rem' }}>{error}</p>}
              <button className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: '10px' }} disabled={!valid || submitting} onClick={submit}><Check size={18} /> {submitting ? '제출 중…' : '제출하기'}</button>
            </div>
            <p style={{ fontSize: '0.78rem', color: '#9ca3af', marginTop: '14px' }}><Info size={12} style={{ verticalAlign: '-2px' }} /> 양식 출처: 서울시교육청 창의미래교육과 「개인정보 수집·이용·제공 동의서 관련 안내」(2026.3) 예시 양식. 학교 자체 양식으로 받는 경우 이 화면 대신 종이 동의서를 사용해도 됩니다.</p>
          </>
        )}
      </div>
    </div>
  );
};

export default ParentConsentSign;
