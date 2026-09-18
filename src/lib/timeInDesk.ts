import { DocumentItem, TimeInDeskConfig, DocumentTimeMetrics, getLatestMovement, parsePhilippineDateToISO } from '../types';

export const TIME_IN_DESK_CONFIG_KEY = 'doc_tracker_time_in_desk_config';

/**
 * Standard institutional turnaround SLA targets by priority classification.
 */
export const PRIORITY_SLA_HOURS: Record<'Rush' | 'Urgent' | 'Routine', number> = {
  Rush: 4,
  Urgent: 8,
  Routine: 24,
};

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
 * Returns current timestamp (UTC/server-synchronized).
 * Removed simulated reference clock baseline to ensure production temporal accuracy.
 */
export function getReferenceNow(): number {
  return Date.now();
}

function safeGetToken(): string {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem('possd_access_token') || '';
    }
  } catch {}
  return '';
}

export async function fetchTimeInDeskConfigFromBackend(): Promise<TimeInDeskConfig> {
  try {
    const token = safeGetToken();
    const res = await fetch('/api/sla/config', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    const data = await res.json();
    if (data.success && data.config) {
      const merged: TimeInDeskConfig = {
        ...DEFAULT_TIME_IN_DESK_CONFIG,
        ...data.config,
        divisionThresholds: {
          ...DEFAULT_TIME_IN_DESK_CONFIG.divisionThresholds,
          ...(data.config.divisionThresholds || {})
        }
      };
      saveTimeInDeskConfig(merged);
      return merged;
    }
  } catch (err) {
    console.error('Failed to fetch SLA config from backend:', err);
  }
  return getTimeInDeskConfig(); // Fallback to local
}

export function getTimeInDeskConfig(): TimeInDeskConfig {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(TIME_IN_DESK_CONFIG_KEY);
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
    }
  } catch (err) {
    console.error('Failed to parse time-in-desk config:', err);
  }
  return DEFAULT_TIME_IN_DESK_CONFIG;
}

export async function saveTimeInDeskConfigToBackend(config: TimeInDeskConfig): Promise<void> {
  try {
    const token = safeGetToken();
    const res = await fetch('/api/sla/config', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify(config)
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || `Server error (status ${res.status})`);
    }
  } catch (err) {
    console.error('Failed to save SLA config to backend:', err);
    throw err;
  }
}

export function saveTimeInDeskConfig(config: TimeInDeskConfig): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(TIME_IN_DESK_CONFIG_KEY, JSON.stringify(config));
    }
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
    arrivalTimestamp = parsePhilippineDateToISO(doc.dateReceived, doc.timeReceived);
  }

  // Authoritative latest movement determined by chronological sorting (Requirement 14)
  const latestMovement = doc.movements && doc.movements.length > 0 ? getLatestMovement(doc) : null;

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
