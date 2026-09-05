import React, { useState, useEffect } from 'react';
import { Settings, X, Save, ChevronDown, ChevronUp, MessageCircle } from 'lucide-react';
import { db, auth } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

/**
 * 챗봇 설정 (교사용)
 * - 프롬프트를 직접 쓰지 않고 몇 가지만 고르면 됩니다.
 * - 실제 대화는 서버(api/gemini-counseling.js)가 학생별 기분·대화 단계·이력에 맞춰 매 턴 조립합니다.
 * - 기존 P-TISER 입력은 '고급'에 남겨 두어 원하는 분만 사용합니다.
 */

const TONES = [
  { key: 'warm', label: '다정하게', desc: '따뜻한 언니·형 느낌, 이모지 가끔' },
  { key: 'calm', label: '차분하게', desc: '조용히 들어주는 느낌, 이모지 거의 없음' },
  { key: 'playful', label: '유쾌하게', desc: '밝고 장난기 있게, 무거운 얘기엔 바로 진지하게' },
];

const TOPICS = [
  { key: 'friendship', label: '친구 관계', emoji: '🤝' },
  { key: 'emotion', label: '감정 표현', emoji: '💛' },
  { key: 'school', label: '학교 적응', emoji: '🏫' },
  { key: 'study', label: '공부 스트레스', emoji: '📚' },
  { key: 'online', label: '게임·스마트폰', emoji: '🎮' },
  { key: 'family', label: '가족·일상', emoji: '🏠' },
];

const DEFAULT_CONFIG = {
  botName: '나무',
  tone: 'warm',
  focusTopics: ['friendship', 'emotion'],
  classNote: '',
  rules: { noStudyNag: true, noScolding: true, noPersonalInfo: true },
  customRule: '',
  profanityReply: '',
  storeTranscripts: false,   // 대화 원문 보관 (기본 꺼짐: 지목·갈등·외로움·기분·위기 신호만 저장)
  consentConfirmed: false,   // 보호자 동의 절차 완료 확인
  dailyTurnLimit: 30,        // 학생 1명당 하루 대화 상한 (0 = 무제한)
  collectConflicts: true,    // 갈등 신호 수집 (false = 긍정 지목만 모드)
};

