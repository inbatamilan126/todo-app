import { useState, useEffect } from 'react';
import { Bell, Check, Clock, Trash2 } from 'lucide-react';
import api from '../services/api';
import { Button } from '../components/common/Button';
import { cn } from '../utils/cn';

export function Notifications() {
  const [notifications, setNotifications] = useState({ unread: [], read: [] });
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      const response = await api.get('/notifications');
      const allNotifs = response.data.notifications || [];
      
      setNotifications({
        unread: allNotifs.filter(n => !n.read),
        read: allNotifs.filter(n => n.read)
      });
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const toggleReadStatus = async (id) => {
    try {
      await api.put(`/notifications/${id}/toggle-read`);
      await fetchNotifications(); // Refresh to move it
    } catch (error) {
      console.error('Failed to toggle read status:', error);
    }
  };

  const markAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      await fetchNotifications();
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const archiveNotification = async (id) => {
    try {
      await api.put(`/notifications/${id}/archive`);
      await fetchNotifications();
    } catch (error) {
      console.error('Failed to archive notification:', error);
    }
  };

  const NotificationCard = ({ notif, isUnread }) => (
    <div className={cn(
      "flex items-start justify-between rounded-lg p-4 transition-all duration-200 border",
      isUnread 
        ? "bg-primary-50 border-primary-100 dark:bg-primary-900/10 dark:border-primary-900/30 shadow-sm"
        : "bg-white border-gray-100 dark:bg-gray-800 dark:border-gray-700"
    )}>
      <div className="flex gap-4">
        <div className={cn(
          "mt-1 rounded-full p-2 h-10 w-10 flex items-center justify-center shrink-0",
          isUnread ? "bg-primary-100 text-primary-600 dark:bg-primary-900/50 dark:text-primary-400" : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
        )}>
          <Bell className="h-5 w-5" />
        </div>
        <div>
          <h4 className={cn(
            "font-semibold text-gray-900 dark:text-gray-100",
            !isUnread && "font-medium text-gray-700 dark:text-gray-300"
          )}>{notif.title}</h4>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {notif.message}
          </p>
          <div className="mt-2 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <Clock className="h-3.5 w-3.5" />
            {new Date(notif.createdAt).toLocaleString(undefined, {
              month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
            })}
          </div>
        </div>
      </div>
      
      <div className="flex flex-col gap-2 shrink-0">
        <button
          onClick={() => toggleReadStatus(notif.id)}
          className={cn(
            "rounded-md p-2 transition-colors",
            isUnread 
              ? "text-primary-600 hover:bg-primary-200/50 dark:hover:bg-primary-800" 
              : "text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
          )}
          title={isUnread ? "Mark as read" : "Mark as unread"}
        >
          <Check className={cn("h-5 w-5", !isUnread && "opacity-50")} />
        </button>
        
        {!isUnread && (
          <button
            onClick={() => archiveNotification(notif.id)}
            className="rounded-md p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors dark:hover:bg-red-900/20"
            title="Archive (Hide)"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );

  if (loading) return (
    <div className="flex h-64 items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
    </div>
  );

  return (
    <div className="mx-auto max-w-3xl py-6 px-4 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Notifications
        </h1>
        {notifications.unread.length > 0 && (
          <Button variant="ghost" className="text-sm" onClick={markAllRead}>
            Mark all as read
          </Button>
        )}
      </div>

      <div className="space-y-8">
        {/* Unread Section */}
        <section>
          <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-2">
            Unread <span className="rounded-full bg-primary-100 px-2 py-0.5 text-[10px] text-primary-700 dark:bg-primary-900/50 dark:text-primary-400">{notifications.unread.length}</span>
          </h2>
          
          {notifications.unread.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center dark:border-gray-800 flex flex-col items-center">
              <div className="rounded-full bg-gray-50 p-3 dark:bg-slate-800 mb-3">
                 <Bell className="h-6 w-6 text-gray-400 dark:text-gray-500" />
              </div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                You're all caught up!
              </p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                 No new notifications to review.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.unread.map(notif => (
                <NotificationCard key={notif.id} notif={notif} isUnread={true} />
              ))}
            </div>
          )}
        </section>

        {/* Read Section */}
        {notifications.read.length > 0 && (
          <section className="pt-4">
            <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Earlier
            </h2>
            <div className="space-y-3 opacity-90">
              {notifications.read.map(notif => (
                <NotificationCard key={notif.id} notif={notif} isUnread={false} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
