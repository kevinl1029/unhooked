# Unhooked: Ceremony Specification

**Version:** 1.0
**Created:** 2026-01-28
**Status:** Draft
**Document Type:** Feature Specification (PRD + Technical Design)
**Related Documents:**
- `core-program-spec.md` (Program Structure)
- `moment-capture-spec.md` (Moment Capture)
- `personalization-engine-spec.md` (Personalization Engine)
- `reinforcement-sessions-spec.md` (Post-Ceremony Reinforcement)
- Architecture Decision Records: ADR-004 (Ceremony Endpoints)

---

## Table of Contents

1. [Problem Statement](#problem-statement)
2. [Goals & Success Metrics](#goals--success-metrics)
3. [Solution Summary](#solution-summary)
4. [User Experience](#user-experience)
5. [The 7-Part Ceremony Flow](#the-7-part-ceremony-flow)
6. [Post-Ceremony Artifacts](#post-ceremony-artifacts)
7. [Functional Requirements](#functional-requirements)
8. [Non-Functional Requirements](#non-functional-requirements)
9. [Key Product Decisions](#key-product-decisions)
10. [Technical Design](#technical-design)
11. [Out of Scope / Deferred](#out-of-scope--deferred)
12. [Open Questions](#open-questions)
13. [Appendix](#appendix)
14. [Changelog](#changelog)

---

## Problem Statement

### The Challenge

Completing the 15 core sessions (5 illusions × 3 layers each) is not a natural stopping point. Without a designed ending, the program would just... end. This creates several problems:

- **No threshold moment** — The user doesn't experience a clear before/after
- **Identity shift not anchored** — They're still "someone who's quitting" rather than "someone who's free"
- **No artifacts to return to** — When doubt creeps in later, they have nothing to ground them
- **Anticlimax** — The work deserves recognition and closure

### Why This Matters

Allen Carr's method culminates in the "final cigarette" moment—a ritual that transforms the last use from loss into completion. The ceremony provides this threshold crossing in a digital context, creating:

- A clear marker between "working on quitting" and "free"
- Emotional resonance that cements the identity shift
- Artifacts (journey replay, final recording) that serve as anchors for the future
- A sense of accomplishment and celebration

---

## Goals & Success Metrics

### Primary Goal

Create a threshold-crossing experience that marks the user's freedom and produces lasting artifacts they can return to.

### Success Metrics

**Leading Indicators:**
- Ceremony completion rate (target: >90% of users who reach ceremony eligibility)
- Final recording completion rate (target: >80%)
- Time spent in ceremony (target: 15-20 minutes)

**Lagging Indicators:**
- Users report emotional impact from ceremony
- Users replay journey artifact post-ceremony
- Relapse users return and listen to their final recording

### Non-Goals

- **Repeatability** — The ceremony is a one-time event (artifacts are replayable, not the ceremony itself)
- **Skippability** — Users cannot skip the ceremony and proceed to "free" state
- **Interruption support** — If interrupted, ceremony restarts fresh

---

## Solution Summary

The Final Ceremony is a 7-part voice-first conversation that marks the user's transition from "working on quitting" to "free." It:

1. Reflects their journey using their own captured moments
2. Recaps all five illusions
3. Ensures their motivation is internal
4. Guides them through their final use of nicotine (optional)
5. Captures a message to their future self
6. Celebrates their freedom

### Core Design Principles

1. **Earned, not cheesy** — This is a real accomplishment; tone should match
2. **Personalized** — Woven from their own words and moments
3. **Continuous** — No pause/resume; if interrupted, restart fresh
4. **Artifact-producing** — Creates replayable journey + final recording

---

## User Experience

### Ceremony Eligibility

The ceremony unlocks when:
- All 5 illusions are complete (all 3 layers for each)
- User's program status is `ceremony_ready`

### Pre-Ceremony Dashboard State

When ceremony is unlocked:

```
┌─────────────────────────────────────────────────────────────┐
│  You've seen through all five illusions                     │
│                                                             │
│  You're ready.                                              │
│                                                             │
│  Your final session—the ceremony—                           │
│  is available now.                                          │
│                                                             │
│  [Begin Ceremony Now]                                       │
│                                                             │
│  [I need a moment first]                                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

- **"Begin Ceremony Now"** → Pre-ceremony screen
- **"I need a moment first"** → Dashboard (ceremony remains available)

### Pre-Ceremony Screen

Before entering the session:

```
┌─────────────────────────────────────────────────────────────┐
│  YOUR FINAL SESSION                                         │
│                                                             │
│  Set aside 15 minutes.                                      │
│  Find a quiet space.                                        │
│  This is a moment worth being                               │
│  present for.                                               │
│                                                             │
│  [Begin Ceremony]                                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Ceremony Email (if sent)

Subject: **Your final session is ready**

> This is it. Your final session.
>
> During this conversation, you'll be having your last dose of nicotine—not because you're being cut off, but because there's nothing left for you there. You'll see.
>
> Have your [vape/cigarettes/pouches] nearby. You'll know when to use them.
>
> When you're ready, click below. Take your time. This is a moment worth being present for.

### During Ceremony

- Voice-first interface (same as core sessions)
- No pause/resume capability
- Word-by-word transcript with highlighted current word
- Mic button for responses
- "Type instead" fallback available

### Interruption Handling

If the user exits mid-ceremony:
- Progress is NOT saved
- Next visit shows pre-ceremony screen again
- Conversation restarts from Part 1

**Rationale:** The ceremony's emotional arc requires continuity. Resuming mid-stream would break the threshold effect.

---

## The 7-Part Ceremony Flow

### Part 1: Reflective Journey

**Purpose:** Show them how far they've come. Build emotional momentum. This section becomes a **replayable artifact**.

**Duration:** 3-4 minutes

**The AI weaves together their captured moments:**

**Opening:**
> "Before we do what we're here to do today, I want to take you somewhere. Back to where this started."

**Origin/rationalizations:**
> "When we first talked, you told me [origin story fragment]. You said things like [rationalization quote]. That's what you believed then."

**The shift:**
> "And then something started to shift. Remember when you said [insight quote]? That was the moment you saw through the first crack."

**Building evidence:**
> "You started noticing things. [Real-world observation]. [Another observation]. You were gathering your own evidence."

**Breakthroughs:**
> "And there were moments that really landed. [Emotional breakthrough quote]. That wasn't me telling you something—that was you realizing it."

**Present:**
> "That's who you were. That's who you've become. Look how far you've traveled."

**Emotional arc:** Reflective → Recognition → Building pride

**Capture:** This entire section is saved as "Your Journey"—replayable.

---

### Part 2: The Illusions Recap

**Purpose:** Crystallize what they now know. One final, punchy summary.

**Duration:** 1-2 minutes

> "Let's name what you've seen through:
>
> **The Stress Illusion** — Nicotine doesn't relieve stress. It creates the stress it pretends to solve.
>
> **The Pleasure Illusion** — There is no pleasure. Only the ending of discomfort that nicotine itself caused.
>
> **The Willpower Illusion** — This isn't hard. There's nothing to resist when there's nothing to give up.
>
> **The Focus Illusion** — Nicotine doesn't help you think. It takes your focus hostage and ransoms it back.
>
> **The Identity Illusion** — You're not 'an addict.' You were tricked by a trap that works on everyone.
>
> These aren't opinions. These are what you've *seen*. You can't unsee them."

**Emotional arc:** Clarity → Conviction → Readiness

**Note:** This recap also becomes the **Illusions Cheat Sheet** artifact.

---

### Part 3: The "Why" Check

**Purpose:** Ensure the motivation is internal. Critical for durability.

**Duration:** 1-2 minutes

> "Before we go further—I want to make sure of something.
>
> You're not doing this for your partner. Not for your kids. Not for your doctor. Not because someone told you to.
>
> You're doing this for *you*. Because *you* want to be free. Because *you* deserve to live without this thing pulling at you.
>
> Is that true?"

[User responds]

> "Good. That's the only reason that lasts. When you do this for yourself, no one can take it away from you."

**Emotional arc:** Grounding → Ownership → Self-compassion

---

### Part 4: "Are You Ready?"

**Purpose:** The threshold moment. Build anticipation, then affirm.

**Duration:** 1 minute

> "So let me ask you: Are you ready to be free?"

[User responds]

> "Of course you are. You were ready the moment you decided to do this. You've been ready. Everything since then has just been clearing away the fog so you could see it."

**Emotional arc:** Anticipation → Affirmation → Momentum

---

### Pre-Part 5: Already Quit Check

**Purpose:** Some users may have already quit before reaching the ceremony. The final dose ritual doesn't apply to them.

> "Before we continue — have you already stopped using nicotine? Some people get to this point and realize they already stopped days ago."

**If YES (already quit):**
- Skip Part 5 entirely
- Acknowledge their agency: "You didn't even need the ritual. You just... stopped. That's how it works when the desire is gone."
- Proceed directly to Part 6 (Final Recording)

**If NO (still using):**
- Proceed with Part 5 as designed
- Ensure they have their product nearby before continuing

---

### Part 5: The Final Dose Ritual

**Purpose:** Transform the last use from loss into completion. This is the Allen Carr approach—the final cigarette isn't a sad goodbye, it's a triumphant finale.

**Duration:** 3-5 minutes

**The instruction:**
> "Here's what I want you to do.
>
> Take out your [vape/cigarettes/pouches]. This is the last time you'll use nicotine. Not because you can't—because you don't need to. There's nothing there for you anymore.
>
> I want you to use it now. One last time. But I want you to *pay attention*.
>
> Notice what it actually does. Notice how it feels. Notice the absence of everything you used to believe was there.
>
> Go ahead. I'll be here."

[User takes final dose]

**The debrief:**
> "How was it?"

[User responds—likely some version of "nothing" or "empty" or "weird"]

> "That's the truth of it. That's what it always was."

**The disposal:**
> "Now—I want you to get rid of it. All of it. The [vape/cigarettes/pouches], the chargers, the lighters, everything. Throw it away. Right now. You won't be needing any of it.
>
> Let me know when it's done."

[User confirms]

> "It's done. You're free."

**Emotional arc:** Ritual focus → Observant detachment → Completion → Release → FREEDOM

---

### Part 6: The Final Recording

**Purpose:** Create an anchor they can return to. Their voice, their truth, their commitment.

**Duration:** 2-3 minutes

> "I want you to record something. A message from who you are right now—free—to whoever you might be in the future if doubt ever creeps in.
>
> What do you want to remember? What do you want to tell yourself? What's true right now that you never want to forget?
>
> Take your time. Record when you're ready."

**UI for recording:**
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  Record a message to your                                   │
│  future self                                                │
│                                                             │
│  What do you want to remember?                              │
│                                                             │
│         ┌───────────────┐                                   │
│         │               │                                   │
│         │    🎤         │                                   │
│         │               │                                   │
│         └───────────────┘                                   │
│      Tap when you're ready                                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

After recording: "Keep this recording" or "Try again" options.

[User records]

> "That's yours now. If you ever need it, it'll be here."

**Emotional arc:** Grounding the moment → Creating an artifact → Future-proofing

**Storage:** The final recording is saved to Supabase Storage and linked from `user_progress.final_recording_path`.

---

### Part 7: Celebration & Close

**Purpose:** JOY. They did it. This is momentous.

**Duration:** 1-2 minutes

> "You did it.
>
> You're not 'trying to quit.' You're not 'fighting cravings.' You're not white-knuckling through anything.
>
> You're free. It's done.
>
> How does that feel?"

[User responds]

> "Hold onto that. That feeling is real. That feeling is *yours*.
>
> Welcome to the rest of your life."

**Emotional arc:** Celebration → Joy → Optimism → Completion

---

### Emotional Arc Summary

| Part | Starting Emotion | Ending Emotion |
|------|------------------|----------------|
| 1. Reflective Journey | Curious, open | Proud, moved |
| 2. Illusions Recap | Attentive | Certain, clear |
| 3. "Why" Check | Grounded | Self-compassionate, owned |
| 4. "Are You Ready?" | Anticipatory | Affirmed, momentum |
| 5. Final Dose Ritual | Focused, present | Released, FREE |
| 6. Final Recording | Reflective | Anchored, future-proofed |
| 7. Celebration | Joyful | Expansive, optimistic |

---

## Post-Ceremony Artifacts

### 1. Journey Artifact ("Your Journey")

**What:** A replayable narrative of the user's transformation with their captured moments woven in.

**Content source:** Part 1 of ceremony (Reflective Journey)

**Implementation:**
- AI-narrated segments stored as TTS audio files
- User voice clips stored separately
- Playlist structure returned with segment order, transcripts, durations
- Client-side sequential playback with synced transcript display

**Location in app:** Prominent placement on post-ceremony dashboard

### 2. Illusions Cheat Sheet

**What:** Quick reference of all 5 illusions with the truth + their own insight quotes.

**Content source:** Part 2 of ceremony (Illusions Recap) + captured insights

**Format:** Scrollable cards, one per illusion:
- **The Illusion:** What they used to believe
- **The Truth:** The reframe
- **Your Insight:** Their own quote (with optional audio playback)

**Location in app:** Separate page, linked from dashboard

### 3. Final Recording

**What:** The user's voice message to their future self.

**Content source:** Part 6 of ceremony

**Location in app:**
- Within "Your Journey" as the capstone
- Standalone quick-access from dashboard ("Your Message")

### Post-Ceremony Dashboard State

```
┌─────────────────────────────────────────────────────────────┐
│  YOU'RE FREE ✓                                              │
│  Completed [date]                                           │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ YOUR JOURNEY              ▶                         │   │
│  │ Relive your transformation                          │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ YOUR MESSAGE              ▶                         │   │
│  │ To your future self                                 │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ILLUSIONS CHEAT SHEET     →                         │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Need a boost?                                              │
│  [Talk to me]                                               │
│                                                             │
│  ────────────────────────────────────────────────────────   │
│                                                             │
│  THE STRESS ILLUSION     [Reinforce]                        │
│  THE PLEASURE ILLUSION   [Reinforce]                        │
│  THE WILLPOWER ILLUSION  [Reinforce]                        │
│  THE FOCUS ILLUSION      [Reinforce]                        │
│  THE IDENTITY ILLUSION   [Reinforce]                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Functional Requirements

### FR-1: Ceremony Eligibility

**Description:** Determine when ceremony is available.

**Requirements:**
- FR-1.1: Ceremony unlocks when all 5 illusions are complete (status = 'completed')
- FR-1.2: User progress status transitions to `ceremony_ready`
- FR-1.3: Dashboard shows ceremony CTA when eligible

### FR-2: Ceremony Flow

**Description:** Guide user through 7-part ceremony.

**Requirements:**
- FR-2.1: Ceremony is a single continuous conversation (no pause/resume)
- FR-2.2: If user exits mid-ceremony, restart from beginning on return
- FR-2.3: Detect "already quit" response and skip final dose ritual (Part 5)
- FR-2.4: Use captured moments for personalization in Part 1

### FR-3: Final Recording Capture

**Description:** Record user's message to future self.

**Requirements:**
- FR-3.1: Present dedicated recording UI during Part 6
- FR-3.2: Allow "Try again" if user wants to re-record
- FR-3.3: Store audio file in Supabase Storage
- FR-3.4: Link recording path to `user_progress.final_recording_path`

### FR-4: Ceremony Completion

**Description:** Mark ceremony complete and generate artifacts.

**Requirements:**
- FR-4.1: Update user progress status to `completed`
- FR-4.2: Record `ceremony_completed_at` timestamp
- FR-4.3: Generate journey artifact playlist
- FR-4.4: Generate illusions cheat sheet content

### FR-5: Artifact Access

**Description:** Provide access to post-ceremony artifacts.

**Requirements:**
- FR-5.1: Journey artifact playable from dashboard
- FR-5.2: Final recording accessible standalone and within journey
- FR-5.3: Illusions cheat sheet accessible from dashboard

---

## Non-Functional Requirements

### NFR-1: Performance

- NFR-1.1: Journey artifact playlist generation completes within 5 seconds
- NFR-1.2: Audio playback starts within 1 second of user action

### NFR-2: Reliability

- NFR-2.1: Final recording upload must succeed before ceremony marked complete
- NFR-2.2: Failed recording upload shows retry option

### NFR-3: Continuity

- NFR-3.1: Ceremony cannot be paused/resumed
- NFR-3.2: Incomplete ceremony progress is not persisted

---

## Key Product Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Pause/resume** | Not supported | Emotional arc requires continuity; interruption breaks threshold effect |
| **Already quit handling** | Skip Part 5 | Some users naturally stop before reaching ceremony |
| **Journey artifact format** | Client-side sequential playback | Simpler than server-side stitching; enables transcript sync |
| **Final recording re-record** | Allowed | Low-stakes chance to get it right |
| **Ceremony repeatability** | One-time event | Threshold crossing should be singular; artifacts are replayable |

---

## Technical Design

### Database Fields

The ceremony uses existing tables with additional fields:

#### `user_progress` Additions

```sql
-- Ceremony-specific fields
program_status TEXT CHECK (program_status IN (
  'not_started',
  'in_progress',
  'ceremony_ready',  -- All illusions complete
  'completed'        -- Ceremony complete
));

ceremony_completed_at TIMESTAMP WITH TIME ZONE;
final_recording_path TEXT;  -- Supabase Storage path
journey_artifact_generated BOOLEAN DEFAULT FALSE;
```

### Journey Artifact Structure

```typescript
interface JourneyArtifact {
  segments: JourneySegment[]
  totalDuration: number
  generatedAt: string
}

interface JourneySegment {
  type: 'narration' | 'user_moment'
  audioPath: string  // Supabase Storage path
  transcript: string
  duration: number  // milliseconds
  momentId?: string  // If user_moment, reference to captured_moments.id
}
```

### LLM Task: `llm.ceremony.journey`

**Purpose:** Generate personalized narrative for Part 1 using captured moments.

**Input:**
```typescript
{
  moments: CapturedMoment[]  // All user's captured moments
  userProfile: UserStory     // Name, products used, etc.
  mythsCompleted: string[]   // List of completed illusions
}
```

**Output:**
```typescript
{
  narrative: string  // Full narration text
  momentPlacements: {
    momentId: string
    insertAfterText: string
  }[]
}
```

### API Endpoints (ADR-004)

#### `GET /api/user/progress`

Returns ceremony status via `program_status` field.

```typescript
// Response
{
  program_status: 'not_started' | 'in_progress' | 'ceremony_ready' | 'completed'
  ceremony_completed_at?: string
  final_recording_path?: string
  // ... other progress fields
}
```

#### `POST /api/ceremony/start`

Initialize ceremony conversation.

```typescript
// Response
{
  conversation_id: string
  initial_message: string  // Part 1 opening
}
```

#### `POST /api/ceremony/complete`

Mark ceremony complete and generate artifacts.

```typescript
// Request
{
  conversation_id: string
  final_recording_path: string
}

// Response
{
  status: 'completed'
  journey_artifact: JourneyArtifact
}
```

#### `GET /api/ceremony/journey`

Retrieve journey artifact for playback.

```typescript
// Response
{
  journey: JourneyArtifact
}
```

#### `GET /api/ceremony/final-recording`

Retrieve final recording for playback.

```typescript
// Response
{
  audioPath: string
  transcript?: string
  recordedAt: string
}
```

### Final Recording Storage

```typescript
// Storage path pattern
`audio/${userId}/final-recording.webm`

// Upload flow
1. Client records audio via MediaRecorder API
2. Client uploads to Supabase Storage
3. Client sends path to ceremony/complete endpoint
4. Server validates and links to user_progress
```

---

## Out of Scope / Deferred

| Feature | Reason | Planned For |
|---------|--------|-------------|
| **Downloadable journey artifact** | Server-side stitching complexity | Post-MVP |
| **Ceremony replay** | One-time threshold crossing | Not planned |
| **Skip ceremony option** | Undermines threshold effect | Not planned |
| **Custom ceremony timing** | Fixed structure for MVP | Not planned |
| **Ceremony video recording** | Audio-only for MVP | Future consideration |

---

## Open Questions

### Resolved

- [x] What if user already quit? **Ask at ceremony start, skip Part 5 if yes**
- [x] Pause/resume? **No, restart fresh if interrupted**
- [x] Journey artifact format? **Client-side sequential playback**
- [x] Where does final recording live? **Both journey capstone + standalone access**

### Still Open

None currently.

---

## Appendix

### A. Ceremony Script Reference

See [The 7-Part Ceremony Flow](#the-7-part-ceremony-flow) for complete script with prompts and emotional arcs.

### B. User Product Reference

The ceremony should reference the user's specific nicotine product. Options:
- "vape"
- "cigarettes"
- "pouches"
- "cigars"
- "nicotine product" (fallback)

This is stored in `user_intake.products_used` and passed to ceremony prompts.

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-28 | Initial specification created from core-program-epic.md and core-program-spec.md |
