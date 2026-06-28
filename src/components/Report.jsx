import React from 'react';
import { FileText, Download } from 'lucide-react';

const Report = ({ studentsData, teacherProfile }) => {
  const totalStudents = studentsData.length;
  const healthCount = studentsData.filter(s => s.mood === '건강').length;
  const normalCount = studentsData.filter(s => s.mood === '보통').length;
  const hardCount = studentsData.filter(s => s.mood === '힘듦').length;

  return (
    <div className="glass-card" style={{ padding: '32px', display: 'flex', flexDirection: 'column', flex: 1 }}>
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: 'var(--primary-light)', padding: '12px', borderRadius: '16px' }}>
            <FileText size={28} color="var(--primary-color)" />
          </div>
          <h2 style={{ color: '#2d3748', margin: 0, fontSize: '1.8rem' }}>학급 정서 종합 리포트</h2>
        </div>
        <button 
          onClick={() => window.print()}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: 'var(--text-main)', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', transition: 'background 0.2s' }}
          onMouseOver={(e) => e.currentTarget.style.background = '#1a202c'}
          onMouseOut={(e) => e.currentTarget.style.background = 'var(--text-main)'}
        >
          <Download size={18} /> PDF 저장 및 인쇄
        </button>
      </div>

      <div style={{ flex: 1, border: '1px solid #e2e8f0', borderRadius: '20px', padding: '40px', background: '#fafcff' }} id="print-area">
        <h1 style={{ textAlign: 'center', color: '#1a202c', marginBottom: '12px', fontSize: '2.5rem' }}>{teacherProfile?.className || '우리 반'} 정서 종합 보고서</h1>
        <p style={{ textAlign: 'center', color: '#718096', marginBottom: '40px', fontSize: '1.1rem' }}>생성일: {new Date().toLocaleDateString()}</p>

        <h3 style={{ color: '#4a5568', borderBottom: '2px solid var(--primary-color)', paddingBottom: '8px' }}>1. 전체 현황</h3>
        <ul style={{ lineHeight: '1.8', color: '#4a5568', marginBottom: '32px' }}>
          <li><strong>총 참여 학생 수:</strong> {totalStudents}명</li>
          <li><strong>학급 정서 온도:</strong> 건강({healthCount}명), 보통({normalCount}명), 힘듦({hardCount}명)</li>
          <li><strong>적용된 SEL 가이드라인:</strong> {teacherProfile?.selLevel || '미설정'}</li>
        </ul>

        <h3 style={{ color: '#4a5568', borderBottom: '2px solid var(--primary-color)', paddingBottom: '8px' }}>2. 교우 관계망 (소시오그램) 요약</h3>
        <p style={{ lineHeight: '1.6', color: '#4a5568' }}>
          긍정적 추인법을 통해 조사된 교우 관계 데이터를 바탕으로, 전체적으로 연결망이 형성되어 있습니다. 
          일부 학생들의 경우 긍정적 피드백 교환이 적어 관심이 필요할 수 있으며, 이 부분은 맞춤 처방 탭에서 상세히 확인하여 지도하시기 바랍니다.
        </p>

        <h3 style={{ color: '#4a5568', borderBottom: '2px solid var(--primary-color)', paddingBottom: '8px', marginTop: '32px' }}>3. 향후 지도 계획 (빈칸)</h3>
        <div style={{ height: '150px', border: '1px dashed #cbd5e1', borderRadius: '8px', marginTop: '16px' }}></div>
      </div>
    </div>
  );
};

export default Report;
