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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check both sessionStorage and localStorage for authentication on app load
    const sessionToken = sessionStorage.getItem('token');
    const localToken = localStorage.getItem('token');
    const token = sessionToken || localToken; // Prefer sessionStorage, fallback to localStorage

    const role = sessionStorage.getItem('role') || localStorage.getItem('role');
    const patientUser = sessionStorage.getItem('patientUser');
    const userData = sessionStorage.getItem('userData') || localStorage.getItem('userData');

    if (token && role) {
      setIsAuthenticated(true);
      // For admins, restore full user data if available
      if (userData) {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        
        // Ensure tenantSlug is synced on load if it exists in user data
        if (!localStorage.getItem('tenantSlug')) {
          const slug = parsedUser.organization?.slug || parsedUser.organizationId?.slug;
          if (slug) {
            localStorage.setItem('tenantSlug', slug);
          }
        }
      } else {
        setUser({ role, token });
      }
    } else if (patientUser) {
      const userDataParsed = JSON.parse(patientUser);
      setIsAuthenticated(true);
      setUser(userDataParsed);
    }
    setLoading(false);
  }, []);

  const login = (userData) => {
    setIsAuthenticated(true);
    setUser(userData);
    // Store in both sessionStorage and localStorage for persistence
    if (userData.token) {
      sessionStorage.setItem('token', userData.token);
      localStorage.setItem('token', userData.token);

      const role = userData.role || 'patient'; // Ensure role is set, default to 'patient'
      sessionStorage.setItem('role', role);
      localStorage.setItem('role', role);

      // Store full user data for admins
      sessionStorage.setItem('userData', JSON.stringify(userData));
      localStorage.setItem('userData', JSON.stringify(userData));
      
      // Sync tenantSlug with the logged-in user's organization
      if (userData.organization?.slug) {
        localStorage.setItem('tenantSlug', userData.organization.slug);
      } else if (userData.organizationId?.slug) {
        localStorage.setItem('tenantSlug', userData.organizationId.slug);
      }

      // Store user data including name if available
      if (userData.name) {
        sessionStorage.setItem('userName', userData.name);
        localStorage.setItem('userName', userData.name);
      }
    } else {
      sessionStorage.setItem('patientUser', JSON.stringify(userData));
    }
    // Clear any conflicting data
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
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUser(null);
    // Clear both sessionStorage and localStorage
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('role');
    sessionStorage.removeItem('patientUser');
    sessionStorage.removeItem('userData');
    sessionStorage.removeItem('userName');
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('userData');
    // Clear tenantSlug to prevent stale tenant data
    localStorage.removeItem('tenantSlug');
  };

  const updateUser = (updatedUserData) => {
    const newUser = { ...user, ...updatedUserData };
    setUser(newUser);
    
    sessionStorage.setItem('userData', JSON.stringify(newUser));
    localStorage.setItem('userData', JSON.stringify(newUser));
    
    // Sync tenantSlug with the updated organization info
    if (newUser.organization?.slug) {
      localStorage.setItem('tenantSlug', newUser.organization.slug);
    } else if (newUser.organizationId?.slug) {
      localStorage.setItem('tenantSlug', newUser.organizationId.slug);
    }

    if (newUser.name) {
      sessionStorage.setItem('userName', newUser.name);
      localStorage.setItem('userName', newUser.name);
    }
  };

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
