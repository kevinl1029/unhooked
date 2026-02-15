# Beta Program Spec

**Version:** 1.5
**Created:** 2026-02-15
**Status:** Ready for Development

### Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.5 | 2026-02-15 | Readiness review pass. Added REQ-16 (RLS read dependency). Broadened Story 2 AC 1 & 2 to reference all protected routes. Added Story 2 AC 7 (no beta UI per REQ-7), AC 8 (missing profile row edge case). Added Story 3 AC 6 (dead code cleanup). Added E2E Tests 7-8 and expanded Test 5. Updated coverage goals. Added Readiness Summary. |
| 1.4 | 2026-02-15 | Technical design pass. Added architecture overview, middleware implementation (async with beta check), migration SQL (column + trigger), login page change details, pre-launch checklist, user stories with acceptance criteria, test specification, and implementation order. |
| 1.3 | 2026-02-15 | Requirements refinement pass. Clarified "protected route" definition in REQ-1. Added REQ-11 (Google SSO production config), REQ-12 (is_beta column schema), REQ-13 (RLS write protection), REQ-14 (per-navigation beta check), REQ-15 (database migration). Added dual-auth and concurrent session edge cases. |
| 1.2 | 2026-02-15 | UX refinement pass. Added login page wireframe and copy changes ("Sign In" heading, Google SSO visible on production). Added returning user scenario, edge cases (query failure, stray accounts, accidental flag removal), and redirect chain documentation. Added REQ-9 and REQ-10. |
| 1.1 | 2026-02-15 | Rewrote as structured PRD after discovery interview. Added problem statement, goals/non-goals, success metrics, user scenarios, UX overview, scope boundaries. Added Google SSO on production as dependency. Clarified founding member conversion is out of scope. |
| 1.0 | 2026-02-15 | Initial specification with technical design and product decisions |

---

## Overview

### Problem

Unhooked has validated willingness-to-pay through its Stripe founding member flow ($199). But paying for a product and completing a 10-14 day therapeutic program are fundamentally different things. Before opening the app to founding members — who paid real money and expect a polished experience — Kevin needs to know two things: (1) does the therapeutic approach actually work for real users going through the full illusion-dismantling journey, and (2) where does the product fall short in ways that could damage brand perception or user trust?

This isn't something that can be tested internally. The Unhooked program requires sustained daily engagement over 10-14 days, real nicotine dependence as context, and genuine emotional investment in the quit journey. Kevin needs a small group of trusted people — friends, family, professional contacts — to go through the real product and give honest feedback before the stakes are raised with paying customers.

The biggest risk of skipping a beta is a founding member hitting a critical bug or confusing UX flow on day 5 of their quit journey and concluding "this doesn't work." That's a failed $199 sale, a lost customer, and potentially negative word-of-mouth. The beta reduces this risk by surfacing those issues with forgiving, accessible users first.

### Goals

**Primary goal:**
- Get qualitative feedback from real users to improve the product before founding member launch

**Secondary goals:**
- Understand where users get stuck, confused, or drop off during the program
- Build personal confidence that the product is ready for paying customers
- Identify and fix critical bugs before founding members use the app

### Non-Goals

- **Building a large beta user base.** This is 3-10 personally known people, not a public beta program.
- **Proving the product is perfect or bug-free.** Finding problems is the point. Some rough edges are expected and welcome.
- **Generating revenue or converting beta users to paid.** Beta users get free access. No expectation they'll pay.
- **Exhaustive QA testing of every edge case.** Beta validates the core therapeutic flow and experience, not feature completeness.
- **Founding member conversion.** Linking Stripe payments to user accounts is a separate feature. Beta users and founding members are distinct groups.
- **In-app feedback mechanism.** Feedback is collected informally via personal text/email conversations, not through the product.

### Success Metrics

| Metric | Target | How Measured |
|--------|--------|--------------|
| Word-of-mouth recommendation | At least 1 beta user recommends Unhooked to a friend | Kevin asks during informal check-ins. This is the exit signal — when someone wants to share it, the product is ready. |
| Program completion | At least 1 beta user completes the full 10-14 day program | `user_progress.ceremony_completed_at` is not null for a beta user |
| Qualitative feedback collected | Feedback from each active beta user | Kevin tracks via personal conversations (text/email) after key milestones |
| Drop-off understanding | Know where and why each user who stops early disengaged | Kevin reaches out to every user who drops off to understand the reason |

---

## Solution

### Summary

Add a per-user `is_beta` boolean flag to the `profiles` table that allows specific users to bypass the global `APP_MODE` gate. The public waitlist stays in place — visitors to getunhooked.app see the same landing page as today. But beta users, after signing in via magic link or Google SSO and being manually flagged by Kevin in the Supabase dashboard, get full access to the app on production. The beta user experience is identical to what paying customers will eventually get — no beta branding, no special treatment, no modified flows. This ensures feedback reflects the real product.

