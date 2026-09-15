import { Router } from 'express';
import { checkDatabaseConnection } from '../db/index.ts';
import { sendApiSuccess, sendApiError } from '../middleware/errorHandler.ts';

export const healthRouter = Router();

healthRouter.get('/health', async (req, res) => {
  const dbStatus = await checkDatabaseConnection();

  if (!dbStatus.ok) {
    return res.status(503).json({
      status: 'error',
      database: 'disconnected',
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: 'Database connection failure: PostgreSQL is not responding',
      },
      details: dbStatus.error,
      latencyMs: dbStatus.latencyMs,
    });
  }

  return res.status(200).json({
    status: 'ok',
    database: 'connected',
    api: 'ok',
    latencyMs: dbStatus.latencyMs,
    timestamp: new Date().toISOString(),
  });
});
