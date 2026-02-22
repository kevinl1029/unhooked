-- v2: Pre-stored audio for instant conversations

-- 1. Add audio storage path column
ALTER TABLE public.user_progress
ADD COLUMN IF NOT EXISTS precomputed_opening_audio_path TEXT DEFAULT NULL;

COMMENT ON COLUMN public.user_progress.precomputed_opening_audio_path IS
  'Supabase Storage path for pre-generated L2/L3 opening audio file';

-- 2. Add word timing metadata column (JSONB)
ALTER TABLE public.user_progress
ADD COLUMN IF NOT EXISTS precomputed_opening_word_timings JSONB DEFAULT NULL;

COMMENT ON COLUMN public.user_progress.precomputed_opening_word_timings IS
  'Word-level timing data and metadata for pre-generated opening audio. Shape: { timings: WordTiming[], timingSource, contentType }';

-- 3. Create opening-audio storage bucket (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('opening-audio', 'opening-audio', false)
ON CONFLICT (id) DO NOTHING;
