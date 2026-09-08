import { DocumentItem, AppUserRole } from '../types';

export interface SheetMetadata {
  spreadsheetId: string;
  spreadsheetUrl: string;
  sheetName?: string;
  title?: string;
  linkedAt?: string;
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
  'Portal Username',
  'Portal Password',
  'Account Status',
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

  // 2. Personnel Directory Headers (A1:L1)
  const personnelRange = `'${PERSONNEL_TAB_NAME}'!A1:L1`;
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

export function formatPersonnelRow(person: AppUserRole, documents: DocumentItem[] = []): string[] {
  const heldCount = documents.filter(
    (d) => d.currentCustodian === person.name || d.responsiblePerson === person.name
  ).length;

  const movementsCount = documents.reduce(
    (acc, d) =>
      acc + (d.movements || []).filter((m) => m.personnelName === person.name).length,
    0
  );

  const fallbackUsername = person.name.toLowerCase().replace(/[^a-z0-9]/g, '.');
  const fallbackPassword = person.role === 'System Admin' ? 'admin123' : 'password123';

  return [
    person.id,
    person.name,
    person.role,
    person.division,
    person.assignedDesk || 'General Office',
    person.email || `${person.username || fallbackUsername}@agency.gov`,
    person.username || fallbackUsername,
    person.password || fallbackPassword,
    person.status || 'active',
    String(heldCount),
    String(movementsCount),
    new Date().toLocaleString(),
  ];
}

export function parsePersonnelRow(row: string[], idx: number): AppUserRole | null {
  if (!row || row.length < 2 || !row[1] || !row[1].trim()) return null;
  const id = (row[0] && row[0].trim()) ? row[0].trim() : `staff-${Date.now()}-${idx}`;
  const name = row[1].trim();
  const role = (row[2] && row[2].trim()) ? row[2].trim() : 'Staff';
  const division = (row[3] && row[3].trim()) ? row[3].trim() : 'Central Records & Receiving Desk';
  const assignedDesk = (row[4] && row[4].trim()) ? row[4].trim() : `${division} Station`;

  let username = '';
  let password = '';
  let status: 'active' | 'suspended' = 'active';

  // Extended format (>= 9 columns with credentials)
  if (row.length >= 9 && row[6]) {
    username = row[6].trim();
    password = row[7] ? row[7].trim() : 'password123';
    status = (row[8] && row[8].trim() === 'suspended') ? 'suspended' : 'active';
  } else {
    username = name.toLowerCase().replace(/[^a-z0-9]/g, '.');
    password = role === 'System Admin' ? 'admin123' : 'password123';
    status = 'active';
  }

  const email = (row[5] && row[5].trim() && row[5] !== 'N/A') ? row[5].trim() : `${username}@agency.gov`;

  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('') || 'ST';

  return {
    id,
    name,
    role,
    division,
    assignedDesk,
    email,
    username,
    password,
    status,
    avatarInitials: initials,
  };
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
    const clearPersonnelRange = `'${PERSONNEL_TAB_NAME}'!A2:L500`;
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

    const updatePersonnelRange = `'${PERSONNEL_TAB_NAME}'!A2:L${personnelRows.length + 1}`;
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
 * Dedicated helper to sync ONLY the Personnel Directory to the sheet (e.g. after adding, editing, or deleting a staff member)
 */
export async function syncPersonnelOnlyToSheet(
  accessToken: string,
  spreadsheetId: string,
  personnelList: AppUserRole[],
  documents: DocumentItem[] = []
): Promise<number> {
  await ensureSheetExists(accessToken, spreadsheetId, PERSONNEL_TAB_NAME);

  // Headers (A1:L1)
  const personnelHeaderRange = `'${PERSONNEL_TAB_NAME}'!A1:L1`;
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${personnelHeaderRange}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        range: personnelHeaderRange,
        majorDimension: 'ROWS',
        values: [PERSONNEL_HEADERS],
      }),
    }
  );

  const rows = personnelList.map((p) => formatPersonnelRow(p, documents));
  const clearPersonnelRange = `'${PERSONNEL_TAB_NAME}'!A2:L500`;
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

  if (rows.length > 0) {
    const updateRange = `'${PERSONNEL_TAB_NAME}'!A2:L${rows.length + 1}`;
    const res = await fetch(
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
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || 'Failed to update Personnel Directory tab');
    }
  }

  return rows.length;
}

/**
 * Fetches all personnel rows directly from the connected Google Sheet
 */
export async function pullPersonnelFromSheet(
  accessToken: string,
  spreadsheetId: string,
  currentPersonnel?: AppUserRole[]
): Promise<AppUserRole[]> {
  const range = `'${PERSONNEL_TAB_NAME}'!A2:L`;
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Failed to fetch personnel from Google Sheet');
  }

  const data = await response.json();
  const rows: string[][] = data.values || [];
  const personnel: AppUserRole[] = [];

  rows.forEach((row, idx) => {
    const parsed = parsePersonnelRow(row, idx);
    if (parsed) personnel.push(parsed);
  });

  if (currentPersonnel && currentPersonnel.length > 0) {
    const map = new Map<string, AppUserRole>();
    currentPersonnel.forEach((p) => map.set(p.id, p));
    personnel.forEach((p) => map.set(p.id, p));
    return Array.from(map.values());
  }

  return personnel;
}

