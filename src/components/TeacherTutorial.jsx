import React, { useState } from 'react';
import { Shield, Sparkles, Users, HeartHandshake, LayoutGrid, Mail } from 'lucide-react';

/**
 * 첫 로그인 환영 창 — 한 번만(브라우저 기준). "1분 체험 시작"이 QuickTour를 연다.
 * 언제든 상단바의 [1분 체험] 버튼으로 다시 볼 수 있다.
 */
const KEY = 'sensel-welcome-seen';

const TeacherTutorial = ({ onStartTour, isDemo }) => {
  const [isOpen, setIsOpen] = useState(() => { try { return localStorage.getItem(KEY) !== '1'; } catch { return true; } });
  const close = () => { try { localStorage.setItem(KEY, '1'); } catch { /* ignore */ } setIsOpen(false); };
  if (!isOpen) return null;

  const rows = [
    { icon: <Users size={18} />, t: '학생이 대화합니다', d: '긍정적인 질문만으로 오늘의 기분과 함께하고 싶은 친구를 자연스럽게 이야기합니다. 학생 첫 화면에는 분석 이야기가 없습니다.' },
    { icon: <HeartHandshake size={18} />, t: '선생님이 한눈에 봅니다', d: '소시오그램, 갈등·외로움 신호, 긴급 알림(5개 중대 범주만)이 정리됩니다. 관계망은 선생님만 봅니다.' },
    { icon: <LayoutGrid size={18} />, t: '교실이 달라집니다', d: '근거 성취기준이 붙은 자리 배치·맞춤 처방·상담 기록 초안으로 이어집니다.' },
    { icon: <Mail size={18} />, t: '가정과 학교로 잇습니다', d: '가정통신문·학급 리포트·"집에서 해봤어요" 회신, 학운위 심의·보호자 동의 서식까지 한곳에서.' },
  ];

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '16px' }}>
      <div className="glass-card" style={{ width: '100%', maxWidth: '560px', background: 'white', padding: '32px', borderRadius: '24px', animation: 'slideUp 0.3s ease-out' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '18px' }}>
          <div style={{ width: 54, height: 54, background: 'var(--primary-light)', borderRadius: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0 }}><Shield size={28} color="var(--primary-color)" /></div>
          <div>
            <h2 style={{ fontSize: '1.4rem', color: 'var(--text-strong)', margin: 0 }}>센셀에 오신 것을 환영합니다</h2>
            <p style={{ color: 'var(--text-muted)', margin: '2px 0 0', fontSize: '0.9rem' }}>{isDemo ? '데모 학급입니다 — 가상 학생 23명의 관계망·신호·기록이 채워져 있어요.' : '평가가 아니라 심리적 안전망을 만드는 도구입니다.'}</p>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {rows.map(r => (
            <div key={r.t} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', background: 'var(--surface-2)', borderRadius: '12px', padding: '10px 12px' }}>
              <span style={{ color: 'var(--primary-color)', marginTop: '2px', flexShrink: 0 }}>{r.icon}</span>
              <div><b style={{ display: 'block', fontSize: '0.95rem' }}>{r.t}</b><span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.5 }}>{r.d}</span></div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={close}>바로 시작</button>
          <button className="btn btn-primary" style={{ flex: 2 }} onClick={() => { close(); onStartTour && onStartTour(); }}><Sparkles size={16} /> 1분 체험으로 둘러보기</button>
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-faint)', textAlign: 'center', marginTop: '10px' }}>언제든 상단의 [1분 체험] 버튼으로 다시 볼 수 있어요.</div>
      </div>
    </div>
  );
};

export default TeacherTutorial;
