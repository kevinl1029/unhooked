# Final Ceremony Feature - Pre-Audio Version Spec

**Status:** Draft
**Version:** Pre-Audio (v1.0)
**Last Updated:** 2026-01-28
**Author:** Kevin Lee

---

## Overview

The Final Ceremony is the culminating experience of the Unhooked nicotine cessation program. It occurs after users complete all 5 illusion sessions (Phase 4) and serves as a transformative ritual to cement their freedom from nicotine.

The ceremony is designed to replay the user's most powerful moments from their journey—creating an emotionally impactful experience that reinforces their transformation and provides lasting artifacts they can revisit.

### Why "Pre-Audio"?

This spec defines the **pre-audio version** of the Final Ceremony—designed to work effectively without user audio capture during sessions. This is an intentional interim solution that:

- Provides a complete, high-quality ceremony experience today
- Works within current technical constraints (text-only sessions)
- Can be enhanced later when audio capture is implemented

**Future:** When voice input during sessions is implemented, we'll create a "Final Ceremony - Audio Version" that integrates actual user voice recordings into the journey playback.

### Current Implementation State

The ceremony currently has 6 steps:
1. **Intro** - "Already quit?" question to personalize the narrative
2. **Journey Generation** - AI weaves selected moments into a reflective narrative
3. **Journey Playback** - Sequential playback with word-by-word sync (JourneyPlayer)
4. **Final Recording** - User records a message to their future self
5. **Cheat Sheet** - Quick reference toolkit for all 5 illusions
6. **Completion** - Success state + scheduling of follow-up check-ins

---

## Problem Statement

The Final Ceremony was designed with the assumption that users would have **audio recordings** of their key moments captured during sessions. The implementation includes:

- `user_moment` segment types in the journey playlist that reference `audio_clip_path`
- A `voice-clips` storage bucket for captured moment audio
- Audio confidence thresholds (0.85) vs transcript thresholds (0.70) in moment detection
- JourneyPlayer logic to play back user's recorded audio clips

**However, audio capture during sessions was never implemented.** The current session experience is text-based chat only.

### The Result

When the ceremony attempts to play the "reflective journey":

1. **Narration segments** (AI-generated) work correctly—TTS generates audio
2. **User moment segments** have no audio to play—they fall back to text-only display with a calculated reading duration

This creates a **disjointed, anticlimactic experience**:
- Users expect to hear their own words but see only text
- The emotional weight of "hearing yourself" is lost
- The "empty space" between narration segments feels broken
- The contrast between polished AI narration and silent text displays is jarring

### Technical Evidence

From `/server/api/ceremony/journey/[segmentId]/audio.get.ts` (lines 57-87):
```typescript
// For user_moment segments, attempts to get audio_clip_path
if (moment?.audio_clip_path) {
  // Generate signed URL...
}
// No audio for this moment - return text fallback
return {
  audio_unavailable: true,
  text: moment?.transcript || segment.text,
  is_user_moment: true,
}
```

The fallback path is always hit because `audio_clip_path` is never populated.

---

## Goals

1. **Create an emotionally impactful ceremony** that honors the user's journey and reinforces their transformation
2. **Make user moments feel personal and present** even without their recorded audio
3. **Maintain the narrative arc** of the reflective journey (intro → origin → illusions → insights → transformation → commitment)
4. **Provide lasting artifacts** users can revisit when struggling or celebrating
5. **Design for extensibility** so audio capture can be added later without rearchitecting

---

## Non-Goals

1. **Implementing full voice chat** - Audio input during sessions is a separate, larger initiative (deferred)
2. **Real-time transcription** - Not addressing STT infrastructure in this scope
3. **Changing the core session flow** - Sessions remain text-based for now
4. **Multi-language support** - English only for MVP

---