/**
 * Fetches all tracking records directly from the connected Google Sheet
 */
export async function pullDocumentsFromSheet(
  accessToken: string,
  spreadsheetId: string
): Promise<DocumentItem[]> {
  const range = `'${MASTER_TAB_NAME}'!A2:T`;
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Failed to fetch documents from Google Sheet');
  }

  const data = await response.json();
  const rows: string[][] = data.values || [];
  const docs: DocumentItem[] = [];

  rows.forEach((row, idx) => {
    if (!row || !row[0] || !row[0].trim()) return;
    const trackingNumber = row[0].trim();
    const title = row[1] ? row[1].trim() : 'Untitled Document';
    const fileLink = row[2] && row[2] !== 'None / Physical Document' ? row[2].trim() : undefined;
    
    const rawPriority = row[3] ? row[3].trim() : '';
    const priority: DocumentItem['priority'] =
      rawPriority === 'Rush' ? 'Rush' : rawPriority === 'Urgent' ? 'Urgent' : 'Routine';

    const rawType = row[4] ? row[4].trim() : '';
    const validTypes: DocumentItem['documentType'][] = [
      'Memorandum',
      'Endorsement',
      'Request / Voucher',
      'Official Letter',
      'Project Proposal',
      'Billing / Invoice',
      'Resolution / Order',
      'Others',
    ];
    const documentType: DocumentItem['documentType'] =
      validTypes.find((t) => t.toLowerCase() === rawType.toLowerCase()) || 'Others';

    const originDepartment = row[5] ? row[5].trim() : 'External Origin';
    const dateReceived = row[6] ? row[6].trim() : new Date().toISOString().slice(0, 10);
    const timeReceived = row[7] ? row[7].trim() : '08:00';
    const targetDivision = row[8] ? row[8].trim() : 'Central Records';
    const responsiblePerson = row[9] ? row[9].trim() : 'Unassigned';
    const currentStatus = (row[10] ? row[10].trim() : 'Incoming Logged') as any;
    const currentLocation = row[11] ? row[11].trim() : 'Receiving Station';
    const currentCustodian = row[12] ? row[12].trim() : responsiblePerson;

    // Clearance
    const clearanceStr = row[16] || '';
    const isCleared = clearanceStr.startsWith('CLEARED');
    const clearedBy = row[17] ? row[17].trim() : undefined;
    const clearedAt = row[18] ? new Date(row[18]).toISOString() : undefined;

    const docItem: DocumentItem = {
      id: `doc-${trackingNumber.replace(/[^a-zA-Z0-9]/g, '_')}-${idx}`,
      trackingNumber,
      title,
      fileLink,
      priority,
      documentType,
      originDepartment,
      dateReceived,
      timeReceived,
      targetDivision,
      responsiblePerson,
      currentStatus,
      currentLocation,
      currentCustodian,
      movements: [],
      supervisorRemarks: [],
      managerClearance: isCleared ? {
        isCleared: true,
        clearedBy,
        clearedAt,
        clearanceType: 'approved_for_dispatch',
        clearanceRemarks: 'Synchronized from Google Sheet',
      } : {
        isCleared: false,
      },
      createdAt: `${dateReceived}T${timeReceived}:00Z`,
      updatedAt: row[19] && !isNaN(Date.parse(row[19])) ? new Date(row[19]).toISOString() : new Date().toISOString(),
    };
    docs.push(docItem);
  });

  return docs;
}

/**
 * Bi-directionally pulls all records and personnel from Google Sheet, safely merging with existing records
 */
export async function pullAllFromSheet(
  accessToken: string,
  spreadsheetId: string,
  existingDocs: DocumentItem[] = [],
  existingStaff: AppUserRole[] = []
): Promise<{ documents: DocumentItem[]; personnel: AppUserRole[] }> {
  const [personnelFromSheet, docsFromSheet] = await Promise.all([
    pullPersonnelFromSheet(accessToken, spreadsheetId).catch(() => []),
    pullDocumentsFromSheet(accessToken, spreadsheetId).catch(() => []),
  ]);

  // Merge personnel: sheet entries take priority, while keeping any local that aren't on sheet yet
  const mergedStaffMap = new Map<string, AppUserRole>();
  existingStaff.forEach((s) => mergedStaffMap.set(s.id || s.name, s));
  personnelFromSheet.forEach((s) => mergedStaffMap.set(s.id || s.name, s));
  const finalStaff = Array.from(mergedStaffMap.values());

  // Merge documents: preserve rich movements & supervisorRemarks from local state if available
  const mergedDocsMap = new Map<string, DocumentItem>();
  existingDocs.forEach((d) => mergedDocsMap.set(d.trackingNumber, d));
  docsFromSheet.forEach((d) => {
    const existing = mergedDocsMap.get(d.trackingNumber);
    if (existing) {
      mergedDocsMap.set(d.trackingNumber, {
        ...existing,
        ...d,
        movements: existing.movements && existing.movements.length > 0 ? existing.movements : d.movements,
        supervisorRemarks: existing.supervisorRemarks && existing.supervisorRemarks.length > 0 ? existing.supervisorRemarks : d.supervisorRemarks,
      });
    } else {
      mergedDocsMap.set(d.trackingNumber, d);
    }
  });
  const finalDocs = Array.from(mergedDocsMap.values());

  return { documents: finalDocs, personnel: finalStaff };
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
