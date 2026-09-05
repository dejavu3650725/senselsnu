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
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { Check, Users, Settings, FileSignature, Copy, X } from 'lucide-react';

const TeacherDashboard = () => {
  const navigate = useNavigate();
  const [activeMenu, setActiveMenu] = useState('대시보드');
  const [isChatbotModalOpen, setIsChatbotModalOpen] = useState(false);
  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState(false);
  const [studentsData, setStudentsData] = useState([]);
  const [teacherProfile, setTeacherProfile] = useState({ teacherName: '', className: '' });
  const [activeClass, setActiveClass] = useState(null); // 현재 입장한 학급 정보 (다중 학급)
  const [currentUser, setCurrentUser] = useState(null);
  const [focusStudentId, setFocusStudentId] = useState(null); // 대시보드 → 맞춤 처방으로 이동 시 강조할 학생
  const currentClassCode = sessionStorage.getItem('currentClassCode');
  const [quickstartHidden, setQuickstartHidden] = useState(() => { try { return localStorage.getItem(`qs-hidden-${sessionStorage.getItem('currentClassCode')}`) === '1'; } catch { return false; } });
  const [codeCopied, setCodeCopied] = useState(false);

  const openConsent = () => window.open(`/consent/${currentClassCode}`, '_blank', 'noopener');
  const handleLogout = async () => { try { await signOut(auth); } catch { /* ignore */ } sessionStorage.removeItem('currentClassCode'); navigate('/'); };
  const copyCode = async () => { try { await navigator.clipboard.writeText(currentClassCode || ''); setCodeCopied(true); setTimeout(() => setCodeCopied(false), 1500); } catch { /* ignore */ } };
  const hideQuickstart = () => { setQuickstartHidden(true); try { localStorage.setItem(`qs-hidden-${currentClassCode}`, '1'); } catch { /* ignore */ } };

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
        urgentAlerts.push({ studentId: s.id, name: s.realName, avatar: s.avatar, reason: a.reason || '위기 신호 감지', timestamp: a.timestamp, excerpt: a.excerpt || '' });
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
      <Topbar
        teacherProfile={teacherProfile}
        classCode={currentClassCode}
        className={activeClass?.className || teacherProfile.className}
        onSwitchClass={() => navigate('/teacher-setup')}
        onLogout={handleLogout}
        onOpenConsent={openConsent}
      />
      <div className="main-layout">
        <Sidebar 
          activeMenu={activeMenu} 
          setActiveMenu={(menu) => {
            if (menu === '챗봇 설정') setIsChatbotModalOpen(true);
            else if (menu === '기본 설정') setIsTeacherModalOpen(true);
            else setActiveMenu(menu);
          }} 
          teacherProfile={teacherProfile}
          badges={{ '맞춤 처방': urgentAlerts.length }}
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
                    {a.excerpt && (
                      <details style={{ flexBasis: '100%', fontSize: '0.82rem', color: '#4a5568' }}>
                        <summary style={{ cursor: 'pointer', color: '#9c4221', fontWeight: 600 }}>대화 전후 보기</summary>
                        <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: '6px 0 0 0', background: '#fffaf0', padding: '8px 10px', borderRadius: '8px', lineHeight: 1.5 }}>{a.excerpt}</pre>
                      </details>
                    )}
                  </div>
                ))}
              </div>
              <p style={{ margin: '10px 0 0 0', fontSize: '0.8rem', color: '#9c4221' }}>
                💡 [확인 완료]를 누르면 해당 학생의 현재 알림이 해제됩니다. 학생의 대화 내역과 [맞춤 처방] 메뉴에서 후속 지도를 이어가세요.
              </p>
            </div>
          )}

          <div className="header-row" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <h1 className="dashboard-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              {(activeClass?.className || teacherProfile.className || '우리 반')}
              <span style={{ fontWeight: 500, color: 'var(--text-muted)', fontSize: '1rem' }}>관계망 · 정서 건강</span>
              {activeClass?.isDemo && <span className="chip" style={{ color: '#6b46c1', background: '#faf5ff', borderColor: '#d6bcfa' }}>🎬 데모 학급</span>}
            </h1>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              {new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })} · 학생 {studentsData.length}명
              {codeCopied && <span style={{ marginLeft: '8px', color: 'var(--success)', fontWeight: 700 }}>학급 코드 복사됨</span>}
            </div>
          </div>

          {/* 시작 체크리스트 — 학급 준비가 덜 된 동안만 표시 */}
          {activeMenu === '대시보드' && !quickstartHidden && (() => {
            const steps = [
              { key: 'students', done: studentsData.length >= 3, title: '학생 명단 등록', desc: studentsData.length ? `${studentsData.length}명 등록됨` : '실명·닉네임·성별을 한 번에 붙여넣기', action: () => setActiveMenu('학생 관리'), icon: <Users size={15} /> },
              { key: 'chat', done: !!teacherProfile?.chatConfig, title: '챗봇 설정 저장', desc: '말투·관심 주제만 고르면 끝 (1분)', action: () => setIsChatbotModalOpen(true), icon: <Settings size={15} /> },
              { key: 'consent', done: teacherProfile?.chatConfig?.consentConfirmed === true, title: '보호자 안내문 배부', desc: '인쇄·PDF로 가정에 전달 후 동의 확인', action: openConsent, icon: <FileSignature size={15} /> },
              { key: 'code', done: studentsData.some(s => (s.messages || []).length > 0 || (s.sessionDates || []).length > 0), title: '학생 첫 대화', desc: `학급 코드 ${currentClassCode}를 칠판에 적어 주세요`, action: copyCode, icon: <Copy size={15} /> },
            ];
            const doneCount = steps.filter(st => st.done).length;
            if (doneCount === steps.length) return null;
            return (
              <div className="quickstart">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <div style={{ fontWeight: 800, color: 'var(--text-strong)', fontSize: '1rem' }}>🚀 시작하기 {doneCount}/{steps.length}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>네 단계만 끝내면 학급 운영 준비가 완료됩니다.</div>
                  <button onClick={hideQuickstart} title="숨기기" style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: 'var(--text-faint)', cursor: 'pointer', display: 'flex' }}><X size={16} /></button>
                </div>
                <div className="quickstart-steps">
                  {steps.map((st, i) => (
                    <button key={st.key} className={`quickstart-step ${st.done ? 'done' : ''}`} onClick={st.action} style={{ textAlign: 'left', cursor: 'pointer' }}>
                      <div className="step-num">{st.done ? <Check size={14} /> : i + 1}</div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-strong)', display: 'flex', alignItems: 'center', gap: '6px' }}>{st.icon} {st.title}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>{st.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })()}

          {activeMenu === '대시보드' && (
            <div className="dashboard-grid">
              <Sociogram studentsData={studentsData} />
              <div className="dashboard-side">
                <EmotionalSignal studentsData={studentsData} />
                <InterventionTable
                  studentsData={studentsData}
                  onOpenPrescription={(studentId) => { setFocusStudentId(studentId); setActiveMenu('맞춤 처방'); }}
                />
              </div>
              <DailyFlow studentsData={studentsData} transcriptsOn={teacherProfile?.chatConfig?.storeTranscripts === true && teacherProfile?.chatConfig?.consentConfirmed === true} />
            </div>
          )}

          {activeMenu === '학급 분석' && <ClassAnalysis studentsData={studentsData} />}
          {activeMenu === '감정 트래커' && <EmotionTracker studentsData={studentsData} />}
          {activeMenu === '맞춤 처방' && <CustomPrescription studentsData={studentsData} teacherProfile={teacherProfile} focusStudentId={focusStudentId} />}
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
