# Chat Telemetry Spec

**Version:** 1.3
**Created:** 2026-02-21
**Status:** Implementation Ready
**Document Type:** Product & Technical Specification

---

## Overview

### Problem

When a user engages in a voice coaching session in Unhooked, the pipeline from user input to coach audio involves multiple external services in sequence: an LLM call to generate text, sentence detection to buffer complete thoughts, and a TTS provider to synthesize speech. Each stage adds latency, and the total time-to-first-audio has been growing noticeably.

The problem is that there is no way to quantify this. The codebase already captures timing data — `ttfaMs`, `totalTtsMs`, `durationMs` — but it all goes to `console.log` and is lost after the request completes. Vercel captures these logs, but they're unstructured, unsearchable over time, and impossible to aggregate or trend.

This makes it impossible to:
- **Establish a baseline** — what is the actual latency today?
- **Compare providers** — is InWorld TTS faster than Groq TTS? Does Gemini respond faster than Groq LLM?
- **Detect regressions** — did a config change last week make things slower?
- **Identify bottlenecks** — is the LLM, the sentence detection, or the TTS the dominant source of delay?
- **Measure improvements** — when optimizations are made (e.g., instant-conversations pre-stored audio), how much did they actually help?

With multiple LLM providers (Groq, Gemini) and multiple TTS providers (Groq, OpenAI, ElevenLabs, InWorld) that may change via configuration at any time, the lack of persistent, queryable telemetry blocks informed decision-making about the most impactful latency improvements.

### Goals

**Primary goal:**
- Establish persistent, queryable telemetry for the chat/TTS pipeline so that latency can be measured, compared across providers, and tracked over time

**Secondary goals:**
- Enable pipeline stage breakdown — identify whether latency is dominated by the LLM, sentence detection, or TTS synthesis for any given configuration
- Provide a data foundation for setting latency targets — establish a baseline before defining what "good" looks like
- Support validation of future optimizations — when instant-conversations or other improvements ship, telemetry should clearly show the before/after impact

### Non-Goals

- **Visual dashboard UI** — the developer will query Supabase SQL directly. A dashboard may come later but is not part of this work.
- **Automated alerting** — no notifications or threshold-based alerts. Manual querying is sufficient at current scale.
- **Client-side timing** — measuring the gap between server audio delivery and actual user-heard playback. This is device-dependent and not actionable at this stage.
- **OpenTelemetry or third-party APM** — no external observability platforms (Datadog, Grafana, etc.). Supabase is the data store.
- **Per-sentence granular timing** — individual sentence synthesis times are not captured as separate rows. The aggregate TTS total per request is sufficient.
- **Non-streaming request telemetry** — only streaming + TTS requests (voice sessions) are instrumented. Non-streaming/text-only requests are excluded.

### Success Metrics

| Metric | Target | How Measured |
|--------|--------|--------------|
| Telemetry capture rate | 100% of streaming+TTS chat requests produce a telemetry row | Query `chat_telemetry` count vs. `messages` count for a time window |
| Baseline established | Can report average TTFA, TTFT, and pipeline stage breakdown within 1 week of deployment | SQL query against `chat_telemetry` with at least 50 data points |
| Provider comparison | Can compare avg latency metrics across different LLM and TTS provider configurations | SQL query grouping by `llm_provider` and `tts_provider` |
| Regression detection | Can identify latency changes within 1 day of a configuration change | SQL query comparing metrics before/after a timestamp |
| Zero performance impact | Telemetry collection does not add measurable latency to the chat/audio delivery pipeline | Fire-and-forget write pattern; no `await` on the telemetry INSERT in the response path |

---

## Solution

### Summary

Add a `chat_telemetry` table to Supabase that captures one row per streaming+TTS chat request attempt (including resilience retries). Each row records timing breakdowns for every stage of the pipeline (LLM time-to-first-token, time-to-first-sentence, time-to-first-audio, TTS total, full duration) alongside provider/model configuration, resilience context, and session metadata. The data is written via a fire-and-forget Supabase INSERT after the stream completes or errors, ensuring zero impact on the user-facing audio delivery. The developer queries the data directly via SQL to establish baselines, compare providers, and detect regressions.

### User Scenarios

#### Primary Scenario: Provider Comparison After Config Change

**User:** Developer (solo)
**Trigger:** Developer switches TTS provider from InWorld to Groq via environment variable and deploys.
**Flow:**
1. Developer changes `TTS_PROVIDER` config and deploys to production
2. Users have coaching sessions over the next 1-3 days, generating telemetry rows
3. Developer runs a SQL query: `SELECT tts_provider, AVG(ttfa_ms), AVG(tts_total_ms) FROM chat_telemetry WHERE created_at > '2026-02-20' GROUP BY tts_provider`
4. Developer sees a clear comparison: InWorld averaged 2,800ms TTFA, Groq averages 1,200ms TTFA
5. Developer decides to keep Groq based on data

**Outcome:** Informed, data-driven provider decision rather than gut feel.

#### Variant Scenario: Periodic Latency Review

**User:** Developer (solo)
**Trigger:** Weekly review cadence — developer checks if latency has drifted.
**Flow:**
1. Developer runs a weekly query: `SELECT DATE(created_at), AVG(ttfa_ms), AVG(ttft_ms) FROM chat_telemetry WHERE created_at > NOW() - INTERVAL '14 days' GROUP BY DATE(created_at) ORDER BY 1`
2. Sees a gradual increase in TTFT over the past week
3. Investigates — realizes the LLM provider had a degradation, or system prompts grew longer
4. Takes corrective action

**Outcome:** Regression caught before it becomes severe.

#### Variant Scenario: Validating Instant-Conversations Impact

**User:** Developer (solo)
**Trigger:** After implementing the instant-conversations feature (pre-stored audio for session start).
**Flow:**
1. Developer queries session-start turns specifically: `SELECT is_session_start, AVG(ttfa_ms) FROM chat_telemetry GROUP BY is_session_start`
2. Sees session-start TTFA dropped from ~3,500ms to ~400ms after instant-conversations shipped
3. Mid-conversation TTFA unchanged — confirms the optimization targeted the right thing

