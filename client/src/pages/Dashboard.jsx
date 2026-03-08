import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, ArrowRight } from 'lucide-react';
import { useProjects } from '../context/ProjectContext';
import { useTasks } from '../context/TaskContext';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/common/Button';

export function Dashboard() {
  const { user } = useAuth();
  const { projects, fetchProjects, loading, createProject } = useProjects();
  const { tasks } = useTasks();
  const navigate = useNavigate();
  
  const completedCount = tasks.filter(t => t.status === 'done').length;
  
  // Local state for inline project creation
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectColor, setNewProjectColor] = useState('#3b82f6');

  const projectColors = [
    '#3b82f6', '#ef4444', '#22c55e', '#eab308', 
    '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'
  ];

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    const handleOpenModal = () => setShowNewProject(true);
    window.addEventListener('open-new-project-modal', handleOpenModal);
    return () => window.removeEventListener('open-new-project-modal', handleOpenModal);
  }, []);

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;
    const project = await createProject(newProjectName.trim(), newProjectColor);
    setNewProjectName('');
    setShowNewProject(false);
    // Navigate to the new project
    navigate(`/projects/${project.id}`);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Welcome back, {user?.name?.split(' ')[0]}!
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Here's an overview of your projects
        </p>
      </div>

      {/* Projects Grid */}
      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800"
            />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 rounded-full bg-gray-100 p-4 dark:bg-gray-800">
            <Plus className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-gray-100">
            No projects yet
          </h3>
          <p className="mb-4 text-gray-500 dark:text-gray-400">
            Create your first project to get started
          </p>
          <Button onClick={() => setShowNewProject(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Project
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {projects.map((project) => (
            <Link
              key={project.id}
              to={`/projects/${project.id}`}
              className="group relative overflow-hidden rounded-xl bg-white p-6 lg:p-8 shadow-sm transition-all hover:shadow-md dark:bg-gray-800"
            >
              <div
                className="absolute left-0 top-0 h-1 w-full"
                style={{ backgroundColor: project.color }}
              />
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="mb-1 text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {project.name}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {project.taskCount || 0} tasks
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400 transition-transform group-hover:translate-x-1" />
              </div>
            </Link>
          ))}

          {/* Add Project Card */}
          <button
            onClick={() => setShowNewProject(true)}
            className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 p-6 lg:p-8 text-gray-500 transition-colors hover:border-primary-300 hover:bg-primary-50 dark:border-gray-700 dark:hover:border-primary-600 dark:hover:bg-primary-900/20"
          >
            <Plus className="mb-2 h-8 w-8" />
            <span className="font-medium">New Project</span>
          </button>
        </div>
      )}

      {/* Quick Stats */}
      {projects.length > 0 && (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl bg-white p-6 shadow-sm dark:bg-gray-800">
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Projects</p>
            <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">
              {projects.length}
            </p>
          </div>
          <div className="rounded-xl bg-white p-6 shadow-sm dark:bg-gray-800">
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Tasks</p>
            <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">
              {projects.reduce((sum, p) => sum + (p.taskCount || 0), 0)}
            </p>
          </div>
          <div className="rounded-xl bg-white p-6 shadow-sm dark:bg-gray-800">
            <p className="text-sm text-gray-500 dark:text-gray-400">Completed</p>
            <p className="mt-1 text-2xl font-bold text-green-600">
              {completedCount}
            </p>
          </div>
        </div>
      )}

      {/* New Project Modal (inline) */}
      {showNewProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-800">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
              New Project
            </h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Project Name
                </label>
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="My Project"
                  className="input"
                  autoFocus
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Color
                </label>
                <div className="flex flex-wrap gap-2">
                  {projectColors.map((color) => (
                    <button
                      key={color}
                      onClick={() => setNewProjectColor(color)}
                      className={`h-8 w-8 rounded-full transition-transform ${
                        newProjectColor === color ? 'ring-2 ring-offset-2 ring-primary-500 scale-110' : ''
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowNewProject(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateProject} disabled={!newProjectName.trim()}>
                Create
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
