<template>
  <div class="not-found-view">
    <div class="not-found-container">
      <h1 class="not-found-title">404</h1>
      <h2 class="not-found-subtitle">Page Not Found</h2>
      <p class="not-found-message">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <div class="not-found-actions">
        <router-link to="/" class="not-found-button primary">
          Go to Home
        </router-link>
        <button @click="goBack" class="not-found-button secondary">
          Go Back
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'NotFoundView',
  
  methods: {
    goBack() {
      if (window.history.length > 1) {
        this.$router.go(-1)
      } else {
        this.$router.push('/')
      }
    }
  }
}
</script>

<style scoped>
.not-found-view {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  padding: 2rem;
}

.not-found-container {
  text-align: center;
  max-width: 500px;
}

.not-found-title {
  font-size: 8rem;
  font-weight: 900;
  color: #3b82f6;
  margin: 0;
  line-height: 1;
}

.not-found-subtitle {
  font-size: 2rem;
  font-weight: 700;
  color: #1f2937;
  margin: 1rem 0;
}

.not-found-message {
  font-size: 1.125rem;
  color: #6b7280;
  margin-bottom: 2rem;
  line-height: 1.6;
}

.not-found-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
}

.not-found-button {
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  font-weight: 600;
  text-decoration: none;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-block;
}

.not-found-button.primary {
  background-color: #3b82f6;
  color: white;
}

.not-found-button.primary:hover {
  background-color: #2563eb;
  transform: translateY(-1px);
}

.not-found-button.secondary {
  background-color: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
}

.not-found-button.secondary:hover {
  background-color: #e5e7eb;
  transform: translateY(-1px);
}

/* Mobile responsiveness */
@media (max-width: 640px) {
  .not-found-title {
    font-size: 6rem;
  }
  
  .not-found-subtitle {
    font-size: 1.5rem;
  }
  
  .not-found-actions {
    flex-direction: column;
    align-items: center;
  }
  
  .not-found-button {
    width: 100%;
    max-width: 200px;
  }
}
</style>