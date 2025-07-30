<template>
  <div v-if="isOpen" class="modal-overlay" @click.self="closeModal">
    <div class="modal-content advanced-download-modal">
      <div class="modal-header">
        <h2>Download {{ logo.name }}</h2>
        <button @click="closeModal" class="close-button">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <div class="modal-body">
        <!-- Logo Preview -->
        <div class="logo-preview-section">
          <div class="current-preview">
            <img 
              :src="currentPreviewUrl" 
              :alt="logo.name"
              :style="previewStyles"
            />
          </div>
          <div class="preview-info">
            <h3>{{ logo.name }}</h3>
            <p class="preview-dimensions">{{ previewDimensions }}</p>
            <p class="preview-format">{{ selectedFormat.toUpperCase() }}</p>
          </div>
        </div>

        <!-- Download Configuration -->
        <div class="download-configuration">
          <div class="config-section">
            <h3>Format</h3>
            <div class="format-options">
              <label 
                v-for="format in availableFormats" 
                :key="format"
                class="format-option"
                :class="{ active: selectedFormat === format }"
              >
                <input 
                  type="radio" 
                  :value="format" 
                  v-model="selectedFormat"
                  @change="updatePreview"
                />
                <div class="format-info">
                  <span class="format-name">{{ format.toUpperCase() }}</span>
                  <span class="format-desc">{{ getFormatDescription(format) }}</span>
                </div>
              </label>
            </div>
          </div>

          <div class="config-section">
            <h3>Size</h3>
            <div class="size-options">
              <div class="preset-sizes">
                <button
                  v-for="(preset, key) in presetSizes"
                  :key="key"
                  @click="selectPresetSize(preset)"
                  class="size-preset"
                  :class="{ active: isPresetActive(preset) }"
                >
                  <span class="size-label">{{ preset.label }}</span>
                  <span class="size-dimensions">{{ preset.width }}×{{ preset.height }}</span>
                </button>
              </div>
              
              <div class="custom-size">
                <label class="custom-toggle">
                  <input 
                    type="checkbox" 
                    v-model="useCustomSize"
                    @change="toggleCustomSize"
                  />
                  Custom Size
                </label>
                
                <div v-if="useCustomSize" class="custom-inputs">
                  <div class="dimension-input">
                    <label>Width</label>
                    <input 
                      type="number" 
                      v-model.number="customWidth" 
                      min="8" 
                      max="2048"
                      @input="updatePreview"
                    />
                    <span class="unit">px</span>
                  </div>
                  <div class="dimension-input">
                    <label>Height</label>
                    <input 
                      type="number" 
                      v-model.number="customHeight" 
                      min="8" 
                      max="2048"
                      @input="updatePreview"
                    />
                    <span class="unit">px</span>
                  </div>
                  <label class="aspect-ratio-lock">
                    <input 
                      type="checkbox" 
                      v-model="maintainAspectRatio"
                      @change="handleAspectRatioChange"
                    />
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                      <circle cx="12" cy="16" r="1"></circle>
                      <path d="m7 11 0-5a5 5 0 0 1 10 0v5"></path>
                    </svg>
                    Lock Aspect Ratio
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div class="config-section">
            <h3>Variant</h3>
            <div class="variant-options">
              <label 
                v-for="variant in availableVariants" 
                :key="variant.key"
                class="variant-option"
                :class="{ active: selectedVariant === variant.key }"
              >
                <input 
                  type="radio" 
                  :value="variant.key" 
                  v-model="selectedVariant"
                  @change="updatePreview"
                />
                <div class="variant-preview">
                  <img 
                    :src="getVariantPreviewUrl(variant.key)" 
                    :alt="`${logo.name} ${variant.label}`"
                  />
                </div>
                <div class="variant-info">
                  <span class="variant-name">{{ variant.label }}</span>
                  <span class="variant-desc">{{ variant.description }}</span>
                </div>
              </label>
            </div>
          </div>

          <div v-if="selectedFormat === 'png'" class="config-section">
            <h3>Quality</h3>
            <div class="quality-control">
              <input 
                type="range"
                min="0.3"
                max="1"
                step="0.1"
                v-model.number="quality"
                @input="updatePreview"
                class="quality-slider"
              />
              <div class="quality-labels">
                <span>{{ Math.round(quality * 100) }}%</span>
                <div class="quality-desc">
                  {{ quality < 0.6 ? 'Lower file size' : quality > 0.8 ? 'Higher quality' : 'Balanced' }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Batch Download Options -->
        <div class="batch-download-section">
          <h3>Quick Downloads</h3>
          <div class="quick-download-grid">
            <button 
              v-for="quickOption in quickDownloadOptions"
              :key="quickOption.key"
              @click="downloadQuick(quickOption)"
              class="quick-download-btn"
              :disabled="isGenerating"
            >
              <div class="quick-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7,10 12,15 17,10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
              </div>
              <div class="quick-info">
                <span class="quick-title">{{ quickOption.title }}</span>
                <span class="quick-desc">{{ quickOption.description }}</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <div class="download-actions">
          <button 
            @click="downloadCurrent" 
            class="download-btn primary"
            :disabled="isGenerating"
          >
            <svg v-if="!isGenerating" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7,10 12,15 17,10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            <div v-else class="spinner"></div>
            {{ isGenerating ? 'Generating...' : 'Download' }}
          </button>
          
          <button 
            @click="copyToClipboard" 
            class="copy-btn secondary"
            :disabled="isGenerating"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
            Copy to Clipboard
          </button>
          
          <button 
            @click="generateAllSizes" 
            class="batch-btn secondary"
            :disabled="isGenerating"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <rect x="3" y="3" width="7" height="7"/>
              <rect x="14" y="3" width="7" height="7"/>
              <rect x="14" y="14" width="7" height="7"/>
              <rect x="3" y="14" width="7" height="7"/>
            </svg>
            All Sizes
          </button>
        </div>

        <div class="download-info">
          <div class="estimated-size">
            Est. size: {{ estimatedFileSize }}
          </div>
          <div class="current-config">
            {{ currentWidth }}×{{ currentHeight }} {{ selectedFormat.toUpperCase() }}
          </div>
        </div>
      </div>

      <!-- Error Display -->
      <div v-if="error" class="error-message">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="12" cy="12" r="10"/>
          <line x1="15" y1="9" x2="9" y2="15"/>
          <line x1="9" y1="9" x2="15" y2="15"/>
        </svg>
        <span>{{ error }}</span>
        <button @click="clearError" class="close-error">×</button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch, nextTick } from 'vue';
