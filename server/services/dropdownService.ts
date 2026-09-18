import { eq, and, sql, asc } from 'drizzle-orm';
import { db } from '../db/index.ts';
import { dropdownOptions } from '../db/schema.ts';
import { createAuditLog } from './auditService.ts';

export const CANONICAL_DROPDOWN_CATEGORIES = [
  'document_classification',
  'transaction_type',
  'communication_type',
  'report_type',
  'originating_agency',
  'target_division',
  'priority_level',
  'handover_instructions',
] as const;

export type CanonicalDropdownCategory = typeof CANONICAL_DROPDOWN_CATEGORIES[number];

export interface CategoryMetadata {
  key: CanonicalDropdownCategory;
  name: string;
  description: string;
}

export const CATEGORY_METADATA: Record<CanonicalDropdownCategory, CategoryMetadata> = {
  document_classification: {
    key: 'document_classification',
    name: 'Document Classification',
    description: 'Incoming and Outgoing registry direction and transmittal mode.',
  },
  transaction_type: {
    key: 'transaction_type',
    name: 'Transaction Type',
    description: 'Transaction complexity category (Simple, Complex, Highly Technical).',
  },
  communication_type: {
    key: 'communication_type',
    name: 'Communication Type',
    description: 'Official correspondence and communication instrument formats.',
  },
  report_type: {
    key: 'report_type',
    name: 'Report / Document Type',
    description: 'Inspection, audit, compliance, and specialized report classifications.',
  },
  originating_agency: {
    key: 'originating_agency',
    name: 'Originating Dept / Agency',
    description: 'Originating external government agencies, entities, courts, or senders.',
  },
  target_division: {
    key: 'target_division',
    name: 'Forward To / Target Division',
    description: 'Internal operating sections, divisions, and target routing units.',
  },
  priority_level: {
    key: 'priority_level',
    name: 'Routing Priority Level',
    description: 'Document handling urgency and turnaround priority classification.',
  },
  handover_instructions: {
    key: 'handover_instructions',
    name: 'Remarks / Handover Instructions',
    description: 'Pre-defined instructions available when forwarding a document.',
  },
};

export interface DropdownOptionRecord {
  id: number;
  category: CanonicalDropdownCategory;
  value: string;
  label: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date | string | null;
}

/**
 * Normalizes input category strings or legacy aliases into canonical category identifiers.
 */
export function normalizeCategoryIdentifier(categoryInput: string | null | undefined): CanonicalDropdownCategory | null {
  if (!categoryInput) return null;
  const normalized = categoryInput.trim().toLowerCase().replace(/[-\s]/g, '_');

  switch (normalized) {
    case 'document_classification':
    case 'document_classifications':
    case 'documentclassifications':
    case 'documentclassification':
    case 'classification':
    case 'classifications':
    case 'direction':
    case 'directions':
      return 'document_classification';

    case 'transaction_type':
    case 'transaction_types':
    case 'transactiontype':
    case 'transactiontypes':
    case 'document_type':
    case 'document_types':
    case 'documenttype':
    case 'documenttypes':
      return 'transaction_type';

    case 'communication_type':
    case 'communication_types':
    case 'communicationtype':
    case 'communicationtypes':
    case 'comm_type':
    case 'comm_types':
      return 'communication_type';

    case 'report_type':
    case 'report_types':
    case 'reporttype':
    case 'reporttypes':
    case 'report_classification':
      return 'report_type';

    case 'originating_agency':
    case 'originating_agencies':
    case 'originatingagency':
    case 'originatingagencies':
    case 'origin_department':
    case 'origindepartments':
    case 'origin_departments':
    case 'origin_agencies':
    case 'origin_dept':
    case 'departments':
      return 'originating_agency';

    case 'target_division':
    case 'target_divisions':
    case 'targetdivision':
    case 'targetdivisions':
    case 'divisions':
    case 'forward_to':
    case 'forwardto':
      return 'target_division';

    case 'priority_level':
    case 'priority_levels':
    case 'prioritylevel':
    case 'prioritylevels':
    case 'priority':
    case 'priorities':
    case 'routing_priority':
      return 'priority_level';

    case 'handover_instructions':
    case 'handoverinstructions':
    case 'handover_instruction':
    case 'remarks':
    case 'remark':
      return 'handover_instructions';

    default:
      return null;
  }
}

