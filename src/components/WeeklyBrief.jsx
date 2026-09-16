import React, { useMemo, useState } from 'react';
import { CalendarCheck, Copy, Check, ChevronDown, ChevronUp, ArrowRight } from 'lucide-react';
import { buildWeeklyBrief } from '../utils/weekly';

/**
 * 이번 주 브리핑 — 지난 7일에 실제로 바뀐 것 + 이번 주 할 일 3가지. 월요일 아침 1분용.
 * 복사하면 동학년 협의회·학급 일지·주간 계획에 그대로 붙일 수 있는 개조식 텍스트가 된다.
 */
const WeeklyBrief = ({ studentsData = [], classInfo, teacherProfile, setActiveMenu }) => {
  const className = classInfo?.className || teacherProfile?.className || '';
  const b = useMemo(() => buildWeeklyBrief(studentsData, { className }), [studentsData, className]);
  const [open, setOpen] = useState(() => { try { return localStorage.getItem('sensel-weekly-open') !== '0'; } catch { return true; } });
  const [copied, setCopied] = useState(false);
  const toggle = () => { setOpen(o => { try { localStorage.setItem('sensel-weekly-open', o ? '0' : '1'); } catch { /* ignore */ } return !o; }); };
  const copy = async () => { try { await navigator.clipboard.writeText(b.text); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* ignore */ } };
  const fmt = (d) => d.slice(5).replace('-', '.');

  return (
    <div className="wb-card" data-tour="weekly">
      <div className="wb-head">
        <span className="wb-title"><CalendarCheck size={15} /> 이번 주 브리핑 <span className="wb-range">{fmt(b.from)} ~ {fmt(b.to)}</span></span>
        <div className="wb-actions">
          <button className="wb-btn" onClick={copy}>{copied ? <Check size={13} /> : <Copy size={13} />} {copied ? '복사됨' : '개조식 복사'}</button>
          <button className="wb-btn ghost" onClick={toggle}>{open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</button>
        </div>
      </div>
      {open && (
        <div className="wb-body">
          <div className="wb-tiles">
            <div className="wb-tile"><div className="wb-k">참여</div><div className="wb-v">{b.participation.active}<span>/{b.participation.total}명</span></div><div className="wb-s">대화 {b.participation.totalDays}회{b.participation.quiet.length ? ` · 조용해진 ${b.participation.quiet.length}명` : ''}</div></div>
            <div className="wb-tile gold"><div className="wb-k">관계</div><div className="wb-v">{b.relations.newNoms}<span>건 새 지목</span></div><div className="wb-s">{b.relations.newMutual.length ? `서로 지목 ${b.relations.newMutual.length}쌍 · ` : ''}받은 지목 0 {b.relations.isolated.length}명</div></div>
            <div className={`wb-tile ${b.signals.unacked.length ? 'red' : b.signals.repeated.length || b.signals.lonely.length ? 'warn' : ''}`}><div className="wb-k">신호</div><div className="wb-v">{b.signals.conflictsThisWeek + b.signals.lonely.length + b.signals.alerts.length}<span>건</span></div><div className="wb-s">갈등 {b.signals.conflictsThisWeek} · 외로움 {b.signals.lonely.length} · 위기 {b.signals.alerts.length}</div></div>
            <div className="wb-tile green"><div className="wb-k">성장</div><div className="wb-v">{b.growth.missionsDone}<span>명 미션</span></div><div className="wb-s">{b.growth.topSkills.length ? b.growth.topSkills.slice(0, 2).map(s => s.skill).join(' · ') : '연습 기록 없음'}</div></div>
          </div>
          <div className="wb-todos">
            <div className="wb-todo-title">이번 주 할 일 3가지</div>
            {b.todos.map((t, i) => (
              <button key={i} className={`wb-todo ${t.tone}`} onClick={() => setActiveMenu && setActiveMenu(t.menu)}>
                <span className="wb-num">{i + 1}</span><span className="wb-text">{t.text}</span><ArrowRight size={13} className="wb-go" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default WeeklyBrief;
