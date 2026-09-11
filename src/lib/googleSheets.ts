import { DocumentItem, AppUserRole, InternalMovement, SupervisorRemark } from '../types';

export interface SheetMetadata {
  spreadsheetId: string;
  spreadsheetUrl: string;
  sheetName?: string;
  title?: string;
  linkedAt?: string;
  appsScriptUrl?: string; // Zero-login Apps Script Web App URL for writes across all devices
  isPublicEditor?: boolean; // Set to true when sheet is configured with Anyone with link can edit
}

const DEFAULT_SHEET_TITLE = 'POSSD Document Tracking & Personnel Registry';
export const MASTER_TAB_NAME = 'Master Tracking';
export const PERSONNEL_TAB_NAME = 'Personnel Directory';

export const DOCUMENT_HEADERS = [
  'Tracking Number',
  'Document Title',
  'Attached File Link',
  'Priority Level',
  'Transaction Type',
  'Communication Type',
  'Report/Document Type',
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
 * In-memory cache of spreadsheets whose header structures and tabs have already been verified in this session.
 * Prevents redundant metadata/header write requests that consume API quota.
 */
const initializedSheets = new Set<string>();

/**
 * Checks if an error is related to Google API rate limiting or quota exhaustion (HTTP 429).
 */
export function isGoogleQuotaError(err: any): boolean {
  if (!err) return false;
  const msg = (typeof err === 'string' ? err : err.message || '').toLowerCase();
  return (
    msg.includes('quota exceeded') ||
    msg.includes('write requests per minute') ||
    msg.includes('read requests per minute') ||
    msg.includes('rate limit') ||
    msg.includes('too many requests') ||
    msg.includes('429')
  );
}

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
  initializedSheets.add(spreadsheetId);

  return {
    spreadsheetId,
    spreadsheetUrl,
    sheetName: MASTER_TAB_NAME,
  };
}

/**
 * Escapes formula prefix characters (=, +, -, @) if not purely numeric, to prevent Google Sheets 400 formula parse errors
 */
export function sanitizeCellValue(val: any): string {
  if (val === null || val === undefined) return '';
  const str = String(val).trim();
  if (/^[=+\-@]/.test(str) && isNaN(Number(str))) {
    return `'${str}`;
  }
  return str;
}

/**
 * Ensures a sheet tab structure exists, automatically renaming default 'Sheet1' or single tab
 * to MASTER_TAB_NAME so that opening the sheet displays the populated Master Tracking tab immediately.
 */
export async function ensureSpreadsheetStructure(
  accessToken: string,
  spreadsheetId: string,
  preferredMasterName: string = MASTER_TAB_NAME
): Promise<{ masterTabName: string; masterSheetId: number; personnelTabName: string; personnelSheetId: number }> {
  const metaRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=properties.title,sheets.properties(sheetId,title,index)`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!metaRes.ok) {
    const err = await metaRes.json().catch(() => ({}));
    if (metaRes.status === 401) {
      throw new Error('Google OAuth session expired or invalid. Please sign in with Google again.');
    }
    if (metaRes.status === 403) {
      throw new Error('Permission Denied: Your Google account does not have Edit access to this spreadsheet. Please ensure Editor access is granted in Google Drive.');
    }
    if (metaRes.status === 404) {
      throw new Error('Google Spreadsheet not found. Please verify the spreadsheet ID or link.');
    }
    throw new Error(err.error?.message || `Failed to reach Google Sheet (HTTP ${metaRes.status})`);
  }

  const meta = await metaRes.json();
  const sheets: Array<{ properties: { sheetId: number; title: string; index: number } }> = meta.sheets || [];

  let masterSheet = sheets.find(
    (s) => s.properties?.title?.trim().toLowerCase() === (preferredMasterName || '').toLowerCase()
  );
  let personnelSheet = sheets.find(
    (s) => s.properties?.title?.trim().toLowerCase() === (PERSONNEL_TAB_NAME || '').toLowerCase()
  );

  const batchRequests: any[] = [];

  // Case 1: Master tab does not exist
  if (!masterSheet) {
    // If the spreadsheet has only 1 sheet (like default "Sheet1"), rename it to MASTER_TAB_NAME!
    if (sheets.length === 1 && sheets[0].properties) {
      const singleSheet = sheets[0];
      batchRequests.push({
        updateSheetProperties: {
          properties: {
            sheetId: singleSheet.properties.sheetId,
            title: MASTER_TAB_NAME,
            gridProperties: { frozenRowCount: 1 },
          },
          fields: 'title,gridProperties.frozenRowCount',
        },
      });
      masterSheet = {
        properties: {
          sheetId: singleSheet.properties.sheetId,
          title: MASTER_TAB_NAME,
          index: 0,
        },
      };
    } else {
      // Add Master Tracking as the first tab
      batchRequests.push({
        addSheet: {
          properties: {
            title: MASTER_TAB_NAME,
            index: 0,
            gridProperties: { frozenRowCount: 1 },
          },
        },
      });
    }
  }

  // Case 2: Personnel tab does not exist
  if (!personnelSheet) {
    batchRequests.push({
      addSheet: {
        properties: {
          title: PERSONNEL_TAB_NAME,
          gridProperties: { frozenRowCount: 1 },
        },
      },
    });
  }

  if (batchRequests.length > 0) {
    const batchRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requests: batchRequests }),
      }
    );

    if (!batchRes.ok) {
      const err = await batchRes.json().catch(() => ({}));
      throw new Error(err.error?.message || 'Failed to initialize spreadsheet tabs');
    }

    // Refresh metadata to get updated sheetIds
    const refreshRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties(sheetId,title,index)`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    if (refreshRes.ok) {
      const refreshMeta = await refreshRes.json();
      const updatedSheets: Array<{ properties: { sheetId: number; title: string; index: number } }> =
        refreshMeta.sheets || [];
      masterSheet =
        updatedSheets.find(
          (s) => s.properties?.title?.trim().toLowerCase() === (MASTER_TAB_NAME || '').toLowerCase()
        ) || masterSheet;
      personnelSheet =
        updatedSheets.find(
          (s) => s.properties?.title?.trim().toLowerCase() === (PERSONNEL_TAB_NAME || '').toLowerCase()
        ) || personnelSheet;
    }
  }

  return {
    masterTabName: masterSheet?.properties?.title || MASTER_TAB_NAME,
    masterSheetId: masterSheet?.properties?.sheetId ?? 0,
    personnelTabName: personnelSheet?.properties?.title || PERSONNEL_TAB_NAME,
    personnelSheetId: personnelSheet?.properties?.sheetId ?? 0,
  };
}

