import { sql, eq } from 'drizzle-orm';
import { db } from '../db/index.ts';
import { documents, documentRemarks, documentMovements } from '../db/schema.ts';
import { getAuthoritativeSlaConfig, isDocumentOverdue } from './slaService.ts';

export interface DashboardSummary {
  totalDocuments: number;
  activeDocuments: number;
  pendingCompliance: number;
  clearedDocuments: number;
  overdueDocuments: number;
  byPriority: Record<string, number>;
  byStatus: Record<string, number>;
  byDivision: Record<string, number>;
  generatedAt: string;
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  // 1. Total documents count
  const [totalRes] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(documents);
  const totalDocuments = totalRes?.count || 0;

  // 2. Cleared documents count
  const [clearedRes] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(documents)
    .where(eq(documents.isCleared, true));
  const clearedDocuments = clearedRes?.count || 0;

  // 3. Active documents count
  const activeDocuments = Math.max(0, totalDocuments - clearedDocuments);

  // 4. Pending compliance supervisor remarks count
  const [complianceRes] = await db
    .select({ count: sql<number>`count(distinct ${documentRemarks.documentId})::int` })
    .from(documentRemarks)
    .where(
      sql`${documentRemarks.complianceRequired} = true AND ${documentRemarks.complied} = false`
    );
  const pendingCompliance = complianceRes?.count || 0;

  // 5. Aggregate breakdown by Priority
  const priorityRows = await db
    .select({
      priority: documents.priority,
      count: sql<number>`count(*)::int`,
    })
    .from(documents)
    .groupBy(documents.priority);

  const byPriority: Record<string, number> = {};
  priorityRows.forEach((r) => {
    byPriority[r.priority || 'Routine'] = r.count;
  });

  // 6. Aggregate breakdown by Status
  const statusRows = await db
    .select({
      status: documents.currentStatus,
      count: sql<number>`count(*)::int`,
    })
    .from(documents)
    .groupBy(documents.currentStatus);

  const byStatus: Record<string, number> = {};
  statusRows.forEach((r) => {
    byStatus[r.status || 'Received'] = r.count;
  });

  // 7. Aggregate breakdown by Division
  const divisionRows = await db
    .select({
      division: documents.targetDivision,
      count: sql<number>`count(*)::int`,
    })
    .from(documents)
    .groupBy(documents.targetDivision);

  const byDivision: Record<string, number> = {};
  divisionRows.forEach((r) => {
    byDivision[r.division || 'Unassigned'] = r.count;
  });

  // 8. Calculate Overdue Documents using Authoritative SLA & Working Hours
  let overdueDocuments = 0;
  const slaConfig = await getAuthoritativeSlaConfig();

  // Fetch active documents with their movements for SLA analysis
  const activeDocs = await db.query.documents.findMany({
    where: eq(documents.isCleared, false),
    columns: {
      id: true,
      createdAt: true,
      targetDivision: true,
      isCleared: true,
      clearedAt: true,
    },
    with: {
      movements: {
        columns: {
          timestamp: true,
        },
        orderBy: (m, { desc }) => [desc(m.timestamp)],
      },
    },
  });

  const now = new Date();
  for (const doc of activeDocs) {
    const { isOverdue } = isDocumentOverdue(doc, slaConfig, now);
    if (isOverdue) {
      overdueDocuments++;
    }
  }

  return {
    totalDocuments,
    activeDocuments,
    pendingCompliance,
    clearedDocuments,
    overdueDocuments,
    byPriority,
    byStatus,
    byDivision,
    generatedAt: now.toISOString(),
  };
}
