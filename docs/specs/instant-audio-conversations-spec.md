# Instant Audio: First Conversation Cold Start Spec

**Version:** 1.0
**Created:** 2026-02-17
**Last Updated:** 2026-02-17
**Status:** Draft
**Document Type:** Technical Specification

---

## Table of Contents

1. [Overview](#overview)
2. [Problem Statement](#problem-statement)
3. [Goals](#goals)
4. [Non-Goals](#non-goals)
5. [Current Architecture](#current-architecture)
6. [Latency Analysis](#latency-analysis)
7. [Solution Options](#solution-options)
8. [Recommended Approach](#recommended-approach)
9. [Fallback Behavior](#fallback-behavior)
10. [Implementation Plan](#implementation-plan)
11. [Acceptance Criteria](#acceptance-criteria)
12. [Open Questions](#open-questions)

---

## Overview

The first audio the user hears in a voice session currently takes 3–8 seconds to begin playing. This is caused by a live LLM call being made to generate text we already know — the opening messages are hardcoded in `ILLUSION_OPENING_MESSAGES`. This spec defines a strategy to eliminate or drastically reduce this cold-start latency for the first message of a conversation.

---

## Problem Statement

When a user starts a voice session, the current flow is:

1. `startConversation()` fires `POST /api/chat` with an empty `messages` array
2. Server authenticates, builds a system prompt (including the scripted opening), and calls the LLM
3. The LLM generates the opening text token by token
4. `SentenceDetector` waits for a complete sentence before triggering TTS
5. The TTS provider synthesizes that sentence
6. Audio streams back to the client, which decodes and plays it

The result: **3–8 seconds of silence** before the user hears anything. For a voice-first app designed to feel like a conversation with a real coach, this is a significant friction point — especially on the very first impression.

The irony: the 5 opening messages (`stress_relief`, `pleasure`, `willpower`, `focus`, `identity`) for L1 sessions are **already fully defined** as static strings. The LLM is being asked to regenerate text that is deterministic and known at build time.

---

## Goals

- Eliminate or near-eliminate time-to-first-audio for L1 (intellectual layer) voice sessions
- Make the first impression feel immediate and human, not like a loading screen
- Keep the implementation simple and maintainable
- Preserve conversational continuity — the conversation record and subsequent LLM context are not compromised

---

## Non-Goals

- Optimizing latency for mid-conversation turns (separate problem, different trade-offs)
- Personalizing the opening message using user intake data (the current openings are intentionally generic to invite the user to share)
- Eliminating TTS latency for L2/L3 sessions or check-ins (those openings depend on prior session context — addressed in Fallback Behavior)
- Offline/cached audio for users on slow connections

---

## Current Architecture

### Opening Messages

Defined in `server/utils/prompts/index.ts:182`:

```typescript
export const ILLUSION_OPENING_MESSAGES: Record<IllusionKey, string> = {
  stress_relief: `Hey there. I want to explore something with you...`,
  pleasure: `Welcome. Let's talk about pleasure and enjoyment...`,
  willpower: `Hey. So this session is about the idea that quitting requires massive willpower...`,
  focus: `Welcome. Let's dig into something a lot of people tell me...`,
  identity: `Hey. This session is a bit different—it's about identity...`
}
```

These are injected into the system prompt as an instruction ("Start the conversation with this opening..."), and the LLM reproduces them as its first message.

### Conversation Start Flow (Current)

```
SessionView.vue mounts
  → checkPermission()
  → [permission overlay shown if not granted]
  → user taps "Enable Microphone"
  → preInitAudio()  ← creates AudioContext in user gesture
  → startConversation()
  → POST /api/chat { messages: [], illusionKey, illusionLayer, streamTTS: true }
  → [server: auth + DB + prompt assembly + LLM streaming + TTS]
  → first audio_chunk SSE event received
  → AudioContext decodes and schedules playback
  → 🔊 user hears audio
```

### Key Files

| File | Role |
|------|------|
| `server/utils/prompts/index.ts` | `ILLUSION_OPENING_MESSAGES` definitions |
| `server/api/chat.post.ts` | Main endpoint; detects `isNewConversation`, builds prompt, calls LLM, streams TTS |
| `composables/useVoiceChat.ts` | `startConversation()` — initiates the empty-messages chat call |
| `components/voice/SessionView.vue` | Orchestrates session start; shows permission overlay |
| `server/utils/tts/index.ts` | TTS provider factory |
| `server/utils/tts/sentence-detector.ts` | Waits for complete sentence before firing TTS |

---

## Latency Analysis

| Step | Estimated Duration |
|------|--------------------|
| `POST /api/chat` network round trip | 50–200ms |
| Server: auth + Supabase session lookup | 100–300ms |
| Server: system prompt assembly | 10–50ms |
| LLM: time to first token | 500–2000ms |
| LLM: time to complete first sentence | 500–2000ms additional |
| TTS synthesis of first sentence | 400–1000ms |
| Audio chunk SSE transfer | 50–200ms |
| Client decode + schedule | ~50ms |
| **Total** | **~1.7–5.8s** (often worse with cold providers) |

The LLM call accounts for 60–80% of the delay. TTS accounts for most of the rest.

---

## Solution Options

### Option A: Pre-generated Audio Files (Recommended)

Run the 5 opening messages through the TTS provider at build/deploy time and store the resulting audio as static assets. On session start, play the asset immediately — no server calls required.

**Flow:**
1. A one-time generation script calls the TTS provider for each opening message and saves the audio files
2. Files are served as static assets (e.g., `public/audio/opening/stress_relief.wav`)
3. `SessionView.vue` preloads the file on mount (you know the illusion key from the route)
4. On conversation start: play the preloaded audio immediately
5. In parallel, call a lightweight bootstrap endpoint to create the conversation record and save the opening as the first assistant message
6. By the time the user finishes listening (~15–25 seconds of audio), the conversation is initialized and ready

**Pros:**
- **True zero latency** — audio plays as fast as the browser can decode a preloaded local asset
- Very simple: no changes to the LLM or TTS pipeline
- Completely decoupled from upstream provider availability

**Cons:**
- Must regenerate audio files when opening messages change (rare, but a process to remember)
- Audio quality is locked in at generation time (voice, speed, style)
- 5 static files to maintain (~500KB–2MB total in WAV)

---

### Option B: Pre-stored Text → Direct TTS (Skip LLM)

Use the known `ILLUSION_OPENING_MESSAGES` text directly. On conversation start, send it straight to a TTS-only path, bypassing the LLM entirely.

**Flow:**
1. New endpoint or flag: `POST /api/chat/opening` accepts `{ illusionKey }`, looks up the text, calls TTS, streams audio back
2. No LLM call required for the first message
3. Conversation record created in parallel; opening saved as first assistant message

**Pros:**
- Eliminates ~60–80% of current latency (the LLM portion)
- Always uses live TTS — no stale audio files
- Easy to update opening messages without regenerating files

**Cons:**
- TTS latency (~0.5–1.5s) still remains
- More server-side work than Option A

---

### Option C: Eager Pre-fetch During Permission Overlay

While the permission overlay is visible (the user hasn't tapped anything yet), silently kick off the opening message request and buffer the audio.

**Flow:**
1. On `SessionView.vue` mount, if `permissionState === 'prompt'` (overlay shown), immediately start a background fetch for the opening audio
2. Store the audio buffer in a ref
3. When user taps "Enable Microphone" and `preInitAudio()` creates the `AudioContext`, the audio is already decoded and ready
4. Play immediately with near-zero perceived delay

**Pros:**
- Works with any generation strategy (A or B) as the source
- Completely transparent to the user experience
- Users who take 2+ seconds on the permission overlay get free latency hiding

**Cons:**
- Only benefits users who see the permission overlay (first-time or revoked permission)
- Returning users who already granted permission skip the overlay and get no benefit

---

### Option D: Client-side Audio Cache (IndexedDB)

After the first live TTS generation (via Option B or current approach), cache the resulting audio blob in IndexedDB keyed by illusion. Subsequent sessions for the same illusion are instant.

**Pros:**
- Zero latency on repeat visits within the same browser
- Pairs well with Option B

**Cons:**
- Doesn't help first-ever visit
- Cache invalidation complexity when opening messages change
- Extra storage usage

---

## Recommended Approach

**Option A (pre-generated audio files) for L1 sessions, combined with Option C (eager pre-fetch during permission overlay) as a delivery strategy.**

Rationale:
- The 5 L1 opening messages are static and rarely change. Pre-generating them is a one-time cost with a large, permanent latency payoff.
- Preloading on page mount means even users who already have mic permission get near-zero latency.
- The total implementation is small: a generation script, 5 static files, a bootstrap endpoint, and modest changes to `SessionView.vue` and `useVoiceChat`.

For **repeat use of the same illusion** (L1 retakes, if ever supported), the preloaded asset serves again with no additional cost.

### High-Level Implementation Sketch

```
[Build/deploy time]
generate-openings.ts script
  → for each illusionKey in ILLUSION_OPENING_MESSAGES
  → call TTS provider
  → write audio file to public/audio/opening/{illusionKey}.wav

[Session page load]
SessionView.vue onMounted
  → if (sessionType === 'core' && illusionLayer === 'intellectual')
  → preload = new Audio(`/audio/opening/${illusionKey}.wav`)
  → preload.preload = 'auto'

[startConversation() — new path for L1 only]
  → play(preload)          ← immediate
  → display opening text with word highlighting (from known string)
  → POST /api/conversations/bootstrap { illusionKey, illusionLayer }
      → creates conversation record
      → saves opening text as first assistant message
      → returns conversationId
  → set conversationId.value = response.conversationId
  → isAISpeaking tracks preload.onended

[User responds]
  → normal recordAndSend() flow
  → conversationId already set, LLM has full context
```

### Word Highlighting

Since we know the opening text in advance, word-by-word highlighting can use estimated timing (the same 150 WPM approach Groq TTS already uses) applied against the known string — no TTS timing metadata needed.

---

## Fallback Behavior

### L2/L3 Sessions (Emotional / Identity Layers)

These opening messages are composed dynamically from prior session context (bridge context, conviction assessment, cross-layer themes). Pre-generating them is not feasible.

For L2/L3:
- **Option B** (skip LLM, build opening text server-side and send directly to TTS) is the right optimization if latency becomes a problem
- The server already has all the data needed to compose the L2/L3 opening without an LLM call
- This is a follow-on optimization; not in scope for this iteration

### Check-in Sessions

Check-in openings are generated from the check-in prompt, which is user/session-specific. These also need Option B or the current approach. Not in scope.

### TTS Provider Unavailable

If the static audio file fails to load (404, network error), the system should transparently fall back to the current full LLM + live TTS path. The user experiences the existing latency but the session is not broken.

---

## Implementation Plan

### Phase 1: Pre-generated Audio + Bootstrap Endpoint

**Step 1: Audio generation script**
- Create `scripts/generate-opening-audio.ts`
- Reads `ILLUSION_OPENING_MESSAGES` for each key
- Calls the configured TTS provider (Groq/Orpheus, same voice settings as live sessions)
- Saves to `public/audio/opening/{illusionKey}.wav`
- Run manually before deploy when messages change

**Step 2: Bootstrap endpoint**
- Create `server/api/conversations/bootstrap.post.ts`
- Accepts `{ illusionKey, illusionLayer, sessionType }`
- Creates conversation record in Supabase
- Inserts the opening text as the first assistant message (role: `assistant`)
- Returns `{ conversationId }`

**Step 3: Client-side changes in `SessionView.vue`**
- On mount (for L1 core sessions): create a preloaded `Audio` object for the opening file
- Add `openingAudioPreload` ref

**Step 4: Update `useVoiceChat.startConversation()` for L1**
- Detect L1 core session (passed as prop/param)
- Instead of `POST /api/chat` with empty messages:
  1. Play preloaded audio
  2. Display opening text with estimated word highlighting
  3. Call `POST /api/conversations/bootstrap` to get `conversationId`
- Fall back to current path if preloaded audio fails to load

**Step 5: Verify word highlighting works with estimated timing**
- Confirm `useStreamingAudioQueue`'s word timing approach can be reused or a lightweight equivalent applied to the static text

### Phase 2 (Follow-on): L2/L3 Direct-TTS Opening

- Build opening text server-side from session context (no LLM)
- New path in `chat.post.ts`: if `isNewConversation && illusionLayer !== 'intellectual'`, compose opening without LLM call and stream TTS directly

---

## Acceptance Criteria

- [ ] Time from `startConversation()` call to first audio playback is < 500ms for L1 core sessions (measured in Chrome DevTools)
- [ ] Pre-generated audio files exist for all 5 illusion keys and match the current `ILLUSION_OPENING_MESSAGES` content
- [ ] Word-by-word text highlighting works during pre-generated audio playback
- [ ] A conversation record is created in Supabase with the opening text saved as the first assistant message before the user sends their first response
- [ ] `conversationId` is available for the first user turn (no orphaned messages)
- [ ] If the pre-generated audio file fails to load, the session falls back to the current LLM+TTS path without crashing
- [ ] L2/L3 sessions and check-ins are unaffected and continue using the current path
- [ ] The generation script runs without error and produces playable audio files

---

## Open Questions

1. **Voice consistency:** The pre-generated files will be generated at a specific point in time with specific TTS provider settings. If the provider or voice configuration changes, files need to be regenerated. Should there be a checksum/version check to warn when files may be stale?

2. **File format:** The Groq TTS provider returns WAV. Is WAV acceptable for static serving, or should we convert to MP3/OGG for smaller file size? WAV files for ~25-word messages are likely 200–500KB each, which is fine.

3. **Bootstrap endpoint auth:** The bootstrap endpoint creates a conversation record and must be authenticated. The client already has a Supabase session — confirm this works with the existing auth middleware without changes.

4. **L1 re-entry:** If a user has already completed an L1 session and somehow re-enters (edge case today), should they still hear the pre-generated opening? Probably yes — the illusion content is the same regardless.

5. **Changelog:** Should the generation script be run as part of CI/CD, or documented as a manual step when `ILLUSION_OPENING_MESSAGES` changes?

---

## Changelog

| Version | Date | Notes |
|---------|------|-------|
| 1.0 | 2026-02-17 | Initial draft |
