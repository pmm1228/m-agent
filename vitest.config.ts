import { defineVitestConfig } from '@nuxt/test-utils/config'

export default defineVitestConfig({
  test: {
    globals: true,
    environment: 'nuxt',
    setupFiles: [],
    include: ['**/*.test.ts', '**/*.spec.ts'],
    exclude: ['node_modules', '.nuxt', 'dist', '.output'],
    coverage: {
      provider: 'v8',
      include: ['server/utils/**/*.ts'],
      exclude: ['server/utils/db.ts'],
      reporter: ['text', 'json', 'html']
    }
  },
  resolve: {
    alias: {
      '~/': './'
    }
  }
})