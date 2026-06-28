import React from 'react';
import { Trash2, Users } from 'lucide-react';
import { db } from '../firebase';
import { doc, deleteDoc } from 'firebase/firestore';

const StudentManagement = ({ studentsData }) => {
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

  return (
    <div className="glass-card" style={{ padding: '32px', display: 'flex', flexDirection: 'column', flex: 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
        <div style={{ background: 'var(--primary-light)', padding: '12px', borderRadius: '16px' }}>
          <Users size={28} color="var(--primary-color)" />
        </div>
        <h2 style={{ color: '#2d3748', margin: 0, fontSize: '1.8rem' }}>학생 관리</h2>
      </div>
      <p style={{ color: '#718096', marginBottom: '32px', fontSize: '1.05rem', paddingLeft: '52px' }}>
        학급에 등록된 학생 목록을 관리하고, 불필요한 데이터를 삭제할 수 있습니다.
      </p>

      <div style={{ overflowX: 'auto', background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
              <th style={{ padding: '16px 20px', color: '#4a5568', fontWeight: 'bold' }}>캐릭터</th>
              <th style={{ padding: '16px 20px', color: '#4a5568', fontWeight: 'bold' }}>실명</th>
              <th style={{ padding: '16px 20px', color: '#4a5568', fontWeight: 'bold' }}>닉네임</th>
              <th style={{ padding: '16px 20px', color: '#4a5568', fontWeight: 'bold' }}>상태</th>
              <th style={{ padding: '16px 20px', color: '#4a5568', fontWeight: 'bold', textAlign: 'center' }}>삭제</th>
            </tr>
          </thead>
          <tbody>
            {studentsData.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ padding: '32px', textAlign: 'center', color: '#a0aec0' }}>등록된 학생이 없습니다.</td>
              </tr>
            ) : (
              studentsData.map((student, idx) => (
                <tr key={student.id || idx} style={{ borderBottom: '1px solid #edf2f7', transition: 'background 0.2s' }}>
                  <td style={{ padding: '16px 20px', fontSize: '1.5rem' }}>{student.avatar || '👤'}</td>
                  <td style={{ padding: '16px 20px', fontWeight: 'bold', color: '#2d3748' }}>{student.realName}</td>
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
    </div>
  );
};

export default StudentManagement;
