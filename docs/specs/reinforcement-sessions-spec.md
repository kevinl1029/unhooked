# Unhooked: Reinforcement Sessions Specification

**Version:** 2.7
**Created:** 2026-01-12
**Updated:** 2026-01-27
**Status:** Ready for Implementation
**Document Type:** Feature Specification (PRD + Technical Design)
**Related Documents:**
- `core-program-spec` (Core Program)
- `reinforcement-ui-design-spec.md` (UI spec)
- `progress-carousel.final.jsx` (Reference prototype)

---

## Table of Contents

1. [Problem Statement](#problem-statement)
2. [Goals & Success Metrics](#goals)
3. [Solution Summary](#solution-summary)
4. [User Journeys](#user-journeys)
5. [UI/UX Design](#uiux-design)
6. [Functional Requirements](#functional-requirements)
7. [Non-Functional Requirements](#non-functional-requirements)
8. [User Stories](#user-stories)
9. [Key Product Decisions](#key-product-decisions)
10. [Technical Design](#technical-design)
11. [Out of Scope / Deferred](#out-of-scope--deferred)
12. [Open Questions](#open-questions)
13. [Appendix](#appendix)

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

### Design Philosophy

**Single Primary CTA Per State:** Each dashboard state should have exactly one primary CTA (orange gradient). All other actions use secondary styling (glass) to establish clear visual hierarchy. See **ADR-005** for full decision record.

| Dashboard State | Primary CTA | Secondary CTAs |
|-----------------|-------------|----------------|
| **In-Progress** | Continue/Next (current illusion) | Moment replay, Revisit buttons |
| **Ceremony-Ready** | Final Ceremony button | Journey review, Moment replay |
| **Post-Ceremony** | Get Support Now | Moment cards, Your Journey chips |

**Progressive Hierarchy:** UI should match user's journey stage:
- **In-Progress:** Emphasize current illusion (carousel with focus)
- **Ceremony-Ready:** Emphasize ceremony (top of page, primary CTA)
- **Post-Ceremony:** Equal-weight access to all illusions (compact chip row)

**Space Efficiency:** Post-ceremony dashboard should be compact, not overwhelming. Users shouldn't need to scroll excessively to access core features.

---

### Dashboard States & Layouts

#### In-Progress Dashboard (During Core Program)

**Order of sections:**
1. Progress carousel with revisit badges ← Secondary
2. Moment cards (1 card) ← Secondary
3. Current illusion CTA ← **PRIMARY** (orange gradient)

**Progress Carousel:**
```
┌─────────────────────────────────────────────────┐
│           Your Progress                          │
│        2 of 5 illusions explored                 │
│                                                  │
│   ← [✓]    [✓]    [○]    [🔒]   [🔒] →         │
│    Stress Pleasure Focus  Will  Identity         │
│   [Revisit][Revisit]                             │
│                                                  │
│   Progress dots: • ● • • •                       │
│                                                  │
│   ──────────────────────────────────────────    │
│   Continue: The Focus Illusion                   │
│   [Description]                                  │
│   [Continue →]  ← Large CTA for current only     │
└─────────────────────────────────────────────────┘
```

**Carousel Behavior:**
- Horizontally scrollable/swipeable
- Center illusion is largest (96px) and brightest
- Adjacent illusions scaled down (64px, 70% opacity)
- Far illusions smaller (48px, 40% opacity)
- Arrow buttons on desktop, swipe on mobile
- Progress dots below for direct navigation
- Smooth 500ms transitions between states

**Revisit Badges:**
- Small pill button (px-3 py-1) directly under completed illusion circles
- Always visible (not hidden/hover-only)
- Label: "Revisit" with RefreshCw icon
- Semi-transparent glass background
- No duplicate large CTA when completed illusion is focused

**Action Section Below Carousel:**
- **Current illusion focused:** Show large CTA ("Continue: The [Name] Illusion" + description + button)
- **Completed illusion focused:** NO content (badge is sufficient, avoids duplicate CTA)
- **Locked illusion focused:** Show dimmed message ("Complete previous illusions to unlock")

#### Ceremony-Ready Dashboard (All 5 Illusions Complete, Ceremony Not Started)

**Order of sections:**
1. Final Ceremony section ← **PRIMARY** (orange gradient CTA)
2. Your Journey chip row (all 5 illusions) ← Secondary
3. Moment cards (1 card) ← Secondary

**Rationale for order:**
- Ceremony is the culmination of the program—most important next action
- Your Journey provides context for the upcoming ceremony
- Moment cards available for optional reconnection before ceremony

#### Post-Ceremony Dashboard (Ceremony Completed)

**Order of sections:**
1. Support section (generic reinforcement) ← **PRIMARY** (orange gradient CTA)
2. Moment cards (1 card) ← Secondary
3. Your Journey chip row (all 5 illusions) ← Secondary

**Rationale for order:**
- Support button first because it's the primary support mechanism post-ceremony
- Moment cards second as curated entry point based on user's needs
- Your Journey last for explicit illusion selection (power user feature)

**Support Section:**
```
┌─────────────────────────────────────────────────┐
│              Need Support?                       │
│   Reconnect with what you've already discovered  │
│                                                  │
│   [💬 Get Support Now]  ← Primary CTA            │
└─────────────────────────────────────────────────┘
```

**Your Journey (Compact Chip Row):**
```
┌─────────────────────────────────────────────────┐
│  Your Journey                                    │
│  All 5 illusions dismantled                      │
│                                                  │
│  [✓ Stress 🔄] [✓ Pleasure 🔄] [✓ Willpower 🔄] │
│  [✓ Focus 🔄] [✓ Identity 🔄]                    │
└─────────────────────────────────────────────────┘
```

**Chip Row Specs:**
- Height: ~60-80px total (vs 300px+ for vertical list)
- Each chip: checkmark + name + small revisit icon + "X days ago" subtext
- Days format: "Today", "Yesterday", "X days ago" (1-30), "Over a month ago" (31+)
- Wraps to multiple rows on narrow screens
- Hover: scale(1.05)
- All chips equal size/weight (no hierarchy)

---

### Component Specifications

#### Moment Cards

**Visual Design:**
```
┌─────────────────────────────────────────────────┐
│  STRESS RELIEF • 12 DAYS AGO  ← Eyebrow (orange, uppercase) │
│                                                  │
│  "I realized that smoking after stress doesn't  │
│  actually help—it just delays my response to    │
│  the problem while making me feel worse."       │
│  ↑ Blockquote (17px, line-height 1.6)          │
│                                                  │
│  [Reconnect with this →]  ← Full-width primary CTA │
└─────────────────────────────────────────────────┘
```

**Styling:**
- Glass card: `background: rgba(13, 92, 99, 0.35)`, `backdrop-filter: blur(12px)`
- Border radius: `8px` mobile, `24px` desktop
- Padding: `24px`
- Hover: `scale(1.01)`, cursor pointer on entire card
- Shadow: `0 24px 64px rgba(0, 0, 0, 0.25)`

**Content Rules:**
- Eyebrow: `{ILLUSION_NAME} • {RELATIVE_TIME}` in orange (`#fc4a1a`) — e.g., "STRESS • 12 DAYS AGO"
- Quote: 40-240 characters, truncate with "..." if longer
- Date: Relative time format (e.g., "12 days ago", "Today", "Yesterday")
- Button: Orange gradient primary button

**Placement:**
- **In-Progress:** Below progress carousel, above current illusion CTA
- **Post-Ceremony:** Below support section, above Your Journey

**Quantity:**
- Show 1 card from the illusion with lowest conviction score
- Tiebreaker: most recently completed illusion
- Within that illusion, select moment using weighted random:
  - Weight by `confidence_score` (higher = more likely)
  - Deprioritize recently-used moments via `last_used_at` (older = more likely)
- Update `last_used_at` when moment is used as anchor

**Visibility:**
- Show when: At least one moment captured from any completed illusion
- Hide when: No moments captured yet, or currently in a session

---

#### Revisit Buttons

**In-Progress (Carousel Badge):**
- Placement: Directly under completed illusion circles in carousel
- Style: Small pill button, semi-transparent glass
- Size: `px-3 py-1`, scales with circle size when focused
- Always visible (not hover-only)
- Icon: RefreshCw (12px when focused, 10px otherwise)
- Label: "Revisit"

**Post-Ceremony (Chip Component):**
- Integrated into chip: checkmark + name + revisit icon
- Icon: Small RefreshCw (16px, opacity 0.7) on right side
- Entire chip is clickable
- No separate revisit button needed

**Interaction:**
- Click starts illusion-specific reinforcement session
- Loads full illusion context (previous conviction, captured moments)
- No duplicate large CTA below carousel

---

#### Support Section (Generic Reinforcement)

**Visual Design:**
```
┌─────────────────────────────────────────────────┐
│              Need Support?                       │
│   Reconnect with what you've already discovered  │
│                                                  │
│   [💬 Get Support Now]                           │
└─────────────────────────────────────────────────┘
```

**Styling:**
- Same glass card style as other sections
- Padding: `32px` (more generous than moment cards)
- Text-align: center
- Button: Full-width, primary orange gradient, icon left of text

**Placement:**
- **Post-Ceremony ONLY:** First section on dashboard (above moment cards)
- **In-Progress:** NOT shown (deferred to post-MVP)

**Interaction:**
- Opens generic boost conversation
- AI can identify relevant illusions and steer toward them
- User doesn't specify which illusion upfront

**Copy:**
- Heading: "Need Support?"
- Description: "Reconnect with what you've already discovered"
- Button: "Get Support Now" with MessageCircle icon

---

### Responsive Behavior

**Mobile (< 768px):**
- Carousel: Swipe gestures, no visible arrows
- Moment cards: Full width, stack vertically
- Support section: Full width
- Chip row: Wraps to 2-3 rows
- Border radius: `8px` (rounded-lg)

**Desktop (≥ 768px):**
- Carousel: Arrow buttons visible, click to navigate
- Moment cards: Single column (same as mobile for readability)
- Support section: Centered, max-width
- Chip row: Single row if space allows, wraps if needed
- Border radius: `24px` (rounded-3xl)

---

### Implementation Notes for Coding Agent

#### Data Requirements

**Progress Carousel:**
```typescript
interface IllusionProgress {
  key: string;           // 'stress', 'pleasure', etc.
  name: string;          // Display name
  status: 'completed' | 'current' | 'locked';
  number: 1 | 2 | 3 | 4 | 5;
  daysSince?: number;    // Only for completed
}
```

**Moment Cards:**
```typescript
interface MomentCard {
  moment_id: string;
  quote: string;         // 40-240 chars
  illusion_key: string;
  illusion_name: string; // Display name
  relative_time: string; // "12 days ago", "Today", "Yesterday"
  created_at: string;    // ISO timestamp for calculation
}
```

**API Endpoints:**

1. **Load moment cards:**
   - `GET /api/dashboard/moments`
   - Returns: Pre-selected 1-3 moments based on conviction algorithm
   - Cache: 1 hour

2. **Start reinforcement (from moment card):**
   - `POST /api/reinforcement/start`
   - Body: `{ moment_id: string, illusion_key: string }`
   - Returns: `{ conversation_id, session_type: 'reinforcement', anchor_moment, context }`

3. **Start reinforcement (from revisit badge/chip):**
   - `POST /api/reinforcement/start`
   - Body: `{ illusion_key: string }`
   - Returns: `{ conversation_id, session_type: 'reinforcement', context }`

4. **Start generic support:**
   - `POST /api/reinforcement/start`
   - Body: `{ reason: 'generic_boost' }`
   - Returns: `{ conversation_id, session_type: 'boost', context }`

#### Component Structure

```
DashboardPage
├── InProgressDashboard (if !ceremony_complete)
│   ├── ProgressCarousel
│   │   ├── CarouselTrack (illusions with badges)
│   │   ├── ProgressDots
│   │   └── ActionSection (current/locked only)
│   └── MomentCardsSection (1-3 cards)
│
└── PostCeremonyDashboard (if ceremony_complete)
    ├── SupportSection (generic reinforcement)
    ├── MomentCardsSection (1-3 cards)
    └── YourJourneySection (chip row)
```

#### State Management

**Carousel Active Index:**
- Default: Index of current illusion (in-progress) or middle illusion (post-ceremony)
- Updates: On click, arrow navigation, or dot navigation
- Smooth transition: 500ms ease-out

**Visibility Logic:**
```typescript
// Moment cards
showMomentCards = hasCapturedMoments && !inSession

// Support section
showSupportSection = ceremonyComplete && !inSession

// Revisit badges (carousel)
showRevisitBadge(illusion) = illusion.status === 'completed'

// Action section below carousel
showActionContent = activeIllusion.status !== 'completed'
```

#### Accessibility

- All interactive elements keyboard navigable
- Carousel: Arrow keys work when focused
- Progress dots: Tab navigation + Enter to select
- Screen readers: Proper ARIA labels on all buttons
- Focus indicators: Visible ring on all focusable elements

#### Performance

- Carousel transform: Use CSS `translate3d` for GPU acceleration
- Moment cards: Lazy load if below fold
- Images/icons: Use SVG (lucide-react)
- Animations: Respect `prefers-reduced-motion`

---

### Design Specifications Checklist

- [x] Moment card component design (detailed above)
- [x] Revisit button states and placement (badge on circles, no duplicate CTA)
- [x] Support button placement and styling (first section post-ceremony)
- [x] Progress carousel with focus hierarchy (center largest)
- [x] Chip row for post-ceremony (compact, equal-weight)
- [x] Responsive breakpoints and adaptations (mobile/desktop)
- [x] Empty state: No moments yet (don't show moment cards section)
- [x] Loading states (inline spinner, matching existing app patterns)
- [x] Session header for reinforcement vs. core (see below)
- [x] Moment display in chat (AI speaks it naturally, no special component)

---

### Session Header Specification

The session header displays context-appropriate text based on the entry point:

| Entry Point | Header Text | Example |
|-------------|-------------|---------|
| **Revisit button/chip** | Illusion name | "Stress Relief" |
| **Moment card click** | Abridged moment text (truncate ~60 chars with "...") | "I realized smoking after stress doesn't actually..." |
| **Get Support Now** | Static label | "Reinforcement" |

**Styling:**
- Same header style as core sessions
- Text truncation: Single line, ellipsis overflow
- No additional badge or indicator needed

**Within Chat:**
- The AI speaks the full moment text naturally in its opening message
- No special styled component for moment replay
- Example: "You once said: '[full quote]'. Does that still feel true right now?"

---

### Visual Reference

See `reinforcement-ui-design-spec-v1.2.md` and `progress-carousel-final.jsx` for detailed visual specifications and interactive prototype.

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
  - From that illusion, select moments using weighted random:
    - Weight by `confidence_score` (higher = more likely)
    - Deprioritize recently-used moments via `last_used_at` (older = more likely)
    - All moment types are equal (no type-based prioritization)
  - Update `last_used_at` on the selected moment when used as anchor

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
- FR-4.2: Session shall load captured moments for the illusion (fixed 3, weighted by confidence, deprioritized by last_used_at)
- FR-4.3: If triggered via moment card, session shall open with that moment as anchor
- FR-4.4: If triggered via Revisit button, session shall open with the strongest moment (using weighted random selection)
- FR-4.5: AI shall use reinforcement system prompt (BASE_SYSTEM_PROMPT + REINFORCEMENT_MODE_OVERLAY)
- FR-4.6: Session shall capture new moments with `session_type: 'reinforcement'`, using existing moment types
- FR-4.7: If a better key insight emerges, it can replace the current `{illusionKey}_key_insight_id`
- FR-4.8: At session end, run conviction assessment (same process as core sessions)
- FR-4.9: Update `last_used_at` on the anchor moment when session starts

### FR-5: Reinforcement Session — Generic Boost

**Description:** Conduct a supportive conversation not targeting a specific illusion.

**Requirements:**
- FR-5.1: Session shall load full user context (all moments, all conviction history)
- FR-5.2: AI shall use generic boost system prompt (empathetic, exploratory)
- FR-5.3: AI shall naturally steer toward identified illusion(s) when relevant (no explicit "start a new session" handoff)
- FR-5.4: If AI identifies specific illusion(s) discussed substantively, run conviction assessment for those illusion(s)
- FR-5.5: Session shall be logged with `session_type: 'boost'`
- FR-5.6: Session can update `user_story` for any illusion(s) where insights, conviction, or resistance were discussed

### FR-6: Conviction Assessment — Reinforcement

**Description:** Assess conviction after reinforcement sessions.

**Requirements:**
- FR-6.1: Run assessment at end of illusion-specific reinforcement sessions
- FR-6.2: For boost sessions: run assessment for any illusion(s) substantively discussed (AI identifies)
- FR-6.3: Assessment uses the same process as core sessions (identical, not simplified)
- FR-6.4: Assessment shall capture: current conviction (0-10), delta from previous, shift quality
- FR-6.5: Shift quality values: `restored`, `deepened`, `still_struggling`, `new_insight`
- FR-6.6: Assessment shall be stored in `conviction_assessments` table
- FR-6.7: If a new key moment emerged, assessment may quote it

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

## User Stories

Stories are organized by implementation area. Each story is sized for one focused Claude Code session.

**Reference Format:** Each story includes a `References` section with document paths and section anchors. When implementing a story in isolation, read the referenced sections for full context on styling, data structures, and behavior requirements.

### API & Backend

#### US-001: Moment Selection API Endpoint

**Description:** As a developer, I want an API endpoint that returns the optimal moment card for the dashboard so that the frontend can display the right reinforcement prompt.

**References:**
- `docs/specs/reinforcement-sessions-spec.md`: [FR-1: Moment Cards on Dashboard](#fr-1-moment-cards-on-dashboard), [Technical Design > API Endpoints](#api-endpoints)

**Acceptance Criteria:**
- [ ] `GET /api/dashboard/moments` endpoint exists and requires authentication
- [ ] Endpoint returns single moment from the illusion with lowest conviction score
- [ ] Tiebreaker: selects most recently completed illusion when conviction scores are equal
- [ ] Moment selection uses weighted random (higher `confidence_score` = more likely)
- [ ] Recently-used moments are deprioritized via `last_used_at` field
- [ ] Response includes: `moment_id`, `quote` (40-240 chars, truncated with "..."), `illusion_key`, `illusion_name`, `relative_time`, `created_at`
- [ ] Returns empty response (not error) when no moments exist
- [ ] When lowest-conviction illusion has zero moments, returns special payload with `no_moments: true` and `illusion_key`
- [ ] Typecheck/lint passes

---

#### US-002: Start Reinforcement Session API

**Description:** As a developer, I want an API endpoint to start a reinforcement session so that the frontend can initiate illusion-specific or moment-anchored sessions.

**References:**
- `docs/specs/reinforcement-sessions-spec.md`: [FR-4: Reinforcement Session — Illusion-Specific](#fr-4-reinforcement-session--illusion-specific), [Technical Design > API Endpoints](#api-endpoints), [Technical Design > Context Injection Strategy](#context-injection-strategy)

**Acceptance Criteria:**
- [ ] `POST /api/reinforcement/start` endpoint exists and requires authentication
- [ ] Accepts optional `illusion_key` (string, 1-5 mapped to illusion)
- [ ] Accepts optional `moment_id` (UUID) for moment-anchored sessions
- [ ] Accepts optional `reason` (string) for context
- [ ] Creates conversation record with `session_type: 'reinforcement'`
- [ ] Returns `conversation_id`, `session_type`, `illusion_key`, `anchor_moment` (if provided), and `context` object
- [ ] Context includes: `previous_conviction`, `captured_moments` (max 3), `days_since_last_session`
- [ ] Updates `last_used_at` on anchor moment when provided
- [ ] Returns 400 if `illusion_key` provided but illusion not completed by user
- [ ] Returns 401 if user not authenticated
- [ ] Typecheck/lint passes

---

#### US-003: Start Generic Boost Session API

**Description:** As a developer, I want an API endpoint to start a generic boost session so that post-ceremony users can get support without selecting a specific illusion.

**References:**
- `docs/specs/reinforcement-sessions-spec.md`: [FR-5: Reinforcement Session — Generic Boost](#fr-5-reinforcement-session--generic-boost), [Technical Design > API Endpoints](#api-endpoints), [Technical Design > Context Injection Strategy](#context-injection-strategy)

**Acceptance Criteria:**
- [ ] `POST /api/reinforcement/start` with `{ reason: 'generic_boost' }` starts a boost session
- [ ] Creates conversation record with `session_type: 'boost'`
- [ ] Returns 403 if user has not completed all 5 core illusions
- [ ] Context includes all conviction scores and top 3 moments per completed illusion
- [ ] Returns `conversation_id`, `session_type: 'boost'`, and full `context` object
- [ ] Typecheck/lint passes

---

#### US-004: Reinforcement Conviction Assessment API

**Description:** As a developer, I want an API endpoint to run conviction assessment after reinforcement sessions so that we can track conviction changes over time.

**References:**
- `docs/specs/reinforcement-sessions-spec.md`: [FR-6: Conviction Assessment — Reinforcement](#fr-6-conviction-assessment--reinforcement), [Technical Design > API Endpoints](#api-endpoints), [Appendix C: Shift Quality Definitions](#c-shift-quality-definitions)

**Acceptance Criteria:**
- [ ] `POST /api/reinforcement/assess` endpoint exists and requires authentication
- [ ] Accepts `conversation_id` (required) and `illusion_key` (required)
- [ ] Runs same assessment process as core sessions (not simplified)
- [ ] Returns `current_conviction` (0-10), `delta_from_previous`, `shift_quality`
- [ ] Shift quality is one of: `restored`, `deepened`, `still_struggling`, `new_insight`
- [ ] Stores assessment in `conviction_assessments` table
- [ ] Updates `user_story` fields: `{illusionKey}_conviction`, `{illusionKey}_resistance_notes`, `{illusionKey}_key_insight_id` (if better insight emerged)
- [ ] Returns 404 if conversation not found
- [ ] Typecheck/lint passes

---

#### US-005: Reinforcement System Prompts

**Description:** As a developer, I want reinforcement mode overlays for the AI system prompt so that the AI uses the right framing for reconnection vs. teaching.

**References:**
- `docs/specs/reinforcement-sessions-spec.md`: [Technical Design > System Prompts](#system-prompts), [Technical Design > Context Injection Strategy](#context-injection-strategy), [Appendix A: Therapeutic Framing Guidelines](#a-therapeutic-framing-guidelines)

**Acceptance Criteria:**
- [ ] `REINFORCEMENT_MODE_OVERLAY` constant added to prompt utilities
- [ ] Overlay includes placeholders for: illusion name, previous conviction, captured moments (max 3), current situation
- [ ] Overlay instructs AI to: open with anchor moment, explore triggers, help reconnect, generate new articulations, end with `[SESSION_COMPLETE]`
- [ ] `BOOST_MODE_OVERLAY` constant added for generic support
- [ ] Boost overlay includes placeholders for: user story, all conviction scores, recent moments across all illusions
- [ ] Boost overlay instructs AI to: listen with empathy, identify relevant illusion(s), steer naturally, pull relevant moments
- [ ] `buildSessionContext` in `context-builder.ts` extended to handle reinforcement and boost modes
- [ ] Typecheck/lint passes

---

### Dashboard UI - In Progress State

#### US-006: Progress Carousel Component

**Description:** As a user in the core program, I want to see my progress as a visual carousel so that I can understand where I am in my journey and navigate between illusions.

**References:**
- `docs/specs/reinforcement-sessions-spec.md`: [UI/UX Design > Dashboard States & Layouts > In-Progress Dashboard](#in-progress-dashboard-during-core-program), [UI/UX Design > Implementation Notes](#implementation-notes-for-coding-agent)
- `docs/specs/progress-carousel-final.jsx`: Reference prototype implementation

**Acceptance Criteria:**
- [ ] `ProgressCarousel.vue` component created
- [ ] Displays all 5 illusions with status icons: ✓ (completed), ○ (current), 🔒 (locked)
- [ ] Center illusion is largest (96px) and brightest (100% opacity)
- [ ] Adjacent illusions scaled down (64px, 70% opacity)
- [ ] Far illusions smaller (48px, 40% opacity)
- [ ] Arrow buttons visible on desktop for navigation
- [ ] Progress dots below carousel for direct navigation
- [ ] Smooth 500ms transitions between focus states
- [ ] Default focus: current illusion index
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

---

#### US-007: Carousel Touch/Swipe Support

**Description:** As a mobile user, I want to swipe the progress carousel so that I can navigate between illusions without arrow buttons.

**References:**
- `docs/specs/reinforcement-sessions-spec.md`: [UI/UX Design > Dashboard States & Layouts > In-Progress Dashboard](#in-progress-dashboard-during-core-program) (Carousel Behavior section), [UI/UX Design > Responsive Behavior](#responsive-behavior)
- `docs/specs/progress-carousel-final.jsx`: Reference prototype implementation

**Acceptance Criteria:**
- [ ] Carousel responds to horizontal swipe gestures on touch devices
- [ ] Swipe left advances to next illusion (if not at end)
- [ ] Swipe right moves to previous illusion (if not at start)
- [ ] Arrow buttons hidden on mobile (< 768px)
- [ ] Minimum swipe distance threshold prevents accidental navigation
- [ ] Smooth animation matches desktop behavior (500ms ease-out)
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill (mobile viewport)

---

#### US-008: Revisit Badge on Carousel

**Description:** As a user, I want to see a "Revisit" button under completed illusions in the carousel so that I can quickly start a reinforcement session.

**References:**
- `docs/specs/reinforcement-sessions-spec.md`: [UI/UX Design > Component Specifications > Revisit Buttons](#revisit-buttons), [FR-2: Revisit Buttons](#fr-2-revisit-buttons)

**Acceptance Criteria:**
- [ ] Small pill button appears directly under completed illusion circles
- [ ] Badge shows "Revisit" text with RefreshCw icon (12px when focused, 10px otherwise)
- [ ] Badge uses semi-transparent glass background (`rgba(31, 108, 117, 0.5)`)
- [ ] Badge always visible (not hover-only) for completed illusions
- [ ] Badge scales proportionally when its illusion is focused vs. unfocused
- [ ] Clicking badge navigates to `/reinforcement/[illusion]`
- [ ] Badge not shown for current or locked illusions
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

---

#### US-009: Carousel Action Section

**Description:** As a user, I want to see relevant actions below the carousel based on which illusion is focused so that I know what I can do next.

**References:**
- `docs/specs/reinforcement-sessions-spec.md`: [UI/UX Design > Dashboard States & Layouts > In-Progress Dashboard](#in-progress-dashboard-during-core-program) (Action Section Below Carousel), [UI/UX Design > Implementation Notes > State Management](#state-management)

**Acceptance Criteria:**
- [ ] Action section appears below carousel and progress dots
- [ ] When current illusion focused: shows large CTA "Continue: The [Name] Illusion" + description + button
- [ ] When completed illusion focused: action section is empty (badge is sufficient)
- [ ] When locked illusion focused: shows dimmed message "Complete previous illusions to unlock"
- [ ] Continue button navigates to `/session/[illusion]`
- [ ] Action section animates smoothly when carousel focus changes
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

---

#### US-010: Moment Card Component

**Description:** As a user, I want to see my breakthrough moment displayed as a card so that I can reconnect with my own insight.

**References:**
- `docs/specs/reinforcement-sessions-spec.md`: [UI/UX Design > Component Specifications > Moment Cards](#moment-cards), [UI/UX Design > Implementation Notes > Data Requirements](#data-requirements)
- `CLAUDE.md`: Brand Design System (color tokens, typography, glass styling)

**Acceptance Criteria:**
- [ ] `MomentCard.vue` component created
- [ ] Displays eyebrow text: `{ILLUSION_NAME} • {RELATIVE_TIME}` in orange (#fc4a1a), uppercase
- [ ] Displays quote in blockquote style (17px, line-height 1.6)
- [ ] Quote truncated with "..." if longer than 240 characters
- [ ] Relative time format: "Today", "Yesterday", "X days ago" (1-30), "Over a month ago" (31+)
- [ ] Full-width **secondary** CTA button: "Reconnect with this →" (glass style per ADR-005)
- [ ] Glass card styling with `backdrop-filter: blur(12px)`, 24px padding
- [ ] Border radius: 8px mobile, 24px desktop
- [ ] Hover effect: `scale(1.01)`, cursor pointer on entire card
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

---

#### US-011: Moment Card Click Navigation

**Description:** As a user, I want to click a moment card to start a reinforcement session anchored to that moment so that I can reconnect with that specific insight.

**References:**
- `docs/specs/reinforcement-sessions-spec.md`: [FR-1.4](#fr-1-moment-cards-on-dashboard), [Technical Design > Routes](#routes)

**Acceptance Criteria:**
- [ ] Clicking moment card navigates to `/reinforcement/[illusion]?moment_id=[uuid]`
- [ ] Both card body and CTA button trigger navigation
- [ ] Navigation uses Nuxt `navigateTo()` for client-side routing
- [ ] Moment ID is preserved in query params for session initialization
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

---

#### US-012: No-Moments Warning Card

**Description:** As a user who completed an illusion without captured moments, I want to see a special prompt so that I know this illusion needs attention.

**References:**
- `docs/specs/reinforcement-sessions-spec.md`: [FR-1.6, FR-1.7, FR-1.8](#fr-1-moment-cards-on-dashboard) (Edge Case — No Moments), [User Journeys > Journey 4](#journey-4-edge-case--no-moments-captured)

**Acceptance Criteria:**
- [ ] When API returns `no_moments: true`, display warning card variant
- [ ] Card copy: "You completed [Illusion Name], but we didn't capture any breakthrough moments. This one might benefit from another conversation."
- [ ] CTA button: "Revisit [Illusion Name] →"
- [ ] Same glass card styling as regular moment cards
- [ ] Clicking navigates to `/reinforcement/[illusion]` (no moment_id param)
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

---

#### US-013: In-Progress Dashboard Layout

**Description:** As a user in the core program, I want the dashboard to show my progress carousel and moment cards so that I can continue my journey or reinforce past insights.

**References:**
- `docs/specs/reinforcement-sessions-spec.md`: [UI/UX Design > Dashboard States & Layouts > In-Progress Dashboard](#in-progress-dashboard-during-core-program), [UI/UX Design > Implementation Notes > Component Structure](#component-structure)

**Acceptance Criteria:**
- [ ] Dashboard detects user is in-progress (not all 5 illusions completed)
- [ ] Section order: Progress carousel → Moment cards → (current illusion CTA is part of carousel action section)
- [ ] Moment cards section hidden if no moments captured yet
- [ ] Moment cards section loads data from `GET /api/dashboard/moments`
- [ ] Shows loading spinner while moment data loads
- [ ] Gracefully degrades if moment loading fails (shows carousel only)
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

---

### Dashboard UI - Post-Ceremony State

#### US-014: Support Section Component

**Description:** As a post-ceremony user, I want a prominent "Get Support Now" button so that I can quickly get help when I need it.

**References:**
- `docs/specs/reinforcement-sessions-spec.md`: [UI/UX Design > Component Specifications > Support Section](#support-section-generic-reinforcement), [FR-3: "I Need Support" Button](#fr-3-i-need-support-button)
- `CLAUDE.md`: Brand Design System (button styles, glass card styling)

**Acceptance Criteria:**
- [ ] `SupportSection.vue` component created
- [ ] Heading: "Need Support?"
- [ ] Description: "Reconnect with what you've already discovered"
- [ ] Primary CTA button: "Get Support Now" with MessageCircle icon
- [ ] Same glass card styling, 32px padding, text-align center
- [ ] Button uses full-width orange gradient style
- [ ] Clicking navigates to `/support`
- [ ] Component only rendered when `ceremonyComplete === true`
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

---

#### US-015: Your Journey Chip Row

**Description:** As a post-ceremony user, I want to see all my completed illusions as compact chips so that I can quickly revisit any one of them.

**References:**
- `docs/specs/reinforcement-sessions-spec.md`: [UI/UX Design > Dashboard States & Layouts > Post-Ceremony Dashboard](#post-ceremony-dashboard) (Your Journey section, Chip Row Specs)
- `CLAUDE.md`: Brand Design System (color tokens, hover effects)

**Acceptance Criteria:**
- [ ] `YourJourneySection.vue` component created
- [ ] Header: "Your Journey" with subtext "All 5 illusions dismantled"
- [ ] Displays 5 chips, one per illusion
- [ ] Each chip shows: checkmark icon, illusion name, small RefreshCw icon, "X days ago" subtext
- [ ] Days format: "Today", "Yesterday", "X days ago" (1-30), "Over a month ago" (31+)
- [ ] Chips are equal size/weight (no hierarchy)
- [ ] Chip row wraps to multiple rows on narrow screens
- [ ] Chip hover effect: `scale(1.05)`
- [ ] Clicking chip navigates to `/reinforcement/[illusion]`
- [ ] Total section height: 60-80px (vs 300px+ for vertical list)
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

---

#### US-016: Post-Ceremony Dashboard Layout

**Description:** As a post-ceremony user, I want a compact dashboard focused on support so that I can get help quickly without excessive scrolling.

**References:**
- `docs/specs/reinforcement-sessions-spec.md`: [UI/UX Design > Dashboard States & Layouts > Post-Ceremony Dashboard](#post-ceremony-dashboard), [UI/UX Design > Implementation Notes > Component Structure](#component-structure)

**Acceptance Criteria:**
- [ ] Dashboard detects user is post-ceremony (all 5 illusions completed)
- [ ] Section order: Support section → Moment cards → Your Journey chip row
- [ ] Support section is first (primary) element
- [ ] Moment cards section loads from `GET /api/dashboard/moments`
- [ ] Your Journey chip row loads completion data from user progress
- [ ] Progress carousel NOT shown (replaced by chip row)
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

---

### Session UI

#### US-017: Reinforcement Session Page

**Description:** As a user, I want a dedicated page for reinforcement sessions so that I can have a focused conversation about a specific illusion.

**References:**
- `docs/specs/reinforcement-sessions-spec.md`: [Technical Design > Routes](#routes), [UI/UX Design > Session Header Specification](#session-header-specification), [FR-4: Reinforcement Session — Illusion-Specific](#fr-4-reinforcement-session--illusion-specific)

**Acceptance Criteria:**
- [ ] `/reinforcement/[illusion].vue` page created
- [ ] Route param `illusion` accepts 1-5
- [ ] Query param `moment_id` is optional (UUID)
- [ ] On mount, calls `POST /api/reinforcement/start` with appropriate params
- [ ] Shows loading state while session initializes
- [ ] Uses same chat UI components as core sessions
- [ ] Session header shows illusion name (from revisit) OR abridged moment text (from moment card)
- [ ] Abridged moment text truncated at ~60 chars with "..."
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

---

#### US-018: Support Session Page

**Description:** As a post-ceremony user, I want a dedicated support page so that I can have a conversation when I need help but don't know which illusion to focus on.

**References:**
- `docs/specs/reinforcement-sessions-spec.md`: [Technical Design > Routes](#routes), [FR-3: "I Need Support" Button](#fr-3-i-need-support-button), [FR-5: Reinforcement Session — Generic Boost](#fr-5-reinforcement-session--generic-boost), [User Journeys > Journey 3](#journey-3-user-needs-general-support-post-program)

**Acceptance Criteria:**
- [ ] `/support.vue` page created
- [ ] On mount, calls `POST /api/reinforcement/start` with `{ reason: 'generic_boost' }`
- [ ] Redirects to dashboard with error toast if user hasn't completed all 5 illusions
- [ ] Shows loading state while session initializes
- [ ] Uses same chat UI components as core sessions
- [ ] Session header shows "Reinforcement" (static label)
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

---

#### US-019: Reinforcement Session Completion

**Description:** As a user finishing a reinforcement session, I want the session to end gracefully and assess my conviction so that my progress is tracked.

**References:**
- `docs/specs/reinforcement-sessions-spec.md`: [Technical Design > Session Ending](#session-ending), [FR-6: Conviction Assessment — Reinforcement](#fr-6-conviction-assessment--reinforcement), [Technical Design > Moment Capture in Reinforcement](#moment-capture-in-reinforcement)

**Acceptance Criteria:**
- [ ] Session detects `[SESSION_COMPLETE]` marker in AI response (same as core sessions)
- [ ] For illusion-specific sessions: calls `POST /api/reinforcement/assess` with conversation_id and illusion_key
- [ ] For boost sessions: calls assessment for each illusion substantively discussed (AI identifies in response)
- [ ] Shows brief completion message/animation
- [ ] Navigates back to dashboard after completion
- [ ] New moments captured during session appear on dashboard
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

---

### Integration & Polish

#### US-020: Dashboard State Transition

**Description:** As a user completing the ceremony, I want the dashboard to immediately switch to post-ceremony layout so that I see the right interface.

**References:**
- `docs/specs/reinforcement-sessions-spec.md`: [Implementation Notes > Rollout](#rollout), [UI/UX Design > Implementation Notes > Visibility Logic](#visibility-logic)

**Acceptance Criteria:**
- [ ] Dashboard re-fetches user progress after any session completion
- [ ] When `ceremonyComplete` transitions from false to true, layout switches immediately
- [ ] No page refresh required
- [ ] Moment card cache invalidated when any session completes
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

---

#### US-021: Error Handling and Graceful Degradation

**Description:** As a user, I want the dashboard to work even if some data fails to load so that I can still access core functionality.

**References:**
- `docs/specs/reinforcement-sessions-spec.md`: [NFR-2: Reliability](#nfr-2-reliability)

**Acceptance Criteria:**
- [ ] If moment loading fails, dashboard shows Revisit buttons only (no error modal)
- [ ] If reinforcement session start fails, shows toast error and stays on dashboard
- [ ] If conviction assessment fails, session still completes successfully (logs error server-side)
- [ ] Network errors show user-friendly messages, not technical errors
- [ ] Retry mechanism for transient failures (moment loading)
- [ ] Typecheck/lint passes

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

### Session Ending

**End Signal:** All session types (core, reinforcement, boost) use the same `[SESSION_COMPLETE]` marker to trigger post-session tasks.

**End Criteria:** AI uses judgment to determine when a reinforcement session is complete (reconnection feels achieved). This is more open-ended than core sessions which have curriculum milestones. Can be refined based on user testing.

**Concurrent Sessions:** Multiple reinforcement sessions are allowed simultaneously. No blocking at API or UI level.

### Routes

**Reinforcement Routes:**
- `/reinforcement/[illusion]` — Illusion-specific reinforcement (illusion is a number 1-5)
- `/reinforcement/[illusion]?moment_id=xyz` — Moment-anchored reinforcement
- `/support` — Generic boost session

**Route Parameters:**
- `illusion`: Number (1-5), consistent with `/session/[illusion]` pattern
- `moment_id`: Query param (UUID), passed when starting from a moment card

**Transition:** Same pattern as core sessions — instant navigation to route, component handles loading states internally.

### System Prompts

**Architecture:** Reinforcement prompts extend the existing `BASE_SYSTEM_PROMPT` (Allen Carr methodology, tone, safety) with a mode-specific overlay. This keeps prompts DRY and ensures consistent philosophy/tone.

Structure: `BASE_SYSTEM_PROMPT + REINFORCEMENT_MODE_OVERLAY + PersonalizationContext`

**Reinforcement Mode Overlay:**
```
--- REINFORCEMENT MODE ---

You are reconnecting with a user who previously worked through [Illusion Name].
They achieved a conviction level of [X/10] and captured these insights:
[List of their captured moments from this illusion - max 3]

Current situation: [User's stated reason for returning, or "proactive check-in"]

In this mode, your session structure shifts:
1. Open with their anchor moment (if provided) — "You once said: '[quote]'. Does that still feel true?"
2. Explore what's changed or what triggered doubt
3. Help them reconnect with what they already know
4. Generate new articulations that fit their current context
5. Deepen the emotional/identity transformation

Frame: You're helping them restore a shift, not teaching them something new.
When reconnection feels complete, end with affirmation and output [SESSION_COMPLETE].

--- END REINFORCEMENT MODE ---
```

**Generic Boost Mode Overlay:**
```
--- BOOST MODE ---

You are supporting a user who has completed all 5 core illusions.
They're reaching out for support but haven't specified which illusion.

Their full context:
- Story summary: [user_story]
- Conviction scores: [per illusion]
- Recent moments: [top moments across all illusions - max 3 per illusion]

In this mode:
1. Listen with empathy—let them express what's going on
2. Identify which illusion(s) may be at play
3. Naturally steer toward that territory when appropriate (no explicit "start a new session" handoff)
4. Pull relevant moments from their history
5. If you identify a specific illusion being discussed, the session can focus there

Frame: You're a supportive presence, not a diagnostic tool.
When the conversation reaches resolution, end with affirmation and output [SESSION_COMPLETE].

--- END BOOST MODE ---
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
    captured_moments: CapturedMoment[]  // Fixed 3 moments
    days_since_last_session: number
  }
}

// Errors
// 400 Bad Request: illusion_key provided but illusion not completed
// 401 Unauthorized: user not authenticated
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

**Implementation:** Extend existing `buildSessionContext` in `context-builder.ts` to handle reinforcement mode. Same pattern as core sessions — build structured context object, format into prompt string.

**What to Include:**
1. Previous conviction score for this illusion (from `user_story`)
2. **Fixed 3 moments** from this illusion (weighted by confidence, deprioritized by last_used_at)
3. Resistance notes if present
4. User background (from intake)
5. Origin story summary (from `user_story`)

**For Boost Sessions:**
- Include top 3 moments per illusion (across all completed illusions)
- Include all conviction scores
- Full user context for AI to identify relevant territory

**What NOT to Include:**
- Raw conversation transcripts (too noisy)
- Moments from illusions they haven't covered yet
- Technical metadata (conviction scores as numbers to user)

### Moment Capture in Reinforcement

**Moment Types:** Use existing moment type taxonomy (insight, emotional_breakthrough, rationalization, etc.). No new types for reinforcement — the `session_type` field on `captured_moments` distinguishes where moments came from.

**No Database Linking:** Anchor moments are referenced contextually in the AI conversation (quoted in prompt/response) rather than via a formal `references_moment_id` FK. Keeps schema simple for MVP.

**User Story Updates:** Reinforcement sessions update `user_story` with the same fields as core sessions:
- `{illusionKey}_conviction` — new conviction score
- `{illusionKey}_resistance_notes` — if remaining resistance noted
- `{illusionKey}_key_insight_id` — can be replaced if a better insight emerges
- `primary_triggers` — merged with any new triggers
- `personal_stakes` — merged with any new stakes

---

## Implementation Notes

### Testing Strategy

- **SQL seeds required:** Create sample moments and conviction scores for automated E2E testing
- **Manual testing:** Also conduct manual testing with real conversations
- **No feature flag:** Test locally/staging, then ship to production enabled

### Rollout

- **Dashboard transition:** Auto-switch from in-progress to post-ceremony dashboard immediately when ceremony session ends
- **Cache invalidation:** Invalidate moment card cache when any session completes

### UI Components

- **Custom carousel:** Build on prototype (`progress-carousel-final.jsx`), add touch/swipe support manually
- **Same chat UI:** Reinforcement sessions use identical chat UI to core sessions (no visual distinction)
- **Loading states:** Follow existing patterns — inline spinners, component-level loading states

### Schema

- **No new tables:** Existing schema sufficient (`conversations.session_type`, `captured_moments`, `conviction_assessments`, `user_story`)

### Accessibility

- **Deferred:** No WCAG work for MVP — accessibility refinements in future polish pass

### Analytics

- **Deferred:** No in-app analytics for MVP (Plausible is landing-page only)

---

## Out of Scope / Deferred

### Deferred to Future Release

| Feature | Reason | Planned For |
|---------|--------|-------------|
| **Audio moment replay** | Requires voice recording feature | After voice recording ships |
| **Post-slip specific flow** | Requires dedicated prompt design and slip detection | Future release |
| **Proactive reinforcement prompts** | Email/push notifications for scheduled tune-ups | Future release |
| **Check-in triggered recommendations** | Check-ins are independent of reinforcement | After check-ins ship |
| **Multi-illusion pattern sessions** | Address multiple illusions simultaneously | Future release |
| **Accessibility (WCAG 2.1 AA)** | Focus on functionality first | Polish pass |
| **In-app analytics** | Plausible is landing-page only | Future release |

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
- [x] Should reinforcement assessments update `user_story` or use separate storage? **Update user_story — same fields as core sessions**
- [x] How many previous moments to include in context? **Fixed 3 moments per illusion**
- [x] Do we need conversation threading (linking reinforcement to original core session)? **No DB linking — anchor moment quoted contextually in AI conversation**
- [x] How do we visually distinguish reinforcement sessions in conversation history? **N/A - no session history viewing feature exists**
- [x] What happens if user tries to start reinforcement while a core session is in progress? **Not allowed - user must be post-illusion to see revisit options. No special multi-tab handling for MVP.**
- [x] What happens if user has multiple reinforcement sessions open? **Allowed — no blocking at API or UI level**
- [x] Should check-ins influence reinforcement UI? **No — check-ins are independent**
- [x] Should reinforcement trigger check-in scheduling? **No — only core sessions schedule check-ins**

### Still Open

None — all technical questions resolved.

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
| **Moment Capture** | Capturing original insights | Capturing refinements, new articulations (same types) |
| **Assessment** | Full conviction assessment | Same conviction assessment process |
| **Session Goal** | Create new understanding | Restore/deepen existing understanding |
| **System Prompt** | BASE_SYSTEM_PROMPT | BASE_SYSTEM_PROMPT + REINFORCEMENT_MODE_OVERLAY |

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
| 2.1     | 2026-01-27 | Refined UI/UX design specs |
| 2.2     | 2026-01-27 | Added session header specification, loading states (inline spinner), moment display approach (AI speaks naturally) |
| 2.3     | 2026-01-27 | Changed moment cards from 1-3 to single card. Added "days since last session" to chip row. Resolved open questions: session history N/A, reinforcement during core session behavior. |
| 2.4     | 2026-01-27 | **Technical implementation refinement.** Key decisions: (1) Conviction assessment same as core (not simplified), (2) Moment selection uses weighted random with last_used_at deprioritization, (3) Boost sessions can assess conviction for identified illusions and update user_story, (4) All session types use same [SESSION_COMPLETE] marker, (5) Prompts extend BASE_SYSTEM_PROMPT with mode overlay, (6) No new moment types - use existing taxonomy, (7) Relative time everywhere (not absolute dates), (8) Routes: /reinforcement/[illusion] and /support, (9) Fixed 3 moments in context, (10) Custom carousel with swipe, (11) Accessibility and analytics deferred, (12) No feature flags - test and ship. Resolved all open technical questions. |
| 2.5     | 2026-01-27 | **Added User Stories section.** 21 stories organized by implementation area (API/Backend, Dashboard UI In-Progress, Dashboard UI Post-Ceremony, Session UI, Integration). Each story sized for one Claude Code session with verifiable acceptance criteria. UI stories include browser verification requirement. |
| 2.6     | 2026-01-27 | **Added References to User Stories.** Each story now includes document path and section references for standalone extraction (e.g., `docs/specs/reinforcement-sessions-spec.md: [Section](#anchor)`). |
| 2.7     | 2026-01-27 | **CTA Hierarchy update (ADR-005).** Added Ceremony-Ready dashboard state. Updated Design Philosophy with Single Primary CTA principle. Changed Moment Card CTA from primary to secondary styling. Clarified primary/secondary designations for all dashboard states. |

---

**End of Specification**
