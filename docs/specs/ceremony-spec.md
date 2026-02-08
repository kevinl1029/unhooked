# Unhooked: Ceremony Specification

**Version:** 2.0
**Created:** 2026-01-28
**Last Updated:** 2026-02-08
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
- FR-2.2: If user exits mid-ceremony, restart from beginning on return
- FR-2.3: Detect "already quit" response at Pre-Part 5 and route to Part 5A (symbolic disposal) vs Part 5B (final dose)
- FR-2.4: Use captured moments for personalization in Part 1 and for rationalization contrast in Part 5
- FR-2.5: Handle external motivation in Part 3 by gently redirecting to internal motivation
- FR-2.6: Handle "not ready" response in Part 4 by exploring hesitation and offering graceful exit if unresolved

### FR-3: Final Recording Capture

**Description:** Record user's message to future self.

**Requirements:**
- FR-3.1: Present dedicated recording UI during Part 6 (inline transition, not modal)
- FR-3.2: Allow "Try again" if user wants to re-record
- FR-3.3: Store audio file in Supabase Storage
- FR-3.4: Link recording to `ceremony_artifacts` table with `artifact_type: 'final_recording'`
- FR-3.5: Support text fallback — if user types instead of recording, store in `content_text` field with `audio_path` null
- FR-3.6: Allow ceremony completion even if recording upload fails after retries (background retry)

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

### FR-5: Artifact Access

**Description:** Provide access to post-ceremony artifacts.

**Requirements:**
- FR-5.1: Journey artifact playable from dashboard
- FR-5.2: Final recording/message accessible standalone and within journey
- FR-5.3: Illusions cheat sheet accessible from dashboard (vertical scroll list, all 5 illusions always shown)
- FR-5.4: "Your Insight" section on cheat sheet cards only appears for illusions with captured insights

<!-- UX-REFINED: Added ceremony email and navigation requirements -->
### FR-6: Ceremony Email

**Description:** Nudge users who haven't started the ceremony.

**Requirements:**
- FR-6.1: Send single nudge email 24 hours after user reaches `ceremony_ready` status
- FR-6.2: Check user status at send time — do not send if user has already started or completed ceremony
- FR-6.3: Personalize email with user's product type when known; fall back to generic "nicotine products"
- FR-6.4: No follow-up emails after the initial nudge
- FR-6.5: No post-ceremony congratulations email

### FR-7: Ceremony Navigation

**Description:** Navigation behavior during and after ceremony.

**Requirements:**
- FR-7.1: Hide app header and navigation during active ceremony conversation (immersive mode)
- FR-7.2: Dashboard CTA is the only in-app signal for ceremony availability (no badges, toasts, or push notifications)
- FR-7.3: Redirect ceremony URL to post-ceremony dashboard if ceremony is already completed

---

## Non-Functional Requirements

### NFR-1: Performance

- NFR-1.1: Journey artifact playlist generation completes within 5 seconds
- NFR-1.2: Audio playback starts within 1 second of user action

### NFR-2: Reliability

- NFR-2.1: ~~Final recording upload must succeed before ceremony marked complete~~ **Updated:** Ceremony can complete without successful upload after 3 retries. Background retry when connectivity restores. Emotional arc takes priority over data persistence.
- NFR-2.2: Failed recording upload shows retry option (up to 3 attempts, then option to continue)

### NFR-3: Continuity

- NFR-3.1: Ceremony cannot be paused/resumed
- NFR-3.2: Incomplete ceremony progress is not persisted

<!-- UX-REFINED: Added accessibility NFRs -->
### NFR-4: Accessibility

- NFR-4.1: All animations respect `prefers-reduced-motion` setting
- NFR-4.2: Interactive elements have descriptive ARIA labels
- NFR-4.3: Recording and playback controls are keyboard-accessible
- NFR-4.4: Text-only fallback path available for entire ceremony flow

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

Mark ceremony complete and finalize artifacts.

