import express from 'express';
import prisma from '../config/db.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

// Get all non-archived notifications
router.get('/', async (req, res, next) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.id, isArchived: false },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json({ notifications });
  } catch (error) {
    next(error);
  }
});

// Get unread notifications
router.get('/unread', async (req, res, next) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.id, read: false, isArchived: false },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ notifications });
  } catch (error) {
    next(error);
  }
});

// Get unread count
router.get('/count', async (req, res, next) => {
  try {
    const count = await prisma.notification.count({
      where: { userId: req.user.id, read: false, isArchived: false },
    });

    res.json({ count });
  } catch (error) {
    next(error);
  }
});

// Toggle read status
router.put('/:id/toggle-read', async (req, res, next) => {
  try {
    const { id } = req.params;

    const notification = await prisma.notification.findFirst({
      where: { id, userId: req.user.id },
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { 
        read: !notification.read,
        readAt: !notification.read ? new Date() : null
      },
    });

    res.json({ notification: updated });
  } catch (error) {
    next(error);
  }
});

// Mark all as read
router.put('/read-all', async (req, res, next) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user.id, read: false, isArchived: false },
      data: { read: true, readAt: new Date() },
    });

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    next(error);
  }
});

// Mark notification as archived
router.put('/:id/archive', async (req, res, next) => {
  try {
    const { id } = req.params;

    const notification = await prisma.notification.findFirst({
      where: { id, userId: req.user.id },
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { isArchived: true },
    });

    res.json({ notification: updated });
  } catch (error) {
    next(error);
  }
});

// --- Push Subscription Routes ---

// Get public VAPID key
router.get('/vapid-public-key', (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
});

// Subscribe to push notifications
router.post('/subscribe', async (req, res, next) => {
  try {
    const subscription = req.body;
    
    // Ensure the subscription object is valid
    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ error: 'Invalid subscription object' });
    }

    // Upsert subscription (update if endpoint exists, otherwise create)
    const savedSubscription = await prisma.pushSubscription.upsert({
      where: { endpoint: subscription.endpoint },
      update: {
        userId: req.user.id,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
      create: {
        userId: req.user.id,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
    });

    res.status(201).json({ message: 'Subscribed successfully', subscriptionId: savedSubscription.id });
  } catch (error) {
    next(error);
  }
});

// Unsubscribe from push notifications
router.delete('/unsubscribe', async (req, res, next) => {
  try {
    const { endpoint } = req.body;
    
    if (!endpoint) {
      return res.status(400).json({ error: 'Endpoint is required' });
    }

    await prisma.pushSubscription.deleteMany({
      where: { 
        userId: req.user.id, 
        endpoint: endpoint 
      },
    });

    res.json({ message: 'Unsubscribed successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
