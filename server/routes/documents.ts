import { Router } from 'express';
import { eq, desc, asc } from 'drizzle-orm';
import { db } from '../db/index.ts';
import { documentMovements, documentRemarks, documents, managerClearances } from '../db/schema.ts';
import {
  getAllDocuments,
  getDocumentById,
  createNewDocument,
  updateExistingDocument,
  deleteDocumentById,
  routeDocumentWithTransaction,
  addDocumentRemark,
  fulfillDocumentCompliance,
  addDocumentClearance,
  revokeDocumentClearance,
  DocumentConflictError,
  DocumentNotFoundError,
  DocumentValidationError,
} from '../services/documentService.ts';
import { sendApiSuccess, sendApiError } from '../middleware/errorHandler.ts';
import {
  getAuthenticatedUser,
  authorizeDocumentCreation,
  authorizeDocumentDeletion,
  authorizeDocumentMovement,
  authorizeSupervisorRemarks,
  authorizeManagerClearance,
} from '../middleware/authorize.ts';

export const documentsRouter = Router();

// -------------------------------------------------------------
// GET /api/documents - List all documents with optional filtering & pagination
// -------------------------------------------------------------
documentsRouter.get('/documents', async (req: any, res) => {
  try {
    const { page, pageSize, search, status, division, priority, viewMode, sort, sortDirection } = req.query;
    const result = await getAllDocuments({
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      search: search ? String(search) : undefined,
      status: status ? String(status) : undefined,
      division: division ? String(division) : undefined,
      priority: priority ? String(priority) : undefined,
      viewMode: viewMode ? String(viewMode) : undefined,
      sort: sort ? String(sort) : undefined,
      sortDirection: sortDirection === 'asc' ? 'asc' : 'desc',
    });

    if (result && typeof result === 'object' && 'totalPages' in result) {
      return sendApiSuccess(res, {
        documents: result.documents,
        count: result.totalCount,
        totalCount: result.totalCount,
        totalMonitoredCount: result.totalMonitoredCount,
        page: result.page,
        pageSize: result.pageSize,
        totalPages: result.totalPages,
        pagination: {
          page: result.page,
          pageSize: result.pageSize,
          totalCount: result.totalCount,
          totalMonitoredCount: result.totalMonitoredCount,
          totalPages: result.totalPages,
        },
      });
    }

    return sendApiSuccess(res, {
      documents: result,
      count: result.length,
      totalCount: result.length,
    });
  } catch (err: any) {
    return sendApiError(res, 500, 'INTERNAL_SERVER_ERROR', err.message);
  }
});

// -------------------------------------------------------------
// GET /api/documents/:id - Get single document
// -------------------------------------------------------------
documentsRouter.get('/documents/:id', async (req: any, res) => {
  try {
    const doc = await getDocumentById(req.params.id);
    return sendApiSuccess(res, { document: doc });
  } catch (err: any) {
    if (err instanceof DocumentNotFoundError) {
      return sendApiError(res, 404, 'NOT_FOUND', err.message);
    }
    return sendApiError(res, 500, 'INTERNAL_SERVER_ERROR', err.message);
  }
});

