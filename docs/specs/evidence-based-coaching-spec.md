# Evidence-Based Coaching Spec

**Created:** 2026-02-08
**Status:** Draft
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

### User Scenarios

#### Primary Scenario: A User Works Through One Illusion

**User:** An active program participant currently working through the Stress Relief Illusion.

**Trigger:** User opens the app and sees their current illusion with a "Continue" button showing "Session 1 of 3."

**Flow:**

1. **Layer 1 — Intellectual Discovery.** User starts the session. The AI uses Socratic questioning, CBT evidence examination, MI reflective listening, and Allen Carr reframes to help the user logically see through the stress relief illusion. The conversation follows the Layer 1 flow from the coaching framework guide: surface the belief → explore felt experience → introduce the reframe → discover the contradiction → solidify. The session ends with the user articulating the insight in their own words. The AI delivers an observation assignment: "Between now and next time, pay attention to your stress. When you feel stressed, notice: is it the situation, or has it been a while since your last use?" The session-complete screen shows a card with the observation assignment text.

2. **Check-in (evidence bridge).** Hours or a day later, the user receives an email check-in referencing their specific assignment: "You were going to notice when stress shows up — what did you observe?" The user responds briefly. Their observation is stored.

3. **Layer 2 — Emotional Processing.** User returns and starts Session 2 of 3. The AI opens: "Last time, we talked about stress and nicotine. What have you been noticing?" If the user submitted a check-in observation, the AI has that context and can reference it. If not, the AI asks and adapts to whatever the user shares. The conversation is less analytical and more emotionally exploratory — processing anger at being deceived, grief for time lost, relief at seeing the truth. The session ends with a feeling-focused observation assignment: "Notice what you *feel* next time the stress-nicotine connection shows up — not just what you think about it."

4. **Check-in (evidence bridge).** Same pattern — specific to the feeling-focused assignment.

5. **Layer 3 — Identity Integration.** User returns for Session 3 of 3. The AI opens by asking about both evidence and feelings. The conversation focuses on who the user is becoming: "Before nicotine, how did you handle stress? Who were you then?" The session connects the illusion to their personal history, values, and future self. No observation assignment — this is the integration layer. The session ends with the user expressing a settled conviction in their own words.

6. **Illusion complete.** The illusion is marked complete. The next illusion unlocks on the dashboard.

**Outcome:** The user has moved from intellectual agreement ("I get it, nicotine doesn't help with stress") through emotional processing ("I'm angry I believed this for years") to identity integration ("I'm someone who handles stress on my own — I always was"). The belief change is durable because it was tested against their real-world experience between sessions.

#### Variant Scenario: User Continues Immediately Without Spacing

**User:** Same participant, but they finish Layer 1 and immediately start Layer 2 without waiting, responding to a check-in, or gathering observations.

**Flow:** Layer 2 opens with the same evidence question: "What have you been noticing?" The user says they haven't had time to observe anything yet. The AI adapts gracefully — perhaps reflecting on what came up during the Layer 1 session itself, or guiding the user through a brief in-session reflection before moving into emotional processing.

**Outcome:** The session still has value — emotional processing can draw from the in-session experience. But the evidence loop is weaker without real-world observation time. The recommended-but-not-enforced spacing encourages the richer path without blocking the eager user.

#### Variant Scenario: User Skips All Check-Ins

**User:** A participant who doesn't respond to any check-in emails throughout the program.

**Flow:** Every Layer 2 and Layer 3 session opens by asking what the user noticed. The user may share observations they made but didn't submit, or they may not have noticed anything. The AI adapts — using in-session reflection or revisiting the prior layer's key insight as a bridge. Sessions are somewhat less rich without pre-collected evidence but remain fully functional.

**Outcome:** The evidence loop degrades gracefully. Check-in evidence is enrichment, not a requirement.

### UX Overview

#### Dashboard — Illusion Progress

- **What the user sees:** Each illusion card shows progress as "Session X of 3" (e.g., "Session 2 of 3"). Layer names (Intellectual, Emotional, Identity) are not shown to the user. Completed sessions show a progress indicator (e.g., filled dots or a progress bar).
- **What the user can do:** Tap "Continue" to start or resume the next available session. Completed illusions show a "Reinforce" button (existing behavior).
- **Feedback:** After completing Session 3 of 3, the illusion card transitions to the completed state. If all illusions are complete, the ceremony-ready state activates (existing behavior).

#### Session Conversation — Layer-Differentiated

- **What the user sees:** A conversation with the AI coach. The user doesn't see layer labels — it's simply their next session. The conversation *feels* different because the AI's approach, tone, and questions shift per layer.
- **What the user can do:** Respond to the AI's questions, share their experiences, push back, go deep. Same conversational interface as today.
- **Feedback:** The AI adapts in real time to the user's responses using the techniques appropriate for the current layer (analytical for L1, emotionally holding for L2, identity-forward for L3).

#### Session Complete Screen — With Observation Assignment

- **What the user sees:** The existing session-complete screen ("Let this settle...") with an additional card showing the observation assignment text. The card presents the assignment in the AI's voice — the same text delivered conversationally at the end of the session, formatted as a clear, memorable prompt.
- **What the user can do:** "Return to Dashboard" (primary CTA) or "Continue" (secondary, for eager users). The observation card is informational — no action required on it.
- **Feedback:** For Layer 3 sessions (no observation assignment), the session-complete screen appears without the observation card.

#### Check-In — Observation-Specific

