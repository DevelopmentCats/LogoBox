<template>
  <div id="app">
    <header class="app-header">
      <nav class="nav-container">
        <router-link to="/" class="logo-link">
          <h1>LogoBox</h1>
        </router-link>
        
        <!-- Navigation Links -->
        <div class="nav-links">
          <router-link to="/" class="nav-link" exact-active-class="nav-link--active">
            Browse
          </router-link>
        </div>
      </nav>
    </header>
    
    <main class="main-content">
      <ErrorBoundary>
        <router-view />
      </ErrorBoundary>
    </main>
    
    <footer class="app-footer">
      <p>&copy; 2024 LogoBox. Open source logo and icon library.</p>
    </footer>
    
    <!-- Network Status Indicator -->
    <div v-if="!isOnline" class="network-status">
      <div class="network-status-content">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M1.42 1.42l21.16 21.16"></path>
          <path d="M8.5 16.5l-1-1c-1.5-1.5-1.5-4 0-5.5l1-1"></path>
          <path d="M15.5 7.5l1 1c1.5 1.5 1.5 4 0 5.5l-1 1"></path>
        </svg>
        <span>You're offline</span>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted } from 'vue'
import ErrorBoundary from './components/ErrorBoundary.vue'
import { useLogoStore } from './stores/logoStore.js'
import { useNetworkStatus } from './utils/networkErrorHandler.js'

export default {
  name: 'App',
  
  components: {
    ErrorBoundary
  },
  
  setup() {
    const logoStore = useLogoStore()
    const networkStatus = useNetworkStatus()
    
    // Network status
    const isOnline = ref(networkStatus.isOnline)
    
    // Network status listener
    let removeNetworkListener = null
    
    onMounted(() => {
      // Initialize network monitoring in the store
      removeNetworkListener = logoStore.initializeNetworkMonitoring()
      
      // Listen for network status changes
      const networkListener = networkStatus.addListener((status, online) => {
        isOnline.value = online
      })
      
      // Combine cleanup functions
      const originalCleanup = removeNetworkListener
      removeNetworkListener = () => {
        if (originalCleanup) originalCleanup()
        networkListener()
      }
    })
    
    onUnmounted(() => {
      if (removeNetworkListener) {
        removeNetworkListener()
      }
    })
    
    return {
      isOnline
    }
  }
}
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  line-height: 1.6;
  color: #333;
}

#app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-header {
  background: #fff;
  border-bottom: 1px solid #e5e7eb;
  padding: 1rem 0;
}

.nav-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.logo-link {
  text-decoration: none;
  color: #333;
}

.logo-link h1 {
  font-size: 1.5rem;
  font-weight: 600;
}

.nav-links {
  display: flex;
  gap: 1.5rem;
}

.nav-link {
  text-decoration: none;
  color: #6b7280;
  font-weight: 500;
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  transition: all 0.2s ease;
}

.nav-link:hover {
  color: #374151;
  background: #f3f4f6;
}

.nav-link--active {
  color: #3b82f6;
  background: #eff6ff;
}

.main-content {
  flex: 1;
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem 1rem;
  width: 100%;
}

.app-footer {
  background: #f9fafb;
  border-top: 1px solid #e5e7eb;
  padding: 1rem;
  text-align: center;
  color: #6b7280;
  font-size: 0.875rem;
}

/* Network Status Indicator */
.network-status {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  background: #ef4444;
  color: white;
  z-index: 1000;
  padding: 0.5rem;
  text-align: center;
  font-size: 0.875rem;
  font-weight: 500;
}

.network-status-content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

/* Responsive navigation */
@media (max-width: 640px) {
  .nav-links {
    display: none;
  }
}
</style>