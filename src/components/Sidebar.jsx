import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Home, BarChart2, AlertCircle, FileText, Users, Settings, UserCog, LayoutGrid, HeartHandshake, Mail, FolderArchive, CalendarDays, NotebookPen } from 'lucide-react';

// 매일 쓰는 메뉴만 펼쳐 두고, 나머지는 접어 둔다 (번잡함 줄이기). 접힘 상태는 브라우저에 기억.
const SECTIONS = [
  { label: '홈', items: [{ name: '대시보드', icon: Home }] },
  { label: '자주 보는', items: [
    { name: '관계 신호', icon: HeartHandshake },
    { name: '학급 분석', icon: BarChart2 },
    { name: '맞춤 처방', icon: AlertCircle },
    { name: '자리 배치', icon: LayoutGrid },
  ] },
  { label: '학급 운영', collapsible: true, items: [
    { name: '가정 연계', icon: Mail },
    { name: '기록', icon: NotebookPen },
    { name: '리포트', icon: FileText },
    { name: '연간 계획', icon: CalendarDays },
    { name: '학생 관리', icon: Users },
  ] },
  { label: '설정', collapsible: true, items: [
    { name: '서류함', icon: FolderArchive },
    { name: '챗봇 설정', icon: Settings, isModal: true },
    { name: '기본 설정', icon: UserCog, isModal: true },
  ] },
];

const Sidebar = ({ activeMenu, setActiveMenu, teacherProfile, badges = {} }) => {
  const name = teacherProfile?.teacherName || '선생님';
  const initial = name.replace(/선생님|님/g, '').trim().slice(0, 1) || '선';
  const [openSec, setOpenSec] = useState(() => { try { return JSON.parse(localStorage.getItem('sensel-nav-open') || '{}'); } catch { return {}; } });
  const toggleSec = (label) => setOpenSec(prev => { const next = { ...prev, [label]: !prev[label] }; try { localStorage.setItem('sensel-nav-open', JSON.stringify(next)); } catch { /* ignore */ } return next; });
  const isOpen = (sec) => !sec.collapsible || openSec[sec.label] || sec.items.some(i => i.name === activeMenu && !i.isModal);
  return (
    <nav className="sidebar" aria-label="주 메뉴">
      {SECTIONS.map(sec => (
        <React.Fragment key={sec.label}>
          {sec.collapsible ? (
            <button className={`nav-section nav-section-btn ${isOpen(sec) ? 'open' : ''}`} onClick={() => toggleSec(sec.label)} title={isOpen(sec) ? '접기' : '펼치기'}>
              {isOpen(sec) ? <ChevronDown size={12} /> : <ChevronRight size={12} />} {sec.label}{!isOpen(sec) && <span className="nav-section-count">{sec.items.length}</span>}
            </button>
          ) : (
            <div className="nav-section">{sec.label}</div>
          )}
          {isOpen(sec) && sec.items.map(item => (
            <div
              key={item.name}
              role="button"
              tabIndex={0}
              title={item.name}
              data-tour={`menu-${item.name}`}
              className={`nav-item ${activeMenu === item.name && !item.isModal ? 'active' : ''}`}
              onClick={() => setActiveMenu(item.name)}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActiveMenu(item.name); } }}
            >
              <item.icon size={19} />
              <span>{item.name}</span>
              {badges[item.name] > 0 && <span className="nav-badge">{badges[item.name]}</span>}
            </div>
          ))}
        </React.Fragment>
      ))}

      <div className="welcome-badge">
        <div className="welcome-avatar">{initial}</div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name.endsWith('님') ? name : `${name} 선생님`}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>담임 계정</div>
        </div>
      </div>
    </nav>
  );
};

export default Sidebar;
