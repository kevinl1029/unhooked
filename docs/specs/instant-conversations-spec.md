# Instant Conversations Spec

**Version:** 1.4
**Created:** 2026-02-17
**Last Updated:** 2026-02-19
**Status:** Implementation Ready
**Document Type:** Product Specification (PRD) + Technical Design

---

## Overview

### Problem

When a user starts a voice coaching session in Unhooked, the coach's voice takes 3–8 seconds to begin playing. During this time, the user sits in silence — waiting for a conversation that's supposed to feel immediate and human.

The root cause is an unnecessary LLM call. The current flow sends an empty message array to the chat endpoint, which authenticates, builds a system prompt, calls the LLM to generate the opening message, waits for a complete sentence, then sends it through TTS. The LLM accounts for 60–80% of the delay, with TTS making up most of the rest.

For L1 (intellectual layer) sessions, this is especially wasteful: the 5 opening messages are static strings already defined in `ILLUSION_OPENING_MESSAGES`. The LLM is being asked to regenerate text that is deterministic and known in advance. For L2/L3 (emotional/identity layer) sessions, the openings are personalized using prior session context — but the data needed to compose them is already available server-side and could be prepared before the user enters the session.

This affects every user, every session. For a voice-first app designed to feel like a real conversation with a coach, multiple seconds of silence at the start is significant friction. It undermines the core promise of the product — especially on first impressions, but equally on the 5th or 15th session. The latency has also been increasing across sessions over time, making the problem progressively worse.

### Goals

**Primary goal:**
- Dramatically reduce time-to-first-audio for all core session types (L1, L2, L3) by eliminating the LLM call at session start

**Secondary goals:**
- Maintain conversational continuity — the conversation record and subsequent LLM context must not be compromised by the fast-start path
- Graceful degradation — if the fast path fails for any reason, the system falls back to the current full LLM+TTS flow transparently, with no visible difference to the user

### Non-Goals

- **Mid-conversation turn latency** — optimizing the speed of subsequent turns within a session is a separate problem with different solutions and trade-offs
- **Check-in sessions** — check-ins do not begin with a coach-initiated chat message, so cold-start latency is not applicable
- **Pre-generated audio files** — while pre-generating audio would achieve near-zero latency, the opening messages are still in flux and the maintenance cost of regenerating audio files on every copy change is not justified at this stage
- **Per-user audio storage** — storing pre-rendered audio per user per session introduces storage costs that scale linearly with the user base and adds cache invalidation complexity
- **Offline/cached audio** — supporting users on slow or offline connections is out of scope

### Success Metrics

| Metric | Target | How Measured |
|--------|--------|--------------|
| Time-to-first-audio (all core sessions) | Best-effort < 1 second | Measured from `startConversation()` call to first audio playback in Chrome DevTools |
| Fallback transparency | 100% — user never sees a degraded state label or error | Manual QA: trigger fallback scenarios and verify no UI difference |
| Conversation record integrity | Opening text is saved as first assistant message before user's first response | Verify in Supabase that `conversationId` is set and opening message is persisted before first user turn |

---

## Solution

### Summary

Eliminate the LLM call at session start for all core sessions. Instead, have the opening text ready *before* the user starts the session and send it directly to TTS, bypassing the LLM entirely. For L1 sessions, the text is already known — it's a static string looked up by illusion key. For L2/L3 sessions, the text is pre-computed by an LLM background job that runs after the previous session completes, so it's stored and waiting. In both cases, when the user starts the session, the server sends the prepared text straight to TTS and streams the audio back. In parallel, a lightweight bootstrap endpoint creates the conversation record and saves the opening as the first assistant message. By the time the user finishes listening to the opening (~15–25 seconds of audio), the conversation is fully initialized and ready for their first response.

### User Scenarios

#### Primary Scenario: User starts an L1 core session

**User:** Any user beginning a core program session at the intellectual layer
**Trigger:** User navigates to a session and taps to start the conversation
**Flow:**
1. Session page loads; mic permission is already granted or user grants it
2. User taps to start the conversation
3. Within ~1 second, the coach's voice begins playing the opening message
4. Text highlights word-by-word as the coach speaks (same as current behavior)
5. In the background, the conversation record is created and the opening text is saved as the first assistant message
6. When the opening finishes, the user responds normally — the conversation continues via the existing LLM+TTS pipeline with full context

**Outcome:** The session feels like it starts the instant the user is ready. No perceptible delay.

#### Variant Scenario: User starts an L2 or L3 core session

**User:** Any user progressing to the emotional or identity layer of an illusion
**Trigger:** User navigates to a session and taps to start
**Flow:**
1. Session page loads; opening text was pre-computed in the background after their prior session completed
2. User taps to start the conversation
3. Within ~1 second, the coach's voice begins playing a personalized opening that references their prior session context
4. Everything else proceeds as in the L1 scenario

**Outcome:** Same instant-feeling start, but with personalized opening content derived from their prior sessions.

#### Variant Scenario: User starts L2 before pre-computation finishes

<!-- UX-REFINED: Added race condition scenario for immediate session navigation -->

**User:** A user who completes L1 and immediately navigates to L2
**Trigger:** The background LLM job to pre-compute the L2 opening text has not completed yet
**Flow:**
1. User completes L1 session, background pre-computation job is triggered
2. User immediately navigates to L2 (before background job finishes)
3. System checks for pre-computed text — it's not available yet
4. System transparently falls back to the current full LLM+TTS flow
5. The user experiences the existing 3–8 second delay but the session works normally

**Outcome:** The session starts via the current flow. The user doesn't notice anything different — they just don't get the speed benefit this time.

#### Variant Scenario: Fast path fails (fallback)

**User:** Any user, any core session type
**Trigger:** Pre-computed text is unavailable (background job failed, data missing), TTS-direct path errors, or bootstrap endpoint failure
**Flow:**
1. The system detects the fast path cannot be used
2. It transparently falls back to the current full flow: LLM generates the opening, TTS streams the audio
3. The user experiences the existing 3–8 second delay but the session is not broken
4. No error message, no degraded-state indicator — the user is unaware of the fallback

**Outcome:** The session works normally. The user just doesn't get the speed benefit this time.

#### Variant Scenario: Bootstrap endpoint fails during fast-start audio

<!-- UX-REFINED: Added bootstrap failure scenario -->

**User:** Any user, any core session type using the fast path
**Trigger:** The opening audio is already playing, but the bootstrap endpoint call fails (network error, Supabase outage)
**Flow:**
1. Opening audio plays successfully via the fast path
2. Bootstrap endpoint call fails in the background
3. System retries silently (2–3 retries with backoff)
4. If retries succeed: conversation record is created normally
5. If all retries fail: conversation record is created when the user sends their first response, bundling the opening text at that point
6. The user is never aware of the failure — audio playback is unaffected

