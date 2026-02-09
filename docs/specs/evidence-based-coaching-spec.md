# Evidence-Based Coaching Spec

**Created:** 2026-02-08
**Status:** Implemented
**Version:** 1.7
**Document Type:** Feature Specification (PRD)

---

## Table of Contents

1. [Overview](#overview)
2. [Solution](#solution)
3. [Technical Design](#technical-design)
4. [User Stories](#user-stories)
5. [Test Specification](#test-specification)
6. [Implementation Phases](#implementation-phases)
7. [Scope & Considerations](#scope--considerations)

---

## Overview

### Problem

The current Unhooked program runs a single conversation per illusion. While sessions can last up to 10 minutes and draw from the Allen Carr methodology, they aren't substantive enough to genuinely shift a user's deep-held beliefs about nicotine. The insight stays intellectual — the user may agree that "nicotine creates stress rather than relieving it," but they haven't felt it, tested it against their own daily experience, or integrated it into their sense of self.

The core-program-spec defined a 3-layer model (intellectual → emotional → identity) to address this, but it was never implemented. More importantly, building the [coaching framework guide](../guides/coaching-framework-guide.md) revealed that even a 3-layer model isn't sufficient on its own — without a structured mechanism for insights to compound between sessions, each conversation starts cold. The user has a breakthrough in one session, but the next session doesn't build on real-world evidence the user gathered in between.

The result: belief change stays surface-level. Users can articulate the reframe but haven't embodied it. By the time they reach the ceremony, they may understand the illusions intellectually without having genuinely dismantled them.

This matters because Unhooked's core philosophy is that lasting cessation comes from eliminating the desire to use — not from willpower. If the illusion-dismantling process isn't thorough enough, users fall back on willpower, which is exhausting and eventually fails.

### Goals

**Primary goal:**
- Increase the depth and durability of belief change for each illusion by implementing the evidence-based coaching model defined in the coaching framework guide

**Secondary goals:**
- Reduce repetitiveness — each session within an illusion should feel distinct in character, not the same template repeated
- Enable real-world integration — the program should bridge into the user's daily life through observation assignments, not stay confined to in-session conversations
- Build toward genuine ceremony readiness — by the time the user finishes all 5 illusions across 3 layers, they should feel genuinely ready for the ceremony, not just "done with sessions"

### Non-Goals

- **Don't change the 5-illusion structure.** The five illusions remain the same, in the same order. What changes is the session model within each illusion.
- **Don't change the ceremony.** The ceremony spec is its own feature. This spec evolves the path *to* the ceremony, not the ceremony itself.
- **Don't redesign the dashboard.** The dashboard may need minor updates to show layer progress, but a full redesign is out of scope.
- **Don't introduce Phase 2+ therapeutic methods.** ACT, MBRP, Narrative Therapy, and SDT are documented in the coaching framework guide but deferred. This spec covers Phase 1 methods only: Allen Carr, CBT, MI, and Neuroscience.
- **Don't formalize high-risk protocols or support sessions.** The coaching framework guide defines these, but they are separate from the core session model evolution.

### Success Metrics

| Metric | Target | How Measured |
|--------|--------|--------------|
| Qualitative belief shift depth | Sessions feel substantively different across layers — intellectual discovery, emotional processing, and identity integration are clearly distinct experiences | Founder self-testing through the evolved program |
| Evidence loop engagement | Observation assignments generate real-world evidence that feeds into subsequent sessions | Check-in response rates for observation-specific prompts; qualitative review of whether evidence enriches Layer 2/3 openings |
| Ceremony readiness signal | Users arriving at the ceremony feel genuinely ready — conviction scores across illusions reflect durable understanding, not just surface agreement | Conviction score distribution at ceremony readiness; qualitative assessment |

---

## Solution

### Summary

The core program evolves from one conversation per illusion to three distinct conversations — one per layer — connected by an evidence loop. Each layer has a different character: Layer 1 is analytical and Socratic, Layer 2 is emotionally exploratory, Layer 3 is identity-integrative. Between layers, the AI assigns specific real-world observations for the user to notice in their daily life. Check-ins evolve from generic engagement prompts to observation-specific evidence bridges that collect what the user noticed. The next session opens by asking about that evidence, using the user's real-world experience as material for deeper conversation. The user sees their progress as "Session 1 of 3" within each illusion — the layer names are an internal coaching concept, not user-facing.

### Relationship to Existing Specs

This spec builds on the infrastructure defined in [core-program-spec.md](core-program-spec.md), which remains the baseline record of what was originally built. Specifically:

| Existing Infrastructure | How This Spec Uses It |
|------------------------|----------------------|
| 3-layer model (intellectual, emotional, identity) | Implements the spec'd-but-unbuilt layer model with distinct session characters |
| `conviction_scores` table and `llm.session.assess` task | Conviction assessment runs after each layer session, same as spec'd |
| `SESSION_COMPLETE` detection flow | Same mechanism, now triggers per-layer (not per-illusion) |
| `user_progress` with `program_status` | Progress tracking expands to include layer completion within each illusion |
| Check-in system ([check-in-spec.md](check-in-spec.md)) | Check-ins evolve to include observation-specific evidence bridge prompts |
| Personalization engine ([personalization-engine-spec.md](personalization-engine-spec.md)) | Context builder expands to surface observation evidence in prompt context |
| Prompt assembly ([conversation-architecture-guide.md](../guides/conversation-architecture-guide.md)) | System prompt assembly becomes layer-aware |

**Co-dependency:** The [content-library-expansion-spec.md](content-library-expansion-spec.md) provides the therapeutic content that fills this spec's structural architecture. This spec defines the prompt architecture and layer-differentiated slots; the content spec fills them with CBT, MI, Neuroscience, and Allen Carr material. Both should be developed in parallel, with structural changes deployed first (functional with current content) and content expansion applied into the new structure.

<!-- UX-REFINED: Added personas section to define distinct user types for the 3-layer evidence loop model -->

### Personas

Three user personas represent distinct ways users experience the 3-layer evidence loop. These are not mutually exclusive — a user may exhibit traits of multiple personas — but they surface different UX edge cases.

#### The Analytical Skeptic

- **Mindset:** Questions everything, needs logical proof before opening up emotionally. Approaches the program like a problem to solve.
- **Behavior in the 3-layer model:** Thrives in Layer 1 (Socratic questioning, evidence examination). May resist Layer 2's emotional processing — "I already understand this logically, why are we talking about feelings?" Needs the AI to bridge from intellectual understanding to emotional relevance.
- **Evidence loop engagement:** Likely to complete observation assignments thoroughly and report detailed, analytical observations. May over-intellectualize feelings-based observations in Layer 2 assignments.
- **Key UX implication:** The AI must earn emotional permission gradually. If Layer 2 pushes too fast toward feelings, this user disengages.

#### The Emotional Processor

- **Mindset:** Leads with feelings. Knows something is wrong with their relationship to nicotine but hasn't articulated it logically. May find Layer 1's analytical approach cold or disconnected from their experience.
- **Behavior in the 3-layer model:** May struggle with Layer 1's Socratic approach — wants to talk about how nicotine makes them feel, not examine logical contradictions. Comes alive in Layer 2. Layer 3's identity work resonates deeply.
- **Evidence loop engagement:** May skip formal observation assignments but arrive at the next session with rich anecdotal evidence from their daily life — "I noticed something weird yesterday..."
- **Key UX implication:** The AI needs to validate emotional responses in Layer 1 even while guiding toward logical discovery. The structure serves this user best when Layer 1 finds emotional entry points into the analytical work.

#### The Eager Sprinter

- **Mindset:** Wants to get through the program as fast as possible. May be highly motivated or may be rushing to "get it over with." Also represents users who dropped off and returned — both types skip the evidence loop for different reasons.
- **Behavior in the 3-layer model:** Taps "Continue" immediately after session-complete screens. Starts Layer 2 right after Layer 1 without spacing. May send brief responses to move through sessions quickly. Returns after absence and needs context re-established.
- **Evidence loop engagement:** Unlikely to engage with check-ins or formal observation assignments. When the AI asks "What have you been noticing?" at the start of Layer 2, says "I haven't really noticed anything yet" or "I just finished the last one."
- **Key UX implication:** The AI must adapt gracefully to absent evidence. Sessions remain valuable even without the evidence loop — but the AI should gently surface why spacing helps without gatekeeping progress. For returning users, the abandoned session context injection (per core-program-spec) provides the AI with enough material to re-engage.

### User Scenarios

#### Primary Scenario: A User Works Through One Illusion

**User:** An active program participant currently working through the Stress Relief Illusion.

**Trigger:** User opens the app and sees their current illusion with a "Continue" button showing "Session 1 of 3."

**Flow:**

1. **Layer 1 — Intellectual Discovery.** User starts the session. The AI uses Socratic questioning, CBT evidence examination, MI reflective listening, and Allen Carr reframes to help the user logically see through the stress relief illusion. The conversation follows the Layer 1 flow from the coaching framework guide: surface the belief → explore felt experience → introduce the reframe → discover the contradiction → solidify. The session ends with the user articulating the insight in their own words. The AI delivers an observation assignment: "Between now and next time, pay attention to your stress. When you feel stressed, notice: is it the situation, or has it been a while since your last use?" The session-complete screen shows the observation assignment integrated into the settling message.

2. **Check-in (evidence bridge).** The next day, the user receives an email check-in referencing their specific assignment: "You were going to notice when stress shows up — what did you observe?" The user responds briefly. Their observation is stored.

3. **Layer 2 — Emotional Processing.** User returns and starts Session 2 of 3. The AI opens: "Last time, we talked about stress and nicotine. What have you been noticing?" If the user submitted a check-in observation, the AI has that context and can reference it. If not, the AI asks and adapts to whatever the user shares. The conversation is less analytical and more emotionally exploratory — processing anger at being deceived, grief for time lost, relief at seeing the truth. The session ends with a feeling-focused observation assignment: "Notice what you *feel* next time the stress-nicotine connection shows up — not just what you think about it."

4. **Check-in (evidence bridge).** Same pattern — specific to the feeling-focused assignment.

5. **Layer 3 — Identity Integration.** User returns for Session 3 of 3. The AI opens by asking about both evidence and feelings. The conversation focuses on who the user is becoming: "Before nicotine, how did you handle stress? Who were you then?" The session connects the illusion to their personal history, values, and future self. No observation assignment — this is the integration layer. The session ends with the user expressing a settled conviction in their own words. The AI marks the illusion completion conversationally: "You've seen through the Stress Illusion. That one's done."

6. **Illusion complete.** The session-complete screen confirms the illusion is done. The dashboard updates — the illusion card shows the completed state and the next illusion unlocks.

**Outcome:** The user has moved from intellectual agreement ("I get it, nicotine doesn't help with stress") through emotional processing ("I'm angry I believed this for years") to identity integration ("I'm someone who handles stress on my own — I always was"). The belief change is durable because it was tested against their real-world experience between sessions.

#### Variant Scenario: User Continues Immediately Without Spacing

**User:** Same participant, but they finish Layer 1 and immediately start Layer 2 without waiting, responding to a check-in, or gathering observations.

**Flow:** The user taps "Continue" on the session-complete screen, which starts the next layer immediately. The pending check-in email is cancelled (no longer needed — the user has already started the next session). Layer 2 opens with the same evidence question: "What have you been noticing?" The user says they haven't had time to observe anything yet. The AI adapts gracefully — perhaps reflecting on what came up during the Layer 1 session itself, or guiding the user through a brief in-session reflection before moving into emotional processing.

**Outcome:** The session still has value — emotional processing can draw from the in-session experience. But the evidence loop is weaker without real-world observation time. The recommended-but-not-enforced spacing encourages the richer path without blocking the eager user.

#### Variant Scenario: User Skips All Check-Ins

**User:** A participant who doesn't respond to any check-in emails throughout the program.

**Flow:** Every Layer 2 and Layer 3 session opens by asking what the user noticed. The user may share observations they made but didn't submit, or they may not have noticed anything. The AI adapts — using in-session reflection or revisiting the prior layer's key insight as a bridge. Sessions are somewhat less rich without pre-collected evidence but remain fully functional.

**Outcome:** The evidence loop degrades gracefully. Check-in evidence is enrichment, not a requirement.

<!-- UX-REFINED: Added per-illusion journey summary table -->

#### Per-Illusion Journey Summary

The Stress Relief scenario above is the canonical UX example — each illusion follows the same 3-layer flow. The coaching methodology details for each illusion (techniques, distortions, neuroscience, reframes) live in the [coaching framework guide](../guides/coaching-framework-guide.md) Section 4 (The Five Illusions — Multi-Source Mapping). Below are the UX-relevant differences: what the observation assignments target and what the Layer 3 identity shift sounds like for each.

| Illusion | Layer 1 Observation Theme | Layer 2 Observation Theme | Layer 3 Identity Shift |
|----------|--------------------------|--------------------------|----------------------|
| **Stress Relief** | Notice when stress appears — is it the situation or time since last use? | Notice what you *feel* when the stress-nicotine connection shows up | "I'm someone who handles stress on my own — I always was" |
| **Pleasure** | Next time you use, pay attention to the actual physical sensation — not the anticipation | Notice the difference between wanting it and enjoying it | "The things I actually enjoy have nothing to do with nicotine" |
| **Willpower** | Notice what you predict vs. what actually happens when a craving passes | Notice the fear — is it about the craving itself or the story you tell about it? | "I don't need willpower because there's nothing to resist" |
| **Focus** | Track your focus across a day — where are the dips? Do they line up with usage timing? | Notice how it feels when your focus dips — is it frustration, restlessness, or habit? | "I focused fine before nicotine. My brain works without it" |
| **Identity** | Notice when the label 'addict' shows up in your thinking — who put it there? | Notice how it feels to question that label — relief? Fear? Both? | "I was tricked, not broken. That's not who I am" |

<!-- REQ-REFINED: Clarified that identity shift statements are user-generated examples, not scripted AI lines -->

**Note:** These are observation *themes*, not exact copy. The AI generates personalized assignments using a hybrid model (see REQ-14). The themes ensure each illusion's observations target the right experiential domain. The Layer 3 identity shift column shows *representative examples* of what a user's own articulation might sound like after successful identity integration — these are not scripted lines the AI delivers. The AI's role is to hold space for the user to arrive at their own version of this shift.

### UX Overview

<!-- UX-REFINED: Expanded dashboard section with specific progress indicator, wireframe, and interaction details -->

#### Dashboard — ProgressCarousel Evolution

The existing dashboard uses a `ProgressCarousel` component: a single glass card containing 5 illusion circles in a horizontal row, with a focused circle enlarged and an action section at the bottom. This spec evolves the action section to show layer progress for the current illusion. The carousel structure, circle states, and navigation are unchanged.

**Existing behavior (unchanged):**
- Header: "Your Progress" + "X of 5 illusions explored"
- 5 circles in a row: completed (orange gradient + checkmark), current (orange border + pulsing dot), locked (muted + lock icon)
- Focused circle is enlarged; others scale down with distance/opacity
- "Revisit" badge below completed circles
- Desktop: arrow navigation. Mobile: swipe + progress dots.
- All 5 illusions always visible

**New behavior — action section for current illusion:**
- When the current illusion is focused, the action section adds a layer progress line: "X of 3 sessions complete" text followed by 3 inline dots — all on one line, in a smaller font size (e.g., `text-sm text-white-65`). Dots have three visual states: **filled** (completed), **orange ring outline** (current/up next), and **dim** (future). This eliminates ambiguity between "how many done" and "which one is next."
- This keeps vertical space minimal so reinforcement/moment cards remain above the fold.
- Layer names (Intellectual, Emotional, Identity) are never shown to the user.

**ProgressCarousel Wireframe — Current illusion focused:**

```
┌──────────────────────────────────────────────────────────────┐
│                        Your Progress                         │
│                   1 of 5 illusions explored                  │
│                                                              │
│       ◄    (✓)     (·)     🔒     🔒     🔒    ►            │
│           Stress  Pleasure  Will   Focus  Identity           │
│           Revisit                                            │
│                     ●  ○  ○  ○  ○                            │
│                                                              │
│  ──────────────────────────────────────────────────────────  │
│                                                              │
│           Continue: The Pleasure Illusion                     │
│           0 of 3 sessions complete  ◎ ○ ○                    │
│                                                              │
│    Discover why the "pleasure" is just an illusion            │
│    masking withdrawal.                                       │
│                                                              │
│              [        Continue        ]                       │
│                                                              │
└──────────────────────────────────────────────────────────────┘

Legend:
(✓) = Completed circle (orange gradient, checkmark icon)
(·) = Current circle (orange border, pulsing dot)
🔒  = Locked circle (muted bg, lock icon)
●/○ = Carousel navigation dots (filled = focused)
● ◎ ○ = Layer progress dots (● filled = completed, ◎ ring = current, ○ dim = future)
```

**Action section after completing Layer 1:**

```
│           Continue: The Pleasure Illusion                     │
│           1 of 3 sessions complete  ● ◎ ○                    │
│                                                              │
│    Discover why the "pleasure" is just an illusion            │
│    masking withdrawal.                                       │
│                                                              │
│              [        Continue        ]                       │
```

**Ceremony-ready state:** When all 5 illusions are complete, the ProgressCarousel is replaced by the ceremony-ready card. See [ceremony-spec.md](ceremony-spec.md) for the ceremony transition flow.

<!-- UX-REFINED: Added accessibility notes for progress indicators -->

**Accessibility:** The layer progress dots must include an `aria-label` describing the state (e.g., "1 of 3 sessions complete"). Dots use three visual states — filled white (completed, full opacity), orange ring outline (current/up next, full opacity), and dim white (future, 0.25 opacity) — ensuring they are distinguishable by more than color alone for color vision deficiency support.

#### Session Conversation — Layer-Differentiated

- **What the user sees:** A conversation with the AI coach. The user doesn't see layer labels — it's simply their next session. The conversation *feels* different because the AI's approach, tone, and questions shift per layer.
- **What the user can do:** Respond to the AI's questions, share their experiences, push back, go deep. Same conversational interface as today.
- **Feedback:** The AI adapts in real time to the user's responses using the techniques appropriate for the current layer (analytical for L1, emotionally holding for L2, identity-forward for L3).
- **Session exit:** The user can navigate back to the dashboard at any time (existing behavior). The session is abandoned. On return, a clean restart begins for that layer — the conversation doesn't resume, but captured moments from the abandoned session are injected into the prompt context so the AI can build on what was discussed. See [core-program-spec.md](core-program-spec.md) (Session Transitions) and [conversation-architecture-guide.md](../guides/conversation-architecture-guide.md) (Abandoned Session Context) for this existing pattern.

<!-- UX-REFINED: Redesigned session-complete screen with integrated observation, wireframes, and copy format -->

#### Session Complete Screen — Layers 1 & 2 (With Observation Assignment)

The existing `SessionCompleteCard` component is a centered glass card with a large checkmark icon, configurable heading/subtext props, and side-by-side CTAs (primary "Return to Dashboard" + secondary "Continue to Next Session"). This spec evolves the subtext to integrate the observation assignment.

- **What the user sees:** The existing SessionCompleteCard with the subtext replaced by a flowing paragraph combining the settling message and the observation assignment. The observation text is written in the AI's voice — the same phrasing delivered conversationally at the end of the session.
- **What the user can do:** "Return to Dashboard" (primary, orange gradient) or "Continue to Next Session" (secondary, ghost/border style). Both CTAs appear side by side on desktop, stacked on mobile — existing layout.
- **Observation card persistence:** One-time display only. Once the user navigates away, the observation text is not shown again. The check-in email provides a second touchpoint for the assignment.
- **If the user taps "Continue to Next Session":** The next layer starts immediately. The pending check-in email for this layer is cancelled (no longer needed).

**Session Complete — Layers 1 & 2 Wireframe:**

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│                        ┌──────┐                              │
│                        │  ✓   │  ← orange-bordered circle    │
│                        └──────┘     with checkmark           │
│                                                              │
│                    Session Complete                           │
│                                                              │
│   Let this settle. Between now and next time, pay            │
│   attention to your stress. When you feel stressed,          │
│   notice: is it the situation, or has it been a              │
│   while since your last use?                                 │
│                                                              │
│   Your next session will be ready tomorrow.                  │
│                                                              │
│   [Return to Dashboard]  [Continue to Next Session]          │
│    ↑ primary (orange)      ↑ secondary (ghost border)        │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Copy format:** The `subtext` prop receives a single flowing paragraph — settling intro + observation assignment + spacing recommendation. No visual separation (no card-within-card, no quote block). The observation text varies per session — generated by the AI using the hybrid model (see REQ-14).

#### Session Complete Screen — Layer 3 (No Observation Assignment)

- **What the user sees:** The same SessionCompleteCard with the standard settling subtext and no observation. The AI has already marked the illusion completion conversationally at the end of the session.
- **What the user can do:** "Return to Dashboard" only. No "Continue to Next Session" — this is the final session of the illusion (the `nextIllusion` prop controls this; when the next illusion starts a new cycle, the Continue CTA navigates to the dashboard, not directly to the next illusion's Layer 1).

**Session Complete — Layer 3 Wireframe:**

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│                        ┌──────┐                              │
│                        │  ✓   │                              │
│                        └──────┘                              │
│                                                              │
│                    Session Complete                           │
│                                                              │
│       Great work. Take a moment to let this settle.          │
│                                                              │
│              [Return to Dashboard]                            │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Note:** For Layer 3 of the *final* illusion (Identity), the SessionCompleteCard uses the ceremony-specific heading/subtext defined in [ceremony-spec.md](ceremony-spec.md): heading "Session Complete", subtext "All five illusions dismantled. Your final ceremony is ready." with only "Return to Dashboard" (no ceremony shortcut, to avoid rushing the user).

#### Check-In — Observation-Specific

- **What the user sees:** An email with a brief, specific prompt referencing their observation assignment. Example: "You were going to notice when stress shows up — what did you observe?"
- **What the user can do:** Click the magic link, land on the check-in interstitial, respond briefly.
- **Feedback:** Acknowledgment of their response. Brief, warm close — no further inquiry (per coaching framework guide's check-in pattern).
- **Timing:** Check-in emails are sent ~24 hours after the session completes. This gives the user a full day to notice things in their daily life before being prompted.
- **Cancellation:** If the user starts the next layer before the check-in email is sent, the check-in is cancelled. The next session already opened with the evidence question, making the check-in redundant.

### Key Requirements

- **REQ-1:** Each illusion consists of 3 sequential conversation sessions (Layer 1, Layer 2, Layer 3), each with a distinct session character and flow as defined in the [coaching framework guide](../guides/coaching-framework-guide.md) Section 6 (Session Flow Patterns).
- **REQ-2:** Layer 1 sessions end with a specific, concrete observation assignment delivered conversationally by the AI and displayed as an integrated paragraph on the session-complete screen.
- **REQ-3:** Layer 2 sessions end with a feeling-focused observation assignment, delivered and displayed the same way as Layer 1.
- **REQ-4:** Layer 3 sessions do not include an observation assignment. The session-complete screen shows the settling message only.
- **REQ-5:** All Layer 2 and Layer 3 sessions open by asking the user about their observations, regardless of whether evidence was submitted via check-in. The AI adapts gracefully to whatever the user shares (or doesn't share).
- **REQ-6:** Check-ins scheduled between layers are specific to the observation assignment from the prior session. The check-in prompt directly references the assignment text.
- **REQ-7:** Check-in responses (user observations) are stored and surfaced to the next session's prompt context via the personalization engine / context builder.
- **REQ-8:** The system prompt assembly becomes layer-aware: each layer receives a **generic layer instruction block** for tone, flow, and coaching approach (analytical for L1, emotional holding for L2, identity integration for L3). There are 3 layer instruction blocks total — one per layer — applied identically across all 5 illusions. The full illusion prompt is always injected; the layer instruction adds a methodological lens. Per-illusion layer adjustments are deferred to a future iteration based on manual testing.
- **REQ-9:** User progress tracks layer completion within each illusion. The ProgressCarousel's action section displays "X of 3 sessions complete" with 3 inline dots (three-state: filled/ring/dim) for the current illusion in a compact, smaller font. Layer names are not shown to the user.
- **REQ-10:** Spacing between layers is recommended via the session-complete screen messaging ("Your next session will be ready tomorrow") but not enforced. Users can start the next layer immediately via the "Continue" CTA.
- **REQ-11:** The observation assignment text is captured and stored when the AI generates it, so it can be referenced in subsequent check-ins and session openings.
- **REQ-12:** Conviction assessment (`llm.session.assess`) runs after each layer session completion, tracking conviction per illusion per layer.
- **REQ-13:** The total core program becomes 15 sessions (5 illusions × 3 layers) + 1 ceremony = 16 sessions total.

<!-- UX-REFINED: Added requirements REQ-14 through REQ-22 based on UX refinement decisions -->

- **REQ-14:** Observation assignments use a **hybrid generation model**: a template per illusion per layer provides guaranteed structure (see Per-Illusion Journey Summary table for themes), and the AI personalizes the assignment with user-specific details from the session conversation. If AI personalization fails, the system falls back to the hardcoded template for that illusion/layer.
- **REQ-15:** Layers are **forward-only**. Once a layer is completed, the user cannot redo it. Users can revisit the illusion later via reinforcement sessions after completing all 3 layers.
- **REQ-16:** Low conviction scores after Layer 3 are **not user-visible** and do not gate progression to the next illusion. Reinforcement sessions exist for users who want to return. Internal flagging of low conviction scores is **deferred to REQ-49** (analytics infrastructure).
- **REQ-17:** Cross-illusion evidence is **not surfaced**. Observations remain scoped to the illusion they were collected for. Cross-references happen naturally through the personalization engine's broader user context, not through explicit observation routing.
- **REQ-18:** The illusion completion transition uses **both conversational and UI elements**: the AI marks the completion conversationally at the end of Layer 3 ("You've seen through the [Illusion Name]. That one's done."), and the session-complete screen confirms it. The dashboard updates when the user returns.
- **REQ-19:** Check-in emails are sent **~24 hours after session completion**. If the user starts the next layer before the check-in is sent, the check-in is **cancelled**.
- **REQ-20:** The observation assignment on the session-complete screen is a **one-time display**. It is not persisted on the dashboard or accessible after navigation.
- **REQ-21:** Mid-session exit follows the **existing pattern**: clean restart with abandoned session context injection. The conversation does not resume, but captured moments from the abandoned session are available to the AI. No confirmation dialog on exit.
- **REQ-22:** The AI adapts to low-engagement users (brief responses, rushing through sessions) through its coaching approach — **no system-level minimum exchange threshold**. Conviction scores will naturally reflect shallow engagement.

<!-- REQ-REFINED: Added requirements REQ-23 through REQ-40 based on requirements refinement audit -->

#### Observation Assignment Delivery (Functional)

- **REQ-23:** The observation assignment is delivered via **prompt instruction**. The layer-aware system prompt instructs the AI to include the observation assignment in its final conversational message before `SESSION_COMPLETE`. The template text is injected into the prompt as a reference. The AI personalizes it naturally in conversation. The session-complete screen shows the AI's personalized version as subtext.
- **REQ-24:** Observation assignment templates are **full, conversational fallback text** — complete sentences ready to display on the session-complete screen as-is. Templates are stored in the **illusion prompt files** (`server/utils/prompts/illusions/`), co-located with existing illusion-specific content. There are 10 templates total (5 illusions × 2 layers with assignments; Layer 3 has none).
- **REQ-25:** The canonical observation assignment record is the **template text**, stored on `check_in_schedule.observation_assignment` when the check-in is scheduled. The session-complete screen displays the AI's personalized version (from the conversation). The check-in email uses the template-based stored record. Slight wording differences between the two are acceptable — both reference the same assignment.

#### Check-In Scheduling & Cancellation (Functional)

- **REQ-26:** Check-ins are **scheduled normally** on session completion (Layers 1 & 2). If the user taps "Continue to Next Session," the pending check-in is marked `status='cancelled'` with a cancellation reason (e.g., `'user_continued_immediately'`). The cancelled record is preserved for audit trail.
- **REQ-27:** Once a check-in is cancelled (user continued to next layer), it is **not re-scheduled** — even if the user subsequently abandons the next layer session. The observation assignment was already shown on the session-complete screen, and the next session's AI opening will ask about observations regardless.
- **REQ-28:** Evidence bridge check-ins use **~24-hour timing** (overriding the check-in spec's 2-hour default for post-session check-ins). This gives the user a full day to gather real-world observations. Existing check-ins already scheduled under the old timing are not migrated — the new timing applies to layer-session check-ins going forward.

#### Layer Progress & State (State Management)

- **REQ-29:** Layer state is **fully derived from `layer_progress`**: `not_started` (layer not in `layers_completed` and no active conversation), `in_progress` (active conversation exists for this layer), `completed` (layer value present in `layers_completed` array). The current layer is **computed** as the next incomplete layer in the ordered list `['intellectual', 'emotional', 'identity']` — no stored `current_layer` column. This computation is only performed for non-completed illusions (illusions already in `illusions_completed` are never queried for current layer). Internal layer names (`'intellectual'`, `'emotional'`, `'identity'`) match the existing `layers_completed` values. The frontend maps these to "Session 1/2/3 of 3" for display.
- **REQ-30:** Abandoned layer sessions appear **identically to not-yet-started sessions** on the dashboard. The CTA remains "Continue" with the same "X of 3 sessions complete" display. When tapped, a new conversation starts (clean restart) with abandoned session moments injected — the user doesn't see a difference. No "Resume" indicator.
- **REQ-31:** Conviction scores are **point-in-time, immutable snapshots**. Each layer's conviction score is recorded at session completion and never updated retroactively. The system can read the trajectory across layers (e.g., L1: 5, L2: 7, L3: 9) to assess deepening conviction.

#### Illusion Transitions (Functional)

- **REQ-32:** After Layer 3 completion, the next illusion **auto-unlocks** when the user returns to the dashboard. The ProgressCarousel shows the new illusion as current with "Session 1 of 3." No transition screen or unlock delay. Matches existing core-program-spec behavior.
- **REQ-33:** The AI's Layer 3 closing includes a **brief, natural preview** of the next illusion: e.g., "Next time, we'll explore something different — the idea that nicotine gives you pleasure." For the final illusion (Identity), the preview is replaced by the ceremony tease per [ceremony-spec.md](ceremony-spec.md).
- **REQ-34:** The "Revisit" badge on completed illusions triggers the **existing reinforcement session** flow (a single conversation, not the 3-layer sequence). The 3-layer sequence is a one-time program path. Forward-only per REQ-15.

#### Spacing & CTAs (Functional)

- **REQ-35:** Both CTAs on the Layer 1 & 2 session-complete screen ("Return to Dashboard" and "Continue to Next Session") are **always fully visible**. The spacing recommendation is conveyed through copy only ("Your next session will be ready tomorrow"). The "Continue" CTA is not visually de-emphasized or dimmed. Non-judgmental, clean UI.

#### Prompt Assembly (Integration)

- **REQ-36:** Layer-specific instructions are injected in the prompt assembly order **after the illusion prompt and before bridge context**: base → personalization → **cross-layer context** (Layer 2+ only: prior layer insights, breakthroughs, conviction history — already implemented in `cross-layer-context.ts`) → illusion prompt → **layer instructions** → bridge context → abandoned session context → opening instruction. Layer instructions refine the illusion prompt's approach (analytical for L1, emotional holding for L2, identity-forward for L3).

#### Data Storage (Data)

- **REQ-37:** The observation assignment text is stored as a new `observation_assignment` text field on the existing `check_in_schedule` table. This field is populated when the check-in is scheduled after session completion. The check-in email builder and context builder read it directly.
- **REQ-38:** Check-in observation responses are captured as **moments with type `'real_world_observation'`** via the existing moment detection pipeline. No new schema needed — the context builder already surfaces moments by type.
- **REQ-39:** The progress API response nests layer data **within existing illusion progress objects**: the existing `layer_progress` JSONB (containing `layers_completed` arrays per illusion) is returned as-is. The current layer is **derived client-side** by computing the next incomplete layer from the ordered list. No new top-level API fields.

#### Business Rules (Logic)

- **REQ-40:** Low conviction after Layer 3 is defined as a score **≤ 5 out of 10**. Implementation of flagging and targeting based on this threshold is **deferred to REQ-49** (analytics infrastructure). The threshold definition is preserved here for when analytics is implemented. Low conviction does not gate progression (per REQ-16).

<!-- REQ-REFINED: Added error handling, edge cases, observability, and migration requirements -->

#### Error Handling & Recovery

- **REQ-41:** If the LLM call fails on the final session message (the one expected to contain the observation assignment and `SESSION_COMPLETE`), standard **retry logic** applies (per core-program-spec). The session is NOT marked complete if retries are exhausted — the user can retry by sending another message or exit and restart later. The observation assignment is delivered on the next successful completion.
- **REQ-42:** If the observation assignment text is missing or null on the session-complete screen (template lookup failure, storage error), the screen falls back to the **generic settling message**: "Great work. Take a moment to let this settle. Your next session will be ready tomorrow." Same as Layer 3's screen. The next session's AI opening still asks about observations.
- **REQ-43:** If the conviction assessment LLM call fails after `SESSION_COMPLETE`, the error is **logged for monitoring**. The session completion and progress update are not affected (conviction tracks but does not gate). The missing score appears as null in analytics.
- **REQ-44:** Check-in email delivery failures (Resend down, cron failure) are handled by **retry on the next cron cycle**. The check-in stays in `'scheduled'` status until sent or expired. After 48 hours with no successful send, the check-in expires.
- **REQ-45:** Expired magic links on evidence bridge check-in emails redirect to the **dashboard**. If the check-in is still pending (not yet expired at the check-in level), the dashboard interstitial modal shows the check-in prompt. If also expired, the user lands on the dashboard normally.

#### Edge Cases & Concurrency

- **REQ-46:** Multi-tab/multi-device: session start requests are **validated server-side** against the user's actual layer state. If a stale client requests a layer that's already completed, the server returns the correct next layer and the client refreshes state. No duplicate sessions are possible.
- **REQ-47:** `SESSION_COMPLETE` is the **atomic trigger** for progress updates. The token is processed server-side in the streaming response handler. If the client disconnects after server-side processing, progress is saved. If before, the session is incomplete and restarts on return. No stuck states.
- **REQ-48:** Long gaps between layers (weeks or more) are handled **gracefully through existing context mechanisms**. No system-level "stale session" threshold. The context builder provides prior layer conviction scores, captured moments, and check-in responses. The AI's opening question ("What have you been noticing?") naturally adapts to the user's response regardless of time elapsed.

#### Observability & Analytics (Deferred Implementation)

The following analytics events are defined for future implementation. They are requirements of this feature but **implementation is deferred** until analytics infrastructure is in place.

- **REQ-49:** Key analytics events to track:
  - `layer_session_started` — user begins a layer session (with `myth_key`, `layer`, `time_since_last_layer`)
  - `layer_session_completed` — user completes a layer session (with `myth_key`, `layer`, `session_duration`)
  - `observation_assignment_delivered` — observation shown on session-complete screen (with `myth_key`, `layer`, `was_personalized`)
  - `check_in_evidence_submitted` — user responds to an evidence bridge check-in (with `myth_key`, `layer`, `hours_since_session`)
  - `check_in_cancelled` — check-in cancelled because user continued immediately (with `myth_key`, `layer`)
  - `conviction_score_recorded` — conviction assessed after session (with `myth_key`, `layer`, `score`)
  - `illusion_completed` — all 3 layers done for an illusion (with `myth_key`, `total_duration_days`)

#### Migration & Backwards Compatibility

- **REQ-50:** Existing users mid-program at deploy time: illusions marked `'completed'` under the old 1-session model are **honored as-is**. The user's current in-progress illusion and all future illusions use the new 3-layer model. For the current illusion, if the user completed one session under the old model, that counts as **Layer 1 completed** — they continue from Layer 2. No program restart.
- **REQ-51:** Check-ins already scheduled under the old 2-hour timing at deploy time are **sent as planned**. The new 24-hour timing applies only to check-ins scheduled for layer sessions under the new model. No migration of existing scheduled records.

<!-- UX-REFINED: Added accessibility requirements -->

### Accessibility Notes

- **Progress indicator (3 dots):** Must include `aria-label` describing the progress state (e.g., "2 of 3 sessions complete"). Dots use three visual states — filled white (completed), orange ring outline (current/up next), dim white (future) — ensuring distinguishability beyond color alone for color vision deficiency support.
- **Session-complete screen:** The integrated observation text must be readable by screen readers as part of the normal document flow (no decorative/hidden elements). CTAs must have sufficient touch target size (minimum 44x44px per WCAG).
- **Dashboard illusion cards:** Locked illusion cards should convey their locked state to screen readers (e.g., `aria-disabled="true"` with descriptive label: "The Pleasure Illusion — locked").

---

<!-- TECH-DESIGN: Complete technical architecture, data models, API contracts, component design, user stories, and test specification -->

## Technical Design

### Architectural Decisions Summary

The following decisions were made during technical design and inform all sections below:

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Layer instruction file structure | Single file `server/utils/prompts/layer-instructions.ts` | Only 3 blocks — conceptually a unit, easy to compare across layers |
| Observation templates location | Exported `OBSERVATION_TEMPLATES` map in each illusion prompt file | Co-located with illusion content per REQ-24, clean lookup by layer |
| Observation extraction from AI | Structured `[OBSERVATION_ASSIGNMENT: ...]` token after `[SESSION_COMPLETE]` | AI speaks it naturally in the message AND outputs the token. Server extracts from token, falls back to template if missing |
| Token placement | After `[SESSION_COMPLETE]` | Existing SESSION_COMPLETE detection logic unchanged. Client already stops rendering at SESSION_COMPLETE |
| Observation text storage | `observation_assignment` column on `conversations` table | Extracted synchronously by streaming handler — no race condition with background tasks |
| Check-in cancellation | Server-side on next session start | No check-in ID flows to client. Session-start logic cancels pending check-ins atomically |
| Layer tracking storage | `layer_progress` JSONB column on `user_progress` | Fast reads, single table query, matches existing `illusions_completed` array pattern |
| Check-in type for evidence bridge | New `'evidence_bridge'` type on `check_in_schedule` | Explicit separation from existing `post_session` check-ins, different timing (24hr vs 2hr) |
| Migration strategy | SQL migration script | Auditable, atomic, runs at deploy. Existing completed illusions honored per REQ-50 |
| Session complete API | Evolve existing `complete-session.post.ts` | Accepts `illusionLayer`, handles layer-within-illusion progression. Backwards compatible |
| Layer routing | From progress data (not URL) | Session page fetches progress on mount, derives current layer from `layer_progress`. URL stays clean |
| Continue flow (L1/L2) | Reload same session page | Page re-fetches progress, sees layer advanced, starts new layer. Simple, stateless |
| Complete response shape | Extend existing response | Add `layerCompleted`, `nextLayer`, `isIllusionComplete`, `observationAssignment` fields |
| Prompt template injection | Observation template embedded in layer instruction block | L1/L2 layer instructions include the template text + `[OBSERVATION_ASSIGNMENT: ...]` token instructions |
| Token rendering | Client ignores post-SESSION_COMPLETE content | No streaming handler changes needed. Server extracts token in session-complete post-processing |
| Composable API | Add computed properties to `useProgress` | `currentLayer` (derived from `layer_progress`), `layersCompletedForIllusion(key)`, `layerSessionNumber` — centralizes layer logic |
| Evidence bridge email prompt | Compose around observation at scheduling time | `prompt_template` = "You were going to [observation] — what did you observe?" — follows existing pattern |
| Prompt token budget | Within acceptable limits (3000-4000 tokens total) | No optimization needed for current models |
| Migration file structure | Single migration file | All schema changes + data migration in `20260209_evidence_based_coaching.sql` |

### System Architecture

#### High-Level Architecture

The evidence-based coaching feature evolves 5 existing system layers. No new services or infrastructure are needed.

```
┌─────────────────────────────────────────────────────────────────┐
│  CLIENT (Nuxt 3 / Vue 3)                                       │
│                                                                 │
│  pages/session/[illusion].vue  ──→  Derives current layer        │
│       │                              from layer_progress via    │
│       │                              composable on mount        │
│       ▼                                                         │
│  components/                                                    │
│   ├─ SessionCompleteCard.vue  ──→  Shows observation as subtext │
│   │   (L1/L2: observation + 2 CTAs, L3: settling + 1 CTA)      │
│   └─ ProgressCarousel.vue     ──→  Shows "X of 3 complete" dots │
│                                                                 │
│  composables/useProgress.ts   ──→  Exposes currentLayer,        │
│                                    layerSessionNumber computed  │
├─────────────────────────────────────────────────────────────────┤
│  SERVER (Nuxt 3 / Nitro)                                       │
│                                                                 │
│  api/chat.post.ts             ──→  Passes illusionLayer to      │
│       │                            buildSystemPrompt             │
│       │                            Extracts [OBSERVATION_        │
│       │                            ASSIGNMENT: ...] from         │
│       │                            full response, stores on      │
│       │                            conversations table           │
│       ▼                                                         │
│  utils/prompts/                                                 │
│   ├─ index.ts                 ──→  buildSystemPrompt gets new   │
│   │                                illusionLayer param, injects │
│   │                                layer instructions after     │
│   │                                illusion prompt               │
│   ├─ layer-instructions.ts    ──→  NEW: 3 layer instruction     │
│   │   (L1: analytical/Socratic)    blocks with observation      │
│   │   (L2: emotional holding)      template + token instructions│
│   │   (L3: identity integration)                                │
│   └─ illusions/*.ts           ──→  Each gains exported          │
│                                    OBSERVATION_TEMPLATES map     │
│                                                                 │
│  api/progress/                                                  │
│   └─ complete-session.post.ts ──→  Evolved: accepts             │
│       │                            illusionLayer, handles       │
│       │                            layer-within-illusion         │
│       │                            progression, returns         │
│       │                            observationAssignment         │
│       ▼                                                         │
│  utils/session/                                                 │
│   └─ session-complete.ts      ──→  Schedules evidence_bridge    │
│       │                            check-in with 24hr timing,   │
│       │                            stores observation text       │
│       ▼                                                         │
│  utils/scheduling/                                              │
│   └─ check-in-scheduler.ts    ──→  Supports evidence_bridge     │
│                                    type, 24hr timing,           │
│                                    composes prompt around        │
│                                    observation text              │
├─────────────────────────────────────────────────────────────────┤
│  DATABASE (Supabase PostgreSQL)                                 │
│                                                                 │
│  user_progress                ──→  + layer_progress JSONB       │
│  conversations                ──→  + observation_assignment TEXT │
│  check_in_schedule            ──→  + observation_assignment TEXT │
│                                    + cancellation_reason TEXT    │
│                                    + 'evidence_bridge' type     │
│                                    + 'cancelled' status         │
└─────────────────────────────────────────────────────────────────┘
```

#### Prompt Assembly Order (Updated)

Per REQ-36, the layer instruction is injected after the illusion prompt:

```
base system prompt (Allen Carr methodology, session structure, SESSION_COMPLETE rules)
  ↓
personalization context (intake, story, conviction, moments)
  ↓
cross-layer context (Layer 2+ only: prior layer insights, breakthroughs, conviction history)
  ↓
illusion prompt (stress/pleasure/willpower/focus/identity)
  ↓
★ layer instructions (NEW: analytical for L1, emotional for L2, identity for L3)
  ↓
  (L1/L2 only: includes observation template + [OBSERVATION_ASSIGNMENT: ...] token instructions)
  ↓
bridge context (Layer 2+ returning users: "Last time they expressed...")
  ↓
abandoned session context (if applicable: prior session moments)
  ↓
opening instruction (new conversations only)
```

#### Key Integration Points

1. **`chat.post.ts` → `buildSystemPrompt`**: Add `illusionLayer` parameter. Look up layer instruction from `layer-instructions.ts`. Look up observation template from illusion file's `OBSERVATION_TEMPLATES[layer]`.

2. **`chat.post.ts` streaming handler → `conversations` table**: After detecting `[SESSION_COMPLETE]`, parse `[OBSERVATION_ASSIGNMENT: ...]` from the full response text. Store extracted text on `conversations.observation_assignment` alongside `session_completed=true`.

3. **`complete-session.post.ts` → `conversations` table**: Read `observation_assignment` from the conversation record. Return it in the API response for the client to display.

4. **`session-complete.ts` → `check-in-scheduler.ts`**: Pass observation assignment text. Scheduler creates `evidence_bridge` check-in with 24hr timing, stores observation on `check_in_schedule.observation_assignment`, composes `prompt_template` wrapping the observation.

5. **Session page → `complete-session.post.ts`**: Send `illusionLayer` in request body. Receive `nextLayer`, `isIllusionComplete`, `observationAssignment` in response.

6. **Session page mount → progress API**: Fetch progress to derive current layer from `layer_progress` before starting the session.

7. **Next session start → check-in cancellation**: When a new conversation is created for the next layer, cancel any pending `evidence_bridge` check-in for the same user/illusion.

### Data Modeling & Storage

#### Schema Changes

##### `user_progress` — Add `layer_progress`

```sql
ALTER TABLE user_progress
ADD COLUMN layer_progress JSONB DEFAULT '{}';

COMMENT ON COLUMN user_progress.layer_progress IS
  'Tracks completed layers per illusion. Shape: {"stress_relief": ["intellectual", "emotional"], ...}';
```

**Shape:**
```json
{
  "stress_relief": ["intellectual", "emotional"],
  "pleasure": ["intellectual"],
  "willpower": [],
  "focus": [],
  "identity": []
}
```

**Access patterns:**
- Read: `layer_progress->'stress_relief'` returns array of completed layers
- Write: Append layer on completion using `jsonb_set` or application-level merge
- Default: `'{}'` — empty object means no layers completed

##### `conversations` — Add `observation_assignment`

```sql
ALTER TABLE conversations
ADD COLUMN observation_assignment TEXT;

COMMENT ON COLUMN conversations.observation_assignment IS
  'AI-personalized observation assignment text extracted from [OBSERVATION_ASSIGNMENT: ...] token';
```

##### `check_in_schedule` — Add columns and constraint values

```sql
-- New columns
ALTER TABLE check_in_schedule
ADD COLUMN observation_assignment TEXT,
ADD COLUMN cancellation_reason TEXT;

COMMENT ON COLUMN check_in_schedule.observation_assignment IS
  'Observation assignment template text for evidence bridge check-ins';
COMMENT ON COLUMN check_in_schedule.cancellation_reason IS
  'Reason for cancellation (e.g., user_continued_immediately)';

-- Update check_in_type CHECK constraint to include 'evidence_bridge'
ALTER TABLE check_in_schedule
DROP CONSTRAINT check_in_schedule_check_in_type_check;

ALTER TABLE check_in_schedule
ADD CONSTRAINT check_in_schedule_check_in_type_check
CHECK (check_in_type = ANY (ARRAY[
  'post_session'::text,
  'morning'::text,
  'evening'::text,
  'evidence_bridge'::text
]));

-- Update status CHECK constraint to include 'cancelled'
ALTER TABLE check_in_schedule
DROP CONSTRAINT check_in_schedule_status_check;

ALTER TABLE check_in_schedule
ADD CONSTRAINT check_in_schedule_status_check
CHECK (status = ANY (ARRAY[
  'scheduled'::text,
  'sent'::text,
  'opened'::text,
  'completed'::text,
  'skipped'::text,
  'expired'::text,
  'cancelled'::text
]));
```

##### Migration for Existing Users (REQ-50)

```sql
-- Existing completed illusions: set all 3 layers as completed
UPDATE user_progress
SET layer_progress = (
  SELECT jsonb_object_agg(
    key,
    '["intellectual", "emotional", "identity"]'::jsonb
  )
  FROM unnest(illusions_completed) AS completed_num
  CROSS JOIN LATERAL (
    SELECT illusion_key AS key
    FROM illusions
    WHERE illusion_number = completed_num
  ) AS illusion_keys
)
WHERE array_length(illusions_completed, 1) > 0;

-- In-progress illusions with 1+ completed conversations under old model:
-- Map to Layer 1 complete (current layer will derive to 'emotional' from layer_progress)
UPDATE user_progress up
SET
  layer_progress = COALESCE(layer_progress, '{}'::jsonb) || jsonb_build_object(
    (SELECT illusion_key FROM illusions WHERE illusion_number = up.current_illusion),
    '["intellectual"]'::jsonb
  )
WHERE program_status = 'in_progress'
AND EXISTS (
  SELECT 1 FROM conversations c
  WHERE c.user_id = up.user_id
  AND c.session_completed = true
  AND c.session_type = 'core'
  AND c.illusion_key = (
    SELECT illusion_key FROM illusions WHERE illusion_number = up.current_illusion
  )
)
AND NOT EXISTS (
  -- Guard: don't overwrite if layer_progress already has data for this illusion
  SELECT 1 WHERE layer_progress ? (
    SELECT illusion_key FROM illusions WHERE illusion_number = up.current_illusion
  )
);
```

#### Entity Relationship Summary

```
user_progress (1)
  └── layer_progress JSONB ─── tracks layers completed per illusion
  │                            (current layer derived: next incomplete in ordered list)

conversations (many per user)
  └── illusion_layer TEXT ───── layer this conversation was for
  └── observation_assignment ── AI-personalized observation text (extracted)

check_in_schedule (many per user)
  └── check_in_type ─────────── 'evidence_bridge' for layer check-ins
  └── observation_assignment ── template-based observation text
  └── cancellation_reason ───── why the check-in was cancelled
  └── status ────────────────── includes 'cancelled' state

captured_moments (many per conversation)
  └── moment_type ───────────── 'real_world_observation' for evidence responses
  └── illusion_layer TEXT ───── layer when moment was captured
```

### API Design

#### Modified Endpoints

##### `POST /api/chat` — Add layer-awareness

**Changes to request body:**
- `illusionLayer` field already accepted; no change needed. The session page will now always send the correct layer from progress data.

**Changes to streaming behavior:**
- After `[SESSION_COMPLETE]` is detected in the full response, parse for `[OBSERVATION_ASSIGNMENT: ...]` token
- Extract the text between `[OBSERVATION_ASSIGNMENT:` and `]` (or end of string)
- Store extracted text on `conversations.observation_assignment`
- If token is not found, store `null` (fallback to template happens in `complete-session`)

**Parsing logic:**
```typescript
// In onComplete handler, after detecting SESSION_COMPLETE:
const observationMatch = response.match(/\[OBSERVATION_ASSIGNMENT:\s*([\s\S]*?)\]/)
const observationAssignment = observationMatch ? observationMatch[1].trim() : null

if (observationAssignment) {
  await supabase
    .from('conversations')
    .update({ observation_assignment: observationAssignment })
    .eq('id', convId)
}
```

**Changes to prompt assembly:**
- `buildSystemPrompt` gains `illusionLayer` parameter
- Injects layer instruction block after illusion prompt
- For L1/L2: layer instruction includes observation template text + `[OBSERVATION_ASSIGNMENT: ...]` token instructions

##### `POST /api/progress/complete-session` — Layer progression

**Request body changes:**
```typescript
interface CompleteSessionBody {
  conversationId: string
  illusionKey: string
  illusionLayer?: IllusionLayer  // NEW: 'intellectual' | 'emotional' | 'identity'
}
```

**Response changes:**
```typescript
interface CompleteSessionResponse {
  progress: UserProgress
  nextIllusion: number | null       // Only set when isIllusionComplete=true
  isComplete: boolean               // Program complete (all 5 illusions)
  // NEW fields:
  layerCompleted: IllusionLayer     // Layer that was just completed
  nextLayer: IllusionLayer | null   // Next layer, or null if illusion complete
  isIllusionComplete: boolean       // All 3 layers done for this illusion
  observationAssignment: string | null  // Personalized observation text (or template fallback)
}
```

**Server logic changes:**
```
1. Derive current layer from layer_progress for this illusion (next incomplete in ordered list)
   Validate illusionLayer matches the derived current layer
   - If mismatch: return 409 with correct layer (stale client, REQ-46)

2. Read observation_assignment from conversations table for this conversationId

3. If illusionLayer is NOT 'identity' (i.e., L1 or L2):
   - Add completed layer to layer_progress JSONB
   - Determine next layer: intellectual→emotional, emotional→identity
   - Return: isIllusionComplete=false, nextLayer, observationAssignment
   - Observation assignment: use conversation's extracted text, fall back to template

4. If illusionLayer IS 'identity' (L3):
   - Add 'identity' to layer_progress JSONB
   - Add illusion to illusions_completed array
   - Calculate next illusion (existing logic)
   - Return: isIllusionComplete=true, nextLayer=null, nextIllusion, observationAssignment=null

5. Cancel any pending evidence_bridge check-ins for this user/illusion
   (Only relevant if called after L3 — but safe to always check)
```

##### `GET /api/progress` — Add layer data

**Response changes:**
The existing response returns the full `user_progress` row. The new `layer_progress` JSONB column is included automatically. No endpoint code changes needed — the `select('*')` already returns all columns.

The `useProgress` composable adds computed properties on top.

#### New Behavior: Check-In Cancellation on Session Start

When `chat.post.ts` creates a new conversation for a core session:

```typescript
// After creating the conversation, cancel any pending evidence_bridge check-ins
if (sessionType === 'core' && compatibleIllusionKey) {
  await supabase
    .from('check_in_schedule')
    .update({
      status: 'cancelled',
      cancellation_reason: 'user_continued_immediately',
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', user.sub)
    .eq('trigger_illusion_key', compatibleIllusionKey)
    .eq('check_in_type', 'evidence_bridge')
    .in('status', ['scheduled', 'sent'])
}
```

### Component Architecture

#### `SessionCompleteCard.vue` — Evolution

**Current props:** `nextIllusion`, `heading`, `subtext`
**New props:** `showContinue` (boolean, controls "Continue to Next Session" visibility)

**Logic changes:**
- For L1/L2: `subtext` receives the observation-integrated settling message. `showContinue=true`. "Continue" emits `continue-layer` (not `continue` with next illusion number).
- For L3: `subtext` receives generic settling text. `showContinue=false`. Only "Return to Dashboard" shown.
- For L3 of final illusion (Identity): heading/subtext per ceremony-spec. Only "Return to Dashboard" shown.

**Updated props interface:**
```typescript
defineProps<{
  nextIllusion?: number | null      // Next illusion (only after L3)
  heading?: string
  subtext?: string
  showContinue?: boolean            // NEW: show "Continue to Next Session" CTA
}>()
```

**Updated emits:**
```typescript
defineEmits<{
  continue: [illusionNumber: number]
  'continue-layer': []              // NEW: continue to next layer (reload page)
  dashboard: []
  finish: []
}>()
```

**Template changes:**
- The secondary "Continue" button shows when `showContinue` is true (L1/L2) instead of when `nextIllusion` is set
- For L1/L2 continue: emits `continue-layer` → session page handles by reloading
- For L3 with `nextIllusion`: shows only "Return to Dashboard" (no direct navigation to next illusion per spec)

#### `ProgressCarousel.vue` — Add layer progress dots

**New prop:**
```typescript
defineProps<{
  illusionOrder: number[]
  illusionsCompleted: number[]
  currentIllusion: number
  layerProgress?: Record<string, string[]>  // NEW: e.g., {"stress_relief": ["intellectual"]}
}>()
```

**Template addition** (in the action section for current illusion):

```html
<!-- Layer progress line (below illusion title, above description) -->
<p class="text-sm text-white-65 mb-2">
  Session {{ layerSessionNumber }} of 3
  <span class="inline-flex gap-1 ml-2" :aria-label="`${layerSessionNumber - 1} of 3 sessions complete`">
    <span v-for="i in 3" :key="i"
      class="inline-block w-2 h-2 rounded-full"
      :class="i <= completedLayerCount ? 'bg-white opacity-100' : 'bg-white opacity-35'"
      :style="i <= completedLayerCount ? 'width: 9px; height: 9px' : ''"
    />
  </span>
</p>
```

**Computed values:**
```typescript
const completedLayerCount = computed(() => {
  const key = focusedIllusion.value?.key
  return key ? (props.layerProgress?.[key]?.length ?? 0) : 0
})

const layerSessionNumber = computed(() => completedLayerCount.value + 1)
```

#### `pages/session/[illusion].vue` — Layer-aware session page

**Changes:**

1. **On mount:** Fetch progress, derive current layer for the current illusion from `layer_progress` (next incomplete in ordered list). Store in `illusionLayer` ref.

2. **Pass `illusionLayer` to chat API** in `sendOpeningMessage()` and `handleSend()`.

3. **On session complete:** Call `completeSession(conversationId, illusionKey, illusionLayer)` — receives `observationAssignment`, `nextLayer`, `isIllusionComplete`.

4. **Configure SessionCompleteCard:**
   - L1/L2: `subtext` = observation assignment text (from response, or settling fallback per REQ-42). `showContinue=true`.
   - L3: `subtext` = "Great work. Take a moment to let this settle." `showContinue=false`. `nextIllusion` = response's `nextIllusion` value (used only for the existing continue-to-next-illusion flow after L3).

5. **Handle `continue-layer` emit:** Reload the page (or call `initializeSession()` to start the new layer without full navigation).

### State Management

#### `useProgress` Composable — New computed properties

```typescript
// New exports from useProgress:

/** Current layer for the active illusion ('intellectual' | 'emotional' | 'identity') — derived from layer_progress */
const LAYER_ORDER = ['intellectual', 'emotional', 'identity'] as const

const currentLayer = computed(() => {
  if (!progress.value) return 'intellectual'
  const currentKey = getCurrentIllusionKey()
  const completed = layersCompletedForIllusion(currentKey)
  return LAYER_ORDER.find(l => !completed.includes(l)) ?? 'intellectual'
})

/** Get completed layers array for a given illusion key */
function layersCompletedForIllusion(illusionKey: string): string[] {
  const layerProgress = progress.value?.layer_progress as Record<string, string[]> | null
  return layerProgress?.[illusionKey] ?? []
}

/** Session number (1, 2, or 3) for the current illusion */
const layerSessionNumber = computed(() => {
  if (!progress.value) return 1
  const currentKey = getCurrentIllusionKey() // helper using illusion_order + current_illusion
  const completed = layersCompletedForIllusion(currentKey)
  return completed.length + 1
})

/** Full layer_progress object for passing to ProgressCarousel */
const layerProgress = computed(() =>
  (progress.value?.layer_progress as Record<string, string[]>) ?? {}
)
```

**Updated `completeSession` method:**
```typescript
async function completeSession(
  conversationId: string,
  illusionKey: string,
  illusionLayer?: string  // NEW parameter
): Promise<CompleteSessionResponse> {
  const { data } = await useFetch('/api/progress/complete-session', {
    method: 'POST',
    body: { conversationId, illusionKey, illusionLayer }
  })
  // Refresh progress after completion
  await fetchProgress()
  return data.value
}
```

#### State Flow: Session Completion

```
Session AI outputs [SESSION_COMPLETE][OBSERVATION_ASSIGNMENT: ...]
  ↓
chat.post.ts: extracts observation, stores on conversations table
  ↓
Client: detects sessionComplete=true in SSE done event
  ↓
Session page: calls completeSession(convId, illusionKey, illusionLayer)
  ↓
complete-session.post.ts:
  - Derives current layer from layer_progress, validates against request
  - Reads observation_assignment from conversations table
  - Updates layer_progress JSONB (appends completed layer)
  - If L3: also adds illusion to illusions_completed
  - Returns response with observationAssignment
  ↓
Session page: configures SessionCompleteCard with subtext + showContinue
  ↓
User taps "Continue to Next Session" (L1/L2):
  - Emits continue-layer
  - Session page reloads / re-initializes
  - Fetches updated progress
  - Derives new current layer from updated layer_progress
  - Starts new layer session
```

### Prompt Design

#### Layer Instructions (`server/utils/prompts/layer-instructions.ts`)

Three exported constants — one per layer. Each is a prompt text block injected after the illusion prompt.

**Structure per layer:**

```typescript
export const LAYER_1_INTELLECTUAL_INSTRUCTIONS = `
## Layer 1: Intellectual Discovery

### Your Approach This Session
You are guiding the user through ANALYTICAL discovery of this illusion. Your role is to help them SEE the logical contradiction — not through lecturing, but through Socratic questioning.

### Tone & Method
- Socratic: Ask questions that lead to discovery, don't state conclusions
- Evidence-based: Invite them to examine their own experience against the claim
- CBT-informed: Surface cognitive distortions gently (e.g., "What's the evidence for that?")
- MI reflective: Mirror their statements back with slight reframes
- Patient: Let them arrive at the insight themselves

### Session Flow
1. Surface the belief in their own words ("Tell me about...")
2. Explore their felt experience with this belief
3. Introduce a reframe through questioning
4. Let them discover the contradiction
5. Solidify: Ask them to express the insight in their own words

### Session Ending — Observation Assignment
Before ending this session, deliver a personalized observation assignment. Use this template as a base, but tailor it to what came up in the conversation:

TEMPLATE: {observationTemplate}

In your final message:
1. Include a settling statement (e.g., "Let this settle...")
2. Naturally deliver the observation assignment as part of your closing
3. Add a spacing recommendation: "Your next session will be ready tomorrow."
4. Then output [SESSION_COMPLETE]
5. On the next line, output [OBSERVATION_ASSIGNMENT: your personalized version of the assignment]

The [OBSERVATION_ASSIGNMENT: ...] text should match what you said in your message. It will be shown on the session-complete screen.
`

export const LAYER_2_EMOTIONAL_INSTRUCTIONS = `
## Layer 2: Emotional Processing

### Your Approach This Session
You are holding space for EMOTIONAL processing of what the user discovered intellectually in Layer 1. This is not about new information — it's about feeling what they already know.

### Opening — Evidence Bridge
Start by asking what they've been noticing since last time: "What have you been noticing about [illusion topic]?"
- If they share observations: Reflect them back, use them as material for emotional exploration
- If they haven't noticed anything: That's fine — reflect on what came up in the previous session instead
- If they mention check-in observations: Acknowledge and build on them naturally

### Tone & Method
- Emotionally holding: Create safety for feelings to emerge
- Validating: Name emotions without judgment ("That sounds like it brought up some anger")
- Reflective: Less questioning, more witnessing and mirroring
- Allow silence/space: Don't rush to fill pauses
- Normalize: Anger, grief, relief, fear — all are welcome

### Session Flow
1. Open with evidence bridge (ask about observations)
2. Revisit the intellectual insight — but ask how it FEELS
3. Hold space for emotional responses (anger at deception, grief, relief)
4. Process the emotion — don't redirect to logic
5. Solidify: Ask what they're feeling now about this illusion

### Session Ending — Observation Assignment
Before ending this session, deliver a feeling-focused observation assignment:

TEMPLATE: {observationTemplate}

In your final message:
1. Include a settling statement
2. Naturally deliver the feeling-focused observation assignment
3. Add spacing recommendation
4. Then output [SESSION_COMPLETE]
5. On the next line, output [OBSERVATION_ASSIGNMENT: your personalized version]
`

export const LAYER_3_IDENTITY_INSTRUCTIONS = `
## Layer 3: Identity Integration

### Your Approach This Session
You are facilitating IDENTITY INTEGRATION — connecting this illusion to who the user is, was, and is becoming. This is the deepest layer: it moves beyond "I understand" and "I feel" to "This is who I am."

### Opening — Evidence & Feelings Bridge
Start by asking about both observations and feelings since last time: "What have you been noticing? And what have you been feeling?"
- Build on whatever they share — observations, feelings, or both
- If they have nothing: Reflect on the journey through this illusion so far

### Tone & Method
- Identity-forward: Frame everything in terms of who they are
- Historical: Connect to their life before nicotine
- Values-based: Surface what matters to them beyond nicotine
- Future-oriented: "Who are you becoming?"
- Affirming: Reflect their identity statements back with weight

### Session Flow
1. Open with evidence + feelings bridge
2. Connect the illusion to their personal history ("Before nicotine, how did you handle this?")
3. Explore their values and identity apart from nicotine
4. Invite an identity statement — who they are becoming
5. Solidify: Let them express settled conviction in their own words

### Session Ending — No Observation Assignment
This is the final session for this illusion. There is NO observation assignment.

### Illusion Completion
In your closing message:
1. Mark the illusion completion conversationally: "You've seen through the [Illusion Name]. That one's done."
2. {nextIllusionPreview}
3. Then output [SESSION_COMPLETE]

Do NOT output [OBSERVATION_ASSIGNMENT: ...] for Layer 3.
`
```

**Note:** The `{observationTemplate}` placeholder is replaced at assembly time with the actual template text from the illusion file's `OBSERVATION_TEMPLATES` map. The `{nextIllusionPreview}` placeholder in L3 instructions is replaced by `buildSystemPrompt` with a natural next-illusion preview (e.g., "Include a brief, natural preview: Next time, we'll explore the Pleasure Illusion.") or the ceremony tease for the final illusion (per ceremony-spec.md).

#### Observation Templates (in each illusion file)

Each illusion prompt file gains an exported map:

```typescript
// In server/utils/prompts/illusions/illusion-1-stress.ts:
export const OBSERVATION_TEMPLATES: Record<string, string> = {
  intellectual: 'Between now and next time, pay attention to your stress. When you feel stressed, notice: is it the situation, or has it been a while since your last use?',
  emotional: 'Notice what you feel next time the stress-nicotine connection shows up — not just what you think about it, but what you actually feel in your body.',
}

// In server/utils/prompts/illusions/illusion-2-pleasure.ts:
export const OBSERVATION_TEMPLATES: Record<string, string> = {
  intellectual: 'Next time you use, pay attention to the actual physical sensation — not the anticipation, but the moment itself. What do you actually feel?',
  emotional: 'Notice the difference between wanting it and enjoying it. When the urge comes, pay attention to what you feel before, during, and after.',
}

// In server/utils/prompts/illusions/illusion-3-willpower.ts:
export const OBSERVATION_TEMPLATES: Record<string, string> = {
  intellectual: 'Notice what you predict vs. what actually happens when a craving passes. Before it fades, what did you think would happen? After it passes, what actually happened?',
  emotional: 'Notice the fear when a craving comes — is it about the craving itself, or about the story you tell yourself about what will happen?',
}

// In server/utils/prompts/illusions/illusion-4-focus.ts:
export const OBSERVATION_TEMPLATES: Record<string, string> = {
  intellectual: 'Track your focus across a day — where are the dips? Do they line up with when you last used, or with something else entirely?',
  emotional: 'Notice how it feels when your focus dips — is it frustration, restlessness, or just habit pulling you toward nicotine?',
}

// In server/utils/prompts/illusions/illusion-5-identity.ts:
export const OBSERVATION_TEMPLATES: Record<string, string> = {
  intellectual: 'Notice when the label "addict" or "addicted" shows up in your thinking. When it does, ask yourself: who put that label there? Did you choose it, or was it given to you?',
  emotional: 'Notice how it feels to question that label — relief? Fear? Both? Pay attention to what comes up without trying to resolve it.',
}
```

### Error Handling Implementation

| Scenario | Handler | Behavior | Spec Ref |
|----------|---------|----------|----------|
| LLM fails on final message | `chat.post.ts` streaming `onError` | Error streamed to client. Session NOT marked complete. User can retry by sending another message. | REQ-41 |
| `[OBSERVATION_ASSIGNMENT: ...]` token missing | `chat.post.ts` `onComplete` handler | `observation_assignment` stored as `null` on conversation. `complete-session.post.ts` falls back to template text from illusion file. | REQ-42 |
| Conviction assessment LLM fails | `session-complete.ts` catch block | Error logged. Session completion and progress update proceed normally. Score appears as `null` in `conviction_assessments`. | REQ-43 |
| Check-in email delivery fails | Cron retry on next cycle | Check-in stays in `'scheduled'` status. Retried on next cron run. After 48 hours, auto-expired. | REQ-44 |
| Stale client requests wrong layer | `complete-session.post.ts` validation | Returns 409 Conflict with current correct layer. Client refreshes state. | REQ-46 |
| `SESSION_COMPLETE` without client connection | Server-side atomic processing | Server marks conversation complete + stores observation even if client disconnects. Client re-syncs on next progress fetch. | REQ-47 |
| Template lookup failure | `complete-session.post.ts` | Returns generic settling message: "Great work. Take a moment to let this settle. Your next session will be ready tomorrow." | REQ-42 |

### Security Considerations

- **Server-side layer validation (REQ-46):** `complete-session.post.ts` derives the current layer from `layer_progress` and validates that the requested `illusionLayer` matches. Prevents stale clients from advancing to wrong layers.
- **No new auth surface:** All endpoints already require Supabase auth. Layer data follows existing RLS policies.
- **Input validation:** `illusionLayer` validated against allowed values (`'intellectual' | 'emotional' | 'identity'`). Invalid values return 400.
- **JSONB injection:** `layer_progress` updates use parameterized queries through Supabase client, not string concatenation.

### DevOps & Deployment

#### New Environment Variables
None required. This feature uses existing LLM, Supabase, and Resend credentials.

#### Database Migration
Single migration file: `supabase/migrations/20260209_evidence_based_coaching.sql`

Contains:
1. `user_progress.layer_progress` JSONB column
2. `conversations.observation_assignment` TEXT column
3. `check_in_schedule.observation_assignment` TEXT column
4. `check_in_schedule.cancellation_reason` TEXT column
5. `check_in_schedule.check_in_type` CHECK constraint update
6. `check_in_schedule.status` CHECK constraint update
7. Data migration for existing users (REQ-50, REQ-51)

**Deployment order:**
1. Run database migration (schema + data)
2. Deploy application code
3. Verify with smoke test: new session starts with layer-aware prompt

#### TypeScript Types Update
After migration, regenerate types: `npm run db:types` to update `types/database.types.ts` with new columns.

---

## User Stories

### Epic 1: Database & Data Layer

#### Story 1.1: Schema Migration for Evidence-Based Coaching

**Description:** As a developer, I want to run the database migration that adds layer tracking columns and constraint updates, so that the application can store evidence-based coaching data.

**Acceptance Criteria:**
1. Given the migration runs, when I inspect `user_progress`, then `layer_progress JSONB DEFAULT '{}'` column exists
2. Given the migration runs, when I inspect `conversations`, then `observation_assignment TEXT` column exists
3. Given the migration runs, when I inspect `check_in_schedule`, then `observation_assignment TEXT`, `cancellation_reason TEXT` columns exist
4. Given the migration runs, when I inspect `check_in_schedule` constraints, then `check_in_type` accepts `'evidence_bridge'` and `status` accepts `'cancelled'`
5. Given an existing user with `illusions_completed = [1, 2]`, when the migration runs, then `layer_progress` contains `{"stress_relief": ["intellectual", "emotional", "identity"], "pleasure": ["intellectual", "emotional", "identity"]}`
6. Given an existing user with `program_status = 'in_progress'` and a completed core conversation for the current illusion, when the migration runs, then `layer_progress` contains the current illusion key with `["intellectual"]` (current layer derives to `'emotional'`)
7. Given a new user with no progress, when the migration runs, then `layer_progress = '{}'` (current layer derives to `'intellectual'`)
8. Given an existing user with `program_status = 'in_progress'` and NO completed core conversations for the current illusion (started but never finished a session), when the migration runs, then `layer_progress` does NOT include that illusion key (current layer derives to `'intellectual'`)

**Technical Notes:**
- Migration file: `supabase/migrations/20260209_evidence_based_coaching.sql`
- Run `npm run db:types` after migration to regenerate TypeScript types
- Test migration against a snapshot of production data if possible

**Dependencies:** None (foundational)
**Test Requirements:** Unit test for migration SQL logic with representative test data
**Estimated Complexity:** M — Straightforward schema changes, moderate migration logic

---

### Epic 2: Prompt Architecture

#### Story 2.1: Create Layer Instruction Prompts

**Description:** As a developer, I want 3 layer instruction prompt blocks that define the AI's approach for each layer, so that sessions have distinct character (analytical, emotional, identity-forward).

**Acceptance Criteria:**
1. Given `server/utils/prompts/layer-instructions.ts` exists, when imported, then it exports `LAYER_1_INTELLECTUAL_INSTRUCTIONS`, `LAYER_2_EMOTIONAL_INSTRUCTIONS`, `LAYER_3_IDENTITY_INSTRUCTIONS`
2. Given Layer 1 instructions, when read, then they include Socratic questioning guidance, CBT evidence examination, MI reflective listening, and the `[OBSERVATION_ASSIGNMENT: ...]` token instructions
3. Given Layer 2 instructions, when read, then they include emotional holding guidance, the evidence bridge opening, and the `[OBSERVATION_ASSIGNMENT: ...]` token instructions
4. Given Layer 3 instructions, when read, then they include identity integration guidance, the evidence + feelings bridge opening, illusion completion marking, and explicitly state NO observation assignment
5. Given each layer instruction, when the `{observationTemplate}` placeholder exists (L1/L2 only), then it is replaced at assembly time with the actual template text

**Technical Notes:**
- File: `server/utils/prompts/layer-instructions.ts`
- L1/L2 instructions contain `{observationTemplate}` placeholder replaced by `buildSystemPrompt`
- L3 instructions explicitly tell AI not to output `[OBSERVATION_ASSIGNMENT: ...]`
- Reference coaching framework guide Section 6 for session flow patterns

**Dependencies:** None
**Test Requirements:** Unit test verifying exports exist and contain key phrases (Socratic, emotional, identity)
**Estimated Complexity:** M — Prompt writing is craft work, needs careful attention to tone

#### Story 2.2: Add Observation Templates to Illusion Files

**Description:** As a developer, I want observation assignment templates in each illusion prompt file, so that the AI has structured templates to personalize.

**Acceptance Criteria:**
1. Given each of the 5 illusion prompt files, when imported, then each exports an `OBSERVATION_TEMPLATES` map with `intellectual` and `emotional` keys
2. Given the Stress Relief file's `OBSERVATION_TEMPLATES.intellectual`, when read, then it contains a complete, conversational observation about stress and timing of last use
3. Given any template, when used as fallback text on the session-complete screen, then it reads naturally as a standalone paragraph
4. Given 5 files × 2 templates, then there are exactly 10 templates total

**Technical Notes:**
- Files: `server/utils/prompts/illusions/illusion-{1-5}-*.ts`
- Templates match the themes in the Per-Illusion Journey Summary table
- Templates are full sentences ready to display as-is (REQ-24)

**Dependencies:** None
**Test Requirements:** Unit test verifying all 5 files export `OBSERVATION_TEMPLATES` with both keys
**Estimated Complexity:** S — Templates are defined in the spec, just need to be added as exports

#### Story 2.3: Evolve Prompt Assembly to Inject Layer Instructions

**Description:** As a developer, I want `buildSystemPrompt` to accept `illusionLayer` and inject the corresponding layer instruction block, so that each session gets the correct coaching approach.

**Acceptance Criteria:**
1. Given `buildSystemPrompt` is called with `illusionLayer: 'intellectual'`, when the prompt is assembled, then Layer 1 instructions appear after the illusion prompt and before bridge context
2. Given `buildSystemPrompt` is called with `illusionLayer: 'intellectual'` and `illusionKey: 'stress_relief'`, when the prompt is assembled, then the `{observationTemplate}` placeholder is replaced with the stress relief intellectual template
3. Given `buildSystemPrompt` is called with `illusionLayer: 'identity'`, when the prompt is assembled, then Layer 3 instructions appear with no observation template
4. Given `buildSystemPrompt` is called without `illusionLayer`, when the prompt is assembled, then no layer instructions are injected (backwards compatible)
5. Given the assembled prompt, when tokens are counted, then the total stays under 4000 tokens for the system prompt portion
6. Given `illusionLayer: 'identity'` and `illusionKey: 'focus'` (4th illusion), when the prompt is assembled, then L3 instructions contain a natural next-illusion preview referencing the Identity Illusion (e.g., "Include a brief, natural preview: Next time, we'll explore the Identity Illusion.")
7. Given `illusionLayer: 'identity'` and `illusionKey: 'identity'` (final illusion), when the prompt is assembled, then L3 instructions contain the ceremony tease instead of a next-illusion preview (per ceremony-spec.md)

**Technical Notes:**
- File: `server/utils/prompts/index.ts`
- Add `illusionLayer?: IllusionLayer` to `BuildSystemPromptOptions`
- Import layer instructions and observation templates
- Insert after illusion prompt, before bridge context (REQ-36)
- L3 instructions contain `{nextIllusionPreview}` placeholder — replaced with next illusion name or ceremony tease based on illusion order position

**Dependencies:** Story 2.1, Story 2.2
**Test Requirements:** Unit test verifying prompt assembly order with each layer
**Estimated Complexity:** S — Straightforward string concatenation with placeholder replacement

---

### Epic 3: Session Flow & API

#### Story 3.1: Evolve Session-Complete API for Layer Progression

**Description:** As a developer, I want `complete-session.post.ts` to handle layer-within-illusion progression, so that completing L1 advances to L2 (not to the next illusion).

**Acceptance Criteria:**
1. Given a request with `illusionLayer: 'intellectual'`, when the session is completed, then `layer_progress` is updated to include `'intellectual'` for that illusion (derived current layer becomes `'emotional'`)
2. Given a request with `illusionLayer: 'emotional'`, when the session is completed, then `layer_progress` is updated to include `'emotional'` for that illusion (derived current layer becomes `'identity'`)
3. Given a request with `illusionLayer: 'identity'`, when the session is completed, then `layer_progress` includes all 3 layers, the illusion is added to `illusions_completed`
4. Given a request with `illusionLayer` that doesn't match the derived current layer (from `layer_progress`), when the request is processed, then the server returns 409 Conflict with the correct current layer
5. Given a successful completion, when the response is returned, then it includes `layerCompleted`, `nextLayer`, `isIllusionComplete`, and `observationAssignment` fields
6. Given `observation_assignment` is `null` on the conversation (token not extracted), when the response is built, then `observationAssignment` falls back to the template text for that illusion/layer
7. Given `illusionLayer` is not provided (legacy client), when the request is processed, then it behaves as before (marks entire illusion complete) for backwards compatibility
8. Given a layer session completes, when the conviction assessment runs, then the recorded score includes the `illusion_layer` value identifying which layer it was assessed at
9. Given a request with `illusionLayer: 'identity'` for the final illusion (identity), when the session is completed, then `isComplete=true` is returned and `nextIllusion=null`

**Technical Notes:**
- File: `server/api/progress/complete-session.post.ts`
- Read observation from `conversations` table, fall back to `OBSERVATION_TEMPLATES`
- Use `jsonb_set` or application-level JSONB merge for `layer_progress`
- Validate layer state server-side (REQ-46)

**Dependencies:** Story 1.1 (schema), Story 2.2 (templates for fallback)
**Test Requirements:** Unit tests for each layer transition, stale client rejection, backwards compatibility
**Estimated Complexity:** L — Core progression logic, multiple branches, backwards compatibility

#### Story 3.2: Extract Observation Assignment in Chat Streaming Handler

**Description:** As a developer, I want the chat streaming handler to extract `[OBSERVATION_ASSIGNMENT: ...]` from the AI's response and store it, so that the text is available for the session-complete screen and check-in emails.

**Acceptance Criteria:**
1. Given the AI's full response contains `[SESSION_COMPLETE]\n[OBSERVATION_ASSIGNMENT: Between now and next time, notice your stress]`, when the response is processed, then `conversations.observation_assignment` is set to "Between now and next time, notice your stress"
2. Given the AI's response contains `[SESSION_COMPLETE]` but no `[OBSERVATION_ASSIGNMENT: ...]`, when the response is processed, then `conversations.observation_assignment` is `null`
3. Given the AI's response does not contain `[SESSION_COMPLETE]`, when the response is processed, then no observation extraction is attempted
4. Given the token contains multi-line text, when extracted, then whitespace is trimmed but content is preserved

**Technical Notes:**
- File: `server/api/chat.post.ts` — both streaming and non-streaming `onComplete` paths
- Regex: `/\[OBSERVATION_ASSIGNMENT:\s*([\s\S]*?)\]/`
- Store alongside the existing `session_completed=true` update

**Dependencies:** Story 1.1 (schema for `conversations.observation_assignment`)
**Test Requirements:** Unit test for regex extraction with various formats (single line, multi-line, missing token)
**Estimated Complexity:** S — Regex parsing + one additional DB update

#### Story 3.3: Pass Layer to Chat API from Session Page

**Description:** As a developer, I want the session page to determine the current layer from progress data and pass it to the chat API, so that the AI receives the correct layer instructions.

**Acceptance Criteria:**
1. Given a user opens `/session/stress_relief`, when the page mounts, then it fetches progress and derives the current layer for the stress_relief illusion from `layer_progress`
2. Given the derived current layer is `'emotional'`, when a chat message is sent, then the request body includes `illusionLayer: 'emotional'`
3. Given the opening message is requested (empty messages array), then the request body includes the correct `illusionLayer`
4. Given the voice session view, then it also receives and passes the correct `illusionLayer`

**Technical Notes:**
- File: `pages/session/[illusion].vue`
- Fetch progress on mount using `useProgress`
- Store `illusionLayer` in a ref, pass to all chat API calls
- Also update `VoiceSessionView` to accept and use `illusionLayer` prop
- Thread `illusionLayer` through `useVoiceSession` composable — voice sessions use the same `/api/chat.post.ts` endpoint, so the layer needs to be passed from the session page → `VoiceSessionView` props → `useVoiceSession` → chat API request body

**Dependencies:** Story 2.3 (prompt assembly uses layer), useProgress composable changes (Story 5.1)
**Test Requirements:** E2E test verifying correct layer is passed to chat API
**Estimated Complexity:** S — Prop threading, straightforward

#### Story 3.4: Configure SessionCompleteCard for Layer Context

**Description:** As a developer, I want the session page to configure `SessionCompleteCard` differently for L1/L2 vs L3, so that the observation assignment is shown for layers with assignments and the correct CTAs appear.

**Acceptance Criteria:**
1. Given L1 or L2 completes, when SessionCompleteCard is shown, then `subtext` contains the observation assignment text and "Continue to Next Session" CTA is visible
2. Given L3 completes, when SessionCompleteCard is shown, then `subtext` is the generic settling message, only "Return to Dashboard" is visible
3. Given L3 of the final illusion (Identity) completes, when SessionCompleteCard is shown, then heading/subtext match ceremony-spec format
4. Given the user taps "Continue to Next Session" (L1/L2), when the session page handles the event, then it re-initializes for the next layer (fetches updated progress, starts new session)
5. Given the observation assignment is `null` (extraction failed), when SessionCompleteCard is shown, then the generic settling message with spacing recommendation is used as fallback
6. Given L3 of the Identity illusion completes (program complete, `isComplete=true`), when SessionCompleteCard is shown, then heading is "Session Complete" and subtext is "All five illusions dismantled. Your final ceremony is ready." with only "Return to Dashboard" CTA (per ceremony-spec.md)

**Technical Notes:**
- Files: `pages/session/[illusion].vue`, `components/SessionCompleteCard.vue`
- Add `showContinue` prop and `continue-layer` emit to SessionCompleteCard
- Session page uses `isIllusionComplete` and `observationAssignment` from complete-session response

**Dependencies:** Story 3.1 (API returns observation), SessionCompleteCard changes
**Test Requirements:** Unit test for SessionCompleteCard prop variations; E2E test for L1/L2 vs L3 screen
**Estimated Complexity:** M — Component evolution + session page logic

---

### Epic 4: Check-In Evolution

#### Story 4.1: Schedule Evidence Bridge Check-Ins

**Description:** As a developer, I want the session-complete handler to schedule evidence bridge check-ins with 24-hour timing and observation-specific prompts, so that users receive personalized follow-up emails.

**Acceptance Criteria:**
1. Given a Layer 1 session completes at 3pm, when check-ins are scheduled, then an `evidence_bridge` check-in is scheduled for ~3pm the next day (24 hours)
2. Given the observation assignment text is "Notice your stress patterns", when the check-in is scheduled, then `prompt_template` = "You were going to notice your stress patterns — what did you observe?" and `observation_assignment` = "Notice your stress patterns"
3. Given a Layer 2 session completes, when check-ins are scheduled, then an `evidence_bridge` check-in with the L2 observation is scheduled
4. Given a Layer 3 session completes, when check-ins are scheduled, then NO evidence bridge check-in is scheduled (L3 has no observation)
5. Given the observation text is `null` (extraction failed), when the check-in is scheduled, then the template fallback text is used for both `observation_assignment` and `prompt_template`
6. Given the check-in scheduling insert fails (e.g., Supabase error), when the error is caught, then the session completion still succeeds (check-in scheduling is non-blocking) and the error is logged for monitoring

**Technical Notes:**
- File: `server/utils/scheduling/check-in-scheduler.ts`
- Accept observation text and layer as parameters
- Use 24-hour timing instead of 2-hour for `evidence_bridge` type (REQ-28)
- Existing `post_session` check-in scheduling continues unchanged for non-layer sessions

**Dependencies:** Story 1.1 (schema), Story 3.2 (observation extraction)
**Test Requirements:** Unit test for scheduling timing, prompt composition, L3 skip behavior
**Estimated Complexity:** M — Evolves existing scheduler with new type + timing

#### Story 4.2: Cancel Evidence Bridge Check-Ins on Session Start

**Description:** As a developer, I want pending evidence bridge check-ins to be cancelled when the user starts the next layer, so that redundant emails aren't sent.

**Acceptance Criteria:**
1. Given a user has a `scheduled` evidence bridge check-in for stress_relief, when they start a new core session for stress_relief, then the check-in is updated to `status='cancelled'` with `cancellation_reason='user_continued_immediately'`
2. Given a user has a `sent` evidence bridge check-in (email already sent), when they start the next session, then the check-in is still cancelled (prevents confusion if they open the link later)
3. Given a user starts a reinforcement session (not core), when checked, then no evidence bridge check-ins are cancelled
4. Given a cancelled check-in, when the user later abandons the next layer, then the check-in is NOT re-scheduled (REQ-27)

**Technical Notes:**
- File: `server/api/chat.post.ts` — after creating a new conversation
- Cancel query: update `check_in_schedule` where user_id, trigger_illusion_key, check_in_type='evidence_bridge', status IN ('scheduled', 'sent')
- Non-blocking (fire-and-forget, log errors)

**Dependencies:** Story 1.1 (schema for `cancelled` status + `cancellation_reason`)
**Test Requirements:** Unit test for cancellation query; E2E test for continue-immediately flow
**Estimated Complexity:** S — Single update query in existing endpoint

#### Story 4.3: Update Check-In Email for Evidence Bridge Prompts

**Description:** As a developer, I want evidence bridge check-in emails to use the observation-specific prompt, so that users receive contextually relevant follow-up.

**Acceptance Criteria:**
1. Given an `evidence_bridge` check-in with `prompt_template = "You were going to notice your stress — what did you observe?"`, when the email is sent, then the email body uses this prompt
2. Given the check-in conversation starts, when the AI responds, then it speaks the check-in prompt naturally as its opening
3. Given the check-in cron job runs, when it queries for pending check-ins, then `evidence_bridge` type check-ins are included in the results
4. Given an `evidence_bridge` check-in with `observation_assignment` text, when the email is rendered, then the observation text appears in the email body

**Technical Notes:**
- The existing email template and check-in conversation flow already use `prompt_template`
- This story may require no code changes if the existing check-in email builder reads `prompt_template` correctly for the new type
- Verify that the cron job's query includes `'evidence_bridge'` in its type filter — if it filters to specific types, `evidence_bridge` must be added

**Dependencies:** Story 4.1 (scheduling creates the records)
**Test Requirements:** E2E test verifying email content matches observation prompt; unit test verifying cron query includes `evidence_bridge` type
**Estimated Complexity:** S — May require no changes, just verification

---

### Epic 5: Client State & UI

#### Story 5.1: Evolve useProgress Composable for Layer Data

**Description:** As a developer, I want the `useProgress` composable to expose layer-specific computed properties, so that components can display layer progress without duplicating logic.

**Acceptance Criteria:**
1. Given progress is loaded with `layer_progress: {"stress_relief": ["intellectual"]}` for the current illusion, when `currentLayer` is accessed, then it returns `'emotional'` (the next incomplete layer in the ordered list)
2. Given progress is loaded with `layer_progress: {"stress_relief": ["intellectual"]}`, when `layersCompletedForIllusion('stress_relief')` is called, then it returns `['intellectual']`
3. Given progress is loaded with 1 layer completed for the current illusion, when `layerSessionNumber` is accessed, then it returns `2`
4. Given `completeSession` is called with `illusionLayer` parameter, when the API responds, then the composable refreshes progress data
5. Given progress is `null` (not loaded yet), when computed properties are accessed, then they return safe defaults (`'intellectual'`, `[]`, `1`)

**Technical Notes:**
- File: `composables/useProgress.ts`
- Add `currentLayer`, `layersCompletedForIllusion()`, `layerSessionNumber`, `layerProgress` computed/methods
- Update `completeSession` signature to accept optional `illusionLayer`

**Dependencies:** Story 1.1 (layer_progress column exists)
**Test Requirements:** Unit test for each computed property with various progress states
**Estimated Complexity:** S — Computed properties over existing data

#### Story 5.2: Add Layer Progress Dots to ProgressCarousel

**Description:** As a developer, I want the ProgressCarousel to show "X of 3 sessions complete" with three-state layer progress dots for the current illusion, so that users understand their progress within an illusion.

**Acceptance Criteria:**
1. Given the current illusion is focused and 0 layers are completed, when the action section renders, then it shows "0 of 3 sessions complete ◎ ○ ○" (ring on first, dim on rest)
2. Given the current illusion is focused and 1 layer is completed, when the action section renders, then it shows "1 of 3 sessions complete ● ◎ ○" (filled, ring, dim)
3. Given the layer progress dots, when inspected, then completed dots are solid white at full opacity, the current dot has an orange ring outline at full opacity, and future dots are white at 0.25 opacity
4. Given the layer progress dots, when inspected by screen reader, then `aria-label` reads "1 of 3 sessions complete" (or equivalent)
5. Given a completed or locked illusion is focused, when the action section renders, then no layer progress dots are shown

**Technical Notes:**
- File: `components/dashboard/ProgressCarousel.vue`
- Add `layerProgress` prop (current layer is derived from `layerProgress` data, not passed separately)
- `getSessionDotStyles()` method returns three-state styles: completed (solid white 8px), current (transparent bg + 2.5px orange ring 9px), future (white 8px at 0.25 opacity)

**Dependencies:** Story 5.1 (useProgress exposes layer data), dashboard page passes props
**Test Requirements:** Unit test for dot rendering with 0, 1, 2, 3 completed layers
**Estimated Complexity:** S — Template addition + computed values

#### Story 5.3: Update Dashboard to Pass Layer Data to ProgressCarousel

**Description:** As a developer, I want the dashboard page to pass layer progress data to the ProgressCarousel component, so that layer dots render correctly.

**Acceptance Criteria:**
1. Given the dashboard loads, when ProgressCarousel is rendered, then `layerProgress` prop is passed from `useProgress`
2. Given progress data refreshes after session completion, when the dashboard is viewed, then the carousel reflects the updated layer progress

**Technical Notes:**
- File: `pages/dashboard.vue`
- Import `layerProgress` from `useProgress`
- Pass as prop to `<ProgressCarousel>`

**Dependencies:** Story 5.1, Story 5.2
**Test Requirements:** E2E test verifying dashboard shows correct layer progress
**Estimated Complexity:** S — Prop passing

---

### Epic 6: Context & Personalization

#### Story 6.1: Surface Observation Evidence in Session Context

**Description:** As a developer, I want check-in observation responses (captured as `real_world_observation` moments) to appear in the personalization context for the next session, so that the AI can reference what the user observed.

**Acceptance Criteria:**
1. Given a user submitted a check-in response that was captured as a `real_world_observation` moment, when the next session's context is built, then the observation appears in the "KEY MOMENTS" section
2. Given multiple observation moments exist, when context is assembled, then the most recent observations for this illusion are included (within the existing 5-8 moment budget)
3. Given no observation moments exist, when context is assembled, then the context is still valid (no errors)
4. Given a user submits a response to an `evidence_bridge` check-in, when the moment detection pipeline processes it, then it creates a `captured_moment` with `moment_type = 'real_world_observation'` and the correct `illusion_key`
5. Given the moment detection prompt/task definition, when updated, then it includes `real_world_observation` as a recognized moment type with classification guidance for evidence bridge check-in responses (distinct from generic `insight` or `reflection`)
6. Given a user responds to an evidence bridge check-in with an observation like "I noticed my stress was from the situation, not nicotine", when moment detection runs, then the response is classified as `real_world_observation` (not generic `insight` or `reflection`)

**Technical Notes:**
- Files: `server/utils/personalization/context-builder.ts`, `server/utils/llm/tasks/moment-detection.ts`
- The existing context builder already surfaces moments by type. `real_world_observation` is already a valid moment type in the schema.
- The moment detection pipeline's prompt/task definition needs to be updated to recognize `real_world_observation` as a valid moment type and provide classification guidance (AC#5).
- Verify that the existing moment selection in context-builder includes `real_world_observation` moments. If the existing selection logic filters to specific types, add `real_world_observation` to the allowed types.

**Dependencies:** Story 4.1 (check-ins capture observations as moments)
**Test Requirements:** Unit test verifying `real_world_observation` moments appear in context output; unit test for moment detection classification of evidence bridge responses
**Estimated Complexity:** M — Requires moment detection prompt update + context builder verification

---

### Epic 7: Integration Testing & Polish

#### Story 7.1: End-to-End Session Flow with Layer Progression

**Description:** As a developer, I want to verify the complete flow from Layer 1 through Layer 3 of a single illusion, including observation assignments, check-in scheduling, and evidence bridges.

**Acceptance Criteria:**
1. Given a new user starting the Stress Relief illusion, when they complete all 3 layers, then each layer has a distinct AI character (testable by prompt content review)
2. Given Layer 1 completes, when the session-complete screen appears, then it shows the personalized observation assignment
3. Given Layer 1 completes and 24 hours pass, when the cron runs, then an evidence bridge email is sent referencing the observation
4. Given the user returns for Layer 2, when the session starts, then the AI asks about their observations
5. Given the user continues immediately from L1 to L2 (taps "Continue"), when checked, then the evidence bridge check-in is cancelled
6. Given Layer 3 completes, when the session-complete screen appears, then no observation is shown and no "Continue" CTA appears
7. Given Layer 3 completes, when the user returns to the dashboard, then the illusion shows as completed and the next illusion unlocks

**Technical Notes:** This is a validation/integration story, not new code. Use it as a manual test checklist or E2E test scenario.

**Dependencies:** All previous stories
**Test Requirements:** E2E test covering the full 3-layer flow
**Estimated Complexity:** L — Integration testing across all layers of the stack

#### Story 7.2: Migration Validation for Existing Users

**Description:** As a developer, I want to verify that existing users' progress is correctly migrated, so that no user loses progress or gets stuck.

**Acceptance Criteria:**
1. Given a user with 2 completed illusions under the old model, when they open the dashboard after migration, then those illusions show as fully completed with all 3 layer dots filled
2. Given a user mid-program with 1 completed session on their current illusion, when they open the dashboard, then the current illusion shows "1 of 3 sessions complete ● ◎ ○"
3. Given a new user who starts after migration, when they begin the program, then they get the full 3-layer experience from the start

**Dependencies:** Story 1.1 (migration)
**Test Requirements:** Manual test with seeded data; unit test for migration SQL
**Estimated Complexity:** S — Verification story

---

## Test Specification

### Unit Tests

#### Prompt Assembly Tests
**File:** `tests/unit/prompts/layer-instructions.test.ts`

| Test Case | Description |
|-----------|-------------|
| `exports all 3 layer instruction constants` | Verify `LAYER_1_INTELLECTUAL_INSTRUCTIONS`, `LAYER_2_EMOTIONAL_INSTRUCTIONS`, `LAYER_3_IDENTITY_INSTRUCTIONS` are non-empty strings |
| `L1 instructions contain observation token guidance` | Verify contains `[OBSERVATION_ASSIGNMENT:` and `{observationTemplate}` |
| `L2 instructions contain evidence bridge opening` | Verify contains "what they've been noticing" or equivalent |
| `L3 instructions contain no observation token guidance` | Verify does NOT contain `[OBSERVATION_ASSIGNMENT:` |
| `L3 instructions contain illusion completion guidance` | Verify contains "You've seen through" or completion marking |

**File:** `tests/unit/prompts/observation-templates.test.ts`

| Test Case | Description |
|-----------|-------------|
| `all 5 illusion files export OBSERVATION_TEMPLATES` | Import each file, verify export exists |
| `each OBSERVATION_TEMPLATES has intellectual and emotional keys` | Verify both keys present in each map |
| `templates are complete sentences` | Verify each template ends with punctuation and is > 20 chars |
| `no template has identity key` | Verify Layer 3 has no template (by design) |

**File:** `tests/unit/prompts/build-system-prompt.test.ts`

| Test Case | Description |
|-----------|-------------|
| `injects layer instructions when illusionLayer provided` | Call with `illusionLayer: 'intellectual'`, verify L1 instructions present |
| `replaces {observationTemplate} with actual template` | Call with `illusionLayer: 'intellectual'`, `illusionKey: 'stress_relief'`, verify template text present |
| `does not inject layer instructions when illusionLayer omitted` | Call without `illusionLayer`, verify no layer instruction text |
| `prompt order: illusion before layer before bridge` | Call with all options, verify ordering by searching for section markers |
| `L3 has no observation template placeholder` | Call with `illusionLayer: 'identity'`, verify no `{observationTemplate}` remains |
| `L3 injects next illusion preview` | Call with `illusionLayer: 'identity'`, `illusionKey: 'focus'`, verify L3 instructions contain next-illusion preview referencing Identity Illusion |
| `L3 of final illusion injects ceremony tease` | Call with `illusionLayer: 'identity'`, `illusionKey: 'identity'`, verify L3 instructions contain ceremony tease instead of next-illusion preview |

#### API Tests
**File:** `tests/unit/api/complete-session.test.ts`

| Test Case | Description |
|-----------|-------------|
| `advances layer from intellectual to emotional` | Send L1 completion, verify `layer_progress` updated (derived current layer becomes `'emotional'`) |
| `advances layer from emotional to identity` | Send L2 completion, verify `layer_progress` updated (derived current layer becomes `'identity'`) |
| `completes illusion on identity layer` | Send L3 completion, verify illusion added to `illusions_completed`, `layer_progress` includes all 3 layers |
| `returns observationAssignment from conversation` | Mock conversation with observation text, verify response includes it |
| `falls back to template when observation is null` | Mock conversation with null observation, verify template text returned |
| `returns 409 on stale layer` | Send `illusionLayer: 'identity'` when derived current layer is `'intellectual'`, verify 409 |
| `backwards compatible without illusionLayer` | Send without `illusionLayer`, verify old behavior (full illusion complete) |
| `updates layer_progress JSONB correctly` | Verify JSONB is updated with new layer appended to correct illusion key |
| `records conviction score with illusion_layer` | Send layer completion, verify conviction assessment includes `illusion_layer` value |
| `returns isComplete=true for final illusion L3` | Send L3 for identity illusion, verify `isComplete=true` and `nextIllusion=null` |

**File:** `tests/unit/api/chat-observation-extraction.test.ts`

| Test Case | Description |
|-----------|-------------|
| `extracts observation from response with token` | Parse `[SESSION_COMPLETE]\n[OBSERVATION_ASSIGNMENT: text here]`, verify "text here" extracted |
| `handles missing observation token` | Parse `[SESSION_COMPLETE]` only, verify null |
| `handles multi-line observation text` | Parse token with newlines inside, verify preserved |
| `trims whitespace from extracted text` | Parse with extra spaces, verify trimmed |

#### Composable Tests
**File:** `tests/unit/composables/useProgress-layers.test.ts`

| Test Case | Description |
|-----------|-------------|
| `currentLayer derives next incomplete layer` | Mock `layer_progress: {"stress_relief": ["intellectual"]}` for current illusion, verify computed returns `'emotional'` |
| `currentLayer defaults to intellectual when layer_progress empty` | Mock progress with `layer_progress: {}`, verify `'intellectual'` |
| `layersCompletedForIllusion returns correct array` | Mock `layer_progress: {"stress_relief": ["intellectual"]}`, verify returns `['intellectual']` |
| `layersCompletedForIllusion returns empty array for unknown key` | Mock without the key, verify `[]` |
| `layerSessionNumber computes correctly` | Mock 1 completed layer, verify returns `2` |

#### Scheduling Tests
**File:** `tests/unit/scheduling/evidence-bridge.test.ts`

| Test Case | Description |
|-----------|-------------|
| `schedules evidence_bridge check-in with 24hr timing` | Mock session complete at 3pm, verify scheduled_for is ~3pm next day |
| `composes prompt_template around observation text` | Pass observation "notice stress", verify prompt includes "You were going to notice stress" |
| `skips scheduling for Layer 3` | Pass layer='identity', verify no check-in created |
| `stores observation_assignment on check-in record` | Verify field is populated with template text |
| `uses template fallback when observation is null` | Pass null observation, verify template text used |
| `cancels scheduled check-in on next session start` | Mock scheduled evidence_bridge check-in, start new core session for same illusion, verify status='cancelled' with cancellation_reason |
| `cancels sent check-in on next session start` | Mock sent evidence_bridge check-in, start new core session, verify status='cancelled' |
| `does not cancel check-ins for reinforcement sessions` | Mock scheduled evidence_bridge check-in, start reinforcement session, verify check-in status unchanged |
| `cancelled check-in is not re-scheduled on layer abandonment` | Mock cancelled check-in + abandoned next layer, verify no new check-in created |

### E2E Tests

**File:** `tests/e2e/evidence-based-coaching.spec.ts`

#### Flow 1: Complete Layer 1 with Observation Assignment
**Setup:** Mock authenticated user at Layer 1 of stress_relief
**Steps:**
1. Navigate to `/session/stress_relief`
2. Verify chat API is called with `illusionLayer: 'intellectual'`
3. Mock AI response ending with `[SESSION_COMPLETE]\n[OBSERVATION_ASSIGNMENT: Notice your stress patterns]`
4. Verify `SessionCompleteCard` appears with observation text in subtext
5. Verify "Continue to Next Session" CTA is visible
6. Verify "Return to Dashboard" CTA is visible
7. Click "Return to Dashboard"
8. Verify dashboard shows "1 of 3 sessions complete ● ◎ ○"

#### Flow 2: Continue Immediately to Layer 2
**Setup:** Mock user completing Layer 1
**Steps:**
1. On session-complete screen, click "Continue to Next Session"
2. Verify page re-initializes (fetches updated progress)
3. Verify chat API is called with `illusionLayer: 'emotional'`
4. Verify evidence bridge check-in was cancelled (mock API check)

#### Flow 3: Complete Layer 3 (Illusion Complete)
**Setup:** Mock user at Layer 3 of stress_relief
**Steps:**
1. Navigate to `/session/stress_relief`
2. Verify chat API is called with `illusionLayer: 'identity'`
3. Mock AI response ending with `[SESSION_COMPLETE]` (no observation token)
4. Verify `SessionCompleteCard` shows generic settling message
5. Verify NO "Continue to Next Session" CTA
6. Click "Return to Dashboard"
7. Verify stress_relief illusion shows as completed on dashboard
8. Verify next illusion (pleasure) is now current with "Session 1 of 3"

#### Flow 4: Dashboard Layer Progress Display
**Setup:** Mock user with `layer_progress: {"stress_relief": ["intellectual", "emotional", "identity"], "pleasure": ["intellectual"]}`
**Steps:**
1. Navigate to dashboard
2. Verify stress_relief shows as completed (checkmark)
3. Navigate carousel to pleasure illusion
4. Verify action section shows "1 of 3 sessions complete ● ◎ ○"
5. Verify layer dots have correct three-state styling (completed=solid white opacity 1, current=orange ring opacity 1, future=white opacity 0.25)

#### Flow 5: Stale Client Recovery (REQ-46)
**Setup:** Mock user with `layer_progress: {"stress_relief": ["intellectual"]}` (derived current layer = `'emotional'`), but client sends `illusionLayer: 'intellectual'`
**Steps:**
1. Mock complete-session API to return 409
2. Verify client refreshes progress and re-syncs

### Coverage Goals

**Highest risk areas (deepest coverage):**
- `complete-session.post.ts` layer progression logic (all 3 transitions + edge cases)
- Prompt assembly with layer injection (order matters)
- Observation extraction regex (parsing)
- Migration SQL (data integrity)

**"Done" for testing:**
- All unit tests pass
- All 5 E2E flows pass
- Manual smoke test of full 3-layer flow with real LLM (not mocked)

---

## Implementation Phases

### Phase 1: Foundation (Stories 1.1, 2.1, 2.2, 2.3)
**Goal:** Database schema in place, layer-aware prompt assembly working.
**Parallelizable:** Story 1.1 (schema) can run in parallel with Stories 2.1 + 2.2 (prompt content). Story 2.3 depends on 2.1 + 2.2.

### Phase 2: Core Session Flow (Stories 3.1, 3.2, 3.3, 3.4, 5.1)
**Goal:** Sessions work end-to-end with layer progression, observation extraction, and correct session-complete screen.
**Parallelizable:** Stories 3.2 (observation extraction) and 5.1 (composable) can run in parallel. Stories 3.3 and 3.4 depend on 3.1 + 5.1.

### Phase 3: Check-In Evolution (Stories 4.1, 4.2, 4.3)
**Goal:** Evidence bridge check-ins schedule, cancel, and send correctly.
**Parallelizable:** Story 4.2 (cancellation) can run in parallel with 4.1 (scheduling). Story 4.3 depends on 4.1.

### Phase 4: Dashboard & Polish (Stories 5.2, 5.3, 6.1)
**Goal:** Dashboard shows layer progress, context builder surfaces observation evidence.
**Parallelizable:** Stories 5.2 + 5.3 (dashboard UI) can run in parallel with 6.1 (context builder).

### Phase 5: Integration & Validation (Stories 7.1, 7.2)
**Goal:** Full end-to-end validation, migration verified.
**Sequential:** Run after all other phases complete.

```
Phase 1 (Foundation)           Phase 2 (Core Flow)         Phase 3 (Check-Ins)
┌─────────────────────┐       ┌─────────────────────┐     ┌───────────────────┐
│ 1.1 Schema Migration│──┐    │ 3.1 Complete Session │──┐  │ 4.1 Schedule       │──┐
│ 2.1 Layer Prompts   │──┤    │ 3.2 Extract Observ.  │  │  │ 4.2 Cancel Check-In│  │
│ 2.2 Obs. Templates  │──┤    │ 5.1 useProgress      │  │  │ 4.3 Email Template │──┘
│ 2.3 Prompt Assembly │──┘    │ 3.3 Pass Layer       │──┘  └───────────────────┘
└─────────────────────┘       │ 3.4 Complete Card    │
                              └─────────────────────┘

Phase 4 (Dashboard)            Phase 5 (Validation)
┌─────────────────────┐       ┌─────────────────────┐
│ 5.2 Layer Dots      │       │ 7.1 E2E Flow Test   │
│ 5.3 Dashboard Props │       │ 7.2 Migration Valid. │
│ 6.1 Context Builder │       └─────────────────────┘
└─────────────────────┘
```

---

## Scope & Considerations

### Out of Scope

- **High-risk scenario protocols** — Acute craving, social pressure, alcohol combination, emotional distress, post-slip, and anniversary regression protocols are defined in the coaching framework guide but not part of this spec. They are separate features.
- **Support sessions** — The "I need help" session pattern from the coaching framework guide is not included. It would be a separate feature.
- **Reinforcement session evolution** — The existing reinforcement-sessions-spec is not modified by this spec.
- **Phase 2+ therapeutic methods** — ACT, MBRP, Narrative Therapy, and SDT content is documented in the coaching framework guide for future use. This spec covers Phase 1 methods only.
- **Dashboard redesign** — The dashboard receives minor updates (layer progress display) but no structural redesign.
- **Ceremony changes** — The ceremony spec is unaffected. The ceremony transition flow (AI tease, modified completion card, dashboard ceremony card, pre-ceremony screen, 24-hour email nudge) is fully defined in [ceremony-spec.md](ceremony-spec.md).
- **New delivery channels** — Check-ins continue to use the existing email + magic link system. Push notifications are a future enhancement.

### Deferred / Future Enhancements

- **Adaptive depth** — Rather than fixed 3 layers per illusion, the AI dynamically assesses readiness and stays at a layer until genuine movement occurs. Deferred because it requires reliable AI assessment of readiness, which needs user data to validate.
- **Interleaved illusions** — Working on multiple illusions simultaneously and returning to earlier ones from new angles. Deferred because a linear program is easier for users to understand and commit to before the product has proven outcomes.
- **Push notification delivery** — More immediate check-in delivery for evidence bridge prompts.
- **Observation browsing UI** — A screen where users can review their submitted observations and see how their perspective has evolved. User observations are not visible to users in v1.

### Dependencies

- **core-program-spec.md** — This spec builds on the layer model, progress tracking, conviction assessment, and SESSION_COMPLETE infrastructure defined there. That infrastructure is either already built (Phases 4A-4C) or spec'd and ready for implementation.
- **content-library-expansion-spec.md** — Co-dependency. This spec defines the prompt architecture; the content spec fills it with layer-differentiated therapeutic material. Structural changes can deploy with current content; content expansion applies into the new structure.
- **coaching-framework-guide.md** — The canonical reference for session flows, coaching principles, and per-illusion technique mapping. This spec implements the structural aspects; the guide remains the source of truth for *how* the coaching works.
- **conversation-architecture-guide.md** — Documents current prompt assembly. Will need to be updated to reflect the layer-aware assembly order once this spec is implemented.
- **check-in-spec.md** — The existing check-in system evolves to support observation-specific evidence bridge prompts. The check-in spec will need targeted updates.
- **ceremony-spec.md** — Defines the full ceremony transition flow that activates when all 5 illusions are complete.

### Constraints

- **Existing prompt assembly architecture** — Changes to system prompt assembly must be compatible with the current layered approach (base prompt → personalization → illusion prompt → bridge context). The layer-awareness is an evolution of this architecture, not a replacement.

<!-- UX-REFINED: Resolved all open questions and documented decisions -->

### Resolved Questions

The following questions were open in v1.0 and have been resolved:

| Question | Decision | Rationale |
|----------|----------|-----------|
| **Observation assignment generation** | Hybrid: template per illusion/layer + AI personalization. Fallback to template if AI fails. | Balances testability (templates ensure structural correctness) with personalization (AI tailors to session content). See REQ-14. |
| **Layer transition messaging** | Both conversational and UI. AI marks completion at end of Layer 3; session-complete screen confirms it. | Existing pattern in core-program-spec. Conversational marking feels natural; UI confirmation provides clarity. See REQ-18. |
| **Cross-illusion evidence** | Evidence stays scoped to its illusion. No explicit cross-routing. | Keeps each illusion's journey self-contained. Cross-references happen naturally via personalization engine's broader context. See REQ-17. |
| **Observation storage model** | Assignment text stored as field on `check_in_schedule`. Observation responses captured as `real_world_observation` moments via existing pipeline. | Assignment text needs to be referenced by check-in emails and context builder — co-locating with the check-in record is the simplest path. Observation responses fit naturally into the existing moment detection pipeline. See REQ-37, REQ-38. |
| **Layer instruction granularity** | **Generic per layer** — 3 layer instruction blocks (one for L1, one for L2, one for L3), applied identically across all 5 illusions. Not per-illusion-per-layer. | Simplicity for v1. The illusion prompt already provides per-illusion content; the layer instruction adds a tonal/methodological lens on top. Per-illusion layer adjustments may be introduced in a future iteration based on manual testing findings. See REQ-8. |

### Open Questions

No open questions remain. All questions have been resolved through UX refinement (v1.1) and requirements refinement (v1.2).

---

## Changelog

### v1.7 — Layer Progress Dots UX Refinement (2026-02-09)

- **Three-state session dots:** Changed layer progress dots from two-state (filled/empty) to three-state: filled white (completed), orange ring outline (current/up next), dim white (future). Eliminates ambiguity where users could confuse "sessions completed" with "current session number."
- **Completion-framed text:** Changed "Session X of 3" to "X of 3 sessions complete." The dots and text now tell the same unambiguous story — both communicate completion count, while the ring dot and "Continue" CTA indicate what's next.
- **Updated:** REQ-9, REQ-30, wireframes, accessibility notes, Story 5.2 acceptance criteria, and E2E test flows to reflect the new design.

### v1.6 — Readiness Review (2026-02-08)

<!-- READINESS-REVIEWED: Full traceability audit across UX→Requirements→Stories→Acceptance Criteria -->

Definition of Ready review — 3-layer traceability audit (UX → Requirements → Stories → Acceptance Criteria). 12 gaps found, all resolved:

- **Story 1.1 (Schema Migration):** Added AC#8 — in-progress users with no completed conversations have empty `layer_progress` for that illusion (current layer derives to `'intellectual'`)
- **Story 2.3 (Prompt Assembly):** Added AC#6 (next-illusion preview in L3 instructions) and AC#7 (ceremony tease for final illusion). Added `{nextIllusionPreview}` placeholder to L3 layer instruction prompt and technical note for placeholder replacement logic.
- **Story 3.3 (Pass Layer to Chat API):** Added technical note for voice session path — thread `illusionLayer` through `VoiceSessionView` props → `useVoiceSession` composable → chat API request body
- **Story 3.4 (SessionCompleteCard):** Added AC#6 — program-complete state (L3 of Identity illusion) shows ceremony-specific heading/subtext per ceremony-spec.md
- **Story 4.1 (Schedule Check-Ins):** Added AC#6 — check-in scheduling failure is non-blocking (session completion succeeds, error logged)
- **Story 6.1 (Observation Evidence):** Expanded from verification to implementation scope. Added AC#5 (moment detection prompt update to recognize `real_world_observation` type) and AC#6 (classification behavior for evidence bridge responses). Updated complexity S→M. Added `moment-detection.ts` to technical notes.
- **Test specification:** Added 4 cancellation test cases to `evidence-bridge.test.ts`. Added 2 prompt assembly test cases for L3 next-illusion preview and ceremony tease.
- **Confirmed existing schema:** `conversations.illusion_layer` and `captured_moments.illusion_layer` columns already exist in production — no migration needed for these. Entity relationship diagram is accurate.
- **Confirmed UX decision:** Dashboard CTA has no spacing indicators — spacing recommendation lives only on the session-complete screen copy.

### v1.5 — User Story Completeness Review (2026-02-08)

Reviewed spec for completeness across three dimensions: requirements vs. UX, user stories vs. requirements, and acceptance criteria per story. Changes made:

- **REQ-29 updated:** `current_layer` changed from stored column to **derived from `layer_progress`** (next incomplete layer in ordered list `['intellectual', 'emotional', 'identity']`). Computation only performed for non-completed illusions. All stored `current_layer` references removed throughout technical design, API logic, composable code, migration SQL, test specifications, and component props.
- **REQ-36 updated:** Prompt assembly order now includes **cross-layer context** (already implemented in `cross-layer-context.ts`) between personalization and illusion prompt, matching the actual codebase.
- **REQ-16/REQ-40 deferred:** Low conviction flagging moved to deferred analytics (REQ-49). Threshold definition preserved for future implementation. Scores are still recorded; flagging/targeting is the deferred part.
- **REQ-39 updated:** Progress API response reflects derivation model — `layer_progress` JSONB returned as-is, current layer derived client-side.
- **Story 3.1:** Added AC#8 (conviction assessment records `illusion_layer`) and AC#9 (`isComplete=true` for final illusion L3). Updated ACs 1-4 to reference derivation instead of stored column.
- **Story 4.3:** Added AC#3 (cron query includes `evidence_bridge` type) and AC#4 (observation text renders in email body).
- **Story 6.1:** Added AC#4 (evidence bridge check-in responses create `real_world_observation` moments).
- **ProgressCarousel:** Removed `currentLayer` prop (derived from `layerProgress` data internally).
- **Migration SQL:** Removed `current_layer = 'emotional'` writes from existing-user migration. Added guard to prevent overwriting existing `layer_progress` data.
- **Test specifications:** Updated API tests (2 new test cases for conviction layer and final illusion), composable tests (derivation-based descriptions), and E2E stale client test (uses `layer_progress` data).

### v1.4 — Technical Design (2026-02-08)

Added complete technical architecture through structured design interview across 12 dimensions:

- **Architectural decisions table:** 20+ decisions covering file structure, token design, storage, API contracts, component evolution, state management
- **System architecture:** ASCII diagram showing all integration points. Updated prompt assembly order with layer instruction injection point.
- **Data modeling:** Schema changes for `user_progress` (layer_progress JSONB), `conversations` (observation_assignment), `check_in_schedule` (observation_assignment, cancellation_reason, evidence_bridge type, cancelled status). Migration SQL including existing user data migration (REQ-50).
- **API design:** Evolved `complete-session.post.ts` (accepts illusionLayer, returns layerCompleted/nextLayer/isIllusionComplete/observationAssignment). Observation extraction via `[OBSERVATION_ASSIGNMENT: ...]` token in `chat.post.ts`. Check-in cancellation on session start.
- **Prompt design:** 3 layer instruction blocks (layer-instructions.ts). 10 observation templates (exported maps in illusion files). `{observationTemplate}` placeholder replacement at assembly time.
- **Component architecture:** SessionCompleteCard gains `showContinue` prop and `continue-layer` emit. ProgressCarousel gains `layerProgress` prop for layer dots (current layer derived from data). Session page determines layer from progress data on mount.
- **State management:** `useProgress` composable gains `currentLayer`, `layersCompletedForIllusion()`, `layerSessionNumber`, `layerProgress` computed properties.
- **Error handling:** Mapped REQ-41 through REQ-47 to specific code locations and fallback behaviors.
- **User stories:** 15 stories across 7 epics with Given/When/Then acceptance criteria, technical notes, dependencies, test requirements, and complexity estimates.
- **Test specification:** 25+ unit test cases across 6 test files. 5 E2E test flows covering full layer progression, continue-immediately, dashboard display, and stale client recovery.
- **Implementation phases:** 5 phases with parallelization opportunities and dependency graph.

### v1.3 — Layer Instruction Granularity Decision (2026-02-08)

- **Layer instruction granularity resolved:** Generic per layer (3 blocks), not per-illusion-per-layer (15 blocks). The full illusion prompt is always injected; the layer instruction adds a tonal/methodological lens. Per-illusion adjustments deferred to a future iteration based on manual testing. Added to Resolved Questions table and clarified REQ-8.

### v1.2 — Requirements Refinement (2026-02-08)

Added based on structured requirements audit across 12 dimensions (functional completeness, state management, data requirements, business rules, integration/API, error handling, security, performance, observability, edge cases, accessibility, migration):

- **Observation delivery mechanism:** Prompt instruction model — AI includes assignment in final message via layer-aware system prompt. Templates stored in illusion prompt files (REQ-23, REQ-24, REQ-25)
- **Check-in scheduling:** Schedule-then-cancel pattern with audit trail. Cancelled check-ins not re-scheduled on layer abandonment (REQ-26, REQ-27, REQ-28)
- **Layer state model:** Computed states (not_started, in_progress, completed) from existing data. Current layer derived from `layer_progress` (next incomplete in ordered list). Abandoned layers show identically to not-started (REQ-29, REQ-30)
- **Conviction scoring:** Point-in-time immutable snapshots. Low conviction threshold defined as ≤ 5/10 (REQ-31, REQ-40)
- **Illusion transitions:** Auto-unlock on dashboard return. AI previews next illusion at Layer 3 close. Revisit triggers reinforcement sessions, not 3-layer replay (REQ-32, REQ-33, REQ-34)
- **Spacing CTAs:** Both CTAs always fully visible, no dimming (REQ-35)
- **Prompt assembly order:** Layer instructions injected after illusion prompt, before bridge context (REQ-36)
- **Data storage:** Observation assignment as field on `check_in_schedule`. Responses captured as `real_world_observation` moments. Progress API nests layer data in existing objects (REQ-37, REQ-38, REQ-39)
- **Error handling:** Graceful degradation for LLM failures, missing assignments, conviction assessment failures, email delivery failures, expired magic links (REQ-41 through REQ-45)
- **Edge cases:** Multi-tab server-side validation, SESSION_COMPLETE atomic trigger, long-gap graceful handling (REQ-46, REQ-47, REQ-48)
- **Analytics events:** 7 key events defined for future implementation (REQ-49)
- **Migration:** Existing completed illusions honored, old session maps to Layer 1 complete, check-in timing applied going forward only (REQ-50, REQ-51)
- **Identity shift clarification:** Per-illusion table entries clarified as user-generated examples, not scripted AI lines
- **Observation storage model resolved:** Last open question closed (assignment on `check_in_schedule`, responses as moments)
- **Check-in timing conflict resolved:** Evidence bridge check-ins use 24-hour timing, overriding check-in spec's 2-hour default for layer transitions
- **New requirements:** Added REQ-23 through REQ-51

### v1.1 — UX Refinement (2026-02-08)

Added based on structured UX audit across 12 dimensions:

- **Personas:** Added 3 personas (Analytical Skeptic, Emotional Processor, Eager Sprinter) to surface how different user types experience the 3-layer model
- **Per-illusion journey summary:** Added table showing observation themes and identity shift for all 5 illusions (coaching methodology details remain in coaching framework guide)
- **Dashboard UI:** Layer progress (X of 3 sessions complete + three-state inline dots) added to the ProgressCarousel's action section for the current illusion. Wireframe built on the existing carousel component (circles, focus/scale, arrow navigation). Compact layout preserves vertical space for moment cards above the fold.
- **Session-complete screens:** Observation assignment integrated into existing `SessionCompleteCard` component's `subtext` prop as a flowing paragraph. Wireframes match actual component structure (checkmark icon, heading, subtext, side-by-side CTAs). "Continue to Next Session" starts next layer immediately.
- **Check-in timing:** Specified ~24 hours after session; cancelled if user starts next layer first
- **Observation assignments:** Decided on hybrid generation model (template + AI personalization with fallback)
- **Edge cases resolved:** Forward-only layers (no redo), low conviction flagged internally only, no system-level engagement gates, mid-session exit follows existing clean-restart pattern
- **Accessibility:** Added aria-label requirements for progress indicators, touch target sizes, screen reader considerations
- **Open questions:** Resolved 3 of 4 original open questions (observation generation, layer transition, cross-illusion evidence). Observation storage model remains open for technical design.
- **New requirements:** Added REQ-14 through REQ-22

### v1.0 — Initial Draft (2026-02-08)

- Problem statement, goals, non-goals, success metrics
- Solution summary with 3-layer evidence loop model
- Relationship to existing specs
- Primary scenario (Stress Relief) + 2 variant scenarios
- UX overview for dashboard, session, session-complete, and check-in screens
- 13 key requirements (REQ-1 through REQ-13)
- Scope, dependencies, constraints, open questions

---

## Readiness Summary

| Field | Value |
|-------|-------|
| **Review Date** | 2026-02-08 |
| **Readiness Assessment** | Ready for Development |
| **Gaps Found** | 12 |
| **Gaps Resolved** | 12 |
| **Deferred Items** | None |

**Traceability status:**
- UX → Requirements: Complete. All flows, screens, interactions, states, and data displays have backing requirements (REQ-1 through REQ-51).
- Requirements → Stories: Complete. All requirements map to user stories across 7 epics (15 stories).
- Stories → Acceptance Criteria: Complete. All stories have testable acceptance criteria covering happy paths, error scenarios, edge cases, and cross-references to dependent specs.

**Follow-up actions:**
- Update [conversation-architecture-guide.md](../guides/conversation-architecture-guide.md) to reflect layer-aware prompt assembly order after implementation
- Update [check-in-spec.md](check-in-spec.md) with evidence bridge check-in type and 24-hour timing after implementation
