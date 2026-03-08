import { useState, useEffect } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  MeasuringStrategy,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useTasks } from '../../context/TaskContext';
import { KanbanColumn } from './KanbanColumn';
import { TaskCard } from './TaskCard';
import { TASK_STATUSES, COLUMN_COLORS } from '../../utils/constants';
import socketService from '../../services/socket';

const columns = [
  { id: TASK_STATUSES.TODO, title: 'To Do', color: COLUMN_COLORS.todo, prevStatus: null, nextStatus: TASK_STATUSES.IN_PROGRESS },
  { id: TASK_STATUSES.IN_PROGRESS, title: 'In Progress', color: COLUMN_COLORS.in_progress, prevStatus: TASK_STATUSES.TODO, nextStatus: TASK_STATUSES.DONE },
  { id: TASK_STATUSES.DONE, title: 'Done', color: COLUMN_COLORS.done, prevStatus: TASK_STATUSES.IN_PROGRESS, nextStatus: null },
];

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
}

export function KanbanBoard({ projectId, importedTasks, onMoveTask, onTaskClick, onAddTask, allowReordering = true }) {
  const { tasks: contextTasks, moveTask: contextMoveTask, getTasksByStatus: contextGetTasksByStatus, handleSocketEvent, fetchTasks, reorderTasks } = useTasks();
  
  const tasks = importedTasks || contextTasks;
  const moveTask = onMoveTask || contextMoveTask;
  const [activeTask, setActiveTask] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [swipingTask, setSwipingTask] = useState(null);
  const [swipeProgress, setSwipeProgress] = useState(0);
  const [swipeDirection, setSwipeDirection] = useState(null);
  const isMobile = useIsMobile();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 3,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (projectId && !importedTasks) {
      fetchTasks(projectId);
    }
  }, [projectId, fetchTasks, importedTasks]);

  useEffect(() => {
    socketService.on('task:created', (data) => handleSocketEvent('task:created', data));
    socketService.on('task:updated', (data) => handleSocketEvent('task:updated', data));
    socketService.on('task:deleted', (data) => handleSocketEvent('task:deleted', data));
    socketService.on('task:moved', (data) => handleSocketEvent('task:updated', data));
    socketService.on('tasks:reordered', (data) => handleSocketEvent('tasks:reordered', data));

    return () => {
      socketService.off('task:created');
      socketService.off('task:updated');
      socketService.off('task:deleted');
      socketService.off('task:moved');
      socketService.off('tasks:reordered');
    };
  }, [handleSocketEvent]);

  const tasksByStatus = importedTasks 
    ? {
        [TASK_STATUSES.TODO]: tasks.filter((t) => t.status === TASK_STATUSES.TODO),
        [TASK_STATUSES.IN_PROGRESS]: tasks.filter((t) => t.status === TASK_STATUSES.IN_PROGRESS),
        [TASK_STATUSES.DONE]: tasks.filter((t) => t.status === TASK_STATUSES.DONE),
      }
    : contextGetTasksByStatus();

  const handleSwipeStart = (task) => {
    setSwipingTask(task);
    setSwipeProgress(0);
    setSwipeDirection(null);
  };

  const handleSwipeMove = (direction, progress) => {
    setSwipeDirection(direction);
    setSwipeProgress(progress);
  };

  const handleSwipeEnd = async () => {
    if (!swipingTask || swipeProgress < 30 || !swipeDirection) {
      setSwipingTask(null);
      setSwipeProgress(0);
      setSwipeDirection(null);
      return;
    }

    const currentColumn = columns.find(c => c.id === swipingTask.status);
    
    if (swipeDirection === 'right' && currentColumn?.nextStatus) {
      await moveTask(swipingTask.id, currentColumn.nextStatus, 0);
    } else if (swipeDirection === 'left' && currentColumn?.prevStatus) {
      await moveTask(swipingTask.id, currentColumn.prevStatus, 0);
    }
    
    setSwipingTask(null);
    setSwipeProgress(0);
    setSwipeDirection(null);
  };

  const handleDragStart = (event) => {
    const { active } = event;
    const task = tasks.find((t) => t.id === active.id);
    setActiveTask(task);
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    // Check if dropping over a column
    const targetColumn = columns.find((c) => c.id === overId);
    if (targetColumn) {
      const sourceTask = tasks.find((t) => t.id === activeId);
      // Only move if the status is different
      if (sourceTask && sourceTask.status !== targetColumn.id) {
        const columnTasks = tasksByStatus[targetColumn.id] || [];
        const newPosition = columnTasks.length;
        await moveTask(activeId, targetColumn.id, newPosition);
      }
      return;
    }

    // Dropping over another task
    const overTask = tasks.find((t) => t.id === overId);
    if (overTask) {
      const sourceTask = tasks.find((t) => t.id === activeId);
      if (sourceTask && sourceTask.status !== overTask.status) {
        // Move to the new status
        await moveTask(activeId, overTask.status, overTask.position);
      } else if (sourceTask && sourceTask.status === overTask.status && allowReordering) {
        // Reorder within the same status (only if allowed)
        const columnTasks = [...tasksByStatus[sourceTask.status]];
        const oldIndex = columnTasks.findIndex((t) => t.id === activeId);
        const newIndex = columnTasks.findIndex((t) => t.id === overId);
        
        if (oldIndex !== newIndex) {
          const reordered = arrayMove(columnTasks, oldIndex, newIndex);
          await reorderTasks(reordered);
        }
      }
    }
  };

  const handleDragCancel = () => {
    setActiveTask(null);
  };

  const activeColumn = columns[activeTab];
  const activeTasks = tasksByStatus[activeColumn.id] || [];

  const boardContent = (
    <div className="hidden lg:flex lg:h-full lg:gap-4">
      {columns.map((column) => {
        const columnTasks = tasksByStatus[column.id] || [];
        const content = (
          <KanbanColumn
            id={column.id}
            title={column.title}
            color={column.color}
            tasks={columnTasks}
            projectId={projectId}
            onTaskClick={onTaskClick}
            onAddTask={onAddTask}
            showAddButton={column.id === TASK_STATUSES.TODO}
            isFullWidth
            allowReordering={allowReordering}
          />
        );

        if (!allowReordering) return <div key={column.id} className="flex-1 h-full">{content}</div>;

        return (
          <SortableContext
            key={column.id}
            items={columnTasks.map((t) => t.id)}
            strategy={verticalListSortingStrategy}
          >
            {content}
          </SortableContext>
        );
      })}
    </div>
  );

  if (isMobile) {
    return (
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        {/* Mobile: Tab Navigation */}
        <div className="lg:hidden mb-4 pt-2">
          <div className="flex gap-2">
            {columns.map((col, index) => (
              <button
                key={col.id}
                onClick={() => setActiveTab(index)}
                className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-3 px-3 text-xs font-semibold transition-all whitespace-nowrap ${
                  activeTab === index
                    ? 'bg-white dark:bg-gray-800 shadow-md ring-2 ring-inset'
                    : 'bg-gray-100 dark:bg-gray-800/50 dark:text-gray-400'
                } text-gray-600`}
                style={activeTab === index ? { '--tw-ring-color': col.color } : {}}
              >
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: col.color }}
                />
                <span>{col.title}</span>
                <span 
                  className="rounded-full px-1.5 py-0.5 text-xs"
                  style={{ 
                    backgroundColor: activeTab === index ? col.color : 'transparent',
                    color: activeTab === index ? 'white' : 'inherit'
                  }}
                >
                  {(tasksByStatus[col.id] || []).length}
                </span>
              </button>
            ))}
          </div>

          {/* Mobile: Single Column View */}
          <div className="mt-4">
            <KanbanColumn
              id={activeColumn.id}
              title={activeColumn.title}
              color={activeColumn.color}
              tasks={activeTasks}
              projectId={projectId}
              onTaskClick={onTaskClick}
              onAddTask={() => onAddTask(activeColumn.id)}
              showAddButton={activeColumn.id === TASK_STATUSES.TODO}
              swipingTask={swipingTask}
              swipeProgress={swipeProgress}
              swipeDirection={swipeDirection}
              onSwipeStart={handleSwipeStart}
              onSwipeMove={handleSwipeMove}
              onSwipeEnd={handleSwipeEnd}
              prevStatus={activeColumn.prevStatus}
              nextStatus={activeColumn.nextStatus}
              isMobile={true}
              allowReordering={allowReordering}
            />
          </div>
        </div>

        {/* Mobile Drag Overlay */}
        <DragOverlay dropAnimation={null}>
          {activeTask && (
            <div className="w-full max-w-[calc(100vw-32px)]">
              <TaskCard task={activeTask} isDragging isMobile allowReordering={allowReordering} />
            </div>
          )}
        </DragOverlay>
      </DndContext>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
      measuring={{
        droppable: {
          strategy: MeasuringStrategy.Always,
        },
      }}
    >
      {boardContent}

      {/* Drag Overlay for Desktop */}
      <DragOverlay dropAnimation={null}>
        {activeTask && (
          <div className="w-full max-w-sm">
            <TaskCard task={activeTask} isDragging allowReordering={allowReordering} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