**Outcome:** Clear validation that the optimization worked, with data to prove it.

### UX Overview

#### Telemetry Table (Supabase)

- **What the developer sees:** A `chat_telemetry` table queryable via Supabase SQL Editor or any PostgreSQL client
- **What the developer can do:** Run arbitrary SQL queries to aggregate, filter, group, and trend latency data
- **Feedback:** Query results show timing breakdowns, provider comparisons, and temporal trends

<!-- UX-REFINED: Debug endpoint moved to Deferred/Future Enhancements — SQL queries are sufficient for v1 -->

### Key Requirements

<!-- REQ-REFINED: Complete schema definition with column types, timing zero-point, retry handling, PII policy, error sanitization, sample queries -->

#### Schema (REQ-1)

A `chat_telemetry` table exists in Supabase with the following complete schema:

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` | Primary key |
| `created_at` | `timestamptz` | NOT NULL | — | Request start time (set by application to `requestStartedAt`, not a DB default) |
| `stream_start_time` | `timestamptz` | YES | — | Timestamp when LLM streaming began. Pre-stream overhead = `stream_start_time - created_at` |
| `ttft_ms` | `integer` | YES | — | Time-to-first-token: ms from stream start to first `onToken` callback |
| `ttfs_ms` | `integer` | YES | — | Time-to-first-sentence: ms from stream start to first complete sentence emitted |
| `ttfa_ms` | `integer` | YES | — | Time-to-first-audio: ms from stream start to first audio chunk written to SSE stream |
| `tts_total_ms` | `integer` | YES | — | Total TTS synthesis time: ms from stream start to last audio chunk |
| `duration_ms` | `integer` | YES | — | Full request duration: ms from `requestStartedAt` to stream completion |
| `llm_provider` | `text` | NOT NULL | — | LLM provider identifier (e.g., `'groq'`, `'gemini'`) |
| `llm_model` | `text` | NOT NULL | — | LLM model name (e.g., `'openai/gpt-oss-20b'`, `'gemini-3-flash-preview'`) |
| `tts_provider` | `text` | NOT NULL | — | TTS provider identifier (e.g., `'groq'`, `'openai'`, `'elevenlabs'`, `'inworld'`) |
| `tts_voice` | `text` | NOT NULL | — | TTS voice identifier (e.g., `'troy'`, `'nova'`, `'Dennis'`) |
| `tts_mode` | `text` | NOT NULL | — | TTS streaming mode: `'sentence-batch'` or `'true-streaming'` (free text, no CHECK constraint) |
| `session_type` | `text` | NOT NULL | — | Session type: `'core'`, `'reinforcement'`, `'check_in'`, `'ceremony'` (free text, no CHECK constraint) |
| `user_id` | `uuid` | NOT NULL | — | User identifier. No foreign key constraint (decoupled from auth.users) |
| `conversation_id` | `uuid` | NOT NULL | — | Conversation identifier. No foreign key constraint (decoupled from conversations table) |
| `request_id` | `text` | NOT NULL | — | Matches `requestId` in existing console logs for correlation |
| `token_count` | `integer` | YES | — | Output token count (number of `onToken` callbacks) |
| `sentence_count` | `integer` | YES | — | Number of sentences emitted by sentence detector |
| `is_session_start` | `boolean` | NOT NULL | — | `true` when `messages.length === 0` (AI-first turn, no prior messages in conversation) |
| `status` | `text` | NOT NULL | — | `'success'` or `'error'` |
| `error_type` | `text` | YES | — | Sanitized error identifier (e.g., `'LLM_TIMEOUT'`, `'TTS_PROVIDER_ERROR'`, `'STREAM_INTERRUPTED'`). Never contains user content or prompt text |
| `resilience_attempt` | `integer` | YES | — | Retry attempt number (1, 2, 3). NULL for first/only attempts without retry context |
| `resilience_route` | `text` | YES | — | Retry route: `'primary'` or `'secondary'`. NULL when no retry context |

**Design decisions:**
- No foreign key constraints on `user_id` or `conversation_id` — telemetry is observability data, decoupled from transactional tables to prevent FK violations on fire-and-forget writes
- `tts_mode` and `session_type` are free text (no CHECK constraints) — new values can be added without migrations
- `error_message` renamed to `error_type` and stores sanitized error codes only — prevents user content or prompt text from leaking into telemetry
- `created_at` is set by the application (not `DEFAULT NOW()`) to reflect request start time, not telemetry write time

#### Capture Behavior (REQ-2, REQ-3)

- REQ-2: Every streaming+TTS chat request attempt produces exactly one telemetry row upon stream completion or stream error. This includes resilience retry attempts — each attempt to the server produces its own row with `resilience_attempt` and `resilience_route` populated. For errored streams, partial timing data is captured with NULL for metrics not yet recorded. Both TTS modes (`sentence-batch` and `true-streaming`) are in scope.
- REQ-3: Telemetry is written fire-and-forget — the INSERT is not awaited in the response stream. On write failure, a `console.error` is logged with the `request_id` and error details. A write failure does not affect the user experience.

#### Timing Metrics (REQ-4 through REQ-6, REQ-9)

All timing metrics are measured in milliseconds as integers, relative to `streamStartTime` (the moment LLM streaming begins), except `duration_ms` which is relative to `requestStartedAt` (handler entry).

- REQ-4: Time-to-first-token (TTFT) is captured by recording `Date.now()` on the first `onToken` callback from the LLM provider. Stored as `Date.now() - streamStartTime`.
- REQ-5: Time-to-first-sentence (TTFS) is captured when the sentence detector emits its first complete sentence (first non-empty return from `sentenceDetector.addToken()`). Stored as `Date.now() - streamStartTime`.
- REQ-6: Time-to-first-audio (TTFA) is captured when the first audio chunk with `audioBase64` is written to the SSE stream. Stored as `Date.now() - streamStartTime` (existing `firstChunkTime - streamStartTime` pattern).
- REQ-9: All timing values are in milliseconds as integers.

#### Context & Metadata (REQ-7, REQ-8)

- REQ-7: Each row includes all columns defined in the schema table above. `token_count` represents output tokens (count of `onToken` callbacks). `is_session_start` is determined by `messages.length === 0` (the existing `isNewConversation` variable in `chat.post.ts`).
- REQ-8: The `request_id` in telemetry rows matches the `requestId` used in existing console logs for correlation.

#### Indexes (REQ-10)

- REQ-10: The table has indexes for common query patterns:
  - `created_at` — time-range queries, trend analysis
  - `tts_provider` — provider comparison queries
  - `llm_provider` — provider comparison queries
  - `session_type` — session-type filtering
  - `user_id` — per-user analysis, account anonymization

#### Security (REQ-11)

- REQ-11: RLS is enabled on the `chat_telemetry` table with no policies for the anon role. The service_role key (used server-side) bypasses RLS. This prevents any client-side access as defense-in-depth.

#### Data Integrity (REQ-12)

- REQ-12: Timing values are stored as-is with no validation or clamping. Anomalous values (negative, extremely large) are filtered at query time, not at write time.

#### Privacy (REQ-13)

- REQ-13: When a user account is deleted, their telemetry rows must be anonymized by setting `user_id` to NULL. Since there are no foreign key constraints, this requires explicit handling in the account deletion flow (not yet implemented — deferred until account deletion feature is built). This preserves aggregate telemetry data for trend analysis while removing the PII link.

### Reference Queries

<!-- REQ-REFINED: Sample queries validating schema supports all use cases -->

These queries validate that the schema supports the defined success metrics and user scenarios. They also serve as developer reference.

**Baseline averages (excludes errors and NULLs):**
```sql
SELECT
  COUNT(*) AS total_requests,
  AVG(ttft_ms) AS avg_ttft,
  AVG(ttfs_ms) AS avg_ttfs,
  AVG(ttfa_ms) AS avg_ttfa,
  AVG(tts_total_ms) AS avg_tts_total,
  AVG(duration_ms) AS avg_duration,
  AVG(EXTRACT(EPOCH FROM (stream_start_time - created_at)) * 1000)::integer AS avg_pre_stream_overhead_ms
