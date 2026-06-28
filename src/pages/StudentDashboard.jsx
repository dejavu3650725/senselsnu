import React, { useState, useEffect, useRef } from 'react';
import { Send, Smile, ArrowLeft, Frown, Meh } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import StudentTutorial from '../components/StudentTutorial';
import { db } from '../firebase';
import { collection, addDoc, updateDoc, doc, arrayUnion, serverTimestamp, getDocs, getDoc, query, where } from 'firebase/firestore';

const AVATAR_LIST = [
  '🐻', '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐼', '🐨', '🐯',
  '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🦆',
  '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋',
  '🐌', '🐞', '🐜', '🦟', '🐢', '🐍', '🦎', '🦖', '🦕', '🐙',
  '🦑', '🦐', '🦞', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳', '🐋',
  '🦈', '🐊', '🐅', '🐆', '🦓', '🦍', '🦧', '🐘', '🦛', '🦏',
  '🐪', '🐫', '🦒', '🦘', '🐃', '🐂', '🐄', '🐎', '🐖', '🐏',
  '🧑‍🚀', '🦸', '🦹', '🧙', '🧚', '🧛', '🧜', '🧝', '🧞', '🧟',
  '🌳', '🌲', '🌵', '🌴', '🍀', '🍁', '🍄', '🌷', '🌹', '🌻'
];

