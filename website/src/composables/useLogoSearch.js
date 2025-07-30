/**
 * Logo Search Composable
 * Provides real-time search functionality with debouncing, state management, and persistence
 */

import { ref, computed, watch, nextTick } from 'vue'
import { useLogoStore } from '../stores/logoStore.js'

/**
 * Default configuration for the search composable
 */
const DEFAULT_CONFIG = {
  debounceDelay: 300, // milliseconds
  minSearchLength: 1,
  maxResults: 100,
  persistState: true,
  storageKey: 'logobox-search-state'
}

/**
 * Search state persistence utilities factory
 */
const createSearchStateStorage = (storageKey) => ({
  save(state) {
    try {
      const stateToSave = {
        query: state.query,
        filters: state.filters,
        timestamp: Date.now()
      }
      localStorage.setItem(storageKey, JSON.stringify(stateToSave))
    } catch (error) {
      console.warn('Failed to save search state:', error)
    }
  },

  load() {
    try {
      const saved = localStorage.getItem(storageKey)
      if (!saved) return null

      const state = JSON.parse(saved)
      
      // Check if state is not too old (1 hour)
      const maxAge = 60 * 60 * 1000 // 1 hour
      if (Date.now() - state.timestamp > maxAge) {
        localStorage.removeItem(storageKey)
        return null
      }

      return {
        query: state.query || '',
        filters: state.filters || { categories: [], tags: [] }
      }
    } catch (error) {
      console.warn('Failed to load search state:', error)
      return null
    }
  },

  clear() {
    try {
      localStorage.removeItem(storageKey)
    } catch (error) {
      console.warn('Failed to clear search state:', error)
    }
  }
})

/**
 * Debounce utility function
 */
function debounce(func, delay) {
  let timeoutId
  return function (...args) {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func.apply(this, args), delay)
  }
}

/**
 * Logo Search Composable
 * @param {Object} options - Configuration options
 * @returns {Object} Search state and methods
 */
