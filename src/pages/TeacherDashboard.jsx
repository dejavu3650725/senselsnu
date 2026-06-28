import React, { useState, useEffect } from 'react';
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
import { db, auth } from '../firebase';
import { collection, onSnapshot, query, orderBy, where, doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

const TeacherDashboard = () => {
  const navigate = useNavigate();
  const [activeMenu, setActiveMenu] = useState('대시보드');
  const [isChatbotModalOpen, setIsChatbotModalOpen] = useState(false);
  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState(false);
  const [studentsData, setStudentsData] = useState([]);
  const [teacherProfile, setTeacherProfile] = useState({ teacherName: '', className: '' });
  const [currentUser, setCurrentUser] = useState(null);
  const currentClassCode = sessionStorage.getItem('currentClassCode');

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
          <div className="header-row" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', marginBottom: '24px' }}>
            <h1 className="dashboard-title" style={{ margin: 0 }}>{teacherProfile.className || '3학년 A반'} 관계망 및 정서 건강</h1>
            <div style={{ marginTop: '12px', background: 'rgba(74, 144, 226, 0.1)', border: '1px solid rgba(74, 144, 226, 0.2)', padding: '8px 16px', borderRadius: '12px', fontSize: '0.95rem', color: '#4a5568', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
              🔑 학생용 학급 입장 코드: <span style={{ color: 'var(--primary-color)', fontSize: '1.1rem', letterSpacing: '1px' }}>{currentClassCode}</span>
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
          {activeMenu === '학생 관리' && <StudentManagement studentsData={studentsData} />}
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
