import { db } from '../src/db/index.ts';
import { slaRules } from '../src/db/schema.ts';
import * as dotenv from 'dotenv';
dotenv.config();

const DEFAULT_TIME_IN_DESK_CONFIG = {
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

async function seed() {
  console.log('Seeding SLA rules...');
  await db.delete(slaRules);
  
  const inserts = [];
  inserts.push({
    targetType: 'default',
    targetName: null,
    thresholdHours: DEFAULT_TIME_IN_DESK_CONFIG.defaultThresholdHours,
    highlightRowOnExceed: DEFAULT_TIME_IN_DESK_CONFIG.highlightRowOnExceed
  });
  
  for (const [div, hours] of Object.entries(DEFAULT_TIME_IN_DESK_CONFIG.divisionThresholds)) {
    inserts.push({
      targetType: 'division',
      targetName: div,
      thresholdHours: hours,
      highlightRowOnExceed: DEFAULT_TIME_IN_DESK_CONFIG.highlightRowOnExceed
    });
  }
  
  await db.insert(slaRules).values(inserts);
  console.log('SLA rules seeded successfully.');
  process.exit(0);
}
seed();
