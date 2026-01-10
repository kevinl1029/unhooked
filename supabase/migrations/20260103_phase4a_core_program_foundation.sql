-- Phase 4A: Core Program Foundation Migration
-- Created: 2026-01-09
-- Description: Adds myths reference table, captured moments, conviction assessments,
--              user story, check-in scheduling, ceremony artifacts, and follow-up schedule

-- ============================================
-- TABLE: myths (Reference Table)
-- Reference table for myth keys. Used for foreign key constraints.
-- ============================================

CREATE TABLE IF NOT EXISTS public.myths (
  myth_key TEXT PRIMARY KEY,
  myth_number INTEGER UNIQUE NOT NULL CHECK (myth_number BETWEEN 1 AND 5),
  display_name TEXT NOT NULL,
  short_name TEXT NOT NULL
);

-- Seed data for myths
INSERT INTO public.myths (myth_key, myth_number, display_name, short_name) VALUES
  ('stress_relief', 1, 'The Stress Relief Myth', 'Stress'),
  ('pleasure', 2, 'The Pleasure Myth', 'Pleasure'),
  ('willpower', 3, 'The Willpower Myth', 'Willpower'),
  ('focus', 4, 'The Focus Myth', 'Focus'),
  ('identity', 5, 'The Identity Myth', 'Identity')
ON CONFLICT (myth_key) DO NOTHING;

-- ============================================
-- TABLE: captured_moments
-- Stores significant therapeutic moments detected during sessions
-- ============================================

CREATE TABLE IF NOT EXISTS public.captured_moments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,

  -- Moment classification
  moment_type TEXT NOT NULL CHECK (moment_type IN (
    'origin_story',
    'rationalization',
    'insight',
    'emotional_breakthrough',
    'real_world_observation',
    'identity_statement',
    'commitment',
    'fear_resistance'
  )),

  -- Content
  transcript TEXT NOT NULL,  -- Stored verbatim from STT, no cleanup
  audio_clip_path TEXT,  -- Path in Supabase Storage (only for confidence >= 0.85)
  audio_duration_ms INTEGER,  -- NULL if no audio

  -- Context
  myth_key TEXT REFERENCES public.myths(myth_key),
  session_type TEXT CHECK (session_type IN ('core', 'check_in', 'ceremony', 'reinforcement')),
  myth_layer TEXT CHECK (myth_layer IN ('intellectual', 'emotional', 'identity')),

  -- Quality signals
  confidence_score FLOAT DEFAULT 0.8 CHECK (confidence_score BETWEEN 0 AND 1),
  emotional_valence TEXT CHECK (emotional_valence IN ('positive', 'negative', 'neutral', 'mixed')),
  is_user_highlighted BOOLEAN DEFAULT FALSE,  -- Deferred: user-highlighting not in MVP

  -- Usage tracking (deferred for MVP)
  times_played_back INTEGER DEFAULT 0,
  last_used_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TABLE: conviction_assessments
-- Stores conviction assessment results per session
-- ============================================

CREATE TABLE IF NOT EXISTS public.conviction_assessments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,

  -- Context
  myth_key TEXT REFERENCES public.myths(myth_key) NOT NULL,
  myth_layer TEXT CHECK (myth_layer IN ('intellectual', 'emotional', 'identity')),

  -- Assessment results
  conviction_score INTEGER NOT NULL CHECK (conviction_score BETWEEN 0 AND 10),
  delta INTEGER NOT NULL,  -- Change from previous
  recommended_next_step TEXT CHECK (recommended_next_step IN ('deepen', 'move_on', 'revisit_later')),
  reasoning TEXT,  -- LLM's reasoning (stored for post-launch analysis)

  -- Enrichment: new triggers/stakes discovered this session
  new_triggers TEXT[],  -- New triggers discovered from conversation
  new_stakes TEXT[],    -- New personal stakes discovered

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TABLE: user_story
-- Structured storage for the user's personal narrative and belief state
-- ============================================