### Key Decisions

**Why production (not staging)?** Unhooked is a therapeutic product where users build personal narratives, track conviction scores across illusions, progress through layers (intellectual, emotional, identity), and complete a ceremony. Production and staging use separate Supabase databases. If beta users started on staging, they'd lose all progress and need to redo their entire journey when moved to production. Running on production means beta user data persists seamlessly into launch.

**Why a database flag (not invite codes, feature flags service, or email allowlist)?** For 3-10 known users managed by one person, a boolean column is the right-sized solution. Invite codes add unnecessary redemption flow. Feature flag services add an external dependency. Email allowlists require redeployment. A database flag is queryable, toggleable, and requires no infrastructure.

**Why ungate the login page?** The login page is not a protected resource — logging in doesn't grant access to anything. The auth middleware on protected routes (dashboard, onboarding, ceremony) is the real gate. Ungating the login page lets beta users authenticate via magic link or Google SSO, then the middleware checks their beta status. A non-beta user who logs in simply gets silently redirected to the landing page.

### User Scenarios

#### Primary Scenario: Beta User Gets Access and Starts the Program

**User:** A friend of Kevin's who vapes daily and wants to quit
**Trigger:** Kevin personally messages them: "I built an app to help people quit nicotine. Want early access? Sign up at getunhooked.app/login with your email, then let me know and I'll grant you access."

**Flow:**
1. User visits `getunhooked.app/login`
2. User signs in via magic link or Google SSO — an account is created
3. User is redirected to `/dashboard` but the middleware sees they're not flagged — silent redirect to landing page
4. User tells Kevin they signed up
5. Kevin opens Supabase dashboard, finds the user's profile, sets `is_beta = true`
6. Kevin messages the user: "You're in — try again"
7. User visits `getunhooked.app/login`, signs in, middleware checks `is_beta = true`, access granted
8. User lands on dashboard and enters the onboarding/intake flow immediately
9. User proceeds through the 10-14 day program (sessions, check-ins, ceremony) — identical experience to future paying users

**Outcome:** User completes (or partially completes) the program. Kevin checks in regularly after milestones to collect feedback.

#### Variant Scenario: Non-Beta User Attempts Access

**User:** A random visitor or waitlist subscriber who finds the login page
**Trigger:** They navigate to `/login` directly or find the URL somehow

**Flow:**
1. User visits `getunhooked.app/login` — the page loads (ungated)
2. User signs in via magic link or Google SSO
3. Middleware checks: `APP_MODE` is not `enabled`, `is_beta` is `false` (or `null`)
4. User is silently redirected to the landing page — no error message, no "access denied"

**Outcome:** The user sees the normal landing page. They may join the waitlist or leave. No confusion, no brand damage.

#### Variant Scenario: Beta User Drops Off Mid-Program

**User:** A beta user who stops engaging after day 4
**Trigger:** Kevin notices no activity (via Supabase query or the user stops responding to check-ins)

**Flow:**
1. Kevin reaches out personally: "Hey, noticed you haven't been on in a few days. Everything okay?"
2. User shares feedback: got busy, found the UI confusing, didn't find the sessions helpful, etc.
3. Kevin documents the feedback and the specific drop-off point

**Outcome:** Valuable qualitative data about where and why users disengage. Informs product improvements before launch.

#### Variant Scenario: Post-Beta Launch

**User:** All users
**Trigger:** Kevin decides the product is ready (word-of-mouth signal achieved, critical bugs fixed)

**Flow:**
1. Kevin sets `NUXT_PUBLIC_APP_MODE=enabled` in Vercel production environment variables
2. Redeploy triggers
3. Auth middleware: `APP_MODE` is now `enabled` — beta flag check is bypassed
4. All authenticated users can access the app
5. Beta users' data and progress are already there — no migration, no re-registration

**Outcome:** Seamless transition from beta to launch. Beta user accounts and data persist.

<!-- UX-REFINED: Added returning user scenario -->
#### Variant Scenario: Beta User Returns the Next Day

**User:** A beta user who completed a session yesterday
**Trigger:** User opens their browser and navigates to getunhooked.app

**Flow:**
1. User visits `getunhooked.app/dashboard` (bookmarked or typed)
2. Session cookie is still valid (8-hour max age per Supabase cookie config)
3. Middleware checks `is_beta = true` — access granted immediately
4. User sees their dashboard with current program progress, no sign-in required

If the session has expired (>8 hours since last authentication):
1. User visits `getunhooked.app/dashboard`
2. Middleware detects no active session — redirects to `/login`
3. User signs in via magic link or Google SSO
4. Callback redirects to `/dashboard`, middleware checks `is_beta = true`, access granted

