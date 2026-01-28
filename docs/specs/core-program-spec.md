# Unhooked Core Program Specification

**Version:** 5.0
**Created:** 2026-01-11
**Last Updated:** 2026-01-28
**Status:** Active Development
**Document Type:** Feature Specification (PRD + Technical Design)

---

## Table of Contents

1. [Overview](#overview)
2. [Related Specifications](#related-specifications)
3. [Program Structure](#program-structure)
4. [User Journey](#user-journey)
5. [Database Schema](#database-schema)
6. [LLM Tasks Registry](#llm-tasks-registry)
7. [Session Management](#session-management)
8. [Audio Storage Strategy](#audio-storage-strategy)
9. [Implementation Phases](#implementation-phases)
10. [Deferred for Post-MVP](#deferred-for-post-mvp)
11. [Changelog](#changelog)

---

## Overview

The Unhooked Core Program is a structured therapeutic program that guides users through dismantling the psychological illusions that maintain nicotine addiction. Based on Allen Carr's "Easyway" methodology, the program uses AI-powered conversations to help users see through five core illusions about nicotine.

### Core Philosophy

Nicotine addiction is maintained by psychological illusions, not chemical dependency alone. Once someone truly sees that nicotine gives them nothing, quitting becomes effortless. The program achieves this through:

- **Layered depth** — Each illusion is explored at three levels (intellectual → emotional → identity)
- **Personalization** — AI references the user's own words and story
- **Spaced repetition** — Check-ins maintain the active reframe between sessions
- **Threshold crossing** — The ceremony marks a clear before/after moment

### Prerequisites

- Phase 1.3 complete — Chat with Gemini, conversations persisted
- Phase 2 complete — Program structure, illusions, progress tracking
- Phase 3 complete — Voice chat interface with STT/TTS

---

## Related Specifications

The Core Program is implemented across several feature specifications:

| Specification | Description |
|---------------|-------------|
| **[moment-capture-spec.md](moment-capture-spec.md)** | Detection and storage of therapeutic moments |
| **[check-in-spec.md](check-in-spec.md)** | Daily touchpoints and scheduling engine |
| **[ceremony-spec.md](ceremony-spec.md)** | Final ceremony flow and post-ceremony artifacts |
| **[personalization-engine-spec.md](personalization-engine-spec.md)** | Context building and prompt injection |
| **[follow-up-spec.md](follow-up-spec.md)** | Post-ceremony milestone check-ins (Day 3, 7, 14, 30, 90, 180, 365) |
| **[reinforcement-sessions-spec.md](reinforcement-sessions-spec.md)** | Post-program support and booster conversations |

Architecture Decision Records:
- **ADR-002** — Check-In System Refinements
- **ADR-003** — Cron Architecture
- **ADR-004** — Ceremony Endpoints
- **ADR-007** — Reinforcement Sessions Integration

---

## Program Structure

### The Five Illusions

| # | Key | Display Name | Core Reframe |
|---|-----|--------------|--------------|
| 1 | `stress_relief` | The Stress Relief Illusion | Nicotine creates stress; it doesn't relieve it |
| 2 | `pleasure` | The Pleasure Illusion | There is no pleasure—only ending withdrawal |
| 3 | `willpower` | The Willpower Illusion | Nothing to resist when nothing to give up |
| 4 | `focus` | The Focus Illusion | Nicotine ransoms your focus, doesn't provide it |
| 5 | `identity` | The Identity Illusion | You're not "an addict"—you were tricked |

### Layered Depth Model

Each illusion is explored through three layers:

| Layer | Name | Purpose | Duration |
|-------|------|---------|----------|
| 1 | Intellectual | Understand the reframe logically | ~15 min |
| 2 | Emotional | Process feelings (anger, grief, relief) | ~15 min |
| 3 | Identity | Integrate into sense of self | ~15 min |

**Total core sessions:** 15 (5 illusions × 3 layers) + 1 ceremony = 16 sessions

### Program Progression

```
1. ONBOARDING
   └── Intake form → Program intro → First session unlocked

2. CORE PROGRAM (repeat for each of 5 illusions)
   ├── Layer 1: Intellectual Understanding
   ├── Layer 2: Emotional Processing
   ├── Layer 3: Identity Integration
   └── [Check-ins between sessions]

3. CEREMONY READY
   └── All 5 illusions complete → Ceremony unlocked

4. FINAL CEREMONY
   └── 7-part threshold-crossing experience (see ceremony-spec.md)

5. POST-PROGRAM
   └── Artifacts + Reinforcement mode (see reinforcement-sessions-spec.md)
```

### Conviction Tracking

After each completed session, the AI assesses the user's conviction level (0-10 scale) for the current illusion. This is tracked but does not gate progress.

**Why we don't gate on conviction:**
- Belief change isn't linear—insights settle over time
- Conviction scoring isn't calibrated yet
- Blocking progress creates frustration
- Later illusions often strengthen earlier ones

---

## User Journey

### Program Statuses

| Status | Description | Next Action |
|--------|-------------|-------------|
| `not_started` | Intake not complete | Complete intake |
| `in_progress` | Working through illusions | Continue next session |
| `ceremony_ready` | All illusions complete | Begin ceremony |
| `completed` | Ceremony finished | Reinforcement mode |

### Dashboard States

**Mid-Program:**
- Current illusion prominent with [Continue] button
- Completed illusions show ✓ with [Reinforce] button
- Next illusion grayed/locked
- Beyond next: hidden

**Ceremony Ready:**
- Celebratory messaging
- [Begin Ceremony Now] primary CTA
- [I need a moment first] secondary

**Post-Ceremony:**
- "YOU'RE FREE ✓" header with completion date
- Journey artifact card
- Final recording card
- Illusions cheat sheet link
- [Talk to me] booster button
- All illusions with [Reinforce] buttons

### Session Transitions

**Session Completion:**
```
┌─────────────────────────────────────────────────────────────┐
│  Session Complete ✓                                         │
│                                                             │
│  Let this settle. Your next session                         │
│  will be ready tomorrow.                                    │
│                                                             │
│  [Return to Dashboard]                                      │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│  Feeling ready now? [Continue]                              │
└─────────────────────────────────────────────────────────────┘
```

Primary CTA is "Return to Dashboard." Continue is available but secondary to encourage spaced practice.

**Illusion Completion:**
At end of Layer 3, AI verbally marks the transition:
> "You've seen through the Stress Illusion. That one's done. Next time, we'll look at something different..."

---

## Database Schema

### Core Tables

#### `illusions` (Reference Table)

```sql
CREATE TABLE public.illusions (
  myth_key TEXT PRIMARY KEY,
  myth_number INTEGER UNIQUE NOT NULL CHECK (myth_number BETWEEN 1 AND 5),
  display_name TEXT NOT NULL,
  short_name TEXT NOT NULL
);

-- Seed data
INSERT INTO public.illusions (myth_key, myth_number, display_name, short_name) VALUES
  ('stress_relief', 1, 'The Stress Relief Illusion', 'Stress'),
  ('pleasure', 2, 'The Pleasure Illusion', 'Pleasure'),
  ('willpower', 3, 'The Willpower Illusion', 'Willpower'),
  ('focus', 4, 'The Focus Illusion', 'Focus'),
  ('identity', 5, 'The Identity Illusion', 'Identity');
```

#### `conviction_scores`

```sql
CREATE TABLE public.conviction_scores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  myth_key TEXT REFERENCES public.illusions(myth_key) NOT NULL,
  myth_layer TEXT CHECK (myth_layer IN ('intellectual', 'emotional', 'identity')),

  -- Score
  score INTEGER CHECK (score BETWEEN 0 AND 10),

  -- LLM reasoning
  assessment_reasoning TEXT,
  key_indicators JSONB,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_conviction_user ON public.conviction_scores(user_id);
CREATE INDEX idx_conviction_user_myth ON public.conviction_scores(user_id, myth_key);
CREATE INDEX idx_conviction_latest ON public.conviction_scores(user_id, myth_key, created_at DESC);
```

#### `user_progress` Additions

```sql
-- Extended fields for core program
ALTER TABLE public.user_progress ADD COLUMN IF NOT EXISTS
  program_status TEXT DEFAULT 'not_started' CHECK (program_status IN (
    'not_started',
    'in_progress',
    'ceremony_ready',
    'completed'
  ));

ALTER TABLE public.user_progress ADD COLUMN IF NOT EXISTS
  ceremony_completed_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.user_progress ADD COLUMN IF NOT EXISTS
  final_recording_path TEXT;
```

### Feature-Specific Tables

Detailed schemas are in the respective feature specs:

| Table | Specification |
|-------|---------------|
| `captured_moments` | [moment-capture-spec.md](moment-capture-spec.md#database-schema) |
| `user_story` | [personalization-engine-spec.md](personalization-engine-spec.md#database-tables) |
| `check_in_schedule` | [check-in-spec.md](check-in-spec.md#database-schema) |

---

## LLM Tasks Registry

The Core Program uses a registry of LLM tasks for specialized operations beyond conversation.

### Task Overview

| Task | Purpose | Model | Spec |
|------|---------|-------|------|
| `llm.session.assess` | Conviction assessment after session | gemini-2.0-flash | This doc |
| `llm.moment.detect` | Detect capture-worthy moments | gemini-2.0-flash | [moment-capture-spec.md](moment-capture-spec.md#llm-task-llmmomentdetect) |
| `llm.insight.select` | Select best insight for illusion | gemini-2.0-flash | [personalization-engine-spec.md](personalization-engine-spec.md#fr-4-key-insight-tracking) |
| `llm.checkin.generate` | Generate check-in prompt | gemini-2.0-flash | [check-in-spec.md](check-in-spec.md) |
| `llm.ceremony.journey` | Generate ceremony narrative | gemini-2.0-flash | [ceremony-spec.md](ceremony-spec.md#llm-task-llmceremonyjourney) |
| `llm.reinforcement.assess` | Assess user state in reinforcement | gemini-2.0-flash | [reinforcement-sessions-spec.md](reinforcement-sessions-spec.md) |

### Environment Configuration

```bash
# .env - LLM Task Model Configuration
LLM_TASK_MODEL_SESSION_ASSESS=gemini-2.0-flash
LLM_TASK_MODEL_MOMENT_DETECT=gemini-2.0-flash
LLM_TASK_MODEL_INSIGHT_SELECT=gemini-2.0-flash
LLM_TASK_MODEL_CHECKIN_GENERATE=gemini-2.0-flash
LLM_TASK_MODEL_CEREMONY_JOURNEY=gemini-2.0-flash
LLM_TASK_MODEL_REINFORCEMENT_ASSESS=gemini-2.0-flash
```

### Task: `llm.session.assess`

Assess user's conviction level after a completed core session.

**When called:** After `[SESSION_COMPLETE]` token detected in core sessions only.

**Input:**
```typescript
{
  conversationHistory: Message[]
  mythKey: string
  mythLayer: string
  previousScore?: number
}
```

**Output:**
```typescript
{
  score: number  // 0-10
  reasoning: string
  keyIndicators: {
    intellectual_understanding: 'none' | 'partial' | 'full'
    emotional_engagement: 'none' | 'partial' | 'full'
    personal_application: 'none' | 'partial' | 'full'
    resistance_present: boolean
    breakthrough_moments: string[]
  }
}
```

**Prompt Template:**
```
Assess this user's conviction level for the ${mythDisplayName}.

CONVERSATION:
${conversationHistory}

Previous conviction score for this illusion: ${previousScore ?? 'None (first session)'}

Rate their conviction from 0-10:
- 0-2: Still fully believes the illusion
- 3-4: Intellectually questions but emotionally attached
- 5-6: Sees the truth but hasn't fully internalized
- 7-8: Strong conviction with occasional doubt
- 9-10: Complete conviction, illusion fully dismantled

Respond with JSON only:
{
  "score": <number>,
  "reasoning": "<2-3 sentences explaining the assessment>",
  "keyIndicators": {
    "intellectual_understanding": "none" | "partial" | "full",
    "emotional_engagement": "none" | "partial" | "full",
    "personal_application": "none" | "partial" | "full",
    "resistance_present": <boolean>,
    "breakthrough_moments": ["<quote or description>", ...]
  }
}
```

### Model Router Integration

```typescript
// server/utils/llm/task-router.ts

interface TaskConfig {
  taskId: string
  defaultModel: LLMProvider
  envOverride: string
  maxTokens: number
  temperature: number
}

const TASK_CONFIGS: Record<string, TaskConfig> = {
  'llm.session.assess': {
    taskId: 'llm.session.assess',
    defaultModel: 'gemini-2.0-flash',
    envOverride: 'LLM_TASK_MODEL_SESSION_ASSESS',
    maxTokens: 1000,
    temperature: 0.3
  },
  // ... other tasks
}

export async function executeTask<T>(
  taskId: string,
  input: unknown
): Promise<T> {
  const config = TASK_CONFIGS[taskId]
  const model = process.env[config.envOverride] || config.defaultModel

  const prompt = buildTaskPrompt(taskId, input)

  const response = await modelRouter.complete({
    model,
    prompt,
    maxTokens: config.maxTokens,
    temperature: config.temperature,
    responseFormat: 'json'
  })

  return parseTaskResponse<T>(taskId, response)
}
```

---

## Session Management

### SESSION_COMPLETE Detection

Core sessions end when the AI outputs the `[SESSION_COMPLETE]` token.

**Detection flow:**
```typescript
// In chat response handler
const response = await llm.chat(messages)

if (response.includes('[SESSION_COMPLETE]')) {
  // 1. Strip token from displayed response
  const cleanResponse = response.replace('[SESSION_COMPLETE]', '')

  // 2. Trigger conviction assessment
  await executeTask('llm.session.assess', {
    conversationHistory: messages,
    mythKey: session.mythKey,
    mythLayer: session.mythLayer,
    previousScore: await getLatestConvictionScore(userId, session.mythKey)
  })

  // 3. Update progress
  await updateSessionProgress(userId, session)

  // 4. Schedule post-session check-in (see check-in-spec.md)
  await schedulePostSessionCheckIn(userId, session)

  // 5. Return completion UI state
  return {
    message: cleanResponse,
    sessionComplete: true,
    nextAction: determineNextAction(userId)
  }
}
```

### Incomplete Session Handling

If user exits mid-conversation:
- No conviction assessment triggered
- Session marked as incomplete
- On return: restart that illusion + layer (clean start)
- Previous partial conversation not continued

**Rationale:** Conviction scores should reflect genuine session completions. Partial conversations don't provide enough signal.

### Session Progress Updates

```typescript
async function updateSessionProgress(
  userId: string,
  session: { mythKey: string; mythLayer: string }
): Promise<void> {
  const { mythKey, mythLayer } = session

  // Update illusion progress
  const progress = await getUserProgress(userId)
  const illusionProgress = progress.illusions[mythKey] || {
    status: 'not_started',
    layers_completed: []
  }

  // Add completed layer
  if (!illusionProgress.layers_completed.includes(mythLayer)) {
    illusionProgress.layers_completed.push(mythLayer)
  }

  // Check if illusion complete (all 3 layers)
  if (illusionProgress.layers_completed.length === 3) {
    illusionProgress.status = 'completed'
    illusionProgress.completed_at = new Date().toISOString()
  } else {
    illusionProgress.status = 'in_progress'
  }

  // Check if all illusions complete
  const allComplete = ALL_MYTHS.every(
    m => progress.illusions[m]?.status === 'completed'
  )

  if (allComplete) {
    progress.program_status = 'ceremony_ready'
  }

  await saveUserProgress(userId, progress)
}
```

---

## Audio Storage Strategy

### Supabase Storage Buckets

```sql
-- Two buckets with different retention policies
INSERT INTO storage.buckets (id, name, public) VALUES
  ('session-audio', 'session-audio', false),  -- Full session recordings (if needed)
  ('moment-clips', 'moment-clips', false);    -- Captured moment clips (persistent)
```

### Storage Structure

```
moment-clips/
└── {user_id}/
    ├── moments/
    │   ├── {moment_id}.webm        # Individual captured moments
    │   └── ...
    └── ceremony/
        └── final-recording.webm     # User's message to future self

session-audio/
└── {user_id}/
    └── {conversation_id}/
        ├── user-{message_id}.webm   # User utterances (temporary)
        └── ai-{message_id}.mp3      # AI responses (temporary)
```

### Audio URL Strategy

Supabase Storage signed URLs expire. For playback:

```typescript
async function getAudioUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from('moment-clips')
    .createSignedUrl(path, 3600)  // 1 hour expiry

  if (error) throw error
  return data.signedUrl
}
```

For ceremony journey playback, generate signed URLs for all segments on-demand.

---

## Implementation Phases

### Phase 4A: Foundation ✓

- [x] Database schema for captured_moments, user_story, conviction_scores
- [x] LLM task infrastructure (model router, task configs)
- [x] Basic moment detection (llm.moment.detect)
- [x] Conviction assessment (llm.session.assess)
- [x] SESSION_COMPLETE detection and handling

### Phase 4B: Check-In System ✓

- [x] check_in_schedule table
- [x] Post-session check-in scheduling
- [x] Email delivery via Resend
- [x] Magic link authentication for check-ins
- [x] Check-in interstitial on dashboard
- [x] Cron architecture (GitHub Actions + Vercel fallback)

### Phase 4C: Personalization Engine ✓

- [x] Context builder implementation
- [x] Moment retrieval for context injection
- [x] System prompt formatting with user context
- [x] Cross-session references

### Phase 4D: Ceremony & Artifacts

- [ ] Ceremony conversation flow (7 parts)
- [ ] Final recording capture and storage
- [ ] Journey artifact generation
- [ ] Illusions cheat sheet content
- [ ] Post-ceremony dashboard state

### Phase 4E: Reinforcement Mode

See [reinforcement-sessions-spec.md](reinforcement-sessions-spec.md#implementation-phases) for detailed implementation plan.

---

## Deferred for Post-MVP

| Feature | Reason | Future Effort |
|---------|--------|---------------|
| **Variable sessions per illusion** | Need conviction calibration data | Adaptive routing |
| **Audio clip playback** | Transcript sufficient for MVP | Post-MVP |
| **Morning/evening check-ins** | Focus on post-session first | Post-MVP |
| **User-configurable timing** | Simplicity; fixed times work | Post-MVP |
| **Moment browsing UI** | Not needed for core experience | Post-MVP |
| **Conviction gating** | Need calibration data | Post-MVP |
| **Milestone check-ins** | Separate scheduling system | Post-MVP |

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-11 | Initial technical implementation spec |
| 2.0 | 2026-01-15 | Added check-in system, conviction tracking |
| 3.0 | 2026-01-20 | Added personalization engine, ceremony flow |
| 4.0 | 2026-01-25 | Added reinforcement mode, ADR integrations |
| 4.1 | 2026-01-28 | Terminology update: myths → illusions |
| 5.0 | 2026-01-28 | **Major restructure:** Split into feature specs (moment-capture, check-in, ceremony, personalization, reinforcement). This document now serves as the anchor specification. |
