/**
 * TTS Cost Analysis Script
 *
 * Analyzes completed conversations to estimate TTS costs across providers:
 * - 11Labs
 * - Groq TTS (streaming)
 * - OpenAI TTS
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

// Load environment variables
config()

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SECRET_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

// TTS Pricing (as of Jan 2026)
// Sources:
// - ElevenLabs: https://elevenlabs.io/pricing/api
// - Groq: https://groq.com/pricing (PlayAI Dialog model)
// - OpenAI: https://platform.openai.com/docs/pricing
const PRICING = {
  // 11Labs pricing per 1000 characters (overage rates):
  // Creator: $0.30/1k chars
  // Pro: $0.24/1k chars
  // Scale: $0.18/1k chars
  // Business: $0.12/1k chars
  elevenlabs: {
    creator: 0.00030,   // $0.30 per 1,000 chars
    pro: 0.00024,       // $0.24 per 1,000 chars
    scale: 0.00018,     // $0.18 per 1,000 chars
    business: 0.00012,  // $0.12 per 1,000 chars
  },

  // Groq TTS (PlayAI Dialog model): $50 per 1M characters
  // = $0.00005 per character = $0.05 per 1,000 chars
  groq: {
    perCharacter: 0.00005,
  },

  // OpenAI TTS pricing:
  // tts-1: $15 per 1M characters = $0.015 per 1k chars
  // tts-1-hd: $30 per 1M characters = $0.030 per 1k chars
  openai: {
    tts1: {
      perCharacter: 0.000015,
    },
    tts1HD: {
      perCharacter: 0.000030,
    },
  },
}

interface Message {
  id: string
  conversation_id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
  message_length?: number
}

interface Conversation {
  id: string
  user_id: string
  session_completed: boolean
  illusion_number: number | null
  created_at: string
}

interface AnalysisResult {
  totalConversations: number
  completedConversations: number
  totalAssistantMessages: number
  totalCharacters: number
  estimatedTokens: number
  costs: {
    elevenlabs: {
      creator: number
      pro: number
      scale: number
      business: number
    }
    groq: number
    openai: {
      tts1: number
      tts1HD: number
    }
  }
  averageCharsPerMessage: number
  averageCharsPerConversation: number
}

async function analyzeConversations(): Promise<AnalysisResult> {
  console.log('Fetching completed conversations...\n')

  // Fetch all completed conversations
  const { data: conversations, error: convError } = await supabase
    .from('conversations')
    .select('*')
    .eq('session_completed', true)

  if (convError) {
    console.error('Error fetching conversations:', convError)
    throw convError
  }

  console.log(`Found ${conversations?.length || 0} completed conversations`)

  if (!conversations || conversations.length === 0) {
    return {
      totalConversations: 0,
      completedConversations: 0,
      totalAssistantMessages: 0,
      totalCharacters: 0,
      estimatedTokens: 0,
      costs: {
        elevenlabs: { creator: 0, pro: 0, scale: 0, business: 0 },
        groq: 0,
        openai: { tts1: 0, tts1HD: 0 },
      },
      averageCharsPerMessage: 0,
      averageCharsPerConversation: 0,
    }
  }

  const conversationIds = conversations.map(c => c.id)

  // Fetch all assistant messages from completed conversations
  const { data: messages, error: msgError } = await supabase
    .from('messages')
    .select('*')
    .in('conversation_id', conversationIds)
    .eq('role', 'assistant')

  if (msgError) {
    console.error('Error fetching messages:', msgError)
    throw msgError
  }

  console.log(`Found ${messages?.length || 0} assistant messages\n`)

  // Calculate total characters
  let totalCharacters = 0
  const messageLengths: number[] = []

  for (const msg of messages || []) {
    const length = msg.content?.length || 0
    totalCharacters += length
    messageLengths.push(length)
  }

  // Estimate tokens (roughly 4 chars per token for English)
  const estimatedTokens = Math.ceil(totalCharacters / 4)

  // Calculate costs
  const costs = {
    elevenlabs: {
      creator: totalCharacters * PRICING.elevenlabs.creator,
      pro: totalCharacters * PRICING.elevenlabs.pro,
      scale: totalCharacters * PRICING.elevenlabs.scale,
      business: totalCharacters * PRICING.elevenlabs.business,
    },
    groq: totalCharacters * PRICING.groq.perCharacter,
    openai: {
      tts1: totalCharacters * PRICING.openai.tts1.perCharacter,
      tts1HD: totalCharacters * PRICING.openai.tts1HD.perCharacter,
    },
  }

  const result: AnalysisResult = {
    totalConversations: conversations.length,
    completedConversations: conversations.length,
    totalAssistantMessages: messages?.length || 0,
    totalCharacters,
    estimatedTokens,
    costs,
    averageCharsPerMessage: messages?.length ? totalCharacters / messages.length : 0,
    averageCharsPerConversation: totalCharacters / conversations.length,
  }

  return result
}

async function printReport(result: AnalysisResult) {
  console.log('=' .repeat(60))
  console.log('TTS COST ANALYSIS REPORT')
  console.log('=' .repeat(60))
  console.log()

  console.log('📊 CONVERSATION STATISTICS')
  console.log('-'.repeat(40))
  console.log(`Completed Conversations:     ${result.completedConversations}`)
  console.log(`Total Assistant Messages:    ${result.totalAssistantMessages}`)
  console.log(`Total Characters:            ${result.totalCharacters.toLocaleString()}`)
  console.log(`Estimated Tokens:            ${result.estimatedTokens.toLocaleString()}`)
  console.log(`Avg Chars per Message:       ${result.averageCharsPerMessage.toFixed(0)}`)
  console.log(`Avg Chars per Conversation:  ${result.averageCharsPerConversation.toFixed(0)}`)
  console.log()

  console.log('💰 COST ESTIMATES')
  console.log('-'.repeat(40))
  console.log()

  console.log('ElevenLabs (by plan tier):')
  console.log(`  Creator ($0.30/1k chars):       $${result.costs.elevenlabs.creator.toFixed(2)}`)
  console.log(`  Pro ($0.24/1k chars):           $${result.costs.elevenlabs.pro.toFixed(2)}`)
  console.log(`  Scale ($0.18/1k chars):         $${result.costs.elevenlabs.scale.toFixed(2)}`)
  console.log(`  Business ($0.12/1k chars):      $${result.costs.elevenlabs.business.toFixed(2)}`)
  console.log()

  console.log('Groq (PlayAI Dialog):')
  console.log(`  Standard ($50/1M chars):        $${result.costs.groq.toFixed(2)}`)
  console.log()

  console.log('OpenAI TTS:')
  console.log(`  tts-1 ($15/1M chars):           $${result.costs.openai.tts1.toFixed(2)}`)
  console.log(`  tts-1-hd ($30/1M chars):        $${result.costs.openai.tts1HD.toFixed(2)}`)
  console.log()

  console.log('📈 COST COMPARISON (cheapest to most expensive)')
  console.log('-'.repeat(40))

  const allCosts = [
    { name: 'OpenAI tts-1', cost: result.costs.openai.tts1 },
    { name: 'OpenAI tts-1-hd', cost: result.costs.openai.tts1HD },
    { name: 'Groq (PlayAI Dialog)', cost: result.costs.groq },
    { name: '11Labs Business', cost: result.costs.elevenlabs.business },
    { name: '11Labs Scale', cost: result.costs.elevenlabs.scale },
    { name: '11Labs Pro', cost: result.costs.elevenlabs.pro },
    { name: '11Labs Creator', cost: result.costs.elevenlabs.creator },
  ].sort((a, b) => a.cost - b.cost)

  const cheapest = allCosts[0].cost
  for (const item of allCosts) {
    const multiplier = cheapest > 0 ? (item.cost / cheapest).toFixed(1) : '1.0'
    console.log(`  ${item.name.padEnd(25)} $${item.cost.toFixed(2).padStart(8)}  (${multiplier}x)`)
  }

  console.log()
  console.log('=' .repeat(60))
}

async function main() {
  try {
    const result = await analyzeConversations()
    await printReport(result)
  } catch (error) {
    console.error('Analysis failed:', error)
    process.exit(1)
  }
}

main()
