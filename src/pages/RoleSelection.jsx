import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, BookOpen, Users, LogIn, KeyRound, X } from 'lucide-react';
import { auth, googleProvider, db } from '../firebase';
import { signInWithPopup } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { ensureStudentSession } from '../utils/apiClient';

/**
 * 첫 화면 (/) — 선생님·학생이 같은 화면에서 바로 갈라진다.
 * 학생도 보는 화면이므로 관계망·분석·처방 같은 말은 쓰지 않는다. 브랜드(SEN SEL)는 크게.
 */
const RoleSelection = () => {
  const navigate = useNavigate();
  const [classCodeInput, setClassCodeInput] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [codeModal, setCodeModal] = useState(false);
  const [teacherCode, setTeacherCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const TEACHER_CODE = 'SENSELSNU';
  const [error, setError] = useState('');

  // 선생님 확인: 구글 로그인 전에 교사용 코드를 한 번 받는다 (이 브라우저에 기억)
  const startTeacher = () => {
    let saved = '';
    try { saved = localStorage.getItem('sensel-teacher-code') || ''; } catch { /* ignore */ }
    if (saved) handleTeacherLogin(); else { setTeacherCode(''); setCodeError(''); setCodeModal(true); }
  };
  const confirmCode = () => {
    const code = teacherCode.trim().toUpperCase();
    if (!code) { setCodeError('교사용 코드를 입력해 주세요.'); return; }
    if (code !== TEACHER_CODE) { setCodeError('코드가 맞지 않아요. 연수·안내에서 받은 교사용 코드를 확인해 주세요.'); return; }
    try { localStorage.setItem('sensel-teacher-code', code); } catch { /* ignore */ }
    setCodeModal(false);
    handleTeacherLogin();
  };

  const handleTeacherLogin = async () => {
    setIsSigningIn(true);
    try {
      await signInWithPopup(auth, googleProvider);
      navigate('/teacher-setup');
    } catch (e) {
      console.error('Google Sign In Error', e);
      alert('로그인 중 오류가 발생했습니다.');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleStudentJoin = async () => {
    const code = classCodeInput.trim();
    if (!code) { setError('선생님이 알려준 학급 코드를 적어 줘.'); return; }
    setIsVerifying(true); setError('');
    try {
      await ensureStudentSession(null);
      let joinCode = code;
      let classSnap = await getDoc(doc(db, 'classes', joinCode));
      if (!classSnap.exists() && code.toUpperCase() !== code) { joinCode = code.toUpperCase(); classSnap = await getDoc(doc(db, 'classes', joinCode)); }
      let isValid = classSnap.exists();
      if (!isValid) {
        try {
          const q = query(collection(db, 'teachers'), where('classCode', '==', code));
          isValid = !(await getDocs(q)).empty;
        } catch { /* 권한 없음 → 무효 처리 */ }
      }
      if (isValid) {
        await ensureStudentSession(joinCode);
        sessionStorage.setItem('studentClassCode', joinCode);
        navigate('/student');
      } else {
        setError('그 코드는 없는 것 같아. 선생님께 다시 물어봐 줘.');
      }
    } catch (e) {
      console.error('Class code verification error', e);
      setError('확인하는 중에 문제가 생겼어. 잠시 후 다시 해 볼래?');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="landing">
      <div className="landing-bg" aria-hidden="true"><span /><span /><span /></div>

      <div className="landing-hero">
        <div className="landing-logo"><Shield size={44} /></div>
        <div className="landing-brand" translate="no">SEN SEL</div>
        <p className="landing-sub">환영합니다! 어떤 역할로 접속하시겠어요?</p>
      </div>

      <div className="landing-cards">
        <div className="glass-card role-card">
          <div className="role-icon" style={{ background: 'var(--primary-light)' }}><BookOpen size={28} color="var(--primary-color)" /></div>
          <div>
            <h2>선생님</h2>
            <p>학교 구글 계정으로 로그인해 학급을 만들고, 학생들에게 나눠 줄 학급 코드를 받으세요.</p>
          </div>
          <div className="role-bottom">
            <div className="role-tags"><span>가상 학급으로 바로 체험</span><span>1분 체험 안내</span></div>
            <button className="role-btn teacher" onClick={startTeacher} disabled={isSigningIn}><LogIn size={18} /> {isSigningIn ? '로그인 중…' : '구글 계정으로 로그인'}</button>
          </div>
        </div>

        <div className="glass-card role-card">
          <div className="role-icon" style={{ background: 'rgba(56, 161, 105, 0.12)' }}><Users size={28} color="var(--success)" /></div>
          <div>
            <h2>학생</h2>
            <p>선생님이 알려준 학급 코드를 적으면 바로 나무와 이야기할 수 있어. 따로 가입하지 않아도 돼.</p>
          </div>
          <div className="role-bottom">
            <input
              className="code-input"
              type="text"
              value={classCodeInput}
              onChange={e => { setClassCodeInput(e.target.value); setError(''); }}
              placeholder="학급 코드 입력"
              aria-label="학급 코드"
              maxLength={12}
              onKeyDown={e => e.key === 'Enter' && handleStudentJoin()}
            />
            {error && <div className="code-error">{error}</div>}
            <button className="role-btn student" onClick={handleStudentJoin} disabled={isVerifying}>🌳 {isVerifying ? '확인 중…' : '나무에게 가기'}</button>
          </div>
        </div>
      </div>

      {codeModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }} onClick={() => setCodeModal(false)}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '420px', background: '#fff', borderRadius: '22px', padding: '26px', boxShadow: '0 24px 60px rgba(0,0,0,0.3)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div style={{ width: 44, height: 44, borderRadius: '14px', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><KeyRound size={22} color="var(--primary-color)" /></div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: '1.15rem', color: 'var(--text-strong)' }}>선생님 확인</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>교사용 코드를 한 번만 입력하면 다음부터는 바로 로그인돼요.</div>
              </div>
              <button onClick={() => setCodeModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-faint)', display: 'flex' }}><X size={18} /></button>
            </div>
            <input className="code-input" autoFocus value={teacherCode} onChange={e => { setTeacherCode(e.target.value.toUpperCase()); setCodeError(''); }} placeholder="교사용 코드" onKeyDown={e => e.key === 'Enter' && confirmCode()} />
            {codeError && <div className="code-error" style={{ marginTop: '8px' }}>{codeError}</div>}
            <button className="role-btn teacher" style={{ marginTop: '14px' }} onClick={confirmCode}><LogIn size={18} /> 확인하고 구글 로그인</button>
            <div style={{ fontSize: '0.76rem', color: 'var(--text-faint)', textAlign: 'center', marginTop: '10px' }}>학생은 이 코드가 필요 없어요. 왼쪽 [학생] 칸에 학급 코드를 적으면 돼요.</div>
          </div>
        </div>
      )}

      <div className="landing-steps">
        <div className="landing-step"><b>🙂 어떤 이야기든 괜찮아</b>정답은 없어. 나무는 네 말을 듣고, 궁금한 걸 하나씩만 물어봐.</div>
        <div className="landing-step"><b>🤖 나무는 사람이 아니야</b>AI 친구야. 네가 한 이야기를 그대로 저장하지 않고, 이름이나 전화번호 같은 건 묻지 않아.</div>
        <div className="landing-step"><b>🫶 힘든 일이 있으면</b>혼자 끙끙대지 않아도 돼. 많이 힘든 일은 선생님이나 어른이 함께 도와줄 수 있어.</div>
      </div>
    </div>
  );
};

export default RoleSelection;
