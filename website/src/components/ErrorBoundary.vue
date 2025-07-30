<template>
  <div v-if="hasError" class="error-boundary" role="alert" aria-live="assertive">
    <div class="error-boundary__container">
      <div class="error-boundary__icon">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
      </div>
      
      <div class="error-boundary__content">
        <h2 class="error-boundary__title">{{ errorTitle }}</h2>
        <p class="error-boundary__message">{{ errorMessage }}</p>
        
        <div v-if="showDetails && errorDetails" class="error-boundary__details">
          <button
            type="button"
            class="error-boundary__details-toggle"
            :aria-expanded="showErrorDetails"
            @click="showErrorDetails = !showErrorDetails"
          >
            {{ showErrorDetails ? 'Hide' : 'Show' }} Error Details
            <svg 
              width="16" 
              height="16" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              stroke-width="2"
              :class="{ 'error-boundary__chevron--expanded': showErrorDetails }"
              class="error-boundary__chevron"
            >
              <polyline points="6,9 12,15 18,9"></polyline>
            </svg>
          </button>
          
          <div v-if="showErrorDetails" class="error-boundary__details-content">
            <pre class="error-boundary__error-text">{{ errorDetails }}</pre>
          </div>
        </div>
        
        <div class="error-boundary__actions">
          <button
            type="button"
            class="error-boundary__action error-boundary__action--primary"
            @click="handleRetry"
            :disabled="isRetrying"
          >
            <svg v-if="isRetrying" width="16" height="16" viewBox="0 0 24 24" class="error-boundary__spinner">
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
            <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="23,4 23,10 17,10"></polyline>
              <polyline points="1,20 1,14 7,14"></polyline>
              <path d="M20.49,9A9,9,0,0,0,5.64,5.64L1,10m22,4L18.36,18.36A9,9,0,0,1,3.51,15"></path>
            </svg>
            {{ isRetrying ? 'Retrying...' : 'Try Again' }}
          </button>
          
          <button
            v-if="showReload"
            type="button"
            class="error-boundary__action error-boundary__action--secondary"
            @click="handleReload"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="23,4 23,10 17,10"></polyline>
              <polyline points="1,20 1,14 7,14"></polyline>
              <path d="M20.49,9A9,9,0,0,0,5.64,5.64L1,10m22,4L18.36,18.36A9,9,0,0,1,3.51,15"></path>
            </svg>
            Reload Page
          </button>
          
          <button
            v-if="showGoHome"
            type="button"
            class="error-boundary__action error-boundary__action--secondary"
            @click="handleGoHome"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9,22 9,12 15,12 15,22"></polyline>
            </svg>
            Go Home
          </button>
        </div>
        
        <div v-if="showRetryCount && retryCount > 0" class="error-boundary__retry-info">
          Retry attempt {{ retryCount }} of {{ maxRetries }}
        </div>
      </div>
    </div>
  </div>
  
  <slot v-else />
</template>

<script>
import { ref, computed, watch, onErrorCaptured } from 'vue'
import { useRouter } from 'vue-router'

