import { DocumentItem } from '../types';

export interface SheetMetadata {
  spreadsheetId: string;
  spreadsheetUrl: string;
  sheetName: string;
}

const DEFAULT_SHEET_TITLE = 'Office Document Tracking Registry';
const TAB_NAME = 'Master Tracking';

const HEADERS = [
  'Tracking Number',
  'Document Title',
  'Type',
  'Origin Department',
  'Date Received',
  'Time Received',
  'Target Division',
  'Responsible Person',
  'Current Status',
  'Current Desk / Location',
  'Current Custodian',
  'Movement History Summary',
  'Supervisor Remarks & Compliance',
  'Manager Clearance Status',
  'Cleared By',
  'Clearance Date & Time',
  'Last Updated'
];

/**
 * Creates a brand-new Google Sheet formatted for Office Document Tracking
 */
export async function createTrackingSheet(accessToken: string, customTitle?: string): Promise<SheetMetadata> {
  const title = customTitle || `${DEFAULT_SHEET_TITLE} (${new Date().toLocaleDateString()})`;

  const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title,
      },
      sheets: [
        {
          properties: {
            title: TAB_NAME,
            gridProperties: {
              frozenRowCount: 1,
            },
          },
        },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Failed to create Google Sheet');
  }

  const data = await response.json();
  const spreadsheetId = data.spreadsheetId;
  const spreadsheetUrl = data.spreadsheetUrl;

  // Populate Header Row with formatting
  await populateHeaders(accessToken, spreadsheetId);

  return {
    spreadsheetId,
    spreadsheetUrl,
    sheetName: TAB_NAME,
  };
}

/**
 * Formats and inserts header row
 */
async function populateHeaders(accessToken: string, spreadsheetId: string) {
  const range = `'${TAB_NAME}'!A1:Q1`;
  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      range,
      majorDimension: 'ROWS',
      values: [HEADERS],
    }),
  });
}

function formatDocumentRow(doc: DocumentItem): string[] {
  const movementsSummary = (doc.movements || [])
    .map(m => `[${m.timestamp.slice(11, 16)}] ${m.personnelName}: ${m.currentDesk} ➔ ${m.forwardToDesk} (${m.statusUpdate})${m.notes ? ` - ${m.notes}` : ''}`)
    .join(' | ');

  const remarksSummary = (doc.supervisorRemarks || [])
    .map(r => `[${r.supervisorName}]: "${r.remarkText}" (Compliance: ${r.complianceRequired ? (r.complied ? 'COMPLIED' : 'PENDING') : 'N/A'}${r.complianceNotes ? ` - Notes: ${r.complianceNotes}` : ''})`)
    .join(' | ');

  const clearanceStatus = doc.managerClearance?.isCleared 
    ? `CLEARED (${doc.managerClearance.clearanceType || 'Approved'})` 
    : 'Pending Clearance';

  return [
    doc.trackingNumber,
    doc.title,
    doc.documentType,
    doc.originDepartment,
    doc.dateReceived,
    doc.timeReceived,
    doc.targetDivision,
    doc.responsiblePerson,
    doc.currentStatus,
    doc.currentLocation,
    doc.currentCustodian,
    movementsSummary || 'No movements recorded yet',
    remarksSummary || 'No remarks recorded',
    clearanceStatus,
    doc.managerClearance?.clearedBy || '',
    doc.managerClearance?.clearedAt ? new Date(doc.managerClearance.clearedAt).toLocaleString() : '',
    new Date(doc.updatedAt).toLocaleString(),
  ];
}

/**
 * Synchronizes all document records into the single Google Sheet
 * Completely rewrites the rows below header so ordering and statuses stay 100% in sync
 */
export async function syncAllDocumentsToSheet(
  accessToken: string,
  spreadsheetId: string,
  documents: DocumentItem[]
): Promise<{ success: boolean; rowsUpdated: number }> {
  // 1. First ensure header is present
  await populateHeaders(accessToken, spreadsheetId);

  // 2. Prepare all document rows
  const rows = documents.map(formatDocumentRow);

  // 3. Clear existing values from A2 to Q1000
  const clearRange = `'${TAB_NAME}'!A2:Q1000`;
  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${clearRange}:clear`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (rows.length === 0) {
    return { success: true, rowsUpdated: 0 };
  }

  // 4. Write all rows starting from A2
  const updateRange = `'${TAB_NAME}'!A2:Q${rows.length + 1}`;
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${updateRange}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        range: updateRange,
        majorDimension: 'ROWS',
        values: rows,
      }),
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Failed to sync documents with Google Sheet');
  }

  return { success: true, rowsUpdated: rows.length };
}

/**
 * Appends a newly created incoming document to the Google Sheet
 */
export async function appendDocumentToSheet(
  accessToken: string,
  spreadsheetId: string,
  document: DocumentItem
): Promise<boolean> {
  const row = formatDocumentRow(document);
  const appendRange = `'${TAB_NAME}'!A:Q`;

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${appendRange}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        majorDimension: 'ROWS',
        values: [row],
      }),
    }
  );

  return response.ok;
}
