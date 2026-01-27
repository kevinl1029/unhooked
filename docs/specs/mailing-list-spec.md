# Unhooked: Mailing List Specification

**Version:** 1.2
**Last Updated:** 2026-01-17
**Status:** Ready for Implementation
**Document Type:** Technical Specification

---

## Overview

Connect the existing email capture form on the landing page to a backend that stores leads in Supabase. This enables collection of undecided visitors for future marketing and launch communications.

**Goal:** Visitors who enter their email on getunhooked.app are stored in a database and can receive follow-up emails.

**Prerequisites:**
- Landing page in the Nuxt app (same repo as main app)
- Supabase project configured (from Authentication Specification)
- Resend account for email delivery with domain (getunhooked.app) properly configured
- Existing `useUtmTracking` composable for UTM parameter capture

---

## What We're Building

1. **Supabase table** — Store email addresses with metadata
2. **API endpoint** — Receive email submissions from landing page
3. **Landing page integration** — Connect existing form to new endpoint
4. **Welcome email** — Send immediate confirmation via Resend (placeholder content for MVP)
5. **Admin visibility** — View leads in Supabase dashboard

---

## Related Documents

- **Email Content Specification** (TBD) — Defines welcome email content, exploring one illusion in depth and introducing the product. Goal is nurturing undecided visitors toward becoming customers.
- **unhooked-stripe-market-validation-spec-v1.1.md** — Stripe integration spec with UTM tracking patterns we'll reuse

---

## Architecture

The mailing list feature lives entirely within the main Unhooked Nuxt app. No CORS configuration is needed as the landing page and API are same-origin.

**Data flow:**
```
Landing Page Form (LandingFinalCTA.vue)
    → POST to /api/subscribe
    → Nuxt API endpoint
    → Supabase (store lead with UPSERT)
    → Resend (send welcome email + add to audience)
    → Return success/error to form
    → Form transforms to success state
```

---

## Database Schema

### Table: `mailing_list`

Run this SQL in Supabase SQL Editor:

```sql
-- Create mailing list table
CREATE TABLE public.mailing_list (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  source TEXT DEFAULT 'landing_page',
  subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  unsubscribed_at TIMESTAMP WITH TIME ZONE,
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Email health tracking (scaffolded for future bounce webhook)
  email_status TEXT DEFAULT 'active' CHECK (email_status IN ('active', 'bounced', 'complained')),
  bounce_type TEXT,  -- 'hard' or 'soft'
  status_updated_at TIMESTAMP WITH TIME ZONE
);

-- Create index for email lookups
CREATE INDEX idx_mailing_list_email ON public.mailing_list(email);

-- Enable Row Level Security
ALTER TABLE public.mailing_list ENABLE ROW LEVEL SECURITY;

-- Policy: Only service role can access (API endpoint uses service key)
-- No public access needed - this is admin/API only
CREATE POLICY "Service role full access"
  ON public.mailing_list
  FOR ALL
  USING (auth.role() = 'service_role');
```

**Fields explained:**
- `email` — The subscriber's email (unique constraint prevents duplicates)
- `source` — Where they signed up: 'landing_page_waitlist' (appEnabled=false) or 'landing_page_nurture' (appEnabled=true)
- `subscribed_at` — When they joined
- `unsubscribed_at` — Set when they unsubscribe (NULL = active)
- `ip_address` — For spam prevention and analytics (US-focused, storing is acceptable)
- `user_agent` — Browser info for analytics
- `metadata` — Flexible JSONB for UTM params, referrer, and future fields
- `email_status` — Tracks deliverability ('active', 'bounced', 'complained') - scaffolded for future
- `bounce_type` — If bounced, whether 'hard' (permanent) or 'soft' (temporary) - scaffolded for future
- `status_updated_at` — When email_status last changed - scaffolded for future

---

## Environment Variables

The following should already be configured from the Stripe integration:

