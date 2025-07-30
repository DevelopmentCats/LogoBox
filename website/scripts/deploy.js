/**
 * Website Deployment Script
 * Deploys the built website to CDN with optimized caching and invalidation
 */

import { execSync } from 'child_process'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { logoBoxConfig } from '../../../config/index.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const websiteDir = path.resolve(__dirname, '..')
const distDir = path.resolve(websiteDir, 'dist')

/**
 * Website deployment configuration
 */
const DEPLOY_CONFIG = {
  // Cache control headers for different asset types
  HTML_CACHE_CONTROL: 'public, max-age=0, s-maxage=31536000, must-revalidate',
  JS_CSS_CACHE_CONTROL: 'public, max-age=31536000, immutable',
  ASSET_CACHE_CONTROL: 'public, max-age=31536000, immutable',
  
  // Content types
  HTML_CONTENT_TYPE: 'text/html',
  JS_CONTENT_TYPE: 'application/javascript',
  CSS_CONTENT_TYPE: 'text/css',
  JSON_CONTENT_TYPE: 'application/json',
  SVG_CONTENT_TYPE: 'image/svg+xml',
  PNG_CONTENT_TYPE: 'image/png',
  ICO_CONTENT_TYPE: 'image/x-icon',
  
  // AWS settings
  MAX_RETRIES: 3,
  RETRY_DELAY: 2000
}

/**
 * Website Deployer class
 */
class WebsiteDeployer {
  constructor(options = {}) {
    this.options = {
      distDir: options.distDir || distDir,
      bucket: options.bucket || process.env.WEBSITE_BUCKET || logoBoxConfig.cdn.bucket,
      region: options.region || logoBoxConfig.cdn.region,
      cloudFrontDistributionId: options.cloudFrontDistributionId || process.env.WEBSITE_DISTRIBUTION_ID || logoBoxConfig.cdn.distributionId,
      dryRun: options.dryRun || false,
      skipBuild: options.skipBuild || false,
      skipInvalidation: options.skipInvalidation || false,
      awsProfile: options.awsProfile || logoBoxConfig.cdn.awsProfile,
      ...options
    }
    
    this.validateConfig()
  }
  
  /**
   * Validates deployment configuration
   */
  validateConfig() {
    if (!this.options.bucket) {
      throw new Error('Website S3 bucket not configured. Set WEBSITE_BUCKET environment variable.')
    }
    
    // Skip AWS validation in test environment
    if (process.env.NODE_ENV === 'test' || process.env.VITEST) {
      return
    }
    
    try {
      execSync('aws --version', { stdio: 'ignore' })
    } catch (error) {
      throw new Error('AWS CLI is not installed or not available in PATH')
    }
  }
  
  /**
   * Builds the website if not skipped
   */
  async buildWebsite() {
    if (this.options.skipBuild) {
      console.log('Skipping build step')
      return
    }
    
    console.log('Building website...')
    
    try {
      // Run pre-build optimizations
      execSync('npm run build', { 
        cwd: websiteDir, 
        stdio: 'inherit',
        env: { ...process.env, NODE_ENV: 'production' }
      })
      
      // Run pre-rendering for SEO
      console.log('Pre-rendering pages for SEO...')
      execSync('node scripts/prerender.js', { 
        cwd: websiteDir, 
        stdio: 'inherit' 
      })
      
      console.log('✓ Website built successfully')
      
    } catch (error) {
      console.error('Build failed:', error.message)
      throw error
    }
  }
  
  /**
   * Gets content type and cache control for file
   */
  getFileMetadata(filePath) {
    const ext = path.extname(filePath).toLowerCase()
    
    switch (ext) {
      case '.html':
        return {
          contentType: DEPLOY_CONFIG.HTML_CONTENT_TYPE,
          cacheControl: DEPLOY_CONFIG.HTML_CACHE_CONTROL
        }
      case '.js':
      case '.mjs':
        return {
          contentType: DEPLOY_CONFIG.JS_CONTENT_TYPE,
          cacheControl: DEPLOY_CONFIG.JS_CSS_CACHE_CONTROL
        }
      case '.css':
        return {
          contentType: DEPLOY_CONFIG.CSS_CONTENT_TYPE,
          cacheControl: DEPLOY_CONFIG.JS_CSS_CACHE_CONTROL
        }
      case '.json':
        return {
          contentType: DEPLOY_CONFIG.JSON_CONTENT_TYPE,
          cacheControl: DEPLOY_CONFIG.ASSET_CACHE_CONTROL
        }
      case '.svg':
        return {
          contentType: DEPLOY_CONFIG.SVG_CONTENT_TYPE,
          cacheControl: DEPLOY_CONFIG.ASSET_CACHE_CONTROL
        }
      case '.png':
      case '.jpg':
      case '.jpeg':
        return {
          contentType: DEPLOY_CONFIG.PNG_CONTENT_TYPE,
          cacheControl: DEPLOY_CONFIG.ASSET_CACHE_CONTROL
        }
      case '.ico':
        return {
          contentType: DEPLOY_CONFIG.ICO_CONTENT_TYPE,
          cacheControl: DEPLOY_CONFIG.ASSET_CACHE_CONTROL
        }
      default:
        return {
          contentType: 'application/octet-stream',
          cacheControl: DEPLOY_CONFIG.ASSET_CACHE_CONTROL
        }
    }
  }
  
