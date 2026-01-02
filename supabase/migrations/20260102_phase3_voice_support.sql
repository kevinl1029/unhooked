-- Phase 3: Voice Interface Support Migration
-- Created: 2026-01-02
-- Description: Adds voice/audio modality support to messages table

-- ============================================
-- ALTER: messages
-- Add input modality and metadata for voice
-- ============================================

-- input_modality: How the user input was captured
-- 'text' = typed text (default, backwards compatible)
-- 'voice' = voice recording transcribed via STT
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS input_modality TEXT DEFAULT 'text';

-- metadata: JSON blob for voice-specific data
-- For voice messages, stores:
-- {
--   "audio_duration_ms": 3500,
--   "transcription_confidence": 0.95,
--   "tts_voice": "nova",
--   "word_timings": [{"word": "Hello", "start": 0, "end": 200}, ...]
-- }
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT NULL;

-- ============================================
-- INDEXES
-- ============================================

-- Index for filtering by modality (useful for analytics)
CREATE INDEX IF NOT EXISTS idx_messages_input_modality ON public.messages(input_modality);

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON COLUMN public.messages.input_modality IS 'How the message was input: text (default) or voice';
COMMENT ON COLUMN public.messages.metadata IS 'JSON metadata for voice messages (duration, confidence, word timings, etc.)';
