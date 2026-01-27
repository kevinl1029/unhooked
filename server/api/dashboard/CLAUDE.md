# Dashboard API Endpoints

This directory contains API endpoints for dashboard-related functionality.

## Patterns

### Authentication
All endpoints require authentication:
```typescript
const user = await serverSupabaseUser(event)
if (!user || !user.sub) {
  throw createError({ statusCode: 401, message: 'Unauthorized' })
}
```

### Database Access
Use service role for queries (bypasses RLS):
```typescript
const supabase = serverSupabaseServiceRole(event)
```

## Illusion Key Mapping

**IMPORTANT:** Database uses different keys than the PRD suggests:
- Database: `'stress_relief'`, `'pleasure'`, `'willpower'`, `'focus'`, `'identity'`
- Number mapping: 1 → stress_relief, 2 → pleasure, 3 → willpower, 4 → focus, 5 → identity

Conviction scores in `user_story` table follow pattern: `{illusionKey}_conviction`
- Examples: `stress_relief_conviction`, `pleasure_conviction`, etc.

## Endpoints

### GET /api/dashboard/moments
Returns the optimal moment card for the dashboard based on conviction scores.

**Algorithm:**
1. Find illusion with lowest conviction score (from `user_story`)
2. Tiebreaker: most recently completed illusion (from `conversations.completed_at`)
3. Select moment using weighted random:
   - Higher `confidence_score` → more likely
   - Older `last_used_at` → more likely (exponential decay over 14 days)

**Response Formats:**
- Normal: `{ moment_id, quote, illusion_key, illusion_name, relative_time, created_at }`
- No moments: `{ no_moments: true, illusion_key, illusion_name }`
- No completed illusions: `null`

**Quote Truncation:** Maximum 240 characters with ellipsis

**Relative Time Format:**
- "Today" (0 days)
- "Yesterday" (1 day)
- "X days ago" (2-30 days)
- "Over a month ago" (31+ days)
