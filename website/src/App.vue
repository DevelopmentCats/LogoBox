<template>
  <div id="app">
    <header class="app-header">
      <nav class="nav-container">
        <router-link to="/" class="logo-link">
          <h1>LogoBox</h1>
        </router-link>
      </nav>
    </header>
    
    <main class="main-content">
      <router-view />
    </main>
    
    <footer class="app-footer">
      <p>&copy; 2024 LogoBox. Open source logo and icon library.</p>
    </footer>
  </div>
</template>

<script>
export default {
  name: 'App'
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
}

.logo-link {
  text-decoration: none;
  color: #333;
}

.logo-link h1 {
  font-size: 1.5rem;
  font-weight: 600;
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
</style>