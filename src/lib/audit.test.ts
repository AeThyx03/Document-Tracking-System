/**
 * POSSD Office Document Tracker - Audit & Notification Engine Unit Tests
 */

import {
  createAuditEvent,
  recordGlobalAudit,
  getGlobalAuditLogs,
  compileDocumentAuditTrail,
  resetAuditLogForTesting,
} from './audit';
import {
  createBusinessNotification,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getUnreadNotificationCount,
  deleteNotification,
} from './notifications';
import { DocumentItem, AuditEventRecord } from '../types';

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`✅ PASS: ${msg}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${msg}`);
    failed++;
  }
}

console.log('\n--- POSSD Audit & Notification Engine Unit Tests ---');

// Reset state
resetAuditLogForTesting();

// 1. Audit Event Generation
const event = createAuditEvent({
  documentId: 'doc-101',
  trackingNumber: 'TRK-2026-001',
  action: 'DOCUMENT_CREATED',
  actionTitle: 'Incoming Document Logged & Registered',
  stageLabel: 'Stage 1: Inflow',
  type: 'inflow',
  actor: {
    id: 'usr-01',
    name: 'Maria Santos',
    role: 'Receiving Staff',
    division: 'Records Section',
  },
  fromDesk: 'External Sender',
  toDesk: 'Records Receiving Desk',
  notes: 'Initial receipt of memorandum',
  newState: {
    status: 'Incoming Logged',
    location: 'Records Receiving Desk',
    custodian: 'Maria Santos',
    priority: 'Routine',
  },
});

assert(event.id.startsWith('aud-'), 'generateAuditEvent produces aud- prefix');
assert(event.documentId === 'doc-101', 'documentId preserved in event');
assert(event.trackingNumber === 'TRK-2026-001', 'trackingNumber preserved in event');
assert(event.actorName === 'Maria Santos', 'actorName preserved in event');
assert(event.action === 'DOCUMENT_CREATED', 'action preserved in event');
assert(event.stageLabel === 'Stage 1: Inflow', 'stageLabel preserved in event');
assert(event.newState?.status === 'Incoming Logged', 'newState snapshot preserved');
assert(typeof event.idempotencyKey === 'string' && event.idempotencyKey.length > 0, 'idempotencyKey generated');

// 2. Append-Only Global Recording
const event1 = createAuditEvent({
  documentId: 'doc-101',
  trackingNumber: 'TRK-2026-001',
  action: 'DOCUMENT_CREATED',
  actionTitle: 'Created',
  stageLabel: 'Stage 1',
  type: 'inflow',
  actor: { name: 'Maria Santos', role: 'Staff' },
  timestamp: '2026-03-01T08:00:00.000Z',
});

const event2 = createAuditEvent({
  documentId: 'doc-101',
  trackingNumber: 'TRK-2026-001',
  action: 'MOVEMENT_RECORDED',
  actionTitle: 'Forwarded',
  stageLabel: 'Stage 2',
  type: 'movement',
  actor: { name: 'Juan Cruz', role: 'Staff' },
  fromDesk: 'Records',
  toDesk: 'Accounting',
  timestamp: '2026-03-01T09:00:00.000Z',
});

const rec1 = recordGlobalAudit(event1);
const rec2 = recordGlobalAudit(event2);

assert(rec1 === true, 'First event recorded successfully');
assert(rec2 === true, 'Second event recorded successfully');

const logs = getGlobalAuditLogs({ documentId: 'doc-101' });
assert(logs.length === 2, 'Two events stored for document');
assert(logs[0].action === 'MOVEMENT_RECORDED', 'Query returns newest event first');
assert(logs[1].action === 'DOCUMENT_CREATED', 'Query preserves previous event intact');

// 3. Deduplication & Idempotency Check
const duplicateEvent: AuditEventRecord = {
  ...event1,
  id: 'aud-rapid-dup-1',
  timestamp: '2026-03-01T08:00:00.050Z',
};
const recDup = recordGlobalAudit(duplicateEvent);
assert(recDup === false, 'Duplicate audit event suppressed within deduplication window');
const logsAfterDup = getGlobalAuditLogs({ documentId: 'doc-101' });
assert(logsAfterDup.length === 2, 'Duplicate was not appended to audit repository');

