import React, { useMemo, useState } from 'react';
import { Users, Trophy, Target, ShieldAlert, Heart, Zap, CircleDashed, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { assessClass } from '../utils/studentSignals';

const TIER = {
  urgent: { label: '긴급', color: '#c53030', bg: '#fff5f5', border: '#feb2b2' },
  high: { label: '높음', color: '#c05621', bg: '#fffaf0', border: '#fbd38d' },
  watch: { label: '관심', color: '#b7791f', bg: '#fffff0', border: '#f6e05e' },
};

const genderColor = (g) => (g === '남' ? '#2b6cb0' : g === '여' ? '#b83280' : '#2d3748');

const Name = ({ s, size = '0.95rem' }) => (
  <span title={s.nickname && s.nickname !== s.realName ? `닉네임: ${s.nickname}` : undefined} style={{ fontWeight: 700, color: genderColor(s.gender), fontSize: size, whiteSpace: 'nowrap' }}>
    {s.avatar ? `${s.avatar} ` : ''}{s.realName || s.nickname}
  </span>
);

const Card = ({ title, icon, color, border, bg, children, right }) => (
  <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: '18px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', minWidth: 0 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <span style={{ color }}>{icon}</span>
      <h3 style={{ margin: 0, fontSize: '1.05rem', color, fontWeight: 700 }}>{title}</h3>
      {right && <span style={{ marginLeft: 'auto' }}>{right}</span>}
    </div>
    {children}
  </div>
);

const Stat = ({ label, value, sub, color = 'var(--primary-color)' }) => (
  <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '14px 16px', minWidth: 0 }}>
    <div style={{ fontSize: '0.78rem', color: '#718096' }}>{label}</div>
    <div style={{ fontSize: '1.7rem', fontWeight: 800, color, lineHeight: 1.2, marginTop: '2px' }}>{value}</div>
    {sub && <div style={{ fontSize: '0.75rem', color: '#a0aec0', marginTop: '2px', wordBreak: 'keep-all' }}>{sub}</div>}
  </div>
);

/**
 * 학급 관계 분석 (교사용)
 * - 실명 기준 표시(닉네임은 툴팁), 모든 항목에 '왜 그런지' 근거를 함께 표시
 * - 데이터 원천: 챗봇 대화에서 추출된 긍정 지목·갈등·외로움 신호, 학생이 고른 기분, 위기 알림
 */
