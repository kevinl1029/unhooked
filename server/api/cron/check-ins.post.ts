/**
 * POST /api/cron/check-ins
 * Vercel Cron endpoint to process scheduled check-ins
 * Runs every 5 minutes
 */
import { serverSupabaseServiceRole } from '#supabase/server'
import { processScheduledCheckIns } from '~/server/utils/email/check-in-sender'

export default defineEventHandler(async (event) => {
  // Verify the request is from Vercel Cron (or in development)
  const authHeader = getHeader(event, 'authorization')
  const config = useRuntimeConfig()

  // In production, verify the cron secret
  if (process.env.NODE_ENV === 'production') {
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      throw createError({ statusCode: 401, message: 'Unauthorized' })
    }
  }

  const supabase = serverSupabaseServiceRole(event)

  console.log('[cron/check-ins] Processing scheduled check-ins...')

  const result = await processScheduledCheckIns(supabase)

  console.log(`[cron/check-ins] Processed ${result.processed}, sent ${result.sent}, errors: ${result.errors.length}`)

  return {
    success: true,
    processed: result.processed,
    sent: result.sent,
    errors: result.errors,
    timestamp: new Date().toISOString(),
  }
})
