import React from 'react';

const DailyFlow = ({ studentsData = [] }) => {
  // 모든 학생의 메시지를 모아서 시간순 정렬
  let allMessages = [];
  studentsData.forEach(student => {
    if (student.messages && Array.isArray(student.messages)) {
      student.messages.forEach(msg => {
        if (msg.sender === 'user') { // 학생이 보낸 메시지만
          allMessages.push({
            nickname: student.nickname,
            mood: student.mood,
            text: msg.text,
            timestamp: new Date(msg.timestamp)
          });
        }
      });
    }
  });

  // 최신순으로 정렬
  allMessages.sort((a, b) => b.timestamp - a.timestamp);
  
  // 최근 5개만 표시
  const recentMessages = allMessages.slice(0, 5);

  return (
    <div className="glass-card widget daily-flow-widget" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
      <div className="widget-title" style={{ fontSize: '1.2rem', marginBottom: '16px' }}>최근 대화 기록 (실시간 연동)</div>
      
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {recentMessages.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>아직 대화 내역이 없습니다.</div>
        ) : (
          recentMessages.map((msg, index) => (
            <div key={index} style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', borderLeft: `4px solid ${msg.mood === '건강' ? '#48bb78' : msg.mood === '보통' ? '#ecc94b' : '#e53e3e'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{msg.nickname}</span>
                <span style={{ color: 'var(--text-muted)' }}>{msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div style={{ color: '#4a5568', fontSize: '1rem', wordBreak: 'break-word' }}>
                "{msg.text}"
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default DailyFlow;