**Outcome:** The session continues without interruption. Conversation record creation is deferred if necessary but always completed before messages are exchanged.

### UX Overview

<!-- UX-REFINED: Clarified that no UX changes are needed, with explicit reference to existing loading state -->

No UX changes. The session start experience — screens, flows, interactions, word highlighting, permission overlay — remains identical. The only difference is the coach starts talking faster.

During the brief wait before audio begins (< 1 second target), the existing waveform animation and session initialization state from the voice interface is shown. No new loading UI is needed for the fast-start flow.

### Key Requirements

#### Core Fast-Start Behavior

- REQ-1: For L1 core sessions, the opening text must be sent directly to TTS without an LLM call, using the static `ILLUSION_OPENING_MESSAGES` text for the given illusion key (one-to-one mapping: each illusion key maps to exactly one static opening string)
- REQ-2: For L2/L3 core sessions, the opening text must be pre-computed by an LLM background job and stored for retrieval at session start. The pre-computation must be triggered by a session completion event (when the prior session in the sequence completes). The background job must use the same prompt construction as the current flow (`buildSystemPrompt()` with personalization context, bridge context, and layer instructions) to generate the opening message. If the pre-computation job fails, it must retry once; if the retry also fails, no pre-computed text is stored and the session falls back to the current flow (REQ-6)
- REQ-3: At session start for all core sessions, a lightweight bootstrap endpoint must create the conversation record and save the opening text as the first assistant message
- REQ-4: The `conversationId` must be available before the user sends their first response — no orphaned messages
- REQ-5: Word-by-word text highlighting must work during the direct-TTS opening playback (same visual behavior as current)

<!-- REQ-REFINED: Added decision logic requirement -->

#### Fast-Start Decision Logic

- REQ-12: At session start, the system must determine the path using a simple existence check: (1) Is this a core session? (2) For L1: does the illusion key map to a static opening in `ILLUSION_OPENING_MESSAGES`? (3) For L2/L3: does pre-computed opening text exist for this user's current session? If all checks pass → fast path. Otherwise → fallback to current flow

#### Fallback & Error Handling

- REQ-6: If the fast-start path fails for any reason — missing pre-computed text, L1 static text lookup failure (e.g., unmapped illusion key), TTS error, or network failure — the system must transparently fall back to the current full LLM+TTS flow. No error message, no degraded-state indicator
- REQ-7: L2/L3 sessions and check-ins that cannot use the fast path must continue working via the current flow with no regressions
- REQ-9: If the bootstrap endpoint fails while opening audio is playing, the system must retry with exponential backoff (up to 3 retries, total retry window not exceeding 15 seconds). If all retries fail, conversation record creation must be deferred to the user's first response, bundling the opening text at that point
- REQ-11: If a user starts a session before the background pre-computation job has completed, the system must fall back to the current flow transparently

#### Conversation Integrity

- REQ-8: The fast-start path must not compromise conversation continuity — the LLM must have full context (including the opening message) when processing the user's first response

<!-- REQ-REFINED: Refined pre-computed text lifecycle -->

#### Pre-Computed Text Lifecycle

- REQ-10: Pre-computed L2/L3 opening text does not expire — once generated, it remains valid until consumed
- REQ-13: Pre-computed opening text must be stored as a nullable column on the `user_progress` table (`precomputed_opening_text` and `precomputed_opening_at` timestamp). The text is never explicitly deleted — it is only overwritten when the next pre-computation job runs (triggered by the session's completion). It is NOT cleared at session bootstrap or at session completion. This ensures that if a user abandons a session and restarts, the fast path is still available. If the next pre-computation job fails, the stale text remains but is harmless (REQ-12's existence check will use it or the fallback will handle it naturally)

<!-- REQ-REFINED: Added security requirement -->

#### Security

- REQ-14: All new endpoints (bootstrap, TTS-direct) must use the existing Supabase auth middleware. The pre-computation background job must be scoped to the authenticated user's data — a user's pre-computed text can only be read or written for their own sessions

<!-- REQ-REFINED: Added observability requirement -->

#### Observability

- REQ-15: The system must log (server-side) when the fast-start path is used vs. when fallback occurs, including the reason for fallback (no pre-computed text, TTS error, bootstrap failure, pre-computation not yet complete). Pre-computation job success and failure (including retry outcomes) must also be logged

---

## Scope & Considerations

### Out of Scope

- **Pre-generated audio files** — not justified while opening messages are still being iterated on; the maintenance cost of regenerating audio on every copy change outweighs the latency benefit over direct TTS
- **Per-user audio storage** — storage costs scale linearly with users and add cache invalidation complexity
- **Mid-turn latency optimization** — different problem, different solutions
- **Check-in sessions** — do not begin with a coach-initiated message
- **UX changes** — this is a behind-the-scenes speed improvement only

### Deferred / Future Enhancements

- **Reinforcement sessions** — reinforcement session openings are dynamically generated from moment-specific or general support prompts. The feasibility and cost of applying similar optimization should be evaluated separately once core session optimization is proven
- **Pre-generated audio** — if opening messages stabilize and the maintenance cost becomes acceptable, pre-generating audio files would reduce latency to near-zero for L1 sessions
- **Mid-conversation latency** — as context windows grow within a session, turn latency increases; this is a separate optimization opportunity
- **Cross-session latency trend** — overall session latency has been increasing over time, which may indicate growing system prompts or provider performance changes; this warrants separate investigation

### Dependencies

- Existing voice infrastructure (STT/TTS pipeline, `useVoiceChat`, `SessionView.vue`) must support a "direct TTS" path that bypasses the LLM
- L2/L3 pre-computation depends on prior session data being reliably available (bridge context, conviction assessment, cross-layer themes)
- The bootstrap endpoint must work with the existing Supabase auth middleware

### Constraints

- No hard timeline — this is a quality improvement to be prioritized when ready
- Solution must not require per-user storage of audio assets
- Opening messages (especially L1) are still in active iteration — the solution must not create friction for updating them

<!-- UX-REFINED: Resolved pre-computation timing and TTS consistency questions; remaining questions are for technical design -->

### Open Questions

1. **Reinforcement session feasibility:** How dynamic are reinforcement session openings? Could a similar skip-LLM or pre-compute approach work, and at what cost/complexity? *(Deferred evaluation)*

### Resolved Questions

1. **L2/L3 pre-computation timing:** The background LLM job runs after the prior session completes. If the user starts the next session before the job finishes, the system falls back to the current flow transparently. *(Resolved during UX refinement)*
2. **Pre-computed text expiry:** Pre-computed text does not expire. The session data it's based on doesn't change after generation. *(Resolved during UX refinement)*
3. **TTS consistency:** Not a concern. The text content is what matters; any voice/provider configuration changes apply to the entire session equally. *(Resolved during UX refinement)*
4. **Bootstrap endpoint failure:** Retry silently (2–3 retries with backoff). If all retries fail, defer conversation record creation to the user's first response. *(Resolved during UX refinement)*
5. **Pre-computed text storage:** Stored as nullable columns on the `user_progress` table (`precomputed_opening_text` and `precomputed_opening_at`). The data is naturally scoped to a user's progress — no new table or joins needed. *(Resolved during requirements refinement)*

