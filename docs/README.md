# Unhooked Documentation

This folder contains all product and technical documentation for Unhooked.

## Folder Structure

```
docs/
├── specs/        # Technical specifications (PRD + technical design)
├── decisions/    # Architecture Decision Records (ADRs) and product decisions
├── guides/       # Reference guides and how-tos
├── testing/      # Test plans and QA documentation
└── README.md     # This index
```

## Naming Conventions

| Type | Pattern | Example |
|------|---------|---------|
| Specs | `{feature}-spec.md` | `authentication-spec.md` |
| Decisions | `{scope}-decisions.md` | `architecture-decisions.md` |
| Guides | `{topic}-guide.md` | `llm-configuration-guide.md` |
| Testing | `{feature}-test-plan.md` | `core-program-test-plan.md` |

**Note:** Version numbers are not included in file names. Git handles versioning.

---

## Specifications

Technical specifications combining product requirements with implementation design.

### Implemented

Features that have been built and are live.

| Document | Description |
|----------|-------------|
| [foundation-setup-spec.md](specs/foundation-setup-spec.md) | Initial project setup: Nuxt 3, Tailwind, Vercel deployment |
| [authentication-spec.md](specs/authentication-spec.md) | User authentication with Supabase (magic link) |
| [chat-infrastructure-spec.md](specs/chat-infrastructure-spec.md) | Real-time AI chat infrastructure with Gemini integration |
| [voice-interface-spec.md](specs/voice-interface-spec.md) | Voice-based coaching interface (STT + TTS) |
| [chat-resilience-retry-failover-spec.md](specs/chat-resilience-retry-failover-spec.md) | Chat reliability: transient retries, provider failover, and recovery UX |
| [core-program-spec.md](specs/core-program-spec.md) | Core coaching program baseline: sessions, progress tracking, conviction assessment, SESSION_COMPLETE flow |
| [content-library-expansion-spec.md](specs/content-library-expansion-spec.md) | Expanded coaching content: CBT, neuroscience, and MI additions to illusion prompts |
| [evidence-based-coaching-spec.md](specs/evidence-based-coaching-spec.md) | Session model evolution: 3-layer sessions per illusion, observation assignments, evidence-loop check-ins |
| [stripe-market-validation-spec.md](specs/stripe-market-validation-spec.md) | Stripe checkout integration for market validation |
| [mailing-list-spec.md](specs/mailing-list-spec.md) | Email capture and mailing list via Resend |
| [seo-strategy-spec.md](specs/seo-strategy-spec.md) | SEO and landing page optimization |
| [ceremony-spec.md](specs/ceremony-spec.md) | Multi-step ceremony experience for program completion |
| [check-in-spec.md](specs/check-in-spec.md) | Check-in system: scheduled engagement and evidence-bridge check-ins between sessions |
| [follow-up-spec.md](specs/follow-up-spec.md) | Post-ceremony follow-up scheduling and reinforcement messaging |
| [moment-capture-spec.md](specs/moment-capture-spec.md) | Capturing user moments/experiences for AI personalization context |
| [personalization-engine-spec.md](specs/personalization-engine-spec.md) | Context builder that personalizes coaching based on user moments and progress |
| [reinforcement-sessions-spec.md](specs/reinforcement-sessions-spec.md) | Post-ceremony reinforcement/boost sessions with progression |
| [reinforcement-ui-design-spec.md](specs/reinforcement-ui-design-spec.md) | UI/UX design for reinforcement sessions carousel and components |
| [illusion-key-migration-spec.md](specs/illusion-key-migration-spec.md) | Refactor: illusion_number to illusion_key migration |
| [lead-funnel-session-zero-magnet-spec.md](specs/lead-funnel-session-zero-magnet-spec.md) | Session Zero lead magnet: 5-minute audio experience for lead nurture |

### Not Yet Implemented

| Document | Description |
|----------|-------------|
| [analytics-spec.md](specs/analytics-spec.md) | Analytics and event tracking for market validation funnel |

## Decisions

Architecture Decision Records and product decisions.

| Document | Description |
|----------|-------------|
| [architecture-decisions.md](decisions/architecture-decisions.md) | Technical architecture decisions and rationale |

## Guides

Reference documentation and how-to guides.

| Document | Description |
|----------|-------------|
| [coaching-framework-guide.md](guides/coaching-framework-guide.md) | Coaching methodology: Allen Carr, CBT, MI, and neuroscience foundations |
| [conversation-architecture-guide.md](guides/conversation-architecture-guide.md) | How LLM prompts, system instructions, and conversations are assembled |
| [llm-configuration-guide.md](guides/llm-configuration-guide.md) | LLM provider configuration, model router, and task registry |
| [design-system-external-tools.md](guides/design-system-external-tools.md) | Unhooked design system prompt for external AI tools (v0.dev, etc.) |

## Testing

Test plans and QA documentation.

| Document | Description |
|----------|-------------|
| [core-program-test-plan.md](testing/core-program-test-plan.md) | Manual smoke testing plan for core program epic |

---

## Contributing

When adding new documentation:

1. Choose the appropriate folder based on document type
2. Follow the naming convention for that type
3. Update this README with a link and description
4. Commit with a clear message describing the addition
