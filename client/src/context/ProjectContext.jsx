import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import api from '../services/api';
import socketService from '../services/socket';
import { useAuth } from './AuthContext';

const ProjectContext = createContext(null);

export function ProjectProvider({ children }) {
  const [projects, setProjects] = useState([]);
  const [currentProject, setCurrentProject] = useState(null);
  const [loading, setLoading] = useState(false);
  const { isAuthenticated } = useAuth();

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/projects');
      setProjects(response.data.projects);
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchProjects();
    }
  }, [isAuthenticated, fetchProjects]);

  useEffect(() => {
    const handleTaskChange = () => {
      fetchProjects();
    };

    socketService.on('task:created', handleTaskChange);
    socketService.on('task:updated', handleTaskChange);
    socketService.on('task:deleted', handleTaskChange);
    socketService.on('task:moved', handleTaskChange);

    return () => {
      socketService.off('task:created', handleTaskChange);
      socketService.off('task:updated', handleTaskChange);
      socketService.off('task:deleted', handleTaskChange);
      socketService.off('task:moved', handleTaskChange);
    };
  }, [fetchProjects]);

  const createProject = async (name, color = '#3b82f6') => {
    const response = await api.post('/projects', { name, color });
    const newProject = response.data.project;
    setProjects((prev) => [...prev, { ...newProject, taskCount: 0 }]);
    return newProject;
  };

  const updateProject = async (id, data) => {
    const response = await api.put(`/projects/${id}`, data);
    setProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...response.data.project } : p))
    );
    return response.data.project;
  };

  const deleteProject = async (id) => {
    await api.delete(`/projects/${id}`);
    setProjects((prev) => prev.filter((p) => p.id !== id));
  };

  const reorderProjects = async (reorderedProjects) => {
    await api.put('/projects/reorder', {
      projects: reorderedProjects.map((p, index) => ({
        id: p.id,
        position: index,
      })),
    });
    setProjects(reorderedProjects);
  };

  return (
    <ProjectContext.Provider
      value={{
        projects,
        currentProject,
        setCurrentProject,
        loading,
        fetchProjects,
        createProject,
        updateProject,
        deleteProject,
        reorderProjects,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProjects() {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProjects must be used within a ProjectProvider');
  }
  return context;
}
