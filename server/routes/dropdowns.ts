import { Router, Request, Response } from 'express';
import {
  listDropdownOptions,
  getDropdownOptionsGrouped,
  getDropdownOptionById,
  createDropdownOption,
  updateDropdownOption,
  reorderDropdownOptions,
  deactivateDropdownOption,
  restoreDropdownOption,
  normalizeCategoryIdentifier,
  CATEGORY_METADATA,
  CANONICAL_DROPDOWN_CATEGORIES,
} from '../services/dropdownService.ts';
import { sendApiSuccess, sendApiError } from '../middleware/errorHandler.ts';
import { getAuthenticatedUser, requireRole } from '../middleware/authorize.ts';
import { AuthRequest } from '../middleware/auth.ts';

export const dropdownsRouter = Router();

// -------------------------------------------------------------
// 1. LIST CATEGORIES & METADATA
// -------------------------------------------------------------
dropdownsRouter.get('/dropdown-options/categories', (req: Request, res: Response) => {
  return sendApiSuccess(res, {
    categories: Object.values(CATEGORY_METADATA),
  });
});

// -------------------------------------------------------------
// 2. LIST GROUPED OPTIONS
// -------------------------------------------------------------
dropdownsRouter.get('/dropdown-options/grouped', async (req: Request, res: Response) => {
  try {
    const includeInactive = req.query.includeInactive === 'true' || req.query.include_inactive === 'true';
    const grouped = await getDropdownOptionsGrouped({ includeInactive });
    return sendApiSuccess(res, { dropdownOptions: grouped });
  } catch (err: any) {
    return sendApiError(res, 500, 'INTERNAL_SERVER_ERROR', err.message);
  }
});

// -------------------------------------------------------------
// 3. LIST ALL / FILTERED OPTIONS
// -------------------------------------------------------------
const listHandler = async (req: Request, res: Response) => {
  try {
    const category = req.query.category as string | undefined;
    const includeInactive = req.query.includeInactive === 'true' || req.query.include_inactive === 'true';

    if (category) {
      const canonical = normalizeCategoryIdentifier(category);
      if (!canonical) {
        return sendApiError(
          res,
          400,
          'INVALID_CATEGORY',
          `Invalid category "${category}". Must be one of: ${CANONICAL_DROPDOWN_CATEGORIES.join(', ')}`
        );
      }
    }

    const options = await listDropdownOptions({ category, includeInactive });
    return sendApiSuccess(res, { options, count: options.length });
  } catch (err: any) {
    return sendApiError(res, 500, 'INTERNAL_SERVER_ERROR', err.message);
  }
};

dropdownsRouter.get('/dropdown-options', listHandler);
dropdownsRouter.get('/dropdowns', listHandler);

// -------------------------------------------------------------
// 4. GET SINGLE OPTION BY ID
// -------------------------------------------------------------
dropdownsRouter.get('/dropdown-options/:id(\\d+)', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return sendApiError(res, 400, 'VALIDATION_ERROR', 'Invalid option ID.');
    }

    const option = await getDropdownOptionById(id);
    if (!option) {
      return sendApiError(res, 404, 'NOT_FOUND', `Dropdown option with ID ${id} not found.`);
    }

    return sendApiSuccess(res, { option });
  } catch (err: any) {
    return sendApiError(res, 500, 'INTERNAL_SERVER_ERROR', err.message);
  }
});

// -------------------------------------------------------------
// 5. CREATE OPTION (System Admin Only)
// -------------------------------------------------------------
dropdownsRouter.post(
  '/dropdown-options',
  requireRole('System Admin', 'Access denied: Only System Administrators can configure dropdown options.'),
  async (req: AuthRequest, res: Response) => {
    try {
      const user = getAuthenticatedUser(req);
      if (!user) {
        return sendApiError(res, 401, 'UNAUTHORIZED', 'Authentication credentials missing or invalid.');
      }

      const { category, value, label, sortOrder, isActive } = req.body;
      if (!category) {
        return sendApiError(res, 400, 'VALIDATION_ERROR', 'Category identifier is required.');
      }
      if (!value || typeof value !== 'string' || !value.trim()) {
        return sendApiError(res, 400, 'VALIDATION_ERROR', 'Option value is required.');
      }

      const created = await createDropdownOption(
        { category, value, label, sortOrder, isActive },
        { id: user.id, name: user.name, email: user.email, role: user.role }
      );

      return sendApiSuccess(res, { option: created }, 201);
    } catch (err: any) {
      const statusCode = err.statusCode || (err.code === 'DUPLICATE_OPTION' ? 409 : 400);
      const errorCode = err.code || 'DROPDOWN_CREATE_ERROR';
      return sendApiError(res, statusCode, errorCode, err.message);
    }
  }
);

