<template>
  <div 
    ref="gridContainer"
    class="logo-grid"
    :class="{
      'logo-grid--loading': isLoading,
      'logo-grid--empty': isEmpty,
      'logo-grid--error': hasError
    }"
    role="grid"
    :aria-label="gridAriaLabel"
    :aria-busy="isLoading"
  >
    <!-- Loading state -->
    <div v-if="isLoading && !hasLogos" class="logo-grid__loading">
      <div class="logo-grid__loading-spinner">
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
      <p class="logo-grid__loading-text">Loading logos...</p>
    </div>

    <!-- Error state -->
    <div v-else-if="hasError" class="logo-grid__error">
      <div class="logo-grid__error-icon">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
      </div>
      <h3 class="logo-grid__error-title">Failed to load logos</h3>
      <p class="logo-grid__error-message">{{ errorMessage }}</p>
      <button 
        type="button"
        class="logo-grid__error-retry"
        @click="handleRetry"
      >
        Try Again
      </button>
    </div>

    <!-- Empty state -->
    <div v-else-if="isEmpty" class="logo-grid__empty">
      <div class="logo-grid__empty-icon">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"></circle>
          <path d="m21 21-4.35-4.35"></path>
        </svg>
      </div>
      <h3 class="logo-grid__empty-title">{{ emptyTitle }}</h3>
      <p class="logo-grid__empty-message">{{ emptyMessage }}</p>
    </div>

    <!-- Virtual scrolling container -->
    <div 
      v-else
      ref="scrollContainer"
      class="logo-grid__scroll-container"
      @scroll="handleScroll"
    >
      <!-- Virtual grid content -->
      <div 
        class="logo-grid__content"
        :style="{ height: `${totalHeight}px` }"
      >
        <!-- Visible items -->
        <div 
          class="logo-grid__viewport"
          :style="{ transform: `translateY(${offsetY}px)` }"
        >
          <div 
            class="logo-grid__grid"
            :style="gridStyles"
          >
            <div
              v-for="(logo, index) in visibleLogos"
              :key="logo.slug"
              class="logo-grid__item"
              :style="getItemStyle(index)"
              role="gridcell"
            >
              <LogoCard
                :logo="logo"
                :variant="logoVariant"
                :show-description="showDescription"
                :show-metadata="showMetadata"
                :lazy-load="true"
                :lazy-loading-config="lazyLoadingConfig"
                :clickable="true"
                @click="handleLogoClick"
                @download="handleLogoDownload"
                @view="handleLogoView"
                @image-load="handleImageLoad"
                @image-error="handleImageError"
                @visibility-change="handleVisibilityChange"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Loading more indicator -->
      <div 
        v-if="isLoading && hasLogos"
        class="logo-grid__loading-more"
      >
        <div class="logo-grid__loading-spinner logo-grid__loading-spinner--small">
          <svg width="20" height="20" viewBox="0 0 24 24">
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
        <span>Loading more...</span>
      </div>
    </div>

    <!-- Results summary -->
    <div 
      v-if="showResultsSummary && hasLogos"
      class="logo-grid__summary"
      role="status"
      :aria-live="isLoading ? 'polite' : 'off'"
    >
      <span v-if="isFiltered">
        Showing {{ visibleCount }} of {{ totalCount }} logos
      </span>
      <span v-else>
        {{ totalCount }} {{ totalCount === 1 ? 'logo' : 'logos' }} available
      </span>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import LogoCard from './LogoCard.vue'

