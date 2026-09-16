import { UserRoleType, RolePermissionConfig } from '../types';

/**
 * The 6 Canonical System Roles
 */
export type CanonicalRole =
  | 'Receiving'
  | 'Staff'
  | 'Supervisor'
  | 'Division Manager'
  | 'Department Manager'
  | 'System Admin';

export const CANONICAL_ROLES: readonly CanonicalRole[] = [
  'Receiving',
  'Staff',
  'Supervisor',
  'Division Manager',
  'Department Manager',
  'System Admin',
] as const;

/**
 * Unified Role Normalization Mechanism
 * 
 * Maps any legacy, casing, or synonym input into a strict CanonicalRole.
 * Returns null for any unrecognized input (strictly defaults to deny).
 */
export function normalizeRole(rawRole?: string | null): CanonicalRole | null {
  if (!rawRole || typeof rawRole !== 'string') {
    return null;
  }

  const trimmed = rawRole.trim().toLowerCase();

  switch (trimmed) {
    case 'receiving':
    case 'receiving staff':
    case 'admin staff':
    case 'receiving officer':
    case 'administrative receiving officer':
      return 'Receiving';

    case 'staff':
    case 'personnel':
    case 'personnel / handler':
    case 'handler':
    case 'action officer':
    case 'action officer / desk personnel':
      return 'Staff';

    case 'supervisor':
    case 'unit supervisor':
    case 'unit supervisor / 1st-line reviewer':
    case '1st-line reviewer':
    case 'reviewer':
      return 'Supervisor';

    case 'division manager':
    case 'division chief':
    case 'division chief / mid-level manager':
    case 'mid-level manager':
      return 'Division Manager';

    case 'department manager':
    case 'department head':
    case 'executive director':
    case 'executive director / department head':
      return 'Department Manager';

    case 'system admin':
    case 'sys admin':
    case 'admin':
    case 'administrator':
    case 'records administrator':
    case 'registry & systems administrator':
      return 'System Admin';

    default:
      return null;
  }
}

/**
 * Role Permission Definition
 */
export interface RolePermissions {
  canLogIncoming: boolean;
  canEditDocument: boolean;
  canRecordMovement: boolean;
  canChangeStatus: boolean;
  canIssueSupervisorRemarks: boolean;
  canFulfillCompliance: boolean;
  canAuthorizeClearance: boolean;
  canDispatchDocument: boolean;
  canManageStaff: boolean;
  canManageSettings: boolean;
  canManageCredentials: boolean;
  canViewAuditTrail: boolean;
  canDeleteDocuments: boolean;
  canDeleteDivisionThresholdOverrides: boolean;
  isPrerequisiteBeforeDivisionManager: boolean;
}

/**
 * Strict Deny-by-Default Fallback
 */
export const DENIED_PERMISSIONS: Readonly<RolePermissions> = Object.freeze({
  canLogIncoming: false,
  canEditDocument: false,
  canRecordMovement: false,
  canChangeStatus: false,
  canIssueSupervisorRemarks: false,
  canFulfillCompliance: false,
  canAuthorizeClearance: false,
  canDispatchDocument: false,
  canManageStaff: false,
  canManageSettings: false,
  canManageCredentials: false,
  canViewAuditTrail: false,
  canDeleteDocuments: false,
  canDeleteDivisionThresholdOverrides: false,
  isPrerequisiteBeforeDivisionManager: false,
});

/**
 * Canonical Role Configuration Matrix
 */
