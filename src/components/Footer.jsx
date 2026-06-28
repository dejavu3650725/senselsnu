import React from 'react';
import './Footer.css';

function Footer({ onOpenPolicy }) {
  return (
    <footer className="portal-footer">
      <div className="footer-content">
        <div className="footer-links">
          <button className="footer-link" onClick={() => onOpenPolicy('terms')}>이용약관</button>
          <span className="footer-divider">|</span>
          <button className="footer-link bold" onClick={() => onOpenPolicy('privacy')}>개인정보처리방침</button>
        </div>
        <div className="footer-info">
          <p>정보관리책임자: 금정민</p>
        </div>
        <div className="footer-copyright">
          <p>&copy; 2026 서울고덕초등학교 금정민. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
