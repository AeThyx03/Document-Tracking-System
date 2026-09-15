export interface InternalMovement {
  id: string;
  timestamp: string; // ISO
  personnelName: string;
  personnelRole?: string;
  currentDesk: string;
  forwardToDesk: string;
  statusUpdate: 'received' | 'in_review' | 'acted' | 'forwarded' | 'dispatched';
  notes?: string;
}

export interface SupervisorRemark {
  id: string;
  supervisorName: string;
  timestamp: string; // ISO
  remarkText: string;
  complianceRequired: boolean;
  complied: boolean;
  complianceNotes?: string;
  compliedAt?: string;
  compliedBy?: string;
}

export interface ManagerClearance {
  isCleared: boolean;
  clearedBy?: string;
  clearedAt?: string; // ISO
  clearanceType?: 'approved_for_dispatch' | 'archived_completed' | 'returned_for_revision';
  exitTrackingNumber?: string;
  forwardedToExternal?: string;
  clearanceRemarks?: string;
}

export interface DocumentItem {
  id: string; // unique ID or tracking number
  trackingNumber: string;
  title: string;
  direction?: 'Incoming' | 'Outgoing';
  documentType: string;
  communicationType: string;
  reportType: string;
  originDepartment: string;
  dateReceived: string; // YYYY-MM-DD
  timeReceived: string; // HH:mm:ss
  targetDivision: string;
  responsiblePerson: string;
  priority: 'Routine' | 'Urgent' | 'Rush';
  currentStatus: 'Incoming Logged' | 'Under Review' | 'Supervisor Comment Needed' | 'Complied / Ready for Clearance' | 'Cleared for Out' | 'Dispatched / Completed';
  currentLocation: string; // e.g. "Records Receiving Desk", "Admin Office Room 2", "Accounting Section"
  currentCustodian: string; // who holds it physically right now
  fileLink?: string; // Optional external URL or cloud file link (Cloud Storage, OneDrive, PDF, etc.)
  movements: InternalMovement[];
  supervisorRemarks: SupervisorRemark[];
  managerClearance: ManagerClearance;
  version?: number;
  createdAt: string;
  updatedAt: string;
}

export type SortField =
  | 'trackingNumber'
  | 'title'
  | 'dateReceived'
  | 'targetDivision'
  | 'currentCustodian'
  | 'timeInDesk'
  | 'lifecycle';

export type SortDirection = 'asc' | 'desc';

export interface DocumentSortState {
  field: SortField;
  direction: SortDirection;
}

export interface DocumentFilterState {
  searchQuery: string;
  viewMode: 'all' | 'incoming' | 'outgoing' | 'compliance_needed' | 'overdue';
  statusFilter: string;
  divisionFilter: string;
  priorityFilter: string;
}

