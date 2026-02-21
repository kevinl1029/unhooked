# TTS Provider Cost Analysis

**Date:** 2026-02-20
**Based on:** 41 completed conversations, 425 assistant messages from production data

---

## Overview

This report compares the cost of text-to-speech providers for the Unhooked app, using real production message data. It covers per-message, per-conversation, and full-program cost projections across Inworld TTS (current provider), ElevenLabs default voices, and ElevenLabs premium voice library voices.

---

## Data Foundation

### LLM Stack
- **Model:** Gemini 3 Flash Preview
- **Pricing:** $0.50/1M input tokens, $3.00/1M output tokens
- **Estimated system prompt:** ~2,000 tokens
- **LLM cost per message:** ~$0.002 (negligible)

### Assistant Message Length (completed conversations only, n=222)

| Metric | Characters |
|--------|-----------|
| Median | 596 |
| Average | 810 |
| P25 | 454 |
| P75 | 862 |
| P90 (Long) | 1,417 |
| P95 (Very Long) | 2,289 |
| Min | 173 |
| Max | 4,562 |

### Completed Conversation Stats (n=41)

| Metric | Value |
|--------|-------|
| Avg messages per conversation (user + assistant) | 10.2 |
| Median messages per conversation | 11 |
| Avg assistant messages per conversation | 5.4 |
| Avg user messages per conversation | 4.8 |
| Avg assistant characters per conversation | 4,384 |
| Median assistant characters per conversation | 4,363 |
| Min assistant characters per conversation | 2,048 |
| Max assistant characters per conversation | 6,870 |

---

## TTS Provider Pricing

### Inworld TTS (Current Provider)
- **Model:** inworld-tts-1.5-max
- **Pricing:** $10 per 1M characters
- **Billing:** Pure pay-per-use, no subscription

### ElevenLabs

- **Billing:** Monthly subscription with credit allocation
- **Voice library:** Premium community voices have an additional per-credit fee (e.g., $0.20/1,000 credits for the "Eryn" voice)

#### ElevenLabs Credit System

Credit consumption depends on the TTS model used. Our integration uses `eleven_flash_v2_5`.

| Model Family | Credits per Character | Examples |
|-------------|----------------------:|---------|
| Standard | 1 credit/char | English V1, Multilingual V1, Multilingual V2, Eleven V3 |
| **Flash / Turbo** | **0.5 credits/char** | **Flash V2, Flash V2.5 (ours), Turbo V2, Turbo V2.5** |

This distinction is critical — Flash models get 2x the characters per credit, effectively halving TTS cost.

#### ElevenLabs Plan Tiers

| Plan | $/month | Credits/month | $/credit | Convos/mo (Standard)* | Convos/mo (Flash)* |
|------|--------:|-------------:|---------:|----------------------:|-------------------:|
| Free | $0 | 10,000 | — | 2 | 4 |
| Starter | $5 | 30,000 | $0.000167 | 6 | 13 |
| Creator | $22 | 100,000 | $0.000220 | 22 | 45 |
| Pro | $99 | 500,000 | $0.000198 | 114 | 228 |
| Scale | $330 | 2,000,000 | $0.000165 | 456 | 912 |
| Business | $1,320 | 11,000,000 | $0.000120 | 2,509 | 5,018 |

*Based on avg 4,384 assistant chars per conversation. Standard = 4,384 credits/convo, Flash = 2,192 credits/convo.

---

## Cost Per Message

All tables show all-in cost (LLM + TTS). LLM is ~$0.002/msg across all scenarios. Assumes full credit utilization.

### Inworld TTS Max (Current)

| Scenario | Chars | LLM | TTS | **Total** |
|----------|------:|----:|----:|----------:|
| Median | 596 | $0.0018 | $0.0060 | **$0.008** |
| Average | 810 | $0.0019 | $0.0081 | **$0.010** |
| Long (P90) | 1,417 | $0.0024 | $0.0142 | **$0.017** |
| Very Long (P95) | 2,289 | $0.0030 | $0.0229 | **$0.026** |

### ElevenLabs — Standard Models (1 credit/char)

#### Default Voice

