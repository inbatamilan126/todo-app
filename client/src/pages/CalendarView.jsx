import { useState, useEffect } from 'react';
import api from '../services/api';
import { TaskModal } from '../components/task/TaskModal';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths,
  isToday,
  isPast
} from 'date-fns';

export function CalendarView() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchAllTasks = async () => {
    try {
      const response = await api.get('/tasks');
      setTasks(response.data.tasks);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllTasks();
  }, []);

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);
  
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  const handleTaskClick = (e, task) => {
    e.stopPropagation();
    setSelectedTask(task);
    setIsModalOpen(true);
  };

  const handleDayClick = (day) => {
    setSelectedDate(day);
    setSelectedTask(null);
    setIsModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <header className="mb-6 flex shrink-0 items-center justify-between px-4 sm:px-6 lg:px-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Calendar</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">View tasks across all projects.</p>
        </div>
        
        <div className="flex items-center gap-4">
          <button onClick={prevMonth} className="rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-800">
            <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </button>
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 w-32 text-center">
            {format(currentDate, 'MMMM yyyy')}
          </span>
          <button onClick={nextMonth} className="rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-800">
            <ChevronRight className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-auto px-4 sm:px-6 lg:px-8 pb-4">
        {/* Desktop Grid View */}
        <div className="hidden lg:flex min-w-[700px] h-full rounded-lg bg-white border border-gray-200 shadow-sm dark:bg-gray-800 dark:border-gray-700 flex-col">
          {/* Days of Week Header */}
          <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="py-2 text-center text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                {day}
              </div>
            ))}
          </div>
          
          {/* Calendar Grid */}
          <div className="grid flex-1 grid-cols-7 grid-rows-5 lg:grid-rows-6">
            {calendarDays.map((day, idx) => {
              const dayTasks = tasks.filter(t => t.dueDate && isSameDay(new Date(t.dueDate), day));
              const isCurrentMonth = isSameMonth(day, monthStart);
              const isTodayDate = isToday(day);

              return (
                <div 
                  key={day.toString()} 
                  onClick={() => handleDayClick(day)}
                  className={`border-b border-r border-gray-100 dark:border-gray-700/50 p-2 min-h-[100px] transition-colors cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/60 ${
                    !isCurrentMonth ? 'bg-gray-50/50 dark:bg-gray-800/20' : ''
                  } ${idx % 7 === 6 ? 'border-r-0' : ''}`}
                >
                  <div className="flex justify-end mb-1">
                    <span 
                      className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                        isTodayDate 
                          ? 'bg-primary-600 text-white' 
                          : isCurrentMonth 
                            ? 'text-gray-700 dark:text-gray-300' 
                            : 'text-gray-400 dark:text-gray-600'
                      }`}
                    >
                      {format(day, 'd')}
                    </span>
                  </div>
                  
                  <div className="space-y-1 max-h-[80px] overflow-y-auto no-scrollbar">
                    {dayTasks.map(task => (
                      <button
                        key={task.id}
                        onClick={(e) => handleTaskClick(e, task)}
                        className="w-full text-left flex items-center gap-1.5 rounded bg-gray-100 px-1.5 py-1 text-xs hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600"
                        title={task.title}
                      >
                        <span 
                          className="h-1.5 w-1.5 rounded-full flex-shrink-0" 
                          style={{ backgroundColor: task.project?.color || '#ccc' }}
                        />
                        <span className="truncate text-gray-700 dark:text-gray-300 font-medium">
                          {task.title}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Mobile List View */}
        <div className="flex lg:hidden flex-col gap-4 pb-20">
          {calendarDays.filter(day => {
            return isSameMonth(day, monthStart);
          }).map(day => {
            const dayTasks = tasks.filter(t => t.dueDate && isSameDay(new Date(t.dueDate), day));
            const isTodayDate = isToday(day);
            const isPastDate = isPast(day) && !isTodayDate;
            
            return (
              <div key={day.toString()} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                <div className="mb-3 flex items-center justify-between border-b border-gray-100 pb-2 dark:border-gray-700">
                  <div className="flex items-center gap-2">
                    <span 
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                        isTodayDate 
                          ? 'bg-primary-600 text-white' 
                          : 'bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400'
                      }`}
                    >
                      {format(day, 'd')}
                    </span>
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {format(day, 'EEEE')}
                    </span>
                  </div>
                  <button 
                    onClick={() => handleDayClick(day)}
                    className="text-xs font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-400"
                  >
                    + Add Task
                  </button>
                </div>
                
                {dayTasks.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 italic">No tasks scheduled.</p>
                ) : (
                  <div className="space-y-2">
                    {dayTasks.map(task => (
                      <button
                        key={task.id}
                        onClick={(e) => handleTaskClick(e, task)}
                        className={`w-full text-left flex items-start gap-2 rounded-lg border border-gray-100 p-2.5 transition active:scale-[0.98] ${
                          isPastDate && task.status !== 'done' ? 'bg-red-50/50 dark:bg-red-900/10' : 'bg-gray-50 dark:bg-gray-800/50'
                        } dark:border-gray-700`}
                      >
                       <span 
                          className="mt-0.5 h-2.5 w-2.5 rounded-full flex-shrink-0" 
                          style={{ backgroundColor: task.project?.color || '#ccc' }}
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 leading-tight">
                            {task.title}
                          </p>
                          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                            {task.project?.name || 'No Project'}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <TaskModal
        task={selectedTask}
        isOpen={isModalOpen}
        defaultDueDate={selectedDate}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedTask(null);
          fetchAllTasks();
        }}
      />
    </div>
  );
}
