# Unhooked: Ceremony Specification

**Version:** 2.3
**Created:** 2026-01-28
**Last Updated:** 2026-02-08
**Status:** Implemented
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
4. [Ceremony Personas](#ceremony-personas)
5. [User Experience](#user-experience)
6. [The 7-Part Ceremony Flow](#the-7-part-ceremony-flow)
7. [Post-Ceremony Artifacts](#post-ceremony-artifacts)
8. [Interaction Design](#interaction-design)
9. [Edge Cases & Error States](#edge-cases--error-states)
10. [Accessibility](#accessibility)
11. [Functional Requirements](#functional-requirements)
12. [Non-Functional Requirements](#non-functional-requirements)
13. [Key Product Decisions](#key-product-decisions)
14. [Technical Design](#technical-design)
15. [Out of Scope / Deferred](#out-of-scope--deferred)
16. [Open Questions](#open-questions)
17. [Appendix](#appendix)
18. [Changelog](#changelog)

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

- **Repeatability (for now)** — The ceremony is a one-time event for MVP. Artifacts are replayable, not the ceremony itself. A future "renewal ceremony" for relapse cases is deferred — see Open Questions.
- **Skippability** — Users cannot skip the ceremony and proceed to "free" state
- **Interruption support** — If interrupted, ceremony restarts fresh
- **Shareable artifacts** — No external/shareable "graduation" moment for MVP. Deferred to post-MVP based on user feedback.

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
5. **Guided but flexible** — The 7 parts define the emotional arc, but the AI follows the user's energy within each part. Think movie structure, not assembly line. If a user wants to linger on something in Part 3, let them. The AI steers back when the beat is complete.

---

<!-- UX-REFINED: Added lightweight ceremony-context personas -->
## Ceremony Personas

Two distinct user types experience the ceremony differently. These are lightweight, ceremony-specific personas — not full product personas.

### The Early Quitter

**Who:** A user who stopped using nicotine partway through the program — often without a conscious decision. They completed all 15 sessions but realized days or weeks ago that they simply... stopped.

**Emotional state at ceremony entry:** Confident but may feel like the ceremony is "for other people." Might wonder if they need this at all.

**Ceremony path:** Pre-Part 5 → Part 5A (Symbolic Disposal Ritual). The AI celebrates that the desire evaporated naturally — this is the strongest proof the method worked.

### The Ritual Completer

**Who:** A user who has continued using nicotine throughout the program and is ready for the final dose to be their last. They've completed all 15 sessions and understand the illusions intellectually, but haven't yet experienced the final physical separation.

**Emotional state at ceremony entry:** A mix of readiness and nervousness. Wants this to work. May feel pressure for the moment to "feel right."

**Ceremony path:** Pre-Part 5 → Part 5B (Final Dose Ritual). The AI guides them through a mindful final dose, revealing the emptiness of the experience firsthand.

**Note:** Both personas pass through Parts 1-4 identically. The Part 4 "not ready" exit serves as the filter for users who completed sessions but aren't emotionally bought in.

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
└─────────────────────────────────────────────────────────────┘
```

- **"Begin Ceremony Now"** → Pre-ceremony screen
- Single primary CTA only. No secondary "I need a moment" option — the pre-ceremony screen already serves as the buffer for users who want to prepare.

### Pre-Ceremony Screen

Before entering the session:

```
┌─────────────────────────────────────────────────────────────┐
│  YOUR FINAL SESSION                                         │
│                                                             │
│  Set aside 15 minutes.                                      │
│  Find a quiet space.                                        │
│  If you still have your [vape/cigarettes/pouches]           │
│  around, have them nearby.                                  │
│                                                             │
│  This is a moment worth being                               │
│  present for.                                               │
│                                                             │
│  [Begin Ceremony]                                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Note:** The product mention covers both paths — users who still use will have product nearby for Part 5; users who already quit and disposed simply won't have anything, which is fine. No need to ask quit status here; the AI detects this at Pre-Part 5.

<!-- UX-REFINED: Added product name fallback behavior -->
**Product name handling:** If the user's specific product type is known from intake (`user_intake.products_used`), use it (e.g., "vape," "cigarettes"). If unknown or generic, fall back to "nicotine products" naturally. No error state needed.

### Ceremony Email

**Trigger:** If the user reaches `ceremony_ready` status but has not started the ceremony within 24 hours, send this email as a gentle nudge. Delivered via existing Resend infrastructure. **Single email only** — no follow-up cadence. The ceremony should feel like an invitation, not a nag.

<!-- UX-REFINED: Added email send-time status check -->
**Send-time check:** Before sending, verify the user hasn't already started or completed the ceremony. If status has changed from `ceremony_ready`, do not send.

Subject: **Your final session is ready**

<!-- UX-REFINED: Added product type personalization, noted name personalization as future -->
> This is it. Your final session.
>
> During this conversation, you'll be having your last dose of nicotine—not because you're being cut off, but because there's nothing left for you there. You'll see.
>
> Have your [vape/cigarettes/pouches] nearby. You'll know when to use them.
>
> When you're ready, click below. Take your time. This is a moment worth being present for.

**Personalization:** Email uses the user's specific product type when known. Name personalization is deferred until the intake form captures user names — when that ships, backfill ceremony email templates.

### Final Core Session Tease

When the user completes Identity Layer 3 (the last core session), two things happen:

**1. AI Narrative Tease:**
The AI includes a natural reference to the ceremony in its closing dialogue:
> "There's one more conversation ahead. Your final session. It'll be waiting for you when you're ready."

This feels like a narrative continuation, not a UI prompt. The tease builds anticipation without pushing.

**2. Modified Session-Complete Card:**
The session-complete card for Identity Layer 3 gets ceremony-specific copy:

```
┌─────────────────────────────────────────────────────────────┐
│  Session Complete ✓                                         │
│                                                             │
│  All five illusions dismantled.                             │
│  Your final ceremony is ready.                              │
│                                                             │
│  [Return to Dashboard]                                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

Only the "Return to Dashboard" CTA is shown — no "Begin Ceremony" shortcut. The user should arrive at the ceremony through the dashboard card when they're ready, not be rushed from the final session.

### During Ceremony

<!-- UX-REFINED: Added immersive mode and ceremony UI details -->
- Voice-first interface (same conversation UI as core sessions — no special visual treatment)
- **Immersive mode:** App header and navigation are hidden during the ceremony. The only way to exit is closing the browser/app.
- No pause/resume capability
- Word-by-word transcript with highlighted current word
- Mic button for responses
- "Type instead" fallback available (including for Part 6 recording — see [Interaction Design](#interaction-design))
- AI wait/processing states use same indicators as core sessions (animated dots)

### Interruption Handling

If the user exits mid-ceremony:
- Progress is NOT saved
- Next visit shows the **dashboard with the ceremony CTA** (same as before they started — no acknowledgment of prior attempt)
- Tapping CTA leads to pre-ceremony screen, then ceremony restarts from Part 1

**Rationale:** The ceremony's emotional arc requires continuity. Resuming mid-stream would break the threshold effect. Clean slate avoids making the user feel like they "failed" a previous attempt.

### Post-Ceremony URL Access

<!-- UX-REFINED: Added post-completion redirect behavior -->
If a user navigates to the ceremony URL after completing the ceremony (e.g., via bookmark or back button), redirect to the post-ceremony dashboard. No error message needed.

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

**Note:** This recap is intentionally a clean, punchy summary — no personalized moments woven in. Part 1 already handled the personal stuff. Part 2 is about universal truth and conviction. The user's personal key insights appear in the **Illusions Cheat Sheet** artifact (generated separately from `user_story.{illusionKey}_key_insight_id`), not spoken aloud here.

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

**If user confirms internal motivation:**
> "Good. That's the only reason that lasts. When you do this for yourself, no one can take it away from you."

**If user expresses external motivation** (e.g., "for my kids," "my doctor told me to"):
The AI validates the external motivation but gently redirects to self. The user must find the internal thread for the freedom to last:

> "Your kids are a beautiful reason to care. But let me ask you something — underneath that, do *you* want to be free? Because your kids can't quit for you. Nobody can. This works when it's *yours*."
>
> "For this to last — truly last — it has to come from you. Not because someone asked you to. Not because you feel you should. Because you want to live without this thing pulling at you. Is that true for you?"

[User responds — guided to affirm internal motivation]

> "That's the foundation. Hold onto that."

**Emotional arc:** Grounding → Ownership → Self-compassion

---

### Part 4: "Are You Ready?"

**Purpose:** The threshold moment. Build anticipation, then affirm.

**Duration:** 1 minute

> "So let me ask you: Are you ready to be free?"

[User responds]

> "Of course you are. You were ready the moment you decided to do this. You've been ready. Everything since then has just been clearing away the fog so you could see it."

**If user says "No" or expresses hesitation:**
The AI takes this seriously — no bulldozing. It pauses and explores:

> "That's okay. Tell me what's holding you back."

[User responds — AI explores the hesitation]

- **If the hesitation resolves:** AI affirms and continues: "There it is. You *are* ready. Let's keep going."
- **If it doesn't resolve:** AI offers a graceful exit: "Maybe today isn't the day. That's okay — the ceremony will be here when you are. There's no rush."
  - User returns to dashboard
  - Ceremony restarts fresh next time (per interruption handling rules)

**Emotional arc:** Anticipation → Affirmation → Momentum

---

### Pre-Part 5: Already Quit Check

**Purpose:** Some users may have already quit before reaching the ceremony. The experience of Part 5 differs based on their current status, but both paths include a symbolic ritual.

> "Before we continue — have you already stopped using nicotine? Some people get to this point and realize they already stopped days ago."

**If YES (already quit):** → Part 5A (Symbolic Disposal Ritual)
**If NO (still using):** → Part 5B (Final Dose Ritual)

---

### Part 5A: Symbolic Disposal Ritual (Already-Quit Path)

**Purpose:** Even though they've already quit, this is still the most symbolic moment in the ceremony. The fact that they quit without needing the ritual is the strongest evidence the method worked — the desire evaporated. That's worth celebrating, not fast-forwarding past.

**Duration:** 2-3 minutes

**Moment contrast — surface early rationalization:**
> "I want you to remember something. Early on, you told me: '[early rationalization quote — e.g., it's the only thing that calms me down].' You believed that. And yet here you are — you just... stopped. No willpower battle. No white-knuckling. You stopped because there was nothing left to hold onto."

**The acknowledgment:**
> "You didn't even need this moment to quit. The desire was just... gone. That's how it works when you truly see through the illusion."

**Symbolic disposal — AI asks about remaining product:**
> "Do you still have any [vape/cigarettes/pouches] around? Any chargers, lighters, anything?"

**If YES (still has product):**
> "Get rid of it. All of it. Right now. You won't be needing any of it. Let me know when it's done."

<!-- UX-REFINED: Added disposal wait behavior -->
**Disposal wait:** The mic stays ready with no timeout. The user may take 30 seconds to several minutes to physically dispose of their products. The AI waits patiently. If the user speaks during this time, the AI responds naturally.

[User confirms]

> "It's done. You're free."

**If NO (already disposed or nothing left):**
The ritual becomes a symbolic mental gesture:

> "Then let's make this official another way. Close your eyes for a moment. Picture the last [vape/cigarette/pouch] you ever used. See it clearly. Now let it go. It has nothing left to offer you."

[Pause]

> "It's done. You're free."

**Emotional arc:** Recognition → Pride → Symbolic release → FREEDOM

---

### Part 5B: The Final Dose Ritual (Still-Using Path)

**Purpose:** Transform the last use from loss into completion. This is the Allen Carr approach—the final cigarette isn't a sad goodbye, it's a triumphant finale.

**Duration:** 3-5 minutes

**Moment contrast — surface early rationalization:**
> "Before you do this, I want you to remember something. When we first started, you told me: '[early rationalization quote — e.g., it's the only thing that calms me down].' Hold that in your mind. Now let's see if it's true."

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

**The debrief (with contrast):**
> "How was it?"

[User responds—likely some version of "nothing" or "empty" or "weird"]

> "You used to say '[rationalization quote].' And now you felt it yourself — there's nothing there. That's the truth of it. That's what it always was."

**The disposal:**
> "Now—I want you to get rid of it. All of it. The [vape/cigarettes/pouches], the chargers, the lighters, everything. Throw it away. Right now. You won't be needing any of it.
>
> Let me know when it's done."

<!-- UX-REFINED: Added disposal wait behavior -->
**Disposal wait:** Same as Part 5A — open mic, no timeout. User takes as long as they need.

[User confirms]

> "It's done. You're free."

**Emotional arc:** Contrast setup → Ritual focus → Observant detachment → Completion → Release → FREEDOM

---

**Moment Source for Part 5 Contrast:**
The rationalization quote used in Part 5A/5B is sourced from the user's captured moments of type `rationalization`. The personalization engine selects the most relevant rationalization related to the illusion the user engaged with most (typically stress or pleasure). If no rationalization moments were captured, the AI uses a general framing without a direct quote.

---

### Part 6: The Final Recording

**Purpose:** Create an anchor they can return to. Their voice, their truth, their commitment.

**Duration:** 2-3 minutes

> "I want you to record something. A message from who you are right now—free—to whoever you might be in the future if doubt ever creeps in.
>
> Tell your future self what you've learned. What do you want to remember? What's true right now that you never want to forget?
>
> Take your time. Record when you're ready."

<!-- UX-REFINED: Added inline recording transition and recording states -->
**Recording UI transition:** The AI's prompt fades and the recording UI slides up inline within the same conversation screen. No page navigation or modal overlay. When complete, the recording UI slides away and the conversation resumes with Part 7.

**Recording UI** (reuses existing ceremony recording implementation):
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
│      ┈ or type your message ┈                               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Recording states** (existing implementation):
1. **Idle:** Mic button with "Tap when you're ready"
2. **Recording:** Pulsing mic button with elapsed time counter
3. **Preview:** Playback button + "Keep this recording" / "Try again" options
4. **Saving:** Upload indicator
5. **Saved:** Confirmation, conversation resumes

<!-- UX-REFINED: Added text fallback for Part 6 -->
**Text fallback:** If the user prefers to type (or if mic is unavailable), they can write a text message to their future self instead. The text is stored in the `content_text` field of the `ceremony_artifacts` table (same row, `audio_path` left null). The artifact is still meaningful — "Your Message" on the dashboard displays the text instead of an audio player.

After recording/writing:

> "That's yours now. If you ever need it, it'll be here."

**Emotional arc:** Grounding the moment → Creating an artifact → Future-proofing

**Storage:** Audio recordings saved to Supabase Storage at `ceremony-artifacts/{user_id}/final-recording.webm`. Text messages stored in `ceremony_artifacts.content_text`. Both linked via the `ceremony_artifacts` table with `artifact_type: 'final_recording'`.

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

<!-- UX-REFINED: Added post-ceremony auto-transition -->
**Post-ceremony transition:** After the final AI message, wait 5 seconds, then smoothly fade to the post-ceremony dashboard. No button, no intermediate screen. The dashboard state change IS the transition. If `prefers-reduced-motion` is set, skip the fade and transition instantly.

**Emotional arc:** Celebration → Joy → Optimism → Completion

---

### Emotional Arc Summary

| Part | Starting Emotion | Ending Emotion |
|------|------------------|----------------|
| 1. Reflective Journey | Curious, open | Proud, moved |
| 2. Illusions Recap | Attentive | Certain, clear |
| 3. "Why" Check | Grounded | Self-compassionate, owned |
| 4. "Are You Ready?" | Anticipatory | Affirmed, momentum |
| 5A. Symbolic Disposal (already quit) | Recognized, proud | Released, FREE |
| 5B. Final Dose Ritual (still using) | Focused, present | Released, FREE |
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

<!-- UX-REFINED: Added cheat sheet layout and missing insight handling -->
**Format:** Vertical scroll list — all 5 illusion cards stacked on a single page. Each card contains:
- **The Illusion:** What they used to believe
- **The Truth:** The reframe
- **Your Insight:** Their own quote (with optional audio playback)

**Missing insights:** All 5 illusions always display with Illusion + Truth. The "Your Insight" section only appears for illusions where the user has captured insight moments. No empty state or placeholder needed — cards without insights are simply shorter.

**Location in app:** Separate page, linked from dashboard (reuses existing implementation)

### 3. Final Recording / Message

<!-- UX-REFINED: Updated to reflect text fallback option -->
**What:** The user's message to their future self — either a voice recording or a typed text message.

**Content source:** Part 6 of ceremony

**Location in app:**
- Within "Your Journey" as the capstone
- Standalone quick-access from dashboard ("Your Message")
- Dashboard card shows audio player if voice, or text display if typed

### Post-Ceremony Dashboard State

<!-- UX-REFINED: Added dashboard behavior notes -->
The post-ceremony dashboard **fully replaces** the pre-ceremony progress dashboard. The old illusion progress view is no longer shown — the user is done. The dashboard is **static** and does not evolve over time (reinforcement session completion may show badges, but the layout stays the same).

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

**Visual hierarchy:** Artifacts (Journey, Message, Cheat Sheet) are prominent cards at top. Reinforcement sessions are smaller items below the divider. The existing grouping communicates priority.

---

<!-- UX-REFINED: Added Interaction Design section -->
## Interaction Design

### Disposal Wait (Parts 5A/5B)

When the AI says "Let me know when it's done," the microphone stays ready with **no timeout**. The user may take 30 seconds to several minutes to physically dispose of their nicotine products. The AI waits patiently — no prompt, no timer. If the user speaks during the wait, the AI responds naturally.

### Recording Transition (Part 6)

The recording UI appears **inline** within the conversation view — no page navigation, no modal overlay. The AI's prompt fades and the recording interface slides up. After the user saves their recording (or types their message), the recording UI slides away and the conversation resumes for Part 7.

### Post-Ceremony Auto-Transition

After the final AI message in Part 7, wait **5 seconds**, then smoothly fade to the post-ceremony dashboard. No button needed. If `prefers-reduced-motion` is set, transition instantly without animation.

### Mic Permission Loss During Ceremony

If microphone permission is revoked or becomes unavailable mid-ceremony, seamlessly fall back to text input mode. The ceremony continues via typing. This follows the existing "Type instead" pattern — no error modal or ceremony restart needed.

**Note:** The existing voice session system (`SessionView.vue`) should be audited for consistent mic-permission-lost handling across core sessions and ceremony. This is not ceremony-specific but surfaced during ceremony UX review.

### Journey Artifact Playback

The Journey Artifact player reuses the existing `JourneyPlayer.vue` implementation:
- Progress bar with segment indicator (current/total)
- Word-by-word transcript display with highlighting
- Play/pause toggle
- Preloads all audio segments on mount for gapless playback
- Text-only fallback when audio is unavailable

Accessible via the `/journey` standalone page or embedded within the ceremony flow (Part 4 replayable artifact).

---

<!-- UX-REFINED: Added Edge Cases & Error States section -->
## Edge Cases & Error States

### AI/LLM Service Failure Mid-Ceremony

If the AI service goes down during the ceremony (e.g., API timeout, provider outage):
- Show a gentle error message: "Something went wrong. Your ceremony will be ready when you come back."
- Return user to dashboard
- Ceremony restarts fresh on next attempt (consistent with no-pause rule)
- Do NOT save partial conversation state

### Final Recording Upload Failure

If the recording upload fails:
1. Show retry option (up to 3 attempts)
2. After 3 failed retries, offer: "We're having trouble saving your recording. You can try again, or continue — we'll try to save it in the background."
3. **Ceremony can complete without a successful recording upload.** Don't block the emotional moment over a technical failure.
4. Background retry should be attempted when connectivity is restored.

**Note:** This updates NFR-2.1, which previously required successful upload before completion. The ceremony's emotional arc takes priority.

### Post-Disposal Crash Recovery

If the browser/app crashes after the user has disposed of their products (Part 5) but before ceremony completion:
- Ceremony restarts from Part 1 on next visit (per standard interruption handling)
- When the user reaches Part 5 again, the AI asks if they've already quit — they'll say yes and go through Part 5A (Symbolic Disposal)
- This works naturally with no special handling needed

### Zero Captured Moments

Reaching ceremony eligibility with zero captured moments should be impossible (completing illusions generates moments). However, if it occurs:
- Part 1 (Journey): AI generates a generic narrative about the user's program completion without personal quotes
- Part 5 (Contrast): AI uses general framing without a direct rationalization quote (existing fallback behavior)
- Log the data gap as an issue for investigation

### Browser/Network Issues

- **Temporary network loss:** If network drops briefly during AI response, the existing conversation system should handle reconnection. No ceremony-specific handling needed.
- **Prolonged network loss:** Same as AI service failure — show error, return to dashboard, restart fresh.

<!-- REQ-REFINED: Added device storage and TTS failure edge cases -->
### Device Storage Full During Recording

If the user's device runs out of storage during Part 6 recording, the MediaRecorder API will throw an error. Catch this error and prompt the user to use the text fallback instead ("Would you like to type your message instead?"). The ceremony continues without interruption.

### TTS Failure During Ceremony

If the text-to-speech service fails mid-ceremony (e.g., provider outage, rate limit), the AI's response is displayed as text in the transcript view. The ceremony continues in text-only mode. No error message shown to the user — the fallback is seamless.

---

<!-- UX-REFINED: Added Accessibility section -->
## Accessibility

### Voice-First Accessibility

The ceremony is voice-first but fully accessible via text:
- **Deaf/hard-of-hearing users:** AI responses are visible via the word-by-word transcript display. Journey Artifact includes synchronized transcript. This is sufficient for MVP.
- **Speech difficulties:** "Type instead" fallback available throughout, including Part 6 (text message to future self).
- **Mic unavailability:** Seamless fallback to text input if mic permission denied or revoked.

### Motion & Animation

- All ceremony animations (fade-in-up, auto-transition fade) must respect `prefers-reduced-motion`
- When reduced motion is preferred: disable fade animations, use instant transitions, skip the 5-second auto-transition fade (go directly to dashboard)
- Implementation: CSS `@media (prefers-reduced-motion: reduce)` media query

### Color & Visual

- Recording mic button uses multi-signal state indicators (pulse animation + color change + label text), not color alone — sufficient for color-blind users
- Existing UI patterns already meet this requirement (see `MicButton.vue`)

### Screen Reader Support

Key ARIA requirements for ceremony screens:
- **Post-ceremony dashboard:** Landmark roles for artifact sections, descriptive ARIA labels for playback controls
- **Journey player:** Play/pause button labeled with state ("Play your journey" / "Pause"), progress announced
- **Recording UI:** Record button state announced ("Ready to record" / "Recording" / "Recording saved")
- **Cheat sheet:** Each illusion card is a semantic section with heading

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
- FR-2.2: If user exits mid-ceremony, restart from beginning on return. No state change — `program_status` stays `ceremony_ready`. Conversation is abandoned (no save of partial progress).
- FR-2.3: Detect "already quit" response at Pre-Part 5 and route to Part 5A (symbolic disposal) vs Part 5B (final dose)
- FR-2.4: Use captured moments for personalization in Part 1 and for rationalization contrast in Part 5. Moment selection logic is defined in `personalization-engine-spec.md`.
- FR-2.5: Handle external motivation in Part 3 by gently redirecting to internal motivation
- FR-2.6: Handle "not ready" response in Part 4 by exploring hesitation and offering graceful exit if unresolved. Graceful exit returns user to dashboard with no state change (`program_status` stays `ceremony_ready`). No repeated-restart limit — the ceremony is always available.
<!-- REQ-REFINED: Added Part 4 exit mechanics and conversation infrastructure -->
- FR-2.7: Ceremony conversation uses the existing `/api/chat` endpoint with `sessionType='ceremony'`. Ceremony-specific system prompts define each part's objective and exit criteria. The LLM decides when to advance between parts based on conversational cues (no server-side state machine).
- FR-2.8: Concurrent ceremony sessions (e.g., multiple browser tabs) are handled by returning the existing active ceremony conversation when `/api/ceremony/prepare` is called during an active session, rather than creating a new one.

### FR-3: Final Recording Capture

**Description:** Record user's message to future self.

**Requirements:**
- FR-3.1: Present dedicated recording UI during Part 6 (inline transition, not modal)
- FR-3.2: Allow "Try again" if user wants to re-record. No limit on re-recording attempts — only the latest recording is stored (overwrite).
- FR-3.3: Store audio file in Supabase Storage
- FR-3.4: Link recording to `ceremony_artifacts` table with `artifact_type: 'final_recording'`
- FR-3.5: Support text fallback — if user types instead of recording, store in `content_text` field with `audio_path` null
- FR-3.6: Allow ceremony completion even if recording upload fails after retries (background retry)
<!-- REQ-REFINED: Added recording constraints and client-side retry -->
- FR-3.7: Recording constraints: maximum 5 minutes duration, maximum 10MB file size. Enforce on client side; validate on server side.
- FR-3.8: Failed recording uploads are queued for background retry via client-side storage (IndexedDB/localStorage). On app reopen or network restore, the client retries upload automatically.

### FR-4: Ceremony Completion

**Description:** Mark ceremony complete and generate artifacts.

**Requirements:**
- FR-4.1: Update user progress status to `completed`
- FR-4.2: Record `ceremony_completed_at` timestamp
- FR-4.3: Begin journey artifact generation in background during Parts 6-7 (not after completion)
- FR-4.4: Generate illusions cheat sheet content
- FR-4.5: Auto-transition to post-ceremony dashboard after 5-second delay following Part 7
- FR-4.6: Redirect ceremony URL to dashboard if ceremony already completed
- FR-4.7: Post-ceremony dashboard fully replaces pre-ceremony progress view
<!-- REQ-REFINED: Added artifact loading state and completion resilience -->
- FR-4.8: If journey artifact is not ready when post-ceremony dashboard loads, show a skeleton card with "Preparing your journey..." text. Poll for completion status until ready.
- FR-4.9: Once `ceremony/complete` succeeds, the user is permanently in `completed` state. If the post-ceremony auto-transition fails (e.g., client-side error), a page refresh takes the user to the post-ceremony dashboard. The server-side completion is the source of truth.

### FR-5: Artifact Access

**Description:** Provide access to post-ceremony artifacts.

**Requirements:**
- FR-5.1: Journey artifact playable from dashboard
- FR-5.2: Final recording/message accessible standalone and within journey
- FR-5.3: Illusions cheat sheet accessible from dashboard (vertical scroll list, all 5 illusions always shown)
- FR-5.4: "Your Insight" section on cheat sheet cards only appears for illusions with captured insights
<!-- REQ-REFINED: Added cross-references to reinforcement sessions -->
- FR-5.5: "Talk to me" CTA on post-ceremony dashboard launches the support experience defined in `reinforcement-sessions-spec.md`
- FR-5.6: Reinforcement session "[Reinforce]" buttons on post-ceremony dashboard link to illusion-specific reinforcement sessions as defined in `reinforcement-sessions-spec.md`

<!-- UX-REFINED: Added ceremony email and navigation requirements -->
### FR-6: Ceremony Email

**Description:** Nudge users who haven't started the ceremony.

**Requirements:**
- FR-6.1: Send single nudge email 24 hours after user reaches `ceremony_ready` status
- FR-6.2: Check user status at send time — do not send if user has already started or completed ceremony
- FR-6.3: Personalize email with user's product type when known; fall back to generic "nicotine products"
- FR-6.4: No follow-up emails after the initial nudge
- FR-6.5: No post-ceremony congratulations email
<!-- REQ-REFINED: Added email scheduling and CTA details -->
- FR-6.6: Email scheduling via cron job / scheduled function that runs periodically, checking for users who have been `ceremony_ready` for 24+ hours without starting
- FR-6.7: Email CTA links to the dashboard URL (no embedded auth token). User logs in via normal auth flow if not already authenticated.

### FR-7: Ceremony Navigation

**Description:** Navigation behavior during and after ceremony.

**Requirements:**
- FR-7.1: Hide app header and navigation during active ceremony conversation (immersive mode)
- FR-7.2: Dashboard CTA is the only in-app signal for ceremony availability (no badges, toasts, or push notifications)

<!-- REQ-REFINED: Added final session tease requirement -->
### FR-8: Final Core Session Tease

**Description:** Tease the ceremony at the end of the last core session.

**Requirements:**
- FR-8.1: When Identity Layer 3 (the final core session) completes, the AI includes a natural ceremony tease in its closing dialogue (e.g., "There's one more conversation ahead. Your final session.")
- FR-8.2: The session-complete card for Identity Layer 3 shows ceremony-specific copy: "All five illusions dismantled. Your final ceremony is ready."
- FR-8.3: Only "Return to Dashboard" CTA is shown on the Identity Layer 3 completion card — no "Begin Ceremony" shortcut

<!-- REQ-REFINED: Added ceremony transcript persistence -->
### FR-9: Ceremony Conversation Persistence

**Description:** Persist the ceremony conversation transcript.

**Requirements:**
- FR-9.1: The full ceremony conversation (all user and AI messages) is stored in the existing `conversations` and `messages` tables, consistent with core session storage
- FR-9.2: Ceremony conversations are identified by `session_type = 'ceremony'`
- FR-9.3: Incomplete/abandoned ceremony conversations are retained (not deleted) for potential debugging and analytics

---

## Non-Functional Requirements

### NFR-1: Performance

<!-- REQ-REFINED: Split metadata vs. audio generation targets, added dashboard load target -->
- NFR-1.1: Journey artifact metadata generation (segments, transcripts, structure) completes within 5 seconds. TTS audio for segments is generated lazily on first playback or in background — not subject to this target.
- NFR-1.2: Audio playback starts within 1 second of user action
- NFR-1.3: Post-ceremony dashboard shell (layout, headers, static content) renders within 2 seconds. Artifact cards load progressively (skeleton → content). Journey audio does not preload until user taps play.
- NFR-1.4: Ceremony conversation response latency follows the same targets as core sessions (no ceremony-specific target). See core session performance requirements.

### NFR-2: Reliability

- NFR-2.1: ~~Final recording upload must succeed before ceremony marked complete~~ **Updated:** Ceremony can complete without successful upload after 3 retries. Background retry when connectivity restores. Emotional arc takes priority over data persistence.
- NFR-2.2: Failed recording upload shows retry option (up to 3 attempts, then option to continue)
<!-- REQ-REFINED: Added TTS failure, API failure, and completion resilience -->
- NFR-2.3: If TTS fails during the ceremony, fall back to text-only display. The ceremony continues without voice. The existing text-only transcript path serves as fallback.
- NFR-2.4: For `ceremony/complete` API failure: retry up to 3 times. If all retries fail, show error and return to dashboard (ceremony must be redone). For artifact generation failures: retry in background; dashboard shows loading/error state.
- NFR-2.5: If device storage is full during Part 6 recording, catch the MediaRecorder error and prompt the user to use the text fallback instead. The ceremony continues.

### NFR-3: Continuity

- NFR-3.1: Ceremony cannot be paused/resumed
- NFR-3.2: Incomplete ceremony progress is not persisted (conversation state is abandoned, but the conversation record itself is retained per FR-9.3)

<!-- UX-REFINED: Added accessibility NFRs -->
### NFR-4: Accessibility

<!-- REQ-REFINED: Added WCAG target, keyboard exit, screen reader transition -->
- NFR-4.0: Target WCAG 2.1 AA compliance for all ceremony screens and interactions
- NFR-4.1: All animations respect `prefers-reduced-motion` setting
- NFR-4.2: Interactive elements have descriptive ARIA labels
- NFR-4.3: Recording and playback controls are keyboard-accessible
- NFR-4.4: Text-only fallback path available for entire ceremony flow
- NFR-4.5: Immersive mode provides keyboard exit: pressing Escape triggers a confirmation dialog ("Leave ceremony? Your progress won't be saved.") with "Leave" and "Stay" options
- NFR-4.6: Before the post-Part 7 auto-transition, announce via ARIA live region: "Transitioning to your dashboard in a moment." This gives screen reader users notice before the page change.

<!-- REQ-REFINED: Added security requirements -->
### NFR-5: Security

- NFR-5.1: All ceremony artifact endpoints require authentication. Supabase Row Level Security (RLS) ensures users can only access their own artifacts.
- NFR-5.2: Final recording uploads are validated server-side: accepted MIME types `audio/webm` or `audio/ogg`, maximum file size 10MB. Reject all other file types.
- NFR-5.3: Ceremony email CTA links to the dashboard URL with no embedded authentication token. Users authenticate via normal auth flow.
- NFR-5.4: Account deletion cascades to all ceremony artifacts, recordings, and transcripts (existing cascade delete behavior).

<!-- REQ-REFINED: Added observability requirements -->
### NFR-6: Observability

- NFR-6.1: Ceremony completion is tracked via the `ceremony_completed_at` timestamp in the database. No additional analytics events for MVP.
- NFR-6.2: Ceremony-specific errors are logged with context: `user_id`, `ceremony_part` (which part of the 7-part flow failed), `error_type`, and `conversation_id`. This enables targeted debugging without sifting through general application logs.

---

## Key Product Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Pause/resume** | Not supported | Emotional arc requires continuity; interruption breaks threshold effect |
| **Already quit handling** | Symbolic disposal ritual (Part 5A) | The quit itself is the strongest evidence the method worked. Worth celebrating symbolically, not fast-forwarding past. Users who already quit still go through a disposal or symbolic gesture. |
| **Dashboard ceremony CTA** | Single primary CTA only | No secondary "I need a moment" option. The pre-ceremony screen serves as the buffer. Reduces decision friction. |
| **Final session tease** | AI narration + modified completion card | AI teases ceremony at end of Identity Layer 3. Card shows ceremony-specific copy. Only "Return to Dashboard" CTA — no rush to ceremony. |
| **Ceremony rigidity** | Guided but flexible | 7 parts define the emotional arc. AI follows user's energy within each part but steers back when the beat is complete. Movie structure, not assembly line. |
| **Part 5 moment contrast** | Surface early rationalizations | Before dose/disposal, AI reflects back user's captured rationalization moments for before/after contrast. Same setup for both paths, different payoff. |
| **Part 3 external motivation** | Gently redirect to self | Validate external motivation but guide to internal thread. Internal motivation is necessary for lasting success. |
| **Part 4 not ready** | Pause and explore | If hesitation doesn't resolve, graceful exit. Ceremony restarts fresh next time. |
| **Journey artifact format** | Client-side sequential playback | Simpler than server-side stitching; enables transcript sync. TTS for all narration (including user quotes) is acceptable for MVP since no audio capture exists yet. |
| **Final recording re-record** | Allowed | Low-stakes chance to get it right |
| **Ceremony repeatability** | One-time event (deferred) | Kept as one-time for MVP. Data model should not prevent a future reset. Decision on renewal ceremony deferred to post-MVP once relapse patterns are observed. |
| **Post-ceremony transition** | Direct to dashboard | No intermediate screen. Dashboard state change IS the transition. Part 7's closing words are sufficient. |
| **Ceremony email** | Send after 24h delay | If user reaches ceremony_ready but hasn't started within 24 hours, send nudge email via Resend. |
| **Shareable artifacts** | Deferred | All artifacts private/in-app for MVP. Revisit based on user feedback post-launch. |
| **Part 2 personalization** | Clean summary only | Five illusions, five truths. No personal insights woven in — Part 1 handles personalization. Personal quotes live in the Illusions Cheat Sheet artifact. |
| **Return after interruption** | Dashboard with CTA, no acknowledgment | Clean slate. Same ceremony CTA shown as before first attempt. No "continue" or "you started before" messaging. |
| **Post-Part 7 transition** | 5-second auto-fade to dashboard | No button, no intermediate screen. Dashboard state change IS the transition. Respects `prefers-reduced-motion`. |
| **Ceremony conversation UI** | Same as core sessions | No special visual treatment. The AI's words create the ceremony feel. Simpler to build and maintain. |
| **Ceremony navigation** | Header hidden (immersive) | No header, nav, or back button during ceremony. Only exit is closing browser/app (triggers restart-fresh). |
| **Part 6 text fallback** | Allowed | User can type a message instead of recording. Stored in `content_text` field. Dashboard shows text instead of audio player. |
| **Part 5 disposal wait** | Open mic, no timeout | AI waits patiently while user physically disposes of products. No prompt timer or confirmation button. |
| **Recording upload failure** | Allow completion after 3 retries | Don't block emotional moment over technical failure. Background retry when connectivity restores. |
| **Artifact generation timing** | Background during Parts 6-7 | Start generation before ceremony ends. Dashboard shows loading state if not ready. Avoids blocking post-ceremony transition. |
| **Ceremony email cadence** | Single email at 24h | One nudge only. No follow-ups. Check status before sending to avoid stale emails. |
| **Post-ceremony email** | None | In-app celebration is sufficient. No congratulations email. |
| **Data deletion** | Full cascade delete | Account deletion removes all ceremony artifacts, recordings, and transcripts. |
| **Cheat sheet missing insights** | Show all 5, omit missing | All illusions display Illusion + Truth. "Your Insight" only appears when captured. No empty states. |
| **Quit check timing** | Pre-Part 5 (not intro) | AI asks during conversation after emotional buildup. Not a UI toggle at ceremony start. |
| **API contract (ceremony/complete)** | No journey artifact in response | Journey artifact generated in background; client fetches separately via /api/ceremony/journey. |
| **Conversation infrastructure** | Reuse existing /api/chat | Ceremony uses same SSE-streaming /api/chat endpoint as core sessions with `sessionType='ceremony'`. No separate ceremony conversation endpoint. |
| **Part transition logic** | LLM-driven via system prompt | No server-side state machine. System prompt defines each part's objective and exit criteria. LLM decides when to advance based on conversational cues. |
| **Concurrent ceremony sessions** | Return existing active conversation | If user opens ceremony in multiple tabs, server returns existing active conversation rather than creating a new one. |
| **Re-recording limit** | Unlimited | Users can re-record as many times as they want. Only latest recording stored (overwrite). |
| **Recording constraints** | Max 5 min, max 10MB | Server validates MIME type (audio/webm, audio/ogg) and file size. Prevents oversized uploads. |
| **Upload failure retry** | Client-side retry queue | Pending uploads stored in IndexedDB/localStorage. Retried on app reopen or network restore. |
| **Journey artifact failure** | Status enum with retry | Generation status tracked as `pending → generating → ready → failed`. Dashboard shows appropriate state. Background retry on failure. |
| **Artifact loading on dashboard** | Skeleton card with polling | "Preparing your journey..." skeleton state. Polls until artifact ready. Other dashboard elements render normally. |
| **TTS failure during ceremony** | Fall back to text-only | If TTS fails, AI response shown as text in transcript view. Ceremony continues without voice. |
| **Ceremony email scheduling** | Cron job / scheduled function | Periodic function checks for users ceremony_ready 24+ hours. Simple, reliable. |
| **Email CTA destination** | Dashboard URL | No embedded auth token. User logs in normally if needed. |
| **Ceremony transcript** | Persist permanently | Full conversation stored in existing conversations/messages tables. Useful for debugging, analytics, future features. |
| **v1 artifact migration** | No migration needed | v1 completers keep existing artifacts as-is. v2 changes only apply to new completions. |
| **Schema repeatability** | No UNIQUE on (user_id, artifact_type) | Intentionally avoids constraint that would block future ceremony repeatability. |
| **WCAG target** | 2.1 AA | Standard compliance target for web applications. |
| **Immersive mode exit** | Escape key confirmation | Pressing Escape shows "Leave ceremony?" dialog with Leave/Stay options. Accessible, non-intrusive. |
| **Post-transition a11y** | ARIA live region announcement | "Transitioning to your dashboard in a moment" announced before auto-transition. |
| **Ceremony analytics** | Database tracking only for MVP | Completion tracked via ceremony_completed_at. No formal analytics events. |
| **Error logging** | Ceremony-specific context | Errors include user_id, ceremony_part, error_type, conversation_id for targeted debugging. |

---

## Technical Design

<!-- TECH-DESIGN: Complete technical design for ceremony v2 -->

### Architecture Overview

The v2 ceremony is a **voice-first conversation** that reuses the existing voice session infrastructure (`SessionView.vue` + `/api/chat` endpoint). The v1 step-based wizard (`intro → generating → journey → recording → cheatsheet → complete`) is replaced by a continuous AI-guided conversation with special client-side behaviors triggered by LLM-emitted tokens.

```
┌─────────────────────────────────────────────────────────────────────┐
│                     Client (ceremony.vue)                           │
│                                                                     │
│  ┌──────────────┐  ┌──────────────────┐  ┌─────────────────────┐  │
│  │ SessionView  │  │ CeremonyRecording│  │ CeremonyExitDialog  │  │
│  │ (voice conv) │  │ Inline (lazy)    │  │ (Escape key)        │  │
│  └──────┬───────┘  └────────┬─────────┘  └──────────┬──────────┘  │
│         │                   │                        │             │
│  ┌──────┴───────────────────┴────────────────────────┴──────────┐  │
│  │                    useCeremony() composable                   │  │
│  │  Orchestrates: conversation, recording, completion, transition│  │
│  └──────────────────────────┬────────────────────────────────────┘  │
│                             │                                       │
└─────────────────────────────┼───────────────────────────────────────┘
                              │ SSE streaming
┌─────────────────────────────┼───────────────────────────────────────┐
│                     Server                                          │
│                             │                                       │
│  ┌──────────────────────────┴──────────────────────────────────┐   │
│  │                    POST /api/chat                            │   │
│  │  sessionType='ceremony' → ceremony system prompt             │   │
│  │  Detects tokens: [RECORDING_PROMPT] [JOURNEY_GENERATE]       │   │
│  │                  [SESSION_COMPLETE]                           │   │
│  └──────────────────────────┬──────────────────────────────────┘   │
│                             │                                       │
│  ┌────────────┐  ┌─────────┴────┐  ┌────────────┐  ┌───────────┐ │
│  │ ceremony/  │  │ ceremony/    │  │ ceremony/  │  │ ceremony/ │ │
│  │ prepare    │  │ complete     │  │ journey    │  │ save-     │ │
│  │            │  │              │  │            │  │ recording │ │
│  └────────────┘  └──────────────┘  └────────────┘  └───────────┘ │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  Background: generate-journey (triggered by [JOURNEY_GENERATE])│  │
│  │  → Creates artifact row (status='pending')                     │  │
│  │  → Generates narrative metadata (status='ready')               │  │
│  │  → TTS generation runs in background                           │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

#### Key Architectural Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Ceremony page structure** | Refactor v1 `ceremony.vue` in-place | Preserves working recording/journey code. Less regression risk than clean rewrite. |
| **Immersive mode** | Dedicated `layouts/ceremony.vue` layout | Ceremony page uses `definePageMeta({ layout: 'ceremony' })`. No header/nav. Follows Nuxt layout conventions. |
| **State management** | Single `useCeremony()` composable (orchestrator) | Owns ceremony lifecycle state, delegates to `useVoiceChat` (conversation) and `useAudioRecorder` (recording). |
| **LLM transition signals** | Special tokens emitted by LLM | `[RECORDING_PROMPT]`, `[JOURNEY_GENERATE]`, `[SESSION_COMPLETE]`. Consistent with existing `[SESSION_COMPLETE]` pattern. |
| **Recording trigger** | `[RECORDING_PROMPT]` token in AI response | Client detects in SSE stream, pauses conversation, shows inline recording UI. |
| **Journey generation trigger** | `[JOURNEY_GENERATE]` token in AI response | Server detects in SSE stream during Part 6, kicks off background generation. |
| **Completion trigger** | `[SESSION_COMPLETE]` token in AI response | Client detects at end of Part 7, calls `ceremony/complete`, auto-fades to dashboard. |
| **SessionView communication** | Events + exposed methods | SessionView emits `@recording-prompt`, `@session-complete`. Exposes `pause()`/`resume()`. |
| **Journey artifact TTS** | Same provider as conversations (Groq default) | Background generation after metadata is saved. Segments available for playback progressively. |
| **Bundle strategy** | Lazy-load recording component | `CeremonyRecordingInline` loaded via `defineAsyncComponent`. Only needed at Part 6. |

### Database Schema

The ceremony uses existing tables with v2 additions. Changes from v1 are marked with `-- NEW v2`.

#### `user_progress` (ceremony-relevant fields)

```sql
program_status TEXT DEFAULT 'not_started';
-- Values: 'not_started', 'in_progress', 'ceremony_ready', 'completed'

ceremony_completed_at TIMESTAMP WITH TIME ZONE;  -- Set when ceremony completes
ceremony_skipped_final_dose BOOLEAN DEFAULT FALSE;  -- true = Part 5A path (already quit)
ceremony_ready_at TIMESTAMP WITH TIME ZONE;       -- NEW v2: Set when program_status → 'ceremony_ready'
ceremony_email_sent_at TIMESTAMP WITH TIME ZONE;  -- NEW v2: Set when 24h nudge email is sent
```

**Note:** No `ceremony_in_progress` state needed. Concurrent ceremony sessions are prevented at the conversation level (see FR-2.8). The `ceremony_skipped_final_dose` field maps to the Pre-Part 5 routing: `true` → Part 5A (Symbolic Disposal), `false` → Part 5B (Final Dose).

#### `ceremony_artifacts` (full schema)

```sql
CREATE TABLE ceremony_artifacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  artifact_type TEXT NOT NULL
    CHECK (artifact_type IN ('reflective_journey', 'final_recording', 'illusions_cheat_sheet')),
  generation_status TEXT DEFAULT 'ready'           -- NEW v2: 'pending' | 'generating' | 'ready' | 'failed'
    CHECK (generation_status IN ('pending', 'generating', 'ready', 'failed')),
  content_text TEXT,                    -- Narrative text (journey) or typed message (recording)
  content_json JSONB,                   -- Structured data (journey segments, cheat sheet entries)
  audio_path TEXT,                      -- Supabase Storage path (final recording)
  audio_duration_ms INTEGER,            -- Duration in milliseconds
  included_moment_ids UUID[],           -- captured_moments IDs used in this artifact
  ceremony_completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

**Design note for future repeatability:** The `ceremony_artifacts` table intentionally has NO unique constraint on `(user_id, artifact_type)`. This allows a future "renewal ceremony" to create additional artifacts without schema changes. If ceremony repeatability ships, add a `ceremony_number` or `ceremony_id` field to distinguish iterations.

#### Migration: `20260208_ceremony_v2.sql`

```sql
-- Add ceremony v2 fields to user_progress
ALTER TABLE user_progress
  ADD COLUMN IF NOT EXISTS ceremony_ready_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS ceremony_email_sent_at TIMESTAMP WITH TIME ZONE;

-- Add generation_status to ceremony_artifacts
ALTER TABLE ceremony_artifacts
  ADD COLUMN IF NOT EXISTS generation_status TEXT DEFAULT 'ready'
    CHECK (generation_status IN ('pending', 'generating', 'ready', 'failed'));
```

#### Journey Artifact `content_json` Structure

Stored in `ceremony_artifacts` where `artifact_type = 'reflective_journey'`:

```typescript
interface JourneyArtifactData {
  segments: PlaylistSegment[]
}

interface PlaylistSegment {
  id: string                          // e.g., "seg_1"
  type: 'narration' | 'user_moment'
  text: string                        // Content for TTS generation or display
  transcript: string                  // Display text (same as text)
  duration_ms?: number                // Set after TTS generation
  moment_id?: string                  // If user_moment, references captured_moments.id
  audio_generated: boolean            // Whether TTS has been generated for this segment
}
```

#### Illusions Cheat Sheet `content_json` Structure

Stored in `ceremony_artifacts` where `artifact_type = 'illusions_cheat_sheet'`:

```typescript
interface CheatSheetData {
  entries: Array<{
    illusionKey: string
    name: string
    illusion: string           // What they used to believe
    truth: string              // The reframe
    userInsight?: string       // Their own quote (if captured)
    insightMomentId?: string   // Reference to captured_moments.id
  }>
  generatedAt: string
}
```

### LLM: Ceremony System Prompt & Token Protocol

<!-- TECH-DESIGN: Ceremony-specific LLM prompt design and token protocol -->

#### Ceremony System Prompt Structure

The ceremony conversation uses a ceremony-specific system prompt injected when `sessionType='ceremony'`. The prompt defines:

1. **The 7-part ceremony structure** with each part's objective, emotional arc, and exit criteria
2. **User context** from `/api/ceremony/prepare` (user story, captured moments, illusions completed, product type)
3. **Token protocol** — when to emit special tokens
4. **Part transition rules** — the LLM decides when to advance based on conversational cues (no server-side state machine)

#### Token Protocol

Three special tokens are emitted by the LLM during the ceremony conversation:

| Token | Emitted When | Detected By | Action |
|-------|-------------|-------------|--------|
| `[JOURNEY_GENERATE]` | AI enters Part 6 (before recording prompt) | Server (`/api/chat`) | Kicks off background journey artifact generation |
| `[RECORDING_PROMPT]` | AI is ready for user to record (Part 6) | Client (SSE stream) | Pauses conversation, shows inline recording UI |
| `[SESSION_COMPLETE]` | AI finishes Part 7 closing message | Client (SSE stream) | Triggers completion flow + auto-transition |

**Token ordering:** `[JOURNEY_GENERATE]` appears first (in the AI message entering Part 6), followed by `[RECORDING_PROMPT]` (in the same or next message after the recording invitation). `[SESSION_COMPLETE]` appears at the end of the Part 7 closing.

**Token stripping:** All tokens are stripped from displayed text and TTS audio (following existing `[SESSION_COMPLETE]` pattern in `SessionView.vue` and `tts/sanitize.ts`).

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

### Component Architecture

<!-- TECH-DESIGN: Component hierarchy and design for ceremony v2 -->

#### Component Hierarchy

```
pages/ceremony.vue (layout: 'ceremony')
├── VoiceSessionView (existing — handles conversation UI)
│   ├── VoiceWordByWordTranscript
│   ├── VoiceMicButton
│   └── VoiceAudioWaveform
├── CeremonyRecordingInline (NEW — lazy-loaded at Part 6)
│   ├── VoiceMicButton (reused)
│   └── Text input fallback
├── CeremonyExitDialog (NEW — Escape key confirmation)
└── [aria-live region] (inline, visually hidden)

layouts/ceremony.vue (NEW — immersive layout, no header)
└── <slot />  (just the page content, no AppHeader)
```

#### New Components

**`layouts/ceremony.vue`** — Immersive layout
- No `AppHeader`, no navigation
- Full-screen slot for ceremony page
- Minimal: just `<main><slot /></main>` with appropriate styling

**`CeremonyRecordingInline.vue`** — Inline recording UI for Part 6
- **Props:** none (self-contained)
- **Emits:** `@audio-saved(path: string)`, `@text-saved(text: string)`, `@error(msg: string)`
- **States:** idle → recording → preview → saving → saved (+ text input mode)
- **Features:**
  - Slide-in/out animation (respects `prefers-reduced-motion`)
  - Mic button with idle/recording/preview states (reuses `MicButton.vue` patterns)
  - Audio preview with playback
  - "Try again" (unlimited re-records)
  - Text fallback input ("or type your message" link)
  - Client-side enforcement: max 5 min duration, max 10MB file size
  - Upload with 3 retries; on final failure, queues to localStorage and emits success
  - ARIA labels for all states ("Ready to record" / "Recording" / "Recording saved")

**`CeremonyExitDialog.vue`** — Escape key confirmation
- **Props:** `open: boolean`
- **Emits:** `@leave`, `@stay`
- **Content:** "Leave ceremony? Your progress won't be saved." with "Leave" and "Stay" buttons
- **Behavior:** Focus-trapped when open, "Stay" is the default focused button
- **A11y:** `role="alertdialog"`, `aria-modal="true"`, descriptive `aria-labelledby`

#### Modified Components

**`SessionView.vue`** — New ceremony-aware capabilities
- **New emits:** `@recording-prompt` — fired when `[RECORDING_PROMPT]` detected in AI response
- **New exposed methods:** `pause()` / `resume()` — pauses/resumes conversation input (disables mic + text input)
- Token detection: add `[RECORDING_PROMPT]` to existing `[SESSION_COMPLETE]` detection logic
- Token stripping: add `[RECORDING_PROMPT]` and `[JOURNEY_GENERATE]` to display/TTS sanitization

**`SessionCompleteCard.vue`** — Ceremony-specific variant for Identity Layer 3
- Accepts optional `ceremonyTease` prop
- When set, shows: "All five illusions dismantled. Your final ceremony is ready."
- Only "Return to Dashboard" CTA (no "Begin Ceremony" shortcut)

### State Management

<!-- TECH-DESIGN: Client-side state management for ceremony -->

#### `useCeremony()` Composable

**Purpose:** Orchestrates the entire ceremony lifecycle on the client side.

```typescript
interface UseCeremonyReturn {
  // State
  ceremonyPhase: Ref<'pre-ceremony' | 'conversation' | 'recording' | 'completing' | 'transitioning' | 'error'>
  conversationId: Ref<string | null>
  isRecording: Ref<boolean>
  isCompleting: Ref<boolean>
  isTransitioning: Ref<boolean>
  showExitDialog: Ref<boolean>
  error: Ref<string | null>
  ariaAnnouncement: Ref<string>  // For ARIA live region

  // Actions
  startCeremony: () => Promise<void>          // Calls /api/ceremony/prepare, initializes conversation
  handleRecordingPrompt: () => void           // Pauses conversation, shows recording UI
  handleRecordingSaved: (path?: string) => void  // Resumes conversation after recording
  handleTextSaved: (text: string) => void     // Text fallback saved
  handleSessionComplete: () => Promise<void>  // Triggers completion + transition
  handleEscapeKey: () => void                 // Shows exit dialog
  handleLeave: () => void                     // Navigate to dashboard
  handleStay: () => void                      // Dismiss dialog, resume
  retryCompletion: () => Promise<void>        // Retry failed completion
}
```

**Lifecycle flow:**
1. `startCeremony()` → calls `/api/ceremony/prepare`, creates conversation, sets `ceremonyPhase='conversation'`
2. SessionView emits `@recording-prompt` → `handleRecordingPrompt()` → pauses SessionView, sets `ceremonyPhase='recording'`
3. Recording component emits `@audio-saved` or `@text-saved` → `handleRecordingSaved()` → resumes SessionView, sets `ceremonyPhase='conversation'`
4. SessionView emits `@session-complete` → `handleSessionComplete()` → calls `POST /api/ceremony/complete` (up to 3 retries with 1s/2s/4s backoff), sets `ceremonyPhase='transitioning'`, announces via ARIA, waits 5s, navigates to `/dashboard`

#### Background Upload Retry (localStorage)

```typescript
interface PendingUpload {
  userId: string
  blobDataUrl: string   // base64 data URL of the recording blob
  timestamp: string
  retryCount: number
}

// Key: 'unhooked:pending-ceremony-upload'
// On ceremony.vue mount or dashboard.vue mount:
//   1. Check localStorage for pending upload
//   2. If found, attempt upload to /api/ceremony/save-final-recording
//   3. On success, remove from localStorage
//   4. On failure, increment retryCount (give up after 10 total attempts)
```

### API Endpoints (ADR-004)

<!-- TECH-DESIGN: API contracts aligned to v2 architecture -->

#### `GET /api/user/progress`

Returns ceremony status via `program_status` field.

```typescript
// Response
{
  program_status: 'not_started' | 'in_progress' | 'ceremony_ready' | 'completed'
  ceremony_completed_at?: string
  ceremony_ready_at?: string       // NEW v2
  // ... other progress fields
}
```

#### `GET /api/ceremony/prepare`

Gathers all data needed for the ceremony: user story, captured moments (grouped by type), illusion completion status, and AI-suggested moments for the journey narrative. Also checks for active ceremony conversations (FR-2.8).

```typescript
// Response
{
  ready: boolean                          // true if eligible and not yet completed
  ceremony_completed: boolean
  active_conversation_id?: string         // NEW v2: If ceremony conversation already exists
  user_story: { origin_summary, primary_triggers, personal_stakes, ... }
  moments_by_type: Record<MomentType, CapturedMoment[]>
  illusions_completed: string[]
  total_moments: number
  suggested_journey_moments: CapturedMoment[]
}
```

#### `POST /api/chat` (ceremony conversation)

Ceremony conversation uses the existing `/api/chat` endpoint — the same infrastructure as core sessions. The ceremony is identified by `sessionType: 'ceremony'`. Ceremony-specific system prompts define the 7-part structure, emotional arc, and part transition criteria.

```typescript
// Request (same as core sessions)
{
  messages: Message[]
  conversationId: string
  sessionType: 'ceremony'       // Identifies this as a ceremony conversation
  stream: boolean
  streamTTS: boolean
  inputModality: 'text' | 'voice'
}
```

Streaming responses use Server-Sent Events (SSE).

**v2 ceremony-specific behavior in `/api/chat`:**
- When `sessionType='ceremony'` and response contains `[JOURNEY_GENERATE]`, the server triggers background journey artifact generation (calls `generate-journey` logic internally).
- Tokens `[RECORDING_PROMPT]`, `[JOURNEY_GENERATE]`, and `[SESSION_COMPLETE]` are passed through in the SSE stream for client detection.
- Token stripping for TTS is handled by the existing `tts/sanitize.ts` module (add new tokens to strip list).

#### `POST /api/ceremony/complete`

Mark ceremony complete and finalize artifacts. **Modified in-place from v1.**

```typescript
// Request (UPDATED v2)
{
  conversation_id: string               // Required — links to ceremony conversation
  final_recording_path?: string         // Optional — null if text fallback or upload failed
}

// Response (UPDATED v2)
{
  status: 'completed'
  ceremony_completed_at: string
  journey_artifact_status: 'ready' | 'generating' | 'pending'  // Client fetches journey separately
}
```

**v2 changes from v1:**
- `conversation_id` is now required (was not sent in v1)
- `already_quit` parameter removed (determined by AI conversation, stored via `ceremony_skipped_final_dose` based on conversation analysis)
- `final_recording` artifact is no longer required (can complete without it per FR-3.6)
- Response no longer includes full artifact data (client fetches via `/api/ceremony/journey`)
- Returns `journey_artifact_status` so client knows whether to show skeleton on dashboard

**Note:** Journey artifact is not returned in this response. Generation begins in background during Parts 6-7 (triggered by `[JOURNEY_GENERATE]` token). Client fetches via `GET /api/ceremony/journey` when dashboard loads. If status is `'generating'` or `'pending'`, client polls until ready.

#### `GET /api/ceremony/journey`

Retrieve journey artifact for playback.

```typescript
// Response
{
  journey: JourneyArtifactData   // segments playlist from content_json
  status: 'ready' | 'generating' | 'pending' | 'failed'
}
```

#### `GET /api/ceremony/final-recording`

Retrieve final recording/message for playback.

```typescript
// Response
{
  type: 'audio' | 'text'
  audioPath?: string     // Present if type === 'audio'
  messageText?: string   // Present if type === 'text'
  transcript?: string    // Audio transcript (future STT integration)
  recordedAt: string
}
```

### Final Recording Storage

Storage uses the existing `ceremony_artifacts` table.

```typescript
// Audio recording path pattern
`ceremony-artifacts/${userId}/final-recording.webm`

// Audio upload flow
1. Client records audio via MediaRecorder API (max 5 min, max 10MB)
2. Client-side validation: MIME type check, file size check, duration check
3. Server validates: MIME type (audio/webm or audio/ogg), file size (≤10MB). Rejects all others.
4. Client uploads to Supabase Storage (ceremony-artifacts bucket)
5. Row created in ceremony_artifacts: artifact_type='final_recording', audio_path set, content_text=''
6. Re-recording overwrites existing artifact (upsert)

// Text message flow (fallback)
1. User types message in text input
2. Row created in ceremony_artifacts: artifact_type='final_recording', audio_path=null, content_text set
3. No Supabase Storage upload needed

// Upload failure flow
1. Client retries up to 3 times on failure (in CeremonyRecordingInline)
2. After 3 failures, user can continue ceremony (recording queued for background retry)
3. Pending upload stored in localStorage as base64 data URL
4. On next ceremony.vue or dashboard.vue mount, client checks for pending and retries
5. Give up after 10 total retry attempts
```

### Journey Artifact Generation

<!-- TECH-DESIGN: Journey artifact generation lifecycle -->

**Trigger:** Server detects `[JOURNEY_GENERATE]` token in ceremony chat response (Part 6).

**Generation lifecycle:**
1. Server creates `ceremony_artifacts` row: `artifact_type='reflective_journey'`, `generation_status='pending'`
2. Server calls `llm.ceremony.journey` task to generate narrative metadata → `generation_status='generating'`
3. Narrative text and segment structure saved to `content_json` → `generation_status='ready'`
4. TTS audio for each segment generated in background (does not block `generation_status='ready'`)
5. Each segment's `audio_generated` flag updated as TTS completes

**TTS strategy:** Metadata and text are available immediately when `generation_status='ready'`. TTS audio is generated per-segment in background using the configured TTS provider (Groq default). The `JourneyPlayer` can display text-only while audio loads, and play segments as their audio becomes available.

**Failure handling:** If generation fails, `generation_status='failed'`. Dashboard shows error card with "Retry" button. Retry calls `POST /api/ceremony/generate-journey` which resets status and re-runs generation.

### Ceremony Email

<!-- TECH-DESIGN: Ceremony nudge email implementation -->

**Implementation:** Extends existing cron infrastructure. The `processScheduledCheckIns` function in the existing `/api/cron/check-ins` endpoint is extended to also process ceremony emails.

**New module:** `server/utils/email/ceremony-email-sender.ts`

```typescript
// Processes ceremony nudge emails
// Called by /api/cron/check-ins alongside check-in processing
export async function processCeremonyEmails(supabase: SupabaseClient): Promise<{
  processed: number
  sent: number
  errors: string[]
}>

// Logic:
// 1. Query: users WHERE program_status='ceremony_ready'
//    AND ceremony_ready_at <= now() - 24 hours
//    AND ceremony_email_sent_at IS NULL
//    AND ceremony_completed_at IS NULL
// 2. For each user: fetch product type from user_intake
// 3. Send email via Resend (inline HTML template, same pattern as check-in-sender.ts)
// 4. Set ceremony_email_sent_at = now()
```

**Email template:** Inline HTML in `ceremony-email-sender.ts`. Product type personalized using `user_intake.products_used` (falls back to "nicotine products"). CTA links to dashboard URL (no embedded auth token).

### Error Handling & Resilience

<!-- TECH-DESIGN: Error handling patterns -->

| Scenario | Handling | Implementation |
|----------|----------|----------------|
| **AI service failure mid-ceremony** | Show error, return to dashboard, restart fresh | `useCeremony()` catches chat errors, sets `ceremonyPhase='error'` |
| **ceremony/complete API failure** | Client retries 3x (1s/2s/4s backoff), then shows error | `useCeremony().handleSessionComplete()` with retry loop |
| **Recording upload failure** | 3 in-flight retries, then localStorage queue | `CeremonyRecordingInline` handles retries; pending stored in localStorage |
| **Journey generation failure** | Dashboard shows retry button | `generation_status='failed'`; GET `/api/ceremony/journey` returns `status='failed'` |
| **TTS failure during ceremony** | Fall back to text-only display | Existing `SessionView` TTS error handling; ceremony continues |
| **Device storage full during recording** | Catch MediaRecorder error, prompt text fallback | `CeremonyRecordingInline` catches error, switches to text input |
| **Mic permission revoked mid-ceremony** | Seamless fallback to text input | Existing `SessionView` mic-loss handling |
| **Network loss during ceremony** | Same as AI service failure | SSE stream error → error state → dashboard |

**Error logging format:** All ceremony errors use structured `console.error` with ceremony prefix:
```typescript
console.error('[ceremony/part-6]', {
  userId: user.sub,
  conversationId,
  errorType: 'upload_failed',
  error: err.message
})
```

### Security

<!-- TECH-DESIGN: Security implementation -->

- **Authentication:** All ceremony endpoints require `serverSupabaseUser(event)` check (existing pattern)
- **RLS:** Existing policies cover `ceremony_artifacts` (read own, create own). Server uses `serverSupabaseServiceRole` for updates (generation_status changes).
- **Upload validation:** `save-final-recording.post.ts` enhanced with:
  - MIME type whitelist: `['audio/webm', 'audio/ogg']`
  - File size limit: `10 * 1024 * 1024` bytes (10MB)
  - Reject all other types with 400 error
- **Storage bucket:** `ceremony-artifacts` bucket in Supabase Storage (already exists)
- **Email:** CTA links to dashboard URL, no embedded auth tokens (NFR-5.3)

### DevOps & Deployment

<!-- TECH-DESIGN: Deployment considerations -->

- **Migration:** Run `20260208_ceremony_v2.sql` before deploying v2 code. Migration is additive (new columns only), safe to run while v1 is live.
- **Environment variables:** No new env vars needed. All ceremony functionality uses existing infrastructure (Groq, Supabase, Resend).
- **Cron:** Existing GitHub Actions cron (every 5 min) already calls `/api/cron/check-ins`. Ceremony email processing is added to this endpoint. No new cron configuration needed.
- **Backward compatibility:** The v1 ceremony UI is fully replaced. No backward compatibility layer needed. The migration adds columns with defaults so existing data is unaffected.

---

<!-- TECH-DESIGN: User Stories for ceremony v2 implementation -->

## User Stories

Stories are organized by implementation phase. Dependencies are noted. Complexity: S (< 1 day), M (1-2 days), L (2-4 days), XL (4+ days).

### Phase 1: Foundation (Infrastructure & Schema)

#### Story 1.1: Database Migration for Ceremony v2

**Description:** As a developer, I want the ceremony v2 schema changes deployed, so that v2 endpoints and features have the fields they need.

**Acceptance Criteria:**
1. Given the current schema, when migration `20260208_ceremony_v2.sql` runs, then `user_progress` has `ceremony_ready_at` and `ceremony_email_sent_at` columns
2. Given the current schema, when migration runs, then `ceremony_artifacts` has `generation_status` column with CHECK constraint and default 'ready'
3. Given existing data in these tables, when migration runs, then no data is lost or corrupted (additive only)

**Technical Notes:**
- File: `supabase/migrations/20260208_ceremony_v2.sql`
- All columns nullable with defaults; no breaking changes to existing data
- Update `types/database.types.ts` after migration (`npm run db:types`)

**Dependencies:** None
**Test Requirements:** Unit test: verify migration SQL is valid. Manual: run against staging.
**Estimated Complexity:** S

---

#### Story 1.2: Ceremony Layout (Immersive Mode)

**Description:** As a user, I want the ceremony to be immersive with no header or navigation, so that I stay focused on the experience.

**Acceptance Criteria:**
1. Given I am on the ceremony page, when it loads, then no AppHeader or navigation is visible
2. Given I am on the ceremony page, when I press Escape, then a confirmation dialog appears asking "Leave ceremony? Your progress won't be saved."
3. Given the exit dialog is open and I click "Stay", when the dialog closes, then the ceremony continues unchanged
4. Given the exit dialog is open and I click "Leave", when I confirm, then I am navigated to `/dashboard`
5. Given I use a screen reader, when the exit dialog opens, then it is announced with `role="alertdialog"` and focus is trapped within it

**Technical Notes:**
- New file: `layouts/ceremony.vue` — minimal layout, no `AppHeader`
- New file: `components/CeremonyExitDialog.vue` — dialog component
- `pages/ceremony.vue`: add `definePageMeta({ layout: 'ceremony' })` and Escape key handler
- Focus trap: "Stay" button is default focused

**Dependencies:** None
**Test Requirements:**
- Unit: CeremonyExitDialog renders, emits @leave/@stay
- E2E: Ceremony page has no header; Escape opens dialog; Leave navigates to dashboard
**Estimated Complexity:** S

---

#### Story 1.3: LLM Token Protocol (Recording & Generation Signals)

**Description:** As a developer, I want the ceremony system prompt to emit `[RECORDING_PROMPT]`, `[JOURNEY_GENERATE]`, and `[SESSION_COMPLETE]` tokens at the right moments, so that the client and server can react to ceremony transitions.

**Acceptance Criteria:**
1. Given a ceremony conversation, when the AI enters Part 6, then it emits `[JOURNEY_GENERATE]` before the recording invitation
2. Given a ceremony conversation, when the AI is ready for the user to record, then it emits `[RECORDING_PROMPT]` at the end of its recording invitation message
3. Given a ceremony conversation, when the AI finishes Part 7 closing, then it emits `[SESSION_COMPLETE]` at the end of its final message
4. Given these tokens appear in AI responses, when displayed to the user, then all tokens are stripped from visible text and TTS audio

**Technical Notes:**
- Update `server/utils/prompts/` — add ceremony system prompt with token instructions
- Update `server/utils/tts/sanitize.ts` — add `[RECORDING_PROMPT]` and `[JOURNEY_GENERATE]` to strip list
- Ceremony system prompt receives user context from `ceremony/prepare` data
- The prompt defines each part's objective, exit criteria, and when to emit tokens

**Dependencies:** None
**Test Requirements:**
- Unit: TTS sanitizer strips all three tokens
- Unit: Ceremony prompt builder includes token instructions and user context
**Estimated Complexity:** M

---

#### Story 1.4: SessionView Ceremony Support

**Description:** As a developer, I want SessionView to detect `[RECORDING_PROMPT]` tokens and expose pause/resume methods, so that the ceremony page can orchestrate the recording flow.

**Acceptance Criteria:**
1. Given a ceremony conversation in SessionView, when the AI response contains `[RECORDING_PROMPT]`, then the `@recording-prompt` event is emitted
2. Given SessionView is active, when `pause()` is called, then the mic button and text input are disabled and the user cannot send messages
3. Given SessionView is paused, when `resume()` is called, then input is re-enabled and the user can continue the conversation
4. Given `[RECORDING_PROMPT]` appears in a message, when rendering, then the token is stripped from the displayed text

**Technical Notes:**
- File: `components/voice/SessionView.vue`
- Add `[RECORDING_PROMPT]` detection alongside existing `[SESSION_COMPLETE]` watch
- Expose `pause()` and `resume()` via `defineExpose`
- Pause: set a `isPaused` ref that disables MicButton and text input
- Strip `[RECORDING_PROMPT]` and `[JOURNEY_GENERATE]` in `displayMessages` computed (same pattern as `[SESSION_COMPLETE]`)

**Dependencies:** Story 1.3 (token protocol)
**Test Requirements:**
- Unit: SessionView emits @recording-prompt when token detected
- Unit: pause()/resume() toggle input state
- Unit: Tokens stripped from display messages
**Estimated Complexity:** M

---

### Phase 2: Ceremony Conversation Flow

#### Story 2.1: useCeremony() Composable

**Description:** As a developer, I want a composable that orchestrates the ceremony lifecycle (conversation → recording → completion → transition), so that ceremony.vue stays manageable.

**Acceptance Criteria:**
1. Given `startCeremony()` is called, when `/api/ceremony/prepare` succeeds, then `ceremonyPhase` transitions to `'conversation'` and `conversationId` is set
2. Given `handleRecordingPrompt()` is called, when recording UI should appear, then `ceremonyPhase` transitions to `'recording'` and `isRecording` is true
3. Given recording is saved, when `handleRecordingSaved()` is called, then `ceremonyPhase` transitions back to `'conversation'`
4. Given `handleSessionComplete()` is called, when `POST /api/ceremony/complete` succeeds, then `ceremonyPhase` transitions to `'transitioning'`
5. Given completion fails, when retried up to 3 times with exponential backoff (1s/2s/4s), then on final failure `ceremonyPhase` transitions to `'error'`
6. Given `ceremonyPhase` is `'transitioning'`, when 5 seconds pass, then navigation to `/dashboard` occurs
7. Given `prefers-reduced-motion` is set, when auto-transitioning, then navigate immediately without fade animation

**Technical Notes:**
- File: `composables/useCeremony.ts`
- Delegates conversation management to `useVoiceChat`
- Delegates recording to component events
- Retry logic: `async function withRetry(fn, maxRetries=3, baseDelay=1000)`
- Auto-transition: `setTimeout` + `navigateTo('/dashboard')` with fade class on ceremony container
- ARIA announcement: set `ariaAnnouncement` to "Transitioning to your dashboard in a moment." before transition

**Dependencies:** Story 1.4 (SessionView ceremony support)
**Test Requirements:**
- Unit: Phase transitions (conversation → recording → conversation → completing → transitioning)
- Unit: Retry logic (succeeds on retry, fails after max retries)
- Unit: Auto-transition timing (5s delay, immediate with reduced motion)
**Estimated Complexity:** L

---

#### Story 2.2: Ceremony Page Refactor (v1 → v2)

**Description:** As a user, I want the ceremony to be a continuous voice conversation (not a step wizard), so that it feels like a natural coaching session.

**Acceptance Criteria:**
1. Given I am eligible for the ceremony, when I navigate to `/ceremony`, then a pre-ceremony screen shows ("Set aside 15 minutes...") with "Begin Ceremony" CTA
2. Given my product type is known (e.g., "vape"), when the pre-ceremony screen renders, then it shows "If you still have your vape around, have it nearby"
3. Given my product type is unknown, when the pre-ceremony screen renders, then it falls back to "nicotine products"
4. Given I tap "Begin Ceremony", when the ceremony starts, then I enter a voice conversation interface (SessionView)
5. Given the AI reaches Part 6, when `[RECORDING_PROMPT]` is detected, then the conversation pauses and the inline recording UI slides in
6. Given I complete or skip recording, when the conversation resumes, then the AI continues from Part 7
7. Given the AI completes Part 7 with `[SESSION_COMPLETE]`, when 5 seconds pass, then I am auto-transitioned to the post-ceremony dashboard
8. Given I exit mid-ceremony, when I return to the ceremony page, then it starts fresh from the pre-ceremony screen
9. Given the ceremony is already completed, when I navigate to `/ceremony`, then I am redirected to `/dashboard`
10. Given my `program_status` is NOT `ceremony_ready`, when I navigate to `/ceremony`, then I am redirected to `/dashboard`

**Technical Notes:**
- File: `pages/ceremony.vue` — refactor in-place from step-based wizard to SessionView wrapper
- Remove v1 steps: `intro` (already-quit toggle), `generating`, `journey`, `cheatsheet`, `complete`
- Add: pre-ceremony screen, SessionView integration, recording overlay, auto-transition
- Use `useCeremony()` composable for orchestration
- Inline `aria-live="polite"` region for transition announcement
- v1 recording code preserved in `CeremonyRecordingInline.vue`
- Product type sourced from `/api/ceremony/prepare` response (user_story) or user_intake
- Non-eligible redirect: check `program_status` on page load via `/api/user/progress`

**Dependencies:** Story 1.2 (layout), Story 1.4 (SessionView), Story 2.1 (composable)
**Test Requirements:**
- E2E: Full ceremony flow (pre-ceremony → conversation → recording → completion → dashboard)
- E2E: Interruption restart (exit mid-ceremony, return starts fresh)
- E2E: Completed ceremony redirects to dashboard
- E2E: Non-eligible user redirected to dashboard
- E2E: Pre-ceremony screen shows product-specific text when known
**Estimated Complexity:** XL

---

#### Story 2.3: Inline Recording UI (Part 6)

**Description:** As a user, I want to record a message to my future self inline within the ceremony conversation, so that the emotional flow isn't broken.

**Acceptance Criteria:**
1. Given the AI prompts me to record, when the recording UI appears, then it slides in within the conversation view (no page navigation or modal)
2. Given the recording UI is shown, when I tap the mic button, then recording starts with a pulsing indicator and elapsed time
3. Given I am recording, when I tap stop, then I see a preview with "Keep this recording" and "Try again" options
4. Given I tap "Try again", when I re-record, then the previous recording is discarded
5. Given I tap "Keep this recording", when saving succeeds, then the recording UI slides away and the conversation resumes
6. Given I prefer to type, when I tap "or type your message", then a text input appears and I can submit a text message
7. Given upload fails 3 times, when I continue, then the recording is queued for background retry and the ceremony proceeds
8. Given device storage is full during recording, when the error is caught, then I am prompted to type instead

**Technical Notes:**
- File: `components/CeremonyRecordingInline.vue`
- Extract recording logic from v1 `ceremony.vue` (lines 179-276, 554-624)
- Add: text fallback input, slide animation, localStorage retry queue, duration/size enforcement
- Lazy-loaded via `defineAsyncComponent` in ceremony.vue
- Max duration: 5 min (300s timer); Max size: 10MB (check blob.size before upload)

**Dependencies:** Story 2.1 (composable orchestration)
**Test Requirements:**
- Unit: Recording states (idle → recording → preview → saving → saved)
- Unit: Text fallback mode
- Unit: Upload retry (succeeds on retry 2, fails after 3)
- Unit: localStorage queue on final failure
- E2E: Record, preview, keep; record, try again, keep; type message instead
**Estimated Complexity:** L

---

### Phase 3: Server-Side Ceremony Logic

#### Story 3.1: Ceremony Chat Integration

**Description:** As a developer, I want `/api/chat` to handle ceremony-specific behavior (system prompt injection, token detection for journey generation), so that the ceremony conversation works end-to-end.

**Acceptance Criteria:**
1. Given a chat request with `sessionType='ceremony'`, when the system prompt is built, then it includes the ceremony 7-part structure, user context (story, moments, product type), and token protocol
2. Given the AI response contains `[JOURNEY_GENERATE]`, when the token is detected in the SSE stream, then background journey artifact generation is triggered
3. Given journey generation is triggered, when the artifact row is created, then `generation_status='pending'` and generation begins asynchronously
4. Given ceremony context data (from `/api/ceremony/prepare`), when injected into the system prompt, then the AI can reference user's captured moments, rationalizations, and product type

**Technical Notes:**
- File: `server/api/chat.post.ts` — add ceremony-specific branch
- New file: `server/utils/prompts/ceremony-prompt.ts` — ceremony system prompt builder
- Token detection in SSE stream: scan for `[JOURNEY_GENERATE]` and trigger `generate-journey` logic
- Journey generation runs asynchronously (don't block the SSE response)
- Ceremony prompt receives: user_story, moments_by_type, illusions_completed, suggested_journey_moments, product_type

**Dependencies:** Story 1.3 (token protocol), Story 3.2 (journey generation)
**Test Requirements:**
- Unit: Ceremony prompt builder includes all context
- Unit: Token detection triggers journey generation
- Integration: Full ceremony conversation with mock LLM
**Estimated Complexity:** L

---

#### Story 3.2: Background Journey Artifact Generation

**Description:** As a developer, I want journey artifacts to be generated in the background during Parts 6-7, so that they're ready (or nearly ready) when the user reaches the post-ceremony dashboard.

**Acceptance Criteria:**
1. Given `[JOURNEY_GENERATE]` is detected, when generation starts, then a `ceremony_artifacts` row is created with `generation_status='pending'`
2. Given generation is in progress, when the LLM narrative task completes, then `content_json` is populated with segments and `generation_status` updates to `'ready'`
3. Given metadata is saved, when TTS generation begins, then each segment's `audio_generated` flag is updated as TTS completes
4. Given generation fails, when an error occurs, then `generation_status='failed'` and the error is logged with ceremony context
5. Given the dashboard loads and `generation_status` is not `'ready'`, when the client polls `GET /api/ceremony/journey`, then status updates are returned until ready or failed

**Technical Notes:**
- Refactor `server/api/ceremony/generate-journey.post.ts` — extract generation logic into a reusable function
- Generation function called both from `/api/chat` (background trigger) and directly (retry from dashboard)
- TTS uses configured provider (Groq default) via existing `server/utils/tts/` infrastructure
- Background execution: use `Promise` (fire-and-forget with error catching) within the chat endpoint

**Dependencies:** Story 1.1 (migration for generation_status)
**Test Requirements:**
- Unit: Generation lifecycle (pending → generating → ready)
- Unit: Failure sets generation_status='failed'
- Unit: TTS generates per-segment in background
**Estimated Complexity:** L

---

#### Story 3.3: Ceremony Complete Endpoint v2

**Description:** As a developer, I want the ceremony/complete endpoint updated for v2 (conversation_id required, recording optional, returns journey status), so that the ceremony completion flow works with the new conversation-based architecture.

**Acceptance Criteria:**
1. Given a completion request with `conversation_id`, when processed, then `user_progress.program_status` updates to `'completed'`
2. Given completion succeeds, when the database is updated, then `user_progress.ceremony_completed_at` is set to the current timestamp
3. Given no `final_recording_path`, when the request is processed, then ceremony completes successfully (recording is optional per FR-3.6)
4. Given completion succeeds, when the response is sent, then it includes `journey_artifact_status` reflecting the current `generation_status` of the reflective_journey artifact
5. Given the ceremony is already completed, when the endpoint is called again, then it returns 400 error

**Technical Notes:**
- File: `server/api/ceremony/complete.post.ts` — modify in-place
- Remove: `already_quit` parameter (AI conversation handles this)
- Remove: requirement for `reflective_journey` and `final_recording` artifacts to exist
- Add: `conversation_id` as required field
- Add: `journey_artifact_status` in response (query `ceremony_artifacts` where `artifact_type='reflective_journey'`)
- Keep: follow-up scheduling, artifact timestamp updates

**Dependencies:** Story 1.1 (migration), Story 3.2 (journey generation)
**Test Requirements:**
- Unit: Completes without final recording
- Unit: Sets `ceremony_completed_at` timestamp
- Unit: Returns correct journey_artifact_status
- Unit: Rejects duplicate completion
- Unit: conversation_id is required
**Estimated Complexity:** M

---

#### Story 3.4: Illusions Cheat Sheet Generation

**Description:** As a user who completed the ceremony, I want an illusions cheat sheet artifact generated with all 5 illusions and my personal insights, so that I have a quick reference to return to.

**Acceptance Criteria:**
1. Given the ceremony is completing, when `POST /api/ceremony/complete` is called, then a `ceremony_artifacts` row is created with `artifact_type='illusions_cheat_sheet'`
2. Given the cheat sheet is generated, when `content_json` is populated, then it contains all 5 illusions with `illusionKey`, `name`, `illusion` (what they believed), and `truth` (the reframe)
3. Given the user has a captured insight moment for an illusion, when the cheat sheet is generated, then that illusion's entry includes `userInsight` text and `insightMomentId`
4. Given the user has no captured insight moment for an illusion, when the cheat sheet is generated, then that illusion's entry has no `userInsight` field (omitted, not null or empty string)
5. Given cheat sheet generation fails, when an error occurs, then the error is logged and the ceremony completion is not blocked (cheat sheet is non-critical)

**Technical Notes:**
- Generation triggered within `server/api/ceremony/complete.post.ts` (synchronous, fast — no LLM call needed)
- Queries `user_story` for `{illusionKey}_key_insight_id` fields to find insight moments
- Queries `captured_moments` for insight text by moment ID
- Illusion names and truths are static content (can be hardcoded or stored in config)
- `content_json` follows the `CheatSheetData` interface defined in Technical Design
- `generation_status` set to `'ready'` immediately (no async generation needed)

**Dependencies:** Story 1.1 (migration), Story 3.3 (complete endpoint)
**Test Requirements:**
- Unit: Cheat sheet contains all 5 illusions
- Unit: User insights included when captured moments exist
- Unit: User insights omitted when no captured moments
- Unit: Failure does not block ceremony completion
**Estimated Complexity:** S

---

### Phase 4: Ceremony Email

#### Story 4.1: Ceremony Nudge Email

**Description:** As a user who reached ceremony eligibility but hasn't started within 24 hours, I want to receive a single nudge email, so that I'm gently reminded to complete my ceremony.

**Acceptance Criteria:**
1. Given I've been `ceremony_ready` for 24+ hours and haven't started, when the cron runs, then I receive a nudge email
2. Given I've already started or completed the ceremony, when the cron runs, then no email is sent
3. Given I've already received the nudge email, when the cron runs again, then no duplicate email is sent
4. Given my product type is known (e.g., "vape"), when the email is sent, then it references my specific product
5. Given my product type is unknown, when the email is sent, then it uses "nicotine products" as fallback
6. Given the email is sent, when I click the CTA, then I'm taken to the dashboard (standard login required)

**Technical Notes:**
- New file: `server/utils/email/ceremony-email-sender.ts`
- Modify: `server/api/cron/check-ins.get.ts` — call `processCeremonyEmails()` alongside `processScheduledCheckIns()`
- Email HTML: inline template with product type interpolation (same pattern as check-in-sender.ts)
- Query: `WHERE program_status='ceremony_ready' AND ceremony_ready_at <= now() - 24h AND ceremony_email_sent_at IS NULL AND ceremony_completed_at IS NULL`
- After send: `UPDATE user_progress SET ceremony_email_sent_at = now()`
- Set `ceremony_ready_at` when `program_status` transitions to `ceremony_ready` (in progress/complete-session endpoint)

**Dependencies:** Story 1.1 (migration for ceremony_ready_at, ceremony_email_sent_at)
**Test Requirements:**
- Unit: Email sender queries correct users
- Unit: Email template includes product type
- Unit: Skips users who already started/completed/received email
- Unit: Falls back to "nicotine products" when product unknown
**Estimated Complexity:** M

---

### Phase 5: Post-Ceremony Dashboard & Artifacts

#### Story 5.1: Post-Ceremony Dashboard Updates

**Description:** As a user who completed the ceremony, I want the dashboard to show my artifacts and reinforcement options, so that I can access my journey, message, and cheat sheet.

**Acceptance Criteria:**
1. Given I've completed the ceremony, when I visit the dashboard, then the pre-ceremony progress view is fully replaced with the post-ceremony layout
2. Given the journey artifact is ready, when I see "Your Journey", then I can tap to play it
3. Given the journey artifact is still generating, when I see "Your Journey", then a skeleton card shows "Preparing your journey..." with polling until ready
4. Given the journey artifact failed, when I see "Your Journey", then an error card shows with a "Retry" button
5. Given I recorded an audio message, when I see "Your Message", then I can play it
6. Given I typed a text message, when I see "Your Message", then the text is displayed
7. Given my `program_status` is `ceremony_ready`, when I visit the dashboard, then the ceremony CTA card is displayed ("You've seen through all five illusions... [Begin Ceremony Now]")
8. Given my `program_status` is NOT `ceremony_ready` and NOT `completed`, when I visit the dashboard, then no ceremony CTA is shown
9. Given I tap "Illusions Cheat Sheet" on the post-ceremony dashboard, when the cheat sheet page loads, then all 5 illusions are displayed with illusion name and truth
10. Given an illusion has a captured insight moment, when I view the cheat sheet, then the "Your Insight" section appears with the user's quote
11. Given an illusion has no captured insight moment, when I view the cheat sheet, then no "Your Insight" section appears (card is shorter, no empty state)

**Technical Notes:**
- File: `pages/dashboard.vue` — update post-ceremony section to handle `generation_status`
- Add polling: if journey status is `'pending'` or `'generating'`, poll `GET /api/ceremony/journey` every 3 seconds
- Retry button: calls `POST /api/ceremony/generate-journey` then resumes polling
- Skeleton card: matches existing glass card styling with loading animation
- Ceremony CTA: conditionally render based on `program_status === 'ceremony_ready'`
- Cheat sheet: vertical scroll list of 5 illusion cards, conditional "Your Insight" section per card

**Dependencies:** Story 3.2 (journey generation with status), Story 3.3 (complete endpoint v2), Story 3.4 (cheat sheet generation)
**Test Requirements:**
- E2E: Post-ceremony dashboard shows all artifact cards
- E2E: Skeleton card appears when journey generating
- E2E: Text message displayed when no audio recording
- E2E: Ceremony CTA shown when `ceremony_ready`, not shown otherwise
- E2E: Cheat sheet displays all 5 illusions; insight shown conditionally
- Unit: Polling logic (starts polling, stops when ready)
**Estimated Complexity:** L

---

#### Story 5.2: Final Core Session Tease

**Description:** As a user completing Identity Layer 3 (final core session), I want a natural tease about the ceremony, so that I feel excited about the next step.

**Acceptance Criteria:**
1. Given I complete Identity Layer 3, when the AI sends its closing message, then it includes a natural ceremony tease (e.g., "There's one more conversation ahead...")
2. Given I see the session-complete card for Identity Layer 3, when it renders, then it shows "All five illusions dismantled. Your final ceremony is ready."
3. Given the Identity Layer 3 complete card, when I see CTAs, then only "Return to Dashboard" is shown (no "Begin Ceremony" shortcut)

**Technical Notes:**
- Modify: `server/utils/prompts/` — Identity Layer 3 prompt includes ceremony tease instruction
- Modify: `components/SessionCompleteCard.vue` — add `ceremonyTease` prop for ceremony-specific copy
- Modify: `pages/session/[illusion].vue` — detect when Identity Layer 3 is completing and pass `ceremonyTease` prop
- Also: set `ceremony_ready_at` on `user_progress` when Identity Layer 3 completes (in session completion logic)

**Dependencies:** Story 1.1 (migration for ceremony_ready_at)
**Test Requirements:**
- Unit: SessionCompleteCard shows ceremony copy when ceremonyTease prop is set
- E2E: Identity Layer 3 completion shows ceremony tease card
**Estimated Complexity:** S

---

#### Story 5.3: Upload Validation Enhancement

**Description:** As a developer, I want the save-final-recording endpoint to strictly validate MIME type and file size, so that malicious or oversized uploads are rejected.

**Acceptance Criteria:**
1. Given an upload with MIME type `audio/webm`, when processed, then it succeeds
2. Given an upload with MIME type `audio/ogg`, when processed, then it succeeds
3. Given an upload with MIME type `image/png`, when processed, then it is rejected with 400 error
4. Given an upload larger than 10MB, when processed, then it is rejected with 400 error
5. Given client-side validation, when the user records beyond 5 minutes, then recording auto-stops

**Technical Notes:**
- Modify: `server/api/ceremony/save-final-recording.post.ts` — add MIME whitelist and size check before upload
- Client-side: `CeremonyRecordingInline.vue` enforces 5-min limit (auto-stop timer) and checks blob.size < 10MB

**Dependencies:** Story 2.3 (recording component)
**Test Requirements:**
- Unit: Server rejects invalid MIME types
- Unit: Server rejects oversized files
- Unit: Client auto-stops at 5 minutes
**Estimated Complexity:** S

---

### Phase 6: Background Upload Retry

#### Story 6.1: localStorage Upload Retry Queue

**Description:** As a user whose recording upload failed during the ceremony, I want the upload to be retried automatically when I return to the app, so that my recording isn't lost.

**Acceptance Criteria:**
1. Given a recording upload fails 3 times during the ceremony, when the ceremony continues, then the recording blob is saved to localStorage as a base64 data URL
2. Given a pending upload exists in localStorage, when I visit the ceremony or dashboard page, then the upload is retried automatically
3. Given the retry succeeds, when the upload completes, then the pending upload is removed from localStorage
4. Given the retry fails, when 10 total attempts have been made, then the pending upload is removed from localStorage (give up gracefully)

**Technical Notes:**
- Utility: add to `useCeremony()` or separate `usePendingUpload()` composable
- localStorage key: `'unhooked:pending-ceremony-upload'`
- Value: `PendingUpload` interface (userId, blobDataUrl, timestamp, retryCount)
- Check on mount in `ceremony.vue` and `dashboard.vue`
- Convert base64 back to Blob for upload

**Dependencies:** Story 2.3 (recording component)
**Test Requirements:**
- Unit: Saves to localStorage on final failure
- Unit: Retries on page mount
- Unit: Removes after successful retry
- Unit: Gives up after 10 attempts
**Estimated Complexity:** M

---

### Story Dependency Graph

```
Phase 1 (Foundation):
  1.1 Migration ──────────────────┐
  1.2 Layout ─────────────────────┤
  1.3 Token Protocol ─────────────┤
  1.4 SessionView ──── depends on 1.3
                                  │
Phase 2 (Conversation):           │
  2.1 useCeremony() ── depends on 1.4
  2.2 Ceremony Page ── depends on 1.2, 1.4, 2.1
  2.3 Recording UI ─── depends on 2.1
                                  │
Phase 3 (Server):                 │
  3.1 Chat Integration ─ depends on 1.3, 3.2
  3.2 Journey Generation ─ depends on 1.1
  3.3 Complete Endpoint ── depends on 1.1, 3.2
  3.4 Cheat Sheet Gen ──── depends on 1.1, 3.3
                                  │
Phase 4 (Email):                  │
  4.1 Ceremony Email ── depends on 1.1
                                  │
Phase 5 (Dashboard & Polish):     │
  5.1 Dashboard Updates ── depends on 3.2, 3.3, 3.4
  5.2 Session Tease ────── depends on 1.1
  5.3 Upload Validation ── depends on 2.3
                                  │
Phase 6 (Retry):                  │
  6.1 Upload Retry ──── depends on 2.3
```

**Parallelization opportunities:**
- Phase 1: All 4 stories can be built in parallel (1.4 starts after 1.3)
- Phase 2 + Phase 3: Can be built in parallel by different developers (client/server split)
- Phase 4: Independent, can start after migration (Story 1.1)
- Phase 5: Starts after Phase 3 completes
- Phase 6: Can be done any time after Story 2.3

---

<!-- TECH-DESIGN: Test specification for ceremony v2 -->

## Test Specification

### Unit Tests

#### `tests/unit/composables/useCeremony.test.ts`
- **should transition from pre-ceremony to conversation on startCeremony()**
- **should transition to recording phase on handleRecordingPrompt()**
- **should resume conversation after handleRecordingSaved()**
- **should call ceremony/complete API on handleSessionComplete()**
- **should retry completion up to 3 times with exponential backoff**
- **should transition to error after max retries**
- **should auto-navigate to dashboard after 5 seconds in transitioning phase**
- **should navigate immediately with prefers-reduced-motion**
- **should set ARIA announcement before transition**
- **should toggle showExitDialog on handleEscapeKey()**
- **Mock strategy:** Mock `$fetch` for API calls, `useVoiceChat` for conversation state, `navigateTo` for navigation

#### `tests/unit/components/CeremonyRecordingInline.test.ts`
- **should render idle state with mic button**
- **should transition to recording state on mic tap**
- **should show elapsed time during recording**
- **should transition to preview state on stop**
- **should show playback controls in preview state**
- **should emit @audio-saved on successful upload**
- **should emit @text-saved when text fallback is used**
- **should retry upload up to 3 times on failure**
- **should queue to localStorage after 3 failures**
- **should auto-stop recording at 5 minutes**
- **should switch to text fallback on MediaRecorder error**
- **Mock strategy:** Mock `useAudioRecorder`, mock `$fetch` for upload

#### `tests/unit/components/CeremonyExitDialog.test.ts`
- **should render when open prop is true**
- **should not render when open prop is false**
- **should emit @leave when Leave button clicked**
- **should emit @stay when Stay button clicked**
- **should have role="alertdialog" and aria-modal="true"**
- **should focus Stay button when opened**

#### `tests/unit/components/SessionView.ceremony.test.ts`
- **should emit @recording-prompt when [RECORDING_PROMPT] detected**
- **should strip [RECORDING_PROMPT] from displayed messages**
- **should strip [JOURNEY_GENERATE] from displayed messages**
- **should disable input when pause() is called**
- **should re-enable input when resume() is called**
- **Mock strategy:** Mock `useVoiceChat` with ceremony message fixtures

#### `tests/unit/ceremony/ceremony-prompt.test.ts`
- **should include 7-part structure in system prompt**
- **should include token protocol instructions**
- **should inject user story context**
- **should inject captured moments**
- **should inject product type (specific)**
- **should fall back to "nicotine products" when product type unknown**

#### `tests/unit/ceremony/ceremony-email-sender.test.ts`
- **should query users who are ceremony_ready for 24+ hours**
- **should skip users with ceremony_email_sent_at set**
- **should skip users who have completed ceremony**
- **should personalize email with product type**
- **should fall back to "nicotine products" when product unknown**
- **should set ceremony_email_sent_at after sending**
- **Mock strategy:** Mock Supabase client, mock Resend client

#### `tests/unit/ceremony/journey-generation.test.ts`
- **should create artifact row with status='pending'**
- **should update to status='generating' during LLM call**
- **should update to status='ready' when metadata saved**
- **should set status='failed' on generation error**
- **should populate content_json with segments**
- **Mock strategy:** Mock LLM task executor, mock Supabase

#### `tests/unit/ceremony/cheat-sheet-generation.test.ts`
- **should create artifact row with artifact_type='illusions_cheat_sheet'**
- **should include all 5 illusions with name, illusion, and truth**
- **should include userInsight when captured insight moment exists**
- **should omit userInsight when no captured insight moment exists**
- **should not block ceremony completion on failure**
- **should set generation_status='ready' immediately**
- **Mock strategy:** Mock Supabase for captured_moments and user_story queries

#### `tests/unit/tts/sanitize.test.ts` (extend existing)
- **should strip [RECORDING_PROMPT] from text**
- **should strip [JOURNEY_GENERATE] from text**
- (existing tests for [SESSION_COMPLETE] already pass)

#### `tests/unit/components/SessionCompleteCard.ceremony.test.ts`
- **should show ceremony tease copy when ceremonyTease prop is true**
- **should show only "Return to Dashboard" CTA when ceremonyTease is true**
- **should show normal copy when ceremonyTease is false**

### E2E Tests

#### `tests/e2e/ceremony-v2.spec.ts` (replace existing ceremony.spec.ts)

**Setup:** Mock `/api/ceremony/prepare` (returns ready=true with mock user story, moments). Mock `/api/chat` with SSE responses simulating ceremony conversation. Mock `/api/ceremony/complete`. Mock `/api/ceremony/save-final-recording`.

**Test: Full ceremony flow — happy path**
1. Navigate to `/ceremony`
2. Assert: pre-ceremony screen visible ("Set aside 15 minutes...")
3. Click "Begin Ceremony"
4. Assert: voice conversation UI visible (SessionView)
5. Mock AI sends messages through Parts 1-5
6. Mock AI sends `[RECORDING_PROMPT]`
7. Assert: recording UI slides in
8. Record and save (mock successful upload)
9. Assert: recording UI slides away, conversation resumes
10. Mock AI sends `[SESSION_COMPLETE]`
11. Assert: auto-transition to `/dashboard` after delay

**Test: Ceremony with text recording fallback**
1. Start ceremony, reach Part 6
2. Tap "or type your message"
3. Type message, submit
4. Assert: text saved via API
5. Conversation resumes for Part 7

**Test: Interruption restarts fresh**
1. Start ceremony, exchange a few messages
2. Navigate away (simulated)
3. Return to `/ceremony`
4. Assert: pre-ceremony screen shown (not mid-conversation)

**Test: Completed ceremony redirects to dashboard**
1. Mock user with ceremony_completed
2. Navigate to `/ceremony`
3. Assert: redirected to `/dashboard`

**Test: Escape key exit dialog**
1. Start ceremony
2. Press Escape
3. Assert: exit dialog visible
4. Click "Stay"
5. Assert: dialog closes, ceremony continues
6. Press Escape again
7. Click "Leave"
8. Assert: navigated to `/dashboard`

**Test: Immersive mode (no header)**
1. Navigate to `/ceremony`
2. Assert: no AppHeader visible
3. Navigate to `/dashboard`
4. Assert: AppHeader visible

#### `tests/e2e/post-ceremony-dashboard-v2.spec.ts` (extend existing)

**Test: Journey artifact loading states**
1. Mock ceremony completed, journey status='generating'
2. Navigate to `/dashboard`
3. Assert: skeleton card with "Preparing your journey..."
4. Mock status change to 'ready'
5. Assert: journey card updates to playable

**Test: Journey artifact failed with retry**
1. Mock ceremony completed, journey status='failed'
2. Navigate to `/dashboard`
3. Assert: error card with "Retry" button
4. Click "Retry"
5. Assert: skeleton card reappears (retrying)

**Test: Text message display**
1. Mock ceremony completed with text recording (no audio)
2. Navigate to `/dashboard`
3. Assert: "Your Message" card shows text content, no audio player

### Coverage Goals

**Highest risk areas (deepest coverage):**
1. `useCeremony()` — ceremony lifecycle orchestration (many state transitions, retry logic, timing)
2. `CeremonyRecordingInline` — recording states, upload failure handling, localStorage queue
3. Ceremony chat integration — token detection, journey generation trigger
4. `ceremony/complete` v2 — must not break completion flow

**"Done" for testing:**
- All unit test files listed above pass
- All E2E scenarios above pass across chromium and mobile-safari
- No regressions in existing ceremony.spec.ts tests (or replaced by ceremony-v2.spec.ts)
- No regressions in existing session.spec.ts, dashboard.spec.ts, navigation.spec.ts

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

- [x] What if user already quit? **Route to Part 5A: Symbolic disposal ritual (not skip). Includes mental gesture if no physical product remains.**
- [x] Pause/resume? **No, restart fresh if interrupted**
- [x] Journey artifact format? **Client-side sequential playback**
- [x] Where does final recording live? **Both journey capstone + standalone access**
- [x] Secondary CTA on dashboard? **Removed. Single primary CTA only.**
- [x] How to handle external motivation in Part 3? **Gently redirect to self. Internal motivation is necessary for lasting success.**
- [x] What if user says "not ready" in Part 4? **Pause and explore. Graceful exit if unresolved. Ceremony restarts fresh.**
- [x] Should moments be used beyond Part 1? **Yes — Part 5 surfaces early rationalizations for before/after contrast.**
- [x] Should Part 2 include personal insights? **No — clean summary only. Personal insights live in Illusions Cheat Sheet artifact.**
- [x] Ceremony entry from final core session? **AI teases ceremony narratively + modified session-complete card. Only "Return to Dashboard" CTA.**
- [x] Pre-ceremony screen mention product? **Yes — for everyone. "If you still have [product] around, have it nearby."**
- [x] Ceremony email strategy? **Send if not started within 24 hours of ceremony_ready status.**
- [x] How rigid should the ceremony structure be? **Guided but flexible. 7 parts define the arc; AI follows user's energy within each part.**
- [x] Post-ceremony transition? **Direct to dashboard. No intermediate screen.**
- [x] Journey artifact voice? **TTS fine for MVP since no audio capture exists yet.**
- [x] Final recording scaffolding? **Keep current AI prompt; add "tell your future self what you've learned."**
- [x] Return flow after interruption? **Dashboard with ceremony CTA, no acknowledgment of prior attempt. Clean slate.**
- [x] How does post-Part 7 transition work? **5-second auto-fade to dashboard. Respects reduced motion.**
- [x] Email follow-up cadence? **Single email at 24h only. No follow-ups.**
- [x] Long-term dashboard evolution? **Static. No changes over time.**
- [x] Special ceremony visual treatment? **No. Same UI as core sessions.**
- [x] Quit check timing (intro vs mid-ceremony)? **Pre-Part 5, not at intro. Spec is correct.**
- [x] Part 5 disposal wait behavior? **Open mic, no timeout.**
- [x] Part 6 recording transition? **Inline within conversation, no modal or page change.**
- [x] Text fallback for Part 6 recording? **Allowed. Stored in `content_text` field, `audio_path` null.**
- [x] Recording upload failure? **Allow completion after 3 retries. Background retry. Don't block emotional moment.**
- [x] What if zero captured moments? **Should be impossible. Handle gracefully with generic narrative if it occurs.**
- [x] Mic permission lost mid-ceremony? **Seamless fallback to text mode.**
- [x] Ceremony email race condition? **Check status at send time. Don't send if already completed.**
- [x] Post-complete URL access? **Redirect to dashboard.**
- [x] Ceremony header/nav? **Hidden for immersion. Exit only via browser close.**
- [x] Post-ceremony dashboard hierarchy? **Current layout is fine. Artifacts prominent at top.**
- [x] Dashboard replacement? **Full replacement. No archive view of old progress.**
- [x] Accessibility approach? **Transcript sufficient for deaf/HoH. Respect reduced motion. Existing multi-signal UI for color-blind. ARIA labels documented.**
- [x] Artifact generation timing? **Background during Parts 6-7, not after completion. Client fetches separately.**
- [x] API contract for ceremony/complete? **Remove journey_artifact from response. Client fetches via /api/ceremony/journey.**
- [x] Text message storage? **Use existing `content_text` field in ceremony_artifacts table.**

### Deferred to Post-MVP

- [ ] **Ceremony repeatability for relapse:** Should users who relapse significantly be able to do a "renewal ceremony"? Keep one-time for now. Don't prevent future reset in data model. Revisit once relapse patterns are observed.
- [ ] **Shareable artifacts:** Optional "I'm free" card or graduation moment for social sharing. Revisit based on user feedback (if users screenshot dashboard, that's a signal).
- [ ] **Audio moment capture in journey artifact:** Currently TTS reads user quotes. When audio clip capture ships, journey artifact could include user's actual voice for the "production effect."
- [ ] **Name personalization in ceremony email:** When intake form captures user names, backfill ceremony email template with name greeting.
- [ ] **Mic permission loss handling (cross-feature):** Audit voice session system for consistent mic-permission-revoked handling across core sessions and ceremony. Surfaced during ceremony UX review but applies app-wide.

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
- "nicotine products" (fallback when product type unknown or generic)

This is stored in `user_intake.products_used` and passed to ceremony prompts. If the field is missing or contains an unrecognized value, gracefully fall back to "nicotine products" — no error state needed.

### C. Existing Implementation Reference

<!-- UX-REFINED: Documented existing implementations to reuse -->
The following ceremony components already exist and should be reused/adapted for v2:

| Component | Location | Reuse Notes |
|-----------|----------|-------------|
| Ceremony flow page | `pages/ceremony.vue` | Multi-step orchestration with recording, journey player, cheat sheet |
| Journey player | `components/JourneyPlayer.vue` | Audio playback with word-by-word transcript sync |
| Voice session | `components/voice/SessionView.vue` | Conversation UI with mic, transcript, text fallback |
| Mic button | `components/voice/MicButton.vue` | Multi-signal state indicators (animation + color + label) |
| Audio waveform | `components/voice/AudioWaveform.vue` | Recording/playback visualization |
| Transcript display | `components/voice/WordByWordTranscript.vue` | Word-by-word highlighting |
| Session complete card | `components/SessionCompleteCard.vue` | Completion confirmation pattern |
| Journey playback page | `pages/journey.vue` | Standalone journey player with transcript |
| Recording save API | `server/api/ceremony/save-final-recording.post.ts` | Upload, upsert, preview cleanup |
| Ceremony complete API | `server/api/ceremony/complete.post.ts` | Artifact validation, status update |
| Final recording audio API | `server/api/ceremony/final-recording/audio.get.ts` | Signed URL retrieval |

**Key v1→v2 changes needed:**
- Remove "Already quit?" toggle from ceremony intro (quit check moves to Pre-Part 5 via AI conversation)
- Hide app header during active ceremony
- Add text input fallback for Part 6 recording
- Update ceremony/complete endpoint response (remove journey_artifact, add generation status)
- Start artifact generation during Part 6-7 instead of at completion

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 2.3 | 2026-02-08 | **User story coverage audit (v2 iteration).** FR-to-story traceability review with 6 gaps identified and 4 addressed. (1) New Story 3.4: Illusions Cheat Sheet Generation — covers FR-4.4 (artifact generation, content_json structure, insight inclusion logic). (2) Story 5.1 expanded: added ACs for ceremony eligibility CTA (FR-1.3), pre-ceremony dashboard state (FR-1.2), cheat sheet display with conditional insights (FR-5.3/5.4). Complexity bumped S→L. Added Story 3.4 as dependency. (3) Story 2.2 expanded: added ACs for pre-ceremony product name personalization and non-eligible user redirect. Added E2E test requirements. (4) Story 3.3 expanded: added explicit AC for `ceremony_completed_at` timestamp (FR-4.2) and corresponding unit test. (5) Dependency graph updated to include Story 3.4. (6) Test spec: added `cheat-sheet-generation.test.ts` (7 test cases). Skipped (by design): AI conversational behavior ACs (system prompt concern, verified via QA), conversation persistence/concurrent sessions (implicit via existing infra), NFR hardening story (MVP scope). |
| 2.2 | 2026-02-08 | **Technical design (v2 iteration).** Complete technical architecture across 12 dimensions. Key additions: (1) Architecture overview with system diagram — ceremony is now a voice-first conversation wrapping SessionView, not a step wizard. (2) LLM token protocol: `[RECORDING_PROMPT]`, `[JOURNEY_GENERATE]`, `[SESSION_COMPLETE]` for client/server ceremony transition signals. (3) Component architecture: ceremony layout (immersive), CeremonyRecordingInline (lazy-loaded), CeremonyExitDialog, SessionView extensions (pause/resume, @recording-prompt). (4) State management: `useCeremony()` orchestrator composable handling conversation → recording → completion → auto-transition lifecycle. (5) Schema migration: `ceremony_artifacts.generation_status`, `user_progress.ceremony_ready_at`, `user_progress.ceremony_email_sent_at`. (6) Journey artifact generation lifecycle: server-triggered via `[JOURNEY_GENERATE]` token, metadata-first with background TTS. (7) Ceremony email: extends existing cron endpoint, inline HTML template, product personalization. (8) Error handling: client-side retry for completion (3x exponential backoff), localStorage queue for failed uploads, dashboard retry for failed journey generation. (9) Security: enhanced upload validation (MIME whitelist, 10MB limit). (10) 14 user stories across 6 phases with acceptance criteria, dependencies, and complexity estimates. (11) Test specification: 9 unit test files (40+ test cases), 2 E2E test files (7 test scenarios). (12) Implementation dependency graph with parallelization notes. |
| 2.1 | 2026-02-08 | **Requirements refinement pass (v2 iteration).** Audit across 12 requirements dimensions with 30+ decisions. Key additions: (1) New FRs: FR-8 (final session tease trigger), FR-9 (ceremony transcript persistence). (2) FR-2 expanded: Part 4 exit mechanics (no state change), conversation infrastructure (/api/chat reuse), concurrent tab handling. (3) FR-3 expanded: unlimited re-recording, recording constraints (5 min / 10MB), client-side upload retry queue. (4) FR-4 expanded: artifact skeleton loading state, completion resilience (server-side completion is source of truth). (5) FR-5 expanded: cross-references to reinforcement-sessions-spec for "Talk to me" and "[Reinforce]" CTAs. (6) FR-6 expanded: cron-based email scheduling, CTA links to dashboard. (7) Removed duplicate FR-7.3 (covered by FR-4.6). (8) Technical Design aligned to existing implementation: ceremony/prepare + /api/chat (not ceremony/start), ceremony_artifacts table with full schema, removed non-existent user_progress fields. (9) New NFR-5 (Security): RLS, upload validation, email auth. (10) New NFR-6 (Observability): ceremony error logging with context. (11) NFR-1 split: metadata generation fast (5s), TTS audio lazy. Dashboard shell <2s. (12) NFR-2 expanded: TTS failure fallback, API failure retry, device storage handling. (13) NFR-4 expanded: WCAG 2.1 AA target, Escape key exit in immersive mode, ARIA live region for auto-transition. (14) New edge cases: device storage full, TTS failure. (15) Schema design notes: no UNIQUE constraint on artifacts (repeatability), ceremony_skipped_final_dose field mapping. (16) 17 new Key Product Decisions. |
| 2.0 | 2026-02-08 | **v2 iteration — UX refinement pass.** New implementation cycle. Comprehensive UX audit across 12 dimensions with 42 decisions made. Key additions: (1) Ceremony personas (Early Quitter, Ritual Completer). (2) Interaction Design section — disposal wait behavior, inline recording transition, post-ceremony auto-fade, mic permission loss handling. (3) Edge Cases & Error States section — AI failure, upload failure recovery, zero moments fallback, post-disposal crash, post-complete URL redirect. (4) Accessibility section — reduced motion, ARIA labels, text-only ceremony path, color-blind considerations. (5) Part 6 text fallback — users can type instead of record. (6) Immersive mode — header hidden during ceremony. (7) Updated API contract — journey artifact fetched separately, not in /ceremony/complete response. (8) Background artifact generation during Parts 6-7. (9) Email: single nudge only, status check before send, product personalization. (10) Post-ceremony dashboard: full replacement, static, no evolution. (11) Quit check confirmed at Pre-Part 5 (not intro). (12) 15 new Key Product Decisions. (13) New FRs: FR-6 (email), FR-7 (navigation). (14) New NFR-4 (accessibility). (15) Updated NFR-2.1 (upload not required for completion). (16) Appendix C: existing implementation reference with v1→v2 change list. (17) 20+ new resolved open questions. (18) 2 new deferred items (name personalization, mic permission audit). |
| 1.1 | 2026-02-07 | **Product decisions refinement (v1 iteration).** (1) Removed secondary CTA from dashboard ceremony card — single primary CTA only. (2) Replaced "skip Part 5" for already-quit users with symbolic disposal ritual (Part 5A) including mental gesture when no product remains. (3) Added rationalization moment contrast to Part 5 (both paths). (4) Added final core session tease — AI narration + modified completion card for Identity Layer 3. (5) Added external motivation handling in Part 3 (gentle redirect to self). (6) Added "not ready" handling in Part 4 (pause, explore, graceful exit). (7) Added "guided but flexible" design principle for ceremony structure. (8) Defined ceremony email trigger (24h delay). (9) Updated pre-ceremony screen with product mention. (10) Updated Part 6 recording prompt. (11) Clarified Part 2 as clean summary only (personal insights in cheat sheet). (12) Added deferred decisions: ceremony repeatability, shareable artifacts, audio moment capture. (13) Expanded Key Product Decisions table with all new decisions. |
| 1.0 | 2026-01-28 | **Initial spec for v1 implementation.** Specification created from core-program-epic.md and core-program-spec.md. |
