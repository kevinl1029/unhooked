// Determine analytics domain based on environment
function getAnalyticsDomain(): string | null {
  // Local development: no analytics
  if (process.env.NODE_ENV !== 'production') {
    return null
  }

  // Vercel provides VERCEL_ENV: 'production' | 'preview' | 'development'
  const vercelEnv = process.env.VERCEL_ENV

  if (vercelEnv === 'production') {
    return 'getunhooked.app'
  } else if (vercelEnv === 'preview') {
    return 'staging.getunhooked.app'
  }

  // Fallback for non-Vercel production builds
  return 'getunhooked.app'
}

const analyticsDomain = getAnalyticsDomain()

export default defineNuxtConfig({
  devtools: { enabled: true },

  app: {
    head: {
      viewport: 'width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover',
      meta: [
        { name: 'mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' }
      ],
      script: analyticsDomain
        ? [
            {
              src: 'https://plausible.io/js/script.js',
              defer: true,
              'data-domain': analyticsDomain,
            },
          ]
        : [],
    }
  },

  modules: [
    '@nuxtjs/tailwindcss',
    '@nuxtjs/google-fonts',
    '@nuxtjs/supabase'
  ],

  supabase: {
    redirectOptions: {
      login: '/login',
      callback: '/auth/callback',
      exclude: ['/', '/login', '/test-login', '/checkout/*', '/privacy', '/terms', '/listen'],
    }
  },

  googleFonts: {
    families: {
      Inter: {
        wght: [400, 500, 600, 700],
        ital: [400, 700],
      },
    },
    display: 'swap',
  },

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    // Server-side only (not exposed to client)
    // Default LLM Provider
    defaultLlmProvider: process.env.DEFAULT_LLM_PROVIDER || 'gemini',

    // Groq Configuration (Primary LLM Provider)
    groqApiKey: process.env.GROQ_API_KEY,
    groqModel: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',

    // Gemini Configuration (Fallback/Testing)
    geminiApiKey: process.env.GEMINI_API_KEY,
    geminiModel: process.env.GEMINI_MODEL || 'gemini-3-flash-preview',

    // Future Providers
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    openaiApiKey: process.env.OPENAI_API_KEY,

    // TTS Provider Configuration
    ttsProvider: process.env.TTS_PROVIDER || 'groq', // 'groq' | 'openai' | 'elevenlabs' | 'inworld'
    groqTtsVoice: process.env.GROQ_TTS_VOICE || 'troy', // 'troy' | 'hannah' | 'austin'
    elevenlabsApiKey: process.env.ELEVENLABS_API_KEY,
    elevenlabsVoiceId: process.env.ELEVENLABS_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL', // Bella
    elevenlabsModel: process.env.ELEVENLABS_MODEL || 'eleven_flash_v2_5',
    openaiTtsVoice: process.env.OPENAI_TTS_VOICE || 'nova',
    inworldApiKey: process.env.INWORLD_API_KEY,
    inworldVoiceId: process.env.INWORLD_VOICE_ID || 'Dennis',
    inworldModel: process.env.INWORLD_MODEL || 'inworld-tts-1', // 'inworld-tts-1' | 'inworld-tts-1-max'

    supabaseUrl: process.env.SUPABASE_URL,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY,

    // E2E Test credentials (only used in development)
    e2eTestEmail: process.env.E2E_TEST_EMAIL,
    e2eTestPassword: process.env.E2E_TEST_PASSWORD,

    // LLM Task Model Configuration (Phase 4A)
    // These can be overridden via environment variables
    llmTaskConversationModel: process.env.LLM_TASK_CONVERSATION_MODEL,
    llmTaskMomentDetectModel: process.env.LLM_TASK_MOMENT_DETECT_MODEL,
    llmTaskConvictionAssessModel: process.env.LLM_TASK_CONVICTION_ASSESS_MODEL,
    llmTaskCheckinPersonalizeModel: process.env.LLM_TASK_CHECKIN_PERSONALIZE_MODEL,
    llmTaskStorySummarizeModel: process.env.LLM_TASK_STORY_SUMMARIZE_MODEL,
    llmTaskCeremonyNarrativeModel: process.env.LLM_TASK_CEREMONY_NARRATIVE_MODEL,
    llmTaskCeremonySelectModel: process.env.LLM_TASK_CEREMONY_SELECT_MODEL,
    llmTaskKeyInsightSelectModel: process.env.LLM_TASK_KEY_INSIGHT_SELECT_MODEL,

    // Email Configuration (Phase 4B)
    resendApiKey: process.env.RESEND_API_KEY,
    resendAudienceId: process.env.RESEND_AUDIENCE_ID,
    sendEmails: process.env.SEND_EMAILS || 'true',

    // Stripe Configuration
    stripeSecretKey: process.env.STRIPE_SECRET_KEY,
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    stripePriceId: process.env.STRIPE_PRICE_ID,

    // Client-side (public)
    public: {
      appUrl: process.env.NUXT_PUBLIC_APP_URL || 'http://localhost:3000',
      stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
      // App mode: 'disabled' (waitlist only), 'validation' (checkout but no app), 'enabled' (full access)
      appMode: process.env.NUXT_PUBLIC_APP_MODE || 'enabled',
    }
  },

  compatibilityDate: '2024-11-01'
})
