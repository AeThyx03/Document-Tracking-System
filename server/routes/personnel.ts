import { Router } from 'express';
import { eq, or } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { db, withTransaction } from '../db/index.ts';
import { personnel, users } from '../db/schema.ts';
import { createAuditLog } from '../services/auditService.ts';
import { sendApiSuccess, sendApiError } from '../middleware/errorHandler.ts';
import { authorizeStaffManagement, getAuthenticatedUser } from '../middleware/authorize.ts';

export const personnelRouter = Router();

/**
 * Strips sensitive authentication fields so password hashes are never exposed.
 */
function sanitizePersonnel(record: any) {
  if (!record) return null;
  const { password, passwordHash, password_hash, ...rest } = record;
  return rest;
}

// -------------------------------------------------------------
// GET /api/personnel (and alias /api/staff)
// Returns all personnel records without password hashes.
// -------------------------------------------------------------
const getStaffHandler = async (_req: any, res: any) => {
  try {
    const list = await db.select().from(personnel);
    const sanitized = list.map(sanitizePersonnel);
    return sendApiSuccess(res, { personnel: sanitized, staff: sanitized });
  } catch (err: any) {
    return sendApiError(res, 500, 'INTERNAL_SERVER_ERROR', err.message);
  }
};

personnelRouter.get('/personnel', getStaffHandler);
personnelRouter.get('/staff', getStaffHandler);

// -------------------------------------------------------------
// GET /api/personnel/:id
// -------------------------------------------------------------
personnelRouter.get('/personnel/:id', async (req: any, res: any) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return sendApiError(res, 400, 'VALIDATION_ERROR', 'Invalid personnel ID');
    }
    const [found] = await db.select().from(personnel).where(eq(personnel.id, id));
    if (!found) {
      return sendApiError(res, 404, 'NOT_FOUND', `Personnel with ID ${id} not found.`);
    }
    const sanitized = sanitizePersonnel(found);
    return sendApiSuccess(res, { personnel: sanitized, staffMember: sanitized });
  } catch (err: any) {
    return sendApiError(res, 500, 'INTERNAL_SERVER_ERROR', err.message);
  }
});

