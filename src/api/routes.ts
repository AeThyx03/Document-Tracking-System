import { Router } from 'express';
import { db } from '../db/index.ts';
import { documents, documentMovements, documentRemarks, personnel, auditLogs } from '../db/schema.ts';
import { eq } from 'drizzle-orm';

export const possdApi = Router();

// Get all documents
possdApi.get('/documents', async (req: any, res) => {
  try {
    const allDocs = await db.query.documents.findMany({
      with: {
        movements: true,
        remarks: true
      }
    });
    
    // Map to old JSON format for seamless frontend integration
    const mappedDocs = allDocs.map(d => ({
      ...d,
      supervisorRemarks: d.remarks,
      managerClearance: {
        isCleared: d.isCleared,
        clearedBy: d.clearedBy,
        clearedAt: d.clearedAt,
        clearanceType: d.clearanceType,
        clearanceRemarks: d.clearanceRemarks
      }
    }));
    
    res.json({ success: true, documents: mappedDocs });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Save documents or single action
possdApi.post('/documents', async (req: any, res) => {
  try {
    if (req.body.documents && Array.isArray(req.body.documents)) {
      // Bulk sync from frontend
      const docsData = req.body.documents;
      let imported = 0;
      for (const d of docsData) {
        if (!d.trackingNumber || !d.title) continue;
        const existing = await db.select().from(documents).where(eq(documents.trackingNumber, d.trackingNumber));
        if (existing.length > 0) {
           await db.update(documents).set({
             title: d.title,
             currentStatus: d.currentStatus,
             currentLocation: d.currentLocation,
             currentCustodian: d.currentCustodian,
             updatedAt: new Date(d.updatedAt || Date.now())
           }).where(eq(documents.trackingNumber, d.trackingNumber));
        } else {
           await db.insert(documents).values({
             id: d.id || `doc_${Date.now()}_${Math.random()}`,
             trackingNumber: d.trackingNumber,
             title: d.title,
             direction: d.direction || 'Incoming',
             documentType: d.documentType || 'Unknown',
             communicationType: d.communicationType || 'Unknown',
             reportType: d.reportType || 'Unknown',
             originDepartment: d.originDepartment || 'Unknown',
             dateReceived: d.dateReceived || new Date().toISOString().split('T')[0],
             timeReceived: d.timeReceived || '00:00:00',
             targetDivision: d.targetDivision || 'Unknown',
             responsiblePerson: d.responsiblePerson || 'Unknown',
             priority: d.priority || 'Routine',
             currentStatus: d.currentStatus || 'Unknown',
             currentLocation: d.currentLocation || 'Unknown',
             currentCustodian: d.currentCustodian || 'Unknown',
             fileLink: d.fileLink,
             isCleared: d.managerClearance?.isCleared || false,
             clearedBy: d.managerClearance?.clearedBy,
             clearedAt: d.managerClearance?.clearedAt ? new Date(d.managerClearance.clearedAt) : null,
             clearanceType: d.managerClearance?.clearanceType,
             clearanceRemarks: d.managerClearance?.clearanceRemarks,
             createdAt: new Date(d.createdAt || Date.now()),
             updatedAt: new Date(d.updatedAt || Date.now()),
           });
        }
        imported++;
      }
      return res.json({ success: true, count: imported });
    }

    const { action, payload } = req.body;
    if (action === 'saveDocument') {
      const doc = payload;
      const existing = await db.select().from(documents).where(eq(documents.trackingNumber, doc.trackingNumber));
      if (existing.length > 0) {
        await db.update(documents).set({
          title: doc.title,
          currentStatus: doc.currentStatus,
          currentLocation: doc.currentLocation,
          currentCustodian: doc.currentCustodian,
          updatedAt: new Date()
        }).where(eq(documents.trackingNumber, doc.trackingNumber));
      } else {
        // insert
        await db.insert(documents).values({
          id: doc.id || `doc_${Date.now()}`,
          trackingNumber: doc.trackingNumber,
          title: doc.title,
          direction: doc.direction || 'Incoming',
          documentType: doc.documentType || 'Unknown',
          communicationType: doc.communicationType || 'Unknown',
          reportType: doc.reportType || 'Unknown',
          originDepartment: doc.originDepartment || 'Unknown',
          dateReceived: doc.dateReceived || new Date().toISOString().split('T')[0],
          timeReceived: doc.timeReceived || '00:00:00',
          targetDivision: doc.targetDivision || 'Unknown',
          responsiblePerson: doc.responsiblePerson || 'Unknown',
          priority: doc.priority || 'Routine',
          currentStatus: doc.currentStatus || 'Unknown',
          currentLocation: doc.currentLocation || 'Unknown',
          currentCustodian: doc.currentCustodian || 'Unknown',
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
      return res.json({ success: true });
    }
    
    res.json({ success: true, warning: 'Action not implemented yet in new API' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get staff
possdApi.get('/staff', async (req: any, res) => {
  try {
    const staff = await db.select().from(personnel);
    res.json({ success: true, staff });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

possdApi.post('/staff', async (req: any, res) => {
  try {
    if (req.body.staff && Array.isArray(req.body.staff)) {
       const staffData = req.body.staff;
       for (const p of staffData) {
          if (!p.name) continue;
          const username = p.username || p.email?.split('@')[0] || p.name.replace(/\s+/g, '').toLowerCase();
          await db.insert(personnel).values({
            name: p.name,
            role: p.role || 'Staff',
            division: p.division || 'Unknown',
            avatarInitials: p.avatarInitials,
            email: p.email,
            assignedDesk: p.assignedDesk,
            username: username,
            status: p.status || 'active',
          }).onConflictDoUpdate({ 
             target: personnel.username, 
             set: { role: p.role, division: p.division, assignedDesk: p.assignedDesk }
          });
       }
       return res.json({ success: true });
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
