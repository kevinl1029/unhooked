-- v2.7: Precompute slot-state gating to prevent stale L2/L3 openings

ALTER TABLE public.user_progress
ADD COLUMN IF NOT EXISTS precomputed_opening_status TEXT DEFAULT NULL;

ALTER TABLE public.user_progress
ADD COLUMN IF NOT EXISTS precomputed_opening_target_illusion_key TEXT DEFAULT NULL;

ALTER TABLE public.user_progress
ADD COLUMN IF NOT EXISTS precomputed_opening_target_layer TEXT DEFAULT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'user_progress_precomputed_opening_status_check'
  ) THEN
    ALTER TABLE public.user_progress
      ADD CONSTRAINT user_progress_precomputed_opening_status_check
      CHECK (precomputed_opening_status IS NULL OR precomputed_opening_status IN ('pending', 'ready', 'failed'));
  END IF;
END $$;

COMMENT ON COLUMN public.user_progress.precomputed_opening_status IS
  'Slot state for next-layer precomputed opening payload: pending, ready, failed.';

COMMENT ON COLUMN public.user_progress.precomputed_opening_target_illusion_key IS
  'Illusion key this precomputed opening payload targets. Used for stale-safety gating.';

COMMENT ON COLUMN public.user_progress.precomputed_opening_target_layer IS
  'Illusion layer this precomputed opening payload targets. Used for stale-safety gating.';
