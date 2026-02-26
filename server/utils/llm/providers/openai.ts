import OpenAI from 'openai'
import type { LLMProvider, ChatRequest, ChatResponse, StreamCallbacks } from '../types'

export class OpenAIProvider implements LLMProvider {
  name = 'openai'
  modelId: string
  private client: OpenAI
  private modelName: string

  constructor(apiKey: string, modelName = 'gpt-4o-mini') {
    this.client = new OpenAI({ apiKey })
    this.modelName = modelName
    this.modelId = modelName
  }

  // Reasoning models (o-series + gpt-5 family) don't support temperature, top_p,
  // frequency_penalty, presence_penalty, and require 'developer' role instead of 'system'.
  // Exception: gpt-5.1-chat variants are non-reasoning and DO support these params.
  private isReasoningModel(): boolean {
    if (this.modelName.includes('-chat')) return false
    return /^(o\d|gpt-5)/.test(this.modelName)
  }

  private formatMessages(messages: ChatRequest['messages']) {
    return messages.map(msg => ({
      role: this.isReasoningModel() && msg.role === 'system' ? 'developer' as const : msg.role,
      content: msg.content
    }))
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const isReasoning = this.isReasoningModel()

    const completion = await this.client.chat.completions.create({
      model: this.modelName,
      messages: this.formatMessages(request.messages),
      ...(!isReasoning && { temperature: 0.7 }),
      max_completion_tokens: isReasoning ? 16000 : 2000,
    })

    const message = completion.choices[0]?.message
    if (!message?.content) {
      throw new Error('No response from OpenAI')
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
      const isReasoning = this.isReasoningModel()

      const stream = await this.client.chat.completions.create({
        model: this.modelName,
        messages: this.formatMessages(request.messages),
        ...(!isReasoning && { temperature: 0.7 }),
        max_completion_tokens: isReasoning ? 16000 : 2000,
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
