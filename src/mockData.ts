import { DocumentItem, AppUserRole, RolePermissionConfig, UserRoleType, RegistryDropdownOptions } from './types';

const STORAGE_KEY = 'office_document_tracker_data_v1';
const SHEET_CONFIG_KEY = 'office_document_tracker_sheet_config_v1';
const STAFF_KEY = 'office_document_tracker_staff_v1';
const DROPDOWN_OPTIONS_KEY = 'office_document_tracker_dropdown_options_v2';

export const ROLE_CONFIGS: Record<string, RolePermissionConfig> = {
  'Receiving': {
    role: 'Receiving',
    title: 'Administrative Receiving Officer',
    badgeBg: 'bg-sky-500/10',
    badgeText: 'text-sky-700',
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
  'Staff': {
    role: 'Staff',
    title: 'Action Officer / Desk Personnel',
    badgeBg: 'bg-blue-500/15',
    badgeText: 'text-blue-700',
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
  'Supervisor': {
    role: 'Supervisor',
    title: 'Unit Supervisor / 1st-Line Reviewer',
    badgeBg: 'bg-amber-500/15',
    badgeText: 'text-amber-800',
    badgeBorder: 'border-amber-500/30',
    dotColor: 'bg-amber-500',
    summary: 'First-line supervisory reviewer: conducts preliminary document review and issues directives. Must review and endorse before Division Manager endorsement.',
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
    badgeText: 'text-blue-900',
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
    badgeText: 'text-emerald-700',
    badgeBorder: 'border-emerald-500/20',
    dotColor: 'bg-emerald-500',
    summary: 'Holds executive sign-off authority. Issues official clearance for out, assigns outgoing dispatch numbers, directs releases, and authorizes log deletions.',
    canLogIncoming: true,
    canRecordMovement: true,
    canIssueSupervisorRemarks: true,
    canFulfillCompliance: true,
    canAuthorizeClearance: true,
    canConfigureSync: true,
    canManageStaff: true,
    canDeleteDocuments: true,
    canManageCredentials: false,
    canDeleteDivisionThresholdOverrides: false,
    hierarchyNote: 'Executive Step 3: Final Clearance & Outgoing Dispatch Authorization (Delete Permitted)',
  },
  'System Admin': {
    role: 'System Admin',
    title: 'Registry & Systems Administrator',
    badgeBg: 'bg-slate-700/10',
    badgeText: 'text-slate-800',
    badgeBorder: 'border-slate-500/20',
    dotColor: 'bg-slate-700',
    summary: 'Full system oversight across records, staff credentials enrollment, staff role assignments, dropdown registries, Google Sheets synchronization, division threshold override deletion, and audit trail validation.',
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

// Aliases for backward compatibility
ROLE_CONFIGS['sys admin'] = ROLE_CONFIGS['System Admin'];
ROLE_CONFIGS['receiving'] = ROLE_CONFIGS['Receiving'];
ROLE_CONFIGS['staff'] = ROLE_CONFIGS['Staff'];
ROLE_CONFIGS['supervisor'] = ROLE_CONFIGS['Supervisor'];
ROLE_CONFIGS['division manager'] = ROLE_CONFIGS['Division Manager'];
ROLE_CONFIGS['department manager'] = ROLE_CONFIGS['Department Manager'];
ROLE_CONFIGS['Personnel / Handler'] = ROLE_CONFIGS['Staff'];
ROLE_CONFIGS['Personnel'] = ROLE_CONFIGS['Staff'];
ROLE_CONFIGS['Records Administrator'] = ROLE_CONFIGS['System Admin'];

ROLE_CONFIGS['sys admin'] = ROLE_CONFIGS['System Admin'];
ROLE_CONFIGS['receiving'] = ROLE_CONFIGS['Admin Staff'];
ROLE_CONFIGS['staff'] = ROLE_CONFIGS['Staff'];
ROLE_CONFIGS['supervisor'] = ROLE_CONFIGS['System Admin'];
ROLE_CONFIGS['division manager'] = ROLE_CONFIGS['Division Manager'];
ROLE_CONFIGS['department manager'] = ROLE_CONFIGS['Department Head'];


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
    password: "admin123",
    status: "active",
  },
  {
    id: "staff-0",
    name: "Myles Rovi P. Martinez",
    role: "staff",
    division: "CMED",
    avatarInitials: "MR",
    username: "myles1",
    password: "password123",
    status: "active",
  },
  {
    id: "staff-1",
    name: "Judy F. Villarete",
    role: "staff",
    division: "CMED",
    avatarInitials: "JF",
    username: "judy2",
    password: "password123",
    status: "active",
  },
  {
    id: "staff-2",
    name: "Bryan L. Cabalfin",
    role: "staff",
    division: "CMED",
    avatarInitials: "BL",
    username: "bryan3",
    password: "password123",
    status: "active",
  },
  {
    id: "staff-3",
    name: "Pamela Aprille O. Lumbre",
    role: "staff",
    division: "CMED",
    avatarInitials: "PA",
    username: "pamela4",
    password: "password123",
    status: "active",
  },
  {
    id: "staff-4",
    name: "Benjamin A. Nieva",
    role: "staff",
    division: "CMED",
    avatarInitials: "BA",
    username: "benjamin5",
    password: "password123",
    status: "active",
  },
  {
    id: "staff-5",
    name: "Maria Urduja Jean V. Tabilas",
    role: "staff",
    division: "CMED",
    avatarInitials: "MU",
    username: "maria6",
    password: "password123",
    status: "active",
  },
  {
    id: "staff-6",
    name: "Mary Flor F. Aquino",
    role: "staff",
    division: "CMED",
    avatarInitials: "MF",
    username: "mary7",
    password: "password123",
    status: "active",
  },
  {
    id: "staff-7",
    name: "Aubrey Camille C. Cabrera",
    role: "staff",
    division: "CMED",
    avatarInitials: "AC",
    username: "aubrey8",
    password: "password123",
    status: "active",
  },
  {
    id: "staff-8",
    name: "Anne Katrina S. Del Rosario",
    role: "staff",
    division: "CMED",
    avatarInitials: "AK",
    username: "anne9",
    password: "password123",
    status: "active",
  },
  {
    id: "staff-9",
    name: "Rey Reginald A. Mojica",
    role: "staff",
    division: "CMED",
    avatarInitials: "RR",
    username: "rey10",
    password: "password123",
    status: "active",
  },
  {
    id: "staff-10",
    name: "Janelle Vanessa E. Tanguilig",
    role: "staff",
    division: "CMED",
    avatarInitials: "JV",
    username: "janelle11",
    password: "password123",
    status: "active",
  },
  {
    id: "staff-11",
    name: "Rodolfo M. Torino Jr",
    role: "staff",
    division: "CMED",
    avatarInitials: "RM",
    username: "rodolfo12",
    password: "password123",
    status: "active",
  },
  {
    id: "staff-12",
    name: "Danezel Christian G. Cruz",
    role: "staff",
    division: "CMED",
    avatarInitials: "DC",
    username: "danezel13",
    password: "password123",
    status: "active",
  },
  {
    id: "staff-13",
    name: "John Nicolo V. Salvador",
    role: "staff",
    division: "CMED",
    avatarInitials: "JN",
    username: "john14",
    password: "password123",
    status: "active",
  },
  {
    id: "staff-14",
    name: "Marian Grace Paling",
    role: "staff",
    division: "CMED",
    avatarInitials: "MG",
    username: "marian15",
    password: "password123",
    status: "active",
  },
  {
    id: "staff-15",
    name: "Judy Ann T. Pacaanas",
    role: "staff",
    division: "CMED",
    avatarInitials: "JA",
    username: "judy16",
    password: "password123",
    status: "active",
  },
  {
    id: "staff-16",
    name: "Oscar B. Hanova Jr.",
    role: "staff",
    division: "CMED",
    avatarInitials: "OB",
    username: "oscar17",
    password: "password123",
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
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed to load documents from storage:', e);
  }
  return INITIAL_DOCUMENTS;
}

export function saveStoredDocuments(docs: DocumentItem[]) {
  try {
    safeStorageSet(STORAGE_KEY, JSON.stringify(docs));
    // Cross-device persistence: sync to backend
    fetch('/api/documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(docs),
    }).catch(() => {});
  } catch (e) {
    console.error('Failed to save documents to storage:', e);
  }
}

export function getStoredSheetConfig(): { spreadsheetId: string; spreadsheetUrl: string } | null {
  try {
    const raw = safeStorageGet(SHEET_CONFIG_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed to get sheet config:', e);
  }
  return null;
}

export function saveStoredSheetConfig(config: { spreadsheetId: string; spreadsheetUrl: string } | null) {
  try {
    if (config) {
      safeStorageSet(SHEET_CONFIG_KEY, JSON.stringify(config));
      // Cross-device persistence: sync to backend
      fetch('/api/sheet-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      }).catch(() => {});
    } else {
      safeStorageRemove(SHEET_CONFIG_KEY);
      fetch('/api/sheet-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      }).catch(() => {});
    }
  } catch (e) {
    console.error('Failed to save sheet config:', e);
  }
}

export function getStoredStaffMembers(): AppUserRole[] {
  try {
    const raw = safeStorageGet(STAFF_KEY);
    if (raw) {
      const list = JSON.parse(raw);
      if (Array.isArray(list) && list.length > 0) {
        // Automatically migrate legacy role names & backfill login credentials if missing
        return list.map((staff: AppUserRole, idx: number) => {
          let updatedRole = staff.role;
          if (updatedRole === 'Receiving Staff') updatedRole = 'Admin Staff';
          else if (updatedRole === 'Personnel / Handler' || updatedRole === 'Personnel') updatedRole = 'Staff';
          else if (updatedRole === 'Records Administrator') updatedRole = 'System Admin';

          const defaultUsername = staff.username || (
            staff.name.toLowerCase().replace(/[^a-z0-9]/g, '.').replace(/\.+/g, '.').replace(/^\.|\.$/g, '') ||
            `user${idx + 1}`
          );
          const defaultPassword = staff.password || (updatedRole === 'System Admin' ? 'admin123' : 'password123');

          return {
            ...staff,
            role: updatedRole,
            username: defaultUsername,
            password: defaultPassword,
            status: staff.status || 'active',
          };
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
    safeStorageSet(STAFF_KEY, JSON.stringify(staff));
    // Cross-device persistence: sync to backend
    fetch('/api/staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(staff),
    }).catch(() => {});
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
        roles: Array.isArray(parsed.roles) ? parsed.roles : [],
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
    roles: ['sys admin', 'receiving', 'staff', 'supervisor', 'division manager', 'department manager'],
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

export function getRoleConfig(roleName: string): RolePermissionConfig {
  let mappedRole = roleName;
  if (mappedRole === 'Receiving Staff') mappedRole = 'Admin Staff';
  else if (mappedRole === 'Personnel / Handler' || mappedRole === 'Personnel') mappedRole = 'Staff';
  else if (mappedRole === 'Records Administrator') mappedRole = 'System Admin';

  if (mappedRole && ROLE_CONFIGS[mappedRole]) {
    return ROLE_CONFIGS[mappedRole];
  }
  return {
    role: roleName || 'Staff',
    title: roleName || 'Assigned Officer',
    badgeBg: 'bg-slate-100',
    badgeText: 'text-slate-800',
    badgeBorder: 'border-slate-300',
    dotColor: 'bg-indigo-500',
    summary: 'Custom staff member role with operational tracking, compliance, and movement capabilities.',
    canLogIncoming: true,
    canRecordMovement: true,
    canIssueSupervisorRemarks: true,
    canFulfillCompliance: true,
    canAuthorizeClearance: true,
    canConfigureSync: true,
    canManageStaff: true,
    canDeleteDocuments: false,
  };
}

export function canUserDeleteDocuments(roleName: string): boolean {
  let mappedRole = roleName;
  if (mappedRole === 'Records Administrator') mappedRole = 'System Admin';
  return mappedRole === 'System Admin' || mappedRole === 'Department Manager';
}

export function canUserDeleteDivisionThresholdOverrides(roleName: string): boolean {
  let mappedRole = roleName;
  if (mappedRole === 'Records Administrator') mappedRole = 'System Admin';
  return mappedRole === 'System Admin';
}

export interface CrossDeviceSyncPayload {
  version: number;
  timestamp: string;
  staff: AppUserRole[];
  sheetConfig?: { spreadsheetId: string; spreadsheetUrl: string } | null;
  dropdownOptions?: RegistryDropdownOptions;
}

/**
 * Encodes staff list and configuration into a compact base64 string for instant cross-device transfer
 */
export function encodePersonnelSyncCode(
  staff: AppUserRole[],
  sheetConfig?: { spreadsheetId: string; spreadsheetUrl: string } | null,
  dropdownOptions?: RegistryDropdownOptions
): string {
  try {
    const payload: CrossDeviceSyncPayload = {
      version: 1,
      timestamp: new Date().toISOString(),
      staff,
      sheetConfig,
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
 * Decodes a cross-device transfer code
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
 * Generates an instant share URL that can be opened on any device (smartphone, laptop, PC)
 */
export function generateDeviceShareUrl(
  staff: AppUserRole[],
  sheetConfig?: { spreadsheetId: string; spreadsheetUrl: string } | null
): string {
  const code = encodePersonnelSyncCode(staff, sheetConfig);
  if (!code) return window.location.href;
  const baseUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}`;
  return `${baseUrl}#sync_staff=${code}`;
}

/**
 * Broadcasts data changes across multiple browser tabs on the same computer
 */
export type BroadcastUpdateType =
  | 'STAFF_UPDATED'
  | 'DOCUMENTS_UPDATED'
  | 'SHEET_UPDATED'
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
 * Subscribes to cross-tab updates via BroadcastChannel
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

