import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import { createPinia } from 'pinia'
import App from './App.vue'
import { routes } from './router/index.js'
import performanceMonitor from './utils/performanceMonitor.js'

// Create router with shared route configuration
const router = createRouter({
  history: createWebHistory(),
  routes
})

// Add route guards for meta title updates
router.beforeEach((to, from, next) => {
  if (to.meta.title) {
    document.title = to.meta.title
  }
  next()
})

// Create Pinia store
const pinia = createPinia()

// Initialize performance monitoring
if (typeof window !== 'undefined') {
  // Track initial app load
  performanceMonitor.startTiming('app_initialization')
  
  // Track route changes for performance
  router.beforeEach((to, from, next) => {
    performanceMonitor.startTiming(`route_${to.name || 'unknown'}`)
    next()
  })
  
  router.afterEach((to, from) => {
    performanceMonitor.endTiming(`route_${to.name || 'unknown'}`)
    
    // Record route navigation metrics
    performanceMonitor.recordMetric('route_navigation', performance.now(), {
      from: from.name,
      to: to.name,
      path: to.path
    })
  })
}

// Create and mount app
const app = createApp(App)

// Add global error handling
app.config.errorHandler = (err, instance, info) => {
  console.error('Vue error:', err, info)
  
  // Record error metrics if performance monitoring is enabled
  if (typeof window !== 'undefined') {
    performanceMonitor.recordMetric('app_error', performance.now(), {
      error: err.message,
      info,
      component: instance?.$options.name || 'unknown'
    })
  }
}

// Configure performance optimizations
if (import.meta.env.PROD) {
  // Production-specific optimizations
  app.config.performance = false // Disable Vue devtools performance tracking
} else {
  // Development-specific configurations
  app.config.performance = true
}

app.use(router)
app.use(pinia)

// Mount app and track initialization completion
const appInstance = app.mount('#app')

if (typeof window !== 'undefined') {
  performanceMonitor.endTiming('app_initialization')
  
  // Track when app is fully loaded
  window.addEventListener('load', () => {
    performanceMonitor.recordMetric('app_fully_loaded', performance.now())
    
    // Log performance summary in development
    if (import.meta.env.DEV) {
      setTimeout(() => {
        const summary = performanceMonitor.getPerformanceSummary()
        console.log('🚀 Performance Summary:', summary)
      }, 1000)
    }
  })
  
  // Add beforeunload handler to export metrics if needed
  window.addEventListener('beforeunload', () => {
    if (import.meta.env.DEV && __PERFORMANCE_MONITORING__) {
      const metrics = performanceMonitor.exportMetrics()
      console.log('📊 Final Performance Metrics:', metrics)
    }
  })
}

export default appInstance