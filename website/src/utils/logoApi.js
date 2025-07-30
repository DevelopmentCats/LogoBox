/**
 * LogoBox API utilities for fetching catalog and logo data
 * Provides functions to interact with the logo catalog and CDN
 * Enhanced with comprehensive error handling and retry mechanisms
 */

import { 
  fetchWithRetry, 
  fetchJsonWithRetry, 
  NetworkError,
  recoveryStrategies,
  useNetworkStatus
} from './networkErrorHandler.js'

// Configuration using centralized environment variables
const API_CONFIG = {
  // Use Vite environment variables that should be set from our centralized config
  BASE_URL: import.meta.env.VITE_CDN_BASE_URL ||
           (import.meta.env.PROD ? 'https://cdn.logobox.dev' : '/assets'),
  CATALOG_PATH: import.meta.env.VITE_CATALOG_PATH || '/catalog.json',
  LOGOS_PATH: import.meta.env.VITE_LOGOS_PATH || '/logos',
  RETRY_ATTEMPTS: parseInt(import.meta.env.VITE_API_RETRY_ATTEMPTS || '3', 10),
  RETRY_DELAY: parseInt(import.meta.env.VITE_API_RETRY_DELAY || '1000', 10),
  TIMEOUT: parseInt(import.meta.env.VITE_API_TIMEOUT || '10000', 10),
  // Fallback URLs for high availability
  FALLBACK_URLS: [
    import.meta.env.VITE_CDN_FALLBACK_URL_1,
    import.meta.env.VITE_CDN_FALLBACK_URL_2
  ].filter(Boolean)
}

// Import error classes and codes from networkErrorHandler
import { LogoApiError, ERROR_CODES } from './networkErrorHandler.js'

/**
 * Cache for storing catalog data with timestamp
 */
const catalogCache = {
  data: null,
  timestamp: null,
  ttl: 5 * 60 * 1000 // 5 minutes
}

/**
 * Get cached catalog if still valid
 */
function getCachedCatalog() {
  if (catalogCache.data && catalogCache.timestamp) {
    const age = Date.now() - catalogCache.timestamp
    if (age < catalogCache.ttl) {
      return catalogCache.data
    }
  }
  return null
}

/**
 * Cache catalog data
 */
function setCachedCatalog(data) {
  catalogCache.data = data
  catalogCache.timestamp = Date.now()
  
  // Also store in localStorage for offline fallback
  try {
    localStorage.setItem('logobox_catalog', JSON.stringify({
      data,
      timestamp: catalogCache.timestamp
    }))
  } catch (error) {
    console.warn('Failed to cache catalog in localStorage:', error)
  }
}

/**
 * Get catalog from localStorage as fallback
 */
function getOfflineCatalog() {
  try {
    const cached = localStorage.getItem('logobox_catalog')
    if (cached) {
      const { data } = JSON.parse(cached)
      return data
    }
  } catch (error) {
    console.warn('Failed to retrieve offline catalog:', error)
  }
  return null
}

/**
 * Fetches the complete logo catalog from the API with enhanced error handling
 * @param {Object} options - Fetch options
 * @returns {Promise<Object>} The catalog object containing logos, categories, and tags
 * @throws {NetworkError} When catalog cannot be loaded
 */
