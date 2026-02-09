import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import { scheduleCheckIns, scheduleEvidenceBridgeCheckIn } from '~/server/utils/scheduling/check-in-scheduler'
import { ILLUSION_KEYS, illusionKeyToNumber, type IllusionKey, type IllusionLayer } from '~/server/utils/llm/task-types'
import {
  OBSERVATION_TEMPLATES as STRESS_TEMPLATES
} from '~/server/utils/prompts/illusions/illusion-1-stress'
import {
  OBSERVATION_TEMPLATES as PLEASURE_TEMPLATES
} from '~/server/utils/prompts/illusions/illusion-2-pleasure'
import {
  OBSERVATION_TEMPLATES as WILLPOWER_TEMPLATES
} from '~/server/utils/prompts/illusions/illusion-3-willpower'
import {
  OBSERVATION_TEMPLATES as FOCUS_TEMPLATES
} from '~/server/utils/prompts/illusions/illusion-4-focus'
import {
  OBSERVATION_TEMPLATES as IDENTITY_TEMPLATES
} from '~/server/utils/prompts/illusions/illusion-5-identity'

interface CompleteSessionBody {
  conversationId: string
  illusionKey?: string
  illusionLayer?: IllusionLayer
}

const OBSERVATION_TEMPLATES_MAP: Record<IllusionKey, Record<string, string>> = {
  stress_relief: STRESS_TEMPLATES,
  pleasure: PLEASURE_TEMPLATES,
  willpower: WILLPOWER_TEMPLATES,
  focus: FOCUS_TEMPLATES,
  identity: IDENTITY_TEMPLATES,
}

const LAYER_ORDER: IllusionLayer[] = ['intellectual', 'emotional', 'identity']

/**
 * Derives the current (next incomplete) layer from layer_progress for a given illusion
 */
