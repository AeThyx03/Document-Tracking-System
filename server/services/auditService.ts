import { db } from '../db/index.ts';
import { auditLogs } from '../db/schema.ts';

export interface AuditActor {
  id?: string | number | null;
  userId?: string | number | null;
  username?: string | null;
  name?: string | null;
  role?: string | null;
  email?: string | null;
  division?: string | null;
}

export interface AuditLogEntry {
  userId?: string | number | null;
  actor?: AuditActor | null;
  action: string;
  entityType: string;
  entityId?: string | number | null;
  oldValue?: any;
  newValue?: any;
  metadata?: any;
}

const SENSITIVE_KEY_REGEX = /^(password|password_hash|passwordhash|token|jwt|secret|authheader|authorization|apikey|api_key)$/i;

/**
 * Recursively deep-clones and purges any sensitive credentials or tokens.
 */
export function sanitizeAuditData(data: any, depth = 0): any {
  if (data === null || data === undefined) return null;
  if (depth > 8) return '[Truncated: Max Depth]';

  if (typeof data === 'function') return undefined;
  if (typeof data !== 'object') {
    if (typeof data === 'string' && (data.startsWith('Bearer ey') || data.length > 500)) {
      if (data.startsWith('Bearer ey')) return '[REDACTED_TOKEN]';
    }
    return data;
  }

  if (data instanceof Date) {
    return data.toISOString();
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeAuditData(item, depth + 1));
  }

  const sanitized: Record<string, any> = {};
  for (const [key, val] of Object.entries(data)) {
    if (SENSITIVE_KEY_REGEX.test(key)) {
      // Exclude passwords/hashes/tokens entirely from audit payloads
      continue;
    }
    sanitized[key] = sanitizeAuditData(val, depth + 1);
  }

  return sanitized;
}

/**
 * Creates an append-only audit log entry.
 * When called inside a transaction (txClient passed), insertion errors are thrown
 * to guarantee that failures immediately trigger a transaction ROLLBACK.
 */
export async function createAuditLog(entry: AuditLogEntry, txClient?: any): Promise<any> {
  const client = txClient || db;

  const rawActor = entry.actor || (entry.userId ? { id: entry.userId } : null);
  const actorId = entry.actor?.userId || entry.actor?.id || entry.userId || null;
  const actorUserId = actorId ? String(actorId) : null;

  const sanitizedOldValue = entry.oldValue !== undefined ? sanitizeAuditData(entry.oldValue) : null;
  const sanitizedNewValue = entry.newValue !== undefined ? sanitizeAuditData(entry.newValue) : null;

  const metadataObj: Record<string, any> = entry.metadata ? sanitizeAuditData(entry.metadata) : {};
  if (entry.actor) {
    metadataObj.actor = {
      id: entry.actor.id || entry.actor.userId || null,
      name: entry.actor.name || null,
      username: entry.actor.username || null,
      role: entry.actor.role || null,
      email: entry.actor.email || null,
      division: entry.actor.division || null,
    };
  }

  try {
    const [inserted] = await client
      .insert(auditLogs)
      .values({
        userId: actorUserId,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId ? String(entry.entityId) : null,
        oldValue: sanitizedOldValue,
        newValue: sanitizedNewValue,
        metadata: Object.keys(metadataObj).length > 0 ? metadataObj : null,
        timestamp: new Date(),
      })
      .returning();

    return inserted;
  } catch (err) {
    console.error(`[AuditService] FATAL: Failed to write audit record for action "${entry.action}":`, err);
    // Propagate error to trigger transactional rollback
    throw err;
  }
}

