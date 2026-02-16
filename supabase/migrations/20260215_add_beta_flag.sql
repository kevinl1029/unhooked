-- Add is_beta column to profiles table with write protection
-- This migration adds a beta flag to allow manually flagged users to bypass APP_MODE gate

-- Add the is_beta column
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_beta BOOLEAN NOT NULL DEFAULT false;

-- Create trigger function to protect is_beta from unauthorized changes
CREATE OR REPLACE FUNCTION public.protect_is_beta()
RETURNS TRIGGER AS $$
BEGIN
  -- Only service_role can modify is_beta
  -- All other callers have changes silently reverted
  IF (request.jwt.claims->>'role') IS DISTINCT FROM 'service_role' THEN
    NEW.is_beta := OLD.is_beta;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to execute protection function
CREATE TRIGGER protect_is_beta_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_is_beta();
