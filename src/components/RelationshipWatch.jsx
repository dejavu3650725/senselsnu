import React, { useMemo } from 'react';
import { AlertTriangle, UserX, CloudRain, HeartHandshake, Repeat, Eye, Info } from 'lucide-react';
import { buildClassGraph, crossCheckConflict } from '../utils/studentSignals';

/**
 * 관계 신호 (교사용)
 * 원칙: 여기 표시되는 갈등은 전부 '학생이 챗봇에게 말한 것'이다. 프로그램은 사실 여부를 판정하지 않고,
 *       교사가 판단할 수 있도록 교차 정보(상대도 언급했는가, 상대는 지목을 얼마나 받는가, 보고 학생의 관계망은 어떤가)를 함께 보여준다.
 * - 반복 호소: 같은 상대를 3회 이상 언급 → 사실 확인 전 판단 보류를 권한다.
 * - 고립·외로움 신호는 소속감 지원의 출발점으로 다룬다.
 */
const genderColor = (g) => (g === '남' ? '#2b6cb0' : g === '여' ? '#b83280' : '#2d3748');
const Name = ({ s }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontWeight: 700, color: genderColor(s.gender), whiteSpace: 'nowrap' }} title={s.nickname && s.nickname !== s.realName ? `닉네임: ${s.nickname}` : undefined}>
    <span style={{ fontSize: '1.15rem', lineHeight: 1 }}>{s.avatar || '👤'}</span>{s.realName || s.nickname}
  </span>
);

