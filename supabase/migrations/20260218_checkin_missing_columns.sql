-- Add missing columns for check-in email enhancements
-- retry_count: tracks email send attempts (max 3 before marking failed)
-- observation_assignment: stores the observation prompt for evidence bridge check-ins
-- cancellation_reason: records why a check-in was cancelled

ALTER TABLE check_in_schedule
  ADD COLUMN IF NOT EXISTS retry_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS observation_assignment text,
  ADD COLUMN IF NOT EXISTS cancellation_reason text;
