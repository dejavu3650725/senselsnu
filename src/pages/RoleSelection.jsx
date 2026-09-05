import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, BookOpen, Users, X, Key } from 'lucide-react';
import { auth, googleProvider, db } from '../firebase';
import { signInWithPopup } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { ensureStudentSession } from '../utils/apiClient';

const RoleSelection = () => {
  const navigate = useNavigate();
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [classCodeInput, setClassCodeInput] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  // 선생님 구글 로그인 핸들러
  const handleTeacherLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      // 다중 학급 지원: 로그인 후 항상 학급 관리 화면에서 학급을 선택/생성
      navigate('/teacher-setup');
    } catch (error) {
      console.error("Google Sign In Error", error);
      alert("로그인 중 오류가 발생했습니다.");
    }
  };

  // 학생 학급 코드 검증 핸들러
  const handleStudentJoin = async () => {
    if (!classCodeInput.trim()) {
      alert("학급 코드를 입력해주세요.");
      return;
    }

    setIsVerifying(true);
    try {
      const code = classCodeInput.trim();
      // 0) 보안 규칙상 읽기에는 로그인이 필요 → 학생은 익명 로그인
      await ensureStudentSession(null);

      // 1) 새 구조: classes/{학급코드} 문서 확인
      const classSnap = await getDoc(doc(db, 'classes', code));
      let isValid = classSnap.exists();

      // 2) 하위 호환: 기존 teachers 컬렉션의 classCode 확인 (규칙상 교사만 조회 가능 → 실패 시 무시)
      if (!isValid) {
        try {
          const q = query(collection(db, 'teachers'), where('classCode', '==', code));
          const querySnapshot = await getDocs(q);
          isValid = !querySnapshot.empty;
        } catch { /* 권한 없음 → 무효 처리 */ }
      }

      if (isValid) {
        // 유효한 학급 코드 → 학생 세션에 학급 기록 (규칙이 이 학급 데이터만 허용)
        await ensureStudentSession(code);
        sessionStorage.setItem('studentClassCode', code);
        navigate('/student');
      } else {
        alert("존재하지 않는 학급 코드입니다. 선생님께 다시 확인해주세요.");
      }
    } catch (error) {
      console.error("Class code verification error", error);
      alert("확인 중 오류가 발생했습니다.");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="landing">
      <div className="landing-hero">
        <div className="landing-logo"><Shield size={36} /></div>
        <h1 className="landing-title">교실 속 보이지 않는 마음을 읽는<br /><span className="accent">사회정서 레이더, 센셀</span></h1>
        <p className="landing-sub">학생은 나무 챗봇과 편하게 이야기하고, 선생님은 교우 관계와 정서 신호를 한눈에 보며<br className="hide-sm" />자리 배치·모둠 구성·맞춤 지도까지 이어갑니다.</p>
      </div>

      <div className="landing-cards">
        <div className="glass-card card-hover role-card" onClick={handleTeacherLogin} role="button" tabIndex={0} onKeyDown={e => e.key === 'Enter' && handleTeacherLogin()}>
          <div className="role-icon" style={{ background: 'var(--primary-light)' }}><BookOpen size={28} color="var(--primary-color)" /></div>
          <div>
            <h2 style={{ fontSize: '1.3rem', marginBottom: '4px' }}>선생님으로 시작</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.55 }}>구글 계정으로 로그인하고 학급을 만드세요. 학생 명단 등록부터 자리 배치까지 5분이면 준비됩니다.</p>
          </div>
          <span className="btn btn-primary" style={{ alignSelf: 'flex-start', marginTop: '4px' }}>구글로 로그인</span>
        </div>

        <div className="glass-card card-hover role-card" onClick={() => setShowStudentModal(true)} role="button" tabIndex={0} onKeyDown={e => e.key === 'Enter' && setShowStudentModal(true)}>
          <div className="role-icon" style={{ background: 'rgba(56, 161, 105, 0.12)' }}><Users size={28} color="var(--success)" /></div>
          <div>
            <h2 style={{ fontSize: '1.3rem', marginBottom: '4px' }}>학생으로 입장</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.55 }}>선생님이 알려준 학급 코드를 입력하면 바로 나무와 이야기할 수 있어요. 따로 가입할 필요 없어요.</p>
          </div>
          <span className="btn btn-secondary" style={{ alignSelf: 'flex-start', marginTop: '4px', color: 'var(--success)', borderColor: '#9ae6b4' }}>학급 코드 입력</span>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', margin: '4px 0 18px' }}>
        <button className="btn btn-secondary" onClick={() => navigate('/seating')} style={{ borderRadius: '999px' }}>🪑 로그인 없이 1분 자리 배치 해보기</button>
      </div>

      <div className="landing-steps">
        <div className="landing-step"><b>1. 학생이 대화합니다</b>긍정적인 질문만으로 오늘의 기분과 함께하고 싶은 친구를 자연스럽게 이야기합니다.</div>
        <div className="landing-step"><b>2. 선생님이 한눈에 봅니다</b>소시오그램, 갈등·외로움 신호, 긴급 알림이 실시간으로 정리됩니다.</div>
        <div className="landing-step"><b>3. 교실이 달라집니다</b>근거가 있는 자리 배치와 SEL 맞춤 처방으로 실제 생활지도로 이어집니다.</div>
      </div>

      <p className="landing-note">학생 이름은 인공지능 분석 시 익명 번호로 바뀌어 처리되며, 대화 내용은 보호자 동의를 받은 학급에서만 보관됩니다. 서울특별시교육청 교사 개발자 해커톤에서 시작된 현직 교사의 프로젝트입니다.</p>

      {/* 학생 학급 코드 입력 모달 */}
      {showStudentModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="glass-card" style={{ width: '92%', maxWidth: '400px', padding: '32px', background: 'white', borderRadius: '24px', boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ margin: 0, fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Key size={24} color="var(--success)" />
                학급 입장하기
              </h2>
              <button onClick={() => setShowStudentModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={24} color="#a0aec0" />
              </button>
            </div>
            
            <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>선생님께서 알려주신 <strong>학급 코드</strong>를 입력해주세요.</p>
            
            <input 
              type="text"
              value={classCodeInput}
              onChange={e => setClassCodeInput(e.target.value)}
              placeholder="예: SNU3A"
              autoFocus
              style={{ width: '100%', padding: '16px', borderRadius: '14px', border: '1px solid #cbd5e1', fontSize: '1.4rem', fontWeight: 700, outline: 'none', marginBottom: '20px', textAlign: 'center', letterSpacing: '4px', textTransform: 'uppercase', fontFamily: 'Inter, monospace' }}
              onKeyDown={e => e.key === 'Enter' && handleStudentJoin()}
            />

            <button 
              onClick={handleStudentJoin}
              disabled={isVerifying}
              style={{ width: '100%', padding: '16px', background: 'var(--success)', color: 'white', border: 'none', borderRadius: '12px', fontSize: '1.1rem', fontWeight: 600, cursor: isVerifying ? 'not-allowed' : 'pointer' }}
            >
              {isVerifying ? '확인 중...' : '입장하기'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoleSelection;