---

<!-- TECH-DESIGN: Complete technical architecture, API contracts, data model, component design, and implementation approach -->

## Technical Design

### Architecture Overview

The fast-start path uses **client-side orchestration**. The client fetches the opening text from a new lightweight endpoint, determines whether the fast path is available, and if so, orchestrates TTS playback and conversation bootstrap in parallel. If the fast path is unavailable, the client falls through to the existing `startConversation()` flow with zero user-visible difference.

```
USER TAPS "START"
    │
    ▼
GET /api/session/opening-text
    ?illusionKey=X&illusionLayer=Y&sessionType=core
    │
    ├─ { text: "Hey there...", source: "static" }
    │   │
    │   ▼ (parallel)
    │   ┌──────────────────────────────┬──────────────────────────────┐
    │   │  voiceSession.playAIResponse │  POST /api/session/bootstrap │
    │   │  (calls /api/voice/synthesize│  { illusionKey, layer, text }│
    │   │   internally → plays audio   │  → { conversationId }        │
    │   │   + word-by-word highlighting)│  (retry 3x on failure)       │
    │   └──────────────────────────────┴──────────────────────────────┘
    │                    │                           │
    │                    ▼                           ▼
    │              Audio plays              conversationId set
    │              (~250-600ms to first audio)
    │
    ├─ { text: null }
    │   │
    │   ▼
    │   Fall back to current startConversation() flow
    │   (runStreamingWithResilience → /api/chat → LLM + streaming TTS)
    │   (~3-8 seconds to first audio)
    │
    ▼
Session continues via existing /api/chat pipeline
(LLM has full context including opening message)
```

### Latency Budget

| Step | Estimated Latency | Notes |
|------|-------------------|-------|
| GET /api/session/opening-text | ~50-100ms | L1: in-memory static lookup. L2/L3: single Supabase read on `user_progress` (indexed by `user_id` unique constraint) |
| POST /api/voice/synthesize (via playAIResponse) | ~200-500ms | Depends on TTS provider. Groq is fastest (~200ms). Runs in parallel with bootstrap |
| POST /api/session/bootstrap | ~100-200ms | Supabase inserts (conversation + message). Runs in parallel with TTS, does NOT block audio |
| **Total time-to-first-audio** | **~250-600ms** | Comfortably under the <1s target |

### Data Model

<!-- TECH-DESIGN: Migration for pre-computed opening text storage -->

**Migration:** `supabase/migrations/20260220_instant_conversations.sql`

Two nullable columns added to `user_progress`:

```sql
ALTER TABLE public.user_progress
ADD COLUMN IF NOT EXISTS precomputed_opening_text TEXT,
ADD COLUMN IF NOT EXISTS precomputed_opening_at TIMESTAMPTZ;

COMMENT ON COLUMN public.user_progress.precomputed_opening_text IS
  'Pre-computed L2/L3 opening message text, generated by background job after prior session completes';

COMMENT ON COLUMN public.user_progress.precomputed_opening_at IS
  'Timestamp when precomputed_opening_text was generated';
```

**Lifecycle:** The text is never explicitly deleted. It is overwritten when the next pre-computation job runs. If the pre-computation job fails, stale text remains but is harmless — REQ-12's existence check will use it, and the content is still valid for the session it was computed for.

**No new indexes needed.** The `user_progress` table has a `UNIQUE(user_id)` constraint, and the opening text endpoint reads by `user_id` — already optimally indexed.

### API Contracts

<!-- TECH-DESIGN: New API endpoints for fast-start flow -->

#### GET `/api/session/opening-text`

Implements REQ-12 decision logic. Returns opening text if the fast path is available.

**File:** `server/api/session/opening-text.get.ts`

**Auth:** `serverSupabaseUser()` (standard Supabase auth middleware)

**Query Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `illusionKey` | `IllusionKey` | Yes | The illusion for this session |
| `illusionLayer` | `IllusionLayer` | Yes | The layer for this session |
| `sessionType` | `SessionType` | Yes | Must be `'core'` for fast path |

**Response (200):**

```typescript
{
  text: string | null    // Opening text, or null if fast path unavailable
  source: 'static' | 'precomputed' | null  // How the text was resolved
}
```

**Decision Logic (REQ-12):**

1. If `sessionType !== 'core'` → return `{ text: null, source: null }`
2. If `illusionLayer === 'intellectual'`:
   - Look up `ILLUSION_OPENING_MESSAGES[illusionKey]`
   - If found → return `{ text, source: 'static' }`
   - If not found → return `{ text: null, source: null }`
3. If `illusionLayer === 'emotional'` or `'identity'`:
   - Read `precomputed_opening_text` from `user_progress` for this user
   - If non-null → return `{ text, source: 'precomputed' }`
   - If null → return `{ text: null, source: null }`

**Logging (REQ-15):**

```
[instant-start] Opening text resolved { illusionKey, illusionLayer, source: 'static' | 'precomputed', hasText: true }
[instant-start] Opening text not available { illusionKey, illusionLayer, reason: 'not_core' | 'no_static_text' | 'no_precomputed_text' }
```

#### POST `/api/session/bootstrap`

Creates the conversation record and saves the opening as the first assistant message.

**File:** `server/api/session/bootstrap.post.ts`

**Auth:** `serverSupabaseUser()` (uses `serverSupabaseServiceRole()` for DB writes, matching existing `/api/chat` pattern)

**Request Body:**

```typescript
{
  illusionKey: IllusionKey    // Required
  illusionLayer: IllusionLayer // Required
  sessionType: SessionType     // Required (always 'core')
  openingText: string          // Required — the opening message text
}
```

**Response (200):**

```typescript
{
  conversationId: string  // UUID of the created conversation
}
```

**Server Logic:**

1. Authenticate user
2. Create conversation record in `conversations` table:
   - `user_id`, `model` (default model), `title` (from `ILLUSION_NAMES[illusionKey]`), `session_type`, `illusion_key`, `illusion_layer`
   - Same fields as the conversation creation in `/api/chat.post.ts` (lines 365-377)
3. Save opening text as first assistant message in `messages` table:
   - `conversation_id`, `role: 'assistant'`, `content: openingText`, `input_modality: 'text'`
4. Cancel pending evidence bridge check-ins for this illusion (same logic as `/api/chat.post.ts` lines 383-402)
5. Return `{ conversationId }`

**Logging (REQ-15):**