| Scenario | Chars | Credits | Starter $5 | Creator $22 | Pro $99 | Scale $330 | Business $1,320 |
|----------|------:|--------:|-----------:|------------:|--------:|-----------:|----------------:|
| Median | 596 | 596 | $0.10 | $0.13 | $0.12 | $0.10 | $0.07 |
| Average | 810 | 810 | $0.14 | $0.18 | $0.16 | $0.14 | $0.10 |
| Long (P90) | 1,417 | 1,417 | $0.24 | $0.31 | $0.28 | $0.24 | $0.17 |
| Very Long (P95) | 2,289 | 2,289 | $0.38 | $0.51 | $0.46 | $0.38 | $0.28 |

#### Eryn Voice (+$0.20/1K credits)

| Scenario | Chars | Credits | Starter $5 | Creator $22 | Pro $99 | Scale $330 | Business $1,320 |
|----------|------:|--------:|-----------:|------------:|--------:|-----------:|----------------:|
| Median | 596 | 596 | $0.22 | $0.25 | $0.24 | $0.22 | $0.19 |
| Average | 810 | 810 | $0.30 | $0.34 | $0.32 | $0.30 | $0.26 |
| Long (P90) | 1,417 | 1,417 | $0.52 | $0.60 | $0.57 | $0.52 | $0.46 |
| Very Long (P95) | 2,289 | 2,289 | $0.84 | $0.96 | $0.91 | $0.84 | $0.74 |

### ElevenLabs — Flash/Turbo Models (0.5 credits/char) *Our Integration*

#### Default Voice

| Scenario | Chars | Credits | Starter $5 | Creator $22 | Pro $99 | Scale $330 | Business $1,320 |
|----------|------:|--------:|-----------:|------------:|--------:|-----------:|----------------:|
| Median | 596 | 298 | $0.05 | $0.07 | $0.06 | $0.05 | $0.04 |
| Average | 810 | 405 | $0.07 | $0.09 | $0.08 | $0.07 | $0.05 |
| Long (P90) | 1,417 | 708 | $0.12 | $0.16 | $0.14 | $0.12 | $0.09 |
| Very Long (P95) | 2,289 | 1,144 | $0.19 | $0.25 | $0.23 | $0.19 | $0.14 |

#### Eryn Voice (+$0.20/1K credits)

| Scenario | Chars | Credits | Starter $5 | Creator $22 | Pro $99 | Scale $330 | Business $1,320 |
|----------|------:|--------:|-----------:|------------:|--------:|-----------:|----------------:|
| Median | 596 | 298 | $0.11 | $0.13 | $0.12 | $0.11 | $0.10 |
| Average | 810 | 405 | $0.15 | $0.17 | $0.16 | $0.15 | $0.13 |
| Long (P90) | 1,417 | 708 | $0.26 | $0.30 | $0.28 | $0.26 | $0.23 |
| Very Long (P95) | 2,289 | 1,144 | $0.42 | $0.48 | $0.46 | $0.42 | $0.37 |

---

## Cost Per Conversation

Based on avg 4,384 assistant characters and 5.4 assistant messages per completed conversation.

### Summary

| Provider | Standard (1 cr/char) | Flash (0.5 cr/char) |
|----------|---------------------:|--------------------:|
| **Inworld Max (current)** | **$0.055** | **$0.055** |

| ElevenLabs Plan | Default (Standard) | Default (Flash) | Eryn (Standard) | Eryn (Flash) |
|-----------------|-------------------:|----------------:|----------------:|-------------:|
| Starter $5 | $0.74 | $0.38 | $1.62 | $0.81 |
| Creator $22 | $0.98 | $0.49 | $1.85 | $0.93 |
| Pro $99 | $0.88 | $0.44 | $1.76 | $0.88 |
| Scale $330 | $0.73 | $0.37 | $1.61 | $0.81 |
| Business $1,320 | $0.54 | $0.27 | $1.41 | $0.71 |

### Breakdown — Standard Models (4,384 chars = 4,384 credits/convo)

