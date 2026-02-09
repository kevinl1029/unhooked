# Unhooked - Development Guide

## Tech Stack

- **Framework:** Nuxt 3 (Vue 3 + TypeScript)
- **Auth:** Supabase via `@nuxtjs/supabase`
- **Styling:** Tailwind CSS
- **E2E Testing:** Playwright
- **Hosting:** Vercel

## E2E Testing (Playwright)

### Authentication Pattern

E2E auth uses **API-based setup + `addInitScript`** to avoid the Supabase localStorage timing race.

**How it works:**
1. `auth.setup.ts` calls `/api/test/auth` via HTTP to get a Supabase session (no UI navigation)
2. The session is saved to `playwright/.auth/session.json`
3. A custom fixture (`tests/e2e/fixtures.ts`) injects the token into `localStorage` via `context.addInitScript()` before any page JS runs
4. `storageState` (cookies) handles server-side auth; `addInitScript` handles client-side auth

**Rules for writing E2E tests:**
- Import `{ test, expect }` from `./fixtures`, **NOT** from `@playwright/test`
- For unauthenticated tests, use BOTH: `test.use({ storageState: { cookies: [], origins: [] }, noAuth: true })`
- The `/test-login` page exists as a fallback but is not used by default

**Required env vars for E2E:**
- `E2E_TEST_EMAIL` and `E2E_TEST_PASSWORD` in `.env.test`
- `SUPABASE_URL` in `.env` or `.env.local`

### Illusion Key Mapping

Database uses string keys, not numbers:
- 1 = `stress_relief`, 2 = `pleasure`, 3 = `willpower`, 4 = `focus`, 5 = `identity`

## API Patterns

- All authenticated endpoints use `serverSupabaseUser(event)` for auth
- Use `serverSupabaseServiceRole(event)` for database queries (bypasses RLS)
- Test-only endpoints (`server/api/test/`) are blocked in production via `NODE_ENV` check
