import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import LogoDetailModal from '../../components/LogoDetailModal.vue'
import * as logoApi from '../../utils/logoApi.js'

// Mock the logoApi module
vi.mock('../../utils/logoApi.js', () => ({
  getLogoUrl: vi.fn((slug, variant = 'original') => {
    return `https://cdn.logobox.dev/logos/${slug}/logo${variant === 'original' ? '' : `-${variant}`}.svg`
  })
}))

// Mock Teleport for testing
const TeleportStub = {
  name: 'Teleport',
  props: ['to'],
  template: '<div><slot /></div>'
}

describe('LogoDetailModal', () => {
  let wrapper
  let mockLogo

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks()
    
    // Mock logo data
    mockLogo = {
      name: 'GitHub',
      slug: 'github',
      description: 'A web-based version control and collaboration platform for software developers.',
      categories: ['Development', 'Version Control'],
      tags: ['git', 'code', 'repository', 'collaboration'],
      license: 'MIT'
    }

    // Mock document.body for teleport
    if (!document.body) {
      document.body = document.createElement('body')
    }

    // Mock document methods for download functionality
    const mockLink = {
      href: '',
      download: '',
      target: '',
      click: vi.fn(),
      style: {}
    }
    
    // Store original methods
    const originalCreateElement = document.createElement.bind(document)
    const originalAppendChild = document.body.appendChild.bind(document.body)
    const originalRemoveChild = document.body.removeChild.bind(document.body)
    
    document.createElement = vi.fn().mockImplementation((tagName) => {
      if (tagName === 'a') {
        return mockLink
      }
      return originalCreateElement(tagName)
    })

    document.body.appendChild = vi.fn()
    document.body.removeChild = vi.fn()
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
    
    // Reset body overflow
    document.body.style.overflow = ''
    
    // Clean up event listeners
    document.removeEventListener('keydown', () => {})
  })

  const createWrapper = (props = {}, options = {}) => {
    return mount(LogoDetailModal, {
      props: {
        logo: mockLogo,
        visible: false,
        ...props
      },
      global: {
        stubs: {
          Teleport: TeleportStub
        }
      },
      ...options
    })
  }

  describe('Component Rendering', () => {
    it('should render modal when visible is true', async () => {
      wrapper = createWrapper({ visible: true })
      await nextTick()

      expect(wrapper.find('.logo-detail-modal').exists()).toBe(true)
      expect(wrapper.find('.logo-detail-modal__title').text()).toBe('GitHub')
    })

    it('should not render modal when visible is false', () => {
      wrapper = createWrapper({ visible: false })

      expect(wrapper.find('.logo-detail-modal').exists()).toBe(false)
    })

    it('should render logo information correctly', async () => {
      wrapper = createWrapper({ visible: true })
      await nextTick()

      expect(wrapper.find('.logo-detail-modal__title').text()).toBe('GitHub')
      expect(wrapper.find('.logo-detail-modal__description-text').text()).toBe(mockLogo.description)
      
      // Check categories
      const categories = wrapper.findAll('.logo-detail-modal__category')
      expect(categories).toHaveLength(2)
      expect(categories[0].text()).toBe('Development')
      expect(categories[1].text()).toBe('Version Control')
      
      // Check tags
      const tags = wrapper.findAll('.logo-detail-modal__tag')
      expect(tags).toHaveLength(4)
      expect(tags[0].text()).toBe('git')
      expect(tags[1].text()).toBe('code')
      
      // Check license
      expect(wrapper.find('.logo-detail-modal__license-text').text()).toBe('MIT')
    })

    it('should render all logo variants', async () => {
      wrapper = createWrapper({ visible: true })
      await nextTick()

      const variants = wrapper.findAll('.logo-detail-modal__variant')
      expect(variants).toHaveLength(4)
      
      const variantLabels = variants.map(variant => variant.find('.logo-detail-modal__variant-label').text())
      expect(variantLabels).toEqual(['Original', 'White', 'Black', 'Optimized'])
    })

    it('should render background options', async () => {
      wrapper = createWrapper({ visible: true })
      await nextTick()

      const backgroundOptions = wrapper.findAll('.logo-detail-modal__background-option')
      expect(backgroundOptions).toHaveLength(5) // white, light, dark, black, transparent
    })

    it('should render format selector with SVG option', async () => {
      wrapper = createWrapper({ visible: true })
      await nextTick()

      const formatSelect = wrapper.find('.logo-detail-modal__format-select')
      expect(formatSelect.exists()).toBe(true)
      
      const options = formatSelect.findAll('option')
      expect(options).toHaveLength(1)
      expect(options[0].text()).toBe('SVG (Vector)')
    })
  })

  describe('Logo Display', () => {
    it('should display logo with correct URL', async () => {
      wrapper = createWrapper({ visible: true })
      await nextTick()

      expect(logoApi.getLogoUrl).toHaveBeenCalledWith('github', 'original')
      
      const logoImage = wrapper.find('.logo-detail-modal__logo-image')
      expect(logoImage.attributes('src')).toBe('https://cdn.logobox.dev/logos/github/logo.svg')
      expect(logoImage.attributes('alt')).toBe('GitHub original logo')
    })

    it('should show loading state initially', async () => {
      wrapper = createWrapper({ visible: true })
      await nextTick()

      expect(wrapper.find('.logo-detail-modal__logo-loading').exists()).toBe(true)
      expect(wrapper.find('.logo-detail-modal__logo-image').exists()).toBe(true)
    })

    it('should handle logo load event', async () => {
      wrapper = createWrapper({ visible: true })
      await nextTick()

      const logoImage = wrapper.find('.logo-detail-modal__logo-image')
      await logoImage.trigger('load')

      expect(wrapper.find('.logo-detail-modal__logo-loading').exists()).toBe(false)
      expect(wrapper.find('.logo-detail-modal__logo-error').exists()).toBe(false)
    })

    it('should handle logo error event', async () => {
      wrapper = createWrapper({ visible: true })
      await nextTick()

      const logoImage = wrapper.find('.logo-detail-modal__logo-image')
      await logoImage.trigger('error')

      expect(wrapper.find('.logo-detail-modal__logo-loading').exists()).toBe(false)
      expect(wrapper.find('.logo-detail-modal__logo-error').exists()).toBe(true)
      expect(wrapper.find('.logo-detail-modal__error-text').text()).toBe('Failed to load logo')
    })
  })

  describe('Variant Selection', () => {
    it('should have original variant selected by default', async () => {
      wrapper = createWrapper({ visible: true })
      await nextTick()

      const activeVariant = wrapper.find('.logo-detail-modal__variant--active')
      expect(activeVariant.find('.logo-detail-modal__variant-label').text()).toBe('Original')
    })

    it('should select initial variant from props', async () => {
      wrapper = createWrapper({ visible: true, initialVariant: 'white' })
      await nextTick()

      const activeVariant = wrapper.find('.logo-detail-modal__variant--active')
      expect(activeVariant.find('.logo-detail-modal__variant-label').text()).toBe('White')
    })

    it('should change variant when clicked', async () => {
      wrapper = createWrapper({ visible: true })
      await nextTick()

      const whiteVariant = wrapper.findAll('.logo-detail-modal__variant')[1] // White variant
      await whiteVariant.trigger('click')

      expect(wrapper.find('.logo-detail-modal__variant--active .logo-detail-modal__variant-label').text()).toBe('White')
      expect(logoApi.getLogoUrl).toHaveBeenCalledWith('github', 'white')
    })

    it('should emit variant-change event when variant changes', async () => {
      wrapper = createWrapper({ visible: true })
      await nextTick()

      const blackVariant = wrapper.findAll('.logo-detail-modal__variant')[2] // Black variant
      await blackVariant.trigger('click')

      const emittedEvents = wrapper.emitted('variant-change')
      expect(emittedEvents).toHaveLength(1)
      expect(emittedEvents[0][0]).toEqual({
        logo: mockLogo,
        variant: 'black',
        url: 'https://cdn.logobox.dev/logos/github/logo-black.svg'
      })
    })

    it('should update logo URL when variant changes', async () => {
      wrapper = createWrapper({ visible: true })
      await nextTick()

      const optimizedVariant = wrapper.findAll('.logo-detail-modal__variant')[3] // Optimized variant
      await optimizedVariant.trigger('click')
      await nextTick()

      const logoImage = wrapper.find('.logo-detail-modal__logo-image')
      expect(logoImage.attributes('src')).toBe('https://cdn.logobox.dev/logos/github/logo-optimized.svg')
      expect(logoImage.attributes('alt')).toBe('GitHub optimized logo')
    })
  })

  describe('Background Selection', () => {
    it('should have white background selected by default', async () => {
      wrapper = createWrapper({ visible: true })
      await nextTick()

      const activeBackground = wrapper.find('.logo-detail-modal__background-option--active')
      expect(activeBackground.exists()).toBe(true)
      
      const logoDisplay = wrapper.find('.logo-detail-modal__logo-display')
      expect(logoDisplay.classes()).toContain('logo-detail-modal__logo-display--white')
    })

    it('should change background when clicked', async () => {
      wrapper = createWrapper({ visible: true })
      await nextTick()

      const darkBackground = wrapper.findAll('.logo-detail-modal__background-option')[2] // Dark background
      await darkBackground.trigger('click')
      await nextTick()

      const logoDisplay = wrapper.find('.logo-detail-modal__logo-display')
      expect(logoDisplay.classes()).toContain('logo-detail-modal__logo-display--dark')
    })

    it('should update active background option', async () => {
      wrapper = createWrapper({ visible: true })
      await nextTick()

      const blackBackground = wrapper.findAll('.logo-detail-modal__background-option')[3] // Black background
      await blackBackground.trigger('click')
      await nextTick()

      const activeBackgrounds = wrapper.findAll('.logo-detail-modal__background-option--active')
      expect(activeBackgrounds).toHaveLength(1)
      expect(activeBackgrounds[0].element).toBe(blackBackground.element)
    })
  })

  describe('Format Selection', () => {
    it('should have SVG format selected by default', async () => {
      wrapper = createWrapper({ visible: true })
      await nextTick()

      const formatSelect = wrapper.find('.logo-detail-modal__format-select')
      expect(formatSelect.element.value).toBe('svg')
    })

    it('should emit format-change event when format changes', async () => {
      wrapper = createWrapper({ visible: true })
      await nextTick()

      const formatSelect = wrapper.find('.logo-detail-modal__format-select')
      await formatSelect.setValue('svg') // Trigger change even with same value

      const emittedEvents = wrapper.emitted('format-change')
      expect(emittedEvents).toBeTruthy()
    })
  })

  describe('Download Functionality', () => {
    it('should render download button', async () => {
      wrapper = createWrapper({ visible: true })
      await nextTick()

      const downloadButton = wrapper.find('.logo-detail-modal__download-button')
      expect(downloadButton.exists()).toBe(true)
      expect(downloadButton.text()).toContain('Download')
    })

    it('should trigger download when button is clicked', async () => {
      wrapper = createWrapper({ visible: true })
      await nextTick()

      const downloadButton = wrapper.find('.logo-detail-modal__download-button')
      await downloadButton.trigger('click')

      expect(document.createElement).toHaveBeenCalledWith('a')
      expect(document.body.appendChild).toHaveBeenCalled()
      expect(document.body.removeChild).toHaveBeenCalled()
    })

    it('should emit download event with correct data', async () => {
      wrapper = createWrapper({ visible: true })
      await nextTick()

      const downloadButton = wrapper.find('.logo-detail-modal__download-button')
      await downloadButton.trigger('click')
      await nextTick()

      const emittedEvents = wrapper.emitted('download')
      expect(emittedEvents).toHaveLength(1)
      expect(emittedEvents[0][0]).toEqual({
        logo: mockLogo,
        variant: 'original',
        format: 'svg',
        url: 'https://cdn.logobox.dev/logos/github/logo.svg',
        filename: 'github-original.svg'
      })
    })

    it('should show loading state during download', async () => {
      wrapper = createWrapper({ visible: true })
      await nextTick()

      const downloadButton = wrapper.find('.logo-detail-modal__download-button')
      
      // Start download
      const downloadPromise = downloadButton.trigger('click')
      await nextTick()

      expect(downloadButton.text()).toContain('Downloading...')
      expect(downloadButton.find('.logo-detail-modal__download-spinner').exists()).toBe(true)
      expect(downloadButton.attributes('disabled')).toBeDefined()

      // Wait for download to complete
      await downloadPromise
      await nextTick()

      expect(downloadButton.text()).toContain('Download')
      expect(downloadButton.find('.logo-detail-modal__download-spinner').exists()).toBe(false)
      expect(downloadButton.attributes('disabled')).toBeUndefined()
    })

    it('should not trigger download when already downloading', async () => {
      wrapper = createWrapper({ visible: true })
      await nextTick()

      const downloadButton = wrapper.find('.logo-detail-modal__download-button')
      
      // Start first download
      const firstDownload = downloadButton.trigger('click')
      await nextTick()

      // Try to start second download
      await downloadButton.trigger('click')

      expect(document.createElement).toHaveBeenCalledTimes(1) // Only called once
      
      await firstDownload
    })
  })

  describe('Modal Behavior', () => {
    it('should emit close event when close button is clicked', async () => {
      wrapper = createWrapper({ visible: true })
      await nextTick()

      const closeButton = wrapper.find('.logo-detail-modal__close')
      await closeButton.trigger('click')
      
      // Wait for async close handler
      await new Promise(resolve => setTimeout(resolve, 250))

      const emittedEvents = wrapper.emitted('close')
      expect(emittedEvents).toHaveLength(1)
    })

    it('should emit close event when backdrop is clicked', async () => {
      wrapper = createWrapper({ visible: true })
      await nextTick()

      const modal = wrapper.find('.logo-detail-modal')
      await modal.trigger('click')
      
      // Wait for async close handler
      await new Promise(resolve => setTimeout(resolve, 250))

      const emittedEvents = wrapper.emitted('close')
      expect(emittedEvents).toHaveLength(1)
    })

    it('should not close when modal content is clicked', async () => {
      wrapper = createWrapper({ visible: true })
      await nextTick()

      const modalContent = wrapper.find('.logo-detail-modal__content')
      await modalContent.trigger('click')

      const emittedEvents = wrapper.emitted('close')
      expect(emittedEvents).toBeFalsy()
    })

    it('should emit close event when Escape key is pressed', async () => {
      wrapper = createWrapper({ visible: true })
      await nextTick()

      const modal = wrapper.find('.logo-detail-modal')
      await modal.trigger('keydown', { key: 'Escape' })
      
      // Wait for async close handler
      await new Promise(resolve => setTimeout(resolve, 250))

      const emittedEvents = wrapper.emitted('close')
      expect(emittedEvents).toHaveLength(1)
    })

    it('should set body overflow to hidden when visible', async () => {
      wrapper = createWrapper({ visible: true })
      await nextTick()

      expect(document.body.style.overflow).toBe('hidden')
    })

    it('should restore body overflow when closed', async () => {
      wrapper = createWrapper({ visible: true })
      await nextTick()

      expect(document.body.style.overflow).toBe('hidden')

      await wrapper.setProps({ visible: false })
      await nextTick()

      expect(document.body.style.overflow).toBe('')
    })
  })

  describe('Accessibility', () => {
    it('should have correct ARIA attributes', async () => {
      wrapper = createWrapper({ visible: true })
      await nextTick()

      const modal = wrapper.find('.logo-detail-modal')
      expect(modal.attributes('role')).toBe('dialog')
      expect(modal.attributes('aria-modal')).toBe('true')
      expect(modal.attributes('aria-labelledby')).toBe('logo-modal-title-github')
      expect(modal.attributes('aria-describedby')).toBe('logo-modal-desc-github')

      const title = wrapper.find('.logo-detail-modal__title')
      expect(title.attributes('id')).toBe('logo-modal-title-github')

      const description = wrapper.find('.logo-detail-modal__description-text')
      expect(description.attributes('id')).toBe('logo-modal-desc-github')
    })

    it('should have correct ARIA labels for interactive elements', async () => {
      wrapper = createWrapper({ visible: true })
      await nextTick()

      const closeButton = wrapper.find('.logo-detail-modal__close')
      expect(closeButton.attributes('aria-label')).toBe('Close GitHub logo details')

      const downloadButton = wrapper.find('.logo-detail-modal__download-button')
      expect(downloadButton.attributes('aria-label')).toBe('Download GitHub logo as SVG')

      const formatSelect = wrapper.find('.logo-detail-modal__format-select')
      expect(formatSelect.attributes('aria-label')).toBe('Select download format for GitHub')
    })

    it('should have correct ARIA labels for variant buttons', async () => {
      wrapper = createWrapper({ visible: true })
      await nextTick()

      const variants = wrapper.findAll('.logo-detail-modal__variant')
      expect(variants[0].attributes('aria-label')).toBe('Select original variant of GitHub logo')
      expect(variants[1].attributes('aria-label')).toBe('Select white variant of GitHub logo')
      expect(variants[2].attributes('aria-label')).toBe('Select black variant of GitHub logo')
      expect(variants[3].attributes('aria-label')).toBe('Select optimized variant of GitHub logo')
    })

    it('should have correct ARIA labels for background options', async () => {
      wrapper = createWrapper({ visible: true })
      await nextTick()

      const backgroundOptions = wrapper.findAll('.logo-detail-modal__background-option')
      expect(backgroundOptions[0].attributes('aria-label')).toBe('Set white background')
      expect(backgroundOptions[1].attributes('aria-label')).toBe('Set light gray background')
      expect(backgroundOptions[2].attributes('aria-label')).toBe('Set dark background')
      expect(backgroundOptions[3].attributes('aria-label')).toBe('Set black background')
      expect(backgroundOptions[4].attributes('aria-label')).toBe('Set transparent background')
    })
  })

  describe('Error Handling', () => {
    it('should handle invalid logo URL gracefully', async () => {
      logoApi.getLogoUrl.mockImplementation(() => {
        throw new Error('Invalid slug')
      })

      wrapper = createWrapper({ visible: true })
      await nextTick()

      const logoImage = wrapper.find('.logo-detail-modal__logo-image')
      expect(logoImage.attributes('src')).toBe('')
    })

    it('should handle missing logo properties gracefully', async () => {
      const incompleteLogo = {
        name: 'Test Logo',
        slug: 'test-logo'
        // Missing description, categories, tags, license
      }

      wrapper = createWrapper({ visible: true, logo: incompleteLogo })
      await nextTick()

      expect(wrapper.find('.logo-detail-modal__title').text()).toBe('Test Logo')
      expect(wrapper.find('.logo-detail-modal__description').exists()).toBe(false)
      expect(wrapper.find('.logo-detail-modal__categories').exists()).toBe(false)
      expect(wrapper.find('.logo-detail-modal__tags').exists()).toBe(false)
      expect(wrapper.find('.logo-detail-modal__license').exists()).toBe(false)
    })

    it('should handle empty categories and tags arrays', async () => {
      const logoWithEmptyArrays = {
        ...mockLogo,
        categories: [],
        tags: []
      }

      wrapper = createWrapper({ visible: true, logo: logoWithEmptyArrays })
      await nextTick()

      expect(wrapper.find('.logo-detail-modal__categories').exists()).toBe(false)
      expect(wrapper.find('.logo-detail-modal__tags').exists()).toBe(false)
    })
  })

  describe('Props Validation', () => {
    it('should validate logo prop correctly', () => {
      const validLogo = { name: 'Test', slug: 'test' }
      const invalidLogo = { name: 'Test' } // Missing slug

      expect(LogoDetailModal.props.logo.validator(validLogo)).toBe(true)
      expect(LogoDetailModal.props.logo.validator(invalidLogo)).toBe(false)
      expect(LogoDetailModal.props.logo.validator(null)).toBe(false)
      expect(LogoDetailModal.props.logo.validator(undefined)).toBe(false)
    })

    it('should validate initialVariant prop correctly', () => {
      expect(LogoDetailModal.props.initialVariant.validator('original')).toBe(true)
      expect(LogoDetailModal.props.initialVariant.validator('white')).toBe(true)
      expect(LogoDetailModal.props.initialVariant.validator('black')).toBe(true)
      expect(LogoDetailModal.props.initialVariant.validator('optimized')).toBe(true)
      expect(LogoDetailModal.props.initialVariant.validator('invalid')).toBe(false)
    })
  })

  describe('Component Lifecycle', () => {
    it('should clean up event listeners on unmount', async () => {
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener')
      
      wrapper = createWrapper({ visible: true })
      await nextTick()

      wrapper.unmount()

      expect(removeEventListenerSpy).toHaveBeenCalled()
      expect(document.body.style.overflow).toBe('')
    })

    it('should handle rapid visibility changes', async () => {
      wrapper = createWrapper({ visible: false })

      // Rapidly toggle visibility
      await wrapper.setProps({ visible: true })
      await wrapper.setProps({ visible: false })
      await wrapper.setProps({ visible: true })
      await nextTick()

      expect(wrapper.find('.logo-detail-modal').exists()).toBe(true)
    })
  })
})