// -------------------------------------------------------------
// POST /api/documents - Create document OR Bulk Sync
// -------------------------------------------------------------
documentsRouter.post('/documents', authorizeDocumentCreation, async (req: any, res) => {
  try {
    const user = getAuthenticatedUser(req)!;
    const userId = String(user.id);
    const actor = {
      id: user.id,
      userId: user.id,
      name: user.name || user.email,
      role: user.role,
      email: user.email,
      division: user.division,
    };
    const authorName = user.name || user.email;

    // Support legacy bulk sync if requested
    if (req.body.documents && Array.isArray(req.body.documents)) {
      const docsData = req.body.documents;
      let count = 0;
      for (const d of docsData) {
        if (!d.trackingNumber || !d.title) continue;
        const existing = await db.select().from(documents).where(eq(documents.trackingNumber, d.trackingNumber));
        if (existing.length > 0) {
          await updateExistingDocument(existing[0].id, { ...d, updatedBy: authorName }, undefined, userId, actor);
        } else {
          await createNewDocument({ ...d, createdBy: authorName }, userId, actor);
        }
        count++;
      }
      return sendApiSuccess(res, { count, message: `Successfully synchronized ${count} documents.` }, 200);
    }

    // Support legacy { action: 'saveDocument', payload: doc }
    if (req.body.action === 'saveDocument' && req.body.payload) {
      const doc = req.body.payload;
      const existing = await db.select().from(documents).where(eq(documents.trackingNumber, doc.trackingNumber));
      if (existing.length > 0) {
        const updated = await updateExistingDocument(existing[0].id, { ...doc, updatedBy: authorName }, doc.version, userId, actor);
        return sendApiSuccess(res, { document: updated });
      } else {
        const created = await createNewDocument({ ...doc, createdBy: authorName }, userId, actor);
        return sendApiSuccess(res, { document: created }, 201);
      }
    }

    // Standard RESTful creation
    const created = await createNewDocument({ ...req.body, createdBy: authorName }, userId, actor);
    return sendApiSuccess(res, { document: created }, 201);
  } catch (err: any) {
    if (err instanceof DocumentValidationError) {
      return sendApiError(res, 400, 'VALIDATION_ERROR', err.message);
    }
    if (err instanceof DocumentConflictError) {
      return sendApiError(res, 409, 'CONFLICT', err.message);
    }
    return sendApiError(res, 500, 'INTERNAL_SERVER_ERROR', err.message);
  }
});

// -------------------------------------------------------------
// PUT /api/documents/:id - Update document with optimistic locking & RBAC
// -------------------------------------------------------------
documentsRouter.put('/documents/:id', async (req: any, res) => {
  try {
    const user = getAuthenticatedUser(req);
    if (!user) {
      return sendApiError(res, 401, 'UNAUTHORIZED', 'Authentication credentials missing or invalid.');
    }

    // 1. Fundamental edit permission check
    if (!user.permissions.canEditDocument) {
      return sendApiError(res, 403, 'FORBIDDEN', `Access denied: Role "${user.role}" cannot edit documents.`);
    }

    const oldDocs = await db.select().from(documents).where(eq(documents.id, req.params.id));
    if (oldDocs.length === 0) {
        return sendApiError(res, 404, 'NOT_FOUND', 'Document not found');
    }
    const oldDoc = oldDocs[0];

    // 2. Prevent privilege escalation: Clearance operations require canAuthorizeClearance
    const attemptsClearanceStatusChange = 
      (req.body.currentStatus === 'Cleared for Out' || req.body.currentStatus === 'Dispatched / Completed') && 
      oldDoc.currentStatus !== req.body.currentStatus;
      
    const attemptsClearanceFlag = 
        (req.body.isCleared === true && oldDoc.isCleared !== true) ||
        (req.body.managerClearance?.isCleared === true && oldDoc.isCleared !== true);

    if ((attemptsClearanceStatusChange || attemptsClearanceFlag) && !user.permissions.canAuthorizeClearance) {
      return sendApiError(
        res,
        403,
        'FORBIDDEN',
        'Access denied: Only executive management (Department Manager, System Admin) can grant clearance or dispatch documents.'
      );
    }

    // 3. Prevent privilege escalation on supervisor directives & compliance
    if (Array.isArray(req.body.supervisorRemarks)) {
      const prevRemarks = await db.select().from(documentRemarks).where(eq(documentRemarks.documentId, req.params.id));
      const prevRemarkIds = new Set(prevRemarks.map((r) => r.id));
      
      const hasNewRemarks = req.body.supervisorRemarks.some((r: any) => !prevRemarkIds.has(r.id));
      if (hasNewRemarks && !user.permissions.canIssueSupervisorRemarks) {
        return sendApiError(
          res,
          403,
          'FORBIDDEN',
          'Access denied: Only supervisory roles (Supervisor, Division Manager, Department Manager, System Admin) can issue directives.'
        );
      }
      
      const hasComplianceAttempt = req.body.supervisorRemarks.some((r: any) => {
        if (r.complied !== true) return false;
        const prev = prevRemarks.find(pr => pr.id === r.id);
        if (!prev) return false;
        return prev.complied !== true;
      });
      
      if (hasComplianceAttempt && !user.permissions.canFulfillCompliance) {
        return sendApiError(
          res,
          403,
          'FORBIDDEN',
          `Access denied: Role "${user.role}" is not authorized to fulfill compliance requirements.`
        );
      }
    }
    const userId = String(user.id);
    const actor = {
      id: user.id,
      userId: user.id,
      name: user.name || user.email,
      role: user.role,
      email: user.email,
      division: user.division,
    };
    const clientVersion =
      req.body.expectedVersion !== undefined
        ? Number(req.body.expectedVersion)
        : req.body.baseVersion !== undefined
        ? Number(req.body.baseVersion)
        : req.body.version !== undefined
        ? Number(req.body.version)
        : undefined;
    const updated = await updateExistingDocument(req.params.id, req.body, clientVersion, userId, actor);
    return sendApiSuccess(res, { document: updated });
  } catch (err: any) {
    if (err instanceof DocumentNotFoundError) {
      return sendApiError(res, 404, 'NOT_FOUND', err.message);
    }
    if (err instanceof DocumentConflictError) {
      return sendApiError(res, 409, 'CONCURRENCY_CONFLICT', err.message);
    }
    if (err instanceof DocumentValidationError) {
      return sendApiError(res, 400, 'VALIDATION_ERROR', err.message);
    }
    return sendApiError(res, 500, 'INTERNAL_SERVER_ERROR', err.message);
  }
});