import { getLogoUrl } from '../utils/logoApi.js';

export default {
  name: 'AdvancedDownloadModal',
  props: {
    logo: {
      type: Object,
      required: true
    },
    isOpen: {
      type: Boolean,
      default: false
    }
  },
  emits: ['close', 'download-started', 'download-completed'],
  setup(props, { emit }) {
    // Reactive state
    const selectedFormat = ref('svg');
    const selectedVariant = ref('original');
    const useCustomSize = ref(false);
    const customWidth = ref(256);
    const customHeight = ref(256);
    const maintainAspectRatio = ref(true);
    const quality = ref(0.9);
    const isGenerating = ref(false);
    const error = ref('');
    const originalAspectRatio = ref(1);

    // Configuration options
    const availableFormats = ['svg', 'png'];
    
    const availableVariants = [
      { key: 'original', label: 'Original', description: 'Original colors' },
      { key: 'white', label: 'White', description: 'For dark backgrounds' },
      { key: 'black', label: 'Black', description: 'For light backgrounds' },
      { key: 'optimized', label: 'Optimized', description: 'Smaller file size' }
    ];

    const presetSizes = {
      favicon: { label: 'Favicon', width: 16, height: 16 },
      small: { label: 'Small', width: 32, height: 32 },
      medium: { label: 'Medium', width: 64, height: 64 },
      large: { label: 'Large', width: 128, height: 128 },
      xlarge: { label: 'X-Large', width: 256, height: 256 },
      xxlarge: { label: 'XX-Large', width: 512, height: 512 }
    };

    const quickDownloadOptions = [
      {
        key: 'all-svg',
        title: 'All SVG Variants',
        description: 'Original, white, black variants as SVG'
      },
      {
        key: 'all-png-256',
        title: 'All PNG 256px',
        description: 'All variants as 256×256 PNG'
      },
      {
        key: 'common-sizes',
        title: 'Common Sizes',
        description: 'Favicon, small, medium, large PNG'
      },
      {
        key: 'web-package',
        title: 'Web Package',
        description: 'Optimized set for web development'
      }
    ];

    // Computed properties
    const currentWidth = computed(() => {
      return useCustomSize.value ? customWidth.value : 256;
    });

    const currentHeight = computed(() => {
      return useCustomSize.value ? customHeight.value : 256;
    });

    const currentPreviewUrl = computed(() => {
      return getLogoUrl(props.logo.slug, selectedVariant.value, selectedFormat.value);
    });

    const previewDimensions = computed(() => {
      return `${currentWidth.value} × ${currentHeight.value}px`;
    });

    const previewStyles = computed(() => ({
      maxWidth: '200px',
      maxHeight: '200px',
      width: 'auto',
      height: 'auto'
    }));

    const estimatedFileSize = computed(() => {
      if (selectedFormat.value === 'svg') {
        return '2-8 KB';
      }
      
      const pixels = currentWidth.value * currentHeight.value;
      const qualityFactor = quality.value;
      const estimatedBytes = pixels * 3 * qualityFactor; // Rough PNG estimation
      
      if (estimatedBytes < 1024) {
        return `${Math.round(estimatedBytes)} B`;
      } else if (estimatedBytes < 1024 * 1024) {
        return `${Math.round(estimatedBytes / 1024)} KB`;
      } else {
        return `${Math.round(estimatedBytes / (1024 * 1024) * 10) / 10} MB`;
      }
    });

    // Methods
    const closeModal = () => {
      emit('close');
    };

    const updatePreview = async () => {
      // Debounce preview updates
      clearTimeout(updatePreview.timeoutId);
      updatePreview.timeoutId = setTimeout(() => {
        // Preview update logic would go here
        // For now, just update the computed values
      }, 300);
    };

    const selectPresetSize = (preset) => {
      useCustomSize.value = false;
      customWidth.value = preset.width;
      customHeight.value = preset.height;
      updatePreview();
    };

    const isPresetActive = (preset) => {
      return !useCustomSize.value && 
             customWidth.value === preset.width && 
             customHeight.value === preset.height;
    };

    const toggleCustomSize = () => {
      if (!useCustomSize.value) {
        // Reset to a sensible default when disabling custom size
        selectPresetSize(presetSizes.large);
      }
    };

    const handleAspectRatioChange = () => {
      if (maintainAspectRatio.value && originalAspectRatio.value) {
        customHeight.value = Math.round(customWidth.value / originalAspectRatio.value);
        updatePreview();
      }
    };

    const getFormatDescription = (format) => {
      const descriptions = {
        svg: 'Vector format, scalable, small file size',
        png: 'Raster format, good for specific sizes'
      };
      return descriptions[format] || '';
    };

    const getVariantPreviewUrl = (variant) => {
      return getLogoUrl(props.logo.slug, variant, 'svg');
    };

    const generateDownloadUrl = async (options = {}) => {
      const params = {
        format: options.format || selectedFormat.value,
        variant: options.variant || selectedVariant.value,
        width: options.width || currentWidth.value,
        height: options.height || currentHeight.value,
        quality: options.quality || quality.value,
        ...options
      };

      // This would call the on-demand resizer service
      const queryParams = new URLSearchParams({
        slug: props.logo.slug,
        ...params
      });

      return `/api/generate-image?${queryParams.toString()}`;
    };

    const downloadCurrent = async () => {
      try {
        isGenerating.value = true;
        clearError();
        emit('download-started', { logo: props.logo, format: selectedFormat.value });

        const downloadUrl = await generateDownloadUrl();
        
        // Create download link
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `${props.logo.slug}-${selectedVariant.value}-${currentWidth.value}x${currentHeight.value}.${selectedFormat.value}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        emit('download-completed', { 
          logo: props.logo, 
          format: selectedFormat.value,
          size: `${currentWidth.value}x${currentHeight.value}`
        });

      } catch (err) {
        error.value = `Download failed: ${err.message}`;
      } finally {
        isGenerating.value = false;
      }
    };

    const copyToClipboard = async () => {
      try {
        if (selectedFormat.value === 'svg') {
          // For SVG, copy the raw SVG content
          const response = await fetch(currentPreviewUrl.value);
          const svgContent = await response.text();
          await navigator.clipboard.writeText(svgContent);
        } else {
          // For PNG, copy as image blob
          const downloadUrl = await generateDownloadUrl();
          const response = await fetch(downloadUrl);
          const blob = await response.blob();
          await navigator.clipboard.write([
            new ClipboardItem({ [blob.type]: blob })
          ]);
        }
        
        // Show success feedback
        const originalText = 'Copy to Clipboard';
        // Temporarily change button text or show toast
        
      } catch (err) {
        error.value = `Copy failed: ${err.message}`;
      }
    };

    const generateAllSizes = async () => {
      try {
        isGenerating.value = true;
        clearError();

        const sizes = Object.values(presetSizes);
        const downloadPromises = sizes.map(async (size) => {
          const downloadUrl = await generateDownloadUrl({
            width: size.width,
            height: size.height
          });
          
          const link = document.createElement('a');
          link.href = downloadUrl;
          link.download = `${props.logo.slug}-${selectedVariant.value}-${size.width}x${size.height}.${selectedFormat.value}`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          // Small delay between downloads
          await new Promise(resolve => setTimeout(resolve, 100));
        });

        await Promise.all(downloadPromises);
        
      } catch (err) {
        error.value = `Batch download failed: ${err.message}`;
      } finally {
        isGenerating.value = false;
      }
    };

    const downloadQuick = async (option) => {
      try {
        isGenerating.value = true;
        clearError();

        switch (option.key) {
          case 'all-svg':
            await downloadAllVariants('svg', 256);
            break;
          case 'all-png-256':
            await downloadAllVariants('png', 256);
            break;
          case 'common-sizes':
            await downloadCommonSizes();
            break;
          case 'web-package':
            await downloadWebPackage();
            break;
        }

      } catch (err) {
        error.value = `Quick download failed: ${err.message}`;
      } finally {
        isGenerating.value = false;
      }
    };

    const downloadAllVariants = async (format, size) => {
      const variants = ['original', 'white', 'black', 'optimized'];
      
      for (const variant of variants) {
        const downloadUrl = await generateDownloadUrl({
          format,
          variant,
          width: size,
          height: size
        });
        
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `${props.logo.slug}-${variant}-${size}x${size}.${format}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    };

    const downloadCommonSizes = async () => {
      const commonSizes = [16, 32, 64, 128];
      
      for (const size of commonSizes) {
        const downloadUrl = await generateDownloadUrl({
          format: 'png',
          variant: selectedVariant.value,
          width: size,
          height: size
        });
        
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `${props.logo.slug}-${selectedVariant.value}-${size}x${size}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    };

    const downloadWebPackage = async () => {
      const webAssets = [
        { format: 'svg', variant: 'original', size: null },
        { format: 'png', variant: 'original', size: 32 },
        { format: 'png', variant: 'original', size: 64 },
        { format: 'png', variant: 'original', size: 128 },
        { format: 'png', variant: 'original', size: 256 }
      ];
      
      for (const asset of webAssets) {
        const options = {
          format: asset.format,
          variant: asset.variant
        };
        
        if (asset.size) {
          options.width = asset.size;
          options.height = asset.size;
        }
        
        const downloadUrl = await generateDownloadUrl(options);
        const sizeSuffix = asset.size ? `-${asset.size}x${asset.size}` : '';
        
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `${props.logo.slug}-${asset.variant}${sizeSuffix}.${asset.format}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    };

    const clearError = () => {
      error.value = '';
    };

    // Watchers
    watch(() => customWidth.value, (newWidth) => {
      if (maintainAspectRatio.value && originalAspectRatio.value) {
        customHeight.value = Math.round(newWidth / originalAspectRatio.value);
      }
      updatePreview();
    });

    watch(() => customHeight.value, (newHeight) => {
      if (maintainAspectRatio.value && originalAspectRatio.value) {
        customWidth.value = Math.round(newHeight * originalAspectRatio.value);
      }
      updatePreview();
    });

    return {
      // State
      selectedFormat,
      selectedVariant,
      useCustomSize,
      customWidth,
      customHeight,
      maintainAspectRatio,
      quality,
      isGenerating,
      error,
      
      // Options
      availableFormats,
      availableVariants,
      presetSizes,
      quickDownloadOptions,
      
      // Computed
      currentWidth,
      currentHeight,
      currentPreviewUrl,
      previewDimensions,
      previewStyles,
      estimatedFileSize,
      
      // Methods
      closeModal,
      updatePreview,
      selectPresetSize,
      isPresetActive,
      toggleCustomSize,
      handleAspectRatioChange,
      getFormatDescription,
      getVariantPreviewUrl,
      downloadCurrent,
      copyToClipboard,
      generateAllSizes,
      downloadQuick,
      clearError
    };
  }
};
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.advanced-download-modal {
  background: white;
  border-radius: 12px;
  max-width: 800px;
  width: 90vw;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px;
  border-bottom: 1px solid #e5e7eb;
}

.modal-header h2 {
  font-size: 24px;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.close-button {
  background: none;
  border: none;
  padding: 8px;
  cursor: pointer;
  border-radius: 8px;
  color: #6b7280;
  transition: all 0.2s;
}

.close-button:hover {
  background: #f3f4f6;
  color: #374151;
}

.close-button svg {
  width: 20px;
  height: 20px;
}

.modal-body {
  padding: 24px;
}

.logo-preview-section {
  display: flex;
  gap: 24px;
  margin-bottom: 32px;
  padding: 24px;
  background: #f9fafb;
  border-radius: 12px;
  border: 2px dashed #d1d5db;
}

.current-preview {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 200px;
  height: 200px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.current-preview img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.preview-info {
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.preview-info h3 {
  font-size: 20px;
  font-weight: 600;
  color: #111827;
  margin: 0 0 8px 0;
}

.preview-dimensions {
  font-size: 16px;
  color: #6b7280;
  margin: 4px 0;
}

.preview-format {
  font-size: 14px;
  font-weight: 600;
  color: #059669;
  text-transform: uppercase;
  margin: 4px 0;
}

.download-configuration {
  display: grid;
  gap: 32px;
}

.config-section h3 {
  font-size: 18px;
  font-weight: 600;
  color: #111827;
  margin: 0 0 16px 0;
}

.format-options {
  display: grid;
  gap: 12px;
}

.format-option {
  display: flex;
  align-items: center;
  padding: 16px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.format-option:hover {
  border-color: #d1d5db;
  background: #f9fafb;
}

.format-option.active {
  border-color: #3b82f6;
  background: #eff6ff;
}

.format-option input {
  margin-right: 12px;
}

.format-info {
  display: flex;
  flex-direction: column;
}

.format-name {
  font-weight: 600;
  color: #111827;
}

.format-desc {
  font-size: 14px;
  color: #6b7280;
  margin-top: 2px;
}

.size-options {
  display: grid;
  gap: 20px;
}

.preset-sizes {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
}

.size-preset {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px;
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.size-preset:hover {
  border-color: #d1d5db;
  background: #f9fafb;
}

.size-preset.active {
  border-color: #3b82f6;
  background: #eff6ff;
}

.size-label {
  font-weight: 600;
  color: #111827;
  margin-bottom: 4px;
}

.size-dimensions {
  font-size: 14px;
  color: #6b7280;
}

.custom-size {
  border-top: 1px solid #e5e7eb;
  padding-top: 20px;
}

.custom-toggle {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
  cursor: pointer;
}

.custom-toggle input {
  margin-right: 8px;
}

.custom-inputs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  align-items: end;
}

.dimension-input {
  display: flex;
  flex-direction: column;
}

.dimension-input label {
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  margin-bottom: 4px;
}

.dimension-input input {
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 16px;
}

.unit {
  position: absolute;
  right: 12px;
  color: #6b7280;
  font-size: 14px;
  pointer-events: none;
}

.aspect-ratio-lock {
  display: flex;
  align-items: center;
  grid-column: 1 / -1;
  cursor: pointer;
}

.aspect-ratio-lock input {
  margin-right: 8px;
}

.aspect-ratio-lock svg {
  width: 16px;
  height: 16px;
  margin-right: 4px;
}

.variant-options {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.variant-option {
  display: flex;
  align-items: center;
  padding: 16px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.variant-option:hover {
  border-color: #d1d5db;
  background: #f9fafb;
}

.variant-option.active {
  border-color: #3b82f6;
  background: #eff6ff;
}

.variant-option input {
  margin-right: 12px;
}

.variant-preview {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  border-radius: 6px;
  margin-right: 12px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.variant-preview img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.variant-info {
  display: flex;
  flex-direction: column;
}

.variant-name {
  font-weight: 600;
  color: #111827;
}

.variant-desc {
  font-size: 14px;
  color: #6b7280;
  margin-top: 2px;
}

.quality-control {
  display: flex;
  align-items: center;
  gap: 16px;
}

.quality-slider {
  flex: 1;
  height: 6px;
  background: #e5e7eb;
  border-radius: 3px;
  outline: none;
  -webkit-appearance: none;
}

.quality-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 20px;
  height: 20px;
  background: #3b82f6;
  border-radius: 50%;
  cursor: pointer;
}

.quality-labels {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 100px;
}

.quality-labels span {
  font-weight: 600;
  color: #111827;
}

.quality-desc {
  font-size: 14px;
  color: #6b7280;
  margin-top: 2px;
}

.batch-download-section {
  margin-top: 32px;
  padding-top: 32px;
  border-top: 1px solid #e5e7eb;
}

.batch-download-section h3 {
  font-size: 18px;
  font-weight: 600;
  color: #111827;
  margin: 0 0 16px 0;
}

.quick-download-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
}

.quick-download-btn {
  display: flex;
  align-items: center;
  padding: 16px;
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.quick-download-btn:hover:not(:disabled) {
  border-color: #3b82f6;
  background: #eff6ff;
}

.quick-download-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.quick-icon {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f3f4f6;
  border-radius: 8px;
  margin-right: 12px;
}

.quick-icon svg {
  width: 20px;
  height: 20px;
  color: #6b7280;
}

.quick-info {
  display: flex;
  flex-direction: column;
  text-align: left;
}

.quick-title {
  font-weight: 600;
  color: #111827;
  margin-bottom: 2px;
}

.quick-desc {
  font-size: 14px;
  color: #6b7280;
}

.modal-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px;
  border-top: 1px solid #e5e7eb;
  background: #f9fafb;
}

.download-actions {
  display: flex;
  gap: 12px;
}

.download-btn,
.copy-btn,
.batch-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.primary {
  background: #3b82f6;
  color: white;
}

.primary:hover:not(:disabled) {
  background: #2563eb;
}

.secondary {
  background: white;
  color: #374151;
  border: 1px solid #d1d5db;
}

.secondary:hover:not(:disabled) {
  background: #f9fafb;
  border-color: #9ca3af;
}

.download-btn:disabled,
.copy-btn:disabled,
.batch-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.download-btn svg,
.copy-btn svg,
.batch-btn svg {
  width: 16px;
  height: 16px;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.download-info {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.estimated-size {
  font-size: 14px;
  color: #6b7280;
}

.current-config {
  font-size: 12px;
  color: #9ca3af;
  text-transform: uppercase;
  font-weight: 500;
}

.error-message {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  color: #dc2626;
  margin-top: 16px;
}

.error-message svg {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.close-error {
  background: none;
  border: none;
  color: #dc2626;
  cursor: pointer;
  font-size: 20px;
  padding: 4px;
  margin-left: auto;
}
</style>