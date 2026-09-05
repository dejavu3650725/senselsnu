import React, { useEffect, useLayoutEffect, useState, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';

/**
 * 1분 체험 — 대시보드 위에서 실제 화면을 순서대로 비춰 주는 인터랙티브 투어.
 * 사용 매뉴얼의 흐름(오늘 피드 → 관계망 → 개입 → 관계 신호 → 자리 배치 → 처방 → 가정 → 서류함·기록)을 그대로 따른다.
 * 각 단계는 메뉴를 실제로 전환하고, data-tour 앵커를 스포트라이트로 비춘다. 데모 학급(SENSEL)에서 가장 잘 보인다.
 */
export const TOUR_STEPS = [
  { menu: '대시보드', target: 'today', title: '① 월요일 아침 1분 — 오늘 피드', body: '오늘 챙길 학생 한 명(관계 신호 기반, 선생님만), 오늘 아침 활동 카드(TV에 띄우기), 알림장 한 줄(복사). 매일 아침 여기만 보면 됩니다.' },
  { menu: '대시보드', target: 'sociogram', title: '② 학급 관계망 — 소시오그램', body: '학생들이 나무와 이야기하며 남긴 긍정 지목이 별자리로 이어집니다. 받은 지목이 많을수록 큰 별, 받은 지목 0은 고립. 이 화면은 선생님만 봅니다.' },
  { menu: '대시보드', target: 'intervention', title: '③ 개입 및 처방 — 오늘 할 수 있는 것', body: '위기·갈등·외로움·고립을 점수화해 긴급/높음/관심으로 정렬하고, 규칙 기반 "바로 할 수 있는 것"을 먼저 보여 줍니다. 긴급 알림은 5개 중대 범주만, 확인하면 조치 메모가 남습니다.' },
  { menu: '관계 신호', target: 'page', title: '④ 관계 신호 — 학생 보고 기준', body: '모든 갈등은 "학생이 말한 것"으로 표시되고, 상대도 말했는지·받은 지목 수·양쪽 관계망이 나란히 붙습니다. 같은 상대 3회 이상은 "반복 호소"로 따로 분류됩니다. 센셀은 사실을 판정하지 않습니다.' },
  { menu: '자리 배치', target: 'page', title: '⑤ 자리 배치 — 왜 이 자리인지 설명할 수 있게', body: '원칙을 체크하고 [배치 제안 만들기]를 누르면 규칙 엔진이 수천 번 좌석을 바꿔 최적안을 찾습니다. 100점 점수·원칙별 점검표·학생별 근거 한 줄. 드래그로 고치면 점검표가 실시간 갱신됩니다.' },
  { menu: '맞춤 처방', target: 'page', title: '⑥ 맞춤 처방 — 학생마다 다르게, 근거와 함께', body: '익명 프로필로 관찰 요약 → 가설 → 강점 → 실천 3가지 → 1주 후 확인 지표를 만들고, 실천마다 서울 성취기준·도덕과 코드를 붙입니다. AI에는 실명이 가지 않습니다.' },
  { menu: '가정 연계', target: 'page', title: '⑦ 가정 연계 — 보내는 시점은 선생님이', body: '가정통신문 6종, 학부모 대화 카드, 학급 리포트 발행(기간 선택) → 알림톡·문자 문구 복사 → "집에서 해봤어요" 익명 회신. 가정 문서에는 학생 개인 신호가 들어가지 않습니다.' },
  { menu: '기록', target: 'page', title: '⑧ 기록 — 상담·조치 기록 초안', body: '위기 알림+조치 메모, 관계 신호, 맞춤 지도+근거 성취기준, 연습·미션을 상담 일지 형식으로 만들어 복사·.docx. 생활기록부 서술은 만들지 않습니다.' },
  { menu: '서류함', target: 'page', title: '⑨ 서류함 — 학교 제출용', body: '학운위 심의 서식·보호자 동의 안내 .docx(한글 호환), 전자 동의 링크와 제출 현황, 도입 절차 4단계 점검. 학교 절차는 여기서 끝납니다. ' },
  { menu: '대시보드', target: 'none', title: '⑩ 상담·특수 선생님과 함께 볼 때', body: '전문가는 "무엇을 못 하는가"부터 봅니다. 먼저 말씀하세요 — ① 위기 알림은 5개 중대 범주만 ② 등급·처방은 진단이 아니라 정렬과 초안 ③ 갈등 신호는 학생 보고 기준. 그다음 지키는 것 — ④ 대화 원문은 어른이 볼 수 없음(스위치 없음) ⑤ 학생별 자유 대화 모드 ⑥ 상담·조치 기록 초안. 시연은 데모 학급으로만. 체험 끝!' },
];

const QuickTour = ({ open, onClose, setActiveMenu }) => {
  const [idx, setIdx] = useState(0);
  const [rect, setRect] = useState(null);
  const step = TOUR_STEPS[idx];

  const measure = useCallback(() => {
    if (!open) return;
    const el = document.querySelector(`[data-tour="${step.target}"]`);
    if (!el) { setRect(null); return; }
    const r = el.getBoundingClientRect();
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, [open, step]);

  const finish = useCallback(() => { setActiveMenu('대시보드'); try { window.scrollTo({ top: 0, behavior: 'smooth' }); document.querySelector('.dashboard-content')?.scrollTo({ top: 0, behavior: 'smooth' }); } catch { /* ignore */ } onClose(); }, [setActiveMenu, onClose]);

  useEffect(() => { if (open) setIdx(0); }, [open]);

  useLayoutEffect(() => {
    if (!open) return;
    setActiveMenu(step.menu);
    setRect(null);
    let cancelled = false;
    const t = setTimeout(() => {
      if (cancelled) return;
      const el = document.querySelector(`[data-tour="${step.target}"]`);
      if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      setTimeout(() => { if (!cancelled) measure(); }, 420);
    }, 120);
    return () => { cancelled = true; clearTimeout(t); };
  }, [open, idx]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') finish(); if (e.key === 'ArrowRight') setIdx(i => Math.min(TOUR_STEPS.length - 1, i + 1)); if (e.key === 'ArrowLeft') setIdx(i => Math.max(0, i - 1)); };
    window.addEventListener('keydown', onKey); window.addEventListener('resize', measure); window.addEventListener('scroll', measure, true);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('resize', measure); window.removeEventListener('scroll', measure, true); };
  }, [open, measure, finish]);

  if (!open) return null;
  const pad = 8;
  const last = idx === TOUR_STEPS.length - 1;
  const vw = window.innerWidth, vh = window.innerHeight;
  const cardW = Math.min(420, vw - 32);
  let cardStyle;
  if (rect) {
    const below = rect.top + rect.height + pad + 12;
    const spaceBelow = vh - below;
    const left = Math.max(16, Math.min(rect.left, vw - cardW - 16));
    cardStyle = spaceBelow > 220 ? { top: below, left } : { top: Math.max(16, rect.top - pad - 12 - 210), left };
  } else {
    cardStyle = { top: vh / 2 - 110, left: vw / 2 - cardW / 2 };
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 3000 }}>
      {/* 스포트라이트: 앵커 밖을 어둡게 */}
      {rect ? (
        <div style={{ position: 'absolute', top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2, borderRadius: '16px', boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.62)', border: '2px solid #5b8cff', transition: 'all 0.35s ease', pointerEvents: 'none' }} />
      ) : (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(15, 23, 42, 0.62)' }} onClick={finish} />
      )}
      {/* 클릭 차단(앵커 포함) — 투어 중에는 카드 버튼만 동작 */}
      <div style={{ position: 'absolute', inset: 0 }} onClick={() => setIdx(i => (last ? i : i + 1))} />
      <div className="glass-card" style={{ position: 'absolute', width: cardW, background: 'white', borderRadius: '18px', padding: '18px 20px', boxShadow: '0 20px 50px rgba(0,0,0,0.35)', ...cardStyle, transition: 'top 0.3s, left 0.3s' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <span style={{ background: 'var(--primary-light)', color: 'var(--primary-color)', borderRadius: '999px', padding: '2px 10px', fontSize: '0.75rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Sparkles size={12} /> 1분 체험 {idx + 1}/{TOUR_STEPS.length}</span>
          <button onClick={finish} title="닫기 (Esc)" style={{ marginLeft: 'auto', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-faint)', display: 'flex' }}><X size={18} /></button>
        </div>
        <div style={{ fontWeight: 800, fontSize: '1.02rem', color: 'var(--text-strong)', marginBottom: '6px' }}>{step.title}</div>
        <div style={{ fontSize: '0.88rem', color: 'var(--text-main)', lineHeight: 1.55 }}>{step.body}</div>
        <div style={{ display: 'flex', gap: '4px', margin: '12px 0 10px' }}>
          {TOUR_STEPS.map((_, i) => <span key={i} style={{ flex: 1, height: '4px', borderRadius: '2px', background: i <= idx ? 'var(--primary-color)' : 'var(--border)' }} />)}
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button className="btn btn-secondary" style={{ padding: '6px 10px', fontSize: '0.82rem' }} onClick={finish}>건너뛰기</button>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px' }}>
            <button className="btn btn-secondary" disabled={idx === 0} style={{ padding: '6px 10px', fontSize: '0.82rem' }} onClick={() => setIdx(i => Math.max(0, i - 1))}><ChevronLeft size={14} /> 이전</button>
            <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '0.82rem' }} onClick={() => (last ? finish() : setIdx(i => i + 1))}>{last ? '체험 끝내기' : <>다음 <ChevronRight size={14} /></>}</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuickTour;
