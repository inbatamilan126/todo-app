import express from 'express';
import bcrypt from 'bcrypt';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { randomUUID } from 'crypto';
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
  const oauthBaseUrl = (process.env.API_URL || 'http://localhost:5000')
    .replace(/\/+$/, '')
    .replace(/\/api$/, '');
  
  if (!clientId || !clientSecret) {
    console.warn('[OAuth] Google credentials not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env');
    return null;
  }

  return new GoogleStrategy({
    clientID: clientId,
    clientSecret: clientSecret,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || `${process.env.CLIENT_URL || 'http://localhost:5173'}/oauth/callback`,
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
        defaultReminderMinutes: true,
        defaultReminderTime: true,
        pushEnabled: true,
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
        defaultReminderMinutes: user.defaultReminderMinutes,
        defaultReminderTime: user.defaultReminderTime,
        pushEnabled: user.pushEnabled,
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
        defaultReminderMinutes: true,
        defaultReminderTime: true,
        pushEnabled: true,
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
        defaultReminderMinutes: true,
        defaultReminderTime: true,
        pushEnabled: true,
        createdAt: true,
      },
    });

    res.json({ user });
  } catch (error) {
    next(error);
  }
});

// Update notification preferences
router.put('/preferences', authenticate, async (req, res, next) => {
  try {
    const { defaultReminderMinutes, defaultReminderTime, pushEnabled } = req.body;

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { 
        ...(defaultReminderMinutes !== undefined && { defaultReminderMinutes: Number(defaultReminderMinutes) }),
        ...(defaultReminderTime !== undefined && { defaultReminderTime }),
        ...(pushEnabled !== undefined && { pushEnabled })
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        provider: true,
        theme: true,
        defaultReminderMinutes: true,
        defaultReminderTime: true,
        pushEnabled: true,
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
  
  // Store PKCE code_challenge in session if provided
  const { code_challenge, code_challenge_method, state } = req.query;
  if (code_challenge) {
    // Note: We don't need to store this in session for standard PKCE 
    // when the client sends the verifier back to the token endpoint.
    // However, we still need to pass it through to Google.
    console.log('[OAuth] PKCE flow initiated with challenge');
  }
  
  passport.authenticate('google', { 
    scope: ['profile', 'email'],
    prompt: 'select_account'  // Force account selection each time
  })(req, res, next);
});


// PKCE Token Exchange Endpoint
// This endpoint verifies the PKCE code_verifier and returns the token
router.post('/oauth/token', async (req, res) => {
  try {
    const { code, code_verifier, provider, redirect_uri } = req.body;
    
    if (!code || !code_verifier) {
      return res.status(400).json({ error: 'Missing code or code_verifier' });
    }
    
    if (!provider) {
      return res.status(400).json({ error: 'Missing provider' });
    }
    
    // For Google OAuth, we need to exchange the code for tokens
    // We pass the code_verifier directly to Google for verification.
    // This makes the exchange stateless on our server.
    
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const callbackURL = process.env.GOOGLE_CALLBACK_URL || `${process.env.CLIENT_URL || 'http://localhost:5173'}/oauth/callback`;
    
    // Exchange code for tokens with Google
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: callbackURL,
        grant_type: 'authorization_code',
        code_verifier: code_verifier, // Pass the verifier to Google!
      }),
    });
    
    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('[OAuth] Token exchange failed:', errorData);
      return res.status(401).json({ error: 'Failed to exchange code for tokens' });
    }
    
    const googleTokens = await tokenResponse.json();
    
    // Get user info from Google using the access token
    const userInfoResponse = await fetch(`https://www.googleapis.com/oauth2/v2/userinfo?access_token=${googleTokens.access_token}`);
    
    if (!userInfoResponse.ok) {
      console.error('[OAuth] Failed to get user info from Google');
      return res.status(401).json({ error: 'Failed to get user info from OAuth provider' });
    }
    
    const googleUserInfo = await userInfoResponse.json();
    
    // Find or create the user in our database
    const { user, isNewUser } = await findOrCreateOAuthUser('google', googleUserInfo.id, {
      email: googleUserInfo.email,
      name: googleUserInfo.name,
      avatarUrl: googleUserInfo.picture,
    });
    
    // Generate our JWT token
    const token = generateToken(user.id);
    
    // Get full user data
    const fullUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        provider: true,
        theme: true,
        defaultReminderMinutes: true,
        defaultReminderTime: true,
        createdAt: true,
      }
    });
    
    // Clean up session
    delete req.session.oauth_code_challenge;
    delete req.session.oauth_code_challenge_method;
    delete req.session.oauth_state;
    
    console.log(`[PKCE] OAuth success: ${isNewUser ? 'New user created' : 'Existing user logged in'}: ${user.email}`);
    
    res.json({
      token,
      user: fullUser,
    });
  } catch (error) {
    console.error('[PKCE] Token exchange error:', error);
    res.status(500).json({ error: 'Token exchange failed', message: error.message });
  }
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
