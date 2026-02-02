# E2E Test Plan — Coverage & Gaps

**Date:** 2026-02-01
**Current test count:** 49 tests across 7 spec files
**Framework:** Playwright (Chromium, Firefox, WebKit, Mobile Safari)

---

## Current Coverage

| Area | Spec File | Tests | Summary |
|------|-----------|-------|---------|
| Auth | `auth.spec.ts` | 9 | Protected route redirects, authenticated access, new user redirect to onboarding |
| Home | `home.spec.ts` | 4 | Landing content, CTA link, header nav, health API |
| Navigation | `navigation.spec.ts` | 2 | Logo navigation, login page accessibility |
| Onboarding | `onboarding.spec.ts` | 9 | Welcome screen, 5-step intake form, back navigation, submission redirect |
| Dashboard | `dashboard.spec.ts` | 8 | Progress display (0/5, 2/5), next session CTA, completion state |
| Voice Session | `voice-session-diagnostic.spec.ts` | 2 | Streaming TTS audio scheduling, out-of-order chunk handling (diagnostic only) |
| Ceremony | `ceremony.spec.ts` | 15 | Intro, journey generation, recording step, cheat sheet, completion, not-ready states, errors |

### What's well covered
- Authentication guard logic (protected routes, redirects)
- Onboarding intake form (all 5 steps, navigation, submission)
- Dashboard states (new user, in-progress, completed)
- Ceremony flow (most steps, error states, eligibility checks)

### What's diagnostic-only (not full E2E)
- Voice session streaming: tests verify audio chunk scheduling math, not the actual user conversation flow

---

## Gaps — Ordered by Priority

### P0: Core Session Conversation Flow

**Why P0:** This is the primary user interaction in the entire app. There is no E2E test for a user actually having a conversation.

**Spec file to create:** `tests/e2e/session.spec.ts`

**Test cases needed:**

| # | Test Case | Description |
|---|-----------|-------------|
| 1 | Session page loads with AI opening message | Navigate to `/session/[illusion]`, verify AI's first message streams in and displays |
| 2 | Text fallback mode works | Click "Type instead" link, verify text input appears, submit a message, verify AI responds |
| 3 | Conversation turn cycle | Send a message (via text fallback), verify it appears in transcript, verify AI response appears |
| 4 | Session completion triggers post-session flow | Mock API to return `[SESSION_COMPLETE]` token, verify completion UI appears (conviction assessment or redirect) |
| 5 | Returning to an in-progress session resumes it | Navigate away mid-conversation, return to same session URL, verify prior messages are still displayed |
| 6 | Mic permission denied shows text fallback | Mock permission denial, verify text input is offered as alternative |
| 7 | Session with invalid illusion ID shows error | Navigate to `/session/999`, verify error state or redirect |

**Mocking approach:**
- Mock `/api/chat` to return canned SSE responses (already have patterns from diagnostic tests)
- Mock `/api/conversations` for session resume
- Mock `/api/progress` for session state
- Use text fallback mode for most tests (avoids needing to mock MediaRecorder)

---

### P0: Check-In System

**Why P0:** Entire page and flow (`/check-in/[id]`) has zero test coverage. It's a core part of the program loop.

**Spec file to create:** `tests/e2e/check-in.spec.ts`

**Test cases needed:**

| # | Test Case | Description |
|---|-----------|-------------|
| 1 | Check-in page loads with prompt | Navigate to `/check-in/[id]`, verify check-in prompt displays |
| 2 | Text response submission | Enter text response, submit, verify AI acknowledgment appears |
| 3 | Check-in completion redirects to dashboard | Complete check-in interaction, verify redirect back to `/dashboard` |
| 4 | Invalid/expired check-in link | Navigate to `/check-in/invalid-id`, verify redirect to dashboard or error |
| 5 | Dashboard interstitial for pending check-in | Mock a pending check-in in progress API, verify interstitial modal appears on dashboard |
| 6 | Skip check-in option | If skip is available, click it, verify dismissal |

**Mocking approach:**
- Mock `/api/check-in/[id]` for check-in data
- Mock `/api/chat` for AI responses during check-in
- Mock `/api/progress` with pending check-in state for interstitial test

---

### P1: Safari Audio / TTS Regression Tests

**Why P1:** Recently shipped 5 Safari audio fixes (US-001 through US-005) with only unit test coverage. Browser-specific audio behavior can't be fully validated in unit tests.

**Spec file to create:** `tests/e2e/safari-audio.spec.ts` (run in WebKit/Mobile Safari projects only)

**Test cases needed:**

| # | Test Case | Description |
|---|-----------|-------------|
| 1 | AudioContext stays alive across message resets | Start a session, receive AI response with audio, send another message, receive second AI response — verify audio plays for second response (AudioContext not closed between messages) |
| 2 | Audio plays after gesture-initiated session | Tap a button to start session, verify first AI audio response plays (AudioContext created within gesture) |
| 3 | Auto-started conversation recovers audio on first gesture | Load page where AI starts talking without gesture, verify audio is silent/suspended, then tap anywhere, verify audio resumes |
| 4 | JourneyPlayer auto-advances through segments | Start ceremony journey playback, verify segments advance automatically without requiring tap between each one |

