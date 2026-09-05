import React, { useState } from 'react';
import { Trash2, Users, UserPlus, ClipboardList, X } from 'lucide-react';
import { db } from '../firebase';
import { doc, deleteDoc, updateDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';

// 학생 등록 시 무작위로 부여할 기본 아바타 목록
const DEFAULT_AVATARS = [
  '🐻', '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐼', '🐨', '🐯',
  '🦁', '🐮', '🐷', '🐸', '🐵', '🐧', '🐦', '🦉', '🦄', '🐢',
  '🐬', '🐳', '🦋', '🌳', '🍀', '🌻', '🌷', '🍄'
];

const randomAvatar = () => DEFAULT_AVATARS[Math.floor(Math.random() * DEFAULT_AVATARS.length)];

/**
 * 학생 관리: 학생 명단 조회 / 개별 추가 / 일괄 추가 / 삭제
 * - 교사가 미리 실명을 등록해 두면, 학생이 같은 실명으로 입장할 때 해당 데이터가 그대로 연결됩니다.
 */
const StudentManagement = ({ studentsData, classCode }) => {
  // 개별 추가 폼 상태
  const [newName, setNewName] = useState('');
  const [newNickname, setNewNickname] = useState('');
  const [newGender, setNewGender] = useState('남'); // 마지막 선택 유지 → 남학생/여학생 명단을 연달아 빠르게 입력 가능
  const [isAdding, setIsAdding] = useState(false);

  // 일괄 추가 모달 상태
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [isBulkAdding, setIsBulkAdding] = useState(false);
  const [isPurging, setIsPurging] = useState(false);

  // 저장된 대화 원문이 있는 학생 수 (개인정보 보관 최소화용)
  const transcriptCount = studentsData.filter(s => Array.isArray(s.messages) && s.messages.length > 0).length;

  // 대화 원문만 일괄 삭제 — 신호(지목·갈등·외로움·기분·위기 알림)와 처방은 유지
  const handlePurgeTranscripts = async () => {
    if (!window.confirm(`학생 ${transcriptCount}명의 대화 원문을 모두 삭제할까요?\n지목·갈등·외로움·기분 신호, 위기 알림, 맞춤 처방은 그대로 남습니다. 이 작업은 되돌릴 수 없습니다.`)) return;
    setIsPurging(true);
    try {
      for (const s of studentsData) {
        if (Array.isArray(s.messages) && s.messages.length > 0) {
          await updateDoc(doc(db, 'students', s.id), { messages: [], transcriptsPurgedAt: new Date().toISOString() });
        }
      }
      alert('대화 원문을 삭제했습니다.');
    } catch (error) {
      console.error('Failed to purge transcripts:', error);
      alert('삭제 중 오류가 발생했습니다.');
    } finally {
      setIsPurging(false);
    }
  };

  const createStudentDoc = async (realName, nickname, gender) => {
    await addDoc(collection(db, 'students'), {
      realName,
      nickname: nickname || realName,
      gender: gender === '남' || gender === '여' ? gender : '',
      mood: '보통',
      avatar: randomAvatar(),
      classCode,
      createdAt: serverTimestamp(),
      lastActive: serverTimestamp(),
      messages: [],
      nominations: [],
      addedBy: 'teacher' // 교사 사전 등록 표시
    });
  };

  // 개별 학생 추가
  const handleAdd = async () => {
    const name = newName.trim();
    if (!name) {
      alert('학생 실명을 입력해주세요.');
      return;
    }
    if (studentsData.some(s => s.realName === name)) {
      alert(`'${name}' 학생은 이미 명단에 있습니다.`);
      return;
    }
    setIsAdding(true);
    try {
      await createStudentDoc(name, newNickname.trim(), newGender);
      setNewName('');
      setNewNickname('');
      // newGender는 초기화하지 않음: 같은 성별 명단을 연속 입력할 때 빠름
    } catch (error) {
      console.error('Error adding student:', error);
      alert('학생 추가 중 오류가 발생했습니다.');
    } finally {
      setIsAdding(false);
    }
  };

  // 일괄 추가: 한 줄에 한 명씩, "실명" 또는 "실명,닉네임" 형식
  const handleBulkAdd = async () => {
    const lines = bulkText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    if (lines.length === 0) {
      alert('추가할 학생 명단을 입력해주세요.');
      return;
    }

    setIsBulkAdding(true);
    let added = 0;
    let skipped = 0;
    try {
      const existingNames = new Set(studentsData.map(s => s.realName));
      for (const line of lines) {
        // 형식: "실명" / "실명,성별" / "실명,닉네임" / "실명,닉네임,성별" (성별: 남/여, 순서 무관)
        const parts = line.split(',').map(part => part.trim()).filter(Boolean);
        const name = parts[0];
        let nickname = '';
        let gender = '';
        for (const part of parts.slice(1)) {
          if (part === '남' || part === '여' || part === '남자' || part === '여자') {
            gender = part.charAt(0);
          } else if (!nickname) {
            nickname = part;
          }
        }
        if (!name || existingNames.has(name)) {
          skipped++;
          continue;
        }
        await createStudentDoc(name, nickname, gender);
        existingNames.add(name);
        added++;
      }
      alert(`일괄 등록 완료! (추가: ${added}명${skipped > 0 ? `, 건너뜀(중복/빈 줄): ${skipped}명` : ''})`);
      setBulkText('');
      setIsBulkOpen(false);
    } catch (error) {
      console.error('Error bulk adding students:', error);
      alert(`일괄 등록 중 오류가 발생했습니다. (${added}명까지 추가됨)`);
    } finally {
      setIsBulkAdding(false);
    }
  };

  // 자유 대화 모드(학생 단위): 챗봇이 유일한 출구인 학생을 위해 관계 태그·기술 태그·하루 상한을 끄고 위기 알림만 남긴다
  const handleToggleFreeTalk = async (student) => {
    const next = !student.freeTalk;
    if (next && !window.confirm(`${student.realName} 학생을 '자유 대화 모드'로 바꿀까요?\n\n- 친구 지목·갈등·외로움·기술 태그를 기록하지 않습니다 (관계망·처방에 반영 안 됨)\n- 하루 대화 상한이 적용되지 않습니다\n- 위기 알림(5개 중대 범주)은 그대로 유지됩니다`)) return;
    try {
      await updateDoc(doc(db, 'students', student.id), { freeTalk: next, freeTalkChangedAt: new Date().toISOString() });
    } catch (error) {
      console.error('Error updating freeTalk:', error);
      alert('모드 변경 중 오류가 발생했습니다.');
    }
  };

  // 명단에서 성별 직접 변경 (기존에 성별 없이 등록된 학생도 여기서 지정 가능)
  const handleSetGender = async (studentId, gender) => {
    try {
      await updateDoc(doc(db, 'students', studentId), { gender });
    } catch (error) {
      console.error('Error updating gender:', error);
      alert('성별 변경 중 오류가 발생했습니다.');
    }
  };

  const handleDelete = async (studentId, studentName) => {
    if (window.confirm(`${studentName} 학생을 정말 삭제하시겠습니까? (관련 대화 내역도 모두 삭제됩니다)`)) {
      try {
        await deleteDoc(doc(db, 'students', studentId));
        alert('삭제되었습니다.');
      } catch (error) {
        console.error('Error deleting student:', error);
        alert('삭제 중 오류가 발생했습니다.');
      }
    }
  };

  const G = ({ g, active, onClick, size = 'md' }) => {
    const male = g === '남';
    const color = male ? '#2b6cb0' : '#b83280';
    return (
      <button onClick={onClick} className="sm-g" style={{ padding: size === 'sm' ? '3px 9px' : '8px 14px', fontSize: size === 'sm' ? '0.78rem' : '0.9rem', border: `1.5px solid ${active ? color : '#e2e8f0'}`, background: active ? (male ? '#ebf8ff' : '#fff5f7') : '#fff', color: active ? color : '#a0aec0' }}>
        {male ? '👦 남' : '👧 여'}
      </button>
    );
  };

  return (
    <div className="glass-card sm-page">
      <div className="sm-head">
        <div className="sm-title"><Users size={20} /> 학생 관리 <span className="sm-count">{studentsData.length}명</span></div>
        <div className="sm-actions">
          <button className="btn btn-secondary" onClick={() => setIsBulkOpen(true)}><ClipboardList size={16} /> 명단 일괄 등록</button>
          <button className="sm-purge" onClick={handlePurgeTranscripts} disabled={isPurging || transcriptCount === 0} title="학기 말 등 보관 기간이 끝났을 때 대화 원문만 삭제합니다. 신호·처방은 유지됩니다.">🔒 {isPurging ? '삭제 중…' : `대화 원문 삭제 (${transcriptCount})`}</button>
        </div>
      </div>
      <div className="sm-help">미리 등록한 실명으로 학생이 입장하면 기록이 자동으로 이어집니다. 성별·대화 모드는 명단에서 바로 바꿀 수 있어요.</div>

      <div className="sm-add">
        <UserPlus size={18} color="var(--primary-color)" />
        <input type="text" value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAdd()} placeholder="실명 (예: 홍길동)" />
        <input type="text" value={newNickname} onChange={e => setNewNickname(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAdd()} placeholder="닉네임 (선택)" />
        <div className="sm-gwrap"><G g="남" active={newGender === '남'} onClick={() => setNewGender('남')} /><G g="여" active={newGender === '여'} onClick={() => setNewGender('여')} /></div>
        <button className="btn btn-primary" onClick={handleAdd} disabled={isAdding}><UserPlus size={16} /> {isAdding ? '추가 중…' : '추가'}</button>
      </div>

      <div className="sm-table-wrap">
        <table className="sm-table">
          <colgroup><col style={{ width: '56px' }} /><col style={{ width: '120px' }} /><col style={{ width: '150px' }} /><col /><col style={{ width: '90px' }} /><col style={{ width: '110px' }} /><col style={{ width: '56px' }} /></colgroup>
          <thead>
            <tr>
              <th></th><th>실명</th><th>성별</th><th>닉네임</th><th>상태</th><th title="관계 태그·하루 상한 없이 대화만. 위기 알림은 유지">대화 모드</th><th></th>
            </tr>
          </thead>
          <tbody>
            {studentsData.length === 0 ? (
              <tr><td colSpan="7" className="sm-empty">등록된 학생이 없어요. 위에서 추가하거나 명단을 붙여 넣으세요.</td></tr>
            ) : (
              studentsData.map((student, idx) => (
                <tr key={student.id || idx}>
                  <td className="sm-avatar">{student.avatar || '👤'}</td>
                  <td className="sm-name">{student.realName}</td>
                  <td><div className="sm-gwrap"><G size="sm" g="남" active={student.gender === '남'} onClick={() => handleSetGender(student.id, '남')} /><G size="sm" g="여" active={student.gender === '여'} onClick={() => handleSetGender(student.id, '여')} /></div></td>
                  <td className="sm-nick" title={student.nickname}>{student.nickname}</td>
                  <td><span className={`sm-mood ${student.mood === '건강' ? 'good' : student.mood === '보통' ? 'mid' : student.mood ? 'bad' : ''}`}>{student.mood || '—'}</span></td>
                  <td>
                    <button onClick={() => handleToggleFreeTalk(student)} className={`sm-mode ${student.freeTalk ? 'free' : ''}`} title={student.freeTalk ? '자유 대화 모드: 관계·기술 태그와 하루 상한 없음, 위기 알림만 유지. 클릭하면 일반 모드로' : '일반 모드: 관계 신호·성장 기록 수집. 클릭하면 자유 대화 모드로'}>{student.freeTalk ? '🍃 자유 대화' : '일반'}</button>
                  </td>
                  <td className="sm-del"><button onClick={() => handleDelete(student.id, student.realName)} title="학생 삭제"><Trash2 size={16} /></button></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 일괄 등록 모달 */}
      {isBulkOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '32px', borderRadius: '24px', width: '90%', maxWidth: '480px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h3 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1.4rem' }}>📋 명단 일괄 등록</h3>
              <button onClick={() => setIsBulkOpen(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#a0aec0' }}>
                <X size={24} />
              </button>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '16px', lineHeight: 1.6 }}>
              한 줄에 한 명씩 입력해주세요. 쉼표(,)로 구분하며 <b>남</b> 또는 <b>여</b>를 붙이면 성별이 함께 등록됩니다.<br />
              예: <b>실명,남</b> · <b>실명,닉네임,여</b> · <b>실명</b> (성별 생략 가능)
            </p>
            <textarea
              value={bulkText}
              onChange={e => setBulkText(e.target.value)}
              placeholder={'홍길동,남\n김철수,씩씩한 호랑이,남\n이영희,여'}
              rows={8}
              style={{ width: '100%', padding: '16px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '1rem', outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }}
            />
            <button
              onClick={handleBulkAdd}
              disabled={isBulkAdding}
              style={{
                width: '100%', marginTop: '16px', padding: '14px', background: isBulkAdding ? '#a0aec0' : 'var(--primary-color)',
                color: 'white', border: 'none', borderRadius: '12px', fontSize: '1.05rem', fontWeight: 'bold',
                cursor: isBulkAdding ? 'not-allowed' : 'pointer'
              }}
            >
              {isBulkAdding ? '등록 중...' : '일괄 등록하기'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentManagement;
