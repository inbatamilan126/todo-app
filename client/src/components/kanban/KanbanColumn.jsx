import { useRef, useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus, ArrowRight, ArrowLeft, CheckCircle } from 'lucide-react';
import { TaskCard } from './TaskCard';
import { cn } from '../../utils/cn';

export function KanbanColumn({ 
  id, 
  title, 
  color, 
  tasks, 
  projectId, 
  onTaskClick, 
  onAddTask,
  showAddButton = true,
  isFullWidth = false,
  isMobile = false,
  // Mobile swipe props
  swipingTask,
  swipeProgress,
  swipeDirection,
  onSwipeStart,
  onSwipeMove,
  onSwipeEnd,
  prevStatus,
  nextStatus,
  allowReordering = true,
  showProject = true,
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const touchStartX = useRef(null);
  const [isSwiping, setIsSwiping] = useState(false);

  const hasSwipeProps = typeof swipingTask !== 'undefined';

  const handleTouchStart = (e, task) => {
    touchStartX.current = e.touches[0].clientX;
    onSwipeStart?.(task);
    setIsSwiping(false);
  };

  const handleTouchMove = (e) => {
    if (touchStartX.current === null) return;
    
    const currentX = e.touches[0].clientX;
    const diff = currentX - touchStartX.current;
    const maxSwipe = window.innerWidth * 0.4;
    const progress = Math.min((Math.abs(diff) / maxSwipe) * 100, 100);
    
    if (progress > 10) {
      setIsSwiping(true);
    }
    
    // Determine direction: positive = right, negative = left
    const direction = diff > 0 ? 'right' : 'left';
    onSwipeMove?.(direction, progress);
  };

  const handleTouchEnd = () => {
    setIsSwiping(false);
    onSwipeEnd?.();
    touchStartX.current = null;
  };

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex flex-col rounded-xl bg-gray-100 dark:bg-gray-800/50',
        isMobile ? 'w-full' : isFullWidth ? 'flex-1 min-w-0' : 'w-72 flex-shrink-0',
        isOver && 'ring-2 ring-inset ring-primary-500'
      )}
    >
      {/* Column Header */}
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: color }}
            />
            <h3 className="font-semibold text-gray-700 dark:text-gray-300">
              {title}
            </h3>
            <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-400">
              {tasks.length}
            </span>
          </div>
        </div>
      </div>

      {/* Tasks */}
      <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-3">
        {tasks.map((task) => (
          <div key={task.id}>
            {/* Swipe indicator (mobile only) */}
            {hasSwipeProps && swipingTask?.id === task.id && swipeProgress > 5 && (
              <div 
                className={cn(
                  "mb-2 flex items-center gap-2 rounded-lg px-4 py-3 transition-all duration-200",
                  swipeDirection === 'right' && nextStatus ? 
                    (swipeProgress >= 30 ? "bg-green-500 text-white" : "bg-blue-100 dark:bg-blue-900/30") :
                  swipeDirection === 'left' && prevStatus ?
                    (swipeProgress >= 30 ? "bg-orange-500 text-white" : "bg-orange-100 dark:bg-orange-900/30") :
                  "bg-gray-200 dark:bg-gray-700"
                )}
                style={{ 
                  transform: `translateX(${swipeDirection === 'right' ? '' : '-'}${Math.min(swipeProgress * 2, 100)}px)`,
                  opacity: Math.min(swipeProgress / 30, 1)
                }}
              >
                {swipeDirection === 'right' && nextStatus ? (
                  <>
                    {swipeProgress >= 30 ? (
                      <>
                        <CheckCircle className="h-5 w-5" />
                        <span className="font-medium">Release to move forward</span>
                      </>
                    ) : (
                      <>
                        <ArrowRight className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        <span className="text-sm text-blue-600 dark:text-blue-400">Swipe right → Forward</span>
                      </>
                    )}
                  </>
                ) : swipeDirection === 'left' && prevStatus ? (
                  <>
                    {swipeProgress >= 30 ? (
                      <>
                        <CheckCircle className="h-5 w-5" />
                        <span className="font-medium">Release to move back</span>
                      </>
                    ) : (
                      <>
                        <ArrowLeft className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                        <span className="text-sm text-orange-600 dark:text-orange-400">← Swipe left to go back</span>
                      </>
                    )}
                  </>
                ) : (
                  <span className="text-sm text-gray-500">Swipe left or right</span>
                )}
              </div>
            )}
            
            {/* The Card */}
            {hasSwipeProps ? (
              <div
                onClick={() => !isSwiping && onTaskClick?.(task)}
                onTouchStart={(e) => handleTouchStart(e, task)}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                className={cn(
                  "transition-opacity duration-200",
                  swipingTask?.id === task.id && "opacity-50"
                )}
              >
                <TaskCard task={task} isMobile={isMobile} allowReordering={allowReordering} showProject={showProject} />
              </div>
            ) : (
              <TaskCard task={task} onClick={() => onTaskClick?.(task)} isMobile={isMobile} allowReordering={allowReordering} showProject={showProject} />
            )}
          </div>
        ))}

        {tasks.length === 0 && (
          <div className="flex h-32 items-center justify-center text-sm text-gray-400 italic">
            No tasks
          </div>
        )}

        {/* Add Task Button */}
        {showAddButton && (
          <button
            onClick={() => onAddTask?.(id)}
            className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 p-4 text-base font-medium text-gray-500 hover:border-gray-400 hover:bg-gray-50 dark:border-gray-600 dark:hover:border-gray-500 dark:hover:bg-gray-700/50"
          >
            <Plus className="h-5 w-5" />
            Add task
          </button>
        )}
      </div>
    </div>
  );
}