export const ROLE_CONFIGS: Record<CanonicalRole, RolePermissionConfig> = {
  Receiving: {
    role: 'Receiving',
    title: 'Administrative Receiving Officer',
    badgeBg: 'bg-sky-500/10',
    badgeText: 'text-sky-700 dark:text-sky-400',
    badgeBorder: 'border-sky-500/20',
    dotColor: 'bg-sky-500',
    summary: 'Captures incoming documents with auto-timestamps, stamps tracking references, and routes to initial division.',
    canLogIncoming: true,
    canRecordMovement: true,
    canIssueSupervisorRemarks: false,
    canFulfillCompliance: false,
    canAuthorizeClearance: false,
    canConfigureSync: false,
    canManageStaff: false,
    canDeleteDocuments: false,
    canManageCredentials: false,
    canDeleteDivisionThresholdOverrides: false,
    hierarchyNote: 'Entry Point: Initial document logging & barcoding',
  },
  Staff: {
    role: 'Staff',
    title: 'Action Officer / Desk Personnel',
    badgeBg: 'bg-blue-500/15',
    badgeText: 'text-blue-700 dark:text-blue-400',
    badgeBorder: 'border-blue-500/30',
    dotColor: 'bg-blue-600',
    summary: 'Receives documents at workstation, updates desk-to-desk movements, and complies with directives and requirements.',
    canLogIncoming: false,
    canRecordMovement: true,
    canIssueSupervisorRemarks: false,
    canFulfillCompliance: true,
    canAuthorizeClearance: false,
    canConfigureSync: false,
    canManageStaff: false,
    canDeleteDocuments: false,
    canManageCredentials: false,
    canDeleteDivisionThresholdOverrides: false,
    hierarchyNote: 'Processing: Action officer review & movement tracking',
  },
  Supervisor: {
    role: 'Supervisor',
    title: 'Unit Supervisor / 1st-Line Reviewer',
    badgeBg: 'bg-amber-500/15',
    badgeText: 'text-amber-800 dark:text-amber-400',
    badgeBorder: 'border-amber-500/30',
    dotColor: 'bg-amber-500',
    summary: 'First-line supervisory reviewer: conducts preliminary document review and issues directives. Mandatory prerequisite before Division Manager endorsement.',
    canLogIncoming: false,
    canRecordMovement: true,
    canIssueSupervisorRemarks: true,
    canFulfillCompliance: true,
    canAuthorizeClearance: false,
    canConfigureSync: false,
    canManageStaff: false,
    canDeleteDocuments: false,
    canManageCredentials: false,
    canDeleteDivisionThresholdOverrides: false,
    isPrerequisiteBeforeDivisionManager: true,
    hierarchyNote: 'Prerequisite Step 1: Mandatory preliminary endorsement before Division Manager review',
  },
  'Division Manager': {
    role: 'Division Manager',
    title: 'Division Chief / Mid-Level Manager',
    badgeBg: 'bg-blue-700/15',
    badgeText: 'text-blue-900 dark:text-blue-300',
    badgeBorder: 'border-blue-700/30',
    dotColor: 'bg-blue-800',
    summary: 'Division Chief: conducts secondary division-level review following Supervisor endorsement; issues directives and recommends document to Department Manager.',
    canLogIncoming: false,
    canRecordMovement: true,
    canIssueSupervisorRemarks: true,
    canFulfillCompliance: true,
    canAuthorizeClearance: false,
    canConfigureSync: false,
    canManageStaff: false,
    canDeleteDocuments: false,
    canManageCredentials: false,
    canDeleteDivisionThresholdOverrides: false,
    hierarchyNote: 'Endorsement Step 2: Division-level review (requires prior Supervisor review)',
  },
  'Department Manager': {
    role: 'Department Manager',
    title: 'Executive Director / Department Head',
    badgeBg: 'bg-emerald-500/10',
    badgeText: 'text-emerald-700 dark:text-emerald-400',
    badgeBorder: 'border-emerald-500/20',
    dotColor: 'bg-emerald-500',
    summary: 'Holds executive sign-off authority. Issues official clearance for out, assigns outgoing dispatch numbers, directs releases, and authorizes document deletion.',
    canLogIncoming: true,
    canRecordMovement: true,
    canIssueSupervisorRemarks: true,
    canFulfillCompliance: true,
    canAuthorizeClearance: true,
    canConfigureSync: true,
    canManageStaff: false,
    canDeleteDocuments: true,
    canManageCredentials: false,
    canDeleteDivisionThresholdOverrides: false,
    hierarchyNote: 'Executive Step 3: Final Clearance & Outgoing Dispatch Authorization (Delete Permitted)',
  },
  'System Admin': {
    role: 'System Admin',
    title: 'Registry & Systems Administrator',
    badgeBg: 'bg-slate-700/10',
    badgeText: 'text-slate-800 dark:text-slate-300',
    badgeBorder: 'border-slate-500/20',
    dotColor: 'bg-slate-700',
    summary: 'Full system oversight across records, staff credentials enrollment, staff role assignments, dropdown registries, central registry persistence, division threshold override deletion, and audit trail validation.',
    canLogIncoming: true,
    canRecordMovement: true,
    canIssueSupervisorRemarks: true,
    canFulfillCompliance: true,
    canAuthorizeClearance: true,
    canConfigureSync: true,
    canManageStaff: true,
    canDeleteDocuments: true,
    canManageCredentials: true,
    canDeleteDivisionThresholdOverrides: true,
    hierarchyNote: 'Administration: System controls, credentials enrollment, registry, division overrides deletion authorization',
  },
};

