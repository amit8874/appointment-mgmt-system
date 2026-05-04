import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [authState, setAuthState] = useState({
    isAuthenticated: false,
    user: null,
    loading: true
  });

  const { isAuthenticated, user, loading } = authState;

  useEffect(() => {
    // Check both sessionStorage and localStorage for authentication on app load
    const sessionToken = sessionStorage.getItem('token');
    const localToken = localStorage.getItem('token');
    const token = sessionToken || localToken; // Prefer sessionStorage, fallback to localStorage

    const role = sessionStorage.getItem('role') || localStorage.getItem('role');
    const patientUser = sessionStorage.getItem('patientUser') || localStorage.getItem('patientUser');
    const userData = sessionStorage.getItem('userData') || localStorage.getItem('userData');

    let newAuthState = { isAuthenticated: false, user: null, loading: false };

    if (token && role) {
      newAuthState.isAuthenticated = true;
      // For admins, restore full user data if available
      if (userData) {
        const parsedUser = JSON.parse(userData);
        newAuthState.user = parsedUser;
        
        // Ensure tenantSlug is synced on load if it exists in user data
        if (!localStorage.getItem('tenantSlug')) {
          const slug = parsedUser.organization?.slug || parsedUser.organizationId?.slug;
          if (slug) {
            localStorage.setItem('tenantSlug', slug);
          }
        }
      } else {
        newAuthState.user = { role, token };
      }
    } else if (patientUser) {
      const userDataParsed = JSON.parse(patientUser);
      newAuthState.isAuthenticated = true;
      newAuthState.user = userDataParsed;
    }

    setAuthState(newAuthState);

    // Listen for manual user data updates from background tasks
    const handleUserDataUpdated = (event) => {
      if (event.detail) {
        setAuthState(prev => ({
          ...prev,
          user: { ...prev.user, ...event.detail }
        }));
        // Sync storage as well
        const currentData = JSON.parse(localStorage.getItem('userData') || '{}');
        localStorage.setItem('userData', JSON.stringify({ ...currentData, ...event.detail }));
      }
    };

    window.addEventListener('user-data-updated', handleUserDataUpdated);
    return () => {
      window.removeEventListener('user-data-updated', handleUserDataUpdated);
    };
  }, []);

  const login = React.useCallback((userData) => {
    setAuthState({
      isAuthenticated: true,
      user: userData,
      loading: false
    });
    
    // Store in both sessionStorage and localStorage for persistence
    if (userData.token) {
      sessionStorage.setItem('token', userData.token);
      localStorage.setItem('token', userData.token);

      const role = userData.role || 'patient';
      sessionStorage.setItem('role', role);
      localStorage.setItem('role', role);

      sessionStorage.setItem('userData', JSON.stringify(userData));
      localStorage.setItem('userData', JSON.stringify(userData));
      
      if (userData.organization?.slug) {
        localStorage.setItem('tenantSlug', userData.organization.slug);
      } else if (userData.organizationId?.slug) {
        localStorage.setItem('tenantSlug', userData.organizationId.slug);
      }

      if (userData.name) {
        sessionStorage.setItem('userName', userData.name);
        localStorage.setItem('userName', userData.name);
      }
    } else {
      sessionStorage.setItem('patientUser', JSON.stringify(userData));
    }
    
    if (userData.token && sessionStorage.getItem('patientUser')) {
      sessionStorage.removeItem('patientUser');
    } else if (!userData.token && sessionStorage.getItem('token')) {
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('role');
      sessionStorage.removeItem('userData');
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      localStorage.removeItem('userData');
    }
  }, []);

  const logout = React.useCallback(() => {
    setAuthState({
      isAuthenticated: false,
      user: null,
      loading: false
    });
    
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('role');
    sessionStorage.removeItem('patientUser');
    sessionStorage.removeItem('userData');
    sessionStorage.removeItem('userName');
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('userData');
    localStorage.removeItem('patientUser');
    localStorage.removeItem('userName');
    localStorage.removeItem('tenantSlug');
  }, []);

  const updateUser = React.useCallback((updatedUserData) => {
    setAuthState(prev => {
      const newUser = { ...prev.user, ...updatedUserData };
      
      sessionStorage.setItem('userData', JSON.stringify(newUser));
      localStorage.setItem('userData', JSON.stringify(newUser));
      
      if (newUser.organization?.slug) {
        localStorage.setItem('tenantSlug', newUser.organization.slug);
      } else if (newUser.organizationId?.slug) {
        localStorage.setItem('tenantSlug', newUser.organizationId.slug);
      }

      if (newUser.name) {
        sessionStorage.setItem('userName', newUser.name);
        localStorage.setItem('userName', newUser.name);
      }
      
      return { ...prev, user: newUser };
    });
  }, []);

  const value = useMemo(() => ({
    isAuthenticated,
    user,
    login,
    logout,
    updateUser,
    loading,
  }), [isAuthenticated, user, loading]);


  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
