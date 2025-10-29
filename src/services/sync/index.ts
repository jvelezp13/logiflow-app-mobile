/**
 * Sync Service
 *
 * Export sync service and events.
 */

export {
  syncService,
  type SyncResult,
  type BatchSyncResult,
} from './sync.service';

export {
  syncEvents,
  SYNC_EVENTS,
  triggerSync,
  notifyRecordCreated,
} from './syncEvents';
