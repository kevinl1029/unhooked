# Unhooked Phase 2: Implementation Specification
**Version 1.0** | Created: 2026-01-01

## Table of Contents
1. [Overview](#overview)
2. [Technical Decisions](#technical-decisions)
3. [Database Schema](#database-schema)
4. [API Endpoints](#api-endpoints)
5. [System Prompts & AI Behavior](#system-prompts--ai-behavior)
6. [Frontend Architecture](#frontend-architecture)
7. [User Flows](#user-flows)
8. [Implementation Chunks](#implementation-chunks)
9. [Testing Strategy](#testing-strategy)
10. [Deferred Features](#deferred-features)

---

## Overview

### Goal
Transform the generic chat app into the Unhooked nicotine cessation program with structured onboarding, myth-focused sessions, and progress tracking.

### Prerequisites
- ✅ Phase 1.1: Nuxt 3 app deployed
- ✅ Phase 1.2: Supabase auth working
- ✅ Phase 1.3: Chat with Gemini working, conversations persisted

### Core Features
1. **Onboarding Intake** - 5-step form collecting user context
2. **System Prompts** - AI instructions encoding Allen Carr methodology + myth-specific guidance
3. **Myth Sessions** - 5 focused conversations dismantling psychological myths
4. **Progress Tracking** - Current myth, completion status, personalized ordering
5. **Dashboard** - Progress visualization and next session CTA
6. **Session Management** - Completion detection, read-only transcript viewing

---

## Technical Decisions

### Session Resumption
**Decision:** Restart myth from beginning each time
**Rationale:** Simpler implementation, ensures clean session structure. Users can exit and restart, but each attempt is a fresh conversation.
**Implementation:** When user navigates to `/session/[myth]`, always start new conversation. Keep incomplete conversations in DB with `session_completed = false` for potential future analytics.

### Session Completion Validation
**Decision:** Trust AI completely
**Rationale:** Assumes prompt engineering is sufficient. Faster to ship, iterate based on real usage.
**Implementation:** When AI outputs `[SESSION_COMPLETE]` token, immediately mark session complete and show completion UI. No additional validation layers.

### Stuck Users
**Decision:** Exit link only
**Rationale:** Minimal intervention. If users need a break, they can exit and return later. Keeps UI clean.
**Implementation:** Persistent "Exit session" link in top-left of session view. No special "I'm stuck" button or AI frustration detection.

### Intake Field Requirements
**Decision:** Allow skipping optional fields
**Rationale:** Lower friction during onboarding. AI can still personalize without perfect context.
**Implementation:** Required fields: `productTypes`, `usageFrequency`, `primaryReason`. Optional: `yearsUsing`, `previousAttempts`, `longestQuitDuration`, `triggers`.

### Incomplete Conversation Storage
**Decision:** Keep all conversations, mark incomplete
**Rationale:** Preserve data for future analytics/debugging. Users never see old incomplete attempts unless we build history view.
**Implementation:** `conversations` table keeps all records. Use `session_completed` boolean and new `session_abandoned_at` timestamp to distinguish states.

### Myth Replay Access
**Decision:** Clickable to revisit/review
**Rationale:** Allows reinforcement. Users can re-read transcripts of completed myths.
**Implementation:** Progress indicator myths are clickable. Completed myths open read-only transcript view (ChatWindow component with disabled input).

### Dashboard Metrics
**Decision:** Minimal progress only, no time metrics
**Rationale:** Clean, no pressure or guilt mechanics. Just show myths completed and next session.
**Implementation:** Show progress indicator (5 circles) and "X of 5 sessions completed". No "last active" or "days since started" timestamps on dashboard.

### Reminder Hooks
**Decision:** Build hooks now, implement later
**Rationale:** Adds `last_reminded_at` field to schema now for easier future implementation.
**Implementation:** Add nullable `last_reminded_at TIMESTAMP` to `user_progress` table. No reminder logic in Phase 2.

### AI Prompt Strategy
**Decision:** Single prompt works for all models
**Rationale:** Simpler maintenance. Assume Gemini Flash can handle detailed prompts.
**Implementation:** One set of prompts in `server/utils/prompts/`. No model-specific variants.

### AI Guidance Style
**Decision:** Keep qualitative guidance only
**Rationale:** Trust AI to interpret "ask questions more than make statements" naturally. Avoid robotic counting.
**Implementation:** System prompt includes qualitative instructions. No quantitative targets like "2-3 questions per response."

### User Engagement Depth
**Decision:** Gently encourage depth
**Rationale:** Keep conversations substantive without being pushy.
**Implementation:** Add to system prompt: "If user gives short responses (e.g., 'idk', 'maybe'), gently prompt with 'Tell me more about that' or 'What makes you say that?' Encourage reflection without pressure."

### Message Analytics
**Decision:** Track basic message metadata
**Rationale:** Minimal DB changes, useful later for cohort analysis.
**Implementation:** Add columns to `messages` table: `message_length INTEGER`, `time_since_last_message INTEGER` (seconds since previous message in conversation).

### Intake Form Navigation
**Decision:** Back button only
**Rationale:** Linear flow, simpler state management.
**Implementation:** Progress dots are visual indicators only (not clickable). Back button steps backward sequentially.

### Intake Form Persistence
**Decision:** Save only on final submit
**Rationale:** Simpler API design, atomic transaction. Clean but lost progress if user closes tab.
**Implementation:** All intake data collected in component state. Single POST to `/api/intake` on final step submit. No incremental saves.

### Myth Preview After Intake
**Decision:** Keep opaque
**Rationale:** More mysterious, maintains program flow. User finds out on dashboard.
**Implementation:** No hint shown during intake about which myth they'll start with. Dashboard reveals first session.

### Intake Editing
**Decision:** Allow editing without reset
**Rationale:** Most flexible. Users can update intake fields without losing myth progress.
**Implementation:** Future feature. For Phase 2, intake is submitted once. Add edit UI in later phase.

### Myth Revisit Behavior
**Decision:** Show read-only transcript
**Rationale:** Good for review/reinforcement without muddying progress tracking.
**Implementation:** When user clicks completed myth in progress indicator, navigate to `/session/[myth]?view=transcript`. Load conversation from DB, render in ChatWindow with `disabled` input.

### Dashboard Completed Sessions
**Decision:** Progress indicator only
**Rationale:** Minimal, focused. User sees visual progress and next session CTA.
**Implementation:** No separate "Completed Sessions" list. Just ProgressIndicator component + next session card.

### Post-Completion CTA
**Decision:** Show completion state only, no CTA
**Rationale:** Clean, celebratory. User knows they're done.
**Implementation:** When `program_status === 'completed'`, show completion card with checkmark. No "Revisit Sessions" or "Final Ceremony" button (ceremony is placeholder).

### Session Header Info
**Decision:** Show myth name only (no number)
**Rationale:** Cleaner, less 'curriculum-like.' Feels more conversational.
**Implementation:** Session page shows: "The Stress Myth" or "The Pleasure Myth" in header. No "Session 1" or "2/5" counters.

### Message Schema
**Decision:** Add columns to messages table
**Rationale:** Simpler queries, all data in one place.
**Implementation:** Add `message_length INTEGER` and `time_since_last_message INTEGER` to `messages` table. Calculate on insert.

### Session Abandonment Tracking
**Decision:** Add `session_abandoned_at` field
**Rationale:** Explicit signal makes queries cleaner for future analytics.
**Implementation:** Add `session_abandoned_at TIMESTAMP` to `conversations` table. Set when user exits incomplete session (optional; can also just use `updated_at` + `session_completed = false`).

### Future Schema Fields
**Decision:** Add `last_reminded_at` now
**Rationale:** Minimal cost, schema ready for future reminders.
**Implementation:** Add `last_reminded_at TIMESTAMP` to `user_progress`. Nullable, unused in Phase 2.

### Array Storage
**Decision:** Keep as PostgreSQL arrays
**Rationale:** Simple, fast for static lists. Native array support works well.
**Implementation:** `product_types TEXT[]` and `triggers TEXT[]` in `user_intake` table. No junction tables.

### API Error Handling
**Decision:** Show error with manual retry button
**Rationale:** Honest and simple. User sees what happened and can retry when ready.
**Implementation:** ChatWindow shows error message below messages. User's message preserved in input field. "Retry" button re-sends.

### Session End Options
**Decision:** Two options only - Continue or Dashboard
**Rationale:** Simple choice. Dashboard is the natural "finish for now" destination.
**Implementation:** SessionCompleteCard has two buttons: "Continue to Next Session" (if `nextMyth` exists) or "Return to Dashboard".

### Myth Skipping
**Decision:** No skip option
**Rationale:** All myths valuable even if not primary reason. Completing all 5 is the program.
**Implementation:** No skip button. Users must complete or abandon each myth.

### Session Access Control
**Decision:** Allow free access to any myth
**Rationale:** User controls their journey. More freedom to explore.
**Implementation:** No enforcement of linear progression. User can navigate to `/session/1` through `/session/5` at any time. Dashboard still suggests `current_myth` as next.

### Progress Tracking with Free Access
**Decision:** Keep `current_myth` as 'suggested next'
**Rationale:** Dashboard highlights suggested next myth but user can pick others.
**Implementation:** `current_myth` field determines dashboard "Next Session" CTA. Users can still access any myth via URL or (future) myth selector UI.

### Session Complete Token Position
**Decision:** Must be at end of message
**Rationale:** Only trigger if `[SESSION_COMPLETE]` is in final sentence. Prevents accidental early triggers.
**Implementation:** Check if AI response `.includes('[SESSION_COMPLETE]')` at end (last 50 chars). Strip token from displayed message via computed property.

### Onboarding Exit Option
**Decision:** Browser back button is sufficient
**Rationale:** No special exit option needed. Clean UI.
**Implementation:** No "Not ready yet" link. Users can navigate away or use browser back.

### Ceremony Scope
**Decision:** Keep as placeholder, defer to next phase
**Rationale:** Phase 2 already substantial. Ship 5 myths first, iterate on ceremony later.
**Implementation:** `/ceremony` page shows static placeholder content. No AI conversation in Phase 2.

### Prompt Quality Testing
**Decision:** Ship and iterate based on real usage
**Rationale:** Real user conversations reveal issues better than synthetic tests.
**Implementation:** No pre-launch prompt testing sessions. Deploy and monitor early user feedback.

### Progress Indicator Styling
**Decision:** All use brand-accent orange
**Rationale:** Consistent with brand. Completed vs. incomplete is the only state that matters.
**Implementation:** Completed myths: `bg-brand-accent`. Current myth: `border-brand-accent`. Incomplete: `bg-brand-border`.

### Intake Loading State
**Decision:** Button text change is sufficient
**Rationale:** Clean, minimal code.
**Implementation:** Button text: "Start My Journey" → "Starting..." with `disabled` state. No spinner icon.

### Mobile Testing
**Decision:** Browser responsive mode only
**Rationale:** Faster iteration. Chrome DevTools sufficient for Phase 2.
**Implementation:** Test in Chrome DevTools device mode (iPhone 12, Pixel 5). Real device testing deferred.

### Implementation Chunking
**Decision:** Backend-first, then frontend
**Rationale:** DB migrations → API endpoints → composables → components → pages. Can test APIs independently.
**Chunks:**
1. Database schema + migrations
2. API endpoints (intake, progress, updated chat)
3. System prompts + prompt builder
4. Composables (useIntake, useProgress, updated useChat)
5. Intake form components + onboarding page
6. Session components + session page
7. Dashboard updates + progress indicator
8. Polish + integration testing

### Testing Approach
**Decision:** Test each chunk before proceeding
**Rationale:** Catches issues early.
**Implementation:** After each chunk, verify locally:
- Chunk 1: Run SQL in Supabase, verify tables created
- Chunk 2: Test APIs with Thunder Client/Postman
- Chunk 3: Unit test prompt builder
- Chunk 4: Test composables in isolation
- Chunks 5-7: Manual UI testing in dev
- Chunk 8: Full end-to-end flow test

### Deployment Strategy
**Decision:** Long-lived branch, single merge at end
**Rationale:** Keep `phase-2-program-structure` branch until complete. One big merge when tested.
**Implementation:** All commits on feature branch. Merge to `main` after full Phase 2 testing complete. Deploy to production after merge.

### Session Plan
**Decision:** Multiple sessions with clear milestones
**Rationale:** Natural breaks for testing and regrouping.
**Milestones:**
- Session 1: Chunks 1-3 (Backend foundation)
- Session 2: Chunks 4-5 (Composables + intake flow)
- Session 3: Chunks 6-7 (Session flow + dashboard)
- Session 4: Chunk 8 (Polish + testing)

### Transcript UI
**Decision:** Same ChatWindow component, read-only
**Rationale:** Reuse existing UI, just disable input. Familiar interface.
**Implementation:** Pass `readOnly={true}` prop to ChatWindow. Input section hidden when readOnly. Load conversation messages from DB.

### Session Complete Token Display
**Decision:** Strip immediately, never shown to user
**Rationale:** Professional. Computed property filters it out.
**Implementation:**
```typescript
const displayMessages = computed(() => {
  return messages.value.map(msg => ({
    ...msg,
    content: msg.content.replace('[SESSION_COMPLETE]', '').trim()
  }))
})
```

### Rate Limiting
**Decision:** No rate limiting for Phase 2
**Rationale:** Trust users, keep it simple. Multi-tab edge case is rare.
**Implementation:** No DB or API constraints on session starts. User can have multiple conversations open if they want.

### Safety Guardrails
**Decision:** Add basic safety instructions to system prompt
**Rationale:** Minimal but responsible for sensitive health context.
**Implementation:** Add to base system prompt:
```
## Safety Note
If a user expresses thoughts of self-harm, severe depression, or crisis, respond with empathy and immediately provide: "I'm not equipped to provide crisis support. Please reach out to the 988 Suicide & Crisis Lifeline (call or text 988) or visit 988lifeline.org. You deserve support from trained professionals."
```

---

## Database Schema

### New Tables

#### `user_intake`
Stores onboarding intake responses.

```sql
CREATE TABLE public.user_intake (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,

  -- Nicotine use details
  product_types TEXT[] NOT NULL,  -- ['vape', 'cigarettes', 'pouches', 'chew', 'other']
  usage_frequency TEXT NOT NULL,  -- 'multiple_daily', 'daily', 'several_weekly', 'occasional'
  years_using INTEGER,            -- OPTIONAL

  -- Quit history
  previous_attempts INTEGER DEFAULT 0,      -- OPTIONAL
  longest_quit_duration TEXT,               -- 'never', 'hours', 'days', 'weeks', 'months', 'year_plus' -- OPTIONAL

  -- Primary driver (maps to first myth)
  primary_reason TEXT NOT NULL,  -- 'stress', 'pleasure', 'fear', 'focus', 'identity'

  -- Additional context
  triggers TEXT[],  -- ['stress', 'social', 'boredom', 'morning', 'after_meals', 'driving', 'alcohol', 'work_breaks'] -- OPTIONAL

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `user_progress`
Tracks program progress and completion.

```sql
CREATE TABLE public.user_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,

  -- Program state
  program_status TEXT DEFAULT 'not_started',  -- 'not_started', 'in_progress', 'completed'
  current_myth INTEGER DEFAULT 1,             -- 1-5, suggested next myth
  myth_order INTEGER[] DEFAULT ARRAY[1,2,3,4,5],  -- personalized order based on intake

  -- Completion tracking
  myths_completed INTEGER[] DEFAULT ARRAY[]::INTEGER[],  -- which myths are done

  -- Session tracking
  total_sessions INTEGER DEFAULT 0,

  -- Future hooks
  last_reminded_at TIMESTAMP WITH TIME ZONE,  -- For future reminder system

  -- Timestamps
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  last_session_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Table Modifications

#### `conversations`
Add myth tracking and completion status.

```sql
ALTER TABLE public.conversations
ADD COLUMN myth_number INTEGER,
ADD COLUMN session_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN session_abandoned_at TIMESTAMP WITH TIME ZONE;
```

#### `messages`
Add analytics metadata.

```sql
ALTER TABLE public.messages
ADD COLUMN message_length INTEGER,
ADD COLUMN time_since_last_message INTEGER;  -- seconds since previous message in conversation
```

### Row Level Security (RLS)

```sql
-- Enable RLS
ALTER TABLE public.user_intake ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;

-- Policies for user_intake
CREATE POLICY "Users can read own intake"
  ON public.user_intake FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own intake"
  ON public.user_intake FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own intake"
  ON public.user_intake FOR UPDATE
  USING (auth.uid() = user_id);

-- Policies for user_progress
CREATE POLICY "Users can read own progress"
  ON public.user_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own progress"
  ON public.user_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress"
  ON public.user_progress FOR UPDATE
  USING (auth.uid() = user_id);
```

### Indexes

```sql
CREATE INDEX idx_user_intake_user_id ON public.user_intake(user_id);
CREATE INDEX idx_user_progress_user_id ON public.user_progress(user_id);
CREATE INDEX idx_conversations_myth ON public.conversations(myth_number);
CREATE INDEX idx_conversations_user_myth ON public.conversations(user_id, myth_number);
```

---

## API Endpoints

### `/api/intake` (GET)
Fetch user's intake data.

**Auth:** Required
**Returns:** `IntakeData | null`

```typescript
interface IntakeData {
  id: string
  user_id: string
  product_types: string[]
  usage_frequency: string
  years_using?: number
  previous_attempts?: number
  longest_quit_duration?: string
  primary_reason: string
  triggers?: string[]
  created_at: string
  updated_at: string
}
```

**Error Handling:**
- 401 if not authenticated
- 500 on database error
- Returns `null` if no intake found (PGRST116)

### `/api/intake` (POST)
Save user's intake data and initialize progress.

**Auth:** Required
**Body:**
```typescript
{
  productTypes: string[]        // REQUIRED
  usageFrequency: string        // REQUIRED
  yearsUsing?: number           // OPTIONAL
  previousAttempts?: number     // OPTIONAL
  longestQuitDuration?: string  // OPTIONAL
  primaryReason: string         // REQUIRED
  triggers?: string[]           // OPTIONAL
}
```

**Returns:**
```typescript
{
  intake: IntakeData
  progress: ProgressData
}
```

**Logic:**
1. Validate required fields (`productTypes`, `usageFrequency`, `primaryReason`)
2. Upsert to `user_intake` table
3. Calculate `mythOrder` based on `primaryReason`:
   - Map: `stress→1, pleasure→2, fear→3, focus→4, identity→5`
   - Put mapped myth first, rest in default order
   - Example: `primaryReason='focus'` → `mythOrder=[4,1,2,3,5]`
4. Upsert to `user_progress` table:
   - `program_status = 'in_progress'`
   - `myth_order = mythOrder`
   - `current_myth = mythOrder[0]`
   - `started_at = NOW()`

**Error Handling:**
- 400 if missing required fields
- 500 on database error

### `/api/progress` (GET)
Fetch user's program progress.

**Auth:** Required
**Returns:** `ProgressData | null`

```typescript
interface ProgressData {
  id: string
  user_id: string
  program_status: 'not_started' | 'in_progress' | 'completed'
  current_myth: number  // 1-5
  myth_order: number[]  // [1,2,3,4,5] or personalized
  myths_completed: number[]
  total_sessions: number
  last_reminded_at?: string
  started_at?: string
  completed_at?: string
  last_session_at?: string
  created_at: string
  updated_at: string
}
```

**Error Handling:**
- 401 if not authenticated
- 500 on database error
- Returns `null` if no progress found

### `/api/progress/complete-session` (POST)
Mark a session as complete and update progress.

**Auth:** Required
**Body:**
```typescript
{
  conversationId: string
  mythNumber: number  // 1-5
}
```

**Returns:**
```typescript
{
  progress: ProgressData
  nextMyth: number | null
  isComplete: boolean  // true if all 5 myths done
}
```

**Logic:**
1. Mark conversation as completed: `UPDATE conversations SET session_completed = true WHERE id = conversationId`
2. Fetch current progress
3. Add `mythNumber` to `myths_completed` (deduplicated)
4. Calculate `nextMyth`:
   - Find next incomplete myth in `myth_order`
   - Return `null` if all complete
5. Update progress:
   - `current_myth = nextMyth || current_myth`
   - `program_status = 'completed'` if `myths_completed.length >= 5`
   - `completed_at = NOW()` if complete
   - `last_session_at = NOW()`
   - `total_sessions += 1`
6. Return updated progress + nextMyth + isComplete

**Error Handling:**
- 400 if missing conversationId or mythNumber
- 500 on database error

### `/api/chat` (POST)
Updated to include myth context in system prompt.

**Auth:** Required
**Body:**
```typescript
{
  messages: Message[]
  conversationId?: string
  mythNumber?: number      // NEW: 1-5 for myth sessions
  model?: ModelType
  stream?: boolean
}
```

**Returns (streaming):**
```
data: {"token": "...", "conversationId": "..."}
data: {"done": true, "conversationId": "...", "sessionComplete": true}
```

**Returns (non-streaming):**
```typescript
{
  content: string
  conversationId: string
  sessionComplete: boolean  // NEW: true if AI output contains [SESSION_COMPLETE]
}
```

**Logic:**
1. Authenticate user
2. If `mythNumber` provided:
   - Fetch user intake for personalization context
   - Build system prompt via `buildSystemPrompt(mythNumber, userContext)`
   - Prepend system message to messages array
3. Create or fetch conversation:
   - If new conversation, set `myth_number` and `title = "The [Myth Name]"`
4. Save user message to `messages` table with metadata:
   - Calculate `message_length = content.length`
   - Calculate `time_since_last_message` (seconds since last message in this conversation)
5. Call LLM router with messages
6. Save assistant response to `messages` table with metadata
7. Check if response contains `[SESSION_COMPLETE]`:
   - If streaming: send `{"sessionComplete": true}` in final event
   - If non-streaming: return `sessionComplete: true`
8. Return response + conversationId + sessionComplete

**Error Handling:**
- 401 if not authenticated
- 400 if messages array missing
- 500 on database or LLM error

### `/api/conversations/[id]` (GET)
Fetch a single conversation with all messages (for transcript view).

**Auth:** Required
**Returns:**
```typescript
{
  conversation: {
    id: string
    user_id: string
    title: string
    model: string
    myth_number?: number
    session_completed: boolean
    created_at: string
    updated_at: string
  }
  messages: Message[]
}
```

**Error Handling:**
- 401 if not authenticated
- 403 if conversation doesn't belong to user
- 404 if conversation not found
- 500 on database error

---

## System Prompts & AI Behavior

### Base System Prompt
Location: `server/utils/prompts/base-system.ts`

**Core Philosophy:**
- Goal is to eliminate cravings, not resist them
- Help users see through myths that nicotine provides benefits
- Warm, patient, non-judgmental tone
- Ask questions more than make statements (qualitative guidance)
- Gently encourage depth when users give short responses

**Key Principles:**
1. Nicotine creates the problem it appears to solve
2. "Relief" is just ending withdrawal
3. No genuine pleasure or benefit
4. Quitting is only hard if you believe you're sacrificing
5. Everyone can quit

**Session Structure:**
1. Surface the belief
2. Explore felt experience
3. Introduce reframe
4. Let them discover contradiction
5. Solidify the shift → Output `[SESSION_COMPLETE]`

**Safety Guardrail:**
```
If a user expresses thoughts of self-harm, severe depression, or crisis, respond with empathy and immediately provide: "I'm not equipped to provide crisis support. Please reach out to the 988 Suicide & Crisis Lifeline (call or text 988) or visit 988lifeline.org. You deserve support from trained professionals."
```

### Personalization Context
Built from user intake data:

```typescript
interface UserContext {
  productTypes: string[]
  usageFrequency: string
  yearsUsing?: number
  previousAttempts?: number
  triggers?: string[]
}
```

Generated context example:
```
## About This User

- They use: vape and cigarettes
- Usage frequency: multiple daily
- Years using: 7
- Previous quit attempts: 2
- Main triggers: stress, morning, after meals

Use this context to personalize your questions and examples. Reference their specific product and situations when relevant.
```

### Myth-Specific Prompts
One prompt file per myth in `server/utils/prompts/myths/`:

1. **myth-1-stress.ts** - "Nicotine Relieves My Stress"
2. **myth-2-pleasure.ts** - "I Enjoy It / It's Pleasurable"
3. **myth-3-willpower.ts** - "Quitting Requires Willpower and Is Hard"
4. **myth-4-focus.ts** - "I Need It to Focus / Function"
5. **myth-5-identity.ts** - "I Have an Addictive Personality / I'm Different"

Each myth prompt includes:
- **The Belief** - What user currently believes
- **The Truth** - Alternative explanation to guide them toward
- **Key Questions** - Socratic prompts to ask
- **Reframe Moment** - How to present the alternative view
- **Watch For** - Common resistance patterns
- **Analogies** - Helpful comparisons

### Prompt Builder
Location: `server/utils/prompts/index.ts`

```typescript
export function buildSystemPrompt(mythNumber: number, userContext?: UserContext): string {
  let prompt = BASE_SYSTEM_PROMPT

  if (userContext) {
    prompt += buildPersonalizationContext(userContext)
  }

  const mythPrompt = MYTH_PROMPTS[mythNumber]
  if (mythPrompt) {
    prompt += '\n\n' + mythPrompt
  }

  return prompt
}

export const MYTH_NAMES: Record<number, string> = {
  1: 'The Stress Myth',
  2: 'The Pleasure Myth',
  3: 'The Willpower Myth',
  4: 'The Focus Myth',
  5: 'The Identity Myth',
}
```

### Session Complete Detection
- AI outputs `[SESSION_COMPLETE]` at the **end of the message**
- Token must appear in last 50 characters to be valid
- Immediately triggers:
  1. Mark conversation as `session_completed = true`
  2. Call `/api/progress/complete-session`
  3. Update `user_progress` table
  4. Show SessionCompleteCard UI
- Token is **stripped from displayed message** via computed property

---

## Frontend Architecture

### Composables

#### `composables/useIntake.ts`
Manages intake form state and API calls.

```typescript
interface IntakeData {
  productTypes: string[]
  usageFrequency: string
  yearsUsing?: number
  previousAttempts?: number
  longestQuitDuration?: string
  primaryReason: string
  triggers?: string[]
}

export const useIntake = () => {
  const intake = ref<IntakeData | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const fetchIntake = async () => { ... }
  const saveIntake = async (data: IntakeData) => { ... }

  return { intake, isLoading, error, fetchIntake, saveIntake }
}
```

#### `composables/useProgress.ts`
Manages progress tracking and session completion.

```typescript
interface Progress {
  id: string
  program_status: 'not_started' | 'in_progress' | 'completed'
  current_myth: number
  myth_order: number[]
  myths_completed: number[]
  total_sessions: number
  started_at: string | null
  completed_at: string | null
  last_session_at: string | null
}

export const useProgress = () => {
  const progress = ref<Progress | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const fetchProgress = async () => { ... }
  const completeSession = async (conversationId: string, mythNumber: number) => { ... }
  const getNextMyth = (): number | null => { ... }
  const isMythCompleted = (mythNumber: number): boolean => { ... }

  return {
    progress,
    isLoading,
    error,
    fetchProgress,
    completeSession,
    getNextMyth,
    isMythCompleted
  }
}
```

#### `composables/useChat.ts` (Updated)
No major changes needed. Session completion logic handled in page component.

### Components

#### `components/intake/IntakeForm.vue`
Main intake form container with step management.

**Props:** None
**Emits:** `complete`

**State:**
- `currentStep: number` (1-5)
- `formData: IntakeData`

**Logic:**
- Progress indicator (5 dots, filled based on currentStep)
- Conditional rendering of step components
- `nextStep()` / `prevStep()` navigation
- `handleSubmit()` calls `saveIntake()` and emits `complete`

#### `components/intake/ProductTypeStep.vue`
Step 1: Product type selection (multi-select).

**Options:**
- Vape / E-cigarette
- Cigarettes
- Nicotine pouches (Zyn, etc.)
- Chewing tobacco
- Other

**Validation:** At least one selection required

#### `components/intake/UsageFrequencyStep.vue`
Step 2: Usage frequency (single-select).

**Options:**
- Multiple times a day
- Once a day
- Several times a week
- Occasionally / socially

**Validation:** Required

#### `components/intake/QuitHistoryStep.vue`
Step 3: Previous quit attempts and longest duration.

**Fields:**
- Attempts: 0, 1, 2, 3+ (buttons)
- Duration: Hours, Days, Weeks, Months, Year+ (conditional grid)

**Validation:** None (optional fields)

#### `components/intake/PrimaryReasonStep.vue`
Step 4: Primary reason for use (maps to first myth).

**Options:**
- "It helps me manage stress" → `stress` (Myth 1)
- "I genuinely enjoy it" → `pleasure` (Myth 2)
- "I'm afraid quitting will be too hard" → `fear` (Myth 3)
- "I need it to focus" → `focus` (Myth 4)
- "I think I'm just an addictive person" → `identity` (Myth 5)

**Validation:** Required

#### `components/intake/TriggersStep.vue`
Step 5: Usage triggers (multi-select).

**Options:**
- Morning
- After meals
- Stressful moments
- Social situations
- Boredom
- Driving
- With alcohol
- Work breaks

**Validation:** None (optional)
**Button:** "Start My Journey" → calls `$emit('submit')`

#### `components/ProgressIndicator.vue`
Visual progress tracker for myths.

**Props:**
```typescript
{
  mythOrder: number[]
  mythsCompleted: number[]
  currentMyth: number
}
```

**Rendering:**
- 5 circles in `mythOrder` sequence
- Completed myths: `bg-brand-accent` with checkmark icon
- Current myth: `border-brand-accent bg-brand-accent/20`
- Incomplete myths: `bg-brand-border text-white-65`
- Connecting lines between circles

**Behavior:**
- Completed myths are **clickable** → navigate to `/session/[myth]?view=transcript`
- Incomplete myths are **not clickable** (visual only)
- Current myth is **clickable** → navigate to `/session/[myth]`

#### `components/SessionCompleteCard.vue`
End-of-session completion UI.

**Props:**
```typescript
{
  nextMyth: number | null
}
```

**Emits:**
- `continue(mythNumber: number)` - Continue to next myth
- `dashboard()` - Return to dashboard
- `finish()` - Complete program (navigate to ceremony)

**Rendering:**
- Checkmark icon
- "Session Complete" heading
- "Great work. Take a moment to let this settle." subtext
- Conditional buttons:
  - If `nextMyth`: "Continue to Next Session" (primary)
  - Else: "Complete the Program" (primary)
  - "Return to Dashboard" (secondary)

#### `components/ChatWindow.vue` (Updated)
Add `showNewChat` and `readOnly` props.

**Props:**
```typescript
{
  messages: Message[]
  isLoading: boolean
  error: string | null
  showNewChat?: boolean  // default: true
  readOnly?: boolean     // NEW: default: false
}
```

**Behavior:**
- If `showNewChat=false`: Hide "New chat" button in header
- If `readOnly=true`: Hide input section entirely
- Otherwise: Existing behavior

### Pages

#### `pages/onboarding.vue`
Onboarding intake flow.

**State:**
- `started: boolean` (default: false)

**Rendering:**
- If `!started`: Welcome screen with "Let's Go" button
- If `started`: `<IntakeForm @complete="handleComplete" />`

**Methods:**
- `handleComplete()`: Navigate to `/dashboard`

**Middleware:** `auth` (requires login)

#### `pages/dashboard.vue` (Updated)
Main dashboard showing progress and next session.

**Data Loading:**
- `onMounted()`: Fetch intake + progress in parallel
- If no intake: Redirect to `/onboarding`

**States:**
- **Loading:** Show spinner
- **No intake:** Redirect (shouldn't render)
- **Completed:** Show completion card
- **In progress:** Show progress card + next session card

**Completed Rendering:**
- Checkmark icon
- "You're Unhooked" heading
- Completion message
- Completion timestamp

**In Progress Rendering:**
- User email + sign out button
- ProgressIndicator component
- "X of 5 sessions completed" text
- Next session card:
  - Title: "Session [N]: [Myth Name]"
  - Description: Myth-specific teaser
  - Button: "Start First Session" or "Continue"
  - Link: `/session/[current_myth]`

**No CTA when completed** (per decision)

#### `pages/session/[myth].vue`
Myth session page with chat interface.

**Setup:**
- `mythNumber = parseInt(route.params.myth)`
- `useProgress()` composable
- `messages`, `conversationId`, `isLoading`, `error`, `sessionComplete` state

**Query Params:**
- If `route.query.view === 'transcript'`: Load conversation and show read-only chat
- Else: New session (fresh conversation)

**Transcript Mode:**
- Fetch conversation via `/api/conversations/[id]`
- Find most recent completed conversation for this myth
- Render ChatWindow with `readOnly={true}`
- No session complete logic

**Session Mode:**
- Show "Exit session" link (navigate to `/dashboard`)
- If `sessionComplete`: Show SessionCompleteCard
- Else: Show ChatWindow
- `handleSend()`:
  1. Add user message to `messages`
  2. POST to `/api/chat` with `mythNumber` and `stream=true`
  3. Stream tokens into assistant message
  4. If `sessionComplete` received:
     - Call `completeSession(conversationId, mythNumber)`
     - Fetch updated progress
     - Set `sessionComplete = true`
  5. Handle errors (show error, keep message in input)

**Session Complete Actions:**
- `handleContinue(nextMythNumber)`: Navigate to `/session/[nextMythNumber]`
- `handleDashboard()`: Navigate to `/dashboard`
- `handleFinish()`: Navigate to `/ceremony`

**Header:**
- Show myth name only (e.g., "The Stress Myth")
- No session number or X/5 counter

**Access Control:**
- No enforcement of linear progression
- User can access any myth 1-5 via URL
- Dashboard still suggests `current_myth`

#### `pages/ceremony.vue`
Placeholder completion ceremony.

**Rendering:**
- Celebration icon
- "The Final Step" heading
- Inspirational text about freedom
- "The ceremony conversation is coming soon" note
- "Return to Dashboard" button

**Middleware:** `auth`

---

## User Flows

### First-Time User Flow
1. User signs up / logs in (Phase 1.2 auth)
2. Lands on `/dashboard`
3. Dashboard detects no intake → redirects to `/onboarding`
4. Onboarding welcome screen → clicks "Let's Go"
5. IntakeForm steps 1-5:
   - Product types (multi-select)
   - Usage frequency (single-select)
   - Quit history (optional)
   - Primary reason (single-select) → determines first myth
   - Triggers (multi-select, optional)
6. Click "Start My Journey"
7. POST to `/api/intake` → creates intake + progress
8. Navigate to `/dashboard`
9. Dashboard shows:
   - Progress: 0/5 sessions completed
   - Next session card for myth based on `primary_reason`
10. Click "Start First Session"
11. Navigate to `/session/[myth]`
12. Chat with AI through myth conversation
13. AI outputs `[SESSION_COMPLETE]` at end
14. SessionCompleteCard appears
15. Choose: Continue to next myth or return to dashboard

### Returning User Flow
1. User logs in
2. Lands on `/dashboard`
3. Dashboard shows:
   - Progress: X/5 sessions completed
   - Next session CTA
4. Click "Continue" → navigate to `/session/[current_myth]`
5. New conversation starts (previous incomplete conversation ignored)
6. Complete session as above

### Completed Program Flow
1. User completes 5th myth
2. Progress updated: `program_status = 'completed'`
3. Dashboard shows completion card:
   - Checkmark
   - "You're Unhooked"
   - Completion message
   - No CTA (per decision)
4. User can click completed myths in ProgressIndicator to view transcripts

### Transcript Viewing Flow
1. From dashboard, user clicks completed myth circle in ProgressIndicator
2. Navigate to `/session/[myth]?view=transcript`
3. Load most recent completed conversation for that myth
4. Render ChatWindow with `readOnly={true}`
5. User can read conversation but not send messages
6. "Exit session" link returns to dashboard

### Abandonment Flow
1. User starts session, chats partially
2. Clicks "Exit session" or navigates away
3. Conversation saved with `session_completed = false`
4. (Optional) Set `session_abandoned_at = NOW()`
5. User returns later, clicks same myth
6. New conversation starts (old incomplete conversation remains in DB but not shown)

---

## Implementation Chunks

### Chunk 1: Database Schema
**Goal:** Set up all tables, columns, RLS, indexes

**Tasks:**
1. Run SQL migration in Supabase SQL Editor:
   - Create `user_intake` table
   - Create `user_progress` table
   - Alter `conversations` (add `myth_number`, `session_completed`, `session_abandoned_at`)
   - Alter `messages` (add `message_length`, `time_since_last_message`)
   - Enable RLS on new tables
   - Create policies
   - Create indexes
2. Verify in Supabase dashboard:
   - Tables exist
   - Columns correct
   - RLS enabled
   - Policies active

**Testing:**
- Insert sample row into `user_intake` via SQL
- Insert sample row into `user_progress` via SQL
- Query to verify RLS works (can only see own data)

**Estimated Time:** 30 minutes

---

### Chunk 2: API Endpoints
**Goal:** Build all backend APIs

**Tasks:**
1. Create `server/api/intake/index.get.ts`
   - Fetch user intake
   - Return null if not found
2. Create `server/api/intake/index.post.ts`
   - Validate required fields
   - Upsert intake
   - Calculate myth order from primary_reason
   - Upsert progress
   - Return both
3. Create `server/api/progress/index.get.ts`
   - Fetch user progress
   - Return null if not found
4. Create `server/api/progress/complete-session.post.ts`
   - Mark conversation complete
   - Update progress (add to myths_completed, update current_myth, etc.)
   - Return updated progress + nextMyth + isComplete
5. Update `server/api/chat.post.ts`
   - Accept `mythNumber` param
   - Fetch intake if mythNumber provided
   - Build system prompt via prompt builder
   - Prepend system message to messages array
   - Save messages with metadata (message_length, time_since_last_message)
   - Detect `[SESSION_COMPLETE]` token
   - Return `sessionComplete` flag
6. Create `server/api/conversations/[id].get.ts`
   - Fetch single conversation + messages
   - Verify user owns conversation
   - Return conversation + messages

**Testing:**
- Use Thunder Client / Postman to test each endpoint
- Verify intake creation
- Verify progress initialization
- Verify session completion updates
- Verify chat includes system prompt
- Test with mock mythNumber

**Estimated Time:** 2-3 hours

---

### Chunk 3: System Prompts
**Goal:** Build all prompts and prompt builder

**Tasks:**
1. Create `server/utils/prompts/base-system.ts`
   - Export `BASE_SYSTEM_PROMPT` (core philosophy, session structure, safety guardrail)
   - Export `UserContext` interface
   - Export `buildPersonalizationContext(user: UserContext): string`
2. Create `server/utils/prompts/myths/myth-1-stress.ts`
   - Export `MYTH_1_STRESS_PROMPT`
3. Create `server/utils/prompts/myths/myth-2-pleasure.ts`
   - Export `MYTH_2_PLEASURE_PROMPT`
4. Create `server/utils/prompts/myths/myth-3-willpower.ts`
   - Export `MYTH_3_WILLPOWER_PROMPT`
5. Create `server/utils/prompts/myths/myth-4-focus.ts`
   - Export `MYTH_4_FOCUS_PROMPT`
6. Create `server/utils/prompts/myths/myth-5-identity.ts`
   - Export `MYTH_5_IDENTITY_PROMPT`
7. Create `server/utils/prompts/index.ts`
   - Import all myth prompts
   - Export `MYTH_PROMPTS` record
   - Export `MYTH_NAMES` record
   - Export `buildSystemPrompt(mythNumber, userContext?)` function

**Testing:**
- Call `buildSystemPrompt(1)` and inspect output
- Call with mock userContext and verify personalization
- Verify all myths have prompts
- Check prompt length (~500-700 tokens each)

**Estimated Time:** 1-2 hours

---

### Chunk 4: Composables
**Goal:** Build frontend state management

**Tasks:**
1. Create `composables/useIntake.ts`
   - `intake` ref
   - `isLoading`, `error` refs
   - `fetchIntake()` - GET `/api/intake`
   - `saveIntake(data)` - POST `/api/intake`
2. Create `composables/useProgress.ts`
   - `progress` ref
   - `isLoading`, `error` refs
   - `fetchProgress()` - GET `/api/progress`
   - `completeSession(conversationId, mythNumber)` - POST `/api/progress/complete-session`
   - `getNextMyth()` - helper to find next incomplete myth
   - `isMythCompleted(mythNumber)` - boolean check
3. Update `composables/useChat.ts` if needed
   - No major changes required
   - Session complete logic in page component

**Testing:**
- Test composables in isolation via dev console
- Mock API calls to verify state updates
- Check error handling

**Estimated Time:** 1 hour

---

### Chunk 5: Intake Components + Onboarding Page
**Goal:** Build intake flow UI

**Tasks:**
1. Create `components/intake/IntakeForm.vue`
   - Step management (currentStep 1-5)
   - Progress indicator dots
   - Form data reactive state
   - nextStep() / prevStep() / handleSubmit()
2. Create `components/intake/ProductTypeStep.vue`
   - Multi-select buttons
   - Validation: at least one required
3. Create `components/intake/UsageFrequencyStep.vue`
   - Single-select buttons
   - Validation: required
4. Create `components/intake/QuitHistoryStep.vue`
   - Attempts buttons (0, 1, 2, 3+)
   - Duration grid (conditional)
   - No validation (optional)
5. Create `components/intake/PrimaryReasonStep.vue`
   - 5 reason cards with descriptions
   - Validation: required
6. Create `components/intake/TriggersStep.vue`
   - Multi-select grid
   - No validation (optional)
   - Submit button: "Start My Journey" → "Starting..."
7. Create `pages/onboarding.vue`
   - Welcome screen
   - IntakeForm component
   - handleComplete() → navigate to dashboard

**Testing:**
- Navigate through all 5 steps
- Test back navigation
- Test validation (try to continue without required fields)
- Submit and verify API call
- Check redirect to dashboard

**Estimated Time:** 2-3 hours

---

### Chunk 6: Session Components + Session Page
**Goal:** Build session flow UI

**Tasks:**
1. Create `components/SessionCompleteCard.vue`
   - Checkmark icon
   - Completion message
   - Conditional buttons (Continue vs. Finish)
   - Emit continue/dashboard/finish
2. Update `components/ChatWindow.vue`
   - Add `showNewChat?: boolean` prop (default: true)
   - Add `readOnly?: boolean` prop (default: false)
   - Hide "New chat" button if showNewChat=false
   - Hide input section if readOnly=true
3. Create `pages/session/[myth].vue`
   - Parse mythNumber from route
   - Check query.view === 'transcript' → load conversation
   - Else: new session mode
   - Render SessionCompleteCard or ChatWindow
   - handleSend() with streaming + session complete detection
   - Strip [SESSION_COMPLETE] token from display
   - Exit link to dashboard
   - Header with myth name

**Testing:**
- Start a session
- Send messages (mock AI if needed)
- Test session complete flow:
  - Mock AI response with `[SESSION_COMPLETE]` token
  - Verify SessionCompleteCard appears
  - Verify token stripped from message
  - Verify progress updated
- Test transcript view (mock completed conversation)
- Test exit link

**Estimated Time:** 2-3 hours

---

### Chunk 7: Dashboard Updates + Progress Indicator
**Goal:** Build dashboard UI with progress tracking

**Tasks:**
1. Create `components/ProgressIndicator.vue`
   - 5 circles in myth_order sequence
   - Color coding (completed, current, incomplete)
   - Checkmark icon for completed
   - Connecting lines
   - Click handlers (completed → transcript, current → session)
2. Update `pages/dashboard.vue`
   - Fetch intake + progress on mount
   - Redirect to onboarding if no intake
   - Loading state
   - Completed state rendering
   - In progress rendering:
     - User email + sign out
     - ProgressIndicator component
     - "X of 5 sessions completed"
     - Next session card with dynamic title/description
     - CTA button to `/session/[current_myth]`

**Testing:**
- Test dashboard with no intake (redirect)
- Test dashboard with 0 myths completed
- Test dashboard with 2 myths completed
- Test dashboard with 5 myths completed (completion state)
- Click myth circles (completed → transcript, incomplete → no action)
- Click next session CTA

**Estimated Time:** 1-2 hours

---

### Chunk 8: Polish + Integration Testing
**Goal:** End-to-end testing and bug fixes

**Tasks:**
1. Full user flow testing:
   - Sign up → onboarding → dashboard → session → completion → dashboard
2. Test all edge cases:
   - Session abandonment (exit mid-session)
   - Restart myth (new conversation)
   - View transcript of completed myth
   - Complete all 5 myths → see completion state
3. Responsive testing:
   - Test in Chrome DevTools mobile mode (iPhone 12, Pixel 5)
   - Verify intake form, chat, dashboard on mobile
4. Error handling:
   - Test API failures (network error, 500 error)
   - Verify retry functionality
   - Check error messages
5. Polish:
   - Animations (fade-in-up)
   - Loading states
   - Button disabled states
   - Responsive spacing
6. Code cleanup:
   - Remove console.logs
   - Add TypeScript types
   - Fix linting errors

**Testing:**
- Complete end-to-end flow 2-3 times
- Test on mobile (responsive mode)
- Test error scenarios
- Verify all acceptance criteria

**Estimated Time:** 2-3 hours

---

## Testing Strategy

### Per-Chunk Testing
After each chunk, verify locally before proceeding.

**Chunk 1 (Database):**
- Insert sample data via SQL
- Verify RLS policies work
- Check indexes exist

**Chunk 2 (APIs):**
- Test each endpoint with Thunder Client / Postman
- Verify authentication
- Check error responses
- Validate data structure

**Chunk 3 (Prompts):**
- Call prompt builder with different myth numbers
- Inspect output length and content
- Verify personalization context

**Chunk 4 (Composables):**
- Test in browser console
- Mock API responses
- Verify state updates

**Chunks 5-7 (UI):**
- Manual testing in dev server
- Navigate through all flows
- Test on mobile (responsive mode)

**Chunk 8 (Integration):**
- Full end-to-end user flows
- Edge case testing
- Responsive testing
- Error scenario testing

### Manual Test Scenarios

**Scenario 1: First-Time User**
1. Sign up with new account
2. Complete onboarding intake
   - Select vape + cigarettes
   - Multiple daily usage
   - Primary reason: stress
3. Verify dashboard shows Myth 1 (Stress) as next session
4. Start session, chat with AI
5. Get AI to output [SESSION_COMPLETE]
6. Verify SessionCompleteCard appears
7. Click "Continue to Next Session"
8. Verify navigates to Myth 2
9. Return to dashboard
10. Verify progress shows 1/5 completed

**Scenario 2: Myth Completion**
1. Log in with existing user (1 myth completed)
2. Start next session
3. Complete session
4. Verify progress updates
5. Click completed myth in ProgressIndicator
6. Verify transcript view loads
7. Verify read-only (can't send messages)

**Scenario 3: Program Completion**
1. Log in with user who has 4 myths completed
2. Complete 5th myth
3. Verify completion card shows
4. Return to dashboard
5. Verify "You're Unhooked" completion state
6. Verify no CTA (just completion message)

**Scenario 4: Abandonment**
1. Start session, send a few messages
2. Click "Exit session"
3. Return to dashboard
4. Start same myth again
5. Verify fresh conversation (not resumed)

**Scenario 5: Free Myth Access**
1. Complete Myth 1
2. Navigate directly to `/session/3` (not current)
3. Verify session loads (no redirect)
4. Start conversation for Myth 3
5. Complete it
6. Verify dashboard updates correctly

**Scenario 6: Mobile Responsive**
1. Open in Chrome DevTools mobile mode
2. Test intake form on small screen
3. Test chat interface on small screen
4. Verify buttons are touch-friendly
5. Check text readability

**Scenario 7: Error Handling**
1. Disconnect network mid-message
2. Verify error shows
3. Verify retry button works
4. Test with 500 error from API
5. Verify graceful degradation

### Acceptance Criteria Checklist

- [ ] Onboarding intake form collects all required data
- [ ] Optional fields can be skipped
- [ ] Primary reason maps to first myth correctly (myth_order personalized)
- [ ] System prompts include base methodology + myth-specific guidance
- [ ] User context (product type, triggers) is injected into prompts
- [ ] Safety guardrail in system prompt (crisis resources)
- [ ] Chat conversations are myth-focused with proper system prompts
- [ ] AI encourages depth when user gives short responses
- [ ] `[SESSION_COMPLETE]` token triggers end-of-session UI
- [ ] Token is stripped from displayed message
- [ ] Progress tracking updates after session completion
- [ ] Dashboard shows accurate progress state
- [ ] ProgressIndicator shows visual progress (circles, checkmarks)
- [ ] Completed myths are clickable → transcript view
- [ ] Transcript view is read-only (ChatWindow with disabled input)
- [ ] Users can continue to next session or return to dashboard
- [ ] Subtle exit link always available during sessions
- [ ] Program completion state shown after all 5 myths
- [ ] No CTA after completion (just completion card)
- [ ] Free myth access (no enforcement of linear progression)
- [ ] Dashboard suggests current_myth but doesn't restrict
- [ ] Message metadata tracked (message_length, time_since_last_message)
- [ ] Incomplete conversations kept in DB with session_completed = false
- [ ] session_abandoned_at timestamp field added
- [ ] last_reminded_at field added to user_progress
- [ ] Mobile responsive (tested in Chrome DevTools)
- [ ] Error handling with manual retry
- [ ] All APIs authenticated and RLS-protected

---

## Deferred Features

### Out of Scope for Phase 2

**Reminders/Notifications**
- Email or push notifications for inactive users
- Hooks are in place (`last_reminded_at` field)
- Implementation in future phase

**AI Assessment of User Shift**
- Advanced validation of session completion quality
- Confidence scoring
- Defer to Phase 2.5 or 3

**Dynamic Myth Reordering**
- Adjusting myth order based on conversation patterns
- Future optimization

**Full Ceremony Conversation**
- Placeholder page exists
- Full AI-guided ceremony in Phase 2.5 or 3

**Voice Interface**
- Separate phase (Phase 4?)

**Intake Editing UI**
- Allow users to update intake data after submission
- Future enhancement

**Session History View**
- UI to browse all past conversations (complete and incomplete)
- Future feature

**Multi-Tab Session Handling**
- No rate limiting or detection in Phase 2
- Address if it becomes a problem

**Advanced Analytics Dashboard**
- Engagement metrics, time per session, etc.
- Future phase

**Export Transcript**
- Download PDF or share transcript
- Future enhancement

**Myth Selector UI**
- Grid view to pick any myth from dashboard
- For now, just URL navigation and ProgressIndicator clicks

---

## Migration Path

### From Phase 1.3 to Phase 2

**Database:**
1. Run SQL migration in Supabase
2. Existing `conversations` and `messages` tables get new columns
3. New `user_intake` and `user_progress` tables created
4. Existing users have no intake/progress → will redirect to onboarding

**Backend:**
- All existing API endpoints remain functional
- New endpoints added (no breaking changes)
- `/api/chat` accepts new optional params but backward compatible

**Frontend:**
- Dashboard page updated to check for intake
- New pages added (onboarding, session/[myth], ceremony)
- Existing chat functionality preserved

**User Impact:**
- Existing users will need to complete onboarding on next login
- Old conversations remain accessible (generic chats)
- New myth-based conversations separate from old chats

---

## Success Metrics (Post-Launch)

### Onboarding
- % of users who complete intake form
- Avg time to complete intake
- Most common primary_reason

### Engagement
- % of users who start first session
- % of users who complete first myth
- Avg time per session
- % of users who complete all 5 myths

### Quality
- Avg messages per session
- Avg message length (depth proxy)
- Session abandonment rate
- Transcript revisit rate

### Technical
- API error rates
- LLM response times
- Session complete detection accuracy (manual QA)

---

## Rollback Plan

If Phase 2 has critical issues:

1. **Revert Database:** Keep schema (data is safe), but frontend can ignore new tables
2. **Feature Flag:** Add `NUXT_PUBLIC_PHASE_2_ENABLED` env var
   - If false, redirect all new pages to old dashboard
   - Old chat flow works as before
3. **Hotfix Branch:** Create hotfix from pre-Phase-2 commit
4. **Deploy:** Push hotfix to main, deploy to production

---

## Documentation Updates

After Phase 2 completion:

1. Update `CLAUDE.md` with Phase 2 details:
   - New database schema
   - New API endpoints
   - Intake flow
   - Session structure
   - Progress tracking
2. Update `README.md` with:
   - Phase 2 completion status
   - User journey overview
   - Setup instructions (if DB migration needed)
3. Create `PROMPTS.md` (optional):
   - Document prompt architecture
   - Myth-specific guidance
   - Prompt tuning tips

---

## Next Steps After Phase 2

**Immediate Priorities:**
1. Monitor user feedback on myth conversations
2. Iterate on prompts based on real usage
3. Fix any bugs discovered in production

**Phase 2.5 Candidates:**
1. Full ceremony conversation (completion experience)
2. Intake editing UI
3. Session history view
4. Myth selector UI on dashboard

**Phase 3 Candidates:**
1. Reminder/notification system
2. Post-completion reinforcement mode
3. Advanced analytics dashboard
4. Export transcript feature

---

## Appendix: Myth Order Logic

### Primary Reason → First Myth Mapping

```typescript
const reasonToMyth: Record<string, number> = {
  'stress': 1,     // Stress Relief myth first
  'pleasure': 2,   // Pleasure myth first
  'fear': 3,       // Willpower myth first
  'focus': 4,      // Focus myth first
  'identity': 5    // Identity myth first
}
```

### Default Order
`[1, 2, 3, 4, 5]`

### Personalized Order Examples

**User selects "stress" as primary reason:**
- `myth_order = [1, 2, 3, 4, 5]` (no change, stress is already first)

**User selects "focus" as primary reason:**
- `myth_order = [4, 1, 2, 3, 5]` (focus first, then default order)

**User selects "identity" as primary reason:**
- `myth_order = [5, 1, 2, 3, 4]` (identity first, then default order)

### Implementation in `getMythOrder()`

```typescript
function getMythOrder(primaryReason: string): number[] {
  const reasonToMyth: Record<string, number> = {
    'stress': 1,
    'pleasure': 2,
    'fear': 3,
    'focus': 4,
    'identity': 5
  }

  const firstMyth = reasonToMyth[primaryReason] || 1
  const defaultOrder = [1, 2, 3, 4, 5]

  // Put their primary reason first, then follow default order for the rest
  return [firstMyth, ...defaultOrder.filter(m => m !== firstMyth)]
}
```

---

## Appendix: Session Complete Token Logic

### Detection
```typescript
// In streaming response handler
if (data.done && data.sessionComplete) {
  // Mark session complete
  await completeSession(conversationId.value!, mythNumber.value)
  sessionComplete.value = true
}
```

### Stripping from Display
```typescript
const displayMessages = computed(() => {
  return messages.value.map(msg => ({
    ...msg,
    content: msg.content.replace('[SESSION_COMPLETE]', '').trim()
  }))
})
```

### API Detection
```typescript
// In server/api/chat.post.ts
const sessionComplete = response.content.includes('[SESSION_COMPLETE]')

return {
  ...response,
  conversationId: convId,
  sessionComplete
}
```

---

## Appendix: Message Metadata Calculation

### `message_length`
```typescript
const messageLength = content.length
```

### `time_since_last_message`
```typescript
// Fetch last message in this conversation
const { data: lastMessage } = await supabase
  .from('messages')
  .select('created_at')
  .eq('conversation_id', conversationId)
  .order('created_at', { ascending: false })
  .limit(1)
  .single()

const timeSinceLast = lastMessage
  ? Math.floor((Date.now() - new Date(lastMessage.created_at).getTime()) / 1000)
  : null
```

---

**End of Specification**

