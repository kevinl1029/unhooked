import { getModelRouter, getDefaultModel } from '../utils/llm'
import type { Message, ModelType } from '../utils/llm'
import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import { buildSystemPrompt, buildCheckInSystemPrompt, ILLUSION_NAMES } from '../utils/prompts'
import { BASE_SYSTEM_PROMPT } from '../utils/prompts/base-system'
import {
  detectMoment,
  shouldAttemptDetection,
  getSessionDetectionTracker,
  TRANSCRIPT_CAPTURE_THRESHOLD,
} from '../utils/llm/tasks/moment-detection'
import { illusionNumberToKey, type SessionType, type IllusionLayer, type IllusionKey } from '../utils/llm/task-types'
import { handleSessionComplete } from '../utils/session/session-complete'
import { buildSessionContext, formatContextForPrompt } from '../utils/personalization/context-builder'
import { buildCrossLayerContext, formatCrossLayerContext } from '../utils/personalization/cross-layer-context'
import { buildBridgeContext } from '../utils/session/bridge'
import { createSentenceDetector } from '../utils/tts/sentence-detector'
import { createSequentialTTSProcessor } from '../utils/tts/sequential-processor'
import { getTTSProviderFromConfig, type TTSProviderType } from '../utils/tts'

export default defineEventHandler(async (event) => {
  // Verify authentication
  const user = await serverSupabaseUser(event)
  if (!user || !user.sub) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const body = await readBody(event)
  const defaultModel = getDefaultModel()
  const {
    messages,
    conversationId,
    illusionNumber,
    illusionKey: providedIllusionKey,
    model = defaultModel,
    stream = false,
    streamTTS = false,
    inputModality = 'text',
    sessionType = 'core',
    illusionLayer = 'intellectual',
    priorMoments = [],
    checkInId,
    checkInPrompt,
    anchorMoment,
  } = body as {
    messages: Message[]
    conversationId?: string
    illusionNumber?: number
    illusionKey?: string
    model?: ModelType
    stream?: boolean
    streamTTS?: boolean
    inputModality?: 'text' | 'voice'
    sessionType?: SessionType
    illusionLayer?: IllusionLayer
    priorMoments?: Array<{ transcript: string; moment_type: string }>
    checkInId?: string
    checkInPrompt?: string
    anchorMoment?: { id: string; transcript: string }
  }

  if (!messages || !Array.isArray(messages)) {
    throw createError({ statusCode: 400, message: 'Messages array is required' })
  }

  // Allow empty messages array for assistant-first conversations
  // This lets the AI start the conversation

  const router = getModelRouter()
  const supabase = serverSupabaseServiceRole(event)

  // If illusionNumber provided, fetch user intake for personalization and build system prompt
  let processedMessages = messages
  const isNewConversation = messages.length === 0

  // Handle reinforcement and boost sessions separately
  // These use BASE_SYSTEM_PROMPT + mode overlay (not illusion-specific prompts)
  if ((sessionType === 'reinforcement' || sessionType === 'boost') && providedIllusionKey) {
    // Build reinforcement/boost context - returns overlay string directly
    const overlayPrompt = await buildSessionContext(
      supabase,
      user.sub,
      providedIllusionKey,
      sessionType,
      { anchorMoment: anchorMoment || undefined }
    )

    // For reinforcement/boost, buildSessionContext returns a string (the overlay)
    // Combine with BASE_SYSTEM_PROMPT
    const systemPrompt = BASE_SYSTEM_PROMPT + '\n\n' + overlayPrompt

    processedMessages = [
      { role: 'system', content: systemPrompt },
      ...messages
    ]
  } else if (sessionType === 'boost' && !providedIllusionKey) {
    // Generic boost session (no specific illusion)
    const overlayPrompt = await buildSessionContext(
      supabase,
      user.sub,
      '', // No specific illusion for generic boost
      sessionType,
      {} // No anchor moment for generic boost
    )

    const systemPrompt = BASE_SYSTEM_PROMPT + '\n\n' + overlayPrompt

    processedMessages = [
      { role: 'system', content: systemPrompt },
      ...messages
    ]
  } else if (illusionNumber) {
    const illusionKey = illusionNumberToKey(illusionNumber)

    // Fetch basic intake data
    const { data: intake } = await supabase
      .from('user_intake')
      .select('product_types, usage_frequency, years_using, previous_attempts, triggers')
      .eq('user_id', user.sub)
      .single()

    const userContext = intake ? {
      productTypes: intake.product_types,
      usageFrequency: intake.usage_frequency,
      yearsUsing: intake.years_using,
      previousAttempts: intake.previous_attempts,
      triggers: intake.triggers
    } : undefined

    // Build rich personalization context (Phase 4C)
    let personalizationContext = ''
    let bridgeContext = ''
    let abandonedSessionContext = ''

    // Format prior moments from abandoned session
    if (priorMoments && priorMoments.length > 0) {
      abandonedSessionContext = 'The user started this session earlier but didn\'t complete it. Here are insights they shared before:\n\n'
      abandonedSessionContext += priorMoments
        .map(m => `- [${m.moment_type}]: "${m.transcript}"`)
        .join('\n')
      abandonedSessionContext += '\n\nAcknowledge you remember where you left off and continue naturally from their previous insights.'
    }

    if (illusionKey) {
      // Build session context with captured moments
      const sessionContext = await buildSessionContext(
        supabase,
        user.sub,
        illusionKey,
        sessionType
      )
      personalizationContext = formatContextForPrompt(sessionContext)

      // For returning users (Layer 2+), build cross-layer context and bridge message
      if (illusionLayer !== 'intellectual') {
        const crossLayerCtx = await buildCrossLayerContext(
          supabase,
          user.sub,
          illusionKey,
          illusionLayer
        )
        personalizationContext += formatCrossLayerContext(crossLayerCtx)

        // Only add bridge context for new conversations (AI's first message)
        if (isNewConversation) {
          bridgeContext = buildBridgeContext(crossLayerCtx)
        }
      }
    }

    const systemPrompt = buildSystemPrompt({
      illusionNumber,
      userContext,
      isNewConversation,
      personalizationContext,
      bridgeContext,
      abandonedSessionContext,
    })

    // Prepend system message
    processedMessages = [
      { role: 'system', content: systemPrompt },
      ...messages
    ]
  } else if (sessionType === 'check_in' && checkInPrompt) {
    // Build check-in specific system prompt
    const checkInSystemPrompt = buildCheckInSystemPrompt(checkInPrompt)

    // Prepend system message
    processedMessages = [
      { role: 'system', content: checkInSystemPrompt },
      ...messages
    ]
  }

  // Get or create conversation
  let convId = conversationId
  const conversationIllusionKey = illusionNumber ? illusionNumberToKey(illusionNumber) : null

  if (!convId) {
    // Create new conversation with enhanced tracking
    const { data: newConv, error: convError } = await supabase
      .from('conversations')
      .insert({
        user_id: user.sub,
        model,
        title: illusionNumber ? ILLUSION_NAMES[illusionNumber] : (messages.length > 0 ? messages[0]?.content.slice(0, 50) : 'New conversation'),
        illusion_number: illusionNumber || null,
        // New Phase 4A fields
        session_type: sessionType,
        illusion_key: conversationIllusionKey,
        illusion_layer: illusionLayer,
      })
      .select('id')
      .single()

    if (convError) throw createError({ statusCode: 500, message: convError.message })
    convId = newConv.id
  }

  // Save user message with metadata (only if there are messages)
  let savedMessageId: string | null = null
  let momentDetectionPromise: Promise<void> | null = null
  const detectionTracker = getSessionDetectionTracker()

  if (messages.length > 0) {
    const lastUserMessage = messages[messages.length - 1]
    if (lastUserMessage.role === 'user') {
      // Calculate time since last message
      const { data: lastMessage } = await supabase
        .from('messages')
        .select('created_at')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      const timeSinceLast = lastMessage
        ? Math.floor((Date.now() - new Date(lastMessage.created_at).getTime()) / 1000)
        : null

      const { data: insertedMessage } = await supabase.from('messages').insert({
        conversation_id: convId,
        role: 'user',
        content: lastUserMessage.content,
        message_length: lastUserMessage.content.length,
        time_since_last_message: timeSinceLast,
        input_modality: inputModality
      }).select('id').single()

      savedMessageId = insertedMessage?.id || null

      // Start moment detection in parallel (if eligible)
      // Only detect on user messages with 20+ words, and within rate limit
      if (
        conversationIllusionKey &&
        shouldAttemptDetection(lastUserMessage.content) &&
        detectionTracker.canDetect(convId)
      ) {
        detectionTracker.incrementCount(convId)

        // Run detection in parallel - don't await here
        momentDetectionPromise = (async () => {
          try {
            const result = await detectMoment({
              userMessage: lastUserMessage.content,
              recentHistory: messages.slice(-6),
              currentIllusionKey: conversationIllusionKey,
              sessionType,
            })

            // If we should capture, save the moment
            if (result.shouldCapture && result.confidence >= TRANSCRIPT_CAPTURE_THRESHOLD) {
              await supabase.from('captured_moments').insert({
                user_id: user.sub,
                conversation_id: convId,
                message_id: savedMessageId,
                moment_type: result.momentType,
                transcript: result.keyPhrase || lastUserMessage.content, // Use key phrase if available
                illusion_key: conversationIllusionKey,
                session_type: sessionType,
                illusion_layer: illusionLayer,
                confidence_score: result.confidence,
                emotional_valence: result.emotionalValence,
                // Audio capture deferred for MVP
                audio_clip_path: null,
                audio_duration_ms: null,
              })
              console.log(`[moment-detection] Captured ${result.momentType} moment with confidence ${result.confidence}`)
            }
          } catch (err) {
            // Silent fail - don't disrupt the conversation
            console.error('[moment-detection] Failed silently:', err)
          }
        })()
      }
    }
  }

  if (stream) {
    // Streaming response with improved error handling
    setResponseHeader(event, 'Content-Type', 'text/event-stream')
    setResponseHeader(event, 'Cache-Control', 'no-cache')
    setResponseHeader(event, 'Connection', 'keep-alive')

    // Check if streaming TTS is enabled and supported
    // Groq: Sentence-level streaming (full sentence synthesized, then sent)
    // InWorld: True sub-sentence streaming (chunks emitted progressively)
    const config = useRuntimeConfig()
    const ttsProvider = config.ttsProvider as TTSProviderType
    const supportsStreamingTTS =
      (ttsProvider === 'groq' && !!config.groqApiKey) ||
      (ttsProvider === 'inworld' && !!config.inworldApiKey)
    const useStreamingTTS = streamTTS && supportsStreamingTTS

    const encoder = new TextEncoder()
    const streamResponse = new ReadableStream({
      async start(controller) {
        let fullResponse = ''

        // Initialize streaming TTS components if enabled
        const sentenceDetector = useStreamingTTS ? createSentenceDetector() : null

        // Create sequential TTS processor - guarantees chunks are sent in order
        // by processing one sentence at a time (no parallel synthesis)
        const ttsProcessor = useStreamingTTS
          ? createSequentialTTSProcessor(
              getTTSProviderFromConfig(),
              (chunk) => {
                // This callback is invoked in strict order for each synthesized chunk
                const data = JSON.stringify({ type: 'audio_chunk', chunk, conversationId: convId })
                controller.enqueue(encoder.encode(`data: ${data}\n\n`))
              }
            )
          : null

        await router.chatStream(
          { messages: processedMessages, model },
          {
            onToken: (token) => {
              fullResponse += token

              // Always send the token for text display
              const data = JSON.stringify({ type: 'token', token, conversationId: convId })
              controller.enqueue(encoder.encode(`data: ${data}\n\n`))

              // If streaming TTS enabled, detect sentences and enqueue for sequential synthesis
              if (sentenceDetector && ttsProcessor) {
                const sentences = sentenceDetector.addToken(token)
                for (const sentence of sentences) {
                  // Each sentence is enqueued and will be processed in strict order
                  ttsProcessor.enqueueSentence(sentence, false)
                }
              }
            },
            onComplete: async (response) => {
              // Flush any remaining text for TTS
              if (sentenceDetector && ttsProcessor) {
                const remaining = sentenceDetector.flush()
                if (remaining) {
                  // Synthesize remaining text as the final chunk
                  ttsProcessor.enqueueSentence(remaining, true)
                }

                // Wait for all sequential synthesis to complete
                // This ensures all audio chunks are sent before closing the stream
                await ttsProcessor.flush()

                // If no remaining text but we had chunks, send a completion marker
                if (!remaining && ttsProcessor.getEnqueuedCount() > 0) {
                  await ttsProcessor.sendCompletionMarker()
                }
              }

              // Check for session complete token
              const sessionComplete = response.includes('[SESSION_COMPLETE]')

              // Save assistant message with metadata
              await supabase.from('messages').insert({
                conversation_id: convId,
                role: 'assistant',
                content: response,
                message_length: response.length,
                time_since_last_message: null
              })

              // If session complete, lock the conversation and run post-session tasks
              if (sessionComplete) {
                await supabase
                  .from('conversations')
                  .update({ completed_at: new Date().toISOString() })
                  .eq('id', convId)

                // Reset detection tracker for this conversation
                detectionTracker.resetCount(convId)

                // Run conviction assessment and post-session tasks (only for core sessions with illusion)
                if (sessionType === 'core' && conversationIllusionKey) {
                  // Wait for moment detection to complete first
                  if (momentDetectionPromise) {
                    await momentDetectionPromise
                    momentDetectionPromise = null
                  }

                  // Run session complete handler (conviction assessment, user story update, key insight selection)
                  // This runs in the background - don't block the response
                  handleSessionComplete({
                    userId: user.sub,
                    conversationId: convId,
                    illusionKey: conversationIllusionKey as IllusionKey,
                    illusionLayer,
                    messages: processedMessages,
                    supabase,
                  }).catch(err => {
                    console.error('[chat] Session complete handler failed:', err)
                  })
                }
              }

              // Wait for moment detection to complete before closing
              if (momentDetectionPromise) {
                await momentDetectionPromise
              }

              const data = JSON.stringify({
                type: 'done',
                done: true,
                conversationId: convId,
                sessionComplete,
                streamingTTS: useStreamingTTS
              })
              controller.enqueue(encoder.encode(`data: ${data}\n\n`))
              controller.close()
            },
            onError: (error) => {
              // Improved: Stream error details to client
              const status = (error as any)?.status
              const statusText = (error as any)?.statusText
              const data = JSON.stringify({
                type: 'error',
                error: error.message,
                status,
                statusText,
                conversationId: convId
              })
              controller.enqueue(encoder.encode(`data: ${data}\n\n`))
              controller.close()
            }
          }
        )
      }
    })

    return sendStream(event, streamResponse)
  } else {
    // Non-streaming response
    try {
      const response = await router.chat({ messages: processedMessages, model })

      // Check for session complete token
      const sessionComplete = response.content.includes('[SESSION_COMPLETE]')

      // Save assistant message with metadata
      await supabase.from('messages').insert({
        conversation_id: convId,
        role: 'assistant',
        content: response.content,
        message_length: response.content.length,
        time_since_last_message: null
      })

      // If session complete, lock the conversation and run post-session tasks
      if (sessionComplete) {
        await supabase
          .from('conversations')
          .update({ completed_at: new Date().toISOString() })
          .eq('id', convId)

        // Reset detection tracker for this conversation
        detectionTracker.resetCount(convId)

        // Run conviction assessment and post-session tasks (only for core sessions with illusion)
        if (sessionType === 'core' && conversationIllusionKey) {
          // Wait for moment detection to complete first
          if (momentDetectionPromise) {
            await momentDetectionPromise
            momentDetectionPromise = null
          }

          // Run session complete handler (conviction assessment, user story update, key insight selection)
          // This runs in the background - don't block the response
          handleSessionComplete({
            userId: user.sub,
            conversationId: convId,
            illusionKey: conversationIllusionKey as IllusionKey,
            illusionLayer,
            messages: processedMessages,
            supabase,
          }).catch(err => {
            console.error('[chat] Session complete handler failed:', err)
          })
        }
      }

      // Wait for moment detection to complete
      if (momentDetectionPromise) {
        await momentDetectionPromise
      }

      return {
        ...response,
        conversationId: convId,
        sessionComplete
      }
    } catch (error: any) {
      const statusCode = error?.status || error?.statusCode || 500
      throw createError({ statusCode, message: error.message })
    }
  }
})