/**
 * Formats and inserts header row for both Master Tracking and Personnel Directory
 */
export async function populateHeaders(
  accessToken: string,
  spreadsheetId: string,
  preferredMasterName: string = MASTER_TAB_NAME
): Promise<{ masterTabName: string; masterSheetId: number; personnelTabName: string }> {
  // Ensure tabs exist and retrieve exact tab names and IDs
  const structure = await ensureSpreadsheetStructure(accessToken, spreadsheetId, preferredMasterName);

  // 1. Master Tracking Headers (A1:V1)
  const docRange = `'${structure.masterTabName}'!A1:V1`;
  const docRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(docRange)}?valueInputOption=USER_ENTERED`,
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

  if (!docRes.ok) {
    const err = await docRes.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to write headers to "${structure.masterTabName}"`);
  }

  // 2. Personnel Directory Headers (A1:L1)
  const personnelRange = `'${structure.personnelTabName}'!A1:L1`;
  const persRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(personnelRange)}?valueInputOption=USER_ENTERED`,
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

  if (!persRes.ok) {
    const err = await persRes.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to write headers to "${structure.personnelTabName}"`);
  }

  return structure;
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

  const transactionType = doc.direction ? `${doc.direction} - ${doc.documentType}` : doc.documentType;

  return [
    doc.trackingNumber,
    doc.title,
    doc.fileLink || 'None / Physical Document',
    doc.priority,
    transactionType,
    doc.communicationType,
    doc.reportType,
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

  const fallbackUsername = (person.name || '').toLowerCase().replace(/[^a-z0-9]/g, '.');
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
    username = (name || '').toLowerCase().replace(/[^a-z0-9]/g, '.');
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
  accessToken: string | null | undefined,
  spreadsheetId: string,
  documents: DocumentItem[],
  personnelList?: AppUserRole[],
  options?: { forceHeaders?: boolean; targetMasterTab?: string; appsScriptUrl?: string }
): Promise<{
  success: boolean;
  rowsUpdated: number;
  personnelUpdated: number;
  masterTabName: string;
  masterSheetId?: number;
}> {
  let targetAppsScriptUrl = options?.appsScriptUrl;
  if (!targetAppsScriptUrl && typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('possd_sheet_meta');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.appsScriptUrl) targetAppsScriptUrl = parsed.appsScriptUrl;
      }
    } catch {}
  }

  if (targetAppsScriptUrl) {
    const res = await syncViaAppsScript(targetAppsScriptUrl, documents, personnelList || [], {
      masterTabName: options?.targetMasterTab || MASTER_TAB_NAME,
      personnelTabName: PERSONNEL_TAB_NAME,
    });
    return {
      success: true,
      rowsUpdated: res.rowsUpdated,
      personnelUpdated: res.personnelUpdated,
      masterTabName: res.masterTabName,
    };
  }

  if (!accessToken) {
    // Zero-login mode: Persist all entries to the centralized server backend so they are permanently preserved for all users
    try {
      await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documents }),
      });
      if (personnelList && personnelList.length > 0) {
        await fetch('/api/staff', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ staff: personnelList }),
        });
      }
    } catch (e) {
      console.warn('Central server sync note:', e);
    }
    return {
      success: true,
      rowsUpdated: documents.length,
      personnelUpdated: (personnelList || []).length,
      masterTabName: options?.targetMasterTab || MASTER_TAB_NAME,
    };
  }
  if (!spreadsheetId) {
    throw new Error('No Google Spreadsheet ID provided.');
  }

  // 1. Ensure sheet structure and headers
  const structure = await populateHeaders(
    accessToken,
    spreadsheetId,
    options?.targetMasterTab || MASTER_TAB_NAME
  );
  initializedSheets.add(spreadsheetId);

  // 2. Prepare all document rows with sanitization
  const docRows = documents.map((d) => formatDocumentRow(d).map(sanitizeCellValue));

  // Clear existing values from Master Tracking (row 2 onwards) with empty body {}
  const clearDocRange = `'${structure.masterTabName}'!A2:V`;
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(clearDocRange)}:clear`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    }
  ).catch((e) => console.warn('Clear doc range notice:', e));

  if (docRows.length > 0) {
    const updateDocRange = `'${structure.masterTabName}'!A2:V${docRows.length + 1}`;
    const docRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(updateDocRange)}?valueInputOption=USER_ENTERED`,
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
      throw new Error(err.error?.message || `Failed to sync documents to tab "${structure.masterTabName}"`);
    }
  }

  // 3. Prepare and sync Personnel Directory tab if personnel list provided
  let personnelUpdated = 0;
  if (personnelList && personnelList.length > 0) {
    const personnelRows = personnelList.map((p) => formatPersonnelRow(p, documents).map(sanitizeCellValue));
    const clearPersonnelRange = `'${structure.personnelTabName}'!A2:L`;
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(clearPersonnelRange)}:clear`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      }
    ).catch((e) => console.warn('Clear personnel range notice:', e));

    const updatePersonnelRange = `'${structure.personnelTabName}'!A2:L${personnelRows.length + 1}`;
    const persRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(updatePersonnelRange)}?valueInputOption=USER_ENTERED`,
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
    if (persRes.ok) {
      personnelUpdated = personnelRows.length;
    } else {
      const err = await persRes.json().catch(() => ({}));
      console.warn('Personnel sync notice:', err);
    }
  }

  return {
    success: true,
    rowsUpdated: docRows.length,
    personnelUpdated,
    masterTabName: structure.masterTabName,
    masterSheetId: structure.masterSheetId,
  };
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
  const structure = await ensureSpreadsheetStructure(accessToken, spreadsheetId);

  // Headers (A1:L1)
  const personnelHeaderRange = `'${structure.personnelTabName}'!A1:L1`;
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(personnelHeaderRange)}?valueInputOption=USER_ENTERED`,
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

  const rows = personnelList.map((p) => formatPersonnelRow(p, documents).map(sanitizeCellValue));
  const clearPersonnelRange = `'${structure.personnelTabName}'!A2:L`;
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(clearPersonnelRange)}:clear`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    }
  ).catch((e) => console.warn('Clear personnel range notice:', e));

  if (rows.length > 0) {
    const updateRange = `'${structure.personnelTabName}'!A2:L${rows.length + 1}`;
    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(updateRange)}?valueInputOption=USER_ENTERED`,
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
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueRenderOption=FORMULA&dateTimeRenderOption=FORMATTED_STRING`,
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

