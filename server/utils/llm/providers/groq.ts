import Groq from 'groq-sdk'
import type { LLMProvider, ChatRequest, ChatResponse, StreamCallbacks } from '../types'

export class GroqProvider implements LLMProvider {
  name = 'groq'
  private client: Groq
  private modelName: string

  constructor(apiKey: string, modelName = 'llama-3.1-8b-instant') {
    this.client = new Groq({ apiKey })
    this.modelName = modelName
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const completion = await this.client.chat.completions.create({
      model: this.modelName,
      messages: request.messages.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      temperature: 0.7,
      max_tokens: 2000,
    })

    const message = completion.choices[0]?.message
    if (!message?.content) {
      throw new Error('No response from Groq')
    }

    return {
      content: message.content,
      model: this.modelName,
      usage: completion.usage ? {
        promptTokens: completion.usage.prompt_tokens,
        completionTokens: completion.usage.completion_tokens,
        totalTokens: completion.usage.total_tokens
      } : undefined
    }
  }

  async chatStream(request: ChatRequest, callbacks: StreamCallbacks): Promise<void> {
    try {
      const stream = await this.client.chat.completions.create({
        model: this.modelName,
        messages: request.messages.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        temperature: 0.7,
        max_tokens: 2000,
        stream: true,
      })

      let fullResponse = ''

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content
        if (content) {
          fullResponse += content
          callbacks.onToken(content)
        }
      }

      callbacks.onComplete(fullResponse)
    } catch (error) {
      callbacks.onError(error instanceof Error ? error : new Error(String(error)))
    }
  }
}
