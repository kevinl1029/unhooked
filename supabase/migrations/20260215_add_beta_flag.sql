-- Add is_beta column to profiles table with write protection
-- This migration adds a beta flag to allow manually flagged users to bypass APP_MODE gate

-- Add the is_beta column
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_beta BOOLEAN NOT NULL DEFAULT false;

-- Create trigger function to protect is_beta from unauthorized changes
CREATE OR REPLACE FUNCTION public.protect_is_beta()
RETURNS TRIGGER AS $$
DECLARE
  claims_text text;
BEGIN
  IF NEW.is_beta IS DISTINCT FROM OLD.is_beta THEN
    claims_text := current_setting('request.jwt.claims', true);
    -- Allow if no JWT context (direct DB connection, e.g. Supabase dashboard)
    IF claims_text IS NOT NULL AND claims_text != '' THEN
      -- Block if caller is not service_role
      IF (claims_text::json ->> 'role') != 'service_role' THEN
        NEW.is_beta := OLD.is_beta;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to execute protection function
CREATE TRIGGER protect_is_beta_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_is_beta();

-- Wire up profile auto-creation on user signup
-- The handle_new_user() function exists (from baseline schema) but the trigger
-- was never included in a migration file. Discovered during beta deployment
-- when Google SSO signups weren't creating profile rows.
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
