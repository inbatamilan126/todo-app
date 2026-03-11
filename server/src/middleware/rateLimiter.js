import rateLimit from 'express-rate-limit';

/**
 * Strict rate limiter for authentication endpoints
 * Prevents brute force attacks on login/register
 * NOTE: Skips OAuth endpoints to allow OAuth flow to work properly
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per window per IP
  message: { error: 'Too many authentication attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  skip: (req) => {
    // Skip OAuth endpoints to allow OAuth flow to work
    return req.path.startsWith('/oauth/');
  },
});

/**
 * General API rate limiter
 * Protects against general API abuse
 */
export const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute per IP
  message: { error: 'Too many requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Don't count health check
    return req.path === '/health';
  },
});

/**
 * Stricter limiter for write operations
 */
export const writeLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // 30 write requests per minute
  message: { error: 'Too many write requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});
