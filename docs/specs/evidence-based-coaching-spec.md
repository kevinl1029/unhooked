# Evidence-Based Coaching Spec

**Created:** 2026-02-08
**Status:** Draft
**Version:** 1.3
**Document Type:** Feature Specification (PRD)

---

## Table of Contents

1. [Overview](#overview)
2. [Solution](#solution)
3. [Scope & Considerations](#scope--considerations)

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
- When the current illusion is focused, the action section adds a layer progress line: "Session X of 3" text followed by 3 inline dots (● filled / ○ empty) — all on one line, in a smaller font size (e.g., `text-sm text-white-65`).
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
│           Session 1 of 3  ○ ○ ○                              │
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
● ○ = Layer progress dots (filled = completed layer)
```

**Action section after completing Layer 1:**

```
│           Continue: The Pleasure Illusion                     │
│           Session 2 of 3  ● ○ ○                              │
│                                                              │
│    Discover why the "pleasure" is just an illusion            │
│    masking withdrawal.                                       │
│                                                              │
│              [        Continue        ]                       │
```

**Ceremony-ready state:** When all 5 illusions are complete, the ProgressCarousel is replaced by the ceremony-ready card. See [ceremony-spec.md](ceremony-spec.md) for the ceremony transition flow.

<!-- UX-REFINED: Added accessibility notes for progress indicators -->

**Accessibility:** The layer progress dots must include an `aria-label` describing the state (e.g., "1 of 3 sessions complete"). Filled vs. empty dots must be distinguishable by more than color alone — use opacity difference (filled at full opacity, empty at 0.35) and consider a subtle size or border treatment for color vision deficiency support.

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
- **REQ-9:** User progress tracks layer completion within each illusion. The ProgressCarousel's action section displays "Session X of 3" with 3 inline dots (filled/empty) for the current illusion in a compact, smaller font. Layer names are not shown to the user.
- **REQ-10:** Spacing between layers is recommended via the session-complete screen messaging ("Your next session will be ready tomorrow") but not enforced. Users can start the next layer immediately via the "Continue" CTA.
- **REQ-11:** The observation assignment text is captured and stored when the AI generates it, so it can be referenced in subsequent check-ins and session openings.
- **REQ-12:** Conviction assessment (`llm.session.assess`) runs after each layer session completion, tracking conviction per illusion per layer.
- **REQ-13:** The total core program becomes 15 sessions (5 illusions × 3 layers) + 1 ceremony = 16 sessions total.

<!-- UX-REFINED: Added requirements REQ-14 through REQ-22 based on UX refinement decisions -->

- **REQ-14:** Observation assignments use a **hybrid generation model**: a template per illusion per layer provides guaranteed structure (see Per-Illusion Journey Summary table for themes), and the AI personalizes the assignment with user-specific details from the session conversation. If AI personalization fails, the system falls back to the hardcoded template for that illusion/layer.
- **REQ-15:** Layers are **forward-only**. Once a layer is completed, the user cannot redo it. Users can revisit the illusion later via reinforcement sessions after completing all 3 layers.
- **REQ-16:** Low conviction scores after Layer 3 are **flagged internally only**. The user is not told their conviction is low, and progression to the next illusion is not gated. Reinforcement sessions exist for users who want to return.
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

- **REQ-29:** Layer state is **computed, not stored explicitly**: `not_started` (layer not in `layers_completed` and no active conversation), `in_progress` (active conversation exists for this layer), `completed` (layer value present in `layers_completed` array). A `current_layer` field is added to the illusion progress object, using internal layer names (`'intellectual'`, `'emotional'`, `'identity'`) matching the existing `layers_completed` values. The frontend maps these to "Session 1/2/3 of 3" for display.
- **REQ-30:** Abandoned layer sessions appear **identically to not-yet-started sessions** on the dashboard. The CTA remains "Continue" with the same "Session X of 3" display. When tapped, a new conversation starts (clean restart) with abandoned session moments injected — the user doesn't see a difference. No "Resume" indicator.
- **REQ-31:** Conviction scores are **point-in-time, immutable snapshots**. Each layer's conviction score is recorded at session completion and never updated retroactively. The system can read the trajectory across layers (e.g., L1: 5, L2: 7, L3: 9) to assess deepening conviction.

#### Illusion Transitions (Functional)

- **REQ-32:** After Layer 3 completion, the next illusion **auto-unlocks** when the user returns to the dashboard. The ProgressCarousel shows the new illusion as current with "Session 1 of 3." No transition screen or unlock delay. Matches existing core-program-spec behavior.
- **REQ-33:** The AI's Layer 3 closing includes a **brief, natural preview** of the next illusion: e.g., "Next time, we'll explore something different — the idea that nicotine gives you pleasure." For the final illusion (Identity), the preview is replaced by the ceremony tease per [ceremony-spec.md](ceremony-spec.md).
- **REQ-34:** The "Revisit" badge on completed illusions triggers the **existing reinforcement session** flow (a single conversation, not the 3-layer sequence). The 3-layer sequence is a one-time program path. Forward-only per REQ-15.

#### Spacing & CTAs (Functional)

- **REQ-35:** Both CTAs on the Layer 1 & 2 session-complete screen ("Return to Dashboard" and "Continue to Next Session") are **always fully visible**. The spacing recommendation is conveyed through copy only ("Your next session will be ready tomorrow"). The "Continue" CTA is not visually de-emphasized or dimmed. Non-judgmental, clean UI.

#### Prompt Assembly (Integration)

- **REQ-36:** Layer-specific instructions are injected in the prompt assembly order **after the illusion prompt and before bridge context**: base → personalization → illusion prompt → **layer instructions** → bridge context → abandoned session context. Layer instructions refine the illusion prompt's approach (analytical for L1, emotional holding for L2, identity-forward for L3).

#### Data Storage (Data)

- **REQ-37:** The observation assignment text is stored as a new `observation_assignment` text field on the existing `check_in_schedule` table. This field is populated when the check-in is scheduled after session completion. The check-in email builder and context builder read it directly.
- **REQ-38:** Check-in observation responses are captured as **moments with type `'real_world_observation'`** via the existing moment detection pipeline. No new schema needed — the context builder already surfaces moments by type.
- **REQ-39:** The progress API response nests layer data **within existing illusion progress objects**: each object gains `current_layer` (string) alongside the existing `layers_completed` (array) and `status` fields. No new top-level API fields.

#### Business Rules (Logic)

- **REQ-40:** Low conviction after Layer 3 is defined as a score **≤ 5 out of 10**. Scores at or below this threshold are flagged internally for analytics and future reinforcement targeting. The flag is not user-visible and does not gate progression (per REQ-16).

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

- **Progress indicator (3 dots):** Must include `aria-label` describing the progress state (e.g., "2 of 3 sessions complete"). Filled vs. empty dots must be distinguishable by more than color alone — use opacity difference and consider subtle size or border treatment for color vision deficiency support.
- **Session-complete screen:** The integrated observation text must be readable by screen readers as part of the normal document flow (no decorative/hidden elements). CTAs must have sufficient touch target size (minimum 44x44px per WCAG).
- **Dashboard illusion cards:** Locked illusion cards should convey their locked state to screen readers (e.g., `aria-disabled="true"` with descriptive label: "The Pleasure Illusion — locked").

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

### v1.3 — Layer Instruction Granularity Decision (2026-02-08)

- **Layer instruction granularity resolved:** Generic per layer (3 blocks), not per-illusion-per-layer (15 blocks). The full illusion prompt is always injected; the layer instruction adds a tonal/methodological lens. Per-illusion adjustments deferred to a future iteration based on manual testing. Added to Resolved Questions table and clarified REQ-8.

### v1.2 — Requirements Refinement (2026-02-08)

Added based on structured requirements audit across 12 dimensions (functional completeness, state management, data requirements, business rules, integration/API, error handling, security, performance, observability, edge cases, accessibility, migration):

- **Observation delivery mechanism:** Prompt instruction model — AI includes assignment in final message via layer-aware system prompt. Templates stored in illusion prompt files (REQ-23, REQ-24, REQ-25)
- **Check-in scheduling:** Schedule-then-cancel pattern with audit trail. Cancelled check-ins not re-scheduled on layer abandonment (REQ-26, REQ-27, REQ-28)
- **Layer state model:** Computed states (not_started, in_progress, completed) from existing data. Added `current_layer` field using internal names. Abandoned layers show identically to not-started (REQ-29, REQ-30)
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
- **Dashboard UI:** Layer progress (Session X of 3 + inline dots) added to the ProgressCarousel's action section for the current illusion. Wireframe built on the existing carousel component (circles, focus/scale, arrow navigation). Compact layout preserves vertical space for moment cards above the fold.
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
