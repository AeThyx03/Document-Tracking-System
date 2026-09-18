import { eq } from 'drizzle-orm';
import { db } from '../db/index.ts';
import { slaRules, businessHours, holidays } from '../db/schema.ts';

export interface BusinessHoursEntry {
  dayOfWeek: number; // 0=Sun, 1=Mon, ..., 6=Sat
  isOpen: boolean;
  openTime: string; // "HH:MM"
  closeTime: string; // "HH:MM"
}

export interface HolidayEntry {
  date: string; // "YYYY-MM-DD"
  name: string;
  isWorkingDayOverride?: boolean;
  isHalfDay?: boolean;
}

export interface SlaWorkingConfig {
  defaultThresholdHours: number;
  divisionThresholds: Record<string, number>;
  highlightRowOnExceed: boolean;
  businessHours: BusinessHoursEntry[];
  holidays: HolidayEntry[];
}

export const MANILA_TIMEZONE = 'Asia/Manila';

/**
 * Loads current SLA rules, operating business hours, and holidays from PostgreSQL.
 */
export async function getAuthoritativeSlaConfig(): Promise<SlaWorkingConfig> {
  const rules = await db.select().from(slaRules);
  const hours = await db.select().from(businessHours);
  const hols = await db.select().from(holidays);

  const config: SlaWorkingConfig = {
    defaultThresholdHours: 24,
    divisionThresholds: {},
    highlightRowOnExceed: true,
    businessHours: hours.map((h) => ({
      dayOfWeek: h.dayOfWeek,
      isOpen: h.isOpen,
      openTime: h.openTime,
      closeTime: h.closeTime,
    })),
    holidays: hols.map((h) => ({
      date: h.date,
      name: h.name,
      isWorkingDayOverride: h.isWorkingDayOverride ?? false,
      isHalfDay: h.isHalfDay ?? false,
    })),
  };

  rules.forEach((r) => {
    if (r.targetType === 'default') {
      config.defaultThresholdHours = r.thresholdHours;
      config.highlightRowOnExceed = r.highlightRowOnExceed ?? true;
    } else if (r.targetType === 'division' && r.targetName) {
      config.divisionThresholds[r.targetName] = r.thresholdHours;
    }
  });

  return config;
}

/**
 * Helper to parse a Date in Asia/Manila timezone into { year, month, day, hour, minute, dayOfWeek }
 */
export function getManilaDateParts(date: Date) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: MANILA_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    weekday: 'short',
  });

  const parts = formatter.formatToParts(date);
  const map: Record<string, string> = {};
  parts.forEach((p) => {
    map[p.type] = p.value;
  });

  const year = parseInt(map.year, 10);
  const month = parseInt(map.month, 10); // 1-12
  const day = parseInt(map.day, 10);
  const hour = parseInt(map.hour === '24' ? '0' : map.hour, 10);
  const minute = parseInt(map.minute, 10);

  const dayOfWeekMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const dayOfWeek = dayOfWeekMap[map.weekday] ?? 0;
  const dateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  return { year, month, day, hour, minute, dayOfWeek, dateString };
}

/**
 * Converts a Manila local date string 'YYYY-MM-DD' and time 'HH:MM' into a standard UTC timestamp.
 * Manila is UTC+8 with no daylight saving time (consistent +08:00 offset).
 */
export function parseManilaTimeToUtc(dateStr: string, timeStr: string): number {
  return new Date(`${dateStr}T${timeStr}:00+08:00`).getTime();
}

/**
 * Calculates actual working-time dwell between two timestamps, strictly excluding:
 * 1. Non-working days (e.g. Weekends)
 * 2. Database-configured holidays (unless flagged with working day override)
 * 3. Non-business hours (e.g. before 08:00 or after 17:00)
 * Evaluated strictly in the Asia/Manila timezone.
 */
