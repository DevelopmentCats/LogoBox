import { describe, it, expect, beforeEach } from 'vitest'
import { createRouter, createWebHistory } from 'vue-router'
import { mount } from '@vue/test-utils'
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import HomeView from '../../views/HomeView.vue'
import LogoDetailView from '../../views/LogoDetailView.vue'

// Create router instance for testing
function createTestRouter() {
  return createRouter({
    history: createWebHistory(),
    routes: [
      {
        path: '/',
        name: 'home',
        component: HomeView
      },
      {
        path: '/logos/:slug',
        name: 'logo-detail',
        component: LogoDetailView,
        props: true
      }
    ]
  })
}

describe('Vue Router Configuration', () => {
  let router

  beforeEach(() => {
    router = createTestRouter()
  })

  it('should have correct route configuration', () => {
    const routes = router.getRoutes()
    
    expect(routes).toHaveLength(2)
    
    // Check home route
    const homeRoute = routes.find(route => route.name === 'home')
    expect(homeRoute).toBeDefined()
    expect(homeRoute.path).toBe('/')
    expect(homeRoute.components.default).toBe(HomeView)
    
    // Check logo detail route
    const logoDetailRoute = routes.find(route => route.name === 'logo-detail')
    expect(logoDetailRoute).toBeDefined()
    expect(logoDetailRoute.path).toBe('/logos/:slug')
    expect(logoDetailRoute.components.default).toBe(LogoDetailView)
    expect(logoDetailRoute.props.default).toBe(true)
  })

  it('should navigate to home route', async () => {
    await router.push('/')
    expect(router.currentRoute.value.name).toBe('home')
    expect(router.currentRoute.value.path).toBe('/')
  })

  it('should navigate to logo detail route with slug parameter', async () => {
    const testSlug = 'github'
    await router.push(`/logos/${testSlug}`)
    
    expect(router.currentRoute.value.name).toBe('logo-detail')
    expect(router.currentRoute.value.path).toBe(`/logos/${testSlug}`)
    expect(router.currentRoute.value.params.slug).toBe(testSlug)
  })

  it('should handle route parameters correctly', async () => {
    const testSlugs = ['github', 'microsoft', 'stack-overflow']
    
    for (const slug of testSlugs) {
      await router.push(`/logos/${slug}`)
      expect(router.currentRoute.value.params.slug).toBe(slug)
    }
  })

  it('should resolve route by name', () => {
    const homeRoute = router.resolve({ name: 'home' })
    expect(homeRoute.path).toBe('/')
    
    const logoDetailRoute = router.resolve({ 
      name: 'logo-detail', 
      params: { slug: 'test-logo' } 
    })
    expect(logoDetailRoute.path).toBe('/logos/test-logo')
  })
})

describe('Route Components', () => {
  let router

  beforeEach(() => {
    router = createTestRouter()
  })

  it('should render HomeView component on home route', async () => {
    await router.push('/')
    
    const wrapper = mount(HomeView, {
      global: {
        plugins: [router, createPinia()],
        stubs: {
          SearchBar: true,
          FilterPanel: true,
          LogoGrid: true
        }
      }
    })
    
    expect(wrapper.find('h1').text()).toBe('Welcome to LogoBox')
    expect(wrapper.find('h2').text()).toBe('Browse All Logos')
    expect(wrapper.find('.home-view').exists()).toBe(true)
  })

  it('should render LogoDetailView component with correct props', async () => {
    const testSlug = 'github'
    await router.push(`/logos/${testSlug}`)
    
    const wrapper = mount(LogoDetailView, {
      props: { slug: testSlug },
      global: {
        plugins: [router, createPinia()],
        stubs: {
          AdvancedDownloadModal: true
        }
      }
    })
    
    expect(wrapper.find('.logo-detail-view').exists()).toBe(true)
    expect(wrapper.props('slug')).toBe(testSlug)
    
    // Component should be in loading state initially or show error/content
    const hasLoadingState = wrapper.find('.loading-state').exists()
    const hasErrorState = wrapper.find('.error-state').exists()
    const hasContent = wrapper.find('.logo-detail-content').exists()
    
    expect(hasLoadingState || hasErrorState || hasContent).toBe(true)
  })

  it('should handle different slug values in LogoDetailView', () => {
    const testSlugs = ['github', 'microsoft', 'stack-overflow', 'vue-js']
    
    testSlugs.forEach(slug => {
      const wrapper = mount(LogoDetailView, {
        props: { slug },
        global: {
          plugins: [router, createPinia()],
          stubs: {
            AdvancedDownloadModal: true
          }
        }
      })
      
      expect(wrapper.props('slug')).toBe(slug)
      expect(wrapper.find('.logo-detail-view').exists()).toBe(true)
      
      // Component should handle the slug prop correctly regardless of loading state
      const hasLoadingState = wrapper.find('.loading-state').exists()
      const hasErrorState = wrapper.find('.error-state').exists()
      const hasContent = wrapper.find('.logo-detail-content').exists()
      
      expect(hasLoadingState || hasErrorState || hasContent).toBe(true)
    })
  })
})