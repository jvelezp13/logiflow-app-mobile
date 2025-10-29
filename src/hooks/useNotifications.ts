/**
 * useNotifications Hook
 *
 * Manage notifications permissions and reminders.
 */

import { useState, useEffect, useCallback } from 'react';
import { notificationsService, type ScheduledReminder } from '@services/notifications';

/**
 * Hook to manage notifications
 *
 * @returns Notification controls and state
 */
export const useNotifications = () => {
  const [hasPermission, setHasPermission] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [reminders, setReminders] = useState<ScheduledReminder[]>([]);

  /**
   * Load reminders on mount
   */
  useEffect(() => {
    loadReminders();
  }, []);

  /**
   * Load reminders and check permissions
   */
  const loadReminders = useCallback(async () => {
    try {
      setIsLoading(true);

      const [enabled, savedReminders] = await Promise.all([
        notificationsService.areEnabled(),
        notificationsService.getReminders(),
      ]);

      setHasPermission(enabled);
      setReminders(savedReminders);
    } catch (error) {
      console.error('[useNotifications] Load error:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Request notification permissions
   */
  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const granted = await notificationsService.requestPermissions();
      setHasPermission(granted);
      return granted;
    } catch (error) {
      console.error('[useNotifications] Request permission error:', error);
      return false;
    }
  }, []);

  /**
   * Update reminder
   */
  const updateReminder = useCallback(
    async (
      type: 'clock_in' | 'clock_out',
      hour: number,
      minute: number,
      enabled: boolean
    ): Promise<void> => {
      try {
        await notificationsService.updateReminder(type, hour, minute, enabled);
        await loadReminders();
      } catch (error) {
        console.error('[useNotifications] Update reminder error:', error);
      }
    },
    [loadReminders]
  );

  /**
   * Get reminder by type
   */
  const getReminderByType = useCallback(
    (type: 'clock_in' | 'clock_out'): ScheduledReminder | undefined => {
      return reminders.find((r) => r.type === type);
    },
    [reminders]
  );

  /**
   * Send test notification
   */
  const sendTestNotification = useCallback(async (): Promise<void> => {
    try {
      await notificationsService.sendTestNotification();
    } catch (error) {
      console.error('[useNotifications] Test notification error:', error);
    }
  }, []);

  /**
   * Cancel all notifications
   */
  const cancelAll = useCallback(async (): Promise<void> => {
    try {
      await notificationsService.cancelAllNotifications();
      setReminders([]);
    } catch (error) {
      console.error('[useNotifications] Cancel all error:', error);
    }
  }, []);

  return {
    hasPermission,
    isLoading,
    reminders,
    requestPermission,
    updateReminder,
    getReminderByType,
    sendTestNotification,
    cancelAll,
    reload: loadReminders,
  };
};
