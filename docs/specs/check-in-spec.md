# Unhooked: Check-In System Specification

**Version:** 1.5
**Created:** 2026-01-28
**Status:** Ready for Development
**Document Type:** Feature Specification (PRD + Technical Design)
**Related Documents:**
- `core-program-spec.md` (Program Structure)
- `moment-capture-spec.md` (Moment Capture)
- `ceremony-spec.md` (Ceremony Flow)
- Architecture Decision Records: ADR-002 (Check-In Refinements), ADR-003 (Cron Architecture)

---

## Table of Contents

1. [Problem Statement](#problem-statement)
2. [Goals & Success Metrics](#goals--success-metrics)
3. [Solution Summary](#solution-summary)
4. [Check-In Types](#check-in-types)
5. [User Experience](#user-experience)
6. [Functional Requirements](#functional-requirements)
7. [Non-Functional Requirements](#non-functional-requirements)
8. [Key Product Decisions](#key-product-decisions)
9. [Technical Design](#technical-design)
10. [Out of Scope / Deferred](#out-of-scope--deferred)
11. [Open Questions](#open-questions)
12. [Appendix](#appendix)
13. [Implementation Design](#implementation-design)
14. [Changelog](#changelog)

---

## Problem Statement

### The Challenge

Core sessions create breakthrough moments, but insights fade between sessions. Without touchpoints between conversations, users:

- Lose the active reframe as daily life takes over
- Miss opportunities to notice the withdrawal cycle in real situations
- Don't have a way to report real-world observations while they're fresh
- Feel disconnected from the program between sessions

### Why This Matters

Allen Carr's method works through saturation—repeated exposure to the truth from multiple angles. Micro check-ins provide additional touchpoints that:

- Keep the reframe active through spaced repetition
- Capture embodied experience (real-world observations)
- Create a sense of ongoing support
- Bridge "conversation space" to real life

---

## Goals & Success Metrics

### Primary Goal

Maintain active engagement and insight reinforcement between core sessions through brief, daily touchpoints.

### Success Metrics

**Leading Indicators:**
- Check-in response rate (target: >50% engagement)
- Real-world observations captured via check-ins
- Time from check-in email to response (<2 hours = engaged user)

**Lagging Indicators:**
- Users who engage with check-ins maintain conviction scores better than those who skip
- Check-in responses surface new moments (captured for personalization)

### Non-Goals

- **Replacing core sessions** — Check-ins are 2-3 minutes, not deep therapeutic work
- **Guilt for skipping** — Check-ins are invitations, not obligations
- **Gamification** — No streaks or badges for completing check-ins

---

## Solution Summary

The Check-In System provides brief, daily touchpoints via email that link users back to the app for voice (or text) responses.

<!-- UX-REFINED: Updated evidence bridge timing from 24h to 6h, added quiet hours note -->
### Check-In Types

| Type | When | Duration | Purpose |
|------|------|----------|---------|
| **Post-Session** | 2 hours after core session (quiet hours aware) | 1-2 min | Bridge insight to real life |
| **Evidence Bridge** | 6 hours after L1/L2 session (quiet hours aware) | 1-2 min | Prompt observation review before next layer |
| **Morning** | 9am local | 1-2 min | Set intention, surface state |
| **Evening** | 7pm local | 2-3 min | Reflect on day, gather evidence |

All check-in types respect **quiet hours** (9pm–8am in user's timezone). Check-ins that would fall within the quiet window are deferred to 8am the following morning. See [Quiet Hours](#quiet-hours) for details.

### Core Design Principles

1. **Invitations, not obligations** — No guilt for skipping; AI never mentions missed check-ins
2. **Brief and focused** — 2-3 minutes max; don't spiral into full sessions
3. **Capture-oriented** — Listen for real-world observations to capture as moments
4. **Contextual** — Prompts adapt based on current illusion and program stage

---

## Check-In Types

<!-- UX-REFINED: Post-session now defers to 8am instead of being dropped when hitting quiet hours -->
### 1. Post-Session Check-In

**When:** 2 hours after any core session (respects quiet hours — deferred to 8am if 2hr later falls in 9pm–8am window)
**Duration:** 1-2 minutes
**Purpose:** Capture what's landing while fresh. Bridge "conversation space" to real life.
**Tone:** Warm, curious, light.

**Sample prompts by illusion:**

*After Stress Relief:*
> "Hey—it's been a couple hours since we talked. Has anything from our conversation crossed your mind? Any moments where you noticed the stress/withdrawal connection?"

*After Pleasure:*
> "Quick check-in. Since we talked about the 'pleasure' question—have you used nicotine? If so, did it feel any different knowing what you know now?"

*After Willpower:*
> "How are you feeling about quitting right now? Not whether you *will*—just how does the idea of it land in your body after our conversation?"

*After Focus:*
> "Since our conversation about focus—have you noticed anything about your concentration patterns? Any moments of fog or clarity?"

*After Identity:*
> "We talked about some deep stuff today. How are you sitting with it? Anything stirring?"

**Capture targets:** Early real-world observations, emotional state, whether insight is translating to felt experience, resistance or doubt surfacing.

---

### 2. Morning Check-In

**When:** 9am local, daily
**Duration:** 1-2 minutes
**Purpose:** Set intention for the day. Surface current state before triggers hit. Prime the reframe.
**Tone:** Grounding, gentle, present-focused.

**Sample prompts by program stage:**

*Early program (Illusions 1-2: Stress, Pleasure):*
> "Good morning. Before your day gets going—how are you feeling about nicotine right now? Not judging, just noticing."

*Mid-program (Illusions 3-4: Willpower, Focus):*
> "Morning. Quick question: When you imagine getting through today without nicotine, what's the first feeling that comes up?"

*Late program (Illusion 5: Identity):*
> "Good morning. You've been seeing through these illusions for a while now. What feels different about how you wake up?"

**Variation by recent session content:**

*If Focus session was yesterday:*
> "Morning. Today might be a good day to notice your focus patterns. When do you feel sharp? When do you feel foggy? Just observe—no need to change anything."

**Capture targets:** Baseline emotional state, confidence/anxiety levels, shifts in morning routine, unprompted observations.

---

### 3. Evening Check-In

**When:** 7pm local, daily
**Duration:** 2-3 minutes (slightly longer—more to report)
**Purpose:** Reflect on the day. Process what happened. Capture real-world evidence. Create closure.
**Tone:** Reflective, validating, synthesizing.

**Sample prompts:**

*General reflection:*
> "Day's winding down. Anything happen today that made you think about what we've been discussing? Could be a craving, an observation, a moment of clarity—or nothing at all."

*Observation-focused:*
> "Did you notice anything today about when you reached for nicotine—or wanted to? What was happening right before?"

*Evidence-gathering:*
> "Think back on your day. Was there a moment where you handled something stressful without nicotine? Or a moment where you noticed the withdrawal cycle we talked about?"

*Identity-focused (later in program):*
> "As you look back on today—did you feel more like someone who's trapped by nicotine, or someone who's seeing through it?"

**Capture targets:** Real-world observations (gold for playback), evidence of belief shift in action, struggles and resistance points, wins and moments of clarity.

---

<!-- UX-REFINED: Evidence bridge timing changed from 24h to 6h, cancellation window updated -->
### 4. Evidence Bridge Check-In

**When:** 6 hours after completing a Layer 1 (Intellectual) or Layer 2 (Emotional) session (respects quiet hours)
**Duration:** 1-2 minutes
**Purpose:** Prompt the user to report on their observation assignment before moving to the next layer. Bridges real-world evidence into the next session.
**Tone:** Curious, grounding, builds on their own assignment.

**How it works:**

At the end of L1 and L2 sessions, the AI delivers a personalized observation assignment (e.g., "Pay attention to your stress — is it the situation, or has it been a while since your last use?"). This assignment is captured via the `[OBSERVATION_ASSIGNMENT: ...]` token in the AI's response and stored on the check-in record.

6 hours later, the evidence bridge check-in wraps that assignment into a prompt:

> "You were going to notice [observation assignment] — what did you observe?"

**Not triggered after Layer 3:** L3 (Identity Integration) is the final layer for each illusion and has no observation assignment, so no evidence bridge check-in is scheduled.

**Cancellation:** If the user starts their next layer session before the 6-hour check-in fires (or before a deferred check-in sends), the pending evidence bridge check-in is cancelled with reason `user_continued_immediately`. This applies regardless of whether the check-in has been deferred by quiet hours.

**Capture targets:** Real-world observations, evidence of belief shift in daily life, emotional reactions to noticing the pattern.

**Implementation:** `scheduleEvidenceBridgeCheckIn()` in `server/utils/scheduling/check-in-scheduler.ts`

---

## User Experience

### Entry Points

**1. Email Link:**
- Email contains subject line + brief context
- Click-through opens app with check-in prompt displayed
- Response via voice (preferred) or text fallback

**2. Dashboard Interstitial:**
- When user has pending check-in and opens app
- Modal overlay with check-in prompt
- Can dismiss (swipe down on mobile, click outside on desktop)
- "Skip for now" link also dismisses
- Interstitials still appear even if user has unsubscribed from emails

**Dashboard interstitial layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  Check-in interstitial (modal overlay)                      │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  "Quick thought for you..."                         │   │
│  │                                                      │   │
│  │  [Personalized check-in prompt]                     │   │
│  │                                                      │   │
│  │  🎤 [Tap to respond]                                │   │
│  │  "Skip for now" link (bottom)                       │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

<!-- UX-REFINED: New section — quiet hours scheduling logic -->
### Quiet Hours

All check-in email types respect a **quiet window of 9pm–8am** in the user's local timezone. This prevents emails from arriving at disruptive times.

**Rules:**
- The quiet window starts at **9pm inclusive** (>= 21:00) and ends at 8am
- If a check-in's calculated send time falls within the quiet window, it is **deferred to 8am** the following morning
- Deferral is applied at **scheduling time**, not send time — the `scheduled_for` timestamp is set to 8am
- The cron job picks up deferred check-ins within its normal 5-minute cycle

**Behavior by check-in type:**

| Type | Without Quiet Hours | With Quiet Hours |
|------|-------------------|-----------------|
| **Post-Session** | Previously: dropped entirely if after 9pm | Now: deferred to 8am next morning |
| **Evidence Bridge** | No time awareness (sent at any hour) | Deferred to 8am if 6h later falls in quiet window |
| **Morning** | 9am (unaffected) | 9am (unaffected — already outside quiet window) |
| **Evening** | 7pm (unaffected) | 7pm (unaffected — already outside quiet window) |

**Example scenarios:**

- Session ends at 8pm → post-session at 10pm → **deferred to 8am** next day
- Session ends at 3pm → evidence bridge at 9pm → **deferred to 8am** next day
- Session ends at 11am → evidence bridge at 5pm → **sends at 5pm** (outside quiet hours)
- Session ends at 2pm → post-session at 4pm → **sends at 4pm** (outside quiet hours)

### Check-In Windows & Expiration

<!-- REQ-REFINED: Added evidence bridge row (no time-based expiry), clarified cron-driven expiration -->
Check-ins expire based on their type. The cron job marks check-ins as `expired` when their window has passed:

| Check-In Type | Window | Expires At |
|---------------|--------|------------|
| Morning (9am) | 9am - 7pm | 7pm local time |
| Evening (7pm) | 7pm - 9am next day | 9am next day |
| Post-Session | 2hr after session | End of current window |
| Evidence Bridge | No time-based expiry | Only cancelled (next session starts) or completed (user responds) |

<!-- UX-REFINED: New section — unsubscribe flow -->
### Email Preferences (Unsubscribe)

Users can opt out of all check-in emails via a one-click unsubscribe mechanism. Unsubscribing stops email delivery but does **not** affect in-app check-in interstitials.

**Unsubscribe flow:**

1. User clicks "Unsubscribe" link in email footer
2. Immediately unsubscribed (one-click, no confirmation prompt)
3. Confirmation page displayed:

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                    UNHOOKED                         │   │
│  │                                                      │   │
│  │  You've been unsubscribed from check-in emails.     │   │
│  │                                                      │   │
│  │  You'll still see check-ins when you open the app.  │   │
│  │                                                      │   │
│  │  ┌──────────────────────────────┐                   │   │
│  │  │      Re-subscribe            │                   │   │
│  │  └──────────────────────────────┘                   │   │
│  │                                                      │   │
│  │  Changed your mind? Click above to start receiving  │   │
│  │  check-in emails again.                             │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Re-subscribe flow:**
1. User clicks "Re-subscribe" on the confirmation page
2. Preference toggled back to subscribed
3. Page updates to confirm: "You're subscribed to check-in emails again."

**Scope:**
- Single toggle: all check-in emails on or off (no per-type granularity)
- Unsubscribe applies to emails only — in-app interstitials are unaffected
- No in-app settings page for this preference (managed entirely via email link)
- Check-ins are still scheduled when unsubscribed; only email sending is suppressed

### Response Handling

When users respond to check-ins, the AI should:

1. **Acknowledge warmly** — Not robotic, genuinely receive what they shared
2. **Reflect back briefly** — So they feel heard
3. **Capture significant moments** — Tag for later use (see [moment-capture-spec.md](moment-capture-spec.md))
4. **Optionally prompt slightly deeper** — If something rich surfaces, one follow-up is okay
5. **Close cleanly** — Don't let it spiral into a full session

**Example exchange:**

> **Check-in prompt:** "Day's winding down. Anything happen today that made you think about what we've been discussing?"
>
> **User:** "Yeah actually. I was stressed at work and I went outside to vape and I thought about what you said—that I'm not actually relieving stress, I'm just relieving withdrawal. And I noticed... it didn't feel as good? Like I was aware of what was happening."
>
> **AI response:** "That's a big noticing. You saw it happening in real-time—the mechanism we talked about. And it felt different because you were *watching* it instead of just being in it. That awareness is everything. Hold onto that. I'll check in with you tomorrow morning."

**What got captured:** Real-world observation, insight application, potential playback material.

### Handling Skipped Check-Ins

**Approach:** Just move on. No guilt, no "I noticed you didn't respond yesterday."

- The next check-in is fresh
- If they're skipping consistently, that's data for us—but not something the AI comments on
- The check-in *existing* keeps the reframe in their awareness (even seeing the email subject line helps)

---

## Functional Requirements

### FR-1: Check-In Scheduling

**Description:** Schedule check-ins based on session completion and daily timing.

**Requirements:**
- FR-1.1: Schedule post-session check-in 2 hours after core session completion
<!-- READINESS-REVIEWED: Explicit L3 exclusion added -->
- FR-1.2: Schedule evidence bridge check-in 6 hours after L1/L2 session completion. Evidence bridge check-ins are NOT scheduled after L3 (Identity Integration) sessions, as L3 has no observation assignment.
- FR-1.3: Morning check-ins scheduled for 9am local time
- FR-1.4: Evening check-ins scheduled for 7pm local time
- FR-1.5: Use rolling 3-day scheduling window until ceremony complete
- FR-1.6: Detect timezone via browser (`Intl.DateTimeFormat().resolvedOptions().timeZone`)

<!-- READINESS-REVIEWED: Cross-reference to content-library-expansion-spec for prompt content -->
**Prompt content:**
- FR-1.7: Post-session check-in `prompt_template` content is defined in `content-library-expansion-spec.md`. Until the content spec covers check-in prompts, use the static sample prompts from [Section 4.1 (Post-Session Check-In)](#1-post-session-check-in) of this spec as the prompt source.

<!-- UX-REFINED: New requirement — quiet hours deferral replaces drop behavior -->
### FR-2: Quiet Hours

**Description:** Prevent check-in emails from being sent during quiet hours (9pm–8am user's timezone).

**Requirements:**
- FR-2.1: Define quiet window as >= 21:00 to < 08:00 in user's local timezone
- FR-2.2: If a check-in's calculated send time falls within the quiet window, defer `scheduled_for` to 8am the following morning
- FR-2.3: Apply quiet hours to all check-in types at scheduling time
- FR-2.4: Post-session check-ins that would have been dropped (old 9pm cutoff) are now deferred to 8am instead

### FR-3: One Active Post-Session Rule (ADR-002)

**Description:** Prevent stacking of post-session check-ins.

**Requirements:**
- FR-3.1: When a new session completes, expire any pending post-session check-ins from previous sessions
- FR-3.2: Users only receive check-ins about their most recent core session

<!-- UX-REFINED: Added deliverability requirements — List-Unsubscribe, per-type subjects, unsubscribe link -->
### FR-4: Email Delivery

**Description:** Send check-in emails via email service with deliverability best practices.

**Requirements:**
- FR-4.1: Send emails via Resend from `coach@getunhooked.app`
- FR-4.2: Email contains link only, no prompt content (prompt shown in app). Exception: evidence bridge emails include the observation prompt as body text.
- FR-4.3: Generate 24-hour magic link token for authentication
- FR-4.4: Store token in `magic_link_token` column
- FR-4.5: Use per-type email subject lines (see [Appendix B](#b-email-subject-lines))
- FR-4.6: Include `List-Unsubscribe` and `List-Unsubscribe-Post` headers on all emails (RFC 8058 one-click). `List-Unsubscribe` header uses the `magic_link_token` (email clients act immediately, 24h expiry is acceptable).
- FR-4.7: Include visible unsubscribe link in email footer using HMAC-signed user ID token (non-expiring — see FR-7.7)
- FR-4.8: For unsubscribed users, the cron marks the check-in as `sent` with `email_sent_at = null` (advances status to prevent re-processing) but does not send the email

<!-- REQ-REFINED: Added email retry logic and email body structure -->
**Retry on failure:**
<!-- READINESS-REVIEWED: Updated to match Architecture Decision #8 — cron-cycle retries, no next_retry_at -->
- FR-4.9: If Resend returns an error, retry on subsequent cron cycles (approximately every 5 minutes). After 3 failed attempts, mark check-in status as `failed`.
- FR-4.10: After 3 failed attempts, mark check-in status as `failed`. Log the failure for monitoring.
- FR-4.11: Track retry attempts via `retry_count` column on `check_in_schedule`

<!-- UX-REFINED: Email template redesign — white outer bg, per-type headings, name in subject, no expiry line -->
**Email template design:**

- **Outer background:** White / transparent (blends with email client's native background)
- **Card:** Teal gradient card (existing brand style) floats on the white background
- **No "expires in 24 hours" line** — removed to avoid unnecessary pressure (aligns with "invitations, not obligations")
- **First name personalization:** Subject line only (pulled from intake data). Falls back to no name if unavailable.

**Email body structure:**

All check-in emails follow this structure:

| Section | Content |
|---------|---------|
| **Header** | "UNHOOKED" eyebrow text |
| **Heading** | Per-type heading (see below) |
| **Body** | Per-type contextual line (see below) |
| **CTA** | Pill-shaped gradient button linking to app via magic link |
| **Footer** | Unsubscribe link (HMAC token, non-expiring) |

Per-type subject, heading, body, and CTA:

| Type | Subject (with name) | Heading | Body text | CTA button |
|------|-------------------|---------|-----------|------------|
| Post-Session | "{Name}, quick thought from earlier..." | "Quick thought for you" | "A quick thought from your session earlier." | "Open check-in" |
| Evidence Bridge | "{Name}, what did you notice?" | "What did you notice?" | "You were going to [observation assignment] — what did you observe?" | "Share what you noticed" |
| Morning | "{Name}, good morning" | "Good morning" | "Start your day with a quick reflection." | "Open check-in" |
| Evening | "{Name}, how was your day?" | "Day's winding down" | "Take a moment to reflect on your day." | "Open check-in" |

**Name fallback:** If no first name is available, subject drops the name prefix (e.g., "Quick thought from earlier..." instead of "Kevin, quick thought from earlier...").

### FR-5: Check-In Completion

**Description:** Mark check-ins complete when user responds.

**Requirements:**
- FR-5.1: Create new conversation for check-in response
- FR-5.2: Mark check-in status as 'completed' with timestamp
- FR-5.3: Link response conversation to check-in record
- FR-5.4: Capture significant moments from response (see [moment-capture-spec.md](moment-capture-spec.md))

### FR-6: Expired Link Handling

**Description:** Handle expired magic links gracefully.

**Requirements:**
- FR-6.1: If token is expired, redirect to most recent pending check-in
- FR-6.2: If no pending check-ins, redirect to dashboard

<!-- UX-REFINED: New requirement — email unsubscribe mechanism -->
### FR-7: Email Preferences (Unsubscribe)

**Description:** Allow users to opt out of check-in emails via one-click unsubscribe.

**Requirements:**
- FR-7.1: One-click unsubscribe via link in email footer (immediately effective, no confirmation prompt)
- FR-7.2: Display confirmation page after unsubscribe with re-subscribe option
- FR-7.3: Re-subscribe via button on confirmation page
- FR-7.4: Unsubscribe stops all check-in email types (single toggle, not per-type)
- FR-7.5: Unsubscribe does NOT affect in-app check-in interstitials
- FR-7.6: Check-ins continue to be scheduled when unsubscribed; only email delivery is suppressed
- FR-7.7: Footer unsubscribe link uses an HMAC-signed user ID (`HMAC-SHA256(user_id, UNSUBSCRIBE_SECRET)`) — non-expiring, deterministic, no DB storage required. Prevents user ID enumeration while ensuring unsubscribe links work indefinitely regardless of when the email was received.
- FR-7.8: The `List-Unsubscribe` header uses the `magic_link_token` (24h expiry acceptable — email clients send the POST immediately)

### FR-8: Evidence Bridge Cancellation

**Description:** Cancel evidence bridge check-ins when the user moves on.

**Requirements:**
- FR-8.1: If user starts next layer session before evidence bridge fires, cancel with reason `user_continued_immediately`
- FR-8.2: Cancellation applies to deferred check-ins too (if evidence bridge was deferred to 8am by quiet hours and user starts next session before 8am, cancel it)

<!-- REQ-REFINED: New requirements — interstitial behavior, expiration, AI response, timezone -->
### FR-9: Dashboard Interstitial Behavior

**Description:** Display pending check-ins as a modal overlay when user opens the dashboard.

**Requirements:**
- FR-9.1: Show interstitial when user has a pending check-in (status `scheduled` or `sent`, within its display window) and navigates to the dashboard
- FR-9.2: Interstitial displays the `prompt_template` text from the check-in record
- FR-9.3: Dismissal (swipe down on mobile, click outside on desktop, or "Skip for now" link) hides the modal for the current browser session (sessionStorage flag)
- FR-9.4: Dismissing via "Skip for now" marks the check-in status as `skipped`
- FR-9.5: Dismissing via swipe/click-outside hides the modal without changing check-in status — modal reappears on next fresh app open if the check-in hasn't expired
- FR-9.6: Interstitials display regardless of email subscription status (unsubscribed users still see them)
- FR-9.7: Only one interstitial is shown at a time. If multiple pending check-ins exist, show the most recently scheduled one.

### FR-10: Check-In Expiration

**Description:** Expire check-ins when their display window has passed.

**Requirements:**
- FR-10.1: The cron job marks check-ins as `expired` when their window has passed (morning: after 7pm, evening: after 9am next day, post-session: end of current window)
- FR-10.2: Evidence bridge check-ins have **no time-based expiry** — they remain pending until the user responds (completed) or starts the next session (cancelled per FR-8)
- FR-10.3: Only check-ins in `scheduled` or `sent` status are eligible for expiration
- FR-10.4: The `expired_at` timestamp is set when the cron marks a check-in as expired

### FR-11: AI Response Behavior During Check-Ins

**Description:** Define how the AI responds when a user engages with a check-in.

**Requirements:**
- FR-11.1: AI acknowledges the user's response warmly (not robotic)
- FR-11.2: AI reflects back briefly so the user feels heard
- FR-11.3: AI captures significant moments from the response and tags them for later use (see moment-capture-spec.md)
- FR-11.4: AI may ask one follow-up question if something rich surfaces, but must close cleanly — do not spiral into a full session
- FR-11.5: AI closes the check-in with a brief forward-looking statement (e.g., "I'll check in with you tomorrow morning")
- FR-11.6: **Audio completion requirement:** The AI's audio response must play in full before the check-in experience closes. The interstitial modal must not auto-dismiss, and the check-in page must not navigate away, until audio playback is complete. This applies to both the dashboard interstitial and the email-linked check-in page.
<!-- READINESS-REVIEWED: Added testable requirement for "no guilt for skipping" UX principle -->
- FR-11.7: AI must not reference or acknowledge previously skipped or missed check-ins in any check-in prompt or response. Each check-in is a fresh interaction.

### FR-12: Timezone Detection & Update

**Description:** Handle timezone changes when users travel or relocate.

**Requirements:**
- FR-12.1: Detect user timezone via browser on each app open (`Intl.DateTimeFormat().resolvedOptions().timeZone`)
- FR-12.2: If detected timezone differs from stored timezone on `user_progress`, update the stored timezone and log the change
<!-- READINESS-REVIEWED: FR-12.3 deferred to post-MVP — rescheduling logic is non-trivial -->
- FR-12.3: ~~Reschedule any pending check-ins (status `scheduled`) using the new timezone~~ **Deferred to post-MVP.** Rescheduling pending check-ins on timezone change requires recalculating `scheduled_for` timestamps with quiet hours re-application. For MVP, pending check-ins keep their original schedule; the new timezone takes effect on the next scheduling cycle.

---

## Non-Functional Requirements

### NFR-1: Reliability

- NFR-1.1: Email delivery must succeed >99% of the time
- NFR-1.2: Cron job must be idempotent (safe to run multiple times)
- NFR-1.3: Check-in scheduling must handle timezone edge cases

### NFR-2: Performance

- NFR-2.1: Email sending batch must complete within 5 minutes
- NFR-2.2: Interstitial check must complete within 200ms

### NFR-3: Deliverability

- NFR-3.1: All emails must include `List-Unsubscribe` header (RFC 8058)
- NFR-3.2: Email subject lines must vary by check-in type (avoid repetitive subjects)
- NFR-3.3: SPF, DKIM, and DMARC must be configured for `getunhooked.app` (verified)

<!-- REQ-REFINED: New NFRs — Security and Accessibility -->
### NFR-4: Security

- NFR-4.1: Magic link tokens must be 32+ bytes of cryptographically random data, encoded as URL-safe base64. Generated via `crypto.randomBytes()` or equivalent.
- NFR-4.2: Public-facing token endpoints (`/api/check-ins/open/:token`, `/api/check-ins/unsubscribe`, `/api/check-ins/resubscribe`) must be rate-limited to 10 requests/minute per IP
- NFR-4.3: HMAC unsubscribe tokens are computed as `HMAC-SHA256(user_id, UNSUBSCRIBE_SECRET)` — the `UNSUBSCRIBE_SECRET` must be a separate environment variable, not reused from other secrets
- NFR-4.4: The CRON_SECRET for the cron endpoint must be validated on every request (already implemented)

### NFR-5: Accessibility

- NFR-5.1: The dashboard interstitial modal must implement a focus trap — keyboard focus is constrained within the modal while it's open
- NFR-5.2: Pressing Escape must dismiss the modal (equivalent to clicking outside)
- NFR-5.3: The modal must use `role="dialog"` and `aria-modal="true"`
- NFR-5.4: When the modal opens, focus must move to the modal. When the modal closes, focus must return to the element that triggered it (or the main dashboard content if no trigger element).
- NFR-5.5: The check-in prompt text must be associated with the modal via `aria-labelledby` or `aria-describedby`

---

## Key Product Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Delivery method** | Email with app link | Creates "session" feeling; less interruptive than push |
| **Check-in timing** | Fixed (9am/7pm) | Simplicity; configurable timing deferred |
| **Skipped check-in handling** | Silent (no guilt) | Check-ins are invitations, not obligations |
| **Morning/evening check-ins** | Dormant for MVP (ADR-002) | Focus on post-session; daily check-ins added later |
| **Prompt in email** | No (link only) | Voice response requires app; keeps email simple |
| **Evidence bridge timing** | 6 hours after session | Close enough for fresh recall; enough time for some real-world observation |
| **Quiet hours** | 9pm–8am, defer to 8am | Prevents late-night emails; defers instead of dropping so no check-ins are lost |
| **Quiet hours scope** | All check-in types | Consistent behavior; post-session now deferred instead of dropped |
| **Unsubscribe granularity** | All emails on/off | Simple toggle; no per-type preferences needed |
| **Unsubscribe scope** | Emails only | In-app interstitials still show; user opted out of email nudges, not the check-in system |
| **Email subjects** | Per-type (varied) | Avoids spam filter repetition; feels more personal |
| **Interstitial dismissal** | Hide for session (sessionStorage) | Reappears on next app open if check-in still valid; "Skip for now" marks as skipped |
| **Evidence bridge expiry** | No time-based expiry | Only cancelled (next session) or completed (user responds); email sent once |
| **Check-in expiry mechanism** | Cron updates DB status | Keeps DB clean; simpler queries than display-time calculation |
| **Unsubscribe token (footer)** | HMAC-signed user ID | Non-expiring; works indefinitely; no DB storage; prevents enumeration |
| **Email send retry** | 3 attempts, exponential backoff | Handles transient Resend failures without overcomplicating |
| **One check-in per trigger** | Only post-session OR evidence bridge | System design ensures only one type scheduled per session trigger; no priority/ordering needed |
| **Email outer background** | White / transparent | Blends with email clients (Gmail, Apple Mail); dark outer clashed with native UI |
| **Name in email** | Subject line only | Biggest open-rate impact; keeps email body clean; falls back gracefully if no name |
| **Email heading** | Per-type (varied) | "Your check-in is ready" felt transactional; per-type headings feel more like a coach reaching out |
| **Expiry line in email** | Removed | "Expires in 24 hours" created unnecessary pressure; conflicts with "invitations, not obligations" |

---

## Technical Design

### Database Schema

#### `check_in_schedule` Table

```sql
CREATE TABLE public.check_in_schedule (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Timing
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'America/New_York',

  -- Type and context
  check_in_type TEXT NOT NULL CHECK (check_in_type IN (
    'post_session',
    'evidence_bridge',
    'morning',
    'evening'
  )),
  trigger_myth_key TEXT REFERENCES public.illusions(myth_key),
  trigger_illusion_key TEXT,           -- Illusion key for evidence bridge check-ins
  trigger_session_id UUID REFERENCES public.conversations(id),

  -- Content
  prompt_template TEXT NOT NULL,        -- Full prompt text displayed to the user (generated at scheduling time)
  observation_assignment TEXT,          -- Captured from [OBSERVATION_ASSIGNMENT: ...] token. Falls back to template text if AI token missing (per evidence-based-coaching-spec REQ-24/25/42)
  personalization_context JSONB,       -- Optional. May contain { name?: string } from intake. Nullable.

  -- State (see State Transition Diagram below)
  status TEXT DEFAULT 'scheduled' CHECK (status IN (
    'scheduled',
    'sent',
    'opened',
    'completed',
    'skipped',
    'expired',
    'cancelled',
    'failed'
  )),
  cancellation_reason TEXT,            -- e.g., 'user_continued_immediately' (see evidence-based-coaching-spec REQ-26)

  -- Auth token for magic link (24-hour validity)
  magic_link_token TEXT,

  -- Delivery tracking
  retry_count INTEGER DEFAULT 0,       -- Number of email send attempts (max 3)
  email_sent_at TIMESTAMP WITH TIME ZONE,  -- NULL if email was suppressed (user unsubscribed)
  opened_at TIMESTAMP WITH TIME ZONE,      -- Set when user clicks magic link
  completed_at TIMESTAMP WITH TIME ZONE,
  expired_at TIMESTAMP WITH TIME ZONE,
  response_conversation_id UUID REFERENCES public.conversations(id),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_checkin_user_scheduled ON public.check_in_schedule(user_id, scheduled_for);
CREATE INDEX idx_checkin_status ON public.check_in_schedule(status, scheduled_for);
CREATE INDEX idx_checkin_user_status ON public.check_in_schedule(user_id, status);
CREATE INDEX idx_checkin_token ON public.check_in_schedule(magic_link_token);

-- RLS
ALTER TABLE public.check_in_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own check-ins"
  ON public.check_in_schedule FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own check-ins"
  ON public.check_in_schedule FOR UPDATE
  USING (auth.uid() = user_id);
```

<!-- UX-REFINED: New schema — email preference on user_progress -->
#### Email Preference (on `user_progress` table)

```sql
-- Add to existing user_progress table
ALTER TABLE public.user_progress
  ADD COLUMN email_unsubscribed_at TIMESTAMP WITH TIME ZONE;

-- NULL = subscribed (default), set = unsubscribed
-- Stores the timestamp of when the user unsubscribed
-- Cleared (set back to NULL) when user re-subscribes
```

<!-- REQ-REFINED: Updated unsubscribe token to HMAC approach -->
#### Unsubscribe Token

Two token strategies are used for unsubscribe:

| Context | Token | Lifetime | Storage |
|---------|-------|----------|---------|
| `List-Unsubscribe` header (RFC 8058) | `magic_link_token` | 24 hours | `check_in_schedule` record |
| Visible footer link | HMAC-signed user ID | Non-expiring | Computed (no storage) |

```
-- Footer unsubscribe URL: /api/check-ins/unsubscribe?uid={user_id}&sig={hmac_signature}
-- HMAC signature: HMAC-SHA256(user_id, UNSUBSCRIBE_SECRET)
-- Non-expiring — works indefinitely regardless of when the email was received
-- UNSUBSCRIBE_SECRET is a dedicated environment variable (not reused from other secrets)
```

<!-- REQ-REFINED: New section — state transition diagram -->
### State Transition Diagram

```
                                    ┌──────────┐
                              ┌────▸│ cancelled │  (evidence bridge only — FR-8)
                              │     └──────────┘
                              │
              ┌───────────┐   │     ┌──────────┐
  ─────────▸  │ scheduled  │──┼────▸│  failed   │  (email send failed after 3 retries)
              └─────┬──┬──┘   │     └──────────┘
                    │  │      │
                    │  │      │     ┌──────────┐
                    │  │      ├────▸│  expired  │  (window passed — cron marks)
                    │  │      │     └──────────┘
                    │  │      │
                    │  │      │     ┌──────────┐
                    │  ├──────┼────▸│ completed │  (user responds via interstitial
                    │  │      │     └──────────┘   — unsubscribed users, no email)
                    │  │      │
                    │  │      │     ┌──────────┐
                    │  └──────┴────▸│  skipped  │  (user clicks "Skip for now"
                    │               └──────────┘   in interstitial — no email)
                    │
                    ▾
              ┌──────────┐          ┌──────────┐
              │   sent    │────────▸│  opened   │  (user clicks magic link)
              └────┬──┬──┘          └──┬──┬────┘
                   │  │                │  │
                   │  │                │  │     ┌──────────┐
                   │  │                │  └────▸│ completed │
                   │  │                │        └──────────┘
                   │  │                │
                   │  │                │        ┌──────────┐
                   │  │                └───────▸│  expired  │
                   │  │                         └──────────┘
                   │  │
                   │  │     ┌──────────┐
                   │  ├────▸│ completed │  (user responds via interstitial)
                   │  │     └──────────┘
                   │  │
                   │  │     ┌──────────┐
                   │  ├────▸│  skipped  │  (user clicks "Skip for now")
                   │  │     └──────────┘
                   │  │
                   │  │     ┌──────────┐
                   │  └────▸│  expired  │  (window passed — cron marks)
                   │        └──────────┘
                   │
                   │        ┌──────────┐
                   └───────▸│ cancelled │  (evidence bridge — user starts next session)
                            └──────────┘
```

**Transition triggers:**

| From | To | Trigger |
|------|----|---------|
| `scheduled` | `sent` | Cron sends email (or marks sent with `email_sent_at = null` for unsubscribed users) |
| `scheduled` | `cancelled` | Evidence bridge: user starts next layer session (FR-8) |
| `scheduled` | `failed` | Email send failed after 3 retries |
| `scheduled` | `expired` | Cron detects window has passed |
| `scheduled` | `completed` | User responds via interstitial (no email was sent — unsubscribed user path) |
| `scheduled` | `skipped` | User clicks "Skip for now" in interstitial (no email was sent) |
| `sent` | `opened` | User clicks magic link in email |
| `sent` | `completed` | User responds via interstitial (email was sent but user came through app) |
| `sent` | `skipped` | User clicks "Skip for now" in interstitial |
| `sent` | `expired` | Cron detects window has passed |
| `sent` | `cancelled` | Evidence bridge: user starts next layer session after email sent |
| `opened` | `completed` | User submits response |
| `opened` | `expired` | Window passes without response |

**Note:** Evidence bridge check-ins have no time-based expiry — they cannot transition to `expired` via cron. They remain in their current state until the user responds (`completed`) or starts the next session (`cancelled`).

<!-- UX-REFINED: Updated scheduling engine — quiet hours deferral, 6h evidence bridge -->
### Scheduling Engine

```typescript
// server/utils/scheduling/check-in-scheduler.ts

const QUIET_HOUR_START = 21  // 9pm local
const QUIET_HOUR_END = 8     // 8am local
const EVIDENCE_BRIDGE_DELAY_HOURS = 6
const POST_SESSION_DELAY_HOURS = 2

/**
 * Apply quiet hours: if scheduledFor falls in 9pm-8am,
 * defer to 8am the following morning.
 */
function applyQuietHours(scheduledFor: Date, timezone: string): Date {
  const hour = getHourInTimezone(scheduledFor, timezone)

  if (hour >= QUIET_HOUR_START || hour < QUIET_HOUR_END) {
    // In quiet window — defer to 8am next morning
    // If it's before 8am, defer to 8am same day
    // If it's >= 9pm, defer to 8am next day
    if (hour >= QUIET_HOUR_START) {
      return createDateAtHour(addDays(scheduledFor, 1), QUIET_HOUR_END, timezone)
    } else {
      return createDateAtHour(scheduledFor, QUIET_HOUR_END, timezone)
    }
  }

  return scheduledFor // Outside quiet hours — no change
}

export async function scheduleCheckIns(config: ScheduleConfig): Promise<CheckIn[]> {
  const { userId, timezone, trigger, sessionEndTime, mythKey } = config
  const scheduled: CheckIn[] = []

  if (trigger === 'session_complete' && sessionEndTime) {
    const twoHoursLater = addHours(sessionEndTime, POST_SESSION_DELAY_HOURS)
    const adjustedTime = applyQuietHours(twoHoursLater, timezone)

    // Expire any pending post-session check-ins (ADR-002)
    await expirePendingPostSessionCheckIns(userId)

    scheduled.push(await createCheckIn({
      userId,
      type: 'post_session',
      scheduledFor: adjustedTime,
      timezone,
      mythKey,
      sessionId: config.sessionId
    }))
  }

  // Morning/evening check-ins (dormant for MVP per ADR-002)
  // Code exists but triggers not wired up

  return scheduled
}

export async function scheduleEvidenceBridgeCheckIn(...): Promise<CheckIn | null> {
  const sixHoursLater = addHours(sessionEndTime, EVIDENCE_BRIDGE_DELAY_HOURS)
  const adjustedTime = applyQuietHours(sixHoursLater, timezone)

  return await createCheckIn({
    userId,
    type: 'evidence_bridge',
    scheduledFor: adjustedTime,
    timezone,
    illusionKey,
    sessionId,
    promptTemplate,
    observationAssignment
  })
}
```

### Cron Architecture (ADR-003)

**Primary:** GitHub Actions workflow runs every 5 minutes (free tier)
**Fallback:** Vercel Cron runs daily at 8am UTC (Hobby tier: 1/day max)

Both call the same idempotent endpoint with `CRON_SECRET` authentication:

```typescript
// server/api/cron/check-ins.post.ts

export default defineEventHandler(async (event) => {
  // Verify CRON_SECRET
  const secret = getHeader(event, 'x-cron-secret')
  if (secret !== process.env.CRON_SECRET) {
    throw createError({ statusCode: 401 })
  }

  // Query window: past 24h (catches missed) through future 24h
  await processScheduledCheckIns()
})
```

<!-- UX-REFINED: Updated email delivery — per-type subjects, List-Unsubscribe header, unsubscribe footer, preference check -->
<!-- REQ-REFINED: Updated cron logic — unsubscribed user handling, retry with backoff, expiration sweep -->
### Email Delivery

```typescript
// server/utils/email/check-in-sender.ts

export async function processScheduledCheckIns() {
  const now = new Date()

  // 1. Process pending check-ins ready to send
  const checkIns = await supabase
    .from('check_in_schedule')
    .select('*, user:auth.users(email)')
    .eq('status', 'scheduled')
    .lte('scheduled_for', now.toISOString())

  for (const checkIn of checkIns.data) {
    // Check if user has unsubscribed from emails
    const { data: userProgress } = await supabase
      .from('user_progress')
      .select('email_unsubscribed_at')
      .eq('user_id', checkIn.user_id)
      .single()

    if (userProgress?.email_unsubscribed_at) {
      // User unsubscribed — advance status to 'sent' with null email_sent_at
      // Prevents cron from re-processing. Interstitial can still display this check-in.
      await supabase
        .from('check_in_schedule')
        .update({ status: 'sent', email_sent_at: null })
        .eq('id', checkIn.id)
      continue
    }

    const token = generateSecureToken()  // 32+ bytes, URL-safe base64

    await supabase
      .from('check_in_schedule')
      .update({ magic_link_token: token })
      .eq('id', checkIn.id)

    try {
      await sendCheckInEmail(checkIn, token)
      await supabase
        .from('check_in_schedule')
        .update({ status: 'sent', email_sent_at: now.toISOString() })
        .eq('id', checkIn.id)
    } catch (error) {
      const newRetryCount = (checkIn.retry_count || 0) + 1
      if (newRetryCount >= 3) {
        await supabase
          .from('check_in_schedule')
          .update({ status: 'failed', retry_count: newRetryCount })
          .eq('id', checkIn.id)
      } else {
        await supabase
          .from('check_in_schedule')
          .update({ retry_count: newRetryCount })
          .eq('id', checkIn.id)
        // Will be retried on next cron cycle (backoff via retry_count check)
      }
    }
  }

  // 2. Expire check-ins whose window has passed
  await expireOverdueCheckIns(now)
}

function getSubjectLine(type: string): string {
  switch (type) {
    case 'morning': return 'Good morning — quick check-in'
    case 'evening': return "Day's winding down — how did it go?"
    case 'post_session': return 'Quick thought from earlier...'
    case 'evidence_bridge': return 'What did you notice?'
    default: return 'Checking in with you'
  }
}
```

<!-- REQ-REFINED: Updated email headers — dual token approach for unsubscribe -->
**Email headers (Resend):**

```typescript
// Two unsubscribe mechanisms:
// 1. List-Unsubscribe header — uses magic_link_token (email clients act immediately, 24h expiry OK)
// 2. Footer link — uses HMAC-signed user ID (non-expiring, works indefinitely)
const hmacSignature = createHmac('sha256', process.env.UNSUBSCRIBE_SECRET)
  .update(userId)
  .digest('base64url')
const footerUnsubscribeLink = `${appUrl}/api/check-ins/unsubscribe?uid=${userId}&sig=${hmacSignature}`

await resend.emails.send({
  from: 'Unhooked Coach <coach@getunhooked.app>',
  to: userEmail,
  subject: getSubjectLine(checkInType),
  headers: {
    'List-Unsubscribe': `<${appUrl}/api/check-ins/unsubscribe?token=${token}>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  },
  html: buildEmailHtml(magicLink, footerUnsubscribeLink),
  text: buildEmailText(magicLink, footerUnsubscribeLink),
})
```

**Email footer (HTML):**

```html
<!-- Footer with unsubscribe link (HMAC token — non-expiring) -->
<p style="color: rgba(255, 255, 255, 0.4); font-size: 11px; margin-top: 32px;">
  <a href="{footerUnsubscribeLink}" style="color: rgba(255, 255, 255, 0.4); text-decoration: underline;">
    Unsubscribe from check-in emails
  </a>
</p>
```

### API Endpoints

<!-- REQ-REFINED: Added per-endpoint authentication requirements -->
**Authentication by endpoint:**

| Endpoint | Auth Method | Notes |
|----------|-------------|-------|
| `POST /api/check-ins/schedule` | Supabase Auth (JWT) | Authenticated user only |
| `GET /api/check-ins/pending` | Supabase Auth (JWT) | Returns own check-ins (RLS) |
| `GET /api/check-ins/open/:token` | Magic link token | 24-hour token validity |
| `POST /api/check-ins/:id/complete` | Supabase Auth (JWT) | User must own the check-in (RLS) |
| `GET /api/check-ins/interstitial` | Supabase Auth (JWT) | Returns own pending check-in |
| `GET /api/check-ins/unsubscribe` | Magic link token OR HMAC token | Accepts both (header vs footer link) |
| `POST /api/check-ins/unsubscribe` | Magic link token | RFC 8058 one-click (header) |
| `POST /api/check-ins/resubscribe` | HMAC token | Same HMAC token from footer link |
| `POST /api/cron/check-ins` | CRON_SECRET header | Server-to-server only |

#### `POST /api/check-ins/schedule`

Schedule check-ins for a user.

```typescript
// Request
{
  trigger: 'session_complete' | 'program_start' | 'daily_refresh'
  session_id?: string
  myth_key?: string
}

// Response
{
  scheduled: CheckIn[]
}
```

#### `GET /api/check-ins/pending`

Get pending check-ins for current user.

```typescript
// Response
{
  check_ins: CheckIn[]
  next_check_in: CheckIn | null
}
```

#### `GET /api/check-ins/open/:token`

Open a check-in via magic link.

```typescript
// Response
{
  check_in: CheckIn
  prompt: string
}
// OR redirect to most recent pending check-in
```

#### `POST /api/check-ins/:id/complete`

Mark check-in complete.

```typescript
// Request
{
  response_conversation_id: string
}
```

#### `GET /api/check-ins/interstitial`

Check if user has pending check-in for dashboard modal.

```typescript
// Response
{
  has_pending: boolean
  check_in?: {
    id: string
    prompt: string
    type: string
  }
}
```

<!-- UX-REFINED: New endpoint — unsubscribe -->
<!-- REQ-REFINED: Updated — dual token support (magic_link for header, HMAC for footer) -->
#### `GET /api/check-ins/unsubscribe`

Unsubscribe from check-in emails via footer link. Accepts HMAC-signed token (non-expiring) or magic_link_token (24h).

```typescript
// Query params (one of):
//   ?uid={user_id}&sig={hmac_signature}   — footer link (HMAC, non-expiring)
//   ?token={magic_link_token}             — fallback / List-Unsubscribe header

// GET: Validates token, sets email_unsubscribed_at, renders confirmation page
//      with re-subscribe button (passes uid + sig for re-subscribe)
```

#### `POST /api/check-ins/unsubscribe`

RFC 8058 one-click unsubscribe (called by email clients via `List-Unsubscribe-Post` header).

```typescript
// Body: List-Unsubscribe=One-Click (per RFC 8058)
// Uses magic_link_token from List-Unsubscribe header URL
// Sets email_unsubscribed_at, returns 200
```

#### `POST /api/check-ins/resubscribe`

Re-subscribe to check-in emails (called from confirmation page).

```typescript
// Query params: ?uid={user_id}&sig={hmac_signature}
// Validates HMAC signature
// Clears email_unsubscribed_at on user_progress
// Returns 200 with confirmation
```

---

## Out of Scope / Deferred

| Feature | Reason | Planned For |
|---------|--------|-------------|
| **Morning/evening daily check-ins** | Focus on post-session first (ADR-002) | Post-MVP |
| **User-configurable timing** | Adds complexity; 9am/7pm are reasonable defaults | Post-MVP |
| **Push notifications** | Web-only MVP; requires native app | Post-MVP |
| **Check-in frequency settings** | Simplicity for MVP | Post-MVP |
| **Observation debrief check-ins** | Removed from scope | Not planned |
| **In-app email preferences** | Unsubscribe page handles it; settings page deferred | Post-MVP |
| **Per-type unsubscribe** | Single toggle sufficient for now | Post-MVP |
| **Timezone rescheduling (FR-12.3)** | Non-trivial; new timezone takes effect on next scheduling cycle | Post-MVP |

---

## Open Questions

### Resolved

- [x] What if user doesn't respond? **Just move on, no guilt**
- [x] How to handle timezone? **Browser detection**
- [x] Push vs email? **Email for web MVP**
- [x] Prompt in email or app? **App only (link in email)**
- [x] Evidence bridge timing? **6 hours (close enough for fresh recall, enough for observation)**
- [x] What if check-in falls late at night? **Quiet hours 9pm–8am, defer to 8am**
- [x] Should post-session be dropped or deferred after 9pm? **Deferred to 8am**
- [x] Unsubscribe granularity? **All emails on/off**
- [x] Unsubscribe scope? **Emails only, interstitials still show**
- [x] Email outer background color? **White/transparent (dark outer clashes with email clients)**
- [x] First name personalization placement? **Subject line only (biggest open-rate impact)**
- [x] Email heading? **Per-type headings (warmer than generic "Your check-in is ready")**
- [x] "Expires in 24 hours" line? **Removed (unnecessary pressure)**

### Still Open

None currently.

---

## Appendix

### A. Check-In Prompt Templates

See [Check-In Types](#check-in-types) section for full prompt templates organized by type and program stage.

<!-- UX-REFINED: Updated subject lines with name personalization -->
### B. Email Subject Lines

Subject lines include the user's first name when available (from intake). Falls back to the base subject without name prefix.

| Type | Subject (with name) | Subject (no name fallback) |
|------|-------------------|--------------------------|
| Post-Session | "{Name}, quick thought from earlier..." | "Quick thought from earlier..." |
| Evidence Bridge | "{Name}, what did you notice?" | "What did you notice?" |
| Morning | "{Name}, good morning" | "Good morning — quick check-in" |
| Evening | "{Name}, how was your day?" | "Day's winding down — how did it go?" |
| Default | "{Name}, checking in with you" | "Checking in with you" |

---

<!-- TECH-DESIGN: Complete implementation design — architecture decisions, user stories, acceptance criteria, test specification -->
## Implementation Design

### Architecture Decisions Summary

The following decisions were made during the technical design session:

| # | Decision | Choice | Rationale |
|---|----------|--------|-----------|
| 1 | Unsubscribe confirmation page | Standalone `/pages/unsubscribe.vue` with `layout: false` | Follows existing patterns (unauthenticated pages like `/login`). Easier to style with Tailwind and brand system. |
| 2 | Rate limiting | Nuxt server middleware with in-memory Map + TTL | Simple, no external deps, works at current scale. Resets on deploy (acceptable). |
| 3 | Unsubscribe page states | Single page with reactive state | Reads `status` from query params. Re-subscribe updates local state. One file. |
| 4 | Unsubscribe page layout | `layout: false` + inline minimal chrome | Matches `error.vue` pattern. No new layout for one page. |
| 5 | Unsubscribe flow (GET) | API validates token → 302 redirect to `/unsubscribe?status=success&uid=X&sig=Y` | One round-trip. Page just renders confirmation UI. |
| 6 | RFC 8058 POST | Magic link token only | Machine-to-machine endpoint. HMAC path is for human footer links (GET). |
| 7 | HMAC utility | Shared `server/utils/auth/hmac-tokens.ts` | Used by email sender (generate) and unsubscribe/resubscribe endpoints (validate). |
| 8 | Retry strategy | Cron-cycle retries with `retry_count` | 5-min cron cycle provides natural backoff. No `next_retry_at` column needed. After 3 failures → `failed`. |
| 9 | Invalid HMAC handling | Redirect to `/unsubscribe?status=error` | Friendly message. Doesn't expose internals. |
| 10 | Evidence bridge cancellation trigger | `POST /api/conversations` (session-start) | When conversation created with `illusionKey`, cancel pending evidence bridges for that user+illusion. |
| 11 | Name source for personalization | `user_intake.preferred_name` → stored in `personalization_context` at scheduling time | Avoids re-querying intake during cron email send. |
| 12 | Migration approach | File in `supabase/migrations/` | Version-controlled, repeatable, matches existing pattern. |
| 13 | Env var setup | Included in implementation (`.env.example` + `nuxt.config.ts`) | Ensures `UNSUBSCRIBE_SECRET` isn't forgotten during deployment. |

### New/Modified Files

| File | Action | Purpose |
|------|--------|---------|
| `supabase/migrations/20260216_email_unsubscribe.sql` | **Create** | Add `email_unsubscribed_at` to `user_progress` |
| `server/utils/auth/hmac-tokens.ts` | **Create** | HMAC token generation + validation for unsubscribe |
| `server/middleware/rate-limit.ts` | **Create** | IP-based rate limiting (10 req/min) for public endpoints |
| `server/api/check-ins/unsubscribe.get.ts` | **Create** | Footer link unsubscribe (HMAC or magic_link_token) |
| `server/api/check-ins/unsubscribe.post.ts` | **Create** | RFC 8058 one-click unsubscribe (magic_link_token) |
| `server/api/check-ins/resubscribe.post.ts` | **Create** | Re-subscribe from confirmation page (HMAC) |
| `pages/unsubscribe.vue` | **Create** | Unsubscribe confirmation + re-subscribe page |
| `server/utils/email/check-in-sender.ts` | **Modify** | Email template redesign, List-Unsubscribe headers, name personalization, retry logic, unsubscribed user handling |
| `server/utils/email/resend-client.ts` | **Modify** | Per-type subject lines with first-name personalization |
| `server/utils/scheduling/check-in-scheduler.ts` | **Modify** | Quiet hours deferral (all types), evidence bridge 6h timing, populate `personalization_context` |
| `server/utils/scheduling/check-in-expiration.ts` | **Modify** | Add cron-driven expiration sweep function |
| `server/api/cron/check-ins.get.ts` | **Modify** | Call expiration sweep after processing |
| `server/api/conversations/index.post.ts` | **Modify** | Cancel pending evidence bridge check-ins on session start |
| `nuxt.config.ts` | **Modify** | Add `UNSUBSCRIBE_SECRET` to runtimeConfig, add `/unsubscribe` to auth exclude list |
| `.env.example` | **Modify** | Add `UNSUBSCRIBE_SECRET` |
| `components/CheckInInterstitial.vue` | **Modify** | Add ARIA attributes, focus trap, Escape handler (US-A03) |
| `server/api/user/timezone.post.ts` | **Modify** | Add timezone comparison before update, log changes (US-A02) |
| `composables/useCheckIns.ts` | **Modify** | Add audio completion gating state (US-A01), update timezone detection to run per session (US-A02) |

---

### User Stories

#### Epic 1: Foundation & Infrastructure

##### US-F01: Database Migration — Email Unsubscribe Column

**Description:** As the system, I need the `email_unsubscribed_at` column on `user_progress` so that user email preferences can be tracked.

**Acceptance Criteria:**

1. Given the migration file `supabase/migrations/20260216_email_unsubscribe.sql` exists, when it is applied, then the `email_unsubscribed_at TIMESTAMP WITH TIME ZONE` column is added to `user_progress` with a default of `NULL`.
2. Given the column is added, when querying `user_progress`, then existing rows have `email_unsubscribed_at = NULL` (subscribed by default).

**Technical Notes:**
- File: `supabase/migrations/20260216_email_unsubscribe.sql`
- Single `ALTER TABLE` statement
- No data backfill needed — NULL = subscribed

**Dependencies:** None (first story)
**Test Requirements:** Verify via SQL after applying migration
**Estimated Complexity:** S — Single ALTER TABLE

---

##### US-F02: HMAC Token Utility

**Description:** As a developer, I need a shared HMAC utility so that unsubscribe tokens can be generated (email sender) and validated (unsubscribe endpoints) consistently.

**Acceptance Criteria:**

1. Given a `userId` and the `UNSUBSCRIBE_SECRET` env var, when `generateUnsubscribeToken(userId)` is called, then it returns a base64url-encoded HMAC-SHA256 signature.
2. Given a `userId` and `signature`, when `validateUnsubscribeToken(userId, signature)` is called with a valid signature, then it returns `true`.
3. Given a tampered `signature`, when `validateUnsubscribeToken(userId, signature)` is called, then it returns `false`.
4. Given the same `userId`, when `generateUnsubscribeToken()` is called multiple times, then it returns the same signature (deterministic).
5. Given `UNSUBSCRIBE_SECRET` is not set, when either function is called, then it throws a descriptive error.

**Technical Notes:**
- File: `server/utils/auth/hmac-tokens.ts`
- Uses Node.js `crypto.createHmac('sha256', secret).update(userId).digest('base64url')`
- `UNSUBSCRIBE_SECRET` read from `useRuntimeConfig().unsubscribeSecret`
- Export: `generateUnsubscribeToken(userId: string): string` and `validateUnsubscribeToken(userId: string, signature: string): boolean`
- Use timing-safe comparison (`crypto.timingSafeEqual`) for validation to prevent timing attacks

**Dependencies:** None (can parallelize with US-F01)
**Test Requirements:** Unit tests (see Test Specification)
**Estimated Complexity:** S — Pure utility, ~30 lines

---

##### US-F03: Rate Limiting Middleware

**Description:** As the system, I need IP-based rate limiting on public check-in endpoints to prevent abuse (NFR-4.2).

**Acceptance Criteria:**

1. Given a client IP, when it makes more than 10 requests in 60 seconds to a rate-limited endpoint, then it receives a `429 Too Many Requests` response.
2. Given a client IP at exactly 10 requests in 60 seconds, when it makes the 11th request, then it receives `429`.
3. Given 60 seconds have passed since the first request in a window, when the client makes a new request, then the counter resets and the request succeeds.
4. Given the rate limiter, when applied, then it only applies to paths matching: `/api/check-ins/open/`, `/api/check-ins/unsubscribe`, `/api/check-ins/resubscribe`.
5. Given non-rate-limited paths (e.g., `/api/check-ins/pending`), when accessed, then no rate limiting is applied.

**Technical Notes:**
- File: `server/middleware/rate-limit.ts`
- In-memory `Map<string, { count: number, resetAt: number }>`
- Clean up expired entries on each request (or use TTL pattern)
- Extract client IP from `getHeader(event, 'x-forwarded-for')` (Vercel provides this) or `event.node.req.socket.remoteAddress`
- Return early with `setResponseStatus(event, 429)` and `{ error: 'Too many requests' }`
- Path matching: check if `event.path` starts with the rate-limited prefixes

**Dependencies:** None (can parallelize with US-F01, US-F02)
**Test Requirements:** Unit tests (see Test Specification)
**Estimated Complexity:** S — Simple middleware, ~40 lines

---

##### US-F04: Environment & Config Setup

**Description:** As a developer, I need `UNSUBSCRIBE_SECRET` configured in the runtime config and documented so the unsubscribe feature works in all environments.

**Acceptance Criteria:**

1. Given `.env.example`, when reviewed, then it includes `UNSUBSCRIBE_SECRET=` with a comment.
2. Given `nuxt.config.ts`, when reviewed, then `runtimeConfig.unsubscribeSecret` maps to `process.env.UNSUBSCRIBE_SECRET`.
3. Given `nuxt.config.ts`, when reviewed, then `/unsubscribe` is added to `supabase.redirectOptions.exclude`.

**Technical Notes:**
- Add to `.env.example`: `UNSUBSCRIBE_SECRET= # HMAC secret for email unsubscribe tokens (generate: openssl rand -hex 32)`
- Add to `nuxt.config.ts` `runtimeConfig`: `unsubscribeSecret: process.env.UNSUBSCRIBE_SECRET`
- Add `/unsubscribe` to the `exclude` array in `supabase.redirectOptions`

**Dependencies:** None
**Test Requirements:** Manual verification
**Estimated Complexity:** S — Config changes only

---

#### Epic 2: Email Template & Deliverability

##### US-E01: Email Template Redesign

**Description:** As a user receiving check-in emails, I see a polished email with a white outer background, per-type heading and body text, per-type CTA button text, and no "expires in 24 hours" line, so the email feels warm and personal rather than transactional.

**Acceptance Criteria:**

1. Given a post-session check-in email, when rendered, then the outer background is white/transparent, the heading is "Quick thought for you", the body text is "A quick thought from your session earlier.", and the CTA button reads "Open check-in".
2. Given an evidence bridge check-in email, when rendered, then the heading is "What did you notice?", the body text includes the observation assignment (e.g., "You were going to notice [assignment] — what did you observe?"), and the CTA reads "Share what you noticed".
3. Given a morning check-in email, when rendered, then the heading is "Good morning", the body is "Start your day with a quick reflection.", and the CTA reads "Open check-in".
4. Given an evening check-in email, when rendered, then the heading is "Day's winding down", the body is "Take a moment to reflect on your day.", and the CTA reads "Open check-in".
5. Given any check-in email, when rendered, then there is NO "This link expires in 24 hours" line.
6. Given any check-in email, when rendered, then the email includes a footer unsubscribe link using the HMAC-signed token (non-expiring).
7. Given any check-in email, when the plain text version is generated, then it includes the same per-type heading, body text, magic link URL, and an unsubscribe URL.

**Technical Notes:**
- Modify `buildEmailHtml()` and `buildEmailText()` in `server/utils/email/check-in-sender.ts`
- Accept additional params: `checkInType`, `footerUnsubscribeLink`
- Per-type content mapped via a config object (heading, body, CTA by type)
- Outer background: `background-color: #ffffff` on body, card remains teal gradient
- Footer link HTML uses HMAC URL from `generateUnsubscribeToken()`
- Evidence bridge body: use `prompt_template` field (already contains the wrapped observation)

**Dependencies:** US-F02 (HMAC utility for footer link)
**Test Requirements:** Unit tests for template output per type; snapshot tests for HTML structure
**Estimated Complexity:** M — Template rewrite with 4 type variations + plain text

---

##### US-E02: First-Name Personalization in Email Subjects

**Description:** As a user, I receive check-in emails with my first name in the subject line (e.g., "Kevin, quick thought from earlier..."), so the email feels personal and increases open rate.

**Acceptance Criteria:**

1. Given a user with `preferred_name = "Kevin"` in `user_intake`, when a post-session email is sent, then the subject line is "Kevin, quick thought from earlier...".
2. Given a user with `preferred_name = NULL`, when any email is sent, then the subject line omits the name prefix (e.g., "Quick thought from earlier...").
3. Given a check-in is scheduled, when `createCheckIn()` is called, then `personalization_context` is populated with `{ name: preferredName }` from `user_intake`.
4. Given the email sender processes a check-in, when building the subject, then it reads `personalization_context.name` from the check-in record (no re-query of intake).
5. Given each check-in type, when an email is sent, then the subject matches the per-type template from Appendix B.

**Technical Notes:**
- Modify `createCheckIn()` in `check-in-scheduler.ts` to accept and store `personalization_context`
- Modify `scheduleCheckIns()` and `scheduleEvidenceBridgeCheckIn()` to query `user_intake.preferred_name` and pass it through
- Modify `getEmailSubject()` in `resend-client.ts` to accept `(type: string, name?: string | null): string` and return personalized subjects
- Subject map per Appendix B (with name and no-name variants)

**Dependencies:** US-E01 (email template changes)
**Test Requirements:** Unit tests for subject line generation (all types × name/no-name)
**Estimated Complexity:** M — Touches scheduler + sender + resend-client

---

##### US-E03: List-Unsubscribe Headers (RFC 8058)

**Description:** As the system, I include `List-Unsubscribe` and `List-Unsubscribe-Post` headers on all check-in emails so email clients (Gmail, Apple Mail) can show native unsubscribe buttons, improving deliverability (NFR-3.1).

**Acceptance Criteria:**

1. Given any check-in email sent via Resend, when the email headers are inspected, then `List-Unsubscribe` contains `<{appUrl}/api/check-ins/unsubscribe?token={magic_link_token}>`.
2. Given any check-in email, when headers are inspected, then `List-Unsubscribe-Post` contains `List-Unsubscribe=One-Click`.
3. Given the magic link token for a check-in, when the `List-Unsubscribe` URL is called via POST by an email client, then the user is unsubscribed (handled by US-U01).

**Technical Notes:**
- Modify `sendCheckInEmail()` in `check-in-sender.ts` to pass `headers` to `resend.emails.send()`
- Token is the `magic_link_token` already stored on the check-in record
- Headers: `{ 'List-Unsubscribe': '<url>', 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' }`

**Dependencies:** US-E01 (email template changes — same file)
**Test Requirements:** Unit test verifying headers are passed to Resend
**Estimated Complexity:** S — Adding headers object to existing send call

---

#### Epic 3: Unsubscribe / Resubscribe Flow

##### US-U01: Unsubscribe API Endpoints

**Description:** As a user who clicks the unsubscribe link in an email footer, I am immediately unsubscribed from check-in emails and redirected to a confirmation page.

**Acceptance Criteria:**

1. Given a valid HMAC token (`?uid=X&sig=Y`), when `GET /api/check-ins/unsubscribe` is called, then `email_unsubscribed_at` is set on `user_progress` for that user, and the response is a 302 redirect to `/unsubscribe?status=success&uid=X&sig=Y`.
2. Given a valid magic_link_token (`?token=X`), when `GET /api/check-ins/unsubscribe` is called, then the user is identified from the check-in record, `email_unsubscribed_at` is set, and the response is a 302 redirect to `/unsubscribe?status=success&uid=X&sig=Y` (HMAC generated for the re-subscribe button).
3. Given an invalid HMAC signature, when `GET /api/check-ins/unsubscribe` is called, then the response is a 302 redirect to `/unsubscribe?status=error`.
4. Given an expired or invalid magic_link_token, when `GET /api/check-ins/unsubscribe?token=X` is called, then the response is a 302 redirect to `/unsubscribe?status=error`.
5. Given a valid magic_link_token, when `POST /api/check-ins/unsubscribe` is called (RFC 8058 one-click), then `email_unsubscribed_at` is set and the response is `200 OK`.
6. Given an already-unsubscribed user, when either endpoint is called again, then the operation is idempotent (no error, `email_unsubscribed_at` remains set).
7. Given rate limiting is active, when more than 10 requests/min come from the same IP, then the endpoint returns `429`.

**Technical Notes:**
- Files: `server/api/check-ins/unsubscribe.get.ts`, `server/api/check-ins/unsubscribe.post.ts`
- GET handler: check for `uid+sig` params first (HMAC path), then `token` param (magic_link_token path). HMAC validated via `validateUnsubscribeToken()`. Magic link token looked up in `check_in_schedule`.
- POST handler: read `token` from URL query, look up check-in, set `email_unsubscribed_at` via service role Supabase client
- Both use `serverSupabaseServiceRole(event)` (no user auth — these are public endpoints)
- Redirect URL includes `uid` and `sig` so the confirmation page can render the re-subscribe button

**Dependencies:** US-F01 (migration), US-F02 (HMAC utility), US-F03 (rate limiting)
**Test Requirements:** Unit tests for both endpoints; E2E test for full unsubscribe flow
**Estimated Complexity:** M — Two endpoint files with dual-token validation logic

---

##### US-U02: Resubscribe API Endpoint

**Description:** As a user who previously unsubscribed, I can click "Re-subscribe" on the confirmation page to start receiving check-in emails again.

**Acceptance Criteria:**

1. Given a valid HMAC token (`?uid=X&sig=Y`), when `POST /api/check-ins/resubscribe` is called, then `email_unsubscribed_at` is set to `NULL` on `user_progress`, and the response is `200 OK` with `{ success: true }`.
2. Given an invalid HMAC signature, when the endpoint is called, then it returns `400` with `{ error: 'Invalid token' }`.
3. Given an already-subscribed user, when the endpoint is called, then the operation is idempotent (no error, `email_unsubscribed_at` remains `NULL`).
4. Given rate limiting is active, when more than 10 requests/min come from the same IP, then the endpoint returns `429`.

**Technical Notes:**
- File: `server/api/check-ins/resubscribe.post.ts`
- Validate HMAC via `validateUnsubscribeToken(uid, sig)`
- Update `user_progress` via service role client: `SET email_unsubscribed_at = NULL WHERE user_id = uid`

**Dependencies:** US-F01 (migration), US-F02 (HMAC utility), US-F03 (rate limiting)
**Test Requirements:** Unit tests for endpoint
**Estimated Complexity:** S — Single endpoint, simple logic

---

##### US-U03: Unsubscribe Confirmation Page

**Description:** As a user who clicked unsubscribe, I see a branded confirmation page with the option to re-subscribe, so I know the action was successful and can reverse it if desired.

**Acceptance Criteria:**

1. Given `status=success` in query params, when the page loads, then it displays: "You've been unsubscribed from check-in emails." with subtext "You'll still see check-ins when you open the app." and a "Re-subscribe" button.
2. Given the user clicks "Re-subscribe", when the API call succeeds, then the page updates to display: "You're subscribed to check-in emails again." and the button disappears.
3. Given `status=error` in query params, when the page loads, then it displays: "This link doesn't seem to be working." with subtext "Try clicking the unsubscribe link in a more recent email."
4. Given the page, when it loads, then it uses `layout: false` with no header or navigation — just a centered brand card on the teal gradient background.
5. Given the page, when it loads, then the "UNHOOKED" eyebrow text is displayed at the top of the card (matching brand style).
6. Given the re-subscribe button is clicked, when the API call is in progress, then the button shows a loading state.
7. Given no auth middleware runs on this page, when an unauthenticated user visits `/unsubscribe`, then the page loads without redirect.

**Technical Notes:**
- File: `pages/unsubscribe.vue`
- `definePageMeta({ layout: false })` — no auth middleware needed
- Read `status`, `uid`, `sig` from `useRoute().query`
- Re-subscribe calls `POST /api/check-ins/resubscribe?uid=X&sig=Y` via `$fetch`
- Brand styling: glass card on teal gradient, pill button, Inter font — match existing patterns
- Wire layout per the spec's confirmation page wireframe (FR-7.2)

**Dependencies:** US-U01 (unsubscribe endpoint redirects here), US-U02 (resubscribe endpoint)
**Test Requirements:** E2E test for page rendering and re-subscribe flow
**Estimated Complexity:** M — New page with reactive state, brand styling, API integration

---

#### Epic 4: Scheduling & Cron Enhancements

##### US-S01: Quiet Hours Deferral (All Check-In Types)

**Description:** As a user, I never receive check-in emails during quiet hours (9pm–8am), because check-ins scheduled during that window are deferred to 8am instead of being dropped.

**Acceptance Criteria:**

1. Given a session ends at 8pm (post-session would be 10pm), when the check-in is scheduled, then `scheduled_for` is set to 8am the next morning.
2. Given a session ends at 3pm (evidence bridge would be 9pm), when the check-in is scheduled, then `scheduled_for` is set to 8am the next morning.
3. Given a session ends at 11am (evidence bridge would be 5pm), when the check-in is scheduled, then `scheduled_for` is 5pm (no deferral — outside quiet hours).
4. Given a session ends at 2pm (post-session would be 4pm), when the check-in is scheduled, then `scheduled_for` is 4pm (no deferral).
5. Given quiet hours, when any check-in type's calculated time falls in the 9pm–8am window, then it is deferred to 8am (not dropped).

**Technical Notes:**
- Modify `scheduleCheckIns()` in `check-in-scheduler.ts`:
  - Remove the `POST_SESSION_CUTOFF_HOUR` check (lines 282-308 that currently drop post-session after 9pm)
  - Replace with `applyQuietHours()` call on the calculated time
  - Apply quiet hours to all types, not just post-session
- Add `applyQuietHours(scheduledFor: Date, timezone: string): Date` function (pseudocode already in spec)
- Reuse existing `getHourInTimezone()`, `createDateAtHour()`, `addDays()` helpers

**Dependencies:** None (can start immediately)
**Test Requirements:** Unit tests for `applyQuietHours()` function and updated scheduling logic
**Estimated Complexity:** M — Replaces existing logic with new quiet hours function

---

##### US-S02: Evidence Bridge Timing (24h → 6h)

**Description:** As a user, I receive my evidence bridge check-in 6 hours after an L1/L2 session instead of 24 hours, so the observation is still fresh.

**Acceptance Criteria:**

1. Given an L1 session ends at 11am, when the evidence bridge is scheduled, then `scheduled_for` is 5pm the same day (6 hours later).
2. Given an L2 session ends at 6pm, when the evidence bridge is scheduled, then `scheduled_for` is 8am the next morning (midnight would be quiet hours → deferred).
<!-- READINESS-REVIEWED: Added L3 exclusion AC per FR-1.2 amendment -->
3. Given an L3 (Identity Integration) session ends, when check-ins are scheduled, then no evidence bridge check-in is created.

**Technical Notes:**
- Modify `scheduleEvidenceBridgeCheckIn()` in `check-in-scheduler.ts`:
  - Change `addHours(sessionEndTime, 24)` to `addHours(sessionEndTime, 6)` (line 228)
  - Add `applyQuietHours()` call (from US-S01)
  - Update log message
- Update `EVIDENCE_BRIDGE_DELAY_HOURS` constant if one exists, or add `const EVIDENCE_BRIDGE_DELAY_HOURS = 6`

**Dependencies:** US-S01 (quiet hours function)
**Test Requirements:** Unit test for 6h timing + quiet hours interaction
**Estimated Complexity:** S — Constant change + add quiet hours call

---

##### US-S03: Personalization Context Population

**Description:** As the system, I store the user's `preferred_name` in `personalization_context` at check-in scheduling time so the email sender can personalize subjects without re-querying intake.

**Acceptance Criteria:**

1. Given a user with `preferred_name = "Kevin"` in `user_intake`, when a check-in is scheduled, then `personalization_context` is set to `{ "name": "Kevin" }`.
2. Given a user with `preferred_name = NULL`, when a check-in is scheduled, then `personalization_context` is set to `NULL` (not `{ "name": null }`).
3. Given both `scheduleCheckIns()` and `scheduleEvidenceBridgeCheckIn()`, when they create check-ins, then both populate `personalization_context`.

**Technical Notes:**
- Modify `scheduleCheckIns()` and `scheduleEvidenceBridgeCheckIn()` to query `user_intake.preferred_name`
- Pass to `createCheckIn()` which stores it in the JSONB column
- Query: `supabase.from('user_intake').select('preferred_name').eq('user_id', userId).single()`
- Only one query per scheduling call (not per check-in) — pass the name through

**Dependencies:** None
**Test Requirements:** Unit test verifying personalization_context is set
**Estimated Complexity:** S — Add one query + pass through to createCheckIn

---

##### US-S04: Email Retry Logic

**Description:** As the system, I retry failed email sends up to 3 times on subsequent cron cycles, marking the check-in as `failed` after the 3rd attempt.

**Acceptance Criteria:**

1. Given an email send fails (Resend error), when the cron processes the check-in, then `retry_count` is incremented and the check-in stays in `scheduled` status.
2. Given `retry_count = 2` (two prior failures) and the 3rd attempt fails, when the cron processes the check-in, then `retry_count` is set to 3 and status is changed to `failed`.
3. Given a check-in with `retry_count = 3`, when the cron runs, then it is NOT picked up for processing (filtered by `retry_count < 3`).
4. Given a check-in with `retry_count = 1`, when the cron runs and the send succeeds, then status changes to `sent` and `email_sent_at` is set.

**Technical Notes:**
- Modify `processScheduledCheckIns()` in `check-in-sender.ts`:
  - Add `.lt('retry_count', 3)` to the query filter
  - In the catch block: increment `retry_count`, if >= 3 set `status = 'failed'`
  - On success: set `status = 'sent'`, `email_sent_at`
- The 5-min cron cycle provides natural backoff (~5 min between retries)

**Dependencies:** None (existing `retry_count` column already in schema)
**Test Requirements:** Unit tests for retry/failure scenarios
**Estimated Complexity:** S — Small additions to existing cron logic

---

##### US-S05: Unsubscribed User Handling in Cron

**Description:** As the system, when processing check-ins for unsubscribed users, I advance the check-in to `sent` status with `email_sent_at = null` (no email sent) so the cron doesn't re-process it but interstitials still work.

**Acceptance Criteria:**

1. Given a user with `email_unsubscribed_at` set, when the cron processes their scheduled check-in, then the check-in status is updated to `sent` with `email_sent_at = NULL`.
2. Given a check-in advanced to `sent` with `email_sent_at = NULL`, when the interstitial endpoint checks for pending check-ins, then it includes this check-in (interstitials still display).
3. Given an unsubscribed user, when the cron runs, then no email is sent via Resend (no `resend.emails.send()` call).
4. Given an unsubscribed user, when the cron runs, then the log includes a message like `[check-in-sender] User {id} unsubscribed, skipping email`.

**Technical Notes:**
- Modify `processScheduledCheckIns()` in `check-in-sender.ts`:
  - After fetching each check-in, query `user_progress.email_unsubscribed_at` for the user
  - If unsubscribed: update status to `sent` with `email_sent_at: null`, skip Resend call, continue
  - Consider batching the unsubscribe check (fetch all user IDs at once) for performance

**Dependencies:** US-F01 (migration — column must exist)
**Test Requirements:** Unit tests for unsubscribed user path
**Estimated Complexity:** S — Add subscription check to existing loop

---

##### US-S06: Cron-Driven Expiration Sweep

**Description:** As the system, the cron job marks expired check-ins in the database so queries don't need to calculate expiration at display time (FR-10).

**Acceptance Criteria:**

1. Given a morning check-in (9am) and the current time is past 7pm, when the cron runs, then the check-in status is updated to `expired` with `expired_at` set.
2. Given an evening check-in (7pm) and the current time is past 9am the next day, when the cron runs, then it is marked `expired`.
3. Given a post-session check-in, when the current time is past the end of its window, then it is marked `expired`.
4. Given an evidence bridge check-in, when the cron runs, then it is NOT expired by the cron (evidence bridges have no time-based expiry per FR-10.2).
5. Given a check-in in `completed`, `skipped`, `cancelled`, or `failed` status, when the cron runs, then it is NOT modified (only `scheduled` and `sent` are eligible per FR-10.3).

**Technical Notes:**
- Add `expireOverdueCheckIns(supabase, now)` function to `check-in-expiration.ts`
- Query check-ins in `scheduled` or `sent` status, exclude `evidence_bridge` type
- For each, call `isCheckInExpired()` (already exists) and update status if expired
- Call from `processScheduledCheckIns()` (or directly from cron endpoint after processing)
- Use `getCheckInExpiration()` for the timezone-aware expiry calculation

**Dependencies:** None
**Test Requirements:** Unit tests for expiration sweep logic
**Estimated Complexity:** M — New function using existing expiration helpers + integration with cron

---

#### Epic 5: Evidence Bridge Cancellation

##### US-EB01: Cancel Evidence Bridge on Session Start

**Description:** As the system, when a user starts their next layer session, I cancel any pending evidence bridge check-ins for that illusion so they don't receive an outdated prompt (FR-8).

**Acceptance Criteria:**

1. Given a pending evidence bridge check-in for illusion `stress_relief`, when a new conversation is created with `illusionKey = 'stress_relief'`, then the evidence bridge is cancelled with `cancellation_reason = 'user_continued_immediately'`.
2. Given a deferred evidence bridge (deferred to 8am by quiet hours), when the user starts the next session before 8am, then it is still cancelled.
3. Given an evidence bridge in `sent` status (email already sent, user hasn't responded), when the user starts the next session, then it is cancelled.
4. Given no pending evidence bridge for the illusion, when a new conversation is created, then no error occurs (graceful no-op).
5. Given a conversation created WITHOUT an `illusionKey` (support session), when created, then no evidence bridge cancellation is attempted.

**Technical Notes:**
- Modify `POST /api/conversations/index.post.ts`:
  - After creating the conversation, if `illusionKey` is provided:
    - Cancel pending evidence bridges: `UPDATE check_in_schedule SET status = 'cancelled', cancellation_reason = 'user_continued_immediately' WHERE user_id = X AND trigger_illusion_key = illusionKey AND check_in_type = 'evidence_bridge' AND status IN ('scheduled', 'sent')`
  - Non-blocking: catch and log errors without failing conversation creation

**Dependencies:** None
**Test Requirements:** Unit test for cancellation; E2E test for session-start → cancellation flow
**Estimated Complexity:** S — ~15 lines added to existing endpoint

---

<!-- READINESS-REVIEWED: Added 3 new stories for FR-11.6, FR-12.2, NFR-5 -->
#### Epic 6: Additional Requirements (Readiness Review)

##### US-A01: Audio Completion Gating for Check-In Responses

**Description:** As a user responding to a check-in, the AI's audio response must play in full before the check-in experience closes, so I hear the complete acknowledgment.

**Acceptance Criteria:**

1. Given the user submits a voice response via the dashboard interstitial, when the AI audio response begins playing, then the interstitial modal remains open until audio playback completes.
2. Given the user submits a voice response via the email-linked check-in page, when the AI audio response begins playing, then the page does not navigate away until audio playback completes.
3. Given the AI audio response finishes playing, when playback ends, then the check-in experience closes normally (interstitial dismisses or page navigates to dashboard).
4. Given audio playback fails or errors, when the error occurs, then the check-in experience closes gracefully after a brief timeout (e.g., 3 seconds) rather than blocking indefinitely.

**Technical Notes:**
- Listen for the `ended` event on the audio element to detect playback completion
- Add a `isAudioPlaying` state flag that prevents modal dismiss / page navigation
- Fallback timeout prevents infinite blocking if audio fails to load

**Dependencies:** None (existing audio playback infrastructure)
**Test Requirements:** Unit test for audio gating state; manual verification of end-to-end flow
**Estimated Complexity:** S — State flag + event listener

---

##### US-A02: Timezone Change Detection

**Description:** As a user who has traveled to a new timezone, when I open the app, the system detects my new timezone and updates my stored timezone so future check-ins are scheduled correctly.

**Acceptance Criteria:**

1. Given a user with timezone `America/New_York` stored in `user_progress`, when they open the app from `America/Los_Angeles`, then the stored timezone is updated to `America/Los_Angeles`.
2. Given the timezone has changed, when the update occurs, then a log message is emitted: `[timezone] Updated user {id} timezone from {old} to {new}`.
3. Given the timezone has NOT changed, when the detection runs, then no update is made (no unnecessary DB write).
4. Given timezone detection runs, when the user has no stored timezone, then the detected timezone is stored (first-time setup).

**Technical Notes:**
- Modify `POST /api/user/timezone` to compare incoming timezone with stored value before updating
- Return `{ changed: boolean, timezone: string }` in response
- Modify `useTimezoneDetection()` to run on every app open, not just first visit (remove `hasDetected` early return, or use sessionStorage instead)
- **Note:** FR-12.3 (rescheduling pending check-ins) is deferred to post-MVP. The new timezone takes effect on the next scheduling cycle.

**Dependencies:** None
**Test Requirements:** Unit test for timezone comparison logic
**Estimated Complexity:** S — Small modification to existing endpoint + composable

---

##### US-A03: Interstitial Modal Accessibility

**Description:** As a user navigating with a keyboard or screen reader, the check-in interstitial modal meets accessibility standards (NFR-5) so I can interact with it without a mouse.

**Acceptance Criteria:**

1. Given the interstitial modal opens, when inspected, then it has `role="dialog"` and `aria-modal="true"` attributes (NFR-5.3).
2. Given the interstitial modal is open, when I press Tab or Shift+Tab, then focus cycles within the modal only (focus trap) and does not escape to elements behind it (NFR-5.1).
3. Given the interstitial modal is open, when I press Escape, then the modal dismisses (equivalent to clicking outside — modal hides without changing check-in status) (NFR-5.2).
4. Given the interstitial modal opens, when focus is managed, then focus moves to the modal content. When the modal closes, focus returns to the main dashboard content (NFR-5.4).
5. Given the check-in prompt text is displayed in the modal, when inspected, then it is associated with the modal via `aria-labelledby` or `aria-describedby` (NFR-5.5).

**Technical Notes:**
- File: `components/CheckInInterstitial.vue`
- Reference `components/CeremonyExitDialog.vue` for the existing focus trap and ARIA pattern
- Focus trap: intercept Tab keydown, cycle between interactive elements within the modal
- Escape handler: call `dismissInterstitial()` (same as click-outside behavior per FR-9.5)
- Use `onMounted` / `onUnmounted` for keydown listener lifecycle

**Dependencies:** None
**Test Requirements:** E2E test for Escape dismissal; manual screen reader verification
**Estimated Complexity:** S — Pattern already exists in CeremonyExitDialog.vue (~20 lines)

---

### Implementation Phases & Story Ordering

```
Phase 1: Foundation (can all run in parallel)
├── US-F01: Database migration
├── US-F02: HMAC token utility
├── US-F03: Rate limiting middleware
└── US-F04: Environment & config setup

Phase 2: Email Enhancements (sequential within, parallel across)
├── US-E01: Email template redesign ──────── depends on US-F02
├── US-E02: First-name personalization ───── depends on US-E01, US-S03
└── US-E03: List-Unsubscribe headers ─────── depends on US-E01

Phase 3: Unsubscribe Flow (sequential)
├── US-U01: Unsubscribe API endpoints ────── depends on US-F01, US-F02, US-F03
├── US-U02: Resubscribe API endpoint ─────── depends on US-F01, US-F02, US-F03
└── US-U03: Unsubscribe confirmation page ── depends on US-U01, US-U02

Phase 4: Scheduling & Cron (mostly parallel)
├── US-S01: Quiet hours deferral ─────────── no dependencies
├── US-S02: Evidence bridge 6h timing ────── depends on US-S01
├── US-S03: Personalization context ──────── no dependencies
├── US-S04: Email retry logic ────────────── no dependencies
├── US-S05: Unsubscribed user handling ───── depends on US-F01
└── US-S06: Cron-driven expiration sweep ─── no dependencies

Phase 5: Evidence Bridge
└── US-EB01: Cancel on session start ─────── no dependencies

Phase 6: Additional Requirements (Readiness Review)
├── US-A01: Audio completion gating ─────── no dependencies
├── US-A02: Timezone change detection ───── no dependencies
└── US-A03: Interstitial modal accessibility ── no dependencies
```

**Parallelization opportunities:**
- All Phase 1 stories can run in parallel
- US-S01, US-S03, US-S04, US-S06, US-EB01 have no dependencies and can start immediately
- US-E01 and US-U01 can run in parallel once Phase 1 is complete

**Critical path:** US-F02 → US-E01 → US-E02 (HMAC → email template → personalization)

---

### Test Specification

#### Unit Tests

##### `tests/unit/auth/hmac-tokens.test.ts`
Tests for `server/utils/auth/hmac-tokens.ts`:
- **"should generate deterministic HMAC for same userId"** — call twice with same ID, assert equal
- **"should generate different HMACs for different userIds"** — two IDs, assert not equal
- **"should validate a correct signature"** — generate then validate, assert true
- **"should reject an incorrect signature"** — validate with tampered sig, assert false
- **"should reject an empty signature"** — validate with '', assert false
- **"should throw if UNSUBSCRIBE_SECRET is not set"** — mock config without secret, assert throws
- **Mock strategy:** Mock `useRuntimeConfig()` to provide/omit `unsubscribeSecret`

##### `tests/unit/middleware/rate-limit.test.ts`
Tests for `server/middleware/rate-limit.ts`:
- **"should allow requests under the limit"** — 10 requests, all succeed
- **"should reject the 11th request within 60s"** — 11 requests, last returns 429
- **"should reset after 60 seconds"** — 10 requests, wait 60s, 11th succeeds
- **"should only rate-limit specified paths"** — request to `/api/check-ins/pending` (non-limited), assert no limiting
- **"should rate-limit /api/check-ins/open/ paths"** — 11 requests, assert 429
- **"should rate-limit /api/check-ins/unsubscribe paths"** — 11 requests, assert 429
- **Mock strategy:** Mock `event` object with path and IP headers

##### `tests/unit/email/check-in-sender.test.ts` (extend existing)
New tests for email template and cron enhancements:
- **"should build HTML with white outer background"** — assert no `#041f21` in outer body
- **"should use per-type heading for post_session"** — assert "Quick thought for you"
- **"should use per-type heading for evidence_bridge"** — assert "What did you notice?"
- **"should use per-type heading for morning"** — assert "Good morning"
- **"should use per-type heading for evening"** — assert "Day's winding down"
- **"should use per-type CTA text"** — assert "Open check-in" / "Share what you noticed"
- **"should NOT include expires in 24 hours text"** — assert absence
- **"should include footer unsubscribe link with HMAC"** — assert link present with uid+sig params
- **"should include List-Unsubscribe header"** — assert header in Resend call
- **"should include List-Unsubscribe-Post header"** — assert `List-Unsubscribe=One-Click`
- **"should personalize subject with name"** — name="Kevin", assert subject starts with "Kevin,"
- **"should use fallback subject without name"** — name=null, assert no name prefix
- **"should increment retry_count on send failure"** — mock Resend error, assert retry_count updated
- **"should mark as failed after 3 retries"** — retry_count=2 + failure, assert status='failed'
- **"should not pick up check-ins with retry_count >= 3"** — assert query includes `.lt('retry_count', 3)`
- **"should skip email for unsubscribed users"** — mock user_progress with email_unsubscribed_at, assert no Resend call, status='sent', email_sent_at=null
- **Mock strategy:** Mock Resend client, Supabase client, `useRuntimeConfig()`

##### `tests/unit/email/resend-client.test.ts` (extend existing)
- **"should return per-type subject with name"** — all 4 types + default
- **"should return per-type subject without name"** — all 4 types + default
- **Mock strategy:** Pure function, no mocks needed

##### `tests/unit/scheduling/check-in-scheduler.test.ts` (extend existing)
New tests for quiet hours and timing:
- **"applyQuietHours should defer 10pm to 8am next day"** — 22:00 → 08:00+1
- **"applyQuietHours should defer 2am to 8am same day"** — 02:00 → 08:00
- **"applyQuietHours should not change 3pm"** — 15:00 → 15:00
- **"applyQuietHours should defer exactly 9pm to 8am next day"** — 21:00 → 08:00+1
- **"applyQuietHours should not change exactly 8am"** — 08:00 → 08:00
- **"should schedule post-session with quiet hours deferral"** — session at 8pm, assert scheduled_for = 8am next day
- **"should NOT drop post-session after 9pm (old behavior removed)"** — session at 8pm, assert check-in IS created
- **"should schedule evidence bridge at 6 hours"** — session at 11am, assert scheduled_for = 5pm
- **"should apply quiet hours to evidence bridge"** — session at 6pm (bridge at midnight), assert 8am
- **"should populate personalization_context with name"** — mock intake with preferred_name, assert context set
- **"should set personalization_context to null when no name"** — mock intake without preferred_name, assert null
- **Mock strategy:** Mock Supabase client, use known timezone like 'America/New_York'

##### `tests/unit/scheduling/check-in-expiration.test.ts` (extend existing)
- **"expireOverdueCheckIns should expire morning check-in after 7pm"** — scheduled 9am, now 7:01pm
- **"expireOverdueCheckIns should NOT expire morning check-in before 7pm"** — scheduled 9am, now 6:59pm
- **"expireOverdueCheckIns should expire evening check-in after 9am next day"** — scheduled 7pm, now 9:01am+1
- **"expireOverdueCheckIns should NOT expire evidence_bridge"** — evidence bridge in 'sent', assert not expired
- **"expireOverdueCheckIns should only process scheduled and sent statuses"** — completed/skipped check-ins, assert untouched
- **Mock strategy:** Mock Supabase client, provide test check-ins with known times

##### `tests/unit/api/unsubscribe.test.ts`
Tests for unsubscribe endpoints:
- **"GET should unsubscribe with valid HMAC and redirect"** — valid uid+sig, assert email_unsubscribed_at set, 302 redirect
- **"GET should unsubscribe with valid magic_link_token and redirect"** — valid token, assert redirect with HMAC params
- **"GET should redirect to error on invalid HMAC"** — bad sig, assert redirect to /unsubscribe?status=error
- **"GET should redirect to error on expired magic_link_token"** — expired token, assert error redirect
- **"POST should unsubscribe with valid magic_link_token"** — valid token, assert 200 + email_unsubscribed_at set
- **"POST should return 400 on invalid token"** — bad token, assert 400
- **"should be idempotent for already-unsubscribed users"** — unsubscribe twice, no error
- **Mock strategy:** Mock Supabase client, mock `validateUnsubscribeToken()`

##### `tests/unit/api/resubscribe.test.ts`
- **"should resubscribe with valid HMAC"** — valid uid+sig, assert email_unsubscribed_at = null
- **"should return 400 on invalid HMAC"** — bad sig, assert 400
- **"should be idempotent for already-subscribed users"** — resubscribe when already subscribed, no error
- **Mock strategy:** Mock Supabase client, mock `validateUnsubscribeToken()`

#### E2E Tests

##### `tests/e2e/unsubscribe.spec.ts`
- **"should display unsubscribed confirmation when status=success"** — navigate to `/unsubscribe?status=success&uid=X&sig=Y`, assert confirmation text visible
- **"should display re-subscribe button"** — assert button present on success page
- **"should re-subscribe when button clicked"** — mock `POST /api/check-ins/resubscribe`, click button, assert success message
- **"should display error message when status=error"** — navigate with `status=error`, assert error text
- **"should not show header or navigation"** — assert no AppHeader component
- **"should render with brand styling (teal card, gradient)"** — visual assertions on card presence
- **Mock strategy:** Route mock for `/api/check-ins/resubscribe` (return 200). No auth needed (page is public).

##### `tests/e2e/check-in-email.spec.ts` (extend existing if present, or create)
- **"evidence bridge should be cancelled when user starts next session"** — mock pending evidence bridge, create conversation, assert cancellation API called
- **Mock strategy:** Route mocks for check-in and conversation APIs

<!-- READINESS-REVIEWED: Test specs for 3 new stories from readiness review -->
##### `tests/unit/composables/useCheckIns.test.ts` (extend existing or create)
Tests for audio completion gating (US-A01):
- **"should prevent modal dismiss while audio is playing"** — set isAudioPlaying=true, attempt dismiss, assert modal still open
- **"should allow modal dismiss after audio ends"** — set isAudioPlaying=false, attempt dismiss, assert modal closes
- **Mock strategy:** Mock audio element with ended event

##### `tests/unit/api/timezone.test.ts` (create)
Tests for timezone change detection (US-A02):
- **"should update timezone when different from stored"** — stored='America/New_York', incoming='America/Los_Angeles', assert update called
- **"should NOT update when timezone matches stored"** — same timezone, assert no update
- **"should store timezone on first visit (no existing record)"** — no stored timezone, assert upsert
- **Mock strategy:** Mock Supabase client

##### `tests/e2e/check-in-interstitial.spec.ts` (extend existing or create)
Tests for interstitial accessibility (US-A03):
- **"should dismiss modal when Escape is pressed"** — open interstitial, press Escape, assert modal hidden
- **"should have role=dialog and aria-modal=true"** — assert attributes on modal element
- **"should trap focus within modal"** — Tab through interactive elements, assert focus stays within modal
- **Mock strategy:** Route mock for interstitial API

#### Coverage Goals

**Highest risk / deepest coverage:**
1. **HMAC token utility** — Security-critical, must be deterministic and timing-safe
2. **Unsubscribe endpoints** — Public-facing, dual-token validation, must handle edge cases
3. **Email template per-type content** — User-facing, must match spec exactly
4. **Quiet hours deferral** — Timezone-sensitive, replaces existing logic
5. **Retry logic** — Must not infinite-loop or lose check-ins

**"Done" for testing:**
- All unit test files listed above pass
- E2E unsubscribe flow passes
- Existing check-in E2E tests still pass (no regressions)
- Manual verification: send test email, verify template renders correctly in Gmail + Apple Mail

---

<!-- READINESS-REVIEWED: Complete traceability matrix — added all missing FRs and NFRs -->
### Traceability Matrix

| Requirement | User Story | Test Coverage |
|-------------|-----------|---------------|
| FR-1.1-1.4 (Scheduling) | Already implemented | Existing check-in-scheduler.test.ts |
| FR-1.2 (Evidence bridge + L3 exclusion) | US-S02 | check-in-scheduler.test.ts |
| FR-1.5-1.6 (Window, timezone detect) | Already implemented | Existing tests |
| FR-1.7 (Prompt content) | Deferred to content-library-expansion-spec | — |
| FR-2 (Quiet Hours) | US-S01 | check-in-scheduler.test.ts |
| FR-3 (One active post-session) | Already implemented (ADR-002) | Existing tests |
| FR-4.1-4.4 (Email basics) | Already implemented | Existing check-in-sender.test.ts |
| FR-4.5 (Per-type subjects) | US-E02 | resend-client.test.ts |
| FR-4.6 (List-Unsubscribe) | US-E03 | check-in-sender.test.ts |
| FR-4.7 (Footer unsubscribe link) | US-E01 | check-in-sender.test.ts |
| FR-4.8 (Unsubscribed handling) | US-S05 | check-in-sender.test.ts |
| FR-4.9-4.11 (Retry) | US-S04 | check-in-sender.test.ts |
| FR-5 (Completion) | Already implemented | Existing tests |
| FR-6 (Expired links) | Already implemented | Existing tests |
| FR-7.1 (One-click unsubscribe) | US-U01 | unsubscribe.test.ts |
| FR-7.2 (Confirmation page) | US-U03 | unsubscribe.spec.ts (E2E) |
| FR-7.3 (Re-subscribe) | US-U02 | resubscribe.test.ts |
| FR-7.4-7.6 (Scope) | US-U01, US-S05 | unsubscribe.test.ts, check-in-sender.test.ts |
| FR-7.7 (HMAC token) | US-F02 | hmac-tokens.test.ts |
| FR-7.8 (Magic link in header) | US-E03 | check-in-sender.test.ts |
| FR-8 (Evidence bridge cancel) | US-EB01 | check-in-email.spec.ts |
| FR-9 (Dashboard interstitial) | Already implemented (verify during testing) | Existing E2E tests; verify FR-9.3 sessionStorage |
| FR-10 (Expiration) | US-S06 | check-in-expiration.test.ts |
| FR-11.1-11.5 (AI response behavior) | Implemented via system prompt | Manual verification |
| FR-11.6 (Audio completion) | US-A01 | Manual verification + unit test |
| FR-11.7 (No skipped check-in refs) | Implemented via system prompt | Manual verification |
| FR-12.1 (Timezone detection) | Already implemented | Existing tests |
| FR-12.2 (Timezone change detection) | US-A02 | Unit test |
| FR-12.3 (Timezone rescheduling) | Deferred to post-MVP | — |
| NFR-3.1 (List-Unsubscribe) | US-E03 | check-in-sender.test.ts |
| NFR-4.1 (Token format) | Already implemented | Existing tests |
| NFR-4.2 (Rate limiting) | US-F03 | rate-limit.test.ts |
| NFR-4.3 (HMAC secret) | US-F02, US-F04 | hmac-tokens.test.ts |
| NFR-4.4 (CRON_SECRET) | Already implemented | Existing tests |
| NFR-5 (Accessibility) | US-A03 | E2E test + manual screen reader verification |

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-28 | Initial specification created from core-program-epic.md and core-program-spec.md |
| 1.1 | 2026-02-09 | Added evidence bridge check-in type (24-hour timing, observation assignments, cancellation behavior) per evidence-based-coaching-spec integration |
| 1.2 | 2026-02-16 | Email deliverability enhancements: per-type subject lines, List-Unsubscribe headers, unsubscribe footer link, one-click unsubscribe/resubscribe flow. Evidence bridge timing reduced from 24h to 6h. Quiet hours (9pm–8am) added for all check-in types — post-session now deferred to 8am instead of dropped. Evidence bridge cancellation updated for 6h window and deferred check-ins. |
| 1.3 | 2026-02-16 | Requirements refinement pass. **New FRs:** FR-9 (dashboard interstitial behavior — dismissal, session hiding, skip), FR-10 (check-in expiration — cron-driven, evidence bridge no time-based expiry), FR-11 (AI response behavior — 5 behaviors, audio must complete before experience closes), FR-12 (timezone detection & rescheduling on change). **Updated FRs:** FR-4 (email body structure per type, retry up to 3x with backoff, unsubscribed user cron handling), FR-7 (HMAC-signed unsubscribe token for footer link, dual-token approach). **New NFRs:** NFR-4 (security — rate limiting, token format, HMAC secret), NFR-5 (accessibility — modal focus trap, Escape dismiss, ARIA). **Technical design:** Added state transition diagram with 8 statuses (added `cancelled`, `failed`), `cancellation_reason` and `retry_count` columns, per-endpoint auth table, updated cron pseudocode, HMAC unsubscribe token implementation. |
| 1.3.1 | 2026-02-16 | Email template UX refinements: white/transparent outer background (replaced dark #041f21), per-type headings replacing generic "Your check-in is ready", first name personalization in subject lines (with no-name fallback), removed "expires in 24 hours" line, per-type CTA button text. Updated Appendix B with name-personalized subject line table. |
| 1.4 | 2026-02-16 | **Technical design complete.** Added Implementation Design section: 13 architecture decisions, 15 new/modified files, 15 user stories across 5 epics (Foundation, Email Enhancements, Unsubscribe Flow, Scheduling/Cron, Evidence Bridge), implementation phases with dependency graph, complete test specification (unit + E2E), and FR→story→test traceability matrix. Key decisions: standalone unsubscribe page with `layout: false`, in-memory rate limiting, HMAC shared utility, cron-cycle retry strategy, quiet hours deferral (replaces drop), evidence bridge cancellation at session-start. |
| 1.5 | 2026-02-16 | **Readiness review complete.** 10 gaps found and resolved across 3 traceability layers. **Layer 1 (UX→Reqs):** Added FR-1.7 (prompt content cross-ref to content-library-expansion-spec), FR-11.7 (AI must not reference skipped check-ins), amended FR-1.2 (explicit L3 exclusion). **Layer 2 (Reqs→Stories):** Added 3 new stories — US-A01 (audio completion gating for FR-11.6), US-A02 (timezone change detection for FR-12.2), US-A03 (interstitial accessibility for NFR-5). FR-9 marked as already implemented (verify during testing). FR-11.1-11.5 marked as system prompt implementation. FR-12.3 (timezone rescheduling) deferred to post-MVP. **Layer 3 (Stories→ACs):** Updated FR-4.9 to match Architecture Decision #8 (cron-cycle retries, not exponential backoff). Added L3 exclusion AC to US-S02. Rebuilt traceability matrix with all 35 requirements mapped. Status changed to **Ready for Development**. |

---

## Readiness Summary

| Field | Value |
|-------|-------|
| **Review Date** | 2026-02-16 |
| **Readiness Assessment** | Ready for Development |
| **Gaps Found** | 10 |
| **Gaps Resolved** | 10 |
| **New Stories Added** | 3 (US-A01, US-A02, US-A03) |
| **Requirements Added/Amended** | 4 (FR-1.2 amended, FR-1.7 added, FR-4.9 updated, FR-11.7 added) |
| **Deferred Items** | FR-12.3 (timezone rescheduling) — deferred to post-MVP |
| **Follow-up Actions** | Verify FR-9.3 (sessionStorage persistence for interstitial dismissal) during testing; update content-library-expansion-spec to include check-in prompt templates (FR-1.7) |
| **Total User Stories** | 18 across 6 epics |
| **Total Requirements Traced** | 35 (including already-implemented and deferred) |
