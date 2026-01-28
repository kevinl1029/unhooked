# Illusion Key Migration Specification

**Version:** 1.0
**Created:** 2026-01-27
**Status:** Ready for Implementation
**Document Type:** Technical Specification (Refactor)

---

## Overview

This specification guides the migration from `illusion_number` (integer 1-5) to `illusion_key` (string identifiers) as the primary illusion identifier throughout the Unhooked codebase.

**Goal:** Eliminate redundant `illusion_number` usage and standardize on `illusion_key` for all APIs, routes, client code, and database operations.

**Why:** See ADR-006 in `docs/decisions/architecture-decisions.md` for the full decision rationale.

---

## Current State Summary

### The Mapping (Static, 1:1)

```typescript
// From server/utils/llm/task-types.ts
stress_relief: { number: 1, displayName: 'The Stress Relief Illusion' }
pleasure:      { number: 2, displayName: 'The Pleasure Illusion' }
willpower:     { number: 3, displayName: 'The Willpower Illusion' }
focus:         { number: 4, displayName: 'The Focus Illusion' }
identity:      { number: 5, displayName: 'The Identity Illusion' }
```

### What Uses Numbers Today

| Location | File | Current Usage |
|----------|------|---------------|
| Core session route | `pages/session/[illusion].vue` | Route param is number, converts to key internally |
| Session navigation | `pages/session/[illusion].vue:378` | `router.push(\`/session/${nextIllusionNumber}\`)` |
| Chat API | `server/api/chat.post.ts` | Accepts `illusionNumber`, converts immediately |
| Conversations GET | `server/api/conversations/index.get.ts` | Query param `illusionNumber` |
| Conversations POST | `server/api/conversations/index.post.ts` | Body param `illusionNumber` |
| Complete session | `server/api/progress/complete-session.post.ts` | Body param `illusionNumber` |
| Prompt builder | `server/utils/prompts/index.ts` | Maps keyed by number (`ILLUSION_NAMES[number]`) |
| Voice chat composable | `composables/useVoiceChat.ts` | Option `illusionNumber` |
| Progress composable | `composables/useProgress.ts` | `completeSession(id, illusionNumber)` |
| Database | `conversations.illusion_number` | Column stored but never queried |

### What Already Uses Keys

| Location | File | Notes |
|----------|------|-------|
| Reinforcement route | `pages/reinforcement/[illusion].vue` | Already uses keys in URL |
| Session complete handler | `server/utils/session/session-complete.ts` | Takes `illusionKey` |
| Context builder | `server/utils/personalization/context-builder.ts` | Uses `illusionKey` |
| Moment detection | All moment-related code | Uses `illusion_key` column |
| Conviction tracking | All conviction-related code | Uses `illusionKey` |
| Reinforcement API | `server/api/reinforcement/start.post.ts` | Uses `illusion_key` |

---

## Migration Phases

### Phase 1: API Backward Compatibility Layer

**Goal:** APIs accept both `illusionNumber` and `illusionKey`, preferring key when provided.

**Files to modify:**

1. **`server/api/chat.post.ts`**
   - Add `illusionKey?: string` to request body type
   - Logic: `const effectiveKey = illusionKey || illusionNumberToKey(illusionNumber)`
   - Update conversation insert to only set `illusion_key` (stop writing `illusion_number`)
   - Keep accepting `illusionNumber` for backward compat

2. **`server/api/conversations/index.post.ts`**
   - Add `illusionKey?: string` to request body
   - Prefer key over number when both provided
   - Update insert to only set `illusion_key`

3. **`server/api/conversations/index.get.ts`**
   - Add `illusionKey` query param
   - Query by `illusion_key` column (already indexed)
   - Keep `illusionNumber` query param for backward compat

4. **`server/api/progress/complete-session.post.ts`**
   - Add `illusionKey?: string` to request body
   - Remove range validation (1-5) when using key; use `ILLUSION_KEYS.includes()`
   - Prefer key when provided

**Testing:**
- Verify existing client code (sending numbers) still works
- Verify new key-based calls work
- Verify conversation records only have `illusion_key` set going forward

---

### Phase 2: Refactor Prompt Builder Maps

**Goal:** Change prompt utility maps from number-keyed to key-keyed.

**File:** `server/utils/prompts/index.ts`

**Current:**
```typescript
const ILLUSION_NAMES: Record<number, string> = {
  1: 'The Stress Relief Illusion',
  2: 'The Pleasure Illusion',
  // ...
}
```

