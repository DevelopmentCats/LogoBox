<template>
  <div class="home-view">
    <!-- Hero Section -->
    <div class="hero-section">
      <h1 class="hero-title">Welcome to LogoBox</h1>
      <p class="hero-description">
        Browse and discover high-quality logos and icons for your projects.
        Search through thousands of logos from popular brands and services.
      </p>
    </div>

    <!-- Search Section -->
    <div class="search-section">
      <SearchBar
        v-model="searchQuery"
        placeholder="Search logos by name, category, or tag..."
        :show-suggestions="true"
        :show-history="true"
        @search="handleSearch"
        @clear="handleClearSearch"
      />
    </div>

    <!-- Filters and Results -->
    <div class="content-section">
      <div class="sidebar">
        <FilterPanel
          :show-categories="true"
          :show-tags="true"
          :initially-collapsed="false"
          @category-change="handleCategoryChange"
          @tag-change="handleTagChange"
          @clear-all="handleClearAllFilters"
        />
      </div>

      <div class="main-content">
        <!-- Results Summary -->
        <div v-if="hasSearchQuery || hasActiveFilters" class="results-header">
          <h2 class="results-title">
            <span v-if="hasSearchQuery">Search Results for "{{ searchQuery }}"</span>
            <span v-else>Filtered Results</span>
          </h2>
          <p class="results-count">
            {{ logoCount }} {{ logoCount === 1 ? 'logo' : 'logos' }} found
          </p>
        </div>

        <!-- Default Browse Header -->
        <div v-else class="browse-header">
          <h2 class="browse-title">Browse All Logos</h2>
          <p class="browse-description">
            Discover {{ totalLogos }} high-quality logos and icons
          </p>
        </div>

        <!-- Logo Grid -->
        <LogoGrid
          :logos="displayedLogos"
          :loading="isLoading"
          :error="error"
          :show-description="true"
          :show-metadata="true"
          :show-results-summary="false"
          :empty-title="emptyTitle"
          :empty-message="emptyMessage"
          @logo-click="handleLogoClick"
          @logo-download="handleLogoDownload"
          @logo-view="handleLogoView"
          @retry="handleRetry"
        />
      </div>
    </div>

    <!-- Loading Overlay -->
    <div v-if="isInitialLoading" class="loading-overlay">
      <div class="loading-content">
        <div class="loading-spinner">
          <svg width="32" height="32" viewBox="0 0 24 24">
            <circle 
              cx="12" 
              cy="12" 
              r="10" 
              stroke="currentColor" 
              stroke-width="2" 
              fill="none" 
              stroke-dasharray="60" 
              stroke-dashoffset="60" 
              stroke-linecap="round"
            >
              <animateTransform 
                attributeName="transform" 
                type="rotate" 
                values="0 12 12;360 12 12" 
                dur="1s" 
                repeatCount="indefinite"
              />
            </circle>
          </svg>
        </div>
        <p class="loading-text">Loading logo catalog...</p>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import SearchBar from '../components/SearchBar.vue'
import FilterPanel from '../components/FilterPanel.vue'
import LogoGrid from '../components/LogoGrid.vue'
import { useLogoStore } from '../stores/logoStore.js'
import { useLogoSearch } from '../composables/useLogoSearch.js'
import { useLogoFilters } from '../composables/useLogoFilters.js'

