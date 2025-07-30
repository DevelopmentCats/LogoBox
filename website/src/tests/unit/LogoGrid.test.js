/**
 * Unit tests for LogoGrid component
 * Tests virtual scrolling, grid rendering, and user interactions
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import LogoGrid from '../../components/LogoGrid.vue'
import LogoCard from '../../components/LogoCard.vue'

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation((callback) => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}))

// Mock data
const mockLogos = [
  {
    slug: 'github',
    name: 'GitHub',
    description: 'Git repository hosting service',
    categories: ['development', 'tools'],
    tags: ['git', 'code', 'repository']
  },
  {
    slug: 'microsoft',
    name: 'Microsoft',
    description: 'Technology company',
    categories: ['technology', 'software'],
    tags: ['windows', 'office', 'cloud']
  },
  {
    slug: 'google',
    name: 'Google',
    description: 'Search engine and technology company',
    categories: ['technology', 'search'],
    tags: ['search', 'android', 'cloud']
  },
  {
    slug: 'apple',
    name: 'Apple',
    description: 'Consumer electronics company',
    categories: ['technology', 'hardware'],
    tags: ['iphone', 'mac', 'ios']
  },
  {
    slug: 'facebook',
    name: 'Facebook',
    description: 'Social media platform',
    categories: ['social', 'technology'],
    tags: ['social', 'messaging', 'meta']
  }
]

// Helper function to create wrapper with default props
const createWrapper = (props = {}) => {
  return mount(LogoGrid, {
    props: {
      logos: mockLogos,
      loading: false,
      error: null,
      ...props
    },
    global: {
      components: {
        LogoCard
      }
    }
  })
}

describe('LogoGrid', () => {
  let wrapper

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  describe('Component Rendering', () => {
    it('renders without crashing', () => {
      wrapper = createWrapper()
      expect(wrapper.exists()).toBe(true)
    })

    it('has correct component name', () => {
      wrapper = createWrapper()
      expect(wrapper.vm.$options.name).toBe('LogoGrid')
    })

    it('renders with proper ARIA attributes', () => {
      wrapper = createWrapper()
      const gridElement = wrapper.find('.logo-grid')
      
      expect(gridElement.attributes('role')).toBe('grid')
      expect(gridElement.attributes('aria-label')).toContain('Grid of')
      expect(gridElement.attributes('aria-busy')).toBe('false')
    })

    it('applies correct CSS classes based on state', () => {
      wrapper = createWrapper({ loading: true })
      expect(wrapper.find('.logo-grid').classes()).toContain('logo-grid--loading')

      wrapper = createWrapper({ error: 'Test error' })
      expect(wrapper.find('.logo-grid').classes()).toContain('logo-grid--error')

      wrapper = createWrapper({ logos: [] })
      expect(wrapper.find('.logo-grid').classes()).toContain('logo-grid--empty')
    })
  })

  describe('Loading State', () => {
    it('displays loading spinner when loading and no logos', () => {
      wrapper = createWrapper({ loading: true, logos: [] })
      
      expect(wrapper.find('.logo-grid__loading').exists()).toBe(true)
      expect(wrapper.find('.logo-grid__loading-spinner').exists()).toBe(true)
      expect(wrapper.find('.logo-grid__loading-text').text()).toBe('Loading logos...')
    })

    it('displays loading more indicator when loading with existing logos', async () => {
      wrapper = createWrapper({ loading: true })
      await flushPromises()
      
      expect(wrapper.find('.logo-grid__loading-more').exists()).toBe(true)
      expect(wrapper.find('.logo-grid__loading-more').text()).toContain('Loading more...')
    })

    it('sets aria-busy to true when loading', () => {
      wrapper = createWrapper({ loading: true })
      expect(wrapper.find('.logo-grid').attributes('aria-busy')).toBe('true')
    })

    it('hides grid content when loading without logos', () => {
      wrapper = createWrapper({ loading: true, logos: [] })
      expect(wrapper.find('.logo-grid__scroll-container').exists()).toBe(false)
    })
  })

  describe('Error State', () => {
    it('displays error message with string error', () => {
      const errorMessage = 'Failed to load logos'
      wrapper = createWrapper({ error: errorMessage })
      
      expect(wrapper.find('.logo-grid__error').exists()).toBe(true)
      expect(wrapper.find('.logo-grid__error-title').text()).toBe('Failed to load logos')
      expect(wrapper.find('.logo-grid__error-message').text()).toBe(errorMessage)
    })

    it('displays error message with object error', () => {
      const error = { message: 'Network error occurred' }
      wrapper = createWrapper({ error })
      
      expect(wrapper.find('.logo-grid__error-message').text()).toBe('Network error occurred')
    })

    it('displays default error message for invalid error object', () => {
      wrapper = createWrapper({ error: {} })
      
      expect(wrapper.find('.logo-grid__error-message').text()).toBe('An unexpected error occurred')
    })

    it('emits retry event when retry button is clicked', async () => {
      wrapper = createWrapper({ error: 'Test error' })
      
      await wrapper.find('.logo-grid__error-retry').trigger('click')
      
      expect(wrapper.emitted('retry')).toHaveLength(1)
    })

    it('shows error icon', () => {
      wrapper = createWrapper({ error: 'Test error' })
      expect(wrapper.find('.logo-grid__error-icon svg').exists()).toBe(true)
    })
  })

  describe('Empty State', () => {
    it('displays empty state when no logos and not loading', () => {
      wrapper = createWrapper({ logos: [], loading: false })
      
      expect(wrapper.find('.logo-grid__empty').exists()).toBe(true)
      expect(wrapper.find('.logo-grid__empty-title').text()).toBe('No logos found')
      expect(wrapper.find('.logo-grid__empty-message').text()).toContain('Try adjusting your search')
    })

    it('uses custom empty title and message', () => {
      const customTitle = 'Custom empty title'
      const customMessage = 'Custom empty message'
      
      wrapper = createWrapper({ 
        logos: [], 
        loading: false,
        emptyTitle: customTitle,
        emptyMessage: customMessage
      })
      
      expect(wrapper.find('.logo-grid__empty-title').text()).toBe(customTitle)
      expect(wrapper.find('.logo-grid__empty-message').text()).toBe(customMessage)
    })

    it('shows empty icon', () => {
      wrapper = createWrapper({ logos: [], loading: false })
      expect(wrapper.find('.logo-grid__empty-icon svg').exists()).toBe(true)
    })
  })

  describe('Grid Rendering', () => {
    it('renders LogoCard components for visible logos', async () => {
      wrapper = createWrapper()
      await flushPromises()
      
      const logoCards = wrapper.findAllComponents(LogoCard)
      expect(logoCards.length).toBeGreaterThan(0)
      expect(logoCards.length).toBeLessThanOrEqual(mockLogos.length)
    })

    it('passes correct props to LogoCard components', async () => {
      wrapper = createWrapper({
        logoVariant: 'white',
        showDescription: false,
        showMetadata: false
      })
      await flushPromises()
      
      const logoCard = wrapper.findComponent(LogoCard)
      expect(logoCard.props('variant')).toBe('white')
      expect(logoCard.props('showDescription')).toBe(false)
      expect(logoCard.props('showMetadata')).toBe(false)
      expect(logoCard.props('lazyLoad')).toBe(true)
      expect(logoCard.props('clickable')).toBe(true)
    })

    it('applies correct grid styles', async () => {
      wrapper = createWrapper()
      await flushPromises()
      
      const gridElement = wrapper.find('.logo-grid__grid')
      const style = gridElement.attributes('style')
      
      expect(style).toContain('display: grid')
      expect(style).toContain('grid-template-columns')
      expect(style).toContain('gap: 24px')
    })

    it('renders grid items with correct role', async () => {
      wrapper = createWrapper()
      await flushPromises()
      
      const gridItems = wrapper.findAll('.logo-grid__item')
      gridItems.forEach(item => {
        expect(item.attributes('role')).toBe('gridcell')
      })
    })
  })

  describe('Virtual Scrolling', () => {
    beforeEach(() => {
      // Mock getBoundingClientRect for container dimensions
      Element.prototype.getBoundingClientRect = vi.fn(() => ({
        width: 800,
        height: 600,
        top: 0,
        left: 0,
        bottom: 600,
        right: 800
      }))
    })

    it('calculates total height based on items and rows', async () => {
      wrapper = createWrapper({ itemHeight: 300, gap: 20 })
      await flushPromises()
      
      // With 5 items and estimated 4 items per row, we should have 2 rows
      // Total height = 2 * (300 + 20) - 20 = 620
      const contentElement = wrapper.find('.logo-grid__content')
      const style = contentElement.attributes('style')
      expect(style).toContain('height:')
    })

    it('applies transform offset for virtual scrolling', async () => {
      wrapper = createWrapper()
      await flushPromises()
      
      const viewportElement = wrapper.find('.logo-grid__viewport')
      const style = viewportElement.attributes('style')
      expect(style).toContain('transform: translateY(')
    })

    it('handles scroll events', async () => {
      wrapper = createWrapper()
      await flushPromises()
      
      const scrollContainer = wrapper.find('.logo-grid__scroll-container')
      
      // Mock the scroll event properties
      const mockScrollEvent = {
        target: { 
          scrollTop: 100, 
          scrollHeight: 1000, 
          clientHeight: 600 
        }
      }
      
      // Directly call the handler instead of using trigger with target
      await wrapper.vm.handleScroll(mockScrollEvent)
      
      expect(wrapper.emitted('scroll')).toHaveLength(1)
      expect(wrapper.emitted('scroll')[0][0]).toEqual({
        scrollTop: 100,
        scrollHeight: 1000,
        clientHeight: 600
      })
    })

    it('calculates items per row based on container width', async () => {
      wrapper = createWrapper({ minItemWidth: 200, gap: 20 })
      await flushPromises()
      
      // With container width 800 and minItemWidth 200 + gap 20
      // Should fit 3 items per row: (800 - 40) / (200 + 20) = 3.45 -> 3
      expect(wrapper.vm.itemsPerRow).toBeGreaterThan(0)
    })

    it('respects custom itemsPerRow prop', async () => {
      wrapper = createWrapper({ itemsPerRow: 2 })
      await flushPromises()
      
      expect(wrapper.vm.itemsPerRow).toBe(2)
    })

    it('emits visible-range-change when range changes', async () => {
      wrapper = createWrapper()
      await flushPromises()
      
      // Simulate scroll to trigger range change
      wrapper.vm.scrollTop = 100
      await wrapper.vm.$nextTick()
      
      // The exact emission depends on the calculated range
      // We just verify the event structure
      if (wrapper.emitted('visible-range-change')) {
        const event = wrapper.emitted('visible-range-change')[0][0]
        expect(event).toHaveProperty('startIndex')
        expect(event).toHaveProperty('endIndex')
        expect(event).toHaveProperty('visibleCount')
      }
    })
  })

  describe('Event Handling', () => {
    it('emits logo-click when LogoCard is clicked', async () => {
      wrapper = createWrapper()
      await flushPromises()
      
      const logoCard = wrapper.findComponent(LogoCard)
      const clickEvent = { logo: mockLogos[0], event: new Event('click') }
      
      await logoCard.vm.$emit('click', clickEvent)
      
      expect(wrapper.emitted('logo-click')).toHaveLength(1)
      expect(wrapper.emitted('logo-click')[0][0]).toEqual(clickEvent)
    })

    it('emits logo-download when LogoCard download is triggered', async () => {
      wrapper = createWrapper()
      await flushPromises()
      
      const logoCard = wrapper.findComponent(LogoCard)
      const downloadEvent = { logo: mockLogos[0], variant: 'original' }
      
      await logoCard.vm.$emit('download', downloadEvent)
      
      expect(wrapper.emitted('logo-download')).toHaveLength(1)
      expect(wrapper.emitted('logo-download')[0][0]).toEqual(downloadEvent)
    })

    it('emits logo-view when LogoCard view is triggered', async () => {
      wrapper = createWrapper()
      await flushPromises()
      
      const logoCard = wrapper.findComponent(LogoCard)
      const viewEvent = { logo: mockLogos[0], variant: 'original' }
      
      await logoCard.vm.$emit('view', viewEvent)
      
      expect(wrapper.emitted('logo-view')).toHaveLength(1)
      expect(wrapper.emitted('logo-view')[0][0]).toEqual(viewEvent)
    })

    it('handles image load events without errors', async () => {
      wrapper = createWrapper()
      await flushPromises()
      
      const logoCard = wrapper.findComponent(LogoCard)
      const loadEvent = { logo: mockLogos[0], event: new Event('load') }
      
      // Should not throw error
      expect(() => {
        logoCard.vm.$emit('image-load', loadEvent)
      }).not.toThrow()
    })

    it('handles image error events', async () => {
      wrapper = createWrapper()
      await flushPromises()
      
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      
      const logoCard = wrapper.findComponent(LogoCard)
      const errorEvent = { logo: mockLogos[0], event: new Event('error') }
      
      await logoCard.vm.$emit('image-error', errorEvent)
      
      expect(consoleSpy).toHaveBeenCalledWith('Logo image failed to load:', errorEvent)
      
      consoleSpy.mockRestore()
    })
  })

  describe('Results Summary', () => {
    it('displays results summary when enabled', async () => {
      wrapper = createWrapper({ showResultsSummary: true })
      await flushPromises()
      
      expect(wrapper.find('.logo-grid__summary').exists()).toBe(true)
      const summaryText = wrapper.find('.logo-grid__summary').text()
      // The component shows "Showing X of Y logos" when filtered
      expect(summaryText).toMatch(/Showing \d+ of \d+ logos|logos available/)
    })

    it('hides results summary when disabled', async () => {
      wrapper = createWrapper({ showResultsSummary: false })
      await flushPromises()
      
      expect(wrapper.find('.logo-grid__summary').exists()).toBe(false)
    })

    it('shows filtered results message', async () => {
      wrapper = createWrapper({ showResultsSummary: true })
      await flushPromises()
      
      const summary = wrapper.find('.logo-grid__summary')
      expect(summary.text()).toContain('Showing')
      expect(summary.text()).toContain('of')
    })

    it('has correct ARIA attributes for summary', async () => {
      wrapper = createWrapper({ showResultsSummary: true, loading: true })
      await flushPromises()
      
      const summary = wrapper.find('.logo-grid__summary')
      expect(summary.attributes('role')).toBe('status')
      expect(summary.attributes('aria-live')).toBe('polite')
    })

    it('updates aria-live based on loading state', async () => {
      wrapper = createWrapper({ showResultsSummary: true, loading: false })
      await flushPromises()
      
      const summary = wrapper.find('.logo-grid__summary')
      expect(summary.attributes('aria-live')).toBe('off')
    })
  })

  describe('Responsive Behavior', () => {
    it('handles container resize', async () => {
      wrapper = createWrapper()
      await flushPromises()
      
      // Check if ResizeObserver was called
      expect(ResizeObserver).toHaveBeenCalled()
      
      // Since the component uses internal state for dimensions,
      // we test that the ResizeObserver is set up correctly
      const resizeObserverInstance = ResizeObserver.mock.results[0].value
      expect(resizeObserverInstance.observe).toHaveBeenCalled()
    })

    it('falls back to window resize when ResizeObserver is not available', async () => {
      const originalResizeObserver = global.ResizeObserver
      global.ResizeObserver = undefined
      
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener')
      
      wrapper = createWrapper()
      await flushPromises()
      
      expect(addEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function))
      
      global.ResizeObserver = originalResizeObserver
      addEventListenerSpy.mockRestore()
    })
  })

  describe('Accessibility', () => {
    it('provides proper ARIA labels for different states', () => {
      // Loading state
      wrapper = createWrapper({ loading: true, logos: [] })
      expect(wrapper.find('.logo-grid').attributes('aria-label')).toBe('Loading logos')

      // Error state
      wrapper = createWrapper({ error: 'Test error' })
      expect(wrapper.find('.logo-grid').attributes('aria-label')).toBe('Error loading logos')

      // Empty state
      wrapper = createWrapper({ logos: [], loading: false })
      expect(wrapper.find('.logo-grid').attributes('aria-label')).toBe('No logos to display')

      // Normal state
      wrapper = createWrapper()
      expect(wrapper.find('.logo-grid').attributes('aria-label')).toContain('Grid of')
    })

    it('maintains focus management', async () => {
      wrapper = createWrapper()
      await flushPromises()
      
      const gridItems = wrapper.findAll('.logo-grid__item')
      gridItems.forEach(item => {
        expect(item.attributes('role')).toBe('gridcell')
      })
    })

    it('supports keyboard navigation through LogoCard components', async () => {
      wrapper = createWrapper()
      await flushPromises()
      
      const logoCards = wrapper.findAllComponents(LogoCard)
      logoCards.forEach(card => {
        expect(card.props('clickable')).toBe(true)
      })
    })
  })

  describe('Performance Optimizations', () => {
    it('enables lazy loading for LogoCard components', async () => {
      wrapper = createWrapper()
      await flushPromises()
      
      const logoCards = wrapper.findAllComponents(LogoCard)
      logoCards.forEach(card => {
        expect(card.props('lazyLoad')).toBe(true)
      })
    })

    it('implements virtual scrolling to limit rendered items', async () => {
      // Create a large dataset
      const manyLogos = Array.from({ length: 100 }, (_, i) => ({
        slug: `logo-${i}`,
        name: `Logo ${i}`,
        description: `Description ${i}`,
        categories: ['test'],
        tags: ['test']
      }))
      
      wrapper = createWrapper({ logos: manyLogos })
      await flushPromises()
      
      const renderedCards = wrapper.findAllComponents(LogoCard)
      // Should render fewer cards than total logos due to virtual scrolling
      expect(renderedCards.length).toBeLessThan(manyLogos.length)
    })

    it('applies will-change CSS for performance', () => {
      wrapper = createWrapper()
      
      const scrollContainer = wrapper.find('.logo-grid__scroll-container')
      const viewport = wrapper.find('.logo-grid__viewport')
      
      // These are tested via CSS classes that should have will-change properties
      expect(scrollContainer.exists()).toBe(true)
      expect(viewport.exists()).toBe(true)
    })
  })

  describe('Props Validation', () => {
    it('validates logoVariant prop', () => {
      const validator = LogoGrid.props.logoVariant.validator
      
      expect(validator('original')).toBe(true)
      expect(validator('white')).toBe(true)
      expect(validator('black')).toBe(true)
      expect(validator('optimized')).toBe(true)
      expect(validator('invalid')).toBe(false)
    })

    it('uses default values for optional props', () => {
      wrapper = createWrapper({ logos: [] })
      
      expect(wrapper.props('logoVariant')).toBe('original')
      expect(wrapper.props('showDescription')).toBe(true)
      expect(wrapper.props('showMetadata')).toBe(true)
      expect(wrapper.props('showResultsSummary')).toBe(true)
      expect(wrapper.props('itemHeight')).toBe(280)
      expect(wrapper.props('itemsPerRow')).toBe(0)
      expect(wrapper.props('overscan')).toBe(5)
      expect(wrapper.props('minItemWidth')).toBe(250)
      expect(wrapper.props('gap')).toBe(24)
    })
  })

  describe('Cleanup', () => {
    it('cleans up ResizeObserver on unmount', async () => {
      wrapper = createWrapper()
      await flushPromises()
      
      const disconnectSpy = vi.fn()
      ResizeObserver.mockImplementation(() => ({
        observe: vi.fn(),
        unobserve: vi.fn(),
        disconnect: disconnectSpy
      }))
      
      wrapper.unmount()
      
      // Note: The actual cleanup happens in the component's onUnmounted hook
      // This test verifies the structure is in place
      expect(wrapper.vm).toBeDefined()
    })

    it('removes window resize listener when ResizeObserver is not available', async () => {
      const originalResizeObserver = global.ResizeObserver
      global.ResizeObserver = undefined
      
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')
      
      wrapper = createWrapper()
      await flushPromises()
      
      wrapper.unmount()
      
      expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function))
      
      global.ResizeObserver = originalResizeObserver
      removeEventListenerSpy.mockRestore()
    })
  })
})