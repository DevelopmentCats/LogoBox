<template>
  <div class="logo-detail-view">
    <!-- Loading State -->
    <div v-if="isLoading" class="loading-state">
      <div class="loading-spinner">
        <svg width="32" height="32" viewBox="0 0 24 24">
          <circle 
            cx="12" 
            cy="12" 
            r="10" 
            stroke="currentColor" 
            stroke-width="2" 
            fill="none" 
            stroke-dasharray="60" 
            stroke-dashoffset="60" 
            stroke-linecap="round"
          >
            <animateTransform 
              attributeName="transform" 
              type="rotate" 
              values="0 12 12;360 12 12" 
              dur="1s" 
              repeatCount="indefinite"
            />
          </circle>
        </svg>
      </div>
      <p class="loading-text">Loading logo details...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-state">
      <div class="error-icon">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
      </div>
      <h2 class="error-title">Logo Not Found</h2>
      <p class="error-message">{{ error }}</p>
      <div class="error-actions">
        <button type="button" class="retry-button" @click="handleRetry">
          Try Again
        </button>
        <router-link to="/" class="back-button">
          Back to Home
        </router-link>
      </div>
    </div>

    <!-- Logo Detail Content -->
    <div v-else-if="logo" class="logo-detail-content">
      <!-- Breadcrumb -->
      <nav class="breadcrumb" aria-label="Breadcrumb">
        <router-link to="/" class="breadcrumb-link">Home</router-link>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-current">{{ logo.name }}</span>
      </nav>

      <!-- Main Content -->
      <div class="detail-layout">
        <!-- Logo Display -->
        <div class="logo-display">
          <div class="logo-container">
            <img
              :src="currentLogoUrl"
              :alt="`${logo.name} logo`"
              class="logo-image"
              @error="handleImageError"
            />
          </div>
          
          <!-- Variant Selector -->
          <div class="variant-selector">
            <h3 class="variant-title">Variants</h3>
            <div class="variant-options">
              <button
                v-for="variant in availableVariants"
                :key="variant.key"
                type="button"
                class="variant-option"
                :class="{ 'variant-option--active': selectedVariant === variant.key }"
                @click="selectVariant(variant.key)"
              >
                <img
                  :src="getLogoUrl(logo.slug, variant.key)"
                  :alt="`${logo.name} ${variant.label} variant`"
                  class="variant-preview"
                  @error="handleVariantError(variant.key)"
                />
                <span class="variant-label">{{ variant.label }}</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Logo Information -->
        <div class="logo-info">
          <div class="logo-header">
            <h1 class="logo-title">{{ logo.name }}</h1>
            <div class="logo-actions">
              <button
                type="button"
                class="action-button action-button--primary"
                @click="handleDownload"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7,10 12,15 17,10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                Download
              </button>
              <button
                type="button"
                class="action-button action-button--secondary"
                @click="handleCopyUrl"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
                Copy URL
              </button>
            </div>
          </div>

          <!-- Description -->
          <div v-if="logo.description" class="logo-description">
            <h3 class="section-title">Description</h3>
            <p class="description-text">{{ logo.description }}</p>
          </div>

          <!-- Metadata -->
          <div class="logo-metadata">
            <!-- Categories -->
            <div v-if="logo.categories && logo.categories.length > 0" class="metadata-section">
              <h3 class="section-title">Categories</h3>
              <div class="tag-list">
                <span
                  v-for="category in logo.categories"
                  :key="category"
                  class="tag tag--category"
                >
                  {{ category }}
                </span>
              </div>
            </div>

            <!-- Tags -->
            <div v-if="logo.tags && logo.tags.length > 0" class="metadata-section">
              <h3 class="section-title">Tags</h3>
              <div class="tag-list">
                <span
                  v-for="tag in logo.tags"
                  :key="tag"
                  class="tag tag--tag"
                >
                  {{ tag }}
                </span>
              </div>
            </div>
          </div>

          <!-- Download Options -->
          <div class="download-section">
            <h3 class="section-title">Download Options</h3>
            <div class="download-options">
              <button
                v-for="variant in availableVariants"
                :key="`download-${variant.key}`"
                type="button"
                class="download-option"
                @click="handleDownloadVariant(variant.key)"
              >
                <div class="download-preview">
                  <img
                    :src="getLogoUrl(logo.slug, variant.key)"
                    :alt="`${logo.name} ${variant.label}`"
                    class="download-preview-image"
                  />
                </div>
                <div class="download-info">
                  <span class="download-name">{{ variant.label }}</span>
                  <span class="download-format">SVG</span>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7,10 12,15 17,10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Advanced Download Modal -->
      <AdvancedDownloadModal
        v-if="showAdvancedModal"
        :logo="logo"
        :variant="selectedVariant"
        @close="showAdvancedModal = false"
        @download="handleAdvancedDownload"
      />
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import AdvancedDownloadModal from '../components/AdvancedDownloadModal.vue'
import { useLogoStore } from '../stores/logoStore.js'
import { getLogoUrl } from '../utils/logoApi.js'

