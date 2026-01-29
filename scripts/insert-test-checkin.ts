/**
 * Insert a test check-in record for email testing
 *
 * Usage:
 *   npx tsx scripts/insert-test-checkin.ts <email>
 *
 * Example:
 *   npx tsx scripts/insert-test-checkin.ts kevinl1029@gmail.com
 *
 * The check-in is scheduled for "now" so it's immediately ready
 * for the cron job to process and send the email.
 */

import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import * as dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SECRET_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SECRET_KEY in .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const TEST_EMAIL = process.argv[2]

if (!TEST_EMAIL) {
  console.error('Usage: npx tsx scripts/insert-test-checkin.ts <email>')
  console.error('Example: npx tsx scripts/insert-test-checkin.ts kevinl1029@gmail.com')
  process.exit(1)
}

async function main() {
  // 1. Find user by email
  const { data: userData, error: userError } = await supabase.auth.admin.listUsers()

  if (userError) {
    console.error('Failed to list users:', userError)
    process.exit(1)
  }

  const user = userData.users.find(u => u.email === TEST_EMAIL)

  if (!user) {
    console.error(`User not found with email: ${TEST_EMAIL}`)
    process.exit(1)
  }

  console.log(`Found user: ${user.id} (${user.email})`)

  // 2. Generate magic link token
  const magicLinkToken = crypto.randomBytes(32).toString('hex')

  // 3. Insert check-in record with scheduled_for = now
  const { data: checkIn, error: insertError } = await supabase
    .from('check_in_schedule')
    .insert({
      user_id: user.id,
      scheduled_for: new Date().toISOString(),
      timezone: 'America/Los_Angeles',
      check_in_type: 'post_session',
      prompt_template: 'How are things going since your last session?',
      magic_link_token: magicLinkToken,
      status: 'scheduled',
    })
    .select()
    .single()

  if (insertError) {
    console.error('Failed to insert check-in:', insertError)
    process.exit(1)
  }

  console.log('✓ Created test check-in:')
  console.log(`  ID: ${checkIn.id}`)
  console.log(`  Type: ${checkIn.check_in_type}`)
  console.log(`  Scheduled for: ${checkIn.scheduled_for}`)
  console.log(`  Status: ${checkIn.status}`)
  console.log(`  Magic link token: ${magicLinkToken.slice(0, 8)}...`)
  console.log('')
  console.log('Now trigger the GitHub Action to send the email!')
}

main()
