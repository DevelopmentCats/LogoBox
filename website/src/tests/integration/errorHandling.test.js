/**
 * Integration tests for error handling functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ErrorBoundary from '../../components/ErrorBoundary.vue'
import { NetworkError, ERROR_CODES } from '../../utils/networkErrorHandler.js'

describe('Error Handling Integration', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })
  
  it('should handle network errors with retry functionality', async () => {
    const networkError = new NetworkError(
      'Failed to load catalog',
      ERROR_CODES.CATALOG_LOAD_ERROR,
      null,
      { canRetry: true, attempt: 1, maxRetries: 3 }
    )
    
    const wrapper = mount(ErrorBoundary, {
      props: {
        error: networkError,
        showRetryCount: true
      }
    })
    
    // Should show error UI
    expect(wrapper.find('.error-boundary').exists()).toBe(true)
    expect(wrapper.text()).toContain('Failed to Load Catalog')
    expect(wrapper.text()).toContain('Failed to load catalog')
    
    // Should have retry button
    const retryButton = wrapper.find('.error-boundary__action--primary')
    expect(retryButton.exists()).toBe(true)
    expect(retryButton.text()).toContain('Try Again')
    
    // Should show error details toggle
    const detailsToggle = wrapper.find('.error-boundary__details-toggle')
    expect(detailsToggle.exists()).toBe(true)
  })
  
  it('should handle different error types appropriately', async () => {
    const testCases = [
      {
        error: new NetworkError('Network failed', ERROR_CODES.NETWORK_ERROR),
        expectedTitle: 'Network Connection Error'
      },
      {
        error: new NetworkError('Timeout occurred', ERROR_CODES.TIMEOUT_ERROR),
        expectedTitle: 'Request Timed Out'
      },
      {
        error: new NetworkError('Parse failed', ERROR_CODES.PARSE_ERROR),
        expectedTitle: 'Data Format Error'
      },
      {
        error: 'Simple string error',
        expectedTitle: 'Something went wrong'
      }
    ]
    
    for (const { error, expectedTitle } of testCases) {
      const wrapper = mount(ErrorBoundary, {
        props: { error }
      })
      
      expect(wrapper.text()).toContain(expectedTitle)
      wrapper.unmount()
    }
  })
  
  it('should provide fallback UI when components fail', () => {
    const FailingComponent = {
      template: '<div>{{ fail() }}</div>',
      methods: {
        fail() {
          throw new Error('Component failed')
        }
      }
    }
    
    const wrapper = mount(ErrorBoundary, {
      slots: {
        default: FailingComponent
      }
    })
    
    // Should catch the error and show error boundary
    expect(wrapper.find('.error-boundary').exists()).toBe(true)
    expect(wrapper.text()).toContain('Something went wrong')
  })
  
  it('should handle retry attempts correctly', async () => {
    const error = new NetworkError(
      'Test error',
      ERROR_CODES.NETWORK_ERROR,
      null,
      { canRetry: true }
    )
    
    const wrapper = mount(ErrorBoundary, {
      props: { error }
    })
    
    const retryButton = wrapper.find('.error-boundary__action--primary')
    
    // Click retry
    await retryButton.trigger('click')
    
    // Should emit retry event
    expect(wrapper.emitted('retry')).toBeTruthy()
  })
  
  it('should show appropriate action buttons', () => {
    const error = new NetworkError('Test error', ERROR_CODES.NETWORK_ERROR)
    
    const wrapper = mount(ErrorBoundary, {
      props: { 
        error,
        showReload: true,
        showGoHome: true
      }
    })
    
    const actionButtons = wrapper.findAll('.error-boundary__action')
    expect(actionButtons.length).toBeGreaterThanOrEqual(1)
    
    // Should have retry button
    expect(wrapper.text()).toContain('Try Again')
  })
})