/**
 * Unit tests for ErrorBoundary component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import ErrorBoundary from '../../components/ErrorBoundary.vue'
import { NetworkError, ERROR_CODES } from '../../utils/networkErrorHandler.js'

// Mock router
const mockRouter = {
  push: vi.fn()
}

vi.mock('vue-router', () => ({
  useRouter: () => mockRouter
}))

describe('ErrorBoundary', () => {
  let wrapper
  
  beforeEach(() => {
    vi.clearAllMocks()
  })
  
  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })
  
  it('should render slot content when no error', () => {
    wrapper = mount(ErrorBoundary, {
      slots: {
        default: '<div data-testid="content">Normal content</div>'
      }
    })
    
    expect(wrapper.find('[data-testid="content"]').exists()).toBe(true)
    expect(wrapper.find('.error-boundary').exists()).toBe(false)
  })
  
  it('should render error UI when error prop is provided', async () => {
    const error = new NetworkError('Test error', ERROR_CODES.NETWORK_ERROR)
    
    wrapper = mount(ErrorBoundary, {
      props: {
        error
      },
      slots: {
        default: '<div data-testid="content">Normal content</div>'
      }
    })
    
    expect(wrapper.find('.error-boundary').exists()).toBe(true)
    expect(wrapper.find('[data-testid="content"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('Network Connection Error')
    expect(wrapper.text()).toContain('Test error')
  })
  
  it('should show appropriate title for different error codes', async () => {
    const testCases = [
      { code: ERROR_CODES.NETWORK_ERROR, expectedTitle: 'Network Connection Error' },
      { code: ERROR_CODES.CATALOG_LOAD_ERROR, expectedTitle: 'Failed to Load Catalog' },
      { code: ERROR_CODES.TIMEOUT_ERROR, expectedTitle: 'Request Timed Out' },
      { code: ERROR_CODES.PARSE_ERROR, expectedTitle: 'Data Format Error' }
    ]
    
    for (const { code, expectedTitle } of testCases) {
      const error = new NetworkError('Test error', code)
      
      wrapper = mount(ErrorBoundary, {
        props: { error }
      })
      
      expect(wrapper.text()).toContain(expectedTitle)
      wrapper.unmount()
    }
  })
  
  it('should show appropriate message for different error codes', async () => {
    const error = new NetworkError('Custom message', ERROR_CODES.NETWORK_ERROR)
    
    wrapper = mount(ErrorBoundary, {
      props: { error }
    })
    
    expect(wrapper.text()).toContain('Custom message')
  })
  
  it('should handle string errors', async () => {
    wrapper = mount(ErrorBoundary, {
      props: {
        error: 'Simple string error'
      }
    })
    
    expect(wrapper.text()).toContain('Simple string error')
  })
  
  it('should emit retry event when retry button is clicked', async () => {
    const error = new NetworkError('Test error', ERROR_CODES.NETWORK_ERROR)
    
    wrapper = mount(ErrorBoundary, {
      props: { error }
    })
    
    const retryButton = wrapper.find('.error-boundary__action--primary')
    await retryButton.trigger('click')
    
    expect(wrapper.emitted('retry')).toBeTruthy()
    expect(wrapper.emitted('retry')[0][0]).toEqual({
      retryCount: 1,
      maxRetries: 3
    })
  })
  
  it('should show loading state during retry', async () => {
    const error = new NetworkError('Test error', ERROR_CODES.NETWORK_ERROR)
    
    wrapper = mount(ErrorBoundary, {
      props: { error }
    })
    
    const retryButton = wrapper.find('.error-boundary__action--primary')
    
    // Click retry button
    await retryButton.trigger('click')
    
    // Should show loading state
    expect(retryButton.text()).toContain('Retrying...')
    expect(retryButton.attributes('disabled')).toBeDefined()
    expect(wrapper.find('.error-boundary__spinner').exists()).toBe(true)
  })
  
  it('should emit reload event when reload button is clicked', async () => {
    const error = new NetworkError('Test error', ERROR_CODES.NETWORK_ERROR)
    
    // Mock window.location.reload
    const mockReload = vi.fn()
    Object.defineProperty(window, 'location', {
      value: { reload: mockReload },
      writable: true
    })
    
    wrapper = mount(ErrorBoundary, {
      props: { error }
    })
    
    const reloadButton = wrapper.findAll('.error-boundary__action--secondary')[0]
    await reloadButton.trigger('click')
    
    expect(wrapper.emitted('reload')).toBeTruthy()
    expect(mockReload).toHaveBeenCalled()
  })
  
  it('should emit go-home event and navigate when go home button is clicked', async () => {
    const error = new NetworkError('Test error', ERROR_CODES.NETWORK_ERROR)
    
    wrapper = mount(ErrorBoundary, {
      props: { error }
    })
    
    const goHomeButton = wrapper.findAll('.error-boundary__action--secondary')[1]
    await goHomeButton.trigger('click')
    
    expect(wrapper.emitted('go-home')).toBeTruthy()
    expect(mockRouter.push).toHaveBeenCalledWith('/')
  })
  
  it('should toggle error details visibility', async () => {
    const error = new NetworkError('Test error', ERROR_CODES.NETWORK_ERROR)
    error.stack = 'Error stack trace'
    
    wrapper = mount(ErrorBoundary, {
      props: { 
        error,
        showDetails: true
      }
    })
    
    const detailsToggle = wrapper.find('.error-boundary__details-toggle')
    expect(detailsToggle.exists()).toBe(true)
    
    // Details should be hidden initially
    expect(wrapper.find('.error-boundary__details-content').exists()).toBe(false)
    
    // Click to show details
    await detailsToggle.trigger('click')
    await nextTick()
    
    expect(wrapper.find('.error-boundary__details-content').exists()).toBe(true)
    expect(wrapper.text()).toContain('Error stack trace')
    
    // Click to hide details
    await detailsToggle.trigger('click')
    await nextTick()
    
    expect(wrapper.find('.error-boundary__details-content').exists()).toBe(false)
  })
  
  it('should show retry count when enabled', async () => {
    const error = new NetworkError('Test error', ERROR_CODES.NETWORK_ERROR)
    
    wrapper = mount(ErrorBoundary, {
      props: { 
        error,
        showRetryCount: true,
        maxRetries: 5
      }
    })
    
    // Click retry to increment count
    const retryButton = wrapper.find('.error-boundary__action--primary')
    await retryButton.trigger('click')
    await nextTick()
    
    expect(wrapper.text()).toContain('Retry attempt 1 of 5')
  })
  
  it('should handle auto-retry functionality', async () => {
    vi.useFakeTimers()
    
    const error = new NetworkError('Test error', ERROR_CODES.NETWORK_ERROR)
    
    wrapper = mount(ErrorBoundary, {
      props: { 
        error,
        autoRetry: true,
        autoRetryDelay: 1000,
        maxRetries: 2
      }
    })
    
    // Fast-forward time to trigger auto-retry
    vi.advanceTimersByTime(1000)
    await nextTick()
    
    expect(wrapper.emitted('retry')).toBeTruthy()
    
    vi.useRealTimers()
  })
  
  it('should clear error when error prop becomes null', async () => {
    const error = new NetworkError('Test error', ERROR_CODES.NETWORK_ERROR)
    
    wrapper = mount(ErrorBoundary, {
      props: { error }
    })
    
    expect(wrapper.find('.error-boundary').exists()).toBe(true)
    
    // Clear error
    await wrapper.setProps({ error: null })
    
    expect(wrapper.find('.error-boundary').exists()).toBe(false)
  })
  
  it('should handle custom fallback messages', async () => {
    const error = new NetworkError('Test error', ERROR_CODES.NETWORK_ERROR)
    
    wrapper = mount(ErrorBoundary, {
      props: { 
        error,
        fallbackTitle: 'Custom Error Title',
        fallbackMessage: 'Custom error message'
      }
    })
    
    expect(wrapper.text()).toContain('Custom Error Title')
    expect(wrapper.text()).toContain('Custom error message')
  })
  
  it('should conditionally show action buttons', async () => {
    const error = new NetworkError('Test error', ERROR_CODES.NETWORK_ERROR)
    
    wrapper = mount(ErrorBoundary, {
      props: { 
        error,
        showReload: false,
        showGoHome: false
      }
    })
    
    const actionButtons = wrapper.findAll('.error-boundary__action')
    expect(actionButtons).toHaveLength(1) // Only retry button
    expect(actionButtons[0].text()).toContain('Try Again')
  })
  
  it('should handle error capture from child components', async () => {
    const ThrowingComponent = {
      template: '<div>{{ throwError() }}</div>',
      methods: {
        throwError() {
          throw new Error('Child component error')
        }
      }
    }
    
    wrapper = mount(ErrorBoundary, {
      slots: {
        default: ThrowingComponent
      }
    })
    
    await nextTick()
    
    expect(wrapper.emitted('error-captured')).toBeTruthy()
    expect(wrapper.find('.error-boundary').exists()).toBe(true)
  })
  
  it('should have proper accessibility attributes', async () => {
    const error = new NetworkError('Test error', ERROR_CODES.NETWORK_ERROR)
    
    wrapper = mount(ErrorBoundary, {
      props: { error }
    })
    
    const errorBoundary = wrapper.find('.error-boundary')
    expect(errorBoundary.attributes('role')).toBe('alert')
    expect(errorBoundary.attributes('aria-live')).toBe('assertive')
    
    const retryButton = wrapper.find('.error-boundary__action--primary')
    expect(retryButton.attributes('type')).toBe('button')
  })
})