export default {
  name: 'LogoGrid',
  
  components: {
    LogoCard
  },
  
  props: {
    logos: {
      type: Array,
      default: () => []
    },
    loading: {
      type: Boolean,
      default: false
    },
    error: {
      type: [String, Object],
      default: null
    },
    logoVariant: {
      type: String,
      default: 'original',
      validator: (value) => ['original', 'white', 'black', 'optimized'].includes(value)
    },
    showDescription: {
      type: Boolean,
      default: true
    },
    showMetadata: {
      type: Boolean,
      default: true
    },
    showResultsSummary: {
      type: Boolean,
      default: true
    },
    emptyTitle: {
      type: String,
      default: 'No logos found'
    },
    emptyMessage: {
      type: String,
      default: 'Try adjusting your search or filters to find what you\'re looking for.'
    },
    // Virtual scrolling configuration
    itemHeight: {
      type: Number,
      default: 280 // Estimated height of LogoCard
    },
    itemsPerRow: {
      type: Number,
      default: 0 // 0 = auto-calculate based on container width
    },
    overscan: {
      type: Number,
      default: 5 // Number of items to render outside visible area
    },
    minItemWidth: {
      type: Number,
      default: 250 // Minimum width for responsive grid
    },
    gap: {
      type: Number,
      default: 24 // Gap between grid items
    },
    // Enhanced lazy loading configuration
    lazyLoadingConfig: {
      type: Object,
      default: () => ({
        threshold: 0.05, // Load earlier in virtual scroll context
        rootMargin: '100px', // Larger margin for smoother scrolling
        enablePlaceholder: true,
        placeholderColor: '#f3f4f6',
        enableProgressiveLoading: true,
        enablePerformanceTracking: true, // Enable for virtual scroll analytics
        retryAttempts: 3
      })
    }
  },
  
  emits: [
    'logo-click',
    'logo-download',
    'logo-view',
    'retry',
    'scroll',
    'visible-range-change',
    'visibility-change'
  ],
  
  setup(props, { emit }) {
    // Template refs
    const gridContainer = ref(null)
    const scrollContainer = ref(null)
    
    // Virtual scrolling state
    const containerWidth = ref(0)
    const containerHeight = ref(0)
    const scrollTop = ref(0)
    const calculatedItemsPerRow = ref(4)
    const visibleStartIndex = ref(0)
    const visibleEndIndex = ref(0)
    
    // Resize observer
    let resizeObserver = null
    
    // Computed properties
    const isLoading = computed(() => props.loading)
    const hasError = computed(() => props.error !== null)
    const hasLogos = computed(() => props.logos.length > 0)
    const isEmpty = computed(() => !isLoading.value && !hasError.value && !hasLogos.value)
    const totalCount = computed(() => props.logos.length)
    const isFiltered = computed(() => {
      // This would be true if search/filters are active
      // For now, we'll assume it's filtered if we have less than all logos
      return true // This should be passed as a prop in real implementation
    })
    
    const errorMessage = computed(() => {
      if (typeof props.error === 'string') {
        return props.error
      }
      if (props.error && props.error.message) {
        return props.error.message
      }
      return 'An unexpected error occurred'
    })
    
    const gridAriaLabel = computed(() => {
      if (isLoading.value) return 'Loading logos'
      if (hasError.value) return 'Error loading logos'
      if (isEmpty.value) return 'No logos to display'
      return `Grid of ${totalCount.value} logos`
    })
    
    // Calculate items per row based on container width
    const itemsPerRow = computed(() => {
      if (props.itemsPerRow > 0) {
        return props.itemsPerRow
      }
      
      if (containerWidth.value === 0) {
        return calculatedItemsPerRow.value
      }
      
      const availableWidth = containerWidth.value - (props.gap * 2) // Account for container padding
      const itemsCanFit = Math.floor((availableWidth + props.gap) / (props.minItemWidth + props.gap))
      return Math.max(1, itemsCanFit)
    })
    
    // Calculate total rows needed
    const totalRows = computed(() => {
      return Math.ceil(totalCount.value / itemsPerRow.value)
    })
    
    // Calculate total height for virtual scrolling
    const totalHeight = computed(() => {
      return totalRows.value * (props.itemHeight + props.gap) - props.gap
    })
    
    // Calculate visible range based on scroll position
    const visibleRange = computed(() => {
      const rowHeight = props.itemHeight + props.gap
      const startRow = Math.floor(scrollTop.value / rowHeight)
      const endRow = Math.ceil((scrollTop.value + containerHeight.value) / rowHeight)
      
      // Add overscan
      const startRowWithOverscan = Math.max(0, startRow - props.overscan)
      const endRowWithOverscan = Math.min(totalRows.value - 1, endRow + props.overscan)
      
      const startIndex = startRowWithOverscan * itemsPerRow.value
      const endIndex = Math.min(
        totalCount.value - 1,
        (endRowWithOverscan + 1) * itemsPerRow.value - 1
      )
      
      return { startIndex, endIndex, startRow: startRowWithOverscan }
    })
    
    // Get visible logos based on calculated range
    const visibleLogos = computed(() => {
      const { startIndex, endIndex } = visibleRange.value
      return props.logos.slice(startIndex, endIndex + 1)
    })
    
    // Calculate offset for virtual scrolling
    const offsetY = computed(() => {
      const { startRow } = visibleRange.value
      return startRow * (props.itemHeight + props.gap)
    })
    
    // Grid styles for CSS Grid layout
    const gridStyles = computed(() => {
      return {
        display: 'grid',
        gridTemplateColumns: `repeat(${itemsPerRow.value}, 1fr)`,
        gap: `${props.gap}px`,
        width: '100%'
      }
    })
    
    const visibleCount = computed(() => visibleLogos.value.length)
    
    // Get item style for positioning (not needed with CSS Grid, but kept for flexibility)
    const getItemStyle = (index) => {
      return {
        // CSS Grid handles positioning, but we can add other styles here if needed
      }
    }
    
    // Event handlers
    const handleScroll = (event) => {
      scrollTop.value = event.target.scrollTop
      emit('scroll', {
        scrollTop: scrollTop.value,
        scrollHeight: event.target.scrollHeight,
        clientHeight: event.target.clientHeight
      })
    }
    
    const handleLogoClick = (event) => {
      emit('logo-click', event)
    }
    
    const handleLogoDownload = (event) => {
      emit('logo-download', event)
    }
    
    const handleLogoView = (event) => {
      emit('logo-view', event)
    }
    
    const handleImageLoad = (event) => {
      // Enhanced performance monitoring for virtual scrolling
      if (event.performanceMetrics) {
        // Optional: Track loading performance in virtual scroll context
        const metrics = event.performanceMetrics
        console.debug('Logo loaded:', {
          logo: event.logo.slug,
          loadingDuration: metrics.loadingDuration,
          loadingState: event.loadingState
        })
      }
    }
    
    const handleImageError = (event) => {
      console.warn('Logo image failed to load:', {
        logo: event.logo.slug,
        error: event.url,
        retryCount: event.retryCount,
        canRetry: event.canRetry
      })
    }
    
    const handleVisibilityChange = (event) => {
      // Emit visibility changes for analytics and performance monitoring
      emit('visibility-change', {
        logo: event.logo,
        visible: event.visible,
        entry: event.entry,
        virtualScrollContext: {
          visibleRange: visibleRange.value,
          scrollTop: scrollTop.value
        }
      })
    }
    
    const handleRetry = () => {
      emit('retry')
    }
    
    // Update container dimensions
    const updateDimensions = () => {
      if (gridContainer.value) {
        const rect = gridContainer.value.getBoundingClientRect()
        containerWidth.value = rect.width
        containerHeight.value = rect.height
      }
      
      if (scrollContainer.value) {
        const rect = scrollContainer.value.getBoundingClientRect()
        containerHeight.value = rect.height
      }
    }
    
    // Setup resize observer
    const setupResizeObserver = () => {
      if (typeof ResizeObserver !== 'undefined' && gridContainer.value) {
        resizeObserver = new ResizeObserver((entries) => {
          for (const entry of entries) {
            containerWidth.value = entry.contentRect.width
            containerHeight.value = entry.contentRect.height
          }
        })
        
        resizeObserver.observe(gridContainer.value)
      } else {
        // Fallback for browsers without ResizeObserver
        window.addEventListener('resize', updateDimensions)
      }
    }
    
    // Cleanup resize observer
    const cleanupResizeObserver = () => {
      if (resizeObserver) {
        resizeObserver.disconnect()
        resizeObserver = null
      } else {
        window.removeEventListener('resize', updateDimensions)
      }
    }
    
    // Watch for visible range changes
    watch(visibleRange, (newRange, oldRange) => {
      if (newRange.startIndex !== oldRange?.startIndex || 
          newRange.endIndex !== oldRange?.endIndex) {
        emit('visible-range-change', {
          startIndex: newRange.startIndex,
          endIndex: newRange.endIndex,
          visibleCount: newRange.endIndex - newRange.startIndex + 1
        })
      }
    })
    
    // Lifecycle
    onMounted(async () => {
      await nextTick()
      updateDimensions()
      setupResizeObserver()
    })
    
    onUnmounted(() => {
      cleanupResizeObserver()
    })
    
    return {
      // Template refs
      gridContainer,
      scrollContainer,
      
      // State
      scrollTop,
      
      // Computed
      isLoading,
      hasError,
      hasLogos,
      isEmpty,
      totalCount,
      isFiltered,
      errorMessage,
      gridAriaLabel,
      itemsPerRow,
      totalHeight,
      visibleLogos,
      offsetY,
      gridStyles,
      visibleCount,
      
      // Methods
      getItemStyle,
      handleScroll,
      handleLogoClick,
      handleLogoDownload,
      handleLogoView,
      handleImageLoad,
      handleImageError,
      handleVisibilityChange,
      handleRetry
    }
  }
}
</script>

