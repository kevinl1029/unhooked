# Unhooked: Beta Program Specification

**Version:** 1.0
**Created:** 2026-02-15
**Status:** Draft
**Document Type:** Product Requirements Document

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-02-15 | Initial specification for beta user access program |

---

## Business Context

### What We're Doing

Offering a small number of users free access to the Unhooked app before public launch. The goal is to get real user experience and feedback on the core program — the illusion-dismantling conversations, progress tracking, ceremony flow, and overall therapeutic experience — before opening to paying customers.

### Why Beta Before Launch

- **Validate the experience, not just willingness-to-pay.** The Stripe founding member flow (already implemented) validates that people will pay $199. The beta validates that the product actually delivers on its promise.
- **Real therapeutic journeys take 10-14 days.** Unlike a SaaS tool you can evaluate in 5 minutes, Unhooked requires sustained engagement. We need users who complete the full program to know if it works.
- **Feedback shapes the product.** Before charging $199, we want to know: Do users get stuck? Which illusions resonate? Is the voice interface compelling? Does the ceremony feel meaningful?

### Who Are Beta Users

A small, known group of people Kevin personally invites. These are not strangers from a waitlist — they're people Kevin has a direct relationship with and can follow up with for feedback. Expected count: 3-10 users.

### Success Criteria

| Metric | Target | What It Tells Us |
|--------|--------|------------------|
| Program completion rate | At least 1 user completes full program | Core flow works end-to-end |
| User feedback collected | Qualitative feedback from each beta user | What to improve before launch |
| Critical bugs found | Identified and fixed before launch | Production readiness |
| Drop-off points | Understand where/why users stop | UX improvements needed |

---

## Product Decisions & Rationale

### Why Production Environment (Not Staging)

We evaluated three options:

| Option | Pros | Cons |
|--------|------|------|
| **Production (getunhooked.app)** | Real experience, data persists to launch, seamless transition, professional feel | Bugs affect main domain |
| **Staging (staging.getunhooked.app)** | Isolated from production, can iterate freely | Separate database — beta users lose all data and must start over when moving to production; preview deployments are less stable; mixes real users with dev testing |
| **Dedicated beta subdomain** | Clear branding | Extra infrastructure for a small, temporary program |

**Decision: Production (getunhooked.app)**

**Rationale:**
1. **Data persistence matters.** Unhooked is a therapeutic product where users build a personal narrative (`user_story`), track conviction scores across illusions, progress through layers (intellectual, emotional, identity), and eventually complete a ceremony. Telling beta users "thanks for the feedback, now start over" undermines the experience we're trying to validate.

2. **Separate databases mean data loss.** Production and preview environments use different Supabase projects. Beta user data created on staging would not exist in production. There is no migration path — they would need to redo their entire journey.

3. **Seamless transition.** When the beta ends and we launch publicly, beta users are already there. No re-registration, no data migration, no broken state.

4. **Production analytics.** Beta user behavior tracked in Plausible under `getunhooked.app` contributes to our production analytics baseline.

5. **Staging stays clean.** The preview environment remains a development/QA tool, not polluted with real user activity.

### Why Keep the Public Waitlist (Not Go Live)

Two options for accommodating beta users on production:

| Option | Description | Tradeoff |
|--------|-------------|----------|
| **Go live publicly** | Set `APP_MODE=enabled`, everyone can sign up and pay. Give beta users a free bypass. | Forces a public launch before we're ready. Defeats the purpose of a beta. |
| **Keep waitlist + beta flag** | Public still sees the waitlist (`APP_MODE` unchanged). Beta users are individually flagged to bypass the gate. | Requires a per-user access check. Small implementation effort. |

**Decision: Keep the waitlist, add per-user beta access**

**Rationale:**
1. The entire point of a beta is to get feedback *before* going live. Launching publicly just to accommodate 3-10 beta users is backwards.
2. The current `APP_MODE` system gates access globally (environment-wide). We need a per-user override, not a global mode change.
3. When ready to launch, we set `APP_MODE=enabled` and the beta flag becomes irrelevant — everyone gets access.

