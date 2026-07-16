import React, { useState, useMemo } from 'react';
import { X } from 'lucide-react';

/**
 * 학생 관계망 소시오그램 (원형 배치)
 * - 학생 전원을 원 둘레에 고정 배치 → 겹침 없이 항상 한 화면에 전체 학급이 보임
 * - 라벨은 실명만 표시 (성별 색상: 파랑=남, 분홍=여)
 * - 금색 굵은 선 = 서로 지목(쌍방), 회색 화살표 = 한쪽 지목 (지목한 학생 → 받은 학생)
 * - 별 클릭 시 해당 학생의 관계만 강조 + 우측 상세 패널
 */

// 성별에 따른 이름 색상 (어두운 배경 위 밝은 톤)
const genderLabelColor = (gender) => {
  if (gender === '남') return '#7cc4ff';
  if (gender === '여') return '#ff9ecf';
  return 'rgba(255, 255, 255, 0.9)';
};

// 기분에 따른 별 색상
const moodColor = (mood) => {
  if (mood === '보통') return '#fbbf24';
  if (mood === '힘듦') return '#f87171';
  return '#60a5fa';
};

// SVG 별(5꼭짓점) 폴리곤 좌표 생성
const starPoints = (cx, cy, outerR, innerR) => {
  const pts = [];
  let rot = -Math.PI / 2;
  const step = Math.PI / 5;
  for (let i = 0; i < 5; i++) {
    pts.push(`${cx + Math.cos(rot) * outerR},${cy + Math.sin(rot) * outerR}`);
    rot += step;
    pts.push(`${cx + Math.cos(rot) * innerR},${cy + Math.sin(rot) * innerR}`);
    rot += step;
  }
  return pts.join(' ');
};

const VIEW_W = 760;
const VIEW_H = 560;
const CX = VIEW_W / 2;
const CY = VIEW_H / 2 + 6;
const RADIUS = Math.min(VIEW_W, VIEW_H) / 2 - 78; // 라벨 공간 확보

