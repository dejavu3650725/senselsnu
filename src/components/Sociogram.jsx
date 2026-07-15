import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { forceCollide, forceX, forceY } from 'd3-force-3d';
import { X } from 'lucide-react';

// 별 표시 크기: 받은 지목 수에 따라 커지되 상한을 둬서 라벨을 가리지 않게
const starSizeOf = (node) => 7 + Math.min(12, (node.received || 0) * 2);

// 5꼭짓점 별 그리기 함수
function drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius) {
  let rot = Math.PI / 2 * 3;
  let x = cx;
  let y = cy;
  let step = Math.PI / spikes;

  ctx.beginPath();
  ctx.moveTo(cx, cy - outerRadius);
  for (let i = 0; i < spikes; i++) {
    x = cx + Math.cos(rot) * outerRadius;
    y = cy + Math.sin(rot) * outerRadius;
    ctx.lineTo(x, y);
    rot += step;

    x = cx + Math.cos(rot) * innerRadius;
    y = cy + Math.sin(rot) * innerRadius;
    ctx.lineTo(x, y);
    rot += step;
  }
  ctx.lineTo(cx, cy - outerRadius);
  ctx.closePath();
}

// 성별에 따른 이름 색상 (어두운 우주 배경 위에서 잘 보이는 밝은 톤)
const genderLabelColor = (gender) => {
  if (gender === '남') return '#7cc4ff'; // 밝은 파랑
  if (gender === '여') return '#ff9ecf'; // 밝은 분홍
  return 'rgba(255, 255, 255, 0.9)';
};

// 링크 양 끝 id 추출 (그래프 초기화 후에는 source/target이 객체로 바뀜)
const endId = (end) => (typeof end === 'object' && end !== null ? end.id : end);