### Why a Database Flag (Not Feature Flags Service, Invite Codes, etc.)

| Approach | Complexity | Fits Our Scale |
|----------|-----------|----------------|
| **`is_beta` column on `profiles`** | Minimal — one migration, one check | Perfect for 3-10 known users |
| Feature flag service (LaunchDarkly, etc.) | External dependency, SDK integration | Overkill for a handful of users |
| Invite codes / tokens | Code generation, validation, redemption flow | Unnecessary when Kevin knows each user personally |
| Email allowlist (hardcoded) | Requires redeployment to add users | Fragile, not queryable |

**Decision: `is_beta` column on `profiles` table**

**Rationale:**
This is the right-sized version of user-level feature flagging. Kevin manually sets the flag in Supabase for each beta user. No invite codes, no self-service enrollment, no external services. When the beta is over, the column is ignored (or removed).

### Why Ungate the Login Page

Currently, both the auth middleware (`middleware/auth.ts`) and the login page (`pages/login.vue`) check `appAccessEnabled` and redirect to the landing page if it's `false`. This means beta users can't even reach the login form.

**Decision: Remove the `appAccessEnabled` check from the login page**

**Rationale:**
1. **The login page is not a protected resource.** Logging in doesn't grant access to anything by itself. The protection belongs on the routes behind authentication (dashboard, onboarding, etc.).
2. **This is standard practice.** Even apps in "coming soon" mode let users authenticate — they just don't show protected content afterward.
3. **The auth middleware is the real gate.** It checks both `appAccessEnabled` (global) and `is_beta` (per-user). A non-beta user who logs in simply gets redirected to the landing page when they try to access `/dashboard`.
4. **Simplifies the beta flow.** Beta users click a magic link, authenticate, and the middleware lets them through. No special login page or alternate entry point needed.

---

## User Flows

### Flow 1: Kevin Invites a Beta User

```
Kevin identifies beta user
  → Creates their account in Supabase (or user signs up via magic link on login page)
  → Kevin sets is_beta = true on their profile in Supabase dashboard
  → Kevin sends them a personal message: "Go to getunhooked.app/login and sign in with your email"
```

### Flow 2: Beta User Signs In

```
Beta user visits getunhooked.app/login
  → Enters email, receives magic link
  → Clicks magic link, authenticated via /auth/callback
  → Redirected to /dashboard
  → Auth middleware checks: is APP_MODE enabled? No. Is user.is_beta true? Yes.
  → Access granted. User sees dashboard.
```

### Flow 3: Non-Beta User Tries to Access App

```
Random visitor somehow reaches /login
  → They can log in (login page is ungated)
  → Redirected to /dashboard
  → Auth middleware checks: is APP_MODE enabled? No. Is user.is_beta true? No.
  → Redirected to / (landing page)
```

### Flow 4: Public Visitor (No Change)

```
Visitor arrives at getunhooked.app
  → Sees landing page with waitlist/checkout CTA (based on APP_MODE)
  → No access to /dashboard, /login works but doesn't help without beta flag
```

### Flow 5: Post-Beta Launch

```
Kevin sets APP_MODE=enabled in Vercel environment variables
  → All users can access the app (is_beta check becomes irrelevant)
  → Beta users' data and progress are already there
  → No migration, no re-registration needed
```

---

## Technical Specification

### Overview

Three changes are needed:

1. **Database:** Add `is_beta` column to `profiles` table
2. **Middleware:** Update `middleware/auth.ts` to check beta status before redirecting
3. **Login page:** Remove the `appAccessEnabled` redirect from `pages/login.vue`

### 1. Database Migration

**File:** `supabase/migrations/[timestamp]_add_beta_flag.sql`

```sql
-- Add beta flag to profiles table
-- Allows specific users to access the app before public launch
ALTER TABLE public.profiles
  ADD COLUMN is_beta BOOLEAN DEFAULT FALSE;

-- Index for the beta check in auth middleware
-- Small table, but makes the query explicit
CREATE INDEX idx_profiles_is_beta ON public.profiles(is_beta) WHERE is_beta = TRUE;

-- Allow users to read their own beta status (needed for client-side middleware)
-- Existing RLS policy "Users can read own profile" already covers SELECT on profiles
-- No new policy needed
```

