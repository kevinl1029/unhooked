# Phase 4: Core Program - Smoke Testing Plan

**Version:** 1.0
**Date:** 2026-01-09
**Scope:** Phase 4A through 4E feature implementation

---

## Overview

This document outlines the manual smoke testing plan for Phase 4 (Core Program) features. Tests should be performed with a **fresh user account** to ensure clean data state and accurate testing of all flows.

### Prerequisites

- Local dev server running (`npm run dev`)
- Access to Supabase dashboard (for data verification)
- New email address for test account (or use Supabase email testing)

---

## Test Environment Setup

### Create Fresh Test User

1. Sign out of any existing account
2. Navigate to `/` (home page)
3. Click "Start Your Journey"
4. Complete sign-up with new email
5. Verify email (check Supabase Auth dashboard if using test email)

---

## Phase 4A: Core Program Foundation

### 4A-1: Onboarding Flow

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Complete onboarding questionnaire | All questions save correctly |  |
| 2 | Check `user_intake` table | Row created with all responses |  |
| 3 | Check `user_progress` table | Row created with `program_status: 'in_progress'`, `myth_order` populated |  |
| 4 | Redirected to `/dashboard` | Dashboard shows "not_started" or "in_progress" state |  |

### 4A-2: User Story Initialization

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Start first session | `user_story` row created |  |
| 2 | Check `user_story` table | Row exists with `user_id`, all myth conviction fields initialized to null |  |

### 4A-3: Session Start

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Click "Begin First Session" from dashboard | Redirected to `/session/[mythNumber]` |  |
| 2 | Session page loads | Chat interface appears, loading state shows briefly |  |
| 3 | First AI message appears | Greeting message related to myth topic |  |
| 4 | Check `conversations` table | New conversation created with `myth_number`, `myth_key`, `session_type` |  |

---

## Phase 4B: Check-In System

### 4B-1: Check-In Interstitial

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Open app with pending check-in | Check-in interstitial modal appears |  |
| 2 | Verify prompt displays | Personalized check-in prompt shown |  |
| 3 | Tap mic button to record response | Recording starts, waveform visible |  |
| 4 | Tap again to stop and send | Response transcribed and processed |  |
| 5 | Check `check_in_schedule` table | Row updated with `completed_at`, `response_conversation_id` |  |
| 6 | Alternative: Click "Skip for now" | Check-in dismissed, `skipped_at` set |  |
| 7 | Swipe down (mobile) or click outside (desktop) | Modal dismissed without action |  |

### 4B-2: Abandoned Session Detection

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Start a session, send a few messages | Conversation in progress |  |
| 2 | Leave session (navigate away) without completing | Session left incomplete |  |
| 3 | Return within 24 hours | Resume prompt or check-in appears |  |
| 4 | Check `/api/session/resume` response | Returns prior moments from abandoned session |  |

---

## Phase 4C: Personalization Engine

### 4C-1: Moment Capture

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | During session, share personal story about nicotine use | AI responds empathetically |  |
| 2 | Continue conversation with emotional content | Moment detection runs in background |  |
| 3 | Check `captured_moments` table | Moments captured with appropriate `moment_type` |  |
| 4 | Verify moment has `user_text`, `ai_summary`, `confidence_score` | Data populated correctly |  |

### 4C-2: Cross-Session Context

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Complete first myth session | Session marked complete |  |
| 2 | Start second myth session | New conversation begins |  |
| 3 | Check AI greeting/responses | References insights from previous session |  |
| 4 | Verify `/api/moments/for-context` returns prior moments | Prior insights available for injection |  |

### 4C-3: Conviction Assessment

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Complete a full myth session (all 3 layers) | Session complete flow triggers |  |
| 2 | Check `conviction_assessments` table | Assessment created with `conviction_score`, `delta`, `reasoning` |  |
| 3 | Check `user_story` table | Corresponding myth conviction field updated |  |

---

## Phase 4D: Ceremony & Artifacts

