# Final Ceremony Feature - Bug Fix PRD

## Executive Summary

The Final Ceremony feature, which serves as the culminating experience for users completing the Unhooked nicotine cessation program, has multiple issues preventing it from functioning correctly. This PRD documents all identified bugs and provides a prioritized task list with acceptance criteria for fixing them.

## Background

The Final Ceremony feature consists of:
1. **Intro Step** - User confirms if they've already quit
2. **Journey Generation** - AI selects and weaves user moments into a narrative
3. **Journey Playback** - Audio playback with word-by-word transcript sync
4. **Final Recording** - User records a message to their future self
5. **Cheat Sheet** - Quick reference of illusions and personal insights
6. **Completion** - Marks ceremony complete and schedules follow-ups

## Critical Issues Identified

### Issue 1: Duplicate Type Definitions (HIGH PRIORITY)

**Problem:** Multiple interfaces with the same name but different structures are causing Nuxt auto-import conflicts.

**Evidence:** Build warnings show:
```
WARN  Duplicated imports "generateCeremonyNarrative", the one from
"/Users/kevinlee/Dev/unhooked/server/utils/llm/index.ts" has been ignored...

WARN  Duplicated imports "CeremonyNarrativeInput"...
WARN  Duplicated imports "CeremonyNarrativeOutput"...
WARN  Duplicated imports "IllusionCheatSheetEntry"...
```

**Root Cause:**
1. `CeremonyNarrativeInput` defined in TWO places with DIFFERENT structures:
   - `server/utils/llm/tasks/ceremony-narrative.ts:9-14` - expects `selectedMoments: CapturedMoment[]`
   - `server/utils/llm/task-types.ts:202-206` - expects `selectedMoments: CeremonyMomentSelection`

2. `CeremonyNarrativeOutput` defined in TWO places with DIFFERENT structures:
   - `server/utils/llm/tasks/ceremony-narrative.ts:22-25` - has `segments: JourneySegment[]`
   - `server/utils/llm/task-types.ts:213-216` - has `audioSegments: AudioSegment[]`

3. `IllusionCheatSheetEntry` defined in TWO places with DIFFERENT field names:
   - `server/utils/ceremony/cheat-sheet-generator.ts:38-46` - camelCase fields
   - `server/utils/llm/task-types.ts:232-240` - snake_case fields

**Impact:** Nuxt's auto-import picks one at random, causing type mismatches that may fail at runtime.

---

### Issue 2: Function Re-exports Causing Conflicts (HIGH PRIORITY)

**Problem:** `server/utils/llm/index.ts` re-exports functions that are also auto-imported from their source files.

**Files Affected:**
- `index.ts:37` exports `selectCeremonyMoments` which is also auto-imported from `tasks/ceremony-select.ts`
- `index.ts:38` exports `generateCeremonyNarrative` which is also auto-imported from `tasks/ceremony-narrative.ts`

**Impact:** Unpredictable which version gets used, causing potential runtime errors.

---

### Issue 3: Missing E2E Test Coverage (MEDIUM PRIORITY)

**Problem:** No E2E tests exist for the ceremony flow, making it impossible to catch regressions.

**Current Test Coverage:**
- Unit tests exist for ceremony-narrative and ceremony-select logic
- No integration tests for API endpoints
- No E2E tests for full user flow

---

### Issue 4: User Status Check on Mount (LOW PRIORITY)

**Problem:** In `ceremony.vue:380-391`, the `checkExistingProgress` function uses `useUserStatus()` incorrectly.

```typescript
async function checkExistingProgress() {
  try {
    const { status } = useUserStatus()
    // status.value is used but fetchStatus() is never called
    if (status.value?.artifacts?.reflective_journey) {
      await loadExistingJourney()
    }
  } catch (err) {
    // Silent fail
  }
}
```

**Impact:** On first mount, `status.value` will be null because data hasn't been fetched yet.

---

### Issue 5: No Loading State for Prepare Endpoint (LOW PRIORITY)

**Problem:** When navigating to `/ceremony`, there's no feedback while checking user readiness.

---

## Task List

### Task 1: Consolidate Duplicate Type Definitions

**Priority:** P0 (Critical)

