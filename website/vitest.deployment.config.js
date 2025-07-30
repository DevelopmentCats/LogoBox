/**
 * Vitest Configuration for Deployment Tests
 * Specialized configuration for testing deployment functionality
 */

import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    // Test environment setup
    environment: 'node',
    globals: true,
    
    // Test file patterns
    include: [
      'src/tests/deployment/**/*.test.js',
      'scripts/**/*.test.js'
    ],
    
    // Exclude patterns
    exclude: [
      'node_modules/**',
      'dist/**',
      'src/tests/unit/**',
      'src/tests/performance/**'
    ],
    
    // Test timeout for deployment operations
    testTimeout: 60000, // 60 seconds for deployment tests
    hookTimeout: 30000, // 30 seconds for setup/teardown
    
    // Test execution options
    threads: false, // Disable threads for deployment tests
    maxConcurrency: 1, // Run deployment tests sequentially
    
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage/deployment',
      include: [
        'scripts/**/*.js',
        'src/tests/deployment/**/*.js'
      ],
      exclude: [
        'node_modules/**',
        'dist/**',
        '**/*.test.js',
        '**/*.spec.js'
      ]
    },
    
    // Setup files
    setupFiles: [
      './src/tests/deployment/setup.js'
    ],
    
    // Environment variables for testing
    env: {
      NODE_ENV: 'test',
      VITEST: 'true',
      // Mock AWS credentials for testing
      AWS_ACCESS_KEY_ID: 'test-access-key',
      AWS_SECRET_ACCESS_KEY: 'test-secret-key',
      AWS_REGION: 'us-east-1',
      // Mock bucket names
      STAGING_WEBSITE_BUCKET: 'test-staging-bucket',
      PRODUCTION_WEBSITE_BUCKET: 'test-production-bucket',
      STAGING_DISTRIBUTION_ID: 'E1234567890ABC',
      PRODUCTION_DISTRIBUTION_ID: 'E0987654321DEF'
    },
    
    // Reporter configuration
    reporter: ['verbose', 'json'],
    outputFile: {
      json: './test-results/deployment-results.json'
    }
  },
  
  // Resolve configuration
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@config': resolve(__dirname, '../config'),
      '@scripts': resolve(__dirname, 'scripts')
    }
  },
  
  // Define global constants
  define: {
    __TEST_ENV__: true,
    __DEPLOYMENT_TEST__: true
  }
})