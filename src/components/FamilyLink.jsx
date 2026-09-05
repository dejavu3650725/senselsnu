import React, { useMemo, useState } from 'react';
import { Mail, Printer, Copy, Check, Info, Users, ShieldCheck } from 'lucide-react';
import { assessClass } from '../utils/studentSignals';
import { seoulGradeLabel } from '../utils/seoulSel';
import { LETTER_KINDS, buildLetter, buildParentCard, parentCardToText, buildLessonNotice } from '../utils/familyLink';
import CurriculumEvidence from './CurriculumEvidence';
import { lessonsFor } from '../utils/seoulSel';

/**
 * 가정 연계 (학교–가정)
 * 1) 가정통신문 5종 — 서울시교육청 가정연계 통신문(소개편·4영역)을 학급 정보로 채워 인쇄
 * 2) 학생별 학부모 대화 카드 — 학생 데이터는 넣지 않고, 그 학생의 초점 영역에 맞는 '가정에서 나눌 대화'만 담아 복사
 */
const FamilyLink = ({ studentsData = [], teacherProfile, classCode, classLabel }) => {
  const gradeLabel = seoulGradeLabel(teacherProfile?.selLevel, teacherProfile?.gradeYear);
  const teacherName = teacherProfile?.teacherName ? `${teacherProfile.teacherName} 선생님` : '담임교사';
  const className = classLabel || teacherProfile?.className || '';
  const { results } = useMemo(() => assessClass(studentsData), [studentsData]);
  const [selectedId, setSelectedId] = useState('');
  const [copied, setCopied] = useState(false);
  const [draft, setDraft] = useState('');
  const [lessonIdx, setLessonIdx] = useState('');
  const [noticeDraft, setNoticeDraft] = useState('');
  const [noticeCopied, setNoticeCopied] = useState(false);
  const gradeLessons = lessonsFor(gradeLabel, [], 60);
  const lesson = lessonIdx !== '' ? gradeLessons[Number(lessonIdx)] : null;
  const noticeText = lesson ? buildLessonNotice({ lesson, gradeLabel, className, teacherName }) : '';
  const notice = noticeDraft !== '' ? noticeDraft : noticeText;
  const copyNotice = async () => { try { await navigator.clipboard.writeText(notice); setNoticeCopied(true); setTimeout(() => setNoticeCopied(false), 1800); } catch { /* ignore */ } };

  const selected = results.find(r => r.id === selectedId);
  const card = selected ? buildParentCard({
    focusKeys: (selected.focus || []).map(f => f.key), gradeLabel,
    studentName: selected.student.realName || selected.student.nickname, teacherName, className,
  }) : null;
  const cardText = card ? parentCardToText(card) : '';
  const text = draft !== '' ? draft : cardText;

  const openLetter = (kind) => window.open(`/family/${classCode}/${kind}`, '_blank', 'noopener');
  const preview = (kind) => buildLetter({ kind, gradeLabel, className, teacherName });

  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* ignore */ }
  };

  return (
    <div className="glass-card" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '20px', flex: 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ background: 'var(--primary-light)', padding: '12px', borderRadius: '16px' }}><Mail size={26} color="var(--primary-color)" /></div>
        <div>
          <h2 style={{ margin: 0, color: '#2d3748', fontSize: '1.7rem' }}>가정 연계</h2>
          <div style={{ color: '#718096', fontSize: '0.9rem' }}>서울특별시교육청 사회정서교육 가정연계 자료 · 현재 학년 <b>{gradeLabel}</b>{!teacherProfile?.gradeYear && ' (챗봇 설정에서 학년을 고르면 정확해집니다)'}</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', background: '#f0fff4', border: '1px solid #c6f6d5', borderRadius: '12px', padding: '10px 14px', fontSize: '0.85rem', color: '#276749', lineHeight: 1.55 }}>
        <ShieldCheck size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
        <span>가정으로 나가는 문서에는 학생의 기분·지목·갈등 신호·대화 내용이 <b>절대 포함되지 않습니다</b>. 학부모에게 전하는 것은 "이 시기 학교에서 배우는 것"과 "집에서 함께 나눌 대화"뿐입니다. 개별 상담이 필요한 사안은 학교 절차(담임 상담·Wee클래스·보호자 면담)로 진행하세요.</span>
      </div>
      <CurriculumEvidence activity="familyLink" teacherProfile={teacherProfile} />

      {/* 1. 가정통신문 */}
      <section>
        <h3 style={{ margin: '0 0 4px', fontSize: '1.05rem', color: '#2d3748' }}>1. 가정통신문 (학급 전체 배부)</h3>
        <p style={{ margin: '0 0 12px', color: '#718096', fontSize: '0.88rem', lineHeight: 1.55 }}>
          학기 초에는 <b>소개편</b>을, 영역 수업이 시작될 때는 해당 <b>영역편</b>을 배부하면 학부모가 "학교에서 지금 무엇을 가르치는지"를 알고 같은 말로 아이와 대화할 수 있습니다.
          {gradeLabel.startsWith('고') ? ' 고등학교는 서울시교육청 예시문 원문 구조를 그대로 씁니다.' : ' 초·중은 학년 자료의 학습 주제·목표로 자동 구성되며, 학교 양식에 맞게 다듬어 쓰세요.'}
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: '12px' }}>
          {LETTER_KINDS.map(k => {
            const l = preview(k.key);
            const n = k.key === 'intro' ? (l.skillIntro || []).length : (l.tips || []).length;
            return (
              <div key={k.key} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontWeight: 800, color: '#2d3748' }}>{k.label}</div>
                <div style={{ fontSize: '0.82rem', color: '#718096', lineHeight: 1.5, flex: 1 }}>{k.desc}<br /><span style={{ color: '#a0aec0' }}>{k.key === 'intro' ? `사회정서기술 ${n}개 소개` : `가정 실천 팁 ${n}개`}</span></div>
                <button className="btn btn-secondary" style={{ justifyContent: 'center' }} onClick={() => openLetter(k.key)}><Printer size={14} /> 미리보기 · 인쇄</button>
              </div>
            );
          })}
        </div>
      </section>

      {/* 2. 이번 주 수업 연계 알림 (3줄) */}
      <section>
        <h3 style={{ margin: '0 0 4px', fontSize: '1.05rem', color: '#2d3748' }}>2. 이번 주 수업 연계 알림 (알림장·문자용 3줄)</h3>
        <p style={{ margin: '0 0 12px', color: '#718096', fontSize: '0.88rem', lineHeight: 1.55 }}>
          이번 주에 한 사회정서 수업(또는 도덕 수업)을 고르면, 학부모가 저녁에 아이에게 건넬 질문 한 줄이 들어간 짧은 알림을 만듭니다. 초·중·고 모두 같은 방식입니다.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 320px) 1fr', gap: '16px', alignItems: 'start' }}>
          <select value={lessonIdx} onChange={e => { setLessonIdx(e.target.value); setNoticeDraft(''); }} style={{ width: '100%', padding: '10px 12px', borderRadius: '12px', border: '1px solid #cbd5e1', fontFamily: 'inherit', fontSize: '0.9rem', background: 'white' }}>
            <option value="">{gradeLabel} 차시 선택 ({gradeLessons.length}개)</option>
            {gradeLessons.map((l, i) => <option key={i} value={i}>[{l.area}] {l.seq ? `${l.seq}차시 ` : ''}{l.title}</option>)}
          </select>
          <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 0 }}>
            {!lesson ? (
              <div style={{ color: '#a0aec0', fontSize: '0.9rem', textAlign: 'center', padding: '12px' }}>차시를 선택하면 알림 문구가 만들어집니다.</div>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span className="chip">{lesson.area}</span>
                  <span style={{ fontSize: '0.78rem', color: '#718096' }}>{lesson.skill} · 근거 {lesson.standards.join(', ')}</span>
                  <span style={{ marginLeft: 'auto', display: 'flex', gap: '6px' }}>
                    <button className="btn btn-secondary" style={{ padding: '6px 10px', fontSize: '0.82rem' }} onClick={() => setNoticeDraft('')}>원문으로</button>
                    <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '0.82rem' }} onClick={copyNotice}>{noticeCopied ? <Check size={14} /> : <Copy size={14} />} {noticeCopied ? '복사됨' : '복사'}</button>
                  </span>
                </div>
                <textarea value={notice} onChange={e => setNoticeDraft(e.target.value)} rows={6}
                  style={{ width: '100%', fontFamily: 'inherit', fontSize: '0.9rem', lineHeight: 1.6, padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', resize: 'vertical', color: '#2d3748' }} />
              </>
            )}
          </div>
        </div>
      </section>

      {/* 3. 학생별 학부모 대화 카드 */}
      <section>
        <h3 style={{ margin: '0 0 4px', fontSize: '1.05rem', color: '#2d3748' }}>3. 학생별 학부모 대화 카드 (개별 전달)</h3>
        <p style={{ margin: '0 0 12px', color: '#718096', fontSize: '0.88rem', lineHeight: 1.55 }}>
          학생을 고르면 그 학생의 <b>초점 영역</b>에 맞는 가정 대화 팁만 담긴 짧은 안내문을 만듭니다. 학생의 상태나 신호는 쓰지 않으며, 문구를 고쳐서 알림장·문자·상담 자료로 쓰세요.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 280px) 1fr', gap: '16px', alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '420px', overflowY: 'auto', paddingRight: '4px' }}>
            {results.length === 0 && <div style={{ color: '#a0aec0', fontSize: '0.88rem' }}>학생 데이터가 없습니다.</div>}
            {results.map(r => (
              <button key={r.id} onClick={() => { setSelectedId(r.id); setDraft(''); }}
                style={{ textAlign: 'left', background: selectedId === r.id ? 'var(--primary-light)' : 'white', border: `1px solid ${selectedId === r.id ? 'var(--primary-color)' : '#e2e8f0'}`, borderRadius: '12px', padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.1rem' }}>{r.student.avatar || '👤'}</span>
                <span style={{ fontWeight: 700, color: '#2d3748', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.student.realName || r.student.nickname}</span>
                <span style={{ fontSize: '0.7rem', color: '#718096', whiteSpace: 'nowrap' }}>{(r.focus || []).slice(0, 2).map(f => f.label).join('·') || '—'}</span>
              </button>
            ))}
          </div>
          <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px', minWidth: 0 }}>
            {!card ? (
              <div style={{ color: '#a0aec0', fontSize: '0.9rem', padding: '24px', textAlign: 'center' }}><Users size={20} style={{ verticalAlign: '-4px' }} /> 왼쪽에서 학생을 선택하세요.</div>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 800, color: '#2d3748' }}>{card.studentName} 보호자용</span>
                  {card.areas.map(a => <span key={a} className="chip">{a} 영역</span>)}
                  <span style={{ marginLeft: 'auto', display: 'flex', gap: '6px' }}>
                    <button className="btn btn-secondary" style={{ padding: '6px 10px', fontSize: '0.82rem' }} onClick={() => setDraft('')}>원문으로</button>
                    <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '0.82rem' }} onClick={copy}>{copied ? <Check size={14} /> : <Copy size={14} />} {copied ? '복사됨' : '복사'}</button>
                  </span>
                </div>
                <textarea value={text} onChange={e => setDraft(e.target.value)} rows={16}
                  style={{ width: '100%', fontFamily: 'inherit', fontSize: '0.9rem', lineHeight: 1.6, padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', resize: 'vertical', color: '#2d3748' }} />
                <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-start', fontSize: '0.78rem', color: '#718096', lineHeight: 1.5 }}>
                  <Info size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span>이 카드는 학생 개인 신호를 담지 않도록 만들어졌습니다. 보내기 전에 학생을 특정해 걱정을 유발하는 표현이 없는지 한 번 더 읽어 주세요.</span>
                </div>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default FamilyLink;
