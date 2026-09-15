import { AppUserRole, UserRoleType, RolePermissionConfig } from './types';

// Storage wrappers
export function safeStorageGet(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
export function safeStorageSet(key: string, value: string): void {
  try { localStorage.setItem(key, value); } catch {}
}
export function safeStorageRemove(key: string): void {
  try { localStorage.removeItem(key); } catch {}
}

export function broadcastDataUpdate(type: string, data: any) {
  window.dispatchEvent(new CustomEvent('possd-data-update', { detail: { type, data } }));
}
export function onDataUpdate(callback: (type: string, data: any) => void) {
  const handler = (e: any) => callback(e.detail?.type, e.detail?.data);
  window.addEventListener('possd-data-update', handler);
  return () => window.removeEventListener('possd-data-update', handler);
}

export const CANONICAL_ROLES: UserRoleType[] = [
  'Receiving', 'Staff', 'Supervisor', 'Division Manager', 'Department Manager', 'System Admin',
];

export const ROLE_CONFIGS: Record<UserRoleType, RolePermissionConfig & { level: number; label: string; hierarchyNote?: string }> = {
  'Receiving': {
    role: 'Receiving', level: 1, label: 'Receiving Staff', title: 'Receiving Staff',
    badgeBg: 'bg-emerald-50', badgeText: 'text-emerald-700', badgeBorder: 'border-emerald-200', dotColor: 'bg-emerald-500',
    summary: 'Registers incoming docs', hierarchyNote: 'Entry point',
    canLogIncoming: true, canRecordMovement: true, canIssueSupervisorRemarks: false,
    canFulfillCompliance: false, canAuthorizeClearance: false, canDeleteDocuments: false, canManageStaff: false, canConfigureSync: false
  },
  'Staff': {
    role: 'Staff', level: 2, label: 'Action Staff', title: 'Action Staff',
    badgeBg: 'bg-blue-50', badgeText: 'text-blue-700', badgeBorder: 'border-blue-200', dotColor: 'bg-blue-500',
    summary: 'Processes docs',
    canLogIncoming: false, canRecordMovement: true, canIssueSupervisorRemarks: false,
    canFulfillCompliance: true, canAuthorizeClearance: false, canDeleteDocuments: false, canManageStaff: false, canConfigureSync: false
  },
  'Supervisor': {
    role: 'Supervisor', level: 3, label: 'Supervisor', title: 'Supervisor',
    badgeBg: 'bg-indigo-50', badgeText: 'text-indigo-700', badgeBorder: 'border-indigo-200', dotColor: 'bg-indigo-500',
    summary: 'Issues directives',
    canLogIncoming: false, canRecordMovement: true, canIssueSupervisorRemarks: true,
    canFulfillCompliance: true, canAuthorizeClearance: false, canDeleteDocuments: false, canManageStaff: false, canConfigureSync: false
  },
  'Division Manager': {
    role: 'Division Manager', level: 4, label: 'Division Manager', title: 'Division Manager',
    badgeBg: 'bg-purple-50', badgeText: 'text-purple-700', badgeBorder: 'border-purple-200', dotColor: 'bg-purple-500',
    summary: 'Approves division docs',
    canLogIncoming: false, canRecordMovement: true, canIssueSupervisorRemarks: true,
    canFulfillCompliance: false, canAuthorizeClearance: true, canDeleteDocuments: false, canManageStaff: false, canConfigureSync: false
  },
  'Department Manager': {
    role: 'Department Manager', level: 5, label: 'Department Manager', title: 'Department Manager',
    badgeBg: 'bg-rose-50', badgeText: 'text-rose-700', badgeBorder: 'border-rose-200', dotColor: 'bg-rose-500',
    summary: 'Department head',
    canLogIncoming: false, canRecordMovement: false, canIssueSupervisorRemarks: true,
    canFulfillCompliance: false, canAuthorizeClearance: true, canDeleteDocuments: true, canManageStaff: false, canConfigureSync: false
  },
  'System Admin': {
    role: 'System Admin', level: 10, label: 'System Admin', title: 'System Admin',
    badgeBg: 'bg-gray-800', badgeText: 'text-gray-100', badgeBorder: 'border-gray-700', dotColor: 'bg-gray-400',
    summary: 'Manages system', hierarchyNote: 'Full access',
    canLogIncoming: true, canRecordMovement: true, canIssueSupervisorRemarks: true,
    canFulfillCompliance: true, canAuthorizeClearance: true, canDeleteDocuments: true, canManageStaff: true, canConfigureSync: true
  },
};

export function normalizeRole(role: string): UserRoleType {
  const normalized = CANONICAL_ROLES.find((r) => r.toLowerCase() === role.toLowerCase());
  return normalized || 'Staff';
}
export function getRoleConfig(role: string) { return ROLE_CONFIGS[normalizeRole(role)] || ROLE_CONFIGS['Staff']; }
export function getRolePermissions(role: string) { return getRoleConfig(role); }
export function canUserDeleteDocuments(user: AppUserRole | null) {
  if (!user) return false;
  return getRoleConfig(user.role).level >= ROLE_CONFIGS['Department Manager'].level;
}

export function canUserManageSettings(user: AppUserRole | null) {
  if (!user) return false;
  return getRoleConfig(user.role).level >= ROLE_CONFIGS['Division Manager'].level;
}

export function canUserManageStaff(user: AppUserRole | null) {
  if (!user) return false;
  return getRoleConfig(user.role).level >= ROLE_CONFIGS['System Admin'].level;
}

export function hasSupervisorPermissions(user: AppUserRole | { role: string; status?: string } | null | undefined): boolean {
  if (!user) return false;
  if ('status' in user && user.status === 'suspended') return false;
  const config = getRoleConfig(user.role);
  return Boolean(config.canIssueSupervisorRemarks || config.level >= 3);
}
