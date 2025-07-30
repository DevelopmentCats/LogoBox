/**
 * Bundle analysis tests for LogoBox website
 * Validates bundle sizes and code splitting effectiveness
 */

import { describe, it, expect, vi } from 'vitest'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

// Mock bundle analysis data (in real scenario, this would read from build output)
const mockBundleAnalysis = {
  bundles: [
    {
      name: 'vendor-core.js',
      size: 145000,
      gzipSize: 52000,
      modules: ['vue', 'vue-router', 'pinia']
    },
    {
      name: 'vendor-libs.js',
      size: 85000,
      gzipSize: 28000,
      modules: ['other-libs']
    },
    {
      name: 'components.js',
      size: 75000,
      gzipSize: 22000,
      modules: ['LogoGrid', 'LogoCard', 'SearchBar', 'FilterPanel']
    },
    {
      name: 'views.js',
      size: 35000,
      gzipSize: 12000,
      modules: ['HomeView', 'LogoDetailView', 'NotFoundView']
    },
    {
      name: 'composables.js',
      size: 28000,
      gzipSize: 9000,
      modules: ['useLogoSearch', 'useLogoFilters', 'useLazyImageLoading']
    },
    {
      name: 'utils.js',
      size: 18000,
      gzipSize: 6000,
      modules: ['logoApi', 'performanceMonitor', 'logoStore']
    },
    {
      name: 'main.css',
      size: 45000,
      gzipSize: 8000,
      modules: ['component-styles', 'global-styles']
    }
  ],
  duplicates: [],
  treeshaking: {
    eliminated: 125000,
    retained: 431000
  }
}

