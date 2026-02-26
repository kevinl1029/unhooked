# Unhooked: Decision Records

**Version:** 1.8
**Created:** 2026-01-19
**Last Updated:** 2026-02-25
**Document Type:** Architecture Decision Records (ADR)

---

## Overview

This document captures significant product, design, and architecture decisions for Unhooked. Each decision includes context, the decision made, rationale, and any alternatives considered.

**Purpose:**
- Provide historical context for why things are built the way they are
- Help future contributors (or future-you) understand trade-offs
- Prevent relitigating settled decisions without new information
- Track what was considered but rejected

**When to add a decision:**
- Product/UX choices that affect user behavior or program effectiveness
- Architecture choices with long-term implications
- Trade-offs where reasonable people might disagree
- Decisions that reverse or modify previous decisions

---

## Decision Record Format

Each decision follows this structure:

```
### ADR-[NUMBER]: [Title]

**Date:** YYYY-MM-DD  
**Status:** Proposed | Accepted | Deprecated | Superseded by ADR-XXX  
**Decision Maker(s):** [Who made this call]

**Context:**
[What situation or problem prompted this decision?]

**Decision:**
[What was decided?]

**Rationale:**
[Why was this the right choice?]

**Alternatives Considered:**
[What other options were evaluated and why were they rejected?]

**Consequences:**
[What are the implications? What needs to change?]

**Related Documents:**
[Links to specs, PRDs, or other ADRs]
```

---

## Decisions

---

### ADR-001: Session Complete Primary CTA — Return to Dashboard

**Date:** 2026-01-19  
**Status:** Accepted  
**Decision Maker(s):** Kevin

**Context:**

When a user completes a core session (which can take 10+ minutes of deep psychological work), they see a transition card with two options:
- Continue to Next Session
- Return to Dashboard

The question: which should be the primary (more prominent) call-to-action?

The goal of the program is to dismantle five psychological illusions about nicotine. Sessions use Socratic dialogue to help users arrive at insights themselves. The program is framed as a 10-14 day journey, not a binge-able playlist.

**Decision:**

**Return to Dashboard** is the primary CTA. "Continue to Next Session" remains available as a secondary (smaller/quieter) option.

Updated transition card:
```
┌─────────────────────────────────────────────────────────────┐
│  ✓ Session Complete                                         │
│  "Nice work. Let that settle."                              │
│                                                             │
│  [Return Home]              ← Primary                       │
│  Continue to next session → ← Secondary (text link style)  │
└─────────────────────────────────────────────────────────────┘
```

**Rationale:**

1. **The methodology requires spacing.** Allen Carr's approach isn't about cramming information—it's about letting new perspectives marinate through real-world experience. A user who just realized "nicotine doesn't actually relieve my stress" needs to encounter stress and notice the shift before the next illusion lands properly.

2. **Session quality > session quantity.** If users can easily chain 3-4 sessions in a sitting, they may power through without the real-world observation time that makes later sessions personal and powerful. This addresses the open question: "How to handle users who want to rush through?"

3. **The dashboard reinforces program structure.** Returning home after each session communicates "this is a structured program, not a playlist." Users see their progress (filled circles), feel the rhythm of the 10-14 day frame, and approach the next session as a discrete commitment.

4. **The copy already implies pause.** "Nice work. Let that settle." suggests integration time—then immediately offering "Continue to Next Session" as primary contradicts that message.

5. **Preserves user agency.** Users who genuinely have time and energy can still continue immediately via the secondary CTA. We're guiding the default, not removing choice.

**Alternatives Considered:**

| Alternative | Why Rejected |
|-------------|--------------|
| **Continue as primary** | Optimizes for session count over session quality. Risks users rushing through without integration time. Contradicts "let that settle" messaging. |
| **No continue option** | Too restrictive. Some users legitimately have time for another session. Removing choice feels paternalistic. |
| **A/B test first** | Considered, but the theoretical case is strong enough for MVP. Can revisit if completion data shows unexpected drop-off patterns. |
| **Time-gate next session** | (e.g., "Next session available in 4 hours") — Too heavy-handed. Creates artificial friction and patronizes users. |

**Consequences:**

