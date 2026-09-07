# Unhooked: Re-entry Specification
## Getting back after a relapse

**Version:** 1.2
**Created:** 2026-09-07
**Last Updated:** 2026-09-07
**Status:** Planning
**Document Type:** Feature Specification (PRD + Technical Design)
**Owner:** Kevin
**Related Documents:**
- `drift-protection-spec.md` (Drift Protection — post-ceremony relapse prevention; currently the only specified inbound path to this spec, from which this spec was extracted at drift v1.4)
- `core-program-spec.md` (The Five Illusions — the `willpower` and `identity` illusions, which this spec re-applies; Program Statuses, LLM Tasks Registry, `captured_moments` schema)
- `guides/coaching-framework-guide.md` (Five Illusions doctrine)
- `ceremony-spec.md` (Ceremony artifacts — the raw material for the re-entry session inventory)
- `moment-capture-spec.md` (Moment Capture — `captured_moments`, replayed in Beat 2; **moment audio capture is a hard dependency of this spec, see §0**)
- `reinforcement-sessions-spec.md` (Post-ceremony surfaces the re-entry session sits alongside)
- `guides/llm-configuration-guide.md` (Model router and task registry — where `relapse.detect` is registered)
- Architecture Decision Records: ADR-013 (Conversational Relapse Inference) proposed in Appendix A; ADR-010 through ADR-012 proposed in `drift-protection-spec.md`

---

## Table of Contents