// -------------------------------------------------------------
// POST /api/personnel (and alias /api/staff) - System Admin only
// Persists personnel & linked auth account in PostgreSQL with bcrypt hashing
// -------------------------------------------------------------
const postStaffHandler = async (req: any, res: any) => {
  try {
    const authActor = getAuthenticatedUser(req);
    const actor = authActor
      ? {
          id: authActor.id,
          userId: authActor.id,
          username: authActor.username,
          name: authActor.name,
          role: authActor.role,
          email: authActor.email,
          division: authActor.division,
        }
      : null;
    const actorUserId = authActor ? String(authActor.id) : null;
    const now = new Date();

    // Bulk sync support
    if (req.body.staff && Array.isArray(req.body.staff)) {
      const staffList = req.body.staff;
      await withTransaction(async (tx) => {
        for (const p of staffList) {
          if (!p.name) continue;
          const cleanUsername = (p.username || p.email?.split('@')[0] || p.name.replace(/\s+/g, '.')).toLowerCase().trim();
          const cleanEmail = (p.email || `${cleanUsername}@agency.gov`).toLowerCase().trim();

          // 1. Ensure or update users account
          let linkedUserId: number | null = null;
          const [existingUser] = await tx
            .select({ id: users.id })
            .from(users)
            .where(or(eq(users.email, cleanEmail), eq(users.username, cleanUsername)))
            .limit(1);

          if (existingUser) {
            linkedUserId = existingUser.id;
            await tx
              .update(users)
              .set({
                role: p.role || 'Staff',
                isActive: p.status !== 'suspended',
                updatedAt: now,
              })
              .where(eq(users.id, existingUser.id));
          } else {
            const defaultHash = p.password ? await bcrypt.hash(p.password, 10) : null;
            const [newUser] = await tx
              .insert(users)
              .values({
                email: cleanEmail,
                username: cleanUsername,
                passwordHash: defaultHash,
                role: p.role || 'Staff',
                isActive: p.status !== 'suspended',
                createdAt: now,
                updatedAt: now,
              })
              .returning({ id: users.id });
            linkedUserId = newUser.id;
          }

          // 2. Insert or update personnel
          await tx
            .insert(personnel)
            .values({
              userId: linkedUserId,
              name: p.name.trim(),
              role: p.role || 'Staff',
              division: p.division || 'General',
              avatarInitials: p.avatarInitials || p.name.slice(0, 2).toUpperCase(),
              email: cleanEmail,
              assignedDesk: p.assignedDesk || null,
              username: cleanUsername,
              status: p.status || 'active',
              createdAt: now,
              updatedAt: now,
            })
            .onConflictDoUpdate({
              target: personnel.username,
              set: {
                userId: linkedUserId,
                name: p.name.trim(),
                role: p.role,
                division: p.division,
                email: cleanEmail,
                assignedDesk: p.assignedDesk,
                status: p.status || 'active',
                updatedAt: now,
              },
            });
        }

        await createAuditLog(
          {
            userId: actorUserId,
            actor,
            action: 'SYNC_STAFF_BULK',
            entityType: 'personnel',
            newValue: { count: staffList.length },
          },
          tx
        );
      });

      return sendApiSuccess(res, { message: 'Staff synchronized successfully.' });
    }

    // Single personnel creation
    const p = req.body;
    if (!p.name || !p.role || !p.division) {
      return sendApiError(res, 400, 'VALIDATION_ERROR', 'Name, role, and division are required.');
    }

    const cleanUsername = (p.username || p.email?.split('@')[0] || p.name.replace(/\s+/g, '.')).toLowerCase().trim();
    const cleanEmail = (p.email || `${cleanUsername}@agency.gov`).toLowerCase().trim();

    // Password validation & bcrypt hashing (never plaintext)
    let passwordHash: string | null = null;
    if (p.password) {
      if (typeof p.password !== 'string' || p.password.length < 6) {
        return sendApiError(res, 400, 'VALIDATION_ERROR', 'Password must be at least 6 characters long.');
      }
      passwordHash = await bcrypt.hash(p.password, 10);
    }

    const created = await withTransaction(async (tx) => {
      // 1. Create or sync auth user account
      let linkedUserId: number | null = null;
      const [existingUser] = await tx
        .select({ id: users.id })
        .from(users)
        .where(or(eq(users.email, cleanEmail), eq(users.username, cleanUsername)))
        .limit(1);

      if (existingUser) {
        linkedUserId = existingUser.id;
        const userUpdates: any = {
          role: p.role,
          isActive: p.status !== 'suspended',
          updatedAt: now,
        };
        if (passwordHash) {
          userUpdates.passwordHash = passwordHash;
        }
        await tx.update(users).set(userUpdates).where(eq(users.id, existingUser.id));
      } else {
        const [newUser] = await tx
          .insert(users)
          .values({
            email: cleanEmail,
            username: cleanUsername,
            passwordHash,
            role: p.role,
            isActive: p.status !== 'suspended',
            createdAt: now,
            updatedAt: now,
          })
          .returning({ id: users.id });
        linkedUserId = newUser.id;
      }

      // 2. Create or upsert personnel record
      const [newPersonnel] = await tx
        .insert(personnel)
        .values({
          userId: linkedUserId,
          name: p.name.trim(),
          role: p.role,
          division: p.division,
          avatarInitials: p.avatarInitials || p.name.slice(0, 2).toUpperCase(),
          email: cleanEmail,
          assignedDesk: p.assignedDesk || null,
          username: cleanUsername,
          status: p.status || 'active',
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: personnel.username,
          set: {
            userId: linkedUserId,
            name: p.name.trim(),
            role: p.role,
            division: p.division,
            email: cleanEmail,
            assignedDesk: p.assignedDesk,
            status: p.status || 'active',
            updatedAt: now,
          },
        })
        .returning();

      // 3. Record audit trail transactionally
      await createAuditLog(
        {
          userId: actorUserId,
          actor,
          action: 'CREATE_PERSONNEL',
          entityType: 'personnel',
          entityId: String(newPersonnel.id),
          newValue: sanitizePersonnel(newPersonnel),
        },
        tx
      );

      return newPersonnel;
    });

    return sendApiSuccess(res, { personnel: sanitizePersonnel(created), staffMember: sanitizePersonnel(created) }, 201);
  } catch (err: any) {
    return sendApiError(res, 500, 'INTERNAL_SERVER_ERROR', err.message);
  }
};

personnelRouter.post('/personnel', authorizeStaffManagement, postStaffHandler);
personnelRouter.post('/staff', authorizeStaffManagement, postStaffHandler);

