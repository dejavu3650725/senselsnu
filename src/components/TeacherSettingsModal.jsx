import React, { useState, useEffect } from 'react';
import { User, X, Save } from 'lucide-react';
import { db, auth } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const TeacherSettingsModal = ({ onClose, onSave }) => {
  const [teacherName, setTeacherName] = useState('');
  const [className, setClassName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // 파이어베이스에서 기존 설정 불러오기
    const loadSettings = async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;
        const docRef = doc(db, 'teachers', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setTeacherName(docSnap.data().teacherName || '');
          setClassName(docSnap.data().className || '');
        }
      } catch (error) {
        console.error("Failed to load teacher settings:", error);
      }
    };
    loadSettings();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const user = auth.currentUser;
      if (!user) return;
      const data = { teacherName, className };
      await setDoc(doc(db, 'teachers', user.uid), data, { merge: true });
      alert('설정이 성공적으로 저장되었습니다!');
      if (onSave) onSave(data);
      onClose();
    } catch (error) {
      console.error("Failed to save teacher settings:", error);
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 }}>
      <div style={{ background: 'white', padding: '32px', borderRadius: '24px', width: '90%', maxWidth: '400px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ margin: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <User size={24} color="var(--primary-color)" />
            기본 설정
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={24} color="#a0aec0" />
          </button>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: 'var(--text-main)' }}>선생님 이름</label>
          <input
            type="text"
            value={teacherName}
            onChange={(e) => setTeacherName(e.target.value)}
            placeholder="예: 김선생님"
            style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '1rem', outline: 'none' }}
          />
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: 'var(--text-main)' }}>학급 이름</label>
          <input
            type="text"
            value={className}
            onChange={(e) => setClassName(e.target.value)}
            placeholder="예: 3학년 A반"
            style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '1rem', outline: 'none' }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button 
            onClick={onClose}
            style={{ padding: '12px 24px', background: '#e2e8f0', color: '#4a5568', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            취소
          </button>
          <button 
            onClick={handleSave}
            disabled={isSaving}
            style={{ 
              padding: '12px 24px', background: 'var(--primary-color)', color: 'white', border: 'none', borderRadius: '12px', 
              fontWeight: 'bold', cursor: isSaving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px' 
            }}
          >
            <Save size={20} />
            {isSaving ? '저장 중...' : '저장하기'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TeacherSettingsModal;
