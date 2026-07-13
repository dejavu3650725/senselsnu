import React, { useState, useEffect, useCallback, useRef } from 'react';
import { LayoutGrid, Save, Shuffle, RotateCcw, X, Plus, Minus, Printer, Sparkles, Layers } from 'lucide-react';
import { db } from '../firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

const DEFAULT_ROWS = 4;
const DEFAULT_COLS = 6;
const MIN_SIZE = 2;
const MAX_SIZE = 8;

const seatKey = (row, col) => `${row}_${col}`;

// 기분 상태에 따른 좌석 색상
const moodColor = (mood) => {
  if (mood === '건강') return { border: '#48bb78', bg: '#f0fff4' };
  if (mood === '힘듦') return { border: '#e53e3e', bg: '#fff5f5' };
  return { border: '#ecc94b', bg: '#fffff0' };
};

// 성별에 따른 이름 색상 (남: 파랑, 여: 분홍)
const genderNameColor = (gender) => {
  if (gender === '남') return '#2b6cb0';
  if (gender === '여') return '#b83280';
  return '#2d3748';
};

// 모둠 색상 팔레트 (모둠 번호에 따라 순환)
const GROUP_COLORS = ['#e53e3e', '#dd6b20', '#38a169', '#3182ce', '#805ad5', '#d53f8c', '#319795', '#975a16'];
const groupColor = (gid) => GROUP_COLORS[(Math.abs(Number(gid)) - 1) % GROUP_COLORS.length];

/**
 * 자리 배치도: 드래그 앤 드롭으로 학생 좌석 배치
 * - 아래 '미배치 학생' 목록에서 좌석으로 드래그하여 배치
 * - 좌석 간 드래그 시 자리 교환(스왑)
 * - 좌석의 학생을 미배치 목록으로 다시 드래그하면 배치 해제
 * - 드래그가 어려운 환경(태블릿 등)에서는 학생을 클릭 → 좌석 클릭으로 배치 가능
 * - 배치 결과는 Firestore(seatingCharts/{classCode})에 저장되어 다시 접속해도 유지됩니다.
 */
