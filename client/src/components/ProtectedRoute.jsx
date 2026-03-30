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
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  const { role, tutorStatus } = user;

  // Tutors who are still pending are redirected unless they are on `/tutor`,
  // where we render a dedicated pending-state UI.
  if (role === 'tutor' && tutorStatus === 'pending' && location.pathname !== '/tutor') {
    return <Navigate to="/waiting-approval" replace />;
  }

  // If role is not in allowedRoles, redirect accordingly
  if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    if (role === 'student') {
      return <Navigate to="/dashboard" replace />;
    }
    if (role === 'tutor') {
      return <Navigate to="/tutor" replace />;
    }
    if (role === 'admin') {
      return <Navigate to="/admin" replace />;
    }
    // Default fallback for other roles
    return <Navigate to="/auth" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;

