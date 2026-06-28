import React from 'react';
import { Shield, Search, Settings, User } from 'lucide-react';

const Topbar = ({ teacherProfile }) => {
  return (
    <div className="topbar">
      <div className="topbar-title">
        <Shield size={24} />
        <span translate="no" className="notranslate">SEN-SEL-SNU (SafetyNet for US)</span>
      </div>
      <div className="topbar-actions">
        <span>
          환영합니다, {teacherProfile?.teacherName ? (teacherProfile.teacherName.endsWith('님') ? teacherProfile.teacherName : `${teacherProfile.teacherName}님`) : '김선생님'}
        </span>
        <Search size={20} style={{ cursor: 'pointer' }} />
        <Settings size={20} style={{ cursor: 'pointer' }} />
        <User size={20} style={{ cursor: 'pointer' }} />
      </div>
    </div>
  );
};

export default Topbar;
