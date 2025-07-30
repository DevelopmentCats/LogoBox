/**
 * Unit tests for useLogoSearch composable
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { useLogoSearch } from '../../composables/useLogoSearch.js'
import { useLogoStore } from '../../stores/logoStore.js'

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

// Mock data
const mockLogos = [
  {
    slug: 'github',
    name: 'GitHub',
    description: 'Code hosting platform',
    categories: ['development', 'tools'],
    tags: ['git', 'code', 'repository']
  },
  {
    slug: 'microsoft',
    name: 'Microsoft',
    description: 'Technology company',
    categories: ['technology', 'enterprise'],
    tags: ['windows', 'office', 'cloud']
  },
  {
    slug: 'vue',
    name: 'Vue.js',
    description: 'Progressive JavaScript framework',
    categories: ['development', 'frontend'],
    tags: ['javascript', 'framework', 'spa']
  }
]

const mockSearchResults = {
  logos: mockLogos.slice(0, 2),
  total: 2,
  query: 'git',
  filters: { categories: [], tags: [] },
  facets: {
    categories: [
      { name: 'development', count: 2 },
      { name: 'tools', count: 1 }
    ],
    tags: [
      { name: 'git', count: 1 },
      { name: 'code', count: 1 }
    ]
  }
}

describe('useLogoSearch', () => {
  let pinia
  let logoStore

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    logoStore = useLogoStore()
    
    // Reset localStorage mock
    localStorageMock.getItem.mockClear()
    localStorageMock.setItem.mockClear()
    localStorageMock.removeItem.mockClear()
    
    // Mock store methods
    vi.spyOn(logoStore, 'searchLogos').mockResolvedValue(mockSearchResults)
    vi.spyOn(logoStore, 'clearSearchResults').mockImplementation(() => {
      logoStore.searchResults = []
      logoStore.searchQuery = ''
    })
    
    // Set initial store state
    logoStore.searchResults = []
    logoStore.searchLoading = false
    logoStore.searchFacets = { categories: [], tags: [] }
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('initialization', () => {
    it('should initialize with default values', () => {
      const { 
        searchQuery, 
        searchFilters, 
        searchError, 
        searchHistory, 
        searchSuggestions,
        hasSearchQuery,
        hasActiveFilters,
        hasActiveSearch
      } = useLogoSearch()

      expect(searchQuery.value).toBe('')
      expect(searchFilters.value).toEqual({ categories: [], tags: [] })
      expect(searchError.value).toBeNull()
      expect(searchHistory.value).toEqual([])
      expect(searchSuggestions.value).toEqual([])
      expect(hasSearchQuery.value).toBe(false)
      expect(hasActiveFilters.value).toBe(false)
      expect(hasActiveSearch.value).toBe(false)
    })

    it('should load persisted state from localStorage', () => {
      const savedState = {
        query: 'github',
        filters: { categories: ['development'], tags: ['git'] },
        timestamp: Date.now()
      }
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(savedState))

      const { searchQuery, searchFilters } = useLogoSearch()

      expect(searchQuery.value).toBe('github')
      expect(searchFilters.value).toEqual({ categories: ['development'], tags: ['git'] })
    })

    it('should ignore stale persisted state', () => {
      const staleState = {
        query: 'github',
        filters: { categories: ['development'], tags: ['git'] },
        timestamp: Date.now() - (2 * 60 * 60 * 1000) // 2 hours ago
      }
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(staleState))

      const { searchQuery, searchFilters } = useLogoSearch()

      expect(searchQuery.value).toBe('')
      expect(searchFilters.value).toEqual({ categories: [], tags: [] })
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('logobox-search-state')
    })

    it('should handle localStorage errors gracefully', () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('localStorage error')
      })

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const { searchQuery, searchFilters } = useLogoSearch()

      expect(searchQuery.value).toBe('')
      expect(searchFilters.value).toEqual({ categories: [], tags: [] })
      expect(consoleSpy).toHaveBeenCalledWith('Failed to load search state:', expect.any(Error))
      
      consoleSpy.mockRestore()
    })
  })

  describe('search query management', () => {
    it('should update search query', () => {
      const { searchQuery, setSearchQuery, hasSearchQuery } = useLogoSearch()

      setSearchQuery('github')

      expect(searchQuery.value).toBe('github')
      expect(hasSearchQuery.value).toBe(true)
    })

    it('should clear search query', () => {
      const { searchQuery, setSearchQuery, clearSearchQuery, hasSearchQuery } = useLogoSearch()

      setSearchQuery('github')
      clearSearchQuery()

      expect(searchQuery.value).toBe('')
      expect(hasSearchQuery.value).toBe(false)
    })

    it('should detect minimum search length', () => {
      const { searchQuery, setSearchQuery, hasSearchQuery } = useLogoSearch({ minSearchLength: 3 })

      setSearchQuery('gi')
      expect(hasSearchQuery.value).toBe(false)

      setSearchQuery('git')
      expect(hasSearchQuery.value).toBe(true)
    })
  })

  describe('filter management', () => {
    it('should add and remove category filters', () => {
      const { 
        searchFilters, 
        addCategoryFilter, 
        removeCategoryFilter, 
        hasActiveFilters 
      } = useLogoSearch()

      addCategoryFilter('development')
      expect(searchFilters.value.categories).toContain('development')
      expect(hasActiveFilters.value).toBe(true)

      addCategoryFilter('development') // Should not add duplicate
      expect(searchFilters.value.categories).toEqual(['development'])

      removeCategoryFilter('development')
      expect(searchFilters.value.categories).not.toContain('development')
      expect(hasActiveFilters.value).toBe(false)
    })

    it('should add and remove tag filters', () => {
      const { 
        searchFilters, 
        addTagFilter, 
        removeTagFilter, 
        hasActiveFilters 
      } = useLogoSearch()

      addTagFilter('git')
      expect(searchFilters.value.tags).toContain('git')
      expect(hasActiveFilters.value).toBe(true)

      addTagFilter('git') // Should not add duplicate
      expect(searchFilters.value.tags).toEqual(['git'])

      removeTagFilter('git')
      expect(searchFilters.value.tags).not.toContain('git')
      expect(hasActiveFilters.value).toBe(false)
    })

    it('should clear all filters', () => {
      const { 
        searchFilters, 
        addCategoryFilter, 
        addTagFilter, 
        clearFilters, 
        hasActiveFilters 
      } = useLogoSearch()

      addCategoryFilter('development')
      addTagFilter('git')
      expect(hasActiveFilters.value).toBe(true)

      clearFilters()
      expect(searchFilters.value).toEqual({ categories: [], tags: [] })
      expect(hasActiveFilters.value).toBe(false)
    })
  })

  describe('search execution', () => {
    it('should perform search with query', async () => {
      logoStore.searchResults = mockSearchResults.logos

      const { setSearchQuery, performSearch, searchResults } = useLogoSearch()

      setSearchQuery('github')
      await performSearch()

      expect(logoStore.searchLogos).toHaveBeenCalledWith('github', {
        categories: [],
        tags: [],
        limit: 100
      })
      expect(searchResults.value).toEqual(mockSearchResults.logos)
    })

    it('should perform search with filters', async () => {
      logoStore.searchResults = mockSearchResults.logos

      const { addCategoryFilter, addTagFilter, performSearch } = useLogoSearch()

      addCategoryFilter('development')
      addTagFilter('git')
      await performSearch()

      expect(logoStore.searchLogos).toHaveBeenCalledWith('', {
        categories: ['development'],
        tags: ['git'],
        limit: 100
      })
    })

    it('should clear results when no query or filters', async () => {
      const { performSearch } = useLogoSearch()

      await performSearch()

      expect(logoStore.clearSearchResults).toHaveBeenCalled()
      expect(logoStore.searchLogos).not.toHaveBeenCalled()
    })

    it('should handle search errors', async () => {
      const searchError = new Error('Search failed')
      logoStore.searchLogos.mockRejectedValue(searchError)

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const { setSearchQuery, performSearch, searchError: errorRef } = useLogoSearch()

      setSearchQuery('github')
      await performSearch()

      expect(errorRef.value).toEqual({
        message: 'Search failed',
        code: 'SEARCH_ERROR',
        timestamp: expect.any(Number)
      })
      expect(consoleSpy).toHaveBeenCalledWith('Search error:', searchError)
      
      consoleSpy.mockRestore()
    })

    it('should debounce search queries', async () => {
      vi.useFakeTimers()

      const { setSearchQuery } = useLogoSearch({ debounceDelay: 300 })

      setSearchQuery('g')
      setSearchQuery('gi')
      setSearchQuery('git')

      // Should not have called search yet
      expect(logoStore.searchLogos).not.toHaveBeenCalled()

      // Fast-forward time
      vi.advanceTimersByTime(300)
      await nextTick()

      // Should have called search only once with final query
      expect(logoStore.searchLogos).toHaveBeenCalledTimes(1)
      expect(logoStore.searchLogos).toHaveBeenCalledWith('git', expect.any(Object))

      vi.useRealTimers()
    })
  })

  describe('search history', () => {
    it('should add queries to search history', async () => {
      logoStore.searchResults = mockSearchResults.logos

      const { setSearchQuery, performSearch, searchHistory } = useLogoSearch()

      setSearchQuery('github')
      await performSearch()

      expect(searchHistory.value).toContain('github')
    })

    it('should not add duplicate queries to history', async () => {
      logoStore.searchResults = mockSearchResults.logos

      const { setSearchQuery, performSearch, searchHistory } = useLogoSearch()

      setSearchQuery('github')
      await performSearch()
      await performSearch()

      expect(searchHistory.value.filter(item => item === 'github')).toHaveLength(1)
    })

    it('should limit search history to 10 items', async () => {
      logoStore.searchResults = mockSearchResults.logos

      const { setSearchQuery, performSearch, searchHistory } = useLogoSearch()

      // Add 12 different queries
      for (let i = 1; i <= 12; i++) {
        setSearchQuery(`query${i}`)
        await performSearch()
      }

      expect(searchHistory.value).toHaveLength(10)
      expect(searchHistory.value[0]).toBe('query12') // Most recent first
    })

    it('should select history item', () => {
      const { searchHistory, selectHistoryItem, searchQuery } = useLogoSearch()

      searchHistory.value = ['github', 'microsoft']
      selectHistoryItem('github')

      expect(searchQuery.value).toBe('github')
    })
  })

  describe('search suggestions', () => {
    it('should generate suggestions from search results', async () => {
      logoStore.searchResults = mockLogos

      const { setSearchQuery, performSearch, searchSuggestions } = useLogoSearch()

      setSearchQuery('git')
      await performSearch()
      await nextTick()

      expect(searchSuggestions.value).toContain('GitHub')
      expect(searchSuggestions.value).toContain('git')
    })

    it('should filter suggestions based on query', async () => {
      logoStore.searchResults = mockLogos

      const { setSearchQuery, performSearch, searchSuggestions } = useLogoSearch()

      setSearchQuery('micro')
      await performSearch()
      await nextTick()

      expect(searchSuggestions.value).toContain('Microsoft')
      expect(searchSuggestions.value).not.toContain('GitHub')
    })

    it('should limit suggestions to 8 items', async () => {
      const manyLogos = Array.from({ length: 20 }, (_, i) => ({
        slug: `logo${i}`,
        name: `Logo ${i}`,
        description: `Description ${i}`,
        categories: [`category${i}`],
        tags: [`tag${i}`]
      }))

      logoStore.searchResults = manyLogos

      const { setSearchQuery, performSearch, searchSuggestions } = useLogoSearch()

      setSearchQuery('logo')
      await performSearch()
      await nextTick()

      expect(searchSuggestions.value.length).toBeLessThanOrEqual(8)
    })

    it('should select suggestion', () => {
      const { selectSuggestion, searchQuery } = useLogoSearch()

      selectSuggestion('GitHub')

      expect(searchQuery.value).toBe('GitHub')
    })
  })

  describe('state persistence', () => {
    it('should save state to localStorage', async () => {
      const { setSearchQuery, addCategoryFilter } = useLogoSearch()

      setSearchQuery('github')
      addCategoryFilter('development')
      await nextTick()

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'logobox-search-state',
        expect.stringContaining('"query":"github"')
      )
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'logobox-search-state',
        expect.stringContaining('"categories":["development"]')
      )
    })

    it('should not persist state when disabled', async () => {
      const { setSearchQuery } = useLogoSearch({ persistState: false })

      setSearchQuery('github')
      await nextTick()

      expect(localStorageMock.setItem).not.toHaveBeenCalled()
    })

    it('should handle localStorage save errors gracefully', async () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('localStorage error')
      })

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const { setSearchQuery } = useLogoSearch()

      setSearchQuery('github')
      await nextTick()

      expect(consoleSpy).toHaveBeenCalledWith('Failed to save search state:', expect.any(Error))
      
      consoleSpy.mockRestore()
    })
  })

  describe('clear functionality', () => {
    it('should clear all search state', () => {
      const { 
        setSearchQuery, 
        addCategoryFilter, 
        clearAll, 
        searchQuery, 
        searchFilters, 
        searchError,
        searchHistory,
        searchSuggestions
      } = useLogoSearch()

      // Set up some state
      setSearchQuery('github')
      addCategoryFilter('development')
      searchError.value = { message: 'Error' }
      searchHistory.value = ['github']
      searchSuggestions.value = ['GitHub']

      clearAll()

      expect(searchQuery.value).toBe('')
      expect(searchFilters.value).toEqual({ categories: [], tags: [] })
      expect(searchError.value).toBeNull()
      expect(searchHistory.value).toEqual([])
      expect(searchSuggestions.value).toEqual([])
      expect(logoStore.clearSearchResults).toHaveBeenCalled()
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('logobox-search-state')
    })
  })

  describe('computed properties', () => {
    it('should compute loading state correctly', () => {
      logoStore.searchLoading = true

      const { isLoading } = useLogoSearch()

      expect(isLoading.value).toBe(true)
    })

    it('should compute canSearch correctly', () => {
      const { setSearchQuery, canSearch } = useLogoSearch()

      expect(canSearch.value).toBe(false)

      setSearchQuery('github')
      expect(canSearch.value).toBe(true)
    })

    it('should compute hasActiveSearch correctly', () => {
      const { setSearchQuery, addCategoryFilter, hasActiveSearch } = useLogoSearch()

      expect(hasActiveSearch.value).toBe(false)

      setSearchQuery('github')
      expect(hasActiveSearch.value).toBe(true)

      setSearchQuery('')
      addCategoryFilter('development')
      expect(hasActiveSearch.value).toBe(true)
    })
  })

  describe('refresh functionality', () => {
    it('should refresh search when active', async () => {
      logoStore.searchResults = mockSearchResults.logos

      const { setSearchQuery, refreshSearch } = useLogoSearch()

      setSearchQuery('github')
      await refreshSearch()

      expect(logoStore.searchLogos).toHaveBeenCalledWith('github', expect.any(Object))
    })

    it('should not refresh when no active search', async () => {
      const { refreshSearch } = useLogoSearch()

      await refreshSearch()

      expect(logoStore.searchLogos).not.toHaveBeenCalled()
    })
  })

  describe('custom configuration', () => {
    it('should use custom debounce delay', async () => {
      vi.useFakeTimers()

      const { setSearchQuery } = useLogoSearch({ debounceDelay: 500 })

      // Clear any initial calls
      logoStore.searchLogos.mockClear()

      // Set query to trigger debounced search
      setSearchQuery('github')

      // Fast-forward time but not enough to trigger debounce
      vi.advanceTimersByTime(300)
      await nextTick()

      // Fast-forward remaining time to trigger debounce
      vi.advanceTimersByTime(200)
      await nextTick()

      // Should have been called after the full debounce delay
      expect(logoStore.searchLogos).toHaveBeenCalled()

      vi.useRealTimers()
    })

    it('should use custom max results', async () => {
      const { setSearchQuery, performSearch } = useLogoSearch({ maxResults: 50 })

      setSearchQuery('github')
      await performSearch()

      expect(logoStore.searchLogos).toHaveBeenCalledWith('github', {
        categories: [],
        tags: [],
        limit: 50
      })
    })

    it('should use custom storage key', async () => {
      const { setSearchQuery } = useLogoSearch({ storageKey: 'custom-search-key' })

      setSearchQuery('github')
      await nextTick()

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'custom-search-key',
        expect.any(String)
      )
    })
  })
})