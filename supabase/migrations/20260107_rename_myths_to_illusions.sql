-- Migration: Rename "myths" terminology to "illusions"
-- Created: 2026-01-11
-- Description: Renames all myth-related tables, columns, and references to use "illusion" terminology
-- This migration is IDEMPOTENT - safe to run multiple times

-- ============================================
-- STEP 1: Drop foreign key constraints (if they exist)
-- ============================================

ALTER TABLE public.captured_moments DROP CONSTRAINT IF EXISTS captured_moments_myth_key_fkey;
ALTER TABLE public.conviction_assessments DROP CONSTRAINT IF EXISTS conviction_assessments_myth_key_fkey;

-- ============================================
-- STEP 2: Rename the myths table to illusions (if not already renamed)
-- ============================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'myths') THEN
    ALTER TABLE public.myths RENAME TO illusions;
  END IF;
END $$;

-- ============================================
-- STEP 3: Rename columns in the illusions table (if they exist with old names)
-- ============================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'illusions' AND column_name = 'myth_key') THEN
    ALTER TABLE public.illusions RENAME COLUMN myth_key TO illusion_key;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'illusions' AND column_name = 'myth_number') THEN
    ALTER TABLE public.illusions RENAME COLUMN myth_number TO illusion_number;
  END IF;
END $$;

-- Update display names to use "Illusion" instead of "Myth"
UPDATE public.illusions SET display_name = REPLACE(display_name, 'Myth', 'Illusion') WHERE display_name LIKE '%Myth%';

-- ============================================
-- STEP 4: Rename columns in user_progress table
-- ============================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_progress' AND column_name = 'current_myth') THEN
    ALTER TABLE public.user_progress RENAME COLUMN current_myth TO current_illusion;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_progress' AND column_name = 'myth_order') THEN
    ALTER TABLE public.user_progress RENAME COLUMN myth_order TO illusion_order;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_progress' AND column_name = 'myths_completed') THEN
    ALTER TABLE public.user_progress RENAME COLUMN myths_completed TO illusions_completed;
  END IF;
END $$;

-- ============================================
-- STEP 5: Rename columns in conversations table
-- ============================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'conversations' AND column_name = 'myth_number') THEN
    ALTER TABLE public.conversations RENAME COLUMN myth_number TO illusion_number;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'conversations' AND column_name = 'myth_key') THEN
    ALTER TABLE public.conversations RENAME COLUMN myth_key TO illusion_key;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'conversations' AND column_name = 'myth_layer') THEN
    ALTER TABLE public.conversations RENAME COLUMN myth_layer TO illusion_layer;
  END IF;
END $$;

-- Drop and recreate indexes with new names
DROP INDEX IF EXISTS idx_conversations_myth;
DROP INDEX IF EXISTS idx_conversations_user_myth;
CREATE INDEX IF NOT EXISTS idx_conversations_illusion ON public.conversations(illusion_key);
CREATE INDEX IF NOT EXISTS idx_conversations_user_illusion ON public.conversations(user_id, illusion_key);

-- ============================================
-- STEP 6: Rename columns in captured_moments table
-- ============================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'captured_moments' AND column_name = 'myth_key') THEN
    ALTER TABLE public.captured_moments RENAME COLUMN myth_key TO illusion_key;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'captured_moments' AND column_name = 'myth_layer') THEN
    ALTER TABLE public.captured_moments RENAME COLUMN myth_layer TO illusion_layer;
  END IF;
END $$;

-- Recreate foreign key constraint (drop first if exists, then add if column exists)
ALTER TABLE public.captured_moments DROP CONSTRAINT IF EXISTS captured_moments_illusion_key_fkey;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'captured_moments' AND column_name = 'illusion_key') THEN
    ALTER TABLE public.captured_moments
      ADD CONSTRAINT captured_moments_illusion_key_fkey
      FOREIGN KEY (illusion_key) REFERENCES public.illusions(illusion_key);
  END IF;
END $$;

-- Drop and recreate indexes with new names
DROP INDEX IF EXISTS idx_captured_moments_myth;
DROP INDEX IF EXISTS idx_captured_moments_myth_layer;
CREATE INDEX IF NOT EXISTS idx_captured_moments_illusion ON public.captured_moments(illusion_key);
CREATE INDEX IF NOT EXISTS idx_captured_moments_illusion_layer ON public.captured_moments(illusion_key, illusion_layer);

-- ============================================
-- STEP 7: Rename columns in conviction_assessments table
-- ============================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'conviction_assessments' AND column_name = 'myth_key') THEN
    ALTER TABLE public.conviction_assessments RENAME COLUMN myth_key TO illusion_key;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'conviction_assessments' AND column_name = 'myth_layer') THEN
    ALTER TABLE public.conviction_assessments RENAME COLUMN myth_layer TO illusion_layer;
  END IF;
