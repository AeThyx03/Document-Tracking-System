export interface InternalMovement {
  id: string;
  timestamp: string; // ISO
  personnelName: string;
  personnelRole?: string;
  currentDesk: string;
  forwardToDesk: string;
  statusUpdate: 'received' | 'in_review' | 'acted' | 'forwarded';
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
  documentType: 'Memorandum' | 'Endorsement' | 'Request / Voucher' | 'Official Letter' | 'Project Proposal' | 'Billing / Invoice' | 'Resolution / Order' | 'Others';
  originDepartment: string;
  dateReceived: string; // YYYY-MM-DD
  timeReceived: string; // HH:mm:ss
  targetDivision: string;
  responsiblePerson: string;
  priority: 'Routine' | 'Urgent' | 'Rush';
  currentStatus: 'Incoming Logged' | 'Under Review' | 'Supervisor Comment Needed' | 'Complied / Ready for Clearance' | 'Cleared for Out' | 'Dispatched / Completed';
  currentLocation: string; // e.g. "Records Receiving Desk", "Admin Office Room 2", "Accounting Section"
  currentCustodian: string; // who holds it physically right now
  movements: InternalMovement[];
  supervisorRemarks: SupervisorRemark[];
  managerClearance: ManagerClearance;
  createdAt: string;
  updatedAt: string;
  sheetSynced?: boolean;
  sheetRowIndex?: number;
}

export interface RealtimeNotification {
  id: string;
  timestamp: string;
  trackingNumber: string;
  title: string;
  message: string;
  actor: string;
  type: 'incoming' | 'movement' | 'remark' | 'compliance' | 'clearance' | 'sync';
  read: boolean;
}

export type UserRoleType = string;

export interface RegistryDropdownOptions {
  roles: string[];
  departments: string[];
  desks: string[];
}

export interface AppUserRole {
  id: string;
  name: string;
  role: UserRoleType;
  division: string;
  avatarInitials?: string;
  email?: string;
  assignedDesk?: string;
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
