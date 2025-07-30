/**
 * Enhanced Lazy Image Loading Composable
 * 
 * Enhances native lazy loading with intersection observer for better loading states,
 * progressive image loading, and advanced placeholder handling.
 * 
 * Features:
 * - Intersection Observer for precise visibility detection
 * - Progressive loading states with detailed feedback
 * - Placeholder image support with blur-to-clear transitions
 * - Loading analytics and performance metrics
 * - Fallback compatibility with native lazy loading
 * - Configurable thresholds and loading behavior
 */

import { ref, computed, onUnmounted, nextTick, watch } from 'vue'

/**
 * Default configuration for lazy image loading
 */
const DEFAULT_CONFIG = {
  threshold: 0.1,                    // 10% of element must be visible
  rootMargin: '50px',                // Start loading 50px before entering viewport
  enablePlaceholder: true,           // Show placeholder during loading
  placeholderColor: '#f3f4f6',       // Default placeholder background
  loadingDelay: 0,                   // No artificial delay by default
  retryAttempts: 3,                  // Retry failed loads up to 3 times
  retryDelay: 1000,                  // 1 second base delay between retries
  enableProgressiveLoading: true,    // Enable simulated loading progress
  enablePerformanceTracking: true   // Track performance metrics
}

/**
 * Shared intersection observer instance for performance
 * Reused across multiple lazy loading instances
 */
let sharedObserver = null
let observerRefCount = 0
const observedElements = new Map()

/**
 * Create or get shared intersection observer
 */
function getSharedObserver(config) {
  if (!sharedObserver) {
    sharedObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          const callbacks = observedElements.get(entry.target)
          if (callbacks) {
            if (entry.isIntersecting) {
              callbacks.onVisible(entry)
            } else {
              callbacks.onHidden(entry)
            }
          }
        })
      },
      {
        threshold: config.threshold,
        rootMargin: config.rootMargin
      }
    )
  }
  return sharedObserver
}

/**
 * Clean up shared observer when no longer needed
 */
function cleanupSharedObserver() {
  observerRefCount--
  if (observerRefCount <= 0 && sharedObserver) {
    sharedObserver.disconnect()
    sharedObserver = null
    observedElements.clear()
  }
}

/**
 * Enhanced Lazy Image Loading Composable
 * @param {import('vue').Ref<string>|string} imageUrl - Image URL (reactive or static)
 * @param {Object} options - Configuration options
 * @returns {Object} Lazy loading state and methods
 */
