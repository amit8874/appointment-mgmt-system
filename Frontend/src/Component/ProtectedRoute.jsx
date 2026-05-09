import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { isAuthenticated, user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="h-screen w-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
    </div>;
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

  // Fallback: If authenticated but user data hasn't arrived yet (race condition), show loading instead of redirecting
  if (isAuthenticated && !user && allowedRoles.length > 0) {
    return <div>Loading session...</div>;
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
