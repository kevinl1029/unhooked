import { defineVitestConfig } from '@nuxt/test-utils/config'

export default defineVitestConfig({
  test: {
    environment: 'nuxt',
    environmentOptions: {
      nuxt: {
        domEnvironment: 'happy-dom',
        mock: {
          intersectionObserver: true,
          indexedDb: true,
        },
        dotenv: {
          fileName: '.env.test',
        },
      },
    },
    include: ['tests/unit/**/*.{test,spec}.{js,ts}'],
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['components/**/*.vue', 'composables/**/*.ts', 'server/**/*.ts'],
      exclude: ['node_modules', '.nuxt', 'tests'],
    },
  },
})