### 4D-1: Ceremony Ready State

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Complete all 5 myth sessions | All myths in `myths_completed` array |  |
| 2 | Navigate to `/dashboard` | Shows "ceremony_ready" state with "Begin Ceremony" CTA |  |
| 3 | Check `user_progress.program_status` | Value is `'completed'` |  |

### 4D-2: Ceremony Preparation

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Click "Begin Ceremony" | Redirected to `/ceremony` |  |
| 2 | Check `/api/ceremony/prepare` response | Returns user data, moments, key insights |  |
| 3 | Ceremony intro content displays | Personalized welcome based on user journey |  |

### 4D-3: Reflective Journey Generation

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Progress through ceremony to journey step | Journey generation triggers |  |
| 2 | Check `/api/ceremony/generate-journey` | Returns playlist with segments |  |
| 3 | Journey player displays | Segments with text and audio controls |  |
| 4 | Play journey | Audio plays (or text fallback), word highlighting works |  |
| 5 | Check `ceremony_artifacts` table | `reflective_journey` artifact created |  |

### 4D-4: Final Recording

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Reach final recording step | Recording interface appears |  |
| 2 | Record message to future self | Audio captures |  |
| 3 | Preview recording | Playback works |  |
| 4 | Save recording | Saved successfully |  |
| 5 | Check `ceremony_artifacts` table | `final_recording` artifact created with `audio_path` |  |

### 4D-5: Ceremony Completion

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Complete ceremony | Success screen displays |  |
| 2 | Check `user_story.ceremony_completed_at` | Timestamp set |  |
| 3 | Check `follow_up_schedule` table | 7 follow-up milestones scheduled (day 3, 7, 14, 30, 90, 180, 365) |  |
| 4 | Check `ceremony_artifacts` table | `myths_cheat_sheet` artifact created |  |

### 4D-6: Cheat Sheet / Toolkit

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Navigate to `/toolkit` | Cheat sheet page loads |  |
| 2 | Verify all 5 myths displayed | Each myth shows name, myth statement, truth |  |
| 3 | Check for user insights | Personal insights displayed if captured |  |

---

## Phase 4E: Reinforcement Mode (Post-Ceremony)

### 4E-1: Post-Ceremony Dashboard

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Navigate to `/dashboard` after ceremony | Post-ceremony state displays |  |
| 2 | Verify header shows "You're Unhooked" | Completion message with date |  |
| 3 | Verify artifacts section | Journey, Message, Toolkit cards visible |  |
| 4 | Verify support section | "I'm struggling" and "Give me a boost" buttons visible |  |
| 5 | Verify follow-up section | Next check-in displayed (if scheduled) |  |

### 4E-2: Artifact Playback - Journey

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Click "Play" on Your Journey card | Redirected to `/journey` |  |
| 2 | Journey player loads | Segments display with controls |  |
| 3 | Play journey | Audio plays with word-by-word highlighting |  |
| 4 | View transcript | Full transcript viewable via details toggle |  |

### 4E-3: Artifact Playback - Final Recording

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Click "Play" on Your Message card | Audio player modal opens |  |
| 2 | Audio plays | User's recorded message plays back |  |
| 3 | Close modal | Modal closes, returns to dashboard |  |

### 4E-4: Toolkit Access

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Click "View" on Your Toolkit card | Redirected to `/toolkit` |  |
| 2 | All 5 myths displayed | Complete cheat sheet visible |  |
| 3 | Back button works | Returns to dashboard |  |

### 4E-5: Support Conversation - Struggling

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Click "I'm struggling" button | Redirected to `/support?mode=struggling` |  |
| 2 | Page loads with header | Shows "I'm Struggling" title |  |
| 3 | Initial AI message appears | Empathetic, supportive greeting |  |
| 4 | Send a message | Response references user's journey/insights |  |
| 5 | Check `conversations` table | Conversation created with `session_type: 'reinforcement'` |  |

