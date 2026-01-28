# Unhooked: Check-In System Specification

**Version:** 1.0
**Created:** 2026-01-28
**Status:** Draft
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

### Check-In Types

| Type | When | Duration | Purpose |
|------|------|----------|---------|
| **Post-Session** | 2 hours after core session | 1-2 min | Bridge insight to real life |
| **Morning** | 9am local | 1-2 min | Set intention, surface state |
| **Evening** | 7pm local | 2-3 min | Reflect on day, gather evidence |

### Core Design Principles

1. **Invitations, not obligations** — No guilt for skipping; AI never mentions missed check-ins
2. **Brief and focused** — 2-3 minutes max; don't spiral into full sessions
3. **Capture-oriented** — Listen for real-world observations to capture as moments
4. **Contextual** — Prompts adapt based on current illusion and program stage

---

## Check-In Types

### 1. Post-Session Check-In

**When:** 2 hours after any core session (with 9pm cutoff)
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

### Check-In Windows & Expiration

Check-ins don't expire via database flag. Expiration is calculated at display time:

| Check-In Type | Window | Expires At |
|---------------|--------|------------|
| Morning (9am) | 9am - 7pm | 7pm local time |
| Evening (7pm) | 7pm - 9am next day | 9am next day |
| Post-Session | 2hr after session | End of current window |

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
- FR-1.2: Only schedule post-session if 2 hours later is before 9pm in user's timezone
- FR-1.3: Morning check-ins scheduled for 9am local time
- FR-1.4: Evening check-ins scheduled for 7pm local time
- FR-1.5: Use rolling 3-day scheduling window until ceremony complete
- FR-1.6: Detect timezone via browser (`Intl.DateTimeFormat().resolvedOptions().timeZone`)

### FR-2: One Active Post-Session Rule (ADR-002)

**Description:** Prevent stacking of post-session check-ins.

**Requirements:**
- FR-2.1: When a new session completes, expire any pending post-session check-ins from previous sessions
- FR-2.2: Users only receive check-ins about their most recent core session

### FR-3: Email Delivery

**Description:** Send check-in emails via email service.

**Requirements:**
- FR-3.1: Send emails via Resend from `coach@getunhooked.app`
- FR-3.2: Email contains link only, no prompt content (prompt shown in app)
- FR-3.3: Generate 24-hour magic link token for authentication
- FR-3.4: Store token in `magic_link_token` column

### FR-4: Check-In Completion

**Description:** Mark check-ins complete when user responds.

**Requirements:**
- FR-4.1: Create new conversation for check-in response
- FR-4.2: Mark check-in status as 'completed' with timestamp
- FR-4.3: Link response conversation to check-in record
- FR-4.4: Capture significant moments from response (see [moment-capture-spec.md](moment-capture-spec.md))

### FR-5: Expired Link Handling

**Description:** Handle expired magic links gracefully.

**Requirements:**
- FR-5.1: If token is expired, redirect to most recent pending check-in
- FR-5.2: If no pending check-ins, redirect to dashboard

---

## Non-Functional Requirements

### NFR-1: Reliability

- NFR-1.1: Email delivery must succeed >99% of the time
- NFR-1.2: Cron job must be idempotent (safe to run multiple times)
- NFR-1.3: Check-in scheduling must handle timezone edge cases

### NFR-2: Performance

- NFR-2.1: Email sending batch must complete within 5 minutes
- NFR-2.2: Interstitial check must complete within 200ms

---

