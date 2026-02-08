-- One-time helper for Phase 6 preparation.
-- Backfill conversations.illusion_key from conversations.illusion_number where missing.
-- Run this BEFORE applying the migration that drops illusion_number.

UPDATE public.conversations
SET illusion_key = CASE illusion_number
  WHEN 1 THEN 'stress_relief'
  WHEN 2 THEN 'pleasure'
  WHEN 3 THEN 'willpower'
  WHEN 4 THEN 'focus'
  WHEN 5 THEN 'identity'
  ELSE NULL
END
WHERE illusion_number IS NOT NULL
  AND illusion_key IS NULL;

-- Verification query:
-- SELECT COUNT(*) AS rows_missing_key
-- FROM public.conversations
-- WHERE illusion_number IS NOT NULL
--   AND illusion_key IS NULL;
