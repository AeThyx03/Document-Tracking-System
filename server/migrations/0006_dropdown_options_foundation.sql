-- ==============================================================================
-- MIGRATION 0006: AUTHORITATIVE DROPDOWN OPTIONS CONFIGURATION FOUNDATION
-- ==============================================================================

-- 1. Ensure table exists with all required columns
CREATE TABLE IF NOT EXISTS dropdown_options (
  id SERIAL PRIMARY KEY,
  category TEXT NOT NULL,
  value TEXT NOT NULL,
  label TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- 2. Indexes for fast category lookups and sorting
CREATE INDEX IF NOT EXISTS idx_dropdown_category ON dropdown_options (category);
CREATE INDEX IF NOT EXISTS idx_dropdown_cat_active ON dropdown_options (category, is_active);
CREATE INDEX IF NOT EXISTS idx_dropdown_sort_order ON dropdown_options (category, sort_order);

-- 3. Unique partial index to prevent duplicate active values within the same category
CREATE UNIQUE INDEX IF NOT EXISTS idx_dropdown_cat_val_active 
ON dropdown_options (category, LOWER(value)) 
WHERE is_active = TRUE;

-- 4. Seed Canonical 7 Categories with Standard Baseline Values (Idempotent)

-- Category 1: Document Classification (Incoming, Outgoing)
INSERT INTO dropdown_options (category, value, label, sort_order, is_active)
SELECT 'document_classification', 'Incoming', 'Incoming Document', 1, TRUE
WHERE NOT EXISTS (SELECT 1 FROM dropdown_options WHERE category = 'document_classification' AND LOWER(value) = 'incoming');

INSERT INTO dropdown_options (category, value, label, sort_order, is_active)
SELECT 'document_classification', 'Outgoing', 'Outgoing Document', 2, TRUE
WHERE NOT EXISTS (SELECT 1 FROM dropdown_options WHERE category = 'document_classification' AND LOWER(value) = 'outgoing');

-- Category 2: Transaction Type
INSERT INTO dropdown_options (category, value, label, sort_order, is_active)
SELECT 'transaction_type', 'Simple Transaction', 'Simple Transaction', 1, TRUE
WHERE NOT EXISTS (SELECT 1 FROM dropdown_options WHERE category = 'transaction_type' AND LOWER(value) = 'simple transaction');

INSERT INTO dropdown_options (category, value, label, sort_order, is_active)
SELECT 'transaction_type', 'Complex Transaction', 'Complex Transaction', 2, TRUE
WHERE NOT EXISTS (SELECT 1 FROM dropdown_options WHERE category = 'transaction_type' AND LOWER(value) = 'complex transaction');

INSERT INTO dropdown_options (category, value, label, sort_order, is_active)
SELECT 'transaction_type', 'Highly Technical Transaction', 'Highly Technical Transaction', 3, TRUE
WHERE NOT EXISTS (SELECT 1 FROM dropdown_options WHERE category = 'transaction_type' AND LOWER(value) = 'highly technical transaction');

-- Category 3: Communication Type
INSERT INTO dropdown_options (category, value, label, sort_order, is_active)
SELECT 'communication_type', 'Memorandum', 'Memorandum', 1, TRUE
WHERE NOT EXISTS (SELECT 1 FROM dropdown_options WHERE category = 'communication_type' AND LOWER(value) = 'memorandum');

INSERT INTO dropdown_options (category, value, label, sort_order, is_active)
SELECT 'communication_type', 'Office Order', 'Office Order', 2, TRUE
WHERE NOT EXISTS (SELECT 1 FROM dropdown_options WHERE category = 'communication_type' AND LOWER(value) = 'office order');

INSERT INTO dropdown_options (category, value, label, sort_order, is_active)
SELECT 'communication_type', 'Special Order', 'Special Order', 3, TRUE
WHERE NOT EXISTS (SELECT 1 FROM dropdown_options WHERE category = 'communication_type' AND LOWER(value) = 'special order');

INSERT INTO dropdown_options (category, value, label, sort_order, is_active)
SELECT 'communication_type', 'Letter', 'Letter', 4, TRUE
WHERE NOT EXISTS (SELECT 1 FROM dropdown_options WHERE category = 'communication_type' AND LOWER(value) = 'letter');

INSERT INTO dropdown_options (category, value, label, sort_order, is_active)
SELECT 'communication_type', 'Endorsement', 'Endorsement', 5, TRUE
WHERE NOT EXISTS (SELECT 1 FROM dropdown_options WHERE category = 'communication_type' AND LOWER(value) = 'endorsement');

INSERT INTO dropdown_options (category, value, label, sort_order, is_active)
SELECT 'communication_type', 'Executive Brief', 'Executive Brief', 6, TRUE
WHERE NOT EXISTS (SELECT 1 FROM dropdown_options WHERE category = 'communication_type' AND LOWER(value) = 'executive brief');

INSERT INTO dropdown_options (category, value, label, sort_order, is_active)
SELECT 'communication_type', 'Advisory', 'Advisory', 7, TRUE
WHERE NOT EXISTS (SELECT 1 FROM dropdown_options WHERE category = 'communication_type' AND LOWER(value) = 'advisory');

INSERT INTO dropdown_options (category, value, label, sort_order, is_active)
SELECT 'communication_type', 'Circular', 'Circular', 8, TRUE
WHERE NOT EXISTS (SELECT 1 FROM dropdown_options WHERE category = 'communication_type' AND LOWER(value) = 'circular');

INSERT INTO dropdown_options (category, value, label, sort_order, is_active)
SELECT 'communication_type', 'Notice', 'Notice', 9, TRUE
WHERE NOT EXISTS (SELECT 1 FROM dropdown_options WHERE category = 'communication_type' AND LOWER(value) = 'notice');

INSERT INTO dropdown_options (category, value, label, sort_order, is_active)
SELECT 'communication_type', 'Transmittal Slip', 'Transmittal Slip', 10, TRUE
WHERE NOT EXISTS (SELECT 1 FROM dropdown_options WHERE category = 'communication_type' AND LOWER(value) = 'transmittal slip');

INSERT INTO dropdown_options (category, value, label, sort_order, is_active)
SELECT 'communication_type', 'Resolution', 'Resolution', 11, TRUE
WHERE NOT EXISTS (SELECT 1 FROM dropdown_options WHERE category = 'communication_type' AND LOWER(value) = 'resolution');

-- Category 4: Report / Document Type
INSERT INTO dropdown_options (category, value, label, sort_order, is_active)
SELECT 'report_type', 'Inspection Report', 'Inspection Report', 1, TRUE
WHERE NOT EXISTS (SELECT 1 FROM dropdown_options WHERE category = 'report_type' AND LOWER(value) = 'inspection report');

INSERT INTO dropdown_options (category, value, label, sort_order, is_active)
SELECT 'report_type', 'Audit Report', 'Audit Report', 2, TRUE
WHERE NOT EXISTS (SELECT 1 FROM dropdown_options WHERE category = 'report_type' AND LOWER(value) = 'audit report');

INSERT INTO dropdown_options (category, value, label, sort_order, is_active)
SELECT 'report_type', 'Compliance Monitoring Report', 'Compliance Monitoring Report', 3, TRUE
WHERE NOT EXISTS (SELECT 1 FROM dropdown_options WHERE category = 'report_type' AND LOWER(value) = 'compliance monitoring report');

INSERT INTO dropdown_options (category, value, label, sort_order, is_active)
SELECT 'report_type', 'Incident Report', 'Incident Report', 4, TRUE
WHERE NOT EXISTS (SELECT 1 FROM dropdown_options WHERE category = 'report_type' AND LOWER(value) = 'incident report');

INSERT INTO dropdown_options (category, value, label, sort_order, is_active)
SELECT 'report_type', 'Progress Report', 'Progress Report', 5, TRUE
WHERE NOT EXISTS (SELECT 1 FROM dropdown_options WHERE category = 'report_type' AND LOWER(value) = 'progress report');

INSERT INTO dropdown_options (category, value, label, sort_order, is_active)
SELECT 'report_type', 'Clearance Slip', 'Clearance Slip', 6, TRUE
WHERE NOT EXISTS (SELECT 1 FROM dropdown_options WHERE category = 'report_type' AND LOWER(value) = 'clearance slip');

INSERT INTO dropdown_options (category, value, label, sort_order, is_active)
SELECT 'report_type', 'Financial Statement', 'Financial Statement', 7, TRUE
WHERE NOT EXISTS (SELECT 1 FROM dropdown_options WHERE category = 'report_type' AND LOWER(value) = 'financial statement');

INSERT INTO dropdown_options (category, value, label, sort_order, is_active)
SELECT 'report_type', 'Accomplishment Report', 'Accomplishment Report', 8, TRUE
WHERE NOT EXISTS (SELECT 1 FROM dropdown_options WHERE category = 'report_type' AND LOWER(value) = 'accomplishment report');

INSERT INTO dropdown_options (category, value, label, sort_order, is_active)
SELECT 'report_type', 'Project Status Report', 'Project Status Report', 9, TRUE
WHERE NOT EXISTS (SELECT 1 FROM dropdown_options WHERE category = 'report_type' AND LOWER(value) = 'project status report');

INSERT INTO dropdown_options (category, value, label, sort_order, is_active)
SELECT 'report_type', 'Terminal Report', 'Terminal Report', 10, TRUE
WHERE NOT EXISTS (SELECT 1 FROM dropdown_options WHERE category = 'report_type' AND LOWER(value) = 'terminal report');

INSERT INTO dropdown_options (category, value, label, sort_order, is_active)
SELECT 'report_type', 'Standard / General', 'Standard / General', 11, TRUE
WHERE NOT EXISTS (SELECT 1 FROM dropdown_options WHERE category = 'report_type' AND LOWER(value) = 'standard / general');

-- Category 5: Originating Dept / Agency
INSERT INTO dropdown_options (category, value, label, sort_order, is_active)
SELECT 'originating_agency', 'Office of the Regional Director', 'Office of the Regional Director', 1, TRUE
WHERE NOT EXISTS (SELECT 1 FROM dropdown_options WHERE category = 'originating_agency' AND LOWER(value) = 'office of the regional director');

INSERT INTO dropdown_options (category, value, label, sort_order, is_active)
SELECT 'originating_agency', 'Regional Trial Court', 'Regional Trial Court', 2, TRUE
WHERE NOT EXISTS (SELECT 1 FROM dropdown_options WHERE category = 'originating_agency' AND LOWER(value) = 'regional trial court');

INSERT INTO dropdown_options (category, value, label, sort_order, is_active)
SELECT 'originating_agency', 'Department of Transportation', 'Department of Transportation', 3, TRUE
WHERE NOT EXISTS (SELECT 1 FROM dropdown_options WHERE category = 'originating_agency' AND LOWER(value) = 'department of transportation');

INSERT INTO dropdown_options (category, value, label, sort_order, is_active)
SELECT 'originating_agency', 'Civil Service Commission', 'Civil Service Commission', 4, TRUE
WHERE NOT EXISTS (SELECT 1 FROM dropdown_options WHERE category = 'originating_agency' AND LOWER(value) = 'civil service commission');

INSERT INTO dropdown_options (category, value, label, sort_order, is_active)
SELECT 'originating_agency', 'Department of Budget and Management', 'Department of Budget and Management', 5, TRUE
WHERE NOT EXISTS (SELECT 1 FROM dropdown_options WHERE category = 'originating_agency' AND LOWER(value) = 'department of budget and management');

INSERT INTO dropdown_options (category, value, label, sort_order, is_active)
SELECT 'originating_agency', 'Commission on Audit', 'Commission on Audit', 6, TRUE
WHERE NOT EXISTS (SELECT 1 FROM dropdown_options WHERE category = 'originating_agency' AND LOWER(value) = 'commission on audit');

INSERT INTO dropdown_options (category, value, label, sort_order, is_active)
SELECT 'originating_agency', 'Department of Environment and Natural Resources', 'Department of Environment and Natural Resources', 7, TRUE
WHERE NOT EXISTS (SELECT 1 FROM dropdown_options WHERE category = 'originating_agency' AND LOWER(value) = 'department of environment and natural resources');

INSERT INTO dropdown_options (category, value, label, sort_order, is_active)
SELECT 'originating_agency', 'Office of the Ombudsman', 'Office of the Ombudsman', 8, TRUE
WHERE NOT EXISTS (SELECT 1 FROM dropdown_options WHERE category = 'originating_agency' AND LOWER(value) = 'office of the ombudsman');

INSERT INTO dropdown_options (category, value, label, sort_order, is_active)
SELECT 'originating_agency', 'Local Government Unit', 'Local Government Unit', 9, TRUE
WHERE NOT EXISTS (SELECT 1 FROM dropdown_options WHERE category = 'originating_agency' AND LOWER(value) = 'local government unit');

INSERT INTO dropdown_options (category, value, label, sort_order, is_active)
SELECT 'originating_agency', 'Internal POSSD Division', 'Internal POSSD Division', 10, TRUE
WHERE NOT EXISTS (SELECT 1 FROM dropdown_options WHERE category = 'originating_agency' AND LOWER(value) = 'internal possd division');

INSERT INTO dropdown_options (category, value, label, sort_order, is_active)
SELECT 'originating_agency', 'External Contractor / Supplier', 'External Contractor / Supplier', 11, TRUE
WHERE NOT EXISTS (SELECT 1 FROM dropdown_options WHERE category = 'originating_agency' AND LOWER(value) = 'external contractor / supplier');

INSERT INTO dropdown_options (category, value, label, sort_order, is_active)
SELECT 'originating_agency', 'Public Client / Citizen', 'Public Client / Citizen', 12, TRUE
WHERE NOT EXISTS (SELECT 1 FROM dropdown_options WHERE category = 'originating_agency' AND LOWER(value) = 'public client / citizen');

-- Category 6: Forward To / Target Division
INSERT INTO dropdown_options (category, value, label, sort_order, is_active)
SELECT 'target_division', 'Administrative & General Services', 'Administrative & General Services', 1, TRUE
WHERE NOT EXISTS (SELECT 1 FROM dropdown_options WHERE category = 'target_division' AND LOWER(value) = 'administrative & general services');

INSERT INTO dropdown_options (category, value, label, sort_order, is_active)
SELECT 'target_division', 'Finance & Budget Division', 'Finance & Budget Division', 2, TRUE
WHERE NOT EXISTS (SELECT 1 FROM dropdown_options WHERE category = 'target_division' AND LOWER(value) = 'finance & budget division');

INSERT INTO dropdown_options (category, value, label, sort_order, is_active)
SELECT 'target_division', 'Planning & Quality Assurance', 'Planning & Quality Assurance', 3, TRUE
WHERE NOT EXISTS (SELECT 1 FROM dropdown_options WHERE category = 'target_division' AND LOWER(value) = 'planning & quality assurance');

INSERT INTO dropdown_options (category, value, label, sort_order, is_active)
SELECT 'target_division', 'Legal & Regulatory Affairs', 'Legal & Regulatory Affairs', 4, TRUE
WHERE NOT EXISTS (SELECT 1 FROM dropdown_options WHERE category = 'target_division' AND LOWER(value) = 'legal & regulatory affairs');

INSERT INTO dropdown_options (category, value, label, sort_order, is_active)
SELECT 'target_division', 'Operations & Emergency Management', 'Operations & Emergency Management', 5, TRUE
WHERE NOT EXISTS (SELECT 1 FROM dropdown_options WHERE category = 'target_division' AND LOWER(value) = 'operations & emergency management');

INSERT INTO dropdown_options (category, value, label, sort_order, is_active)
SELECT 'target_division', 'Information Technology Division', 'Information Technology Division', 6, TRUE
WHERE NOT EXISTS (SELECT 1 FROM dropdown_options WHERE category = 'target_division' AND LOWER(value) = 'information technology division');

INSERT INTO dropdown_options (category, value, label, sort_order, is_active)
SELECT 'target_division', 'Executive Office of the Manager', 'Executive Office of the Manager', 7, TRUE
WHERE NOT EXISTS (SELECT 1 FROM dropdown_options WHERE category = 'target_division' AND LOWER(value) = 'executive office of the manager');

INSERT INTO dropdown_options (category, value, label, sort_order, is_active)
SELECT 'target_division', 'Central Records & Receiving Desk', 'Central Records & Receiving Desk', 8, TRUE
WHERE NOT EXISTS (SELECT 1 FROM dropdown_options WHERE category = 'target_division' AND LOWER(value) = 'central records & receiving desk');

-- Category 7: Routing Priority Level
INSERT INTO dropdown_options (category, value, label, sort_order, is_active)
SELECT 'priority_level', 'Routine', 'Routine', 1, TRUE
WHERE NOT EXISTS (SELECT 1 FROM dropdown_options WHERE category = 'priority_level' AND LOWER(value) = 'routine');

INSERT INTO dropdown_options (category, value, label, sort_order, is_active)
SELECT 'priority_level', 'Urgent', 'Urgent', 2, TRUE
WHERE NOT EXISTS (SELECT 1 FROM dropdown_options WHERE category = 'priority_level' AND LOWER(value) = 'urgent');

INSERT INTO dropdown_options (category, value, label, sort_order, is_active)
SELECT 'priority_level', 'Rush', 'Rush', 3, TRUE
WHERE NOT EXISTS (SELECT 1 FROM dropdown_options WHERE category = 'priority_level' AND LOWER(value) = 'rush');

INSERT INTO dropdown_options (category, value, label, sort_order, is_active)
SELECT 'priority_level', 'Emergency', 'Emergency', 4, TRUE
WHERE NOT EXISTS (SELECT 1 FROM dropdown_options WHERE category = 'priority_level' AND LOWER(value) = 'emergency');
