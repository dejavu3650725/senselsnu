import React, { useMemo, useState } from 'react';
import { NotebookPen, Copy, Check, FileDown, Info } from 'lucide-react';
import { assessClass } from '../utils/studentSignals';
import { prescriptionToText } from './CustomPrescription';
import { fixNameJosa } from '../utils/studentSignals';
import { seoulGradeLabel, standardByCode } from '../utils/seoulSel';
import { moralByCode } from '../utils/moralCurriculum';

const fmt = (iso) => { try { return new Date(iso).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch { return iso; } };

/**
 * 기록 — 상담·조치 기록 초안 (교사 전용)
 * 위기 알림·확인/조치 메모·맞춤 처방·미션·기술 연습을 학교 상담 일지 형식의 텍스트로 만든다.
 * 생활기록부 개인 서술은 만들지 않는다(AI 작성 금지 지침). 이 초안은 담임의 상담 기록·학급 운영 기록용이다.
 */
export const buildCounselLog = (student, { gradeLabel, className = '', teacherName = '', all = [] } = {}) => {
  const s = student;
  const lines = [];
  lines.push(`[상담·조치 기록 초안] ${className} ${s.realName || s.nickname}`);
  lines.push(`작성: ${teacherName || '담임교사'} · ${new Date().toLocaleDateString('ko-KR')} · 근거: 센셀 관계 신호·처방 기록 (교사 열람 전용)`);
  lines.push('');
  const alerts = (s.alerts || []).slice().sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp)));
  if (alerts.length) {
    lines.push('■ 위기 신호 및 확인');
    alerts.forEach(a => {
      const act = (s.alertActions || []).find(x => x.alertTimestamp === a.timestamp) || (s.alertActions || []).find(x => x.ackedAt && x.ackedAt >= a.timestamp);
      lines.push(`- ${fmt(a.timestamp)} 신호: ${a.reason}`);
      lines.push(`  확인·조치: ${act ? `${fmt(act.ackedAt)} ${act.note}` : '(미확인)'}`);
    });
    lines.push('');
  }
  const mentions = s.conflictMentions || [];
  if (mentions.length) {
    const byT = mentions.reduce((m, x) => { m[x.target] = (m[x.target] || 0) + 1; return m; }, {});
    lines.push('■ 관계 신호(학생 보고 기준, 사실 여부 미판정)');
    lines.push(`- 갈등 언급: ${Object.entries(byT).map(([t, n]) => `${t} ${n}회`).join(', ')} · 외로움 표현 ${(s.lonelySignals || []).length}회 · 받은 긍정 지목은 학급 관계망 참고`);
    lines.push('');
  }
  const p = s.aiPrescriptionData;
  if (p) {
    lines.push(`■ 맞춤 지도 계획 (${p.generatedAt ? new Date(p.generatedAt).toLocaleDateString('ko-KR') : ''})`);
    lines.push(fixNameJosa(prescriptionToText(p), (all || []).map(x => x.realName || x.nickname)));
    const codes = [...(p.standards || []).map(c => { const st = standardByCode(c); return st ? `[${c}] ${st.text}` : `[${c}]`; }), ...(p.moralStandards || []).map(c => { const st = moralByCode(c); return st ? `[${c}] ${st.text}` : `[${c}]`; })];
    if (codes.length) { lines.push('  근거 성취기준:'); codes.forEach(c => lines.push(`  · ${c}`)); }
    lines.push('');
  }
  const skills = (s.skillLog || []).reduce((m, e) => { m[e.skill] = (m[e.skill] || 0) + 1; return m; }, {});
  const missions = (s.missions || []).length;
  if (Object.keys(skills).length || missions) {
    lines.push('■ 학생의 연습·참여');
    if (Object.keys(skills).length) lines.push(`- 연습한 사회정서기술: ${Object.entries(skills).map(([k, n]) => `${k} ${n}회`).join(', ')}`);
    if (missions) lines.push(`- 주간 친절 미션 완료 ${missions}회`);
    lines.push('');
  }
  lines.push('■ 후속 계획');
  lines.push('- (1주 후 확인 지표·면담 계획을 적어 주세요)');
  lines.push('');
  lines.push('※ 이 초안은 담임의 상담·조치 기록용입니다. 학생 보고 신호는 사실로 단정하지 않으며, 생활기록부 서술에는 그대로 옮기지 않습니다.');
  return lines.join('\n');
};

