/**
 * Unit tests for logo store with enhanced error handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useLogoStore } from '../../stores/logoStore.js'
import { NetworkError, ERROR_CODES } from '../../utils/networkErrorHandler.js'

// Mock the API functions
vi.mock('../../utils/logoApi.js', () => ({
  fetchCatalog: vi.fn(),
  fetchLogoBySlug: vi.fn(),
  searchLogos: vi.fn(),
  fetchLogosByCategory: vi.fn(),
  fetchLogosByTag: vi.fn(),
  fetchCategories: vi.fn(),
  fetchTags: vi.fn(),
  getLogoUrl: vi.fn(),
  checkApiHealth: vi.fn(),
  NetworkError: class MockNetworkError extends Error {
    constructor(message, code, originalError, retryInfo) {
      super(message)
      this.name = 'NetworkError'
      this.code = code
      this.originalError = originalError
      this.retryInfo = retryInfo || { canRetry: false }
    }
  },
  ERROR_CODES: {
    NETWORK_ERROR: 'NETWORK_ERROR',
    CATALOG_LOAD_ERROR: 'CATALOG_LOAD_ERROR',
    LOGO_NOT_FOUND: 'LOGO_NOT_FOUND',
    TIMEOUT_ERROR: 'TIMEOUT_ERROR',
    PARSE_ERROR: 'PARSE_ERROR'
  },
  useNetworkStatus: vi.fn(() => ({
    isOnline: true,
    addListener: vi.fn(() => vi.fn()),
    checkConnectivity: vi.fn().mockResolvedValue(true)
  }))
}))

import {
  fetchCatalog,
  fetchLogoBySlug,
  searchLogos,
  checkApiHealth,
  useNetworkStatus
} from '../../utils/logoApi.js'

describe('useLogoStore - Error Handling', () => {
  let store
  
  beforeEach(() => {
    setActivePinia(createPinia())
    store = useLogoStore()
    vi.clearAllMocks()
  })
  
  afterEach(() => {
    vi.restoreAllMocks()
  })
  
  describe('loadCatalog', () => {
    it('should handle successful catalog loading', async () => {
      const mockCatalog = {
        logos: [{ slug: 'test-logo', name: 'Test Logo' }],
        categories: ['tech'],
        tags: ['test'],
        version: '1.0.0',
        lastUpdated: '2023-01-01'
      }
      
      fetchCatalog.mockResolvedValue(mockCatalog)
      
      await store.loadCatalog()
      
      expect(store.logos).toEqual(mockCatalog.logos)
      expect(store.categories).toEqual(mockCatalog.categories)
      expect(store.tags).toEqual(mockCatalog.tags)
      expect(store.catalogVersion).toBe('1.0.0')
      expect(store.hasError).toBe(false)
      expect(store.catalogLoading).toBe(false)
    })
    
    it('should handle network error with retry info', async () => {
      const networkError = new NetworkError(
        'Failed to fetch catalog',
        ERROR_CODES.CATALOG_LOAD_ERROR,
        null,
        { attempt: 1, maxRetries: 3, canRetry: true }
      )
      
      fetchCatalog.mockRejectedValue(networkError)
      
      await expect(store.loadCatalog()).rejects.toThrow(NetworkError)
      
      expect(store.hasError).toBe(true)
      expect(store.error.message).toBe('Failed to fetch catalog')
      expect(store.error.code).toBe(ERROR_CODES.CATALOG_LOAD_ERROR)
      expect(store.error.retryInfo.canRetry).toBe(true)
      expect(store.retryCount).toBe(1)
      expect(store.catalogLoading).toBe(false)
    })
    
    it('should handle generic error and enhance it', async () => {
      const genericError = new Error('Generic network error')
      fetchCatalog.mockRejectedValue(genericError)
      
      await expect(store.loadCatalog()).rejects.toThrow(NetworkError)
      
      expect(store.hasError).toBe(true)
      expect(store.error.message).toBe('Failed to load logo catalog')
      expect(store.error.code).toBe(ERROR_CODES.CATALOG_LOAD_ERROR)
    })
    
    it('should skip loading if catalog is fresh and not forced', async () => {
      // Set up fresh catalog
      store.setLogos([{ slug: 'existing' }])
      store.setCatalogMetadata('1.0.0', Date.now())
      
      await store.loadCatalog(false)
      
      expect(fetchCatalog).not.toHaveBeenCalled()
    })
    
    it('should force reload when requested', async () => {
      const mockCatalog = {
        logos: [{ slug: 'test-logo' }],
        categories: ['tech'],
        tags: ['test']
      }
      
      // Set up existing catalog
      store.setLogos([{ slug: 'existing' }])
      store.setCatalogMetadata('1.0.0', Date.now())
      
      fetchCatalog.mockResolvedValue(mockCatalog)
      
      await store.loadCatalog(true)
      
      expect(fetchCatalog).toHaveBeenCalledWith({ force: true })
      expect(store.logos).toEqual(mockCatalog.logos)
    })
  })
  
  describe('loadLogoBySlug', () => {
    it('should return existing logo from store', async () => {
      const existingLogo = { slug: 'existing-logo', name: 'Existing Logo' }
      store.setLogos([existingLogo])
      
      const result = await store.loadLogoBySlug('existing-logo')
      
      expect(result).toEqual(existingLogo)
      expect(fetchLogoBySlug).not.toHaveBeenCalled()
    })
    
    it('should fetch logo from API if not in store', async () => {
      const fetchedLogo = { slug: 'fetched-logo', name: 'Fetched Logo' }
      fetchLogoBySlug.mockResolvedValue(fetchedLogo)
      
      const result = await store.loadLogoBySlug('fetched-logo')
      
      expect(result).toEqual(fetchedLogo)
      expect(fetchLogoBySlug).toHaveBeenCalledWith('fetched-logo')
      expect(store.logos).toContain(fetchedLogo)
    })
    
    it('should handle logo not found', async () => {
      fetchLogoBySlug.mockResolvedValue(null)
      
      const result = await store.loadLogoBySlug('nonexistent-logo')
      
      expect(result).toBeNull()
    })
    
    it('should handle network error when fetching logo', async () => {
      const networkError = new NetworkError(
        'Failed to fetch logo',
        ERROR_CODES.LOGO_NOT_FOUND,
        null,
        { canRetry: true }
      )
      
      fetchLogoBySlug.mockRejectedValue(networkError)
      
      await expect(store.loadLogoBySlug('error-logo')).rejects.toThrow(NetworkError)
      
      expect(store.hasError).toBe(true)
      expect(store.error.code).toBe(ERROR_CODES.LOGO_NOT_FOUND)
    })
  })
  
  describe('searchLogos', () => {
    it('should perform search successfully', async () => {
      const searchResults = {
        logos: [{ slug: 'result1' }, { slug: 'result2' }],
        total: 2,
        query: 'test',
        facets: { categories: [], tags: [] }
      }
      
      searchLogos.mockResolvedValue(searchResults)
      
      const result = await store.searchLogos('test')
      
      expect(result).toEqual(searchResults)
      expect(store.searchResults).toEqual(searchResults.logos)
      expect(store.searchQuery).toBe('test')
    })
    
    it('should handle search error', async () => {
      const searchError = new NetworkError(
        'Search failed',
        ERROR_CODES.NETWORK_ERROR,
        null,
        { canRetry: true }
      )
      
      searchLogos.mockRejectedValue(searchError)
      
      await expect(store.searchLogos('test')).rejects.toThrow(NetworkError)
      
      expect(store.hasError).toBe(true)
      expect(store.error.code).toBe(ERROR_CODES.NETWORK_ERROR)
    })
    
    it('should include current filters in search options', async () => {
      store.setSearchFilters({ categories: ['tech'], tags: ['popular'] })
      
      const searchResults = {
        logos: [],
        total: 0,
        query: 'test',
        facets: { categories: [], tags: [] }
      }
      
      searchLogos.mockResolvedValue(searchResults)
      
      await store.searchLogos('test')
      
      expect(searchLogos).toHaveBeenCalledWith('test', {
        categories: ['tech'],
        tags: ['popular']
      })
    })
  })
  
  describe('retryLastOperation', () => {
    it('should retry catalog loading after catalog error', async () => {
      // Set up error state
      const catalogError = new NetworkError(
        'Catalog load failed',
        ERROR_CODES.CATALOG_LOAD_ERROR,
        null,
        { canRetry: true }
      )
      
      store.setError({
        message: catalogError.message,
        code: catalogError.code,
        retryInfo: catalogError.retryInfo
      })
      store.retryCount = 1
      
      const mockCatalog = {
        logos: [{ slug: 'test' }],
        categories: ['tech'],
        tags: ['test']
      }
      
      fetchCatalog.mockResolvedValue(mockCatalog)
      
      await store.retryLastOperation()
      
      expect(fetchCatalog).toHaveBeenCalledWith({ force: true })
      expect(store.hasError).toBe(false)
      expect(store.retryCount).toBe(0) // Should be reset after successful retry
    })
    
    it('should retry search after search error', async () => {
      // Set up search state and error
      store.setSearchQuery('test query')
      store.setSearchLoading(true)
      
      const searchError = new NetworkError(
        'Search failed',
        ERROR_CODES.NETWORK_ERROR,
        null,
        { canRetry: true }
      )
      
      store.setError({
        message: searchError.message,
        code: searchError.code,
        retryInfo: searchError.retryInfo
      })
      
      const searchResults = {
        logos: [{ slug: 'result' }],
        total: 1,
        query: 'test query',
        facets: { categories: [], tags: [] }
      }
      
      searchLogos.mockResolvedValue(searchResults)
      
      await store.retryLastOperation()
      
      expect(searchLogos).toHaveBeenCalledWith('test query')
    })
    
    it('should throw error if no retryable operation available', async () => {
      // Clear error state
      store.clearError()
      
      await expect(store.retryLastOperation()).rejects.toThrow('No retryable operation available')
    })
    
    it('should not retry if max retries exceeded', async () => {
      store.retryCount = 3
      store.maxRetries = 3
      
      await expect(store.retryLastOperation()).rejects.toThrow('No retryable operation available')
    })
  })
  
  describe('checkApiHealth', () => {
    it('should check API health successfully', async () => {
      const healthResult = {
        isHealthy: true,
        responseTime: 150,
        timestamp: Date.now()
      }
      
      checkApiHealth.mockResolvedValue(healthResult)
      
      const result = await store.checkApiHealth()
      
      expect(result).toEqual(healthResult)
      expect(store.apiHealth).toEqual(healthResult)
    })
    
    it('should handle health check error', async () => {
      const healthError = new Error('Health check failed')
      checkApiHealth.mockRejectedValue(healthError)
      
      const result = await store.checkApiHealth()
      
      expect(result.isHealthy).toBe(false)
      expect(result.error).toBe('Health check failed')
      expect(store.apiHealth.isHealthy).toBe(false)
    })
  })
  
  describe('initializeNetworkMonitoring', () => {
    it('should set up network status monitoring', () => {
      const mockAddListener = vi.fn(() => vi.fn())
      useNetworkStatus.mockReturnValue({
        isOnline: true,
        addListener: mockAddListener,
        checkConnectivity: vi.fn()
      })
      
      const removeListener = store.initializeNetworkMonitoring()
      
      expect(store.isOnline).toBe(true)
      expect(mockAddListener).toHaveBeenCalled()
      expect(typeof removeListener).toBe('function')
    })
    
    it('should auto-retry when network comes back online', async () => {
      const mockAddListener = vi.fn()
      let networkCallback
      
      mockAddListener.mockImplementation((callback) => {
        networkCallback = callback
        return vi.fn()
      })
      
      useNetworkStatus.mockReturnValue({
        isOnline: false,
        addListener: mockAddListener,
        checkConnectivity: vi.fn()
      })
      
      // Set up error state
      store.setError({
        message: 'Network error',
        code: ERROR_CODES.NETWORK_ERROR,
        retryInfo: { canRetry: true }
      })
      
      // Mock successful retry
      const mockCatalog = {
        logos: [{ slug: 'test' }],
        categories: ['tech'],
        tags: ['test']
      }
      fetchCatalog.mockResolvedValue(mockCatalog)
      
      store.initializeNetworkMonitoring()
      
      // Simulate network coming back online
      await networkCallback('online', true)
      
      // Should have attempted retry
      expect(fetchCatalog).toHaveBeenCalled()
    })
  })
  
  describe('Error state management', () => {
    it('should track retry count from error retry info', () => {
      const error = new NetworkError(
        'Test error',
        ERROR_CODES.NETWORK_ERROR,
        null,
        { attempt: 2, canRetry: true }
      )
      
      store.setError({
        message: error.message,
        code: error.code,
        retryInfo: error.retryInfo
      })
      
      expect(store.retryCount).toBe(2)
    })
    
    it('should clear retry count when error is cleared', () => {
      store.retryCount = 3
      store.clearError()
      
      expect(store.retryCount).toBe(0)
    })
    
    it('should determine if error is retryable', () => {
      // Non-retryable error
      store.setError({
        message: 'Parse error',
        code: ERROR_CODES.PARSE_ERROR,
        retryInfo: { canRetry: false }
      })
      
      expect(store.isRetryable).toBe(false)
      
      // Retryable error
      store.setError({
        message: 'Network error',
        code: ERROR_CODES.NETWORK_ERROR,
        retryInfo: { canRetry: true }
      })
      
      expect(store.isRetryable).toBe(true)
    })
    
    it('should determine if retry is possible based on count', () => {
      store.setError({
        message: 'Network error',
        code: ERROR_CODES.NETWORK_ERROR,
        retryInfo: { canRetry: true }
      })
      store.retryCount = 2
      store.maxRetries = 3
      
      expect(store.canRetry).toBe(true)
      
      store.retryCount = 3
      expect(store.canRetry).toBe(false)
    })
  })
  
  describe('Store reset', () => {
    it('should reset all error-related state', () => {
      // Set up error state
      store.setError({
        message: 'Test error',
        code: ERROR_CODES.NETWORK_ERROR,
        retryInfo: { canRetry: true }
      })
      store.retryCount = 2
      store.setNetworkStatus(false)
      store.setApiHealth({ isHealthy: false })
      
      store.reset()
      
      expect(store.error).toBeNull()
      expect(store.lastError).toBeNull()
      expect(store.retryCount).toBe(0)
      expect(store.isOnline).toBe(true)
      expect(store.apiHealth).toBeNull()
    })
  })
})