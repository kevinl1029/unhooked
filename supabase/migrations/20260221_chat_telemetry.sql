-- Chat pipeline telemetry table
-- Captures one row per streaming+TTS request attempt for latency analysis

CREATE TABLE IF NOT EXISTS public.chat_telemetry (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL,
  stream_start_time TIMESTAMPTZ,
  ttft_ms INTEGER,
  ttfs_ms INTEGER,
  ttfa_ms INTEGER,
  tts_total_ms INTEGER,
  duration_ms INTEGER,
  llm_provider TEXT NOT NULL,
  llm_model TEXT NOT NULL,
  tts_provider TEXT NOT NULL,
  tts_voice TEXT NOT NULL,
  tts_mode TEXT NOT NULL,
  session_type TEXT NOT NULL,
  user_id UUID NOT NULL,
  conversation_id UUID NOT NULL,
  message_id UUID,
  request_id TEXT NOT NULL,
  token_count INTEGER,
  sentence_count INTEGER,
  is_session_start BOOLEAN NOT NULL,
  status TEXT NOT NULL,
  error_type TEXT,
  resilience_attempt INTEGER,
  resilience_route TEXT
);

COMMENT ON TABLE public.chat_telemetry IS 'Pipeline latency telemetry for streaming+TTS voice sessions';
COMMENT ON COLUMN public.chat_telemetry.created_at IS 'Request start time (set by application, not DB default)';
COMMENT ON COLUMN public.chat_telemetry.stream_start_time IS 'When LLM streaming began. Pre-stream overhead = stream_start_time - created_at';
COMMENT ON COLUMN public.chat_telemetry.ttft_ms IS 'Time-to-first-token: ms from stream start to first onToken callback';
COMMENT ON COLUMN public.chat_telemetry.ttfs_ms IS 'Time-to-first-sentence: ms from stream start to first complete sentence';
COMMENT ON COLUMN public.chat_telemetry.ttfa_ms IS 'Time-to-first-audio: ms from stream start to first audio chunk written';
COMMENT ON COLUMN public.chat_telemetry.tts_total_ms IS 'Total TTS time: ms from stream start to last audio chunk';
COMMENT ON COLUMN public.chat_telemetry.duration_ms IS 'Full request duration: ms from request start to stream completion';
COMMENT ON COLUMN public.chat_telemetry.error_type IS 'Sanitized error code (e.g., LLM_TIMEOUT). Never contains user content';

-- Indexes for common query patterns
CREATE INDEX idx_chat_telemetry_created_at ON public.chat_telemetry (created_at);
CREATE INDEX idx_chat_telemetry_tts_provider ON public.chat_telemetry (tts_provider);
CREATE INDEX idx_chat_telemetry_llm_provider ON public.chat_telemetry (llm_provider);
CREATE INDEX idx_chat_telemetry_session_type ON public.chat_telemetry (session_type);
CREATE INDEX idx_chat_telemetry_user_id ON public.chat_telemetry (user_id);

-- RLS: enabled with no anon policies (service_role bypasses)
ALTER TABLE public.chat_telemetry ENABLE ROW LEVEL SECURITY;
