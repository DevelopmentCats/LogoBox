import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 30000, // Longer timeout for package installation tests
    hookTimeout: 30000,
    teardownTimeout: 30000,
    include: [
      'src/**/*.test.ts',
      'tests/**/*.test.{js,ts}',
      'tests/**/*.spec.{js,ts}'
    ],
    exclude: [
      'node_modules/**',
      'dist/**',
      '**/*.d.ts'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'dist/**',
        'scripts/**',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/*.config.ts'
      ]
    },
    reporters: ['verbose'],
    logHeapUsage: true
  },
  esbuild: {
    target: 'node16'
  }
});