FROM chat_telemetry
WHERE status = 'success'
  AND created_at > NOW() - INTERVAL '7 days';
```

**Provider comparison:**
```sql
SELECT
  tts_provider,
  llm_provider,
  COUNT(*) AS requests,
  AVG(ttfa_ms) AS avg_ttfa,
  AVG(ttft_ms) AS avg_ttft,
  AVG(tts_total_ms) AS avg_tts_total
FROM chat_telemetry
WHERE status = 'success'
  AND created_at > NOW() - INTERVAL '14 days'
GROUP BY tts_provider, llm_provider
ORDER BY avg_ttfa;
```

**Regression detection (daily trend):**
```sql
SELECT
  DATE(created_at) AS day,
  COUNT(*) AS requests,
  AVG(ttfa_ms) AS avg_ttfa,
  AVG(ttft_ms) AS avg_ttft,
  ROUND(COUNT(*) FILTER (WHERE status = 'error')::numeric / COUNT(*) * 100, 1) AS error_rate_pct
FROM chat_telemetry
WHERE created_at > NOW() - INTERVAL '14 days'
GROUP BY DATE(created_at)
ORDER BY day;
```

**Capture rate audit:**
```sql
SELECT
  (SELECT COUNT(*) FROM chat_telemetry WHERE created_at > NOW() - INTERVAL '7 days') AS telemetry_rows,
  (SELECT COUNT(*) FROM messages WHERE input_modality = 'voice' AND created_at > NOW() - INTERVAL '7 days') AS voice_messages,
  ROUND(
    (SELECT COUNT(*) FROM chat_telemetry WHERE created_at > NOW() - INTERVAL '7 days')::numeric /
    NULLIF((SELECT COUNT(*) FROM messages WHERE input_modality = 'voice' AND created_at > NOW() - INTERVAL '7 days'), 0) * 100,
    1
  ) AS capture_rate_pct;
```

**Resilience retry analysis:**
```sql
SELECT
  resilience_attempt,
  resilience_route,
  COUNT(*) AS attempts,
  AVG(ttfa_ms) FILTER (WHERE status = 'success') AS avg_ttfa_success,
  COUNT(*) FILTER (WHERE status = 'error') AS error_count
FROM chat_telemetry
WHERE resilience_attempt IS NOT NULL
  AND created_at > NOW() - INTERVAL '14 days'
GROUP BY resilience_attempt, resilience_route
ORDER BY resilience_attempt;
```

---

<!-- TECH-DESIGN: Complete technical architecture, component design, instrumentation plan, user stories, and test specification -->

## Technical Design

### Architecture Overview

The telemetry system is **server-side only** — no frontend changes required. It instruments the existing streaming chat pipeline in `chat.post.ts` with a `ChatTelemetryCollector` utility that accumulates timing marks during the stream lifecycle and writes a single row to Supabase via fire-and-forget INSERT.

```
┌─────────────────────────────────────────────────────────────┐
│  server/api/chat.post.ts (streaming + TTS path only)        │
│                                                             │
│  1. Create ChatTelemetryCollector(config)                   │
│  2. telemetry.markStreamStart()         ← before chatStream │
│  3. telemetry.markFirstToken()          ← first onToken     │
│  4. telemetry.markFirstSentence()       ← first sentence    │
│  5. telemetry.markFirstAudio()          ← first audio chunk │
│  6a. telemetry.markComplete(metrics)    ← onComplete        │
│  6b. telemetry.markError(error)         ← onError           │
│  7. telemetry.writeTo(supabase)         ← fire-and-forget   │
│                                                             │
└──────────────────────────┬──────────────────────────────────┘
                           │ .then().catch() (not awaited)
                           ▼
              ┌────────────────────────┐
              │  Supabase PostgreSQL   │
              │  chat_telemetry table  │
              │  (RLS enabled, no      │
              │   anon policies)       │
              └────────────────────────┘