// -------------------------------------------------------------
// 6. BATCH REORDER OPTIONS (System Admin Only)
// -------------------------------------------------------------
dropdownsRouter.put(
  '/dropdown-options/reorder',
  requireRole('System Admin', 'Access denied: Only System Administrators can reorder dropdown options.'),
  async (req: AuthRequest, res: Response) => {
    try {
      const user = getAuthenticatedUser(req);
      if (!user) {
        return sendApiError(res, 401, 'UNAUTHORIZED', 'Authentication credentials missing or invalid.');
      }

      const { items } = req.body;
      if (!Array.isArray(items) || items.length === 0) {
        return sendApiError(res, 400, 'VALIDATION_ERROR', 'An array of items with { id, sortOrder } is required.');
      }

      const updated = await reorderDropdownOptions(
        items,
        { id: user.id, name: user.name, email: user.email, role: user.role }
      );

      return sendApiSuccess(res, { options: updated });
    } catch (err: any) {
      return sendApiError(res, 500, 'INTERNAL_SERVER_ERROR', err.message);
    }
  }
);

// -------------------------------------------------------------
// 7. UPDATE OPTION (System Admin Only)
// -------------------------------------------------------------
const updateOptionHandler = async (req: AuthRequest, res: Response) => {
  try {
    const user = getAuthenticatedUser(req);
    if (!user) {
      return sendApiError(res, 401, 'UNAUTHORIZED', 'Authentication credentials missing or invalid.');
    }

    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return sendApiError(res, 400, 'VALIDATION_ERROR', 'Invalid option ID.');
    }

    const { value, label, sortOrder, isActive } = req.body;
    const updated = await updateDropdownOption(
      id,
      { value, label, sortOrder, isActive },
      { id: user.id, name: user.name, email: user.email, role: user.role }
    );

    return sendApiSuccess(res, { option: updated });
  } catch (err: any) {
    const statusCode = err.statusCode || (err.code === 'DUPLICATE_OPTION' ? 409 : 400);
    const errorCode = err.code || 'DROPDOWN_UPDATE_ERROR';
    return sendApiError(res, statusCode, errorCode, err.message);
  }
};

dropdownsRouter.put(
  '/dropdown-options/:id(\\d+)',
  requireRole('System Admin', 'Access denied: Only System Administrators can update dropdown options.'),
  updateOptionHandler
);

dropdownsRouter.patch(
  '/dropdown-options/:id(\\d+)',
  requireRole('System Admin', 'Access denied: Only System Administrators can update dropdown options.'),
  updateOptionHandler
);

// -------------------------------------------------------------
// 8. DEACTIVATE OPTION (Soft Delete - System Admin Only)
// -------------------------------------------------------------
const deactivateHandler = async (req: AuthRequest, res: Response) => {
  try {
    const user = getAuthenticatedUser(req);
    if (!user) {
      return sendApiError(res, 401, 'UNAUTHORIZED', 'Authentication credentials missing or invalid.');
    }

    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return sendApiError(res, 400, 'VALIDATION_ERROR', 'Invalid option ID.');
    }

    const deactivated = await deactivateDropdownOption(
      id,
      { id: user.id, name: user.name, email: user.email, role: user.role }
    );

    return sendApiSuccess(res, {
      option: deactivated,
      message: `Option "${deactivated.value}" in category "${deactivated.category}" has been deactivated. Historical document references remain intact.`,
    });
  } catch (err: any) {
    const statusCode = err.statusCode || 400;
    const errorCode = err.code || 'DROPDOWN_DEACTIVATE_ERROR';
    return sendApiError(res, statusCode, errorCode, err.message);
  }
};

dropdownsRouter.delete(
  '/dropdown-options/:id(\\d+)',
  requireRole('System Admin', 'Access denied: Only System Administrators can deactivate dropdown options.'),
  deactivateHandler
);

dropdownsRouter.patch(
  '/dropdown-options/:id(\\d+)/deactivate',
  requireRole('System Admin', 'Access denied: Only System Administrators can deactivate dropdown options.'),
  deactivateHandler
);

// -------------------------------------------------------------
// 9. RESTORE / REACTIVATE OPTION (System Admin Only)
// -------------------------------------------------------------
const restoreHandler = async (req: AuthRequest, res: Response) => {
  try {
    const user = getAuthenticatedUser(req);
    if (!user) {
      return sendApiError(res, 401, 'UNAUTHORIZED', 'Authentication credentials missing or invalid.');
    }

    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return sendApiError(res, 400, 'VALIDATION_ERROR', 'Invalid option ID.');
    }

    const restored = await restoreDropdownOption(
      id,
      { id: user.id, name: user.name, email: user.email, role: user.role }
    );

    return sendApiSuccess(res, {
      option: restored,
      message: `Option "${restored.value}" in category "${restored.category}" has been restored.`,
    });
  } catch (err: any) {
    const statusCode = err.statusCode || (err.code === 'DUPLICATE_OPTION' ? 409 : 400);
    const errorCode = err.code || 'DROPDOWN_RESTORE_ERROR';
    return sendApiError(res, statusCode, errorCode, err.message);
  }
};

dropdownsRouter.patch(
  '/dropdown-options/:id(\\d+)/restore',
  requireRole('System Admin', 'Access denied: Only System Administrators can restore dropdown options.'),
  restoreHandler
);

dropdownsRouter.patch(
  '/dropdown-options/:id(\\d+)/activate',
  requireRole('System Admin', 'Access denied: Only System Administrators can restore dropdown options.'),
  restoreHandler
);
