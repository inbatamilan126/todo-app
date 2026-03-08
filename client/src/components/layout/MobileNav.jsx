import { NavLink } from 'react-router-dom';
import { Home, Sun, Calendar, Plus, User } from 'lucide-react';
import { cn } from '../../utils/cn';

const navItems = [
  { to: '/today', icon: Sun, label: 'Today' },
  { to: '/dashboard', icon: Home, label: 'All Projects' },
  { to: '/calendar', icon: Calendar, label: 'Calendar' },
];

export function MobileNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around border-t border-gray-200 bg-white pb-safe dark:border-gray-800 dark:bg-gray-900 lg:hidden">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            cn(
              'flex flex-col items-center gap-1 p-2',
              isActive
                ? 'text-primary-600 dark:text-primary-400'
                : 'text-gray-500 dark:text-gray-400'
            )
          }
        >
          <item.icon className="h-5 w-5" />
          <span className="text-xs">{item.label}</span>
        </NavLink>
      ))}
      <button
        onClick={() => window.dispatchEvent(new CustomEvent('open-new-task-modal'))}
        className="flex -mt-6 flex-col items-center gap-1 p-2 text-gray-500 dark:text-gray-400"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-600 text-white shadow-lg shadow-primary-600/30">
          <Plus className="h-6 w-6" />
        </div>
        <span className="text-xs">Add</span>
      </button>
    </nav>
  );
}
