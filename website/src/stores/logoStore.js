import { defineStore } from 'pinia'
import {
  fetchCatalog,
  fetchLogoBySlug,
  searchLogos,
  fetchLogosByCategory,
  fetchLogosByTag,
  fetchCategories,
  fetchTags,
  getLogoUrl,
  checkApiHealth,
  NetworkError,
  ERROR_CODES,
  useNetworkStatus
} from '../utils/logoApi.js'

export const useLogoStore = defineStore('logo', {
  state: () => ({
    // Core data
    logos: [],
    categories: [],
    tags: [],
    
    // Loading states
    loading: false,
    catalogLoading: false,
    searchLoading: false,
    
    // Error handling
    error: null,
    lastError: null,
    retryCount: 0,
    maxRetries: 3,
    
    // Network status
    isOnline: true,
    apiHealth: null,
    
    // Search and filter state
    searchResults: [],
    searchQuery: '',
    searchFilters: {
      categories: [],
      tags: []
    },
    searchFacets: {
      categories: [],
      tags: []
    },
    
    // Cache management
    catalogLastUpdated: null,
    catalogVersion: null,
    
    // Statistics
    statistics: null
  }),

  getters: {
    // Basic getters
    logoCount: (state) => state.logos.length,
    hasLogos: (state) => state.logos.length > 0,
    hasError: (state) => state.error !== null,
    isLoading: (state) => state.loading || state.catalogLoading || state.searchLoading,
    canRetry: (state) => state.error && state.retryCount < state.maxRetries,
    isRetryable: (state) => state.error && state.error.retryInfo && state.error.retryInfo.canRetry,
    
    // Logo retrieval getters
    getLogoBySlug: (state) => (slug) => {
      return state.logos.find(logo => logo.slug === slug)
    },
    
    getLogosByCategory: (state) => (category) => {
      return state.logos.filter(logo => 
        logo.categories && logo.categories.includes(category)
      )
    },
    
    getLogosByTag: (state) => (tag) => {
      return state.logos.filter(logo => 
        logo.tags && logo.tags.includes(tag)
      )
    },
    
    // Search getters
    hasSearchResults: (state) => state.searchResults.length > 0,
    searchResultCount: (state) => state.searchResults.length,
    
    // Filter getters
    availableCategories: (state) => state.categories.map(category => ({
      name: category,
      count: state.logos.filter(logo => 
        logo.categories && logo.categories.includes(category)
      ).length
    })),
    
    availableTags: (state) => state.tags.map(tag => ({
      name: tag,
      count: state.logos.filter(logo => 
        logo.tags && logo.tags.includes(tag)
      ).length
    })),
    
    // URL generation getter
    getLogoUrl: () => (slug, variant = 'original') => {
      return getLogoUrl(slug, variant)
    },
    
    // Cache status
    isCatalogStale: (state) => {
      if (!state.catalogLastUpdated) return true
      const staleThreshold = 5 * 60 * 1000 // 5 minutes
      return Date.now() - state.catalogLastUpdated > staleThreshold
    }
  },

  actions: {
    // Basic state management
    setLoading(loading) {
      this.loading = loading
    },

    setCatalogLoading(loading) {
      this.catalogLoading = loading
    },

    setSearchLoading(loading) {
      this.searchLoading = loading
    },

    setError(error) {
      this.error = error
      this.lastError = error
      
      // Track retry count if error has retry info
      if (error && error.retryInfo) {
        this.retryCount = error.retryInfo.attempt || 0
      }
    },

    clearError() {
      this.error = null
      this.retryCount = 0
    },
    
    setNetworkStatus(isOnline) {
      this.isOnline = isOnline
    },
    
    setApiHealth(health) {
      this.apiHealth = health
    },

    // Data setters
    setLogos(logos) {
      this.logos = logos
    },

    setCategories(categories) {
      this.categories = categories
    },

    setTags(tags) {
      this.tags = tags
    },

    setStatistics(statistics) {
      this.statistics = statistics
    },

    setCatalogMetadata(version, lastUpdated) {
      this.catalogVersion = version
      this.catalogLastUpdated = Date.now()
    },

    // Search state management
    setSearchResults(results) {
      this.searchResults = results.logos || []
      this.searchFacets = results.facets || { categories: [], tags: [] }
    },

    setSearchQuery(query) {
      this.searchQuery = query
    },

    setSearchFilters(filters) {
      this.searchFilters = { ...this.searchFilters, ...filters }
    },

    clearSearchResults() {
      this.searchResults = []
      this.searchQuery = ''
      this.searchFilters = { categories: [], tags: [] }
      this.searchFacets = { categories: [], tags: [] }
    },

    // Logo management
    addLogo(logo) {
      const existingIndex = this.logos.findIndex(l => l.slug === logo.slug)
      if (existingIndex !== -1) {
        this.logos[existingIndex] = logo
      } else {
        this.logos.push(logo)
      }
    },

    updateLogo(slug, updatedLogo) {
      const index = this.logos.findIndex(logo => logo.slug === slug)
      if (index !== -1) {
        this.logos[index] = { ...this.logos[index], ...updatedLogo }
      }
    },

    removeLogo(slug) {
      const index = this.logos.findIndex(logo => logo.slug === slug)
      if (index !== -1) {
        this.logos.splice(index, 1)
      }
    },

    // API integration actions with enhanced error handling
    async loadCatalog(force = false) {
      // Skip if already loaded and not stale, unless forced
      if (!force && this.hasLogos && !this.isCatalogStale) {
        return
      }

      this.setCatalogLoading(true)
      this.clearError()

      try {
        const catalog = await fetchCatalog({ force })
        
        this.setLogos(catalog.logos || [])
        this.setCategories(catalog.categories || [])
        this.setTags(catalog.tags || [])
        this.setStatistics(catalog.statistics || null)
        this.setCatalogMetadata(catalog.version, catalog.lastUpdated)
        
      } catch (error) {
        const enhancedError = error instanceof NetworkError 
          ? error 
          : new NetworkError(
              'Failed to load logo catalog',
              ERROR_CODES.CATALOG_LOAD_ERROR,
              error,
              { canRetry: true }
            )
        
        this.setError({
          message: enhancedError.message,
          code: enhancedError.code,
          retryInfo: enhancedError.retryInfo,
          timestamp: Date.now(),
          originalError: enhancedError
        })
        
        throw enhancedError
      } finally {
        this.setCatalogLoading(false)
      }
    },

    async loadLogoBySlug(slug) {
      this.setLoading(true)
      this.clearError()

      try {
        // First check if logo is already in store
        let logo = this.getLogoBySlug(slug)
        
        if (!logo) {
          // If not in store, fetch from API
          logo = await fetchLogoBySlug(slug)
          
          if (logo) {
            this.addLogo(logo)
          }
        }
        
        return logo
      } catch (error) {
        const enhancedError = error instanceof NetworkError 
          ? error 
          : new NetworkError(
              `Failed to load logo "${slug}"`,
              ERROR_CODES.LOGO_NOT_FOUND,
              error,
              { canRetry: true }
            )
        
        this.setError({
          message: enhancedError.message,
          code: enhancedError.code,
          retryInfo: enhancedError.retryInfo,
          timestamp: Date.now(),
          originalError: enhancedError
        })
        
        throw enhancedError
      } finally {
        this.setLoading(false)
      }
    },

    async searchLogos(query = '', options = {}) {
      this.setSearchLoading(true)
      this.clearError()

      try {
        const searchOptions = {
          categories: this.searchFilters.categories,
          tags: this.searchFilters.tags,
          ...options
        }

        const results = await searchLogos(query, searchOptions)
        
        this.setSearchQuery(query)
        this.setSearchResults(results)
        
        return results
      } catch (error) {
        const enhancedError = error instanceof NetworkError 
          ? error 
          : new NetworkError(
              'Search failed',
              ERROR_CODES.NETWORK_ERROR,
              error,
              { canRetry: true }
            )
        
        this.setError({
          message: enhancedError.message,
          code: enhancedError.code,
          retryInfo: enhancedError.retryInfo,
          timestamp: Date.now(),
          originalError: enhancedError
        })
        
        throw enhancedError
      } finally {
        this.setSearchLoading(false)
      }
    },

    async loadLogosByCategory(category) {
      this.setLoading(true)
      this.clearError()

      try {
        const logos = await fetchLogosByCategory(category)
        
        // Add logos to store if not already present
        logos.forEach(logo => this.addLogo(logo))
        
        return logos
      } catch (error) {
        const errorMessage = error instanceof LogoApiError 
          ? error.message 
          : `Failed to load logos for category "${category}"`
        
        this.setError({
          message: errorMessage,
          code: error.code || ERROR_CODES.NETWORK_ERROR,
          timestamp: Date.now()
        })
        
        throw error
      } finally {
        this.setLoading(false)
      }
    },

    async loadLogosByTag(tag) {
      this.setLoading(true)
      this.clearError()

      try {
        const logos = await fetchLogosByTag(tag)
        
        // Add logos to store if not already present
        logos.forEach(logo => this.addLogo(logo))
        
        return logos
      } catch (error) {
        const errorMessage = error instanceof LogoApiError 
          ? error.message 
          : `Failed to load logos for tag "${tag}"`
        
        this.setError({
          message: errorMessage,
          code: error.code || ERROR_CODES.NETWORK_ERROR,
          timestamp: Date.now()
        })
        
        throw error
      } finally {
        this.setLoading(false)
      }
    },

    async refreshCatalog() {
      return this.loadCatalog(true)
    },
    
    // Enhanced error handling and retry methods
    async retryLastOperation() {
      if (!this.canRetry) {
        throw new Error('No retryable operation available')
      }
      
      this.retryCount++
      this.clearError()
      
      // Determine what operation to retry based on loading states
      if (this.catalogLoading || this.lastError?.code === ERROR_CODES.CATALOG_LOAD_ERROR) {
        return this.loadCatalog(true)
      }
      
      if (this.searchLoading) {
        return this.searchLogos(this.searchQuery)
      }
      
      // Default to refreshing catalog
      return this.refreshCatalog()
    },
    
    async checkApiHealth() {
      try {
        const health = await checkApiHealth()
        this.setApiHealth(health)
        return health
      } catch (error) {
        const healthResult = {
          isHealthy: false,
          error: error.message,
          timestamp: Date.now()
        }
        this.setApiHealth(healthResult)
        return healthResult
      }
    },
    
    // Initialize network status monitoring
    initializeNetworkMonitoring() {
      const networkStatus = useNetworkStatus()
      
      // Set initial status
      this.setNetworkStatus(networkStatus.isOnline)
      
      // Listen for network changes
      return networkStatus.addListener((status, isOnline) => {
        this.setNetworkStatus(isOnline)
        
        if (isOnline && this.hasError) {
          // Auto-retry when coming back online
          console.log('Network restored, attempting to retry failed operation')
          this.retryLastOperation().catch(error => {
            console.warn('Auto-retry failed:', error)
          })
        }
      })
    },

    // Filter management
    addCategoryFilter(category) {
      if (!this.searchFilters.categories.includes(category)) {
        this.searchFilters.categories.push(category)
      }
    },

    removeCategoryFilter(category) {
      const index = this.searchFilters.categories.indexOf(category)
      if (index !== -1) {
        this.searchFilters.categories.splice(index, 1)
      }
    },

    addTagFilter(tag) {
      if (!this.searchFilters.tags.includes(tag)) {
        this.searchFilters.tags.push(tag)
      }
    },

    removeTagFilter(tag) {
      const index = this.searchFilters.tags.indexOf(tag)
      if (index !== -1) {
        this.searchFilters.tags.splice(index, 1)
      }
    },

    clearFilters() {
      this.searchFilters = { categories: [], tags: [] }
    },

    // Reset store
    reset() {
      this.logos = []
      this.categories = []
      this.tags = []
      this.loading = false
      this.catalogLoading = false
      this.searchLoading = false
      this.error = null
      this.lastError = null
      this.retryCount = 0
      this.isOnline = true
      this.apiHealth = null
      this.searchResults = []
      this.searchQuery = ''
      this.searchFilters = { categories: [], tags: [] }
      this.searchFacets = { categories: [], tags: [] }
      this.catalogLastUpdated = null
      this.catalogVersion = null
      this.statistics = null
    }
  }
})