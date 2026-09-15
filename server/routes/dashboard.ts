import { Router } from 'express';
import { getDashboardSummary } from '../services/dashboardService.ts';
import { sendApiSuccess, sendApiError } from '../middleware/errorHandler.ts';

export const dashboardRouter = Router();

// -------------------------------------------------------------
// GET /api/dashboard/summary - Authoritative Database Summary
// -------------------------------------------------------------
dashboardRouter.get('/dashboard/summary', async (req, res) => {
  try {
    const summary = await getDashboardSummary();
    return sendApiSuccess(res, { summary });
  } catch (err: any) {
    return sendApiError(res, 500, 'INTERNAL_SERVER_ERROR', err.message);
  }
});
