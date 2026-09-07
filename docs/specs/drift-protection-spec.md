# Unhooked: Drift Protection Specification

**Version:** 1.6
**Created:** 2026-09-07
**Last Updated:** 2026-09-07
**Status:** Planning
**Document Type:** Feature Specification (PRD + Technical Design)
**Owner:** Kevin
**Related Documents:**
- `re-entry-spec.md` (Re-entry — what happens after a relapse; extracted from this spec at v1.4)
- `core-program-spec.md` (Program Structure, The Five Illusions, Conviction Tracking, LLM Tasks Registry, `captured_moments` schema; also the source of the open question *"Relapse protocol: what's the re-engagement conversation flow?"*, which this spec and `re-entry-spec.md` answer)
- `check-in-spec.md` (`check_in_schedule` — the **in-program** schedule; its scheduler explicitly stops at ceremony completion, which is why drift touches do not live here. Email delivery, quiet hours and unsubscribe patterns are reused.)
- `moment-capture-spec.md` (Moment Capture — new moment types are added here)
- `ceremony-spec.md` (Ceremony Flow — the Forecast beat in Module 2.1 is a new ceremony beat)
- `reinforcement-sessions-spec.md` (Post-ceremony reinforcement: the existing "I'm struggling" / Boost pull surfaces this spec supplements)
- `follow-up-spec.md` (Post-ceremony follow-up scheduling — `follow_up_schedule`, the table drift touches extend, and the channel that is **not yet wired to a sender**; see §0)
- `guides/coaching-framework-guide.md` (Five Illusions doctrine — source content for reconstruction sessions)
- `guides/llm-configuration-guide.md` (Model router and task registry — where `reconstruction.generate` is registered)
- Architecture Decision Records: ADR-010 (Loss-of-Freedom Framing), ADR-011 (Retrieval over Re-presentation), ADR-012 (Push-First Delivery) proposed in Appendix A; ADR-013 (Conversational Relapse Inference) proposed in `re-entry-spec.md`

---

## Table of Contents

