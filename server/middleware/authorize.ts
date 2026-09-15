import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.ts';
import { sendApiError } from './errorHandler.ts';
import {
  normalizeRole,
  getRolePermissions,
  CanonicalRole,
  RolePermissions,
} from '../../src/lib/permissions.ts';

export interface AuthenticatedUser {
  id: string | number;
  email: string;
  role: CanonicalRole;
  name: string;
  username?: string;
  division?: string;
  permissions: RolePermissions;
}

/**
 * Extracts and strictly normalizes the authenticated user from req.user (from the validated JWT).
 * Never trusts any body, header, query, or client-supplied role or user name.
 */
export function getAuthenticatedUser(req: AuthRequest): AuthenticatedUser | null {
  if (!req.user) {
    return null;
  }

  // Authoritative role strictly from decoded JWT payload
  const rawRole = req.user.role;
  const canonicalRole = normalizeRole(rawRole);
  if (!canonicalRole) {
    return null; // Unrecognized role -> strict deny
  }

  const permissions = getRolePermissions(canonicalRole);

  return {
    id: req.user.id,
    email: req.user.email,
    role: canonicalRole,
    name: req.user.name || req.user.full_name || req.user.username || req.user.email || 'Authenticated User',
    username: req.user.username,
    division: req.user.division,
    permissions,
  };
}

/**
 * Reusable server-side permission middleware.
 * Enforces that req.user from JWT possesses the required permission.
 */
export function requirePermission(
  permissionKey: keyof RolePermissions,
  customDeniedMessage?: string
) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const user = getAuthenticatedUser(req);
    if (!user) {
      return sendApiError(res, 401, 'UNAUTHORIZED', 'Authentication credentials missing or invalid.');
    }

    if (!user.permissions[permissionKey]) {
      return sendApiError(
        res,
        403,
        'FORBIDDEN',
        customDeniedMessage ||
          `Access denied: Role "${user.role}" does not have the required "${String(permissionKey)}" permission.`
      );
    }

    (req as any).authenticatedUser = user;
    next();
  };
}

/**
 * Reusable server-side role middleware.
 * Enforces that req.user from JWT matches one of the allowed canonical roles.
 */
export function requireRole(
  allowedRoles: CanonicalRole | CanonicalRole[],
  customDeniedMessage?: string
) {
  const allowedList = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const user = getAuthenticatedUser(req);
    if (!user) {
      return sendApiError(res, 401, 'UNAUTHORIZED', 'Authentication credentials missing or invalid.');
    }

    if (!allowedList.includes(user.role)) {
      return sendApiError(
        res,
        403,
        'FORBIDDEN',
        customDeniedMessage ||
          `Access denied: Role "${user.role}" is not authorized. Required: [${allowedList.join(', ')}].`
      );
    }

    (req as any).authenticatedUser = user;
    next();
  };
}

// -------------------------------------------------------------
// Specialized Middleware Handlers for Business Actions
// -------------------------------------------------------------

/**
 * POST /api/documents
 * Receiving, Department Manager, System Admin can register incoming documents.
 */
export const authorizeDocumentCreation = requirePermission(
  'canLogIncoming',
  'Access denied: Only Receiving, Department Manager, and System Admin can log incoming documents.'
);

/**
 * DELETE /api/documents/:id
 * Department Manager and System Admin only.
 */
export const authorizeDocumentDeletion = requirePermission(
  'canDeleteDocuments',
  'Access denied: Document deletion requires executive clearance (Department Manager or System Admin).'
);

/**
 * POST /api/documents/:id/clearance
 * Department Manager and System Admin only.
 */
export const authorizeManagerClearance = requirePermission(
  'canAuthorizeClearance',
  'Access denied: Only executive management (Department Manager, System Admin) can grant clearance or dispatch documents.'
);

/**
 * POST /api/documents/:id/remarks
 * Supervisor, Division Manager, Department Manager, System Admin only.
 */
export const authorizeSupervisorRemarks = requirePermission(
  'canIssueSupervisorRemarks',
  'Access denied: Only supervisory roles (Supervisor, Division Manager, Department Manager, System Admin) can issue directives.'
);

/**
 * POST /api/documents/:id/movements
 * All canonical roles can record movement, but actor identity is enforced from JWT.
 */
export const authorizeDocumentMovement = requirePermission(
  'canRecordMovement',
  'Access denied: You do not have permission to record document movements.'
);

/**
 * Personnel administration (create, update, delete personnel, change roles, manage credentials).
 * System Admin only.
 */
export const authorizeStaffManagement = requireRole(
  ['System Admin'],
  'Access denied: Personnel administration and role management is restricted to System Admin.'
);

/**
 * System settings and registry administration (departments, desks, links, business hours, holidays).
 * System Admin and Department Manager.
 */
export const authorizeSettingsManagement = requirePermission(
  'canManageSettings',
  'Access denied: System and registry administration requires management privileges (Department Manager or System Admin).'
);