**Target:**
```typescript
const ILLUSION_NAMES: Record<IllusionKey, string> = {
  stress_relief: 'The Stress Relief Illusion',
  pleasure: 'The Pleasure Illusion',
  // ...
}
```

**Changes:**
1. Change `ILLUSION_NAMES` to key-based
2. Change `ILLUSION_PROMPTS` to key-based
3. Change `ILLUSION_OPENING_MESSAGES` to key-based
4. Update `BuildSystemPromptOptions.illusionNumber` to `illusionKey: IllusionKey`
5. Update all callers of `buildSystemPrompt()` to pass key instead of number

**Note:** Consider consolidating with `ILLUSION_DATA` in `task-types.ts` to have one source of truth.

---

### Phase 3: Migrate Client Code

**Goal:** Client sends `illusionKey` instead of `illusionNumber` to all APIs.

**Files to modify:**

1. **`pages/session/[illusion].vue`**
   - Change route param handling from number to key
   - Update API calls to send `illusionKey`
   - Update navigation to use keys: `router.push(\`/session/${nextIllusionKey}\`)`
   - Rename file to `[illusionKey].vue` (optional, for clarity)

2. **`composables/useVoiceChat.ts`**
   - Change option from `illusionNumber?: number` to `illusionKey?: IllusionKey`
   - Update API call to send `illusionKey`

3. **`composables/useProgress.ts`**
   - Change `completeSession(id, illusionNumber)` to `completeSession(id, illusionKey)`
   - Update API call

4. **`pages/dashboard.vue`**
   - Update any navigation to session pages to use keys
   - E.g., `navigateTo(\`/session/${illusionKey}\`)` instead of number

**URL Structure Change:**

| Before | After |
|--------|-------|
| `/session/1` | `/session/stress_relief` |
| `/session/2` | `/session/pleasure` |
| `/session/3` | `/session/willpower` |
| `/session/4` | `/session/focus` |
| `/session/5` | `/session/identity` |

---

### Phase 4: Add URL Redirects

**Goal:** Old numeric URLs redirect to new key-based URLs.

**Option A: Nuxt middleware**

Create `middleware/illusion-redirect.global.ts`:
```typescript
export default defineNuxtRouteMiddleware((to) => {
  if (to.path.startsWith('/session/')) {
    const param = to.params.illusion || to.params.illusionKey
    const num = parseInt(param as string)
    if (!isNaN(num) && num >= 1 && num <= 5) {
      const key = illusionNumberToKey(num)
      if (key) {
        return navigateTo(`/session/${key}`, { redirectCode: 301 })
      }
    }
  }
})
```

**Option B: Vercel redirects**

Add to `vercel.json`:
```json
{
  "redirects": [
    { "source": "/session/1", "destination": "/session/stress_relief", "permanent": true },
    { "source": "/session/2", "destination": "/session/pleasure", "permanent": true },
    { "source": "/session/3", "destination": "/session/willpower", "permanent": true },
    { "source": "/session/4", "destination": "/session/focus", "permanent": true },
    { "source": "/session/5", "destination": "/session/identity", "permanent": true }
  ]
}
```

**Recommendation:** Use Option B (Vercel redirects) for better performance—handled at edge before hitting app.

---

### Phase 5: Remove Backward Compatibility

**Goal:** Remove `illusionNumber` parameter support from APIs.

**Prerequisites:**
- All client code migrated (Phase 3 complete)
- Redirects in place (Phase 4 complete)
- Monitoring confirms no `illusionNumber` usage in production

**Files to modify:**

1. **`server/api/chat.post.ts`**
   - Remove `illusionNumber` from request body type
   - Remove `illusionNumberToKey()` conversion
   - Only accept `illusionKey`

2. **`server/api/conversations/index.post.ts`**
   - Remove `illusionNumber` parameter

3. **`server/api/conversations/index.get.ts`**
   - Remove `illusionNumber` query param

4. **`server/api/progress/complete-session.post.ts`**
   - Remove `illusionNumber` parameter
   - Simplify validation to just key check

---

### Phase 6: Database Cleanup

**Goal:** Remove `illusion_number` column from database.

**Prerequisites:**
- Phase 5 complete (no API usage of `illusionNumber`)
- Backfill verification: all rows have `illusion_key` populated

**Migration SQL:**