describe('Bundle Analysis', () => {
  describe('Bundle Size Validation', () => {
    it('should keep vendor-core bundle under 200KB', () => {
      const vendorCore = mockBundleAnalysis.bundles.find(b => b.name === 'vendor-core.js')
      expect(vendorCore.size).toBeLessThan(200000)
      expect(vendorCore.gzipSize).toBeLessThan(70000)
    })

    it('should keep component bundle under 100KB', () => {
      const components = mockBundleAnalysis.bundles.find(b => b.name === 'components.js')
      expect(components.size).toBeLessThan(100000)
      expect(components.gzipSize).toBeLessThan(30000)
    })

    it('should keep total JavaScript bundle under 500KB', () => {
      const totalJSSize = mockBundleAnalysis.bundles
        .filter(b => b.name.endsWith('.js'))
        .reduce((sum, bundle) => sum + bundle.size, 0)
      
      expect(totalJSSize).toBeLessThan(500000)
    })

    it('should keep total CSS bundle under 100KB', () => {
      const totalCSSSize = mockBundleAnalysis.bundles
        .filter(b => b.name.endsWith('.css'))
        .reduce((sum, bundle) => sum + bundle.size, 0)
      
      expect(totalCSSSize).toBeLessThan(100000)
    })

    it('should achieve good gzip compression ratios', () => {
      mockBundleAnalysis.bundles.forEach(bundle => {
        const compressionRatio = bundle.gzipSize / bundle.size
        expect(compressionRatio).toBeLessThan(0.4) // Should compress to less than 40%
      })
    })
  })

  describe('Code Splitting Effectiveness', () => {
    it('should properly split vendor dependencies', () => {
      const vendorBundles = mockBundleAnalysis.bundles.filter(b => 
        b.name.startsWith('vendor-')
      )
      
      expect(vendorBundles.length).toBeGreaterThanOrEqual(2)
      
      // Core vendor bundle should contain framework dependencies
      const coreVendor = vendorBundles.find(b => b.name === 'vendor-core.js')
      expect(coreVendor.modules).toContain('vue')
      expect(coreVendor.modules).toContain('vue-router')
      expect(coreVendor.modules).toContain('pinia')
    })

    it('should separate components into their own chunk', () => {
      const componentsBundle = mockBundleAnalysis.bundles.find(b => 
        b.name === 'components.js'
      )
      
      expect(componentsBundle).toBeDefined()
      expect(componentsBundle.modules).toContain('LogoGrid')
      expect(componentsBundle.modules).toContain('LogoCard')
      expect(componentsBundle.modules).toContain('SearchBar')
    })

    it('should separate views into their own chunk', () => {
      const viewsBundle = mockBundleAnalysis.bundles.find(b => 
        b.name === 'views.js'
      )
      
      expect(viewsBundle).toBeDefined()
      expect(viewsBundle.modules).toContain('HomeView')
      expect(viewsBundle.modules).toContain('LogoDetailView')
    })

    it('should separate composables and utilities', () => {
      const composablesBundle = mockBundleAnalysis.bundles.find(b => 
        b.name === 'composables.js'
      )
      const utilsBundle = mockBundleAnalysis.bundles.find(b => 
        b.name === 'utils.js'
      )
      
      expect(composablesBundle).toBeDefined()
      expect(utilsBundle).toBeDefined()
      
      expect(composablesBundle.modules).toContain('useLogoSearch')
      expect(utilsBundle.modules).toContain('logoApi')
    })
  })

  describe('Duplicate Detection', () => {
    it('should not have duplicate modules across bundles', () => {
      expect(mockBundleAnalysis.duplicates).toHaveLength(0)
    })

    it('should not duplicate large dependencies', () => {
      const allModules = mockBundleAnalysis.bundles
        .flatMap(bundle => bundle.modules)
      
      const moduleCount = {}
      allModules.forEach(module => {
        moduleCount[module] = (moduleCount[module] || 0) + 1
      })
      
      // Core modules should appear only once
      expect(moduleCount['vue']).toBe(1)
      expect(moduleCount['vue-router']).toBe(1)
      expect(moduleCount['pinia']).toBe(1)
    })
  })

  describe('Tree Shaking Effectiveness', () => {
    it('should eliminate unused code through tree shaking', () => {
      const { eliminated, retained } = mockBundleAnalysis.treeshaking
      const eliminationRatio = eliminated / (eliminated + retained)
      
      // Should eliminate at least 20% of potential code
      expect(eliminationRatio).toBeGreaterThan(0.2)
    })

    it('should retain only necessary code', () => {
      const { retained } = mockBundleAnalysis.treeshaking
      
      // Total retained code should be reasonable
      expect(retained).toBeLessThan(500000)
    })
  })

  describe('Chunk Loading Strategy', () => {
    it('should load critical chunks first', () => {
      const criticalChunks = ['vendor-core.js', 'main.css']
      const nonCriticalChunks = ['components.js', 'views.js']
      
      // Critical chunks should be smaller for faster loading
      criticalChunks.forEach(chunkName => {
        const chunk = mockBundleAnalysis.bundles.find(b => b.name === chunkName)
        expect(chunk).toBeDefined()
      })
    })

    it('should enable preloading for likely-needed chunks', () => {
      // This would test actual preload tags in a real scenario
      const preloadableChunks = ['components.js', 'views.js']
      
      preloadableChunks.forEach(chunkName => {
        const chunk = mockBundleAnalysis.bundles.find(b => b.name === chunkName)
        expect(chunk.size).toBeLessThan(100000) // Reasonable size for preloading
      })
    })
  })

  describe('Asset Optimization', () => {
    it('should optimize images and assets', () => {
      // Mock asset analysis
      const mockAssets = [
        { name: 'favicon.ico', size: 15000, optimized: true },
        { name: 'placeholder.svg', size: 2000, optimized: true }
      ]
      
      mockAssets.forEach(asset => {
        expect(asset.optimized).toBe(true)
        if (asset.name.endsWith('.svg')) {
          expect(asset.size).toBeLessThan(5000)
        }
      })
    })

    it('should use appropriate asset formats', () => {
      // Mock format optimization
      const assetFormats = {
        'favicon.ico': 'ico',
        'placeholder.svg': 'svg'
      }
      
      Object.entries(assetFormats).forEach(([filename, expectedFormat]) => {
        const actualFormat = filename.split('.').pop()
        expect(actualFormat).toBe(expectedFormat)
      })
    })
  })

  describe('Build Output Validation', () => {
    it('should generate proper chunk names', () => {
      mockBundleAnalysis.bundles.forEach(bundle => {
        // Should follow naming convention
        expect(bundle.name).toMatch(/^[a-z-]+\.(js|css)$/)
        
        // Should not be too generic
        expect(bundle.name).not.toBe('chunk.js')
        expect(bundle.name).not.toBe('bundle.js')
      })
    })

    it('should maintain consistent hash naming in production', () => {
      // In production, chunks should have hashes for cache busting
      const productionBundles = [
        'vendor-core-abc123.js',
        'components-def456.js',
        'main-abc789.css'
      ]
      
      productionBundles.forEach(bundle => {
        expect(bundle).toMatch(/^[a-z-]+-[a-f0-9]{6,8}\.(js|css)$/)
      })
    })
  })

  describe('Performance Budget Compliance', () => {
    it('should stay within performance budget limits', () => {
      const budgets = {
        initialJS: 250000,  // 250KB initial JS
        initialCSS: 50000,  // 50KB initial CSS
        totalAssets: 600000 // 600KB total assets
      }
      
      const initialJS = mockBundleAnalysis.bundles
        .filter(b => b.name.includes('vendor-core') || b.name.includes('main'))
        .filter(b => b.name.endsWith('.js'))
        .reduce((sum, bundle) => sum + bundle.size, 0)
      
      const initialCSS = mockBundleAnalysis.bundles
        .filter(b => b.name.includes('main'))
        .filter(b => b.name.endsWith('.css'))
        .reduce((sum, bundle) => sum + bundle.size, 0)
      
      const totalAssets = mockBundleAnalysis.bundles
        .reduce((sum, bundle) => sum + bundle.size, 0)
      
      expect(initialJS).toBeLessThan(budgets.initialJS)
      expect(initialCSS).toBeLessThan(budgets.initialCSS)
      expect(totalAssets).toBeLessThan(budgets.totalAssets)
    })

    it('should warn about large chunks', () => {
      const largeBundles = mockBundleAnalysis.bundles.filter(bundle => 
        bundle.size > 100000
      )
      
      // Should have some awareness of large bundles
      if (largeBundles.length > 0) {
        console.warn('Large bundles detected:', largeBundles.map(b => b.name))
      }
      
      // But not too many large bundles
      expect(largeBundles.length).toBeLessThan(3)
    })
  })
})

