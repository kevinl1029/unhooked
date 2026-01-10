/**
 * LLM Task Executor
 * Executes LLM tasks with task-specific model configuration
 */

import { getModelRouter } from './index'
import type { Message, ChatRequest } from './types'
import type {
  LLMTask,
  TaskModelConfig,
  TaskModelType,
  DEFAULT_TASK_MODELS,
} from './task-types'

// Map task model types to base provider models
function getProviderModel(taskModel: TaskModelType): { provider: 'groq' | 'gemini' | 'claude' | 'openai'; model: string } {
  // Support "provider:model" format (e.g., "groq:llama-3.1-8b-instant")
  if (typeof taskModel === 'string' && taskModel.includes(':')) {
    const [provider, model] = taskModel.split(':')
    return { provider: provider as 'groq' | 'gemini' | 'claude' | 'openai', model }
  }

  // Legacy enum support
  switch (taskModel) {
    case 'gemini-pro':
      return { provider: 'gemini', model: 'gemini-2.0-flash' }
    case 'gemini-flash':
      return { provider: 'gemini', model: 'gemini-2.0-flash' }
    case 'claude-sonnet':
      return { provider: 'claude', model: 'claude-3-5-sonnet-20241022' }
    case 'claude-haiku':
      return { provider: 'claude', model: 'claude-3-5-haiku-20241022' }
    case 'gpt-4':
      return { provider: 'openai', model: 'gpt-4' }
    case 'gpt-4-turbo':
      return { provider: 'openai', model: 'gpt-4-turbo' }
    default:
      // Default to Groq fast model
      return { provider: 'groq', model: 'llama-3.1-8b-instant' }
  }
}

// Convert string to PascalCase for env var lookup
function toPascalCase(str: string): string {
  return str
    .split('.')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
}

// Default task configurations (using Groq as primary provider)
const defaultConfigs: TaskModelConfig[] = [
  { task: 'conversation', model: 'groq:llama-3.1-8b-instant', temperature: 0.7 },
  { task: 'moment.detect', model: 'groq:llama-3.1-8b-instant', temperature: 0.3, maxTokens: 500 },
  { task: 'conviction.assess', model: 'groq:llama-3.3-70b-versatile', temperature: 0.3, maxTokens: 1000 },
  { task: 'checkin.personalize', model: 'groq:llama-3.1-8b-instant', temperature: 0.7, maxTokens: 300 },
  { task: 'story.summarize', model: 'groq:llama-3.3-70b-versatile', temperature: 0.5, maxTokens: 500 },
  { task: 'ceremony.narrative', model: 'groq:llama-3.3-70b-versatile', temperature: 0.8, maxTokens: 2000 },
  { task: 'ceremony.select', model: 'groq:llama-3.1-8b-instant', temperature: 0.3, maxTokens: 1000 },
  { task: 'key_insight.select', model: 'groq:llama-3.1-8b-instant', temperature: 0.3, maxTokens: 500 },
]

export class TaskExecutor {
  private taskConfigs: Map<LLMTask, TaskModelConfig> = new Map()

  constructor() {
    this.loadTaskConfigs()
  }

  private loadTaskConfigs(): void {
    const config = useRuntimeConfig()

    for (const defaultConfig of defaultConfigs) {
      // Build env var name: llmTaskMomentDetectModel for task 'moment.detect'
      const envKey = `llmTask${toPascalCase(defaultConfig.task)}Model`
      const envModel = (config as Record<string, unknown>)[envKey] as TaskModelType | undefined

      this.taskConfigs.set(defaultConfig.task, {
        ...defaultConfig,
        model: envModel || defaultConfig.model,
      })
    }
  }

  /**
   * Get configuration for a specific task
   */
  getTaskConfig(task: LLMTask): TaskModelConfig {
    const config = this.taskConfigs.get(task)
    if (!config) {
      // Fallback to default
      const defaultConfig = defaultConfigs.find(c => c.task === task)
      if (!defaultConfig) {
        throw new Error(`Unknown task: ${task}`)
      }
      return defaultConfig
    }
    return config
  }

  /**
   * Execute a task with the configured model
   * Parses JSON from text response (no JSON mode)
   */
  async executeTask<T>(
    task: LLMTask,
    prompt: string,
    parseResponse: (response: string) => T
  ): Promise<T> {
    const taskConfig = this.getTaskConfig(task)
    const router = getModelRouter()
    const { provider } = getProviderModel(taskConfig.model)

    const messages: Message[] = [
      { role: 'user', content: prompt }
    ]

    const request: ChatRequest & { model: 'groq' | 'gemini' | 'claude' | 'openai' } = {
      messages,
      model: provider,
    }

    const response = await router.chat(request)

    // Parse JSON from text response
    return parseResponse(response.content)
  }

  /**
   * Execute a task with system prompt and user message
   */
  async executeTaskWithSystem<T>(
    task: LLMTask,
    systemPrompt: string,
    userMessage: string,
    parseResponse: (response: string) => T
  ): Promise<T> {
    const taskConfig = this.getTaskConfig(task)
    const router = getModelRouter()
    const { provider } = getProviderModel(taskConfig.model)

    const messages: Message[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ]

    const request: ChatRequest & { model: 'groq' | 'gemini' | 'claude' | 'openai' } = {
      messages,
      model: provider,
    }

    const response = await router.chat(request)

    return parseResponse(response.content)
  }
}

// Singleton instance
let executor: TaskExecutor | null = null

export function getTaskExecutor(): TaskExecutor {
  if (!executor) {
    executor = new TaskExecutor()
  }
  return executor
}

/**
 * Parse JSON from LLM response text
 * Handles cases where the response may include markdown code blocks
 */
export function parseJsonResponse<T>(response: string): T {
  // Try to extract JSON from markdown code block
  const codeBlockMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (codeBlockMatch) {
    return JSON.parse(codeBlockMatch[1].trim()) as T
  }

  // Try to parse the entire response as JSON
  // First, find the first { or [ and last } or ]
  const jsonStart = response.search(/[\[{]/)
  const jsonEndBrace = response.lastIndexOf('}')
  const jsonEndBracket = response.lastIndexOf(']')
  const jsonEnd = Math.max(jsonEndBrace, jsonEndBracket)

  if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
    const jsonStr = response.slice(jsonStart, jsonEnd + 1)
    return JSON.parse(jsonStr) as T
  }

  // Last resort: try parsing the whole thing
  return JSON.parse(response) as T
}