  /**
   * Syncs website files to S3
   */
  async syncWebsite() {
    console.log('Synchronizing website files...')
    
    const command = [
      'aws s3 sync',
      `"${this.options.distDir}/"`,
      `s3://${this.options.bucket}/`,
      '--delete',
      '--metadata-directive REPLACE',
      '--exclude "*.map"', // Exclude source maps
      '--exclude ".DS_Store"', // Exclude system files
      `--region ${this.options.region}`
    ].join(' ')
    
    if (this.options.dryRun) {
      console.log(`[DRY RUN] ${command}`)
      return { success: true, filesUploaded: 0, filesDeleted: 0 }
    }
    
    try {
      const output = execSync(command, { encoding: 'utf8' })
      
      // Parse sync output
      const uploadMatches = output.match(/upload:/g) || []
      const deleteMatches = output.match(/delete:/g) || []
      
      console.log(`✓ Website synchronized successfully`)
      console.log(`  Uploaded: ${uploadMatches.length} files`)
      console.log(`  Deleted: ${deleteMatches.length} files`)
      
      return {
        success: true,
        filesUploaded: uploadMatches.length,
        filesDeleted: deleteMatches.length,
        output
      }
      
    } catch (error) {
      console.error(`Website sync failed: ${error.message}`)
      throw error
    }
  }
  
  /**
   * Sets proper cache headers for specific file types
   */
  async setCacheHeaders() {
    console.log('Setting optimized cache headers...')
    
    const fileTypes = [
      { pattern: '*.html', cacheControl: DEPLOY_CONFIG.HTML_CACHE_CONTROL, contentType: DEPLOY_CONFIG.HTML_CONTENT_TYPE },
      { pattern: '*.js', cacheControl: DEPLOY_CONFIG.JS_CSS_CACHE_CONTROL, contentType: DEPLOY_CONFIG.JS_CONTENT_TYPE },
      { pattern: '*.css', cacheControl: DEPLOY_CONFIG.JS_CSS_CACHE_CONTROL, contentType: DEPLOY_CONFIG.CSS_CONTENT_TYPE },
      { pattern: '*.json', cacheControl: DEPLOY_CONFIG.ASSET_CACHE_CONTROL, contentType: DEPLOY_CONFIG.JSON_CONTENT_TYPE },
      { pattern: '*.svg', cacheControl: DEPLOY_CONFIG.ASSET_CACHE_CONTROL, contentType: DEPLOY_CONFIG.SVG_CONTENT_TYPE },
      { pattern: '*.png', cacheControl: DEPLOY_CONFIG.ASSET_CACHE_CONTROL, contentType: DEPLOY_CONFIG.PNG_CONTENT_TYPE },
      { pattern: '*.ico', cacheControl: DEPLOY_CONFIG.ASSET_CACHE_CONTROL, contentType: DEPLOY_CONFIG.ICO_CONTENT_TYPE }
    ]
    
    for (const fileType of fileTypes) {
      const command = [
        'aws s3 cp',
        `s3://${this.options.bucket}/`,
        `s3://${this.options.bucket}/`,
        '--recursive',
        `--exclude "*"`,
        `--include "${fileType.pattern}"`,
        `--cache-control "${fileType.cacheControl}"`,
        `--content-type "${fileType.contentType}"`,
        '--metadata-directive REPLACE',
        `--region ${this.options.region}`
      ].join(' ')
      
      if (this.options.dryRun) {
        console.log(`[DRY RUN] ${command}`)
        continue
      }
      
      try {
        execSync(command, { stdio: 'ignore' })
        console.log(`✓ Set cache headers for ${fileType.pattern}`)
      } catch (error) {
        console.warn(`Failed to set cache headers for ${fileType.pattern}: ${error.message}`)
      }
    }
  }
  
