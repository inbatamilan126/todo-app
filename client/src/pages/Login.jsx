import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, Lock, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { API_URL } from '../utils/constants';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const { login, loginWithToken } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Handle OAuth errors from redirect
  useEffect(() => {
    const error = searchParams.get('error');
    if (error) {
      const errorMessages = {
        oauth_failed: 'OAuth authentication failed. Please try again.',
        oauth_no_user: 'Could not get user information from Google.',
        oauth_not_configured: 'Google OAuth is not configured.',
        oauth_db_error: 'Database error during OAuth. Please try again.',
      };
      setError(errorMessages[error] || 'Authentication failed. Please try again.');
    }
  }, [searchParams]);

  // Handle OAuth popup message
  useEffect(() => {
    const handleOAuthMessage = (event) => {
      if (event.data?.type === 'OAUTH_SUCCESS' && event.data?.token) {
        // If user data is provided directly, use it to avoid extra API call
        if (event.data?.user) {
          localStorage.setItem('token', event.data.token);
          localStorage.setItem('user', JSON.stringify(event.data.user));
          // Trigger auth state update
          window.dispatchEvent(new CustomEvent('auth:login', { 
            detail: { token: event.data.token, user: event.data.user } 
          }));
          navigate('/dashboard');
        } else {
          // Fallback: call loginWithToken which fetches /me
          loginWithToken(event.data.token).then(() => {
            navigate('/dashboard');
          });
        }
      }
    };
    window.addEventListener('message', handleOAuthMessage);
    return () => window.removeEventListener('message', handleOAuthMessage);
  }, [navigate, loginWithToken]);

  const handleGoogleLogin = () => {
    // Use ONLY viewport width for mobile detection - this is the most reliable
    // because viewport size immediately updates when resizing/disabling emulation.
    // Touch events (ontouchstart, maxTouchPoints) can persist after disabling emulation.
    const isMobile = window.innerWidth < 768;
    
    const googleAuthUrl = `${API_URL}/auth/oauth/google`;
    
    if (isMobile) {
      const redirectUrl = `${googleAuthUrl}?mobile=true`;
      console.log('[OAuth] Mobile redirect to:', redirectUrl);
      window.location.href = redirectUrl;
    } else {
      setOauthLoading(true);
      const width = 500;
      const height = 600;
      const left = (window.innerWidth - width) / 2;
      const top = (window.innerHeight - height) / 2;
      // Pass popup=true to tell server this is a popup flow, bypassing UA-based detection
      const popup = window.open(
        `${googleAuthUrl}?popup=true`,
        'Google Login',
        `width=${width},height=${height},left=${left},top=${top}`
      );
      
      // Reset loading state if popup is blocked or closed
      if (!popup || popup.closed) {
        setOauthLoading(false);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-950">
      <div className="w-full max-w-md">
        <div className="rounded-2xl bg-white p-8 shadow-xl dark:bg-gray-900">
          {/* Logo */}
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-primary-600">Todo App</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Sign in to your account
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
                {error}
              </div>
            )}

            <Input
              label="Email"
              type="email"
              icon={Mail}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />

            <Input
              label="Password"
              type="password"
              icon={Lock}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />

            <Button type="submit" className="w-full" loading={loading}>
              Sign In
            </Button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-gray-600" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white px-2 text-gray-500 dark:bg-gray-900 dark:text-gray-400">
                  Or continue with
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={oauthLoading}
              className="mt-4 flex w-full items-center justify-center gap-3 rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              {oauthLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              )}
              {oauthLoading ? 'Connecting...' : 'Continue with Google'}
            </button>
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Don't have an account?{' '}
              <Link
                to="/register"
                className="font-medium text-primary-600 hover:text-primary-700"
              >
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
