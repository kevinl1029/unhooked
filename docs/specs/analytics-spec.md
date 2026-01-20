# Unhooked: Analytics Implementation Specification

**Version:** 1.1
**Created:** 2026-01-18
**Status:** Planning
**Document Type:** Technical Specification

---

## Executive Summary

This specification covers the implementation of analytics for Unhooked's market validation phase. The primary goal is to track the full marketing funnel from ad click through conversion, enabling data-driven decisions about which channels are worth continued investment.

**Core Question We Need to Answer:** "Which ad channel is actually converting at $199?"

---

## Business Context

### What We're Validating

Unhooked is running paid campaigns on Google, TikTok, and Instagram to drive traffic to a landing page where users can:
1. **Convert immediately** — Purchase founding member access ($199)
2. **Join the waitlist** — Email capture for future nurturing

### The Funnel We Need to Track

```
Ad impression (Google/TikTok/Instagram)
  → Ad click (tracked by ad platforms)
    → Landing page view (with UTM params)
      → Scroll depth / section engagement
        → CTA interaction (button clicks)
          → Checkout started (Stripe redirect)
            → Payment completed ($199)
              OR
          → Email submitted (waitlist)
```

### Current State

The codebase already has:
- **UTM tracking** — `useUtmTracking.ts` captures UTM params and stores in localStorage with 7-day TTL
- **Checkout attribution** — UTM params passed to Stripe metadata and `founding_members` table
- **Email attribution** — UTM params stored in `mailing_list` table metadata

**What's Missing:**
- No pageview tracking
- No event tracking (CTA clicks, scroll depth)
- No real-time dashboard for traffic/conversion monitoring
- No way to see "users from TikTok spent 45s on page" vs "users from Google bounced immediately"

---

## Analytics Tool Evaluation

### Requirements

| Requirement | Priority | Notes |
|-------------|----------|-------|
| **Privacy-respecting** | High | No personal data collection; GDPR/CCPA-friendly |
| **UTM attribution** | Critical | Must link pageviews to campaign sources |
| **Custom events** | High | Track CTA clicks, checkout started, email submitted |
| **Real-time dashboard** | Medium | See traffic as campaigns run |
| **Low cost** | High | Market validation phase, budget-conscious |
| **Simple integration** | High | Solo founder, no analytics engineering team |
| **No cookie banner required** | High | Better UX, no consent fatigue |

### Options Evaluated

#### 1. Plausible Analytics

**What it is:** Privacy-focused, EU-hosted analytics. No cookies, no personal data collection.

| Aspect | Details |
|--------|---------|
| **Pricing** | $9/mo (10K pageviews) or $19/mo (100K pageviews) |
| **Cookie-free** | Yes — no banner needed |
| **UTM tracking** | Built-in, automatic |
| **Custom events** | Yes — `plausible('event', { props })` |
| **Real-time** | Yes — live dashboard |
| **Self-hosting** | Available (free, but requires server management) |
| **GDPR compliant** | Yes — EU-hosted, no personal data |

**Pros:**
- Dead simple integration (single `<script>` tag)
- Clean, focused dashboard
- Automatic UTM attribution
- Goal conversion tracking
- Revenue tracking available
- No consent banner required