**Description:** Remove duplicate type definitions and ensure single source of truth for all ceremony-related types.

**Acceptance Criteria:**
- [ ] `CeremonyNarrativeInput` exists in exactly ONE file
- [ ] `CeremonyNarrativeOutput` exists in exactly ONE file
- [ ] `IllusionCheatSheetEntry` exists in exactly ONE file
- [ ] All imports reference the canonical type location
- [ ] No "Duplicated imports" warnings appear during build
- [ ] `npm run build` completes without warnings about duplicate imports
- [ ] Unit tests pass: `npm run test:unit`

**Files to Modify:**
- `server/utils/llm/task-types.ts` - Keep as canonical source
- `server/utils/llm/tasks/ceremony-narrative.ts` - Remove duplicate interfaces, import from task-types
- `server/utils/ceremony/cheat-sheet-generator.ts` - Remove duplicate interface, import from task-types

---

### Task 2: Fix LLM Index Re-exports

**Priority:** P0 (Critical)

**Description:** Remove re-exports from `index.ts` that conflict with auto-imports.

**Acceptance Criteria:**
- [ ] `server/utils/llm/index.ts` does NOT re-export ceremony functions
- [ ] All imports in ceremony endpoints use direct imports from source files
- [ ] No "Duplicated imports" warnings for ceremony functions
- [ ] `npm run build` completes successfully
- [ ] Unit tests pass: `npm run test:unit`

**Files to Modify:**
- `server/utils/llm/index.ts` - Remove ceremony function exports (lines 37-38)
- `server/api/ceremony/prepare.get.ts` - Update imports if needed
- `server/api/ceremony/generate-journey.post.ts` - Update imports if needed

---

### Task 3: Fix useUserStatus Usage in Ceremony Page

**Priority:** P1 (High)

**Description:** Properly fetch user status before checking for existing progress.

**Acceptance Criteria:**
- [ ] `checkExistingProgress()` calls `fetchStatus()` before accessing `status.value`
- [ ] Loading state is shown while fetching status
- [ ] Error state is handled if status fetch fails
- [ ] If user has existing journey, they're taken to journey step
- [ ] If user has completed ceremony, they're redirected to dashboard

**Files to Modify:**
- `pages/ceremony.vue` - Fix `checkExistingProgress` function

---

### Task 4: Add Ceremony Readiness Check

**Priority:** P1 (High)

**Description:** Before starting ceremony, verify user meets all requirements.

**Acceptance Criteria:**
- [ ] On mount, check `/api/ceremony/prepare` endpoint
- [ ] If `ready: false`, show appropriate message explaining what's missing
- [ ] If `ceremony_completed: true`, redirect to dashboard
- [ ] If user doesn't have enough moments (< 3), show message
- [ ] Loading state while checking readiness

**Files to Modify:**
- `pages/ceremony.vue` - Add readiness check on mount

---

### Task 5: Create E2E Tests for Ceremony Flow

**Priority:** P1 (High)

**Description:** Add comprehensive E2E tests for the ceremony feature.

**Acceptance Criteria:**
- [ ] Test: User can start ceremony from intro step
- [ ] Test: Journey generation API is called with correct parameters
- [ ] Test: Journey player displays segments correctly
- [ ] Test: User can skip journey
- [ ] Test: Recording flow works (with mocked audio)
- [ ] Test: Cheat sheet loads and displays
- [ ] Test: Ceremony completes successfully
- [ ] Test: Error states are handled gracefully
- [ ] All tests pass: `npm run test:e2e`

**Files to Create:**
- `tests/e2e/ceremony.spec.ts`
- `tests/e2e/utils/mock-ceremony.ts` (mock utilities)

---

### Task 6: Add Integration Tests for Ceremony API Endpoints

**Priority:** P2 (Medium)

**Description:** Add unit/integration tests for ceremony API endpoints.

**Acceptance Criteria:**
- [ ] Test: `/api/ceremony/prepare` returns correct readiness status
- [ ] Test: `/api/ceremony/generate-journey` validates input
- [ ] Test: `/api/ceremony/generate-journey` handles LLM errors gracefully
- [ ] Test: `/api/ceremony/complete` validates required artifacts
- [ ] Test: `/api/ceremony/cheat-sheet` returns correct format
- [ ] All tests pass: `npm run test:unit`

