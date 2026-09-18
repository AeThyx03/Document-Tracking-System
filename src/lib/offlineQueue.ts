/**
 * Authoritative IndexedDB-Backed POSSD Offline Mutation Queue
 *
 * SPECIFICATION REQUIREMENTS:
 * - Do NOT use localStorage for queued offline mutations.
 * - Queued mutations must be stored in IndexedDB.
 * - Each queued mutation must include:
 *   - id
 *   - endpoint
 *   - method
 *   - payload
 *   - client_timestamp
 *   - retry_count
 *   - last_attempt
 *   - error_message
 * - Implement a queue manager that processes mutations sequentially when connectivity is restored.
 * - Support retry backoff.
 */

export interface QueuedMutation {
  id: string;
  endpoint: string;
  method: string;
  payload: any;
  client_timestamp: string;
  retry_count: number;
  last_attempt: string | null;
  error_message: string | null;
  headers?: Record<string, string>;
  status: 'pending' | 'processing' | 'failed' | 'synced';

  // Backward compatibility aliases
  operationId?: string;
  entity?: 'document' | 'movement' | 'remark' | 'link' | 'staff' | 'sla';
  entityId?: string;
  operationType?: 'CREATE' | 'UPDATE' | 'DELETE' | 'ROUTE';
  createdAt?: string;
  retryCount?: number;
  lastError?: string | null;
  url?: string;
}

// Backward-compatibility type alias
export type QueuedOperation = QueuedMutation;

const DB_NAME = 'possd_offline_db';
const DB_VERSION = 2;
const STORE_NAME = 'mutations';

