import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Sociogram from '../components/Sociogram';
import EmotionalSignal from '../components/EmotionalSignal';
import InterventionTable from '../components/InterventionTable';
import DailyFlow from '../components/DailyFlow';
import Topbar from '../components/Topbar';
import TeacherTutorial from '../components/TeacherTutorial';
import ChatbotSettingsModal from '../components/ChatbotSettingsModal';
import TeacherSettingsModal from '../components/TeacherSettingsModal';
import ClassAnalysis from '../components/ClassAnalysis';
import EmotionTracker from '../components/EmotionTracker';
import CustomPrescription from '../components/CustomPrescription';
import Report from '../components/Report';
import EdutechResource from '../components/EdutechResource';
import StudentManagement from '../components/StudentManagement';
import SeatingChart from '../components/SeatingChart';
import RelationshipWatch from '../components/RelationshipWatch';
import { db, auth } from '../firebase';
import { collection, onSnapshot, query, orderBy, where, doc, getDoc, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

const TeacherDashboard = () => {
  const navigate = useNavigate();
  const [activeMenu, setActiveMenu] = useState('대시보드');
  const [isChatbotModalOpen, setIsChatbotModalOpen] = useState(false);
  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState(false);
  const [studentsData, setStudentsData] = useState([]);
  const [teacherProfile, setTeacherProfile] = useState({ teacherName: '', className: '' });
  const [activeClass, setActiveClass] = useState(null); // 현재 입장한 학급 정보 (다중 학급)
  const [currentUser, setCurrentUser] = useState(null);
  const currentClassCode = sessionStorage.getItem('currentClassCode');

  // 현재 학급 정보 불러오기 (classes 컬렉션, 없으면 teacherProfile로 폴백)
  useEffect(() => {
    if (!currentClassCode) return;
    getDoc(doc(db, 'classes', currentClassCode))
      .then(snap => { if (snap.exists()) setActiveClass(snap.data()); })
      .catch(err => console.error('Failed to load class info:', err));
  }, [currentClassCode]);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
      } else {
        navigate('/');
      }
    });
    return () => unsubscribeAuth();
  }, [navigate]);

  useEffect(() => {
    if (!currentClassCode) return;
    
    // 파이어베이스에서 학생 데이터 실시간으로 불러오기 (classCode로 필터링)
    const q = query(collection(db, 'students'), where('classCode', '==', currentClassCode), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const students = [];
      querySnapshot.forEach((doc) => {
        students.push({ id: doc.id, ...doc.data() });
      });
      setStudentsData(students);
    }, (error) => {
      console.error("Error fetching students: ", error);
    });

    return () => unsubscribe();
  }, [currentClassCode]);

  useEffect(() => {
    if (!currentUser) return;
    
    // 파이어베이스에서 교사 프로필 설정 불러오기
    const loadTeacherProfile = async () => {
      try {
        const docRef = doc(db, 'teachers', currentUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setTeacherProfile(docSnap.data());
        }
      } catch (error) {
        console.error("Failed to load teacher profile:", error);
      }
    };
    loadTeacherProfile();
  }, [currentUser]);

  // ===== 긴급 알림(Red Alert) 프로토콜 =====
  // 학생 문서의 alerts 중 교사가 아직 확인하지 않은(alertsAckedAt 이후) 위기 신호 집계
  const urgentAlerts = [];
  studentsData.forEach(s => {
    const ackedAt = s.alertsAckedAt || '';
    (s.alerts || []).forEach(a => {
      if (a && a.timestamp && (!ackedAt || a.timestamp > ackedAt)) {
        urgentAlerts.push({ studentId: s.id, name: s.realName, avatar: s.avatar, reason: a.reason || '위기 신호 감지', timestamp: a.timestamp });
      }
    });
  });
  urgentAlerts.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));

  // 새 긴급 알림 도착 시 브라우저 푸시 알림 (권한이 허용된 경우)
  const prevAlertCountRef = useRef(0);
  useEffect(() => {
    if (
      urgentAlerts.length > prevAlertCountRef.current &&
      typeof Notification !== 'undefined' &&
      Notification.permission === 'granted'
    ) {
      const latest = urgentAlerts[0];
      try {
        new Notification('🚨 SEN-SEL 긴급 알림', { body: `${latest.name} 학생: ${latest.reason}` });
      } catch (e) { /* 일부 브라우저 미지원 */ }
    }
    prevAlertCountRef.current = urgentAlerts.length;
  }, [urgentAlerts.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // 긴급 알림 확인 처리
  const handleAckAlert = async (studentId) => {
    try {
      await updateDoc(doc(db, 'students', studentId), { alertsAckedAt: new Date().toISOString() });
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
    }
  };

  const formatAlertTime = (iso) => {
    try {
      return new Date(iso).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch { return ''; }
  };

  return (
    <div className="app-container">
      <TeacherTutorial />
      <Topbar teacherProfile={teacherProfile} />
      <div className="main-layout">
        <Sidebar 
          activeMenu={activeMenu} 
          setActiveMenu={(menu) => {
            if (menu === '챗봇 설정') setIsChatbotModalOpen(true);
            else if (menu === '기본 설정') setIsTeacherModalOpen(true);
            else setActiveMenu(menu);
          }} 
          teacherProfile={teacherProfile} 
        />
        
        <div className="dashboard-content">
          {/* 🚨 긴급 알림(Red Alert) 배너 - 어떤 메뉴에서든 최상단 표시 */}
          {urgentAlerts.length > 0 && (
            <div style={{ marginBottom: '20px', background: '#fff5f5', border: '2px solid #e53e3e', borderRadius: '16px', padding: '16px 20px', boxShadow: '0 4px 16px rgba(229, 62, 62, 0.25)', animation: 'pulse-ring 2s infinite' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                <div style={{ fontWeight: 'bold', color: '#c53030', fontSize: '1.1rem' }}>
                  🚨 긴급 알림 ({urgentAlerts.length}건) — 위기 신호가 감지되었습니다. 즉시 확인해주세요.
                </div>
                {typeof Notification !== 'undefined' && Notification.permission === 'default' && (
                  <button
                    onClick={() => Notification.requestPermission()}
                    style={{ padding: '6px 12px', borderRadius: '10px', border: '1px solid #e53e3e', background: 'white', color: '#c53030', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    🔔 브라우저 푸시 알림 켜기
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {urgentAlerts.map((a, idx) => (
                  <div key={`${a.studentId}-${idx}`} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'white', border: '1px solid #feb2b2', borderRadius: '12px', padding: '10px 14px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '1.4rem' }}>{a.avatar || '👤'}</span>
                    <b style={{ color: '#2d3748' }}>{a.name}</b>
                    <span style={{ color: '#c53030', fontWeight: 600 }}>{a.reason}</span>
                    <span style={{ color: '#a0aec0', fontSize: '0.85rem' }}>{formatAlertTime(a.timestamp)}</span>
                    <button
                      onClick={() => handleAckAlert(a.studentId)}
                      style={{ marginLeft: 'auto', padding: '8px 16px', borderRadius: '10px', border: 'none', background: '#e53e3e', color: 'white', fontWeight: 'bold', fontSize: '0.85rem', cursor: 'pointer' }}
                    >
                      확인 완료
                    </button>
                  </div>
                ))}
              </div>
              <p style={{ margin: '10px 0 0 0', fontSize: '0.8rem', color: '#9c4221' }}>
                💡 [확인 완료]를 누르면 해당 학생의 현재 알림이 해제됩니다. 학생의 대화 내역과 [맞춤 처방] 메뉴에서 후속 지도를 이어가세요.
              </p>
            </div>
          )}

          <div className="header-row" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', marginBottom: '24px' }}>
            <h1 className="dashboard-title" style={{ margin: 0 }}>
              {(activeClass?.className || teacherProfile.className || '우리 반')} 관계망 및 정서 건강
              {activeClass?.isDemo && <span style={{ marginLeft: '10px', fontSize: '0.85rem', color: '#805ad5', background: '#faf5ff', border: '1px solid #d6bcfa', padding: '4px 10px', borderRadius: '12px', verticalAlign: 'middle' }}>🎬 데모 학급</span>}
            </h1>
            <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <div style={{ background: 'rgba(74, 144, 226, 0.1)', border: '1px solid rgba(74, 144, 226, 0.2)', padding: '8px 16px', borderRadius: '12px', fontSize: '0.95rem', color: '#4a5568', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                🔑 학생용 학급 입장 코드: <span style={{ color: 'var(--primary-color)', fontSize: '1.1rem', letterSpacing: '1px' }}>{currentClassCode}</span>
              </div>
              <button
                onClick={() => navigate('/teacher-setup')}
                title="다른 학급으로 전환하거나 새 학급을 만듭니다"
                style={{ padding: '8px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', background: 'white', color: '#4a5568', fontWeight: 'bold', fontSize: '0.9rem', cursor: 'pointer' }}
              >
                🔄 학급 전환
              </button>
            </div>
          </div>
          
          {activeMenu === '대시보드' && (
            <div className="dashboard-grid">
              <Sociogram studentsData={studentsData} />
              <EmotionalSignal studentsData={studentsData} />
              <InterventionTable studentsData={studentsData} />
              <DailyFlow studentsData={studentsData} />
            </div>
          )}
          
          {activeMenu === '학급 분석' && <ClassAnalysis studentsData={studentsData} />}
          {activeMenu === '감정 트래커' && <EmotionTracker studentsData={studentsData} />}
          {activeMenu === '맞춤 처방' && <CustomPrescription studentsData={studentsData} teacherProfile={teacherProfile} />}
          {activeMenu === '학생 관리' && <StudentManagement studentsData={studentsData} classCode={currentClassCode} />}
          {activeMenu === '자리 배치' && <SeatingChart studentsData={studentsData} classCode={currentClassCode} classLabel={activeClass?.className || teacherProfile.className} />}
          {activeMenu === '관계 신호' && <RelationshipWatch studentsData={studentsData} />}
          {activeMenu === '리포트' && <Report studentsData={studentsData} teacherProfile={teacherProfile} />}
          {activeMenu === '에듀테크 리소스' && <EdutechResource />}
        </div>
      </div>
      
      {/* 챗봇 프롬프트 설정 모달 */}
      {isChatbotModalOpen && (
        <ChatbotSettingsModal onClose={() => setIsChatbotModalOpen(false)} />
      )}
      
      {/* 교사 프로필(기본 설정) 모달 */}
      {isTeacherModalOpen && (
        <TeacherSettingsModal 
          onClose={() => setIsTeacherModalOpen(false)} 
          onSave={(data) => setTeacherProfile(data)} 
        />
      )}
    </div>
  );
};

export default TeacherDashboard;