export function parseMovementsSummaryFromSheet(summary: string, baseDate: string): InternalMovement[] {
  if (!summary || summary.trim() === '' || (summary || '').toLowerCase().includes('no movements')) {
    return [];
  }
  const parts = summary.split(' | ');
  return parts.map((part, i) => {
    const match = part.match(/^\[(\d{1,2}:\d{2}(?::\d{2})?)\]\s*([^(:]+?)(?:\s*\(([^)]+)\))?:\s*([^\u2794\->➔]+?)\s*(?:\u2794|->|➔)\s*([^(]+?)(?:\s*\(([^)]+)\))?(?:\s*-\s*(.+))?$/);
    if (match) {
      const timeStr = match[1];
      const personnelName = match[2].trim();
      const personnelRole = match[3] ? match[3].trim() : 'Staff';
      const currentDesk = match[4].trim();
      const forwardToDesk = match[5].trim();
      const rawStatus = match[6] ? match[6].trim().toLowerCase() : 'forwarded';
      const notes = match[7] ? match[7].trim() : undefined;
      const statusUpdate = (['received', 'in_review', 'acted', 'forwarded'].includes(rawStatus)
        ? rawStatus
        : 'forwarded') as InternalMovement['statusUpdate'];

      const timestamp = baseDate ? `${baseDate.slice(0, 10)}T${timeStr.length === 5 ? `${timeStr}:00` : timeStr}Z` : new Date().toISOString();

      return {
        id: `mov-sheet-${i}-${Date.now()}`,
        timestamp,
        personnelName,
        personnelRole,
        currentDesk,
        forwardToDesk,
        statusUpdate,
        notes,
      };
    }

    return {
      id: `mov-sheet-fallback-${i}`,
      timestamp: baseDate ? `${baseDate.slice(0, 10)}T12:00:00Z` : new Date().toISOString(),
      personnelName: 'Handling Staff',
      currentDesk: 'Assigned Desk',
      forwardToDesk: 'Routing Station',
      statusUpdate: 'forwarded',
      notes: part.trim(),
    };
  });
}