## Current Flow (As Implemented)

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│   Intro     │ ──► │  Generating  │ ──► │ Journey Playback│
│ (quit Q&A)  │     │   Journey    │     │  (JourneyPlayer)│
└─────────────┘     └──────────────┘     └────────┬────────┘
                                                   │
                    ┌──────────────┐     ┌─────────▼────────┐
                    │  Complete    │ ◄── │ Final Recording  │
                    │ (+ follow-ups)│     │ (to future self) │
                    └──────────────┘     └─────────┬────────┘
                           ▲                       │
                           │             ┌─────────▼────────┐
                           └──────────── │   Cheat Sheet    │
                                         │   (toolkit)      │
                                         └──────────────────┘
```

### Journey Segment Types

| Type | Intent | Current State | Problem |
|------|--------|---------------|---------|
| `narration` | AI speaks the narrative | Works - TTS generates audio | None |
| `user_moment` | Play user's captured audio | Falls back to text | No audio exists |

---

## Solution: AI Narration with Integrated Quotes

### Decision

After evaluating multiple approaches, we've decided to **restructure the journey as a continuous AI-narrated experience** that weaves user quotes directly into the narrative. The AI speaks everything—including the user's own words as quoted passages.

### Why This Approach

| Considered | Decision | Rationale |
|------------|----------|-----------|
| Enhanced text presentation | Deferred | Still creates jarring audio→silence→audio transitions |
| Separate `user_moment` segments | Removed | Without audio, these feel like broken playback |
| Prompted audio capture | Future | Requires significant infrastructure + consent framework |
| **Integrated quotes in narration** | **Selected** | Consistent audio experience, maintains personalization |

### How It Works

**Before (Current Implementation):**
```
Segment 1: [AI narration - TTS audio]
Segment 2: [user_moment - SILENT TEXT FALLBACK] ← Problem
Segment 3: [AI narration - TTS audio]
Segment 4: [user_moment - SILENT TEXT FALLBACK] ← Problem
```

**After (New Implementation):**
```
Segment 1: [AI narration with quoted user moment - TTS audio]
Segment 2: [AI narration with quoted user moment - TTS audio]
Segment 3: [AI narration - TTS audio]
```

**Example Narrative Output:**
> "Let's reflect on where this journey began. You shared with me—'I started vaping at 16 because everyone at school was doing it. I thought I could stop whenever I wanted.' That belief, that you were in control, set something in motion that brought you here today..."

The AI acknowledges these are the user's words by framing them as quotes, maintaining the personal connection while delivering a consistent audio experience.

---

## Spotlight Moments

### Definition

**Spotlight moments** are the 3-5 most therapeutically significant quotes selected from the user's captured moments to feature in the ceremony narrative.

### Selection Criteria

Moments should be selected based on:

1. **Emotional significance** - High `emotional_valence` score or breakthrough moments
2. **Narrative arc coverage** - Represent different phases of the journey:
   - Origin story (how they started)
   - Key realization/insight
   - Identity shift statement
   - Commitment to freedom
3. **Quotability** - Clear, concise statements that work well when quoted
4. **Moment type diversity** - Mix of `origin_story`, `insight`, `identity_statement`, `commitment`

### Selection Process

The `ceremony-select.ts` task will be updated to:
1. Score moments against the above criteria
2. Select 3-5 moments that best represent the user's journey arc
3. Return moments with suggested placement in narrative structure

---

## Narrative Structure

The reflective journey should follow this arc:

| Section | Purpose | Spotlight Moment Type |
|---------|---------|----------------------|
| **Opening** | Set reflective tone, acknowledge the journey | — |
| **Origin** | Where it all began | `origin_story` |
| **The Trap** | How the illusions kept them stuck | `rationalization` |
| **Awakening** | Key realizations during sessions | `insight`, `emotional_breakthrough` |
| **Identity** | Who they are becoming | `identity_statement` |
| **Commitment** | Looking forward | `commitment` |
| **Closing** | Affirm their freedom | — |

Total duration target: **3-5 minutes** of narrated audio (shorter than original 5-10 minute target since we're not pausing for separate user audio playback).

---

## Technical Changes Required

### 1. Narrative Generation (`ceremony-narrative.ts`)

**Current behavior:** Generates playlist with `narration` and `user_moment` segment types

**New behavior:**
- Generate `narration` segments only
- Embed quoted user moments directly in narration text
- Include metadata about which moments were quoted (for analytics)

**Output structure change:**
```typescript
// Before
{ type: 'user_moment', moment_id: '...', text: '...' }