**Note:** The existing RLS policy `"Users can read own profile"` already allows `SELECT` on the profiles table for the authenticated user. No new policy is required. Kevin sets `is_beta` via the Supabase dashboard (service role), not through the app.

### 2. Auth Middleware Update

**File:** `middleware/auth.ts`

Current behavior:
- If `!appAccessEnabled` → redirect to `/` (all users blocked)
- If not logged in → redirect to `/login`

New behavior:
- If not logged in → redirect to `/login`
- If `appAccessEnabled` → allow through (global access enabled, everyone gets in)
- If user `is_beta` → allow through (per-user override)
- Otherwise → redirect to `/` (neither global nor per-user access)

```typescript
export default defineNuxtRouteMiddleware(async (to) => {
  const user = useSupabaseUser()

  // If user is not logged in, redirect to login
  if (!user.value) {
    return navigateTo('/login')
  }

  const { appAccessEnabled } = useAppMode()

  // If app is globally enabled, allow all authenticated users
  if (appAccessEnabled) {
    return
  }

  // App not globally enabled — check if user has beta access
  const supabase = useSupabaseClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_beta')
    .eq('id', user.value.id)
    .single()

  if (profile?.is_beta) {
    return // Beta user — allow access
  }

  // Not a beta user and app not enabled — redirect to landing
  return navigateTo('/')
})
```

**Implementation note:** The beta check queries the `profiles` table on each protected route navigation. For 3-10 beta users during a pre-launch phase, this is acceptable. If this pattern were to scale (hundreds of users, frequent navigations), we'd want to cache the beta status client-side (e.g., in a composable with a Supabase realtime subscription or a one-time fetch on login). For now, simplicity wins.

### 3. Login Page Update

**File:** `pages/login.vue`

Remove the `appAccessEnabled` redirect:

```typescript
// REMOVE these lines:
// const { appAccessEnabled, isStaging } = useAppMode()
// if (!appAccessEnabled) {
//   navigateTo('/')
// }

// REPLACE with:
const { isStaging } = useAppMode()
```

The login page should be accessible regardless of app mode. The auth middleware on protected routes handles the actual access control.

### 4. No Changes Needed

The following require **no changes:**

- **`composables/useAppMode.ts`** — The composable stays the same. `appAccessEnabled` still means "global access for everyone." The beta check is a separate per-user concern handled in middleware.
- **Landing page** — No change. Public visitors see the same experience.
- **`nuxt.config.ts`** — No new environment variables needed. Beta is a database flag, not a deployment config.
- **Supabase auth settings** — Magic links already work. No new redirect URLs needed.
- **Stripe/checkout flow** — Beta users don't go through checkout. No changes.

---

## Behavior Matrix

| Route | Non-Beta User (APP_MODE != enabled) | Beta User (APP_MODE != enabled) | Any User (APP_MODE = enabled) |
|-------|--------------------------------------|----------------------------------|-------------------------------|
| `/` (landing) | Landing page | Landing page | Landing page |
| `/login` | Login form (accessible) | Login form (accessible) | Login form (accessible) |
| `/dashboard` | → Redirect to `/` | Dashboard | Dashboard |
| `/onboarding/*` | → Redirect to `/` | Onboarding | Onboarding |
| `/ceremony/*` | → Redirect to `/` | Ceremony | Ceremony |
| `/checkout/*` | Accessible (based on APP_MODE) | Accessible | Accessible |

---

## Operational Procedures

### Adding a Beta User

1. User signs up via magic link at `getunhooked.app/login` (or Kevin creates their account)
2. Go to Supabase dashboard → Table Editor → `profiles`
3. Find the user's row by email
4. Set `is_beta` to `true`
5. User can now access the full app

### Removing Beta Access

1. Go to Supabase dashboard → `profiles`
2. Set `is_beta` to `false`
3. User is immediately blocked from protected routes on next navigation