// -------------------------------------------------------------
// PUT /api/personnel/:id - System Admin only
// Updates profile, division, role, desk, credentials, and password
// -------------------------------------------------------------
personnelRouter.put('/personnel/:id', authorizeStaffManagement, async (req: any, res: any) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return sendApiError(res, 400, 'VALIDATION_ERROR', 'Invalid personnel ID');
    }

    const authActor = getAuthenticatedUser(req);
    const actor = authActor
      ? {
          id: authActor.id,
          userId: authActor.id,
          username: authActor.username,
          name: authActor.name,
          role: authActor.role,
          email: authActor.email,
          division: authActor.division,
        }
      : null;
    const actorUserId = authActor ? String(authActor.id) : null;
    const now = new Date();

    const [existing] = await db.select().from(personnel).where(eq(personnel.id, id));
    if (!existing) {
      return sendApiError(res, 404, 'NOT_FOUND', `Personnel with ID ${id} not found.`);
    }

    const p = req.body;
    const cleanUsername = p.username ? p.username.toLowerCase().trim() : existing.username;
    const cleanEmail = p.email ? p.email.toLowerCase().trim() : existing.email;

    // Optional password update
    let passwordHash: string | null = null;
    if (p.password) {
      if (typeof p.password !== 'string' || p.password.length < 6) {
        return sendApiError(res, 400, 'VALIDATION_ERROR', 'Password must be at least 6 characters long.');
      }
      passwordHash = await bcrypt.hash(p.password, 10);
    }

    const updated = await withTransaction(async (tx) => {
      // 1. Update or create linked auth user record
      let linkedUserId = existing.userId;
      if (linkedUserId) {
        const userUpdates: any = {
          name: p.name || existing.name,
          role: p.role || existing.role,
          isActive: (p.status ?? existing.status) !== 'suspended',
          updatedAt: now,
        };
        if (cleanEmail) userUpdates.email = cleanEmail;
        if (cleanUsername) userUpdates.username = cleanUsername;
        if (passwordHash) userUpdates.passwordHash = passwordHash;

        await tx.update(users).set(userUpdates).where(eq(users.id, linkedUserId));
      } else {
        // Find existing user by username/email or create new
        const [matchedUser] = await tx
          .select({ id: users.id })
          .from(users)
          .where(or(eq(users.username, cleanUsername), eq(users.email, cleanEmail || '')))
          .limit(1);

        if (matchedUser) {
          linkedUserId = matchedUser.id;
          const userUpdates: any = {
            role: p.role || existing.role,
            isActive: (p.status ?? existing.status) !== 'suspended',
            updatedAt: now,
          };
          if (passwordHash) userUpdates.passwordHash = passwordHash;
          await tx.update(users).set(userUpdates).where(eq(users.id, matchedUser.id));
        } else {
          const [newUser] = await tx
            .insert(users)
            .values({
              email: cleanEmail || `${cleanUsername}@agency.gov`,
              username: cleanUsername,
              passwordHash,
              role: p.role || existing.role,
              isActive: (p.status ?? existing.status) !== 'suspended',
              createdAt: now,
              updatedAt: now,
            })
            .returning({ id: users.id });
          linkedUserId = newUser.id;
        }
      }

      // 2. Update personnel record
      const [updatedRecord] = await tx
        .update(personnel)
        .set({
          userId: linkedUserId,
          name: p.name !== undefined ? p.name.trim() : existing.name,
          role: p.role !== undefined ? p.role : existing.role,
          division: p.division !== undefined ? p.division : existing.division,
          avatarInitials: p.avatarInitials !== undefined ? p.avatarInitials : existing.avatarInitials,
          email: cleanEmail,
          assignedDesk: p.assignedDesk !== undefined ? p.assignedDesk : existing.assignedDesk,
          status: p.status !== undefined ? p.status : existing.status,
          username: cleanUsername,
          updatedAt: now,
        })
        .where(eq(personnel.id, id))
        .returning();

      // 3. Record audit trail
      await createAuditLog(
        {
          userId: actorUserId,
          actor,
          action: 'UPDATE_PERSONNEL',
          entityType: 'personnel',
          entityId: String(id),
          oldValue: sanitizePersonnel(existing),
          newValue: sanitizePersonnel(updatedRecord),
        },
        tx
      );

      return updatedRecord;
    });

    return sendApiSuccess(res, { personnel: sanitizePersonnel(updated), staffMember: sanitizePersonnel(updated) });
  } catch (err: any) {
    return sendApiError(res, 500, 'INTERNAL_SERVER_ERROR', err.message);
  }
});

