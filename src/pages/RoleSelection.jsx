import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, BookOpen, Users, LogIn } from 'lucide-react';
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
  const [error, setError] = useState('');

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
      const classSnap = await getDoc(doc(db, 'classes', code));
      let isValid = classSnap.exists();
      if (!isValid) {
        try {
          const q = query(collection(db, 'teachers'), where('classCode', '==', code));
          isValid = !(await getDocs(q)).empty;
        } catch { /* 권한 없음 → 무효 처리 */ }
      }
      if (isValid) {
        await ensureStudentSession(code);
        sessionStorage.setItem('studentClassCode', code);
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
            <button className="role-btn teacher" onClick={handleTeacherLogin} disabled={isSigningIn}><LogIn size={18} /> {isSigningIn ? '로그인 중…' : '구글 계정으로 로그인'}</button>
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

      <div className="landing-steps">
        <div className="landing-step"><b>🙂 어떤 이야기든 괜찮아</b>정답은 없어. 나무는 네 말을 듣고, 궁금한 걸 하나씩만 물어봐.</div>
        <div className="landing-step"><b>🤖 나무는 사람이 아니야</b>AI 친구야. 네가 한 이야기를 그대로 저장하지 않고, 이름이나 전화번호 같은 건 묻지 않아.</div>
        <div className="landing-step"><b>🫶 힘든 일이 있으면</b>혼자 끙끙대지 않아도 돼. 많이 힘든 일은 선생님이나 어른이 함께 도와줄 수 있어.</div>
      </div>
    </div>
  );
};

export default RoleSelection;
