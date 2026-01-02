-- Phase 2: Program Structure Migration
-- Created: 2026-01-01
-- Description: Adds intake, progress tracking, and myth session support

-- ============================================
-- TABLE: user_intake
-- Stores onboarding intake responses
-- ============================================

CREATE TABLE IF NOT EXISTS public.user_intake (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,

  -- Nicotine use details
  product_types TEXT[] NOT NULL,  -- ['vape', 'cigarettes', 'pouches', 'chew', 'other']
  usage_frequency TEXT NOT NULL,  -- 'multiple_daily', 'daily', 'several_weekly', 'occasional'
  years_using INTEGER,            -- OPTIONAL

  -- Quit history
  previous_attempts INTEGER DEFAULT 0,      -- OPTIONAL
  longest_quit_duration TEXT,               -- 'never', 'hours', 'days', 'weeks', 'months', 'year_plus' -- OPTIONAL

  -- Primary driver (maps to first myth)
  primary_reason TEXT NOT NULL,  -- 'stress', 'pleasure', 'fear', 'focus', 'identity'

  -- Additional context
  triggers TEXT[],  -- ['stress', 'social', 'boredom', 'morning', 'after_meals', 'driving', 'alcohol', 'work_breaks'] -- OPTIONAL

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TABLE: user_progress
-- Tracks program progress and completion
-- ============================================

CREATE TABLE IF NOT EXISTS public.user_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,

  -- Program state
  program_status TEXT DEFAULT 'not_started',  -- 'not_started', 'in_progress', 'completed'
  current_myth INTEGER DEFAULT 1,             -- 1-5, suggested next myth
  myth_order INTEGER[] DEFAULT ARRAY[1,2,3,4,5],  -- personalized order based on intake

  -- Completion tracking
  myths_completed INTEGER[] DEFAULT ARRAY[]::INTEGER[],  -- which myths are done

  -- Session tracking
  total_sessions INTEGER DEFAULT 0,

  -- Future hooks
  last_reminded_at TIMESTAMP WITH TIME ZONE,  -- For future reminder system

  -- Timestamps
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  last_session_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- ALTER: conversations
-- Add myth tracking and completion status
-- ============================================

ALTER TABLE public.conversations
ADD COLUMN IF NOT EXISTS myth_number INTEGER,
ADD COLUMN IF NOT EXISTS session_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS session_abandoned_at TIMESTAMP WITH TIME ZONE;

-- ============================================
-- ALTER: messages
-- Add analytics metadata
-- ============================================

ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS message_length INTEGER,
ADD COLUMN IF NOT EXISTS time_since_last_message INTEGER;  -- seconds since previous message in conversation

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on new tables
ALTER TABLE public.user_intake ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;

-- Policies for user_intake
CREATE POLICY "Users can read own intake"
  ON public.user_intake FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own intake"
  ON public.user_intake FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own intake"
  ON public.user_intake FOR UPDATE
  USING (auth.uid() = user_id);

-- Policies for user_progress
CREATE POLICY "Users can read own progress"
  ON public.user_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own progress"
  ON public.user_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress"
  ON public.user_progress FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_user_intake_user_id ON public.user_intake(user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_user_id ON public.user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_myth ON public.conversations(myth_number);
CREATE INDEX IF NOT EXISTS idx_conversations_user_myth ON public.conversations(user_id, myth_number);

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE public.user_intake IS 'Stores user onboarding intake responses for personalization';
COMMENT ON TABLE public.user_progress IS 'Tracks user progress through the 5-myth cessation program';
COMMENT ON COLUMN public.conversations.myth_number IS 'Which myth (1-5) this conversation is about';
COMMENT ON COLUMN public.conversations.session_completed IS 'Whether AI marked this session as complete with [SESSION_COMPLETE] token';
COMMENT ON COLUMN public.conversations.session_abandoned_at IS 'When user exited without completing (if applicable)';
COMMENT ON COLUMN public.messages.message_length IS 'Character count of message content';
COMMENT ON COLUMN public.messages.time_since_last_message IS 'Seconds since previous message in this conversation';
