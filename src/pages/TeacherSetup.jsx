import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';

const TeacherSetup = () => {
  const [className, setClassName] = useState('');
  const [classCode, setClassCode] = useState('');
  const [teacherName, setTeacherName] = useState('');
  const navigate = useNavigate();

  const handleCreateClass = async () => {
    if (!className.trim() || !classCode.trim() || !teacherName.trim()) {
      alert("모든 필드를 입력해주세요.");
      return;
    }

    try {
      const user = auth.currentUser;
      if (!user) {
        alert("로그인이 필요합니다.");
        navigate('/');
        return;
      }

      // 선생님 프로필 저장 (teachers 컬렉션)
      const teacherData = {
        uid: user.uid,
        email: user.email,
        teacherName: teacherName,
        className: className,
        classCode: classCode,
        createdAt: new Date()
      };

      await setDoc(doc(db, 'teachers', user.uid), teacherData);
      
      // 세션에 현재 학급 코드 저장
      sessionStorage.setItem('currentClassCode', classCode);
      
      alert("학급이 성공적으로 생성되었습니다!");
      navigate('/teacher');
    } catch (error) {
      console.error("Failed to create class", error);
      alert("학급 생성 중 오류가 발생했습니다.");
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg-color)' }}>
      <div className="glass-card" style={{ width: '400px', padding: '40px', background: 'white', borderRadius: '24px' }}>
        <h2 style={{ fontSize: '1.8rem', color: 'var(--text-main)', textAlign: 'center', marginBottom: '8px' }}>나만의 학급 만들기 🏫</h2>
        <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginBottom: '32px' }}>선생님, 학급 정보와 사용할 고유 코드를 설정해주세요.</p>
        
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>선생님 이름</label>
          <input 
            type="text" 
            placeholder="예: 김선생님" 
            value={teacherName} 
            onChange={e => setTeacherName(e.target.value)}
            style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #cbd5e1', outline: 'none' }}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>학급 이름</label>
          <input 
            type="text" 
            placeholder="예: 3학년 A반" 
            value={className} 
            onChange={e => setClassName(e.target.value)}
            style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #cbd5e1', outline: 'none' }}
          />
        </div>

        <div style={{ marginBottom: '32px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>학급 입장 코드 (학생용)</label>
          <input 
            type="text" 
            placeholder="학생들에게 알려줄 접속 코드 (예: SNU3A)" 
            value={classCode} 
            onChange={e => setClassCode(e.target.value)}
            style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #cbd5e1', outline: 'none' }}
          />
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '8px', display: 'block' }}>학생들은 이 코드를 입력해야만 학급에 들어올 수 있습니다.</span>
        </div>

        <button 
          onClick={handleCreateClass}
          style={{ width: '100%', padding: '16px', background: 'var(--primary-color)', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold', fontSize: '1.1rem', cursor: 'pointer' }}
        >
          학급 개설 완료!
        </button>
      </div>
    </div>
  );
};

export default TeacherSetup;
