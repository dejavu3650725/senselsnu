import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, ArrowLeft } from 'lucide-react';
import { auth, googleProvider } from '../firebase';
import { signInWithPopup } from 'firebase/auth';

/**
 * 선생님 로그인 (/teachers)
 * 학생도 이 주소에 올 수 있으므로 여기에는 기능 설명을 두지 않는다. 로그인 버튼뿐.
 * 관계망·신호·처방에 대한 안내는 로그인 후(학급 만들기·대시보드 튜토리얼)와 교사용 안내서(docs/)에만 있다.
 */
const TeacherLanding = () => {
  const navigate = useNavigate();

  const handleTeacherLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      navigate('/teacher-setup');
    } catch (error) {
      console.error('Google Sign In Error', error);
      alert('로그인 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="landing">
      <button className="btn btn-secondary landing-back" onClick={() => navigate('/')}><ArrowLeft size={14} /> 처음으로</button>
      <div className="landing-hero">
        <div className="landing-logo"><BookOpen size={34} /></div>
        <h1 className="landing-title" style={{ fontSize: '1.9rem' }}>선생님 로그인</h1>
        <p className="landing-sub">학교 구글 계정으로 로그인하면 학급을 만들고 학급 코드를 받을 수 있어요.</p>
      </div>

      <div className="glass-card student-join" style={{ maxWidth: '380px' }}>
        <button onClick={handleTeacherLogin} style={{ background: 'var(--primary-color)' }}>구글 계정으로 로그인</button>
      </div>

    </div>
  );
};

export default TeacherLanding;
