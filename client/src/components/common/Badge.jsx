import { cn } from '../../utils/cn';
import { PRIORITY_COLORS } from '../../utils/constants';

export function Badge({ 
  children, 
  variant = 'default', 
  size = 'sm',
  color,
  className,
  ...props 
}) {
  const variants = {
    default: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    high: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    low: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    primary: 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400',
  };

  const sizes = {
    xs: 'px-1.5 py-0.5 text-xs',
    sm: 'px-2 py-1 text-xs',
    md: 'px-2.5 py-1.5 text-sm',
  };

  const style = color ? {
    backgroundColor: `${color}20`,
    color: color,
  } : undefined;

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium',
        variants[variant],
        sizes[size],
        className
      )}
      style={style}
      {...props}
    >
      {children}
    </span>
  );
}

export function PriorityBadge({ priority, showLabel = false }) {
  const labels = {
    high: 'High',
    medium: 'Medium',
    low: 'Low',
  };

  return (
    <Badge 
      variant={priority} 
      size="xs"
      style={{ 
        backgroundColor: `${PRIORITY_COLORS[priority]}20`,
        color: PRIORITY_COLORS[priority],
      }}
    >
      {showLabel ? labels[priority] : null}
    </Badge>
  );
}
