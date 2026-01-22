# Unhooked: Stripe Integration for Market Validation

**Version:** 1.1
**Created:** 2026-01-17
**Updated:** 2026-01-17
**Status:** Ready for Implementation
**Document Type:** Technical Specification

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.1 | 2026-01-17 | Interview-driven refinements: localStorage with 7-day TTL for UTM tracking; fail webhook on DB errors for data consistency; UPSERT for idempotency; remove emoji from email subject; update launch date to April 2026; show inline checkout errors; use SVG checkmark on success page; pass 'v1' for landing_page_variant baseline; add SEND_EMAILS feature flag; use constants for email sender; break landing page into section components; use latest Stripe API version; implementation to be phased across multiple PRs |
| 1.0 | 2026-01-17 | Initial specification covering landing page migration and Stripe integration for market validation; includes business context and product decision rationale |

---

## Business Context

### What We're Validating

Unhooked is a nicotine cessation product that helps users quit by dismantling psychological "illusions" rather than relying on willpower. The approach is based on Allen Carr's methodology, delivered through personalized voice and text conversations over 10-14 days.

**The core hypothesis:** People will pay $199 for a program that promises to permanently remove their desire for nicotine — without willpower, substitutes, or lifelong resistance.

**Validation goal:** Achieve 5-10 paying customers ("founding members") before building the full product. This validates willingness-to-pay at a meaningful price point, not just interest.

**Why $199:**
- Anchored to monthly nicotine spending (less than a month of vaping)
- High enough to signal serious intent from buyers
- One-time pricing reinforces the "permanent solution" promise (subscriptions imply ongoing dependence)

### Target Customer

Successful professionals who have built careers and lives they're proud of — but nicotine feels incongruent with who they've become. They:
- Have quit before, relapsed, or currently struggle
- Are sick of willpower-based cycles
- Have the resources ($199 is not a barrier)
- Prefer dynamic, personalized experiences over static materials like books

### What "Founding Member" Means

Founding members are pre-paying for a product that doesn't fully exist yet. In exchange, they get:
- First access when the program launches (April 2026)
- Founding member pricing (price may increase at public launch)
- Direct line to the founder
- Influence on product development

**Transparency commitment:** The landing page and checkout flow are honest about timing. This is a pre-order, not immediate access. This protects against chargebacks and builds trust.

### Success Criteria

| Metric | Target | What It Tells Us |
|--------|--------|------------------|
| Conversions | 5-10 | Validates willingness to pay $199 |
| Refund requests | <20% | Validates messaging accuracy |
| Email reply rate | Any replies | Validates engagement, provides qualitative feedback |

If we hit 5-10 conversions, it's a green light to build the full product. If we can't get 10 motivated people to pre-pay, the mainstream market definitely isn't there.

---

## Product Decisions & Rationale

### Why Stripe Checkout Sessions (Not Payment Links)

We evaluated three options:

| Option | Pros | Cons |
|--------|------|------|
| **Payment Links** | Zero code, 2-minute setup | No UTM tracking, limited customization |
| **Checkout Sessions API** | UTM passthrough, metadata storage, programmatic control | Requires server-side code |
| **Embedded Checkout** | Seamless on-site experience | More complex, less trust signal at $199 |

**Decision: Checkout Sessions API with Stripe-hosted page**

**Rationale:**
1. **UTM tracking is essential** — We're running ads on Google, TikTok, and Instagram. We need to know which channel drives conversions, not just clicks. Payment Links don't support passing custom metadata.

2. **Trust at $199** — A Stripe-branded checkout page signals security for a meaningful purchase. People are more willing to enter payment info on a recognizable Stripe URL than an embedded form on a new site.

3. **Future flexibility** — Checkout Sessions let us add discount codes, A/B test pricing, or adjust the flow without rebuilding infrastructure.

4. **Acceptable tradeoff** — Users leave the site momentarily to complete payment. For a considered purchase (not impulse buying), this is fine — people expect a payment flow.

### Why Email-First Post-Purchase (Not Account Creation)

**Decision: Send welcome email, don't create app accounts yet**

**Rationale:**
1. **The app isn't ready** — Creating accounts implies access. We'd have to build a "coming soon" holding state, which is more work and potentially confusing.

2. **Email is sufficient** — For founding members, we just need to know who paid and how to reach them. Email does both.

3. **Personal touch matters** — Founding members should feel special. A personal email from the founder ("I'll be in touch within 24 hours") is more meaningful than a generic account creation flow.

4. **Cleaner refund path** — If someone requests a refund, there's no account to clean up.

5. **Conversion happens later** — When the app launches, we'll send "Your access is ready" emails with account creation links. The `founding_members` table has a `converted_to_user_id` field for this.

### Why Store in Database (Not Just Stripe)

We considered using Stripe as the sole source of truth and skipping database storage.

**Decision: Store founding members in Supabase**

**Rationale:**
1. **Easy querying** — "Show me all founding members from TikTok" is a simple SQL query vs. paginating through Stripe API.

2. **Custom fields** — We can add fields Stripe doesn't support (landing page variant, internal notes, conversion status).

3. **Future linking** — When app launches, we need to connect founding member records to user accounts. Having them in our database makes this straightforward.

4. **Minimal overhead** — It's one `INSERT` in the webhook handler. The cost is negligible.

5. **Redundancy** — If we ever need to audit or reconcile, having our own record helps.

### Why Consolidate Landing Page into Main Repo

The landing page was previously in a separate repo (`ascend-ai/landing-page`), a remnant of an abandoned project.

**Decision: Move landing page into the `unhooked` Nuxt repo**

**Rationale:**
1. **One product, one repo** — Unhooked is one product. Having marketing and app in separate repos creates coordination overhead with no benefit at this stage.

2. **Shared infrastructure** — The Stripe webhook needs to write to Supabase. Having landing page and app in the same repo means shared environment variables, shared database connection, shared deployment.

3. **Solo founder reality** — There's no marketing team that needs to deploy independently. No blog or content strategy requiring a CMS. The "separate repos for marketing and app" pattern solves problems we don't have.

4. **Can always split later** — If we hire a marketing person or the marketing site becomes complex (blog, docs, careers), we can extract it then. Premature separation costs time now for theoretical future benefit.

**URL structure:**
- `getunhooked.app/` → Landing page (public)
- `getunhooked.app/dashboard` → App (protected)

