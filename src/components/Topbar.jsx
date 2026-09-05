import React, { useState } from 'react';
import { Shield, Copy, Check, LogOut, RefreshCw, FileSignature, Sparkles } from 'lucide-react';

/**
 * 교사용 상단바
 * - 학급 코드 복사, 보호자 안내문, 학급 전환, 로그아웃 — 실제로 동작하는 것만 둔다.
 */
const Topbar = ({ teacherProfile, classCode, className, onSwitchClass, onLogout, onOpenConsent, onStartTour }) => {
  const [copied, setCopied] = useState(false);
  const name = teacherProfile?.teacherName ? (teacherProfile.teacherName.endsWith('님') ? teacherProfile.teacherName : `${teacherProfile.teacherName} 선생님`) : '선생님';

  const copyCode = async () => {
    if (!classCode) return;
    try {
      await navigator.clipboard.writeText(classCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard 미지원 */ }
  };

  return (
    <header className="topbar">
      <div className="topbar-title">
        <div className="topbar-brand-mark"><Shield size={19} /></div>
        <div style={{ minWidth: 0 }}>
          <div translate="no" className="notranslate" style={{ lineHeight: 1.15 }}>SEN-SEL <span style={{ fontWeight: 500, color: 'rgba(255,255,255,0.75)' }}>센셀</span></div>
          <div className="topbar-sub" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{className || '교실 속 마음을 읽는 사회정서 레이더'}</div>
        </div>
      </div>
      <div className="topbar-actions">
        {classCode && (
          <button className="topbar-chip" onClick={copyCode} title="학생들에게 알려줄 학급 입장 코드 (클릭하면 복사)">
            {copied ? <Check size={14} /> : <Copy size={14} />}
            <span className="hide-sm">학급 코드</span> <b>{classCode}</b>
          </button>
        )}
        {onStartTour && (
          <button className="topbar-chip" onClick={onStartTour} title="대시보드를 9단계로 둘러보는 인터랙티브 체험 (약 1분)" style={{ background: 'rgba(255,255,255,0.22)' }}>
            <Sparkles size={14} /> <span>1분 체험</span>
          </button>
        )}
        {onOpenConsent && (
          <button className="topbar-chip" onClick={onOpenConsent} title="학부모에게 보낼 안내문·동의서를 새 창으로 엽니다">
            <FileSignature size={14} /> <span className="hide-sm">보호자 안내문</span>
          </button>
        )}
        <span className="hide-sm" style={{ color: 'rgba(255,255,255,0.85)', fontWeight: 600, marginLeft: '4px' }}>{name}</span>
        {onSwitchClass && <button className="topbar-iconbtn" onClick={onSwitchClass} title="학급 전환 / 새 학급"><RefreshCw size={16} /></button>}
        {onLogout && <button className="topbar-iconbtn" onClick={onLogout} title="로그아웃"><LogOut size={16} /></button>}
      </div>
    </header>
  );
};

export default Topbar;
