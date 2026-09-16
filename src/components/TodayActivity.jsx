import React, { useMemo, useState } from 'react';
import { Activity, MessageCircle, Star, HeartHandshake, CloudRain, Siren } from 'lucide-react';

const todayKey = () => new Date().toISOString().slice(0, 10);
const isToday = (iso) => typeof iso === 'string' && iso.slice(0, 10) === todayKey();
const tsToday = (ts) => {
  const ms = ts?.toMillis ? ts.toMillis() : (ts?.seconds ? ts.seconds * 1000 : 0);
  return ms > 0 && new Date(ms).toISOString().slice(0, 10) === todayKey();
};

/**
 * 오늘 활동 — "학생들이 오늘 나무와 이야기한 것이 지금 여기 들어오고 있는가"를 교사가 한 줄로 확인.
 * 대화 원문은 저장하지 않으므로, 오늘 날짜의 신호(대화 턴 수·새 지목·갈등 언급·외로움·위기)만 센다. 실시간(onSnapshot) 갱신.
 */
const TodayActivity = ({ studentsData = [], onOpenStudent }) => {
  const [showNotYet, setShowNotYet] = useState(false);
  const a = useMemo(() => {
    const tk = todayKey();
    const all = studentsData.map(s => {
      const turns = s.dailyTurns?.date === tk ? Number(s.dailyTurns.count) || 0 : 0;
      const talked = turns > 0 || (s.sessionDates || []).includes(tk) || tsToday(s.lastActive);
      const noms = (s.nominationLog || []).filter(n => isToday(n?.timestamp)).map(n => n.target);
      const conflicts = (s.conflictMentions || []).filter(c => isToday(c?.timestamp)).length;
      const lonely = (s.lonelySignals || []).filter(isToday).length;
      const alerts = (s.alerts || []).filter(x => isToday(x?.timestamp)).length;
      return { s, turns, talked, noms, conflicts, lonely, alerts };
    });
    const seen = (r) => r.talked || r.noms.length || r.conflicts || r.lonely || r.alerts;
    const notYet = all.filter(r => !seen(r)).map(r => r.s);
    const rows = all.filter(seen);
    rows.sort((x, y) => (y.alerts - x.alerts) || (y.conflicts - x.conflicts) || (y.turns - x.turns));
    const sum = (k) => rows.reduce((n, r) => n + (Array.isArray(r[k]) ? r[k].length : Number(r[k]) || 0), 0);
    return { rows, notYet, talked: rows.filter(r => r.talked).length, turns: sum('turns'), noms: sum('noms'), conflicts: sum('conflicts'), lonely: sum('lonely'), alerts: sum('alerts') };
  }, [studentsData]);

  const Stat = ({ icon: Icon, label, value, tone }) => (
    <span className={`ta-stat ${tone || ''}`}><Icon size={13} /> {label} <b>{value}</b></span>
  );

  return (
    <div className="ta-strip" data-tour="today-activity">
      <div className="ta-head">
        <span className="ta-title"><Activity size={15} /> 오늘 활동 <span className="ta-live">● 실시간</span></span>
        <div className="ta-stats">
          <Stat icon={MessageCircle} label="대화한 학생" value={`${a.talked}명 · ${a.turns}턴`} />
          <Stat icon={Star} label="새 지목" value={a.noms} tone="gold" />
          <Stat icon={HeartHandshake} label="갈등 언급" value={a.conflicts} tone={a.conflicts ? 'warn' : ''} />
          <Stat icon={CloudRain} label="외로움" value={a.lonely} tone={a.lonely ? 'purple' : ''} />
          <Stat icon={Siren} label="위기" value={a.alerts} tone={a.alerts ? 'red' : ''} />
          {a.notYet.length > 0 && a.rows.length > 0 && <button className={`ta-stat ta-toggle ${showNotYet ? 'on' : ''}`} onClick={() => setShowNotYet(v => !v)} title="오늘 아직 나무와 이야기하지 않은 학생">아직 {a.notYet.length}명</button>}
        </div>
      </div>
      {a.rows.length === 0 ? (
        <div className="ta-empty">오늘 아직 나무와 이야기한 학생이 없어요. 학생이 학급 코드로 들어와 한 마디만 보내도 여기에 바로 표시됩니다. (대화 내용은 저장되지 않고, 오늘 날짜의 신호만 셉니다)</div>
      ) : (
        <div className="ta-chips">
          {a.rows.map(r => (
            <button key={r.s.id} className={`ta-chip ${r.alerts ? 'red' : r.conflicts ? 'warn' : ''}`} onClick={() => onOpenStudent && onOpenStudent(r.s.id)} title="맞춤 처방에서 보기">
              <span className="ta-name">{r.s.avatar ? `${r.s.avatar} ` : ''}{r.s.realName || r.s.nickname}</span>
              <span className="ta-meta">
                {r.turns > 0 && <span>{r.turns}턴</span>}
                {r.noms.length > 0 && <span className="gold">★ {r.noms.join(', ')}</span>}
                {r.conflicts > 0 && <span className="warn">갈등 {r.conflicts}</span>}
                {r.lonely > 0 && <span className="purple">외로움</span>}
                {r.alerts > 0 && <span className="red">위기</span>}
                {r.talked && !r.turns && !r.noms.length && !r.conflicts && !r.lonely && !r.alerts && <span>입장</span>}
              </span>
            </button>
          ))}
        </div>
      )}
      {showNotYet && a.notYet.length > 0 && (
        <div className="ta-notyet">오늘 아직: {a.notYet.map(s => s.realName || s.nickname).join(', ')} <span className="ta-hint">— 교실에서 이름 없이 "아직 나무 안 만난 사람 5분!"으로만 독려하세요.</span></div>
      )}
    </div>
  );
};

export default TodayActivity;
