import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { DatePicker } from '../common/DatePicker';
import { Button } from '../common/Button';
import { PRIORITY_LABELS, TASK_STATUS_LABELS } from '../../utils/constants';
import { useLabels } from '../../context/LabelContext';
import { Tag } from 'lucide-react';

export function TaskForm({
  formData,
  onChange,
  onSubmit,
  loading,
  isEdit,
  onDelete,
  projects,
}) {
  const { labels } = useLabels();

  const toggleLabel = (labelId) => {
    const current = formData.labelIds || [];
    const updated = current.includes(labelId)
      ? current.filter((id) => id !== labelId)
      : [...current, labelId];
    onChange({ ...formData, labelIds: updated });
  };
  const priorityOptions = Object.entries(PRIORITY_LABELS).map(([value, label]) => ({
    value,
    label,
  }));

  const statusOptions = Object.entries(TASK_STATUS_LABELS).map(([value, label]) => ({
    value,
    label,
  }));

  const projectOptions = projects?.map(p => ({
    value: p.id,
    label: p.name,
  })) || [];

  return (
    <form 
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation(); // Just in case
        onSubmit();
      }} 
      className="space-y-4"
    >
      <Input
        label="Title"
        value={formData.title}
        onChange={(e) => onChange({ ...formData, title: e.target.value })}
        placeholder="What needs to be done?"
        error={!formData.title.trim() ? 'Title is required' : undefined}
      />

      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Description
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => onChange({ ...formData, description: e.target.value })}
          placeholder="Add more details..."
          rows={3}
          className="input min-h-[80px] resize-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {!isEdit && projects && projects.length > 0 && (
          <Select
            label="Project"
            value={formData.projectId || ''}
            onChange={(e) => onChange({ ...formData, projectId: e.target.value })}
            options={projectOptions}
            className="col-span-2"
          />
        )}

        <DatePicker
          label="Due Date"
          value={formData.dueDate}
          onChange={(date) => onChange({ ...formData, dueDate: date })}
        />

        <Select
          label="Priority"
          value={formData.priority}
          onChange={(e) => onChange({ ...formData, priority: e.target.value })}
          options={priorityOptions}
        />

        {isEdit && (
          <Select
            label="Status"
            value={formData.status}
            onChange={(e) => onChange({ ...formData, status: e.target.value })}
            options={statusOptions}
            className="col-span-2"
          />
        )}
      </div>

      {/* Labels Multi-Select */}
      {labels && labels.length > 0 && (
        <div className="pt-2">
          <label className="mb-2 flex items-center gap-1 text-sm font-medium text-gray-700 dark:text-gray-300">
            <Tag className="h-4 w-4" /> Labels
          </label>
          <div className="flex flex-wrap gap-2">
            {labels.map((label) => {
              const isActive = (formData.labelIds || []).includes(label.id);
              return (
                <button
                  key={label.id}
                  type="button"
                  onClick={() => toggleLabel(label.id)}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                    isActive
                      ? 'ring-2 ring-offset-1 dark:ring-offset-gray-800'
                      : 'opacity-50 hover:opacity-100'
                  }`}
                  style={{
                    backgroundColor: isActive ? label.color : 'transparent',
                    color: isActive ? '#fff' : label.color,
                    border: `1px solid ${label.color}`,
                    ...(isActive && { ringColor: label.color }),
                  }}
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: isActive ? '#fff' : label.color }}
                  />
                  {label.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between pt-4">
        {isEdit && (
          <Button
            type="button"
            variant="ghost"
            onPointerDown={(e) => {
              e.stopPropagation();
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDelete();
            }}
            className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
          >
            Delete task
          </Button>
        )}
        <div className="ml-auto flex gap-2">
          <Button 
            type="button" 
            variant="ghost" 
            onPointerDown={(e) => {
              e.stopPropagation();
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onChange({ ...formData, title: '', description: '', dueDate: null, priority: 'medium', status: 'todo', labelIds: [] });
            }}
          >
            Clear
          </Button>
          <Button 
            type="submit" 
            onPointerDown={(e) => {
              e.stopPropagation();
            }}
            onClick={(e) => {
              e.stopPropagation(); // Avoid interception from outer sensors
            }}
            loading={loading} 
            disabled={!formData.title.trim()}
          >
            {isEdit ? 'Save Changes' : 'Create Task'}
          </Button>
        </div>
      </div>
    </form>
  );
}
