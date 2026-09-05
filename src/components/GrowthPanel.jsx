import React from 'react';
import { X, Sprout, CheckCircle2 } from 'lucide-react';
import { skillsForLevel, monthlySkillCounts, badgeFor } from '../utils/growth';

const AREA_COLOR = { '자기': '#805ad5', '대인관계': '#dd6b20', '공동체': '#d53f8c', '마음건강': '#c53030' };

/**
 * 학생용 성장 기록
 * - compact: 채팅 상단 띠 (이번 주 미션 + 했어요)
 * - open: 전체 모달 (이번 달 연습한 사회정서기술 · 배지 · 미션)
 * 여기 표시되는 것은 학생 자신의 기록뿐이며, 다른 학생과 비교하지 않는다.
 */
const GrowthPanel = ({ gradeLabel, skillLog = [], mission, missionDone, onMissionDone, open, onClose, toast, compact }) => {
  const counts = monthlySkillCounts(skillLog);
  const all = skillsForLevel(gradeLabel);
  const countOf = (skill) => (counts.find(c => c.skill === skill) || {}).count || 0;
  const month = new Date().getMonth() + 1;

  return (
    <>
      {compact && mission && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 16px', background: missionDone ? '#f0fff4' : '#fffbea', borderBottom: '1px solid var(--border)', fontSize: '0.85rem', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 800, color: missionDone ? '#2f855a' : '#b7791f', whiteSpace: 'nowrap' }}>{missionDone ? '✅ 이번 주 미션 완료' : '🎯 이번 주 미션'}</span>
          <span style={{ flex: 1, minWidth: '160px', color: 'var(--text-main)', lineHeight: 1.4 }}>{mission.text}</span>
          {!missionDone && (
            <button onClick={onMissionDone} className="btn btn-primary" style={{ padding: '5px 12px', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>했어요</button>
          )}
        </div>
      )}
      {toast && (
        <div role="status" style={{ position: 'fixed', top: '72px', left: '50%', transform: 'translateX(-50%)', background: '#2d3748', color: 'white', padding: '10px 16px', borderRadius: '999px', fontSize: '0.9rem', boxShadow: 'var(--shadow-lg)', zIndex: 1500, animation: 'slideUp 0.3s ease-out' }}>{toast}</div>
      )}

      {open && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(17,24,39,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100 }} onClick={onClose}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', padding: '24px', borderRadius: '24px', width: '94%', maxWidth: '560px', maxHeight: '88vh', overflowY: 'auto', boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <Sprout size={22} color="#38a169" />
              <h3 style={{ margin: 0, fontSize: '1.25rem' }}>나의 성장 기록</h3>
              <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer' }}><X size={22} color="#a0aec0" /></button>
            </div>
            <p style={{ margin: '0 0 14px', color: 'var(--text-muted)', fontSize: '0.88rem', lineHeight: 1.5 }}>
              {month}월에 나무와 이야기하면서 네가 <b>직접 해 보인</b> 사회정서기술이야. 이건 너만 보는 기록이고, 다른 친구와 비교하지 않아. 🌱 1번 → 🌿 3번 → 🌳 6번
            </p>

            {mission && (
              <div style={{ background: missionDone ? '#f0fff4' : '#fffbea', border: `1px solid ${missionDone ? '#c6f6d5' : '#f6e05e'}`, borderRadius: '14px', padding: '12px 14px', marginBottom: '16px' }}>
                <div style={{ fontWeight: 800, fontSize: '0.9rem', marginBottom: '4px' }}>{missionDone ? '✅ 이번 주 미션 완료!' : '🎯 이번 주 미션'} <span style={{ fontWeight: 500, color: 'var(--text-muted)', fontSize: '0.78rem' }}>· {mission.skills[0]}</span></div>
                <div style={{ fontSize: '0.95rem', lineHeight: 1.5 }}>{mission.text}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>{mission.why}</div>
                {!missionDone && <button onClick={onMissionDone} className="btn btn-primary" style={{ marginTop: '10px', padding: '8px 14px', fontSize: '0.88rem' }}><CheckCircle2 size={16} /> 했어요</button>}
              </div>
            )}

            {counts.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '18px 8px', fontSize: '0.92rem', lineHeight: 1.6 }}>
                아직 이번 달 기록이 없어. 나무와 이야기하면서 감정에 이름을 붙이거나, 친구 입장을 말해 보거나, 도움을 청해 보면 여기 새싹이 돋아나. 🌱
              </div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
                {counts.map(({ skill, count }) => {
                  const b = badgeFor(count);
                  const area = (all.find(s => s.skill === skill) || {}).area;
                  return (
                    <div key={skill} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'white', border: `1px solid ${AREA_COLOR[area] || '#cbd5e1'}55`, borderLeft: `4px solid ${AREA_COLOR[area] || '#cbd5e1'}`, borderRadius: '12px', padding: '8px 12px' }}>
                      <span style={{ fontSize: '1.4rem' }}>{b.icon}</span>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>{skill}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{area} · {count}번 · {b.label}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <details style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              <summary style={{ cursor: 'pointer', fontWeight: 700 }}>우리 학년이 배우는 사회정서기술 전체 ({all.length}개)</summary>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                {all.map(({ skill, area }) => (
                  <span key={skill} style={{ fontSize: '0.78rem', border: '1px solid var(--border)', borderRadius: '999px', padding: '3px 10px', color: countOf(skill) ? AREA_COLOR[area] : 'var(--text-faint)', background: countOf(skill) ? `${AREA_COLOR[area]}12` : 'transparent' }}>
                    {badgeFor(countOf(skill)).icon} {skill}
                  </span>
                ))}
              </div>
            </details>
          </div>
        </div>
      )}
    </>
  );
};

export default GrowthPanel;