// 4. Lifecycle Audit Compilation
const mockDoc: DocumentItem = {
  id: 'doc-202',
  trackingNumber: 'TRK-2026-099',
  title: 'Infrastructure Budget Proposal',
  documentType: 'Budget Request',
  communicationType: 'Official Endorsement',
  reportType: 'Detailed Report',
  originDepartment: 'Engineering Section',
  dateReceived: '2026-03-01',
  timeReceived: '08:30:00',
  targetDivision: 'Planning & Finance',
  responsiblePerson: 'Ana Reyes',
  priority: 'Urgent',
  currentStatus: 'Cleared for Out',
  currentLocation: 'Office of the Division Manager',
  currentCustodian: 'Atty. Victor Ramos',
  createdAt: '2026-03-01T08:30:00.000Z',
  updatedAt: '2026-03-02T16:00:00.000Z',
  movements: [
    {
      id: 'mov-1',
      timestamp: '2026-03-01T10:00:00.000Z',
      personnelName: 'Ana Reyes',
      personnelRole: 'Receiving Staff',
      currentDesk: 'Records Desk',
      forwardToDesk: 'Budget Evaluation Section',
      statusUpdate: 'forwarded',
      notes: 'Transmitted for review',
    },
  ],
  supervisorRemarks: [
    {
      id: 'rem-1',
      supervisorName: 'Engr. Roberto Dizon',
      timestamp: '2026-03-01T13:00:00.000Z',
      remarkText: 'Please verify project item codes and BAC certificate.',
      complianceRequired: true,
      complied: true,
      compliedAt: '2026-03-02T09:00:00.000Z',
      compliedBy: 'Carlos Mendoza',
      complianceNotes: 'BAC certificate attached and item codes verified.',
    },
  ],
  managerClearance: {
    isCleared: true,
    clearedBy: 'Atty. Victor Ramos',
    clearedAt: '2026-03-02T15:30:00.000Z',
    clearanceType: 'approved_for_dispatch',
    exitTrackingNumber: 'OUT-2026-044',
    forwardedToExternal: 'Department of Budget & Management',
    clearanceRemarks: 'All compliance items satisfied. Approved for external transmittal.',
  },
};

const compiledTrail = compileDocumentAuditTrail(mockDoc, 'asc');
assert(compiledTrail.length === 5, 'Compiled audit trail has exactly 5 unified lifecycle events');
assert(compiledTrail[0].action === 'DOCUMENT_CREATED', 'Event 1 is DOCUMENT_CREATED');
assert(compiledTrail[0].stageLabel === 'Stage 1: Inflow', 'Event 1 stage is Inflow');
assert(compiledTrail[1].action === 'MOVEMENT_RECORDED', 'Event 2 is MOVEMENT_RECORDED');
assert(compiledTrail[1].fromDesk === 'Records Desk', 'Event 2 fromDesk is Records Desk');
assert(compiledTrail[2].action === 'DIRECTIVE_ISSUED', 'Event 3 is DIRECTIVE_ISSUED');
assert(compiledTrail[2].actorName === 'Engr. Roberto Dizon', 'Event 3 actor is supervisor');
assert(compiledTrail[3].action === 'COMPLIANCE_FULFILLED', 'Event 4 is COMPLIANCE_FULFILLED');
assert(compiledTrail[3].actorName === 'Carlos Mendoza', 'Event 4 actor is compliance staff');
assert(compiledTrail[4].action === 'CLEARANCE_GRANTED', 'Event 5 is CLEARANCE_GRANTED');
assert(compiledTrail[4].exitTrackingNumber === 'OUT-2026-044', 'Event 5 records exitTrackingNumber');

// 5. Notification Engine & Independent Read State
const notif1 = createBusinessNotification({
  title: 'Document Received',
  message: 'New document TRK-1 registered',
  actor: 'Maria Santos',
  type: 'incoming',
  trackingNumber: 'TRK-1',
  documentId: 'doc-1',
});

const notif2 = createBusinessNotification({
  title: 'Document Moved',
  message: 'TRK-2 forwarded to Accounting',
  actor: 'Juan Cruz',
  type: 'movement',
  trackingNumber: 'TRK-2',
  documentId: 'doc-2',
});

assert(notif1.id.startsWith('notif-'), 'Notification has valid notif- ID');
assert(notif1.read === false, 'New notification defaults to unread (read: false)');
assert(!isNaN(new Date(notif1.timestamp).getTime()), 'Notification timestamp is valid ISO');

let notifList = [notif1, notif2];
assert(getUnreadNotificationCount(notifList) === 2, 'Unread count is initially 2');

// Mark notif1 as read
notifList = markNotificationAsRead(notifList, notif1.id);
assert(getUnreadNotificationCount(notifList) === 1, 'Unread count decreases to 1 after markNotificationAsRead');
assert(notifList.find((n) => n.id === notif1.id)?.read === true, 'notif1 read property is true');
assert(notifList.find((n) => n.id === notif2.id)?.read === false, 'notif2 remains unread');

// Mark all as read
notifList = markAllNotificationsAsRead(notifList);
assert(getUnreadNotificationCount(notifList) === 0, 'Unread count is 0 after markAllNotificationsAsRead');
assert(notifList.every((n) => n.read === true), 'All notifications have read: true');

// Delete notification
notifList = deleteNotification(notifList, notif1.id);
assert(notifList.length === 1, 'Notification successfully deleted');
assert(notifList[0].id === notif2.id, 'Remaining notification is notif2');

console.log(`\n🎉 Test Summary: ${passed} passed, ${failed} failed.\n`);

if (failed > 0) {
  process.exit(1);
}
