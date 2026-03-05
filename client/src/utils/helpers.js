import { format, isToday, isTomorrow, isPast, parseISO } from 'date-fns';

export function formatDate(date) {
  if (!date) return null;
  
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  
  if (isToday(dateObj)) {
    return 'Today';
  }
  
  if (isTomorrow(dateObj)) {
    return 'Tomorrow';
  }
  
  return format(dateObj, 'MMM d');
}

export function formatDateFull(date) {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, 'MMMM d, yyyy');
}

export function isDueOverdue(date) {
  if (!date) return false;
  
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return isPast(dateObj) && !isToday(dateObj);
}

export function getInitials(name) {
  if (!name) return '?';
  
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function truncate(str, length = 50) {
  if (!str) return '';
  
  if (str.length <= length) return str;
  
  return str.slice(0, length) + '...';
}

export function countCompletedSubtasks(subtasks) {
  if (!subtasks || subtasks.length === 0) return null;
  
  const completed = subtasks.filter((t) => t.status === 'done').length;
  
  return `${completed}/${subtasks.length}`;
}

export function debounce(func, wait) {
  let timeout;
  
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
