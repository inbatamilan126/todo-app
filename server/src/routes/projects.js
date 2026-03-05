import express from 'express';
import prisma from '../config/db.js';
import { authenticate } from '../middleware/auth.js';
import { createProjectSchema, updateProjectSchema, reorderProjectsSchema } from '../validators/projectValidator.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();

router.use(authenticate);

// Get all projects
router.get('/', async (req, res, next) => {
  try {
    const projects = await prisma.project.findMany({
      where: { userId: req.user.id },
      include: {
        _count: {
          select: { tasks: { where: { parentId: null } } },
        },
      },
      orderBy: { position: 'asc' },
    });

    const projectsWithCount = projects.map((project) => ({
      id: project.id,
      name: project.name,
      color: project.color,
      position: project.position,
      taskCount: project._count.tasks,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    }));

    res.json({ projects: projectsWithCount });
  } catch (error) {
    next(error);
  }
});

// Create project
router.post('/', validate(createProjectSchema), async (req, res, next) => {
  try {
    const { name, color } = req.body;

    const lastProject = await prisma.project.findFirst({
      where: { userId: req.user.id },
      orderBy: { position: 'desc' },
    });

    const position = lastProject ? lastProject.position + 1 : 0;

    const project = await prisma.project.create({
      data: {
        userId: req.user.id,
        name,
        color: color || '#3b82f6',
        position,
      },
    });

    res.status(201).json({ project });
  } catch (error) {
    next(error);
  }
});

// Get single project
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const project = await prisma.project.findFirst({
      where: { id, userId: req.user.id },
      include: {
        _count: {
          select: { tasks: { where: { parentId: null } } },
        },
      },
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json({
      project: {
        id: project.id,
        name: project.name,
        color: project.color,
        position: project.position,
        taskCount: project._count.tasks,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Update project
router.put('/:id', validate(updateProjectSchema), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, color, position } = req.body;

    const project = await prisma.project.findFirst({
      where: { id, userId: req.user.id },
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const updated = await prisma.project.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(color && { color }),
        ...(position !== undefined && { position }),
      },
    });

    res.json({ project: updated });
  } catch (error) {
    next(error);
  }
});

// Delete project
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const project = await prisma.project.findFirst({
      where: { id, userId: req.user.id },
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    await prisma.project.delete({ where: { id } });

    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// Reorder projects
router.put('/reorder', validate(reorderProjectsSchema), async (req, res, next) => {
  try {
    const { projects } = req.body;

    await prisma.$transaction(
      projects.map((p) =>
        prisma.project.update({
          where: { id: p.id },
          data: { position: p.position },
        })
      )
    );

    res.json({ message: 'Projects reordered successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