function deriveCurrentLayer(layerProgress: Record<string, IllusionLayer[]> | null, illusionKey: IllusionKey): IllusionLayer {
  if (!layerProgress) return 'intellectual'

  const completedLayers = layerProgress[illusionKey] || []

  // Find first incomplete layer in order
  for (const layer of LAYER_ORDER) {
    if (!completedLayers.includes(layer)) {
      return layer
    }
  }

  // If all layers complete, return identity (shouldn't happen in practice)
  return 'identity'
}

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user || !user.sub) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const body = await readBody<CompleteSessionBody>(event)
  if (Object.prototype.hasOwnProperty.call(body, 'illusionNumber')) {
    throw createError({ statusCode: 400, message: 'illusionNumber is no longer supported. Send illusionKey instead.' })
  }
  const { illusionKey, illusionLayer } = body

  // Validate required fields
  if (!body.conversationId) {
    throw createError({ statusCode: 400, message: 'conversationId is required' })
  }
  if (illusionKey && !ILLUSION_KEYS.includes(illusionKey as IllusionKey)) {
    throw createError({ statusCode: 400, message: 'Invalid illusionKey' })
  }
  if (illusionLayer && !LAYER_ORDER.includes(illusionLayer)) {
    throw createError({ statusCode: 400, message: 'Invalid illusionLayer' })
  }

  const effectiveIllusionKey = (illusionKey || null) as IllusionKey | null
  if (!effectiveIllusionKey) {
    throw createError({ statusCode: 400, message: 'illusionKey is required' })
  }

  const effectiveIllusionNumber = illusionKeyToNumber(effectiveIllusionKey)
  if (!effectiveIllusionNumber) {
    throw createError({ statusCode: 400, message: 'Unable to resolve illusion number for provided illusionKey' })
  }

  const supabase = serverSupabaseServiceRole(event)

  // Get conversation to check illusion_layer and observation_assignment
  const { data: conversation, error: conversationFetchError } = await supabase
    .from('conversations')
    .select('illusion_layer, observation_assignment')
    .eq('id', body.conversationId)
    .eq('user_id', user.sub)
    .single()

  if (conversationFetchError) {
    throw createError({ statusCode: 404, message: 'Conversation not found' })
  }

  const conversationLayer = conversation?.illusion_layer

  // Mark conversation as completed
  const { error: convError } = await supabase
    .from('conversations')
    .update({
      session_completed: true,
      updated_at: new Date().toISOString()
    })
    .eq('id', body.conversationId)
    .eq('user_id', user.sub)

  if (convError) {
    throw createError({ statusCode: 500, message: convError.message })
  }

  // Fetch current progress
  const { data: currentProgress, error: fetchError } = await supabase
    .from('user_progress')
    .select('*')
    .eq('user_id', user.sub)
    .single()

  if (fetchError) {
    throw createError({ statusCode: 500, message: fetchError.message })
  }

  // ========================================
  // LAYER PROGRESSION LOGIC (Evidence-Based Coaching)
  // ========================================

  // If illusionLayer is provided, handle layer-based progression
  if (illusionLayer) {
    const layerProgress = currentProgress.layer_progress || {}
    const currentLayer = deriveCurrentLayer(layerProgress, effectiveIllusionKey)

    // Validate that the provided layer matches the expected current layer
    if (illusionLayer !== currentLayer) {
      throw createError({
        statusCode: 409,
        message: `Layer mismatch. Expected '${currentLayer}' but received '${illusionLayer}'.`,
        data: {
          expectedLayer: currentLayer,
          receivedLayer: illusionLayer,
        },
      })
    }

    // Update layer_progress by adding the completed layer
    const completedLayers = layerProgress[effectiveIllusionKey] || []
    const updatedCompletedLayers = Array.from(new Set([...completedLayers, illusionLayer]))
    const updatedLayerProgress = {
      ...layerProgress,
      [effectiveIllusionKey]: updatedCompletedLayers
    }

    // Determine if this is L3 (illusion complete) or L1/L2 (layer complete, more to go)
    const isLayer3 = illusionLayer === 'identity'

    if (isLayer3) {
      // L3: Mark illusion complete, move to next illusion
      const illusionsCompleted = currentProgress.illusions_completed || []
      const updatedIllusionsCompleted = Array.from(new Set([...illusionsCompleted, effectiveIllusionNumber]))

      const illusionOrder = currentProgress.illusion_order || [1, 2, 3, 4, 5]
      const nextIllusion = illusionOrder.find(m => !updatedIllusionsCompleted.includes(m)) || null
      const isComplete = updatedIllusionsCompleted.length >= 5

      // Check if this is Identity L3 (final session before ceremony)
      const isIdentityLayer3 = effectiveIllusionKey === 'identity'

      // Determine program status
      let programStatus: string
      if (isComplete && isIdentityLayer3) {
        programStatus = 'ceremony_ready'
      } else if (isComplete) {
        programStatus = 'completed'
      } else {
        programStatus = 'in_progress'
      }

      const updateData: any = {
        layer_progress: updatedLayerProgress,
        current_illusion: nextIllusion || currentProgress.current_illusion,
        illusions_completed: updatedIllusionsCompleted,
        program_status: programStatus,
        completed_at: isComplete ? new Date().toISOString() : null,
        last_session_at: new Date().toISOString(),
        total_sessions: (currentProgress.total_sessions || 0) + 1,
        updated_at: new Date().toISOString()
      }

      if (isIdentityLayer3) {
        updateData.ceremony_ready_at = new Date().toISOString()
      }

      const { data: updatedProgress, error: updateError } = await supabase
        .from('user_progress')
        .update(updateData)
        .eq('user_id', user.sub)
        .select()
        .single()

      if (updateError) {
        throw createError({ statusCode: 500, message: updateError.message })
      }

      // Cancel any pending evidence_bridge check-ins for this illusion (L3 completion)
      // Per US-008 AC: "Any pending evidence_bridge check-ins for this user/illusion are cancelled with reason 'illusion_completed'"
      try {
        const { error: cancelError } = await supabase
          .from('check_in_schedule')
          .update({
            status: 'cancelled',
            cancellation_reason: 'illusion_completed',
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.sub)
          .eq('trigger_illusion_key', effectiveIllusionKey)
          .eq('check_in_type', 'evidence_bridge')
          .in('status', ['scheduled', 'sent'])

        if (cancelError) {
          console.error('[complete-session] Failed to cancel evidence_bridge check-ins:', cancelError)
        } else {
          console.log(`[complete-session] Cancelled evidence_bridge check-ins for ${effectiveIllusionKey}`)
        }
      } catch (cancelErr) {
        // Non-blocking: don't fail session completion if cancellation fails
        console.error('[complete-session] Error cancelling evidence_bridge check-ins:', cancelErr)
      }

      // Schedule post-session check-in (if not complete)
      if (!isComplete) {
        const timezone = currentProgress.timezone || 'America/New_York'

        scheduleCheckIns({
          userId: user.sub,
          timezone,
          trigger: 'session_complete',
          sessionId: body.conversationId,
          illusionKey: effectiveIllusionKey,
          sessionEndTime: new Date(),
          supabase,
        }).then((scheduled) => {
          if (scheduled.length > 0) {
            console.log(`[complete-session] Scheduled ${scheduled.length} check-in(s) for user ${user.sub}`)
          }
        }).catch((err) => {
          console.error('[complete-session] Failed to schedule check-ins:', err)
        })
      }

      // L3 response
      return {
        progress: updatedProgress,
        layerCompleted: 'identity',
        nextLayer: null,
        isIllusionComplete: true,
        observationAssignment: null,
        nextIllusion,
        isComplete
      }
    } else {
      // L1 or L2: Update layer progress but DON'T mark illusion complete
      const nextLayer = LAYER_ORDER[LAYER_ORDER.indexOf(illusionLayer) + 1] || null

      // Get observation assignment (AI-personalized or fallback template)
      const observationAssignment = conversation.observation_assignment
        || OBSERVATION_TEMPLATES_MAP[effectiveIllusionKey]?.[illusionLayer]
        || null

      const updateData: any = {
        layer_progress: updatedLayerProgress,
        last_session_at: new Date().toISOString(),
        total_sessions: (currentProgress.total_sessions || 0) + 1,
        updated_at: new Date().toISOString()
      }

      const { data: updatedProgress, error: updateError } = await supabase
        .from('user_progress')
        .update(updateData)
        .eq('user_id', user.sub)
        .select()
        .single()

      if (updateError) {
        throw createError({ statusCode: 500, message: updateError.message })
      }

      // Schedule evidence bridge check-in for L1/L2 completions
      // Non-blocking: Don't fail session completion if scheduling fails
      const timezone = currentProgress.timezone || 'America/New_York'
      scheduleEvidenceBridgeCheckIn(
        supabase,
        user.sub,
        effectiveIllusionKey,
        observationAssignment,
        new Date(),
        timezone
      ).then((scheduled) => {
        if (scheduled) {
          console.log(`[complete-session] Scheduled evidence bridge check-in for user ${user.sub}`)
        }
      }).catch((err) => {
        console.error('[complete-session] Failed to schedule evidence bridge check-in:', err)
      })

      // L1/L2 response
      return {
        progress: updatedProgress,
        layerCompleted: illusionLayer,
        nextLayer,
        isIllusionComplete: false,
        observationAssignment
      }
    }
  }

  // ========================================
  // LEGACY LOGIC (No illusionLayer provided)
  // ========================================

  // Add resolved illusion number to illusions_completed (deduplicated)
  const illusionsCompleted = currentProgress.illusions_completed || []
  const updatedIllusionsCompleted = Array.from(new Set([...illusionsCompleted, effectiveIllusionNumber]))

  // Calculate next illusion
  const illusionOrder = currentProgress.illusion_order || [1, 2, 3, 4, 5]
  const nextIllusion = illusionOrder.find(m => !updatedIllusionsCompleted.includes(m)) || null

  // Check if program is complete
  const isComplete = updatedIllusionsCompleted.length >= 5

  // Check if this is Identity Layer 3 (final session before ceremony)
  const isIdentityLayer3 = effectiveIllusionKey === 'identity' && conversationLayer === 'identity'

  // Determine program status
  let programStatus: string
  if (isComplete && isIdentityLayer3) {
    programStatus = 'ceremony_ready'
  } else if (isComplete) {
    programStatus = 'completed'
  } else {
    programStatus = 'in_progress'
  }

  // Update progress
  const updateData: any = {
    current_illusion: nextIllusion || currentProgress.current_illusion,
    illusions_completed: updatedIllusionsCompleted,
    program_status: programStatus,
    completed_at: isComplete ? new Date().toISOString() : null,
    last_session_at: new Date().toISOString(),
    total_sessions: (currentProgress.total_sessions || 0) + 1,
    updated_at: new Date().toISOString()
  }

  // Set ceremony_ready_at when transitioning to ceremony_ready
  if (isIdentityLayer3) {
    updateData.ceremony_ready_at = new Date().toISOString()
  }

  const { data: updatedProgress, error: updateError } = await supabase
    .from('user_progress')
    .update(updateData)
    .eq('user_id', user.sub)
    .select()
    .single()

  if (updateError) {
    throw createError({ statusCode: 500, message: updateError.message })
  }

  // Schedule post-session check-in (non-blocking)
  // Only schedule if program is not complete (user still has sessions to do)
  if (!isComplete) {
    const timezone = currentProgress.timezone || 'America/New_York'

    scheduleCheckIns({
      userId: user.sub,
      timezone,
      trigger: 'session_complete',
      sessionId: body.conversationId,
      illusionKey: effectiveIllusionKey,
      sessionEndTime: new Date(),
      supabase,
    }).then((scheduled) => {
      if (scheduled.length > 0) {
        console.log(`[complete-session] Scheduled ${scheduled.length} check-in(s) for user ${user.sub}`)
      }
    }).catch((err) => {
      // Log but don't fail the request - check-in scheduling is not critical
      console.error('[complete-session] Failed to schedule check-ins:', err)
    })
  }

  return {
    progress: updatedProgress,
    nextIllusion,
    isComplete
  }
})