export async function fetchCatalog(options = {}) {
  // Check cache first
  const cached = getCachedCatalog()
  if (cached && !options.force) {
    return cached
  }
  
  const networkConfig = {
    maxRetries: API_CONFIG.RETRY_ATTEMPTS,
    baseDelay: API_CONFIG.RETRY_DELAY,
    timeoutMs: API_CONFIG.TIMEOUT
  }
  
  try {
    const url = `${API_CONFIG.BASE_URL}${API_CONFIG.CATALOG_PATH}`
    
    // Try main URL first, then fallbacks
    const urls = [url, ...API_CONFIG.FALLBACK_URLS.map(base => `${base}${API_CONFIG.CATALOG_PATH}`)]
    
    let catalog
    if (urls.length > 1) {
      // Use fallback strategy if multiple URLs available
      const response = await recoveryStrategies.tryFallbackUrls(urls, {}, networkConfig)
      catalog = await response.json()
    } else {
      // Use enhanced retry for single URL
      catalog = await fetchJsonWithRetry(url, {}, networkConfig)
    }
    
    // Validate catalog structure
    validateCatalogStructure(catalog)
    
    // Cache the successful result
    setCachedCatalog(catalog)
    
    return catalog
    
  } catch (error) {
    // Try offline fallback if available
    if (error instanceof NetworkError && error.code === ERROR_CODES.NETWORK_ERROR) {
      const offlineCatalog = getOfflineCatalog()
      if (offlineCatalog) {
        console.warn('Using offline catalog due to network error:', error.message)
        return offlineCatalog
      }
    }
    
    // Re-throw enhanced error
    if (error instanceof NetworkError) {
      throw error
    }
    
    throw new NetworkError(
      `Failed to fetch catalog: ${error.message}`,
      ERROR_CODES.CATALOG_LOAD_ERROR,
      error,
      { canRetry: true }
    )
  }
}

/**
 * Validate catalog structure
 */
function validateCatalogStructure(catalog) {
  if (!catalog || typeof catalog !== 'object') {
    throw new NetworkError(
      'Invalid catalog format: not an object',
      ERROR_CODES.PARSE_ERROR,
      null,
      { canRetry: false }
    )
  }
  
  if (!catalog.logos || !Array.isArray(catalog.logos)) {
    throw new NetworkError(
      'Invalid catalog format: missing or invalid logos array',
      ERROR_CODES.PARSE_ERROR,
      null,
      { canRetry: false }
    )
  }
  
  if (!catalog.categories || !Array.isArray(catalog.categories)) {
    throw new NetworkError(
      'Invalid catalog format: missing or invalid categories array',
      ERROR_CODES.PARSE_ERROR,
      null,
      { canRetry: false }
    )
  }
  
  if (!catalog.tags || !Array.isArray(catalog.tags)) {
    throw new NetworkError(
      'Invalid catalog format: missing or invalid tags array',
      ERROR_CODES.PARSE_ERROR,
      null,
      { canRetry: false }
    )
  }
}

/**
 * Fetches a specific logo by its slug with enhanced error handling
 * @param {string} slug - The logo slug identifier
 * @returns {Promise<Object|null>} The logo object or null if not found
 * @throws {NetworkError} When there's a network error
 */
export async function fetchLogoBySlug(slug) {
  try {
    const catalog = await fetchCatalog()
    const logo = catalog.logos.find(logo => logo.slug === slug)
    
    if (!logo) {
      return null
    }
    
    return logo
  } catch (error) {
    if (error instanceof NetworkError) {
      throw error
    }
    
    throw new NetworkError(
      `Failed to fetch logo "${slug}": ${error.message}`,
      ERROR_CODES.LOGO_NOT_FOUND,
      error,
      { canRetry: true }
    )
  }
}

/**
 * Generates the URL for a specific logo variant with fallback support
 * @param {string} slug - The logo slug identifier
 * @param {string} variant - The variant type ('original', 'white', 'black', 'optimized')
 * @param {Object} options - URL generation options
 * @returns {string|Array} The complete URL to the logo asset or array of URLs with fallbacks
 */
export function getLogoUrl(slug, variant = 'original', options = {}) {
  const validVariants = ['original', 'white', 'black', 'optimized']
  
  if (!validVariants.includes(variant)) {
    throw new NetworkError(
      `Invalid variant "${variant}". Must be one of: ${validVariants.join(', ')}`,
      ERROR_CODES.LOGO_NOT_FOUND,
      null,
      { canRetry: false }
    )
  }
  
  const filename = variant === 'original' ? 'logo.svg' : `logo-${variant}.svg`
  const primaryUrl = `${API_CONFIG.BASE_URL}${API_CONFIG.LOGOS_PATH}/${slug}/${filename}`
  
  if (options.includeFallbacks && API_CONFIG.FALLBACK_URLS.length > 0) {
    const fallbackUrls = API_CONFIG.FALLBACK_URLS.map(base => 
      `${base}${API_CONFIG.LOGOS_PATH}/${slug}/${filename}`
    )
    return [primaryUrl, ...fallbackUrls]
  }
  
  return primaryUrl
}