// -------------------------------------------------------------
// POST /api/documents/batch-update - Atomic/Per-item batch update with optimistic concurrency
// -------------------------------------------------------------
documentsRouter.post('/documents/batch-update', async (req: any, res) => {
  try {
    const user = getAuthenticatedUser(req);
    if (!user) {
      return sendApiError(res, 401, 'UNAUTHORIZED', 'Authentication credentials missing or invalid.');
    }

    if (!user.permissions.canEditDocument) {
      return sendApiError(res, 403, 'FORBIDDEN', `Access denied: Role "${user.role}" cannot edit documents.`);
    }

    const { updates } = req.body;
    if (!Array.isArray(updates) || updates.length === 0) {
      return sendApiError(res, 400, 'VALIDATION_ERROR', 'Field "updates" must be a non-empty array.');
    }

    const userId = String(user.id);
    const actor = {
      id: user.id,
      userId: user.id,
      name: user.name || user.email,
      role: user.role,
      email: user.email,
      division: user.division,
    };
    const results: Array<{
      id: string;
      trackingNumber?: string;
      status: 'successful' | 'failed';
      document?: any;
      error?: { code: string; message: string; isConflict?: boolean };
    }> = [];

    let succeeded = 0;
    let failed = 0;

    for (const item of updates) {
      if (!item || !item.id) {
        results.push({
          id: item?.id || 'unknown',
          status: 'failed',
          error: { code: 'VALIDATION_ERROR', message: 'Missing document id in batch item' },
        });
        failed++;
        continue;
      }

      // Check clearance permission if clearance attempted
      const attemptsClearance =
        item.data?.managerClearance !== undefined ||
        item.data?.isCleared !== undefined ||
        item.data?.currentStatus === 'Cleared for Out' ||
        item.data?.currentStatus === 'Dispatched / Completed';

      if (attemptsClearance && !user.permissions.canAuthorizeClearance) {
        results.push({
          id: item.id,
          trackingNumber: item.data?.trackingNumber,
          status: 'failed',
          error: {
            code: 'FORBIDDEN',
            message: `Access denied: Role "${user.role}" is not authorized to grant executive manager clearance.`,
          },
        });
        failed++;
        continue;
      }

      const clientVersion =
        item.expectedVersion !== undefined
          ? Number(item.expectedVersion)
          : item.baseVersion !== undefined
          ? Number(item.baseVersion)
          : item.data?.version !== undefined
          ? Number(item.data.version)
          : undefined;

      try {
        const updated = await updateExistingDocument(item.id, item.data || item, clientVersion, userId, actor);
        results.push({
          id: item.id,
          trackingNumber: updated.trackingNumber,
          status: 'successful',
          document: updated,
        });
        succeeded++;
      } catch (err: any) {
        failed++;
        if (err instanceof DocumentConflictError) {
          // Fetch current document so caller has authoritative state
          let currentDoc: any = null;
          try {
            currentDoc = await getDocumentById(item.id);
          } catch {}
          results.push({
            id: item.id,
            trackingNumber: currentDoc?.trackingNumber || item.data?.trackingNumber,
            status: 'failed',
            document: currentDoc,
            error: {
              code: 'CONCURRENCY_CONFLICT',
              message: err.message,
              isConflict: true,
            },
          });
        } else if (err instanceof DocumentNotFoundError) {
          results.push({
            id: item.id,
            status: 'failed',
            error: { code: 'NOT_FOUND', message: err.message },
          });
        } else if (err instanceof DocumentValidationError) {
          results.push({
            id: item.id,
            status: 'failed',
            error: { code: 'VALIDATION_ERROR', message: err.message },
          });
        } else {
          results.push({
            id: item.id,
            status: 'failed',
            error: { code: 'INTERNAL_SERVER_ERROR', message: err.message || 'Update failed' },
          });
        }
      }
    }

    return sendApiSuccess(res, {
      total: updates.length,
      succeeded,
      failed,
      results,
    });
  } catch (err: any) {
    return sendApiError(res, 500, 'INTERNAL_SERVER_ERROR', err.message);
  }
});

