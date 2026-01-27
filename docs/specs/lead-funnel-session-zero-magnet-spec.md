# Unhooked: Lead Funnel — Session Zero Magnet PRD

**Version:** 1.6
**Last Updated:** 2026-01-22  
**Status:** Ready for Implementation  
**Document Type:** Product Requirements Document  

---

## Overview

This document specifies a lead nurture system designed to convert undecided landing page visitors into engaged prospects. The core mechanism is a 5-minute audio experience ("Session Zero") that delivers a transformational reframe before asking for any commitment.

**Goal:** Capture emails from visitors who aren't ready to pay $199 by offering a compelling, low-friction taste of the Unhooked methodology.

**Strategic Rationale (Ramit Sethi Framework):**
- Give a "quick win" that lets them prove something to themselves
- Sample the transformation, not just information
- Filter for the right people (voice-first, transformation-oriented)
- Make the free thing feel premium
- Build trust through specificity

---

## What We're Building

1. **Session Zero Audio** — A 5-minute listen-only audio that dismantles one illusion
2. **Landing Page Copy Changes** — New section for email capture with audio offer
3. **Listening Page** — Private, unlisted page at `/listen` with audio player
4. **Welcome Email** — Single email delivering the audio link

---

## Related Documents

- **Mailing List Specification v1.1** — Existing email capture infrastructure (reused)
- **Landing Page Specification v3.4** — Current landing page structure (modified)
- **Five Illusions Framework v2.0** — Source content for audio script
- **Voice Interface Specification** — Voice/audio technical patterns

---

## User Stories

Stories are organized by implementation chunk. Each story is small enough to implement in one focused session.

### Chunk 1: Listen Page Foundation

#### US-001: View Listen Page
**Description:** As an email recipient, I want to access a dedicated listen page so that I can hear the Session Zero audio in a focused, distraction-free environment.

**Acceptance Criteria:**
- [ ] Page exists at `/listen` route
- [ ] Page displays headline "Before you decide anything, hear this."
- [ ] Page displays subhead "5 minutes. Headphones help."
- [ ] Page has `noindex, nofollow` meta tag to prevent search indexing
- [ ] Page uses brand styling (deep teal gradient background, Inter font)
- [ ] "Unhooked" text in header links to homepage
- [ ] Typecheck/lint passes
- [ ] **[UI]** Verify in browser: page renders correctly on desktop and mobile

#### US-002: Play Audio on Listen Page
**Description:** As an email recipient, I want to play the Session Zero audio directly on the page so that I can listen without downloading or leaving the site.

**Acceptance Criteria:**
- [ ] Audio player is visible and centered on page
- [ ] Audio player loads `/audio/session-zero.mp3`
- [ ] Play/pause controls work correctly
- [ ] Progress bar shows playback position
- [ ] Audio player has minimal brand accent color styling
- [ ] Typecheck/lint passes
- [ ] **[UI]** Verify in browser: audio plays on desktop Chrome, Safari, Firefox
- [ ] **[UI]** Verify in browser: audio plays on mobile Safari (iOS) and Chrome (Android)

#### US-003: Debug Mode for Development
**Description:** As a developer, I want a debug mode that shows all page stages immediately so that I can test the full page without waiting for timers.

**Acceptance Criteria:**
- [ ] Adding `?debug=true` to URL shows all stages (audio, bridge, CTAs) immediately
- [ ] Debug mode only affects local display, not analytics
- [ ] Without debug param, normal staged reveal behavior applies
- [ ] Typecheck/lint passes
- [ ] **[UI]** Verify in browser: `?debug=true` reveals all content immediately

---

### Chunk 2: Listen Page Interactivity

#### US-004: Reveal Bridge Content After Audio
**Description:** As an email recipient who finishes the audio, I want to see follow-up content that explains what I just heard and what comes next, so that I understand the value of the full program.

**Acceptance Criteria:**
- [ ] Bridge section hidden on initial page load
- [ ] Bridge section appears after audio `ended` event fires
- [ ] Bridge section uses fade-in animation (300-400ms)
- [ ] Bridge headline: "That belief—that quitting requires willpower—is just one of five."
- [ ] Bridge copy mentions "four more illusions" without listing specifics
- [ ] Page auto-scrolls to bring bridge section into view
- [ ] Typecheck/lint passes
- [ ] **[UI]** Verify in browser: content fades in smoothly after audio ends

#### US-005: Reveal Content After 30-Second Fallback
**Description:** As an email recipient who starts but doesn't finish the audio, I want to eventually see the CTAs so that I can still take action even if I didn't listen to the end.

