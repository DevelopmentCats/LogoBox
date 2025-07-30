/**
 * Logo Filters Composable
 * Provides multi-select category and tag filtering with URL synchronization and state management
 */

import { ref, computed, watch, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useLogoStore } from '../stores/logoStore.js'

/**
 * Default configuration for the filters composable
 */
const DEFAULT_CONFIG = {
  persistState: true,
  syncWithUrl: true,
  storageKey: 'logobox-filter-state',
  urlParams: {
    categories: 'categories',
    tags: 'tags'
  },
  maxFiltersInUrl: 10 // Prevent URL from becoming too long
}

/**
 * Filter state persistence utilities factory
 */
const createFilterStateStorage = (storageKey) => ({
  save(state) {
    try {
      const stateToSave = {
        selectedCategories: state.selectedCategories,
        selectedTags: state.selectedTags,
        timestamp: Date.now()
      }
      localStorage.setItem(storageKey, JSON.stringify(stateToSave))
    } catch (error) {
      console.warn('Failed to save filter state:', error)
    }
  },

  load() {
    try {
      const saved = localStorage.getItem(storageKey)
      if (!saved) return null

      const state = JSON.parse(saved)
      
      // Check if state is not too old (24 hours)
      const maxAge = 24 * 60 * 60 * 1000 // 24 hours
      if (Date.now() - state.timestamp > maxAge) {
        localStorage.removeItem(storageKey)
        return null
      }

      return {
        selectedCategories: state.selectedCategories || [],
        selectedTags: state.selectedTags || []
      }
    } catch (error) {
      console.warn('Failed to load filter state:', error)
      return null
    }
  },

  clear() {
    try {
      localStorage.removeItem(storageKey)
    } catch (error) {
      console.warn('Failed to clear filter state:', error)
    }
  }
})

/**
 * URL synchronization utilities
 */
const createUrlSync = (router, route, config) => ({
  parseFiltersFromUrl() {
    const query = route.query
    const categories = query[config.urlParams.categories]
    const tags = query[config.urlParams.tags]

    return {
      selectedCategories: categories ? 
        (Array.isArray(categories) ? categories : [categories]) : [],
      selectedTags: tags ? 
        (Array.isArray(tags) ? tags : [tags]) : []
    }
  },

  updateUrl(selectedCategories, selectedTags) {
    const query = { ...route.query }

    // Update categories in URL
    if (selectedCategories.length > 0) {
      const categoriesToSync = selectedCategories.slice(0, config.maxFiltersInUrl)
      query[config.urlParams.categories] = categoriesToSync.length === 1 ? 
        categoriesToSync[0] : categoriesToSync
    } else {
      delete query[config.urlParams.categories]
    }

    // Update tags in URL
    if (selectedTags.length > 0) {
      const tagsToSync = selectedTags.slice(0, config.maxFiltersInUrl)
      query[config.urlParams.tags] = tagsToSync.length === 1 ? 
        tagsToSync[0] : tagsToSync
    } else {
      delete query[config.urlParams.tags]
    }

    // Only update URL if query has changed
    const currentQuery = JSON.stringify(route.query)
    const newQuery = JSON.stringify(query)
    
    if (currentQuery !== newQuery) {
      router.replace({ query }).catch(() => {
        // Ignore navigation errors (e.g., duplicate navigation)
      })
    }
  }
})

/**
 * Logo Filters Composable
 * @param {Object} options - Configuration options
 * @returns {Object} Filter state and methods
 */