This is the standard early-stage pattern. Companies like Notion and Linear have separate marketing sites now, but they didn't start that way.

### Why Dynamic Success Page

**Decision: Fetch customer details from Stripe and display on success page**

**Rationale:**
1. **Assurance signal** — Showing "Welcome, [Name]. A receipt has been sent to [email]" confirms the transaction worked. It says "we know who you are" — not a fly-by-night operation.

2. **Reduces support requests** — People don't need to wonder "did it work?" or email asking for confirmation.

3. **Professional polish** — Generic "Thanks for your purchase" pages feel cheap. Personalization signals care.

4. **Minimal implementation cost** — One API call to Stripe to retrieve session details.

### Analytics & Attribution Strategy

**Decision: Capture UTM params and pass through to Stripe + database**

**The funnel we need to track:**
```
Ad impression (Google/TikTok/Instagram)
  → Ad click
    → Landing page view (with UTM params)
      → CTA click
        → Checkout started
          → Payment completed ← This is what we're instrumenting
```

**How it works:**
1. User arrives at landing page with UTM params in URL (`?utm_source=tiktok&utm_medium=paid&utm_campaign=jan-launch`)
2. Composable captures UTMs and stores in localStorage with 7-day TTL (persists across tabs/sessions for considered purchases)
3. When checkout button clicked, UTMs passed to checkout session creation
4. Stored in Stripe metadata AND `founding_members` table
5. We can now answer: "Which ad channel is actually converting?"

**Why this matters:**
- Plausible tells us pageviews by source
- Stripe tells us revenue
- Without UTM passthrough, we can't connect them

**What we're deferring:**
- Click tracking on specific CTAs (Plausible goals can do this later)
- A/B testing infrastructure
- Custom analytics dashboards

---

## Overview

This specification covers the integration of Stripe payment processing for Unhooked's market validation phase. The goal is to test willingness-to-pay at $199 for founding member access.

### What We're Building

1. **Landing page migration** — Move existing Vue+Vite landing page into the Nuxt app
2. **Stripe Checkout integration** — Server-side checkout session creation
3. **Webhook handler** — Process successful payments
4. **Success/cancel pages** — Post-payment user experience
5. **Founding members tracking** — Database table + Resend audience
6. **UTM tracking** — Attribution from ad campaigns through to conversion

### Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Checkout type | Stripe-hosted | Trust signal at $199, fastest implementation |
| Data storage | Supabase `founding_members` table | Easy querying, links to future user accounts |
| Email provider | Resend | Already in stack, audience tracking built-in |
| Landing page location | Inside Nuxt app at root (`/`) | Single repo, shared infrastructure |
| App location | `/dashboard` route (protected) | Clear separation, auth middleware |

### Implementation Phases

| Phase | Scope | Status |
|-------|-------|--------|
| Test Mode | Full implementation with Stripe test keys | **Current** |
| Live Mode | Switch to live keys, verify production flow | Scaffolded |

### Implementation Approach

The implementation will be broken into phased PRs for easier review and rollback:

1. **PR 1: Landing Page Migration** — Move and refactor landing page components into Nuxt app
2. **PR 2: Stripe Integration** — Checkout session creation, webhook handler, success/cancel pages
3. **PR 3: Email Integration** — Resend welcome email, audience management

Each PR should be independently deployable and testable.

### Key Technical Decisions (v1.1 Refinements)

These decisions were made during the spec review interview:

| Area | Decision | Rationale |
|------|----------|-----------|
| **UTM Storage** | localStorage with 7-day TTL | Persists attribution across tabs/sessions for considered purchases |
| **Webhook Errors** | Fail on DB insert error | Data consistency is critical; Stripe will retry the webhook |
| **Idempotency** | UPSERT with ON CONFLICT DO NOTHING | Handle webhook retries cleanly without log noise |
| **Email Subject** | No emoji | Cleaner, professional, better deliverability |
| **Launch Date** | April 2026 (specific month) | More concrete than "Spring 2026" |
| **Checkout Errors** | Show inline error message | Users need feedback when something fails |
| **Success Icon** | SVG checkmark | Consistent with design system (no emoji) |
| **A/B Baseline** | Pass 'v1' for landing_page_variant | Establishes baseline for future A/B testing |
| **Email Feature Flag** | SEND_EMAILS env var | Explicit control over email sending in dev |
| **Email Sender** | Use constants in code | Easy to find and update, no env var complexity |
| **Component Structure** | Break landing page into sections | Better maintainability (Hero, ValueProps, FAQ, CTA, etc.) |
| **Component Org** | Only namespace landing/ | Leave existing app components in place |
| **Stripe API Version** | Use latest at implementation | Get newest features and fixes |
| **Cancel Page** | Keep minimal | Single CTA back to home, no email capture |
| **Referrer Tracking** | External only | Avoid noise from internal navigation |
| **Refund Handling** | Manual for now | Low volume, add automation later if needed |
| **Currency** | USD only | Validating US market first |
| **Success Page** | Client-side fetch | Simpler than SSR, loading spinner is acceptable |
| **Session Security** | Accept current exposure | Low risk for MVP, session IDs are unguessable |
| **Receipt Emails** | Use both (Stripe + custom) | Stripe sends receipt, we send personal welcome |
| **Rate Limiting** | Defer for now | Low traffic, manual monitoring |
| **RLS Admin Access** | Defer decision | Keep service-role-only, revisit for admin features |
| **Automated Tests** | Manual testing only | Sufficient for market validation phase |

---

## Part 1: Landing Page Migration

### 1.1 Goal

Move the existing landing page from the legacy `ascend-ai/landing-page` directory into the main `unhooked` Nuxt repo. The landing page will serve as the root route (`/`), with the app accessible at `/dashboard`.

### 1.2 URL Structure (Target State)

```
getunhooked.app/                    → Landing page (public)
getunhooked.app/checkout/success    → Payment success (public)
getunhooked.app/checkout/cancel     → Payment cancelled (public)
getunhooked.app/login               → Auth page (public)
getunhooked.app/dashboard           → App entry (protected)
getunhooked.app/dashboard/*         → App routes (protected)
```

### 1.3 Migration Steps

> **Note for Claude Code:** These steps require access to both the source (`ascend-ai/landing-page`) and destination (`unhooked`) repositories. Adapt based on actual file structures found.

