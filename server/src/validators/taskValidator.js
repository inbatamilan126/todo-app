import { z } from 'zod';

export const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  status: z.enum(['todo', 'in_progress', 'done']).optional(),
  parentId: z.string().uuid().optional().nullable(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  status: z.enum(['todo', 'in_progress', 'done']).optional(),
  position: z.number().int().optional(),
});

export const moveTaskSchema = z.object({
  status: z.enum(['todo', 'in_progress', 'done']),
  position: z.number().int().min(0),
});

export const createSubtaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
});

export const reorderTasksSchema = z.object({
  tasks: z.array(z.object({
    id: z.string().uuid(),
    position: z.number().int().min(0),
    status: z.enum(['todo', 'in_progress', 'done']).optional(),
  })),
});

export default { createTaskSchema, updateTaskSchema, moveTaskSchema, createSubtaskSchema, reorderTasksSchema };
