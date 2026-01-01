import type { Message } from '~/server/utils/llm/types'

interface Conversation {
  id: string
  title: string
  model: string
  messages: Message[]
}

export const useChat = () => {
  const messages = ref<Message[]>([])
  const conversationId = ref<string | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const sendMessage = async (content: string, stream = true) => {
    if (!content.trim()) return

    // Add user message to local state immediately
    const userMessage: Message = { role: 'user', content }
    messages.value.push(userMessage)

    isLoading.value = true
    error.value = null

    try {
      if (stream) {
        // Streaming request
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: messages.value,
            conversationId: conversationId.value,
            stream: true
          })
        })

        if (!response.ok) {
          throw new Error('Failed to send message')
        }

        // Add empty assistant message that we'll fill in
        const assistantMessage: Message = { role: 'assistant', content: '' }
        messages.value.push(assistantMessage)
        const assistantIndex = messages.value.length - 1

        const reader = response.body?.getReader()
        const decoder = new TextDecoder()

        if (reader) {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            const chunk = decoder.decode(value)
            const lines = chunk.split('\n')

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = JSON.parse(line.slice(6))

                if (data.token) {
                  messages.value[assistantIndex].content += data.token
                }

                if (data.conversationId && !conversationId.value) {
                  conversationId.value = data.conversationId
                }

                if (data.error) {
                  error.value = data.error
                }
              }
            }
          }
        }
      } else {
        // Non-streaming request
        const response = await $fetch('/api/chat', {
          method: 'POST',
          body: {
            messages: messages.value,
            conversationId: conversationId.value,
            stream: false
          }
        })

        messages.value.push({ role: 'assistant', content: response.content })

        if (response.conversationId) {
          conversationId.value = response.conversationId
        }
      }
    } catch (e: any) {
      error.value = e.message || 'Failed to send message'
      // On failure: DB is source of truth, reload from DB if needed
      // For now, we'll just remove the optimistically added user message from UI
      messages.value.pop()
    } finally {
      isLoading.value = false
    }
  }

  const loadConversation = async (id: string) => {
    isLoading.value = true
    error.value = null

    try {
      const conversation = await $fetch(`/api/conversations/${id}`)
      conversationId.value = conversation.id
      messages.value = conversation.messages
    } catch (e: any) {
      error.value = e.message || 'Failed to load conversation'
    } finally {
      isLoading.value = false
    }
  }

  const startNewConversation = () => {
    conversationId.value = null
    messages.value = []
    error.value = null
  }

  return {
    messages,
    conversationId,
    isLoading,
    error,
    sendMessage,
    loadConversation,
    startNewConversation
  }
}
