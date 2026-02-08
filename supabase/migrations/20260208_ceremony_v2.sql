-- Ceremony v2 schema changes
-- Adds ceremony_ready_at and ceremony_email_sent_at to user_progress for 24h email nudge tracking
-- Adds generation_status to ceremony_artifacts for background artifact generation

-- Add ceremony_ready_at to user_progress
-- This timestamp is set when the user completes Identity Layer 3 and becomes eligible for the ceremony
ALTER TABLE public.user_progress
ADD COLUMN IF NOT EXISTS ceremony_ready_at TIMESTAMP WITH TIME ZONE;

-- Add ceremony_email_sent_at to user_progress
-- This timestamp tracks when the 24h ceremony nudge email was sent
ALTER TABLE public.user_progress
ADD COLUMN IF NOT EXISTS ceremony_email_sent_at TIMESTAMP WITH TIME ZONE;

-- Add generation_status to ceremony_artifacts
-- This tracks the background generation state: pending, generating, ready, failed
ALTER TABLE public.ceremony_artifacts
ADD COLUMN IF NOT EXISTS generation_status TEXT DEFAULT 'ready';

-- Add CHECK constraint for generation_status values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ceremony_artifacts_generation_status_check'
  ) THEN
    ALTER TABLE public.ceremony_artifacts
    ADD CONSTRAINT ceremony_artifacts_generation_status_check
    CHECK (generation_status IN ('pending', 'generating', 'ready', 'failed'));
  END IF;
END $$;

COMMENT ON COLUMN public.user_progress.ceremony_ready_at IS
  'Timestamp when user became eligible for ceremony (Identity Layer 3 completion)';

COMMENT ON COLUMN public.user_progress.ceremony_email_sent_at IS
  'Timestamp when 24h ceremony nudge email was sent';

COMMENT ON COLUMN public.ceremony_artifacts.generation_status IS
  'Background generation status: pending (queued), generating (in progress), ready (complete), failed (error)';
