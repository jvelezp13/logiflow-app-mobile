/**
 * Sync Queue Service
 *
 * CRUD operations for sync queue in WatermelonDB.
 */

import { Q } from '@nozbe/watermelondb';
import { database } from './database';
import { SyncQueue, RecordType, SyncAction, QueueStatus } from './models';

/**
 * Create sync queue item data
 */
export type CreateSyncQueueData = {
  recordId: string;
  recordType: RecordType;
  action: SyncAction;
  payload: any; // Will be stringified
  maxRetries?: number;
};

/**
 * Sync Queue Service
 */
export const syncQueueService = {
  /**
   * Add item to sync queue
   */
  async add(data: CreateSyncQueueData): Promise<SyncQueue> {
    try {
      const item = await database.write(async () => {
        return await database.get<SyncQueue>('sync_queue').create((queue) => {
          queue.recordId = data.recordId;
          queue.recordType = data.recordType;
          queue.action = data.action;
          queue.payload = JSON.stringify(data.payload);
          queue.status = 'pending';
          queue.retryCount = 0;
          queue.maxRetries = data.maxRetries ?? 5;
        });
      });

      console.log('[SyncQueueService] Item added:', item.id);
      return item;
    } catch (error) {
      console.error('[SyncQueueService] Add error:', error);
      throw error;
    }
  },

  /**
   * Update sync queue item
   */
  async update(
    itemId: string,
    data: Partial<{
      status: QueueStatus;
      retryCount: number;
      errorMessage: string;
      lastAttemptAt: number;
      completedAt: number;
    }>
  ): Promise<SyncQueue> {
    try {
      const item = await database.get<SyncQueue>('sync_queue').find(itemId);

      const updated = await database.write(async () => {
        return await item.update((queue) => {
          if (data.status !== undefined) queue.status = data.status;
          if (data.retryCount !== undefined) queue.retryCount = data.retryCount;
          if (data.errorMessage !== undefined) queue.errorMessage = data.errorMessage;
          if (data.lastAttemptAt !== undefined) queue.lastAttemptAt = data.lastAttemptAt;
          if (data.completedAt !== undefined) queue.completedAt = data.completedAt;
        });
      });

      console.log('[SyncQueueService] Item updated:', itemId);
      return updated;
    } catch (error) {
      console.error('[SyncQueueService] Update error:', error);
      throw error;
    }
  },

  /**
   * Delete sync queue item
   */
  async delete(itemId: string): Promise<void> {
    try {
      const item = await database.get<SyncQueue>('sync_queue').find(itemId);

      await database.write(async () => {
        await item.markAsDeleted();
      });

      console.log('[SyncQueueService] Item deleted:', itemId);
    } catch (error) {
      console.error('[SyncQueueService] Delete error:', error);
      throw error;
    }
  },

  /**
   * Get pending items
   */
  async getPending(): Promise<SyncQueue[]> {
    try {
      const items = await database
        .get<SyncQueue>('sync_queue')
        .query(Q.where('status', 'pending'), Q.sortBy('created_at', Q.asc))
        .fetch();
      return items;
    } catch (error) {
      console.error('[SyncQueueService] Get pending error:', error);
      return [];
    }
  },

  /**
   * Get failed items that can retry
   */
  async getRetryable(): Promise<SyncQueue[]> {
    try {
      const items = await database
        .get<SyncQueue>('sync_queue')
        .query(Q.where('status', 'failed'), Q.sortBy('last_attempt_at', Q.asc))
        .fetch();

      // Filter items that can retry
      return items.filter((item) => item.canRetry);
    } catch (error) {
      console.error('[SyncQueueService] Get retryable error:', error);
      return [];
    }
  },

  /**
   * Mark item as processing
   */
  async markAsProcessing(itemId: string): Promise<void> {
    try {
      await this.update(itemId, {
        status: 'processing',
        lastAttemptAt: Date.now(),
      });
    } catch (error) {
      console.error('[SyncQueueService] Mark as processing error:', error);
      throw error;
    }
  },

  /**
   * Mark item as completed
   */
  async markAsCompleted(itemId: string): Promise<void> {
    try {
      await this.update(itemId, {
        status: 'completed',
        completedAt: Date.now(),
      });
    } catch (error) {
      console.error('[SyncQueueService] Mark as completed error:', error);
      throw error;
    }
  },

  /**
   * Mark item as failed
   */
  async markAsFailed(itemId: string, errorMessage: string): Promise<void> {
    try {
      const item = await database.get<SyncQueue>('sync_queue').find(itemId);

      await this.update(itemId, {
        status: 'failed',
        errorMessage,
        retryCount: item.retryCount + 1,
        lastAttemptAt: Date.now(),
      });
    } catch (error) {
      console.error('[SyncQueueService] Mark as failed error:', error);
      throw error;
    }
  },

  /**
   * Clean completed items older than specified days
   */
  async cleanCompleted(olderThanDays: number = 7): Promise<number> {
    try {
      const cutoffTime = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;

      const items = await database
        .get<SyncQueue>('sync_queue')
        .query(Q.where('status', 'completed'))
        .fetch();

      const toDelete = items.filter(
        (item) => item.completedAt && item.completedAt < cutoffTime
      );

      await database.write(async () => {
        await Promise.all(toDelete.map((item) => item.markAsDeleted()));
      });

      console.log('[SyncQueueService] Cleaned completed items:', toDelete.length);
      return toDelete.length;
    } catch (error) {
      console.error('[SyncQueueService] Clean completed error:', error);
      return 0;
    }
  },

  /**
   * Get queue statistics
   */
  async getStats(): Promise<{
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    total: number;
  }> {
    try {
      const [pending, processing, completed, failed, total] = await Promise.all([
        database.get<SyncQueue>('sync_queue').query(Q.where('status', 'pending')).fetchCount(),
        database
          .get<SyncQueue>('sync_queue')
          .query(Q.where('status', 'processing'))
          .fetchCount(),
        database
          .get<SyncQueue>('sync_queue')
          .query(Q.where('status', 'completed'))
          .fetchCount(),
        database.get<SyncQueue>('sync_queue').query(Q.where('status', 'failed')).fetchCount(),
        database.get<SyncQueue>('sync_queue').query().fetchCount(),
      ]);

      return { pending, processing, completed, failed, total };
    } catch (error) {
      console.error('[SyncQueueService] Get stats error:', error);
      return { pending: 0, processing: 0, completed: 0, failed: 0, total: 0 };
    }
  },
};
