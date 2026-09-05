import React, { useState, useEffect } from 'react';
import { Sun, UserCheck, Copy, Check, Tv, ArrowRight, Sprout } from 'lucide-react';
import { db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { seoulGradeLabel } from '../utils/seoulSel';
import { morningCard, studentOfTheDay, noticeOfTheDay } from '../utils/today';
import { buildClassReport, weekKey, defaultMission, missionById, dayKey } from '../utils/growth';

const TIER = { urgent: { label: '긴급', color: '#c53030' }, high: { label: '높음', color: '#c05621' }, watch: { label: '관심', color: '#b7791f' }, ok: { label: '안정', color: '#2f855a' } };

/**
 * 월요일 1분 피드 — 대시보드 최상단.
 * 왼쪽(오늘 챙길 학생)은 관계 신호 기반이라 교사만 본다. 가운데(아침 활동)와 오른쪽(알림장)은 개인 정보가 없어 TV·가정에도 나간다.
 * 이 컴포넌트는 학급 단위 집계(classBoards)를 조용히 갱신해 TV 화면(/tree/:classCode)이 관계 데이터 없이 동작하게 한다.
 */
const TodayFeed = ({ studentsData = [], teacherProfile, classCode, classInfo, onOpenStudent }) => {
  const gradeLabel = seoulGradeLabel(teacherProfile?.selLevel, teacherProfile?.gradeYear);
  const className = classInfo?.className || teacherProfile?.className || '';
  const card = morningCard(gradeLabel, new Date(), studentsData);
  const who = studentOfTheDay(studentsData);
  const notice = noticeOfTheDay(gradeLabel, classInfo?.mission, className, new Date(), studentsData);
  const [copied, setCopied] = useState(false);
  const wk = weekKey();
  const mission = (classInfo?.mission?.weekKey === wk && missionById(classInfo.mission.missionId)) || defaultMission(wk);
  const missionDone = studentsData.filter(s => (s.missions || []).some(m => m && m.weekKey === wk)).length;
  const treeUrl = `${window.location.origin}/tree/${classCode}`;

  // 학급 보드(집계만) 갱신 — 개인 식별 정보 없음. 하루 1회 또는 값이 바뀌면.
  useEffect(() => {
    if (!classCode || !studentsData.length) return;
    const r = buildClassReport(studentsData, { classCode, className, gradeLabel, from: '2000-01-01', to: dayKey(), periodLabel: '전체' });
    const board = {
      classCode, className, gradeLabel, studentCount: studentsData.length, activeCount: r.activeCount,
      missionDone: r.missionDone, missionDoneThisWeek: missionDone, weekKey: wk, missionId: mission.id,
      skillEvents: studentsData.reduce((n, s) => n + (s.skillLog || []).length, 0),
      topSkills: r.topSkills.slice(0, 3).map(s => ({ skill: s.skill, area: s.area })),
      morning: { area: card.area, topic: card.topic, questions: card.questions, lessonTopic: card.lessonTopic, lessonSkill: card.lessonSkill },
      updatedAt: new Date().toISOString(), day: dayKey(),
    };
    const key = `sensel-board-${classCode}`;
    const sig = JSON.stringify([board.day, board.className, board.gradeLabel, board.morning.topic, board.morning.questions, board.missionDone, board.missionDoneThisWeek, board.skillEvents, board.activeCount, board.studentCount, board.missionId]);
    try { if (localStorage.getItem(key) === sig) return; } catch { /* ignore */ }
    setDoc(doc(db, 'classBoards', classCode), board).then(() => { try { localStorage.setItem(key, sig); } catch { /* ignore */ } }).catch(e => console.error('board update error', e));
  }, [classCode, studentsData, className, gradeLabel, wk, mission.id, missionDone, card.topic]);

  const copy = async () => { try { await navigator.clipboard.writeText(notice); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* ignore */ } };
  const t = TIER[who?.tier] || TIER.ok;

  return (
    <div className="today-feed" data-tour="today">
      <div className="today-card" style={{ borderTop: `4px solid ${t.color}` }}>
        <div className="today-title"><UserCheck size={16} /> 오늘 챙길 학생 <span className="today-sub">교사만</span></div>
        {who ? (
          <>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-strong)' }}>{who.name}</span>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: t.color }}>{t.label}</span>
              {who.focus.slice(0, 2).map(f => <span key={f} className="chip" style={{ fontSize: '0.7rem', padding: '2px 8px' }}>{f}</span>)}
            </div>
            {(who.reasons || []).length > 0 && (
              <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
                {who.reasons.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            )}
            <div style={{ fontSize: '0.9rem', color: 'var(--text-main)', lineHeight: 1.5 }}>{who.action}</div>
            {onOpenStudent && <button className="btn btn-secondary" style={{ alignSelf: 'flex-start', padding: '5px 10px', fontSize: '0.8rem' }} onClick={() => onOpenStudent(who.id)}>맞춤 처방 <ArrowRight size={13} /></button>}
          </>
        ) : <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>학생이 등록되면 매일 한 명을 골라 드려요.</div>}
      </div>

      <div className="today-card" style={{ borderTop: '4px solid #d69e2e' }}>
        <div className="today-title"><Sun size={16} /> 오늘 아침 활동 <span className="today-sub">{card.minutes}분</span></div>
        <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-strong)', lineHeight: 1.35 }}>“{card.topic}”</div>
        <div style={{ fontSize: '0.86rem', color: 'var(--text-main)', lineHeight: 1.5 }}>{card.questions[0]}</div>
        {card.why && <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>왜 이 주제? {card.why}</div>}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" style={{ padding: '5px 10px', fontSize: '0.8rem' }} onClick={() => window.open(treeUrl, '_blank', 'noopener')}><Tv size={13} /> TV에 띄우기</button>
          <button className="btn btn-secondary" style={{ padding: '5px 10px', fontSize: '0.8rem' }} title="학생들에게 우리 반 나무를 소개하는 화면(3분)" onClick={() => window.open(`${treeUrl}?intro=1`, '_blank', 'noopener')}>🌳 나무 소개</button>
        </div>
      </div>

      <div className="today-card" style={{ borderTop: '4px solid #38a169' }}>
        <div className="today-title"><Sprout size={16} /> 오늘 알림장 한 줄 <span className="today-sub">미션 {missionDone}/{studentsData.length}</span></div>
        <pre style={{ margin: 0, fontFamily: 'inherit', fontSize: '0.84rem', color: 'var(--text-main)', lineHeight: 1.55, background: 'var(--surface-3)', borderRadius: '10px', padding: '8px 10px', whiteSpace: 'pre-wrap', maxHeight: '112px', overflowY: 'auto' }}>{notice}</pre>
        <button className="btn btn-secondary" style={{ alignSelf: 'flex-start', padding: '5px 10px', fontSize: '0.8rem' }} onClick={copy}>{copied ? <Check size={13} /> : <Copy size={13} />} {copied ? '복사됨' : '복사'}</button>
      </div>
    </div>
  );
};

export default TodayFeed;
