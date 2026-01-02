import { GoogleGenerativeAI } from '@google/generative-ai'
import type { LLMProvider, ChatRequest, ChatResponse, StreamCallbacks, Message } from '../types'

export class GeminiProvider implements LLMProvider {
  name = 'gemini'
  private client: GoogleGenerativeAI
  private modelName: string

  constructor(apiKey: string, modelName = 'gemini-3-flash-preview') {
    this.client = new GoogleGenerativeAI(apiKey)
    this.modelName = modelName
  }

  private formatMessages(messages: Message[]) {
    // Gemini uses a different format - convert from OpenAI-style
    // Filter out system messages and handle them separately
    const systemMessage = messages.find(m => m.role === 'system')
    const chatMessages = messages.filter(m => m.role !== 'system')

    // For empty chat messages (assistant speaks first), we need to add the AI's
    // first message to history so the chat can continue normally
    if (chatMessages.length === 0) {
      // Return empty history - we'll handle this with generateContent
      return {
        systemInstruction: systemMessage?.content,
        history: [],
        lastMessage: ''
      }
    }

    const history = chatMessages.slice(0, -1).map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }))

    const lastMessage = chatMessages[chatMessages.length - 1]

    return {
      systemInstruction: systemMessage?.content,
      history,
      lastMessage: lastMessage?.content || ''
    }
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const { systemInstruction, history, lastMessage } = this.formatMessages(request.messages)

    const model = this.client.getGenerativeModel({
      model: this.modelName,
      systemInstruction
    })

    const chat = model.startChat({ history })
    const result = await chat.sendMessage(lastMessage)
    const response = result.response

    return {
      content: response.text(),
      model: this.modelName,
      usage: {
        promptTokens: response.usageMetadata?.promptTokenCount || 0,
        completionTokens: response.usageMetadata?.candidatesTokenCount || 0,
        totalTokens: response.usageMetadata?.totalTokenCount || 0
      }
    }
  }

  async chatStream(request: ChatRequest, callbacks: StreamCallbacks): Promise<void> {
    const { systemInstruction, history, lastMessage } = this.formatMessages(request.messages)

    const model = this.client.getGenerativeModel({
      model: this.modelName,
      systemInstruction
    })

    try {
      const chat = model.startChat({ history })
      const result = await chat.sendMessageStream(lastMessage)

      let fullResponse = ''

      for await (const chunk of result.stream) {
        const text = chunk.text()
        fullResponse += text
        callbacks.onToken(text)
      }

      callbacks.onComplete(fullResponse)
    } catch (error) {
      callbacks.onError(error instanceof Error ? error : new Error(String(error)))
    }
  }
}
