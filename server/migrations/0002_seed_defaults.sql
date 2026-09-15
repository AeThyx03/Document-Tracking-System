-- =============================================================
-- Migration 0002: Seed Initial Configuration and Default Rules
-- Preserves existing division thresholds and system defaults
-- =============================================================

-- Seed default SLA rules if table is empty
INSERT INTO sla_rules (target_type, target_name, threshold_hours, highlight_row_on_exceed)
SELECT 'default', NULL, 24, TRUE
WHERE NOT EXISTS (SELECT 1 FROM sla_rules WHERE target_type = 'default');

INSERT INTO sla_rules (target_type, target_name, threshold_hours, highlight_row_on_exceed)
SELECT 'division', 'Finance & Budget Division', 24, TRUE
WHERE NOT EXISTS (SELECT 1 FROM sla_rules WHERE target_type = 'division' AND target_name = 'Finance & Budget Division');

INSERT INTO sla_rules (target_type, target_name, threshold_hours, highlight_row_on_exceed)
SELECT 'division', 'Administrative & General Services', 24, TRUE
WHERE NOT EXISTS (SELECT 1 FROM sla_rules WHERE target_type = 'division' AND target_name = 'Administrative & General Services');

INSERT INTO sla_rules (target_type, target_name, threshold_hours, highlight_row_on_exceed)
SELECT 'division', 'Planning & Quality Assurance', 36, TRUE
WHERE NOT EXISTS (SELECT 1 FROM sla_rules WHERE target_type = 'division' AND target_name = 'Planning & Quality Assurance');

INSERT INTO sla_rules (target_type, target_name, threshold_hours, highlight_row_on_exceed)
SELECT 'division', 'Legal & Regulatory Affairs', 48, TRUE
WHERE NOT EXISTS (SELECT 1 FROM sla_rules WHERE target_type = 'division' AND target_name = 'Legal & Regulatory Affairs');

INSERT INTO sla_rules (target_type, target_name, threshold_hours, highlight_row_on_exceed)
SELECT 'division', 'Operations & Emergency Management', 8, TRUE
WHERE NOT EXISTS (SELECT 1 FROM sla_rules WHERE target_type = 'division' AND target_name = 'Operations & Emergency Management');

INSERT INTO sla_rules (target_type, target_name, threshold_hours, highlight_row_on_exceed)
SELECT 'division', 'Executive Office of the Manager', 12, TRUE
WHERE NOT EXISTS (SELECT 1 FROM sla_rules WHERE target_type = 'division' AND target_name = 'Executive Office of the Manager');

INSERT INTO sla_rules (target_type, target_name, threshold_hours, highlight_row_on_exceed)
SELECT 'division', 'Central Records & Receiving Desk', 4, TRUE
WHERE NOT EXISTS (SELECT 1 FROM sla_rules WHERE target_type = 'division' AND target_name = 'Central Records & Receiving Desk');

INSERT INTO sla_rules (target_type, target_name, threshold_hours, highlight_row_on_exceed)
SELECT 'division', 'Information Technology Division', 24, TRUE
WHERE NOT EXISTS (SELECT 1 FROM sla_rules WHERE target_type = 'division' AND target_name = 'Information Technology Division');

-- Seed Standard Working Hours (Monday through Friday 08:00 to 17:00)
INSERT INTO business_hours (day_of_week, is_open, open_time, close_time)
SELECT 1, TRUE, '08:00', '17:00' WHERE NOT EXISTS (SELECT 1 FROM business_hours WHERE day_of_week = 1);

INSERT INTO business_hours (day_of_week, is_open, open_time, close_time)
SELECT 2, TRUE, '08:00', '17:00' WHERE NOT EXISTS (SELECT 1 FROM business_hours WHERE day_of_week = 2);

INSERT INTO business_hours (day_of_week, is_open, open_time, close_time)
SELECT 3, TRUE, '08:00', '17:00' WHERE NOT EXISTS (SELECT 1 FROM business_hours WHERE day_of_week = 3);

INSERT INTO business_hours (day_of_week, is_open, open_time, close_time)
SELECT 4, TRUE, '08:00', '17:00' WHERE NOT EXISTS (SELECT 1 FROM business_hours WHERE day_of_week = 4);

INSERT INTO business_hours (day_of_week, is_open, open_time, close_time)
SELECT 5, TRUE, '08:00', '17:00' WHERE NOT EXISTS (SELECT 1 FROM business_hours WHERE day_of_week = 5);

INSERT INTO business_hours (day_of_week, is_open, open_time, close_time)
SELECT 6, FALSE, '08:00', '17:00' WHERE NOT EXISTS (SELECT 1 FROM business_hours WHERE day_of_week = 6);

INSERT INTO business_hours (day_of_week, is_open, open_time, close_time)
SELECT 0, FALSE, '08:00', '17:00' WHERE NOT EXISTS (SELECT 1 FROM business_hours WHERE day_of_week = 0);

-- Seed System Settings (identifying PostgreSQL as authoritative store)
INSERT INTO system_settings (key, value, description)
VALUES ('app_config', '{"system_name": "POSSD Document Tracking System", "version": "1.0.0", "authoritative_db": "postgresql"}'::jsonb, 'Core POSSD platform configuration')
ON CONFLICT (key) DO NOTHING;
