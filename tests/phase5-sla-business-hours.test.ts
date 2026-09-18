import assert from 'node:assert/strict';
import {
  calculateWorkingMinutes,
  isDocumentOverdue,
  parseManilaTimeToUtc,
  SlaWorkingConfig,
  getAuthoritativeSlaConfig,
} from '../server/services/slaService.ts';

console.log('--- POSSD Phase 5: SLA and Business-Hours Unit & Integration Tests ---');

let passedTests = 0;
function pass(message: string) {
  console.log(`✅ PASS: ${message}`);
  passedTests++;
}

// Baseline mock configuration for testing calculations in Asia/Manila timezone
const defaultBusinessHours = [
  { dayOfWeek: 0, isOpen: false, openTime: '08:00', closeTime: '17:00' }, // Sun
  { dayOfWeek: 1, isOpen: true, openTime: '08:00', closeTime: '17:00' },  // Mon
  { dayOfWeek: 2, isOpen: true, openTime: '08:00', closeTime: '17:00' },  // Tue
  { dayOfWeek: 3, isOpen: true, openTime: '08:00', closeTime: '17:00' },  // Wed
  { dayOfWeek: 4, isOpen: true, openTime: '08:00', closeTime: '17:00' },  // Thu
  { dayOfWeek: 5, isOpen: true, openTime: '08:00', closeTime: '17:00' },  // Fri
  { dayOfWeek: 6, isOpen: false, openTime: '08:00', closeTime: '17:00' }, // Sat
];

const mockConfig: SlaWorkingConfig = {
  defaultThresholdHours: 24,
  divisionThresholds: {
    'Finance & Budget Division': 24,
    'Operations & Emergency Management': 8,
  },
  highlightRowOnExceed: true,
  businessHours: defaultBusinessHours,
  holidays: [],
};

// ---------------------------------------------------------------------------
// TEST 1: Normal Working Day Calculation
// ---------------------------------------------------------------------------
// Tuesday 2026-09-15 08:00 Manila to 17:00 Manila = 9 working hours (540 mins)
const tueStart = new Date('2026-09-15T08:00:00+08:00');
const tueEnd = new Date('2026-09-15T17:00:00+08:00');

const resNormal = calculateWorkingMinutes(tueStart, tueEnd, mockConfig);
assert.strictEqual(resNormal.workingMinutes, 540, 'Normal day 08:00-17:00 must equal 540 minutes');
assert.strictEqual(resNormal.workingHours, 9, 'Normal day 08:00-17:00 must equal 9 hours');
pass('1. Normal working day calculation (08:00 - 17:00 = 9 hours)');

// ---------------------------------------------------------------------------
// TEST 2: Weekend Handling (Saturday & Sunday Closed)
// ---------------------------------------------------------------------------
// Saturday 2026-09-19 08:00 Manila to Sunday 2026-09-20 17:00 Manila
const satStart = new Date('2026-09-19T08:00:00+08:00');
const sunEnd = new Date('2026-09-20T17:00:00+08:00');

const resWeekend = calculateWorkingMinutes(satStart, sunEnd, mockConfig);
assert.strictEqual(resWeekend.workingMinutes, 0, 'Weekend without override must yield 0 working minutes');
assert.strictEqual(resWeekend.workingHours, 0, 'Weekend without override must yield 0 working hours');
pass('2. Weekend handling (Saturday & Sunday without override = 0 working hours)');

// ---------------------------------------------------------------------------
// TEST 3: Full Holiday Handling
// ---------------------------------------------------------------------------
// Wednesday 2026-09-16 set as a full holiday
const holidayConfig: SlaWorkingConfig = {
  ...mockConfig,
  holidays: [
    { date: '2026-09-16', name: 'Special Non-Working Holiday', isWorkingDayOverride: false, isHalfDay: false },
  ],
};

const wedStart = new Date('2026-09-16T08:00:00+08:00');
const wedEnd = new Date('2026-09-16T17:00:00+08:00');

