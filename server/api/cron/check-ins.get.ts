/**
 * GET /api/cron/check-ins
 * Cron endpoint to process scheduled check-ins
 *
 * Triggered by:
 * - GitHub Actions: Every 5 minutes (primary)
 * - Vercel Cron: Daily at 8am UTC (fallback)
 *
 * See ADR-003 for architecture details.
 */
import { serverSupabaseServiceRole } from '#supabase/server'
import { processScheduledCheckIns } from '~/server/utils/email/check-in-sender'
import { processCeremonyEmails } from '~/server/utils/email/ceremony-email-sender'
import { expireOverdueCheckIns } from '~/server/utils/scheduling/check-in-expiration'

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

  const checkInsResult = await processScheduledCheckIns(supabase)

  console.log(`[cron/check-ins] Processed ${checkInsResult.processed}, sent ${checkInsResult.sent}, errors: ${checkInsResult.errors.length}`)

  console.log('[cron/check-ins] Processing ceremony nudge emails...')

  const ceremonyResult = await processCeremonyEmails(supabase)

  console.log(`[cron/check-ins] Ceremony emails: processed ${ceremonyResult.processed}, sent ${ceremonyResult.sent}, errors: ${ceremonyResult.errors.length}`)

  console.log('[cron/check-ins] Running expiration sweep...')

  const expirationResult = await expireOverdueCheckIns(supabase)

  console.log(`[cron/check-ins] Expiration sweep: expired ${expirationResult.expired}, errors: ${expirationResult.errors.length}`)

  return {
    success: true,
    checkIns: {
      processed: checkInsResult.processed,
      sent: checkInsResult.sent,
      errors: checkInsResult.errors,
    },
    ceremonyEmails: {
      processed: ceremonyResult.processed,
      sent: ceremonyResult.sent,
      errors: ceremonyResult.errors,
    },
    expiration: {
      expired: expirationResult.expired,
      errors: expirationResult.errors,
    },
    timestamp: new Date().toISOString(),
  }
})
