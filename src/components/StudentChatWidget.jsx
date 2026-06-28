import React, { useState } from 'react';
import { Minus, X, Send } from 'lucide-react';

const StudentChatWidget = () => {
  const [isOpen, setIsOpen] = useState(true);

  if (!isOpen) return null;

  return (
    <div className="chat-widget">
      <div className="chat-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: 8, height: 8, background: '#48bb78', borderRadius: '50%' }}></div>
          학생 시점
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Minus size={16} style={{ cursor: 'pointer' }} onClick={() => setIsOpen(false)} />
          <X size={16} style={{ cursor: 'pointer' }} onClick={() => setIsOpen(false)} />
        </div>
      </div>
      
      <div className="chat-body">
        <div style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          AI 챗봇 (맞춤형 캐릭터)
        </div>
        
        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
          <div style={{ fontSize: '1.5rem' }}>🌳</div>
          <div className="chat-bubble">
            버스에서 누구 옆자리에 앉고 싶어?
          </div>
        </div>
      </div>

      <div className="chat-input-area">
        <input type="text" placeholder="메시지를 입력하세요..." className="chat-input" />
        <button style={{ background: 'var(--primary-color)', border: 'none', borderRadius: '50%', width: 36, height: 36, display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'white', cursor: 'pointer' }}>
          <Send size={16} />
        </button>
      </div>
    </div>
  );
};

export default StudentChatWidget;