export function useLogoSearch(options = {}) {
  const config = { ...DEFAULT_CONFIG, ...options }
  const logoStore = useLogoStore()
  const searchStateStorage = createSearchStateStorage(config.storageKey)

  // Reactive state
  const searchQuery = ref('')
  const searchFilters = ref({ categories: [], tags: [] })
  const isSearching = ref(false)
  const searchError = ref(null)
  const searchHistory = ref([])
  const searchSuggestions = ref([])
  const lastSearchTime = ref(null)

  // Load persisted state if enabled
  if (config.persistState) {
    const savedState = searchStateStorage.load()
    if (savedState) {
      searchQuery.value = savedState.query
      searchFilters.value = savedState.filters
    }
  }

  // Computed properties
  const hasSearchQuery = computed(() => 
    searchQuery.value.trim().length >= config.minSearchLength
  )

  const hasActiveFilters = computed(() => 
    searchFilters.value.categories.length > 0 || searchFilters.value.tags.length > 0
  )

  const hasActiveSearch = computed(() => 
    hasSearchQuery.value || hasActiveFilters.value
  )

  const searchResults = computed(() => logoStore.searchResults)

  const searchResultCount = computed(() => logoStore.searchResultCount)

  const hasSearchResults = computed(() => logoStore.hasSearchResults)

  const searchFacets = computed(() => logoStore.searchFacets)

  const isLoading = computed(() => logoStore.searchLoading || isSearching.value)

  const canSearch = computed(() => 
    hasActiveSearch.value && !isLoading.value
  )

  // Search execution function
  const executeSearch = async (query = searchQuery.value, filters = searchFilters.value) => {
    if (!query.trim() && filters.categories.length === 0 && filters.tags.length === 0) {
      // Clear search results if no query or filters
      logoStore.clearSearchResults()
      return
    }

    isSearching.value = true
    searchError.value = null
    lastSearchTime.value = Date.now()

    try {
      const searchOptions = {
        categories: filters.categories,
        tags: filters.tags,
        limit: config.maxResults
      }

      await logoStore.searchLogos(query.trim(), searchOptions)

      // Add to search history if it's a text query
      if (query.trim() && !searchHistory.value.includes(query.trim())) {
        searchHistory.value.unshift(query.trim())
        // Keep only last 10 searches
        if (searchHistory.value.length > 10) {
          searchHistory.value = searchHistory.value.slice(0, 10)
        }
      }

      // Update suggestions based on search results
      updateSearchSuggestions()

    } catch (error) {
      searchError.value = {
        message: error.message || 'Search failed',
        code: error.code || 'SEARCH_ERROR',
        timestamp: Date.now()
      }
      console.error('Search error:', error)
    } finally {
      isSearching.value = false
    }
  }

  // Debounced search function
  const debouncedSearch = debounce(executeSearch, config.debounceDelay)

  // Update search suggestions based on current results and catalog
  const updateSearchSuggestions = () => {
    const suggestions = new Set()
    
    // Add suggestions from search results
    searchResults.value.forEach(logo => {
      suggestions.add(logo.name)
      if (logo.tags) {
        logo.tags.forEach(tag => suggestions.add(tag))
      }
      if (logo.categories) {
        logo.categories.forEach(category => suggestions.add(category))
      }
    })

    // Convert to array and limit
    searchSuggestions.value = Array.from(suggestions)
      .filter(suggestion => 
        suggestion.toLowerCase().includes(searchQuery.value.toLowerCase())
      )
      .slice(0, 8)
  }

  // Watch for search query changes
  watch(searchQuery, (newQuery) => {
    if (newQuery.trim().length >= config.minSearchLength || newQuery.trim() === '') {
      debouncedSearch(newQuery, searchFilters.value)
    }
    
    // Update suggestions as user types
    if (newQuery.trim()) {
      updateSearchSuggestions()
    } else {
      searchSuggestions.value = []
    }
  })

  // Watch for filter changes
  watch(searchFilters, (newFilters) => {
    executeSearch(searchQuery.value, newFilters)
  }, { deep: true })

  // Persist state changes
  if (config.persistState) {
    watch([searchQuery, searchFilters], () => {
      searchStateStorage.save({
        query: searchQuery.value,
        filters: searchFilters.value
      })
    }, { deep: true })
  }

  // Public methods
  const setSearchQuery = (query) => {
    searchQuery.value = query
  }

  const clearSearchQuery = () => {
    searchQuery.value = ''
    searchSuggestions.value = []
  }

  const addCategoryFilter = (category) => {
    if (!searchFilters.value.categories.includes(category)) {
      searchFilters.value.categories.push(category)
    }
  }

  const removeCategoryFilter = (category) => {
    const index = searchFilters.value.categories.indexOf(category)
    if (index !== -1) {
      searchFilters.value.categories.splice(index, 1)
    }
  }

  const addTagFilter = (tag) => {
    if (!searchFilters.value.tags.includes(tag)) {
      searchFilters.value.tags.push(tag)
    }
  }

  const removeTagFilter = (tag) => {
    const index = searchFilters.value.tags.indexOf(tag)
    if (index !== -1) {
      searchFilters.value.tags.splice(index, 1)
    }
  }

  const clearFilters = () => {
    searchFilters.value = { categories: [], tags: [] }
  }

  const clearAll = () => {
    clearSearchQuery()
    clearFilters()
    logoStore.clearSearchResults()
    searchError.value = null
    searchHistory.value = []
    searchSuggestions.value = []
    
    if (config.persistState) {
      searchStateStorage.clear()
    }
  }

  const performSearch = async (query = searchQuery.value, filters = searchFilters.value) => {
    await executeSearch(query, filters)
  }

  const refreshSearch = async () => {
    if (hasActiveSearch.value) {
      await executeSearch(searchQuery.value, searchFilters.value)
    }
  }

  const selectSuggestion = (suggestion) => {
    setSearchQuery(suggestion)
  }

  const selectHistoryItem = (historyItem) => {
    setSearchQuery(historyItem)
  }

  // Initialize search if there's a persisted query or filters
  nextTick(() => {
    if (hasActiveSearch.value) {
      executeSearch(searchQuery.value, searchFilters.value)
    }
  })

  return {
    // Reactive state
    searchQuery,
    searchFilters,
    searchError,
    searchHistory,
    searchSuggestions,
    lastSearchTime,

    // Computed properties
    hasSearchQuery,
    hasActiveFilters,
    hasActiveSearch,
    searchResults,
    searchResultCount,
    hasSearchResults,
    searchFacets,
    isLoading,
    canSearch,

    // Methods
    setSearchQuery,
    clearSearchQuery,
    addCategoryFilter,
    removeCategoryFilter,
    addTagFilter,
    removeTagFilter,
    clearFilters,
    clearAll,
    performSearch,
    refreshSearch,
    selectSuggestion,
    selectHistoryItem
  }
}

export default useLogoSearch