import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.ts';
import { personnel } from '../db/schema.ts';
import { sendApiSuccess, sendApiError } from '../middleware/errorHandler.ts';

export const personnelRouter = Router();

// GET /api/personnel (and alias /api/staff)
const getStaffHandler = async (req: any, res: any) => {
  try {
    const list = await db.select().from(personnel);
    return sendApiSuccess(res, { personnel: list, staff: list });
  } catch (err: any) {
    return sendApiError(res, 500, 'INTERNAL_SERVER_ERROR', err.message);
  }
};

personnelRouter.get('/personnel', getStaffHandler);
personnelRouter.get('/staff', getStaffHandler);

// GET /api/personnel/:id
personnelRouter.get('/personnel/:id', async (req: any, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return sendApiError(res, 400, 'VALIDATION_ERROR', 'Invalid personnel ID');
    }
    const [found] = await db.select().from(personnel).where(eq(personnel.id, id));
    if (!found) {
      return sendApiError(res, 404, 'NOT_FOUND', `Personnel with ID ${id} not found.`);
    }
    return sendApiSuccess(res, { personnel: found, staffMember: found });
  } catch (err: any) {
    return sendApiError(res, 500, 'INTERNAL_SERVER_ERROR', err.message);
  }
});

// POST /api/personnel (and alias /api/staff)
const postStaffHandler = async (req: any, res: any) => {
  try {
    // Bulk sync support
    if (req.body.staff && Array.isArray(req.body.staff)) {
      const staffList = req.body.staff;
      for (const p of staffList) {
        if (!p.name) continue;
        const username = p.username || p.email?.split('@')[0] || p.name.replace(/\s+/g, '').toLowerCase();
        await db
          .insert(personnel)
          .values({
            name: p.name,
            role: p.role || 'Staff',
            division: p.division || 'General',
            avatarInitials: p.avatarInitials || p.name.slice(0, 2).toUpperCase(),
            email: p.email,
            assignedDesk: p.assignedDesk,
            username,
            status: p.status || 'active',
          })
          .onConflictDoUpdate({
            target: personnel.username,
            set: {
              name: p.name,
              role: p.role,
              division: p.division,
              assignedDesk: p.assignedDesk,
              status: p.status || 'active',
              updatedAt: new Date(),
            },
          });
      }
      return sendApiSuccess(res, { message: 'Staff synchronized successfully.' });
    }

    // Single item
    const p = req.body;
    if (!p.name || !p.role || !p.division) {
      return sendApiError(res, 400, 'VALIDATION_ERROR', 'Name, role, and division are required.');
    }

    const username = p.username || p.email?.split('@')[0] || p.name.replace(/\s+/g, '').toLowerCase();
    const [created] = await db
      .insert(personnel)
      .values({
        name: p.name,
        role: p.role,
        division: p.division,
        avatarInitials: p.avatarInitials || p.name.slice(0, 2).toUpperCase(),
        email: p.email,
        assignedDesk: p.assignedDesk,
        username,
        status: p.status || 'active',
      })
      .onConflictDoUpdate({
        target: personnel.username,
        set: {
          role: p.role,
          division: p.division,
          assignedDesk: p.assignedDesk,
          status: p.status || 'active',
          updatedAt: new Date(),
        },
      })
      .returning();

    return sendApiSuccess(res, { personnel: created, staffMember: created }, 201);
  } catch (err: any) {
    return sendApiError(res, 500, 'INTERNAL_SERVER_ERROR', err.message);
  }
};

personnelRouter.post('/personnel', postStaffHandler);
personnelRouter.post('/staff', postStaffHandler);

// PUT /api/personnel/:id
personnelRouter.put('/personnel/:id', async (req: any, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return sendApiError(res, 400, 'VALIDATION_ERROR', 'Invalid personnel ID');
    }

    const p = req.body;
    const [updated] = await db
      .update(personnel)
      .set({
        name: p.name,
        role: p.role,
        division: p.division,
        avatarInitials: p.avatarInitials,
        email: p.email,
        assignedDesk: p.assignedDesk,
        status: p.status,
        updatedAt: new Date(),
      })
      .where(eq(personnel.id, id))
      .returning();

    if (!updated) {
      return sendApiError(res, 404, 'NOT_FOUND', `Personnel with ID ${id} not found.`);
    }

    return sendApiSuccess(res, { personnel: updated, staffMember: updated });
  } catch (err: any) {
    return sendApiError(res, 500, 'INTERNAL_SERVER_ERROR', err.message);
  }
});

// DELETE /api/personnel/:id (and alias /api/staff/:id)
const deleteStaffHandler = async (req: any, res: any) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return sendApiError(res, 400, 'VALIDATION_ERROR', 'Invalid personnel ID');
    }

    const [deleted] = await db
      .delete(personnel)
      .where(eq(personnel.id, id))
      .returning();

    if (!deleted) {
      return sendApiError(res, 404, 'NOT_FOUND', `Personnel with ID ${id} not found.`);
    }

    return sendApiSuccess(res, { message: 'Personnel deleted successfully', personnel: deleted });
  } catch (err: any) {
    return sendApiError(res, 500, 'INTERNAL_SERVER_ERROR', err.message);
  }
};

personnelRouter.delete('/personnel/:id', deleteStaffHandler);
personnelRouter.delete('/staff/:id', deleteStaffHandler);

