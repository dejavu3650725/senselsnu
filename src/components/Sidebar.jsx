import React from 'react';
import { Home, BarChart2, AlertCircle, FileText, Users, Settings, UserCog, LayoutGrid, HeartHandshake, Mail, FolderArchive, CalendarDays, NotebookPen } from 'lucide-react';

const SECTIONS = [
  { label: '홈', items: [{ name: '대시보드', icon: Home }] },
  { label: '자주 보는', items: [
    { name: '관계 신호', icon: HeartHandshake },
    { name: '학급 분석', icon: BarChart2 },
    { name: '맞춤 처방', icon: AlertCircle },
    { name: '자리 배치', icon: LayoutGrid },
  ] },
  { label: '학급 운영', items: [
    { name: '가정 연계', icon: Mail },
    { name: '기록', icon: NotebookPen },
    { name: '리포트', icon: FileText },
    { name: '연간 계획', icon: CalendarDays },
    { name: '학생 관리', icon: Users },
  ] },
  { label: '설정', items: [
    { name: '서류함', icon: FolderArchive },
    { name: '챗봇 설정', icon: Settings, isModal: true },
    { name: '기본 설정', icon: UserCog, isModal: true },
  ] },
];

const Sidebar = ({ activeMenu, setActiveMenu, teacherProfile, badges = {} }) => {
  const name = teacherProfile?.teacherName || '선생님';
  const initial = name.replace(/선생님|님/g, '').trim().slice(0, 1) || '선';
  return (
    <nav className="sidebar" aria-label="주 메뉴">
      {SECTIONS.map(sec => (
        <React.Fragment key={sec.label}>
          <div className="nav-section">{sec.label}</div>
          {sec.items.map(item => (
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
