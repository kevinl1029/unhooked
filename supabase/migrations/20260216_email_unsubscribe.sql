-- Add email_unsubscribed_at column to user_progress
-- NULL = subscribed (default), timestamp = unsubscribed

ALTER TABLE public.user_progress
ADD COLUMN IF NOT EXISTS email_unsubscribed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
