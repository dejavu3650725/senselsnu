import React, { useMemo } from 'react';
import CurriculumEvidence from './CurriculumEvidence';
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

const RelationshipWatch = ({ studentsData = [], teacherProfile }) => {
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
  const Sec = ({ icon, title, count, unit = '건', sub, children }) => (
    <section className="rw-sec">
      <div className="rw-sec-head">
        <h3>{icon} {title} <span className="rw-cnt">{count}{unit}</span></h3>
        {sub && <span className="rw-sub" title={sub}>{sub}</span>}
      </div>
      {children}
    </section>
  );

  return (
    <div data-tour="page" className="glass-card rw-page">
      <div className="rw-head">
        <div className="rw-title"><HeartHandshake size={20} color="#e53e3e" /> 관계 신호</div>
        <div className="rw-stats">
          <span className="rw-stat orange">갈등 보고 <b>{a.edges.length}</b></span>
          <span className="rw-stat yellow">반복 호소 <b>{a.repeated.length}</b></span>
          <span className="rw-stat purple">미연결 <b>{a.isolated.length}</b></span>
          <span className="rw-stat blue">외로움 <b>{a.lonely.length}</b></span>
        </div>
      </div>
      <div className="rw-notice"><Info size={14} /> 모두 <b>학생이 챗봇에게 말한 내용</b>입니다. 센셀은 사실을 판정하지 않습니다 — 교차 정보를 보고 직접 확인해 주세요.</div>
      <CurriculumEvidence activity="conflictHandling" teacherProfile={teacherProfile} seoulAreas={['대인관계']} compact />

      <Sec icon={<AlertTriangle size={17} color="#dd6b20" />} title="갈등 보고" count={a.edges.length} sub="상호 갈등은 중재 대화 우선, 일방 보고는 교차 정보로 판단">
        {a.edges.length === 0 ? <p className="rw-empty">보고된 갈등이 없습니다 🎉</p> : (
          <div className="rw-list">
            {a.edges.map((e, i) => (
              <div key={i} className={`rw-conf ${e.mutual ? 'mutual' : ''}`}>
                <div className="rw-conf-row">
                  <Name s={e.from} />
                  <span className="rw-arrow">{e.mutual ? '⇄' : '→'}</span>
                  <Name s={e.to} />
                  {e.mutual && <span className="rw-tag red">서로 언급 · 중재 우선</span>}
                  {e.check?.mentions >= 2 && <span className="rw-tag yellow"><Repeat size={11} /> {e.check.mentions}회 언급</span>}
                  {e.check && (
                    <span className="rw-facts">
                      <span>상대도 언급 <b>{e.check.targetMentionsBack ? '예' : '아니오'}</b></span>
                      <span>상대 받은 지목 <b>{e.check.targetReceived}</b>{e.check.targetNominatesReporter ? ' · 상대→보고자 긍정 지목' : ''}</span>
                      <span>보고자 받은 지목 <b>{e.check.reporterReceived}</b> · 지목 <b>{e.check.reporterGivenCount}</b>명</span>
                    </span>
                  )}
                </div>
                {e.check?.hints?.length > 0 && <div className="rw-hint"><Eye size={12} /> {e.check.hints.join(' / ')}</div>}
              </div>
            ))}
          </div>
        )}
      </Sec>

      <Sec icon={<Repeat size={17} color="#975a16" />} title="반복 호소" count={a.repeated.length} sub="같은 친구 3회 이상 — 판단 보류, 보고 학생에게 '네가 바라는 건?'">
        {a.repeated.length === 0 ? <p className="rw-empty">반복 호소가 없습니다.</p> : (
          <div className="rw-chips">
            {a.repeated.map((r, i) => <div key={i} className="rw-chip yellow"><Name s={r.from} /><span className="rw-arrow">→</span><Name s={r.to} /><b>{r.n}회</b></div>)}
          </div>
        )}
      </Sec>

      <Sec icon={<UserX size={17} color="#805ad5" />} title="관계망 미연결" count={a.isolated.length} unit="명" sub="지목한 적도 받은 적도 없음 — 참여 여부부터 확인">
        {a.isolated.length === 0 ? <p className="rw-empty">모든 학생이 관계망에 연결되어 있습니다 🎉</p> : (
          <div className="rw-chips">
            {a.isolated.map(s => <div key={s.id} className="rw-chip purple"><Name s={s} /><span className="rw-meta">기분 {s.mood || '?'} · 대화 {(s.sessionDates || []).length || ((s.messages || []).length ? 1 : 0)}일</span></div>)}
          </div>
        )}
      </Sec>

      <Sec icon={<CloudRain size={17} color="#3182ce" />} title="외로움 신호" count={a.lonely.length} unit="명" sub="지목 관계가 있는 친구와의 접점을 먼저">
        {a.lonely.length === 0 ? <p className="rw-empty">외로움 신호가 없습니다 🎉</p> : (
          <div className="rw-chips">
            {a.lonely.map(l => <div key={l.student.id} className="rw-chip blue"><Name s={l.student} /><b>{l.count}회</b><span className="rw-meta">받은 지목 {l.received} · 지목 {l.given}명{l.last ? ` · 최근 ${fmt(l.last)}` : ''}</span></div>)}
          </div>
        )}
      </Sec>

      <p className="rw-foot">💡 갈등이 보고된 두 학생은 [자리 배치]에서 자동으로 떨어지고, 개별 지도는 [맞춤 처방]에서 근거와 함께 제안됩니다. 갈등 수집을 끄려면 [챗봇 설정] '긍정 지목만'.</p>
    </div>
  );
};

export default RelationshipWatch;