**Cons:**
- Paid service ($9-19/mo)
- Less granular than GA4 (intentionally)
- No user-level data (can't track individual journeys)

#### 2. Google Analytics 4 (GA4)

**What it is:** Google's analytics platform, industry standard.

| Aspect | Details |
|--------|---------|
| **Pricing** | Free (with data limits) |
| **Cookie-free** | No — requires consent banner |
| **UTM tracking** | Yes, built-in |
| **Custom events** | Yes — `gtag('event', ...)` |
| **Real-time** | Yes |
| **Privacy** | Data goes to Google servers |

**Pros:**
- Free
- Powerful, granular reporting
- Native Google Ads integration
- Industry standard

**Cons:**
- **Requires cookie consent banner** (significant UX impact)
- Complex interface, steep learning curve
- Data sampling on free tier
- Privacy concerns (Google uses data for ad targeting)
- Overkill for market validation phase

#### 3. PostHog

**What it is:** Open-source product analytics platform.

| Aspect | Details |
|--------|---------|
| **Pricing** | Free tier (1M events/mo), then usage-based |
| **Cookie-free** | Can be configured cookie-free |
| **UTM tracking** | Yes |
| **Custom events** | Yes |
| **Session recording** | Yes (requires cookies/consent) |
| **Self-hosting** | Available |

**Pros:**
- Generous free tier
- Session recordings (see user behavior)
- Feature flags, A/B testing built-in
- Self-hosting option

**Cons:**
- More complex setup than Plausible
- Session recordings require consent
- Heavier SDK
- More features than needed for market validation

#### 4. Fathom Analytics

**What it is:** Privacy-focused alternative similar to Plausible.

| Aspect | Details |
|--------|---------|
| **Pricing** | $14/mo (100K pageviews) |
| **Cookie-free** | Yes |
| **UTM tracking** | Yes |
| **Custom events** | Yes |
| **GDPR compliant** | Yes |

**Pros:**
- Similar benefits to Plausible
- Slightly more generous pageview limits

**Cons:**
- More expensive than Plausible
- Less popular (smaller community)

#### 5. Umami (Self-Hosted)

**What it is:** Open-source, self-hosted analytics.

| Aspect | Details |
|--------|---------|
| **Pricing** | Free (self-hosted) or $9/mo (cloud) |
| **Cookie-free** | Yes |
| **UTM tracking** | Yes |
| **Custom events** | Yes |

**Pros:**
- Free if self-hosted
- Full data ownership
- Privacy-focused

**Cons:**
- Self-hosting requires maintenance
- Less polished than Plausible

### Recommendation: Plausible Analytics

**Decision: Use Plausible Analytics (cloud-hosted)**

**Rationale:**

1. **No cookie banner needed** — Better UX, no consent fatigue, cleaner landing page
2. **Built for this use case** — Marketing funnel tracking without complexity
3. **UTM attribution out of the box** — See "100 visitors from TikTok, 2 conversions"
4. **Custom events for goals** — Track CTA clicks, checkout starts, email submits
5. **$9/mo is acceptable** — Less than cost of one wasted ad click
6. **5-minute integration** — Single script tag, no SDK, no build changes
7. **Aligns with brand values** — Unhooked is about breaking addictions; tracking users with invasive analytics is incongruent

**When to reconsider:**
- If we need session recordings → Add PostHog for that specific use case
- If we need Google Ads automated bidding → May need GA4 for conversion import
- If traffic exceeds 100K/mo → Evaluate self-hosting Plausible

---

## Implementation Specification

### Phase 1: Basic Analytics Setup

#### 1.1 Plausible Site Configuration

**Create two sites in Plausible Dashboard:**

| Site | Domain | Purpose |
|------|--------|---------|
| Production | `getunhooked.app` | Real user traffic, ad campaign data |
| Staging | `staging.getunhooked.app` | Preview deployments, QA testing |

**Why separate sites:**
- Production data stays clean — no test traffic pollution
- Can freely test analytics on staging without affecting metrics
- Easy to identify environment in Plausible dashboard
- No filtering needed — data is isolated by design

**Plausible pricing note:** Both sites count toward your pageview limit, but staging traffic should be minimal.

#### 1.2 Environment-Aware Script Loading

Dynamically load the correct Plausible site based on deployment environment.

**File:** `nuxt.config.ts`

```typescript
// Determine analytics domain based on environment
function getAnalyticsDomain(): string | null {
  // Local development: no analytics
  if (process.env.NODE_ENV !== 'production') {
    return null
  }

  // Vercel provides VERCEL_ENV: 'production' | 'preview' | 'development'
  const vercelEnv = process.env.VERCEL_ENV

  if (vercelEnv === 'production') {
    return 'getunhooked.app'
  } else if (vercelEnv === 'preview') {
    return 'staging.getunhooked.app'
  }

  // Fallback for non-Vercel production builds
  return 'getunhooked.app'
}

const analyticsDomain = getAnalyticsDomain()

export default defineNuxtConfig({
  app: {
    head: {
      script: analyticsDomain
        ? [
            {
              src: 'https://plausible.io/js/script.js',
              defer: true,
              'data-domain': analyticsDomain,
            },
          ]
        : [],
    },
  },
})
```

**Environment behavior:**

| Environment | `VERCEL_ENV` | Analytics Domain | Result |
|-------------|--------------|------------------|--------|
| Local dev | N/A | `null` | No analytics |
| Vercel Preview | `preview` | `staging.getunhooked.app` | Staging site |
| Vercel Production | `production` | `getunhooked.app` | Production site |

**Why this approach:**
- Plausible auto-tracks pageviews, no additional code needed
- UTM params automatically captured
- Referrer automatically tracked
- Script is <1KB, async, won't block rendering
- Environment detection happens at build time (no runtime overhead)

### Phase 2: Custom Event Tracking

#### 2.1 Analytics Composable

Create a composable to abstract analytics calls and make them testable.

**File:** `composables/useAnalytics.ts`

```typescript
/**
 * Analytics composable for tracking custom events
 *
 * Uses Plausible Analytics for privacy-respecting tracking.
 * Events are only sent in production (Plausible script won't exist in dev).
 */

declare global {
  interface Window {
    plausible?: (
      eventName: string,
      options?: { props?: Record<string, string | number | boolean>; revenue?: { currency: string; amount: number } }
    ) => void
  }
}

// Event names as constants for type safety
export const ANALYTICS_EVENTS = {
  // CTA interactions
  CTA_CLICK_HERO: 'CTA Click: Hero',
  CTA_CLICK_PRICING: 'CTA Click: Pricing',
  CTA_CLICK_FINAL: 'CTA Click: Final CTA',
  CTA_CLICK_STICKY: 'CTA Click: Sticky',

  // Conversion events
  CHECKOUT_STARTED: 'Checkout Started',
  EMAIL_SUBMITTED: 'Email Submitted',

  // Engagement events
  SCROLL_25: 'Scroll: 25%',
  SCROLL_50: 'Scroll: 50%',
  SCROLL_75: 'Scroll: 75%',
  SCROLL_100: 'Scroll: 100%',

  // Section visibility
  SECTION_VIEWED: 'Section Viewed',
} as const

export type AnalyticsEvent = typeof ANALYTICS_EVENTS[keyof typeof ANALYTICS_EVENTS]

export function useAnalytics() {
  /**
   * Track a custom event
   *
   * @param eventName - The name of the event (use ANALYTICS_EVENTS constants)
   * @param props - Optional properties to attach to the event
   */
  function trackEvent(
    eventName: AnalyticsEvent | string,
    props?: Record<string, string | number | boolean>
  ) {
    if (typeof window !== 'undefined' && window.plausible) {
      window.plausible(eventName, props ? { props } : undefined)
    }
  }

  /**
   * Track a revenue-generating event (e.g., successful purchase)
   *
   * @param eventName - The name of the event
   * @param amount - Revenue amount in dollars
   * @param props - Optional additional properties
   */
  function trackRevenue(
    eventName: string,
    amount: number,
    props?: Record<string, string | number | boolean>
  ) {
    if (typeof window !== 'undefined' && window.plausible) {
      window.plausible(eventName, {
        revenue: { currency: 'USD', amount },
        ...(props ? { props } : {}),
      })
    }
  }

  return {
    trackEvent,
    trackRevenue,
    ANALYTICS_EVENTS,
  }
}
```

#### 2.2 CTA Click Tracking

Update `CheckoutButton.vue` to track CTA clicks:

**File:** `components/landing/CheckoutButton.vue` (changes)

```vue
<script setup lang="ts">
const { trackEvent, ANALYTICS_EVENTS } = useAnalytics()

const props = defineProps<{
  block?: boolean
  large?: boolean
  full?: boolean
  trackingLocation?: 'hero' | 'pricing' | 'final' | 'sticky'  // NEW
}>()

function handleClick() {
  // Track the CTA click with location context
  if (props.trackingLocation) {
    const eventMap = {
      hero: ANALYTICS_EVENTS.CTA_CLICK_HERO,
      pricing: ANALYTICS_EVENTS.CTA_CLICK_PRICING,
      final: ANALYTICS_EVENTS.CTA_CLICK_FINAL,
      sticky: ANALYTICS_EVENTS.CTA_CLICK_STICKY,
    }
    trackEvent(eventMap[props.trackingLocation])
  }

  if (!appEnabled.value) {
    scrollToWaitlist()
  } else {
    handleCheckout()
  }
}
</script>
```

Update each usage to pass `trackingLocation`:

```vue
<!-- LandingHero.vue -->
<CheckoutButton trackingLocation="hero">

<!-- LandingPricing.vue -->
<CheckoutButton trackingLocation="pricing" :full="true">

<!-- LandingFinalCTA.vue -->
<CheckoutButton trackingLocation="final" :large="true">

<!-- LandingStickyCTA.vue -->
<CheckoutButton trackingLocation="sticky" :block="true">
```

#### 2.3 Checkout Started Tracking

Track when user is about to be redirected to Stripe:

**File:** `components/landing/CheckoutButton.vue` (in handleCheckout function)

```typescript
async function handleCheckout() {
  isLoading.value = true
  error.value = null

  // Track checkout initiation
  trackEvent(ANALYTICS_EVENTS.CHECKOUT_STARTED)

  try {
    const { url } = await $fetch('/api/checkout/create-session', {
      method: 'POST',
      body: utmParams.value,
    })
    // ... rest of function
  }
}
```

#### 2.4 Email Submission Tracking

Track successful email submissions:

**File:** `components/landing/LandingFinalCTA.vue` (changes)

```vue
<script setup lang="ts">
const { trackEvent, ANALYTICS_EVENTS } = useAnalytics()

async function handleEmailSubmit(e: Event) {
  // ... existing validation and submission code ...

  try {
    await $fetch('/api/subscribe', { /* ... */ })

    submitState.value = 'success'
    email.value = ''

    // Track successful email capture
    trackEvent(ANALYTICS_EVENTS.EMAIL_SUBMITTED, {
      source: appEnabled.value ? 'nurture' : 'waitlist',
    })
  } catch (err) {
    // ... error handling
  }
}
</script>
```

#### 2.5 Scroll Depth Tracking

Track how far users scroll down the landing page:

**File:** `pages/index.vue` (add to onMounted)

```typescript
const { trackEvent, ANALYTICS_EVENTS } = useAnalytics()

onMounted(() => {
  // ... existing intersection observer code ...

  // Scroll depth tracking
  const scrollThresholds = [25, 50, 75, 100]
  const scrollTracked = new Set<number>()

  function handleScroll() {
    const scrollPercent = Math.round(
      (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
    )

    scrollThresholds.forEach((threshold) => {
      if (scrollPercent >= threshold && !scrollTracked.has(threshold)) {
        scrollTracked.add(threshold)
        trackEvent(`Scroll: ${threshold}%` as any)
      }
    })
  }

  window.addEventListener('scroll', handleScroll, { passive: true })
})
```

#### 2.6 Section View Tracking

Track which landing page sections users actually see. This gives aggregate data like "72% of visitors saw the Pricing section" and lets you correlate section views with conversions.

**Sections to track (based on current landing page structure):**

| Section | Component | What It Tells Us |
|---------|-----------|------------------|
| Hero | `LandingHero` | Baseline (everyone sees this) |
| Moment | `LandingMoment` | Engagement hook effectiveness |
| Reason | `LandingReason` | Problem resonance |
| How It Works | `LandingHowItWorks` | Solution interest |
| Who For | `LandingWhoFor` | Target audience fit |
| Founder | `LandingFounder` | Trust/credibility interest |
| Pricing | `LandingPricing` | Purchase intent signal |
| FAQ | `LandingFAQ` | Objection handling interest |
| Final CTA | `LandingFinalCTA` | Bottom-of-funnel reach |

**File:** `composables/useAnalytics.ts` (add section tracking)

```typescript
// Add to ANALYTICS_EVENTS
export const ANALYTICS_EVENTS = {
  // ... existing events ...

  // Section visibility (aggregate tracking)
  SECTION_HERO: 'Section Viewed: Hero',
  SECTION_MOMENT: 'Section Viewed: Moment',
  SECTION_REASON: 'Section Viewed: Reason',
  SECTION_HOW_IT_WORKS: 'Section Viewed: How It Works',
  SECTION_WHO_FOR: 'Section Viewed: Who For',
  SECTION_FOUNDER: 'Section Viewed: Founder',
  SECTION_PRICING: 'Section Viewed: Pricing',
  SECTION_FAQ: 'Section Viewed: FAQ',
  SECTION_FINAL_CTA: 'Section Viewed: Final CTA',
} as const
```

**File:** `composables/useSectionTracking.ts` (new file)

```typescript
/**
 * Track which landing page sections are viewed
 *
 * Uses IntersectionObserver to fire analytics events when sections
 * become visible. Each section is only tracked once per page load.
 */

export function useSectionTracking() {
  const { trackEvent, ANALYTICS_EVENTS } = useAnalytics()

  // Track which sections have been recorded (prevent duplicates)
  const trackedSections = new Set<string>()

  // Map section IDs to analytics events
  const sectionEventMap: Record<string, string> = {
    'hero': ANALYTICS_EVENTS.SECTION_HERO,
    'moment': ANALYTICS_EVENTS.SECTION_MOMENT,
    'reason': ANALYTICS_EVENTS.SECTION_REASON,
    'how-it-works': ANALYTICS_EVENTS.SECTION_HOW_IT_WORKS,
    'who-for': ANALYTICS_EVENTS.SECTION_WHO_FOR,
    'founder': ANALYTICS_EVENTS.SECTION_FOUNDER,
    'pricing': ANALYTICS_EVENTS.SECTION_PRICING,
    'faq': ANALYTICS_EVENTS.SECTION_FAQ,
    'final-cta': ANALYTICS_EVENTS.SECTION_FINAL_CTA,
  }

  function initSectionTracking() {
    if (typeof window === 'undefined') return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const sectionId = entry.target.id
            const eventName = sectionEventMap[sectionId]

            // Only track each section once per page load
            if (eventName && !trackedSections.has(sectionId)) {
              trackedSections.add(sectionId)
              trackEvent(eventName)
            }
          }
        })
      },
      {
        // Fire when 30% of section is visible
        threshold: 0.3,
        // Small margin to trigger slightly before section is fully in view
        rootMargin: '0px 0px -10% 0px',
      }
    )

    // Observe all trackable sections
    Object.keys(sectionEventMap).forEach((sectionId) => {
      const element = document.getElementById(sectionId)
      if (element) {
        observer.observe(element)
      }
    })

    // Return cleanup function
    return () => observer.disconnect()
  }

  return {
    initSectionTracking,
  }
}
```

**File:** `pages/index.vue` (add section tracking initialization)

```typescript
const { initSectionTracking } = useSectionTracking()

onMounted(() => {
  // ... existing code ...

  // Initialize section view tracking
  const cleanupSectionTracking = initSectionTracking()

  // Cleanup on unmount (for SPA navigation)
  onUnmounted(() => {
    cleanupSectionTracking?.()
  })
})
```

**Required: Add IDs to section components**

Each landing section needs an `id` attribute for the observer to track:

```vue
<!-- LandingHero.vue -->
<section id="hero" class="section hero">

<!-- LandingMoment.vue -->
<section id="moment" class="section">

<!-- LandingReason.vue -->
<section id="reason" class="section">

<!-- LandingHowItWorks.vue -->
<section id="how-it-works" class="section">

<!-- LandingWhoFor.vue -->
<section id="who-for" class="section">

<!-- LandingFounder.vue -->
<section id="founder" class="section">

<!-- LandingPricing.vue -->
<section id="pricing" class="section pricing-section">

<!-- LandingFAQ.vue -->
<section id="faq" class="section">

<!-- LandingFinalCTA.vue -->
<section id="final-cta" class="section final-cta-section">
```

**What you'll see in Plausible:**

After implementation, you can answer questions like:
- "What % of visitors saw the Pricing section?" → Filter by `Section Viewed: Pricing`
- "Do TikTok users scroll further than Google users?" → Compare section views by UTM source
- "Which section has the biggest drop-off?" → Compare sequential section view rates
- "Do people who see the Founder section convert more?" → Correlate section views with conversions

**Example aggregate insights:**

| Section | View Rate | Insight |
|---------|-----------|---------|
| Hero | 100% | Baseline |
| Moment | 78% | 22% bounce before scrolling |
| How It Works | 65% | Good engagement through value prop |
| Pricing | 45% | Less than half reach pricing |
| Final CTA | 38% | Strong correlation with conversions |

### Phase 3: Goal Configuration in Plausible

After deploying the code, configure goals in the Plausible dashboard:

1. **Sign in to Plausible** → Site Settings → Goals
2. **Add Custom Event Goals:**
   - `CTA Click: Hero`
   - `CTA Click: Pricing`
   - `CTA Click: Final CTA`
   - `CTA Click: Sticky`
   - `Checkout Started`
   - `Email Submitted`
3. **Enable Revenue Tracking** (optional, for purchase confirmation page)

### Phase 4: Success Page Revenue Tracking (Optional Enhancement)

Track successful purchases with revenue data on the success page:

**File:** `pages/checkout/success.vue` (add to onMounted)

```typescript
const { trackRevenue } = useAnalytics()

onMounted(async () => {
  // ... existing session fetch code ...

  try {
    const data = await $fetch('/api/checkout/session', {
      params: { session_id: sessionId }
    })

    customerEmail.value = data.email || ''
    customerName.value = data.name || ''
    loading.value = false

    // Track successful purchase with revenue
    if (data.status === 'paid' && data.amount) {
      trackRevenue('Purchase Complete', data.amount / 100)  // Convert cents to dollars
    }
  } catch (err) {
    // ... error handling
  }
})
```

---

## Plausible Dashboard Configuration

### Goals to Create

#### Conversion Goals

| Goal Name | Type | Purpose |
|-----------|------|---------|
| `CTA Click: Hero` | Custom Event | Track hero section engagement |
| `CTA Click: Pricing` | Custom Event | Track pricing section intent |
| `CTA Click: Final CTA` | Custom Event | Track bottom-funnel intent |
| `CTA Click: Sticky` | Custom Event | Track sticky CTA effectiveness |
| `Checkout Started` | Custom Event | Track checkout funnel entry |
| `Email Submitted` | Custom Event | Track email capture rate |
| `Purchase Complete` | Custom Event (Revenue) | Track conversions with $ value |

#### Section View Goals

| Goal Name | Type | Purpose |
|-----------|------|---------|
| `Section Viewed: Hero` | Custom Event | Baseline (everyone sees this) |
| `Section Viewed: Moment` | Custom Event | Engagement hook effectiveness |
| `Section Viewed: Reason` | Custom Event | Problem resonance |
| `Section Viewed: How It Works` | Custom Event | Solution interest |
| `Section Viewed: Who For` | Custom Event | Target audience fit |
| `Section Viewed: Founder` | Custom Event | Trust/credibility interest |
| `Section Viewed: Pricing` | Custom Event | Purchase intent signal |
| `Section Viewed: FAQ` | Custom Event | Objection handling interest |
| `Section Viewed: Final CTA` | Custom Event | Bottom-of-funnel reach |

**Note:** Section view goals let you build funnel reports in Plausible, showing drop-off rates between sections.

### Filters to Set Up

Create saved filters for common analysis:
- **TikTok Traffic:** `utm_source=tiktok`
- **Google Ads Traffic:** `utm_source=google`
- **Instagram Traffic:** `utm_source=instagram`
- **Organic Traffic:** (no UTM params)

---

## Environment Variables

### New Variables Required

```bash
# No new env vars needed for Plausible
# The script loads directly from Plausible CDN
# Domain is hardcoded in script tag (getunhooked.app)
```

### Optional: Plausible API Access

If you want programmatic access to analytics data later:

```bash
# Optional - for API access
PLAUSIBLE_API_KEY=your-api-key
PLAUSIBLE_SITE_ID=getunhooked.app
```

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `nuxt.config.ts` | Modify | Add Plausible script with environment detection |
| `composables/useAnalytics.ts` | Create | Analytics abstraction layer |
| `composables/useSectionTracking.ts` | Create | Section visibility tracking |
| `components/landing/CheckoutButton.vue` | Modify | Add CTA tracking |
| `components/landing/LandingFinalCTA.vue` | Modify | Add email submit tracking |
| `components/landing/LandingHero.vue` | Modify | Add section ID |
| `components/landing/LandingMoment.vue` | Modify | Add section ID |
| `components/landing/LandingReason.vue` | Modify | Add section ID |
| `components/landing/LandingHowItWorks.vue` | Modify | Add section ID |
| `components/landing/LandingWhoFor.vue` | Modify | Add section ID |
| `components/landing/LandingFounder.vue` | Modify | Add section ID |
| `components/landing/LandingPricing.vue` | Modify | Add section ID (may already have) |
| `components/landing/LandingFAQ.vue` | Modify | Add section ID |
| `components/landing/LandingFinalCTA.vue` | Modify | Add section ID |
| `pages/index.vue` | Modify | Add scroll depth + section tracking |
| `pages/checkout/success.vue` | Modify | Add revenue tracking |

---

## Testing Plan

### Local Development

1. Analytics events won't fire in development (no Plausible script)
2. Add console.log fallback to `useAnalytics.ts` for dev debugging:

```typescript
function trackEvent(eventName: string, props?: Record<string, any>) {
  if (typeof window !== 'undefined' && window.plausible) {
    window.plausible(eventName, props ? { props } : undefined)
  } else if (process.env.NODE_ENV === 'development') {
    console.log('[Analytics]', eventName, props)
  }
}
```

### Staging/Preview Deployment

1. Deploy to Vercel preview
2. Open Plausible dashboard in real-time view
3. Visit preview URL
4. Verify pageview appears
5. Click each CTA → verify events appear
6. Submit email → verify event appears
7. Start checkout → verify event appears

### Production Verification

1. Deploy to production
2. Wait 5 minutes for propagation
3. Visit landing page
4. Check Plausible real-time dashboard
5. Verify UTM params are captured (visit with `?utm_source=test`)

---

## Cost Analysis

| Item | Cost | Notes |
|------|------|-------|
| Plausible (10K pageviews) | $9/mo | Sufficient for early validation |
| Plausible (100K pageviews) | $19/mo | Scale when traffic grows |
| Google Ads (comparison) | ~$2-5/click | One saved click pays for a month of analytics |

**ROI Argument:** If analytics helps us stop one underperforming ad campaign 1 week earlier, it saves more than a year of Plausible costs.

---

## Future Enhancements (Post-MVP)

### Session Recordings (if needed)

If we need to see *how* users interact (not just *what* they click):
- Add PostHog for session recordings
- Requires cookie consent banner
- Only enable for specific debugging sessions

### A/B Testing

Plausible supports basic A/B testing via custom properties:
```typescript
trackEvent('Page View', { variant: 'control' })
trackEvent('Page View', { variant: 'headline-v2' })
```

Then filter conversions by variant in dashboard.

### Google Ads Integration

If we need to import conversions to Google Ads for automated bidding:
- Option 1: Use Plausible's Google Ads integration (beta)
- Option 2: Add GA4 alongside Plausible (requires cookie banner)
- Option 3: Server-side conversion tracking via Google Ads API

---

## Acceptance Criteria

### Analytics Setup
- [ ] Plausible production site created (`getunhooked.app`)
- [ ] Plausible staging site created (`staging.getunhooked.app`)
- [ ] Plausible script loads with correct domain on production
- [ ] Plausible script loads with staging domain on Vercel preview
- [ ] Pageviews appear in correct Plausible dashboard
- [ ] UTM params captured and visible in Sources report

### Event Tracking
- [ ] CTA clicks fire events with location context
- [ ] Checkout started events fire when user clicks "I'm ready"
- [ ] Email submitted events fire on successful form submission
- [ ] Scroll depth events fire at 25%, 50%, 75%, 100%

### Section View Tracking
- [ ] All 9 landing page sections have IDs
- [ ] Section view events fire when sections become 30% visible
- [ ] Each section only fires once per page load (no duplicates)
- [ ] Section views visible in Plausible dashboard

### Dashboard Configuration
- [ ] All CTA click goals created in Plausible
- [ ] All section view goals created in Plausible
- [ ] Revenue tracking enabled for purchases
- [ ] Saved filters for each ad channel

### Environment Separation
- [ ] Local development: No analytics loaded
- [ ] Vercel preview: Analytics go to staging site
- [ ] Vercel production: Analytics go to production site
- [ ] Staging data does NOT appear in production dashboard

---

## Security & Privacy Notes

### What Plausible Tracks
- Pageviews (URL, referrer, UTM params)
- Country (from IP, then IP discarded)
- Device type, browser, OS (from user agent)
- Custom events we explicitly send

### What Plausible Does NOT Track
- IP addresses (hashed and discarded)
- Cookies (none set)
- Personal information
- Cross-site tracking
- Fingerprinting

### Compliance
- **GDPR:** Compliant — no personal data processed
- **CCPA:** Compliant — no sale of personal information
- **Cookie laws:** No cookie banner needed

---

## Related Documents

- `unhooked-stripe-market-validation-spec-v1.1.md` — UTM tracking and checkout flow
- `unhooked-seo-strategy-v1.0.md` — Landing page optimization
- `unhooked-mailing-list-spec-v1_2.md` — Email capture implementation

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.1 | 2026-01-18 | Added environment separation (production vs staging sites); added section view tracking for aggregate engagement analysis; expanded acceptance criteria |
| 1.0 | 2026-01-18 | Initial specification: evaluated analytics options (Plausible, GA4, PostHog, Fathom, Umami); recommended Plausible for privacy-respecting funnel tracking; defined custom events for CTA clicks, checkout, email capture, scroll depth |