export default {
  name: 'LogoDetailView',
  
  components: {
    AdvancedDownloadModal
  },
  
  props: {
    slug: {
      type: String,
      required: true
    }
  },
  
  setup(props) {
    const router = useRouter()
    const route = useRoute()
    const logoStore = useLogoStore()
    
    // State
    const logo = ref(null)
    const isLoading = ref(true)
    const error = ref(null)
    const selectedVariant = ref('original')
    const showAdvancedModal = ref(false)
    const variantErrors = ref(new Set())
    
    // Available variants
    const availableVariants = [
      { key: 'original', label: 'Original' },
      { key: 'white', label: 'White' },
      { key: 'black', label: 'Black' },
      { key: 'optimized', label: 'Optimized' }
    ]
    
    // Computed
    const currentLogoUrl = computed(() => {
      if (!logo.value) return ''
      return getLogoUrl(logo.value.slug, selectedVariant.value)
    })
    
    // Methods
    const loadLogo = async () => {
      try {
        isLoading.value = true
        error.value = null
        
        const logoData = await logoStore.loadLogoBySlug(props.slug)
        
        if (!logoData) {
          error.value = `Logo "${props.slug}" not found`
          return
        }
        
        logo.value = logoData
        
        // Update page title
        if (typeof document !== 'undefined') {
          document.title = `${logoData.name} Logo - LogoBox`
        }
        
      } catch (err) {
        error.value = err.message || 'Failed to load logo'
        console.error('Failed to load logo:', err)
      } finally {
        isLoading.value = false
      }
    }
    
    const selectVariant = (variant) => {
      selectedVariant.value = variant
    }
    
    const handleImageError = () => {
      console.warn(`Failed to load image for variant: ${selectedVariant.value}`)
    }
    
    const handleVariantError = (variant) => {
      variantErrors.value.add(variant)
    }
    
    const handleDownload = () => {
      if (!logo.value) return
      
      const url = currentLogoUrl.value
      const link = document.createElement('a')
      link.href = url
      link.download = `${logo.value.slug}-${selectedVariant.value}.svg`
      link.target = '_blank'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
    
    const handleDownloadVariant = (variant) => {
      if (!logo.value) return
      
      const url = getLogoUrl(logo.value.slug, variant)
      const link = document.createElement('a')
      link.href = url
      link.download = `${logo.value.slug}-${variant}.svg`
      link.target = '_blank'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
    
    const handleCopyUrl = async () => {
      if (!logo.value) return
      
      try {
        await navigator.clipboard.writeText(currentLogoUrl.value)
        // You could show a toast notification here
        console.log('URL copied to clipboard')
      } catch (err) {
        console.error('Failed to copy URL:', err)
        // Fallback for older browsers
        const textArea = document.createElement('textarea')
        textArea.value = currentLogoUrl.value
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
      }
    }
    
    const handleAdvancedDownload = (options) => {
      console.log('Advanced download:', options)
      showAdvancedModal.value = false
    }
    
    const handleRetry = () => {
      loadLogo()
    }
    
    // Watch for slug changes
    watch(() => props.slug, () => {
      loadLogo()
    })
    
    // Initialize
    onMounted(() => {
      loadLogo()
    })
    
    return {
      // State
      logo,
      isLoading,
      error,
      selectedVariant,
      showAdvancedModal,
      
      // Data
      availableVariants,
      
      // Computed
      currentLogoUrl,
      
      // Methods
      selectVariant,
      handleImageError,
      handleVariantError,
      handleDownload,
      handleDownloadVariant,
      handleCopyUrl,
      handleAdvancedDownload,
      handleRetry,
      getLogoUrl
    }
  }
}
</script>

<style scoped>
.logo-detail-view {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem 1rem;
}

/* Loading State */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  color: #64748b;
}

.loading-spinner {
  margin-bottom: 1rem;
  color: #3b82f6;
}

.loading-text {
  font-size: 1rem;
  font-weight: 500;
}

/* Error State */
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  text-align: center;
}

.error-icon {
  margin-bottom: 1rem;
  color: #ef4444;
}

.error-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 0.5rem;
}

.error-message {
  color: #6b7280;
  margin-bottom: 2rem;
  max-width: 400px;
}

.error-actions {
  display: flex;
  gap: 1rem;
}