/**
 * Returns the UI presentation configuration and permissions for a role.
 * For unrecognized or null roles, returns a strict, non-privileged guest fallback (default-to-deny).
 */
export function getRoleConfig(roleName?: string | null): RolePermissionConfig {
  const canonical = normalizeRole(roleName);
  if (canonical && ROLE_CONFIGS[canonical]) {
    return ROLE_CONFIGS[canonical];
  }

  // Deny-by-default guest fallback
  return {
    role: 'Staff',
    title: roleName || 'Guest / Unassigned',
    badgeBg: 'bg-slate-100 dark:bg-slate-800',
    badgeText: 'text-slate-600 dark:text-slate-400',
    badgeBorder: 'border-slate-300 dark:border-slate-700',
    dotColor: 'bg-slate-400',
    summary: 'Unauthenticated or guest session with view-only or denied privileges.',
    canLogIncoming: false,
    canRecordMovement: false,
    canIssueSupervisorRemarks: false,
    canFulfillCompliance: false,
    canAuthorizeClearance: false,
    canConfigureSync: false,
    canManageStaff: false,
    canDeleteDocuments: false,
    canManageCredentials: false,
    canDeleteDivisionThresholdOverrides: false,
    isPrerequisiteBeforeDivisionManager: false,
    hierarchyNote: 'Guest / Restricted access',
  };
}

/**
 * Centralized Permission Check Functions
 */

export function getRolePermissions(roleName?: string | null): RolePermissions {
  const canonical = normalizeRole(roleName);
  if (!canonical) {
    return DENIED_PERMISSIONS;
  }
  const config = ROLE_CONFIGS[canonical];
  return {
    canLogIncoming: config.canLogIncoming,
    canEditDocument: true, // All recognized roles can edit basic document notes
    canRecordMovement: config.canRecordMovement,
    canChangeStatus: true,
    canIssueSupervisorRemarks: config.canIssueSupervisorRemarks,
    canFulfillCompliance: config.canFulfillCompliance,
    canAuthorizeClearance: config.canAuthorizeClearance,
    canDispatchDocument: config.canAuthorizeClearance,
    canManageStaff: config.canManageStaff,
    canManageSettings: canonical === 'System Admin' || canonical === 'Department Manager',
    canManageCredentials: !!config.canManageCredentials,
    canViewAuditTrail: true,
    canDeleteDocuments: !!config.canDeleteDocuments,
    canDeleteDivisionThresholdOverrides: !!config.canDeleteDivisionThresholdOverrides,
    isPrerequisiteBeforeDivisionManager: !!config.isPrerequisiteBeforeDivisionManager,
  };
}

export function canUserLogIncoming(roleName?: string | null): boolean {
  return getRolePermissions(roleName).canLogIncoming;
}

export function canUserRecordMovement(roleName?: string | null): boolean {
  return getRolePermissions(roleName).canRecordMovement;
}

export function canUserIssueSupervisorRemarks(roleName?: string | null): boolean {
  return getRolePermissions(roleName).canIssueSupervisorRemarks;
}

export function canUserFulfillCompliance(roleName?: string | null): boolean {
  return getRolePermissions(roleName).canFulfillCompliance;
}

export function canUserAuthorizeClearance(roleName?: string | null): boolean {
  return getRolePermissions(roleName).canAuthorizeClearance;
}

export function canUserManageStaff(roleName?: string | null): boolean {
  return getRolePermissions(roleName).canManageStaff;
}

export function canUserManageSettings(roleName?: string | null): boolean {
  return getRolePermissions(roleName).canManageSettings;
}

export function canUserDeleteDocuments(roleName?: string | null): boolean {
  return getRolePermissions(roleName).canDeleteDocuments;
}

export function canUserDeleteDivisionThresholdOverrides(roleName?: string | null): boolean {
  return getRolePermissions(roleName).canDeleteDivisionThresholdOverrides;
}

export function canUserManageCredentials(roleName?: string | null): boolean {
  return getRolePermissions(roleName).canManageCredentials;
}