CREATE TABLE IF NOT EXISTS public.user_story (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,

  -- Origin story
  origin_summary TEXT,  -- AI-generated summary of how they started
  origin_moment_ids UUID[],  -- References to captured origin story fragments

  -- Key contextual factors (initialized from intake, enriched by LLM after each conversation)
  primary_triggers TEXT[],  -- Derived from intake + conversations
  personal_stakes TEXT[],  -- Kids, health, career, etc.

  -- Current belief state per myth (snapshot of latest conviction per myth)
  -- Updated after each conviction assessment
  stress_relief_conviction INTEGER DEFAULT 0 CHECK (stress_relief_conviction BETWEEN 0 AND 10),
  stress_relief_key_insight_id UUID,
  stress_relief_resistance_notes TEXT,

  pleasure_conviction INTEGER DEFAULT 0 CHECK (pleasure_conviction BETWEEN 0 AND 10),
  pleasure_key_insight_id UUID,
  pleasure_resistance_notes TEXT,

  willpower_conviction INTEGER DEFAULT 0 CHECK (willpower_conviction BETWEEN 0 AND 10),
  willpower_key_insight_id UUID,
  willpower_resistance_notes TEXT,

  focus_conviction INTEGER DEFAULT 0 CHECK (focus_conviction BETWEEN 0 AND 10),
  focus_key_insight_id UUID,
  focus_resistance_notes TEXT,

  identity_conviction INTEGER DEFAULT 0 CHECK (identity_conviction BETWEEN 0 AND 10),
  identity_key_insight_id UUID,
  identity_resistance_notes TEXT,

  -- Aggregate state
  overall_readiness INTEGER DEFAULT 0 CHECK (overall_readiness BETWEEN 0 AND 10),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add FK constraints for key_insight_ids after captured_moments table exists
ALTER TABLE public.user_story
ADD CONSTRAINT fk_stress_relief_insight FOREIGN KEY (stress_relief_key_insight_id) REFERENCES public.captured_moments(id) ON DELETE SET NULL,
ADD CONSTRAINT fk_pleasure_insight FOREIGN KEY (pleasure_key_insight_id) REFERENCES public.captured_moments(id) ON DELETE SET NULL,
ADD CONSTRAINT fk_willpower_insight FOREIGN KEY (willpower_key_insight_id) REFERENCES public.captured_moments(id) ON DELETE SET NULL,
ADD CONSTRAINT fk_focus_insight FOREIGN KEY (focus_key_insight_id) REFERENCES public.captured_moments(id) ON DELETE SET NULL,
ADD CONSTRAINT fk_identity_insight FOREIGN KEY (identity_key_insight_id) REFERENCES public.captured_moments(id) ON DELETE SET NULL;

-- ============================================
-- TABLE: check_in_schedule
-- Manages the timing and state of micro check-ins
-- ============================================

CREATE TABLE IF NOT EXISTS public.check_in_schedule (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Timing
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'America/New_York',

  -- Type and context
  check_in_type TEXT NOT NULL CHECK (check_in_type IN (
    'post_session',
    'morning',
    'evening'
  )),
  trigger_myth_key TEXT REFERENCES public.myths(myth_key),
  trigger_session_id UUID REFERENCES public.conversations(id),

  -- Content
  prompt_template TEXT NOT NULL,
  personalization_context JSONB,  -- Injected user data for this check-in

  -- State
  status TEXT DEFAULT 'scheduled' CHECK (status IN (
    'scheduled',
    'sent',
    'opened',
    'completed',
    'skipped',
    'expired'
  )),

  -- Auth token for magic link (24-hour validity)
  magic_link_token TEXT,

  -- Delivery tracking
  email_sent_at TIMESTAMP WITH TIME ZONE,
  opened_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  expired_at TIMESTAMP WITH TIME ZONE,
  response_conversation_id UUID REFERENCES public.conversations(id),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TABLE: ceremony_artifacts
-- Stores generated ceremony content and persistent user artifacts
-- ============================================

CREATE TABLE IF NOT EXISTS public.ceremony_artifacts (
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

  -- Metadata
  ceremony_completed_at TIMESTAMP WITH TIME ZONE,

  -- Artifacts are immutable once generated
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TABLE: follow_up_schedule
-- Manages post-ceremony check-ins (Day 3, 7, 14, 30, 90, 180, 365)
-- ============================================

CREATE TABLE IF NOT EXISTS public.follow_up_schedule (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Timing
  milestone_type TEXT NOT NULL CHECK (milestone_type IN (
    'day_3', 'day_7', 'day_14', 'day_30',
    'day_90', 'day_180', 'day_365'
  )),
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  timezone TEXT NOT NULL,

  -- Auth token for magic link (24-hour validity)
  magic_link_token TEXT,

  -- State
  status TEXT DEFAULT 'scheduled' CHECK (status IN (
    'scheduled', 'sent', 'completed', 'skipped'
  )),

  -- Response
  response_conversation_id UUID REFERENCES public.conversations(id),
  completed_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- ALTER: user_progress
-- Add enhanced tracking fields for core program
-- ============================================

ALTER TABLE public.user_progress
ADD COLUMN IF NOT EXISTS current_myth_key TEXT REFERENCES public.myths(myth_key),
ADD COLUMN IF NOT EXISTS current_layer TEXT DEFAULT 'intellectual'
  CHECK (current_layer IN ('intellectual', 'emotional', 'identity')),
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/New_York',
ADD COLUMN IF NOT EXISTS ceremony_completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS ceremony_skipped_final_dose BOOLEAN DEFAULT FALSE;

-- ============================================
-- ALTER: conversations
-- Add session type and layer tracking
-- ============================================

ALTER TABLE public.conversations
ADD COLUMN IF NOT EXISTS session_type TEXT DEFAULT 'core'
  CHECK (session_type IN ('core', 'check_in', 'ceremony', 'reinforcement')),
ADD COLUMN IF NOT EXISTS myth_key TEXT REFERENCES public.myths(myth_key),
ADD COLUMN IF NOT EXISTS myth_layer TEXT CHECK (myth_layer IN ('intellectual', 'emotional', 'identity')),
ADD COLUMN IF NOT EXISTS check_in_id UUID REFERENCES public.check_in_schedule(id),
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all new tables
ALTER TABLE public.captured_moments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conviction_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_story ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.check_in_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ceremony_artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follow_up_schedule ENABLE ROW LEVEL SECURITY;

-- Policies for captured_moments
CREATE POLICY "Users can read own moments"
  ON public.captured_moments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own moments"
  ON public.captured_moments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own moments"
  ON public.captured_moments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own moments"
  ON public.captured_moments FOR DELETE
  USING (auth.uid() = user_id);

-- Policies for conviction_assessments
CREATE POLICY "Users can read own assessments"
  ON public.conviction_assessments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can create assessments"
  ON public.conviction_assessments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policies for user_story
CREATE POLICY "Users can read own story"
  ON public.user_story FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own story"
  ON public.user_story FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own story"
  ON public.user_story FOR UPDATE
  USING (auth.uid() = user_id);

-- Policies for check_in_schedule
CREATE POLICY "Users can read own check-ins"
  ON public.check_in_schedule FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own check-ins"
  ON public.check_in_schedule FOR UPDATE
  USING (auth.uid() = user_id);

-- Policies for ceremony_artifacts
CREATE POLICY "Users can read own artifacts"
  ON public.ceremony_artifacts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own artifacts"
  ON public.ceremony_artifacts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policies for follow_up_schedule
CREATE POLICY "Users can read own follow-ups"
  ON public.follow_up_schedule FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================
-- INDEXES
-- ============================================

-- Indexes for captured_moments
CREATE INDEX IF NOT EXISTS idx_moments_user_id ON public.captured_moments(user_id);
CREATE INDEX IF NOT EXISTS idx_moments_user_myth ON public.captured_moments(user_id, myth_key);
CREATE INDEX IF NOT EXISTS idx_moments_user_type ON public.captured_moments(user_id, moment_type);
CREATE INDEX IF NOT EXISTS idx_moments_created ON public.captured_moments(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_moments_conversation ON public.captured_moments(conversation_id);

-- Indexes for conviction_assessments
CREATE INDEX IF NOT EXISTS idx_conviction_user ON public.conviction_assessments(user_id);
CREATE INDEX IF NOT EXISTS idx_conviction_user_myth ON public.conviction_assessments(user_id, myth_key);
CREATE INDEX IF NOT EXISTS idx_conviction_conversation ON public.conviction_assessments(conversation_id);

-- Indexes for check_in_schedule
CREATE INDEX IF NOT EXISTS idx_checkin_user_scheduled ON public.check_in_schedule(user_id, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_checkin_status ON public.check_in_schedule(status, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_checkin_user_status ON public.check_in_schedule(user_id, status);
CREATE INDEX IF NOT EXISTS idx_checkin_token ON public.check_in_schedule(magic_link_token);

-- Indexes for follow_up_schedule
CREATE INDEX IF NOT EXISTS idx_followup_user ON public.follow_up_schedule(user_id);
CREATE INDEX IF NOT EXISTS idx_followup_status ON public.follow_up_schedule(status, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_followup_token ON public.follow_up_schedule(magic_link_token);

-- Index for conversations myth_key
CREATE INDEX IF NOT EXISTS idx_conversations_myth_key ON public.conversations(myth_key);
CREATE INDEX IF NOT EXISTS idx_conversations_session_type ON public.conversations(session_type);

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE public.myths IS 'Reference table for the 5 myths in the cessation program';
COMMENT ON TABLE public.captured_moments IS 'Stores significant therapeutic moments detected during sessions';
COMMENT ON TABLE public.conviction_assessments IS 'Tracks conviction assessment results per completed session';
COMMENT ON TABLE public.user_story IS 'Structured storage for user narrative and belief state per myth';
COMMENT ON TABLE public.check_in_schedule IS 'Manages timing and state of micro check-ins';
COMMENT ON TABLE public.ceremony_artifacts IS 'Stores generated ceremony content and persistent user artifacts';
COMMENT ON TABLE public.follow_up_schedule IS 'Manages post-ceremony check-ins at milestone days';

COMMENT ON COLUMN public.captured_moments.moment_type IS 'Classification of the therapeutic moment type';
COMMENT ON COLUMN public.captured_moments.transcript IS 'Verbatim text from user, no cleanup applied';
COMMENT ON COLUMN public.captured_moments.confidence_score IS 'LLM confidence in moment detection (0.7+ to capture, 0.85+ for audio)';
COMMENT ON COLUMN public.user_story.primary_triggers IS 'Initialized from intake, enriched after each conversation';
COMMENT ON COLUMN public.check_in_schedule.magic_link_token IS '24-hour validity token for email links';
COMMENT ON COLUMN public.user_progress.current_myth_key IS 'Current myth using snake_case key (stress_relief, pleasure, etc.)';
COMMENT ON COLUMN public.user_progress.current_layer IS 'Current layer within myth (intellectual, emotional, identity)';
COMMENT ON COLUMN public.conversations.session_type IS 'Type of session (core, check_in, ceremony, reinforcement)';
COMMENT ON COLUMN public.conversations.completed_at IS 'Set when [SESSION_COMPLETE] token detected';
