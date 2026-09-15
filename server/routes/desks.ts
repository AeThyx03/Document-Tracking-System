import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.ts';
import { desks } from '../db/schema.ts';
import { sendApiSuccess, sendApiError } from '../middleware/errorHandler.ts';

export const desksRouter = Router();

// GET /api/desks - List all active desks/stations
desksRouter.get('/desks', async (req, res) => {
  try {
    const allDesks = await db.select().from(desks).orderBy(desks.name);
    return sendApiSuccess(res, { desks: allDesks });
  } catch (err: any) {
    return sendApiError(res, 500, 'INTERNAL_SERVER_ERROR', err.message);
  }
});

// POST /api/desks - Add new desk
desksRouter.post('/desks', async (req, res) => {
  try {
    const { name, departmentId, code, description } = req.body;
    if (!name || !name.trim()) {
      return sendApiError(res, 400, 'VALIDATION_ERROR', 'Desk name is required.');
    }
    const [created] = await db
      .insert(desks)
      .values({
        name: name.trim(),
        departmentId: departmentId ? Number(departmentId) : null,
        code: code || null,
        description: description || null,
      })
      .returning();

    return sendApiSuccess(res, { desk: created }, 201);
  } catch (err: any) {
    return sendApiError(res, 500, 'INTERNAL_SERVER_ERROR', err.message);
  }
});
