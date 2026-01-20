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

| Document | Description |
|----------|-------------|
| [core-program-spec.md](specs/core-program-spec.md) | Core coaching program: sessions, check-ins, ceremonies, and AI interactions |
| [authentication-spec.md](specs/authentication-spec.md) | User authentication with Supabase (magic link) |
| [chat-infrastructure-spec.md](specs/chat-infrastructure-spec.md) | Real-time AI chat infrastructure |
| [voice-interface-spec.md](specs/voice-interface-spec.md) | Voice-based coaching interface |
| [analytics-spec.md](specs/analytics-spec.md) | Analytics and event tracking implementation |
| [mailing-list-spec.md](specs/mailing-list-spec.md) | Email capture and mailing list functionality |
| [seo-strategy-spec.md](specs/seo-strategy-spec.md) | SEO and landing page optimization |
| [stripe-market-validation-spec.md](specs/stripe-market-validation-spec.md) | Stripe integration for market validation |
| [foundation-setup-spec.md](specs/foundation-setup-spec.md) | Initial project setup and infrastructure |

## Decisions

Architecture Decision Records and product decisions.

| Document | Description |
|----------|-------------|
| [architecture-decisions.md](decisions/architecture-decisions.md) | Technical architecture decisions and rationale |
| [mailing-list-decisions.md](decisions/mailing-list-decisions.md) | Product decisions for mailing list feature |

## Guides

Reference documentation and how-to guides.

| Document | Description |
|----------|-------------|
| [llm-configuration-guide.md](guides/llm-configuration-guide.md) | LLM provider configuration and prompt management |

## Testing

Test plans and QA documentation.

| Document | Description |
|----------|-------------|
| [core-program-test-plan.md](testing/core-program-test-plan.md) | Smoke testing plan for core program epic |

---

## Contributing

When adding new documentation:

1. Choose the appropriate folder based on document type
2. Follow the naming convention for that type
3. Update this README with a link and description
4. Commit with a clear message describing the addition
