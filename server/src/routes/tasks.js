import express from 'express';
import prisma from '../config/db.js';
import { authenticate } from '../middleware/auth.js';
import { createTaskSchema, updateTaskSchema, moveTaskSchema, createSubtaskSchema } from '../validators/taskValidator.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();

router.use(authenticate);

// Get tasks for a project
router.get('/project/:projectId', async (req, res, next) => {
  try {
    const { projectId } = req.params;

    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: req.user.id },
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const tasks = await prisma.task.findMany({
      where: {
        projectId,
        parentId: null, // Only main tasks
      },
      include: {
        subtasks: {
          orderBy: { position: 'asc' },
        },
      },
      orderBy: [
        { status: 'asc' },
        { position: 'asc' },
      ],
    });

    res.json({ tasks });
  } catch (error) {
    next(error);
  }
});

// Create task
router.post('/project/:projectId', validate(createTaskSchema), async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { title, description, dueDate, priority, status, parentId } = req.body;

    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: req.user.id },
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Get highest position in the status column
    const taskStatus = status || 'todo';
    const lastTask = await prisma.task.findFirst({
      where: { projectId, status: taskStatus },
      orderBy: { position: 'desc' },
    });

    const position = lastTask ? lastTask.position + 1 : 0;

    const task = await prisma.task.create({
      data: {
        projectId,
        userId: req.user.id,
        title,
        description,
        dueDate: dueDate ? new Date(dueDate) : null,
        priority: priority || 'medium',
        status: taskStatus,
        position,
        parentId: parentId || null,
      },
      include: {
        subtasks: true,
      },
    });

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(`project:${projectId}`).emit('task:created', { task });
    }

    res.status(201).json({ task });
  } catch (error) {
    next(error);
  }
});

// Get single task
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const task = await prisma.task.findFirst({
      where: { id, userId: req.user.id },
      include: {
        subtasks: {
          orderBy: { position: 'asc' },
        },
      },
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json({ task });
  } catch (error) {
    next(error);
  }
});

// Update task
router.put('/:id', validate(updateTaskSchema), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, description, dueDate, priority, status, position } = req.body;

    const task = await prisma.task.findFirst({
      where: { id, userId: req.user.id },
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const updated = await prisma.task.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
        ...(priority && { priority }),
        ...(status && { status }),
        ...(position !== undefined && { position }),
      },
      include: {
        subtasks: true,
      },
    });

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(`project:${task.projectId}`).emit('task:updated', { task: updated });
    }

    res.json({ task: updated });
  } catch (error) {
    next(error);
  }
});

// Delete task
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const task = await prisma.task.findFirst({
      where: { id, userId: req.user.id },
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    await prisma.task.delete({ where: { id } });

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(`project:${task.projectId}`).emit('task:deleted', { taskId: id });
    }

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// Move task (change status and/or position)
router.put('/:id/move', validate(moveTaskSchema), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, position } = req.body;

    const task = await prisma.task.findFirst({
      where: { id, userId: req.user.id },
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Update positions of other tasks in the target column
    if (status !== task.status || position !== task.position) {
      await prisma.$transaction([
        // Increment positions of tasks at or after the new position
        prisma.task.updateMany({
          where: {
            projectId: task.projectId,
            status,
            id: { not: id },
            position: { gte: position },
          },
          data: {
            position: { increment: 1 },
          },
        }),
        // Update the moved task
        prisma.task.update({
          where: { id },
          data: { status, position },
        }),
      ]);
    }

    const updated = await prisma.task.findUnique({
      where: { id },
      include: { subtasks: true },
    });

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(`project:${task.projectId}`).emit('task:moved', {
        taskId: id,
        status,
        position,
        task: updated,
      });
    }

    res.json({ task: updated });
  } catch (error) {
    next(error);
  }
});

// Add subtask
router.post('/:id/subtasks', validate(createSubtaskSchema), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title } = req.body;

    const parentTask = await prisma.task.findFirst({
      where: { id, userId: req.user.id },
    });

    if (!parentTask) {
      return res.status(404).json({ error: 'Parent task not found' });
    }

    const lastSubtask = await prisma.task.findFirst({
      where: { parentId: id },
      orderBy: { position: 'desc' },
    });

    const position = lastSubtask ? lastSubtask.position + 1 : 0;

    const subtask = await prisma.task.create({
      data: {
        projectId: parentTask.projectId,
        parentId: id,
        userId: req.user.id,
        title,
        position,
      },
    });

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(`project:${parentTask.projectId}`).emit('task:created', { task: subtask, isSubtask: true });
    }

    res.status(201).json({ task: subtask });
  } catch (error) {
    next(error);
  }
});

// Update subtask
router.put('/subtasks/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, completed, position } = req.body;

    const subtask = await prisma.task.findFirst({
      where: { id, userId: req.user.id },
    });

    if (!subtask || !subtask.parentId) {
      return res.status(404).json({ error: 'Subtask not found' });
    }

    const updated = await prisma.task.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(completed !== undefined && { status: completed ? 'done' : 'todo' }),
        ...(position !== undefined && { position }),
      },
    });

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(`project:${subtask.projectId}`).emit('task:updated', { task: updated });
    }

    res.json({ task: updated });
  } catch (error) {
    next(error);
  }
});

// Delete subtask
router.delete('/subtasks/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const subtask = await prisma.task.findFirst({
      where: { id, userId: req.user.id },
    });

    if (!subtask || !subtask.parentId) {
      return res.status(404).json({ error: 'Subtask not found' });
    }

    await prisma.task.delete({ where: { id } });

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(`project:${subtask.projectId}`).emit('task:deleted', { taskId: id });
    }

    res.json({ message: 'Subtask deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
