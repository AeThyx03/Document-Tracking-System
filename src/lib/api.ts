import { DocumentItem, AppUserRole } from '../types';
import { processQueueSequentially } from './offlineQueue';

export interface HealthStatus {
  success: boolean;
  api: string;
  database: string;
  latencyMs?: number;
  timestamp?: string;
  error?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  } | string;
  message: string;
  details?: any;
}

export class ApiError extends Error {
  status: number;
  code: string;
  details?: any;

  constructor(status: number, code: string, message: string, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

// Token is managed here to abstract storage from React components
let cachedToken: string | null = null;

export function setAccessToken(token: string | null) {
  cachedToken = token;
  if (token) {
    localStorage.setItem('possd_access_token', token);
  } else {
    localStorage.removeItem('possd_access_token');
  }
}

export function getAccessToken(): string | null {
  if (cachedToken) return cachedToken;
  try {
    const stored = localStorage.getItem('possd_access_token');
    if (stored) {
      cachedToken = stored;
      return stored;
    }
  } catch (e) {
    console.warn('Failed to read access token from local storage', e);
  }
  return null;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = getAccessToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

/**
 * Clean POSSD API Request Helper
 * Strictly validates response.ok and status codes.
 */
export async function apiRequest<T = any>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const authHeaders = await getAuthHeaders();
  const mergedHeaders: Record<string, string> = {
    ...authHeaders,
    ...((options.headers as Record<string, string>) || {}),
  };

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers: mergedHeaders,
    });
  } catch (fetchErr: any) {
    throw new ApiError(503, 'NETWORK_ERROR', fetchErr.message || 'Network connection failed');
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return { success: true } as unknown as T;
  }

  // Parse JSON response body if present
  let data: any = null;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  }

  // Explicit status code & error validation
  if (!response.ok) {
    let errorCode = 'API_ERROR';
    let errorMessage = response.statusText || 'An unexpected error occurred';
    let errorDetails: any = null;

    if (data) {
      if (typeof data.error === 'object' && data.error !== null) {
        errorCode = data.error.code || errorCode;
        errorMessage = data.error.message || errorMessage;
        errorDetails = data.error.details;
      } else if (typeof data.error === 'string') {
        errorCode = data.error;
        errorMessage = data.message || data.error;
      } else if (data.message) {
        errorMessage = data.message;
      }
    }

    switch (response.status) {
      case 400:
        errorCode = errorCode === 'API_ERROR' ? 'VALIDATION_ERROR' : errorCode;
        break;
      case 401:
        errorCode = 'UNAUTHORIZED';
        errorMessage = errorMessage || 'Authentication credentials missing or invalid.';
        break;
      case 403:
        errorCode = 'FORBIDDEN';
        errorMessage = errorMessage || 'You do not have permission to perform this action.';
        break;
      case 404:
        errorCode = 'NOT_FOUND';
        errorMessage = errorMessage || 'Requested resource was not found.';
        break;
      case 409:
        errorCode = 'CONCURRENCY_CONFLICT';
        errorMessage = errorMessage || 'Document was modified by another user. Please reload.';
        break;
      case 422:
        errorCode = 'UNPROCESSABLE_ENTITY';
        break;
      case 429:
        errorCode = 'RATE_LIMITED';
        errorMessage = 'Too many requests. Please wait before retrying.';
        break;
      case 500:
        errorCode = 'INTERNAL_SERVER_ERROR';
        break;
      case 503:
        errorCode = 'SERVICE_UNAVAILABLE';
        break;
    }

    throw new ApiError(response.status, errorCode, errorMessage, errorDetails);
  }

  return data as T;
}

/**
 * Processes queued offline mutations stored in IndexedDB sequentially
 */
export async function processOfflineQueue(): Promise<{ synced: number; failed: number }> {
  try {
    const result = await processQueueSequentially();
    return { synced: result.processed, failed: result.failed };
  } catch (e) {
    console.error('[POSSD API] Failed to process offline mutation queue:', e);
    return { synced: 0, failed: 0 };
  }
}

// -------------------------------------------------------------
// HEALTH CHECK
// -------------------------------------------------------------
export async function checkBackendHealth(): Promise<HealthStatus> {
  try {
    const res = await fetch('/api/health');
    const data = await res.json();
    return data;
  } catch (err: any) {
    return {
      success: false,
      api: 'unreachable',
      database: 'unreachable',
      error: err.message,
    };
  }
}

