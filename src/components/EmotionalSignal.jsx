import React from 'react';

const EmotionalSignal = ({ studentsData = [] }) => {
  // 닉네임 또는 실명을 기준으로 중복 제거 (최신 데이터 우선)
  const uniqueMap = new Map();
  studentsData.forEach(s => {
    const key = s.realName || s.nickname || s.id;
    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, s);
    } else {
      const existing = uniqueMap.get(key);
      const existingTime = existing.lastActive?.toMillis ? existing.lastActive.toMillis() : 0;
      const newTime = s.lastActive?.toMillis ? s.lastActive.toMillis() : 0;
      if (newTime > existingTime) {
        uniqueMap.set(key, s);
      }
    }
  });

  const uniqueStudents = Array.from(uniqueMap.values());

  // 전체 학생 데이터에서 기분 통계 계산
  const total = uniqueStudents.length;
  const goodCount = uniqueStudents.filter(s => s.mood === '건강').length;
  const normalCount = uniqueStudents.filter(s => s.mood === '보통').length;
  const badCount = uniqueStudents.filter(s => s.mood === '힘듦').length;

  const goodPercent = total === 0 ? 0 : Math.round((goodCount / total) * 100);
  const normalPercent = total === 0 ? 0 : Math.round((normalCount / total) * 100);
  const badPercent = total === 0 ? 0 : Math.round((badCount / total) * 100);

  // 현재 학급 상태 결정
  let currentStatus = '알 수 없음';
  let statusColor = '#a0aec0';
  
  if (total > 0) {
    if (badPercent >= 30) {
      currentStatus = '빨강 (개입 필요)';
      statusColor = '#e53e3e';
    } else if (normalPercent >= 50 || badPercent > 0) {
      currentStatus = '노랑 (주의 요망)';
      statusColor = '#ecc94b';
    } else {
      currentStatus = '초록 (안정적)';
      statusColor = '#48bb78';
    }
  }

  return (
    <div className="glass-card widget signal-widget">
      <div className="widget-title">학급 감정 신호등</div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginTop: '10px' }}>
        {/* Traffic Light */}
        <div style={{ background: '#2d3748', padding: '12px', borderRadius: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#48bb78', opacity: currentStatus.includes('초록') ? 1 : 0.3, boxShadow: currentStatus.includes('초록') ? '0 0 15px #48bb78' : 'none' }}></div>
          <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#ecc94b', opacity: currentStatus.includes('노랑') ? 1 : 0.3, boxShadow: currentStatus.includes('노랑') ? '0 0 15px #ecc94b' : 'none' }}></div>
          <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#e53e3e', opacity: currentStatus.includes('빨강') ? 1 : 0.3, boxShadow: currentStatus.includes('빨강') ? '0 0 15px #e53e3e' : 'none' }}></div>
        </div>

        {/* Legend */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
            현재 상태: <strong style={{ color: statusColor }}>{currentStatus}</strong> ({total}명 참여)
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
            <span>건강 ({goodCount}명)</span>
            <div style={{ width: '60%', height: 8, background: '#e2e8f0', borderRadius: 4 }}>
              <div style={{ width: `${goodPercent}%`, height: '100%', background: '#48bb78', borderRadius: 4, transition: 'width 0.5s' }}></div>
            </div>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
            <span>보통 ({normalCount}명)</span>
            <div style={{ width: '60%', height: 8, background: '#e2e8f0', borderRadius: 4 }}>
              <div style={{ width: `${normalPercent}%`, height: '100%', background: '#ecc94b', borderRadius: 4, transition: 'width 0.5s' }}></div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
            <span>지원 필요 ({badCount}명)</span>
            <div style={{ width: '60%', height: 8, background: '#e2e8f0', borderRadius: 4 }}>
              <div style={{ width: `${badPercent}%`, height: '100%', background: '#e53e3e', borderRadius: 4, transition: 'width 0.5s' }}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmotionalSignal;
