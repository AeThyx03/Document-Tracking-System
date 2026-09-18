-- ==============================================================================
-- MIGRATION 0008: BUSINESS HOURS DAY_OF_WEEK UNIQUE CONSTRAINT INTEGRITY
-- ==============================================================================

-- 1. Ensure duplicate business_hours rows per day_of_week are cleaned if any exist
DELETE FROM business_hours bh1
USING business_hours bh2
WHERE bh1.day_of_week = bh2.day_of_week
  AND bh1.id < bh2.id;

-- 2. Add UNIQUE constraint on business_hours (day_of_week)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'business_hours_day_of_week_unique'
  ) THEN
    ALTER TABLE business_hours ADD CONSTRAINT business_hours_day_of_week_unique UNIQUE (day_of_week);
  END IF;
END $$;

-- 3. Add index on dropdown_options (category, is_active) if not exists
CREATE INDEX IF NOT EXISTS idx_dropdown_cat_active ON dropdown_options (category, is_active);
