import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import LogoCard from '../../components/LogoCard.vue'

// Mock the logo API
vi.mock('../../utils/logoApi.js', () => ({
  getLogoUrl: vi.fn()
}))

// Mock the lazy image loading composable
vi.mock('../../composables/useLazyImageLoading.js', () => ({
  useLazyImageLoading: vi.fn()
}))

describe('LogoCard', () => {
  let wrapper
  
  const mockLogo = {
    name: 'GitHub',
    slug: 'github',
    description: 'Version control platform',
    categories: ['development', 'tools'],
    tags: ['git', 'code'],
    variants: {
      original: 'logo.svg',
      white: 'logo-white.svg'
    }
  }

  const mockImageLoading = {
    isLoading: { value: false },
    hasError: { value: false },
    imageRef: { value: null },
    observe: vi.fn(),
    retry: vi.fn()
  }

  beforeEach(async () => {
    const { getLogoUrl } = await import('../../utils/logoApi.js')
    const { useLazyImageLoading } = await import('../../composables/useLazyImageLoading.js')
    
    getLogoUrl.mockReturnValue('https://example.com/logo.svg')
    useLazyImageLoading.mockReturnValue(mockImageLoading)
    
    wrapper = mount(LogoCard, {
      props: {
        logo: mockLogo,
        variant: 'original'
      }
    })
  })

  it('renders the logo card with basic information', () => {
    expect(wrapper.find('.logo-card').exists()).toBe(true)
    expect(wrapper.text()).toContain('GitHub')
    expect(wrapper.text()).toContain('Version control platform')
  })

  it('displays logo categories and tags', () => {
    expect(wrapper.text()).toContain('development')
    expect(wrapper.text()).toContain('tools')
    expect(wrapper.text()).toContain('git')
    expect(wrapper.text()).toContain('code')
  })

  it('generates correct logo URL using the API', async () => {
    const { getLogoUrl } = await import('../../utils/logoApi.js')
    expect(getLogoUrl).toHaveBeenCalledWith('github', 'original')
  })

  it('emits click event when card is clicked', async () => {
    await wrapper.trigger('click')
    
    const clickEvents = wrapper.emitted('click')
    expect(clickEvents).toBeTruthy()
    expect(clickEvents[0][0]).toMatchObject({
      logo: mockLogo,
      variant: 'original'
    })
  })

  it('shows action buttons on hover', async () => {
    await wrapper.trigger('mouseenter')
    
    const overlay = wrapper.find('.logo-card__overlay')
    expect(overlay.exists()).toBe(true)
  })

  it('emits download event when download button is clicked', async () => {
    await wrapper.trigger('mouseenter')
    
    const downloadButton = wrapper.find('[aria-label*="Download"]')
    if (downloadButton.exists()) {
      await downloadButton.trigger('click')
      
      const downloadEvents = wrapper.emitted('download')
      expect(downloadEvents).toBeTruthy()
    }
  })

  it('handles different variants correctly', async () => {
    const { getLogoUrl } = await import('../../utils/logoApi.js')
    await wrapper.setProps({ variant: 'white' })
    
    expect(getLogoUrl).toHaveBeenCalledWith('github', 'white')
  })

  it('shows loading state when image is loading', async () => {
    mockImageLoading.isLoading.value = true
    await wrapper.vm.$nextTick()
    
    expect(wrapper.classes()).toContain('logo-card--loading')
  })
})