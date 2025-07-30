import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  test: {
    globals: true,
    environment: 'jsdom',
    include: [
      'tests/**/*.{test,spec}.{js,ts}',
      'website/src/**/*.{test,spec}.{js,ts}',
      'package/src/**/*.{test,spec}.{ts}'
    ],
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.d.ts',
        '**/*.config.{js,ts}',
        'tests/e2e/**'
      ]
    },
    transformMode: {
      web: [/\.[jt]sx?$/]
    }
  },
  esbuild: {
    target: 'node14'
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'website/src'),
      '@package': resolve(__dirname, 'package/src'),
      '@scripts': resolve(__dirname, 'scripts'),
      '@assets': resolve(__dirname, 'assets')
    }
  }
})