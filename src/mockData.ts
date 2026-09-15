import { DocumentItem, AppUserRole, RolePermissionConfig, UserRoleType, RegistryDropdownOptions, normalizeDocumentItem } from './types';
import {
  CanonicalRole,
  CANONICAL_ROLES,
  normalizeRole,
  ROLE_CONFIGS,
  getRoleConfig,
  getRolePermissions,
  canUserDeleteDocuments,
  canUserDeleteDivisionThresholdOverrides,
  canUserAuthorizeClearance,
  canUserFulfillCompliance,
  canUserIssueSupervisorRemarks,
  canUserLogIncoming,
  canUserManageStaff,
  canUserManageSettings,
  canUserRecordMovement,
  canUserManageCredentials,
} from './lib/permissions';

export {
  type CanonicalRole,
  CANONICAL_ROLES,
  normalizeRole,
  ROLE_CONFIGS,
  getRoleConfig,
  getRolePermissions,
  canUserDeleteDocuments,
  canUserDeleteDivisionThresholdOverrides,
  canUserAuthorizeClearance,
  canUserFulfillCompliance,
  canUserIssueSupervisorRemarks,
  canUserLogIncoming,
  canUserManageStaff,
  canUserManageSettings,
  canUserRecordMovement,
  canUserManageCredentials,
};

const STORAGE_KEY = 'office_document_tracker_data_v1';
const STAFF_KEY = 'office_document_tracker_staff_v1';
const DROPDOWN_OPTIONS_KEY = 'office_document_tracker_dropdown_options_v2';

export const INITIAL_STAFF_MEMBERS: AppUserRole[] = [
  {
    id: "staff-admin-initial",
    name: "System Administrator",
    role: "System Admin",
    division: "CMED",
    avatarInitials: "SA",
    email: "admin@system.local",
    assignedDesk: "Central Registry",
    username: "admin",
    status: "active",
  },
  {
    id: "staff-0",
    name: "Myles Rovi P. Martinez",
    role: "Staff",
    division: "CMED",
    avatarInitials: "MR",
    username: "myles1",
    status: "active",
  },
  {
    id: "staff-1",
    name: "Judy F. Villarete",
    role: "Staff",
    division: "CMED",
    avatarInitials: "JF",
    username: "judy2",
    status: "active",
  },
  {
    id: "staff-2",
    name: "Bryan L. Cabalfin",
    role: "Staff",
    division: "CMED",
    avatarInitials: "BL",
    username: "bryan3",
    status: "active",
  },
  {
    id: "staff-3",
    name: "Pamela Aprille O. Lumbre",
    role: "Staff",
    division: "CMED",
    avatarInitials: "PA",
    username: "pamela4",
    status: "active",
  },
  {
    id: "staff-4",
    name: "Benjamin A. Nieva",
    role: "Staff",
    division: "CMED",
    avatarInitials: "BA",
    username: "benjamin5",
    status: "active",
  },
  {
    id: "staff-5",
    name: "Maria Urduja Jean V. Tabilas",
    role: "Staff",
    division: "CMED",
    avatarInitials: "MU",
    username: "maria6",
    status: "active",
  },
  {
    id: "staff-6",
    name: "Mary Flor F. Aquino",
    role: "Staff",
    division: "CMED",
    avatarInitials: "MF",
    username: "mary7",
    status: "active",
  },
  {
    id: "staff-7",
    name: "Aubrey Camille C. Cabrera",
    role: "Staff",
    division: "CMED",
    avatarInitials: "AC",
    username: "aubrey8",
    status: "active",
  },
  {
    id: "staff-8",
    name: "Anne Katrina S. Del Rosario",
    role: "Staff",
    division: "CMED",
    avatarInitials: "AK",
    username: "anne9",
    status: "active",
  },
  {
    id: "staff-9",
    name: "Rey Reginald A. Mojica",
    role: "Staff",
    division: "CMED",
    avatarInitials: "RR",
    username: "rey10",
    status: "active",
  },
  {
    id: "staff-10",
    name: "Janelle Vanessa E. Tanguilig",
    role: "Staff",
    division: "CMED",
    avatarInitials: "JV",
    username: "janelle11",
    status: "active",
  },
  {
    id: "staff-11",
    name: "Rodolfo M. Torino Jr",
    role: "Staff",
    division: "CMED",
    avatarInitials: "RM",
    username: "rodolfo12",
    status: "active",
  },
  {
    id: "staff-12",
    name: "Danezel Christian G. Cruz",
    role: "Staff",
    division: "CMED",
    avatarInitials: "DC",
    username: "danezel13",
    status: "active",
  },
  {
    id: "staff-13",
    name: "John Nicolo V. Salvador",
    role: "Staff",
    division: "CMED",
    avatarInitials: "JN",
    username: "john14",
    status: "active",
  },
  {
    id: "staff-14",
    name: "Marian Grace Paling",
    role: "Staff",
    division: "CMED",
    avatarInitials: "MG",
    username: "marian15",
    status: "active",
  },
  {
    id: "staff-15",
    name: "Judy Ann T. Pacaanas",
    role: "Staff",
    division: "CMED",
    avatarInitials: "JA",
    username: "judy16",
    status: "active",
  },
  {
    id: "staff-16",
    name: "Oscar B. Hanova Jr.",
    role: "Staff",
    division: "CMED",
    avatarInitials: "OB",
    username: "oscar17",
    status: "active",
  },
];

