import { DocumentItem, AppUserRole } from '../types';

export interface SheetMetadata {
  spreadsheetId: string;
  spreadsheetUrl: string;
  sheetName: string;
}

const DEFAULT_SHEET_TITLE = 'POSSD Document Tracking & Personnel Registry';
export const MASTER_TAB_NAME = 'Master Tracking';
export const PERSONNEL_TAB_NAME = 'Personnel Directory';

export const DOCUMENT_HEADERS = [
  'Tracking Number',
  'Document Title',
  'Attached File Link',
  'Priority Level',
  'Document Type',
  'Origin Department',
  'Date Received',
  'Time Received',
  'Target Division',
  'Responsible Officer',
  'Current Status',
  'Current Desk / Location',
  'Current Custodian',
  'Personnel Involved (All Handlers)',
  'Movement History Summary',
  'Supervisor Remarks & Compliance',
  'Manager Clearance Status',
  'Cleared By',
  'Clearance Date & Time',
  'Last Updated'
];

export const PERSONNEL_HEADERS = [
  'Staff ID',
  'Full Name',
  'Assigned Role / Designation',
  'Division / Department',
  'Assigned Desk / Station',
  'Email Address',
  'Active Documents Assigned / Held',
  'Total Desk Movements Recorded',
  'Last Registry Synchronization'
];

/**
 * Creates a brand-new Google Sheet formatted for Office Document Tracking & Personnel
 */
export async function createTrackingSheet(
  accessToken: string,
  customTitle?: string
): Promise<SheetMetadata> {
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
            title: MASTER_TAB_NAME,
            gridProperties: {
              frozenRowCount: 1,
            },
          },
        },
        {
          properties: {
            title: PERSONNEL_TAB_NAME,
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

  // Populate Header Rows with formatting
  await populateHeaders(accessToken, spreadsheetId);

  return {
    spreadsheetId,
    spreadsheetUrl,
    sheetName: MASTER_TAB_NAME,
  };
}

/**
 * Ensures a sheet tab exists, creating it if needed via batchUpdate
 */
async function ensureSheetExists(accessToken: string, spreadsheetId: string, sheetTitle: string) {
  try {
    const getRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    if (!getRes.ok) return;
    const meta = await getRes.json();
    const existingTitles = (meta.sheets || []).map((s: any) => s.properties?.title);
    if (!existingTitles.includes(sheetTitle)) {
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [
            {
              addSheet: {
                properties: {
                  title: sheetTitle,
                  gridProperties: { frozenRowCount: 1 },
                },
              },
            },
          ],
        }),
      });
    }
  } catch (e) {
    // Ignore error, continue
    console.warn('Could not verify/create tab:', sheetTitle, e);
  }
}

/**
 * Formats and inserts header row for both Master Tracking and Personnel Directory
 */
export async function populateHeaders(accessToken: string, spreadsheetId: string) {
  // Ensure both tabs exist
  await ensureSheetExists(accessToken, spreadsheetId, MASTER_TAB_NAME);
  await ensureSheetExists(accessToken, spreadsheetId, PERSONNEL_TAB_NAME);

  // 1. Master Tracking Headers (A1:T1)
  const docRange = `'${MASTER_TAB_NAME}'!A1:T1`;
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${docRange}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        range: docRange,
        majorDimension: 'ROWS',
        values: [DOCUMENT_HEADERS],
      }),
    }
  );

  // 2. Personnel Directory Headers (A1:I1)
  const personnelRange = `'${PERSONNEL_TAB_NAME}'!A1:I1`;
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${personnelRange}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        range: personnelRange,
        majorDimension: 'ROWS',
        values: [PERSONNEL_HEADERS],
      }),
    }
  );
}

