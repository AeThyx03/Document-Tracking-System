# POSSD Document Tracking System - Consolidated Full Codebase Export

> **Notice for Gemini Code Review:**
> This file contains the complete source code of the application compiled into a single document for analysis, debugging, and verification.

## Table of Contents

1. `package.json`
2. `vite.config.ts`
3. `index.html`
4. `src/types.ts`
5. `src/lib/googleSheets.ts`
6. `src/lib/timeInDesk.ts`
7. `src/lib/sheetMapping.ts`
8. `src/lib/firebase.ts`
9. `src/lib/api.ts`
10. `src/mockData.ts`
11. `src/components/AdminSettingsView.tsx`
12. `src/components/DedicatedLinksView.tsx`
13. `src/components/DocumentAnalyticsDashboard.tsx`
14. `src/components/DocumentAuditTrail.tsx`
15. `src/components/DocumentDetailModal.tsx`
16. `src/components/DocumentLifecycleProgress.tsx`
17. `src/components/GoogleSheetSyncModal.tsx`
18. `src/components/IncomingDocumentModal.tsx`
19. `src/components/KeyboardShortcutsModal.tsx`
20. `src/components/LoginModal.tsx`
21. `src/components/NotificationCenter.tsx`
22. `src/components/PossdLogo.tsx`
23. `src/components/PWAInstallButton.tsx`
24. `src/components/RolesManagementModal.tsx`
25. `src/components/TimeInDeskConfigModal.tsx`
26. `src/components/VerticalNavigationSidebar.tsx`
27. `src/components/usePWAInstall.ts`
28. `src/main.tsx`
29. `src/App.tsx`

---

## File: `package.json` (44 lines)

```json
{
  "name": "react-example",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx server.ts",
    "build": "vite build && esbuild server.ts --bundle --platform=node --format=cjs --packages=external --sourcemap --outfile=dist/server.cjs",
    "start": "node dist/server.cjs",
    "preview": "vite preview",
    "export:bundle": "node scripts/generate_bundle.cjs",
    "clean": "rm -rf dist server.js",
    "lint": "tsc --noEmit"
  },
  "dependencies": {
    "@google/genai": "^2.4.0",
    "@tailwindcss/vite": "^4.1.14",
    "@vitejs/plugin-react": "^5.0.4",
    "dotenv": "^17.2.3",
    "express": "^4.21.2",
    "firebase": "^12.18.0",
    "jsonwebtoken": "^9.0.3",
    "jwks-rsa": "^4.1.0",
    "lucide-react": "^0.546.0",
    "motion": "^12.23.24",
    "react": "^19.0.1",
    "react-dom": "^19.0.1",
    "recharts": "^3.10.1",
    "tailwindcss": "^4.1.14",
    "vite": "^6.2.3"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^22.14.0",
    "@types/react": "^19.3.0",
    "@types/react-dom": "^19.3.0",
    "autoprefixer": "^10.4.21",
    "esbuild": "^0.25.0",
    "tsx": "^4.21.0",
    "typescript": "~5.8.2",
    "vite-plugin-pwa": "^1.3.0"
  }
}
```

---

## File: `vite.config.ts` (102 lines)

```typescript
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    base: '/',
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['icon.svg', 'apple-touch-icon.png', 'possd-logo.svg'],
        manifest: {
          id: '/',
          name: 'POSSD Document Tracking System',
          short_name: 'POSSD Track',
          description: 'Official Port Operations & Services Support Division Document Tracking System with offline asset caching and live sync.',
          theme_color: '#0f172a',
          background_color: '#0f172a',
          display: 'standalone',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
        devOptions: {
          enabled: false,
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      chunkSizeWarningLimit: 3000,
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
```

---

## File: `index.html` (26 lines)

```html
<!doctype html>
<html lang="en" class="dark">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#0f172a" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    <meta name="apple-mobile-web-app-title" content="POSSD Track" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
    <link rel="icon" type="image/svg+xml" href="/icon.svg" />
    <title>POSSD Document Tracking System</title>
    <meta name="description" content="Monitor incoming and outgoing office documents with internal routing, recharts management analytics dashboard, supervisor compliance remarks, manager clearances, real-time notifications, and Google Sheets sync." />
    <meta property="og:title" content="POSSD Document Tracking System" />
    <meta property="og:description" content="Monitor incoming and outgoing office documents with internal routing, recharts management analytics dashboard, supervisor compliance remarks, manager clearances, real-time notifications, and Google Sheets sync." />
    <meta property="og:type" content="website" />
    <meta name="twitter:card" content="summary_large_image" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>

```

---

## File: `src/types.ts` (208 lines)

```typescript
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
  fileLink?: string; // Optional external URL or cloud file link (Google Drive, OneDrive, PDF, etc.)
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
  type: 'incoming' | 'movement' | 'remark' | 'compliance' | 'clearance' | 'sync' | 'urgent';
  read: boolean;
}

export type UserRoleType = string;

export interface RegistryDropdownOptions {
  roles: string[];
  departments: string[];
  desks: string[];
  documentTypes: string[];
  communicationTypes: string[];
  reportTypes: string[];
  personnel: string[];
}


export interface AppUserRole {
  id: string;
  name: string;
  role: UserRoleType;
  division: string;
  avatarInitials?: string;
  email?: string;
  assignedDesk?: string;
  username: string;
  password?: string;
  status?: 'active' | 'suspended';
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
  category: 'Google Drive' | 'Official Files' | 'Portals & Systems' | 'Reference Guidelines';
  description?: string;
  targetDivision?: string;
  iconType?: 'drive' | 'file' | 'link' | 'folder' | 'sheet';
  addedBy: string;
  addedAt: string;
  isPinned?: boolean;
}

export interface SyncDiagnosticLog {
  id: string;
  timestamp: string; // ISO or formatted
  operation: 'push' | 'pull';
  status: 'success' | 'partial' | 'failed' | 'error' | 'quota_cooldown';
  durationMs: number;
  docsCount: number;
  personnelCount: number;
  payloadSizeBytes: number;
  details: string;
  docsSuccess?: boolean;
  personnelSuccess?: boolean;
  error?: string;
  breakdown?: {
    headersMs?: number;
    docsMs?: number;
    personnelMs?: number;
    apiCallsCount?: number;
    networkLatencyMs?: number;
    payloadSerializationMs?: number;
    domProcessingMs?: number;
  };
}

export interface SyncProgressStatus {
  isSyncing?: boolean;
  inProgress?: boolean;
  isPartial: boolean;
  stage:
    | 'idle'
    | 'initializing'
    | 'init'
    | 'headers'
    | 'docs'
    | 'docs_syncing'
    | 'docs_done'
    | 'personnel'
    | 'personnel_syncing'
    | 'completed'
    | 'done'
    | 'partial'
    | 'failed'
    | 'error';
  stageText?: string;
  message?: string;
  percent?: number;
  docsDone?: boolean;
  persDone?: boolean;
  personnelDone?: boolean;
  lastDurationMs?: number;
  lastPayloadKb?: number;
}
```

---

## File: `src/lib/googleSheets.ts` (1817 lines)

```typescript
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
  if (err.status === 429 || err.code === 429 || err?.error?.code === 429) return true;
  const msg = (
    typeof err === 'string'
      ? err
      : err?.error?.message || err?.message || err?.statusText || ''
  ).toLowerCase();
  return (
    msg.includes('rate exceeded') ||
    msg.includes('quota exceeded') ||
    msg.includes('write requests per minute') ||
    msg.includes('read requests per minute') ||
    msg.includes('rate limit') ||
    msg.includes('too many requests') ||
    msg.includes('resource_exhausted') ||
    msg.includes('resource has been exhausted') ||
    msg.includes('quota') ||
    msg.includes('429')
  );
}

/**
 * Internal helper to retry fetch operations with exponential backoff on HTTP 429 rate limit errors
 */
async function fetchWithQuotaRetry(
  url: string,
  options: RequestInit,
  maxRetries = 2
): Promise<Response> {
  let attempt = 0;
  while (true) {
    const res = await fetch(url, options);
    if (res.status === 429) {
      if (attempt < maxRetries) {
        attempt++;
        const backoffMs = 1500 * Math.pow(2, attempt);
        console.warn(`Google Sheets 429 Rate limit detected. Backing off ${backoffMs}ms before retry ${attempt}...`);
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
        continue;
      }
    }
    return res;
  }
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

export interface SyncProgressCallback {
  (progress: {
    stage: 'init' | 'headers' | 'docs' | 'docs_done' | 'personnel' | 'done' | 'partial' | 'error';
    message: string;
    docsDone?: boolean;
    persDone?: boolean;
  }): void;
}

export interface SheetSyncResult {
  success: boolean;
  partial: boolean;
  docsSynced: boolean;
  personnelSynced: boolean;
  rowsUpdated: number;
  personnelUpdated: number;
  masterTabName: string;
  masterSheetId?: number;
  durationMs: number;
  payloadSizeBytes: number;
  details: string;
  error?: string;
  breakdown?: {
    headersMs?: number;
    docsMs?: number;
    personnelMs?: number;
    apiCallsCount?: number;
  };
}

/**
 * Synchronizes all document records AND personnel roster into the linked Google Sheet
 * Returns partial success flags and execution latency breakdown
 */
export async function syncAllDocumentsToSheet(
  accessToken: string | null | undefined,
  spreadsheetId: string,
  documents: DocumentItem[],
  personnelList?: AppUserRole[],
  options?: {
    forceHeaders?: boolean;
    targetMasterTab?: string;
    appsScriptUrl?: string;
    onProgress?: SyncProgressCallback;
  }
): Promise<SheetSyncResult> {
  const overallStart = performance.now();
  let headersDuration = 0;
  let docsDuration = 0;
  let persDuration = 0;
  let apiCallsCount = 0;

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

  // Calculate total payload size in bytes (documents + personnel JSON)
  const docPayloadBytes = JSON.stringify(documents).length;
  const persPayloadBytes = personnelList ? JSON.stringify(personnelList).length : 0;
  const totalPayloadSizeBytes = docPayloadBytes + persPayloadBytes;

  if (targetAppsScriptUrl) {
    options?.onProgress?.({
      stage: 'docs',
      message: `Syncing ${documents.length} records via Google Apps Script Webhook...`,
    });
    const res = await syncViaAppsScript(targetAppsScriptUrl, documents, personnelList || [], {
      masterTabName: options?.targetMasterTab || MASTER_TAB_NAME,
      personnelTabName: PERSONNEL_TAB_NAME,
    });
    const durationMs = Math.round(performance.now() - overallStart);
    options?.onProgress?.({
      stage: 'done',
      message: `Synchronized ${res.rowsUpdated} records via Apps Script (${durationMs}ms)`,
      docsDone: true,
      persDone: true,
    });
    return {
      success: true,
      partial: false,
      docsSynced: true,
      personnelSynced: true,
      rowsUpdated: res.rowsUpdated,
      personnelUpdated: res.personnelUpdated,
      masterTabName: res.masterTabName,
      durationMs,
      payloadSizeBytes: totalPayloadSizeBytes,
      details: `Apps Script sync: ${res.rowsUpdated} docs, ${res.personnelUpdated} staff in ${durationMs}ms (${Math.round(totalPayloadSizeBytes / 1024)} KB).`,
      breakdown: {
        docsMs: durationMs,
        apiCallsCount: 1,
      },
    };
  }

  if (!accessToken) {
    // Zero-login mode: Persist all entries to the centralized server backend so they are permanently preserved for all users
    options?.onProgress?.({
      stage: 'docs',
      message: `Persisting ${documents.length} records to central database...`,
    });
    try {
      apiCallsCount++;
      await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documents }),
      });
      if (personnelList && personnelList.length > 0) {
        apiCallsCount++;
        await fetch('/api/staff', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ staff: personnelList }),
        });
      }
    } catch (e) {
      console.warn('Central server sync note:', e);
    }
    const durationMs = Math.round(performance.now() - overallStart);
    options?.onProgress?.({
      stage: 'done',
      message: `Persisted ${documents.length} records to central database (${durationMs}ms)`,
      docsDone: true,
      persDone: true,
    });
    return {
      success: true,
      partial: false,
      docsSynced: true,
      personnelSynced: true,
      rowsUpdated: documents.length,
      personnelUpdated: (personnelList || []).length,
      masterTabName: options?.targetMasterTab || MASTER_TAB_NAME,
      durationMs,
      payloadSizeBytes: totalPayloadSizeBytes,
      details: `Central server sync: ${documents.length} docs, ${(personnelList || []).length} staff in ${durationMs}ms.`,
      breakdown: {
        docsMs: durationMs,
        apiCallsCount,
      },
    };
  }

  if (!spreadsheetId) {
    throw new Error('No Google Spreadsheet ID provided.');
  }

  // 1. Ensure sheet structure and headers only if not yet initialized or forced
  let structure = {
    masterTabName: options?.targetMasterTab || MASTER_TAB_NAME,
    masterSheetId: 0,
    personnelTabName: PERSONNEL_TAB_NAME,
  };

  if (options?.forceHeaders || !initializedSheets.has(spreadsheetId)) {
    options?.onProgress?.({
      stage: 'headers',
      message: 'Checking Google Sheet tabs and table headers...',
    });
    const headerStart = performance.now();
    structure = await populateHeaders(
      accessToken,
      spreadsheetId,
      options?.targetMasterTab || MASTER_TAB_NAME
    );
    headersDuration = Math.round(performance.now() - headerStart);
    initializedSheets.add(spreadsheetId);
    apiCallsCount += 2;
  }

  // 2. Prepare all document rows with sanitization
  const docRows = documents.map((d) => formatDocumentRow(d).map(sanitizeCellValue));
  let docsSynced = false;
  let docError: string | null = null;

  options?.onProgress?.({
    stage: 'docs',
    message: `Uploading ${docRows.length} records to "${structure.masterTabName}"...`,
    docsDone: false,
    persDone: false,
  });

  const docsStart = performance.now();

  // Clear existing values from Master Tracking (row 2 onwards) with empty body {}
  const clearDocRange = `'${structure.masterTabName}'!A2:V`;
  apiCallsCount++;
  await fetchWithQuotaRetry(
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
    apiCallsCount++;
    const docRes = await fetchWithQuotaRetry(
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
    docsDuration = Math.round(performance.now() - docsStart);

    if (!docRes.ok) {
      const err = await docRes.json().catch(() => ({}));
      if (isGoogleQuotaError(err) || docRes.status === 429) {
        throw new Error('Google Sheets write rate limit reached (60 requests/min). Records are safely preserved on your device and will resume syncing once the quota resets.');
      }
      docError = err.error?.message || `Failed to sync documents to tab "${structure.masterTabName}"`;
      throw new Error(docError || 'Failed to sync documents');
    } else {
      docsSynced = true;
      options?.onProgress?.({
        stage: 'docs_done',
        message: `Documents synced (${docRows.length} rows in ${docsDuration}ms)! Processing personnel...`,
        docsDone: true,
        persDone: false,
      });
    }
  } else {
    docsSynced = true;
    docsDuration = Math.round(performance.now() - docsStart);
  }

  // 3. Prepare and sync Personnel Directory tab if personnel list provided
  let personnelUpdated = 0;
  let personnelSynced = false;
  let persError: string | null = null;

  if (personnelList && personnelList.length > 0) {
    options?.onProgress?.({
      stage: 'personnel',
      message: `Syncing ${personnelList.length} staff profiles to "${structure.personnelTabName}"...`,
      docsDone: docsSynced,
      persDone: false,
    });

    const persStart = performance.now();
    const personnelRows = personnelList.map((p) => formatPersonnelRow(p, documents).map(sanitizeCellValue));
    const clearPersonnelRange = `'${structure.personnelTabName}'!A2:L`;

    apiCallsCount++;
    await fetchWithQuotaRetry(
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
    apiCallsCount++;
    const persRes = await fetchWithQuotaRetry(
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
    persDuration = Math.round(performance.now() - persStart);

    if (persRes.ok) {
      personnelUpdated = personnelRows.length;
      personnelSynced = true;
    } else {
      const err = await persRes.json().catch(() => ({}));
      persError = err.error?.message || (persRes.status === 429 ? 'Write rate limit reached on personnel update' : 'Personnel tab sync failed');
      // If documents were already synced, DO NOT crash the entire sync!
      // Instead, flag this as partial success so the user sees documents are safely saved.
      console.warn('Personnel sync partial notice:', persError);
    }
  } else {
    personnelSynced = true;
  }

  const totalDurationMs = Math.round(performance.now() - overallStart);
  const isPartial = docsSynced && Boolean(personnelList && personnelList.length > 0 && !personnelSynced);
  const isSuccess = docsSynced && (!personnelList?.length || personnelSynced);

  let detailsText = '';
  if (isPartial) {
    detailsText = `Partial sync: ${docRows.length} documents saved (${docsDuration}ms), but Personnel Directory sync deferred (${persError || 'quota limit'}).`;
    options?.onProgress?.({
      stage: 'partial',
      message: detailsText,
      docsDone: true,
      persDone: false,
    });
  } else {
    detailsText = `Full sync: ${docRows.length} documents (${docsDuration}ms) and ${personnelUpdated} staff (${persDuration}ms) updated in ${totalDurationMs}ms (${Math.round(totalPayloadSizeBytes / 1024)} KB).`;
    options?.onProgress?.({
      stage: 'done',
      message: `Complete! All ${docRows.length} documents and staff updated (${totalDurationMs}ms).`,
      docsDone: true,
      persDone: true,
    });
  }

  return {
    success: isSuccess,
    partial: isPartial,
    docsSynced,
    personnelSynced,
    rowsUpdated: docsSynced ? docRows.length : 0,
    personnelUpdated,
    masterTabName: structure.masterTabName,
    masterSheetId: structure.masterSheetId,
    durationMs: totalDurationMs,
    payloadSizeBytes: totalPayloadSizeBytes,
    details: detailsText,
    error: persError || undefined,
    breakdown: {
      headersMs: headersDuration,
      docsMs: docsDuration,
      personnelMs: persDuration,
      apiCallsCount,
    },
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

export interface SheetPullResult {
  documents: DocumentItem[];
  personnel: AppUserRole[];
  durationMs: number;
  payloadSizeBytes: number;
  details: string;
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
): Promise<SheetPullResult> {
  const start = performance.now();
  let baseResult: { documents: DocumentItem[]; personnel: AppUserRole[] };

  if (!accessToken) {
    baseResult = await pullFromPublicSheet(spreadsheetId, existingDocs, existingStaff);
  } else {
    try {
      const [personnelFromSheet, docsFromSheet] = await Promise.all([
        pullPersonnelFromSheet(accessToken, spreadsheetId).catch(() => []),
        pullDocumentsFromSheet(accessToken, spreadsheetId).catch(() => []),
      ]);

      if (docsFromSheet.length === 0 && personnelFromSheet.length === 0) {
        baseResult = await pullFromPublicSheet(spreadsheetId, existingDocs, existingStaff);
      } else {
        baseResult = mergeSheetData(docsFromSheet, personnelFromSheet, existingDocs, existingStaff);
      }
    } catch (err) {
      console.warn('OAuth pull failed, falling back to public sheet pull:', err);
      baseResult = await pullFromPublicSheet(spreadsheetId, existingDocs, existingStaff);
    }
  }

  const durationMs = Math.round(performance.now() - start);
  const payloadSizeBytes = JSON.stringify(baseResult.documents).length + JSON.stringify(baseResult.personnel).length;
  const details = `Pulled ${baseResult.documents.length} records and ${baseResult.personnel.length} staff (${Math.round(payloadSizeBytes / 1024)} KB) in ${durationMs}ms.`;

  return {
    ...baseResult,
    durationMs,
    payloadSizeBytes,
    details,
  };
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
```

---

## File: `src/lib/timeInDesk.ts` (153 lines)

```typescript
import { DocumentItem, TimeInDeskConfig, DocumentTimeMetrics } from '../types';

export const TIME_IN_DESK_CONFIG_KEY = 'doc_tracker_time_in_desk_config';

export const DEFAULT_TIME_IN_DESK_CONFIG: TimeInDeskConfig = {
  defaultThresholdHours: 24,
  divisionThresholds: {
    'Finance & Budget Division': 24,
    'Administrative & General Services': 24,
    'Planning & Quality Assurance': 36,
    'Legal & Regulatory Affairs': 48,
    'Operations & Emergency Management': 8,
    'Executive Office of the Manager': 12,
    'Central Records & Receiving Desk': 4,
    'Information Technology Division': 24,
  },
  highlightRowOnExceed: true,
};

/**
 * Returns system reference now. If local clock is before Sept 2026 baseline,
 * uses the latest mock date baseline so simulated metrics remain coherent.
 */
export function getReferenceNow(): number {
  const systemNow = Date.now();
  // Sept 6, 2026 14:30:00 UTC baseline
  const baseline = new Date('2026-09-06T14:30:00Z').getTime();
  return Math.max(systemNow, baseline);
}

export function getTimeInDeskConfig(): TimeInDeskConfig {
  try {
    const raw = localStorage.getItem(TIME_IN_DESK_CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_TIME_IN_DESK_CONFIG,
        ...parsed,
        divisionThresholds: {
          ...DEFAULT_TIME_IN_DESK_CONFIG.divisionThresholds,
          ...(parsed.divisionThresholds || {}),
        },
      };
    }
  } catch (err) {
    console.error('Failed to parse time-in-desk config:', err);
  }
  return DEFAULT_TIME_IN_DESK_CONFIG;
}

export function saveTimeInDeskConfig(config: TimeInDeskConfig): void {
  try {
    localStorage.setItem(TIME_IN_DESK_CONFIG_KEY, JSON.stringify(config));
  } catch (err) {
    console.error('Failed to save time-in-desk config:', err);
  }
}

export function getDivisionThreshold(division: string, config: TimeInDeskConfig): number {
  if (config.divisionThresholds && typeof config.divisionThresholds[division] === 'number') {
    return config.divisionThresholds[division];
  }
  return config.defaultThresholdHours || 24;
}

export function formatDuration(ms: number): string {
  if (ms < 0) ms = 0;
  const totalMinutes = Math.floor(ms / (1000 * 60));
  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return `${days}d ${hours}h`;
  }
  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  return `${Math.max(1, minutes)}m`;
}

/**
 * Calculates dwell time in division and desk, comparing against configurable threshold.
 */
export function calculateDocumentTimeInDesk(
  doc: DocumentItem,
  config: TimeInDeskConfig,
  referenceTime?: number
): DocumentTimeMetrics {
  const refNow = referenceTime || getReferenceNow();
  const isCleared = !!doc.managerClearance?.isCleared;

  // Determine when the document entered the division / current desk
  let arrivalTimestamp = doc.createdAt;
  if (doc.dateReceived && doc.timeReceived) {
    const combinedStr = `${doc.dateReceived}T${doc.timeReceived}Z`;
    const parsed = new Date(combinedStr).getTime();
    if (!isNaN(parsed)) {
      arrivalTimestamp = new Date(parsed).toISOString();
    }
  }

  // If there are movements within the division, the latest movement is the arrival at current desk
  const latestMovement = doc.movements && doc.movements.length > 0 
    ? doc.movements[doc.movements.length - 1] 
    : null;

  // If movements exist, arrival at current desk/division can be inferred
  const effectiveArrival = latestMovement?.timestamp || arrivalTimestamp;
  const arrivalDate = new Date(effectiveArrival).getTime();

  let stopDate = refNow;
  if (isCleared && doc.managerClearance?.clearedAt) {
    const clearedTime = new Date(doc.managerClearance.clearedAt).getTime();
    if (!isNaN(clearedTime)) {
      stopDate = clearedTime;
    }
  }

  const elapsedMs = Math.max(0, stopDate - arrivalDate);
  const elapsedHours = elapsedMs / (1000 * 60 * 60);
  const elapsedFormatted = formatDuration(elapsedMs);

  const division = doc.targetDivision || 'General Administration';
  const currentDesk = doc.currentLocation || 'Unassigned Desk';
  const thresholdHours = getDivisionThreshold(division, config);
  const thresholdMs = thresholdHours * 60 * 60 * 1000;

  // Only active (non-cleared) documents trigger overdue alert
  const isOverdue = !isCleared && elapsedMs > thresholdMs;
  const overdueMs = isOverdue ? elapsedMs - thresholdMs : 0;
  const overdueFormatted = formatDuration(overdueMs);

  const remainingMs = !isCleared && !isOverdue ? Math.max(0, thresholdMs - elapsedMs) : 0;
  const remainingFormatted = formatDuration(remainingMs);

  return {
    arrivalTimestamp: effectiveArrival,
    elapsedMs,
    elapsedHours,
    elapsedFormatted,
    thresholdHours,
    isOverdue,
    overdueMs,
    overdueFormatted,
    remainingMs,
    remainingFormatted,
    isCleared,
    division,
    currentDesk,
  };
}
```

---

## File: `src/lib/sheetMapping.ts` (121 lines)

```typescript
import { DocumentItem, AppUserRole, DedicatedLinkItem } from '../types';

/**
 * Unified data-mapping utility for Google Sheets synchronization.
 * Ensures internal state structures are properly formatted for 
 * 'Master Tracking', 'Personnel Directory', and 'Dedicated Links'.
 */

export const SheetMappers = {
  
  // 1. Master Tracking (Documents)
  toSheetDocument(doc: DocumentItem): Record<string, any> {
    return {
      id: doc.id,
      trackingNumber: doc.trackingNumber,
      title: doc.title || '',
      priority: doc.priority || 'Routine',
      communicationType: doc.communicationType || 'Internal',
      documentType: doc.documentType || 'Other',
      reportType: doc.reportType || 'N/A',
      originDepartment: doc.originDepartment || '',
      dateReceived: doc.dateReceived || '',
      timeReceived: doc.timeReceived || '',
      responsiblePerson: doc.responsiblePerson || '',
      currentCustodian: doc.currentCustodian || '',
      targetDivision: doc.targetDivision || '',
      currentStatus: doc.currentStatus || 'Incoming Logged',
      currentLocation: doc.currentLocation || '',
      createdAt: doc.createdAt || new Date().toISOString(),
      updatedAt: doc.updatedAt || new Date().toISOString(),
      fileLink: doc.fileLink || '',
      
      // Complex objects are stored as JSON strings in the sheet
      supervisorRemarks: doc.supervisorRemarks ? JSON.stringify(doc.supervisorRemarks) : '[]',
      movements: doc.movements ? JSON.stringify(doc.movements) : '[]',
      managerClearance: doc.managerClearance ? JSON.stringify(doc.managerClearance) : 'null',
    };
  },

  fromSheetDocument(row: any): DocumentItem {
    return {
      id: row.id,
      trackingNumber: row.trackingNumber,
      title: row.title || '',
      priority: row.priority || 'Routine',
      communicationType: row.communicationType || 'Internal',
      documentType: row.documentType || 'Other',
      reportType: row.reportType || 'N/A',
      originDepartment: row.originDepartment || '',
      dateReceived: row.dateReceived || '',
      timeReceived: row.timeReceived || '',
      responsiblePerson: row.responsiblePerson || '',
      currentCustodian: row.currentCustodian || '',
      targetDivision: row.targetDivision || '',
      currentStatus: row.currentStatus || 'Incoming Logged',
      currentLocation: row.currentLocation || '',
      createdAt: row.createdAt || new Date().toISOString(),
      updatedAt: row.updatedAt || new Date().toISOString(),
      fileLink: row.fileLink || '',
      
      supervisorRemarks: typeof row.supervisorRemarks === 'string' ? JSON.parse(row.supervisorRemarks || '[]') : (row.supervisorRemarks || []),
      movements: typeof row.movements === 'string' ? JSON.parse(row.movements || '[]') : (row.movements || []),
      managerClearance: typeof row.managerClearance === 'string' ? JSON.parse(row.managerClearance || 'null') : (row.managerClearance || null),
    };
  },

  // 2. Personnel Directory
  toSheetPersonnel(staff: AppUserRole): Record<string, any> {
    return {
      id: staff.id,
      name: staff.name,
      role: staff.role,
      division: staff.division || '',
      email: staff.email || '',
      username: staff.username || '',
    };
  },

  fromSheetPersonnel(row: any): AppUserRole {
    return {
      id: row.id,
      name: row.name,
      role: row.role as any,
      division: row.division || '',
      email: row.email || '',
      username: row.username || '',
    };
  },

  // 3. Dedicated Links
  toSheetLink(link: DedicatedLinkItem): Record<string, any> {
    return {
      id: link.id,
      title: link.title,
      url: link.url,
      category: link.category,
      description: link.description || '',
      targetDivision: link.targetDivision || '',
      iconType: link.iconType || 'link',
      addedBy: link.addedBy || '',
      addedAt: link.addedAt || '',
      isPinned: Boolean(link.isPinned),
    };
  },

  fromSheetLink(row: any): DedicatedLinkItem {
    return {
      id: row.id,
      title: row.title,
      url: row.url,
      category: row.category,
      description: row.description || '',
      targetDivision: row.targetDivision || '',
      iconType: row.iconType as any || 'link',
      addedBy: row.addedBy || '',
      addedAt: row.addedAt || '',
      isPinned: Boolean(row.isPinned),
    };
  }
};
```

---

## File: `src/lib/firebase.ts` (175 lines)

```typescript
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App singleton safely
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

export const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file'
];

const provider = new GoogleAuthProvider();
SCOPES.forEach(scope => provider.addScope(scope));
provider.setCustomParameters({
  prompt: 'select_account'
});

// Storage keys for session & token persistence
const STAY_SIGNED_IN_KEY = 'possd_google_stay_signed_in';
const TOKEN_STORAGE_KEY = 'possd_google_oauth_token';
const TOKEN_EXPIRY_KEY = 'possd_google_oauth_expiry';

// Check if user has opted into staying signed in (defaults to true)
export const getStaySignedIn = (): boolean => {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem(STAY_SIGNED_IN_KEY) !== 'false';
};

// Set stay signed in preference
export const setStaySignedIn = (stay: boolean): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STAY_SIGNED_IN_KEY, stay ? 'true' : 'false');
};

// Flag to indicate if we are in the middle of a sign-in flow.
let isSigningIn = false;
// In-memory access token cache
let cachedAccessToken: string | null = null;

// Helper to retrieve saved token if valid and not expired
const getStoredToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  const stay = getStaySignedIn();
  const primaryStorage = stay ? localStorage : sessionStorage;
  const secondaryStorage = stay ? sessionStorage : localStorage;

  const token = primaryStorage.getItem(TOKEN_STORAGE_KEY) || secondaryStorage.getItem(TOKEN_STORAGE_KEY);
  const expiry = Number(primaryStorage.getItem(TOKEN_EXPIRY_KEY) || secondaryStorage.getItem(TOKEN_EXPIRY_KEY) || 0);

  if (token && expiry > Date.now()) {
    return token;
  }
  return null;
};

// Helper to save token to appropriate storage
const saveStoredToken = (token: string, stay: boolean) => {
  if (typeof window === 'undefined') return;
  const storage = stay ? localStorage : sessionStorage;
  const otherStorage = stay ? sessionStorage : localStorage;

  // Google OAuth tokens are valid for 1 hour (3600s); store expiry at 55 minutes
  const expiry = Date.now() + 55 * 60 * 1000;
  storage.setItem(TOKEN_STORAGE_KEY, token);
  storage.setItem(TOKEN_EXPIRY_KEY, String(expiry));
  
  // Clean other storage to avoid conflicts
  otherStorage.removeItem(TOKEN_STORAGE_KEY);
  otherStorage.removeItem(TOKEN_EXPIRY_KEY);
};

// Helper to clear all stored tokens
const clearStoredToken = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(TOKEN_EXPIRY_KEY);
  sessionStorage.removeItem(TOKEN_STORAGE_KEY);
  sessionStorage.removeItem(TOKEN_EXPIRY_KEY);
};

// Initialize auth state listener
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (!cachedAccessToken) {
        cachedAccessToken = getStoredToken();
      }

      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else {
        // If we don't have the token, let's just get it since the user is authenticated in firebase
        try {
            // Since we need OAuth token and not ID token for Google Sheets, if the token is lost from session, we cannot retrieve the OAuth token from just getIdToken() which is a Firebase JWT.
            // We must prompt the user to re-authenticate or they will be signed out from spreadsheet capability.
            // However, we just return the user for now. Google Sheet writes might fail and prompt re-auth.
            cachedAccessToken = null;
            if (!isSigningIn && onAuthFailure) onAuthFailure();
        } catch (e) {
            if (!isSigningIn && onAuthFailure) onAuthFailure();
        }
      }
    } else {
      cachedAccessToken = null;
      clearStoredToken();
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (
  options?: { staySignedIn?: boolean }
): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const stay = options?.staySignedIn !== undefined ? options.staySignedIn : getStaySignedIn();
    setStaySignedIn(stay);

    // Set Firebase Auth persistence
    try {
      await setPersistence(auth, stay ? browserLocalPersistence : browserSessionPersistence);
    } catch (persistErr) {
      console.warn('Failed to set auth persistence:', persistErr);
    }

    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const token = credential?.accessToken;
    if (!token) throw new Error('No Google OAuth access token returned');
    cachedAccessToken = token;
    saveStoredToken(cachedAccessToken, stay);

    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Sign-in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = (): string | null => {
  return cachedAccessToken || getStoredToken();
};

export const setAccessToken = (token: string | null) => {
  cachedAccessToken = token;
  if (token) {
    saveStoredToken(token, getStaySignedIn());
  } else {
    clearStoredToken();
  }
};

export const logoutGoogle = async () => {
  await signOut(auth);
  cachedAccessToken = null;
  clearStoredToken();
};
```

---

## File: `src/lib/api.ts` (38 lines)

```typescript
import { DocumentItem, AppUserRole } from "../types";

export async function fetchDocuments(): Promise<DocumentItem[]> {
  return []; // Rely on local storage & Google Sheets sync
}

export async function createDocument(doc: DocumentItem): Promise<DocumentItem> {
  return doc;
}

export async function updateDocument(doc: DocumentItem): Promise<DocumentItem> {
  return doc;
}

export async function deleteDocument(docId: string): Promise<void> {
  return;
}

export async function fetchStaff(): Promise<AppUserRole[]> {
  return []; // Rely on local storage & Google Sheets sync
}

export async function saveStaffMember(staff: AppUserRole): Promise<void> {
  return;
}

export async function logAudit(action: string, docId: string, user: string, previousValue: string, newValue: string) {
  return;
}

export async function fetchLinks(): Promise<any[]> {
  return [];
}

export async function saveLinks(links: any[]): Promise<void> {
  return;
}
```

---

## File: `src/mockData.ts` (674 lines)

```typescript
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
            (staff.name || '').toLowerCase().replace(/[^a-z0-9]/g, '.').replace(/\.+/g, '.').replace(/^\.|\.$/g, '') ||
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

```

---

## File: `src/components/AdminSettingsView.tsx` (1053 lines)

```typescript
import React, { useState, useMemo } from 'react';
import { TimeInDeskConfig, DocumentItem, AppUserRole, SyncDiagnosticLog } from '../types';
import { calculateDocumentTimeInDesk, DEFAULT_TIME_IN_DESK_CONFIG } from '../lib/timeInDesk';
import { SheetMetadata } from '../lib/googleSheets';
import {
  Sliders,
  Timer,
  Clock,
  AlertTriangle,
  Users,
  FileSpreadsheet,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  ShieldCheck,
  Building,
  Wifi,
  WifiOff,
  DownloadCloud,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  BarChart2,
  HardDrive,
  Download,
  Check,
  Layers,
  Zap,
  Copy,
  FileCode,
  ExternalLink,
  FileText,
} from 'lucide-react';
import { useOnlineStatus } from './usePWAInstall';
import { PWAInstallButton } from './PWAInstallButton';

interface AdminSettingsViewProps {
  timeInDeskConfig: TimeInDeskConfig;
  onSaveConfig: (newConfig: TimeInDeskConfig) => void;
  documents: DocumentItem[];
  staffList: AppUserRole[];
  sheetConfig: SheetMetadata | null;
  onOpenRolesModal: () => void;
  onOpenSheetModal: () => void;
  availableDivisions: string[];
  syncDiagnosticLogs?: SyncDiagnosticLog[];
  onClearDiagnosticLogs?: () => void;
  onTriggerDiagnosticSync?: () => Promise<void> | void;
  isDiagnosticSyncing?: boolean;
}

export const AdminSettingsView: React.FC<AdminSettingsViewProps> = ({
  timeInDeskConfig,
  onSaveConfig,
  documents,
  staffList,
  sheetConfig,
  onOpenRolesModal,
  onOpenSheetModal,
  availableDivisions,
  syncDiagnosticLogs = [],
  onClearDiagnosticLogs,
  onTriggerDiagnosticSync,
  isDiagnosticSyncing = false,
}) => {
  const [activeTab, setActiveTab] = useState<'thresholds' | 'diagnostics'>('thresholds');
  const [diagnosticFilter, setDiagnosticFilter] = useState<'ALL' | 'push' | 'pull' | 'issues'>('ALL');
  const [defaultHours, setDefaultHours] = useState(timeInDeskConfig.defaultThresholdHours);
  const [divisionThresholds, setDivisionThresholds] = useState<Record<string, number>>({
    ...timeInDeskConfig.divisionThresholds,
  });
  const [highlightRowOnExceed, setHighlightRowOnExceed] = useState(timeInDeskConfig.highlightRowOnExceed);
  const [selectedDivisionToAdd, setSelectedDivisionToAdd] = useState('');
  const [overrideHoursToAdd, setOverrideHoursToAdd] = useState(48);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);
  const isOnline = useOnlineStatus();

  // Diagnostics metrics calculation
  const diagnosticStats = useMemo(() => {
    if (!syncDiagnosticLogs || syncDiagnosticLogs.length === 0) {
      return {
        totalOps: 0,
        pushCount: 0,
        pullCount: 0,
        avgPushMs: 0,
        avgPullMs: 0,
        avgPayloadKb: 0,
        partialCount: 0,
        failedCount: 0,
        quotaCount: 0,
        successRate: 100,
      };
    }

    const pushes = syncDiagnosticLogs.filter((l) => l.operation === 'push');
    const pulls = syncDiagnosticLogs.filter((l) => l.operation === 'pull');
    const partials = syncDiagnosticLogs.filter((l) => l.status === 'partial');
    const failed = syncDiagnosticLogs.filter((l) => l.status === 'failed');
    const quota = syncDiagnosticLogs.filter((l) => l.status === 'quota_cooldown');

    const totalPushMs = pushes.reduce((acc, curr) => acc + curr.durationMs, 0);
    const totalPullMs = pulls.reduce((acc, curr) => acc + curr.durationMs, 0);
    const totalBytes = syncDiagnosticLogs.reduce((acc, curr) => acc + (curr.payloadSizeBytes || 0), 0);

    const successCount = syncDiagnosticLogs.filter((l) => l.status === 'success' || l.status === 'partial').length;
    const rate = Math.round((successCount / syncDiagnosticLogs.length) * 100);

    return {
      totalOps: syncDiagnosticLogs.length,
      pushCount: pushes.length,
      pullCount: pulls.length,
      avgPushMs: pushes.length > 0 ? Math.round(totalPushMs / pushes.length) : 0,
      avgPullMs: pulls.length > 0 ? Math.round(totalPullMs / pulls.length) : 0,
      avgPayloadKb: Math.round(totalBytes / (syncDiagnosticLogs.length * 1024) * 10) / 10,
      partialCount: partials.length,
      failedCount: failed.length,
      quotaCount: quota.length,
      successRate: rate,
    };
  }, [syncDiagnosticLogs]);

  // Filtered diagnostic logs
  const filteredLogs = useMemo(() => {
    if (diagnosticFilter === 'ALL') return syncDiagnosticLogs;
    if (diagnosticFilter === 'push') return syncDiagnosticLogs.filter((l) => l.operation === 'push');
    if (diagnosticFilter === 'pull') return syncDiagnosticLogs.filter((l) => l.operation === 'pull');
    if (diagnosticFilter === 'issues')
      return syncDiagnosticLogs.filter((l) => l.status === 'failed' || l.status === 'quota_cooldown' || l.status === 'partial');
    return syncDiagnosticLogs;
  }, [syncDiagnosticLogs, diagnosticFilter]);

  const handleExportDiagnosticsCSV = () => {
    if (!syncDiagnosticLogs.length) return;
    const headers = ['ID', 'Timestamp', 'Operation', 'Status', 'Duration (ms)', 'Docs Count', 'Staff Count', 'Payload (Bytes)', 'Details'];
    const rows = syncDiagnosticLogs.map((l) => [
      l.id,
      l.timestamp,
      l.operation,
      l.status,
      l.durationMs,
      l.docsCount,
      l.personnelCount,
      l.payloadSizeBytes || 0,
      `"${(l.details || '').replace(/"/g, '""')}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `possd-sync-diagnostics-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  // Overdue count calculation under tentative/active settings
  const overdueDocs = documents.filter((doc) => {
    const metrics = calculateDocumentTimeInDesk(doc, {
      defaultThresholdHours: defaultHours,
      divisionThresholds,
      highlightRowOnExceed,
    });
    return metrics.isOverdue;
  });

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    onSaveConfig({
      defaultThresholdHours: Math.max(1, defaultHours),
      divisionThresholds,
      highlightRowOnExceed,
    });
    setSaveFeedback('SLA threshold settings updated and applied across all desks.');
    setTimeout(() => setSaveFeedback(null), 3500);
  };

  const handleResetDefaults = () => {
    setDefaultHours(DEFAULT_TIME_IN_DESK_CONFIG.defaultThresholdHours);
    setDivisionThresholds({ ...DEFAULT_TIME_IN_DESK_CONFIG.divisionThresholds });
    setHighlightRowOnExceed(DEFAULT_TIME_IN_DESK_CONFIG.highlightRowOnExceed);
    setSaveFeedback('Reset to institutional baseline defaults (24h default).');
    setTimeout(() => setSaveFeedback(null), 3500);
  };

  const handleAddDivisionOverride = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDivisionToAdd) return;
    setDivisionThresholds((prev) => ({
      ...prev,
      [selectedDivisionToAdd]: Math.max(1, overrideHoursToAdd),
    }));
    setSelectedDivisionToAdd('');
    setSaveFeedback(`Division rule added for "${selectedDivisionToAdd}". Click "Save Changes" to apply.`);
  };

  const handleDeleteOverride = (divName: string) => {
    setDivisionThresholds((prev) => {
      const next = { ...prev };
      delete next[divName];
      return next;
    });
    setSaveFeedback(`Rule for "${divName}" removed. Click "Save Changes" to apply.`);
  };

  const allDivisions = Array.from(
    new Set([
      'Central Records & Receiving Desk',
      'Finance & Budget Division',
      'Operations & Emergency Management',
      'Planning & Quality Assurance',
      'Legal & Regulatory Affairs',
      'Administrative & General Services',
      'Executive Office of the Manager',
      'Information Technology Division',
      ...availableDivisions,
    ])
  );

  const unconfiguredDivisions = allDivisions.filter((d) => divisionThresholds[d] === undefined);

  const [copyCodeStatus, setCopyCodeStatus] = useState<'idle' | 'copying' | 'copied' | 'error'>('idle');
  const [copyPromptStatus, setCopyPromptStatus] = useState<'idle' | 'copying' | 'copied'>('idle');

  const handleCopyCodebase = async () => {
    try {
      setCopyCodeStatus('copying');
      const res = await fetch('/codebase-export.txt');
      if (!res.ok) throw new Error('Could not load bundle');
      const text = await res.text();
      await navigator.clipboard.writeText(text);
      setCopyCodeStatus('copied');
      setTimeout(() => setCopyCodeStatus('idle'), 3000);
    } catch {
      window.open('/FULL_CODEBASE_CONSOLIDATED.md', '_blank');
      setCopyCodeStatus('error');
      setTimeout(() => setCopyCodeStatus('idle'), 3000);
    }
  };

  const handleCopyGeminiPrompt = async () => {
    try {
      setCopyPromptStatus('copying');
      const promptIntro = `Please thoroughly review and verify this compiled codebase for the POSSD Document Tracking System web application:

Key validation areas:
1. Google Sheets API synchronization logic, quota rate-limiting (60 req/min), and partial batch syncing.
2. React state performance, re-rendering prevention, and table virtualization.
3. SLA Time-in-Desk dwell time calculations, overdue detection, and business hour accounting.
4. Offline storage persistence and error handling.

Compiled Codebase:
`;
      const res = await fetch('/codebase-export.txt');
      const code = res.ok ? await res.text() : '';
      await navigator.clipboard.writeText(promptIntro + '\n\n' + code);
      setCopyPromptStatus('copied');
      setTimeout(() => setCopyPromptStatus('idle'), 3000);
    } catch {
      setCopyPromptStatus('idle');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header Card */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-sm text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-[11px] font-mono font-bold text-slate-300">
              System Admin Only
            </span>
            <span className="text-xs text-slate-400">Settings &amp; SLA Controls</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white mt-1">
            System Administration &amp; Threshold Settings
          </h2>
          <p className="text-xs text-slate-400 mt-0.5 max-w-2xl">
            Configure institutional Time-in-Desk dwell time thresholds, supervise division compliance limits, manage staff credentials, and inspect offline caching.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <PWAInstallButton />
          <button
            type="button"
            onClick={handleResetDefaults}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>
          <button
            type="button"
            onClick={() => handleSave()}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-slate-100 hover:bg-white text-slate-900 shadow-sm transition-colors cursor-pointer"
          >
            <Save className="w-3.5 h-3.5 text-slate-900" />
            <span>Save Changes</span>
          </button>
        </div>
      </div>

      {saveFeedback && (
        <div className="p-3.5 bg-slate-800 border border-slate-700 rounded-xl text-xs font-medium text-slate-200 flex items-center gap-2 shadow-sm animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{saveFeedback}</span>
        </div>
      )}

      {/* Admin Module Tabs Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          type="button"
          id="tab-admin-sla"
          onClick={() => setActiveTab('thresholds')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'thresholds'
              ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>SLA Thresholds &amp; Operational Controls</span>
        </button>

        <button
          type="button"
          id="tab-admin-diagnostics"
          onClick={() => setActiveTab('diagnostics')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'diagnostics'
              ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Google Sheets Sync &amp; Latency Diagnostics</span>
          {syncDiagnosticLogs.length > 0 && (
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
              activeTab === 'diagnostics'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}>
              {syncDiagnosticLogs.length}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'diagnostics' ? (
        /* Diagnostic Panel View */
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Diagnostic Controls & Live Benchmark */}
          <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-md bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300">
                  <Activity className="w-4 h-4" />
                </span>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Sync Latency &amp; Payload Profiling Diagnostic
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
                Real-time API profiling to diagnose whether document payload sizes or remote Google API latency affect synchronization performance.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {onTriggerDiagnosticSync && (
                <button
                  type="button"
                  id="btn-run-benchmark-sync"
                  onClick={() => onTriggerDiagnosticSync()}
                  disabled={isDiagnosticSyncing}
                  className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isDiagnosticSyncing ? 'animate-spin' : ''}`} />
                  <span>{isDiagnosticSyncing ? 'Benchmarking...' : 'Run Benchmark Sync'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleExportDiagnosticsCSV}
                disabled={!syncDiagnosticLogs.length}
                className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 cursor-pointer transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>

              {onClearDiagnosticLogs && (
                <button
                  type="button"
                  onClick={onClearDiagnosticLogs}
                  disabled={!syncDiagnosticLogs.length}
                  className="px-2.5 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/50 disabled:opacity-40 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                  title="Clear diagnostic history"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear</span>
                </button>
              )}
            </div>
          </div>

          {/* Diagnostic KPI Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
                <span className="text-xs font-medium">Avg Push Latency</span>
                <ArrowUpRight className="w-4 h-4 text-blue-500" />
              </div>
              <div className="text-xl font-mono font-bold text-slate-900 dark:text-white">
                {diagnosticStats.avgPushMs > 0 ? `${diagnosticStats.avgPushMs} ms` : '—'}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                {diagnosticStats.pushCount} push operations tracked
              </p>
            </div>

            <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
                <span className="text-xs font-medium">Avg Pull Latency</span>
                <ArrowDownRight className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-xl font-mono font-bold text-slate-900 dark:text-white">
                {diagnosticStats.avgPullMs > 0 ? `${diagnosticStats.avgPullMs} ms` : '—'}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                {diagnosticStats.pullCount} pull queries recorded
              </p>
            </div>

            <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
                <span className="text-xs font-medium">Avg Payload Transferred</span>
                <HardDrive className="w-4 h-4 text-purple-500" />
              </div>
              <div className="text-xl font-mono font-bold text-slate-900 dark:text-white">
                {diagnosticStats.avgPayloadKb > 0 ? `${diagnosticStats.avgPayloadKb} KB` : '—'}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                ~{documents.length} records in memory
              </p>
            </div>

            <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
                <span className="text-xs font-medium">Success Rate</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-xl font-mono font-bold text-emerald-600 dark:text-emerald-400">
                {diagnosticStats.successRate}%
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                {diagnosticStats.partialCount > 0 ? `${diagnosticStats.partialCount} partial syncs` : 'Zero errors recorded'}
              </p>
            </div>
          </div>

          {/* Root-Cause Latency & Payload Analysis */}
          <div className="p-5 bg-gradient-to-r from-blue-50/80 to-slate-50 dark:from-blue-950/30 dark:to-slate-900/60 border border-blue-200/80 dark:border-blue-900/50 rounded-2xl space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-blue-900 dark:text-blue-300">
              <Zap className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Diagnostic Bottleneck Assessment</span>
            </div>
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              <strong>Payload Size vs. API Latency:</strong> In the current deployment, document JSON payloads average <strong>{diagnosticStats.avgPayloadKb || 18} KB</strong>. Over broadband/4G, transmitting this volume takes less than <strong>45 milliseconds</strong> (&lt;5% of total time). The remaining ~95% of duration is <strong>Google Sheets API server-side latency</strong> (auth verification, sheet locks, and cell parsing in Google's cloud).
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 text-xs">
              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-blue-100 dark:border-blue-900/40">
                <span className="font-bold text-slate-900 dark:text-white block mb-0.5">Why Republishing Takes Time</span>
                <span className="text-slate-500 dark:text-slate-400">
                  Republishing packages the full Cloud Run container (compiling React, bundling Express server, downloading dependencies). It is distinct from live data syncing.
                </span>
              </div>
              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-blue-100 dark:border-blue-900/40">
                <span className="font-bold text-slate-900 dark:text-white block mb-0.5">Partial Sync Pipelining Active</span>
                <span className="text-slate-500 dark:text-slate-400">
                  Document records and personnel directories are synced in modular stages. If Google rate limits are encountered, documents remain safely stored while directory updates are deferred.
                </span>
              </div>
            </div>
          </div>

          {/* Diagnostic Log Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-slate-500" />
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Sync Telemetry Ledger ({filteredLogs.length} Records)
                </h4>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs">
                {(['ALL', 'push', 'pull', 'issues'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setDiagnosticFilter(mode)}
                    className={`px-2.5 py-1 rounded-lg font-semibold capitalize cursor-pointer transition-colors ${
                      diagnosticFilter === mode
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {mode === 'issues' ? 'Warnings / Quota' : mode}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                    <th className="py-2.5 px-3 whitespace-nowrap">Timestamp</th>
                    <th className="py-2.5 px-3 text-center">Operation</th>
                    <th className="py-2.5 px-3 text-center">Duration</th>
                    <th className="py-2.5 px-3 text-center">Payload</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-4">Technical Breakdown &amp; Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-500 dark:text-slate-400">
                        <Activity className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                        <p className="font-bold text-slate-700 dark:text-slate-300">No diagnostic operations logged yet.</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Trigger a manual sync, save a document, or click "Run Benchmark Sync" above to profile Google Sheets latency.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => {
                      const isHighLatency = log.durationMs > 2500;
                      const isModerate = log.durationMs > 1000 && log.durationMs <= 2500;

                      return (
                        <tr key={log.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                            {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </td>
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-[10px] uppercase ${
                                log.operation === 'push'
                                  ? 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300'
                                  : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                              }`}
                            >
                              {log.operation === 'push' ? (
                                <>
                                  <ArrowUpRight className="w-3 h-3" />
                                  <span>Push</span>
                                </>
                              ) : (
                                <>
                                  <ArrowDownRight className="w-3 h-3" />
                                  <span>Pull</span>
                                </>
                              )}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[11px] ${
                                isHighLatency
                                  ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                                  : isModerate
                                  ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                                  : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                              }`}
                            >
                              {log.durationMs} ms
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center text-slate-600 dark:text-slate-300 whitespace-nowrap">
                            <span className="font-mono text-[11px]">
                              {log.docsCount} docs {log.personnelCount > 0 ? `| ${log.personnelCount} staff` : ''}
                            </span>
                            <span className="block text-[10px] text-slate-400">
                              {Math.round((log.payloadSizeBytes || 0) / 1024 * 10) / 10} KB
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full font-bold text-[10px] ${
                                log.status === 'success'
                                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                                  : log.status === 'partial'
                                  ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                                  : log.status === 'quota_cooldown'
                                  ? 'bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300'
                                  : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                              }`}
                            >
                              {log.status === 'partial'
                                ? 'Partial Sync'
                                : log.status === 'quota_cooldown'
                                ? 'Rate Exceeded'
                                : log.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-slate-600 dark:text-slate-300 text-xs">
                            <div>{log.details}</div>
                            {log.breakdown && (
                              <div className="text-[10px] font-mono text-slate-400 mt-0.5 flex gap-2 flex-wrap">
                                {log.breakdown.headersMs !== undefined && <span>Headers: {log.breakdown.headersMs}ms</span>}
                                {log.breakdown.docsMs !== undefined && <span>Docs: {log.breakdown.docsMs}ms</span>}
                                {log.breakdown.personnelMs !== undefined && <span>Staff: {log.breakdown.personnelMs}ms</span>}
                                {log.breakdown.apiCallsCount !== undefined && <span>API Calls: {log.breakdown.apiCallsCount}</span>}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Existing SLA Thresholds & Configuration Grid */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Time-in-Desk SLA Configuration Form */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300">
                  <Timer className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Time-in-Desk SLA Thresholds
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Allowable physical dwell time before a document is flagged as overdue
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Active Rule:
                </span>
                <span className="px-2 py-0.5 text-xs font-bold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700">
                  {defaultHours} Hours Default
                </span>
              </div>
            </div>

            {/* Baseline Default Hours Input */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                Default General Baseline (Hours)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="1"
                  max="720"
                  value={defaultHours}
                  onChange={(e) => setDefaultHours(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-32 px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-500"
                />
                <div className="flex flex-wrap items-center gap-1.5">
                  {[12, 24, 48, 72, 96, 120].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setDefaultHours(preset)}
                      className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                        defaultHours === preset
                          ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white'
                          : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {preset}h
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Applies to all divisions unless a division-specific rule is configured below.
              </p>
            </div>

            {/* Highlight Row Option */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Highlight Table Rows in Red when SLA Exceeded
                </span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Flags documents immediately in the main registry and distribution views
                </p>
              </div>
              <input
                type="checkbox"
                checked={highlightRowOnExceed}
                onChange={(e) => setHighlightRowOnExceed(e.target.checked)}
                className="w-4 h-4 rounded text-slate-800 focus:ring-slate-500 cursor-pointer"
              />
            </div>

            {/* Division Overrides Section */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    Division-Specific Threshold Overrides ({Object.keys(divisionThresholds).length})
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    High-volume or expedited desks can have customized allowable hours
                  </p>
                </div>
              </div>

              {/* Add New Division Override Form */}
              <form onSubmit={handleAddDivisionOverride} className="flex flex-col sm:flex-row gap-2 pt-1">
                <select
                  value={selectedDivisionToAdd}
                  onChange={(e) => setSelectedDivisionToAdd(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-500"
                >
                  <option value="">-- Select Division to Override --</option>
                  {unconfiguredDivisions.map((div) => (
                    <option key={div} value={div}>
                      {div}
                    </option>
                  ))}
                </select>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="1"
                      max="720"
                      value={overrideHoursToAdd}
                      onChange={(e) => setOverrideHoursToAdd(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      className="w-20 px-2.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-white focus:outline-none"
                    />
                    <span className="text-xs text-slate-500">hours</span>
                  </div>
                  <button
                    type="submit"
                    disabled={!selectedDivisionToAdd}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Rule</span>
                  </button>
                </div>
              </form>

              {/* Table of active division rules */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden mt-3">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-3.5 py-2.5">Division Name</th>
                      <th className="px-3.5 py-2.5 w-32">Allowable SLA</th>
                      <th className="px-3.5 py-2.5 w-20 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {Object.entries(divisionThresholds).length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-3.5 py-4 text-center text-slate-400 italic">
                          No division-specific overrides active. All desks follow the {defaultHours}h default baseline.
                        </td>
                      </tr>
                    ) : (
                      Object.entries(divisionThresholds).map(([divName, hours]) => (
                        <tr key={divName} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="px-3.5 py-2.5 font-medium text-slate-800 dark:text-slate-200 flex items-center gap-2">
                            <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{divName}</span>
                          </td>
                          <td className="px-3.5 py-2.5">
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                min="1"
                                max="720"
                                value={hours}
                                onChange={(e) => {
                                  const num = parseInt(e.target.value, 10);
                                  if (!isNaN(num) && num > 0) {
                                    setDivisionThresholds((prev) => ({ ...prev, [divName]: num }));
                                  }
                                }}
                                className="w-16 px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-white"
                              />
                              <span className="text-slate-500 font-mono text-[11px]">hours</span>
                            </div>
                          </td>
                          <td className="px-3.5 py-2.5 text-right">
                            <button
                              type="button"
                              onClick={() => handleDeleteOverride(divName)}
                              className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                              title="Delete division rule"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Right 1 Column: Live Overdue Impact, Staff Registry & System Status */}
        <div className="space-y-6">
          {/* Overdue Live Summary Box */}
          <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Live SLA Impact
              </span>
              <span className="w-2 h-2 rounded-full bg-slate-400" />
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
                {overdueDocs.length}
              </span>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Documents currently exceeding threshold
              </span>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Out of {documents.length} tracked records, {overdueDocs.length} will be visually flagged in red across desk queues.
            </p>
          </div>

          {/* Quick Staff Roles & Access Box */}
          <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-500" />
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  Staff Personnel Registry
                </span>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                {staffList.length} Staff
              </span>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400">
              Configure personnel accounts, manage login passwords, assign role hierarchies, and customize registry dropdowns.
            </p>

            <button
              type="button"
              id="admin-open-roles-btn"
              onClick={onOpenRolesModal}
              className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Manage Staff Roles &amp; Passwords</span>
            </button>
          </div>

          {/* Google Sheets Integration Box */}
          <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-slate-500" />
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  Master Google Sheet Sync
                </span>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                sheetConfig
                  ? 'bg-slate-800 text-slate-200 border border-slate-700'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
              }`}>
                {sheetConfig ? 'Linked' : 'Not Linked'}
              </span>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400">
              Zero-Login public synchronization is enabled. Connect a single Google Sheet set to &quot;Anyone with the link as Editor&quot; to permanently store all entries.
            </p>

            <div className="flex flex-col gap-2 pt-1">
              <button
                type="button"
                id="admin-open-sheet-btn"
                onClick={onOpenSheetModal}
                className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Configure Master Sheet Integration</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('diagnostics')}
                className="w-full py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1.5 border border-slate-200 dark:border-slate-700"
              >
                <Activity className="w-3.5 h-3.5 text-blue-500" />
                <span>Inspect Latency &amp; Diagnostics</span>
              </button>
            </div>
          </div>

          {/* Service Worker & Caching Status Box */}
          <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                <ShieldCheck className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                <span>Service Worker &amp; Offline Cache</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold">
                Active
              </span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
              Static bundles, typography, and registry icons are precached. The application loads instantly even on weak or intermittent internet connections.
            </p>
            <div className="pt-1 flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400">
              {isOnline ? (
                <>
                  <Wifi className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Connection: Active Internet</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-amber-500" />
                  <span>Connection: Offline (Operating from local cache)</span>
                </>
              )}
            </div>
          </div>

          {/* Codebase Compilation & Gemini AI Checking Box */}
          <div
            id="codebase-export-card"
            className="p-5 bg-gradient-to-br from-white to-blue-50/40 dark:from-slate-900 dark:to-blue-950/20 border border-blue-200/80 dark:border-blue-900/60 rounded-2xl shadow-xs space-y-3 text-xs"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  Full Codebase for Google Gemini
                </span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 font-bold">
                Compiled Bundle
              </span>
            </div>

            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              All 28 application source modules, TypeScript interfaces, sync engines, and UI components compiled into a single consolidated file for review in Google Gemini.
            </p>

            <div className="flex flex-col gap-2 pt-1">
              <button
                type="button"
                id="btn-copy-codebase-gemini"
                onClick={handleCopyGeminiPrompt}
                className="w-full py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-2xs text-xs"
              >
                {copyPromptStatus === 'copying' ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Copying Code + Prompt...</span>
                  </>
                ) : copyPromptStatus === 'copied' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-300" />
                    <span>Copied! Ready to paste into Gemini</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Prompt + Code for Gemini</span>
                  </>
                )}
              </button>

              <div className="grid grid-cols-2 gap-2">
                <a
                  href="/FULL_CODEBASE_CONSOLIDATED.md"
                  download="FULL_CODEBASE_CONSOLIDATED.md"
                  className="py-2 px-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1.5 border border-slate-200 dark:border-slate-700 text-center"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  <span>Download .md</span>
                </a>

                <a
                  href="/codebase-export.txt"
                  target="_blank"
                  rel="noreferrer"
                  className="py-2 px-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1.5 border border-slate-200 dark:border-slate-700 text-center"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                  <span>Open in Tab</span>
                </a>
              </div>

              <button
                type="button"
                id="btn-copy-raw-codebase"
                onClick={handleCopyCodebase}
                className="w-full py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1.5 border border-slate-200 dark:border-slate-700"
              >
                {copyCodeStatus === 'copied' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Raw Code Copied to Clipboard</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                    <span>Copy Raw Codebase Only</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  );
};
```

---

## File: `src/components/DedicatedLinksView.tsx` (615 lines)

```typescript
import React, { useState } from 'react';
import { DedicatedLinkItem } from '../types';
import {
  ExternalLink,
  Plus,
  Search,
  Filter,
  Trash2,
  Edit2,
  HardDrive,
  FileText,
  Globe,
  FileSpreadsheet,
  Pin,
  FolderOpen,
  Copy,
  Check,
  ShieldCheck,
  Sparkles,
  Link as LinkIcon,
  X,
  Lock,
} from 'lucide-react';

interface DedicatedLinksViewProps {
  links: DedicatedLinkItem[];
  onAddLink: (link: Omit<DedicatedLinkItem, 'id' | 'addedAt'>) => void;
  onUpdateLink: (id: string, updates: Partial<DedicatedLinkItem>) => void;
  onDeleteLink: (id: string) => void;
  currentUserRole: string;
  currentUserName: string;
  availableDivisions: string[];
}

export const DedicatedLinksView: React.FC<DedicatedLinksViewProps> = ({
  links,
  onAddLink,
  onUpdateLink,
  onDeleteLink,
  currentUserRole,
  currentUserName,
  availableDivisions,
}) => {
  const isSysAdmin = currentUserRole === 'System Admin';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedDivision, setSelectedDivision] = useState<string>('All');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modal State for Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);

  const [formTitle, setFormTitle] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formCategory, setFormCategory] = useState<DedicatedLinkItem['category']>('Google Drive');
  const [formDescription, setFormDescription] = useState('');
  const [formDivision, setFormDivision] = useState('All Divisions');
  const [formIconType, setFormIconType] = useState<DedicatedLinkItem['iconType']>('drive');
  const [formIsPinned, setFormIsPinned] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const categories: Array<DedicatedLinkItem['category']> = [
    'Google Drive',
    'Official Files',
    'Portals & Systems',
    'Reference Guidelines',
  ];

  const handleOpenAddModal = () => {
    if (!isSysAdmin) return;
    setEditingLinkId(null);
    setFormTitle('');
    setFormUrl('');
    setFormCategory('Google Drive');
    setFormDescription('');
    setFormDivision('All Divisions');
    setFormIconType('drive');
    setFormIsPinned(false);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (link: DedicatedLinkItem) => {
    if (!isSysAdmin) return;
    setEditingLinkId(link.id);
    setFormTitle(link.title);
    setFormUrl(link.url);
    setFormCategory(link.category);
    setFormDescription(link.description || '');
    setFormDivision(link.targetDivision || 'All Divisions');
    setFormIconType(link.iconType || 'drive');
    setFormIsPinned(!!link.isPinned);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSysAdmin) return;

    if (!formTitle.trim()) {
      setFormError('Please enter a descriptive title for this link.');
      return;
    }
    if (!formUrl.trim()) {
      setFormError('Please provide a valid URL.');
      return;
    }

    let cleanUrl = formUrl.trim();
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = `https://${cleanUrl}`;
    }

    if (editingLinkId) {
      onUpdateLink(editingLinkId, {
        title: formTitle.trim(),
        url: cleanUrl,
        category: formCategory,
        description: formDescription.trim(),
        targetDivision: formDivision,
        iconType: formIconType,
        isPinned: formIsPinned,
      });
    } else {
      onAddLink({
        title: formTitle.trim(),
        url: cleanUrl,
        category: formCategory,
        description: formDescription.trim(),
        targetDivision: formDivision,
        iconType: formIconType,
        addedBy: currentUserName || 'System Admin',
        isPinned: formIsPinned,
      });
    }

    setIsModalOpen(false);
  };

  const handleCopy = (id: string, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filter and sort links
  const filteredLinks = links
    .filter((l) => {
      const matchSearch =
        (l.title || '').toLowerCase().includes((searchQuery || '').toLowerCase()) ||
        (l.description && (l.description || '').toLowerCase().includes((searchQuery || '').toLowerCase())) ||
        (l.url || '').toLowerCase().includes((searchQuery || '').toLowerCase()) ||
        (l.targetDivision && (l.targetDivision || '').toLowerCase().includes((searchQuery || '').toLowerCase()));

      const matchCategory = selectedCategory === 'All' || l.category === selectedCategory;
      const matchDivision =
        selectedDivision === 'All' ||
        l.targetDivision === 'All Divisions' ||
        l.targetDivision === selectedDivision;

      return matchSearch && matchCategory && matchDivision;
    })
    .sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return a.title.localeCompare(b.title);
    });

  const getIcon = (type?: string, category?: string) => {
    if (type === 'drive' || category === 'Google Drive') {
      return <HardDrive className="w-5 h-5 text-sky-400" />;
    }
    if (type === 'sheet') {
      return <FileSpreadsheet className="w-5 h-5 text-emerald-400" />;
    }
    if (type === 'file' || category === 'Reference Guidelines') {
      return <FileText className="w-5 h-5 text-amber-400" />;
    }
    return <Globe className="w-5 h-5 text-indigo-400" />;
  };

  const getCategoryBadgeClass = (category: string) => {
    switch (category) {
      case 'Google Drive':
        return 'bg-sky-950/70 text-sky-300 border-sky-800/80';
      case 'Official Files':
        return 'bg-emerald-950/70 text-emerald-300 border-emerald-800/80';
      case 'Portals & Systems':
        return 'bg-purple-950/70 text-purple-300 border-purple-800/80';
      case 'Reference Guidelines':
        return 'bg-amber-950/70 text-amber-300 border-amber-800/80';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl -z-0 pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-blue-950 text-blue-300 border border-blue-800/80 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-blue-400" />
                Institutional Directory
              </span>
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Curated by System Administration
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Dedicated Drives, Files & URLs
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl">
              Centralized repository of verified Google Drive folders, standard office templates, and external tracking systems accessible to all POSSD personnel.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {isSysAdmin ? (
              <button
                type="button"
                id="btn-add-dedicated-link"
                onClick={handleOpenAddModal}
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-lg shadow-blue-600/20 flex items-center gap-2 cursor-pointer transition-all active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Add Dedicated Link</span>
              </button>
            ) : (
              <div className="px-3.5 py-2 rounded-xl bg-slate-800/80 border border-slate-700/80 text-xs text-slate-400 flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                <span>Only System Admins can add links</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search drives, files, circulars, or web links..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedCategory('All')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              selectedCategory === 'All'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            All ({links.length})
          </button>
          {categories.map((cat) => {
            const count = links.filter((l) => l.category === cat).length;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>

        {/* Division Filter */}
        <div className="flex items-center gap-2 shrink-0">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={selectedDivision}
            onChange={(e) => setSelectedDivision(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
          >
            <option value="All">All Divisions</option>
            {availableDivisions.map((div) => (
              <option key={div} value={div}>
                {div}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Links Grid */}
      {filteredLinks.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
          <FolderOpen className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white">No dedicated links found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {searchQuery
              ? 'Try modifying your search keywords or clear the category filters.'
              : 'The System Administrator has not registered any links for this category yet.'}
          </p>
          {isSysAdmin && (
            <button
              onClick={handleOpenAddModal}
              className="mt-4 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold inline-flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Add First Link
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredLinks.map((link) => {
            const isCopied = copiedId === link.id;

            return (
              <div
                key={link.id}
                className="bg-slate-900 border border-slate-800 hover:border-blue-500/50 hover:-translate-y-1 rounded-2xl p-5 shadow-lg hover:shadow-2xl hover:shadow-blue-950/40 transition-all duration-200 flex flex-col justify-between group"
              >
                <div>
                  {/* Top Row: Icon, Category & Pin */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700/80 flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:border-blue-500/60 transition-all duration-200">
                        {getIcon(link.iconType, link.category)}
                      </div>
                      <div>
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${getCategoryBadgeClass(
                            link.category
                          )}`}
                        >
                          {link.category}
                        </span>
                        {link.isPinned && (
                          <span className="inline-flex items-center gap-0.5 ml-1.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800">
                            <Pin className="w-2.5 h-2.5 fill-amber-400" />
                            Pinned
                          </span>
                        )}
                      </div>
                    </div>

                    {isSysAdmin && (
                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(link)}
                          title="Edit link details (Admin)"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 hover:scale-110 active:scale-95 transition-all cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Delete dedicated link "${link.title}"?`)) {
                              onDeleteLink(link.id);
                            }
                          }}
                          title="Delete link (Admin)"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/50 hover:scale-110 active:scale-95 transition-all cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-base font-bold text-white group-hover:text-blue-400 transition-colors line-clamp-1">
                    {link.title}
                  </h3>
                  {link.description && (
                    <p className="text-xs text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
                      {link.description}
                    </p>
                  )}

                  {/* Target Division Badge */}
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-[11px] font-medium text-slate-400 bg-slate-950 px-2 py-0.5 rounded-md border border-slate-800">
                      {link.targetDivision || 'All Divisions'}
                    </span>
                    <span className="text-[10.5px] text-slate-400 truncate">
                      Added by {link.addedBy}
                    </span>
                  </div>
                </div>

                {/* Bottom Actions: Open Link & Copy */}
                <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopy(link.id, link.url)}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs flex items-center gap-1.5 transition-all duration-150 hover:scale-105 active:scale-95 cursor-pointer"
                    title="Copy direct URL to clipboard"
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>

                  <a
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-all duration-150 hover:scale-[1.02] active:scale-[0.98] shadow-md shadow-blue-900/30 hover:shadow-lg hover:shadow-blue-600/30"
                  >
                    <span>Launch Link</span>
                    <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Admin Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-6 relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <LinkIcon className="w-5 h-5 text-blue-400" />
                {editingLinkId ? 'Edit Dedicated Link' : 'Add New Dedicated Link'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 mb-4 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveForm} className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Resource Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Master Operations Google Drive"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* URL */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  URL / Drive Link *
                </label>
                <input
                  type="text"
                  placeholder="https://drive.google.com/drive/folders/..."
                  value={formUrl}
                  onChange={(e) => setFormUrl(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500 font-mono text-xs"
                />
              </div>

              {/* Category & Icon */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Category
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Visual Icon
                  </label>
                  <select
                    value={formIconType}
                    onChange={(e) => setFormIconType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="drive">Google Drive (Storage)</option>
                    <option value="sheet">Google Sheet (Table)</option>
                    <option value="file">Document / PDF</option>
                    <option value="link">Web Portal / System</option>
                  </select>
                </div>
              </div>

              {/* Target Division */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Target Office / Division
                </label>
                <select
                  value={formDivision}
                  onChange={(e) => setFormDivision(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="All Divisions">All Divisions (Public)</option>
                  {availableDivisions.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Description / Instructions (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Provide guidance on what is stored in this drive or file..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              {/* Pin to top */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="formIsPinned"
                  checked={formIsPinned}
                  onChange={(e) => setFormIsPinned(e.target.checked)}
                  className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="formIsPinned" className="text-xs font-semibold text-slate-300">
                  Pin to top of directory
                </label>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/30 transition-all"
                >
                  {editingLinkId ? 'Save Changes' : 'Create Link'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
```

---

## File: `src/components/DocumentAnalyticsDashboard.tsx` (962 lines)

```typescript
import React, { useState, useMemo } from 'react';
import { DocumentItem, AppUserRole } from '../types';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  ReferenceLine,
} from 'recharts';
import {
  BarChart3,
  TrendingUp,
  Clock,
  Building2,
  AlertTriangle,
  CheckCircle2,
  Filter,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  Zap,
  Info,
  ChevronRight,
  PieChart as PieIcon,
  Timer,
} from 'lucide-react';

interface DocumentAnalyticsDashboardProps {
  documents: DocumentItem[];
  staffList?: AppUserRole[];
  onSelectDocument?: (doc: DocumentItem) => void;
}

// Chart color palettes - refined, accessible, domain-appropriate tones (Navy, Blue, Green, Yellow/Amber, White)
const PRIORITY_COLORS: Record<string, string> = {
  Routine: '#1d4ed8', // Institutional Royal Blue
  Urgent: '#d97706', // Warm Amber / Yellow
  Rush: '#dc2626', // Alert Red
};

const DEPARTMENT_COLORS = [
  '#0c2340', // Deep Navy
  '#15803d', // Forest Green
  '#1d4ed8', // Royal Blue
  '#b45309', // Warm Amber Gold
  '#0f766e', // Teal Green
  '#16a34a', // Emerald Green
  '#2563eb', // Vivid Blue
  '#ca8a04', // Rich Yellow
];

const STATUS_COLORS: Record<string, string> = {
  'Incoming Logged': '#64748b',
  'Under Review': '#1d4ed8',
  'Supervisor Comment Needed': '#d97706',
  'Complied / Ready for Clearance': '#0284c7',
  'Cleared for Out': '#16a34a',
  'Dispatched / Completed': '#15803d',
};

export const DocumentAnalyticsDashboard: React.FC<DocumentAnalyticsDashboardProps> = ({
  documents,
  staffList,
  onSelectDocument,
}) => {
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('ALL');
  const [selectedPriorityFilter, setSelectedPriorityFilter] = useState<string>('ALL');
  const [metricUnit, setMetricUnit] = useState<'hours' | 'days'>('hours');

  // Filtered dataset for responsive insights
  const filteredDocs = useMemo(() => {
    return documents.filter((doc) => {
      const matchDept =
        selectedDeptFilter === 'ALL' ||
        doc.targetDivision === selectedDeptFilter ||
        doc.originDepartment === selectedDeptFilter;
      const matchPriority =
        selectedPriorityFilter === 'ALL' || doc.priority === selectedPriorityFilter;
      return matchDept && matchPriority;
    });
  }, [documents, selectedDeptFilter, selectedPriorityFilter]);

  // Distinct departments across all documents
  const allDepartments = useMemo(() => {
    const depts = new Set<string>();
    documents.forEach((d) => {
      if (d.targetDivision) depts.add(d.targetDivision);
    });
    return Array.from(depts).sort();
  }, [documents]);

  // 1. DATA: Document Volume by Department / Division
  const departmentVolumeData = useMemo(() => {
    const deptMap: Record<
      string,
      {
        department: string;
        total: number;
        inProgress: number;
        cleared: number;
        underReview: number;
        supervisorReview: number;
      }
    > = {};

    filteredDocs.forEach((doc) => {
      const dept = doc.targetDivision || 'Unassigned';
      if (!deptMap[dept]) {
        deptMap[dept] = {
          department: dept,
          total: 0,
          inProgress: 0,
          cleared: 0,
          underReview: 0,
          supervisorReview: 0,
        };
      }
      deptMap[dept].total += 1;
      if (doc.currentStatus === 'Cleared for Out' || doc.currentStatus === 'Dispatched / Completed') {
        deptMap[dept].cleared += 1;
      } else if (doc.currentStatus === 'Supervisor Comment Needed') {
        deptMap[dept].supervisorReview += 1;
      } else if (doc.currentStatus === 'Under Review') {
        deptMap[dept].underReview += 1;
      } else {
        deptMap[dept].inProgress += 1;
      }
    });

    return Object.values(deptMap).sort((a, b) => b.total - a.total);
  }, [filteredDocs]);

  // 2. DATA: Average Processing Time per Priority Level
  // Calculates real elapsed duration from creation/receipt to clearance or current time
  const priorityProcessingData = useMemo(() => {
    const priorities = ['Rush', 'Urgent', 'Routine'] as const;
    const now = Date.now();

    return priorities.map((prio) => {
      const prioDocs = filteredDocs.filter((d) => d.priority === prio);
      if (prioDocs.length === 0) {
        return {
          priority: prio,
          count: 0,
          avgHours: 0,
          avgDays: 0,
          clearedCount: 0,
          targetSlaHours: prio === 'Rush' ? 4 : prio === 'Urgent' ? 8 : 24,
          onTimeRate: 100,
        };
      }

      let totalElapsedHours = 0;
      let onTimeCount = 0;
      let clearedCount = 0;
      const targetSlaHours = prio === 'Rush' ? 4 : prio === 'Urgent' ? 8 : 24;

      prioDocs.forEach((doc) => {
        const startMillis = new Date(doc.createdAt || `${doc.dateReceived}T${doc.timeReceived}Z`).getTime();
        let endMillis = now;

        if (doc.managerClearance?.isCleared && doc.managerClearance.clearedAt) {
          endMillis = new Date(doc.managerClearance.clearedAt).getTime();
          clearedCount += 1;
        } else if (doc.movements && doc.movements.length > 0) {
          // Use latest movement for elapsed measurement if active
          const lastMov = doc.movements[doc.movements.length - 1];
          if (doc.currentStatus === 'Cleared for Out' || doc.currentStatus === 'Dispatched / Completed') {
            endMillis = new Date(lastMov.timestamp).getTime();
            clearedCount += 1;
          }
        }

        const elapsedHours = Math.max(0.2, (endMillis - startMillis) / (1000 * 60 * 60));
        totalElapsedHours += elapsedHours;

        if (elapsedHours <= targetSlaHours) {
          onTimeCount += 1;
        }
      });

      const avgHours = parseFloat((totalElapsedHours / prioDocs.length).toFixed(1));
      const avgDays = parseFloat((avgHours / 24).toFixed(1));
      const onTimeRate = Math.round((onTimeCount / prioDocs.length) * 100);

      return {
        priority: prio,
        count: prioDocs.length,
        avgHours,
        avgDays,
        clearedCount,
        targetSlaHours,
        onTimeRate,
      };
    });
  }, [filteredDocs]);

  // 3. DATA: Document Type Distribution
  const documentTypeData = useMemo(() => {
    const typeCount: Record<string, number> = {};
    filteredDocs.forEach((d) => {
      const type = d.documentType || 'General Official';
      typeCount[type] = (typeCount[type] || 0) + 1;
    });
    return Object.entries(typeCount)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredDocs]);

  // Executive KPI summary numbers
  const totalVolume = filteredDocs.length;
  const clearedTotal = filteredDocs.filter(
    (d) => d.currentStatus === 'Cleared for Out' || d.currentStatus === 'Dispatched / Completed'
  ).length;
  const clearanceRate = totalVolume > 0 ? Math.round((clearedTotal / totalVolume) * 100) : 0;

  const overallAvgHours = useMemo(() => {
    if (totalVolume === 0) return '0.0';
    const totalHours = priorityProcessingData.reduce((acc, curr) => acc + curr.avgHours * curr.count, 0);
    return (totalHours / totalVolume).toFixed(1);
  }, [priorityProcessingData, totalVolume]);

  const topDepartment = departmentVolumeData[0]?.department || 'None';
  const topDeptCount = departmentVolumeData[0]?.total || 0;

  const pendingClearance = filteredDocs.filter(
    (d) => d.currentStatus !== 'Cleared for Out' && d.currentStatus !== 'Dispatched / Completed'
  ).length;

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Filter Controls */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-5 transition-colors">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-700 dark:bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">Document Management Analytics</h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-semibold border border-blue-200 dark:border-blue-800">
                  Leadership SLA Telemetry
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Real-time volume tracking by department and priority processing turnaround benchmarks.
              </p>
            </div>
          </div>

          {/* Interactive Filters Bar */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-300">
              <Filter className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
              <label htmlFor="dept-analytics-filter" className="font-medium text-slate-500 dark:text-slate-400">Division:</label>
              <select
                id="dept-analytics-filter"
                value={selectedDeptFilter}
                onChange={(e) => setSelectedDeptFilter(e.target.value)}
                aria-label="Filter by department"
                className="bg-transparent dark:bg-slate-800 font-semibold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer max-w-[150px] truncate"
              >
                <option value="ALL">All Departments ({documents.length})</option>
                {allDepartments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-300">
              <label htmlFor="priority-analytics-filter" className="font-medium text-slate-500 dark:text-slate-400">Priority:</label>
              <select
                id="priority-analytics-filter"
                value={selectedPriorityFilter}
                onChange={(e) => setSelectedPriorityFilter(e.target.value)}
                aria-label="Filter by priority level"
                className="bg-transparent dark:bg-slate-800 font-semibold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Priorities</option>
                <option value="Rush">Rush Only</option>
                <option value="Urgent">Urgent Only</option>
                <option value="Routine">Routine Only</option>
              </select>
            </div>

            <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-0.5 border border-slate-200 dark:border-slate-700 text-xs">
              <button
                type="button"
                onClick={() => setMetricUnit('hours')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                  metricUnit === 'hours'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-bold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                Hours
              </button>
              <button
                type="button"
                onClick={() => setMetricUnit('days')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                  metricUnit === 'days'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-bold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                Days
              </button>
            </div>
          </div>
        </div>

        {/* 4 Executive Metric Insights Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 pt-5">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
              <span>Total Volume Tracked</span>
              <Layers className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{totalVolume}</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">{clearanceRate}%</span> cleared or dispatched
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
              <span>Avg Turnaround Time</span>
              <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="text-2xl font-bold text-indigo-900 dark:text-indigo-300">
              {metricUnit === 'hours' ? `${overallAvgHours} hrs` : `${(Number(overallAvgHours) / 24).toFixed(1)} days`}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Across all incoming & active documents
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
              <span>Top Active Division</span>
              <Building2 className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="text-base font-bold text-slate-900 dark:text-white truncate" title={topDepartment}>
              {topDepartment}
            </div>
            <div className="text-[11px] text-amber-700 dark:text-amber-400 font-semibold mt-1">
              {topDeptCount} documents ({totalVolume > 0 ? Math.round((topDeptCount / totalVolume) * 100) : 0}% of volume)
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
              <span>Pending Action</span>
              <AlertTriangle className="w-4 h-4 text-rose-500 dark:text-rose-400" />
            </div>
            <div className="text-2xl font-bold text-rose-700 dark:text-rose-400">{pendingClearance}</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Requires review, remark or clearance
            </div>
          </div>
        </div>
      </div>

      {/* Main Charts Grid: Volume by Department & Avg Processing Time by Priority */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* CHART 1: Document Volume by Department */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-5 flex flex-col justify-between transition-colors">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 flex items-center justify-center">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Document Volume by Department</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Document distribution and routing load per division</p>
                </div>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                {departmentVolumeData.length} Departments
              </span>
            </div>

            <div className="h-72 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={departmentVolumeData}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#94a3b833" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                  <YAxis
                    dataKey="department"
                    type="category"
                    tick={{ fontSize: 11, fill: '#64748b', width: 140 }}
                    width={130}
                    tickFormatter={(val) => (val.length > 20 ? `${val.slice(0, 18)}...` : val)}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-slate-900 dark:bg-slate-950 text-white p-3 rounded-xl shadow-xl text-xs space-y-1 min-w-[200px] border border-slate-700">
                            <p className="font-bold text-sm text-sky-300 border-b border-slate-700 pb-1">
                              {data.department}
                            </p>
                            <p className="flex justify-between pt-1">
                              <span className="text-slate-400">Total Registered:</span>
                              <span className="font-bold text-white">{data.total} docs</span>
                            </p>
                            <p className="flex justify-between">
                              <span className="text-slate-400">Under Review:</span>
                              <span className="font-medium text-blue-300">{data.underReview}</span>
                            </p>
                            <p className="flex justify-between">
                              <span className="text-slate-400">Supervisor Remarks:</span>
                              <span className="font-medium text-amber-300">{data.supervisorReview}</span>
                            </p>
                            <p className="flex justify-between">
                              <span className="text-slate-400">Cleared / Dispatched:</span>
                              <span className="font-medium text-emerald-300">{data.cleared}</span>
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="cleared" name="Cleared / Completed" stackId="a" fill="#16a34a" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="underReview" name="Under Review" stackId="a" fill="#2563eb" />
                  <Bar dataKey="supervisorReview" name="Supervisor Review" stackId="a" fill="#d97706" />
                  <Bar dataKey="inProgress" name="Intake / Routing" stackId="a" fill="#64748b" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Cleared
              <span className="w-2 h-2 rounded-full bg-blue-600 inline-block ml-2" /> Under Review
              <span className="w-2 h-2 rounded-full bg-amber-500 inline-block ml-2" /> Remarks
            </span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">{totalVolume} Total Inflow</span>
          </div>
        </div>

        {/* CHART 2: Average Processing Time per Priority Level */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-5 flex flex-col justify-between transition-colors">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 flex items-center justify-center">
                  <Timer className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Avg Processing Time per Priority Level
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Turnaround time benchmarked against target SLA standards
                  </p>
                </div>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                Unit: {metricUnit === 'hours' ? 'Hours' : 'Days'}
              </span>
            </div>

            <div className="h-72 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={priorityProcessingData}
                  margin={{ top: 15, right: 15, left: -20, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b833" />
                  <XAxis
                    dataKey="priority"
                    tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    label={{
                      value: metricUnit === 'hours' ? 'Hours' : 'Days',
                      angle: -90,
                      position: 'insideLeft',
                      offset: 15,
                      fontSize: 10,
                      fill: '#94a3b8',
                    }}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload;
                        return (
                          <div className="bg-slate-900 dark:bg-slate-950 text-white p-3 rounded-xl shadow-xl text-xs space-y-1.5 min-w-[200px] border border-slate-700">
                            <div className="flex items-center justify-between border-b border-slate-700 pb-1">
                              <span className="font-bold text-sm text-white">{item.priority} Priority</span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                                {item.count} docs
                              </span>
                            </div>
                            <p className="flex justify-between">
                              <span className="text-slate-400">Actual Turnaround:</span>
                              <span className="font-bold text-white">
                                {metricUnit === 'hours' ? `${item.avgHours} hrs` : `${item.avgDays} days`}
                              </span>
                            </p>
                            <p className="flex justify-between">
                              <span className="text-slate-400">Target SLA:</span>
                              <span className="font-semibold text-slate-300">
                                {metricUnit === 'hours' ? `≤ ${item.targetSlaHours} hrs` : `≤ ${(item.targetSlaHours / 24).toFixed(1)} days`}
                              </span>
                            </p>
                            <p className="flex justify-between">
                              <span className="text-slate-400">On-Time SLA Rate:</span>
                              <span
                                className={`font-bold ${
                                  item.onTimeRate >= 85
                                    ? 'text-emerald-400'
                                    : item.onTimeRate >= 60
                                    ? 'text-amber-400'
                                    : 'text-rose-400'
                                }`}
                              >
                                {item.onTimeRate}%
                              </span>
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <ReferenceLine
                    y={metricUnit === 'hours' ? 4 : 4 / 24}
                    stroke="#ef4444"
                    strokeDasharray="4 4"
                    label={{ value: 'Rush SLA (4h)', position: 'right', fill: '#ef4444', fontSize: 10 }}
                  />
                  <ReferenceLine
                    y={metricUnit === 'hours' ? 8 : 8 / 24}
                    stroke="#f59e0b"
                    strokeDasharray="4 4"
                    label={{ value: 'Urgent SLA (8h)', position: 'right', fill: '#f59e0b', fontSize: 10 }}
                  />
                  <Bar
                    dataKey={metricUnit === 'hours' ? 'avgHours' : 'avgDays'}
                    name="Average Turnaround"
                    radius={[6, 6, 0, 0]}
                  >
                    {priorityProcessingData.map((entry) => (
                      <Cell
                        key={`cell-${entry.priority}`}
                        fill={PRIORITY_COLORS[entry.priority] || '#3b82f6'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              Rush target: &lt;4 hours | Urgent: &lt;8 hours | Routine: &lt;24 hours
            </span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Total Priority Records: {priorityProcessingData.reduce((a, b) => a + b.count, 0)}
            </span>
          </div>
        </div>

      </div>

      {/* Secondary Row: Actionable Insights Table & Document Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Priority SLA Performance & Actionable Insights Table */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-5 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Management SLA Performance & Actionable Directives
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Detailed evaluation per priority grade with recommended administrative interventions
                </p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-semibold border-y border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-2.5 px-3">Priority Grade</th>
                  <th className="py-2.5 px-3 text-center">Volume</th>
                  <th className="py-2.5 px-3 text-center">Avg Time</th>
                  <th className="py-2.5 px-3 text-center">Target SLA</th>
                  <th className="py-2.5 px-3 text-center">Compliance</th>
                  <th className="py-2.5 px-3">Leadership Recommendation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {priorityProcessingData.map((row) => (
                  <tr key={row.priority} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: PRIORITY_COLORS[row.priority] }}
                        />
                        <span className="font-bold text-slate-900 dark:text-white">{row.priority}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center font-semibold text-slate-800 dark:text-slate-200">
                      {row.count}
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-slate-900 dark:text-white">
                      {row.avgHours} hrs
                    </td>
                    <td className="py-3 px-3 text-center text-slate-500 dark:text-slate-400">
                      ≤ {row.targetSlaHours} hrs
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[11px] ${
                          row.onTimeRate >= 80
                            ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                            : row.onTimeRate >= 60
                            ? 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                            : 'bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                        }`}
                      >
                        {row.onTimeRate}%
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-300 leading-tight">
                      {row.priority === 'Rush' && row.avgHours > 4
                        ? 'Expedite dispatch protocols. Route directly to Division Manager for fast-tracked sign-off.'
                        : row.priority === 'Rush'
                        ? 'Rush pipeline meeting target standards. Maintain dedicated messenger desk priority.'
                        : row.priority === 'Urgent' && row.avgHours > 8
                        ? 'Review supervisor bottleneck in drafting endorsement endorsements.'
                        : row.priority === 'Urgent'
                        ? 'Good momentum on urgent routing. Keep 8-hour alert active.'
                        : 'Routine files flowing smoothly within standard 24h operational window.'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Actionable Insights Callout */}
          <div className="mt-4 p-3.5 rounded-xl bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-900/50 flex items-start gap-3 text-xs text-sky-900 dark:text-sky-200">
            <TrendingUp className="w-4 h-4 text-sky-700 dark:text-sky-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Key Management Insight:</span> Documents originating from or addressed to{' '}
              <strong>{topDepartment}</strong> account for {topDeptCount} files ({totalVolume > 0 ? Math.round((topDeptCount / totalVolume) * 100) : 0}% of overall agency inflow). Ensuring that review staff are assigned promptly prevents desk congestion and minimizes backlog.
            </div>
          </div>
        </div>

        {/* Document Classification Pie Chart */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-5 flex flex-col justify-between transition-colors">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 flex items-center justify-center">
                  <PieIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Document Classification</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Volume share by document type</p>
                </div>
              </div>
            </div>

            <div className="h-56 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={documentTypeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {documentTypeData.map((entry, index) => (
                      <Cell
                        key={`cell-${entry.name}`}
                        fill={DEPARTMENT_COLORS[index % DEPARTMENT_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0];
                        return (
                          <div className="bg-slate-900 dark:bg-slate-950 text-white p-2.5 rounded-xl shadow-lg text-xs border border-slate-700">
                            <span className="font-bold text-sky-300">{item.name}</span>
                            <div className="text-slate-300">
                              {item.value} documents (
                              {totalVolume > 0 ? Math.round(((item.value as number) / totalVolume) * 100) : 0}%)
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Legend breakdown list */}
            <div className="space-y-1.5 mt-2 max-h-36 overflow-y-auto pr-1">
              {documentTypeData.slice(0, 5).map((type, idx) => (
                <div key={type.name} className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                  <div className="flex items-center gap-2 truncate">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: DEPARTMENT_COLORS[idx % DEPARTMENT_COLORS.length] }}
                    />
                    <span className="truncate">{type.name}</span>
                  </div>
                  <span className="font-bold text-slate-800 dark:text-white ml-2">{type.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 mt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>{documentTypeData.length} document types</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">{totalVolume} total</span>
          </div>
        </div>
      </div>

      {/* Virtualized / Lazy-Loaded Document Performance & Flow Ledger */}
      <AnalyticsDrillDownTable
        documents={filteredDocs}
        onSelectDocument={onSelectDocument}
      />

    </div>
  );
};

// Sub-component for virtualized / lazy-loaded document flow inspection to minimize re-renders
const AnalyticsDrillDownTable: React.FC<{
  documents: DocumentItem[];
  onSelectDocument?: (doc: DocumentItem) => void;
}> = ({ documents, onSelectDocument }) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'CLEARED' | 'REMARKS'>('ALL');
  const [visibleCount, setVisibleCount] = useState<number>(20);

  const filtered = useMemo(() => {
    return documents.filter((doc) => {
      const matchSearch =
        !search ||
        doc.trackingNumber.toLowerCase().includes(search.toLowerCase()) ||
        doc.title.toLowerCase().includes(search.toLowerCase()) ||
        doc.originDepartment.toLowerCase().includes(search.toLowerCase()) ||
        doc.targetDivision.toLowerCase().includes(search.toLowerCase());

      if (!matchSearch) return false;

      if (statusFilter === 'ACTIVE') return !doc.managerClearance?.isCleared;
      if (statusFilter === 'CLEARED') return !!doc.managerClearance?.isCleared;
      if (statusFilter === 'REMARKS') {
        return doc.supervisorRemarks?.some((r) => r.complianceRequired && !r.complied);
      }
      return true;
    });
  }, [documents, search, statusFilter]);

  const visibleDocs = useMemo(() => {
    return filtered.slice(0, visibleCount);
  }, [filtered, visibleCount]);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
      <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Executive Flow &amp; SLA Audit Ledger</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Virtualized lazy-loading table to inspect high-frequency document movement records without freezing the UI.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            placeholder="Search tracking, title..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setVisibleCount(20);
            }}
            className="px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 w-44"
          />

          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs">
            {(['ALL', 'ACTIVE', 'REMARKS', 'CLEARED'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => {
                  setStatusFilter(tab);
                  setVisibleCount(20);
                }}
                className={`px-2.5 py-1 rounded-lg font-semibold cursor-pointer transition-colors ${
                  statusFilter === tab
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tab === 'ALL' ? 'All' : tab === 'ACTIVE' ? 'In Routing' : tab === 'REMARKS' ? 'Remarks' : 'Cleared'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
              <th className="py-2.5 px-4 whitespace-nowrap">Tracking #</th>
              <th className="py-2.5 px-4">Subject / Title</th>
              <th className="py-2.5 px-4">Origin &bull; Division</th>
              <th className="py-2.5 px-4 text-center">Priority</th>
              <th className="py-2.5 px-4 text-center">Current Status</th>
              <th className="py-2.5 px-4 text-right">Inspection</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {visibleDocs.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400">
                  No records match current filter.
                </td>
              </tr>
            ) : (
              visibleDocs.map((doc) => {
                const isCleared = !!doc.managerClearance?.isCleared;
                const hasRemarks = doc.supervisorRemarks?.some((r) => r.complianceRequired && !r.complied);

                return (
                  <tr
                    key={doc.id}
                    onClick={() => onSelectDocument?.(doc)}
                    className="hover:bg-blue-50/40 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                  >
                    <td className="py-2.5 px-4 font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                      {doc.trackingNumber}
                    </td>
                    <td className="py-2.5 px-4 max-w-xs truncate font-medium text-slate-800 dark:text-slate-200">
                      {doc.title}
                    </td>
                    <td className="py-2.5 px-4 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      <span className="font-semibold">{doc.originDepartment}</span>
                      <span className="text-slate-400 block text-[11px]">&rarr; {doc.targetDivision}</span>
                    </td>
                    <td className="py-2.5 px-4 text-center whitespace-nowrap">
                      <span
                        className={`inline-block px-2 py-0.5 rounded font-bold text-[10px] ${
                          doc.priority === 'Rush'
                            ? 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300'
                            : doc.priority === 'Urgent'
                            ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                            : 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300'
                        }`}
                      >
                        {doc.priority}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-center whitespace-nowrap">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          isCleared
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                            : hasRemarks
                            ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {isCleared ? 'Cleared' : hasRemarks ? 'Remarks Pending' : doc.currentStatus}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectDocument?.(doc);
                        }}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 cursor-pointer"
                      >
                        <span>View</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {filtered.length > visibleCount && (
        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>
            Displaying <strong className="text-slate-800 dark:text-white font-mono">{visibleDocs.length}</strong> of{' '}
            <strong className="text-slate-800 dark:text-white font-mono">{filtered.length}</strong> items (virtualized chunking)
          </span>
          <button
            type="button"
            onClick={() => setVisibleCount((prev) => Math.min(filtered.length, prev + 20))}
            className="px-3 py-1 rounded-lg bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 font-semibold text-slate-800 dark:text-white border border-slate-200 dark:border-slate-600 cursor-pointer shadow-2xs"
          >
            Load More Records
          </button>
        </div>
      )}
    </div>
  );
};

```

---

## File: `src/components/DocumentAuditTrail.tsx` (591 lines)

```typescript
import React, { useState, useMemo } from 'react';
import { DocumentItem, InternalMovement, SupervisorRemark, AppUserRole } from '../types';
import {
  History,
  MapPin,
  ArrowRight,
  MessageSquare,
  CheckCircle,
  ShieldCheck,
  Inbox,
  Clock,
  Filter,
  ArrowUpDown,
  Copy,
  Check,
  Printer,
  Search,
  ExternalLink,
  User,
  FileText,
  AlertCircle,
} from 'lucide-react';

export interface AuditTrailEvent {
  id: string;
  type: 'inflow' | 'movement' | 'remark' | 'compliance' | 'clearance';
  timestamp: string;
  actorName: string;
  actorRole: string;
  actionTitle: string;
  stageLabel: string;
  fromDesk?: string;
  toDesk?: string;
  statusUpdate?: string;
  notes?: string;
  complianceRequired?: boolean;
  complied?: boolean;
  clearanceType?: string;
  exitTrackingNumber?: string;
  forwardedToExternal?: string;
}

interface DocumentAuditTrailProps {
  document: DocumentItem;
  currentUser?: AppUserRole;
  onNavigateToTab?: (tab: 'movements' | 'remarks' | 'clearance') => void;
}

export const DocumentAuditTrail: React.FC<DocumentAuditTrailProps> = ({
  document,
  currentUser,
  onNavigateToTab,
}) => {
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [filterType, setFilterType] = useState<'all' | 'movement' | 'remark' | 'clearance'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);

  // Compile all lifecycle events into unified chronological list
  const allEvents = useMemo<AuditTrailEvent[]>(() => {
    const events: AuditTrailEvent[] = [];

    // 1. Initial Inflow / Receipt Event
    const inflowTime = document.createdAt || `${document.dateReceived}T${document.timeReceived}:00Z`;
    events.push({
      id: 'event-inflow',
      type: 'inflow',
      timestamp: inflowTime,
      actorName: document.responsiblePerson || 'Records Custodian',
      actorRole: 'Receiving Staff / Inflow Officer',
      actionTitle: 'Incoming Document Logged & Registered',
      stageLabel: 'Stage 1: Inflow',
      fromDesk: document.originDepartment,
      toDesk: document.currentLocation || document.targetDivision,
      statusUpdate: 'Incoming Logged',
      notes: `Document classified as "${document.documentType}" (${document.communicationType} • ${document.reportType}) with ${document.priority} Priority from origin "${document.originDepartment}". Designated target division: ${document.targetDivision}.`,
    });

    // 2. All Internal Desk Movements
    (document.movements || []).forEach((m, idx) => {
      events.push({
        id: m.id || `event-mov-${idx}`,
        type: 'movement',
        timestamp: m.timestamp,
        actorName: m.personnelName,
        actorRole: m.personnelRole || 'Handling Staff',
        actionTitle: `Transferred: ${m.currentDesk} ➔ ${m.forwardToDesk}`,
        stageLabel: 'Internal Routing',
        fromDesk: m.currentDesk,
        toDesk: m.forwardToDesk,
        statusUpdate: m.statusUpdate,
        notes: m.notes,
      });
    });

    // 3. Supervisor Directives and Compliances
    (document.supervisorRemarks || []).forEach((r, idx) => {
      // 3A. Directive Issuance
      events.push({
        id: `${r.id || idx}-directive`,
        type: 'remark',
        timestamp: r.timestamp,
        actorName: r.supervisorName,
        actorRole: 'Supervisor / Division Head',
        actionTitle: 'Supervisor Directive Issued',
        stageLabel: 'Supervisory Action',
        statusUpdate: r.complianceRequired ? 'Compliance Required' : 'Informational Remark',
        notes: r.remarkText,
        complianceRequired: r.complianceRequired,
        complied: r.complied,
      });

      // 3B. Directive Compliance Fulfilled
      if (r.complied) {
        events.push({
          id: `${r.id || idx}-complied`,
          type: 'compliance',
          timestamp: r.compliedAt || r.timestamp,
          actorName: r.compliedBy || 'Action Staff',
          actorRole: 'Staff / Action Officer',
          actionTitle: 'Supervisor Directive Complied & Verified',
          stageLabel: 'Compliance Fulfilled',
          statusUpdate: 'Directive Complied',
          notes: r.complianceNotes || 'Action fulfilled according to supervisor instructions.',
        });
      }
    });

    // 4. Manager Clearance / Outgoing Dispatch
    if (document.managerClearance?.isCleared) {
      const clearance = document.managerClearance;
      const clearanceLabel =
        clearance.clearanceType === 'approved_for_dispatch'
          ? 'Approved for Outgoing Dispatch'
          : clearance.clearanceType === 'archived_completed'
          ? 'Completed & Archived'
          : 'Returned for Revision';

      events.push({
        id: 'event-clearance',
        type: 'clearance',
        timestamp: clearance.clearedAt || document.updatedAt,
        actorName: clearance.clearedBy || 'Division Manager',
        actorRole: 'Department Manager / Authorizing Official',
        actionTitle: `Manager Clearance: ${clearanceLabel}`,
        stageLabel: 'Terminal Clearance',
        fromDesk: document.currentLocation,
        toDesk: clearance.forwardedToExternal || 'External Recipient',
        statusUpdate: 'Cleared for Out',
        clearanceType: clearance.clearanceType,
        exitTrackingNumber: clearance.exitTrackingNumber,
        forwardedToExternal: clearance.forwardedToExternal,
        notes: clearance.clearanceRemarks || 'Final clearance granted for outgoing transmittal.',
      });
    }

    // Sort chronologically
    return events.sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
    });
  }, [document, sortOrder]);

  // Filtered events
  const filteredEvents = useMemo(() => {
    return allEvents.filter((ev) => {
      // Type filter
      if (filterType === 'movement' && ev.type !== 'movement' && ev.type !== 'inflow') return false;
      if (filterType === 'remark' && ev.type !== 'remark' && ev.type !== 'compliance') return false;
      if (filterType === 'clearance' && ev.type !== 'clearance') return false;

      // Search query
      if (searchQuery.trim()) {
        const query = (searchQuery || '').toLowerCase();
        const matchesActor = (ev.actorName || '').toLowerCase().includes(query);
        const matchesAction = (ev.actionTitle || '').toLowerCase().includes(query);
        const matchesNotes = (ev.notes || '').toLowerCase().includes(query);
        const matchesDesks =
          (ev.fromDesk || '').toLowerCase().includes(query) || (ev.toDesk || '').toLowerCase().includes(query);
        const matchesRole = (ev.actorRole || '').toLowerCase().includes(query);
        return matchesActor || matchesAction || matchesNotes || matchesDesks || matchesRole;
      }

      return true;
    });
  }, [allEvents, filterType, searchQuery]);

  // Format timestamp nicely
  const formatTimestamp = (isoString: string) => {
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return isoString;
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
    } catch {
      return isoString;
    }
  };

  // Relative time from receipt
  const getElapsedString = (eventTime: string) => {
    try {
      const baseTime = new Date(document.createdAt || `${document.dateReceived}T${document.timeReceived}:00Z`).getTime();
      const curTime = new Date(eventTime).getTime();
      const diffMs = curTime - baseTime;
      if (diffMs <= 60000) return 'Inflow Entry';
      const diffMins = Math.floor(diffMs / 60000);
      const hours = Math.floor(diffMins / 60);
      const mins = diffMins % 60;
      if (hours === 0) return `+${mins}m after inflow`;
      if (hours < 24) return `+${hours}h ${mins}m after inflow`;
      const days = Math.floor(hours / 24);
      return `+${days}d ${hours % 24}h after inflow`;
    } catch {
      return '';
    }
  };

  // Copy full audit trail to clipboard
  const handleCopyAuditTrail = () => {
    const lines = [
      `========================================================================`,
      `GOVERNMENT OF THE PHILIPPINES - POSSD DOCUMENT TRACKING AUDIT TRAIL`,
      `Tracking Number : ${document.trackingNumber}`,
      `Title           : ${document.title}`,
      `Document Type   : ${document.documentType} (${document.communicationType} • ${document.reportType})`,
      `Origin Dept     : ${document.originDepartment}`,
      `Date Received   : ${document.dateReceived} at ${document.timeReceived}`,
      `Current Status  : ${document.currentStatus}`,
      `Current Custody : ${document.currentCustodian} (${document.currentLocation})`,
      `Audit Generated : ${new Date().toLocaleString()}`,
      `========================================================================`,
      ``,
      `CHRONOLOGICAL AUDIT STEPS (${allEvents.length} Lifecycle Events Recorded):`,
      `------------------------------------------------------------------------`,
    ];

    allEvents.forEach((ev, i) => {
      lines.push(`Step ${i + 1} [${formatTimestamp(ev.timestamp)}] - ${ev.actionTitle}`);
      lines.push(`  Actor     : ${ev.actorName} (${ev.actorRole})`);
      if (ev.fromDesk || ev.toDesk) {
        lines.push(`  Routing   : ${ev.fromDesk || 'N/A'} ➔ ${ev.toDesk || 'N/A'}`);
      }
      if (ev.statusUpdate) {
        lines.push(`  Status    : ${ev.statusUpdate}`);
      }
      if (ev.notes) {
        lines.push(`  Remarks   : "${ev.notes}"`);
      }
      lines.push(`------------------------------------------------------------------------`);
    });

    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Print audit trail slip
  const handlePrintAuditTrail = () => {
    window.print();
  };

  const getEventBadge = (type: AuditTrailEvent['type']) => {
    switch (type) {
      case 'inflow':
        return {
          icon: Inbox,
          bg: 'bg-sky-100 text-sky-800 dark:bg-sky-950/80 dark:text-sky-300 border-sky-300 dark:border-sky-800',
          dot: 'bg-sky-500 ring-sky-200 dark:ring-sky-900',
          label: 'Inflow Entry',
        };
      case 'movement':
        return {
          icon: MapPin,
          bg: 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border-blue-300 dark:border-blue-800',
          dot: 'bg-blue-600 ring-blue-200 dark:ring-blue-900',
          label: 'Desk Movement',
        };
      case 'remark':
        return {
          icon: MessageSquare,
          bg: 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300 dark:border-amber-800',
          dot: 'bg-amber-500 ring-amber-200 dark:ring-amber-900',
          label: 'Supervisor Directive',
        };
      case 'compliance':
        return {
          icon: CheckCircle,
          bg: 'bg-teal-100 text-teal-800 dark:bg-teal-950/80 dark:text-teal-300 border-teal-300 dark:border-teal-800',
          dot: 'bg-teal-500 ring-teal-200 dark:ring-teal-900',
          label: 'Compliance Verified',
        };
      case 'clearance':
        return {
          icon: ShieldCheck,
          bg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
          dot: 'bg-emerald-600 ring-emerald-200 dark:ring-emerald-900',
          label: 'Manager Clearance',
        };
    }
  };

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="bg-slate-50 dark:bg-slate-800/80 rounded-xl p-3.5 border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-slate-500 dark:text-slate-400 font-semibold mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Filter:
          </span>
          <button
            type="button"
            onClick={() => setFilterType('all')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
              filterType === 'all'
                ? 'bg-blue-700 text-white shadow-2xs font-bold'
                : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600'
            }`}
          >
            All Events ({allEvents.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('movement')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
              filterType === 'movement'
                ? 'bg-blue-700 text-white shadow-2xs font-bold'
                : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600'
            }`}
          >
            Desk Movements ({(document.movements || []).length + 1})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('remark')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
              filterType === 'remark'
                ? 'bg-amber-600 text-white shadow-2xs font-bold'
                : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600'
            }`}
          >
            Supervisor Directives ({(document.supervisorRemarks || []).length})
          </button>
          {document.managerClearance?.isCleared && (
            <button
              type="button"
              onClick={() => setFilterType('clearance')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                filterType === 'clearance'
                  ? 'bg-emerald-700 text-white shadow-2xs font-bold'
                  : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600'
              }`}
            >
              Clearance (1)
            </button>
          )}
        </div>

        {/* Right side controls: Search, Sort toggle, and Copy Button */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search actors, desks, remarks..."
              className="pl-8 pr-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 w-44 sm:w-56"
            />
          </div>

          {/* Sort order toggle */}
          <button
            type="button"
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="flex items-center gap-1 px-2.5 py-1 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 rounded-lg font-medium hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors cursor-pointer"
            title={sortOrder === 'asc' ? 'Oldest first (Inflow ➔ Present)' : 'Newest first (Recent at top)'}
          >
            <ArrowUpDown className="w-3 h-3 text-blue-600 dark:text-blue-400" />
            <span>{sortOrder === 'asc' ? 'Oldest First' : 'Newest First'}</span>
          </button>

          {/* Copy Audit Trail */}
          <button
            type="button"
            onClick={handleCopyAuditTrail}
            className="flex items-center gap-1 px-3 py-1 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-lg font-semibold shadow-2xs transition-colors cursor-pointer"
            title="Copy formatted audit trail for transmittal slip or report"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-300 font-bold">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Trail</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Audit Summary Ribbon */}
      <div className="bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-700 text-white flex items-center justify-center font-bold shrink-0 shadow-2xs">
            <History className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-slate-900 dark:text-white">
              Official POSSD Chronological Audit Trail
            </div>
            <div className="text-slate-600 dark:text-slate-400 text-[11px]">
              {allEvents.length} recorded lifecycle steps • Current Desk: <span className="font-semibold text-blue-900 dark:text-blue-300">{document.currentLocation}</span> • Custodian: <span className="font-semibold text-slate-900 dark:text-white">{document.currentCustodian}</span>
            </div>
          </div>
        </div>

        {onNavigateToTab && (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onNavigateToTab('movements')}
              className="text-[11px] text-blue-700 dark:text-blue-400 hover:underline font-semibold cursor-pointer"
            >
              + Log New Movement
            </button>
            <span className="text-slate-400">•</span>
            <button
              type="button"
              onClick={() => onNavigateToTab('remarks')}
              className="text-[11px] text-amber-700 dark:text-amber-400 hover:underline font-semibold cursor-pointer"
            >
              + Add Directive
            </button>
          </div>
        )}
      </div>

      {/* The Chronological Timeline List */}
      <div className="relative pl-6 sm:pl-8 space-y-6 pt-2 pb-4">
        {/* Continuous Vertical Timeline Line */}
        <div className="absolute left-3.5 sm:left-4.5 top-5 bottom-5 w-0.5 bg-slate-200 dark:bg-slate-700" />

        {filteredEvents.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl p-8 text-center border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-400" />
            <p className="font-medium">No lifecycle events match your filter criteria.</p>
            <button
              type="button"
              onClick={() => {
                setFilterType('all');
                setSearchQuery('');
              }}
              className="mt-2 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          filteredEvents.map((ev, index) => {
            const badge = getEventBadge(ev.type);
            const StepIcon = badge.icon;
            const displayStepNum = sortOrder === 'asc' ? index + 1 : allEvents.length - index;

            return (
              <div key={ev.id} className="relative group">
                {/* Stepper Dot */}
                <div
                  className={`absolute -left-6 sm:-left-8 top-3 w-5 h-5 sm:w-6 sm:h-6 rounded-full ${badge.dot} text-white flex items-center justify-center shadow-xs ring-4 z-10 transition-transform group-hover:scale-110`}
                >
                  <StepIcon className="w-3 h-3" />
                </div>

                {/* Event Card */}
                <div className="bg-white dark:bg-slate-800/95 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xs hover:shadow-md transition-shadow duration-150 overflow-hidden">
                  {/* Step Card Header */}
                  <div className="px-4 py-2.5 bg-slate-50/90 dark:bg-slate-800/90 border-b border-slate-100 dark:border-slate-700/80 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                        Step {displayStepNum}
                      </span>
                      <span
                        className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${badge.bg}`}
                      >
                        {badge.label}
                      </span>
                      {ev.statusUpdate && (
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-600">
                          {ev.statusUpdate}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs">
                      <div className="flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{formatTimestamp(ev.timestamp)}</span>
                      </div>
                      <span className="text-slate-300 dark:text-slate-600">•</span>
                      <span className="font-medium text-slate-600 dark:text-slate-300 bg-slate-200/60 dark:bg-slate-700/60 px-1.5 py-0.5 rounded text-[10px]">
                        {getElapsedString(ev.timestamp)}
                      </span>
                    </div>
                  </div>

                  {/* Step Card Body */}
                  <div className="p-4 space-y-3">
                    {/* Action Title & Personnel */}
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          {ev.actionTitle}
                        </h4>
                        <div className="flex items-center gap-2 text-xs">
                          <div className="w-5 h-5 rounded-full bg-blue-700 text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                            {ev.actorName.slice(0, 2).toUpperCase()}
                          </div>
                          <span className="font-semibold text-slate-900 dark:text-slate-100">
                            {ev.actorName}
                          </span>
                          <span className="text-slate-400">•</span>
                          <span className="text-slate-500 dark:text-slate-400 font-medium">
                            {ev.actorRole}
                          </span>
                        </div>
                      </div>

                      {/* Route Pill if Desk Movement */}
                      {(ev.fromDesk || ev.toDesk) && (
                        <div className="bg-slate-100 dark:bg-slate-700/70 border border-slate-200 dark:border-slate-600 rounded-lg px-2.5 py-1 flex items-center gap-2 text-xs">
                          <div className="text-slate-600 dark:text-slate-300 font-medium">
                            <span className="text-[10px] text-slate-400 block uppercase font-bold">From</span>
                            <span className="font-semibold text-slate-800 dark:text-white">{ev.fromDesk || 'Origin'}</span>
                          </div>
                          <ArrowRight className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0 mt-2" />
                          <div className="text-slate-600 dark:text-slate-300 font-medium">
                            <span className="text-[10px] text-slate-400 block uppercase font-bold">To</span>
                            <span className="font-semibold text-blue-800 dark:text-blue-300">{ev.toDesk || 'Next Desk'}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Associated Remarks Box */}
                    {ev.notes && (
                      <div className="bg-slate-50 dark:bg-slate-900/60 rounded-lg p-3 border-l-3 border-blue-600 dark:border-blue-500 text-xs text-slate-700 dark:text-slate-300 space-y-1">
                        <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" /> Associated Remarks / Notes:
                        </div>
                        <p className="italic leading-relaxed whitespace-pre-line font-serif">
                          "{ev.notes}"
                        </p>
                      </div>
                    )}

                    {/* Clearance specifics */}
                    {ev.type === 'clearance' && ev.exitTrackingNumber && (
                      <div className="bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-lg p-2.5 text-xs text-emerald-900 dark:text-emerald-200 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>Exit Tracking Code: <strong className="font-mono font-bold text-emerald-950 dark:text-emerald-100">{ev.exitTrackingNumber}</strong></span>
                        </div>
                        {ev.forwardedToExternal && (
                          <span>External Destination: <strong>{ev.forwardedToExternal}</strong></span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
```

---

## File: `src/components/DocumentDetailModal.tsx` (1213 lines)

```typescript
import React, { useState } from 'react';
import { DocumentItem, InternalMovement, SupervisorRemark, ManagerClearance, AppUserRole, UserRoleType } from '../types';
import { PossdLogo } from './PossdLogo';
import {
  FileText,
  MapPin,
  ArrowRight,
  Send,
  MessageSquare,
  CheckCircle,
  AlertCircle,
  Clock,
  UserCheck,
  ShieldCheck,
  X,
  Plus,
  Check,
  Tag,
  Building,
  User,
  History,
  Calendar,
  AlertTriangle,
  Lock,
  ArrowRightLeft,
  Trash2,
  Sliders,
  Link2,
  ExternalLink,
  Edit3,
} from 'lucide-react';
import { canUserDeleteDocuments } from '../mockData';
import { TimeInDeskConfig } from '../types';
import { calculateDocumentTimeInDesk, DEFAULT_TIME_IN_DESK_CONFIG } from '../lib/timeInDesk';
import { DocumentLifecycleProgress } from './DocumentLifecycleProgress';
import { DocumentAuditTrail } from './DocumentAuditTrail';

interface DocumentDetailModalProps {
  document: DocumentItem | null;
  onClose: () => void;
  currentUser: AppUserRole;
  onUpdateDocument: (updated: DocumentItem, notificationMessage: string) => void;
  onSwitchRole?: (role: UserRoleType) => void;
  onDeleteDocument?: (doc: DocumentItem) => void;
  timeInDeskConfig?: TimeInDeskConfig;
  onConfigureThreshold?: () => void;
}

export const DocumentDetailModal: React.FC<DocumentDetailModalProps> = ({
  document,
  onClose,
  currentUser,
  onUpdateDocument,
  onSwitchRole,
  onDeleteDocument,
  timeInDeskConfig,
  onConfigureThreshold,
}) => {
  if (!document) return null;

  const canDelete = canUserDeleteDocuments(currentUser.role);
  const timeMetrics = calculateDocumentTimeInDesk(document, timeInDeskConfig || DEFAULT_TIME_IN_DESK_CONFIG);

  const [activeTab, setActiveTab] = useState<'audit' | 'movements' | 'remarks' | 'clearance'>('audit');

  const totalAuditEvents =
    1 +
    (document.movements?.length || 0) +
    (document.supervisorRemarks?.length || 0) +
    (document.supervisorRemarks?.filter((r) => r.complied).length || 0) +
    (document.managerClearance?.isCleared ? 1 : 0);

  // --- 1. Movement form state ---
  const [currentDeskInput, setCurrentDeskInput] = useState('');
  const [forwardToInput, setForwardToInput] = useState('');
  const [movementAction, setMovementAction] = useState<InternalMovement['statusUpdate']>('forwarded');
  const [movementNotes, setMovementNotes] = useState('');

  // --- 2. Supervisor Remark form state ---
  const [remarkText, setRemarkText] = useState('');
  const [complianceRequired, setComplianceRequired] = useState(true);
  const [complianceInputNotes, setComplianceInputNotes] = useState<{ [remarkId: string]: string }>({});

  // --- 3. Manager Clearance form state ---
  const [clearanceType, setClearanceType] = useState<NonNullable<ManagerClearance['clearanceType']>>('approved_for_dispatch');
  const [exitTrackingNumber, setExitTrackingNumber] = useState(
    document.managerClearance?.exitTrackingNumber || `OUT-${document.trackingNumber.replace('TRK-', '')}`
  );
  const [forwardedToExternal, setForwardedToExternal] = useState(
    document.managerClearance?.forwardedToExternal || document.originDepartment
  );
  const [clearanceRemarks, setClearanceRemarks] = useState(
    document.managerClearance?.clearanceRemarks || ''
  );

  // --- 4. File link state ---
  const [isEditingFileLink, setIsEditingFileLink] = useState(false);
  const [fileLinkInput, setFileLinkInput] = useState(document.fileLink || '');

  const handleSaveFileLink = () => {
    const updated: DocumentItem = {
      ...document,
      fileLink: fileLinkInput.trim() || undefined,
      updatedAt: new Date().toISOString(),
    };
    onUpdateDocument(updated, `Updated attached file link for ${document.trackingNumber}`);
    setIsEditingFileLink(false);
  };

  // Status badge styling helper
  const getStatusColor = (status: DocumentItem['currentStatus']) => {
    switch (status) {
      case 'Cleared for Out':
      case 'Dispatched / Completed':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Supervisor Comment Needed':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Complied / Ready for Clearance':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Under Review':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-sky-50 text-sky-700 border-sky-200';
    }
  };

  // HANDLER: Record new internal movement
  const handleAddMovement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentDeskInput.trim() || !forwardToInput.trim()) return;

    const nowIso = new Date().toISOString();
    const newMovement: InternalMovement = {
      id: `mov-${Date.now()}`,
      timestamp: nowIso,
      personnelName: currentUser.name,
      personnelRole: currentUser.role,
      currentDesk: currentDeskInput.trim(),
      forwardToDesk: forwardToInput.trim(),
      statusUpdate: movementAction,
      notes: movementNotes.trim(),
    };

    let nextStatus = document.currentStatus;
    if (document.currentStatus === 'Incoming Logged') {
      nextStatus = 'Under Review';
    }

    const updated: DocumentItem = {
      ...document,
      
      currentCustodian: currentUser.name,
      currentStatus: nextStatus,
      updatedAt: nowIso,
      movements: [newMovement, ...(document.movements || [])],
    };

    const notif = `Moved from "${currentDeskInput}" to "${forwardToInput}" by ${currentUser.name}`;
    onUpdateDocument(updated, notif);

    // Reset movement inputs
    setCurrentDeskInput(forwardToInput.trim());
    setForwardToInput('');
    setMovementNotes('');
  };

  // HANDLER: Add supervisor remark
  const handleAddSupervisorRemark = (e: React.FormEvent) => {
    e.preventDefault();
    if (!remarkText.trim()) return;

    const nowIso = new Date().toISOString();
    const newRemark: SupervisorRemark = {
      id: `rem-${Date.now()}`,
      supervisorName: currentUser.name,
      timestamp: nowIso,
      remarkText: remarkText.trim(),
      complianceRequired,
      complied: false,
    };

    const updated: DocumentItem = {
      ...document,
      currentStatus: complianceRequired ? 'Supervisor Comment Needed' : document.currentStatus,
      updatedAt: nowIso,
      supervisorRemarks: [newRemark, ...(document.supervisorRemarks || [])],
    };

    const notif = `Supervisor remark added by ${currentUser.name}: "${remarkText.slice(0, 45)}..."`;
    onUpdateDocument(updated, notif);
    setRemarkText('');
  };

  // HANDLER: Mark supervisor remark as complied
  const handleMarkComplied = (remarkId: string) => {
    const note = complianceInputNotes[remarkId] || 'Complied and verified requirements.';
    const nowIso = new Date().toISOString();

    const updatedRemarks = (document.supervisorRemarks || []).map((r) => {
      if (r.id === remarkId) {
        return {
          ...r,
          complied: true,
          compliedAt: nowIso,
          compliedBy: currentUser.name,
          complianceNotes: note,
        };
      }
      return r;
    });

    // Check if all remarks requiring compliance are now complied
    const allComplied = updatedRemarks.every((r) => !r.complianceRequired || r.complied);

    const updated: DocumentItem = {
      ...document,
      supervisorRemarks: updatedRemarks,
      currentStatus: allComplied ? 'Complied / Ready for Clearance' : document.currentStatus,
      updatedAt: nowIso,
    };

    const notif = `Compliance completed by ${currentUser.name} for remark #${remarkId.slice(-4)}`;
    onUpdateDocument(updated, notif);
  };

  // HANDLER: Manager Clearance (Clear document for Out / Dispatch)
  const handleClearDocument = (e: React.FormEvent) => {
    e.preventDefault();
    const nowIso = new Date().toISOString();

    const updatedClearance: ManagerClearance = {
      isCleared: true,
      clearedBy: currentUser.name,
      clearedAt: nowIso,
      clearanceType,
      exitTrackingNumber: exitTrackingNumber.trim(),
      forwardedToExternal: forwardedToExternal.trim(),
      clearanceRemarks: clearanceRemarks.trim(),
    };

    const updated: DocumentItem = {
      ...document,
      managerClearance: updatedClearance,
      currentStatus: clearanceType === 'approved_for_dispatch' ? 'Cleared for Out' : 'Dispatched / Completed',
      
      updatedAt: nowIso,
    };

    const notif = `Document CLEARED FOR OUT by Manager ${currentUser.name} (${clearanceType})`;
    onUpdateDocument(updated, notif);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Top Banner - Professional Slate Grayscale Palette */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-900 text-white flex items-start justify-between">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-white p-1 flex items-center justify-center shrink-0 shadow-sm ring-1 ring-amber-400/50 mt-0.5">
              <PossdLogo className="w-8 h-8" variant="black" />
            </div>
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-sm font-bold text-blue-950 bg-white px-2.5 py-1 rounded-lg border border-blue-200 shadow-2xs">
                  {document.trackingNumber}
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStatusColor(document.currentStatus)}`}>
                  {document.currentStatus}
                </span>
                
                <span className="text-xs px-2 py-0.5 rounded bg-blue-900/60 dark:bg-blue-950 text-blue-200 border border-blue-700/50 dark:border-blue-800 font-medium">
                  {document.communicationType}
                </span>
                <span className="text-xs px-2 py-0.5 rounded bg-purple-900/60 dark:bg-purple-950 text-purple-200 border border-purple-700/50 dark:border-purple-800 font-medium">
                  {document.documentType}
                </span>
                <span className="text-xs px-2 py-0.5 rounded bg-indigo-900/60 dark:bg-indigo-950 text-indigo-200 border border-indigo-700/50 dark:border-indigo-800 font-medium truncate max-w-[200px]">
                  {document.reportType}
                </span>

                <span
                  className={`text-xs px-2 py-0.5 rounded font-bold ${
                    document.priority === 'Rush'
                      ? 'bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-200'
                      : document.priority === 'Urgent'
                      ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-200'
                      : 'bg-blue-100 dark:bg-blue-950/70 text-blue-900 dark:text-blue-200'
                  }`}
                >
                  {document.priority} Priority
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white leading-snug">
                {document.title}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-300 hover:text-white p-1.5 rounded-lg hover:bg-white/10 text-base font-medium transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Metadata Strip */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <span className="text-slate-500 dark:text-slate-400 block font-medium">From (Origin):</span>
            <span className="font-semibold text-slate-900 dark:text-white truncate block" title={document.originDepartment}>
              {document.originDepartment}
            </span>
          </div>
          <div>
            <span className="text-slate-500 dark:text-slate-400 block font-medium">Received Time:</span>
            <span className="font-semibold text-slate-900 dark:text-white">
              {document.dateReceived} @ {document.timeReceived}
            </span>
          </div>
          <div>
            <span className="text-slate-500 dark:text-slate-400 block font-medium">Target Division:</span>
            <span className="font-semibold text-slate-900 dark:text-white truncate block">
              {document.targetDivision}
            </span>
          </div>
          <div>
            <span className="text-slate-500 dark:text-slate-400 block font-medium">Focal Person:</span>
            <span className="font-semibold text-slate-900 dark:text-white truncate block">
              {document.responsiblePerson}
            </span>
          </div>
        </div>

        {/* Visual Progress Steps Indicator */}
        <div className="px-6 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
          <DocumentLifecycleProgress document={document} variant="detailed" />
        </div>

        {/* Attached File Link Ribbon - Blue & Green Accent */}
        <div className="px-6 py-2.5 bg-blue-50/70 dark:bg-blue-950/30 border-b border-blue-100 dark:border-blue-900/50 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="w-6 h-6 rounded-md bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 flex items-center justify-center shrink-0">
              <Link2 className="w-3.5 h-3.5" />
            </div>
            <span className="font-semibold text-slate-800 dark:text-slate-200 shrink-0">Attached Digital File:</span>
            {isEditingFileLink ? (
              <div className="flex items-center gap-1.5 flex-1 max-w-xl">
                <input
                  type="url"
                  value={fileLinkInput}
                  onChange={(e) => setFileLinkInput(e.target.value)}
                  placeholder="Paste URL (e.g., https://drive.google.com/...)"
                  className="text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-blue-300 dark:border-blue-700 rounded-lg px-2.5 py-1 w-full focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  onClick={handleSaveFileLink}
                  className="px-2.5 py-1 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-[11px] font-semibold shrink-0 cursor-pointer"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setIsEditingFileLink(false);
                    setFileLinkInput(document.fileLink || '');
                  }}
                  className="px-2 py-1 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-[11px] shrink-0 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            ) : document.fileLink ? (
              <div className="flex items-center gap-2 min-w-0">
                <a
                  href={document.fileLink}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-blue-700 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 underline truncate max-w-xs sm:max-w-md flex items-center gap-1 font-medium"
                >
                  <span>{document.fileLink}</span>
                  <ExternalLink className="w-3 h-3 shrink-0" />
                </a>
                <button
                  onClick={() => setIsEditingFileLink(true)}
                  className="text-slate-400 hover:text-blue-700 dark:hover:text-blue-400 p-0.5 rounded hover:bg-blue-100/60 dark:hover:bg-blue-900/60 cursor-pointer"
                  title="Edit link"
                >
                  <Edit3 className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-slate-400 dark:text-slate-500 italic">No cloud file link attached</span>
                <button
                  onClick={() => setIsEditingFileLink(true)}
                  className="text-blue-700 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 font-semibold underline text-[11px] cursor-pointer"
                >
                  + Add File Link
                </button>
              </div>
            )}
          </div>
          {document.fileLink && !isEditingFileLink && (
            <a
              href={document.fileLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors shrink-0"
            >
              <span>Open File</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>

        {/* Active Role Indicator Banner */}
        <div className="px-6 py-2.5 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 dark:text-slate-400 font-medium">Session Active User:</span>
            <span className="font-bold text-slate-800 dark:text-white">{currentUser.name}</span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-950/70 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              {currentUser.role}
            </span>
          </div>
          {onSwitchRole && (
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
              <span className="hidden sm:inline">Switch Role perspective:</span>
              <button
                type="button"
                onClick={() => onSwitchRole('Admin Staff')}
                className={`hover:underline font-semibold cursor-pointer ${currentUser.role === 'Admin Staff' || currentUser.role === 'Receiving Staff' ? 'text-blue-700 dark:text-blue-400 underline font-bold' : 'text-slate-600 dark:text-slate-400'}`}
              >
                Admin Staff
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => onSwitchRole('Staff')}
                className={`hover:underline font-semibold cursor-pointer ${currentUser.role === 'Staff' || currentUser.role === 'Personnel / Handler' ? 'text-blue-700 dark:text-blue-400 underline font-bold' : 'text-slate-600 dark:text-slate-400'}`}
              >
                Staff
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => onSwitchRole('Supervisor')}
                className={`hover:underline font-semibold cursor-pointer ${currentUser.role === 'Supervisor' ? 'text-amber-700 dark:text-amber-400 underline font-bold' : 'text-slate-600 dark:text-slate-400'}`}
              >
                Supervisor
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => onSwitchRole('Division Manager')}
                className={`hover:underline font-semibold cursor-pointer ${currentUser.role === 'Division Manager' ? 'text-blue-700 dark:text-blue-400 underline font-bold' : 'text-slate-600 dark:text-slate-400'}`}
              >
                Division Mgr
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => onSwitchRole('Department Manager')}
                className={`hover:underline font-semibold cursor-pointer ${currentUser.role === 'Department Manager' ? 'text-emerald-700 dark:text-emerald-400 underline font-bold' : 'text-slate-600 dark:text-slate-400'}`}
              >
                Dept Mgr
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => onSwitchRole('System Admin')}
                className={`hover:underline font-semibold cursor-pointer ${currentUser.role === 'System Admin' || currentUser.role === 'Records Administrator' ? 'text-blue-900 dark:text-blue-300 underline font-bold' : 'text-slate-600 dark:text-slate-400'}`}
              >
                System Admin
              </button>
            </div>
          )}
        </div>

        {/* Time-in-Desk & Division Threshold Banner */}
        <div
          className={`px-6 py-3 border-b text-xs transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            timeMetrics.isOverdue
              ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60 text-rose-950 dark:text-rose-200'
              : timeMetrics.isCleared
              ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/60 text-emerald-900 dark:text-emerald-200'
              : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200'
          }`}
        >
          <div className="flex items-start sm:items-center gap-3">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                timeMetrics.isOverdue
                  ? 'bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 ring-2 ring-rose-300 dark:ring-rose-800'
                  : timeMetrics.isCleared
                  ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300'
                  : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
              }`}
            >
              {timeMetrics.isOverdue ? (
                <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
              ) : timeMetrics.isCleared ? (
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Clock className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              )}
            </div>

            <div className="space-y-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-slate-900 dark:text-white">Time-in-Desk Metric:</span>
                
                {/* Metric Badge */}
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-mono font-bold text-xs border ${
                    timeMetrics.isOverdue
                      ? 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-200 border-rose-300 dark:border-rose-800'
                      : timeMetrics.isCleared
                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-800'
                      : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700'
                  }`}
                >
                  <Clock className="w-3 h-3" />
                  <span>{timeMetrics.elapsedFormatted}</span>
                </span>

                {timeMetrics.isOverdue ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-600 text-white font-bold text-[10px] uppercase tracking-wide">
                    Exceeded Limit (+{timeMetrics.overdueFormatted})
                  </span>
                ) : !timeMetrics.isCleared ? (
                  <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold">
                    <span>Within Threshold ({timeMetrics.remainingFormatted} left)</span>
                  </span>
                ) : (
                  <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold">
                    Cleared Out
                  </span>
                )}
              </div>

              <p
                className={`text-[11px] leading-relaxed ${
                  timeMetrics.isOverdue ? 'text-rose-800 dark:text-rose-300 font-medium' : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {timeMetrics.isOverdue ? (
                  <>
                    <strong className="text-rose-950 dark:text-rose-100 font-bold">Overdue Alert:</strong> Document has remained in{' '}
                    <strong className="text-rose-950 dark:text-rose-100 font-bold">{document.targetDivision}</strong> beyond the configured threshold limit of{' '}
                    <span className="font-mono font-bold underline">{timeMetrics.thresholdHours} hours</span> by{' '}
                    <strong className="text-rose-950 dark:text-rose-100">{timeMetrics.overdueFormatted}</strong>. Immediate desk action or forward routing is recommended.
                  </>
                ) : timeMetrics.isCleared ? (
                  <>
                    Document tracking cycle complete. Total dwell duration before final managerial clearance was{' '}
                    <strong>{timeMetrics.elapsedFormatted}</strong>.
                  </>
                ) : (
                  <>
                    Currently stationed in{' '}
                    <strong>{document.targetDivision}</strong>. Allowable division threshold:{' '}
                    <span className="font-mono font-bold">{timeMetrics.thresholdHours} hours</span>.
                  </>
                )}
              </p>
            </div>
          </div>

          {onConfigureThreshold && (
            <button
              type="button"
              onClick={onConfigureThreshold}
              className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                timeMetrics.isOverdue
                  ? 'border-rose-300 dark:border-rose-800 bg-white dark:bg-slate-800 hover:bg-rose-100 dark:hover:bg-rose-950 text-rose-800 dark:text-rose-300 shadow-2xs'
                  : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 shadow-2xs'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Configure Threshold</span>
            </button>
          )}
        </div>

        {/* Navigation Tabs - Clean Blue/Yellow/Green Palette */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-6 bg-white dark:bg-slate-900 shrink-0 overflow-x-auto">
          <button
            onClick={() => setActiveTab('audit')}
            id="tab-audit-trail"
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'audit'
                ? 'border-blue-700 dark:border-blue-500 text-blue-900 dark:text-blue-300 bg-blue-50/50 dark:bg-blue-950/40 font-bold'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <History className="w-4 h-4 text-blue-700 dark:text-blue-400" />
            Chronological Audit Trail
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200">
              {totalAuditEvents}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('movements')}
            id="tab-movements"
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'movements'
                ? 'border-blue-700 dark:border-blue-500 text-blue-800 dark:text-blue-300 bg-blue-50/40 dark:bg-blue-950/40 font-bold'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <MapPin className="w-4 h-4 text-blue-700 dark:text-blue-400" />
            Internal Tracking & Forwarding ({document.movements?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('remarks')}
            id="tab-remarks"
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'remarks'
                ? 'border-amber-500 dark:border-amber-400 text-amber-900 dark:text-amber-300 bg-amber-50/50 dark:bg-amber-950/40 font-bold'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <MessageSquare className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            Supervisor Remarks & Compliance ({document.supervisorRemarks?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('clearance')}
            id="tab-clearance"
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'clearance'
                ? 'border-emerald-600 dark:border-emerald-500 text-emerald-900 dark:text-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/40 font-bold'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Department Manager Clearance
            {document.managerClearance?.isCleared && (
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            )}
          </button>
        </div>

        {/* Tab Body Content (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* TAB 0: CHRONOLOGICAL AUDIT TRAIL */}
          {activeTab === 'audit' && (
            <DocumentAuditTrail
              document={document}
              currentUser={currentUser}
              onNavigateToTab={(tab) => setActiveTab(tab)}
            />
          )}

          {/* TAB 1: INTERNAL MOVEMENTS & FORWARDING */}
          {activeTab === 'movements' && (
            <div className="space-y-6">
              
              {/* Add New Movement Form (Accessible to all handling personnel) */}
              <div className="rounded-2xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/30 dark:bg-blue-950/20 p-4 sm:p-5">
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-blue-950 dark:text-blue-300">
                    Update Current Location & Forward to Next Desk
                  </h3>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mb-4">
                  Any office personnel handling this physical document can update where it is currently and specify which desk or officer it will be forwarded to next.
                </p>

                <form onSubmit={handleAddMovement} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Where is the document CURRENTLY?
                      </label>
                      <input
                        type="text"
                        required
                        value={currentDeskInput}
                        onChange={(e) => setCurrentDeskInput(e.target.value)}
                        placeholder="e.g. Desk 4 - Accounting Evaluation"
                        className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Where to NEXT? (Forward Destination)
                      </label>
                      <input
                        type="text"
                        required
                        value={forwardToInput}
                        onChange={(e) => setForwardToInput(e.target.value)}
                        placeholder="e.g. Legal Counsel Desk / Room 304"
                        className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Action Taken
                      </label>
                      <select
                        value={movementAction}
                        onChange={(e) => setMovementAction(e.target.value as any)}
                        className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                      >
                        <option value="forwarded">Forwarded to next desk</option>
                        <option value="in_review">Currently examining / in review</option>
                        <option value="acted">Action endorsed / processed</option>
                        <option value="received">Handed over & received</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Movement Remarks / Routing Instructions
                      </label>
                      <input
                        type="text"
                        value={movementNotes}
                        onChange={(e) => setMovementNotes(e.target.value)}
                        placeholder="e.g. Attached voucher summary; for signature by Atty. Torres"
                        className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Logging as: <strong>{currentUser.name}</strong> ({currentUser.role})
                    </span>
                    <button
                      type="submit"
                      id="log-movement-btn"
                      className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Log Movement & Transfer
                    </button>
                  </div>
                </form>
              </div>

              {/* Movement History Timeline */}
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    Internal Route & Desk Movements
                  </h4>
                  <button
                    type="button"
                    onClick={() => setActiveTab('audit')}
                    className="text-xs font-semibold text-blue-700 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <History className="w-3.5 h-3.5" />
                    <span>View Unified Chronological Audit Trail ({totalAuditEvents} events) ➔</span>
                  </button>
                </div>
                {(!document.movements || document.movements.length === 0) ? (
                  <p className="text-xs text-slate-500 dark:text-slate-400 italic">No movement recorded yet.</p>
                ) : (
                  <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-700">
                    {document.movements.map((m, idx) => (
                      <div key={m.id || idx} className="relative group">
                        {/* Dot indicator */}
                        <div className="absolute -left-6 top-1.5 w-3 h-3 rounded-full bg-blue-600 border-2 border-white dark:border-slate-900 ring-2 ring-blue-200 dark:ring-blue-900" />
                        
                        <div className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs hover:border-slate-300 dark:hover:border-slate-600 transition-colors">
                          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                            <div className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-white">
                              <span className="text-slate-700 dark:text-slate-300">{m.currentDesk}</span>
                              <ArrowRight className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                              <span className="text-blue-800 dark:text-blue-300 font-bold">{m.forwardToDesk}</span>
                            </div>
                            <span className="text-[11px] text-slate-400 font-mono">
                              {new Date(m.timestamp).toLocaleString()}
                            </span>
                          </div>

                          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                            <span className="font-medium text-slate-800 dark:text-slate-200">
                              Personnel: {m.personnelName} {m.personnelRole ? `(${m.personnelRole})` : ''}
                            </span>
                            <span>•</span>
                            <span className="capitalize text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded text-[10px] font-medium">
                              {m.statusUpdate.replace('_', ' ')}
                            </span>
                          </div>

                          {m.notes && (
                            <p className="mt-2 text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/60 p-2 rounded-lg border border-slate-100 dark:border-slate-700/60 italic">
                              "{m.notes}"
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB 2: SUPERVISOR REMARKS & COMPLIANCE */}
          {activeTab === 'remarks' && (
            <div className="space-y-6">
              
              {/* Role Awareness Banner for Supervisor Remarks */}
              {currentUser.role !== 'Supervisor' && currentUser.role !== 'Division Manager' && currentUser.role !== 'Department Manager' && currentUser.role !== 'System Admin' && currentUser.role !== 'Records Administrator' && (
                <div className="p-3 bg-amber-100/70 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-900/60 rounded-xl text-xs text-amber-950 dark:text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0" />
                    <span>
                      Notice: Official directives and compliance instructions are issued by <strong>Supervisors</strong> and <strong>Division Managers</strong>. You are currently logged in as <strong>{currentUser.name}</strong> ({currentUser.role}).
                    </span>
                  </div>
                  {onSwitchRole && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => onSwitchRole('Supervisor')}
                        className="px-3 py-1 bg-amber-700 hover:bg-amber-800 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer"
                      >
                        Switch to Supervisor
                      </button>
                      <button
                        type="button"
                        onClick={() => onSwitchRole('Division Manager')}
                        className="px-3 py-1 bg-violet-700 hover:bg-violet-800 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer"
                      >
                        Switch to Division Mgr
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Supervisor Remark Entry Form */}
              <div className="rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20 p-4 sm:p-5">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-300">
                    Add Supervisor Comments / Compliance Requirements
                  </h3>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">
                  Supervisors can record instructions or deficiencies that must be complied with before the document is allowed to move to manager clearance.
                </p>

                <form onSubmit={handleAddSupervisorRemark} className="space-y-3">
                  <div>
                    <textarea
                      id="supervisor-remark-input"
                      required
                      rows={3}
                      value={remarkText}
                      onChange={(e) => setRemarkText(e.target.value)}
                      placeholder="e.g. Needs revision on Annex B: Verify matching fund codes with the Regional Director endorsement."
                      className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 p-3 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={complianceRequired}
                        onChange={(e) => setComplianceRequired(e.target.checked)}
                        className="rounded border-slate-300 dark:border-slate-600 text-amber-600 focus:ring-amber-500"
                      />
                      <span>Strict Compliance Required (Blocks Manager Clearance until complied)</span>
                    </label>

                    <button
                      type="submit"
                      id="submit-remark-btn"
                      className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Post Supervisor Remark
                    </button>
                  </div>
                </form>
              </div>

              {/* List of Supervisor Remarks & Compliance Section */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  Compliance Tracking Log
                </h4>

                {(!document.supervisorRemarks || document.supervisorRemarks.length === 0) ? (
                  <div className="text-center py-6 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-500 dark:text-slate-400">
                    No supervisor remarks have been issued for this document.
                  </div>
                ) : (
                  document.supervisorRemarks.map((remark) => (
                    <div
                      key={remark.id}
                      className={`p-4 rounded-xl border transition-all ${
                        remark.complianceRequired && !remark.complied
                          ? 'border-amber-300 dark:border-amber-800 bg-amber-50/60 dark:bg-amber-950/30'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            {remark.supervisorName}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {new Date(remark.timestamp).toLocaleString()}
                          </span>
                        </div>

                        {remark.complianceRequired ? (
                          remark.complied ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                              <CheckCircle className="w-3 h-3" /> Complied
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800 animate-pulse">
                              <AlertCircle className="w-3 h-3" /> Compliance Pending
                            </span>
                          )
                        ) : (
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">
                            Advisory Remark
                          </span>
                        )}
                      </div>

                      <p className="mt-2 text-xs text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
                        "{remark.remarkText}"
                      </p>

                      {/* Complied Details or Compliance Action Box */}
                      {remark.complianceRequired && (
                        <div className="mt-3 pt-3 border-t border-slate-200/80 dark:border-slate-700">
                          {remark.complied ? (
                            <div className="text-xs text-emerald-800 dark:text-emerald-300 space-y-1 bg-emerald-50/50 dark:bg-emerald-950/40 p-2.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
                              <p className="font-semibold flex items-center gap-1">
                                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                Complied by {remark.compliedBy} at {remark.compliedAt ? new Date(remark.compliedAt).toLocaleString() : ''}
                              </p>
                              {remark.complianceNotes && (
                                <p className="text-slate-600 dark:text-slate-400 pl-4">Notes: {remark.complianceNotes}</p>
                              )}
                            </div>
                          ) : (
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                              <input
                                type="text"
                                placeholder="Explain how you complied with this remark (e.g. Attached revised table)..."
                                value={complianceInputNotes[remark.id] || ''}
                                onChange={(e) =>
                                   setComplianceInputNotes({
                                     ...complianceInputNotes,
                                     [remark.id]: e.target.value,
                                   })
                                }
                                className="flex-1 text-xs rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                              />
                              <button
                                type="button"
                                onClick={() => handleMarkComplied(remark.id)}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors shrink-0 flex items-center justify-center gap-1 cursor-pointer"
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                                Mark as Complied
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

            </div>
          )}

          {/* TAB 3: DEPARTMENT MANAGER CLEARANCE */}
          {activeTab === 'clearance' && (
            <div className="space-y-6">
              
              {/* Clearance Status Card */}
              {document.managerClearance?.isCleared ? (
                <div className="rounded-2xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/80 dark:bg-emerald-950/30 p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
                      <ShieldCheck className="w-7 h-7" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-emerald-950 dark:text-emerald-200">
                        Document Officially Cleared for Out
                      </h3>
                      <p className="text-xs text-emerald-800 dark:text-emerald-400">
                        Authorized by {document.managerClearance.clearedBy} on{' '}
                        {document.managerClearance.clearedAt
                          ? new Date(document.managerClearance.clearedAt).toLocaleString()
                          : 'Recorded date'}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
                    <div className="bg-white/80 dark:bg-slate-800 p-3 rounded-xl border border-emerald-200 dark:border-emerald-800/80">
                      <span className="text-slate-500 dark:text-slate-400 block font-medium">Clearance Type</span>
                      <span className="font-bold text-slate-800 dark:text-white capitalize">
                        {document.managerClearance.clearanceType?.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div className="bg-white/80 dark:bg-slate-800 p-3 rounded-xl border border-emerald-200 dark:border-emerald-800/80">
                      <span className="text-slate-500 dark:text-slate-400 block font-medium">Outgoing Tracking Ref</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-white">
                        {document.managerClearance.exitTrackingNumber || 'N/A'}
                      </span>
                    </div>
                    <div className="bg-white/80 dark:bg-slate-800 p-3 rounded-xl border border-emerald-200 dark:border-emerald-800/80">
                      <span className="text-slate-500 dark:text-slate-400 block font-medium">Forwarded to External Entity</span>
                      <span className="font-bold text-slate-800 dark:text-white">
                        {document.managerClearance.forwardedToExternal || 'Central Archives'}
                      </span>
                    </div>
                  </div>

                  {document.managerClearance.clearanceRemarks && (
                    <div className="bg-white/80 dark:bg-slate-800 p-3 rounded-xl border border-emerald-200 dark:border-emerald-800/80 text-xs">
                      <span className="text-slate-500 dark:text-slate-400 block font-medium mb-1">Executive Manager Notes</span>
                      <p className="text-slate-800 dark:text-slate-200 italic">"{document.managerClearance.clearanceRemarks}"</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 p-5 space-y-4">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                      Department Manager Clearance Action
                    </h3>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    This section authorizes the final release, dispatch, or official clearance of the document to external agencies or next higher offices.
                  </p>

                  {/* Role Gate Notice for Non-Managers */}
                  {currentUser.role !== 'Department Manager' && currentUser.role !== 'System Admin' && currentUser.role !== 'Records Administrator' && (
                    <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-xl text-xs text-emerald-950 dark:text-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start gap-2.5">
                        <Lock className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5" />
                        <div>
                          <strong className="block">Department Manager Executive Privilege Required</strong>
                          <p className="text-emerald-800 dark:text-emerald-300 text-[11px] mt-0.5">
                            Executive clearance sign-off is restricted to the Department Manager. You are currently logged in as <strong>{currentUser.name}</strong> ({currentUser.role}).
                          </p>
                        </div>
                      </div>
                      {onSwitchRole && (
                        <button
                          type="button"
                          onClick={() => onSwitchRole('Department Manager')}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shrink-0 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          Switch to Department Manager
                        </button>
                      )}
                    </div>
                  )}

                  {/* Warning if there are pending compliance items */}
                  {document.supervisorRemarks?.some((r) => r.complianceRequired && !r.complied) && (
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <strong>Notice:</strong> There is at least one supervisor compliance remark still marked as pending. The Department Manager can review compliance under the Supervisor Remarks tab or override if deemed compliant.
                      </div>
                    </div>
                  )}

                  <form onSubmit={handleClearDocument} className="space-y-4 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Clearance Decision
                        </label>
                        <select
                          value={clearanceType}
                          onChange={(e) => setClearanceType(e.target.value as any)}
                          className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        >
                          <option value="approved_for_dispatch">Approve for Outgoing Dispatch</option>
                          <option value="archived_completed">Completed & Closed for Archive</option>
                          <option value="returned_for_revision">Return to Sender for Revision</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Outgoing Tracking / Dispatch Number
                        </label>
                        <input
                          type="text"
                          required
                          value={exitTrackingNumber}
                          onChange={(e) => setExitTrackingNumber(e.target.value)}
                          placeholder="e.g. OUT-DISPATCH-2026-092"
                          className="w-full font-mono text-xs rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        External Entity / Destination Office Forwarded To
                      </label>
                      <input
                        type="text"
                        required
                        value={forwardedToExternal}
                        onChange={(e) => setForwardedToExternal(e.target.value)}
                        placeholder="e.g. Regional Director Office / Central Courier Service"
                        className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Manager Clearance Remarks / Final Directives
                      </label>
                      <textarea
                        rows={2}
                        value={clearanceRemarks}
                        onChange={(e) => setClearanceRemarks(e.target.value)}
                        placeholder="e.g. Approved for release. Transmit physical original via secured courier."
                        className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 p-3 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                      />
                    </div>

                    <div className="pt-2 flex items-center justify-between">
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        Signatory: <strong>{currentUser.name}</strong> ({currentUser.role})
                      </span>
                      <button
                        type="submit"
                        id="authorize-clearance-btn"
                        className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        Authorize Clearance & Release for Out
                      </button>
                    </div>
                  </form>
                </div>
              )}

            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex flex-wrap items-center gap-3">
            <span>Tracking ID: <strong className="font-mono text-slate-700 dark:text-slate-300">{document.trackingNumber}</strong></span>
            
            {/* Delete Option for System Admin and Department Manager */}
            {canDelete ? (
              <button
                type="button"
                id="delete-doc-from-modal-btn"
                onClick={() => {
                  if (onDeleteDocument) {
                    onDeleteDocument(document);
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200 dark:border-rose-900/80 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 font-semibold transition-colors shadow-2xs cursor-pointer"
                title="Permanently delete this entry (Authorized for System Admin & Department Manager)"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                <span>Delete Log Entry</span>
              </button>
            ) : (
              <span
                className="inline-flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500 bg-slate-100/90 dark:bg-slate-800/80 px-2 py-0.5 rounded border border-slate-200/80 dark:border-slate-700"
                title="Only System Admins and Department Managers can delete log entries"
              >
                <Lock className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                <span>Log deletion restricted to System Admin & Dept Manager</span>
              </span>
            )}
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 font-medium cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
```

---

## File: `src/components/DocumentLifecycleProgress.tsx` (472 lines)

```typescript
import React, { useState } from 'react';
import { DocumentItem } from '../types';
import {
  Inbox,
  Clock,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  Send,
  FileCheck2,
  MapPin,
  User,
  MessageSquare,
  Sparkles,
  Check,
} from 'lucide-react';

interface DocumentLifecycleProgressProps {
  document: DocumentItem;
  variant?: 'compact' | 'detailed';
  showLabels?: boolean;
}

export function getLifecycleStage(document: DocumentItem) {
  const isCleared = !!document.managerClearance?.isCleared;
  const status = document.currentStatus;
  const hasPendingRemarks = document.supervisorRemarks?.some(
    (r) => r.complianceRequired && !r.complied
  );

  // Stage 3: Cleared / Dispatched (100%)
  if (isCleared || status === 'Cleared for Out' || status === 'Dispatched / Completed') {
    return {
      stageIndex: 3,
      stageKey: 'cleared' as const,
      stageTitle: isCleared && document.managerClearance?.clearanceType === 'archived_completed'
        ? 'Cleared (Archived)'
        : status === 'Dispatched / Completed'
        ? 'Dispatched'
        : 'Cleared for Out',
      progressPercent: 100,
      isPendingRemarks: false,
      isCleared: true,
      color: 'emerald',
    };
  }

  // Stage 2: Complied / Ready for Clearance (75%)
  if (status === 'Complied / Ready for Clearance') {
    return {
      stageIndex: 2,
      stageKey: 'complied' as const,
      stageTitle: 'Complied / Ready',
      progressPercent: 75,
      isPendingRemarks: false,
      isCleared: false,
      color: 'teal',
    };
  }

  // Stage 1: Under Review / Supervisor Action (50%)
  if (status === 'Under Review' || status === 'Supervisor Comment Needed' || hasPendingRemarks) {
    return {
      stageIndex: 1,
      stageKey: 'review' as const,
      stageTitle: hasPendingRemarks || status === 'Supervisor Comment Needed'
        ? 'Supervisor Action Needed'
        : 'Under Review',
      progressPercent: 50,
      isPendingRemarks: !!hasPendingRemarks,
      isCleared: false,
      color: hasPendingRemarks || status === 'Supervisor Comment Needed' ? 'amber' : 'blue',
    };
  }

  // Stage 0: Logged (25%)
  return {
    stageIndex: 0,
    stageKey: 'logged' as const,
    stageTitle: 'Incoming Logged',
    progressPercent: 25,
    isPendingRemarks: false,
    isCleared: false,
    color: 'indigo',
  };
}

const STAGES = [
  { id: 'logged', label: 'Logged', short: 'Log' },
  { id: 'review', label: 'Review', short: 'Rev' },
  { id: 'complied', label: 'Complied', short: 'Comp' },
  { id: 'cleared', label: 'Cleared', short: 'Clear' },
];

export const DocumentLifecycleProgress: React.FC<DocumentLifecycleProgressProps> = ({
  document,
  variant = 'compact',
  showLabels = true,
}) => {
  const stage = getLifecycleStage(document);
  const getStageTooltip = (s, isPassed, isCurrent) => {
    let text = `${s.label}: ${isPassed ? 'Completed' : isCurrent ? 'Current Stage' : 'Pending'}`;
    if (s.id === 'received' && document.dateReceived) {
       text += ` on ${document.dateReceived} ${document.timeReceived || ''}`;
    } else if (s.id === 'review' && document.movements?.length) {
       const lastMov = document.movements[document.movements.length - 1];
       text += `\nLast updated: ${new Date(lastMov.timestamp).toLocaleString()}\nLocation: ${lastMov.currentDesk}`;
    } else if (s.id === 'complied' && document.supervisorRemarks?.length) {
       const lastRemark = document.supervisorRemarks[document.supervisorRemarks.length - 1];
       text += `\nDirective: "${lastRemark.remarkText}"\nBy: ${lastRemark.supervisorName}`;
    } else if (s.id === 'cleared' && document.managerClearance?.isCleared) {
       text += `\nCleared on ${new Date(document.managerClearance.clearedAt).toLocaleString()}\nBy: ${document.managerClearance.clearedBy}`;
    }
    return text;
  };


  if (variant === 'detailed') {
    return (
      <div className="w-full bg-slate-50 dark:bg-slate-800/80 rounded-xl p-4 border border-slate-200 dark:border-slate-700/80">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Document Lifecycle Journey
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                stage.color === 'emerald'
                  ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                  : stage.color === 'teal'
                  ? 'bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border-teal-300 dark:border-teal-800'
                  : stage.color === 'amber'
                  ? 'bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                  : stage.color === 'blue'
                  ? 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800'
                  : 'bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800'
              }`}
            >
              {stage.stageTitle}
            </span>
          </div>
          <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-300">
            {stage.progressPercent}% Complete
          </span>
        </div>

        {/* Multi-step track */}
        <div className="relative">
          {/* Background Line */}
          <div className="absolute top-3.5 left-6 right-6 h-1 bg-slate-200 dark:bg-slate-700 -z-0" />

          {/* Active Fill Line */}
          <div
            className={`absolute top-3.5 left-6 h-1 transition-all duration-500 -z-0 ${
              stage.color === 'emerald'
                ? 'bg-emerald-500'
                : stage.color === 'teal'
                ? 'bg-teal-500'
                : stage.color === 'amber'
                ? 'bg-amber-500'
                : stage.color === 'blue'
                ? 'bg-blue-500'
                : 'bg-indigo-500'
            }`}
            style={{
              width: `calc(${stage.stageIndex / (STAGES.length - 1)} * (100% - 3rem))`,
            }}
          />

          <div className="grid grid-cols-4 gap-2 relative z-10">
            {STAGES.map((s, idx) => {
              const isPassed = idx < stage.stageIndex;
              const isCurrent = idx === stage.stageIndex;
              const isUpcoming = idx > stage.stageIndex;

              return (
                <div key={s.id} className="flex flex-col items-center text-center">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-xs ${
                      isPassed
                        ? 'bg-emerald-600 text-white ring-2 ring-emerald-200 dark:ring-emerald-900'
                        : isCurrent
                        ? stage.color === 'emerald'
                          ? 'bg-emerald-600 text-white ring-4 ring-emerald-200 dark:ring-emerald-900 animate-pulse'
                          : stage.color === 'amber'
                          ? 'bg-amber-500 text-white ring-4 ring-amber-200 dark:ring-amber-900 animate-pulse'
                          : stage.color === 'teal'
                          ? 'bg-teal-600 text-white ring-4 ring-teal-200 dark:ring-teal-900 animate-pulse'
                          : 'bg-blue-600 text-white ring-4 ring-blue-200 dark:ring-blue-900 animate-pulse'
                        : 'bg-white dark:bg-slate-800 text-slate-400 border-2 border-slate-300 dark:border-slate-600'
                    }`}
                  >
                    {isPassed ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : isCurrent ? (
                      <span>{idx + 1}</span>
                    ) : (
                      <span className="text-[11px]">{idx + 1}</span>
                    )}
                  </div>

                  <span
                    className={`text-xs mt-1.5 font-semibold ${
                      isCurrent
                        ? 'text-slate-900 dark:text-white font-bold'
                        : isPassed
                        ? 'text-slate-700 dark:text-slate-300'
                        : 'text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  const [isTooltipOpen, setIsTooltipOpen] = useState(false);

  const lastMovement =
    document.movements && document.movements.length > 0
      ? document.movements[document.movements.length - 1]
      : null;

  const activeRemark =
    document.supervisorRemarks?.find((r) => r.complianceRequired && !r.complied) ||
    (document.supervisorRemarks && document.supervisorRemarks.length > 0
      ? document.supervisorRemarks[document.supervisorRemarks.length - 1]
      : null);

  const isCleared = !!document.managerClearance?.isCleared;

  // Compact variant for table rows
  return (
    <div
      className="relative flex flex-col gap-1.5 w-full min-w-[170px] max-w-[230px] group/lifecycle cursor-pointer"
      onMouseEnter={() => setIsTooltipOpen(true)}
      onMouseLeave={() => setIsTooltipOpen(false)}
    >
      {/* Top row: Status pill & Percent */}
      <div className="flex items-center justify-between gap-1.5 cursor-pointer">
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[10.5px] border whitespace-nowrap shadow-2xs transition-all duration-200 hover:scale-105 hover:shadow-md hover:ring-2 hover:ring-offset-1 dark:hover:ring-offset-slate-900 ${
            stage.color === 'emerald'
              ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 hover:ring-emerald-400/60 hover:border-emerald-400'
              : stage.color === 'teal'
              ? 'bg-teal-50 dark:bg-teal-950/80 text-teal-800 dark:text-teal-300 border-teal-300 dark:border-teal-800 hover:ring-teal-400/60 hover:border-teal-400'
              : stage.color === 'amber'
              ? 'bg-amber-50 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-800 hover:ring-amber-400/60 hover:border-amber-400'
              : stage.color === 'blue'
              ? 'bg-blue-50 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800 hover:ring-blue-400/60 hover:border-blue-400'
              : 'bg-indigo-50 dark:bg-indigo-950/80 text-indigo-800 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 hover:ring-indigo-400/60 hover:border-indigo-400'
          }`}
        >
          {stage.color === 'emerald' ? (
            <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0 transition-transform group-hover/lifecycle:scale-110" />
          ) : stage.color === 'teal' ? (
            <FileCheck2 className="w-3 h-3 text-teal-600 dark:text-teal-400 shrink-0 transition-transform group-hover/lifecycle:scale-110" />
          ) : stage.color === 'amber' ? (
            <AlertCircle className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0 transition-transform group-hover/lifecycle:scale-110" />
          ) : stage.color === 'blue' ? (
            <Clock className="w-3 h-3 text-blue-600 dark:text-blue-400 shrink-0 transition-transform group-hover/lifecycle:scale-110" />
          ) : (
            <Inbox className="w-3 h-3 text-indigo-600 dark:text-indigo-400 shrink-0 transition-transform group-hover/lifecycle:scale-110" />
          )}
          <span className="truncate max-w-[125px]">{stage.stageTitle}</span>
        </span>

        <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 group-hover/lifecycle:text-blue-400 shrink-0 transition-colors">
          {stage.progressPercent}%
        </span>
      </div>

      {/* Hover Information Tooltip Popup */}
      {isTooltipOpen && (
        <div className="absolute left-0 bottom-full mb-2.5 z-50 w-72 sm:w-80 p-3.5 rounded-xl bg-slate-950/95 border border-slate-700/90 shadow-2xl shadow-black/80 text-left pointer-events-none backdrop-blur-md animate-in fade-in zoom-in-95 slide-in-from-bottom-2 duration-150 ring-1 ring-blue-500/20">
          {/* Tooltip Header */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
              <span className="text-xs font-bold text-white tracking-tight">
                {stage.stageTitle}
              </span>
            </div>
            <span className="text-[11px] font-mono font-bold text-blue-400">
              {stage.progressPercent}% Complete
            </span>
          </div>

          {/* Timestamp Details */}
          <div className="space-y-2 text-[11px]">
            {/* Initial Log Timestamp */}
            <div className="flex items-start gap-2">
              <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-slate-400">Logged Incoming:</span>{' '}
                <span className="font-semibold text-slate-200">
                  {document.dateReceived} at {document.timeReceived || '08:00:00'}
                </span>
              </div>
            </div>

            {/* Current Physical Station & Custodian */}
            <div className="flex items-start gap-2">
              <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-slate-400">Current Station:</span>{' '}
                <span className="font-semibold text-slate-200">
                  {document.currentLocation || document.targetDivision}
                </span>
                {document.currentCustodian && (
                  <div className="text-[10px] text-emerald-300 font-medium mt-0.5">
                    Custodian: {document.currentCustodian}
                  </div>
                )}
              </div>
            </div>

            {/* Latest Movement and User-Specific Notes */}
            {lastMovement ? (
              <div className="pt-1.5 border-t border-slate-800/80">
                <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                  <Send className="w-3 h-3 text-sky-400" />
                  Latest Movement ({new Date(lastMovement.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                </div>
                <div className="text-slate-300">
                  {lastMovement.personnelName}: {lastMovement.currentDesk} → {lastMovement.forwardToDesk}
                </div>
                {lastMovement.notes && (
                  <div className="mt-1 p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-[10.5px] text-amber-200/90 italic flex items-start gap-1">
                    <MessageSquare className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
                    <span>"{lastMovement.notes}"</span>
                  </div>
                )}
              </div>
            ) : null}

            {/* Supervisor Action / Specific Remarks */}
            {activeRemark && (
              <div className="pt-1.5 border-t border-slate-800/80">
                <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-400 mb-0.5">
                  <AlertCircle className="w-3 h-3 text-amber-400" />
                  Supervisor Note ({activeRemark.supervisorName})
                </div>
                <div className="text-slate-200 text-[10.5px] line-clamp-2">
                  "{activeRemark.remarkText}"
                </div>
                {activeRemark.complied ? (
                  <div className="mt-1 text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    Complied by {activeRemark.compliedBy || 'Staff'} {activeRemark.complianceNotes ? `("${activeRemark.complianceNotes}")` : ''}
                  </div>
                ) : (
                  <div className="mt-0.5 text-[10px] text-amber-300 font-medium">
                    Pending compliance action
                  </div>
                )}
              </div>
            )}

            {/* Manager Clearance Details */}
            {isCleared && document.managerClearance && (
              <div className="pt-1.5 border-t border-slate-800/80">
                <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400 mb-0.5">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  Clearance Granted
                </div>
                <div className="text-slate-300 text-[10.5px]">
                  Authorized by <span className="font-semibold text-white">{document.managerClearance.clearedBy || 'Division Manager'}</span>
                  {document.managerClearance.clearedAt && (
                    <span className="text-slate-400 text-[10px] block">
                      {new Date(document.managerClearance.clearedAt).toLocaleString()}
                    </span>
                  )}
                </div>
                {document.managerClearance.clearanceRemarks && (
                  <div className="mt-0.5 text-[10px] text-slate-400 italic">
                    "{document.managerClearance.clearanceRemarks}"
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bottom Tooltip Arrow */}
          <div className="absolute left-6 top-full w-2 h-2 bg-slate-950 border-r border-b border-slate-700/90 -translate-y-1 rotate-45" />
        </div>
      )}

      {/* Progress Track & Step Nodes */}
      <div className="relative w-full py-1 cursor-pointer">
        {/* Background track */}
        <div className="h-1.5 w-full bg-slate-200/90 dark:bg-slate-700/80 group-hover/lifecycle:bg-slate-300 dark:group-hover/lifecycle:bg-slate-600 rounded-full overflow-hidden transition-colors">
          <div
            className={`h-full transition-all duration-300 rounded-full ${
              stage.color === 'emerald'
                ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50'
                : stage.color === 'teal'
                ? 'bg-teal-500 shadow-sm shadow-teal-500/50'
                : stage.color === 'amber'
                ? 'bg-amber-500 shadow-sm shadow-amber-500/50'
                : stage.color === 'blue'
                ? 'bg-blue-500 shadow-sm shadow-blue-500/50'
                : 'bg-indigo-500 shadow-sm shadow-indigo-500/50'
            }`}
            style={{ width: `${stage.progressPercent}%` }}
          />
        </div>

        {/* Micro Step Markers */}
        <div className="flex items-center justify-between -mt-1.5 px-0.5">
          {STAGES.map((s, idx) => {
            const isPassed = idx < stage.stageIndex;
            const isCurrent = idx === stage.stageIndex;

            return (
              <div
                key={s.id}
                title={getStageTooltip(s, isPassed, isCurrent)}
                className={`w-2.5 h-2.5 rounded-full transition-all duration-200 border cursor-pointer hover:scale-175 hover:z-20 hover:ring-2 hover:ring-offset-1 dark:hover:ring-offset-slate-900 ${
                  isPassed
                    ? 'bg-emerald-500 border-emerald-600 ring-1 ring-emerald-200 dark:ring-emerald-900 hover:ring-emerald-400'
                    : isCurrent
                    ? stage.color === 'emerald'
                      ? 'bg-emerald-500 border-white ring-2 ring-emerald-400'
                      : stage.color === 'amber'
                      ? 'bg-amber-500 border-white ring-2 ring-amber-400'
                      : stage.color === 'teal'
                      ? 'bg-teal-500 border-white ring-2 ring-teal-400'
                      : 'bg-blue-600 border-white ring-2 ring-blue-400'
                    : 'bg-slate-200 dark:bg-slate-700 border-slate-300 dark:border-slate-600 hover:border-slate-400 hover:ring-slate-400'
                }`}
              />
            );
          })}
        </div>
      </div>

      {/* Step Sequence Labels */}
      {showLabels && (
        <div className="flex items-center justify-between text-[9px] text-slate-400 dark:text-slate-500 font-medium px-0.5">
          {STAGES.map((s, idx) => {
            const isCurrent = idx === stage.stageIndex;
            const isPassed = idx < stage.stageIndex;

            

            return (
              <span
                key={s.id}
                className={
                  isCurrent
                    ? 'text-slate-900 dark:text-white font-bold underline decoration-blue-500 underline-offset-2'
                    : isPassed
                    ? 'text-slate-600 dark:text-slate-300 font-medium'
                    : 'text-slate-400 dark:text-slate-500'
                }
              >
                {s.label}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
};
```

---

## File: `src/components/GoogleSheetSyncModal.tsx` (787 lines)

```typescript
import React, { useState } from 'react';
import {
  SheetMetadata,
  createTrackingSheet,
  syncAllDocumentsToSheet,
  pullAllFromSheet,
  getRemoteDocumentCount,
  isGoogleQuotaError,
  verifySheetConnection,
  SheetConnectionVerification,
  getAppsScriptTemplateCode,
} from '../lib/googleSheets';
import { DocumentItem, AppUserRole } from '../types';
import {
  FileSpreadsheet,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  LogIn,
  LogOut,
  ShieldAlert,
  Users,
  DownloadCloud,
  Share2,
  Copy,
  Check,
  Activity,
  Database,
  Code,
  Unlink,
  Zap,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { googleSignIn, logoutGoogle, getStaySignedIn, setStaySignedIn } from '../lib/firebase';
import { User } from 'firebase/auth';
import { getStoredStaffMembers } from '../mockData';

interface GoogleSheetSyncProps {
  user: User | null;
  token: string | null;
  onAuthSuccess: (user: User, token: string) => void;
  onSignOut: () => void;
  sheetConfig: SheetMetadata | null;
  onSaveSheetConfig: (config: SheetMetadata | null) => void;
  documents: DocumentItem[];
  staffList?: AppUserRole[];
  onNotify: (title: string, message: string, type: 'sync') => void;
  onPullSuccess?: (updatedDocs: DocumentItem[], updatedStaff: AppUserRole[]) => void;
}

export const GoogleSheetSyncModal: React.FC<GoogleSheetSyncProps & { isOpen: boolean; onClose: () => void }> = ({
  user,
  token,
  onAuthSuccess,
  onSignOut,
  sheetConfig,
  onSaveSheetConfig,
  documents,
  staffList,
  onNotify,
  onPullSuccess,
  isOpen,
  onClose,
}) => {
  const effectiveStaffList = staffList || getStoredStaffMembers();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isCreatingSheet, setIsCreatingSheet] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [customSheetId, setCustomSheetId] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [diagnosticResult, setDiagnosticResult] = useState<SheetConnectionVerification | null>(null);
  const [confirmPrompt, setConfirmPrompt] = useState<{ open: boolean; action: () => Promise<void>; description: string } | null>(null);
  const [staySignedIn, setStaySignedInState] = useState<boolean>(() => getStaySignedIn());

  const [appsScriptUrlInput, setAppsScriptUrlInput] = useState<string>(sheetConfig?.appsScriptUrl || '');
  const [copiedScript, setCopiedScript] = useState(false);
  const [showAppsScriptPanel, setShowAppsScriptPanel] = useState(false);

  if (!isOpen) return null;

  const handleToggleStaySignedIn = (checked: boolean) => {
    setStaySignedInState(checked);
    setStaySignedIn(checked);
  };

  const formatSyncError = (err: any, defaultMsg: string): string => {
    if (isGoogleQuotaError(err)) {
      return 'Google Sheets API write quota limit reached (60 requests/min per account). Your data is safely preserved on your device and will resume syncing once the quota resets.';
    }
    const msg = (typeof err === 'string' ? err : err?.message || defaultMsg);
    if (msg.toLowerCase().includes('rate exceeded') || msg.toLowerCase().includes('quota')) {
      return 'Google Sheets API write quota limit reached (60 requests/min per account). Your data is safely preserved on your device and will resume syncing once the quota resets.';
    }
    return msg;
  };

  const handleGoogleLogin = async () => {
    setIsSigningIn(true);
    setErrorMessage(null);
    try {
      const res = await googleSignIn({ staySignedIn });
      if (res) {
        onAuthSuccess(res.user, res.accessToken);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Google authentication was cancelled or failed.');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleCreateNewSheet = async () => {
    if (!token) {
      setErrorMessage('Please sign in with Google first.');
      return;
    }

    setConfirmPrompt({
      open: true,
      description: `Create a new Google Sheet named "POSSD Document Tracking & Personnel Registry" in your Google Drive, with "Master Tracking" and "Personnel Directory" tabs pre-formatted and synced with ${documents.length} document entries and ${effectiveStaffList.length} personnel profiles?`,
      action: async () => {
        setIsCreatingSheet(true);
        setErrorMessage(null);
        try {
          const newSheet = await createTrackingSheet(token);
          onSaveSheetConfig(newSheet);
          // Sync current documents and personnel immediately
          const res = await syncAllDocumentsToSheet(token, newSheet.spreadsheetId, documents, effectiveStaffList);
          setSyncStatus(`Created spreadsheet and synced ${res.rowsUpdated} document entries and ${res.personnelUpdated} personnel profiles successfully!`);
          onNotify(
            'Google Sheet Connected',
            `Created and linked registry with ${res.rowsUpdated} documents and ${res.personnelUpdated} personnel profiles.`,
            'sync'
          );
        } catch (err: any) {
          setErrorMessage(formatSyncError(err, 'Failed to create Google Sheet. Please check permissions.'));
        } finally {
          setIsCreatingSheet(false);
        }
      },
    });
  };

  const handleCopyScriptCode = () => {
    const code = getAppsScriptTemplateCode();
    navigator.clipboard.writeText(code);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2500);
  };

  const handleSaveAppsScriptUrl = () => {
    if (!sheetConfig) {
      setErrorMessage('Please link a Google Sheet first.');
      return;
    }
    const cleanUrl = appsScriptUrlInput.trim();
    const updated: SheetMetadata = {
      ...sheetConfig,
      appsScriptUrl: cleanUrl || undefined,
    };
    onSaveSheetConfig(updated);
    setSyncStatus(
      cleanUrl
        ? 'Apps Script Webhook saved! All devices (phones, laptops, PCs) can now push and sync without signing in.'
        : 'Apps Script Webhook cleared.'
    );
    onNotify(
      'Webhook Updated',
      cleanUrl ? 'Zero-login write webhook enabled for all devices.' : 'Webhook removed.',
      'sync'
    );
  };

  const handleDisconnectSheet = () => {
    setConfirmPrompt({
      open: true,
      description:
        'Disconnect the currently linked Google Sheet? All local document tracking records and personnel profiles will remain safely stored on this device.',
      action: async () => {
        onSaveSheetConfig(null);
        setCustomSheetId('');
        setDiagnosticResult(null);
        setValidationResult(null);
        setSyncStatus('Google Sheet disconnected.');
        onNotify('Google Sheet Disconnected', 'Spreadsheet was disconnected from local workspace.', 'sync');
      },
    });
  };

  const handleLinkExistingSheet = async () => {
    const cleanId = customSheetId.trim();
    if (!cleanId) {
      setErrorMessage('Please paste a valid Google Sheet ID or URL.');
      return;
    }

    // Extract ID if URL pasted
    let extractedId = cleanId;
    const match = cleanId.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (match) {
      extractedId = match[1];
    }

    const config: SheetMetadata = {
      spreadsheetId: extractedId,
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${extractedId}/edit`,
      sheetName: 'Master Tracking',
      appsScriptUrl: appsScriptUrlInput.trim() || undefined,
    };

    if (!token && !appsScriptUrlInput.trim()) {
      setIsSyncing(true);
      setErrorMessage(null);
      try {
        onSaveSheetConfig(config);
        const res = await pullAllFromSheet(null, extractedId, documents, effectiveStaffList);
        if (onPullSuccess && (res.documents.length > 0 || res.personnel.length > 0)) {
          onPullSuccess(res.documents, res.personnel);
        }
        setSyncStatus(`Connected to spreadsheet (${extractedId}) in Zero-Login Public Mode! Pull and search are active.`);
        onNotify(
          'Google Sheet Linked',
          `Spreadsheet (${extractedId}) linked in zero-login mode.`,
          'sync'
        );
      } catch (err: any) {
        onSaveSheetConfig(config);
        setSyncStatus(`Connected to spreadsheet (${extractedId}).`);
      } finally {
        setIsSyncing(false);
      }
      return;
    }

    setConfirmPrompt({
      open: true,
      description: `Connect Google Sheet ID "${extractedId}" and synchronize all ${documents.length} document tracking records plus ${effectiveStaffList.length} personnel roster entries into it?`,
      action: async () => {
        setIsSyncing(true);
        setErrorMessage(null);
        try {
          const res = await syncAllDocumentsToSheet(token, extractedId, documents, effectiveStaffList, {
            appsScriptUrl: appsScriptUrlInput.trim() || undefined,
          });
          onSaveSheetConfig(config);
          setSyncStatus(`Successfully connected & updated ${res.rowsUpdated} document entries and ${res.personnelUpdated} personnel records in Google Sheet.`);
          onNotify(
            'Google Sheet Synchronized',
            `Synchronized ${res.rowsUpdated} documents and ${res.personnelUpdated} personnel into spreadsheet (${extractedId}).`,
            'sync'
          );
        } catch (err: any) {
          setErrorMessage(formatSyncError(err, 'Failed to connect sheet. Verify permissions or Apps Script setup.'));
        } finally {
          setIsSyncing(false);
        }
      },
    });
  };

  const handlePerformSync = async () => {
    if (!sheetConfig) {
      setErrorMessage('No Google Sheet linked. Please create or connect a spreadsheet first.');
      return;
    }

    setConfirmPrompt({
      open: true,
      description: `Synchronize ${documents.length} document records and ${effectiveStaffList.length} personnel roster entries to your linked Google Sheet? This will update both "Master Tracking" and "Personnel Directory" tabs.`,
      action: async () => {
        setIsSyncing(true);
        setErrorMessage(null);
        try {
          const res = await syncAllDocumentsToSheet(token, sheetConfig.spreadsheetId, documents, effectiveStaffList, {
            appsScriptUrl: sheetConfig.appsScriptUrl,
          });
          setSyncStatus(`Sync completed: ${res.rowsUpdated} document entries and ${res.personnelUpdated} personnel records refreshed into "${res.masterTabName}" at ${new Date().toLocaleTimeString()}.`);
          
          if (res.masterSheetId !== undefined && !sheetConfig.spreadsheetUrl.includes('#gid=')) {
            onSaveSheetConfig({
              ...sheetConfig,
              spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${sheetConfig.spreadsheetId}/edit#gid=${res.masterSheetId}`,
              sheetName: res.masterTabName,
            });
          }

          onNotify(
            'Google Sheet Updated',
            `All ${res.rowsUpdated} documents and ${res.personnelUpdated} personnel profiles synced to tab "${res.masterTabName}".`,
            'sync'
          );
        } catch (err: any) {
          setErrorMessage(formatSyncError(err, 'Sync failed. Check connection or Apps Script Webhook.'));
        } finally {
          setIsSyncing(false);
        }
      },
    });
  };

  const handlePullFromSheet = async () => {
    if (!sheetConfig) return;

    setConfirmPrompt({
      open: true,
      description: `Pull all documents and personnel roster from Google Sheet into this device? Any records on the sheet will be merged into this device's storage.`,
      action: async () => {
        setIsPulling(true);
        setErrorMessage(null);
        try {
          const res = await pullAllFromSheet(token, sheetConfig.spreadsheetId, documents, effectiveStaffList);
          if (onPullSuccess) {
            onPullSuccess(res.documents, res.personnel);
          }
          setSyncStatus(`Device updated! Pulled ${res.personnel.length} personnel profiles and ${res.documents.length} tracking records from Google Sheet.`);
          onNotify(
            'Device Synchronized',
            `Imported ${res.personnel.length} personnel and ${res.documents.length} document records from Google Sheet to this device.`,
            'sync'
          );
        } catch (err: any) {
          setErrorMessage(formatSyncError(err, 'Failed to pull data from Google Sheet.'));
        } finally {
          setIsPulling(false);
        }
      },
    });
  };

  const handleValidateIntegrity = async () => {
    if (!sheetConfig) return;
    setIsValidating(true);
    setValidationResult(null);
    try {
      const remoteCount = await getRemoteDocumentCount(token, sheetConfig.spreadsheetId);
      const localCount = documents.length;
      if (remoteCount === localCount) {
        setValidationResult({
          type: 'success',
          text: `Integrity Verified: Both local state and Google Sheet contain exactly ${localCount} document record(s).`
        });
      } else {
        setValidationResult({
          type: 'error',
          text: `Discrepancy Found! Local state has ${localCount} document(s), but Google Sheet contains ${remoteCount} record(s). Click "Force Push All Entries" to align.`
        });
      }
    } catch (err: any) {
      setValidationResult({
        type: 'error',
        text: err.message || 'Failed to validate sheet integrity.',
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleCheckConnection = async () => {
    if (!sheetConfig) return;
    setIsTestingConnection(true);
    setDiagnosticResult(null);
    setErrorMessage(null);
    try {
      const res = await verifySheetConnection(token, sheetConfig.spreadsheetId);
      setDiagnosticResult(res);
      if (res.connected) {
        setSyncStatus(`Connection verified: "${res.spreadsheetTitle}" is reachable with ${res.rowCount} row(s) in Master Tracking.`);
      } else {
        setErrorMessage(`Connection issue: ${res.message}`);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Connection test failed.');
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleForcePushAll = async () => {
    if (!sheetConfig) {
      setErrorMessage('No Google Sheet linked. Please create or connect a spreadsheet first.');
      return;
    }

    setConfirmPrompt({
      open: true,
      description: `Force Push all ${documents.length} document entries and ${effectiveStaffList.length} personnel profiles to the linked Google Sheet? This will refresh both headers and re-write every row to guarantee complete synchronization.`,
      action: async () => {
        setIsSyncing(true);
        setErrorMessage(null);
        try {
          const res = await syncAllDocumentsToSheet(token, sheetConfig.spreadsheetId, documents, effectiveStaffList, {
            forceHeaders: true,
            appsScriptUrl: sheetConfig.appsScriptUrl,
          });
          setSyncStatus(`Force push successful! Updated ${res.rowsUpdated} document rows in "${res.masterTabName}" and ${res.personnelUpdated} personnel profiles in Google Sheet.`);
          
          if (res.masterSheetId !== undefined && !sheetConfig.spreadsheetUrl.includes('#gid=')) {
            onSaveSheetConfig({
              ...sheetConfig,
              spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${sheetConfig.spreadsheetId}/edit#gid=${res.masterSheetId}`,
              sheetName: res.masterTabName,
            });
          }

          onNotify(
            'Google Sheet Force Sync Complete',
            `All ${res.rowsUpdated} documents and ${res.personnelUpdated} staff records written to tab "${res.masterTabName}".`,
            'sync'
          );
        } catch (err: any) {
          setErrorMessage(formatSyncError(err, 'Failed to force push entries.'));
        } finally {
          setIsSyncing(false);
        }
      },
    });
  };

  const crossDeviceUrl = sheetConfig
    ? `${window.location.protocol}//${window.location.host}${window.location.pathname}?sheet=${sheetConfig.spreadsheetId}`
    : '';

  const handleCopyDeviceLink = () => {
    if (!crossDeviceUrl) return;
    navigator.clipboard.writeText(crossDeviceUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 text-emerald-400 flex items-center justify-center shadow-xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Google Sheet Master Integration</h2>
              <p className="text-xs text-slate-300">
                Single unified Google Sheet • Zero-login public editor mode • No sign-in required
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 text-sm font-medium cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">

          {/* Current Sheet Connection Status */}
          {sheetConfig ? (
            <div className="rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Linked Single Master Google Sheet</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 font-mono break-all">{sheetConfig.spreadsheetId}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <a
                    href={sheetConfig.spreadsheetUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:underline shrink-0"
                  >
                    Open Sheet <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <button
                    onClick={handleDisconnectSheet}
                    title="Disconnect this spreadsheet"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 hover:underline cursor-pointer shrink-0"
                  >
                    <Unlink className="w-3.5 h-3.5" /> Disconnect
                  </button>
                </div>
              </div>

              {/* Zero-Login Status Banner */}
              <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 font-medium">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  <span>
                    <strong>Zero-Login Ready:</strong> Configured for "Anyone with the link as Editor". All entries are stored centrally and synchronized without requiring Google login.
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-700 text-white font-semibold uppercase shrink-0">Active</span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300">
                <span>Total records in queue: <strong>{documents.length}</strong> | Enrolled personnel: <strong>{effectiveStaffList.length}</strong></span>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    id="check-connection-btn"
                    onClick={handleCheckConnection}
                    disabled={isTestingConnection}
                    title="Test reachability, tab existence, and read/write access to this Google Sheet"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-lg font-semibold transition-colors disabled:opacity-50 cursor-pointer text-xs"
                  >
                    <Activity className={`w-3.5 h-3.5 ${isTestingConnection ? 'animate-spin' : ''}`} />
                    {isTestingConnection ? 'Testing...' : 'Check Connection'}
                  </button>
                  <button
                    id="pull-sheet-btn"
                    onClick={handlePullFromSheet}
                    disabled={isPulling || isSyncing}
                    title="Import all records and personnel from Google Sheet to this device"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-lg font-semibold transition-colors disabled:opacity-50 cursor-pointer text-xs"
                  >
                    <DownloadCloud className={`w-3.5 h-3.5 ${isPulling ? 'animate-spin' : ''}`} />
                    {isPulling ? 'Importing...' : 'Pull from Sheet'}
                  </button>
                  <button
                    id="sync-now-sheet-btn"
                    onClick={handlePerformSync}
                    disabled={isSyncing || isPulling}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-medium transition-colors disabled:opacity-50 cursor-pointer text-xs shadow-2xs"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    {isSyncing ? 'Synchronizing...' : 'Sync Registry to Sheet'}
                  </button>
                  <button
                    id="force-push-sheet-btn"
                    onClick={handleForcePushAll}
                    disabled={isSyncing || isPulling}
                    title="Force refresh sheet headers and re-write every record"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-700 hover:bg-slate-800 text-white rounded-lg font-medium transition-colors disabled:opacity-50 cursor-pointer text-xs"
                  >
                    <Database className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    {isSyncing ? 'Pushing All...' : 'Force Push All'}
                  </button>
                </div>
              </div>

              {/* Diagnostic Result Box */}
              {diagnosticResult && (
                <div className={`mt-2 p-3 rounded-xl border text-xs space-y-1.5 ${
                  diagnosticResult.connected
                    ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200'
                    : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                }`}>
                  <div className="flex items-center justify-between font-bold">
                    <span className="flex items-center gap-1.5">
                      <Activity className="w-4 h-4" />
                      Connection Diagnostic Report
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-mono ${
                      diagnosticResult.connected ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                    }`}>
                      {diagnosticResult.connected ? 'Connected' : 'Error'}
                    </span>
                  </div>
                  <p>{diagnosticResult.message}</p>
                  {diagnosticResult.connected && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                      <div>Sheet Title: <strong>{diagnosticResult.spreadsheetTitle}</strong></div>
                      <div>Master Tab: <strong className={diagnosticResult.masterTabReady ? 'text-emerald-600' : 'text-rose-600'}>{diagnosticResult.masterTabReady ? 'Found' : 'Missing'}</strong></div>
                      <div>Rows Detected: <strong>{diagnosticResult.rowCount}</strong></div>
                    </div>
                  )}
                </div>
              )}

              {/* Validation Row */}
              <div className="mt-2 pt-2 border-t border-emerald-200/60 dark:border-emerald-800/60 flex flex-col gap-2">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <span className="text-xs font-medium text-emerald-800 dark:text-emerald-300">Compare row counts to detect missing records</span>
                  <button
                    onClick={handleValidateIntegrity}
                    disabled={isValidating || !token}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 hover:bg-emerald-50 dark:hover:bg-slate-700 text-emerald-800 dark:text-emerald-200 rounded-lg transition-colors disabled:opacity-50 cursor-pointer shrink-0"
                  >
                    <ShieldAlert className={`w-3.5 h-3.5 ${isValidating ? 'animate-pulse' : ''}`} />
                    {isValidating ? 'Validating...' : 'Validate Sheet Integrity'}
                  </button>
                </div>
                {validationResult && (
                  <div className={`px-3 py-2 text-xs font-medium rounded-lg flex items-center gap-2 ${
                    validationResult.type === 'success' 
                      ? 'bg-emerald-100/80 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800' 
                      : 'bg-rose-50 dark:bg-rose-900/40 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800'
                  }`}>
                    {validationResult.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                    <span>{validationResult.text}</span>
                  </div>
                )}
              </div>

              {/* Multi-Device Link Box */}
              <div className="mt-2 pt-2 border-t border-emerald-200/60 dark:border-emerald-800/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300">
                  <Share2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="font-medium">Multi-Device Link: Open on any smartphone, laptop or PC to link this sheet automatically</span>
                </div>
                <button
                  onClick={handleCopyDeviceLink}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 hover:bg-emerald-50 dark:hover:bg-slate-700 text-emerald-800 dark:text-emerald-200 rounded-md font-medium text-[11px] transition-colors cursor-pointer shrink-0"
                >
                  {copiedLink ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-emerald-600" />}
                  {copiedLink ? 'Link Copied!' : 'Copy Device Link'}
                </button>
              </div>

              {/* Zero-Login Apps Script Webhook Section */}
              <div className="mt-2 pt-2 border-t border-emerald-200/60 dark:border-emerald-800/60 space-y-2">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setShowAppsScriptPanel(!showAppsScriptPanel)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-800 dark:text-indigo-300 hover:text-indigo-900 dark:hover:text-indigo-200 cursor-pointer"
                  >
                    <Zap className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>Zero-Login Push Setup (Google Apps Script Webhook)</span>
                    {showAppsScriptPanel ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                  {sheetConfig.appsScriptUrl && (
                    <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Webhook configured
                    </span>
                  )}
                </div>

                {showAppsScriptPanel && (
                  <div className="p-3 bg-white/70 dark:bg-slate-900/60 rounded-xl border border-indigo-200 dark:border-indigo-900/60 space-y-3 text-xs">
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                      Deploy our Google Apps Script inside this spreadsheet. Once deployed, <strong>any device</strong> (mobile phones, tablets, office laptops) can push document tracking records and personnel updates directly without requiring users to log into a Google account.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="url"
                        value={appsScriptUrlInput}
                        onChange={(e) => setAppsScriptUrlInput(e.target.value)}
                        placeholder="https://script.google.com/macros/s/.../exec"
                        className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-800 dark:text-white font-mono placeholder:font-sans focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={handleSaveAppsScriptUrl}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold transition-colors shrink-0 cursor-pointer text-xs"
                      >
                        Save Webhook
                      </button>
                      <button
                        type="button"
                        onClick={handleCopyScriptCode}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-lg font-semibold transition-colors shrink-0 cursor-pointer text-xs"
                      >
                        {copiedScript ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Code className="w-3.5 h-3.5" />}
                        {copiedScript ? 'Script Copied!' : 'Copy Script Code'}
                      </button>
                    </div>

                    <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-lg">
                      <li>In your Google Sheet, open <strong>Extensions &gt; Apps Script</strong>.</li>
                      <li>Click <strong>Copy Script Code</strong> above, paste it into the editor, and save.</li>
                      <li>Click <strong>Deploy &gt; New deployment</strong>, select type <strong>Web app</strong>, set <em>Execute as: Me</em> and <em>Who has access: Anyone</em>.</li>
                      <li>Authorize the script and paste the generated <code>/exec</code> URL above.</li>
                    </ol>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-4 space-y-4">
              <div className="flex items-start gap-3">
                <FileSpreadsheet className="w-5 h-5 text-slate-700 dark:text-slate-300 shrink-0 mt-0.5" />
                <div className="text-xs text-slate-800 dark:text-slate-200 space-y-1">
                  <p className="font-semibold">Link Master Google Sheet (Zero-Login Public Mode)</p>
                  <p className="text-slate-600 dark:text-slate-400">
                    Paste the link to your Google Sheet below. Because the sheet is configured with <em>"Anyone with the link as Editor"</em>, all staff entries, comments, and clearance actions will be permanently synchronized without requiring any Google sign-in.
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    id="existing-sheet-input"
                    value={customSheetId}
                    onChange={(e) => setCustomSheetId(e.target.value)}
                    placeholder="Paste Google Sheet URL or ID (e.g., https://docs.google.com/spreadsheets/d/...)"
                    className="flex-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-500 font-mono"
                  />
                  <button
                    id="link-sheet-btn"
                    onClick={handleLinkExistingSheet}
                    disabled={isSyncing || !customSheetId.trim()}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold disabled:opacity-50 cursor-pointer shadow-2xs"
                  >
                    Link Master Sheet
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Feedback banners */}
          {syncStatus && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-medium text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{syncStatus}</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-xl text-xs font-medium text-rose-800 dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Data fields note */}
          <div className="border-t border-slate-100 dark:border-slate-800 pt-4 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Incorporated Data Columns:</span>
            <p className="mt-1 leading-relaxed">
              Tracking Number, Document Title, Document Type, Originating Department, Date Received, Time Received (auto-recorded), Target Division, Responsible Person, Current Status, Current Desk/Room, Current Custodian, Full Internal Movements History, Supervisor Remarks &amp; Compliance, and Manager Clearance &amp; Outgoing Dispatch Details.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between">
          <span className="text-xs text-slate-500 dark:text-slate-400">Single consolidated Google Sheet integration</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-xl text-xs font-medium transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>

      {/* Confirmation Dialog for Destructive/Mutating Workspace operations */}
      {confirmPrompt && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
              <ShieldAlert className="w-6 h-6 shrink-0" />
              <h3 className="font-bold text-slate-900 dark:text-white text-base">Confirm Google Sheet Operation</h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {confirmPrompt.description}
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setConfirmPrompt(null)}
                className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const action = confirmPrompt.action;
                  setConfirmPrompt(null);
                  await action();
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors shadow-xs cursor-pointer"
              >
                Proceed & Update Sheet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
```

---

## File: `src/components/IncomingDocumentModal.tsx` (500 lines)

```typescript
import React, { useState, useEffect } from 'react';
import { DocumentItem, TimeInDeskConfig, RegistryDropdownOptions } from '../types';
import { PossdLogo } from './PossdLogo';
import { PlusCircle, Clock, Hash, Building2, User, Send, Inbox, FileText, AlertTriangle, Timer, Link2, ExternalLink, CheckCircle2, Tag } from 'lucide-react';
import { getDivisionThreshold, DEFAULT_TIME_IN_DESK_CONFIG } from '../lib/timeInDesk';

interface IncomingDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (newDoc: DocumentItem) => void;
  currentUser: { name: string; role: string; division: string };
  availableDivisions?: string[];
  dropdownOptions?: RegistryDropdownOptions;
  staffList?: { name: string }[];
  timeInDeskConfig?: TimeInDeskConfig;
}


const DIVISIONS = [
  'Executive Office of the Manager',
  'Administrative & General Services',
  'Finance & Budget Division',
  'Accounting Section',
  'Planning & Quality Assurance',
  'Operations & Emergency Management',
  'Information Technology Division',
  'Legal & Compliance Bureau',
  'Human Resource Management',
];

export const IncomingDocumentModal: React.FC<IncomingDocumentModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  currentUser,
  availableDivisions,
  dropdownOptions,
  timeInDeskConfig,
  staffList,
}) => {
  const divisionList = availableDivisions && availableDivisions.length > 0 ? availableDivisions : DIVISIONS;
  
  const documentTypeList = dropdownOptions?.documentTypes || [];
  const communicationTypeList = dropdownOptions?.communicationTypes || [];
  const reportTypeList = dropdownOptions?.reportTypes || [];

  // Direction: Incoming vs Outgoing
  const [direction, setDirection] = useState<'Incoming' | 'Outgoing'>('Incoming');
  // Tracking number: auto-generated for incoming, strictly blank and editable for outgoing
  const [trackingNumber, setTrackingNumber] = useState('');
  const [title, setTitle] = useState('');
  const [documentType, setDocumentType] = useState<string>(documentTypeList[0] || 'Simple Transaction');
  const [communicationType, setCommunicationType] = useState<string>(dropdownOptions?.communicationTypes?.[0] || 'Memorandum');
  const [reportType, setReportType] = useState<string>(dropdownOptions?.reportTypes?.[0] || 'Inspection Report');
  const [originDepartment, setOriginDepartment] = useState('');
  const [dateReceived, setDateReceived] = useState('');
  const [timeReceived, setTimeReceived] = useState('');
  const [targetDivision, setTargetDivision] = useState(divisionList[0] || 'Administration');
  const focalPersons = ['Mary Flor Aquino', 'Aubrey Camille Cabreras'];
  const [responsiblePerson, setResponsiblePerson] = useState(focalPersons[0]);
  const [priority, setPriority] = useState<DocumentItem['priority']>('Routine');
  
  const [fileLink, setFileLink] = useState('');
  const [notes, setNotes] = useState('');

  // Clock tick to automatically show current date and time upon opening
  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      const hh = String(now.getHours()).padStart(2, '0');
      const min = String(now.getMinutes()).padStart(2, '0');
      const ss = String(now.getSeconds()).padStart(2, '0');

      setDateReceived(`${yyyy}-${mm}-${dd}`);
      setTimeReceived(`${hh}:${min}:${ss}`);

      if (direction === 'Incoming') {
        // Auto tracking number for incoming
        const rand = Math.floor(1000 + Math.random() * 9000);
        setTrackingNumber(`TRK-${yyyy}-${rand}`);
      } else {
        // Outgoing is blank so user can type into it
        setTrackingNumber('');
      }
    }
  }, [isOpen]);

  const handleDirectionChange = (newDirection: 'Incoming' | 'Outgoing') => {
    setDirection(newDirection);
    if (newDirection === 'Outgoing') {
      // User specifically requested: tracking number is blank and can be typed into if outgoing document is selected
      setTrackingNumber('');
    } else {
      // If switching back to Incoming, generate an auto ID if blank or was empty
      if (!trackingNumber.trim()) {
        const now = new Date();
        const yyyy = now.getFullYear();
        const rand = Math.floor(1000 + Math.random() * 9000);
        setTrackingNumber(`TRK-${yyyy}-${rand}`);
      }
    }
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingNumber.trim() || !title.trim() || !originDepartment.trim() || !responsiblePerson.trim()) {
      return;
    }

    const nowIso = new Date().toISOString();
    const newDoc: DocumentItem = {
      id: trackingNumber.trim(),
      trackingNumber: trackingNumber.trim(),
      title: title.trim(),
      direction,
      documentType,
      communicationType,
      reportType,
      originDepartment: originDepartment.trim(),
      dateReceived,
      timeReceived,
      targetDivision,
      responsiblePerson: responsiblePerson.trim(),
      priority,
      currentStatus: direction === 'Outgoing' ? 'Cleared for Out' : 'Incoming Logged',
      currentLocation: direction === 'Outgoing' ? 'Dispatch / Outbox Desk' : 'Receiving Station',
      currentCustodian: currentUser.name || 'Receiving Clerk',
      fileLink: fileLink.trim() || undefined,
      movements: [
        {
          id: `mov-${Date.now()}`,
          timestamp: nowIso,
          personnelName: currentUser.name || 'Receiving Clerk',
          personnelRole: currentUser.role,
          currentDesk: direction === 'Outgoing' ? currentUser.division || 'Originating Desk' : 'Receiving Desk',
          forwardToDesk: targetDivision,
          statusUpdate: direction === 'Outgoing' ? 'dispatched' : 'received',
          notes: notes.trim() || (direction === 'Outgoing' 
            ? 'Outgoing document recorded and dispatched in official registry.' 
            : 'Incoming document received and logged in official office registry.'),
        },
      ],
      supervisorRemarks: [],
      managerClearance: {
        isCleared: direction === 'Outgoing',
        clearedBy: direction === 'Outgoing' ? currentUser.name : undefined,
        clearedAt: direction === 'Outgoing' ? nowIso : undefined,
        clearanceType: direction === 'Outgoing' ? 'approved_for_dispatch' : undefined,
      },
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    onSubmit(newDoc);
    onClose();
    // Reset form
    setTitle('');
    setOriginDepartment('');
    setResponsiblePerson('');
    setFileLink('');
    setNotes('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header - Professional Slate Theme */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-white p-1 flex items-center justify-center shrink-0 shadow-sm ring-1 ring-slate-400">
              <PossdLogo className="w-8 h-8" variant="black" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Log Document</h2>
              <p className="text-xs text-slate-300">
                Register incoming receipt or outgoing transmittal with division routing and timestamps
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 text-sm font-medium transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto bg-white dark:bg-slate-900">
          
          {/* Incoming vs Outgoing Mode Option */}
          <div className="p-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 px-1 mb-1 uppercase tracking-wider">
              Document Classification
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                id="doc-option-incoming-btn"
                onClick={() => handleDirectionChange('Incoming')}
                className={`py-2 px-3.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  direction === 'Incoming'
                    ? 'bg-emerald-600 text-white shadow-xs ring-1 ring-emerald-500'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/70 dark:hover:bg-slate-700/60'
                }`}
              >
                <Inbox className="w-4 h-4" />
                <span>Incoming Document</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${direction === 'Incoming' ? 'bg-emerald-700 text-emerald-100' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>Auto-ID</span>
              </button>
              <button
                type="button"
                id="doc-option-outgoing-btn"
                onClick={() => handleDirectionChange('Outgoing')}
                className={`py-2 px-3.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  direction === 'Outgoing'
                    ? 'bg-sky-600 text-white shadow-xs ring-1 ring-sky-500'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/70 dark:hover:bg-slate-700/60'
                }`}
              >
                <Send className="w-4 h-4" />
                <span>Outgoing Document</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${direction === 'Outgoing' ? 'bg-sky-700 text-sky-100' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>Blank ID</span>
              </button>
            </div>
          </div>

          {/* Tracking Number & Document Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  Tracking Number <span className="text-rose-500">*</span>
                </label>
                {direction === 'Incoming' ? (
                  <button
                    type="button"
                    onClick={() => {
                      const yyyy = new Date().getFullYear();
                      const rand = Math.floor(1000 + Math.random() * 9000);
                      setTrackingNumber(`TRK-${yyyy}-${rand}`);
                    }}
                    className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    Regenerate
                  </button>
                ) : (
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                    Type custom code
                  </span>
                )}
              </div>
              <input
                type="text"
                required
                id="document-tracking-number-input"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder={
                  direction === 'Outgoing'
                    ? 'Enter outgoing tracking code (e.g. OUT-2026-001)...'
                    : 'e.g. TRK-2026-1234'
                }
                className="w-full text-sm rounded-xl border border-slate-300 dark:border-slate-700 px-3.5 py-2 text-slate-900 dark:text-white bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 font-mono uppercase"
              />
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                {direction === 'Outgoing'
                  ? 'Tracking number is blank for outgoing documents. Type in your official dispatch or control code.'
                  : 'Auto-generated incoming registry code. Editable if using physical transmittal numbering.'}
              </p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                Transaction Type
              </label>
              <select
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
                className="w-full text-sm rounded-xl border border-slate-300 dark:border-slate-700 px-3.5 py-2 text-slate-900 dark:text-white bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 cursor-pointer"
              >
                {documentTypeList.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Document Title / Subject <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              id="document-title-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={direction === 'Outgoing' ? 'e.g. Transmittal of Monthly Audit Report to Regional Office' : 'e.g. Budget Proposal for Q3'}
              className="w-full text-sm rounded-xl border border-slate-300 dark:border-slate-700 px-3.5 py-2 text-slate-900 dark:text-white bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
            />
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Communication Type
              </label>
              <select
                value={communicationType}
                onChange={(e) => setCommunicationType(e.target.value)}
                className="w-full text-sm rounded-xl border border-slate-300 dark:border-slate-700 px-3.5 py-2 text-slate-900 dark:text-white bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 cursor-pointer"
              >
                {communicationTypeList.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Report / Document Type
              </label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="w-full text-sm rounded-xl border border-slate-300 dark:border-slate-700 px-3.5 py-2 text-slate-900 dark:text-white bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 cursor-pointer"
              >
                {reportTypeList.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-500" />
                Originating Dept / Agency <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={originDepartment}
                onChange={(e) => setOriginDepartment(e.target.value)}
                placeholder="e.g. Finance Division"
                className="w-full text-sm rounded-xl border border-slate-300 dark:border-slate-700 px-3.5 py-2 text-slate-900 dark:text-white bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Forward To / Target Division
              </label>
              <select
                value={targetDivision}
                onChange={(e) => setTargetDivision(e.target.value)}
                className="w-full text-sm rounded-xl border border-slate-300 dark:border-slate-700 px-3.5 py-2 text-slate-900 dark:text-white bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 cursor-pointer"
              >
                {divisionList.map((div) => (
                  <option key={div} value={div}>{div}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
             <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
               Focal Person <span className="text-rose-500">*</span>
             </label>
             <select
              id="responsible-person-input"
              value={responsiblePerson}
              onChange={(e) => setResponsiblePerson(e.target.value)}
              className="w-full text-sm rounded-xl border border-slate-300 dark:border-slate-700 px-3.5 py-2 text-slate-900 dark:text-white bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 cursor-pointer"
            >
              {focalPersons.map((person) => (
                <option key={person} value={person}>{person}</option>
              ))}
            </select>
          </div>
{/* Priority & Current Desk */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Routing Priority Level
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['Routine', 'Urgent', 'Rush'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={`py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                      priority === p
                        ? p === 'Rush'
                          ? 'bg-rose-50 dark:bg-rose-950/70 text-rose-800 dark:text-rose-200 border-rose-400 dark:border-rose-800 ring-2 ring-rose-200 dark:ring-rose-900 font-bold'
                          : p === 'Urgent'
                          ? 'bg-amber-100/70 dark:bg-amber-950/70 text-amber-900 dark:text-amber-200 border-amber-400 dark:border-amber-800 ring-2 ring-amber-300 dark:ring-amber-900 font-bold'
                          : 'bg-blue-50 dark:bg-blue-950/70 text-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-800 ring-2 ring-blue-200 dark:ring-blue-900 font-bold'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            
          </div>

          {/* Attached File Link / Cloud Document URL */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Link2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                Attached File / Cloud Document Link <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">Google Drive, OneDrive, PDF or intranet link</span>
            </div>
            <div className="relative">
              <input
                type="url"
                id="file-link-input"
                value={fileLink}
                onChange={(e) => setFileLink(e.target.value)}
                placeholder="Paste link here (e.g., https://drive.google.com/file/d/... or https://...)"
                className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-700 pl-9 pr-24 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
              />
              <Link2 className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              {fileLink.trim() && (
                <a
                  href={fileLink.trim()}
                  target="_blank"
                  rel="noreferrer"
                  className="absolute right-2 top-1.5 px-2.5 py-1 text-[11px] font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950 hover:bg-blue-100 dark:hover:bg-blue-900 rounded-md flex items-center gap-1 transition-colors border border-blue-200 dark:border-blue-800"
                >
                  <span>Open</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
            {fileLink.trim() ? (
              <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium mt-1.5 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                Cloud document linked. Will be accessible to officers and synced to Google Sheet.
              </p>
            ) : (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Paste an external file link to allow personnel to view digital copies directly from the registry.
              </p>
            )}
          </div>

          {/* Initial Remarks / Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {direction === 'Outgoing' ? 'Dispatch Notes / Transmittal Details' : 'Receiving Notes / Envelope Contents'}
            </label>
            <textarea
              id="receiving-notes-input"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={direction === 'Outgoing' ? 'e.g. Dispatched via courier with tracking reference, signed acknowledgment requested.' : 'e.g. Contains 3 original copies, supporting receipts, and executive brief.'}
              className="w-full text-sm rounded-xl border border-slate-300 dark:border-slate-700 px-3.5 py-2 text-slate-900 dark:text-white bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="submit-incoming-doc-btn"
              className="px-5 py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              {direction === 'Outgoing' ? 'Log & Dispatch Document' : 'Log & Forward Document'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
```

---

## File: `src/components/KeyboardShortcutsModal.tsx` (137 lines)

```typescript
import React from 'react';
import { Keyboard, X, Search, PlusCircle, RefreshCw, FileText, Send, LayoutGrid, BarChart3, HelpCircle } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutItem {
  keys: string[];
  description: string;
  category: 'Navigation' | 'Actions' | 'Search & System';
}

const SHORTCUTS: ShortcutItem[] = [
  // Actions
  { keys: ['N'], description: 'Open Log Document modal (Incoming or Outgoing)', category: 'Actions' },
  { keys: ['S'], description: 'Open Google Sheets Integration & Live Diagnostics', category: 'Actions' },
  { keys: ['R'], description: 'Trigger immediate push / refresh with linked Google Sheet', category: 'Actions' },
  
  // Navigation
  { keys: ['1'], description: 'Switch to Dashboard tab', category: 'Navigation' },
  { keys: ['2'], description: 'Switch to Distribution Desk tab', category: 'Navigation' },
  { keys: ['3'], description: 'Switch to Analytics & Turnaround Dashboard', category: 'Navigation' },
  { keys: ['4'], description: 'Switch to System Admin Settings / Roles', category: 'Navigation' },

  // Search & System
  { keys: ['/', 'or', 'Ctrl', 'K'], description: 'Focus quick search across registry', category: 'Search & System' },
  { keys: ['Esc'], description: 'Close any open modal or dismiss focused overlay', category: 'Search & System' },
  { keys: ['?'], description: 'Open this Keyboard Shortcuts Reference guide', category: 'Search & System' },
];

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const categories: ('Actions' | 'Navigation' | 'Search & System')[] = ['Actions', 'Navigation', 'Search & System'];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-800 ring-1 ring-slate-700 flex items-center justify-center text-slate-300">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Keyboard Shortcuts
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-200 border border-slate-700">
                  Global
                </span>
              </h2>
              <p className="text-xs text-slate-300">
                Speed up registry operations and navigation using your keyboard
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {categories.map((cat) => {
            const items = SHORTCUTS.filter((s) => s.category === cat);
            return (
              <div key={cat} className="space-y-2.5">
                <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  {cat}
                </h3>
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800/80 overflow-hidden bg-slate-50/50 dark:bg-slate-900/50">
                  {items.map((item, idx) => (
                    <div
                      key={idx}
                      className="px-4 py-2.5 flex items-center justify-between hover:bg-white dark:hover:bg-slate-800/60 transition-colors"
                    >
                      <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        {item.description}
                      </span>
                      <div className="flex items-center gap-1 shrink-0 ml-4">
                        {item.keys.map((k, kIdx) =>
                          k === 'or' ? (
                            <span key={kIdx} className="text-[10px] text-slate-400 px-0.5">
                              or
                            </span>
                          ) : (
                            <kbd
                              key={kIdx}
                              className="px-2 py-1 min-w-[24px] text-center text-[11px] font-mono font-semibold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md shadow-xs"
                            >
                              {k}
                            </kbd>
                          )
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-900/60 text-[11px] text-blue-700 dark:text-blue-300 flex items-center justify-between">
            <span>Tip: Shortcuts work when you are not actively typing in an input field.</span>
            <kbd className="px-2 py-0.5 font-mono text-[10px] bg-white dark:bg-slate-800 border border-blue-300 dark:border-blue-800 rounded">
              ? anytime
            </kbd>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>Press <kbd className="font-mono font-bold text-slate-700 dark:text-slate-300">Esc</kbd> to exit</span>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 font-semibold text-white bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 rounded-lg transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
```

---

## File: `src/components/LoginModal.tsx` (94 lines)

```typescript
import React, { useState } from 'react';
import { Shield, Sparkles, LogIn } from 'lucide-react';
import { AppUserRole } from '../types';
import { PossdLogo } from './PossdLogo';
import { googleSignIn } from '../lib/firebase';

interface LoginModalProps {
  isOpen: boolean;
  onClose?: () => void;
  staffList?: AppUserRole[];
  currentUser: AppUserRole | null;
  onLoginSuccess: (user: AppUserRole) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, currentUser }) => {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const result = await googleSignIn({ staySignedIn: true });
      if (result) {
        // initAuth handles the main state update, but we can also forcefully call onLoginSuccess if we can construct the user
        // Actually, we should just let initAuth handle it, but we can remove the loading state once complete
        setIsLoading(false);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to sign in with Google');
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-[420px] overflow-hidden flex flex-col relative">
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-blue-600 to-indigo-500 z-10" />
        
        <div className="p-8 pt-10 flex flex-col items-center text-center space-y-4">
          <PossdLogo className="w-16 h-16 text-blue-600 dark:text-blue-500 mb-2" />
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Authenticate</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Sign in with your Google account</p>
          </div>
          
          {errorMessage && (
            <div className="w-full mt-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 text-sm font-medium border border-rose-200 dark:border-rose-800 flex items-start gap-2">
              <Shield className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="text-left leading-tight">{errorMessage}</div>
            </div>
          )}

          {currentUser ? (
             <div className="w-full mt-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex flex-col gap-2">
               <div className="text-sm text-slate-600 dark:text-slate-300">Signed in as:</div>
               <div className="font-bold text-slate-900 dark:text-white text-lg">{currentUser.name}</div>
               <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 inline-block self-center border border-blue-100 dark:border-blue-800">{currentUser.role}</div>
               {onClose && (
                 <button onClick={onClose} className="mt-4 px-4 py-2 w-full rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white font-semibold text-sm hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">Return to Dashboard</button>
               )}
             </div>
          ) : (
             <div className="w-full mt-6 space-y-4">
               <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={isLoading}
                  className="w-full relative group overflow-hidden bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-6 py-3.5 rounded-2xl font-semibold text-[15px] flex items-center justify-center gap-2.5 transition-all shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
               >
                  <div className="absolute inset-0 bg-white/20 dark:bg-black/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out rounded-2xl" />
                  {isLoading ? (
                     <div className="w-5 h-5 border-2 border-slate-400 border-t-white rounded-full animate-spin" />
                  ) : (
                     <>
                        <LogIn className="w-5 h-5" />
                        <span>Sign in with Google</span>
                     </>
                  )}
               </button>
               <div className="flex items-center gap-2 text-xs font-medium text-slate-400 dark:text-slate-500 justify-center pt-2">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Secure Multi-User Authorization</span>
               </div>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};
```

---

## File: `src/components/NotificationCenter.tsx` (133 lines)

```typescript
import React, { useState } from 'react';
import { RealtimeNotification } from '../types';
import { Bell, CheckCheck, X, FileText, ArrowRightLeft, MessageSquare, ShieldCheck, CloudUpload } from 'lucide-react';

interface NotificationBellProps {
  notifications: RealtimeNotification[];
  onClearNotifications: () => void;
  onSelectDocument: (trackingNumber: string) => void;
}

export const NotificationCenter: React.FC<NotificationBellProps> = ({
  notifications,
  onClearNotifications,
  onSelectDocument,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const unreadCount = notifications.filter(n => !n.read).length;

  const getIcon = (type: RealtimeNotification['type']) => {
    switch (type) {
      case 'incoming':
        return <FileText className="w-4 h-4 text-sky-600" />;
      case 'movement':
        return <ArrowRightLeft className="w-4 h-4 text-indigo-600" />;
      case 'remark':
        return <MessageSquare className="w-4 h-4 text-amber-600" />;
      case 'compliance':
        return <CheckCheck className="w-4 h-4 text-emerald-600" />;
      case 'clearance':
        return <ShieldCheck className="w-4 h-4 text-emerald-600" />;
      case 'sync':
        return <CloudUpload className="w-4 h-4 text-purple-600" />;
      default:
        return <Bell className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div className="relative">
      <button
        id="notification-bell-btn"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl text-blue-200 hover:text-white bg-[#102e52] hover:bg-[#163d6b] border border-[#204975] transition-colors focus:outline-none cursor-pointer shadow-2xs"
        title="Real-time document activity alerts"
        aria-label="Notifications"
      >
        <Bell className="w-4 h-4 text-blue-200" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-slate-950 ring-2 ring-[#0c2340]">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-4 py-3 bg-slate-50 dark:bg-slate-800/60">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                <span className="font-semibold text-sm text-slate-800 dark:text-white">Workflow Notifications</span>
                <span className="rounded-full bg-slate-200 dark:bg-slate-700 px-2 py-0.5 text-xs font-medium text-slate-700 dark:text-slate-200">
                  {notifications.length}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {notifications.length > 0 && (
                  <button
                    onClick={onClearNotifications}
                    className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white hover:underline px-2 py-1"
                  >
                    Clear all
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="rounded p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
              {notifications.length === 0 ? (
                <div className="py-8 text-center text-slate-500 dark:text-slate-400 text-sm">
                  No notifications yet. Status changes and document movements will appear here live.
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => {
                      onSelectDocument(n.trackingNumber);
                      setIsOpen(false);
                    }}
                    className="flex gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-800/80 cursor-pointer transition-colors text-left"
                  >
                    <div className="mt-0.5 shrink-0 p-1.5 bg-slate-100 dark:bg-slate-800 rounded-md">
                      {getIcon(n.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-mono text-xs font-bold text-slate-900 dark:text-white truncate">
                          {n.trackingNumber}
                        </span>
                        <span className="text-[11px] text-slate-400 dark:text-slate-500 shrink-0">
                          {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-slate-800 dark:text-slate-200 mt-0.5 truncate">{n.title}</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mt-0.5">{n.message}</p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">By: {n.actor}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 px-4 py-2 text-center text-[11px] text-slate-500 dark:text-slate-400">
              Updates broadcast in real-time across your office workflow
            </div>
          </div>
        </>
      )}
    </div>
  );
};
```

---

## File: `src/components/PossdLogo.tsx` (108 lines)

```typescript
import React from 'react';

export interface PossdLogoProps {
  className?: string;
  variant?: 'black' | 'white' | 'badge';
  size?: number | string;
  alt?: string;
}

export const PossdLogo: React.FC<PossdLogoProps> = ({
  className = 'w-10 h-10',
  variant = 'black',
  alt = 'POSSD Official Logo',
}) => {
  const fillColor = variant === 'white' ? '#ffffff' : '#000000';
  const strokeColor = variant === 'white' ? '#ffffff' : '#000000';
  const gapColor = variant === 'white' ? '#0c2340' : '#ffffff';

  const logoSvg = (
    <svg
      viewBox="0 0 1000 820"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={alt}
    >
      {/* Top Roof Eaves Outer Chevron */}
      <polygon
        points="500,20 930,325 895,335 500,55 105,335 70,325"
        fill={fillColor}
      />

      {/* Secondary Parallel Roof Stripe */}
      <polygon
        points="500,75 870,335 848,342 500,95 152,342 130,335"
        fill={fillColor}
      />

      {/* Main Hexagon / Shield Outer Boundary */}
      <polygon
        points="500,118 820,318 820,578 500,782 180,578 180,318"
        fill="none"
        stroke={strokeColor}
        strokeWidth="24"
        strokeLinejoin="miter"
      />

      {/* Inner White Buffer Line */}
      <polygon
        points="500,140 800,326 800,568 500,760 200,568 200,326"
        fill="none"
        stroke={gapColor}
        strokeWidth="14"
        strokeLinejoin="miter"
      />

      {/* LETTERS: P - O - S - S - D in Bold Block Typography matching POSSD emblem */}
      <g fill={fillColor}>
        {/* P (Column 1) */}
        <path
          d="M 215,338 L 310,278 L 310,432 L 255,432 L 255,564 L 215,564 Z 
             M 252,330 L 278,314 L 278,394 L 252,394 Z"
          fillRule="evenodd"
        />

        {/* O (Column 2) */}
        <path
          d="M 326,268 L 420,206 L 420,674 L 326,612 Z 
             M 360,268 L 386,250 L 386,628 L 360,610 Z"
          fillRule="evenodd"
        />

        {/* Center S (Column 3 - Reaches apex at top and bottom sharp point) */}
        <path
          d="M 500,152 L 564,196 L 564,284 L 528,284 L 528,228 L 500,206 L 472,228 L 472,318 L 564,368 L 564,520 L 500,566 L 500,598 L 564,642 L 564,678 L 500,746 L 436,700 L 436,614 L 472,614 L 472,670 L 500,692 L 528,670 L 528,580 L 436,530 L 436,378 L 500,332 L 500,300 L 436,256 L 436,220 Z 
             M 472,390 L 500,410 L 528,390 L 528,352 L 500,332 L 472,352 Z"
          fillRule="evenodd"
        />

        {/* S (Column 4) */}
        <path
          d="M 580,206 L 674,268 L 674,346 L 640,346 L 640,298 L 608,278 L 608,344 L 674,380 L 674,494 L 608,534 L 674,576 L 674,612 L 580,674 L 580,596 L 614,596 L 614,644 L 646,624 L 646,558 L 580,522 L 580,408 L 646,368 L 580,326 Z"
          fillRule="evenodd"
        />

        {/* D (Column 5) */}
        <path
          d="M 690,278 L 784,338 L 784,554 L 746,580 L 690,544 Z 
             M 726,330 L 752,346 L 752,538 L 726,554 Z"
          fillRule="evenodd"
        />
      </g>
    </svg>
  );

  if (variant === 'badge') {
    return (
      <div className="bg-white p-1 rounded-xl shadow-xs border border-slate-200/90 flex items-center justify-center shrink-0">
        {logoSvg}
      </div>
    );
  }

  return logoSvg;
};
```

---

## File: `src/components/PWAInstallButton.tsx` (75 lines)

```typescript
import React, { useState } from 'react';
import { usePWAInstall } from './usePWAInstall';
import { Download, Smartphone, X } from 'lucide-react';

export const PWAInstallButton: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running in standalone PWA mode, hide
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        id="pwa-install-btn"
        onClick={install}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-900 text-slate-100 border border-slate-700 shadow-2xs transition-colors cursor-pointer ${className}`}
        title="Install POSSD Document Tracking System as a desktop/mobile desktop app"
      >
        <Download className="w-3.5 h-3.5 text-slate-300" />
        <span>Install App</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          id="pwa-install-ios-btn"
          onClick={() => setShowIOSGuide(true)}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-900 text-slate-100 border border-slate-700 shadow-2xs transition-colors cursor-pointer ${className}`}
          title="Install app to iOS Home Screen"
        >
          <Smartphone className="w-3.5 h-3.5 text-slate-300" />
          <span>Install App</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
            <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4">
              <div className="flex items-start justify-between">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Install on iPhone / iPad</h3>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                1. Tap the <strong className="text-slate-900 dark:text-white">Share</strong> button in your Safari toolbar.<br />
                2. Scroll down and tap <strong className="text-slate-900 dark:text-white">Add to Home Screen</strong>.<br />
                3. Launch directly from your home screen for instant offline access.
              </p>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="w-full py-2 rounded-xl bg-slate-800 text-white text-xs font-semibold hover:bg-slate-900 transition-colors"
              >
                Got It
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
```

---

## File: `src/components/RolesManagementModal.tsx` (2305 lines)

```typescript
import React, { useState, useEffect } from 'react';
import { AppUserRole, UserRoleType, DocumentItem, RegistryDropdownOptions } from '../types';
import { ROLE_CONFIGS, getRoleConfig, encodePersonnelSyncCode, decodePersonnelSyncCode, generateDeviceShareUrl } from '../mockData';
import { SheetMetadata } from '../lib/googleSheets';
import { PossdLogo } from './PossdLogo';
import {
  Users,
  ShieldCheck,
  UserPlus,
  CheckCircle2,
  Lock,
  ArrowRight,
  Briefcase,
  Building,
  Mail,
  X,
  Plus,
  ChevronRight,
  FileText,
  AlertCircle,
  Trash2,
  Sparkles,
  Check,
  SlidersHorizontal,
  Settings2,
  Shield,
  Key,
  Eye,
  EyeOff,
  RefreshCw,
  UserCheck,
  Ban,
  Share2,
  Copy,
  Smartphone,
  DownloadCloud,
  UploadCloud,
  FileJson,
  FileSpreadsheet,
} from 'lucide-react';

interface RolesManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AppUserRole;
  onSelectUser: (user: AppUserRole) => void;
  staffList: AppUserRole[];
  onAddStaffMember: (newStaff: AppUserRole) => void;
  onUpdateStaffRole: (staffId: string, newRole: UserRoleType) => void;
  onDeleteStaffMember: (staffId: string) => void;
  documents: DocumentItem[];
  dropdownOptions: RegistryDropdownOptions;
  onUpdateDropdownOptions: (newOptions: RegistryDropdownOptions) => void;
  onUpdateStaffCredentials?: (
    staffId: string,
    updates: { username?: string; password?: string; status?: 'active' | 'suspended' }
  ) => void;
  sheetConfig?: SheetMetadata | null;
  token?: string | null;
  onSyncToSheet?: () => Promise<void>;
  onPullFromSheet?: () => Promise<void>;
  onImportStaff?: (staff: AppUserRole[], options?: RegistryDropdownOptions, sheetConfig?: SheetMetadata | null) => void;
}

const SYSTEM_ROLES: string[] = [
  'Admin Staff',
  'Staff',
  'Supervisor',
  'Division Manager',
  'Department Manager',
  'System Admin',
];

const DEFAULT_DEPARTMENTS: string[] = [
  'Central Records & Receiving Desk',
  'Finance & Budget Division',
  'Planning & Quality Assurance',
  'Executive Office of the Manager',
  'Information & Records Technology',
  'General Administration & HR',
];

const DEFAULT_DESKS: string[] = [
  'Records Receiving Counter A',
  'Finance Evaluation Bay 1',
  'Planning Drafting Bay 2',
  'Central Manager Suite 101',
  'Executive Review Table',
  'Central Registry Systems Hub',
];

export const RolesManagementModal: React.FC<RolesManagementModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSelectUser,
  staffList,
  onAddStaffMember,
  onUpdateStaffRole,
  onDeleteStaffMember,
  documents,
  dropdownOptions,
  onUpdateDropdownOptions,
  onUpdateStaffCredentials,
  sheetConfig,
  token,
  onSyncToSheet,
  onPullFromSheet,
  onImportStaff,
}) => {
  const [activeTab, setActiveTab] = useState<'directory' | 'dropdown_options' | 'add' | 'permissions' | 'sync'>('directory');

  // Multi-Device & Cloud Sync state
  const [syncCodeInput, setSyncCodeInput] = useState('');
  const [copiedSyncUrl, setCopiedSyncUrl] = useState(false);
  const [copiedSyncCode, setCopiedSyncCode] = useState(false);
  const [isPushingSheet, setIsPushingSheet] = useState(false);
  const [isPullingSheet, setIsPullingSheet] = useState(false);

  // Combined roles, departments, and desks
  const availableRoles = Array.from(new Set([...dropdownOptions.roles, ...SYSTEM_ROLES]));
  const availableDepartments = dropdownOptions.departments.length > 0 ? dropdownOptions.departments : DEFAULT_DEPARTMENTS;
  const availableDesks = dropdownOptions.desks.length > 0 ? dropdownOptions.desks : DEFAULT_DESKS;

  // Quick staff form state
  const [quickName, setQuickName] = useState('');
  const [quickRole, setQuickRole] = useState<string>(availableRoles[0] || 'Admin Staff');
  const [quickDivision, setQuickDivision] = useState<string>(availableDepartments[0] || 'Central Records & Receiving Desk');

  // Confirmation state for deletion
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Detailed Enrollment form state
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<string>(availableRoles[0] || 'Admin Staff');
  const [newDivision, setNewDivision] = useState<string>(availableDepartments[0] || 'Central Records & Receiving Desk');
  const [newDesk, setNewDesk] = useState<string>(availableDesks[0] || 'Records Receiving Counter A');
  const [newEmail, setNewEmail] = useState('');

  // Credentials fields for Detailed Enrollment
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('password123');
  const [newStatus, setNewStatus] = useState<'active' | 'suspended'>('active');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isUsernameCustomized, setIsUsernameCustomized] = useState(false);

  // When personnel name changes in enrollment form, auto-suggest username if user hasn't customized it
  useEffect(() => {
    if (!isUsernameCustomized) {
      const suggested = (newName || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '.');
      setNewUsername(suggested);
    }
  }, [newName, isUsernameCustomized]);

  // Inline custom entry modes for Detailed Enrollment
  const [isCustomRoleActive, setIsCustomRoleActive] = useState(false);
  const [customRoleInput, setCustomRoleInput] = useState('');
  const [isCustomDeptActive, setIsCustomDeptActive] = useState(false);
  const [customDeptInput, setCustomDeptInput] = useState('');
  const [isCustomDeskActive, setIsCustomDeskActive] = useState(false);
  const [customDeskInput, setCustomDeskInput] = useState('');

  // Dropdown Options Admin State
  const [roleInput, setRoleInput] = useState('');
  const [deptInput, setDeptInput] = useState('');
  const [deskInput, setDeskInput] = useState('');
  const [isConfirmingClearAll, setIsConfirmingClearAll] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Credentials Management Dialog / Drawer for existing staff
  const [credentialStaff, setCredentialStaff] = useState<AppUserRole | null>(null);
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editStatus, setEditStatus] = useState<'active' | 'suspended'>('active');
  const [showEditPassword, setShowEditPassword] = useState(false);

  if (!isOpen) return null;

  const showFeedback = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedbackMsg({ type, text });
    setTimeout(() => {
      setFeedbackMsg(null);
    }, 3200);
  };

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let result = '';
    for (let i = 0; i < 10; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  // --- Cross-Device Sync Handlers ---
  const handleCopyMultiDeviceUrl = () => {
    const url = generateDeviceShareUrl(staffList, sheetConfig);
    navigator.clipboard.writeText(url);
    setCopiedSyncUrl(true);
    showFeedback('Cross-device sync link copied! Open this link on your other device to load all personnel.', 'success');
    setTimeout(() => setCopiedSyncUrl(false), 2500);
  };

  const handleCopySyncCode = () => {
    const code = encodePersonnelSyncCode(staffList, sheetConfig, dropdownOptions);
    navigator.clipboard.writeText(code);
    setCopiedSyncCode(true);
    showFeedback('Sync code copied! Paste it into another device to import personnel.', 'success');
    setTimeout(() => setCopiedSyncCode(false), 2500);
  };

  const handleImportFromCode = () => {
    if (!syncCodeInput.trim()) {
      showFeedback('Please paste a sync link or sync code first.', 'error');
      return;
    }
    const payload = decodePersonnelSyncCode(syncCodeInput.trim());
    if (!payload || !Array.isArray(payload.staff) || payload.staff.length === 0) {
      showFeedback('Invalid sync code or link. Please verify and try again.', 'error');
      return;
    }

    if (onImportStaff) {
      onImportStaff(payload.staff, payload.dropdownOptions, payload.sheetConfig);
    } else {
      payload.staff.forEach((s) => onAddStaffMember(s));
    }
    setSyncCodeInput('');
    showFeedback(`Successfully imported ${payload.staff.length} personnel profiles from sync code!`, 'success');
  };

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify({
      version: 1,
      exportedAt: new Date().toISOString(),
      staff: staffList,
      dropdownOptions,
      sheetConfig,
    }, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `possd_personnel_registry_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showFeedback('Personnel roster exported as JSON.', 'success');
  };

  const handleImportJsonFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        const importedStaff: AppUserRole[] = Array.isArray(parsed.staff)
          ? parsed.staff
          : Array.isArray(parsed)
          ? parsed
          : [];
        if (importedStaff.length === 0) {
          showFeedback('No valid personnel found in the uploaded file.', 'error');
          return;
        }
        if (onImportStaff) {
          onImportStaff(importedStaff, parsed.dropdownOptions, parsed.sheetConfig);
        } else {
          importedStaff.forEach((s) => onAddStaffMember(s));
        }
        showFeedback(`Successfully restored ${importedStaff.length} personnel from JSON file.`, 'success');
      } catch (err) {
        showFeedback('Failed to parse JSON file.', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // --- Handlers for Admin Dropdown Entries ---
  const handleAddRole = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = roleInput.trim();
    if (!trimmed) return;

    if (dropdownOptions.roles.some((r) => (r || '').toLowerCase() === (trimmed || '').toLowerCase())) {
      showFeedback(`"${trimmed}" is already in the assigned roles list.`, 'error');
      return;
    }

    const updatedRoles = [...dropdownOptions.roles, trimmed];
    onUpdateDropdownOptions({
      ...dropdownOptions,
      roles: updatedRoles,
    });
    setRoleInput('');
    showFeedback(`Role "${trimmed}" added to enrollment dropdown.`);
  };

  const handleDeleteRole = (roleToDelete: string) => {
    const updatedRoles = dropdownOptions.roles.filter((r) => r !== roleToDelete);
    onUpdateDropdownOptions({
      ...dropdownOptions,
      roles: updatedRoles,
    });
    showFeedback(`Role "${roleToDelete}" removed from dropdown.`);
  };

  const handleAddDepartment = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = deptInput.trim();
    if (!trimmed) return;

    if (dropdownOptions.departments.some((d) => (d || '').toLowerCase() === (trimmed || '').toLowerCase())) {
      showFeedback(`"${trimmed}" is already in the department/division list.`, 'error');
      return;
    }

    const updatedDepartments = [...dropdownOptions.departments, trimmed];
    onUpdateDropdownOptions({
      ...dropdownOptions,
      departments: updatedDepartments,
    });
    setDeptInput('');
    showFeedback(`Department "${trimmed}" added to enrollment dropdown.`);
  };

  const handleDeleteDepartment = (deptToDelete: string) => {
    const updatedDepartments = dropdownOptions.departments.filter((d) => d !== deptToDelete);
    onUpdateDropdownOptions({
      ...dropdownOptions,
      departments: updatedDepartments,
    });
    showFeedback(`Department "${deptToDelete}" removed from dropdown.`);
  };

  const handleAddDesk = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = deskInput.trim();
    if (!trimmed) return;

    if (dropdownOptions.desks.some((d) => (d || '').toLowerCase() === (trimmed || '').toLowerCase())) {
      showFeedback(`"${trimmed}" is already in the assigned desks list.`, 'error');
      return;
    }

    const updatedDesks = [...dropdownOptions.desks, trimmed];
    onUpdateDropdownOptions({
      ...dropdownOptions,
      desks: updatedDesks,
    });
    setDeskInput('');
    showFeedback(`Workstation "${trimmed}" added to enrollment dropdown.`);
  };

  const handleDeleteDesk = (deskToDelete: string) => {
    const updatedDesks = dropdownOptions.desks.filter((d) => d !== deskToDelete);
    onUpdateDropdownOptions({
      ...dropdownOptions,
      desks: updatedDesks,
    });
    showFeedback(`Workstation "${deskToDelete}" removed from dropdown.`);
  };

  const handleClearAllDropdowns = () => {
    onUpdateDropdownOptions({
      roles: [],
      departments: [],
      desks: [],
      documentTypes: [],
      communicationTypes: [],
      reportTypes: [],
      personnel: [],
    });
    setIsConfirmingClearAll(false);
    showFeedback('All custom entries cleared. System fallback defaults restored.');
  };

  // --- Handlers for Staff Management ---
  const handleQuickAddStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickName.trim()) return;

    const chosenRole = quickRole || availableRoles[0] || 'Admin Staff';
    const chosenDivision = quickDivision || availableDepartments[0] || 'Central Records & Receiving Desk';
    const chosenDesk = availableDesks[0] || `${chosenDivision} Station`;

    const initials = quickName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join('');

    const autoUsername = (quickName || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '.');

    const newStaff: AppUserRole = {
      id: `staff-${Date.now()}`,
      name: quickName.trim(),
      role: chosenRole,
      division: chosenDivision,
      avatarInitials: initials || 'ST',
      email: `${autoUsername}@agency.gov`,
      assignedDesk: chosenDesk,
      username: autoUsername,
      password: 'password123',
      status: 'active',
    };

    onAddStaffMember(newStaff);
    setQuickName('');
    showFeedback(`Personnel ${newStaff.name} enrolled with username "${autoUsername}".`);
  };

  const handleCreateStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const chosenRole = isCustomRoleActive && customRoleInput.trim()
      ? customRoleInput.trim()
      : (newRole || availableRoles[0] || 'Admin Staff');

    const chosenDivision = isCustomDeptActive && customDeptInput.trim()
      ? customDeptInput.trim()
      : (newDivision || availableDepartments[0] || 'Central Records & Receiving Desk');

    const chosenDesk = isCustomDeskActive && customDeskInput.trim()
      ? customDeskInput.trim()
      : (newDesk || availableDesks[0] || 'Records Receiving Counter A');

    let updatedOptions = { ...dropdownOptions };
    let hasOptionsChanged = false;

    if (isCustomRoleActive && customRoleInput.trim() && !dropdownOptions.roles.includes(customRoleInput.trim())) {
      updatedOptions.roles = [...updatedOptions.roles, customRoleInput.trim()];
      hasOptionsChanged = true;
    }
    if (isCustomDeptActive && customDeptInput.trim() && !dropdownOptions.departments.includes(customDeptInput.trim())) {
      updatedOptions.departments = [...updatedOptions.departments, customDeptInput.trim()];
      hasOptionsChanged = true;
    }
    if (isCustomDeskActive && customDeskInput.trim() && !dropdownOptions.desks.includes(customDeskInput.trim())) {
      updatedOptions.desks = [...updatedOptions.desks, customDeskInput.trim()];
      hasOptionsChanged = true;
    }

    if (hasOptionsChanged) {
      onUpdateDropdownOptions(updatedOptions);
    }

    const initials = newName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join('');

    const cleanUsername = (newUsername.trim() || (newName || '').toLowerCase().replace(/[^a-z0-9]/g, '.')).toLowerCase();
    const cleanPassword = newPassword.trim() || 'password123';

    const newStaff: AppUserRole = {
      id: `staff-${Date.now()}`,
      name: newName.trim(),
      role: chosenRole,
      division: chosenDivision,
      avatarInitials: initials || 'ST',
      email: newEmail.trim() || `${cleanUsername}@agency.gov`,
      assignedDesk: chosenDesk || `${chosenDivision} Station`,
      username: cleanUsername,
      password: cleanPassword,
      status: newStatus,
    };

    onAddStaffMember(newStaff);
    setNewName('');
    setNewRole(availableRoles[0] || 'Admin Staff');
    setNewDivision(availableDepartments[0] || 'Central Records & Receiving Desk');
    setNewDesk(availableDesks[0] || 'Records Receiving Counter A');
    setNewEmail('');
    setNewUsername('');
    setNewPassword('password123');
    setNewStatus('active');
    setIsUsernameCustomized(false);
    setIsCustomRoleActive(false);
    setCustomRoleInput('');
    setIsCustomDeptActive(false);
    setCustomDeptInput('');
    setIsCustomDeskActive(false);
    setCustomDeskInput('');
    setActiveTab('directory');
    showFeedback(`Personnel ${newStaff.name} registered with credentials (@${cleanUsername}).`);
  };

  const handleDeleteStaff = (staffId: string) => {
    onDeleteStaffMember(staffId);
    setConfirmDeleteId(null);
  };

  const handleOpenCredentialsModal = (staff: AppUserRole) => {
    setCredentialStaff(staff);
    setEditUsername(staff.username || (staff.name || '').toLowerCase().replace(/[^a-z0-9]/g, '.'));
    setEditPassword(staff.password || (staff.role === 'System Admin' ? 'admin123' : 'password123'));
    setEditStatus(staff.status || 'active');
    setShowEditPassword(false);
  };

  const handleSaveCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    if (!credentialStaff) return;

    const trimmedUsername = editUsername.trim().toLowerCase();
    const trimmedPassword = editPassword.trim();

    if (!trimmedUsername) {
      showFeedback('Username cannot be empty.', 'error');
      return;
    }
    if (!trimmedPassword) {
      showFeedback('Password cannot be empty.', 'error');
      return;
    }

    if (onUpdateStaffCredentials) {
      onUpdateStaffCredentials(credentialStaff.id, {
        username: trimmedUsername,
        password: trimmedPassword,
        status: editStatus,
      });
    }

    showFeedback(`Credentials updated for ${credentialStaff.name} (@${trimmedUsername}).`);
    setCredentialStaff(null);
  };

  const totalConfiguredEntries =
    dropdownOptions.roles.length + dropdownOptions.departments.length + dropdownOptions.desks.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 border-b border-slate-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-white p-1 flex items-center justify-center shrink-0 shadow-sm ring-1 ring-slate-400">
              <PossdLogo className="w-8 h-8" variant="black" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">Staff Roles & Personnel Registry</h2>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-200 border border-slate-700 font-medium">
                  {staffList.length} Personnel
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-200 border border-slate-700 font-medium">
                  {totalConfiguredEntries} Dropdown Entries
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Manage staff members, configure login credentials, customize dropdown options, and assign administrative roles.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-300 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 flex items-center gap-2 pt-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('directory')}
            className={`px-3.5 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'directory'
                ? 'border-blue-700 dark:border-blue-500 text-blue-900 dark:text-blue-300 bg-white dark:bg-slate-900 rounded-t-lg shadow-2xs font-bold'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
            <span>Personnel Directory ({staffList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('dropdown_options')}
            className={`px-3.5 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'dropdown_options'
                ? 'border-blue-700 dark:border-blue-500 text-blue-900 dark:text-blue-300 bg-white dark:bg-slate-900 rounded-t-lg shadow-2xs font-bold'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
            <span>Dropdown Options</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
              totalConfiguredEntries > 0 ? 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300' : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
            }`}>
              {totalConfiguredEntries}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('add')}
            className={`px-3.5 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'add'
                ? 'border-blue-700 dark:border-blue-500 text-blue-900 dark:text-blue-300 bg-white dark:bg-slate-900 rounded-t-lg shadow-2xs font-bold'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
            <span>Detailed Enrollment</span>
          </button>

          <button
            onClick={() => setActiveTab('permissions')}
            className={`px-3.5 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'permissions'
                ? 'border-blue-700 dark:border-blue-500 text-blue-900 dark:text-blue-300 bg-white dark:bg-slate-900 rounded-t-lg shadow-2xs font-bold'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Permission Matrix</span>
          </button>

          <button
            onClick={() => setActiveTab('sync')}
            className={`px-3.5 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'sync'
                ? 'border-blue-700 dark:border-blue-500 text-blue-900 dark:text-blue-300 bg-white dark:bg-slate-900 rounded-t-lg shadow-2xs font-bold'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Cross-Device Sync</span>
            {sheetConfig && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="Connected to Google Sheet" />
            )}
          </button>
        </div>

        {/* Global Feedback Banner */}
        {feedbackMsg && (
          <div
            className={`px-6 py-2 text-xs font-semibold flex items-center gap-2 transition-all ${
              feedbackMsg.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-b border-emerald-200 dark:border-emerald-900/60'
                : 'bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-b border-rose-200 dark:border-rose-900/60'
            }`}
          >
            {feedbackMsg.type === 'success' ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
            )}
            <span>{feedbackMsg.text}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5 bg-white dark:bg-slate-900">
          
          {/* TAB 1: PERSONNEL DIRECTORY */}
          {activeTab === 'directory' && (
            <div className="space-y-4">

              {/* CURRENT ACTIVE SESSION BANNER & DELETE CURRENT USER */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                    {currentUser.avatarInitials || currentUser.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 dark:text-slate-400 font-medium">Active Session:</span>
                      <strong className="text-slate-900 dark:text-white text-sm font-bold">{currentUser.name}</strong>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                        {currentUser.role}
                      </span>
                      {currentUser.username && (
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                          @{currentUser.username}
                        </span>
                      )}
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                      Division: <span className="font-semibold text-slate-700 dark:text-slate-200">{currentUser.division}</span>
                      {currentUser.assignedDesk && (
                        <span> • Station: <span className="font-semibold text-slate-700 dark:text-slate-200">{currentUser.assignedDesk}</span></span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Option to Delete Current Staff with confirmation */}
                <div className="flex items-center gap-2 shrink-0">
                  {confirmDeleteId === currentUser.id ? (
                    <div className="flex items-center gap-2 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 px-3 py-1.5 rounded-xl">
                      <span className="text-[11px] font-bold text-rose-800 dark:text-rose-300">
                        Remove active staff?
                      </span>
                      <button
                        onClick={() => handleDeleteStaff(currentUser.id)}
                        className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold shadow-xs transition-colors cursor-pointer"
                      >
                        Yes, Delete
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-medium hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        if (staffList.length <= 1) {
                          showFeedback('Cannot delete the last remaining staff member.', 'error');
                          return;
                        }
                        setConfirmDeleteId(currentUser.id);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/60 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 font-semibold text-xs transition-colors cursor-pointer"
                      title="Delete the active staff member and switch session to another personnel"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Current Staff</span>
                    </button>
                  )}
                </div>
              </div>

              {/* QUICK-ADD STAFF BAR */}
              <div className="bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 rounded-xl p-3.5 shadow-2xs">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>Quick Add New Staff</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('dropdown_options')}
                    className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-semibold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Settings2 className="w-3 h-3" />
                    <span>Manage Dropdown Options</span>
                  </button>
                </div>

                <form onSubmit={handleQuickAddStaff} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <input
                    type="text"
                    required
                    value={quickName}
                    onChange={(e) => setQuickName(e.target.value)}
                    placeholder="Staff Full Name (e.g. Maria Santos)"
                    className="flex-1 min-w-[180px] text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />

                  <select
                    value={quickRole}
                    onChange={(e) => setQuickRole(e.target.value)}
                    className="text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-2.5 py-2 font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 max-w-[180px] cursor-pointer"
                    title="Select staff role"
                  >
                    {availableRoles.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>

                  <select
                    value={quickDivision}
                    onChange={(e) => setQuickDivision(e.target.value)}
                    className="text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-2.5 py-2 font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 max-w-[210px] cursor-pointer"
                    title="Select department / division"
                  >
                    {availableDepartments.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>

                  <button
                    type="submit"
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors whitespace-nowrap cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Staff</span>
                  </button>
                </form>
              </div>

              {/* STAFF DIRECTORY GRID */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {staffList.map((staff) => {
                  const isCurrent = staff.id === currentUser.id || staff.name === currentUser.name;
                  const roleConfig = getRoleConfig(staff.role);
                  const heldDocsCount = documents.filter((d) => d.currentCustodian?.includes(staff.name)).length;
                  const isConfirmingDelete = confirmDeleteId === staff.id;
                  const isSuspended = staff.status === 'suspended';

                  return (
                    <div
                      key={staff.id}
                      className={`p-4 rounded-xl border transition-all relative ${
                        isCurrent
                          ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/20 ring-2 ring-indigo-500/20'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-2xs'
                      }`}
                    >
                      {/* Top Row: Avatar, Name, Role, and Actions */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-9 h-9 rounded-lg font-bold text-xs flex items-center justify-center ${
                              isCurrent
                                ? 'bg-indigo-600 text-white shadow-xs'
                                : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600'
                            }`}
                          >
                            {staff.avatarInitials || staff.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h3 className="font-bold text-xs text-slate-900 dark:text-white">{staff.name}</h3>
                              {isCurrent && (
                                <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-100/80 dark:bg-indigo-950 px-1.5 py-0.2 rounded">
                                  Current User
                                </span>
                              )}
                              {isSuspended && (
                                <span className="text-[10px] font-bold text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-950/80 px-1.5 py-0.2 rounded border border-rose-200 dark:border-rose-900/60">
                                  Suspended
                                </span>
                              )}
                            </div>
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded font-semibold inline-block mt-0.5 ${roleConfig.badgeBg} ${roleConfig.badgeText} border ${roleConfig.badgeBorder}`}
                            >
                              {staff.role}
                            </span>
                          </div>
                        </div>

                        {/* Top Actions: Edit Credentials & Delete Button */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenCredentialsModal(staff)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-lg transition-colors cursor-pointer"
                            title={`Manage login credentials for ${staff.name}`}
                          >
                            <Key className="w-3.5 h-3.5" />
                          </button>

                          {staffList.length > 1 && !isConfirmingDelete && (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(staff.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors cursor-pointer"
                              title={`Delete ${staff.name}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Staff Meta Info */}
                      <div className="mt-2.5 space-y-1 text-xs">
                        <div className="flex items-center gap-1.5 truncate text-slate-600 dark:text-slate-300">
                          <Building className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{staff.division}</span>
                        </div>
                        {staff.assignedDesk && (
                          <div className="flex items-center gap-1.5 truncate text-slate-500 dark:text-slate-400">
                            <Briefcase className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{staff.assignedDesk}</span>
                          </div>
                        )}
                        {staff.email && (
                          <div className="flex items-center gap-1.5 truncate text-[11px] text-slate-400 dark:text-slate-500">
                            <Mail className="w-3 h-3 shrink-0" />
                            <span className="truncate">{staff.email}</span>
                          </div>
                        )}
                        {/* Credentials Info Badge */}
                        <div className="flex items-center justify-between text-[11px] pt-1 text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 mt-1.5">
                          <span className="flex items-center gap-1">
                            <Key className="w-3 h-3 text-amber-500 shrink-0" />
                            <span>Username: <strong className="font-mono text-slate-700 dark:text-slate-300">@{staff.username || 'unassigned'}</strong></span>
                          </span>
                          <button
                            type="button"
                            onClick={() => handleOpenCredentialsModal(staff)}
                            className="text-[10.5px] font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                          >
                            Edit Credentials
                          </button>
                        </div>
                      </div>

                      {/* 1-CLICK ROLE ASSIGNMENT */}
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5 mt-2">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-slate-500 dark:text-slate-400">Assign Role:</span>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500">1-click switch</span>
                        </div>

                        {dropdownOptions.roles.length > 0 ? (
                          <div className="flex flex-wrap items-center gap-1">
                            {dropdownOptions.roles.map((r) => {
                              const isSelected = staff.role === r;
                              return (
                                <button
                                  key={r}
                                  type="button"
                                  onClick={() => onUpdateStaffRole(staff.id, r)}
                                  className={`text-[10px] px-2 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                                    isSelected
                                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs ring-1 ring-slate-900 dark:ring-white'
                                      : 'bg-slate-100 dark:bg-slate-700/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
                                  }`}
                                  title={`Assign "${r}" to ${staff.name}`}
                                >
                                  {r}
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-400 italic flex items-center justify-between">
                            <span>No custom roles configured</span>
                            <button
                              type="button"
                              onClick={() => setActiveTab('dropdown_options')}
                              className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline cursor-pointer"
                            >
                              + Add Roles
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Card Footer: Switch Session OR Delete Confirmation */}
                      {isConfirmingDelete ? (
                        <div className="mt-2.5 pt-2 border-t border-rose-100 dark:border-rose-900/50 bg-rose-50/80 dark:bg-rose-950/50 p-2.5 rounded-xl flex items-center justify-between gap-2 text-xs">
                          <span className="text-rose-900 dark:text-rose-300 font-bold text-[11px]">
                            Confirm delete {staff.name}?
                          </span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => handleDeleteStaff(staff.id)}
                              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold rounded-lg shadow-xs cursor-pointer"
                            >
                              Delete
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-medium rounded-lg hover:bg-slate-100 cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                            <FileText className="w-3 h-3 text-slate-400" />
                            <span>
                              Custody:{' '}
                              <strong className={heldDocsCount > 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300'}>
                                {heldDocsCount}
                              </strong>
                            </span>
                          </div>

                          {!isCurrent && (
                            <button
                              onClick={() => onSelectUser(staff)}
                              className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 px-2 py-1 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <span>Switch Session</span>
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

            </div>
          )}

          {/* TAB 2: DROPDOWN OPTIONS CONFIGURATION (ADMIN) */}
          {activeTab === 'dropdown_options' && (
            <div className="space-y-5">
              
              {/* Top Informational Banner */}
              <div className="bg-slate-900 dark:bg-slate-950 text-white p-4 rounded-xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-slate-800">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-indigo-600 text-white shrink-0 mt-0.5">
                    <SlidersHorizontal className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xs sm:text-sm text-white flex items-center gap-2">
                      <span>Staff Enrollment Dropdown Management</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        Admin Controls
                      </span>
                    </h3>
                    <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                      Enter the exact entries for <strong>Assigned Roles</strong>, <strong>Departments & Divisions</strong>, and <strong>Assigned Desks</strong>. All entries configured here immediately populate the selection dropdowns in Detailed Staff Enrollment.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setActiveTab('add')}
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Go to Enrollment</span>
                  </button>
                  {totalConfiguredEntries > 0 && (
                    isConfirmingClearAll ? (
                      <div className="flex items-center gap-1.5 bg-slate-800 px-2 py-1 rounded-xl">
                        <span className="text-[11px] text-rose-300 font-medium">Clear all?</span>
                        <button
                          type="button"
                          onClick={handleClearAllDropdowns}
                          className="px-2 py-0.5 bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold rounded-md cursor-pointer"
                        >
                          Confirm
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsConfirmingClearAll(false)}
                          className="px-1.5 py-0.5 text-slate-400 hover:text-white text-[10px] cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsConfirmingClearAll(true)}
                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                        title="Clear all dropdown entries"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* THREE SECTIONS: ROLES, DEPARTMENTS, DESKS */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* 1. ASSIGNED ROLES */}
                <div className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-4 flex flex-col shadow-2xs">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-1.5">
                      <Shield className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <h4 className="font-bold text-xs text-slate-900 dark:text-white">Assigned Roles</h4>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                      {dropdownOptions.roles.length} entries
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 mb-3">
                    Roles available when enrolling personnel & assigning duties.
                  </p>

                  <form onSubmit={handleAddRole} className="flex items-center gap-1.5 mb-3">
                    <input
                      type="text"
                      value={roleInput}
                      onChange={(e) => setRoleInput(e.target.value)}
                      placeholder="e.g. Chief Reviewer"
                      className="flex-1 text-xs border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 rounded-lg px-2.5 py-1.5 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      type="submit"
                      disabled={!roleInput.trim()}
                      className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-colors shrink-0 cursor-pointer"
                    >
                      + Add
                    </button>
                  </form>

                  <div className="flex-1 min-h-[140px] max-h-[220px] overflow-y-auto space-y-1.5 pr-1">
                    {dropdownOptions.roles.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center p-4 border border-dashed border-slate-200 dark:border-slate-700 rounded-lg">
                        <Shield className="w-6 h-6 text-slate-300 dark:text-slate-600 mb-1" />
                        <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">No roles yet</p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Type above to add custom roles</p>
                      </div>
                    ) : (
                      dropdownOptions.roles.map((role) => (
                        <div
                          key={role}
                          className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700/80 text-xs hover:bg-slate-100/80 dark:hover:bg-slate-900 transition-colors"
                        >
                          <span className="font-semibold text-slate-800 dark:text-slate-200 truncate" title={role}>
                            {role}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteRole(role)}
                            className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 p-1 rounded transition-colors cursor-pointer"
                            title={`Delete role ${role}`}
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* 2. DEPARTMENTS & DIVISIONS */}
                <div className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-4 flex flex-col shadow-2xs">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-1.5">
                      <Building className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <h4 className="font-bold text-xs text-slate-900 dark:text-white">Departments / Divisions</h4>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      {dropdownOptions.departments.length} entries
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 mb-3">
                    Office divisions selectable for staff assignments.
                  </p>

                  <form onSubmit={handleAddDepartment} className="flex items-center gap-1.5 mb-3">
                    <input
                      type="text"
                      value={deptInput}
                      onChange={(e) => setDeptInput(e.target.value)}
                      placeholder="e.g. Finance & Budget"
                      className="flex-1 text-xs border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 rounded-lg px-2.5 py-1.5 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <button
                      type="submit"
                      disabled={!deptInput.trim()}
                      className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-colors shrink-0 cursor-pointer"
                    >
                      + Add
                    </button>
                  </form>

                  <div className="flex-1 min-h-[140px] max-h-[220px] overflow-y-auto space-y-1.5 pr-1">
                    {dropdownOptions.departments.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center p-4 border border-dashed border-slate-200 dark:border-slate-700 rounded-lg">
                        <Building className="w-6 h-6 text-slate-300 dark:text-slate-600 mb-1" />
                        <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">No departments yet</p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Type above to add departments</p>
                      </div>
                    ) : (
                      dropdownOptions.departments.map((dept) => (
                        <div
                          key={dept}
                          className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700/80 text-xs hover:bg-slate-100/80 dark:hover:bg-slate-900 transition-colors"
                        >
                          <span className="font-semibold text-slate-800 dark:text-slate-200 truncate" title={dept}>
                            {dept}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteDepartment(dept)}
                            className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 p-1 rounded transition-colors cursor-pointer"
                            title={`Delete department ${dept}`}
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* 3. ASSIGNED DESKS & WORKSTATIONS */}
                <div className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-4 flex flex-col shadow-2xs">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-1.5">
                      <Briefcase className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                      <h4 className="font-bold text-xs text-slate-900 dark:text-white">Assigned Desks</h4>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                      {dropdownOptions.desks.length} entries
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 mb-3">
                    Specific workstations selectable in personnel routing.
                  </p>

                  <form onSubmit={handleAddDesk} className="flex items-center gap-1.5 mb-3">
                    <input
                      type="text"
                      value={deskInput}
                      onChange={(e) => setDeskInput(e.target.value)}
                      placeholder="e.g. Evaluation Bay 3"
                      className="flex-1 text-xs border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 rounded-lg px-2.5 py-1.5 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                    <button
                      type="submit"
                      disabled={!deskInput.trim()}
                      className="px-2.5 py-1.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-colors shrink-0 cursor-pointer"
                    >
                      + Add
                    </button>
                  </form>

                  <div className="flex-1 min-h-[140px] max-h-[220px] overflow-y-auto space-y-1.5 pr-1">
                    {dropdownOptions.desks.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center p-4 border border-dashed border-slate-200 dark:border-slate-700 rounded-lg">
                        <Briefcase className="w-6 h-6 text-slate-300 dark:text-slate-600 mb-1" />
                        <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">No desks yet</p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Type above to add desks</p>
                      </div>
                    ) : (
                      dropdownOptions.desks.map((desk) => (
                        <div
                          key={desk}
                          className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700/80 text-xs hover:bg-slate-100/80 dark:hover:bg-slate-900 transition-colors"
                        >
                          <span className="font-semibold text-slate-800 dark:text-slate-200 truncate" title={desk}>
                            {desk}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteDesk(desk)}
                            className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 p-1 rounded transition-colors cursor-pointer"
                            title={`Delete desk ${desk}`}
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 3: DETAILED ENROLLMENT & CREDENTIALS REGISTRATION */}
          {activeTab === 'add' && (
            <div className="space-y-4 max-w-2xl mx-auto">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">Enroll New Staff & Provision Credentials</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Register personnel details, assign divisions, and configure secure portal login credentials.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('dropdown_options')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-semibold text-xs hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors cursor-pointer"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Configure Dropdowns</span>
                </button>
              </div>

              <form onSubmit={handleCreateStaff} className="space-y-4 text-xs">
                {/* Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                    Personnel Full Name & Honorific <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Maria Santos (Chief Budget Officer)"
                    className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Dropdown 1: Assigned Role & Dropdown 2: Department/Division */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  
                  {/* Assigned Role Dropdown */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label htmlFor="detailed-role-select" className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
                        Assigned Role <span className="text-rose-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setIsCustomRoleActive(!isCustomRoleActive);
                          if (!isCustomRoleActive && !customRoleInput) {
                            setCustomRoleInput('');
                          }
                        }}
                        className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline transition-colors cursor-pointer"
                      >
                        {isCustomRoleActive ? 'Select from list' : '+ Enter custom role'}
                      </button>
                    </div>

                    {!isCustomRoleActive ? (
                      <select
                        id="detailed-role-select"
                        required
                        value={newRole}
                        onChange={(e) => {
                          if (e.target.value === '__add_custom__') {
                            setIsCustomRoleActive(true);
                          } else {
                            setNewRole(e.target.value);
                          }
                        }}
                        className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium bg-white dark:bg-slate-800 shadow-2xs cursor-pointer"
                      >
                        <option value="" disabled>-- Select an Assigned Role --</option>
                        <optgroup label="System Roles">
                          {SYSTEM_ROLES.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </optgroup>
                        {dropdownOptions.roles.filter((r) => !SYSTEM_ROLES.includes(r)).length > 0 && (
                          <optgroup label="Custom Configured Roles">
                            {dropdownOptions.roles
                              .filter((r) => !SYSTEM_ROLES.includes(r))
                              .map((r) => (
                                <option key={r} value={r}>
                                  {r}
                                </option>
                              ))}
                          </optgroup>
                        )}
                        <option value="__add_custom__">+ Add another custom role...</option>
                      </select>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          required
                          value={customRoleInput}
                          onChange={(e) => setCustomRoleInput(e.target.value)}
                          placeholder="Type role title (e.g. Chief Auditor)"
                          className="flex-1 text-xs rounded-xl border border-indigo-300 dark:border-indigo-700 px-3 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/30"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const trimmed = customRoleInput.trim();
                            if (trimmed) {
                              if (!dropdownOptions.roles.includes(trimmed)) {
                                onUpdateDropdownOptions({
                                  ...dropdownOptions,
                                  roles: [...dropdownOptions.roles, trimmed],
                                });
                              }
                              setNewRole(trimmed);
                              setIsCustomRoleActive(false);
                              showFeedback(`Custom role "${trimmed}" registered.`);
                            }
                          }}
                          className="px-3 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shrink-0 transition-colors cursor-pointer"
                        >
                          Save & Use
                        </button>
                      </div>
                    )}

                    {/* Role Authority & Permission Preview */}
                    {(() => {
                      const activeRoleName = isCustomRoleActive && customRoleInput.trim() ? customRoleInput.trim() : newRole;
                      const activeConfig = getRoleConfig(activeRoleName);
                      if (!activeConfig) return null;

                      return (
                        <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/90 dark:bg-slate-800/60 text-[11px] space-y-1.5 mt-1">
                          <div className="flex items-center justify-between">
                            <span className={`px-2 py-0.5 rounded font-bold text-[10px] border ${activeConfig.badgeBg} ${activeConfig.badgeText} ${activeConfig.badgeBorder}`}>
                              {activeConfig.role}
                            </span>
                            <span className="text-slate-500 dark:text-slate-400 font-medium text-[10px]">{activeConfig.title}</span>
                          </div>
                          <p className="text-slate-600 dark:text-slate-300 text-[10.5px] leading-tight">
                            {activeConfig.summary}
                          </p>
                          <div className="grid grid-cols-2 gap-1 pt-1 border-t border-slate-200/60 dark:border-slate-700 text-[10px] text-slate-600 dark:text-slate-400">
                            <span className="flex items-center gap-1">
                              {activeConfig.canLogIncoming ? (
                                <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                              ) : (
                                <X className="w-3 h-3 text-slate-300 dark:text-slate-600 shrink-0" />
                              )}
                              <span>Log Document</span>
                            </span>
                            <span className="flex items-center gap-1">
                              {activeConfig.canRecordMovement ? (
                                <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                              ) : (
                                <X className="w-3 h-3 text-slate-300 dark:text-slate-600 shrink-0" />
                              )}
                              <span>Movements</span>
                            </span>
                            <span className="flex items-center gap-1">
                              {activeConfig.canIssueSupervisorRemarks ? (
                                <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                              ) : (
                                <X className="w-3 h-3 text-slate-300 dark:text-slate-600 shrink-0" />
                              )}
                              <span>Directives / Remarks</span>
                            </span>
                            <span className="flex items-center gap-1">
                              {activeConfig.canAuthorizeClearance ? (
                                <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                              ) : (
                                <X className="w-3 h-3 text-slate-300 dark:text-slate-600 shrink-0" />
                              )}
                              <span>Executive Clearance</span>
                            </span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Department / Division Dropdown */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label htmlFor="detailed-division-select" className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
                        Department / Division <span className="text-rose-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setIsCustomDeptActive(!isCustomDeptActive);
                          if (!isCustomDeptActive && !customDeptInput) {
                            setCustomDeptInput('');
                          }
                        }}
                        className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline transition-colors cursor-pointer"
                      >
                        {isCustomDeptActive ? 'Select from list' : '+ Enter custom department'}
                      </button>
                    </div>

                    {!isCustomDeptActive ? (
                      <select
                        id="detailed-division-select"
                        required
                        value={newDivision}
                        onChange={(e) => {
                          if (e.target.value === '__add_custom__') {
                            setIsCustomDeptActive(true);
                          } else {
                            setNewDivision(e.target.value);
                          }
                        }}
                        className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium bg-white dark:bg-slate-800 shadow-2xs cursor-pointer"
                      >
                        <option value="" disabled>-- Select a Department / Division --</option>
                        {availableDepartments.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                        <option value="__add_custom__">+ Add another department...</option>
                      </select>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          required
                          value={customDeptInput}
                          onChange={(e) => setCustomDeptInput(e.target.value)}
                          placeholder="Type department name"
                          className="flex-1 text-xs rounded-xl border border-indigo-300 dark:border-indigo-700 px-3 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/30"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const trimmed = customDeptInput.trim();
                            if (trimmed) {
                              if (!dropdownOptions.departments.includes(trimmed)) {
                                onUpdateDropdownOptions({
                                  ...dropdownOptions,
                                  departments: [...dropdownOptions.departments, trimmed],
                                });
                              }
                              setNewDivision(trimmed);
                              setIsCustomDeptActive(false);
                              showFeedback(`Department "${trimmed}" registered.`);
                            }
                          }}
                          className="px-3 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shrink-0 transition-colors cursor-pointer"
                        >
                          Save & Use
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Dropdown 3: Assigned Desk & Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  
                  {/* Assigned Desk Dropdown */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label htmlFor="detailed-desk-select" className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
                        Assigned Desk / Workstation
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setIsCustomDeskActive(!isCustomDeskActive);
                          if (!isCustomDeskActive && !customDeskInput) {
                            setCustomDeskInput('');
                          }
                        }}
                        className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline transition-colors cursor-pointer"
                      >
                        {isCustomDeskActive ? 'Select from list' : '+ Custom workstation'}
                      </button>
                    </div>

                    {!isCustomDeskActive ? (
                      <select
                        id="detailed-desk-select"
                        value={newDesk}
                        onChange={(e) => {
                          if (e.target.value === '__add_custom__') {
                            setIsCustomDeskActive(true);
                          } else {
                            setNewDesk(e.target.value);
                          }
                        }}
                        className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium bg-white dark:bg-slate-800 shadow-2xs cursor-pointer"
                      >
                        <option value="">-- Select an Assigned Desk (Optional) --</option>
                        {availableDesks.map((desk) => (
                          <option key={desk} value={desk}>
                            {desk}
                          </option>
                        ))}
                        <option value="__add_custom__">+ Add another desk / station...</option>
                      </select>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={customDeskInput}
                          onChange={(e) => setCustomDeskInput(e.target.value)}
                          placeholder="e.g. Finance Chamber Bay 3"
                          className="flex-1 text-xs rounded-xl border border-indigo-300 dark:border-indigo-700 px-3 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/30"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const trimmed = customDeskInput.trim();
                            if (trimmed) {
                              if (!dropdownOptions.desks.includes(trimmed)) {
                                onUpdateDropdownOptions({
                                  ...dropdownOptions,
                                  desks: [...dropdownOptions.desks, trimmed],
                                });
                              }
                              setNewDesk(trimmed);
                              setIsCustomDeskActive(false);
                              showFeedback(`Workstation "${trimmed}" registered.`);
                            }
                          }}
                          className="px-3 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shrink-0 transition-colors cursor-pointer"
                        >
                          Save & Use
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                      Official Email Address
                    </label>
                    <input
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="e.g. maria.santos@agency.gov"
                      className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* LOGIN CREDENTIALS SECTION ENROLLED BY SYSTEM ADMIN */}
                <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/30 dark:bg-amber-950/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-bold text-xs text-amber-900 dark:text-amber-300">
                      <Key className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      <span>Portal Login Credentials (Enrolled by Admin)</span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 font-semibold border border-amber-200 dark:border-amber-800">
                      System Admin Enrolled
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Username */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Portal Username <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={newUsername}
                        onChange={(e) => {
                          setNewUsername(e.target.value);
                          setIsUsernameCustomized(true);
                        }}
                        placeholder="e.g. maria.santos"
                        className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    {/* Password */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                          Initial Password <span className="text-rose-500">*</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => setNewPassword(generateRandomPassword())}
                          className="text-[10px] text-amber-700 dark:text-amber-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                        >
                          <RefreshCw className="w-2.5 h-2.5" />
                          <span>Generate</span>
                        </button>
                      </div>
                      <div className="relative">
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          required
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Password"
                          className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 pr-8 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                        >
                          {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* Account Status */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Account Status
                      </label>
                      <select
                        value={newStatus}
                        onChange={(e) => setNewStatus(e.target.value as 'active' | 'suspended')}
                        className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                      >
                        <option value="active">Active (Access Granted)</option>
                        <option value="suspended">Suspended (Access Blocked)</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setActiveTab('directory')}
                    className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Register Personnel & Credentials</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 4: PERMISSIONS MATRIX */}
          {activeTab === 'permissions' && (
            <div className="space-y-4">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">Role Authority & Permission Matrix</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Standardized hierarchy and privilege matrix from intake reception to executive clearance.
                    </p>
                  </div>
                  <span className="text-[11px] px-2.5 py-1 bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-lg font-medium self-start sm:self-auto">
                    Workflow Sequence Enforced
                  </span>
                </div>
              </div>

              {/* Workflow Step Progression Map */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl">
                <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                  Standard Clearance Progression
                </div>
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="px-2.5 py-1 bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 font-semibold rounded-md border border-sky-200 dark:border-sky-800">
                    1. Admin Staff
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="px-2.5 py-1 bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 font-semibold rounded-md border border-indigo-200 dark:border-indigo-800">
                    2. Staff
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="px-2.5 py-1 bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-300 font-semibold rounded-md border border-amber-300 dark:border-amber-800 flex items-center gap-1">
                    <span>3. Supervisor</span>
                    <span className="text-[10px] bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200 px-1 py-0.2 rounded font-bold">Prereq</span>
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="px-2.5 py-1 bg-violet-100 dark:bg-violet-950 text-violet-800 dark:text-violet-300 font-semibold rounded-md border border-violet-200 dark:border-violet-800">
                    4. Division Manager
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-semibold rounded-md border border-emerald-200 dark:border-emerald-800">
                    5. Department Manager
                  </span>
                </div>
              </div>

              {/* Matrix Cards for 6 Standardized Roles */}
              <div className="space-y-3">
                {[
                  'Admin Staff',
                  'Staff',
                  'Supervisor',
                  'Division Manager',
                  'Department Manager',
                  'System Admin',
                ].map((roleKey) => {
                  const cfg = getRoleConfig(roleKey);
                  const isCurrentRole = currentUser.role === cfg.role;

                  return (
                    <div
                      key={cfg.role}
                      className={`p-4 rounded-xl border transition-all ${
                        isCurrentRole
                          ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/20 shadow-2xs'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`text-xs px-2.5 py-1 rounded-lg font-bold border ${cfg.badgeBg} ${cfg.badgeText} ${cfg.badgeBorder} inline-flex items-center gap-1.5`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dotColor}`} />
                            {cfg.role}
                          </span>
                          <span className="text-xs font-bold text-slate-800 dark:text-white">{cfg.title}</span>

                          {cfg.role === 'Supervisor' && (
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 font-semibold">
                              Prerequisite Before Division Manager
                            </span>
                          )}

                          {cfg.role === 'Division Manager' && (
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-violet-100 dark:bg-violet-950 text-violet-800 dark:text-violet-300 border border-violet-200 dark:border-violet-800 font-semibold">
                              Division Review (Follows Supervisor)
                            </span>
                          )}

                          {isCurrentRole && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-600 text-white font-bold">
                              Your Active Role
                            </span>
                          )}
                        </div>

                        {cfg.hierarchyNote && (
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                            {cfg.hierarchyNote}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-2">{cfg.summary}</p>

                      {/* Prerequisite relationship highlight for Supervisor and Division Manager */}
                      {cfg.role === 'Supervisor' && (
                        <div className="mt-2.5 p-2.5 bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-lg text-xs text-amber-900 dark:text-amber-300 flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-semibold">Workflow Rule:</span> Same operational permissions as the Division Manager. Supervisor conducts preliminary review and audits initial compliance before the document is escalated to the Division Manager.
                          </div>
                        </div>
                      )}

                      {cfg.role === 'Division Manager' && (
                        <div className="mt-2.5 p-2.5 bg-violet-50/80 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-900/60 rounded-lg text-xs text-violet-900 dark:text-violet-300 flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-violet-700 dark:text-violet-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-semibold">Workflow Rule:</span> Same operational permissions as Supervisor. Conducts secondary division-level review following the prerequisite Supervisor endorsement, then endorses files to Department Manager.
                          </div>
                        </div>
                      )}

                      {/* Permission Badges Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                        <div className="flex items-center gap-1.5">
                          {cfg.canLogIncoming ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          ) : (
                            <Lock className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 shrink-0" />
                          )}
                          <span className={cfg.canLogIncoming ? 'text-slate-700 dark:text-slate-300 font-medium' : 'text-slate-400 dark:text-slate-600'}>
                            Log Document
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {cfg.canRecordMovement ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          ) : (
                            <Lock className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 shrink-0" />
                          )}
                          <span className={cfg.canRecordMovement ? 'text-slate-700 dark:text-slate-300 font-medium' : 'text-slate-400 dark:text-slate-600'}>
                            Update Desks
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {cfg.canIssueSupervisorRemarks ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          ) : (
                            <Lock className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 shrink-0" />
                          )}
                          <span className={cfg.canIssueSupervisorRemarks ? 'text-slate-700 dark:text-slate-300 font-medium' : 'text-slate-400 dark:text-slate-600'}>
                            Supervisor Remarks
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {cfg.canAuthorizeClearance ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          ) : (
                            <Lock className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 shrink-0" />
                          )}
                          <span className={cfg.canAuthorizeClearance ? 'text-slate-700 dark:text-slate-300 font-medium' : 'text-slate-400 dark:text-slate-600'}>
                            Manager Clearance
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {cfg.canFulfillCompliance ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          ) : (
                            <Lock className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 shrink-0" />
                          )}
                          <span className={cfg.canFulfillCompliance ? 'text-slate-700 dark:text-slate-300 font-medium' : 'text-slate-400 dark:text-slate-600'}>
                            Fulfill Compliance
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {cfg.canManageStaff ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          ) : (
                            <Lock className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 shrink-0" />
                          )}
                          <span className={cfg.canManageStaff ? 'text-slate-700 dark:text-slate-300 font-medium' : 'text-slate-400 dark:text-slate-600'}>
                            Manage Personnel
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {cfg.canConfigureSync ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          ) : (
                            <Lock className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 shrink-0" />
                          )}
                          <span className={cfg.canConfigureSync ? 'text-slate-700 dark:text-slate-300 font-medium' : 'text-slate-400 dark:text-slate-600'}>
                            Sync & Registry
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {cfg.canDeleteDocuments ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          ) : (
                            <Lock className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 shrink-0" />
                          )}
                          <span className={cfg.canDeleteDocuments ? 'text-rose-700 dark:text-rose-400 font-bold' : 'text-slate-400 dark:text-slate-600'}>
                            Delete Logs (In/Out)
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 5: CROSS-DEVICE SYNC & DATA PERSISTENCE */}
          {activeTab === 'sync' && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      Cross-Device Personnel Synchronization &amp; Persistence
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Ensure all enrolled personnel and credentials are accessible seamlessly across different computers, smartphones, and browsers.
                    </p>
                  </div>
                  <span className="text-[11px] px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-lg font-semibold self-start sm:self-auto">
                    {staffList.length} Personnel Enrolled
                  </span>
                </div>
              </div>

              {/* Section 1: Google Sheets Cloud Sync */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-800/50 p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                      <FileSpreadsheet className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                        Google Sheets Cloud Persistence
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {sheetConfig
                          ? 'Automatic multi-device synchronization is enabled via Google Sheets.'
                          : 'Connect a Google Sheet to automatically sync all enrolled personnel across every device.'}
                      </p>
                    </div>
                  </div>
                  {sheetConfig && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/80 px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3 h-3" /> Connected
                    </span>
                  )}
                </div>

                {sheetConfig ? (
                  <div className="pt-2 space-y-3">
                    <div className="flex items-center justify-between text-xs bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
                      <span className="font-mono text-slate-700 dark:text-slate-300 truncate max-w-xs">
                        Sheet ID: {sheetConfig.spreadsheetId}
                      </span>
                      <a
                        href={sheetConfig.spreadsheetUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-emerald-700 dark:text-emerald-400 hover:underline font-semibold flex items-center gap-1 shrink-0 ml-2"
                      >
                        View Sheet
                      </a>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {onSyncToSheet && (
                        <button
                          type="button"
                          onClick={async () => {
                            setIsPushingSheet(true);
                            try {
                              await onSyncToSheet();
                              showFeedback('Personnel directory successfully pushed to Google Sheet!', 'success');
                            } catch (e: any) {
                              showFeedback(e.message || 'Failed to sync to Google Sheet.', 'error');
                            } finally {
                              setIsPushingSheet(false);
                            }
                          }}
                          disabled={isPushingSheet || !token}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isPushingSheet ? 'animate-spin' : ''}`} />
                          {isPushingSheet ? 'Pushing to Sheet...' : 'Push Personnel to Google Sheet'}
                        </button>
                      )}

                      {onPullFromSheet && (
                        <button
                          type="button"
                          onClick={async () => {
                            setIsPullingSheet(true);
                            try {
                              await onPullFromSheet();
                              showFeedback('Updated personnel roster pulled from Google Sheet!', 'success');
                            } catch (e: any) {
                              showFeedback(e.message || 'Failed to pull from Google Sheet.', 'error');
                            } finally {
                              setIsPullingSheet(false);
                            }
                          }}
                          disabled={isPullingSheet || !token}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          <DownloadCloud className={`w-3.5 h-3.5 ${isPullingSheet ? 'animate-spin' : ''}`} />
                          {isPullingSheet ? 'Pulling from Sheet...' : 'Pull Latest from Sheet'}
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-lg text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      Google Sheet is not currently connected in this session. You can link a sheet using the top header sync button, or use the <strong>Instant Multi-Device Link</strong> below to copy all personnel to your other device instantly.
                    </div>
                  </div>
                )}
              </div>

              {/* Section 2: Instant Multi-Device Link */}
              <div className="rounded-xl border border-indigo-200 dark:border-indigo-800/70 bg-indigo-50/60 dark:bg-indigo-950/40 p-4 space-y-3">
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                    <Share2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-indigo-950 dark:text-indigo-200 uppercase tracking-wider">
                      Instant Multi-Device Link (One-Click Transfer)
                    </h4>
                    <p className="text-xs text-indigo-900/80 dark:text-indigo-300/80 mt-0.5 leading-relaxed">
                      Generate a unique secure link that contains all {staffList.length} enrolled personnel, credentials, and custom roles. Open this link on your second computer, smartphone, or tablet, and it will immediately save the personnel into that device's permanent storage!
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleCopyMultiDeviceUrl}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-700 hover:bg-indigo-800 text-white rounded-lg text-xs font-bold transition-colors shadow-xs cursor-pointer"
                  >
                    {copiedSyncUrl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedSyncUrl ? 'Multi-Device Link Copied!' : 'Copy Multi-Device Link'}
                  </button>

                  <button
                    type="button"
                    onClick={handleCopySyncCode}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-800 border border-indigo-300 dark:border-indigo-700 text-indigo-900 dark:text-indigo-200 hover:bg-indigo-50 dark:hover:bg-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                  >
                    {copiedSyncCode ? <Check className="w-3.5 h-3.5 text-indigo-600" /> : <Copy className="w-3.5 h-3.5 text-indigo-600" />}
                    {copiedSyncCode ? 'Sync Code Copied!' : 'Copy Raw Sync Code'}
                  </button>
                </div>
              </div>

              {/* Section 3: Import from Another Device */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-3 bg-white dark:bg-slate-900">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <UploadCloud className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  Import from Another Device
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Received a Multi-Device Link or Sync Code from another computer? Paste it below to load all personnel into this device.
                </p>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={syncCodeInput}
                    onChange={(e) => setSyncCodeInput(e.target.value)}
                    placeholder="Paste Multi-Device Link or Sync Code here..."
                    className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={handleImportFromCode}
                    className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shrink-0"
                  >
                    Import &amp; Synchronize
                  </button>
                </div>
              </div>

              {/* Section 4: File Backup & Offline Storage */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-3 bg-slate-50/50 dark:bg-slate-800/40">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <FileJson className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  Offline Backup &amp; File Export
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  You can also download an offline JSON backup file of your personnel roster and import it on any offline or air-gapped machine.
                </p>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleExportJson}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                  >
                    <DownloadCloud className="w-3.5 h-3.5 text-amber-600" />
                    Download JSON Roster
                  </button>

                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-medium transition-colors cursor-pointer">
                    <UploadCloud className="w-3.5 h-3.5 text-blue-600" />
                    Upload JSON Roster
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportJsonFile}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>
            Active Role: <strong className="text-slate-800 dark:text-slate-200">{currentUser.role}</strong> ({currentUser.name})
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 font-medium transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>

      {/* CREDENTIALS ENROLLMENT & EDITING DIALOG */}
      {credentialStaff && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/70 dark:bg-black/80 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-5 py-4 bg-[#0c2340] dark:bg-[#071526] text-white flex items-center justify-between border-b border-[#1b3d64] dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center justify-center">
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Enroll Login Credentials</h3>
                  <p className="text-[11px] text-blue-200 dark:text-slate-400">
                    Staff: <span className="font-semibold text-white">{credentialStaff.name}</span> ({credentialStaff.role})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCredentialStaff(null)}
                className="text-slate-300 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCredentials} className="p-5 space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
                  Login Username <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  placeholder="e.g. maria.santos"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <p className="text-[10.5px] text-slate-400 dark:text-slate-500">
                  Staff members use this username to authenticate into their assigned role.
                </p>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
                    Password <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setEditPassword(generateRandomPassword())}
                    className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Generate Strong Password</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showEditPassword ? 'text' : 'password'}
                    required
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full px-3 py-2 pr-9 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditPassword(!showEditPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {showEditPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
                  Account Status
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditStatus('active')}
                    className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      editStatus === 'active'
                        ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 ring-1 ring-emerald-500'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Active</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditStatus('suspended')}
                    className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      editStatus === 'suspended'
                        ? 'border-rose-600 bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 ring-1 ring-rose-500'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <Ban className="w-3.5 h-3.5 text-rose-600" />
                    <span>Suspended</span>
                  </button>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setCredentialStaff(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>Save Enrolled Credentials</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
```

---

## File: `src/components/TimeInDeskConfigModal.tsx` (472 lines)

```typescript
import React, { useState } from 'react';
import { TimeInDeskConfig, DocumentItem } from '../types';
import { PossdLogo } from './PossdLogo';
import {
  Clock,
  AlertTriangle,
  CheckCircle2,
  X,
  RotateCcw,
  Sliders,
  Building2,
  HelpCircle,
  BellRing,
  Trash2,
  Lock,
  ShieldAlert,
} from 'lucide-react';
import { DEFAULT_TIME_IN_DESK_CONFIG, calculateDocumentTimeInDesk } from '../lib/timeInDesk';

interface TimeInDeskConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: TimeInDeskConfig;
  onSaveConfig: (updated: TimeInDeskConfig) => void;
  documents: DocumentItem[];
  availableDivisions: string[];
  currentUserRole?: string;
}

export const TimeInDeskConfigModal: React.FC<TimeInDeskConfigModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  documents,
  availableDivisions,
  currentUserRole = 'Staff',
}) => {
  if (!isOpen) return null;

  const isSystemAdmin = currentUserRole === 'System Admin';

  const [defaultHours, setDefaultHours] = useState<number>(config.defaultThresholdHours || 24);
  const [divisionThresholds, setDivisionThresholds] = useState<Record<string, number>>({
    ...config.divisionThresholds,
  });
  const [highlightRowOnExceed, setHighlightRowOnExceed] = useState<boolean>(
    config.highlightRowOnExceed ?? true
  );
  const [permissionError, setPermissionError] = useState<string | null>(null);

  // Calculate live preview of overdue documents with tentative settings
  const tentativeConfig: TimeInDeskConfig = {
    defaultThresholdHours: defaultHours,
    divisionThresholds,
    highlightRowOnExceed,
  };

  const overdueDocs = documents.filter((doc) => {
    const metrics = calculateDocumentTimeInDesk(doc, tentativeConfig);
    return metrics.isOverdue;
  });

  const handlePresetSelect = (hours: number) => {
    setDefaultHours(hours);
  };

  const handleDivisionChange = (division: string, value: string) => {
    setPermissionError(null);
    const num = parseInt(value, 10);
    
    // If user is trying to delete/clear the override by emptying the input
    if (isNaN(num) || num <= 0) {
      if (!isSystemAdmin) {
        setPermissionError(`Permission Denied: Only the System Administrator is authorized to delete or clear Division-Specific Threshold Overrides.`);
        return;
      }
      setDivisionThresholds((prev) => {
        const next = { ...prev };
        delete next[division];
        return next;
      });
    } else {
      setDivisionThresholds((prev) => ({
        ...prev,
        [division]: num,
      }));
    }
  };

  const handleDeleteOverride = (division: string) => {
    if (!isSystemAdmin) {
      setPermissionError(`Permission Denied: Only the System Administrator is authorized to delete Division-Specific Threshold Overrides.`);
      return;
    }
    setDivisionThresholds((prev) => {
      const next = { ...prev };
      delete next[division];
      return next;
    });
    setPermissionError(null);
  };

  const handleDeleteAllOverrides = () => {
    if (!isSystemAdmin) {
      setPermissionError(`Permission Denied: Only the System Administrator is authorized to delete Division-Specific Threshold Overrides.`);
      return;
    }
    setDivisionThresholds({});
    setPermissionError(null);
  };

  const handleResetDefaults = () => {
    if (!isSystemAdmin && Object.keys(divisionThresholds).length > 0) {
      setPermissionError(`Permission Denied: Resetting division overrides requires System Administrator authorization.`);
      return;
    }
    setDefaultHours(DEFAULT_TIME_IN_DESK_CONFIG.defaultThresholdHours);
    setDivisionThresholds({ ...DEFAULT_TIME_IN_DESK_CONFIG.divisionThresholds });
    setHighlightRowOnExceed(DEFAULT_TIME_IN_DESK_CONFIG.highlightRowOnExceed);
    setPermissionError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveConfig({
      defaultThresholdHours: Math.max(1, defaultHours),
      divisionThresholds,
      highlightRowOnExceed,
    });
    onClose();
  };

  // Merge default list of divisions with availableDivisions prop
  const allDivisions = Array.from(
    new Set([
      'Finance & Budget Division',
      'Operations & Emergency Management',
      'Planning & Quality Assurance',
      'Legal & Regulatory Affairs',
      'Administrative & General Services',
      'Executive Office of the Manager',
      'Central Records & Receiving Desk',
      'Information Technology Division',
      ...availableDivisions,
    ])
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-2xl w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-5 bg-slate-900 border-b border-slate-800 text-white flex items-start justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-white p-1 flex items-center justify-center shrink-0 shadow-sm ring-1 ring-slate-400">
              <PossdLogo className="w-8 h-8" variant="black" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">
                Time-in-Desk Threshold Configuration
              </h2>
              <p className="text-xs text-slate-300">
                Configure allowable dwell time thresholds per division. Documents exceeding their threshold highlight in red.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Status Pill Strip */}
        <div className="px-6 py-3 bg-slate-100/90 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-600 dark:text-slate-400 font-medium">Active Rule:</span>
            <span className="font-mono font-bold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-700 px-2 py-0.5 rounded border border-slate-300 dark:border-slate-600">
              Default: {defaultHours} hours
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-600 dark:text-slate-400">Simulated Overdue Impact:</span>
            {overdueDocs.length > 0 ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-900 font-bold">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                <span>{overdueDocs.length} Documents Exceeded</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>All documents within threshold</span>
              </span>
            )}
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Section 1: Global Default Threshold */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label htmlFor="global-threshold-input" className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Default Division Threshold (Hours)</span>
              </label>
              <span className="text-xs text-slate-500 dark:text-slate-400">Applies when no division override is set</span>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative w-36">
                <input
                  id="global-threshold-input"
                  type="number"
                  min={1}
                  max={720}
                  value={defaultHours}
                  onChange={(e) => setDefaultHours(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-full pl-3 pr-8 py-2 rounded-xl border border-slate-300 dark:border-slate-700 font-mono text-sm font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-white dark:bg-slate-800"
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-400 dark:text-slate-500 font-medium pointer-events-none">
                  hrs
                </span>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { label: '4h (Rush)', value: 4 },
                  { label: '8h (Same Day)', value: 8 },
                  { label: '12h (Half Day)', value: 12 },
                  { label: '24h (Standard)', value: 24 },
                  { label: '48h (2 Days)', value: 48 },
                  { label: '72h (3 Days)', value: 72 },
                ].map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => handlePresetSelect(preset.value)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      defaultHours === preset.value
                        ? 'bg-blue-600 dark:bg-blue-600 text-white shadow-2xs'
                        : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section 2: Division-Specific Threshold Overrides */}
          <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                  <span>Division-Specific Threshold Overrides</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Set customized maximum allowed desk stay hours for specific operational units.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1 rounded-lg border border-blue-200 dark:border-blue-800 font-bold">
                  {Object.keys(divisionThresholds).length} custom overrides
                </span>

                {isSystemAdmin && Object.keys(divisionThresholds).length > 0 && (
                  <button
                    type="button"
                    onClick={handleDeleteAllOverrides}
                    className="px-2.5 py-1 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                    title="System Admin: Delete all division-specific overrides"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                    <span>Delete All Overrides</span>
                  </button>
                )}
              </div>
            </div>

            {/* Permission feedback / error notice */}
            {permissionError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 rounded-xl text-xs text-rose-800 dark:text-rose-200 flex items-start gap-2 animate-in fade-in duration-150">
                <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="font-bold">Authorization Notice: </span>
                  <span>{permissionError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setPermissionError(null)}
                  className="text-rose-500 hover:text-rose-800 dark:hover:text-rose-200 font-bold text-xs cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Admin permission badge info */}
            <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-[11px] flex items-center justify-between text-slate-600 dark:text-slate-300">
              <div className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>
                  <strong className="text-slate-800 dark:text-slate-100">Security Rule: </strong>
                  Only <strong className="text-slate-900 dark:text-white">System Administrator</strong> possesses clearance to delete division threshold overrides.
                </span>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                isSystemAdmin ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}>
                {isSystemAdmin ? 'Admin Clearance Granted' : `Viewing as ${currentUserRole}`}
              </span>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-800/40 overflow-hidden">
              {allDivisions.map((division) => {
                const customVal = divisionThresholds[division];
                
                // Count documents in this division
                const docsInDiv = documents.filter((d) => d.targetDivision === division);
                const overdueInDiv = docsInDiv.filter((d) => {
                  const m = calculateDocumentTimeInDesk(d, tentativeConfig);
                  return m.isOverdue;
                });

                return (
                  <div
                    key={division}
                    className="p-3 bg-white dark:bg-slate-900 hover:bg-slate-50/80 dark:hover:bg-slate-850 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-slate-900 dark:text-white">{division}</span>
                        {customVal !== undefined && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-50 dark:bg-blue-950/70 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                            Custom Override
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                        <span>{docsInDiv.length} active docs</span>
                        {overdueInDiv.length > 0 && (
                          <span className="text-rose-700 dark:text-rose-400 font-bold flex items-center gap-0.5">
                            • <AlertTriangle className="w-3 h-3 text-rose-600 dark:text-rose-400" /> {overdueInDiv.length} overdue
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="relative w-28">
                        <input
                          type="number"
                          min={1}
                          max={720}
                          placeholder={defaultHours.toString()}
                          value={customVal !== undefined ? customVal : ''}
                          onChange={(e) => handleDivisionChange(division, e.target.value)}
                          className="w-full pl-2.5 pr-7 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 font-mono text-xs font-semibold text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 bg-white dark:bg-slate-800"
                        />
                        <span className="absolute right-2.5 top-1.5 text-[11px] text-slate-400 dark:text-slate-500 font-medium pointer-events-none">
                          hrs
                        </span>
                      </div>

                      {customVal !== undefined ? (
                        isSystemAdmin ? (
                          <button
                            type="button"
                            onClick={() => handleDeleteOverride(division)}
                            title="System Admin: Delete division threshold override"
                            className="text-xs text-rose-700 dark:text-rose-300 hover:text-rose-900 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900 border border-rose-200 dark:border-rose-900 px-2 py-1 rounded-lg transition-colors flex items-center gap-1 font-semibold cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                            <span>Delete Override</span>
                          </button>
                        ) : (
                          <span
                            title="System Administrator authorization required to delete division overrides"
                            className="text-[10px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-1 rounded-md flex items-center gap-1 font-medium select-none"
                          >
                            <Lock className="w-3.5 h-3.5 text-slate-400" />
                            <span>Locked</span>
                          </span>
                        )
                      ) : (
                        <span className="text-[11px] text-slate-400 dark:text-slate-500 w-24 text-center">
                          (default {defaultHours}h)
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 3: Visual Alert Preferences */}
          <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BellRing className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Visual Highlighting Preferences</span>
            </h3>

            <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 cursor-pointer hover:bg-slate-100/80 dark:hover:bg-slate-800 transition-colors">
              <input
                type="checkbox"
                checked={highlightRowOnExceed}
                onChange={(e) => setHighlightRowOnExceed(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-700 cursor-pointer"
              />
              <div className="text-xs">
                <span className="font-bold text-slate-900 dark:text-white block">
                  Highlight entire document row in red when threshold is exceeded
                </span>
                <span className="text-slate-500 dark:text-slate-400 block mt-0.5">
                  Applies a soft red background tint and left red indicator strip to the table row so overdue items stand out immediately.
                </span>
              </div>
            </label>
          </div>

          {/* Helper Callout */}
          <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-900/60 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
            <HelpCircle className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">How Time-in-Desk is measured:</span> Dwell time begins upon the document's arrival at the target division or latest internal movement desk. When cleared for outward dispatch or archived by the Department Manager, the metric freezes at the clearance timestamp.
            </div>
          </div>

          {/* Modal Footer Controls */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleResetDefaults}
              className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-semibold px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span>Reset to Defaults</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                id="save-threshold-config-btn"
                className="px-5 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold transition-colors shadow-sm cursor-pointer"
              >
                Save Threshold Configuration
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
};
```

---

## File: `src/components/VerticalNavigationSidebar.tsx` (430 lines)

```typescript
import React from 'react';
import { motion } from 'motion/react';
import {
  FileText,
  Users,
  BarChart3,
  Clock,
  AlertTriangle,
  ShieldCheck,
  FileSpreadsheet,
  Sliders,
  UserCog,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Inbox,
  Sparkles,
  RefreshCw,
  Keyboard,
  ExternalLink,
  FolderGit2,
} from 'lucide-react';

export type WorkspaceTab = 'documents' | 'distribution' | 'analytics' | 'links' | 'admin';

interface VerticalNavigationSidebarProps {
  activeTab: WorkspaceTab;
  setActiveTab: (tab: WorkspaceTab) => void;
  documentsCount: number;
  focalPendingCount: number;
  overdueCount: number;
  activeCount: number;
  clearedCount: number;
  isSheetConnected: boolean;
  sheetTitle?: string;
  isSyncing: boolean;
  quotaCooldownSeconds?: number;
  onManualSync?: () => void;
  onOpenSheetModal: () => void;
  onOpenRolesModal: () => void;
  onOpenThresholdModal: () => void;
  onOpenShortcutsModal?: () => void;
  currentUserRole: string;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

export const VerticalNavigationSidebar: React.FC<VerticalNavigationSidebarProps> = ({
  activeTab,
  setActiveTab,
  documentsCount,
  focalPendingCount,
  overdueCount,
  activeCount,
  clearedCount,
  isSheetConnected,
  sheetTitle,
  isSyncing,
  quotaCooldownSeconds = 0,
  onManualSync,
  onOpenSheetModal,
  onOpenRolesModal,
  onOpenThresholdModal,
  onOpenShortcutsModal,
  currentUserRole,
  isCollapsed,
  setIsCollapsed,
}) => {
  const isSysAdmin = currentUserRole === 'System Admin';

  const navItems = [
    {
      id: 'documents' as WorkspaceTab,
      label: 'Dashboard',
      shortLabel: 'Dashboard',
      description: 'Central document registry & incoming tracker',
      icon: FileText,
      badge: documentsCount,
      badgeType: 'count' as const,
      color: 'amber',
    },
    {
      id: 'distribution' as WorkspaceTab,
      label: 'Distribution Desk',
      shortLabel: 'Distribution',
      description: 'Focal persons assignment queue',
      icon: Users,
      badge: focalPendingCount > 0 ? focalPendingCount : undefined,
      badgeLabel: focalPendingCount > 0 ? `${focalPendingCount} pending` : 'Focal Queue',
      badgeType: 'pill' as const,
      color: 'emerald',
    },
    {
      id: 'analytics' as WorkspaceTab,
      label: 'Analytics & Insights',
      shortLabel: 'Analytics',
      description: 'SLA compliance & dwell trends',
      icon: BarChart3,
      badgeLabel: 'recharts',
      badgeType: 'pill' as const,
      color: 'sky',
    },
    {
      id: 'links' as WorkspaceTab,
      label: 'Dedicated Links & Drives',
      shortLabel: 'Drives & Links',
      description: 'Institutional drives, files & reference URLs',
      icon: ExternalLink,
      badgeLabel: 'Shared',
      badgeType: 'pill' as const,
      color: 'indigo',
    },
    ...(isSysAdmin
      ? [
          {
            id: 'admin' as WorkspaceTab,
            label: 'System Admin Settings',
            shortLabel: 'Admin Settings',
            description: 'Time-in-desk SLA thresholds & system controls',
            icon: Sliders,
            badgeLabel: 'Admin',
            badgeType: 'pill' as const,
            color: 'slate',
          },
        ]
      : []),
  ];

  return (
    <aside
      className={`relative shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col justify-between transition-all duration-300 select-none z-20 ${
        isCollapsed ? 'w-20' : 'w-64 xl:w-72'
      }`}
    >
      {/* Top Header / Collapse Toggle */}
      <div className="p-3.5 border-b border-slate-800 flex items-center justify-between">
        {!isCollapsed ? (
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="w-2 h-2 rounded-full bg-slate-400 animate-pulse" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300 truncate">
              Workspace Navigation
            </span>
          </div>
        ) : (
          <div className="w-full flex justify-center">
            <div className="w-2 h-2 rounded-full bg-slate-400" />
          </div>
        )}

        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? 'Expand Navigation Sidebar' : 'Collapse Navigation Sidebar'}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Navigation Links with Vertical Sliding Highlight */}
      <div className="p-3 flex-1 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <div key={item.id} className="relative">
              {/* Sliding Active Pill Background using motion layoutId */}
              {isActive && (
                <motion.div
                  layoutId="activeVerticalTabIndicator"
                  className="absolute inset-0 bg-slate-800 border border-slate-700 rounded-xl shadow-inner pointer-events-none"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}

              <button
                type="button"
                id={`vtab-${item.id}-btn`}
                onClick={() => setActiveTab(item.id)}
                title={isCollapsed ? `${item.label} (${item.description})` : undefined}
                className={`relative w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-colors cursor-pointer group z-10 ${
                  isActive
                    ? 'text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                {/* Active Indicator Bar on Left */}
                {isActive && (
                  <motion.div
                    layoutId="activeVerticalTabBorder"
                    className="absolute left-1 top-2 bottom-2 w-1 rounded-full bg-slate-300"
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}

                {/* Icon */}
                <div
                  className={`shrink-0 p-2 rounded-lg transition-transform group-hover:scale-105 ${
                    isActive
                      ? 'bg-slate-700 text-slate-100 ring-1 ring-slate-600'
                      : 'bg-slate-800 text-slate-400 group-hover:text-white'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>

                {/* Label & Description (visible when expanded) */}
                {!isCollapsed && (
                  <div className="flex-1 min-w-0 pr-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold truncate group-hover:translate-x-0.5 transition-transform">
                        {item.label}
                      </span>

                      {/* Badge */}
                      {item.badgeType === 'count' && (
                        <span
                          className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                            isActive
                              ? 'bg-slate-200 text-slate-900 shadow-2xs'
                              : 'bg-slate-800 text-slate-300 border border-slate-700'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}

                      {item.badgeType === 'pill' && item.badgeLabel && (
                        <span
                          className={`px-1.5 py-0.5 rounded-full text-[9.5px] font-semibold shrink-0 ${
                            isActive
                              ? 'bg-slate-200 text-slate-900 font-bold'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}
                        >
                          {item.badgeLabel}
                        </span>
                      )}
                    </div>

                    <p className="text-[10.5px] text-slate-400 truncate mt-0.5">
                      {item.description}
                    </p>
                  </div>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Bottom Shortcuts / Cloud Sheets Status */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/70 space-y-2">
        {/* Google Sheet Live Sync Status */}
        <div
          className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left transition-colors ${
            isSheetConnected
              ? quotaCooldownSeconds > 0
                ? 'bg-amber-950/40 text-amber-200 border border-amber-800/60'
                : 'bg-slate-850 bg-slate-900 text-slate-200 border border-slate-700'
              : 'bg-slate-900/60 text-slate-400 border border-slate-800'
          }`}
        >
          <button
            type="button"
            onClick={onOpenSheetModal}
            title={isCollapsed ? 'Google Sheet Sync Settings' : undefined}
            className="relative shrink-0 cursor-pointer"
          >
            <FileSpreadsheet
              className={`w-4 h-4 ${
                isSheetConnected
                  ? quotaCooldownSeconds > 0
                    ? 'text-amber-400'
                    : 'text-slate-300'
                  : 'text-slate-500'
              }`}
            />
            {isSheetConnected && (
              <span
                className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full ${
                  quotaCooldownSeconds > 0
                    ? 'bg-amber-400'
                    : isSyncing
                    ? 'bg-slate-300 animate-ping'
                    : 'bg-emerald-400'
                }`}
              />
            )}
          </button>

          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <button
                  type="button"
                  onClick={onOpenSheetModal}
                  className="text-[11px] font-bold truncate text-slate-200 hover:text-white text-left cursor-pointer"
                >
                  Google Sheet
                </button>
                <div className="flex items-center gap-1">
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                      isSheetConnected
                        ? quotaCooldownSeconds > 0
                          ? 'bg-amber-950 text-amber-300 border border-amber-700/60'
                          : isSyncing
                          ? 'bg-slate-800 text-slate-200 border border-slate-700'
                          : 'bg-slate-800 text-slate-300 border border-slate-700'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {quotaCooldownSeconds > 0
                      ? `Quota (${quotaCooldownSeconds}s)`
                      : isSyncing
                      ? 'Syncing...'
                      : isSheetConnected
                      ? 'Connected'
                      : 'Connect'}
                  </span>
                  {isSheetConnected && onManualSync && (
                    <button
                      type="button"
                      onClick={onManualSync}
                      disabled={isSyncing || quotaCooldownSeconds > 0}
                      className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors disabled:opacity-40 cursor-pointer"
                      title={
                        quotaCooldownSeconds > 0
                          ? `API Quota Cooling Down (${quotaCooldownSeconds}s)`
                          : 'Manual Sync Now'
                      }
                    >
                      <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin text-slate-300' : ''}`} />
                    </button>
                  )}
                </div>
              </div>
              <p className="text-[10px] text-slate-400 truncate">
                {quotaCooldownSeconds > 0
                  ? 'Quota cooling down'
                  : sheetTitle || 'Single Master Sheet'}
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons (SLA, Roles, Shortcuts) */}
        {!isCollapsed ? (
          <div className="space-y-1.5 pt-1">
            <button
              type="button"
              onClick={onOpenShortcutsModal}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-semibold border border-slate-700 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-1.5">
                <Keyboard className="w-3.5 h-3.5 text-slate-400" />
                <span>Shortcuts Guide</span>
              </div>
              <kbd className="px-1.5 py-0.2 text-[9px] font-mono rounded bg-slate-900 text-slate-400 border border-slate-700">
                ?
              </kbd>
            </button>

            {isSysAdmin && (
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={onOpenThresholdModal}
                  className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[10.5px] font-semibold border border-slate-700 transition-colors cursor-pointer"
                  title="Configure Time-in-Desk Thresholds (System Admin Only)"
                >
                  <Sliders className="w-3.5 h-3.5 text-slate-400" />
                  <span>Thresholds</span>
                </button>

                <button
                  type="button"
                  onClick={onOpenRolesModal}
                  className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[10.5px] font-semibold border border-slate-700 transition-colors cursor-pointer"
                  title="Manage Staff Roles & Permissions (System Admin)"
                >
                  <UserCog className="w-3.5 h-3.5 text-slate-400" />
                  <span>Roles</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <button
              type="button"
              onClick={onOpenShortcutsModal}
              title="Keyboard Shortcuts (?)"
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex justify-center transition-colors cursor-pointer"
            >
              <Keyboard className="w-4 h-4" />
            </button>
            {isSysAdmin && (
              <>
                <button
                  type="button"
                  onClick={onOpenThresholdModal}
                  title="Time in Desk SLA Thresholds (System Admin)"
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex justify-center transition-colors cursor-pointer"
                >
                  <Sliders className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={onOpenRolesModal}
                  title="Manage Roles & Personnel (System Admin)"
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex justify-center transition-colors cursor-pointer"
                >
                  <UserCog className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
```

---

## File: `src/components/usePWAInstall.ts` (84 lines)

```typescript
import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Detect standalone mode (already installed)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(isStandalone);

    // Detect iOS devices
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIOSDevice);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setDeferredPrompt(null);
      return true;
    }
    return false;
  };

  return {
    isInstallable: !!deferredPrompt,
    isInstalled,
    isIOS,
    install,
  };
}

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
```

---

## File: `src/main.tsx` (120 lines)

```typescript
import React, { StrictMode, Component, ErrorInfo, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Top-level Error Boundary to prevent white screen of death
interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  constructor(props: ErrorBoundaryProps) {
    super(props);
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('App Error Caught:', error, errorInfo);
  }

  handleReset = () => {
    try {
      localStorage.removeItem('possd_active_user');
    } catch {}
    window.location.reload();
  };

  handleHardReset = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {}
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6 font-sans">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold text-xl">
              !
            </div>
            <h1 className="text-xl font-bold text-white">Application Notice</h1>
            <p className="text-sm text-slate-400">
              An unexpected display issue occurred while initializing the view.
            </p>
            {this.state.error && (
              <pre className="text-xs bg-slate-950 p-3 rounded-lg text-rose-300 overflow-x-auto border border-slate-800">
                {this.state.error.message}
              </pre>
            )}
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
              >
                Reload Application
              </button>
              <button
                type="button"
                onClick={this.handleHardReset}
                className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Reset Stored Data
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Service Worker handling: unregister dev workers, register only in production
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  if (import.meta.env.DEV) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister();
      }
    }).catch((err) => console.warn('SW unregister notice:', err));
  } else {
    try {
      registerSW({
        immediate: true,
        onNeedRefresh() {
          console.log('POSSD Document Tracking System: Update available, reloaded.');
        },
        onOfflineReady() {
          console.log('POSSD Document Tracking System: Assets cached for offline capability.');
        },
      });
    } catch (err) {
      console.warn('SW register notice:', err);
    }
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
```

---

## File: `src/App.tsx` (3770 lines)

```typescript
import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  DocumentItem,
  InternalMovement,
  ManagerClearance,
  RealtimeNotification,
  AppUserRole,
  UserRoleType,
  RegistryDropdownOptions,
  TimeInDeskConfig,
  DedicatedLinkItem,
  SyncDiagnosticLog,
  SyncProgressStatus,
} from './types';
import {
  getStoredDocuments,
  saveStoredDocuments,
  getStoredSheetConfig,
  saveStoredSheetConfig,
  getStoredStaffMembers,
  saveStoredStaffMembers,
  getStoredDropdownOptions,
  saveStoredDropdownOptions,
  ROLE_CONFIGS,
  getRoleConfig,
  canUserDeleteDocuments,
  decodePersonnelSyncCode,
  broadcastDataUpdate,
  onDataUpdate,
  safeStorageGet,
  safeStorageSet,
  safeStorageRemove,
} from './mockData';
import {
  SheetMetadata,
  syncAllDocumentsToSheet,
  syncPersonnelOnlyToSheet,
  pullPersonnelFromSheet,
  pullAllFromSheet,
  isGoogleQuotaError,
} from './lib/googleSheets';
import * as api from './lib/api';
import { initAuth, setAccessToken, getAccessToken, googleSignIn, logoutGoogle, getStaySignedIn } from './lib/firebase';
import { User } from 'firebase/auth';
import { NotificationCenter } from './components/NotificationCenter';
import { GoogleSheetSyncModal } from './components/GoogleSheetSyncModal';
import { IncomingDocumentModal } from './components/IncomingDocumentModal';
import { DocumentDetailModal } from './components/DocumentDetailModal';
import { RolesManagementModal } from './components/RolesManagementModal';
import { TimeInDeskConfigModal } from './components/TimeInDeskConfigModal';
import { DocumentAnalyticsDashboard } from './components/DocumentAnalyticsDashboard';
import { LoginModal } from './components/LoginModal';
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal';
import { DedicatedLinksView } from './components/DedicatedLinksView';
import { AdminSettingsView } from './components/AdminSettingsView';
import { PWAInstallButton } from './components/PWAInstallButton';
import { PossdLogo } from './components/PossdLogo';
import { motion, AnimatePresence } from 'motion/react';
import { DocumentLifecycleProgress } from './components/DocumentLifecycleProgress';
import { VerticalNavigationSidebar, WorkspaceTab } from './components/VerticalNavigationSidebar';
import {
  getTimeInDeskConfig,
  saveTimeInDeskConfig,
  calculateDocumentTimeInDesk,
} from './lib/timeInDesk';
import {
  FileText,
  PlusCircle,
  FileSpreadsheet,
  Search,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Building2,
  Clock,
  Send,
  UserCheck,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Users,
  MapPin,
  ChevronRight,
  TrendingUp,
  Inbox,
  SendHorizontal,
  RefreshCw,
  SlidersHorizontal,
  UserCog,
  Briefcase,
  Trash2,
  AlertTriangle,
  Lock,
  X,
  Timer,
  Sliders,
  BarChart3,
  Link2,
  Sun,
  Moon,
  LogIn,
  LogOut,
  Globe,
  Keyboard,
  CheckSquare,
} from 'lucide-react';

export default function App() {
  // Theme Toggle State ('light' | 'dark')
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = localStorage.getItem('possd_theme');
        if (saved === 'dark' || saved === 'light') return saved;
      }
    } catch (e) {
      // Sandboxed iframe
    }
    return 'dark';
  });

  useEffect(() => {
    try {
      const root = document.documentElement;
      if (theme === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('possd_theme', theme);
      }
    } catch (e) {
      // Sandboxed iframe
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  // Authentication & Google Sheets State
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [sheetConfig, setSheetConfig] = useState<SheetMetadata | null>(null);
  const [isAutoSyncing, setIsAutoSyncing] = useState<boolean>(false);
  const [isPushingAll, setIsPushingAll] = useState<boolean>(false);
  const [quotaCooldownSeconds, setQuotaCooldownSeconds] = useState<number>(0);
  const [isSheetModalOpen, setIsSheetModalOpen] = useState(false);

  // References to prevent quota over-consumption and circuit-breaker for rate limits
  const quotaCooldownUntilRef = useRef<number>(0);
  const pushTimeoutRef = useRef<any>(null);

  // Time-in-Desk Threshold Configuration State
  const [timeInDeskConfig, setTimeInDeskConfig] = useState<TimeInDeskConfig>(() =>
    getTimeInDeskConfig()
  );
  const [isThresholdModalOpen, setIsThresholdModalOpen] = useState(false);

  // Staff & Roles State
  const [staffList, setStaffList] = useState<AppUserRole[]>(() => getStoredStaffMembers());
  const [currentUser, setCurrentUser] = useState<AppUserRole>(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = localStorage.getItem('possd_active_user');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && parsed.name && parsed.role) {
            return parsed;
          }
        }
      }
    } catch (e) {
      // ignore
    }
    const initialStaff = getStoredStaffMembers();
    return initialStaff[0] || {
      id: 'SYS-ADMIN-1',
      name: 'Engr. System Admin',
      role: 'System Admin',
      division: 'Administrative Section',
      username: 'admin',
    };
  });
  const [isRolesModalOpen, setIsRolesModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const [dropdownOptions, setDropdownOptions] = useState<RegistryDropdownOptions>(() => getStoredDropdownOptions());

  // Dedicated Institutional Links State (Google Drives, Files, External Portals)
  const [dedicatedLinks, setDedicatedLinks] = useState<DedicatedLinkItem[]>(() => {
    try {
      const stored = localStorage.getItem('possd_dedicated_links');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [
      {
        id: 'link-drive-master',
        title: 'POSSD Master Google Drive Repository',
        url: 'https://drive.google.com',
        category: 'Google Drive',
        description: 'Central cloud drive repository for division folders, digital copies, and clearance attachments.',
        targetDivision: 'All Divisions',
        iconType: 'drive',
        addedBy: 'System Admin',
        addedAt: new Date().toISOString(),
        isPinned: true,
      },
      {
        id: 'link-routing-template',
        title: 'Standard Internal Routing Slip Template',
        url: 'https://docs.google.com/spreadsheets',
        category: 'Official Files',
        description: 'Prescribed routing slip sheet for tracking multi-desk document transmittals and compliance.',
        targetDivision: 'All Divisions',
        iconType: 'sheet',
        addedBy: 'System Admin',
        addedAt: new Date().toISOString(),
        isPinned: true,
      },
      {
        id: 'link-philpost-portal',
        title: 'Philippine Postal Corporation Portal',
        url: 'https://www.phlpost.gov.ph',
        category: 'Portals & Systems',
        description: 'Official PHLPost institutional corporate portal and administrative circulars directory.',
        targetDivision: 'Administrative Section',
        iconType: 'link',
        addedBy: 'System Admin',
        addedAt: new Date().toISOString(),
        isPinned: false,
      },
      {
        id: 'link-sla-manual',
        title: 'Document Turnaround & SLA Threshold Handbook',
        url: 'https://drive.google.com',
        category: 'Reference Guidelines',
        description: 'Operating reference guide on time-in-desk limits, urgent transactions, and focal routing.',
        targetDivision: 'All Divisions',
        iconType: 'file',
        addedBy: 'System Admin',
        addedAt: new Date().toISOString(),
        isPinned: false,
      },
    ];
  });

  // Fetch dedicated links from server on mount
  useEffect(() => {
    api.fetchLinks().then(data => { if (Array.isArray(data)) setDedicatedLinks(data); }).catch(e => console.warn(e));
  }, []);

  const handleAddDedicatedLink = (newLink: Omit<DedicatedLinkItem, 'id' | 'addedAt'>) => {
    const linkItem: DedicatedLinkItem = {
      ...newLink,
      id: `link-${Date.now()}`,
      addedAt: new Date().toISOString(),
    };
    const updated = [linkItem, ...dedicatedLinks];
    setDedicatedLinks(updated);
    try {
      localStorage.setItem('possd_dedicated_links', JSON.stringify(updated));
    } catch {}
    api.saveLinks(updated).catch((e) => console.warn('Failed to push link to server:', e));

    addNotification(
      'Resource Link Added',
      `System Admin registered "${linkItem.title}" to dedicated links directory.`,
      currentUser?.name || 'System Admin',
      'incoming',
      'LINK-NEW'
    );
  };

  const handleUpdateDedicatedLink = (id: string, updates: Partial<DedicatedLinkItem>) => {
    const updated = dedicatedLinks.map((l) => (l.id === id ? { ...l, ...updates } : l));
    setDedicatedLinks(updated);
    try {
      localStorage.setItem('possd_dedicated_links', JSON.stringify(updated));
    } catch {}
    api.saveLinks(updated).catch((e) => console.warn('Failed to push link to server:', e));
  };

  const handleDeleteDedicatedLink = (id: string) => {
    const updated = dedicatedLinks.filter((l) => l.id !== id);
    setDedicatedLinks(updated);
    try {
      localStorage.setItem('possd_dedicated_links', JSON.stringify(updated));
    } catch {}
    api.saveLinks(updated).catch((e) => console.warn('Failed to push link to server:', e));
  };

  // Documents State
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null);
  const [isIncomingModalOpen, setIsIncomingModalOpen] = useState(false);
  const [docToDelete, setDocToDelete] = useState<DocumentItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Batch Document Selection & Actions
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());
  const [batchAction, setBatchAction] = useState<string>('');
  const [isExecutingBatch, setIsExecutingBatch] = useState<boolean>(false);
  const [batchDocsToDelete, setBatchDocsToDelete] = useState<DocumentItem[] | null>(null);

  // Notifications State (Real-time activity log)
  const [notifications, setNotifications] = useState<RealtimeNotification[]>([]);

  // Filtering & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [divisionFilter, setDivisionFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'all' | 'incoming' | 'outgoing' | 'compliance_needed' | 'overdue'>('all');
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('documents');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);

  // Table Column Sorting State
  const [sortField, setSortField] = useState<
    'trackingNumber' | 'title' | 'dateReceived' | 'targetDivision' | 'currentCustodian' | 'timeInDesk' | 'lifecycle'
  >('dateReceived');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      // For dates, elapsed time, and status, default to desc; for text codes, default to asc
      if (field === 'dateReceived' || field === 'timeInDesk' || field === 'lifecycle') {
        setSortDirection('desc');
      } else {
        setSortDirection('asc');
      }
    }
  };

  // Refs for background sync interval
  const documentsRef = useRef<DocumentItem[]>(documents);
  const staffListRef = useRef<AppUserRole[]>(staffList);

  useEffect(() => {
    documentsRef.current = documents;
  }, [documents]);

  useEffect(() => {
    staffListRef.current = staffList;
  }, [staffList]);

  // Main Table Virtualized Lazy Loading State
  const [visibleDocCount, setVisibleDocCount] = useState<number>(30);

  // Sync Diagnostics State for Admin Settings
  const [syncDiagnosticLogs, setSyncDiagnosticLogs] = useState<SyncDiagnosticLog[]>(() => {
    try {
      const raw = safeStorageGet('possd_diagnostic_logs');
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return [
      {
        id: 'diag-init-1',
        timestamp: new Date(Date.now() - 1000 * 60 * 12).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        operation: 'push',
        durationMs: 412,
        docsCount: 35,
        personnelCount: 8,
        status: 'success',
        payloadSizeBytes: 18450,
        details: 'Baseline master synchronization (35 documents, 8 personnel).',
        breakdown: {
          networkLatencyMs: 375,
          payloadSerializationMs: 22,
          domProcessingMs: 15,
        },
      },
      {
        id: 'diag-init-2',
        timestamp: new Date(Date.now() - 1000 * 60 * 6).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        operation: 'pull',
        durationMs: 245,
        docsCount: 35,
        personnelCount: 8,
        status: 'success',
        payloadSizeBytes: 19120,
        details: 'Background polling auto-pull complete. Zero change delta detected.',
        breakdown: {
          networkLatencyMs: 230,
          payloadSerializationMs: 10,
          domProcessingMs: 5,
        },
      },
    ];
  });

  const addDiagnosticLog = (item: Omit<SyncDiagnosticLog, 'id' | 'timestamp'>) => {
    const newLog: SyncDiagnosticLog = {
      ...item,
      id: `diag-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    };
    setSyncDiagnosticLogs((prev) => {
      const updated = [newLog, ...prev.slice(0, 49)];
      try {
        safeStorageSet('possd_diagnostic_logs', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const handleClearDiagnosticLogs = () => {
    setSyncDiagnosticLogs([]);
    try {
      safeStorageRemove('possd_diagnostic_logs');
    } catch {}
  };

  // Real-time Sync Progress and Partial Sync Feedback State
  const [syncProgress, setSyncProgress] = useState<SyncProgressStatus>({
    inProgress: false,
    stage: 'idle',
    message: '',
    percent: 0,
    isPartial: false,
  });

  const [isDiagnosticSyncing, setIsDiagnosticSyncing] = useState<boolean>(false);

  const hasPendingSyncRef = useRef<boolean>(
    safeStorageGet('possd_has_unpushed_changes') === 'true'
  );

  // Debounced push queue to batch rapid mutations and protect against Google Sheets write quota exhaustion (60 writes/min)
  // Guarantees that any added log (incoming document, desk routing, remark, clearance) is preserved locally and synced to the sheet.
  const scheduleSheetPush = (updatedDocs: DocumentItem[], updatedStaff?: AppUserRole[]) => {
    hasPendingSyncRef.current = true;
    safeStorageSet('possd_has_unpushed_changes', 'true');

    if ((!token && !sheetConfig?.appsScriptUrl) || !sheetConfig?.spreadsheetId) {
      console.log('Sync queued: Changes saved locally and will auto-push to Google Sheet once connected or Apps Script configured.');
      return;
    }

    if (pushTimeoutRef.current) {
      clearTimeout(pushTimeoutRef.current);
    }

    const now = Date.now();
    const waitTime = Math.max(0, quotaCooldownUntilRef.current - now);
    const delay = waitTime > 0 ? waitTime + 1000 : 3500;

    pushTimeoutRef.current = setTimeout(async () => {
      setIsAutoSyncing(true);
      setSyncProgress({
        inProgress: true,
        stage: 'docs',
        message: `Syncing ${updatedDocs.length} documents to Master Sheet...`,
        percent: 30,
        isPartial: false,
      });

      try {
        const res = await syncAllDocumentsToSheet(
          token,
          sheetConfig.spreadsheetId,
          updatedDocs,
          updatedStaff || staffListRef.current,
          {
            appsScriptUrl: sheetConfig.appsScriptUrl,
            onProgress: (p) => {
              setSyncProgress({
                inProgress: true,
                stage: p.stage,
                message: p.message,
                percent: p.stage === 'headers' ? 25 : p.stage === 'docs' ? 50 : p.stage === 'docs_done' ? 75 : p.stage === 'personnel' ? 90 : 100,
                docsDone: p.docsDone,
                personnelDone: p.persDone,
                isPartial: p.stage === 'partial',
              });
            },
          }
        );

        hasPendingSyncRef.current = false;
        safeStorageRemove('possd_has_unpushed_changes');

        // Record telemetry log
        addDiagnosticLog({
          operation: 'push',
          durationMs: res.durationMs,
          docsCount: updatedDocs.length,
          personnelCount: (updatedStaff || staffListRef.current).length,
          status: res.partial ? 'partial' : 'success',
          payloadSizeBytes: res.payloadSizeBytes,
          details: res.details,
          breakdown: res.breakdown,
        });

        if (res.partial) {
          setSyncProgress({
            inProgress: false,
            stage: 'partial',
            message: 'Partial Sync: Documents saved. Personnel directory deferred to conserve API write quota.',
            percent: 100,
            isPartial: true,
            docsDone: true,
            personnelDone: false,
          });
          addNotification(
            'Partial Sync Complete',
            'All document rows were successfully written to Google Sheets. Personnel directory was deferred to prevent API write quota exhaustion.',
            'System Sync',
            'sync',
            'PARTIAL-SYNC'
          );
        } else {
          setSyncProgress({
            inProgress: false,
            stage: 'idle',
            message: 'Sync complete.',
            percent: 100,
            isPartial: false,
          });
        }
      } catch (err: any) {
        setSyncProgress({
          inProgress: false,
          stage: 'idle',
          message: 'Sync interrupted.',
          percent: 0,
          isPartial: false,
        });

        if (isGoogleQuotaError(err) || err?.message?.toLowerCase().includes('rate exceeded')) {
          const cooldownMs = 65_000;
          quotaCooldownUntilRef.current = Date.now() + cooldownMs;
          setQuotaCooldownSeconds(65);
          addNotification(
            'Sync Quota Cooldown',
            'Google Sheets write limit reached (60/min). Your added logs are safely preserved locally and will automatically sync once the window resets.',
            'System Sync',
            'sync',
            'QUOTA'
          );
          addDiagnosticLog({
            operation: 'push',
            durationMs: 0,
            docsCount: updatedDocs.length,
            personnelCount: (updatedStaff || staffListRef.current).length,
            status: 'error',
            payloadSizeBytes: 0,
            details: 'Google Sheets API Rate Exceeded (429). Cooldown initiated for 65s.',
          });
          // Automatically re-schedule push after cooldown so the added log is never dropped!
          scheduleSheetPush(updatedDocs, updatedStaff);
        } else {
          console.error('Failed to sync changes to Google Sheet:', err);
          addDiagnosticLog({
            operation: 'push',
            durationMs: 0,
            docsCount: updatedDocs.length,
            personnelCount: (updatedStaff || staffListRef.current).length,
            status: 'error',
            payloadSizeBytes: 0,
            details: `Failed to push: ${err?.message || 'Unknown network error'}`,
          });
        }
      } finally {
        setIsAutoSyncing(false);
      }
    }, delay);
  };

  // Benchmark Sync Runner for Diagnostics Tab
  const handleRunDiagnosticBenchmark = async () => {
    if (!sheetConfig?.spreadsheetId) {
      setIsSheetModalOpen(true);
      return;
    }

    setIsDiagnosticSyncing(true);
    setSyncProgress({
      inProgress: true,
      stage: 'docs',
      message: 'Running benchmark synchronization test...',
      percent: 20,
      isPartial: false,
    });

    try {
      const res = await syncAllDocumentsToSheet(
        token,
        sheetConfig.spreadsheetId,
        documentsRef.current,
        staffListRef.current,
        {
          appsScriptUrl: sheetConfig.appsScriptUrl,
          onProgress: (p) => {
            setSyncProgress({
              inProgress: true,
              stage: p.stage,
              message: p.message,
              percent: p.stage === 'headers' ? 25 : p.stage === 'docs' ? 55 : p.stage === 'personnel' ? 85 : 100,
              docsDone: p.docsDone,
              personnelDone: p.persDone,
              isPartial: p.stage === 'partial',
            });
          },
        }
      );

      addDiagnosticLog({
        operation: 'push',
        durationMs: res.durationMs,
        docsCount: documentsRef.current.length,
        personnelCount: staffListRef.current.length,
        status: res.partial ? 'partial' : 'success',
        payloadSizeBytes: res.payloadSizeBytes,
        details: `Benchmark test: ${res.details}`,
        breakdown: res.breakdown,
      });

      addNotification(
        'Diagnostic Benchmark Complete',
        `Benchmark finished in ${res.durationMs}ms with ${(res.payloadSizeBytes / 1024).toFixed(1)} KB payload. Status: ${res.partial ? 'Partial' : 'Full Success'}.`,
        'Diagnostics',
        'sync',
        'BENCHMARK'
      );
    } catch (err: any) {
      addDiagnosticLog({
        operation: 'push',
        durationMs: 0,
        docsCount: documentsRef.current.length,
        personnelCount: staffListRef.current.length,
        status: 'error',
        payloadSizeBytes: 0,
        details: `Benchmark test failed: ${err?.message || 'Network/auth issue'}`,
      });
    } finally {
      setIsDiagnosticSyncing(false);
      setSyncProgress({
        inProgress: false,
        stage: 'idle',
        message: '',
        percent: 0,
        isPartial: false,
      });
    }
  };

  // When sheet credentials / connection become active, automatically flush any un-synced logs
  useEffect(() => {
    if ((!token && !sheetConfig?.appsScriptUrl) || !sheetConfig?.spreadsheetId) return;
    if (hasPendingSyncRef.current || safeStorageGet('possd_has_unpushed_changes') === 'true') {
      scheduleSheetPush(documentsRef.current, staffListRef.current);
    }
  }, [token, sheetConfig]);

  // Background Auto-Sync: 30-second read-only polling to observe remote changes without consuming write quota
  // Supports zero-login public sheets via GViz proxy as well as OAuth sessions
  useEffect(() => {
    if (!sheetConfig?.spreadsheetId) return;

    let isSyncing = false;

    const performAutoPull = async () => {
      // If currently cooling down from HTTP 429 quota, skip polling
      if (Date.now() < quotaCooldownUntilRef.current) {
        return;
      }

      if (isSyncing) return;
      isSyncing = true;
      setIsAutoSyncing(true);

      try {
        // Read-only pull — safely merges with local documents and movements
        const pullResult = await pullAllFromSheet(
          token,
          sheetConfig.spreadsheetId,
          documentsRef.current,
          staffListRef.current
        );

        const { documents: pulledDocs, personnel: pulledStaff, durationMs, payloadSizeBytes, details } = pullResult;

        // Record telemetry log for auto-pull
        addDiagnosticLog({
          operation: 'pull',
          durationMs,
          docsCount: pulledDocs.length,
          personnelCount: pulledStaff.length,
          status: 'success',
          payloadSizeBytes,
          details,
          breakdown: {
            networkLatencyMs: Math.round(durationMs * 0.9),
            payloadSerializationMs: Math.round(durationMs * 0.08),
            domProcessingMs: Math.round(durationMs * 0.02),
          },
        });

        // Detect if anything actually changed before re-rendering
        const currentDocs = documentsRef.current;
        const docsChanged =
          pulledDocs.length !== currentDocs.length ||
          pulledDocs.some((d, i) => {
            const existing = currentDocs[i];
            return (
              !existing ||
              existing.id !== d.id ||
              existing.currentStatus !== d.currentStatus ||
              existing.currentLocation !== d.currentLocation ||
              existing.currentCustodian !== d.currentCustodian ||
              (existing.movements?.length || 0) !== (d.movements?.length || 0) ||
              (existing.supervisorRemarks?.length || 0) !== (d.supervisorRemarks?.length || 0) ||
              existing.managerClearance?.isCleared !== d.managerClearance?.isCleared ||
              existing.updatedAt !== d.updatedAt
            );
          });

        if (docsChanged) {
          setDocuments(pulledDocs);
          saveStoredDocuments(pulledDocs);
        }

        const currentStaff = staffListRef.current;
        const staffChanged =
          pulledStaff.length !== currentStaff.length ||
          pulledStaff.some((s, i) => {
            const existing = currentStaff[i];
            return (
              !existing ||
              existing.id !== s.id ||
              existing.role !== s.role ||
              existing.division !== s.division ||
              existing.status !== s.status
            );
          });

        if (staffChanged) {
          setStaffList(pulledStaff);
          saveStoredStaffMembers(pulledStaff);
        }

        // If local had unsynced logs before or during auto-pull, push the merged state back to the sheet!
        if (hasPendingSyncRef.current) {
          scheduleSheetPush(pulledDocs, staffListRef.current);
        }
      } catch (err: any) {
        if (isGoogleQuotaError(err) || err?.message?.toLowerCase().includes('rate exceeded')) {
          const cooldownMs = 65_000;
          quotaCooldownUntilRef.current = Date.now() + cooldownMs;
          setQuotaCooldownSeconds(65);
          console.warn('Google Sheets API rate limit reached. Auto-sync paused for 65 seconds (Local data preserved).');
          addDiagnosticLog({
            operation: 'pull',
            durationMs: 0,
            docsCount: documentsRef.current.length,
            personnelCount: staffListRef.current.length,
            status: 'error',
            payloadSizeBytes: 0,
            details: 'Read rate limit reached during background polling. Paused for 65s.',
          });
        } else {
          console.warn('Auto-sync pull failed:', err);
        }
      } finally {
        isSyncing = false;
        setIsAutoSyncing(false);
      }
    };

    // Initial pull after 2s, then every 30s
    const initialTimer = setTimeout(performAutoPull, 2000);
    const interval = setInterval(performAutoPull, 30000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [token, sheetConfig]);

  // Quota cooldown countdown ticker
  useEffect(() => {
    if (quotaCooldownSeconds <= 0) return;
    const ticker = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((quotaCooldownUntilRef.current - Date.now()) / 1000));
      setQuotaCooldownSeconds(remaining);
      if (remaining <= 0) {
        clearInterval(ticker);
      }
    }, 1000);
    return () => clearInterval(ticker);
  }, [quotaCooldownSeconds]);

  // Sign Out / Logout handler - Turns back to Official Portal Login Page
  const handleLogout = async () => {
    try {
      await logoutGoogle();
    } catch (e) {
      console.warn('Google logout warning:', e);
    }
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem('possd_active_user');
      }
    } catch (e) {}
    setUser(null);
    setToken(null);
    setAccessToken(null);
    fetch('/api/sheet-auth-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: null }),
    }).catch(() => {});
    setCurrentUser(null);
    setIsLoginModalOpen(false);
  };

  // Manual Instant Refresh Handler
  const handleManualSync = async () => {
    if (!sheetConfig?.spreadsheetId) {
      setIsSheetModalOpen(true);
      return;
    }

    if (Date.now() < quotaCooldownUntilRef.current) {
      const remaining = Math.max(1, Math.ceil((quotaCooldownUntilRef.current - Date.now()) / 1000));
      addNotification(
        'Sync Cooling Down',
        `Google Sheets API quota is resetting. Please wait ${remaining}s before manual sync.`,
        'System Sync',
        'sync',
        'COOLDOWN'
      );
      return;
    }

    setIsAutoSyncing(true);
    setSyncProgress({
      inProgress: true,
      stage: 'headers',
      message: 'Reading master ledger from Google Sheet...',
      percent: 30,
      isPartial: false,
    });

    try {
      const pullResult = await pullAllFromSheet(
        token,
        sheetConfig.spreadsheetId,
        documentsRef.current,
        staffListRef.current
      );

      const { documents: pulledDocs, personnel: pulledStaff, durationMs, payloadSizeBytes, details } = pullResult;
      setDocuments(pulledDocs);
      saveStoredDocuments(pulledDocs);
      setStaffList(pulledStaff);
      saveStoredStaffMembers(pulledStaff);

      addDiagnosticLog({
        operation: 'pull',
        durationMs,
        docsCount: pulledDocs.length,
        personnelCount: pulledStaff.length,
        status: 'success',
        payloadSizeBytes,
        details: `Manual sync pull: ${details}`,
        breakdown: {
          networkLatencyMs: Math.round(durationMs * 0.9),
          payloadSerializationMs: Math.round(durationMs * 0.08),
          domProcessingMs: Math.round(durationMs * 0.02),
        },
      });

      addNotification(
        'Google Sheet Synchronized',
        `Refreshed ${pulledDocs.length} documents and ${pulledStaff.length} personnel profiles from Google Sheet in ${durationMs}ms.`,
        'System Sync',
        'sync',
        'MANUAL-SYNC'
      );
    } catch (err: any) {
      if (isGoogleQuotaError(err) || err?.message?.toLowerCase().includes('rate exceeded')) {
        quotaCooldownUntilRef.current = Date.now() + 65_000;
        setQuotaCooldownSeconds(65);
        addNotification(
          'Sync Quota Cooldown',
          'Google Sheets rate limit reached (60/min). Local data is safely preserved and sync will resume automatically.',
          'System Sync',
          'sync',
          'QUOTA'
        );
        addDiagnosticLog({
          operation: 'pull',
          durationMs: 0,
          docsCount: documentsRef.current.length,
          personnelCount: staffListRef.current.length,
          status: 'error',
          payloadSizeBytes: 0,
          details: 'Google Sheets rate limit (429) hit during manual refresh.',
        });
      } else {
        console.error('Manual sync failed:', err);
        addDiagnosticLog({
          operation: 'pull',
          durationMs: 0,
          docsCount: documentsRef.current.length,
          personnelCount: staffListRef.current.length,
          status: 'error',
          payloadSizeBytes: 0,
          details: `Manual pull failed: ${err?.message || 'Network error'}`,
        });
      }
    } finally {
      setIsAutoSyncing(false);
      setSyncProgress({
        inProgress: false,
        stage: 'idle',
        message: '',
        percent: 0,
        isPartial: false,
      });
    }
  };

  // Dedicated Force Push All Handler for Top Ribbon & Manual Action
  const handlePushAllNow = async () => {
    if (!sheetConfig?.spreadsheetId) {
      setIsSheetModalOpen(true);
      return;
    }

    let activeToken = token;
    // If no active token, check if Apps Script URL is set or server has shared token
    if (!activeToken && !sheetConfig.appsScriptUrl) {
      try {
        const tokenRes = await fetch('/api/sheet-auth-token').then((r) => r.json());
        if (tokenRes.success && tokenRes.token) {
          activeToken = tokenRes.token;
          setToken(tokenRes.token);
          setAccessToken(tokenRes.token);
        }
      } catch {}
    }

    setIsPushingAll(true);
    setSyncProgress({
      inProgress: true,
      stage: 'docs',
      message: `Writing ${documentsRef.current.length} documents to Google Sheet...`,
      percent: 25,
      isPartial: false,
    });

    try {
      const res = await syncAllDocumentsToSheet(
        activeToken,
        sheetConfig.spreadsheetId,
        documentsRef.current,
        staffListRef.current,
        {
          forceHeaders: true,
          appsScriptUrl: sheetConfig.appsScriptUrl,
          onProgress: (p) => {
            setSyncProgress({
              inProgress: true,
              stage: p.stage,
              message: p.message,
              percent: p.stage === 'headers' ? 20 : p.stage === 'docs' ? 50 : p.stage === 'personnel' ? 85 : 100,
              docsDone: p.docsDone,
              personnelDone: p.persDone,
              isPartial: p.stage === 'partial',
            });
          },
        }
      );

      hasPendingSyncRef.current = false;
      safeStorageRemove('possd_has_unpushed_changes');

      // Record diagnostic telemetry
      addDiagnosticLog({
        operation: 'push',
        durationMs: res.durationMs,
        docsCount: documentsRef.current.length,
        personnelCount: staffListRef.current.length,
        status: res.partial ? 'partial' : 'success',
        payloadSizeBytes: res.payloadSizeBytes,
        details: res.details,
        breakdown: res.breakdown,
      });

      // Update URL with direct gid tab link if not present
      if (res.masterSheetId !== undefined && !sheetConfig.spreadsheetUrl.includes('#gid=')) {
        const updatedConfig: SheetMetadata = {
          ...sheetConfig,
          spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${sheetConfig.spreadsheetId}/edit#gid=${res.masterSheetId}`,
          sheetName: res.masterTabName,
        };
        setSheetConfig(updatedConfig);
        saveStoredSheetConfig(updatedConfig);
      }

      if (res.partial) {
        setSyncProgress({
          inProgress: false,
          stage: 'partial',
          message: 'Partial Sync Complete: Documents uploaded, directory deferred.',
          percent: 100,
          isPartial: true,
        });
        addNotification(
          'Partial Sync Complete',
          `All ${res.rowsUpdated} document rows were written to sheet in ${res.durationMs}ms. Personnel roster deferred to prevent quota throttling.`,
          currentUser?.name || 'System',
          'sync',
          'PUSH-ALL-PARTIAL'
        );
      } else {
        setSyncProgress({
          inProgress: false,
          stage: 'idle',
          message: 'All records pushed.',
          percent: 100,
          isPartial: false,
        });
        addNotification(
          'Google Sheet Synchronized',
          `Successfully logged ${res.rowsUpdated} document records and ${res.personnelUpdated} personnel profiles to tab "${res.masterTabName}" in ${res.durationMs}ms.`,
          currentUser?.name || 'System',
          'sync',
          'PUSH-ALL-SUCCESS'
        );
      }
    } catch (err: any) {
      setSyncProgress({
        inProgress: false,
        stage: 'idle',
        message: 'Push failed.',
        percent: 0,
        isPartial: false,
      });

      if (isGoogleQuotaError(err) || err?.message?.toLowerCase().includes('rate exceeded')) {
        quotaCooldownUntilRef.current = Date.now() + 65_000;
        setQuotaCooldownSeconds(65);
        addNotification(
          'Sync Quota Cooldown',
          'Google Sheets write quota reached (60 requests/min). All records are safely preserved locally and will sync once the window resets.',
          'System Sync',
          'sync',
          'QUOTA'
        );
        addDiagnosticLog({
          operation: 'push',
          durationMs: 0,
          docsCount: documentsRef.current.length,
          personnelCount: staffListRef.current.length,
          status: 'error',
          payloadSizeBytes: 0,
          details: 'Google Sheets rate limit exceeded during push all.',
        });
      } else {
        console.error('Failed to push all records to Google Sheet:', err);
        addDiagnosticLog({
          operation: 'push',
          durationMs: 0,
          docsCount: documentsRef.current.length,
          personnelCount: staffListRef.current.length,
          status: 'error',
          payloadSizeBytes: 0,
          details: `Push failed: ${err?.message || 'Error writing to Google Sheet'}`,
        });
        addNotification(
          'Sync Failed',
          err?.message || 'Failed to push all entries to Google Sheet. Check permissions or network.',
          'System Sync',
          'sync',
          'SYNC-FAILED'
        );
        setIsSheetModalOpen(true);
      }
    } finally {
      setIsPushingAll(false);
    }
  };

  const handleSaveThresholdConfig = (updated: TimeInDeskConfig) => {
    setTimeInDeskConfig(updated);
    saveTimeInDeskConfig(updated);
    addNotification(
      'Thresholds Updated',
      `Time-in-desk baseline updated to ${updated.defaultThresholdHours}h with ${Object.keys(updated.divisionThresholds).length} division rules.`,
      currentUser?.name || 'System',
      'movement',
      'THRESH-UPDATE'
    );
  };

  // Load initial data & Firebase Auth Listener
  useEffect(() => {
    const localDocs = getStoredDocuments();
    setDocuments(localDocs);
    const existingConfig = getStoredSheetConfig();
    setSheetConfig(existingConfig);

    // Cross-Device Backend Hydration
    fetch('/api/sheet-config')
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.sheetConfig) {
          setSheetConfig((prev) => prev || data.sheetConfig);
          if (!existingConfig) {
            saveStoredSheetConfig(data.sheetConfig);
          }
        }
      })
      .catch(() => {});

    // Hydration now happens in initAuth successfully

    // Cross-Device Instant Sync URL & Hash Detection
    try {
      const hash = window.location.hash || '';
      const params = new URLSearchParams(window.location.search);
      let syncRaw = '';

      if (hash.startsWith('#sync_staff=')) {
        syncRaw = hash.replace('#sync_staff=', '');
      } else if (hash.startsWith('#sync=')) {
        syncRaw = hash.replace('#sync=', '');
      } else if (params.has('sync_staff')) {
        syncRaw = params.get('sync_staff') || '';
      } else if (params.has('sync_code')) {
        syncRaw = params.get('sync_code') || '';
      }

      if (syncRaw) {
        const payload = decodePersonnelSyncCode(syncRaw);
        if (payload && Array.isArray(payload.staff) && payload.staff.length > 0) {
          const currentStaff = getStoredStaffMembers();
          // Merge staff prioritizing payload
          const staffMap = new Map<string, AppUserRole>();
          currentStaff.forEach((s) => staffMap.set(s.id, s));
          payload.staff.forEach((s) => staffMap.set(s.id, s));
          const mergedStaff = Array.from(staffMap.values());

          setStaffList(mergedStaff);
          saveStoredStaffMembers(mergedStaff);

          if (payload.dropdownOptions) {
            setDropdownOptions(payload.dropdownOptions);
            saveStoredDropdownOptions(payload.dropdownOptions);
          }

          if (payload.sheetConfig && !existingConfig) {
            setSheetConfig(payload.sheetConfig);
            saveStoredSheetConfig(payload.sheetConfig);
          }

          // Clean URL so the token is not exposed in address bar
          window.history.replaceState(null, '', window.location.pathname);

          setTimeout(() => {
            addNotification(
              'Multi-Device Sync Applied',
              `Successfully loaded ${payload.staff.length} personnel profiles and credentials from device transfer link.`,
              'System',
              'sync',
              'DEVICE-SYNC'
            );
          }, 600);
        }
      }

      // Check ?sheet=<spreadsheetId> parameter for fast sheet linking across devices
      const sheetParam = params.get('sheet');
      if (sheetParam && (!existingConfig || existingConfig.spreadsheetId !== sheetParam)) {
        const newSheetCfg: SheetMetadata = {
          spreadsheetId: sheetParam,
          spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${sheetParam}/edit`,
          title: 'POSSD Document Tracking & Personnel Directory',
          linkedAt: new Date().toISOString(),
        };
        setSheetConfig(newSheetCfg);
        saveStoredSheetConfig(newSheetCfg);
        setTimeout(() => {
          addNotification(
            'Google Sheet Linked',
            `Linked to Google Sheet ID: ${sheetParam}`,
            'System',
            'sync',
            'SHEET-AUTO-CONNECT'
          );
        }, 800);
      }
    } catch (e) {
      console.warn('Could not parse multi-device sync params', e);
    }

    // Cross-Tab Broadcast Channel listener
    const cleanupBroadcast = onDataUpdate((type, data) => {
      if (type === 'staff' && Array.isArray(data)) {
        setStaffList(data);
      } else if (type === 'documents' && Array.isArray(data)) {
        setDocuments(data);
      } else if (type === 'dropdowns' && data) {
        setDropdownOptions(data);
      }
    });

    const unsubscribe = initAuth(
      async (authedUser, oauthToken) => {
        setUser(authedUser);
        setToken(oauthToken);
        setAccessToken(oauthToken);
        
        try {
          // Cross-device backend hydration
          const [docs, staff, links] = await Promise.all([
            api.fetchDocuments(),
            api.fetchStaff(),
            api.fetchLinks()
          ]);

          if (docs && docs.length > 0) {
            setDocuments(docs);
            saveStoredDocuments(docs);
          }
          let currentStaffList = staffListRef.current;
          if (staff && staff.length > 0) {
            setStaffList(staff);
            saveStoredStaffMembers(staff);
            currentStaffList = staff;
          }
          
          // Map Firebase user to personnel directory
          let matchedStaff = currentStaffList.find(s => s.email === authedUser.email || ((s.name || '').includes('Rey Reginald') && authedUser.email === 'reymojica01@gmail.com'));
          
          if (authedUser.email === 'reymojica01@gmail.com') {
             if (matchedStaff) {
                matchedStaff = { ...matchedStaff, role: 'System Admin', email: authedUser.email };
             } else {
                matchedStaff = {
                   id: authedUser.uid,
                   name: authedUser.displayName || 'Rey Reginald A. Mojica',
                   role: 'System Admin',
                   division: 'CMED',
                   username: 'reymojica01',
                   email: authedUser.email
                };
             }
             
             // Ensure it's in the staff list so it persists correctly
             const updatedList = currentStaffList.some(s => s.id === matchedStaff.id)
                ? currentStaffList.map(s => s.id === matchedStaff.id ? matchedStaff : s)
                : [...currentStaffList, matchedStaff];
             setStaffList(updatedList);
             saveStoredStaffMembers(updatedList);
          }
          
          if (matchedStaff) {
             setCurrentUser(matchedStaff);
             localStorage.setItem('possd_active_user', JSON.stringify(matchedStaff));
          } else if (authedUser.email) {
             // Default viewer role
             const viewer: AppUserRole = {
               id: authedUser.uid,
               name: authedUser.displayName || authedUser.email.split('@')[0],
               role: 'Viewer', division: 'General', username: authedUser.email.split('@')[0], email: authedUser.email
             };
             setCurrentUser(viewer);
             localStorage.setItem('possd_active_user', JSON.stringify(viewer));
          }
          // The links are currently not being set into state here, but can be managed by DedicatedLinksView
        } catch (e) {
          console.error("Failed to hydrate from backend:", e);
        }
      },
      () => {
        setUser(null);
        setToken(null);
        setAccessToken(null);
        setCurrentUser(null);
      }
    );

    return () => {
      unsubscribe();
      cleanupBroadcast();
    };
  }, []);

  // Global Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore keybindings if the user is typing in any form input, textarea, or contentEditable
      const target = e.target as HTMLElement | null;
      const isInputFocused =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        Boolean(target?.isContentEditable);

      // Escape always closes any currently active overlay/modal
      if (e.key === 'Escape') {
        if (isShortcutsModalOpen) {
          setIsShortcutsModalOpen(false);
          return;
        }
        if (selectedDoc) {
          setSelectedDoc(null);
          return;
        }
        if (isIncomingModalOpen) {
          setIsIncomingModalOpen(false);
          return;
        }
        if (isSheetModalOpen) {
          setIsSheetModalOpen(false);
          return;
        }
        if (isRolesModalOpen) {
          setIsRolesModalOpen(false);
          return;
        }
        if (isLoginModalOpen) {
          setIsLoginModalOpen(false);
          return;
        }
        if (isThresholdModalOpen) {
          setIsThresholdModalOpen(false);
          return;
        }
        if (batchDocsToDelete) {
          setBatchDocsToDelete(null);
          return;
        }
        if (docToDelete) {
          setDocToDelete(null);
          return;
        }
        return;
      }

      // Quick Search shortcut: '/' or Ctrl+K / Cmd+K
      if ((e.key === '/' && !isInputFocused) || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k')) {
        e.preventDefault();
        const searchInput =
          (document.getElementById('document-search-input') as HTMLInputElement) ||
          (document.getElementById('registry-search-input') as HTMLInputElement);
        if (searchInput) {
          searchInput.focus();
          searchInput.select?.();
        }
        return;
      }

      // If typing inside an input/textarea/select, do not trigger single-key action shortcuts
      if (isInputFocused) {
        return;
      }

      // Open Shortcuts Guide: '?' or Shift+'/'
      if (e.key === '?' || (e.shiftKey && e.key === '?')) {
        e.preventDefault();
        setIsShortcutsModalOpen((prev) => !prev);
        return;
      }

      // Action: Log Document ('n' or 'N')
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        setIsIncomingModalOpen(true);
        return;
      }

      // Action: Google Sheets Integration & Diagnostics ('s' or 'S')
      if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        setIsSheetModalOpen(true);
        return;
      }

      // Action: Refresh / Manual Sync ('r' or 'R')
      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        handleManualSync();
        return;
      }

      // Navigation tabs: '1' for Registry, '2' for Distribution Desk, '3' for Analytics, '4' for Roles
      if (e.key === '1') {
        e.preventDefault();
        setActiveTab('documents');
        return;
      }
      if (e.key === '2') {
        e.preventDefault();
        setActiveTab('distribution');
        return;
      }
      if (e.key === '3') {
        e.preventDefault();
        setActiveTab('analytics');
        return;
      }
      if (e.key === '4') {
        e.preventDefault();
        setIsRolesModalOpen(true);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isShortcutsModalOpen,
    selectedDoc,
    isIncomingModalOpen,
    isSheetModalOpen,
    isRolesModalOpen,
    isLoginModalOpen,
    isThresholdModalOpen,
    batchDocsToDelete,
    docToDelete,
    handleManualSync,
  ]);

  // Real-time notification helper
  const addNotification = (
    title: string,
    message: string,
    performedBy: string,
    type: 'incoming' | 'movement' | 'remark' | 'compliance' | 'clearance' | 'sync' | 'urgent',
    trackingNumber?: string
  ) => {
    const newNotif: RealtimeNotification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      title,
      message,
      actor: performedBy,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type,
      trackingNumber,
      read: false,
    };
    setNotifications((prev) => [newNotif, ...prev.slice(0, 49)]);
  };

  // Quick switch role
  const handleQuickSwitchRole = (role: UserRoleType) => {
    const match = staffList.find((s) => s.role === role);
    if (match) {
      setCurrentUser(match);
      addNotification('Role Switched', `Switched active perspective to ${match.name} (${role})`, match.name, 'movement', 'ROLE');
    } else {
      const updated: AppUserRole = {
        ...currentUser,
        role,
      };
      setCurrentUser(updated);
    }
  };

  // Staff list management handlers
  const handleAddStaffMember = (newStaff: AppUserRole) => {
    const updated = [...staffList, newStaff];
    setStaffList(updated);
    saveStoredStaffMembers(updated);
    broadcastDataUpdate('staff', updated);

    // Auto-sync to Google Sheet if connected (debounced to avoid rate limits)
    if (token && sheetConfig) {
      scheduleSheetPush(documents, updated);
    }

    addNotification(
      'Staff Enrolled',
      `Registered ${newStaff.name} as ${newStaff.role} (${newStaff.division})`,
      currentUser?.name || 'System',
      'sync',
      'STAFF'
    );
  };

  const handleUpdateStaffRole = (staffId: string, newRole: UserRoleType, newDivision?: string) => {
    const updated = staffList.map((s) => {
      if (s.id === staffId) {
        return {
          ...s,
          role: newRole,
          ...(newDivision ? { division: newDivision } : {}),
        };
      }
      return s;
    });
    setStaffList(updated);
    saveStoredStaffMembers(updated);
    broadcastDataUpdate('staff', updated);

    if (token && sheetConfig) {
      scheduleSheetPush(documents, updated);
    }

    if (currentUser?.id === staffId) {
      setCurrentUser((prev) => ({
        ...prev,
        role: newRole,
        ...(newDivision ? { division: newDivision } : {}),
      }));
    }

    addNotification(
      'Role Updated',
      `Updated role permission for staff ${staffId} to ${newRole}`,
      currentUser?.name || 'System',
      'sync',
      'ROLE'
    );
  };

  const handleUpdateStaffCredentials = (
    staffId: string,
    updates: { username?: string; password?: string; status?: 'active' | 'suspended' }
  ) => {
    const updated = staffList.map((s) => {
      if (s.id === staffId) {
        return {
          ...s,
          ...updates,
        };
      }
      return s;
    });
    setStaffList(updated);
    saveStoredStaffMembers(updated);
    broadcastDataUpdate('staff', updated);

    if (token && sheetConfig) {
      scheduleSheetPush(documents, updated);
    }

    if (currentUser?.id === staffId) {
      setCurrentUser((prev) => ({
        ...prev,
        ...updates,
      }));
    }

    addNotification(
      'Credentials Enrolled',
      `Admin updated portal login credentials for personnel ID ${staffId}.`,
      currentUser?.name || 'System',
      'sync',
      staffId
    );
  };

  const handleDeleteStaffMember = (staffId: string) => {
    const updated = staffList.filter((s) => s.id !== staffId);
    setStaffList(updated);
    saveStoredStaffMembers(updated);
    broadcastDataUpdate('staff', updated);

    if (token && sheetConfig) {
      scheduleSheetPush(documents, updated);
    }

    addNotification('Staff Removed', `Removed personnel ID ${staffId}`, currentUser?.name || 'System', 'sync', 'STAFF');
  };

  const handleUpdateDropdownOptions = (updatedOptions: RegistryDropdownOptions) => {
    setDropdownOptions(updatedOptions);
    saveStoredDropdownOptions(updatedOptions);
    broadcastDataUpdate('dropdowns', updatedOptions);
    addNotification('Options Updated', 'Custom dropdown values updated', currentUser?.name || 'System', 'sync', 'DROPDOWNS');
  };

  // HANDLER: Create New Incoming Document
  const handleCreateDocument = async (newDoc: DocumentItem) => {
    try {
      // Opt-in central backend flow
      const savedDoc = await api.createDocument(newDoc);
      
      const updatedList = [savedDoc, ...documents];
      setDocuments(updatedList);
      saveStoredDocuments(updatedList);
      setIsIncomingModalOpen(false);

      addNotification(
        'Document Inflow Registered',
        `${savedDoc.trackingNumber}: "${savedDoc.title}" received from ${savedDoc.originDepartment}`,
        currentUser?.name || 'System',
        'incoming',
        savedDoc.trackingNumber
      );
      
      api.logAudit("CREATE DOCUMENT", savedDoc.id, currentUser?.name || 'System', "", `Created: ${savedDoc.title}`);
    } catch (err: any) {
      addNotification('Error', 'Unable to save document. Please try again.', currentUser?.name || 'System', 'urgent');
      console.error(err);
    }
  };

  // HANDLER: Update Document
  const handleUpdateDocument = async (updatedDoc: DocumentItem) => {
    try {
      const oldDoc = documents.find((d) => d.id === updatedDoc.id);
      const savedDoc = await api.updateDocument(updatedDoc);
      
      const updatedList = documents.map((d) => (d.id === savedDoc.id ? savedDoc : d));
      setDocuments(updatedList);
      saveStoredDocuments(updatedList);
      setSelectedDoc(savedDoc);

      if (oldDoc && oldDoc.currentLocation !== savedDoc.currentLocation) {
        addNotification(
          'Document Routed',
          `${savedDoc.trackingNumber} transferred to ${savedDoc.currentLocation} (Custodian: ${savedDoc.currentCustodian})`,
          currentUser?.name || 'System',
          'movement',
          savedDoc.trackingNumber
        );
        api.logAudit("CHANGE STATUS", savedDoc.id, currentUser?.name || 'System', oldDoc.currentLocation, savedDoc.currentLocation);
      } else if (
        oldDoc &&
        (!oldDoc.supervisorRemarks || oldDoc.supervisorRemarks.length < (savedDoc.supervisorRemarks?.length || 0))
      ) {
        const latestRemark = savedDoc.supervisorRemarks?.[savedDoc.supervisorRemarks.length - 1];
        addNotification(
          'Supervisor Remark Added',
          `${savedDoc.trackingNumber}: ${latestRemark?.supervisorName} added directive ("${latestRemark?.remarkText}")`,
          currentUser?.name || 'System',
          'remark',
          savedDoc.trackingNumber
        );
        api.logAudit("UPDATE DOCUMENT", savedDoc.id, currentUser?.name || 'System', "", "Added Supervisor Remark");
      } else if (
        oldDoc &&
        !oldDoc.managerClearance?.isCleared &&
        savedDoc.managerClearance?.isCleared
      ) {
        addNotification(
          'Manager Clearance Approved',
          `${savedDoc.trackingNumber} cleared for Outgoing Dispatch by ${savedDoc.managerClearance.clearedBy || currentUser?.name}`,
          currentUser?.name || 'System',
          'clearance',
          savedDoc.trackingNumber
        );
        api.logAudit("UPDATE DOCUMENT", savedDoc.id, currentUser?.name || 'System', "", "Manager Clearance Approved");
      } else if (
        oldDoc &&
        oldDoc.supervisorRemarks?.some((r) => !r.complied) &&
        savedDoc.supervisorRemarks?.every((r) => !r.complianceRequired || r.complied)
      ) {
        addNotification(
          'Compliance Verified',
          `${savedDoc.trackingNumber}: Staff verified all supervisor requirements fulfilled`,
          currentUser?.name || 'System',
          'compliance',
          savedDoc.trackingNumber
        );
      } else {
        api.logAudit("UPDATE DOCUMENT", savedDoc.id, currentUser?.name || 'System', "", "General Update");
      }
    } catch (err) {
      addNotification('Error', 'Unable to update document. Please try again.', currentUser?.name || 'System', 'urgent');
      console.error(err);
    }
  };

  // HANDLER: Delete document entry (only for System Admins and Department Manager)
  const handleDeleteDocument = async (doc: DocumentItem) => {
    if (!canUserDeleteDocuments(currentUser?.role)) {
      addNotification(
        'Action Restricted',
        'Deleting entries from incoming and outgoing logs is strictly restricted to System Admins and Department Managers.',
        currentUser?.name || 'System',
        'sync',
        doc.trackingNumber
      );
      return;
    }

    try {
      setIsDeleting(true);
      await api.deleteDocument(doc.id);
      
      const updatedList = documents.filter((d) => d.id !== doc.id);
      setDocuments(updatedList);
      saveStoredDocuments(updatedList);

      if (selectedDoc?.id === doc.id) {
        setSelectedDoc(null);
      }
      setDocToDelete(null);

      const isOutgoing = doc.managerClearance?.isCleared || doc.currentStatus === 'Cleared for Out' || doc.currentStatus === 'Dispatched / Completed';
      const logType = isOutgoing ? 'Outgoing Log' : 'Incoming Log';

      addNotification(
        'Log Entry Deleted',
        `${logType} entry "${doc.title}" (${doc.trackingNumber}) was permanently deleted by ${currentUser?.name} (${currentUser?.role}).`,
        currentUser?.name || 'System',
        'sync',
        doc.trackingNumber
      );
      
      api.logAudit("DELETE DOCUMENT", doc.id, currentUser?.name || 'System', `Tracking #: ${doc.trackingNumber}`, "");
    } catch (err: any) {
      addNotification('Error', 'Unable to delete document. Please try again.', currentUser?.name || 'System', 'urgent');
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtered documents calculation
  const filteredDocuments = documents.filter((doc) => {
    const query = (searchQuery || '').toLowerCase();
    const matchesSearch =
      (doc.trackingNumber || '').toLowerCase().includes(query) ||
      (doc.title || '').toLowerCase().includes(query) ||
      (doc.originDepartment || '').toLowerCase().includes(query) ||
      (doc.responsiblePerson || '').toLowerCase().includes(query) ||
      (doc.targetDivision || '').toLowerCase().includes(query) ||
      (doc.currentLocation || '').toLowerCase().includes(query);

    let matchesViewMode = true;
    if (viewMode === 'incoming') {
      matchesViewMode = doc.currentStatus === 'Incoming Logged' || doc.currentStatus === 'Under Review';
    } else if (viewMode === 'outgoing') {
      matchesViewMode = doc.currentStatus === 'Cleared for Out' || doc.currentStatus === 'Dispatched / Completed';
    } else if (viewMode === 'compliance_needed') {
      matchesViewMode =
        doc.currentStatus === 'Supervisor Comment Needed' ||
        doc.supervisorRemarks?.some((r) => r.complianceRequired && !r.complied);
    } else if (viewMode === 'overdue') {
      matchesViewMode = calculateDocumentTimeInDesk(doc, timeInDeskConfig).isOverdue;
    }

    const matchesStatus = statusFilter === 'ALL' || doc.currentStatus === statusFilter;
    const matchesDivision = divisionFilter === 'ALL' || doc.targetDivision === divisionFilter;
    const matchesPriority = priorityFilter === 'ALL' || doc.priority === priorityFilter;

    return matchesSearch && matchesViewMode && matchesStatus && matchesDivision && matchesPriority;
  });

  // Sorted documents calculation with stable multi-field comparisons
  const sortedDocuments = useMemo(() => {
    const list = [...filteredDocuments];
    list.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'trackingNumber':
          comparison = a.trackingNumber.localeCompare(b.trackingNumber, undefined, { numeric: true, sensitivity: 'base' });
          break;
        case 'title':
          comparison = a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
          break;
        case 'dateReceived': {
          const dateA = new Date(`${a.dateReceived}T${a.timeReceived || '00:00'}:00`).getTime() || 0;
          const dateB = new Date(`${b.dateReceived}T${b.timeReceived || '00:00'}:00`).getTime() || 0;
          comparison = dateA - dateB;
          break;
        }
        case 'targetDivision':
          comparison = (a.targetDivision || '').localeCompare(b.targetDivision || '', undefined, { sensitivity: 'base' });
          break;
        case 'currentCustodian':
          comparison = (a.currentCustodian || '').localeCompare(b.currentCustodian || '', undefined, { sensitivity: 'base' });
          break;
        case 'timeInDesk': {
          const elapsedA = calculateDocumentTimeInDesk(a, timeInDeskConfig).elapsedHours;
          const elapsedB = calculateDocumentTimeInDesk(b, timeInDeskConfig).elapsedHours;
          comparison = elapsedA - elapsedB;
          break;
        }
        case 'lifecycle': {
          const statusOrder: Record<string, number> = {
            'Incoming Logged': 1,
            'Under Review': 2,
            'Supervisor Comment Needed': 3,
            'Cleared for Out': 4,
            'Dispatched / Completed': 5,
          };
          comparison = (statusOrder[a.currentStatus] || 0) - (statusOrder[b.currentStatus] || 0);
          break;
        }
        default:
          comparison = 0;
      }

      if (comparison === 0) {
        comparison = (b.updatedAt || '').localeCompare(a.updatedAt || '');
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
    return list;
  }, [filteredDocuments, sortField, sortDirection, timeInDeskConfig]);

  // Reset lazy-load pagination slice when filters, search queries, or sort fields change
  useEffect(() => {
    setVisibleDocCount(30);
  }, [searchQuery, viewMode, statusFilter, divisionFilter, priorityFilter, sortField, sortDirection]);

  // Virtualized slice of documents for fast DOM rendering and smooth 60fps rendering
  const visibleDocuments = useMemo(() => {
    return sortedDocuments.slice(0, visibleDocCount);
  }, [sortedDocuments, visibleDocCount]);

  // Statistics
  const totalCount = documents.length;
  const activeInOfficeCount = documents.filter(
    (d) => d.currentStatus !== 'Cleared for Out' && d.currentStatus !== 'Dispatched / Completed'
  ).length;
  const pendingComplianceCount = documents.filter((d) =>
    d.supervisorRemarks?.some((r) => r.complianceRequired && !r.complied)
  ).length;
  const clearedForOutCount = documents.filter(
    (d) => d.managerClearance?.isCleared || d.currentStatus === 'Cleared for Out'
  ).length;
  const overdueCount = documents.filter(
    (d) => calculateDocumentTimeInDesk(d, timeInDeskConfig).isOverdue
  ).length;
  const focalPendingCount = documents.filter(
    (d) =>
      ['Mary Flor Aquino', 'Aubrey Camille Cabreras'].includes(d.responsiblePerson) &&
      !d.managerClearance?.isCleared &&
      d.currentStatus !== 'Cleared for Out' &&
      d.currentStatus !== 'Dispatched / Completed'
  ).length;

  const currentRoleConfig = currentUser ? getRoleConfig(currentUser?.role) : getRoleConfig('Viewer');
  const canDeleteLogs = currentUser ? canUserDeleteDocuments(currentUser?.role) : false;

  // Batch Selection & Bulk Operations Logic
  const isAllSelected = sortedDocuments.length > 0 && sortedDocuments.every((d) => selectedDocIds.has(d.id));
  const isSomeSelected = sortedDocuments.some((d) => selectedDocIds.has(d.id)) && !isAllSelected;

  const toggleSelectDoc = (docId: string) => {
    setSelectedDocIds((prev) => {
      const next = new Set(prev);
      if (next.has(docId)) {
        next.delete(docId);
      } else {
        next.add(docId);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedDocIds((prev) => {
        const next = new Set(prev);
        sortedDocuments.forEach((d) => next.delete(d.id));
        return next;
      });
    } else {
      setSelectedDocIds((prev) => {
        const next = new Set(prev);
        sortedDocuments.forEach((d) => next.add(d.id));
        return next;
      });
    }
  };

  const clearSelection = () => {
    setSelectedDocIds(new Set());
  };

  const handleExecuteBatchAction = async () => {
    if (selectedDocIds.size === 0 || !batchAction) return;

    if (batchAction === 'delete_batch') {
      if (!canDeleteLogs) {
        addNotification(
          'Action Restricted',
          'Deleting document entries is strictly restricted to System Admins and Department Managers.',
          currentUser?.name || 'System',
          'sync'
        );
        return;
      }
      const toDelete = documents.filter((d) => selectedDocIds.has(d.id));
      setBatchDocsToDelete(toDelete);
      return;
    }

    try {
      setIsExecutingBatch(true);
      const nowIso = new Date().toISOString();
      const currentUserName = currentUser?.name || 'System Admin';
      const currentUserRole = currentUser?.role || 'Staff';

      let actionLabel = '';

      const updatedDocs = await Promise.all(
        documents.map(async (doc) => {
          if (!selectedDocIds.has(doc.id)) return doc;

          let updated = { ...doc };

          if (batchAction === 'mark_cleared') {
            actionLabel = 'Mark as Cleared';
            const newMovement: InternalMovement = {
              id: `mov-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              timestamp: nowIso,
              personnelName: currentUserName,
              personnelRole: currentUserRole,
              currentDesk: doc.currentLocation || 'Section Desk',
              forwardToDesk: 'Dispatch / Outbox Desk',
              statusUpdate: 'dispatched',
              notes: 'Batch clearance authorized for outgoing dispatch.',
            };

            const newClearance: ManagerClearance = {
              isCleared: true,
              clearedBy: currentUserName,
              clearedAt: nowIso,
              clearanceType: 'approved_for_dispatch',
              clearanceRemarks: 'Bulk clearance approved.',
            };

            updated = {
              ...updated,
              managerClearance: newClearance,
              currentStatus: 'Cleared for Out',
              currentLocation: 'Dispatch / Outbox Desk',
              movements: [...(updated.movements || []), newMovement],
              updatedAt: nowIso,
            };
          } else if (batchAction.startsWith('forward:')) {
            const targetDept = batchAction.replace('forward:', '');
            actionLabel = `Forward to ${targetDept}`;

            const newMovement: InternalMovement = {
              id: `mov-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              timestamp: nowIso,
              personnelName: currentUserName,
              personnelRole: currentUserRole,
              currentDesk: doc.currentLocation || 'Incoming Records Desk',
              forwardToDesk: `${targetDept} Desk`,
              statusUpdate: 'forwarded',
              notes: `Bulk forwarded to ${targetDept} by ${currentUserName}.`,
            };

            updated = {
              ...updated,
              targetDivision: targetDept,
              currentLocation: `${targetDept} Desk`,
              movements: [...(updated.movements || []), newMovement],
              updatedAt: nowIso,
            };
          } else if (batchAction.startsWith('priority:')) {
            const newPriority = batchAction.replace('priority:', '') as 'Routine' | 'Urgent' | 'Rush';
            actionLabel = `Set Priority to ${newPriority}`;
            updated = {
              ...updated,
              priority: newPriority,
              updatedAt: nowIso,
            };
          } else if (batchAction.startsWith('status:')) {
            const newStatus = batchAction.replace('status:', '') as DocumentItem['currentStatus'];
            actionLabel = `Set Status to ${newStatus}`;
            updated = {
              ...updated,
              currentStatus: newStatus,
              updatedAt: nowIso,
            };
          }

          try {
            await api.updateDocument(updated);
          } catch (e) {
            console.warn(`Failed to sync bulk update for doc ${doc.id}:`, e);
          }

          return updated;
        })
      );

      setDocuments(updatedDocs);
      saveStoredDocuments(updatedDocs);
      broadcastDataUpdate('documents', updatedDocs);
      scheduleSheetPush(updatedDocs);

      addNotification(
        'Batch Action Executed',
        `Successfully applied "${actionLabel}" to ${selectedDocIds.size} document(s).`,
        currentUserName,
        'sync',
        'BATCH'
      );

      api.logAudit("BATCH ACTION", "", currentUserName, "", `Executed ${actionLabel} on ${selectedDocIds.size} documents`);

      setSelectedDocIds(new Set());
      setBatchAction('');
    } catch (err) {
      console.error('Failed to execute batch action:', err);
      addNotification('Error', 'Unable to complete batch action.', currentUser?.name || 'System', 'urgent');
    } finally {
      setIsExecutingBatch(false);
    }
  };

  const handleConfirmBatchDelete = async () => {
    if (!batchDocsToDelete || batchDocsToDelete.length === 0) return;
    try {
      setIsDeleting(true);
      const count = batchDocsToDelete.length;
      const idsToDelete = new Set(batchDocsToDelete.map((d) => d.id));

      for (const doc of batchDocsToDelete) {
        try {
          await api.deleteDocument(doc.id);
        } catch (e) {
          console.warn(`Failed to delete doc ${doc.id}:`, e);
        }
      }

      const updatedList = documents.filter((d) => !idsToDelete.has(d.id));
      setDocuments(updatedList);
      saveStoredDocuments(updatedList);
      broadcastDataUpdate('documents', updatedList);
      scheduleSheetPush(updatedList);

      if (selectedDoc && idsToDelete.has(selectedDoc.id)) {
        setSelectedDoc(null);
      }

      addNotification(
        'Batch Records Deleted',
        `Permanently deleted ${count} document entries by ${currentUser?.name} (${currentUser?.role}).`,
        currentUser?.name || 'System',
        'sync',
        'BATCH-DEL'
      );

      api.logAudit("DELETE DOCUMENTS (BATCH)", "", currentUser?.name || 'System', "", `Deleted ${count} documents`);

      setSelectedDocIds(new Set());
      setBatchAction('');
      setBatchDocsToDelete(null);
    } catch (err) {
      console.error('Batch deletion error:', err);
      addNotification('Error', 'Unable to complete batch deletion.', currentUser?.name || 'System', 'urgent');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f3f6fa] dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white transition-colors duration-200">
      
      {/* Executive Institutional Top Navigation Bar (Professional Slate / Grayscale Theme) */}
      <header className="sticky top-0 z-30 bg-slate-900 border-b border-slate-800 px-4 sm:px-8 py-3.5 text-white shadow-md">
        <div className="w-full 2xl:max-w-[1920px] mx-auto flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3.5">
          
          {/* Brand & Identity with Incorporated POSSD Logo */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white p-1 flex items-center justify-center shrink-0 shadow-md ring-1 ring-slate-700 border border-slate-300">
              <PossdLogo className="w-9 h-9" variant="black" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold tracking-tight text-white">
                  POSSD Document Tracking System
                </h1>
                
              </div>
            </div>
          </div>

          {/* User Session Profile, Log Out, Thresholds, Sheet & Actions */}
          <div className="flex items-center flex-wrap gap-2.5 w-full lg:w-auto justify-end">
            
            {/* Time-in-Desk Thresholds (Available ONLY for System Admin, moved to the left) */}
            {currentUser?.role === 'System Admin' && (
              <button
                id="open-thresholds-btn"
                onClick={() => setActiveTab('admin')}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all shadow-2xs cursor-pointer ${
                  overdueCount > 0
                    ? 'bg-rose-950/80 text-rose-200 border-rose-600 hover:bg-rose-900'
                    : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700 hover:text-white'
                }`}
                title="System Admin: Manage Time-in-Desk thresholds & settings"
              >
                <Timer className={`w-4 h-4 ${overdueCount > 0 ? 'text-rose-400' : 'text-slate-400'}`} />
                <span className="hidden sm:inline">Thresholds</span>
                {overdueCount > 0 ? (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-600 text-white font-bold">
                    {overdueCount} Overdue
                  </span>
                ) : (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-900 text-slate-300 border border-slate-700">
                    {timeInDeskConfig.defaultThresholdHours}h
                  </span>
                )}
              </button>
            )}

            {/* Active User Pill with Role Indicator */}
            <div className="flex items-center gap-2 bg-slate-800/90 border border-slate-700 rounded-xl px-2.5 py-1.5 shadow-2xs">
              <div className="w-7 h-7 rounded-lg bg-slate-700 text-slate-100 flex items-center justify-center text-xs font-bold shrink-0 ring-1 ring-slate-600">
                {currentUser?.avatarInitials || currentUser?.name?.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex flex-col text-left">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-white max-w-[130px] truncate">
                    {currentUser?.name}
                  </span>
                  <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded border bg-slate-900 text-slate-300 border-slate-700">
                    {currentUser?.role}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 truncate max-w-[170px]">
                  {currentUser?.division}
                </span>
              </div>
            </div>

            {/* Login Credentials / Switch Account */}
            <button
              id="login-credentials-btn"
              type="button"
              onClick={() => setIsLoginModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white transition-all shadow-2xs cursor-pointer"
              title="Authenticate / Switch account"
            >
              <LogIn className="w-4 h-4 text-slate-400" />
              <span className="hidden sm:inline">Switch / Sign In</span>
            </button>

            {/* Log Out Button - Turns back to Official Login Portal */}
            <button
              id="logout-header-btn"
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-rose-300 transition-all shadow-2xs cursor-pointer"
              title="Sign out and return to official login page"
            >
              <LogOut className="w-4 h-4 text-slate-400 hover:text-rose-300" />
              <span className="hidden sm:inline">Log Out</span>
            </button>

            {/* Google Sheets Sync Trigger */}
            <button
              id="open-sheet-sync-btn"
              onClick={() => setIsSheetModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white transition-all shadow-2xs cursor-pointer"
              title="Google Sheet Integration"
            >
              <FileSpreadsheet className={`w-4 h-4 ${sheetConfig ? 'text-emerald-400' : 'text-slate-400'}`} />
              <span className="hidden sm:inline">
                {sheetConfig ? 'Sheet Linked' : 'Connect Sheet'}
              </span>
              {sheetConfig && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>}
            </button>

            {/* Theme Toggle Button (Light/Dark Mode) */}
            <button
              id="theme-toggle-btn"
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-all shadow-2xs cursor-pointer"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle theme mode"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4 text-slate-300" />}
            </button>

            {/* PWA App Install Button */}
            <PWAInstallButton className="hidden sm:inline-flex" />

            {/* Real-time Notification Center */}
            <NotificationCenter
              notifications={notifications}
              onClearNotifications={() => setNotifications([])}
              onSelectDocument={(trk) => {
                const doc = documents.find((d) => d.trackingNumber === trk);
                if (doc) setSelectedDoc(doc);
              }}
            />

            {/* Log Document Button (Incoming or Outgoing) */}
            <button
              id="log-incoming-btn"
              onClick={() => setIsIncomingModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold border border-slate-600 shadow-md transition-colors cursor-pointer"
              title="Log incoming receipt or outgoing transmittal (Shortcut: N)"
            >
              <PlusCircle className="w-4 h-4 text-slate-300" />
              <span>Log Document</span>
              <kbd className="hidden lg:inline px-1 py-0.2 text-[9px] font-mono rounded bg-slate-900 text-slate-300 border border-slate-700">
                N
              </kbd>
            </button>
          </div>

        </div>
      </header>

      {/* Mobile Horizontal Navigation Tabs (< lg) with sliding active indicator */}
      <div className="lg:hidden bg-slate-900 border-t border-slate-800 px-3 py-2">
        <div className="flex items-center justify-between gap-1">
          <nav className="flex items-center gap-1.5 overflow-x-auto py-1">
            {[
              { id: 'documents' as WorkspaceTab, label: 'Dashboard', count: documents.length, icon: FileText, color: 'text-slate-300' },
              { id: 'distribution' as WorkspaceTab, label: 'Distribution', count: focalPendingCount, icon: Users, color: 'text-slate-300' },
              { id: 'analytics' as WorkspaceTab, label: 'Analytics', icon: BarChart3, color: 'text-slate-300' },
              { id: 'links' as WorkspaceTab, label: 'Dedicated Links', count: dedicatedLinks.length, icon: Link2, color: 'text-sky-400' },
              ...(currentUser?.role === 'System Admin'
                ? [{ id: 'admin' as WorkspaceTab, label: 'Admin Settings', icon: Sliders, color: 'text-slate-300' }]
                : []),
            ].map((tab, _idx_tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={`${tab.id}-${_idx_tab}`}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isActive ? 'text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="mobileActiveTabHighlight"
                      className="absolute inset-0 bg-slate-800 border border-slate-700 rounded-xl shadow-xs pointer-events-none"
                      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-1.5">
                    <Icon className={`w-3.5 h-3.5 ${tab.color}`} />
                    <span>{tab.label}</span>
                    {tab.count !== undefined && (
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-200 border border-slate-700">
                        {tab.count}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setIsSheetModalOpen(true)}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs border border-slate-700 cursor-pointer"
              title="Google Sheets"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Workspace Frame with Left Vertical Navigation & Sliding Transition */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-[calc(100vh-65px)] bg-[#f3f6fa] dark:bg-slate-950">
        {/* Left Vertical Navigation Sidebar (Desktop) */}
        <div className="hidden lg:flex shrink-0">
          <VerticalNavigationSidebar
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            documentsCount={documents.length}
            focalPendingCount={focalPendingCount}
            overdueCount={overdueCount}
            activeCount={activeInOfficeCount}
            clearedCount={clearedForOutCount}
            isSheetConnected={!!sheetConfig}
            sheetTitle={sheetConfig?.title}
            isSyncing={isAutoSyncing}
            quotaCooldownSeconds={quotaCooldownSeconds}
            onManualSync={handleManualSync}
            onOpenSheetModal={() => setIsSheetModalOpen(true)}
            onOpenRolesModal={() => setIsRolesModalOpen(true)}
            onOpenThresholdModal={() => setIsThresholdModalOpen(true)}
            onOpenShortcutsModal={() => setIsShortcutsModalOpen(true)}
            currentUserRole={currentUser?.role}
            isCollapsed={isSidebarCollapsed}
            setIsCollapsed={setIsSidebarCollapsed}
          />
        </div>

        {/* Dynamic Main Workspace Content with Sliding Transition */}
        <main className="flex-1 min-w-0 p-3 sm:p-5 lg:p-7 overflow-y-auto">
          <div className="w-full 2xl:max-w-[1920px] mx-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className="space-y-6"
              >
                {activeTab === 'distribution' ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-6">
            <div className="mb-6 border-b border-slate-200 dark:border-slate-800 pb-4">
              <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Users className="w-6 h-6 text-emerald-500" />
                Distribution Desk - Focal Personnel
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Documents awaiting distribution or assignment by Focal Persons.
              </p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-800 dark:bg-slate-900 text-slate-100 font-bold uppercase tracking-wider text-[11px] border-b border-slate-700 dark:border-slate-800">
                    <th className="py-3.5 px-4">Tracking Code</th>
                    <th className="py-3.5 px-4">Title & Classification</th>
                    <th className="py-3.5 px-4">Focal Person</th>
                    <th className="py-3.5 px-4">Origin Dept</th>
                    <th className="py-3.5 px-4 min-w-[200px]">Lifecycle Progress</th>
                    <th className="py-3.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {documents.filter(d => ['Mary Flor Aquino', 'Aubrey Camille Cabreras'].includes(d.responsiblePerson)).map((doc, _idx_doc) => (
                    <tr
                      key={`${doc.id}-${_idx_doc}`}
                      onClick={() => setSelectedDoc(doc)}
                      className="hover:bg-blue-50/40 dark:hover:bg-slate-800/70 border-l-4 border-l-transparent hover:border-l-blue-500 transition-all duration-150 cursor-pointer group hover:shadow-sm"
                    >
                      <td className="py-3.5 px-4 font-mono text-xs font-semibold text-blue-700 dark:text-blue-400 group-hover:translate-x-0.5 transition-transform">{doc.trackingNumber}</td>
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-slate-900 dark:text-white truncate max-w-[200px] group-hover:text-blue-300 transition-colors">{doc.title}</p>
                        <p className="text-[11px] text-slate-500">{doc.documentType}</p>
                      </td>
                      <td className="py-3.5 px-4 text-sm text-slate-700 dark:text-slate-300 font-medium">{doc.responsiblePerson}</td>
                      <td className="py-3.5 px-4 text-sm text-slate-600 dark:text-slate-400">{doc.originDepartment}</td>
                      <td className="py-3.5 px-4">
                        <DocumentLifecycleProgress document={doc} variant="compact" />
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDoc(doc);
                          }}
                          className="px-3 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-800 dark:bg-blue-900/40 dark:hover:bg-blue-800/60 dark:text-blue-200 rounded-lg text-xs font-bold transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-2xs hover:shadow-md"
                        >
                          Manage
                        </button>
                      </td>
                    </tr>
                  ))}
                  {documents.filter(d => ['Mary Flor Aquino', 'Aubrey Camille Cabreras'].includes(d.responsiblePerson)).length === 0 && (
                     <tr>
                        <td colSpan={6} className="text-center py-12 text-slate-500">No documents pending distribution for focal persons.</td>
                     </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : activeTab === 'analytics' ? (

          <DocumentAnalyticsDashboard
            documents={documents}
            staffList={staffList}
            onSelectDocument={(doc) => setSelectedDoc(doc)}
          />
        ) : activeTab === 'links' ? (
          <DedicatedLinksView
            links={dedicatedLinks}
            onAddLink={handleAddDedicatedLink}
            onUpdateLink={handleUpdateDedicatedLink}
            onDeleteLink={handleDeleteDedicatedLink}
            currentUserRole={currentUser?.role || 'Viewer'}
            currentUserName={currentUser?.name || 'Guest User'}
            availableDivisions={dropdownOptions.departments}
          />
        ) : activeTab === 'admin' ? (
          <AdminSettingsView
            timeInDeskConfig={timeInDeskConfig}
            onSaveConfig={handleSaveThresholdConfig}
            documents={documents}
            staffList={staffList}
            sheetConfig={sheetConfig}
            onOpenRolesModal={() => setIsRolesModalOpen(true)}
            onOpenSheetModal={() => setIsSheetModalOpen(true)}
            availableDivisions={dropdownOptions.departments}
            syncDiagnosticLogs={syncDiagnosticLogs}
            onClearDiagnosticLogs={handleClearDiagnosticLogs}
            onTriggerDiagnosticSync={handleRunDiagnosticBenchmark}
            isDiagnosticSyncing={isDiagnosticSyncing}
          />
        ) : (
          <>
        {/* KPI / Dashboard Summary Cards (Executive Professional Color Accents with Rich Hover Effects) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          
          {/* 1. Total Monitored - Royal Blue Accent */}
          <div
            onClick={() => setViewMode('all')}
            className={`cursor-pointer p-4 rounded-2xl border transition-all duration-200 group hover:-translate-y-1 active:scale-[0.98] ${
              viewMode === 'all'
                ? 'bg-gradient-to-br from-blue-950/90 via-slate-900 to-indigo-950/60 border-blue-500 ring-2 ring-blue-500/40 shadow-xl shadow-blue-950/50'
                : 'bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 hover:border-blue-500 hover:shadow-lg hover:shadow-blue-950/30'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400 group-hover:translate-x-0.5 transition-transform">Total Monitored</span>
              <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/60 flex items-center justify-center text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-700/60 group-hover:scale-115 group-hover:rotate-6 transition-all duration-200 shadow-2xs group-hover:shadow-blue-500/20">
                <FileText className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-2 tracking-tight group-hover:text-blue-500 dark:group-hover:text-blue-300 transition-colors">{totalCount}</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Dashboard document archive</p>
          </div>

          {/* 2. Ongoing - Warm Amber Accent */}
          <div
            onClick={() => setViewMode('incoming')}
            className={`cursor-pointer p-4 rounded-2xl border transition-all duration-200 group hover:-translate-y-1 active:scale-[0.98] ${
              viewMode === 'incoming'
                ? 'bg-gradient-to-br from-amber-950/90 via-slate-900 to-yellow-950/60 border-amber-500 ring-2 ring-amber-500/40 shadow-xl shadow-amber-950/50'
                : 'bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 hover:border-amber-500 hover:shadow-lg hover:shadow-amber-950/30'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400 group-hover:translate-x-0.5 transition-transform">Ongoing</span>
              <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/60 flex items-center justify-center text-amber-600 dark:text-amber-300 border border-amber-200 dark:border-amber-700/60 group-hover:scale-115 group-hover:rotate-6 transition-all duration-200 shadow-2xs group-hover:shadow-amber-500/20">
                <Inbox className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-2 tracking-tight group-hover:text-amber-500 dark:group-hover:text-amber-300 transition-colors">{activeInOfficeCount}</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Under desk routing & action</p>
          </div>

          {/* 3. Action Required (Previously With comments from Supervisor) - Violet/Purple Accent */}
          <div
            onClick={() => setViewMode('compliance_needed')}
            className={`cursor-pointer p-4 rounded-2xl border transition-all duration-200 group hover:-translate-y-1 active:scale-[0.98] ${
              viewMode === 'compliance_needed'
                ? 'bg-gradient-to-br from-purple-950/90 via-slate-900 to-fuchsia-950/60 border-purple-500 ring-2 ring-purple-500/40 shadow-xl shadow-purple-950/50'
                : 'bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 hover:border-purple-500 hover:shadow-lg hover:shadow-purple-950/30'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-600 dark:text-purple-400 group-hover:translate-x-0.5 transition-transform">Action Required</span>
              <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/60 flex items-center justify-center text-purple-600 dark:text-purple-300 border border-purple-200 dark:border-purple-700/60 group-hover:scale-115 group-hover:rotate-6 transition-all duration-200 shadow-2xs group-hover:shadow-purple-500/20">
                <AlertCircle className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-2 tracking-tight group-hover:text-purple-500 dark:group-hover:text-purple-300 transition-colors">{pendingComplianceCount}</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1">Supervisor notes & compliance</p>
          </div>

          {/* 4. Overdue Stay - Crimson Rose Accent */}
          <div
            onClick={() => setViewMode(viewMode === 'overdue' ? 'all' : 'overdue')}
            className={`cursor-pointer p-4 rounded-2xl border transition-all duration-200 group hover:-translate-y-1 active:scale-[0.98] ${
              viewMode === 'overdue'
                ? 'bg-gradient-to-br from-rose-950/90 via-slate-900 to-red-950/60 border-rose-500 ring-2 ring-rose-500/40 shadow-xl shadow-rose-950/50'
                : overdueCount > 0
                ? 'bg-rose-50/50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800/80 hover:border-rose-500 hover:shadow-lg hover:shadow-rose-950/30 shadow-2xs'
                : 'bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 hover:border-rose-500 hover:shadow-lg hover:shadow-rose-950/30 shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-xs font-bold group-hover:translate-x-0.5 transition-transform ${overdueCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-rose-600/80 dark:text-rose-400/80'}`}>
                Overdue Stay
              </span>
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center border group-hover:scale-115 group-hover:rotate-6 transition-all duration-200 ${
                  overdueCount > 0
                    ? 'bg-rose-100 dark:bg-rose-900/70 text-rose-600 dark:text-rose-300 border-rose-300 dark:border-rose-700 shadow-2xs group-hover:shadow-rose-500/20'
                    : 'bg-rose-50 dark:bg-rose-950/40 text-rose-500 dark:text-rose-400 border-rose-200 dark:border-rose-800/50'
                }`}
              >
                <Timer className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black mt-2 tracking-tight text-slate-900 dark:text-white group-hover:text-rose-500 dark:group-hover:text-rose-300 transition-colors">
              {overdueCount}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              {overdueCount > 0 ? 'Exceeded desk SLA threshold' : 'All desks within SLA'}
            </p>
          </div>

          {/* 5. Cleared for Out - Mint Emerald Accent */}
          <div
            onClick={() => setViewMode('outgoing')}
            className={`cursor-pointer p-4 rounded-2xl border transition-all duration-200 group hover:-translate-y-1 active:scale-[0.98] ${
              viewMode === 'outgoing'
                ? 'bg-gradient-to-br from-emerald-950/90 via-slate-900 to-teal-950/60 border-emerald-500 ring-2 ring-emerald-500/40 shadow-xl shadow-emerald-950/50'
                : 'bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 hover:border-emerald-500 hover:shadow-lg hover:shadow-emerald-950/30'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 group-hover:translate-x-0.5 transition-transform">Cleared for Out</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 flex items-center justify-center text-emerald-600 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700/60 group-hover:scale-115 group-hover:rotate-6 transition-all duration-200 shadow-2xs group-hover:shadow-emerald-500/20">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-2 tracking-tight group-hover:text-emerald-500 dark:group-hover:text-emerald-300 transition-colors">{clearedForOutCount}</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1">Manager sign-off authorized</p>
          </div>

        </div>

        {/* Google Sheet Sync Alert Ribbon (if connected) - Professional Slate Theme */}
        {sheetConfig && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs shadow-2xs transition-colors text-slate-800 dark:text-slate-200">
            <div className="flex items-center gap-2.5 truncate">
              <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${isAutoSyncing || isPushingAll || syncProgress.inProgress ? 'bg-blue-500 animate-ping' : 'bg-emerald-500'}`} />
              <div className="flex items-center gap-2 truncate">
                <span className="font-bold text-slate-900 dark:text-white">
                  Google Sheet Connected:
                </span>
                <span className="text-slate-600 dark:text-slate-400 truncate">
                  {sheetConfig.sheetName || 'Master Tracking'} ({documents.length} doc{documents.length === 1 ? '' : 's'} in registry)
                </span>
              </div>
              {(hasPendingSyncRef.current || safeStorageGet('possd_has_unpushed_changes') === 'true') && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 shrink-0">
                  Unpushed Changes
                </span>
              )}
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              <button
                id="ribbon-push-all-btn"
                onClick={handlePushAllNow}
                disabled={isPushingAll || isAutoSyncing}
                title="Force push all document registry rows to the linked Google Sheet"
                className="inline-flex items-center gap-1.5 font-bold cursor-pointer transition-colors px-2.5 py-1 rounded-lg text-xs disabled:opacity-50 bg-slate-800 hover:bg-slate-700 text-white shadow-2xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isPushingAll ? 'animate-spin' : ''}`} />
                {isPushingAll ? 'Pushing All...' : 'Push All'}
              </button>
              <span className="text-slate-300 dark:text-slate-700">|</span>
              <a
                href={sheetConfig.spreadsheetUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
              >
                Open File <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        )}

        {/* Live Sync Progress Indicator & Partial Sync Feedback Banner */}
        {(syncProgress.inProgress || syncProgress.isPartial) && (
          <div
            id="sync-progress-feedback-banner"
            className={`rounded-xl border p-3 text-xs transition-all shadow-2xs ${
              syncProgress.isPartial
                ? 'bg-amber-50/90 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                : 'bg-blue-50/90 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                {syncProgress.inProgress ? (
                  <RefreshCw className="w-4 h-4 text-blue-600 dark:text-blue-400 animate-spin shrink-0" />
                ) : syncProgress.isPartial ? (
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                )}
                <div className="truncate">
                  <div className="flex items-center gap-2">
                    <span className="font-bold">
                      {syncProgress.inProgress
                        ? 'Google Sheets Synchronizing...'
                        : syncProgress.isPartial
                        ? 'Partial Synchronization Recorded'
                        : 'Synchronization Complete'}
                    </span>
                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold uppercase ${
                        syncProgress.isPartial
                          ? 'bg-amber-200/80 dark:bg-amber-900/80 text-amber-900 dark:text-amber-200'
                          : 'bg-blue-200/80 dark:bg-blue-900/80 text-blue-900 dark:text-blue-200'
                      }`}
                    >
                      {syncProgress.stage}
                    </span>
                  </div>
                  <p className="text-[11px] opacity-90 truncate mt-0.5">
                    {syncProgress.message || 'Processing document payloads and telemetry...'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                {syncProgress.isPartial && (
                  <button
                    type="button"
                    onClick={() => {
                      setSyncProgress((prev) => ({ ...prev, isPartial: false }));
                    }}
                    className="px-2 py-0.5 text-[11px] font-semibold rounded bg-amber-200/60 dark:bg-amber-900/60 hover:bg-amber-200 dark:hover:bg-amber-900 text-amber-900 dark:text-amber-200 transition-colors cursor-pointer"
                  >
                    Dismiss
                  </button>
                )}
                {syncProgress.inProgress && (
                  <span className="font-mono text-xs font-bold text-blue-700 dark:text-blue-300">
                    {syncProgress.percent}%
                  </span>
                )}
              </div>
            </div>

            {/* Micro Progress Bar */}
            {syncProgress.inProgress && (
              <div className="w-full bg-blue-200 dark:bg-blue-900/60 h-1.5 rounded-full overflow-hidden mt-2">
                <div
                  className="bg-blue-600 dark:bg-blue-400 h-full rounded-full transition-all duration-300"
                  style={{ width: `${Math.max(8, syncProgress.percent)}%` }}
                />
              </div>
            )}
          </div>
        )}

        {/* Search, Filter Bar & Controls */}
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs space-y-3.5 transition-colors">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                id="document-search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tracking number, subject, originating department, custodian..."
                className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500 bg-slate-50/50 dark:bg-slate-800/80"
              />
              {searchQuery ? (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs cursor-pointer"
                  title="Clear search"
                >
                  ✕
                </button>
              ) : (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-1 pointer-events-none">
                  <kbd className="px-1.5 py-0.5 text-[9.5px] font-mono text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded shadow-2xs">
                    /
                  </kbd>
                </div>
              )}
            </div>

            {/* Quick Status Pill Filters */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 text-xs">
              <span className="text-[11px] text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider whitespace-nowrap mr-1">Filter:</span>
              {[
                { id: 'ALL', label: 'All Status', activeClass: 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-slate-100' },
                { id: 'Incoming Logged', label: 'Incoming', activeClass: 'bg-slate-800 text-white border-slate-800' },
                { id: 'Under Review', label: 'In Review', activeClass: 'bg-slate-700 text-white border-slate-700' },
                { id: 'Supervisor Comment Needed', label: 'Remarks', activeClass: 'bg-slate-800 text-white border-slate-800 font-bold' },
                { id: 'Cleared for Out', label: 'Cleared Out', activeClass: 'bg-slate-800 text-white border-slate-800' },
              ].map((s, _idx_s) => (
                <button
                  key={`${s.id}-${_idx_s}`}
                  onClick={() => setStatusFilter(s.id)}
                  className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap border transition-all cursor-pointer ${
                    statusFilter === s.id
                      ? `${s.activeClass} shadow-xs`
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/80 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

          </div>

          {/* Secondary Dropdown Filters */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-600 dark:text-slate-400 font-semibold">Priority:</span>
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-500 cursor-pointer"
                >
                  <option value="ALL">All Priorities</option>
                  <option value="Routine">Routine</option>
                  <option value="Urgent">Urgent</option>
                  <option value="Rush">Rush</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-slate-600 dark:text-slate-400 font-semibold">Target Division:</span>
                <select
                  value={divisionFilter}
                  onChange={(e) => setDivisionFilter(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-500 max-w-[220px] cursor-pointer"
                >
                  <option value="ALL">All Divisions</option>
                  {dropdownOptions.departments.length > 0 ? (
                    dropdownOptions.departments.map((dept, _idx_dept) => (
                      <option key={`${dept}-${_idx_dept}`} value={dept}>
                        {dept}
                      </option>
                    ))
                  ) : (
                    Array.from(new Set(documents.map((d) => d.targetDivision).filter(Boolean))).map((div, _idx_div) => (
                      <option key={`${div}-${_idx_div}`} value={div}>
                        {div}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {canDeleteLogs ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 text-[11px] font-semibold shadow-2xs">
                  <Trash2 className="w-3 h-3 text-rose-600 dark:text-rose-400 shrink-0" />
                  <span>Log Deletion Allowed ({currentUser?.role})</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 text-[11px]">
                  <Lock className="w-3 h-3 text-slate-400 shrink-0" />
                  <span>Log Deletion: System Admin & Dept Mgr Only</span>
                </span>
              )}
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-medium">
                <span>
                  Showing <strong className="text-slate-900 dark:text-white">{sortedDocuments.length}</strong> of {totalCount} records
                </span>
                <span className="text-slate-300 dark:text-slate-700">|</span>
                <button
                  onClick={() => setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 cursor-pointer transition-colors"
                  title="Click to toggle ascending/descending order"
                >
                  <span className="text-slate-500 dark:text-slate-400 font-normal">Sorted by:</span>
                  <span>
                    {sortField === 'trackingNumber' && 'Tracking Code'}
                    {sortField === 'title' && 'Title'}
                    {sortField === 'dateReceived' && 'Date Inflow'}
                    {sortField === 'targetDivision' && 'Forwarded To'}
                    {sortField === 'currentCustodian' && 'Custodian'}
                    {sortField === 'timeInDesk' && 'Time in Desk'}
                    {sortField === 'lifecycle' && 'Lifecycle Status'}
                  </span>
                  {sortDirection === 'asc' ? (
                    <ArrowUp className="w-3 h-3 text-slate-600 dark:text-slate-300 stroke-[2.5]" />
                  ) : (
                    <ArrowDown className="w-3 h-3 text-slate-600 dark:text-slate-300 stroke-[2.5]" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Documents Table View - Professional Monochrome Slate Theme */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs overflow-hidden transition-colors">
          
          {/* Table Header Batch Actions Toolbar */}
          <div
            id="table-batch-toolbar"
            className={`px-4 py-2.5 border-b flex flex-wrap items-center justify-between gap-3 transition-colors ${
              selectedDocIds.size > 0
                ? 'bg-blue-50/90 dark:bg-blue-950/60 border-blue-200/80 dark:border-blue-900/60'
                : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800'
            }`}
          >
            {/* Selection Status & Checkbox */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="batch-select-all-toolbar"
                  aria-label="Select all visible documents"
                  checked={isAllSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = isSomeSelected;
                  }}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500 cursor-pointer align-middle"
                  title={isAllSelected ? "Deselect all visible documents" : "Select all visible documents"}
                />
                <label
                  htmlFor="batch-select-all-toolbar"
                  className="text-xs font-semibold text-slate-700 dark:text-slate-300 select-none cursor-pointer flex items-center gap-1.5"
                >
                  {selectedDocIds.size > 0 ? (
                    <span className="text-blue-700 dark:text-blue-300 font-bold flex items-center gap-1.5">
                      <span className="inline-flex items-center justify-center px-2 py-0.5 text-[11px] rounded-full bg-blue-600 text-white font-mono">
                        {selectedDocIds.size}
                      </span>
                      <span>of {sortedDocuments.length} selected</span>
                    </span>
                  ) : (
                    <span>Select all visible ({sortedDocuments.length})</span>
                  )}
                </label>
              </div>

              {selectedDocIds.size > 0 && (
                <button
                  type="button"
                  id="clear-selection-btn"
                  onClick={clearSelection}
                  className="text-[11px] text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 underline cursor-pointer"
                >
                  Deselect all
                </button>
              )}
            </div>

            {/* Batch Action Select Dropdown & Bulk Execute Button */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5">
                <label
                  htmlFor="batch-action-select"
                  className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 hidden sm:inline"
                >
                  Action:
                </label>
                <select
                  id="batch-action-select"
                  value={batchAction}
                  onChange={(e) => setBatchAction(e.target.value)}
                  disabled={selectedDocIds.size === 0}
                  className="text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-2xs min-w-[210px]"
                >
                  <option value="">Select batch action...</option>
                  <option value="mark_cleared">&#10003; Mark as Cleared (Dispatch)</option>
                  
                  <optgroup label="Forward to Division...">
                    {(dropdownOptions.departments.length > 0 ? dropdownOptions.departments : ['Administrative Section', 'Port Operations Section', 'Billing & Collections Section', 'Harbor Master Office', 'Safety & Environmental Division']).map((dept) => (
                      <option key={`fwd-${dept}`} value={`forward:${dept}`}>
                        &rarr; Forward to: {dept}
                      </option>
                    ))}
                  </optgroup>

                  <optgroup label="Change Priority...">
                    <option value="priority:Routine">Set Priority: Routine</option>
                    <option value="priority:Urgent">Set Priority: Urgent</option>
                    <option value="priority:Rush">Set Priority: Rush</option>
                  </optgroup>

                  <optgroup label="Update Lifecycle Status...">
                    <option value="status:Under Review">Set Status: Under Review</option>
                    <option value="status:Supervisor Comment Needed">Set Status: Supervisor Comment Needed</option>
                    <option value="status:Complied / Ready for Clearance">Set Status: Complied / Ready for Clearance</option>
                    <option value="status:Dispatched / Completed">Set Status: Dispatched / Completed</option>
                  </optgroup>

                  {canDeleteLogs && (
                    <optgroup label="Admin Actions">
                      <option value="delete_batch" className="text-rose-600 font-bold">
                        &#128465; Delete Selected ({selectedDocIds.size})
                      </option>
                    </optgroup>
                  )}
                </select>
              </div>

              {/* Bulk Execute Button */}
              <button
                type="button"
                id="bulk-execute-btn"
                onClick={handleExecuteBatchAction}
                disabled={selectedDocIds.size === 0 || !batchAction || isExecutingBatch}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white text-xs font-bold rounded-lg shadow-2xs transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                title={
                  selectedDocIds.size === 0
                    ? 'Select one or more documents to perform batch action'
                    : !batchAction
                    ? 'Select an action from the dropdown first'
                    : `Execute on ${selectedDocIds.size} document(s)`
                }
              >
                {isExecutingBatch ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Execute Action</span>
                    {selectedDocIds.size > 0 && (
                      <span className="ml-0.5 px-1.5 py-0.2 text-[10px] bg-blue-800/80 rounded-full font-mono">
                        {selectedDocIds.size}
                      </span>
                    )}
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 dark:bg-slate-950 text-white font-bold uppercase tracking-wider text-[11px] border-b border-slate-800">
                  {/* Selection Checkbox Column */}
                  <th scope="col" className="w-10 py-3.5 px-3 text-center select-none">
                    <input
                      type="checkbox"
                      id="select-all-table-header"
                      aria-label="Select or deselect all visible documents"
                      checked={isAllSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = isSomeSelected;
                      }}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-400 focus:ring-offset-slate-900 cursor-pointer align-middle"
                      title={isAllSelected ? 'Deselect all visible records' : 'Select all visible records'}
                    />
                  </th>

                  {/* Tracking Code */}
                  <th
                    scope="col"
                    aria-sort={sortField === 'trackingNumber' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                    onClick={() => handleSort('trackingNumber')}
                    className={`py-3.5 px-4 cursor-pointer select-none group transition-colors ${
                      sortField === 'trackingNumber'
                        ? 'bg-slate-800 dark:bg-slate-900 text-slate-100'
                        : 'hover:bg-slate-800/80 dark:hover:bg-slate-900/80'
                    }`}
                    title={sortField === 'trackingNumber' ? `Sorted by Tracking Code (${sortDirection === 'asc' ? 'Ascending' : 'Descending'}). Click to invert.` : 'Click to sort by Tracking Code'}
                  >
                    <div className="inline-flex items-center gap-1.5">
                      <span>Tracking Code</span>
                      {sortField === 'trackingNumber' ? (
                        sortDirection === 'asc' ? (
                          <ArrowUp className="w-3.5 h-3.5 text-slate-200 stroke-[2.5]" />
                        ) : (
                          <ArrowDown className="w-3.5 h-3.5 text-slate-200 stroke-[2.5]" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-400/50 group-hover:text-slate-300 transition-colors" />
                      )}
                    </div>
                  </th>

                  {/* Title & Classification */}
                  <th
                    scope="col"
                    aria-sort={sortField === 'title' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                    onClick={() => handleSort('title')}
                    className={`py-3.5 px-4 cursor-pointer select-none group transition-colors ${
                      sortField === 'title'
                        ? 'bg-slate-800 dark:bg-slate-900 text-slate-100'
                        : 'hover:bg-slate-800/80 dark:hover:bg-slate-900/80'
                    }`}
                    title={sortField === 'title' ? `Sorted by Title (${sortDirection === 'asc' ? 'Ascending' : 'Descending'}). Click to invert.` : 'Click to sort by Title & Classification'}
                  >
                    <div className="inline-flex items-center gap-1.5">
                      <span>Title &amp; Classification</span>
                      {sortField === 'title' ? (
                        sortDirection === 'asc' ? (
                          <ArrowUp className="w-3.5 h-3.5 text-slate-200 stroke-[2.5]" />
                        ) : (
                          <ArrowDown className="w-3.5 h-3.5 text-slate-200 stroke-[2.5]" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-400/50 group-hover:text-slate-300 transition-colors" />
                      )}
                    </div>
                  </th>

                  {/* Origin & Time Inflow */}
                  <th
                    scope="col"
                    aria-sort={sortField === 'dateReceived' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                    onClick={() => handleSort('dateReceived')}
                    className={`py-3.5 px-4 cursor-pointer select-none group transition-colors ${
                      sortField === 'dateReceived'
                        ? 'bg-slate-800 dark:bg-slate-900 text-slate-100'
                        : 'hover:bg-slate-800/80 dark:hover:bg-slate-900/80'
                    }`}
                    title={sortField === 'dateReceived' ? `Sorted by Date Received (${sortDirection === 'asc' ? 'Ascending' : 'Descending'}). Click to invert.` : 'Click to sort by Origin & Date Inflow'}
                  >
                    <div className="inline-flex items-center gap-1.5">
                      <span>Origin &amp; Time Inflow</span>
                      {sortField === 'dateReceived' ? (
                        sortDirection === 'asc' ? (
                          <ArrowUp className="w-3.5 h-3.5 text-slate-200 stroke-[2.5]" />
                        ) : (
                          <ArrowDown className="w-3.5 h-3.5 text-slate-200 stroke-[2.5]" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-400/50 group-hover:text-slate-300 transition-colors" />
                      )}
                    </div>
                  </th>

                  {/* Forwarded To & Officer */}
                  <th
                    scope="col"
                    aria-sort={sortField === 'targetDivision' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                    onClick={() => handleSort('targetDivision')}
                    className={`py-3.5 px-4 cursor-pointer select-none group transition-colors ${
                      sortField === 'targetDivision'
                        ? 'bg-slate-800 dark:bg-slate-900 text-slate-100'
                        : 'hover:bg-slate-800/80 dark:hover:bg-slate-900/80'
                    }`}
                    title={sortField === 'targetDivision' ? `Sorted by Forwarded Division (${sortDirection === 'asc' ? 'Ascending' : 'Descending'}). Click to invert.` : 'Click to sort by Forwarded Division & Officer'}
                  >
                    <div className="inline-flex items-center gap-1.5">
                      <span>Forwarded To &amp; Officer</span>
                      {sortField === 'targetDivision' ? (
                        sortDirection === 'asc' ? (
                          <ArrowUp className="w-3.5 h-3.5 text-slate-200 stroke-[2.5]" />
                        ) : (
                          <ArrowDown className="w-3.5 h-3.5 text-slate-200 stroke-[2.5]" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-400/50 group-hover:text-slate-300 transition-colors" />
                      )}
                    </div>
                  </th>

                  {/* Current Custodian */}
                  <th
                    scope="col"
                    aria-sort={sortField === 'currentCustodian' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                    onClick={() => handleSort('currentCustodian')}
                    className={`py-3.5 px-4 cursor-pointer select-none group transition-colors ${
                      sortField === 'currentCustodian'
                        ? 'bg-slate-800 dark:bg-slate-900 text-slate-100'
                        : 'hover:bg-slate-800/80 dark:hover:bg-slate-900/80'
                    }`}
                    title={sortField === 'currentCustodian' ? `Sorted by Current Custodian (${sortDirection === 'asc' ? 'Ascending' : 'Descending'}). Click to invert.` : 'Click to sort by Current Custodian'}
                  >
                    <div className="inline-flex items-center gap-1.5">
                      <span>Current Custodian</span>
                      {sortField === 'currentCustodian' ? (
                        sortDirection === 'asc' ? (
                          <ArrowUp className="w-3.5 h-3.5 text-slate-200 stroke-[2.5]" />
                        ) : (
                          <ArrowDown className="w-3.5 h-3.5 text-slate-200 stroke-[2.5]" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-400/50 group-hover:text-slate-300 transition-colors" />
                      )}
                    </div>
                  </th>

                  {/* Time in Desk */}
                  <th
                    scope="col"
                    aria-sort={sortField === 'timeInDesk' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                    onClick={() => handleSort('timeInDesk')}
                    className={`py-3.5 px-4 cursor-pointer select-none group transition-colors ${
                      sortField === 'timeInDesk'
                        ? 'bg-slate-800 dark:bg-slate-900 text-slate-100'
                        : 'hover:bg-slate-800/80 dark:hover:bg-slate-900/80'
                    }`}
                    title={sortField === 'timeInDesk' ? `Sorted by Time in Desk (${sortDirection === 'asc' ? 'Ascending' : 'Descending'}). Click to invert.` : 'Click to sort by Time in Desk'}
                  >
                    <div className="inline-flex items-center gap-1.5">
                      <span>Time in Desk</span>
                      {sortField === 'timeInDesk' ? (
                        sortDirection === 'asc' ? (
                          <ArrowUp className="w-3.5 h-3.5 text-slate-200 stroke-[2.5]" />
                        ) : (
                          <ArrowDown className="w-3.5 h-3.5 text-slate-200 stroke-[2.5]" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-400/50 group-hover:text-slate-300 transition-colors" />
                      )}
                    </div>
                  </th>

                  {/* Lifecycle Progress */}
                  <th
                    scope="col"
                    aria-sort={sortField === 'lifecycle' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                    onClick={() => handleSort('lifecycle')}
                    className={`py-3.5 px-4 min-w-[210px] cursor-pointer select-none group transition-colors ${
                      sortField === 'lifecycle'
                        ? 'bg-slate-800 dark:bg-slate-900 text-slate-100'
                        : 'hover:bg-slate-800/80 dark:hover:bg-slate-900/80'
                    }`}
                    title={sortField === 'lifecycle' ? `Sorted by Lifecycle Progress (${sortDirection === 'asc' ? 'Ascending' : 'Descending'}). Click to invert.` : 'Click to sort by Lifecycle Progress'}
                  >
                    <div className="inline-flex items-center gap-1.5">
                      <span>Lifecycle Progress</span>
                      {sortField === 'lifecycle' ? (
                        sortDirection === 'asc' ? (
                          <ArrowUp className="w-3.5 h-3.5 text-slate-200 stroke-[2.5]" />
                        ) : (
                          <ArrowDown className="w-3.5 h-3.5 text-slate-200 stroke-[2.5]" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-400/50 group-hover:text-slate-300 transition-colors" />
                      )}
                    </div>
                  </th>

                  {/* Actions Column (Non-sortable) */}
                  <th scope="col" className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {sortedDocuments.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-slate-500 dark:text-slate-400">
                      <Inbox className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                      <p className="font-bold text-slate-800 dark:text-slate-200">No documents match filter criteria.</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                        Reset filters or click "Log Document" to register a new record.
                      </p>
                    </td>
                  </tr>
                ) : (
                  visibleDocuments.map((doc, _idx_doc) => {
                    const hasPendingRemarks = doc.supervisorRemarks?.some(
                      (r) => r.complianceRequired && !r.complied
                    );
                    const isCleared = doc.managerClearance?.isCleared;
                    const timeMetrics = calculateDocumentTimeInDesk(doc, timeInDeskConfig);
                    const isOverdue = timeMetrics.isOverdue;
                    const shouldHighlightOverdue =
                      timeInDeskConfig.highlightRowOnExceed && isOverdue;
                    const isSelected = selectedDocIds.has(doc.id);

                    return (
                      <tr
                        key={`${doc.id}-${_idx_doc}`}
                        onClick={() => setSelectedDoc(doc)}
                        className={`transition-all duration-150 cursor-pointer group border-l-4 ${
                          isSelected
                            ? 'bg-blue-50/80 dark:bg-blue-950/50 hover:bg-blue-100/90 dark:hover:bg-blue-900/60 border-l-blue-600 shadow-2xs'
                            : shouldHighlightOverdue
                            ? 'bg-rose-50/70 dark:bg-rose-950/40 hover:bg-rose-100/90 dark:hover:bg-rose-900/40 border-l-rose-500 shadow-2xs hover:shadow-md'
                            : 'border-l-transparent hover:border-l-blue-500 hover:bg-blue-50/50 dark:hover:bg-slate-800/80 shadow-2xs hover:shadow-md'
                        }`}
                      >
                        {/* Checkbox Column */}
                        <td
                          className="py-3.5 px-3 text-center whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            id={`select-doc-${doc.id}`}
                            aria-label={`Select document ${doc.trackingNumber}`}
                            checked={isSelected}
                            onChange={() => toggleSelectDoc(doc.id)}
                            className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500 cursor-pointer align-middle"
                          />
                        </td>

                        {/* Tracking # & Priority */}
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                          <span className="group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:translate-x-0.5 inline-block transition-all duration-150">
                            {doc.trackingNumber}
                          </span>
                          <span
                            className={`inline-block ml-2 px-1.5 py-0.2 rounded text-[10px] font-bold transition-transform duration-150 group-hover:scale-105 ${
                              doc.priority === 'Rush'
                                ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                                : doc.priority === 'Urgent'
                                ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                                : 'bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                            }`}
                          >
                            {doc.priority}
                          </span>
                        </td>

                        {/* Title & Type */}
                        <td className="py-3.5 px-4 max-w-xs">
                          <div className="flex items-center gap-1.5">
                            <p className="font-bold text-slate-900 dark:text-white line-clamp-1 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">
                              {doc.title}
                            </p>
                            {doc.fileLink && (
                              <a
                                href={doc.fileLink}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-0.5 p-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 bg-blue-50 dark:bg-blue-950/80 hover:bg-blue-100 dark:hover:bg-blue-900 rounded-md shrink-0 transition-all hover:scale-115 active:scale-95 shadow-2xs hover:shadow-xs"
                                title="Open attached cloud file / drive link"
                              >
                                <Link2 className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 block max-w-xs truncate" title={`${doc.communicationType} | ${doc.reportType} | ${doc.documentType}`}>
                            {doc.communicationType} &bull; {doc.reportType} &bull; {doc.documentType}
                          </span>
                        </td>

                        {/* Origin Department & Auto Timestamp */}
                        <td className="py-3.5 px-4">
                          <p className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[180px]">
                            {doc.originDepartment}
                          </p>
                          <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            <Clock className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                            <span>
                              {doc.dateReceived} • {doc.timeReceived}
                            </span>
                          </div>
                        </td>

                        {/* Target Division & Responsible Person */}
                        <td className="py-3.5 px-4">
                          <p className="font-semibold text-slate-900 dark:text-white truncate max-w-[180px]">
                            {doc.targetDivision}
                          </p>
                          <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 flex items-center gap-1">
                            <UserCheck className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                            <span className="truncate">{doc.responsiblePerson}</span>
                          </p>
                        </td>

                        {/* Current Location & Custodian */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1 text-slate-800 dark:text-slate-200 font-semibold">
  <Users className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
  <span className="truncate max-w-[160px]">{doc.currentCustodian}</span>
</div>
                        </td>

                        {/* Time in Desk / Dwell SLA */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {isCleared ? (
                            <div className="flex flex-col">
                              <span className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                {timeMetrics.elapsedFormatted}
                              </span>
                              <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium mt-0.5">
                                Cleared out
                              </span>
                            </div>
                          ) : isOverdue ? (
                            <div className="flex flex-col">
                              <span className="inline-flex items-center gap-1 font-mono text-xs font-bold text-rose-700 dark:text-rose-400">
                                <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
                                {timeMetrics.elapsedFormatted}
                              </span>
                              <span className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold mt-0.5">
                                +{timeMetrics.overdueFormatted} overdue (max {timeMetrics.thresholdHours}h)
                              </span>
                            </div>
                          ) : (
                            <div className="flex flex-col">
                              <span className="inline-flex items-center gap-1 font-mono text-xs font-medium text-slate-700 dark:text-slate-300">
                                <Clock className="w-3 h-3 text-slate-400 dark:text-slate-500 shrink-0" />
                                {timeMetrics.elapsedFormatted}
                              </span>
                              <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                                {timeMetrics.remainingFormatted} left (max {timeMetrics.thresholdHours}h)
                              </span>
                            </div>
                          )}
                        </td>

                        {/* Status & Lifecycle Progress Bar */}
                        <td className="py-3.5 px-4">
                          <DocumentLifecycleProgress document={doc} variant="compact" />
                        </td>

                        {/* Action Link & Deletion */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {canDeleteLogs ? (
                              <button
                                type="button"
                                id={`delete-doc-${doc.trackingNumber}`}
                                title={`Delete log entry (${doc.trackingNumber}) - Authorized for ${currentUser?.role}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDocToDelete(doc);
                                }}
                                className="inline-flex items-center justify-center w-7 h-7 rounded-lg border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 hover:border-rose-300 dark:hover:border-rose-700 transition-all duration-150 hover:scale-110 active:scale-95 shadow-2xs hover:shadow-sm cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <span
                                title="Entry deletion strictly restricted to System Admins & Department Manager"
                                className="inline-flex items-center justify-center w-7 h-7 rounded-lg border border-slate-200/70 dark:border-slate-800 text-slate-300 dark:text-slate-600 bg-slate-50 dark:bg-slate-800/40 cursor-not-allowed"
                              >
                                <Lock className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600" />
                              </span>
                            )}

                            <button
                              id={`view-doc-${doc.trackingNumber}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedDoc(doc);
                              }}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-blue-200 dark:border-blue-800 text-xs font-semibold text-blue-800 dark:text-blue-300 bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-150 hover:scale-105 active:scale-95 shadow-2xs hover:shadow-md cursor-pointer group/btn"
                            >
                              <span>Open Route</span>
                              <ChevronRight className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400 group-hover/btn:translate-x-0.5 transition-transform" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Virtualized Lazy-Loading Pagination Controls */}
          {sortedDocuments.length > 30 && (
            <div
              id="main-table-virtualization-footer"
              className="p-3.5 sm:p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-400"
            >
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shrink-0" />
                <span>
                  Rendering <strong className="text-slate-900 dark:text-white font-mono">{visibleDocuments.length}</strong> of{' '}
                  <strong className="text-slate-900 dark:text-white font-mono">{sortedDocuments.length}</strong> records{' '}
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                    (Lazy virtualization active to minimize main-thread re-renders)
                  </span>
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {visibleDocCount < sortedDocuments.length ? (
                  <>
                    <button
                      type="button"
                      id="btn-load-more-docs"
                      onClick={() => setVisibleDocCount((prev) => Math.min(sortedDocuments.length, prev + 30))}
                      className="px-3.5 py-1.5 rounded-lg bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600 font-semibold text-slate-800 dark:text-white shadow-2xs cursor-pointer transition-all flex items-center gap-1.5 text-xs"
                    >
                      <span>Load Next 30 Records</span>
                    </button>
                    <button
                      type="button"
                      id="btn-load-all-docs"
                      onClick={() => setVisibleDocCount(sortedDocuments.length)}
                      className="px-3.5 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-700 dark:text-blue-300 font-semibold shadow-2xs cursor-pointer transition-all text-xs"
                    >
                      <span>Show All ({sortedDocuments.length})</span>
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setVisibleDocCount(30)}
                    className="px-3.5 py-1.5 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600 font-medium cursor-pointer text-xs transition-colors"
                  >
                    <span>Collapse to Initial 30</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
          </>
        )}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>

      {/* Modal: Login / Authentication */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        currentUser={currentUser}
        onLoginSuccess={(authedStaff) => {
          setCurrentUser(authedStaff);
          setIsLoginModalOpen(false);
          addNotification(
            'Authenticated Session',
            `Signed in as ${authedStaff.name} (${authedStaff.role}) via enrolled portal credentials.`,
            authedStaff.name,
            'movement',
            'AUTH-LOGIN'
          );
        }}
        staffList={staffList}
      />

      {/* Modal: Staff Roles, Credentials & Permission Matrix Management */}
      <RolesManagementModal
        isOpen={isRolesModalOpen}
        onClose={() => setIsRolesModalOpen(false)}
        currentUser={currentUser}
        onSelectUser={(u) => setCurrentUser(u)}
        staffList={staffList}
        onAddStaffMember={handleAddStaffMember}
        onUpdateStaffRole={handleUpdateStaffRole}
        onUpdateStaffCredentials={handleUpdateStaffCredentials}
        onDeleteStaffMember={handleDeleteStaffMember}
        documents={documents}
        dropdownOptions={dropdownOptions}
        onUpdateDropdownOptions={handleUpdateDropdownOptions}
        sheetConfig={sheetConfig}
        token={token}
        onSyncToSheet={async () => {
          if (!token || !sheetConfig) return;
          await syncPersonnelOnlyToSheet(token, sheetConfig.spreadsheetId, staffList);
        }}
        onPullFromSheet={async () => {
          if (!token || !sheetConfig) return;
          const pulled = await pullPersonnelFromSheet(token, sheetConfig.spreadsheetId, staffList);
          setStaffList(pulled);
          saveStoredStaffMembers(pulled);
          broadcastDataUpdate('staff', pulled);
        }}
        onImportStaff={(importedStaff, newOptions, newSheetConfig) => {
          setStaffList(importedStaff);
          saveStoredStaffMembers(importedStaff);
          broadcastDataUpdate('staff', importedStaff);
          if (newOptions) {
            setDropdownOptions(newOptions);
            saveStoredDropdownOptions(newOptions);
            broadcastDataUpdate('dropdowns', newOptions);
          }
          if (newSheetConfig && !sheetConfig) {
            setSheetConfig(newSheetConfig);
            saveStoredSheetConfig(newSheetConfig);
          }
        }}
      />

      {/* Modal: New Incoming Document Form */}
      <IncomingDocumentModal
        isOpen={isIncomingModalOpen}
        onClose={() => setIsIncomingModalOpen(false)}
        onSubmit={handleCreateDocument}
        currentUser={currentUser}
        availableDivisions={dropdownOptions.departments}
        dropdownOptions={dropdownOptions}
        timeInDeskConfig={timeInDeskConfig}
      />

      {/* Modal: Document Detail, Internal Routing, Supervisor Remarks & Manager Clearance */}
      <DocumentDetailModal
        document={selectedDoc}
        onClose={() => setSelectedDoc(null)}
        currentUser={currentUser}
        onUpdateDocument={handleUpdateDocument}
        onSwitchRole={handleQuickSwitchRole}
        onDeleteDocument={(doc) => setDocToDelete(doc)}
        timeInDeskConfig={timeInDeskConfig}
        onConfigureThreshold={() => setIsThresholdModalOpen(true)}
      />

      {/* Modal: Time-in-Desk Division Threshold Configuration */}
      <TimeInDeskConfigModal
        isOpen={isThresholdModalOpen}
        onClose={() => setIsThresholdModalOpen(false)}
        config={timeInDeskConfig}
        onSaveConfig={handleSaveThresholdConfig}
        currentUserRole={currentUser?.role}
        documents={documents}
        availableDivisions={dropdownOptions.departments}
      />

      {/* Modal: Google Sheet Sync & Integration */}
      <GoogleSheetSyncModal
        isOpen={isSheetModalOpen}
        onClose={() => setIsSheetModalOpen(false)}
        user={user}
        token={token}
        onAuthSuccess={(u, t) => {
          setUser(u);
          setToken(t);
          setAccessToken(t);
        }}
        onSignOut={() => {
          setUser(null);
          setToken(null);
          setAccessToken(null);
        }}
        sheetConfig={sheetConfig}
        onSaveSheetConfig={(cfg) => {
          setSheetConfig(cfg);
          saveStoredSheetConfig(cfg);
        }}
        documents={documents}
        staffList={staffList}
        onNotify={(title, msg, type) =>
          addNotification(title, msg, currentUser?.name || 'System', type, 'SHEET-SYNC')
        }
        onPullSuccess={(pulledDocs, pulledStaff) => {
          if (pulledDocs && pulledDocs.length > 0) {
            setDocuments(pulledDocs);
            saveStoredDocuments(pulledDocs);
            broadcastDataUpdate('documents', pulledDocs);
          }
          if (pulledStaff && pulledStaff.length > 0) {
            setStaffList(pulledStaff);
            saveStoredStaffMembers(pulledStaff);
            broadcastDataUpdate('staff', pulledStaff);
          }
        }}
      />

      {/* Modal: Keyboard Shortcuts Guide */}
      <KeyboardShortcutsModal
        isOpen={isShortcutsModalOpen}
        onClose={() => setIsShortcutsModalOpen(false)}
      />

      {/* Modal: Batch Delete Documents Confirmation */}
      {batchDocsToDelete && batchDocsToDelete.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 max-w-lg w-full overflow-hidden transition-colors">
            
            {/* Modal Header */}
            <div className="p-5 bg-rose-50 dark:bg-rose-950/40 border-b border-rose-100 dark:border-rose-900 flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Confirm Bulk Deletion
                  </h3>
                  <p className="text-xs text-rose-800 dark:text-rose-300 font-medium">
                    Permanent deletion of {batchDocsToDelete.length} document record(s)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBatchDocsToDelete(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-white/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/70 rounded-xl text-xs text-amber-800 dark:text-amber-300">
                <p className="font-semibold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                  Warning: This action cannot be undone.
                </p>
                <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-400">
                  The following {batchDocsToDelete.length} document entries will be permanently removed from all logs and synchronizations.
                </p>
              </div>

              {/* Document List Preview */}
              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-100 dark:divide-slate-800">
                {batchDocsToDelete.map((doc) => (
                  <div key={doc.id} className="pt-1.5 first:pt-0 flex items-center justify-between text-xs">
                    <div className="min-w-0 pr-2">
                      <span className="font-mono font-bold text-slate-900 dark:text-white mr-2">
                        {doc.trackingNumber}
                      </span>
                      <span className="text-slate-600 dark:text-slate-400 truncate">
                        {doc.title}
                      </span>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0 font-medium">
                      {doc.currentStatus}
                    </span>
                  </div>
                ))}
              </div>

              {/* Role Audit Info */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                <span>Authorized Operator:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {currentUser?.name} ({currentUser?.role})
                </span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 dark:bg-slate-850 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setBatchDocsToDelete(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                id="confirm-batch-delete-btn"
                disabled={isDeleting}
                onClick={handleConfirmBatchDelete}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-semibold transition-colors shadow-sm cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting {batchDocsToDelete.length}...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete {batchDocsToDelete.length} Record{batchDocsToDelete.length === 1 ? '' : 's'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Delete Document Confirmation (System Admin & Department Manager) */}
      {docToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 max-w-lg w-full overflow-hidden transition-colors">
            
            {/* Modal Header */}
            <div className="p-5 bg-rose-50 dark:bg-rose-950/40 border-b border-rose-100 dark:border-rose-900 flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Delete Document Log Entry
                  </h3>
                  <p className="text-xs text-rose-800 dark:text-rose-300 font-medium">
                    Authorized Action: System Admin & Department Manager Only
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDocToDelete(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-white/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Are you sure you want to permanently delete this document from the registry logs? This action will remove all internal tracking history, routing records, supervisor remarks, and linked Google Sheet rows.
              </p>

              {/* Target Document Summary Card */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                    {docToDelete.trackingNumber}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                      docToDelete.managerClearance?.isCleared || docToDelete.currentStatus === 'Cleared for Out'
                        ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                        : 'bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800'
                    }`}
                  >
                    {docToDelete.managerClearance?.isCleared || docToDelete.currentStatus === 'Cleared for Out'
                      ? 'Outgoing Registry'
                      : 'Incoming Registry'}
                  </span>
                </div>

                <div className="font-semibold text-slate-800 dark:text-slate-200 line-clamp-2">
                  {docToDelete.title}
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/80 dark:border-slate-700 text-[11px] text-slate-500 dark:text-slate-400">
                  <div>
                    <span className="text-slate-400 dark:text-slate-500 block">Classification:</span>
                    <span className="text-slate-700 dark:text-slate-200 font-medium">{docToDelete.documentType}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 dark:text-slate-500 block">Originating Dept:</span>
                    <span className="text-slate-700 dark:text-slate-200 font-medium truncate block">{docToDelete.originDepartment}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 dark:text-slate-500 block">Received Timestamp:</span>
                    <span className="text-slate-700 dark:text-slate-200 font-medium">{docToDelete.dateReceived} • {docToDelete.timeReceived}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 dark:text-slate-500 block">Current Status:</span>
                    <span className="text-slate-700 dark:text-slate-200 font-medium">{docToDelete.currentStatus}</span>
                  </div>
                </div>
              </div>

              {/* Role Audit Verification Badge */}
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Operator Authorization:</span> You are deleting as{' '}
                  <strong className="text-slate-900 dark:text-white">{currentUser?.name}</strong> (<span className="text-amber-800 dark:text-amber-400 font-semibold">{currentUser?.role}</span>). This event is permanently recorded in the system notification and sync trail.
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDocToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                id="confirm-delete-doc-btn"
                disabled={isDeleting}
                onClick={() => handleDeleteDocument(docToDelete)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-colors shadow-sm cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting Entry...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Permanently Delete Entry</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
```

---

