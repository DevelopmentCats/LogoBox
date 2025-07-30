/**
 * Unit tests for useLogoFilters composable
 * Tests filtering logic, state management, and URL synchronization
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { nextTick, ref } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { useLogoFilters } from '../../composables/useLogoFilters.js'
import { useLogoStore } from '../../stores/logoStore.js'

// Mock browser environment
Object.defineProperty(global, 'window', {
  value: {
    location: { href: 'http://localhost:3000/' },
    history: { pushState: vi.fn(), replaceState: vi.fn() }
  },
  writable: true
})

// Mock localStorage
const mockLocalStorage = {
  store: {},
  getItem: vi.fn((key) => mockLocalStorage.store[key] || null),
  setItem: vi.fn((key, value) => { mockLocalStorage.store[key] = value }),
  removeItem: vi.fn((key) => { delete mockLocalStorage.store[key] }),
  clear: vi.fn(() => { mockLocalStorage.store = {} })
}

// Mock Vue Router composables
const mockRoute = ref({ query: {} })
const mockRouter = {
  replace: vi.fn().mockResolvedValue(),
  push: vi.fn().mockResolvedValue(),
  currentRoute: mockRoute
}

vi.mock('vue-router', () => ({
  useRouter: () => mockRouter,
  useRoute: () => mockRoute.value
}))

// Helper to create mock router state
const createMockRouter = (initialQuery = {}) => {
  mockRoute.value = { query: initialQuery }
  mockRouter.replace.mockClear()
  mockRouter.push.mockClear()
  return mockRouter
}

// Mock logo store data
const mockCatalogData = {
  categories: ['technology', 'social', 'finance', 'design'],
  tags: ['javascript', 'react', 'vue', 'node', 'api', 'database'],
  logos: [
    {
      slug: 'github',
      name: 'GitHub',
      categories: ['technology'],
      tags: ['javascript', 'api']
    },
    {
      slug: 'facebook',
      name: 'Facebook',
      categories: ['social'],
      tags: ['react', 'api']
    },
    {
      slug: 'stripe',
      name: 'Stripe',
      categories: ['finance'],
      tags: ['api', 'javascript']
    }
  ]
}

describe('useLogoFilters', () => {
  let pinia
  let router
  let logoStore

  beforeEach(async () => {
    // Setup Pinia
    pinia = createPinia()
    setActivePinia(pinia)
    
    // Setup router
    router = createMockRouter()
    
    // Setup logo store with mock data
    logoStore = useLogoStore()
    logoStore.setCategories(mockCatalogData.categories)
    logoStore.setTags(mockCatalogData.tags)
    logoStore.setLogos(mockCatalogData.logos)
    
    // Mock localStorage
    Object.defineProperty(global, 'localStorage', {
      value: mockLocalStorage,
      writable: true
    })
    
    // Clear localStorage before each test
    mockLocalStorage.clear()
    
    // Mock console.warn to avoid noise in tests
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.clearAllMocks()
    mockLocalStorage.clear()
  })

  describe('Initialization', () => {
    it('should initialize with empty filters by default', async () => {
      const { selectedCategories, selectedTags, isInitialized } = useLogoFilters()
      
      await nextTick()
      
      expect(isInitialized.value).toBe(true)
      expect(selectedCategories.value).toEqual([])
      expect(selectedTags.value).toEqual([])
    })

    it('should initialize from URL parameters', async () => {
      createMockRouter({
        categories: ['technology', 'social'],
        tags: 'javascript'
      })
      
      const { selectedCategories, selectedTags } = useLogoFilters()
      
      await nextTick()
      
      expect(selectedCategories.value).toEqual(['technology', 'social'])
      expect(selectedTags.value).toEqual(['javascript'])
    })

    it('should initialize from localStorage when no URL parameters', async () => {
      const savedState = {
        selectedCategories: ['finance'],
        selectedTags: ['api', 'database'],
        timestamp: Date.now()
      }
      mockLocalStorage.setItem('logobox-filter-state', JSON.stringify(savedState))
      
      const { selectedCategories, selectedTags } = useLogoFilters()
      
      await nextTick()
      
      expect(selectedCategories.value).toEqual(['finance'])
      expect(selectedTags.value).toEqual(['api', 'database'])
    })

    it('should ignore stale localStorage data', async () => {
      const staleState = {
        selectedCategories: ['finance'],
        selectedTags: ['api'],
        timestamp: Date.now() - (25 * 60 * 60 * 1000) // 25 hours ago
      }
      mockLocalStorage.setItem('logobox-filter-state', JSON.stringify(staleState))
      
      const { selectedCategories, selectedTags } = useLogoFilters()
      
      await nextTick()
      
      expect(selectedCategories.value).toEqual([])
      expect(selectedTags.value).toEqual([])
    })
  })

  describe('Computed Properties', () => {
    it('should provide available categories and tags from store', async () => {
      const { availableCategories, availableTags } = useLogoFilters()
      
      await nextTick()
      
      expect(availableCategories.value).toEqual([
        { name: 'technology', count: 1 },
        { name: 'social', count: 1 },
        { name: 'finance', count: 1 },
        { name: 'design', count: 0 }
      ])
      
      expect(availableTags.value).toEqual([
        { name: 'javascript', count: 2 },
        { name: 'react', count: 1 },
        { name: 'vue', count: 0 },
        { name: 'node', count: 0 },
        { name: 'api', count: 3 },
        { name: 'database', count: 0 }
      ])
    })

    it('should correctly compute hasActiveFilters', async () => {
      const { hasActiveFilters, addCategoryFilter, addTagFilter } = useLogoFilters()
      
      await nextTick()
      
      expect(hasActiveFilters.value).toBe(false)
      
      addCategoryFilter('technology')
      expect(hasActiveFilters.value).toBe(true)
      
      addTagFilter('javascript')
      expect(hasActiveFilters.value).toBe(true)
    })

    it('should correctly compute activeFilterCount', async () => {
      const { activeFilterCount, addCategoryFilter, addTagFilter } = useLogoFilters()
      
      await nextTick()
      
      expect(activeFilterCount.value).toBe(0)
      
      addCategoryFilter('technology')
      expect(activeFilterCount.value).toBe(1)
      
      addTagFilter('javascript')
      expect(activeFilterCount.value).toBe(2)
      
      addCategoryFilter('social')
      expect(activeFilterCount.value).toBe(3)
    })

    it('should provide filtered and unselected categories/tags', async () => {
      const { 
        filteredCategories, 
        filteredTags, 
        unselectedCategories, 
        unselectedTags,
        addCategoryFilter,
        addTagFilter
      } = useLogoFilters()
      
      await nextTick()
      
      addCategoryFilter('technology')
      addTagFilter('javascript')
      
      expect(filteredCategories.value).toEqual([
        { name: 'technology', count: 1 }
      ])
      
      expect(filteredTags.value).toEqual([
        { name: 'javascript', count: 2 }
      ])
      
      expect(unselectedCategories.value).toEqual([
        { name: 'social', count: 1 },
        { name: 'finance', count: 1 },
        { name: 'design', count: 0 }
      ])
      
      expect(unselectedTags.value.length).toBe(5) // All except 'javascript'
    })
  })

  describe('Category Management', () => {
    it('should add valid categories', async () => {
      const { selectedCategories, addCategoryFilter } = useLogoFilters()
      
      await nextTick()
      
      const result = addCategoryFilter('technology')
      expect(result).toBe(true)
      expect(selectedCategories.value).toEqual(['technology'])
    })

    it('should not add duplicate categories', async () => {
      const { selectedCategories, addCategoryFilter } = useLogoFilters()
      
      await nextTick()
      
      addCategoryFilter('technology')
      const result = addCategoryFilter('technology')
      
      expect(result).toBe(false)
      expect(selectedCategories.value).toEqual(['technology'])
    })

    it('should not add invalid categories', async () => {
      const { selectedCategories, addCategoryFilter } = useLogoFilters()
      
      await nextTick()
      
      const result = addCategoryFilter('invalid-category')
      expect(result).toBe(false)
      expect(selectedCategories.value).toEqual([])
      expect(console.warn).toHaveBeenCalledWith('Invalid category: invalid-category')
    })

    it('should remove categories', async () => {
      const { selectedCategories, addCategoryFilter, removeCategoryFilter } = useLogoFilters()
      
      await nextTick()
      
      addCategoryFilter('technology')
      addCategoryFilter('social')
      
      const result = removeCategoryFilter('technology')
      expect(result).toBe(true)
      expect(selectedCategories.value).toEqual(['social'])
    })

    it('should toggle categories', async () => {
      const { selectedCategories, toggleCategoryFilter } = useLogoFilters()
      
      await nextTick()
      
      // Add category
      let result = toggleCategoryFilter('technology')
      expect(result).toBe(true)
      expect(selectedCategories.value).toEqual(['technology'])
      
      // Remove category
      result = toggleCategoryFilter('technology')
      expect(result).toBe(true)
      expect(selectedCategories.value).toEqual([])
    })

    it('should set multiple categories', async () => {
      const { selectedCategories, setCategoryFilters } = useLogoFilters()
      
      await nextTick()
      
      setCategoryFilters(['technology', 'social', 'invalid-category'])
      expect(selectedCategories.value).toEqual(['technology', 'social'])
    })

    it('should clear all categories', async () => {
      const { selectedCategories, addCategoryFilter, clearCategoryFilters } = useLogoFilters()
      
      await nextTick()
      
      addCategoryFilter('technology')
      addCategoryFilter('social')
      
      clearCategoryFilters()
      expect(selectedCategories.value).toEqual([])
    })
  })

  describe('Tag Management', () => {
    it('should add valid tags', async () => {
      const { selectedTags, addTagFilter } = useLogoFilters()
      
      await nextTick()
      
      const result = addTagFilter('javascript')
      expect(result).toBe(true)
      expect(selectedTags.value).toEqual(['javascript'])
    })

    it('should not add duplicate tags', async () => {
      const { selectedTags, addTagFilter } = useLogoFilters()
      
      await nextTick()
      
      addTagFilter('javascript')
      const result = addTagFilter('javascript')
      
      expect(result).toBe(false)
      expect(selectedTags.value).toEqual(['javascript'])
    })

    it('should not add invalid tags', async () => {
      const { selectedTags, addTagFilter } = useLogoFilters()
      
      await nextTick()
      
      const result = addTagFilter('invalid-tag')
      expect(result).toBe(false)
      expect(selectedTags.value).toEqual([])
      expect(console.warn).toHaveBeenCalledWith('Invalid tag: invalid-tag')
    })

    it('should remove tags', async () => {
      const { selectedTags, addTagFilter, removeTagFilter } = useLogoFilters()
      
      await nextTick()
      
      addTagFilter('javascript')
      addTagFilter('react')
      
      const result = removeTagFilter('javascript')
      expect(result).toBe(true)
      expect(selectedTags.value).toEqual(['react'])
    })

    it('should toggle tags', async () => {
      const { selectedTags, toggleTagFilter } = useLogoFilters()
      
      await nextTick()
      
      // Add tag
      let result = toggleTagFilter('javascript')
      expect(result).toBe(true)
      expect(selectedTags.value).toEqual(['javascript'])
      
      // Remove tag
      result = toggleTagFilter('javascript')
      expect(result).toBe(true)
      expect(selectedTags.value).toEqual([])
    })

    it('should set multiple tags', async () => {
      const { selectedTags, setTagFilters } = useLogoFilters()
      
      await nextTick()
      
      setTagFilters(['javascript', 'react', 'invalid-tag'])
      expect(selectedTags.value).toEqual(['javascript', 'react'])
    })

    it('should clear all tags', async () => {
      const { selectedTags, addTagFilter, clearTagFilters } = useLogoFilters()
      
      await nextTick()
      
      addTagFilter('javascript')
      addTagFilter('react')
      
      clearTagFilters()
      expect(selectedTags.value).toEqual([])
    })
  })

  describe('Combined Filter Management', () => {
    it('should clear all filters', async () => {
      const { 
        selectedCategories, 
        selectedTags, 
        addCategoryFilter, 
        addTagFilter, 
        clearAllFilters 
      } = useLogoFilters()
      
      await nextTick()
      
      addCategoryFilter('technology')
      addTagFilter('javascript')
      
      clearAllFilters()
      expect(selectedCategories.value).toEqual([])
      expect(selectedTags.value).toEqual([])
    })

    it('should set filters with object', async () => {
      const { selectedCategories, selectedTags, setFilters } = useLogoFilters()
      
      await nextTick()
      
      setFilters(['technology', 'social'], ['javascript', 'react'])
      expect(selectedCategories.value).toEqual(['technology', 'social'])
      expect(selectedTags.value).toEqual(['javascript', 'react'])
    })

    it('should get active filters', async () => {
      const { addCategoryFilter, addTagFilter, getActiveFilters } = useLogoFilters()
      
      await nextTick()
      
      addCategoryFilter('technology')
      addTagFilter('javascript')
      
      const activeFilters = getActiveFilters()
      expect(activeFilters).toEqual({
        categories: ['technology'],
        tags: ['javascript']
      })
    })

    it('should apply filters from object', async () => {
      const { selectedCategories, selectedTags, applyFilters } = useLogoFilters()
      
      await nextTick()
      
      applyFilters({
        categories: ['technology', 'social'],
        tags: ['javascript']
      })
      
      expect(selectedCategories.value).toEqual(['technology', 'social'])
      expect(selectedTags.value).toEqual(['javascript'])
    })
  })

  describe('Bulk Operations', () => {
    it('should add multiple categories', async () => {
      const { selectedCategories, addMultipleCategories } = useLogoFilters()
      
      await nextTick()
      
      const count = addMultipleCategories(['technology', 'social', 'invalid'])
      expect(count).toBe(2)
      expect(selectedCategories.value).toEqual(['technology', 'social'])
    })

    it('should add multiple tags', async () => {
      const { selectedTags, addMultipleTags } = useLogoFilters()
      
      await nextTick()
      
      const count = addMultipleTags(['javascript', 'react', 'invalid'])
      expect(count).toBe(2)
      expect(selectedTags.value).toEqual(['javascript', 'react'])
    })

    it('should remove multiple categories', async () => {
      const { selectedCategories, setCategoryFilters, removeMultipleCategories } = useLogoFilters()
      
      await nextTick()
      
      setCategoryFilters(['technology', 'social', 'finance'])
      
      const count = removeMultipleCategories(['technology', 'finance', 'invalid'])
      expect(count).toBe(2)
      expect(selectedCategories.value).toEqual(['social'])
    })

    it('should remove multiple tags', async () => {
      const { selectedTags, setTagFilters, removeMultipleTags } = useLogoFilters()
      
      await nextTick()
      
      setTagFilters(['javascript', 'react', 'api'])
      
      const count = removeMultipleTags(['javascript', 'api', 'invalid'])
      expect(count).toBe(2)
      expect(selectedTags.value).toEqual(['react'])
    })
  })

  describe('State Persistence', () => {
    it('should save state to localStorage', async () => {
      const { addCategoryFilter, addTagFilter } = useLogoFilters()
      
      await nextTick()
      
      addCategoryFilter('technology')
      addTagFilter('javascript')
      
      // Wait for watchers to trigger
      await nextTick()
      
      expect(mockLocalStorage.setItem).toHaveBeenCalled()
      const savedData = JSON.parse(mockLocalStorage.store['logobox-filter-state'])
      expect(savedData.selectedCategories).toEqual(['technology'])
      expect(savedData.selectedTags).toEqual(['javascript'])
    })

    it('should not persist when disabled', async () => {
      const { addCategoryFilter } = useLogoFilters({ persistState: false })
      
      await nextTick()
      
      addCategoryFilter('technology')
      
      // Wait for watchers to trigger
      await nextTick()
      
      expect(mockLocalStorage.setItem).not.toHaveBeenCalled()
    })
  })

  describe('URL Synchronization', () => {
    it('should update URL when filters change', async () => {
      const { addCategoryFilter, addTagFilter } = useLogoFilters()
      
      await nextTick()
      
      addCategoryFilter('technology')
      addTagFilter('javascript')
      
      // Wait for watchers to trigger
      await nextTick()
      
      expect(mockRouter.replace).toHaveBeenCalledWith({
        query: {
          categories: 'technology',
          tags: 'javascript'
        }
      })
    })

    it('should handle multiple filters in URL', async () => {
      const { addMultipleCategories, addMultipleTags } = useLogoFilters()
      
      await nextTick()
      
      addMultipleCategories(['technology', 'social'])
      addMultipleTags(['javascript', 'react'])
      
      // Wait for watchers to trigger
      await nextTick()
      
      expect(mockRouter.replace).toHaveBeenCalledWith({
        query: {
          categories: ['technology', 'social'],
          tags: ['javascript', 'react']
        }
      })
    })

    it('should not sync URL when disabled', async () => {
      const { addCategoryFilter } = useLogoFilters({ syncWithUrl: false })
      
      await nextTick()
      
      addCategoryFilter('technology')
      
      // Wait for watchers to trigger
      await nextTick()
      
      expect(mockRouter.replace).not.toHaveBeenCalled()
    })

    it('should limit filters in URL to prevent long URLs', async () => {
      const { addMultipleCategories } = useLogoFilters({ maxFiltersInUrl: 2 })
      
      await nextTick()
      
      // Try to add more categories than the limit
      addMultipleCategories(['technology', 'social', 'finance'])
      
      // Wait for watchers to trigger
      await nextTick()
      
      expect(mockRouter.replace).toHaveBeenCalledWith({
        query: {
          categories: ['technology', 'social'] // Only first 2
        }
      })
    })
  })

  describe('Store Integration', () => {
    it('should update logo store filters when local filters change', async () => {
      const { addCategoryFilter, addTagFilter } = useLogoFilters()
      
      await nextTick()
      
      addCategoryFilter('technology')
      addTagFilter('javascript')
      
      // Wait for watchers to trigger
      await nextTick()
      
      expect(logoStore.searchFilters.categories).toEqual(['technology'])
      expect(logoStore.searchFilters.tags).toEqual(['javascript'])
    })
  })

  describe('Validation', () => {
    it('should validate categories correctly', async () => {
      const { isValidCategory } = useLogoFilters()
      
      await nextTick()
      
      expect(isValidCategory('technology')).toBe(true)
      expect(isValidCategory('invalid-category')).toBe(false)
    })

    it('should validate tags correctly', async () => {
      const { isValidTag } = useLogoFilters()
      
      await nextTick()
      
      expect(isValidTag('javascript')).toBe(true)
      expect(isValidTag('invalid-tag')).toBe(false)
    })
  })

  describe('Error Handling', () => {
    it('should handle localStorage errors gracefully', async () => {
      const { addCategoryFilter } = useLogoFilters()
      
      await nextTick()
      
      // Mock localStorage error after initialization
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded')
      })
      
      // Should not throw error
      expect(() => addCategoryFilter('technology')).not.toThrow()
      
      // Wait for watcher to trigger
      await nextTick()
      
      expect(console.warn).toHaveBeenCalledWith('Failed to save filter state:', expect.any(Error))
    })

    it('should handle malformed localStorage data', async () => {
      mockLocalStorage.getItem.mockReturnValue('invalid-json')
      
      const { selectedCategories, selectedTags } = useLogoFilters()
      
      await nextTick()
      
      expect(selectedCategories.value).toEqual([])
      expect(selectedTags.value).toEqual([])
      expect(console.warn).toHaveBeenCalledWith('Failed to load filter state:', expect.any(Error))
    })

    it('should handle router navigation errors gracefully', async () => {
      mockRouter.replace.mockRejectedValue(new Error('Navigation cancelled'))
      
      const { addCategoryFilter } = useLogoFilters()
      
      await nextTick()
      
      // Should not throw error
      expect(() => addCategoryFilter('technology')).not.toThrow()
    })
  })
})