```bash
# Already configured - verify these exist
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # Used by @nuxtjs/supabase module
RESEND_API_KEY=your-resend-api-key
RESEND_AUDIENCE_ID=your-audience-id
SEND_EMAILS=true  # Feature flag for email sending
```

**Note:** The `SUPABASE_SERVICE_ROLE_KEY` is automatically used by `serverSupabaseServiceRole()` from `#supabase/server`. No additional nuxt.config.ts changes needed.

---

## API Endpoint

### POST `/api/subscribe`

Create `server/api/subscribe.post.ts`:

```typescript
import { Resend } from 'resend'
import { serverSupabaseServiceRole } from '#supabase/server'

// Email sender configuration (consistent with founding member emails)
const EMAIL_SENDER_NAME = 'Kevin from Unhooked'
const EMAIL_SENDER_ADDRESS = 'kevin@getunhooked.app'
const EMAIL_REPLY_TO = 'kevin@getunhooked.app'

// Simple in-memory rate limiting (resets on server restart)
// Acceptable for MVP - Vercel's serverless architecture means this won't be 100% reliable
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT = 3 // requests per window
const RATE_WINDOW = 60 * 60 * 1000 // 1 hour in ms

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const record = rateLimitMap.get(ip)

  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_WINDOW })
    return false
  }

  if (record.count >= RATE_LIMIT) {
    return true
  }

  record.count++
  return false
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()

  // Get client info early for rate limiting
  const headers = getHeaders(event)
  const ipAddress = headers['x-forwarded-for']?.split(',')[0]?.trim() ||
                    headers['x-real-ip'] ||
                    'unknown'

  // Check rate limit
  if (isRateLimited(ipAddress)) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Too many attempts. Try again later.'
    })
  }

  // Initialize Supabase with service role key (bypasses RLS)
  const supabase = serverSupabaseServiceRole(event)

  // Initialize Resend
  const resend = new Resend(config.resendApiKey)

  // Get request body
  const body = await readBody(event)
  const { email, source, utm_source, utm_medium, utm_campaign, utm_term, utm_content, referrer } = body

  // Validate email
  if (!email || !isValidEmail(email)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Please enter a valid email address'
    })
  }

  const normalizedEmail = email.toLowerCase().trim()
  const userAgent = headers['user-agent'] || 'unknown'

  // Build metadata with UTM params
  const metadata: Record<string, string> = {}
  if (utm_source) metadata.utm_source = utm_source
  if (utm_medium) metadata.utm_medium = utm_medium
  if (utm_campaign) metadata.utm_campaign = utm_campaign
  if (utm_term) metadata.utm_term = utm_term
  if (utm_content) metadata.utm_content = utm_content
  if (referrer) metadata.referrer = referrer

  try {
    // Check if already subscribed
    const { data: existing } = await supabase
      .from('mailing_list')
      .select('id, unsubscribed_at, email_status')
      .eq('email', normalizedEmail)
      .single()

    if (existing) {
      // Already exists - check status
      if (!existing.unsubscribed_at && existing.email_status === 'active') {
        // Active subscriber - return friendly message, no new email
        return {
          success: true,
          alreadySubscribed: true,
          message: "You're already on the list"
        }
      }

      // Re-subscribing (was unsubscribed or bounced) - update record
      const { error: updateError } = await supabase
        .from('mailing_list')
        .update({
          subscribed_at: new Date().toISOString(),
          unsubscribed_at: null,
          email_status: 'active',
          bounce_type: null,
          status_updated_at: new Date().toISOString(),
          ip_address: ipAddress,
          user_agent: userAgent,
          source: source || 'landing_page_nurture',
          metadata
        })
        .eq('id', existing.id)

      if (updateError) {
        console.error('Database update error:', updateError)
        throw createError({
          statusCode: 500,
          statusMessage: 'Something went wrong. Please try again.'
        })
      }

      // Send welcome email for re-subscribers (same email as new subscribers)
      await sendWelcomeEmailAndAddToAudience(resend, config, normalizedEmail)

      return {
        success: true,
        alreadySubscribed: false,
        message: 'Check your inbox'
      }
    }

    // New subscriber - UPSERT to handle race conditions (double-click, network retry)
    const { error: insertError } = await supabase
      .from('mailing_list')
      .upsert({
        email: normalizedEmail,
        source: source || 'landing_page_nurture',
        ip_address: ipAddress,
        user_agent: userAgent,
        metadata
      }, {
        onConflict: 'email',
        ignoreDuplicates: true
      })

    if (insertError) {
      console.error('Database insert error:', insertError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Something went wrong. Please try again.'
      })
    }

    // Send welcome email and add to Resend audience
    await sendWelcomeEmailAndAddToAudience(resend, config, normalizedEmail)

    return {
      success: true,
      alreadySubscribed: false,
      message: 'Check your inbox'
    }

  } catch (error: any) {
    // Re-throw if already a createError
    if (error.statusCode) throw error

    console.error('Subscription error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Something went wrong. Please try again.'
    })
  }
})

// Email validation helper
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Send welcome email and add to Resend audience
async function sendWelcomeEmailAndAddToAudience(
  resend: Resend,
  config: any,
  email: string
): Promise<void> {
  const shouldSendEmails = config.sendEmails !== 'false'

  // Add to Resend audience (same audience as founding members)
  if (config.resendAudienceId) {
    try {
      await resend.contacts.create({
        email: email,
        audienceId: config.resendAudienceId,
      })
    } catch (err) {
      console.error('Failed to add to Resend audience:', err)
      // Don't fail the request - contact might already exist
    }
  }

  // Send welcome email
  if (shouldSendEmails) {
    try {
      await resend.emails.send({
        from: `${EMAIL_SENDER_NAME} <${EMAIL_SENDER_ADDRESS}>`,
        to: email,
        replyTo: EMAIL_REPLY_TO,
        subject: '[PLACEHOLDER] Welcome to Unhooked',  // Subject TBD - will be updated with final copy
        html: getWelcomeEmailHtml()
      })
    } catch (emailError) {
      // Log but don't fail - subscription is still saved
      console.error('Failed to send welcome email:', emailError)
    }
  } else {
    console.log('Email sending disabled (SEND_EMAILS=false). Would have sent welcome email to:', email)
  }
}

// Welcome email content - PLACEHOLDER
// See Email Content Specification (TBD) for final copy
function getWelcomeEmailHtml(): string {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
      <p style="font-size: 18px; line-height: 1.6; color: #333;">
        [Welcome email content - see Email Content Specification]
      </p>

      <p style="font-size: 18px; line-height: 1.6; color: #333;">
        — Kevin
      </p>

      <hr style="border: none; border-top: 1px solid #eee; margin: 40px 0;">

      <p style="font-size: 14px; color: #666;">
        <a href="https://getunhooked.app" style="color: #0891b2;">getunhooked.app</a>
      </p>

      <p style="font-size: 12px; color: #999;">
        You're receiving this because you signed up at getunhooked.app.<br>
        Reply to this email if you'd like to unsubscribe.
      </p>
    </div>
  `
}
```

---

## Landing Page Integration

### Current Component Location

The email form exists in `components/landing/LandingFinalCTA.vue`. It currently has a TODO comment and just logs + alerts.

### Updated Implementation

Update `components/landing/LandingFinalCTA.vue`:

```vue
<script setup lang="ts">
import CheckoutButton from './CheckoutButton.vue'

