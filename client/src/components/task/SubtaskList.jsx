import { useState } from 'react';
import { Plus, ChevronDown, ChevronRight, Check } from 'lucide-react';
import { cn } from '../../utils/cn';

export function SubtaskList({ subtasks, onAdd, onUpdate, onDelete }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [newSubtask, setNewSubtask] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const completedCount = subtasks.filter((s) => s.status === 'done').length;

  const handleAdd = () => {
    if (!newSubtask.trim()) return;
    onAdd(newSubtask.trim());
    setNewSubtask('');
    setIsAdding(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleAdd();
    } else if (e.key === 'Escape') {
      setIsAdding(false);
      setNewSubtask('');
    }
  };

  return (
    <div>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          <span>Subtasks</span>
          {subtasks.length > 0 && (
            <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs dark:bg-gray-700">
              {completedCount}/{subtasks.length}
            </span>
          )}
        </div>
      </button>

      {/* Subtask List */}
      {isExpanded && (
        <div className="mt-2 space-y-1 pl-6">
          {subtasks.map((subtask) => (
            <SubtaskItem
              key={subtask.id}
              subtask={subtask}
              onUpdate={onUpdate}
              onDelete={onDelete}
            />
          ))}

          {/* Add Subtask */}
          {isAdding ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newSubtask}
                onChange={(e) => setNewSubtask(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={() => {
                  if (!newSubtask.trim()) setIsAdding(false);
                }}
                placeholder="Subtask title..."
                className="input flex-1 py-1.5 text-sm"
                autoFocus
              />
              <button
                onClick={handleAdd}
                className="rounded bg-primary-600 px-2 py-1 text-sm font-medium text-white hover:bg-primary-700"
              >
                Add
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsAdding(true)}
              className="flex w-full items-center gap-2 rounded-lg p-2 text-sm text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <Plus className="h-4 w-4" />
              Add subtask
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function SubtaskItem({ subtask, onUpdate, onDelete }) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(subtask.title);

  const handleToggle = () => {
    onUpdate(subtask.id, { completed: subtask.status !== 'done' });
  };

  const handleSave = () => {
    if (!title.trim()) {
      onDelete(subtask.id);
      return;
    }
    onUpdate(subtask.id, { title: title.trim() });
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setTitle(subtask.title);
      setIsEditing(false);
    }
  };

  return (
    <div className="group flex items-center gap-2 rounded-lg py-1.5">
      <button
        onClick={handleToggle}
        className={cn(
          'flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border-2 transition-colors',
          subtask.status === 'done'
            ? 'border-green-500 bg-green-500 text-white'
            : 'border-gray-300 hover:border-gray-400 dark:border-gray-600'
        )}
      >
        {subtask.status === 'done' && <Check className="h-3 w-3" />}
      </button>

      {isEditing ? (
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          className="flex-1 bg-transparent text-sm focus:outline-none dark:text-gray-100"
          autoFocus
        />
      ) : (
        <span
          onClick={() => setIsEditing(true)}
          className={cn(
            'flex-1 cursor-pointer text-sm',
            subtask.status === 'done' && 'text-gray-400 line-through'
          )}
        >
          {subtask.title}
        </span>
      )}

      <button
        onClick={() => onDelete(subtask.id)}
        className="opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
      >
        ×
      </button>
    </div>
  );
}
