/**
 * Cheat Sheet Endpoint
 * Generates or retrieves the illusions cheat sheet artifact
 */

import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import { generateIllusionsCheatSheet, saveCheatSheetArtifact } from '../../utils/ceremony/cheat-sheet-generator'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user || !user.sub) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const supabase = serverSupabaseServiceRole(event)

  // Check for existing artifact
  const { data: existing } = await supabase
    .from('ceremony_artifacts')
    .select('id, content_json, ceremony_completed_at, created_at')
    .eq('user_id', user.sub)
    .eq('artifact_type', 'illusions_cheat_sheet')
    .single()

  // If exists and ceremony completed, return cached version
  if (existing?.ceremony_completed_at) {
    return {
      artifact_id: existing.id,
      cheat_sheet: existing.content_json,
      generated_at: existing.created_at,
      is_final: true,
    }
  }

  // Generate fresh cheat sheet
  const cheatSheet = await generateIllusionsCheatSheet(supabase, user.sub)

  // Check if ceremony is completed (use user_progress per ADR-004)
  const { data: userProgress } = await supabase
    .from('user_progress')
    .select('ceremony_completed_at')
    .eq('user_id', user.sub)
    .single()

  const ceremonyCompleted = !!userProgress?.ceremony_completed_at

  // Save artifact (will be marked final when ceremony completes)
  const artifactId = await saveCheatSheetArtifact(supabase, user.sub, cheatSheet)

  return {
    artifact_id: artifactId,
    cheat_sheet: cheatSheet,
    generated_at: cheatSheet.generatedAt,
    is_final: ceremonyCompleted,
  }
})
