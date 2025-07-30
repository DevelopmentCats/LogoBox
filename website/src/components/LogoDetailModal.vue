<template>
  <Teleport to="body">
    <div
      v-if="isVisible"
      class="logo-detail-modal"
      :class="{ 'logo-detail-modal--closing': isClosing }"
      role="dialog"
      :aria-labelledby="titleId"
      :aria-describedby="descriptionId"
      aria-modal="true"
      @click="handleBackdropClick"
      @keydown="handleKeydown"
    >
      <!-- Modal backdrop -->
      <div class="logo-detail-modal__backdrop"></div>
      
      <!-- Modal content -->
      <div
        ref="modalContent"
        class="logo-detail-modal__content"
        tabindex="-1"
      >
        <!-- Modal header -->
        <header class="logo-detail-modal__header">
          <h2 :id="titleId" class="logo-detail-modal__title">
            {{ logo.name }}
          </h2>
          
          <button
            type="button"
            class="logo-detail-modal__close"
            :aria-label="closeAriaLabel"
            @click="handleClose"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </header>
        
        <!-- Modal body -->
        <div class="logo-detail-modal__body">
          <!-- Logo preview section -->
          <section class="logo-detail-modal__preview">
            <div class="logo-detail-modal__preview-container">
              <!-- Background selector -->
              <div class="logo-detail-modal__background-selector">
                <button
                  v-for="bg in backgroundOptions"
                  :key="bg.value"
                  type="button"
                  class="logo-detail-modal__background-option"
                  :class="{ 'logo-detail-modal__background-option--active': selectedBackground === bg.value }"
                  :aria-label="bg.ariaLabel"
                  :title="bg.title"
                  :style="{ backgroundColor: bg.color }"
                  @click="selectedBackground = bg.value"
                >
                  <span v-if="bg.pattern" class="logo-detail-modal__background-pattern" :class="bg.pattern"></span>
                </button>
              </div>
              
              <!-- Logo display -->
              <div
                class="logo-detail-modal__logo-display"
                :class="`logo-detail-modal__logo-display--${selectedBackground}`"
              >
                <div
                  v-if="isLogoLoading"
                  class="logo-detail-modal__logo-loading"
                  :aria-label="loadingAriaLabel"
                >
                  <svg class="logo-detail-modal__loading-spinner" width="32" height="32" viewBox="0 0 24 24">
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
                
                <div
                  v-else-if="hasLogoError"
                  class="logo-detail-modal__logo-error"
                  :aria-label="errorAriaLabel"
                >
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                  </svg>
                  <span class="logo-detail-modal__error-text">Failed to load logo</span>
                </div>
                
                <img
                  v-else
                  ref="logoImage"
                  class="logo-detail-modal__logo-image"
                  :src="currentLogoUrl"
                  :alt="logoAlt"
                  @load="handleLogoLoad"
                  @error="handleLogoError"
                />
              </div>
            </div>
            
            <!-- Variant selector -->
            <div class="logo-detail-modal__variant-selector">
              <h3 class="logo-detail-modal__section-title">Logo Variants</h3>
              <div class="logo-detail-modal__variants">
                <button
                  v-for="variant in availableVariants"
                  :key="variant.value"
                  type="button"
                  class="logo-detail-modal__variant"
                  :class="{ 'logo-detail-modal__variant--active': selectedVariant === variant.value }"
                  :aria-label="variant.ariaLabel"
                  @click="handleVariantChange(variant.value)"
                >
                  <div class="logo-detail-modal__variant-preview">
                    <img
                      :src="getLogoUrl(logo.slug, variant.value)"
                      :alt="variant.alt"
                      class="logo-detail-modal__variant-image"
                      loading="lazy"
                    />
                  </div>
                  <span class="logo-detail-modal__variant-label">{{ variant.label }}</span>
                </button>
              </div>
            </div>
          </section>
          
          <!-- Logo information section -->
          <section class="logo-detail-modal__info">
            <!-- Description -->
            <div v-if="logo.description" class="logo-detail-modal__description">
              <h3 class="logo-detail-modal__section-title">Description</h3>
              <p :id="descriptionId" class="logo-detail-modal__description-text">
                {{ logo.description }}
              </p>
            </div>
            
            <!-- Categories -->
            <div v-if="logo.categories && logo.categories.length > 0" class="logo-detail-modal__categories">
              <h3 class="logo-detail-modal__section-title">Categories</h3>
              <div class="logo-detail-modal__category-list">
                <span
                  v-for="category in logo.categories"
                  :key="category"
                  class="logo-detail-modal__category"
                >
                  {{ category }}
                </span>
              </div>
            </div>
            
            <!-- Tags -->
            <div v-if="logo.tags && logo.tags.length > 0" class="logo-detail-modal__tags">
              <h3 class="logo-detail-modal__section-title">Tags</h3>
              <div class="logo-detail-modal__tag-list">
                <span
                  v-for="tag in logo.tags"
                  :key="tag"
                  class="logo-detail-modal__tag"
                >
                  {{ tag }}
                </span>
              </div>
            </div>
            
            <!-- License -->
            <div v-if="logo.license" class="logo-detail-modal__license">
              <h3 class="logo-detail-modal__section-title">License</h3>
              <p class="logo-detail-modal__license-text">{{ logo.license }}</p>
            </div>
            
            <!-- Format selection and download -->
            <div class="logo-detail-modal__download">
              <h3 class="logo-detail-modal__section-title">Download</h3>
              
              <!-- Format selector -->
              <div class="logo-detail-modal__format-selector">
                <label class="logo-detail-modal__format-label">
                  Format:
                  <select
                    v-model="selectedFormat"
                    class="logo-detail-modal__format-select"
                    :aria-label="formatSelectAriaLabel"
                  >
                    <option
                      v-for="format in availableFormats"
                      :key="format.value"
                      :value="format.value"
                    >
                      {{ format.label }}
                    </option>
                  </select>
                </label>
              </div>
              
              <!-- Download button -->
              <button
                type="button"
                class="logo-detail-modal__download-button"
                :aria-label="downloadAriaLabel"
                :disabled="isDownloading"
                @click="handleDownload"
              >
                <svg
                  v-if="!isDownloading"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-15"></path>
                  <polyline points="7,10 12,15 17,10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                
                <svg
                  v-else
                  class="logo-detail-modal__download-spinner"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                >
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
                
                <span>{{ isDownloading ? 'Downloading...' : 'Download' }}</span>
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { getLogoUrl } from '../utils/logoApi.js'

