-- =============================================================
-- Migration 0001: Initial Normalized POSSD Database Schema
-- Safe, repeatable, non-destructive migration
-- =============================================================

-- 1. Users table (Authentication accounts)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  uid TEXT UNIQUE,
  email TEXT NOT NULL UNIQUE,
  username TEXT UNIQUE,
  password_hash TEXT,
  role TEXT NOT NULL DEFAULT 'Staff',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'username') THEN
    ALTER TABLE users ADD COLUMN username TEXT UNIQUE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'password_hash') THEN
    ALTER TABLE users ADD COLUMN password_hash TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'role') THEN
    ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'Staff';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'is_active') THEN
    ALTER TABLE users ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'updated_at') THEN
    ALTER TABLE users ADD COLUMN updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW();
  END IF;
END $$;

-- 2. Personnel table (Staff profiles)
CREATE TABLE IF NOT EXISTS personnel (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  division TEXT NOT NULL,
  avatar_initials TEXT,
  email TEXT UNIQUE,
  assigned_desk TEXT,
  username TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'active',
  last_login TIMESTAMP WITHOUT TIME ZONE,
  firebase_uid TEXT,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'personnel' AND column_name = 'user_id') THEN
    ALTER TABLE personnel ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'personnel' AND column_name = 'updated_at') THEN
    ALTER TABLE personnel ADD COLUMN updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW();
  END IF;
END $$;

-- 3. Departments table
CREATE TABLE IF NOT EXISTS departments (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  code TEXT,
  description TEXT,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'departments' AND column_name = 'code') THEN
    ALTER TABLE departments ADD COLUMN code TEXT;
  END IF;
END $$;

-- 4. Documents table (Master Authoritative Registry with Optimistic Concurrency)
CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  tracking_number TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  direction TEXT DEFAULT 'Incoming',
  document_type TEXT NOT NULL,
  communication_type TEXT NOT NULL,
  report_type TEXT NOT NULL,
  origin_department TEXT NOT NULL,
  date_received TEXT NOT NULL,
  time_received TEXT NOT NULL,
  target_division TEXT NOT NULL,
  responsible_person TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'Routine',
  current_status TEXT NOT NULL,
  current_location TEXT NOT NULL,
  current_custodian TEXT NOT NULL,
  file_link TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  is_cleared BOOLEAN DEFAULT FALSE,
  cleared_by TEXT,
  cleared_at TIMESTAMP WITHOUT TIME ZONE,
  clearance_type TEXT,
  exit_tracking_number TEXT,
  forwarded_to_external TEXT,
  clearance_remarks TEXT,
  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'version') THEN
    ALTER TABLE documents ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
  END IF;
END $$;

-- 5. Document Movements table (Append-oriented history)
CREATE TABLE IF NOT EXISTS document_movements (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  timestamp TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  personnel_name TEXT NOT NULL,
  personnel_role TEXT,
  current_desk TEXT NOT NULL,
  forward_to_desk TEXT NOT NULL,
  status_update TEXT NOT NULL,
  notes TEXT,
  from_department TEXT,
  to_department TEXT,
  from_personnel_id INTEGER REFERENCES personnel(id) ON DELETE SET NULL,
  to_personnel_id INTEGER REFERENCES personnel(id) ON DELETE SET NULL,
  routed_at TIMESTAMP WITHOUT TIME ZONE,
  received_at TIMESTAMP WITHOUT TIME ZONE,
  forwarded_at TIMESTAMP WITHOUT TIME ZONE,
  created_by TEXT,
  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'document_movements' AND column_name = 'created_at') THEN
    ALTER TABLE document_movements ADD COLUMN created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'document_movements' AND column_name = 'from_department') THEN
    ALTER TABLE document_movements ADD COLUMN from_department TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'document_movements' AND column_name = 'to_department') THEN
    ALTER TABLE document_movements ADD COLUMN to_department TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'document_movements' AND column_name = 'from_personnel_id') THEN
    ALTER TABLE document_movements ADD COLUMN from_personnel_id INTEGER REFERENCES personnel(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'document_movements' AND column_name = 'to_personnel_id') THEN
    ALTER TABLE document_movements ADD COLUMN to_personnel_id INTEGER REFERENCES personnel(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'document_movements' AND column_name = 'routed_at') THEN
    ALTER TABLE document_movements ADD COLUMN routed_at TIMESTAMP WITHOUT TIME ZONE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'document_movements' AND column_name = 'received_at') THEN
    ALTER TABLE document_movements ADD COLUMN received_at TIMESTAMP WITHOUT TIME ZONE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'document_movements' AND column_name = 'forwarded_at') THEN
    ALTER TABLE document_movements ADD COLUMN forwarded_at TIMESTAMP WITHOUT TIME ZONE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'document_movements' AND column_name = 'created_by') THEN
    ALTER TABLE document_movements ADD COLUMN created_by TEXT;
  END IF;
END $$;

-- 6. Document Remarks table (Supervisor Compliance Remarks)
CREATE TABLE IF NOT EXISTS document_remarks (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  supervisor_name TEXT NOT NULL,
  timestamp TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  remark_text TEXT NOT NULL,
  compliance_required BOOLEAN NOT NULL DEFAULT FALSE,
  complied BOOLEAN NOT NULL DEFAULT FALSE,
  compliance_notes TEXT,
  complied_at TIMESTAMP WITHOUT TIME ZONE,
  complied_by TEXT,
  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'document_remarks' AND column_name = 'created_at') THEN
    ALTER TABLE document_remarks ADD COLUMN created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW();
  END IF;