const RelationshipWatch = ({ studentsData = [] }) => {
  const a = useMemo(() => {
    const graph = buildClassGraph(studentsData);
    const edges = [];
    const seen = new Set();
    graph.forEach((node, id) => {
      node.conflicts.forEach(tid => {
        const key = [id, tid].sort().join('|');
        const mutual = node.mutualConflicts.has(tid);
        if (mutual && seen.has(key)) return;
        if (mutual) seen.add(key);
        edges.push({ from: node.student, to: graph.get(tid).student, mutual, check: crossCheckConflict(graph, id, tid), backCheck: mutual ? crossCheckConflict(graph, tid, id) : null });
      });
    });
    // 정렬: 상호 갈등 → 반복 호소 많은 순
    edges.sort((x, y) => (y.mutual - x.mutual) || ((y.check?.mentions || 0) - (x.check?.mentions || 0)));

    const repeated = [];
    graph.forEach((node) => {
      node.mentionCounts.forEach((n, tid) => { if (n >= 3) repeated.push({ from: node.student, to: graph.get(tid).student, n }); });
    });
    repeated.sort((x, y) => y.n - x.n);

    const isolated = [];
    graph.forEach(node => { if (node.given.size === 0 && node.received === 0) isolated.push(node.student); });
    const lonely = [];
    graph.forEach(node => { if (node.lonelyCount > 0) lonely.push({ student: node.student, count: node.lonelyCount, last: [...(node.student.lonelySignals || [])].sort().pop(), received: node.received, given: node.given.size }); });
    lonely.sort((x, y) => y.count - x.count);
    return { edges, repeated, isolated, lonely };
  }, [studentsData]);

  const fmt = (iso) => { try { return new Date(iso).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' }); } catch { return ''; } };
  const card = { background: 'white', borderRadius: '16px', border: '1px solid var(--border)', padding: '20px 22px', marginBottom: '16px' };
  const title = { display: 'flex', alignItems: 'center', gap: '8px', margin: 0, fontSize: '1.08rem' };
  const sub = { color: 'var(--text-muted)', fontSize: '0.84rem', margin: '4px 0 14px 0', lineHeight: 1.55 };
  const empty = { color: 'var(--text-faint)', fontSize: '0.92rem', padding: '8px 0', margin: 0 };
  const hint = { fontSize: '0.8rem', color: '#4a5568', lineHeight: 1.5 };

  return (
    <div className="glass-card" style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', flex: 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
        <div style={{ background: 'rgba(229, 62, 62, 0.1)', padding: '12px', borderRadius: '16px' }}><HeartHandshake size={26} color="#e53e3e" /></div>
        <h2 style={{ margin: 0, fontSize: '1.6rem' }}>관계 신호</h2>
      </div>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', background: '#fffbea', border: '1px solid #f6e05e', borderRadius: '12px', padding: '10px 14px', margin: '8px 0 20px', fontSize: '0.86rem', color: '#744210', lineHeight: 1.55 }}>
        <Info size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
        <span>여기 표시되는 갈등은 모두 <b>학생이 챗봇에게 말한 내용</b>입니다. 프로그램은 사실 여부를 판정하지 않습니다. 각 항목의 교차 정보를 참고해 직접 관찰·확인한 뒤 판단해 주세요. 특히 같은 친구를 반복해서 이르는 경우, 보고하는 학생 쪽의 어려움(관계 기술, 관점 취하기)도 함께 살펴 주세요.</span>
      </div>

      {/* 1. 갈등 보고 */}
      <div style={card}>
        <h3 style={title}><AlertTriangle size={20} color="#dd6b20" /> 갈등 보고 <span style={{ fontSize: '0.85rem', color: 'var(--text-faint)', fontWeight: 'normal' }}>({a.edges.length}건 · 학생 보고 기준)</span></h3>
        <p style={sub}>학생이 스스로 말한 경우에만 기록됩니다. 상호 갈등(양쪽 모두 언급)은 중재 대화를 우선하고, 일방 보고는 교차 정보를 보고 판단하세요.</p>
        {a.edges.length === 0 ? <p style={empty}>보고된 갈등이 없습니다 🎉</p> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {a.edges.map((e, i) => (
              <div key={i} style={{ background: e.mutual ? '#fff5f5' : '#fffaf0', border: `1px solid ${e.mutual ? '#feb2b2' : '#fbd38d'}`, borderRadius: '12px', padding: '12px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <Name s={e.from} />
                  <span style={{ color: e.mutual ? '#c53030' : '#dd6b20', fontWeight: 700, fontSize: '0.9rem' }}>{e.mutual ? '⇄ 서로 갈등 언급' : '→ 갈등을 언급함'}</span>
                  <Name s={e.to} />
                  {e.check?.mentions >= 2 && <span className="chip" style={{ background: '#fff', color: '#975a16', borderColor: '#f6e05e' }}><Repeat size={12} /> {e.check.mentions}회 언급</span>}
                  {e.mutual && <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: '#c53030', fontWeight: 700 }}>중재 대화 우선</span>}
                </div>
                {e.check && (
                  <div style={{ marginTop: '8px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '6px 16px', ...hint }}>
                    <div>• 상대({e.to.realName})도 언급: <b>{e.check.targetMentionsBack ? '예' : '아니오'}</b></div>
                    <div>• 상대가 받은 긍정 지목: <b>{e.check.targetReceived}회</b>{e.check.targetNominatesReporter ? ' · 상대는 이 학생을 긍정 지목함' : ''}</div>
                    <div>• 보고 학생의 관계망: 받은 지목 <b>{e.check.reporterReceived}회</b> · 지목한 친구 <b>{e.check.reporterGivenCount}명</b></div>
                    <div style={{ gridColumn: '1 / -1', color: '#2d3748' }}><Eye size={12} style={{ verticalAlign: '-2px' }} /> {e.check.hints.join(' / ')}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. 반복 호소 */}
      <div style={card}>
        <h3 style={title}><Repeat size={20} color="#975a16" /> 반복 호소 <span style={{ fontSize: '0.85rem', color: 'var(--text-faint)', fontWeight: 'normal' }}>({a.repeated.length}건)</span></h3>
        <p style={sub}>같은 친구를 3회 이상 갈등 상대로 말한 경우입니다. 챗봇은 2회부터 동조하지 않고 학생 자신의 마음과 강점으로 화제를 돌리며, 더 이상 갈등 신호를 쌓지 않습니다. 사실 확인 전 판단을 보류하고, 보고하는 학생에게 "네가 바라는 게 뭐야?"를 물어봐 주세요.</p>
        {a.repeated.length === 0 ? <p style={empty}>반복 호소가 없습니다.</p> : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {a.repeated.map((r, i) => (
              <div key={i} style={{ background: '#fffff0', border: '1px solid #f6e05e', borderRadius: '12px', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}>
                <Name s={r.from} /> <span style={{ color: '#975a16' }}>→</span> <Name s={r.to} /> <b style={{ color: '#975a16' }}>{r.n}회</b>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. 고립 */}
      <div style={card}>
        <h3 style={title}><UserX size={20} color="#805ad5" /> 관계망 미연결 <span style={{ fontSize: '0.85rem', color: 'var(--text-faint)', fontWeight: 'normal' }}>({a.isolated.length}명)</span></h3>
        <p style={sub}>친구를 지목한 적도, 지목받은 적도 없는 학생입니다. 아직 대화가 적어서일 수도 있으니 참여 여부부터 확인하세요.</p>
        {a.isolated.length === 0 ? <p style={empty}>모든 학생이 관계망에 연결되어 있습니다 🎉</p> : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {a.isolated.map(s => (
              <div key={s.id} style={{ background: '#faf5ff', border: '1px solid #e9d8fd', borderRadius: '12px', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Name s={s} /><span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>기분 {s.mood || '?'} · 대화 {(s.sessionDates || []).length || ((s.messages || []).length ? 1 : 0)}일</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. 외로움 */}
      <div style={card}>
        <h3 style={title}><CloudRain size={20} color="#3182ce" /> 외로움 신호 <span style={{ fontSize: '0.85rem', color: 'var(--text-faint)', fontWeight: 'normal' }}>({a.lonely.length}명)</span></h3>
        <p style={sub}>대화에서 외로움·혼자라는 느낌을 표현한 학생입니다. 지목 관계가 있는 친구가 있다면 그 친구와의 접점을 먼저 만들어 주세요.</p>
        {a.lonely.length === 0 ? <p style={empty}>외로움 신호가 없습니다 🎉</p> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {a.lonely.map(l => (
              <div key={l.student.id} style={{ background: '#ebf8ff', border: '1px solid #bee3f8', borderRadius: '12px', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <Name s={l.student} />
                <span style={{ fontSize: '0.85rem', color: '#2b6cb0', fontWeight: 700 }}>신호 {l.count}회</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>받은 지목 {l.received} · 지목한 친구 {l.given}명</span>
                {l.last && <span style={{ marginLeft: 'auto', fontSize: '0.78rem', color: 'var(--text-faint)' }}>최근 {fmt(l.last)}</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      <p style={{ color: 'var(--text-faint)', fontSize: '0.82rem', margin: 0, lineHeight: 1.6 }}>
        💡 갈등이 보고된 두 학생은 [자리 배치]에서 자동으로 떨어뜨려 배치되고, 개별 지도 방향은 [맞춤 처방]에서 SEL 근거와 함께 제안됩니다. 갈등 신호 수집 자체를 끄려면 [챗봇 설정]에서 '긍정 지목만' 모드를 선택하세요.
      </p>
    </div>
  );
};

export default RelationshipWatch;