```

**Key design decisions:**
- **Extracted utility** (`server/utils/telemetry.ts`) rather than inline logic — keeps `chat.post.ts` clean and makes telemetry logic independently testable
- **Call-site marks** — `chat.post.ts` calls collector methods at each timing point. No changes to `sentence-detector.ts` or `sequential-processor.ts`
- **Conditional creation** — collector is only instantiated when `useStreamingTTS === true`. All mark calls use optional chaining (`telemetry?.markFirstToken()`)
- **Metadata from runtimeConfig** — LLM and TTS provider/model/voice metadata read directly from `useRuntimeConfig()`, matching existing console.log patterns. No changes to LLM router or TTS factory APIs
- **Existing console logs unchanged** — telemetry is purely additive (REQ backward-compatible)

### Files Changed

| File | Change Type | Description |
|------|-------------|-------------|
| `supabase/migrations/20260221_chat_telemetry.sql` | New | Migration: create table, indexes, RLS |
| `server/utils/telemetry.ts` | New | `ChatTelemetryCollector` class, `ChatTelemetryRow` interface, `classifyTelemetryError()` |
| `server/api/chat.post.ts` | Modified | Import collector, instantiate conditionally, call mark methods at timing points, write on complete/error |
| `tests/unit/telemetry/chat-telemetry-collector.test.ts` | New | Unit tests for collector and error classification |

### Migration SQL

File: `supabase/migrations/20260221_chat_telemetry.sql`

```sql
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
```

### ChatTelemetryCollector Design

File: `server/utils/telemetry.ts`

```typescript
export interface ChatTelemetryRow {
  id?: string                        // generated by DB
  created_at: string                 // ISO timestamp of requestStartedAt
  stream_start_time: string | null
  ttft_ms: number | null
  ttfs_ms: number | null
  ttfa_ms: number | null
  tts_total_ms: number | null
  duration_ms: number | null
  llm_provider: string
  llm_model: string
  tts_provider: string
  tts_voice: string
  tts_mode: string
  session_type: string
  user_id: string
  conversation_id: string
  request_id: string
  token_count: number | null
  sentence_count: number | null
  is_session_start: boolean
  status: 'success' | 'error'
  error_type: string | null
  resilience_attempt: number | null
  resilience_route: string | null
}

interface CollectorInit {
  requestId: string
  requestStartedAt: number           // Date.now() at handler entry
  userId: string
  conversationId: string
  llmProvider: string                // e.g., 'groq'
  llmModel: string                   // e.g., 'openai/gpt-oss-20b'
  ttsProvider: string                // e.g., 'groq'
  ttsVoice: string                   // e.g., 'troy'
  ttsMode: string                    // e.g., 'sentence-batch'
  sessionType: string                // e.g., 'core'
  isSessionStart: boolean
  resilienceAttempt: number | null
  resilienceRoute: string | null
}

export class ChatTelemetryCollector {
  private data: Partial<ChatTelemetryRow>
  private streamStartTime: number | null = null
  private firstTokenMarked = false
  private firstSentenceMarked = false
  private firstAudioMarked = false
  private requestStartedAt: number

  constructor(init: CollectorInit) {
    this.requestStartedAt = init.requestStartedAt
    this.data = {
      created_at: new Date(init.requestStartedAt).toISOString(),
      llm_provider: init.llmProvider,
      llm_model: init.llmModel,
      tts_provider: init.ttsProvider,
      tts_voice: init.ttsVoice,
      tts_mode: init.ttsMode,
      session_type: init.sessionType,
      user_id: init.userId,
      conversation_id: init.conversationId,
      request_id: init.requestId,
      is_session_start: init.isSessionStart,
      resilience_attempt: init.resilienceAttempt,
      resilience_route: init.resilienceRoute,
    }
  }

  markStreamStart(): void {
    this.streamStartTime = Date.now()
    this.data.stream_start_time = new Date().toISOString()
  }

  markFirstToken(): void {
    if (this.firstTokenMarked || !this.streamStartTime) return
    this.firstTokenMarked = true
    this.data.ttft_ms = Date.now() - this.streamStartTime
  }

  markFirstSentence(): void {
    if (this.firstSentenceMarked || !this.streamStartTime) return
    this.firstSentenceMarked = true
    this.data.ttfs_ms = Date.now() - this.streamStartTime
  }

  markFirstAudio(): void {
    if (this.firstAudioMarked || !this.streamStartTime) return
    this.firstAudioMarked = true
    this.data.ttfa_ms = Date.now() - this.streamStartTime
  }

  markComplete(metrics: {
    tokenCount: number
    sentenceCount: number
    ttsMode: string
  }): void {
    this.data.status = 'success'
    this.data.duration_ms = Date.now() - this.requestStartedAt
    this.data.token_count = metrics.tokenCount
    this.data.sentence_count = metrics.sentenceCount
    this.data.tts_mode = metrics.ttsMode  // effective mode (may differ from config)
    if (this.streamStartTime) {
      this.data.tts_total_ms = Date.now() - this.streamStartTime
    }
  }

  markError(error: Error): void {
    this.data.status = 'error'
    this.data.duration_ms = Date.now() - this.requestStartedAt
    this.data.error_type = classifyTelemetryError(error)
  }

  writeTo(supabase: any): void {
    const row = { ...this.data } as ChatTelemetryRow
    supabase
      .from('chat_telemetry')
      .insert(row)
      .then(({ error }: { error: any }) => {
        if (error) {
          console.error('[telemetry] Write failed', {
            requestId: row.request_id,
            error: error.message,
          })
        }
      })
      .catch((err: any) => {
        console.error('[telemetry] Write failed', {
          requestId: row.request_id,
          error: err.message,
        })
      })
  }
}