/**
 * Preload a logo image with fallback handling
 * @param {string} slug - The logo slug identifier
 * @param {string} variant - The variant type
 * @returns {Promise<string>} The successfully loaded URL
 */
export async function preloadLogoImage(slug, variant = 'original') {
  const urls = getLogoUrl(slug, variant, { includeFallbacks: true })
  const urlArray = Array.isArray(urls) ? urls : [urls]
  
  for (const url of urlArray) {
    try {
      await new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = () => resolve(url)
        img.onerror = reject
        img.src = url
      })
      return url // Return the first successful URL
    } catch (error) {
      console.warn(`Failed to preload logo from ${url}:`, error)
    }
  }
  
  throw new NetworkError(
    `Failed to preload logo ${slug} (${variant}) from all URLs`,
    ERROR_CODES.LOGO_NOT_FOUND,
    null,
    { canRetry: true }
  )
}

/**
 * Searches logos based on text query with enhanced error handling
 * @param {string} query - The search query
 * @param {Object} options - Search options
 * @param {string[]} options.categories - Filter by categories
 * @param {string[]} options.tags - Filter by tags
 * @param {number} options.limit - Maximum number of results
 * @returns {Promise<Object>} Search results with logos and metadata
 */
export async function searchLogos(query = '', options = {}) {
  try {
    const catalog = await fetchCatalog()
    const { categories = [], tags = [], limit } = options
    
    let results = catalog.logos
    
    // Filter by text query with fuzzy matching
    if (query.trim()) {
      const searchTerm = query.toLowerCase().trim()
      results = results.filter(logo => {
        const searchableText = [
          logo.name,
          logo.slug,
          logo.description || '',
          ...(logo.categories || []),
          ...(logo.tags || [])
        ].join(' ').toLowerCase()
        
        // Exact match gets priority
        if (searchableText.includes(searchTerm)) {
          return true
        }
        
        // Fuzzy matching for typos
        const words = searchTerm.split(' ')
        return words.some(word => {
          if (word.length < 3) return false
          return searchableText.includes(word) || 
                 searchableText.includes(word.slice(0, -1)) || // Remove last char
                 searchableText.includes(word + 's') // Add plural
        })
      })
    }
    
    // Filter by categories
    if (categories.length > 0) {
      results = results.filter(logo =>
        logo.categories && categories.some(cat => logo.categories.includes(cat))
      )
    }
    
    // Filter by tags
    if (tags.length > 0) {
      results = results.filter(logo =>
        logo.tags && tags.some(tag => logo.tags.includes(tag))
      )
    }
    
    // Apply limit
    if (limit && limit > 0) {
      results = results.slice(0, limit)
    }
    
    return {
      logos: results,
      total: results.length,
      query,
      filters: { categories, tags },
      facets: {
        categories: catalog.categories.map(cat => ({
          name: cat,
          count: catalog.logos.filter(logo => 
            logo.categories && logo.categories.includes(cat)
          ).length
        })),
        tags: catalog.tags.map(tag => ({
          name: tag,
          count: catalog.logos.filter(logo => 
            logo.tags && logo.tags.includes(tag)
          ).length
        }))
      }
    }
  } catch (error) {
    if (error instanceof NetworkError) {
      throw error
    }
    
    throw new NetworkError(
      `Search failed: ${error.message}`,
      ERROR_CODES.NETWORK_ERROR,
      error,
      { canRetry: true }
    )
  }
}

/**
 * Fetches logos by category with enhanced error handling
 * @param {string} category - The category name
 * @returns {Promise<Object[]>} Array of logos in the category
 */
export async function fetchLogosByCategory(category) {
  try {
    const catalog = await fetchCatalog()
    return catalog.logos.filter(logo =>
      logo.categories && logo.categories.includes(category)
    )
  } catch (error) {
    if (error instanceof NetworkError) {
      throw error
    }
    
    throw new NetworkError(
      `Failed to fetch logos for category "${category}": ${error.message}`,
      ERROR_CODES.NETWORK_ERROR,
      error,
      { canRetry: true }
    )
  }
}