0. [Dependencies](#0-dependencies)
1. [Problem Statement](#1-problem-statement)
2. [Goals](#2-goals)
3. [Non-Goals](#3-non-goals)
4. [Solution Overview](#4-solution-overview)
5. [User Journeys and Stories](#5-user-journeys-and-stories)
6. [Requirements](#6-requirements)
7. [Data Model Changes](#7-data-model-changes)
8. [Success Metrics](#8-success-metrics)
9. [Open Questions](#9-open-questions)
10. [Phasing](#10-phasing)
11. [Appendix A: Proposed Decision Records](#appendix-a-proposed-decision-records)
12. [Changelog](#changelog)

---

## 0. Dependencies

Verified against `main`. Three of these change what Phase 0 costs.

| # | Dependency | Current state | Blocks |
|---|-----------|---------------|--------|
| D1 | **A post-ceremony email sender** | `follow_up_schedule` rows are inserted at ceremony completion (`server/api/ceremony/complete.post.ts`) but **nothing ever sends them.** `server/api/cron/check-ins.get.ts` processes scheduled check-ins, ceremony nudges and the expiration sweep — there is no follow-up sender in `server/utils/email/`. | Everything push-delivered, including Phase 0's three emails. Journey A Stage 3's *"existing Day 3 and Day 7 check-ins, unchanged"* is inaccurate: those are dashboard-surfaced only. |
| D2 | **Moment audio capture** | `captured_moments.audio_clip_path` is hardcoded `null` at both write sites, marked *"Audio capture deferred for MVP"*. | Module 2.2's `shrug_rebuttal` recording, which is the primary drift-window playback artifact. Shared with `re-entry-spec.md` §0 D1; **decision taken to ship it.** |
| D3 | **A conversational surface at intake** | Intake is a structured form (`components/IntakeForm.vue` → `user_intake`), not a conversation. `captured_moments` rows require a `conversation_id` and are produced by LLM moment detection during chat. | Module 4's `relapse_cost_account` capture *"at intake"*. Nearest existing fields are `user_intake.previous_attempts` and `longest_quit_duration`. See Module 4. |
| D4 | **Resend event webhooks** | Only `server/api/webhooks/stripe.post.ts` exists. No Resend webhook endpoint, so open/delivery events are not recorded anywhere. | The drift touch open-rate metric in §8. |

---

## 1. Problem Statement

Users who successfully complete a quit do not relapse during the hard part. They relapse during the easy part.

The observed pattern: past acute withdrawal by day 3, comfortably abstinent through week two, then relapse somewhere in the day 10–30 window. At the moment of relapse there is no craving, no stress trigger, and no felt internal conflict. The decision is experienced as a shrug — *"why not"* — and is made in seconds, without the user registering it as a decision at all. Re-quitting afterward is then disproportionately difficult, producing weeks of daily attempt-and-fail cycles that are far more punishing than the original quit.

This is the highest-cost failure mode in the product and the one Unhooked currently has no mechanism for. Every existing surface assumes relapse arrives as struggle.

### 1.1 Why the current architecture misses it

The entire program targets **desire**. The Five Illusions dismantle nicotine's perceived benefits so the user stops wanting it. Conviction scoring, moment capture, the cheat sheet, and the post-ceremony *"I'm struggling"* / *"Boost"* buttons all inherit that assumption: relapse looks like wanting, and a wanting user will reach for help.

At week three there is nothing to reach for help *about*. Both post-ceremony support surfaces require the user to self-identify as at risk. The failure mode is *defined by* the absence of felt risk. The safety net has a hole precisely where users fall through it.

### 1.2 The three mechanisms

**M1 — Salience decay.** Negative affect associated with a past state fades faster than positive affect. Three weeks out, the memory of the misery is gone while the memory of the ritual survives intact. Nothing in the user's day flags nicotine as a live topic, so nothing prompts engagement with the app, the framework, or any deterrent.

**M2 — Absent stake.** *"Nicotine does nothing for me"* is a symmetric proposition. It defeats *"I want one."* It does not defeat *"why not."* If nicotine genuinely does nothing, then nothing much is at stake in trying one — the argument that removes the pull also removes the push. Carr patches this with *"there is no such thing as just one,"* but that patch draws its force from fear of the trap, and by week three the fear has fully dissipated. **The method's own success removes its deterrent.** This is the central insight of this spec.

**M3 — Affect decay and habituation.** The active ingredient in Carr's method is not the argument; it is the *state* the argument produces — optimism, excitement, and above all the absence of fear about being a non-user. That state decays on a timescale of weeks. Re-reading can restore it, but re-reading is (a) high-friction enough to be avoided, and (b) subject to habituation — the second read has lower amplitude than the first, and a recent read has almost none. Users know this, which is why the prescription "just read it again" is met with dread.

### 1.3 The strategic opening

Re-reading is among the least effective ways to maintain knowledge. Retrieval — being asked to reconstruct material from memory — is among the most effective, and produces stronger durability at a fraction of the time cost. Re-reading feels like a chore *because it is passive*, and it is passive because a book cannot ask questions.

Unhooked can. The book's active ingredient is a state, and states are regenerated by re-derivation, not re-consumption. **This is the one thing Unhooked can structurally do that Easyway cannot, and it is currently unbuilt.** Drift Protection is the feature that exploits it.

---

## 2. Goals

| # | Goal | How we know it worked |
|---|------|----------------------|
| G1 | Eliminate the low-salience "why not" relapse in the day 10–90 window | Self-reported relapse rate in days 10–30 falls below the day 0–9 rate |
| G2 | Regenerate the Carr affective payload without re-consumption of static material and without habituation | ≥40% completion rate on drift-window sessions, sustained through week 4 (no decay curve) |
| G3 | Install a stake that survives the removal of desire | ≥60% of users can articulate a concrete cost of relapse at day 30 unprompted |

## 3. Non-Goals

| Non-goal | Why out of scope |
|----------|------------------|
| Craving management | Solved by the core program. The drift-window relapse is craving-free by definition; treating it as a craving problem is what causes the miss. |
| Health-fear or scare-based motivation | Directly contraindicated by the methodology — fear creates stress, and stress drives use. See ADR-010. |
| Re-running the 14-day program as maintenance | This is exactly the "re-read the book" chore we are replacing. Re-presentation is the wrong tool. |
| Streak counters, daily-open obligations, gamification | Any mechanic requiring routine voluntary engagement decays on the same curve as belief itself. This system must work with near-zero voluntary engagement. |
| Native push notifications | Requires the native app, already deferred. Email-first for v1. |
| Automatic relapse detection | No reliable signal without self-report or invasive tracking. v1 relies on the user telling us. |

---

## 4. Solution Overview

Four modules, all P0.

| # | Module | Targets | Priority |
|---|--------|---------|----------|
| 1 | The Drift Model | M1 | P0 |
| 2 | Inoculation — Naming the Shrug | M1, M2 | P0 |
| 3 | Reconstruction Sessions | M3 | P0 |
| 4 | The Asymmetry Ledger | M2 | P0 (light) |

**What happens after a relapse is out of scope for this spec** and is specified in `re-entry-spec.md`. The two are coupled at one point: Module 4 arms a fact that the re-entry session is obliged to disarm (Module 4, Hard constraint 2 → Re-entry §4, Beat 6).

---

### Module 1: The Drift Model

Replace the product's implicit assumption — that risk declines monotonically after the quit — with an explicit two-peak curve.

| Window | Days | Risk | Character | Current coverage |
|--------|------|------|-----------|------------------|
| Acute | 0–3 | High | Physical withdrawal, active cravings | Strong |
| Relief | 4–9 | Low | Pride, novelty, "I'm actually doing it" | Adequate |
| **Drift** | **10–30** | **High** | **No cravings, no salience, "why not"** | **None** |
| Ambient | 31–90 | Moderate | Situational and social re-exposure | None |
| Settled | 90+ | Low–moderate | Anniversary and acute-stress spikes | None |

The inversion is the point: **risk rises as symptoms fall.** This must be shown to the user explicitly — as a simple two-peak graph during the ceremony and on the post-ceremony dashboard — because it converts *feeling completely fine* from evidence of safety into a **named, predicted stage of the process**. That reframe is only possible while the user still has enough affect to take it seriously, which is why it belongs in the ceremony rather than in a day-14 email.

**Scheduling.** Drift touches extend **`follow_up_schedule`**, not `check_in_schedule`. The check-in scheduler hard-returns as soon as `ceremony_completed_at` is set (`server/utils/scheduling/check-in-scheduler.ts`), and drift touches are by definition post-ceremony; `follow_up_schedule` is the post-ceremony table and already carries the `magic_link_token` + `response_conversation_id` pattern ADR-013 needs. Note the collision to resolve: that table is already seeded at ceremony completion with `day_14` and `day_30` milestones, both of which sit **inside** the drift window and would otherwise double-send against touches at days 13/16/20/24/30. Cadence during days 10–30 is **every 2–3 days, never daily** — daily contact produces exactly the habituation and tuning-out this feature exists to prevent. Vary time of day. Never send the same format twice consecutively.

**Personalization (P1).** Capture prior relapse timing at intake. A user who has previously relapsed around day 18 gets weighted coverage on days 14–20. v1 ships the static curve and captures `prior_relapse_days` for later use.

**Contextual multipliers (P2).** Alcohol, travel, social exposure to users, acute stress. Captured at intake as `high_risk_contexts` and used only to personalize copy in v1.

---

### Module 2: Inoculation — Naming the Shrug

The single highest-leverage element in this spec, and the cheapest to build.

**Mechanism.** Pre-expose the user to a weakened form of the argument they will face, together with its refutation, *before* they encounter it in the wild. The "why not" thought is frictionless precisely because it arrives unlabeled — it does not announce itself as an attack, so no defense fires. Naming it in advance installs the tripwire **in the user's head**, not in the app. That matters because the app will not be open at the decision moment.

The system does not need to win an argument in that moment. The argument is already won. It needs only **recognition** — converting an automatic decision into a deliberate one.

**Delivered in three places:**

**2.1 — The Forecast (new ceremony beat, immediately before the final recording).**

*Implementation note:* the insertion point is between `buildPart5B(...)` and `PART_6_FINAL_RECORDING` in `server/utils/prompts/ceremony-prompt.ts`, and the personalization this beat needs is already plumbed — Part 5 already reads `context.momentsByType.rationalizations[0].transcript`.

The AI predicts the shrug in specific, personal terms, drawing on the user's own captured `rationalization` moments:

> "One more thing before you go.
>
> In a couple of weeks this will be uneventful. No cravings, nothing to notice. That's not a warning — that's what it looks like when it's worked.
>
> And somewhere in there a thought will turn up that isn't a craving at all. It'll feel like a shrug. Something like *why not*. It won't feel like anything, which is exactly what makes it work.
>
> I'm telling you now so that when it shows up, you know what you're looking at. There's nothing to do about it. You just notice it arrived."

**Copy constraint.** No combat framing anywhere in this beat or its variants — *fight, resist, defend, stay strong, watch out, slip up.* Combat vocabulary implies exertion, exertion is Illusion 3, and this is the one piece of copy whose entire job is to convey that nothing is required. See 6.5.

**2.2 — The user records their own rebuttal.**

A second capture at the ceremony, distinct from the existing final recording:

> "Say something to yourself three weeks from now. You're feeling completely fine. Nothing hurts. And you think *why not.* What do you want to say to that guy?"

Stored as `moment_type = 'shrug_rebuttal'`. This is the primary artifact played back during the drift window — the user's own voice, own words, recorded at peak conviction, aimed at a specific future moment. **This depends on D2**: audio moment capture does not exist yet, and `ceremony_artifacts.artifact_type` is constrained to three values, so a second ceremony recording needs either that capture path or a new artifact type. Until D2 ships, the rebuttal is transcript-only and loses most of its force. It is a precommitment device in affective form, and it is not subject to the credibility discount the user applies to the app.

**2.3 — Drift-window callbacks.**

Touches during days 10–30 reference the forecast directly: *"Remember I told you this would happen. Has it yet?"*

This converts a prediction into a **credibility event**. When the shrug arrives and matches the description the user was given, the system's authority increases at the exact moment it needs to be highest. Nothing else in the product can buy that.

---

### Module 3: Reconstruction Sessions

2–4 minute voice sessions, push-delivered during the drift window. Not content delivery — **retrieval**.

The AI asks the user to reconstruct one piece of the framework in their own words, from memory. It does not state the truth first.

Examples:
- "Quick one. Guy at work tells you he smokes because it relaxes him. What do you say?"
- "You told me three weeks ago: *[user's captured insight]*. Say it again — but say it to someone who's never heard it."
- "What actually happens in the first ten seconds after someone takes a hit? Walk me through it."
- "If nicotine really did relieve stress, what would be true that isn't?"

**Design rules.** These are the substance of the module, not polish:

| # | Rule | Rationale |
|---|------|-----------|
| R1 | **Never assert first.** Ask, let the user produce, then confirm or refine. | Retrieval beats presentation for durability. Asserting first converts the session back into re-reading. |
| R2 | **Never repeat an angle.** Track `angles_used` per user; each session enters through a new door — teaching a third party, a counterfactual, a memory, an argument to defeat, a physical-sensation question, a prediction. | Novelty is the anti-habituation mechanism. This is a hard requirement. The moment sessions feel same-y, they get skipped, and skipping is the failure mode. |
| R3 | **End in gain, never vigilance.** Every session closes on the freedom side. | The affective target is the *absence* of fear. A session that ends on threat produces stress, and stress drives use. Closing beat should feel like relief or amusement. |
| R4 | **Under four minutes.** | If it feels like homework it will be skipped. |
| R5 | **Assume no memory of the app.** Every push is self-contained; no "as we discussed in session 9." | By day 20 the user has not thought about the app in a week. |

**Content sourcing.** The user's own captured moments (primary), the Five Illusions doctrine (secondary), never verbatim Carr text.

**New LLM task: `reconstruction.generate`** (default: gemini-pro). Registered in the `LLMTask` union in `server/utils/llm/task-types.ts`; note the `llm.` prefix used by the registry table in `core-program-spec.md` is not the code's convention, and the code wins.

```typescript
// Input
{
  userStory: UserStory
  capturedMoments: CapturedMoment[]   // weighted toward insight + identity_statement
  anglesUsed: string[]                 // angle keys already spent on this user
  daysSinceQuit: number     // from ceremony_completed_at, or the latest re_entry_sessions.session_completed_at
  driftWindow: 'acute' | 'relief' | 'drift' | 'ambient' | 'settled'
  priorSessionSummary: string | null
}

// Output
{
  angleKey: string          // must not appear in anglesUsed
  targetIllusion: string    // illusion_key
  openingQuestion: string   // the ask — never an assertion
  followUpMax: 2            // hard cap; this is not a core session
  closingGainBeat: string   // freedom-framed close, per R3
  estimatedSeconds: number
}
```

---

### Module 4: The Asymmetry Ledger

Answers "why not" with a **stake**, not an argument.

Once desire is gone, the only decision-relevant fact remaining is the **cost of re-entry** — and that cost is something the user has personally lived through, repeatedly. It is stronger evidence than anything the framework can assert, because it is theirs.

**Content is entirely the user's own,** captured at two points:

- **Intake:** *"Tell me about the last time you quit and went back. Not the relapse itself — after. What were the next few weeks like?"* → `moment_type = 'relapse_cost_account'`. **Blocked on D3:** intake is a structured form with no conversation, and `captured_moments` rows require a `conversation_id` and a `session_type` from a four-value constraint. Either add a free-text field to `user_intake` and treat it as the source, or move this capture into the first core session, where a conversation exists. This needs deciding before Phase 1.
- **Ceremony:** *"What do you have now that you didn't have a month ago?"* → `moment_type = 'freedom_gain'`

**Rendered as a two-sided card** in drift-window touches and on the post-ceremony dashboard:

```
┌──────────────────────────────┬──────────────────────────────┐
│  IF YOU DON'T                │  IF YOU DO                   │
│                              │                              │
│  Nothing happens.            │  Sixty seconds of mild        │
│  You stay out.               │  curiosity, satisfied.        │
│                              │                              │
│  [freedom_gain, their words] │  Then, in your words:         │
│                              │  "[relapse_cost_account]"     │
└──────────────────────────────┴──────────────────────────────┘
```

The asymmetry is the entire mechanism. The Five Illusions already established that the upside is trivial; the ledger supplies the downside the framework deliberately stripped out.

**Hard constraint 1 — register.** The ledger is delivered as **foreknowledge, not warning.** Fear requires uncertainty; certainty is calm. The user is not being cautioned about a risk, they are being handed the result of an experiment they have already run. Flat, unhurried, faintly bored. No urgency, no alarm, no exclamation, no stakes-raising. The instant the copy acquires drama it becomes fear, and fear produces the stress state that nicotine falsely promises to relieve — the deterrent would then manufacture its own trigger. See ADR-010.

**Hard constraint 2 — scope of the claim.** `relapse_cost_account` is an account of what re-entry cost **under the old method** — re-reading a book, restarting on willpower, with no captured material and no support. It must never be written or rendered as a prediction of what re-entry will cost *now.* Violating this hands a relapsed user a self-fulfilling prophecy at the exact moment they need the opposite, and the re-entry session exists partly to retire the prediction (`re-entry-spec.md` §4, Beat 6). This tension between the two specs is real and is managed by scoping, not by softening.

**Empty-state.** Users with no prior quit attempt have no `relapse_cost_account`. For them, render the freedom side only, and populate the cost side after any future relapse. Do not substitute generic content.

---

## 5. User Journeys and Stories

### 5.1 User Journeys

The core program epic maps the arc from intake to ceremony. These journeys pick up where that one ends. Ceremony day is Day 0 throughout.

---

#### Journey A: The Protected Drift (primary path)

The path this feature exists to produce. A user who never experiences the drift window as dangerous, because it was named before it arrived.

**Stage 1 — Ceremony, the Forecast (Day 0)**

*Mindset:* Elated, certain, expansive. Believes the hard part is behind them — and is correct about withdrawal, wrong about risk.

*System:* Delivers the two-peak curve visually, then the forecast in the AI's voice, personalized with the user's own captured rationalization. Predicts the shrug in specific terms and explicitly disclaims alarm: *"That's not a warning. That's the point. It worked."*

*Exit state:* Holds a concrete expectation of a future event, framed as a normal stage rather than a threat.

*Failure risk:* Delivered too early in the ceremony, it deflates the celebration arc. Must sit after the illusions recap and before the final recording — momentum high, close not yet made.

**Stage 2 — Ceremony, the Rebuttal (Day 0)**

*Mindset:* Peak conviction. This is the highest-affect moment the user will have all year.

*System:* Asks for a recording addressed to a specific future self: *"Three weeks from now. Nothing hurts. And you think why not. What do you want to say to that guy?"*

*Exit state:* `shrug_rebuttal` captured. The user has, without framing it this way, written the message that will interrupt their own relapse.

*Failure risk:* A generic pep-talk recording. The prompt must force specificity — addressed to a named moment, not to "future me."

**Stage 3 — Relief window (Days 1–9)**

*Mindset:* Proud, novel, occasionally smug. Notices being free.

*System:* Day 3 and Day 7 follow-ups, unchanged. No drift content. Deliberately quiet. *(These are currently dashboard-surfaced only — see D1.)*

*Failure risk:* Front-loading drift material here wastes it — the user isn't in the state yet, and the material habituates before it's needed.

**Stage 4 — Drift entry (Day 10–13)**

*Mindset:* Has stopped noticing. Nicotine is no longer a topic. Would describe themselves as "past it."

*System:* First drift touch. A reconstruction session — a question, not a reminder. Under four minutes. Closes on gain.

*Exit state:* Belief re-derived rather than re-read. Amplitude restored without the user perceiving effort.

*Success signal:* Completion. *Failure risk:* Reads as a nag from an app they've mentally closed out. R5 (self-contained) is what prevents this.

**Stage 5 — The forecast callback (Day 16–20)**

*Mindset:* Fine. Genuinely fine.

*System:* *"Remember I told you a thought would show up that felt like a shrug. Has it yet?"*

*Exit state:* Either **not yet** — inoculation reinforced, the prediction still pending and credible — or **yes** — and the user has just labeled the event, out loud, retroactively. Both outcomes are wins; the second is the more valuable one and should be instrumented.

**Stage 6 — Ledger and close (Day 24–30)**

*Mindset:* Settled. Identity shifting from *quit* to *doesn't use.*

*System:* Asymmetry card, then the Day 30 milestone. Explicit naming of what happened: *"You went through the window where most people go back, and you probably didn't notice it."*

*Exit state:* Drift cadence ends. Ambient coverage (Days 31–90) begins at a much lower frequency.

---

#### Journey B: The Shrug Arrives (critical moment)

The event the entire spec is built around. Elapsed time from first thought to decision, unprotected, is under sixty seconds. This journey is the *only* one where the app is not present, and it must succeed anyway.

| Beat | Without Drift Protection | With Drift Protection |
|------|--------------------------|-----------------------|
| Trigger — someone offers, or a pouch is in a drawer, or nothing at all | Thought arrives unlabeled | Thought arrives unlabeled |
| +2 seconds | *"Why not."* Feels like a shrug. No conflict registers. | *"Why not."* Feels like a shrug — **and the phrasing is familiar.** It was described in advance, in these words. |
| +5 seconds | Nothing to argue with. The Carr frame is symmetric and doesn't engage. | Recognition, not resistance: *this is the thing.* The decision becomes visible as a decision. |
| +20 seconds | Acts. No sense of having chosen. | Asymmetry surfaces from memory, unprompted: sixty seconds of curiosity against the re-entry weeks they can describe from experience. |
| +60 seconds | Used. Relapse not yet recognized as one. | Declines, and the decline is unremarkable. No willpower expended. |
| Next day | Repeats. Now a user again. | May not remember it happened. |

**Design consequence:** nothing in this journey depends on the app being open, a notification arriving, or the user feeling at risk. The only asset in play is the label, and it was installed on Day 0. **This is why Module 2 is the load-bearing module and why Phase 0 tests it alone.**

**Instrumentation:** the Day 30 touch asks directly whether the moment came and whether it was recognized. That self-report is the only visibility we get into this journey.

---

#### Journey C: The Disengaged User

The realistic majority path. Drift touches arrive and go unopened.

**Stage 1 (Days 10–20):** Emails land. Two are ignored. One is opened and not acted on. The user is not avoiding the app — they are not thinking about it at all, which is the correct behavior for someone who is free and the exact behavior that removes our reach.

**Stage 2 — the asymmetry that saves this path:** Subject lines and preview text carry the payload. A user who reads *"the thought that doesn't feel like a craving"* in a preview pane and archives it has still been inoculated. **Drift touches must be written so that the first fifteen words do the work,** with the session as the upgrade rather than the requirement.

*Requirement implication:* subject and preview copy are P0 deliverables, not marketing polish, and belong in the 6.5 copy review.

**Stage 3:** The shrug arrives (Journey B) with partial protection — label present, ledger and reconstruction absent. Outcome uncertain. This is the path where the feature is most likely to fail, and the honest expectation is that it fails some of the time.

**What we do not do:** escalate frequency, add urgency, or introduce guilt copy for non-openers. All three convert a non-engaged user into an unsubscribed one, and unsubscription is permanent where inattention is not.

---

#### Journey D: Relapse and Re-entry

Moved to `re-entry-spec.md` §5. Summarised here because it constrains this spec: the highest-cost stage is the **silent gap** between the slip and the return, during which the user is invisible to us and is running daily willpower attempts against an intact belief. Two requirements follow for drift touches — every touch must be replyable, and at least one touch per window must be disclosure-safe (see ADR-013 in the re-entry spec).

---

#### Journey E: First-Time Quitter (empty ledger)

*Divergence:* No `relapse_cost_account`. Nothing to draw the asymmetry from.

*Intake:* The prompt is asked and produces nothing. Recorded as empty rather than retried.

*Ceremony:* Forecast and rebuttal run unchanged — neither depends on relapse history.

*Drift window:* Ledger card renders **freedom side only.** No generic warning, no borrowed statistics, no other users' accounts. An unsupported claim about a cost they haven't paid is worse than silence, and would read as exactly the scare copy ADR-010 forbids.

*Consequence:* This user runs on M1 and M3 coverage with M2 unaddressed, and is structurally more exposed. Accepted for v1. If drift-window relapse concentrates in this cohort, M2 needs a non-experiential substitute — and that is a genuinely open design problem, not a copy problem.

---

### 5.2 User Stories

**Post-ceremony user, drift window**
- As someone three weeks free, I want to be told in advance what the relapse thought will feel like, so that I recognize it as an event instead of acting on it as a mood.
- As someone who feels completely fine, I want the system to reach me without my having to decide I'm at risk, because by definition I won't think I am.
- As someone who finds re-reading the material a chore, I want to be *asked* rather than *told*, so that maintaining the belief takes two minutes and feels like a conversation instead of homework.
- As someone with no cravings left, I want a concrete reason not to, because "it does nothing for me" cuts both ways.

**Relapsed user**
- As someone who slipped, I want to get back without redoing the program, so that the size of the task doesn't keep me stuck in daily failed attempts.
- As someone who slipped, I want the system to treat my relapse as data rather than as failure, so that shame doesn't become its own barrier.

**Edge cases**
- As a first-time quitter with no relapse history, I want the ledger to work from what I do have, rather than showing me a generic warning.
- As someone who ignores several drift touches, I want the next one to be self-contained, so that re-engaging doesn't require catching up.

---

## 6. Requirements

### P0 — Must have

**6.1 Drift schedule**
- [ ] `drift_touch` type added to `follow_up_schedule` (not `check_in_schedule` — see Module 1)
- [ ] A post-ceremony email sender exists and is wired into `/api/cron/check-ins` (D1)
- [ ] Static curve implemented; touches scheduled from `ceremony_completed_at` at days 10, 13, 16, 20, 24, 30
- [ ] Existing `day_14` and `day_30` milestones reconciled with drift touches — no double-send inside the window
- [ ] Cadence never exceeds one touch per 2 days
- [ ] Format alternates; same format never sent consecutively

*Given a user completed the ceremony on day 0, when day 10 arrives, then a drift touch is delivered by email and surfaced on the dashboard.*

**6.2 Ceremony forecast + rebuttal capture**
- [ ] New ceremony beat delivers the forecast, personalized with ≥1 of the user's own `rationalization` moments
- [ ] Rebuttal prompt captures `shrug_rebuttal` (audio where available, transcript always)
- [ ] Unlimited re-record, matching existing final-recording behavior
- [ ] Ceremony still completes cleanly if the user declines to record

**6.3 Reconstruction sessions**
- [ ] `reconstruction.generate` implemented and wired into the model router
- [ ] Minimum 8 distinct angle keys defined at launch
- [ ] Angle never repeats for a given user until all are exhausted
- [ ] Session hard-caps at 2 follow-ups and closes on a gain beat
- [ ] Voice-first with text fallback, matching core sessions

*Given a user has completed reconstruction sessions using angles A, B and C, when a new session generates, then its `angleKey` is not A, B or C.*

**6.4 Asymmetry ledger**
- [ ] `relapse_cost_account` captured — surface decided per D3
- [ ] Ceremony captures `freedom_gain`
- [ ] Two-sided card renders on dashboard and in ≥2 drift touches
- [ ] Empty-state renders freedom side only — no generic substitute

**6.5 Copy safety review**
- [ ] Every drift-window string reviewed against ADR-010 — foreknowledge register, never warning; scoped to the old method, never predictive of the present; never health fear; never shame
- [ ] **Combat-metaphor scrub.** No user-facing string uses *fight, resist, defend, battle, stay strong, willpower, slip up, temptation.* Combat vocabulary implies exertion, and exertion is Illusion 3. Internal spec and code naming is exempt.
- [ ] No urgency devices in drift copy — no exclamation marks, countdowns, alarm language, or stakes-raising

**6.6 Disclosure channel** *(required by ADR-013, specified in the re-entry spec)*
- [ ] Every drift touch is replyable — a broadcast the user cannot answer closes the only relapse-disclosure channel
- [ ] At least one touch per window is disclosure-safe: phrased so that *"actually, I went back"* is as easy to answer as *"all good."* This conflicts with the epic's celebratory milestone tone and takes precedence for the designated touch.

### P1 — Should have
- Drift curve personalized by `prior_relapse_days`
- Two-peak risk graph rendered in the ceremony
- Shrug-recognition self-report ("did it show up yet?") as an instrumented question

### P2 — Future considerations
- Contextual risk multipliers driving dynamic scheduling
- Native push notifications for drift touches
- Reconstruction angle effectiveness scoring (which angles precede sustained abstinence)
- Extension of drift protection past day 90 (anniversary, life-stress triggers)

---

## 7. Data Model Changes

```sql
-- 1. New moment types
ALTER TABLE public.captured_moments
DROP CONSTRAINT captured_moments_moment_type_check;

ALTER TABLE public.captured_moments
ADD CONSTRAINT captured_moments_moment_type_check
CHECK (moment_type IN (
  'origin_story',
  'rationalization',
  'insight',
  'emotional_breakthrough',
  'real_world_observation',
  'identity_statement',
  'commitment',
  'fear_resistance',
  'shrug_rebuttal',        -- NEW: user's own answer to "why not", captured at ceremony
  'relapse_cost_account',  -- NEW: user's account of what re-entry cost them
  'freedom_gain'           -- NEW: what they have now that they didn't
));

-- 2. Drift profile.
--    No quit_date and no program_state: ceremony_completed_at is already the
--    quit date and never resets, and re-entry is a value of the existing
--    program_status. See re-entry-spec.md §7 for the full rationale.
ALTER TABLE public.user_progress
ADD COLUMN drift_profile JSONB DEFAULT '{}'::jsonb;
-- drift_profile: { prior_relapse_days: int[], high_risk_contexts: string[] }

-- 3. Drift touch scheduling — on follow_up_schedule, the post-ceremony table.
--    check_in_schedule is not usable here: its scheduler returns early once
--    ceremony_completed_at is set.
ALTER TABLE public.follow_up_schedule
DROP CONSTRAINT follow_up_schedule_milestone_type_check;

ALTER TABLE public.follow_up_schedule
ADD CONSTRAINT follow_up_schedule_milestone_type_check
CHECK (milestone_type IN (
  'day_3', 'day_7', 'day_14', 'day_30', 'day_90', 'day_180', 'day_365',
  'drift_touch'
));

ALTER TABLE public.follow_up_schedule
ADD COLUMN drift_window TEXT
  CHECK (drift_window IN ('acute', 'relief', 'drift', 'ambient', 'settled')),
ADD COLUMN touch_format TEXT
  CHECK (touch_format IN ('reconstruction', 'ledger', 'rebuttal_playback', 'forecast_callback'));

-- 4. Reconstruction session tracking (angle novelty enforcement)
CREATE TABLE public.reconstruction_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  angle_key TEXT NOT NULL,
  target_illusion_key TEXT REFERENCES public.illusions(illusion_key),
  days_since_quit INTEGER NOT NULL,   -- from ceremony_completed_at
  delivered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER
);

CREATE INDEX idx_reconstruction_user_angle
  ON public.reconstruction_sessions(user_id, angle_key);
CREATE INDEX idx_reconstruction_user_delivered
  ON public.reconstruction_sessions(user_id, delivered_at DESC);

ALTER TABLE public.reconstruction_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own reconstruction sessions"
  ON public.reconstruction_sessions FOR SELECT
  USING (auth.uid() = user_id);
```

Also extend `session_type` on `conversations` and `captured_moments` to include `'reconstruction'` and `'re_entry'`. Four places each time: the `CHECK` constraint on both tables, the `SessionType` union in `server/utils/llm/task-types.ts`, and regenerated `types/database.types.ts`.

---

## 8. Success Metrics

### Leading indicators (days to weeks)

| Metric | Success | Stretch | Method |
|--------|---------|---------|--------|
| Drift touch open rate | 50% | 70% | Resend webhook events — **requires D4**, no webhook endpoint exists today |
| Reconstruction completion rate | 40% | 60% | `reconstruction_sessions.completed_at` |
| Completion rate decay week 2 → week 4 | <10pp drop | Flat | Same, bucketed by week |
| Shrug rebuttal capture rate at ceremony | 70% | 85% | `captured_moments` where type = `shrug_rebuttal` |

**Reconstruction completion holding flat across weeks is the key habituation test.** A decaying curve means R2 (angle novelty) is failing and the sessions have become the same chore as re-reading.

### Lagging indicators (weeks to months)

| Metric | Success | Method |
|--------|---------|--------|
| Self-reported relapse rate, days 10–30 | Below the day 0–9 rate | Day 30 and day 90 check-in self-report |
| **Shrug recognition rate** | 60% report recognizing the moment when it came | Direct question in day 30 touch |
| Day 90 abstinence | Baseline for future iterations | Day 90 self-report |

**Shrug recognition rate is the single best diagnostic** of whether inoculation is working, because it isolates the mechanism from confounds. A user can recognize the moment and still relapse; a user who does not recognize it tells us the forecast failed to land.

---

## 9. Open Questions

| # | Question | Owner | Blocking? |
|---|----------|-------|-----------|
| Q1 | Does naming the shrug risk *priming* it? Inoculation research says no, and the thought occurs anyway — but this deserves explicit monitoring in beta. | Product | No — monitor |
| Q2 | What is the frequency ceiling before drift touches themselves habituate? Every 2–3 days is a guess. | Product / data | No |
| Q3 | Does the ledger's loss framing reintroduce the stress→use loop for anxiety-prone users, even framed as freedom-protection? | Product | No — flag in beta feedback |
| Q4 | *Resolved.* Whether to build an explicit "I slipped" control — answered No by ADR-013 in `re-entry-spec.md`. Retained here so the numbering does not read as a gap. | — | Resolved |
| Q5 | Email-only is a real constraint: drift touches land in an inbox the user may not check for days. Is that fatal to the timing precision this feature needs? | Engineering | No — but revisit if open rates undershoot |
| Q6 | How many angle keys are actually needed before repetition becomes noticeable? 8 is a guess. | Product | No |
| Q7 | Should users still in the core program (pre-ceremony) who have already quit get drift protection early? Note this is harder than it looks now that drift touches live on `follow_up_schedule`, which is seeded at ceremony completion. | Product | No |
| Q8 | Does the ledger survive its own register constraint in practice? A flat, unalarmed delivery may read as *insufficiently important* rather than *certain.* The line between calm authority and indifference is thin and only testable in copy. | Product / design | No — test in Phase 0 |

---

## 10. Phasing

**Phase 0 — Minimum testable version.**
Ceremony forecast + `shrug_rebuttal` capture + three scheduled emails at days 12, 18 and 25 containing the rebuttal playback and the ledger card. No new LLM task, no new tables beyond the moment types — but it does need **D1, a post-ceremony email sender**, which does not exist and is the bulk of the work. The earlier "1–2 days" estimate assumed a working push channel. This tests the core hypothesis — *that naming the shrug in advance is what prevents it* — before building anything.

Ship this first. If the forecast alone changes the outcome, the rest is optimization. If it doesn't, Modules 3–5 need rethinking rather than building.

**Phase 1 — Full MVP.** Modules 1–4 as specified. Drift schedule, reconstruction sessions with 8 angles, full ledger, copy safety review.

**Phase 2 — Personalization.** Drift curve weighted by `prior_relapse_days`, re-armed from the latest `re_entry_sessions.session_completed_at` where one exists. Re-entry ships on its own track — see `re-entry-spec.md` §10.

**Phase 3 — Adaptive.** Contextual risk multipliers, angle effectiveness scoring, native push.

---

## Appendix A: Proposed Decision Records

To be moved into `docs/decisions/architecture-decisions.md` on acceptance.

### ADR-010: Use loss-of-freedom framing despite the methodology's anti-fear stance

**Date:** 2026-09-07
**Status:** Proposed
**Decision Maker(s):** Kevin

**Context:** The Allen Carr methodology holds that negative motivation backfires — fear creates stress, and stress is the state nicotine falsely promises to relieve. Fear is therefore not merely ineffective; it is the trap's own fuel, both for staying in and for going back. This applies to Carr's own maintenance line, *"there's no such thing as just one,"* which draws its force from fear of the trap and is thus self-undermining. The Asymmetry Ledger introduces a deliberate negative consequence and appears to inherit the same defect.

**Decision:** Include the ledger, but govern it by **register rather than content**: the stake is delivered as **foreknowledge, never as warning**. Scope it strictly to the user's own lived experience of re-entry under the old method, never to a substance's harms and never as a prediction about their present situation.

**Rationale:** Fear requires uncertainty. Being afraid of an outcome means not knowing whether it is coming; knowing exactly what happens is a categorically different state, and a calm one. "I know precisely what this does" carries no arousal.

This reframes the moment itself. The "why not" thought is not a temptation to be cautioned about — it is an **experiment being proposed**, and the correct answer to a proposed experiment is a spoiler, not a warning. *You've run this one. You know the result.* Flat, unhurried, faintly bored. Delivered that way it produces certainty, not dread, and certainty generates no stress to relieve.

The ledger is also the only deterrent that survives the removal of desire: once "nicotine does nothing for me" is fully believed, the cost of getting back out is the sole remaining decision-relevant fact. Removing it leaves the symmetry problem (M2) unaddressed.

**Alternatives considered (updated):**

| Alternative | Why rejected |
|-------------|--------------|
| Carr's "no such thing as just one," used verbatim | Runs on fear of the trap, which is the trap's fuel. Also relies on fear surviving three weeks of freedom, which is exactly what does not happen. |
| No stake at all — rely purely on the Five Illusions | This is the current state and it is what fails. A symmetric argument cannot answer an asymmetric question. |
| Health-based consequences | Contraindicated by the methodology and the market research; creates the stress loop directly. |
| Financial cost framing | Weak. Not experienced as a stake in the shrug moment; reads as generic tracker filler. |
| Social/relational stakes | Introduces shame, which drives concealment and makes re-entry harder. |

**Consequences:** All drift-window copy requires explicit review against register and scope (requirement 6.5). Beta feedback must be monitored for users reporting the ledger as anxiety-producing rather than clarifying (Q3).

---

### ADR-011: Retrieval over re-presentation for belief maintenance

**Date:** 2026-09-07
**Status:** Proposed
**Decision Maker(s):** Kevin

**Context:** The obvious design for post-ceremony maintenance is to re-present the Five Illusions material periodically — a digest, a refresher session, a summary email. This is the digital equivalent of re-reading the book.

**Decision:** Maintenance sessions ask the user to reconstruct the material from memory. The AI never asserts the reframe before the user has attempted to produce it.

**Rationale:** Re-reading produces weak durability and is subject to habituation; retrieval produces strong durability and, when the entry angle varies, resists habituation. Unhooked already relies on the production effect for its voice-first design, so this is consistent rather than novel. Critically, this is also the capability that differentiates Unhooked from Easyway: a book cannot ask questions, so its only maintenance mode is re-reading, and re-reading is the thing users refuse to do.

**Alternatives considered:**

| Alternative | Why rejected |
|-------------|--------------|
| Periodic content digests | Passive, habituating, and the exact chore users avoid. |
| Re-run selected core sessions | Too long, and framed as regression. |
| Cheat sheet reminders | Already exists and is not being used — it requires the user to open it, which requires felt risk. |

**Consequences:** Requires `reconstruction.generate` and angle tracking. Adds the risk that a user who cannot reconstruct feels exposed — mitigated by R3 (close on gain) and by treating a weak reconstruction as a signal to schedule a follow-up rather than a failure to report.

---

### ADR-012: Push-first; assume zero voluntary engagement

**Date:** 2026-09-07
**Status:** Proposed
**Decision Maker(s):** Kevin

**Context:** The existing post-ceremony surfaces ("I'm struggling", "Boost", cheat sheet) are all pull-based. They require the user to decide they are at risk and open the app.

**Decision:** All drift-window protection is push-delivered and self-contained. No feature in this spec may depend on the user opening the app unprompted.

**Rationale:** The drift-window relapse is defined by the absence of felt risk. A user who felt at risk would already be served by the existing surfaces. Designing anything here as pull-based reproduces the exact gap this spec exists to close.

**Consequences:** Every touch must be comprehensible with no memory of prior sessions (R5). Email deliverability and open rates become load-bearing (Q5). Existing pull surfaces are retained but are not counted as coverage.

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.6 | 2026-09-07 | **Codebase reconciliation pass.** Reviewed every identifier against `main`. Added §0 Dependencies covering four verified gaps: **D1**, `follow_up_schedule` rows are written at ceremony completion but no sender ever processes them, so the post-ceremony push channel does not exist (this is most of Phase 0's real cost, and the "1–2 days" estimate is withdrawn); **D2**, moment audio capture is deferred in code, which weakens the `shrug_rebuttal` playback until it ships; **D3**, intake is a structured form with no conversation, so `relapse_cost_account` has no capture mechanism as specified; **D4**, no Resend webhook exists to source the open-rate metric. **Drift touches moved from `check_in_schedule` to `follow_up_schedule`** — the check-in scheduler returns early once `ceremony_completed_at` is set, and the existing `day_14`/`day_30` milestones fall inside the drift window and must be reconciled. **State model aligned with `re-entry-spec.md` v1.2:** `program_state` and `quit_date` dropped; `ceremony_completed_at` is the quit date and `program_status` carries `re_entry`. Fixed `public.illusions(myth_key)`, which does not exist — the column is `illusion_key`. `llm.reconstruction.generate` renamed `reconstruction.generate` to match code convention. Added the ceremony-prompt insertion point for the Forecast beat and noted that its rationalization personalization is already plumbed. Restored Q4 to the open-questions table marked Resolved, so the numbering no longer reads as a gap. No module design, journey, register constraint or decision content changed. |
| 1.5 | 2026-09-07 | **Documentation conformance pass.** Renamed to `drift-protection-spec.md` per the repo naming convention (no version in filenames — git handles versioning). Status changed from Proposed to Planning. Document Type aligned to "Feature Specification (PRD + Technical Design)". Added Table of Contents. Related Documents re-pointed from the external `unhooked-*` document set to the specs and guides that actually hold that material (`core-program-spec.md`, `check-in-spec.md`, `moment-capture-spec.md`, `ceremony-spec.md`, `reinforcement-sessions-spec.md`, `follow-up-spec.md`, `guides/coaching-framework-guide.md`, `guides/llm-configuration-guide.md`). **ADRs renumbered to resolve a collision with the existing records in `docs/decisions/architecture-decisions.md`, where ADR-001 through ADR-009 are already taken: ADR-002 → ADR-010, ADR-003 → ADR-011, ADR-004 → ADR-012, ADR-005 → ADR-013 (in the re-entry spec).** Renumbering is applied throughout, including earlier changelog rows, so the document is internally consistent. No requirements, modules, journeys, metrics or decision content changed. |
| 1.4 | 2026-09-07 | Extracted Module 5, Journey D, ADR-013 and Appendix B into `re-entry-spec.md`; re-entry is generic to any relapse cause and warrants an independent problem statement. Removed G4. Scope of this spec is now prevention only. Added 6.6 (disclosure channel) to retain the two requirements ADR-013 imposes on drift touches. |
| 1.3 | 2026-09-07 | Expanded Module 5 Beats 4 and 6 with full rationale (the daily attempt-fail loop as Illusion 3 + Illusion 5 reasserting; the ledger-as-prophecy problem). Added the Beat 5 scaffolding ladder, resolving Q9. Added ADR-013 (relapse inferred conversationally, no control), resolving Q4 and adding two requirements: every post-ceremony touch replyable, one disclosure-safe touch per window. Added Appendix B: full example re-entry session dialogue. |
| 1.2 | 2026-09-07 | Rewrote ADR-010 around the fear/foreknowledge distinction, addressing the catch-22 in Carr's "no such thing as just one" (fear is the trap's own fuel). Added register and scope constraints to Module 4. Rewrote the ceremony forecast copy to remove combat framing ("fighting" implied willpower — Illusion 3). Added combat-metaphor scrub and urgency ban to 6.5. Expanded Module 5 from stub to full seven-beat session design with `quit_date` handling note. Added Q8–Q10. |
| 1.1 | 2026-09-07 | Added §5.1 User Journeys (A: Protected Drift, B: The Shrug Arrives, C: Disengaged User, D: Relapse and Re-entry, E: First-Time Quitter). Restructured §5 into 5.1 Journeys / 5.2 Stories. Promoted subject and preview copy to P0 via Journey C. |
| 1.0 | 2026-09-07 | Initial specification created. Defines the drift-window relapse problem (belief decay / "why not" relapse at days 10–30), five solution modules (Drift Model, Inoculation, Reconstruction Sessions, Asymmetry Ledger, Re-entry Fast Path), data model changes, success metrics, phasing, and proposed ADR-010 through ADR-012. |
