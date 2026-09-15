import { db } from '../src/db/index.ts';
import { 
  documents, 
  documentMovements, 
  documentRemarks, 
  personnel, 
  departments, 
  slaRules,
  users 
} from '../src/db/schema.ts';
import * as dotenv from 'dotenv';
import { eq } from 'drizzle-orm';
import { INITIAL_DOCUMENTS, INITIAL_STAFF_MEMBERS } from '../src/mockData.ts';
import fetch from 'node-fetch';

dotenv.config();

const GOOGLE_APPS_SCRIPT_URL = process.env.GOOGLE_APPS_SCRIPT_URL;
const API_SECRET = process.env.API_SECRET;

async function fetchFromAppsScript(action: string) {
  if (!GOOGLE_APPS_SCRIPT_URL || !API_SECRET) {
    throw new Error("Missing GOOGLE_APPS_SCRIPT_URL or API_SECRET.");
  }
  const url = `${GOOGLE_APPS_SCRIPT_URL}?secret=${encodeURIComponent(API_SECRET)}&action=${encodeURIComponent(action)}`;
  const response = await fetch(url, { method: "GET", headers: { "Content-Type": "application/json" } });
  if (!response.ok) throw new Error(`Apps Script Error: ${response.statusText}`);
  return await response.json();
}

async function migrate() {
  console.log('--- STARTING PHASE 2 MIGRATION ---');
  
  let docsData = INITIAL_DOCUMENTS || [];
  let staffData = INITIAL_STAFF_MEMBERS || [];
  
  try {
    console.log('Attempting to fetch documents from Apps Script...');
    const docsRes: any = await fetchFromAppsScript("getDocuments");
    if (docsRes && docsRes.documents && docsRes.documents.length > 0) {
      docsData = docsRes.documents;
    }
  } catch (e: any) {
    console.log('Could not fetch docs from Apps Script (using local backup/mock data):', e.message);
  }

  try {
    console.log('Attempting to fetch personnel from Apps Script...');
    const staffRes: any = await fetchFromAppsScript("getStaff");
    if (staffRes && staffRes.staff && staffRes.staff.length > 0) {
      staffData = staffRes.staff;
    }
  } catch (e: any) {
    console.log('Could not fetch staff from Apps Script (using local backup/mock data):', e.message);
  }

  console.log(`Found ${docsData.length} documents.`);
  console.log(`Found ${staffData.length} personnel.`);

  let importedDocs = 0;
  let duplicateDocs = 0;
  let importedMovements = 0;
  let importedRemarks = 0;
  let importedPersonnel = 0;
  let invalidRecords = 0;
  
  try {
    // 2. Migrate Personnel
    console.log('Migrating Personnel...');
    for (const p of staffData) {
      if (!p.name || (!p.username && !p.email)) {
        invalidRecords++;
        continue;
      }
      const username = p.username || p.email?.split('@')[0] || p.name.replace(/\s+/g, '').toLowerCase();
      try {
        await db.insert(personnel).values({
          name: p.name,
          role: p.role || 'Staff',
          division: p.division || 'Unknown',
          avatarInitials: p.avatarInitials,
          email: p.email,
          assignedDesk: p.assignedDesk,
          username: username,
          status: p.status || 'active',
          firebaseUid: null
        }).onConflictDoNothing({ target: personnel.username });
        importedPersonnel++;
      } catch (err) {
        console.error(`Failed to import personnel: ${username}`, err);
        invalidRecords++;
      }
    }

    // 3. Migrate Departments
    console.log('Extracting and Migrating Departments...');
    const deptSet = new Set<string>();
    staffData.forEach((p: any) => p.division && deptSet.add(p.division));
    docsData.forEach((d: any) => {
      if (d.originDepartment) deptSet.add(d.originDepartment);
      if (d.targetDivision) deptSet.add(d.targetDivision);
    });
    
    for (const deptName of deptSet) {
      try {
        await db.insert(departments).values({ name: deptName }).onConflictDoNothing({ target: departments.name });
      } catch (err) { }
    }

    // 4. Migrate Documents
    console.log('Migrating Documents...');
    for (const d of docsData) {
      if (!d.trackingNumber || !d.title) {
        invalidRecords++;
        continue;
      }
      try {
        const existing = await db.select().from(documents).where(eq(documents.trackingNumber, d.trackingNumber));
        if (existing.length > 0) {
          duplicateDocs++;
          continue;
        }

        await db.insert(documents).values({
          id: d.id || `doc_${Date.now()}_${Math.random()}`,
          trackingNumber: d.trackingNumber,
          title: d.title,
          direction: d.direction,
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
        importedDocs++;

        // Migrate movements
        if (d.movements && d.movements.length > 0) {
          for (const m of d.movements) {
             await db.insert(documentMovements).values({
               id: m.id || `mov_${Date.now()}_${Math.random()}`,
               documentId: d.id,
               timestamp: new Date(m.timestamp || Date.now()),
               personnelName: m.personnelName || 'Unknown',
               personnelRole: m.personnelRole,
               currentDesk: m.currentDesk || 'Unknown',
               forwardToDesk: m.forwardToDesk || 'Unknown',
               statusUpdate: m.statusUpdate || 'forwarded',
               notes: m.notes
             });
             importedMovements++;
          }
        }

        // Migrate remarks
        if (d.supervisorRemarks && d.supervisorRemarks.length > 0) {
          for (const r of d.supervisorRemarks) {
            await db.insert(documentRemarks).values({
              id: r.id || `rem_${Date.now()}_${Math.random()}`,
              documentId: d.id,
              supervisorName: r.supervisorName || 'Unknown',
              timestamp: new Date(r.timestamp || Date.now()),
              remarkText: r.remarkText || 'None',
              complianceRequired: r.complianceRequired || false,
              complied: r.complied || false,
              complianceNotes: r.complianceNotes,
              compliedAt: r.compliedAt ? new Date(r.compliedAt) : null,
              compliedBy: r.compliedBy
            });
            importedRemarks++;
          }
        }

      } catch (err) {
        console.error(`Failed to import doc: ${d.trackingNumber}`, err);
        invalidRecords++;
      }
    }

    console.log('\n--- MIGRATION SUMMARY ---');
    console.log(`Documents found:       ${docsData.length}`);
    console.log(`Successfully imported: ${importedDocs}`);
    console.log(`Skipped (duplicates):  ${duplicateDocs}`);
    console.log(`Invalid records:       ${invalidRecords}`);
    console.log(`Personnel imported:    ${importedPersonnel}`);
    console.log(`Movements imported:    ${importedMovements}`);
    console.log(`Remarks imported:      ${importedRemarks}`);
    console.log('-------------------------\n');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