/**
 * Fetches logos by tag with enhanced error handling
 * @param {string} tag - The tag name
 * @returns {Promise<Object[]>} Array of logos with the tag
 */
export async function fetchLogosByTag(tag) {
  try {
    const catalog = await fetchCatalog()
    return catalog.logos.filter(logo =>
      logo.tags && logo.tags.includes(tag)
    )
  } catch (error) {
    if (error instanceof NetworkError) {
      throw error
    }
    
    throw new NetworkError(
      `Failed to fetch logos for tag "${tag}": ${error.message}`,
      ERROR_CODES.NETWORK_ERROR,
      error,
      { canRetry: true }
    )
  }
}

/**
 * Fetches all available categories with enhanced error handling
 * @returns {Promise<string[]>} Array of category names
 */
export async function fetchCategories() {
  try {
    const catalog = await fetchCatalog()
    return catalog.categories || []
  } catch (error) {
    if (error instanceof NetworkError) {
      throw error
    }
    
    throw new NetworkError(
      `Failed to fetch categories: ${error.message}`,
      ERROR_CODES.NETWORK_ERROR,
      error,
      { canRetry: true }
    )
  }
}

/**
 * Fetches all available tags with enhanced error handling
 * @returns {Promise<string[]>} Array of tag names
 */
export async function fetchTags() {
  try {
    const catalog = await fetchCatalog()
    return catalog.tags || []
  } catch (error) {
    if (error instanceof NetworkError) {
      throw error
    }
    
    throw new NetworkError(
      `Failed to fetch tags: ${error.message}`,
      ERROR_CODES.NETWORK_ERROR,
      error,
      { canRetry: true }
    )
  }
}

/**
 * Checks if the API is available and responsive with enhanced error handling
 * @returns {Promise<Object>} Health check result with detailed information
 */
export async function checkApiHealth() {
  const networkStatus = useNetworkStatus()
  const healthResult = {
    isHealthy: false,
    isOnline: networkStatus.isOnline,
    responseTime: null,
    error: null,
    timestamp: Date.now()
  }
  
  if (!networkStatus.isOnline) {
    healthResult.error = 'Device is offline'
    return healthResult
  }
  
  const startTime = performance.now()
  
  try {
    const response = await fetchWithRetry(
      `${API_CONFIG.BASE_URL}${API_CONFIG.CATALOG_PATH}`,
      { method: 'HEAD' },
      { 
        maxRetries: 1, 
        timeoutMs: 5000 
      }
    )
    
    healthResult.responseTime = performance.now() - startTime
    healthResult.isHealthy = response.ok
    
    if (!response.ok) {
      healthResult.error = `HTTP ${response.status}: ${response.statusText}`
    }
    
  } catch (error) {
    healthResult.responseTime = performance.now() - startTime
    healthResult.error = error.message
    
    // Try connectivity check as fallback
    const hasConnectivity = await networkStatus.checkConnectivity()
    if (!hasConnectivity) {
      healthResult.error = 'No internet connectivity'
    }
  }
  
  return healthResult
}

/**
 * Batch preload multiple logos for better performance
 * @param {Array} logoSlugs - Array of logo slugs to preload
 * @param {string} variant - The variant to preload
 * @returns {Promise<Object>} Results of preload attempts
 */
export async function batchPreloadLogos(logoSlugs, variant = 'original') {
  const results = {
    successful: [],
    failed: [],
    total: logoSlugs.length
  }
  
  const preloadPromises = logoSlugs.map(async (slug) => {
    try {
      const url = await preloadLogoImage(slug, variant)
      results.successful.push({ slug, url })
    } catch (error) {
      results.failed.push({ slug, error: error.message })
    }
  })
  
  await Promise.allSettled(preloadPromises)
  
  return results
}

// Export configuration for testing purposes
export { API_CONFIG }

// Export enhanced error handling utilities
export { 
  NetworkError, 
  recoveryStrategies, 
  useNetworkStatus,
  LogoApiError,
  ERROR_CODES
}