const SeatingChart = ({ studentsData, classCode, classLabel }) => {
  const [rows, setRows] = useState(DEFAULT_ROWS);
  const [cols, setCols] = useState(DEFAULT_COLS);
  const [seats, setSeats] = useState({}); // { "row_col": studentId }
  const [selectedStudentId, setSelectedStudentId] = useState(null); // 클릭 배치용
  const [dragOverKey, setDragOverKey] = useState(null);
  const [isPoolDragOver, setIsPoolDragOver] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const dragSourceRef = useRef(null); // { studentId, fromKey|null }

  // AI 자리 배치 제안 상태
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiProposal, setAiProposal] = useState(null); // { seats, rationale, highlights, placedCount }
  const [aiError, setAiError] = useState('');

  // 모둠 지정 상태
  const [groups, setGroups] = useState({}); // { "row_col": 모둠번호 }
  const [isGroupMode, setIsGroupMode] = useState(false);
  const [pendingSeats, setPendingSeats] = useState([]); // 모둠 지정 모드에서 선택 중인 좌석

  const studentById = useCallback(
    (id) => studentsData.find(s => s.id === id),
    [studentsData]
  );

  // Firestore에서 기존 배치 불러오기
  useEffect(() => {
    if (!classCode) return;
    const loadChart = async () => {
      try {
        const snap = await getDoc(doc(db, 'seatingCharts', classCode));
        if (snap.exists()) {
          const data = snap.data();
          if (data.rows) setRows(data.rows);
          if (data.cols) setCols(data.cols);
          if (data.seats) setSeats(data.seats);
          if (data.groups) setGroups(data.groups);
        }
      } catch (error) {
        console.error('Failed to load seating chart:', error);
      } finally {
        setIsLoaded(true);
      }
    };
    loadChart();
  }, [classCode]);

  // 저장
  const handleSave = async () => {
    if (!classCode) return;
    setIsSaving(true);
    try {
      await setDoc(doc(db, 'seatingCharts', classCode), {
        classCode,
        rows,
        cols,
        seats,
        groups,
        updatedAt: serverTimestamp()
      });
      setIsDirty(false);
    } catch (error) {
      console.error('Failed to save seating chart:', error);
      alert('자리 배치 저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const markDirty = () => setIsDirty(true);

  // 삭제된 학생이 좌석에 남아있으면 정리
  const validSeats = {};
  Object.entries(seats).forEach(([key, studentId]) => {
    const [r, c] = key.split('_').map(Number);
    if (r < rows && c < cols && studentById(studentId)) {
      validSeats[key] = studentId;
    }
  });

  const assignedIds = new Set(Object.values(validSeats));
  const unassignedStudents = studentsData.filter(s => !assignedIds.has(s.id));

  // 격자 범위 밖의 모둠 지정 정리
  const validGroups = {};
  Object.entries(groups).forEach(([key, gid]) => {
    const [r, c] = key.split('_').map(Number);
    if (r < rows && c < cols) validGroups[key] = gid;
  });
  const groupIds = [...new Set(Object.values(validGroups))].sort((a, b) => a - b);

  // 갈등 신호가 있는 두 학생이 인접(옆/앞뒤/대각선)해 있는지 검사
  const conflictAdjacencyWarnings = (() => {
    const nicknameToId = new Map(studentsData.filter(s => s.nickname).map(s => [s.nickname, s.id]));
    const pairs = new Set();
    studentsData.forEach(s => {
      (s.conflicts || []).forEach(nick => {
        const targetId = nicknameToId.get(nick);
        if (targetId && targetId !== s.id) pairs.add([s.id, targetId].sort().join('|'));
      });
    });
    const posById = {};
    Object.entries(validSeats).forEach(([key, sid]) => {
      const [r, c] = key.split('_').map(Number);
      posById[sid] = { r, c };
    });
    const warnings = [];
    pairs.forEach(pair => {
      const [a, b] = pair.split('|');
      const pa = posById[a];
      const pb = posById[b];
      if (pa && pb && Math.abs(pa.r - pb.r) <= 1 && Math.abs(pa.c - pb.c) <= 1) {
        const sa = studentById(a);
        const sb = studentById(b);
        if (sa && sb) warnings.push(`${sa.realName} ↔ ${sb.realName}`);
      }
    });
    return warnings;
  })();

  // ===== 배치 로직 =====
  const placeStudent = (studentId, targetKey) => {
    setSeats(prev => {
      const next = { ...prev };
      // 이 학생이 앉아있던 기존 좌석 찾기
      const fromKey = Object.keys(next).find(k => next[k] === studentId);
      const occupantId = next[targetKey]; // 목표 좌석에 이미 앉은 학생

      if (fromKey) delete next[fromKey];
      if (occupantId && occupantId !== studentId) {
        // 자리 교환: 기존 좌석이 있으면 그 자리로, 없으면 미배치로
        if (fromKey) next[fromKey] = occupantId;
      }
      next[targetKey] = studentId;
      return next;
    });
    markDirty();
  };

  const unassignStudent = (studentId) => {
    setSeats(prev => {
      const next = { ...prev };
      const key = Object.keys(next).find(k => next[k] === studentId);
      if (key) delete next[key];
      return next;
    });
    markDirty();
  };

  // ===== 드래그 앤 드롭 핸들러 =====
  const handleDragStart = (e, studentId, fromKey = null) => {
    dragSourceRef.current = { studentId, fromKey };
    e.dataTransfer.effectAllowed = 'move';
    // Firefox 호환: 데이터가 있어야 드래그가 동작함
    e.dataTransfer.setData('text/plain', studentId);
  };

  const handleSeatDrop = (e, targetKey) => {
    e.preventDefault();
    setDragOverKey(null);
    const source = dragSourceRef.current;
    if (!source) return;
    placeStudent(source.studentId, targetKey);
    dragSourceRef.current = null;
  };

  const handlePoolDrop = (e) => {
    e.preventDefault();
    setIsPoolDragOver(false);
    const source = dragSourceRef.current;
    if (!source || !source.fromKey) return; // 이미 미배치 상태면 무시
    unassignStudent(source.studentId);
    dragSourceRef.current = null;
  };

  // ===== 클릭 배치(터치 환경 대안) =====
  const handleStudentClick = (studentId) => {
    setSelectedStudentId(prev => (prev === studentId ? null : studentId));
  };

  const handleSeatClick = (targetKey) => {
    // 모둠 지정 모드: 좌석 선택/해제 토글
    if (isGroupMode) {
      setPendingSeats(prev =>
        prev.includes(targetKey) ? prev.filter(k => k !== targetKey) : [...prev, targetKey]
      );
      return;
    }
    if (selectedStudentId) {
      placeStudent(selectedStudentId, targetKey);
      setSelectedStudentId(null);
    } else if (validSeats[targetKey]) {
      // 좌석의 학생을 클릭하면 선택 상태로
      setSelectedStudentId(validSeats[targetKey]);
    }
  };

  // ===== 자동 배치 / 초기화 =====
  const handleAutoAssign = () => {
    const next = { ...validSeats };
    const remaining = studentsData.filter(s => !new Set(Object.values(next)).has(s.id));
    let i = 0;
    outer:
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (i >= remaining.length) break outer;
        const key = seatKey(r, c);
        if (!next[key]) {
          next[key] = remaining[i].id;
          i++;
        }
      }
    }
    setSeats(next);
    markDirty();
  };

  const handleClearAll = () => {
    if (window.confirm('모든 자리 배치를 비우시겠습니까?')) {
      setSeats({});
      markDirty();
    }
  };

  const handleShuffle = () => {
    const shuffled = [...studentsData].sort(() => Math.random() - 0.5);
    const next = {};
    let i = 0;
    outer:
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (i >= shuffled.length) break outer;
        next[seatKey(r, c)] = shuffled[i].id;
        i++;
      }
    }
    setSeats(next);
    markDirty();
  };

  // ===== 모둠 지정 =====
  const toggleGroupMode = () => {
    setIsGroupMode(prev => !prev);
    setPendingSeats([]);
    setSelectedStudentId(null);
  };

  const handleCreateGroup = () => {
    if (pendingSeats.length < 2) {
      alert('모둠으로 묶을 자리를 2개 이상 선택해주세요.');
      return;
    }
    const nextId = groupIds.length > 0 ? Math.max(...groupIds.map(Number)) + 1 : 1;
    setGroups(prev => {
      const next = { ...prev };
      pendingSeats.forEach(key => { next[key] = nextId; });
      return next;
    });
    setPendingSeats([]);
    markDirty();
  };

  const handleRemoveGroup = (gid) => {
    setGroups(prev => Object.fromEntries(Object.entries(prev).filter(([, v]) => v !== gid)));
    markDirty();
  };

  const handleClearGroups = () => {
    if (window.confirm('모든 모둠 지정을 해제하시겠습니까?')) {
      setGroups({});
      setPendingSeats([]);
      markDirty();
    }
  };

  // ===== AI 자리 배치 제안 =====
  // 개인정보 보호: 실명/닉네임 대신 익명 ID(S1, S2...)로 변환한 데이터만 서버로 전송합니다.
  const handleAiPropose = async () => {
    if (studentsData.length === 0) {
      alert('등록된 학생이 없습니다. [학생 관리]에서 먼저 학생을 추가해주세요.');
      return;
    }
    setIsAiLoading(true);
    setAiError('');
    setAiProposal(null);
    try {
      // 1) 실명/닉네임 → 익명 ID 매핑 생성
      const anonById = new Map();
      const idByAnon = new Map();
      studentsData.forEach((s, i) => {
        const anon = `S${i + 1}`;
        anonById.set(s.id, anon);
        idByAnon.set(anon, s.id);
      });
      const anonByNickname = new Map(
        studentsData.filter(s => s.nickname).map(s => [s.nickname, anonById.get(s.id)])
      );

      // 2) 받은 지목 수 집계 (닉네임 → 익명 ID 변환)
      const receivedCount = {};
      studentsData.forEach(s => {
        (s.nominations || []).forEach(nick => {
          const anon = anonByNickname.get(nick);
          if (anon && anon !== anonById.get(s.id)) {
            receivedCount[anon] = (receivedCount[anon] || 0) + 1;
          }
        });
      });

      // 3) 익명화된 분석용 데이터 구성 (기분 + 관계만 전송, 이름/대화내용 미포함)
      const students = studentsData.map(s => {
        const myAnon = anonById.get(s.id);
        return {
          id: myAnon,
          mood: s.mood || '보통',
          gender: s.gender === '남' || s.gender === '여' ? s.gender : '미상',
          chosen: [...new Set(
            (s.nominations || [])
              .map(nick => anonByNickname.get(nick))
              .filter(anon => anon && anon !== myAnon)
          )],
          received: receivedCount[myAnon] || 0,
          // 갈등 신호 상대 (익명 ID) 및 외로움 신호 횟수
          conflictWith: [...new Set(
            (s.conflicts || [])
              .map(nick => anonByNickname.get(nick))
              .filter(anon => anon && anon !== myAnon)
          )],
          lonely: (s.lonelySignals || []).length
        };
      });

      const res = await fetch('/api/gemini-seating', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows, cols, students })
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        if (res.status === 404) {
          throw new Error('AI 배치 API(/api/gemini-seating)를 서버에서 찾을 수 없습니다. 새 api 파일이 포함되도록 다시 배포해주세요. (로컬 테스트는 npm run dev가 아닌 "vercel dev"로 실행해야 /api가 동작합니다)');
        }
        if (res.status === 500 && errData.error && String(errData.error).includes('GEMINI_API_KEY')) {
          throw new Error('서버에 GEMINI_API_KEY가 설정되지 않았습니다. Vercel > Settings > Environment Variables 등록 후 재배포해주세요.');
        }
        throw new Error(errData.error || `AI 서버 응답 오류가 발생했습니다. (HTTP ${res.status})`);
      }
      const data = await res.json();

      // 4) 응답 검증: 좌석 범위 확인, 중복 좌석/중복 학생 제거, 익명 ID → 실제 학생 복원
      const proposedSeats = {};
      const usedStudents = new Set();
      (data.assignments || []).forEach(a => {
        const studentId = idByAnon.get(a.id);
        const r = Number(a.row);
        const c = Number(a.col);
        if (!studentId || usedStudents.has(studentId)) return;
        if (!Number.isInteger(r) || !Number.isInteger(c) || r < 0 || r >= rows || c < 0 || c >= cols) return;
        const key = seatKey(r, c);
        if (proposedSeats[key]) return;
        proposedSeats[key] = studentId;
        usedStudents.add(studentId);
      });

      if (Object.keys(proposedSeats).length === 0) {
        throw new Error('AI가 유효한 배치안을 생성하지 못했습니다. 다시 시도해주세요.');
      }

      // 근거 문장 속 익명 ID를 실명으로 치환하는 함수
      const deanonymize = (text) => {
        if (!text) return '';
        return String(text).replace(/S(\d+)/g, (m, num) => {
          const st = studentById(idByAnon.get(`S${num}`));
          return st ? st.realName : m;
        });
      };

      const highlights = (data.highlights || [])
        .map(h => {
          const st = studentById(idByAnon.get(h.id));
          return st ? { name: st.realName, avatar: st.avatar, reason: deanonymize(h.reason) } : null;
        })
        .filter(Boolean);

      setAiProposal({
        seats: proposedSeats,
        rationale: deanonymize(data.rationale),
        highlights,
        placedCount: Object.keys(proposedSeats).length
      });
    } catch (error) {
      console.error('AI seating proposal failed:', error);
      setAiError(error.message || 'AI 배치 제안 중 오류가 발생했습니다.');
    } finally {
      setIsAiLoading(false);
    }
  };

  const applyAiProposal = () => {
    if (!aiProposal) return;
    setSeats(aiProposal.seats);
    markDirty();
    setAiProposal(null);
  };

  const changeGrid = (which, delta) => {
    if (which === 'rows') {
      setRows(prev => Math.min(MAX_SIZE, Math.max(MIN_SIZE, prev + delta)));
    } else {
      setCols(prev => Math.min(MAX_SIZE, Math.max(MIN_SIZE, prev + delta)));
    }
    markDirty();
  };

  const totalSeats = rows * cols;

  const toolbarBtn = (disabled = false) => ({
    padding: '10px 16px', borderRadius: '10px', border: '1px solid #e2e8f0',
    background: 'white', color: '#4a5568', fontWeight: 600, fontSize: '0.9rem',
    cursor: disabled ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
    opacity: disabled ? 0.6 : 1
  });

  return (
    <div className="glass-card" style={{ padding: '32px', display: 'flex', flexDirection: 'column', flex: 1 }} id="print-area">
      {/* 인쇄 전용 헤더 (화면에서는 숨김) */}
      <div className="print-only" style={{ marginBottom: '16px', textAlign: 'center' }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem', color: '#2d3748' }}>
          {classLabel ? `${classLabel} ` : ''}자리 배치도
        </h1>
        <p style={{ margin: '6px 0 0 0', color: '#718096', fontSize: '0.85rem' }}>
          인쇄일: {new Date().toLocaleDateString('ko-KR')} · 이름 색: <b style={{ color: '#2b6cb0' }}>파랑=남</b> / <b style={{ color: '#b83280' }}>분홍=여</b> · 같은 색 점선 테두리 = 같은 모둠
        </p>
      </div>

      {/* 헤더 */}
      <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
        <div style={{ background: 'var(--primary-light)', padding: '12px', borderRadius: '16px' }}>
          <LayoutGrid size={28} color="var(--primary-color)" />
        </div>
        <h2 style={{ color: '#2d3748', margin: 0, fontSize: '1.8rem' }}>자리 배치도</h2>
        {isDirty && (
          <span style={{ fontSize: '0.85rem', color: '#d69e2e', fontWeight: 'bold', background: '#fffff0', padding: '4px 12px', borderRadius: '12px', border: '1px solid #ecc94b' }}>
            저장되지 않은 변경사항
          </span>
        )}
      </div>
      <p className="no-print" style={{ color: '#718096', marginBottom: '20px', fontSize: '1.05rem', paddingLeft: '52px' }}>
        아래 명단의 학생을 좌석으로 <b>드래그</b>하여 배치하세요. 좌석끼리 드래그하면 자리가 서로 바뀝니다. (클릭으로 선택 → 좌석 클릭도 가능)
      </p>

      {/* 툴바 */}
      <div className="no-print" style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '6px 12px' }}>
          <span style={{ fontSize: '0.9rem', color: '#4a5568', fontWeight: 600 }}>앞뒤 줄 수: {rows}</span>
          <button onClick={() => changeGrid('rows', -1)} style={{ background: 'white', borderRadius: '6px', cursor: 'pointer', padding: '4px', border: '1px solid #e2e8f0', display: 'flex' }}><Minus size={14} /></button>
          <button onClick={() => changeGrid('rows', 1)} style={{ background: 'white', borderRadius: '6px', cursor: 'pointer', padding: '4px', border: '1px solid #e2e8f0', display: 'flex' }}><Plus size={14} /></button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '6px 12px' }}>
          <span style={{ fontSize: '0.9rem', color: '#4a5568', fontWeight: 600 }}>좌우 자리 수: {cols}</span>
          <button onClick={() => changeGrid('cols', -1)} style={{ background: 'white', borderRadius: '6px', cursor: 'pointer', padding: '4px', border: '1px solid #e2e8f0', display: 'flex' }}><Minus size={14} /></button>
          <button onClick={() => changeGrid('cols', 1)} style={{ background: 'white', borderRadius: '6px', cursor: 'pointer', padding: '4px', border: '1px solid #e2e8f0', display: 'flex' }}><Plus size={14} /></button>
        </div>

        <button onClick={handleAutoAssign} style={toolbarBtn()} title="미배치 학생을 빈 자리에 순서대로 배치">
          <LayoutGrid size={16} /> 자동 배치
        </button>
        <button onClick={handleShuffle} style={toolbarBtn()} title="전체 학생을 무작위로 재배치">
          <Shuffle size={16} /> 랜덤 섞기
        </button>
        <button
          onClick={handleAiPropose}
          disabled={isAiLoading}
          title="학생들의 정서·교우관계 데이터를 분석해 AI가 자리 배치를 제안합니다"
          style={{
            padding: '10px 18px', borderRadius: '10px', border: 'none',
            background: isAiLoading ? '#a0aec0' : 'linear-gradient(90deg, #805ad5, #4a90e2)',
            color: 'white', fontWeight: 'bold', fontSize: '0.9rem',
            cursor: isAiLoading ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', gap: '6px',
            boxShadow: '0 4px 12px rgba(128, 90, 213, 0.3)'
          }}
        >
          <Sparkles size={16} /> {isAiLoading ? 'AI 분석 중...' : 'AI 배치 제안'}
        </button>
        <button onClick={handleClearAll} style={toolbarBtn()} title="모든 좌석 비우기">
          <RotateCcw size={16} /> 전체 비우기
        </button>
        <button
          onClick={toggleGroupMode}
          title="자리를 클릭으로 선택해서 모둠으로 묶습니다"
          style={{
            ...toolbarBtn(),
            border: isGroupMode ? '2px solid #38a169' : '1px solid #e2e8f0',
            background: isGroupMode ? '#f0fff4' : 'white',
            color: isGroupMode ? '#38a169' : '#4a5568'
          }}
        >
          <Layers size={16} /> {isGroupMode ? '모둠 지정 중...' : '모둠 지정'}
        </button>
        <button onClick={() => window.print()} style={toolbarBtn()} title="자리 배치도 인쇄">
          <Printer size={16} /> 인쇄
        </button>

        <button
          onClick={handleSave}
          disabled={isSaving || !isDirty}
          style={{
            marginLeft: 'auto', padding: '10px 24px', borderRadius: '10px', border: 'none',
            background: isSaving || !isDirty ? '#a0aec0' : 'var(--primary-color)', color: 'white',
            fontWeight: 'bold', fontSize: '0.95rem', cursor: isSaving || !isDirty ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(74, 144, 226, 0.3)'
          }}
        >
          <Save size={18} /> {isSaving ? '저장 중...' : isDirty ? '배치 저장' : '저장됨'}
        </button>
      </div>

      {aiError && (
        <div className="no-print" style={{ marginBottom: '16px', padding: '12px 16px', background: '#fff5f5', border: '1px solid #feb2b2', borderRadius: '12px', color: '#c53030', fontSize: '0.9rem', fontWeight: 600 }}>
          ⚠️ {aiError}
        </div>
      )}

      {/* 갈등 학생 인접 경고 */}
      {conflictAdjacencyWarnings.length > 0 && (
        <div className="no-print" style={{ marginBottom: '16px', padding: '12px 16px', background: '#fffaf0', border: '2px solid #dd6b20', borderRadius: '12px', color: '#9c4221', fontSize: '0.92rem', fontWeight: 600, lineHeight: 1.6 }}>
          ⚠️ 갈등 신호가 있는 학생들이 인접해 있어요: <b>{conflictAdjacencyWarnings.join(' · ')}</b>
          <span style={{ fontWeight: 'normal', color: '#b7791f' }}> — 자리를 조정하는 것을 권장합니다. (자세한 내용은 [관계 신호] 메뉴 참고)</span>
        </div>
      )}

      {/* 모둠 지정 모드 안내 바 */}
      {isGroupMode && (
        <div className="no-print" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px', marginBottom: '16px', padding: '12px 16px', background: '#f0fff4', border: '2px solid #48bb78', borderRadius: '12px' }}>
          <span style={{ fontWeight: 'bold', color: '#276749', fontSize: '0.95rem' }}>
            🧩 모둠 지정 모드 — 묶을 자리를 클릭하세요 ({pendingSeats.length}개 선택됨)
          </span>
          <button
            onClick={handleCreateGroup}
            style={{ padding: '8px 18px', borderRadius: '10px', border: 'none', background: '#38a169', color: 'white', fontWeight: 'bold', fontSize: '0.9rem', cursor: 'pointer' }}
          >
            선택한 자리 묶기
          </button>
          <button
            onClick={() => setPendingSeats([])}
            style={{ padding: '8px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', background: 'white', color: '#4a5568', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer' }}
          >
            선택 취소
          </button>
          <button
            onClick={toggleGroupMode}
            style={{ marginLeft: 'auto', padding: '8px 18px', borderRadius: '10px', border: '1px solid #38a169', background: 'white', color: '#38a169', fontWeight: 'bold', fontSize: '0.9rem', cursor: 'pointer' }}
          >
            완료
          </button>
        </div>
      )}

      {/* 모둠 목록 칩 */}
      {groupIds.length > 0 && (
        <div className="no-print" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          {groupIds.map(gid => {
            const count = Object.values(validGroups).filter(v => v === gid).length;
            const color = groupColor(gid);
            return (
              <span key={gid} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '20px', border: `2px dashed ${color}`, background: `${color}14`, fontSize: '0.85rem', fontWeight: 'bold', color }}>
                {gid}모둠 · {count}자리
                <button
                  onClick={() => handleRemoveGroup(gid)}
                  title={`${gid}모둠 해제`}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color, padding: 0, display: 'flex' }}
                >
                  <X size={14} />
                </button>
              </span>
            );
          })}
          <button
            onClick={handleClearGroups}
            style={{ padding: '6px 12px', borderRadius: '20px', border: '1px solid #cbd5e1', background: 'white', color: '#718096', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
          >
            모둠 전체 해제
          </button>
        </div>
      )}

      {!isLoaded ? (
        <div style={{ padding: '60px', textAlign: 'center', color: '#a0aec0' }}>자리 배치도를 불러오는 중...</div>
      ) : (
        <>
          {/* 칠판/교탁 표시 */}
          <div style={{ background: 'linear-gradient(90deg, #2d3748, #4a5568)', color: 'white', textAlign: 'center', padding: '10px', borderRadius: '12px', marginBottom: '20px', fontWeight: 'bold', letterSpacing: '4px', fontSize: '0.95rem' }}>
            🧑‍🏫 칠판 · 교탁 (앞)
          </div>

          {/* 좌석 그리드 */}
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: '12px', marginBottom: '24px' }}>
            {Array.from({ length: totalSeats }).map((_, idx) => {
              const r = Math.floor(idx / cols);
              const c = idx % cols;
              const key = seatKey(r, c);
              const studentId = validSeats[key];
              const student = studentId ? studentById(studentId) : null;
              const isOver = dragOverKey === key;
              const colors = student ? moodColor(student.mood) : null;
              const gid = validGroups[key];
              const gColor = gid ? groupColor(gid) : null;
              const isPending = isGroupMode && pendingSeats.includes(key);

              return (
                <div
                  key={key}
                  onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOverKey(key); }}
                  onDragLeave={() => setDragOverKey(prev => (prev === key ? null : prev))}
                  onDrop={(e) => handleSeatDrop(e, key)}
                  onClick={() => handleSeatClick(key)}
                  style={{
                    minHeight: '92px', borderRadius: '14px', padding: '10px 8px',
                    border: isOver
                      ? '2px dashed var(--primary-color)'
                      : isPending
                        ? '3px solid var(--primary-color)'
                        : gid
                          ? `3px dashed ${gColor}` // 같은 모둠 = 같은 색 점선 테두리
                          : student
                            ? `2px solid ${colors.border}`
                            : '2px dashed #cbd5e1',
                    background: isOver
                      ? 'var(--primary-light)'
                      : isPending
                        ? 'rgba(74, 144, 226, 0.15)'
                        : gid
                          ? `${gColor}1a` // 모둠 색상의 옅은 배경
                          : student ? colors.bg : '#f8fafc',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    gap: '4px', cursor: 'pointer', transition: 'all 0.15s', position: 'relative',
                    boxShadow: selectedStudentId && student && selectedStudentId === student.id ? '0 0 0 3px var(--primary-color)' : 'none'
                  }}
                >
                  {gid && (
                    <span style={{ position: 'absolute', top: '4px', left: '7px', fontSize: '0.62rem', fontWeight: 'bold', color: gColor, letterSpacing: '0.5px' }}>
                      {gid}모둠
                    </span>
                  )}
                  {student ? (
                    <div
                      draggable
                      onDragStart={(e) => handleDragStart(e, student.id, key)}
                      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', cursor: 'grab', width: '100%' }}
                      title={`${student.realName} (${student.nickname || ''})`}
                    >
                      <span style={{ fontSize: '1.7rem', lineHeight: 1 }}>{student.avatar || '👤'}</span>
                      <span style={{ fontWeight: 'bold', color: genderNameColor(student.gender), fontSize: '0.9rem', textAlign: 'center', wordBreak: 'keep-all' }}>
                        {student.realName}
                      </span>
                      {student.nickname && student.nickname !== student.realName && (
                        <span style={{ color: '#a0aec0', fontSize: '0.72rem', textAlign: 'center', wordBreak: 'keep-all', lineHeight: 1.2 }}>
                          ({student.nickname})
                        </span>
                      )}
                      <button
                        className="no-print"
                        onClick={(e) => { e.stopPropagation(); unassignStudent(student.id); setSelectedStudentId(null); }}
                        title="배치 해제"
                        style={{
                          position: 'absolute', top: '4px', right: '4px', background: 'white',
                          border: '1px solid #e2e8f0', borderRadius: '50%', width: '20px', height: '20px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#a0aec0', padding: 0
                        }}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <span style={{ color: '#cbd5e1', fontSize: '0.8rem' }}>{r + 1}-{c + 1}</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* 미배치 학생 풀 */}
          <div
            className="no-print"
            onDragOver={(e) => { e.preventDefault(); setIsPoolDragOver(true); }}
            onDragLeave={() => setIsPoolDragOver(false)}
            onDrop={handlePoolDrop}
            style={{
              border: isPoolDragOver ? '2px dashed var(--primary-color)' : '2px dashed #e2e8f0',
              background: isPoolDragOver ? 'var(--primary-light)' : 'white',
              borderRadius: '16px', padding: '16px 20px', transition: 'all 0.15s'
            }}
          >
            <div style={{ fontWeight: 'bold', color: '#4a5568', marginBottom: '12px', fontSize: '0.95rem' }}>
              🎒 미배치 학생 ({unassignedStudents.length}명)
              <span style={{ fontWeight: 'normal', color: '#a0aec0', marginLeft: '8px', fontSize: '0.85rem' }}>
                좌석의 학생을 이곳으로 드래그하면 배치가 해제됩니다
              </span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', minHeight: '44px' }}>
              {unassignedStudents.length === 0 ? (
                <span style={{ color: '#a0aec0', fontSize: '0.9rem', alignSelf: 'center' }}>
                  {studentsData.length === 0 ? '등록된 학생이 없습니다. [학생 관리]에서 먼저 학생을 추가해주세요.' : '모든 학생이 배치되었습니다! 🎉'}
                </span>
              ) : (
                unassignedStudents.map(student => (
                  <div
                    key={student.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, student.id, null)}
                    onClick={() => handleStudentClick(student.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px',
                      borderRadius: '20px', cursor: 'grab', userSelect: 'none',
                      border: selectedStudentId === student.id ? '2px solid var(--primary-color)' : '1px solid #e2e8f0',
                      background: selectedStudentId === student.id ? 'var(--primary-light)' : '#f8fafc',
                      fontWeight: 600, fontSize: '0.9rem', color: genderNameColor(student.gender), transition: 'all 0.15s'
                    }}
                    title="드래그하거나 클릭하여 선택 후 좌석을 클릭하세요"
                  >
                    <span style={{ fontSize: '1.2rem' }}>{student.avatar || '👤'}</span>
                    {student.realName}
                  </div>
                ))
              )}
            </div>
          </div>

          {selectedStudentId && (
            <div className="no-print" style={{ marginTop: '12px', textAlign: 'center', color: 'var(--primary-color)', fontWeight: 'bold', fontSize: '0.9rem' }}>
              ✅ '{studentById(selectedStudentId)?.realName}' 선택됨 — 배치할 좌석을 클릭하세요 (다시 클릭하면 선택 해제)
            </div>
          )}
        </>
      )}

      {/* AI 배치 제안 모달 */}
      {aiProposal && (
        <div className="no-print" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '32px', borderRadius: '24px', width: '92%', maxWidth: '560px', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <h3 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1.4rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Sparkles size={22} color="#805ad5" /> AI 자리 배치 제안
              </h3>
              <button onClick={() => setAiProposal(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#a0aec0' }}>
                <X size={24} />
              </button>
            </div>
            <p style={{ color: '#a0aec0', fontSize: '0.85rem', margin: '0 0 20px 0' }}>
              학생 {aiProposal.placedCount}명 배치안 · 정서 상태와 교우관계 데이터를 분석했습니다 (실명은 익명 처리 후 분석)
            </p>

            {/* 전체 배치 근거 */}
            <div style={{ background: '#faf5ff', border: '1px solid #e9d8fd', borderRadius: '16px', padding: '18px 20px', marginBottom: '16px' }}>
              <div style={{ fontWeight: 'bold', color: '#553c9a', marginBottom: '8px', fontSize: '0.95rem' }}>📋 전체 배치 원칙</div>
              <p style={{ margin: 0, color: '#4a5568', fontSize: '0.95rem', lineHeight: 1.7 }}>
                {aiProposal.rationale || '배치 근거가 제공되지 않았습니다.'}
              </p>
            </div>

            {/* 배치안 미리보기 (실명 표시) */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontWeight: 'bold', color: '#4a5568', marginBottom: '10px', fontSize: '0.95rem' }}>🪑 배치안 미리보기</div>
              <div style={{ background: '#2d3748', color: 'white', textAlign: 'center', padding: '5px', borderRadius: '8px', marginBottom: '8px', fontSize: '0.75rem', fontWeight: 'bold', letterSpacing: '2px' }}>
                칠판 · 교탁 (앞)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: '5px' }}>
                {Array.from({ length: rows * cols }).map((_, idx) => {
                  const r = Math.floor(idx / cols);
                  const c = idx % cols;
                  const sid = aiProposal.seats[seatKey(r, c)];
                  const st = sid ? studentById(sid) : null;
                  const colors = st ? moodColor(st.mood) : null;
                  return (
                    <div
                      key={`preview-${r}-${c}`}
                      title={st ? `${st.realName}${st.nickname && st.nickname !== st.realName ? ` (${st.nickname})` : ''} · ${st.mood || '보통'}` : `빈 자리 ${r + 1}-${c + 1}`}
                      style={{
                        minHeight: '46px', borderRadius: '8px', padding: '4px 2px',
                        border: st ? `1.5px solid ${colors.border}` : '1.5px dashed #e2e8f0',
                        background: st ? colors.bg : '#f8fafc',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1px'
                      }}
                    >
                      {st ? (
                        <>
                          <span style={{ fontSize: '0.95rem', lineHeight: 1 }}>{st.avatar || '👤'}</span>
                          <span style={{ fontWeight: 'bold', color: genderNameColor(st.gender), fontSize: '0.68rem', textAlign: 'center', wordBreak: 'keep-all', lineHeight: 1.15 }}>
                            {st.realName}
                          </span>
                        </>
                      ) : (
                        <span style={{ color: '#cbd5e1', fontSize: '0.6rem' }}>{r + 1}-{c + 1}</span>
                      )}
                    </div>
                  );
                })}
              </div>
              <p style={{ margin: '8px 0 0 0', color: '#a0aec0', fontSize: '0.78rem' }}>
                테두리 색 = 학생 기분 상태 (🟢건강 · 🟡보통 · 🔴힘듦) · 이름 위에 마우스를 올리면 닉네임도 보입니다
              </p>
            </div>

            {/* 학생별 주요 배치 근거 */}
            {aiProposal.highlights.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontWeight: 'bold', color: '#4a5568', marginBottom: '10px', fontSize: '0.95rem' }}>💡 주요 학생 배치 근거</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {aiProposal.highlights.map((h, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px 14px' }}>
                      <span style={{ fontSize: '1.3rem', lineHeight: 1 }}>{h.avatar || '👤'}</span>
                      <div>
                        <span style={{ fontWeight: 'bold', color: '#2d3748', fontSize: '0.9rem' }}>{h.name}</span>
                        <p style={{ margin: '4px 0 0 0', color: '#718096', fontSize: '0.88rem', lineHeight: 1.6 }}>{h.reason}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setAiProposal(null)}
                style={{ flex: 1, padding: '14px', background: '#edf2f7', color: '#4a5568', border: 'none', borderRadius: '12px', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer' }}
              >
                취소
              </button>
              <button
                onClick={applyAiProposal}
                style={{ flex: 2, padding: '14px', background: 'linear-gradient(90deg, #805ad5, #4a90e2)', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(128, 90, 213, 0.3)' }}
              >
                이 배치안 적용하기
              </button>
            </div>
            <p style={{ margin: '12px 0 0 0', color: '#a0aec0', fontSize: '0.8rem', textAlign: 'center' }}>
              적용 후에도 드래그로 자유롭게 수정할 수 있으며, [배치 저장]을 눌러야 최종 저장됩니다.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SeatingChart;
