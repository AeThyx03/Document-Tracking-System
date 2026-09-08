import { DocumentItem, AppUserRole, RolePermissionConfig, UserRoleType, RegistryDropdownOptions } from './types';

const STORAGE_KEY = 'office_document_tracker_data_v1';
const SHEET_CONFIG_KEY = 'office_document_tracker_sheet_config_v1';
const STAFF_KEY = 'office_document_tracker_staff_v1';
const DROPDOWN_OPTIONS_KEY = 'office_document_tracker_dropdown_options_v2';

export const ROLE_CONFIGS: Record<string, RolePermissionConfig> = {
  'Admin Staff': {
    role: 'Admin Staff',
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
ROLE_CONFIGS['Receiving Staff'] = ROLE_CONFIGS['Admin Staff'];
ROLE_CONFIGS['Personnel / Handler'] = ROLE_CONFIGS['Staff'];
ROLE_CONFIGS['Personnel'] = ROLE_CONFIGS['Staff'];
ROLE_CONFIGS['Records Administrator'] = ROLE_CONFIGS['System Admin'];

export const INITIAL_STAFF_MEMBERS: AppUserRole[] = [
  {
    id: 'staff-1',
    name: 'Ana Cruz',
    role: 'Admin Staff',
    division: 'Central Records & Receiving Desk',
    avatarInitials: 'AC',
    email: 'ana.cruz@agency.gov',
    assignedDesk: 'Records Receiving Counter A',
    username: 'ana.cruz',
    password: 'password123',
    status: 'active',
  },
  {
    id: 'staff-2',
    name: 'Patrick Lopez',
    role: 'Staff',
    division: 'Finance & Budget Division',
    avatarInitials: 'PL',
    email: 'patrick.lopez@agency.gov',
    assignedDesk: 'Finance Analysis Station 4',
    username: 'patrick.l',
    password: 'password123',
    status: 'active',
  },
  {
    id: 'staff-3',
    name: 'Arch. Dominic Reyes',
    role: 'Staff',
    division: 'Planning & Quality Assurance',
    avatarInitials: 'DR',
    email: 'dominic.reyes@agency.gov',
    assignedDesk: 'Planning Drafting Bay 2',
    username: 'dominic.r',
    password: 'password123',
    status: 'active',
  },
  {
    id: 'staff-4',
    name: 'Atty. Victor Ramos',
    role: 'Supervisor',
    division: 'Finance & Budget Division',
    avatarInitials: 'VR',
    email: 'victor.ramos@agency.gov',
    assignedDesk: 'Supervisor Review Station',
    username: 'victor.r',
    password: 'password123',
    status: 'active',
  },
  {
    id: 'staff-5',
    name: 'Dir. Melissa Santos',
    role: 'Division Manager',
    division: 'Planning & Quality Assurance',
    avatarInitials: 'MS',
    email: 'melissa.santos@agency.gov',
    assignedDesk: 'Division Chief Office',
    username: 'melissa.s',
    password: 'password123',
    status: 'active',
  },
  {
    id: 'staff-6',
    name: 'Dr. Evelyn Morales',
    role: 'Department Manager',
    division: 'Executive Office of the Manager',
    avatarInitials: 'EM',
    email: 'evelyn.morales@agency.gov',
    assignedDesk: 'Central Manager Suite 101',
    username: 'evelyn.m',
    password: 'password123',
    status: 'active',
  },
  {
    id: 'staff-7',
    name: 'Marcus Vance',
    role: 'System Admin',
    division: 'Information & Records Technology',
    avatarInitials: 'MV',
    email: 'marcus.vance@agency.gov',
    assignedDesk: 'Central Registry Systems Hub',
    username: 'admin',
    password: 'admin123',
    status: 'active',
  },
];

export const INITIAL_DOCUMENTS: DocumentItem[] = [
  {
    id: 'DOC-2026-0891',
    trackingNumber: 'TRK-2026-0891',
    title: 'FY2027 Budget Allocation Proposal for IT Infrastructure Upgrades',
    documentType: 'Project Proposal',
    originDepartment: 'Information Technology Division',
    dateReceived: '2026-09-06',
    timeReceived: '08:15:30',
    targetDivision: 'Finance & Budget Division',
    responsiblePerson: 'Engr. Sarah Jenkins',
    priority: 'Urgent',
    currentStatus: 'Under Review',
    currentLocation: 'Finance Analysis Section - Desk 4',
    currentCustodian: 'Mr. Patrick Lopez (Budget Analyst)',
    fileLink: 'https://drive.google.com/file/d/1A2bC3d4E5f6G7h8_BudgetProposal2027/view',
    movements: [
      {
        id: 'mov-1',
        timestamp: '2026-09-06T08:15:30Z',
        personnelName: 'Receiving Officer Ana Cruz',
        currentDesk: 'Central Records & Inflow Desk',
        forwardToDesk: 'Finance Division Receiving Section',
        statusUpdate: 'received',
        notes: 'Signed and stamped physical duplicate copy.',
      },
      {
        id: 'mov-2',
        timestamp: '2026-09-06T09:40:12Z',
        personnelName: 'Patrick Lopez',
        currentDesk: 'Finance Division Receiving Section',
        forwardToDesk: 'Finance Analysis Section - Desk 4',
        statusUpdate: 'in_review',
        notes: 'Verifying itemized costing table against procurement ceiling guidelines.',
      },
    ],
    supervisorRemarks: [
      {
        id: 'rem-1',
        supervisorName: 'Atty. Victor Ramos (Finance Supervisor)',
        timestamp: '2026-09-06T10:15:00Z',
        remarkText: 'Please cross-reference Section 4.2 with the Regional Director memorandum dated Aug 15 before forwarding to Department Manager.',
        complianceRequired: true,
        complied: false,
        complianceNotes: '',
      },
    ],
    managerClearance: {
      isCleared: false,
    },
    createdAt: '2026-09-06T08:15:30Z',
    updatedAt: '2026-09-06T10:15:00Z',
  },
  {
    id: 'DOC-2026-0890',
    trackingNumber: 'TRK-2026-0890',
    title: 'Quarterly Environmental Assessment Report & Compliance Certification',
    documentType: 'Endorsement',
    originDepartment: 'Department of Environment & Natural Resources (Regional)',
    dateReceived: '2026-09-06',
    timeReceived: '07:45:00',
    targetDivision: 'Planning & Quality Assurance',
    responsiblePerson: 'Arch. Dominic Reyes',
    priority: 'Routine',
    currentStatus: 'Supervisor Comment Needed',
    currentLocation: 'Supervisor Desk - Room 302',
    currentCustodian: 'Dir. Melissa Santos',
    movements: [
      {
        id: 'mov-201',
        timestamp: '2026-09-06T07:45:00Z',
        personnelName: 'Officer Ben Torres',
        currentDesk: 'Central Inflow Desk',
        forwardToDesk: 'Planning Receiving Cubicle',
        statusUpdate: 'received',
        notes: 'Complete with attachments and topographic maps.',
      },
      {
        id: 'mov-202',
        timestamp: '2026-09-06T08:30:00Z',
        personnelName: 'Arch. Dominic Reyes',
        currentDesk: 'Planning Receiving Cubicle',
        forwardToDesk: 'Supervisor Desk - Room 302',
        statusUpdate: 'forwarded',
        notes: 'Drafted endorsement summary for supervisor evaluation.',
      },
    ],
    supervisorRemarks: [
      {
        id: 'rem-201',
        supervisorName: 'Dir. Melissa Santos',
        timestamp: '2026-09-06T09:10:00Z',
        remarkText: 'Attach Appendix C (Air Quality particulate index) to fulfill environmental oversight prerequisites.',
        complianceRequired: true,
        complied: true,
        complianceNotes: 'Appendix C successfully appended from DENR certified copies by Dominic Reyes.',
        compliedAt: '2026-09-06T11:20:00Z',
        compliedBy: 'Arch. Dominic Reyes',
      },
    ],
    managerClearance: {
      isCleared: false,
    },
    createdAt: '2026-09-06T07:45:00Z',
    updatedAt: '2026-09-06T11:20:00Z',
  },
  {
    id: 'DOC-2026-0888',
    trackingNumber: 'TRK-2026-0888',
    title: 'Inter-Agency Emergency Disaster Response Protocol Memorandum',
    documentType: 'Memorandum',
    originDepartment: 'Office of Civil Defense / National DRRM',
    dateReceived: '2026-09-05',
    timeReceived: '14:22:15',
    targetDivision: 'Operations & Emergency Management',
    responsiblePerson: 'Col. Raymond Delgado',
    priority: 'Rush',
    currentStatus: 'Cleared for Out',
    currentLocation: 'Dispatch & Outgoing Courier Station',
    currentCustodian: 'Courier Officer Mateo Gomez',
    fileLink: 'https://docs.google.com/document/d/1OCD-Emergency-Protocol-Memo-v2/edit',
    movements: [
      {
        id: 'mov-301',
        timestamp: '2026-09-05T14:22:15Z',
        personnelName: 'Records Officer Ana Cruz',
        currentDesk: 'Central Records & Inflow Desk',
        forwardToDesk: 'Operations Section Chief Desk',
        statusUpdate: 'received',
      },
      {
        id: 'mov-302',
        timestamp: '2026-09-05T15:00:00Z',
        personnelName: 'Col. Raymond Delgado',
        currentDesk: 'Operations Section Chief Desk',
        forwardToDesk: 'Department Manager Executive Suite',
        statusUpdate: 'acted',
        notes: 'Action plan fully consolidated and verified with regional offices.',
      },
      {
        id: 'mov-303',
        timestamp: '2026-09-06T07:30:00Z',
        personnelName: 'Executive Assistant Clara Vance',
        currentDesk: 'Department Manager Executive Suite',
        forwardToDesk: 'Dispatch & Outgoing Courier Station',
        statusUpdate: 'forwarded',
        notes: 'Cleared by Department Manager for immediate inter-agency dissemination.',
      },
    ],
    supervisorRemarks: [
      {
        id: 'rem-301',
        supervisorName: 'Operations Chief Roland Kim',
        timestamp: '2026-09-05T15:30:00Z',
        remarkText: 'Check contact hotlines for Region IV-A and Region III clusters.',
        complianceRequired: true,
        complied: true,
        complianceNotes: 'Hotline directory updated and verified active.',
        compliedAt: '2026-09-05T16:15:00Z',
        compliedBy: 'Col. Raymond Delgado',
      },
    ],
    managerClearance: {
      isCleared: true,
      clearedBy: 'Dr. Evelyn Morales, Department Director',
      clearedAt: '2026-09-06T07:15:00Z',
      clearanceType: 'approved_for_dispatch',
      exitTrackingNumber: 'OUT-DISPATCH-2026-0419',
      forwardedToExternal: 'Office of Civil Defense National Operations Center',
      clearanceRemarks: 'Approved for urgent transmission. Ensure signed courier receipt acknowledgment.',
    },
    createdAt: '2026-09-05T14:22:15Z',
    updatedAt: '2026-09-06T07:30:00Z',
  },
  {
    id: 'DOC-2026-0872',
    trackingNumber: 'TRK-2026-0872',
    title: 'COA Annual Audit Observation Memorandum & Fiscal Compliance Requirement',
    documentType: 'Official Letter',
    originDepartment: 'Commission on Audit (COA) Field Office',
    dateReceived: '2026-09-03',
    timeReceived: '09:00:00',
    targetDivision: 'Finance & Budget Division',
    responsiblePerson: 'Engr. Sarah Jenkins',
    priority: 'Urgent',
    currentStatus: 'Under Review',
    currentLocation: 'Accounting & Disbursement Section - Desk 2',
    currentCustodian: 'Mr. Patrick Lopez (Budget Analyst)',
    movements: [
      {
        id: 'mov-401',
        timestamp: '2026-09-03T09:00:00Z',
        personnelName: 'Receiving Officer Ana Cruz',
        currentDesk: 'Central Records & Inflow Desk',
        forwardToDesk: 'Accounting & Disbursement Section - Desk 2',
        statusUpdate: 'received',
        notes: 'Received official COA audit memorandum duplicate.',
      },
      {
        id: 'mov-402',
        timestamp: '2026-09-04T10:30:00Z',
        personnelName: 'Patrick Lopez',
        currentDesk: 'Accounting & Disbursement Section - Desk 2',
        forwardToDesk: 'Accounting & Disbursement Section - Desk 2',
        statusUpdate: 'in_review',
        notes: 'Pending liquidation vouchers from provincial field branches.',
      },
    ],
    supervisorRemarks: [
      {
        id: 'rem-401',
        supervisorName: 'Atty. Victor Ramos (Finance Supervisor)',
        timestamp: '2026-09-04T14:00:00Z',
        remarkText: 'Consolidate bank reconciliation statements and prepare formal reply matrix.',
        complianceRequired: true,
        complied: false,
        complianceNotes: '',
      },
    ],
    managerClearance: {
      isCleared: false,
    },
    createdAt: '2026-09-03T09:00:00Z',
    updatedAt: '2026-09-04T14:00:00Z',
  },
  {
    id: 'DOC-2026-0865',
    trackingNumber: 'TRK-2026-0865',
    title: 'Urgent Typhoon Drainage Relief Contingency Mobilization Order',
    documentType: 'Resolution / Order',
    originDepartment: 'National Disaster Risk Reduction Council',
    dateReceived: '2026-09-05',
    timeReceived: '08:00:00',
    targetDivision: 'Operations & Emergency Management',
    responsiblePerson: 'Col. Raymond Delgado',
    priority: 'Rush',
    currentStatus: 'Supervisor Comment Needed',
    currentLocation: 'Emergency Ops Action Center - Desk 1',
    currentCustodian: 'Col. Raymond Delgado',
    movements: [
      {
        id: 'mov-501',
        timestamp: '2026-09-05T08:00:00Z',
        personnelName: 'Officer Ben Torres',
        currentDesk: 'Central Records & Inflow Desk',
        forwardToDesk: 'Emergency Ops Action Center - Desk 1',
        statusUpdate: 'received',
        notes: 'Priority mobilization directive.',
      },
    ],
    supervisorRemarks: [
      {
        id: 'rem-501',
        supervisorName: 'Operations Chief Roland Kim',
        timestamp: '2026-09-05T09:30:00Z',
        remarkText: 'Confirm standby equipment inventory with Region IV-B dispatcher.',
        complianceRequired: true,
        complied: false,
        complianceNotes: '',
      },
    ],
    managerClearance: {
      isCleared: false,
    },
    createdAt: '2026-09-05T08:00:00Z',
    updatedAt: '2026-09-05T09:30:00Z',
  },
];

export function getStoredDocuments(): DocumentItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
  } catch (e) {
    console.error('Failed to save documents to storage:', e);
  }
}

