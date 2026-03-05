import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { DatePicker } from '../common/DatePicker';
import { Button } from '../common/Button';
import { PRIORITY_LABELS, TASK_STATUS_LABELS } from '../../utils/constants';

export function TaskForm({
  formData,
  onChange,
  onSubmit,
  loading,
  isEdit,
  onDelete,
}) {
  const priorityOptions = Object.entries(PRIORITY_LABELS).map(([value, label]) => ({
    value,
    label,
  }));

  const statusOptions = Object.entries(TASK_STATUS_LABELS).map(([value, label]) => ({
    value,
    label,
  }));

  return (
    <div className="space-y-4">
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

      <div className="flex items-center justify-between pt-4">
        {isEdit && (
          <Button
            type="button"
            variant="ghost"
            onClick={onDelete}
            className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
          >
            Delete task
          </Button>
        )}
        <div className="ml-auto flex gap-2">
          <Button type="button" variant="ghost" onClick={() => onChange({ ...formData, title: '', description: '', dueDate: null, priority: 'medium', status: 'todo' })}>
            Clear
          </Button>
          <Button onClick={onSubmit} loading={loading} disabled={!formData.title.trim()}>
            {isEdit ? 'Save Changes' : 'Create Task'}
          </Button>
        </div>
      </div>
    </div>
  );
}