- Update `SessionCompleteCard` component to swap CTA prominence
- Primary button: "Return Home" → navigates to `/dashboard`
- Secondary link: "Continue to next session →" → navigates to next session (if available)
- Track: sessions completed per day per user (to monitor if users feel blocked)
- Monitor: drop-off between sessions (if significantly higher than expected, revisit)

**Related Documents:**
- `unhooked-core-program-implementation-v3_0.md` — Session Transitions section
- `unhooked-progress-tracking.md` — Open Questions section (this resolves "How to handle users who want to rush through?")

---

### ADR-002: Check-In System Refinements

**Date:** 2026-01-19
**Status:** Accepted
**Decision Maker(s):** Kevin

**Context:**

The check-in system was designed to help users reflect after core sessions and maintain engagement. During testing, two bugs were discovered:
1. Check-in emails were not being sent via Resend
2. Check-in interstitial modals showed inconsistently across environments

Investigation revealed the root causes and also surfaced misalignment between the original spec and actual product requirements.

**Original Spec (from `unhooked-core-program-implementation-v3.0.md`):**
- Daily cron job at 10pm UTC
- Rolling 3-day window of morning (9am) and evening (7pm) check-ins
- Post-session check-ins 2 hours after each session
- Multiple pending check-ins could accumulate

**Actual Product Requirements (clarified during debugging):**
- User should only get check-ins about their most recent core session
- If they complete a new session before responding to an old check-in, the old one should be abandoned
- Daily check-ins (morning/evening) are not yet needed—only post-session matters for now

**Decision:**

Four refinements to the check-in system:

1. **Hourly cron instead of daily** — More timely email delivery while remaining free on Vercel Hobby tier

2. **One active post-session check-in at a time** — When a new session completes, any pending post-session check-ins from previous sessions are marked as 'expired'

3. **Daily check-ins deferred** — The morning/evening check-in code remains dormant (not wired up). Will enable in a future iteration if needed.

4. **Re-show opened check-ins** — Users who started but didn't complete a check-in will see the interstitial again on next dashboard visit

**Rationale:**

1. **Hourly cron:** Vercel Hobby tier allows hourly cron jobs for free. The original daily cron at 10pm UTC caused timing issues—post-session check-ins scheduled during the day would have their `scheduled_for` timestamp in the past by the time the cron ran, causing them to be skipped. Hourly ensures check-ins are sent promptly.

2. **One active check-in:** The purpose of post-session check-ins is to capture fresh reflections about the session just completed. Asking about a session from days ago is less valuable. If a user is engaged enough to complete another session, that's more important than collecting feedback on the old one.

3. **Daily check-ins deferred:** The product hasn't validated whether daily touchpoints (independent of sessions) add value. Since only post-session check-ins are currently useful, the morning/evening scheduling code is kept dormant to reduce complexity and avoid spamming users.

4. **Re-show opened:** If a user tapped "respond" but then got interrupted (phone call, closed app), they should have another chance to complete it. The 'opened' status shouldn't be treated as "done."

**Alternatives Considered:**

| Alternative | Why Rejected |
|-------------|--------------|
| **Keep daily cron, expand query window** | Would work but less timely. An hourly cron ensures emails arrive closer to the scheduled time. |
| **Let old check-ins naturally expire** | Creates clutter in the database and potential confusion if an old check-in somehow surfaces. Explicit expiration is cleaner. |
| **Remove daily check-in code entirely** | The code is already written and tested. Keeping it dormant preserves optionality without added complexity. |
| **Once opened, mark as done** | Users who got interrupted would lose the opportunity. Better UX to let them retry. |

**Consequences:**

- `server/utils/email/check-in-sender.ts` — Query window expanded to past 24h + future 24h
- `server/utils/scheduling/check-in-scheduler.ts` — 'opened' status included in pending check-ins query
- `server/utils/session/session-complete.ts` — Expires pending post-session check-ins before scheduling new one
- `vercel.json` — Cron schedule changed from `0 22 * * *` to `0 * * * *` (hourly)
- `unhooked-core-program-implementation-v3.0.md` — Updated to reflect these changes