**Acceptance Criteria:**
- [ ] 30-second timer starts when audio play begins
- [ ] Timer is wall-clock time (doesn't pause when audio pauses)
- [ ] Bridge + CTA sections appear after 30 seconds if audio hasn't ended
- [ ] Once revealed, sections stay visible (don't hide on audio replay)
- [ ] Sections remain hidden if user never presses play
- [ ] Typecheck/lint passes
- [ ] Unit test covers timer logic

#### US-006: Primary CTA to Checkout
**Description:** As an email recipient ready to purchase, I want a clear button to become a founding member so that I can buy without navigating back to the landing page.

**Acceptance Criteria:**
- [ ] Primary CTA button displays "Become a founding member — $199 →"
- [ ] Button uses existing CheckoutButton component
- [ ] Clicking initiates Stripe checkout flow directly
- [ ] Button shows loading state during checkout creation
- [ ] Error state displays if checkout fails
- [ ] Subtext shows "30-day guarantee · Start when the program launches"
- [ ] Typecheck/lint passes
- [ ] **[UI]** Verify in browser: button initiates checkout flow

#### US-007: Secondary CTA to Landing Page
**Description:** As an email recipient who wants more information, I want a link to read the full landing page so that I can learn more before deciding.

**Acceptance Criteria:**
- [ ] Secondary CTA displays "Want to learn more first?" headline
- [ ] Link text is "Read the full story →"
- [ ] Link navigates to `/?ref=listen` (includes attribution param)
- [ ] Link styled as text link, not button (visually quieter than primary)
- [ ] Typecheck/lint passes
- [ ] **[UI]** Verify in browser: link navigates to landing page with ref param

#### US-008: Track Email Source
**Description:** As a product owner, I want to know which email drove each listen page visit so that I can measure email effectiveness.

**Acceptance Criteria:**
- [ ] Page reads `src` query parameter on load
- [ ] Valid values: `welcome`, `followup`, or defaults to `direct` if missing
- [ ] Source value stored in component state for use in analytics
- [ ] Typecheck/lint passes
- [ ] Unit test covers source parameter parsing

---

### Chunk 3: Landing Page Copy Changes

#### US-009: Updated Path B Copy
**Description:** As an undecided landing page visitor, I want to see compelling copy about a free audio experience so that I'm motivated to provide my email.

**Acceptance Criteria:**
- [ ] Headline changed from "Not ready yet?" to "Still thinking about it?"
- [ ] Body copy updated to universal audio magnet copy (no career assumptions)
- [ ] Copy only shows when `checkoutEnabled` is true (validation/enabled modes)
- [ ] Waitlist copy unchanged for `disabled` mode
- [ ] Typecheck/lint passes
- [ ] **[UI]** Verify in browser: new copy displays correctly in validation mode

#### US-010: Email Form Submits Successfully
**Description:** As an undecided visitor, I want to submit my email and see confirmation so that I know the audio link is on its way.

**Acceptance Criteria:**
- [ ] Email input and "Send it to me" button work as before
- [ ] Success state shows "Check your inbox" message
- [ ] Error states display appropriately
- [ ] Form submission tracks `EMAIL_SUBMITTED` event with source `nurture`
- [ ] Typecheck/lint passes
- [ ] **[UI]** Verify in browser: form submits and shows success state

---

### Chunk 4: Welcome Email Changes

#### US-011: Audio Email for Validation/Enabled Modes
**Description:** As a new email subscriber (when checkout is available), I want to receive an email with the audio link so that I can listen to Session Zero.

**Acceptance Criteria:**
- [ ] Email sent when `appMode` is `validation` or `enabled`
- [ ] Email is plain text format (not HTML)
- [ ] Subject line: "Here's the audio I promised"
- [ ] Body includes link to `https://getunhooked.app/listen?src=welcome`
- [ ] Body matches spec copy (brief, personal, includes "save this email" permission)
- [ ] From address: "Kevin from Unhooked <kevin@getunhooked.app>"
- [ ] Typecheck/lint passes
- [ ] Unit test covers email content selection based on app mode

#### US-012: Waitlist Email for Disabled Mode
**Description:** As a new email subscriber (when checkout is disabled), I want to receive the existing waitlist email so that the experience is unchanged.

**Acceptance Criteria:**
- [ ] Email sent when `appMode` is `disabled`
- [ ] Email content unchanged from current implementation (HTML waitlist email)
- [ ] Subject line unchanged: "You're on the list"
- [ ] Typecheck/lint passes
- [ ] Unit test covers email content selection based on app mode

---

### Chunk 5: Analytics Integration

#### US-013: Track Audio Playback Events
**Description:** As a product owner, I want to track when users start and complete the audio so that I can measure engagement.

**Acceptance Criteria:**
- [ ] `AUDIO_STARTED` event fires when play button pressed
- [ ] `AUDIO_COMPLETED` event fires when audio reaches end
- [ ] Both events include `email_source` property (welcome/followup/direct)
- [ ] Events sent to Plausible
- [ ] Typecheck/lint passes
- [ ] Unit test covers event firing logic

#### US-014: Track CTA Clicks
**Description:** As a product owner, I want to track which CTAs users click after listening so that I can measure conversion paths.

**Acceptance Criteria:**
- [ ] `CTA_CLICK_LISTEN` event fires when primary CTA (checkout) clicked
- [ ] `SECONDARY_CTA_CLICK` event fires when secondary CTA (landing page) clicked
- [ ] Both events include `email_source` property
- [ ] CheckoutButton component updated to support `listen` tracking location
- [ ] Typecheck/lint passes
- [ ] Unit test covers event definitions

#### US-015: Track Listen Page Views
**Description:** As a product owner, I want to track listen page visits with their source so that I can measure email click-through rates.

**Acceptance Criteria:**
- [ ] Page view tracked on component mount
- [ ] Page view includes `email_source` property
- [ ] Typecheck/lint passes

---

## Functional Requirements

### Listen Page

- **FR-1:** The system must serve a page at `/listen` that displays an audio player for Session Zero.
- **FR-2:** The system must prevent the `/listen` page from being indexed by search engines via `noindex` meta tag.
- **FR-3:** The system must display bridge content and CTAs only after the audio ends OR 30 seconds after playback begins, whichever comes first.
- **FR-4:** The system must keep bridge/CTA content hidden indefinitely if the user never presses play.
- **FR-5:** The system must auto-scroll to bring newly-revealed content into view after the fade-in transition.
- **FR-6:** The system must read the `src` query parameter and default to `direct` if not present.
- **FR-7:** The system must show all stages immediately when `?debug=true` is present (development only).

### Landing Page

- **FR-8:** The system must display updated Path B copy ("Still thinking about it?") when `appMode` is `validation` or `enabled`.
- **FR-9:** The system must display original waitlist copy when `appMode` is `disabled`.
- **FR-10:** The system must maintain existing email form submission behavior and success/error states.

### Email

- **FR-11:** The system must send a plain text email with the audio link when a user subscribes in `validation` or `enabled` mode.
- **FR-12:** The system must send the existing HTML waitlist email when a user subscribes in `disabled` mode.
- **FR-13:** The system must include `?src=welcome` parameter in the audio link within the welcome email.
- **FR-14:** The system must continue saving the subscription to the database even if email sending fails.

### Analytics

- **FR-15:** The system must track `AUDIO_STARTED` when the user begins audio playback.
- **FR-16:** The system must track `AUDIO_COMPLETED` when the audio reaches its end.
- **FR-17:** The system must track `CTA_CLICK_LISTEN` when the primary CTA is clicked.
- **FR-18:** The system must track `SECONDARY_CTA_CLICK` when the secondary CTA is clicked.
- **FR-19:** The system must include `email_source` (welcome/followup/direct) as a property on all listen page events.

### Checkout Integration

- **FR-20:** The primary CTA on the listen page must initiate Stripe checkout directly (not navigate to landing page pricing section).
- **FR-21:** The system must reuse the existing CheckoutButton component for consistent checkout behavior.

---

## Non-Goals (Out of Scope for v1)

The following are explicitly **not** included in this implementation:

1. **Follow-up email (48hr conditional)** — Deferred to Phase 2. Requires webhook infrastructure and scheduled jobs.
2. **Resend webhook endpoint for click tracking** — Deferred to Phase 2. Needed for conditional follow-up logic.
3. **Database schema changes** — The `audio_link_clicked_at` and `followup_sent_at` columns are not added in v1.
4. **Scheduled job infrastructure** — No cron jobs or background workers for automated follow-up.
5. **A/B testing infrastructure** — Alternative copy options (B, C, D) documented but not implemented with testing framework.
6. **Audio download capability** — Users cannot download the MP3; listen-only experience.
7. **Social sharing** — No share buttons or social meta tags on listen page.
8. **Audio transcripts or captions** — Accessibility enhancement deferred.
9. **Multiple audio versions** — Single Session Zero audio; no variants for different illusions.
10. **Time-of-day email optimization** — Timezone detection and scheduled sending deferred.

---

## Design Considerations

### Existing Components to Reuse

| Component | Location | Usage |
|-----------|----------|-------|
| CheckoutButton | `components/landing/CheckoutButton.vue` | Primary CTA on listen page |
| Glass styling | `assets/css/main.css` | Card backgrounds if needed |
| Brand tokens | `tailwind.config.js` | Colors, spacing, typography |

### Brand System References

From CLAUDE.md:
- **Background:** Deep teal gradient (`radial-gradient(circle at top, #104e54 0%, #041f21 100%)`)
- **Buttons:** Pill-shaped (`rounded-pill`), orange gradient for primary
- **Typography:** Inter font family, white text with opacity variants
- **Animations:** `animate-fade-in-up` for entrance animations

### Page Layout

- **Listen page:** Single-column, centered content, max-width ~640px
- **No navigation header:** Minimal "Unhooked" text link only
- **No footer navigation:** Simple "© 2026 Unhooked" footer
- **Mobile-first:** Content readable and audio player functional on all screen sizes

### Audio Player Styling

- Use native HTML5 `<audio>` element with `controls` attribute
- Apply minimal CSS to adjust accent colors to brand orange
- Accept browser-default styling differences on mobile
- Do not build custom player controls in v1

---

## Success Metrics

Extracted from Analytics section. These metrics define success for the lead funnel.

### Primary Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Lead magnet signup rate | 5-10% | Audio signups ÷ Non-purchasing visitors |
| Email open rate | >40% | Opens ÷ Delivered (via Resend) |
| Email click-through rate | >20% | Clicks ÷ Delivered (via Resend) |
| Listen page play rate | >70% | Audio Started ÷ Page Views |
| Audio completion rate | >60% | Audio Completed ÷ Audio Started |

### Conversion Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Post-audio primary CTA rate | Track baseline | Primary CTA Clicks ÷ Audio Completed |
| Post-audio secondary CTA rate | Track baseline | Secondary CTA Clicks ÷ Audio Completed |
| Audio funnel conversion | Track baseline | Purchases (audio path) ÷ Audio signups |
| Audio vs. direct comparison | Track baseline | Compare audio funnel conversion to direct landing page conversion |

### Tracking Infrastructure

- **Plausible:** Page views, custom events (audio started/completed, CTA clicks)
- **Resend:** Email delivered, opened, clicked (via dashboard, webhooks in Phase 2)
- **Stripe:** Purchase events with metadata for funnel attribution

---

## User Journey

This section maps the complete journey from landing page visit through audio consumption to potential purchase.

### Journey Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           LANDING PAGE                                   │
│                                                                          │
│  Visitor reads landing page → Reaches Section 9 (Final CTA)             │
│                                                                          │
│         ┌──────────────────┐         ┌──────────────────┐               │
│         │   PATH A: READY  │         │  PATH B: NOT YET │               │
│         │                  │         │                  │               │
│         │  Purchase $199   │         │  Email capture   │               │
│         │        ↓         │         │  (audio offer)   │               │
│         │   [Checkout]     │         │        ↓         │               │
│         └──────────────────┘         └──────────────────┘               │
│                                              │                           │
└──────────────────────────────────────────────│───────────────────────────┘
                                               │
                                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           EMAIL DELIVERY                                 │
│                                                                          │
│  Welcome email arrives immediately with link to /listen                  │
│                                               │                          │
└───────────────────────────────────────────────│──────────────────────────┘
                                               │
                                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           LISTEN PAGE                                    │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  STAGE 1: Audio Experience                                       │    │
│  │  • Headline: "Before you decide anything, hear this."            │    │
│  │  • Audio player (5 min Session Zero)                             │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                              │                                           │
│                              ▼ (after audio ends OR 30 sec delay)        │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  STAGE 2: Post-Audio Bridge                                      │    │
│  │  • Acknowledge what they just heard                              │    │
│  │  • Tease the four remaining illusions                            │    │
│  │  • Create open loop for full program                             │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                              │                                           │
│                              ▼                                           │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  STAGE 3: Two Clear Paths                                        │    │
│  │                                                                   │    │
│  │  PRIMARY CTA          │         SECONDARY CTA                    │    │
│  │  Ready now?           │         Want to learn more?              │    │
│  │  [Founding member     │         [Read the full story →]          │    │
│  │   $199 →]             │         (links to landing page)          │    │
│  │                       │                                          │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
                    │                              │
                    ▼                              ▼
           ┌───────────────┐              ┌───────────────┐
           │   CHECKOUT    │              │ LANDING PAGE  │
           │   (Stripe)    │              │ (full pitch)  │
           └───────────────┘              └───────────────┘
```

### Journey Stages Detail

#### Stage 1: Landing Page (Existing)

**Entry points:**
- Direct traffic (typed URL, bookmarks)
- Paid ads (future)
- Organic search (future)
- Social media links (future)

**User mindset:** Curious but skeptical. May have tried to quit before. Evaluating whether this is different.

**Decision point:** Section 9 presents two paths:
- Path A (Ready): Proceed to purchase
- Path B (Not Yet): Provide email for audio experience

**Success metric:** Email capture rate among non-purchasers

---

#### Stage 2: Email Delivery

**Trigger:** Successful email submission on landing page

**Timing:** Immediate (within seconds)

**User mindset:** Interested enough to give email. Expecting something valuable.

**Content:** Single email with link to `/listen` page. No fluff, delivers on promise.

**Success metric:** Email open rate, click-through rate to `/listen`

---

#### Stage 3: Listen Page — Audio Experience

**Entry:** Click from welcome email

**User mindset:** Committed 5 minutes of attention. Open to being convinced.

**Experience:**
1. Clean, focused page — no distractions
2. Clear instruction: "5 minutes. Headphones help."
3. Audio player prominent and easy to use
4. No other CTAs visible during listening (focused experience)

**Success metric:** Play rate, completion rate

---

#### Stage 4: Listen Page — Post-Audio Bridge

**Trigger:** Audio ends OR 30-second delay (whichever first)

**User mindset:** Just experienced a reframe. May feel shift in perspective. Thinking "what else is there?"

**Content appears:**
- Acknowledgment of what they heard
- Revelation that this was one of five illusions
- Open loop: the other four illusions are what the full program addresses

**Purpose:** Bridge the gap between "that was interesting" and "I should buy this"

**Success metric:** Scroll depth, time on page post-audio

---

#### Stage 5: Listen Page — Decision Point

**User mindset:** Weighing whether to commit $199 or learn more first

**Two paths presented:**

| Path | CTA | Destination | User Intent |
|------|-----|-------------|-------------|
| Primary | "Become a founding member — $199 →" | Checkout / Pricing | Ready to commit |
| Secondary | "Read the full story →" | Landing page | Needs more information |

**Design rationale (Hulick/Ramit alignment):**
- Primary CTA is clear, confident, not pushy
- Secondary CTA *advances the relationship* rather than pausing it
- No "remind me later" — that's passive and doesn't build momentum
- Returning to landing page gives them the full pitch they may have skipped (especially email-only visitors)

**Success metric:** CTA click rate (primary vs. secondary), eventual conversion rate

---

### Journey Variants

#### Variant A: Landing Page → Direct Purchase (No Audio)

Some visitors will purchase directly from the landing page without engaging the audio funnel. This is the ideal path — they were convinced by the main pitch.

```
Landing Page → Section 9 Path A → Checkout → Purchase
```

---

#### Variant B: Audio → Immediate Purchase

Visitor enters email, receives audio, listens, and purchases immediately from the listen page.

```
Landing Page → Email Capture → Email → Listen Page → Primary CTA → Checkout → Purchase
```

**Insight:** These are high-intent leads. The audio was the final push they needed.

---

#### Variant C: Audio → Landing Page → Purchase

Visitor enters email, receives audio, listens, clicks secondary CTA to read more, then purchases from landing page.

```
Landing Page → Email Capture → Email → Listen Page → Secondary CTA → Landing Page → Purchase
```

**Insight:** These visitors needed the audio *and* the full pitch. Likely came to listen page directly from email without reading landing page first.

---

#### Variant D: Audio → Landing Page → Exit (No Purchase)

Visitor engages with audio and landing page but doesn't purchase.

```
Landing Page → Email Capture → Email → Listen Page → Secondary CTA → Landing Page → Exit
```

**Insight:** Not lost — they're on the mailing list. Future email sequence (post-MVP) can continue nurturing.

---

#### Variant E: Email Only (No Listen)

Visitor provides email but never opens email or visits listen page.

```
Landing Page → Email Capture → Email (unopened) → [nothing]
```

**Insight:** Low-intent lead. May respond to future email sequence. Low priority for MVP.

---

### Emotional Arc Across Journey

| Stage | User Feeling | Our Job |
|-------|--------------|---------|
| Landing page (top) | "Another quit-smoking thing?" | Create recognition: "This is different" |
| Landing page (middle) | "Okay, this resonates..." | Build belief: "This could work for me" |
| Landing page (Section 9) | "But $199 is a lot..." | Offer low-risk next step: "Just listen first" |
| Email | "Let's see if this is real" | Deliver immediately, no friction |
| Listen page (audio) | "I'm giving this 5 minutes" | Deliver transformation, not information |
| Listen page (post-audio) | "Wait... maybe I've been wrong" | Bridge to full program: "There's more" |
| Listen page (CTAs) | "Should I do this?" | Clear paths: ready now OR learn more |
| Landing page (return) | "Let me read this properly" | Full pitch lands differently post-audio |

---

### Key Design Principles

1. **Every step advances the relationship.** No dead ends, no "remind me later." Even the secondary CTA moves them forward.

2. **The audio is the turning point.** Before audio: skeptical, evaluating. After audio: open, considering. The listen page design respects this shift.

3. **Two entry points to landing page.** Visitors may see the landing page before OR after the audio. The page should work for both — but post-audio visitors will read it with different eyes.

4. **Email is the bridge, not the destination.** The email's only job is to get them to `/listen`. Keep it short, deliver the link, get out of the way.

5. **Respect their time and intelligence.** No tricks, no manufactured urgency, no guilt. They're successful adults making a considered decision.

---

## Audio Asset: Session Zero

### Concept

Session Zero is a "prologue" to the Unhooked program—not a sample chapter. It delivers one complete reframe that stands alone but creates hunger for the full system.

**Target Illusion:** Illusion 3 — "Quitting Requires Willpower"

**Why this illusion:**
- Directly addresses their fear of failing again
- Doesn't require Illusions 1 & 2 as prerequisites (unlike in the full program)
- Reframes the problem in a way that feels like relief, not information
- Creates a natural open loop ("there are four more illusions keeping you stuck")

### Voice Decision

**Recommendation:** Use your own voice, not AI.

**Rationale:**
- Session Zero is a trust-builder, not a product sample
- Founder voice signals "I made this for you" — premium positioning
- The AI voice is the *tool* that guides the work; the founder is the *welcome*
- At validation stage, human voice differentiates from every AI product

**Alternative:** If recording isn't feasible, AI voice (OpenAI TTS Nova) is acceptable. The content matters more than the voice.

### Audio Specifications

| Attribute | Value |
|-----------|-------|
| Duration | 4-6 minutes (target: 5 min) |
| Format | MP3, 128kbps minimum |
| Hosting | Vercel static asset or Supabase Storage |
| Filename | `session-zero.mp3` |

### Script: Session Zero

**[Opening — 30 seconds]**

*[Warm, conversational tone. Not performative.]*

> You're listening to this because part of you wants to quit nicotine... and part of you isn't sure you can.
>
> Maybe you've tried before. Maybe more than once. And somewhere along the way, you started to believe that quitting is just... hard. That it requires some superhuman level of willpower that you don't have.
>
> I want to show you something that might change that.

---

**[The Setup — 60 seconds]**

> Think about the last time you tried to quit. What was that like?
>
> For most people, it's a fight. You're constantly resisting. You want it, but you're telling yourself you can't have it. Every hour feels like a battle. And eventually, the wanting wins.
>
> That's the willpower method. And here's the thing about willpower: it's designed to fail.
>
> Not because you're weak. Because willpower only works when there's something to resist. And as long as you believe nicotine is giving you something—stress relief, pleasure, focus, whatever—there will always be something to resist.
>
> You're in a tug-of-war with yourself. And the only way to win a tug-of-war with yourself... is to drop the rope.

---

**[The Reframe — 90 seconds]**

> Here's what nobody told you:
>
> Nicotine's physical grip is weak. The actual withdrawal? It's comparable to a slight hunger pang. It passes in seconds. You've felt worse waiting for your morning coffee.
>
> So why does quitting feel so hard?
>
> Because the difficulty isn't physical. It's mental. It's the *conflict*—wanting to quit but also wanting to use. Part of you pulling one way, part of you pulling the other.
>
> But what if you could remove the wanting entirely?
>
> Not suppress it. Not fight it. Just... dissolve it.
>
> *[Pause]*
>
> Think about something you used to want that you don't want anymore. Maybe it's an ex. Maybe it's a job you left. Maybe it's a food you loved as a kid that does nothing for you now.
>
> You didn't use willpower to stop wanting those things. You just... stopped. Something shifted, and the wanting went away on its own.
>
> That's what's possible with nicotine. Not white-knuckling through cravings. Not counting days. Just... not wanting it anymore.

---

**[The Possibility — 60 seconds]**

> Imagine waking up and not thinking about it. Walking past your vape and feeling... nothing. Finishing a stressful day and not reaching for anything. Not because you're resisting. Because there's nothing to resist.
>
> That's not fantasy. That's what happens when the beliefs holding the addiction in place fall away.
>
> The belief that it relaxes you. The belief that it helps you focus. The belief that you'll always want it. The belief that quitting has to be hard.
>
> These aren't truths. They're illusions. And when you see them clearly, they lose their power.

---

**[The Open Loop — 30 seconds]**

> What I just walked you through? That's one illusion. The willpower illusion.
>
> There are four more. And each one is a pillar holding up your desire to use nicotine.
>
> When they all fall... there's nothing left to quit. You just stop wanting it.
>
> That's what Unhooked is. Not an app. Not a course. A series of voice conversations that dismantle these illusions—personalized to your life, your triggers, the specific moments when you reach for it.
>
> If what you just heard landed—if something in you recognized that the fight might be the problem—then maybe this is for you.

---

**[Close — 15 seconds]**

> I'm Kevin. I built this because I went through the same shift. And I think you deserve it too.
>
> When you're ready, I'll be here.

---

**[End of audio]**

### Script Notes

- **Pacing:** Leave room for breath. This isn't a podcast—it's intimate. Pauses matter.
- **Tone:** Warm, confident, not salesy. Like a friend who's been through it.
- **Length check:** Read aloud at conversational pace. Should land between 4:30-5:30.

---

## Landing Page Changes

### Location

Replace the current "Path B — Not Yet" section in Section 9 (Final CTA + Email Capture) with new copy.

### Current Copy (from v3.4)

```
PATH B - NOT YET:
[Headline]  
Not ready yet?

[Body]
Get one email that might change how you see nicotine. No spam. 
Just a taste of what we do.

[Email input + button]
[Your email] [Send it to me]
```

### New Copy (Recommended: Option A)

```
PATH B - NOT YET:
[Headline]  
Still thinking about it?

[Body]
You've built a career. A life. You've solved harder problems than this.

So why does this one still have a grip on you?

There's a 5-minute audio that might show you why—and it's not 
what you think.

No tactics. No willpower tips. Just a shift in how you see it.

[Email input + button]
[Your email] [Send me the audio]
```

### Copy Rationale (Option A)

- **"Still thinking about it?"** — Meets them where they are without judgment
- **"You've built a career. A life."** — Acknowledges their success (Ramit ego play)
- **"You've solved harder problems"** — Validates competence, creates cognitive dissonance
- **"why does this one still have a grip?"** — The tension they feel daily, externalized
- **"it's not what you think"** — Curiosity hook, implies their mental model is wrong
- **"a shift in how you see it"** — Transformation language (Hulick), not feature language
- **"Send me the audio"** — Action-oriented, matches what they're getting

### Design Philosophy

This copy follows two frameworks:

**Samuel Hulick:** Sell the better version of themselves, not the product. The copy focuses on identity ("you've built a career") and transformation ("a shift in how you see it") rather than describing what the audio contains.

**Ramit Sethi:** Acknowledge the audience is successful and smart—yet stuck on this one thing. Don't sell information; sell the result of consuming it.

---

### Alternative Copy Options (Documented)

These alternatives may be useful for A/B testing or different placements (exit intent, sticky footer, etc.).

#### Option B: Empathy-Forward (More Ramit)

```
PATH B - NOT YET:
[Headline]  
Not ready yet? I get it.

[Body]
You've probably tried before. Maybe more than once. And some part 
of you is thinking: "What if I pay $199 and nothing changes?"

So don't pay anything yet. Just listen to this.

5 minutes. No tactics. No willpower tips.

Just a different way of seeing the thing that's had a grip on you.

[Email input + button]
[Your email] [Send me the audio]
```

**When to use:** When you want to directly address the price objection. Good for visitors who scrolled past pricing and hesitated.

**Strengths:**
- "I get it" — Immediate empathy
- Calls out their actual objection ("What if I pay $199 and nothing changes?")
- "So don't pay anything yet" — Removes pressure, builds trust
- "the thing that's had a grip on you" — Externalizes the problem

---

#### Option C: Provocative (Maximum Ramit Energy)

```
PATH B - NOT YET:
[Headline]  
What if you're not actually addicted?

[Body]
What if nicotine just convinced you that you are?

There's a 5-minute audio that might change how you see this—even 
if you never buy anything from us.

[Email input + button]
[Your email] [I want to hear this]
```

**When to use:** Tight spaces (exit intent popup, sticky footer) where you need maximum impact in minimum words. Also good for pattern interrupts.

**Strengths:**
- Opens with provocative reframe (pattern interrupt)
- "convinced you that you are" — Implies they've been tricked, not that they're weak
- "even if you never buy anything" — Extreme confidence, zero pressure
- Shortest version — doesn't compete with primary CTA

---

#### Option D: Journey-Aware (For Section 9 Specifically)

```
PATH B - NOT YET:
[Headline]  
Seen everything and still not sure?

[Body]
That's okay. This isn't a decision you should rush.

But before you go, listen to something. 5 minutes. No commitment.

It might change how you see the thing that's kept you stuck—even 
if you never come back here.

[Email input + button]
[Your email] [Send me the audio]
```

**When to use:** Specifically for Section 9 placement, after visitors have scrolled through the entire landing page.

**Strengths:**
- Acknowledges they've seen the full pitch
- "This isn't a decision you should rush" — Respects the weight of the commitment
- "before you go" — Captures exit intent naturally
- "even if you never come back" — No pressure, builds trust

---

### Visual Treatment

- Keep same layout structure as current spec
- Email input field + button remains identical in style
- No additional visual changes required

---

## Listening Page

### URL

`https://getunhooked.app/listen`

This page should be:
- Unlisted (no link in navigation)
- Indexed as `noindex` (not discoverable via search)
- Accessible only via direct link from email

### Page Structure (Extended Journey)

The listen page unfolds in three stages. Stages 2 and 3 appear after the audio completes (or after 30-second delay).

```
─────────────────────────────────────────────────────────────────
STAGE 1: AUDIO EXPERIENCE
─────────────────────────────────────────────────────────────────

[Top padding — generous whitespace]

[Headline]
Before you decide anything, hear this.

[Subhead]
5 minutes. Headphones help.

[Audio player — centered, prominent]
[Standard HTML5 audio player with play/pause, progress bar, time display]


─────────────────────────────────────────────────────────────────
STAGE 2: POST-AUDIO BRIDGE (appears after audio ends OR 30 sec)
─────────────────────────────────────────────────────────────────

[Acknowledgment headline]
That belief—that quitting requires willpower—is just one of five.

[Bridge copy]
There are four more illusions keeping nicotine in control.

The stress relief that isn't real.
The pleasure that's actually withdrawal ending.
The focus you think it gives you.
The identity you think you can't escape.

When they all fall, there's nothing left to fight. You just stop wanting it.


─────────────────────────────────────────────────────────────────
STAGE 3: TWO CLEAR PATHS
─────────────────────────────────────────────────────────────────

[Primary CTA section]
Ready to see the rest?

[Button — prominent, orange accent]
Become a founding member — $199 →

[Subtext below button]
30-day guarantee · Start when the program launches


[Secondary CTA section — visually quieter, below primary]
Want to learn more first?

[Text link — not a button]
Read the full story →
[Links to: https://getunhooked.app/ (landing page)]


─────────────────────────────────────────────────────────────────
FOOTER
─────────────────────────────────────────────────────────────────

© 2026 Unhooked
```

### Stage Behavior

**Stage 1 (Audio):**
- Visible immediately on page load
- Audio player is the focal point
- No other CTAs visible — focused listening experience

**Stage 2 (Bridge) + Stage 3 (CTAs):**
- Appear together after audio `ended` event fires OR after 30-second delay
- Use fade-in animation (300-400ms) to feel intentional, not jarring
- Once visible, remain visible (no hiding on replay)

**Rationale for 30-second fallback:**
- Some users will skim or skip
- Don't punish them — they might still convert
- 30 seconds is enough to signal "this is an audio experience" without forcing completion

### Copy Rationale

**Stage 2 — Post-Audio Bridge:**

| Element | Copy | Purpose |
|---------|------|---------|
| Headline | "That belief—that quitting requires willpower—is just one of five." | Acknowledges what they heard; creates open loop |
| Bridge copy (line 1) | "There are four more illusions keeping nicotine in control." | Stakes the full program's value |
| Bridge copy (stacked lines) | "The stress relief... The pleasure... The focus... The identity..." | Teases remaining illusions; each line lands as its own beat |
| Bridge copy (closer) | "When they all fall, there's nothing left to fight. You just stop wanting it." | Paints the transformation (Hulick); not fighting, just free |

**Stage 3 — CTAs:**

| Element | Copy | Purpose |
|---------|------|---------|
| Primary headline | "Ready to see the rest?" | Frames purchase as continuation, not transaction |
| Primary button | "Become a founding member — $199 →" | Clear, confident, specific |
| Primary subtext | "30-day guarantee · Start when the program launches" | Reduces risk; acknowledges pre-launch state |
| Secondary headline | "Want to learn more first?" | Validates their hesitation |
| Secondary link | "Read the full story →" | Advances relationship; sends to landing page |

### Secondary CTA: Design Rationale

**Why "Read the full story" instead of "Remind me later":**

Based on patterns from Samuel Hulick and Ramit Sethi:
- Neither uses "remind me later" as a secondary CTA
- Ramit offers *more value* to keep proving himself
- Hulick offers *preview of the experience* to advance the relationship

"Read the full story" (linking to landing page) aligns with Hulick's pattern:
- Advances the relationship rather than pausing it
- Gives email-only visitors the full pitch they may have skipped
- Landing page reads differently *after* the audio experience
- No dead ends — every path moves forward

### Design Notes

- **Background:** Match landing page (deep teal gradient)
- **Typography:** Match landing page (Inter)
- **Audio player:** Native HTML5 styled to match brand
- **No navigation:** Focused, single-purpose page
- **No social sharing:** Keep it intimate
- **Mobile:** Audio player must work well on iOS Safari and Android Chrome

**Visual hierarchy (top to bottom):**
1. Headline + subhead (small)
2. Audio player (prominent, centered)
3. Bridge copy (medium, breathing room between lines)
4. Primary CTA (large button, orange accent)
5. Secondary CTA (text link, visually quieter)
6. Footer (minimal)

**Spacing guidance:**
- Generous whitespace above audio player
- Stage 2 bridge copy: stacked lines with whitespace between (like landing page Section 3)
- Clear visual separation between primary and secondary CTAs
- Primary CTA should feel like "the" action; secondary should feel like "or if you prefer..."

### Technical Implementation

```vue
<!-- pages/listen.vue -->
<template>
  <div class="listen-page">
    <div class="content">
      <!-- Stage 1: Audio Experience -->
      <section class="stage-audio">
        <h1>Before you decide anything, hear this.</h1>
        <p class="subhead">5 minutes. Headphones help.</p>
        
        <audio 
          ref="audioPlayer"
          controls 
          :src="audioSrc"
          @ended="onAudioEnded"
          @play="onAudioPlay"
        />
      </section>
      
      <!-- Stage 2 & 3: Bridge + CTAs (appear after audio or delay) -->
      <transition name="fade">
        <div v-if="showPostAudio" class="post-audio-content">
          
          <!-- Stage 2: Bridge -->
          <section class="stage-bridge">
            <h2>That belief—that quitting requires willpower—is just one of five.</h2>
            
            <p class="bridge-intro">There are four more illusions keeping nicotine in control.</p>
            
            <div class="illusion-teasers">
              <p>The stress relief that isn't real.</p>
              <p>The pleasure that's actually withdrawal ending.</p>
              <p>The focus you think it gives you.</p>
              <p>The identity you think you can't escape.</p>
            </div>
            
            <p class="bridge-close">When they all fall, there's nothing left to fight. You just stop wanting it.</p>
          </section>
          
          <!-- Stage 3: CTAs -->
          <section class="stage-ctas">
            <!-- Primary CTA -->
            <div class="primary-cta">
              <p class="cta-headline">Ready to see the rest?</p>
              <NuxtLink to="/#pricing" class="cta-button">
                Become a founding member — $199 →
              </NuxtLink>
              <p class="cta-subtext">30-day guarantee · Start when the program launches</p>
            </div>
            
            <!-- Secondary CTA -->
            <div class="secondary-cta">
              <p class="cta-headline-secondary">Want to learn more first?</p>
              <NuxtLink to="/" class="cta-link">
                Read the full story →
              </NuxtLink>
            </div>
          </section>
          
        </div>
      </transition>
    </div>
    
    <footer>© 2026 Unhooked</footer>
  </div>
</template>

<script setup>
const audioSrc = '/audio/session-zero.mp3'
const showPostAudio = ref(false)
const hasStartedPlaying = ref(false)

function onAudioPlay() {
  hasStartedPlaying.value = true
}

function onAudioEnded() {
  showPostAudio.value = true
}

// Fallback: Show CTAs after 30 seconds if audio started
// This handles skippers and partial listeners
onMounted(() => {
  setTimeout(() => {
    if (hasStartedPlaying.value) {
      showPostAudio.value = true
    }
  }, 30000)
})

// SEO: Prevent indexing
useHead({
  meta: [
    { name: 'robots', content: 'noindex, nofollow' }
  ],
  title: 'Listen — Unhooked'
})
</script>

<style scoped>
.listen-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.content {
  flex: 1;
  max-width: 640px;
  margin: 0 auto;
  padding: 4rem 1.5rem;
}

.stage-audio {
  text-align: center;
  margin-bottom: 3rem;
}

.stage-audio h1 {
  font-size: 1.75rem;
  margin-bottom: 0.5rem;
}

.subhead {
  opacity: 0.8;
  margin-bottom: 2rem;
}

audio {
  width: 100%;
  max-width: 400px;
}

.stage-bridge {
  margin-bottom: 3rem;
}

.stage-bridge h2 {
  font-size: 1.5rem;
  margin-bottom: 1.5rem;
}

.illusion-teasers p {
  margin-bottom: 0.75rem;
  opacity: 0.9;
}

.bridge-close {
  margin-top: 1.5rem;
  font-style: italic;
}

.stage-ctas {
  text-align: center;
}

.primary-cta {
  margin-bottom: 2.5rem;
}

.cta-headline {
  font-size: 1.25rem;
  margin-bottom: 1rem;
}

.cta-button {
  display: inline-block;
  background: linear-gradient(135deg, #fc4a1a, #f7b733);
  color: white;
  padding: 1rem 2rem;
  border-radius: 8px;
  font-weight: 600;
  text-decoration: none;
}

.cta-subtext {
  margin-top: 0.75rem;
  font-size: 0.875rem;
  opacity: 0.7;
}

.secondary-cta {
  opacity: 0.8;
}

.cta-headline-secondary {
  font-size: 1rem;
  margin-bottom: 0.5rem;
}

.cta-link {
  color: inherit;
  text-decoration: underline;
}

footer {
  text-align: center;
  padding: 2rem;
  opacity: 0.6;
  font-size: 0.875rem;
}

/* Fade transition */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.4s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
```

### Audio Hosting

Place the audio file at:
```
/public/audio/session-zero.mp3
```

This serves it as a static asset from Vercel.

---

## Welcome Email

### Trigger

Sent immediately upon successful email submission (same as current mailing list flow).

### Integration

This replaces the current welcome email content in the mailing list system. The infrastructure remains the same; only the email content changes.

**Note:** This change should be coordinated with the transition from "pre-launch waitlist" to "undecided visitor nurture." Both use the same mailing list table and API endpoint.

### Email Content

**From:** kevin@getunhooked.app  
**Subject:** Here's the audio I promised

---

**Email Body:**

```
Here's the audio.

5 minutes. You'll want headphones and a quiet moment.

[BUTTON: Listen now →]
https://getunhooked.app/listen?src=welcome

If now isn't the right time, save this email. It'll be here when you're ready.

— Kevin
```

---

**Copy Rationale:**

| Element | Purpose |
|---------|---------|
| "Here's the audio." | Delivers immediately. No preamble. They know why they signed up. |
| "5 minutes. You'll want headphones and a quiet moment." | Sets expectation, gives implicit permission to wait for the right moment |
| Single button | One CTA, no distractions |
| "If now isn't the right time..." | Explicit permission to delay — reduces guilt, increases eventual listen rate |
| "— Kevin" | Personal, founder energy |

**What we intentionally omit:**
- Re-explaining what the audio is about (they read this on the landing page)
- "You signed up because..." preamble (they know)
- P.S. with extra selling (save it for follow-up)

---

### Email Styling

- Plain text preferred (better deliverability, feels personal)
- If HTML: minimal styling, single CTA button, no images
- Button color: Orange accent (#fc4a1a) if using HTML template
- Mobile-friendly (single column, readable at 14px+)

### Resend Template

Update the welcome email template in the subscribe endpoint:

```typescript
// In server/api/subscribe.post.ts

const { data: emailData, error: emailError } = await resend.emails.send({
  from: 'Kevin from Unhooked <kevin@getunhooked.app>',
  to: normalizedEmail,
  subject: "Here's the audio I promised",
  text: `Here's the audio.

5 minutes. You'll want headphones and a quiet moment.

Listen now: https://getunhooked.app/listen?src=welcome

If now isn't the right time, save this email. It'll be here when you're ready.

— Kevin
  `
})
```

---

## Email Timing Strategy

### Initial Email: Send Immediately

**Recommendation:** Send the welcome email immediately upon email submission.

**Rationale:**
- They're already engaged — they just read the landing page and gave you their email
- Immediate delivery matches the expectation set by "Send me the audio"
- Ramit Sethi's pattern: deliver value instantly, no waiting
- Avoids the email getting buried under other inbox traffic

### Follow-Up Email: Conditional on Non-Click

**Trigger:** Send 48 hours after initial email IF they have not clicked the listen link.

**Mechanism:** Resend supports open and click tracking via webhooks. When click tracking is enabled, Resend sets up a redirect for each link and sends webhook events (`email.clicked`) when recipients click. Use this to condition the follow-up.

**Logic:**
```
IF email.clicked event NOT received within 48 hours
THEN send follow-up email
```

**Follow-Up Email Content:**

**From:** kevin@getunhooked.app  
**Subject:** Still waiting for you

**Body:**
```
A couple days ago you asked for something.

I sent it, but I'm not sure it landed at the right moment.

Here it is again — 5 minutes that might change how you see 
your nicotine habit.

[BUTTON: Listen now →]
https://getunhooked.app/listen?src=followup

No pressure. But if part of you is still thinking about this, 
maybe that's worth paying attention to.

— Kevin
```

**Why this works:**
- Acknowledges the gap without guilt-tripping
- "Still waiting for you" is intriguing, not desperate
- Gives them another chance without being pushy
- "Part of you is still thinking about this" speaks to their internal conflict

### Resend Webhook Setup (High-Level)

To enable conditional follow-up:

1. **Enable click tracking** in Resend dashboard (Domains → your domain → enable click tracking)
2. **Create webhook endpoint** to receive `email.clicked` events
3. **Store click status** in `mailing_list` table (new field: `audio_link_clicked_at`)
4. **Schedule follow-up job** that runs daily, checks for:
   - Subscribers where `subscribed_at` > 48 hours ago
   - AND `audio_link_clicked_at` IS NULL
   - AND `followup_sent_at` IS NULL
5. **Send follow-up** and mark `followup_sent_at`

**Database schema addition:**
```sql
ALTER TABLE public.mailing_list
ADD COLUMN audio_link_clicked_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN followup_sent_at TIMESTAMP WITH TIME ZONE;
```

### Timing Summary

| Email | Timing | Condition |
|-------|--------|-----------|
| Welcome email (with audio link) | Immediate | On email submission |
| Follow-up nudge | 48 hours after welcome | Only if audio link not clicked |

### Future Enhancement: Time-of-Day Optimization

Post-MVP, consider testing send times for the follow-up:
- **Evening (7pm local):** Wind-down time, more likely to have 5 quiet minutes
- **Weekend morning:** Relaxed, reflective mindset

This requires timezone detection and scheduled sending — defer to post-MVP.

---

## Analytics & Tracking

### Objectives

The analytics for this feature should answer these questions:

1. **Is the audio lead magnet capturing undecided visitors?**
   - How many people sign up for the audio vs. purchase directly?
   - What percentage of landing page visitors become audio leads?

2. **Are people actually listening?**
   - Of those who receive the email, how many visit the listen page?
   - Of those who visit, how many press play?
   - Of those who start, how many finish?

3. **Does the audio drive conversions?**
   - What's the conversion rate from audio listener to purchaser?
   - How does this compare to direct landing page → purchase conversion?
   - Is the audio *helping* or just adding steps to the funnel?

4. **Where are people dropping off?**
   - Email not opened? → Subject line or timing problem
   - Page visited but not played? → Page design or copy problem
   - Started but not finished? → Audio content problem
   - Finished but no CTA click? → Post-audio bridge problem

### What to Track

**Landing Page Events:**

| Event | When | Purpose |
|-------|------|---------|
| Audio Email Signup | Email submitted (Path B) | Measures lead magnet appeal |

**Email Events (via Resend webhooks):**

| Event | When | Purpose |
|-------|------|---------|
| Email Delivered | Resend confirms delivery | Baseline for open rate |
| Email Opened | Recipient opens email | Measures subject line effectiveness |
| Audio Link Clicked | Recipient clicks listen link | Measures email → page conversion |

**Listen Page Events:**

| Event | When | Properties | Purpose |
|-------|------|------------|---------|
| Listen Page View | Page loads | `email_source: welcome \| followup` | Measures email click-through and which email drove the visit |
| Audio Started | Play button pressed | `email_source` | Measures page → engagement conversion |
| Audio Completed | Audio reaches end | `email_source` | Measures content engagement |
| Primary CTA Click | "Become a founding member" clicked | `email_source` | Measures post-audio purchase intent |
| Secondary CTA Click | "Read the full story" clicked | `email_source` | Measures need for more info |

**Email Source Tracking:**

Both emails include a `src` parameter in the listen page URL:
- Welcome email: `https://getunhooked.app/listen?src=welcome`
- Follow-up email: `https://getunhooked.app/listen?src=followup`

The listen page should:
1. Read the `src` query parameter on page load
2. Include it as a property on all Plausible events
3. This allows filtering/comparing performance: "Did the follow-up email actually drive listens and conversions?"

**Purchase Events:**

| Event | When | Purpose |
|-------|------|---------|
| Purchase | Stripe checkout complete | Ultimate conversion |
| Purchase Funnel Attribution | With purchase | Know if they came through audio funnel or direct |

### Conversion Funnel

```
Landing Page Visit
    ↓
┌─────────────────────────────────────┐
│         DECISION POINT              │
├──────────────────┬──────────────────┤
│   Path A: Ready  │  Path B: Not Yet │
│   (Direct buy)   │  (Audio signup)  │
└────────┬─────────┴────────┬─────────┘
         │                  │
         │                  ▼
         │           Email Delivered
         │                  ↓
         │           Email Opened
         │                  ↓
         │           Link Clicked
         │                  ↓
         │           Listen Page View
         │                  ↓
         │           Audio Started
         │                  ↓
         │           Audio Completed
         │                  ↓
         │           CTA Clicked
         │                  │
         ▼                  ▼
    ┌─────────────────────────────────┐
    │           PURCHASE              │
    │   (attributed: direct / audio)  │
    └─────────────────────────────────┘
```

### Funnel Attribution

To know which funnel drove a purchase, track the visitor's path:

- **Direct funnel:** Landing page → Purchase (never signed up for audio)
- **Audio funnel:** Landing page → Audio signup → Listen → Purchase

Attribution options:
- URL parameter on CTA links from listen page (e.g., `?ref=audio`)
- Session/cookie tracking of audio funnel engagement
- Database lookup: did this email exist in mailing list before purchase?

### Success Metrics

| Metric | Calculation | Target | Notes |
|--------|-------------|--------|-------|
| Lead magnet signup rate | Audio signups / Non-purchasing visitors | 5-10% | Baseline to establish |
| Email open rate | Opens / Delivered | >40% | Personal email benchmark |
| Email click rate | Clicks / Delivered | >20% | High-intent audience |
| Listen page play rate | Audio Started / Page Views | >70% | Why visit if not to listen? |
| Audio completion rate | Audio Completed / Audio Started | >60% | 5 min should be finishable |
| Post-audio primary CTA rate | Primary Clicks / Audio Completed | Track | Key metric |
| Post-audio secondary CTA rate | Secondary Clicks / Audio Completed | Track | Indicates need for more info |
| Audio funnel conversion | Purchases (audio) / Audio signups | Track | Ultimate measure of audio value |
| Audio vs. direct conversion | Compare rates | Track | Is audio helping or adding friction? |

### Reporting Dashboard (Future)

When Plausible is fully configured, create a custom dashboard showing:

1. **Top of funnel:** Landing page visits, Path A vs Path B split
2. **Email performance:** Delivery, opens, clicks (from Resend)
3. **Listen page engagement:** Views, plays, completions
4. **Conversion:** CTA clicks, purchases, funnel attribution

This gives a single view of the entire lead nurture funnel.

---

## Implementation Checklist

### Audio Production
- [ ] Record Session Zero script (or generate via TTS)
- [ ] Edit for pacing and quality
- [ ] Export as MP3 (128kbps+)
- [ ] Test playback on desktop and mobile

### Landing Page
- [ ] Update Section 9 "Path B" copy to Option A
- [ ] Update button text to "Send me the audio"
- [ ] Test email submission still works

### Listening Page
- [ ] Create `/listen` page with three-stage structure
- [ ] Implement Stage 1: Audio player
- [ ] Implement Stage 2: Post-audio bridge copy
- [ ] Implement Stage 3: Dual CTAs (primary + secondary)
- [ ] Add fade-in transition for Stages 2-3
- [ ] Add noindex meta tag
- [ ] Test on mobile (iOS Safari, Android Chrome)
- [ ] Test audio playback on various devices

### Email — Welcome
- [ ] Update welcome email content in subscribe endpoint
- [ ] Update subject line to "Here's the audio I promised"
- [ ] Add "save this email" permission line
- [ ] Test email delivery (Gmail, Outlook, Apple Mail)
- [ ] Verify link to /listen works

### Email — Follow-Up (Conditional)
- [ ] Enable click tracking in Resend dashboard
- [ ] Create webhook endpoint for `email.clicked` events
- [ ] Add `audio_link_clicked_at` and `followup_sent_at` columns to mailing_list
- [ ] Implement follow-up email logic (48hr delay, no-click condition)
- [ ] Create follow-up email template ("Still waiting for you")

### Analytics — Plausible
- [ ] Track `Audio Email Signup` on landing page
- [ ] Track `Listen Page View` on /listen
- [ ] Track `Audio Started` on play event
- [ ] Track `Audio Completed` on ended event
- [ ] Track `Primary CTA Click` and `Secondary CTA Click`
- [ ] Implement funnel attribution for purchases

### Analytics — Resend Webhooks
- [ ] Set up webhook endpoint for email events
- [ ] Track `email.delivered`, `email.opened`, `email.clicked`
- [ ] Store email engagement data in database

---

## Future Enhancements (Out of Scope for v1)

### Email Sequence

After v1 is validated, expand to a 3-5 email nurture sequence:

| Email | Timing | Content |
|-------|--------|---------|
| 1 | Immediate | Audio link (this spec) |
| 2 | 48 hours (conditional) | "Still waiting for you" — only if no click (this spec) |
| 3 | Day 4 | Second illusion teaser (stress relief) |
| 4 | Day 7 | Social proof / founder story |
| 5 | Day 10 | Direct CTA + urgency (if applicable) |

### Segmentation

- Track who listened vs. who didn't
- Track who clicked CTA vs. who didn't
- Tailor follow-up emails based on behavior

### A/B Testing

- Subject line variations
- Landing page copy variations (Options A-D)
- Audio length variations (3 min vs. 5 min)

### Additional Audio Content

- Create "Session Zero" variations for other illusions
- Test which illusion converts best as lead magnet

### Time-of-Day Optimization

- Detect user timezone
- Test evening (7pm) vs. morning (9am) send times for follow-up
- Requires scheduled sending infrastructure

---

## Resolved Decisions

1. **Recording:** To be determined by Kevin. Recommendation remains Kevin's voice for founder intimacy and trust-building.

2. **Timing:** This feature goes live **post-Stripe**. The full funnel (landing page → email capture → listen page → purchase) requires checkout to be operational.

3. **Existing subscribers:** Handle manually, outside the scope of this PRD. Kevin will either:
   - Manually email existing mailing list subscribers with the listen page link
   - Script a one-time send to existing subscribers
   
   This PRD covers only the automated flow for new signups.

---

---

## Implementation Decisions (Interview Results)

This section documents decisions made during the implementation interview on 2026-01-22. These decisions clarify or modify the original spec where needed.

### Core Behavior Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Non-play state (never press play) | CTAs hidden indefinitely | Only show CTAs to users who engage with audio |
| 30-second timer behavior | Wall-clock time from first play | Simplest implementation; doesn't pause/resume with audio |
| Missing `src` param | Track as 'direct' | Distinguishes direct/shared links from email-driven visits |
| Direct access to /listen | Allowed | The audio is the value; let anyone hear it |
| Debug mode | Add `?debug=true` query param | Shows all stages immediately for development testing |

### UI/UX Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Styling approach | Tailwind utilities | Follow CLAUDE.md; no scoped CSS |
| Button radius | Pill-shaped (`rounded-pill`) | Brand consistency |
| Audio player | Styled native with minimal accent colors | Simple, reliable, accept browser differences |
| Mobile player | Native controls | Accept that mobile looks different; more reliable |
| Page navigation | Text "Unhooked" links home | No logo yet; simple home link |
| Post-audio scroll | Auto-scroll to bridge section | Bring newly-appeared content into view |
| Primary CTA destination | Direct to Stripe checkout | Skip landing page pricing; avoid redundant CTA text |
| Secondary CTA | Link to `/?ref=listen` | Attribution for landing page visits from listen page |

### Copy Decisions (Modifications to Spec)

| Element | Original Spec | Implementation Decision |
|---------|---------------|------------------------|
| Path B headline | "Still thinking about it?" | ✅ Keep as spec |
| Path B body copy | Option A with career references | **Changed**: Use universal copy (see below) |
| Button text | "Send me the audio" | **Changed**: Keep "Send it to me" |
| Success message | N/A | Keep existing "Check your inbox" |
| Bridge copy | Lists specific illusions | **Changed**: Generic "four more illusions" text |

**Revised Path B Body Copy (Universal):**
```
Still thinking about it? That makes sense. There's a 5-minute audio
that might show you something — not tactics or willpower tips. Just
a shift in how you see it. No commitment required.
```

**Revised Bridge Copy (Generic):**
```
There are four more illusions keeping nicotine in control. Each one
feels true until you see through it. When they all fall, there's
nothing left to fight. You just stop wanting it.
```

### Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Email format | Plain text only | Better deliverability, personal feel |
| Email failure handling | Keep current (log, continue) | Subscription saved even if email fails |
| App mode logic | `disabled` = waitlist, `validation`/`enabled` = audio | Audio funnel active when checkout is available |
| Checkout button | Reuse existing CheckoutButton component | Consistent behavior, includes tracking and error handling |
| Tracking location | Add 'listen' to CheckoutButton locations | Unified analytics system |
| Event naming | Simple names (AUDIO_STARTED, etc.) | Events only occur on listen page, context is clear |
| Audio asset | Placeholder silent MP3 for dev | Real audio recorded later |

### Scope Decisions

**In Scope (v1):**
- Listen page with three-stage design
- Landing page copy changes (Path B)
- Welcome email content change
- Plausible analytics events
- Dummy audio file for testing

**Deferred (Phase 2):**
- Follow-up email (48hr conditional)
- Resend webhook endpoint for click tracking
- Database schema changes (`audio_link_clicked_at`, `followup_sent_at`)
- Scheduled job for follow-up logic

---

## Implementation Chunks

The implementation is organized into logical chunks, all on the same branch with separate commits for easier review.

### Chunk 1: Listen Page Foundation

**Goal:** Create the `/listen` page with basic structure and audio player.

**Tasks:**
- [ ] Create `pages/listen.vue` with three-stage structure
- [ ] Implement Stage 1: Audio player with headline and subhead
- [ ] Create `public/audio/` directory with placeholder silent MP3
- [ ] Add `noindex` meta tag
- [ ] Style audio player with minimal brand accent colors
- [ ] Add "Unhooked" text link to home in header area
- [ ] Implement `?debug=true` query param to show all stages

**Files:**
- `pages/listen.vue` (new)
- `public/audio/session-zero.mp3` (new, placeholder)

### Chunk 2: Listen Page Interactivity

**Goal:** Add post-audio reveal logic and CTAs.

**Tasks:**
- [ ] Implement Stage 2: Bridge copy (generic illusions text)
- [ ] Implement Stage 3: Primary CTA (CheckoutButton to Stripe) + Secondary CTA
- [ ] Add fade-in transition for Stages 2-3
- [ ] Implement 30-second wall-clock timer fallback
- [ ] Implement auto-scroll to bridge section after reveal
- [ ] Add 'listen' tracking location to CheckoutButton
- [ ] Read `src` query param and store for analytics

**Files:**
- `pages/listen.vue` (update)
- `components/landing/CheckoutButton.vue` (add 'listen' location)

### Chunk 3: Landing Page Copy Changes

**Goal:** Update Path B copy in LandingFinalCTA component.

**Tasks:**
- [ ] Update headline from "Not ready yet?" to "Still thinking about it?"
- [ ] Update body copy to universal audio magnet copy
- [ ] Keep button text as "Send it to me"
- [ ] Ensure mode-aware logic still works (`checkoutEnabled`)

**Files:**
- `components/landing/LandingFinalCTA.vue` (update)

### Chunk 4: Welcome Email Changes

**Goal:** Update subscribe endpoint to send audio email in validation/enabled modes.

**Tasks:**
- [ ] Create new plain text email content for audio funnel
- [ ] Add mode-aware email selection (disabled = waitlist, validation/enabled = audio)
- [ ] Update email link to include `?src=welcome`
- [ ] Keep existing email for `disabled` mode unchanged

**Files:**
- `server/api/subscribe.post.ts` (update)

### Chunk 5: Analytics Integration

**Goal:** Wire up Plausible tracking for listen page events.

**Tasks:**
- [ ] Add AUDIO_STARTED event
- [ ] Add AUDIO_COMPLETED event
- [ ] Add SECONDARY_CTA_CLICK event (for "Read the full story")
- [ ] Add CTA_CLICK_LISTEN event (via CheckoutButton)
- [ ] Include `email_source` property on all listen page events
- [ ] Track page view with source

**Files:**
- `composables/useAnalytics.ts` (add events)
- `pages/listen.vue` (wire up tracking)

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-18 | Initial PRD covering audio lead magnet, landing page changes, listening page, and welcome email |
| 1.1 | 2026-01-18 | Updated landing page copy to Option A (identity-forward, Hulick+Ramit hybrid); Added three alternative copy options (B: empathy-forward, C: provocative, D: journey-aware) for A/B testing and different placements |
| 1.2 | 2026-01-18 | Added comprehensive User Journey section with journey map, stage details, variants, and emotional arc; Redesigned Listen Page with three-stage extended journey (audio → bridge → dual CTAs); Added post-audio bridge copy teasing four remaining illusions; Implemented dual CTA pattern: primary (purchase) + secondary (return to landing page); Added detailed Vue component with staging logic and styling; Documented Hulick/Ramit rationale for secondary CTA design |
| 1.3 | 2026-01-18 | Added Email Timing Strategy section: immediate welcome email + conditional 48hr follow-up for non-clickers; Documented Resend webhook integration for click tracking; Added follow-up email copy ("Still waiting for you"); Expanded Analytics section with objectives, comprehensive event tracking, funnel diagram, attribution strategy, and success metrics; Updated implementation checklist with email and analytics tasks |
| 1.4 | 2026-01-18 | Finalized welcome email copy (ultra-short Ramit-style version); Added `src` parameter to email URLs for tracking which email drove listen page visits (`welcome` vs `followup`); Added email source as property on all listen page Plausible events; Resolved open questions: goes live post-Stripe, existing subscribers handled manually out of scope |
| 1.5 | 2026-01-22 | Added Implementation Decisions section documenting interview results; Added Implementation Chunks section with 5 logical phases; Modified copy decisions: universal Path B body copy (removed career assumptions), generic bridge copy (no specific illusions), keep "Send it to me" button text; Technical decisions: direct Stripe link from primary CTA, reuse CheckoutButton, Tailwind styling, debug mode for dev |
| 1.6 | 2026-01-22 | Added formal User Stories (US-001 through US-015) organized by implementation chunk with verifiable acceptance criteria; Added Functional Requirements (FR-1 through FR-21); Added Non-Goals section consolidating Phase 2 deferrals and explicit exclusions; Added Design Considerations section referencing existing components and brand system; Added Success Metrics section extracted from Analytics with primary and conversion metrics |