export function getStoredSheetConfig(): { spreadsheetId: string; spreadsheetUrl: string } | null {
  try {
    const raw = localStorage.getItem(SHEET_CONFIG_KEY);
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
      localStorage.setItem(SHEET_CONFIG_KEY, JSON.stringify(config));
    } else {
      localStorage.removeItem(SHEET_CONFIG_KEY);
    }
  } catch (e) {
    console.error('Failed to save sheet config:', e);
  }
}

export function getStoredStaffMembers(): AppUserRole[] {
  try {
    const raw = localStorage.getItem(STAFF_KEY);
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
    localStorage.setItem(STAFF_KEY, JSON.stringify(staff));
  } catch (e) {
    console.error('Failed to save staff members:', e);
  }
}

export function getStoredDropdownOptions(): RegistryDropdownOptions {
  try {
    const raw = localStorage.getItem(DROPDOWN_OPTIONS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        roles: Array.isArray(parsed.roles) ? parsed.roles : [],
        departments: Array.isArray(parsed.departments) ? parsed.departments : [],
        desks: Array.isArray(parsed.desks) ? parsed.desks : [],
      };
    }
  } catch (e) {
    console.error('Failed to get dropdown options:', e);
  }
  // User explicitly asked to delete all default entries in assigned roles, department/division, assigned Desk
  return {
    roles: [],
    departments: [],
    desks: [],
  };
}

export function saveStoredDropdownOptions(options: RegistryDropdownOptions) {
  try {
    localStorage.setItem(DROPDOWN_OPTIONS_KEY, JSON.stringify(options));
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