| Plan | TTS Credit Cost | Eryn Voice Fee | LLM | Default Total | Eryn Total | Convos/mo |
|------|----------------:|---------------:|----:|--------------:|-----------:|----------:|
| Starter $5 | $0.73 | $0.88 | $0.01 | $0.74 | $1.62 | 6 |
| Creator $22 | $0.96 | $0.88 | $0.01 | $0.98 | $1.85 | 22 |
| Pro $99 | $0.87 | $0.88 | $0.01 | $0.88 | $1.76 | 114 |
| Scale $330 | $0.72 | $0.88 | $0.01 | $0.73 | $1.61 | 456 |
| Business $1,320 | $0.53 | $0.88 | $0.01 | $0.54 | $1.41 | 2,509 |

### Breakdown — Flash/Turbo Models (4,384 chars = 2,192 credits/convo) *Our Integration*

| Plan | TTS Credit Cost | Eryn Voice Fee | LLM | Default Total | Eryn Total | Convos/mo |
|------|----------------:|---------------:|----:|--------------:|-----------:|----------:|
| Starter $5 | $0.37 | $0.44 | $0.01 | $0.38 | $0.81 | 13 |
| Creator $22 | $0.48 | $0.44 | $0.01 | $0.49 | $0.93 | 45 |
| Pro $99 | $0.43 | $0.44 | $0.01 | $0.44 | $0.88 | 228 |
| Scale $330 | $0.36 | $0.44 | $0.01 | $0.37 | $0.81 | 912 |
| Business $1,320 | $0.26 | $0.44 | $0.01 | $0.27 | $0.71 | 5,018 |

---

## Full Program Projections

Program scenarios: 30 conversations (15 core + reinforcement), 50 conversations (moderate engagement), 100 conversations (heavy engagement). All costs are per user, calculated as unit cost x conversations assuming full credit utilization.

### Inworld Max (Current)

| | 30 convos | 50 convos | 100 convos |
|--|----------:|----------:|-----------:|
| LLM | $0.32 | $0.54 | $1.08 |
| TTS | $1.32 | $2.19 | $4.38 |
| **Total** | **$1.64** | **$2.73** | **$5.46** |

### ElevenLabs — Standard Models (1 credit/char)

#### Default Voice

| Plan | Unit Cost | 30 convos | 50 convos | 100 convos |
|------|----------:|----------:|----------:|-----------:|
| Starter $5 | $0.74 | $22.24 | $37.07 | $74.15 |
| Creator $22 | $0.98 | $29.26 | $48.76 | $97.53 |
| Pro $99 | $0.88 | $26.36 | $43.94 | $87.88 |
| Scale $330 | $0.73 | $22.02 | $36.71 | $73.42 |
| Business $1,320 | $0.54 | $16.11 | $26.84 | $53.69 |

#### Eryn Voice (+$0.20/1K credits)

| Plan | Unit Cost | 30 convos | 50 convos | 100 convos |
|------|----------:|----------:|----------:|-----------:|
| Starter $5 | $1.62 | $48.55 | $80.91 | $161.83 |
| Creator $22 | $1.85 | $55.56 | $92.60 | $185.21 |
| Pro $99 | $1.76 | $52.67 | $87.78 | $175.56 |
| Scale $330 | $1.61 | $48.33 | $80.55 | $161.10 |
| Business $1,320 | $1.41 | $42.41 | $70.68 | $141.37 |

### ElevenLabs — Flash/Turbo Models (0.5 credits/char) *Our Integration*

#### Default Voice

| Plan | Unit Cost | 30 convos | 50 convos | 100 convos |
|------|----------:|----------:|----------:|-----------:|
| Starter $5 | $0.38 | $11.28 | $18.81 | $37.61 |
| Creator $22 | $0.49 | $14.79 | $24.65 | $49.30 |
| Pro $99 | $0.44 | $13.34 | $22.24 | $44.48 |
| Scale $330 | $0.37 | $11.17 | $18.62 | $37.25 |
| Business $1,320 | $0.27 | $8.22 | $13.69 | $27.38 |

#### Eryn Voice (+$0.20/1K credits)

| Plan | Unit Cost | 30 convos | 50 convos | 100 convos |
|------|----------:|----------:|----------:|-----------:|
| Starter $5 | $0.81 | $24.44 | $40.73 | $81.45 |
| Creator $22 | $0.93 | $27.94 | $46.57 | $93.14 |
| Pro $99 | $0.88 | $26.50 | $44.16 | $88.32 |
| Scale $330 | $0.81 | $24.33 | $40.54 | $81.09 |
| Business $1,320 | $0.71 | $21.37 | $35.61 | $71.22 |

