import { useState, useEffect } from 'react';
import api from '../services/api';
import { KanbanBoard } from '../components/kanban/KanbanBoard';
import { TaskModal } from '../components/task/TaskModal';
import { useTasks } from '../context/TaskContext';

export function TodayView() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  
  // To use moveTask which hits the /api/tasks/:id/move endpoint
  const { moveTask } = useTasks();

  const fetchTodayTasks = async () => {
    try {
      const response = await api.get('/tasks?filter=today');
      setTasks(response.data.tasks);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTodayTasks();
  }, []);

  const handleTaskClick = (task) => {
    setSelectedTask(task);
    setIsModalOpen(true);
  };

  const handleAddTask = () => {
    setSelectedTask(null);
    setIsModalOpen(true);
  };

  const handleMoveTask = async (taskId, targetStatus, targetPosition) => {
    // Fast optimistic UI update for local TodayView tasks state
    const targetTask = tasks.find(t => t.id === taskId);
    if (!targetTask) return;
    
    // Sort tasks in same target status
    const columnTasks = tasks.filter(t => t.status === targetStatus && t.id !== taskId)
                              .sort((a,b) => a.position - b.position);
    
    // Insert at position
    columnTasks.splice(targetPosition, 0, { ...targetTask, status: targetStatus, position: targetPosition });
    
    // Fix subsequent positions
    columnTasks.forEach((t, index) => { t.position = index; });

    // Non-modified tasks
    const otherTasks = tasks.filter(t => t.status !== targetStatus && t.id !== taskId);

    setTasks([...otherTasks, ...columnTasks]);

    // Persist to server
    try {
      await moveTask(taskId, targetStatus, targetPosition);
    } catch (e) {
      console.error("Failed to move task globally:", e);
      fetchTodayTasks(); // Revert on failure
    }
  };

  return (
    <div className="flex h-full flex-col">
      <header className="mb-6 flex shrink-0 items-center justify-between px-4 sm:px-6 lg:px-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Today</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Tasks due today or overdue across all projects.</p>
        </div>
      </header>
      <div className="flex-1 overflow-hidden px-4 pb-4 sm:px-6 lg:px-8">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
          </div>
        ) : (
          <KanbanBoard 
            importedTasks={tasks} 
            onMoveTask={handleMoveTask}
            onTaskClick={handleTaskClick} 
            onAddTask={handleAddTask} 
          />
        )}
      </div>

      <TaskModal
        task={selectedTask}
        isOpen={isModalOpen}
        defaultDueDate={new Date()}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedTask(null);
          // Refetch to get any updates made in the modal
          fetchTodayTasks();
        }}
      />
    </div>
  );
}
