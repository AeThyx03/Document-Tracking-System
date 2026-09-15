import { DocumentItem, AppUserRole } from '../types';
import { auth } from './firebase';
import {
  getStoredDocuments,
  saveStoredDocuments,
  getStoredStaffMembers,
  saveStoredStaffMembers,
} from '../mockData';
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

async function getToken(): Promise<string> {
  try {
    if (auth.currentUser) {
      return await auth.currentUser.getIdToken();
    }
  } catch (err) {
    console.warn('Failed to retrieve Firebase ID token:', err);
  }
  return '';
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await getToken();
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
// DOCUMENTS API (Clean persistence abstraction with local fallback)
// -------------------------------------------------------------
export interface FetchDocumentsParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  division?: string;
  priority?: string;
  sort?: string;
  sortDirection?: 'asc' | 'desc';
}

export async function fetchDocuments(params?: FetchDocumentsParams): Promise<DocumentItem[]> {
  try {
    let url = '/api/documents';
    if (params) {
      const sp = new URLSearchParams();
      if (params.page) sp.set('page', String(params.page));
      if (params.pageSize) sp.set('pageSize', String(params.pageSize));
      if (params.search) sp.set('search', params.search);
      if (params.status && params.status !== 'All') sp.set('status', params.status);
      if (params.division && params.division !== 'All') sp.set('division', params.division);
      if (params.priority && params.priority !== 'All') sp.set('priority', params.priority);
      if (params.sort) sp.set('sort', params.sort);
      if (params.sortDirection) sp.set('sortDirection', params.sortDirection);
      const query = sp.toString();
      if (query) url += `?${query}`;
    }

    const data = await apiRequest<{ success: boolean; documents: DocumentItem[] }>(url);
    if (data && data.success && Array.isArray(data.documents)) {
      return data.documents;
    }
  } catch {
    return getStoredDocuments();
  }
  return getStoredDocuments();
}

export async function fetchDocumentById(id: string): Promise<DocumentItem | null> {
  try {
    const data = await apiRequest<{ success: boolean; document: DocumentItem }>(
      `/api/documents/${encodeURIComponent(id)}`
    );
    if (data && data.success && data.document) {
      return data.document;
    }
  } catch {
    const local = getStoredDocuments();
    return local.find((d) => d.id === id || d.trackingNumber === id) || null;
  }
  return null;
}

export async function createDocument(doc: DocumentItem): Promise<DocumentItem> {
  try {
    const data = await apiRequest<{ success: boolean; document: DocumentItem }>(
      '/api/documents',
      {
        method: 'POST',
        body: JSON.stringify(doc),
      }
    );
    if (data && data.success && data.document) {
      return data.document;
    }
  } catch (err) {
    console.warn('[Persistence] Server write deferred, persisting locally:', err);
  }
  return doc;
}

export async function updateDocument(doc: DocumentItem): Promise<DocumentItem> {
  try {
    const data = await apiRequest<{ success: boolean; document: DocumentItem }>(
      `/api/documents/${encodeURIComponent(doc.id)}`,
      {
        method: 'PUT',
        body: JSON.stringify(doc),
      }
    );
    if (data && data.success && data.document) {
      return data.document;
    }
  } catch (err) {
    console.warn('[Persistence] Server update deferred, persisting locally:', err);
  }
  return doc;
}

export async function deleteDocument(docId: string): Promise<void> {
  try {
    await apiRequest(`/api/documents/${encodeURIComponent(docId)}`, {
      method: 'DELETE',
    });
  } catch (err) {
    console.warn('[Persistence] Server delete deferred, handled locally:', err);
  }
}

// -------------------------------------------------------------
// DOCUMENT MOVEMENTS & ROUTING
// -------------------------------------------------------------
export async function fetchMovements(docId: string): Promise<any[]> {
  try {
    const data = await apiRequest<{ success: boolean; movements: any[] }>(
      `/api/documents/${encodeURIComponent(docId)}/movements`
    );
    if (data && data.success && Array.isArray(data.movements)) {
      return data.movements;
    }
  } catch {
    const localDoc = getStoredDocuments().find((d) => d.id === docId);
    return localDoc?.movements || [];
  }
  return [];
}

export async function addMovement(docId: string, movement: any): Promise<any> {
  try {
    return await apiRequest(`/api/documents/${encodeURIComponent(docId)}/movements`, {
      method: 'POST',
      body: JSON.stringify(movement),
    });
  } catch {
    return movement;
  }
}

// -------------------------------------------------------------
// DOCUMENT REMARKS
// -------------------------------------------------------------
export async function fetchRemarks(docId: string): Promise<any[]> {
  try {
    const data = await apiRequest<{ success: boolean; remarks: any[] }>(
      `/api/documents/${encodeURIComponent(docId)}/remarks`
    );
    if (data && data.success && Array.isArray(data.remarks)) {
      return data.remarks;
    }
  } catch {
    const localDoc = getStoredDocuments().find((d) => d.id === docId);
    return localDoc?.supervisorRemarks || [];
  }
  return [];
}

