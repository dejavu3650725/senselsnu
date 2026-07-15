import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, BookOpen, Users, X, Key } from 'lucide-react';
import { auth, googleProvider, db } from '../firebase';
import { signInWithPopup } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

const RoleSelection = () => {
  const navigate = useNavigate();
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [classCodeInput, setClassCodeInput] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  // 선생님 구글 로그인 핸들러
  const handleTeacherLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      // 다중 학급 지원: 로그인 후 항상 학급 관리 화면에서 학급을 선택/생성
      navigate('/teacher-setup');
    } catch (error) {
      console.error("Google Sign In Error", error);
      alert("로그인 중 오류가 발생했습니다.");
    }
  };

  // 학생 학급 코드 검증 핸들러
  const handleStudentJoin = async () => {
    if (!classCodeInput.trim()) {
      alert("학급 코드를 입력해주세요.");
      return;
    }

    setIsVerifying(true);
    try {
      // 1) 새 구조: classes/{학급코드} 문서 확인
      const code = classCodeInput.trim();
      const classSnap = await getDoc(doc(db, 'classes', code));
      let isValid = classSnap.exists();

      // 2) 하위 호환: 기존 teachers 컬렉션의 classCode 확인
      if (!isValid) {
        const q = query(collection(db, 'teachers'), where('classCode', '==', code));
        const querySnapshot = await getDocs(q);
        isValid = !querySnapshot.empty;
      }

      if (isValid) {
        // 유효한 학급 코드
        sessionStorage.setItem('studentClassCode', classCodeInput.trim());
        navigate('/student');
      } else {
        alert("존재하지 않는 학급 코드입니다. 선생님께 다시 확인해주세요.");
      }
    } catch (error) {
      console.error("Class code verification error", error);
      alert("확인 중 오류가 발생했습니다.");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: '40px' }}>
      <div style={{ textAlign: 'center' }}>
        <Shield size={64} color="var(--primary-color)" style={{ marginBottom: '16px' }} />
        <h1 style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '8px' }}>
          <span translate="no" className="notranslate">SEN-SEL-SNU</span>
        </h1>
        <p style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>환영합니다! 어떤 역할로 접속하시겠어요?</p>
      </div>

      <div style={{ display: 'flex', gap: '32px' }}>
        <div 
          className="glass-card" 
          style={{ width: 280, padding: '40px 20px', textAlign: 'center', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}
          onClick={handleTeacherLogin}
        >
          <div style={{ width: 100, height: 100, borderRadius: '50%', background: 'var(--primary-light)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <BookOpen size={48} color="var(--primary-color)" />
          </div>
          <h2 style={{ fontSize: '1.5rem', color: 'var(--text-main)' }}>선생님</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>구글 로그인 및 학급 관리</p>
        </div>

        <div 
          className="glass-card" 
          style={{ width: 280, padding: '40px 20px', textAlign: 'center', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}
          onClick={() => setShowStudentModal(true)}
        >
          <div style={{ width: 100, height: 100, borderRadius: '50%', background: 'rgba(72, 187, 120, 0.1)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <Users size={48} color="var(--success)" />
          </div>
          <h2 style={{ fontSize: '1.5rem', color: 'var(--text-main)' }}>학생</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>학급 코드 입력 후 입장</p>
        </div>
      </div>

      {/* 학생 학급 코드 입력 모달 */}
      {showStudentModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="glass-card" style={{ width: '400px', padding: '32px', background: 'white', borderRadius: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ margin: 0, fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Key size={24} color="var(--success)" />
                학급 입장하기
              </h2>
              <button onClick={() => setShowStudentModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={24} color="#a0aec0" />
              </button>
            </div>
            
            <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>선생님께서 알려주신 <strong>학급 코드</strong>를 입력해주세요.</p>
            
            <input 
              type="text"
              value={classCodeInput}
              onChange={e => setClassCodeInput(e.target.value)}
              placeholder="예: SNU3A"
              style={{ width: '100%', padding: '16px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '1.1rem', outline: 'none', marginBottom: '24px', textAlign: 'center', letterSpacing: '2px' }}
              onKeyDown={e => e.key === 'Enter' && handleStudentJoin()}
            />

            <button 
              onClick={handleStudentJoin}
              disabled={isVerifying}
              style={{ width: '100%', padding: '16px', background: 'var(--success)', color: 'white', border: 'none', borderRadius: '12px', fontSize: '1.1rem', fontWeight: 600, cursor: isVerifying ? 'not-allowed' : 'pointer' }}
            >
              {isVerifying ? '확인 중...' : '입장하기'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoleSelection;
