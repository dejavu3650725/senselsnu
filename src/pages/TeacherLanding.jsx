import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, BookOpen, ArrowLeft, Sparkles } from 'lucide-react';
import { auth, googleProvider } from '../firebase';
import { signInWithPopup } from 'firebase/auth';

/**
 * 선생님 소개 페이지 (/teachers)
 * 관계망·신호·처방 같은 교사용 설명은 이 페이지에만 둔다. 첫 화면(/)은 학생이 보는 화면이므로 분석 이야기를 하지 않는다.
 */
const TeacherLanding = () => {
  const navigate = useNavigate();

  const handleTeacherLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      navigate('/teacher-setup');
    } catch (error) {
      console.error('Google Sign In Error', error);
      alert('로그인 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="landing">
      <button className="btn btn-secondary landing-back" onClick={() => navigate('/')}><ArrowLeft size={14} /> 학생 화면으로</button>
      <div className="landing-hero">
        <div className="landing-logo"><Shield size={36} /></div>
        <h1 className="landing-title">교실 속 보이지 않는 마음을 읽는<br /><span className="accent">사회정서 레이더, 센셀</span></h1>
        <p className="landing-sub">학생은 나무 챗봇과 편하게 이야기하고, 선생님은 교우 관계와 정서 신호를 한눈에 보며<br className="hide-sm" />자리 배치·맞춤 지도·가정 연계·학교 서류까지 이어갑니다.</p>
      </div>

      <div className="landing-cards">
        <div className="glass-card card-hover role-card" onClick={handleTeacherLogin} role="button" tabIndex={0} onKeyDown={e => e.key === 'Enter' && handleTeacherLogin()}>
          <div className="role-icon" style={{ background: 'var(--primary-light)' }}><BookOpen size={28} color="var(--primary-color)" /></div>
          <div>
            <h2 style={{ fontSize: '1.3rem', marginBottom: '4px' }}>선생님으로 시작</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.55 }}>구글 계정으로 로그인하고 학급을 만드세요. 학급 코드를 나눠 주면 학생은 가입 없이 바로 이야기할 수 있어요.</p>
          </div>
          <span className="btn btn-primary" style={{ alignSelf: 'flex-start', marginTop: '4px' }}>구글로 로그인</span>
        </div>

        <div className="glass-card card-hover role-card" onClick={() => navigate('/seating')} role="button" tabIndex={0} onKeyDown={e => e.key === 'Enter' && navigate('/seating')}>
          <div className="role-icon" style={{ background: 'rgba(214, 158, 46, 0.14)' }}><Sparkles size={28} color="var(--warning)" /></div>
          <div>
            <h2 style={{ fontSize: '1.3rem', marginBottom: '4px' }}>로그인 없이 1분 자리 배치</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.55 }}>명단만 붙여 넣으면 떨어뜨릴 짝·가까이 둘 짝·앞줄 조건으로 바로 배치하고 점수와 이유를 보여 줘요. 저장하지 않아요.</p>
          </div>
          <span className="btn btn-secondary" style={{ alignSelf: 'flex-start', marginTop: '4px' }}>🪑 바로 해보기</span>
        </div>
      </div>

      <div className="landing-steps">
        <div className="landing-step"><b>1. 학생이 대화합니다</b>긍정적인 질문만으로 오늘의 기분과 함께하고 싶은 친구를 자연스럽게 이야기합니다.</div>
        <div className="landing-step"><b>2. 선생님이 한눈에 봅니다</b>소시오그램, 갈등·외로움 신호, 긴급 알림이 실시간으로 정리됩니다. 이 화면은 선생님만 봅니다.</div>
        <div className="landing-step"><b>3. 교실이 달라집니다</b>근거 성취기준이 붙은 자리 배치·맞춤 처방·상담 기록과 가정통신문·학급 리포트로 이어집니다.</div>
      </div>

      <p className="landing-note">데모 학급 코드 <b>2026ai</b>로 가상 학생 23명의 관계망을 바로 볼 수 있습니다. 학생 이름은 AI 분석 시 익명 번호로 바뀌고, 대화 원문은 기본적으로 저장하지 않으며, 학운위 심의·보호자 동의 서식은 서류함에서 내려받습니다. 서울특별시교육청 교사 개발자 해커톤에서 시작된 현직 교사의 프로젝트입니다.</p>
    </div>
  );
};

export default TeacherLanding;