**Related Documents:**
- `unhooked-core-program-implementation-v3.0.md` — Check-In Scheduling Engine section
- Bug fix branch: `fix/check-in-experience`

---

### ADR-003: Migrate Cron Jobs from Vercel to GitHub Actions

**Date:** 2026-01-19
**Status:** Accepted
**Decision Maker(s):** Kevin

**Context:**

ADR-002 changed the check-in cron from daily (`0 22 * * *`) to hourly (`0 * * * *`) with the assumption that hourly cron was free on Vercel's Hobby tier. This assumption was incorrect.

**The Vercel Hobby Plan Limitation:**

Vercel's documentation uses the term "hourly precision" which is misleading. After deploying, we discovered:
- **Hobby plan only allows 1 cron invocation per day**, not hourly execution
- "Hourly precision" refers to timing accuracy (executions can drift within the scheduled hour), not execution frequency
- Attempting to deploy an hourly cron (`0 * * * *`) causes deployment failures with a generic redirect to the cron pricing page

This caused all staging deployments to fail starting with commit `02ed4ce`.

**Decision:**

Migrate scheduled task execution from Vercel Cron to GitHub Actions:

1. **Keep Vercel Cron as fallback** — Daily execution at 8am UTC (`0 8 * * *`) for reliability
2. **Add GitHub Actions workflow** — Runs every 5 minutes to call the check-in endpoint
3. **Authenticate via CRON_SECRET** — Same secret used by both Vercel and GitHub Actions

**Architecture:**
```
┌─────────────────────────────────────────────────────────────┐
│                    Check-In Trigger Sources                  │
├─────────────────────────────────────────────────────────────┤
│  GitHub Actions (Primary)     │  Vercel Cron (Fallback)     │
│  - Every 5 minutes            │  - Daily at 8am UTC         │
│  - Free tier: unlimited       │  - Free tier: 1/day         │
│  - Calls /api/cron/check-ins  │  - Calls /api/cron/check-ins│
└───────────────┬───────────────┴───────────────┬─────────────┘
                │                               │
                ▼                               ▼
         ┌─────────────────────────────────────────┐
         │         /api/cron/check-ins             │
         │  - Validates CRON_SECRET                │
         │  - Idempotent (safe to call multiple)   │
         │  - Processes pending check-ins          │
         └─────────────────────────────────────────┘
```

**Rationale:**

1. **GitHub Actions is free** — The free tier allows workflows to run every 5 minutes, far exceeding Vercel Hobby's 1/day limit.

2. **More timely delivery** — Check-in emails can be sent within 5 minutes of their scheduled time instead of waiting for the next daily batch.

3. **Vercel fallback provides redundancy** — If GitHub Actions fails or is delayed, the daily Vercel cron ensures at least one daily sweep of pending check-ins.

4. **Minimal code changes** — The endpoint remains the same; only the triggering mechanism changes.

5. **Idempotent design** — The check-in processor was already designed to handle multiple calls safely (checks status before sending, expands query window to catch missed items).

**Alternatives Considered:**

| Alternative | Why Rejected |
|-------------|--------------|
| **Upgrade to Vercel Pro ($20/mo)** | Unnecessary cost when GitHub Actions provides the same capability for free |
| **External cron service (cron-job.org, EasyCron)** | Adds another dependency; GitHub Actions is already part of our stack |
| **Supabase Edge Functions with pg_cron** | More complex setup; requires database-level scheduling configuration |
| **Design around daily batching only** | Reduces user experience; check-in emails would be significantly delayed |

**Consequences:**

- Add `.github/workflows/cron-check-ins.yml` with 5-minute schedule
- Keep `vercel.json` cron at daily (`0 8 * * *`) as fallback
- Add `CRON_SECRET` to GitHub repository secrets
- Update documentation to reflect dual-trigger architecture
- The check-in endpoint must remain idempotent (already is)

**Related Documents:**
- `unhooked-core-program-implementation-v3.0.md` — Check-In Scheduling Engine section
- ADR-002 — Check-In System Refinements (superseded regarding cron frequency)

---

### ADR-004: Ceremony Artifacts Use INSERT, Not UPSERT

**Date:** 2026-01-26
**Status:** Accepted
**Decision Maker(s):** Kevin