export const INITIAL_DOCUMENTS: DocumentItem[] = [];


const memoryStorageFallback: Record<string, string> = {};

export function safeStorageGet(key: string): string | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem(key);
    }
  } catch (e) {
    // Cross-origin iframe or partitioned storage exception
  }
  return memoryStorageFallback[key] || null;
}

export function safeStorageSet(key: string, value: string): void {
  memoryStorageFallback[key] = value;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(key, value);
    }
  } catch (e) {
    // Silently fall back to in-memory store in sandboxed iframes
  }
}

export function safeStorageRemove(key: string): void {
  delete memoryStorageFallback[key];
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(key);
    }
  } catch (e) {
    // Cross-origin iframe
  }
}

export function getStoredDocuments(): DocumentItem[] {
  try {
    const raw = safeStorageGet(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map(normalizeDocumentItem);
      }
    }
  } catch (e) {
    console.error('Failed to load documents from storage:', e);
  }
  return INITIAL_DOCUMENTS.map(normalizeDocumentItem);
}

export function saveStoredDocuments(docs: DocumentItem[]) {
  try {
    safeStorageSet(STORAGE_KEY, JSON.stringify(docs));
  } catch (e) {
    console.error('Failed to save documents to storage:', e);
  }
}

export function getStoredStaffMembers(): AppUserRole[] {
  try {
    const raw = safeStorageGet(STAFF_KEY);
    if (raw) {
      const list = JSON.parse(raw);
      if (Array.isArray(list) && list.length > 0) {
        return list.map((staff: any, idx: number) => {
          const canonical = normalizeRole(staff.role) || 'Staff';
          const defaultUsername = staff.username || (
            (staff.name || '').toLowerCase().replace(/[^a-z0-9]/g, '.').replace(/\.+/g, '.').replace(/^\.|\.$/g, '') ||
            `user${idx + 1}`
          );

          // Clean presentation profile - guarantee NO password fields
          const cleanStaff: AppUserRole = {
            id: String(staff.id || `staff-${idx}`),
            name: String(staff.name || 'Unnamed Personnel'),
            role: canonical,
            division: String(staff.division || 'CMED'),
            avatarInitials: staff.avatarInitials || (staff.name ? staff.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() : 'ST'),
            email: staff.email || undefined,
            assignedDesk: staff.assignedDesk || undefined,
            username: defaultUsername,
            status: staff.status === 'suspended' ? 'suspended' : 'active',
            lastLogin: staff.lastLogin,
          };
          return cleanStaff;
        });
      }
    }
  } catch (e) {
    console.error('Failed to get staff members:', e);
  }
  return INITIAL_STAFF_MEMBERS;
}

export function saveStoredStaffMembers(staff: AppUserRole[]) {
  try {
    // Sanitize staff to ensure clean model (no plaintext passwords)
    const sanitized = staff.map((s) => ({
      id: s.id,
      name: s.name,
      role: normalizeRole(s.role) || 'Staff',
      division: s.division,
      avatarInitials: s.avatarInitials,
      email: s.email,
      assignedDesk: s.assignedDesk,
      username: s.username,
      status: s.status || 'active',
      lastLogin: s.lastLogin,
    }));
    safeStorageSet(STAFF_KEY, JSON.stringify(sanitized));
  } catch (e) {
    console.error('Failed to save staff members:', e);
  }
}

