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
