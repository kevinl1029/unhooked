-- Migration: Drop unused current_myth_key column from user_progress
-- Created: 2026-01-19
-- Description: Removes the current_myth_key column which was:
--   1. Missed during the myth→illusion rename migration
--   2. Never populated by any code (current_illusion number is used instead)
--   3. Redundant since illusion keys can be derived from current_illusion via code mapping

-- Drop the foreign key constraint first
ALTER TABLE public.user_progress
  DROP CONSTRAINT IF EXISTS user_progress_current_myth_key_fkey;

-- Drop the column
ALTER TABLE public.user_progress
  DROP COLUMN IF EXISTS current_myth_key;

-- Update table comment to reflect current state
COMMENT ON TABLE public.user_progress IS 'Tracks user progress through the 5-illusion cessation program';
