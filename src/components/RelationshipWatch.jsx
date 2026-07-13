import React from 'react';
import { AlertTriangle, UserX, CloudRain, HeartHandshake } from 'lucide-react';

/**
 * 관계 신호: 챗봇 대화에서 수집된 갈등·고립·외로움 신호를 교사가 확인하는 화면
 * - 갈등 신호(conflicts): 학생이 챗봇에게 '자발적으로' 언급한 특정 친구와의 갈등
 * - 고립 위험(연결 끊김): 긍정 지목을 주지도 받지도 못한 학생
 * - 외로움 신호(lonelySignals): 외로움/혼자라는 표현을 한 학생
 * 이 신호들은 [자리 배치]의 AI 배치 제안에도 자동으로 반영됩니다.
 */
const RelationshipWatch = ({ studentsData }) => {
  const byNickname = new Map(
    studentsData.filter(s => s.nickname).map(s => [s.nickname, s])
  );

  // 받은 긍정 지목 수 집계
  const receivedCount = {};
  studentsData.forEach(s => {
    (s.nominations || []).forEach(nick => {
      const target = byNickname.get(nick);
      if (target && target.id !== s.id) {
        receivedCount[target.id] = (receivedCount[target.id] || 0) + 1;
      }
    });
  });

  // 갈등 신호 목록: { from(학생), to(상대 학생 또는 null), toName }
  const conflictEdges = [];
  studentsData.forEach(s => {
    (s.conflicts || []).forEach(nick => {
      const target = byNickname.get(nick);
      if (target && target.id === s.id) return;
      conflictEdges.push({ from: s, to: target || null, toName: target ? target.realName : nick });
    });
  });
  const isMutualConflict = (edge) =>
    edge.to && conflictEdges.some(o => o.from.id === edge.to.id && o.to && o.to.id === edge.from.id);

  // 고립 위험(연결 고리 끊김): 유효한 긍정 지목을 보낸 적도, 받은 적도 없는 학생
  const isolatedStudents = studentsData.filter(s => {
    const sentValid = (s.nominations || []).filter(nick => {
      const t = byNickname.get(nick);
      return t && t.id !== s.id;
    }).length;
    return sentValid === 0 && !(receivedCount[s.id] > 0);
  });

  // 외로움 신호 학생
  const lonelyStudents = studentsData
    .filter(s => (s.lonelySignals || []).length > 0)
    .map(s => {
      const signals = [...s.lonelySignals].sort();
      return { ...s, lonelyCount: signals.length, lastSignal: signals[signals.length - 1] };
    })
    .sort((a, b) => b.lonelyCount - a.lonelyCount);

  const formatDate = (iso) => {
    try {
      return new Date(iso).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
    } catch {
      return '';
    }
  };

  const sectionCard = { background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px', marginBottom: '20px' };
  const sectionTitle = { display: 'flex', alignItems: 'center', gap: '10px', margin: '0 0 4px 0', fontSize: '1.2rem', color: '#2d3748' };
  const emptyText = { color: '#a0aec0', fontSize: '0.95rem', padding: '12px 0', margin: 0 };
  const studentChip = { display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 'bold', color: '#2d3748' };

  return (
    <div className="glass-card" style={{ padding: '32px', display: 'flex', flexDirection: 'column', flex: 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
        <div style={{ background: 'rgba(229, 62, 62, 0.1)', padding: '12px', borderRadius: '16px' }}>
          <HeartHandshake size={28} color="#e53e3e" />
        </div>
        <h2 style={{ color: '#2d3748', margin: 0, fontSize: '1.8rem' }}>관계 신호</h2>
      </div>
      <p style={{ color: '#718096', marginBottom: '24px', fontSize: '1.05rem', paddingLeft: '52px', lineHeight: 1.6 }}>
        챗봇 대화에서 수집된 갈등·고립·외로움 신호입니다. 갈등 신호는 학생이 <b>스스로 이야기한 경우에만</b> 기록되며,
        이 신호들은 [자리 배치]의 AI 배치 제안에 자동으로 반영됩니다.
      </p>

      {/* 1. 갈등 신호 */}
      <div style={sectionCard}>
        <h3 style={sectionTitle}>
          <AlertTriangle size={22} color="#dd6b20" /> 갈등 신호 <span style={{ fontSize: '0.9rem', color: '#a0aec0', fontWeight: 'normal' }}>({conflictEdges.length}건)</span>
        </h3>
        <p style={{ color: '#a0aec0', fontSize: '0.85rem', margin: '0 0 16px 0' }}>
          학생이 챗봇에게 자발적으로 언급한 친구와의 다툼·서운함·따돌림 신호입니다. 낙인 효과가 없도록 신중하게 활용해주세요.
        </p>
        {conflictEdges.length === 0 ? (
          <p style={emptyText}>감지된 갈등 신호가 없습니다 🎉</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {conflictEdges.map((edge, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: isMutualConflict(edge) ? '#fff5f5' : '#fffaf0', border: `1px solid ${isMutualConflict(edge) ? '#feb2b2' : '#fbd38d'}`, borderRadius: '12px', flexWrap: 'wrap' }}>
                <span style={studentChip}>
                  <span style={{ fontSize: '1.3rem' }}>{edge.from.avatar || '👤'}</span> {edge.from.realName}
                </span>
                <span style={{ color: '#dd6b20', fontWeight: 'bold' }}>
                  {isMutualConflict(edge) ? '⚡ 상호 갈등' : '→ 갈등 언급'}
                </span>
                <span style={studentChip}>
                  {edge.to && <span style={{ fontSize: '1.3rem' }}>{edge.to.avatar || '👤'}</span>} {edge.toName}
                  {!edge.to && <span style={{ fontSize: '0.8rem', color: '#a0aec0', fontWeight: 'normal' }}>(명단 미매칭)</span>}
                </span>
                {isMutualConflict(edge) && (
                  <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: '#c53030', fontWeight: 'bold' }}>우선 개입 권장</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. 고립 위험 (연결 고리 끊김) */}
      <div style={sectionCard}>
        <h3 style={sectionTitle}>
          <UserX size={22} color="#805ad5" /> 고립 위험 (연결 고리 없음) <span style={{ fontSize: '0.9rem', color: '#a0aec0', fontWeight: 'normal' }}>({isolatedStudents.length}명)</span>
        </h3>
        <p style={{ color: '#a0aec0', fontSize: '0.85rem', margin: '0 0 16px 0' }}>
          친구를 긍정적으로 지목한 적도, 다른 친구에게 지목받은 적도 없는 학생입니다. 관계망에서 연결 고리가 끊겨 있을 수 있어요.
        </p>
        {isolatedStudents.length === 0 ? (
          <p style={emptyText}>모든 학생이 관계망에 연결되어 있습니다 🎉</p>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {isolatedStudents.map(s => (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: '#faf5ff', border: '1px solid #e9d8fd', borderRadius: '12px' }}>
                <span style={{ fontSize: '1.4rem' }}>{s.avatar || '👤'}</span>
                <div>
                  <div style={{ fontWeight: 'bold', color: '#2d3748', fontSize: '0.95rem' }}>{s.realName}</div>
                  <div style={{ fontSize: '0.78rem', color: '#a0aec0' }}>기분: {s.mood || '알 수 없음'}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. 외로움 신호 */}
      <div style={sectionCard}>
        <h3 style={sectionTitle}>
          <CloudRain size={22} color="#3182ce" /> 외로움 신호 <span style={{ fontSize: '0.9rem', color: '#a0aec0', fontWeight: 'normal' }}>({lonelyStudents.length}명)</span>
        </h3>
        <p style={{ color: '#a0aec0', fontSize: '0.85rem', margin: '0 0 16px 0' }}>
          챗봇과의 대화에서 외로움, 혼자라는 느낌을 표현한 학생입니다.
        </p>
        {lonelyStudents.length === 0 ? (
          <p style={emptyText}>감지된 외로움 신호가 없습니다 🎉</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {lonelyStudents.map(s => (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: '#ebf8ff', border: '1px solid #bee3f8', borderRadius: '12px' }}>
                <span style={{ fontSize: '1.4rem' }}>{s.avatar || '👤'}</span>
                <span style={{ fontWeight: 'bold', color: '#2d3748' }}>{s.realName}</span>
                <span style={{ fontSize: '0.85rem', color: '#3182ce', fontWeight: 'bold' }}>신호 {s.lonelyCount}회</span>
                {s.lastSignal && (
                  <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: '#a0aec0' }}>최근: {formatDate(s.lastSignal)}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <p style={{ color: '#a0aec0', fontSize: '0.85rem', margin: 0, lineHeight: 1.6 }}>
        💡 활용 팁: 갈등 신호가 있는 두 학생은 [자리 배치]에서 AI가 자동으로 떨어뜨려 배치하며, 인접해 있으면 배치도 화면에 경고가 표시됩니다.
        고립·외로움 신호 학생은 [맞춤 처방] 메뉴에서 AI 지도 조언을 받아보실 수 있습니다.
      </p>
    </div>
  );
};

export default RelationshipWatch;
