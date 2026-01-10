-- Phase 4D: Ceremony Artifacts
-- Stores generated ceremony content and persistent user artifacts

CREATE TABLE public.ceremony_artifacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Artifact type
  artifact_type TEXT NOT NULL CHECK (artifact_type IN (
    'reflective_journey',      -- The narrative montage
    'myths_cheat_sheet',       -- Quick reference with their quotes
    'final_recording',         -- Their message to future self
    'journey_audio_montage'    -- Compiled audio clips
  )),

  -- Content
  content_text TEXT,           -- For text-based artifacts
  content_json JSONB,          -- For structured data (myths cheat sheet)
  audio_path TEXT,             -- For audio artifacts
  audio_duration_ms INTEGER,

  -- Moment references (for journey artifact)
  included_moment_ids UUID[],

  -- Journey playlist (for reflective_journey type)
  playlist JSONB,              -- Array of segments with text, type, moment_id

  -- Metadata
  ceremony_completed_at TIMESTAMP WITH TIME ZONE,

  -- Artifacts are immutable once generated
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure one artifact per type per user
  UNIQUE(user_id, artifact_type)
);

-- RLS
ALTER TABLE public.ceremony_artifacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own artifacts"
  ON public.ceremony_artifacts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own artifacts"
  ON public.ceremony_artifacts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own artifacts"
  ON public.ceremony_artifacts FOR UPDATE
  USING (auth.uid() = user_id);

-- Index for quick lookups
CREATE INDEX idx_ceremony_artifacts_user_id ON public.ceremony_artifacts(user_id);
CREATE INDEX idx_ceremony_artifacts_type ON public.ceremony_artifacts(user_id, artifact_type);

-- Add ceremony tracking columns to user_story
ALTER TABLE public.user_story
ADD COLUMN IF NOT EXISTS ceremony_completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS ceremony_skipped_final_dose BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS already_quit BOOLEAN DEFAULT FALSE;

-- Comment on table
COMMENT ON TABLE public.ceremony_artifacts IS 'Stores generated ceremony content and persistent user artifacts';
