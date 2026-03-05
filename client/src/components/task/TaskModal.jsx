import { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { TaskForm } from './TaskForm';
import { SubtaskList } from './SubtaskList';
import { useTasks } from '../../context/TaskContext';

export function TaskModal({ task, isOpen, onClose, projectId, defaultStatus = 'todo' }) {
  const { createTask, updateTask, deleteTask, addSubtask, updateSubtask, deleteSubtask, tasks } = useTasks();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    dueDate: null,
    priority: 'medium',
    status: defaultStatus,
  });
  const [loading, setLoading] = useState(false);

  // Get fresh task data from context when modal opens
  const freshTask = task ? tasks.find(t => t.id === task.id) : null;

  useEffect(() => {
    if (freshTask) {
      setFormData({
        title: freshTask.title || '',
        description: freshTask.description || '',
        dueDate: freshTask.dueDate || null,
        priority: freshTask.priority || 'medium',
        status: freshTask.status || 'todo',
      });
    } else if (isOpen && !task) {
      setFormData({
        title: '',
        description: '',
        dueDate: null,
        priority: 'medium',
        status: defaultStatus,
      });
    }
  }, [freshTask, isOpen, task, defaultStatus]);

  const handleSubmit = async () => {
    if (!formData.title.trim()) return;

    setLoading(true);
    try {
      if (task) {
        await updateTask(task.id, formData);
      } else {
        await createTask(projectId, formData);
      }
      onClose();
    } catch (error) {
      console.error('Failed to save task:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!task) return;
    if (!window.confirm('Are you sure you want to delete this task?')) return;

    setLoading(true);
    try {
      await deleteTask(task.id);
      onClose();
    } catch (error) {
      console.error('Failed to delete task:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubtask = async (title) => {
    if (!freshTask) return;
    await addSubtask(freshTask.id, title);
  };

  const handleUpdateSubtask = async (subtaskId, data) => {
    await updateSubtask(subtaskId, data);
  };

  const handleDeleteSubtask = async (subtaskId) => {
    await deleteSubtask(subtaskId);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={task ? 'Edit Task' : 'New Task'}
      size="lg"
    >
      <div className="space-y-4">
        <TaskForm
          formData={formData}
          onChange={setFormData}
          onSubmit={handleSubmit}
          loading={loading}
          isEdit={!!task}
          onDelete={handleDelete}
        />

        {task && freshTask && (
          <div className="border-t border-gray-200 pt-4 dark:border-gray-700">
            <SubtaskList
              subtasks={freshTask.subtasks || []}
              onAdd={handleAddSubtask}
              onUpdate={handleUpdateSubtask}
              onDelete={handleDeleteSubtask}
            />
          </div>
        )}
      </div>
    </Modal>
  );
}
