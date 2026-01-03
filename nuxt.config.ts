export default defineNuxtConfig({
  devtools: { enabled: true },

  app: {
    head: {
      viewport: 'width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover',
      meta: [
        { name: 'mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' }
      ]
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
      exclude: ['/', '/login'],
    }
  },

  googleFonts: {
    families: {
      Inter: [400, 500, 600, 700],
    },
    display: 'swap',
  },

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    // Server-side only (not exposed to client)
    geminiApiKey: process.env.GEMINI_API_KEY,
    geminiModel: process.env.GEMINI_MODEL || 'gemini-3-flash-preview',
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    openaiApiKey: process.env.OPENAI_API_KEY,

    // TTS Provider Configuration
    ttsProvider: process.env.TTS_PROVIDER || 'openai', // 'openai' | 'elevenlabs'
    elevenlabsApiKey: process.env.ELEVENLABS_API_KEY,
    elevenlabsVoiceId: process.env.ELEVENLABS_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL', // Bella
    elevenlabsModel: process.env.ELEVENLABS_MODEL || 'eleven_flash_v2_5',
    openaiTtsVoice: process.env.OPENAI_TTS_VOICE || 'nova',

    supabaseUrl: process.env.SUPABASE_URL,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY,

    // Client-side (public)
    public: {
      appUrl: process.env.NUXT_PUBLIC_APP_URL || 'http://localhost:3000'
    }
  },

  compatibilityDate: '2024-11-01'
})
