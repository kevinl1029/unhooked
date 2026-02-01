# Conversation Architecture Guide

**Last Updated:** 2026-01-30

How LLM prompts, system instructions, and conversations are structured in Unhooked.

For provider configuration, model selection, and environment variables, see [llm-configuration-guide.md](llm-configuration-guide.md).

---

## Table of Contents

1. [How a Conversation Is Built](#how-a-conversation-is-built)
2. [The Base System Prompt](#the-base-system-prompt)
3. [Illusion-Specific Prompts](#illusion-specific-prompts)
4. [Personalization Layers](#personalization-layers)
5. [Session Types and Their Prompts](#session-types-and-their-prompts)
6. [Background LLM Tasks](#background-llm-tasks)
7. [Session Lifecycle](#session-lifecycle)
8. [Key Design Decisions](#key-design-decisions)

---

## How a Conversation Is Built

Every time the user sends a message, the system assembles a fresh system prompt and prepends it to the conversation history before sending it to the LLM. The system prompt is **never stored** in the database — it's built transiently at request time.

### Message Structure

Messages use three roles defined in `server/utils/llm/types.ts`:

```
system   → Invisible instructions for the AI (assembled per-request)
user     → The human's messages
assistant → The AI coach's messages
```

### Assembly Order (Core Sessions)

The system prompt is composed by layering sections together in `server/utils/prompts/index.ts` via `buildSystemPrompt()`:

```
┌─────────────────────────────────────────────────┐
│  1. BASE_SYSTEM_PROMPT                          │  ← Allen Carr methodology, tone, session flow
│     (server/utils/prompts/base-system.ts)       │
├─────────────────────────────────────────────────┤
│  2. Basic Personalization                       │  ← Product type, frequency, years, triggers
│     (buildPersonalizationContext)                │
├─────────────────────────────────────────────────┤
│  3. Rich Personalization Context                │  ← Origin story, belief state, captured moments
│     (server/utils/personalization/              │
│      context-builder.ts → formatContextForPrompt)│
├─────────────────────────────────────────────────┤
│  4. Illusion-Specific Prompt                    │  ← The belief, truth, questions, analogies
│     (server/utils/prompts/illusions/            │
│      illusion-{1-5}-*.ts)                       │
├─────────────────────────────────────────────────┤
│  5. Bridge Context (Layer 2+)                   │  ← Acknowledgment of prior session
│     (server/utils/personalization/              │
│      cross-layer-context.ts)                    │
├─────────────────────────────────────────────────┤
│  6. Abandoned Session Context (if applicable)   │  ← Prior moments from incomplete session
├─────────────────────────────────────────────────┤
│  7. Opening Message Instruction (new sessions)  │  ← Scripted opening for first message
│     (ILLUSION_OPENING_MESSAGES in index.ts)     │
└─────────────────────────────────────────────────┘
                      +
┌─────────────────────────────────────────────────┐
│  Conversation History                           │  ← All prior user/assistant messages
│  (fetched from Supabase `messages` table)       │
└─────────────────────────────────────────────────┘
```

The final payload sent to the LLM is: `[system message, ...conversation history, latest user message]`.

---

## The Base System Prompt

**File:** `server/utils/prompts/base-system.ts`

This is the foundation of every core and reinforcement session. It defines:

### Core Philosophy

The AI is told that nicotine creates the problem it appears to solve. "Relief" is just ending withdrawal that nicotine caused. There are no real benefits. Quitting is only hard if you believe you're sacrificing something.

### Tone and Approach

- Warm and patient, never judgmental
- **Socratic method** — ask questions more than make statements
- Gently encourage depth when users give short responses
- Conversational, not clinical
- Confident in the methodology, but lets the user arrive at realizations

### Session Flow

The AI is instructed to follow a 5-step arc:

1. **Surface the belief** — Get them talking about what they currently believe
2. **Explore felt experience** — Ask about specific moments
3. **Introduce reframe** — Present the alternative explanation
4. **Let them discover contradiction** — Ask questions that expose the myth
5. **Solidify the shift** — Help them articulate the new understanding in their own words

### Completion Signal

When the AI senses genuine conviction shift, it outputs `[SESSION_COMPLETE]` at the end of its final message. The final message must **not** end with a question (since the user won't be able to respond).

### Guardrails

- Don't rush — depth over speed
- Watch for surface agreement without real conviction
- No scare tactics (health risks, guilt)
- No willpower talk ("be strong", "resist")
- Safety: crisis situations → 988 Suicide & Crisis Lifeline

---

## Illusion-Specific Prompts

**Directory:** `server/utils/prompts/illusions/`

Each of the 5 illusions has its own prompt file that gets appended to the base prompt. They all follow the same structure:

| # | Illusion | File | Belief | Truth |
|---|----------|------|--------|-------|
| 1 | Stress | `illusion-1-stress.ts` | "Nicotine helps me manage stress" | Nicotine creates the stress it appears to relieve |
| 2 | Pleasure | `illusion-2-pleasure.ts` | "Nicotine gives me genuine pleasure" | "Pleasure" is just relief from withdrawal |
| 3 | Willpower | `illusion-3-willpower.ts` | "Quitting requires massive willpower" | Once you see through illusions, there's nothing to resist |
| 4 | Focus | `illusion-4-focus.ts` | "Nicotine helps me concentrate" | Nicotine impairs baseline focus |
| 5 | Identity | `illusion-5-identity.ts` | "I have an addictive personality" | Nicotine is addictive for everyone; no such thing |

### Structure of Each Illusion Prompt

Every illusion prompt contains:

- **The Belief They Hold** — Exact framing of what the user likely believes
- **The Truth** — What the AI is guiding them toward
- **Key Questions** — 5+ specific questions to use in conversation
- **The Reframe Moment** — How to present the alternative explanation
- **Watch For** — Surface agreement patterns, exceptions, rationalizations
- **Analogies That Help** — Concrete metaphors (e.g., tight shoes for stress)
- **Completion Signal** — What the user should be able to articulate when ready

### Opening Messages

Each illusion also has a scripted opening message defined in `ILLUSION_OPENING_MESSAGES` (in `server/utils/prompts/index.ts`). These are used only for new conversations to set the tone. For example, Illusion 1 opens with:

> "Hey there. I want to explore something with you that might feel really true right now: the idea that nicotine helps with stress. Before we dive in, I'm curious — what made you want to start with this one?"

---

## Personalization Layers

The system injects user-specific context so the AI can reference the user's actual situation. There are multiple layers of personalization:

### Layer 1: Basic Intake Context

**Source:** `buildPersonalizationContext()` in `server/utils/prompts/base-system.ts`

Injected as a simple `## About This User` section with:
- Products used (cigarettes, vape, etc.)
- Usage frequency (multiple daily, daily, etc.)
- Years using
- Previous quit attempts
- Main triggers

### Layer 2: Rich Personalization Context

**Source:** `buildSessionContext()` → `formatContextForPrompt()` in `server/utils/personalization/context-builder.ts`

This pulls from Supabase and injects a fenced block:

```
--- USER CONTEXT (use naturally, don't repeat verbatim) ---

USER BACKGROUND:
- Uses: vape
- Frequency: multiple times a day
- Years using: 5
- Previous quit attempts: 3

MOTIVATIONS:
- Triggers: stress, boredom, after meals
- Personal stakes: want to be a good role model for my kids

THEIR STORY:
Started vaping in college under social pressure...

BELIEF STATE:
- Current conviction level: 4/10
- Previous insight they expressed: "I guess the stress was already there..."
- Remaining resistance: Still believes evening use is different

KEY MOMENTS FROM THEIR JOURNEY:
- They've rationalized: "But evenings are different, that's my time"
- They had a breakthrough: "Wait, I didn't need this before college"
- They observed: "My coworker handles the same stress without vaping"

--- END USER CONTEXT ---
```

**Moment Selection Strategy:** Fetches up to 8 moments per illusion, ordered by confidence score then recency, taking at most 1 per moment type (origin_story, rationalization, insight, emotional_breakthrough, real_world_observation, identity_statement, commitment, fear_resistance).

### Layer 3: Cross-Layer Context (Layer 2+ Sessions)

**Source:** `server/utils/personalization/cross-layer-context.ts`

When a user returns for a deeper layer of the same illusion, the system injects:

```
--- PREVIOUS SESSION CONTEXT ---

INSIGHTS FROM PREVIOUS LAYERS:
- At intellectual layer: "I see that nicotine creates the stress..."

BREAKTHROUGH MOMENT: "I was angry when I realized how long I'd been fooled"

RESISTANCE THEY SHOWED: "But what about when I'm really overwhelmed?"

CONVICTION LEVEL AFTER LAST SESSION: 6/10

--- END PREVIOUS SESSION CONTEXT ---
```

### Layer 4: Bridge Context

When a user has completed a previous layer, a bridge message is added so the AI naturally acknowledges the prior session without robotically saying "last time."

### Layer 5: Abandoned Session Context

If a user started but didn't complete a previous session, any captured moments from that abandoned session are injected so the AI can build on what was already discussed.

---

## Session Types and Their Prompts

### Core Sessions (Illusion Training)

**Endpoint:** `POST /api/chat`
**Prompt:** BASE_SYSTEM_PROMPT + personalization + illusion prompt + bridge/abandoned context
**Behavior:** Full Socratic session working through one illusion. Ends with `[SESSION_COMPLETE]`.

### Check-In Sessions

**Endpoint:** `POST /api/chat`
**Prompt Builder:** `buildCheckInSystemPrompt()` in `server/utils/prompts/index.ts`

Minimal prompt for brief micro-conversations. The AI is told to:
- Keep responses to 1-2 short sentences
- Be warm and brief
- End with encouragement, not a question
- Not try to start a long conversation

The check-in prompt (e.g., "Have you noticed any moments today where you reached for nicotine out of habit?") is embedded in the system instructions, and the AI speaks it as its opening message.

### Reinforcement Sessions (Illusion-Specific)

**Endpoint:** `POST /api/chat`
**Prompt Builder:** `buildReinforcementPrompt()` in `server/utils/prompts/reinforcement-prompts.ts`

Used when a user returns to a previously completed illusion. The AI is explicitly told:

- **This is NOT a teaching session** — the user already saw through this illusion
- Open with their own anchor moment quote
- Help them **reconnect** with what they discovered, not re-learn
- Generate new articulations — let them deepen conviction in their own words
- Honor their previous work; don't make them feel like they failed

The system provides the AI with: illusion name, previous conviction score, captured moments, and an anchor moment.

### Reinforcement Sessions (Generic Boost)

**Prompt Builder:** `buildBoostPrompt()` in `server/utils/prompts/reinforcement-prompts.ts`

Used post-ceremony when the user needs open-ended support. The AI is told to:

- Listen first — don't rush to solve or teach
- Identify which illusion is reasserting itself from what the user shares
- Steer naturally without announcing "this is about the stress illusion"
- Pull relevant moments from ALL completed illusions
- Help them apply existing knowledge to the current situation

The system provides: all conviction scores and recent moments across all illusions.

### Support Conversations

**Endpoint:** `POST /api/support/chat`
**Prompt Builder:** `buildSupportPrompt()` in `server/utils/prompts/support-prompt.ts`

Two modes:

**Struggling mode:** User is battling cravings. The AI starts by acknowledging their courage in reaching out, then gently asks what's going on.

**Boost mode:** User wants motivational reinforcement. The AI starts with encouragement and reminds them of their journey.

Both modes receive full context: user background, origin story, personal stakes, triggers, key insights (in the user's own words), recent reflections, and ceremony status.

### Ceremony Sessions

**Not conversational.** The ceremony uses LLM tasks (see below) to generate a reflective journey narrative from the user's captured moments. This is a one-time culminating experience, not a back-and-forth dialogue.

---

## Background LLM Tasks

These are non-conversational LLM calls that run behind the scenes. Each uses a specialized prompt and expects structured JSON output.

### Moment Detection

**File:** `server/utils/llm/tasks/moment-detection.ts`
**When:** Runs in parallel with AI response generation on every eligible user message
**Eligibility:** Message has 20+ words, session hasn't exceeded 20 detections

The prompt provides the user's message, recent conversation history, and current illusion, then asks the LLM to classify the message into one of 8 moment types and assign a confidence score.

**Capture threshold:** 0.7 confidence (70%) for transcript capture.

### Conviction Assessment

**File:** `server/utils/llm/tasks/conviction-assessment.ts`
**When:** After `[SESSION_COMPLETE]` is detected

Given the full session transcript, the LLM:
- Scores belief shift on a 0-10 scale
- Identifies remaining resistance
- Extracts any new triggers or personal stakes mentioned
- Always recommends "move_on" (conviction tracks but doesn't gate progress)

### Check-In Personalization

**File:** `server/utils/llm/tasks/checkin-personalization.ts`
**When:** Before sending a check-in notification

Generates a personalized check-in question based on:
- Check-in type (morning, evening, post_session)
- Current illusion being worked on
- Recent captured moments
- Completed illusions

### Story Summarization

**File:** `server/utils/llm/tasks/story-summarization.ts`
**When:** After 2+ origin_story moments are captured and no summary exists

Synthesizes the user's origin story fragments into a 2-4 sentence narrative summary, identifying key themes.

### Key Insight Selection

**File:** `server/utils/llm/tasks/key-insight-selection.ts`
**When:** After session completion, if multiple insights exist

Selects the single most powerful insight based on: genuine "aha moment" quality, authentic language, memorability, depth of understanding.

### Ceremony Narrative Generation

**File:** `server/utils/llm/tasks/ceremony-narrative.ts`
**When:** During ceremony preparation

Generates a 600-800 word reflective journey narrative woven from the user's captured moments. Produces segmented output alternating between narration and user moment clips.

### Ceremony Moment Selection

**File:** `server/utils/llm/tasks/ceremony-select.ts`
**When:** During ceremony preparation

Selects which captured moments to include in the ceremony from all available moments.

---

## Session Lifecycle

### Complete Flow for a Core Session

```
1. User opens illusion session
        │
2. System builds system prompt:
   ├── BASE_SYSTEM_PROMPT
   ├── Basic personalization (intake data)
   ├── Rich personalization (moments, story, belief state)
   ├── Illusion-specific prompt
   ├── Cross-layer context (if Layer 2+)
   ├── Bridge context (if returning)
   ├── Abandoned session context (if applicable)
   └── Opening message instruction (if new)
        │
3. AI sends opening message (scripted per illusion)
        │
4. User sends a message
   ├── Message stored in Supabase
   ├── System prompt rebuilt (fresh context)
   ├── Sent to LLM with full history
   └── Moment detection runs IN PARALLEL
        │
5. AI responds (streamed via SSE)
   ├── Tokens streamed to client in real-time
   ├── Optional TTS audio chunks streamed alongside
   └── Full response stored in Supabase
        │
6. Steps 4-5 repeat until [SESSION_COMPLETE] detected
        │
7. Post-session tasks (non-blocking background):
   ├── Conviction assessment (score 0-10)
   ├── User story update (new triggers/stakes)
   ├── Key insight selection
   ├── Story summarization (if eligible)
   └── Check-in scheduling
```

### Streaming Response Format

Responses stream as Server-Sent Events with three message types:

```json
{ "type": "token", "token": "...", "conversationId": "..." }
{ "type": "audio_chunk", "chunk": "...", "conversationId": "..." }
{ "type": "done", "done": true, "sessionComplete": false, "streamingTTS": true }
```

---

## Key Design Decisions

### System Prompt Is Transient

The system prompt is never stored in the database. It's rebuilt fresh on every request. This means:
- Personalization always reflects current state
- Prompt changes take effect immediately without migration
- Message history stays clean (only user/assistant messages)

### Socratic Over Didactic

The AI is heavily biased toward asking questions rather than lecturing. The base prompt, every illusion prompt, and the reinforcement prompts all reinforce this. The goal is discovery, not instruction.

### User's Own Words Are Sacred

Throughout the system, captured moments (the user's actual quotes) are injected back into prompts. The AI is repeatedly told to "use their words," "remind them of what THEY discovered," and "reference their previous insights." This makes conversations feel personal rather than generic.

### Conviction Tracks But Doesn't Gate

The conviction score (0-10) is tracked after every session but never prevents the user from progressing. The assessment task always recommends "move_on." This is a philosophical choice — the program trusts the user's journey.

### Graceful Failure Everywhere

Every background LLM task has fallback behavior for parse failures or API errors. Moment detection silently fails. Conviction assessment defaults to the previous score. Ceremony narrative has a fallback template. The user never sees an error from background tasks.

### [SESSION_COMPLETE] Token Pattern

Rather than complex state management, session completion is signaled by the AI itself including `[SESSION_COMPLETE]` in its response. The server scans for this token and triggers post-session tasks. This keeps the AI in control of when a session feels genuinely complete.

---

## File Reference

| File | Purpose |
|------|---------|
| `server/utils/prompts/base-system.ts` | Core methodology, tone, session structure |
| `server/utils/prompts/index.ts` | Prompt assembly, opening messages, check-in prompt |
| `server/utils/prompts/illusions/illusion-{1-5}-*.ts` | Per-illusion beliefs, truths, questions, analogies |
| `server/utils/prompts/reinforcement-prompts.ts` | Reconnection and boost session overlays |
| `server/utils/prompts/support-prompt.ts` | Support conversation prompt builder |
| `server/utils/personalization/context-builder.ts` | Rich context from Supabase (moments, story, belief) |
| `server/utils/personalization/cross-layer-context.ts` | Previous layer insights and conviction history |
| `server/utils/llm/types.ts` | Message, ChatRequest, ChatResponse types |
| `server/utils/llm/task-executor.ts` | Task routing with per-task model/temperature config |
| `server/utils/llm/tasks/moment-detection.ts` | Capture-worthy moment classification |
| `server/utils/llm/tasks/conviction-assessment.ts` | Belief shift scoring after sessions |
| `server/utils/llm/tasks/checkin-personalization.ts` | Personalized check-in question generation |
| `server/utils/llm/tasks/story-summarization.ts` | Origin story synthesis from fragments |
| `server/utils/llm/tasks/key-insight-selection.ts` | Best insight selection from candidates |
| `server/utils/llm/tasks/ceremony-narrative.ts` | Journey narrative generation for ceremony |
| `server/utils/llm/tasks/ceremony-select.ts` | Moment selection for ceremony |
| `server/api/chat.post.ts` | Main chat endpoint — prompt assembly and streaming |
| `server/api/support/chat.post.ts` | Support conversation endpoint |
