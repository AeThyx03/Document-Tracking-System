import { Router } from 'express';
import { db } from '../db/index.ts';
import { departments } from '../db/schema.ts';
import { sendApiSuccess, sendApiError } from '../middleware/errorHandler.ts';
import { authorizeSettingsManagement } from '../middleware/authorize.ts';

export const departmentsRouter = Router();

departmentsRouter.get('/departments', async (req, res) => {
  try {
    const list = await db.select().from(departments);
    return sendApiSuccess(res, { departments: list });
  } catch (err: any) {
    return sendApiError(res, 500, 'INTERNAL_SERVER_ERROR', err.message);
  }
});

departmentsRouter.post('/departments', authorizeSettingsManagement, async (req, res) => {
  try {
    const { name, code, description } = req.body;
    if (!name || typeof name !== 'string') {
      return sendApiError(res, 400, 'VALIDATION_ERROR', 'Department name is required.');
    }

    const [created] = await db
      .insert(departments)
      .values({
        name: name.trim(),
        code: code?.trim() || null,
        description: description?.trim() || null,
      })
      .returning();

    return sendApiSuccess(res, { department: created }, 201);
  } catch (err: any) {
    return sendApiError(res, 500, 'INTERNAL_SERVER_ERROR', err.message);
  }
});
