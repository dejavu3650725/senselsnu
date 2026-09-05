import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Printer, ArrowLeft, Heart, Check, Info } from 'lucide-react';
import { db } from '../firebase';
import { doc, getDoc, addDoc, collection } from 'firebase/firestore';
import { ensureStudentSession } from '../utils/apiClient';
import { familyTipsForAreas } from '../utils/familyLink';
import { monthKey, weekKey, MISSION_POOL, missionById, defaultMission } from '../utils/growth';

const AREA_COLOR = { '자기': '#805ad5', '대인관계': '#dd6b20', '공동체': '#d53f8c', '마음건강': '#c53030' };

/**
 * 학부모용 월간 가정 리포트 (/family/:classCode/monthly)
 * - 교사가 [가정 연계]에서 '발행'한 학급 단위 집계(classReports)만 보여 준다. 학생 개인 정보는 없다.
 * - "집에서 해봤어요" 한 번 → familyFeedback에 익명 회신(학급 코드·주차만) → 교사 화면에 건수로 집계
 */
const ParentMonthly = () => {
  const { classCode } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [cls, setCls] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [sent, setSent] = useState(() => { try { return localStorage.getItem(`sensel-fb-${classCode}-${weekKey()}`) === '1'; } catch { return false; } });
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        await ensureStudentSession(null);
        const c = await getDoc(doc(db, 'classes', classCode));
        if (c.exists()) setCls(c.data());
        const now = new Date();
        const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        for (const mk of [monthKey(now), monthKey(prev)]) {
          const r = await getDoc(doc(db, 'classReports', `${classCode}_${mk}`));
          if (r.exists()) { setReport(r.data()); break; }
        }
      } catch (e) { console.error('parent monthly load error', e); }
      finally { setLoaded(true); }
    };
    load();
  }, [classCode]);

  const sendFeedback = async () => {
    if (sent || sending) return;
    setSending(true);
    try {
      await addDoc(collection(db, 'familyFeedback'), { classCode, weekKey: weekKey(), month: monthKey(), at: new Date().toISOString() });
      setSent(true);
      try { localStorage.setItem(`sensel-fb-${classCode}-${weekKey()}`, '1'); } catch { /* ignore */ }
    } catch (e) { console.error('feedback error', e); }
    finally { setSending(false); }
  };

  const className = report?.className || cls?.className || '우리 학급';
  const gradeLabel = report?.gradeLabel || '초5';
  const mission = (cls?.mission && cls.mission.weekKey === weekKey() && missionById(cls.mission.missionId)) || defaultMission();
  const tips = report ? familyTipsForAreas(report.topAreas?.slice(0, 2) || [], gradeLabel, 2) : [];
  const [y, m] = (report?.month || monthKey()).split('-');

  return (
    <div className="consent-page">
      <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', flexWrap: 'wrap' }}>
        <button className="btn btn-secondary" onClick={() => navigate(-1)}><ArrowLeft size={16} /> 돌아가기</button>
        <div style={{ marginLeft: 'auto' }}><button className="btn btn-primary" onClick={() => window.print()}><Printer size={16} /> 인쇄 / PDF 저장</button></div>
      </div>

      <div className="consent-doc" id="print-area">
        <div style={{ textAlign: 'center', fontSize: '0.85rem', letterSpacing: '0.3em', color: '#6b7280' }}>가 정 리 포 트</div>
        <h1 style={{ fontSize: '1.4rem' }}>{className} {Number(m)}월 마음 성장 소식</h1>
        <p style={{ textAlign: 'center', color: '#6b7280', fontSize: '0.9rem' }}>서울 사회정서교육 · 학급 전체 이야기입니다. 특정 학생의 정보는 담겨 있지 않습니다.</p>

        {!loaded ? null : !report ? (
          <div style={{ padding: '28px', textAlign: 'center', color: '#6b7280', lineHeight: 1.6 }}>
            아직 이번 달 소식이 발행되지 않았습니다. 담임 선생님이 발행하면 이 주소에서 볼 수 있어요.
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', margin: '18px 0' }}>
              <div style={{ background: 'var(--surface-3)', borderRadius: '12px', padding: '12px', textAlign: 'center' }}><div style={{ fontSize: '1.6rem', fontWeight: 800 }}>{report.activeCount}<span style={{ fontSize: '0.9rem', color: '#6b7280' }}>/{report.studentCount}명</span></div><div style={{ fontSize: '0.8rem', color: '#6b7280' }}>이번 달 사회정서기술을 연습한 학생</div></div>
              <div style={{ background: 'var(--surface-3)', borderRadius: '12px', padding: '12px', textAlign: 'center' }}><div style={{ fontSize: '1.6rem', fontWeight: 800 }}>{report.missionDone}<span style={{ fontSize: '0.9rem', color: '#6b7280' }}>번</span></div><div style={{ fontSize: '0.8rem', color: '#6b7280' }}>친절 미션 "했어요" 누적</div></div>
              <div style={{ background: 'var(--surface-3)', borderRadius: '12px', padding: '12px', textAlign: 'center' }}><div style={{ fontSize: '1.6rem', fontWeight: 800 }}>{report.topAreas?.[0] || '-'}</div><div style={{ fontSize: '0.8rem', color: '#6b7280' }}>이번 달 가장 많이 연습한 영역</div></div>
            </div>

            <h2>이번 달 우리 반이 연습한 사회정서기술</h2>
            {report.topSkills?.length ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {report.topSkills.map(s => (
                  <span key={s.skill} style={{ border: `1px solid ${AREA_COLOR[s.area] || '#cbd5e1'}66`, borderLeft: `4px solid ${AREA_COLOR[s.area] || '#cbd5e1'}`, borderRadius: '10px', padding: '6px 12px', fontSize: '0.92rem' }}>
                    <b>{s.skill}</b> <span style={{ color: '#6b7280', fontSize: '0.8rem' }}>{s.area} · {s.count}회</span>
                  </span>
                ))}
              </div>
            ) : <p style={{ color: '#6b7280' }}>이번 달에는 기록된 연습이 아직 적습니다. 다음 달 소식을 기다려 주세요.</p>}

            <h2>이번 주 친절 미션 — 집에서도 한 번</h2>
            <div style={{ background: '#fffbea', border: '1px solid #f6e05e', borderRadius: '12px', padding: '12px 14px' }}>
              <div style={{ fontWeight: 800 }}>🎯 {mission.text}</div>
              <div style={{ fontSize: '0.85rem', color: '#744210', marginTop: '4px' }}>{mission.why} 아이가 학교에서 이 미션을 하고 있어요. 집에서는 "이번 주 미션 해봤어?" 한 번만 물어봐 주세요.</div>
            </div>

            <h2>오늘 저녁, 이렇게 말을 건네 보세요</h2>
            {tips.map((t, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: '12px', border: '1px solid var(--border)', borderRadius: '12px', padding: '10px 12px', marginBottom: '8px', breakInside: 'avoid' }}>
                <div>
                  <div style={{ fontWeight: 800, color: AREA_COLOR[t.area] || 'var(--primary-color)', fontSize: '0.9rem' }}>{t.skill}</div>
                  <div style={{ fontSize: '0.84rem', color: '#4a5568', marginTop: '4px', fontStyle: 'italic' }}>“{t.question}”</div>
                </div>
                <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.88rem', lineHeight: 1.6 }}>
                  {t.actions.slice(0, 2).map((a, j) => <li key={j}>{a}</li>)}
                </ul>
              </div>
            ))}

            <div className="no-print" style={{ marginTop: '22px', background: sent ? '#f0fff4' : 'var(--primary-light)', border: `1px solid ${sent ? '#c6f6d5' : 'transparent'}`, borderRadius: '14px', padding: '16px', textAlign: 'center' }}>
              <div style={{ fontWeight: 800, marginBottom: '6px' }}>{sent ? '고맙습니다. 선생님께 "가정 실천 1건"으로만 전달됩니다.' : '집에서 한 번 해보셨나요?'}</div>
              <div style={{ fontSize: '0.82rem', color: '#4a5568', marginBottom: '10px' }}>누가 눌렀는지는 기록되지 않습니다. 학급 전체 건수만 선생님께 보입니다.</div>
              <button className="btn btn-primary" disabled={sent || sending} onClick={sendFeedback}>{sent ? <Check size={16} /> : <Heart size={16} />} {sent ? '전달됨' : '집에서 해봤어요'}</button>
            </div>

            <p style={{ marginTop: '18px', fontSize: '0.78rem', color: '#9ca3af' }}>
              <Info size={12} style={{ verticalAlign: '-2px' }} /> 근거: 교육부 한국형 사회정서교육 · 서울특별시교육청 사회정서교육자료({gradeLabel}) · 발행 {new Date(report.generatedAt).toLocaleDateString('ko-KR')}
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default ParentMonthly;
