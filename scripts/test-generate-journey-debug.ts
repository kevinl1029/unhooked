/**
 * Debug script to test generate-journey endpoint logic with a real user
 * Run with: npx tsx scripts/test-generate-journey-debug.ts
 *
 * This script simulates what the generate-journey.post.ts endpoint does
 * to identify the exact failure point.
 */

import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SECRET_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

// The test user email
const TEST_USER_EMAIL = 'ascendai2023@gmail.com'

interface CapturedMoment {
  id: string
  userId: string
  conversationId: string
  messageId: string
  momentType: string
  transcript: string
  audioClipPath: string | null
  audioDurationMs: number | null
  illusionKey: string | null
  sessionType: string
  illusionLayer: string | null
  confidenceScore: number
  emotionalValence: string | null
  isUserHighlighted: boolean
  timesPlayedBack: number
  lastUsedAt: string | null
  createdAt: string
  updatedAt: string
}

async function getUserByEmail(email: string) {
  console.log(`\n--- Looking up user: ${email} ---`)

  // First get the user ID from auth.users (requires service role key)
  const { data: users, error } = await supabase.auth.admin.listUsers()

  if (error) {
    console.error('❌ Error listing users:', error.message)
    return null
  }

  const user = users.users.find(u => u.email === email)
  if (!user) {
    console.error(`❌ User not found: ${email}`)
    return null
  }

  console.log(`✓ Found user: ${user.id}`)
  return user
}

