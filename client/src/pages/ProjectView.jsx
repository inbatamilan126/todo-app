import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useProjects } from '../context/ProjectContext';
import { KanbanBoard } from '../components/kanban/KanbanBoard';
import { TaskModal } from '../components/task/TaskModal';
import { Button } from '../components/common/Button';
import { TASK_STATUSES } from '../utils/constants';

export function ProjectView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { projects, fetchProjects } = useProjects();
  const [project, setProject] = useState(null);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [defaultStatus, setDefaultStatus] = useState(TASK_STATUSES.TODO);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    const found = projects.find((p) => p.id === id);
    setProject(found);
  }, [projects, id]);

  if (!project) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 dark:text-gray-400">Project not found</p>
          <Button variant="ghost" onClick={() => navigate('/today')}>
            Go to Today
          </Button>
        </div>
      </div>
    );
  }

  const handleTaskClick = (task) => {
    setSelectedTask(task);
    setTaskModalOpen(true);
  };

  const handleAddTask = (status = TASK_STATUSES.TODO) => {
    setDefaultStatus(status);
    setSelectedTask(null);
    setTaskModalOpen(true);
  };

  return (
    <div className="flex h-full flex-col -mx-4 px-4 lg:mx-0 lg:px-0">
      {/* Project Header */}
      <div className="mb-4 flex items-center justify-between bg-gray-50 dark:bg-gray-950 lg:bg-transparent py-2">
        <div className="flex items-center gap-3">
          <div
            className="h-4 w-4 rounded-full"
            style={{ backgroundColor: project.color }}
          />
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {project.name}
          </h1>
        </div>

        <Button onClick={() => handleAddTask(TASK_STATUSES.TODO)} size="sm">
          <Plus className="mr-1 h-4 w-4" />
          Add Task
        </Button>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-hidden">
        <KanbanBoard
          projectId={id}
          onTaskClick={handleTaskClick}
          onAddTask={handleAddTask}
          showProject={false}
        />
      </div>

      {/* Task Modal */}
      <TaskModal
        task={selectedTask}
        isOpen={taskModalOpen}
        onClose={() => {
          setTaskModalOpen(false);
          setSelectedTask(null);
        }}
        projectId={id}
        defaultStatus={defaultStatus}
      />
    </div>
  );
}