#### Step 1: Audit Current State

Before migrating, document:

**In the Nuxt app (`unhooked`):**
- [ ] List all existing routes in `pages/`
- [ ] Identify any route that would conflict with landing page (especially `index.vue`)
- [ ] Check existing middleware in `middleware/`
- [ ] Review `nuxt.config.ts` for relevant configuration

**In the landing page (`ascend-ai/landing-page`):**
- [ ] List all components in `src/components/`
- [ ] Review `src/App.vue` structure
- [ ] Check `src/style.css` for global styles
- [ ] Note any assets in `public/` or `src/assets/`
- [ ] Review `vite.config.ts` for any special configuration

#### Step 2: Prepare Nuxt App Structure

Create the following directory structure (if not exists):

```
unhooked/
├── components/
│   ├── landing/                    # NEW: Landing page components
│   │   ├── LandingHero.vue         # Hero section with main CTA
│   │   ├── LandingValueProps.vue   # Value propositions / benefits
│   │   ├── LandingHowItWorks.vue   # How the program works
│   │   ├── LandingFAQ.vue          # Frequently asked questions
│   │   ├── LandingCTA.vue          # Final call-to-action section
│   │   ├── CheckoutButton.vue      # Reusable checkout button
│   │   └── [other sections]        # Break large App.vue into logical sections
│   └── [existing app components]   # Leave existing components as-is (no app/ subfolder)
├── pages/
│   ├── index.vue                   # Landing page (composes landing/* components)
│   ├── checkout/
│   │   ├── success.vue             # NEW
│   │   └── cancel.vue              # NEW
│   ├── login.vue                   # Existing (verify)
│   └── dashboard/
│       └── index.vue               # App entry (may need to move existing)
└── assets/
    └── landing/                    # NEW: Landing page assets
```

**Component Organization Decision:** Landing page components go in `components/landing/`. Existing app components remain in their current locations (no reorganization into `components/app/` subfolder).

#### Step 3: Migrate Components

For each component in `ascend-ai/landing-page/src/components/`:

1. Copy to `unhooked/components/landing/`
2. Update import paths
3. Convert any Vite-specific syntax to Nuxt conventions:
   - `import.meta.env.VITE_*` → `useRuntimeConfig().public.*`
   - Verify `<script setup>` syntax works (should be compatible)

#### Step 4: Migrate Root Page

Convert `ascend-ai/landing-page/src/App.vue` to `unhooked/pages/index.vue`:

```vue
<!-- unhooked/pages/index.vue -->
<template>
  <!-- Content from App.vue -->
  <!-- Update component imports to use landing/ prefix -->
</template>

<script setup lang="ts">
// Update imports
import HeroSection from '~/components/landing/HeroSection.vue'
// ... etc

// Page meta for SEO
useHead({
  title: 'Unhooked — Freedom from Nicotine',
  meta: [
    { name: 'description', content: 'Permanently remove your desire for nicotine — without willpower, substitutes, or lifelong resistance.' }
  ]
})
</script>
```

#### Step 5: Migrate Styles

Options (choose based on current setup):

**Option A: Merge into existing Tailwind config**
- If landing page uses Tailwind, merge any custom config into `tailwind.config.js`
- Move any custom CSS utilities

**Option B: Scoped styles**
- Keep landing page styles scoped to components
- Use `<style scoped>` in Vue components

**Option C: Separate CSS file**
- Create `assets/css/landing.css`
- Import in `nuxt.config.ts` or landing page components

#### Step 6: Migrate Assets

1. Copy images/icons from `ascend-ai/landing-page/public/` to `unhooked/public/`
2. Copy any assets from `src/assets/` to `unhooked/assets/landing/`
3. Update asset references in components

#### Step 7: Update Route Protection

Ensure auth middleware only protects app routes, not landing/checkout:

```typescript
// middleware/auth.ts (or similar)
export default defineNuxtRouteMiddleware((to) => {
  // Only protect dashboard routes
  if (!to.path.startsWith('/dashboard')) {
    return
  }
  
  // Existing auth logic...
  const user = useSupabaseUser()
  if (!user.value) {
    return navigateTo('/login')
  }
})
```

#### Step 8: Verify & Clean Up

- [ ] Run `npm run dev` and verify landing page renders at `/`
- [ ] Verify `/dashboard` still works and is protected
- [ ] Verify `/login` works
- [ ] Check for console errors
- [ ] Test on mobile viewport
- [ ] Deploy to preview and verify

#### Step 9: Update DNS/Deployment (If Needed)

If the landing page was previously deployed separately:
- Update Vercel project to point to Nuxt app
- Verify domain configuration
- Remove old deployment

---

## Part 2: Stripe Integration

### 2.1 Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Landing Page   │────▶│ Stripe Checkout │────▶│  Success Page   │
│   (index.vue)   │     │ (Stripe-hosted) │     │  (success.vue)  │
└─────────────────┘     └────────┬────────┘     └─────────────────┘
                                 │
                                 │ webhook (async)
                                 ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    Supabase     │◀────│  Webhook Handler│────▶│     Resend      │
│founding_members │     │ /api/webhooks/  │     │ Welcome Email   │
└─────────────────┘     │     stripe      │     └─────────────────┘
                        └─────────────────┘
```

### 2.2 Database Schema

#### `founding_members` Table

```sql
-- Create founding_members table
CREATE TABLE public.founding_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Stripe data
  stripe_session_id TEXT UNIQUE NOT NULL,
  stripe_customer_id TEXT,
  stripe_payment_intent_id TEXT,
  
  -- Customer info (from Stripe)
  email TEXT NOT NULL,
  name TEXT,
  
  -- Payment details
  amount_paid INTEGER NOT NULL,  -- in cents
  currency TEXT DEFAULT 'usd',
  paid_at TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Attribution (UTM tracking)
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_term TEXT,
  utm_content TEXT,
  
  -- Conversion tracking
  landing_page_variant TEXT,      -- For future A/B testing
  referrer TEXT,                  -- Original referrer URL
  
  -- Future: link to user account when app launches
  converted_to_user_id UUID REFERENCES auth.users(id),
  converted_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Email status
  welcome_email_sent BOOLEAN DEFAULT FALSE,
  welcome_email_sent_at TIMESTAMP WITH TIME ZONE
);

