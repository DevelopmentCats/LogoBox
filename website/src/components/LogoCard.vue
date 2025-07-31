<template>
  <div 
    class="logo-card" 
    :class="{ 
      'logo-card--loading': isLoading,
      'logo-card--error': hasError,
      'logo-card--selected': isSelected
    }"
    role="button"
    :tabindex="disabled ? -1 : 0"
    :aria-label="cardAriaLabel"
    :aria-describedby="descriptionId"
    @click="handleClick"
    @keydown="handleKeydown"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
  >
    <!-- Logo image container -->
    <div
      ref="imageContainer"
      class="logo-card__image-container"
      :class="{
        'logo-card__image-container--loading': currentIsLoading,
        'logo-card__image-container--error': currentHasError,
        'logo-card__image-container--loaded': lazyImage.isLoaded
      }"
    >
      <!-- Enhanced placeholder with progress -->
      <div
        v-if="lazyImage.shouldShowPlaceholder"
        class="logo-card__placeholder logo-card__loading-placeholder"
        :class="{
          'logo-card__placeholder--visible': lazyImage.isVisible,
          'logo-card__placeholder--loading': lazyImage.isLoading
        }"
        :style="{ backgroundColor: lazyLoadingConfig.placeholderColor }"
        :aria-label="loadingAriaLabel"
      >
        <!-- Loading progress bar -->
        <div
          v-if="lazyImage.isLoading && lazyLoadingConfig.enableProgressiveLoading"
          class="logo-card__progress-bar"
        >
          <div
            class="logo-card__progress-fill"
            :style="{ width: `${lazyImage.loadingProgress}%` }"
          ></div>
        </div>
        
        <!-- Loading spinner -->
        <div
          v-if="lazyImage.isLoading"
          class="logo-card__loading-content"
        >
          <svg class="logo-card__loading-spinner" width="24" height="24" viewBox="0 0 24 24">
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
          <span class="logo-card__loading-text">Loading...</span>
        </div>
        
        <!-- Visibility indicator (for pending state) -->
        <div
          v-else-if="lazyImage.loadingState === 'pending'"
          class="logo-card__pending-indicator"
        >
          <div class="logo-card__pending-dot"></div>
        </div>
      </div>
      
      <!-- Error state with retry -->
      <div
        v-if="currentHasError"
        class="logo-card__error-placeholder"
        :aria-label="errorAriaLabel"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <span class="logo-card__error-text">Failed to load</span>
        <button
          v-if="lazyImage.canRetry"
          type="button"
          class="logo-card__retry-button"
          @click.stop="handleRetry"
          :aria-label="`Retry loading ${logo.name} logo`"
        >
          Retry
        </button>
      </div>
      
      <!-- Main image -->
      <img
        ref="logoImage"
        class="logo-card__image"
        :class="{
          'logo-card__image--loaded': lazyImage.isLoaded,
          'logo-card__image--loading': lazyImage.isLoading,
          'logo-card__image--visible': lazyImage.isVisible
        }"
        :src="logoUrl"
        :alt="imageAlt"
        :loading="lazyLoad ? 'lazy' : 'eager'"
        @load="handleImageLoad"
        @error="handleImageError"
      />
      
      <!-- Hover overlay with actions -->
      <div class="logo-card__overlay">
        <div class="logo-card__actions">
          <button
            type="button"
            class="logo-card__action logo-card__action--download"
            :aria-label="downloadAriaLabel"
            @click.stop="handleDownload"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7,10 12,15 17,10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
          </button>
          
          <button
            type="button"
            class="logo-card__action logo-card__action--view"
            :aria-label="viewAriaLabel"
            @click.stop="handleView"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
          </button>
        </div>
      </div>
    </div>
    
    <!-- Logo information -->
    <div class="logo-card__content">
      <h3 class="logo-card__title">{{ logo.name }}</h3>
      
      <p 
        v-if="logo.description && showDescription" 
        :id="descriptionId"
        class="logo-card__description"
      >
        {{ truncatedDescription }}
      </p>
      
      <!-- Categories and tags -->
      <div v-if="showMetadata" class="logo-card__metadata">
        <div v-if="logo.categories && logo.categories.length > 0" class="logo-card__categories">
          <span 
            v-for="category in displayCategories" 
            :key="category"
            class="logo-card__category"
            :title="category"
          >
            {{ category }}
          </span>
          <span 
            v-if="logo.categories.length > maxCategories"
            class="logo-card__category logo-card__category--more"
            :title="remainingCategoriesTitle"
          >
            +{{ logo.categories.length - maxCategories }}
          </span>
        </div>
        
        <div v-if="logo.tags && logo.tags.length > 0" class="logo-card__tags">
          <span 
            v-for="tag in displayTags" 
            :key="tag"
            class="logo-card__tag"
            :title="tag"
          >
            {{ tag }}
          </span>
          <span 
            v-if="logo.tags.length > maxTags"
            class="logo-card__tag logo-card__tag--more"
            :title="remainingTagsTitle"
          >
            +{{ logo.tags.length - maxTags }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { getLogoUrl } from '../utils/logoApi.js'
import { useLazyImageLoading } from '../composables/useLazyImageLoading.js'

export default {
  name: 'LogoCard',
  
  props: {
    logo: {
      type: Object,
      required: true,
      validator: (logo) => {
        return logo &&
               typeof logo.name === 'string' &&
               typeof logo.slug === 'string'
      }
    },
    variant: {
      type: String,
      default: 'original',
      validator: (value) => ['original', 'white', 'black', 'optimized'].includes(value)
    },
    showDescription: {
      type: Boolean,
      default: true
    },
    showMetadata: {
      type: Boolean,
      default: true
    },
    maxDescriptionLength: {
      type: Number,
      default: 100
    },
    maxCategories: {
      type: Number,
      default: 2
    },
    maxTags: {
      type: Number,
      default: 3
    },
    lazyLoad: {
      type: Boolean,
      default: true
    },
    lazyLoadingConfig: {
      type: Object,
      default: () => ({
        threshold: 0.1,
        rootMargin: '50px',
        enablePlaceholder: true,
        placeholderColor: '#f3f4f6',
        enableProgressiveLoading: true,
        retryAttempts: 3
      })
    },
    disabled: {
      type: Boolean,
      default: false
    },
    isSelected: {
      type: Boolean,
      default: false
    },
    clickable: {
      type: Boolean,
      default: true
    }
  },
  
  emits: [
    'click',
    'download',
    'view',
    'hover',
    'image-load',
    'image-error',
    'visibility-change'
  ],
  
  setup(props, { emit }) {
    // Template refs
    const logoImage = ref(null)
    const imageContainer = ref(null)
    
    // Component state
    const isHovered = ref(false)
    
    // Computed properties
    const logoUrl = computed(() => {
      try {
        return getLogoUrl(props.logo.slug, props.variant)
      } catch (error) {
        console.warn(`Failed to generate URL for logo ${props.logo.slug}:`, error)
        return ''
      }
    })
    
    // Enhanced lazy loading composable
    const lazyImage = useLazyImageLoading(logoUrl, {
      ...props.lazyLoadingConfig,
      enablePlaceholder: props.lazyLoad && props.lazyLoadingConfig.enablePlaceholder,
      onLoadComplete: (success, element) => {
        if (success) {
          handleImageLoad({ target: element || logoImage.value })
        } else {
          handleImageError({ target: element || logoImage.value })
        }
      },
      onVisibilityChange: (visible, entry) => {
        // Optional: emit visibility events for analytics
        emit('visibility-change', {
          logo: props.logo,
          visible,
          entry
        })
      }
    })
    
    // Backward compatibility - combine lazy loading state with legacy state
    const currentIsLoading = computed(() => {
      return props.lazyLoad ? lazyImage.isLoading.value : isLoading.value
    })
    
    const currentHasError = computed(() => {
      return props.lazyLoad ? lazyImage.hasError.value : hasError.value
    })
    
    // Legacy state for non-lazy loading
    const isLoading = ref(true)
    const hasError = ref(false)
    
    const imageAlt = computed(() => {
      return `${props.logo.name} logo`
    })
    
    const cardAriaLabel = computed(() => {
      const parts = [`${props.logo.name} logo card`]
      
      if (props.logo.description) {
        parts.push(props.logo.description)
      }
      
      if (props.logo.categories && props.logo.categories.length > 0) {
        parts.push(`Categories: ${props.logo.categories.join(', ')}`)
      }
      
      return parts.join('. ')
    })
    
    const descriptionId = computed(() => `logo-card-desc-${props.logo.slug}`)
    
    const loadingAriaLabel = computed(() => `Loading ${props.logo.name} logo`)
    const errorAriaLabel = computed(() => `Failed to load ${props.logo.name} logo`)
    const downloadAriaLabel = computed(() => `Download ${props.logo.name} logo`)
    const viewAriaLabel = computed(() => `View ${props.logo.name} logo details`)
    
    const truncatedDescription = computed(() => {
      if (!props.logo.description) return ''
      
      if (props.logo.description.length <= props.maxDescriptionLength) {
        return props.logo.description
      }
      
      return props.logo.description.substring(0, props.maxDescriptionLength).trim() + '...'
    })
    
    const displayCategories = computed(() => {
      if (!props.logo.categories) return []
      return props.logo.categories.slice(0, props.maxCategories)
    })
    
    const displayTags = computed(() => {
      if (!props.logo.tags) return []
      return props.logo.tags.slice(0, props.maxTags)
    })
    
    const remainingCategoriesTitle = computed(() => {
      if (!props.logo.categories || props.logo.categories.length <= props.maxCategories) return ''
      
      const remaining = props.logo.categories.slice(props.maxCategories)
      return `Additional categories: ${remaining.join(', ')}`
    })
    
    const remainingTagsTitle = computed(() => {
      if (!props.logo.tags || props.logo.tags.length <= props.maxTags) return ''
      
      const remaining = props.logo.tags.slice(props.maxTags)
      return `Additional tags: ${remaining.join(', ')}`
    })
    
    // Event handlers
    const handleClick = (event) => {
      if (props.disabled || !props.clickable) return
      
      emit('click', {
        logo: props.logo,
        event,
        variant: props.variant
      })
    }
    
    const handleKeydown = (event) => {
      if (props.disabled || !props.clickable) return
      
      // Handle Enter and Space keys for accessibility
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        handleClick(event)
      }
    }
    
    const handleMouseEnter = (event) => {
      isHovered.value = true
      emit('hover', {
        logo: props.logo,
        event,
        hovered: true
      })
    }
    
    const handleMouseLeave = (event) => {
      isHovered.value = false
      emit('hover', {
        logo: props.logo,
        event,
        hovered: false
      })
    }
    
    const handleImageLoad = (event) => {
      // Update legacy state for non-lazy loading
      if (!props.lazyLoad) {
        isLoading.value = false
        hasError.value = false
      }
      
      emit('image-load', {
        logo: props.logo,
        event,
        variant: props.variant,
        loadingState: props.lazyLoad ? lazyImage.loadingState.value : 'loaded',
        performanceMetrics: props.lazyLoad ? lazyImage.performanceMetrics.value : null
      })
    }
    
    const handleImageError = (event) => {
      // Update legacy state for non-lazy loading
      if (!props.lazyLoad) {
        isLoading.value = false
        hasError.value = true
      }
      
      emit('image-error', {
        logo: props.logo,
        event,
        variant: props.variant
      })
    }
    
    const handleRetry = () => {
      if (props.lazyLoad && lazyImage.canRetry.value) {
        lazyImage.retry()
      }
    }
    
    const handleDownload = (event) => {
      emit('download', {
        logo: props.logo,
        event,
        variant: props.variant,
        url: logoUrl.value
      })
    }
    
    const handleView = (event) => {
      emit('view', {
        logo: props.logo,
        event,
        variant: props.variant
      })
    }
    
    // Lifecycle
    onMounted(() => {
      if (props.lazyLoad && imageContainer.value) {
        // Use enhanced lazy loading
        lazyImage.observe(imageContainer.value)
      } else if (logoImage.value && logoImage.value.complete) {
        // Fallback for non-lazy loading - check if image is already cached
        if (logoImage.value.naturalWidth > 0) {
          handleImageLoad({ target: logoImage.value })
        } else {
          handleImageError({ target: logoImage.value })
        }
      }
    })
    
    onUnmounted(() => {
      if (props.lazyLoad && imageContainer.value) {
        lazyImage.unobserve(imageContainer.value)
      }
    })
    
    return {
      // Refs
      logoImage,
      imageContainer,
      
      // Enhanced lazy loading
      lazyImage,
      
      // State
      isLoading,
      hasError,
      isHovered,
      currentIsLoading,
      currentHasError,
      
      // Computed
      logoUrl,
      imageAlt,
      cardAriaLabel,
      descriptionId,
      loadingAriaLabel,
      errorAriaLabel,
      downloadAriaLabel,
      viewAriaLabel,
      truncatedDescription,
      displayCategories,
      displayTags,
      remainingCategoriesTitle,
      remainingTagsTitle,
      
      // Methods
      handleClick,
      handleKeydown,
      handleMouseEnter,
      handleMouseLeave,
      handleImageLoad,
      handleImageError,
      handleRetry,
      handleDownload,
      handleView
    }
  }
}
</script>