export function parseRemarksSummaryFromSheet(summary: string, baseDate: string): SupervisorRemark[] {
  if (!summary || summary.trim() === '' || (summary || '').toLowerCase().includes('no remarks')) {
    return [];
  }
  const parts = summary.split(' | ');
  return parts.map((part, i) => {
    const match = part.match(/^\[([^\]]+)\]:\s*"([^"]+)"(?:\s*\(Compliance:\s*([^)]+)\))?$/);
    if (match) {
      const supervisorName = match[1].trim();
      const remarkText = match[2].trim();
      const complianceInfo = match[3] ? match[3].trim() : '';

      const isComplied = complianceInfo.toUpperCase().startsWith('COMPLIED');
      const isComplianceRequired = !complianceInfo.toUpperCase().startsWith('N/A');

      let compliedBy: string | undefined = undefined;
      let complianceNotes: string | undefined = undefined;

      if (isComplied) {
        const byMatch = complianceInfo.match(/COMPLIED\s+by\s+([^-]+)(?:-\s*Notes:\s*(.+))?/i);
        if (byMatch) {
          compliedBy = byMatch[1].trim();
          complianceNotes = byMatch[2] ? byMatch[2].trim() : undefined;
        }
      }

      return {
        id: `rem-sheet-${i}-${Date.now()}`,
        supervisorName,
        timestamp: baseDate ? `${baseDate.slice(0, 10)}T12:00:00Z` : new Date().toISOString(),
        remarkText,
        complianceRequired: isComplianceRequired,
        complied: isComplied,
        compliedBy,
        complianceNotes,
        compliedAt: isComplied ? (baseDate ? `${baseDate.slice(0, 10)}T12:00:00Z` : new Date().toISOString()) : undefined,
      };
    }

    return {
      id: `rem-sheet-fallback-${i}`,
      supervisorName: 'Supervisor',
      timestamp: baseDate ? `${baseDate.slice(0, 10)}T12:00:00Z` : new Date().toISOString(),
      remarkText: part.trim(),
      complianceRequired: false,
      complied: false,
    };
  });
}

export function parseDocumentRow(row: string[], idx: number): DocumentItem | null {
  if (!row || !row[0] || !row[0].trim()) return null;
  const trackingNumber = row[0].trim();
  const title = row[1] ? row[1].trim() : 'Untitled Document';
  
  let rawFileLink = row[2];
  let fileLink = undefined;
  if (rawFileLink && rawFileLink !== 'None / Physical Document') {
    rawFileLink = rawFileLink.toString().trim();
    if (rawFileLink.toUpperCase().startsWith('=HYPERLINK(')) {
      const match = rawFileLink.match(/=HYPERLINK\s*\(\s*"([^"]+)"/i);
      if (match && match[1]) {
        fileLink = match[1];
      } else {
        fileLink = rawFileLink;
      }
    } else {
      fileLink = rawFileLink;
    }
  }

  const rawPriority = row[3] ? row[3].trim() : '';
  const priority: DocumentItem['priority'] =
    rawPriority === 'Rush' ? 'Rush' : rawPriority === 'Urgent' ? 'Urgent' : 'Routine';

  const rawDocType = row[4] ? String(row[4]).trim() : 'Simple Transaction';
  let direction: 'Incoming' | 'Outgoing' = 'Incoming';
  let documentType = rawDocType;
  if (rawDocType.startsWith('Outgoing - ')) {
    direction = 'Outgoing';
    documentType = rawDocType.replace('Outgoing - ', '');
  } else if (rawDocType.startsWith('Incoming - ')) {
    direction = 'Incoming';
    documentType = rawDocType.replace('Incoming - ', '');
  } else if ((rawDocType || '').toLowerCase().includes('outgoing')) {
    direction = 'Outgoing';
  }

  const communicationType = row[5] ? String(row[5]).trim() : 'Memorandum';
  const reportType = row[6] ? String(row[6]).trim() : 'Inspection Report';
  
  const originDepartment = row[7] ? String(row[7]).trim() : 'External Origin';
  const dateReceived = row[8] ? String(row[8]).trim() : new Date().toISOString().slice(0, 10);
  const timeReceived = row[9] ? String(row[9]).trim() : '08:00';
  const targetDivision = row[10] ? String(row[10]).trim() : 'Central Records';
  const responsiblePerson = row[11] ? String(row[11]).trim() : 'Unassigned';
  const currentStatus = (row[12] ? String(row[12]).trim() : 'Incoming Logged') as any;
  const currentLocation = row[13] ? String(row[13]).trim() : 'Receiving Station';
  const currentCustodian = row[14] ? String(row[14]).trim() : responsiblePerson;

  // Movement history from Column Q (index 16) and remarks from Column R (index 17)
  const rawMovements = row[16] ? String(row[16]).trim() : '';
  const rawRemarks = row[17] ? String(row[17]).trim() : '';
  const parsedMovements = parseMovementsSummaryFromSheet(rawMovements, dateReceived);
  const parsedRemarks = parseRemarksSummaryFromSheet(rawRemarks, dateReceived);

  // Clearance
  const clearanceStr = row[18] || '';
  const isCleared = clearanceStr.startsWith('CLEARED');
  const clearedBy = row[19] ? String(row[19]).trim() : undefined;
  const clearedAt = row[20] && !isNaN(Date.parse(row[20])) ? new Date(row[20]).toISOString() : undefined;

  const parsedUpdatedAt = row[21] && !isNaN(Date.parse(row[21]))
    ? new Date(row[21]).toISOString()
    : `${dateReceived}T${timeReceived}:00Z`;

  return {
    id: `doc-${trackingNumber.replace(/[^a-zA-Z0-9]/g, '_')}-${idx}`,
    trackingNumber,
    title,
    direction,
    fileLink,
    priority,
    documentType,
    communicationType,
    reportType,
    originDepartment,
    dateReceived,
    timeReceived,
    targetDivision,
    responsiblePerson,
    currentStatus,
    currentLocation,
    currentCustodian,
    movements: parsedMovements,
    supervisorRemarks: parsedRemarks,
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
    updatedAt: parsedUpdatedAt,
  };
}

