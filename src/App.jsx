import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import RoleSelection from './pages/RoleSelection';
import TeacherDashboard from './pages/TeacherDashboard';
import TeacherSetup from './pages/TeacherSetup';
import StudentDashboard from './pages/StudentDashboard';
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
          <Routes>
            <Route path="/" element={<RoleSelection />} />
            <Route path="/teacher-setup" element={<TeacherSetup />} />
            <Route path="/teacher" element={<TeacherDashboard />} />
            <Route path="/student" element={<StudentDashboard />} />
          </Routes>
        </div>
        <Footer onOpenPolicy={(type) => { setPolicyType(type); setIsPolicyOpen(true); }} />
        {isPolicyOpen && <PolicyModal type={policyType} onClose={() => setIsPolicyOpen(false)} />}
      </div>
    </Router>
  );
}

export default App;
