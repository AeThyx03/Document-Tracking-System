-- ==============================================================================
-- MIGRATION 0004: AUTHORITATIVE MANAGER CLEARANCES & PERSONNEL DATA INTEGRITY
-- ==============================================================================

-- 1. Correct manager_clearances semantic defaults
-- Documents must NOT be considered cleared merely because a record exists.
ALTER TABLE manager_clearances ALTER COLUMN is_cleared SET DEFAULT FALSE;
ALTER TABLE manager_clearances ALTER COLUMN cleared_by DROP NOT NULL;
ALTER TABLE manager_clearances ALTER COLUMN cleared_at DROP NOT NULL;
ALTER TABLE manager_clearances ALTER COLUMN cleared_at DROP DEFAULT;

-- Add updated_at column to manager_clearances if it does not exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'manager_clearances' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE manager_clearances ADD COLUMN updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW();
  END IF;
END $$;

-- 2. Resolve conflicting dual sources of truth:
-- Synchronize existing manager_clearances with documents table.
-- If document is NOT cleared, manager_clearances must NOT be marked cleared.
UPDATE manager_clearances mc
SET is_cleared = FALSE,
    cleared_by = NULL,
    cleared_at = NULL,
    updated_at = NOW()
FROM documents d
WHERE mc.document_id = d.id
  AND (d.is_cleared IS FALSE OR d.is_cleared IS NULL);

-- Ensure all documents currently marked cleared have a corresponding authoritative manager_clearances record
INSERT INTO manager_clearances (
  document_id,
  is_cleared,
  cleared_by,
  cleared_at,
  clearance_type,
  exit_tracking_number,
  forwarded_to_external,
  clearance_remarks,
  created_at,
  updated_at
)
SELECT 
  d.id,
  TRUE,
  COALESCE(d.cleared_by, 'Authorized Manager'),
  COALESCE(d.cleared_at, NOW()),
  d.clearance_type,
  d.exit_tracking_number,
  d.forwarded_to_external,
  d.clearance_remarks,
  NOW(),
  NOW()
FROM documents d
WHERE d.is_cleared = TRUE
  AND NOT EXISTS (SELECT 1 FROM manager_clearances mc WHERE mc.document_id = d.id);

-- 3. Add index on manager_clearances (document_id, is_cleared) for fast join & query
CREATE INDEX IF NOT EXISTS idx_manager_clearances_doc_cleared ON manager_clearances (document_id, is_cleared);