export function classifyTelemetryError(error: Error): string {
  const status = (error as any)?.status
  const msg = error.message?.toLowerCase() || ''

  if (status === 408 || msg.includes('timeout')) return 'LLM_TIMEOUT'
  if (status === 429 || msg.includes('rate limit')) return 'LLM_RATE_LIMIT'
  if (status === 503 || (status && status >= 500)) return 'LLM_PROVIDER_ERROR'
  if (msg.includes('tts') || msg.includes('synthesize')) return 'TTS_PROVIDER_ERROR'
  if (msg.includes('abort') || msg.includes('cancel')) return 'STREAM_INTERRUPTED'
  return 'UNKNOWN_ERROR'
}
```

### Instrumentation in chat.post.ts

The following changes are made to `server/api/chat.post.ts` (streaming+TTS path only):

**1. Import and instantiate (after TTS provider resolution, ~line 511):**

```typescript
import { ChatTelemetryCollector } from '../utils/telemetry'

// After useStreamingTTS is resolved:
const telemetry = useStreamingTTS ? new ChatTelemetryCollector({
  requestId,
  requestStartedAt,
  userId: user.sub,
  conversationId: convId,
  llmProvider: model,                    // 'groq' | 'gemini'
  llmModel: (model === 'groq' ? config.groqModel : config.geminiModel) || model,
  ttsProvider: (config.ttsProvider as string) || 'unknown',
  ttsVoice: config.groqTtsVoice || config.openaiTtsVoice
    || config.elevenlabsVoiceId || config.inworldVoiceId || 'default',
  ttsMode: ttsStreamingMode,
  sessionType,
  isSessionStart: isNewConversation,
  resilienceAttempt: resilienceAttempt ?? null,
  resilienceRoute: resilienceRoute ?? null,
}) : null
```

**2. Mark stream start (before `router.chatStream`, ~line 547):**

```typescript
streamStartTime = Date.now()
telemetry?.markStreamStart()
```

**3. Mark first token (in `onToken` callback, ~line 551):**

```typescript
onToken: (token) => {
  fullResponse += token
  tokenCount += 1
  telemetry?.markFirstToken()
  // ... existing token handling
```

**4. Mark first sentence (after `sentenceDetector.addToken()`, ~line 572):**

```typescript
const sentences = sentenceDetector.addToken(token)
if (sentences.length > 0) {
  telemetry?.markFirstSentence()  // idempotent — only records first call
}
```

**5. Mark first audio (in TTS chunk callback, existing `firstChunkTime` logic, ~line 536):**

```typescript
if (firstChunkTime === null && chunk.audioBase64) {
  firstChunkTime = Date.now()
  telemetry?.markFirstAudio()
}
```

**6a. Mark complete and write (in `onComplete`, after TTS finalize, ~line 629):**

```typescript
telemetry?.markComplete({
  tokenCount,
  sentenceCount: ttsProcessor?.getSentCount() ?? 0,
  ttsMode: ttsProcessor?.getEffectiveMode() ?? ttsStreamingMode,
})
telemetry?.writeTo(supabase)
```

**6b. Mark error and write (in `onError`, ~line 748):**

```typescript
telemetry?.markError(error)
telemetry?.writeTo(supabase)
```

### TTS Voice Resolution

The TTS voice identifier varies by provider. Resolution logic for the `tts_voice` field:

| Provider Config (`config.ttsProvider`) | Voice Config Key | Example Value |
|---------------------------------------|------------------|---------------|
| `'groq'` | `config.groqTtsVoice` | `'troy'` |
| `'openai'` | `config.openaiTtsVoice` | `'nova'` |
| `'elevenlabs'` | `config.elevenlabsVoiceId` | `'Dennis'` |
| `'inworld'` | `config.inworldVoiceId` | `'inworld-voice-id'` |

The collector uses a fallback chain to resolve: `groqTtsVoice || openaiTtsVoice || elevenlabsVoiceId || inworldVoiceId || 'default'`

### Error Classification

The `classifyTelemetryError()` function maps raw errors to sanitized codes:

| Error Pattern | `error_type` Code |
|---------------|-------------------|
| HTTP 408 or message contains "timeout" | `LLM_TIMEOUT` |
| HTTP 429 or message contains "rate limit" | `LLM_RATE_LIMIT` |
| HTTP 503 or any 5xx status | `LLM_PROVIDER_ERROR` |
| Message contains "tts" or "synthesize" | `TTS_PROVIDER_ERROR` |
| Message contains "abort" or "cancel" | `STREAM_INTERRUPTED` |
| No match | `UNKNOWN_ERROR` |

### Deployment

**Order:** Migration first, then code deploy.

1. Run `supabase db push` to create `chat_telemetry` table with indexes and RLS
2. Deploy application code with telemetry instrumentation to Vercel
3. Verify: trigger a voice session, then query `SELECT * FROM chat_telemetry ORDER BY created_at DESC LIMIT 1`

**Rollback safety:** If the migration is applied but code is not yet deployed, no rows are written. If code is deployed before migration, the fire-and-forget `.catch()` logs the error and the user experience is unaffected.

---

## User Stories

<!-- TECH-DESIGN: Implementation-ready user stories with acceptance criteria -->

### Story 1: Create chat_telemetry table migration

**Complexity:** S

*As a developer, I want a `chat_telemetry` table in Supabase so that pipeline timing data can be persisted and queried.*

**Acceptance Criteria:**

1. Given the migration file `20260221_chat_telemetry.sql` exists, when `supabase db push` is run, then a `chat_telemetry` table is created with all 22 columns matching the spec schema (REQ-1)
2. Given the table exists, when inspecting indexes, then indexes exist on `created_at`, `tts_provider`, `llm_provider`, `session_type`, and `user_id` (REQ-10)
3. Given the table exists, when inspecting RLS, then RLS is enabled with no anon-role policies (REQ-11)
4. Given the table exists, when an INSERT is attempted with the anon key, then it is rejected by RLS

**Technical Notes:**
- File: `supabase/migrations/20260221_chat_telemetry.sql`
- Full SQL provided in the Migration SQL section above
- No FK constraints on `user_id` or `conversation_id`
- `created_at` has no DEFAULT — set by application
- Free text for `tts_mode`, `session_type` (no CHECK constraints)

**Dependencies:** None
**Test Requirements:** Manual verification via Supabase SQL Editor after migration

---

### Story 2: Build ChatTelemetryCollector utility

**Complexity:** M

*As a developer, I want a reusable telemetry collector class so that timing data can be accumulated cleanly during the streaming lifecycle and written fire-and-forget.*

**Acceptance Criteria:**

1. Given a `ChatTelemetryCollector` is instantiated with initial config (requestId, userId, conversationId, provider metadata), when `markStreamStart()` is called, then `stream_start_time` is captured as an ISO timestamp
2. Given the collector has a stream start time, when `markFirstToken()` is called, then `ttft_ms` is computed as ms since stream start
3. Given the collector has a stream start time, when `markFirstSentence()` is called, then `ttfs_ms` is computed as ms since stream start
4. Given the collector has a stream start time, when `markFirstAudio()` is called, then `ttfa_ms` is computed as ms since stream start
5. Given the collector, when `markComplete()` is called with token/sentence counts, then `status='success'`, `duration_ms` is computed from requestStartedAt, and `tts_total_ms` is computed from stream start
6. Given the collector, when `markError(error)` is called, then `status='error'`, `error_type` is classified from the error, and partial timing values are preserved (NULLs for uncaptured metrics)
7. Given the collector, when `writeTo(supabase)` is called, then a fire-and-forget INSERT is issued with `.then().catch()` and failures are logged via `console.error` with requestId
8. Given an error with status 429, when `classifyTelemetryError()` is called, then it returns `'LLM_RATE_LIMIT'`
9. Given an error with status 408 or message containing 'timeout', when classified, then returns `'LLM_TIMEOUT'`
10. Given an unknown error, when classified, then returns `'UNKNOWN_ERROR'`

**Technical Notes:**
- File: `server/utils/telemetry.ts`
- Exports: `ChatTelemetryCollector` class, `ChatTelemetryRow` interface, `classifyTelemetryError()` function
- Mark methods are idempotent (calling `markFirstToken` twice only records the first call)
- `writeTo()` builds the full row from accumulated data, skipping `id` (DB-generated)
- Full implementation provided in the ChatTelemetryCollector Design section above

**Dependencies:** Story 1 (table must exist for writes to succeed, but code is testable without it)
**Test Requirements:** Unit tests (Story 4)

---

### Story 3: Instrument chat.post.ts with telemetry marks

**Complexity:** M

*As a developer, I want the chat streaming handler to call telemetry mark methods at the right points in the pipeline so that every streaming+TTS request produces a telemetry row.*

**Acceptance Criteria:**

1. Given a streaming+TTS request (`stream=true`, `streamTTS=true`, TTS provider resolved), when the handler starts, then a `ChatTelemetryCollector` is created with requestId, userId, conversationId, LLM provider/model, TTS provider/voice/mode, session type, resilience context, and `is_session_start`
2. Given the collector exists, when `streamStartTime = Date.now()` is set (before `router.chatStream`), then `telemetry.markStreamStart()` is called
3. Given the collector exists, when the first `onToken` callback fires, then `telemetry.markFirstToken()` is called (idempotent — subsequent calls are no-ops)
4. Given the collector exists, when `sentenceDetector.addToken()` returns a non-empty array for the first time, then `telemetry.markFirstSentence()` is called (idempotent)
5. Given the collector exists, when the first audio chunk with `audioBase64` is written (existing `firstChunkTime` logic), then `telemetry.markFirstAudio()` is called (idempotent)
6. Given the collector exists, when `onComplete` fires, then `telemetry.markComplete()` is called with `tokenCount`, `sentenceCount` from ttsProcessor, and effective `ttsMode`, followed by `telemetry.writeTo(supabase)`
7. Given the collector exists, when `onError` fires, then `telemetry.markError(error)` is called, followed by `telemetry.writeTo(supabase)`
8. Given a non-TTS streaming request (`streamTTS=false`), when the handler runs, then no telemetry collector is created and no telemetry row is written
9. Given existing console.log calls in `onComplete` and `onError`, when telemetry is added, then existing log statements remain unchanged

**Technical Notes:**
- File: `server/api/chat.post.ts`
- Telemetry collector is created conditionally: `useStreamingTTS ? new ChatTelemetryCollector(...) : null`
- All mark calls use optional chaining: `telemetry?.markFirstToken()`
- `is_session_start` uses existing `isNewConversation` variable (`messages.length === 0`)
- LLM model string: `model === 'groq' ? config.groqModel : config.geminiModel`
- TTS voice: fallback chain across provider-specific config keys
- Full instrumentation points detailed in the Instrumentation section above

**Dependencies:** Story 2 (collector utility must exist)
**Test Requirements:** Manual E2E verification post-deployment; existing E2E tests must still pass

---

### Story 4: Unit tests for ChatTelemetryCollector

**Complexity:** M

*As a developer, I want comprehensive unit tests for the telemetry collector so that I can refactor with confidence and catch regressions.*

**Acceptance Criteria:**

1. Given a collector in the success path, when `markStreamStart` → `markFirstToken` → `markFirstSentence` → `markFirstAudio` → `markComplete` → `writeTo` is called, then the INSERT payload contains all expected fields with correct ms calculations
2. Given a collector in the error path, when `markStreamStart` → `markFirstToken` → `markError` → `writeTo` is called, then `status='error'`, `error_type` is populated, `ttfs_ms`/`ttfa_ms` are null, and `ttft_ms` is populated
3. Given `markFirstToken` is called twice, when the row is built, then only the first call's timestamp is used
4. Given various error objects, when `classifyTelemetryError` is called, then correct error codes are returned (test all 6 codes: `LLM_TIMEOUT`, `LLM_RATE_LIMIT`, `LLM_PROVIDER_ERROR`, `TTS_PROVIDER_ERROR`, `STREAM_INTERRUPTED`, `UNKNOWN_ERROR`)
5. Given `writeTo` is called, when the Supabase INSERT fails, then `console.error` is called with requestId
6. Given `writeTo` is called, when the Supabase INSERT succeeds, then no error is logged

**Technical Notes:**
- File: `tests/unit/telemetry/chat-telemetry-collector.test.ts`
- Mock Supabase client's `from().insert()` chain (existing pattern in `tests/setup.ts`)
- Use `vi.useFakeTimers()` for deterministic timing tests
- Test cases listed in the Test Specification section below

**Dependencies:** Story 2
**Test Requirements:** This IS the test story

---

### Implementation Order

```
Story 1 (Migration)  ──┐
                        ├──→  Story 3 (Instrumentation)
Story 2 (Collector)  ──┘          │
    │                             │
    └──→  Story 4 (Unit Tests)    └──→  Manual E2E verification
```

- Stories 1 and 2 can be built in parallel
- Story 3 depends on Story 2
- Story 4 depends on Story 2, can be built in parallel with Story 3

---

## Test Specification

<!-- TECH-DESIGN: Complete testing strategy with unit and E2E test cases -->

### Unit Tests

**File:** `tests/unit/telemetry/chat-telemetry-collector.test.ts`

#### ChatTelemetryCollector Tests

| Test Case | What It Verifies |
|-----------|-----------------|
| `should build complete success row with all timing marks` | Full lifecycle: all marks → row has correct ms values relative to stream start |
| `should build partial error row with missing marks` | Error path: only early marks called → late timing fields are null |
| `should be idempotent for duplicate markFirstToken calls` | `markFirstToken` called twice → only first timestamp used |
| `should be idempotent for duplicate markFirstSentence calls` | `markFirstSentence` called twice → only first timestamp used |
| `should be idempotent for duplicate markFirstAudio calls` | `markFirstAudio` called twice → only first timestamp used |
| `should compute duration_ms from requestStartedAt` | `duration_ms = complete time - requestStartedAt` |
| `should compute timing metrics relative to streamStartTime` | `ttft_ms`, `ttfs_ms`, `ttfa_ms` relative to stream start, not request start |
| `should set created_at from requestStartedAt` | `created_at` is ISO string of `requestStartedAt` |
| `should set stream_start_time on markStreamStart` | `stream_start_time` is ISO string |
| `should fire-and-forget on writeTo (not return a promise)` | INSERT not awaited, `writeTo` returns `void` immediately |
| `should log error on write failure` | Mock Supabase error → `console.error` with requestId |
| `should not log on write success` | Mock Supabase success → no `console.error` |
| `should handle null streamStartTime gracefully` | Marks called without `markStreamStart` → timing fields remain null |
| `should update tts_mode with effective mode on markComplete` | `markComplete({ ttsMode: 'sentence-batch' })` overrides config value |

#### classifyTelemetryError Tests

| Test Case | Input | Expected Output |
|-----------|-------|-----------------|
| `should classify timeout errors as LLM_TIMEOUT` | `{ status: 408 }` | `'LLM_TIMEOUT'` |
| `should classify timeout message as LLM_TIMEOUT` | `{ message: 'Request timeout' }` | `'LLM_TIMEOUT'` |
| `should classify rate limit as LLM_RATE_LIMIT` | `{ status: 429 }` | `'LLM_RATE_LIMIT'` |
| `should classify rate limit message as LLM_RATE_LIMIT` | `{ message: 'rate limit exceeded' }` | `'LLM_RATE_LIMIT'` |
| `should classify 503 as LLM_PROVIDER_ERROR` | `{ status: 503 }` | `'LLM_PROVIDER_ERROR'` |
| `should classify 500 as LLM_PROVIDER_ERROR` | `{ status: 500 }` | `'LLM_PROVIDER_ERROR'` |
| `should classify TTS errors as TTS_PROVIDER_ERROR` | `{ message: 'TTS synthesis failed' }` | `'TTS_PROVIDER_ERROR'` |
| `should classify synthesize errors as TTS_PROVIDER_ERROR` | `{ message: 'Failed to synthesize' }` | `'TTS_PROVIDER_ERROR'` |
| `should classify abort as STREAM_INTERRUPTED` | `{ message: 'Request aborted' }` | `'STREAM_INTERRUPTED'` |
| `should classify unknown errors as UNKNOWN_ERROR` | `{ message: 'Something unexpected' }` | `'UNKNOWN_ERROR'` |

#### Mock Strategy

```typescript
// Mock Supabase client
const mockInsert = vi.fn()
const mockFrom = vi.fn(() => ({ insert: mockInsert }))
const mockSupabase = { from: mockFrom }

// For success:
mockInsert.mockResolvedValue({ error: null })

// For failure:
mockInsert.mockResolvedValue({ error: { message: 'connection refused' } })

// Use fake timers for deterministic timing:
vi.useFakeTimers()
vi.setSystemTime(new Date('2026-02-21T10:00:00Z'))
// ... call marks with vi.advanceTimersByTime(100) between them
```

### E2E Tests

No automated E2E tests for this feature. Rationale:
- Existing E2E tests mock API responses and don't trigger real LLM/TTS calls
- A real integration test would require live provider credentials
- The telemetry write is server-side only with no UI impact
- Existing E2E suite must pass (regression check — instrumentation doesn't break voice sessions)

**Manual E2E verification post-deployment:**

1. Trigger a voice session in the app (any session type)
2. Complete at least one conversation turn (user speaks, AI responds with audio)
3. Query: `SELECT * FROM chat_telemetry ORDER BY created_at DESC LIMIT 1`
4. Verify:
   - All NOT NULL columns are populated
   - `status = 'success'`
   - Timing values are positive and ordered: `ttft_ms < ttfs_ms < ttfa_ms < tts_total_ms`
   - `llm_provider`, `tts_provider`, `tts_voice` match current config
   - `request_id` matches a recent Vercel log entry
   - `is_session_start` is correct based on whether it was the first turn

### Coverage Goals

- **Highest risk (deep coverage):** `ChatTelemetryCollector` — new code with timing math and error classification. 24 unit test cases.
- **Medium risk (regression check):** `chat.post.ts` instrumentation — existing E2E tests must still pass. Manual verification post-deployment.
- **Low risk (one-time verification):** Migration SQL — verified once during `supabase db push`.

---

## Scope & Considerations

### Out of Scope

- **Visual dashboard UI** — no admin page or charts. SQL queries are sufficient for a solo developer.
- **Automated alerting / threshold monitoring** — no notifications. The data is structured to support this later if needed.
- **Client-side playback timing** — network transfer + audio decode + Web Audio scheduling time is device-dependent and not actionable. May be added as a future enhancement.
- **OpenTelemetry / third-party APM** — no external observability platforms. Supabase is the single data store.
- **Per-sentence TTS timing rows** — individual sentence synthesis latency is not stored as separate records. Aggregate TTS total per request is captured.
- **Non-streaming / text-only requests** — only streaming+TTS (voice) requests are instrumented.
- **Data retention policies** — all data is kept indefinitely. At current scale (~1 small row per conversation turn), storage is negligible.

### Deferred / Future Enhancements

<!-- UX-REFINED: Debug endpoint added here (moved from UX Overview) -->
- **Debug endpoint** — a `/api/debug/telemetry-summary` endpoint returning recent latency averages as JSON for quick checks without opening Supabase
- **Admin dashboard** — a simple page showing latency trends, provider comparisons, and recent request details
- **Client-side timing** — instrument `useStreamingAudioQueue` to report actual playback start time back to server
- **Per-sentence granularity** — capture individual sentence synthesis times for deeper TTS provider analysis
- **Automated alerting** — Supabase Edge Function that checks hourly averages and sends a notification if TTFA exceeds a threshold
- **OpenTelemetry migration** — when scale warrants it, export telemetry to a dedicated observability platform with proper tracing, flame charts, and dashboards
- **A/B testing support** — use telemetry to compare latency across provider configurations running simultaneously (e.g., 50% InWorld / 50% Groq)
- **Account deletion anonymization** — when account deletion is implemented, add a step to `UPDATE chat_telemetry SET user_id = NULL WHERE user_id = <deleted_user_id>` (see REQ-13)

### Dependencies

- **Supabase** — the telemetry table requires a Supabase migration. No new Supabase features or plan upgrades are needed.
- **Existing chat pipeline** — instrumentation points are added to `chat.post.ts` and the TTS/sentence-detection utilities. These are additive changes (new timing captures + a fire-and-forget write) with no changes to existing behavior.

### Constraints

- **Zero latency impact** — the telemetry write must not block or delay the streaming response. Fire-and-forget pattern is mandatory.
- **No new dependencies** — use the existing Supabase client. No new npm packages required.
- **Backward compatibility** — existing console logging remains unchanged. Telemetry is additive.

### Open Questions

- ~~**Session-start detection:**~~ **RESOLVED** — `is_session_start = messages.length === 0`, using the existing `isNewConversation` variable in `chat.post.ts`. True when the AI speaks first with no prior messages in the conversation. See REQ-7.
- ~~**Telemetry for failed requests:**~~ **RESOLVED** — Yes, capture partial telemetry rows on stream error. Partial timing values are stored (NULL for metrics not yet captured), with `status='error'` and `error_type` populated. See REQ-2 and REQ-7.
- **Historical backfill:** No historical data will exist before deployment. The baseline period starts from the moment this ships. Acceptable given the "establish baseline" goal.

### Known Limitations

<!-- REQ-REFINED: Known limitations documented from requirements refinement -->

- **Vercel function timeout**: If a Vercel serverless function is killed mid-stream (e.g., execution time limit exceeded), no telemetry row is written because the `onComplete`/`onError` handler never fires. These events are visible in Vercel's own logs/metrics. This is an acceptable gap at current scale.
- **Capture audit is manual**: Verifying 100% capture rate requires manual SQL comparison of `chat_telemetry` rows vs `messages` rows (filtering for voice modality). There is no automated alerting for silent telemetry write failures beyond `console.error` in Vercel logs.

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.3 | 2026-02-21 | Technical design: ChatTelemetryCollector utility in `server/utils/telemetry.ts` (extracted from chat.post.ts), call-site timing marks (TTFT/TTFS/TTFA via idempotent mark methods), fire-and-forget `.then().catch()` write pattern, `classifyTelemetryError()` mapping (6 error codes), metadata from runtimeConfig (no LLM/TTS utility API changes), migration SQL (`20260221_chat_telemetry.sql`), 4 user stories with acceptance criteria, test specification (24 unit test cases), deployment order (migration-first) |
| 1.2 | 2026-02-21 | Requirements refinement: complete column-level schema with types (REQ-1), timing zero-point defined as streamStartTime with pre-stream overhead via stream_start_time column, resilience retry columns added (resilience_attempt, resilience_route) with every-attempt capture policy (REQ-2), error_message renamed to error_type with sanitized values (REQ-7), is_session_start resolved as messages.length===0 (REQ-7), UUID PK with no FK constraints, created_at set to request start time, PII anonymization policy (REQ-13), known limitations documented, reference queries added |
| 1.1 | 2026-02-21 | UX refinement: resolved failed-request telemetry (capture partial with status/error columns), added console.error on write failure, deferred debug endpoint, added RLS requirement, added no-validation decision, added REQ-11/REQ-12 |
| 1.0 | 2026-02-21 | Initial PRD draft from discovery interview |
