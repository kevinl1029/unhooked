-- Phase 4D: Follow-up Schedule
-- Manages post-ceremony check-ins (Day 3, 7, 14, 30, 90, 180, 365)
-- Follow-up milestones are calculated from ceremony_completed_at

CREATE TABLE public.follow_up_schedule (
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
  token_expires_at TIMESTAMP WITH TIME ZONE,

  -- State
  status TEXT DEFAULT 'scheduled' CHECK (status IN (
    'scheduled', 'sent', 'completed', 'skipped', 'expired'
  )),

  -- Personalization
  prompt TEXT,                 -- AI-generated personalized prompt

  -- Tracking
  sent_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  skipped_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure one follow-up per milestone per user
  UNIQUE(user_id, milestone_type)
);

-- RLS
ALTER TABLE public.follow_up_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own follow-ups"
  ON public.follow_up_schedule FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own follow-ups"
  ON public.follow_up_schedule FOR UPDATE
  USING (auth.uid() = user_id);

-- Service role can insert (scheduled by system)
CREATE POLICY "Service can create follow-ups"
  ON public.follow_up_schedule FOR INSERT
  WITH CHECK (true);

-- Indexes
CREATE INDEX idx_follow_up_user_id ON public.follow_up_schedule(user_id);
CREATE INDEX idx_follow_up_status ON public.follow_up_schedule(status);
CREATE INDEX idx_follow_up_scheduled ON public.follow_up_schedule(scheduled_for) WHERE status = 'scheduled';
CREATE INDEX idx_follow_up_token ON public.follow_up_schedule(magic_link_token) WHERE magic_link_token IS NOT NULL;

-- Comment on table
COMMENT ON TABLE public.follow_up_schedule IS 'Post-ceremony follow-up check-ins at milestone intervals';
