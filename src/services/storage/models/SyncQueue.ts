/**
 * SyncQueue Model
 *
 * WatermelonDB model for managing synchronization queue.
 */

import { Model } from '@nozbe/watermelondb';
import { field, readonly, date } from '@nozbe/watermelondb/decorators';

/**
 * Record type enum
 */
export type RecordType = 'attendance_record';

/**
 * Sync action enum
 */
export type SyncAction = 'create' | 'update' | 'delete';

/**
 * Queue status enum
 */
export type QueueStatus = 'pending' | 'processing' | 'completed' | 'failed';

/**
 * SyncQueue model class
 *
 * Represents a pending synchronization operation
 */
export class SyncQueue extends Model {
  static table = 'sync_queue';

  // Record Information
  @field('record_id') recordId!: string;
  @field('record_type') recordType!: RecordType;
  @field('action') action!: SyncAction;
  @field('payload') payload!: string; // JSON stringified

  // Queue Status
  @field('status') status!: QueueStatus;
  @field('retry_count') retryCount!: number;
  @field('max_retries') maxRetries!: number;
  @field('error_message') errorMessage?: string;
  @field('last_attempt_at') lastAttemptAt?: number;
  @field('completed_at') completedAt?: number;

  // Timestamps
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  /**
   * Check if can retry
   */
  get canRetry(): boolean {
    return this.retryCount < this.maxRetries && this.status === 'failed';
  }

  /**
   * Check if is pending
   */
  get isPending(): boolean {
    return this.status === 'pending';
  }

  /**
   * Check if is completed
   */
  get isCompleted(): boolean {
    return this.status === 'completed';
  }

  /**
   * Check if is failed
   */
  get isFailed(): boolean {
    return this.status === 'failed';
  }

  /**
   * Get parsed payload
   */
  get parsedPayload(): any {
    try {
      return JSON.parse(this.payload);
    } catch (error) {
      console.error('[SyncQueue] Failed to parse payload:', error);
      return null;
    }
  }

  /**
   * Get retry delay in milliseconds
   * Uses exponential backoff: 1s, 2s, 4s, 8s, etc.
   */
  get retryDelay(): number {
    return Math.min(1000 * Math.pow(2, this.retryCount), 30000); // Max 30 seconds
  }
}
