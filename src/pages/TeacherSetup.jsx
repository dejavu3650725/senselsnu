import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { School, Plus, LogIn, Trash2, Users } from 'lucide-react';
import { db, auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import {
  doc, getDoc, setDoc, collection, query, where, getDocs, addDoc, deleteDoc, serverTimestamp
} from 'firebase/firestore';
import { DEMO_CLASS_CODE, DEMO_CLASS_NAME, generateDemoStudents, generateDemoClassExtras } from '../data/demoStudents';

/**
 * 학급 관리: 한 교사가 여러 학급을 만들고 선택해서 입장하는 화면
 * - classes/{classCode} 문서로 학급을 관리 (다중 학급 지원)
 * - 기존 단일 학급(teachers/{uid}.classCode)도 목록에 자동 표시 (하위 호환)
 * - 체험 학급(2026ai): 프로그램에 내장. 입장 시 없거나 옛 구조면 자동으로 채움. 삭제 불가
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

  // 내장 체험 학급 준비 상태 / 학급 삭제 상태
  const [demoWorking, setDemoWorking] = useState('');
  const [deletingCode, setDeletingCode] = useState('');

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

      // 1-1) 체험 학급은 프로그램에 내장 — 문서가 없어도 항상 목록에 보이고, 입장 시 자동으로 채워진다
      if (!seen.has(DEMO_CLASS_CODE)) {
        const demoSnap = await getDoc(doc(db, 'classes', DEMO_CLASS_CODE));
        seen.add(DEMO_CLASS_CODE);
        if (demoSnap.exists()) list.push({ ...demoSnap.data(), shared: demoSnap.data().teacherUid !== u.uid });
        else list.push({ classCode: DEMO_CLASS_CODE, className: DEMO_CLASS_NAME, isDemo: true, builtin: true });
      }

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
    if (cls.classCode === DEMO_CLASS_CODE) {
      try { await ensureDemoClass(); } catch (e) { console.error('demo ensure failed', e); setDemoWorking(''); }
    }
    // 다른 선생님 소유의 공용 체험 학급이면 소유 정보를 덮어쓰지 않고 그대로 입장
    const isOthersClass = cls.teacherUid && cls.teacherUid !== user.uid;
    if (!isOthersClass) {
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

  const DEMO_VERSION = 2; // 시연 데이터 구조가 바뀌면 올린다 → 입장 시 자동 재생성

  // 한 학급에 딸린 문서 전부 삭제 (students, seatingCharts, classBoards, classReports, familyFeedback, consents)
  const purgeClassData = async (code) => {
    const sSnap = await getDocs(query(collection(db, 'students'), where('classCode', '==', code)));
    for (const d of sSnap.docs) await deleteDoc(doc(db, 'students', d.id)).catch(() => {});
    await deleteDoc(doc(db, 'seatingCharts', code)).catch(() => {});
    await deleteDoc(doc(db, 'classBoards', code)).catch(() => {});
    for (const col of ['classReports', 'familyFeedback', 'consents']) {
      try {
        const snap = await getDocs(query(collection(db, col), where('classCode', '==', code)));
        for (const d of snap.docs) await deleteDoc(doc(db, col, d.id)).catch(() => {});
      } catch { /* 권한·인덱스 문제는 무시 */ }
    }
  };

  // 내장 체험 학급: 없으면 만들고, 구조가 옛것이거나 학생 수가 맞지 않으면 조용히 다시 채운다
  const ensureDemoClass = async () => {
    const ref = doc(db, 'classes', DEMO_CLASS_CODE);
    const snap = await getDoc(ref);
    const sSnap = await getDocs(query(collection(db, 'students'), where('classCode', '==', DEMO_CLASS_CODE)));
    const students = generateDemoStudents();
    const upToDate = snap.exists() && Number(snap.data().demoVersion || 0) >= DEMO_VERSION && sSnap.size === students.length;
    if (upToDate) return;
    setDemoWorking('체험 학급을 준비하고 있어요…');
    if (!snap.exists()) {
      await setDoc(ref, { classCode: DEMO_CLASS_CODE, className: DEMO_CLASS_NAME, teacherUid: user.uid, teacherName: teacherName.trim() || '선생님', isDemo: true, createdAt: serverTimestamp() }, { merge: true });
    }
    await purgeClassData(DEMO_CLASS_CODE);
    let done = 0;
    for (const st of students) {
      await addDoc(collection(db, 'students'), { ...st, classCode: DEMO_CLASS_CODE, createdAt: serverTimestamp(), lastActive: serverTimestamp(), addedBy: 'demo' });
      done++; setDemoWorking(`체험 학급을 준비하고 있어요… (${done}/${students.length})`);
    }
    try {
      const extras = generateDemoClassExtras(students);
      await setDoc(ref, { mission: extras.classMission, demoVersion: DEMO_VERSION, isDemo: true, className: DEMO_CLASS_NAME }, { merge: true });
      await setDoc(doc(db, 'classReports', extras.report.id), extras.report.data);
      for (const f of extras.feedback) await addDoc(collection(db, 'familyFeedback'), f);
      for (const c of extras.consents) await addDoc(collection(db, 'consents'), c);
    } catch (e) { console.warn('demo extras skipped', e); }
    setDemoWorking('');
  };

  // 내 학급 삭제 (학생·자리 배치·리포트·회신·동의·TV 보드까지 모두) — 체험 학급은 삭제 불가
  const handleDeleteClass = async (cls) => {
    if (cls.classCode === DEMO_CLASS_CODE) return;
    const name = cls.className || cls.classCode;
    if (!window.confirm(`'${name}' 학급을 삭제할까요?\n\n학생 기록·관계망·자리 배치·리포트·동의 현황이 모두 지워지며 되돌릴 수 없습니다.`)) return;
    const typed = window.prompt(`정말 삭제하려면 학급 코드를 입력하세요: ${cls.classCode}`);
    if ((typed || '').trim() !== cls.classCode) { alert('학급 코드가 일치하지 않아 취소했습니다.'); return; }
    setDeletingCode(cls.classCode);
    try {
      await purgeClassData(cls.classCode);
      await deleteDoc(doc(db, 'classes', cls.classCode)).catch(() => {});
      if (cls.legacy) { try { await setDoc(doc(db, 'teachers', user.uid), { classCode: '', className: '' }, { merge: true }); } catch { /* ignore */ } }
      if (sessionStorage.getItem('currentClassCode') === cls.classCode) sessionStorage.removeItem('currentClassCode');
      await loadClasses(user);
    } catch (error) {
      console.error('Failed to delete class', error);
      alert('학급 삭제 중 오류가 발생했습니다.');
    } finally {
      setDeletingCode('');
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

        {/* 선생님만 보는 소개 — 첫 화면(학생용)에는 두지 않는다 */}
        <div className="landing-steps" style={{ maxWidth: '520px' }}>
          <div className="landing-step"><b>1. 학생이 대화합니다</b>긍정적인 질문만으로 오늘의 기분과 함께하고 싶은 친구를 자연스럽게 이야기합니다.</div>
          <div className="landing-step"><b>2. 선생님이 한눈에 봅니다</b>소시오그램, 갈등·외로움 신호, 긴급 알림이 실시간으로 정리됩니다. 이 화면은 선생님만 봅니다.</div>
          <div className="landing-step"><b>3. 교실이 달라집니다</b>근거 성취기준이 붙은 자리 배치·맞춤 처방·상담 기록과 가정통신문·학급 리포트로 이어집니다.</div>
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
                      {cls.classCode === DEMO_CLASS_CODE && <span style={{ marginLeft: '8px', fontSize: '0.75rem', color: '#805ad5', fontWeight: 'bold' }}>체험</span>}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#a0aec0' }}>
                      {cls.classCode === DEMO_CLASS_CODE
                        ? (demoWorking || '가상 학생 23명 · 관계망·신호·성장 기록·리포트가 내장되어 바로 체험할 수 있어요')
                        : <>코드: <b style={{ color: 'var(--primary-color)' }}>{cls.classCode}</b></>}
                    </div>
                  </div>
                  {cls.classCode !== DEMO_CLASS_CODE && (
                    <button
                      onClick={() => handleDeleteClass(cls)}
                      disabled={deletingCode === cls.classCode}
                      title="학급 삭제"
                      style={{ padding: '10px', borderRadius: '10px', border: '1px solid #fed7d7', background: 'white', color: '#e53e3e', cursor: 'pointer', display: 'flex', alignItems: 'center', flexShrink: 0 }}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                  <button
                    onClick={() => enterClass(cls)}
                    disabled={!!demoWorking && cls.classCode === DEMO_CLASS_CODE}
                    style={{ padding: '10px 18px', borderRadius: '10px', border: 'none', background: 'var(--primary-color)', color: 'white', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}
                  >
                    <LogIn size={16} /> {cls.classCode === DEMO_CLASS_CODE ? (demoWorking ? '준비 중…' : '체험') : '입장'}
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

      </div>
    </div>
  );
};

export default TeacherSetup;