-- Index for common queries
CREATE INDEX idx_founding_members_email ON public.founding_members(email);
CREATE INDEX idx_founding_members_paid_at ON public.founding_members(paid_at);
CREATE INDEX idx_founding_members_utm_source ON public.founding_members(utm_source);

-- RLS policies
ALTER TABLE public.founding_members ENABLE ROW LEVEL SECURITY;

-- Only service role can access (webhook uses service role)
-- No user-facing access needed for now
CREATE POLICY "Service role full access"
  ON public.founding_members
  FOR ALL
  USING (auth.role() = 'service_role');
```

### 2.3 Environment Variables

Add to `.env` (and Vercel project settings):

```bash
# Stripe - Test Mode
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID=price_...

# Resend
RESEND_API_KEY=re_...
RESEND_AUDIENCE_ID=aud_...          # Optional: for contact list
SEND_EMAILS=true                    # Set to 'false' to disable email sending in dev

# App
NUXT_PUBLIC_APP_URL=http://localhost:3000  # Update for production
```

Add to `nuxt.config.ts`:

```typescript
export default defineNuxtConfig({
  runtimeConfig: {
    // Server-side only (not exposed to client)
    stripeSecretKey: process.env.STRIPE_SECRET_KEY,
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    stripePriceId: process.env.STRIPE_PRICE_ID,
    resendApiKey: process.env.RESEND_API_KEY,
    resendAudienceId: process.env.RESEND_AUDIENCE_ID,
    sendEmails: process.env.SEND_EMAILS || 'true',  // Feature flag for email sending

    // Existing keys...

    public: {
      appUrl: process.env.NUXT_PUBLIC_APP_URL || 'http://localhost:3000',
      stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
    }
  },
})
```

### 2.4 Dependencies

```bash
npm install stripe resend
```

### 2.5 API Endpoints

#### Create Checkout Session

**File:** `server/api/checkout/create-session.post.ts`

```typescript
import Stripe from 'stripe'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()

  // Use latest Stripe API version at implementation time
  const stripe = new Stripe(config.stripeSecretKey)

  // Get UTM params from request body
  const body = await readBody(event)
  const {
    utm_source,
    utm_medium,
    utm_campaign,
    utm_term,
    utm_content,
    referrer
  } = body || {}

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price: config.stripePriceId,
          quantity: 1,
        },
      ],
      success_url: `${config.public.appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${config.public.appUrl}/checkout/cancel`,

      // Collect customer info
      customer_creation: 'always',

      // Custom message on checkout
      custom_text: {
        submit: {
          message: "You'll receive a welcome email with next steps within 24 hours.",
        },
      },

      // Store attribution data for analytics
      metadata: {
        product: 'founding_member',
        landing_page_variant: 'v1',  // Baseline for future A/B testing
        utm_source: utm_source || '',
        utm_medium: utm_medium || '',
        utm_campaign: utm_campaign || '',
        utm_term: utm_term || '',
        utm_content: utm_content || '',
        referrer: referrer || '',
      },
    })

    return { url: session.url }
  } catch (error: any) {
    console.error('Stripe checkout error:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to create checkout session',
    })
  }
})
```

#### Stripe Webhook Handler

**File:** `server/api/webhooks/stripe.post.ts`

```typescript
import Stripe from 'stripe'
import { Resend } from 'resend'
import { serverSupabaseServiceRole } from '#supabase/server'

// Email sender configuration (easy to find and update)
const EMAIL_SENDER_NAME = 'Kevin from Unhooked'
const EMAIL_SENDER_ADDRESS = 'kevin@getunhooked.app'
const EMAIL_REPLY_TO = 'kevin@getunhooked.app'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()

  const stripe = new Stripe(config.stripeSecretKey)

  const resend = new Resend(config.resendApiKey)

  // Get raw body for signature verification
  const body = await readRawBody(event)
  const signature = getHeader(event, 'stripe-signature')

  if (!body || !signature) {
    throw createError({ statusCode: 400, message: 'Missing body or signature' })
  }

  // Verify webhook signature
  let stripeEvent: Stripe.Event
  try {
    stripeEvent = stripe.webhooks.constructEvent(
      body,
      signature,
      config.stripeWebhookSecret
    )
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message)
    throw createError({ statusCode: 400, message: 'Invalid signature' })
  }

  // Handle checkout.session.completed event
  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object as Stripe.Checkout.Session

    if (session.payment_status === 'paid') {
      const supabase = serverSupabaseServiceRole(event)

      const email = session.customer_details?.email
      const name = session.customer_details?.name
      const metadata = session.metadata || {}

      if (!email) {
        console.error('No email in checkout session:', session.id)
        return { received: true }
      }

      // 1. Upsert into founding_members table (idempotent for webhook retries)
      const { error: dbError } = await supabase
        .from('founding_members')
        .upsert({
          stripe_session_id: session.id,
          stripe_customer_id: session.customer as string,
          stripe_payment_intent_id: session.payment_intent as string,
          email: email,
          name: name,
          amount_paid: session.amount_total,
          currency: session.currency,
          paid_at: new Date(session.created * 1000).toISOString(),
          utm_source: metadata.utm_source || null,
          utm_medium: metadata.utm_medium || null,
          utm_campaign: metadata.utm_campaign || null,
          utm_term: metadata.utm_term || null,
          utm_content: metadata.utm_content || null,
          referrer: metadata.referrer || null,
          landing_page_variant: metadata.landing_page_variant || 'v1',
        }, {
          onConflict: 'stripe_session_id',
          ignoreDuplicates: true  // Don't update if already exists
        })

      if (dbError) {
        console.error('Failed to insert founding member:', dbError)
        // Fail the webhook so Stripe retries - data consistency is critical
        throw createError({ statusCode: 500, message: 'Database insert failed' })
      }

      // 2. Add to Resend audience (if configured)
      if (config.resendAudienceId) {
        try {
          await resend.contacts.create({
            email: email,
            firstName: name?.split(' ')[0] || '',
            lastName: name?.split(' ').slice(1).join(' ') || '',
            audienceId: config.resendAudienceId,
          })
        } catch (err) {
          console.error('Failed to add to Resend audience:', err)
        }
      }

      // 3. Send welcome email (controlled by feature flag)
      const shouldSendEmails = config.sendEmails !== 'false'
      const firstName = name?.split(' ')[0] || 'there'

      if (shouldSendEmails) {
        try {
          await resend.emails.send({
            from: `${EMAIL_SENDER_NAME} <${EMAIL_SENDER_ADDRESS}>`,
            to: email,
            replyTo: EMAIL_REPLY_TO,
            subject: "Welcome to Unhooked — You're In",
            html: getWelcomeEmailHtml(firstName),
          })

          // Update email sent status
          await supabase
            .from('founding_members')
            .update({
              welcome_email_sent: true,
              welcome_email_sent_at: new Date().toISOString(),
            })
            .eq('stripe_session_id', session.id)

        } catch (err) {
          console.error('Failed to send welcome email:', err)
        }
      } else {
        console.log('Email sending disabled (SEND_EMAILS=false). Would have sent welcome email to:', email)
      }
    }
  }

  return { received: true }
})

