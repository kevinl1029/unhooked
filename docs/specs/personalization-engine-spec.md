# Unhooked: Personalization Engine Specification

**Version:** 1.0
**Created:** 2026-01-28
**Status:** Draft
**Document Type:** Feature Specification (PRD + Technical Design)
**Related Documents:**
- `core-program-spec.md` (Program Structure)
- `moment-capture-spec.md` (Moment Capture)
- `check-in-spec.md` (Check-In System)
- `ceremony-spec.md` (Ceremony Flow)
- `reinforcement-sessions-spec.md` (Reinforcement Sessions)

---

## Table of Contents

1. [Problem Statement](#problem-statement)
2. [Goals & Success Metrics](#goals--success-metrics)
3. [Solution Summary](#solution-summary)
4. [Personalization Data Model](#personalization-data-model)
5. [Context Building](#context-building)
6. [Use Cases](#use-cases)
7. [Functional Requirements](#functional-requirements)
8. [Non-Functional Requirements](#non-functional-requirements)
9. [Key Product Decisions](#key-product-decisions)
10. [Technical Design](#technical-design)
11. [Out of Scope / Deferred](#out-of-scope--deferred)
12. [Open Questions](#open-questions)
13. [Changelog](#changelog)

---

## Problem Statement

### The Challenge

A generic quit-smoking program treats every user the same. But each user has:
- Their own origin story (why they started)
- Their own rationalizations ("it helps me focus")
- Their own fears about quitting ("I won't be able to handle stress")
- Their own insights expressed in their own words

Without personalization, the AI feels like a script rather than a coach who *knows them*.

### Why This Matters

The Unhooked methodology relies on the user seeing through illusions using their own experience as evidence. When the AI references:
- Their specific product (vape vs cigarettes)
- Their stated reasons for using
- Their previous insights in their own words
- Their real-world observations

...it creates the feeling that this program is about *them*, not generic advice. Their own words are more persuasive than anything we say (the "production effect").

---

## Goals & Success Metrics

### Primary Goal

Make every AI interaction feel personalized—referencing the user's story, their words, their journey—rather than following a generic script.

### Success Metrics

**Leading Indicators:**
- Context injection includes user-specific data in >90% of sessions
- At least 1 captured moment referenced per core session after first illusion
- User's product type correctly referenced in all sessions

**Lagging Indicators:**
- Users report feeling "understood" or "seen" by the AI
- Users recognize their own words during ceremony journey playback
- Higher program completion rates vs. non-personalized baseline

### Non-Goals

- **Deep user profiling** — We capture therapeutic moments, not comprehensive profiles
- **Recommendation systems** — No algorithmic content suggestions
- **Cross-user learning** — Each user's data is isolated

---

## Solution Summary

The Personalization Engine gathers user data from multiple sources and injects it into AI prompts as context. This creates the illusion of memory and understanding.

### Data Sources

1. **Intake data** — Products used, usage patterns, duration, quit history
2. **User story** — Origin fragments, triggers, motivations, fears
3. **Captured moments** — Insights, emotions, commitments from conversations
4. **Session history** — What illusions have been covered, conviction levels
5. **Check-in responses** — Real-world observations reported between sessions

### Injection Points

- **System prompts** — Static context about user profile
- **Dynamic context blocks** — Session-specific relevant moments
- **Inline references** — Quotes and callbacks woven into AI responses

---

## Personalization Data Model

### User Profile

Basic information captured during intake:

```typescript
interface UserProfile {
  // Products
  productsUsed: ('vape' | 'cigarettes' | 'pouches' | 'cigars')[]
  primaryProduct: string  // Most frequently used

  // Usage patterns
  usageFrequency: 'light' | 'moderate' | 'heavy'
  yearsUsing: number
  dailyAmount?: string  // e.g., "1 pack", "1 pod"

  // History
  previousQuitAttempts: number
  longestQuitDuration?: string
  whatBroughtThemBack?: string

  // Preferences
  preferredName: string
  timezone: string
}
```

### User Story

Narrative elements captured across intake and conversations:

```typescript
interface UserStory {
  userId: string

  // Origin
  originFragments: string[]  // How they started
  initialTrigger?: string    // What led to first use

  // Motivations
  primaryMotivation?: string    // Why they want to quit
  secondaryMotivations: string[]
  whoTheyreDoingItFor?: string  // (should be "themselves")

  // Fears
  fearAboutQuitting: string[]   // What worries them
  biggestFear?: string

  // Stakes
  personalStakes: string[]  // Kids, health, money, etc.

  // Key insights per illusion (selected from captured moments)
  keyInsights: {
    stress_relief?: string
    pleasure?: string
    willpower?: string
    focus?: string
    identity?: string
  }
}
```

### Belief State

Current conviction levels per illusion:

```typescript
interface BeliefState {
  illusions: {
    [mythKey: string]: {
      convictionScore: number  // 0-10
      layersCompleted: number  // 0-3
      resistancePoints: string[]  // Captured fears/resistance
      keyInsights: string[]  // Captured insights
    }
  }
}
```

### Journey Progress

Where they are in the program:

```typescript
interface JourneyProgress {
  programStatus: 'not_started' | 'in_progress' | 'ceremony_ready' | 'completed'
  currentMythKey?: string
  currentLayer?: 'intellectual' | 'emotional' | 'identity'
  illusionsCompleted: string[]
  sessionsCompleted: number
  checkInsCompleted: number
  lastSessionAt?: Date
}
```

---

## Context Building

### When Context is Built

Context is assembled before every AI interaction:
- Core session start
- Check-in response
- Ceremony parts
- Reinforcement conversations

### Context Builder Function

```typescript
interface SessionContext {
  // Static profile
  userProfile: UserProfile
  userStory: UserStory

  // Current session
  sessionType: 'core' | 'check_in' | 'ceremony' | 'reinforcement'
  currentMythKey?: string
  currentLayer?: string

  // Relevant moments
  originFragment?: CapturedMoment       // Origin story for callbacks
  relevantInsights: CapturedMoment[]    // Insights for current illusion
  recentObservations: CapturedMoment[]  // Last 3-5 real-world observations
  activeFears: CapturedMoment[]         // Unresolved fears/resistance

  // Progression
  convictionScores: { [mythKey: string]: number }
  illusionsCompleted: string[]
  programStage: 'early' | 'mid' | 'late' | 'ceremony' | 'post'
}
```

### Context Selection Logic

**For Core Sessions:**
```typescript
function buildCoreSessionContext(userId: string, mythKey: string): SessionContext {
  // Get 1 insight per type from current illusion
  const insights = await getMomentsForContext(userId, {
    mythKey,
    maxPerType: 1,
    types: ['insight', 'emotional_breakthrough', 'commitment']
  })

  // Get recent observations (any illusion, last 5)
  const observations = await getRecentMoments(userId, {
    type: 'real_world_observation',
    limit: 5
  })

  // Get active fears for this illusion
  const fears = await getMoments(userId, {
    mythKey,
    type: 'fear_resistance',
    resolved: false
  })

  return { /* assembled context */ }
}
```

**For Check-Ins:**
```typescript
function buildCheckInContext(userId: string): SessionContext {
  // Lighter context - just recent activity
  const lastSession = await getLastSession(userId)
  const recentObservations = await getRecentMoments(userId, {
    type: 'real_world_observation',
    limit: 3
  })

  return { /* assembled context */ }
}
```

**For Ceremony:**
```typescript
function buildCeremonyContext(userId: string): SessionContext {
  // Full journey - all significant moments
  const allMoments = await getAllMoments(userId, {
    minConfidence: 0.7,
    orderBy: 'created_at'
  })

  return { /* assembled context */ }
}
```

---

## Use Cases

### 1. Within-Session References

The AI reflects user language back within the same conversation.

**Example:**
> User: "I guess I've always told myself that smoking helps me think clearly."
>
> AI: "You said smoking helps you think clearly. Let's look at that..."

**Implementation:** Standard conversation context (recent messages).

### 2. Cross-Session Callbacks

The AI references previous sessions.

**Example:**
> "Last time, you realized something important. You said [quote from captured moment]. Has anything changed about how that feels?"

**Implementation:** Inject relevant `captured_moments` into system prompt.

### 3. Illusion Connections

The AI connects insights across different illusions.

**Example:**
> "This connects to something you said about stress. Remember when you realized [stress illusion insight]? The same pattern is happening with focus."

**Implementation:** Include key insights from all completed illusions in context.

### 4. Ceremony Journey

The AI narrates the user's transformation using their own words.

**Example:**
> "When we first talked, you said [origin fragment]. You believed [rationalization]. But then you saw [insight quote]. And you noticed [observation quote]."

**Implementation:** Full moment retrieval ordered chronologically.

### 5. Reinforcement Anchoring

The AI surfaces past insights when user expresses doubt.

**Example:**
> "I want you to hear something. This is you, three days ago: [plays captured moment]"

**Implementation:** Retrieve highest-confidence insights for relevant illusion.

---

## Functional Requirements

### FR-1: Context Assembly

**Description:** Assemble personalized context for AI interactions.

**Requirements:**
- FR-1.1: Build context within 500ms
- FR-1.2: Include user profile in all session contexts
- FR-1.3: Include relevant captured moments (max 5-8 to avoid token bloat)
- FR-1.4: Include conviction scores for current and completed illusions

### FR-2: Moment Selection

**Description:** Select the most relevant moments for context injection.

**Requirements:**
- FR-2.1: Prioritize moments from current illusion
- FR-2.2: Include at most 1 moment per type to ensure variety
- FR-2.3: Prefer higher confidence moments (>0.8)
- FR-2.4: Include recent observations regardless of illusion

### FR-3: System Prompt Injection

**Description:** Format context for LLM consumption.

**Requirements:**
- FR-3.1: Include user's preferred name
- FR-3.2: Include primary product type
- FR-3.3: Include current program stage
- FR-3.4: Include quoted moments with attribution

### FR-4: Key Insight Tracking

**Description:** Track the most impactful insight per illusion.

**Requirements:**
- FR-4.1: When multiple insights exist for an illusion, use LLM to select best one
- FR-4.2: Store key insight ID in user_story table
- FR-4.3: Key insight can be updated if better one emerges

---

## Non-Functional Requirements

### NFR-1: Performance

- NFR-1.1: Context assembly completes within 500ms
- NFR-1.2: Moment retrieval queries complete within 200ms

### NFR-2: Token Efficiency

- NFR-2.1: Context injection adds <1500 tokens to system prompt
- NFR-2.2: Moment quotes are truncated to 200 characters max

### NFR-3: Privacy

- NFR-3.1: All context data is user-scoped (RLS enforced)
- NFR-3.2: No cross-user data access

---

## Key Product Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Context limit** | 5-8 moments max | Balance personalization vs token cost |
| **Moment selection** | 1 per type from current illusion | Ensures variety, prevents repetition |
| **Confidence threshold** | 0.7 for context inclusion | Include meaningful moments, filter noise |
| **Quote truncation** | 200 chars max | Keep context concise |
| **Key insight selection** | LLM-assisted | Better quality than simple max-confidence |

---

## Technical Design

### Database Tables

Uses existing tables:
- `user_intake` — Profile data
- `user_story` — Narrative elements + key insights
- `user_progress` — Journey progression
- `captured_moments` — Therapeutic moments
- `conviction_scores` — Belief state per illusion

### Context Builder Implementation

```typescript
// server/utils/personalization/context-builder.ts

export async function buildSessionContext(
  userId: string,
  sessionConfig: SessionConfig
): Promise<SessionContext> {
  // Parallel data fetching
  const [
    profile,
    story,
    progress,
    moments,
    convictions
  ] = await Promise.all([
    getUserProfile(userId),
    getUserStory(userId),
    getUserProgress(userId),
    getRelevantMoments(userId, sessionConfig),
    getConvictionScores(userId)
  ])

  return {
    userProfile: profile,
    userStory: story,
    sessionType: sessionConfig.type,
    currentMythKey: sessionConfig.mythKey,
    currentLayer: sessionConfig.layer,
    originFragment: moments.find(m => m.type === 'origin_story'),
    relevantInsights: moments.filter(m => m.type === 'insight'),
    recentObservations: moments.filter(m => m.type === 'real_world_observation'),
    activeFears: moments.filter(m => m.type === 'fear_resistance'),
    convictionScores: convictions,
    illusionsCompleted: progress.illusionsCompleted,
    programStage: deriveProgramStage(progress)
  }
}

async function getRelevantMoments(
  userId: string,
  config: SessionConfig
): Promise<CapturedMoment[]> {
  const moments: CapturedMoment[] = []

  // Current illusion moments (1 per type)
  if (config.mythKey) {
    const illusionMoments = await supabase
      .from('captured_moments')
      .select('*')
      .eq('user_id', userId)
      .eq('myth_key', config.mythKey)
      .gte('confidence_score', 0.7)
      .order('confidence_score', { ascending: false })

    // Dedupe by type, take highest confidence per type
    const byType = new Map<string, CapturedMoment>()
    for (const m of illusionMoments.data || []) {
      if (!byType.has(m.moment_type)) {
        byType.set(m.moment_type, m)
      }
    }
    moments.push(...byType.values())
  }

  // Recent observations (any illusion)
  const observations = await supabase
    .from('captured_moments')
    .select('*')
    .eq('user_id', userId)
    .eq('moment_type', 'real_world_observation')
    .order('created_at', { ascending: false })
    .limit(5)

  moments.push(...(observations.data || []))

  return moments.slice(0, 8)  // Hard cap
}
```

### System Prompt Formatting

```typescript
// server/utils/personalization/prompt-formatter.ts

export function formatContextForPrompt(context: SessionContext): string {
  const lines: string[] = []

  // User identity
  lines.push(`USER: ${context.userProfile.preferredName}`)
  lines.push(`PRODUCT: ${context.userProfile.primaryProduct}`)
  lines.push(`PROGRAM STAGE: ${context.programStage}`)

  // Current focus
  if (context.currentMythKey) {
    lines.push(`CURRENT ILLUSION: ${MYTH_DISPLAY_NAMES[context.currentMythKey]}`)
    lines.push(`CURRENT LAYER: ${context.currentLayer}`)
  }

  // Completed work
  if (context.illusionsCompleted.length > 0) {
    lines.push(`ILLUSIONS COMPLETED: ${context.illusionsCompleted.join(', ')}`)
  }

  // Captured moments
  if (context.relevantInsights.length > 0) {
    lines.push('')
    lines.push('USER\'S CAPTURED INSIGHTS:')
    for (const m of context.relevantInsights) {
      const quote = truncate(m.transcript, 200)
      lines.push(`- [${m.moment_type}] "${quote}"`)
    }
  }

  if (context.activeFears.length > 0) {
    lines.push('')
    lines.push('USER\'S ACTIVE FEARS/RESISTANCE:')
    for (const m of context.activeFears) {
      const quote = truncate(m.transcript, 200)
      lines.push(`- "${quote}"`)
    }
  }

  if (context.recentObservations.length > 0) {
    lines.push('')
    lines.push('USER\'S RECENT REAL-WORLD OBSERVATIONS:')
    for (const m of context.recentObservations) {
      const quote = truncate(m.transcript, 200)
      lines.push(`- "${quote}"`)
    }
  }

  return lines.join('\n')
}
```

### API Integration

Context is built and injected at the API layer before LLM calls:

```typescript
// server/api/chat.post.ts

export default defineEventHandler(async (event) => {
  const { conversationId, message, sessionConfig } = await readBody(event)
  const userId = event.context.userId

  // Build personalized context
  const context = await buildSessionContext(userId, sessionConfig)

  // Format for prompt injection
  const contextBlock = formatContextForPrompt(context)

  // Inject into system prompt
  const systemPrompt = `
${BASE_SYSTEM_PROMPT}

---
USER CONTEXT:
${contextBlock}
---

${SESSION_TYPE_PROMPTS[sessionConfig.type]}
`

  // Call LLM with personalized prompt
  const response = await llm.chat({
    messages: [...conversationHistory, { role: 'user', content: message }],
    systemPrompt
  })

  return { response }
})
```

---

## Out of Scope / Deferred

| Feature | Reason | Planned For |
|---------|--------|-------------|
| **Audio clip playback** | Transcript-only for MVP | Post-MVP |
| **Smart moment summarization** | Use raw quotes for authenticity | Future consideration |
| **Adaptive context selection** | Simple rules for MVP | Post-MVP |
| **Cross-illusion pattern detection** | Complexity | Post-MVP |

---

## Open Questions

### Resolved

- [x] How many moments in context? **5-8 max, 1 per type from current illusion**
- [x] What confidence threshold? **0.7 for inclusion**
- [x] How to select key insight? **LLM-assisted selection**

### Still Open

None currently.

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-28 | Initial specification created from core-program-epic.md and core-program-spec.md |
