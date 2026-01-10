-- Phase 4A: Storage Buckets Configuration
-- Created: 2026-01-09
-- Description: Creates storage buckets for audio clips and ceremony artifacts
-- NOTE: This migration needs to be run via Supabase dashboard or CLI
--       as storage bucket creation requires storage admin privileges

-- ============================================
-- STORAGE BUCKETS
-- ============================================

-- Create buckets (run via Supabase dashboard Storage settings)
-- Bucket: captured-moments (private, RLS-protected)
-- Bucket: ceremony-artifacts (private, RLS-protected)
-- Bucket: final-recordings (private, RLS-protected)

-- Storage Structure:
-- captured-moments/
-- └── {user_id}/
--     └── {moment_id}.webm
--
-- ceremony-artifacts/
-- └── {user_id}/
--     ├── journey-segments/
--     │   ├── segment-001.mp3
--     │   └── ...
--     └── ceremony-{timestamp}.mp3
--
-- final-recordings/
-- └── {user_id}/
--     └── final-recording.webm

-- ============================================
-- STORAGE POLICIES (via SQL)
-- These can be applied after bucket creation
-- ============================================

-- Policy for captured-moments bucket
-- Users can only access their own files
INSERT INTO storage.policies (name, bucket_id, definition)
SELECT
  'Users can read own moment clips',
  id,
  '(bucket_id = ''captured-moments'' AND auth.uid()::text = (storage.foldername(name))[1])'
FROM storage.buckets WHERE name = 'captured-moments'
ON CONFLICT DO NOTHING;

INSERT INTO storage.policies (name, bucket_id, definition, operation)
SELECT
  'Users can upload own moment clips',
  id,
  '(bucket_id = ''captured-moments'' AND auth.uid()::text = (storage.foldername(name))[1])',
  'INSERT'
FROM storage.buckets WHERE name = 'captured-moments'
ON CONFLICT DO NOTHING;

INSERT INTO storage.policies (name, bucket_id, definition, operation)
SELECT
  'Users can delete own moment clips',
  id,
  '(bucket_id = ''captured-moments'' AND auth.uid()::text = (storage.foldername(name))[1])',
  'DELETE'
FROM storage.buckets WHERE name = 'captured-moments'
ON CONFLICT DO NOTHING;

-- Policy for ceremony-artifacts bucket
INSERT INTO storage.policies (name, bucket_id, definition)
SELECT
  'Users can read own ceremony artifacts',
  id,
  '(bucket_id = ''ceremony-artifacts'' AND auth.uid()::text = (storage.foldername(name))[1])'
FROM storage.buckets WHERE name = 'ceremony-artifacts'
ON CONFLICT DO NOTHING;

INSERT INTO storage.policies (name, bucket_id, definition, operation)
SELECT
  'Users can upload own ceremony artifacts',
  id,
  '(bucket_id = ''ceremony-artifacts'' AND auth.uid()::text = (storage.foldername(name))[1])',
  'INSERT'
FROM storage.buckets WHERE name = 'ceremony-artifacts'
ON CONFLICT DO NOTHING;

-- Policy for final-recordings bucket
INSERT INTO storage.policies (name, bucket_id, definition)
SELECT
  'Users can read own final recordings',
  id,
  '(bucket_id = ''final-recordings'' AND auth.uid()::text = (storage.foldername(name))[1])'
FROM storage.buckets WHERE name = 'final-recordings'
ON CONFLICT DO NOTHING;

INSERT INTO storage.policies (name, bucket_id, definition, operation)
SELECT
  'Users can upload own final recordings',
  id,
  '(bucket_id = ''final-recordings'' AND auth.uid()::text = (storage.foldername(name))[1])',
  'INSERT'
FROM storage.buckets WHERE name = 'final-recordings'
ON CONFLICT DO NOTHING;

INSERT INTO storage.policies (name, bucket_id, definition, operation)
SELECT
  'Users can update own final recordings',
  id,
  '(bucket_id = ''final-recordings'' AND auth.uid()::text = (storage.foldername(name))[1])',
  'UPDATE'
FROM storage.buckets WHERE name = 'final-recordings'
ON CONFLICT DO NOTHING;
