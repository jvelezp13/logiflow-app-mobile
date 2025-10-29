/**
 * Notifications Service
 *
 * Handle local notifications for attendance reminders.
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NOTIFICATION_CONFIG } from '@constants/config';

/**
 * Scheduled reminder
 */
export type ScheduledReminder = {
  id: string;
  type: 'clock_in' | 'clock_out';
  hour: number;
  minute: number;
  enabled: boolean;
};

/**
 * Storage key for reminders
 */
const REMINDERS_KEY = '@attendance_reminders';

/**
 * Configure notification handler
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: NOTIFICATION_CONFIG.sound,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Notifications Service
 */
export const notificationsService = {
  /**
   * Request notification permissions
   */
  async requestPermissions(): Promise<boolean> {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('[Notifications] Permission not granted');
        return false;
      }

      // Configure notification channel for Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync(NOTIFICATION_CONFIG.channelId, {
          name: NOTIFICATION_CONFIG.channelName,
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#4CAF50',
          sound: 'default',
        });
      }

      return true;
    } catch (error) {
      console.error('[Notifications] Request permissions error:', error);
      return false;
    }
  },

  /**
   * Check if notifications are enabled
   */
  async areEnabled(): Promise<boolean> {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('[Notifications] Check enabled error:', error);
      return false;
    }
  },

  /**
   * Schedule daily reminder
   */
  async scheduleReminder(
    type: 'clock_in' | 'clock_out',
    hour: number,
    minute: number
  ): Promise<string | null> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        return null;
      }

      const title = type === 'clock_in' ? '⏰ Hora de marcar entrada' : '⏰ Hora de marcar salida';
      const body =
        type === 'clock_in'
          ? 'Recuerda marcar tu entrada'
          : 'Recuerda marcar tu salida';

      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: NOTIFICATION_CONFIG.sound ? 'default' : undefined,
          priority: Notifications.AndroidNotificationPriority.MAX,
          categoryIdentifier: 'attendance_reminder',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour,
          minute,
        },
      });

      console.log(`[Notifications] Scheduled ${type} reminder at ${hour}:${minute}, ID: ${id}`);
      return id;
    } catch (error) {
      console.error('[Notifications] Schedule reminder error:', error);
      return null;
    }
  },

  /**
   * Cancel notification
   */
  async cancelNotification(notificationId: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      console.log('[Notifications] Cancelled notification:', notificationId);
    } catch (error) {
      console.error('[Notifications] Cancel notification error:', error);
    }
  },

  /**
   * Cancel all notifications
   */
  async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('[Notifications] Cancelled all notifications');
    } catch (error) {
      console.error('[Notifications] Cancel all error:', error);
    }
  },

  /**
   * Get all scheduled notifications
   */
  async getAllScheduled(): Promise<Notifications.NotificationRequest[]> {
    try {
      const notifications = await Notifications.getAllScheduledNotificationsAsync();
      return notifications;
    } catch (error) {
      console.error('[Notifications] Get all scheduled error:', error);
      return [];
    }
  },

  /**
   * Save reminders configuration
   */
  async saveReminders(reminders: ScheduledReminder[]): Promise<void> {
    try {
      await AsyncStorage.setItem(REMINDERS_KEY, JSON.stringify(reminders));
      console.log('[Notifications] Saved reminders:', reminders.length);
    } catch (error) {
      console.error('[Notifications] Save reminders error:', error);
    }
  },

  /**
   * Get reminders configuration
   */
  async getReminders(): Promise<ScheduledReminder[]> {
    try {
      const data = await AsyncStorage.getItem(REMINDERS_KEY);
      if (!data) {
        return [];
      }
      return JSON.parse(data);
    } catch (error) {
      console.error('[Notifications] Get reminders error:', error);
      return [];
    }
  },

  /**
   * Update reminder
   */
  async updateReminder(
    type: 'clock_in' | 'clock_out',
    hour: number,
    minute: number,
    enabled: boolean
  ): Promise<void> {
    try {
      // Get current reminders
      const reminders = await this.getReminders();

      // Find existing reminder
      const existingIndex = reminders.findIndex((r) => r.type === type);

      if (existingIndex >= 0) {
        const existing = reminders[existingIndex];

        // Cancel old notification
        if (existing.id) {
          await this.cancelNotification(existing.id);
        }

        // Schedule new if enabled
        if (enabled) {
          const id = await this.scheduleReminder(type, hour, minute);
          reminders[existingIndex] = { id: id || '', type, hour, minute, enabled };
        } else {
          reminders[existingIndex] = { ...existing, enabled: false };
        }
      } else {
        // Create new reminder
        if (enabled) {
          const id = await this.scheduleReminder(type, hour, minute);
          reminders.push({ id: id || '', type, hour, minute, enabled });
        }
      }

      // Save updated reminders
      await this.saveReminders(reminders);
    } catch (error) {
      console.error('[Notifications] Update reminder error:', error);
    }
  },

  /**
   * Send immediate test notification
   */
  async sendTestNotification(): Promise<void> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        return;
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: '✅ Notificaciones habilitadas',
          body: 'Las notificaciones están funcionando correctamente',
          sound: NOTIFICATION_CONFIG.sound ? 'default' : undefined,
        },
        trigger: null, // Immediate
      });

      console.log('[Notifications] Test notification sent');
    } catch (error) {
      console.error('[Notifications] Send test notification error:', error);
    }
  },
};
