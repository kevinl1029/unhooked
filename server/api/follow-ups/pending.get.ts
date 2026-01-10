/**
 * Pending Follow-ups Endpoint
 * Returns pending follow-up check-ins for the user
 */

import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user || !user.sub) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const supabase = serverSupabaseServiceRole(event)

  // Fetch all scheduled/sent follow-ups
  const { data: followUps, error } = await supabase
    .from('follow_up_schedule')
    .select('*')
    .eq('user_id', user.sub)
    .in('status', ['scheduled', 'sent'])
    .order('scheduled_for', { ascending: true })

  if (error) {
    console.error('[pending-follow-ups] Error:', error)
    throw createError({ statusCode: 500, message: error.message })
  }

  // Check for overdue follow-ups
  const now = new Date()
  const processed = (followUps || []).map(followUp => {
    const scheduledDate = new Date(followUp.scheduled_for)
    const isOverdue = scheduledDate < now
    const daysUntil = Math.ceil((scheduledDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    return {
      ...followUp,
      is_overdue: isOverdue,
      days_until: isOverdue ? 0 : daysUntil,
    }
  })

  // Get the next pending one (first in list)
  const nextFollowUp = processed.find(f => f.status === 'scheduled' || f.status === 'sent')

  return {
    follow_ups: processed,
    next: nextFollowUp || null,
    total_pending: processed.length,
  }
})
