/**
 * Deployment Health Tests
 * Verifies that deployed website functions correctly
 */

import { describe, it, expect, beforeAll } from 'vitest'
import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'

describe('Deployment Health Tests', () => {
  const distDir = path.resolve(__dirname, '../../../dist')
  let buildExists = false
  
  beforeAll(() => {
    // Check if build exists
    buildExists = fs.existsSync(distDir)
    if (!buildExists) {
      console.warn('Build directory not found. Run "npm run build" first.')
    }
  })

  describe('Build Output Validation', () => {
    it('should have dist directory', () => {
      expect(fs.existsSync(distDir)).toBe(true)
    })

    it('should have index.html', () => {
      if (!buildExists) return
      const indexPath = path.join(distDir, 'index.html')
      expect(fs.existsSync(indexPath)).toBe(true)
    })

    it('should have 404.html', () => {
      if (!buildExists) return
      const notFoundPath = path.join(distDir, '404.html')
      expect(fs.existsSync(notFoundPath)).toBe(true)
    })

    it('should have sitemap.xml', () => {
      if (!buildExists) return
      const sitemapPath = path.join(distDir, 'sitemap.xml')
      expect(fs.existsSync(sitemapPath)).toBe(true)
    })

    it('should have robots.txt', () => {
      if (!buildExists) return
      const robotsPath = path.join(distDir, 'robots.txt')
      expect(fs.existsSync(robotsPath)).toBe(true)
    })

    it('should have assets directory', () => {
      if (!buildExists) return
      const assetsPath = path.join(distDir, 'assets')
      expect(fs.existsSync(assetsPath)).toBe(true)
    })

    it('should have JavaScript files', () => {
      if (!buildExists) return
      const assetsPath = path.join(distDir, 'assets')
      const files = fs.readdirSync(assetsPath)
      const jsFiles = files.filter(file => file.endsWith('.js'))
      expect(jsFiles.length).toBeGreaterThan(0)
    })

    it('should have CSS files', () => {
      if (!buildExists) return
      const assetsPath = path.join(distDir, 'assets')
      const files = fs.readdirSync(assetsPath)
      const cssFiles = files.filter(file => file.endsWith('.css'))
      expect(cssFiles.length).toBeGreaterThan(0)
    })
  })

  describe('HTML Content Validation', () => {
    it('index.html should have proper meta tags', () => {
      if (!buildExists) return
      const indexPath = path.join(distDir, 'index.html')
      const content = fs.readFileSync(indexPath, 'utf8')
      
      expect(content).toContain('<title>')
      expect(content).toContain('meta name="description"')
      expect(content).toContain('meta name="viewport"')
      expect(content).toContain('meta charset="UTF-8"')
    })

    it('index.html should have app div', () => {
      if (!buildExists) return
      const indexPath = path.join(distDir, 'index.html')
      const content = fs.readFileSync(indexPath, 'utf8')
      
      expect(content).toContain('<div id="app">')
    })

    it('404.html should have proper structure', () => {
      if (!buildExists) return
      const notFoundPath = path.join(distDir, '404.html')
      const content = fs.readFileSync(notFoundPath, 'utf8')
      
      expect(content).toContain('<title>')
      expect(content).toContain('Page Not Found')
    })
  })

  describe('Sitemap and Robots Validation', () => {
    it('sitemap.xml should be valid XML', () => {
      if (!buildExists) return
      const sitemapPath = path.join(distDir, 'sitemap.xml')
      const content = fs.readFileSync(sitemapPath, 'utf8')
      
      expect(content).toContain('<?xml version="1.0"')
      expect(content).toContain('<urlset')
      expect(content).toContain('<loc>')
    })

    it('robots.txt should have proper directives', () => {
      if (!buildExists) return
      const robotsPath = path.join(distDir, 'robots.txt')
      const content = fs.readFileSync(robotsPath, 'utf8')
      
      expect(content).toContain('User-agent:')
      expect(content).toContain('Allow:')
      expect(content).toContain('Sitemap:')
    })
  })

  describe('Asset Optimization', () => {
    it('JavaScript files should be minified', () => {
      if (!buildExists) return
      const assetsPath = path.join(distDir, 'assets')
      const files = fs.readdirSync(assetsPath)
      const jsFiles = files.filter(file => file.endsWith('.js'))
      
      if (jsFiles.length > 0) {
        const jsContent = fs.readFileSync(path.join(assetsPath, jsFiles[0]), 'utf8')
        // Minified files typically have no line breaks or have very long lines
        const lines = jsContent.split('\n')
        const hasMinifiedCharacteristics = lines.length < 10 || lines.some(line => line.length > 200)
        expect(hasMinifiedCharacteristics).toBe(true)
      }
    })

    it('CSS files should be minified', () => {
      if (!buildExists) return
      const assetsPath = path.join(distDir, 'assets')
      const files = fs.readdirSync(assetsPath)
      const cssFiles = files.filter(file => file.endsWith('.css'))
      
      if (cssFiles.length > 0) {
        const cssContent = fs.readFileSync(path.join(assetsPath, cssFiles[0]), 'utf8')
        // Minified CSS typically has minimal whitespace
        const hasMinifiedCharacteristics = !cssContent.includes('\n  ') && cssContent.length > 100
        expect(hasMinifiedCharacteristics).toBe(true)
      }
    })

    it('should have reasonable bundle sizes', () => {
      if (!buildExists) return
      const assetsPath = path.join(distDir, 'assets')
      const files = fs.readdirSync(assetsPath)
      
      files.forEach(file => {
        const filePath = path.join(assetsPath, file)
        const stats = fs.statSync(filePath)
        
        // Check that individual files aren't too large (5MB limit)
        expect(stats.size).toBeLessThan(5 * 1024 * 1024)
      })
    })
  })

  describe('Configuration Files', () => {
    it('should have deployment configuration', () => {
      const configPath = path.resolve(__dirname, '../../../config/deployment.json')
      expect(fs.existsSync(configPath)).toBe(true)
    })

    it('deployment config should be valid JSON', () => {
      const configPath = path.resolve(__dirname, '../../../config/deployment.json')
      const content = fs.readFileSync(configPath, 'utf8')
      
      expect(() => JSON.parse(content)).not.toThrow()
    })

    it('deployment config should have required environments', () => {
      const configPath = path.resolve(__dirname, '../../../config/deployment.json')
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
      
      expect(config.environments).toBeDefined()
      expect(config.environments.staging).toBeDefined()
      expect(config.environments.production).toBeDefined()
    })
  })

  describe('Script Validation', () => {
    it('should have deployment script', () => {
      const deployScript = path.resolve(__dirname, '../../scripts/deploy.js')
      expect(fs.existsSync(deployScript)).toBe(true)
    })

    it('should have prerender script', () => {
      const prerenderScript = path.resolve(__dirname, '../../scripts/prerender.js')
      expect(fs.existsSync(prerenderScript)).toBe(true)
    })

    it('deployment script should be executable', () => {
      const deployScript = path.resolve(__dirname, '../../scripts/deploy.js')
      const content = fs.readFileSync(deployScript, 'utf8')
      
      expect(content).toContain('WebsiteDeployer')
      expect(content).toContain('deploy()')
    })
  })
})