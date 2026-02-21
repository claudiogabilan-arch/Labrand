import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('labrand_token'));

  const checkAuth = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/auth/me`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        withCredentials: true
      });
      setUser(response.data);
    } catch (error) {
      setUser(null);
      localStorage.removeItem('labrand_token');
      setToken(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (email, password) => {
    const response = await axios.post(`${API}/auth/login`, { email, password });
    const { token: newToken, ...userData } = response.data;
    localStorage.setItem('labrand_token', newToken);
    setToken(newToken);
    setUser(userData);
    return userData;
  };

  const register = async (email, password, name, role = 'estrategista', user_type = 'estrategista') => {
    const response = await axios.post(`${API}/auth/register`, { email, password, name, role, user_type });
    const { token: newToken, ...userData } = response.data;
    localStorage.setItem('labrand_token', newToken);
    setToken(newToken);
    setUser(userData);
    return userData;
  };

  const loginWithGoogle = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    // Use window.location.origin to ensure the user returns to the exact domain they are currently on
    const redirectUrl = window.location.origin + '/dashboard';
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  const processOAuthSession = async (sessionId) => {
    const response = await axios.post(`${API}/api/auth/session`, 
      { session_id: sessionId },
      { withCredentials: true }
    );
    const userData = response.data;
    if (userData.token) {
      localStorage.setItem('labrand_token', userData.token);
      setToken(userData.token);
    }
    setUser(userData);
    return userData;
  };

  const logout = async () => {
    try {
      await axios.post(`${API}/auth/logout`, {}, { withCredentials: true });
    } catch (error) {
      console.error('Logout error:', error);
    }
    localStorage.removeItem('labrand_token');
    setToken(null);
    setUser(null);
  };

  const getAuthHeaders = () => {
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // Permission helpers
  const isEstrategista = user?.role === 'estrategista';
  const isCliente = user?.role === 'cliente';
  
  const canEdit = (resource) => {
    if (isEstrategista) return true;
    // Cliente só pode visualizar
    return false;
  };

  const canAccess = (page) => {
    if (isEstrategista) return true;
    // Páginas permitidas para cliente
    const clientPages = ['/dashboard', '/intelligence', '/narratives', '/reports'];
    return clientPages.some(p => page.startsWith(p));
  };

  return (
    <AuthContext.Provider value={{
      user,
      setUser,
      loading,
      token,
      setToken,
      login,
      register,
      loginWithGoogle,
      processOAuthSession,
      logout,
      getAuthHeaders,
      checkAuth,
      isEstrategista,
      isCliente,
      canEdit,
      canAccess
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