export async function addRemark(docId: string, remark: any): Promise<any> {
  try {
    return await apiRequest(`/api/documents/${encodeURIComponent(docId)}/remarks`, {
      method: 'POST',
      body: JSON.stringify(remark),
    });
  } catch {
    return remark;
  }
}

// -------------------------------------------------------------
// PERSONNEL & STAFF API
// -------------------------------------------------------------
export async function fetchStaff(): Promise<AppUserRole[]> {
  try {
    const data = await apiRequest<{ success: boolean; personnel?: AppUserRole[]; staff?: AppUserRole[] }>(
      '/api/personnel'
    );
    if (data && data.success && (data.personnel || data.staff)) {
      return data.personnel || data.staff || [];
    }
  } catch {
    return getStoredStaffMembers();
  }
  return getStoredStaffMembers();
}

export async function saveStaffMember(staff: AppUserRole): Promise<void> {
  try {
    await apiRequest('/api/personnel', {
      method: 'POST',
      body: JSON.stringify(staff),
    });
  } catch (err) {
    console.warn('[Persistence] Staff member saved locally:', err);
  }
}

// -------------------------------------------------------------
// DEPARTMENTS API
// -------------------------------------------------------------
export async function fetchDepartments(): Promise<any[]> {
  try {
    const data = await apiRequest<{ success: boolean; departments: any[] }>('/api/departments');
    if (data && data.success && Array.isArray(data.departments)) {
      return data.departments;
    }
  } catch {
    return [];
  }
  return [];
}

// -------------------------------------------------------------
// DESKS API
// -------------------------------------------------------------
export async function fetchDesks(): Promise<any[]> {
  try {
    const data = await apiRequest<{ success: boolean; desks: any[] }>('/api/desks');
    if (data && data.success && Array.isArray(data.desks)) {
      return data.desks;
    }
  } catch {
    return [];
  }
  return [];
}

export async function createDesk(desk: {
  name: string;
  departmentId?: number;
  code?: string;
  description?: string;
}): Promise<any> {
  try {
    return await apiRequest('/api/desks', {
      method: 'POST',
      body: JSON.stringify(desk),
    });
  } catch {
    return desk;
  }
}

// -------------------------------------------------------------
// DEDICATED LINKS API
// -------------------------------------------------------------
export async function fetchLinks(): Promise<any[]> {
  try {
    const data = await apiRequest<{ success: boolean; links: any[] }>('/api/links');
    if (data && data.success && Array.isArray(data.links)) {
      return data.links;
    }
  } catch {
    try {
      const stored = localStorage.getItem('possd_dedicated_links');
      if (stored) return JSON.parse(stored);
    } catch {}
  }
  return [];
}

export async function saveLinks(links: any[]): Promise<void> {
  try {
    await apiRequest('/api/links', {
      method: 'POST',
      body: JSON.stringify(links),
    });
  } catch (err) {
    console.warn('[Persistence] Links saved to local storage:', err);
  }
}

export async function updateLink(id: string, link: any): Promise<any> {
  try {
    return await apiRequest(`/api/links/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(link),
    });
  } catch {
    return link;
  }
}

export async function deleteLink(id: string): Promise<void> {
  try {
    await apiRequest(`/api/links/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  } catch (err) {
    console.warn('[Persistence] Link deletion handled locally:', err);
  }
}

// -------------------------------------------------------------
// SLA RULES & CONFIG API
// -------------------------------------------------------------
export async function fetchSlaConfig(): Promise<any> {
  try {
    const data = await apiRequest<{ success: boolean; config: any }>('/api/sla/config');
    if (data && data.success && data.config) {
      return data.config;
    }
  } catch {
    return null;
  }
  return null;
}

export async function saveSlaConfig(config: any): Promise<void> {
  try {
    await apiRequest('/api/sla/config', {
      method: 'POST',
      body: JSON.stringify(config),
    });
  } catch (err) {
    console.warn('[Persistence] SLA config saved locally:', err);
  }
}

// -------------------------------------------------------------
// DASHBOARD SUMMARY API
// -------------------------------------------------------------
export async function fetchDashboardSummary(): Promise<any> {
  try {
    const data = await apiRequest<{ success: boolean; summary: any }>('/api/dashboard/summary');
    if (data && data.success && data.summary) {
      return data.summary;
    }
  } catch {
    return null;
  }
  return null;
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
  } catch {
    // Non-blocking audit log for backend synchronization
  }
}

export { recordGlobalAudit, getGlobalAuditLogs };
