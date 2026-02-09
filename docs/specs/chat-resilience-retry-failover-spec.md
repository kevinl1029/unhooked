# Chat Resilience Retry and Failover Spec

**Created:** 2026-02-09
**Last Updated:** 2026-02-09
**Status:** Implemented
**Document Type:** Technical Specification

---

## Table of Contents

1. [Overview](#overview)
2. [Problem Statement](#problem-statement)
3. [Goals](#goals)
4. [Non-Goals](#non-goals)
5. [Product Decisions](#product-decisions)
6. [User Experience Contract](#user-experience-contract)
7. [Retry and Failover Policy](#retry-and-failover-policy)
8. [Error Classification](#error-classification)
9. [State Model](#state-model)
10. [Implementation Mapping](#implementation-mapping)
11. [Implementation Checklist](#implementation-checklist)
12. [Acceptance Criteria](#acceptance-criteria)
13. [Testing Requirements](#testing-requirements)
14. [Observability Requirements](#observability-requirements)
15. [Rollout Plan](#rollout-plan)

---

## Overview

This specification defines the resilience behavior for chat and voice sessions when a streaming request fails due to transient upstream model availability issues (especially HTTP 503 bursts).

The implementation must preserve therapeutic continuity and prevent "silent blank turns" where the user does not receive a visible assistant response.

This spec is the source of truth for:

- user-facing retry/failover experience
- attempt policy and fallback sequencing
- empty-message prevention contract
- required telemetry for diagnosis

---

## Problem Statement

Current behavior can produce an empty assistant response on the client after a failed stream. The UI hides empty assistant content, so users experience a missing turn and often send a follow-up like "Hello?".

Observed failure pattern:

1. stream request starts normally
2. upstream provider returns transient error (example: 503)
3. client stream processing ends with no tokens and no done event
4. client still records the turn as success and appends empty assistant message

This breaks flow and increases user confusion in therapeutic conversations.

---

## Goals

1. Eliminate silent blank assistant turns.
2. Recover automatically from transient failures with minimal user effort.
3. Keep copy fully therapeutic-contextual (no provider/model language).
4. Preserve user input without requiring re-entry.
5. Make failure states observable and debuggable with request correlation IDs.

---

## Non-Goals

1. No redesign of core therapeutic prompt or session logic.
2. No user-facing exposure of model/provider names.
3. No infinite retries.
4. No persistence of transient status bubbles to database history.

---

## Product Decisions

1. Maximum of 3 total attempts per turn.
2. Attempt 1 uses primary provider/model.
3. Attempt 2 retries primary provider/model once.
4. Attempt 3 fails over to secondary provider/model.
5. If all attempts fail, show inline assistant error bubble with a `Retry` button.
6. User should never need to retype the previous message to continue.
7. Final failure state should keep normal input available, while prioritizing `Retry` for continuity.

---

## User Experience Contract

### UX Principles

1. Do not break therapeutic context with technical language.
2. Communicate progress in-chat, not only in console or toast.
3. Never show an empty assistant bubble.

### Inline Status Copy

Status copy should be short and neutral:

1. During automatic retry: `One moment...`
2. During failover attempt: `Still with you...`
3. Final failure: `I'm still here. I had trouble replying just now. Tap Retry and I'll pick up right where we left off.`

### Final Failure UI

After all 3 attempts fail, render an assistant-style error bubble with:

1. above final-failure copy
2. primary button: `Retry`

Behavior:

1. `Retry` resends the same logical turn using current retry policy.
2. if user sends a new message instead, clear failed-turn UI and process the new turn normally.

---

## Retry and Failover Policy

For each user turn:

1. Attempt 1: primary provider/model.
2. If transient failure, wait jittered backoff 600-1200ms.
3. Attempt 2: primary provider/model retry once.
4. If transient failure again, immediately execute Attempt 3.
5. Attempt 3: secondary provider/model.
6. If Attempt 3 fails, present final actionable failure UI.

Constraints:

1. No more than one automatic retry on primary.
2. No additional automatic retries after secondary failure.
3. No assistant message persisted if assistant content is empty.

---

## Error Classification

### Transient (eligible for retry/failover sequence)

1. HTTP 503
2. network fetch failure / connection reset / timeout during stream
3. stream ends without `done` event

### Non-Transient (fail fast to actionable UI)

1. auth/permission errors (401/403)
2. malformed request (400)
3. explicit policy/safety rejection responses

---

## State Model

Per turn, the client should use this state progression:

1. `sending`
2. `retrying_primary` (if attempt 1 transient-fails)
3. `failing_over` (if attempt 2 transient-fails)
4. `succeeded` or `failed_actionable`

Rules:

1. A stream is successful only if:
   - a `done` event is received
   - no stream error event is received
   - assistant content is non-empty after trimming
2. Any violation of success rules moves attempt to failure handling.
3. Empty assistant content must never be appended to client message list.

---

## Implementation Mapping

### Client

1. `composables/useStreamingTTS.ts`
   - expose stream completion/error signals required for success classification
2. `composables/useVoiceSession.ts`
   - treat `error event`, `missing done`, or empty transcript as failed attempt
3. `composables/useVoiceChat.ts`
   - orchestrate attempt sequencing (primary retry then failover)
   - manage inline status/final failure bubble state
   - prevent appending empty assistant message
4. `components/voice/SessionView.vue`
   - render transient status bubble
   - render final actionable failure bubble with `Retry`

### Server

1. `server/api/chat.post.ts`
   - keep request correlation ID in stream events
   - do not persist empty assistant responses
   - surface structured stream error payload for classification
2. LLM router/provider layer
   - support explicit model/provider override per attempt (primary vs secondary)

### Configuration

Add runtime-configurable keys for resilience routing:

1. primary provider/model
2. secondary provider/model
3. retry backoff bounds

---

## Implementation Checklist

Execute in this order:

1. Add/confirm runtime config for primary and secondary provider-model routing.
2. Implement server-side attempt override support in the chat path so each attempt can select provider/model explicitly.
3. Harden stream success classification in client flow:
   - require `done`
   - fail on stream `error`
   - fail on empty assistant content
4. Implement retry orchestration in voice chat flow:
   - attempt 1 primary
   - attempt 2 primary retry once with 600-1200ms jitter backoff
   - attempt 3 secondary failover
5. Add in-chat transient status bubble states for retry and failover progress.
6. Add final actionable assistant error bubble with `Retry` button.
7. Implement failed-turn continuation behavior:
   - `Retry` replays same logical turn
   - new user input clears failed-turn UI and proceeds normally
8. Enforce empty-message guardrails:
   - client: never append empty assistant message
   - server: never persist empty assistant message
9. Complete telemetry fields for each attempt and verify `requestId` correlation end-to-end.
10. Add/extend unit, integration, and e2e coverage per this spec.
11. Run staged rollout behind feature flag and monitor reliability metrics before full enablement.

---

## Acceptance Criteria

1. Given a transient stream failure on attempt 1, when processing a user turn, then the app automatically retries once and shows transient in-chat status copy.
2. Given transient failures on attempts 1 and 2, when processing a user turn, then the app executes one failover attempt without user action.
3. Given all 3 attempts fail, when the turn ends, then the app shows an inline assistant failure bubble with a `Retry` button.
4. Given final failure UI is visible, when the user taps `Retry`, then the same logical turn is retried without requiring re-entry of prior user text.
5. Given final failure UI is visible, when the user sends a new message, then failed-turn UI is cleared and new message is processed normally.
6. Given any failed stream attempt, when no assistant content is produced, then no empty assistant message is appended or persisted.
7. Given a successful assistant response after retry or failover, when it is rendered, then conversation continues with no technical provider/model language in UI copy.
8. Given a stream error, when logs are emitted, then logs include request correlation ID, attempt number, classification, and outcome.

---

## Testing Requirements

### Unit

1. stream success classifier logic (`done`, no error, non-empty content)
2. retry sequencing logic (attempt counts and transitions)
3. final failure state and `Retry` action behavior
4. empty-message guard (client and server)

### Integration

1. simulate provider 503 on attempt 1 then success on attempt 2
2. simulate 503 on attempts 1 and 2 then success on failover attempt 3
3. simulate failure on all attempts and verify inline `Retry` UI path

### E2E

1. voice turn with transient failure and automatic recovery
2. voice turn with full failure and manual retry success
3. verify no blank assistant bubble is displayed
4. verify no consecutive persisted user messages caused by empty assistant insertion bug

---

## Observability Requirements

Per attempt, capture:

1. `requestId`
2. conversation id
3. attempt number (1/2/3)
4. provider/model used
5. classification (`transient` or `non_transient`)
6. token count / token chars
7. saw error event
8. saw done event
9. assistant content length
10. final attempt outcome (`success`, `retry`, `failover`, `failed_actionable`)

Dashboard/queries should support:

1. transient failure rate by provider/model
2. retries per turn
3. failover frequency
4. final failure rate
5. blank-turn prevention (empty assistant persisted count should remain zero)

---

## Rollout Plan

1. ship behind a runtime feature flag
2. enable in development first
3. run targeted QA for voice and text paths
4. enable in production
5. monitor 7-day failure metrics and adjust backoff/provider defaults if needed