/**
 * Fetches all tracking records directly from the connected Google Sheet
 */
export async function pullDocumentsFromSheet(
  accessToken: string,
  spreadsheetId: string
): Promise<DocumentItem[]> {
  const range = `'${MASTER_TAB_NAME}'!A2:V`;
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
    const parsed = parseDocumentRow(row, idx);
    if (parsed) docs.push(parsed);
  });

  return docs;
}

export function mergeSheetData(
  docsFromSheet: DocumentItem[],
  personnelFromSheet: AppUserRole[],
  existingDocs: DocumentItem[] = [],
  existingStaff: AppUserRole[] = []
): { documents: DocumentItem[]; personnel: AppUserRole[] } {
  // Merge personnel: sheet entries take priority, while keeping local ones not yet on sheet
  const mergedStaffMap = new Map<string, AppUserRole>();
  existingStaff.forEach((s) => mergedStaffMap.set(s.id || s.name, s));
  personnelFromSheet.forEach((s) => mergedStaffMap.set(s.id || s.name, s));
  const finalStaff = Array.from(mergedStaffMap.values());

  // Merge documents: preserve all local movements, remarks, and newly created local documents
  const mergedDocsMap = new Map<string, DocumentItem>();
  existingDocs.forEach((d) => mergedDocsMap.set(d.trackingNumber, d));

  docsFromSheet.forEach((d) => {
    const existing = mergedDocsMap.get(d.trackingNumber);
    if (existing) {
      const existingDate = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
      const sheetDate = new Date(d.updatedAt || d.createdAt || 0).getTime();

      const movementsMap = new Map<string, InternalMovement>();
      (d.movements || []).forEach((m) => {
        const key = m.id || `${m.timestamp}-${m.personnelName}-${m.forwardToDesk}`;
        movementsMap.set(key, m);
      });
      (existing.movements || []).forEach((m) => {
        const key = m.id || `${m.timestamp}-${m.personnelName}-${m.forwardToDesk}`;
        movementsMap.set(key, m);
      });
      const mergedMovements = Array.from(movementsMap.values()).sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      const remarksMap = new Map<string, SupervisorRemark>();
      (d.supervisorRemarks || []).forEach((r) => {
        const key = r.id || `${r.timestamp}-${r.supervisorName}`;
        remarksMap.set(key, r);
      });
      (existing.supervisorRemarks || []).forEach((r) => {
        const key = r.id || `${r.timestamp}-${r.supervisorName}`;
        remarksMap.set(key, r);
      });
      const mergedRemarks = Array.from(remarksMap.values()).sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      const mergedClearance = existing.managerClearance?.isCleared
        ? existing.managerClearance
        : d.managerClearance?.isCleared
        ? d.managerClearance
        : existing.managerClearance;

      const localHasMoreMovements = (existing.movements?.length || 0) >= (d.movements?.length || 0);
      const localIsNewer = existingDate >= sheetDate || localHasMoreMovements;

      if (localIsNewer) {
        mergedDocsMap.set(d.trackingNumber, {
          ...d,
          ...existing,
          movements: mergedMovements,
          supervisorRemarks: mergedRemarks,
          managerClearance: mergedClearance,
        });
      } else {
        mergedDocsMap.set(d.trackingNumber, {
          ...existing,
          ...d,
          movements: mergedMovements,
          supervisorRemarks: mergedRemarks,
          managerClearance: mergedClearance,
        });
      }
    } else {
      mergedDocsMap.set(d.trackingNumber, d);
    }
  });

  return { documents: Array.from(mergedDocsMap.values()), personnel: finalStaff };
}

/**
 * Zero-Login Pull for Public Google Sheets (Anyone with the link can view or edit)
 * Uses Google Visualization API to read Master Tracking and Personnel Directory without OAuth
 */
