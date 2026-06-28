import React from 'react';
import { Users, UserPlus, AlertCircle, Trophy, Target, ShieldAlert } from 'lucide-react';

const ClassAnalysis = ({ studentsData }) => {
  // 간단한 통계 분석
  const totalStudents = studentsData.length;
  
  // 지목을 많이 받은 학생 계산
  const nominationCounts = {};
  studentsData.forEach(s => {
    (s.nominations || []).forEach(nom => {
      let matched = studentsData.find(st => st.nickname === nom || st.realName === nom);
      if (!matched) {
        const searchName = nom.replace(/[은는이가랑하고의]$/g, '').trim();
        matched = studentsData.find(st => 
          (st.nickname && st.nickname.includes(searchName)) || 
          (st.realName && st.realName.includes(searchName)) ||
          (searchName.includes(st.nickname)) ||
          (searchName.includes(st.realName))
        );
      }
      const officialName = matched ? matched.nickname : nom;
      nominationCounts[officialName] = (nominationCounts[officialName] || 0) + 1;
    });
  });

  const sortedNominations = Object.entries(nominationCounts).sort((a, b) => b[1] - a[1]);
  const popularStudents = sortedNominations.slice(0, 3);
  
  // 관심 필요 그룹 (기분이 '힘듦'인 빨간불 학생만)
  const isolatedStudents = studentsData.filter(s => s.mood === '힘듦');

  return (
    <div className="glass-card" style={{ padding: '32px', display: 'flex', flexDirection: 'column', flex: 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
        <div style={{ background: 'var(--primary-light)', padding: '12px', borderRadius: '16px' }}>
          <Target size={28} color="var(--primary-color)" />
        </div>
        <h2 style={{ color: '#2d3748', margin: 0, fontSize: '1.8rem' }}>학급 관계 분석 요약</h2>
      </div>
      <p style={{ color: '#718096', marginBottom: '32px', fontSize: '1.05rem', paddingLeft: '52px' }}>
        소시오그램(교우 관계망) 데이터를 수치화하여 직관적으로 보여줍니다.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', flex: 1 }}>
        {/* 전체 학생 수 */}
        <div style={{ padding: '24px', background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)', borderRadius: '20px', border: '1px solid #cbd5e1', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
          <Users size={32} color="#4a5568" style={{ marginBottom: '12px' }} />
          <h3 style={{ margin: '0 0 8px 0', fontSize: '1.2rem', color: '#4a5568' }}>총 참여 학생</h3>
          <div style={{ fontSize: '3rem', fontWeight: '800', color: 'var(--primary-color)' }}>{totalStudents}명</div>
        </div>

        {/* 긍정적 지목 리더 */}
        <div style={{ padding: '24px', background: 'linear-gradient(135deg, #f0fff4 0%, #c6f6d5 100%)', borderRadius: '20px', border: '1px solid #9ae6b4', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '1.3rem', color: '#276749', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700' }}>
            <Trophy size={24} color="#38a169" /> 긍정적 지목 리더
          </h3>
          {popularStudents.length > 0 ? (
            <ul style={{ margin: 0, paddingLeft: '24px', color: '#22543d', fontWeight: '600', fontSize: '1.1rem', lineHeight: '2' }}>
              {popularStudents.map(([name, count]) => (
                <li key={name} style={{ marginBottom: '8px' }}>
                  <span style={{ background: 'rgba(255,255,255,0.6)', padding: '2px 8px', borderRadius: '8px' }}>{name} ({count}회)</span>
                </li>
              ))}
            </ul>
          ) : (
            <div style={{ color: '#4a5568', background: 'rgba(255,255,255,0.6)', padding: '16px', borderRadius: '12px' }}>아직 데이터가 부족합니다.</div>
          )}
        </div>

        {/* 고립 위험군 */}
        <div style={{ padding: '24px', background: 'linear-gradient(135deg, #fff5f5 0%, #fed7d7 100%)', borderRadius: '20px', border: '1px solid #feb2b2', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '1.3rem', color: '#9b2c2c', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700' }}>
            <ShieldAlert size={24} color="#e53e3e" /> 관심 필요 그룹
          </h3>
          {isolatedStudents.length > 0 ? (
            <ul style={{ margin: 0, paddingLeft: '24px', color: '#742a2a', fontWeight: '600', fontSize: '1.1rem', lineHeight: '2' }}>
              {isolatedStudents.map(s => (
                <li key={s.id} style={{ marginBottom: '8px' }}>
                  <span style={{ background: 'rgba(255,255,255,0.6)', padding: '2px 8px', borderRadius: '8px' }}>{s.nickname} ({s.realName})</span>
                </li>
              ))}
            </ul>
          ) : (
            <div style={{ color: '#4a5568', background: 'rgba(255,255,255,0.6)', padding: '16px', borderRadius: '12px', fontWeight: '600' }}>모두가 긍정적 지목을 받았습니다! 🎉</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClassAnalysis;