async function testGenerateJourneyFlow() {
  console.log('=== Generate Journey Debug Test ===\n')

  // Step 1: Get the user
  const user = await getUserByEmail(TEST_USER_EMAIL)
  if (!user) return

  const userId = user.id

  // Step 2: Fetch user story (same as endpoint)
  console.log('\n--- Step 2: Fetching user_story ---')
  const { data: userStory, error: storyError } = await supabase
    .from('user_story')
    .select('origin_summary, ceremony_completed_at, already_quit')
    .eq('user_id', userId)
    .single()

  if (storyError) {
    console.error('❌ Error fetching user_story:', storyError.message)
    console.log('This might be OK if user_story row does not exist yet.')
  } else {
    console.log('✓ user_story found:', JSON.stringify(userStory, null, 2))

    if (userStory?.ceremony_completed_at) {
      console.log('\n⚠️  Ceremony already completed at:', userStory.ceremony_completed_at)
      console.log('   The endpoint would return 400 "Ceremony already completed"')
    }
  }

  // Step 3: Fetch all moments
  console.log('\n--- Step 3: Fetching captured_moments ---')
  const { data: allMomentsRaw, error: momentsError } = await supabase
    .from('captured_moments')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })

  if (momentsError) {
    console.error('❌ Error fetching moments:', momentsError.message)
    return
  }

  console.log(`✓ Found ${allMomentsRaw?.length || 0} captured moments`)

  if (!allMomentsRaw || allMomentsRaw.length === 0) {
    console.log('\n⚠️  No captured moments found for this user.')
    console.log('   Cannot generate ceremony journey without moments.')
    return
  }

  if (allMomentsRaw.length < 3) {
    console.log(`\n⚠️  Only ${allMomentsRaw.length} moments found.`)
    console.log('   The endpoint requires at least 3 moments.')
    console.log('   Would return 400 "Not enough moments for ceremony"')
  }

  // Show moment types
  const momentsByType: Record<string, number> = {}
  for (const m of allMomentsRaw) {
    momentsByType[m.moment_type] = (momentsByType[m.moment_type] || 0) + 1
  }
  console.log('Moments by type:', momentsByType)

  // Map to CapturedMoment interface (same as endpoint)
  const allMoments: CapturedMoment[] = (allMomentsRaw || []).map(m => ({
    id: m.id,
    userId: m.user_id,
    conversationId: m.conversation_id,
    messageId: m.message_id,
    momentType: m.moment_type,
    transcript: m.transcript,
    audioClipPath: m.audio_clip_path,
    audioDurationMs: m.audio_duration_ms,
    illusionKey: m.illusion_key,
    sessionType: m.session_type,
    illusionLayer: m.illusion_layer,
    confidenceScore: m.confidence_score,
    emotionalValence: m.emotional_valence,
    isUserHighlighted: m.is_user_highlighted,
    timesPlayedBack: m.times_played_back,
    lastUsedAt: m.last_used_at,
    createdAt: m.created_at,
    updatedAt: m.updated_at,
  }))

  // Step 4: Test the upsert that causes the 500 error
  console.log('\n--- Step 4: Testing ceremony_artifacts UPSERT ---')

  // This is the exact query from generate-journey.post.ts
  const testSegments = [
    {
      id: 'test-seg-1',
      type: 'narration',
      text: 'Debug test segment',
      transcript: 'Debug test segment',
      audio_generated: false,
    }
  ]

  // First, let's check if there's an existing artifact
  console.log('\n4a. Checking for existing artifact...')
  const { data: existingArtifact, error: existingError } = await supabase
    .from('ceremony_artifacts')
    .select('id, artifact_type, created_at, updated_at')
    .eq('user_id', userId)
    .eq('artifact_type', 'reflective_journey')
    .single()

  if (existingError && existingError.code !== 'PGRST116') {
    console.error('Error checking existing artifact:', existingError)
  } else if (existingArtifact) {
    console.log('✓ Existing artifact found:', JSON.stringify(existingArtifact, null, 2))
  } else {
    console.log('No existing reflective_journey artifact.')
  }

  // Now test INSERT (per spec: artifacts are immutable)
  console.log('\n4b. Testing INSERT operation (spec says artifacts are immutable)...')

  if (existingArtifact) {
    console.log('✓ Existing artifact found - would return this instead of creating new')
    console.log('  This matches the spec behavior: artifacts are immutable once created')
  } else {
    const { data: artifact, error: artifactError } = await supabase
      .from('ceremony_artifacts')
      .insert({
        user_id: userId,
        artifact_type: 'reflective_journey',
        content_text: 'Debug test narrative - ' + new Date().toISOString(),
        content_json: { segments: testSegments },
        included_moment_ids: allMoments.slice(0, 3).map(m => m.id),
      })
      .select('id')
      .single()

    if (artifactError) {
      console.error('\n❌ INSERT FAILED!')
      console.error('Error message:', artifactError.message)
      console.error('Error code:', artifactError.code)
      console.error('Full error:', JSON.stringify(artifactError, null, 2))
    } else {
      console.log('✓ INSERT SUCCESSFUL!')
      console.log('  Artifact ID:', artifact.id)

      // Clean up test artifact
      console.log('\n  Cleaning up test artifact...')
      await supabase
        .from('ceremony_artifacts')
        .delete()
        .eq('id', artifact.id)
      console.log('  ✓ Test artifact deleted')
    }
  }

  // Step 5: Check table constraints directly
  console.log('\n--- Step 5: Checking table constraints ---')

  // Try to find constraints by querying information_schema
  // Note: This may require a raw SQL query which isn't directly supported
  // But we can infer from the upsert behavior

  console.log('Attempting to list all ceremony_artifacts for this user...')
  const { data: allArtifacts, error: listError } = await supabase
    .from('ceremony_artifacts')
    .select('id, user_id, artifact_type, created_at')
    .eq('user_id', userId)

  if (listError) {
    console.error('Error listing artifacts:', listError.message)
  } else {
    console.log(`Found ${allArtifacts?.length || 0} artifacts for this user:`)
    for (const a of allArtifacts || []) {
      console.log(`  - ${a.artifact_type}: ${a.id} (created: ${a.created_at})`)
    }

    // Check for duplicates
    const journeyArtifacts = allArtifacts?.filter(a => a.artifact_type === 'reflective_journey') || []
    if (journeyArtifacts.length > 1) {
      console.log(`\n⚠️  FOUND ${journeyArtifacts.length} reflective_journey artifacts!`)
      console.log('   This indicates the UNIQUE constraint is missing.')
      console.log('   Duplicates:')
      for (const a of journeyArtifacts) {
        console.log(`     - ${a.id} (created: ${a.created_at})`)
      }
    }
  }

  console.log('\n=== Debug Test Complete ===')
}

testGenerateJourneyFlow().catch(console.error)