### Monitoring Beta Users

Query to see all beta users and their progress:

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

When ready to launch publicly:
1. Set `NUXT_PUBLIC_APP_MODE=enabled` in Vercel production environment variables
2. Redeploy
3. All authenticated users now have access (beta flag is irrelevant)
4. Optionally: clean up `is_beta` column later via migration (no rush — it's harmless)

---

## Implementation Phases

| Phase | Scope | Effort |
|-------|-------|--------|
| 1 | Database migration: add `is_beta` column | Small |
| 2 | Update `middleware/auth.ts` with beta check | Small |
| 3 | Remove `appAccessEnabled` check from `pages/login.vue` | Trivial |
| 4 | Manual testing of all flows (beta user, non-beta user, public visitor) | Medium |

All phases can be delivered in a single PR.

---

## Acceptance Criteria

### Beta User Access
- [ ] User with `is_beta = true` can access `/dashboard` when `APP_MODE != enabled`
- [ ] User with `is_beta = true` can access all protected routes (onboarding, chat, ceremony)
- [ ] User with `is_beta = true` can complete the full program flow

### Non-Beta User Blocking
- [ ] User with `is_beta = false` (or null) is redirected from `/dashboard` to `/` when `APP_MODE != enabled`
- [ ] User with `is_beta = false` is redirected from all protected routes to `/`
- [ ] Non-authenticated visitors are redirected from protected routes to `/login`

### Login Page
- [ ] Login page is accessible regardless of `APP_MODE` setting
- [ ] Magic link sign-in works for all users
- [ ] After login, beta users are redirected to `/dashboard`
- [ ] After login, non-beta users are redirected to `/` (when `APP_MODE != enabled`)

### Public Experience (No Regressions)
- [ ] Landing page unchanged for public visitors
- [ ] Waitlist/checkout flow works as before
- [ ] `APP_MODE=enabled` still grants access to all authenticated users (beta flag irrelevant)

### Operational
- [ ] Kevin can set `is_beta = true` via Supabase dashboard
- [ ] Kevin can query beta user progress via SQL

---

## Testing Checklist

### Local Development

1. Set `NUXT_PUBLIC_APP_MODE=disabled` (or `validation`)
2. Create two test users via magic link
3. Set one user's `is_beta = true` in local Supabase
4. Verify beta user can access `/dashboard`
5. Verify non-beta user is redirected to `/`
6. Set `NUXT_PUBLIC_APP_MODE=enabled`
7. Verify both users can access `/dashboard`

### Production Verification (After Deploy)

1. Verify public visitors see landing page (no change)
2. Verify `/login` is accessible
3. Log in as a non-beta user → confirm redirect to `/`
4. Set `is_beta = true` on test user in production Supabase
5. Log in as beta user → confirm access to `/dashboard`
6. Walk through onboarding and first conversation as beta user

---

## Security Notes

- `is_beta` is only writable via service role (Supabase dashboard or server-side). Users cannot grant themselves beta access.
- Existing RLS policies prevent users from reading other users' profiles.
- The beta check adds one database query per protected route navigation. This is a read-only query on the user's own profile row, covered by existing RLS.
- No new API endpoints are exposed. Beta status is not surfaced in any client-facing API.

---

## Future Considerations (Post-Beta)

- **Beta feedback mechanism:** Consider adding a simple feedback button/form in the app for beta users. Could be as simple as a mailto link or a Supabase table for structured feedback. Not in scope for this spec.
- **Beta user identification in analytics:** Could add a custom property in Plausible to distinguish beta vs. regular users. Not critical for 3-10 users.
- **Column cleanup:** After public launch, the `is_beta` column can be removed or repurposed. No urgency — a boolean with a default of `false` is harmless.

---

## Related Documents

- `docs/specs/authentication-spec.md` — Auth setup, magic link flow, middleware
- `docs/specs/stripe-market-validation-spec.md` — Founding member checkout, app mode tri-state (Addendum A)
- `composables/useAppMode.ts` — App mode composable
- `middleware/auth.ts` — Current auth middleware
