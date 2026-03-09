import { useState, useEffect } from 'react';
import { useTasks } from '../context/TaskContext';
import { KanbanBoard } from '../components/kanban/KanbanBoard';
import { TaskModal } from '../components/task/TaskModal';
import { TASK_STATUSES } from '../utils/constants';

export function TodayView() {
  const { tasks: contextTasks, loading, fetchTasks, reorderTasks } = useTasks();
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  useEffect(() => {
    fetchTasks(); // Fetch all tasks to filter locally for Today
  }, [fetchTasks]);

  const isSameDay = (d1, d2) => {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  };

  const tasks = contextTasks.filter(t => {
    if (!t.dueDate) return false;
    
    const d = new Date(t.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    d.setHours(0, 0, 0, 0);

    // If due today, show it regardless of status
    if (isSameDay(d, today)) return true;
    
    // If overdue (due date is before today)
    if (d < today) {
      // Only show if it's not done
      return t.status !== TASK_STATUSES.DONE;
    }

    // Future tasks are not shown in Today view
    return false;
  });

  const handleTaskClick = (task) => {
    setSelectedTask(task);
    setIsModalOpen(true);
  };

  const handleAddTask = () => {
    setSelectedTask(null);
    setIsModalOpen(true);
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
            onTaskClick={handleTaskClick} 
            onAddTask={handleAddTask} 
            allowReordering={false}
            showProject={true}
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
        }}
      />
    </div>
  );
}