0. [Dependencies](#0-dependencies)
1. [Problem Statement](#1-problem-statement)
2. [Goals](#2-goals)
3. [Non-Goals](#3-non-goals)
4. [The Re-entry Session](#4-the-re-entry-session)
5. [User Journey](#5-user-journey)
6. [Requirements](#6-requirements)
7. [Data Model Changes](#7-data-model-changes)
8. [Success Metrics](#8-success-metrics)
9. [Open Questions](#9-open-questions)
10. [Phasing](#10-phasing)
11. [Appendix A: Proposed Decision Records](#appendix-a-proposed-decision-records)
12. [Appendix B: Example Session](#appendix-b-example-session)
13. [Changelog](#changelog)

---

## 0. Dependencies

Two things this spec assumes exist do not exist yet in the codebase. Both were verified against `main`.

| # | Dependency | Current state | Blocks |
|---|-----------|---------------|--------|
| D1 | **Moment audio capture** | `captured_moments.audio_clip_path` is hardcoded `null` at both write sites (`server/api/chat.post.ts`, `server/api/moments/index.post.ts`, both marked *"Audio capture deferred for MVP"*). The only real user audio in the product is the single ceremony `final_recording` artifact. | Beat 2's *"I have it on tape"*, ladder Rung 4, and the landing-state thesis. **Decision: ship moment audio capture before Phase 2.** Until it ships, Beat 2 runs on verbatim transcripts plus the ceremony final recording, and the copy must not promise a voice. |
| D2 | **Relapse-aware support prompt** | `server/utils/prompts/support-prompt.ts` currently instructs the model that if a user mentions relapse it should *"encourage them to seek professional support"* — the opposite of Beat 1. | Phase 1, which routes relapsed users to the existing generic support conversation. Phase 1 must include a support-prompt change. |

Nothing here blocks Phase 1's state work, which is deliberately independent of both.

---

## 1. Problem Statement

A user who relapses after completing the program does not lose the belief. They lose access to it — and then spend weeks failing to get back, in a cycle far more punishing than the original quit.

The observed pattern: relapse, then a stretch of days or weeks in which the user resolves each morning to stop, uses by mid-afternoon, and finds the next morning's resolve weaker than the last. Reported as *"a constant daily attempt to quit and fail."* The cost is not the relapse itself; it is this stretch, which converts a single event into a full return to daily use.

### 1.1 Scope: this is about the return, not the relapse

**The mechanism of re-entry does not depend on the mechanism of relapse.** Whether the user went back through the drift-window shrug, a crisis, alcohol, social exposure, or a deliberate decision, the post-relapse state is the same: program complete, belief intact, user assuming a rebuild is required, defaulting to willpower because nothing else is available in the moment.

Drift Protection is currently the only relapse cause Unhooked has specified, so it is the only inbound path this spec branches on today. Additional causes attach here as they are specified, and only two beats of the session are cause-aware.

### 1.2 The two engines

Neither is the user.

**Misattribution.** With the state out of reach, the user has no method available in the moment, so they grit it out. That fails — it is the **Willpower** illusion (`willpower`), which they dismantled during the program. But the failure is read as a verdict on **themselves** rather than on the procedure they fell back on, which recruits the **Identity** illusion (`identity`) (*I'm different, I'm the one who can't*). Each failed day adds a data point to the wrong hypothesis: *I've lost it.*

**The size illusion.** The user believes restoration requires the whole thing again — re-read the book, redo fifteen sessions. Large tasks do not get started before breakfast, so the day passes without a real attempt, and that is filed as further evidence of incapacity.

Both engines run on illusions the user has already defeated once. **There is no new content to teach here.** The entire problem is one of access and of accurate attribution.

### 1.3 Why the chore is imagined

In Allen Carr's world, re-reading is the only tool the book offers, so the chore is real. In Unhooked's, nothing was lost and nothing needs redoing: the illusions remain unlocked, the cheat sheet remains populated, and the user's own insights remain on record in their own voice. The user does not know this, and the gap between what they have and what they think they have is where the weeks go.

---

## 2. Goals

| # | Goal | How we know it worked |
|---|------|----------------------|
| G1 | Collapse the gap between relapse and a completed re-entry session | Median under 72 hours |
| G2 | Prevent a single relapse from becoming a return to daily use | Majority of re-entry users stop within 24h of the session, without a staged quit date |
| G3 | Remove the imagined rebuild as a barrier to returning | Users report the return as small rather than daunting when asked at the next touch |
| G4 | Keep re-entry from producing shame that blocks a subsequent return | Second-relapse users return faster than first-relapse users, not slower |

## 3. Non-Goals

| Non-goal | Why out of scope |
|----------|------------------|
| Re-running the program | The belief is intact. Re-teaching it is the imagined chore made real. |
| Re-staging the ceremony | A threshold cannot be crossed twice; re-running it cheapens the original artifact and manufactures a second thing to fail at. |
| Preventing relapse | That is Drift Protection's job. This spec begins after it has happened. |
| Detecting relapse the user does not disclose | No non-invasive signal exists. See ADR-013. |
| Day counters, streaks, "day 1 again" | The streak mechanic's failure mode is precisely this moment. |
| Staged quit dates, tapers, cut-down plans | All three reintroduce the sense of an undertaking, and all three are contraindicated by the methodology. |

---

## 4. The Re-entry Session

~10 minutes, voice-first, built entirely from material the user already produced.

**Governing principles.**

- **Do not restart the program.** `program_status = 're_entry'`. No progress reset, no re-locking of illusions, no new intake. `ceremony_completed_at` is untouched, which is what preserves every post-ceremony capability (see §7).
- **Do not re-stage the ceremony.** A threshold cannot be crossed twice, and re-running it both cheapens the original artifact and manufactures a second thing to fail at. The user did not un-decide; they used. Those are different events.
- **The session's job is access, not instruction.** The belief is intact and out of reach. Nothing needs teaching.
- **No counter, no streak, no "day 1 again."** See §7 on day counts.

**Session structure (~10 minutes, voice-first).**

| # | Beat | ~Time | Purpose |
|---|------|-------|---------|
| 1 | Received | 1 min | Anticlimax by design |
| 2 | The inventory | 2 min | Evidence of possession |
| 3 | What happened, as data | 2 min | Re-label the event; capture the observed drift day |
| 4 | Naming the loop | 1.5 min | Dismantle the imagined chore |
| 5 | One retrieval | 2 min | Demonstrate the belief is present |
| 6 | Retire the prediction | 1 min | Defuse the ledger |
| 7 | Re-forecast and close | 0.5 min | Re-arm drift schedule |

**Beat 1 — Received.** Do not open with *"what happened?"* — that invites confession and lets the user build a narrative of failure while we listen. Open flat and anticlimactic: *"Okay. You're here. That was the hard part, and it's done."* No assessment, no reassurance, no sympathy performance. Sympathy implies something bad enough to warrant it.

**Beat 2 — The inventory.** Before any discussion of the relapse, play their own material back. Their voice, their insights, the cheat sheet still populated, the illusions still unlocked. *(Playback of per-illusion audio requires moment audio capture, which is not yet built — see §0.)* *"This is you, day twelve. You still know all of this — I have it on tape."* This beat **demonstrates** possession rather than asserting it, and it is the specific mechanism that kills the imagined rebuild. It must come before Beat 3, because a user who has just narrated their failure will not believe an inventory that follows it.

**Beat 3 — What happened, as data.** Now ask — but framed as instrument calibration, not confession: *"Which day was it? And when the thought came, what did it feel like?"* Two jobs: capture `prior_relapse_days` for the personalized curve, and **retroactively label the event as the predicted shrug** rather than as a personal failure. If the user recognizes the description from the ceremony forecast, say so plainly. That recognition is the strongest available evidence that the mechanism is a known one and not a defect in them.

#### Beat 4 — Naming the loop

*The loop:* wake, resolve to quit, use by mid-afternoon, and tomorrow's resolve is weaker than today's. It runs for weeks and is the single most demoralising part of the whole cycle — considerably worse than the original quit.

Two things drive it, and neither of them is the user:

1. **Misattribution.** With the state out of reach, the user has no method available in the moment, so they default to gritting it out. That fails — it is the **Willpower** illusion (`willpower`), which they dismantled during the program. But the failure is read as a verdict on **themselves** rather than on the procedure they fell back on. Each day adds a data point to the wrong hypothesis, and the wrong hypothesis is *I've lost it / I can't do this anymore.*
2. **Size illusion.** They believe restoration requires the whole program again. Large tasks do not get started, so the day passes without a real attempt, and that too is filed as failure.

Both are already-defeated illusions reasserting in a new context: **`willpower`** (it takes willpower) supplies the failed method, **`identity`** (I'm different, I'm the one who can't) supplies the misreading. Refer to illusions by key, never by number — `illusion_order` is personalized per user, so ordinal references ("the third one", "week two") are not safe in generated copy. There is no new content to teach here — only two existing illusions to re-apply to a situation the program never named.

*Sequencing:* this beat makes a claim and nothing more. Beat 5 supplies the proof. They are adjacent for that reason and must not be separated or reordered — a claim of this size, left unevidenced, reads as reassurance and will be discounted.

#### Beat 5 — One retrieval

A single reconstruction question, targeting the illusion nearest their relapse context. **The success is the therapeutic payload** — direct evidence, produced in their own voice, that nothing was lost. This is the precise inverse of re-reading, and it is why the session is ten minutes rather than a program.

**The scaffolding ladder (resolves Q9).** If the user cannot reconstruct on the first attempt, do not supply the answer — that is re-presentation and it forfeits the payload. Descend one rung at a time, and stop the moment they produce it:

| Rung | Move |
|------|------|
| 1 | Open question. *"What actually happens in the first ten seconds after someone takes a hit?"* |
| 2 | Narrow it. Ask for one component rather than the whole. *"Just the feeling — what is the feeling that goes away?"* |
| 3 | Cue from their own transcript. *"You used a word for it. Started with a w."* |
| 4 | Play their own recording, then ask them to say it back **in their own words, not repeat it.** *(Requires moment audio; degrades to reading their transcript aloud until §0 ships.)* |

Rung 4 is still production, not reception — the user speaks the final statement in every case. Framing throughout is **out of reach, never gone**, consistent with the session thesis.

*If the full ladder fails,* the belief has genuinely degraded rather than gone quiet. Schedule a short reconstruction sequence — two or three sessions on the weakest illusions only, selected by the last conviction assessment. This is still not the program: it is targeted, it is short, and it is presented as such. Do not let the ladder failure be visible as failure; the transition is *"let's spend a couple of sessions on that one,"* not *"you've lost it."*

#### Beat 6 — Retire the prediction

The Asymmetry Ledger (Drift Protection, Module 4) deliberately armed a fact during the drift window: *going back cost you weeks of daily failed attempts.* As a deterrent that is the entire point. Once the user has actually relapsed, **the same sentence becomes a forecast of their immediate future** — in their own words, delivered by us, at the moment they are most suggestible. We armed it, so we are obliged to disarm it.

The beat scopes the account back to its origin — alone, with a book, on willpower, with no record of anything they had worked out — and states plainly that this is not that. It does not promise ease; it points at a difference in conditions the user can verify, having just verified it in Beat 5.

Without this beat, the Ledger's strength in the drift window becomes its liability here. See Drift Protection §Module 4, Hard constraint 2.

**Beat 7 — Re-forecast and close.** Update `relapse_cost_account` with this instance — each occurrence makes the ledger more evidentially grounded, and this is worth saying aloud as the one real upside. Re-arm the drift schedule against the observed day: *"Last time it was day nineteen. I'll be around from day fourteen."* The re-armed schedule counts from this session's `session_completed_at`, not from the original ceremony (see §7). Close on gain, per Drift Protection R3.

**Stopping.** The session assumes the user stops now, because there was never a decision to remake. No future quit date, no taper, no ritual — all three reintroduce the sense of an undertaking. A compressed final-dose moment is offered **only if the user asks for it**, and is never proposed by the system.

---

## 5. User Journey

### The silent gap and the return

**Stage 1 — The slip (Day ~19).** Used. Immediate reaction is usually not distress; it is *nothing much.* Distress arrives on day two or three, when it becomes a pattern rather than an event.

**Stage 2 — The silent gap (Days 19–26).** The highest-cost stage and currently invisible to us. The user does not return to the app. The barrier is not shame primarily — it is the assumption that returning means **redoing the program.** They imagine fifteen sessions, and the size of the imagined task makes each day's intention collapse before it starts. Meanwhile they resolve to restart daily and fail daily, on willpower, which was never the mechanism.

*This is the stage where "re-reading is a chore" does its damage — except in Unhooked's case the chore is imagined. Nothing was lost and nothing needs redoing. The user does not know that.*

**Stage 3 — Return.** Trigger is either a scheduled touch that lands right, or the user opening the app on their own.

*System:* `program_status = 're_entry'`, not reset. First screen states the thesis before anything else: **you didn't lose it — I have it on tape.** Progress intact, illusions still unlocked, cheat sheet still populated with their own words.

**Stage 4 — Re-entry session (~10 minutes).** Seven beats, specified in full in §4. Order is load-bearing: the inventory of their own material must precede any discussion of the relapse, because a user who has just narrated their failure will not believe an inventory that follows it. The session's payload is a single successful retrieval — direct evidence, in their own voice, that nothing was lost.

**Stage 5 — Re-forecast.** Ledger updated with this instance, which makes it evidentially stronger. Drift schedule re-armed against the *observed* day: *"Last time it was day 19. I'll be around from day 14."* The schedule counts from this session, not from the original ceremony.

*How the user tells us they slipped* is resolved by ADR-013: inferred conversationally, never via a control.

---

## 6. Requirements

### P0 — Must have

**6.1 Re-entry state**
- [ ] `program_status = 're_entry'` set on detected relapse; `ceremony_completed_at` untouched; no progress reset, no illusion re-locking, no new intake
- [ ] `phase` gains a `'re_entry'` value in `/api/user/status`, branched **before** the `completed` check, with a matching dashboard state
- [ ] `POST /api/progress/complete-session` never downgrades `program_status` out of `'re_entry'` — it currently recomputes the value unconditionally and would silently clobber it
- [ ] Re-entry landing state states the thesis before anything else: progress intact, material intact
- [ ] No day counter, streak, or cumulative total surfaced anywhere in re-entry

*Given a user relapses at day 19, when they return to the app, then all five illusions remain unlocked and the cheat sheet renders fully populated.*

**6.2 The session**
- [ ] Seven beats implemented in the specified order; Beat 2 always precedes Beat 3
- [ ] Session built from `captured_moments`; no generic content substituted when material is thin
- [ ] Beat 3 captures the observed relapse day into `drift_profile.prior_relapse_days`
- [ ] Beat 3 captures `days_using_before_return` — the silent-gap metric depends on it and no other beat asks for it (see R5 on whether the ask survives the no-shame constraint)
- [ ] Beat 5 implements the four-rung scaffolding ladder; the user speaks the final statement at every rung
- [ ] Beat 6 fires whenever a `relapse_cost_account` exists
- [ ] Session never proposes a future quit date, taper, or re-ceremony
- [ ] `relapse_number` set to one more than the user's highest existing `re_entry_sessions.relapse_number` — G4's shame check depends on it

**6.3 Relapse detection**
- [ ] `relapse.detect` implemented per ADR-013; high threshold to assert, low threshold to offer
- [ ] No explicit "I slipped" control anywhere in the product
- [ ] All post-ceremony touches replyable (requirement on Drift Protection, tracked there)

**6.4 Copy review**
- [ ] No shame, blame, or disappointment register
- [ ] No combat vocabulary, per Drift Protection 6.5
- [ ] Beat 6 does not promise ease

### P1 — Should have
- Re-arming the drift schedule against the observed day rather than the static curve
- Ladder-failure route: short targeted reconstruction sequence on the weakest illusions by last conviction score

### P2 — Future considerations
- Cause-aware branching for relapse paths other than drift
- Repeat-relapse handling: does the session change on the third or fourth return?
- Partner/accountability disclosure, which is deliberately absent here because it introduces shame

---

## 7. Data Model Changes

**Re-entry is a value of the existing `program_status`, not a new column.** The codebase already carries the two facts a separate `program_state` column would have introduced:

- `user_progress.program_status` — mutable position (`not_started`, `in_progress`, `ceremony_ready`, `completed`, and now `re_entry`)
- `user_progress.ceremony_completed_at` — the immutable threshold event

Every post-ceremony gate already reads the second, not the first: `/api/user/status` tests `program_status === 'completed' || ceremony_completed_at`, and `/api/reinforcement/start` and the check-in scheduler test `ceremony_completed_at` alone. A user sitting in `re_entry` therefore keeps artifacts, cheat sheet, reinforcement and boost **with no changes to those call sites** — which is requirement 6.1 satisfied by existing code rather than by new code.

There is no `CHECK` constraint on `program_status` in the live schema (the baseline declares it as bare `text`), so adding the value costs no data migration. The optional constraint below is the one `core-program-spec.md` already documents but never shipped.

```sql
-- 1. Re-entry as a program_status value.
--    No migration is strictly required; this adds the constraint
--    core-program-spec.md already claims exists.
ALTER TABLE public.user_progress
ADD CONSTRAINT user_progress_program_status_check
CHECK (program_status IN (
  'not_started',
  'in_progress',
  'ceremony_ready',
  'completed',
  're_entry'
));

-- drift_profile is defined in the Drift Protection specification.
-- This spec adds no columns to user_progress.

-- 2. Session tracking
CREATE TABLE public.re_entry_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  detected_at TIMESTAMP WITH TIME ZONE,          -- when relapse was inferred
  session_started_at TIMESTAMP WITH TIME ZONE,
  session_completed_at TIMESTAMP WITH TIME ZONE,
  observed_relapse_day INTEGER,                   -- from Beat 3
  days_using_before_return INTEGER,               -- the silent gap, measured
  retrieval_rung_reached INTEGER,                 -- 1-4; 5 = ladder failed
  relapse_number INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_re_entry_user ON public.re_entry_sessions(user_id, created_at DESC);

ALTER TABLE public.re_entry_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own re-entry sessions"
  ON public.re_entry_sessions FOR SELECT
  USING (auth.uid() = user_id);
```

Extend `session_type` on `conversations` and `captured_moments` to include `'re_entry'`. This is four places, not one: the `CHECK` constraint on each table, the `SessionType` union in `server/utils/llm/task-types.ts`, and regenerated `types/database.types.ts`.

### Day counts, and where the re-armed schedule counts from

Earlier drafts proposed a `quit_date` column that resets on relapse, plus a cumulative `freedom_days_total` to compensate for the reset lying. Both are dropped.

`ceremony_completed_at` is already the quit date, and it never resets — so the "honest count versus demoralizing reset" dilemma does not arise. Nothing is reset, and **no day count is surfaced during re-entry** regardless; day counts are a streak mechanic and streaks are a stated non-goal, whose failure mode is exactly this moment. `freedom_days_total` existed only to paper over the reset, and with no reset it has no job — R6 can reintroduce a cumulative counter later if one is ever wanted.

The one thing that genuinely needs a moving origin is the **re-armed drift schedule**, which must count from the user's return rather than from the original ceremony. That origin is derived, not stored:

```sql
COALESCE(
  (SELECT MAX(session_completed_at) FROM public.re_entry_sessions WHERE user_id = $1),
  (SELECT ceremony_completed_at FROM public.user_progress WHERE user_id = $1)
)
```

This is more honest than mutating a `quit_date`: it keeps the original threshold intact while giving Beat 7's re-forecast a real source.

---

## 8. Success Metrics

### Leading indicators

| Metric | Success | Stretch | Method |
|--------|---------|---------|--------|
| Median relapse → completed session | <72h | <24h | `detected_at` → `session_completed_at` |
| **Silent gap length** | <5 days | <3 days | `days_using_before_return`, self-reported in Beat 3 (requirement 6.2) |
| Session completion rate once started | 80% | 90% | `session_completed_at` |
| Beat 5 success by rung 2 | 70% | 85% | `retrieval_rung_reached` |

**The silent gap is the metric that matters most.** It is the stage where the cost actually accrues, and it is the only one that directly measures whether the imagined rebuild has been dismantled.

### Lagging indicators

| Metric | Success | Method |
|--------|---------|--------|
| Stopped within 24h of session | 60% | Next touch self-report |
| Abstinent at 30 days post-re-entry | Baseline for future iterations | Self-report |
| Second-relapse return speed vs. first | Faster, not slower | `re_entry_sessions.relapse_number` cohort comparison |

The second-relapse comparison is the shame check. If returns get *slower* with each relapse, the session is producing shame despite intent, and Beat 4 is the likely culprit.

---

## 9. Open Questions

| # | Question | Owner | Blocking? |
|---|----------|-------|-----------|
| R1 | Does the session hold up when the user is still actively using during it — mid-session, mid-day, pouch in? The dialogue assumes a reflective user; the real one may be using while talking. | Product | No |
| R2 | How many relapses before the session's framing wears out? *"You still know this"* is powerful once. On the fourth return it risks reading as the system's own denial. | Product | No |
| R3 | What if the user disputes Beat 4 — insists it *was* a real decision and they simply wanted to? Arguing is contraindicated; agreeing forfeits the beat. | Product / design | No |
| R4 | Should re-entry be available before ceremony completion, for users who quit early and went back mid-program? | Product | No |
| R5 | Does `days_using_before_return` self-report survive the no-shame constraint, or does asking for it read as measuring the damage? | Design | No |
| R6 | Should a cumulative freedom counter ever exist, or does any such counter reintroduce the streak dynamic through the back door? `freedom_days_total` was dropped in v1.2; this asks whether it should ever come back. *(Inherited from Drift Protection Q10.)* | Design | No |

---

## 10. Phasing

**Phase 1 — The state, not the session.** `program_status = 're_entry'`, no progress reset, and a landing state that says *you didn't lose it.* No conversational session yet; the existing generic support conversation handles the talking — **which requires the D2 support-prompt change**, since that prompt currently deflects relapse to a professional. This alone may close most of the silent gap, because the barrier is the imagined rebuild rather than the absence of a session.

**Phase 2 — The session.** Seven beats, scaffolding ladder, relapse detection per ADR-013. Depends on D1 (moment audio capture).

**Phase 3 — Adaptive.** Drift re-arming against observed day, ladder-failure reconstruction sequence, repeat-relapse handling.

---

## Appendix A: Proposed Decision Records

To be moved into `docs/decisions/architecture-decisions.md` on acceptance. ADR numbering is global across Unhooked; ADR-001 through ADR-009 are already recorded there, and ADR-010 through ADR-012 are proposed in `drift-protection-spec.md`.

### ADR-013: Relapse is inferred conversationally, never declared via a control

**Date:** 2026-09-07
**Status:** Proposed
**Decision Maker(s):** Kevin

**Context:** This spec requires knowing that a user has relapsed. The obvious affordance is an explicit control — an "I slipped" button on the post-ceremony dashboard. Q4 in Drift Protection asked whether to build one.

**Decision:** No control. Relapse is inferred from conversation via a new `relapse.detect` task running on post-ceremony conversations and drift-touch replies.

**Rationale:** A persistent control invites the user to contemplate the possibility of failure every time they open the app. Confidence in the outcome is part of the mechanism — the program deliberately does not hedge — and a standing failure affordance hedges on the product's behalf. The cost of never presenting the option is that the user is never asked to hold it in mind.

**Consequences:**

- **Every post-ceremony touch must be replyable.** If a drift touch is a broadcast the user cannot answer, the only disclosure channel is closed. This is now a hard requirement on the drift touch format.
- **At least one touch per window must be disclosure-safe.** The epic specifies a celebratory, assume-success tone for milestone check-ins, which makes honest disclosure socially expensive — a user who went back cannot easily answer *"One month free! What's different?"* At least one touch per window must be phrased so that *"actually, I went back"* is as easy to say as *"all good."* Open, unloaded, assuming nothing in either direction.
- **Silence remains undetectable.** A user who relapses and stops opening email is invisible to us. Accepted; there is no non-invasive alternative.
- Requires `relapse.detect` (default: gemini-flash), registered in the `LLMTask` union in `server/utils/llm/task-types.ts` and run on post-ceremony user messages, with a deliberately low threshold for offering re-entry and a high threshold for asserting relapse. Note the task registry in `core-program-spec.md` uses an `llm.` prefix that the code does not; the code convention wins.

**Alternatives considered:**

| Alternative | Why rejected |
|-------------|--------------|
| Explicit "I slipped" control | Standing invitation to contemplate failure; reads as a confession booth; undercuts the no-hedging stance. |
| Direct question in every touch | Same problem distributed across every message, and turns each touch into a check on them rather than an offer to them. |
| Infer from engagement drop-off | Non-engagement is the *normal* state of a successfully free user (Journey C). The signal has no discriminative power. |

---

## Appendix B: Example Session

Illustrative, not final copy. User is 19 days post-ceremony at relapse, eight days back on pouches. Their captured insight from Illusion 1 was *"the thing I'm relieving is the withdrawal."* Beat boundaries marked for reference; the user never sees them.

---

**[Beat 1 — Received]**

**U:** Okay. You're here. That was the hard part, and it's done.

**Mark:** I feel like an idiot.

**U:** You're not going to get that from me. Sit down for ten minutes and let's have a look at where things actually are. Not where you think they are.

---

**[Beat 2 — The inventory]**

**U:** Before you tell me anything — I want you to hear something first.

*[plays user's own recording, `stress_relief` — requires D1; reads the transcript aloud until then]*

> *"...the thing I'm relieving is the withdrawal. It was never stress. I was topping myself up and calling it relief."*

**U:** That's you. Day six. Your words.

Your cheat sheet is still there. All five, still open, with your own lines under each one. Nothing has been reset and nothing has been taken back. You still know all of this — I have it on tape.

**Mark:** It doesn't feel like I know it.

**U:** No. It wouldn't. That's a different problem from not knowing it, and it's a much smaller one. We'll get to that.

---

**[Beat 3 — What happened, as data]**

**U:** Now tell me the mechanics. Which day was it?

**Mark:** Nineteen, I think. Maybe twenty.

**U:** And when the thought came — what did it feel like?

**Mark:** That's the thing. It didn't feel like anything. Someone had a tin out and I just thought, why not. It wasn't even a decision, it was just... yeah, alright.

**U:** Do you remember me describing that?

**Mark:** ...At the end. You said it'd feel like a shrug.

**U:** It felt like a shrug because that's what it is. Not a craving, not weakness, not a lapse in concentration. It's a specific thing that turns up around week three in almost everyone, and it works precisely because it doesn't feel like anything. You didn't miss a warning sign. There wasn't one to miss.

I'm writing down day nineteen. That's useful.

---

**[Beat 4 — Naming the loop]**

**U:** Can I tell you what I think has been happening since?

**Mark:** Sure.

**U:** Every morning you decide today's the day. And by two or three in the afternoon you've had one. And then tomorrow morning it's a bit harder to mean it.

**Mark:** That's exactly it. Eight days of that.

**U:** Right. So here's what I want you to notice about those eight days. You weren't using the thing you learned. You were gritting your teeth. That's willpower — and you and I went through why willpower doesn't work. It was never going to. So when it didn't, that wasn't information about you. It was information about the method you fell back on.

**Mark:** I mean, it felt like information about me.

**U:** It always does. That's the identity one showing up again — the *I'm different, I'm the one who can't* one. You took that apart already. It's just wearing a different coat.

And there's a second thing. Every morning, what did you think getting back would take?

**Mark:** Honestly? Redoing the whole thing. Reading it all again.

**U:** That's why the mornings kept collapsing. Nobody starts a two-week project before breakfast. But you don't have a two-week project. Let me show you.

---

**[Beat 5 — One retrieval]**

**U:** Someone hands you a tin right now and says it takes the edge off. What do you say to them?

**Mark:** That it doesn't. That it's... putting back what it took.

**U:** Keep going. What's the edge, actually?

**Mark:** It's the withdrawal. The edge is the last one wearing off. So it's not taking anything off, it's just — topping you back up to where a normal person already is.

**U:** You just did that from memory, eight days into using, with no prep. Nothing was rebuilt to get there. It was sitting where you left it.

That's what I meant by out of reach rather than gone.

---

**[Beat 6 — Retire the prediction]**

**U:** One more thing, and this matters.

Back at the start you told me what the last relapse cost you — months, you said, and that awful stretch of trying every day.

**Mark:** Yeah.

**U:** I want to be clear about what that was. That was you, on your own, with a book you didn't want to open again. Nothing to reach for and no record of anything you'd figured out. That's not the situation you're in.

I'm not telling you it'll be easy because I'm supposed to. I'm telling you the conditions are different, and you can check that yourself — you just did.

---

**[Beat 7 — Re-forecast and close]**

**U:** So: nothing to restart. You stopped once for reasons you still hold, and you just said them out loud. There's no new decision to make here.

Last time the shrug came at day nineteen. I'll be around from about day fourteen this time, and I'll say so when we get there.

**Mark:** Okay. Yeah.

**U:** One useful thing came out of this, by the way. You now know exactly what that thought feels like from the inside. Most people only get told. You've met it.

---

**Notes on the dialogue**

- Beat 2 precedes Beat 3 deliberately. Reversing them means Mark narrates his failure first, and the inventory then reads as consolation rather than evidence.
- Illusions are named by key or plain name, never by number or by which week they were covered. `illusion_order` is personalized per user, so ordinals are not knowable from a template.
- No combat vocabulary anywhere, per Drift Protection §6.5.
- Beat 6 explicitly declines to promise ease. A promise here would be the fear-management move, and would invite the discount the user applies to reassurance.
- The close reframes the relapse as having produced something — first-hand knowledge of the shrug — without celebrating it or minimising it.

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.2 | 2026-09-07 | **Codebase reconciliation pass.** Reviewed every identifier against `main`. **State model resolved against what is implemented: `program_state` is dropped and `re_entry` becomes a fifth value of the existing `user_progress.program_status`,** with `ceremony_completed_at` carrying the threshold event — the split the code already relies on, and the reason a re-entry user keeps every post-ceremony capability without touching those call sites. `quit_date` and `freedom_days_total` dropped as consequences; the re-armed drift schedule now derives its origin from the latest `re_entry_sessions.session_completed_at`. Added §0 Dependencies recording the two verified gaps: **D1 moment audio capture** (`audio_clip_path` is hardcoded `null` at both write sites, so "I have it on tape" is not currently buildable — decision taken to ship audio capture before Phase 2) and **D2 the support prompt**, which currently deflects relapse to a professional and would break Phase 1. Illusions are now referred to by key (`willpower`, `identity`) rather than by number, since `illusion_order` is personalized per user and ordinal references are unsafe in generated copy; Appendix B's "week two" / "three sessions" lines corrected accordingly. `llm.relapse.detect` renamed `relapse.detect` to match the code's task naming. Added requirements: `phase` gains a `re_entry` branch, `complete-session` must not clobber the state, Beat 3 must capture `days_using_before_return`, and `relapse_number` must be incremented. Fixed cross-spec references that read as local ones (`R3`, `6.5` → Drift Protection), removed the stale Q4 blocking question resolved by ADR-013, corrected day 15 → day 14, and split the run-together Beat 5 heading. |
| 1.1 | 2026-09-07 | **Documentation conformance pass.** Renamed to `re-entry-spec.md` per the repo naming convention (no version in filenames). Status changed from Proposed to Planning. Document Type aligned to "Feature Specification (PRD + Technical Design)". Added Table of Contents. Related Documents re-pointed from the external `unhooked-*` document set to the specs and guides that actually hold that material. **ADR-005 renumbered to ADR-013**, resolving a collision with the existing records in `docs/decisions/architecture-decisions.md` (ADR-001 through ADR-009 are already taken); the companion renumbering in Drift Protection is ADR-002/003/004 → ADR-010/011/012. Fixed a duplicated `###` prefix on the ADR heading. No requirements, session design, metrics or decision content changed. |
| 1.0 | 2026-09-07 | Initial specification, extracted from `drift-protection-spec.md` v1.3 (Module 5, Journey D, ADR-013, Appendix B) and generalized: re-entry is scoped to any relapse cause rather than to the drift-window shrug specifically. Added independent problem statement (misattribution and size illusion as the two engines), goals, non-goals, requirements, `re_entry_sessions` schema, silent-gap metric, and open questions R1–R6. |
