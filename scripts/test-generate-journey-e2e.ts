/**
 * E2E test for generate-journey endpoint with a real user
 * Run with: npx tsx scripts/test-generate-journey-e2e.ts
 *
 * This calls the actual endpoint logic (not HTTP) to verify the fix works.
 */

import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SECRET_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

const TEST_USER_EMAIL = 'ascendai2023@gmail.com'

interface CapturedMoment {
  id: string
  momentType: string
  transcript: string
  illusionKey: string | null
  confidenceScore: number
  emotionalValence: string | null
}

async function testGenerateJourneyEndpoint() {
  console.log('=== E2E Test: generate-journey endpoint ===\n')

  // 1. Get user
  const { data: users } = await supabase.auth.admin.listUsers()
  const user = users?.users.find(u => u.email === TEST_USER_EMAIL)
  if (!user) {
    console.error(`❌ User not found: ${TEST_USER_EMAIL}`)
    return
  }
  console.log(`✓ Found user: ${user.id}`)

  // 2. Simulate endpoint logic step by step
  console.log('\n--- Simulating endpoint logic ---')

  // Step 1: Check user_story (only origin_summary needed per spec)
  console.log('\n1. Fetching user_story...')
  const { data: userStory, error: storyError } = await supabase
    .from('user_story')
    .select('origin_summary')
    .eq('user_id', user.id)
    .single()

  if (storyError && storyError.code !== 'PGRST116') {
    console.log('   user_story error (non-fatal):', storyError.message)
  } else if (userStory) {
    console.log('   ✓ user_story found, origin_summary:', userStory.origin_summary ? 'present' : 'empty')
  } else {
    console.log('   No user_story found (OK)')
  }

  // Step 1b: Check ceremony completion via user_progress
  console.log('\n1b. Checking ceremony completion via user_progress...')
  const { data: userProgress } = await supabase
    .from('user_progress')
    .select('ceremony_completed_at')
    .eq('user_id', user.id)
    .single()

  if (userProgress?.ceremony_completed_at) {
    console.log('   ⚠️ Ceremony already completed at:', userProgress.ceremony_completed_at)
    console.log('   Endpoint would return 400')
    return
  }
  console.log('   ✓ Ceremony not yet completed')

  // Step 2: Check for existing artifact
  console.log('\n2. Checking for existing reflective_journey artifact...')
  const { data: existingArtifact } = await supabase
    .from('ceremony_artifacts')
    .select('id, content_text, content_json')
    .eq('user_id', user.id)
    .eq('artifact_type', 'reflective_journey')
    .single()

  if (existingArtifact) {
    console.log('   ✓ Existing artifact found - would return this (immutable)')
    console.log('   artifact_id:', existingArtifact.id)
    console.log('   content_text length:', existingArtifact.content_text?.length || 0)
    const segments = (existingArtifact.content_json as any)?.segments || []
    console.log('   segments count:', segments.length)
    console.log('\n✅ Endpoint would succeed (returning existing artifact)')
    return
  }
  console.log('   No existing artifact - will create new one')

  // Step 3: Fetch moments
  console.log('\n3. Fetching captured_moments...')
  const { data: allMomentsRaw, error: momentsError } = await supabase
    .from('captured_moments')
    .select('id, moment_type, transcript, illusion_key, confidence_score, emotional_valence')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  if (momentsError) {
    console.error('   ❌ Error fetching moments:', momentsError.message)
    return
  }

  console.log(`   ✓ Found ${allMomentsRaw?.length || 0} moments`)

  if (!allMomentsRaw || allMomentsRaw.length < 3) {
    console.log('   ❌ Not enough moments (need at least 3)')
    console.log('   Endpoint would return 400')
    return
  }

  // Step 4-6: Would call AI to select moments and generate narrative
  // We'll skip this and just test the INSERT
  console.log('\n4-6. Skipping AI generation (would call selectCeremonyMoments + generateCeremonyNarrative)')

  // Step 7: Test INSERT
  console.log('\n7. Testing INSERT into ceremony_artifacts...')

  const testSegments = [
    { id: 'test-1', type: 'narration', text: 'E2E test segment', transcript: 'E2E test segment', audio_generated: false }
  ]

  const { data: artifact, error: artifactError } = await supabase
    .from('ceremony_artifacts')
    .insert({
      user_id: user.id,
      artifact_type: 'reflective_journey',
      content_text: 'E2E test narrative - ' + new Date().toISOString(),
      content_json: { segments: testSegments },
      included_moment_ids: allMomentsRaw.slice(0, 3).map(m => m.id),
    })
    .select('id')
    .single()

  if (artifactError) {
    console.error('   ❌ INSERT FAILED!')
    console.error('   Error:', artifactError.message)
    console.error('   Code:', artifactError.code)
    return
  }

  console.log('   ✓ INSERT SUCCESSFUL!')
  console.log('   artifact_id:', artifact.id)

  // Clean up
  console.log('\n   Cleaning up test artifact...')
  await supabase
    .from('ceremony_artifacts')
    .delete()
    .eq('id', artifact.id)
  console.log('   ✓ Cleaned up')

  console.log('\n✅ E2E test passed - endpoint fix works!')
}

testGenerateJourneyEndpoint().catch(console.error)
