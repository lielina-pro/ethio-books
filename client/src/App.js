import React from 'react';
import TutorDashboard from './pages/TutorDashboard';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AuthPage from './pages/AuthPage';
import LandingPage from './pages/LandingPage';
import AdminDashboard from './pages/AdminDashboard';
import StudentDashboard from './pages/StudentDashboard';
import TutorProfilePage from './pages/TutorProfilePage';
import ProtectedRoute from './components/ProtectedRoute';


const WaitingApprovalPage = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
    <div className="max-w-md bg-white rounded-2xl shadow-md border border-gray-100 p-6 text-center">
      <h1 className="text-lg font-semibold text-gray-800 mb-2">
        Tutor Application Pending
      </h1>
      <p className="text-sm text-gray-600">
        Thank you for applying as a tutor. Our admin team is reviewing your
        documents. You will receive access once your account is approved.
      </p>
    </div>
  </div>
);

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth" element={<AuthPage />} />

        <Route element={<ProtectedRoute allowedRoles={['student']} />}>
          <Route path="/dashboard" element={<StudentDashboard />} />
          <Route path="/tutor/:id" element={<TutorProfilePage />} />
        </Route>

        <Route path="/waiting-approval" element={<WaitingApprovalPage />} />

        <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
          <Route path="/admin" element={<AdminDashboard />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['tutor']} />}>
          <Route path="/tutor" element={<TutorDashboard />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;