END $$;

-- 7. Manager Clearances table (1-to-1 Normalized Clearance Records)
CREATE TABLE IF NOT EXISTS manager_clearances (
  id SERIAL PRIMARY KEY,
  document_id TEXT NOT NULL UNIQUE REFERENCES documents(id) ON DELETE CASCADE,
  is_cleared BOOLEAN NOT NULL DEFAULT TRUE,
  cleared_by TEXT NOT NULL,
  cleared_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  clearance_type TEXT,
  exit_tracking_number TEXT,
  forwarded_to_external TEXT,
  clearance_remarks TEXT,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- 8. SLA Rules table
CREATE TABLE IF NOT EXISTS sla_rules (
  id SERIAL PRIMARY KEY,
  target_type TEXT NOT NULL,
  target_name TEXT,
  threshold_hours INTEGER NOT NULL,
  highlight_row_on_exceed BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sla_rules' AND column_name = 'updated_at') THEN
    ALTER TABLE sla_rules ADD COLUMN updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW();
  END IF;
END $$;

-- 9. Business Hours table
CREATE TABLE IF NOT EXISTS business_hours (
  id SERIAL PRIMARY KEY,
  day_of_week INTEGER NOT NULL,
  is_open BOOLEAN NOT NULL DEFAULT TRUE,
  open_time TEXT NOT NULL DEFAULT '08:00',
  close_time TEXT NOT NULL DEFAULT '17:00',
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'business_hours' AND column_name = 'created_at') THEN
    ALTER TABLE business_hours ADD COLUMN created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW();
  END IF;
END $$;

-- 10. Holidays table
CREATE TABLE IF NOT EXISTS holidays (
  id SERIAL PRIMARY KEY,
  date TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  is_working_day_override BOOLEAN DEFAULT FALSE,
  is_half_day BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'holidays' AND column_name = 'is_working_day_override') THEN
    ALTER TABLE holidays ADD COLUMN is_working_day_override BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- 11. Audit Logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  user_id TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  old_value JSONB,
  new_value JSONB,
  metadata JSONB
);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'resource_type' AND is_nullable = 'NO') THEN
    ALTER TABLE audit_logs ALTER COLUMN resource_type DROP NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'resource_id' AND is_nullable = 'NO') THEN
    ALTER TABLE audit_logs ALTER COLUMN resource_id DROP NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'document_movements' AND column_name = 'timestamp') THEN
    ALTER TABLE document_movements ALTER COLUMN timestamp SET DEFAULT NOW();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'entity_type') THEN
    ALTER TABLE audit_logs ADD COLUMN entity_type TEXT;
    UPDATE audit_logs SET entity_type = resource_type WHERE entity_type IS NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'entity_id') THEN
    ALTER TABLE audit_logs ADD COLUMN entity_id TEXT;
    UPDATE audit_logs SET entity_id = resource_id WHERE entity_id IS NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'old_value') THEN
    ALTER TABLE audit_logs ADD COLUMN old_value JSONB;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'new_value') THEN
    ALTER TABLE audit_logs ADD COLUMN new_value JSONB;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'metadata') THEN
    ALTER TABLE audit_logs ADD COLUMN metadata JSONB;
  END IF;
END $$;

-- 12. Dedicated Links table
CREATE TABLE IF NOT EXISTS dedicated_links (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  category TEXT DEFAULT 'General',
  icon TEXT DEFAULT 'ExternalLink',
  description TEXT,
  order_index INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- 13. Dropdown Options table
CREATE TABLE IF NOT EXISTS dropdown_options (
  id SERIAL PRIMARY KEY,
  category TEXT NOT NULL,
  value TEXT NOT NULL,
  label TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- 14. System Settings table
CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- =============================================================
-- PERFORMANCE INDEXES (Evaluated strictly against access patterns)
-- =============================================================
CREATE INDEX IF NOT EXISTS idx_docs_tracking_number ON documents(tracking_number);
CREATE INDEX IF NOT EXISTS idx_docs_current_status ON documents(current_status);
CREATE INDEX IF NOT EXISTS idx_docs_current_location ON documents(current_location);
CREATE INDEX IF NOT EXISTS idx_docs_current_custodian ON documents(current_custodian);
CREATE INDEX IF NOT EXISTS idx_docs_target_division ON documents(target_division);
CREATE INDEX IF NOT EXISTS idx_docs_responsible_person ON documents(responsible_person);
CREATE INDEX IF NOT EXISTS idx_docs_created_at ON documents(created_at);
CREATE INDEX IF NOT EXISTS idx_docs_updated_at ON documents(updated_at);

CREATE INDEX IF NOT EXISTS idx_mov_document_id ON document_movements(document_id);
CREATE INDEX IF NOT EXISTS idx_mov_created_at ON document_movements(created_at);
CREATE INDEX IF NOT EXISTS idx_mov_to_department ON document_movements(to_department);
CREATE INDEX IF NOT EXISTS idx_mov_to_personnel_id ON document_movements(to_personnel_id);

CREATE INDEX IF NOT EXISTS idx_rem_document_id ON document_remarks(document_id);

CREATE INDEX IF NOT EXISTS idx_audit_entity_id ON audit_logs(entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp);
