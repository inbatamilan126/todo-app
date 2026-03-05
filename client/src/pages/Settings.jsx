import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { cn } from '../utils/cn';

export function Settings() {
  const { user, updateUser, updateTheme } = useAuth();
  const { theme, setTheme } = useTheme();

  const [name, setName] = useState(user?.name || '');
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