## Key Product Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Delivery method** | Email with app link | Creates "session" feeling; less interruptive than push |
| **Check-in timing** | Fixed (9am/7pm) | Simplicity; configurable timing deferred |
| **Skipped check-in handling** | Silent (no guilt) | Check-ins are invitations, not obligations |
| **Morning/evening check-ins** | Dormant for MVP (ADR-002) | Focus on post-session; daily check-ins added later |
| **Prompt in email** | No (link only) | Voice response requires app; keeps email simple |

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
    'morning',
    'evening'
  )),
  trigger_myth_key TEXT REFERENCES public.illusions(myth_key),
  trigger_session_id UUID REFERENCES public.conversations(id),

  -- Content
  prompt_template TEXT NOT NULL,
  personalization_context JSONB,

  -- State
  status TEXT DEFAULT 'scheduled' CHECK (status IN (
    'scheduled',
    'sent',
    'opened',
    'completed',
    'skipped',
    'expired'
  )),

  -- Auth token for magic link (24-hour validity)
  magic_link_token TEXT,

  -- Delivery tracking
  email_sent_at TIMESTAMP WITH TIME ZONE,
  opened_at TIMESTAMP WITH TIME ZONE,
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

### Scheduling Engine

```typescript
// server/utils/scheduling/check-in-scheduler.ts

interface ScheduleConfig {
  userId: string
  timezone: string
  trigger: 'session_complete' | 'program_start' | 'daily_refresh'
  sessionId?: string
  mythKey?: string
  sessionEndTime?: Date
}

export async function scheduleCheckIns(config: ScheduleConfig): Promise<CheckIn[]> {
  const { userId, timezone, trigger, sessionEndTime, mythKey } = config
  const scheduled: CheckIn[] = []

  if (trigger === 'session_complete' && sessionEndTime) {
    // Post-session check-in: 2 hours later if before 9pm
    const twoHoursLater = addHours(sessionEndTime, 2)
    const twoHoursLaterLocal = toZonedTime(twoHoursLater, timezone)

    if (getHours(twoHoursLaterLocal) < 21) {  // Before 9pm
      // Expire any pending post-session check-ins (ADR-002)
      await expirePendingPostSessionCheckIns(userId)

      scheduled.push(await createCheckIn({
        userId,
        type: 'post_session',
        scheduledFor: twoHoursLater,
        timezone,
        mythKey,
        sessionId: config.sessionId
      }))
    }
  }

  // Morning/evening check-ins (dormant for MVP per ADR-002)
  // Code exists but triggers not wired up

  return scheduled
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

### Email Delivery

```typescript
// server/utils/email/check-in-sender.ts

export async function processScheduledCheckIns() {
  const now = new Date()
  const windowStart = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const windowEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000)

  const checkIns = await supabase
    .from('check_in_schedule')
    .select('*, user:auth.users(email)')
    .eq('status', 'scheduled')
    .gte('scheduled_for', windowStart.toISOString())
    .lt('scheduled_for', windowEnd.toISOString())

  for (const checkIn of checkIns.data) {
    const token = generateSecureToken()

    await supabase
      .from('check_in_schedule')
      .update({ magic_link_token: token })
      .eq('id', checkIn.id)

    await sendCheckInEmail(checkIn, token)

    await supabase
      .from('check_in_schedule')
      .update({ status: 'sent', email_sent_at: now.toISOString() })
      .eq('id', checkIn.id)
  }
}

function getSubjectLine(type: string): string {
  switch (type) {
    case 'morning': return 'Good morning — quick check-in'
    case 'evening': return "Day's winding down — how did it go?"
    case 'post_session': return 'Quick thought from earlier...'
    default: return 'Checking in with you'
  }
}
```

### API Endpoints

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

---

## Out of Scope / Deferred

| Feature | Reason | Planned For |
|---------|--------|-------------|
| **Morning/evening daily check-ins** | Focus on post-session first (ADR-002) | Post-MVP |
| **User-configurable timing** | Adds complexity; 9am/7pm are reasonable defaults | Post-MVP |
| **Push notifications** | Web-only MVP; requires native app | Post-MVP |
| **Check-in frequency settings** | Simplicity for MVP | Post-MVP |
| **Observation debrief check-ins** | Removed from scope | Not planned |

---

## Open Questions

### Resolved

- [x] What if user doesn't respond? **Just move on, no guilt**
- [x] How to handle timezone? **Browser detection**
- [x] Push vs email? **Email for web MVP**
- [x] Prompt in email or app? **App only (link in email)**

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
| Default | "Checking in with you" |

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-28 | Initial specification created from core-program-epic.md and core-program-spec.md |