<!-- UX-REFINED: Updated API contract — journey artifact fetched separately -->
```typescript
// Request
{
  conversation_id: string
  final_recording_path?: string  // Optional — may be null if text fallback used or upload failed
}

// Response
{
  status: 'completed'
  ceremony_completed_at: string
  journey_artifact_status: 'ready' | 'generating'  // Client fetches journey separately
}
```

**Note:** Journey artifact is no longer returned in this response. Generation begins in background during Parts 6-7. Client fetches via `GET /api/ceremony/journey` when dashboard loads.

#### `GET /api/ceremony/journey`

Retrieve journey artifact for playback.

```typescript
// Response
{
  journey: JourneyArtifact
}
```

#### `GET /api/ceremony/final-recording`

Retrieve final recording/message for playback.

<!-- UX-REFINED: Updated to support text fallback -->
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

<!-- UX-REFINED: Updated to reflect existing schema and text fallback -->
Storage uses the existing `ceremony_artifacts` table (not `user_progress`).

```typescript
// Audio recording path pattern
`ceremony-artifacts/${userId}/final-recording.webm`

// Audio upload flow
1. Client records audio via MediaRecorder API
2. Client uploads to Supabase Storage (ceremony-artifacts bucket)
3. Row created in ceremony_artifacts: artifact_type='final_recording', audio_path set, content_text=''
4. Re-recording overwrites existing artifact (upsert)

// Text message flow (fallback)
1. User types message in text input
2. Row created in ceremony_artifacts: artifact_type='final_recording', audio_path=null, content_text set
3. No Supabase Storage upload needed
```

**Existing schema:** The `ceremony_artifacts` table already supports both paths via `audio_path` (nullable) and `content_text` (nullable) fields.

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
| 1.0 | 2026-01-28 | **Initial spec for v1 implementation.** Specification created from core-program-epic.md and core-program-spec.md. |
| 1.1 | 2026-02-07 | **Product decisions refinement (v1 iteration).** (1) Removed secondary CTA from dashboard ceremony card — single primary CTA only. (2) Replaced "skip Part 5" for already-quit users with symbolic disposal ritual (Part 5A) including mental gesture when no product remains. (3) Added rationalization moment contrast to Part 5 (both paths). (4) Added final core session tease — AI narration + modified completion card for Identity Layer 3. (5) Added external motivation handling in Part 3 (gentle redirect to self). (6) Added "not ready" handling in Part 4 (pause, explore, graceful exit). (7) Added "guided but flexible" design principle for ceremony structure. (8) Defined ceremony email trigger (24h delay). (9) Updated pre-ceremony screen with product mention. (10) Updated Part 6 recording prompt. (11) Clarified Part 2 as clean summary only (personal insights in cheat sheet). (12) Added deferred decisions: ceremony repeatability, shareable artifacts, audio moment capture. (13) Expanded Key Product Decisions table with all new decisions. |
| 2.0 | 2026-02-08 | **v2 iteration — UX refinement pass.** New implementation cycle. Comprehensive UX audit across 12 dimensions with 42 decisions made. Key additions: (1) Ceremony personas (Early Quitter, Ritual Completer). (2) Interaction Design section — disposal wait behavior, inline recording transition, post-ceremony auto-fade, mic permission loss handling. (3) Edge Cases & Error States section — AI failure, upload failure recovery, zero moments fallback, post-disposal crash, post-complete URL redirect. (4) Accessibility section — reduced motion, ARIA labels, text-only ceremony path, color-blind considerations. (5) Part 6 text fallback — users can type instead of record. (6) Immersive mode — header hidden during ceremony. (7) Updated API contract — journey artifact fetched separately, not in /ceremony/complete response. (8) Background artifact generation during Parts 6-7. (9) Email: single nudge only, status check before send, product personalization. (10) Post-ceremony dashboard: full replacement, static, no evolution. (11) Quit check confirmed at Pre-Part 5 (not intro). (12) 15 new Key Product Decisions. (13) New FRs: FR-6 (email), FR-7 (navigation). (14) New NFR-4 (accessibility). (15) Updated NFR-2.1 (upload not required for completion). (16) Appendix C: existing implementation reference with v1→v2 change list. (17) 20+ new resolved open questions. (18) 2 new deferred items (name personalization, mic permission audit). |
