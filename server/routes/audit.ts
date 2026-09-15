import { Router } from 'express';
import { desc, eq, and, sql } from 'drizzle-orm';
import { db } from '../db/index.ts';
import { auditLogs } from '../db/schema.ts';
import { sendApiSuccess, sendApiError } from '../middleware/errorHandler.ts';

export const auditRouter = Router();

// GET /api/audit-logs
auditRouter.get('/audit-logs', async (req: any, res: any) => {
  try {
    const { page, pageSize, action, entityType, entityId } = req.query;

    const pageNum = page ? Math.max(1, Number(page)) : 1;
    const limitNum = pageSize ? Math.max(1, Math.min(100, Number(pageSize))) : 50;
    const offsetNum = (pageNum - 1) * limitNum;

    const conditions: any[] = [];
    if (action) conditions.push(eq(auditLogs.action, String(action)));
    if (entityType) conditions.push(eq(auditLogs.entityType, String(entityType)));
    if (entityId) conditions.push(eq(auditLogs.entityId, String(entityId)));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(auditLogs)
      .where(whereClause);

    const totalCount = countResult?.count || 0;

    const logs = await db
      .select()
      .from(auditLogs)
      .where(whereClause)
      .orderBy(desc(auditLogs.timestamp))
      .limit(limitNum)
      .offset(offsetNum);

    return sendApiSuccess(res, {
      auditLogs: logs,
      totalCount,
      page: pageNum,
      pageSize: limitNum,
      totalPages: Math.ceil(totalCount / limitNum),
    });
  } catch (err: any) {
    return sendApiError(res, 500, 'INTERNAL_SERVER_ERROR', err.message);
  }
});
