import React from 'react';
import { ArrowRight } from 'lucide-react';
import { assessClass } from '../utils/studentSignals';

const TIER_STYLE = {
  urgent: { label: '긴급', color: '#c53030', bg: '#fff5f5', border: '#feb2b2' },
  high: { label: '높음', color: '#c05621', bg: '#fffaf0', border: '#fbd38d' },
  watch: { label: '관심', color: '#b7791f', bg: '#fffff0', border: '#f6e05e' },
};

const SIGNAL_ICON = {
  alert: '🚨', alertHistory: '🕓', mood: '🔴', mutualConflict: '⚡', conflict: '⚡',
  conflictTarget: '💬', lonely: '💧', isolated: '🏝', lowReceived: '·', repeatedComplaint: '🔁',
};

/**
 * 개입 및 처방 위젯 (대시보드 우측)
 * - 기분 '힘듦'뿐 아니라 위기 알림·갈등·외로움·고립 신호를 종합해 우선순위로 정렬
 * - 규칙 기반 한 줄 개입 힌트 제공, 상세 처방은 [맞춤 처방] 메뉴로 연결
 */
const InterventionTable = ({ studentsData = [], onOpenPrescription }) => {
  const { atRisk } = assessClass(studentsData);
  const counts = atRisk.reduce((acc, r) => { acc[r.tier] = (acc[r.tier] || 0) + 1; return acc; }, {});

  return (
    <div data-tour="intervention" className="glass-card widget intervention-widget" style={{ padding: '20px', gap: '10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
        <div className="widget-title">개입 및 처방 (실시간)</div>
        {atRisk.length > 0 && (
          <div style={{ display: 'flex', gap: '4px', fontSize: '0.72rem', fontWeight: 'bold' }}>
            {['urgent', 'high', 'watch'].filter(t => counts[t]).map(t => (
              <span key={t} style={{ color: TIER_STYLE[t].color, background: TIER_STYLE[t].bg, border: `1px solid ${TIER_STYLE[t].border}`, padding: '2px 8px', borderRadius: '10px' }}>
                {TIER_STYLE[t].label} {counts[t]}
              </span>
            ))}
          </div>
        )}
      </div>
      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        기분·위기 알림·갈등·외로움·고립 신호를 종합한 우선순위입니다.
      </div>

      <div className="intervention-list">
        {atRisk.length === 0 ? (
          <div style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            현재 관심이 필요한 학생이 없습니다. 🟢
          </div>
        ) : (
          atRisk.map(r => {
            const t = TIER_STYLE[r.tier];
            const s = r.student;
            return (
              <div key={r.id} style={{ background: t.bg, border: `1px solid ${t.border}`, borderRadius: '12px', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                  <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>{s.avatar || '👤'}</span>
                  <span style={{ fontWeight: 700, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>
                    {s.realName || s.nickname}
                  </span>
                  {s.nickname && s.nickname !== s.realName && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0, flex: 1 }}>
                      {s.nickname}
                    </span>
                  )}
                  <span style={{ marginLeft: 'auto', fontSize: '0.72rem', fontWeight: 'bold', color: t.color, whiteSpace: 'nowrap' }}>{t.label}</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {r.signals.map((sg, i) => (
                    <span key={i} title={sg.detail} style={{ fontSize: '0.72rem', background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '8px', padding: '2px 7px', color: '#4a5568', whiteSpace: 'nowrap' }}>
                      {SIGNAL_ICON[sg.type] || '•'} {sg.label}
                    </span>
                  ))}
                </div>
                <div style={{ fontSize: '0.82rem', color: '#2d3748', lineHeight: 1.45, wordBreak: 'keep-all' }}>
                  <b style={{ color: t.color }}>추천:</b> {r.quickAction}
                </div>
                {onOpenPrescription && (
                  <button
                    onClick={() => onOpenPrescription(s.id)}
                    style={{ alignSelf: 'flex-end', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--primary-color)', background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px 0' }}
                  >
                    SEL 맞춤 처방 <ArrowRight size={13} />
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default InterventionTable;
