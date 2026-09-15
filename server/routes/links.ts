import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.ts';
import { dedicatedLinks } from '../db/schema.ts';
import { sendApiSuccess, sendApiError } from '../middleware/errorHandler.ts';
import { authorizeSettingsManagement } from '../middleware/authorize.ts';

export const linksRouter = Router();

linksRouter.get('/links', async (req, res) => {
  try {
    const links = await db.select().from(dedicatedLinks);
    return sendApiSuccess(res, { links });
  } catch (err: any) {
    return sendApiError(res, 500, 'INTERNAL_SERVER_ERROR', err.message);
  }
});

linksRouter.post('/links', authorizeSettingsManagement, async (req, res) => {
  try {
    // Array of links
    if (Array.isArray(req.body)) {
      for (const l of req.body) {
        if (!l.id || !l.title || !l.url) continue;
        await db
          .insert(dedicatedLinks)
          .values({
            id: l.id,
            title: l.title,
            url: l.url,
            category: l.category || 'General',
            icon: l.icon || 'ExternalLink',
            description: l.description || null,
            orderIndex: l.orderIndex || 0,
            isActive: l.isActive !== undefined ? l.isActive : true,
          })
          .onConflictDoUpdate({
            target: dedicatedLinks.id,
            set: {
              title: l.title,
              url: l.url,
              category: l.category || 'General',
              icon: l.icon || 'ExternalLink',
              description: l.description || null,
              orderIndex: l.orderIndex || 0,
              isActive: l.isActive !== undefined ? l.isActive : true,
            },
          });
      }
      return sendApiSuccess(res, { message: 'Links updated successfully.' });
    }

    const l = req.body;
    if (!l.id || !l.title || !l.url) {
      return sendApiError(res, 400, 'VALIDATION_ERROR', 'id, title, and url are required.');
    }

    const [created] = await db
      .insert(dedicatedLinks)
      .values({
        id: l.id,
        title: l.title,
        url: l.url,
        category: l.category || 'General',
        icon: l.icon || 'ExternalLink',
        description: l.description || null,
        orderIndex: l.orderIndex || 0,
        isActive: l.isActive !== undefined ? l.isActive : true,
      })
      .onConflictDoUpdate({
        target: dedicatedLinks.id,
        set: {
          title: l.title,
          url: l.url,
          category: l.category || 'General',
          icon: l.icon || 'ExternalLink',
          description: l.description || null,
          orderIndex: l.orderIndex || 0,
          isActive: l.isActive !== undefined ? l.isActive : true,
        },
      })
      .returning();

    return sendApiSuccess(res, { link: created }, 201);
  } catch (err: any) {
    return sendApiError(res, 500, 'INTERNAL_SERVER_ERROR', err.message);
  }
});

// PUT /api/links/:id - Update link
linksRouter.put('/links/:id', authorizeSettingsManagement, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, url, category, icon, description, orderIndex, isActive } = req.body;

    const [updated] = await db
      .update(dedicatedLinks)
      .set({
        title,
        url,
        category,
        icon,
        description,
        orderIndex,
        isActive,
      })
      .where(eq(dedicatedLinks.id, id))
      .returning();

    if (!updated) {
      return sendApiError(res, 404, 'NOT_FOUND', `Link with ID "${id}" not found.`);
    }

    return sendApiSuccess(res, { link: updated });
  } catch (err: any) {
    return sendApiError(res, 500, 'INTERNAL_SERVER_ERROR', err.message);
  }
});

// DELETE /api/links/:id - Delete link
linksRouter.delete('/links/:id', authorizeSettingsManagement, async (req, res) => {
  try {
    const { id } = req.params;
    await db.delete(dedicatedLinks).where(eq(dedicatedLinks.id, id));
    return sendApiSuccess(res, { message: 'Link deleted successfully' });
  } catch (err: any) {
    return sendApiError(res, 500, 'INTERNAL_SERVER_ERROR', err.message);
  }
});