// -------------------------------------------------------------
// POST /api/documents/batch-delete - Authorized Batch Deletion
// -------------------------------------------------------------
documentsRouter.post('/documents/batch-delete', authorizeDocumentDeletion, async (req: any, res) => {
  try {
    const user = getAuthenticatedUser(req)!;
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return sendApiError(res, 400, 'VALIDATION_ERROR', 'Field "ids" must be a non-empty array of document IDs.');
    }

    const userId = String(user.id);
    const actor = {
      id: user.id,
      userId: user.id,
      name: user.name || user.email,
      role: user.role,
      email: user.email,
      division: user.division,
    };
    const results: Array<{ id: string; status: 'successful' | 'failed'; error?: { code: string; message: string } }> = [];
    let succeeded = 0;
    let failed = 0;

    for (const id of ids) {
      try {
        await deleteDocumentById(id, userId, actor);
        results.push({ id, status: 'successful' });
        succeeded++;
      } catch (err: any) {
        if (err instanceof DocumentNotFoundError) {
          // Already deleted in PostgreSQL
          results.push({ id, status: 'successful' });
          succeeded++;
        } else {
          results.push({
            id,
            status: 'failed',
            error: { code: 'INTERNAL_SERVER_ERROR', message: err.message || 'Failed to delete' },
          });
          failed++;
        }
      }
    }

    return sendApiSuccess(res, {
      total: ids.length,
      succeeded,
      failed,
      results,
    });
  } catch (err: any) {
    return sendApiError(res, 500, 'INTERNAL_SERVER_ERROR', err.message);
  }
});

// -------------------------------------------------------------
// DELETE /api/documents/:id - Delete document (Executive authorization)
// -------------------------------------------------------------
documentsRouter.delete('/documents/:id', authorizeDocumentDeletion, async (req: any, res) => {
  try {
    const user = getAuthenticatedUser(req)!;
    const userId = String(user.id);
    const actor = {
      id: user.id,
      userId: user.id,
      name: user.name || user.email,
      role: user.role,
      email: user.email,
      division: user.division,
    };
    const expectedVersion =
      req.body?.expectedVersion !== undefined
        ? Number(req.body.expectedVersion)
        : req.body?.version !== undefined
        ? Number(req.body.version)
        : req.query?.expectedVersion !== undefined
        ? Number(req.query.expectedVersion)
        : req.query?.version !== undefined
        ? Number(req.query.version)
        : undefined;

    await deleteDocumentById(req.params.id, userId, actor, expectedVersion);
    return sendApiSuccess(res, { message: 'Document deleted successfully' });
  } catch (err: any) {
    if (err instanceof DocumentNotFoundError) {
      return sendApiError(res, 404, 'NOT_FOUND', err.message);
    }
    if (err instanceof DocumentConflictError) {
      return sendApiError(res, 409, 'CONCURRENCY_CONFLICT', err.message);
    }
    return sendApiError(res, 500, 'INTERNAL_SERVER_ERROR', err.message);
  }
});

// -------------------------------------------------------------
// GET /api/documents/:id/movements - List movements for document
// -------------------------------------------------------------
documentsRouter.get('/documents/:id/movements', async (req: any, res) => {
  try {
    const movements = await db
      .select()
      .from(documentMovements)
      .where(eq(documentMovements.documentId, req.params.id))
      .orderBy(asc(documentMovements.timestamp), asc(documentMovements.createdAt), asc(documentMovements.id));

    return sendApiSuccess(res, { movements });
  } catch (err: any) {
    return sendApiError(res, 500, 'INTERNAL_SERVER_ERROR', err.message);
  }
});

