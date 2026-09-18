import { db } from '../server/db';
import { documents, documentMovements, documentRemarks, managerClearances, auditLogs } from '../server/db/schema';

async function clearDocuments() {
  console.log('--- CLEANING DOCUMENT REGISTRY (AUTHORITATIVE) ---');
  try {
    // 1. Delete all audit logs
    console.log('Clearing Audit Logs...');
    await db.delete(auditLogs);
    
    // 2. Delete all remarks
    console.log('Clearing Remarks...');
    await db.delete(documentRemarks);
    
    // 3. Delete all movements
    console.log('Clearing Movements...');
    await db.delete(documentMovements);

    // 4. Delete all manager clearances
    console.log('Clearing Manager Clearances...');
    await db.delete(managerClearances);
    
    // 5. Delete all documents
    console.log('Clearing Documents...');
    await db.delete(documents);
    
    console.log('--- CLEANUP COMPLETE ---');
    process.exit(0);
  } catch (err) {
    console.error('Cleanup failed:', err);
    process.exit(1);
  }
}

clearDocuments();
