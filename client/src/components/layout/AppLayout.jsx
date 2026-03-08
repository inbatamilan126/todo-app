import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { MobileNav } from './MobileNav';
import { TaskModal } from '../task/TaskModal';

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  useEffect(() => {
    const handleOpenTaskModal = () => setIsTaskModalOpen(true);
    window.addEventListener('open-new-task-modal', handleOpenTaskModal);
    return () => window.removeEventListener('open-new-task-modal', handleOpenTaskModal);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Desktop sidebar - always visible on lg screens */}
      <div className="hidden lg:block lg:fixed lg:inset-y-0 lg:left-0 lg:w-64 lg:z-30">
        <Sidebar isOpen={true} onClose={() => {}} />
      </div>

      {/* Mobile sidebar - slide out drawer */}
      <div className="lg:hidden">
        <Sidebar 
          isOpen={sidebarOpen} 
          onClose={() => setSidebarOpen(false)} 
        />
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="min-h-screen lg:pl-64">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        
        <main className="p-4 pb-20 lg:pb-4">
          <Outlet />
        </main>
      </div>

      <MobileNav />

      <TaskModal 
        isOpen={isTaskModalOpen} 
        onClose={() => setIsTaskModalOpen(false)} 
      />
    </div>
  );
}