const resHoliday = calculateWorkingMinutes(wedStart, wedEnd, holidayConfig);
assert.strictEqual(resHoliday.workingMinutes, 0, 'Full holiday must yield 0 working minutes');
assert.strictEqual(resHoliday.workingHours, 0, 'Full holiday must yield 0 working hours');
pass('3. Full holiday handling (08:00 - 17:00 on full holiday = 0 working hours)');

// ---------------------------------------------------------------------------
// TEST 4: Half-Day Holiday Handling (Midday 12:00 Cutoff)
// ---------------------------------------------------------------------------
// Wednesday 2026-09-16 set as a half-day holiday (08:00 to 12:00)
const halfDayConfig: SlaWorkingConfig = {
  ...mockConfig,
  holidays: [
    { date: '2026-09-16', name: 'Special Half-Day Holiday', isWorkingDayOverride: false, isHalfDay: true },
  ],
};

const resHalfDay = calculateWorkingMinutes(wedStart, wedEnd, halfDayConfig);
assert.strictEqual(resHalfDay.workingMinutes, 240, 'Half-day holiday must cut off at 12:00 (240 mins)');
assert.strictEqual(resHalfDay.workingHours, 4, 'Half-day holiday must equal 4 working hours');
pass('4. Half-day holiday handling (08:00 - 17:00 window cuts off at 12:00 = 4 working hours)');

// ---------------------------------------------------------------------------
// TEST 5: Working-Day Override (Including Weekends)
// ---------------------------------------------------------------------------
// Saturday 2026-09-19 flagged with isWorkingDayOverride: true
const weekendOverrideConfig: SlaWorkingConfig = {
  ...mockConfig,
  holidays: [
    { date: '2026-09-19', name: 'Special Saturday Working Day', isWorkingDayOverride: true, isHalfDay: false },
  ],
};

const resOverride = calculateWorkingMinutes(satStart, new Date('2026-09-19T17:00:00+08:00'), weekendOverrideConfig);
assert.strictEqual(resOverride.workingMinutes, 540, 'Weekend working-day override must count as a full working day (540 mins)');
assert.strictEqual(resOverride.workingHours, 9, 'Weekend working-day override must equal 9 working hours');
pass('5. Working-day override on weekend (Saturday override = 9 working hours)');

// Weekend half-day override
const weekendHalfDayOverrideConfig: SlaWorkingConfig = {
  ...mockConfig,
  holidays: [
    { date: '2026-09-19', name: 'Special Saturday Half-Day Working Day', isWorkingDayOverride: true, isHalfDay: true },
  ],
};

const resWeekendHalfOverride = calculateWorkingMinutes(satStart, new Date('2026-09-19T17:00:00+08:00'), weekendHalfDayOverrideConfig);
assert.strictEqual(resWeekendHalfOverride.workingMinutes, 240, 'Weekend half-day override must cut off at 12:00 (240 mins)');
assert.strictEqual(resWeekendHalfOverride.workingHours, 4, 'Weekend half-day override must equal 4 working hours');
pass('5b. Half-day working-day override on weekend (Saturday half-day override = 4 working hours)');

// ---------------------------------------------------------------------------
// TEST 6: SLA Boundary Conditions & Overdue Evaluation
// ---------------------------------------------------------------------------
// 6a: Start >= End
const resBoundaryStartAfterEnd = calculateWorkingMinutes(tueEnd, tueStart, mockConfig);
assert.strictEqual(resBoundaryStartAfterEnd.workingMinutes, 0, 'Start >= End must return 0 minutes');

// 6b: Start before office hours (07:00 Manila)
const beforeOfficeStart = new Date('2026-09-15T07:00:00+08:00');
const resBeforeOffice = calculateWorkingMinutes(beforeOfficeStart, tueEnd, mockConfig);
assert.strictEqual(resBeforeOffice.workingHours, 9, 'Start before 08:00 must be bounded to 08:00 (9 hours)');

// 6c: End after office hours (18:00 Manila)
const afterOfficeEnd = new Date('2026-09-15T18:00:00+08:00');
const resAfterOffice = calculateWorkingMinutes(tueStart, afterOfficeEnd, mockConfig);
assert.strictEqual(resAfterOffice.workingHours, 9, 'End after 17:00 must be bounded to 17:00 (9 hours)');

