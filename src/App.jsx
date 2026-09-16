import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import RoleSelection from './pages/RoleSelection';
// 화면별 코드 분할 — 학생 크롬북은 학생 화면만, 학부모는 안내문만 내려받는다 (초기 로딩 가볍게)
const TeacherDashboard = lazy(() => import('./pages/TeacherDashboard'));
const TeacherSetup = lazy(() => import('./pages/TeacherSetup'));
const StudentDashboard = lazy(() => import('./pages/StudentDashboard'));
const ParentConsent = lazy(() => import('./pages/ParentConsent'));
const FamilyLetter = lazy(() => import('./pages/FamilyLetter'));
const ParentMonthly = lazy(() => import('./pages/ParentMonthly'));
const ParentConsentSign = lazy(() => import('./pages/ParentConsentSign'));
const ClassTree = lazy(() => import('./pages/ClassTree'));
const Loading = () => <div style={{ margin: 'auto', color: '#94a3b8', fontSize: '0.9rem', padding: '40px' }}>불러오는 중…</div>;
import Footer from './components/Footer';
import PolicyModal from './components/PolicyModal';
import './index.css';

function App() {
  const [isPolicyOpen, setIsPolicyOpen] = React.useState(false);
  const [policyType, setPolicyType] = React.useState('');

  return (
    <Router>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/" element={<RoleSelection />} />
            <Route path="/teachers" element={<RoleSelection />} />
            <Route path="/teacher-setup" element={<TeacherSetup />} />
            <Route path="/teacher" element={<TeacherDashboard />} />
            <Route path="/student" element={<StudentDashboard />} />
            <Route path="/tree/:classCode" element={<ClassTree />} />
            <Route path="/consent/:classCode" element={<ParentConsent />} />
            <Route path="/consent/:classCode/sign" element={<ParentConsentSign />} />
            <Route path="/family/:classCode/report" element={<ParentMonthly />} />
            <Route path="/family/:classCode/monthly" element={<ParentMonthly />} />
            <Route path="/family/:classCode/:kind" element={<FamilyLetter />} />
          </Routes>
          </Suspense>
        </div>
        <Footer onOpenPolicy={(type) => { setPolicyType(type); setIsPolicyOpen(true); }} />
        {isPolicyOpen && <PolicyModal type={policyType} onClose={() => setIsPolicyOpen(false)} />}
      </div>
    </Router>
  );
}

export default App;
