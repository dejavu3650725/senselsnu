import React from 'react';

const InterventionTable = ({ studentsData = [] }) => {
  // 기분이 '힘듦'인 학생들 필터링
  const badStudents = studentsData.filter(s => s.mood === '힘듦');

  return (
    <div className="glass-card widget intervention-widget" style={{ display: 'flex', flexDirection: 'column', padding: '24px' }}>
      <div className="widget-title" style={{ fontSize: '1.2rem' }}>개입 및 처방 (실시간)</div>
      
      <div style={{ fontSize: '1rem', fontWeight: 600, color: '#e53e3e', marginTop: '16px' }}>
        관심 필요 학생 (기분: 힘듦)
      </div>
      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
        현재 실시간으로 도움이 필요한 학생 목록입니다.
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
              <th style={{ padding: '12px 8px', color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>학생 닉네임</th>
              <th style={{ padding: '12px 8px', color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>최근 알림</th>
              <th style={{ padding: '12px 8px', color: 'var(--text-muted)', fontWeight: 600 }}>AI 추천 개입</th>
            </tr>
          </thead>
          <tbody>
            {badStudents.length === 0 ? (
              <tr>
                <td colSpan="3" style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>현재 관심이 필요한 학생이 없습니다. 🟢</td>
              </tr>
            ) : (
              badStudents.map((node, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #edf2f7' }}>
                  <td style={{ padding: '16px 8px', fontWeight: 600, color: 'var(--text-main)' }}>{node.nickname}</td>
                  <td style={{ padding: '16px 8px', color: '#e53e3e', whiteSpace: 'nowrap', fontWeight: 'bold' }}>긴급 신호 (🔴)</td>
                  <td style={{ padding: '16px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
                    <span style={{ color: '#2d3748', fontWeight: 500 }}>심층 상담 및 위로 필요</span>
                    <span style={{ fontSize: '1.5rem', background: '#fff5f5', padding: '8px', borderRadius: '50%', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', display: 'inline-flex' }}>📞</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default InterventionTable;