// -------------------------------------------------------------
// POST /api/documents/:id/movements - Route document (Transactional & Authorized)
// -------------------------------------------------------------
documentsRouter.post('/documents/:id/movements', authorizeDocumentMovement, async (req: any, res) => {
  try {
    const user = getAuthenticatedUser(req)!;
    const { currentDesk, forwardToDesk, statusUpdate, notes, fromDepartment, toDepartment, fromPersonnelId, toPersonnelId, fromDeskId, toDeskId } = req.body;
    if (!forwardToDesk || !statusUpdate) {
      return sendApiError(res, 400, 'VALIDATION_ERROR', 'forwardToDesk and statusUpdate are required.');
    }

    // Authoritative actor identity strictly enforced from authenticated JWT
    const personnelName = user.name;
    const personnelRole = user.role;
    const userId = String(user.id);
    const actor = {
      id: user.id,
      userId: user.id,
      name: user.name || user.email,
      role: user.role,
      email: user.email,
      division: user.division,
    };
    const expectedVersion =
      req.body.expectedVersion !== undefined
        ? Number(req.body.expectedVersion)
        : req.body.baseVersion !== undefined
        ? Number(req.body.baseVersion)
        : req.body.version !== undefined
        ? Number(req.body.version)
        : req.query.expectedVersion !== undefined
        ? Number(req.query.expectedVersion)
        : undefined;

    const result = await routeDocumentWithTransaction(
      req.params.id,
      {
        personnelName,
        personnelRole,
        currentDesk: currentDesk || 'Receiving Desk',
        forwardToDesk,
        statusUpdate,
        notes,
        fromDepartment,
        toDepartment,
        fromPersonnelId,
        toPersonnelId,
        actorUserId: Number(user.id) || undefined,
        fromDeskId,
        toDeskId,
      },
      userId,
      actor,
      expectedVersion
    );

    return sendApiSuccess(res, result, 201);
  } catch (err: any) {
    if (err instanceof DocumentNotFoundError) {
      return sendApiError(res, 404, 'NOT_FOUND', err.message);
    }
    if (err instanceof DocumentConflictError) {
      return sendApiError(res, 409, 'CONCURRENCY_CONFLICT', err.message);
    }
    if (err instanceof DocumentValidationError) {
      return sendApiError(res, 400, 'VALIDATION_ERROR', err.message);
    }
    return sendApiError(res, 500, 'INTERNAL_SERVER_ERROR', err.message);
  }
});

// -------------------------------------------------------------
// GET /api/documents/:id/remarks - List remarks for document
// -------------------------------------------------------------
documentsRouter.get('/documents/:id/remarks', async (req: any, res) => {
  try {
    const remarks = await db
      .select()
      .from(documentRemarks)
      .where(eq(documentRemarks.documentId, req.params.id))
      .orderBy(desc(documentRemarks.timestamp));

    return sendApiSuccess(res, { remarks });
  } catch (err: any) {
    return sendApiError(res, 500, 'INTERNAL_SERVER_ERROR', err.message);
  }
});