export function useLazyImageLoading(imageUrl, options = {}) {
  const config = { ...DEFAULT_CONFIG, ...options }
  
  // Convert imageUrl to ref if it's not already
  const imageUrlRef = typeof imageUrl === 'string' ? ref(imageUrl) : imageUrl
  
  // Reactive state
  const isVisible = ref(false)
  const isLoading = ref(false)
  const isLoaded = ref(false)
  const hasError = ref(false)
  const loadingProgress = ref(0)
  const retryCount = ref(0)
  
  // Performance tracking
  const visibilityTime = ref(null)
  const loadStartTime = ref(null)
  const loadCompleteTime = ref(null)
  
  // Internal state
  const currentImageElement = ref(null)
  const loadingProgressInterval = ref(null)
  const retryTimeout = ref(null)
  const observer = ref(null)
  
  // Computed properties
  const shouldShowPlaceholder = computed(() => {
    return config.enablePlaceholder && 
           (loadingState.value === 'pending' || 
            loadingState.value === 'visible' || 
            loadingState.value === 'loading')
  })
  
  const loadingState = computed(() => {
    if (hasError.value) return 'error'
    if (isLoaded.value) return 'loaded'
    if (isLoading.value) return 'loading'
    if (isVisible.value) return 'visible'
    return 'pending'
  })
  
  const loadingDuration = computed(() => {
    if (!loadStartTime.value || !loadCompleteTime.value) return null
    return loadCompleteTime.value - loadStartTime.value
  })
  
  const canRetry = computed(() => {
    return hasError.value && retryCount.value < config.retryAttempts
  })
  
  // Performance metrics
  const performanceMetrics = computed(() => {
    if (!config.enablePerformanceTracking) return null
    
    return {
      visibilityTime: visibilityTime.value,
      loadStartTime: loadStartTime.value,
      loadCompleteTime: loadCompleteTime.value,
      loadingDuration: loadingDuration.value,
      retryCount: retryCount.value,
      state: loadingState.value
    }
  })
  
  /**
   * Handle element becoming visible
   */
  function handleElementVisible(entry) {
    isVisible.value = true
    
    if (config.enablePerformanceTracking) {
      visibilityTime.value = performance.now()
    }
    
    if (config.onVisibilityChange) {
      config.onVisibilityChange(true, entry)
    }
    
    // Start loading after delay if specified
    if (config.loadingDelay > 0) {
      setTimeout(() => startImageLoad(), config.loadingDelay)
    } else {
      startImageLoad()
    }
  }
  
  /**
   * Handle element becoming hidden
   */
  function handleElementHidden(entry) {
    // Note: We don't set isVisible to false here to avoid
    // canceling loads that are already in progress
    
    if (config.onVisibilityChange) {
      config.onVisibilityChange(false, entry)
    }
  }
  
  /**
   * Start loading the image
   */
  function startImageLoad() {
    if (isLoading.value || isLoaded.value) return
    
    isLoading.value = true
    hasError.value = false
    loadingProgress.value = 0
    
    if (config.enablePerformanceTracking) {
      loadStartTime.value = performance.now()
    }
    
    if (config.onLoadStart && currentImageElement.value) {
      config.onLoadStart(currentImageElement.value)
    }
    
    loadImageWithProgress()
  }
  
  /**
   * Load image with progress simulation
   */
  function loadImageWithProgress() {
    const img = new Image()
    
    // Start progress simulation if enabled
    if (config.enableProgressiveLoading) {
      startProgressSimulation()
    }
    
    img.onload = () => handleLoadSuccess(img)
    img.onerror = (event) => handleLoadError(event)
    
    // Set crossorigin if needed for CORS images
    if (imageUrlRef.value.includes('//') && !imageUrlRef.value.startsWith(window.location.origin)) {
      img.crossOrigin = 'anonymous'
    }
    
    img.src = imageUrlRef.value
  }
  
  /**
   * Simulate loading progress for better UX
   */
  function startProgressSimulation() {
    const startTime = Date.now()
    const duration = 800 // Estimated loading time in ms
    
    function updateProgress() {
      if (!isLoading.value) return
      
      const elapsed = Date.now() - startTime
      const progress = Math.min((elapsed / duration) * 90, 90) // Cap at 90% until actual load
      loadingProgress.value = progress
      
      if (progress < 90) {
        loadingProgressInterval.value = requestAnimationFrame(updateProgress)
      }
    }
    
    loadingProgressInterval.value = requestAnimationFrame(updateProgress)
  }
  
  /**
   * Handle successful image load
   */
  function handleLoadSuccess(img) {
    isLoading.value = false
    isLoaded.value = true
    hasError.value = false
    loadingProgress.value = 100
    
    if (config.enablePerformanceTracking) {
      loadCompleteTime.value = performance.now()
    }
    
    // Clear progress animation
    if (loadingProgressInterval.value) {
      cancelAnimationFrame(loadingProgressInterval.value)
      loadingProgressInterval.value = null
    }
    
    // Update the actual image element if it exists
    if (currentImageElement.value && currentImageElement.value.src !== img.src) {
      currentImageElement.value.src = img.src
    }
    
    if (config.onLoadComplete) {
      config.onLoadComplete(true, currentImageElement.value)
    }
  }
  
  /**
   * Handle image load error
   */
  function handleLoadError(event) {
    retryCount.value++
    
    if (config.onError) {
      config.onError(event, retryCount.value)
    }
    
    // Clear progress animation
    if (loadingProgressInterval.value) {
      cancelAnimationFrame(loadingProgressInterval.value)
      loadingProgressInterval.value = null
    }
    
    if (retryCount.value < config.retryAttempts) {
      // Retry with exponential backoff
      const retryDelay = config.retryDelay * Math.pow(2, retryCount.value - 1)
      retryTimeout.value = setTimeout(() => {
        loadImageWithProgress()
      }, retryDelay)
    } else {
      // Final failure
      hasError.value = true
      isLoading.value = false
      loadingProgress.value = 0
      
      if (config.enablePerformanceTracking) {
        loadCompleteTime.value = performance.now()
      }
      
      if (config.onLoadComplete) {
        config.onLoadComplete(false, currentImageElement.value)
      }
    }
  }
  
  /**
   * Observe an element for intersection
   */
  function observe(element) {
    if (!element || !(element instanceof HTMLElement)) {
      console.warn('useLazyImageLoading: observe() requires a valid HTML element')
      return
    }
    
    currentImageElement.value = element
    
    // Check if IntersectionObserver is supported
    if (typeof IntersectionObserver === 'undefined') {
      // Fallback: assume element is visible and start loading
      handleElementVisible({
        target: element,
        isIntersecting: true,
        intersectionRatio: 1
      })
      return
    }
    
    observer.value = getSharedObserver(config)
    observerRefCount++
    
    // Register callbacks for this element
    observedElements.set(element, {
      onVisible: handleElementVisible,
      onHidden: handleElementHidden
    })
    
    observer.value.observe(element)
  }
  
  /**
   * Stop observing an element
   */
  function unobserve(element) {
    if (!element || !observer.value) return
    
    observer.value.unobserve(element)
    observedElements.delete(element)
    
    if (element === currentImageElement.value) {
      currentImageElement.value = null
    }
  }
  
  /**
   * Force load the image regardless of visibility
   */
  function forceLoad() {
    if (!isLoaded.value && !isLoading.value) {
      startImageLoad()
    }
  }
  
  /**
   * Retry loading the image
   */
  function retry() {
    if (retryCount.value >= config.retryAttempts) {
      retryCount.value = 0
    }
    
    hasError.value = false
    isLoading.value = false
    loadingProgress.value = 0
    
    // Clear any existing retry timeout
    if (retryTimeout.value) {
      clearTimeout(retryTimeout.value)
      retryTimeout.value = null
    }
    
    startImageLoad()
  }
  
  /**
   * Reset the loading state
   */
  function reset() {
    isVisible.value = false
    isLoading.value = false
    isLoaded.value = false
    hasError.value = false
    loadingProgress.value = 0
    retryCount.value = 0
    
    // Clear performance tracking
    visibilityTime.value = null
    loadStartTime.value = null
    loadCompleteTime.value = null
    
    // Clear timers
    if (loadingProgressInterval.value) {
      cancelAnimationFrame(loadingProgressInterval.value)
      loadingProgressInterval.value = null
    }
    
    if (retryTimeout.value) {
      clearTimeout(retryTimeout.value)
      retryTimeout.value = null
    }
  }
  
  // Watch for URL changes
  watch(imageUrlRef, (newUrl, oldUrl) => {
    if (newUrl !== oldUrl && newUrl) {
      reset()
      if (isVisible.value) {
        startImageLoad()
      }
    }
  })
  
  // Cleanup on unmount
  onUnmounted(() => {
    if (currentImageElement.value) {
      unobserve(currentImageElement.value)
    }
    
    // Clear timers
    if (loadingProgressInterval.value) {
      cancelAnimationFrame(loadingProgressInterval.value)
    }
    
    if (retryTimeout.value) {
      clearTimeout(retryTimeout.value)
    }
    
    cleanupSharedObserver()
  })
  
  return {
    // Reactive state
    isVisible,
    isLoading,
    isLoaded,
    hasError,
    loadingProgress,
    retryCount,
    
    // Performance metrics
    visibilityTime,
    loadStartTime,
    loadCompleteTime,
    performanceMetrics,
    
    // Methods
    observe,
    unobserve,
    forceLoad,
    retry,
    reset,
    
    // Computed properties
    shouldShowPlaceholder,
    loadingState,
    loadingDuration,
    canRetry
  }
}

/**
 * Create a simplified version for basic use cases
 */
export function useLazyImage(imageUrl, options = {}) {
  return useLazyImageLoading(imageUrl, {
    enablePerformanceTracking: false,
    enableProgressiveLoading: false,
    ...options
  })
}

export default useLazyImageLoading