**Outcome:** Returning within 8 hours is seamless. After expiry, re-authentication is one step (they're already flagged as beta).

### UX Overview

<!-- UX-REFINED: Updated login page with copy changes, Google SSO visibility, and wireframe -->
#### Login Page (`/login`)

- **What the user sees:** Login form with email input for magic link AND Google SSO button. The heading reads "Sign In" (changed from "Welcome Back" to work for both new and returning users). Subtitle kept: "No password needed — just enter your email" and "We'll send you a secure sign-in link."
- **What the user can do:** Enter email for magic link, or sign in with Google. Both auth methods work regardless of beta status.
- **Feedback:** After submitting email, "Check your inbox" message with the submitted email displayed. After Google SSO, redirect to dashboard (or landing page if not beta).
- **Changes from today:**
  1. Remove the `appAccessEnabled` check that currently redirects non-enabled users away from the login page. The page is now always accessible.
  2. Change heading from "Welcome Back" to "Sign In" — neutral for both first-time and returning users.
  3. Show Google SSO button on production — remove the `v-if="isStaging"` gate on lines 62 and 68 of `login.vue`. The "Or continue with" divider and Google button are now visible in all environments.

```
┌─────────────────────────────────┐
│        ┌─────────────┐          │
│        │  glass card  │          │
│        │              │          │
│        │   Sign In    │  ← Changed from "Welcome Back"
│        │              │
│        │  No password │          │
│        │  needed —    │          │
│        │  just enter  │          │
│        │  your email  │          │
│        │              │          │
│        │  ┌─────────┐ │          │
│        │  │ Email   │ │          │
│        │  └─────────┘ │          │
│        │              │          │
│        │  ┌─────────┐ │          │
│        │  │ Send    │ │  ← btn-primary, pill-shaped
│        │  │ sign-in │ │          │
│        │  │ link    │ │          │
│        │  └─────────┘ │          │
│        │              │          │
│        │  ── or ──    │  ← Now visible on ALL environments
│        │              │          │
│        │  ┌─────────┐ │          │
│        │  │ Google  │ │  ← glass style, pill-shaped
│        │  └─────────┘ │          │
│        │              │          │
│        │  Don't have  │          │
│        │  an account? │          │
│        │  The link    │          │
│        │  will create │          │
│        │  one for you │          │
│        └─────────────┘          │
└─────────────────────────────────┘
```

#### Protected Routes (Dashboard, Onboarding, Ceremony, etc.)

- **What the user sees:** If beta: the normal app experience, identical to paying users. If not beta: they never see these pages — silent redirect to landing.
- **What the user can do:** If beta: full program access (onboarding, sessions, check-ins, ceremony, reinforcement). If not beta: nothing — they're redirected before the page loads.
- **Feedback:** No "access denied" message for non-beta users. Just a clean redirect to the landing page.
- **Change from today:** Auth middleware adds a beta status check. Previously it only checked the global `APP_MODE`.

#### Landing Page (`/`)

- **What the user sees:** Unchanged. Same landing page with waitlist/checkout CTA based on `APP_MODE`.
- **What the user can do:** Same as today. Join waitlist, explore, etc.
- **Change from today:** None.

### Key Requirements

<!-- REQ-REFINED: Clarified "protected route" definition -->
- REQ-1: Users with `is_beta = true` in the `profiles` table can access all protected routes when `APP_MODE` is not `enabled`. A "protected route" is any route gated by the existing auth middleware — this definition is dynamic, so new auth-gated routes automatically inherit the beta check.
- REQ-2: Users without `is_beta = true` are silently redirected from protected routes to the landing page when `APP_MODE` is not `enabled`
- REQ-3: The login page (`/login`) is accessible regardless of `APP_MODE` setting
- REQ-4: Magic link and Google SSO authentication work on production for all users
- REQ-5: When `APP_MODE` is set to `enabled`, all authenticated users can access the app (beta flag is irrelevant)
- REQ-6: Beta status is only writable via Supabase service role (dashboard or server-side). Users cannot grant themselves beta access.
- REQ-7: The beta user experience is identical to the future paying user experience — no beta branding, badges, or modified flows
- REQ-8: Kevin can query beta users and their program progress via SQL in the Supabase dashboard
- REQ-9: Google SSO button is visible on production login page (remove staging-only gate)
- REQ-10: If the beta-check Supabase query fails (network error, timeout), the user is treated as non-beta and redirected to the landing page (fail closed)

<!-- READINESS-REVIEWED: Added REQ-16 for explicit RLS read dependency -->
- REQ-16: The existing RLS SELECT policy on `profiles` must allow authenticated users to read their own `is_beta` column. No RLS policy changes are needed for the beta program — the middleware relies on the existing "Users can read own profile" policy.

<!-- REQ-REFINED: Added requirements from requirements refinement pass -->
- REQ-11: Google OAuth provider must be configured in the production Supabase project with the correct redirect URI (`https://getunhooked.app/auth/callback`) before beta launch
- REQ-12: The `is_beta` column is defined as `BOOLEAN NOT NULL DEFAULT false` on the `profiles` table. Null values are not permitted — every profile has an explicit `true` or `false`.
- REQ-13: The `is_beta` column must not be user-writable. RLS policies must prevent users from updating their own `is_beta` value via the Supabase client.
- REQ-14: The beta flag is checked on every navigation to a protected route, not cached per session. This ensures that when Kevin toggles `is_beta` in the Supabase dashboard, the change takes effect on the user's next page load. This check only runs when `APP_MODE` is not `enabled` — once the app is fully launched, the per-navigation beta check is skipped entirely.
- REQ-15: A database migration must add the `is_beta` column (`BOOLEAN NOT NULL DEFAULT false`) to the existing `profiles` table. All existing rows receive `false`. The migration must not cause data loss or require downtime.

<!-- UX-REFINED: Added edge cases and known side effects section -->
### Edge Cases & Known Side Effects

**Beta-check query failure:** If the middleware's Supabase query to check `is_beta` fails (network issue, Supabase outage, timeout), the user is treated as non-beta and silently redirected to the landing page. This is a "fail closed" approach — if we can't verify beta status, we don't grant access. Beta users may need to retry if Supabase has a transient issue.

**Non-beta user redirect chain:** When a non-beta user signs in, the auth callback (`/auth/callback`) redirects to `/dashboard`, then the middleware redirects to `/`. This double-redirect may cause a brief flash. This is accepted — it's a rare edge case affecting only non-beta users who shouldn't be accessing the app. The flash is sub-second.

**Stray accounts from non-beta signups:** Because the login page is ungated, anyone can create an account by signing in with magic link or Google SSO. These accounts are harmless — they have no intake data, no progress, and no beta flag. They're inert rows in the `profiles` table. No cleanup needed unless the volume becomes concerning (unlikely given the login page isn't linked from the landing page).