// -------------------------------------------------------------
// POST /api/documents/:id/remarks - Add supervisor remark (Authorized)
// -------------------------------------------------------------
documentsRouter.post('/documents/:id/remarks', authorizeSupervisorRemarks, async (req: any, res) => {
  try {
    const user = getAuthenticatedUser(req)!;
    const { remarkText, complianceRequired, complianceNotes, supervisorPersonnelId } = req.body;
    if (!remarkText || !remarkText.trim()) {
      return sendApiError(res, 400, 'VALIDATION_ERROR', 'remarkText is required.');
    }

    // Authoritative supervisor identity strictly enforced from authenticated JWT
    const supervisorName = user.name;
    const userId = String(user.id);
    const actor = {
      id: user.id,
      userId: user.id,
      name: user.name || user.email,
      role: user.role,
      email: user.email,
      division: user.division,
    };
    const expectedVersion =
      req.body.expectedVersion !== undefined
        ? Number(req.body.expectedVersion)
        : req.body.baseVersion !== undefined
        ? Number(req.body.baseVersion)
        : req.body.version !== undefined
        ? Number(req.body.version)
        : req.query.expectedVersion !== undefined
        ? Number(req.query.expectedVersion)
        : undefined;

    const remark = await addDocumentRemark(
      req.params.id,
      {
        supervisorName,
        remarkText: remarkText.trim(),
        complianceRequired: !!complianceRequired,
        complianceNotes: complianceNotes?.trim() || null,
        supervisorUserId: Number(user.id) || undefined,
        supervisorPersonnelId: supervisorPersonnelId ? Number(supervisorPersonnelId) : undefined,
      },
      userId,
      actor,
      expectedVersion
    );

    return sendApiSuccess(res, { remark }, 201);
  } catch (err: any) {
    if (err instanceof DocumentNotFoundError) {
      return sendApiError(res, 404, 'NOT_FOUND', err.message);
    }
    if (err instanceof DocumentConflictError) {
      return sendApiError(res, 409, 'CONCURRENCY_CONFLICT', err.message);
    }
    if (err instanceof DocumentValidationError) {
      return sendApiError(res, 400, 'VALIDATION_ERROR', err.message);
    }
    return sendApiError(res, 500, 'INTERNAL_SERVER_ERROR', err.message);
  }
});

// -------------------------------------------------------------
// PUT /api/documents/:id/remarks/:remarkId/compliance - Fulfill compliance (Authorized)
// -------------------------------------------------------------
documentsRouter.put('/documents/:id/remarks/:remarkId/compliance', async (req: any, res) => {
  try {
    const user = getAuthenticatedUser(req);
    if (!user) {
      return sendApiError(res, 401, 'UNAUTHORIZED', 'Authentication credentials missing or invalid.');
    }
    if (!user.permissions.canFulfillCompliance) {
      return sendApiError(res, 403, 'FORBIDDEN', `Access denied: Role "${user.role}" is not authorized to fulfill compliance requirements.`);
    }

    const { complianceNotes } = req.body;
    const userId = String(user.id);
    const actor = {
      id: user.id,
      userId: user.id,
      name: user.name || user.email,
      role: user.role,
      email: user.email,
      division: user.division,
    };
    const expectedVersion =
      req.body?.expectedVersion !== undefined
        ? Number(req.body.expectedVersion)
        : req.body?.version !== undefined
        ? Number(req.body.version)
        : req.query?.expectedVersion !== undefined
        ? Number(req.query.expectedVersion)
        : undefined;

    const result = await fulfillDocumentCompliance(
      req.params.id,
      req.params.remarkId,
      complianceNotes || '',
      userId,
      actor,
      expectedVersion
    );

    return sendApiSuccess(res, result);
  } catch (err: any) {
    if (err instanceof DocumentNotFoundError) {
      return sendApiError(res, 404, 'NOT_FOUND', err.message);
    }
    if (err instanceof DocumentConflictError) {
      return sendApiError(res, 409, 'CONCURRENCY_CONFLICT', err.message);
    }
    if (err instanceof DocumentValidationError) {
      return sendApiError(res, 400, 'VALIDATION_ERROR', err.message);
    }
    return sendApiError(res, 500, 'INTERNAL_SERVER_ERROR', err.message);
  }
});

// -------------------------------------------------------------
// GET /api/documents/:id/clearance - Get manager clearance for document
// -------------------------------------------------------------
documentsRouter.get('/documents/:id/clearance', async (req: any, res) => {
  try {
    const [clearance] = await db
      .select()
      .from(managerClearances)
      .where(eq(managerClearances.documentId, req.params.id));

    if (!clearance) {
      // Fallback to document record clearance columns
      const [doc] = await db.select().from(documents).where(eq(documents.id, req.params.id));
      if (!doc) {
        return sendApiError(res, 404, 'NOT_FOUND', `Document with ID ${req.params.id} not found.`);
      }
      if (!doc.isCleared) {
        return sendApiSuccess(res, { clearance: null, isCleared: false });
      }
      return sendApiSuccess(res, {
        clearance: {
          documentId: doc.id,
          isCleared: doc.isCleared,
          clearedBy: doc.clearedBy,
          clearedAt: doc.clearedAt,
          clearanceType: doc.clearanceType,
          exitTrackingNumber: doc.exitTrackingNumber,
          forwardedToExternal: doc.forwardedToExternal,
          clearanceRemarks: doc.clearanceRemarks,
        },
      });
    }

    return sendApiSuccess(res, { clearance });
  } catch (err: any) {
    return sendApiError(res, 500, 'INTERNAL_SERVER_ERROR', err.message);
  }
});

