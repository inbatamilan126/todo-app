import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { cn } from '../utils/cn';
import { pushService } from '../services/pushService';

export function Settings() {
  const { user, updateUser, updateTheme, updatePreferences } = useAuth();
  const { theme, setTheme } = useTheme();

  const [name, setName] = useState(user?.name || '');
  
  // Update name when user changes
  useEffect(() => {
    if (user?.name) {
      setName(user.name);
    }
  }, [user]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const handleSaveProfile = async () => {
    setSaving(true);
    setMessage('');
    try {
      // In a real app, this would call the API
      setMessage('Profile updated successfully');
    } catch (error) {
      setMessage('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [permissionResult, setPermissionResult] = useState(null);

  const handlePushToggle = async () => {
    setNotificationsLoading(true);
    try {
      const isCurrentlyEnabled = user.pushEnabled;
      
      if (!isCurrentlyEnabled) {
        // User wants to enable notifications
        const permission = await Notification.requestPermission();
        console.log('Notification permission result:', permission);
        
        if (permission === 'granted') {
          // Wait for service worker with a timeout
          const swReady = await Promise.race([
            navigator.serviceWorker.ready,
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Service worker not available. Please reload the page and try again.')), 5000)
            )
          ]);
          console.log('Service worker registration ready:', swReady);
          
          // Get VAPID key and subscribe
          const vapidKey = await pushService.getVapidKey();
          const convertedVapidKey = pushService.urlBase64ToUint8Array(vapidKey);
          
          const subscription = await swReady.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: convertedVapidKey
          });

          // Send to backend
          await pushService.subscribe(subscription);
          
          // Update user preference in DB
          await updatePreferences({ pushEnabled: true });
          console.log('Push enabled successfully');
        } else {
          alert('Notification permission was denied by the browser. Please enable it in your browser settings.');
        }
      } else {
        // User wants to disable notifications
        try {
          const swReady = await Promise.race([
            navigator.serviceWorker.ready,
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('SW timeout')), 3000)
            )
          ]);
          const subscription = await swReady.pushManager.getSubscription();
          if (subscription) {
            await pushService.unsubscribe(subscription.endpoint);
            await subscription.unsubscribe();
          }
        } catch (swError) {
          console.warn('Could not clean up push subscription:', swError);
        }
        await updatePreferences({ pushEnabled: false });
        console.log('Push disabled successfully');
      }
    } catch (error) {
      console.error('Failed to toggle notifications:', error);
      alert(error.message || 'Failed to configure notifications.');
    } finally {
      setNotificationsLoading(false);
    }
  };

  const handleReminderChange = async (minutes) => {
    try {
      await updatePreferences({ defaultReminderMinutes: Number(minutes) });
    } catch (error) {
      console.error('Failed to update reminder settings', error);
    }
  };

  const handleThemeChange = async (newTheme) => {
    setTheme(newTheme);
    try {
      await updateTheme(newTheme);
    } catch (error) {
      console.error('Failed to save theme preference');
    }
  };

  const themeOptions = [
    { value: 'light', label: 'Light', description: 'Always use light mode' },
    { value: 'dark', label: 'Dark', description: 'Always use dark mode' },
    { value: 'system', label: 'System', description: 'Follow system preference' },
  ];

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold text-gray-900 dark:text-gray-100">
        Settings
      </h1>

      {/* Profile Section */}
      <section className="mb-8 rounded-xl bg-white p-6 shadow-sm dark:bg-gray-800">
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
          Profile
        </h2>

        <div className="space-y-4">
          <Input
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <Input
            label="Email"
            value={user?.email || ''}
            disabled
            className="bg-gray-50 dark:bg-gray-900"
          />

          <div className="flex items-center gap-4">
            <Button onClick={handleSaveProfile} loading={saving}>
              Save Changes
            </Button>
            {message && (
              <span
                className={cn(
                  'text-sm',
                  message.includes('success')
                    ? 'text-green-600'
                    : 'text-red-600'
                )}
              >
                {message}
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Theme Section */}
      <section className="mb-8 rounded-xl bg-white p-6 shadow-sm dark:bg-gray-800">
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
          Appearance
        </h2>

        <div className="space-y-2">
          {themeOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => handleThemeChange(option.value)}
              className={cn(
                'flex w-full items-center justify-between rounded-lg border-2 p-4 transition-all',
                theme === option.value
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
              )}
            >
              <div className="text-left">
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  {option.label}
                </p>
                <p className="text-sm text-gray-500">{option.description}</p>
              </div>
              {theme === option.value && (
                <div className="h-4 w-4 rounded-full bg-primary-500" />
              )}
            </button>
          ))}
        </div>
      </section>

      {/* Notifications Section */}
      <section className="mb-8 rounded-xl bg-white p-6 shadow-sm dark:bg-gray-800">
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
          Notifications & Reminders
        </h2>

        <div className="space-y-6">
          {/* Push Web Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-gray-900 dark:text-gray-100">Push Notifications</h3>
              <p className="text-sm text-gray-500">Receive reminders even when the app is closed.</p>
            </div>
            <button
              onClick={handlePushToggle}
              disabled={notificationsLoading}
              className={cn(
                'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50',
                user?.pushEnabled ? 'bg-primary-500' : 'bg-gray-200 dark:bg-gray-700'
              )}
            >
              <span
                className={cn(
                  'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                  user?.pushEnabled ? 'translate-x-5' : 'translate-x-0'
                )}
              />
            </button>
          </div>

          {/* Default Reminder Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Default Task Reminder
            </label>
            <select
              value={user?.defaultReminderMinutes || 30}
              onChange={(e) => handleReminderChange(e.target.value)}
              className="block w-full rounded-lg border-gray-300 bg-gray-50 py-2 pl-3 pr-10 text-base focus:border-primary-500 focus:outline-none focus:ring-primary-500 sm:text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value={0}>At time of event (0 min)</option>
              <option value={5}>5 minutes before</option>
              <option value={15}>15 minutes before</option>
              <option value={30}>30 minutes before</option>
              <option value={60}>1 hour before</option>
              <option value={1440}>1 day before</option>
            </select>
            <p className="mt-2 text-sm text-gray-500">
              When you add a time to a task, we will automatically set a reminder for this far in advance.
            </p>
          </div>
        </div>
      </section>

      {/* Account Section */}
      <section className="rounded-xl bg-white p-6 shadow-sm dark:bg-gray-800">
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
          Account
        </h2>

        <div className="rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
          <h3 className="font-medium text-red-900 dark:text-red-400">
            Danger Zone
          </h3>
          <p className="mt-1 text-sm text-red-700 dark:text-red-300">
            Once you delete your account, there is no going back. Please be
            certain.
          </p>
          <Button
            variant="danger"
            size="sm"
            className="mt-4"
            onClick={() => {
              if (window.confirm('Are you sure? This cannot be undone.')) {
                // Handle account deletion
              }
            }}
          >
            Delete Account
          </Button>
        </div>
      </section>
    </div>
  );
}
