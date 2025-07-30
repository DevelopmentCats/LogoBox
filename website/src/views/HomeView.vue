<template>
  <div class="home-view">
    <h2>Welcome to LogoBox</h2>
    <p>Browse and discover high-quality logos and icons for your projects.</p>
    
    <!-- Placeholder for search and grid components -->
    <div class="placeholder-content">
      <p>Search and logo grid components will be implemented in later tasks.</p>
    </div>
  </div>
</template>

<script>
export default {
  name: 'HomeView'
}
</script>

<style scoped>
.home-view {
  text-align: center;
}

.home-view h2 {
  font-size: 2rem;
  margin-bottom: 1rem;
  color: #1f2937;
}

.home-view p {
  font-size: 1.125rem;
  color: #6b7280;
  margin-bottom: 2rem;
}

.placeholder-content {
  padding: 2rem;
  background: #f9fafb;
  border: 2px dashed #d1d5db;
  border-radius: 8px;
  margin-top: 2rem;
}

.placeholder-content p {
  color: #9ca3af;
  font-style: italic;
}
</style>