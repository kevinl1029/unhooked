-- v2.1: Tier-1 consistency linkage hardening

ALTER TABLE public.user_progress
ADD COLUMN IF NOT EXISTS precomputed_opening_payload_hash TEXT DEFAULT NULL;

COMMENT ON COLUMN public.user_progress.precomputed_opening_payload_hash IS
  'Deterministic linkage hash for precomputed opening text/audio pair; Tier 1 is eligible only when row/audio metadata hashes match.';
