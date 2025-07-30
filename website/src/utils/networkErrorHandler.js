/**
 * Network Error Handler Utility
 * 
 * Provides centralized error handling for network requests with retry mechanisms,
 * fallback strategies, and user-friendly error messages.
 */

// Import error codes - LogoApiError will be defined in this file
export const ERROR_CODES = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  CATALOG_LOAD_ERROR: 'CATALOG_LOAD_ERROR',
  LOGO_NOT_FOUND: 'LOGO_NOT_FOUND',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  PARSE_ERROR: 'PARSE_ERROR'
}

/**
 * Base error class for API-related errors
 */
export class LogoApiError extends Error {
  constructor(message, code, originalError = null) {
    super(message)
    this.name = 'LogoApiError'
    this.code = code
    this.originalError = originalError
  }
}

/**
 * Default configuration for network error handling
 */
const DEFAULT_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  jitterFactor: 0.1,
  timeoutMs: 10000,
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
  retryableErrorCodes: [
    ERROR_CODES.NETWORK_ERROR,
    ERROR_CODES.TIMEOUT_ERROR,
    ERROR_CODES.CATALOG_LOAD_ERROR
  ]
}

/**
 * Network status tracker
 */
class NetworkStatus {
  constructor() {
    this.isOnline = navigator.onLine
    this.listeners = new Set()
    
    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.isOnline = true
      this.notifyListeners('online')
    })
    
    window.addEventListener('offline', () => {
      this.isOnline = false
      this.notifyListeners('offline')
    })
  }
  
  addListener(callback) {
    this.listeners.add(callback)
    return () => this.listeners.delete(callback)
  }
  
  notifyListeners(status) {
    this.listeners.forEach(callback => {
      try {
        callback(status, this.isOnline)
      } catch (error) {
        console.error('Network status listener error:', error)
      }
    })
  }
  
  async checkConnectivity() {
    if (!this.isOnline) {
      return false
    }
    
    try {
      // Try to fetch a small resource to verify connectivity
      const response = await fetch('/favicon.ico', {
        method: 'HEAD',
        cache: 'no-cache',
        signal: AbortSignal.timeout(3000)
      })
      return response.ok
    } catch {
      return false
    }
  }
}

const networkStatus = new NetworkStatus()

/**
 * Enhanced error class with retry information
 */
export class NetworkError extends LogoApiError {
  constructor(message, code, originalError = null, retryInfo = {}) {
    super(message, code, originalError)
    this.name = 'NetworkError'
    this.retryInfo = {
      attempt: 0,
      maxRetries: 0,
      nextRetryDelay: 0,
      canRetry: false,
      ...retryInfo
    }
    this.timestamp = Date.now()
  }
}

/**
 * Calculate delay for exponential backoff with jitter
 */
function calculateRetryDelay(attempt, config) {
  const exponentialDelay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1)
  const jitter = exponentialDelay * config.jitterFactor * Math.random()
  const delay = Math.min(exponentialDelay + jitter, config.maxDelay)
  return Math.floor(delay)
}

/**
 * Check if an error is retryable
 */
function isRetryableError(error, config) {
  // Check if we're offline
  if (!networkStatus.isOnline) {
    return false
  }
  
  // Check error codes
  if (error instanceof LogoApiError && config.retryableErrorCodes.includes(error.code)) {
    return true
  }
  
  // Check HTTP status codes
  if (error.status && config.retryableStatusCodes.includes(error.status)) {
    return true
  }
  
  // Check for specific error types
  if (error.name === 'TypeError' && error.message.includes('fetch')) {
    return true // Network error
  }
  
  if (error.name === 'AbortError' && error.message.includes('timeout')) {
    return true // Timeout error
  }
  
  return false
}

/**
 * Wait for network to come back online
 */
function waitForOnline(timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    if (networkStatus.isOnline) {
      resolve()
      return
    }
    
    const timeout = setTimeout(() => {
      cleanup()
      reject(new NetworkError(
        'Network connection timeout',
        ERROR_CODES.NETWORK_ERROR,
        null,
        { canRetry: false }
      ))
    }, timeoutMs)
    
    const cleanup = networkStatus.addListener((status) => {
      if (status === 'online') {
        clearTimeout(timeout)
        cleanup()
        resolve()
      }
    })
  })
}

/**
 * Enhanced fetch with retry logic and error handling
 */
