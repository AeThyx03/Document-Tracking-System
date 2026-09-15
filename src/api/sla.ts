import { Router } from 'express';
import { db } from '../db/index.ts';
import { slaRules, businessHours } from '../db/schema.ts';
import { eq } from 'drizzle-orm';

export const slaApi = Router();

// Get SLA Configuration
slaApi.get('/config', async (req: any, res) => {
  try {
    const rules = await db.select().from(slaRules);
    
    // Transform DB format to frontend TimeInDeskConfig format
    const config = {
      defaultThresholdHours: 24,
      divisionThresholds: {} as Record<string, number>,
      highlightRowOnExceed: true
    };
    
    rules.forEach(r => {
      if (r.targetType === 'default') {
        config.defaultThresholdHours = r.thresholdHours;
        config.highlightRowOnExceed = r.highlightRowOnExceed !== null ? r.highlightRowOnExceed : true;
      } else if (r.targetType === 'division' && r.targetName) {
        config.divisionThresholds[r.targetName] = r.thresholdHours;
      }
    });

    res.json({ success: true, config });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update SLA Configuration
slaApi.post('/config', async (req: any, res) => {
  try {
    const { defaultThresholdHours, divisionThresholds, highlightRowOnExceed } = req.body;
    
    // Begin updating - for simplicity, clear all and re-insert
    await db.delete(slaRules);
    
    const inserts = [];
    
    inserts.push({
      targetType: 'default',
      targetName: null,
      thresholdHours: defaultThresholdHours || 24,
      highlightRowOnExceed: highlightRowOnExceed
    });
    
    for (const [div, hours] of Object.entries(divisionThresholds || {})) {
      inserts.push({
        targetType: 'division',
        targetName: div,
        thresholdHours: hours as number,
        highlightRowOnExceed: highlightRowOnExceed
      });
    }
    
    await db.insert(slaRules).values(inserts);
    
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
