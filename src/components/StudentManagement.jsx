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

  const inputStyle = {
    padding: '12px 16px', borderRadius: '12px', border: '1px solid #cbd5e1',
    fontSize: '1rem', outline: 'none', background: 'white'
  };

  return (
    <div className="glass-card" style={{ padding: '32px', display: 'flex', flexDirection: 'column', flex: 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
        <div style={{ background: 'var(--primary-light)', padding: '12px', borderRadius: '16px' }}>
          <Users size={28} color="var(--primary-color)" />
        </div>
        <h2 style={{ color: '#2d3748', margin: 0, fontSize: '1.8rem' }}>학생 관리</h2>
      </div>
      <p style={{ color: '#718096', marginBottom: '24px', fontSize: '1.05rem', paddingLeft: '52px' }}>
        학생을 미리 등록하거나 삭제할 수 있습니다. 미리 등록된 실명으로 학생이 입장하면 데이터가 자동으로 연결됩니다.
        성별은 추가할 때 선택하거나, 아래 명단의 <b>👦남/👧여 버튼을 클릭</b>해서 언제든 지정·변경할 수 있습니다.
      </p>

      {/* 학생 추가 폼 */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '24px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '16px 20px' }}>
        <UserPlus size={22} color="var(--primary-color)" />
        <input
          type="text"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          placeholder="실명 (예: 홍길동)"
          style={{ ...inputStyle, flex: '1 1 160px' }}
        />
        <input
          type="text"
          value={newNickname}
          onChange={e => setNewNickname(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          placeholder="닉네임 (선택, 미입력 시 실명)"
          style={{ ...inputStyle, flex: '1 1 200px' }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '4px 6px 4px 12px' }}>
          <span style={{ fontSize: '0.9rem', color: '#718096', fontWeight: 'bold' }}>성별</span>
          <button
            onClick={() => setNewGender('남')}
            style={{
              padding: '12px 18px', borderRadius: '12px', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer',
              border: newGender === '남' ? '2px solid #2b6cb0' : '1px solid #cbd5e1',
              background: newGender === '남' ? '#ebf8ff' : 'white', color: '#2b6cb0'
            }}
          >
            👦 남
          </button>
          <button
            onClick={() => setNewGender('여')}
            style={{
              padding: '12px 18px', borderRadius: '12px', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer',
              border: newGender === '여' ? '2px solid #b83280' : '1px solid #cbd5e1',
              background: newGender === '여' ? '#fff5f7' : 'white', color: '#b83280'
            }}
          >
            👧 여
          </button>
        </div>
        <button
          onClick={handleAdd}
          disabled={isAdding}
          style={{
            padding: '12px 24px', background: isAdding ? '#a0aec0' : 'var(--primary-color)', color: 'white',
            border: 'none', borderRadius: '12px', fontWeight: 'bold', fontSize: '1rem',
            cursor: isAdding ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px'
          }}
        >
          <UserPlus size={18} /> {isAdding ? '추가 중...' : '학생 추가'}
        </button>
        <button
          onClick={() => setIsBulkOpen(true)}
          style={{
            padding: '12px 20px', background: 'white', color: 'var(--primary-color)',
            border: '1px solid var(--primary-color)', borderRadius: '12px', fontWeight: 'bold', fontSize: '1rem',
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'
          }}
        >
          <ClipboardList size={18} /> 명단 일괄 등록
        </button>
      </div>

      {/* 학생 목록 테이블 */}
      <div style={{ overflowX: 'auto', background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
              <th style={{ padding: '16px 20px', color: '#4a5568', fontWeight: 'bold' }}>캐릭터</th>
              <th style={{ padding: '16px 20px', color: '#4a5568', fontWeight: 'bold' }}>실명</th>
              <th style={{ padding: '16px 20px', color: '#4a5568', fontWeight: 'bold' }}>성별</th>
              <th style={{ padding: '16px 20px', color: '#4a5568', fontWeight: 'bold' }}>닉네임</th>
              <th style={{ padding: '16px 20px', color: '#4a5568', fontWeight: 'bold' }}>상태</th>
              <th style={{ padding: '16px 20px', color: '#4a5568', fontWeight: 'bold', textAlign: 'center' }}>삭제</th>
            </tr>
          </thead>
          <tbody>
            {studentsData.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ padding: '32px', textAlign: 'center', color: '#a0aec0' }}>등록된 학생이 없습니다. 위에서 학생을 추가해보세요!</td>
              </tr>
            ) : (
              studentsData.map((student, idx) => (
                <tr key={student.id || idx} style={{ borderBottom: '1px solid #edf2f7', transition: 'background 0.2s' }}>
                  <td style={{ padding: '16px 20px', fontSize: '1.5rem' }}>{student.avatar || '👤'}</td>
                  <td style={{ padding: '16px 20px', fontWeight: 'bold', color: '#2d3748' }}>{student.realName}</td>
                  <td style={{ padding: '16px 20px' }}>
                    <div style={{ display: 'flex', gap: '4px' }} title="클릭해서 성별을 지정/변경할 수 있습니다">
                      <button
                        onClick={() => handleSetGender(student.id, '남')}
                        style={{
                          padding: '4px 10px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer',
                          border: student.gender === '남' ? '1.5px solid #2b6cb0' : '1px solid #e2e8f0',
                          background: student.gender === '남' ? '#ebf8ff' : 'white',
                          color: student.gender === '남' ? '#2b6cb0' : '#cbd5e1'
                        }}
                      >
                        👦 남
                      </button>
                      <button
                        onClick={() => handleSetGender(student.id, '여')}
                        style={{
                          padding: '4px 10px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer',
                          border: student.gender === '여' ? '1.5px solid #b83280' : '1px solid #e2e8f0',
                          background: student.gender === '여' ? '#fff5f7' : 'white',
                          color: student.gender === '여' ? '#b83280' : '#cbd5e1'
                        }}
                      >
                        👧 여
                      </button>
                    </div>
                  </td>
                  <td style={{ padding: '16px 20px', color: '#4a5568' }}>{student.nickname}</td>
                  <td style={{ padding: '16px 20px' }}>
                    <span style={{
                      padding: '6px 12px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold',
                      background: student.mood === '건강' ? '#f0fff4' : student.mood === '보통' ? '#fffff0' : '#fff5f5',
                      color: student.mood === '건강' ? '#38a169' : student.mood === '보통' ? '#d69e2e' : '#e53e3e'
                    }}>
                      {student.mood || '알 수 없음'}
                    </span>
                  </td>
                  <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                    <button
                      onClick={() => handleDelete(student.id, student.realName)}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '8px', borderRadius: '8px', color: '#e53e3e', transition: 'background 0.2s' }}
                      onMouseOver={e => e.currentTarget.style.background = '#fff5f5'}
                      onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                      title="학생 삭제"
                    >
                      <Trash2 size={20} />
                    </button>
                  </td>
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
