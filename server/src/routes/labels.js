import express from 'express';
import prisma from '../config/db.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

// Get all labels for the user
router.get('/', async (req, res, next) => {
  try {
    const labels = await prisma.label.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ labels });
  } catch (error) {
    next(error);
  }
});

// Create a new label
router.post('/', async (req, res, next) => {
  try {
    const { name, color } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ error: 'Label name is required' });
    }

    const label = await prisma.label.create({
      data: {
        userId: req.user.id,
        name: name.trim(),
        color: color || '#64748b',
      },
    });

    res.status(201).json({ label });
  } catch (error) {
    next(error);
  }
});

// Update a label
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, color } = req.body;

    const label = await prisma.label.findFirst({
      where: { id, userId: req.user.id },
    });

    if (!label) {
      return res.status(404).json({ error: 'Label not found' });
    }

    const updated = await prisma.label.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(color && { color }),
      },
    });

    res.json({ label: updated });
  } catch (error) {
    next(error);
  }
});

// Delete a label
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const label = await prisma.label.findFirst({
      where: { id, userId: req.user.id },
    });

    if (!label) {
      return res.status(404).json({ error: 'Label not found' });
    }

    await prisma.label.delete({ where: { id } });

    res.json({ message: 'Label deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