- **What the user sees:** An email with a brief, specific prompt referencing their observation assignment. Example: "You were going to notice when stress shows up — what did you observe?"
- **What the user can do:** Click the magic link, land on the check-in interstitial, respond briefly.
- **Feedback:** Acknowledgment of their response. Brief, warm close — no further inquiry (per coaching framework guide's check-in pattern).

### Key Requirements

- **REQ-1:** Each illusion consists of 3 sequential conversation sessions (Layer 1, Layer 2, Layer 3), each with a distinct session character and flow as defined in the [coaching framework guide](../guides/coaching-framework-guide.md) Section 6 (Session Flow Patterns).
- **REQ-2:** Layer 1 sessions end with a specific, concrete observation assignment delivered conversationally by the AI and displayed as a UI card on the session-complete screen.
- **REQ-3:** Layer 2 sessions end with a feeling-focused observation assignment, delivered and displayed the same way as Layer 1.
- **REQ-4:** Layer 3 sessions do not include an observation assignment. The session-complete screen appears without the observation card.
- **REQ-5:** All Layer 2 and Layer 3 sessions open by asking the user about their observations, regardless of whether evidence was submitted via check-in. The AI adapts gracefully to whatever the user shares (or doesn't share).
- **REQ-6:** Check-ins scheduled between layers are specific to the observation assignment from the prior session. The check-in prompt directly references the assignment text.
- **REQ-7:** Check-in responses (user observations) are stored and surfaced to the next session's prompt context via the personalization engine / context builder.
- **REQ-8:** The system prompt assembly becomes layer-aware: each layer receives layer-appropriate instructions for tone, flow, and coaching approach (analytical for L1, emotional holding for L2, identity integration for L3).
- **REQ-9:** User progress tracks layer completion within each illusion. The dashboard displays progress as "Session X of 3" — layer names are not shown to the user.
- **REQ-10:** Spacing between layers is recommended via the session-complete screen messaging but not enforced. Users can start the next layer immediately.
- **REQ-11:** The observation assignment text is captured and stored when the AI generates it, so it can be referenced in subsequent check-ins and session openings.
- **REQ-12:** Conviction assessment (`llm.session.assess`) runs after each layer session completion, tracking conviction per illusion per layer.
- **REQ-13:** The total core program becomes 15 sessions (5 illusions × 3 layers) + 1 ceremony = 16 sessions total.

---

## Scope & Considerations

### Out of Scope

- **High-risk scenario protocols** — Acute craving, social pressure, alcohol combination, emotional distress, post-slip, and anniversary regression protocols are defined in the coaching framework guide but not part of this spec. They are separate features.
- **Support sessions** — The "I need help" session pattern from the coaching framework guide is not included. It would be a separate feature.
- **Reinforcement session evolution** — The existing reinforcement-sessions-spec is not modified by this spec.
- **Phase 2+ therapeutic methods** — ACT, MBRP, Narrative Therapy, and SDT content is documented in the coaching framework guide for future use. This spec covers Phase 1 methods only.
- **Dashboard redesign** — The dashboard receives minor updates (layer progress display) but no structural redesign.
- **Ceremony changes** — The ceremony spec is unaffected.
- **New delivery channels** — Check-ins continue to use the existing email + magic link system. Push notifications are a future enhancement.

### Deferred / Future Enhancements

- **Adaptive depth** — Rather than fixed 3 layers per illusion, the AI dynamically assesses readiness and stays at a layer until genuine movement occurs. Deferred because it requires reliable AI assessment of readiness, which needs user data to validate.
- **Interleaved illusions** — Working on multiple illusions simultaneously and returning to earlier ones from new angles. Deferred because a linear program is easier for users to understand and commit to before the product has proven outcomes.
- **Push notification delivery** — More immediate check-in delivery for evidence bridge prompts.
- **Observation browsing UI** — A screen where users can review their submitted observations and see how their perspective has evolved.

### Dependencies

- **core-program-spec.md** — This spec builds on the layer model, progress tracking, conviction assessment, and SESSION_COMPLETE infrastructure defined there. That infrastructure is either already built (Phases 4A-4C) or spec'd and ready for implementation.
- **content-library-expansion-spec.md** — Co-dependency. This spec defines the prompt architecture; the content spec fills it with layer-differentiated therapeutic material. Structural changes can deploy with current content; content expansion applies into the new structure.
- **coaching-framework-guide.md** — The canonical reference for session flows, coaching principles, and per-illusion technique mapping. This spec implements the structural aspects; the guide remains the source of truth for *how* the coaching works.
- **conversation-architecture-guide.md** — Documents current prompt assembly. Will need to be updated to reflect the layer-aware assembly order once this spec is implemented.
- **check-in-spec.md** — The existing check-in system evolves to support observation-specific evidence bridge prompts. The check-in spec will need targeted updates.

### Constraints

- **Existing prompt assembly architecture** — Changes to system prompt assembly must be compatible with the current layered approach (base prompt → personalization → illusion prompt → bridge context). The layer-awareness is an evolution of this architecture, not a replacement.

### Open Questions

- **Observation assignment generation:** Should observation assignments be hardcoded per illusion per layer (predictable, testable), generated by the AI per session (personalized but variable), or a hybrid (template with personalization)?
- **Observation storage model:** Where do observations live? As a new field on `check_in_schedule` responses, as entries in `captured_moments`, or as a new table? This is a technical design question for the next phase.
- **Layer transition messaging:** When the user completes Layer 3 and an illusion is done, should the AI mark the transition conversationally (as the current spec suggests) or should the UI handle it?
- **Cross-illusion evidence:** If a user's observation for the Stress Illusion also reveals something about the Pleasure Illusion, should that evidence be surfaced when the Pleasure Illusion begins? This would add richness but complexity.