export async function fetchWithRetry(url, options = {}, config = {}) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config }
  const { maxRetries, timeoutMs } = finalConfig
  
  let lastError = null
  
  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      // Wait for network if offline
      if (!networkStatus.isOnline) {
        await waitForOnline(10000) // Wait up to 10 seconds for network
      }
      
      // Create abort controller for timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
      
      // Make the request
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
      // Check if response is ok
      if (!response.ok) {
        throw new NetworkError(
          `HTTP ${response.status}: ${response.statusText}`,
          ERROR_CODES.NETWORK_ERROR,
          null,
          {
            attempt,
            maxRetries,
            canRetry: attempt <= maxRetries && isRetryableError({ status: response.status }, finalConfig)
          }
        )
      }
      
      return response
      
    } catch (error) {
      lastError = error
      
      // Handle abort/timeout errors
      if (error.name === 'AbortError') {
        lastError = new NetworkError(
          'Request timed out',
          ERROR_CODES.TIMEOUT_ERROR,
          error,
          {
            attempt,
            maxRetries,
            canRetry: attempt <= maxRetries
          }
        )
      }
      
      // Handle network errors
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        lastError = new NetworkError(
          'Network connection failed',
          ERROR_CODES.NETWORK_ERROR,
          error,
          {
            attempt,
            maxRetries,
            canRetry: attempt <= maxRetries
          }
        )
      }
      
      // Don't retry on the last attempt
      if (attempt > maxRetries) {
        break
      }
      
      // Check if error is retryable
      if (!isRetryableError(lastError, finalConfig)) {
        break
      }
      
      // Calculate delay and wait
      const delay = calculateRetryDelay(attempt, finalConfig)
      lastError.retryInfo.nextRetryDelay = delay
      
      console.warn(`Request failed (attempt ${attempt}/${maxRetries + 1}), retrying in ${delay}ms:`, {
        url,
        error: lastError.message,
        attempt,
        delay
      })
      
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  // All retries exhausted
  if (lastError instanceof NetworkError) {
    lastError.retryInfo.canRetry = false
    throw lastError
  }
  
  throw new NetworkError(
    `Request failed after ${maxRetries + 1} attempts: ${lastError?.message || 'Unknown error'}`,
    ERROR_CODES.NETWORK_ERROR,
    lastError,
    {
      attempt: maxRetries + 1,
      maxRetries,
      canRetry: false
    }
  )
}

/**
 * Fetch JSON with retry and error handling
 */
export async function fetchJsonWithRetry(url, options = {}, config = {}) {
  try {
    const response = await fetchWithRetry(url, options, config)
    const data = await response.json()
    return data
  } catch (error) {
    if (error instanceof NetworkError) {
      throw error
    }
    
    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      throw new NetworkError(
        'Invalid response format',
        ERROR_CODES.PARSE_ERROR,
        error,
        { canRetry: false }
      )
    }
    
    throw new NetworkError(
      `Failed to fetch JSON: ${error.message}`,
      ERROR_CODES.NETWORK_ERROR,
      error,
      { canRetry: false }
    )
  }
}

/**
 * Create a retry handler for failed operations
 */
export function createRetryHandler(operation, config = {}) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config }
  let retryCount = 0
  
  const retry = async () => {
    retryCount++
    
    if (retryCount > finalConfig.maxRetries) {
      throw new NetworkError(
        'Maximum retry attempts exceeded',
        ERROR_CODES.NETWORK_ERROR,
        null,
        {
          attempt: retryCount,
          maxRetries: finalConfig.maxRetries,
          canRetry: false
        }
      )
    }
    
    try {
      return await operation()
    } catch (error) {
      if (!isRetryableError(error, finalConfig)) {
        throw error
      }
      
      const delay = calculateRetryDelay(retryCount, finalConfig)
      await new Promise(resolve => setTimeout(resolve, delay))
      
      return retry()
    }
  }
  
  const reset = () => {
    retryCount = 0
  }
  
  const getRetryInfo = () => ({
    attempt: retryCount,
    maxRetries: finalConfig.maxRetries,
    canRetry: retryCount < finalConfig.maxRetries
  })
  
  return {
    retry,
    reset,
    getRetryInfo
  }
}

/**
 * Network error recovery strategies
 */
export const recoveryStrategies = {
  /**
   * Wait for network connection to be restored
   */
  async waitForConnection(timeoutMs = 30000) {
    return waitForOnline(timeoutMs)
  },
  
  /**
   * Try alternative endpoints or fallback URLs
   */
  async tryFallbackUrls(urls, options = {}, config = {}) {
    let lastError = null
    
    for (const url of urls) {
      try {
        return await fetchWithRetry(url, options, { ...config, maxRetries: 1 })
      } catch (error) {
        lastError = error
        console.warn(`Fallback URL failed: ${url}`, error.message)
      }
    }
    
    throw new NetworkError(
      'All fallback URLs failed',
      ERROR_CODES.NETWORK_ERROR,
      lastError,
      { canRetry: false }
    )
  },
  
  /**
   * Use cached data as fallback
   */
  async useCachedFallback(cacheKey, fetchOperation) {
    try {
      return await fetchOperation()
    } catch (error) {
      // Try to get cached data
      const cached = localStorage.getItem(cacheKey)
      if (cached) {
        try {
          const data = JSON.parse(cached)
          console.warn('Using cached fallback data due to network error:', error.message)
          return data
        } catch (parseError) {
          console.error('Failed to parse cached data:', parseError)
        }
      }
      
      throw error
    }
  }
}

/**
 * Global error handler for unhandled network errors
 */
export function setupGlobalErrorHandler() {
  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason instanceof NetworkError) {
      console.error('Unhandled network error:', event.reason)
      
      // Optionally show user notification
      if (event.reason.code === ERROR_CODES.NETWORK_ERROR && !networkStatus.isOnline) {
        // Could show a toast notification about being offline
        console.warn('Application is offline')
      }
    }
  })
  
  // Handle general errors
  window.addEventListener('error', (event) => {
    if (event.error instanceof NetworkError) {
      console.error('Unhandled network error:', event.error)
    }
  })
}

/**
 * Get network status and add listeners
 */
export function useNetworkStatus() {
  return {
    isOnline: networkStatus.isOnline,
    addListener: networkStatus.addListener.bind(networkStatus),
    checkConnectivity: networkStatus.checkConnectivity.bind(networkStatus)
  }
}

// ERROR_CODES and LogoApiError are already exported above

// Export default configuration for customization
export { DEFAULT_CONFIG as defaultNetworkConfig }