**Context:**

The `generate-journey` endpoint was failing with a 500 error when called with a real user. Investigation revealed:

1. The code used Supabase `upsert` with `onConflict: 'user_id,artifact_type'`
2. The database table `ceremony_artifacts` did not have a UNIQUE constraint on those columns
3. The original spec does NOT include this unique constraint

The spec states: "Artifacts are immutable once generated."

**Decision:**

1. **Use INSERT instead of UPSERT** for ceremony artifacts — aligns with spec's immutability principle
2. **Check for existing artifact first** — if one exists, return it; don't regenerate
3. **Do NOT add the UNIQUE constraint** — it's not in the spec and not needed for INSERT pattern
4. **`already_quit` is a request parameter, not a database column** — per spec, it's determined conversationally during ceremony and passed to `/api/ceremony/complete`, not stored in `user_story`

**Rationale:**

1. **Spec compliance:** The original spec says artifacts are immutable. Using INSERT enforces this at the code level.

2. **No unnecessary migrations:** Adding a UNIQUE constraint would require a database migration that deviates from the spec.

3. **`already_quit` timing:** The spec says this is "determined conversationally during ceremony" and passed as a request parameter to the complete endpoint. The journey narrative is generated in Part 1 of the ceremony, before the quit status is determined, so it doesn't need this flag.

4. **Reversible:** If user testing shows upsert would be better (e.g., users want to regenerate journeys), we can:
   - Add the unique constraint migration
   - Change INSERT back to UPSERT

**Alternatives Considered:**

| Alternative | Why Rejected |
|-------------|--------------|
| **Add UNIQUE constraint and use UPSERT** | Deviates from spec; adds migration complexity; not needed since artifacts are immutable |
| **Store `already_quit` in user_story** | Spec says it's determined conversationally and passed as request param; storing it creates timing issues since journey is generated before quit status is known |

**Consequences:**

