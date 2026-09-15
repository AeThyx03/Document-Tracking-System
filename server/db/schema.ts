import { relations } from 'drizzle-orm';
import { boolean, integer, pgTable, serial, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core';

// -------------------------------------------------------------
// 1. USERS (Authentication Accounts)
// -------------------------------------------------------------
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  username: text('username').unique(),
  passwordHash: text('password_hash'), // Never stored plaintext
  role: text('role').notNull().default('Staff'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// -------------------------------------------------------------
// 2. PERSONNEL (Employees / Staff Profiles)
// -------------------------------------------------------------
export const personnel = pgTable('personnel', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
  name: text('name').notNull(),
  role: text('role').notNull(), // UserRoleType ('Receiving' | 'Staff' | 'Supervisor' | 'Division Manager' | 'Department Manager' | 'System Admin')
  division: text('division').notNull(),
  avatarInitials: text('avatar_initials'),
  email: text('email').unique(),
  assignedDesk: text('assigned_desk'),
  username: text('username').notNull().unique(),
  status: text('status').default('active'), // 'active' | 'suspended'
  lastLogin: timestamp('last_login'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// -------------------------------------------------------------
// -------------------------------------------------------------
// 3. DEPARTMENTS & DESKS
// -------------------------------------------------------------
export const departments = pgTable('departments', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  code: text('code'),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const desks = pgTable('desks', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  departmentId: integer('department_id').references(() => departments.id, { onDelete: 'set null' }),
  code: text('code'),
  description: text('description'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => {
  return {
    nameIdx: index('idx_desks_name').on(table.name),
  };
});

// -------------------------------------------------------------
// 4. DOCUMENTS (Authoritative Store with Optimistic Concurrency)
// -------------------------------------------------------------
export const documents = pgTable('documents', {
  id: text('id').primaryKey(), // Preserves existing string IDs (e.g. 'doc_172000...')
  trackingNumber: text('tracking_number').notNull().unique(),
  title: text('title').notNull(),
  direction: text('direction').default('Incoming'), // 'Incoming' | 'Outgoing'
  documentType: text('document_type').notNull(),
  communicationType: text('communication_type').notNull(),
  reportType: text('report_type').notNull(),
  originDepartment: text('origin_department').notNull(),
  dateReceived: text('date_received').notNull(),
  timeReceived: text('time_received').notNull(),
  targetDivision: text('target_division').notNull(),
  responsiblePerson: text('responsible_person').notNull(),
  responsiblePersonId: integer('responsible_person_id').references(() => personnel.id, { onDelete: 'set null' }),
  priority: text('priority').notNull().default('Routine'), // 'Routine' | 'Urgent' | 'Rush'
  currentStatus: text('current_status').notNull(),
  currentLocation: text('current_location').notNull(),
  currentCustodian: text('current_custodian').notNull(),
  currentCustodianId: integer('current_custodian_id').references(() => personnel.id, { onDelete: 'set null' }),
  currentDeskId: integer('current_desk_id').references(() => desks.id, { onDelete: 'set null' }),
  fileLink: text('file_link'),
  version: integer('version').notNull().default(1), // Concurrency version
  // Manager Clearance fields
  isCleared: boolean('is_cleared').default(false),
  clearedBy: text('cleared_by'),
  clearedAt: timestamp('cleared_at'),
  clearanceType: text('clearance_type'),
  exitTrackingNumber: text('exit_tracking_number'),
  forwardedToExternal: text('forwarded_to_external'),
  clearanceRemarks: text('clearance_remarks'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => {
  return {
    trackingNumberIdx: index('idx_docs_tracking_number').on(table.trackingNumber),
    currentStatusIdx: index('idx_docs_current_status').on(table.currentStatus),
    currentLocationIdx: index('idx_docs_current_location').on(table.currentLocation),
    currentCustodianIdx: index('idx_docs_current_custodian').on(table.currentCustodian),
    targetDivisionIdx: index('idx_docs_target_division').on(table.targetDivision),
    responsiblePersonIdx: index('idx_docs_responsible_person').on(table.responsiblePerson),
    createdAtIdx: index('idx_docs_created_at').on(table.createdAt),
    updatedAtIdx: index('idx_docs_updated_at').on(table.updatedAt),
  };
});

// -------------------------------------------------------------
// 5. DOCUMENT MOVEMENTS (Append-Oriented Audit of Routing)
// -------------------------------------------------------------
export const documentMovements = pgTable('document_movements', {
  id: text('id').primaryKey(),
  documentId: text('document_id').references(() => documents.id, { onDelete: 'cascade' }).notNull(),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
  personnelName: text('personnel_name').notNull(),
  personnelRole: text('personnel_role'),
  currentDesk: text('current_desk').notNull(),
  forwardToDesk: text('forward_to_desk').notNull(),
  statusUpdate: text('status_update').notNull(),
  notes: text('notes'),
  fromDepartment: text('from_department'),
  toDepartment: text('to_department'),
  fromPersonnelId: integer('from_personnel_id').references(() => personnel.id, { onDelete: 'set null' }),
  toPersonnelId: integer('to_personnel_id').references(() => personnel.id, { onDelete: 'set null' }),
  actorUserId: integer('actor_user_id').references(() => users.id, { onDelete: 'set null' }),
  fromDeskId: integer('from_desk_id').references(() => desks.id, { onDelete: 'set null' }),
  toDeskId: integer('to_desk_id').references(() => desks.id, { onDelete: 'set null' }),
  routedAt: timestamp('routed_at'),
  receivedAt: timestamp('received_at'),
  forwardedAt: timestamp('forwarded_at'),
  createdBy: text('created_by'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => {
  return {
    docIdIdx: index('idx_mov_document_id').on(table.documentId),
    createdAtIdx: index('idx_mov_created_at').on(table.createdAt),
    toDeptIdx: index('idx_mov_to_department').on(table.toDepartment),
    toPersonnelIdx: index('idx_mov_to_personnel_id').on(table.toPersonnelId),
  };
});

// -------------------------------------------------------------
// 6. DOCUMENT REMARKS (Supervisor Compliance Remarks)
// -------------------------------------------------------------
export const documentRemarks = pgTable('document_remarks', {
  id: text('id').primaryKey(),
  documentId: text('document_id').references(() => documents.id, { onDelete: 'cascade' }).notNull(),
  supervisorName: text('supervisor_name').notNull(),
  supervisorUserId: integer('supervisor_user_id').references(() => users.id, { onDelete: 'set null' }),
  supervisorPersonnelId: integer('supervisor_personnel_id').references(() => personnel.id, { onDelete: 'set null' }),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
  remarkText: text('remark_text').notNull(),
  complianceRequired: boolean('compliance_required').notNull().default(false),
  complied: boolean('complied').notNull().default(false),
  complianceNotes: text('compliance_notes'),
  compliedAt: timestamp('complied_at'),
  compliedBy: text('complied_by'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => {
  return {
    docIdIdx: index('idx_rem_document_id').on(table.documentId),
  };
});

// -------------------------------------------------------------
// 7. MANAGER CLEARANCES (Authoritative Normalized Clearance Records)
// -------------------------------------------------------------
export const managerClearances = pgTable('manager_clearances', {
  id: serial('id').primaryKey(),
  documentId: text('document_id').references(() => documents.id, { onDelete: 'cascade' }).notNull().unique(),
  isCleared: boolean('is_cleared').notNull().default(false),
  clearedBy: text('cleared_by'),
  clearedByUserId: integer('cleared_by_user_id').references(() => users.id, { onDelete: 'set null' }),
  clearedByPersonnelId: integer('cleared_by_personnel_id').references(() => personnel.id, { onDelete: 'set null' }),
  clearedAt: timestamp('cleared_at'),
  clearanceType: text('clearance_type'),
  exitTrackingNumber: text('exit_tracking_number'),
  forwardedToExternal: text('forwarded_to_external'),
  clearanceRemarks: text('clearance_remarks'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => {
  return {
    docIdIdx: index('idx_mc_document_id').on(table.documentId),
    docClearedIdx: index('idx_mc_doc_cleared').on(table.documentId, table.isCleared),
  };
});

// -------------------------------------------------------------
// 8. SLA RULES (Configurable Division and Global Thresholds)
// -------------------------------------------------------------
export const slaRules = pgTable('sla_rules', {
  id: serial('id').primaryKey(),
  targetType: text('target_type').notNull(), // 'default' or 'division'
  targetName: text('target_name'), // division name, null for default
  thresholdHours: integer('threshold_hours').notNull(),
  highlightRowOnExceed: boolean('highlight_row_on_exceed').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// -------------------------------------------------------------
// 9. BUSINESS HOURS (Operating Schedule)
// -------------------------------------------------------------
export const businessHours = pgTable('business_hours', {
  id: serial('id').primaryKey(),
  dayOfWeek: integer('day_of_week').notNull(), // 0=Sun, 1=Mon, ..., 6=Sat
  isOpen: boolean('is_open').notNull().default(true),
  openTime: text('open_time').notNull().default('08:00'),
  closeTime: text('close_time').notNull().default('17:00'),
  createdAt: timestamp('created_at').defaultNow(),
});

// -------------------------------------------------------------
// 10. HOLIDAYS (Calendar Exclusions)
// -------------------------------------------------------------
export const holidays = pgTable('holidays', {
  id: serial('id').primaryKey(),
  date: text('date').notNull().unique(), // YYYY-MM-DD
  name: text('name').notNull(),
  isWorkingDayOverride: boolean('is_working_day_override').default(false),
  isHalfDay: boolean('is_half_day').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

// -------------------------------------------------------------
// 11. AUDIT LOGS (Security & Mutation Trail)
// -------------------------------------------------------------
export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
  userId: text('user_id'),
  action: text('action').notNull(), // 'create', 'update', 'delete', 'route', 'clear'
  entityType: text('entity_type').notNull(), // 'document', 'personnel', 'sla_rule', 'settings'
  entityId: text('entity_id'),
  oldValue: jsonb('old_value'),
  newValue: jsonb('new_value'),
  metadata: jsonb('metadata'),
}, (table) => {
  return {
    entityIdIdx: index('idx_audit_entity_id').on(table.entityId),
    timestampIdx: index('idx_audit_timestamp').on(table.timestamp),
  };
});

// -------------------------------------------------------------
// 12. DEDICATED LINKS (Quick Resource Portal)
// -------------------------------------------------------------
export const dedicatedLinks = pgTable('dedicated_links', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  url: text('url').notNull(),
  category: text('category').default('General'),
  icon: text('icon').default('ExternalLink'),
  description: text('description'),
  orderIndex: integer('order_index').default(0),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

// -------------------------------------------------------------
// 13. DROPDOWN OPTIONS (Categorized Form Select Values)
// -------------------------------------------------------------
export const dropdownOptions = pgTable('dropdown_options', {
  id: serial('id').primaryKey(),
  category: text('category').notNull(), // 'document_types' | 'communication_types' | 'report_types' | 'divisions'
  value: text('value').notNull(),
  label: text('label').notNull(),
  sortOrder: integer('sort_order').default(0),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

// -------------------------------------------------------------
// 14. SYSTEM SETTINGS (Key-Value Platform Configurations)
// -------------------------------------------------------------
export const systemSettings = pgTable('system_settings', {
  key: text('key').primaryKey(),
  value: jsonb('value').notNull(),
  description: text('description'),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// -------------------------------------------------------------
// RELATIONS
// -------------------------------------------------------------
export const documentsRelations = relations(documents, ({ many, one }) => ({
  movements: many(documentMovements),
  remarks: many(documentRemarks),
  clearance: one(managerClearances, {
    fields: [documents.id],
    references: [managerClearances.documentId],
  }),
}));

export const documentMovementsRelations = relations(documentMovements, ({ one }) => ({
  document: one(documents, {
    fields: [documentMovements.documentId],
    references: [documents.id],
  }),
}));

export const documentRemarksRelations = relations(documentRemarks, ({ one }) => ({
  document: one(documents, {
    fields: [documentRemarks.documentId],
    references: [documents.id],
  }),
}));

export const personnelRelations = relations(personnel, ({ one }) => ({
  user: one(users, {
    fields: [personnel.userId],
    references: [users.id],
  }),
}));

export const desksRelations = relations(desks, ({ one }) => ({
  department: one(departments, {
    fields: [desks.departmentId],
    references: [departments.id],
  }),
}));

export const managerClearancesRelations = relations(managerClearances, ({ one }) => ({
  document: one(documents, {
    fields: [managerClearances.documentId],
    references: [documents.id],
  }),
  clearedByUser: one(users, {
    fields: [managerClearances.clearedByUserId],
    references: [users.id],
  }),
  clearedByPersonnel: one(personnel, {
    fields: [managerClearances.clearedByPersonnelId],
    references: [personnel.id],
  }),
}));