### Side-by-Side Summary

Best value tier shown for each ElevenLabs option.

#### Standard Models (1 credit/char)

| | 30 convos | 50 convos | 100 convos |
|--|----------:|----------:|-----------:|
| **Inworld Max** | **$1.64** | **$2.73** | **$5.46** |
| EL Default (Starter) | $22.24 | $37.07 | $74.15 |
| EL Default (Business) | $16.11 | $26.84 | $53.69 |
| EL Eryn (Starter) | $48.55 | $80.91 | $161.83 |
| EL Eryn (Business) | $42.41 | $70.68 | $141.37 |

#### Flash/Turbo Models (0.5 credits/char) *Our Integration*

| | 30 convos | 50 convos | 100 convos |
|--|----------:|----------:|-----------:|
| **Inworld Max** | **$1.64** | **$2.73** | **$5.46** |
| EL Default (Starter) | $11.28 | $18.81 | $37.61 |
| EL Default (Business) | $8.22 | $13.69 | $27.38 |
| EL Eryn (Starter) | $24.44 | $40.73 | $81.45 |
| EL Eryn (Business) | $21.37 | $35.61 | $71.22 |

---

## Key Findings

1. **Model choice matters as much as plan choice.** Flash/Turbo models (0.5 credits/char) halve all ElevenLabs costs. Our integration uses `eleven_flash_v2_5`, which gets the favorable rate.

2. **Inworld is dramatically cheaper.** At $10/1M characters (pay-per-use), Inworld TTS 1.5 Max costs ~$0.055/conversation. Even with Flash models, ElevenLabs default voice is $0.27–$0.49/conversation (5–9x more). With the Eryn voice it's $0.71–$0.93/conversation (13–17x more).

3. **LLM cost is negligible.** Gemini 3 Flash at ~$0.002/message means LLM is ~1% of total cost. TTS dominates.

4. **ElevenLabs plan tier barely affects unit cost.** Starter ($5/mo) and Scale ($330/mo) have nearly identical per-credit economics. You pay more for volume capacity, not a better rate. Creator is actually the worst value per credit.

5. **Voice library fees are significant.** The Eryn voice at $0.20/1,000 credits adds $0.44/conversation on Flash (~doubling the cost vs a default voice).

6. **Full program costs per user (Flash model, Starter tier):**
   - Inworld: $1.64–$5.46 (30–100 convos)
   - ElevenLabs default: $11–$38 (30–100 convos)
   - ElevenLabs Eryn: $24–$81 (30–100 convos)

7. **The subscription model creates a floor.** Even with zero usage, you're paying $5–$1,320/month. This only makes sense at scale where you're sharing credits across many concurrent users.

---

## Recommendations

- **Stay with Inworld** for cost efficiency. Even against ElevenLabs Flash models, Inworld is 5–17x cheaper per conversation.
- **ElevenLabs makes sense only if** voice quality justifies 5x+ cost increase, or if a specific voice is critical to the product experience.
- **If switching to ElevenLabs:** Use Flash/Turbo models (halves cost). Starter ($5/mo) offers the best unit economics for low volume. Scale ($330/mo) is only worthwhile at 900+ conversations/month across all users.
- **Avoid premium voice library voices** unless they provide a measurable conversion or retention improvement — they roughly double the per-conversation cost.

---

## Data Sources

- Production database: 41 completed conversations, 425 assistant messages (queried 2026-02-20)
- [Gemini API Pricing](https://ai.google.dev/gemini-api/docs/pricing)
- [Inworld TTS Pricing](https://inworld.ai/tts-api) — $5/1M chars (Mini), $10/1M chars (Max)
- [ElevenLabs Pricing](https://elevenlabs.io/pricing)
- [ElevenLabs Credits Documentation](https://help.elevenlabs.io/hc/en-us/articles/27562020846481-What-are-credits)
- [ElevenLabs Model Credit Rates](https://help.elevenlabs.io/hc/en-us/articles/17883183930129-What-models-do-you-offer-and-what-is-the-difference-between-them)
