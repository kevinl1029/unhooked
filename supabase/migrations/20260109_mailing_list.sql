-- Migration: Mailing List Table
-- Description: Store email signups from landing page for marketing and launch communications
-- Spec: unhooked-mailing-list-spec-v1_2.md

-- Create mailing list table
CREATE TABLE public.mailing_list (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  source TEXT DEFAULT 'landing_page',
  subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  unsubscribed_at TIMESTAMP WITH TIME ZONE,
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Email health tracking (scaffolded for future bounce webhook)
  email_status TEXT DEFAULT 'active' CHECK (email_status IN ('active', 'bounced', 'complained')),
  bounce_type TEXT,  -- 'hard' or 'soft'
  status_updated_at TIMESTAMP WITH TIME ZONE
);

-- Create index for email lookups
CREATE INDEX idx_mailing_list_email ON public.mailing_list(email);

-- Enable Row Level Security
ALTER TABLE public.mailing_list ENABLE ROW LEVEL SECURITY;

-- Policy: Only service role can access (API endpoint uses service key)
-- No public access needed - this is admin/API only
CREATE POLICY "Service role full access"
  ON public.mailing_list
  FOR ALL
  USING (auth.role() = 'service_role');
