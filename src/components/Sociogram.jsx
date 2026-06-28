import React, { useRef, useEffect, useState, useMemo } from 'react';
import ForceGraph2D from 'react-force-graph-2d';

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

const Sociogram = ({ studentsData = [] }) => {
  const fgRef = useRef();
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const containerRef = useRef(null);

  // 학생 데이터 기반으로 동적 그래프 데이터 생성
  const graphData = useMemo(() => {
    // 닉네임 기준으로 중복 제거 (동일 닉네임은 단일 별로 통합)
    const uniqueStudentsMap = new Map();
    studentsData.forEach(student => {
      const name = student.nickname || '알 수 없음';
      if (!uniqueStudentsMap.has(name)) {
        uniqueStudentsMap.set(name, student);
      } else {
        // 이미 같은 닉네임이 있다면 더 최신 데이터로 덮어쓰기
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
      // 기분에 따라 색상 다르게 (예: 좋음=파랑, 보통=노랑, 힘듦=빨강)
      let color = '#60a5fa'; // 기본 푸른빛
      if (student.mood === '보통') color = '#fbbf24';
      if (student.mood === '힘듦') color = '#f87171';
      
      return {
        id: student.nickname || student.id, // 닉네임을 ID로 사용하여 통합 유지
        name: student.nickname || '알 수 없음',
        realName: student.realName || '',
        avatar: student.avatar || '👤',
        mood: student.mood || '알 수 없음',
        color: color,
        val: 10, // 기본 크기
        nominations: student.nominations || [] // 동료 추인 데이터 보존
      };
    });

    const links = [];
    // 저장된 동료 추인 데이터(nominations)를 바탕으로 실제 관계망(Link) 생성
    nodes.forEach(sourceNode => {
      if (sourceNode.nominations && sourceNode.nominations.length > 0) {
        sourceNode.nominations.forEach(targetNickname => {
          let targetExists = nodes.find(n => n.name === targetNickname || n.id === targetNickname || n.realName === targetNickname);
          if (!targetExists) {
            const searchName = targetNickname.replace(/[은는이가랑하고의]$/g, '').trim();
            targetExists = nodes.find(n => 
              (n.name && n.name.includes(searchName)) || 
              (n.realName && n.realName.includes(searchName)) ||
              (searchName.includes(n.name)) ||
              (searchName.includes(n.realName))
            );
          }
          if (targetExists) {
            links.push({
              source: sourceNode.id,
              target: targetExists.id
            });
            // 지목을 많이 받을수록(인기가 많을수록) 별의 크기(val) 증가!
            targetExists.val = (targetExists.val || 10) + 4;
          }
        });
      }
    });

    return { nodes, links };
  }, [studentsData]);

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

  return (
    <div className="glass-card widget sociogram-widget" style={{ padding: 0, overflow: 'hidden', background: '#0f172a', position: 'relative' }}>
      <div className="widget-title" style={{ position: 'absolute', top: 20, left: 20, zIndex: 10, color: 'white', textShadow: '0 0 10px rgba(255,255,255,0.5)' }}>
        우주 속의 학생 관계망 (별자리 테마)
      </div>
      
      {/* Legend */}
      <div className="glass-panel" style={{ position: 'absolute', bottom: 20, left: 20, padding: '12px', fontSize: '0.85rem', zIndex: 10, background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(255,255,255,0.1)', color: '#cbd5e1' }}>
        <div style={{ fontWeight: 600, marginBottom: '8px', color: 'white' }}>기분 별자리 범례</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <div style={{ width: '12px', height: '12px', background: '#60a5fa', boxShadow: '0 0 10px #60a5fa', clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)' }}></div> 좋음
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <div style={{ width: '12px', height: '12px', background: '#fbbf24', boxShadow: '0 0 10px #fbbf24', clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)' }}></div> 보통
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <div style={{ width: '12px', height: '12px', background: '#f87171', boxShadow: '0 0 10px #f87171', clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)' }}></div> 힘듦
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '20px', height: '1px', background: 'rgba(255,255,255,0.3)' }}></div> 친구 관계 (임시)
        </div>
      </div>

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
            linkColor={() => 'rgba(255, 255, 255, 0.3)'}
            linkWidth={1.5}
            linkDirectionalArrowLength={8}
            linkDirectionalArrowRelPos={0.5}
            linkDirectionalArrowColor={() => 'rgba(255, 255, 255, 1)'}
            linkDirectionalParticles={2}
            linkDirectionalParticleSpeed={0.005}
            nodeCanvasObject={(node, ctx, globalScale) => {
              const size = (node.val || 5) * 1.2;
              
              // 야광 효과 설정
              ctx.shadowColor = node.color;
              ctx.shadowBlur = 15 * globalScale;
              ctx.fillStyle = node.color;
              
              // 5꼭짓점 별 그리기
              drawStar(ctx, node.x, node.y, 5, size, size / 2.5);
              ctx.fill();

              // 텍스트 (닉네임 + 아바타 이모지) 표시
              const label = `${node.avatar} ${node.name}`;
              const fontSize = 14 / globalScale;
              ctx.font = `600 ${fontSize}px Sans-Serif`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
              ctx.shadowBlur = 0; // 글자에는 블러 해제
              ctx.fillText(label, node.x, node.y + size + fontSize * 1.2);
            }}
            onNodeHover={node => {
              containerRef.current.style.cursor = node ? 'pointer' : 'default';
            }}
            onEngineStop={() => {
              if (fgRef.current) fgRef.current.zoomToFit(400, 50);
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
