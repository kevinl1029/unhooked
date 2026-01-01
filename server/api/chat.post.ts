import { getModelRouter, DEFAULT_MODEL } from '../utils/llm'
import type { Message, ModelType } from '../utils/llm'
import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  // Verify authentication
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const body = await readBody(event)
  const {
    messages,
    conversationId,
    model = DEFAULT_MODEL,
    stream = false
  } = body as {
    messages: Message[]
    conversationId?: string
    model?: ModelType
    stream?: boolean
  }

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    throw createError({ statusCode: 400, message: 'Messages array is required' })
  }

  const router = getModelRouter()
  const supabase = serverSupabaseServiceRole(event)

  // Get or create conversation
  let convId = conversationId
  if (!convId) {
    // Create new conversation
    console.log('User object:', user) // Debug log
    const userId = user.id || user.sub // Try both id and sub (JWT subject claim)

    if (!userId) {
      throw createError({ statusCode: 500, message: 'User ID not found in session' })
    }

    const { data: newConv, error: convError } = await supabase
      .from('conversations')
      .insert({
        user_id: userId,
        model,
        title: messages[0]?.content.slice(0, 50) || 'New conversation'
      })
      .select('id')
      .single()

    if (convError) throw createError({ statusCode: 500, message: convError.message })
    convId = newConv.id
  }

  // Save user message
  const lastUserMessage = messages[messages.length - 1]
  if (lastUserMessage.role === 'user') {
    await supabase.from('messages').insert({
      conversation_id: convId,
      role: 'user',
      content: lastUserMessage.content
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
          { messages, model },
          {
            onToken: (token) => {
              fullResponse += token
              const data = JSON.stringify({ token, conversationId: convId })
              controller.enqueue(encoder.encode(`data: ${data}\n\n`))
            },
            onComplete: async (response) => {
              // Save assistant message
              await supabase.from('messages').insert({
                conversation_id: convId,
                role: 'assistant',
                content: response
              })

              const data = JSON.stringify({ done: true, conversationId: convId })
              controller.enqueue(encoder.encode(`data: ${data}\n\n`))
              controller.close()
            },
            onError: (error) => {
              // Improved: Stream error details to client
              const data = JSON.stringify({
                error: error.message,
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
      const response = await router.chat({ messages, model })

      // Save assistant message
      await supabase.from('messages').insert({
        conversation_id: convId,
        role: 'assistant',
        content: response.content
      })

      return {
        ...response,
        conversationId: convId
      }
    } catch (error: any) {
      throw createError({ statusCode: 500, message: error.message })
    }
  }
})