/**
 * Formats a raw database row into a strictly typed DropdownOptionRecord.
 */
function formatOptionRow(row: any): DropdownOptionRecord {
  return {
    id: row.id,
    category: (normalizeCategoryIdentifier(row.category) || row.category) as CanonicalDropdownCategory,
    value: row.value,
    label: row.label || row.value,
    sortOrder: row.sortOrder ?? row.sort_order ?? 0,
    isActive: row.isActive ?? row.is_active ?? true,
    createdAt: row.createdAt ?? row.created_at ?? null,
  };
}

/**
 * Lists dropdown options from PostgreSQL.
 * Supports filtering by category and including or excluding inactive items.
 */
export async function listDropdownOptions(options: {
  category?: string;
  includeInactive?: boolean;
} = {}): Promise<DropdownOptionRecord[]> {
  const { category, includeInactive = false } = options;

  let query = db.select().from(dropdownOptions);

  const canonicalCategory = category ? normalizeCategoryIdentifier(category) : null;

  if (canonicalCategory && !includeInactive) {
    const rows = await db
      .select()
      .from(dropdownOptions)
      .where(and(eq(dropdownOptions.category, canonicalCategory), eq(dropdownOptions.isActive, true)))
      .orderBy(asc(dropdownOptions.sortOrder), asc(dropdownOptions.id));
    return rows.map(formatOptionRow);
  }

  if (canonicalCategory && includeInactive) {
    const rows = await db
      .select()
      .from(dropdownOptions)
      .where(eq(dropdownOptions.category, canonicalCategory))
      .orderBy(asc(dropdownOptions.sortOrder), asc(dropdownOptions.id));
    return rows.map(formatOptionRow);
  }

  if (!canonicalCategory && !includeInactive) {
    const rows = await db
      .select()
      .from(dropdownOptions)
      .where(eq(dropdownOptions.isActive, true))
      .orderBy(asc(dropdownOptions.category), asc(dropdownOptions.sortOrder), asc(dropdownOptions.id));
    return rows.map(formatOptionRow);
  }

  const rows = await db
    .select()
    .from(dropdownOptions)
    .orderBy(asc(dropdownOptions.category), asc(dropdownOptions.sortOrder), asc(dropdownOptions.id));
  return rows.map(formatOptionRow);
}

/**
 * Returns options grouped by canonical category.
 */
export async function getDropdownOptionsGrouped(options: { includeInactive?: boolean } = {}): Promise<Record<CanonicalDropdownCategory, DropdownOptionRecord[]>> {
  const all = await listDropdownOptions(options);
  const grouped: Record<CanonicalDropdownCategory, DropdownOptionRecord[]> = {
    document_classification: [],
    transaction_type: [],
    communication_type: [],
    report_type: [],
    originating_agency: [],
    target_division: [],
    priority_level: [],
    handover_instructions: [],
  };

  for (const item of all) {
    if (grouped[item.category]) {
      grouped[item.category].push(item);
    }
  }

  return grouped;
}

/**
 * Gets a single dropdown option by ID.
 */
export async function getDropdownOptionById(id: number): Promise<DropdownOptionRecord | null> {
  const rows = await db.select().from(dropdownOptions).where(eq(dropdownOptions.id, id));
  if (!rows || rows.length === 0) {
    return null;
  }
  return formatOptionRow(rows[0]);
}

/**
 * Creates a new dropdown option in PostgreSQL with duplicate active value protection.
 */
