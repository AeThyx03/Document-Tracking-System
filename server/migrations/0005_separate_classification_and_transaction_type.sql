-- ==============================================================================
-- MIGRATION 0005: SEPARATE DOCUMENT CLASSIFICATION FROM TRANSACTION TYPE
-- ==============================================================================

-- 1. Add document_classification and transaction_type columns if they do not exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'documents' AND column_name = 'document_classification'
  ) THEN
    ALTER TABLE documents ADD COLUMN document_classification TEXT DEFAULT 'Incoming';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'documents' AND column_name = 'transaction_type'
  ) THEN
    ALTER TABLE documents ADD COLUMN transaction_type TEXT DEFAULT 'Simple Transaction';
  END IF;
END $$;

-- 2. Backfill existing document rows to preserve existing data safely without destroying data
UPDATE documents
SET document_classification = COALESCE(direction, 'Incoming')
WHERE document_classification IS NULL;

UPDATE documents
SET transaction_type = COALESCE(document_type, 'Simple Transaction')
WHERE transaction_type IS NULL;

-- 3. Add indexes for document_classification and transaction_type for fast query performance
CREATE INDEX IF NOT EXISTS idx_docs_classification ON documents (document_classification);
CREATE INDEX IF NOT EXISTS idx_docs_transaction_type ON documents (transaction_type);
