# Unhooked Core Program Technical Implementation

**Version:** 3.2
**Last Updated:** 2026-01-04
**Status:** Active Development
**Implements:** Unhooked Core Program v2.0

---

## Overview

This document specifies the technical implementation for the Unhooked Core Program defined in `unhooked-core-program-epic-v2.0.md`. It covers database schemas, API endpoints, audio management, scheduling systems, and the personalization engine.

**Prerequisites:**
- Phase 1.3 complete — Chat with Gemini, conversations persisted
- Phase 2 complete — Program structure, myths, progress tracking
- Phase 3 complete — Voice chat interface with STT/TTS

**Builds upon:** Existing Supabase schema (users, conversations, messages, user_intake, user_progress)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Enhanced Delivery System                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                   │
│  │   Moment     │    │   Check-In   │    │  Ceremony    │                   │
│  │   Capture    │    │   Scheduler  │    │  Generator   │                   │
│  │   Engine     │    │              │    │              │                   │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘                   │
│         │                   │                   │                            │
│         ▼                   ▼                   ▼                            │
│  ┌─────────────────────────────────────────────────────────────┐            │
│  │                  Personalization Engine                      │            │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │            │
│  │  │   Context   │  │   Moment    │  │   Prompt    │          │            │
│  │  │   Builder   │  │   Retriever │  │   Injector  │          │            │
│  │  └─────────────┘  └─────────────┘  └─────────────┘          │            │
│  └─────────────────────────────────────────────────────────────┘            │
│                                │                                             │
│                                ▼                                             │
│  ┌─────────────────────────────────────────────────────────────┐            │
│  │                      Data Layer                              │            │
│  │  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐ │            │
│  │  │  Moments  │  │   User    │  │  Check-In │  │   Audio   │ │            │
│  │  │   Table   │  │   Story   │  │  Schedule │  │   Clips   │ │            │
│  │  └───────────┘  └───────────┘  └───────────┘  └───────────┘ │            │
│  └─────────────────────────────────────────────────────────────┘            │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### New Tables

#### 0. `myths` (Reference Table)

Reference table for myth keys. Used for foreign key constraints and UI display.

```sql
CREATE TABLE public.myths (
  myth_key TEXT PRIMARY KEY,
  myth_number INTEGER UNIQUE NOT NULL CHECK (myth_number BETWEEN 1 AND 5),
  display_name TEXT NOT NULL,
  short_name TEXT NOT NULL
);

-- Seed data
INSERT INTO public.myths (myth_key, myth_number, display_name, short_name) VALUES
  ('stress_relief', 1, 'The Stress Relief Myth', 'Stress'),
  ('pleasure', 2, 'The Pleasure Myth', 'Pleasure'),
  ('willpower', 3, 'The Willpower Myth', 'Willpower'),
  ('focus', 4, 'The Focus Myth', 'Focus'),
  ('identity', 5, 'The Identity Myth', 'Identity');

-- Note: Myth statements, truths, layer content, and prompts are stored in TypeScript constants
-- (version controlled). Database is for 'what myths exist', code is for 'how to present them'.
```

---

#### 1. `captured_moments`

Stores significant therapeutic moments detected during sessions.

```sql
CREATE TABLE public.captured_moments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,

  -- Moment classification
  moment_type TEXT NOT NULL CHECK (moment_type IN (
    'origin_story',
    'rationalization',
    'insight',
    'emotional_breakthrough',
    'real_world_observation',
    'identity_statement',
    'commitment',
    'fear_resistance'
  )),

  -- Content
  transcript TEXT NOT NULL,  -- Stored verbatim from STT, no cleanup
  audio_clip_path TEXT,  -- Path in Supabase Storage (only for confidence >= 0.85)
  audio_duration_ms INTEGER,  -- NULL if no audio

  -- Context
  myth_key TEXT REFERENCES public.myths(myth_key),
  session_type TEXT CHECK (session_type IN ('core', 'check_in', 'ceremony', 'reinforcement')),
  myth_layer TEXT CHECK (myth_layer IN ('intellectual', 'emotional', 'identity')),

  -- Quality signals
  confidence_score FLOAT DEFAULT 0.8 CHECK (confidence_score BETWEEN 0 AND 1),
  emotional_valence TEXT CHECK (emotional_valence IN ('positive', 'negative', 'neutral', 'mixed')),
  is_user_highlighted BOOLEAN DEFAULT FALSE,  -- Deferred: user-highlighting not in MVP

  -- Usage tracking (deferred for MVP)
  times_played_back INTEGER DEFAULT 0,
  last_used_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for efficient retrieval
CREATE INDEX idx_moments_user_id ON public.captured_moments(user_id);
CREATE INDEX idx_moments_user_myth ON public.captured_moments(user_id, myth_key);
CREATE INDEX idx_moments_user_type ON public.captured_moments(user_id, moment_type);
CREATE INDEX idx_moments_created ON public.captured_moments(user_id, created_at DESC);
CREATE INDEX idx_moments_conversation ON public.captured_moments(conversation_id);

-- RLS
ALTER TABLE public.captured_moments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own moments"
  ON public.captured_moments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own moments"
  ON public.captured_moments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own moments"
  ON public.captured_moments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own moments"
  ON public.captured_moments FOR DELETE
  USING (auth.uid() = user_id);
```

---

#### 2. `conviction_assessments`

Stores conviction assessment results per session. One row per completed session.

