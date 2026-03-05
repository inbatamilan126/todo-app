import { useState, useEffect, useRef } from 'react';
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, startOfMonth, endOfMonth } from 'date-fns';
import { Calendar as CalendarIcon, X } from 'lucide-react';
import { cn } from '../../utils/cn';

export function DatePicker({ value, onChange, label, minDate }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(value ? new Date(value) : null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const containerRef = useRef(null);

  useEffect(() => {
    if (value) {
      setSelectedDate(new Date(value));
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const quickOptions = [
    { label: 'Today', date: new Date() },
    { label: 'Tomorrow', date: addDays(new Date(), 1) },
    { label: 'Next Week', date: addDays(new Date(), 7) },
  ];

  // Get all days needed to display (from first day of first week to last day of last week)
  const firstDayOfMonth = startOfMonth(currentMonth);
  const lastDayOfMonth = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(firstDayOfMonth);
  const calendarEnd = endOfWeek(lastDayOfMonth);
  const daysInMonth = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const handleDateSelect = (date) => {
    setSelectedDate(date);
    onChange?.(date.toISOString());
    setIsOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    setSelectedDate(null);
    onChange?.(null);
    setIsOpen(false);
  };

  return (
    <div className="w-full" ref={containerRef}>
      {label && (
        <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            'input flex w-full items-center justify-between',
            selectedDate ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400'
          )}
        >
          <span className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4" />
            {selectedDate ? format(selectedDate, 'MMM d, yyyy') : 'Select date'}
          </span>
          {selectedDate && (
            <X
              className="h-4 w-4 text-gray-400 hover:text-gray-600"
              onClick={handleClear}
            />
          )}
        </button>

        {isOpen && (
          <div 
            className="absolute left-0 top-full z-50 mt-1 w-72 rounded-lg border border-gray-200 bg-white p-3 shadow-lg dark:border-gray-700 dark:bg-gray-800"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Quick options */}
            <div className="mb-3 flex gap-2">
              {quickOptions.map((option) => (
                <button
                  key={option.label}
                  type="button"
                  onClick={() => handleDateSelect(option.date)}
                  className="rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                >
                  {option.label}
                </button>
              ))}
            </div>

            {/* Month navigation */}
            <div className="mb-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setCurrentMonth(addDays(currentMonth, -30))}
                className="rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                ←
              </button>
              <span className="text-sm font-medium">
                {format(currentMonth, 'MMMM yyyy')}
              </span>
              <button
                type="button"
                onClick={() => setCurrentMonth(addDays(currentMonth, 30))}
                className="rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                →
              </button>
            </div>

            {/* Day headers */}
            <div className="mb-1 grid grid-cols-7 gap-1 text-center">
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
                <div key={day} className="text-xs font-medium text-gray-500">
                  {day}
                </div>
              ))}
            </div>

            {/* Days - always show 6 weeks */}
            <div className="grid grid-cols-7 gap-1">
              {daysInMonth.map((day, index) => {
                const isSelected = selectedDate && isSameDay(day, selectedDate);
                const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
                const isDisabled = minDate && day < minDate;
                const isToday = isSameDay(day, new Date());

                return (
                  <button
                    key={index}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => !isDisabled && handleDateSelect(day)}
                    className={cn(
                      'rounded p-1 text-sm',
                      isSelected && 'bg-primary-600 text-white',
                      !isSelected && isCurrentMonth && !isDisabled && 'hover:bg-gray-100 dark:hover:bg-gray-700',
                      !isSelected && !isCurrentMonth && 'text-gray-300 dark:text-gray-600',
                      isDisabled && 'cursor-not-allowed opacity-50',
                      isToday && !isSelected && isCurrentMonth && 'font-bold text-primary-600'
                    )}
                  >
                    {format(day, 'd')}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
