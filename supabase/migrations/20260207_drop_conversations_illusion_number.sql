-- Phase 6: Remove legacy conversations.illusion_number column
-- Prerequisite: all rows with illusion_number must already have illusion_key populated.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.conversations
    WHERE illusion_number IS NOT NULL
      AND illusion_key IS NULL
  ) THEN
    RAISE EXCEPTION
      'Cannot drop conversations.illusion_number: found rows with illusion_number but no illusion_key. Run backfill first.';
  END IF;
END $$;

ALTER TABLE public.conversations
DROP COLUMN IF EXISTS illusion_number;

COMMENT ON TABLE public.conversations IS
  'Chat conversations. illusion_key identifies which illusion the session addresses.';