const CounselLog = ({ studentsData = [], teacherProfile, classLabel }) => {
  const gradeLabel = seoulGradeLabel(teacherProfile?.selLevel, teacherProfile?.gradeYear);
  const className = classLabel || teacherProfile?.className || '';
  const teacherName = teacherProfile?.teacherName ? `${teacherProfile.teacherName} 선생님` : '';
  const { results } = useMemo(() => assessClass(studentsData), [studentsData]);
  const withRecords = results.filter(r => (r.student.alerts || []).length || r.student.aiPrescriptionData || (r.student.alertActions || []).length);
  const [selectedId, setSelectedId] = useState('');
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const sel = results.find(r => r.id === selectedId);
  const text = sel ? buildCounselLog(sel.student, { gradeLabel, className, teacherName, all: studentsData }) : '';
  const copy = async () => { try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* ignore */ } };
  const downloadAll = async () => {
    setBusy(true);
    try {
      const D = await import('docx');
      const list = (withRecords.length ? withRecords : results);
      const children = [];
      list.forEach((r, i) => {
        const t = buildCounselLog(r.student, { gradeLabel, className, teacherName, all: studentsData });
        t.split('\n').forEach((ln, j) => children.push(new D.Paragraph({ pageBreakBefore: i > 0 && j === 0, spacing: { after: 60 }, children: [new D.TextRun({ text: ln, bold: j === 0 || ln.startsWith('■'), size: j === 0 ? 26 : 20 })] })));
      });
      const doc = new D.Document({ sections: [{ children }] });
      const blob = await D.Packer.toBlob(doc);
      const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `상담조치기록_초안_${className || '학급'}.docx`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (e) { console.error(e); alert('문서 생성에 실패했습니다.'); } finally { setBusy(false); }
  };

  return (
    <div data-tour="page" className="glass-card" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ background: 'var(--primary-light)', padding: '12px', borderRadius: '16px' }}><NotebookPen size={26} color="var(--primary-color)" /></div>
        <div>
          <h2 style={{ margin: 0, color: '#2d3748', fontSize: '1.7rem' }}>기록</h2>
          <div style={{ color: '#718096', fontSize: '0.9rem' }}>상담·조치 기록 초안 — 위기 알림·확인 메모·맞춤 지도·연습 기록을 상담 일지 형식으로</div>
        </div>
        <button className="btn btn-secondary" style={{ marginLeft: 'auto' }} disabled={busy || !results.length} onClick={downloadAll}><FileDown size={16} /> {busy ? '만드는 중…' : `기록 있는 학생 전체 (.docx, ${withRecords.length}명)`}</button>
      </div>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', background: '#fffbea', border: '1px solid #f6e05e', borderRadius: '12px', padding: '10px 14px', fontSize: '0.84rem', color: '#744210', lineHeight: 1.55 }}>
        <Info size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
        <span>담임의 상담·조치 기록과 학급 운영 기록용 초안입니다. 생활기록부 개인 서술은 만들지 않으며(AI 작성 금지 지침), 학생이 보고한 신호는 사실로 단정하지 않는 문장으로 적혀 있습니다. 이 화면은 교사만 봅니다.</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 280px) 1fr', gap: '16px', alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '520px', overflowY: 'auto' }}>
          {results.map(r => {
            const n = (r.student.alerts || []).length; const hasP = !!r.student.aiPrescriptionData;
            return (
              <button key={r.id} onClick={() => setSelectedId(r.id)} style={{ textAlign: 'left', background: selectedId === r.id ? 'var(--primary-light)' : 'white', border: `1px solid ${selectedId === r.id ? 'var(--primary-color)' : '#e2e8f0'}`, borderRadius: '12px', padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.1rem' }}>{r.student.avatar || '👤'}</span>
                <span style={{ fontWeight: 700, color: '#2d3748', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.student.realName || r.student.nickname}</span>
                <span style={{ fontSize: '0.7rem', color: '#718096', whiteSpace: 'nowrap' }}>{n ? `알림 ${n}` : ''}{hasP ? ' · 처방' : ''}</span>
              </button>
            );
          })}
        </div>
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '16px', minWidth: 0 }}>
          {!sel ? <div style={{ color: '#a0aec0', textAlign: 'center', padding: '30px' }}>학생을 선택하면 기록 초안이 만들어집니다.</div> : (
            <>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
                <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '0.82rem' }} onClick={copy}>{copied ? <Check size={14} /> : <Copy size={14} />} {copied ? '복사됨' : '복사'}</button>
              </div>
              <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: '0.88rem', lineHeight: 1.6, color: '#2d3748', margin: 0 }}>{text}</pre>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CounselLog;
