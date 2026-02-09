-- Evidence-Based Coaching Schema Changes
-- Adds layer_progress tracking to user_progress
-- Adds observation_assignment to conversations and check_in_schedule
-- Adds cancellation_reason to check_in_schedule
-- Updates check_in_type constraint to include 'evidence_bridge'
-- Updates status constraint to include 'cancelled'
-- Migrates existing users per REQ-50

-- Add layer_progress column to user_progress
ALTER TABLE public.user_progress
ADD COLUMN IF NOT EXISTS layer_progress JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.user_progress.layer_progress IS
  'Maps illusion keys to arrays of completed layers: {"stress_relief": ["intellectual", "emotional"], ...}';

-- Add observation_assignment column to conversations
ALTER TABLE public.conversations
ADD COLUMN IF NOT EXISTS observation_assignment TEXT;

COMMENT ON COLUMN public.conversations.observation_assignment IS
  'AI-personalized observation assignment text extracted from [OBSERVATION_ASSIGNMENT: ...] token';

-- Add new columns to check_in_schedule
ALTER TABLE public.check_in_schedule
ADD COLUMN IF NOT EXISTS observation_assignment TEXT,
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

COMMENT ON COLUMN public.check_in_schedule.observation_assignment IS
  'Observation assignment template text for evidence bridge check-ins';
COMMENT ON COLUMN public.check_in_schedule.cancellation_reason IS
  'Reason for cancellation (e.g., user_continued_immediately, illusion_completed)';

-- Update check_in_type CHECK constraint to include 'evidence_bridge'
ALTER TABLE public.check_in_schedule
DROP CONSTRAINT IF EXISTS check_in_schedule_check_in_type_check;

ALTER TABLE public.check_in_schedule
ADD CONSTRAINT check_in_schedule_check_in_type_check
CHECK (check_in_type = ANY (ARRAY[
  'post_session'::text,
  'morning'::text,
  'evening'::text,
  'evidence_bridge'::text
]));

-- Update status CHECK constraint to include 'cancelled'
ALTER TABLE public.check_in_schedule
DROP CONSTRAINT IF EXISTS check_in_schedule_status_check;

ALTER TABLE public.check_in_schedule
ADD CONSTRAINT check_in_schedule_status_check
CHECK (status = ANY (ARRAY[
  'scheduled'::text,
  'sent'::text,
  'opened'::text,
  'completed'::text,
  'skipped'::text,
  'expired'::text,
  'cancelled'::text
]));

-- Migration for Existing Users (REQ-50)

-- Existing completed illusions: set all 3 layers as completed
UPDATE public.user_progress
SET layer_progress = (
  SELECT jsonb_object_agg(
    key,
    '["intellectual", "emotional", "identity"]'::jsonb
  )
  FROM unnest(illusions_completed) AS completed_num
  CROSS JOIN LATERAL (
    SELECT illusion_key AS key
    FROM public.illusions
    WHERE illusion_number = completed_num
  ) AS illusion_keys
)
WHERE array_length(illusions_completed, 1) > 0
AND (layer_progress IS NULL OR layer_progress = '{}'::jsonb);

-- In-progress illusions with 1+ completed conversations under old model:
-- Map to Layer 1 complete (current layer will derive to 'emotional' from layer_progress)
UPDATE public.user_progress up
SET
  layer_progress = COALESCE(layer_progress, '{}'::jsonb) || jsonb_build_object(
    (SELECT illusion_key FROM public.illusions WHERE illusion_number = up.current_illusion),
    '["intellectual"]'::jsonb
  )
WHERE program_status = 'in_progress'
AND EXISTS (
  SELECT 1 FROM public.conversations c
  WHERE c.user_id = up.user_id
  AND c.session_completed = true
  AND c.session_type = 'core'
  AND c.illusion_key = (
    SELECT illusion_key FROM public.illusions WHERE illusion_number = up.current_illusion
  )
)
AND NOT EXISTS (
  -- Guard: don't overwrite if layer_progress already has data for this illusion
  SELECT 1 WHERE layer_progress ? (
    SELECT illusion_key FROM public.illusions WHERE illusion_number = up.current_illusion
  )
);
