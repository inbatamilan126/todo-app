import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import socketService from '../services/socket';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      const savedUser = localStorage.getItem('user');

      if (token && savedUser) {
        try {
          const userData = JSON.parse(savedUser);
          setUser(userData);
          try {
            socketService.connect(token);
          } catch (e) {
            console.warn('Socket connection failed:', e);
          }
        } catch (e) {
          console.error('Failed to parse saved user:', e);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      }
      setLoading(false);
    };

    initAuth();

    // Listen for OAuth login events (when user data is passed directly)
    const handleAuthLogin = (event) => {
      const { user: userData } = event.detail;
      if (userData) {
        setUser(userData);
        try {
          socketService.connect(localStorage.getItem('token'));
        } catch (e) {
          console.warn('Socket connection failed:', e);
        }
      }
    };

    window.addEventListener('auth:login', handleAuthLogin);
    return () => window.removeEventListener('auth:login', handleAuthLogin);
  }, []);

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { user: userData, token } = response.data;

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      
      try {
        socketService.connect(token);
      } catch (e) {
        console.warn('Socket connection failed:', e);
      }

      return userData;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const register = async (name, email, password) => {
    try {
      const response = await api.post('/auth/register', { name, email, password });
      const { user: userData, token } = response.data;

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      
      try {
        socketService.connect(token);
      } catch (e) {
        console.warn('Socket connection failed:', e);
      }

      return userData;
    } catch (error) {
      console.error('Register error:', error);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    socketService.disconnect();
  };

  const loginWithToken = async (token) => {
    localStorage.setItem('token', token);
    
    try {
      const response = await api.get('/auth/me');
      const userData = response.data;
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      
      try {
        socketService.connect(token);
      } catch (e) {
        console.warn('Socket connection failed:', e);
      }
      
      return userData;
    } catch (error) {
      console.error('Login with token error:', error);
      localStorage.removeItem('token');
      throw error;
    }
  };

  const updateUser = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const updateTheme = async (theme) => {
    const response = await api.put('/auth/theme', { theme });
    updateUser(response.data.user);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        loginWithToken,
        register,
        logout,
        updateUser,
        updateTheme,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
