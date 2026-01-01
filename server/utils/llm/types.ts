export interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface ChatRequest {
  messages: Message[]
  model?: string
  stream?: boolean
}

export interface ChatResponse {
  content: string
  model: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

export interface StreamCallbacks {
  onToken: (token: string) => void
  onComplete: (fullResponse: string) => void
  onError: (error: Error) => void
}

export interface LLMProvider {
  name: string
  chat(request: ChatRequest): Promise<ChatResponse>
  chatStream(request: ChatRequest, callbacks: StreamCallbacks): Promise<void>
}

export type ModelType = 'gemini' | 'claude' | 'openai'

export const DEFAULT_MODEL: ModelType = 'gemini'
