import { defineVitestConfig } from '@nuxt/test-utils/config'
import { resolve } from 'path'

export default defineVitestConfig({
  resolve: {
    alias: {
      // Map the #supabase/server virtual module to a stub file so it can be resolved
      // in unit tests. Tests use vi.mock('#supabase/server', factory) to override.
      '#supabase/server': resolve(__dirname, 'tests/__mocks__/supabase-server.ts'),
    },
  },
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
