/**
 * Support Chat Endpoint
 * Handles "I'm struggling" and "Need a boost" conversations
 * Provides full user context to the AI
 */

import { getModelRouter, getDefaultModel } from '../../utils/llm'
import type { Message, ModelType } from '../../utils/llm'
import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import { buildSupportPrompt, type SupportMode } from '../../utils/prompts/support-prompt'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user || !user.sub) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const body = await readBody(event)
  const defaultModel = getDefaultModel()
  const {
    messages,
    conversationId,
    mode = 'boost',
    model = defaultModel,
    stream = false,
  } = body as {
    messages: Message[]
    conversationId?: string
    mode?: SupportMode
    model?: ModelType
    stream?: boolean
  }

  if (!messages || !Array.isArray(messages)) {
    throw createError({ statusCode: 400, message: 'Messages array required' })
  }

  const router = getModelRouter()
  const supabase = serverSupabaseServiceRole(event)

  // Fetch full support context
  const contextResponse = await $fetch('/api/support/context', {
    headers: {
      cookie: getHeader(event, 'cookie') || '',
    },
  })

  // Build system prompt with full context
  const systemPrompt = buildSupportPrompt(contextResponse as any, mode)

  const processedMessages: Message[] = [
    { role: 'system', content: systemPrompt },
    ...messages,
  ]

  // Get or create conversation
  let convId = conversationId

  if (!convId) {
    const { data: newConv, error: convError } = await supabase
      .from('conversations')
      .insert({
        user_id: user.sub,
        model,
        title: mode === 'struggling' ? 'Support: Struggling' : 'Support: Boost',
        session_type: 'reinforcement',
      })
      .select('id')
      .single()

    if (convError) {
      throw createError({ statusCode: 500, message: convError.message })
    }
    convId = newConv.id
  }

  // Save user message
  if (messages.length > 0) {
    const lastUserMessage = messages[messages.length - 1]
    if (lastUserMessage.role === 'user') {
      await supabase.from('messages').insert({
        conversation_id: convId,
        role: 'user',
        content: lastUserMessage.content,
        message_length: lastUserMessage.content.length,
      })
    }
  }

  if (stream) {
    // Streaming response
    setResponseHeader(event, 'Content-Type', 'text/event-stream')
    setResponseHeader(event, 'Cache-Control', 'no-cache')
    setResponseHeader(event, 'Connection', 'keep-alive')

    const encoder = new TextEncoder()
    const streamResponse = new ReadableStream({
      async start(controller) {
        await router.chatStream(
          { messages: processedMessages, model },
          {
            onToken: (token) => {
              const data = JSON.stringify({ token, conversationId: convId })
              controller.enqueue(encoder.encode(`data: ${data}\n\n`))
            },
            onComplete: async (response) => {
              // Save assistant message
              await supabase.from('messages').insert({
                conversation_id: convId,
                role: 'assistant',
                content: response,
                message_length: response.length,
              })

              const data = JSON.stringify({ done: true, conversationId: convId })
              controller.enqueue(encoder.encode(`data: ${data}\n\n`))
              controller.close()
            },
            onError: (error) => {
              const data = JSON.stringify({
                error: error.message,
                conversationId: convId,
              })
              controller.enqueue(encoder.encode(`data: ${data}\n\n`))
              controller.close()
            },
          }
        )
      },
    })

    return sendStream(event, streamResponse)
  } else {
    // Non-streaming response
    try {
      const response = await router.chat({ messages: processedMessages, model })

      // Save assistant message
      await supabase.from('messages').insert({
        conversation_id: convId,
        role: 'assistant',
        content: response.content,
        message_length: response.content.length,
      })

      return {
        ...response,
        conversationId: convId,
      }
    } catch (error: any) {
      const statusCode = error?.status || error?.statusCode || 500
      throw createError({ statusCode, message: error.message })
    }
  }
})