// -------------------------------------------------------------
// PATCH & PUT /api/personnel/:id/credentials - Manage credentials & password
// -------------------------------------------------------------
const updateCredentialsHandler = async (req: any, res: any) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return sendApiError(res, 400, 'VALIDATION_ERROR', 'Invalid personnel ID');
    }

    const authActor = getAuthenticatedUser(req);
    const actor = authActor
      ? {
          id: authActor.id,
          userId: authActor.id,
          username: authActor.username,
          name: authActor.name,
          role: authActor.role,
          email: authActor.email,
          division: authActor.division,
        }
      : null;
    const actorUserId = authActor ? String(authActor.id) : null;
    const now = new Date();

    const [existing] = await db.select().from(personnel).where(eq(personnel.id, id));
    if (!existing) {
      return sendApiError(res, 404, 'NOT_FOUND', `Personnel with ID ${id} not found.`);
    }

    const { username, email, status, password } = req.body;
    const cleanUsername = username ? username.toLowerCase().trim() : existing.username;
    const cleanEmail = email ? email.toLowerCase().trim() : existing.email;
    const newStatus = status ? status : existing.status;

    let passwordHash: string | null = null;
    if (password) {
      if (typeof password !== 'string' || password.length < 6) {
        return sendApiError(res, 400, 'VALIDATION_ERROR', 'Password must be at least 6 characters long.');
      }
      passwordHash = await bcrypt.hash(password, 10);
    }

    const updated = await withTransaction(async (tx) => {
      // Sync users account
      let linkedUserId = existing.userId;
      if (linkedUserId) {
        const userUpdates: any = {
          username: cleanUsername,
          email: cleanEmail,
          isActive: newStatus === 'active',
          updatedAt: now,
        };
        if (passwordHash) {
          userUpdates.passwordHash = passwordHash;
        }
        await tx.update(users).set(userUpdates).where(eq(users.id, linkedUserId));
      } else {
        const [matched] = await tx
          .select({ id: users.id })
          .from(users)
          .where(or(eq(users.username, cleanUsername), eq(users.email, cleanEmail || '')))
          .limit(1);

        if (matched) {
          linkedUserId = matched.id;
          const userUpdates: any = {
            username: cleanUsername,
            email: cleanEmail,
            isActive: newStatus === 'active',
            updatedAt: now,
          };
          if (passwordHash) userUpdates.passwordHash = passwordHash;
          await tx.update(users).set(userUpdates).where(eq(users.id, matched.id));
        } else {
          const [newUser] = await tx
            .insert(users)
            .values({
              username: cleanUsername,
              email: cleanEmail || `${cleanUsername}@agency.gov`,
              passwordHash,
              role: existing.role,
              isActive: newStatus === 'active',
              createdAt: now,
              updatedAt: now,
            })
            .returning({ id: users.id });
          linkedUserId = newUser.id;
        }
      }

      // Update personnel
      const [updatedRecord] = await tx
        .update(personnel)
        .set({
          userId: linkedUserId,
          username: cleanUsername,
          email: cleanEmail,
          status: newStatus,
          updatedAt: now,
        })
        .where(eq(personnel.id, id))
        .returning();

      // Audit log
      await createAuditLog(
        {
          userId: actorUserId,
          actor,
          action: password ? 'RESET_PERSONNEL_PASSWORD' : 'UPDATE_PERSONNEL_CREDENTIALS',
          entityType: 'personnel',
          entityId: String(id),
          oldValue: { username: existing.username, email: existing.email, status: existing.status },
          newValue: { username: updatedRecord.username, email: updatedRecord.email, status: updatedRecord.status, passwordUpdated: !!password },
        },
        tx
      );

      return updatedRecord;
    });

    return sendApiSuccess(res, {
      message: 'Credentials updated successfully.',
      personnel: sanitizePersonnel(updated),
      staffMember: sanitizePersonnel(updated),
    });
  } catch (err: any) {
    return sendApiError(res, 500, 'INTERNAL_SERVER_ERROR', err.message);
  }
};

personnelRouter.patch('/personnel/:id/credentials', authorizeStaffManagement, updateCredentialsHandler);
personnelRouter.put('/personnel/:id/credentials', authorizeStaffManagement, updateCredentialsHandler);
personnelRouter.put('/personnel/:id/password', authorizeStaffManagement, updateCredentialsHandler);