const config = useRuntimeConfig()
const appEnabled = computed(() => config.public.appEnabled)

const { utmParams } = useUtmTracking()

const email = ref('')
const isSubmitting = ref(false)
const submitState = ref<'idle' | 'success' | 'error'>('idle')
const errorMessage = ref('')

async function handleEmailSubmit(e: Event) {
  e.preventDefault()

  if (!email.value.trim() || isSubmitting.value) return

  isSubmitting.value = true
  submitState.value = 'idle'
  errorMessage.value = ''

  try {
    const response = await $fetch('/api/subscribe', {
      method: 'POST',
      body: {
        email: email.value.trim(),
        source: appEnabled.value ? 'landing_page_nurture' : 'landing_page_waitlist',
        ...utmParams.value
      }
    })

    submitState.value = 'success'
    email.value = ''

  } catch (err: any) {
    submitState.value = 'error'
    // Use specific error messages from API, or fallback
    errorMessage.value = err.data?.statusMessage || 'Something went wrong. Please try again.'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <section class="section final-cta-section fade-in">
    <div class="container content-container">
      <!-- Path A: Ready Now (or waitlist if app disabled) -->
      <div v-if="appEnabled" class="final-cta-primary">
        <h2 class="final-cta-headline">Ready to become someone who doesn't want it anymore?</h2>
        <CheckoutButton :large="true">
          Become a founding member — $199
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </CheckoutButton>
        <p class="final-cta-subtext">30-day guarantee · Founding member pricing until launch</p>
      </div>

      <!-- Waitlist/Nurture Section -->
      <div class="final-cta-secondary">
        <h3 v-if="appEnabled" class="email-headline">Not ready yet?</h3>
        <h2 v-else class="final-cta-headline">Be the first to know when we launch</h2>
        <p class="email-body">
          {{ appEnabled
            ? "Get one email that might change how you see nicotine. No spam. Just a taste of what we do."
            : "Join the waitlist for early access and founding member pricing."
          }}
        </p>

        <!-- Success State - Form transforms to success message -->
        <div v-if="submitState === 'success'" class="email-success">
          <div class="success-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <path d="M5 13l4 4L19 7"/>
            </svg>
          </div>
          <p class="success-message">Check your inbox</p>
        </div>

        <!-- Form State -->
        <form v-else class="email-form" @submit="handleEmailSubmit">
          <input
            type="email"
            v-model="email"
            placeholder="Your email"
            class="email-input"
            :disabled="isSubmitting"
            required
          />
          <button
            type="submit"
            class="btn btn-secondary"
            :disabled="isSubmitting"
          >
            <span v-if="isSubmitting">Sending...</span>
            <span v-else>{{ appEnabled ? 'Send it to me' : 'Join the Waitlist' }}</span>
          </button>
        </form>

        <!-- Error Message -->
        <p v-if="submitState === 'error'" class="email-error">
          {{ errorMessage }}
        </p>
      </div>
    </div>
  </section>
</template>

<style>
/* Add to existing styles or main.css */
.email-success {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 24px;
}

.success-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(16, 185, 129, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #10b981;
}

.success-message {
  font-size: 1.125rem;
  font-weight: 600;
  color: #10b981;
}

.email-error {
  color: #ef4444;
  font-size: 0.875rem;
  margin-top: 8px;
  text-align: center;
}
</style>
```

---

## Acceptance Criteria

- [ ] `mailing_list` table created in Supabase with all fields
- [ ] `/api/subscribe` endpoint accepts POST with email and metadata
- [ ] Already-subscribed emails return `alreadySubscribed: true` without sending new email
- [ ] Re-subscribing (previously unsubscribed/bounced) reactivates and sends welcome email
- [ ] Invalid emails return 400 error with user-friendly message
- [ ] Rate limiting blocks >3 requests per IP per hour (429 response with user-friendly message)
- [ ] Welcome email sent via Resend on successful new signup (controlled by SEND_EMAILS flag)
- [ ] Contact added to existing Resend audience
- [ ] Landing page form connects to API and passes UTM params + source
- [ ] Source tracks context: 'landing_page_waitlist' vs 'landing_page_nurture'
- [ ] Form transforms to success state (checkmark + message) on success
- [ ] Error states display specific messages for fixable errors
- [ ] Leads visible in Supabase dashboard
- [ ] Works in both appEnabled modes (waitlist and nurture)

---

## Non-Functional Requirements

### Spam & Abuse Prevention

**Rate Limiting:**
- 3 subscription attempts per IP address per hour
- Returns 429 status code with user-friendly message when exceeded
- In-memory implementation (resets on server restart) is acceptable for MVP
- Note: Vercel's serverless architecture means this won't be 100% reliable across instances

**Email Validation:**
- Basic format validation on client and server
- Rejects obviously invalid formats before hitting database
- User-friendly error message: "Please enter a valid email address"

### Email Deliverability

**Pre-Implementation Checklist:**
- [ ] Verify SPF record configured for getunhooked.app in Resend
- [ ] Verify DKIM record configured for getunhooked.app in Resend
- [ ] Verify DMARC record configured (recommended but optional)
- [ ] Test welcome email delivery to major providers (Gmail, Outlook, Yahoo)
- [ ] Confirm "from" address `kevin@getunhooked.app` is verified in Resend

**Verification steps:**
1. In Resend dashboard, go to Domains
2. Confirm getunhooked.app shows "Verified" status
3. Check that SPF and DKIM show green checkmarks

### Privacy

**Data Storage Approach:**
- IP address and user agent stored for spam prevention and analytics
- US-focused for now, acceptable to store this data
- If expanding to EU, revisit for GDPR compliance

### Bounce Handling (Post-MVP)

**Strategy:** Track bounces in database for list hygiene. Schema includes scaffolded fields (`email_status`, `bounce_type`, `status_updated_at`) for future Resend webhook integration.

**MVP Approach:** Manually check Resend dashboard periodically and update records if needed.

### Unsubscribe Mechanism

**MVP:** Reply-to-unsubscribe approach as noted in email footer.

**Future:** Add `/api/unsubscribe` endpoint with proper unsubscribe link in emails.

---

## Testing

**Approach:** Manual testing only for this feature.

**Test Checklist:**
- [ ] Submit valid email → success state, email received
- [ ] Submit same email again → "You're already on the list" message
- [ ] Submit invalid email format → validation error
- [ ] Submit rapidly (>3 times) → rate limit message
- [ ] Check Supabase for correct record with UTM params
- [ ] Check Resend audience for new contact
- [ ] Test in appEnabled=true mode (nurture)
- [ ] Test in appEnabled=false mode (waitlist)
- [ ] Verify email comes from "Kevin from Unhooked"

---

## Future Enhancements (Post-MVP)

- **Resend webhook for bounces** — Automatically update `email_status` when bounces occur
- **Unsubscribe endpoint** — `/api/unsubscribe` that sets `unsubscribed_at` with proper email link
- **Email sequences** — Multi-email drip campaign for nurturing leads (requires Email Content Specification)
- **Export functionality** — Admin endpoint to export leads as CSV
- **Double opt-in** — Confirmation email before adding to list (for GDPR if expanding to EU)
- **Redis rate limiting** — More robust rate limiting that persists across deploys

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-17 | Initial specification for mailing list feature |
| 1.1 | 2026-01-17 | Added: Related Documents section referencing Email Content Spec; Already-subscribed handling returns friendly message without re-sending email; Rate limiting (3 req/IP/hour); Email health tracking fields (email_status, bounce_type); Non-functional requirements section covering spam prevention, deliverability checklist, bounce handling strategy; Plausible analytics placeholder; Updated unsubscribe to "reply to unsubscribe" approach |
| 1.2 | 2026-01-17 | Interview-driven refinements: Corrected architecture (landing page is in Nuxt repo, not separate Cloudflare site); Removed CORS section (same-origin); Added UTM tracking via existing useUtmTracking composable; Source field tracks context ('landing_page_waitlist' vs 'landing_page_nurture'); Form transforms to success state with SVG checkmark; UPSERT for idempotency; Email sender consistent as 'Kevin from Unhooked'; Subject line placeholder (TBD); Re-subscribers get same email as new subscribers; Simplified indexes (email only); Uses existing RESEND_AUDIENCE_ID; Uses existing SEND_EMAILS flag; Single PR implementation; Manual testing only; Supabase dashboard for admin visibility; Minimal placeholder for email content |
