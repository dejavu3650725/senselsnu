import React, { useState } from 'react';
import { HeartPulse, Sparkles, Loader, AlertTriangle } from 'lucide-react';

const CustomPrescription = ({ studentsData, teacherProfile }) => {
  const [prescriptions, setPrescriptions] = useState({});
  const [loadingIds, setLoadingIds] = useState({});

  const atRiskStudents = studentsData.filter(s => s.mood === '힘듦');

  const handleGeneratePrescription = async (student) => {
    setLoadingIds(prev => ({ ...prev, [student.id]: true }));
    try {
      // 간단하게 기존 gemini API를 활용하여 교사용 조언을 구합니다.
      const prompt = `우리 반 학생 '${student.realName}'(닉네임: ${student.nickname})가 최근 기분이 '${student.mood}' 상태이고, 교우 관계에서도 어려움을 겪고 있는 것 같아. 이 학생을 지도하기 위한 구체적이고 따뜻한 교사용 맞춤 처방(지도 팁)을 3가지만 요약해줘.`;
      
      const response = await fetch('/api/gemini-prescription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          selLevel: teacherProfile?.selLevel || ''
        })
      });

      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '처방을 불러오지 못했습니다.';
      
      setPrescriptions(prev => ({ ...prev, [student.id]: text.replace(/\[NOMINATION:.*?\]/g, '') }));
    } catch (error) {
      console.error(error);
      setPrescriptions(prev => ({ ...prev, [student.id]: '에러가 발생했습니다.' }));
    } finally {
      setLoadingIds(prev => ({ ...prev, [student.id]: false }));
    }
  };

  return (
    <div className="glass-card" style={{ padding: '32px', display: 'flex', flexDirection: 'column', flex: 1, height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
        <div style={{ background: 'var(--primary-light)', padding: '12px', borderRadius: '16px' }}>
          <HeartPulse size={28} color="var(--primary-color)" />
        </div>
        <h2 style={{ color: '#2d3748', margin: 0, fontSize: '1.8rem' }}>AI 맞춤 처방 (관심 필요 학생)</h2>
      </div>
      <p style={{ color: '#718096', marginBottom: '32px', fontSize: '1.05rem', paddingLeft: '52px' }}>
        기분이 '힘듦'인(빨간불) 학생 목록입니다. SEL 가이드라인을 기반으로 AI 맞춤 지도 팁을 받아보세요.
      </p>

      {atRiskStudents.length === 0 ? (
        <div style={{ padding: '40px', background: 'linear-gradient(135deg, #f8fafc 0%, #edf2f7 100%)', borderRadius: '20px', color: '#4a5568', textAlign: 'center', fontSize: '1.2rem', fontWeight: 'bold' }}>
          현재 특별히 관심이 필요한 학생이 없습니다. 🌟
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '20px', flex: 1, alignContent: 'start' }}>
          {atRiskStudents.map(student => (
            <div key={student.id} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#2d3748', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '1.8rem' }}>{student.avatar}</span> 
                  <div>
                    {student.realName} ({student.nickname})
                    <div style={{ fontSize: '0.85rem', color: student.mood === '힘듦' ? '#e53e3e' : '#718096', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {student.mood === '힘듦' && <AlertTriangle size={14} />} 
                      최근 상태: {student.mood || '알 수 없음'}
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => handleGeneratePrescription(student)}
                  disabled={loadingIds[student.id]}
                  style={{ 
                    display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', 
                    background: 'linear-gradient(135deg, var(--primary-color) 0%, var(--primary-hover) 100%)', color: 'white', border: 'none', borderRadius: '12px', 
                    fontWeight: 'bold', cursor: loadingIds[student.id] ? 'wait' : 'pointer', transition: 'transform 0.1s', boxShadow: '0 4px 12px rgba(74, 144, 226, 0.3)'
                  }}
                  onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
                  onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                  {loadingIds[student.id] ? <Loader size={18} className="spin" /> : <Sparkles size={18} />}
                  AI 처방
                </button>
              </div>

              {prescriptions[student.id] && (
                <div style={{ flex: 1, marginTop: '16px', padding: '20px', background: '#f8fafc', borderLeft: '4px solid var(--primary-color)', borderRadius: '0 12px 12px 0', color: '#4a5568', lineHeight: '1.7', whiteSpace: 'pre-wrap', fontSize: '0.95rem' }}>
                  {prescriptions[student.id]}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomPrescription;