export default {
  name: 'ErrorBoundary',
  
  props: {
    error: {
      type: [Error, Object, String],
      default: null
    },
    fallbackTitle: {
      type: String,
      default: 'Something went wrong'
    },
    fallbackMessage: {
      type: String,
      default: 'An unexpected error occurred. Please try again.'
    },
    showDetails: {
      type: Boolean,
      default: true
    },
    showReload: {
      type: Boolean,
      default: true
    },
    showGoHome: {
      type: Boolean,
      default: true
    },
    showRetryCount: {
      type: Boolean,
      default: false
    },
    maxRetries: {
      type: Number,
      default: 3
    },
    autoRetry: {
      type: Boolean,
      default: false
    },
    autoRetryDelay: {
      type: Number,
      default: 2000
    }
  },
  
  emits: ['retry', 'reload', 'go-home', 'error-captured'],
  
  setup(props, { emit }) {
    const router = useRouter()
    
    // Component state
    const capturedError = ref(null)
    const showErrorDetails = ref(false)
    const isRetrying = ref(false)
    const retryCount = ref(0)
    const autoRetryTimeout = ref(null)
    
    // Computed properties
    const hasError = computed(() => {
      return props.error !== null || capturedError.value !== null
    })
    
    const currentError = computed(() => {
      return props.error || capturedError.value
    })
    
    const errorTitle = computed(() => {
      if (!currentError.value) return props.fallbackTitle
      
      if (typeof currentError.value === 'object' && currentError.value.title) {
        return currentError.value.title
      }
      
      // Check if it's a NetworkError with a code
      if (typeof currentError.value === 'object' && currentError.value.code) {
        switch (currentError.value.code) {
          case 'NETWORK_ERROR':
            return 'Network Connection Error'
          case 'CATALOG_LOAD_ERROR':
            return 'Failed to Load Catalog'
          case 'TIMEOUT_ERROR':
            return 'Request Timed Out'
          case 'PARSE_ERROR':
            return 'Data Format Error'
          default:
            return props.fallbackTitle
        }
      }
      
      return props.fallbackTitle
    })
    
    const errorMessage = computed(() => {
      if (!currentError.value) return props.fallbackMessage
      
      if (typeof currentError.value === 'string') {
        return currentError.value
      }
      
      if (typeof currentError.value === 'object' && currentError.value.message) {
        return currentError.value.message
      }
      
      // Provide default messages for error codes only if no custom message
      if (typeof currentError.value === 'object' && currentError.value.code && !currentError.value.message) {
        switch (currentError.value.code) {
          case 'NETWORK_ERROR':
            return 'Unable to connect to the server. Please check your internet connection and try again.'
          case 'CATALOG_LOAD_ERROR':
            return 'Failed to load the logo catalog. This might be a temporary issue.'
          case 'TIMEOUT_ERROR':
            return 'The request took too long to complete. Please try again.'
          case 'PARSE_ERROR':
            return 'The server returned invalid data. Please try again later.'
          default:
            return props.fallbackMessage
        }
      }
      
      return props.fallbackMessage
    })
    
    const errorDetails = computed(() => {
      if (!currentError.value) return null
      
      if (typeof currentError.value === 'object') {
        if (currentError.value.stack) {
          return currentError.value.stack
        }
        
        if (currentError.value.originalError && currentError.value.originalError.stack) {
          return currentError.value.originalError.stack
        }
        
        return JSON.stringify(currentError.value, null, 2)
      }
      
      return String(currentError.value)
    })
    
    // Error capture handler
    onErrorCaptured((error, instance, info) => {
      console.error('Error captured by ErrorBoundary:', error, info)
      
      capturedError.value = {
        message: error.message,
        stack: error.stack,
        info,
        timestamp: new Date().toISOString()
      }
      
      emit('error-captured', {
        error,
        instance,
        info,
        timestamp: new Date().toISOString()
      })
      
      // Start auto-retry if enabled
      if (props.autoRetry && retryCount.value < props.maxRetries) {
        startAutoRetry()
      }
      
      return false // Prevent the error from propagating further
    })
    
    // Event handlers
    const handleRetry = async () => {
      if (isRetrying.value) return
      
      isRetrying.value = true
      retryCount.value++
      
      // Clear auto-retry timeout if active
      if (autoRetryTimeout.value) {
        clearTimeout(autoRetryTimeout.value)
        autoRetryTimeout.value = null
      }
      
      try {
        await new Promise(resolve => setTimeout(resolve, 500)) // Brief delay for UX
        
        // Clear the error state
        capturedError.value = null
        
        emit('retry', {
          retryCount: retryCount.value,
          maxRetries: props.maxRetries
        })
        
        // If this was a prop error, the parent should handle clearing it
        
      } catch (retryError) {
        console.error('Retry failed:', retryError)
        capturedError.value = retryError
      } finally {
        isRetrying.value = false
      }
    }
    
    const handleReload = () => {
      emit('reload')
      window.location.reload()
    }
    
    const handleGoHome = () => {
      emit('go-home')
      router.push('/')
    }
    
    const startAutoRetry = () => {
      if (autoRetryTimeout.value) {
        clearTimeout(autoRetryTimeout.value)
      }
      
      autoRetryTimeout.value = setTimeout(() => {
        handleRetry()
      }, props.autoRetryDelay)
    }
    
    const clearError = () => {
      capturedError.value = null
      retryCount.value = 0
      isRetrying.value = false
      
      if (autoRetryTimeout.value) {
        clearTimeout(autoRetryTimeout.value)
        autoRetryTimeout.value = null
      }
    }
    
    // Watch for prop error changes
    watch(() => props.error, (newError, oldError) => {
      if (newError !== oldError) {
        if (newError === null) {
          // Error was cleared by parent
          clearError()
        } else if (props.autoRetry && retryCount.value < props.maxRetries) {
          startAutoRetry()
        }
      }
    })
    
    return {
      // State
      showErrorDetails,
      isRetrying,
      retryCount,
      
      // Computed
      hasError,
      errorTitle,
      errorMessage,
      errorDetails,
      
      // Methods
      handleRetry,
      handleReload,
      handleGoHome,
      clearError
    }
  }
}
</script>