// Email template - replace with actual copy
function getWelcomeEmailHtml(firstName: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  
  <h1 style="color: #0D9488; margin-bottom: 24px;">Welcome to Unhooked, ${firstName}.</h1>
  
  <p>You're officially a founding member. Thank you for believing in this before it even exists.</p>
  
  <p>Here's what happens next:</p>
  
  <ul style="padding-left: 20px;">
    <li><strong>Your access is being prepared.</strong> You'll be among the first to experience Unhooked when it launches in April 2026.</li>
    <li><strong>I'll be in touch personally.</strong> As a founding member, you have a direct line to me. Reply to this email anytime.</li>
    <li><strong>Your feedback will shape the product.</strong> I'll reach out before launch to learn more about your experience with nicotine.</li>
  </ul>
  
  <p>In the meantime, if you have questions or just want to say hi, hit reply. I read every message.</p>
  
  <p style="margin-top: 32px;">
    — Kevin<br>
    <span style="color: #666; font-size: 14px;">Founder, Unhooked</span>
  </p>
  
  <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;">
  
  <p style="font-size: 12px; color: #999;">
    You're receiving this because you purchased founding member access to Unhooked.
    If you have questions about your purchase, reply to this email.
  </p>
  
</body>
</html>
  `.trim()
}
```

### 2.6 Checkout Pages

#### Success Page

**File:** `pages/checkout/success.vue`

```vue
<template>
  <div class="min-h-screen bg-brand-dark flex items-center justify-center p-4">
    <div class="max-w-lg w-full bg-white/10 backdrop-blur-sm rounded-2xl p-8 text-center">
      
      <!-- Loading state -->
      <div v-if="loading" class="py-8">
        <div class="animate-spin w-8 h-8 border-2 border-brand-teal border-t-transparent rounded-full mx-auto"></div>
        <p class="text-white/60 mt-4">Confirming your purchase...</p>
      </div>
      
      <!-- Error state -->
      <div v-else-if="error" class="py-8">
        <div class="text-4xl mb-4">⚠️</div>
        <h1 class="text-2xl font-bold text-white mb-2">Something went wrong</h1>
        <p class="text-white/60 mb-6">{{ error }}</p>
        <NuxtLink to="/" class="text-brand-teal hover:underline">
          Return to home
        </NuxtLink>
      </div>
      
      <!-- Success state -->
      <div v-else class="py-4">
        <!-- SVG checkmark icon (brand-consistent, no emoji) -->
        <div class="w-16 h-16 mx-auto mb-6 rounded-full bg-brand-teal/20 flex items-center justify-center">
          <svg class="w-8 h-8 text-brand-teal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 class="text-3xl font-bold text-white mb-2">You're in.</h1>
        
        <p class="text-xl text-white/80 mb-8">
          Welcome to the founding member group<span v-if="customerName">, {{ customerFirstName }}</span>.
        </p>
        
        <div class="bg-white/5 rounded-xl p-6 text-left mb-8">
          <h2 class="text-white font-semibold mb-4">What happens next:</h2>
          
          <ol class="space-y-3 text-white/70">
            <li class="flex gap-3">
              <span class="text-brand-teal font-bold">1.</span>
              <span>A receipt has been sent to <strong class="text-white">{{ customerEmail }}</strong></span>
            </li>
            <li class="flex gap-3">
              <span class="text-brand-teal font-bold">2.</span>
              <span>You'll get a personal welcome email from me within 24 hours</span>
            </li>
            <li class="flex gap-3">
              <span class="text-brand-teal font-bold">3.</span>
              <span>When Unhooked launches (April 2026), you'll be first to get access</span>
            </li>
          </ol>
        </div>
        
        <div class="text-white/60 text-sm mb-8">
          <p>Questions? Reach me directly at</p>
          <a href="mailto:kevin@getunhooked.app" class="text-brand-teal hover:underline">
            kevin@getunhooked.app
          </a>
        </div>
        
        <p class="text-white/40 italic mb-6">— Kevin</p>
        
        <NuxtLink 
          to="/" 
          class="inline-block text-white/60 hover:text-white transition-colors"
        >
          ← Back to home
        </NuxtLink>
      </div>
      
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: false,  // No app layout, standalone page
})

useHead({
  title: "You're In — Unhooked",
})

const route = useRoute()
const loading = ref(true)
const error = ref<string | null>(null)
const customerEmail = ref('')
const customerName = ref('')

const customerFirstName = computed(() => {
  return customerName.value?.split(' ')[0] || ''
})

onMounted(async () => {
  const sessionId = route.query.session_id as string
  
  if (!sessionId) {
    error.value = 'No session ID found'
    loading.value = false
    return
  }
  
  try {
    // Fetch session details from our API
    const data = await $fetch('/api/checkout/session', {
      params: { session_id: sessionId }
    })
    
    customerEmail.value = data.email || ''
    customerName.value = data.name || ''
    loading.value = false
    
  } catch (err: any) {
    console.error('Failed to fetch session:', err)
    error.value = 'Unable to confirm your purchase. Please check your email for confirmation.'
    loading.value = false
  }
})
</script>
```

#### Session Retrieval Endpoint (for success page)

**File:** `server/api/checkout/session.get.ts`

```typescript
import Stripe from 'stripe'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const query = getQuery(event)
  const sessionId = query.session_id as string

  if (!sessionId) {
    throw createError({ statusCode: 400, message: 'Missing session_id' })
  }

  // Use latest Stripe API version at implementation time
  const stripe = new Stripe(config.stripeSecretKey)

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId)

    // Only return safe, non-sensitive data
    return {
      email: session.customer_details?.email || null,
      name: session.customer_details?.name || null,
      amount: session.amount_total,
      currency: session.currency,
      status: session.payment_status,
    }
  } catch (err: any) {
    console.error('Failed to retrieve session:', err)
    throw createError({ statusCode: 404, message: 'Session not found' })
  }
})
```

#### Cancel Page

**File:** `pages/checkout/cancel.vue`

```vue
<template>
  <div class="min-h-screen bg-brand-dark flex items-center justify-center p-4">
    <div class="max-w-lg w-full bg-white/10 backdrop-blur-sm rounded-2xl p-8 text-center">
      
      <h1 class="text-2xl font-bold text-white mb-4">No problem.</h1>
      
      <p class="text-white/70 mb-8">
        When you're ready to quit for good, we'll be here.
      </p>
      
      <NuxtLink 
        to="/"
        class="inline-block bg-brand-teal hover:bg-brand-teal/90 text-white px-8 py-3 rounded-full font-semibold transition-colors"
      >
        Back to Home
      </NuxtLink>
      
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: false,
})

useHead({
  title: 'Checkout Cancelled — Unhooked',
})
</script>
```

### 2.7 Landing Page Integration

#### UTM Capture Composable

**File:** `composables/useUtmTracking.ts`

```typescript
const UTM_STORAGE_KEY = 'utm_params'
const UTM_TTL_DAYS = 7

interface StoredUtmParams {
  params: {
    utm_source: string
    utm_medium: string
    utm_campaign: string
    utm_term: string
    utm_content: string
    referrer: string
  }
  expiresAt: number
}

export function useUtmTracking() {
  const route = useRoute()

  // UTM params to track
  const utmParams = ref({
    utm_source: '',
    utm_medium: '',
    utm_campaign: '',
    utm_term: '',
    utm_content: '',
    referrer: '',
  })

  // Capture UTMs on page load
  onMounted(() => {
    // Get from URL query params
    const urlUtms = {
      utm_source: (route.query.utm_source as string) || '',
      utm_medium: (route.query.utm_medium as string) || '',
      utm_campaign: (route.query.utm_campaign as string) || '',
      utm_term: (route.query.utm_term as string) || '',
      utm_content: (route.query.utm_content as string) || '',
      referrer: '',
    }

    // Capture external referrer only
    if (document.referrer && !document.referrer.includes(window.location.hostname)) {
      urlUtms.referrer = document.referrer
    }

    // If we have new UTM params from URL, store them with TTL
    if (Object.values(urlUtms).some(v => v)) {
      utmParams.value = urlUtms
      const stored: StoredUtmParams = {
        params: urlUtms,
        expiresAt: Date.now() + (UTM_TTL_DAYS * 24 * 60 * 60 * 1000)
      }
      localStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(stored))
    } else {
      // Try to recover from localStorage if not expired
      try {
        const storedJson = localStorage.getItem(UTM_STORAGE_KEY)
        if (storedJson) {
          const stored: StoredUtmParams = JSON.parse(storedJson)
          if (stored.expiresAt > Date.now()) {
            utmParams.value = stored.params
          } else {
            // Expired, clean up
            localStorage.removeItem(UTM_STORAGE_KEY)
          }
        }
      } catch {
        // Invalid stored data, ignore
      }
    }
  })

  return {
    utmParams
  }
}
```

#### Checkout Button Component

**File:** `components/landing/CheckoutButton.vue`

```vue
<template>
  <div class="inline-block">
    <button
      @click="handleCheckout"
      :disabled="isLoading"
      class="bg-brand-orange hover:bg-brand-orange/90 text-white px-8 py-4 rounded-full font-semibold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <span v-if="isLoading" class="flex items-center gap-2">
        <span class="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></span>
        Loading...
      </span>
      <span v-else>
        <slot>Become a founding member — $199</slot>
      </span>
    </button>
    <!-- Inline error display -->
    <p v-if="error" class="text-red-400 text-sm mt-2 text-center">
      {{ error }}
    </p>
  </div>
</template>

<script setup lang="ts">
const { utmParams } = useUtmTracking()

const isLoading = ref(false)
const error = ref<string | null>(null)

async function handleCheckout() {
  isLoading.value = true
  error.value = null

  try {
    const { url } = await $fetch('/api/checkout/create-session', {
      method: 'POST',
      body: utmParams.value,
    })

    if (url) {
      window.location.href = url
    } else {
      throw new Error('No checkout URL returned')
    }
  } catch (err: any) {
    console.error('Checkout error:', err)
    error.value = 'Something went wrong. Please try again.'
    isLoading.value = false
  }
}
</script>
```

---

## Part 3: Stripe Configuration (Manual Steps)

These steps are performed in the Stripe Dashboard, not in code.

### 3.1 Test Mode Setup

#### Step A: Create/Access Stripe Account

1. Go to https://dashboard.stripe.com
2. Sign up or log in
3. Ensure you're in **Test Mode** (toggle in top-right)

#### Step B: Create Product

1. Go to **Products** → **Add Product**
2. Configure:
   - **Name:** Unhooked Founding Member Access
   - **Description:** Lifetime access to the Unhooked program. Be among the first to experience our voice-guided approach to quitting nicotine — permanently.
   - **Image:** Upload Unhooked logo (optional for test mode)
3. Add Pricing:
   - **Pricing model:** One-time
   - **Amount:** $199.00 USD
4. Save and copy the **Price ID** (starts with `price_test_`)

#### Step C: Get API Keys

1. Go to **Developers** → **API keys**
2. Copy:
   - **Publishable key** → `STRIPE_PUBLISHABLE_KEY`
   - **Secret key** → `STRIPE_SECRET_KEY`

#### Step D: Configure Webhook

1. Go to **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Configure:
   - **Endpoint URL:** `https://[your-domain]/api/webhooks/stripe`
   - **Events to send:** Select `checkout.session.completed`
4. After creating, click the endpoint and copy **Signing secret** → `STRIPE_WEBHOOK_SECRET`

> **For local testing:** Use Stripe CLI instead (see Testing section)

---

## Part 4: Resend Configuration (Manual Steps)

### 4.1 Domain Verification

1. Go to https://resend.com/domains
2. Add domain: `getunhooked.app`
3. Add the DNS records shown to your domain registrar
4. Wait for verification (usually a few minutes)

### 4.2 API Key

1. Go to **API Keys** → **Create API Key**
2. Name: `unhooked-market-validation`
3. Permission: **Full access**
4. Copy → `RESEND_API_KEY`

### 4.3 Audience (Optional but Recommended)

1. Go to **Audiences** → **Create Audience**
2. Name: `Founding Members`
3. Copy the **Audience ID** → `RESEND_AUDIENCE_ID`

---

## Part 5: Testing

### 5.1 Local Testing with Stripe CLI

#### Install Stripe CLI

```bash
# macOS
brew install stripe/stripe-cli/stripe

# Or download from https://stripe.com/docs/stripe-cli
```

#### Login and Forward Webhooks

```bash
stripe login
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

The CLI will output a webhook signing secret — use this for local testing:
```
STRIPE_WEBHOOK_SECRET=whsec_xxx  # From stripe listen output
```

#### Test the Full Flow

1. Start dev server: `npm run dev`
2. Go to http://localhost:3000
3. Click the checkout button
4. Use test card: `4242 4242 4242 4242`
   - Any future expiry date
   - Any 3-digit CVC
   - Any billing postal code
5. Complete checkout
6. Verify:
   - [ ] Redirected to success page
   - [ ] Success page shows your name and email
   - [ ] Terminal shows webhook received
   - [ ] Check Supabase for `founding_members` record
   - [ ] Check email (Resend sends to real emails even in test mode)

### 5.2 Test Card Numbers

| Card Number | Behavior |
|-------------|----------|
| 4242 4242 4242 4242 | Succeeds |
| 4000 0000 0000 0002 | Declined |
| 4000 0000 0000 3220 | Requires 3D Secure |

### 5.3 Test UTM Tracking

Visit the landing page with UTM params:
```
http://localhost:3000/?utm_source=tiktok&utm_medium=paid&utm_campaign=test
```

Complete checkout and verify:
- [ ] `founding_members` record has UTM fields populated
- [ ] Stripe session metadata contains UTM data

---

## Part 6: Live Mode Transition (Scaffolded)

> **Status:** Do not implement until test mode is verified working.

### 6.1 Pre-Launch Checklist

#### Stripe

- [ ] Complete account verification (identity, bank account)
- [ ] Switch dashboard to **Live Mode**
- [ ] Create Live product and price (copy settings from Test)
- [ ] Update `STRIPE_PRICE_ID` with live price ID
- [ ] Create Live webhook endpoint with production URL
- [ ] Update `STRIPE_WEBHOOK_SECRET` with live signing secret
- [ ] Update `STRIPE_SECRET_KEY` and `STRIPE_PUBLISHABLE_KEY` with live keys

#### Resend

- [ ] Verify `getunhooked.app` domain is verified
- [ ] Test email sends from `kevin@getunhooked.app`

#### Vercel

- [ ] Update all environment variables with live values
- [ ] Deploy

#### Database

- [ ] Run `founding_members` migration on production Supabase (if not already)

### 6.2 Go-Live Verification

- [ ] Make a real $1 test purchase (create a $1 test product temporarily)
- [ ] Verify email delivery
- [ ] Verify database record creation
- [ ] Refund the test purchase

### 6.3 Monitoring

After going live, monitor:
- Stripe Dashboard → Payments (successful vs failed)
- Resend Dashboard → Email delivery rates
- Supabase → `founding_members` table
- Vercel → Function logs for errors

---

## Acceptance Criteria

### Landing Page Migration

- [ ] Landing page renders at `/` (root route)
- [ ] All landing page components migrated and functional
- [ ] Styles render correctly
- [ ] Mobile responsive
- [ ] `/dashboard` routes remain protected
- [ ] `/login` continues to work

### Stripe Integration

- [ ] Checkout button initiates Stripe checkout
- [ ] UTM params passed to checkout session
- [ ] Successful payment redirects to success page
- [ ] Success page displays customer name and email
- [ ] Cancelled payment redirects to cancel page
- [ ] Webhook receives `checkout.session.completed` event
- [ ] `founding_members` record created in Supabase
- [ ] Contact added to Resend audience
- [ ] Welcome email sent

### Analytics

- [ ] UTM params captured from URL
- [ ] UTM params stored in `founding_members` table
- [ ] UTM params visible in Stripe metadata

---

## Security Notes

- Stripe webhook signatures verify requests come from Stripe
- Service role used for database operations (no user auth needed for webhooks)
- Secret keys only on server side (never exposed to client)
- Raw body required for Stripe signature verification
- Success page only displays non-sensitive data (email, name)

---

## Future Enhancements (Post-MVP)

- [ ] A/B test landing page variants (track in `landing_page_variant` field)
- [ ] Discount codes
- [ ] Referral tracking
- [ ] Admin dashboard for viewing founding members
- [ ] Automated follow-up email sequence
- [ ] Convert founding members to users when app launches

---

## Addendum A: App Mode Tri-State (Market Validation Mode)

**Added:** 2026-01-21
**Status:** Ready for Implementation

### Background

The original implementation had a binary `NUXT_PUBLIC_APP_ENABLED` flag:
- `true` = Full app access (checkout + login + dashboard)
- `false` = Waitlist mode (no checkout, no app access)

For market validation, we need an **in-between state** where:
- Stripe checkout **works** (users can pay $199)
- App access is **blocked** (no login, no dashboard, no protected routes)

This allows us to validate willingness-to-pay before the app is ready for users.

### The Three Modes

| Mode | Value | Checkout | App Access | Use Case |
|------|-------|----------|------------|----------|
| **Disabled** | `disabled` | No | No | Pre-launch waitlist collection |
| **Validation** | `validation` | Yes | No | Market validation (current need) |
| **Enabled** | `enabled` | Yes | Yes | Full production launch |

### Environment Variable Change

**Before (binary):**
```bash
# .env
NUXT_PUBLIC_APP_ENABLED=true  # or 'false'
```

**After (tri-state):**
```bash
# .env
NUXT_PUBLIC_APP_MODE=validation  # 'disabled', 'validation', or 'enabled'
```

### Why Tri-State Over Two Flags

We considered using two separate flags (`APP_ENABLED` + `CHECKOUT_ENABLED`) but rejected this because:

1. **Prevents invalid states** — Two flags create 4 combinations, but only 3 are valid. A tri-state makes invalid states impossible.
2. **Self-documenting** — The value clearly indicates the current mode.
3. **Simpler configuration** — One variable to manage in Vercel/local env.
4. **Easier to reason about in code** — `if (mode === 'validation')` is clearer than `if (checkoutEnabled && !appEnabled)`.

### Implementation Changes

#### 1. Environment Variable & Runtime Config

**File:** `.env.example`
```bash
# App mode: 'disabled' (waitlist only), 'validation' (checkout but no app), 'enabled' (full access)
NUXT_PUBLIC_APP_MODE=enabled
```

**File:** `nuxt.config.ts`
```typescript
public: {
  appUrl: process.env.NUXT_PUBLIC_APP_URL || 'http://localhost:3000',
  stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
  // App mode: 'disabled', 'validation', or 'enabled'
  appMode: process.env.NUXT_PUBLIC_APP_MODE || 'enabled',
}
```

#### 2. Computed Helpers (Optional Composable)

**File:** `composables/useAppMode.ts`
```typescript
export function useAppMode() {
  const config = useRuntimeConfig()
  const mode = config.public.appMode as 'disabled' | 'validation' | 'enabled'

  return {
    mode,
    isDisabled: mode === 'disabled',
    isValidation: mode === 'validation',
    isEnabled: mode === 'enabled',
    // Checkout is available in validation + enabled modes
    checkoutEnabled: mode === 'validation' || mode === 'enabled',
    // App access is only available in enabled mode
    appAccessEnabled: mode === 'enabled',
  }
}
```

#### 3. Auth Middleware Update

**File:** `middleware/auth.ts`

```typescript
export default defineNuxtRouteMiddleware((to) => {
  const { appAccessEnabled } = useAppMode()

  // If app access is disabled (validation or disabled mode), redirect all protected routes to landing page
  if (!appAccessEnabled) {
    return navigateTo('/')
  }

  const user = useSupabaseUser()

  // If user is not logged in and trying to access a protected route
  if (!user.value) {
    return navigateTo('/login')
  }
})
```

#### 4. Login Page Update

**File:** `pages/login.vue`

```typescript
// Redirect to landing if app access is disabled
const { appAccessEnabled } = useAppMode()
if (!appAccessEnabled) {
  navigateTo('/')
}
```

#### 5. Landing Page Components Update

Components that check for checkout availability need to use the new helper:

**File:** `components/landing/CheckoutButton.vue`
```typescript
const { checkoutEnabled } = useAppMode()

// If checkout disabled, scroll to waitlist instead
if (!checkoutEnabled) {
  scrollToWaitlist()
  return
}
// Otherwise, initiate Stripe checkout...
```

**File:** `components/landing/LandingHero.vue`, `LandingPricing.vue`, `LandingFinalCTA.vue`
```typescript
const { checkoutEnabled } = useAppMode()

// Use checkoutEnabled instead of appEnabled for conditional rendering
```

### Behavior Matrix

| Route | Disabled Mode | Validation Mode | Enabled Mode |
|-------|---------------|-----------------|--------------|
| `/` (landing) | Waitlist CTA | Checkout CTA | Checkout CTA |
| `/login` | → Redirect to `/` | → Redirect to `/` | Login form |
| `/dashboard` | → Redirect to `/` | → Redirect to `/` | Dashboard |
| `/onboarding` | → Redirect to `/` | → Redirect to `/` | Onboarding |
| `/checkout/success` | Accessible* | Accessible | Accessible |
| `/checkout/cancel` | Accessible* | Accessible | Accessible |

*In disabled mode, users can't reach checkout, so these pages would only be hit directly (harmless).

### Migration Steps

1. **Update `.env.example`** — Replace `NUXT_PUBLIC_APP_ENABLED` with `NUXT_PUBLIC_APP_MODE`
2. **Update `nuxt.config.ts`** — Change runtime config to use new variable
3. **Create `useAppMode` composable** — Centralize mode logic
4. **Update `middleware/auth.ts`** — Use `appAccessEnabled` instead of `appEnabled`
5. **Update `pages/login.vue`** — Use `appAccessEnabled` instead of `appEnabled`
6. **Update landing components** — Use `checkoutEnabled` instead of `appEnabled`
7. **Update Vercel env vars** — Set `NUXT_PUBLIC_APP_MODE=validation` for market validation
8. **Remove old variable** — Delete `NUXT_PUBLIC_APP_ENABLED` references

### Testing Checklist

#### Disabled Mode (`NUXT_PUBLIC_APP_MODE=disabled`)
- [ ] Landing page shows "Coming Soon" / waitlist messaging
- [ ] CTA buttons scroll to waitlist email form
- [ ] `/login` redirects to `/`
- [ ] `/dashboard` redirects to `/`
- [ ] All protected routes redirect to `/`

#### Validation Mode (`NUXT_PUBLIC_APP_MODE=validation`)
- [ ] Landing page shows checkout CTA with $199 pricing
- [ ] Checkout button initiates Stripe checkout
- [ ] Successful payment shows success page
- [ ] Welcome email is sent
- [ ] `founding_members` record is created
- [ ] `/login` redirects to `/`
- [ ] `/dashboard` redirects to `/`
- [ ] All protected routes redirect to `/`

#### Enabled Mode (`NUXT_PUBLIC_APP_MODE=enabled`)
- [ ] Landing page shows checkout CTA
- [ ] Checkout works
- [ ] `/login` shows login form
- [ ] `/dashboard` is accessible after auth
- [ ] All protected routes work normally

### Rollout Plan

1. **Development** — Implement changes, test all three modes locally
2. **Staging** — Deploy with `APP_MODE=validation`, test checkout flow
3. **Production** — Set `APP_MODE=validation` when ready for market validation
4. **Post-Validation** — Switch to `APP_MODE=enabled` when app is ready for users

---

## Related Documents

- `unhooked-landing-page-spec-v3.4.md` — Landing page copy and structure
- `unhooked-authentication-spec.md` — Auth setup for protected routes
- `Unhooked_Founding_Document.md` — Product vision and validation strategy