<style scoped>
.logo-grid {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 400px;
}

.logo-grid--loading {
  pointer-events: none;
}

/* Loading state */
.logo-grid__loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 300px;
  color: #64748b;
}

.logo-grid__loading-spinner {
  margin-bottom: 16px;
  color: #3b82f6;
}

.logo-grid__loading-spinner--small {
  margin-right: 8px;
  margin-bottom: 0;
}

.logo-grid__loading-text {
  font-size: 16px;
  font-weight: 500;
  margin: 0;
}

.logo-grid__loading-more {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  color: #64748b;
  font-size: 14px;
}

/* Error state */
.logo-grid__error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 300px;
  text-align: center;
  color: #ef4444;
}

.logo-grid__error-icon {
  margin-bottom: 16px;
}

.logo-grid__error-title {
  font-size: 20px;
  font-weight: 600;
  margin: 0 0 8px 0;
  color: #1e293b;
}

.logo-grid__error-message {
  font-size: 14px;
  color: #64748b;
  margin: 0 0 24px 0;
  max-width: 400px;
}

.logo-grid__error-retry {
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 12px 24px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.logo-grid__error-retry:hover {
  background: #2563eb;
}

.logo-grid__error-retry:focus {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}

/* Empty state */
.logo-grid__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 300px;
  text-align: center;
  color: #64748b;
}