export interface DocumentPaginationState {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export type AuditActionType =
  | 'DOCUMENT_CREATED'
  | 'MOVEMENT_RECORDED'
  | 'DIRECTIVE_ISSUED'
  | 'COMPLIANCE_FULFILLED'
  | 'CLEARANCE_GRANTED'
  | 'PRIORITY_UPDATED'
  | 'DOCUMENT_FORWARDED'
  | 'STATUS_CHANGED'
  | 'DISPATCHED_COMPLETED'
  | 'DOCUMENT_DELETED'
  | 'BATCH_ACTION_APPLIED';

export interface AuditEventStateSnapshot {
  status?: string;
  location?: string;
  custodian?: string;
  priority?: string;
  direction?: 'Incoming' | 'Outgoing';
  division?: string;
}

export interface AuditEventRecord {
  id: string; // Unique UUID (e.g. aud-...)
  documentId: string;
  trackingNumber: string;
  timestamp: string; // ISO 8601
  actorId?: string;
  actorName: string;
  actorRole: string;
  actorDivision?: string;
  action: AuditActionType;
  actionTitle: string;
  stageLabel: string;
  type: 'inflow' | 'movement' | 'remark' | 'compliance' | 'clearance' | 'system';
  fromDesk?: string;
  toDesk?: string;
  statusUpdate?: string;
  notes?: string;
  previousState?: AuditEventStateSnapshot;
  newState?: AuditEventStateSnapshot;
  complianceRequired?: boolean;
  complied?: boolean;
  clearanceType?: string;
  exitTrackingNumber?: string;
  forwardedToExternal?: string;
  metadata?: Record<string, any>;
  idempotencyKey?: string;
}

export interface RealtimeNotification {
  id: string;
  timestamp: string; // ISO 8601 string
  documentId?: string;
  trackingNumber: string;
  title: string;
  message: string;
  actor: string;
  type: 'incoming' | 'movement' | 'remark' | 'compliance' | 'clearance' | 'urgent' | 'system' | 'sync';
  read: boolean;
  readAt?: string;
  createdAt?: string;
}

export type UserRoleType =
  | 'Receiving'
  | 'Staff'
  | 'Supervisor'
  | 'Division Manager'
  | 'Department Manager'
  | 'System Admin';

export interface RegistryDropdownOptions {
  roles: string[];
  departments: string[];
  desks: string[];
  documentTypes: string[]; // Transaction Types (e.g. Simple Transaction, Complex Transaction)
  transactionTypes?: string[]; // Alias for Transaction Types
  communicationTypes: string[]; // Communication Types (e.g. Memorandum, Letter, Endorsement)
  reportTypes: string[]; // Report / Document Types (e.g. Inspection Report, Audit Report)
  originatingAgencies?: string[]; // Originating Dept / Agency options
  targetDivisions?: string[]; // Forward To / Target Division options
  focalPersons?: string[]; // Designated focal persons selected among enrolled supervisors
  priorities: string[];
  personnel: string[];
}

export const DEFAULT_REGISTRY_DROPDOWN_OPTIONS: RegistryDropdownOptions = {
  roles: ['Receiving', 'Staff', 'Supervisor', 'Division Manager', 'Department Manager', 'System Admin'],
  departments: [
    'Administrative Section',
    'Billing & Collections Section',
    'Finance & Budget Division',
    'Legal & Regulatory Affairs',
    'Safety & Environmental Division',
    'Central Records & Receiving Desk',
  ],
  desks: [
    'Records Receiving Counter A',
    'Finance Evaluation Bay 1',
    'Planning Drafting Bay 2',
    'Central Manager Suite 101',
    'Executive Review Table',
    'Central Registry Systems Hub',
  ],
  documentTypes: [
    'Simple Transaction',
    'Complex Transaction',
    'Highly Technical Transaction',
    'Memorandum',
    'Letter',
    'Indorsement',
    'Report',
  ],
  communicationTypes: [
    'Memorandum',
    'Letter',
    'Endorsement',
    'Office Order',
    'Special Order',
    'Advisory',
    'Circular',
    'Notice',
  ],
  reportTypes: [
    'Inspection Report',
    'Audit Report',
    'Incident Report',
    'Progress Report',
    'Clearance Slip',
    'Financial Statement',
    'Accomplishment Report',
  ],
  originatingAgencies: [
    'Office of the Regional Director',
    'Regional Trial Court',
    'Department of Transportation',
    'Civil Service Commission',
    'Department of Budget and Management',
    'Commission on Audit',
    'Internal POSSD Division',
    'External Contractor / Supplier',
  ],
  targetDivisions: [
    'Administrative Section',
    'Billing & Collections Section',
    'Finance & Budget Division',
    'Legal & Regulatory Affairs',
    'Safety & Environmental Division',
    'Central Records & Receiving Desk',
    'Executive Office of the Manager',
  ],
  focalPersons: ['Mary Flor Aquino', 'Aubrey Camille Cabreras'],
  priorities: ['Routine', 'Urgent', 'Rush'],
  personnel: [],
};

/**
 * User Identity: Core identifiers
 */
export interface UserIdentity {
  id: string;
  uid?: string;
  email?: string;
  username: string;
}

/**
 * User Profile: Presentation & department assignment
 */
export interface UserDisplayProfile {
  name: string;
  avatarInitials?: string;
  division: string;
  assignedDesk?: string;
}

/**
 * Account Status
 */
export type UserAccountStatus = 'active' | 'suspended';

/**
 * Complete Staff / User Member Representation (Frontend display & session state)
 * Note: Never contains passwords or plaintext credentials.
 */
export interface AppUserRole {
  id: string;
  name: string;
  role: UserRoleType;
  division: string;
  avatarInitials?: string;
  email?: string;
  assignedDesk?: string;
  username: string;
  status?: UserAccountStatus;
  lastLogin?: string;
}

export interface RolePermissionConfig {
  role: UserRoleType;
  title: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  dotColor: string;
  summary: string;
  canLogIncoming: boolean;
  canRecordMovement: boolean;
  canIssueSupervisorRemarks: boolean;
  canFulfillCompliance: boolean;
  canAuthorizeClearance: boolean;
  canConfigureSync: boolean;
  canManageStaff: boolean;
  canDeleteDocuments?: boolean;
  canManageCredentials?: boolean;
  canDeleteDivisionThresholdOverrides?: boolean;
  isPrerequisiteBeforeDivisionManager?: boolean;
  hierarchyNote?: string;
}

export interface TimeInDeskConfig {
  defaultThresholdHours: number;
  divisionThresholds: Record<string, number>;
  highlightRowOnExceed: boolean;
}

export interface DocumentTimeMetrics {
  arrivalTimestamp: string;
  elapsedMs: number;
  elapsedHours: number;
  elapsedFormatted: string;
  thresholdHours: number;
  isOverdue: boolean;
  overdueMs: number;
  overdueFormatted: string;
  remainingMs: number;
  remainingFormatted: string;
  isCleared: boolean;
  division: string;
  currentDesk: string;
}

export interface DedicatedLinkItem {
  id: string;
  title: string;
  url: string;
  category: 'Cloud Storage' | 'Official Files' | 'Portals & Systems' | 'Reference Guidelines';
  description?: string;
  targetDivision?: string;
  iconType?: 'storage' | 'file' | 'link' | 'folder';
  addedBy: string;
  addedAt: string;
  isPinned?: boolean;
}

/**
 * Returns movements sorted by timestamp.
 * 'asc': oldest first -> newest last
 * 'desc': newest first -> oldest last
 */
export function getSortedMovements(
  movements?: InternalMovement[] | null,
  order: 'asc' | 'desc' = 'desc'
): InternalMovement[] {
  if (!movements || !Array.isArray(movements) || movements.length === 0) {
    return [];
  }
  return [...movements].sort((a, b) => {
    const timeA = new Date(a.timestamp || 0).getTime();
    const timeB = new Date(b.timestamp || 0).getTime();
    return order === 'asc' ? timeA - timeB : timeB - timeA;
  });
}

/**
 * Returns the latest movement strictly based on newest timestamp,
 * never relying on array indexing order.
 */
export function getLatestMovement(doc?: DocumentItem | null): InternalMovement | undefined {
  if (!doc || !doc.movements || !Array.isArray(doc.movements) || doc.movements.length === 0) {
    return undefined;
  }
  const sorted = getSortedMovements(doc.movements, 'desc');
  return sorted[0];
}

/**
 * Safely normalizes a DocumentItem to ensure all required fields, arrays, and objects exist,
 * preventing runtime crashes from malformed or partial localStorage / API data.
 */
export function normalizeDocumentItem(doc: any): DocumentItem {
  if (!doc || typeof doc !== 'object') {
    throw new Error('Invalid document object');
  }

  const isCleared = !!(
    doc.managerClearance?.isCleared ||
    doc.currentStatus === 'Cleared for Out' ||
    doc.currentStatus === 'Dispatched / Completed'
  );

  return {
    id: String(doc.id || doc.trackingNumber || `doc-${Date.now()}`),
    trackingNumber: String(doc.trackingNumber || doc.id || 'TRK-UNKNOWN'),
    title: String(doc.title || 'Untitled Document'),
    direction: doc.direction === 'Outgoing' || isCleared ? 'Outgoing' : 'Incoming',
    documentType: doc.documentType || 'Simple Transaction',
    communicationType: doc.communicationType || 'General Communication',
    reportType: doc.reportType || 'Standard',
    originDepartment: String(doc.originDepartment || 'General Inflow'),
    dateReceived: String(doc.dateReceived || new Date().toISOString().slice(0, 10)),
    timeReceived: String(doc.timeReceived || '08:00:00'),
    targetDivision: String(doc.targetDivision || 'General Administration'),
    responsiblePerson: String(doc.responsiblePerson || 'Records Custodian'),
    priority: doc.priority || 'Routine',
    currentStatus: doc.currentStatus || (isCleared ? 'Cleared for Out' : 'Incoming Logged'),
    currentLocation: String(doc.currentLocation || 'Receiving Desk'),
    currentCustodian: String(doc.currentCustodian || 'Records Custodian'),
    fileLink: doc.fileLink || undefined,
    movements: Array.isArray(doc.movements) ? doc.movements : [],
    supervisorRemarks: Array.isArray(doc.supervisorRemarks) ? doc.supervisorRemarks : [],
    managerClearance:
      doc.managerClearance && typeof doc.managerClearance === 'object'
        ? {
            isCleared: !!doc.managerClearance.isCleared,
            clearedBy: doc.managerClearance.clearedBy,
            clearedAt: doc.managerClearance.clearedAt,
            clearanceType: doc.managerClearance.clearanceType,
            exitTrackingNumber: doc.managerClearance.exitTrackingNumber,
            forwardedToExternal: doc.managerClearance.forwardedToExternal,
            clearanceRemarks: doc.managerClearance.clearanceRemarks,
          }
        : { isCleared: false },
    version: typeof doc.version === 'number' ? doc.version : 1,
    createdAt: doc.createdAt || new Date().toISOString(),
    updatedAt: doc.updatedAt || new Date().toISOString(),
  };
}

/**
 * Generates an authoritative POSSD tracking number in the standard format: POSSD-YYYY-MM-XXXX
 * Where:
 * - POSSD: fixed prefix
 * - YYYY: 4-digit current year
 * - MM: 2-digit month (01-12)
 * - XXXX: 4-digit padded sequential number
 */
export function generatePOSSDTrackingNumber(existingDocs?: DocumentItem[]): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const prefix = `POSSD-${yyyy}-${mm}-`;

