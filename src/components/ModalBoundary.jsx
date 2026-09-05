import React from 'react';

/** 모달 안에서 오류가 나면 화면 전체가 죽지 않고 오류 내용을 보여 준다 */
class ModalBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error('Modal error:', error, info); }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }} onClick={this.props.onClose}>
        <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: '20px', padding: '24px', maxWidth: '520px', width: '100%' }}>
          <div style={{ fontWeight: 800, fontSize: '1.05rem', marginBottom: '8px' }}>{this.props.title || '창'}을 여는 중 오류가 났어요</div>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.8rem', color: '#c53030', background: '#fff5f5', borderRadius: '10px', padding: '10px', maxHeight: '240px', overflow: 'auto' }}>{String(this.state.error?.message || this.state.error)}</pre>
          <div style={{ fontSize: '0.82rem', color: '#718096', marginTop: '8px' }}>이 메시지를 캡처해 보내 주시면 바로 고칠 수 있어요.</div>
          <button className="btn btn-primary" style={{ marginTop: '12px' }} onClick={this.props.onClose}>닫기</button>
        </div>
      </div>
    );
  }
}

export default ModalBoundary;
