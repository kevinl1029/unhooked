# Unhooked: Check-In System Specification

**Version:** 1.3
**Created:** 2026-01-28
**Status:** In Progress
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
13. [Changelog](#changelog)

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
- FR-1.2: Schedule evidence bridge check-in 6 hours after L1/L2 session completion
- FR-1.3: Morning check-ins scheduled for 9am local time
- FR-1.4: Evening check-ins scheduled for 7pm local time
- FR-1.5: Use rolling 3-day scheduling window until ceremony complete
- FR-1.6: Detect timezone via browser (`Intl.DateTimeFormat().resolvedOptions().timeZone`)

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
- FR-4.9: If Resend returns an error, retry up to 3 times with exponential backoff (1 min, 5 min, 15 min)
- FR-4.10: After 3 failed attempts, mark check-in status as `failed`. Log the failure for monitoring.
- FR-4.11: Track retry attempts via `retry_count` column on `check_in_schedule`

**Email body structure:**

All check-in emails follow this structure:

| Section | Content |
|---------|---------|
| **Header** | "UNHOOKED" brand text |
| **Body** | Per-type contextual line (see below) |
| **CTA** | Pill-shaped button linking to app via magic link |
| **Footer** | Unsubscribe link (HMAC token, non-expiring) |

Per-type body and CTA text:

| Type | Body text | CTA button |
|------|-----------|------------|
| Post-Session | "A quick thought from your session earlier." | "Open check-in" |
| Evidence Bridge | "You were going to [observation assignment] — what did you observe?" | "Share what you noticed" |
| Morning | "Start your day with a quick reflection." | "Open check-in" |
| Evening | "Take a moment to reflect on your day." | "Open check-in" |

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

### FR-12: Timezone Detection & Update

**Description:** Handle timezone changes when users travel or relocate.

**Requirements:**
- FR-12.1: Detect user timezone via browser on each app open (`Intl.DateTimeFormat().resolvedOptions().timeZone`)
- FR-12.2: If detected timezone differs from stored timezone on `check_in_schedule`, update the stored timezone
- FR-12.3: Reschedule any pending check-ins (status `scheduled`) using the new timezone — recalculate `scheduled_for` timestamps and re-apply quiet hours

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

### Still Open

None currently.

---

## Appendix

### A. Check-In Prompt Templates

See [Check-In Types](#check-in-types) section for full prompt templates organized by type and program stage.

### B. Email Subject Lines

| Type | Subject |
|------|---------|
| Morning | "Good morning — quick check-in" |
| Evening | "Day's winding down — how did it go?" |
| Post-Session | "Quick thought from earlier..." |
| Evidence Bridge | "What did you notice?" |
| Default | "Checking in with you" |

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-28 | Initial specification created from core-program-epic.md and core-program-spec.md |
| 1.1 | 2026-02-09 | Added evidence bridge check-in type (24-hour timing, observation assignments, cancellation behavior) per evidence-based-coaching-spec integration |
| 1.2 | 2026-02-16 | Email deliverability enhancements: per-type subject lines, List-Unsubscribe headers, unsubscribe footer link, one-click unsubscribe/resubscribe flow. Evidence bridge timing reduced from 24h to 6h. Quiet hours (9pm–8am) added for all check-in types — post-session now deferred to 8am instead of dropped. Evidence bridge cancellation updated for 6h window and deferred check-ins. |
| 1.3 | 2026-02-16 | Requirements refinement pass. **New FRs:** FR-9 (dashboard interstitial behavior — dismissal, session hiding, skip), FR-10 (check-in expiration — cron-driven, evidence bridge no time-based expiry), FR-11 (AI response behavior — 5 behaviors, audio must complete before experience closes), FR-12 (timezone detection & rescheduling on change). **Updated FRs:** FR-4 (email body structure per type, retry up to 3x with backoff, unsubscribed user cron handling), FR-7 (HMAC-signed unsubscribe token for footer link, dual-token approach). **New NFRs:** NFR-4 (security — rate limiting, token format, HMAC secret), NFR-5 (accessibility — modal focus trap, Escape dismiss, ARIA). **Technical design:** Added state transition diagram with 8 statuses (added `cancelled`, `failed`), `cancellation_reason` and `retry_count` columns, per-endpoint auth table, updated cron pseudocode, HMAC unsubscribe token implementation. |
