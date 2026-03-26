import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { isAuthenticated, user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div>Loading...</div>; // Or a proper loading component
  }

  if (!isAuthenticated) {
    // Redirect to appropriate login portal based on route
    // If trying to access superadmin routes, redirect to superadmin login
    if (location.pathname.startsWith('/superadmin')) {
      return <Navigate to="/superadmin" state={{ from: location }} replace />;
    }
    // Redirect all other protected routes to the unified login page
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles.length > 0) {
    const userRole = user?.role?.toLowerCase();
    const normalizedAllowedRoles = allowedRoles.map(r => r.toLowerCase());
    
    if (!normalizedAllowedRoles.includes(userRole)) {
      // If role doesn't match, redirect to login page
      return <Navigate to="/login" replace />;
    }
  }


  return children;
};

export default ProtectedRoute;
