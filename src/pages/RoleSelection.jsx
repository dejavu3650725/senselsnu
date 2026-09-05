import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { ensureStudentSession } from '../utils/apiClient';

/**
 * 첫 화면 (/) — 학생이 보는 화면.
 * 여기서는 관계망·분석·처방 이야기를 하지 않는다. 나무와 이야기하는 곳이라는 것, 나무는 사람이 아니라는 것,
 * 이야기를 그대로 저장하지 않는다는 것, 힘든 일이 있으면 어른이 도와줄 수 있다는 것만 솔직하게 말한다.
 * 선생님용 소개·로그인은 /teachers 로 분리.
 */
const RoleSelection = () => {
  const navigate = useNavigate();
  const [classCodeInput, setClassCodeInput] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');

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
    <div className="landing student-landing">
      <button className="landing-teacher-link" onClick={() => navigate('/teachers')}>선생님이신가요? →</button>

      <div className="landing-hero">
        <div className="student-tree" aria-hidden="true">🌳</div>
        <h1 className="landing-title">안녕, 나는 나무야.<br /><span className="accent">오늘 하루 어땠어?</span></h1>
        <p className="landing-sub">기쁜 일도, 속상한 일도, 그냥 심심한 이야기도 괜찮아.<br className="hide-sm" />선생님이 알려준 학급 코드를 적고 들어와.</p>
      </div>

      <div className="glass-card student-join">
        <input
          type="text"
          value={classCodeInput}
          onChange={e => { setClassCodeInput(e.target.value); setError(''); }}
          placeholder="학급 코드"
          autoFocus
          aria-label="학급 코드"
          onKeyDown={e => e.key === 'Enter' && handleStudentJoin()}
        />
        <button onClick={handleStudentJoin} disabled={isVerifying}>{isVerifying ? '확인 중…' : '나무에게 가기'}</button>
        {error && <div className="student-join-error">{error}</div>}
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
