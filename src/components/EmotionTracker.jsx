import React, { useState } from 'react';
import { Activity, Smile, Meh, Frown, TrendingUp } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const EmotionTracker = ({ studentsData }) => {
  const [selectedMood, setSelectedMood] = useState(null);
  const moodCounts = { '건강': 0, '보통': 0, '힘듦': 0 };
  
  studentsData.forEach(s => {
    if (s.mood) {
      moodCounts[s.mood] = (moodCounts[s.mood] || 0) + 1;
    }
  });

  const data = [
    { name: '건강 (좋음)', value: moodCounts['건강'], color: '#48bb78' },
    { name: '보통', value: moodCounts['보통'], color: '#ecc94b' },
    { name: '힘듦', value: moodCounts['힘듦'], color: '#e53e3e' }
  ];

  return (
    <div className="glass-card" style={{ padding: '32px', display: 'flex', flexDirection: 'column', flex: 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
        <div style={{ background: 'var(--primary-light)', padding: '12px', borderRadius: '16px' }}>
          <TrendingUp size={28} color="var(--primary-color)" />
        </div>
        <h2 style={{ color: '#2d3748', margin: 0, fontSize: '1.8rem' }}>학급 감정 트래커</h2>
      </div>
      <p style={{ color: '#718096', marginBottom: '32px', fontSize: '1.05rem', paddingLeft: '52px' }}>
        현재 학급 아이들의 전반적인 정서 상태 비율을 보여줍니다. 감정 카드를 클릭하면 해당 학생들을 볼 수 있습니다.
      </p>

      <div style={{ display: 'flex', flex: 1, gap: '24px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 300px', height: '100%', minHeight: '350px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={80}
                outerRadius={130}
                paddingAngle={5}
                dataKey="value"
                stroke="none"
                label={({ name, percent }) => percent > 0 ? `${name} ${(percent * 100).toFixed(0)}%` : ''}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div 
            onClick={() => setSelectedMood(selectedMood === '건강' ? null : '건강')}
            style={{ cursor: 'pointer', border: selectedMood === '건강' ? '2px solid #38a169' : '2px solid transparent', background: 'linear-gradient(135deg, #f0fff4 0%, #c6f6d5 100%)', padding: '20px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '16px', transition: 'all 0.2s', boxShadow: selectedMood === '건강' ? '0 4px 12px rgba(56, 161, 105, 0.2)' : 'none' }}
          >
            <Smile size={32} color="#38a169" />
            <div>
              <div style={{ fontSize: '0.9rem', color: '#276749', fontWeight: 'bold' }}>건강 (좋음)</div>
              <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#22543d' }}>{moodCounts['건강']}명</div>
            </div>
          </div>
          <div 
            onClick={() => setSelectedMood(selectedMood === '보통' ? null : '보통')}
            style={{ cursor: 'pointer', border: selectedMood === '보통' ? '2px solid #d69e2e' : '2px solid transparent', background: 'linear-gradient(135deg, #fffff0 0%, #fefcbf 100%)', padding: '20px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '16px', transition: 'all 0.2s', boxShadow: selectedMood === '보통' ? '0 4px 12px rgba(214, 158, 46, 0.2)' : 'none' }}
          >
            <Meh size={32} color="#d69e2e" />
            <div>
              <div style={{ fontSize: '0.9rem', color: '#b7791f', fontWeight: 'bold' }}>보통</div>
              <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#975a16' }}>{moodCounts['보통']}명</div>
            </div>
          </div>
          <div 
            onClick={() => setSelectedMood(selectedMood === '힘듦' ? null : '힘듦')}
            style={{ cursor: 'pointer', border: selectedMood === '힘듦' ? '2px solid #e53e3e' : '2px solid transparent', background: 'linear-gradient(135deg, #fff5f5 0%, #fed7d7 100%)', padding: '20px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '16px', transition: 'all 0.2s', boxShadow: selectedMood === '힘듦' ? '0 4px 12px rgba(229, 62, 62, 0.2)' : 'none' }}
          >
            <Frown size={32} color="#e53e3e" />
            <div>
              <div style={{ fontSize: '0.9rem', color: '#c53030', fontWeight: 'bold' }}>힘듦</div>
              <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#9b2c2c' }}>{moodCounts['힘듦']}명</div>
            </div>
          </div>
        </div>
      </div>

      {selectedMood && (
        <div style={{ marginTop: '24px', padding: '20px', background: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: '0 0 12px 0', color: '#2d3748', fontSize: '1.1rem' }}>
            <span style={{ color: selectedMood === '건강' ? '#38a169' : selectedMood === '보통' ? '#d69e2e' : '#e53e3e' }}>'{selectedMood}'</span> 상태인 학생 명단
          </h3>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {studentsData.filter(s => s.mood === selectedMood).length > 0 ? 
              studentsData.filter(s => s.mood === selectedMood).map((s, i) => (
                <div key={i} style={{ background: 'white', padding: '10px 16px', borderRadius: '24px', border: '1px solid #cbd5e1', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                  <span style={{ fontSize: '1.4rem' }}>{s.avatar}</span>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.85rem', color: '#a0aec0', fontWeight: 'bold' }}>{s.realName}</span>
                    <span style={{ fontSize: '1rem', color: '#4a5568', fontWeight: 'bold' }}>{s.nickname}</span>
                  </div>
                </div>
              )) : 
              <div style={{ color: '#a0aec0', padding: '8px 0' }}>해당 상태의 학생이 없습니다.</div>
            }
          </div>
        </div>
      )}
    </div>
  );
};

export default EmotionTracker;
