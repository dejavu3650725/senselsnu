import React, { useState, useEffect, useRef } from 'react';
import { Send, Smile, ArrowLeft, Frown, Meh } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import StudentTutorial from '../components/StudentTutorial';
import { db } from '../firebase';
import { collection, addDoc, updateDoc, doc, arrayUnion, serverTimestamp, getDocs, getDoc, query, where } from 'firebase/firestore';
import { apiPost, ensureStudentSession } from '../utils/apiClient';
import { seoulGradeLabel } from '../utils/seoulSel';
import { skillsForLevel, areaOfSkill, monthlySkillCounts, badgeFor, defaultMission, missionById, weekKey, dayKey } from '../utils/growth';
import GrowthPanel from '../components/GrowthPanel';
import { studentPromises } from '../utils/aiGuideline';

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
  const [gender, setGender] = useState('');
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
  const [gradeYear, setGradeYear] = useState(null);
  const [isTyping, setIsTyping] = useState(false); // 챗봇 응답 대기 표시
  const [chatConfig, setChatConfig] = useState(null); // 교사 챗봇 설정(프리셋)
  // 대화 원문 보관 여부: 교사가 [챗봇 설정]에서 보호자 동의 확인 후 켠 경우에만 저장 (기본: 신호만 저장)
  const storeTranscripts = chatConfig?.storeTranscripts === true && chatConfig?.consentConfirmed === true;
  const [studentMeta, setStudentMeta] = useState({ nominations: [], conflictsCount: 0, lonelyCount: 0, sessionsCount: 1 }); // 학생 맞춤 대화용 이력
  const [skillLog, setSkillLog] = useState([]);       // 성장 기록: [{skill, area, date}]
  const [missionsDone, setMissionsDone] = useState([]); // [{weekKey, missionId, doneAt}]
  const [classMission, setClassMission] = useState(null); // classes/{code}.mission (교사 지정) 없으면 기본 순환
  const [growthOpen, setGrowthOpen] = useState(false);
  // AI 활용 약속 (서울시교육청 가이드라인 학생 핵심 가이드 5·3·6) — 기기당 1회, 학교급 바뀌면 다시
  const [promiseDone, setPromiseDone] = useState(() => { try { return localStorage.getItem('sensel-ai-promise') === (sessionStorage.getItem('studentClassCode') || 'x'); } catch { return false; } });
  const acceptPromise = () => { setPromiseDone(true); try { localStorage.setItem('sensel-ai-promise', sessionStorage.getItem('studentClassCode') || 'x'); } catch { /* ignore */ } };
  const [growthToast, setGrowthToast] = useState('');
  const gradeLabelForSkills = seoulGradeLabel(selLevel, gradeYear);
  const validSkills = skillsForLevel(gradeLabelForSkills).map(s => s.skill);
  const thisWeek = weekKey();
  const mission = (classMission && classMission.weekKey === thisWeek && missionById(classMission.missionId)) || defaultMission(thisWeek);
  const missionDone = missionsDone.some(m => m && m.weekKey === thisWeek);
  const monthCounts = monthlySkillCounts(skillLog);
  const [turnsToday, setTurnsToday] = useState(0);            // 오늘 보낸 메시지 수 (하루 상한용, 새로고침해도 유지)
  const [complaintCounts, setComplaintCounts] = useState({}); // 이번 세션 친구별 갈등 언급 횟수 (반복 호소 완화용)
  const [alertedToday, setAlertedToday] = useState(false);    // 오늘 이미 긴급 알림이 기록됐는지 (하루 1건)
  const todayKey = new Date().toISOString().slice(0, 10);
  const dailyLimit = Number(chatConfig?.dailyTurnLimit ?? 30);
  const limitReached = dailyLimit > 0 && turnsToday >= dailyLimit;
  // 학급 친구 닉네임 명단 (LLM이 문맥 추론으로 공식 닉네임에 매핑할 수 있도록 전달)
  const [roster, setRoster] = useState([]);

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
  }, [messages, isTyping]);

  useEffect(() => {
    // 해당 학급 선생님의 커스텀 프롬프트 불러오기
    const fetchChatbotSettings = async () => {
      if (!studentClassCode) return;
      // 새로고침/직접 진입 시에도 익명 로그인 + 학급 세션 보장 (보안 규칙 통과용)
      try { await ensureStudentSession(studentClassCode); } catch (e) { console.error('Student session error', e); }
      try {
        let teacherData = null;

        // 1) 새 구조: classes/{학급코드} → 담당 교사 문서에서 설정 로드 (다중 학급 지원)
        const classSnap = await getDoc(doc(db, 'classes', studentClassCode));
        if (classSnap.exists() && classSnap.data().mission) setClassMission(classSnap.data().mission);
        if (classSnap.exists() && classSnap.data().teacherUid) {
          const tSnap = await getDoc(doc(db, 'teachers', classSnap.data().teacherUid));
          if (tSnap.exists()) teacherData = tSnap.data();
        }

        // 2) 하위 호환: 기존 teachers 컬렉션에서 classCode로 검색
        if (!teacherData) {
          const q = query(collection(db, 'teachers'), where('classCode', '==', studentClassCode));
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) teacherData = querySnapshot.docs[0].data();
        }

        if (teacherData) {
          if (teacherData.ptiser) {
            setPtiser(teacherData.ptiser);
          } else if (teacherData.customPrompt) {
            setPtiser({ information: teacherData.customPrompt }); // 구버전 호환
          }
          if (teacherData.selLevel) {
            setSelLevel(teacherData.selLevel);
          }
          if (teacherData.gradeYear) setGradeYear(teacherData.gradeYear);
          if (teacherData.chatConfig) setChatConfig(teacherData.chatConfig);
        }
      } catch (error) {
        console.error("Failed to fetch chatbot settings", error);
      }

      // 학급 닉네임 명단 로드 (실명 제외, 닉네임만)
      try {
        const rq = query(collection(db, 'students'), where('classCode', '==', studentClassCode));
        const rSnap = await getDocs(rq);
        const nicks = [];
        rSnap.forEach(d => {
          const nick = d.data().nickname;
          if (nick) nicks.push(nick);
        });
        setRoster([...new Set(nicks)].slice(0, 60));
      } catch (error) {
        console.error("Failed to fetch class roster", error);
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
        if (userData.gender) setGender(userData.gender);
      }
    } catch (error) {
      console.error("Failed to check existing student", error);
    }
  };

  /** 이번 주 미션 "했어요" — 학생 문서에 주차 키로 기록 (주 1회) */
  const handleMissionDone = async () => {
    if (!studentDocId || missionDone) return;
    const entry = { weekKey: thisWeek, missionId: mission.id, doneAt: new Date().toISOString() };
    setMissionsDone(prev => [...prev, entry]);
    try { await updateDoc(doc(db, 'students', studentDocId), { missions: arrayUnion(entry) }); } catch (e) { console.error('mission save error', e); }
    setGrowthToast('🎉 미션 완료! 선생님도 볼 수 있어.');
    setTimeout(() => setGrowthToast(''), 3500);
  };

  // Firestore 데이터 가져오기 또는 생성 (계정 연동)
  const handleSetupComplete = async () => {
    if (!realName.trim() || !nickname.trim()) {
      setSetupError("실명과 닉네임을 모두 입력해주세요!");
      return;
    }
    if (gender !== '남' && gender !== '여') {
      setSetupError("성별(남/여)을 선택해주세요!");
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
        // 학생 맞춤 대화용 이력 (지목한 친구·갈등·외로움·누적 대화 일수)
        const days = new Set([
          ...(userData.sessionDates || []),
          ...pastMessages.filter(m => m.sender === 'user' && m.timestamp).map(m => String(m.timestamp).slice(0, 10)),
        ]);
        setStudentMeta({
          nominations: userData.nominations || [],
          conflictsCount: (userData.conflicts || []).length,
          lonelyCount: (userData.lonelySignals || []).length,
          sessionsCount: days.size + 1,
        });
        setSkillLog(Array.isArray(userData.skillLog) ? userData.skillLog : []);
        setMissionsDone(Array.isArray(userData.missions) ? userData.missions : []);
        if (userData.dailyTurns && userData.dailyTurns.date === new Date().toISOString().slice(0, 10)) setTurnsToday(Number(userData.dailyTurns.count) || 0);
        if ((userData.alerts || []).some(a => a && a.timestamp && String(a.timestamp).slice(0, 10) === new Date().toISOString().slice(0, 10))) setAlertedToday(true);
        
        // 상태 업데이트 (닉네임, 기분 갱신, 아바타 갱신)
        await updateDoc(doc(db, 'students', userDoc.id), {
          nickname: nickname,
          mood: mood,
          avatar: avatar,
          gender: gender,
          lastActive: serverTimestamp(),
          sessionDates: arrayUnion(new Date().toISOString().slice(0, 10))
        });

        // 환영 메시지 추가
        const welcomeMsg = { 
          id: Date.now(), 
          sender: 'bot', 
          text: `다시 만나서 반가워, ${nickname}! 오늘 기분은 '${mood}'이구나. 지난번 이후로 어떻게 지냈어?` 
        };
        
        setMessages([...pastMessages, welcomeMsg]);
        
      } else {
        // 신규 유저 (생성)
        const newDocRef = await addDoc(collection(db, 'students'), {
          realName: realName,
          nickname: nickname,
          mood: mood,
          avatar: avatar,
          gender: gender,
          classCode: studentClassCode,
          createdAt: serverTimestamp(),
          lastActive: serverTimestamp(),
          messages: [],
          nominations: [], // 동료 추인(긍정 지목) 데이터 배열
          conflicts: [], // 갈등 신호 (학생이 자발적으로 언급한 경우만)
          lonelySignals: [], // 외로움 신호 발생 시각 목록
          sessionDates: [new Date().toISOString().slice(0, 10)] // 대화한 날짜 (원문 미보관 시에도 누적 대화 일수 계산용)
        });
        
        setStudentDocId(newDocRef.id);
        setMessages([{ 
          id: Date.now(), 
          sender: 'bot', 
          text: `안녕, ${nickname}! 나는 네 이야기를 들어주는 나무야. 오늘 기분이 '${mood}'이구나. 어떤 이야기든 편하게 해줘!` 
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

  const handleSend = async (presetText) => {
    const raw = typeof presetText === 'string' ? presetText : input;
    if (raw.trim() === '' || isTyping || limitReached) return;
    
    // 비속어 및 선정적 단어 광범위 필터링
    const badWords = [
      '시발', '씨발', '병신', '개새끼', '존나', '미친', '좆', '새끼', '뒤져', '욕나오네',
      '꺼져', '퍼큐', '뻐뀨', '뻐큐', '퍽큐', '엿먹어', '씨댕', '지랄', '염병', '호로', 
      '썅', '창녀', '걸레', '니애미', '니기미', '느금마', '애미', '애비', '아가리', '닥쳐', 
      '또라이', '씨팔', '개소리', '개빡', '좃', '좇', 'ㅈㄹ', 'ㅅㅂ', 'ㅄ', 'ㄱㅅㄲ', 'ㅈㄴ', 'ㅁㅊ', 'ㄲㅈ', 'ㅗ',
      '섹스', '야동', '자위', '보지', '자지', '성관계', '야설', '야짤'
    ];
    const hasBadWord = badWords.some(word => raw.includes(word));
    
    if (hasBadWord) {
      setIsBanned(true);
      setInput('');
      return;
    }

    const userMsg = raw.trim();
    const newMessages = [...messages, { id: Date.now(), sender: 'user', text: userMsg }];
    setMessages(newMessages);
    setInput('');
    setIsTyping(true);

    // Firebase 유저 메시지 저장 — 원문 보관이 켜진 학급만 저장 (기본은 신호만 저장)
    if (studentDocId) {
      const upd = { lastActive: serverTimestamp(), dailyTurns: { date: todayKey, count: turnsToday + 1 } };
      if (storeTranscripts) upd.messages = arrayUnion({ sender: 'user', text: userMsg, timestamp: new Date().toISOString() });
      await updateDoc(doc(db, 'students', studentDocId), upd);
    }
    setTurnsToday(t => t + 1);

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

      // 오늘 세션의 학생 메시지 수(현재 포함) — 서버가 대화 단계를 정하는 데 사용
      const today = new Date().toISOString().slice(0, 10);
      const turnCount = newMessages.filter(m => m.sender === 'user' && (!m.timestamp || String(m.timestamp).slice(0, 10) === today)).length;
      const studentContext = {
        nickname,
        mood,
        turnCount,
        sessionsCount: studentMeta.sessionsCount,
        nominations: studentMeta.nominations,
        conflictsCount: studentMeta.conflictsCount,
        lonelyCount: studentMeta.lonelyCount,
        turnLimit: dailyLimit,
        turnCount: dailyLimit > 0 ? turnsToday + 1 : turnCount, // 상한이 있으면 '오늘 누적' 기준
        repeatedPeers: Object.entries(complaintCounts).filter(([, n]) => n >= 2).map(([nick]) => nick),
      };
      const response = await apiPost('/api/gemini-counseling', { contents: history, ptiser, selLevel, gradeYear, roster, chatConfig, studentContext });

      if (!response.ok) throw new Error('API Error');

      const data = await response.json();
      const rawBotText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '앗, 뭐라고 말해야 할지 모르겠어.';
      
      // [NOMINATION] / [CONFLICT] / [LONELY] / [ALERT] 태그 파싱
      // - NOMINATION: 긍정적 지목 (추인법)
      // - CONFLICT: 학생이 자발적으로 언급한 갈등 신호
      // - LONELY: 외로움/고립감 신호
      // - ALERT: 위기 신호 (학교폭력·자해 암시 등) → 교사 대시보드 긴급 알림
      const nominationMatch = rawBotText.match(/\[NOMINATION:\s*(.*?)\]/);
      const conflictMatches = [...rawBotText.matchAll(/\[CONFLICT:\s*(.*?)\]/g)];
      const isLonelySignal = /\[LONELY\]/.test(rawBotText);
      const alertMatch = rawBotText.match(/\[ALERT:?\s*(.*?)\]/);
      const skillMatch = rawBotText.match(/\[SKILL:\s*(.*?)\]/);
      const practicedSkill = skillMatch && validSkills.includes(skillMatch[1].trim()) ? skillMatch[1].trim() : null;
      const cleanBotText = rawBotText
        .replace(/\[SKILL:\s*.*?\]/g, '')
        .replace(/\[NOMINATION:\s*.*?\]/g, '')
        .replace(/\[CONFLICT:\s*.*?\]/g, '')
        .replace(/\[LONELY\]/g, '')
        .replace(/\[ALERT:?\s*.*?\]/g, '')
        .trim();

      let nominatedNickname = null;
      let conflictNicknames = [];

      if (nominationMatch || conflictMatches.length > 0) {
        // 현재 학급의 학생 목록 불러와서 퍼지 매칭
        const allStudents = [];
        try {
          const q = query(collection(db, 'students'), where('classCode', '==', studentClassCode));
          const querySnapshot = await getDocs(q);
          querySnapshot.forEach(doc => allStudents.push(doc.data()));
        } catch (e) {
          console.error('학생 목록 조회 에러:', e);
        }

        // 한글 음절 → 초성 변환 ("정민" → "ㅈㅁ")
        const CHO = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
        const toChosung = (str) => [...String(str)].map(ch => {
          const code = ch.charCodeAt(0) - 0xac00;
          return (code >= 0 && code < 11172) ? CHO[Math.floor(code / 588)] : ch;
        }).join('');

        // 고도화 퍼지 매칭: 완전 일치 → 조사 제거·부분 일치 → 초성 일치 ("ㅈㅁ이" → 정민)
        const fuzzyMatch = (rawName) => {
          if (!rawName) return null;
          let matched = allStudents.find(s => s.nickname === rawName || s.realName === rawName);
          if (!matched) {
            const searchName = rawName.replace(/[은는이가랑하고의]$/g, '').trim();
            matched = allStudents.find(s =>
              (s.nickname && s.nickname.includes(searchName)) ||
              (s.realName && s.realName.includes(searchName)) ||
              (s.nickname && searchName.includes(s.nickname)) ||
              (s.realName && searchName.includes(s.realName))
            );
          }
          if (!matched) {
            // 초성 매칭: "ㅈㅁ이", "ㅈㅁ" 처럼 초성으로 부른 경우 학급 명단과 교차 검증
            const chosungQuery = rawName.replace(/[^ㄱ-ㅎ]/g, '');
            if (chosungQuery.length >= 2) {
              matched = allStudents.find(s =>
                toChosung(s.realName || '').includes(chosungQuery) ||
                toChosung(s.nickname || '').includes(chosungQuery)
              );
            }
          }
          return matched ? matched.nickname : rawName; // 매칭 실패 시 원본 그대로 저장
        };

        if (nominationMatch) {
          nominatedNickname = fuzzyMatch(nominationMatch[1].trim());
        }
        conflictNicknames = [...new Set(
          conflictMatches.map(m => fuzzyMatch(m[1].trim())).filter(Boolean)
        )];
      }

      setMessages(prev => [...prev, { id: Date.now(), sender: 'bot', text: cleanBotText }]);

      // Firebase 봇 메시지 및 관계 데이터 저장
      if (studentDocId) {
        const updates = {};
        if (storeTranscripts) {
          updates.messages = arrayUnion({ sender: 'bot', text: cleanBotText, timestamp: new Date().toISOString() });
        }
        if (nominatedNickname) {
          updates.nominations = arrayUnion(nominatedNickname);
        }
        if (conflictNicknames.length > 0 && chatConfig?.collectConflicts !== false) {
          // 갈등 언급은 '학생의 주관적 보고'로 기록. 같은 친구 반복 언급은 conflicts(상대 목록)에는 한 번만,
          // conflictMentions(횟수 로그)에는 매번 남겨 교사가 '반복 호소' 패턴을 볼 수 있게 한다.
          const fresh = conflictNicknames.filter(n => (complaintCounts[n] || 0) < 2);
          if (fresh.length > 0) updates.conflicts = arrayUnion(...fresh);
          updates.conflictMentions = arrayUnion(...conflictNicknames.map(n => ({ target: n, timestamp: new Date().toISOString() })));
        }
        if (isLonelySignal) {
          updates.lonelySignals = arrayUnion(new Date().toISOString()); // 외로움 신호 저장
        }
        if (practicedSkill && !skillLog.some(e => e && e.skill === practicedSkill && e.date === dayKey())) {
          // 성장 기록: 같은 기술은 하루 1회만 기록 (배지 부풀리기 방지)
          const entry = { skill: practicedSkill, area: areaOfSkill(gradeLabelForSkills, practicedSkill), date: dayKey() };
          updates.skillLog = arrayUnion(entry);
          setSkillLog(prev => [...prev, entry]);
          setGrowthToast(`🌱 「${practicedSkill}」 연습 기록!`);
          setTimeout(() => setGrowthToast(''), 3500);
        }
        if (alertMatch && !alertedToday) { // 하루 1건: 같은 날 반복 알림은 첫 알림의 '대화 전후'와 반복 호소 로그로 확인
          // 위기 신호(긴급 알림) 저장 → 교사 대시보드에 실시간 Red Alert 표시
          // 원문 보관이 꺼져 있어도 위기 신호 전후 대화(학생 발화 최근 3개 + 챗봇 응답)는 아동 보호 목적으로 남긴다
          const recentUser = newMessages.filter(m => m.sender === 'user').slice(-3).map(m => m.text);
          updates.alerts = arrayUnion({
            reason: (alertMatch[1] || '위기 신호 감지').trim(),
            timestamp: new Date().toISOString(),
            excerpt: [...recentUser.map(t => `학생: ${t}`), `챗봇: ${cleanBotText}`].join('\n').slice(0, 1200)
          });
        }
        if (Object.keys(updates).length > 0) await updateDoc(doc(db, 'students', studentDocId), updates);
      }
      if (conflictNicknames.length > 0) setComplaintCounts(prev => { const n = { ...prev }; conflictNicknames.forEach(k => { n[k] = (n[k] || 0) + 1; }); return n; });
      if (alertMatch) setAlertedToday(true);
      // 다음 턴 맥락 갱신
      setStudentMeta(prev => ({
        ...prev,
        nominations: nominatedNickname && !prev.nominations.includes(nominatedNickname) ? [...prev.nominations, nominatedNickname] : prev.nominations,
        conflictsCount: prev.conflictsCount + conflictNicknames.length,
        lonelyCount: prev.lonelyCount + (isLonelySignal ? 1 : 0),
      }));
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { id: Date.now(), sender: 'bot', text: '앗, 내가 잠깐 생각 정리 중이야. 🍃' }]);
    } finally {
      setIsTyping(false);
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
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: 'var(--text-main)' }}>나는</label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setGender('남')}
                style={{
                  flex: 1, padding: '12px', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem',
                  border: gender === '남' ? '2px solid #2b6cb0' : '1px solid #e2e8f0',
                  background: gender === '남' ? '#ebf8ff' : 'white', color: '#2b6cb0'
                }}
              >
                👦 남자
              </button>
              <button
                onClick={() => setGender('여')}
                style={{
                  flex: 1, padding: '12px', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem',
                  border: gender === '여' ? '2px solid #b83280' : '1px solid #e2e8f0',
                  background: gender === '여' ? '#fff5f7' : 'white', color: '#b83280'
                }}
              >
                👧 여자
              </button>
            </div>
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

  // 3. 메인 대화 화면
  const botName = chatConfig?.botName || '나무';
  const userTurns = messages.filter(m => m.sender === 'user').length;
  const lastIsBot = messages.length === 0 || messages[messages.length - 1].sender === 'bot';
  const quickReplies = !isTyping && lastIsBot && input.trim() === ''
    ? (userTurns === 0
      ? ['오늘 재밌는 일이 있었어!', '그냥 그랬어', '좀 힘든 일이 있었어']
      : userTurns < 6
        ? ['친구 얘기 하고 싶어', '비밀 얘기가 있어', '오늘은 여기까지 할래']
        : ['오늘은 여기까지 할래'])
    : [];

  return (
    <div className="app-container" style={{ background: 'linear-gradient(180deg, #eef4ff 0%, #f5f7fb 100%)' }}>
      <div className="topbar" style={{ background: 'rgba(255,255,255,0.92)', color: 'var(--text-main)', borderBottom: '1px solid var(--border)', backdropFilter: 'blur(8px)' }}>
        <div className="topbar-title" style={{ gap: '12px' }}>
          <button onClick={() => navigate('/')} title="처음으로" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: '4px' }}><ArrowLeft size={20} /></button>
          <div className="topbar-brand-mark" style={{ background: 'var(--primary-light)', color: 'var(--primary-color)' }}><Smile size={18} /></div>
          <span translate="no" className="notranslate" style={{ color: 'var(--text-strong)' }}>센셀</span>
        </div>
        <div className="topbar-actions">
          <button
            onClick={() => setIsEditingProfile(true)}
            title="내 캐릭터 바꾸기"
            style={{ background: 'white', border: '1px solid var(--border)', padding: '6px 12px 6px 8px', borderRadius: '999px', cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', boxShadow: 'var(--shadow-xs)' }}
          >
            <span style={{ fontSize: '1.25rem', lineHeight: 1 }}>{avatar}</span>
            <span style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nickname}</span>
          </button>
        </div>
      </div>

      {/* AI 활용 약속 — 첫 대화 전 1회 */}
      {!promiseDone && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(17,24,39,0.55)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1200 }}>
          <div style={{ background: 'white', padding: '26px', borderRadius: '24px', width: '92%', maxWidth: '460px', boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ fontSize: '2.2rem', textAlign: 'center' }}>🤝</div>
            <h3 style={{ margin: '6px 0 4px', textAlign: 'center', fontSize: '1.25rem' }}>{botName}와 이야기하기 전 세 가지 약속</h3>
            <p style={{ margin: '0 0 14px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>서울시교육청 AI·에듀테크 가이드라인의 학생 약속이야.</p>
            <ol style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {studentPromises(selLevel).map(p => (
                <li key={p.n} style={{ lineHeight: 1.5 }}>
                  <b>{p.title}</b>
                  <div style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>{p.text.split('. ').slice(0, 2).join('. ')}{p.text.includes('. ') ? '.' : ''}</div>
                </li>
              ))}
            </ol>
            <button className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: '18px' }} onClick={acceptPromise}>약속할게요</button>
          </div>
        </div>
      )}

      {/* 캐릭터 변경 모달 */}
      {isEditingProfile && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(17,24,39,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100 }} onClick={() => setIsEditingProfile(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', padding: '28px', borderRadius: '24px', width: '92%', maxWidth: '400px', textAlign: 'center', boxShadow: 'var(--shadow-lg)' }}>
            <h3 style={{ marginTop: 0, marginBottom: '14px' }}>내 캐릭터 바꾸기</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px', maxHeight: '300px', overflowY: 'auto', padding: '4px', marginBottom: '20px' }}>
              {AVATAR_LIST.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => handleChangeAvatar(emoji)}
                  style={{ padding: '8px 0', fontSize: '1.5rem', background: avatar === emoji ? 'var(--primary-light)' : 'white', border: avatar === emoji ? '2px solid var(--primary-color)' : '1px solid var(--border)', borderRadius: '10px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                >
                  {emoji}
                </button>
              ))}
            </div>
            <button className="btn btn-secondary" style={{ width: '100%' }} onClick={() => setIsEditingProfile(false)}>닫기</button>
          </div>
        </div>
      )}

      {/* 비속어 경고 모달 */}
      {isBanned && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(17,24,39,0.75)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 }}>
          <div className="glass-card" style={{ background: 'white', padding: '36px', borderRadius: '24px', width: '92%', maxWidth: '400px', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🌳</div>
            <h2 style={{ marginTop: 0, fontSize: '1.4rem' }}>잠깐, 그 말은 나무가 들으면 슬퍼</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '1rem', lineHeight: 1.6, margin: '10px 0 24px' }}>
              화가 나거나 답답할 땐 그 마음을 다른 말로 얘기해 줄래?<br />예: "너무 짜증나", "억울해"
            </p>
            <button className="btn btn-primary btn-lg" style={{ width: '100%' }} onClick={() => setIsBanned(false)}>다른 말로 얘기할게</button>
          </div>
        </div>
      )}

      <div className="main-layout" style={{ background: 'transparent', padding: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'auto' }}>
        <div className="chat-shell">
          <div className="chat-head">
            <div className="chat-bot-avatar">🌳</div>
            <div style={{ minWidth: 0 }}>
              <h2 style={{ margin: 0, fontSize: '1.15rem' }}>{botName}</h2>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>네 이야기를 끝까지 들어줄게. 여기서 한 말은 선생님이 너를 돕는 데만 써.</p>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#38a169', display: 'inline-block' }} /> 오늘 기분: {mood}
              <button onClick={() => setGrowthOpen(true)} title="나의 성장 기록" style={{ background: 'var(--primary-light)', border: '1px solid transparent', color: 'var(--primary-color)', borderRadius: '999px', padding: '4px 10px', cursor: 'pointer', fontWeight: 700, fontSize: '0.78rem' }}>
                🌱 성장 {monthCounts.length}
              </button>
            </div>
          </div>
          <GrowthPanel
            compact
            gradeLabel={gradeLabelForSkills}
            skillLog={skillLog}
            mission={mission}
            missionDone={missionDone}
            onMissionDone={handleMissionDone}
            open={growthOpen}
            onClose={() => setGrowthOpen(false)}
            toast={growthToast}
          />

          <div ref={chatContainerRef} className="chat-log">
            {messages.map((msg, idx) => (
              <div key={msg.id || idx} className={`chat-row ${msg.sender === 'user' ? 'user' : 'bot'}`}>
                {msg.sender === 'bot' ? <div className="chat-mini-avatar">🌳</div> : <div className="chat-mini-avatar" style={{ background: 'var(--primary-light)' }}>{avatar}</div>}
                <div className="chat-bubble">{msg.text}</div>
              </div>
            ))}
            {isTyping && (
              <div className="chat-row bot">
                <div className="chat-mini-avatar">🌳</div>
                <div className="chat-bubble chat-typing" aria-label="나무가 생각하는 중"><span /><span /><span /></div>
              </div>
            )}
          </div>

          {limitReached && (
            <div style={{ padding: '10px 22px 12px', background: '#f5f7fb', fontSize: '0.88rem', color: 'var(--text-muted)', textAlign: 'center' }}>
              🌳 오늘 나무와 이야기할 수 있는 시간은 여기까지야. 내일 또 만나자! 급한 일이 있으면 선생님께 직접 이야기해 줘.
            </div>
          )}
          {quickReplies.length > 0 && !limitReached && (
            <div className="chat-quick">
              {quickReplies.map(q => <button key={q} onClick={() => handleSend(q)}>{q}</button>)}
            </div>
          )}

          <div className="chat-input-area">
            <input
              type="text"
              className="chat-input"
              value={input}
              autoFocus
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) handleSend(); }}
              placeholder={limitReached ? '오늘 대화는 여기까지! 내일 또 이야기하자' : `${botName}에게 편하게 얘기해 봐…`}
              disabled={limitReached}
              maxLength={500}
              aria-label="메시지 입력"
            />
            <button className="chat-send" onClick={() => handleSend()} disabled={isTyping || input.trim() === '' || limitReached} aria-label="보내기">
              <Send size={22} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
