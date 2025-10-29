/**
 * App Configuration
 *
 * General application configuration and constants.
 */

export const APP_CONFIG = {
  name: process.env.EXPO_PUBLIC_APP_NAME || 'Control Horarios',
  version: process.env.EXPO_PUBLIC_APP_VERSION || '1.0.0',
  environment: (process.env.EXPO_PUBLIC_ENV as 'development' | 'staging' | 'production') || 'development',
} as const;

/**
 * API Configuration
 */
export const API_CONFIG = {
  timeout: 30000, // 30 seconds
  retryAttempts: 3,
  retryDelay: 1000, // 1 second base delay (exponential backoff)
} as const;

/**
 * Sync Configuration
 */
export const SYNC_CONFIG = {
  autoSyncInterval: 30000, // 30 seconds (when there are pending records)
  idleSyncInterval: 3600000, // 1 hour (when there are no pending records)
  maxRetries: 5,
  batchSize: 10, // Records per batch
  photoMaxSize: 2 * 1024 * 1024, // 2MB
  photoQuality: 0.7, // JPEG quality (0-1)
} as const;

/**
 * Camera Configuration
 */
export const CAMERA_CONFIG = {
  quality: 0.7,
  allowsEditing: false,
  aspect: [4, 3] as [number, number],
  exif: false, // Don't include EXIF data for privacy
} as const;

/**
 * Notification Configuration
 */
export const NOTIFICATION_CONFIG = {
  channelId: 'attendance-reminders',
  channelName: 'Recordatorios de Asistencia',
  importance: 4, // Max importance
  sound: true,
  vibrate: true,
} as const;

/**
 * Storage Keys
 */
export const STORAGE_KEYS = {
  AUTH_TOKEN: '@auth_token',
  USER_DATA: '@user_data',
  SETTINGS: '@settings',
  SYNC_QUEUE: '@sync_queue',
  LAST_SYNC: '@last_sync',
} as const;

/**
 * Date/Time Formats
 */
export const DATE_FORMATS = {
  date: 'yyyy-MM-dd', // Database format
  dateDisplay: 'dd/MM/yyyy', // User display
  time: 'HH:mm:ss', // Database format
  timeDisplay: 'HH:mm', // User display
  datetime: 'yyyy-MM-dd HH:mm:ss',
  datetimeDisplay: 'dd/MM/yyyy HH:mm',
} as const;