// -------------------------------------------------------------
// PATCH /api/personnel/:id/status - Quick Activate / Suspend
// -------------------------------------------------------------
personnelRouter.patch('/personnel/:id/status', authorizeStaffManagement, async (req: any, res: any) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return sendApiError(res, 400, 'VALIDATION_ERROR', 'Invalid personnel ID');
    }

    const { status } = req.body;
    if (status !== 'active' && status !== 'suspended') {
      return sendApiError(res, 400, 'VALIDATION_ERROR', 'Status must be "active" or "suspended".');
    }

    const authActor = getAuthenticatedUser(req);
    const actor = authActor
      ? {
          id: authActor.id,
          userId: authActor.id,
          username: authActor.username,
          name: authActor.name,
          role: authActor.role,
          email: authActor.email,
          division: authActor.division,
        }
      : null;
    const actorUserId = authActor ? String(authActor.id) : null;
    const now = new Date();

    const [existing] = await db.select().from(personnel).where(eq(personnel.id, id));
    if (!existing) {
      return sendApiError(res, 404, 'NOT_FOUND', `Personnel with ID ${id} not found.`);
    }

    const updated = await withTransaction(async (tx) => {
      const [updatedRecord] = await tx
        .update(personnel)
        .set({
          status,
          updatedAt: now,
        })
        .where(eq(personnel.id, id))
        .returning();

      if (updatedRecord.userId) {
        await tx
          .update(users)
          .set({
            isActive: status === 'active',
            updatedAt: now,
          })
          .where(eq(users.id, updatedRecord.userId));
      } else if (updatedRecord.username) {
        await tx
          .update(users)
          .set({
            isActive: status === 'active',
            updatedAt: now,
          })
          .where(eq(users.username, updatedRecord.username));
      }

      await createAuditLog(
        {
          userId: actorUserId,
          actor,
          action: 'CHANGE_PERSONNEL_STATUS',
          entityType: 'personnel',
          entityId: String(id),
          oldValue: { status: existing.status },
          newValue: { status: updatedRecord.status },
        },
        tx
      );

      return updatedRecord;
    });

    return sendApiSuccess(res, { personnel: sanitizePersonnel(updated), staffMember: sanitizePersonnel(updated) });
  } catch (err: any) {
    return sendApiError(res, 500, 'INTERNAL_SERVER_ERROR', err.message);
  }
});

// -------------------------------------------------------------
// DELETE /api/personnel/:id (and alias /api/staff/:id) - System Admin only
// -------------------------------------------------------------
const deleteStaffHandler = async (req: any, res: any) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return sendApiError(res, 400, 'VALIDATION_ERROR', 'Invalid personnel ID');
    }

    const authActor = getAuthenticatedUser(req);
    const actor = authActor
      ? {
          id: authActor.id,
          userId: authActor.id,
          username: authActor.username,
          name: authActor.name,
          role: authActor.role,
          email: authActor.email,
          division: authActor.division,
        }
      : null;
    const actorUserId = authActor ? String(authActor.id) : null;

    const [existing] = await db.select().from(personnel).where(eq(personnel.id, id));
    if (!existing) {
      return sendApiError(res, 404, 'NOT_FOUND', `Personnel with ID ${id} not found.`);
    }

    // Safety guard: prevent accidental deletion of core development or primary system admin
    if (existing.username === 'dev_admin' || existing.email === 'dev-admin@localhost.test') {
      return sendApiError(res, 403, 'FORBIDDEN', 'The primary system admin account is protected and cannot be deleted.');
    }

    const deleted = await withTransaction(async (tx) => {
      const [deletedRecord] = await tx
        .delete(personnel)
        .where(eq(personnel.id, id))
        .returning();

      // Deactivate linked auth account
      if (deletedRecord.userId) {
        await tx.update(users).set({ isActive: false, updatedAt: new Date() }).where(eq(users.id, deletedRecord.userId));
      }

      await createAuditLog(
        {
          userId: actorUserId,
          actor,
          action: 'DELETE_PERSONNEL',
          entityType: 'personnel',
          entityId: String(id),
          oldValue: sanitizePersonnel(existing),
        },
        tx
      );

      return deletedRecord;
    });

    return sendApiSuccess(res, { message: 'Personnel deleted successfully', personnel: sanitizePersonnel(deleted) });
  } catch (err: any) {
    return sendApiError(res, 500, 'INTERNAL_SERVER_ERROR', err.message);
  }
};

personnelRouter.delete('/personnel/:id', authorizeStaffManagement, deleteStaffHandler);
personnelRouter.delete('/staff/:id', authorizeStaffManagement, deleteStaffHandler);