const Sociogram = ({ studentsData = [] }) => {
  const fgRef = useRef();
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const containerRef = useRef(null);
  const [selectedId, setSelectedId] = useState(null); // 클릭한 학생 (상세 패널)

  // 학생 데이터 기반으로 동적 그래프 데이터 생성
  const graphData = useMemo(() => {
    // 닉네임 기준으로 중복 제거 (동일 닉네임은 단일 별로 통합)
    const uniqueStudentsMap = new Map();
    studentsData.forEach(student => {
      const name = student.nickname || '알 수 없음';
      if (!uniqueStudentsMap.has(name)) {
        uniqueStudentsMap.set(name, student);
      } else {
        const existing = uniqueStudentsMap.get(name);
        const existingTime = existing.lastActive?.toMillis ? existing.lastActive.toMillis() : 0;
        const newTime = student.lastActive?.toMillis ? student.lastActive.toMillis() : 0;
        if (newTime > existingTime) {
          uniqueStudentsMap.set(name, student);
        }
      }
    });

    const uniqueStudents = Array.from(uniqueStudentsMap.values());

    const nodes = uniqueStudents.map((student) => {
      // 기분에 따라 별 색상 (좋음=파랑, 보통=노랑, 힘듦=빨강)
      let color = '#60a5fa';
      if (student.mood === '보통') color = '#fbbf24';
      if (student.mood === '힘듦') color = '#f87171';

      return {
        id: student.nickname || student.id,
        name: student.nickname || '알 수 없음',
        realName: student.realName || student.nickname || '알 수 없음',
        gender: student.gender || '',
        avatar: student.avatar || '👤',
        mood: student.mood || '알 수 없음',
        color,
        val: 4,
        received: 0, // 받은 지목 수 (아래에서 집계)
        nominations: student.nominations || [],
        conflicts: student.conflicts || [],
        lonelyCount: (student.lonelySignals || []).length
      };
    });

    // 퍼지 매칭으로 지목 대상 노드 찾기
    const findTarget = (targetNickname) => {
      let target = nodes.find(n => n.name === targetNickname || n.id === targetNickname || n.realName === targetNickname);
      if (!target) {
        const searchName = targetNickname.replace(/[은는이가랑하고의]$/g, '').trim();
        target = nodes.find(n =>
          (n.name && n.name.includes(searchName)) ||
          (n.realName && n.realName.includes(searchName)) ||
          (n.name && searchName.includes(n.name)) ||
          (n.realName && searchName.includes(n.realName))
        );
      }
      return target;
    };

    // 지목(추인) 데이터 → 방향 있는 링크 생성
    const linkKeySet = new Set(); // "sourceId>targetId"
    const rawLinks = [];
    nodes.forEach(sourceNode => {
      (sourceNode.nominations || []).forEach(targetNickname => {
        const target = findTarget(targetNickname);
        if (target && target.id !== sourceNode.id) {
          const key = `${sourceNode.id}>${target.id}`;
          if (linkKeySet.has(key)) return; // 중복 지목은 1개 링크로
          linkKeySet.add(key);
          rawLinks.push({ source: sourceNode.id, target: target.id });
          // 지목을 많이 받을수록 별이 커지고, 받은 지목 수 집계
          target.val = (target.val || 4) + 2;
          target.received = (target.received || 0) + 1;
        }
      });
    });

    // 상호(쌍방) 지목 판별
    const links = rawLinks.map(l => ({
      ...l,
      mutual: linkKeySet.has(`${l.target}>${l.source}`)
    }));

    return { nodes, links };
  }, [studentsData]);

  // 선택된 학생의 관계 요약 (상세 패널용)
  const selectedInfo = useMemo(() => {
    if (!selectedId) return null;
    const node = graphData.nodes.find(n => n.id === selectedId);
    if (!node) return null;

    const nodeById = new Map(graphData.nodes.map(n => [n.id, n]));
    const outgoing = [];
    const incoming = [];
    graphData.links.forEach(l => {
      const s = endId(l.source);
      const t = endId(l.target);
      if (s === selectedId) outgoing.push(nodeById.get(t));
      if (t === selectedId) incoming.push(nodeById.get(s));
    });
    const outIds = new Set(outgoing.map(n => n?.id));
    const mutual = incoming.filter(n => n && outIds.has(n.id));
    const mutualIds = new Set(mutual.map(n => n.id));

    // 갈등 신호 상대 (실명으로 변환)
    const conflictNames = (node.conflicts || [])
      .map(nick => graphData.nodes.find(n => n.name === nick || n.realName === nick))
      .filter(Boolean)
      .map(n => n.realName);

    return {
      node,
      outgoing: outgoing.filter(Boolean).filter(n => !mutualIds.has(n.id)),
      incoming: incoming.filter(Boolean).filter(n => !mutualIds.has(n.id)),
      mutual,
      conflictNames
    };
  }, [selectedId, graphData]);

  // 선택 시 연결된 링크/노드 강조를 위한 집합
  const highlight = useMemo(() => {
    if (!selectedId) return null;
    const nodeIds = new Set([selectedId]);
    graphData.links.forEach(l => {
      const s = endId(l.source);
      const t = endId(l.target);
      if (s === selectedId) nodeIds.add(t);
      if (t === selectedId) nodeIds.add(s);
    });
    return nodeIds;
  }, [selectedId, graphData]);

  const isLinkActive = useCallback((l) => {
    if (!selectedId) return true;
    return endId(l.source) === selectedId || endId(l.target) === selectedId;
  }, [selectedId]);

  // 물리 엔진 튜닝: 노드끼리 밀어내기 + 라벨 공간 확보(충돌 방지) + 고립 학생이 너무 멀리 날아가지 않게 중심으로 살짝 당김
  useEffect(() => {
    const fg = fgRef.current;
    if (!fg) return;
    const charge = fg.d3Force('charge');
    if (charge) charge.strength(-260);
    const linkForce = fg.d3Force('link');
    if (linkForce) linkForce.distance(l => (l.mutual ? 85 : 125));
    fg.d3Force('collide', forceCollide(node => starSizeOf(node) + 28));
    fg.d3Force('x', forceX(0).strength(0.05));
    fg.d3Force('y', forceY(0).strength(0.06));
    if (fg.d3ReheatSimulation) fg.d3ReheatSimulation();
  }, [graphData]);

  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver(entries => {
      for (let entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height
        });
      }
    });
    resizeObserver.observe(containerRef.current);

    return () => resizeObserver.disconnect();
  }, []);

  const rowStyle = { display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' };
  const chip = (n, borderColor) => (
    <span key={n.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '2px 8px', borderRadius: '10px', border: `1px solid ${borderColor}`, fontSize: '0.78rem', color: genderLabelColor(n.gender), background: 'rgba(255,255,255,0.06)' }}>
      {n.avatar} {n.realName}
    </span>
  );

  return (
    <div className="glass-card widget sociogram-widget" style={{ padding: 0, overflow: 'hidden', background: '#0f172a', position: 'relative' }}>
      <div className="widget-title" style={{ position: 'absolute', top: 20, left: 20, zIndex: 10, color: 'white', textShadow: '0 0 10px rgba(255,255,255,0.5)' }}>
        우주 속의 학생 관계망 (별자리 테마)
        <div style={{ fontSize: '0.75rem', fontWeight: 'normal', color: '#94a3b8', marginTop: '4px' }}>
          별을 클릭하면 그 학생의 관계가 자세히 보여요
        </div>
      </div>

      {/* 범례 */}
      <div className="glass-panel" style={{ position: 'absolute', bottom: 20, left: 20, padding: '12px', fontSize: '0.8rem', zIndex: 10, background: 'rgba(15, 23, 42, 0.75)', border: '1px solid rgba(255,255,255,0.1)', color: '#cbd5e1' }}>
        <div style={{ fontWeight: 600, marginBottom: '8px', color: 'white' }}>관계망 읽는 법</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <span style={{ color: '#7cc4ff', fontWeight: 'bold' }}>이름</span>=남 ·
          <span style={{ color: '#ff9ecf', fontWeight: 'bold' }}>이름</span>=여
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <div style={{ width: '12px', height: '12px', background: '#60a5fa', boxShadow: '0 0 8px #60a5fa', clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)' }}></div> 좋음
          <div style={{ width: '12px', height: '12px', background: '#fbbf24', boxShadow: '0 0 8px #fbbf24', clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)' }}></div> 보통
          <div style={{ width: '12px', height: '12px', background: '#f87171', boxShadow: '0 0 8px #f87171', clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)' }}></div> 힘듦
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <div style={{ width: '20px', height: '2px', background: '#ffd700', boxShadow: '0 0 6px #ffd700' }}></div> 금색 곡선 = 서로 지목 (쌍방)
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <div style={{ width: '20px', height: '1px', background: 'rgba(148,163,184,0.8)' }}></div> 회색 직선+화살표 = 한쪽 지목 (지목한 학생 → 받은 학생)
        </div>
        <div style={{ color: '#94a3b8' }}>별이 클수록 친구들에게 많이 지목받은 학생</div>
      </div>

      {/* 학생 상세 패널 (별 클릭 시) */}
      {selectedInfo && (
        <div className="glass-panel" style={{ position: 'absolute', top: 20, right: 20, width: '250px', maxHeight: 'calc(100% - 40px)', overflowY: 'auto', padding: '16px', zIndex: 20, background: 'rgba(15, 23, 42, 0.92)', border: '1px solid rgba(255,255,255,0.15)', color: '#e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '1.5rem' }}>{selectedInfo.node.avatar}</div>
              <div style={{ fontWeight: 'bold', fontSize: '1.05rem', color: genderLabelColor(selectedInfo.node.gender) }}>
                {selectedInfo.node.realName}
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 'normal', marginLeft: '6px' }}>
                  {selectedInfo.node.gender ? (selectedInfo.node.gender === '남' ? '남' : '여') : ''}
                </span>
              </div>
              <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>({selectedInfo.node.name}) · 기분: {selectedInfo.node.mood}</div>
            </div>
            <button onClick={() => setSelectedId(null)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0 }}>
              <X size={18} />
            </button>
          </div>

          <div style={{ marginTop: '10px', fontSize: '0.8rem', color: '#cbd5e1' }}>
            ⭐ 받은 지목 <b style={{ color: 'white' }}>{selectedInfo.node.received}</b>회
            {selectedInfo.node.lonelyCount > 0 && (
              <span style={{ marginLeft: '8px', color: '#7cc4ff' }}>💧 외로움 신호 {selectedInfo.node.lonelyCount}회</span>
            )}
          </div>

          <div style={{ marginTop: '12px' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#ffd700' }}>💛 서로 지목한 친구 ({selectedInfo.mutual.length})</div>
            <div style={rowStyle}>
              {selectedInfo.mutual.length > 0 ? selectedInfo.mutual.map(n => chip(n, 'rgba(255,215,0,0.5)')) : <span style={{ fontSize: '0.75rem', color: '#64748b' }}>없음</span>}
            </div>
          </div>

          <div style={{ marginTop: '10px' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#93c5fd' }}>→ 내가 지목한 친구 ({selectedInfo.outgoing.length})</div>
            <div style={rowStyle}>
              {selectedInfo.outgoing.length > 0 ? selectedInfo.outgoing.map(n => chip(n, 'rgba(147,197,253,0.4)')) : <span style={{ fontSize: '0.75rem', color: '#64748b' }}>없음</span>}
            </div>
          </div>

          <div style={{ marginTop: '10px' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#86efac' }}>← 나를 지목한 친구 ({selectedInfo.incoming.length})</div>
            <div style={rowStyle}>
              {selectedInfo.incoming.length > 0 ? selectedInfo.incoming.map(n => chip(n, 'rgba(134,239,172,0.4)')) : <span style={{ fontSize: '0.75rem', color: '#64748b' }}>없음</span>}
            </div>
          </div>

          {selectedInfo.conflictNames.length > 0 && (
            <div style={{ marginTop: '10px', padding: '8px 10px', borderRadius: '10px', background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.4)' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#f87171' }}>⚡ 갈등 신호</div>
              <div style={{ fontSize: '0.78rem', color: '#fca5a5', marginTop: '2px' }}>{selectedInfo.conflictNames.join(', ')} 학생과의 갈등을 언급했습니다</div>
            </div>
          )}

          {selectedInfo.mutual.length === 0 && selectedInfo.outgoing.length === 0 && selectedInfo.incoming.length === 0 && (
            <div style={{ marginTop: '10px', padding: '8px 10px', borderRadius: '10px', background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.4)', fontSize: '0.78rem', color: '#c4b5fd' }}>
              🏝 아직 관계망에 연결되지 않은 학생입니다 (고립 위험 관찰 필요)
            </div>
          )}
        </div>
      )}

      <div ref={containerRef} style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        {dimensions.width > 0 && graphData.nodes.length > 0 ? (
          <ForceGraph2D
            ref={fgRef}
            width={dimensions.width}
            height={dimensions.height}
            graphData={graphData}
            backgroundColor="#0f172a"
            nodeRelSize={2}
            nodeVal={node => node.val}
            nodeColor={node => node.color}
            nodeLabel={node => `${node.realName} (${node.name}) · 받은 지목 ${node.received}회`}
            linkLabel={l => {
              const s = graphData.nodes.find(n => n.id === endId(l.source));
              const t = graphData.nodes.find(n => n.id === endId(l.target));
              if (!s || !t) return '';
              return l.mutual
                ? `💛 ${s.realName} ↔ ${t.realName} (서로 지목)`
                : `${s.realName} → ${t.realName} 지목`;
            }}
            linkColor={l => {
              const active = isLinkActive(l);
              if (l.mutual) return active ? '#ffd700' : 'rgba(255, 215, 0, 0.12)';
              return active ? 'rgba(203, 213, 225, 0.9)' : 'rgba(148, 163, 184, 0.08)';
            }}
            linkWidth={l => (l.mutual ? 2.8 : 1.8)}
            linkCurvature={l => (l.mutual ? 0.22 : 0)}
            linkDirectionalArrowLength={l => (isLinkActive(l) ? 9 : 3)}
            linkDirectionalArrowRelPos={0.88}
            linkDirectionalArrowColor={l => (l.mutual ? '#ffd700' : 'rgba(255, 255, 255, 0.9)')}
            linkDirectionalParticles={l => (l.mutual && isLinkActive(l) ? 3 : 0)}
            linkDirectionalParticleWidth={2.5}
            linkDirectionalParticleColor={() => '#ffd700'}
            linkDirectionalParticleSpeed={0.005}
            nodeCanvasObject={(node, ctx, globalScale) => {
              const size = starSizeOf(node);
              const dimmed = highlight && !highlight.has(node.id);
              ctx.globalAlpha = dimmed ? 0.2 : 1;

              // 야광 별
              ctx.shadowColor = node.color;
              ctx.shadowBlur = (dimmed ? 4 : 12) * globalScale;
              ctx.fillStyle = node.color;
              drawStar(ctx, node.x, node.y, 5, size, size / 2.5);
              ctx.fill();

              // 선택된 별은 흰 테두리로 강조
              if (selectedId === node.id) {
                ctx.shadowBlur = 0;
                ctx.strokeStyle = 'white';
                ctx.lineWidth = 1.5 / globalScale;
                ctx.stroke();
              }

              ctx.shadowBlur = 0;

              // 실명 라벨 (성별 색상) - 어두운 반투명 배경을 깔아 선과 겹쳐도 읽히게
              const label = `${node.avatar} ${node.realName}`;
              const fontSize = Math.max(12 / globalScale, 3);
              ctx.font = `700 ${fontSize}px Sans-Serif`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              const labelY = node.y + size + fontSize * 0.95;
              const textWidth = ctx.measureText(label).width;
              ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
              ctx.fillRect(node.x - textWidth / 2 - 3, labelY - fontSize * 0.65, textWidth + 6, fontSize * 1.3);
              ctx.fillStyle = genderLabelColor(node.gender);
              ctx.fillText(label, node.x, labelY);

              // 닉네임 보조 라벨 (실명과 다를 때만, 작게)
              if (node.name && node.name !== node.realName) {
                const subSize = 9 / globalScale;
                const subY = labelY + fontSize * 0.7 + subSize * 0.75;
                ctx.font = `400 ${subSize}px Sans-Serif`;
                const subLabel = `(${node.name})`;
                const subWidth = ctx.measureText(subLabel).width;
                ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
                ctx.fillRect(node.x - subWidth / 2 - 2, subY - subSize * 0.65, subWidth + 4, subSize * 1.3);
                ctx.fillStyle = 'rgba(148, 163, 184, 0.9)';
                ctx.fillText(subLabel, node.x, subY);
              }

              ctx.globalAlpha = 1;
            }}
            onNodeClick={node => setSelectedId(prev => (prev === node.id ? null : node.id))}
            onBackgroundClick={() => setSelectedId(null)}
            onNodeHover={node => {
              containerRef.current.style.cursor = node ? 'pointer' : 'default';
            }}
            onEngineStop={() => {
              if (fgRef.current) fgRef.current.zoomToFit(400, 60);
            }}
          />
        ) : (
          <div style={{ color: '#cbd5e1' }}>학생 데이터가 없습니다. (학생이 대화하면 별이 생성됩니다)</div>
        )}
      </div>
    </div>
  );
};

export default Sociogram;