**Files to Create:**
- `tests/unit/api/ceremony-prepare.test.ts`
- `tests/unit/api/ceremony-generate-journey.test.ts`
- `tests/unit/api/ceremony-complete.test.ts`

---

### Task 7: Fix CheatSheetEntry Interface Inconsistency

**Priority:** P2 (Medium)

**Description:** The `IllusionCheatSheetEntry` interface in `task-types.ts` uses snake_case but the generator uses camelCase.

**Acceptance Criteria:**
- [ ] Single interface definition used throughout
- [ ] Field names are consistent (prefer camelCase for TypeScript)
- [ ] Database queries handle any necessary field mapping
- [ ] Cheat sheet displays correctly in ceremony page
- [ ] Unit tests validate cheat sheet structure

**Files to Modify:**
- `server/utils/llm/task-types.ts` - Update interface
- `server/utils/ceremony/cheat-sheet-generator.ts` - Ensure consistency
- `server/api/ceremony/cheat-sheet.get.ts` - Update if needed

---

### Task 8: Improve Error Messages

**Priority:** P3 (Low)

**Description:** Provide more helpful error messages when ceremony fails.

**Acceptance Criteria:**
- [ ] "Not enough moments" error explains minimum requirement
- [ ] "Not ready" error lists what illusions are incomplete
- [ ] LLM generation failures show user-friendly message
- [ ] Audio recording failures provide troubleshooting hints
- [ ] Network errors suggest retry

**Files to Modify:**
- `pages/ceremony.vue` - Improve error handling
- `server/api/ceremony/*.ts` - Improve error responses

---

## Implementation Order

1. **Task 1 + Task 2** (P0) - Fix duplicate types and re-exports first
2. **Task 3 + Task 4** (P1) - Fix ceremony page logic
3. **Task 5 + Task 6** (P1/P2) - Add test coverage
4. **Task 7** (P2) - Fix remaining type inconsistencies
5. **Task 8** (P3) - Improve error messages

## Testing Strategy

1. After each task, run:
   - `npm run build` - Verify no build warnings
   - `npm run test:unit` - Verify unit tests pass

2. After Tasks 1-4, manually test:
   - Create a ceremony-ready test user using `scripts/seed-ceremony-test-user.sql`
   - Navigate to `/ceremony` and complete the full flow

3. After Task 5-6, run:
   - `npm run test:e2e` - Verify E2E tests pass

## Success Metrics

- Zero duplicate import warnings during build
- Ceremony can be completed end-to-end without errors
- All E2E tests pass
- Unit test coverage for ceremony logic > 80%

## Dependencies

- Supabase database with ceremony tables migrated
- Valid LLM API keys configured
- Test user with completed illusions and captured moments

---

## Appendix: File Reference

### Ceremony Page
- `pages/ceremony.vue` - Main ceremony page component

### API Endpoints
- `server/api/ceremony/prepare.get.ts` - Check ceremony readiness
- `server/api/ceremony/generate-journey.post.ts` - Generate journey narrative
- `server/api/ceremony/journey.get.ts` - Get existing journey
- `server/api/ceremony/journey/[segmentId]/audio.get.ts` - Get segment audio
- `server/api/ceremony/save-final-recording.post.ts` - Save final recording
- `server/api/ceremony/cheat-sheet.get.ts` - Get illusions cheat sheet
- `server/api/ceremony/complete.post.ts` - Complete ceremony

### LLM Tasks
- `server/utils/llm/tasks/ceremony-select.ts` - Moment selection logic
- `server/utils/llm/tasks/ceremony-narrative.ts` - Narrative generation logic
- `server/utils/llm/task-types.ts` - Type definitions

### Components
- `components/JourneyPlayer.vue` - Journey playback component

### Utilities
- `server/utils/ceremony/cheat-sheet-generator.ts` - Cheat sheet generation
- `composables/useAudioRecorder.ts` - Audio recording composable
- `composables/useUserStatus.ts` - User status composable

### Database
- `supabase/migrations/20260105_phase4d_ceremony_artifacts.sql` - Ceremony tables
- `scripts/seed-ceremony-test-user.sql` - Test user seeding script