// -------------------------------------------------------------
// POST /api/documents/:id/clearance - Record manager clearance (Authorized)
// -------------------------------------------------------------
documentsRouter.post('/documents/:id/clearance', authorizeManagerClearance, async (req: any, res) => {
  try {
    const user = getAuthenticatedUser(req)!;
    const { clearanceType, exitTrackingNumber, forwardedToExternal, clearanceRemarks, isCleared, clearedByPersonnelId } = req.body;

    // Authoritative clearance identity strictly enforced from authenticated JWT
    const clearedBy = user.name;
    const userId = String(user.id);
    const actor = {
      id: user.id,
      userId: user.id,
      name: user.name || user.email,
      role: user.role,
      email: user.email,
      division: user.division,
    };
    const expectedVersion =
      req.body.expectedVersion !== undefined
        ? Number(req.body.expectedVersion)
        : req.body.baseVersion !== undefined
        ? Number(req.body.baseVersion)
        : req.body.version !== undefined
        ? Number(req.body.version)
        : req.query.expectedVersion !== undefined
        ? Number(req.query.expectedVersion)
        : undefined;

    const result = await addDocumentClearance(
      req.params.id,
      {
        clearedBy,
        clearanceType: clearanceType?.trim() || null,
        exitTrackingNumber: exitTrackingNumber?.trim() || null,
        forwardedToExternal: forwardedToExternal?.trim() || null,
        clearanceRemarks: clearanceRemarks?.trim() || null,
        isCleared: isCleared !== undefined ? !!isCleared : true,
        clearedByUserId: Number(user.id) || undefined,
        clearedByPersonnelId: clearedByPersonnelId ? Number(clearedByPersonnelId) : undefined,
      },
      userId,
      actor,
      expectedVersion
    );

    return sendApiSuccess(res, result, 201);
  } catch (err: any) {
    if (err instanceof DocumentNotFoundError) {
      return sendApiError(res, 404, 'NOT_FOUND', err.message);
    }
    if (err instanceof DocumentConflictError) {
      return sendApiError(res, 409, 'CONCURRENCY_CONFLICT', err.message);
    }
    if (err instanceof DocumentValidationError) {
      return sendApiError(res, 400, 'VALIDATION_ERROR', err.message);
    }
    return sendApiError(res, 500, 'INTERNAL_SERVER_ERROR', err.message);
  }
});

// -------------------------------------------------------------
// DELETE /api/documents/:id/clearance - Revoke/return manager clearance (Authorized)
// -------------------------------------------------------------
documentsRouter.delete('/documents/:id/clearance', authorizeManagerClearance, async (req: any, res) => {
  try {
    const user = getAuthenticatedUser(req)!;
    const userId = String(user.id);
    const actor = {
      id: user.id,
      userId: user.id,
      name: user.name || user.email,
      role: user.role,
      email: user.email,
      division: user.division,
    };
    const reason = req.body?.reason || req.query?.reason || 'Clearance revoked by executive manager.';
    const expectedVersion =
      req.body?.expectedVersion !== undefined
        ? Number(req.body.expectedVersion)
        : req.body?.version !== undefined
        ? Number(req.body.version)
        : req.query?.expectedVersion !== undefined
        ? Number(req.query.expectedVersion)
        : undefined;

    const result = await revokeDocumentClearance(
      req.params.id,
      {
        reason: String(reason),
        returnStatus: 'Under Review',
        expectedVersion,
      },
      userId,
      actor,
      expectedVersion
    );

    return sendApiSuccess(res, result);
  } catch (err: any) {
    if (err instanceof DocumentNotFoundError) {
      return sendApiError(res, 404, 'NOT_FOUND', err.message);
    }
    if (err instanceof DocumentConflictError) {
      return sendApiError(res, 409, 'CONCURRENCY_CONFLICT', err.message);
    }
    if (err instanceof DocumentValidationError) {
      return sendApiError(res, 400, 'VALIDATION_ERROR', err.message);
    }
    return sendApiError(res, 500, 'INTERNAL_SERVER_ERROR', err.message);
  }
});

