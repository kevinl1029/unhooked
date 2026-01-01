import defaultTheme from 'tailwindcss/defaultTheme'

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './components/**/*.{vue,js,ts}',
    './layouts/**/*.vue',
    './pages/**/*.vue',
    './app.vue'
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', ...defaultTheme.fontFamily.sans],
      },
      colors: {
        brand: {
          // Background gradient endpoints
          'bg-light': '#104e54',
          'bg-dark': '#041f21',

          // Primary accent (orange)
          'accent': '#fc4a1a',
          'accent-light': '#f7b733',

          // Glass/card backgrounds
          'glass': 'rgba(13, 92, 99, 0.35)',
          'glass-input': 'rgba(31, 108, 117, 0.5)',

          // Borders
          'border': 'rgba(255, 255, 255, 0.1)',
          'border-strong': 'rgba(255, 255, 255, 0.4)',
        },
        // Text opacity variants
        'white-85': 'rgba(255, 255, 255, 0.85)',
        'white-65': 'rgba(255, 255, 255, 0.65)',
      },
      borderRadius: {
        'card': '24px',
        'pill': '9999px',
      },
      boxShadow: {
        'card': '0 24px 64px rgba(0, 0, 0, 0.25)',
      },
      letterSpacing: {
        'eyebrow': '0.35em',
      },
      fontSize: {
        'eyebrow': ['0.55rem', { lineHeight: '1.2' }],
        'hero': ['2.75rem', { lineHeight: '1.1' }],
        'hero-mobile': ['1.9rem', { lineHeight: '1.2' }],
      },
    },
  },
  plugins: [],
}

