import express from 'express';
import { authenticate } from '../middleware/auth.js';
import prisma from '../config/db.js';

const router = express.Router();

router.use(authenticate);

// Maps the massive Google People API response to our minimal footprint
function mapGoogleContact(person) {
  // Extract primary name
  const name = person.names && person.names.length > 0 
    ? person.names[0].displayName 
    : 'Unknown';

  // Extract primary email
  const emailObj = person.emailAddresses?.find(e => e.metadata?.primary) || person.emailAddresses?.[0];
  const email = emailObj?.value;

  // Extract primary phone number
  const phoneObj = person.phoneNumbers?.find(p => p.metadata?.primary) || person.phoneNumbers?.[0];
  const phone = phoneObj?.value;

  // Extract avatar. Google sometimes omits the `default` boolean if it is an uploaded photo.
  // We'll take the primary photo, or the first one, as long as it exists.
  const avatarObj = person.photos?.find(p => p.metadata?.primary) || person.photos?.[0];
  const avatarUrl = avatarObj && !avatarObj.default ? avatarObj.url : null;

  // Only return contacts that have at least one useful form of contact
  if (!email && !phone) return null;

  return {
    id: person.resourceName,
    name,
    email,
    phone,
    avatarUrl
  };
}

router.get('/', async (req, res, next) => {
  try {
    // 1. Get the user's latest access token
    const dbUser = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { googleAccessToken: true }
    });

    const googleAccessToken = dbUser?.googleAccessToken;
    
    if (!googleAccessToken) {
      return res.status(403).json({ error: 'Contacts not connected', requiresReauth: true });
    }

    // 2. Fetch contacts from Google People API
    const response = await fetch('https://people.googleapis.com/v1/people/me/connections?personFields=names,emailAddresses,phoneNumbers,photos&pageSize=1000', {
      headers: {
        Authorization: `Bearer ${googleAccessToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Google Contacts API Error:', response.status, errorText);
      if (response.status === 401 || response.status === 403) {
         return res.status(403).json({ error: 'Contacts permission not granted or token expired', details: errorText, requiresReauth: true });
      }
      return res.status(response.status).json({ error: 'Failed to fetch from Google Contacts API', details: errorText });
    }

    const data = await response.json();
    
    // 3. Map and filter out invalid contacts
    const contacts = (data.connections || [])
      .map(mapGoogleContact)
      .filter(Boolean);

    res.json({ contacts });
  } catch (error) {
    next(error);
  }
});

export default router;