**Accidental beta flag removal:** If Kevin accidentally sets `is_beta = false` on an active beta user, the user is locked out on their next navigation to a protected route. Their data (conversations, progress, moments) persists in the database — it's just inaccessible. Kevin can re-set `is_beta = true` to restore access immediately. For 3-10 known users managed manually, this is an acceptable operational risk.

<!-- REQ-REFINED: Added dual-auth and concurrent session edge cases -->
**Dual auth methods (same email):** If a beta user signs up via magic link and later signs in with Google SSO using the same email (or vice versa), Supabase auto-links both auth identities to the same profile. The `is_beta` flag persists across auth methods. This is default Supabase behavior — no special handling needed.

**Concurrent sessions (multiple devices):** A beta user can be logged in on multiple devices simultaneously. Each device has its own session token, and the beta check runs independently per navigation. If Kevin revokes beta access, all devices lose access on their next navigation to a protected route. No beta-specific behavior — this is standard Supabase session handling.

---

## Scope & Considerations

### Out of Scope

- **Founding member conversion** — Linking Stripe payments to user accounts is a separate feature. Beta users and founding members are distinct groups with separate access mechanisms.
- **In-app feedback mechanism** — No feedback button, survey, or reporting tool. Kevin collects feedback informally via personal text/email conversations.
- **Admin dashboard** — No custom UI for managing beta users. Kevin uses the Supabase Table Editor directly.
- **Beta analytics tracking** — No special tagging of beta users in Plausible or other analytics. Beta users appear as normal users in analytics data.
- **Automated welcome email for beta users** — Kevin communicates with beta users personally. No automated onboarding email when `is_beta` is set.

### Deferred / Future Enhancements

- **Founding member access gate** — When founding members are ready to use the app, the middleware will need to check payment status (via `founding_members` table). This is a separate spec.
- **Beta feedback collection tool** — If the informal approach proves insufficient, a simple in-app feedback button or Supabase table for structured feedback could be added.
- **Beta user analytics** — Custom Plausible properties to distinguish beta users from regular users. Not needed for 3-10 users.
- **Column cleanup** — After public launch, the `is_beta` column can be removed or repurposed via migration. No urgency — a boolean defaulting to `false` is harmless.

### Dependencies

<!-- UX-REFINED: Expanded Google SSO dependency with specific implementation details -->
- **Google SSO on production** — Two changes needed:
  1. **Supabase configuration:** Ensure Google OAuth provider is configured in the production Supabase project with the correct redirect URI (`https://getunhooked.app/auth/callback`). Currently only configured for the staging/preview Supabase project.
  2. **Login page UI:** Remove the `v-if="isStaging"` gate from the Google SSO button and "Or continue with" divider in `pages/login.vue` (lines 62 and 68). These elements should be visible in all environments.

### Constraints

- **Small scale only.** This approach (manual Supabase flagging, no admin UI, informal feedback) is designed for 3-10 users. It does not scale to a larger beta program.
- **Manual operational overhead.** Kevin must personally flag each user, check in with them, and track feedback outside the app.
- **Timing gap in onboarding.** There's an unavoidable gap between a user signing up and Kevin granting access. Kevin mitigates this by setting expectations upfront: "Sign up, let me know, and I'll grant you access."