```sql
CREATE TABLE public.conviction_assessments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,

  -- Context
  myth_key TEXT REFERENCES public.myths(myth_key) NOT NULL,
  myth_layer TEXT CHECK (myth_layer IN ('intellectual', 'emotional', 'identity')),

  -- Assessment results
  conviction_score INTEGER NOT NULL CHECK (conviction_score BETWEEN 0 AND 10),
  delta INTEGER NOT NULL,  -- Change from previous
  recommended_next_step TEXT CHECK (recommended_next_step IN ('deepen', 'move_on', 'revisit_later')),
  reasoning TEXT,  -- LLM's reasoning (stored for post-launch analysis)

  -- Enrichment: new triggers/stakes discovered this session
  new_triggers TEXT[],  -- New triggers discovered from conversation
  new_stakes TEXT[],    -- New personal stakes discovered

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_conviction_user ON public.conviction_assessments(user_id);
CREATE INDEX idx_conviction_user_myth ON public.conviction_assessments(user_id, myth_key);
CREATE INDEX idx_conviction_conversation ON public.conviction_assessments(conversation_id);

-- No UNIQUE constraint on (myth_key, myth_layer) - allows multiple sessions per layer in future

-- RLS
ALTER TABLE public.conviction_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own assessments"
  ON public.conviction_assessments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can create assessments"
  ON public.conviction_assessments FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

---

#### 3. `user_story`

Structured storage for the user's personal narrative and belief state.

```sql
CREATE TABLE public.user_story (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,

  -- Origin story
  origin_summary TEXT,  -- AI-generated summary of how they started
  origin_moment_ids UUID[],  -- References to captured origin story fragments

  -- Key contextual factors (initialized from intake, enriched by LLM after each conversation)
  primary_triggers TEXT[],  -- Derived from intake + conversations
  personal_stakes TEXT[],  -- Kids, health, career, etc.

  -- Current belief state per myth (snapshot of latest conviction per myth)
  -- Updated after each conviction assessment
  stress_relief_conviction INTEGER DEFAULT 0 CHECK (stress_relief_conviction BETWEEN 0 AND 10),
  stress_relief_key_insight_id UUID REFERENCES public.captured_moments(id),
  stress_relief_resistance_notes TEXT,

  pleasure_conviction INTEGER DEFAULT 0 CHECK (pleasure_conviction BETWEEN 0 AND 10),
  pleasure_key_insight_id UUID REFERENCES public.captured_moments(id),
  pleasure_resistance_notes TEXT,

  willpower_conviction INTEGER DEFAULT 0 CHECK (willpower_conviction BETWEEN 0 AND 10),
  willpower_key_insight_id UUID REFERENCES public.captured_moments(id),
  willpower_resistance_notes TEXT,

  focus_conviction INTEGER DEFAULT 0 CHECK (focus_conviction BETWEEN 0 AND 10),
  focus_key_insight_id UUID REFERENCES public.captured_moments(id),
  focus_resistance_notes TEXT,

  identity_conviction INTEGER DEFAULT 0 CHECK (identity_conviction BETWEEN 0 AND 10),
  identity_key_insight_id UUID REFERENCES public.captured_moments(id),
  identity_resistance_notes TEXT,

  -- Aggregate state
  overall_readiness INTEGER DEFAULT 0 CHECK (overall_readiness BETWEEN 0 AND 10),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS
ALTER TABLE public.user_story ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own story"
  ON public.user_story FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own story"
  ON public.user_story FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own story"
  ON public.user_story FOR UPDATE
  USING (auth.uid() = user_id);
```

---

#### 4. `check_in_schedule`

Manages the timing and state of micro check-ins.

```sql
CREATE TABLE public.check_in_schedule (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Timing
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'America/New_York',

  -- Type and context (observation_debrief removed for MVP)
  check_in_type TEXT NOT NULL CHECK (check_in_type IN (
    'post_session',
    'morning',
    'evening'
  )),
  trigger_myth_key TEXT REFERENCES public.myths(myth_key),
  trigger_session_id UUID REFERENCES public.conversations(id),

  -- Content
  prompt_template TEXT NOT NULL,
  personalization_context JSONB,  -- Injected user data for this check-in

  -- State
  status TEXT DEFAULT 'scheduled' CHECK (status IN (
    'scheduled',
    'sent',
    'opened',
    'completed',
    'skipped',
    'expired'
  )),

  -- Auth token for magic link (24-hour validity)
  magic_link_token TEXT,

  -- Delivery tracking
  email_sent_at TIMESTAMP WITH TIME ZONE,
  opened_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  expired_at TIMESTAMP WITH TIME ZONE,
  response_conversation_id UUID REFERENCES public.conversations(id),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_checkin_user_scheduled ON public.check_in_schedule(user_id, scheduled_for);
CREATE INDEX idx_checkin_status ON public.check_in_schedule(status, scheduled_for);
CREATE INDEX idx_checkin_user_status ON public.check_in_schedule(user_id, status);
CREATE INDEX idx_checkin_token ON public.check_in_schedule(magic_link_token);

-- RLS
ALTER TABLE public.check_in_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own check-ins"
  ON public.check_in_schedule FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own check-ins"
  ON public.check_in_schedule FOR UPDATE
  USING (auth.uid() = user_id);
```

---

#### 5. `ceremony_artifacts`

Stores generated ceremony content and persistent user artifacts.

```sql
CREATE TABLE public.ceremony_artifacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Artifact type
  artifact_type TEXT NOT NULL CHECK (artifact_type IN (
    'reflective_journey',      -- The narrative montage
    'myths_cheat_sheet',       -- Quick reference with their quotes
    'final_recording',         -- Their message to future self
    'journey_audio_montage'    -- Compiled audio clips
  )),

  -- Content
  content_text TEXT,           -- For text-based artifacts
  content_json JSONB,          -- For structured data (myths cheat sheet) - validated by TypeScript interface
  audio_path TEXT,             -- For audio artifacts
  audio_duration_ms INTEGER,

  -- Moment references (for journey artifact)
  included_moment_ids UUID[],

  -- Metadata
  ceremony_completed_at TIMESTAMP WITH TIME ZONE,

  -- Artifacts are immutable once generated
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS
ALTER TABLE public.ceremony_artifacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own artifacts"
  ON public.ceremony_artifacts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own artifacts"
  ON public.ceremony_artifacts FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

---

#### 6. `follow_up_schedule`

Manages post-ceremony check-ins (Day 3, 7, 14, 30, 90, 180, 365).
Follow-up milestones are calculated from ceremony_completed_at.

```sql
CREATE TABLE public.follow_up_schedule (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Timing
  milestone_type TEXT NOT NULL CHECK (milestone_type IN (
    'day_3', 'day_7', 'day_14', 'day_30',
    'day_90', 'day_180', 'day_365'
  )),
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  timezone TEXT NOT NULL,

  -- Auth token for magic link (24-hour validity)
  magic_link_token TEXT,

  -- State
  status TEXT DEFAULT 'scheduled' CHECK (status IN (
    'scheduled', 'sent', 'completed', 'skipped'
  )),

  -- Response
  response_conversation_id UUID REFERENCES public.conversations(id),
  completed_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_followup_user ON public.follow_up_schedule(user_id);
CREATE INDEX idx_followup_status ON public.follow_up_schedule(status, scheduled_for);
CREATE INDEX idx_followup_token ON public.follow_up_schedule(magic_link_token);

-- RLS
ALTER TABLE public.follow_up_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own follow-ups"
  ON public.follow_up_schedule FOR SELECT
  USING (auth.uid() = user_id);
```

---

### Schema Updates to Existing Tables

#### Update `user_progress`

```sql
-- Add enhanced tracking fields
-- Note: No explicit program_day counter. Stage is derived from myth progress:
--   early (myths 1-2), mid (myths 3-4), late (myth 5+)
ALTER TABLE public.user_progress
ADD COLUMN current_myth_key TEXT REFERENCES public.myths(myth_key),
ADD COLUMN current_layer TEXT DEFAULT 'intellectual'
  CHECK (current_layer IN ('intellectual', 'emotional', 'identity')),
ADD COLUMN timezone TEXT DEFAULT 'America/New_York',
ADD COLUMN ceremony_completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN ceremony_skipped_final_dose BOOLEAN DEFAULT FALSE;
```

#### Update `conversations`

```sql
-- Add session type and layer tracking
ALTER TABLE public.conversations
ADD COLUMN session_type TEXT DEFAULT 'core'
  CHECK (session_type IN ('core', 'check_in', 'ceremony', 'reinforcement')),
ADD COLUMN myth_key TEXT REFERENCES public.myths(myth_key),
ADD COLUMN myth_layer TEXT CHECK (myth_layer IN ('intellectual', 'emotional', 'identity')),
ADD COLUMN check_in_id UUID REFERENCES public.check_in_schedule(id),
ADD COLUMN completed_at TIMESTAMP WITH TIME ZONE;  -- Set when [SESSION_COMPLETE] detected
```

---

## TypeScript Interfaces

### Myths Cheat Sheet Schema

The cheat sheet is stored as JSONB but must match this TypeScript interface:

```typescript
// server/utils/types/cheat-sheet.ts

export interface MythCheatSheetEntry {
  myth_key: string           // e.g., 'stress_relief'
  myth_number: number        // 1-5
  display_name: string       // e.g., 'The Stress Relief Myth'
  the_myth: string           // The false belief
  the_truth: string          // The reframe
  your_insight: string | null  // User's captured insight (text only if no audio)
  your_insight_audio_path: string | null  // Path to audio clip if exists
}

export interface MythsCheatSheet {
  myths: MythCheatSheetEntry[]
  generated_at: string  // ISO timestamp
}

// Validation function
export function validateCheatSheet(data: unknown): data is MythsCheatSheet {
  // ... strict validation logic
}
```

---

## LLM Tasks Registry

The enhanced delivery system uses LLMs for multiple discrete tasks beyond the main conversation. Each task can be configured to use a different model via environment variables, optimizing for cost, speed, and capability.

### Task Overview

| Task ID | Task Name | Frequency | Latency Needs | Default Model |
|---------|-----------|-----------|---------------|---------------|
| `llm.conversation` | Main therapeutic dialogue | Every message | Low (streaming) | gemini-pro |
| `llm.moment.detect` | Detect capture-worthy moments | Every 20+ word user message | Medium | gemini-flash |
| `llm.conviction.assess` | Assess belief shift + enrich triggers/stakes | End of session | High OK | gemini-pro |
| `llm.checkin.personalize` | Build personalized check-in prompts | Per check-in | High OK | gemini-flash |
| `llm.story.summarize` | Generate origin story summary | After 2+ origin fragments | High OK | gemini-pro |
| `llm.ceremony.narrative` | Generate journey narrative | Once per user | High OK | gemini-pro |
| `llm.ceremony.select` | Select moments for ceremony | Once per user | High OK | gemini-pro |
| `llm.key_insight.select` | Pick key insight from multiple candidates | After each session | High OK | gemini-pro |

### Environment Variable Configuration

Task models are configured via environment variables with sensible defaults:

```bash
# .env - LLM Task Model Configuration
LLM_TASK_CONVERSATION_MODEL=gemini-pro
LLM_TASK_MOMENT_DETECT_MODEL=gemini-flash
LLM_TASK_CONVICTION_ASSESS_MODEL=gemini-pro
LLM_TASK_CHECKIN_PERSONALIZE_MODEL=gemini-flash
LLM_TASK_STORY_SUMMARIZE_MODEL=gemini-pro
LLM_TASK_CEREMONY_NARRATIVE_MODEL=gemini-pro
LLM_TASK_CEREMONY_SELECT_MODEL=gemini-pro
LLM_TASK_KEY_INSIGHT_SELECT_MODEL=gemini-pro
```

---

### Task Definitions

#### 1. `llm.conversation` — Main Therapeutic Dialogue

**Purpose:** The core myth-dismantling conversation with the user.

**Existing implementation:** Phase 3 chat flow with system prompts from Phase 2.

**Enhanced:** Now receives personalization context injection (user's captured moments, belief state, story fragments). Context is injected transiently into the system prompt for LLM call but NOT stored in message history.

**Model requirements:** Best quality, streaming support, good at Socratic dialogue.

---

#### 2. `llm.moment.detect` — Moment Detection

**Purpose:** Analyze each user message to determine if it contains a capture-worthy therapeutic moment.

**When called:** After every user message with 20+ words, **in parallel** with AI response generation (no latency impact). Detection runs only on user messages, not AI responses.

**Rate limit:** Max 20 detection calls per session to prevent abuse.

**Error handling:** Silent fail on timeout/API error. Log error, continue without capture.

**Input:**
```typescript
{
  userMessage: string
  recentHistory: Message[]  // Last 4-6 messages for context
  currentMythKey: string    // e.g., 'stress_relief'
  sessionType: 'core' | 'check_in' | 'ceremony' | 'reinforcement'
}
```

**Output:**
```typescript
{
  shouldCapture: boolean
  momentType: MomentType | null
  confidence: number  // 0.0-1.0
  emotionalValence: 'positive' | 'negative' | 'neutral' | 'mixed' | null
  keyPhrase: string | null  // The specific phrase to capture (may be subset of full message)
  reasoning: string  // For logging/debugging
}
```

**Prompt template:**
```
Analyze this user message for therapeutic significance in a nicotine cessation context.

USER MESSAGE: "${userMessage}"

RECENT CONTEXT:
${recentHistory}

CURRENT MYTH BEING DISCUSSED: ${mythKey} (${mythDisplayName})

Identify if this message contains any of these moment types:
- ORIGIN_STORY: How they started, context of addiction beginning
- RATIONALIZATION: Stories they tell themselves about why they use
- INSIGHT: A reframe or realization expressed in their own words
- EMOTIONAL_BREAKTHROUGH: Strong emotion (anger, grief, relief, surprise at realization)
- REAL_WORLD_OBSERVATION: Something they noticed in their actual life
- IDENTITY_STATEMENT: How they describe themselves in relation to addiction
- COMMITMENT: Statements about what they want or who they want to be
- FEAR_RESISTANCE: Fears about quitting, resistance to accepting a reframe

Only flag moments with genuine therapeutic significance. Routine acknowledgments ("yeah", "okay", "I see") are NOT moments.

Respond with JSON only:
{
  "shouldCapture": boolean,
  "momentType": "ORIGIN_STORY" | "RATIONALIZATION" | "INSIGHT" | ... | null,
  "confidence": 0.0-1.0,
  "emotionalValence": "positive" | "negative" | "neutral" | "mixed" | null,
  "keyPhrase": "the specific phrase worth capturing" | null,
  "reasoning": "brief explanation of why this is or isn't significant"
}
```

**Thresholds:**
- Capture transcript if `confidence >= 0.7`
- Capture audio only if `confidence >= 0.85`

**Audio capture:** Deferred for MVP. Only transcripts are captured; audio clip storage requires more Phase 3 integration work.

**No visual indicator:** User is not notified when moments are captured.

---

#### 3. `llm.conviction.assess` — Conviction Assessment + Enrichment

**Purpose:** Evaluate the user's belief shift for a specific myth after a session AND extract any new triggers/stakes discovered.

**When called:** At the end of each core session (triggered by `[SESSION_COMPLETE]` token only). Incomplete sessions do NOT trigger assessment.

**Input:**
```typescript
{
  conversationTranscript: Message[]
  mythKey: string
  previousConviction: number  // 0-10, from user_story
  previousInsights: string[]  // Their prior insights on this myth
  existingTriggers: string[]  // Current triggers from user_story
  existingStakes: string[]    // Current stakes from user_story
}
```

**Output:**
```typescript
{
  newConviction: number  // 0-10 (coerced to valid range if LLM outputs invalid)
  delta: number  // Change from previous
  remainingResistance: string | null  // What they're still holding onto
  recommendedNextStep: 'deepen' | 'move_on' | 'revisit_later'  // Stored but not acted on in MVP
  reasoning: string
  newTriggers: string[]  // New triggers discovered in this conversation
  newStakes: string[]    // New personal stakes discovered
}
```

**Conviction validation:** If LLM outputs invalid value (null, out of range, non-integer), coerce to valid 0-10 range. Round floats, clamp to bounds.

**Prompt template:**
```
You are assessing a user's belief shift after a nicotine cessation session focused on "${mythDisplayName}".

THE MYTH: ${mythDescription}
THE TRUTH: ${truthDescription}

PREVIOUS CONVICTION LEVEL: ${previousConviction}/10
PREVIOUS INSIGHTS THEY'VE EXPRESSED:
${previousInsights.map(i => `- "${i}"`).join('\n')}

EXISTING TRIGGERS WE KNOW ABOUT:
${existingTriggers.join(', ') || 'None recorded'}

EXISTING PERSONAL STAKES:
${existingStakes.join(', ') || 'None recorded'}

SESSION TRANSCRIPT:
${conversationTranscript}

Assess their current belief state AND extract any new information:

1. CONVICTION (0-10): How deeply do they now believe the truth vs. the myth?
   - 0-2: Still fully believes the myth
   - 3-4: Intellectually questioning but emotionally attached
   - 5-6: Sees the logic but hasn't felt it
   - 7-8: Genuine shift, some residual doubt
   - 9-10: Fully sees through the myth, embodied understanding

2. REMAINING RESISTANCE: What are they still holding onto, if anything?

3. RECOMMENDED NEXT STEP: Always "move_on" — conviction tracks but does not gate progress

4. NEW TRIGGERS: Any new situations/emotions that trigger their use mentioned in this session?

5. NEW STAKES: Any new personal motivations (kids, health, career, relationship) mentioned?

Respond with JSON only:
{
  "newConviction": number,
  "delta": number,
  "remainingResistance": "description" | null,
  "recommendedNextStep": "move_on",
  "reasoning": "explanation of assessment",
  "newTriggers": ["trigger1", "trigger2"] or [],
  "newStakes": ["stake1"] or []
}
```

**Model requirements:** Analytical, good at nuanced assessment, accuracy over speed.

---

#### 4. `llm.key_insight.select` — Key Insight Selection

**Purpose:** Select the most impactful insight from multiple candidates for a myth.

**When called:** At session end when multiple insights exist for the same myth.

**Input:**
```typescript
{
  insights: CapturedMoment[]  // All insights for this myth
  mythKey: string
  sessionContext: string  // Brief context about what was discussed
}
```

**Output:**
```typescript
{
  selectedMomentId: string
  reasoning: string
}
```

---

#### 5. `llm.checkin.personalize` — Check-In Prompt Personalization

**Purpose:** Generate a personalized check-in prompt based on user's recent sessions and captured moments.

**When called:** When scheduling each check-in (or just before sending).

**Note:** Session summary is NOT included for MVP. Only recent moments are used.

**Input:**
```typescript
{
  checkInType: 'post_session' | 'morning' | 'evening'
  triggerMythKey?: string  // For post-session
  recentMoments: CapturedMoment[]
  mythsCompleted: string[]  // e.g., ['stress_relief', 'pleasure']
  currentMythKey: string
  userFirstName?: string
}
```

**Output:**
```typescript
{
  prompt: string  // The personalized check-in message
  captureGoal: string  // What we're hoping to elicit
}
```

---

#### 6. `llm.story.summarize` — Origin Story Summary

**Purpose:** Synthesize the user's origin story from captured fragments into a coherent summary.

**When called:** After 2+ origin_story type moments are captured.

**Summary quality:** Accept LLM output as-is. Will be refined with more data over time.

**Input:**
```typescript
{
  originFragments: CapturedMoment[]  // All origin_story type moments
  intakeData: UserIntake
}
```

**Output:**
```typescript
{
  summary: string  // 2-4 sentence narrative summary
  keyThemes: string[]  // Recurring themes (stress, social, escape, etc.)
}
```

---

#### 7. `llm.ceremony.narrative` — Journey Narrative Generation

**Purpose:** Generate the reflective journey narrative for the ceremony, weaving together the user's captured moments.

**When called:** At ceremony start (Part 1: Reflective Journey).

**Selection criteria:** Narrative arc — select moments that tell a story: origin → struggle → insight → transformation.

**Input:**
```typescript
{
  selectedMoments: {
    origin: CapturedMoment[]
    rationalizations: CapturedMoment[]
    insights: CapturedMoment[]
    breakthroughs: CapturedMoment[]
    observations: CapturedMoment[]
    commitments: CapturedMoment[]
  }
  userFirstName?: string
  alreadyQuit?: boolean  // Adjusts narrative if they quit before ceremony
}
```

**Output:**
```typescript
{
  narrative: string  // The full journey narrative (600-800 words)
  audioSegments: {
    text: string
    momentIdToInsert?: string  // Where to splice in user's audio clip
  }[]
}
```

---

#### 8. `llm.ceremony.select` — Moment Selection for Ceremony

**Purpose:** Select the most impactful moments to include in the ceremony journey.

**When called:** Before ceremony, as part of preparation.

**Selection criteria:** Narrative arc — ensure moments tell a coherent story from origin through transformation.

**Input:**
```typescript
{
  allMoments: CapturedMoment[]
  maxMoments: number  // Target count (e.g., 10-15)
}
```

**Output:**
```typescript
{
  selectedIds: string[]
  reasoning: {
    [momentId: string]: string  // Why each was selected
  }
}
```

---

### Model Router Integration

```typescript
// server/utils/llm/types.ts

export type LLMTask =
  | 'conversation'
  | 'moment.detect'
  | 'conviction.assess'
  | 'checkin.personalize'
  | 'story.summarize'
  | 'ceremony.narrative'
  | 'ceremony.select'
  | 'key_insight.select'

export interface TaskModelConfig {
  task: LLMTask
  model: ModelType
  temperature?: number
  maxTokens?: number
}

// Default configuration (can be overridden via env vars)
export const DEFAULT_TASK_MODELS: TaskModelConfig[] = [
  { task: 'conversation', model: 'gemini-pro', temperature: 0.7 },
  { task: 'moment.detect', model: 'gemini-flash', temperature: 0.3, maxTokens: 500 },
  { task: 'conviction.assess', model: 'gemini-pro', temperature: 0.3, maxTokens: 1000 },
  { task: 'checkin.personalize', model: 'gemini-flash', temperature: 0.7, maxTokens: 300 },
  { task: 'story.summarize', model: 'gemini-pro', temperature: 0.5, maxTokens: 500 },
  { task: 'ceremony.narrative', model: 'gemini-pro', temperature: 0.8, maxTokens: 2000 },
  { task: 'ceremony.select', model: 'gemini-pro', temperature: 0.3, maxTokens: 1000 },
  { task: 'key_insight.select', model: 'gemini-pro', temperature: 0.3, maxTokens: 500 },
]
```

```typescript
// server/utils/llm/router.ts (updated)

export class ModelRouter {
  private providers: Map<ModelType, LLMProvider> = new Map()
  private taskConfig: Map<LLMTask, TaskModelConfig> = new Map()

  constructor(config: RouterConfig) {
    // ... existing provider initialization ...

    // Initialize task configurations from env vars with defaults
    const taskConfigs = this.loadTaskConfigsFromEnv()
    taskConfigs.forEach(tc => this.taskConfig.set(tc.task, tc))
  }

  private loadTaskConfigsFromEnv(): TaskModelConfig[] {
    const config = useRuntimeConfig()
    return DEFAULT_TASK_MODELS.map(defaultConfig => ({
      ...defaultConfig,
      model: config[`llmTask${pascalCase(defaultConfig.task)}Model`] || defaultConfig.model
    }))
  }

  // New method: get model config for a specific task
  getTaskConfig(task: LLMTask): TaskModelConfig {
    return this.taskConfig.get(task) || DEFAULT_TASK_MODELS.find(t => t.task === task)!
  }

  // New method: execute a task with appropriate model
  // Parses JSON from text response (no JSON mode)
  async executeTask<T>(
    task: LLMTask,
    prompt: string,
    parseResponse: (response: string) => T
  ): Promise<T> {
    const config = this.getTaskConfig(task)
    const provider = this.getProvider(config.model)

    const response = await provider.chat({
      messages: [{ role: 'user', content: prompt }],
      temperature: config.temperature,
      maxTokens: config.maxTokens
    })

    // Parse JSON from text response (no JSON mode used)
    return parseResponse(response.content)
  }
}
```

---

## Audio Storage Strategy

### Supabase Storage Buckets

```sql
-- Create buckets (run in Supabase dashboard or via API)
-- Bucket: captured-moments (private, RLS-protected)
-- Bucket: ceremony-artifacts (private, RLS-protected)
-- Bucket: final-recordings (private, RLS-protected)
```

### Storage Structure

```
captured-moments/
└── {user_id}/
    └── {moment_id}.webm

ceremony-artifacts/
└── {user_id}/
    ├── journey-segments/           # AI-narrated segments for journey playback
    │   ├── segment-001.mp3
    │   ├── segment-002.mp3
    │   └── ...
    └── ceremony-{timestamp}.mp3    # Full ceremony conversation audio (optional)

final-recordings/
└── {user_id}/
    └── final-recording.webm
```

**Note:** Journey artifact uses client-side sequential playback of individual segments + user moment clips. No server-side audio stitching.

### Audio URL Strategy

**Signed URLs** with 1-hour expiry for security. Client refreshes URLs as needed.

```typescript
// server/utils/storage/audio-urls.ts

export async function getSignedAudioUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from('captured-moments')
    .createSignedUrl(path, 3600)  // 1 hour expiry

  if (error) throw error
  return data.signedUrl
}
```

### Audio Clip Management

**When to store audio:**
- High-confidence moment detection (≥0.85) — Deferred for MVP, transcript only
- User records final message in ceremony
- All ceremony narration segments (AI-generated)

**When NOT to store audio:**
- Routine conversational turns
- Low-confidence moment detections (<0.85)
- Check-in responses (store transcript only)
- Regular moments (transcript only for MVP)

**Storage policies:**
- Max clip duration: 60 seconds
- Format: WebM (from recording), MP3 (for TTS narration)
- Retention: Indefinite (user's therapeutic material)
- User can delete via account deletion only
- Raw audio stored without compression/normalization for MVP

---

## API Endpoints

### Moment Capture

#### `POST /api/moments`

Create a new captured moment.

```typescript
// Request
{
  conversation_id: string
  message_id?: string
  moment_type: MomentType
  transcript: string  // Stored verbatim, no cleanup
  myth_key?: string
  session_type: 'core' | 'check_in' | 'ceremony' | 'reinforcement'
  myth_layer?: string
  confidence_score?: number
  emotional_valence?: 'positive' | 'negative' | 'neutral' | 'mixed'
}

// Response
{
  id: string
  moment_type: MomentType
  transcript: string
  created_at: string
}
```

**Note:** Audio capture deferred for MVP. Only transcripts are stored.

#### `GET /api/moments`

Retrieve user's captured moments with filtering.

```typescript
// Query params
?myth_key=stress_relief
&moment_type=insight
&limit=10

// Response
{
  moments: CapturedMoment[]
  total: number
}
```

#### `GET /api/moments/for-context`

Get moments optimized for prompt injection. Returns simple selection (5-8 moments, 1 per type from current myth).

**Future enhancement:** Smart selection with variety across sessions (deferred).

```typescript
// Query params
?myth_key=pleasure
&session_type=core

// Response
{
  origin_fragments: string[]
  relevant_insights: CapturedMoment[]  // Max 1 per type
  recent_observations: CapturedMoment[]
  active_fears: CapturedMoment[]
}
```

---

### User Story

#### `GET /api/user-story`

Get the user's narrative and belief state.

```typescript
// Response
{
  origin_summary: string | null
  primary_triggers: string[]
  personal_stakes: string[]
  myth_states: {
    [myth_key: string]: {
      conviction: number
      key_insight: CapturedMoment | null
      resistance_notes: string | null
    }
  }
  overall_readiness: number
}
```

#### `PATCH /api/user-story`

Update belief state after session.

```typescript
// Request
{
  myth_key: string
  conviction?: number
  key_insight_id?: string
  resistance_notes?: string
  new_triggers?: string[]  // Merged with existing
  new_stakes?: string[]    // Merged with existing
}
```

#### `POST /api/user-story/initialize`

Initialize user_story row when user starts program. Copies triggers from intake.

```typescript
// Called when user_story row is first created
// Copies primary_triggers from user_intake table
```

---

### Check-In Scheduling

#### `POST /api/check-ins/schedule`

Schedule check-ins for a user. Uses rolling 3-day window until ceremony is complete.

```typescript
// Request
{
  trigger: 'session_complete' | 'program_start' | 'daily_refresh'
  session_id?: string
  myth_key?: string
}

// Response
{
  scheduled: CheckIn[]
}
```

#### `GET /api/check-ins/pending`

Get pending check-ins for the current user. Filters out expired at display time.

```typescript
// Response
{
  check_ins: CheckIn[]
  next_check_in: CheckIn | null
}
```

#### `GET /api/check-ins/open/:token`

Open a check-in via magic link token. Token valid for 24 hours.

If token is expired, redirects to most recent pending check-in.

```typescript
// Response
{
  check_in: CheckIn
  prompt: string  // The personalized prompt to display
}
// OR redirect to most recent pending check-in
```

#### `POST /api/check-ins/:id/complete`

Mark check-in complete and capture response. Creates new conversation for the response.

```typescript
// Request
{
  response_conversation_id: string
}
```

---

### Ceremony

#### `GET /api/ceremony/prepare`

Gather all data needed to generate the ceremony.

```typescript
// Response
{
  ready: boolean
  user_story: UserStory
  moments_by_type: {
    origin: CapturedMoment[]
    rationalizations: CapturedMoment[]
    insights: CapturedMoment[]
    breakthroughs: CapturedMoment[]
    observations: CapturedMoment[]
    commitments: CapturedMoment[]
  }
  myths_completed: string[]  // myth_keys
  suggested_journey_moments: CapturedMoment[]  // AI-selected highlights (narrative arc)
}
```

#### `POST /api/ceremony/generate-journey`

Generate the reflective journey narrative as a playlist for client-side playback.

TTS generation is lazy — segments are generated on first play, not upfront.

```typescript
// Request
{
  selected_moment_ids?: string[]  // Override AI selection
}

// Response
{
  journey_text: string  // Full narrative text
  playlist: {
    segments: Array<{
      id: string
      type: 'narration' | 'user_moment'
      text: string  // For lazy TTS generation
      transcript: string
      duration_ms?: number  // Set after TTS generation
      moment_id?: string  // If type is user_moment
      word_timings?: WordTiming[]  // For word-by-word sync
    }>
  }
  artifact_id: string
}
```

**Playback:** Client plays segments sequentially with 0.5-1 second silence between segments. Word-by-word transcript sync using existing TTS word timing support.

#### `GET /api/ceremony/journey/:segmentId/audio`

Get audio for a journey segment. Generates TTS on first request if not cached.

Retry + fallback: Retry once on TTS failure. If still fails, return text-only with 'Audio unavailable' flag.

```typescript
// Response
{
  audio_url: string  // Signed URL (1 hour expiry)
  duration_ms: number
  word_timings: WordTiming[]
}
// OR
{
  audio_unavailable: true
  text: string
}
```

#### `POST /api/ceremony/save-final-recording`

Save the user's final recording. Includes preview capability unique to ceremony.
Unlimited re-record attempts allowed.

```typescript
// Request
{
  audio_blob: Blob
  transcript: string
  is_preview?: boolean  // If true, don't save yet, just return for playback
}

// Response
{
  artifact_id?: string  // Only set if is_preview=false
  audio_path: string    // Temporary path for preview, or permanent path if saved
  transcript: string
}
```

**Ceremony Recording UX:**
1. User records final message
2. Shows preview: "Record a message to your future self" (heading), "What do you want to remember?" (subheading)
3. After recording: "Listen to your message" with play button
4. Two buttons: "Keep this recording" (saves) or "Try again" (re-record)
5. Unlimited re-record attempts allowed
6. This preview flow is ceremony-only; normal sessions auto-submit

#### `POST /api/ceremony/complete`

Mark ceremony as complete and generate all artifacts.

```typescript
// Request
{
  already_quit?: boolean  // Determined by AI asking conversationally during ceremony
}

// Response
{
  artifacts: {
    reflective_journey: CeremonyArtifact
    myths_cheat_sheet: CeremonyArtifact
    final_recording: CeremonyArtifact
  }
  follow_ups_scheduled: FollowUp[]  // Day 3, 7, 14, etc. from ceremony completion date
}
```

#### Already Quit Flow

The `already_quit` flag is determined conversationally during ceremony. AI asks "Before we begin, are you still using, or have you already stopped?"

When `already_quit: true`:
1. **Ceremony preparation** remains the same
2. **Journey narrative** adjusts script: "You didn't even need the ritual. You just... stopped."
3. **Final dose ritual (Part 5)** is skipped entirely
4. **Final recording prompt** adjusts to reflect their organic quit
5. **Artifacts** are generated as normal

#### Ceremony Exit and Restart Behavior

If a user exits the ceremony mid-way:

1. **Keep partial conversation data** — Useful for debugging and analytics
2. **Keep generated journey artifact** — If journey was already generated, preserve it
3. **Start fresh on return** — Create new conversation when user returns
4. **No guilt messaging** — Dashboard shows neutral "Begin Ceremony" button

---

### Check-In Interstitial

#### `GET /api/check-ins/interstitial`

Check if user has pending check-in to show as modal overlay.

```typescript
// Response
{
  has_pending: boolean
  check_in?: {
    id: string
    prompt: string
    type: string
  }
}
```

**Dismissal behavior:** Swipe down on mobile, click outside on desktop. "Skip for now" link also dismisses.

---

### Personalization Context

#### `GET /api/personalization/context`

Get personalization data for prompt injection. Context is used transiently, not stored.

MVP uses simple selection: 5-8 moments total, 1 per type from current myth only.
Cross-myth context is deferred to post-MVP.

```typescript
// Query params
?session_type=core
&myth_key=willpower

// Response
{
  user_context: {
    products_used: string[]
    usage_frequency: string
    years_using: number
    triggers: string[]
  }
  story_context: {
    origin_summary: string
    personal_stakes: string[]
  }
  belief_context: {
    current_myth_conviction: number
    previous_insights: string[]  // Current myth only
    resistance_points: string[]
  }
  moment_context: {
    recent_observations: string[]
    key_rationalizations: string[]
    breakthrough_quotes: string[]
  }
}
```

---

## Check-In Scheduling Engine

### Scheduling Logic

**Current Implementation (MVP):** Only post-session check-ins are active. Morning/evening daily check-ins are coded but dormant (triggers not wired up). See ADR-002 for rationale.

**One Active Post-Session Check-in Rule:** When a new session completes, any pending post-session check-ins from previous sessions are marked as 'expired'. Users only receive check-ins about their most recent core session.

Post-session check-ins are scheduled 2 hours after session completion, only if before 9pm in user's stored timezone.

```typescript
// server/utils/scheduling/check-in-scheduler.ts

interface ScheduleConfig {
  userId: string
  timezone: string  // From user_progress, detected via browser
  trigger: 'session_complete' | 'program_start' | 'daily_refresh'
  sessionId?: string
  mythKey?: string
  sessionEndTime?: Date
}

export async function scheduleCheckIns(config: ScheduleConfig): Promise<CheckIn[]> {
  const { userId, timezone, trigger, sessionEndTime, mythKey } = config
  const scheduled: CheckIn[] = []

  const now = new Date()
  const userNow = toZonedTime(now, timezone)

  if (trigger === 'session_complete' && sessionEndTime) {
    // Post-session check-in: 2 hours later if before 9pm in user's stored timezone
    const twoHoursLater = addHours(sessionEndTime, 2)
    const twoHoursLaterLocal = toZonedTime(twoHoursLater, timezone)

    if (getHours(twoHoursLaterLocal) < 21) {  // Before 9pm
      const hasConflict = await checkForConflict(userId, twoHoursLater, 60)

      if (!hasConflict) {
        scheduled.push(await createCheckIn({
          userId,
          type: 'post_session',
          scheduledFor: twoHoursLater,
          timezone,
          mythKey,
          sessionId: config.sessionId
        }))
      }
    }
  }

  if (trigger === 'program_start' || trigger === 'daily_refresh') {
    // Rolling 3-day window until ceremony complete
    const days = 3

    for (let d = 0; d < days; d++) {
      const targetDate = addDays(now, d)

      // Morning check-in at 9am local
      const morning = setHours(setMinutes(toZonedTime(targetDate, timezone), 0), 9)
      if (morning > now) {
        const exists = await checkInExists(userId, morning, 'morning')
        if (!exists) {
          scheduled.push(await createCheckIn({
            userId,
            type: 'morning',
            scheduledFor: fromZonedTime(morning, timezone),
            timezone
          }))
        }
      }

      // Evening check-in at 7pm local
      const evening = setHours(setMinutes(toZonedTime(targetDate, timezone), 0), 19)
      if (evening > now) {
        const exists = await checkInExists(userId, evening, 'evening')
        if (!exists) {
          scheduled.push(await createCheckIn({
            userId,
            type: 'evening',
            scheduledFor: fromZonedTime(evening, timezone),
            timezone
          }))
        }
      }
    }
  }

  return scheduled
}
```

### Timezone Detection

Timezone is detected via browser on first visit and stored in user_progress:

```typescript
// Client-side on first visit
const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
await $fetch('/api/user/timezone', { method: 'POST', body: { timezone } })
```

### Email Delivery Integration

Emails sent via Resend from `coach@getunhooked.app`. Email contains link only, no prompt content.

**Cron Architecture (ADR-003):**
- **Primary:** GitHub Actions workflow runs every 5 minutes (free tier)
- **Fallback:** Vercel Cron runs daily at 8am UTC (Hobby tier limitation: 1/day max)
- Both call the same idempotent endpoint with CRON_SECRET authentication

```typescript
// server/utils/email/check-in-sender.ts

// Called by GitHub Actions (every 5 min) and Vercel Cron (daily fallback)
// Query window: past 24 hours (catches missed) through future 24 hours
export async function processScheduledCheckIns() {
  const now = new Date()
  const windowStart = new Date(now.getTime() - 24 * 60 * 60 * 1000)  // 24h ago
  const windowEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000)    // 24h ahead

  const checkIns = await supabase
    .from('check_in_schedule')
    .select('*, user:auth.users(email)')
    .eq('status', 'scheduled')
    .gte('scheduled_for', windowStart.toISOString())
    .lt('scheduled_for', windowEnd.toISOString())

  for (const checkIn of checkIns.data) {
    // Generate 24-hour magic link token
    const token = generateSecureToken()

    await supabase
      .from('check_in_schedule')
      .update({ magic_link_token: token })
      .eq('id', checkIn.id)

    await sendCheckInEmail(checkIn, token)

    await supabase
      .from('check_in_schedule')
      .update({
        status: 'sent',
        email_sent_at: now.toISOString()
      })
      .eq('id', checkIn.id)
  }
}

async function sendCheckInEmail(checkIn: CheckIn, token: string) {
  // Using Resend
  await resend.emails.send({
    from: 'coach@unhooked.app',
    to: checkIn.user.email,
    subject: getSubjectLine(checkIn.check_in_type),
    html: `
      <p>You have a check-in waiting.</p>
      <a href="${process.env.APP_URL}/check-in/open/${token}">Open Check-in</a>
    `
  })
}

function getSubjectLine(type: string): string {
  switch (type) {
    case 'morning': return 'Good morning — quick check-in'
    case 'evening': return 'Day\'s winding down — how did it go?'
    case 'post_session': return 'Quick thought from earlier...'
    default: return 'Checking in with you'
  }
}
```

### Check-In Expiration (Display-Time Calculation)

Check-ins don't expire via cron job. Expiration calculated at display time:

```typescript
// server/utils/scheduling/check-in-expiration.ts

/**
 * Check-in windows:
 * - Morning (9am-7pm): Expires at 7pm local time
 * - Evening (7pm-9am next day): Expires at 9am next day local time
 * - Post-session: Expires at end of current window
 */
export function isCheckInExpired(checkIn: CheckIn, userTimezone: string): boolean {
  const now = new Date()
  const scheduledLocal = toZonedTime(checkIn.scheduled_for, userTimezone)
  const hour = getHours(scheduledLocal)

  // Morning window: 9am-7pm (expires at 7pm)
  if (hour >= 9 && hour < 19) {
    const expiry = setHours(setMinutes(scheduledLocal, 0), 19)
    return now > fromZonedTime(expiry, userTimezone)
  }

  // Evening window: 7pm-9am next day (expires at 9am)
  const expiry = hour >= 19
    ? setHours(setMinutes(addDays(scheduledLocal, 1), 0), 9)
    : setHours(setMinutes(scheduledLocal, 0), 9)

  return now > fromZonedTime(expiry, userTimezone)
}
```

### Skip Behavior

When user skips a check-in, it's just logged. No reschedule. They'll get the next scheduled one.

---

## Personalization Engine

### Context Builder

Context is built fresh for each request and injected transiently (not stored in message history).

MVP uses simple selection: 5-8 moments total, 1 per type from current myth only.

```typescript
// server/utils/personalization/context-builder.ts

export async function buildSessionContext(
  userId: string,
  mythKey: string,
  sessionType: 'core' | 'check_in' | 'ceremony' | 'reinforcement'
): Promise<PersonalizationContext> {

  // Fetch all relevant data in parallel
  const [intake, story, mythMoments] = await Promise.all([
    getUserIntake(userId),
    getUserStory(userId),
    getMomentsByMyth(userId, mythKey, { limit: 8 })  // 1 per type max
  ])

  return {
    userContext: {
      productsUsed: intake.product_types,
      usageFrequency: intake.usage_frequency,
      yearsUsing: intake.years_using,
      triggers: story?.primary_triggers || intake.triggers,
      previousAttempts: intake.previous_attempts
    },

    storyContext: {
      originSummary: story?.origin_summary || null,
      personalStakes: story?.personal_stakes || []
    },

    beliefContext: {
      currentConviction: story?.[`${mythKey}_conviction`] || 0,
      previousInsights: mythMoments
        .filter(m => m.moment_type === 'insight')
        .slice(0, 1)  // 1 per type
        .map(m => m.transcript),
      resistancePoints: story?.[`${mythKey}_resistance_notes`] || null
    },

    momentContext: {
      recentObservations: mythMoments
        .filter(m => m.moment_type === 'real_world_observation')
        .slice(0, 1)
        .map(m => m.transcript),
      keyRationalizations: mythMoments
        .filter(m => m.moment_type === 'rationalization')
        .slice(0, 1)
        .map(m => m.transcript),
      breakthroughQuotes: mythMoments
        .filter(m => m.moment_type === 'emotional_breakthrough')
        .slice(0, 1)
        .map(m => m.transcript)
    }
  }
}
```

### Cross-Layer Context (Within Same Myth)

When a user returns for Layer 2 or Layer 3 of a myth, the AI needs context from previous layers. Uses key moments only — 1 per type.

```typescript
// server/utils/personalization/cross-layer-context.ts

export async function buildCrossLayerContext(
  userId: string,
  mythKey: string,
  currentLayer: 'intellectual' | 'emotional' | 'identity'
): Promise<CrossLayerContext> {

  const previousMoments = await supabase
    .from('captured_moments')
    .select('*')
    .eq('user_id', userId)
    .eq('myth_key', mythKey)
    .order('created_at', { ascending: true })

  return {
    // 1 insight per type max
    previousLayerInsights: previousMoments.data
      ?.filter(m => m.moment_type === 'insight')
      .slice(0, 1)
      .map(m => ({
        layer: m.myth_layer,
        quote: m.transcript
      })) || [],

    // 1 breakthrough max
    breakthroughs: previousMoments.data
      ?.filter(m => m.moment_type === 'emotional_breakthrough')
      .slice(0, 1)
      .map(m => m.transcript) || [],

    // 1 resistance point max
    resistancePoints: previousMoments.data
      ?.filter(m => m.moment_type === 'fear_resistance')
      .slice(0, 1)
      .map(m => m.transcript) || [],

    convictionAtPreviousLayers: await getConvictionHistory(userId, mythKey)
  }
}
```

### Session Continuity (Bridge Message)

When user continues to next layer, AI's first message acknowledges previous session:

```typescript
// server/utils/session/bridge.ts

export function buildBridgeContext(crossLayerContext: CrossLayerContext): string {
  if (crossLayerContext.previousLayerInsights.length === 0) {
    return ''
  }

  return `
The user is continuing from a previous session on this myth.
Last time, they expressed: "${crossLayerContext.previousLayerInsights[0].quote}"
${crossLayerContext.breakthroughs.length > 0
  ? `They had a breakthrough: "${crossLayerContext.breakthroughs[0]}"`
  : ''}
Acknowledge their progress naturally in your opening.
`
}
```

---

## Session Completion Flow

### SESSION_COMPLETE Detection

```typescript
// server/api/chat.post.ts

// When AI outputs [SESSION_COMPLETE]:
if (aiResponse.includes('[SESSION_COMPLETE]')) {
  // 1. Lock conversation - ignore any late messages
  await supabase
    .from('conversations')
    .update({ completed_at: new Date().toISOString() })
    .eq('id', conversationId)

  // 2. Run conviction assessment
  const assessment = await router.executeTask(
    'conviction.assess',
    buildConvictionAssessmentPrompt(/*...*/),
    parseConvictionResponse
  )

  // 3. Store assessment
  await supabase
    .from('conviction_assessments')
    .insert({
      user_id: userId,
      conversation_id: conversationId,
      myth_key: currentMythKey,
      myth_layer: currentLayer,
      conviction_score: coerceToRange(assessment.newConviction, 0, 10),
      delta: assessment.delta,
      recommended_next_step: assessment.recommendedNextStep,
      reasoning: assessment.reasoning,
      new_triggers: assessment.newTriggers,
      new_stakes: assessment.newStakes
    })

  // 4. Update user_story snapshot + merge triggers/stakes
  await updateUserStoryAfterSession(userId, currentMythKey, assessment)

  // 5. Select key insight if multiple candidates
  await selectKeyInsightForMyth(userId, currentMythKey)

  // 6. Schedule check-ins
  await scheduleCheckIns({
    userId,
    timezone: userTimezone,
    trigger: 'session_complete',
    sessionId: conversationId,
    mythKey: currentMythKey,
    sessionEndTime: new Date()
  })

  // 7. Strip [SESSION_COMPLETE] from displayed response
  return aiResponse.replace('[SESSION_COMPLETE]', '')
}
```

---

## Session Abandonment Flow

When user returns after abandoning a session (closes app, loses connection, timeout):

```typescript
// server/api/session/resume.get.ts

export default defineEventHandler(async (event) => {
  const userId = (await serverSupabaseUser(event)).id

  // Check for incomplete conversation
  const { data: incomplete } = await supabase
    .from('conversations')
    .select('id, myth_key, myth_layer, created_at')
    .eq('user_id', userId)
    .eq('session_type', 'core')
    .is('completed_at', null)
    .order('created_at', { descending: true })
    .limit(1)
    .single()

  if (incomplete) {
    // Get any moments captured before abandonment
    const { data: capturedMoments } = await supabase
      .from('captured_moments')
      .select('transcript, moment_type')
      .eq('conversation_id', incomplete.id)

    // Return context for new session (don't resume old conversation)
    return {
      should_restart: true,
      myth_key: incomplete.myth_key,
      myth_layer: incomplete.myth_layer,
      prior_moments: capturedMoments || []  // Inject these into new session
    }
  }

  return { should_restart: false }
})
```

---

## UI/UX Patterns & Components

### Dashboard States

The dashboard adapts based on user's program status:

**1. Pre-Ceremony Dashboard (In-Progress)**
```
┌─────────────────────────────────────────────────────────────┐
│  Progress indicator (5 circles, filled = all 3 layers done) │
│  ○ ● ● ○ ○  "3 of 5 myths explored"                        │
├─────────────────────────────────────────────────────────────┤
│  Next Session Card (layer hidden from user)                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  "Continue: Focus"                                  │   │
│  │  [Continue Session] button                          │   │
│  └─────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│  Check-in Card (if pending, shown as interstitial modal)    │
└─────────────────────────────────────────────────────────────┘
```

**Note:** Myth "explored" = all 3 layers complete for that myth. Layer details hidden from user.

**2. Ceremony-Ready Dashboard**
```
┌─────────────────────────────────────────────────────────────┐
│  ● ● ● ● ●  "All myths explored"                           │
├─────────────────────────────────────────────────────────────┤
│  Ceremony Card (prominent, centered)                        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  "You're ready for the final step"                  │   │
│  │  "Set aside about 15 minutes"                       │   │
│  │  [Begin Ceremony] button (large, accent color)      │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

**3. Post-Ceremony Dashboard**
```
┌─────────────────────────────────────────────────────────────┐
│  "You're Unhooked" header                                   │
│  Completion date: "December 15, 2024"                       │
├─────────────────────────────────────────────────────────────┤
│  Artifact Cards                                             │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │ Your Journey     │  │ Your Message     │                │
│  │ ▶ Play (12:34)   │  │ ▶ Play (0:45)    │                │
│  └──────────────────┘  └──────────────────┘                │
│  ┌──────────────────┐                                      │
│  │ Your Toolkit     │  ← In-app only, no download          │
│  │ View →           │                                      │
│  └──────────────────┘                                      │
├─────────────────────────────────────────────────────────────┤
│  Support Row                                                │
│  [I'm struggling] [Need a boost]                           │
│  ↑ Opens generic conversation with full user context       │
├─────────────────────────────────────────────────────────────┤
│  Follow-up Card (if pending, also in email)                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  "Day 7 check-in waiting"                           │   │
│  │  [Open Check-in] button                             │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Session Transitions

**Session Complete Flow:**
1. AI outputs `[SESSION_COMPLETE]` (stripped from display)
2. Audio finishes playing
3. Transition card slides up (static text):
   ```
   ┌─────────────────────────────────────────────────────────┐
   │  ✓ Session Complete                                     │
   │  "Nice work. Let that settle."                          │
   │                                                          │
   │  [Continue to Next Session]  ← If more layers/myths     │
   │  [Return to Dashboard]                                   │
   └─────────────────────────────────────────────────────────┘
   ```
4. "Continue" creates new conversation with bridge message

**Between Layers (Same Myth):**
- No explicit "layer complete" celebration
- Continue button advances to Layer 2 or 3
- System prompt changes, new conversation created
- AI opens with bridge message acknowledging previous session

**Myth Complete (Layer 3 Done):**
- Slightly more prominent completion card
- "Focus complete. 1 more to go." messaging
- Continue advances to next myth, Layer 1

### Check-In Interstitial

When user has pending check-in and opens app:
```
┌─────────────────────────────────────────────────────────────┐
│  Check-in interstitial (modal overlay)                      │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  "Quick thought for you..."                         │   │
│  │                                                      │   │
│  │  [Personalized check-in prompt]                     │   │
│  │                                                      │   │
│  │  🎤 [Tap to respond]                                │   │
│  │  "Skip for now" link (bottom)                       │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

**Dismissal:** Swipe down on mobile, click outside on desktop. "Skip for now" also dismisses.
- Check-in does NOT block navigation
- Skip marks as skipped (just logged, no reschedule)
- Completing check-in → "Thanks" toast → dashboard

### Journey Player Component

Displays the reflective journey with sequential audio playback and word-by-word transcript sync:

```typescript
// components/JourneyPlayer.vue

interface JourneySegment {
  id: string
  type: 'narration' | 'user_moment'
  audioPath: string
  transcript: string
  durationMs: number
  momentId?: string
  wordTimings: WordTiming[]  // From TTS provider
}

// Props
interface Props {
  playlist: JourneySegment[]
  totalDurationMs: number
}

// State
- currentSegmentIndex: number
- isPlaying: boolean
- currentWord: number  // For word-by-word highlight

// Behavior
- Eager preload: fetch all segments upfront before allowing playback
- Brief silence (0.5-1s) between segments
- Word-by-word transcript highlight using wordTimings
- User moment segments visually distinguished
```

### Myths Cheat Sheet Page

In-app only, no download/share for MVP:

```
┌─────────────────────────────────────────────────────────────┐
│  ← Back to Dashboard                                        │
│                                                             │
│  "Your Toolkit"                                             │
│  "The myths you've seen through"                            │
├─────────────────────────────────────────────────────────────┤
│  Scrollable myth cards:                                     │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Myth 1: Stress Relief                              │   │
│  │                                                      │   │
│  │  The Myth: "Nicotine helps me manage stress"        │   │
│  │  The Truth: "Nicotine creates the stress it         │   │
│  │             appears to relieve"                      │   │
│  │                                                      │   │
│  │  Your Insight:                                       │   │
│  │  "I realized the anxiety I'm relieving IS the       │   │
│  │   withdrawal..."                                     │   │
│  │  (no play button - text only if no audio)           │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  (If no insight captured for a myth, "Your Insight"        │
│   section is omitted for that myth)                         │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Phases

### Phase 4A: Foundation (Database + LLM Tasks Infrastructure)

**Database:**
- [ ] Create `myths` reference table with seed data
- [ ] Run all database migrations
- [ ] Create Supabase storage buckets (private, RLS-protected)
- [ ] Implement `captured_moments` CRUD API
- [ ] Implement `user_story` CRUD API with initialization from intake
- [ ] Implement `conviction_assessments` table

**LLM Task Infrastructure:**
- [ ] Extend model router with task-based configuration via env vars
- [ ] Implement `executeTask()` method with JSON parsing from text
- [ ] Create task prompt templates
- [ ] Add env var configuration for all tasks

**Basic Moment Capture:**
- [ ] Implement `llm.moment.detect` task
- [ ] Integrate detection into chat flow (parallel execution, 20+ word threshold)
- [ ] Add rate limit (max 20 detections per session)
- [ ] Store detected moments (transcript only for MVP, no audio)
- [ ] Silent fail on detection errors

**Acceptance Criteria:**
- Model router supports task-based model selection via env vars
- Moments detected and captured during conversations (transcript only)
- Detection runs in parallel with response generation
- User story initialized from intake on creation

---

### Phase 4B: Check-In System + Conviction Scoring

**Check-In Infrastructure:**
- [ ] Implement check-in scheduling logic (rolling 3-day window)
- [ ] Set up email delivery via Resend (from coach@unhooked.app)
- [ ] Implement magic link tokens (24-hour validity, stored in DB)
- [ ] Create check-in page with interstitial modal
- [ ] Implement timezone detection (browser-based)
- [ ] Set up Vercel Cron for daily batches
- [ ] Implement display-time expiration calculation
- [ ] Handle expired links → redirect to most recent pending

**LLM Tasks:**
- [ ] Implement `llm.checkin.personalize` task
- [ ] Implement `llm.conviction.assess` task (with trigger/stake enrichment)
- [ ] Implement `llm.key_insight.select` task
- [ ] Integrate conviction assessment at SESSION_COMPLETE only
- [ ] Store assessments in conviction_assessments table
- [ ] Update user_story snapshot after each assessment
- [ ] Coerce invalid LLM outputs to valid range

**Acceptance Criteria:**
- Check-ins scheduled with rolling 3-day window
- Morning/evening check-ins delivered via Resend
- Magic link authentication with 24-hour expiry
- Check-in expiration calculated at display time
- Conviction + triggers/stakes updated after each core session

---

### Phase 4C: Personalization Engine

**Context Building:**
- [ ] Build context builder (5-8 moments, 1 per type from current myth)
- [ ] Implement prompt injection (transient, not stored)
- [ ] Build cross-layer context (1 per type max)
- [ ] Implement bridge message for session continuity
- [ ] Integrate with existing chat API

**Story Generation:**
- [ ] Implement `llm.story.summarize` task
- [ ] Trigger summary generation after 2+ origin fragments
- [ ] Display origin summary in user profile

**Session Management:**
- [ ] Implement SESSION_COMPLETE detection and conversation locking
- [ ] Handle abandoned sessions (key moments carry over)
- [ ] Implement static transition messages

**Acceptance Criteria:**
- Core sessions reference user's previous insights
- AI uses user's own language when reflecting back
- Bridge message acknowledges previous session on continue
- Abandoned sessions preserve captured moments for next attempt

---

### Phase 4D: Ceremony & Artifacts

**Ceremony Preparation:**
- [ ] Build ceremony preparation endpoint
- [ ] Implement `llm.ceremony.select` task (narrative arc selection)
- [ ] Keep partially generated journey if ceremony abandoned

**Ceremony Generation:**
- [ ] Implement `llm.ceremony.narrative` task
- [ ] Build journey playlist generator with lazy TTS
- [ ] Implement journey audio endpoint with retry + text fallback
- [ ] Build myths cheat sheet generator (strict TypeScript validation)
- [ ] Implement final recording with unlimited re-record attempts

**Ceremony UX:**
- [ ] Build ceremony conversation flow (continuous, no part tracking)
- [ ] Implement "already_quit" detection via AI conversation
- [ ] Create ceremony completion endpoint
- [ ] Schedule post-ceremony follow-ups (from ceremony completion date)

**Artifacts & Display:**
- [ ] Build journey player with eager preload and word-by-word sync
- [ ] Implement 0.5-1s silence between segments
- [ ] Build cheat sheet page (in-app only, text fallback for missing audio)
- [ ] Implement signed URLs with 1-hour expiry

**Acceptance Criteria:**
- Ceremony selects moments by narrative arc
- Journey plays with word-by-word transcript sync
- Cheat sheet shows text-only when no audio captured
- Final recording has preview/unlimited re-record flow
- Artifacts are immutable once generated

---

### Phase 4E: Reinforcement Mode (Simplified for MVP)

**MVP Approach:** Reinforcement/Boost buttons open a simplified generic conversation with full user context. Full structured reinforcement sessions are deferred.

- [ ] Detect returning post-ceremony users
- [ ] Show post-ceremony dashboard with artifacts + follow-up card
- [ ] "I'm struggling" / "Boost" buttons → open generic support conversation
- [ ] Generic conversation has access to full user context (story, moments)
- [ ] Follow-up check-ins delivered via email + shown in dashboard

**Acceptance Criteria:**
- Post-ceremony users see their artifacts
- Boost/struggling buttons launch voice conversation with full context
- Follow-up milestones shown in dashboard and delivered via email

**Deferred to Later Build:**
- Structured reinforcement sessions (myth-specific review)
- Conviction re-assessment after reinforcement
- Relapse re-onboarding flow
- Smart moment selection with variety

---

## Open Technical Decisions

| Decision | Options | Recommendation | Status |
|----------|---------|----------------|--------|
| Email provider | Resend, SendGrid, Postmark | Resend | **Decided** |
| Cron job hosting | Vercel Cron, GitHub Actions, Supabase Edge Functions | GitHub Actions (5 min) + Vercel Cron (daily fallback) | **Decided** (ADR-003) |
| Journey audio playback | Server-side stitching, client-side sequential | Client-side sequential | **Decided** |
| Moment confidence threshold | 0.7, 0.8, 0.85 | 0.7 for transcript, 0.85 for audio | **Decided** |
| Max moments per context | 5, 10, 15 | 5-8 (1 per type from current myth) | **Decided** |
| Audio URL strategy | Signed, public, RLS | Signed (1 hour expiry) | **Decided** |
| Myth keys | Numbers, strings | snake_case strings with FK | **Decided** |

### LLM Task Model Assignments

All configurable via environment variables:

| Task | Default Model | Env Variable |
|------|---------------|--------------|
| `conversation` | gemini-pro | LLM_TASK_CONVERSATION_MODEL |
| `moment.detect` | gemini-flash | LLM_TASK_MOMENT_DETECT_MODEL |
| `conviction.assess` | gemini-pro | LLM_TASK_CONVICTION_ASSESS_MODEL |
| `checkin.personalize` | gemini-flash | LLM_TASK_CHECKIN_PERSONALIZE_MODEL |
| `story.summarize` | gemini-pro | LLM_TASK_STORY_SUMMARIZE_MODEL |
| `ceremony.narrative` | gemini-pro | LLM_TASK_CEREMONY_NARRATIVE_MODEL |
| `ceremony.select` | gemini-pro | LLM_TASK_CEREMONY_SELECT_MODEL |
| `key_insight.select` | gemini-pro | LLM_TASK_KEY_INSIGHT_SELECT_MODEL |

---

## Deferred for Post-MVP

The following features are explicitly deferred:

1. **Audio capture for moments** — MVP stores transcript only
2. **User-highlighted moments** — `is_user_highlighted` field exists but not implemented
3. **Cross-myth context injection** — Only current myth moments used
4. **Smart moment selection with variety** — Simple 1-per-type selection
5. **Observation debrief check-ins** — Removed from schema
6. **Structured reinforcement sessions** — Generic conversation fallback
7. **Playback tracking** — `times_played_back` exists but not updated
8. **Cheat sheet download/share** — In-app only
9. **Server-side audio stitching** — Client-side sequential playback
10. **Session summary in check-in personalization** — Uses moments only
11. **Final dose ritual (Part 5)** — Ceremony step where user takes last hit and discards paraphernalia; referenced in spec but not detailed or implemented; `ceremony_skipped_final_dose` flag exists in `user_progress` for future use

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Initial | Technical implementation spec created |
| 1.1 | - | Added 20-word minimum threshold to moment detection |
| 1.2 | - | Added `already_quit` flag handling to ceremony API |
| 1.3 | - | Added Journey Audio MVP approach (client-side sequential playback) |
| 2.0 | 2025-01-04 | Major revision: Simplified session routing, conviction tracking |
| 3.0 | 2026-01-04 | **Complete rewrite based on detailed interview:** |
| | | - Changed myth_number to myth_key (snake_case: stress_relief, pleasure, willpower, focus, identity) |
| | | - Added `myths` reference table for FK constraints |
| | | - Added `conviction_assessments` table for per-session tracking |
| | | - Conviction assessment now extracts triggers/stakes (enrichment) |
| | | - Key insight selection via LLM when multiple candidates |
| | | - Moment detection runs in parallel (no latency impact) |
| | | - Audio capture deferred for MVP (transcript only) |
| | | - Rate limit: 20 detections per session |
| | | - Silent fail on detection errors |
| | | - Check-in magic links with 24-hour validity, stored in DB |
| | | - Expired check-in links redirect to most recent pending |
| | | - Rolling 3-day check-in window until ceremony |
| | | - Post-session check-ins only if before 9pm in user's stored timezone |
| | | - Timezone detected via browser |
| | | - Daily cron batches via Vercel Cron |
| | | - Emails via Resend from coach@unhooked.app (link only, no prompt) |
| | | - Skip just logs, no reschedule |
| | | - Context injection is transient (not stored) |
| | | - Simple moment selection (5-8, 1 per type from current myth) |
| | | - Cross-layer context: 1 per type max |
| | | - Bridge message for session continuity |
| | | - SESSION_COMPLETE locks conversation |
| | | - Abandoned sessions: key moments carry over |
| | | - Ceremony parts are continuous flow (no tracking) |
| | | - Already quit determined via AI conversation |
| | | - Keep generated journey if ceremony abandoned |
| | | - Journey TTS is lazy (generated on first play) |
| | | - Retry + text fallback on TTS failure |
| | | - Journey playback: eager preload, word-by-word sync, 0.5-1s silence between segments |
| | | - Signed audio URLs with 1-hour expiry |
| | | - Cheat sheet: strict TypeScript validation, text-only if no audio |
| | | - Final recording: unlimited re-record attempts |
| | | - Artifacts are immutable |
| | | - Follow-ups from ceremony completion date |
| | | - Follow-up magic links added |
| | | - Dashboard shows follow-ups (email + in-app) |
| | | - Reinforcement: full context for generic conversations |
| | | - Layer visibility hidden from users |
| | | - Check-in interstitial: swipe/click-outside to dismiss |
| | | - Static transition text |
| | | - LLM tasks configured via env vars |
| | | - JSON parsed from text (no JSON mode) |
| | | - Conviction coerced to valid range |
| | | - Removed observation_debrief from schema |
| | | - Removed time estimates from phases |
| | | - Added comprehensive deferred features list |
| 3.1 | 2026-01-19 | **Check-in system refinements (ADR-002):** |
| | | - Email query window: past 24h + future 24h (catches missed check-ins) |
| | | - One active post-session check-in rule: new session expires pending ones |
| | | - Morning/evening daily check-ins deferred (code dormant) |
| | | - Re-show 'opened' check-ins in interstitial |
| | | - Emails via Resend from coach@getunhooked.app |
| 3.2 | 2026-01-19 | **Cron architecture migration (ADR-003):** |
| | | - Discovered Vercel Hobby tier only allows 1 cron invocation/day (not hourly) |
| | | - Migrated primary cron to GitHub Actions (every 5 minutes, free) |
| | | - Vercel Cron kept as daily fallback at 8am UTC |
| | | - Both sources call same idempotent /api/cron/check-ins endpoint |