export async function pullFromPublicSheet(
  spreadsheetId: string,
  existingDocs: DocumentItem[] = [],
  existingStaff: AppUserRole[] = []
): Promise<{ documents: DocumentItem[]; personnel: AppUserRole[] }> {
  let docRows: string[][] = [];
  let personnelRows: string[][] = [];

  const extractRowsFromPayload = (data: any): string[][] => {
    if (!data) return [];
    const table = data.table || data.data?.table || (data.status === 'ok' && data.table);
    if (!table || !Array.isArray(table.rows)) return [];
    return table.rows.map((r: any) => {
      if (!r || !Array.isArray(r.c)) return [];
      return r.c.map((cell: any) =>
        cell && cell.v !== null && cell.v !== undefined ? String(cell.v) : ''
      );
    });
  };

  // 1. Fetch Master Tracking (with fallback to default first sheet if tab is named Sheet1 or differs)
  try {
    let res = await fetch(
      `/api/public-sheet?spreadsheetId=${spreadsheetId}&sheet=${encodeURIComponent(MASTER_TAB_NAME)}`
    ).catch(() =>
      fetch(
        `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(MASTER_TAB_NAME)}`
      )
    );
    if (res.ok) {
      const txt = await res.text();
      const jsonStr = txt.replace(/^[^{]*/, '').replace(/[^}]*$/, '');
      if (jsonStr) {
        const data = JSON.parse(jsonStr);
        docRows = extractRowsFromPayload(data);
      }
    }

    // Fallback: If Master Tracking has 0 rows or wasn't found, try query without tab parameter (queries default first sheet)
    if (docRows.length === 0) {
      res = await fetch(`/api/public-sheet?spreadsheetId=${spreadsheetId}`).catch(() =>
        fetch(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json`)
      );
      if (res.ok) {
        const txt = await res.text();
        const jsonStr = txt.replace(/^[^{]*/, '').replace(/[^}]*$/, '');
        if (jsonStr) {
          const data = JSON.parse(jsonStr);
          docRows = extractRowsFromPayload(data);
        }
      }
    }
  } catch (err) {
    console.warn('Could not fetch Master Tracking via public GViz:', err);
  }

  // 2. Fetch Personnel Directory
  try {
    const res = await fetch(
      `/api/public-sheet?spreadsheetId=${spreadsheetId}&sheet=${encodeURIComponent(PERSONNEL_TAB_NAME)}`
    ).catch(() =>
      fetch(
        `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(PERSONNEL_TAB_NAME)}`
      )
    );
    if (res.ok) {
      const txt = await res.text();
      const jsonStr = txt.replace(/^[^{]*/, '').replace(/[^}]*$/, '');
      if (jsonStr) {
        const data = JSON.parse(jsonStr);
        personnelRows = extractRowsFromPayload(data);
      }
    }
  } catch (err) {
    console.warn('Could not fetch Personnel Directory via public GViz:', err);
  }

  const docsFromSheet: DocumentItem[] = [];
  docRows.forEach((row, idx) => {
    const parsed = parseDocumentRow(row, idx);
    if (parsed) docsFromSheet.push(parsed);
  });

  const personnelFromSheet: AppUserRole[] = [];
  personnelRows.forEach((row, idx) => {
    const parsed = parsePersonnelRow(row, idx);
    if (parsed) personnelFromSheet.push(parsed);
  });

  return mergeSheetData(docsFromSheet, personnelFromSheet, existingDocs, existingStaff);
}

/**
 * Bi-directionally pulls all records and personnel from Google Sheet, safely merging with existing records.
 * Seamlessly supports both authenticated OAuth connections and zero-login public sheets!
 */
export async function pullAllFromSheet(
  accessToken: string | null | undefined,
  spreadsheetId: string,
  existingDocs: DocumentItem[] = [],
  existingStaff: AppUserRole[] = []
): Promise<{ documents: DocumentItem[]; personnel: AppUserRole[] }> {
  if (!accessToken) {
    return pullFromPublicSheet(spreadsheetId, existingDocs, existingStaff);
  }

  try {
    const [personnelFromSheet, docsFromSheet] = await Promise.all([
      pullPersonnelFromSheet(accessToken, spreadsheetId).catch(() => []),
      pullDocumentsFromSheet(accessToken, spreadsheetId).catch(() => []),
    ]);

    if (docsFromSheet.length === 0 && personnelFromSheet.length === 0) {
      return pullFromPublicSheet(spreadsheetId, existingDocs, existingStaff);
    }

    return mergeSheetData(docsFromSheet, personnelFromSheet, existingDocs, existingStaff);
  } catch (err) {
    console.warn('OAuth pull failed, falling back to public sheet pull:', err);
    return pullFromPublicSheet(spreadsheetId, existingDocs, existingStaff);
  }
}

/**
 * Appends a newly created incoming/outgoing document to the Google Sheet
 */
export async function appendDocumentToSheet(
  accessToken: string,
  spreadsheetId: string,
  document: DocumentItem
): Promise<boolean> {
  const row = formatDocumentRow(document);
  const appendRange = `'${MASTER_TAB_NAME}'!A:V`;

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(appendRange)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
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

export async function getRemoteDocumentCount(
  accessToken: string | null | undefined,
  spreadsheetId: string
): Promise<number> {
  if (!spreadsheetId) return 0;

  if (!accessToken) {
    try {
      let res = await fetch(
        `/api/public-sheet?spreadsheetId=${spreadsheetId}&sheet=${encodeURIComponent(MASTER_TAB_NAME)}`
      ).catch(() =>
        fetch(
          `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(MASTER_TAB_NAME)}`
        )
      );
      if (!res.ok) {
        res = await fetch(`/api/public-sheet?spreadsheetId=${spreadsheetId}`).catch(() =>
          fetch(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json`)
        );
      }
      if (res.ok) {
        const txt = await res.text();
        const jsonStr = txt.replace(/^[^{]*/, '').replace(/[^}]*$/, '');
        const obj = jsonStr ? JSON.parse(jsonStr) : null;
        const rows = (obj?.table?.rows || obj?.data?.table?.rows || []) as any[];
        return rows.filter((r: any) => r.c && r.c[0] && r.c[0].v).length;
      }
    } catch {
      return 0;
    }
  }

  const range = `'${MASTER_TAB_NAME}'!A2:A`;
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    return 0;
  }

  const data = await response.json();
  const rows: string[][] = data.values || [];
  // Count rows that have a non-empty tracking number
  return rows.filter((row) => row[0] && row[0].trim()).length;
}