export default {
  name: 'LogoDetailModal',
  
  props: {
    logo: {
      type: Object,
      required: true,
      validator: (logo) => {
        return logo !== null && 
               logo !== undefined &&
               typeof logo === 'object' &&
               typeof logo.name === 'string' && 
               typeof logo.slug === 'string'
      }
    },
    visible: {
      type: Boolean,
      default: false
    },
    initialVariant: {
      type: String,
      default: 'original',
      validator: (value) => ['original', 'white', 'black', 'optimized'].includes(value)
    }
  },
  
  emits: [
    'close',
    'download',
    'variant-change',
    'format-change'
  ],
  
  setup(props, { emit }) {
    // Component state
    const modalContent = ref(null)
    const logoImage = ref(null)
    const isVisible = ref(false)
    const isClosing = ref(false)
    const isLogoLoading = ref(true)
    const hasLogoError = ref(false)
    const isDownloading = ref(false)
    
    // Selection state
    const selectedVariant = ref(props.initialVariant)
    const selectedBackground = ref('white')
    const selectedFormat = ref('svg')
    
    // Background options for logo preview
    const backgroundOptions = [
      {
        value: 'white',
        color: '#ffffff',
        title: 'White background',
        ariaLabel: 'Set white background'
      },
      {
        value: 'light',
        color: '#f8fafc',
        title: 'Light gray background',
        ariaLabel: 'Set light gray background'
      },
      {
        value: 'dark',
        color: '#1e293b',
        title: 'Dark background',
        ariaLabel: 'Set dark background'
      },
      {
        value: 'black',
        color: '#000000',
        title: 'Black background',
        ariaLabel: 'Set black background'
      },
      {
        value: 'transparent',
        color: 'transparent',
        pattern: 'checkerboard',
        title: 'Transparent background',
        ariaLabel: 'Set transparent background'
      }
    ]
    
    // Available logo variants
    const availableVariants = [
      {
        value: 'original',
        label: 'Original',
        alt: `${props.logo.name} original logo`,
        ariaLabel: `Select original variant of ${props.logo.name} logo`
      },
      {
        value: 'white',
        label: 'White',
        alt: `${props.logo.name} white logo`,
        ariaLabel: `Select white variant of ${props.logo.name} logo`
      },
      {
        value: 'black',
        label: 'Black',
        alt: `${props.logo.name} black logo`,
        ariaLabel: `Select black variant of ${props.logo.name} logo`
      },
      {
        value: 'optimized',
        label: 'Optimized',
        alt: `${props.logo.name} optimized logo`,
        ariaLabel: `Select optimized variant of ${props.logo.name} logo`
      }
    ]
    
    // Available download formats
    const availableFormats = [
      {
        value: 'svg',
        label: 'SVG (Vector)',
        extension: 'svg',
        mimeType: 'image/svg+xml'
      }
      // PNG formats would be added here when available
    ]
    
    // Computed properties
    const titleId = computed(() => `logo-modal-title-${props.logo.slug}`)
    const descriptionId = computed(() => `logo-modal-desc-${props.logo.slug}`)
    
    const closeAriaLabel = computed(() => `Close ${props.logo.name} logo details`)
    const loadingAriaLabel = computed(() => `Loading ${props.logo.name} logo`)
    const errorAriaLabel = computed(() => `Failed to load ${props.logo.name} logo`)
    const logoAlt = computed(() => `${props.logo.name} ${selectedVariant.value} logo`)
    const formatSelectAriaLabel = computed(() => `Select download format for ${props.logo.name}`)
    const downloadAriaLabel = computed(() => 
      `Download ${props.logo.name} logo as ${selectedFormat.value.toUpperCase()}`
    )
    
    const currentLogoUrl = computed(() => {
      try {
        return getLogoUrl(props.logo.slug, selectedVariant.value)
      } catch (error) {
        console.warn(`Failed to generate URL for logo ${props.logo.slug}:`, error)
        return ''
      }
    })
    
    // Event handlers
    const handleClose = async () => {
      isClosing.value = true
      
      // Wait for closing animation
      await new Promise(resolve => setTimeout(resolve, 200))
      
      isVisible.value = false
      isClosing.value = false
      
      emit('close')
    }
    
    const handleBackdropClick = (event) => {
      if (event.target === event.currentTarget) {
        handleClose()
      }
    }
    
    const handleKeydown = (event) => {
      if (event.key === 'Escape') {
        handleClose()
      }
    }
    
    const handleVariantChange = (variant) => {
      selectedVariant.value = variant
      isLogoLoading.value = true
      hasLogoError.value = false
      
      emit('variant-change', {
        logo: props.logo,
        variant,
        url: getLogoUrl(props.logo.slug, variant)
      })
    }
    
    const handleLogoLoad = () => {
      isLogoLoading.value = false
      hasLogoError.value = false
    }
    
    const handleLogoError = () => {
      isLogoLoading.value = false
      hasLogoError.value = true
    }
    
    const handleDownload = async () => {
      if (isDownloading.value) return
      
      isDownloading.value = true
      
      try {
        const format = availableFormats.find(f => f.value === selectedFormat.value)
        const url = currentLogoUrl.value
        const filename = `${props.logo.slug}-${selectedVariant.value}.${format.extension}`
        
        // Create download link
        const link = document.createElement('a')
        link.href = url
        link.download = filename
        link.target = '_blank'
        
        // Trigger download
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        
        emit('download', {
          logo: props.logo,
          variant: selectedVariant.value,
          format: selectedFormat.value,
          url,
          filename
        })
        
      } catch (error) {
        console.error('Download failed:', error)
      } finally {
        isDownloading.value = false
      }
    }
    
    // Focus management
    const focusModal = async () => {
      await nextTick()
      if (modalContent.value) {
        modalContent.value.focus()
      }
    }
    
    const trapFocus = (event) => {
      if (!modalContent.value) return
      
      const focusableElements = modalContent.value.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      
      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]
      
      if (event.key === 'Tab') {
        if (event.shiftKey) {
          if (document.activeElement === firstElement) {
            event.preventDefault()
            lastElement.focus()
          }
        } else {
          if (document.activeElement === lastElement) {
            event.preventDefault()
            firstElement.focus()
          }
        }
      }
    }
    
    // Watchers
    watch(() => props.visible, async (newVisible) => {
      if (newVisible) {
        isVisible.value = true
        await focusModal()
        document.addEventListener('keydown', trapFocus)
        document.body.style.overflow = 'hidden'
      } else {
        document.removeEventListener('keydown', trapFocus)
        document.body.style.overflow = ''
        if (isVisible.value) {
          await handleClose()
        }
      }
    }, { immediate: true })
    
    watch(selectedFormat, (newFormat) => {
      emit('format-change', {
        logo: props.logo,
        format: newFormat
      })
    })
    
    // Lifecycle
    onMounted(() => {
      // Reset loading state when logo changes
      isLogoLoading.value = true
      hasLogoError.value = false
    })
    
    onUnmounted(() => {
      document.removeEventListener('keydown', trapFocus)
      document.body.style.overflow = ''
    })
    
    return {
      // Refs
      modalContent,
      logoImage,
      
      // State
      isVisible,
      isClosing,
      isLogoLoading,
      hasLogoError,
      isDownloading,
      selectedVariant,
      selectedBackground,
      selectedFormat,
      
      // Data
      backgroundOptions,
      availableVariants,
      availableFormats,
      
      // Computed
      titleId,
      descriptionId,
      closeAriaLabel,
      loadingAriaLabel,
      errorAriaLabel,
      logoAlt,
      formatSelectAriaLabel,
      downloadAriaLabel,
      currentLogoUrl,
      
      // Methods
      handleClose,
      handleBackdropClick,
      handleKeydown,
      handleVariantChange,
      handleLogoLoad,
      handleLogoError,
      handleDownload,
      getLogoUrl
    }
  }
}
</script>