  /**
   * Invalidates CloudFront cache for website
   */
  async invalidateCache() {
    if (!this.options.cloudFrontDistributionId) {
      console.log('No CloudFront distribution ID provided, skipping cache invalidation')
      return null
    }
    
    if (this.options.skipInvalidation) {
      console.log('Cache invalidation skipped')
      return null
    }
    
    console.log('Invalidating CloudFront cache...')
    
    // Invalidate key paths for website
    const paths = ['/', '/index.html', '/404.html', '/search/*', '/categories/*', '/logos/*']
    const pathsString = paths.map(p => `"${p}"`).join(' ')
    
    const command = [
      'aws cloudfront create-invalidation',
      `--distribution-id ${this.options.cloudFrontDistributionId}`,
      `--paths ${pathsString}`,
      `--region ${this.options.region}`
    ].join(' ')
    
    if (this.options.dryRun) {
      console.log(`[DRY RUN] ${command}`)
      return 'dry-run-invalidation-id'
    }
    
    try {
      const output = execSync(command, { encoding: 'utf8' })
      const result = JSON.parse(output)
      const invalidationId = result.Invalidation.Id
      
      console.log(`✓ CloudFront invalidation created: ${invalidationId}`)
      console.log(`Invalidated paths: ${paths.join(', ')}`)
      
      return invalidationId
      
    } catch (error) {
      console.error(`Failed to create CloudFront invalidation: ${error.message}`)
      throw error
    }
  }
  
  /**
   * Performs complete website deployment
   */
  async deploy() {
    const startTime = Date.now()
    console.log('🚀 Starting website deployment...')
    
    if (this.options.dryRun) {
      console.log('⚠️  DRY RUN MODE - No actual changes will be made')
    }
    
    try {
      // Step 1: Build website
      await this.buildWebsite()
      
      // Step 2: Check if dist directory exists
      try {
        await fs.access(this.options.distDir)
      } catch (error) {
        throw new Error(`Build output directory not found: ${this.options.distDir}`)
      }
      
      // Step 3: Sync website files
      const syncResults = await this.syncWebsite()
      
      // Step 4: Set optimized cache headers
      await this.setCacheHeaders()
      
      // Step 5: Invalidate CloudFront cache
      const invalidationId = await this.invalidateCache()
      
      const deploymentTime = Date.now() - startTime
      
      const results = {
        success: true,
        deploymentTime,
        bucket: this.options.bucket,
        region: this.options.region,
        syncResults,
        invalidationId,
        dryRun: this.options.dryRun
      }
      
      console.log('\n🎉 Website deployment completed successfully!')
      console.log(`⏱️  Total time: ${deploymentTime}ms`)
      console.log(`📦 Bucket: ${this.options.bucket}`)
      console.log(`🌍 Region: ${this.options.region}`)
      
      if (invalidationId) {
        console.log(`🔄 Invalidation: ${invalidationId}`)
      }
      
      return results
      
    } catch (error) {
      console.error(`\n❌ Website deployment failed: ${error.message}`)
      throw error
    }
  }
  
  /**
   * Generates deployment summary
   */
  generateSummary(results) {
    const lines = [
      '## Website Deployment Summary',
      '',
      `**Status:** ${results.success ? '✅ Success' : '❌ Failed'}`,
      `**Bucket:** ${results.bucket}`,
      `**Region:** ${results.region}`,
      `**Duration:** ${results.deploymentTime}ms`,
      ''
    ]
    
    if (results.syncResults) {
      lines.push('**File Sync:**')
      lines.push(`- Uploaded: ${results.syncResults.filesUploaded} files`)
      lines.push(`- Deleted: ${results.syncResults.filesDeleted} files`)
      lines.push('')
    }
    
    if (results.invalidationId) {
      lines.push(`**Cache Invalidation:** ${results.invalidationId}`)
      lines.push('')
    }
    
    if (results.dryRun) {
      lines.push('*Note: This was a dry run - no actual changes were made*')
      lines.push('')
    }
    
    lines.push(`**Timestamp:** ${new Date().toISOString()}`)
    
    return lines.join('\n')
  }
}

export { WebsiteDeployer, DEPLOY_CONFIG }

// CLI usage when run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2)
  const options = {}
  
  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    switch (arg) {
      case '--bucket':
        options.bucket = args[++i]
        break
      case '--region':
        options.region = args[++i]
        break
      case '--distribution-id':
        options.cloudFrontDistributionId = args[++i]
        break
      case '--skip-build':
        options.skipBuild = true
        break
      case '--dry-run':
        options.dryRun = true
        break
      case '--skip-invalidation':
        options.skipInvalidation = true
        break
    }
  }
  
  const deployer = new WebsiteDeployer(options)
  
  try {
    const results = await deployer.deploy()
    console.log('\n' + deployer.generateSummary(results))
    process.exit(0)
  } catch (error) {
    console.error(`Deployment failed: ${error.message}`)
    process.exit(1)
  }
}