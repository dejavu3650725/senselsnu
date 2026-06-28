import React, { useState } from 'react';
import { UserPlus, MessageCircle, Heart, Shield } from 'lucide-react';

const StudentTutorial = ({ onComplete }) => {
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div className="glass-card" style={{ width: '600px', background: 'white', padding: '40px', borderRadius: '24px', position: 'relative', animation: 'slideUp 0.3s ease-out' }}>
        <h2 style={{ fontSize: '1.8rem', color: 'var(--text-main)', textAlign: 'center', margin: '0 0 8px 0' }}>안녕! SEN-SEL에 온 걸 환영해 🎉</h2>
        <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginBottom: '32px' }}>여기는 너의 솔직한 마음을 편하게 털어놓는 비밀 공간이야.</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div style={{ width: 50, height: 50, background: 'rgba(74, 144, 226, 0.1)', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0 }}>
              <UserPlus size={24} color="var(--primary-color)" />
            </div>
            <div>
              <strong style={{ display: 'block', fontSize: '1.1rem', marginBottom: 4 }}>1. 나만의 닉네임과 캐릭터 만들기</strong>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.5, display: 'block' }}>처음엔 내 진짜 이름을 적고 시작하지만, 화면에서는 나만의 귀여운 닉네임과 캐릭터(예: 곰돌이)로 활동해. 선생님은 너의 성장 과정을 든든하게 지켜봐 주실 거야!</span>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div style={{ width: 50, height: 50, background: 'rgba(72, 187, 120, 0.1)', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0 }}>
              <MessageCircle size={24} color="var(--success)" />
            </div>
            <div>
              <strong style={{ display: 'block', fontSize: '1.1rem', marginBottom: 4 }}>2. 든든한 AI 친구와 매일 대화하기</strong>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.5, display: 'block' }}>"버스 옆자리에 누구랑 앉고 싶어?" 나만의 챗봇 친구랑 매일 편하게 수다를 떨거나 감정 일기를 써봐.</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div style={{ width: 50, height: 50, background: 'rgba(236, 201, 75, 0.1)', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0 }}>
              <Heart size={24} color="var(--warning)" />
            </div>
            <div>
              <strong style={{ display: 'block', fontSize: '1.1rem', marginBottom: 4 }}>3. 내 마음 상태 확인 & SOS 요청</strong>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.5, display: 'block' }}>대화하면서 내 마음이 얼마나 튼튼해졌는지 분석 받을 수 있어. 정말 힘들 땐 언제든 SOS 버튼을 눌러 선생님께만 살짝 도움을 청해봐!</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div style={{ width: 50, height: 50, background: 'rgba(159, 122, 234, 0.1)', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0 }}>
              <Shield size={24} color="#9f7aea" />
            </div>
            <div>
              <strong style={{ display: 'block', fontSize: '1.1rem', marginBottom: 4 }}>4. 나를 지켜주는 안전한 방패</strong>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.5, display: 'block' }}>챗봇은 유해한 단어나 나쁜 말을 모두 걸러내는 튼튼한 방패를 가지고 있어. 안심하고 학교 생활에 대해서만 이야기해 봐!</span>
            </div>
          </div>
        </div>

        <button 
          onClick={onComplete}
          style={{ width: '100%', padding: '16px', background: 'var(--success)', color: 'white', border: 'none', borderRadius: '12px', fontSize: '1.1rem', fontWeight: 600, marginTop: '32px', cursor: 'pointer', transition: 'background 0.2s' }}
        >
          내 캐릭터 만들고 시작하기
        </button>
      </div>
    </div>
  );
};

export default StudentTutorial;