<style scoped>
.logo-card {
  position: relative;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.2s ease;
  cursor: pointer;
  user-select: none;
}

.logo-card:hover {
  border-color: #cbd5e1;
  box-shadow: 0 4px 12px -2px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  transform: translateY(-2px);
}

.logo-card:focus {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}

.logo-card--loading {
  pointer-events: none;
}

.logo-card--error {
  border-color: #fecaca;
  background: #fef2f2;
}

.logo-card--selected {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.logo-card--selected:hover {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15), 0 4px 12px -2px rgba(0, 0, 0, 0.1);
}

/* Image container */
.logo-card__image-container {
  position: relative;
  width: 100%;
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8fafc;
  overflow: hidden;
}

.logo-card__image {
  max-width: 80%;
  max-height: 80%;
  object-fit: contain;
  transition: transform 0.2s ease;
}

.logo-card:hover .logo-card__image {
  transform: scale(1.05);
}

/* Enhanced placeholder */
.logo-card__placeholder {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f3f4f6;
  transition: opacity 0.3s ease;
  z-index: 1;
}

.logo-card__placeholder--visible {
  opacity: 0.8;
}

.logo-card__placeholder--loading {
  opacity: 1;
}

/* Progress bar */
.logo-card__progress-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.logo-card__progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #60a5fa);
  transition: width 0.2s ease;
  border-radius: 0 2px 2px 0;
}

