import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutGrid, Sparkles, Printer, ArrowLeft, RefreshCw, Info } from 'lucide-react';
import { generateSeating, scoreFromChecks, DEFAULT_POLICY, POLICY_LABELS } from '../utils/seatingEngine';
import CurriculumEvidence from '../components/CurriculumEvidence';

/**
 * 로그인 없는 자리 배치 (/seating)
 * 이름만 붙여넣으면 남녀 짝꿍·갈등 분리·근거 점검표까지 나온다. 아무것도 저장하지 않는다(브라우저 안에서만 계산).
 * 관계 데이터(지목·갈등)는 교사가 직접 적은 것만 쓴다.
 */
const parseRoster = (text) => {
  const out = [];
  text.split(/\n|,|;/).map(s => s.trim()).filter(Boolean).forEach((line, i) => {
    const m = line.match(/^(.+?)[\s/]*(남|여|M|F|m|f)?\s*$/);
    const name = (m ? m[1] : line).replace(/^\d+[.)]?\s*/, '').trim();
    const g = m && m[2] ? (/[남Mm]/.test(m[2]) ? '남' : '여') : (i % 2 === 0 ? '남' : '여');
    if (name) out.push({ id: `s${i + 1}`, realName: name, nickname: name, gender: g, mood: '보통', nominations: [], conflicts: [], lonelySignals: [], alerts: [] });
  });
  return out;
};
const parsePairs = (text) => text.split(/\n|,|;/).map(s => s.trim()).filter(Boolean).map(l => l.split(/[-–~]/).map(x => x.trim())).filter(p => p.length === 2);

