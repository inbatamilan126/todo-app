import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

export function OAuthCallback() {
  const [error, setError] = useState(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const fetchedRef = useRef(false); // Prevent double-fetch in React Strict Mode
  
  useEffect(() => {
    // Skip if already fetched or no token ID
    if (fetchedRef.current) return;
    
    const fetchToken = async () => {
      // Mark as fetched immediately to prevent double-fetch
      fetchedRef.current = true;
      
      const tokenId = searchParams.get('token_id');
      const errorParam = searchParams.get('error');
      
      if (errorParam) {
        setError(errorParam);
        return;
      }
      
      if (!tokenId) {
        setError('No token ID received');
        return;
      }
      
      try {
        // Fetch the token from server using the token ID
        const response = await fetch(`/api/auth/oauth/token/${tokenId}`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
          credentials: 'include', // Include cookies for session
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || errorData.error || 'Failed to fetch token');
        }
        
        const data = await response.json();
        
        if (!data.token || !data.user) {
          throw new Error('Invalid response: missing token or user');
        }
        
        const { token, user: userData } = data;
        
        // Clean up PKCE session data from sessionStorage
        sessionStorage.removeItem('oauth_code_verifier');
        sessionStorage.removeItem('oauth_code_challenge');
        
        // Store token and user
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
        
        // Navigate to today
        navigate('/today');
      } catch (err) {
        console.error('OAuth token fetch failed:', err);
        setError(err.message || 'Authentication failed');
      }
    };
    
    fetchToken();
  }, [searchParams, navigate, setUser]);
  
  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-950">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl dark:bg-gray-900">
          <div className="text-center">
            <div className="mb-4 rounded-full bg-red-100 p-3 dark:bg-red-900/20">
              <span className="text-4xl">❌</span>
            </div>
            <h2 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
              Authentication Failed
            </h2>
            <p className="mb-4 text-gray-600 dark:text-gray-400">{error}</p>
            <button
              onClick={() => navigate('/login')}
              className="rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700"
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-950">
      <div className="text-center">
        <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-primary-600" />
        <p className="text-gray-600 dark:text-gray-400">Completing authentication...</p>
      </div>
    </div>
  );
}
