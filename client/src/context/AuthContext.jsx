import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import socketService from '../services/socket';
import { API_URL } from '../utils/constants';

// ============================================
// PKCE Utility Functions
// ============================================

/**
 * Generate a cryptographically secure code_verifier
 * @returns {string} A random string between 43-128 characters
 */
function generateCodeVerifier() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64URLEncode(array);
}

/**
 * Generate a code_challenge from a code_verifier using SHA-256
 * @param {string} verifier - The code_verifier
 * @returns {Promise<string>} The base64URL-encoded SHA-256 hash
 */
async function generateCodeChallenge(verifier) {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return base64URLEncode(new Uint8Array(hash));
}

/**
 * Encode a buffer to base64URL format (RFC 4648)
 * @param {Uint8Array} buffer 
 * @returns {string}
 */
function base64URLEncode(buffer) {
  let str = '';
  buffer.forEach((byte) => {
    str += String.fromCharCode(byte);
  });
  return btoa(str)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Generate a random state string for CSRF protection
 * @returns {string}
 */
function generateState() {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return base64URLEncode(array);
}

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      // Check localStorage for existing session
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

  // PKCE OAuth login - initiates the OAuth flow with PKCE
  const loginWithOAuth = async (provider = 'google') => {
    try {
      // Generate PKCE code_verifier and code_challenge
      const codeVerifier = generateCodeVerifier();
      const codeChallenge = await generateCodeChallenge(codeVerifier);
      const state = generateState();
      
      // Store code_verifier in sessionStorage (not localStorage for security)
      sessionStorage.setItem('oauth_code_verifier', codeVerifier);
      sessionStorage.setItem('oauth_code_challenge', codeChallenge);
      
      // Get base API URL (already includes /api)
      const baseUrl = API_URL || '/api';
      
      // Build the OAuth URL with PKCE parameters
      // Note: API_URL already includes /api, so we don't add it again
      const oauthUrl = new URL(`${baseUrl}/auth/oauth/${provider}`, window.location.origin);
      oauthUrl.searchParams.set('code_challenge', codeChallenge);
      oauthUrl.searchParams.set('code_challenge_method', 'S256');
      oauthUrl.searchParams.set('state', state);
      oauthUrl.searchParams.set('pkce', 'true');
      
      // Redirect to OAuth provider
      window.location.href = oauthUrl.toString();
    } catch (error) {
      console.error('OAuth login error:', error);
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
      
      // /auth/me returns { user: <object> }, extract the user object
      const userData = response.data.user || response.data;
      
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

  const updatePreferences = async (preferences) => {
    const response = await api.put('/auth/preferences', preferences);
    updateUser(response.data.user);
    return response.data.user;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        loading,
        login,
        loginWithToken,
        loginWithOAuth,
        register,
        logout,
        updateUser,
        updateTheme,
        updatePreferences,
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
