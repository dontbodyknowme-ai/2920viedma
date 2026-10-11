import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.git/**'
    ],
    watch: false,
    testTimeout: 10000,
    hookTimeout: 10000,
    setupFiles: ['./tests/setup.ts']
  }
})