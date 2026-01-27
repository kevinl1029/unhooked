# Unhooked: Reinforcement Sessions Specification

**Version:** 2.0
**Created:** 2026-01-12
**Updated:** 2026-01-26
**Status:** Draft
**Document Type:** Feature Specification (PRD + Technical Design)
**Related Documents:**
- `unhooked-core-program-implementation-v3.0.md` (Core Program)
- `unhooked-five-illusions-framework.md` (Illusion Definitions)
- `unhooked-progress-tracking.md` (Progress Tracking)

---

## Table of Contents

1. [Problem Statement](#problem-statement)
2. [Goals & Success Metrics](#goals)
3. [Solution Summary](#solution-summary)
4. [User Journeys](#user-journeys)
5. [UI/UX Design](#uiux-design)
6. [Functional Requirements](#functional-requirements)
7. [Non-Functional Requirements](#non-functional-requirements)
8. [Key Product Decisions](#key-product-decisions)
9. [Technical Design](#technical-design)
10. [Out of Scope / Deferred](#out-of-scope--deferred)
11. [Open Questions](#open-questions)
12. [Appendix](#appendix)

---

## Problem Statement

### The Challenge

Users experience genuine breakthroughs during core sessions—they truly "see through" an illusion and understand at a deep level why nicotine doesn't deliver what it promises. But **insights fade over time**. The visceral clarity of the breakthrough moment gradually dulls, and old mental patterns re-emerge.

This creates a dangerous gap: users intellectually remember what they learned, but they no longer *feel* it when facing real-world stress, cravings, or social pressure. The old beliefs—"I need this to relax," "just one won't hurt," "I'm different"—start to feel true again.

### Why This Matters

The Unhooked program's core philosophy is that lasting cessation comes from **eliminating the desire to use**, not from willpower-based resistance. When insights fade:
- Users begin fighting cravings with willpower instead of clarity
- Willpower is exhausting and eventually fails
- Users who relapse often feel shame, which can spiral into giving up entirely

### The Opportunity

Users already have the wisdom they need—they generated it themselves during core sessions. Reinforcement Sessions reconnect users with their own breakthrough moments, helping them:
- Re-experience the clarity before it fully fades
- Apply existing insights to new contexts and triggers
- Deepen the transformation through repeated reconnection
- Recover from slips without shame by returning to what they already know

---

## Goals

### Primary Goal

Help users maintain and deepen their mindset shift over time, preventing the insight-fade that leads to relapse.

### Success Metrics

**Primary KPI:** Zero nicotine use (quantitative, trackable)

**True North:** No desire to use—users genuinely don't want nicotine, not because they're resisting but because they've seen through the illusion.

**Leading Indicators:**
- **For illusion-specific reinforcement:** Conviction score remains stable or increases after the session
- Users who engage with reinforcement sessions maintain abstinence longer than those who don't
- Users report feeling "reconnected" after sessions (qualitative)

**Instrumentation:** We already capture conviction scores via `conviction_assessments` table (per illusion, per session, with delta). Moments are tagged with `session_type: 'reinforcement'`. For MVP, we'll query this data manually to learn patterns.

### Non-Goals

- **Re-teaching the program**: Reinforcement is not remedial education. Users already have the insight.
- **Replacing professional support**: This doesn't replace therapy, medical support, or crisis intervention.
- **Gamification of engagement**: We're not trying to maximize session count; we want users to use this when genuinely helpful.

---

## Solution Summary

Reinforcement Sessions help users reconnect with their own breakthrough moments before insights fade. The feature adds three capabilities to the dashboard:

### 1. Moment Cards

The dashboard displays 1-3 **moment cards**—quotes from the user's own breakthrough moments during core sessions. These cards surface the illusion where the user's conviction is weakest, showing their most powerful insights from that illusion. Clicking a moment card starts a reinforcement conversation anchored to that specific insight.

### 2. Revisit Buttons

For each completed illusion, the dashboard shows a **"Revisit" button**. This lets users explicitly choose which illusion to reinforce, opening an illusion-specific conversation with full context of their previous insights.

### 3. "I Need Support" Button (Post-Program Only)

After completing all 5 core illusions, users gain access to a **generic support button**. This opens a context-aware conversation when the user needs help but isn't sure which illusion to focus on. The AI can identify relevant illusions and steer toward them.

### Core Design Principle

**Reinforcement is reconnection, not remediation.** The user already has the insight—we're helping them find it again in a new context. The framing is always restoration ("let's reconnect with what you discovered") rather than re-education ("let me teach you again").

### What's Different from Core Sessions

| Core Sessions | Reinforcement Sessions |
|---------------|------------------------|
| Introducing new illusion | Reconnecting with existing insight |
| Socratic discovery, building new belief | Faster movement, leveraging existing foundation |
| Neutral optimism | Empathetic acknowledgment of struggle |
| Capturing original insights | Capturing refinements and new articulations |

---

## User Journeys

### User Scenarios Overview

Reinforcement Sessions serve users in different states. The AI adapts its framing accordingly:

| User State | What They Need | AI Framing | Status |
|------------|----------------|------------|--------|
| **Proactive** | Maintenance, keeping insights fresh | "Tune-up"—regular reconnection even when things are going well | MVP |
| **Doubting** | Help with specific doubt about a resolved illusion | "Reconnection"—finding what they already know | MVP |
| **Pre-Slip** | Support when feeling pulled toward use | "Anchor"—stabilizing before the moment passes | MVP |
| **Post-Slip** | Recovery without shame | "Reset"—slip is data, not identity; return to clarity | **Deferred** |

---

### Journey 1: Proactive User Clicks Moment Card

**Persona:** Sarah, 2 weeks post-ceremony, feeling good but wants to stay sharp

**Trigger:** Sarah opens the dashboard and sees a moment card from her "Stress Relief" session

**Flow:**

1. **Dashboard** — Sarah sees a moment card:
   > *"I realized that smoking after stress doesn't actually help—it just delays my response to the problem while making me feel worse."*
   > — Stress Relief, Day 2

   She clicks **[Reconnect with this →]**

2. **Session Starts** — AI opens with her moment:
   > "When we talked about stress relief, you said something powerful: [quote]. Does that still feel true right now?"

3. **Conversation** — Sarah confirms it still feels true. AI explores:
   > "What's bringing you back to this today?"

   Sarah shares she has a stressful week coming up and wants to reinforce before it hits.

4. **Reconnection** — AI helps her re-articulate the insight for her current context:
   > "So when that deadline pressure hits, what will you remember?"

5. **Session Ends** — AI captures any new articulation as a moment. Conviction assessment runs (should be stable or higher).

6. **Return to Dashboard** — Sarah sees updated moment cards (may rotate to show different moments next time).

**Success Criteria:** Conviction stable or increased. New moment captured if fresh articulation emerged.

---

### Journey 2: Doubting User Revisits Specific Illusion

**Persona:** Marcus, mid-program (completed 3 illusions), doubting his "Pleasure" insight

**Trigger:** Marcus explicitly wants to revisit the Pleasure illusion because he's questioning whether he really believes it

**Flow:**

1. **Dashboard** — Marcus sees his completed illusions:
   - ✓ Stress Relief
   - ✓ Pleasure **[Revisit]**
   - ✓ Willpower **[Revisit]**
   - → Focus (current)

   He clicks **[Revisit]** next to Pleasure.

2. **Session Starts** — AI acknowledges he's returning:
   > "I see you want to reconnect with what we explored about pleasure. Last time, you reached a conviction of 7/10. You said: [quote from his breakthrough moment]. What's making you doubt that now?"

3. **Exploration** — Marcus explains he was at a party and saw people enjoying cigarettes. It looked appealing.

   AI distinguishes intellectual vs. emotional:
   > "When you saw that, did you think 'they're getting something I'm missing'? Or did you feel a pull even though you know better?"

4. **Re-Fortification** — AI uses his current situation as the teaching moment:
   > "What do you think they were actually experiencing in that moment?"

   Marcus works through it, re-articulates his insight with this new context.

5. **Session Ends** — New moment captured (application moment with context: "party, social smoking"). Conviction re-assessed.

6. **Return to Dashboard** — Marcus continues with Focus (his current illusion). The Pleasure revisit is complete.

**Success Criteria:** Marcus re-articulates his insight. Conviction restored or deepened. He returns to core program flow.

---

### Journey 3: User Needs General Support (Post-Program)

**Persona:** Elena, 1 month post-ceremony, feeling a general pull but unsure why

**Trigger:** Elena feels "off" but can't pinpoint which illusion is relevant

**Precondition:** Elena has completed all 5 core illusions

**Flow:**

1. **Dashboard** — Elena sees the **[I Need Support]** button (only visible post-program). She clicks it.

2. **Session Starts** — AI opens with empathy and exploration:
   > "Hey. I'm here. What's going on?"

3. **Exploration** — Elena describes feeling stressed and also missing the "ritual" of stepping outside for a break.

   AI identifies multiple illusions may be at play:
   > "It sounds like there might be a few things tangled together. The stress piece, and also something about the ritual or routine. Which one feels stronger right now?"

4. **Focus** — Elena says the ritual feels stronger. AI pivots to that illusion's territory, pulling relevant moments:
   > "When we talked about the ritual illusion, you said [quote]. Does that connect to what you're feeling now?"

5. **Resolution** — Conversation continues in illusion-specific territory. If Elena resolves it, great. If she needs more, AI may suggest:
   > "Would it help to do a focused session on this one?"

6. **Session Ends** — No conviction assessment for generic boost (it's not illusion-specific). Session logged for reference.

**Success Criteria:** Elena feels heard and supported. If an illusion was identified, she has a path forward (either resolved in session or prompted to revisit).

---

### Journey 4: Edge Case — No Moments Captured

**Persona:** Alex, completed Stress Relief but no moments were captured (session ended early or detection failed)

**Trigger:** Alex's dashboard should show moment cards, but Stress Relief has zero moments

**Flow:**

1. **Dashboard** — Instead of a moment card with a quote, Alex sees a special card:
   > *"You completed Stress Relief, but we didn't capture any breakthrough moments. This one might benefit from another conversation."*
   > **[Revisit Stress Relief →]**

2. **Click** — Alex clicks the revisit prompt.

3. **Session Starts** — AI acknowledges the situation:
   > "Last time we talked about stress relief, we didn't quite land on a breakthrough moment together. Let's see if we can find one today. What comes to mind when you think about stress and nicotine?"

4. **Conversation** — Proceeds like a reinforcement session, but with more discovery since there's no previous moment to anchor to.

5. **Session Ends** — Moments captured this time. Conviction assessed.

6. **Return to Dashboard** — Now Alex has moments from Stress Relief, and future visits will show proper moment cards.

**Success Criteria:** At least one moment captured. User doesn't feel like they failed the first time.

---

## UI/UX Design

*This section will contain wireframes and visual specifications.*

### Dashboard Elements

#### Moment Cards

```
┌─────────────────────────────────────────────────┐
│  💡 Stress Relief — Day 2                       │
│  ───────────────────────────────────────────────│
│  "I realized that smoking after stress doesn't  │
│  actually help—it just delays my response to    │
│  the problem while making me feel worse."       │
│                                                 │
│  [Reconnect with this →]                        │
└─────────────────────────────────────────────────┘
```

**Placement:** TBD — likely below progress indicator, above illusion list
**Quantity:** 1-3 cards based on moment selection algorithm
**Styling:** Glass card style consistent with app design system

#### Revisit Buttons

```
Previously Completed:
✓ Stress Relief     [Revisit]
✓ Pleasure          [Revisit]
```

**Placement:** Within illusion progress list
**Visibility:** Only for completed illusions

#### "I Need Support" Button

```
[I Need Support]
```

**Placement:** TBD — prominent but not intrusive
**Visibility:** Only after all 5 core illusions completed
**Label Options:** "I Need Support" / "Talk It Through" / "Get Help"

### Session UI

#### Reinforcement Session Header

```
┌─────────────────────────────────────┐
│  🔄 Reconnecting: Stress Relief     │
│  Your last session: 5 days ago      │
└─────────────────────────────────────┘
```

**Note:** Conviction score NOT shown (hidden from users per product decision)

#### Moment Replay Within Session

```
┌─────────────────────────────────────┐
│  💡 You said this on Day 2:         │
│  ┌───────────────────────────────┐  │
│  │ "I realized that smoking      │  │
│  │  after stress doesn't         │  │
│  │  actually help..."            │  │
│  └───────────────────────────────┘  │
│                                      │
│  Does that still feel true?          │
└─────────────────────────────────────┘
```

**Future:** Add play button for audio when voice recordings are available

### Design Specifications

*To be completed with design team:*
- [ ] Moment card component design
- [ ] Revisit button states (hover, active, disabled)
- [ ] Support button placement and styling
- [ ] Session header for reinforcement vs. core distinction
- [ ] Moment replay component within chat
- [ ] Empty state (no moments captured)
- [ ] Loading states

---

## Functional Requirements

### FR-1: Moment Cards on Dashboard

**Description:** Display 1-3 moment cards on the dashboard showing the user's breakthrough moments.

**Requirements:**
- FR-1.1: System shall display moment cards only after at least one moment has been captured
- FR-1.2: System shall select moments using the moment selection algorithm (see FR-1.5)
- FR-1.3: Each card shall display: illusion name, capture date, transcript quote
- FR-1.4: Clicking a moment card shall start a reinforcement session anchored to that moment
- FR-1.5: **Moment Selection Algorithm:**
  - Select the illusion with the lowest conviction score
  - Tiebreaker: most recently completed illusion
  - From that illusion, select 1-3 moments prioritizing `breakthrough` or `identity_shift` types
  - Within those, prioritize highest `confidence_score`
  - Rotate moments so users see different ones on repeat visits

**Edge Case — No Moments:**
- FR-1.6: If the lowest-conviction illusion has zero moments, display a special "Revisit" card without a quote
- FR-1.7: Special card copy: *"You completed [Illusion Name], but we didn't capture any breakthrough moments. This one might benefit from another conversation."*
- FR-1.8: Do NOT fall back to a different illusion—this one needs attention

### FR-2: Revisit Buttons

**Description:** Allow users to explicitly revisit any completed illusion.

**Requirements:**
- FR-2.1: Display "Revisit" button next to each completed illusion in the progress list
- FR-2.2: Button shall be visible for any illusion with a completed core session
- FR-2.3: No conviction threshold required—even low-conviction completions can be revisited
- FR-2.4: Clicking "Revisit" shall start an illusion-specific reinforcement session
- FR-2.5: Revisit buttons shall remain available post-ceremony

### FR-3: "I Need Support" Button

**Description:** Provide generic support for users who need help but aren't targeting a specific illusion.

**Requirements:**
- FR-3.1: Display "I Need Support" button only after all 5 core illusions are completed
- FR-3.2: Button shall NOT be visible during the core program
- FR-3.3: Clicking the button shall start a generic boost session
- FR-3.4: Session shall have full user context (story, moments, conviction history)
- FR-3.5: AI shall identify relevant illusion(s) and may steer toward them

### FR-4: Reinforcement Session — Illusion-Specific

**Description:** Conduct a reinforcement conversation for a specific illusion.

**Requirements:**
- FR-4.1: Session shall load previous conviction score for the illusion
- FR-4.2: Session shall load captured moments for the illusion (top 3-5 by confidence)
- FR-4.3: If triggered via moment card, session shall open with that moment as anchor
- FR-4.4: If triggered via Revisit button, session shall open with the strongest moment
- FR-4.5: AI shall use reinforcement system prompt (reconnection framing, not re-teaching)
- FR-4.6: Session shall capture new moments with `session_type: 'reinforcement'`
- FR-4.7: New moment types available: `re_articulation`, `application`, `depth`, `integration`
- FR-4.8: At session end, run simplified conviction assessment

### FR-5: Reinforcement Session — Generic Boost

**Description:** Conduct a supportive conversation not targeting a specific illusion.

**Requirements:**
- FR-5.1: Session shall load full user context (all moments, all conviction history)
- FR-5.2: AI shall use generic boost system prompt (empathetic, exploratory)
- FR-5.3: AI may identify relevant illusion(s) and pivot to illusion-specific territory
- FR-5.4: Session shall NOT run conviction assessment at end (no specific illusion targeted)
- FR-5.5: Session shall be logged with `session_type: 'boost'`

### FR-6: Conviction Assessment — Reinforcement

**Description:** Assess conviction after illusion-specific reinforcement sessions.

**Requirements:**
- FR-6.1: Run assessment at end of illusion-specific reinforcement sessions only
- FR-6.2: Do NOT run for generic boost sessions
- FR-6.3: Assessment shall capture: current conviction (0-10), delta from previous, shift quality
- FR-6.4: Shift quality values: `restored`, `deepened`, `still_struggling`, `new_insight`
- FR-6.5: Assessment shall be stored in `conviction_assessments` table
- FR-6.6: If a new key moment emerged, assessment may quote it

---

## Non-Functional Requirements

### NFR-1: Performance

- NFR-1.1: Moment cards shall load within 500ms of dashboard render
- NFR-1.2: Session context (moments, conviction history) shall load within 1s of session start
- NFR-1.3: Moment selection algorithm shall execute in <100ms

### NFR-2: Reliability

- NFR-2.1: If moment loading fails, dashboard shall gracefully degrade (show Revisit buttons only)
- NFR-2.2: If conviction assessment fails, session shall still complete successfully

### NFR-3: Privacy & Security

- NFR-3.1: All moment data shall remain private to the user (existing RLS policies apply)
- NFR-3.2: Conviction scores shall not be exposed to client-side code (internal only)

### NFR-4: Accessibility

- NFR-4.1: Moment cards shall be keyboard navigable
- NFR-4.2: Screen readers shall announce moment card content appropriately
- NFR-4.3: All interactive elements shall meet WCAG 2.1 AA standards

---

## Key Product Decisions

These decisions document the rationale behind key product choices.

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Availability** | After any completed illusion | Users shouldn't have to wait until post-ceremony to reinforce insights. If they completed Illusion 1 and are struggling with it while working on Illusion 3, they should be able to revisit it. |
| **Conviction Score Visibility** | Hidden from users | Scores are internal for tracking and AI context. Users see progress indicators and moments, not numerical scores. Avoids gamification and "score anxiety." |
| **Session Limits** | No artificial limits | Users can do as many reinforcement sessions as they find helpful. We're not trying to maximize engagement—we trust users to use it when genuinely valuable. |
| **"I Need Support" Button** | Post-program only | Generic support button available only after core program completion (all 5 illusions). During the program, users should stay focused on the curriculum. Hypothesis: completing the full curriculum gives the best outcome. To be validated with user testing. |
| **Moment Selection Priority** | Lowest conviction first | The illusion where the user's conviction is weakest needs the most reinforcement. Tiebreaker: most recently completed. |
| **No-Moments Edge Case** | Show warning card, don't fallback | If an illusion has no captured moments, that's a red flag—it needs attention more than other illusions. Don't hide the problem by showing a different illusion's moments. |

---

## Technical Design

### Session Metadata

`session_type` values in `conversations` table:
- `'core'` - Original illusion exploration
- `'reinforcement'` - Returning to previously covered illusion
- `'boost'` - Generic support conversation
- `'check_in'` - Scheduled check-ins
- `'ceremony'` - Final ceremony conversation

### System Prompts

**Reinforcement Session Prompt:**
```
You are reconnecting with a user who previously worked through [Illusion Name].
They achieved a conviction level of [X/10] and captured these insights:
[List of their captured moments from this illusion]

Current situation: [User's stated reason for returning, or "proactive check-in"]

Your role is to:
1. Validate their previous insights without condescension
2. Explore what's changed or what triggered doubt
3. Help them reconnect with what they already know
4. Generate new articulations that fit their current context
5. Deepen the emotional/identity transformation

Frame: You're helping them restore a shift, not teaching them something new.
```

**Generic Boost Prompt:**
```
You are supporting a user who has completed all 5 core illusions.
They're reaching out for support but haven't specified which illusion.

Their full context:
- Story summary: [user_story]
- Conviction scores: [per illusion]
- Recent moments: [top moments across all illusions]

Your role is to:
1. Listen with empathy—let them express what's going on
2. Identify which illusion(s) may be at play
3. Gently steer toward that territory when appropriate
4. Pull relevant moments from their history
5. Suggest a focused reinforcement session if deeper work is needed

Frame: You're a supportive presence, not a diagnostic tool.
```

### API Endpoints

#### `POST /api/reinforcement/start`

```typescript
// Request
{
  illusion_key?: string  // Optional: null for generic boost
  moment_id?: string     // Optional: specific moment to anchor to
  reason?: string        // Optional: why they're seeking reinforcement
}

// Response
{
  conversation_id: string
  session_type: 'reinforcement' | 'boost'
  illusion_key?: string
  anchor_moment?: CapturedMoment
  context: {
    previous_conviction?: number
    captured_moments: CapturedMoment[]
    days_since_last_session: number
  }
}
```

#### `POST /api/reinforcement/assess`

```typescript
// Request
{
  conversation_id: string
  illusion_key: string
}

// Response
{
  current_conviction: number  // 0-10
  delta_from_previous: number
  shift_quality: 'restored' | 'deepened' | 'still_struggling' | 'new_insight'
  key_moment?: string  // If a notable new articulation emerged
}
```

### Context Injection Strategy

**What to Include:**
1. Previous conviction trajectory for this illusion
2. Captured moments from this illusion (3-5 most powerful)
3. Related moments from other illusions (if user references them)
4. Recent context (check-ins, ceremony artifacts if applicable)

**What NOT to Include:**
- Raw conversation transcripts (too noisy)
- Moments from illusions they haven't covered yet
- Technical metadata (conviction scores as numbers to user)

### Moment Capture in Reinforcement

**Additional moment types for reinforcement sessions:**
- `re_articulation` - User expresses the truth in a new way
- `application` - User describes how they'll apply the insight
- `depth` - User goes deeper into emotional/identity territory
- `integration` - User connects multiple illusions

**Storage additions:**
```typescript
{
  source_session_type: 'core' | 'reinforcement' | 'boost' | 'check_in'
  references_moment_id?: string  // Link to original moment being refined
  context_trigger?: string  // What specific situation prompted this
}
```

---

## Out of Scope / Deferred

### Deferred to Future Release

| Feature | Reason | Planned For |
|---------|--------|-------------|
| **Audio moment replay** | Requires voice recording feature | After voice recording ships |
| **Post-slip specific flow** | Requires dedicated prompt design and slip detection | Future release |
| **Proactive reinforcement prompts** | Email/push notifications for scheduled tune-ups | Future release |
| **Check-in triggered recommendations** | Requires check-in feature | After check-ins ship |
| **Multi-illusion pattern sessions** | Address multiple illusions simultaneously | Future release |

### Explicitly Not Building

- Gamification (streaks, badges, leaderboards)
- Social features (sharing moments with others)
- Export/download of moments (users can screenshot if needed)

---

## Open Questions

### Resolved

- [x] Should users be able to do reinforcement before completing all 5 core illusions? **Yes, after any completed illusion**
- [x] Do we show conviction scores to users? **No, hidden**
- [x] How many reinforcement sessions per illusion before we suggest something else? **No limits**
- [x] Should moment replay be audio-first or transcript-first? **Transcript-first (audio deferred)**

### Still Open

- [ ] Should reinforcement assessments update `user_story` or use separate storage?
- [ ] How many previous moments to include in context? (Current assumption: 3-5)
- [ ] Do we need conversation threading (linking reinforcement to original core session)?
- [ ] How do we visually distinguish reinforcement sessions in conversation history?
- [ ] What happens if user tries to start reinforcement while a core session is in progress?

---

## Appendix

### A. Therapeutic Framing Guidelines

**Instead of:**
- "Let's review what you learned about..."
- "Remember when we talked about..."
- "You need to understand that..."

**Use:**
- "Let's reconnect with what you discovered..."
- "When you said [quote], that was real. What's different now?"
- "You already know this. Let's find it again."

### B. Reinforcement vs. Core Sessions Comparison

| Aspect | Core Sessions | Reinforcement Sessions |
|--------|---------------|------------------------|
| **Starting Point** | Introducing new illusion | Reconnecting with existing insight |
| **User State** | Curious, exploratory | Doubtful, vulnerable, or proactive |
| **Context Available** | Basic intake + story summary | Full history: moments, conviction trajectory |
| **Pacing** | Socratic discovery, building new belief | Faster movement, leveraging existing foundation |
| **Emotional Tone** | Neutral optimism | Empathetic acknowledgment of struggle |
| **Moment Capture** | Capturing original insights | Capturing refinements, new articulations |
| **Assessment** | Full conviction assessment | Simplified conviction check |
| **Session Goal** | Create new understanding | Restore/deepen existing understanding |

### C. Shift Quality Definitions

- **restored**: Conviction returned to previous level or close to it
- **deepened**: Conviction increased beyond previous maximum
- **still_struggling**: Conviction remains significantly below previous level
- **new_insight**: User articulated something genuinely new, not just remembering

---

## Changelog

| Version | Date       | Changes |
|---------|------------|---------|
| 1.0     | 2026-01-12 | Initial specification |
| 2.0     | 2026-01-26 | Major restructure: Added Solution Summary, User Journeys, Functional/Non-Functional Requirements. Reorganized for clarity. Resolved open questions from v1. |

---

**End of Specification**