  let maxSeq = 0;
  if (existingDocs && Array.isArray(existingDocs)) {
    for (const doc of existingDocs) {
      if (doc.trackingNumber && doc.trackingNumber.startsWith(prefix)) {
        const seqPart = doc.trackingNumber.slice(prefix.length);
        const parsed = parseInt(seqPart, 10);
        if (!isNaN(parsed) && parsed > maxSeq) {
          maxSeq = parsed;
        }
      }
    }
  }

  const nextSeq = maxSeq + 1;
  const xxxx = String(nextSeq).padStart(4, '0');
  return `${prefix}${xxxx}`;
}

/**
 * Parses Philippine local date (YYYY-MM-DD) and optional local time (HH:mm or HH:mm:ss)
 * to a standardized ISO 8601 UTC timestamp string.
 * Asia/Manila is UTC+08:00.
 */
export function parsePhilippineDateToISO(dateStr: string, timeStr?: string): string {
  if (!dateStr) return new Date().toISOString();
  const time = timeStr ? (timeStr.length === 5 ? `${timeStr}:00` : timeStr) : '08:00:00';
  if (dateStr.includes('T')) {
    const d = new Date(dateStr);
    return !isNaN(d.getTime()) ? d.toISOString() : new Date().toISOString();
  }
  const isoLocal = `${dateStr}T${time}+08:00`;
  const parsed = new Date(isoLocal);
  return !isNaN(parsed.getTime()) ? parsed.toISOString() : new Date().toISOString();
}

/**
 * Formats an ISO or UTC date string for display in Asia/Manila timezone (PHT).
 */
export function formatPhilippineDateTime(isoString?: string | null): string {
  if (!isoString) return 'N/A';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return String(isoString);
  return d.toLocaleString('en-US', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}