const Sociogram = ({ studentsData = [] }) => {
  const [selectedId, setSelectedId] = useState(null);

  const { nodes, links } = useMemo(() => {
    // 닉네임 기준 중복 제거 (동일 닉네임은 최신 데이터로 통합)
    const uniqueStudentsMap = new Map();
    studentsData.forEach(student => {
      const name = student.nickname || '알 수 없음';
      if (!uniqueStudentsMap.has(name)) {
        uniqueStudentsMap.set(name, student);
      } else {
        const existing = uniqueStudentsMap.get(name);
        const existingTime = existing.lastActive?.toMillis ? existing.lastActive.toMillis() : 0;
        const newTime = student.lastActive?.toMillis ? student.lastActive.toMillis() : 0;
        if (newTime > existingTime) uniqueStudentsMap.set(name, student);
      }
    });

    const nodeList = Array.from(uniqueStudentsMap.values()).map(student => ({
      id: student.nickname || student.id,
      name: student.nickname || '알 수 없음',
      realName: student.realName || student.nickname || '알 수 없음',
      gender: student.gender || '',
      mood: student.mood || '알 수 없음',
      received: 0,
      nominations: student.nominations || [],
      conflicts: student.conflicts || [],
      lonelyCount: (student.lonelySignals || []).length
    }));

    // 퍼지 매칭
    const findTarget = (targetNickname) => {
      let target = nodeList.find(n => n.name === targetNickname || n.realName === targetNickname);
      if (!target) {
        const searchName = targetNickname.replace(/[은는이가랑하고의]$/g, '').trim();
        target = nodeList.find(n =>
          (n.name && n.name.includes(searchName)) ||
          (n.realName && n.realName.includes(searchName)) ||
          (n.name && searchName.includes(n.name)) ||
          (n.realName && searchName.includes(n.realName))
        );
      }
      return target;
    };

    // 방향 링크 수집
    const keySet = new Set();
    nodeList.forEach(src => {
      (src.nominations || []).forEach(nick => {
        const target = findTarget(nick);
        if (target && target.id !== src.id) {
          const key = `${src.id}>${target.id}`;
          if (keySet.has(key)) return;
          keySet.add(key);
          target.received += 1;
        }
      });
    });

    // 상호/일방 링크 정리 (상호는 1개의 금색 선으로 통합)
    const linkList = [];
    const mutualDone = new Set();
    keySet.forEach(key => {
      const [s, t] = key.split('>');
      const isMutual = keySet.has(`${t}>${s}`);
      if (isMutual) {
        const pairKey = [s, t].sort().join('|');
        if (mutualDone.has(pairKey)) return;
        mutualDone.add(pairKey);
        linkList.push({ source: s, target: t, mutual: true });
      } else {
        linkList.push({ source: s, target: t, mutual: false });
      }
    });

    // 원 둘레 배치 순서: 연결된 학생끼리 이웃하도록 탐욕적 정렬 (긴 선 최소화)
    const adj = new Map();
    const addAdj = (a, b) => {
      if (!adj.has(a)) adj.set(a, new Set());
      adj.get(a).add(b);
    };
    linkList.forEach(l => { addAdj(l.source, l.target); addAdj(l.target, l.source); });

    const remaining = new Set(nodeList.map(n => n.id));
    const order = [];
    while (remaining.size > 0) {
      let pick = null;
      if (order.length > 0) {
        const last = order[order.length - 1];
        const nbrs = [...(adj.get(last) || [])].filter(id => remaining.has(id));
        if (nbrs.length > 0) {
          nbrs.sort((a, b) => (adj.get(b)?.size || 0) - (adj.get(a)?.size || 0));
          pick = nbrs[0];
        }
      }
      if (!pick) {
        pick = [...remaining].sort((a, b) => (adj.get(b)?.size || 0) - (adj.get(a)?.size || 0))[0];
      }
      order.push(pick);
      remaining.delete(pick);
    }

    // 원 위 좌표 계산
    const nodeById = new Map(nodeList.map(n => [n.id, n]));
    const n = order.length;
    order.forEach((id, i) => {
      const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n;
      const node = nodeById.get(id);
      node.angle = angle;
      node.x = CX + Math.cos(angle) * RADIUS;
      node.y = CY + Math.sin(angle) * RADIUS;
    });

    return { nodes: nodeList, links: linkList };
  }, [studentsData]);

  const nodeById = useMemo(() => new Map(nodes.map(n => [n.id, n])), [nodes]);

  // 선택된 학생 관계 요약 (상세 패널)
  const selectedInfo = useMemo(() => {
    if (!selectedId) return null;
    const node = nodeById.get(selectedId);
    if (!node) return null;
    const outgoing = [];
    const incoming = [];
    const mutual = [];
    links.forEach(l => {
      if (l.mutual) {
        if (l.source === selectedId) mutual.push(nodeById.get(l.target));
        else if (l.target === selectedId) mutual.push(nodeById.get(l.source));
      } else {
        if (l.source === selectedId) outgoing.push(nodeById.get(l.target));
        if (l.target === selectedId) incoming.push(nodeById.get(l.source));
      }
    });
    const conflictNames = (node.conflicts || [])
      .map(nick => nodes.find(n => n.name === nick || n.realName === nick))
      .filter(Boolean)
      .map(n => n.realName);
    return { node, outgoing: outgoing.filter(Boolean), incoming: incoming.filter(Boolean), mutual: mutual.filter(Boolean), conflictNames };
  }, [selectedId, links, nodes, nodeById]);

  const isLinkActive = (l) => !selectedId || l.source === selectedId || l.target === selectedId;
  const isNodeActive = (id) => {
    if (!selectedId) return true;
    if (id === selectedId) return true;
    return links.some(l => (l.source === selectedId && l.target === id) || (l.target === selectedId && l.source === id));
  };

  // 별 크기: 받은 지목 수 비례 (상한)
  const starSize = (node) => 7 + Math.min(9, node.received * 1.6);

  // 선의 양 끝을 별 크기만큼 안쪽으로 당김
  const linkEnds = (l) => {
    const s = nodeById.get(l.source);
    const t = nodeById.get(l.target);
    if (!s || !t) return null;
    const dx = t.x - s.x;
    const dy = t.y - s.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const ux = dx / dist;
    const uy = dy / dist;
    const sOff = starSize(s) + 3;
    const tOff = starSize(t) + 6;
    return {
      x1: s.x + ux * sOff, y1: s.y + uy * sOff,
      x2: t.x - ux * tOff, y2: t.y - uy * tOff,
      s, t
    };
  };

  // 라벨 위치: 원 바깥쪽
  const labelPos = (node) => {
    const lx = CX + Math.cos(node.angle) * (RADIUS + 20);
    const ly = CY + Math.sin(node.angle) * (RADIUS + 20);
    const c = Math.cos(node.angle);
    const anchor = c > 0.35 ? 'start' : c < -0.35 ? 'end' : 'middle';
    return { lx, ly, anchor };
  };

  const rowStyle = { display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' };
  const chip = (n, borderColor) => (
    <span key={n.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '2px 8px', borderRadius: '10px', border: `1px solid ${borderColor}`, fontSize: '0.78rem', color: genderLabelColor(n.gender), background: 'rgba(255,255,255,0.06)' }}>
      {n.realName}
    </span>
  );

  return (
    <div className="glass-card widget sociogram-widget" style={{ padding: 0, overflow: 'hidden', background: '#0f172a', position: 'relative' }}>
      <div className="widget-title" style={{ position: 'absolute', top: 16, left: 20, zIndex: 10, color: 'white', textShadow: '0 0 10px rgba(255,255,255,0.5)' }}>
        학생 관계망 소시오그램
        <div style={{ fontSize: '0.72rem', fontWeight: 'normal', color: '#94a3b8', marginTop: '3px' }}>
          별을 클릭하면 그 학생의 관계만 강조됩니다
        </div>
      </div>

      {/* 컴팩트 범례 */}
      <div style={{ position: 'absolute', bottom: 12, left: 20, zIndex: 10, display: 'flex', flexWrap: 'wrap', gap: '14px', fontSize: '0.75rem', color: '#cbd5e1', background: 'rgba(15,23,42,0.75)', padding: '6px 12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)' }}>
        <span><b style={{ color: '#7cc4ff' }}>파랑</b>=남 <b style={{ color: '#ff9ecf' }}>분홍</b>=여</span>
        <span>별색: <b style={{ color: '#60a5fa' }}>좋음</b> <b style={{ color: '#fbbf24' }}>보통</b> <b style={{ color: '#f87171' }}>힘듦</b></span>
        <span><b style={{ color: '#ffd700' }}>― 금색</b>=서로 지목</span>
        <span style={{ color: '#94a3b8' }}>→ 회색 화살표=한쪽 지목</span>
        <span style={{ color: '#94a3b8' }}>별 클수록 지목 많이 받음</span>
      </div>

      {/* 학생 상세 패널 */}
      {selectedInfo && (
        <div className="glass-panel" style={{ position: 'absolute', top: 16, right: 16, width: '235px', maxHeight: 'calc(100% - 32px)', overflowY: 'auto', padding: '14px', zIndex: 20, background: 'rgba(15, 23, 42, 0.94)', border: '1px solid rgba(255,255,255,0.15)', color: '#e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontWeight: 'bold', fontSize: '1.05rem', color: genderLabelColor(selectedInfo.node.gender) }}>
                {selectedInfo.node.realName}
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 'normal', marginLeft: '6px' }}>{selectedInfo.node.gender}</span>
              </div>
              <div style={{ fontSize: '0.76rem', color: '#94a3b8' }}>기분: {selectedInfo.node.mood} · 받은 지목 {selectedInfo.node.received}회
                {selectedInfo.node.lonelyCount > 0 && <span style={{ color: '#7cc4ff' }}> · 💧외로움 {selectedInfo.node.lonelyCount}회</span>}
              </div>
            </div>
            <button onClick={() => setSelectedId(null)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0 }}>
              <X size={18} />
            </button>
          </div>

          <div style={{ marginTop: '10px' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#ffd700' }}>💛 서로 지목 ({selectedInfo.mutual.length})</div>
            <div style={rowStyle}>
              {selectedInfo.mutual.length > 0 ? selectedInfo.mutual.map(n => chip(n, 'rgba(255,215,0,0.5)')) : <span style={{ fontSize: '0.75rem', color: '#64748b' }}>없음</span>}
            </div>
          </div>
          <div style={{ marginTop: '8px' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#93c5fd' }}>→ 내가 지목 ({selectedInfo.outgoing.length})</div>
            <div style={rowStyle}>
              {selectedInfo.outgoing.length > 0 ? selectedInfo.outgoing.map(n => chip(n, 'rgba(147,197,253,0.4)')) : <span style={{ fontSize: '0.75rem', color: '#64748b' }}>없음</span>}
            </div>
          </div>
          <div style={{ marginTop: '8px' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#86efac' }}>← 나를 지목 ({selectedInfo.incoming.length})</div>
            <div style={rowStyle}>
              {selectedInfo.incoming.length > 0 ? selectedInfo.incoming.map(n => chip(n, 'rgba(134,239,172,0.4)')) : <span style={{ fontSize: '0.75rem', color: '#64748b' }}>없음</span>}
            </div>
          </div>

          {selectedInfo.conflictNames.length > 0 && (
            <div style={{ marginTop: '8px', padding: '7px 9px', borderRadius: '10px', background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.4)' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 'bold', color: '#f87171' }}>⚡ 갈등 신호: {selectedInfo.conflictNames.join(', ')}</div>
            </div>
          )}
          {selectedInfo.mutual.length === 0 && selectedInfo.outgoing.length === 0 && selectedInfo.incoming.length === 0 && (
            <div style={{ marginTop: '8px', padding: '7px 9px', borderRadius: '10px', background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.4)', fontSize: '0.76rem', color: '#c4b5fd' }}>
              🏝 관계망에 연결되지 않은 학생 (고립 위험 관찰 필요)
            </div>
          )}
        </div>
      )}

      {nodes.length === 0 ? (
        <div style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#cbd5e1' }}>
          학생 데이터가 없습니다. (학생이 대화하면 별이 생성됩니다)
        </div>
      ) : (
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ width: '100%', height: '100%', display: 'block' }}
          onClick={() => setSelectedId(null)}
        >
          <defs>
            <marker id="arrowGray" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(203,213,225,0.95)" />
            </marker>
            <marker id="arrowGold" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#ffd700" />
            </marker>
            <filter id="starGlow" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation="2.4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* 배경 장식 별 */}
          {[[60, 80], [700, 60], [90, 480], [680, 500], [380, 40], [40, 280], [720, 300]].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={1.2} fill="rgba(255,255,255,0.35)" />
          ))}

          {/* 관계선 */}
          {links.map((l, idx) => {
            const ends = linkEnds(l);
            if (!ends) return null;
            const active = isLinkActive(l);
            const stroke = l.mutual
              ? (active ? '#ffd700' : 'rgba(255,215,0,0.08)')
              : (active ? 'rgba(203,213,225,0.55)' : 'rgba(148,163,184,0.06)');
            return (
              <g key={idx}>
                <line
                  x1={ends.x1} y1={ends.y1} x2={ends.x2} y2={ends.y2}
                  stroke={stroke}
                  strokeWidth={l.mutual ? 2.6 : 1.4}
                  markerEnd={active ? (l.mutual ? 'url(#arrowGold)' : 'url(#arrowGray)') : undefined}
                  markerStart={active && l.mutual ? 'url(#arrowGold)' : undefined}
                >
                  <title>
                    {l.mutual
                      ? `💛 ${ends.s.realName} ↔ ${ends.t.realName} (서로 지목)`
                      : `${ends.s.realName} → ${ends.t.realName} 지목`}
                  </title>
                </line>
              </g>
            );
          })}

          {/* 학생 별 + 실명 라벨 */}
          {nodes.map(node => {
            const size = starSize(node);
            const { lx, ly, anchor } = labelPos(node);
            const active = isNodeActive(node.id);
            return (
              <g
                key={node.id}
                opacity={active ? 1 : 0.18}
                style={{ cursor: 'pointer' }}
                onClick={(e) => { e.stopPropagation(); setSelectedId(prev => (prev === node.id ? null : node.id)); }}
              >
                <title>{`${node.realName} · 기분 ${node.mood} · 받은 지목 ${node.received}회`}</title>
                <polygon
                  points={starPoints(node.x, node.y, size, size / 2.4)}
                  fill={moodColor(node.mood)}
                  filter="url(#starGlow)"
                  stroke={selectedId === node.id ? 'white' : 'none'}
                  strokeWidth={selectedId === node.id ? 1.5 : 0}
                />
                <text
                  x={lx} y={ly}
                  textAnchor={anchor}
                  dominantBaseline="middle"
                  fill={genderLabelColor(node.gender)}
                  fontSize="13.5"
                  fontWeight="700"
                  fontFamily="'Inter', sans-serif"
                  style={{ paintOrder: 'stroke', stroke: 'rgba(15,23,42,0.85)', strokeWidth: 3 }}
                >
                  {node.realName}
                </text>
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
};

export default Sociogram;
