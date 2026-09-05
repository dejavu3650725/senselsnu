import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { ensureStudentSession } from '../utils/apiClient';
import { missionById, defaultMission, weekKey } from '../utils/growth';

/**
 * 우리 반 나무 — 교실 TV용 (/tree/:classCode)
 * classBoards/{classCode}의 학급 단위 집계만 읽는다. 학생 이름·관계·신호는 어디에도 없다.
 * 나무는 미션 완료 + 기술 연습 누적으로 자란다. 60초마다 새로고침.
 */
const STAGES = [
  { min: 0, icon: '🌱', name: '새싹', next: 10 },
  { min: 10, icon: '🌿', name: '어린 나무', next: 30 },
  { min: 30, icon: '🌳', name: '푸른 나무', next: 80 },
  { min: 80, icon: '🌳🍎', name: '열매 나무', next: 150 },
  { min: 150, icon: '🌳🌸🍎', name: '숲', next: null },
];
const stageOf = (n) => [...STAGES].reverse().find(s => n >= s.min) || STAGES[0];

const ClassTree = () => {
  const { classCode } = useParams();
  const [board, setBoard] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        await ensureStudentSession(null);
        const b = await getDoc(doc(db, 'classBoards', classCode));
        if (alive) setBoard(b.exists() ? b.data() : null);
      } catch (e) { console.error(e); } finally { if (alive) setLoaded(true); }
    };
    load();
    const t = setInterval(() => { load(); setNow(new Date()); }, 60000);
    return () => { alive = false; clearInterval(t); };
  }, [classCode]);

  const growth = (board?.missionDone || 0) * 2 + (board?.skillEvents || 0);
  const st = stageOf(growth);
  const pct = st.next ? Math.min(100, Math.round(((growth - st.min) / (st.next - st.min)) * 100)) : 100;
  const wk = weekKey();
  const mission = (board?.missionId && board?.weekKey === wk && missionById(board.missionId)) || defaultMission(wk);
  const m = board?.morning;

  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(1200px 600px at 50% -10%, #e6f4ea 0%, #f5f7fb 60%)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '28px 20px 40px', fontFamily: 'inherit' }}>
      <div style={{ width: '100%', maxWidth: '1100px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#234e35' }}>🌳 {board?.className || '우리 반'} 나무</div>
        <div style={{ color: '#718096', fontSize: '1rem' }}>{now.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' })}</div>
      </div>

      {!loaded ? null : !board ? (
        <div style={{ marginTop: '80px', textAlign: 'center', color: '#718096', fontSize: '1.2rem', lineHeight: 1.7 }}>아직 나무가 심어지지 않았어요.<br />선생님이 대시보드를 한 번 열면 우리 반 나무가 자라기 시작해요.</div>
      ) : (
        <div style={{ width: '100%', maxWidth: '1100px', display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) minmax(320px, 1fr)', gap: '22px', marginTop: '22px' }}>
          <div style={{ background: 'white', borderRadius: '28px', padding: '32px', boxShadow: '0 10px 30px rgba(0,0,0,0.06)', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
            <div style={{ fontSize: 'clamp(96px, 18vw, 180px)', lineHeight: 1, filter: 'drop-shadow(0 8px 12px rgba(0,0,0,0.12))' }}>{st.icon}</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#234e35' }}>{st.name}</div>
            <div style={{ width: '100%', maxWidth: '420px', height: '16px', background: '#e6f4ea', borderRadius: '999px', overflow: 'hidden' }}>
              <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg, #68d391, #38a169)', transition: 'width 1s' }} />
            </div>
            <div style={{ color: '#4a5568', fontSize: '1rem' }}>{st.next ? `다음 단계까지 ${st.next - growth}칸` : '우리 반이 숲이 되었어요!'} · 성장 {growth}</div>
            <div style={{ display: 'flex', gap: '18px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '6px', fontSize: '1rem', color: '#2d3748' }}>
              <span>🎯 미션 완료 <b>{board.missionDone}</b>번</span>
              <span>🌱 기술 연습 <b>{board.skillEvents}</b>번</span>
              <span>👥 참여 <b>{board.activeCount}</b>/{board.studentCount}명</span>
            </div>
            {board.topSkills?.length > 0 && (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '4px' }}>
                {board.topSkills.map(s => <span key={s.skill} style={{ background: '#f0fff4', border: '1px solid #c6f6d5', color: '#276749', borderRadius: '999px', padding: '6px 14px', fontWeight: 700 }}>{s.skill}</span>)}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div style={{ background: 'white', borderRadius: '28px', padding: '28px', boxShadow: '0 10px 30px rgba(0,0,0,0.06)' }}>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: '#b7791f', marginBottom: '8px' }}>☀️ 오늘 아침 이야기 {m?.area && <span style={{ fontWeight: 500, color: '#a0aec0' }}>· {m.area}</span>}</div>
              <div style={{ fontSize: 'clamp(1.4rem, 3vw, 2.1rem)', fontWeight: 800, color: '#2d3748', lineHeight: 1.3 }}>“{m?.topic || '오늘 기분은 어떤가요?'}”</div>
              <div style={{ fontSize: '1.1rem', color: '#4a5568', marginTop: '12px', lineHeight: 1.6 }}>{m?.questions?.[0]}</div>
              <div style={{ fontSize: '0.98rem', color: '#718096', marginTop: '6px' }}>{m?.questions?.[1]}</div>
            </div>
            <div style={{ background: '#fffbea', border: '2px solid #f6e05e', borderRadius: '28px', padding: '28px' }}>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: '#975a16', marginBottom: '8px' }}>🎯 이번 주 친절 미션 <span style={{ fontWeight: 500, color: '#b7791f' }}>· {board.missionDoneThisWeek}/{board.studentCount}명 했어요</span></div>
              <div style={{ fontSize: 'clamp(1.2rem, 2.6vw, 1.7rem)', fontWeight: 800, color: '#2d3748', lineHeight: 1.35 }}>{mission.text}</div>
              <div style={{ fontSize: '1rem', color: '#744210', marginTop: '8px' }}>{mission.why}</div>
            </div>
          </div>
        </div>
      )}
      <div style={{ marginTop: '26px', color: '#a0aec0', fontSize: '0.85rem' }}>이 화면에는 학생 이름이나 개인 정보가 나오지 않습니다 · 1분마다 새로고침</div>
    </div>
  );
};

export default ClassTree;
