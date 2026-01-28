# Unhooked: Moment Capture System Specification

**Version:** 1.0
**Created:** 2026-01-28
**Status:** Draft
**Document Type:** Feature Specification (PRD + Technical Design)
**Related Documents:**
- `core-program-spec.md` (Program Structure)
- `check-in-spec.md` (Check-In System)
- `ceremony-spec.md` (Ceremony Flow)
- `personalization-engine-spec.md` (Personalization Engine)
- `reinforcement-sessions-spec.md` (Reinforcement Sessions)

---

## Table of Contents

1. [Problem Statement](#problem-statement)
2. [Goals & Success Metrics](#goals--success-metrics)
3. [Solution Summary](#solution-summary)
4. [Moment Types](#moment-types)
5. [User Experience](#user-experience)
6. [Functional Requirements](#functional-requirements)
7. [Non-Functional Requirements](#non-functional-requirements)
8. [Key Product Decisions](#key-product-decisions)
9. [Technical Design](#technical-design)
10. [Out of Scope / Deferred](#out-of-scope--deferred)
11. [Open Questions](#open-questions)
12. [Appendix](#appendix)
13. [Changelog](#changelog)

---

## Problem Statement

### The Challenge

The Unhooked program produces genuine breakthrough moments—when a user articulates an insight in their own words, expresses real emotion, or commits to change. These moments are therapeutically significant: hearing yourself say something creates stronger belief change than hearing someone else say it (the "production effect").

However, these moments are ephemeral. They happen in conversation and then disappear into the transcript. Without a system to identify, capture, and resurface them, we lose:

- The user's own language for reflecting back insights
- Evidence of their journey for the ceremony
- Anchors they can return to when doubt creeps in
- Personalization material that makes sessions feel like *their* story

### Why This Matters

Allen Carr's method works through saturation—the same truth expressed many ways until it becomes visceral. The user's *own words* are the most persuasive version of that truth for them. Capturing and replaying their moments creates a personalized saturation effect.

---

## Goals & Success Metrics

### Primary Goal

Capture therapeutically significant moments from user conversations so they can be used for personalization, ceremony artifacts, and reinforcement.

### Success Metrics

**Leading Indicators:**
- Moments captured per completed session (target: 2-5 per core session)
- Moment diversity across types (not all insights, some emotions/commitments)
- Ceremony journey artifact includes 10+ user moments

**Lagging Indicators:**
- Users report feeling "seen" or "understood" by the AI
- Ceremony journey artifact drives emotional response
- Reinforcement sessions successfully use captured moments as anchors

### Non-Goals

- **Recording all speech** — We capture significant moments, not full conversations
- **User-curated highlights** — Capture is AI-driven, not manual selection
- **Social sharing** — Moments are private therapeutic material

---

## Solution Summary

The Moment Capture System silently identifies and stores therapeutically significant utterances during conversations. These captured moments are then:

1. **Referenced within sessions** — AI uses the user's own language
2. **Injected into future sessions** — Personalization context includes relevant moments
3. **Woven into ceremony** — The "Reflective Journey" artifact uses their voice
4. **Surfaced during reinforcement** — Moment cards on dashboard, anchor moments in sessions

### Core Design Principle

**Capture is silent; magic is revealed later.** Users don't see a "moment captured" indicator during conversation. The reveal comes at the ceremony when they hear their journey played back in their own words—a moment of surprise and recognition.

---

## Moment Types

The system recognizes 8 types of therapeutically significant moments:

### 1. Origin Story Fragments
**What:** How they started using nicotine, the context of their addiction beginning
**Why:** This is the emotional foundation. It explains the trap without judgment.
**Examples:**
- "I started vaping in college when everyone was doing it"
- "It was when my dad got sick—I needed something to cope"
- "I switched from cigarettes thinking it would be healthier"

**Use later:** "You mentioned this started when your dad was sick. Before that—how did you handle hard things?"

---

### 2. Self-Told Rationalizations
**What:** The stories they tell themselves about why they use
**Why:** These are the beliefs we need to dismantle. Capturing them verbatim lets us reflect them back.
**Examples:**
- "It's the only thing that calms me down"
- "I just really enjoy it—it's my little reward"
- "I've tried quitting before, I'm just not someone who can"

**Use later:** "Earlier, you said 'it's the only thing that calms me down.' Now that we've talked about withdrawal—does that statement land differently?"

---

### 3. Insight Articulations
**What:** When they express a reframe in their own words
**Why:** This is gold. Their own articulation is more persuasive to themselves than ours.
**Examples:**
- "Wait—so I'm basically paying to feel normal?"
- "It's not actually relaxing me, it's just... ending the withdrawal"
- "I guess non-smokers just... feel like this all the time"

**Use later:** Play back their own voice when they're struggling or doubting

---

### 4. Emotional Breakthroughs
**What:** Moments of real feeling—anger, grief, relief, surprise
**Why:** Belief change happens in the emotional brain, not the rational one
**Examples:**
- "That makes me kind of angry, honestly"
- "I feel like I've been scammed"
- "That's... actually really relieving to hear"

**Use later:** "I remember you saying you felt scammed. That anger is appropriate—hold onto it."

---

### 5. Real-World Observations
**What:** When they report noticing something in their actual life
**Why:** This is embodied experience—the insight moved from abstract to felt
**Examples:**
- "I noticed today that the craving wasn't stress—it was exactly what you said"
- "I watched my coworker go outside to vape and I thought... that's not enjoyment on her face"
- "I went two hours without thinking about it and nothing bad happened"

**Use later:** Build a collection of their own evidence; replay during doubt

---

### 6. Identity Statements
**What:** How they describe themselves in relation to nicotine/addiction
**Why:** Identity is the deepest level. These reveal what needs to shift.
**Examples:**
- "I'm just an addictive person"
- "I've been a smoker for 15 years—it's part of who I am"
- "I'm not disciplined enough to quit"

**Use later:** "You said 'I'm just an addictive person.' Let me ask you something—were you addicted before your first cigarette?"

---

### 7. Commitment Statements
**What:** When they express what they want, who they want to be
**Why:** Commitments made in one's own voice create cognitive dissonance if violated
**Examples:**
- "I want to be free from this"
- "I don't want my kids to see me vaping"
- "I want to know I can handle stress without a crutch"

**Use later:** Play back during ceremony; use as anchor during struggle moments

---

### 8. Fear/Resistance Expressions
**What:** What they're afraid of losing or experiencing
**Why:** Unaddressed fears become relapse triggers
**Examples:**
- "I'm scared I won't be able to focus at work"
- "What will I do at parties?"
- "I don't know who I am without this"

**Use later:** Address directly, check if fear has diminished after insight work

---

## User Experience

### Visibility & Consent

**Default behavior:** Silent capture. The AI detects and stores moments without interrupting the conversation flow. Users should not feel watched or self-conscious during sessions.

**Disclosure:** During onboarding, users are informed that the app captures meaningful moments from their conversations to personalize their experience and create their journey artifact. This is included in the privacy policy and briefly mentioned in the onboarding flow.

**In-session experience:** Captures happen invisibly. The "magic" is revealed at the ceremony when users hear their own journey played back—a moment of surprise and recognition.

**Privacy setting:** Users can disable moment capture in settings. If disabled:
- No moments are tagged for later use
- Ceremony journey artifact will be generic (AI-narrated without user quotes)
- Core therapeutic experience still works, just less personalized

### Explicit "Say It Again" Prompts

Explicit prompts ("Say that again—I want to hold onto that") are used sparingly:

1. **Designed program moments:** Specific prompts built into the curriculum where we want the user to articulate something in their own words (e.g., end of each illusion layer)

2. **Very high-confidence insights:** When the AI detects something genuinely breakthrough (confidence 0.9+), it may acknowledge and invite re-articulation to strengthen encoding

**Most captures are silent.** Explicit prompts are the exception, reserved for moments where the therapeutic benefit of re-articulation outweighs the interruption.

---

## Functional Requirements

### FR-1: Moment Detection

**Description:** Detect capture-worthy moments during conversations.

**Requirements:**
- FR-1.1: System shall analyze each user message with 20+ words for therapeutic significance
- FR-1.2: Detection shall run in parallel with AI response generation (no latency impact)
- FR-1.3: Detection shall classify moment type from the 8 defined types
- FR-1.4: Detection shall output confidence score (0.0-1.0)
- FR-1.5: Detection shall output emotional valence (positive, negative, neutral, mixed)
- FR-1.6: Rate limit: max 20 detection calls per session
- FR-1.7: Silent fail on timeout/API error—log error, continue without capture

### FR-2: Moment Storage

**Description:** Store captured moments with full context.

**Requirements:**
- FR-2.1: Store transcript verbatim (no cleanup or normalization)
- FR-2.2: Store moment type classification
- FR-2.3: Store confidence score and emotional valence
- FR-2.4: Store session context (illusion_key, session_type, myth_layer)
- FR-2.5: Link to conversation and message IDs
- FR-2.6: Capture only if confidence >= 0.7

### FR-3: Moment Retrieval

**Description:** Retrieve relevant moments for various use cases.

**Requirements:**
- FR-3.1: Retrieve moments by illusion_key for session personalization
- FR-3.2: Retrieve moments by type for ceremony narrative construction
- FR-3.3: Return max 5-8 moments for context injection (1 per type from current illusion)
- FR-3.4: Support filtering by conversation_id for session-specific retrieval

### FR-4: Key Insight Selection

**Description:** Select the most impactful insight per illusion.

**Requirements:**
- FR-4.1: When multiple insights exist for an illusion, select the best one via LLM
- FR-4.2: Store selected key insight ID in user_story table
- FR-4.3: Key insight can be updated if a better one emerges in later sessions

---

## Non-Functional Requirements

### NFR-1: Performance

- NFR-1.1: Moment detection shall complete within 2 seconds
- NFR-1.2: Detection shall not add latency to AI response (parallel execution)
- NFR-1.3: Moment retrieval shall complete within 200ms

### NFR-2: Reliability

- NFR-2.1: Detection failures shall not interrupt conversation flow
- NFR-2.2: Capture failures shall be logged for debugging

### NFR-3: Privacy & Security

- NFR-3.1: All moments are user-owned (RLS policies enforce user_id filtering)
- NFR-3.2: Moments are not accessible to other users
- NFR-3.3: Users can delete all their data via account deletion

---

## Key Product Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Capture visibility** | Silent (no indicator) | Preserves natural conversation flow; reveal at ceremony creates emotional impact |
| **Confidence threshold** | 0.7 for transcript | Balance between capturing enough moments and avoiding noise |
| **Audio capture** | Deferred for MVP | Transcript-only simplifies implementation; audio can be added later |
| **User editing** | Not allowed | Moments should be authentic, unedited captures |
| **Moment browsing** | Deferred for MVP | Users see moments via dashboard cards and ceremony, not a library view |

---

## Technical Design

### Database Schema

#### `captured_moments` Table

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
  audio_clip_path TEXT,      -- Path in Supabase Storage (deferred for MVP)
  audio_duration_ms INTEGER, -- NULL if no audio

  -- Context
  myth_key TEXT REFERENCES public.illusions(myth_key),
  session_type TEXT CHECK (session_type IN ('core', 'check_in', 'ceremony', 'reinforcement')),
  myth_layer TEXT CHECK (myth_layer IN ('intellectual', 'emotional', 'identity')),

  -- Quality signals
  confidence_score FLOAT DEFAULT 0.8 CHECK (confidence_score BETWEEN 0 AND 1),
  emotional_valence TEXT CHECK (emotional_valence IN ('positive', 'negative', 'neutral', 'mixed')),
  is_user_highlighted BOOLEAN DEFAULT FALSE,  -- Deferred: user-highlighting not in MVP

  -- Usage tracking
  times_played_back INTEGER DEFAULT 0,
  last_used_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
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

### LLM Task: `llm.moment.detect`

**Purpose:** Analyze each user message to determine if it contains a capture-worthy therapeutic moment.

**When called:** After every user message with 20+ words, in parallel with AI response generation.

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
  keyPhrase: string | null  // The specific phrase to capture
  reasoning: string  // For logging/debugging
}
```

**Prompt Template:**
```
Analyze this user message for therapeutic significance in a nicotine cessation context.

USER MESSAGE: "${userMessage}"

RECENT CONTEXT:
${recentHistory}

CURRENT ILLUSION BEING DISCUSSED: ${mythKey} (${mythDisplayName})

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

### API Endpoints

#### `POST /api/moments`

Create a new captured moment.

```typescript
// Request
{
  conversation_id: string
  message_id?: string
  moment_type: MomentType
  transcript: string
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

Get moments optimized for prompt injection.

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

## Out of Scope / Deferred

| Feature | Reason | Planned For |
|---------|--------|-------------|
| **Audio clip capture** | Complexity; transcript is sufficient for MVP | Post-MVP |
| **User moment browsing UI** | Not needed for core experience | Post-MVP |
| **User editing/deletion of moments** | Authenticity matters | Not planned |
| **Moment sharing** | Privacy concerns; not therapeutic | Not planned |
| **Smart selection with variety** | Simple 1-per-type selection for MVP | Post-MVP |

---

## Open Questions

### Resolved

- [x] Should users see when moments are captured? **No, silent capture**
- [x] What confidence threshold for capture? **0.7 for transcript, 0.85 for audio (when implemented)**
- [x] How many moments in context injection? **5-8 total, 1 per type from current illusion**

### Still Open

None currently.

---

## Appendix

### A. Capture Trigger Examples

**Explicit prompts (designed into curriculum):**
- "Before we move on—tell me in your own words what you've realized about [illusion topic]."
- "If you were explaining this to a friend who vapes, what would you say?"
- "Record a message to yourself for when you're tempted next week."

**Intuitive capture signals:**
- "Wait—" / "Oh." / "Huh." (surprise/realization)
- "I never thought about it that way"
- Strong emotional language ("angry," "relieved," "scared")
- Self-correction mid-thought
- Unprompted vulnerability

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-28 | Initial specification created from core-program-epic.md and core-program-spec.md |