.logo-grid__empty-icon {
  margin-bottom: 16px;
}

.logo-grid__empty-title {
  font-size: 20px;
  font-weight: 600;
  margin: 0 0 8px 0;
  color: #1e293b;
}

.logo-grid__empty-message {
  font-size: 14px;
  color: #64748b;
  margin: 0;
  max-width: 400px;
  line-height: 1.5;
}

/* Virtual scrolling container */
.logo-grid__scroll-container {
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  scroll-behavior: smooth;
}

.logo-grid__content {
  position: relative;
  width: 100%;
}

.logo-grid__viewport {
  position: relative;
  width: 100%;
}

.logo-grid__grid {
  padding: 24px;
}

.logo-grid__item {
  position: relative;
  width: 100%;
}

/* Results summary */
.logo-grid__summary {
  position: sticky;
  bottom: 0;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(8px);
  border-top: 1px solid #e2e8f0;
  padding: 12px 24px;
  text-align: center;
  font-size: 14px;
  color: #64748b;
  z-index: 10;
}

/* Responsive design */
@media (max-width: 1024px) {
  .logo-grid__grid {
    padding: 16px;
  }
}

@media (max-width: 640px) {
  .logo-grid__grid {
    padding: 12px;
  }
  
  .logo-grid__summary {
    padding: 8px 12px;
    font-size: 13px;
  }
}

/* High contrast mode */
@media (prefers-contrast: high) {
  .logo-grid__error-retry {
    border: 2px solid currentColor;
  }
  
  .logo-grid__summary {
    border-top-width: 2px;
  }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .logo-grid__scroll-container {
    scroll-behavior: auto;
  }
  
  .logo-grid__loading-spinner circle {
    animation: none;
  }
  
  .logo-grid__error-retry {
    transition: none;
  }
}

/* Dark mode */
@media (prefers-color-scheme: dark) {
  .logo-grid__loading,
  .logo-grid__empty {
    color: #94a3b8;
  }
  
  .logo-grid__error-title,
  .logo-grid__empty-title {
    color: #f1f5f9;
  }
  
  .logo-grid__error-message,
  .logo-grid__empty-message {
    color: #94a3b8;
  }
  
  .logo-grid__summary {
    background: rgba(30, 41, 59, 0.95);
    border-top-color: #475569;
    color: #94a3b8;
  }
}

/* Print styles */
@media print {
  .logo-grid__scroll-container {
    overflow: visible;
    height: auto;
  }
  
  .logo-grid__content {
    height: auto !important;
  }
  
  .logo-grid__viewport {
    transform: none !important;
  }
  
  .logo-grid__loading,
  .logo-grid__loading-more,
  .logo-grid__summary {
    display: none;
  }
}

/* Focus management for accessibility */
.logo-grid:focus-within .logo-grid__item {
  position: relative;
  z-index: 1;
}

/* Smooth scrolling performance optimization */
.logo-grid__scroll-container {
  -webkit-overflow-scrolling: touch;
  will-change: scroll-position;
}

.logo-grid__viewport {
  will-change: transform;
}

/* Loading animation */
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.logo-grid__loading-spinner svg {
  animation: spin 1s linear infinite;
}

@media (prefers-reduced-motion: reduce) {
  .logo-grid__loading-spinner svg {
    animation: none;
  }
}
</style>