<style scoped>
/* Modal container */
.logo-detail-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  animation: modalFadeIn 0.2s ease-out;
}

.logo-detail-modal--closing {
  animation: modalFadeOut 0.2s ease-in;
}

@keyframes modalFadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes modalFadeOut {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
}

/* Modal backdrop */
.logo-detail-modal__backdrop {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(4px);
}

/* Modal content */
.logo-detail-modal__content {
  position: relative;
  width: 100%;
  max-width: 900px;
  max-height: 90vh;
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  overflow: hidden;
  animation: modalSlideIn 0.2s ease-out;
}

.logo-detail-modal--closing .logo-detail-modal__content {
  animation: modalSlideOut 0.2s ease-in;
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(-20px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

@keyframes modalSlideOut {
  from {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
  to {
    opacity: 0;
    transform: scale(0.95) translateY(-20px);
  }
}

/* Modal header */
.logo-detail-modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 32px;
  border-bottom: 1px solid #e5e7eb;
  background: #f9fafb;
}

.logo-detail-modal__title {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  color: #111827;
  line-height: 1.2;
}

.logo-detail-modal__close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: transparent;
  border: none;
  border-radius: 8px;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s ease;
}

.logo-detail-modal__close:hover {
  background: #e5e7eb;
  color: #374151;
}

.logo-detail-modal__close:focus {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}

/* Modal body */
.logo-detail-modal__body {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 32px;
  padding: 32px;
  max-height: calc(90vh - 120px);
  overflow-y: auto;
}

/* Preview section */
.logo-detail-modal__preview {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.logo-detail-modal__preview-container {
  position: relative;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  overflow: hidden;
}

/* Background selector */
.logo-detail-modal__background-selector {
  display: flex;
  gap: 8px;
  padding: 16px;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
}

.logo-detail-modal__background-option {
  position: relative;
  width: 32px;
  height: 32px;
  border: 2px solid transparent;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  overflow: hidden;
}

.logo-detail-modal__background-option:hover {
  border-color: #d1d5db;
  transform: scale(1.1);
}

.logo-detail-modal__background-option:focus {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}

.logo-detail-modal__background-option--active {
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

.logo-detail-modal__background-pattern {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}

.logo-detail-modal__background-pattern.checkerboard {
  background-image: 
    linear-gradient(45deg, #f3f4f6 25%, transparent 25%),
    linear-gradient(-45deg, #f3f4f6 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #f3f4f6 75%),
    linear-gradient(-45deg, transparent 75%, #f3f4f6 75%);
  background-size: 8px 8px;
  background-position: 0 0, 0 4px, 4px -4px, -4px 0px;
}

/* Logo display */
.logo-detail-modal__logo-display {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 300px;
  padding: 40px;
  transition: background-color 0.2s ease;
}

.logo-detail-modal__logo-display--white {
  background-color: #ffffff;
}

.logo-detail-modal__logo-display--light {
  background-color: #f8fafc;
}

.logo-detail-modal__logo-display--dark {
  background-color: #1e293b;
}

.logo-detail-modal__logo-display--black {
  background-color: #000000;
}

.logo-detail-modal__logo-display--transparent {
  background-image: 
    linear-gradient(45deg, #f3f4f6 25%, transparent 25%),
    linear-gradient(-45deg, #f3f4f6 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #f3f4f6 75%),
    linear-gradient(-45deg, transparent 75%, #f3f4f6 75%);
  background-size: 20px 20px;
  background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
}

.logo-detail-modal__logo-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  transition: transform 0.2s ease;
}

.logo-detail-modal__logo-image:hover {
  transform: scale(1.05);
}

/* Loading and error states */
.logo-detail-modal__logo-loading,
.logo-detail-modal__logo-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #6b7280;
}

.logo-detail-modal__logo-error {
  color: #ef4444;
}

.logo-detail-modal__loading-spinner {
  animation: spin 1s linear infinite;
}

.logo-detail-modal__error-text {
  font-size: 14px;
  font-weight: 500;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Variant selector */
.logo-detail-modal__variant-selector {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.logo-detail-modal__section-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #374151;
}

.logo-detail-modal__variants {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.logo-detail-modal__variant {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: #f9fafb;
  border: 2px solid transparent;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.logo-detail-modal__variant:hover {
  background: #f3f4f6;
  border-color: #d1d5db;
}

.logo-detail-modal__variant:focus {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}

.logo-detail-modal__variant--active {
  background: #eff6ff;
  border-color: #3b82f6;
}

.logo-detail-modal__variant-preview {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
}

.logo-detail-modal__variant-image {
  max-width: 32px;
  max-height: 32px;
  object-fit: contain;
}

.logo-detail-modal__variant-label {
  font-size: 12px;
  font-weight: 500;
  color: #6b7280;
  text-align: center;
}

.logo-detail-modal__variant--active .logo-detail-modal__variant-label {
  color: #3b82f6;
}

/* Info section */
.logo-detail-modal__info {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.logo-detail-modal__description-text {
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
  color: #6b7280;
}

/* Categories and tags */
.logo-detail-modal__category-list,
.logo-detail-modal__tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.logo-detail-modal__category,
.logo-detail-modal__tag {
  display: inline-block;
  padding: 4px 8px;
  font-size: 12px;
  font-weight: 500;
  border-radius: 6px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.logo-detail-modal__category {
  background: #dbeafe;
  color: #1e40af;
}

.logo-detail-modal__tag {
  background: #f3e8ff;
  color: #7c3aed;
}

/* License */
.logo-detail-modal__license-text {
  margin: 0;
  font-size: 14px;
  color: #6b7280;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  background: #f9fafb;
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
}

/* Download section */
.logo-detail-modal__download {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
}

.logo-detail-modal__format-selector {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.logo-detail-modal__format-label {
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.logo-detail-modal__format-select {
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: #ffffff;
  font-size: 14px;
  color: #374151;
  cursor: pointer;
  transition: border-color 0.2s ease;
}

.logo-detail-modal__format-select:hover {
  border-color: #9ca3af;
}

.logo-detail-modal__format-select:focus {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
  border-color: #3b82f6;
}

.logo-detail-modal__download-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 24px;
  background: #3b82f6;
  color: #ffffff;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.logo-detail-modal__download-button:hover:not(:disabled) {
  background: #2563eb;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
}

.logo-detail-modal__download-button:focus {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}

.logo-detail-modal__download-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.logo-detail-modal__download-spinner {
  animation: spin 1s linear infinite;
}

/* Responsive design */
@media (max-width: 768px) {
  .logo-detail-modal {
    padding: 10px;
  }
  
  .logo-detail-modal__content {
    max-height: 95vh;
  }
  
  .logo-detail-modal__header {
    padding: 20px 24px;
  }
  
  .logo-detail-modal__title {
    font-size: 20px;
  }
  
  .logo-detail-modal__body {
    grid-template-columns: 1fr;
    gap: 24px;
    padding: 24px;
  }
  
  .logo-detail-modal__logo-display {
    height: 200px;
    padding: 20px;
  }
  
  .logo-detail-modal__variants {
    grid-template-columns: repeat(4, 1fr);
  }
  
  .logo-detail-modal__variant {
    padding: 8px;
  }
  
  .logo-detail-modal__variant-preview {
    width: 40px;
    height: 40px;
  }
  
  .logo-detail-modal__variant-image {
    max-width: 24px;
    max-height: 24px;
  }
}

@media (max-width: 480px) {
  .logo-detail-modal__header {
    padding: 16px 20px;
  }
  
  .logo-detail-modal__body {
    padding: 20px;
  }
  
  .logo-detail-modal__background-selector {
    padding: 12px;
  }
  
  .logo-detail-modal__background-option {
    width: 28px;
    height: 28px;
  }
  
  .logo-detail-modal__logo-display {
    height: 180px;
    padding: 16px;
  }
  
  .logo-detail-modal__variants {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  .logo-detail-modal__content {
    border: 2px solid #000000;
  }
  
  .logo-detail-modal__header {
    border-bottom-width: 2px;
  }
  
  .logo-detail-modal__background-option,
  .logo-detail-modal__variant,
  .logo-detail-modal__format-select,
  .logo-detail-modal__download {
    border-width: 2px;
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .logo-detail-modal,
  .logo-detail-modal__content,
  .logo-detail-modal__logo-image,
  .logo-detail-modal__background-option,
  .logo-detail-modal__variant,
  .logo-detail-modal__download-button {
    animation: none;
    transition: none;
  }
  
  .logo-detail-modal__logo-image:hover,
  .logo-detail-modal__background-option:hover,
  .logo-detail-modal__download-button:hover {
    transform: none;
  }
  
  .logo-detail-modal__loading-spinner,
  .logo-detail-modal__download-spinner {
    animation: none;
  }
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .logo-detail-modal__content {
    background: #1f2937;
    color: #f9fafb;
  }
  
  .logo-detail-modal__header {
    background: #111827;
    border-bottom-color: #374151;
  }
  
  .logo-detail-modal__title {
    color: #f9fafb;
  }
  
  .logo-detail-modal__close {
    color: #9ca3af;
  }
  
  .logo-detail-modal__close:hover {
    background: #374151;
    color: #f3f4f6;
  }
  
  .logo-detail-modal__section-title {
    color: #f3f4f6;
  }
  
  .logo-detail-modal__description-text {
    color: #d1d5db;
  }
  
  .logo-detail-modal__variant {
    background: #374151;
    border-color: transparent;
  }
  
  .logo-detail-modal__variant:hover {
    background: #4b5563;
    border-color: #6b7280;
  }
  
  .logo-detail-modal__variant--active {
    background: #1e3a8a;
    border-color: #3b82f6;
  }
  
  .logo-detail-modal__variant-preview {
    background: #f9fafb;
  }
  
  .logo-detail-modal__variant-label {
    color: #d1d5db;
  }
  
  .logo-detail-modal__variant--active .logo-detail-modal__variant-label {
    color: #60a5fa;
  }
  
  .logo-detail-modal__category {
    background: #1e40af;
    color: #dbeafe;
  }
  
  .logo-detail-modal__tag {
    background: #7c3aed;
    color: #f3e8ff;
  }
  
  .logo-detail-modal__license-text {
    background: #374151;
    border-color: #4b5563;
    color: #d1d5db;
  }
  
  .logo-detail-modal__download {
    background: #374151;
    border-color: #4b5563;
  }
  
  .logo-detail-modal__format-label {
    color: #f3f4f6;
  }
  
  .logo-detail-modal__format-select {
    background: #1f2937;
    border-color: #4b5563;
    color: #f3f4f6;
  }
  
  .logo-detail-modal__format-select:hover {
    border-color: #6b7280;
  }
  
  .logo-detail-modal__download-button {
    background: #3b82f6;
  }
  
  .logo-detail-modal__download-button:hover:not(:disabled) {
    background: #2563eb;
  }
}

/* Print styles */
@media print {
  .logo-detail-modal {
    position: static;
    background: none;
    padding: 0;
  }
  
  .logo-detail-modal__backdrop {
    display: none;
  }
  
  .logo-detail-modal__content {
    box-shadow: none;
    border: 1px solid #000;
    border-radius: 0;
    max-height: none;
  }
  
  .logo-detail-modal__close {
    display: none;
  }
  
  .logo-detail-modal__body {
    overflow: visible;
    max-height: none;
  }
  
  .logo-detail-modal__background-selector,
  .logo-detail-modal__variant-selector,
  .logo-detail-modal__download {
    display: none;
  }
  
  .logo-detail-modal__logo-display {
    background: #fff !important;
  }
}
</style>