// 6d: isDocumentOverdue threshold exact vs exceeding
const mockDoc = {
  createdAt: '2026-09-15T08:00:00+08:00',
  targetDivision: 'Finance & Budget Division', // 24 hour threshold
};

// Exactly 24 working hours elapsed (Mon, Tue, Wed 8h each or 3 full 9-hour days = 27 hours)
// Let's create exact elapsed times:
// Tuesday 08:00 to Thursday 14:00 = 9h Tue + 9h Wed + 6h Thu = 24.00 working hours
const exact24Hours = new Date('2026-09-17T14:00:00+08:00');
const resExact24 = isDocumentOverdue(mockDoc, mockConfig, exact24Hours);
assert.strictEqual(resExact24.elapsedWorkingHours, 24, 'Elapsed time must equal exactly 24.00 working hours');
assert.strictEqual(resExact24.isOverdue, false, 'Exact threshold match (24.00 / 24.00) must NOT be overdue');

// 24.02 working hours elapsed (Thursday 14:01 Manila = 24.02 hours)
const over24Hours = new Date('2026-09-17T14:01:00+08:00');
const resOver24 = isDocumentOverdue(mockDoc, mockConfig, over24Hours);
assert.strictEqual(resOver24.isOverdue, true, 'Exceeding threshold (24.02 / 24.00) MUST evaluate to overdue');
pass('6. SLA boundary conditions (Start>=End, before/after office bounds, exact vs exceeding threshold)');

// ---------------------------------------------------------------------------
// TEST 7: Configured Business Hours
// ---------------------------------------------------------------------------
// Custom business hours: Wednesday openTime '09:00', closeTime '18:00' (9 hours total)
const customHoursConfig: SlaWorkingConfig = {
  ...mockConfig,
  businessHours: [
    ...defaultBusinessHours.filter((h) => h.dayOfWeek !== 3),
    { dayOfWeek: 3, isOpen: true, openTime: '09:00', closeTime: '18:00' },
  ],
};

const wedCustomStart = new Date('2026-09-16T08:00:00+08:00');
const wedCustomEnd = new Date('2026-09-16T18:00:00+08:00');

const resCustom = calculateWorkingMinutes(wedCustomStart, wedCustomEnd, customHoursConfig);
assert.strictEqual(resCustom.workingMinutes, 540, 'Custom business hours 09:00-18:00 must equal 540 minutes');
assert.strictEqual(resCustom.workingHours, 9, 'Custom business hours 09:00-18:00 must equal 9 hours');
pass('7. Configured business hours (Custom Wednesday 09:00 - 18:00 schedule respected)');

// ---------------------------------------------------------------------------
// TEST 8: Multi-Day Spanning Calculation Across Weekend
// ---------------------------------------------------------------------------
// Friday 2026-09-18 14:00 Manila to Tuesday 2026-09-22 11:00 Manila
// Fri: 14:00 - 17:00 = 3 hrs (180 mins)
// Sat: 0 hrs
// Sun: 0 hrs
// Mon: 08:00 - 17:00 = 9 hrs (540 mins)
// Tue: 08:00 - 11:00 = 3 hrs (180 mins)
// Total = 15 hours (900 mins)
const friStart = new Date('2026-09-18T14:00:00+08:00');
const tueMultiEnd = new Date('2026-09-22T11:00:00+08:00');

const resMultiDay = calculateWorkingMinutes(friStart, tueMultiEnd, mockConfig);
assert.strictEqual(resMultiDay.workingMinutes, 900, 'Multi-day calculation across weekend must equal 900 minutes');
assert.strictEqual(resMultiDay.workingHours, 15, 'Multi-day calculation across weekend must equal 15 working hours');
pass('8. Multi-day calculation spanning weekend (Fri 14:00 to Tue 11:00 = 15 working hours)');

console.log(`\nPhase 5 SLA & Business Hours Test Summary: ${passedTests} passed, 0 failed.`);