export async function createDropdownOption(
  data: {
    category: string;
    value: string;
    label?: string;
    sortOrder?: number;
    isActive?: boolean;
  },
  actor?: { id?: string | number; name?: string; email?: string; role?: string }
): Promise<DropdownOptionRecord> {
  const canonicalCategory = normalizeCategoryIdentifier(data.category);
  if (!canonicalCategory) {
    throw new Error(`Invalid category identifier: "${data.category}". Must be one of: ${CANONICAL_DROPDOWN_CATEGORIES.join(', ')}`);
  }

  const trimmedValue = data.value ? data.value.trim() : '';
  if (!trimmedValue) {
    throw new Error('Option value cannot be empty.');
  }

  const trimmedLabel = data.label && data.label.trim() ? data.label.trim() : trimmedValue;

  // Check for active duplicate in the same category
  const existingActive = await db
    .select()
    .from(dropdownOptions)
    .where(
      and(
        eq(dropdownOptions.category, canonicalCategory),
        eq(dropdownOptions.isActive, true),
        sql`LOWER(${dropdownOptions.value}) = LOWER(${trimmedValue})`
      )
    );

  if (existingActive.length > 0) {
    const error: any = new Error(`An active option with value "${trimmedValue}" already exists in category "${canonicalCategory}".`);
    error.code = 'DUPLICATE_OPTION';
    error.statusCode = 409;
    throw error;
  }

  // Calculate sort order if not explicitly specified
  let sortOrder = data.sortOrder;
  if (sortOrder === undefined || sortOrder === null) {
    const maxSort = await db
      .select({ maxOrder: sql<number>`COALESCE(MAX(${dropdownOptions.sortOrder}), 0)` })
      .from(dropdownOptions)
      .where(eq(dropdownOptions.category, canonicalCategory));
    sortOrder = (maxSort[0]?.maxOrder ?? 0) + 1;
  }

  const [inserted] = await db
    .insert(dropdownOptions)
    .values({
      category: canonicalCategory,
      value: trimmedValue,
      label: trimmedLabel,
      sortOrder: Number(sortOrder),
      isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
    })
    .returning();

  const formatted = formatOptionRow(inserted);

  await createAuditLog({
    userId: actor?.id ? String(actor.id) : null,
    action: 'DROPDOWN_OPTION_CREATED',
    entityType: 'dropdown_option',
    entityId: String(formatted.id),
    newValue: formatted,
    metadata: {
      category: canonicalCategory,
      value: trimmedValue,
      actorEmail: actor?.email,
      actorName: actor?.name,
      actorRole: actor?.role,
    },
  });

  return formatted;
}

/**
 * Updates an existing dropdown option with duplicate active value protection.
 */
export async function updateDropdownOption(
  id: number,
  data: {
    value?: string;
    label?: string;
    sortOrder?: number;
    isActive?: boolean;
  },
  actor?: { id?: string | number; name?: string; email?: string; role?: string }
): Promise<DropdownOptionRecord> {
  const current = await getDropdownOptionById(id);
  if (!current) {
    const error: any = new Error(`Dropdown option with ID ${id} not found.`);
    error.code = 'NOT_FOUND';
    error.statusCode = 404;
    throw error;
  }

  const updateFields: any = {};

  if (data.value !== undefined) {
    const trimmedVal = data.value.trim();
    if (!trimmedVal) {
      throw new Error('Option value cannot be empty.');
    }
    updateFields.value = trimmedVal;
  }

  if (data.label !== undefined) {
    updateFields.label = data.label.trim() || (updateFields.value ?? current.value);
  }

  if (data.sortOrder !== undefined) {
    updateFields.sortOrder = Number(data.sortOrder);
  }

  if (data.isActive !== undefined) {
    updateFields.isActive = Boolean(data.isActive);
  }

  const effectiveValue = updateFields.value ?? current.value;
  const effectiveActive = updateFields.isActive !== undefined ? updateFields.isActive : current.isActive;

  // If active, check for duplicates with other records in the same category
  if (effectiveActive) {
    const duplicate = await db
      .select()
      .from(dropdownOptions)
      .where(
        and(
          eq(dropdownOptions.category, current.category),
          eq(dropdownOptions.isActive, true),
          sql`LOWER(${dropdownOptions.value}) = LOWER(${effectiveValue})`,
          sql`${dropdownOptions.id} != ${id}`
        )
      );

    if (duplicate.length > 0) {
      const error: any = new Error(`An active option with value "${effectiveValue}" already exists in category "${current.category}".`);
      error.code = 'DUPLICATE_OPTION';
      error.statusCode = 409;
      throw error;
    }
  }

  const [updated] = await db
    .update(dropdownOptions)
    .set(updateFields)
    .where(eq(dropdownOptions.id, id))
    .returning();

  const formatted = formatOptionRow(updated);

  await createAuditLog({
    userId: actor?.id ? String(actor.id) : null,
    action: 'DROPDOWN_OPTION_UPDATED',
    entityType: 'dropdown_option',
    entityId: String(id),
    oldValue: current,
    newValue: formatted,
    metadata: {
      category: current.category,
      actorEmail: actor?.email,
      actorName: actor?.name,
      actorRole: actor?.role,
    },
  });

  return formatted;
}

