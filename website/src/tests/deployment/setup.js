/**
 * Deployment Tests Setup
 * Global setup and utilities for deployment testing
 */

import { beforeAll, afterAll } from 'vitest'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Global test configuration
global.TEST_CONFIG = {
  websiteDir: path.resolve(__dirname, '../../..'),
  distDir: path.resolve(__dirname, '../../../dist'),
  scriptsDir: path.resolve(__dirname, '../../../scripts'),
  configDir: path.resolve(__dirname, '../../../../config'),
  timeout: 60000
}

// Mock AWS SDK functions for testing
global.mockAWSOperations = {
  s3Sync: jest.fn(),
  cloudFrontInvalidate: jest.fn(),
  getBucketLocation: jest.fn()
}

// Test utilities
global.testUtils = {
  /**
   * Creates a temporary test directory
   */
  createTempDir: (suffix = '') => {
    const tempDir = path.join('/tmp', `logobox-test-${Date.now()}${suffix}`)
    fs.mkdirSync(tempDir, { recursive: true })
    return tempDir
  },

  /**
   * Cleans up temporary directories
   */
  cleanupTempDir: (dirPath) => {
    if (fs.existsSync(dirPath)) {
      fs.rmSync(dirPath, { recursive: true, force: true })
    }
  },

  /**
   * Creates mock build output for testing
   */
  createMockBuildOutput: (distDir) => {
    const files = [
      'index.html',
      '404.html',
      'sitemap.xml',
      'robots.txt',
      'assets/app-12345.js',
      'assets/app-12345.css',
      'assets/logo-67890.svg'
    ]

    files.forEach(file => {
      const filePath = path.join(distDir, file)
      const dir = path.dirname(filePath)
      
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
      
      let content = `/* Mock ${file} */`
      
      if (file.endsWith('.html')) {
        content = `<!DOCTYPE html>
<html>
<head>
  <title>Test ${file}</title>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="Test page">
</head>
<body>
  <div id="app">Mock content for ${file}</div>
</body>
</html>`
      } else if (file.endsWith('.xml')) {
        content = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://test.logobox.com/</loc>
    <lastmod>2024-01-01</lastmod>
  </url>
</urlset>`
      } else if (file === 'robots.txt') {
        content = `User-agent: *
Allow: /
Sitemap: https://test.logobox.com/sitemap.xml`
      } else if (file.endsWith('.svg')) {
        content = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <circle cx="50" cy="50" r="40" fill="blue"/>
</svg>`
      }
      
      fs.writeFileSync(filePath, content)
    })
    
    return files
  },

  /**
   * Validates deployment configuration
   */
  validateDeploymentConfig: (config) => {
    const required = ['bucket', 'region']
    const missing = required.filter(key => !config[key])
    
    if (missing.length > 0) {
      throw new Error(`Missing required config: ${missing.join(', ')}`)
    }
    
    return true
  },

  /**
   * Simulates AWS CLI command execution
   */
  mockAWSCommand: (command, options = {}) => {
    console.log(`[MOCK AWS] ${command}`)
    
    if (command.includes('s3 sync')) {
      return { stdout: 'upload: file1.html\nupload: file2.js\n' }
    } else if (command.includes('cloudfront create-invalidation')) {
      return { 
        stdout: JSON.stringify({
          Invalidation: { Id: 'I1234567890ABC' }
        })
      }
    } else if (command.includes('s3 ls')) {
      return { stdout: '2024-01-01 12:00:00       1024 test-file.html\n' }
    }
    
    return { stdout: '', stderr: '' }
  }
}

// Environment setup
beforeAll(() => {
  console.log('Setting up deployment test environment...')
  
  // Ensure test directories exist
  const testDirs = [
    path.join(global.TEST_CONFIG.websiteDir, 'test-results'),
    path.join(global.TEST_CONFIG.websiteDir, 'coverage', 'deployment')
  ]
  
  testDirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
  })
  
  // Set up environment variables for testing
  process.env.NODE_ENV = 'test'
  process.env.VITEST = 'true'
  
  console.log('Deployment test environment ready')
})

// Cleanup after all tests
afterAll(() => {
  console.log('Cleaning up deployment test environment...')
  
  // Clean up any temporary files created during testing
  const tempPattern = /^logobox-test-\d+/
  const tempDir = '/tmp'
  
  if (fs.existsSync(tempDir)) {
    const files = fs.readdirSync(tempDir)
    files.forEach(file => {
      if (tempPattern.test(file)) {
        const filePath = path.join(tempDir, file)
        try {
          fs.rmSync(filePath, { recursive: true, force: true })
        } catch (error) {
          console.warn(`Failed to cleanup temp file ${filePath}:`, error.message)
        }
      }
    })
  }
  
  console.log('Deployment test cleanup complete')
})

// Export utilities for use in tests
export { testUtils }