const StudentDashboard = () => {
  const navigate = useNavigate();
  const chatContainerRef = useRef(null);
  const studentClassCode = sessionStorage.getItem('studentClassCode');

  useEffect(() => {
    if (!studentClassCode) {
      alert("학급 코드가 없습니다. 다시 로그인해주세요.");
      navigate('/');
    }
  }, [studentClassCode, navigate]);
  
  // 흐름 제어: 'tutorial' -> 'setup' -> 'dashboard'
  const [step, setStep] = useState('tutorial');
  
  // 로그인(설정) 관련 상태
  const [realName, setRealName] = useState('');
  const [nickname, setNickname] = useState('');
  const [mood, setMood] = useState('보통'); 
  const [avatar, setAvatar] = useState('🐻');
  const [studentDocId, setStudentDocId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [setupError, setSetupError] = useState('');

  // 채팅 관련 상태
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');

  // 상태 추가: 프로필 수정 모달 및 비속어 차단 모달
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isBanned, setIsBanned] = useState(false);

  // 교사가 설정한 P-TISER 및 SEL 학교급
  const [ptiser, setPtiser] = useState(null);
  const [selLevel, setSelLevel] = useState('');

  // 스크롤 자동 내리기
  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // 해당 학급 선생님의 커스텀 프롬프트 불러오기
    const fetchChatbotSettings = async () => {
      if (!studentClassCode) return;
      try {
        const q = query(collection(db, 'teachers'), where('classCode', '==', studentClassCode));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const teacherDoc = querySnapshot.docs[0];
          if (teacherDoc.data().ptiser) {
            setPtiser(teacherDoc.data().ptiser);
          } else if (teacherDoc.data().customPrompt) {
            setPtiser({ information: teacherDoc.data().customPrompt }); // 구버전 호환
          }
          if (teacherDoc.data().selLevel) {
            setSelLevel(teacherDoc.data().selLevel);
          }
        }
      } catch (error) {
        console.error("Failed to fetch chatbot settings", error);
      }
    };
    fetchChatbotSettings();
  }, [studentClassCode]);

  // 실명 입력 시 기존 데이터 확인해서 닉네임 자동 완성
  const checkExistingStudent = async () => {
    if (!realName.trim() || !studentClassCode) return;
    try {
      const q = query(
        collection(db, 'students'), 
        where('classCode', '==', studentClassCode), 
        where('realName', '==', realName)
      );
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const userData = querySnapshot.docs[0].data();
        if (userData.nickname) setNickname(userData.nickname);
        if (userData.avatar) setAvatar(userData.avatar);
      }
    } catch (error) {
      console.error("Failed to check existing student", error);
    }
  };

  // Firestore 데이터 가져오기 또는 생성 (계정 연동)
  const handleSetupComplete = async () => {
    if (!realName.trim() || !nickname.trim()) {
      setSetupError("실명과 닉네임을 모두 입력해주세요!");
      return;
    }
    
    setIsLoading(true);
    setSetupError('');
    
    try {
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("응답 시간 초과. 데이터베이스 규칙을 확인해주세요.")), 5000)
      );

      // 1. 기존 실명이 있는지 검색 (같은 학급 내에서만)
      const q = query(
        collection(db, 'students'), 
        where('classCode', '==', studentClassCode), 
        where('realName', '==', realName)
      );
      const querySnapshot = await Promise.race([getDocs(q), timeoutPromise]);

      if (!querySnapshot.empty) {
        // 기존 유저 (복원)
        const userDoc = querySnapshot.docs[0];
        const userData = userDoc.data();
        setStudentDocId(userDoc.id);
        
        // 과거 대화 내역 불러오기
        const pastMessages = userData.messages || [];
        
        // 상태 업데이트 (닉네임, 기분 갱신, 아바타 갱신)
        await updateDoc(doc(db, 'students', userDoc.id), {
          nickname: nickname,
          mood: mood,
          avatar: avatar,
          lastActive: serverTimestamp()
        });

        // 환영 메시지 추가
        const welcomeMsg = { 
          id: Date.now(), 
          sender: 'bot', 
          text: `다시 만나서 반가워, ${nickname}! 오늘 기분이 '${mood}' 상태구나. 무슨 일 있었어?` 
        };
        
        setMessages([...pastMessages, welcomeMsg]);
        
      } else {
        // 신규 유저 (생성)
        const newDocRef = await addDoc(collection(db, 'students'), {
          realName: realName,
          nickname: nickname,
          mood: mood,
          avatar: avatar,
          classCode: studentClassCode,
          createdAt: serverTimestamp(),
          lastActive: serverTimestamp(),
          messages: [],
          nominations: [] // 동료 추인 데이터 배열
        });
        
        setStudentDocId(newDocRef.id);
        setMessages([{ 
          id: Date.now(), 
          sender: 'bot', 
          text: `처음 뵙겠습니다, ${nickname}! 오늘 기분이 '${mood}' 상태구나. 어떤 이야기든 편하게 해줘!` 
        }]);
      }

      // 화면 전환
      setStep('dashboard');

    } catch (e) {
      console.error("Setup Error: ", e);
      setSetupError(`연결 에러: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    if (input.trim() === '') return;
    
    // 비속어 및 선정적 단어 광범위 필터링
    const badWords = [
      '시발', '씨발', '병신', '개새끼', '존나', '미친', '좆', '새끼', '뒤져', '욕나오네',
      '꺼져', '퍼큐', '뻐뀨', '뻐큐', '퍽큐', '엿먹어', '씨댕', '지랄', '염병', '호로', 
      '썅', '창녀', '걸레', '니애미', '니기미', '느금마', '애미', '애비', '아가리', '닥쳐', 
      '또라이', '씨팔', '개소리', '개빡', '좃', '좇', 'ㅈㄹ', 'ㅅㅂ', 'ㅄ', 'ㄱㅅㄲ', 'ㅈㄴ', 'ㅁㅊ', 'ㄲㅈ', 'ㅗ',
      '섹스', '야동', '자위', '보지', '자지', '성관계', '야설', '야짤'
    ];
    const hasBadWord = badWords.some(word => input.includes(word));
    
    if (hasBadWord) {
      setIsBanned(true);
      setInput('');
      return;
    }

    const userMsg = input;
    const newMessages = [...messages, { id: Date.now(), sender: 'user', text: userMsg }];
    setMessages(newMessages);
    setInput('');

    // Firebase 유저 메시지 저장
    if (studentDocId) {
      await updateDoc(doc(db, 'students', studentDocId), {
        messages: arrayUnion({ sender: 'user', text: userMsg, timestamp: new Date().toISOString() }),
        lastActive: serverTimestamp()
      });
    }

    try {
      // Gemini API 요구사항: 첫 메시지는 반드시 'user'여야 하며, 'user'와 'model'이 번갈아가며 나타나야 함.
      const formattedHistory = [];
      let currentRole = null;
      let currentText = [];

      newMessages.forEach(m => {
        const role = m.sender === 'user' ? 'user' : 'model';
        if (role !== currentRole) {
          if (currentRole !== null) {
            formattedHistory.push({ role: currentRole, parts: [{ text: currentText.join('\n') }] });
          }
          currentRole = role;
          currentText = [m.text];
        } else {
          currentText.push(m.text);
        }
      });
      if (currentRole !== null) {
        formattedHistory.push({ role: currentRole, parts: [{ text: currentText.join('\n') }] });
      }

      if (formattedHistory.length > 0 && formattedHistory[0].role === 'model') {
        formattedHistory.unshift({ role: 'user', parts: [{ text: '안녕! 챗봇 시작할게.' }] });
      }

      const history = formattedHistory;

      const response = await fetch('/api/gemini-counseling', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: history, ptiser: ptiser, selLevel: selLevel })
      });

      if (!response.ok) throw new Error('API Error');

      const data = await response.json();
      const rawBotText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '앗, 뭐라고 말해야 할지 모르겠어.';
      
      // [NOMINATION: 닉네임] 태그 파싱
      let cleanBotText = rawBotText;
      const nominationMatch = rawBotText.match(/\[NOMINATION:\s*(.*?)\]/);
      let nominatedNickname = null;
      if (nominationMatch) {
        let rawNomination = nominationMatch[1].trim();
        cleanBotText = rawBotText.replace(/\[NOMINATION:\s*.*?\]/g, '').trim();

        try {
          // 현재 학급의 학생 목록 불러와서 퍼지 매칭
          const q = query(collection(db, 'students'), where('classCode', '==', studentClassCode));
          const querySnapshot = await getDocs(q);
          const allStudents = [];
          querySnapshot.forEach(doc => allStudents.push(doc.data()));

          let matchedStudent = allStudents.find(s => s.nickname === rawNomination || s.realName === rawNomination);
          
          if (!matchedStudent) {
            // 조사 제거나 부분 일치로 찾기 ('수안이', '이수안', '수안')
            const searchName = rawNomination.replace(/[은는이가랑하고의]$/g, '').trim();
            matchedStudent = allStudents.find(s => 
              (s.nickname && s.nickname.includes(searchName)) || 
              (s.realName && s.realName.includes(searchName)) ||
              (searchName.includes(s.nickname)) ||
              (searchName.includes(s.realName))
            );
          }
          
          if (matchedStudent) {
            nominatedNickname = matchedStudent.nickname; // 통합된 공식 닉네임으로 통일하여 저장
          } else {
            nominatedNickname = rawNomination; // 매칭 실패 시 원본 그대로 저장
          }
        } catch (e) {
          console.error("퍼지 매칭 에러:", e);
          nominatedNickname = rawNomination;
        }
      }

      setMessages(prev => [...prev, { id: Date.now(), sender: 'bot', text: cleanBotText }]);

      // Firebase 봇 메시지 및 관계 데이터 저장
      if (studentDocId) {
        const updates = {
          messages: arrayUnion({ sender: 'bot', text: cleanBotText, timestamp: new Date().toISOString() })
        };
        if (nominatedNickname) {
          updates.nominations = arrayUnion(nominatedNickname);
        }
        await updateDoc(doc(db, 'students', studentDocId), updates);
      }
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { id: Date.now(), sender: 'bot', text: '앗, 내가 잠깐 생각 정리 중이야. 🍃' }]);
    }
  };

  // 아바타 변경 함수
  const handleChangeAvatar = async (newAvatar) => {
    setAvatar(newAvatar);
    if (studentDocId) {
      await updateDoc(doc(db, 'students', studentDocId), {
        avatar: newAvatar
      });
    }
    setIsEditingProfile(false);
  };

  // 1. 튜토리얼 화면
  if (step === 'tutorial') {
    return <StudentTutorial onComplete={() => setStep('setup')} />;
  }

  // 2. 초기 설정 팝업 (모달)
  if (step === 'setup') {
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
        <div style={{ background: 'white', padding: '40px', borderRadius: '24px', width: '90%', maxWidth: '400px', textAlign: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
          <h2 style={{ marginTop: 0, color: 'var(--primary-color)' }}>프로필 만들기 🎨</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>나의 진짜 이름과 여기서 사용할 닉네임을 적어주세요!</p>
          
          <div style={{ marginBottom: '16px', textAlign: 'left' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: 'var(--text-main)' }}>내 이름 (실명)</label>
            <input 
              type="text" 
              value={realName} 
              onChange={e => setRealName(e.target.value)}
              onBlur={checkExistingStudent}
              placeholder="예: 홍길동"
              style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '1rem', outline: 'none' }}
            />
          </div>

          <div style={{ marginBottom: '20px', textAlign: 'left' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: 'var(--text-main)' }}>사용할 닉네임</label>
            <input 
              type="text" 
              value={nickname} 
              onChange={e => setNickname(e.target.value)}
              placeholder="예: 고민많은 타이거"
              style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '1rem', outline: 'none' }}
            />
            <p style={{ margin: '8px 0 0 0', fontSize: '0.8rem', color: '#a0aec0' }}>* 이전에 쓰던 실명을 입력하면 내 데이터가 그대로 복원됩니다!</p>
          </div>

          <div style={{ marginBottom: '20px', textAlign: 'left' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: 'var(--text-main)' }}>나의 캐릭터</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px', maxHeight: '150px', overflowY: 'auto', padding: '4px' }}>
              {AVATAR_LIST.map(emoji => (
                <button 
                  key={emoji}
                  onClick={() => setAvatar(emoji)}
                  style={{ 
                    padding: '8px 0', fontSize: '1.5rem', background: avatar === emoji ? '#edf2f7' : 'white', 
                    border: avatar === emoji ? '2px solid var(--primary-color)' : '1px solid #e2e8f0',
                    borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', justifyContent: 'center', alignItems: 'center'
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: '30px', textAlign: 'left' }}>
            <label style={{ display: 'block', marginBottom: '12px', fontWeight: 'bold', color: 'var(--text-main)' }}>오늘의 기분은 어때요?</label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setMood('건강')} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: mood === '건강' ? '2px solid #48bb78' : '1px solid #e2e8f0', background: mood === '건강' ? '#f0fff4' : 'white', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <Smile color="#48bb78" /> <span>좋음</span>
              </button>
              <button onClick={() => setMood('보통')} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: mood === '보통' ? '2px solid #ecc94b' : '1px solid #e2e8f0', background: mood === '보통' ? '#fffff0' : 'white', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <Meh color="#ecc94b" /> <span>보통</span>
              </button>
              <button onClick={() => setMood('힘듦')} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: mood === '힘듦' ? '2px solid #e53e3e' : '1px solid #e2e8f0', background: mood === '힘듦' ? '#fff5f5' : 'white', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <Frown color="#e53e3e" /> <span>힘듦</span>
              </button>
            </div>
          </div>

          {setupError && (
            <div style={{ color: '#e53e3e', fontSize: '0.9rem', marginBottom: '16px', fontWeight: 'bold' }}>
              {setupError}
            </div>
          )}

          <button 
            onClick={handleSetupComplete} 
            disabled={isLoading}
            style={{ 
              width: '100%', padding: '16px', background: isLoading ? '#a0aec0' : 'var(--primary-color)', 
              color: 'white', border: 'none', borderRadius: '12px', fontSize: '1.1rem', fontWeight: 'bold', 
              cursor: isLoading ? 'not-allowed' : 'pointer', boxShadow: '0 4px 12px rgba(74, 144, 226, 0.3)' 
            }}
          >
            {isLoading ? '연결 중...' : '상담 시작하기'}
          </button>
        </div>
      </div>
    );
  }

  // 3. 메인 대시보드 화면
  return (
    <div className="app-container" style={{ background: 'var(--avatar-blue)' }}>
      <div className="topbar" style={{ background: 'rgba(255, 255, 255, 0.9)', color: 'var(--text-main)', borderBottom: '1px solid #e2e8f0' }}>
        <div className="topbar-title" style={{ gap: '16px' }}>
          <ArrowLeft size={20} style={{ cursor: 'pointer', color: 'var(--primary-color)' }} onClick={() => navigate('/')} />
          <Smile size={28} color="var(--primary-color)" />
          <span translate="no" className="notranslate" style={{ color: 'var(--primary-color)' }}>SEN-SEL-SNU</span>
        </div>
        <div className="topbar-actions">
          <button 
            onClick={() => setIsEditingProfile(true)}
            style={{ background: 'white', border: '1px solid #e2e8f0', padding: '8px 16px', borderRadius: '20px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', transition: 'all 0.2s' }}
          >
            <span style={{ fontSize: '1.2rem' }}>{avatar}</span> 
            <span>{nickname}</span>
            <span style={{ fontSize: '0.8rem', color: '#a0aec0', marginLeft: '4px' }}>✏️ 변경</span>
          </button>
        </div>
      </div>

      {/* 캐릭터 변경 모달 */}
      {isEditingProfile && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100 }}>
          <div style={{ background: 'white', padding: '32px', borderRadius: '24px', width: '90%', maxWidth: '400px', textAlign: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <h3 style={{ marginTop: 0, color: 'var(--text-main)' }}>내 캐릭터 변경하기</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px', maxHeight: '300px', overflowY: 'auto', padding: '4px', marginBottom: '24px' }}>
              {AVATAR_LIST.map(emoji => (
                <button 
                  key={emoji}
                  onClick={() => handleChangeAvatar(emoji)}
                  style={{ 
                    padding: '8px 0', fontSize: '1.5rem', background: avatar === emoji ? '#edf2f7' : 'white', 
                    border: avatar === emoji ? '2px solid var(--primary-color)' : '1px solid #e2e8f0',
                    borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', justifyContent: 'center', alignItems: 'center'
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>
            <button 
              onClick={() => setIsEditingProfile(false)}
              style={{ width: '100%', padding: '12px', background: '#e2e8f0', color: '#4a5568', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              닫기
            </button>
          </div>
        </div>
      )}

      {/* 비속어 경고 모달 */}
      {isBanned && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 }}>
          <div className="glass-card" style={{ background: 'white', padding: '40px', borderRadius: '24px', width: '90%', maxWidth: '400px', textAlign: 'center', animation: 'slideUp 0.3s ease-out' }}>
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🚨</div>
            <h2 style={{ marginTop: 0, color: '#e53e3e', fontSize: '1.8rem' }}>경고</h2>
            <p style={{ color: '#4a5568', fontSize: '1.1rem', lineHeight: '1.6', marginBottom: '32px' }}>
              적절하지 않은 언어 사용은 금지됩니다.<br/>
              <b>바른 언어를 사용하시겠습니까?</b>
            </p>
            <button 
              onClick={() => setIsBanned(false)}
              style={{ width: '100%', padding: '16px', background: '#e53e3e', color: 'white', border: 'none', borderRadius: '12px', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer', transition: 'background 0.2s' }}
            >
              네, 바른 말을 쓰겠습니다
            </button>
          </div>
        </div>
      )}

      <div className="main-layout" style={{ background: 'transparent', padding: '24px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div className="glass-card" style={{ width: '100%', maxWidth: '800px', height: '80vh', display: 'flex', flexDirection: 'column', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.1)' }}>
          <div style={{ padding: '24px', background: 'white', display: 'flex', alignItems: 'center', gap: '16px', borderBottom: '1px solid #edf2f7' }}>
            <div style={{ width: 60, height: 60, background: '#e9d8fd', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '2rem', boxShadow: '0 4px 12px rgba(233, 216, 253, 1)' }}>🌳</div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.4rem', color: '#4a5568' }}>든든한 나무 챗봇</h2>
              <p style={{ margin: 0, color: '#a0aec0', fontSize: '0.9rem' }}>너의 이야기를 항상 들어줄게!</p>
            </div>
          </div>

          <div ref={chatContainerRef} style={{ flex: 1, padding: '32px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px', background: '#f8fafc' }}>
            {messages.map((msg, idx) => (
              <div key={msg.id || idx} style={{ display: 'flex', gap: '12px', alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start', maxWidth: '70%' }}>
                {msg.sender === 'bot' && <div style={{ fontSize: '2rem' }}>🌳</div>}
                <div style={{ 
                  background: msg.sender === 'user' ? 'var(--primary-color)' : 'white', 
                  color: msg.sender === 'user' ? 'white' : '#2d3748',
                  padding: '16px 20px', 
                  borderRadius: '24px', 
                  borderTopRightRadius: msg.sender === 'user' ? '4px' : '24px',
                  borderTopLeftRadius: msg.sender === 'bot' ? '4px' : '24px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                  fontSize: '1.1rem',
                  lineHeight: '1.5',
                  wordBreak: 'break-word'
                }}>
                  {msg.text}
                </div>
              </div>
            ))}
          </div>

          <div style={{ padding: '24px', background: 'white', borderTop: '1px solid #edf2f7', display: 'flex', gap: '16px' }}>
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="여기에 편하게 속마음을 적어봐..." 
              style={{ flex: 1, padding: '16px 24px', fontSize: '1.1rem', borderRadius: '30px', border: '1px solid #cbd5e1', outline: 'none', background: '#f1f5f9' }}
            />
            <button 
              onClick={handleSend}
              style={{ width: 60, height: 60, borderRadius: '50%', background: 'var(--primary-color)', color: 'white', border: 'none', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', boxShadow: '0 4px 12px rgba(74, 144, 226, 0.4)' }}
            >
              <Send size={24} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
