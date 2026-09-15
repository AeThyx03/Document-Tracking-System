import { db } from '../db/index.ts';
import { auditLogs } from '../db/schema.ts';

export interface AuditLogEntry {
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  oldValue?: any;
  newValue?: any;
  metadata?: any;
}

export async function createAuditLog(entry: AuditLogEntry, txClient?: any): Promise<void> {
  const client = txClient || db;
  try {
    await client.insert(auditLogs).values({
      userId: entry.userId || null,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId || null,
      oldValue: entry.oldValue ? JSON.parse(JSON.stringify(entry.oldValue)) : null,
      newValue: entry.newValue ? JSON.parse(JSON.stringify(entry.newValue)) : null,
      metadata: entry.metadata ? JSON.parse(JSON.stringify(entry.metadata)) : null,
      timestamp: new Date(),
    });
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}