// After - no user_moment segments
// Quotes embedded in narration text with markers for display
{
  type: 'narration',
  text: '...You told me, "I started vaping at 16..."...',
  quoted_moment_ids: ['uuid-1', 'uuid-2']  // For tracking
}
```

**Implementation details:**
- Update prompt to instruct AI to weave quotes naturally into continuous narration
- Remove `[MOMENT:id]` marker syntax
- Use quotation marks and attribution phrases like "You told me," "You shared," etc.
- Ensure narrative flows naturally even when reading transcript

### 2. Moment Selection (`ceremony-select.ts`)

**Current behavior:** Selects up to 12 moments for the journey

**New behavior:**
- Select 3-5 "spotlight" moments based on criteria above
- Return with suggested narrative placement hints
- Prioritize quality/impact over quantity

**Implementation details:**
- Add scoring logic for emotional significance
- Ensure diversity of moment types
- Return placement hints: 'origin', 'trap', 'awakening', 'identity', 'commitment'

### 3. JourneyPlayer Component

**Current behavior:** Handles both `narration` and `user_moment` segment types with different playback logic

**New behavior:**
- Simplified to handle `narration` segments only
- Remove `user_moment` fallback logic (lines handling `audio_unavailable`)
- Optional: Visual treatment for quoted text (e.g., highlight when quote is being spoken)

**Implementation details:**
- Remove conditional logic for `segment.type === 'user_moment'`
- Remove text-only fallback duration calculation
- Simplify preload logic (all segments will have TTS audio)

### 4. Segment Audio Endpoint (`journey/[segmentId]/audio.get.ts`)

**Current behavior:** Has branching logic for `user_moment` vs `narration`

**New behavior:**
- Remove `user_moment` handling (lines 57-87)
- All segments are narration → TTS

**Implementation details:**
- Remove logic that checks `segment.type === 'user_moment'`
- Remove lookup to `captured_moments` table
- Simplify to always generate/fetch TTS audio

---

## Visual Treatment for Quotes (Optional Enhancement)

When the AI is speaking a quoted user moment, the UI could:
- Display the quote text in a distinct style (italics, different color, quote marks)
- Show a subtle indicator that "these are your words"
- Potentially show the illusion/session context where this was captured

This is a nice-to-have enhancement, not required for MVP.

**Implementation approach:**
- Add markers in narrative text to identify quote boundaries
- Parse markers in JourneyPlayer to apply styling
- Example: `...You told me, <quote>"I started vaping..."</quote>That belief...`

---

## Database Schema Changes

### No schema changes required

The current schema already supports the new approach:
- `ceremony_artifacts.playlist` is JSONB and flexible
- `ceremony_artifacts.included_moment_ids` can track which moments were quoted
- All segment types can be `narration` without breaking constraints

---

## Implementation Phases

### Phase 1: Core Restructure
- [ ] Update `ceremony-select.ts` to select 3-5 spotlight moments with placement hints
- [ ] Rewrite `ceremony-narrative.ts` prompt and parsing to generate integrated quote narration
- [ ] Update narrative output structure to remove `user_moment` segments
- [ ] Test narrative generation with real user data

### Phase 2: Player Simplification
- [ ] Remove `user_moment` handling from JourneyPlayer component
- [ ] Remove user moment fallback logic from segment audio endpoint
- [ ] Simplify preloading (all segments are now TTS)
- [ ] Test end-to-end playback

### Phase 3: Testing & Validation
- [ ] Update unit tests for narrative generation
- [ ] Update unit tests for moment selection
- [ ] Test with ceremony-ready user
- [ ] Verify full ceremony flow works

### Phase 4: Polish (Optional)
- [ ] Visual treatment for quoted text during playback
- [ ] Smooth transitions between segments
- [ ] Loading state improvements

### Future: Audio Version (Separate Initiative)

When audio capture is implemented, create "Final Ceremony - Audio Version":
- [ ] Voice input infrastructure during sessions
- [ ] Prompted moment recording with consent flow
- [ ] Hybrid journey: AI narration + real user audio clips
- [ ] Migration plan from pre-audio to audio version for existing users

---

## Testing Strategy

### Unit Tests

Update existing tests:
- `tests/unit/ceremony/ceremony-narrative.test.ts` - Verify no `user_moment` segments generated
- `tests/unit/ceremony/ceremony-select.test.ts` - Verify 3-5 moments selected with placement hints

### Manual Testing

Using `scripts/seed-ceremony-test-user.sql`:
1. Create ceremony-ready test user
2. Navigate to `/ceremony`
3. Complete full ceremony flow
4. Verify journey playback is continuous TTS audio
5. Verify user quotes are present in narrative
6. Check final recording and cheat sheet still work

### E2E Tests

Update if ceremony E2E tests exist:
- Verify journey segments are all type `narration`
- Verify audio playback works without silent gaps

---

## Success Metrics

| Metric | Target | How Measured |
|--------|--------|--------------|
| Ceremony completion rate | >80% of ceremony-ready users | `ceremony_completed_at` vs ceremony-ready state |
| Journey playback completion | >60% listen to full journey | Track `complete` event on JourneyPlayer |
| Final recording completion | >70% record a message | `final_recording` artifact exists |
| Post-ceremony artifact revisits | >30% return to artifacts in 30 days | Track artifact access after ceremony |
| User satisfaction (qualitative) | Positive sentiment | Post-ceremony feedback prompt |

---

## Rollout Plan

### Phase 1: Staging Deployment
1. Deploy to staging environment
2. Test with 2-3 real users who are ceremony-ready
3. Gather feedback on narrative quality and emotional impact

### Phase 2: Production Deployment
1. Deploy to production
2. Monitor completion rates and error logs
3. A/B test if possible (old vs new approach)

### Phase 3: Iteration
1. Collect user feedback
2. Refine narrative prompts based on quality
3. Adjust moment selection criteria if needed

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| AI speaking user's words feels inauthentic | Frame quotes clearly with attribution ("You told me...") |
| Narrative feels too long or boring | Target 3-5 minutes max, test with real users |
| Quotes taken out of context | Select moments with clear standalone meaning |
| TTS audio generation fails | Existing fallback to text display still works |
| Users expect to hear themselves | Set expectations in intro step, emphasize final recording |

---

## Appendix

### Related Files

| File | Description |
|------|-------------|
| `/pages/ceremony.vue` | Main ceremony page (6-step flow) |
| `/components/JourneyPlayer.vue` | Journey playback component |
| `/server/utils/llm/tasks/ceremony-narrative.ts` | AI narrative generation |
| `/server/api/ceremony/journey/[segmentId]/audio.get.ts` | Segment audio endpoint |
| `/server/utils/llm/tasks/ceremony-select.ts` | Moment selection logic |
| `/server/utils/llm/tasks/moment-detection.ts` | How moments are captured |
| `/docs/testing/core-program-test-plan.md` | Test plan for Phase 4D/4E |

### Database Tables

- `ceremony_artifacts` - Stores journey, final recording, cheat sheet
- `captured_moments` - User's therapeutic moments (text only currently)
- `user_story` - User's conviction scores and ceremony status
- `follow_up_schedule` - Post-ceremony check-in milestones

### Bug Fixes Completed

- ✅ Storage bucket mismatch fixed (commit ba62293) - `/api/ceremony/final-recording/audio.get.ts` now correctly references `ceremony-artifacts` bucket

---

## Open Questions

1. Should we add optional background music during journey playback?
2. How much emphasis should we place on the final recording as "the one chance to hear yourself"?
3. Should we include a preview/example of the journey format before users start?

---

## Stakeholder Sign-off

- [ ] Product Owner
- [ ] Technical Lead
- [ ] UX Designer (if applicable)