const PublicSeating = () => {
  const navigate = useNavigate();
  const [roster, setRoster] = useState('');
  const [apart, setApart] = useState('');
  const [together, setTogether] = useState('');
  const [front, setFront] = useState('');
  const [rows, setRows] = useState(5);
  const [cols, setCols] = useState(6);
  const [policy, setPolicy] = useState(DEFAULT_POLICY);
  const [result, setResult] = useState(null);
  const [seed, setSeed] = useState(1);

  const students = useMemo(() => {
    const list = parseRoster(roster);
    const byName = Object.fromEntries(list.map(s => [s.realName, s]));
    parsePairs(apart).forEach(([a, b]) => { if (byName[a] && byName[b]) { byName[a].conflicts.push(b); byName[b].conflicts.push(a); } });
    parsePairs(together).forEach(([a, b]) => { if (byName[a] && byName[b]) { byName[a].nominations.push(b); byName[b].nominations.push(a); } });
    front.split(/\n|,|;/).map(s => s.trim()).filter(Boolean).forEach(n => { if (byName[n]) byName[n].mood = '힘듦'; });
    return list;
  }, [roster, apart, together, front]);

  const run = () => {
    if (students.length < 2) return;
    const need = students.length;
    let r = rows, c = cols;
    if (r * c < need || r * c > need * 1.6) { c = Math.max(2, cols); r = Math.ceil(need / c); setRows(r); }
    const hasRel = students.some(st => st.nominations.length);
    const pol = { ...policy, supporterForIsolated: hasRel, mutualNear: hasRel, avoidPreviousDeskmate: false };
    const res = generateSeating({ rows: r, cols: c, studentsData: students, policy: pol, iterations: 6000, seed: seed * 7919 + need });
    const score = scoreFromChecks(res.checks);
    if (!hasRel) { delete res.checks.isolatedSupported; delete res.checks.mutualNear; }
    delete res.checks.repeatedDeskmates;
    setResult({ ...res, rows: r, cols: c, score });
    setSeed(s => s + 1);
  };
  const nameOf = (id) => students.find(s => s.id === id);

  return (
    <div className="consent-page" style={{ maxWidth: '1100px' }}>
      <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px', flexWrap: 'wrap' }}>
        <button className="btn btn-secondary" onClick={() => navigate('/teachers')}><ArrowLeft size={16} /> 센셀 홈</button>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          {result && <button className="btn btn-secondary" onClick={() => window.print()}><Printer size={16} /> 인쇄</button>}
        </div>
      </div>
      <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
        <div style={{ background: 'var(--primary-light)', padding: '12px', borderRadius: '16px' }}><LayoutGrid size={26} color="var(--primary-color)" /></div>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem' }}>1분 자리 배치 — 로그인 없이</h1>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>이름을 붙여넣으면 남녀 짝꿍·떨어뜨릴 짝·앞줄 배치까지 근거와 함께 만듭니다. 아무것도 저장하지 않습니다.</div>
        </div>
      </div>
      <div className="no-print" style={{ marginBottom: '14px' }}><CurriculumEvidence activity="seatingFairness" teacherProfile={{ selLevel: 'elementary_high', gradeYear: 5 }} compact /></div>

      <div className="no-print" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px', marginBottom: '14px' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.85rem', fontWeight: 700 }}>학생 명단 <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>한 줄에 한 명 · "이름 남/여" (성별 생략 시 번갈아 배정)</span>
          <textarea value={roster} onChange={e => setRoster(e.target.value)} rows={10} placeholder={'김하늘 여\n이준서 남\n박서연 여\n…'} style={{ fontFamily: 'inherit', padding: '10px', borderRadius: '12px', border: '1px solid var(--border-strong)', resize: 'vertical' }} />
        </label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.85rem', fontWeight: 700 }}>떨어뜨릴 짝 <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>"이름-이름" (옆·앞뒤·대각선 금지)</span>
            <textarea value={apart} onChange={e => setApart(e.target.value)} rows={3} placeholder={'이준서-최민준'} style={{ fontFamily: 'inherit', padding: '8px', borderRadius: '12px', border: '1px solid var(--border-strong)' }} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.85rem', fontWeight: 700 }}>가까이 둘 짝 <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>"이름-이름"</span>
            <textarea value={together} onChange={e => setTogether(e.target.value)} rows={2} placeholder={'박서연-김하늘'} style={{ fontFamily: 'inherit', padding: '8px', borderRadius: '12px', border: '1px solid var(--border-strong)' }} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.85rem', fontWeight: 700 }}>앞줄에 둘 학생 <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>쉼표로 구분</span>
            <input value={front} onChange={e => setFront(e.target.value)} placeholder="정우진, 한지민" style={{ fontFamily: 'inherit', padding: '8px', borderRadius: '12px', border: '1px solid var(--border-strong)' }} />
          </label>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <b>교실</b>
            <input type="number" min={2} max={10} value={rows} onChange={e => setRows(Number(e.target.value))} style={{ width: '60px', padding: '6px', borderRadius: '8px', border: '1px solid var(--border-strong)' }} /> 줄 ×
            <input type="number" min={2} max={10} value={cols} onChange={e => setCols(Number(e.target.value))} style={{ width: '60px', padding: '6px', borderRadius: '8px', border: '1px solid var(--border-strong)' }} /> 칸
            <span style={{ color: 'var(--text-muted)' }}>= {rows * cols}석 / {students.length}명</span>
          </div>
          <label style={{ display: 'flex', gap: '8px', alignItems: 'center' }}><b>짝꿍</b>
            <select value={policy.pairMode} onChange={e => setPolicy(p => ({ ...p, pairMode: e.target.value }))} style={{ padding: '6px', borderRadius: '8px', border: '1px solid var(--border-strong)', fontFamily: 'inherit' }}>
              {Object.entries(POLICY_LABELS.pairMode.options).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          {['strugglingFront', 'spreadGender'].map(k => (
            <label key={k} style={{ display: 'flex', gap: '8px', alignItems: 'center', cursor: 'pointer' }}><input type="checkbox" checked={!!policy[k]} onChange={e => setPolicy(p => ({ ...p, [k]: e.target.checked }))} /> {POLICY_LABELS[k].label}</label>
          ))}
          <button className="btn btn-primary btn-lg" disabled={students.length < 2} onClick={run} style={{ marginTop: '6px' }}><Sparkles size={18} /> {result ? '다시 배치' : '배치 만들기'}</button>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-faint)', lineHeight: 1.5 }}><Info size={12} style={{ verticalAlign: '-2px' }} /> 명단·관계는 이 화면 안에서만 계산되고 어디에도 전송·저장되지 않습니다.</div>
        </div>
      </div>

      {result && (
        <div className="consent-doc" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>배치 결과 <span style={{ color: result.score >= 85 ? '#2f855a' : result.score >= 60 ? '#b7791f' : '#c53030' }}>{result.score}점</span></div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {Object.values(result.checks).filter(c => c.total > 0 || c.status === 'fail').map(c => (
                <span key={c.label} className="chip" style={{ fontSize: '0.75rem', background: c.status === 'fail' ? '#fff5f5' : c.status === 'ok' ? '#f0fff4' : 'var(--surface-3)', color: c.status === 'fail' ? '#c53030' : c.status === 'ok' ? '#2f855a' : 'var(--text-main)' }}>
                  {c.label} {c.goodWhenZero ? `${c.value}건` : `${c.value}/${c.total}`}
                </span>
              ))}
            </div>
            <button className="no-print btn btn-secondary" style={{ marginLeft: 'auto', padding: '6px 10px', fontSize: '0.82rem' }} onClick={run}><RefreshCw size={14} /> 다른 안</button>
          </div>
          <div style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px' }}>▲ 교탁 · 칠판</div>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${result.cols}, minmax(0, 1fr))`, gap: '8px' }}>
            {Array.from({ length: result.rows * result.cols }).map((_, i) => {
              const r = Math.floor(i / result.cols), c = i % result.cols;
              const id = result.seats[`${r}_${c}`];
              const s = id ? nameOf(id) : null;
              const reason = id ? (result.reasons?.get?.(id) || []) : [];
              const bad = reason.some(x => x.kind === 'bad');
              return (
                <div key={i} title={reason.map(x => x.text).join('\n')} style={{ border: `1px solid ${s ? (s.gender === '남' ? '#90cdf4' : '#fbb6ce') : '#e2e8f0'}`, background: s ? (s.gender === '남' ? '#ebf8ff' : '#fff5f7') : '#fafafa', borderRadius: '10px', padding: '10px 4px', textAlign: 'center', fontWeight: 700, fontSize: '0.9rem', minHeight: '44px', color: s ? 'var(--text-strong)' : '#cbd5e1', outline: bad ? '2px solid #fc8181' : 'none', marginLeft: c % 2 === 0 ? '6px' : 0, marginRight: c % 2 === 1 ? '6px' : 0 }}>
                  {s ? s.realName : '·'}
                  {s?.mood === '힘듦' && <div style={{ fontSize: '0.65rem', color: '#c05621', fontWeight: 500 }}>앞줄</div>}
                </div>
              );
            })}
          </div>
          {result.unplaced?.length > 0 && <div style={{ marginTop: '8px', color: '#c53030', fontSize: '0.85rem' }}>자리가 부족해 배치되지 않은 학생: {result.unplaced.map(id => nameOf(id)?.realName).join(', ')}</div>}
          <div className="no-print" style={{ marginTop: '18px', background: '#eef4ff', borderRadius: '14px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '240px', fontSize: '0.9rem', lineHeight: 1.55 }}>
              <b>관계 데이터를 넣으면 더 정확해집니다.</b> 학급을 만들면 아이들이 직접 말한 "함께하고 싶은 친구"와 외로움 신호로 고립 학생 옆에 지지자를 두고, 직전 짝꿍 반복도 피합니다. 관계망은 담임만 봅니다.
            </div>
            <button className="btn btn-primary" onClick={() => navigate('/teachers')}>학급 만들기 (무료)</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicSeating;