export function useLogoFilters(options = {}) {
  const config = { ...DEFAULT_CONFIG, ...options }
  const logoStore = useLogoStore()
  const router = useRouter()
  const route = useRoute()
  
  const filterStateStorage = createFilterStateStorage(config.storageKey)
  const urlSync = createUrlSync(router, route, config)

  // Reactive state
  const selectedCategories = ref([])
  const selectedTags = ref([])
  const isInitialized = ref(false)

  // Initialize state from URL, localStorage, or defaults
  const initializeState = () => {
    let initialState = { selectedCategories: [], selectedTags: [] }

    // Priority 1: URL parameters (highest priority)
    if (config.syncWithUrl) {
      const urlState = urlSync.parseFiltersFromUrl()
      if (urlState.selectedCategories.length > 0 || urlState.selectedTags.length > 0) {
        initialState = urlState
      }
    }

    // Priority 2: localStorage (if no URL state and persistence enabled)
    if (config.persistState && 
        initialState.selectedCategories.length === 0 && 
        initialState.selectedTags.length === 0) {
      const savedState = filterStateStorage.load()
      if (savedState) {
        initialState = savedState
      }
    }

    selectedCategories.value = initialState.selectedCategories
    selectedTags.value = initialState.selectedTags
    isInitialized.value = true
  }

  // Computed properties
  const availableCategories = computed(() => logoStore.availableCategories)
  
  const availableTags = computed(() => logoStore.availableTags)

  const hasActiveFilters = computed(() => 
    selectedCategories.value.length > 0 || selectedTags.value.length > 0
  )

  const activeFilterCount = computed(() => 
    selectedCategories.value.length + selectedTags.value.length
  )

  const filteredCategories = computed(() => 
    availableCategories.value.filter(category => 
      selectedCategories.value.includes(category.name)
    )
  )

  const filteredTags = computed(() => 
    availableTags.value.filter(tag => 
      selectedTags.value.includes(tag.name)
    )
  )

  const unselectedCategories = computed(() => 
    availableCategories.value.filter(category => 
      !selectedCategories.value.includes(category.name)
    )
  )

  const unselectedTags = computed(() => 
    availableTags.value.filter(tag => 
      !selectedTags.value.includes(tag.name)
    )
  )

  // Filter validation
  const isValidCategory = (category) => {
    return availableCategories.value.some(cat => cat.name === category)
  }

  const isValidTag = (tag) => {
    return availableTags.value.some(t => t.name === tag)
  }

  // Category management methods
  const addCategoryFilter = (category) => {
    if (!category || selectedCategories.value.includes(category)) {
      return false
    }

    if (!isValidCategory(category)) {
      console.warn(`Invalid category: ${category}`)
      return false
    }

    selectedCategories.value.push(category)
    return true
  }

  const removeCategoryFilter = (category) => {
    const index = selectedCategories.value.indexOf(category)
    if (index !== -1) {
      selectedCategories.value.splice(index, 1)
      return true
    }
    return false
  }

  const toggleCategoryFilter = (category) => {
    if (selectedCategories.value.includes(category)) {
      return removeCategoryFilter(category)
    } else {
      return addCategoryFilter(category)
    }
  }

  const setCategoryFilters = (categories) => {
    const validCategories = categories.filter(isValidCategory)
    selectedCategories.value = [...validCategories]
  }

  const clearCategoryFilters = () => {
    selectedCategories.value = []
  }

  // Tag management methods
  const addTagFilter = (tag) => {
    if (!tag || selectedTags.value.includes(tag)) {
      return false
    }

    if (!isValidTag(tag)) {
      console.warn(`Invalid tag: ${tag}`)
      return false
    }

    selectedTags.value.push(tag)
    return true
  }

  const removeTagFilter = (tag) => {
    const index = selectedTags.value.indexOf(tag)
    if (index !== -1) {
      selectedTags.value.splice(index, 1)
      return true
    }
    return false
  }

  const toggleTagFilter = (tag) => {
    if (selectedTags.value.includes(tag)) {
      return removeTagFilter(tag)
    } else {
      return addTagFilter(tag)
    }
  }

  const setTagFilters = (tags) => {
    const validTags = tags.filter(isValidTag)
    selectedTags.value = [...validTags]
  }

  const clearTagFilters = () => {
    selectedTags.value = []
  }

  // Combined filter management
  const clearAllFilters = () => {
    selectedCategories.value = []
    selectedTags.value = []
  }

  const setFilters = (categories = [], tags = []) => {
    setCategoryFilters(categories)
    setTagFilters(tags)
  }

  const getActiveFilters = () => ({
    categories: [...selectedCategories.value],
    tags: [...selectedTags.value]
  })

  const applyFilters = (filters) => {
    if (filters.categories) {
      setCategoryFilters(filters.categories)
    }
    if (filters.tags) {
      setTagFilters(filters.tags)
    }
  }

  // Bulk operations
  const addMultipleCategories = (categories) => {
    let addedCount = 0
    categories.forEach(category => {
      if (addCategoryFilter(category)) {
        addedCount++
      }
    })
    return addedCount
  }

  const addMultipleTags = (tags) => {
    let addedCount = 0
    tags.forEach(tag => {
      if (addTagFilter(tag)) {
        addedCount++
      }
    })
    return addedCount
  }

  const removeMultipleCategories = (categories) => {
    let removedCount = 0
    categories.forEach(category => {
      if (removeCategoryFilter(category)) {
        removedCount++
      }
    })
    return removedCount
  }

  const removeMultipleTags = (tags) => {
    let removedCount = 0
    tags.forEach(tag => {
      if (removeTagFilter(tag)) {
        removedCount++
      }
    })
    return removedCount
  }

  // State synchronization watchers
  if (config.syncWithUrl) {
    watch([selectedCategories, selectedTags], () => {
      if (isInitialized.value) {
        urlSync.updateUrl(selectedCategories.value, selectedTags.value)
      }
    }, { deep: true })

    // Watch for URL changes (e.g., browser back/forward)
    watch(() => route.query, () => {
      if (isInitialized.value) {
        const urlState = urlSync.parseFiltersFromUrl()
        
        // Only update if URL state is different from current state
        const currentState = JSON.stringify({
          categories: selectedCategories.value.sort(),
          tags: selectedTags.value.sort()
        })
        const urlStateStr = JSON.stringify({
          categories: urlState.selectedCategories.sort(),
          tags: urlState.selectedTags.sort()
        })
        
        if (currentState !== urlStateStr) {
          selectedCategories.value = urlState.selectedCategories
          selectedTags.value = urlState.selectedTags
        }
      }
    }, { deep: true })
  }

  // Persist state changes
  if (config.persistState) {
    watch([selectedCategories, selectedTags], () => {
      if (isInitialized.value) {
        filterStateStorage.save({
          selectedCategories: selectedCategories.value,
          selectedTags: selectedTags.value
        })
      }
    }, { deep: true })
  }

  // Update store filters when local filters change
  watch([selectedCategories, selectedTags], () => {
    if (isInitialized.value) {
      logoStore.setSearchFilters({
        categories: selectedCategories.value,
        tags: selectedTags.value
      })
    }
  }, { deep: true })

  // Initialize state on next tick to ensure router is ready
  nextTick(() => {
    initializeState()
  })

  return {
    // Reactive state
    selectedCategories,
    selectedTags,
    isInitialized,

    // Computed properties
    availableCategories,
    availableTags,
    hasActiveFilters,
    activeFilterCount,
    filteredCategories,
    filteredTags,
    unselectedCategories,
    unselectedTags,

    // Validation methods
    isValidCategory,
    isValidTag,

    // Category management
    addCategoryFilter,
    removeCategoryFilter,
    toggleCategoryFilter,
    setCategoryFilters,
    clearCategoryFilters,

    // Tag management
    addTagFilter,
    removeTagFilter,
    toggleTagFilter,
    setTagFilters,
    clearTagFilters,

    // Combined filter management
    clearAllFilters,
    setFilters,
    getActiveFilters,
    applyFilters,

    // Bulk operations
    addMultipleCategories,
    addMultipleTags,
    removeMultipleCategories,
    removeMultipleTags
  }
}

export default useLogoFilters