### Open Questions

- None at this time. All product decisions have been made through the discovery interview.

---

## Behavior Matrix

| Route | Non-Beta User (APP_MODE != enabled) | Beta User (APP_MODE != enabled) | Any User (APP_MODE = enabled) |
|-------|--------------------------------------|----------------------------------|-------------------------------|
| `/` (landing) | Landing page | Landing page | Landing page |
| `/login` | Login form (accessible) | Login form (accessible) | Login form (accessible) |
| `/dashboard` | Silent redirect to `/` | Dashboard | Dashboard |
| `/onboarding/*` | Silent redirect to `/` | Onboarding | Onboarding |
| `/ceremony/*` | Silent redirect to `/` | Ceremony | Ceremony |
| `/checkout/*` | Accessible (per APP_MODE) | Accessible | Accessible |

---

## Operational Procedures

### Adding a Beta User

1. Kevin messages the person with instructions: "Go to getunhooked.app/login and sign in with your email or Google"
2. User signs in — account is created. They're redirected to landing page (not yet flagged).
3. User tells Kevin they signed up.
4. Kevin opens Supabase dashboard > Table Editor > `profiles`
5. Kevin finds the user's row by email
6. Kevin sets `is_beta` to `true`
7. Kevin messages the user: "You're in — log in again and you'll have access"

### Removing Beta Access

1. Kevin opens Supabase dashboard > `profiles`
2. Kevin sets `is_beta` to `false`
3. User is blocked from protected routes on next navigation

### Monitoring Beta Users

```sql
SELECT
  p.email,
  p.is_beta,
  p.created_at,
  up.program_status,
  up.current_illusion,
  up.illusions_completed,
  up.current_layer,
  up.ceremony_completed_at
FROM profiles p
LEFT JOIN user_progress up ON p.id = up.user_id
WHERE p.is_beta = true;
```

### Ending the Beta

1. Set `NUXT_PUBLIC_APP_MODE=enabled` in Vercel production environment variables
2. Redeploy
3. All authenticated users can access the app (beta flag is irrelevant)
4. Optionally remove `is_beta` column later — no rush

---

<!-- TECH-DESIGN: Complete technical design added -->
## Technical Design

### Architecture Overview

The beta program touches three existing files and adds one migration. No new components, composables, API endpoints, or packages are needed.

```
Files modified:
  middleware/auth.ts          ← Add async beta check
  pages/login.vue             ← Remove gates, update heading
  types/database.types.ts     ← Regenerate after migration

Files added:
  supabase/migrations/20260215_add_beta_flag.sql  ← Column + trigger
```

**Middleware flow (after implementation):**

```
User navigates to protected route (e.g., /dashboard)
  │
  ├─ @nuxtjs/supabase global middleware runs first
  │   └─ Not authenticated? → redirect to /login
  │   └─ Authenticated? → continue
  │
  └─ middleware/auth.ts runs second
      │
      ├─ APP_MODE === 'enabled'?
      │   └─ Yes → allow access (skip beta check entirely)
      │
      └─ No → async query: SELECT is_beta FROM profiles WHERE id = user.id
          │
          ├─ Query succeeds, is_beta = true → allow access
          ├─ Query succeeds, is_beta = false → redirect to /
          └─ Query fails (error/timeout) → redirect to / (fail closed)
```

### Data Model

#### Migration: `supabase/migrations/20260215_add_beta_flag.sql`

```sql
-- Add is_beta column to profiles table (REQ-12, REQ-15)
ALTER TABLE public.profiles
  ADD COLUMN is_beta BOOLEAN NOT NULL DEFAULT false;

-- Protect is_beta from user writes (REQ-13)
-- Supabase RLS is row-level, not column-level. A BEFORE UPDATE trigger
-- silently reverts is_beta changes made by non-service-role users.
CREATE OR REPLACE FUNCTION public.protect_is_beta()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_beta IS DISTINCT FROM OLD.is_beta THEN
    IF (current_setting('request.jwt.claims', true)::json ->> 'role') != 'service_role' THEN
      NEW.is_beta := OLD.is_beta;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER protect_is_beta_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_is_beta();
```

**What this does:**
- Adds `is_beta BOOLEAN NOT NULL DEFAULT false` to `profiles`. All existing rows get `false`.
- Creates a trigger that silently reverts `is_beta` changes unless the caller is `service_role` (Supabase dashboard or server-side API).
- No changes to existing RLS policies — the existing "Users can read own profile" SELECT policy allows the middleware to read `is_beta`.

**After migration, regenerate TypeScript types:**
```bash
npm run db:types
```

This updates `types/database.types.ts` to include `is_beta: boolean` on the `profiles` type.

### Middleware Implementation

#### `middleware/auth.ts` (modified)