export function formatDocumentRow(doc: DocumentItem): string[] {
  const movementsSummary = (doc.movements || [])
    .map(
      (m) =>
        `[${m.timestamp.slice(11, 16)}] ${m.personnelName} (${m.personnelRole || 'Staff'}): ${m.currentDesk} ➔ ${m.forwardToDesk} (${m.statusUpdate})${
          m.notes ? ` - ${m.notes}` : ''
        }`
    )
    .join(' | ');

  const remarksSummary = (doc.supervisorRemarks || [])
    .map(
      (r) =>
        `[${r.supervisorName}]: "${r.remarkText}" (Compliance: ${
          r.complianceRequired ? (r.complied ? `COMPLIED by ${r.compliedBy || 'Staff'}` : 'PENDING') : 'N/A'
        }${r.complianceNotes ? ` - Notes: ${r.complianceNotes}` : ''})`
    )
    .join(' | ');

  const clearanceStatus = doc.managerClearance?.isCleared
    ? `CLEARED (${doc.managerClearance.clearanceType || 'Approved'})`
    : 'Pending Clearance';

  // Gather all unique personnel involved
  const personnelSet = new Set<string>();
  if (doc.responsiblePerson) personnelSet.add(doc.responsiblePerson);
  if (doc.currentCustodian) personnelSet.add(doc.currentCustodian);
  (doc.movements || []).forEach((m) => {
    if (m.personnelName) personnelSet.add(m.personnelName);
  });
  (doc.supervisorRemarks || []).forEach((r) => {
    if (r.supervisorName) personnelSet.add(r.supervisorName);
    if (r.compliedBy) personnelSet.add(r.compliedBy);
  });
  if (doc.managerClearance?.clearedBy) personnelSet.add(doc.managerClearance.clearedBy);

  return [
    doc.trackingNumber,
    doc.title,
    doc.fileLink || 'None / Physical Document',
    doc.priority,
    doc.documentType,
    doc.originDepartment,
    doc.dateReceived,
    doc.timeReceived,
    doc.targetDivision,
    doc.responsiblePerson,
    doc.currentStatus,
    doc.currentLocation,
    doc.currentCustodian,
    Array.from(personnelSet).join(', ') || 'N/A',
    movementsSummary || 'No movements recorded yet',
    remarksSummary || 'No remarks recorded',
    clearanceStatus,
    doc.managerClearance?.clearedBy || '',
    doc.managerClearance?.clearedAt ? new Date(doc.managerClearance.clearedAt).toLocaleString() : '',
    new Date(doc.updatedAt).toLocaleString(),
  ];
}

export function formatPersonnelRow(person: AppUserRole, documents: DocumentItem[]): string[] {
  const heldCount = documents.filter(
    (d) => d.currentCustodian === person.name || d.responsiblePerson === person.name
  ).length;

  const movementsCount = documents.reduce(
    (acc, d) =>
      acc + (d.movements || []).filter((m) => m.personnelName === person.name).length,
    0
  );

  return [
    person.id,
    person.name,
    person.role,
    person.division,
    person.assignedDesk || 'General Office',
    person.email || 'N/A',
    String(heldCount),
    String(movementsCount),
    new Date().toLocaleString(),
  ];
}

/**
 * Synchronizes all document records AND personnel roster into the linked Google Sheet
 */
export async function syncAllDocumentsToSheet(
  accessToken: string,
  spreadsheetId: string,
  documents: DocumentItem[],
  personnelList?: AppUserRole[]
): Promise<{ success: boolean; rowsUpdated: number; personnelUpdated: number }> {
  // 1. First ensure headers are present on both tabs
  await populateHeaders(accessToken, spreadsheetId);

  // 2. Prepare all document rows (A2:T...)
  const docRows = documents.map(formatDocumentRow);

  // Clear existing values from Master Tracking
  const clearDocRange = `'${MASTER_TAB_NAME}'!A2:T1000`;
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${clearDocRange}:clear`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (docRows.length > 0) {
    const updateDocRange = `'${MASTER_TAB_NAME}'!A2:T${docRows.length + 1}`;
    const docRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${updateDocRange}?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          range: updateDocRange,
          majorDimension: 'ROWS',
          values: docRows,
        }),
      }
    );
    if (!docRes.ok) {
      const err = await docRes.json().catch(() => ({}));
      throw new Error(err.error?.message || 'Failed to sync documents with Google Sheet');
    }
  }

  // 3. Prepare and sync Personnel Directory tab if personnel list provided
  let personnelUpdated = 0;
  if (personnelList && personnelList.length > 0) {
    const personnelRows = personnelList.map((p) => formatPersonnelRow(p, documents));
    const clearPersonnelRange = `'${PERSONNEL_TAB_NAME}'!A2:I500`;
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${clearPersonnelRange}:clear`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const updatePersonnelRange = `'${PERSONNEL_TAB_NAME}'!A2:I${personnelRows.length + 1}`;
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${updatePersonnelRange}?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          range: updatePersonnelRange,
          majorDimension: 'ROWS',
          values: personnelRows,
        }),
      }
    );
    personnelUpdated = personnelRows.length;
  }

  return { success: true, rowsUpdated: docRows.length, personnelUpdated };
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
  const appendRange = `'${MASTER_TAB_NAME}'!A:T`;

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
