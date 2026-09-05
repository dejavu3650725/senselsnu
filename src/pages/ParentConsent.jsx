import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Printer, ArrowLeft, Shield, Info } from 'lucide-react';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { ensureStudentSession } from '../utils/apiClient';

/**
 * 보호자 안내문 · 동의서 (/consent/:classCode)
 * - 교사가 인쇄하거나 PDF로 저장해 가정에 배부합니다.
 * - 학급의 실제 설정(대화 원문 보관 여부, 챗봇 이름)을 반영해 문구가 바뀝니다.
 * - 학교·교육청 양식이 있으면 그 양식을 우선 사용하고, 이 문서는 참고용으로 활용하세요.
 */
const ParentConsent = () => {
  const { classCode } = useParams();
  const navigate = useNavigate();
  const [cls, setCls] = useState(null);
  const [cfg, setCfg] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        await ensureStudentSession(null); // 읽기 권한용 익명 로그인 (세션 문서는 만들지 않음)
        const c = await getDoc(doc(db, 'classes', classCode));
        if (c.exists()) {
          setCls(c.data());
          if (c.data().teacherUid) {
            const t = await getDoc(doc(db, 'teachers', c.data().teacherUid));
            if (t.exists()) setCfg(t.data().chatConfig || null);
          }
        }
      } catch (e) {
        console.error('consent load error', e);
      } finally {
        setLoaded(true);
      }
    };
    load();
  }, [classCode]);

  const storeTranscripts = cfg?.storeTranscripts === true && cfg?.consentConfirmed === true;
  const botName = cfg?.botName || '나무';
  const className = cls?.className || '우리 학급';
  const teacherName = cls?.teacherName ? `${cls.teacherName} 선생님` : '담임교사';
  const today = new Date();
  const year = today.getFullYear();

  return (
    <div className="consent-page">
      <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <button className="btn btn-secondary" onClick={() => navigate(-1)}><ArrowLeft size={16} /> 돌아가기</button>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          <button className="btn btn-primary" onClick={() => window.print()}><Printer size={16} /> 인쇄 / PDF 저장</button>
        </div>
      </div>
      <div className="no-print" style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', background: '#fffbea', border: '1px solid #f6e05e', borderRadius: '12px', padding: '10px 14px', marginBottom: '16px', fontSize: '0.85rem', color: '#744210', lineHeight: 1.55 }}>
        <Info size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
        <span>학교나 교육청에 정해진 개인정보 동의 양식이 있으면 그 양식을 우선 사용하시고, 이 문서는 참고용으로 활용하세요. 아래 내용은 현재 학급 설정(대화 원문 보관 {storeTranscripts ? '켜짐' : '꺼짐'})을 반영합니다.</span>
      </div>

      <div className="consent-doc" id="print-area">
        <div style={{ textAlign: 'center', marginBottom: '6px' }}><Shield size={28} color="#3b6fe0" /></div>
        <h1>학급 사회정서 지원 프로그램 '센셀(SEN-SEL)' 안내 및 보호자 동의서</h1>
        <p style={{ textAlign: 'center', color: '#6b7280', fontSize: '0.92rem' }}>{/학년도/.test(className) ? '' : `${year}학년도 · `}{className} · {teacherName}</p>

        <p style={{ marginTop: '18px' }}>
          안녕하십니까. {className} 담임 {teacherName}입니다. 우리 반은 학생들이 친구 관계와 감정을 건강하게 돌볼 수 있도록 돕는
          사회정서학습(SEL) 지원 프로그램 <b>'센셀'</b>을 학급 운영에 활용하고자 합니다. 아래 내용을 읽어 보시고 참여에 동의해 주시면 감사하겠습니다.
        </p>

        <h2>1. 프로그램 소개</h2>
        <p>
          학생은 학교에서 '{botName}'라는 대화형 도우미와 짧은 대화를 나눕니다. 오늘 기분은 어땠는지, 고마웠던 친구는 누구인지처럼
          <b>긍정적인 질문</b>을 중심으로 이야기하며, 담임교사는 그 결과를 바탕으로 학급의 교우 관계를 살피고 자리 배치, 모둠 구성,
          개별 상담 등 생활지도에 활용합니다. 대화 도우미는 훈계하거나 진단하지 않으며, 학생을 다른 학생과 비교하지 않습니다.
        </p>
        <p>
          이 프로그램은 교육부 「한국형 사회정서교육」과 서울특별시교육청 「서울 사회정서교육」(자기·대인관계·공동체·마음건강 4영역)의 틀을 따르며,
          학교 수업에서 배우는 사회정서기술을 일상에서 연습하도록 돕는 보조 도구입니다. 가정에서 함께 나눌 수 있는 대화 안내는 별도의 가정통신문으로 안내해 드립니다.
        </p>

        {!loaded ? null : (
          <>
            <h2>2. 수집·이용하는 정보</h2>
            <table>
              <tbody>
                <tr><th>수집 항목</th><td>학생 이름, 별명(학생이 정함), 성별, 오늘의 기분(좋음/보통/힘듦), 대화에서 파악된 친구 관계 신호(함께하고 싶은 친구, 갈등·외로움 표현 여부){storeTranscripts ? ', 대화 내용' : ''}</td></tr>
                <tr><th>수집 목적</th><td>학급 교우 관계 파악, 자리·모둠 배치, 정서적 어려움이 있는 학생의 조기 발견과 상담 연계</td></tr>
                <tr><th>대화 내용 보관</th><td>{storeTranscripts
                  ? '보호자 동의를 받은 학급으로서 대화 내용을 보관하며, 담임교사만 열람합니다. 학기 종료 시 삭제합니다.'
                  : '대화 내용 자체는 저장하지 않습니다. 기분과 친구 관계 신호만 기록되며, 학교폭력·자해 등 위급한 표현이 감지된 경우에 한해 해당 대화의 앞뒤 내용이 담임교사에게 전달됩니다.'}</td></tr>
                <tr><th>보관 기간</th><td>해당 학년도 종료 시까지 (종료 후 지체 없이 삭제)</td></tr>
                <tr><th>열람 권한</th><td>담임교사만 열람합니다. 다른 학생·학부모·외부인은 볼 수 없습니다.</td></tr>
                <tr><th>처리 방식</th><td>인공지능 분석 시 학생 이름을 익명 번호로 바꾸어 처리하며, 이름이 외부 인공지능 서비스로 전송되지 않도록 설계되어 있습니다.</td></tr>
              </tbody>
            </table>

            <h2>3. 보호자의 권리</h2>
            <p>
              동의는 자유롭게 거부하실 수 있으며, 거부하더라도 학생에게 어떠한 불이익도 없습니다. 언제든 담임교사에게 요청하여
              동의를 철회하거나, 학생의 기록을 열람·삭제하도록 하실 수 있습니다. 만 14세 미만 학생의 경우 법정대리인의 동의가 필요합니다.
            </p>

            <h2>4. 안전 조치</h2>
            <p>
              대화 중 학교폭력, 따돌림, 자해 등 위험 신호가 감지되면 담임교사에게 즉시 알림이 전달되며, 필요한 경우 학교 상담 절차와
              보호자 연락으로 이어집니다. 이는 학생 보호를 위한 조치입니다.
            </p>

            <div className="consent-sign">
              <div style={{ fontWeight: 700 }}>보호자 동의</div>
              <p style={{ fontSize: '0.9rem', marginTop: '4px' }}>위 내용을 확인하였으며, 자녀의 '센셀' 프로그램 참여 및 위 정보의 수집·이용에</p>
              <div style={{ display: 'flex', gap: '24px', marginTop: '6px', fontSize: '0.95rem' }}>
                <span>☐ 동의합니다</span>
                <span>☐ 동의하지 않습니다</span>
              </div>
              <div className="line">
                <div className="field">학생 이름:</div>
                <div className="field">보호자 이름:</div>
                <div className="field">서명:</div>
              </div>
              <div className="line">
                <div className="field">날짜: {year}년 &nbsp;&nbsp; 월 &nbsp;&nbsp; 일</div>
                <div className="field">연락처:</div>
              </div>
            </div>

            <p style={{ marginTop: '18px', fontSize: '0.85rem', color: '#6b7280' }}>
              문의: {teacherName} · 학급 코드 {classCode}
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default ParentConsent;