const ChatbotSettingsModal = ({ onClose, onSaved }) => {
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [ptiser, setPtiser] = useState({ persona: '', task: '', information: '', style: '', restriction: '' });
  const [selLevel, setSelLevel] = useState('elementary_high');
  const [gradeYear, setGradeYear] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;
        const snap = await getDoc(doc(db, 'teachers', user.uid));
        if (snap.exists()) {
          const d = snap.data();
          if (d.chatConfig) setConfig({ ...DEFAULT_CONFIG, ...d.chatConfig, rules: { ...DEFAULT_CONFIG.rules, ...(d.chatConfig.rules || {}) } });
          if (d.ptiser) setPtiser(d.ptiser);
          else if (d.customPrompt) setPtiser(prev => ({ ...prev, information: d.customPrompt }));
          if (d.selLevel) setSelLevel(d.selLevel);
          if (d.gradeYear) setGradeYear(String(d.gradeYear));
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    };
    loadSettings();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const user = auth.currentUser;
      if (!user) return;
      const payload = { chatConfig: config, ptiser, selLevel, gradeYear: gradeYear ? Number(gradeYear) : null };
      await setDoc(doc(db, 'teachers', user.uid), payload, { merge: true });
      if (onSaved) onSaved(payload);
      onClose();
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleTopic = (key) => setConfig(c => {
    const has = c.focusTopics.includes(key);
    const next = has ? c.focusTopics.filter(k => k !== key) : [...c.focusTopics, key];
    return { ...c, focusTopics: next.length ? next : c.focusTopics };
  });

  const toneObj = TONES.find(t => t.key === config.tone) || TONES[0];
  const topicLabels = TOPICS.filter(t => config.focusTopics.includes(t.key)).map(t => t.label);

  const sectionLabel = { display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#2d3748', fontSize: '0.95rem' };
  const inputStyle = { width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #cbd5e1', outline: 'none', fontFamily: 'inherit', fontSize: '0.95rem' };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 }}>
      <div style={{ background: 'white', padding: '28px 32px', borderRadius: '24px', width: '92%', maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h2 style={{ margin: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.4rem' }}>
            <Settings size={24} color="var(--primary-color)" /> 챗봇 설정
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} color="#a0aec0" /></button>
        </div>
        <p style={{ color: 'var(--text-muted)', marginBottom: '20px', lineHeight: 1.6, fontSize: '0.92rem' }}>
          프롬프트를 쓰실 필요 없습니다. 아래 몇 가지만 고르면, 챗봇이 <b>학생마다</b> 오늘 기분·대화 단계·이전 이력에 맞춰 대화를 이끕니다
          (체크인 → 오늘 있었던 일 → 친구 관계 질문 → 마음 열기 → 마무리, 힘든 학생은 공감 우선).
        </p>

        {/* 미리보기 */}
        <div style={{ background: '#f0fff4', border: '1px solid #c6f6d5', borderRadius: '14px', padding: '12px 16px', marginBottom: '20px', fontSize: '0.88rem', color: '#276749', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
          <MessageCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <b>'{config.botName || '나무'}'</b>이(가) <b>{toneObj.label}</b> 말투로, <b>{topicLabels.join('·')}</b>을(를) 중심으로 대화합니다.
            {config.classNote && <> 학급 메모: "{config.classNote.slice(0, 60)}{config.classNote.length > 60 ? '…' : ''}"</>}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr 1fr', gap: '12px' }}>
            <div>
              <label style={sectionLabel}>학교급</label>
              <select value={selLevel} onChange={e => { setSelLevel(e.target.value); setGradeYear(''); }} style={{ ...inputStyle, background: 'white' }}>
                <option value="elementary_low">초등 저학년</option>
                <option value="elementary_high">초등 고학년</option>
                <option value="middle">중학교</option>
                <option value="high">고등학교</option>
              </select>
            </div>
            <div>
              <label style={sectionLabel}>학년</label>
              <select value={gradeYear} onChange={e => setGradeYear(e.target.value)} style={{ ...inputStyle, background: 'white' }}>
                <option value="">선택</option>
                {(selLevel === 'elementary_low' ? [1, 2, 3] : selLevel === 'elementary_high' ? [4, 5, 6] : [1, 2, 3]).map(n => (
                  <option key={n} value={n}>{n}학년</option>
                ))}
              </select>
            </div>
            <div>
              <label style={sectionLabel}>챗봇 이름</label>
              <input value={config.botName} onChange={e => setConfig(c => ({ ...c, botName: e.target.value.slice(0, 12) }))} placeholder="나무" style={inputStyle} />
            </div>
          </div>

          <div>
            <label style={sectionLabel}>말투</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {TONES.map(t => (
                <button key={t.key} onClick={() => setConfig(c => ({ ...c, tone: t.key }))} style={{ padding: '10px 8px', borderRadius: '12px', border: config.tone === t.key ? '2px solid var(--primary-color)' : '1px solid #e2e8f0', background: config.tone === t.key ? 'var(--primary-light)' : 'white', cursor: 'pointer', textAlign: 'left' }}>
                  <div style={{ fontWeight: 'bold', color: '#2d3748', fontSize: '0.9rem' }}>{t.label}</div>
                  <div style={{ fontSize: '0.75rem', color: '#718096', marginTop: '2px' }}>{t.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={sectionLabel}>이번 시기 관심 주제 <span style={{ fontWeight: 'normal', color: '#a0aec0', fontSize: '0.8rem' }}>(여러 개 선택)</span></label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {TOPICS.map(t => {
                const on = config.focusTopics.includes(t.key);
                return (
                  <button key={t.key} onClick={() => toggleTopic(t.key)} style={{ padding: '8px 14px', borderRadius: '20px', border: on ? '2px solid var(--primary-color)' : '1px solid #e2e8f0', background: on ? 'var(--primary-light)' : 'white', color: on ? 'var(--primary-color)' : '#4a5568', fontWeight: 'bold', fontSize: '0.88rem', cursor: 'pointer' }}>
                    {t.emoji} {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label style={sectionLabel}>학급 상황 메모 <span style={{ fontWeight: 'normal', color: '#a0aec0', fontSize: '0.8rem' }}>(선택 · 한두 문장)</span></label>
            <textarea value={config.classNote} onChange={e => setConfig(c => ({ ...c, classNote: e.target.value.slice(0, 500) }))} placeholder="예) 이번 주 체험학습 다녀옴 / 최근 모둠 활동에서 다툼이 있었음 / 전학생이 한 명 왔음" style={{ ...inputStyle, minHeight: '64px', resize: 'vertical' }} />
          </div>

          <div>
            <label style={sectionLabel}>지켜야 할 규칙</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.9rem', color: '#4a5568' }}>
              {[['noStudyNag', '공부·숙제 잔소리 하지 않기'], ['noScolding', '훈계·다그침·다른 학생과 비교 금지'], ['noPersonalInfo', '개인정보(주소·전화번호 등) 묻지 않기']].map(([k, label]) => (
                <label key={k} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={config.rules[k] !== false} onChange={e => setConfig(c => ({ ...c, rules: { ...c.rules, [k]: e.target.checked } }))} /> {label}
                </label>
              ))}
              <input value={config.customRule} onChange={e => setConfig(c => ({ ...c, customRule: e.target.value.slice(0, 300) }))} placeholder="추가 규칙 (선택) 예) 특정 학생 이름을 먼저 언급하지 말 것" style={{ ...inputStyle, marginTop: '4px' }} />
              <input value={config.profanityReply} onChange={e => setConfig(c => ({ ...c, profanityReply: e.target.value.slice(0, 200) }))} placeholder="욕설을 쓰면 할 말 (선택) 예) 그런 말은 나무가 들으면 슬퍼. 다른 말로 다시 해줄래?" style={{ ...inputStyle, background: '#fff5f5', border: '1px solid #fc8181' }} />
            </div>
          </div>

          {/* 수집 범위 · 사용량 */}
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '14px', padding: '14px 16px', background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <div style={{ fontWeight: 'bold', color: '#2d3748', fontSize: '0.95rem' }}>수집 범위</div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                {[[true, '관계 + 갈등 신호', '긍정 지목과 함께 학생이 스스로 말한 갈등·외로움 신호도 기록'], [false, '긍정 지목만', '갈등 신호는 기록하지 않고 대화로만 다룸 (위기 알림은 유지)']].map(([val, label, desc]) => (
                  <button key={String(val)} onClick={() => setConfig(c => ({ ...c, collectConflicts: val }))} style={{ flex: 1, padding: '10px 10px', borderRadius: '12px', textAlign: 'left', border: (config.collectConflicts !== false) === val ? '2px solid var(--primary-color)' : '1px solid #e2e8f0', background: (config.collectConflicts !== false) === val ? 'var(--primary-light)' : 'white', cursor: 'pointer' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '0.88rem', color: '#2d3748' }}>{label}</div>
                    <div style={{ fontSize: '0.74rem', color: '#718096', marginTop: '2px', lineHeight: 1.4 }}>{desc}</div>
                  </button>
                ))}
              </div>
              <div style={{ fontSize: '0.76rem', color: '#a0aec0', marginTop: '6px', lineHeight: 1.5 }}>갈등 신호는 어느 모드에서든 '학생의 주관적 보고'로 표시되며, 프로그램이 사실 여부를 판정하지 않습니다.</div>
            </div>
            <div>
              <div style={{ fontWeight: 'bold', color: '#2d3748', fontSize: '0.95rem' }}>학생 1명당 하루 대화 상한</div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                {[[20, '20턴'], [30, '30턴 (기본)'], [50, '50턴'], [0, '무제한']].map(([val, label]) => (
                  <button key={val} onClick={() => setConfig(c => ({ ...c, dailyTurnLimit: val }))} style={{ padding: '8px 14px', borderRadius: '10px', border: (config.dailyTurnLimit ?? 30) === val ? '2px solid var(--primary-color)' : '1px solid #e2e8f0', background: (config.dailyTurnLimit ?? 30) === val ? 'var(--primary-light)' : 'white', fontWeight: 'bold', fontSize: '0.85rem', cursor: 'pointer', color: '#2d3748' }}>{label}</button>
                ))}
              </div>
              <div style={{ fontSize: '0.76rem', color: '#a0aec0', marginTop: '6px', lineHeight: 1.5 }}>상한에 가까워지면 챗봇이 스스로 대화를 정리하고, 도달하면 "내일 또 이야기하자"로 따뜻하게 닫습니다. 한 학생이 쉬는 시간마다 매달리는 것을 막고, 필요한 학생에게는 넉넉히 열어 둘 수 있습니다.</div>
            </div>
          </div>

          {/* 대화 원문 보관 (개인정보) */}
          <div style={{ border: `2px solid ${config.storeTranscripts ? '#f6ad55' : '#e2e8f0'}`, borderRadius: '14px', padding: '14px 16px', background: config.storeTranscripts ? '#fffaf0' : '#f8fafc' }}>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
              <input type="checkbox" checked={!!config.storeTranscripts} onChange={e => setConfig(c => ({ ...c, storeTranscripts: e.target.checked, consentConfirmed: e.target.checked ? c.consentConfirmed : false }))} style={{ marginTop: '3px' }} />
              <div>
                <div style={{ fontWeight: 'bold', color: '#2d3748', fontSize: '0.95rem' }}>🔒 학생 대화 원문 보관 {config.storeTranscripts ? '(켜짐)' : '(꺼짐 · 기본)'}</div>
                <div style={{ fontSize: '0.8rem', color: '#718096', lineHeight: 1.55, marginTop: '4px' }}>
                  꺼져 있으면 대화 내용은 저장하지 않고 <b>지목·갈등·외로움·기분·위기 신호만</b> 기록합니다. 소시오그램·자리 배치·학급 분석은 그대로 동작하며, 위기 신호(긴급 알림)가 뜬 대화의 전후 발화만 아동 보호 목적으로 남습니다.
                  켜면 대화 전체가 저장되어 대시보드 '최근 대화 기록'과 맞춤 처방 분석에 활용됩니다.
                </div>
              </div>
            </label>
            {config.storeTranscripts && (
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed #f6ad55' }}>
                <input type="checkbox" checked={!!config.consentConfirmed} onChange={e => setConfig(c => ({ ...c, consentConfirmed: e.target.checked }))} style={{ marginTop: '3px' }} />
                <div style={{ fontSize: '0.82rem', color: '#9c4221', lineHeight: 1.55 }}>
                  <b>보호자 동의 및 학교 절차를 완료했습니다.</b> (14세 미만 학생은 법정대리인 동의가 필요합니다. 이 확인 없이는 원문이 저장되지 않으며, 학기 말에는 [학생 관리]에서 대화 기록을 삭제해 주세요.)
                </div>
              </label>
            )}
          </div>

          {/* 고급: 직접 지침 (구버전 P-TISER) */}
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
            <button onClick={() => setShowAdvanced(v => !v)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: '#f8fafc', border: 'none', cursor: 'pointer', color: '#718096', fontSize: '0.85rem', textAlign: 'left' }}>
              {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />} 고급: 직접 지침 쓰기 (선택 — 비워 두어도 됩니다)
            </button>
            {showAdvanced && (
              <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#a0aec0' }}>여기 적은 내용은 위 설정에 '참고 지침'으로 덧붙습니다. 학생 맞춤 대화 흐름은 그대로 유지됩니다.</p>
                {[['persona', '역할'], ['task', '임무'], ['information', '배경 지식'], ['style', '응답 스타일'], ['restriction', '제한 사항']].map(([k, label]) => (
                  <input key={k} value={ptiser[k] || ''} onChange={e => setPtiser(p => ({ ...p, [k]: e.target.value }))} placeholder={label} style={{ ...inputStyle, padding: '9px 12px', fontSize: '0.88rem' }} />
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '22px' }}>
          <button onClick={onClose} style={{ padding: '12px 24px', background: '#e2e8f0', color: '#4a5568', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}>취소</button>
          <button onClick={handleSave} disabled={isSaving} style={{ padding: '12px 24px', background: 'var(--primary-color)', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: isSaving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Save size={20} /> {isSaving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatbotSettingsModal;
