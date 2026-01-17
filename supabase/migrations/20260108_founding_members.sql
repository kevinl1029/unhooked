-- Migration: Create founding_members table for Stripe market validation
-- PR3: Email Integration

-- Create founding_members table
CREATE TABLE public.founding_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Stripe data
  stripe_session_id TEXT UNIQUE NOT NULL,
  stripe_customer_id TEXT,
  stripe_payment_intent_id TEXT,

  -- Customer info (from Stripe)
  email TEXT NOT NULL,
  name TEXT,

  -- Payment details
  amount_paid INTEGER NOT NULL,  -- in cents
  currency TEXT DEFAULT 'usd',
  paid_at TIMESTAMP WITH TIME ZONE NOT NULL,

  -- Attribution (UTM tracking)
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_term TEXT,
  utm_content TEXT,

  -- Conversion tracking
  landing_page_variant TEXT,      -- For future A/B testing
  referrer TEXT,                  -- Original referrer URL

  -- Future: link to user account when app launches
  converted_to_user_id UUID REFERENCES auth.users(id),
  converted_at TIMESTAMP WITH TIME ZONE,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Email status
  welcome_email_sent BOOLEAN DEFAULT FALSE,
  welcome_email_sent_at TIMESTAMP WITH TIME ZONE
);

-- Index for common queries
CREATE INDEX idx_founding_members_email ON public.founding_members(email);
CREATE INDEX idx_founding_members_paid_at ON public.founding_members(paid_at);
CREATE INDEX idx_founding_members_utm_source ON public.founding_members(utm_source);

-- RLS policies
ALTER TABLE public.founding_members ENABLE ROW LEVEL SECURITY;

-- Only service role can access (webhook uses service role)
-- No user-facing access needed for now
CREATE POLICY "Service role full access"
  ON public.founding_members
  FOR ALL
  USING (auth.role() = 'service_role');
