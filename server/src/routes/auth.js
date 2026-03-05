import express from 'express';
import bcrypt from 'bcrypt';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import prisma from '../config/db.js';
import { generateToken } from '../utils/jwt.js';
import { authenticate } from '../middleware/auth.js';
import { registerSchema, loginSchema, updateProfileSchema, updateThemeSchema } from '../validators/authValidator.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();

// ============================================
// OAuth Helper Functions
// ============================================

/**
 * Find or create a user from OAuth provider
 * Supports both login (existing user) and signup (new user)
 * @param {string} provider - 'google', 'github', etc.
 * @param {string} providerId - Unique ID from the OAuth provider
 * @param {object} profileData - { email, name, avatarUrl }
 * @returns {Promise<{user: object, isNewUser: boolean}>}
 */
async function findOrCreateOAuthUser(provider, providerId, profileData) {
  const { email, name, avatarUrl } = profileData;
  
  if (!email) {
    throw new Error(`OAuth ${provider}: No email provided by provider`);
  }

  // First, try to find user by email (handles both existing email users and OAuth users)
  let user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() }
  });

  let isNewUser = false;

  if (user) {
    // User exists - check if they're linking an OAuth provider or already using OAuth
    if (user.provider === provider && user.providerId === providerId) {
      // Already linked - this is a login
      return { user, isNewUser: false };
    }
    
    if (user.provider === 'email' && user.password) {
      // User has email/password account - they need to link OAuth manually
      // For now, we'll allow linking by updating provider info
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          provider,
          providerId,
          avatarUrl: avatarUrl || user.avatarUrl,
        }
      });
      return { user, isNewUser: false };
    }
    
    // Different provider - create new user with different email
    // This shouldn't happen normally, but handle it gracefully
    const newEmail = `${providerId}@${provider}.oauth`;
    user = await prisma.user.create({
      data: {
        email: newEmail,
        name: name || 'OAuth User',
        provider,
        providerId,
        avatarUrl,
      }
    });
    isNewUser = true;
    return { user, isNewUser };
  }

  // No user with this email - create new OAuth user (signup)
  user = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      name: name || 'OAuth User',
      provider,
      providerId,
      avatarUrl,
    }
  });
  isNewUser = true;

  return { user, isNewUser };
}

/**
 * Configure Google OAuth strategy
 */
function configureGoogleOAuth() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    console.warn('[OAuth] Google credentials not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env');
    return null;
  }

  return new GoogleStrategy({
    clientID: clientId,
    clientSecret: clientSecret,
    callbackURL: `${process.env.API_URL || 'http://localhost:5000'}/api/auth/oauth/google/callback`,
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails?.[0]?.value;
      const name = profile.displayName || profile.name?.givenName || 'Google User';
      const avatarUrl = profile.photos?.[0]?.value;

      const { user, isNewUser } = await findOrCreateOAuthUser('google', profile.id, {
        email,
        name,
        avatarUrl
      });

      console.log(`[OAuth] Google auth: ${isNewUser ? 'New user created' : 'Existing user logged in'}: ${user.email}`);
      done(null, user);
    } catch (err) {
      console.error('[OAuth] Google strategy error:', err);
      done(err);
    }
  });
}

// Initialize Google OAuth if credentials are available
const googleStrategy = configureGoogleOAuth();
if (googleStrategy) {
  passport.use(googleStrategy);
}

// ============================================
// Auth Routes
// ============================================

// Register
router.post('/register', validate(registerSchema), async (req, res, next) => {
  try {
    const { email, password, name } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        provider: true,
        theme: true,
        createdAt: true,
      },
    });

    const token = generateToken(user.id);

    res.status(201).json({ user, token });
  } catch (error) {
    next(error);
  }
});

// Login
router.post('/login', validate(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.password) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken(user.id);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        provider: user.provider,
        theme: user.theme,
        createdAt: user.createdAt,
      },
      token,
    });
  } catch (error) {
    next(error);
  }
});

// Get current user
router.get('/me', authenticate, async (req, res, next) => {
  try {
    res.json({ user: req.user });
  } catch (error) {
    next(error);
  }
});

// Update profile
router.put('/profile', authenticate, validate(updateProfileSchema), async (req, res, next) => {
  try {
    const { name, avatarUrl } = req.body;

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { name, avatarUrl },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        provider: true,
        theme: true,
        createdAt: true,
      },
    });

    res.json({ user });
  } catch (error) {
    next(error);
  }
});

// Update theme preference
router.put('/theme', authenticate, validate(updateThemeSchema), async (req, res, next) => {
  try {
    const { theme } = req.body;

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { theme },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        provider: true,
        theme: true,
        createdAt: true,
      },
    });

    res.json({ user });
  } catch (error) {
    next(error);
  }
});

// Logout
router.post('/logout', authenticate, (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

// ============================================
// OAuth Routes
// ============================================

// Google OAuth - Start
router.get('/oauth/google', (req, res, next) => {
  if (!googleStrategy) {
    return res.status(503).json({ 
      error: 'Google OAuth is not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in the server .env file.' 
    });
  }
  passport.authenticate('google', { 
    scope: ['profile', 'email'],
    prompt: 'select_account'  // Force account selection each time
  })(req, res, next);
});

// Google OAuth - Callback
router.get('/oauth/google/callback', (req, res, next) => {
  if (!googleStrategy) {
    return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/login?error=oauth_not_configured`);
  }
  
  passport.authenticate('google', { session: false }, async (err, user, info) => {
    if (err) {
      console.error('[OAuth] Callback error:', err);
      return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/login?error=oauth_failed`);
    }
    
    if (!user) {
      console.error('[OAuth] No user returned from provider');
      return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/login?error=oauth_no_user`);
    }
    
    try {
      // Generate JWT token
      const token = generateToken(user.id);
      
      // Get full user data (same as /me endpoint)
      const fullUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: {
          id: true,
          email: true,
          name: true,
          avatarUrl: true,
          provider: true,
          theme: true,
          createdAt: true,
        }
      });
      
      const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
      const isMobile = req.query.mobile === 'true';
      
      if (isMobile) {
        // Mobile: redirect with token
        res.redirect(`${clientUrl}/dashboard?token=${token}`);
      } else {
        // Popup: send HTML to close popup and pass token to parent
        res.send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Login Successful</title>
            <style>
              body { font-family: system-ui, -apple-system, sans-serif; display: flex; 
                     align-items: center; justify-content: center; height: 100vh; margin: 0;
                     background: #f0f9ff; }
              .container { text-align: center; }
              .success { color: #22c55e; font-size: 48px; }
              p { color: #6b7280; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="success">✓</div>
              <p>Login successful! Closing...</p>
            </div>
            <script>
              // Send token to parent window
              window.opener.postMessage({ 
                type: 'OAUTH_SUCCESS', 
                token: '${token}',
                user: ${JSON.stringify(fullUser)}
              }, '*');
              
              // Close popup after a short delay
              setTimeout(() => window.close(), 500);
            </script>
          </body>
          </html>
        `);
      }
    } catch (dbError) {
      console.error('[OAuth] Database error after auth:', dbError);
      res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/login?error=oauth_db_error`);
    }
  })(req, res, next);
});

// Check OAuth configuration status
router.get('/oauth/status', (req, res) => {
  const isConfigured = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  res.json({ 
    google: { 
      configured: isConfigured 
    } 
  });
});


export default router;
