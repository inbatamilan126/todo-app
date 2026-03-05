// Use relative path to go through Vite proxy in development
export const API_URL = '/api';
// Empty string means "same origin" for socket.io client.
export const WS_URL = import.meta.env.VITE_WS_URL || '';

export const TASK_STATUSES = {
  TODO: 'todo',
  IN_PROGRESS: 'in_progress',
  DONE: 'done',
};

export const TASK_STATUS_LABELS = {
  [TASK_STATUSES.TODO]: 'To Do',
  [TASK_STATUSES.IN_PROGRESS]: 'In Progress',
  [TASK_STATUSES.DONE]: 'Done',
};

export const PRIORITIES = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
};

export const PRIORITY_LABELS = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

export const PRIORITY_COLORS = {
  low: '#22c55e',
  medium: '#eab308',
  high: '#ef4444',
};

export const DEFAULT_PROJECT_COLORS = [
  '#3b82f6', // Blue
  '#ef4444', // Red
  '#22c55e', // Green
  '#eab308', // Yellow
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#f97316', // Orange
];

export const COLUMN_COLORS = {
  todo: '#6b7280',
  in_progress: '#3b82f6',
  done: '#22c55e',
};
