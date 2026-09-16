import React, { useMemo, useState } from 'react';
import { Copy, Check, Printer, ShieldCheck, MessageSquareHeart } from 'lucide-react';
import { buildConsultCards } from '../utils/consultPrep';
import { PERIOD_PRESETS, periodRange } from '../utils/growth';

/**
 * 학부모 상담 준비 카드 — 상담 주간 학생 1명당 30초. 교사 열람 전용, 인쇄는 교사 자료로만.
 */
const ConsultPrep = ({ studentsData = [], gradeLabel, className }) => {
  const [periodKey, setPeriodKey] = useState('semester');
  const period = periodRange(PERIOD_PRESETS.some(p => p.key === periodKey) ? periodKey : PERIOD_PRESETS[PERIOD_PRESETS.length - 1].key);
  const cards = useMemo(() => buildConsultCards(studentsData, { gradeLabel, className, from: period.from, to: period.to }), [studentsData, gradeLabel, className, period.from, period.to]);
  const [sel, setSel] = useState('');
  const [copied, setCopied] = useState('');
  const card = cards.find(c => c.id === sel) || cards[0];
  const copy = async (text, key) => { try { await navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied(''), 1800); } catch { /* ignore */ } };
  const printAll = () => {
    const w = window.open('', '_blank');
    if (!w) return;
    const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;');
    w.document.write(`<html><head><title>학부모 상담 준비 카드 — ${esc(className)}</title><style>body{font-family:'Malgun Gothic',sans-serif;font-size:12px;color:#222;margin:18mm}pre{white-space:pre-wrap;font-family:inherit;border:1px solid #cbd5e1;border-radius:8px;padding:10px 12px;margin:0 0 10px;page-break-inside:avoid}.hd{font-size:11px;color:#718096;margin-bottom:12px}</style></head><body><div class="hd">교사 열람 전용 · 학생 개인 신호 포함 · 상담 후 파쇄 · ${esc(className)} · ${new Date().toLocaleDateString('ko-KR')}</div>${cards.map(c => `<pre>${esc(c.text)}</pre>`).join('')}</body></html>`);
    w.document.close(); w.focus(); setTimeout(() => w.print(), 300);
  };

  return (
    <section className="cp-wrap">
      <div className="cp-head">
        <div>
          <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#2d3748', display: 'flex', alignItems: 'center', gap: '8px' }}><MessageSquareHeart size={18} color="#805ad5" /> 학부모 상담 준비 카드 <span className="cp-badge"><ShieldCheck size={12} /> 교사 열람용</span></h3>
          <p style={{ margin: '4px 0 0', color: '#718096', fontSize: '0.86rem', lineHeight: 1.55 }}>상담 주간에 학생 1명당 30초. <b>강점 먼저</b>, 숫자는 우리 아이 것만, 다른 학생 이름·대화 내용·판정어는 들어가지 않습니다. "함께 지켜볼 점"은 선생님이 말할지 결정하는 메모입니다.</p>
        </div>
        <div className="cp-tools">
          <select value={periodKey} onChange={e => setPeriodKey(e.target.value)} className="cp-select">
            {PERIOD_PRESETS.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
          </select>
          <button className="btn btn-secondary" style={{ padding: '6px 10px', fontSize: '0.82rem' }} onClick={printAll}><Printer size={14} /> 전체 인쇄</button>
        </div>
      </div>
      <div className="cp-grid">
        <div className="cp-list">
          {cards.map(c => (
            <button key={c.id} className={`cp-item ${card && card.id === c.id ? 'on' : ''}`} onClick={() => setSel(c.id)}>
              <span>{c.student.avatar || '👤'}</span>
              <span className="cp-name">{c.student.realName || c.student.nickname}</span>
              <span className="cp-meta">{c.received > 0 ? `★${c.received}` : '·'}{c.watch.length ? ` · 메모 ${c.watch.length}` : ''}</span>
            </button>
          ))}
          {!cards.length && <div style={{ color: '#a0aec0', fontSize: '0.88rem', padding: '12px' }}>학생 데이터가 없습니다.</div>}
        </div>
        {card && (
          <div className="cp-card">
            <div className="cp-card-head">
              <span style={{ fontWeight: 800, color: '#2d3748' }}>{card.student.avatar || ''} {card.student.realName || card.student.nickname}</span>
              <span className="cp-chips">
                <span className="chip">대화 {card.days}일</span>
                <span className="chip">받은 지목 {card.received}</span>
                {card.mutual > 0 && <span className="chip">단짝 {card.mutual}</span>}
                {card.missions > 0 && <span className="chip">미션 {card.missions}</span>}
              </span>
              <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '0.82rem', marginLeft: 'auto' }} onClick={() => copy(card.text, card.id)}>{copied === card.id ? <Check size={14} /> : <Copy size={14} />} {copied === card.id ? '복사됨' : '복사'}</button>
            </div>
            <div className="cp-sec good"><div className="cp-sec-t">먼저 말할 강점</div>{card.strengths.map((t, i) => <div key={i} className="cp-line">• {t}</div>)}</div>
            <div className={`cp-sec ${card.watch.length ? 'watch' : 'ok'}`}><div className="cp-sec-t">함께 지켜볼 점 <span className="cp-sub">말할지 선생님이 결정</span></div>{card.watch.length ? card.watch.map((t, i) => <div key={i} className="cp-line">• {t}</div>) : <div className="cp-line">• 특별한 신호 없음. "잘 지내고 있어요"를 위 강점과 함께 근거 있게 말하세요.</div>}</div>
            <div className="cp-sec ask"><div className="cp-sec-t">가정에 부탁드릴 한 가지</div><div className="cp-line">• "{card.suggest.text}" — {card.suggest.why}</div></div>
            <div className="cp-no">하지 않을 것: 다른 학생 이름·다른 학생이 한 말 언급 / 나무와의 대화 인용(저장되지 않음) / 등급·점수·"위험" 같은 판정어</div>
          </div>
        )}
      </div>
    </section>
  );
};

export default ConsultPrep;