- `server/api/ceremony/generate-journey.post.ts` — Changed from UPSERT to SELECT→INSERT pattern
- `server/api/ceremony/save-final-recording.post.ts` — Changed from UPSERT to SELECT→UPDATE/INSERT pattern
- Both endpoints use `user_progress.ceremony_completed_at` (which exists) instead of `user_story.ceremony_completed_at` (which doesn't)
- Removed `already_quit` from generate-journey endpoint
- Migration file `20260126_add_ceremony_artifacts_unique_constraint.sql` kept but not applied (available if we change approach)

**Related Documents:**
- `docs/specs/core-program-spec.md` — ceremony_artifacts table definition, Already Quit Flow section
- `supabase/migrations/20260126_add_ceremony_artifacts_unique_constraint.sql` — Unused migration (kept for potential future use)

---

### ADR-005: Dashboard CTA Hierarchy — Single Primary Action Per State

**Date:** 2026-01-27
**Status:** Accepted
**Decision Maker(s):** Kevin

**Context:**

The dashboard displays multiple actionable elements across different user states:

1. **In-Progress** (working through illusions): Progress carousel with Continue/Next CTA, moment cards with "Reconnect with this" CTA
2. **Ceremony-Ready** (all 5 illusions complete, ceremony not started): Final ceremony CTA, journey review, moment replay
3. **Post-Ceremony** (ceremony completed): Support button, moment cards, Your Journey chips

Current implementation styles all CTAs with the same orange gradient (primary button style). This creates:
- **Decision paralysis**: Users unsure which action is most important
- **Diluted emphasis**: When everything is primary, nothing is primary
- **Visual noise**: Multiple equally-weighted buttons compete for attention

**Decision:**

Establish a **single primary CTA per dashboard state**, with all other actions styled as secondary:

| State | Primary CTA | Secondary CTAs |
|-------|-------------|----------------|
| **In-Progress** | Continue/Next (current illusion) | Moment replay ("Reconnect with this"), Revisit buttons |
| **Ceremony-Ready** | Final Ceremony button | Journey review, Moment replay |
| **Post-Ceremony** | Get Support Now | Moment cards, Your Journey chips |

**Layout Order for Ceremony-Ready State:**
1. Final Ceremony container (top, primary CTA)
2. Your Journey section
3. Moment replay section

**Button Styling:**

*Primary:*
```css
background: linear-gradient(135deg, #fc4a1a, #f7b733);
box-shadow: 0 4px 24px rgba(252, 74, 26, 0.3);
```

*Secondary:*
```css
background: rgba(31, 108, 117, 0.5);
border: 1px solid rgba(255, 255, 255, 0.2);
/* No gradient, no orange shadow */
```

**Rationale:**

1. **Reduces cognitive load**: Users immediately see what the most important action is
2. **Supports user journey**: Primary CTA always aligns with the user's primary goal for that state (continue program → complete ceremony → get ongoing support)
3. **Maintains accessibility**: Secondary actions remain visible and accessible, just visually subordinate
4. **Industry best practice**: Single primary CTA per viewport is standard UX guidance

**Alternatives Considered:**

| Alternative | Why Rejected |
|-------------|--------------|
| **Keep all CTAs primary** | Creates decision paralysis, especially with 3 containers in ceremony-ready state |
| **Hide secondary actions** | Too aggressive—users may genuinely want to replay a moment or review their journey |
| **Use size alone (not color)** | Color is a stronger differentiator; size-only hierarchy is harder to perceive |

**Consequences:**

- Update `MomentCard.vue` CTA button from primary to secondary style
- Update `YourJourneySection.vue` chips to use secondary style
- Ensure Continue/Next in ProgressCarousel uses primary style
- Add ceremony-ready state to dashboard with ceremony CTA as primary
- Update `reinforcement-ui-design-spec.md` with CTA hierarchy
- Update `reinforcement-sessions-spec.md` with ceremony-ready layout order

**Related Documents:**
- `docs/specs/reinforcement-ui-design-spec.md` — Component styling specifications
- `docs/specs/reinforcement-sessions-spec.md` — Dashboard layout and states

---

### ADR-006: Deprecate `illusion_number` in Favor of `illusion_key`

**Date:** 2026-01-27
**Status:** Accepted
**Decision Maker(s):** Kevin

**Context:**

The codebase uses two parallel identifiers for illusions:
- `illusion_number` (integer 1-5): Originally the primary identifier, used in URLs, API parameters, and database columns
- `illusion_key` (string: `stress_relief`, `pleasure`, `willpower`, `focus`, `identity`): Added later as a semantic identifier

Analysis revealed significant inconsistency and redundancy:

1. **Route inconsistency**: Core session routes use numbers (`/session/1`) while reinforcement routes use keys (`/reinforcement/stress_relief`)
2. **API layer converts immediately**: The chat endpoint accepts `illusionNumber` but converts it to `illusionKey` via `illusionNumberToKey()` before any logic runs
3. **All downstream logic uses keys**: Context building, moment detection, conviction tracking, and reinforcement sessions exclusively use `illusion_key`
4. **Database has both columns**: The `conversations` table stores both, but only `illusion_key` is indexed and queried
5. **`illusion_number` is never queried**: It's stored but never read back from the database

The conversion functions (`illusionNumberToKey()`, `illusionKeyToNumber()`) exist in `server/utils/llm/task-types.ts`, confirming this is a 1:1 static mapping with no runtime variability.

**Decision:**

1. **Deprecate `illusion_number`** as the primary identifier throughout the codebase
2. **Migrate to `illusion_key`** for all APIs, routes, and client code
3. **Keep conversion utilities** for backward compatibility during transition
4. **Eventually remove** the `illusion_number` column from the database after migration

**Migration Scope:**

| Layer | Current State | Target State |
|-------|---------------|--------------|
| Routes | `/session/1` | `/session/stress_relief` |
| API params | `illusionNumber: number` | `illusionKey: string` |
| Database | Both columns, only `illusion_key` queried | Only `illusion_key` |
| Client code | Sends `illusionNumber` | Sends `illusionKey` |

**Rationale:**

1. **Semantic clarity**: `/session/stress_relief` is self-documenting; `/session/1` requires lookup
2. **Eliminates redundancy**: One source of truth instead of parallel identifiers
3. **Already the operational standard**: All LLM logic, context building, and business rules use `illusion_key`
4. **Future-proof**: Keys don't depend on ordering—illusions could be reordered or personalized per user without breaking logic
5. **Reduces conversion overhead**: No more `illusionNumberToKey()` calls throughout the codebase
6. **Consistency with reinforcement routes**: Those already use keys; core sessions should match

**Alternatives Considered:**

| Alternative | Why Rejected |
|-------------|--------------|
| **Keep both indefinitely** | Creates ongoing maintenance burden; confuses new contributors; encourages inconsistent patterns |
| **Migrate to numbers everywhere** | Numbers are opaque; keys are self-documenting; keys are already used in all business logic |
| **Use numbers in URLs only** | Preserves old URLs but still requires conversion; doesn't solve the fundamental redundancy |

**Consequences:**

- Create migration spec (`docs/specs/illusion-key-migration-spec.md`) to guide implementation
- Phase 1: APIs accept both `illusionNumber` and `illusionKey`, prefer key
- Phase 2: Update routes from `[illusion]` (number) to `[illusionKey]` (string)
- Phase 3: Update all client code to send `illusionKey`
- Phase 4: Remove `illusionNumber` parameter support from APIs
- Phase 5: Database migration to drop `illusion_number` column
- Add redirects from old numeric routes to new key-based routes

**Related Documents:**
- `docs/specs/illusion-key-migration-spec.md` — Detailed implementation guide (to be created)
- `server/utils/llm/task-types.ts` — Contains conversion utilities and `ILLUSION_DATA` mapping

---

### ADR-007: Session Completion — Server-Side Authority Pattern

**Date:** 2026-01-27
**Status:** Accepted
**Decision Maker(s):** Kevin

**Context:**

During implementation review of reinforcement sessions, we discovered that session completion was triggering **two separate assessment paths**:

1. **Server-side:** When `[SESSION_COMPLETE]` is detected in the AI response, `handleSessionComplete()` in `chat.post.ts` runs conviction assessment and updates `user_story`
2. **Client-side:** The reinforcement page's `handleSessionComplete` callback called `POST /api/reinforcement/assess`, which also runs conviction assessment and updates `user_story`

Both paths executed for the same session completion event, resulting in:
- Two LLM calls for conviction assessment
- Two records inserted into `conviction_assessments` table
- Two updates to `user_story` (second potentially overwriting first)

The spec (US-019) mentioned the client calling the assess endpoint, but `handleSessionComplete()` was already designed to handle both core and reinforcement sessions (it explicitly skips check-in scheduling for reinforcement).

**Decision:**

Establish **server-side authority** for session completion handling:

1. `handleSessionComplete()` in `chat.post.ts` is the **single authority** for all post-session tasks
2. The client does **NOT** call `/api/reinforcement/assess` — it simply navigates to dashboard
3. The `/api/reinforcement/assess` endpoint is **retained but reserved** for potential future UI features (e.g., displaying `shift_quality` feedback)

**Architecture:**

```
[SESSION_COMPLETE] detected in AI response
              │
              ▼
    ┌─────────────────────────────────────────┐
    │      handleSessionComplete()             │
    │      (server/utils/session/)             │
    │                                          │
    │  • Run conviction assessment (LLM)       │
    │  • Store in conviction_assessments       │
    │  • Update user_story                     │
    │  • Select key insight                    │
    │  • Generate origin story (if eligible)   │
    │  • Schedule check-ins (core only)        │
    └─────────────────────────────────────────┘
              │
              ▼
    sessionComplete: true returned to client
              │
              ▼
    ┌─────────────────────────────────────────┐
    │      Client (reinforcement page)         │
    │                                          │
    │  • Navigate to dashboard                 │
    │  • (Assessment already complete)         │
    └─────────────────────────────────────────┘
```

**Rationale:**

1. **Reliability:** Server-side execution ensures assessment runs even if client disconnects mid-session
2. **No duplicates:** Single code path = single assessment per session = single database record
3. **Consistency:** Same pattern for core and reinforcement sessions
4. **Simplicity:** Client doesn't need to know about assessment mechanics

**Alternatives Considered:**

| Alternative | Why Rejected |
|-------------|--------------|
| **Client-only assessment** | Unreliable if client disconnects; requires client to know assessment details |
| **Run both, deduplicate in DB** | Wasteful (two LLM calls); complex deduplication logic |

**Consequences:**

- Removed `$fetch('/api/reinforcement/assess')` call from `pages/reinforcement/[illusion].vue`
- `handleSessionComplete()` continues to run for both core and reinforcement sessions
- `/api/reinforcement/assess.post.ts` deprecated (retained for debugging only)
- Updated spec US-019 to reflect server-side assessment
- Added "Session Completion Architecture" section to `reinforcement-sessions-spec.md`

**Related Documents:**
- `docs/specs/reinforcement-sessions-spec.md` — Session Completion Architecture section
- `server/utils/session/session-complete.ts` — `handleSessionComplete()` implementation

---

### ADR-008: Add OpenAI as Alternative LLM Chat Provider

**Date:** 2026-02-25
**Status:** Accepted
**Decision Maker(s):** Kevin

**Context:**

Gemini is the primary LLM provider for all chat and background tasks. In production, Gemini has been experiencing significant reliability issues — HTTP 503 errors on up to 25% of all API calls on some days. While the existing chat resilience system (ADR primary/secondary failover per `chat-resilience-retry-failover-spec.md`) mitigates user-facing impact by retrying and falling back to Groq, the underlying Gemini instability is a risk to conversation quality and user trust.

Currently:
- **Gemini** — fully implemented, primary provider for chat and all background tasks
- **Groq** — fully implemented, secondary/failback provider for chat
- **OpenAI** — TTS only (raw HTTP fetch to `/v1/audio/speech`); no chat provider, no SDK installed
- **Anthropic** — not implemented; types and env vars exist but code is stubbed out

The existing provider abstraction (`LLMProvider` interface, `ModelRouter`, `TaskExecutor`) was designed for multi-provider support. The type system already includes `'openai'` in `ModelType` and `'gpt-4'`/`'gpt-4-turbo'` in `TaskModelType`. Adding a new chat provider is a matter of implementing the interface and registering it in the router.

**Decision:**

Add OpenAI as a fully supported alternative LLM chat provider:

1. **Install the `openai` npm package** as a project dependency
2. **Create `server/utils/llm/providers/openai.ts`** implementing the `LLMProvider` interface (chat + streaming), following the same pattern as `gemini.ts` and `groq.ts`
3. **Uncomment and complete the OpenAI registration** in `server/utils/llm/router.ts`
4. **Target models:**
   - Standard: `gpt-4o` / `gpt-4o-mini` — maps to existing task model types
   - Reasoning: `gpt-5-mini`, `gpt-5`, `o4-mini`, `o3-mini` — auto-detected and handled with parameter restrictions
5. **Reasoning model compatibility:** The provider auto-detects reasoning models (o-series + gpt-5 family, excluding `-chat` variants) and:
   - Strips unsupported parameters (`temperature`, `top_p`, `frequency_penalty`, `presence_penalty`)
   - Converts `system` role messages to `developer` role (required by OpenAI reasoning models)
   - Raises `max_completion_tokens` from 2k to 16k (reasoning/thinking tokens consume part of this budget)
6. **OpenAI becomes a configurable primary or secondary provider** via existing `CHAT_PRIMARY_PROVIDER` / `CHAT_SECONDARY_PROVIDER` env vars
7. **No changes to the resilience/failover architecture** — OpenAI plugs into the existing 3-tier retry system

**Rationale:**

1. **Gemini reliability risk:** 503 error rates of up to 25% on some days are unacceptable for a therapeutic conversation app where trust and continuity matter. Having a production-quality alternative reduces single-provider dependency.

2. **Minimal implementation effort:** The provider abstraction was designed for exactly this scenario. The work is ~80-100 lines of provider code plus SDK installation — no architectural changes needed.

3. **OpenAI over Anthropic (for now):** OpenAI's API is the closest to the existing Groq integration (OpenAI-compatible format), meaning less message format conversion. Anthropic uses a different message format and would require more adaptation. OpenAI is also a more direct comparison to Gemini on cost/quality tradeoffs.

4. **Groq remains the fast fallback:** Groq's strength is inference speed (10-100x faster). OpenAI's value is as a quality alternative to Gemini, not a speed play. The provider hierarchy becomes: Gemini (default) → OpenAI (quality alternative) → Groq (speed fallback).

5. **Cost awareness:** `gpt-4o-mini` provides a cost-effective option for flash-tier tasks, while `gpt-4o` is reserved for pro-tier tasks requiring higher quality.

**Alternatives Considered:**

| Alternative | Why Rejected |
|-------------|--------------|
| **Add Anthropic instead of OpenAI** | Anthropic's message format differs more from the OpenAI standard used internally; higher integration effort. Can be added later. |
| **Add both OpenAI and Anthropic simultaneously** | Unnecessary scope. Solve the immediate reliability problem first with the lower-effort integration. |
| **Increase Groq's role as primary** | Groq excels at speed but uses open-source models (Llama, Mixtral) that may not match Gemini/OpenAI quality for therapeutic conversations requiring nuance and safety. |
| **Wait for Gemini reliability to improve** | Reactive and outside our control. Better to have alternatives ready. |

**Consequences:**

- Install `openai` npm package
- Create `server/utils/llm/providers/openai.ts` implementing `LLMProvider`
- Update `server/utils/llm/router.ts` to register OpenAI provider
- Update `.env.example` with OpenAI model configuration comments
- Update `docs/guides/llm-configuration-guide.md` — move OpenAI from "Future" to "Available"
- Update `docs/specs/chat-infrastructure-spec.md` — note OpenAI as supported provider
- Add `OPENAI_API_KEY` and `OPENAI_MODEL` to Vercel environment variables for staging/production
- Test with `CHAT_PRIMARY_PROVIDER=openai` in staging before production rollout

**Related Documents:**
- `docs/guides/llm-configuration-guide.md` — Provider configuration reference
- `docs/specs/chat-infrastructure-spec.md` — Chat architecture
- `docs/specs/chat-resilience-retry-failover-spec.md` — Failover architecture (unchanged)
- `server/utils/llm/router.ts` — Provider registration
- `server/utils/llm/types.ts` — Type definitions (already includes `'openai'`)

---

## Index

| ADR | Title | Status | Date |
|-----|-------|--------|------|
| 001 | Session Complete Primary CTA — Return to Dashboard | Accepted | 2026-01-19 |
| 002 | Check-In System Refinements | Accepted | 2026-01-19 |
| 003 | Migrate Cron Jobs from Vercel to GitHub Actions | Accepted | 2026-01-19 |
| 004 | Ceremony Artifacts Use INSERT, Not UPSERT | Accepted | 2026-01-26 |
| 005 | Dashboard CTA Hierarchy — Single Primary Action Per State | Accepted | 2026-01-27 |
| 006 | Deprecate `illusion_number` in Favor of `illusion_key` | Accepted | 2026-01-27 |
| 007 | Session Completion — Server-Side Authority Pattern | Accepted | 2026-01-27 |
| 008 | Add OpenAI as Alternative LLM Chat Provider | Accepted | 2026-02-25 |

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-19 | Initial document created; Added ADR-001 (Session Complete CTA decision) |
| 1.1 | 2026-01-19 | Added ADR-002 (Check-In System Refinements) |
| 1.2 | 2026-01-19 | Added ADR-003 (Migrate Cron Jobs from Vercel to GitHub Actions) |
| 1.3 | 2026-01-26 | Added ADR-004 (Ceremony Artifacts Use INSERT, Not UPSERT) |
| 1.4 | 2026-01-27 | Added ADR-005 (Dashboard CTA Hierarchy — Single Primary Action Per State) |
| 1.5 | 2026-01-27 | Added ADR-006 (Deprecate `illusion_number` in Favor of `illusion_key`) |
| 1.6 | 2026-01-27 | Added ADR-007 (Session Completion — Server-Side Authority Pattern) |
| 1.7 | 2026-02-25 | Added ADR-008 (Add OpenAI as Alternative LLM Chat Provider) |
| 1.8 | 2026-02-25 | Updated ADR-008 with reasoning model support (gpt-5 family, o-series parameter restrictions) |
