import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Calendar, ListTodo, CheckCircle2, GripVertical } from 'lucide-react';
import { cn } from '../../utils/cn';
import { PriorityBadge } from '../common/Badge';
import { formatDate, isDueOverdue } from '../../utils/helpers';

export function TaskCard({ task, isDragging, onClick, isMobile, allowReordering = true, showProject = true }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isNodeDragging,
  } = isMobile ? {} : useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transform ? transition : undefined,
  };

  const overdue = isDueOverdue(task.dueDate);
  const subtasks = task.subtasks || [];
  const completedSubtasks = subtasks.filter(s => s.status === 'done').length;
  const hasSubtasks = subtasks.length > 0;

  if (isNodeDragging) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          'rounded-lg bg-gray-50/50 dark:bg-gray-800/30 border-2 border-dashed border-gray-200 dark:border-gray-700',
          'min-h-[120px] w-full p-4' // Matching card padding to maintain shell look
        )}
      />
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        ...(isDragging ? { transform: `${style.transform} scale(0.95) rotate(1deg)` } : {})
      }}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={cn(
        'group relative touch-manipulation rounded-lg bg-white p-4 shadow-sm transition-all dark:bg-gray-800',
        isDragging ? 'shadow-2xl ring-1 ring-primary-500/30 z-50 cursor-grabbing !opacity-100' : 'hover:shadow-md cursor-pointer',
        'cursor-pointer'
      )}
    >
      {/* Drag Handle - Desktop only */}
      <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-50 hidden lg:block">
        <GripVertical className="h-5 w-5 text-gray-400" />
      </div>

      {/* Project Indicator (For Global Views) */}
      {showProject && task.project && (
        <div className="mb-2 flex items-center gap-1.5">
          <span 
            className="h-2 w-2 rounded-full" 
            style={{ backgroundColor: task.project.color }}
          />
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
            {task.project.name}
          </span>
        </div>
      )}

      {/* Priority */}
      <div className="mb-2">
        <PriorityBadge priority={task.priority} />
      </div>

      {/* Labels */}
      {task.labels && task.labels.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {task.labels.map((label) => (
            <span
              key={label.id}
              className="px-2 py-0.5 text-[10px] font-semibold rounded-md text-white shadow-sm"
              style={{ backgroundColor: label.color }}
            >
              {label.name}
            </span>
          ))}
        </div>
      )}

      {/* Title */}
      <h4 className="mb-2 pr-6 text-base font-medium text-gray-900 dark:text-gray-100 line-clamp-2">
        {task.title}
      </h4>

      {/* Subtasks Preview */}
      {hasSubtasks && (
        <div className="mb-3 rounded-md bg-gray-50 p-3 dark:bg-gray-700/50">
          <div className="mb-2 flex items-center gap-2">
            <ListTodo className="h-4 w-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Subtasks ({completedSubtasks}/{subtasks.length})
            </span>
          </div>
          <div className="space-y-2">
            {subtasks.slice(0, 3).map((subtask) => (
              <div 
                key={subtask.id} 
                className="flex items-start gap-2"
              >
                <div className={cn(
                  "mt-0.5 h-4 w-4 rounded-full border flex-shrink-0 flex items-center justify-center",
                  subtask.status === 'done' 
                    ? "border-green-500 bg-green-500 text-white" 
                    : "border-gray-300 dark:border-gray-600"
                )}>
                  {subtask.status === 'done' && (
                    <CheckCircle2 className="h-3 w-3" />
                  )}
                </div>
                <span className={cn(
                  "text-sm line-clamp-1",
                  subtask.status === 'done' ? "text-gray-400 line-through" : "text-gray-700 dark:text-gray-300"
                )}>
                  {subtask.title}
                </span>
              </div>
            ))}
            {subtasks.length > 3 && (
              <div className="text-sm text-gray-500 pl-6">
                +{subtasks.length - 3} more
              </div>
            )}
          </div>
        </div>
      )}

      {/* Meta info */}
      <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
        {task.dueDate && (
          <div
            className={cn(
              'flex items-center gap-1.5',
              overdue && 'text-red-500'
            )}
          >
            <Calendar className="h-4 w-4" />
            <span>{formatDate(task.dueDate)}</span>
          </div>
        )}
        {!hasSubtasks && task.description && (
          <span className="line-clamp-1 text-gray-400">
            {task.description}
          </span>
        )}
      </div>
    </div>
  );
}
