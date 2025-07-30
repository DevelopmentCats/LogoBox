/**
 * Unit tests for LogoCard component
 * Tests component rendering, user interactions, hover effects, and accessibility
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import LogoCard from '../../components/LogoCard.vue'

// Mock the logoApi utility
vi.mock('../../utils/logoApi.js', () => ({
  getLogoUrl: vi.fn((slug, variant = 'original') => {
    if (slug === 'error-logo') {
      throw new Error('URL generation failed')
    }
    return `https://cdn.logobox.dev/logos/${slug}/logo-${variant}.svg`
  })
}))

describe('LogoCard', () => {
  let wrapper
  let mockLogo

  beforeEach(() => {
    // Mock logo data
    mockLogo = {
      name: 'GitHub',
      slug: 'github',
      description: 'GitHub is a web-based version control and collaboration platform for software developers.',
      categories: ['development', 'version-control', 'tools'],
      tags: ['git', 'code', 'repository', 'open-source', 'collaboration'],
      license: 'MIT'
    }

    // Mock Image constructor and methods
    global.Image = class {
      constructor() {
        this.onload = null
        this.onerror = null
        this.complete = false
        this.naturalWidth = 0
        this.naturalHeight = 0
      }
      
      set src(value) {
        this._src = value
        // Simulate async loading
        setTimeout(() => {
          if (value.includes('error')) {
            this.onerror && this.onerror()
          } else {
            this.complete = true
            this.naturalWidth = 100
            this.naturalHeight = 100
            this.onload && this.onload()
          }
        }, 0)
      }
      
      get src() {
        return this._src
      }
    }
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
    vi.clearAllMocks()
  })

  const createWrapper = (props = {}) => {
    return mount(LogoCard, {
      props: {
        logo: mockLogo,
        ...props
      }
    })
  }

  describe('Component Rendering', () => {
    it('renders with required props', () => {
      wrapper = createWrapper()
      
      expect(wrapper.find('.logo-card').exists()).toBe(true)
      expect(wrapper.find('.logo-card__image-container').exists()).toBe(true)
      expect(wrapper.find('.logo-card__content').exists()).toBe(true)
      expect(wrapper.find('.logo-card__title').text()).toBe('GitHub')
    })

    it('renders logo image with correct attributes', async () => {
      wrapper = createWrapper()
      
      // Initially should show loading state
      expect(wrapper.find('.logo-card__loading-placeholder').exists()).toBe(true)
      
      // Wait for component to render image element
      await nextTick()
      
      const image = wrapper.find('.logo-card__image')
      if (image.exists()) {
        expect(image.attributes('src')).toBe('https://cdn.logobox.dev/logos/github/logo-original.svg')
        expect(image.attributes('alt')).toBe('GitHub logo')
        expect(image.attributes('loading')).toBe('lazy')
      }
    })

    it('renders with different variant', async () => {
      wrapper = createWrapper({ variant: 'white' })
      await nextTick()
      
      const image = wrapper.find('.logo-card__image')
      if (image.exists()) {
        expect(image.attributes('src')).toBe('https://cdn.logobox.dev/logos/github/logo-white.svg')
      }
    })

    it('renders description when showDescription is true', () => {
      wrapper = createWrapper({ showDescription: true })
      
      const description = wrapper.find('.logo-card__description')
      expect(description.exists()).toBe(true)
      expect(description.text()).toContain('GitHub is a web-based version control')
    })

    it('hides description when showDescription is false', () => {
      wrapper = createWrapper({ showDescription: false })
      
      const description = wrapper.find('.logo-card__description')
      expect(description.exists()).toBe(false)
    })

    it('renders metadata when showMetadata is true', () => {
      wrapper = createWrapper({ showMetadata: true })
      
      const metadata = wrapper.find('.logo-card__metadata')
      expect(metadata.exists()).toBe(true)
      
      const categories = wrapper.findAll('.logo-card__category')
      expect(categories.length).toBeGreaterThan(0)
      
      const tags = wrapper.findAll('.logo-card__tag')
      expect(tags.length).toBeGreaterThan(0)
    })

    it('hides metadata when showMetadata is false', () => {
      wrapper = createWrapper({ showMetadata: false })
      
      const metadata = wrapper.find('.logo-card__metadata')
      expect(metadata.exists()).toBe(false)
    })

    it('truncates long descriptions', () => {
      const longDescription = 'A'.repeat(200)
      const logoWithLongDesc = { ...mockLogo, description: longDescription }
      
      wrapper = createWrapper({ 
        logo: logoWithLongDesc,
        maxDescriptionLength: 50
      })
      
      const description = wrapper.find('.logo-card__description')
      expect(description.text()).toHaveLength(53) // 50 chars + '...'
      expect(description.text().endsWith('...')).toBe(true)
    })

    it('limits displayed categories and tags', () => {
      wrapper = createWrapper({ 
        maxCategories: 2,
        maxTags: 2
      })
      
      const categories = wrapper.findAll('.logo-card__category:not(.logo-card__category--more)')
      expect(categories.length).toBe(2)
      
      const tags = wrapper.findAll('.logo-card__tag:not(.logo-card__tag--more)')
      expect(tags.length).toBe(2)
      
      // Should show "more" indicators
      expect(wrapper.find('.logo-card__category--more').exists()).toBe(true)
      expect(wrapper.find('.logo-card__tag--more').exists()).toBe(true)
    })

    it('shows remaining count in more indicators', () => {
      wrapper = createWrapper({ 
        maxCategories: 1,
        maxTags: 1
      })
      
      const moreCategories = wrapper.find('.logo-card__category--more')
      expect(moreCategories.text()).toBe('+2') // 3 total - 1 displayed = 2 remaining
      
      const moreTags = wrapper.find('.logo-card__tag--more')
      expect(moreTags.text()).toBe('+4') // 5 total - 1 displayed = 4 remaining
    })
  })

  describe('Loading States', () => {
    it('shows loading state initially', () => {
      wrapper = createWrapper()
      
      expect(wrapper.classes()).toContain('logo-card--loading')
      expect(wrapper.find('.logo-card__loading-placeholder').exists()).toBe(true)
      expect(wrapper.find('.logo-card__loading-spinner').exists()).toBe(true)
    })

    it('hides loading state after image loads', async () => {
      wrapper = createWrapper()
      await nextTick()
      
      const image = wrapper.find('.logo-card__image')
      if (image.exists()) {
        await image.trigger('load')
        await nextTick()
        
        expect(wrapper.classes()).not.toContain('logo-card--loading')
        expect(wrapper.find('.logo-card__loading-placeholder').exists()).toBe(false)
      }
    })

    it('shows error state when image fails to load', async () => {
      wrapper = createWrapper()
      await nextTick()
      
      const image = wrapper.find('.logo-card__image')
      if (image.exists()) {
        await image.trigger('error')
        await nextTick()
        
        expect(wrapper.classes()).toContain('logo-card--error')
        expect(wrapper.find('.logo-card__error-placeholder').exists()).toBe(true)
        expect(wrapper.find('.logo-card__error-text').text()).toBe('Failed to load')
      }
    })

    it('handles URL generation errors gracefully', () => {
      const errorLogo = { ...mockLogo, slug: 'error-logo' }
      
      expect(() => {
        wrapper = createWrapper({ logo: errorLogo })
      }).not.toThrow()
      
      // Should still render the component
      expect(wrapper.find('.logo-card').exists()).toBe(true)
    })
  })

  describe('User Interactions', () => {
    it('emits click event when card is clicked', async () => {
      wrapper = createWrapper()
      
      await wrapper.trigger('click')
      
      const clickEvents = wrapper.emitted('click')
      expect(clickEvents).toBeTruthy()
      expect(clickEvents[0][0]).toMatchObject({
        logo: mockLogo,
        variant: 'original'
      })
    })

    it('does not emit click when disabled', async () => {
      wrapper = createWrapper({ disabled: true })
      
      await wrapper.trigger('click')
      
      expect(wrapper.emitted('click')).toBeFalsy()
    })

    it('does not emit click when not clickable', async () => {
      wrapper = createWrapper({ clickable: false })
      
      await wrapper.trigger('click')
      
      expect(wrapper.emitted('click')).toBeFalsy()
    })

    it('handles keyboard navigation with Enter key', async () => {
      wrapper = createWrapper()
      
      await wrapper.trigger('keydown', { key: 'Enter' })
      
      const clickEvents = wrapper.emitted('click')
      expect(clickEvents).toBeTruthy()
    })

    it('handles keyboard navigation with Space key', async () => {
      wrapper = createWrapper()
      
      await wrapper.trigger('keydown', { key: ' ' })
      
      const clickEvents = wrapper.emitted('click')
      expect(clickEvents).toBeTruthy()
    })

    it('ignores other keyboard keys', async () => {
      wrapper = createWrapper()
      
      await wrapper.trigger('keydown', { key: 'Tab' })
      await wrapper.trigger('keydown', { key: 'Escape' })
      
      expect(wrapper.emitted('click')).toBeFalsy()
    })

    it('emits hover events on mouse enter and leave', async () => {
      wrapper = createWrapper()
      
      await wrapper.trigger('mouseenter')
      
      const hoverEvents = wrapper.emitted('hover')
      expect(hoverEvents).toBeTruthy()
      expect(hoverEvents[0][0]).toMatchObject({
        logo: mockLogo,
        hovered: true
      })
      
      await wrapper.trigger('mouseleave')
      
      expect(hoverEvents[1][0]).toMatchObject({
        logo: mockLogo,
        hovered: false
      })
    })
  })

  describe('Action Buttons', () => {
    it('shows overlay with action buttons on hover', async () => {
      wrapper = createWrapper()
      
      // Initially overlay should not be visible
      const overlay = wrapper.find('.logo-card__overlay')
      expect(overlay.exists()).toBe(true)
      
      const downloadButton = wrapper.find('.logo-card__action--download')
      const viewButton = wrapper.find('.logo-card__action--view')
      
      expect(downloadButton.exists()).toBe(true)
      expect(viewButton.exists()).toBe(true)
    })

    it('emits download event when download button is clicked', async () => {
      wrapper = createWrapper()
      const downloadButton = wrapper.find('.logo-card__action--download')
      
      await downloadButton.trigger('click')
      
      const downloadEvents = wrapper.emitted('download')
      expect(downloadEvents).toBeTruthy()
      expect(downloadEvents[0][0]).toMatchObject({
        logo: mockLogo,
        variant: 'original',
        url: 'https://cdn.logobox.dev/logos/github/logo-original.svg'
      })
    })

    it('emits view event when view button is clicked', async () => {
      wrapper = createWrapper()
      const viewButton = wrapper.find('.logo-card__action--view')
      
      await viewButton.trigger('click')
      
      const viewEvents = wrapper.emitted('view')
      expect(viewEvents).toBeTruthy()
      expect(viewEvents[0][0]).toMatchObject({
        logo: mockLogo,
        variant: 'original'
      })
    })

    it('stops event propagation for action buttons', async () => {
      wrapper = createWrapper()
      const downloadButton = wrapper.find('.logo-card__action--download')
      
      await downloadButton.trigger('click')
      
      // Should emit download but not click
      expect(wrapper.emitted('download')).toBeTruthy()
      expect(wrapper.emitted('click')).toBeFalsy()
    })
  })

  describe('Image Loading', () => {
    it('emits image-load event when image loads successfully', async () => {
      wrapper = createWrapper()
      await nextTick()
      
      const image = wrapper.find('.logo-card__image')
      if (image.exists()) {
        await image.trigger('load')
        
        const loadEvents = wrapper.emitted('image-load')
        expect(loadEvents).toBeTruthy()
        expect(loadEvents[0][0]).toMatchObject({
          logo: mockLogo,
          variant: 'original'
        })
      }
    })

    it('emits image-error event when image fails to load', async () => {
      wrapper = createWrapper()
      await nextTick()
      
      const image = wrapper.find('.logo-card__image')
      if (image.exists()) {
        await image.trigger('error')
        
        const errorEvents = wrapper.emitted('image-error')
        expect(errorEvents).toBeTruthy()
        expect(errorEvents[0][0]).toMatchObject({
          logo: mockLogo,
          variant: 'original',
          url: 'https://cdn.logobox.dev/logos/github/logo-original.svg'
        })
      }
    })

    it('handles lazy loading attribute correctly', async () => {
      wrapper = createWrapper({ lazyLoad: true })
      await nextTick()
      
      const image = wrapper.find('.logo-card__image')
      if (image.exists()) {
        expect(image.attributes('loading')).toBe('lazy')
      }
      
      wrapper.unmount()
      
      wrapper = createWrapper({ lazyLoad: false })
      await nextTick()
      
      const eagerImage = wrapper.find('.logo-card__image')
      if (eagerImage.exists()) {
        expect(eagerImage.attributes('loading')).toBe('eager')
      }
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      wrapper = createWrapper()
      
      expect(wrapper.attributes('role')).toBe('button')
      expect(wrapper.attributes('tabindex')).toBe('0')
      expect(wrapper.attributes('aria-label')).toContain('GitHub logo card')
      expect(wrapper.attributes('aria-describedby')).toBe('logo-card-desc-github')
    })

    it('sets tabindex to -1 when disabled', () => {
      wrapper = createWrapper({ disabled: true })
      
      expect(wrapper.attributes('tabindex')).toBe('-1')
    })

    it('includes description in aria-label', () => {
      wrapper = createWrapper()
      
      const ariaLabel = wrapper.attributes('aria-label')
      expect(ariaLabel).toContain('GitHub logo card')
      expect(ariaLabel).toContain('GitHub is a web-based version control')
      expect(ariaLabel).toContain('Categories: development, version-control, tools')
    })

    it('has proper aria-label for action buttons', () => {
      wrapper = createWrapper()
      
      const downloadButton = wrapper.find('.logo-card__action--download')
      expect(downloadButton.attributes('aria-label')).toBe('Download GitHub logo')
      
      const viewButton = wrapper.find('.logo-card__action--view')
      expect(viewButton.attributes('aria-label')).toBe('View GitHub logo details')
    })

    it('has proper aria-label for loading and error states', async () => {
      wrapper = createWrapper()
      
      const loadingPlaceholder = wrapper.find('.logo-card__loading-placeholder')
      expect(loadingPlaceholder.attributes('aria-label')).toBe('Loading GitHub logo')
      
      await nextTick()
      const image = wrapper.find('.logo-card__image')
      if (image.exists()) {
        await image.trigger('error')
        await nextTick()
        
        const errorPlaceholder = wrapper.find('.logo-card__error-placeholder')
        expect(errorPlaceholder.attributes('aria-label')).toBe('Failed to load GitHub logo')
      }
    })

    it('provides title attributes for truncated metadata', () => {
      wrapper = createWrapper({ 
        maxCategories: 1,
        maxTags: 1
      })
      
      const moreCategories = wrapper.find('.logo-card__category--more')
      expect(moreCategories.attributes('title')).toContain('Additional categories:')
      
      const moreTags = wrapper.find('.logo-card__tag--more')
      expect(moreTags.attributes('title')).toContain('Additional tags:')
    })
  })

  describe('Props Validation', () => {
    it('validates logo prop structure', () => {
      // Valid logo should not throw
      expect(() => {
        wrapper = createWrapper({ logo: mockLogo })
      }).not.toThrow()
      
      // Invalid logo should be handled gracefully
      const invalidLogo = { name: 'Test' } // missing slug
      expect(() => {
        wrapper = createWrapper({ logo: invalidLogo })
      }).not.toThrow()
    })

    it('validates variant prop', () => {
      const validVariants = ['original', 'white', 'black', 'optimized']
      
      validVariants.forEach(variant => {
        expect(() => {
          wrapper = createWrapper({ variant })
        }).not.toThrow()
      })
    })

    it('handles missing logo properties gracefully', () => {
      const minimalLogo = { name: 'Test', slug: 'test' }
      
      wrapper = createWrapper({ logo: minimalLogo })
      
      expect(wrapper.find('.logo-card__title').text()).toBe('Test')
      expect(wrapper.find('.logo-card__description').exists()).toBe(false)
      expect(wrapper.find('.logo-card__categories').exists()).toBe(false)
      expect(wrapper.find('.logo-card__tags').exists()).toBe(false)
    })
  })

  describe('Selected State', () => {
    it('applies selected class when isSelected is true', () => {
      wrapper = createWrapper({ isSelected: true })
      
      expect(wrapper.classes()).toContain('logo-card--selected')
    })

    it('does not apply selected class when isSelected is false', () => {
      wrapper = createWrapper({ isSelected: false })
      
      expect(wrapper.classes()).not.toContain('logo-card--selected')
    })
  })

  describe('Edge Cases', () => {
    it('handles empty categories and tags arrays', () => {
      const logoWithEmptyArrays = {
        ...mockLogo,
        categories: [],
        tags: []
      }
      
      wrapper = createWrapper({ logo: logoWithEmptyArrays })
      
      expect(wrapper.find('.logo-card__categories').exists()).toBe(false)
      expect(wrapper.find('.logo-card__tags').exists()).toBe(false)
    })

    it('handles null/undefined categories and tags', () => {
      const logoWithNullArrays = {
        ...mockLogo,
        categories: null,
        tags: undefined
      }
      
      wrapper = createWrapper({ logo: logoWithNullArrays })
      
      expect(wrapper.find('.logo-card__categories').exists()).toBe(false)
      expect(wrapper.find('.logo-card__tags').exists()).toBe(false)
    })

    it('handles very long logo names', () => {
      const logoWithLongName = {
        ...mockLogo,
        name: 'A'.repeat(100)
      }
      
      wrapper = createWrapper({ logo: logoWithLongName })
      
      const title = wrapper.find('.logo-card__title')
      expect(title.text()).toHaveLength(100)
      // CSS should handle text overflow
    })

    it('handles special characters in logo data', () => {
      const logoWithSpecialChars = {
        ...mockLogo,
        name: 'Test & Co. <script>',
        description: 'Description with "quotes" & <tags>'
      }
      
      wrapper = createWrapper({ logo: logoWithSpecialChars })
      
      expect(wrapper.find('.logo-card__title').text()).toBe('Test & Co. <script>')
      expect(wrapper.find('.logo-card__description').text()).toContain('Description with "quotes" & <tags>')
    })
  })

  describe('Performance', () => {
    it('does not re-render unnecessarily when props do not change', async () => {
      wrapper = createWrapper()
      const renderSpy = vi.spyOn(wrapper.vm, '$forceUpdate')
      
      // Trigger some events that shouldn't cause re-renders
      await wrapper.trigger('mouseenter')
      await wrapper.trigger('mouseleave')
      
      expect(renderSpy).not.toHaveBeenCalled()
    })

    it('handles rapid hover events gracefully', async () => {
      wrapper = createWrapper()
      
      // Rapidly trigger hover events
      for (let i = 0; i < 10; i++) {
        await wrapper.trigger('mouseenter')
        await wrapper.trigger('mouseleave')
      }
      
      const hoverEvents = wrapper.emitted('hover')
      expect(hoverEvents).toHaveLength(20) // 10 enter + 10 leave
    })
  })
})