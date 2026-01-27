# Reinforcement Sessions UI Design Specification

**Version:** 1.0
**Created:** 2026-01-26
**Status:** Ready for Review
**Document Type:** UI/UX Design Specification
**Related Documents:**
- `reinforcement-sessions-spec.md` (Feature Specification)
- `design-system-external-tools.md` (Design System)

---

## Table of Contents

1. [Overview](#overview)
2. [Design Philosophy](#design-philosophy)
3. [Component Specifications](#component-specifications)
4. [Layout Patterns](#layout-patterns)
5. [Responsive Behavior](#responsive-behavior)
6. [Interactive States](#interactive-states)
7. [Implementation Notes](#implementation-notes)
8. [Appendix](#appendix)

---

## Overview

This document specifies the UI design for three new components that enable the Reinforcement Sessions feature:

1. **Moment Cards** - Display user's breakthrough moments on the dashboard
2. **Revisit Buttons** - Allow users to revisit completed illusions
3. **Support Section** - Provide access to generic reinforcement sessions

All designs follow the established Unhooked design system with careful attention to the therapeutic framing and user experience goals outlined in the feature specification.

---

## Design Philosophy

### Therapeutic Framing Through Design

**Reconnection, not Remediation**
- Visual language emphasizes "remembering" and "reconnecting" rather than "retrying"
- Warm, empathetic color usage (orange accents) vs. clinical or warning colors
- Quotes presented as "moments" with reverence, not as flashcards

**Proactive Maintenance**
- Support section is inviting, not alarming
- Revisit buttons positioned as positive opportunities, not required actions
- Language focuses on "boost" and "reconnect" rather than "help" or "fix"

**User Agency**
- All actions are user-initiated, never prescriptive
- Multiple entry points (moment cards, revisit buttons, generic support)
- Clear but non-urgent CTAs

---

## Component Specifications

### 1. Moment Cards

**Purpose:** Display 1-3 breakthrough moments from the user's core sessions, surfacing quotes from illusions where conviction is weakest.

#### Visual Design

**Container:**
```css
background: rgba(13, 92, 99, 0.35);
backdrop-filter: blur(12px);
border-radius: 24px; /* 8px on mobile */
border: 1px solid rgba(255, 255, 255, 0.1);
box-shadow: 0 24px 64px rgba(0, 0, 0, 0.25);
padding: 24px;
```

**Structure:**
1. **Eyebrow Label** (Top)
   - Format: `{Illusion Name} • {Relative Date}`
   - Example: "STRESS RELIEF • DAY 2"
   - Style:
     - Font: 12px (0.75rem), 500 weight
     - Color: `#fc4a1a` (brand accent)
     - Letter spacing: `0.35em`
     - Text transform: uppercase
     - Opacity: 0.85
     - Margin bottom: 12px

2. **Quote Block** (Main content)
   - Wrapped in semantic `<blockquote>` tag
   - Opening and closing quotation marks
   - Style:
     - Font: 17px (1.0625rem), 400 weight
     - Color: `#ffffff`
     - Line height: 1.6
     - Margin bottom: 16px

3. **Timestamp** (Metadata)
   - Full date (e.g., "January 14, 2026")
   - Style:
     - Font: 14px (0.875rem), 400 weight
     - Color: `rgba(255, 255, 255, 0.5)`
     - Margin bottom: 16px

4. **CTA Button** (Bottom)
   - Label: "Reconnect with this →"
   - Full width within card
   - Primary button style (orange gradient)
   - Style:
     ```css
     background: linear-gradient(135deg, #fc4a1a, #f7b733);
     border-radius: 9999px;
     padding: 12px 24px;
     font-weight: 600;
     color: white;
     box-shadow: 0 4px 24px rgba(252, 74, 26, 0.3);
     ```

#### Interaction States

**Default:**
- Subtle scale animation on page load (fadeInUp)
- Soft glow from card shadow

**Hover:**
- Card: `transform: scale(1.01)`
- Button: `transform: translateY(-2px)`
- Button shadow: `0 6px 32px rgba(252, 74, 26, 0.4)`
- Cursor: pointer on entire card

**Active/Click:**
- Initiates reinforcement session anchored to that moment
- Navigates to chat interface with moment pre-loaded in context

#### Content Rules

**Quote Length:**
- Minimum: 40 characters
- Maximum: 240 characters (approximately 2-3 sentences)
- Truncate with "..." if exceeds maximum

**Date Format:**
- Relative date in eyebrow (Day 1-14)
- Absolute date in timestamp
- Use program day numbers, not calendar dates, in eyebrow

**Selection Logic:**
- Show 1 card from the illusion with lowest conviction score
- Within that illusion, show the most powerful moment (highest confidence score)
- Rotate selection on subsequent visits if multiple high-confidence moments exist

#### Visibility Rules

**Show When:**
- At least one moment has been captured from any completed illusion
- User is not currently in a session
- Available both during in-progress and post-ceremony states

**Hide When:**
- User hasn't completed any illusions yet
- No moments have been captured from any illusion
- Currently in any session type

**Special Cases:**
- If lowest-conviction illusion has zero moments captured, show special "no moments" card prompting revisit

---

### 2. Revisit Buttons

**Purpose:** Provide explicit access to illusion-specific reinforcement for any completed illusion.

#### Visual Design

**Context:** Appears inline with illusion progress items in the progress view/card.

**Button Style:**
```css
background: rgba(31, 108, 117, 0.5);
border: 1px solid rgba(255, 255, 255, 0.2);
border-radius: 9999px;
padding: 8px 16px;
font-weight: 500;
color: white;
display: flex;
align-items: center;
gap: 8px;
```

**Icon:**
- Use `RefreshCw` from lucide-react or equivalent
- Size: 16px (w-4 h-4)
- Color: white
- Position: Left of label

**Label:**
- Text: "Revisit"
- Font: 14px (0.875rem), 500 weight
- Color: white

#### Placement Variations

**Option A: Progress List (Preferred)**
- Appears to the right of completed illusion row
- Aligned with illusion name and metadata
- Shows "Last session: X days ago" context in illusion row

**Option B: Expanded Illusion Detail**
- Appears when user taps/clicks on completed illusion
- Shown alongside other illusion details (conviction score, moments count)

**Layout Example:**
```
┌─────────────────────────────────────────────────┐
│  ✓  Stress Relief                    [Revisit] │
│     Last session: 12 days ago                   │
└─────────────────────────────────────────────────┘
```

#### Interaction States

**Default:**
- Semi-transparent glass background
- Subtle border

**Hover:**
- `transform: scale(1.05)`
- Slightly brighter background: `rgba(31, 108, 117, 0.6)`
- Transition: 0.2s ease

**Active/Click:**
- Initiates illusion-specific reinforcement session
- Navigates to chat with full illusion context loaded

#### Visibility Rules

**Show When:**
- Illusion status is "completed"
- User has moved past this illusion in their journey
- At least 1 day since last session (core or reinforcement)

**Hide When:**
- Illusion not yet started
- Illusion is current/in-progress
- User is currently in a session

---

### 4. Your Journey Section (Post-Ceremony)

**Purpose:** Show all 5 completed illusions with easy access to revisit any of them. Compact chip row for space efficiency.

#### Visual Design

**Container:**
```css
background: rgba(13, 92, 99, 0.35);
backdrop-filter: blur(12px);
border-radius: 24px; /* 8px on mobile */
border: 1px solid rgba(255, 255, 255, 0.1);
box-shadow: 0 24px 64px rgba(0, 0, 0, 0.25);
padding: 32px;
```

**Structure:**
1. **Section Header**
   - Text: "Your Journey"
   - Font: 24px (1.5rem), 600 weight
   - Color: white
   - Margin bottom: 8px

2. **Description**
   - Text: "All 5 illusions dismantled"
   - Font: 16px (1rem), 400 weight
   - Color: `rgba(255, 255, 255, 0.65)`
   - Margin bottom: 24px

3. **Chip Row**
   - All 5 illusions as horizontal chips that wrap
   - Height: ~60-80px total (vs 300px+ for vertical list)
   - Wraps to multiple rows on narrow screens

**Individual Chip:**
```css
background: rgba(31, 108, 117, 0.5);
border: 1px solid rgba(255, 255, 255, 0.2);
border-radius: 9999px;
padding: 12px 16px;
display: inline-flex;
align-items: center;
gap: 8px;
```

**Chip Contents:**
- Small checkmark circle (24px, orange gradient background)
- Illusion name (font-medium, white)
- Small RefreshCw icon (16px, opacity 0.7)
- "X days ago" subtext below name or inline

**Days Format:**
- "Today", "Yesterday", "X days ago" (1-30), "Over a month ago" (31+)

**Layout:**
```
┌─────────────────────────────────────────────────┐
│  Your Journey                                    │
│  All 5 illusions dismantled                      │
│                                                  │
│  [✓ Stress 🔄    ] [✓ Pleasure 🔄  ] [✓ Will 🔄]│
│     12 days ago      10 days ago      8 days    │
│  [✓ Focus 🔄    ] [✓ Identity 🔄  ]             │
│     6 days ago       4 days ago                  │
└─────────────────────────────────────────────────┘
```

#### Interaction States

**Chip Hover:**
- `transform: scale(1.05)`
- Slightly brighter background
- Entire chip is clickable (starts reinforcement session)

**Chip Click:**
- Initiates illusion-specific reinforcement session
- Same behavior as Revisit button

#### Visibility Rules

**Show When:**
- User has completed ceremony
- All 5 illusions completed

**Hide When:**
- Pre-ceremony
- Currently in ceremony

#### Content Rules

**Days Since Last Session:**
- Calculate from most recent session (core or reinforcement)
- Format: "X days ago" (1-30), "Over a month ago" (31+)
- Always show, even if same day ("Today")

---

### 3. Support Section

**Purpose:** Provide access to generic reinforcement when user needs support but isn't sure which illusion to focus on. Only available post-ceremony.

#### Design Variant A: Single Prominent Button (Dashboard)

**Container:**
```css
background: rgba(13, 92, 99, 0.35);
backdrop-filter: blur(12px);
border-radius: 24px; /* 8px on mobile */
border: 1px solid rgba(255, 255, 255, 0.1);
box-shadow: 0 24px 64px rgba(0, 0, 0, 0.25);
padding: 32px;
text-align: center;
```

**Structure:**
1. **Heading**
   - Text: "Need Support?"
   - Font: 24px (1.5rem), 600 weight
   - Color: white
   - Margin bottom: 8px

2. **Description**
   - Text: "Reconnect with what you've already discovered"
   - Font: 16px (1rem), 400 weight
   - Color: `rgba(255, 255, 255, 0.65)`
   - Margin bottom: 24px

3. **Primary CTA**
   - Label: "Get Support Now"
   - Icon: `Sparkles` (left of text)
   - Full width
   - Primary button style (orange gradient)
   - Padding: 16px 24px (larger than standard)

#### Design Variant B: Dual Options (In-Progress)

**Container:**
- Same as Variant A

**Structure:**
1. **Heading**
   - Text: "Need help right now?"
   - Font: 18px (1.125rem), 600 weight
   - Color: white
   - Margin bottom: 16px
   - Text align: center

2. **Button Group**
   - Layout: Horizontal on desktop, vertical on mobile
   - Gap: 12px
   - Two secondary buttons side-by-side

**Button Styles:**
```css
/* Each button */
flex: 1;
background: rgba(31, 108, 117, 0.5);
border: 1px solid rgba(255, 255, 255, 0.1);
border-radius: 9999px;
padding: 12px 16px;
font-weight: 500;
color: white;
```

**Button Labels:**
- Left: "I'm struggling"
- Right: "Give me a boost"

#### Interaction States

**Variant A Button:**
- Hover: Same as primary button states
- Click: Opens generic boost conversation

**Variant B Buttons:**
- Hover: Slightly brighter background
- Click: Both open same generic boost conversation (different entry point tracking)

#### Visibility Rules

**Post-Ceremony (Single Prominent Button):**
- Show when: User has completed ceremony
- Hide when: Currently in any session type

**In-Progress (Dual Options - DEFERRED):**
- Deferred to post-MVP
- Rationale: Focus on post-ceremony reinforcement first, add in-progress support later based on user feedback
- When implemented: Show after completing first 2-3 illusions

#### Content Variations

**For "I'm struggling" framing:**
- More empathetic, supportive tone
- Implies user is experiencing difficulty
- AI system prompt emphasizes empathy first

**For "Give me a boost" framing:**
- More proactive, maintenance tone
- Implies preventive reinforcement
- AI system prompt emphasizes reconnection

---

## Layout Patterns

### Dashboard Integration

#### Post-Ceremony Dashboard Order
1. Header (Unhooked status, completion date)
2. **Support Section** (Generic boost button) ← Primary support mechanism
3. **Moment Cards Section** (1 card from weakest conviction illusion)
4. **Your Journey Section** (Compact chip row with all 5 illusions)
5. Ceremony Artifacts (Journey audio, Message audio, Toolkit)

#### In-Progress Dashboard Order
1. Progress indicator with **Revisit buttons on completed illusions**
2. **Moment Cards Section** (1 card from weakest conviction illusion) ← Available once first moment captured
3. Current illusion CTA
4. Optional: Support Section (Dual options variant) ← DEFERRED (post-MVP)

### Spacing

**Between major sections:**
- 32px (space-y-8) on mobile
- 48px on desktop

**Within moment cards section:**
- 16px gap between heading and cards
- 16px gap between individual moment cards

**Within support section:**
- 24px between heading and description
- 24px between description and button(s)

---

## Responsive Behavior

### Breakpoints

**Mobile (< 768px):**
- Border radius: 8px (rounded-lg)
- Padding: 20-24px
- Full width layouts
- Vertical stacking for all elements

**Desktop (≥ 768px):**
- Border radius: 24px (rounded-3xl)
- Padding: 24-48px
- Grid layouts where appropriate
- Horizontal arrangements for button groups

### Moment Cards

**Mobile:**
- Single column
- Full width of screen minus page padding
- Stack vertically with 16px gap

**Desktop:**
- Single column (same as mobile)
- Max width constrained by page container (max-w-4xl)
- Larger padding (24px → 32px)

### Support Section

**Mobile (Dual Options):**
- Buttons stack vertically
- Full width each
- 12px gap between

**Desktop (Dual Options):**
- Buttons horizontal (flex-row)
- Equal width (flex: 1)
- 12px gap between

---

## Interactive States

### Global Animation Standards

**Page Load:**
- All cards: `animation: fadeInUp 0.5s ease-out forwards`
- Stagger delay: 0.1s between elements

**Hover Transitions:**
- Duration: 0.3s
- Easing: ease
- Properties: transform, box-shadow, background

**Click/Active:**
- Brief scale down: `transform: scale(0.98)`
- Duration: 0.1s
- Returns to default on release

### Button States

**Primary Buttons:**
- Default: Orange gradient + shadow
- Hover: Lift (-2px Y) + stronger shadow
- Active: Scale down (0.98)
- Focus: Add subtle white outline ring

**Secondary/Ghost Buttons:**
- Default: Glass background + border
- Hover: Brighter background + scale up (1.05)
- Active: Scale down (0.98)
- Focus: Brighter border

### Card States

**Moment Cards:**
- Default: Standard shadow
- Hover: Scale (1.01) + cursor pointer on entire card
- Active/Click: Navigate to session
- Focus: Subtle outline ring (keyboard navigation)

**Static Cards:**
- No hover state
- Buttons within cards have own hover states

---

## Implementation Notes

### Component Hierarchy

```
Dashboard (Post-Ceremony)
├── Header
├── MomentCardsSection
│   ├── SectionHeader
│   └── MomentCardList
│       └── MomentCard × 1-3
│           ├── Eyebrow
│           ├── Quote
│           ├── Timestamp
│           └── CTAButton
├── CeremonyArtifacts
└── SupportSection
    ├── Heading
    ├── Description
    └── PrimaryButton
```

### Data Requirements

**Moment Cards:**
```typescript
interface MomentCard {
  moment_id: string;
  quote: string;
  illusion_key: string;
  illusion_name: string;
  relative_date: string; // "Day 2"
  absolute_date: string; // "January 14, 2026"
  conviction_score?: number; // For sorting/selection
}
```

**Revisit Button:**
```typescript
interface IllusionWithRevisit {
  illusion_key: string;
  name: string;
  status: 'completed';
  last_session_date: Date;
  days_since_last: number;
  moment_count: number;
}
```

**Support Section:**
```typescript
interface SupportSection {
  show: boolean; // Based on ceremony completion
  variant: 'single' | 'dual';
  tracking: {
    entry_point: 'dashboard' | 'progress';
    button_type: 'primary' | 'struggling' | 'boost';
  };
}
```

### API Integration Points

**Moment Cards - Load Data:**
- Endpoint: `GET /api/dashboard/moments`
- Returns: Array of moments (pre-selected by backend)
- Caching: 1 hour (moments don't change frequently)

**Moment Card - Click Action:**
- Endpoint: `POST /api/reinforcement/start`
- Payload: `{ moment_id, illusion_key }`
- Returns: `conversation_id` + session context

**Revisit Button - Click Action:**
- Endpoint: `POST /api/reinforcement/start`
- Payload: `{ illusion_key }`
- Returns: `conversation_id` + full illusion context

**Support Button - Click Action:**
- Endpoint: `POST /api/reinforcement/start`
- Payload: `{ reason: 'generic_boost' }`
- Returns: `conversation_id` + boost session context

### Accessibility Requirements

**Keyboard Navigation:**
- All interactive elements focusable via Tab
- Clear focus indicators (visible ring)
- Logical tab order (top to bottom)

**Screen Readers:**
- Moment cards: Use semantic `<blockquote>` with aria-label
- Buttons: Clear, descriptive labels
- Section headings: Proper hierarchy (h1, h2, h3)

**Reduced Motion:**
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

### Performance Considerations

**Lazy Loading:**
- Moment cards can be lazy loaded if below fold
- Prioritize above-fold content (header, first card)

**Image Optimization:**
- Icons: Use SVG (lucide-react)
- No raster images needed for these components

**Bundle Size:**
- Moment cards: ~2KB JavaScript
- All components combined: ~5KB JavaScript

---

## Appendix

### A. Alternative Design Directions Considered

#### Moment Cards

**Alternative A: Compact List View**
- Rejected: Doesn't give quotes proper reverence
- Use case: If user has 10+ moments, could be fallback view

**Alternative B: Swipeable Carousel**
- Rejected: Reduces discoverability
- Use case: Mobile-only implementation if space constrained

**Alternative C: Modal/Overlay on Click**
- Rejected: Adds unnecessary friction
- Use case: If quotes are very long (> 300 chars)

#### Support Section

**Alternative A: Floating Action Button (FAB)**
- Rejected: Too generic, doesn't fit Unhooked aesthetic
- Use case: Could work for emergency support in future

**Alternative B: Inline with Moment Cards**
- Rejected: Mixes different mental models
- Use case: If support is purely moment-based

#### Revisit Buttons

**Alternative A: Dropdown Menu on Illusion**
- Rejected: Hides functionality
- Use case: If we add more actions per illusion

**Alternative B: Dedicated "Revisit" Section**
- Rejected: Separates from progress context
- Use case: If revisit becomes primary navigation

---

### B. Design System Tokens Used

**Colors:**
- `brand-bg-light`: #104e54
- `brand-bg-dark`: #041f21
- `brand-accent`: #fc4a1a
- `brand-accent-light`: #f7b733
- `brand-glass`: rgba(13, 92, 99, 0.35)
- `brand-glass-input`: rgba(31, 108, 117, 0.5)
- `brand-border`: rgba(255, 255, 255, 0.1)
- `brand-border-strong`: rgba(255, 255, 255, 0.4)
- `white`: #ffffff
- `white-85`: rgba(255, 255, 255, 0.85)
- `white-65`: rgba(255, 255, 255, 0.65)

**Typography:**
- Font family: Inter
- Weights: 400, 500, 600, 700
- Scale: 0.75rem - 2.5rem

**Spacing:**
- Base unit: 4px
- Common values: 8px, 12px, 16px, 24px, 32px, 48px

**Shadows:**
- Card: `0 24px 64px rgba(0, 0, 0, 0.25)`
- Button: `0 4px 24px rgba(252, 74, 26, 0.3)`

**Border Radius:**
- Mobile: 8px (rounded-lg)
- Desktop: 24px (rounded-3xl)
- Pills: 9999px (rounded-full)

---

### C. Design Decision Rationale

#### Why Orange Accent on Moment Cards?
- Creates visual hierarchy (most important element)
- Warm color = emotional connection
- Matches primary CTA color = consistent action pattern

#### Why Full-Width Buttons in Cards?
- Mobile-first approach (easier tapping)
- Creates clear, unambiguous action
- Matches existing dashboard patterns

#### Why "Reconnect" Language?
- Aligns with therapeutic framing (not "review" or "retry")
- Implies restoration, not repetition
- Tested in user research as more motivating

#### Why Single Column for Moment Cards?
- Quotes need room to breathe
- Reduces comparison/competition between moments
- Better reading experience

#### Why Inline Revisit Buttons vs. Separate Section?
- Contextual placement (right where user sees progress)
- Reduces navigation steps
- Makes revisit feel like natural next action

---

### D. Testing Checklist

**Visual Regression:**
- [ ] Moment cards render correctly on mobile
- [ ] Moment cards render correctly on desktop
- [ ] Revisit buttons align properly with illusion rows
- [ ] Support section centers correctly
- [ ] All hover states work as expected
- [ ] Focus states visible for keyboard navigation

**Functional:**
- [ ] Clicking moment card starts correct reinforcement session
- [ ] Clicking revisit button loads correct illusion context
- [ ] Support button initiates generic boost session
- [ ] Long quotes truncate properly
- [ ] Empty states handled gracefully
- [ ] Loading states show appropriately

**Responsive:**
- [ ] Cards stack correctly on mobile
- [ ] Border radius changes at breakpoint
- [ ] Button groups switch to vertical on mobile
- [ ] Text remains readable at all sizes
- [ ] Touch targets meet minimum size (44x44px)

**Accessibility:**
- [ ] All interactive elements keyboard accessible
- [ ] Screen reader announces content correctly
- [ ] Focus indicators visible
- [ ] Reduced motion respected
- [ ] Color contrast meets WCAG AA standards

**Performance:**
- [ ] Page load time < 2s
- [ ] Animations smooth (60fps)
- [ ] No layout shift on load
- [ ] Images/icons optimized

---

## Changelog

| Version | Date       | Changes |
|---------|------------|---------|
| 1.0     | 2026-01-26 | Initial design specification covering all three components |
| 1.1     | 2026-01-26 | Clarified Option C implementation: Revisit buttons in both in-progress (within progress indicator) and post-ceremony (in dedicated "Your Journey" section). Deferred in-progress support section to post-MVP. |
| 1.2     | 2026-01-26 | Corrected moment cards availability: Present in both in-progress and post-ceremony states (not post-ceremony only). Added visibility rules section for moment cards. |
| 1.3     | 2026-01-27 | Updated post-ceremony section order (Support → Moments → Your Journey). Changed moment cards from 1-3 to 1 card. Aligned Your Journey to chip row layout with "days since last session" display. |

---

**End of Specification**
