-- ==============================================================================
-- MIGRATION 0003: DESKS TABLE, RELATIONAL FOREIGN KEYS, AND PERFORMANCE INDEXES
-- ==============================================================================

-- 1. DESKS TABLE (Physical/Logical Stations & Routing Desks)
CREATE TABLE IF NOT EXISTS desks (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
  code TEXT,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Seed initial standard desks if none exist
INSERT INTO desks (name, code, description)
VALUES 
  ('Central Records & Receiving Desk', 'RECV', 'Central entry point for all incoming and outgoing mail/documents'),
  ('Legal Review Desk', 'LEGAL', 'Legal & Regulatory Affairs document evaluation station'),
  ('Executive Office of the Manager', 'EXEC', 'Executive Director and Manager action desk'),
  ('Finance & Budget Desk', 'FIN', 'Accounting, budget evaluation and disbursement station'),
  ('Administrative & General Services Desk', 'ADMIN', 'HR and records maintenance desk'),
  ('Planning & Quality Assurance Desk', 'PLAN', 'Planning, compliance and quality standards station'),
  ('Operations Desk', 'OPS', 'Operations workflow and monitoring desk'),
  ('Information Technology Desk', 'IT', 'Systems and communications desk')
ON CONFLICT (name) DO NOTHING;

-- 2. ENHANCE DOCUMENTS TABLE WITH RELATIONAL FOREIGN KEYS
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'responsible_person_id') THEN
    ALTER TABLE documents ADD COLUMN responsible_person_id INTEGER REFERENCES personnel(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'current_custodian_id') THEN
    ALTER TABLE documents ADD COLUMN current_custodian_id INTEGER REFERENCES personnel(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'current_desk_id') THEN
    ALTER TABLE documents ADD COLUMN current_desk_id INTEGER REFERENCES desks(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 3. ENHANCE DOCUMENT MOVEMENTS WITH STABLE RELATIONAL FOREIGN KEYS
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'document_movements' AND column_name = 'actor_user_id') THEN
    ALTER TABLE document_movements ADD COLUMN actor_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'document_movements' AND column_name = 'from_desk_id') THEN
    ALTER TABLE document_movements ADD COLUMN from_desk_id INTEGER REFERENCES desks(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'document_movements' AND column_name = 'to_desk_id') THEN
    ALTER TABLE document_movements ADD COLUMN to_desk_id INTEGER REFERENCES desks(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 4. ENHANCE DOCUMENT REMARKS WITH RELATIONAL USER IDENTIFIER
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'document_remarks' AND column_name = 'supervisor_user_id') THEN
    ALTER TABLE document_remarks ADD COLUMN supervisor_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'document_remarks' AND column_name = 'supervisor_personnel_id') THEN
    ALTER TABLE document_remarks ADD COLUMN supervisor_personnel_id INTEGER REFERENCES personnel(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 5. ENHANCE MANAGER CLEARANCES WITH RELATIONAL USER IDENTIFIER
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'manager_clearances' AND column_name = 'cleared_by_user_id') THEN
    ALTER TABLE manager_clearances ADD COLUMN cleared_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'manager_clearances' AND column_name = 'cleared_by_personnel_id') THEN
    ALTER TABLE manager_clearances ADD COLUMN cleared_by_personnel_id INTEGER REFERENCES personnel(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 6. AUDIT LOGS COLUMN CONVERGENCE (ensure resource_id / entity_id and resource_type / entity_type)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'resource_type' AND is_nullable = 'NO') THEN
    ALTER TABLE audit_logs ALTER COLUMN resource_type DROP NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'resource_id' AND is_nullable = 'NO') THEN
    ALTER TABLE audit_logs ALTER COLUMN resource_id DROP NOT NULL;
  END IF;
END $$;

-- 7. PERFORMANCE INDEXES AS SPECIFIED BY APPLICATION REQUIREMENTS
CREATE INDEX IF NOT EXISTS idx_documents_tracking_number ON documents (tracking_number);
CREATE INDEX IF NOT EXISTS idx_documents_current_status ON documents (current_status);
CREATE INDEX IF NOT EXISTS idx_documents_target_division ON documents (target_division);
CREATE INDEX IF NOT EXISTS idx_documents_current_location ON documents (current_location);
CREATE INDEX IF NOT EXISTS idx_documents_current_custodian_id ON documents (current_custodian_id);
CREATE INDEX IF NOT EXISTS idx_documents_priority ON documents (priority);
CREATE INDEX IF NOT EXISTS idx_documents_updated_at ON documents (updated_at);

CREATE INDEX IF NOT EXISTS idx_movements_document_id ON document_movements (document_id);
CREATE INDEX IF NOT EXISTS idx_movements_timestamp ON document_movements (timestamp);

CREATE INDEX IF NOT EXISTS idx_remarks_document_id ON document_remarks (document_id);
CREATE INDEX IF NOT EXISTS idx_remarks_timestamp ON document_remarks (timestamp);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_id ON audit_logs (entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs (timestamp);
CREATE INDEX IF NOT EXISTS idx_desks_name ON desks (name);
