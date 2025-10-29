/**
 * WatermelonDB Schema
 *
 * Defines the local SQLite database schema for offline storage.
 */

import { appSchema, tableSchema } from '@nozbe/watermelondb';

/**
 * Database schema version 2
 * v2: Added kiosk_pin field for kiosk mode uploads
 */
export const schema = appSchema({
  version: 2,
  tables: [
    /**
     * Attendance Records Table
     * Stores clock in/out events locally before syncing to Supabase
     */
    tableSchema({
      name: 'attendance_records',
      columns: [
        { name: 'user_id', type: 'string' },
        { name: 'user_cedula', type: 'string' },
        { name: 'user_name', type: 'string' },
        { name: 'kiosk_pin', type: 'string', isOptional: true }, // For kiosk mode uploads
        { name: 'attendance_type', type: 'string' }, // 'clock_in' | 'clock_out'
        { name: 'timestamp', type: 'number' }, // Unix timestamp
        { name: 'date', type: 'string' }, // YYYY-MM-DD format
        { name: 'time', type: 'string' }, // HH:mm:ss format
        { name: 'time_decimal', type: 'number' }, // Decimal hours (e.g., 14.5 = 14:30)
        { name: 'photo_uri', type: 'string', isOptional: true },
        { name: 'photo_base64', type: 'string', isOptional: true },
        { name: 'photo_uploaded', type: 'boolean' },
        { name: 'photo_url', type: 'string', isOptional: true }, // Supabase Storage URL after upload
        { name: 'observations', type: 'string', isOptional: true },
        { name: 'latitude', type: 'number', isOptional: true },
        { name: 'longitude', type: 'number', isOptional: true },
        { name: 'sync_status', type: 'string' }, // 'pending' | 'syncing' | 'synced' | 'error'
        { name: 'sync_error', type: 'string', isOptional: true },
        { name: 'sync_attempts', type: 'number' },
        { name: 'synced_at', type: 'number', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),

    /**
     * Sync Queue Table
     * Manages pending synchronization operations
     */
    tableSchema({
      name: 'sync_queue',
      columns: [
        { name: 'record_id', type: 'string' }, // ID of the record to sync
        { name: 'record_type', type: 'string' }, // 'attendance_record'
        { name: 'action', type: 'string' }, // 'create' | 'update' | 'delete'
        { name: 'payload', type: 'string' }, // JSON stringified payload
        { name: 'status', type: 'string' }, // 'pending' | 'processing' | 'completed' | 'failed'
        { name: 'retry_count', type: 'number' },
        { name: 'max_retries', type: 'number' },
        { name: 'error_message', type: 'string', isOptional: true },
        { name: 'last_attempt_at', type: 'number', isOptional: true },
        { name: 'completed_at', type: 'number', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
  ],
});