<style scoped>
.error-boundary {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  padding: 24px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 12px;
  margin: 16px 0;
}

.error-boundary__container {
  max-width: 600px;
  text-align: center;
}

.error-boundary__icon {
  margin-bottom: 24px;
  color: #ef4444;
}

.error-boundary__content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.error-boundary__title {
  font-size: 24px;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}

.error-boundary__message {
  font-size: 16px;
  color: #64748b;
  line-height: 1.6;
  margin: 0;
}

.error-boundary__details {
  text-align: left;
}

.error-boundary__details-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  background: none;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 8px 12px;
  font-size: 14px;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s ease;
}

.error-boundary__details-toggle:hover {
  background: #f8fafc;
  border-color: #cbd5e1;
}

.error-boundary__details-toggle:focus {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}

.error-boundary__chevron {
  transition: transform 0.2s ease;
}

.error-boundary__chevron--expanded {
  transform: rotate(180deg);
}

.error-boundary__details-content {
  margin-top: 12px;
  padding: 16px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  overflow-x: auto;
}

.error-boundary__error-text {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 12px;
  color: #374151;
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
}

.error-boundary__actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
}

.error-boundary__action {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;
}

.error-boundary__action:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error-boundary__action--primary {
  background: #3b82f6;
  color: white;
}

.error-boundary__action--primary:hover:not(:disabled) {
  background: #2563eb;
}

.error-boundary__action--primary:focus {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}

.error-boundary__action--secondary {
  background: #f8fafc;
  color: #64748b;
  border: 1px solid #e2e8f0;
}

.error-boundary__action--secondary:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
}

.error-boundary__action--secondary:focus {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}

.error-boundary__spinner {
  animation: spin 1s linear infinite;
}

.error-boundary__retry-info {
  font-size: 12px;
  color: #94a3b8;
  text-align: center;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Responsive design */
@media (max-width: 640px) {
  .error-boundary {
    padding: 16px;
    margin: 12px 0;
  }
  
  .error-boundary__title {
    font-size: 20px;
  }
  
  .error-boundary__message {
    font-size: 14px;
  }
  
  .error-boundary__actions {
    flex-direction: column;
  }
  
  .error-boundary__action {
    width: 100%;
    justify-content: center;
  }
}

/* High contrast mode */
@media (prefers-contrast: high) {
  .error-boundary {
    border-width: 2px;
  }
  
  .error-boundary__action {
    border-width: 2px;
  }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .error-boundary__chevron,
  .error-boundary__action {
    transition: none;
  }
  
  .error-boundary__spinner {
    animation: none;
  }
}

/* Dark mode */
@media (prefers-color-scheme: dark) {
  .error-boundary {
    background: #450a0a;
    border-color: #7f1d1d;
  }
  
  .error-boundary__title {
    color: #f1f5f9;
  }
  
  .error-boundary__message {
    color: #94a3b8;
  }
  
  .error-boundary__details-toggle {
    background: #1e293b;
    border-color: #475569;
    color: #94a3b8;
  }
  
  .error-boundary__details-toggle:hover {
    background: #334155;
    border-color: #64748b;
  }
  
  .error-boundary__details-content {
    background: #1e293b;
    border-color: #475569;
  }
  
  .error-boundary__error-text {
    color: #e2e8f0;
  }
  
  .error-boundary__action--secondary {
    background: #1e293b;
    color: #94a3b8;
    border-color: #475569;
  }
  
  .error-boundary__action--secondary:hover {
    background: #334155;
    border-color: #64748b;
  }
  
  .error-boundary__retry-info {
    color: #64748b;
  }
}
</style>