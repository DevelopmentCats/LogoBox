/**
 * Vue Router Configuration
 * Shared between main app and pre-rendering script
 */

export const routes = [
  {
    path: '/',
    name: 'home',
    component: () => import('../views/HomeView.vue'),
    meta: {
      title: 'LogoBox - Browse Logos and Icons',
      description: 'Discover high-quality logos and icons for your projects'
    }
  },
  {
    path: '/search',
    name: 'search',
    component: () => import('../views/HomeView.vue'), // Reuse HomeView with search params
    meta: {
      title: 'Search Logos - LogoBox',
      description: 'Search through thousands of high-quality logos and icons'
    }
  },
  {
    path: '/categories',
    name: 'categories',
    component: () => import('../views/HomeView.vue'), // Reuse HomeView with category filter
    meta: {
      title: 'Logo Categories - LogoBox',
      description: 'Browse logos by category - technology, social media, and more'
    }
  },
  {
    path: '/logos/:slug',
    name: 'logo-detail',
    component: () => import('../views/LogoDetailView.vue'),
    props: true,
    meta: {
      title: 'Logo Detail - LogoBox',
      description: 'View and download logo variants'
    }
  },
  {
    path: '/404',
    name: 'not-found',
    component: () => import('../views/NotFoundView.vue'),
    meta: {
      title: 'Page Not Found - LogoBox'
    }
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/404'
  }
]

export default routes