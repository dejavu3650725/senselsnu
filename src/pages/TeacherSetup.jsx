import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { School, Plus, LogIn, Sparkles, Trash2, Users } from 'lucide-react';
import { db, auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import {
  doc, getDoc, setDoc, collection, query, where, getDocs, addDoc, deleteDoc, serverTimestamp
} from 'firebase/firestore';
import { DEMO_CLASS_CODE, DEMO_CLASS_NAME, generateDemoStudents } from '../data/demoStudents';

/**
 * 학급 관리: 한 교사가 여러 학급을 만들고 선택해서 입장하는 화면
 * - classes/{classCode} 문서로 학급을 관리 (다중 학급 지원)
 * - 기존 단일 학급(teachers/{uid}.classCode)도 목록에 자동 표시 (하위 호환)
 * - 데모 학급(2026ai): 버튼 한 번으로 가상 학생 23명(관계망 포함) 생성/삭제
 */
const TeacherSetup = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [teacherName, setTeacherName] = useState('');
  const [classes, setClasses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // 새 학급 만들기 폼
  const [newClassName, setNewClassName] = useState('');
  const [newClassCode, setNewClassCode] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // 데모 학급 상태
  const [demoStudentCount, setDemoStudentCount] = useState(0);
  const [demoWorking, setDemoWorking] = useState('');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) setUser(u);
      else navigate('/');
    });
    return () => unsub();
  }, [navigate]);

  // 내 학급 목록 + 프로필 + 데모 학생 수 불러오기
  const loadClasses = useCallback(async (u) => {
    setIsLoading(true);
    try {
      const list = [];
      const seen = new Set();

      // 1) classes 컬렉션에서 내 학급들
      const q = query(collection(db, 'classes'), where('teacherUid', '==', u.uid));
      const snap = await getDocs(q);
      snap.forEach(d => {
        const data = d.data();
        if (!seen.has(data.classCode)) {
          seen.add(data.classCode);
          list.push(data);
        }
      });

      // 2) 기존 단일 학급(teachers 문서) 하위 호환
      const tSnap = await getDoc(doc(db, 'teachers', u.uid));
      if (tSnap.exists()) {
        const t = tSnap.data();
        if (t.teacherName) setTeacherName(t.teacherName);
        if (t.classCode && !seen.has(t.classCode)) {
          seen.add(t.classCode);
          list.push({ classCode: t.classCode, className: t.className || t.classCode, teacherUid: u.uid, legacy: true });
        }
      }

      // 데모 학급은 목록 맨 아래로
      list.sort((a, b) => (a.classCode === DEMO_CLASS_CODE ? 1 : 0) - (b.classCode === DEMO_CLASS_CODE ? 1 : 0));
      setClasses(list);

      // 3) 데모 학급 학생 수
      const dq = query(collection(db, 'students'), where('classCode', '==', DEMO_CLASS_CODE));
      const dSnap = await getDocs(dq);
      setDemoStudentCount(dSnap.size);
    } catch (error) {
      console.error('Failed to load classes:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) loadClasses(user);
  }, [user, loadClasses]);

  // 학급 입장 (classes 문서가 없던 기존 학급이면 자동 생성해서 이관)
  const enterClass = async (cls) => {
    try {
      await setDoc(doc(db, 'classes', cls.classCode), {
        classCode: cls.classCode,
        className: cls.className || cls.classCode,
        teacherUid: user.uid,
        teacherName: teacherName || '',
        isDemo: cls.classCode === DEMO_CLASS_CODE,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (e) {
      console.error('classes doc sync failed:', e);
    }
    sessionStorage.setItem('currentClassCode', cls.classCode);
    navigate('/teacher');
  };

  // 새 학급 만들기
  const handleCreateClass = async () => {
    const className = newClassName.trim();
    const classCode = newClassCode.trim();
    if (!teacherName.trim() || !className || !classCode) {
      alert('선생님 이름, 학급 이름, 학급 코드를 모두 입력해주세요.');
      return;
    }
    setIsCreating(true);
    try {
      // 중복 코드 확인 (classes + 기존 teachers)
      const existing = await getDoc(doc(db, 'classes', classCode));
      const legacyQ = query(collection(db, 'teachers'), where('classCode', '==', classCode));
      const legacySnap = await getDocs(legacyQ);
      const legacyOwnedByOther = legacySnap.docs.some(d => d.id !== user.uid);
      if ((existing.exists() && existing.data().teacherUid !== user.uid) || legacyOwnedByOther) {
        alert('이미 다른 선생님이 사용 중인 학급 코드입니다. 다른 코드를 정해주세요.');
        setIsCreating(false);
        return;
      }

      await setDoc(doc(db, 'classes', classCode), {
        classCode, className,
        teacherUid: user.uid,
        teacherName: teacherName.trim(),
        isDemo: false,
        createdAt: serverTimestamp()
      }, { merge: true });

      // 교사 프로필 갱신 (기존 필드 구조 유지 - 하위 호환)
      await setDoc(doc(db, 'teachers', user.uid), {
        uid: user.uid,
        email: user.email,
        teacherName: teacherName.trim(),
      }, { merge: true });

      setNewClassName('');
      setNewClassCode('');
      await loadClasses(user);
      if (window.confirm(`'${className}' 학급이 생성되었습니다! 바로 입장할까요?`)) {
        enterClass({ classCode, className });
      }
    } catch (error) {
      console.error('Failed to create class', error);
      alert('학급 생성 중 오류가 발생했습니다.');
    } finally {
      setIsCreating(false);
    }
  };

  // 데모 학급 + 가상 학생 23명 생성
  const handleCreateDemo = async () => {
    if (!teacherName.trim()) {
      alert('먼저 아래 "새 학급 만들기"의 선생님 이름 칸을 채워주세요. (데모 학급에도 사용됩니다)');
      return;
    }
    if (demoStudentCount > 0) {
      if (!window.confirm(`데모 학급에 이미 학생 ${demoStudentCount}명이 있습니다. 삭제하고 새로 생성할까요?`)) return;
      await deleteDemoStudents(false);
    }
    setDemoWorking('데모 학급 생성 중...');
    try {
      await setDoc(doc(db, 'classes', DEMO_CLASS_CODE), {
        classCode: DEMO_CLASS_CODE,
        className: DEMO_CLASS_NAME,
        teacherUid: user.uid,
        teacherName: teacherName.trim(),
        isDemo: true,
        createdAt: serverTimestamp()
      }, { merge: true });

      const students = generateDemoStudents();
      let done = 0;
      for (const s of students) {
        await addDoc(collection(db, 'students'), {
          ...s,
          classCode: DEMO_CLASS_CODE,
          createdAt: serverTimestamp(),
          lastActive: serverTimestamp(),
          addedBy: 'demo'
        });
        done++;
        setDemoWorking(`가상 학생 생성 중... (${done}/${students.length})`);
      }
      await loadClasses(user);
      setDemoWorking('');
      if (window.confirm(`데모 학급(${DEMO_CLASS_CODE})에 가상 학생 ${students.length}명이 생성되었습니다! 바로 입장할까요?`)) {
        enterClass({ classCode: DEMO_CLASS_CODE, className: DEMO_CLASS_NAME });
      }
    } catch (error) {
      console.error('Failed to create demo data', error);
      alert('데모 데이터 생성 중 오류가 발생했습니다.');
      setDemoWorking('');
    }
  };

  // 데모 학급 학생 전체 삭제 (데모 학급 코드에만 동작 - 실제 학급 데이터 보호)
  const deleteDemoStudents = async (confirm = true) => {
    if (confirm && !window.confirm('데모 학급의 가상 학생을 모두 삭제할까요? (실제 학급 데이터는 건드리지 않습니다)')) return;
    setDemoWorking('데모 학생 삭제 중...');
    try {
      const dq = query(collection(db, 'students'), where('classCode', '==', DEMO_CLASS_CODE));
      const dSnap = await getDocs(dq);
      for (const d of dSnap.docs) {
        await deleteDoc(doc(db, 'students', d.id));
      }
      // 데모 자리배치도도 함께 삭제
      await deleteDoc(doc(db, 'seatingCharts', DEMO_CLASS_CODE)).catch(() => {});
      await loadClasses(user);
    } catch (error) {
      console.error('Failed to delete demo students', error);
      alert('삭제 중 오류가 발생했습니다.');
    } finally {
      setDemoWorking('');
    }
  };

  const inputStyle = {
    width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid #cbd5e1',
    fontSize: '1rem', outline: 'none', boxSizing: 'border-box'
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '100vh', padding: '40px 16px', background: 'var(--bg-color)', overflowY: 'auto' }}>
      <div style={{ width: '100%', maxWidth: '520px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

        <div style={{ textAlign: 'center' }}>
          <School size={48} color="var(--primary-color)" />
          <h2 style={{ fontSize: '1.8rem', color: 'var(--text-main)', margin: '8px 0 4px 0' }}>학급 관리 🏫</h2>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>입장할 학급을 선택하거나, 새 학급을 만들어보세요.</p>
        </div>

        {/* 내 학급 목록 */}
        <div className="glass-card" style={{ background: 'white', borderRadius: '20px', padding: '24px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '1.15rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={20} color="var(--primary-color)" /> 내 학급 목록
          </h3>
          {isLoading ? (
            <p style={{ color: '#a0aec0', margin: 0 }}>불러오는 중...</p>
          ) : classes.length === 0 ? (
            <p style={{ color: '#a0aec0', margin: 0 }}>아직 만든 학급이 없습니다. 아래에서 첫 학급을 만들어보세요!</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {classes.map(cls => (
                <div key={cls.classCode} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', border: '1px solid #e2e8f0', borderRadius: '14px', background: cls.classCode === DEMO_CLASS_CODE ? '#faf5ff' : '#f8fafc' }}>
                  <span style={{ fontSize: '1.5rem' }}>{cls.classCode === DEMO_CLASS_CODE ? '🎬' : '🏫'}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 'bold', color: '#2d3748' }}>
                      {cls.className}
                      {cls.classCode === DEMO_CLASS_CODE && <span style={{ marginLeft: '8px', fontSize: '0.75rem', color: '#805ad5', fontWeight: 'bold' }}>데모</span>}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#a0aec0' }}>
                      코드: <b style={{ color: 'var(--primary-color)' }}>{cls.classCode}</b>
                      {cls.classCode === DEMO_CLASS_CODE && ` · 가상 학생 ${demoStudentCount}명`}
                    </div>
                  </div>
                  <button
                    onClick={() => enterClass(cls)}
                    style={{ padding: '10px 18px', borderRadius: '10px', border: 'none', background: 'var(--primary-color)', color: 'white', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}
                  >
                    <LogIn size={16} /> 입장
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 새 학급 만들기 */}
        <div className="glass-card" style={{ background: 'white', borderRadius: '20px', padding: '24px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '1.15rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={20} color="var(--primary-color)" /> 새 학급 만들기
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold', fontSize: '0.9rem' }}>선생님 이름</label>
              <input type="text" placeholder="예: 김선생님" value={teacherName} onChange={e => setTeacherName(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold', fontSize: '0.9rem' }}>학급 이름</label>
              <input type="text" placeholder="예: 5학년 2반" value={newClassName} onChange={e => setNewClassName(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold', fontSize: '0.9rem' }}>학급 코드 (학생 입장용, 영문/숫자)</label>
              <input type="text" placeholder="예: SNU5B" value={newClassCode} onChange={e => setNewClassCode(e.target.value)} style={inputStyle} onKeyDown={e => e.key === 'Enter' && handleCreateClass()} />
            </div>
            <button
              onClick={handleCreateClass}
              disabled={isCreating}
              style={{ padding: '14px', borderRadius: '12px', border: 'none', background: isCreating ? '#a0aec0' : 'var(--primary-color)', color: 'white', fontWeight: 'bold', fontSize: '1rem', cursor: isCreating ? 'not-allowed' : 'pointer' }}
            >
              {isCreating ? '생성 중...' : '학급 만들기'}
            </button>
          </div>
        </div>

        {/* 데모 학급 */}
        <div className="glass-card" style={{ background: 'white', borderRadius: '20px', padding: '24px', border: '2px dashed #d6bcfa' }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '1.15rem', color: '#553c9a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={20} color="#805ad5" /> 데모 학급 (포트폴리오·시연용)
          </h3>
          <p style={{ color: '#718096', fontSize: '0.9rem', margin: '0 0 16px 0', lineHeight: 1.6 }}>
            학급 코드 <b style={{ color: '#805ad5' }}>{DEMO_CLASS_CODE}</b>에 가상 학생 23명을 생성합니다.
            관계망(지목), 상호 갈등, 고립·외로움 신호, 성별, 대화 샘플까지 포함되어 소시오그램·관계 신호·AI 자리 배치를 바로 시연할 수 있어요.
            실제 학급 데이터와는 완전히 분리됩니다.
          </p>
          {demoWorking ? (
            <p style={{ color: '#805ad5', fontWeight: 'bold', margin: 0 }}>⏳ {demoWorking}</p>
          ) : (
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                onClick={handleCreateDemo}
                style={{ flex: 2, minWidth: '200px', padding: '14px', borderRadius: '12px', border: 'none', background: 'linear-gradient(90deg, #805ad5, #4a90e2)', color: 'white', fontWeight: 'bold', fontSize: '0.95rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <Sparkles size={18} /> {demoStudentCount > 0 ? '데모 데이터 다시 생성' : '데모 학급 + 학생 23명 생성'}
              </button>
              {demoStudentCount > 0 && (
                <button
                  onClick={() => deleteDemoStudents(true)}
                  style={{ flex: 1, minWidth: '140px', padding: '14px', borderRadius: '12px', border: '1px solid #fc8181', background: 'white', color: '#e53e3e', fontWeight: 'bold', fontSize: '0.95rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  <Trash2 size={16} /> 데모 삭제
                </button>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default TeacherSetup;
