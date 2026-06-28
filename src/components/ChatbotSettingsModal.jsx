import React, { useState, useEffect } from 'react';
import { Settings, X, Save } from 'lucide-react';
import { db, auth } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const ChatbotSettingsModal = ({ onClose }) => {
  const [ptiser, setPtiser] = useState({
    persona: '', task: '', information: '', style: '', restriction: ''
  });
  const [selLevel, setSelLevel] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // 파이어베이스에서 기존 프롬프트 불러오기
    const loadSettings = async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;
        const docRef = doc(db, 'teachers', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          if (docSnap.data().ptiser) {
            setPtiser(docSnap.data().ptiser);
          } else if (docSnap.data().customPrompt) {
            // 구버전 하위 호환
            setPtiser(prev => ({ ...prev, information: docSnap.data().customPrompt }));
          }
          if (docSnap.data().selLevel) setSelLevel(docSnap.data().selLevel);
        }
      } catch (error) {
        console.error("Failed to load settings:", error);
      }
    };
    loadSettings();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const user = auth.currentUser;
      if (!user) return;
      await setDoc(doc(db, 'teachers', user.uid), { ptiser, selLevel }, { merge: true });
      alert('P-TISER 프롬프트가 성공적으로 저장되었습니다!');
      onClose();
    } catch (error) {
      console.error("Failed to save settings:", error);
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 }}>
      <div style={{ background: 'white', padding: '32px', borderRadius: '24px', width: '90%', maxWidth: '600px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ margin: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Settings size={24} color="var(--primary-color)" />
            챗봇 맞춤형 프롬프트 설정
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={24} color="#a0aec0" />
          </button>
        </div>

        <p style={{ color: 'var(--text-muted)', marginBottom: '16px', lineHeight: '1.5' }}>
          학생들과 대화하는 나무 챗봇에게 <strong>P-TISER 프레임워크</strong>를 통해 완벽한 지침을 내려주세요. 각 칸을 채우기만 하면 강력한 AI 프롬프트가 완성됩니다.
        </p>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: 'var(--text-main)' }}>적용할 SEL 학교급 가이드라인</label>
          <select 
            value={selLevel} 
            onChange={(e) => setSelLevel(e.target.value)}
            style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '1rem', outline: 'none', background: 'white' }}
          >
            <option value="">선택 안 함</option>
            <option value="elementary_low">초등 저학년</option>
            <option value="elementary_high">초등 고학년</option>
            <option value="middle">중학교</option>
            <option value="high">고등학교</option>
          </select>
          <p style={{ margin: '8px 0 0 0', fontSize: '0.85rem', color: '#718096' }}>* 선택 시 해당 학교급의 공식 사회정서교육 교사용 지도서를 챗봇이 숙지하게 됩니다.</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px', maxHeight: '400px', overflowY: 'auto', paddingRight: '8px' }}>
          
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#2d3748', fontSize: '0.95rem' }}>🎯 P: 역할 (Persona)</label>
            <input 
              value={ptiser.persona} onChange={(e) => setPtiser({...ptiser, persona: e.target.value})}
              placeholder="예) 너는 우리 반의 수호천사 '빛나리'야."
              style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #cbd5e1', outline: 'none' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#2d3748', fontSize: '0.95rem' }}>✅ T: 임무 (Task)</label>
            <input 
              value={ptiser.task} onChange={(e) => setPtiser({...ptiser, task: e.target.value})}
              placeholder="예) 학생들의 진로 고민을 들어주고 격려해줘."
              style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #cbd5e1', outline: 'none' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#2d3748', fontSize: '0.95rem' }}>📚 I: 배경 지식 (Information)</label>
            <textarea 
              value={ptiser.information} onChange={(e) => setPtiser({...ptiser, information: e.target.value})}
              placeholder="예) 우리 반은 현재 중간고사를 끝내고 많이 지쳐있는 상태야. 최근에 친구 관계 문제로 다툰 아이들도 있어."
              style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #cbd5e1', outline: 'none', resize: 'vertical', minHeight: '80px' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#2d3748', fontSize: '0.95rem' }}>🎨 S: 응답 스타일 (Style)</label>
            <input 
              value={ptiser.style} onChange={(e) => setPtiser({...ptiser, style: e.target.value})}
              placeholder="예) 유머러스하고 다정하게, 반말로 대답해줘. 이모티콘을 많이 써줘."
              style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #cbd5e1', outline: 'none' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#e53e3e', fontSize: '0.95rem' }}>🚫 R: 제한 사항 (Restriction)</label>
            <input 
              value={ptiser.restriction} onChange={(e) => setPtiser({...ptiser, restriction: e.target.value})}
              placeholder="예) 절대 훈계하거나 다그치지 마. 공부하라는 말은 금지."
              style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #fc8181', outline: 'none', background: '#fff5f5' }}
            />
          </div>
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
            {isSaving ? '저장 중...' : '프롬프트 저장'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatbotSettingsModal;
