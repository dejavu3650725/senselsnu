import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Plus, LogIn, Trash2, MessageCircle, HeartHandshake, Sparkles, Pencil } from 'lucide-react';
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
  const [teacherName, setTeacherName] = useState('');       // 프로필에 저장된 이름 (입장 시 학급 문서에 기록)
  const [newTeacherName, setNewTeacherName] = useState(''); // 새 학급 폼 입력값 — 항상 빈칸으로 시작
  const [classes, setClasses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // 새 학급 만들기 폼
  const [newClassName, setNewClassName] = useState('');
  const [newClassCode, setNewClassCode] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // 내장 체험 학급 준비 상태 / 학급 삭제 상태
  const [demoWorking, setDemoWorking] = useState('');
  const [deletingCode, setDeletingCode] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteTyped, setDeleteTyped] = useState('');
  const [deleteProgress, setDeleteProgress] = useState('');
  const [editTarget, setEditTarget] = useState(null);
  const [editName, setEditName] = useState('');
  const [editCode, setEditCode] = useState('');
  const [editProgress, setEditProgress] = useState('');
  const [editBusy, setEditBusy] = useState(false);

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
    const tName = newTeacherName.trim();
    if (!tName || !className || !classCode) {
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
        teacherName: tName,
        isDemo: false,
        createdAt: serverTimestamp()
      }, { merge: true });

      // 교사 프로필 갱신 (기존 필드 구조 유지 - 하위 호환)
      await setDoc(doc(db, 'teachers', user.uid), {
        uid: user.uid,
        email: user.email,
        teacherName: tName,
      }, { merge: true });
      setTeacherName(tName);

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
    if (upToDate) { if (snap.data().className !== DEMO_CLASS_NAME) await setDoc(ref, { className: DEMO_CLASS_NAME }, { merge: true }).catch(() => {}); return; }
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
  // 학급 정보 수정 (이름은 즉시, 코드 변경은 모든 부속 문서를 새 코드로 옮긴다)
  const openEdit = (cls) => { setEditTarget(cls); setEditName(cls.className || ''); setEditCode(cls.classCode); setEditProgress(''); };

  const migrateCollection = async (col, oldCode, newCode, idMap) => {
    const snap = await getDocs(query(collection(db, col), where('classCode', '==', oldCode)));
    let n = 0;
    for (const d of snap.docs) {
      const data = { ...d.data(), classCode: newCode };
      if (idMap) await setDoc(doc(db, col, idMap(d.id)), data); else await addDoc(collection(db, col), data);
      await deleteDoc(doc(db, col, d.id)).catch(() => {});
      n++; setEditProgress(`${col} 옮기는 중… (${n}/${snap.size})`);
    }
  };

  const runEditClass = async () => {
    const cls = editTarget; if (!cls) return;
    const name = editName.trim(); const code = editCode.trim();
    if (!name || !code) { setEditProgress('학급 이름과 코드를 모두 입력하세요.'); return; }
    if (!/^[A-Za-z0-9]{3,12}$/.test(code)) { setEditProgress('학급 코드는 영문·숫자 3~12자로 입력하세요.'); return; }
    setEditBusy(true); setEditProgress('');
    try {
      const oldCode = cls.classCode;
      if (code === oldCode) {
        await setDoc(doc(db, 'classes', oldCode), { classCode: oldCode, className: name, teacherUid: user.uid, updatedAt: serverTimestamp() }, { merge: true });
      } else {
        const existing = await getDoc(doc(db, 'classes', code));
        if (existing.exists()) { setEditProgress('이미 사용 중인 학급 코드입니다.'); setEditBusy(false); return; }
        // 1) 새 학급 문서 (기존 설정 유지)
        const oldSnap = await getDoc(doc(db, 'classes', oldCode));
        const base = oldSnap.exists() ? oldSnap.data() : {};
        setEditProgress('새 학급 문서 만드는 중…');
        await setDoc(doc(db, 'classes', code), { ...base, classCode: code, className: name, teacherUid: user.uid, isDemo: false, updatedAt: serverTimestamp() });
        // 2) 부속 문서 이동
        await migrateCollection('students', oldCode, code);
        await migrateCollection('consents', oldCode, code);
        await migrateCollection('familyFeedback', oldCode, code);
        await migrateCollection('classReports', oldCode, code, (id) => id.replace(new RegExp('^' + oldCode + '_'), code + '_'));
        const seat = await getDoc(doc(db, 'seatingCharts', oldCode));
        if (seat.exists()) { await setDoc(doc(db, 'seatingCharts', code), seat.data()); await deleteDoc(doc(db, 'seatingCharts', oldCode)).catch(() => {}); }
        await deleteDoc(doc(db, 'classBoards', oldCode)).catch(() => {});
        // 3) 옛 학급 문서 삭제, 레거시 프로필 갱신
        await deleteDoc(doc(db, 'classes', oldCode)).catch(() => {});
        try { const t = await getDoc(doc(db, 'teachers', user.uid)); if (t.exists() && t.data().classCode === oldCode) await setDoc(doc(db, 'teachers', user.uid), { classCode: code, className: name }, { merge: true }); } catch { /* ignore */ }
        if (sessionStorage.getItem('currentClassCode') === oldCode) sessionStorage.setItem('currentClassCode', code);
      }
      setEditTarget(null);
      await loadClasses(user);
    } catch (error) {
      console.error('Failed to edit class', error);
      setEditProgress(`수정 중 오류: ${error?.code || error?.message || '알 수 없음'}`);
    } finally {
      setEditBusy(false);
    }
  };

  // 삭제 모달 열기 → 모달에서 학급 코드 입력 후 실행
  const handleDeleteClass = (cls) => {
    if (cls.classCode === DEMO_CLASS_CODE) return;
    setDeleteTarget(cls); setDeleteTyped(''); setDeleteProgress('');
  };

  const runDeleteClass = async () => {
    const cls = deleteTarget;
    if (!cls || deleteTyped.trim().toUpperCase() !== cls.classCode.toUpperCase()) return;
    setDeletingCode(cls.classCode);
    try {
      // 규칙상 학급 문서가 있어야 학생·부속 문서를 지울 수 있다 (기존 단일 학급은 문서가 없을 수 있음) → 먼저 보장
      setDeleteProgress('학급 정보 확인 중…');
      await setDoc(doc(db, 'classes', cls.classCode), { classCode: cls.classCode, className: cls.className || cls.classCode, teacherUid: user.uid }, { merge: true });
      setDeleteProgress('학생 기록·관계망 삭제 중…');
      await purgeClassData(cls.classCode);
      setDeleteProgress('학급 삭제 중…');
      await deleteDoc(doc(db, 'classes', cls.classCode));
      if (cls.legacy) { try { await setDoc(doc(db, 'teachers', user.uid), { classCode: '', className: '' }, { merge: true }); } catch { /* ignore */ } }
      if (sessionStorage.getItem('currentClassCode') === cls.classCode) sessionStorage.removeItem('currentClassCode');
      setClasses(prev => prev.filter(c => c.classCode !== cls.classCode));
      setDeleteTarget(null);
      await loadClasses(user);
    } catch (error) {
      console.error('Failed to delete class', error);
      setDeleteProgress(`삭제 중 오류: ${error?.code || error?.message || '알 수 없음'}. 다시 시도해 주세요.`);
    } finally {
      setDeletingCode('');
    }
  };

  const myClasses = classes.filter(c => c.classCode !== DEMO_CLASS_CODE);
  const demoClass = classes.find(c => c.classCode === DEMO_CLASS_CODE);
  const [showCreate, setShowCreate] = useState(false);
  const createOpen = showCreate || (!isLoading && myClasses.length === 0);

  return (
    <div className="setup-page">
      <div className="setup-wrap">
        <div className="setup-head">
          <div className="setup-brand"><Shield size={18} /> SEN SEL</div>
          <div className="setup-head-text">
            <h2>선생님, 어서 오세요</h2>
            <p>학급을 고르면 바로 대시보드로 들어갑니다.</p>
          </div>
          <div className="setup-actions">
            {demoClass && <button className="btn-demo" disabled={!!demoWorking} onClick={() => enterClass(demoClass)} title="가상 학생 23명이 내장된 학급으로 모든 기능을 체험합니다">🎬 {demoWorking ? demoWorking : '데모 학급 체험'}</button>}
            <button className="btn-new" onClick={() => setShowCreate(v => !v)}><Plus size={16} /> 새 학급</button>
          </div>
        </div>

        {createOpen && (
          <section className="setup-card create-card">
            <div className="create-form-title"><Plus size={16} /> 새 학급 만들기 <span>학생 명단·자리 배치·가정 연계까지 5분이면 준비돼요</span></div>
            <div className="create-grid">
              <label>선생님 이름<input type="text" placeholder="예: 김선생님" value={newTeacherName} onChange={e => setNewTeacherName(e.target.value)} /></label>
              <label>학급 이름<input type="text" placeholder="예: 5학년 2반" value={newClassName} onChange={e => setNewClassName(e.target.value)} /></label>
              <label>학급 코드 <span>학생 입장용 · 영문/숫자</span><input type="text" placeholder="예: SNU5B" value={newClassCode} onChange={e => setNewClassCode(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCreateClass()} /></label>
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              {myClasses.length > 0 && <button className="btn btn-secondary" onClick={() => setShowCreate(false)}>닫기</button>}
              <button className="btn btn-primary" disabled={isCreating} onClick={handleCreateClass}>{isCreating ? '만드는 중…' : '학급 만들기'}</button>
            </div>
          </section>
        )}

        {isLoading ? (
          <p className="setup-empty">불러오는 중…</p>
        ) : myClasses.length === 0 ? (
          <div className="setup-card" style={{ textAlign: 'center', padding: '28px' }}>
            <div style={{ fontSize: '2rem' }}>🏫</div>
            <div style={{ fontWeight: 800, color: 'var(--text-strong)', marginTop: '6px' }}>아직 만든 학급이 없어요</div>
            <div className="setup-empty" style={{ marginTop: '4px' }}>위에서 새 학급을 만들거나, 데모 학급 체험으로 먼저 둘러보세요.</div>
          </div>
        ) : (
          <div className="class-grid">
            {myClasses.map((cls, i) => (
              <div key={cls.classCode} className={`class-tile tone-${i % 4}`} role="button" tabIndex={0} onClick={() => enterClass(cls)} onKeyDown={e => e.key === 'Enter' && enterClass(cls)}>
                <div className="class-tile-band">
                  <div className="class-tile-name">{cls.className}</div>
                  <button className="class-tile-del" title="학급 삭제" onClick={e => { e.stopPropagation(); handleDeleteClass(cls); }} disabled={deletingCode === cls.classCode}><Trash2 size={14} /></button>
                </div>
                <div className="class-tile-body">
                  <div className="class-tile-code">코드 <b>{cls.classCode}</b></div>
                  <div className="class-tile-actions">
                    <button className="tile-btn edit" onClick={e => { e.stopPropagation(); openEdit(cls); }}><Pencil size={13} /> 수정</button>
                    <button className="tile-btn enter" onClick={e => { e.stopPropagation(); enterClass(cls); }}>입장 <LogIn size={14} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="how-strip">
          <div className="how-item">
            <div className="how-num">1</div>
            <div className="how-ic"><MessageCircle size={20} /></div>
            <div><b>학생이 대화합니다</b><span>긍정적인 질문만으로 오늘의 기분과 함께하고 싶은 친구를 자연스럽게 이야기해요.</span></div>
          </div>
          <div className="how-arrow">→</div>
          <div className="how-item">
            <div className="how-num">2</div>
            <div className="how-ic"><HeartHandshake size={20} /></div>
            <div><b>선생님이 한눈에 봅니다</b><span>소시오그램·갈등·외로움 신호·긴급 알림이 실시간으로 정리돼요. 선생님만 봅니다.</span></div>
          </div>
          <div className="how-arrow">→</div>
          <div className="how-item">
            <div className="how-num">3</div>
            <div className="how-ic"><Sparkles size={20} /></div>
            <div><b>교실이 달라집니다</b><span>근거가 붙은 자리 배치·맞춤 처방·상담 기록, 가정통신문·학급 리포트로 이어져요.</span></div>
          </div>
        </div>
      </div>

      {editTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }} onClick={() => !editBusy && setEditTarget(null)}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '440px', background: 'white', borderRadius: '22px', padding: '26px', boxShadow: '0 24px 60px rgba(0,0,0,0.3)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <div style={{ width: 44, height: 44, borderRadius: '14px', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Pencil size={20} color="var(--primary-color)" /></div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '1.15rem', color: 'var(--text-strong)' }}>학급 정보 수정</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>이름은 바로 바뀌고, 코드를 바꾸면 학생·기록이 새 코드로 옮겨져요.</div>
              </div>
            </div>
            <div className="create-grid" style={{ gridTemplateColumns: '1fr' }}>
              <label>학급 이름<input type="text" value={editName} onChange={e => setEditName(e.target.value)} disabled={editBusy} autoFocus /></label>
              <label>학급 코드 <span>영문·숫자 3~12자</span><input type="text" value={editCode} onChange={e => setEditCode(e.target.value.toUpperCase().replace(/[^A-Za-z0-9]/g, ''))} disabled={editBusy} style={{ fontFamily: 'Inter, monospace', letterSpacing: '2px', fontWeight: 700 }} /></label>
            </div>
            {editCode.trim() !== editTarget.classCode && <div style={{ marginTop: '10px', fontSize: '0.82rem', color: '#975a16', background: '#fffbea', border: '1px solid #f6e05e', borderRadius: '10px', padding: '8px 10px', lineHeight: 1.5 }}>코드를 바꾸면 학생들은 <b>새 코드로 다시 입장</b>해야 해요. 칠판·알림장의 코드도 함께 바꿔 주세요.</div>}
            {editProgress && <div style={{ marginTop: '10px', fontSize: '0.85rem', color: editProgress.includes('오류') || editProgress.includes('입력') || editProgress.includes('사용 중') ? '#e53e3e' : 'var(--text-muted)' }}>{editBusy ? '⏳ ' : ''}{editProgress}</div>}
            <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} disabled={editBusy} onClick={() => setEditTarget(null)}>취소</button>
              <button className="btn btn-primary" style={{ flex: 1.4 }} disabled={editBusy} onClick={runEditClass}>{editBusy ? '저장 중…' : '저장'}</button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }} onClick={() => !deletingCode && setDeleteTarget(null)}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '440px', background: 'white', borderRadius: '22px', padding: '26px', boxShadow: '0 24px 60px rgba(0,0,0,0.3)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div style={{ width: 44, height: 44, borderRadius: '14px', background: '#fff5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Trash2 size={22} color="#e53e3e" /></div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '1.15rem', color: 'var(--text-strong)' }}>학급 삭제</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{deleteTarget.className || deleteTarget.classCode}</div>
              </div>
            </div>
            <p style={{ margin: '0 0 14px', fontSize: '0.92rem', color: 'var(--text-main)', lineHeight: 1.6 }}>학생 기록·관계망·자리 배치·리포트·가정 회신·동의 현황이 <b>모두 지워지며 되돌릴 수 없습니다.</b> 계속하려면 학급 코드를 입력하세요.</p>
            <input
              className="code-input"
              value={deleteTyped}
              onChange={e => setDeleteTyped(e.target.value)}
              placeholder={deleteTarget.classCode}
              autoFocus
              disabled={!!deletingCode}
              onKeyDown={e => e.key === 'Enter' && runDeleteClass()}
              style={{ fontSize: '1.15rem', letterSpacing: '3px' }}
            />
            {deleteProgress && <div style={{ marginTop: '10px', fontSize: '0.85rem', color: deleteProgress.startsWith('삭제 중 오류') ? '#e53e3e' : 'var(--text-muted)' }}>{deletingCode ? '⏳ ' : ''}{deleteProgress}</div>}
            <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} disabled={!!deletingCode} onClick={() => setDeleteTarget(null)}>취소</button>
              <button style={{ flex: 1.4, padding: '12px', borderRadius: '12px', border: 'none', background: deleteTyped.trim().toUpperCase() === deleteTarget.classCode.toUpperCase() && !deletingCode ? '#e53e3e' : '#fed7d7', color: 'white', fontWeight: 800, cursor: deleteTyped.trim().toUpperCase() === deleteTarget.classCode.toUpperCase() && !deletingCode ? 'pointer' : 'not-allowed' }} disabled={deleteTyped.trim().toUpperCase() !== deleteTarget.classCode.toUpperCase() || !!deletingCode} onClick={runDeleteClass}>
                {deletingCode ? '삭제 중…' : '영구 삭제'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherSetup;
