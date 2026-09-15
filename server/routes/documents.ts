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
  addDocumentClearance,
  DocumentConflictError,
  DocumentNotFoundError,
  DocumentValidationError,
} from '../services/documentService.ts';
import { sendApiSuccess, sendApiError } from '../middleware/errorHandler.ts';

export const documentsRouter = Router();

// -------------------------------------------------------------
// GET /api/documents - List all documents with optional filtering & pagination
// -------------------------------------------------------------
documentsRouter.get('/documents', async (req: any, res) => {
  try {
    const { page, pageSize, search, status, division, priority, sort, sortDirection } = req.query;
    const result = await getAllDocuments({
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      search: search ? String(search) : undefined,
      status: status ? String(status) : undefined,
      division: division ? String(division) : undefined,
      priority: priority ? String(priority) : undefined,
      sort: sort ? String(sort) : undefined,
      sortDirection: sortDirection === 'asc' ? 'asc' : 'desc',
    });

    if (result && typeof result === 'object' && 'totalPages' in result) {
      return sendApiSuccess(res, {
        documents: result.documents,
        count: result.totalCount,
        pagination: {
          page: result.page,
          pageSize: result.pageSize,
          totalCount: result.totalCount,
          totalPages: result.totalPages,
        },
      });
    }

    return sendApiSuccess(res, { documents: result, count: result.length });
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
documentsRouter.post('/documents', async (req: any, res) => {
  try {
    const userId = req.user?.uid || req.user?.email || 'system';

    // Support legacy bulk sync if requested
    if (req.body.documents && Array.isArray(req.body.documents)) {
      const docsData = req.body.documents;
      let count = 0;
      for (const d of docsData) {
        if (!d.trackingNumber || !d.title) continue;
        const existing = await db.select().from(documents).where(eq(documents.trackingNumber, d.trackingNumber));
        if (existing.length > 0) {
          await updateExistingDocument(existing[0].id, d, undefined, userId);
        } else {
          await createNewDocument(d, userId);
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
        const updated = await updateExistingDocument(existing[0].id, doc, doc.version, userId);
        return sendApiSuccess(res, { document: updated });
      } else {
        const created = await createNewDocument(doc, userId);
        return sendApiSuccess(res, { document: created }, 201);
      }
    }

    // Standard RESTful creation
    const created = await createNewDocument(req.body, userId);
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
// PUT /api/documents/:id - Update document with optimistic locking
// -------------------------------------------------------------
documentsRouter.put('/documents/:id', async (req: any, res) => {
  try {
    const userId = req.user?.uid || req.user?.email || 'system';
    const clientVersion = req.body.version !== undefined ? Number(req.body.version) : undefined;
    const updated = await updateExistingDocument(req.params.id, req.body, clientVersion, userId);
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
// DELETE /api/documents/:id - Delete document
// -------------------------------------------------------------
documentsRouter.delete('/documents/:id', async (req: any, res) => {
  try {
    const userId = req.user?.uid || req.user?.email || 'system';
    await deleteDocumentById(req.params.id, userId);
    return sendApiSuccess(res, { message: 'Document deleted successfully' });
  } catch (err: any) {
    if (err instanceof DocumentNotFoundError) {
      return sendApiError(res, 404, 'NOT_FOUND', err.message);
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
// POST /api/documents/:id/movements - Route document (Transactional)
// -------------------------------------------------------------
documentsRouter.post('/documents/:id/movements', async (req: any, res) => {
  try {
    const { personnelName, personnelRole, currentDesk, forwardToDesk, statusUpdate, notes, fromDepartment, toDepartment } = req.body;
    if (!personnelName || !forwardToDesk || !statusUpdate) {
      return sendApiError(res, 400, 'VALIDATION_ERROR', 'personnelName, forwardToDesk, and statusUpdate are required.');
    }

    const userId = req.user?.uid || req.user?.email || personnelName;
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
      },
      userId
    );

    return sendApiSuccess(res, result, 201);
  } catch (err: any) {
    if (err instanceof DocumentNotFoundError) {
      return sendApiError(res, 404, 'NOT_FOUND', err.message);
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
// POST /api/documents/:id/remarks - Add supervisor remark
// -------------------------------------------------------------
documentsRouter.post('/documents/:id/remarks', async (req: any, res) => {
  try {
    const { supervisorName, remarkText, complianceRequired, complianceNotes } = req.body;
    if (!supervisorName || !remarkText) {
      return sendApiError(res, 400, 'VALIDATION_ERROR', 'supervisorName and remarkText are required.');
    }

    const userId = req.user?.uid || req.user?.email || supervisorName;
    const remark = await addDocumentRemark(
      req.params.id,
      {
        supervisorName,
        remarkText,
        complianceRequired,
        complianceNotes,
      },
      userId
    );

    return sendApiSuccess(res, { remark }, 201);
  } catch (err: any) {
    if (err instanceof DocumentNotFoundError) {
      return sendApiError(res, 404, 'NOT_FOUND', err.message);
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
// POST /api/documents/:id/clearance - Record or revoke manager clearance
// -------------------------------------------------------------
documentsRouter.post('/documents/:id/clearance', async (req: any, res) => {
  try {
    const { clearedBy, clearanceType, exitTrackingNumber, forwardedToExternal, clearanceRemarks, isCleared } = req.body;
    if (!clearedBy) {
      return sendApiError(res, 400, 'VALIDATION_ERROR', 'clearedBy is required.');
    }

    const userId = req.user?.uid || req.user?.email || clearedBy;
    const result = await addDocumentClearance(
      req.params.id,
      {
        clearedBy,
        clearanceType,
        exitTrackingNumber,
        forwardedToExternal,
        clearanceRemarks,
        isCleared: isCleared !== undefined ? !!isCleared : true,
      },
      userId
    );

    return sendApiSuccess(res, result, 201);
  } catch (err: any) {
    if (err instanceof DocumentNotFoundError) {
      return sendApiError(res, 404, 'NOT_FOUND', err.message);
    }
    return sendApiError(res, 500, 'INTERNAL_SERVER_ERROR', err.message);
  }
});