```sql
-- Migration: Remove illusion_number column from conversations
-- Prerequisites: All rows must have illusion_key populated

-- 1. Verify no nulls in illusion_key where illusion_number exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM conversations
    WHERE illusion_number IS NOT NULL AND illusion_key IS NULL
  ) THEN
    RAISE EXCEPTION 'Found rows with illusion_number but no illusion_key. Run backfill first.';
  END IF;
END $$;

-- 2. Drop the column
ALTER TABLE conversations DROP COLUMN illusion_number;

-- 3. Update column comment
COMMENT ON TABLE conversations IS 'Chat conversations. illusion_key identifies which illusion the session addresses.';
```

**Backfill SQL (if needed):**

```sql
-- Backfill illusion_key from illusion_number for any rows missing it
UPDATE conversations
SET illusion_key = CASE illusion_number
  WHEN 1 THEN 'stress_relief'
  WHEN 2 THEN 'pleasure'
  WHEN 3 THEN 'willpower'
  WHEN 4 THEN 'focus'
  WHEN 5 THEN 'identity'
  ELSE NULL
END
WHERE illusion_number IS NOT NULL AND illusion_key IS NULL;
```

---

## Additional Migration Targets

Beyond the core migration, consider these cleanup opportunities:

### 1. Consolidate Illusion Data

**Current:** Illusion metadata is scattered:
- `ILLUSION_DATA` in `server/utils/llm/task-types.ts`
- `ILLUSION_NAMES` in `server/utils/prompts/index.ts`
- `ILLUSION_PROMPTS` in `server/utils/prompts/index.ts`
- `ILLUSION_OPENING_MESSAGES` in `server/utils/prompts/index.ts`

**Target:** Single source of truth in `task-types.ts`:
```typescript
export const ILLUSIONS: Record<IllusionKey, {
  displayName: string
  shortName: string
  systemPrompt: string
  openingMessage: string
}> = {
  stress_relief: {
    displayName: 'The Stress Relief Illusion',
    shortName: 'Stress',
    systemPrompt: '...',
    openingMessage: '...'
  },
  // ...
}
```

### 2. Remove Conversion Utilities (Eventually)

After full migration:
- `illusionNumberToKey()` — No longer needed
- `illusionKeyToNumber()` — Only needed if UI displays "Session 1 of 5"

Consider keeping `illusionKeyToNumber()` for display purposes only.

### 3. Database Index Cleanup

The `illusions` table still uses `illusion_number` as primary identifier. Consider:
- Adding `key` column to `illusions` table
- Making `key` the primary lookup (already have `id` as PK)
- This is lower priority since the `illusions` table is mostly static seed data

---

## Testing Checklist

### Phase 1 (API Backward Compat)
- [ ] Existing client sending `illusionNumber` still works
- [ ] New client sending `illusionKey` works
- [ ] Sending both prefers `illusionKey`
- [ ] New conversation records have `illusion_key` populated
- [ ] `illusion_number` column stops being written

### Phase 2 (Prompt Builder)
- [ ] System prompts generate correctly with key input
- [ ] Opening messages work with key input
- [ ] All callers updated

### Phase 3 (Client Code)
- [ ] Session page loads with key URL
- [ ] Session navigation uses keys
- [ ] Voice chat sends `illusionKey`
- [ ] Complete session sends `illusionKey`
- [ ] Dashboard navigation uses keys

### Phase 4 (Redirects)
- [ ] `/session/1` redirects to `/session/stress_relief`
- [ ] All 5 numeric routes redirect correctly
- [ ] Redirects are 301 (permanent)
- [ ] No redirect loops

### Phase 5 (Remove Compat)
- [ ] APIs reject `illusionNumber` (or ignore it)
- [ ] No TypeScript errors after removing types
- [ ] E2E tests pass

### Phase 6 (Database)
- [ ] Migration runs without error
- [ ] No queries reference `illusion_number`
- [ ] Backfill complete (no null `illusion_key` values)

---

## Rollback Plan

Each phase is independently reversible:

1. **Phase 1:** APIs accept both—no rollback needed, just don't proceed
2. **Phase 2:** Revert prompt builder changes; keep number-keyed maps
3. **Phase 3:** Revert client code; keep sending numbers
4. **Phase 4:** Remove redirects from `vercel.json`
5. **Phase 5:** Re-add `illusionNumber` parameter support
6. **Phase 6:** Re-add column with migration; this is the point of no easy return

**Recommendation:** Complete Phases 1-5 before Phase 6. The database change is the hardest to reverse.

---

## Related Documents

- `docs/decisions/architecture-decisions.md` — ADR-006 documenting this decision
- `server/utils/llm/task-types.ts` — Current illusion data and conversion utilities
- `server/utils/prompts/index.ts` — Prompt builder with number-keyed maps

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-27 | Initial specification |