### 4E-6: Support Conversation - Boost

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Click "Give me a boost" button | Redirected to `/support?mode=boost` |  |
| 2 | Page loads with header | Shows "Get a Boost" title |  |
| 3 | Initial AI message appears | Celebratory, reinforcing greeting |  |
| 4 | Send a message | Response reinforces freedom, references insights |  |

### 4E-7: Follow-up Check-in

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | If follow-up is ready, click "Open" | Redirected to `/follow-up/[id]` |  |
| 2 | Check-in page loads | Shows milestone title (e.g., "Day 3 Check-in") |  |
| 3 | Conversation starts | AI asks how user is doing |  |
| 4 | Complete conversation | Follow-up status can be updated |  |

---

## Dashboard State Testing

### Dashboard States Matrix

Test each dashboard state by verifying the correct UI renders:

| User State | Expected Dashboard | Key Elements |
|------------|-------------------|--------------|
| New user (no progress) | not_started | "Welcome to Your Journey", "Begin First Session" |
| Mid-program (1-4 myths done) | in_progress | Progress indicator, "Continue" button, next myth card |
| All myths done, no ceremony | ceremony_ready | "Begin Ceremony" CTA, all myths checked |
| Post-ceremony | post_ceremony | Artifacts, support buttons, follow-up card |

### State Verification Steps

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Check `/api/user/status` response | Returns correct `phase` field |  |
| 2 | Dashboard renders correct UI | Matches phase from API |  |
| 3 | All interactive elements work | Buttons, links navigate correctly |  |

---

## Error Handling

### Network/API Errors

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Disconnect network during session | Graceful error message |  |
| 2 | Reconnect | Can retry/resume |  |
| 3 | API returns 500 error | Error displayed, retry option available |  |

### Auth Errors

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Access `/dashboard` while logged out | Redirected to login |  |
| 2 | Access `/session/1` while logged out | Redirected to login |  |
| 3 | Session expires mid-conversation | Graceful handling, can re-auth |  |

---

## Data Integrity Checks

After completing full flow, verify database state:

| Table | Expected Records | Pass/Fail |
|-------|------------------|-----------|
| `user_intake` | 1 row with all questionnaire data |  |
| `user_progress` | 1 row, `program_status: 'completed'`, all myths in `myths_completed` |  |
| `user_story` | 1 row, `ceremony_completed_at` set, conviction scores populated |  |
| `conversations` | Multiple (5+ myth sessions, support convos) |  |
| `messages` | Many messages across conversations |  |
| `captured_moments` | Multiple moments with varied `moment_type` |  |
| `conviction_assessments` | 5 assessments (one per myth) |  |
| `ceremony_artifacts` | 3 artifacts (journey, recording, cheat_sheet) |  |
| `follow_up_schedule` | 7 scheduled follow-ups |  |

---

## Known Limitations (MVP)

These features are intentionally simplified or deferred:

1. **Layer progression** - Users progress through all 3 layers per myth in a single session (no multi-session tracking)
2. **Check-in scheduling** - Post-session check-ins are scheduled but email delivery not implemented
3. **Follow-up emails** - Scheduled but email sending not implemented (in-app only)
4. **Audio TTS** - May fall back to text if TTS fails
5. **Conviction thresholds** - All convictions accept any score (no minimum threshold for progression)

---

## Test Results Summary

| Phase | Tests Passed | Tests Failed | Notes |
|-------|--------------|--------------|-------|
| 4A: Foundation | /4 | | |
| 4B: Check-In | /5 | | |
| 4C: Personalization | /8 | | |
| 4D: Ceremony | /13 | | |
| 4E: Reinforcement | /14 | | |
| Dashboard States | /4 | | |
| Error Handling | /6 | | |
| **Total** | /54 | | |

---

## Sign-off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Tester | | | |
| Developer | | | |

---

## Issues Found

| ID | Description | Severity | Status |
|----|-------------|----------|--------|
| | | | |
| | | | |
| | | | |