/**
 * Reorders dropdown options within a category.
 */
export async function reorderDropdownOptions(
  items: { id: number; sortOrder: number }[],
  actor?: { id?: string | number; name?: string; email?: string; role?: string }
): Promise<DropdownOptionRecord[]> {
  const updatedItems: DropdownOptionRecord[] = [];

  for (const item of items) {
    const [updated] = await db
      .update(dropdownOptions)
      .set({ sortOrder: Number(item.sortOrder) })
      .where(eq(dropdownOptions.id, Number(item.id)))
      .returning();
    if (updated) {
      updatedItems.push(formatOptionRow(updated));
    }
  }

  await createAuditLog({
    userId: actor?.id ? String(actor.id) : null,
    action: 'DROPDOWN_OPTIONS_REORDERED',
    entityType: 'dropdown_option',
    metadata: {
      itemCount: items.length,
      actorEmail: actor?.email,
      actorName: actor?.name,
      actorRole: actor?.role,
    },
  });

  return updatedItems;
}

/**
 * Deactivates a dropdown option (Soft Delete).
 * CRITICAL: Physical deletion is strictly prevented to guarantee historical integrity for documents referencing this option.
 */
export async function deactivateDropdownOption(
  id: number,
  actor?: { id?: string | number; name?: string; email?: string; role?: string }
): Promise<DropdownOptionRecord> {
  const current = await getDropdownOptionById(id);
  if (!current) {
    const error: any = new Error(`Dropdown option with ID ${id} not found.`);
    error.code = 'NOT_FOUND';
    error.statusCode = 404;
    throw error;
  }

  const [deactivated] = await db
    .update(dropdownOptions)
    .set({ isActive: false })
    .where(eq(dropdownOptions.id, id))
    .returning();

  const formatted = formatOptionRow(deactivated);

  await createAuditLog({
    userId: actor?.id ? String(actor.id) : null,
    action: 'DROPDOWN_OPTION_DEACTIVATED',
    entityType: 'dropdown_option',
    entityId: String(id),
    oldValue: current,
    newValue: formatted,
    metadata: {
      category: current.category,
      value: current.value,
      actorEmail: actor?.email,
      actorName: actor?.name,
      actorRole: actor?.role,
    },
  });

  return formatted;
}

/**
 * Restores/Reactivates a previously deactivated dropdown option.
 */
export async function restoreDropdownOption(
  id: number,
  actor?: { id?: string | number; name?: string; email?: string; role?: string }
): Promise<DropdownOptionRecord> {
  const current = await getDropdownOptionById(id);
  if (!current) {
    const error: any = new Error(`Dropdown option with ID ${id} not found.`);
    error.code = 'NOT_FOUND';
    error.statusCode = 404;
    throw error;
  }

  // Check if an active duplicate already exists before restoring
  const duplicate = await db
    .select()
    .from(dropdownOptions)
    .where(
      and(
        eq(dropdownOptions.category, current.category),
        eq(dropdownOptions.isActive, true),
        sql`LOWER(${dropdownOptions.value}) = LOWER(${current.value})`,
        sql`${dropdownOptions.id} != ${id}`
      )
    );

  if (duplicate.length > 0) {
    const error: any = new Error(`Cannot restore option: An active option with value "${current.value}" already exists in category "${current.category}".`);
    error.code = 'DUPLICATE_OPTION';
    error.statusCode = 409;
    throw error;
  }

  const [restored] = await db
    .update(dropdownOptions)
    .set({ isActive: true })
    .where(eq(dropdownOptions.id, id))
    .returning();

  const formatted = formatOptionRow(restored);

  await createAuditLog({
    userId: actor?.id ? String(actor.id) : null,
    action: 'DROPDOWN_OPTION_RESTORED',
    entityType: 'dropdown_option',
    entityId: String(id),
    oldValue: current,
    newValue: formatted,
    metadata: {
      category: current.category,
      value: current.value,
      actorEmail: actor?.email,
      actorName: actor?.name,
      actorRole: actor?.role,
    },
  });

  return formatted;
}
