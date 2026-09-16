import React, { useState } from 'react';
import { Shield, Copy, Check, LogOut, RefreshCw, FileSignature, Sparkles, UserPlus } from 'lucide-react';

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
  const [invited, setInvited] = useState(false);
  const invite = async () => {
    const msg = `[SEN SEL 센셀] 우리 반 마음·관계 도우미를 써 보고 있어요.\n학생들이 AI '나무'와 이야기하면 관계망·외로움·갈등 신호가 담임에게만 보이고, 자리 배치·학부모 상담 준비까지 이어집니다. 대화 원문은 저장하지 않아요.\n\n접속: ${window.location.origin}\n[선생님] → 교사용 코드 SENSELSNU 입력 → 구글 로그인 → '데모 학급 체험'으로 먼저 둘러보세요 (1분 체험 버튼).\n학운위·보호자 동의 서식은 [서류함]에 있어요.`;
    try { await navigator.clipboard.writeText(msg); setInvited(true); setTimeout(() => setInvited(false), 2000); } catch { /* ignore */ }
  };

  return (
    <header className="topbar">
      <div className="topbar-title" role={onSwitchClass ? 'button' : undefined} tabIndex={onSwitchClass ? 0 : undefined} title={onSwitchClass ? '첫 화면(학급 관리)으로' : undefined} style={onSwitchClass ? { cursor: 'pointer' } : undefined} onClick={onSwitchClass} onKeyDown={e => { if (onSwitchClass && (e.key === 'Enter' || e.key === ' ')) onSwitchClass(); }}>
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
        <button className="topbar-chip" onClick={invite} title="동학년·동료 선생님께 보낼 소개 문구를 복사합니다 (접속 주소 + 교사용 코드 + 1분 체험 안내)">
          {invited ? <Check size={14} /> : <UserPlus size={14} />} <span className="hide-sm">{invited ? '복사됨' : '동료 초대'}</span>
        </button>
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
