import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'test/',
        '**/*.test.ts',
        '**/*.spec.ts',
        'dist/',
        'packages/*/dist/',
        'packages/*/src/vite.config.ts'
      ]
    },
    include: ['**/*.test.ts'],
    exclude: ['node_modules/', 'dist/'],
    outputFile: {
      json: './test-results/results.json'
    }
  },
  resolve: {
    alias: {
      '@error-monitor/core': resolve(__dirname, 'packages/core/src'),
      '@error-monitor/web': resolve(__dirname, 'packages/web/src')
    }
  }
})