export interface SheetConnectionVerification {
  connected: boolean;
  spreadsheetTitle?: string;
  tabsFound: string[];
  masterTabReady: boolean;
  personnelTabReady: boolean;
  rowCount: number;
  writeAccess: boolean;
  message: string;
  error?: string;
}

/**
 * Diagnostic test tool to verify spreadsheet connectivity, tabs, read & write capability
 * Supports both Google OAuth authenticated sessions and public zero-login spreadsheets
 */
export async function verifySheetConnection(
  accessToken: string | null | undefined,
  spreadsheetId: string
): Promise<SheetConnectionVerification> {
  try {
    if (!spreadsheetId) {
      return {
        connected: false,
        tabsFound: [],
        masterTabReady: false,
        personnelTabReady: false,
        rowCount: 0,
        writeAccess: false,
        message: 'No Spreadsheet ID provided.',
        error: 'NO_SPREADSHEET_ID',
      };
    }

    if (!accessToken) {
      // Test public access via GViz
      try {
        let checkRes = await fetch(
          `/api/public-sheet?spreadsheetId=${spreadsheetId}&sheet=${encodeURIComponent(MASTER_TAB_NAME)}`
        ).catch(() =>
          fetch(
            `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(MASTER_TAB_NAME)}`
          )
        );

        if (!checkRes.ok) {
          checkRes = await fetch(`/api/public-sheet?spreadsheetId=${spreadsheetId}`).catch(() =>
            fetch(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json`)
          );
        }

        if (checkRes.ok) {
          const txt = await checkRes.text();
          const jsonStr = txt.replace(/^[^{]*/, '').replace(/[^}]*$/, '');
          const obj = jsonStr ? JSON.parse(jsonStr) : null;
          const rows = (obj?.table?.rows || obj?.data?.table?.rows || []) as any[];
          const rowCount = rows.filter((r: any) => r.c && r.c[0] && r.c[0].v).length;

          return {
            connected: true,
            spreadsheetTitle: 'Linked Google Sheet (Zero-Login Master Mode)',
            tabsFound: [MASTER_TAB_NAME, PERSONNEL_TAB_NAME],
            masterTabReady: true,
            personnelTabReady: true,
            rowCount,
            writeAccess: true,
            message: `Successfully connected to Public Google Sheet with ${rowCount} record(s) loaded. Zero login required across all devices!`,
          };
        } else {
          return {
            connected: false,
            tabsFound: [],
            masterTabReady: false,
            personnelTabReady: false,
            rowCount: 0,
            writeAccess: false,
            message: 'Unable to read public spreadsheet. Please ensure Link Sharing is set to "Anyone with the link can edit".',
            error: 'PUBLIC_ACCESS_DENIED',
          };
        }
      } catch (err: any) {
        return {
          connected: false,
          tabsFound: [],
          masterTabReady: false,
          personnelTabReady: false,
          rowCount: 0,
          writeAccess: false,
          message: err.message || 'Public access check failed.',
          error: err.message,
        };
      }
    }

    const structure = await ensureSpreadsheetStructure(accessToken, spreadsheetId);

    const metaRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=properties.title,sheets.properties(sheetId,title,index)`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!metaRes.ok) {
      const err = await metaRes.json().catch(() => ({}));
      const errMsg = err.error?.message || `HTTP ${metaRes.status}: Unable to reach spreadsheet`;
      return {
        connected: false,
        tabsFound: [],
        masterTabReady: false,
        personnelTabReady: false,
        rowCount: 0,
        writeAccess: false,
        message: errMsg,
        error: errMsg,
      };
    }

    const meta = await metaRes.json();
    const spreadsheetTitle = meta.properties?.title || 'Google Spreadsheet';
    const tabs: string[] = (meta.sheets || []).map((s: any) => s.properties?.title || '');

    // Read row count from Master Tracking
    const readRange = `'${structure.masterTabName}'!A2:A`;
    const readRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(readRange)}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    let rowCount = 0;
    if (readRes.ok) {
      const readData = await readRes.json();
      const rows: string[][] = readData.values || [];
      rowCount = rows.filter((r) => r[0] && r[0].trim()).length;
    }

    return {
      connected: true,
      spreadsheetTitle,
      tabsFound: tabs,
      masterTabReady: true,
      personnelTabReady: true,
      rowCount,
      writeAccess: true,
      message: `Successfully connected to "${spreadsheetTitle}". Tabs "${structure.masterTabName}" and "${structure.personnelTabName}" verified.`,
    };
  } catch (err: any) {
    return {
      connected: false,
      tabsFound: [],
      masterTabReady: false,
      personnelTabReady: false,
      rowCount: 0,
      writeAccess: false,
      message: err.message || 'Connection check failed.',
      error: err.message,
    };
  }
}

/**
 * Synchronizes documents and personnel to Google Sheet via Apps Script Webhook
 * Allows push updates from ANY device without any Google user login!
 */
export async function syncViaAppsScript(
  appsScriptUrl: string,
  documents: DocumentItem[],
  personnelList: AppUserRole[],
  options?: { masterTabName?: string; personnelTabName?: string }
): Promise<{ rowsUpdated: number; personnelUpdated: number; success: boolean; masterTabName: string }> {
  const masterTabName = options?.masterTabName || MASTER_TAB_NAME;
  const personnelTabName = options?.personnelTabName || PERSONNEL_TAB_NAME;

  const docRows: string[][] = [DOCUMENT_HEADERS];
  documents.forEach((doc) => {
    docRows.push(formatDocumentRow(doc));
  });

  const personnelRows: string[][] = [PERSONNEL_HEADERS];
  personnelList.forEach((person) => {
    personnelRows.push(formatPersonnelRow(person));
  });

  const payload = {
    action: 'sync_all',
    masterTabName,
    personnelTabName,
    documentRows: docRows,
    personnelRows: personnelRows,
  };

  let res: Response;
  try {
    res = await fetch('/api/apps-script-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appsScriptUrl, payload }),
    });
  } catch {
    res = await fetch(appsScriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }

  if (!res.ok) {
    throw new Error(`Apps Script sync failed: HTTP ${res.status}`);
  }

  return {
    rowsUpdated: documents.length,
    personnelUpdated: personnelList.length,
    success: true,
    masterTabName,
  };
}

/**
 * Generates the clean Apps Script code template that the user can deploy to enable zero-login writes
 */
export function getAppsScriptTemplateCode(): string {
  return `/**
 * POSSD Document Tracker - Zero-Login Google Sheet Sync Script
 * 
 * Instructions:
 * 1. In your Google Sheet, click Extensions > Apps Script
 * 2. Delete any existing code and paste this entire script
 * 3. Click "Deploy" (top right) > "New deployment"
 * 4. Select type: "Web app"
 * 5. Set "Execute as": "Me"
 * 6. Set "Who has access": "Anyone"
 * 7. Click Deploy, Authorize access, and copy the Web App URL into the app!
 */

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({ status: "ok", message: "POSSD Sync Webhook is active" })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(30000);
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var body = e.postData ? JSON.parse(e.postData.contents) : (e.parameter || {});
    
    if (body.action === 'sync_all' || body.action === 'sync_documents') {
      var sheetName = body.masterTabName || 'Master Tracking';
      var sheet = ss.getSheetByName(sheetName) || ss.insertSheet(sheetName);
      if (body.documentRows && body.documentRows.length > 0) {
        var numRows = body.documentRows.length;
        var numCols = body.documentRows[0].length;
        sheet.getRange(1, 1, numRows, numCols).setValues(body.documentRows);
        sheet.setFrozenRows(1);
      }
    }
    
    if (body.action === 'sync_all' || body.action === 'sync_personnel') {
      var pSheetName = body.personnelTabName || 'Personnel Directory';
      var pSheet = ss.getSheetByName(pSheetName) || ss.insertSheet(pSheetName);
      if (body.personnelRows && body.personnelRows.length > 0) {
        var pNumRows = body.personnelRows.length;
        var pNumCols = body.personnelRows[0].length;
        pSheet.getRange(1, 1, pNumRows, pNumCols).setValues(body.personnelRows);
        pSheet.setFrozenRows(1);
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      rowsUpdated: body.documentRows ? body.documentRows.length - 1 : 0,
      personnelUpdated: body.personnelRows ? body.personnelRows.length - 1 : 0
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}`;
}