const ClassAnalysis = ({ studentsData = [] }) => {
  const [showAllRisk, setShowAllRisk] = useState(false);
  const [showPairs, setShowPairs] = useState(true);

  const a = useMemo(() => {
    const { graph, results, atRisk } = assessClass(studentsData);
    const nodes = [...graph.values()];
    const n = nodes.length;

    // 지목 링크·상호 쌍·갈등 쌍
    let links = 0;
    const mutualPairs = [];
    const conflictPairs = [];
    const seen = new Set();
    nodes.forEach(node => {
      links += node.given.size;
      node.mutual.forEach(o => { const k = [node.student.id, o].sort().join('|'); if (!seen.has(k)) { seen.add(k); mutualPairs.push([node.student, graph.get(o).student]); } });
    });
    const seenC = new Set();
    nodes.forEach(node => {
      node.conflicts.forEach(o => {
        const k = [node.student.id, o].sort().join('|');
        if (seenC.has(k)) return; seenC.add(k);
        conflictPairs.push({ a: node.student, b: graph.get(o).student, mutual: node.mutualConflicts.has(o) });
      });
    });

    // 리더: 받은 지목 순
    const leaders = nodes
      .filter(x => x.received > 0)
      .sort((x, y) => y.received - x.received || y.mutual.size - x.mutual.size)
      .slice(0, 5)
      .map(x => ({
        student: x.student,
        received: x.received,
        mutual: x.mutual.size,
        from: [...x.incoming].map(id => graph.get(id).student),
      }));

    const isolated = nodes.filter(x => x.received === 0).map(x => ({ student: x.student, given: [...x.given].map(id => graph.get(id).student), lonely: x.lonelyCount }));
    const active = nodes.filter(x => (x.student.messages || []).some(m => m.sender === 'user')).length;
    const moods = { 건강: 0, 보통: 0, 힘듦: 0 };
    nodes.forEach(x => { if (moods[x.student.mood] !== undefined) moods[x.student.mood] += 1; });

    const density = n > 1 ? links / (n * (n - 1)) : 0;
    const reciprocity = links > 0 ? (mutualPairs.length * 2) / links : 0;

    return { n, links, mutualPairs, conflictPairs, leaders, isolated, active, moods, density, reciprocity, atRisk, results };
  }, [studentsData]);

  const riskList = showAllRisk ? a.atRisk : a.atRisk.slice(0, 6);
  const tierCounts = a.atRisk.reduce((m, r) => { m[r.tier] = (m[r.tier] || 0) + 1; return m; }, {});

  const densityNote = a.n < 2 ? '' : a.density >= 0.12 ? '지목이 골고루 오가는 편' : a.density >= 0.06 ? '보통 수준' : '아직 지목 데이터가 적음 (대화가 쌓이면 올라갑니다)';
  const recipNote = a.links === 0 ? '' : a.reciprocity >= 0.5 ? '서로 좋아하는 관계가 많음' : a.reciprocity >= 0.3 ? '보통' : '한쪽만 좋아하는 관계가 많음 → 짝·모둠으로 연결 기회 필요';

  return (
    <div className="glass-card" style={{ padding: '32px', display: 'flex', flexDirection: 'column', flex: 1, gap: '20px' }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
          <div style={{ background: 'var(--primary-light)', padding: '12px', borderRadius: '16px' }}>
            <Target size={28} color="var(--primary-color)" />
          </div>
          <h2 style={{ color: '#2d3748', margin: 0, fontSize: '1.8rem' }}>학급 관계 분석</h2>
        </div>
        <p style={{ color: '#718096', margin: 0, fontSize: '0.98rem', paddingLeft: '52px', lineHeight: 1.6 }}>
          챗봇 대화에서 추출된 긍정 지목·갈등·외로움 신호와 학생이 고른 기분을 실명 기준으로 정리했습니다. 각 항목 아래에 <b>근거</b>가 함께 표시됩니다. (이름 색: <span style={{ color: '#2b6cb0', fontWeight: 700 }}>남</span> / <span style={{ color: '#b83280', fontWeight: 700 }}>여</span>)
        </p>
      </div>

      {/* 핵심 지표 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
        <Stat label="참여 학생" value={`${a.n}명`} sub={`대화 기록 있음 ${a.active}명`} />
        <Stat label="긍정 지목" value={`${a.links}건`} sub={`지목 밀도 ${(a.density * 100).toFixed(0)}% · ${densityNote}`} color="#38a169" />
        <Stat label="서로 지목한 쌍" value={`${a.mutualPairs.length}쌍`} sub={`상호성 ${(a.reciprocity * 100).toFixed(0)}% · ${recipNote}`} color="#d69e2e" />
        <Stat label="갈등 신호 쌍" value={`${a.conflictPairs.length}쌍`} sub={`상호 갈등 ${a.conflictPairs.filter(p => p.mutual).length}쌍`} color="#e53e3e" />
        <Stat label="지목 못 받은 학생" value={`${a.isolated.length}명`} sub="관계망 고립 위험" color="#805ad5" />
        <Stat label="기분 분포" value={<span style={{ fontSize: '1.05rem' }}><span style={{ color: '#38a169' }}>건강 {a.moods.건강}</span> · <span style={{ color: '#d69e2e' }}>보통 {a.moods.보통}</span> · <span style={{ color: '#e53e3e' }}>힘듦 {a.moods.힘듦}</span></span>} sub="학생이 직접 고른 오늘의 기분" color="#2d3748" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '16px' }}>
        {/* 긍정적 지목 리더 */}
        <Card title="긍정적 지목 리더" icon={<Trophy size={20} />} color="#276749" border="#9ae6b4" bg="linear-gradient(135deg, #f0fff4 0%, #e6fffa 100%)">
          {a.leaders.length === 0 ? (
            <div style={{ color: '#4a5568', background: 'rgba(255,255,255,0.7)', padding: '14px', borderRadius: '12px', fontSize: '0.9rem' }}>아직 지목 데이터가 없습니다. 학생들이 챗봇과 대화하면 채워집니다.</div>
          ) : a.leaders.map((l, i) => (
            <div key={l.student.id} style={{ background: 'rgba(255,255,255,0.75)', borderRadius: '12px', padding: '10px 12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 800, color: '#276749', width: '20px' }}>{i + 1}</span>
                <Name s={l.student} size="1.02rem" />
                <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#276749', background: '#c6f6d5', padding: '2px 8px', borderRadius: '8px' }}>받은 지목 {l.received}회</span>
                {l.mutual > 0 && <span style={{ fontSize: '0.78rem', color: '#975a16', background: '#fefcbf', padding: '2px 8px', borderRadius: '8px' }}>💛 서로 지목 {l.mutual}</span>}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#4a5568', marginTop: '4px', paddingLeft: '28px', wordBreak: 'keep-all' }}>
                근거: {l.from.map(f => f.realName || f.nickname).join(', ')}이(가) 짝꿍·모둠·고마운 친구로 지목
              </div>
            </div>
          ))}
        </Card>

        {/* 관심 필요 그룹 */}
        <Card
          title="관심 필요 그룹"
          icon={<ShieldAlert size={20} />} color="#9b2c2c" border="#feb2b2" bg="linear-gradient(135deg, #fff5f5 0%, #fffaf0 100%)"
          right={<span style={{ display: 'flex', gap: '4px' }}>{['urgent', 'high', 'watch'].filter(t => tierCounts[t]).map(t => <span key={t} style={{ fontSize: '0.72rem', fontWeight: 'bold', color: TIER[t].color, background: TIER[t].bg, border: `1px solid ${TIER[t].border}`, padding: '2px 8px', borderRadius: '10px' }}>{TIER[t].label} {tierCounts[t]}</span>)}</span>}
        >
          {a.atRisk.length === 0 ? (
            <div style={{ color: '#4a5568', background: 'rgba(255,255,255,0.7)', padding: '14px', borderRadius: '12px', fontSize: '0.9rem', fontWeight: 600 }}>현재 관심이 필요한 신호가 없습니다. 🎉</div>
          ) : riskList.map(r => {
            const t = TIER[r.tier];
            return (
              <div key={r.id} style={{ background: 'rgba(255,255,255,0.8)', border: `1px solid ${t.border}`, borderRadius: '12px', padding: '10px 12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <Name s={r.student} size="1.02rem" />
                  <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: t.color, background: t.bg, border: `1px solid ${t.border}`, padding: '2px 8px', borderRadius: '8px' }}>{t.label}</span>
                  <span style={{ fontSize: '0.75rem', color: '#718096' }}>기분 {r.student.mood || '?'}</span>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#4a5568', marginTop: '5px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  {r.signals.map((sg, i) => {
                    const names = (sg.ids || []).map(id => a.results.find(x => x.id === id)?.student?.realName).filter(Boolean);
                    return <div key={i}>• <b>{sg.label}</b>{sg.detail ? ` — ${sg.detail}` : ''}{names.length ? ` (${names.join(', ')})` : ''}</div>;
                  })}
                  <div style={{ color: t.color, marginTop: '2px' }}>→ {r.quickAction}</div>
                </div>
              </div>
            );
          })}
          {a.atRisk.length > 6 && (
            <button onClick={() => setShowAllRisk(v => !v)} style={{ alignSelf: 'center', background: 'transparent', border: 'none', color: '#9b2c2c', fontWeight: 'bold', fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
              {showAllRisk ? <><ChevronUp size={14} /> 접기</> : <><ChevronDown size={14} /> {a.atRisk.length - 6}명 더 보기</>}
            </button>
          )}
        </Card>
      </div>

      {/* 관계 구조 */}
      <div style={{ border: '1px solid #e2e8f0', borderRadius: '18px', overflow: 'hidden' }}>
        <button onClick={() => setShowPairs(v => !v)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 18px', background: '#f8fafc', border: 'none', cursor: 'pointer', textAlign: 'left', fontWeight: 'bold', color: '#2d3748', fontSize: '1rem' }}>
          <Users size={18} color="var(--primary-color)" /> 관계 구조 자세히 보기
          <span style={{ marginLeft: 'auto', color: '#a0aec0', display: 'flex' }}>{showPairs ? <ChevronUp size={18} /> : <ChevronDown size={18} />}</span>
        </button>
        {showPairs && (
          <div style={{ padding: '16px 18px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
            <div>
              <div style={{ fontWeight: 'bold', color: '#975a16', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}><Heart size={15} /> 서로 지목한 쌍 ({a.mutualPairs.length})</div>
              {a.mutualPairs.length === 0 ? <div style={{ fontSize: '0.85rem', color: '#a0aec0' }}>아직 없음</div> : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {a.mutualPairs.map(([x, y]) => (
                    <span key={x.id + y.id} style={{ fontSize: '0.85rem', background: '#fffff0', border: '1px solid #f6e05e', borderRadius: '10px', padding: '4px 10px' }}><Name s={x} size="0.85rem" /> ↔ <Name s={y} size="0.85rem" /></span>
                  ))}
                </div>
              )}
              <div style={{ fontSize: '0.75rem', color: '#a0aec0', marginTop: '6px' }}>자리·모둠 배치 시 가까이 두면 정서적 안정감을 줍니다.</div>
            </div>
            <div>
              <div style={{ fontWeight: 'bold', color: '#c53030', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}><Zap size={15} /> 갈등 신호 쌍 ({a.conflictPairs.length})</div>
              {a.conflictPairs.length === 0 ? <div style={{ fontSize: '0.85rem', color: '#a0aec0' }}>없음</div> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {a.conflictPairs.map(p => (
                    <div key={p.a.id + p.b.id} style={{ fontSize: '0.85rem', background: p.mutual ? '#fff5f5' : '#fffaf0', border: `1px solid ${p.mutual ? '#feb2b2' : '#fbd38d'}`, borderRadius: '10px', padding: '6px 10px' }}>
                      <Name s={p.a} size="0.85rem" /> {p.mutual ? '⇄' : '→'} <Name s={p.b} size="0.85rem" />
                      <div style={{ fontSize: '0.75rem', color: '#718096', marginTop: '2px' }}>{p.mutual ? '근거: 두 학생 모두 상대와의 갈등을 스스로 언급 (우선 개입)' : `근거: ${p.a.realName}이(가) 대화 중 ${p.b.realName}과의 갈등을 언급`}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <div style={{ fontWeight: 'bold', color: '#805ad5', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}><CircleDashed size={15} /> 지목을 받지 못한 학생 ({a.isolated.length})</div>
              {a.isolated.length === 0 ? <div style={{ fontSize: '0.85rem', color: '#a0aec0' }}>모든 학생이 최소 1회 지목받음 🎉</div> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {a.isolated.map(x => (
                    <div key={x.student.id} style={{ fontSize: '0.85rem', background: '#faf5ff', border: '1px solid #d6bcfa', borderRadius: '10px', padding: '6px 10px' }}>
                      <Name s={x.student} size="0.85rem" />
                      <div style={{ fontSize: '0.75rem', color: '#718096', marginTop: '2px' }}>
                        {x.given.length ? `본인은 ${x.given.map(g => g.realName).join(', ')}을(를) 지목 → 그 친구와 짝·모둠으로 연결해 볼 만함` : '지목한 친구도 없음 → 역할 부여로 접점 만들기'}
                        {x.lonely > 0 && ` · 외로움 신호 ${x.lonely}회`}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', fontSize: '0.78rem', color: '#a0aec0', lineHeight: 1.5 }}>
        <Info size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
        <span>지목 밀도 = 실제 지목 수 ÷ 가능한 지목 수(n×(n−1)). 상호성 = 서로 지목한 관계 ÷ 전체 지목. 등급은 위기 알림(긴급) &gt; 기분 힘듦·상호 갈등·외로움·고립 신호 합산 점수(높음 ≥40, 관심 ≥15)로 계산되며, 상세 처방은 [맞춤 처방]에서 확인하세요.</span>
      </div>
    </div>
  );
};

export default ClassAnalysis;
