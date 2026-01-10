import type { LLMProvider, ModelType, ChatRequest, ChatResponse, StreamCallbacks } from './types'
import { GeminiProvider } from './providers/gemini'
import { GroqProvider } from './providers/groq'

export class ModelRouter {
  private providers: Map<ModelType, LLMProvider> = new Map()

  constructor(config: {
    groqApiKey?: string
    groqModel?: string
    geminiApiKey?: string
    geminiModel?: string
    anthropicApiKey?: string
    openaiApiKey?: string
  }) {
    // Initialize Groq provider (primary)
    if (config.groqApiKey) {
      this.providers.set('groq', new GroqProvider(config.groqApiKey, config.groqModel))
    }

    // Initialize Gemini provider (fallback/testing)
    if (config.geminiApiKey) {
      this.providers.set('gemini', new GeminiProvider(config.geminiApiKey, config.geminiModel))
    }

    // Claude and OpenAI providers will be added in future phases
    // if (config.anthropicApiKey) {
    //   this.providers.set('claude', new ClaudeProvider(config.anthropicApiKey))
    // }
    // if (config.openaiApiKey) {
    //   this.providers.set('openai', new OpenAIProvider(config.openaiApiKey))
    // }
  }

  getProvider(model: ModelType): LLMProvider {
    const provider = this.providers.get(model)
    if (!provider) {
      throw new Error(`Provider not configured for model: ${model}. Check your API keys.`)
    }
    return provider
  }

  listAvailableModels(): ModelType[] {
    return Array.from(this.providers.keys())
  }

  async chat(request: ChatRequest & { model: ModelType }): Promise<ChatResponse> {
    const provider = this.getProvider(request.model)
    return provider.chat(request)
  }

  async chatStream(
    request: ChatRequest & { model: ModelType },
    callbacks: StreamCallbacks
  ): Promise<void> {
    const provider = this.getProvider(request.model)
    return provider.chatStream(request, callbacks)
  }
}