**Current code (15 lines, synchronous):**
```typescript
export default defineNuxtRouteMiddleware((to) => {
  const { appAccessEnabled } = useAppMode()
  if (!appAccessEnabled) {
    return navigateTo('/')
  }
  const user = useSupabaseUser()
  if (!user.value) {
    return navigateTo('/login')
  }
})
```

**New code (async, with beta check):**
```typescript
export default defineNuxtRouteMiddleware(async (to) => {
  const { appAccessEnabled } = useAppMode()

  // If app access is fully enabled, skip beta check — all authenticated users can access (REQ-5)
  if (appAccessEnabled) {
    const user = useSupabaseUser()
    if (!user.value) {
      return navigateTo('/login')
    }
    return // Access granted
  }

  // App is not fully enabled — check beta status (REQ-1, REQ-14)
  const user = useSupabaseUser()
  if (!user.value) {
    return navigateTo('/login')
  }

  // Query is_beta on every navigation, not cached (REQ-14)
  // Fail closed: any error = treat as non-beta (REQ-10)
  try {
    const client = useSupabaseClient()
    const { data, error } = await client
      .from('profiles')
      .select('is_beta')
      .eq('id', user.value.id)
      .single()

    if (error || !data?.is_beta) {
      return navigateTo('/')
    }
  } catch {
    return navigateTo('/')
  }
})
```

**Key implementation notes:**
- The middleware becomes `async` — Nuxt route middleware supports this natively.
- When `APP_MODE=enabled`, the beta check is skipped entirely (REQ-5). No Supabase query, no performance cost.
- When `APP_MODE!=enabled`, every navigation to a protected route queries `profiles.is_beta` (REQ-14).
- Both the Supabase `error` return and JavaScript exceptions are caught — fail closed in all cases (REQ-10).

### Login Page Changes

#### `pages/login.vue` (modified)

Three targeted changes:

**Change 1: Remove app-access gate (REQ-3)**
```
// REMOVE these lines (101-104):
if (!appAccessEnabled) {
  navigateTo('/')
}
```

**Change 2: Update heading (UX spec)**
```html
<!-- CHANGE from: -->
<h1 class="text-2xl font-bold text-white mb-2 text-center">Welcome Back</h1>
<!-- TO: -->
<h1 class="text-2xl font-bold text-white mb-2 text-center">Sign In</h1>
```

**Change 3: Remove staging-only gate on Google SSO (REQ-9)**
```html
<!-- REMOVE v-if="isStaging" from lines 62 and 68 -->
<!-- The "Or continue with" divider and Google button become visible on all environments -->
```

**No other changes to the login page.** The form logic, error handling, and Google SSO handler (`handleGoogleSignIn`) all remain as-is.

### Pre-Launch Checklist

Before deploying the beta:

- [ ] **Run migration** on production Supabase via SQL Editor (`20260215_add_beta_flag.sql`)
- [ ] **Configure Google OAuth** in production Supabase dashboard (Authentication → Providers → Google) with redirect URI `https://getunhooked.app/auth/callback` (REQ-11)
- [ ] **Deploy code changes** to Vercel (middleware + login page)
- [ ] **Verify** by logging in on production and confirming non-beta redirect works
- [ ] **Flag first beta user** via Supabase Table Editor and confirm access

---

<!-- TECH-DESIGN: User stories with acceptance criteria -->
## User Stories

### Story 1: Database Migration — Add `is_beta` Column

**Description:** As a developer, I want to add the `is_beta` column to the `profiles` table with write protection, so that Kevin can flag beta users and the column is protected from unauthorized changes.

**Acceptance Criteria:**
1. Given the migration is run, when I query `profiles`, then the `is_beta` column exists with type `BOOLEAN NOT NULL DEFAULT false`
2. Given existing rows in `profiles`, when the migration runs, then all existing rows have `is_beta = false`
3. Given an authenticated user, when they attempt to update their own `is_beta` via the Supabase client, then the value is silently reverted to its previous value
4. Given a service_role client, when it updates `is_beta` on any profile, then the change is persisted
5. Given the migration is run, when I run `npm run db:types`, then `types/database.types.ts` includes `is_beta: boolean` on the `profiles` type

**Technical Notes:**
- File: `supabase/migrations/20260215_add_beta_flag.sql`
- Includes ALTER TABLE + trigger function + trigger
- Run via Supabase SQL Editor on production
- Regenerate types with `npm run db:types` after migration

**Dependencies:** None (foundation story)

**Test Requirements:**
- Manual verification: run migration on local/staging Supabase, confirm column exists and trigger works
- Unit test for trigger behavior is not practical (requires real Supabase). Verified during E2E.

**Estimated Complexity:** S — Single migration file with ~20 lines of SQL

---

### Story 2: Auth Middleware — Add Beta Check

**Description:** As a beta user, I want the auth middleware to check my `is_beta` flag so that I can access the app when `APP_MODE` is not `enabled`. As a non-beta user, I want to be silently redirected so that I don't see an error page.