```
[instant-start] Bootstrap success { conversationId, illusionKey, illusionLayer }
[instant-start] Bootstrap failed { illusionKey, illusionLayer, error }
```

#### Existing: POST `/api/voice/synthesize`

No changes. Reused as-is by `voiceSession.playAIResponse()` which calls it internally. Already handles auth, TTS provider selection, and returns audio + word timings.

### Component Architecture

<!-- TECH-DESIGN: Client-side changes confined to useVoiceChat.ts -->

**Only one client file changes: `composables/useVoiceChat.ts`**

No changes to `SessionView.vue`, `useVoiceSession.ts`, `useStreamingTTS.ts`, `useStreamingAudioQueue.ts`, or any other component/composable.

#### Modified: `useVoiceChat.startConversation()`

The existing `startConversation()` function gains a fast-path branch at the top. The flow:

```typescript
const startConversation = async (): Promise<boolean> => {
  error.value = null
  isLoading.value = true

  try {
    // === FAST-START PATH ===
    // Only attempt for core sessions
    if (sessionType === 'core' && illusionKey) {
      const openingResult = await $fetch('/api/session/opening-text', {
        query: { illusionKey, illusionLayer, sessionType }
      })

      if (openingResult.text) {
        // Fast path available — play audio and bootstrap in parallel
        const bootstrapPromise = bootstrapWithRetry({
          illusionKey, illusionLayer, sessionType,
          openingText: openingResult.text
        })

        // playAIResponse calls /api/voice/synthesize internally,
        // plays audio, and handles word-by-word highlighting
        const audioSuccess = await voiceSession.playAIResponse(openingResult.text)

        if (audioSuccess) {
          // Push opening as assistant message for LLM context continuity (REQ-8)
          messages.value.push({ role: 'assistant', content: openingResult.text })

          // Await bootstrap result (may already be resolved)
          const bootstrapResult = await bootstrapPromise
          if (bootstrapResult?.conversationId) {
            conversationId.value = bootstrapResult.conversationId
          }
          // If bootstrap failed, conversationId stays null.
          // sendMessage() will fall through to /api/chat which creates
          // the conversation on first user message (deferred creation per REQ-9).

          isLoading.value = false
          return true
        }
        // If audio failed, fall through to current flow (REQ-6)
      }
      // If no text available, fall through to current flow
    }

    // === CURRENT FLOW (fallback) ===
    // Existing streaming/non-streaming logic unchanged
    if (enableStreamingTTS) {
      // ... existing runStreamingWithResilience code ...
    }
    // ... existing non-streaming code ...
  } catch (e) {
    // ... existing error handling ...
  }
}
```

#### New: `bootstrapWithRetry()` (private function in useVoiceChat.ts)

Implements REQ-9: exponential backoff, 3 retries, 15s max window.

```typescript
const bootstrapWithRetry = async (params: {
  illusionKey: IllusionKey
  illusionLayer: IllusionLayer
  sessionType: string
  openingText: string
}): Promise<{ conversationId: string } | null> => {
  const maxRetries = 3
  const maxWindowMs = 15_000
  const startTime = Date.now()

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await $fetch('/api/session/bootstrap', {
        method: 'POST',
        body: params
      })
      return result
    } catch (e) {
      const elapsed = Date.now() - startTime
      if (attempt >= maxRetries || elapsed >= maxWindowMs) {
        console.warn('[useVoiceChat] Bootstrap failed after retries', { attempt, elapsed })
        return null  // Deferred creation — sendMessage() handles it
      }
      // Exponential backoff: 1s, 2s, 4s
      const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1), maxWindowMs - elapsed)
      await new Promise(resolve => setTimeout(resolve, backoffMs))
    }
  }
  return null
}
```

#### State Management During Fast-Start

| State | Fast-Start Behavior |
|-------|-------------------|
| `isLoading` | `true` while fetching opening text. `playAIResponse` manages `isProcessing` and `isAISpeaking` internally |
| `messages` | Opening text pushed as `{ role: 'assistant', content: text }` after audio completes. Ensures LLM has full context on first user response (REQ-8) |
| `conversationId` | Set from bootstrap response. If bootstrap fails, stays `null` until first `sendMessage()` call which falls through to `/api/chat` (creates conversation there) |
| `currentTranscript` | Set by `playAIResponse()` — no change needed |
| `currentWordIndex` | Managed by `playAIResponse()` → `startWordTracking()` — no change needed |
| `isAISpeaking` | Managed by `playAIResponse()` audio events — no change needed |

### Pre-Computation Job

<!-- TECH-DESIGN: Background LLM job for L2/L3 opening text pre-computation -->

**New file:** `server/utils/session/precompute-opening.ts`

**Purpose:** Generate the L2/L3 opening message after the prior session completes, so it's ready when the user starts the next session.

#### When it triggers

Triggered as a **non-blocking fire-and-forget** call in `server/api/progress/complete-session.post.ts`, following the same pattern as `scheduleCheckIns()` and `scheduleEvidenceBridgeCheckIn()`.

