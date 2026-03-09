import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { DatePicker } from '../common/DatePicker';
import { Button } from '../common/Button';
import { PRIORITY_LABELS, TASK_STATUS_LABELS } from '../../utils/constants';
import { useLabels } from '../../context/LabelContext';
import { useAuth } from '../../context/AuthContext';
import { Tag, Bell, Edit2, RotateCcw } from 'lucide-react';
import { useState, useEffect } from 'react';

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
  const { user } = useAuth();
  const [isEditingReminder, setIsEditingReminder] = useState(false);

  const toggleLabel = (labelId) => {
    const current = formData.labelIds || [];
    const updated = current.includes(labelId)
      ? current.filter((id) => id !== labelId)
      : [...current, labelId];
    onChange({ ...formData, labelIds: updated });
  };

  const calculateDefaultReminder = (dueDate, dueTime) => {
    if (!dueDate) return null;
    const date = new Date(dueDate);
    const time = dueTime || user?.defaultReminderTime || '09:00';
    const [hours, minutes] = time.split(':').map(Number);
    date.setHours(hours, minutes, 0, 0);
    
    const reminderMinutes = user?.defaultReminderMinutes || 0;
    return new Date(date.getTime() - (reminderMinutes * 60 * 1000));
  };

  // Sync reminderAt if not customized
  useEffect(() => {
    if (!formData.isReminderCustomized && formData.dueDate) {
      const calculated = calculateDefaultReminder(formData.dueDate, formData.dueTime);
      if (calculated && (!formData.reminderAt || new Date(formData.reminderAt).getTime() !== calculated.getTime())) {
        onChange({ ...formData, reminderAt: calculated.toISOString() });
      }
    }
  }, [formData.dueDate, formData.dueTime, formData.isReminderCustomized, user]);

  const handleReminderDateChange = (date) => {
    if (!date || !formData.reminderAt) return;
    const current = new Date(formData.reminderAt);
    const updated = new Date(date);
    updated.setHours(current.getHours(), current.getMinutes(), 0, 0);
    onChange({ ...formData, reminderAt: updated.toISOString(), isReminderCustomized: true });
  };

  const handleReminderTimeChange = (time) => {
    if (!time || !formData.reminderAt) return;
    const [hours, minutes] = time.split(':').map(Number);
    const updated = new Date(formData.reminderAt);
    updated.setHours(hours, minutes, 0, 0);
    onChange({ ...formData, reminderAt: updated.toISOString(), isReminderCustomized: true });
  };

  const resetReminder = () => {
    const calculated = calculateDefaultReminder(formData.dueDate, formData.dueTime);
    onChange({ 
      ...formData, 
      reminderAt: calculated ? calculated.toISOString() : null, 
      isReminderCustomized: false 
    });
    setIsEditingReminder(false);
  };

  const formatReminderText = (reminderAt) => {
    if (!reminderAt) return 'Not set';
    const date = new Date(reminderAt);
    return date.toLocaleString([], { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
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

      <div className="grid grid-cols-2 gap-4 items-start">
        {!isEdit && projects && projects.length > 0 && (
          <Select
            label="Project"
            value={formData.projectId || ''}
            onChange={(e) => onChange({ ...formData, projectId: e.target.value })}
            options={projectOptions}
            className="col-span-2"
          />
        )}

        <div className="flex flex-col space-y-3">
          <DatePicker
            label="Due Date"
            value={formData.dueDate}
            onChange={(date) => onChange({ ...formData, dueDate: date })}
          />
          
          {formData.dueDate && (
            <div className="flex flex-col space-y-2 pl-1 border-l-2 border-primary-200 dark:border-primary-800 ml-1">
              <Input
                type="time"
                label="Time (Optional)"
                value={formData.dueTime || ''}
                onChange={(e) => onChange({ ...formData, dueTime: e.target.value })}
                className="text-sm"
              />
              
              <div className="flex items-center justify-between pt-1 pr-1">
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
                  <Bell className="h-3 w-3 text-amber-500" /> Remind me
                </label>
                <button
                  type="button"
                  onClick={() => onChange({ ...formData, reminderEnabled: !formData.reminderEnabled })}
                  className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    formData.reminderEnabled !== false ? 'bg-primary-500' : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      formData.reminderEnabled !== false ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {formData.reminderEnabled !== false && (
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-2 mt-1 border border-gray-100 dark:border-gray-800">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500 tracking-wider">
                      Target Reminder
                    </span>
                    <div className="flex gap-1">
                      {formData.isReminderCustomized && (
                        <button
                          type="button"
                          onClick={resetReminder}
                          title="Reset to default"
                          className="p-1 hover:bg-gray-200 dark:hover:bg-gray-800 rounded text-gray-400 hover:text-primary-500 transition-colors"
                        >
                          <RotateCcw className="h-3 w-3" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setIsEditingReminder(!isEditingReminder)}
                        className={`p-1 rounded transition-colors ${
                          isEditingReminder 
                            ? 'bg-primary-100 text-primary-600 dark:bg-primary-900/40 dark:text-primary-400' 
                            : 'hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-400'
                        }`}
                      >
                        <Edit2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>

                  {!isEditingReminder ? (
                    <div className="text-sm font-medium text-gray-600 dark:text-gray-300 flex items-center gap-2">
                      {formatReminderText(formData.reminderAt)}
                      {formData.isReminderCustomized && (
                        <span className="text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-1.5 py-0.5 rounded italic">
                          Manual
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                      <DatePicker
                        label="Reminder Date"
                        value={formData.reminderAt}
                        onChange={handleReminderDateChange}
                        className="text-xs"
                      />
                      <Input
                        type="time"
                        label="Reminder Time"
                        value={formData.reminderAt ? new Date(formData.reminderAt).toTimeString().slice(0, 5) : ''}
                        onChange={(e) => handleReminderTimeChange(e.target.value)}
                        className="text-xs"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

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
              onChange({ 
                ...formData, 
                title: '', 
                description: '', 
                dueDate: null, 
                dueTime: '', 
                reminderEnabled: true, 
                reminderAt: null,
                isReminderCustomized: false,
                priority: 'medium', 
                status: 'todo', 
                labelIds: [] 
              });
              setIsEditingReminder(false);
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