**Acceptance Criteria:**
<!-- READINESS-REVIEWED: Broadened AC 1 & 2 to reference all protected routes; added AC 7 (REQ-7) and AC 8 (missing profile edge case) -->
1. Given `APP_MODE != enabled` and a user with `is_beta = true`, when they navigate to any protected route (e.g., `/dashboard`, `/onboarding`, `/ceremony`), then they see the page
2. Given `APP_MODE != enabled` and a user with `is_beta = false`, when they navigate to any protected route (e.g., `/dashboard`, `/onboarding`, `/ceremony`), then they are redirected to `/`
3. Given `APP_MODE != enabled` and the Supabase query fails, when a user navigates to `/dashboard`, then they are redirected to `/` (fail closed)
4. Given `APP_MODE = enabled`, when any authenticated user navigates to `/dashboard`, then they see the dashboard (no beta check query is made)
5. Given `APP_MODE != enabled` and a user is not authenticated, when they navigate to `/dashboard`, then they are redirected to `/login`
6. Given Kevin sets `is_beta = false` on an active beta user, when the user next navigates to a protected route, then they are redirected to `/` (per-navigation check, not cached)
7. Given a beta user, when they use any part of the app, then no beta-specific UI, branding, badges, or modified flows are present (REQ-7)
8. Given a user whose `profiles` row does not yet exist (race condition during account creation), when they navigate to a protected route, then they are redirected to `/` (fail closed — `.single()` returns error when no row exists)

**Technical Notes:**
- File: `middleware/auth.ts`
- Makes middleware `async` — Nuxt supports this natively
- Uses `useSupabaseClient()` for the query
- The `@nuxtjs/supabase` module's global middleware handles the base auth redirect; this middleware adds the app-mode + beta check

**Dependencies:** Story 1 (migration must exist for the query to work)

**Test Requirements:**
- E2E: Beta user accesses dashboard (happy path)
- E2E: Non-beta user redirected to landing
- E2E: APP_MODE=enabled skips beta check
- Unit: Not practical for middleware with Supabase dependency — covered by E2E

**Estimated Complexity:** S — ~30 lines replacing ~15 lines in existing file

---

### Story 3: Login Page — Ungate and Enable Google SSO

**Description:** As any user (beta or not), I want to access the login page regardless of `APP_MODE`, so that I can authenticate before the beta check happens. I also want to see the Google SSO option on production.

**Acceptance Criteria:**
1. Given `APP_MODE != enabled`, when a user visits `/login`, then they see the login form (not redirected)
2. Given the login page loads, then the heading reads "Sign In" (not "Welcome Back")
3. Given the login page loads on production, then the Google SSO button and "Or continue with" divider are visible
4. Given a user submits their email, then the magic link flow works as before (no regression)
5. Given a user clicks Google sign-in on production, then the OAuth flow initiates correctly
6. Given all changes are applied, then no unused imports or destructured variables remain in `login.vue` (both `appAccessEnabled` and `isStaging` from `useAppMode()` become dead code after the changes and should be cleaned up) <!-- READINESS-REVIEWED: Dead code cleanup AC -->

**Technical Notes:**
- File: `pages/login.vue`
- Remove `if (!appAccessEnabled) { navigateTo('/') }` (lines 101-104)
- Change `Welcome Back` to `Sign In` (line 4)
- Remove `v-if="isStaging"` from lines 62 and 68
- Clean up unused destructured variables: both `appAccessEnabled` and `isStaging` from `useAppMode()` are dead code after these changes — simplify or remove the import

**Dependencies:** None (can be done in parallel with Story 1 and 2)

**Test Requirements:**
- E2E: Login page accessible when APP_MODE != enabled
- E2E: Google SSO button visible (no `isStaging` gate)
- E2E: Magic link submission still works (regression check)

**Estimated Complexity:** S — Three targeted edits in one file

---

### Implementation Order

```
Story 1 (Migration) ──→ Story 2 (Middleware)
                              │
Story 3 (Login page) ────────┘ can be done in parallel with Story 1

Deployment order:
  1. Run migration on production Supabase (Story 1)
  2. Configure Google OAuth on production Supabase (pre-launch checklist)
  3. Deploy code changes — Stories 2 + 3 ship together in one commit/PR
```

Stories 1 and 3 can be worked on in parallel. Story 2 depends on Story 1 (needs the column to exist for the query).

---

<!-- TECH-DESIGN: Test specification -->
## Test Specification

### E2E Tests

**File:** `tests/e2e/beta-access.spec.ts`

#### Test 1: Beta user can access dashboard
- **Setup:** Mock `/rest/v1/profiles` to return `{ is_beta: true }`. Set `APP_MODE` to non-enabled.
- **Flow:** Navigate to `/dashboard` as authenticated user
- **Assert:** Page loads, user sees dashboard content (not redirected)

