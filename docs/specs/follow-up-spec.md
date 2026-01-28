# Unhooked: Post-Ceremony Follow-Up Specification

**Version:** 1.0
**Created:** 2026-01-28
**Status:** Implemented (Partial)
**Document Type:** Feature Specification (PRD + Technical Design)
**Related Documents:**
- `ceremony-spec.md` (Ceremony triggers follow-up scheduling)
- `reinforcement-sessions-spec.md` (Follow-ups use boost mode)
- `check-in-spec.md` (Similar scheduling patterns, different purpose)

---

## Table of Contents

1. [Overview](#overview)
2. [Distinction from Other Features](#distinction-from-other-features)
3. [Follow-Up Milestones](#follow-up-milestones)
4. [User Experience](#user-experience)
5. [Implementation Status](#implementation-status)
6. [Technical Design](#technical-design)
7. [Gaps & Future Work](#gaps--future-work)
8. [Changelog](#changelog)

---

## Overview

Post-ceremony follow-ups are **scheduled milestone check-ins** that occur at defined intervals after a user completes the ceremony. Unlike on-demand reinforcement sessions, these are proactively scheduled and delivered to maintain connection during the critical post-quit period.

### Purpose

After the ceremony, users enter their new life as non-nicotine users. The follow-ups:

1. **Maintain connection** — Regular touchpoints during vulnerable period
2. **Celebrate milestones** — Mark Day 3, Week 1, Month 1, etc.
3. **Surface struggles early** — Catch wavering before it becomes relapse
4. **Reinforce identity** — Remind them they're free, not "quitting"

### Tone

Follow-ups should feel celebratory, not checking-if-they-slipped:
- "How's life on the other side?"
- "One week free. What's different?"
- "What do you want to remember about this month?"

---

## Distinction from Other Features

| Feature | Trigger | Purpose | Frequency |
|---------|---------|---------|-----------|
| **Post-Session Check-Ins** | 2hr after core session | Bridge insight to real life | Per session |
| **Morning/Evening Check-Ins** | Daily schedule | Maintain active reframe | 2x daily (dormant) |
| **Reinforcement Sessions** | User-initiated (dashboard) | On-demand support | As needed |
| **Follow-Ups** | Scheduled milestones | Celebrate & maintain connection | 7 milestones over 1 year |

Follow-ups are **the only proactive touchpoint after ceremony completion**.

---

## Follow-Up Milestones

| Milestone | Days After Ceremony | Purpose |
|-----------|---------------------|---------|
| `day_3` | 3 | Early check — how are first days going? |
| `day_7` | 7 | One week milestone — what's different? |
| `day_14` | 14 | Two weeks — settling into new normal |
| `day_30` | 30 | One month — major milestone celebration |
| `day_90` | 90 | Three months — habit fully broken |
| `day_180` | 180 | Six months — deep identity shift |
| `day_365` | 365 | One year — anniversary celebration |

### Scheduling Logic

When ceremony completes:
1. Calculate scheduled_for date for each milestone based on `ceremony_completed_at`
2. Insert 7 rows into `follow_up_schedule` with status `scheduled`
3. Use user's timezone for scheduling

---

## User Experience

### Delivery Flow

1. **Email sent** — At scheduled time, user receives email with magic link
2. **Click link** — Opens `/follow-up/[id]` page with text chat interface
3. **Conversation** — Uses "boost" mode from support chat system
4. **Completion** — Follow-up marked complete, conversation saved

### Email Content

**Subject:** "Day 7 — How's life on the other side?"

```
Hey [Name],

It's been a week since your ceremony.

I'd love to hear how things are going.

[Check in with me →]
```

### Follow-Up Page

```
┌─────────────────────────────────────────────────────────────┐
│  ← Back                                                     │
│                                                             │
│  Day 7 Check-in                                             │
│  Let's check in on your progress                            │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [AI message bubble]                                        │
│  Welcome back! It's been a week since your ceremony.        │
│  How are you feeling?                                       │
│                                                             │
│                              [User message bubble]          │
│                              Actually, pretty good...       │
│                                                             │
│  [AI message bubble]                                        │
│  That's great to hear. Tell me more...                      │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  [Text input]                        [Send]                 │
└─────────────────────────────────────────────────────────────┘
```

**Note:** Current implementation is text-only. Voice interface could be added later.

### Dashboard Integration

Pending follow-ups could be surfaced on dashboard (not currently implemented):
- "You have a Day 7 check-in waiting"
- [Start Check-in] button

---

## Implementation Status

### What's Implemented ✓

| Component | Status | Notes |
|-----------|--------|-------|
| Database table | ✓ | `follow_up_schedule` with all fields |
| API: Get pending | ✓ | `/api/follow-ups/pending` |
| API: Get by ID | ✓ | `/api/follow-ups/[id]` |
| Follow-up page | ✓ | `/follow-up/[id].vue` with text chat |
| Milestone config | ✓ | 7 milestones defined |
| Unit tests | ✓ | Scheduling calculations tested |

### What's Missing ✗

| Component | Status | Notes |
|-----------|--------|-------|
| Scheduling on ceremony complete | ✗ | Need to call from ceremony endpoint |
| Email delivery | ✗ | No cron job sending follow-up emails |
| Magic link generation | ✗ | Token column exists but not used |
| Dashboard surface | ✗ | Pending follow-ups not shown on dashboard |
| Completion marking | ✗ | No API to mark follow-up complete |

---

## Technical Design

### Database Schema

```sql
CREATE TABLE public.follow_up_schedule (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Milestone
  milestone_type TEXT NOT NULL CHECK (milestone_type IN (
    'day_3', 'day_7', 'day_14', 'day_30', 'day_90', 'day_180', 'day_365'
  )),
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  timezone TEXT NOT NULL,

  -- Auth
  magic_link_token TEXT,

  -- State
  status TEXT DEFAULT 'scheduled' CHECK (status IN (
    'scheduled', 'sent', 'completed', 'skipped'
  )),

  -- Response tracking
  response_conversation_id UUID REFERENCES public.conversations(id),
  completed_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_followup_user ON follow_up_schedule(user_id);
CREATE INDEX idx_followup_status ON follow_up_schedule(status, scheduled_for);
CREATE INDEX idx_followup_token ON follow_up_schedule(magic_link_token);

-- RLS
ALTER TABLE follow_up_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own follow-ups"
  ON follow_up_schedule FOR SELECT
  USING (auth.uid() = user_id);
```

### API Endpoints

#### `GET /api/follow-ups/pending`

Returns pending follow-ups for current user.

```typescript
// Response
{
  follow_ups: FollowUp[]
  next: FollowUp | null
  total_pending: number
}
```

#### `GET /api/follow-ups/[id]`

Returns single follow-up by ID.

```typescript
// Response
{
  id: string
  milestone_type: string
  scheduled_for: string
  status: string
}
```

### Conversation Mode

Follow-ups use the existing "boost" mode from the support chat system:

```typescript
// In follow-up page
const response = await $fetch('/api/support/chat', {
  method: 'POST',
  body: {
    mode: 'boost',  // Uses boost prompt/behavior
    messages: [],
    followUpId: followUpId.value,
  },
})
```

---

## Gaps & Future Work

### Priority 1: Complete Core Flow

1. **Schedule on ceremony complete**
   - In `/api/ceremony/complete.post.ts`, call scheduling function
   - Create all 7 follow-up records with calculated dates

2. **Email delivery cron**
   - Add follow-ups to existing cron job or create new one
   - Generate magic link tokens
   - Send emails via Resend

3. **Completion endpoint**
   - `POST /api/follow-ups/[id]/complete`
   - Mark status as 'completed', set completed_at
   - Link response_conversation_id

### Priority 2: Dashboard Integration

- Show pending/overdue follow-ups on dashboard
- Quick-start button to begin follow-up conversation
- Visual indication of milestone progress

### Priority 3: Enhanced Experience

- Voice interface (currently text-only)
- Richer prompts based on milestone type
- Integration with captured moments (reference their journey)

### Deferred

- **Skip functionality** — Allow users to skip/reschedule
- **Notification preferences** — User control over follow-up frequency
- **Custom milestones** — User-defined check-in dates

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-28 | Initial specification documenting implemented and missing components |