**Mocking approach:**
- Mock AudioContext and AudioBufferSourceNode (pattern exists in diagnostic tests)
- Mock `/api/chat` for streaming SSE with audio chunks
- Mock `/api/ceremony/generate-journey` for journey segments
- Filter these tests to WebKit project: `test.describe('Safari audio', () => { test.skip(browserName !== 'webkit') })`

**Key components under test:**
- `composables/useStreamingAudioQueue.ts` — `resetPlaybackState()` preserving context
- `composables/useStreamingTTS.ts` — `preInitAudio()` gesture handling
- `components/JourneyPlayer.vue` — segment auto-advance

---

### P1: Session Progression & Program State

**Why P1:** No test verifies that completing a session actually advances the user through the program.

**Add to:** `tests/e2e/dashboard.spec.ts` or new `tests/e2e/session-progression.spec.ts`

**Test cases needed:**

| # | Test Case | Description |
|---|-----------|-------------|
| 1 | Dashboard updates after session completion | Mock progress at illusion 1, complete session, verify dashboard now shows illusion 2 as current |
| 2 | All illusions complete shows ceremony-ready state | Mock progress with all 5 illusions completed, verify dashboard shows "Begin Ceremony" CTA |
| 3 | Program status transitions render correctly | Verify dashboard renders differently for `not_started`, `in_progress`, `ceremony_ready`, `completed` states |

---

### P1: Sign Out Flow

**Why P1:** No test verifies that sign out works. Simple to write, important to have.

**Add to:** `tests/e2e/auth.spec.ts`

**Test cases needed:**

| # | Test Case | Description |
|---|-----------|-------------|
| 1 | Sign out redirects to home | Click sign out button, verify redirect to `/` or `/login` |
| 2 | After sign out, protected routes redirect to login | Sign out, then navigate to `/dashboard`, verify redirect to `/login` |

---

### P2: Post-Ceremony Dashboard

**Why P2:** Ceremony completion is tested, but the resulting dashboard experience is not.

**Add to:** `tests/e2e/dashboard.spec.ts`

**Test cases needed:**

| # | Test Case | Description |
|---|-----------|-------------|
| 1 | Post-ceremony dashboard shows completion UI | Mock `completed` program status with ceremony done, verify "You're Free" message and artifact cards |
| 2 | Journey replay card links correctly | Verify journey card is present and links to journey playback |
| 3 | Cheat sheet card links correctly | Verify cheat sheet card links to `/cheat-sheet` or equivalent |
| 4 | Support buttons are visible | Verify "I Need Support" or equivalent buttons present |

---

### P2: Reinforcement Sessions

**Why P2:** Post-ceremony feature. Lower priority than core flow but should be tested once stable.

**Spec file to create:** `tests/e2e/reinforcement.spec.ts`

**Test cases needed:**

| # | Test Case | Description |
|---|-----------|-------------|
| 1 | Moment cards display on post-ceremony dashboard | Mock completed user with moments, verify moment cards render |
| 2 | Per-illusion revisit buttons work | Verify each illusion has a revisit/reinforce button, click one, verify navigation to session |
| 3 | "I Need Support" opens support conversation | Click support button, verify conversation interface loads with appropriate context |

---

### P2: Error Handling

**Why P2:** Only ceremony has one error test. Core flows need error coverage.

**Add to:** respective spec files

**Test cases needed:**

| # | Test Case | Where |
|---|-----------|-------|
| 1 | Session API failure shows error with retry | `session.spec.ts` — mock `/api/chat` returning 500, verify error message and retry option |
| 2 | Check-in API failure shows error | `check-in.spec.ts` — mock failure, verify error state |
| 3 | Progress API failure on dashboard | `dashboard.spec.ts` — mock `/api/progress` returning 500, verify graceful degradation |

---

### P3: Mobile-Specific Assertions

**Why P3:** Playwright config has a Mobile Safari project but no tests assert mobile-specific behavior.

**Add to:** existing spec files with conditional blocks

**Test cases needed:**

| # | Test Case | Description |
|---|-----------|-------------|
| 1 | Session UI is usable on mobile viewport | Verify mic button, transcript, and input are visible and tappable on iPhone 14 viewport |
| 2 | Dashboard layout works on mobile | Verify progress, session card, and CTAs are visible without horizontal scroll |
| 3 | Onboarding steps fit mobile viewport | Verify form steps don't overflow on small screen |

---

## Mock Utilities Needed

Current utilities in `tests/e2e/utils/`:
- `mock-auth.ts` — authentication mocking
- `mock-progress.ts` — progress and intake mocking
- `mock-ceremony.ts` — ceremony endpoint mocking

**New utilities to create:**

| Utility | Purpose |
|---------|---------|
| `mock-session.ts` | Mock `/api/chat` SSE streaming, `/api/conversations`, session state |
| `mock-check-in.ts` | Mock `/api/check-in/[id]`, pending check-in state |
| `mock-audio.ts` | Shared AudioContext/MediaRecorder mocking for Safari tests (extract from diagnostic spec) |

---

## Execution Notes

- **Text fallback for most session tests:** Avoids MediaRecorder mocking complexity. Test voice-specific behavior separately in Safari audio tests.
- **Safari-specific tests should be filtered** to WebKit/Mobile Safari projects only using `test.skip()`.
- **Mock all LLM/TTS APIs.** E2E tests should never hit real AI providers.
- **Ceremony tests are the model** for mocking patterns — `ceremony.spec.ts` and `mock-ceremony.ts` demonstrate the current approach well.
