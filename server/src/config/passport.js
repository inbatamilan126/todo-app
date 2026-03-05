import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import prisma from './db.js';

export function configurePassport() {
  const oauthBaseUrl = (process.env.API_URL || 'http://localhost:5000')
    .replace(/\/+$/, '')
    .replace(/\/api$/, '');

  passport.serializeUser((user, done) => done(null, user.id));
  
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await prisma.user.findUnique({ where: { id } });
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${oauthBaseUrl}/api/auth/oauth/google/callback`,
    }, async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await prisma.user.findFirst({
          where: { provider: 'google', providerId: profile.id }
        });
        
        if (!user) {
          const email = profile.emails?.[0]?.value;
          if (email) {
            user = await prisma.user.findUnique({ where: { email } });
            if (user) {
              user = await prisma.user.update({
                where: { id: user.id },
                data: { provider: 'google', providerId: profile.id }
              });
            }
          }
          
          if (!user) {
            user = await prisma.user.create({
              data: {
                email: email || `google-${profile.id}@placeholder.com`,
                name: profile.displayName,
                provider: 'google',
                providerId: profile.id,
                avatarUrl: profile.photos?.[0]?.value,
              }
            });
          }
        }
        
        done(null, user);
      } catch (err) {
        done(err);
      }
    }));
  }
}
