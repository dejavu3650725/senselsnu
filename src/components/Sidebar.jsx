import React from 'react';
import { Home, BarChart2, Smile, AlertCircle, FileText, BookOpen, Users, Settings, UserCog, LayoutGrid, HeartHandshake } from 'lucide-react';

const Sidebar = ({ activeMenu, setActiveMenu, teacherProfile }) => {
  const menuItems = [
    { name: '대시보드', icon: Home },
    { name: '기본 설정', icon: UserCog, isModal: true },
    { name: '챗봇 설정', icon: Settings, isModal: true },
    { name: '학생 관리', icon: Users },
    { name: '자리 배치', icon: LayoutGrid },
    { name: '관계 신호', icon: HeartHandshake },
    { name: '학급 분석', icon: BarChart2 },
    { name: '감정 트래커', icon: Smile },
    { name: '맞춤 처방', icon: AlertCircle },
    { name: '리포트', icon: FileText },
    { name: '에듀테크 리소스', icon: BookOpen },
  ];

  return (
    <div className="sidebar">
      {menuItems.map((item) => (
        <div 
          key={item.name}
          className={`nav-item ${activeMenu === item.name && !item.isModal ? 'active' : ''}`}
          onClick={() => setActiveMenu(item.name)}
        >
          <item.icon size={20} />
          <span>{item.name}</span>
        </div>
      ))}
      
      <div className="welcome-badge">
        <Users size={24} color="#4a90e2" />
        <div>
          <div style={{fontWeight: 600}}>환영합니다,</div>
          <div style={{fontSize: '0.8rem', color: 'var(--text-muted)'}}>{teacherProfile?.teacherName || '김선생님'}</div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