export function calculateWorkingMinutes(
  start: Date,
  end: Date = new Date(),
  config: SlaWorkingConfig
): { workingMinutes: number; workingHours: number } {
  const startMs = start.getTime();
  const endMs = end.getTime();

  if (isNaN(startMs) || isNaN(endMs) || startMs >= endMs) {
    return { workingMinutes: 0, workingHours: 0 };
  }

  const holidayMap = new Map<string, HolidayEntry>();
  config.holidays.forEach((h) => holidayMap.set(h.date, h));

  const hoursMap = new Map<number, BusinessHoursEntry>();
  config.businessHours.forEach((h) => hoursMap.set(h.dayOfWeek, h));

  let totalWorkingMinutes = 0;

  // Iterate day by day in Manila local calendar
  const startManila = getManilaDateParts(start);
  const endManila = getManilaDateParts(end);

  const startCalendarDate = new Date(`${startManila.dateString}T00:00:00+08:00`);
  const endCalendarDate = new Date(`${endManila.dateString}T00:00:00+08:00`);

  let currentCalendar = new Date(startCalendarDate.getTime());

  while (currentCalendar.getTime() <= endCalendarDate.getTime()) {
    const currentParts = getManilaDateParts(currentCalendar);
    const dateStr = currentParts.dateString;
    const dayOfWeek = currentParts.dayOfWeek;

    const holiday = holidayMap.get(dateStr);
    const isOverride = !!holiday && !!holiday.isWorkingDayOverride;
    const isFullHoliday = !!holiday && !holiday.isWorkingDayOverride && !holiday.isHalfDay;
    const isHalfDayHoliday = !!holiday && !holiday.isWorkingDayOverride && !!holiday.isHalfDay;

    const schedule = hoursMap.get(dayOfWeek);
    const isOpenDay = schedule ? schedule.isOpen : dayOfWeek >= 1 && dayOfWeek <= 5; // Default Mon-Fri open

    // A day is a working day if:
    // 1. It is explicitly set as a working day override (isOverride = true), OR
    // 2. It is a normally open operating day AND NOT a full holiday
    const isWorkingDay = isOverride || (isOpenDay && !isFullHoliday);

    if (isWorkingDay) {
      const openTime = schedule?.openTime || '08:00';
      const isHalfDay = isHalfDayHoliday || (isOverride && !!holiday?.isHalfDay);
      const closeTime = isHalfDay ? '12:00' : (schedule?.closeTime || '17:00');

      const windowStartMs = parseManilaTimeToUtc(dateStr, openTime);
      const windowEndMs = parseManilaTimeToUtc(dateStr, closeTime);

      // Overlap between [startMs, endMs] and [windowStartMs, windowEndMs]
      const effectiveStart = Math.max(startMs, windowStartMs);
      const effectiveEnd = Math.min(endMs, windowEndMs);

      if (effectiveStart < effectiveEnd) {
        const diffMinutes = Math.floor((effectiveEnd - effectiveStart) / (1000 * 60));
        totalWorkingMinutes += diffMinutes;
      }
    }

    // Advance 1 day
    currentCalendar = new Date(currentCalendar.getTime() + 24 * 60 * 60 * 1000);
  }

  const workingHours = Number((totalWorkingMinutes / 60).toFixed(2));
  return { workingMinutes: totalWorkingMinutes, workingHours };
}

/**
 * Determines whether a document has exceeded its configured SLA threshold in actual business hours.
 */
export function isDocumentOverdue(
  doc: {
    createdAt: Date | string;
    targetDivision: string;
    isCleared?: boolean | null;
    clearedAt?: Date | string | null;
    movements?: Array<{ timestamp: Date | string }>;
  },
  config: SlaWorkingConfig,
  referenceNow: Date = new Date()
): { isOverdue: boolean; thresholdHours: number; elapsedWorkingHours: number } {
  if (doc.isCleared) {
    return { isOverdue: false, thresholdHours: 0, elapsedWorkingHours: 0 };
  }

  // Determine threshold
  const threshold = config.divisionThresholds[doc.targetDivision] ?? config.defaultThresholdHours;

  // Determine dwell start time: latest movement or document receipt/creation
  let dwellStart = typeof doc.createdAt === 'string' ? new Date(doc.createdAt) : doc.createdAt;

  if (doc.movements && doc.movements.length > 0) {
    // Find newest movement deterministically by timestamp
    const sortedMovements = [...doc.movements].sort((a, b) => {
      const ta = new Date(a.timestamp).getTime();
      const tb = new Date(b.timestamp).getTime();
      return tb - ta;
    });
    const newest = sortedMovements[0];
    dwellStart = typeof newest.timestamp === 'string' ? new Date(newest.timestamp) : newest.timestamp;
  }

  const dwellEnd = doc.clearedAt ? (typeof doc.clearedAt === 'string' ? new Date(doc.clearedAt) : doc.clearedAt) : referenceNow;

  const { workingHours } = calculateWorkingMinutes(dwellStart, dwellEnd, config);

  return {
    isOverdue: workingHours > threshold,
    thresholdHours: threshold,
    elapsedWorkingHours: workingHours,
  };
}
