import { createContext, useContext, useState, useCallback, useRef } from 'react';
import api from '../services/api';
import socketService from '../services/socket';
import { TASK_STATUSES } from '../utils/constants';

const TaskContext = createContext(null);

export function TaskProvider({ children }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null); // Added error state
  const currentProjectId = useRef(null);

  const fetchTasks = useCallback(async (projectId) => {
    currentProjectId.current = projectId; // Update currentProjectId ref
    setLoading(true);
    setError(null); // Clear previous errors
    try {
      const endpoint = projectId ? `/tasks/project/${projectId}` : '/tasks';
      const response = await api.get(endpoint);
      setTasks(response.data.tasks);
      if (projectId) {
        socketService.joinProject(projectId);
      } else if (currentProjectId.current) {
        // If fetching all tasks, ensure we leave any previously joined project
        socketService.leaveProject(currentProjectId.current);
      }
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
      setError(err.response?.data?.error || 'Failed to fetch tasks');
    } finally {
      setLoading(false);
    }
  }, []);

  const createTask = async (projectId, data) => {
    // Fix: Convert empty string dueTime to null to pass Zod validation
    const sanitizedData = {
      ...data,
      dueTime: data.dueTime === '' ? null : data.dueTime,
    };
    
    const response = await api.post(`/tasks/project/${projectId}`, sanitizedData);
    const newTask = response.data.task;
    // Don't add to state here - let the socket event handle it to avoid duplicates
    // The socket event will fire and add the task
    return newTask;
  };

  const updateTask = async (taskId, data) => {
    // Fix: Convert empty string dueTime to null to pass Zod validation
    const sanitizedData = {
      ...data,
      dueTime: data.dueTime === '' ? null : data.dueTime,
    };
    
    const response = await api.put(`/tasks/${taskId}`, sanitizedData);
    const updatedTask = response.data.task;
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? updatedTask : t))
    );
    return updatedTask;
  };

  const deleteTask = async (taskId) => {
    await api.delete(`/tasks/${taskId}`);
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  };

  const moveTask = async (taskId, status, position) => {
    const previousTasks = [...tasks];
    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status, position } : t))
    );

    try {
      const response = await api.put(`/tasks/${taskId}/move`, { status, position });
      const updatedTask = response.data.task;
      // Sync with server response
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? updatedTask : t))
      );
      return updatedTask;
    } catch (err) {
      console.error('Failed to move task:', err);
      setTasks(previousTasks);
      throw err;
    }
  };

  const reorderTasks = async (reorderedTasks) => {
    const previousTasks = [...tasks];
    // Optimistic update
    setTasks((prev) => {
      const taskIds = new Set(reorderedTasks.map((t) => t.id));
      return [
        ...prev.filter((t) => !taskIds.has(t.id)),
        ...reorderedTasks,
      ];
    });

    try {
      const response = await api.put('/tasks/reorder', {
        tasks: reorderedTasks.map((t, index) => ({
          id: t.id,
          position: index,
          status: t.status,
        })),
      });
      const updatedTasks = response.data.tasks;
      setTasks((prev) => {
        const taskIds = new Set(updatedTasks.map((t) => t.id));
        return [
          ...prev.filter((t) => !taskIds.has(t.id)),
          ...updatedTasks,
        ];
      });
    } catch (err) {
      console.error('Failed to reorder tasks:', err);
      setTasks(previousTasks);
      throw err;
    }
  };

  const addSubtask = async (parentId, title) => {
    const response = await api.post(`/tasks/${parentId}/subtasks`, { title });
    const newSubtask = response.data.task;
    setTasks((prev) =>
      prev.map((t) =>
        t.id === parentId
          ? { ...t, subtasks: [...(t.subtasks || []), newSubtask] }
          : t
      )
    );
    return newSubtask;
  };

  const updateSubtask = async (subtaskId, data) => {
    const response = await api.put(`/tasks/subtasks/${subtaskId}`, data);
    const updatedSubtask = response.data.task;
    setTasks((prev) =>
      prev.map((t) => ({
        ...t,
        subtasks: t.subtasks?.map((s) =>
          s.id === subtaskId ? updatedSubtask : s
        ),
      }))
    );
    return updatedSubtask;
  };

  const deleteSubtask = async (subtaskId) => {
    await api.delete(`/tasks/subtasks/${subtaskId}`);
    setTasks((prev) =>
      prev.map((t) => ({
        ...t,
        subtasks: t.subtasks?.filter((s) => s.id !== subtaskId),
      }))
    );
  };

  const getTasksByStatus = useCallback(() => {
    return {
      [TASK_STATUSES.TODO]: tasks.filter((t) => t.status === TASK_STATUSES.TODO),
      [TASK_STATUSES.IN_PROGRESS]: tasks.filter((t) => t.status === TASK_STATUSES.IN_PROGRESS),
      [TASK_STATUSES.DONE]: tasks.filter((t) => t.status === TASK_STATUSES.DONE),
    };
  }, [tasks]);

  const handleSocketEvent = useCallback((event, data) => {
    switch (event) {
      case 'task:created': {
        // Only add if it's for the current project and not a subtask
        if (!data.task.parentId && currentProjectId.current) {
          setTasks((prev) => {
            // Check if already exists
            if (prev.find((t) => t.id === data.task.id)) return prev;
            return [...prev, data.task];
          });
        }
        break;
      }
      case 'task:updated':
        setTasks((prev) =>
          prev.map((t) => (t.id === data.task.id ? data.task : t))
        );
        break;
      case 'task:deleted':
        setTasks((prev) => prev.filter((t) => t.id !== data.taskId));
        break;
      case 'tasks:reordered': {
        setTasks((prev) => {
          const updatedIds = new Set(data.tasks.map((t) => t.id));
          return [
            ...prev.filter((t) => !updatedIds.has(t.id)),
            ...data.tasks,
          ];
        });
        break;
      }
      default:
        break;
    }
  }, []);

  return (
    <TaskContext.Provider
      value={{
        tasks,
        loading,
        fetchTasks,
        createTask,
        updateTask,
        deleteTask,
        moveTask,
        reorderTasks,
        addSubtask,
        updateSubtask,
        deleteSubtask,
        getTasksByStatus,
        handleSocketEvent,
        setTasks,
      }}
    >
      {children}
    </TaskContext.Provider>
  );
}

export function useTasks() {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error('useTasks must be used within a TaskProvider');
  }
  return context;
}
