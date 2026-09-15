import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.ts';
import { slaRules, businessHours, holidays } from '../db/schema.ts';
import { sendApiSuccess, sendApiError } from '../middleware/errorHandler.ts';

export const slaRouter = Router();

// Helper to get SLA config
const getSlaConfig = async () => {
  const rules = await db.select().from(slaRules);
  const hours = await db.select().from(businessHours);

  const config = {
    defaultThresholdHours: 24,
    divisionThresholds: {} as Record<string, number>,
    highlightRowOnExceed: true,
    businessHours: hours,
  };

  rules.forEach((r) => {
    if (r.targetType === 'default') {
      config.defaultThresholdHours = r.thresholdHours;
      config.highlightRowOnExceed = r.highlightRowOnExceed !== null ? r.highlightRowOnExceed : true;
    } else if (r.targetType === 'division' && r.targetName) {
      config.divisionThresholds[r.targetName] = r.thresholdHours;
    }
  });

  return { config, rules, hours };
};

// Helper to update SLA config
const updateSlaConfig = async (body: any) => {
  const { defaultThresholdHours, divisionThresholds, highlightRowOnExceed } = body;

  await db.delete(slaRules);

  const inserts = [];
  inserts.push({
    targetType: 'default',
    targetName: null,
    thresholdHours: defaultThresholdHours || 24,
    highlightRowOnExceed: highlightRowOnExceed !== undefined ? highlightRowOnExceed : true,
  });

  for (const [div, hours] of Object.entries(divisionThresholds || {})) {
    inserts.push({
      targetType: 'division',
      targetName: div,
      thresholdHours: hours as number,
      highlightRowOnExceed: highlightRowOnExceed !== undefined ? highlightRowOnExceed : true,
    });
  }

  await db.insert(slaRules).values(inserts);
};

// GET /api/sla and /api/sla/config
const getSlaHandler = async (req: any, res: any) => {
  try {
    const { config, rules } = await getSlaConfig();
    return sendApiSuccess(res, { config, rules });
  } catch (err: any) {
    return sendApiError(res, 500, 'INTERNAL_SERVER_ERROR', err.message);
  }
};

slaRouter.get('/sla', getSlaHandler);
slaRouter.get('/sla/config', getSlaHandler);

// PUT /api/sla and POST /api/sla/config
const putSlaHandler = async (req: any, res: any) => {
  try {
    await updateSlaConfig(req.body);
    const { config } = await getSlaConfig();
    return sendApiSuccess(res, { message: 'SLA configuration updated successfully.', config });
  } catch (err: any) {
    return sendApiError(res, 500, 'INTERNAL_SERVER_ERROR', err.message);
  }
};

slaRouter.put('/sla', putSlaHandler);
slaRouter.post('/sla/config', putSlaHandler);

// -------------------------------------------------------------
// BUSINESS HOURS (Operating Schedule)
// -------------------------------------------------------------
// GET /api/business-hours
slaRouter.get('/business-hours', async (req: any, res: any) => {
  try {
    const hours = await db.select().from(businessHours).orderBy(businessHours.dayOfWeek);
    return sendApiSuccess(res, { businessHours: hours });
  } catch (err: any) {
    return sendApiError(res, 500, 'INTERNAL_SERVER_ERROR', err.message);
  }
});

// PUT /api/business-hours
slaRouter.put('/business-hours', async (req: any, res: any) => {
  try {
    const { hours } = req.body;
    if (Array.isArray(hours)) {
      await db.delete(businessHours);
      if (hours.length > 0) {
        await db.insert(businessHours).values(
          hours.map((h: any) => ({
            dayOfWeek: Number(h.dayOfWeek),
            isOpen: h.isOpen !== undefined ? !!h.isOpen : true,
            openTime: h.openTime || '08:00',
            closeTime: h.closeTime || '17:00',
          }))
        );
      }
    }
    const updated = await db.select().from(businessHours).orderBy(businessHours.dayOfWeek);
    return sendApiSuccess(res, { message: 'Business hours updated successfully', businessHours: updated });
  } catch (err: any) {
    return sendApiError(res, 500, 'INTERNAL_SERVER_ERROR', err.message);
  }
});

// -------------------------------------------------------------
// HOLIDAYS (Calendar Exclusions)
// -------------------------------------------------------------
// GET /api/holidays
slaRouter.get('/holidays', async (req: any, res: any) => {
  try {
    const list = await db.select().from(holidays).orderBy(holidays.date);
    return sendApiSuccess(res, { holidays: list });
  } catch (err: any) {
    return sendApiError(res, 500, 'INTERNAL_SERVER_ERROR', err.message);
  }
});

// POST /api/holidays
slaRouter.post('/holidays', async (req: any, res: any) => {
  try {
    const { date, name, isWorkingDayOverride, isHalfDay } = req.body;
    if (!date || !name) {
      return sendApiError(res, 400, 'VALIDATION_ERROR', 'date (YYYY-MM-DD) and name are required.');
    }

    const [created] = await db
      .insert(holidays)
      .values({
        date,
        name,
        isWorkingDayOverride: !!isWorkingDayOverride,
        isHalfDay: !!isHalfDay,
      })
      .onConflictDoUpdate({
        target: holidays.date,
        set: {
          name,
          isWorkingDayOverride: !!isWorkingDayOverride,
          isHalfDay: !!isHalfDay,
        },
      })
      .returning();

    return sendApiSuccess(res, { holiday: created }, 201);
  } catch (err: any) {
    return sendApiError(res, 500, 'INTERNAL_SERVER_ERROR', err.message);
  }
});

// DELETE /api/holidays/:id
slaRouter.delete('/holidays/:id', async (req: any, res: any) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return sendApiError(res, 400, 'VALIDATION_ERROR', 'Invalid holiday ID');
    }

    const [deleted] = await db.delete(holidays).where(eq(holidays.id, id)).returning();
    if (!deleted) {
      return sendApiError(res, 404, 'NOT_FOUND', `Holiday with ID ${id} not found.`);
    }

    return sendApiSuccess(res, { message: 'Holiday deleted successfully', holiday: deleted });
  } catch (err: any) {
    return sendApiError(res, 500, 'INTERNAL_SERVER_ERROR', err.message);
  }
});

