import { getModelRouter, DEFAULT_MODEL } from '../utils/llm'
import type { Message, ModelType } from '../utils/llm'
import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import { buildSystemPrompt, MYTH_NAMES } from '../utils/prompts'

export default defineEventHandler(async (event) => {
  // Verify authentication
  const user = await serverSupabaseUser(event)
  if (!user || !user.sub) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const body = await readBody(event)
  const {
    messages,
    conversationId,
    mythNumber,
    model = DEFAULT_MODEL,
    stream = false
  } = body as {
    messages: Message[]
    conversationId?: string
    mythNumber?: number
    model?: ModelType
    stream?: boolean
  }

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    throw createError({ statusCode: 400, message: 'Messages array is required' })
  }

  const router = getModelRouter()
  const supabase = serverSupabaseServiceRole(event)

  // If mythNumber provided, fetch user intake for personalization and build system prompt
  let processedMessages = messages
  if (mythNumber) {
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

    const systemPrompt = buildSystemPrompt(mythNumber, userContext)

    // Prepend system message
    processedMessages = [
      { role: 'system', content: systemPrompt },
      ...messages
    ]
  }

  // Get or create conversation
  let convId = conversationId
  if (!convId) {
    // Create new conversation
    const { data: newConv, error: convError } = await supabase
      .from('conversations')
      .insert({
        user_id: user.sub,
        model,
        title: mythNumber ? MYTH_NAMES[mythNumber] : (messages[0]?.content.slice(0, 50) || 'New conversation'),
        myth_number: mythNumber || null
      })
      .select('id')
      .single()

    if (convError) throw createError({ statusCode: 500, message: convError.message })
    convId = newConv.id
  }

  // Save user message with metadata
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

    await supabase.from('messages').insert({
      conversation_id: convId,
      role: 'user',
      content: lastUserMessage.content,
      message_length: lastUserMessage.content.length,
      time_since_last_message: timeSinceLast
    })
  }

  if (stream) {
    // Streaming response with improved error handling
    setResponseHeader(event, 'Content-Type', 'text/event-stream')
    setResponseHeader(event, 'Cache-Control', 'no-cache')
    setResponseHeader(event, 'Connection', 'keep-alive')

    const encoder = new TextEncoder()
    const streamResponse = new ReadableStream({
      async start(controller) {
        let fullResponse = ''

        await router.chatStream(
          { messages: processedMessages, model },
          {
            onToken: (token) => {
              fullResponse += token
              const data = JSON.stringify({ token, conversationId: convId })
              controller.enqueue(encoder.encode(`data: ${data}\n\n`))
            },
            onComplete: async (response) => {
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

              const data = JSON.stringify({
                done: true,
                conversationId: convId,
                sessionComplete
              })
              controller.enqueue(encoder.encode(`data: ${data}\n\n`))
              controller.close()
            },
            onError: (error) => {
              // Improved: Stream error details to client
              const status = (error as any)?.status
              const statusText = (error as any)?.statusText
              const data = JSON.stringify({
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