/* Loading content */
.logo-card__loading-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: #64748b;
}

.logo-card__loading-spinner {
  animation: spin 1s linear infinite;
}

.logo-card__loading-text {
  font-size: 12px;
  font-weight: 500;
}

/* Pending indicator */
.logo-card__pending-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
}

.logo-card__pending-dot {
  width: 8px;
  height: 8px;
  background: #94a3b8;
  border-radius: 50%;
  animation: pulse 2s infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes pulse {
  0%, 100% { opacity: 0.5; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.2); }
}

/* Legacy loading state for backward compatibility */
.logo-card__loading-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #64748b;
}

/* Enhanced error state */
.logo-card__error-placeholder {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #ef4444;
  background: rgba(254, 242, 242, 0.9);
  z-index: 2;
}

.logo-card__error-text {
  font-size: 12px;
  font-weight: 500;
}

.logo-card__retry-button {
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.logo-card__retry-button:hover {
  background: #dc2626;
}

.logo-card__retry-button:focus {
  outline: 2px solid #ef4444;
  outline-offset: 1px;
}

/* Hover overlay */
.logo-card__overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.logo-card:hover .logo-card__overlay {
  opacity: 1;
}

.logo-card__actions {
  display: flex;
  gap: 8px;
}

.logo-card__action {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: rgba(255, 255, 255, 0.9);
  border: none;
  border-radius: 8px;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s ease;
  backdrop-filter: blur(4px);
}

.logo-card__action:hover {
  background: #ffffff;
  transform: scale(1.1);
}

.logo-card__action:focus {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}

.logo-card__action--download:hover {
  color: #059669;
}

.logo-card__action--view:hover {
  color: #3b82f6;
}

/* Content */
.logo-card__content {
  padding: 16px;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.logo-card__title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.logo-card__description {
  margin: 0;
  font-size: 13px;
  color: #64748b;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Metadata */
.logo-card__metadata {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: auto;
}

.logo-card__categories,
.logo-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.logo-card__category,
.logo-card__tag {
  display: inline-block;
  padding: 2px 6px;
  font-size: 10px;
  font-weight: 500;
  border-radius: 4px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 80px;
}

.logo-card__category {
  background: #dbeafe;
  color: #1e40af;
}

.logo-card__tag {
  background: #f3e8ff;
  color: #7c3aed;
}

.logo-card__category--more,
.logo-card__tag--more {
  background: #f1f5f9;
  color: #64748b;
  cursor: help;
}

/* Responsive design */
@media (max-width: 640px) {
  .logo-card__image-container {
    height: 100px;
  }
  
  .logo-card__content {
    padding: 12px;
  }
  
  .logo-card__title {
    font-size: 14px;
  }
  
  .logo-card__description {
    font-size: 12px;
  }
  
  .logo-card__overlay {
    display: none; /* Hide overlay on mobile for better touch experience */
  }
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  .logo-card {
    border-width: 2px;
  }
  
  .logo-card:focus {
    outline-width: 3px;
  }
  
  .logo-card__category,
  .logo-card__tag {
    border: 1px solid currentColor;
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .logo-card,
  .logo-card__image,
  .logo-card__overlay,
  .logo-card__action {
    transition: none;
  }
  
  .logo-card:hover {
    transform: none;
  }
  
  .logo-card:hover .logo-card__image {
    transform: none;
  }
  
  .logo-card__action:hover {
    transform: none;
  }
  
  .logo-card__loading-spinner {
    animation: none;
  }
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .logo-card {
    background: #1e293b;
    border-color: #475569;
  }
  
  .logo-card:hover {
    border-color: #64748b;
  }
  
  .logo-card--error {
    border-color: #7f1d1d;
    background: #450a0a;
  }
  
  .logo-card--selected {
    border-color: #60a5fa;
    box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.1);
  }
  
  .logo-card__image-container {
    background: #334155;
  }
  
  .logo-card__title {
    color: #f1f5f9;
  }
  
  .logo-card__description {
    color: #94a3b8;
  }
  
  .logo-card__category {
    background: #1e40af;
    color: #dbeafe;
  }
  
  .logo-card__tag {
    background: #7c3aed;
    color: #f3e8ff;
  }
  
  .logo-card__category--more,
  .logo-card__tag--more {
    background: #475569;
    color: #94a3b8;
  }
  
  .logo-card__action {
    background: rgba(30, 41, 59, 0.9);
    color: #e2e8f0;
  }
  
  .logo-card__action:hover {
    background: #1e293b;
  }
}

/* Print styles */
@media print {
  .logo-card {
    break-inside: avoid;
    box-shadow: none;
    border: 1px solid #000;
  }
  
  .logo-card__overlay {
    display: none;
  }
  
  .logo-card__image-container {
    background: #fff;
  }
}
</style>