function isIndexedDBAvailable(): boolean {
  try {
    return typeof window !== 'undefined' && 'indexedDB' in window && window.indexedDB !== null;
  } catch (e) {
    return false;
  }
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!isIndexedDBAvailable()) {
      return reject(new Error('IndexedDB is not supported or accessible in this environment.'));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: any) => {
      const db = event.target.result as IDBDatabase;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('client_timestamp', 'client_timestamp', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Enqueue a mutation into IndexedDB.
 */
export async function enqueueMutation(params: {
  endpoint?: string;
  url?: string;
  method: string;
  payload: any;
  headers?: Record<string, string>;
  entity?: QueuedMutation['entity'];
  entityId?: string;
  operationType?: QueuedMutation['operationType'];
}): Promise<QueuedMutation> {
  const mutationId = `mut_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const nowIso = new Date().toISOString();
  const endpoint = params.endpoint || params.url || '';

  const record: QueuedMutation = {
    id: mutationId,
    endpoint,
    method: params.method.toUpperCase(),
    payload: params.payload,
    client_timestamp: nowIso,
    retry_count: 0,
    last_attempt: null,
    error_message: null,
    headers: params.headers || { 'Content-Type': 'application/json' },
    status: 'pending',

    // Aliases for backwards compatibility with existing UI/services
    operationId: mutationId,
    entity: params.entity || 'document',
    entityId: params.entityId || mutationId,
    operationType: params.operationType || (params.method === 'POST' ? 'CREATE' : params.method === 'PUT' ? 'UPDATE' : 'DELETE'),
    createdAt: nowIso,
    retryCount: 0,
    lastError: null,
    url: endpoint,
  };

  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(record);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('offlineQueueUpdated', { detail: record }));
  }

  return record;
}

/**
 * Retrieves all pending or failed mutations from IndexedDB in chronological order.
 */
export async function getPendingMutations(): Promise<QueuedMutation[]> {
  try {
    const db = await openDB();
    return await new Promise<QueuedMutation[]>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        const all: QueuedMutation[] = req.result || [];
        const pending = all
          .filter((m) => m.status === 'pending' || m.status === 'failed')
          .sort((a, b) => new Date(a.client_timestamp).getTime() - new Date(b.client_timestamp).getTime());
        resolve(pending);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('[POSSD Offline] Failed to retrieve pending mutations from IndexedDB:', err);
    return [];
  }
}

/**
 * Updates a mutation's status and error in IndexedDB.
 */
export async function updateMutationStatus(
  id: string,
  status: QueuedMutation['status'],
  errorMessage?: string | null
): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);
      req.onsuccess = () => {
        const item: QueuedMutation = req.result;
        if (item) {
          item.status = status;
          item.last_attempt = new Date().toISOString();
          if (errorMessage !== undefined) {
            item.error_message = errorMessage;
            item.lastError = errorMessage;
          }
          if (status === 'failed') {
            item.retry_count = (item.retry_count || 0) + 1;
            item.retryCount = item.retry_count;
          }
          store.put(item);
        }
        resolve();
      };
      req.onerror = () => reject(req.error);
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('offlineQueueUpdated'));
    }
  } catch (err) {
    console.warn('[POSSD Offline] Failed to update mutation status in IndexedDB:', err);
  }
}

/**
 * Removes a mutation from IndexedDB after successful execution.
 */
export async function removeMutation(id: string): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('offlineQueueUpdated'));
    }
  } catch (err) {
    console.warn('[POSSD Offline] Failed to delete mutation from IndexedDB:', err);
  }
}

/**
 * Clears all mutations from IndexedDB.
 */
export async function clearMutationQueue(): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('offlineQueueUpdated'));
    }
  } catch (err) {
    console.warn('[POSSD Offline] Failed to clear IndexedDB mutations:', err);
  }
}

// -------------------------------------------------------------
// SEQUENTIAL QUEUE MANAGER WITH RETRY BACKOFF
// -------------------------------------------------------------
let isProcessingQueue = false;

/**
 * Calculates exponential backoff delay (in milliseconds).
 * Base: 1000ms * 2^retryCount, capped at 30,000ms (30 seconds).
 */
export function calculateBackoffMs(retryCount: number): number {
  const baseMs = 1000;
  const maxMs = 30000;
  return Math.min(maxMs, baseMs * Math.pow(2, Math.max(0, retryCount)));
}

/**
 * Processes mutations sequentially with retry backoff.
 */
export async function processQueueSequentially(token?: string | null): Promise<{ processed: number; failed: number }> {
  if (isProcessingQueue) {
    return { processed: 0, failed: 0 };
  }

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return { processed: 0, failed: 0 };
  }

  isProcessingQueue = true;
  let processed = 0;
  let failed = 0;

  try {
    const pending = await getPendingMutations();

    for (const mutation of pending) {
      // Check if maximum retries reached (e.g. 5 retries)
      if (mutation.retry_count >= 5) {
        console.warn(`[POSSD Offline] Mutation ${mutation.id} exceeded maximum retries.`);
        failed++;
        continue;
      }

      // Check exponential backoff delay
      if (mutation.last_attempt && mutation.retry_count > 0) {
        const elapsed = Date.now() - new Date(mutation.last_attempt).getTime();
        const requiredDelay = calculateBackoffMs(mutation.retry_count);
        if (elapsed < requiredDelay) {
          // Skip for now, wait for backoff window
          continue;
        }
      }

      await updateMutationStatus(mutation.id, 'processing');

      try {
        const finalHeaders = { ...(mutation.headers || {}) };
        if (token && !finalHeaders['Authorization']) {
          finalHeaders['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(mutation.endpoint, {
          method: mutation.method,
          headers: finalHeaders,
          body: mutation.payload ? JSON.stringify(mutation.payload) : undefined,
        });

        if (response.ok) {
          await removeMutation(mutation.id);
          processed++;
        } else {
          const errText = await response.text();
          await updateMutationStatus(
            mutation.id,
            'failed',
            `HTTP ${response.status}: ${errText.substring(0, 300)}`
          );
          failed++;
        }
      } catch (networkErr: any) {
        await updateMutationStatus(
          mutation.id,
          'failed',
          networkErr.message || 'Network request failed'
        );
        failed++;
        // If network failed completely, break sequential loop until next connectivity trigger
        break;
      }
    }
  } catch (err) {
    console.error('[POSSD Offline] Error in sequential queue processing:', err);
  } finally {
    isProcessingQueue = false;
  }

  return { processed, failed };
}

// Auto-register window event listeners for network reconnection
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('[POSSD Offline] Connectivity restored. Triggering sequential queue processing...');
    processQueueSequentially();
  });
}

// -------------------------------------------------------------
// BACKWARD COMPATIBILITY ADAPTERS (For seamless existing UI)
// -------------------------------------------------------------
export interface QueuedRequest {
  id: string;
  url: string;
  method: string;
  headers: any;
  body: string;
  timestamp: number;
  retries: number;
}

let cachedQueueCount = 0;

export function getOfflineQueue(): QueuedRequest[] {
  // Return memory representation for sync UI counts
  return Array.from({ length: cachedQueueCount }).map((_, i) => ({
    id: `queue_${i}`,
    url: '',
    method: 'POST',
    headers: {},
    body: '',
    timestamp: Date.now(),
    retries: 0,
  }));
}

// Keep cached count updated in real-time
if (typeof window !== 'undefined') {
  const syncCount = async () => {
    const list = await getPendingMutations();
    cachedQueueCount = list.length;
    window.dispatchEvent(new Event('offlineQueueUpdated'));
  };
  syncCount();
  window.addEventListener('offlineQueueUpdated', () => {
    getPendingMutations().then((list) => {
      cachedQueueCount = list.length;
    });
  });
}

export function addToQueue(req: Omit<QueuedRequest, 'id' | 'timestamp' | 'retries'>) {
  let parsedPayload = null;
  try {
    parsedPayload = req.body ? JSON.parse(req.body) : null;
  } catch (e) {
    parsedPayload = req.body;
  }

  enqueueMutation({
    endpoint: req.url,
    method: req.method,
    headers: req.headers,
    payload: parsedPayload,
  }).catch((err) => console.warn('[POSSD Offline] Enqueue error:', err));
}

export function removeFromQueue(id: string) {
  removeMutation(id).catch(() => {});
}

export function clearQueue() {
  clearMutationQueue().catch(() => {});
}