END $$;

-- Recreate foreign key constraint (drop first if exists, then add if column exists)
ALTER TABLE public.conviction_assessments DROP CONSTRAINT IF EXISTS conviction_assessments_illusion_key_fkey;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'conviction_assessments' AND column_name = 'illusion_key') THEN
    ALTER TABLE public.conviction_assessments
      ADD CONSTRAINT conviction_assessments_illusion_key_fkey
      FOREIGN KEY (illusion_key) REFERENCES public.illusions(illusion_key);
  END IF;
END $$;

-- ============================================
-- STEP 8: Rename columns in check_in_schedule table (if they exist)
-- ============================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'check_in_schedule' AND column_name = 'trigger_myth_key') THEN
    ALTER TABLE public.check_in_schedule RENAME COLUMN trigger_myth_key TO trigger_illusion_key;
  END IF;
END $$;

-- Recreate foreign key constraint (drop first if exists, then add if column exists)
ALTER TABLE public.check_in_schedule DROP CONSTRAINT IF EXISTS check_in_schedule_trigger_myth_key_fkey;
ALTER TABLE public.check_in_schedule DROP CONSTRAINT IF EXISTS check_in_schedule_trigger_illusion_key_fkey;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'check_in_schedule' AND column_name = 'trigger_illusion_key') THEN
    ALTER TABLE public.check_in_schedule
      ADD CONSTRAINT check_in_schedule_trigger_illusion_key_fkey
      FOREIGN KEY (trigger_illusion_key) REFERENCES public.illusions(illusion_key);
  END IF;
END $$;

-- ============================================
-- STEP 9: Update ceremony_artifacts artifact_type values
-- ============================================

-- Update the artifact_type enum value
UPDATE public.ceremony_artifacts
SET artifact_type = 'illusions_cheat_sheet'
WHERE artifact_type = 'myths_cheat_sheet';

-- Update the check constraint
ALTER TABLE public.ceremony_artifacts DROP CONSTRAINT IF EXISTS ceremony_artifacts_artifact_type_check;
ALTER TABLE public.ceremony_artifacts
  ADD CONSTRAINT ceremony_artifacts_artifact_type_check
  CHECK (artifact_type IN ('reflective_journey', 'final_recording', 'illusions_cheat_sheet'));

-- ============================================
-- STEP 10: Add comments documenting the changes
-- ============================================

COMMENT ON TABLE public.illusions IS 'Reference table for illusion keys (formerly myths). Each illusion represents a false belief about nicotine.';
COMMENT ON COLUMN public.illusions.illusion_key IS 'Unique key for each illusion (e.g., stress_relief, pleasure)';
COMMENT ON COLUMN public.illusions.illusion_number IS 'Display order number (1-5)';

-- Only add comments if columns exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_progress' AND column_name = 'current_illusion') THEN
    COMMENT ON COLUMN public.user_progress.current_illusion IS 'Current illusion number the user is working on (1-5)';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_progress' AND column_name = 'illusion_order') THEN
    COMMENT ON COLUMN public.user_progress.illusion_order IS 'Personalized order of illusions for this user';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_progress' AND column_name = 'illusions_completed') THEN
    COMMENT ON COLUMN public.user_progress.illusions_completed IS 'Array of completed illusion numbers';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'conversations' AND column_name = 'illusion_number') THEN
    COMMENT ON COLUMN public.conversations.illusion_number IS 'The illusion number this conversation addresses';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'conversations' AND column_name = 'illusion_key') THEN
    COMMENT ON COLUMN public.conversations.illusion_key IS 'The illusion key (e.g., stress_relief, pleasure)';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'conversations' AND column_name = 'illusion_layer') THEN
    COMMENT ON COLUMN public.conversations.illusion_layer IS 'The depth layer (intellectual, emotional, identity)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'captured_moments' AND column_name = 'illusion_key') THEN
    COMMENT ON COLUMN public.captured_moments.illusion_key IS 'The illusion this moment relates to';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'captured_moments' AND column_name = 'illusion_layer') THEN
    COMMENT ON COLUMN public.captured_moments.illusion_layer IS 'The depth layer when moment was captured';
  END IF;
END $$;

-- ============================================
-- VERIFICATION QUERIES (run manually to verify)
-- ============================================

-- Verify illusions table:
-- SELECT * FROM public.illusions;

-- Verify user_progress columns:
-- SELECT current_illusion, illusion_order, illusions_completed FROM public.user_progress LIMIT 1;

-- Verify conversations columns:
-- SELECT illusion_number, illusion_key, illusion_layer FROM public.conversations LIMIT 1;

-- Verify captured_moments columns:
-- SELECT illusion_key, illusion_layer FROM public.captured_moments LIMIT 1;