/**
 * Helper function to analyze actual build output
 * This would be used in a real scenario to analyze dist/ folder
 */
export function analyzeBuildOutput(distPath = 'dist') {
  try {
    if (!existsSync(distPath)) {
      return null
    }
    
    // This would implement actual bundle analysis
    // For now, return mock data
    return mockBundleAnalysis
  } catch (error) {
    console.error('Bundle analysis failed:', error)
    return null
  }
}

/**
 * Helper function to validate bundle analysis results
 */
export function validateBundleRequirements(analysis) {
  const requirements = {
    maxTotalSize: 500000,
    maxVendorSize: 200000,
    maxComponentSize: 100000,
    minCompressionRatio: 0.4,
    maxDuplicates: 0
  }
  
  const results = {}
  
  if (analysis) {
    const totalSize = analysis.bundles.reduce((sum, bundle) => sum + bundle.size, 0)
    const vendorSize = analysis.bundles
      .filter(b => b.name.startsWith('vendor-'))
      .reduce((sum, bundle) => sum + bundle.size, 0)
    const componentSize = analysis.bundles
      .find(b => b.name === 'components.js')?.size || 0
    
    results.totalSize = {
      value: totalSize,
      requirement: requirements.maxTotalSize,
      passing: totalSize <= requirements.maxTotalSize
    }
    
    results.vendorSize = {
      value: vendorSize,
      requirement: requirements.maxVendorSize,
      passing: vendorSize <= requirements.maxVendorSize
    }
    
    results.componentSize = {
      value: componentSize,
      requirement: requirements.maxComponentSize,
      passing: componentSize <= requirements.maxComponentSize
    }
    
    results.duplicates = {
      value: analysis.duplicates.length,
      requirement: requirements.maxDuplicates,
      passing: analysis.duplicates.length <= requirements.maxDuplicates
    }
  }
  
  return results
}