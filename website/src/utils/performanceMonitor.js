/**
 * Performance monitoring utility for LogoBox website
 * Tracks key performance metrics and provides insights
 */

class PerformanceMonitor {
  constructor() {
    this.metrics = new Map()
    this.observers = new Map()
    this.isSupported = typeof window !== 'undefined' && 'performance' in window
    
    if (this.isSupported) {
      this.initializeObservers()
    }
  }

  /**
   * Initialize performance observers
   */
  initializeObservers() {
    // Observe navigation timing
    if ('PerformanceObserver' in window) {
      try {
        // Navigation timing observer
        const navObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.recordNavigationMetrics(entry)
          }
        })
        navObserver.observe({ entryTypes: ['navigation'] })
        this.observers.set('navigation', navObserver)

        // Resource timing observer
        const resourceObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.name.includes('.js') || entry.name.includes('.css')) {
              this.recordResourceMetrics(entry)
            }
          }
        })
        resourceObserver.observe({ entryTypes: ['resource'] })
        this.observers.set('resource', resourceObserver)

        // Largest Contentful Paint observer
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries()
          const lastEntry = entries[entries.length - 1]
          this.recordMetric('lcp', lastEntry.startTime)
        })
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] })
        this.observers.set('lcp', lcpObserver)

        // First Input Delay observer
        const fidObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.recordMetric('fid', entry.processingStart - entry.startTime)
          }
        })
        fidObserver.observe({ entryTypes: ['first-input'] })
        this.observers.set('fid', fidObserver)

      } catch (error) {
        console.warn('Performance observer initialization failed:', error)
      }
    }
  }

  /**
   * Record navigation-specific metrics
   */
  recordNavigationMetrics(entry) {
    const metrics = {
      ttfb: entry.responseStart - entry.requestStart, // Time to First Byte
      domContentLoaded: entry.domContentLoadedEventEnd - entry.navigationStart,
      loadComplete: entry.loadEventEnd - entry.navigationStart,
      domInteractive: entry.domInteractive - entry.navigationStart,
      redirectTime: entry.redirectEnd - entry.redirectStart,
      dnsTime: entry.domainLookupEnd - entry.domainLookupStart,
      tcpTime: entry.connectEnd - entry.connectStart,
      responseTime: entry.responseEnd - entry.responseStart
    }

    Object.entries(metrics).forEach(([key, value]) => {
      if (value >= 0) {
        this.recordMetric(key, value)
      }
    })
  }

  /**
   * Record resource loading metrics
   */
  recordResourceMetrics(entry) {
    const resourceType = this.getResourceType(entry.name)
    const loadTime = entry.responseEnd - entry.startTime
    
    if (!this.metrics.has(`${resourceType}_loads`)) {
      this.metrics.set(`${resourceType}_loads`, [])
    }
    
    this.metrics.get(`${resourceType}_loads`).push({
      name: entry.name,
      duration: loadTime,
      size: entry.transferSize || 0,
      cached: entry.transferSize === 0
    })
  }

  /**
   * Get resource type from URL
   */
  getResourceType(url) {
    if (url.includes('.js')) return 'script'
    if (url.includes('.css')) return 'style'
    if (url.match(/\.(png|jpg|jpeg|gif|svg|webp)$/i)) return 'image'
    return 'other'
  }

  /**
   * Record a custom metric
   */
  recordMetric(name, value, metadata = {}) {
    if (!this.isSupported) return

    this.metrics.set(name, {
      value,
      timestamp: performance.now(),
      metadata
    })
  }

  /**
   * Start timing a custom operation
   */
  startTiming(name) {
    if (!this.isSupported) return

    this.recordMetric(`${name}_start`, performance.now())
  }

  /**
   * End timing a custom operation
   */
  endTiming(name) {
    if (!this.isSupported) return

    const startMetric = this.metrics.get(`${name}_start`)
    if (startMetric) {
      const duration = performance.now() - startMetric.value
      this.recordMetric(`${name}_duration`, duration)
    }
  }

  /**
   * Measure Core Web Vitals
   */
  measureCoreWebVitals() {
    if (!this.isSupported) return {}

    return {
      lcp: this.getMetric('lcp'),
      fid: this.getMetric('fid'),
      cls: this.measureCLS(), // Cumulative Layout Shift
      ttfb: this.getMetric('ttfb'),
      fcp: this.measureFCP() // First Contentful Paint
    }
  }

  /**
   * Measure Cumulative Layout Shift
   */
  measureCLS() {
    if (!('PerformanceObserver' in window)) return 0

    let clsValue = 0
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) {
            clsValue += entry.value
          }
        }
      })
      observer.observe({ entryTypes: ['layout-shift'] })
      
      // Return current value after a short delay
      setTimeout(() => {
        this.recordMetric('cls', clsValue)
        observer.disconnect()
      }, 1000)
      
    } catch (error) {
      console.warn('CLS measurement failed:', error)
    }
    
    return clsValue
  }

  /**
   * Measure First Contentful Paint
   */
  measureFCP() {
    if (!('PerformanceObserver' in window)) return 0

    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === 'first-contentful-paint') {
            this.recordMetric('fcp', entry.startTime)
            observer.disconnect()
          }
        }
      })
      observer.observe({ entryTypes: ['paint'] })
    } catch (error) {
      console.warn('FCP measurement failed:', error)
    }
    
    return this.getMetric('fcp')
  }

  /**
   * Get a specific metric
   */
  getMetric(name) {
    const metric = this.metrics.get(name)
    return metric ? metric.value : null
  }

  /**
   * Get all metrics
   */
  getAllMetrics() {
    const result = {}
    this.metrics.forEach((value, key) => {
      result[key] = value
    })
    return result
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary() {
    const coreWebVitals = this.measureCoreWebVitals()
    const resourceMetrics = this.getResourceSummary()
    
    return {
      coreWebVitals,
      resources: resourceMetrics,
      navigation: {
        ttfb: this.getMetric('ttfb'),
        domContentLoaded: this.getMetric('domContentLoaded'),
        loadComplete: this.getMetric('loadComplete'),
        domInteractive: this.getMetric('domInteractive')
      },
      timestamp: Date.now()
    }
  }

  /**
   * Get resource loading summary
   */
  getResourceSummary() {
    const summary = {
      scripts: { count: 0, totalSize: 0, avgLoadTime: 0 },
      styles: { count: 0, totalSize: 0, avgLoadTime: 0 },
      images: { count: 0, totalSize: 0, avgLoadTime: 0 }
    }

    if (typeof Array !== 'undefined') {
      ['script', 'style', 'image'].forEach(type => {
        const loads = this.metrics.get(`${type}_loads`) || []
        if (loads.length > 0) {
          summary[type + 's'].count = loads.length
          summary[type + 's'].totalSize = loads.reduce((sum, load) => sum + load.size, 0)
          summary[type + 's'].avgLoadTime = loads.reduce((sum, load) => sum + load.duration, 0) / loads.length
        }
      })
    }

    return summary
  }

  /**
   * Check if performance meets requirements
   */
  checkPerformanceRequirements() {
    const requirements = {
      initialLoad: 2000, // 2 seconds for initial content
      searchResponse: 1000, // 1 second for search results
      lcp: 2500, // LCP should be under 2.5s
      fid: 100, // FID should be under 100ms
      cls: 0.1 // CLS should be under 0.1
    }

    const metrics = this.measureCoreWebVitals()
    const results = {}

    Object.entries(requirements).forEach(([key, threshold]) => {
      const value = metrics[key] || this.getMetric(key)
      results[key] = {
        value,
        threshold,
        passing: value !== null ? value <= threshold : null,
        status: value === null ? 'unknown' : (value <= threshold ? 'pass' : 'fail')
      }
    })

    return results
  }

  /**
   * Export metrics for analysis
   */
  exportMetrics() {
    return {
      userAgent: navigator.userAgent,
      timestamp: Date.now(),
      url: window.location.href,
      metrics: this.getAllMetrics(),
      summary: this.getPerformanceSummary(),
      requirements: this.checkPerformanceRequirements()
    }
  }

  /**
   * Cleanup observers
   */
  cleanup() {
    this.observers.forEach(observer => {
      try {
        observer.disconnect()
      } catch (error) {
        console.warn('Failed to disconnect observer:', error)
      }
    })
    this.observers.clear()
  }
}

// Create singleton instance
const performanceMonitor = new PerformanceMonitor()

// Export composable function for Vue components
export function usePerformanceMonitor() {
  const recordMetric = (name, value, metadata) => {
    performanceMonitor.recordMetric(name, value, metadata)
  }

  const startTiming = (name) => {
    performanceMonitor.startTiming(name)
  }

  const endTiming = (name) => {
    performanceMonitor.endTiming(name)
  }

  const getMetric = (name) => {
    return performanceMonitor.getMetric(name)
  }

  const getPerformanceSummary = () => {
    return performanceMonitor.getPerformanceSummary()
  }

  const checkRequirements = () => {
    return performanceMonitor.checkPerformanceRequirements()
  }

  return {
    recordMetric,
    startTiming,
    endTiming,
    getMetric,
    getPerformanceSummary,
    checkRequirements
  }
}

export default performanceMonitor