#### Test 2: Non-beta user redirected to landing
- **Setup:** Mock `/rest/v1/profiles` to return `{ is_beta: false }`. Set `APP_MODE` to non-enabled.
- **Flow:** Navigate to `/dashboard` as authenticated user
- **Assert:** User is redirected to `/` (landing page)

#### Test 3: Beta check skipped when APP_MODE=enabled
- **Setup:** Set `APP_MODE` to `enabled`. No profiles mock needed.
- **Flow:** Navigate to `/dashboard` as authenticated user
- **Assert:** Page loads, no profiles query is made

#### Test 4: Beta check fails closed
- **Setup:** Mock `/rest/v1/profiles` to return a network error. Set `APP_MODE` to non-enabled.
- **Flow:** Navigate to `/dashboard` as authenticated user
- **Assert:** User is redirected to `/`

#### Test 5: Login page accessible when APP_MODE is not enabled
- **Setup:** Set `APP_MODE` to non-enabled (e.g., `validation`).
- **Flow:** Navigate to `/login`
- **Assert:** Login form is visible. Heading reads "Sign In" (not "Welcome Back"). <!-- READINESS-REVIEWED: Added heading text assertion -->

#### Test 6: Google SSO button visible on production
- **Setup:** Navigate to `/login`
- **Flow:** Check for Google SSO elements
- **Assert:** "Or continue with" divider and Google button are both visible (no staging-only gate)

<!-- READINESS-REVIEWED: Added Tests 7-8 for AC coverage gaps -->
#### Test 7: Unauthenticated user redirected to login
- **Setup:** No authentication. Set `APP_MODE` to non-enabled.
- **Flow:** Navigate to `/dashboard` without a session
- **Assert:** User is redirected to `/login`

#### Test 8: Magic link submission works (regression)
- **Setup:** Navigate to `/login`. Mock Supabase auth endpoint.
- **Flow:** Enter email address, click "Send sign-in link"
- **Assert:** "Check your email" confirmation message is displayed with the submitted email. No errors.

### Unit Tests

No unit tests needed for this feature. The changes are:
- Middleware with Supabase dependency → tested via E2E
- Login page template changes → tested via E2E
- SQL migration → verified manually + via E2E behavior

### Coverage Goals

- **Critical path:** Beta user access (Test 1) and non-beta redirect (Test 2) are the highest priority
- **Regression safety:** Login page accessibility (Test 5) and magic link flow (Test 8) ensure existing auth isn't broken
- **"Done" for testing:** All 8 E2E tests pass. Manual verification that migration works on staging Supabase.
- **Explicitly not tested (and why):** Story 2 AC 6 (real-time revocation) — requires DB mutation mid-test, impractical in E2E. Story 3 AC 5 (Google OAuth click) — requires real Google OAuth, impractical without live credentials.

---

## Readiness Summary

**Review date:** 2026-02-15
**Final assessment:** Ready for Development
**Gaps found:** 7 (1 Layer 1, 1 Layer 2, 5 Layer 3) — all resolved

### Gaps Resolved

| # | Layer | Gap | Resolution |
|---|-------|-----|------------|
| 1 | UX → Requirements | Implicit dependency on existing RLS SELECT policy for reading `is_beta` | Added REQ-16 making the dependency explicit |
| 2 | Requirements → Stories | REQ-7 (identical UX) had no traceable story or AC | Added Story 2 AC 7 — no beta-specific UI present |
| 3 | Stories → AC | Story 2 ACs referenced only `/dashboard`, not all protected routes | Broadened AC 1 & 2 to reference "any protected route" |
| 4 | Stories → AC | No AC for missing profile row edge case (race condition) | Added Story 2 AC 8 — fail closed when profile doesn't exist |
| 5 | Stories → AC | Dead code after Story 3 changes not called out | Added Story 3 AC 6 — clean up unused imports |
| 6 | Stories → AC | Test spec missing coverage for Story 2 AC 5 | Added Test 7 — unauthenticated user redirect |
| 7 | Stories → AC | Test spec missing coverage for Story 3 AC 2 & 4 | Expanded Test 5 (heading text) and added Test 8 (magic link regression) |

### Deferred Items

- **Story 2 AC 6 (real-time revocation):** Not covered by E2E — requires DB mutation mid-test. Verified manually during staging QA.
- **Story 3 AC 5 (Google OAuth click):** Not covered by E2E — requires live OAuth credentials. Verified manually on production after deploy.

---

## Related Documents

- [authentication-spec.md](authentication-spec.md) — Auth setup, magic link flow, middleware
- [stripe-market-validation-spec.md](stripe-market-validation-spec.md) — Founding member checkout, app mode tri-state (Addendum A)
- [core-program-spec.md](core-program-spec.md) — The 10-14 day therapeutic program beta users will go through
- [ceremony-spec.md](ceremony-spec.md) — Program completion ceremony
- [check-in-spec.md](check-in-spec.md) — Scheduled check-ins between sessions