// -------------------------------------------------------------
// DOCUMENTS API
// -------------------------------------------------------------

export interface FetchDocumentsParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  division?: string;
  priority?: string;
  viewMode?: string;
  sort?: string;
  sortDirection?: 'asc' | 'desc';
}

export interface PaginatedDocumentsResponse {
  documents: DocumentItem[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export async function fetchDocuments(params?: FetchDocumentsParams): Promise<DocumentItem[]> {
  let url = '/api/documents';
  if (params) {
    const sp = new URLSearchParams();
    if (params.page) sp.set('page', String(params.page));
    if (params.pageSize) sp.set('pageSize', String(params.pageSize));
    if (params.search) sp.set('search', params.search);
    if (params.status && params.status !== 'ALL' && params.status !== 'All') sp.set('status', params.status);
    if (params.division && params.division !== 'ALL' && params.division !== 'All') sp.set('division', params.division);
    if (params.priority && params.priority !== 'ALL' && params.priority !== 'All') sp.set('priority', params.priority);
    if (params.viewMode && params.viewMode !== 'all') sp.set('viewMode', params.viewMode);
    if (params.sort) sp.set('sort', params.sort);
    if (params.sortDirection) sp.set('sortDirection', params.sortDirection);
    const query = sp.toString();
    if (query) url += `?${query}`;
  }

  const data = await apiRequest<{ success: boolean; documents: DocumentItem[] }>(url);
  return data.documents;
}

export async function fetchDocumentsPaginated(params: FetchDocumentsParams): Promise<PaginatedDocumentsResponse> {
  let url = '/api/documents';
  const sp = new URLSearchParams();
  if (params.page) sp.set('page', String(params.page));
  if (params.pageSize) sp.set('pageSize', String(params.pageSize));
  if (params.search) sp.set('search', params.search);
  if (params.status && params.status !== 'ALL' && params.status !== 'All') sp.set('status', params.status);
  if (params.division && params.division !== 'ALL' && params.division !== 'All') sp.set('division', params.division);
  if (params.priority && params.priority !== 'ALL' && params.priority !== 'All') sp.set('priority', params.priority);
  if (params.viewMode && params.viewMode !== 'all') sp.set('viewMode', params.viewMode);
  if (params.sort) sp.set('sort', params.sort);
  if (params.sortDirection) sp.set('sortDirection', params.sortDirection);
  const query = sp.toString();
  if (query) url += `?${query}`;

  const data = await apiRequest<{
    success: boolean;
    documents: DocumentItem[];
    totalCount: number;
    page?: number;
    pageSize?: number;
    totalPages?: number;
    pagination?: {
      page: number;
      pageSize: number;
      totalCount: number;
      totalPages: number;
    };
  }>(url);

  const totalCount = data.totalCount ?? data.pagination?.totalCount ?? data.documents.length;
  const page = data.page ?? data.pagination?.page ?? params.page ?? 1;
  const pageSize = data.pageSize ?? data.pagination?.pageSize ?? params.pageSize ?? 25;
  const totalPages = data.totalPages ?? data.pagination?.totalPages ?? Math.max(1, Math.ceil(totalCount / pageSize));

  return {
    documents: data.documents || [],
    totalCount,
    page,
    pageSize,
    totalPages,
  };
}

export async function fetchDocumentById(id: string): Promise<DocumentItem | null> {
  const data = await apiRequest<{ success: boolean; document: DocumentItem }>(
    `/api/documents/${encodeURIComponent(id)}`
  );
  return data.document;
}

export async function createDocument(doc: DocumentItem): Promise<DocumentItem> {
  const data = await apiRequest<{ success: boolean; document: DocumentItem }>(
    '/api/documents',
    {
      method: 'POST',
      body: JSON.stringify(doc),
    }
  );
  return data.document;
}

export async function updateDocument(
  doc: DocumentItem,
  options?: { expectedVersion?: number }
): Promise<DocumentItem> {
  const payload = {
    ...doc,
    expectedVersion:
      options?.expectedVersion !== undefined
        ? options.expectedVersion
        : (doc as any).expectedVersion !== undefined
        ? (doc as any).expectedVersion
        : doc.version,
  };
  const data = await apiRequest<{ success: boolean; document: DocumentItem }>(
    `/api/documents/${encodeURIComponent(doc.id)}`,
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    }
  );
  return data.document;
}

export interface BatchApiItemResult {
  id: string;
  trackingNumber?: string;
  status: 'successful' | 'failed';
  document?: DocumentItem;
  error?: { code: string; message: string; isConflict?: boolean };
}

export interface BatchApiResponse {
  total: number;
  succeeded: number;
  failed: number;
  results: BatchApiItemResult[];
}

export async function batchUpdateDocuments(
  updates: Array<{ id: string; data: Partial<DocumentItem>; expectedVersion?: number }>
): Promise<BatchApiResponse> {
  return await apiRequest<BatchApiResponse>('/api/documents/batch-update', {
    method: 'POST',
    body: JSON.stringify({ updates }),
  });
}

export async function batchDeleteDocuments(
  ids: string[]
): Promise<{ total: number; succeeded: number; failed: number; results: Array<{ id: string; status: 'successful' | 'failed'; error?: any }> }> {
  return await apiRequest('/api/documents/batch-delete', {
    method: 'POST',
    body: JSON.stringify({ ids }),
  });
}

export async function deleteDocument(docId: string): Promise<void> {
  await apiRequest(`/api/documents/${encodeURIComponent(docId)}`, {
    method: 'DELETE',
  });
}

// -------------------------------------------------------------
// DOCUMENT MOVEMENTS & ROUTING
// -------------------------------------------------------------

export async function fetchMovements(docId: string): Promise<any[]> {
  const data = await apiRequest<{ success: boolean; movements: any[] }>(
    `/api/documents/${encodeURIComponent(docId)}/movements`
  );
  return data.movements;
}

export async function addMovement(docId: string, movement: any): Promise<any> {
  return await apiRequest(`/api/documents/${encodeURIComponent(docId)}/movements`, {
    method: 'POST',
    body: JSON.stringify(movement),
  });
}

// -------------------------------------------------------------
// DOCUMENT REMARKS
// -------------------------------------------------------------

export async function fetchRemarks(docId: string): Promise<any[]> {
  const data = await apiRequest<{ success: boolean; remarks: any[] }>(
    `/api/documents/${encodeURIComponent(docId)}/remarks`
  );
  return data.remarks;
}

export async function addRemark(docId: string, remark: any): Promise<any> {
  return await apiRequest(`/api/documents/${encodeURIComponent(docId)}/remarks`, {
    method: 'POST',
    body: JSON.stringify(remark),
  });
}

// -------------------------------------------------------------
// DOCUMENT CLEARANCE & EXECUTIVE DISPATCH (AUTHORITATIVE)
// -------------------------------------------------------------

export async function recordClearance(
  docId: string,
  clearanceData: {
    clearanceType?: string;
    exitTrackingNumber?: string;
    forwardedToExternal?: string;
    clearanceRemarks?: string;
    isCleared?: boolean;
  }
): Promise<{ document: DocumentItem; clearance: any }> {
  return await apiRequest(`/api/documents/${encodeURIComponent(docId)}/clearance`, {
    method: 'POST',
    body: JSON.stringify(clearanceData),
  });
}

export async function revokeClearance(
  docId: string,
  revokeData: { reason?: string } = {}
): Promise<{ document: DocumentItem; clearance: any }> {
  return await apiRequest(`/api/documents/${encodeURIComponent(docId)}/clearance`, {
    method: 'DELETE',
    body: JSON.stringify(revokeData),
  });
}

// -------------------------------------------------------------
// PERSONNEL & STAFF API
// -------------------------------------------------------------

export async function fetchStaff(): Promise<AppUserRole[]> {
  const data = await apiRequest<{ success: boolean; personnel?: AppUserRole[]; staff?: AppUserRole[] }>(
    '/api/personnel'
  );
  return (data.personnel || data.staff || []).map((s: any) => ({
    ...s,
    id: String(s.id),
  }));
}

export async function saveStaffMember(staff: AppUserRole): Promise<void> {
  await apiRequest('/api/personnel', {
    method: 'POST',
    body: JSON.stringify(staff),
  });
}

export async function createStaffMember(staff: Partial<AppUserRole> & { password?: string }): Promise<AppUserRole> {
  const data = await apiRequest<{ success: boolean; personnel: AppUserRole; staffMember: AppUserRole }>('/api/personnel', {
    method: 'POST',
    body: JSON.stringify(staff),
  });
  const res = data.personnel || data.staffMember;
  return { ...res, id: String(res.id) };
}

export async function updateStaffMember(id: string | number, updates: Partial<AppUserRole> & { password?: string }): Promise<AppUserRole> {
  const data = await apiRequest<{ success: boolean; personnel: AppUserRole; staffMember: AppUserRole }>(`/api/personnel/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
  const res = data.personnel || data.staffMember;
  return { ...res, id: String(res.id) };
}

export async function updateStaffCredentials(
  id: string | number,
  credentials: { username?: string; email?: string; status?: 'active' | 'suspended'; password?: string }
): Promise<AppUserRole> {
  const data = await apiRequest<{ success: boolean; personnel: AppUserRole; staffMember: AppUserRole }>(`/api/personnel/${encodeURIComponent(id)}/credentials`, {
    method: 'PATCH',
    body: JSON.stringify(credentials),
  });
  const res = data.personnel || data.staffMember;
  return { ...res, id: String(res.id) };
}

export async function updateStaffStatus(id: string | number, status: 'active' | 'suspended'): Promise<AppUserRole> {
  const data = await apiRequest<{ success: boolean; personnel: AppUserRole; staffMember: AppUserRole }>(`/api/personnel/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
  const res = data.personnel || data.staffMember;
  return { ...res, id: String(res.id) };
}

export async function deleteStaffMember(id: string | number): Promise<void> {
  await apiRequest(`/api/personnel/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

// -------------------------------------------------------------
// DEPARTMENTS API
// -------------------------------------------------------------

export async function fetchDepartments(): Promise<any[]> {
  const data = await apiRequest<{ success: boolean; departments: any[] }>('/api/departments');
  return data.departments;
}

// -------------------------------------------------------------
// DESKS API
// -------------------------------------------------------------

export async function fetchDesks(): Promise<any[]> {
  const data = await apiRequest<{ success: boolean; desks: any[] }>('/api/desks');
  return data.desks;
}

export async function createDesk(desk: {
  name: string;
  departmentId?: number;
  code?: string;
  description?: string;
}): Promise<any> {
  return await apiRequest('/api/desks', {
    method: 'POST',
    body: JSON.stringify(desk),
  });
}

// -------------------------------------------------------------
// DEDICATED LINKS API
// -------------------------------------------------------------

export async function fetchLinks(): Promise<any[]> {
  const data = await apiRequest<{ success: boolean; links: any[] }>('/api/links');
  return data.links;
}

export async function saveLinks(links: any[]): Promise<void> {
  await apiRequest('/api/links', {
    method: 'POST',
    body: JSON.stringify(links),
  });
}

export async function updateLink(id: string, link: any): Promise<any> {
  return await apiRequest(`/api/links/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(link),
  });
}

export async function deleteLink(id: string): Promise<void> {
  await apiRequest(`/api/links/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

// -------------------------------------------------------------
// SLA RULES & CONFIG API
// -------------------------------------------------------------

export async function fetchSlaConfig(): Promise<any> {
  const data = await apiRequest<{ success: boolean; config: any }>('/api/sla/config');
  return data.config;
}

export async function saveSlaConfig(config: any): Promise<void> {
  await apiRequest('/api/sla/config', {
    method: 'POST',
    body: JSON.stringify(config),
  });
}

// -------------------------------------------------------------
// DASHBOARD SUMMARY API
// -------------------------------------------------------------

export async function fetchDashboardSummary(): Promise<any> {
  const data = await apiRequest<{ success: boolean; summary: any }>('/api/dashboard/summary');
  return data.summary;
}

// -------------------------------------------------------------
// AUDIT LOGS
// -------------------------------------------------------------

import { createAuditEvent, recordGlobalAudit, getGlobalAuditLogs } from './audit';
import { AuditActionType, AuditEventRecord } from '../types';

export async function logAudit(
  action: string,
  docId: string,
  user: string,
  previousValue: string,
  newValue: string,
  extra?: {
    trackingNumber?: string;
    fromDesk?: string;
    toDesk?: string;
    stageLabel?: string;
    actionTitle?: string;
    metadata?: Record<string, any>;
  }
): Promise<void> {
  const auditAction: AuditActionType =
    action === 'CREATE' ? 'DOCUMENT_CREATED' :
    action === 'MOVEMENT' ? 'MOVEMENT_RECORDED' :
    action === 'REMARK' ? 'DIRECTIVE_ISSUED' :
    action === 'COMPLIANCE' ? 'COMPLIANCE_FULFILLED' :
    action === 'CLEARANCE' ? 'CLEARANCE_GRANTED' :
    action === 'DELETE' ? 'DOCUMENT_DELETED' :
    action === 'BATCH' ? 'BATCH_ACTION_APPLIED' :
    'STATUS_CHANGED';

  const event = createAuditEvent({
    documentId: docId,
    trackingNumber: extra?.trackingNumber || docId,
    action: auditAction,
    actionTitle: extra?.actionTitle || `${action} on ${extra?.trackingNumber || docId}`,
    stageLabel: extra?.stageLabel || 'System Event',
    type: action === 'CREATE' ? 'inflow' : action === 'MOVEMENT' ? 'movement' : action === 'REMARK' ? 'remark' : action === 'COMPLIANCE' ? 'compliance' : action === 'CLEARANCE' ? 'clearance' : 'system',
    actor: {
      name: user || 'System',
      role: 'Staff',
    },
    fromDesk: extra?.fromDesk,
    toDesk: extra?.toDesk,
    notes: newValue !== previousValue ? `Updated from "${previousValue}" to "${newValue}"` : newValue,
    metadata: extra?.metadata,
  });

  // Record in append-only client repository with deduplication
  recordGlobalAudit(event);

  try {
    await apiRequest('/api/audit', {
      method: 'POST',
      body: JSON.stringify(event),
    });
  } catch (err) {
    console.error('Failed to sync audit log to backend:', err);
  }
}

// -------------------------------------------------------------
// AUTHENTICATION API
// -------------------------------------------------------------

export async function loginWithCredentials(email: string, password: string):Promise<{token: string, user: AppUserRole}> {
  const res = await apiRequest<{success: boolean, token: string, user: AppUserRole}>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
  if (res.success && res.token && res.user) {
    setAccessToken(res.token);
    return { token: res.token, user: res.user };
  }
  throw new Error('Invalid login response');
}

export async function logout(): Promise<void> {
  try {
    await apiRequest('/api/auth/logout', { method: 'POST' });
  } catch (e) {
    console.warn('Backend logout failed or unavailable', e);
  } finally {
    setAccessToken(null);
  }
}

export async function fetchCurrentUser(): Promise<AppUserRole | null> {
  if (!getAccessToken()) return null;
  
  try {
    const res = await apiRequest<{success: boolean, user: AppUserRole}>('/api/auth/me', {
      method: 'GET'
    });
    if (res.success && res.user) {
      return res.user;
    }
  } catch (e) {
    console.warn('Failed to fetch current user, token may be invalid', e);
    setAccessToken(null);
  }
  return null;
}

// -------------------------------------------------------------
// CODEBASE EXPORT & VERIFICATION API
// -------------------------------------------------------------

export interface CodebaseBundleResponse {
  fileCount: number;
  totalSize: number;
  timestamp: string;
  rawCodebase: string;
  fullPrompt: string;
  filesSummary: { path: string; size: number }[];
}

export async function fetchCodebaseBundle(): Promise<CodebaseBundleResponse> {
  const data = await apiRequest<{
    success: boolean;
    fileCount: number;
    totalSize: number;
    timestamp: string;
    rawCodebase: string;
    fullPrompt: string;
    filesSummary: { path: string; size: number }[];
  }>('/api/codebase');

  return {
    fileCount: data.fileCount,
    totalSize: data.totalSize,
    timestamp: data.timestamp,
    rawCodebase: data.rawCodebase,
    fullPrompt: data.fullPrompt,
    filesSummary: data.filesSummary || [],
  };
}

export { recordGlobalAudit, getGlobalAuditLogs };