export default {
  name: 'HomeView',
  
  components: {
    SearchBar,
    FilterPanel,
    LogoGrid
  },
  
  setup() {
    const router = useRouter()
    const logoStore = useLogoStore()
    
    // Use composables
    const {
      searchQuery,
      searchResults,
      hasSearchQuery,
      hasActiveFilters: hasSearchFilters,
      isLoading: searchLoading,
      searchError
    } = useLogoSearch()
    
    const {
      selectedCategories,
      selectedTags,
      hasActiveFilters: filtersActive
    } = useLogoFilters()
    
    // Local state
    const isInitialLoading = ref(true)
    const error = ref(null)
    
    // Computed properties
    const isLoading = computed(() => 
      logoStore.isLoading || searchLoading.value || isInitialLoading.value
    )
    
    const hasActiveFilters = computed(() => 
      filtersActive.value || hasSearchFilters.value
    )
    
    const displayedLogos = computed(() => {
      if (hasSearchQuery.value || hasActiveFilters.value) {
        return searchResults.value
      }
      return logoStore.logos
    })
    
    const logoCount = computed(() => displayedLogos.value.length)
    
    const totalLogos = computed(() => logoStore.logoCount)
    
    const emptyTitle = computed(() => {
      if (hasSearchQuery.value) {
        return 'No logos found'
      }
      if (hasActiveFilters.value) {
        return 'No logos match your filters'
      }
      return 'No logos available'
    })
    
    const emptyMessage = computed(() => {
      if (hasSearchQuery.value) {
        return `No logos found for "${searchQuery.value}". Try a different search term or adjust your filters.`
      }
      if (hasActiveFilters.value) {
        return 'Try removing some filters or search for something else.'
      }
      return 'The logo catalog is currently empty. Please try again later.'
    })
    
    // Event handlers
    const handleSearch = (query) => {
      console.log('Search triggered:', query)
    }
    
    const handleClearSearch = () => {
      console.log('Search cleared')
    }
    
    const handleCategoryChange = (event) => {
      console.log('Category filter changed:', event)
    }
    
    const handleTagChange = (event) => {
      console.log('Tag filter changed:', event)
    }
    
    const handleClearAllFilters = () => {
      console.log('All filters cleared')
    }
    
    const handleLogoClick = (event) => {
      const { logo } = event
      router.push(`/logos/${logo.slug}`)
    }
    
    const handleLogoDownload = (event) => {
      const { logo, url } = event
      // Create download link
      const link = document.createElement('a')
      link.href = url
      link.download = `${logo.slug}-logo.svg`
      link.target = '_blank'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
    
    const handleLogoView = (event) => {
      const { logo } = event
      router.push(`/logos/${logo.slug}`)
    }
    
    const handleRetry = () => {
      loadCatalog()
    }
    
    // Load catalog data
    const loadCatalog = async () => {
      try {
        error.value = null
        await logoStore.loadCatalog()
      } catch (err) {
        error.value = err.message || 'Failed to load logo catalog'
        console.error('Failed to load catalog:', err)
      } finally {
        isInitialLoading.value = false
      }
    }
    
    // Watch for store errors
    watch(() => logoStore.error, (newError) => {
      if (newError) {
        error.value = newError.message || 'An error occurred'
      }
    })
    
    watch(() => searchError.value, (newError) => {
      if (newError) {
        error.value = newError.message || 'Search failed'
      }
    })
    
    // Initialize
    onMounted(() => {
      loadCatalog()
    })
    
    return {
      // State
      searchQuery,
      isInitialLoading,
      error,
      
      // Computed
      isLoading,
      hasSearchQuery,
      hasActiveFilters,
      displayedLogos,
      logoCount,
      totalLogos,
      emptyTitle,
      emptyMessage,
      
      // Methods
      handleSearch,
      handleClearSearch,
      handleCategoryChange,
      handleTagChange,
      handleClearAllFilters,
      handleLogoClick,
      handleLogoDownload,
      handleLogoView,
      handleRetry
    }
  }
}
</script>

<style scoped>
.home-view {
  position: relative;
  min-height: 100vh;
}

/* Hero Section */
.hero-section {
  text-align: center;
  margin-bottom: 2rem;
}

.hero-title {
  font-size: 2.5rem;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 1rem;
  line-height: 1.2;
}

.hero-description {
  font-size: 1.125rem;
  color: #6b7280;
  max-width: 600px;
  margin: 0 auto;
  line-height: 1.6;
}

/* Search Section */
.search-section {
  display: flex;
  justify-content: center;
  margin-bottom: 2rem;
}

/* Content Layout */
.content-section {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 2rem;
  align-items: start;
}

.sidebar {
  position: sticky;
  top: 2rem;
}

.main-content {
  min-width: 0; /* Prevent grid overflow */
}

/* Results Header */
.results-header,
.browse-header {
  margin-bottom: 1.5rem;
}

.results-title,
.browse-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 0.5rem;
}

.results-count,
.browse-description {
  color: #6b7280;
  font-size: 0.875rem;
}

/* Loading Overlay */
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.loading-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.loading-spinner {
  color: #3b82f6;
}

.loading-text {
  font-size: 1rem;
  color: #6b7280;
  font-weight: 500;
}

/* Responsive Design */
@media (max-width: 1024px) {
  .content-section {
    grid-template-columns: 240px 1fr;
    gap: 1.5rem;
  }
  
  .hero-title {
    font-size: 2rem;
  }
}

@media (max-width: 768px) {
  .content-section {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
  
  .sidebar {
    position: static;
    order: 2;
  }
  
  .main-content {
    order: 1;
  }
  
  .hero-title {
    font-size: 1.75rem;
  }
  
  .hero-description {
    font-size: 1rem;
  }
}

@media (max-width: 640px) {
  .hero-section {
    margin-bottom: 1.5rem;
  }
  
  .search-section {
    margin-bottom: 1.5rem;
  }
  
  .hero-title {
    font-size: 1.5rem;
  }
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .hero-title,
  .results-title,
  .browse-title {
    color: #f9fafb;
  }
  
  .hero-description,
  .results-count,
  .browse-description {
    color: #d1d5db;
  }
  
  .loading-overlay {
    background: rgba(17, 24, 39, 0.9);
  }
  
  .loading-text {
    color: #d1d5db;
  }
}

/* High contrast mode */
@media (prefers-contrast: high) {
  .hero-title,
  .results-title,
  .browse-title {
    font-weight: 800;
  }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .loading-spinner svg {
    animation: none;
  }
  
  .sidebar {
    position: static;
  }
}

/* Print styles */
@media print {
  .loading-overlay {
    display: none;
  }
  
  .search-section {
    display: none;
  }
  
  .sidebar {
    display: none;
  }
  
  .content-section {
    grid-template-columns: 1fr;
  }
}
</style>