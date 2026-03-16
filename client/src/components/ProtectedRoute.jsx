import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

const ProtectedRoute = ({ allowedRoles = [] }) => {
  const location = useLocation();

  let user = null;
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('ethioBooksUser');
    if (stored) {
      try {
        user = JSON.parse(stored);
      } catch (e) {
        // Ignore parse errors and treat as not logged in
        user = null;
      }
    }
  }

  if (!user) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  const { role, tutorStatus } = user;

  // Tutors who are still pending should be redirected to waiting page
  if (role === 'tutor' && tutorStatus === 'pending') {
    return <Navigate to="/waiting-approval" replace />;
  }

  // If role is not in allowedRoles, redirect accordingly
  if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    if (role === 'student') {
      return <Navigate to="/dashboard" replace />;
    }
    // Default fallback for other roles
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;

