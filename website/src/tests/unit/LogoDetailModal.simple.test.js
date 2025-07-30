import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import LogoDetailModal from '../../components/LogoDetailModal.vue'

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

describe('LogoDetailModal - Basic Tests', () => {
  let mockLogo

  beforeEach(() => {
    mockLogo = {
      name: 'GitHub',
      slug: 'github',
      description: 'A web-based version control platform.',
      categories: ['Development'],
      tags: ['git', 'code'],
      license: 'MIT'
    }

    // Mock document.body
    if (!document.body) {
      document.body = document.createElement('body')
    }
  })

  const createWrapper = (props = {}) => {
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
      }
    })
  }

  it('should render component with basic props', () => {
    const wrapper = createWrapper()
    expect(wrapper.exists()).toBe(true)
  })

  it('should show modal when visible is true', async () => {
    const wrapper = createWrapper({ visible: true })
    await nextTick()

    expect(wrapper.find('.logo-detail-modal').exists()).toBe(true)
    expect(wrapper.find('.logo-detail-modal__title').text()).toBe('GitHub')
  })

  it('should hide modal when visible is false', () => {
    const wrapper = createWrapper({ visible: false })
    expect(wrapper.find('.logo-detail-modal').exists()).toBe(false)
  })

  it('should render logo information', async () => {
    const wrapper = createWrapper({ visible: true })
    await nextTick()

    expect(wrapper.find('.logo-detail-modal__title').text()).toBe('GitHub')
    expect(wrapper.find('.logo-detail-modal__description-text').text()).toBe(mockLogo.description)
  })

  it('should render variant buttons', async () => {
    const wrapper = createWrapper({ visible: true })
    await nextTick()

    const variants = wrapper.findAll('.logo-detail-modal__variant')
    expect(variants.length).toBeGreaterThan(0)
  })

  it('should emit close event when close button clicked', async () => {
    const wrapper = createWrapper({ visible: true })
    await nextTick()

    const closeButton = wrapper.find('.logo-detail-modal__close')
    await closeButton.trigger('click')
    
    // Wait for the async close handler
    await new Promise(resolve => setTimeout(resolve, 250))

    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('should validate props correctly', () => {
    const validLogo = { name: 'Test', slug: 'test' }
    const invalidLogo = { name: 'Test' }

    expect(LogoDetailModal.props.logo.validator(validLogo)).toBe(true)
    expect(LogoDetailModal.props.logo.validator(invalidLogo)).toBe(false)
    expect(LogoDetailModal.props.logo.validator(null)).toBe(false)
  })
})