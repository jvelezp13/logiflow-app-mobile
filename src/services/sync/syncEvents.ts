/**
 * Sync Events
 *
 * Simple event system for sync-related events.
 * Used to trigger sync when new records are created.
 * Compatible with React Native.
 */

type EventCallback = (...args: any[]) => void;

/**
 * Simple event emitter compatible with React Native
 */
class SimpleEventEmitter {
  private listeners: Map<string, EventCallback[]> = new Map();

  on(event: string, callback: EventCallback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback: EventCallback) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  emit(event: string, ...args: any[]) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((callback) => callback(...args));
    }
  }

  removeAllListeners() {
    this.listeners.clear();
  }
}

export const syncEvents = new SimpleEventEmitter();

/**
 * Event types
 */
export const SYNC_EVENTS = {
  RECORD_CREATED: 'record_created',
  SYNC_REQUESTED: 'sync_requested',
  // Emitido cuando syncPendingRecords proceso al menos un registro (synced+failed > 0).
  // Listeners (HomeScreen) lo usan para refrescar el badge sin esperar pull-to-refresh.
  SYNC_COMPLETED: 'sync_completed',
  // Emitido cuando el backend rechazo un marcaje porque el empleado tiene una
  // jornada abierta sin cerrar (constraint fn_prevent_jornada_duplicada). El
  // registro local se PRESERVA (queda con backoff, visible en el banner de
  // atención); los listeners (HomeScreen) avisan al empleado y lo llevan a
  // reportar la salida faltante para destrabar y que el marcaje suba con su hora real.
  OPEN_JOURNEY_REJECTED: 'open_journey_rejected',
} as const;

/**
 * Payload de SYNC_COMPLETED.
 */
export type SyncCompletedPayload = {
  synced: number;
  failed: number;
  total: number;
};

/**
 * Trigger sync manually
 */
export const triggerSync = () => {
  console.log('[SyncEvents] Triggering sync manually');
  syncEvents.emit(SYNC_EVENTS.SYNC_REQUESTED);
};

/**
 * Notify when a record is created
 */
export const notifyRecordCreated = (recordId: string) => {
  console.log('[SyncEvents] Record created:', recordId);
  syncEvents.emit(SYNC_EVENTS.RECORD_CREATED, recordId);
};