export function getStoredDropdownOptions(): RegistryDropdownOptions {
  try {
    const raw = safeStorageGet(DROPDOWN_OPTIONS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        roles: Array.isArray(parsed.roles) && parsed.roles.length > 0 ? parsed.roles : [...CANONICAL_ROLES],
        departments: Array.isArray(parsed.departments) ? parsed.departments : [],
        desks: Array.isArray(parsed.desks) ? parsed.desks : [],
        documentTypes: Array.isArray(parsed.documentTypes) ? parsed.documentTypes : [],
        communicationTypes: Array.isArray(parsed.communicationTypes) ? parsed.communicationTypes : [],
        reportTypes: Array.isArray(parsed.reportTypes) ? parsed.reportTypes : [],
        personnel: Array.isArray(parsed.personnel) ? parsed.personnel : [],
      };
    }
  } catch (e) {
    console.error('Failed to get dropdown options:', e);
  }
  return {
    roles: [...CANONICAL_ROLES],
    departments: ['CMED', 'CMSD'],
    desks: [],
    documentTypes: ['Simple Transaction', 'Complex Transaction', 'Highly Technical', 'Regular Report', 'For information only', 'Special Deadline', 'Voucher', 'Payroll', 'Resolution', 'Ordinance', 'Contract/Agreement', 'Endorsement'],
    communicationTypes: ['Memorandum', 'Letter', 'Certification', 'RDTF', 'Email', 'Verbal Request'],
    reportTypes: ['Inspection Report', 'Consolidated CMR and PPR', 'External Communication', 'Internal Communications', 'Minutes of Meeting', 'Lacking Documents', 'SM1 and SM2', 'Internal Request', 'For review - SOTEVO', 'For review/Comments - Other docs', 'Travel Order', 'Office Order', 'For staff reference', 'CPES', 'Summary of CMR', 'Summary of PPR', 'CMR and PPR Tracking', 'Project Completion Inspection Report', 'Project Acceptance Report', 'Acceptance Committee', 'Cash Advance / Reimbursement', 'Notice of Inspection', 'BAC-Other works', 'Consolidated CMR and PPR to COA', 'List of Terminated'],
    personnel: ['Myles Rovi P. Martinez', 'Judy F. Villarete', 'Bryan L. Cabalfin', 'Pamela Aprille O. Lumbre', 'Benjamin A. Nieva', 'Maria Urduja Jean V. Tabilas', 'Mary Flor F. Aquino', 'Aubrey Camille C. Cabrera', 'Anne Katrina S. Del Rosario', 'Rey Reginald A. Mojica', 'Janelle Vanessa E. Tanguilig', 'Rodolfo M. Torino Jr', 'Danezel Christian G. Cruz', 'John Nicolo V. Salvador', 'Marian Grace Paling', 'Judy Ann T. Pacaanas', 'Oscar B. Hanova Jr.'],
  };
}

export function saveStoredDropdownOptions(options: RegistryDropdownOptions) {
  try {
    safeStorageSet(DROPDOWN_OPTIONS_KEY, JSON.stringify(options));
  } catch (e) {
    console.error('Failed to save dropdown options:', e);
  }
}

export interface CrossDeviceSyncPayload {
  version: number;
  timestamp: string;
  staff: AppUserRole[];
  dropdownOptions?: RegistryDropdownOptions;
}

/**
 * Encodes staff list and dropdown configuration into a compact base64 string for URL-based roster export/import
 */
export function encodePersonnelSyncCode(
  staff: AppUserRole[],
  dropdownOptions?: RegistryDropdownOptions
): string {
  try {
    const payload: CrossDeviceSyncPayload = {
      version: 1,
      timestamp: new Date().toISOString(),
      staff,
      dropdownOptions,
    };
    const jsonStr = JSON.stringify(payload);
    // Use UTF-8 safe base64 encoding
    return btoa(encodeURIComponent(jsonStr));
  } catch (e) {
    console.error('Failed to encode sync code:', e);
    return '';
  }
}

/**
 * Decodes a base64 roster export/transfer payload
 */
export function decodePersonnelSyncCode(code: string): CrossDeviceSyncPayload | null {
  try {
    if (!code || typeof code !== 'string') return null;
    const clean = code.trim().replace(/^#sync=|^#sync_staff=|\?sync=|\?sync_staff=/, '');
    const jsonStr = decodeURIComponent(atob(clean));
    const parsed = JSON.parse(jsonStr);

    if (parsed && Array.isArray(parsed.staff)) {
      return parsed;
    }
    // Also support direct array
    if (Array.isArray(parsed)) {
      return {
        version: 1,
        timestamp: new Date().toISOString(),
        staff: parsed,
      };
    }
  } catch (e) {
    console.error('Failed to decode sync code:', e);
  }
  return null;
}

/**
 * Generates a shareable URL containing the base64-encoded roster payload
 */
export function generateDeviceShareUrl(
  staff: AppUserRole[],
  dropdownOptions?: RegistryDropdownOptions
): string {
  const code = encodePersonnelSyncCode(staff, dropdownOptions);
  if (!code) return window.location.href;
  const baseUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}`;
  return `${baseUrl}#sync_staff=${code}`;
}

/**
 * Broadcasts data changes across multiple open tabs in the same browser session.
 * Note: BroadcastChannel operates strictly client-side within the same browser/origin.
 */
export type BroadcastUpdateType =
  | 'STAFF_UPDATED'
  | 'DOCUMENTS_UPDATED'
  | 'staff'
  | 'documents'
  | 'dropdowns';

export function broadcastDataUpdate(type: BroadcastUpdateType, payload?: any) {
  try {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const channel = new BroadcastChannel('possd_device_channel');
      channel.postMessage({ type, payload, timestamp: Date.now() });
      channel.close();
    }
  } catch (e) {
    // Gracefully ignore if BroadcastChannel not supported
  }
}

/**
 * Subscribes to same-browser tab notifications via BroadcastChannel.
 */
export function onDataUpdate(callback: (type: string, payload?: any) => void): () => void {
  try {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const channel = new BroadcastChannel('possd_device_channel');
      const listener = (event: MessageEvent) => {
        if (event.data && event.data.type) {
          callback(event.data.type, event.data.payload);
        }
      };
      channel.addEventListener('message', listener);
      return () => {
        channel.removeEventListener('message', listener);
        channel.close();
      };
    }
  } catch (e) {
    // Gracefully ignore
  }
  return () => {};
}

