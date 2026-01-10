# LLM Configuration Guide

**Last Updated:** 2026-01-10 (Reverted to Gemini defaults)

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [LLM Tasks Reference](#llm-tasks-reference)
3. [Environment Variables](#environment-variables)
4. [Provider Configuration](#provider-configuration)
5. [Task-Specific Model Overrides](#task-specific-model-overrides)
6. [Configuration Examples](#configuration-examples)
7. [Adding New Providers](#adding-new-providers)
8. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

### High-Level Flow

```
User Request
    ↓
API Endpoint (/api/chat.post.ts, /api/support/chat.post.ts)
    ↓
ModelRouter (routes to appropriate provider)
    ↓
LLM Provider (Groq, Gemini, Claude, OpenAI)
    ↓
Response (streaming or non-streaming)
```

### Core Components

| Component | Location | Purpose |
|-----------|----------|---------|
| **ModelRouter** | `/server/utils/llm/router.ts` | Routes LLM requests to appropriate provider |
| **TaskExecutor** | `/server/utils/llm/task-executor.ts` | Executes specialized background tasks |
| **Providers** | `/server/utils/llm/providers/` | Provider-specific implementations |
| **Types** | `/server/utils/llm/types.ts` | Type definitions and constants |

### Two Types of LLM Usage

#### 1. Main Conversation Chat
- **Purpose**: Real-time user conversations
- **Endpoint**: `/api/chat.post.ts`, `/api/support/chat.post.ts`
- **Default Provider**: Gemini (`gemini-2.0-flash`)
- **Override**: Set `DEFAULT_LLM_PROVIDER` env var
- **Supports**: Streaming and non-streaming responses

#### 2. Background Tasks
- **Purpose**: Analysis, assessment, structured extraction
- **Execution**: Via `TaskExecutor.executeTask()`
- **Default Provider**: Gemini (`gemini-pro` or `gemini-flash` based on task)
- **Override**: Set task-specific env vars (see below)
- **Examples**: Moment detection, conviction assessment, story summarization

---

## LLM Tasks Reference

### All Tasks in the System

| Task ID | When It Runs | Purpose | Default Model | Config |
|---------|--------------|---------|---------------|--------|
| **conversation** | Every user message | Main therapeutic dialogue | `gemini-pro` | temp: 0.7 |
| **moment.detect** | During user messages (20+ words) | Detect capture-worthy moments (insights, breakthroughs) | `gemini-flash` | temp: 0.3, max: 500 |
| **conviction.assess** | After session completes | Measure belief shift (0-10), extract triggers/stakes | `gemini-pro` | temp: 0.3, max: 1000 |
| **checkin.personalize** | Before daily check-ins | Tailor check-in questions to user's story | `gemini-flash` | temp: 0.7, max: 300 |
| **story.summarize** | After conviction assessment | Update user's evolving story | `gemini-pro` | temp: 0.5, max: 500 |
| **ceremony.narrative** | Before layer transitions | Generate personalized ceremony script | `gemini-pro` | temp: 0.8, max: 2000 |
| **ceremony.select** | When selecting ceremony type | Choose appropriate ceremony (smoke, burn, bury) | `gemini-pro` | temp: 0.3, max: 1000 |
| **key_insight.select** | After session completes | Pick most significant moment from session | `gemini-pro` | temp: 0.3, max: 500 |

### Task Model Selection Rationale

**Flash Model (`gemini-flash`):**
- Best for: Classification, selection, fast detection
- Tasks: moment.detect, checkin.personalize
- Speed: Fast response time

**Pro Model (`gemini-pro`):**
- Best for: Complex analysis, creative generation, nuanced understanding
- Tasks: conversation, conviction.assess, story.summarize, ceremony.narrative, ceremony.select, key_insight.select
- Speed: Slightly slower but higher quality

---

## Environment Variables

### Core Provider Configuration

```bash
# === Default Provider Selection ===
DEFAULT_LLM_PROVIDER=gemini
# Options: gemini, groq, anthropic, openai
# Default: gemini
# Used when no model parameter is specified in API requests

# === Gemini Configuration (Primary) ===
GEMINI_API_KEY=AI...
# Required: Google Gemini API key
# Get your key: https://makersuite.google.com/app/apikey

GEMINI_MODEL=gemini-2.0-flash
# Optional: Default Gemini model
# Default: gemini-2.0-flash

# === Groq Configuration (Alternative) ===
GROQ_API_KEY=gsk_...
# Optional: Your Groq API key from https://console.groq.com
# Get your key: https://console.groq.com/keys

GROQ_MODEL=llama-3.1-8b-instant
# Optional: Default Groq model to use
# Default: llama-3.1-8b-instant
# Options:
#   - llama-3.1-8b-instant (fastest, good quality)
#   - llama-3.3-70b-versatile (best quality, still fast)
#   - llama-3.1-70b-versatile (excellent general-purpose)
#   - mixtral-8x7b-32768 (32k context window)
#   - gemma2-9b-it (lightweight)

# === Anthropic Configuration (Future) ===
ANTHROPIC_API_KEY=sk-ant-...
# Optional: Anthropic Claude API key
# Get your key: https://console.anthropic.com

# === OpenAI Configuration (Future) ===
OPENAI_API_KEY=sk-...
# Optional: OpenAI API key
# Get your key: https://platform.openai.com/api-keys
```

### Task-Specific Model Overrides

Override individual tasks to use different models or providers:

```bash
# === Task-Specific Model Overrides ===
# Format: <provider>:<model> OR just <model> to use default provider
# Leave empty to use default configuration

# Main conversation
LLM_TASK_CONVERSATION_MODEL=
# Default: gemini-pro
# Example: groq:llama-3.3-70b-versatile

# Moment detection (runs during conversations)
LLM_TASK_MOMENT_DETECT_MODEL=
# Default: gemini-flash
# Runs on user messages with 20+ words

# Conviction assessment (runs after session completion)
LLM_TASK_CONVICTION_ASSESS_MODEL=
# Default: gemini-pro
# Measures belief shift, extracts triggers/stakes

# Check-in personalization (runs before daily check-ins)
LLM_TASK_CHECKIN_PERSONALIZE_MODEL=
# Default: gemini-flash
# Tailors questions to user's journey

# Story summarization (runs after conviction assessment)
LLM_TASK_STORY_SUMMARIZE_MODEL=
# Default: gemini-pro
# Updates user's evolving narrative

# Ceremony narrative generation (runs before layer transitions)
LLM_TASK_CEREMONY_NARRATIVE_MODEL=
# Default: gemini-pro
# Generates personalized ceremony scripts

# Ceremony selection (chooses ceremony type)
LLM_TASK_CEREMONY_SELECT_MODEL=
# Default: gemini-pro
# Selects: smoke, burn, or bury ceremony

# Key insight selection (runs after session completion)
LLM_TASK_KEY_INSIGHT_SELECT_MODEL=
# Default: gemini-pro
# Picks most significant moment from session
```

---

## Provider Configuration

### Gemini (Primary)

**Setup:**
1. Get API key: https://makersuite.google.com/app/apikey
2. Set `GEMINI_API_KEY` in `.env`
3. (Optional) Set `GEMINI_MODEL` to override default

**Available Models:**
- `gemini-2.0-flash` - Fast, high quality (default)
- `gemini-3-flash-preview` - Latest preview version

**Task Model Types:**
- `gemini-pro` - Maps to `gemini-2.0-flash`, used for complex tasks
- `gemini-flash` - Maps to `gemini-2.0-flash`, used for fast tasks

**Strengths:**
- High-quality responses
- Good multilingual support
- Free tier available
- Reliable and consistent

**Best For:**
- Main conversation chat
- Complex analysis tasks
- All default LLM tasks

---

### Groq (Alternative)

**Setup:**
1. Get API key: https://console.groq.com/keys
2. Set `GROQ_API_KEY` in `.env`
3. Set `DEFAULT_LLM_PROVIDER=groq` to use as primary
4. (Optional) Set `GROQ_MODEL` to override default

**Available Models:**
- `llama-3.1-8b-instant` - Ultra-fast, 128k context (default)
- `llama-3.3-70b-versatile` - High quality, 128k context
- `llama-3.1-70b-versatile` - Excellent general-purpose, 128k context
- `mixtral-8x7b-32768` - Large context window, very good quality
- `gemma2-9b-it` - Lightweight, 8k context

**Strengths:**
- ⚡ 10-100x faster inference than traditional providers
- 💰 Cost-effective for high-volume applications
- 🔧 OpenAI-compatible API (easy integration)

**Best For:**
- Real-time chat when speed is critical
- Fast classification tasks
- High-throughput applications

---

### Anthropic Claude (Future)

**Setup:**
1. Get API key: https://console.anthropic.com
2. Set `ANTHROPIC_API_KEY` in `.env`

**Available Models:**
- `claude-3-5-sonnet-20241022` - Balanced quality/speed
- `claude-3-5-haiku-20241022` - Fastest Claude model
- `claude-3-opus-20240229` - Highest quality (expensive)

**Best For:**
- Tasks requiring deep reasoning
- Creative writing tasks
- Complex analysis

---

### OpenAI (Future)

**Setup:**
1. Get API key: https://platform.openai.com/api-keys
2. Set `OPENAI_API_KEY` in `.env`

**Available Models:**
- `gpt-4o` - Latest GPT-4 Omni model
- `gpt-4o-mini` - Faster, cheaper variant
- `gpt-3.5-turbo` - Legacy fast model

**Best For:**
- Specific tasks requiring GPT-4 capabilities
- Testing/comparison purposes

---

## Task-Specific Model Overrides

### How It Works

1. **Default behavior**: Tasks use models defined in `task-executor.ts`
2. **Environment variable override**: Set `LLM_TASK_<TASKNAME>_MODEL`
3. **Format**: `<provider>:<model>` (e.g., `groq:llama-3.3-70b-versatile`)
4. **Precedence**: Env var > Default config

### Override Format

```bash
# Use task model type (recommended)
LLM_TASK_CONVICTION_ASSESS_MODEL=gemini-pro

# Mix providers by setting DEFAULT_LLM_PROVIDER
DEFAULT_LLM_PROVIDER=groq
LLM_TASK_CONVERSATION_MODEL=gemini-pro  # Will use Groq since it's the default provider
```

### Task Name Reference

| Env Var | Task ID |
|---------|---------|
| `LLM_TASK_CONVERSATION_MODEL` | `conversation` |
| `LLM_TASK_MOMENT_DETECT_MODEL` | `moment.detect` |
| `LLM_TASK_CONVICTION_ASSESS_MODEL` | `conviction.assess` |
| `LLM_TASK_CHECKIN_PERSONALIZE_MODEL` | `checkin.personalize` |
| `LLM_TASK_STORY_SUMMARIZE_MODEL` | `story.summarize` |
| `LLM_TASK_CEREMONY_NARRATIVE_MODEL` | `ceremony.narrative` |
| `LLM_TASK_CEREMONY_SELECT_MODEL` | `ceremony.select` |
| `LLM_TASK_KEY_INSIGHT_SELECT_MODEL` | `key_insight.select` |

---

## Configuration Examples

### Example 1: All Gemini (Default)
```bash
DEFAULT_LLM_PROVIDER=gemini
GEMINI_API_KEY=AI...

# All tasks use Gemini with defaults (gemini-pro and gemini-flash)
```

**Result**: High-quality responses, reliable, free tier available

---

### Example 2: All Groq (Fast)
```bash
DEFAULT_LLM_PROVIDER=groq
GROQ_API_KEY=gsk_...
GROQ_MODEL=llama-3.1-8b-instant

# All tasks use Groq
```

**Result**: Ultra-fast responses, cost-effective

---

### Example 3: Groq with Quality Mix
```bash
DEFAULT_LLM_PROVIDER=groq
GROQ_API_KEY=gsk_...

# Fast model for most tasks
GROQ_MODEL=llama-3.1-8b-instant

# Tasks will still use gemini-pro/gemini-flash types but route to Groq
```

**Result**: Fast chat with Groq infrastructure

---

### Example 4: Multi-Provider Setup
```bash
DEFAULT_LLM_PROVIDER=gemini
GEMINI_API_KEY=AI...
GROQ_API_KEY=gsk_...

# Gemini is primary, Groq available as alternative
# Switch providers by changing DEFAULT_LLM_PROVIDER
```

**Result**: Flexibility to switch between providers

---

## Adding New Providers

### Steps to Add a New Provider

1. **Create Provider Class** (`/server/utils/llm/providers/<provider>.ts`)
   ```typescript
   import type { LLMProvider, Message, ChatResponse, ChatStreamResponse } from '../types'

   export class NewProvider implements LLMProvider {
     async chat(messages: Message[]): Promise<ChatResponse> {
       // Implementation
     }

     async *chatStream(messages: Message[]): AsyncGenerator<ChatStreamResponse> {
       // Implementation
     }
   }
   ```

2. **Update Types** (`/server/utils/llm/types.ts`)
   ```typescript
   export type ModelType = 'groq' | 'gemini' | 'anthropic' | 'openai' | 'newprovider'
   ```

3. **Update Router** (`/server/utils/llm/router.ts`)
   ```typescript
   import { NewProvider } from './providers/newprovider'

   constructor(config: LLMConfig) {
     if (config.newProviderApiKey) {
       this.providers.set('newprovider', new NewProvider(
         config.newProviderApiKey,
         config.newProviderModel
       ))
     }
   }
   ```

4. **Update Runtime Config** (`nuxt.config.ts`)
   ```typescript
   runtimeConfig: {
     newProviderApiKey: process.env.NEW_PROVIDER_API_KEY,
     newProviderModel: process.env.NEW_PROVIDER_MODEL || 'default-model',
   }
   ```

5. **Update Environment Variables** (`.env.example`)
   ```bash
   NEW_PROVIDER_API_KEY=
   NEW_PROVIDER_MODEL=
   ```

---

## Troubleshooting

### Issue: "No provider available for model: gemini"

**Cause**: `GEMINI_API_KEY` not set or invalid

**Solution**:
1. Check `.env` file has `GEMINI_API_KEY=AI...`
2. Restart dev server: `npm run dev`
3. Verify API key at https://makersuite.google.com/app/apikey

---

### Issue: Slow response times

**Cause**: Using slow model or provider

**Solution**:
1. Consider switching to Groq: `DEFAULT_LLM_PROVIDER=groq`
2. Check task config in task-executor.ts
3. Monitor provider status pages

---

### Issue: Task using wrong model

**Cause**: Env var override or default config

**Solution**:
1. Check `.env` for task-specific overrides
2. View active config in logs (task executor logs model used)
3. Clear env var to use default: `LLM_TASK_<TASK>_MODEL=`

---

### Issue: Provider initialization fails

**Cause**: Missing API key or network issue

**Solution**:
1. Check API key is valid and not expired
2. Verify network connectivity
3. Check provider status page
4. Review server logs for specific error

---

### Issue: Streaming not working

**Cause**: Provider doesn't support streaming or implementation issue

**Solution**:
1. Check provider implements `chatStream()` method
2. Verify client handles Server-Sent Events correctly
3. Test non-streaming first: `stream: false` in request
4. Review network tab for SSE connection

---

### Issue: Environment variables not loading

**Cause**: Wrong prefix or server not restarted

**Solution**:
1. Server-side vars: No `NUXT_PUBLIC_` prefix needed
2. Client-side vars: Must use `NUXT_PUBLIC_` prefix
3. Restart server after `.env` changes
4. Check `nuxt.config.ts` runtimeConfig mapping

---

## Configuration Files Reference

| File | Purpose | What to Change |
|------|---------|----------------|
| `.env` | Environment variables (not committed) | Add API keys, override models |
| `.env.example` | Environment variable template | Add new variables for documentation |
| `nuxt.config.ts` | Runtime configuration | Map env vars to config object |
| `/server/utils/llm/types.ts` | Type definitions | Add new model types, update constants |
| `/server/utils/llm/router.ts` | Provider routing | Initialize new providers |
| `/server/utils/llm/task-executor.ts` | Task configuration | Change default models for tasks |
| `/server/utils/llm/providers/` | Provider implementations | Add new provider classes |

---

## Best Practices

### 1. API Key Security
- ✅ Never commit `.env` to git
- ✅ Use `.env.example` for documentation
- ✅ Rotate keys regularly
- ✅ Use different keys for dev/prod

### 2. Model Selection
- ⚡ Use `gemini-flash` for fast tasks (detection, personalization)
- 🎯 Use `gemini-pro` for complex tasks (analysis, narrative generation)
- 💰 Monitor costs per provider
- 🔄 Test different models regularly

### 3. Configuration Management
- 📝 Document all env var changes
- 🧪 Test changes in dev before prod
- 📊 Monitor performance after changes
- 🔙 Keep fallback providers configured

### 4. Task Configuration
- 🎯 Match model to task complexity
- ⚡ Prioritize speed for user-facing tasks
- 🧠 Use quality models for important analysis
- 📈 Monitor task execution times

---

## Performance Benchmarks

### Typical Response Times

#### Gemini (Default)
| Model | Avg Latency | Best For |
|-------|-------------|----------|
| gemini-2.0-flash | 1-3s | All tasks |

#### Groq (Alternative)
| Model | Avg Latency | Tokens/sec | Best For |
|-------|-------------|------------|----------|
| llama-3.1-8b-instant | 200-500ms | 800-1000 | Real-time chat |
| llama-3.3-70b-versatile | 1-2s | 300-500 | Complex analysis |
| mixtral-8x7b-32768 | 1-3s | 400-600 | Large context |

### Task Execution Time Targets

| Task | Target Time | Default Model |
|------|-------------|---------------|
| conversation | <3s | gemini-pro |
| moment.detect | <2s | gemini-flash |
| conviction.assess | <5s | gemini-pro |
| checkin.personalize | <2s | gemini-flash |
| story.summarize | <3s | gemini-pro |
| ceremony.narrative | <5s | gemini-pro |
| ceremony.select | <3s | gemini-pro |
| key_insight.select | <3s | gemini-pro |

---

**Maintained by:** Development Team
**Questions?** Check Troubleshooting section or review code comments in `/server/utils/llm/`