.retry-button,
.back-button {
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  font-weight: 500;
  text-decoration: none;
  transition: all 0.2s ease;
}

.retry-button {
  background: #3b82f6;
  color: white;
  border: none;
  cursor: pointer;
}

.retry-button:hover {
  background: #2563eb;
}

.back-button {
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
}

.back-button:hover {
  background: #e5e7eb;
}

/* Breadcrumb */
.breadcrumb {
  margin-bottom: 2rem;
  font-size: 0.875rem;
}

.breadcrumb-link {
  color: #3b82f6;
  text-decoration: none;
}

.breadcrumb-link:hover {
  text-decoration: underline;
}

.breadcrumb-separator {
  margin: 0 0.5rem;
  color: #6b7280;
}

.breadcrumb-current {
  color: #374151;
  font-weight: 500;
}

/* Detail Layout */
.detail-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 3rem;
  align-items: start;
}

/* Logo Display */
.logo-display {
  position: sticky;
  top: 2rem;
}

.logo-container {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 300px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  margin-bottom: 2rem;
}

.logo-image {
  max-width: 80%;
  max-height: 80%;
  object-fit: contain;
}

/* Variant Selector */
.variant-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 1rem;
}

.variant-options {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
}

.variant-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1rem;
  background: #ffffff;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.variant-option:hover {
  border-color: #cbd5e1;
}

.variant-option--active {
  border-color: #3b82f6;
  background: #eff6ff;
}

.variant-preview {
  width: 40px;
  height: 40px;
  object-fit: contain;
  margin-bottom: 0.5rem;
}

.variant-label {
  font-size: 0.75rem;
  font-weight: 500;
  color: #374151;
}

.variant-option--active .variant-label {
  color: #1e40af;
}

/* Logo Info */
.logo-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 2rem;
}

.logo-title {
  font-size: 2rem;
  font-weight: 700;
  color: #1f2937;
  margin: 0;
}

.logo-actions {
  display: flex;
  gap: 0.75rem;
}

.action-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
}

.action-button--primary {
  background: #3b82f6;
  color: white;
}

.action-button--primary:hover {
  background: #2563eb;
}

.action-button--secondary {
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
}

.action-button--secondary:hover {
  background: #e5e7eb;
}

/* Sections */
.section-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 0.75rem;
}

.logo-description {
  margin-bottom: 2rem;
}

.description-text {
  color: #6b7280;
  line-height: 1.6;
}

.logo-metadata {
  margin-bottom: 2rem;
}

.metadata-section {
  margin-bottom: 1.5rem;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.tag {
  padding: 0.25rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 500;
  border-radius: 1rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.tag--category {
  background: #dbeafe;
  color: #1e40af;
}

.tag--tag {
  background: #f3e8ff;
  color: #7c3aed;
}

/* Download Section */
.download-options {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.download-option {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
}

.download-option:hover {
  border-color: #cbd5e1;
  background: #f8fafc;
}

.download-preview {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8fafc;
  border-radius: 4px;
  flex-shrink: 0;
}

.download-preview-image {
  max-width: 32px;
  max-height: 32px;
  object-fit: contain;
}

.download-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.download-name {
  font-weight: 500;
  color: #374151;
}

.download-format {
  font-size: 0.75rem;
  color: #6b7280;
  text-transform: uppercase;
}

/* Responsive Design */
@media (max-width: 1024px) {
  .detail-layout {
    grid-template-columns: 1fr;
    gap: 2rem;
  }
  
  .logo-display {
    position: static;
  }
  
  .logo-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
}

@media (max-width: 640px) {
  .logo-detail-view {
    padding: 1rem;
  }
  
  .logo-container {
    height: 200px;
  }
  
  .logo-title {
    font-size: 1.5rem;
  }
  
  .variant-options {
    grid-template-columns: 1fr;
  }
  
  .logo-actions {
    width: 100%;
  }
  
  .action-button {
    flex: 1;
    justify-content: center;
  }
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .error-title,
  .logo-title,
  .section-title,
  .variant-title {
    color: #f9fafb;
  }
  
  .error-message,
  .description-text,
  .breadcrumb-current {
    color: #d1d5db;
  }
  
  .logo-container {
    background: #374151;
    border-color: #4b5563;
  }
  
  .variant-option {
    background: #1f2937;
    border-color: #4b5563;
  }
  
  .variant-option--active {
    background: #1e40af;
    border-color: #3b82f6;
  }
  
  .download-option {
    background: #1f2937;
    border-color: #4b5563;
  }
  
  .download-option:hover {
    background: #374151;
  }
  
  .download-preview {
    background: #374151;
  }
}
</style>