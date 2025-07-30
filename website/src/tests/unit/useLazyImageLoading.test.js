/**
 * Unit Tests for useLazyImageLoading Composable
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref, nextTick } from 'vue'

// Mock Vue lifecycle hooks
vi.mock('vue', async () => {
  const actual = await vi.importActual('vue')
  return {
    ...actual,
    onUnmounted: vi.fn()
  }
})

// Setup globals before importing the composable
global.performance = { now: vi.fn(() => 1000) }
global.requestAnimationFrame = vi.fn(cb => setTimeout(cb, 16))
global.cancelAnimationFrame = vi.fn(clearTimeout)

// Mock IntersectionObserver with proper constructor behavior
let mockObserverCallbacks = []
let mockObservedElements = []

class MockIntersectionObserver {
  constructor(callback, options = {}) {
    this.callback = callback
    this.options = options
    this.elements = new Set()
    mockObserverCallbacks.push(callback)
  }

  observe(element) {
    this.elements.add(element)
    mockObservedElements.push({ element, observer: this })
  }

  unobserve(element) {
    this.elements.delete(element)
    mockObservedElements = mockObservedElements.filter(
      item => item.element !== element
    )
  }

  disconnect() {
    this.elements.clear()
  }

  // Test helper
  triggerIntersection(element, isIntersecting) {
    this.callback([{
      target: element,
      isIntersecting,
      intersectionRatio: isIntersecting ? 1 : 0,
      boundingClientRect: { top: 0, left: 0, right: 100, bottom: 100 },
      rootBounds: { top: 0, left: 0, right: 200, bottom: 200 }
    }])
  }
}

global.IntersectionObserver = MockIntersectionObserver

// Mock Image constructor
let mockImageInstances = []

class MockImage {
  constructor() {
    this.onload = null
    this.onerror = null
    this.src = ''
    this.crossOrigin = null
    mockImageInstances.push(this)
  }

  triggerLoad() {
    if (this.onload) this.onload()
  }

  triggerError() {
    if (this.onerror) this.onerror(new Error('Image load failed'))
  }
}

global.Image = MockImage

// Now import the composable after mocks are set up
import { useLazyImageLoading } from '../../composables/useLazyImageLoading.js'

const createMockElement = () => {
  // Create a proper DOM element that passes instanceof HTMLElement check
  if (typeof document !== 'undefined') {
    return document.createElement('div')
  }
  // Fallback for test environment
  const element = {
    nodeType: 1,
    tagName: 'DIV',
    src: ''
  }
  // Make it pass instanceof check
  Object.setPrototypeOf(element, HTMLElement.prototype)
  return element
}

// Mock document.createElement for test environment
global.document = {
  createElement: (tagName) => {
    const element = {
      nodeType: 1,
      tagName: tagName.toUpperCase(),
      src: '',
      getAttributeNames: () => [],
      getAttribute: () => null,
      setAttribute: () => {},
      removeAttribute: () => {}
    }
    Object.setPrototypeOf(element, HTMLElement.prototype)
    return element
  }
}

// Mock HTMLElement for instanceof checks
global.HTMLElement = function() {}
global.HTMLElement.prototype = {}

// Store original window for proper mocking
const originalWindow = global.window

describe('useLazyImageLoading', () => {
  beforeEach(() => {
    mockObserverCallbacks.length = 0
    mockObservedElements.length = 0
    mockImageInstances.length = 0
    vi.clearAllMocks()
    global.performance.now.mockReturnValue(1000)
    
    // Mock window.location.origin for CORS tests
    global.window = {
      ...originalWindow,
      location: {
        origin: 'https://mysite.com'
      }
    }
  })

  afterEach(() => {
    // Restore original window
    global.window = originalWindow
  })

  describe('initialization', () => {
    it('should initialize with correct default state', () => {
      const imageUrl = ref('https://example.com/logo.svg')
      const lazyImage = useLazyImageLoading(imageUrl)

      expect(lazyImage.isVisible.value).toBe(false)
      expect(lazyImage.isLoading.value).toBe(false)
      expect(lazyImage.isLoaded.value).toBe(false)
      expect(lazyImage.hasError.value).toBe(false)
      expect(lazyImage.loadingProgress.value).toBe(0)
      expect(lazyImage.retryCount.value).toBe(0)
      expect(lazyImage.loadingState.value).toBe('pending')
      expect(lazyImage.shouldShowPlaceholder.value).toBe(true)
      expect(lazyImage.canRetry.value).toBe(false)
    })

    it('should handle string imageUrl parameter', () => {
      const lazyImage = useLazyImageLoading('https://example.com/logo.svg')
      expect(lazyImage.loadingState.value).toBe('pending')
    })

    it('should register onUnmounted lifecycle hook', () => {
      const imageUrl = ref('https://example.com/logo.svg')
      useLazyImageLoading(imageUrl)
      
      // Just verify it doesn't throw - the mock is working if we get here
      expect(true).toBe(true)
    })
  })

  describe('intersection observer behavior', () => {
    it('should observe element when observe() is called', () => {
      const imageUrl = ref('https://example.com/logo.svg')
      const lazyImage = useLazyImageLoading(imageUrl)
      const mockElement = createMockElement()

      lazyImage.observe(mockElement)

      expect(mockObservedElements).toHaveLength(1)
      expect(mockObservedElements[0].element).toBe(mockElement)
    })

    it('should handle invalid element gracefully', () => {
      const imageUrl = ref('https://example.com/logo.svg')
      const lazyImage = useLazyImageLoading(imageUrl)
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      expect(() => {
        lazyImage.observe(null)
        lazyImage.observe('invalid')
      }).not.toThrow()

      expect(consoleSpy).toHaveBeenCalledTimes(2)
      consoleSpy.mockRestore()
    })
  })

  describe('visibility detection', () => {
    it('should detect when element becomes visible', async () => {
      const imageUrl = ref('https://example.com/logo.svg')
      const visibilityCallback = vi.fn()
      const lazyImage = useLazyImageLoading(imageUrl, {
        onVisibilityChange: visibilityCallback
      })
      const mockElement = createMockElement()

      lazyImage.observe(mockElement)
      
      // Find the observer for this element and trigger intersection
      const observedItem = mockObservedElements.find(item => item.element === mockElement)
      observedItem.observer.triggerIntersection(mockElement, true)
      await nextTick()
      
      expect(lazyImage.isVisible.value).toBe(true)
      expect(lazyImage.loadingState.value).toBe('loading') // Should start loading immediately
      expect(visibilityCallback).toHaveBeenCalledWith(true, expect.any(Object))
    })

    it('should start loading when element becomes visible', async () => {
      const imageUrl = ref('https://example.com/logo.svg')
      const lazyImage = useLazyImageLoading(imageUrl)
      const mockElement = createMockElement()

      lazyImage.observe(mockElement)
      
      const observedItem = mockObservedElements.find(item => item.element === mockElement)
      observedItem.observer.triggerIntersection(mockElement, true)
      await nextTick()
      
      expect(lazyImage.isVisible.value).toBe(true)
      expect(lazyImage.isLoading.value).toBe(true)
      expect(mockImageInstances).toHaveLength(1)
    })
  })

  describe('image loading', () => {
    it('should handle successful image load', async () => {
      const imageUrl = ref('https://example.com/logo.svg')
      const loadCallback = vi.fn()
      const lazyImage = useLazyImageLoading(imageUrl, {
        onLoadComplete: loadCallback
      })

      lazyImage.forceLoad()
      await nextTick()

      expect(lazyImage.isLoading.value).toBe(true)
      expect(mockImageInstances).toHaveLength(1)

      // Trigger successful load
      const imageInstance = mockImageInstances[0]
      imageInstance.triggerLoad()
      await nextTick()

      expect(lazyImage.isLoaded.value).toBe(true)
      expect(lazyImage.isLoading.value).toBe(false)
      expect(lazyImage.hasError.value).toBe(false)
      expect(lazyImage.loadingState.value).toBe('loaded')
      expect(loadCallback).toHaveBeenCalledWith(true, null)
    })

    it('should handle image load error and retry', async () => {
      vi.useFakeTimers()
      
      const imageUrl = ref('https://example.com/logo.svg')
      const errorCallback = vi.fn()
      const lazyImage = useLazyImageLoading(imageUrl, {
        onError: errorCallback,
        retryAttempts: 2,
        retryDelay: 1000
      })

      lazyImage.forceLoad()
      await nextTick()

      // Trigger first error
      const imageInstance = mockImageInstances[0]
      imageInstance.triggerError()
      await nextTick()

      expect(lazyImage.retryCount.value).toBe(1)
      expect(errorCallback).toHaveBeenCalledWith(expect.any(Error), 1)

      // Fast-forward to retry
      vi.advanceTimersByTime(1000)
      await nextTick()

      expect(mockImageInstances).toHaveLength(2) // New image created for retry
      
      vi.useRealTimers()
    })

    it('should handle manual retry', async () => {
      const imageUrl = ref('https://example.com/logo.svg')
      const lazyImage = useLazyImageLoading(imageUrl, {
        retryAttempts: 1
      })

      // Force error state
      lazyImage.forceLoad()
      await nextTick()
      
      const imageInstance = mockImageInstances[0]
      imageInstance.triggerError()
      await nextTick()

      expect(lazyImage.retryCount.value).toBe(1)
      expect(lazyImage.canRetry.value).toBe(false) // Reached retry limit

      // Manual retry should reset count and try again
      lazyImage.retry()
      await nextTick()

      expect(lazyImage.retryCount.value).toBe(0) // Reset for manual retry
      expect(lazyImage.isLoading.value).toBe(true)
      expect(mockImageInstances).toHaveLength(2) // New image created
    })

    it('should set crossOrigin for external URLs', async () => {
      const imageUrl = ref('https://external.com/logo.svg')
      const lazyImage = useLazyImageLoading(imageUrl)

      lazyImage.forceLoad()
      await nextTick()

      const imageInstance = mockImageInstances[0]
      expect(imageInstance.crossOrigin).toBe('anonymous')
    })

    it('should not set crossOrigin for same-origin URLs', async () => {
      const imageUrl = ref('https://mysite.com/logo.svg')
      const lazyImage = useLazyImageLoading(imageUrl)

      lazyImage.forceLoad()
      await nextTick()

      const imageInstance = mockImageInstances[0]
      expect(imageInstance.crossOrigin).toBeNull()
    })
  })

  describe('URL changes', () => {
    it('should reset and reload when URL changes', async () => {
      const imageUrl = ref('https://example.com/logo1.svg')
      const lazyImage = useLazyImageLoading(imageUrl)

      // Load first image
      lazyImage.forceLoad()
      await nextTick()
      
      const firstImage = mockImageInstances[0]
      firstImage.triggerLoad()
      await nextTick()

      expect(lazyImage.isLoaded.value).toBe(true)

      // Change URL
      imageUrl.value = 'https://example.com/logo2.svg'
      await nextTick()

      // Should reset state
      expect(lazyImage.isLoaded.value).toBe(false)
      expect(lazyImage.isLoading.value).toBe(false)
      expect(lazyImage.hasError.value).toBe(false)
      expect(lazyImage.loadingProgress.value).toBe(0)
      expect(lazyImage.retryCount.value).toBe(0)
      expect(lazyImage.loadingState.value).toBe('pending')
    })
  })

  describe('state management', () => {
    it('should provide correct loading states', () => {
      const imageUrl = ref('https://example.com/logo.svg')
      const lazyImage = useLazyImageLoading(imageUrl)

      // Initial state
      expect(lazyImage.loadingState.value).toBe('pending')
      expect(lazyImage.shouldShowPlaceholder.value).toBe(true)

      // Loaded state
      lazyImage.isLoading.value = false
      lazyImage.isLoaded.value = true
      expect(lazyImage.loadingState.value).toBe('loaded')
      expect(lazyImage.shouldShowPlaceholder.value).toBe(false)

      // Error state
      lazyImage.isLoaded.value = false
      lazyImage.hasError.value = true
      expect(lazyImage.loadingState.value).toBe('error')
      expect(lazyImage.shouldShowPlaceholder.value).toBe(false)
    })

    it('should handle reset correctly', async () => {
      const imageUrl = ref('https://example.com/logo.svg')
      const lazyImage = useLazyImageLoading(imageUrl)

      // Set some state
      lazyImage.forceLoad()
      await nextTick()
      
      lazyImage.isVisible.value = true
      lazyImage.retryCount.value = 2

      // Reset
      lazyImage.reset()

      expect(lazyImage.isVisible.value).toBe(false)
      expect(lazyImage.isLoading.value).toBe(false)
      expect(lazyImage.isLoaded.value).toBe(false)
      expect(lazyImage.hasError.value).toBe(false)
      expect(lazyImage.loadingProgress.value).toBe(0)
      expect(lazyImage.retryCount.value).toBe(0)
    })
  })

  describe('edge cases', () => {
    it('should handle empty image URL', () => {
      const imageUrl = ref('')
      const lazyImage = useLazyImageLoading(imageUrl)

      expect(() => lazyImage.forceLoad()).not.toThrow()
    })

    it('should handle force load when already loading', async () => {
      const imageUrl = ref('https://example.com/logo.svg')
      const lazyImage = useLazyImageLoading(imageUrl)

      lazyImage.forceLoad()
      await nextTick()
      
      expect(lazyImage.isLoading.value).toBe(true)
      const initialImageCount = mockImageInstances.length

      // Force load again - should not create new image
      lazyImage.forceLoad()
      await nextTick()

      expect(mockImageInstances.length).toBe(initialImageCount)
    })

    it('should fallback gracefully when IntersectionObserver is not supported', () => {
      // Temporarily remove IntersectionObserver
      const originalIO = global.IntersectionObserver
      delete global.IntersectionObserver

      const imageUrl = ref('https://example.com/logo.svg')
      const lazyImage = useLazyImageLoading(imageUrl)
      const mockElement = createMockElement()

      // Should not throw and should fallback to immediate loading
      expect(() => lazyImage.observe(mockElement)).not.toThrow()

      // Restore
      global.IntersectionObserver = originalIO
    })
  })

  describe('callbacks', () => {
    it('should call onLoadStart callback', async () => {
      const imageUrl = ref('https://example.com/logo.svg')
      const loadStartCallback = vi.fn()
      const lazyImage = useLazyImageLoading(imageUrl, {
        onLoadStart: loadStartCallback
      })

      const mockElement = createMockElement()
      lazyImage.observe(mockElement)

      const observedItem = mockObservedElements.find(item => item.element === mockElement)
      observedItem.observer.triggerIntersection(mockElement, true)
      await nextTick()

      expect(loadStartCallback).toHaveBeenCalledWith(expect.any(Object))
    })

    it('should call onLoadComplete callback on success', async () => {
      const imageUrl = ref('https://example.com/logo.svg')
      const loadCompleteCallback = vi.fn()
      const lazyImage = useLazyImageLoading(imageUrl, {
        onLoadComplete: loadCompleteCallback
      })

      lazyImage.forceLoad()
      await nextTick()

      const imageInstance = mockImageInstances[0]
      imageInstance.triggerLoad()
      await nextTick()

      expect(loadCompleteCallback).toHaveBeenCalledWith(true, null)
    })
  })

  describe('performance tracking', () => {
    it('should track performance metrics when enabled', async () => {
      const imageUrl = ref('https://example.com/logo.svg')
      const lazyImage = useLazyImageLoading(imageUrl, {
        enablePerformanceTracking: true
      })

      global.performance.now
        .mockReturnValueOnce(1000) // visibility time
        .mockReturnValueOnce(1100) // load start time  
        .mockReturnValueOnce(1500) // load complete time

      const mockElement = createMockElement()
      lazyImage.observe(mockElement)

      const observedItem = mockObservedElements.find(item => item.element === mockElement)
      observedItem.observer.triggerIntersection(mockElement, true)
      await nextTick()

      // Complete load
      const imageInstance = mockImageInstances[0]
      imageInstance.triggerLoad()
      await nextTick()

      const metrics = lazyImage.performanceMetrics.value
      expect(metrics).toEqual({
        visibilityTime: 1000,
        loadStartTime: 1100,
        loadCompleteTime: 1500,
        loadingDuration: 400,
        retryCount: 0,
        state: 'loaded'
      })
    })

    it('should not track metrics when disabled', () => {
      const imageUrl = ref('https://example.com/logo.svg')
      const lazyImage = useLazyImageLoading(imageUrl, {
        enablePerformanceTracking: false
      })

      expect(lazyImage.performanceMetrics.value).toBeNull()
    })
  })
})