**Trigger conditions:**
- L1 intellectual completes → pre-compute L2 emotional opening for same illusion
- L2 emotional completes → pre-compute L3 identity opening for same illusion
- L3 identity completes → **no pre-computation** (next session is a different illusion's L1, which uses static text)

#### How it works

```typescript
export async function precomputeOpeningText(params: {
  supabase: SupabaseClient
  userId: string
  illusionKey: IllusionKey
  nextLayer: IllusionLayer  // 'emotional' or 'identity'
}): Promise<void> {
  const { supabase, userId, illusionKey, nextLayer } = params
  const maxRetries = 1
  const retryDelayMs = 500

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        await new Promise(resolve => setTimeout(resolve, retryDelayMs))
      }

      // 1. Fetch user intake for userContext
      const { data: intake } = await supabase
        .from('user_intake')
        .select('product_types, usage_frequency, years_using, previous_attempts, triggers')
        .eq('user_id', userId)
        .single()

      const userContext = intake ? { ... } : undefined

      // 2. Build personalization context (same as /api/chat)
      const sessionContext = await buildSessionContext(supabase, userId, illusionKey, 'core')
      const personalizationContext = formatContextForPrompt(sessionContext)

      // 3. Build cross-layer context and bridge context
      const crossLayerCtx = await buildCrossLayerContext(supabase, userId, illusionKey, nextLayer)
      const crossLayerFormatted = formatCrossLayerContext(crossLayerCtx)
      const bridgeContext = buildBridgeContext(crossLayerCtx)

      // 4. Build system prompt (same as /api/chat for new L2/L3 conversation)
      const systemPrompt = buildSystemPrompt({
        illusionKey,
        userContext,
        isNewConversation: true,
        personalizationContext: personalizationContext + crossLayerFormatted,
        bridgeContext,
        illusionLayer: nextLayer,
      })

      // 5. Ask LLM to generate just the opening message
      const router = getModelRouter()
      const generationPrompt = `Based on the context and instructions in your system prompt, generate ONLY your opening message for this session. This is the first thing you will say to the user. The message should:
- Be 2-4 sentences
- Be warm and conversational
- Naturally acknowledge the user's progress from their previous session
- Transition into the focus of this new layer
- End with an open question to invite the user to share

Output ONLY the opening message text. No preamble, no labels, no formatting.`

      const result = await router.chat({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: generationPrompt }
        ],
        model: getDefaultModel(),
      })

      const openingText = result.content.trim()
      if (!openingText) throw new Error('Empty opening text generated')

      // 6. Store in user_progress
      await supabase
        .from('user_progress')
        .update({
          precomputed_opening_text: openingText,
          precomputed_opening_at: new Date().toISOString(),
        })
        .eq('user_id', userId)

      console.log('[precompute-opening] Success', {
        userId, illusionKey, nextLayer,
        textLength: openingText.length, attempt: attempt + 1
      })
      return  // Success — exit retry loop

    } catch (err) {
      console.error('[precompute-opening] Failed', {
        userId, illusionKey, nextLayer,
        attempt: attempt + 1, maxRetries: maxRetries + 1,
        error: err instanceof Error ? err.message : String(err)
      })
      // If last attempt, log and exit — no text stored, fallback at session start
    }
  }
}
```

#### Integration in complete-session.post.ts

Added alongside existing fire-and-forget calls (check-in scheduling):

```typescript
// After L1 or L2 completion (within the layer progression block):
if (illusionLayer === 'intellectual' || illusionLayer === 'emotional') {
  const nextLayerForPrecompute = illusionLayer === 'intellectual' ? 'emotional' : 'identity'

  precomputeOpeningText({
    supabase,
    userId: user.sub,
    illusionKey: effectiveIllusionKey,
    nextLayer: nextLayerForPrecompute as IllusionLayer,
  }).catch(err => {
    console.error('[complete-session] Pre-computation failed:', err)
  })
}
```

### Error Handling & Fallback Summary

<!-- TECH-DESIGN: Comprehensive error handling across all paths -->

| Failure Point | Behavior | Requirement |
|--------------|----------|-------------|
| Opening text fetch fails (network/server error) | Fall through to current `startConversation()` flow | REQ-6 |
| Opening text returns `null` (no static/precomputed text) | Fall through to current flow | REQ-6, REQ-11, REQ-12 |
| `playAIResponse()` fails (TTS error) | Fall through to current flow | REQ-6 |
| Bootstrap fails (all 3 retries) | `conversationId` stays `null`; deferred to first `sendMessage()` which falls through to `/api/chat` conversation creation | REQ-9 |
| Pre-computation job fails (both attempts) | No text stored; next session falls back to current flow | REQ-2, REQ-6 |
| User starts session before pre-computation finishes | Opening text endpoint returns `null`; falls back to current flow | REQ-11 |

**Key invariant:** The user never sees an error, degraded state, or different UI. The only difference is speed.

### Security

<!-- TECH-DESIGN: Auth patterns for new endpoints -->

- **GET `/api/session/opening-text`**: `serverSupabaseUser()` — reads only the authenticated user's `user_progress` row
- **POST `/api/session/bootstrap`**: `serverSupabaseUser()` for auth; `serverSupabaseServiceRole()` for DB writes (same pattern as `/api/chat.post.ts`)
- **Pre-computation job**: Runs within `complete-session.post.ts` which already authenticates the user and uses service role for DB operations
- **No new roles, permissions, or feature flags needed**

### Observability

<!-- TECH-DESIGN: Logging strategy per REQ-15 -->

All logs use `console.log` / `console.error` with prefixed tags, matching existing patterns (`[chat]`, `[moment-detection]`, `[session-complete]`).

**Server-side log events:**

| Tag | Event | Level | Data |
|-----|-------|-------|------|
| `[instant-start]` | Opening text resolved | `log` | `{ illusionKey, illusionLayer, source, hasText }` |
| `[instant-start]` | Opening text not available | `log` | `{ illusionKey, illusionLayer, reason }` |
| `[instant-start]` | Bootstrap success | `log` | `{ conversationId, illusionKey, illusionLayer }` |
| `[instant-start]` | Bootstrap failed | `error` | `{ illusionKey, illusionLayer, error }` |
| `[precompute-opening]` | Pre-computation success | `log` | `{ userId, illusionKey, nextLayer, textLength, attempt }` |
| `[precompute-opening]` | Pre-computation failed | `error` | `{ userId, illusionKey, nextLayer, attempt, error }` |

**Client-side log events:**

| Tag | Event | Data |
|-----|-------|------|
| `[useVoiceChat]` | Fast-start path used | `{ illusionKey, illusionLayer, source }` |
| `[useVoiceChat]` | Fast-start fallback | `{ illusionKey, illusionLayer, reason }` |
| `[useVoiceChat]` | Bootstrap retry/failure | `{ attempt, elapsed }` |

### Files Changed

**New files:**

| File | Purpose |
|------|---------|
| `supabase/migrations/20260220_instant_conversations.sql` | Add `precomputed_opening_text` and `precomputed_opening_at` to `user_progress` |
| `server/api/session/opening-text.get.ts` | Opening text endpoint (REQ-12 decision logic) |
| `server/api/session/bootstrap.post.ts` | Bootstrap endpoint (conversation + first message creation) |
| `server/utils/session/precompute-opening.ts` | Pre-computation background job for L2/L3 openings |

**Modified files:**

| File | Change |
|------|--------|
| `composables/useVoiceChat.ts` | Add fast-start branch in `startConversation()` + `bootstrapWithRetry()` helper |
| `server/api/progress/complete-session.post.ts` | Add fire-and-forget `precomputeOpeningText()` call after L1/L2 completion |
| `types/database.types.ts` | Regenerated (auto-generated from schema) |

---

<!-- TECH-DESIGN: User stories with acceptance criteria -->

## User Stories

### Phase 1: Foundation

#### US-1: Database Migration for Pre-Computed Opening Text

**Description:** As a developer, I want to add storage columns for pre-computed opening text so that the system can store and retrieve L2/L3 opening messages.

**Acceptance Criteria:**

1. Given the migration runs, when I inspect the `user_progress` table, then columns `precomputed_opening_text` (TEXT, nullable) and `precomputed_opening_at` (TIMESTAMPTZ, nullable) exist
2. Given existing `user_progress` rows exist, when the migration runs, then existing rows are not affected (both columns default to NULL)
3. Given the migration has run, when I regenerate database types with `npm run db:types`, then `types/database.types.ts` includes the new columns

**Technical Notes:**
- File: `supabase/migrations/20260220_instant_conversations.sql`
- Uses `ADD COLUMN IF NOT EXISTS` for idempotency
- Deploy migration to Supabase before deploying code

**Dependencies:** None (foundation story)

**Test Requirements:**
- Manual: run migration against local Supabase, verify columns exist
- Manual: verify `db:types` regeneration includes new columns

**Estimated Complexity:** S — Two `ALTER TABLE` statements

---

### Phase 2: Server Endpoints

#### US-2: Opening Text Endpoint

**Description:** As the client application, I want to fetch the opening text for a core session so that I can determine whether the fast-start path is available.

**Acceptance Criteria:**

1. Given a core session with `illusionLayer = 'intellectual'` and a valid `illusionKey`, when I call `GET /api/session/opening-text`, then I receive `{ text: "<static opening>", source: "static" }` with the text matching `ILLUSION_OPENING_MESSAGES[illusionKey]`
2. Given a core session with `illusionLayer = 'emotional'` and `precomputed_opening_text` exists for this user, when I call the endpoint, then I receive `{ text: "<precomputed text>", source: "precomputed" }`
3. Given a core session with `illusionLayer = 'emotional'` and `precomputed_opening_text` is NULL, when I call the endpoint, then I receive `{ text: null, source: null }`
4. Given `sessionType` is not `'core'` (e.g., `'check_in'`), when I call the endpoint, then I receive `{ text: null, source: null }`
5. Given an unauthenticated request, when I call the endpoint, then I receive a 401 error
6. Given a valid request, when the endpoint responds, then a server log with tag `[instant-start]` is written containing the decision outcome

**Technical Notes:**
- File: `server/api/session/opening-text.get.ts`
- Import `ILLUSION_OPENING_MESSAGES` from `server/utils/prompts`
- Auth: `serverSupabaseUser()` + `serverSupabaseServiceRole()` for DB read
- Validate `illusionKey` against `ILLUSION_KEYS`, `illusionLayer` against valid values

**Dependencies:** US-1

**Test Requirements:**
- Unit test: all 4 decision paths (L1 static, L2/L3 precomputed, L2/L3 missing, non-core)
- Unit test: invalid illusionKey returns 400
- Unit test: unauthenticated returns 401

**Estimated Complexity:** S — Simple endpoint with lookup logic

---

#### US-3: Session Bootstrap Endpoint

**Description:** As the client application, I want to create a conversation record with the opening message in a single call so that the session is initialized while audio plays.

**Acceptance Criteria:**

1. Given valid params (`illusionKey`, `illusionLayer`, `sessionType: 'core'`, `openingText`), when I call `POST /api/session/bootstrap`, then a conversation record is created with the correct `session_type`, `illusion_key`, `illusion_layer`, and `title`
2. Given the conversation is created, when I check the `messages` table, then the opening text is saved as the first message with `role: 'assistant'` and `input_modality: 'text'`
3. Given the endpoint succeeds, when I read the response, then it contains `{ conversationId: "<uuid>" }`
4. Given pending evidence bridge check-ins exist for this user/illusion, when the bootstrap runs, then those check-ins are cancelled with `cancellation_reason: 'user_continued_immediately'` (same as `/api/chat` behavior)
5. Given an unauthenticated request, when I call the endpoint, then I receive a 401 error
6. Given missing required fields, when I call the endpoint, then I receive a 400 error

**Technical Notes:**
- File: `server/api/session/bootstrap.post.ts`
- Conversation creation mirrors `/api/chat.post.ts` lines 365-377
- Check-in cancellation mirrors `/api/chat.post.ts` lines 383-402
- Use `serverSupabaseServiceRole()` for DB writes (same as `/api/chat`)
- Use `getDefaultModel()` for the `model` field on the conversation record

**Dependencies:** US-1

**Test Requirements:**
- Unit test: conversation and message creation
- Unit test: evidence bridge check-in cancellation
- Unit test: auth and validation

**Estimated Complexity:** M — DB writes + check-in cancellation logic (mirrored from existing code)

---

### Phase 3: Client Fast-Start Path

#### US-4: Fast-Start Path in startConversation()

**Description:** As a user starting a core session, I want the coach's voice to begin within ~1 second so that the session feels immediate and conversational.

**Acceptance Criteria:**

1. Given a core session where opening text is available (L1 static or L2/L3 precomputed), when I start the session, then the coach's voice begins playing within ~1 second (measured from `startConversation()` call)
2. Given the fast path is used, when audio plays, then word-by-word text highlighting works identically to the current flow
3. Given the fast path is used, when the opening audio completes, then the opening text is in the `messages` array as an assistant message (ensuring LLM context continuity for REQ-8)
4. Given the fast path is used and the bootstrap succeeds, when audio completes, then `conversationId` is set and the user can send their first response
5. Given the fast path is used but opening text is unavailable (returns null), when starting the session, then the system falls back to the current flow transparently (no error, no different UI) per REQ-6
6. Given the fast path is used but `playAIResponse()` fails (TTS error), when starting the session, then the system falls back to the current flow transparently per REQ-6
7. Given the fast path audio is playing, when the bootstrap endpoint fails, then the system retries with exponential backoff (1s, 2s, 4s) up to 3 times within a 15-second window per REQ-9
8. Given all bootstrap retries fail, when the user sends their first response via `sendMessage()`, then `sendMessage()` falls through to `/api/chat` which creates the conversation (deferred creation per REQ-9)
9. Given all bootstrap retries fail, when the user sends their first response, then the opening text is included in the `messages` array sent to `/api/chat` so the LLM has full context
10. Given a non-core session (check-in, ceremony, reinforcement), when I start the session, then the existing flow is used (fast path not attempted)

**Technical Notes:**
- File: `composables/useVoiceChat.ts`
- Add fast-path branch at the top of `startConversation()`
- Add `bootstrapWithRetry()` private function for retry logic
- `playAIResponse()` is called directly — it handles TTS call + audio playback + word highlighting
- Bootstrap promise runs in parallel with audio playback (non-blocking)
- Fallback is simply "don't return early" — let the existing code execute

**Dependencies:** US-2, US-3

**Test Requirements:**
- Unit test: fast-path branch taken when text available
- Unit test: fallback when text unavailable
- Unit test: fallback when playAIResponse fails
- Unit test: bootstrap retry logic (attempts, backoff timing, max window)
- Unit test: deferred creation when bootstrap fails
- E2E test: L1 session starts with fast path (mock opening-text endpoint)
- E2E test: fallback scenario (mock opening-text returning null)

**Estimated Complexity:** L — Core feature logic with parallel execution, retry, and fallback paths

---

### Phase 4: L2/L3 Pre-Computation

#### US-5: Pre-Computation Background Job

**Description:** As the system, I want to pre-compute the L2/L3 opening message after a session completes so that the next session can use the fast-start path.

**Acceptance Criteria:**

1. Given a user's L1 session completes, when the pre-computation job runs, then it generates an L2 opening message using the same prompt construction as `/api/chat` (system prompt + personalization + bridge context + cross-layer context)
2. Given a user's L2 session completes, when the pre-computation job runs, then it generates an L3 opening message
3. Given the job succeeds, when I check `user_progress`, then `precomputed_opening_text` contains the generated text and `precomputed_opening_at` is set to the current timestamp
4. Given the first attempt fails, when the job retries after 500ms, then if the retry succeeds the text is stored normally
5. Given both attempts fail, when I check `user_progress`, then `precomputed_opening_text` is unchanged (may be null or contain stale text from a previous run)
6. Given both attempts fail, when I check server logs, then both failures are logged with `[precompute-opening]` tag including attempt number and error
7. Given the generated opening text is empty, when the job processes it, then it treats it as a failure and retries

**Technical Notes:**
- File: `server/utils/session/precompute-opening.ts`
- Uses `buildSystemPrompt()`, `buildSessionContext()`, `buildCrossLayerContext()`, `buildBridgeContext()` — same functions as `/api/chat`
- Uses `getModelRouter().chat()` with `getDefaultModel()` (primary chat model)
- Generation prompt asks for opening message only (2-4 sentences, warm, acknowledges progress, ends with open question)
- Retry: 1 retry with 500ms delay

**Dependencies:** US-1

**Test Requirements:**
- Unit test: correct system prompt construction (verify it includes bridge context, cross-layer context)
- Unit test: successful storage of generated text
- Unit test: retry on first failure
- Unit test: graceful failure after both attempts
- Unit test: empty text treated as failure

**Estimated Complexity:** M — Prompt construction (reusing existing functions) + LLM call + storage + retry

---

#### US-6: Trigger Pre-Computation on Session Completion

**Description:** As the system, I want to trigger the pre-computation job when an L1 or L2 session completes so that the opening text is ready for the user's next session.

**Acceptance Criteria:**

1. Given a user completes an L1 (intellectual) session, when `complete-session.post.ts` runs, then `precomputeOpeningText()` is called with `nextLayer: 'emotional'`
2. Given a user completes an L2 (emotional) session, when `complete-session.post.ts` runs, then `precomputeOpeningText()` is called with `nextLayer: 'identity'`
3. Given a user completes an L3 (identity) session, when `complete-session.post.ts` runs, then `precomputeOpeningText()` is NOT called (next session is a different illusion's L1 which uses static text)
4. Given the pre-computation job fails, when `complete-session.post.ts` continues, then the session completion response is NOT affected (fire-and-forget, non-blocking)
5. Given the pre-computation is triggered, when I check server logs, then the trigger is logged in the `[complete-session]` context

**Technical Notes:**
- File: `server/api/progress/complete-session.post.ts`
- Add fire-and-forget call following the same pattern as `scheduleCheckIns()` and `scheduleEvidenceBridgeCheckIn()` calls
- Only trigger in the layer progression block (when `illusionLayer` is provided), not in the legacy block
- Trigger condition: `illusionLayer === 'intellectual' || illusionLayer === 'emotional'`

**Dependencies:** US-5

**Test Requirements:**
- Unit test: pre-computation triggered for L1 completion
- Unit test: pre-computation triggered for L2 completion
- Unit test: pre-computation NOT triggered for L3 completion
- Unit test: pre-computation failure doesn't affect session completion response

**Estimated Complexity:** S — Single fire-and-forget call added to existing endpoint

---

## Test Specification

<!-- TECH-DESIGN: Complete testing strategy -->

### Unit Tests

#### `tests/unit/server/api/session/opening-text.test.ts`

Tests for `GET /api/session/opening-text`:

| Test Case | Setup | Assertion |
|-----------|-------|-----------|
| Returns static text for L1 intellectual | Mock auth, query `illusionKey=stress_relief, illusionLayer=intellectual` | `{ text: ILLUSION_OPENING_MESSAGES.stress_relief, source: 'static' }` |
| Returns precomputed text for L2 emotional | Mock auth, mock `user_progress` with precomputed text | `{ text: '<precomputed>', source: 'precomputed' }` |
| Returns null for L2 with no precomputed text | Mock auth, mock `user_progress` with null text | `{ text: null, source: null }` |
| Returns null for non-core session | Mock auth, query `sessionType=check_in` | `{ text: null, source: null }` |
| Returns 401 for unauthenticated | No auth mock | HTTP 401 |
| Returns 400 for invalid illusionKey | Mock auth, query `illusionKey=invalid` | HTTP 400 |

**Mock strategy:** Mock `serverSupabaseUser()` and `serverSupabaseServiceRole()`. Use in-memory mock for Supabase queries.

#### `tests/unit/server/api/session/bootstrap.test.ts`

Tests for `POST /api/session/bootstrap`:

| Test Case | Setup | Assertion |
|-----------|-------|-----------|
| Creates conversation and saves opening message | Mock auth, valid body | Conversation created with correct fields; message saved with `role: 'assistant'` |
| Returns conversationId | Mock auth, valid body | Response contains `{ conversationId: '<uuid>' }` |
| Cancels evidence bridge check-ins | Mock auth, mock pending check-ins | Check-ins updated to `status: 'cancelled'` |
| Returns 401 for unauthenticated | No auth | HTTP 401 |
| Returns 400 for missing fields | Mock auth, incomplete body | HTTP 400 |

**Mock strategy:** Mock Supabase client. Verify insert/update calls on `conversations`, `messages`, `check_in_schedule` tables.

#### `tests/unit/server/utils/session/precompute-opening.test.ts`

Tests for `precomputeOpeningText()`:

| Test Case | Setup | Assertion |
|-----------|-------|-----------|
| Generates and stores opening text | Mock LLM returning valid text, mock Supabase | `user_progress.precomputed_opening_text` updated |
| Retries once on first failure | Mock LLM failing then succeeding | Two LLM calls made; text stored on second |
| Fails gracefully after both attempts | Mock LLM failing twice | No Supabase update; errors logged |
| Treats empty response as failure | Mock LLM returning empty string | Triggers retry; no text stored if both empty |
| Builds correct system prompt | Mock all dependencies | Verify `buildSystemPrompt()` called with correct `illusionLayer`, `bridgeContext`, etc. |

**Mock strategy:** Mock `getModelRouter()`, `buildSessionContext()`, `buildCrossLayerContext()`, `buildBridgeContext()`, `buildSystemPrompt()`, and Supabase client.

#### `tests/unit/composables/useVoiceChat-instant-start.test.ts`

Tests for the fast-start path in `startConversation()`:

| Test Case | Setup | Assertion |
|-----------|-------|-----------|
| Uses fast path when opening text available | Mock `/api/session/opening-text` returning text | `playAIResponse()` called with text; bootstrap called in parallel |
| Falls back when opening text unavailable | Mock endpoint returning `{ text: null }` | `runStreamingWithResilience()` called (existing flow) |
| Falls back when playAIResponse fails | Mock endpoint returning text; mock `playAIResponse` rejecting | Existing flow used |
| Pushes assistant message after audio | Mock successful fast path | `messages.value` contains `{ role: 'assistant', content: text }` |
| Sets conversationId from bootstrap | Mock successful bootstrap | `conversationId.value` set |
| Retries bootstrap with exponential backoff | Mock bootstrap failing then succeeding | 3 calls with increasing delays |
| Deferred creation when bootstrap fails | Mock bootstrap failing all retries | `conversationId.value` remains null |
| Skips fast path for non-core sessions | `sessionType: 'check_in'` | Fast path not attempted; existing flow used |

**Mock strategy:** Mock `$fetch` for API calls. Mock `voiceSession.playAIResponse()`. Test timing of bootstrap retries with fake timers.

#### `tests/unit/server/api/progress/complete-session-precompute.test.ts`

Tests for pre-computation trigger:

| Test Case | Setup | Assertion |
|-----------|-------|-----------|
| Triggers pre-computation on L1 completion | `illusionLayer: 'intellectual'` | `precomputeOpeningText()` called with `nextLayer: 'emotional'` |
| Triggers pre-computation on L2 completion | `illusionLayer: 'emotional'` | Called with `nextLayer: 'identity'` |
| Does NOT trigger on L3 completion | `illusionLayer: 'identity'` | `precomputeOpeningText()` not called |
| Pre-computation failure doesn't affect response | Mock pre-computation throwing | Session completion response returned normally |

**Mock strategy:** Mock `precomputeOpeningText()` and verify call args. Existing test setup for `complete-session.post.ts` extended.

### E2E Tests

#### `tests/e2e/instant-conversations.spec.ts`

| Test | Steps | Assertions |
|------|-------|------------|
| **L1 fast-start: audio plays quickly** | Mock `opening-text` returning static text. Mock `synthesize` returning audio. Mock `bootstrap` returning conversationId. Navigate to session, grant mic permission. | Audio playback starts. Word highlighting active. `conversationId` set. |
| **L2 fast-start: precomputed text** | Mock `opening-text` returning precomputed text. Same TTS/bootstrap mocks. | Same assertions as L1. |
| **Fallback: no opening text** | Mock `opening-text` returning `{ text: null }`. Mock `/api/chat` with streaming response. | Falls back to current flow. Session starts normally (slower). No error visible. |
| **Fallback: TTS failure** | Mock `opening-text` returning text. Mock `synthesize` failing. Mock `/api/chat` with streaming response. | Falls back to current flow. Session starts normally. |
| **Bootstrap failure → deferred creation** | Mock `opening-text` returning text. Mock `synthesize` succeeding. Mock `bootstrap` failing all retries. Mock `/api/chat` for first user message. | Audio plays. User can respond. Conversation created on first message. |
| **Non-core session skips fast path** | Navigate to check-in session. | Fast-path endpoint not called. Current flow used. |

**Mock strategy:** Use `page.route()` to intercept API calls. Mock `/api/session/opening-text`, `/api/voice/synthesize`, `/api/session/bootstrap`, and `/api/chat` as needed.

**File location:** `tests/e2e/instant-conversations.spec.ts`

### Coverage Goals

**Highest risk areas (deepest coverage):**
1. `startConversation()` fast-path branch — all decision paths and fallback triggers
2. `bootstrapWithRetry()` — retry logic, timing, max window
3. `precomputeOpeningText()` — prompt construction parity with `/api/chat`

**"Done" for testing:**
- All unit tests pass
- All E2E tests pass
- Manual QA: L1 session starts in <1 second (Chrome DevTools timing)
- Manual QA: trigger each fallback scenario and verify no visible difference

---

## Implementation Plan

<!-- TECH-DESIGN: Phased implementation ordering -->

### Phase 1: Foundation (US-1)

Deploy the database migration first. This is non-breaking — adding nullable columns has no effect on existing code.

### Phase 2: Server Endpoints (US-2, US-3) — parallelizable

Both endpoints can be built independently. Neither depends on the other.

### Phase 3: Client Fast-Start (US-4) — depends on Phase 2

This is the core feature. Requires both server endpoints to be deployed.

### Phase 4: Pre-Computation (US-5, US-6) — depends on Phase 1

US-5 (the job itself) can be built in parallel with Phase 2/3. US-6 (the trigger) depends on US-5.

**Parallel build opportunity:** Phases 2 and 4 (US-5) can be built simultaneously by different developers or in parallel tracks.

### Phase 5: Testing & QA

E2E tests and manual QA after all code is deployed.

### Implementation Dependency Graph

```
US-1 (Migration)
  ├── US-2 (Opening Text Endpoint) ──┐
  ├── US-3 (Bootstrap Endpoint) ─────┼── US-4 (Client Fast-Start)
  └── US-5 (Pre-Computation Job) ────┤
                                     └── US-6 (Pre-Computation Trigger)
```

---

## Changelog

| Version | Date | Notes |
|---------|------|-------|
| 1.0 | 2026-02-17 | Initial draft (technical implementation spec) |
| 1.1 | 2026-02-19 | Rewritten as product spec (PRD). Expanded scope to all core session layers (L1, L2, L3). Removed pre-generated audio approach in favor of direct TTS with pre-computed text. Added LLM background pre-computation for L2/L3 openings. |
| 1.2 | 2026-02-19 | UX refinement: Added edge case scenarios (race condition for immediate session navigation, bootstrap endpoint failure during audio playback). Added REQ-9 through REQ-11. Resolved open questions on pre-computation timing, text expiry, TTS consistency, and bootstrap failure handling. Confirmed no UI changes needed — existing waveform/loading state applies. |
| 1.3 | 2026-02-19 | Requirements refinement: Refined REQ-2 (pre-computation trigger, prompt construction, job retry), REQ-6 (explicit L1 lookup failure coverage), REQ-9 (bounded retry: 3 retries, exponential backoff, 15s max), REQ-10 (persists until session completion, not deleted at bootstrap). Added REQ-12 (fast-start decision logic), REQ-13 (storage on user_progress table with lifecycle), REQ-14 (auth/security), REQ-15 (server-side logging). Resolved Open Question #1 (storage location). Reorganized requirements into categorized sections. |
| 1.4 | 2026-02-19 | Technical design: Client-side orchestration architecture with 3-endpoint design (opening-text, bootstrap, existing synthesize). Pre-computation job triggered from complete-session. 6 user stories (US-1 through US-6) with acceptance criteria. Complete test specification (unit + E2E). Implementation dependency graph and phased plan. Status → Implementation Ready. |
