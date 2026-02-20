-- Add pre-computed opening text columns to user_progress
-- Enables instant-start sessions by storing LLM-generated opening messages

ALTER TABLE public.user_progress
ADD COLUMN IF NOT EXISTS precomputed_opening_text TEXT DEFAULT NULL;

ALTER TABLE public.user_progress
ADD COLUMN IF NOT EXISTS precomputed_opening_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

COMMENT ON COLUMN public.user_progress.precomputed_opening_text IS 'Pre-computed opening message for the next L2/L3 session';
COMMENT ON COLUMN public.user_progress.precomputed_opening_at IS 'Timestamp when the opening text was last pre-computed';
