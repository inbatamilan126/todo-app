import { z } from 'zod';

export const createProjectSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  color: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional(),
});

export const updateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  color: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional(),
  position: z.number().int().optional(),
});

export const reorderProjectsSchema = z.object({
  projects: z.array(z.object({
    id: z.string().uuid(),
    position: z.number().int(),
  })),
});

export default { createProjectSchema, updateProjectSchema, reorderProjectsSchema };
