-- Migration: Personalization v1.1 Enhancements
-- Description: Add preferred_name column, convert previous_attempts to TEXT with logarithmic scale
-- Date: 2026-02-15
-- Related: docs/specs/personalization-engine-spec.md (v1.1)

-- =============================================================================
-- 1. Add preferred_name column
-- =============================================================================

ALTER TABLE user_intake ADD COLUMN IF NOT EXISTS preferred_name VARCHAR(50);

-- =============================================================================
-- 2. Convert previous_attempts from INTEGER to TEXT
-- =============================================================================

-- Change column type to TEXT
ALTER TABLE user_intake ALTER COLUMN previous_attempts TYPE TEXT;

-- =============================================================================
-- 3. Migrate existing data to new scale
-- =============================================================================

-- Migrate numeric values to descriptive strings
-- Only processes rows where previous_attempts is a pure numeric string
UPDATE user_intake SET previous_attempts = CASE
  WHEN previous_attempts = '0' THEN 'never'
  WHEN previous_attempts = '1' THEN 'once'
  WHEN previous_attempts = '2' THEN 'a_few'
  WHEN previous_attempts = '3' THEN 'many'
  ELSE previous_attempts  -- preserve any already-migrated values
END
WHERE previous_attempts ~ '^\d+$';  -- only migrate numeric strings

-- =============================================================================
-- 4. Add validation constraint
-- =============================================================================

-- CHECK constraint allowing NULL or one of the allowed values
-- (PostgreSQL automatically passes NULL through CHECK constraints)
ALTER TABLE user_intake ADD CONSTRAINT check_previous_attempts
  CHECK (previous_attempts IN ('never', 'once', 'a_few', 'many', 'countless'));

-- =============================================================================
-- ROLLBACK SQL (for reference, not automated)
-- =============================================================================
-- To manually reverse this migration, run the following:
--
-- -- Drop the CHECK constraint
-- ALTER TABLE user_intake DROP CONSTRAINT check_previous_attempts;
--
-- -- Reverse the mapping (lossy: 'countless' maps back to '3')
-- UPDATE user_intake SET previous_attempts = CASE
--   WHEN previous_attempts = 'never' THEN '0'
--   WHEN previous_attempts = 'once' THEN '1'
--   WHEN previous_attempts = 'a_few' THEN '2'
--   WHEN previous_attempts = 'many' THEN '3'
--   WHEN previous_attempts = 'countless' THEN '3'
--   ELSE previous_attempts
-- END;
--
-- -- Convert back to INTEGER
-- ALTER TABLE user_intake ALTER COLUMN previous_attempts TYPE INTEGER USING previous_attempts::integer;
--
-- -- Drop preferred_name column
-- ALTER TABLE user_intake DROP COLUMN preferred_name;
