import React, { useState } from 'react';
import { Shield, CheckCircle } from 'lucide-react';

const TeacherTutorial = () => {
  const [isOpen, setIsOpen] = useState(true);

  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div className="glass-card" style={{ width: '600px', background: 'white', padding: '40px', borderRadius: '24px', position: 'relative', animation: 'slideUp 0.3s ease-out' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
          <div style={{ width: 60, height: 60, background: 'var(--primary-light)', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <Shield size={32} color="var(--primary-color)" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.6rem', color: 'var(--text-main)', margin: 0 }}>SEN-SEL 교사용 튜토리얼</h2>
            <p style={{ color: 'var(--text-muted)', margin: 0 }}>평가가 아닌 심리적 안전망 구축하기</p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <CheckCircle size={24} color="var(--primary-color)" style={{ flexShrink: 0, marginTop: 4 }} />
            <div>
              <strong style={{ display: 'block', fontSize: '1.1rem', marginBottom: 4 }}>1. 긍정적 관계망(추인법) 소시오그램 확인</strong>
              <span style={{ color: 'var(--text-muted)', lineHeight: 1.5 }}>
                챗봇이 학생들에게 긍정적인 관계 질문(예: 짝꿍하고 싶은 친구)을 던집니다. 교사는 수집된 응답을 바탕으로 학급 전체의 <b>실제 관계망</b>을 시각화하여 조용한 소외를 조기에 발견할 수 있습니다.
              </span>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <CheckCircle size={24} color="var(--primary-color)" style={{ flexShrink: 0, marginTop: 4 }} />
            <div>
              <strong style={{ display: 'block', fontSize: '1.1rem', marginBottom: 4 }}>2. 학급 감정 신호등</strong>
              <span style={{ color: 'var(--text-muted)', lineHeight: 1.5 }}>
                학생들의 일기 및 챗봇 대화를 분석하여 현재 학급의 전반적인 정서 상태를 <b>안전(초록), 경계(노랑), 위험(빨강)</b> 신호등으로 직관적으로 보여줍니다.
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <CheckCircle size={24} color="var(--primary-color)" style={{ flexShrink: 0, marginTop: 4 }} />
            <div>
              <strong style={{ display: 'block', fontSize: '1.1rem', marginBottom: 4 }}>3. 위기 학생 SOS 및 맞춤 처방</strong>
              <span style={{ color: 'var(--text-muted)', lineHeight: 1.5 }}>
                위기 징후 발견 시 AI가 먼저 다가가며, 학생이 <b>SOS를 요청할 때만 실명 알림</b>이 전송됩니다. 하단 표에서 AI가 제안하는 자리 배치 및 상담 큐레이션을 확인하세요.
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <CheckCircle size={24} color="var(--primary-color)" style={{ flexShrink: 0, marginTop: 4 }} />
            <div>
              <strong style={{ display: 'block', fontSize: '1.1rem', marginBottom: 4 }}>4. 초등학생 맞춤형 강력한 AI 안전 필터</strong>
              <span style={{ color: 'var(--text-muted)', lineHeight: 1.5 }}>
                최고 수준의 안전 필터(BLOCK_LOW_AND_ABOVE)가 적용되어 증오, 폭력, 성인용 콘텐츠를 원천 차단합니다. 챗봇은 부적절한 대화 시도를 단호히 거절하도록 설계되었습니다.
              </span>
            </div>
          </div>
        </div>

        <button 
          onClick={() => setIsOpen(false)}
          style={{ width: '100%', padding: '16px', background: 'var(--primary-color)', color: 'white', border: 'none', borderRadius: '12px', fontSize: '1.1rem', fontWeight: 600, marginTop: '32px', cursor: 'pointer', transition: 'background 0.2s' }}
        >
          확인하고 대시보드 시작하기
        </button>
      </div>
    </div>
  );
};

export default TeacherTutorial;
