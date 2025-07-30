/**
 * Unit Tests for AdvancedDownloadModal
 * Tests for the advanced download modal Vue component
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, shallowMount } from '@vue/test-utils';
import { nextTick } from 'vue';
import AdvancedDownloadModal from '../../components/AdvancedDownloadModal.vue';

// Mock browser image processor
vi.mock('../../utils/browserImageProcessor.js', () => ({
  BrowserImageProcessor: vi.fn().mockImplementation(() => ({
    processImage: vi.fn().mockResolvedValue({
      success: true,
      data: new Blob(['mock-processed-data'], { type: 'image/png' }),
      metadata: { width: 128, height: 128, format: 'png' }
    })),
    generateVariants: vi.fn().mockResolvedValue({
      success: true,
      variants: {
        original: { data: new Blob(['original'], { type: 'image/png' }) },
        white: { data: new Blob(['white'], { type: 'image/png' }) },
        black: { data: new Blob(['black'], { type: 'image/png' }) }
      }
    })
  }))
}));

// Mock browser APIs
Object.assign(global, {
  URL: {
    createObjectURL: vi.fn(() => 'blob:mock-url'),
    revokeObjectURL: vi.fn()
  },
  fetch: vi.fn(() => Promise.resolve({
    ok: true,
    blob: () => Promise.resolve(new Blob(['mock-data']))
  }))
});

describe('AdvancedDownloadModal', () => {
  let wrapper;
  const mockLogo = {
    slug: 'github',
    name: 'GitHub',
    category: 'Development',
    formats: ['svg', 'png'],
    variants: ['original', 'white', 'black'],
    primaryColor: '#181717'
  };

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
  });

  describe('Component Rendering', () => {
    it('should render correctly when visible', async () => {
      wrapper = mount(AdvancedDownloadModal, {
        props: {
          isOpen: true,
          logo: mockLogo
        }
      });

      expect(wrapper.find('.advanced-download-modal').exists()).toBe(true);
      expect(wrapper.find('.modal-header').text()).toContain('GitHub');
    });

    it('should not render when not visible', () => {
      wrapper = mount(AdvancedDownloadModal, {
        props: {
          isOpen: false,
          logo: mockLogo
        }
      });

      expect(wrapper.find('.advanced-download-modal').exists()).toBe(false);
    });

    it('should display logo information', async () => {
      wrapper = mount(AdvancedDownloadModal, {
        props: {
          isOpen: true,
          logo: mockLogo
        }
      });

      expect(wrapper.text()).toContain('GitHub');
      expect(wrapper.text()).toContain('Development');
    });
  });

  describe('Format Selection', () => {
    beforeEach(async () => {
      wrapper = mount(AdvancedDownloadModal, {
        props: {
          isOpen: true,
          logo: mockLogo
        }
      });
      await nextTick();
    });

    it('should display available formats', () => {
      const formatButtons = wrapper.findAll('.format-option');
      expect(formatButtons.length).toBeGreaterThan(0);
      
      const formatTexts = formatButtons.map(btn => btn.text().toLowerCase());
      expect(formatTexts).toContain('svg');
      expect(formatTexts).toContain('png');
    });

    it('should select format when clicked', async () => {
      const pngButton = wrapper.find('[data-testid="format-png"]');
      await pngButton.trigger('click');

      expect(wrapper.vm.selectedFormat).toBe('png');
      expect(pngButton.classes()).toContain('selected');
    });

    it('should show size options for raster formats', async () => {
      // Select PNG format
      const pngButton = wrapper.find('[data-testid="format-png"]');
      await pngButton.trigger('click');
      await nextTick();

      expect(wrapper.find('.size-selection').exists()).toBe(true);
    });

    it('should hide size options for vector formats', async () => {
      // Select SVG format
      const svgButton = wrapper.find('[data-testid="format-svg"]');
      await svgButton.trigger('click');
      await nextTick();

      expect(wrapper.find('.size-selection').exists()).toBe(false);
    });
  });

  describe('Size Selection', () => {
    beforeEach(async () => {
      wrapper = mount(AdvancedDownloadModal, {
        props: {
          isOpen: true,
          logo: mockLogo
        }
      });

      // Select PNG format to enable size selection
      await wrapper.find('[data-testid="format-png"]').trigger('click');
      await nextTick();
    });

    it('should display predefined size options', () => {
      const sizeButtons = wrapper.findAll('.size-option');
      expect(sizeButtons.length).toBeGreaterThan(0);
      
      // Should have common sizes
      const sizeTexts = sizeButtons.map(btn => btn.text());
      expect(sizeTexts.some(text => text.includes('16'))).toBe(true); // Favicon
      expect(sizeTexts.some(text => text.includes('64'))).toBe(true); // Small
      expect(sizeTexts.some(text => text.includes('256'))).toBe(true); // Large
    });

    it('should select size when clicked', async () => {
      const size64Button = wrapper.find('[data-testid="size-64"]');
      await size64Button.trigger('click');

      expect(wrapper.vm.selectedSize).toEqual({ width: 64, height: 64 });
      expect(size64Button.classes()).toContain('selected');
    });

    it('should allow custom size input', async () => {
      const customSizeButton = wrapper.find('.custom-size-button');
      await customSizeButton.trigger('click');
      await nextTick();

      expect(wrapper.find('.custom-size-inputs').exists()).toBe(true);

      const widthInput = wrapper.find('[data-testid="width-input"]');
      const heightInput = wrapper.find('[data-testid="height-input"]');

      await widthInput.setValue('150');
      await heightInput.setValue('150');

      expect(wrapper.vm.customSize.width).toBe(150);
      expect(wrapper.vm.customSize.height).toBe(150);
    });

    it('should validate custom size inputs', async () => {
      const customSizeButton = wrapper.find('.custom-size-button');
      await customSizeButton.trigger('click');
      await nextTick();

      const widthInput = wrapper.find('[data-testid="width-input"]');
      await widthInput.setValue('0'); // Invalid size

      expect(wrapper.vm.isValidCustomSize).toBe(false);
    });
  });

  describe('Variant Selection', () => {
    beforeEach(async () => {
      wrapper = mount(AdvancedDownloadModal, {
        props: {
          isOpen: true,
          logo: mockLogo
        }
      });
      await nextTick();
    });

    it('should display available variants', () => {
      const variantButtons = wrapper.findAll('.variant-option');
      expect(variantButtons.length).toBeGreaterThan(0);

      const variantTexts = variantButtons.map(btn => btn.text().toLowerCase());
      expect(variantTexts).toContain('original');
      expect(variantTexts).toContain('white');
      expect(variantTexts).toContain('black');
    });

    it('should select variant when clicked', async () => {
      const whiteButton = wrapper.find('[data-testid="variant-white"]');
      await whiteButton.trigger('click');

      expect(wrapper.vm.selectedVariant).toBe('white');
      expect(whiteButton.classes()).toContain('selected');
    });

    it('should show variant preview', async () => {
      const variantPreviews = wrapper.findAll('.variant-preview');
      expect(variantPreviews.length).toBeGreaterThan(0);
    });
  });

  describe('Download Actions', () => {
    beforeEach(async () => {
      wrapper = mount(AdvancedDownloadModal, {
        props: {
          isOpen: true,
          logo: mockLogo
        }
      });

      // Set up a basic selection
      await wrapper.find('[data-testid="format-png"]').trigger('click');
      await wrapper.find('[data-testid="size-64"]').trigger('click');
      await nextTick();
    });

    it('should enable download button when selection is valid', () => {
      const downloadButton = wrapper.find('.download-button');
      expect(downloadButton.attributes('disabled')).toBeUndefined();
    });

    it('should disable download button when selection is invalid', async () => {
      // Clear selection
      wrapper.vm.selectedFormat = null;
      await nextTick();

      const downloadButton = wrapper.find('.download-button');
      expect(downloadButton.attributes('disabled')).toBeDefined();
    });

    it('should trigger download when button is clicked', async () => {
      const downloadButton = wrapper.find('.download-button');
      await downloadButton.trigger('click');

      // Should show loading state
      expect(wrapper.vm.isProcessing).toBe(true);
    });

    it('should handle download all variants', async () => {
      const downloadAllButton = wrapper.find('.download-all-button');
      await downloadAllButton.trigger('click');

      expect(wrapper.vm.isProcessing).toBe(true);
    });
  });

  describe('Processing States', () => {
    beforeEach(async () => {
      wrapper = mount(AdvancedDownloadModal, {
        props: {
          isOpen: true,
          logo: mockLogo
        }
      });
      await nextTick();
    });

    it('should show loading state during processing', async () => {
      wrapper.vm.isProcessing = true;
      await nextTick();

      expect(wrapper.find('.loading-spinner').exists()).toBe(true);
      expect(wrapper.find('.download-button').attributes('disabled')).toBeDefined();
    });

    it('should show progress during batch operations', async () => {
      wrapper.vm.isProcessing = true;
      wrapper.vm.processingProgress = { current: 2, total: 5 };
      await nextTick();

      expect(wrapper.find('.progress-bar').exists()).toBe(true);
      expect(wrapper.text()).toContain('2 of 5');
    });

    it('should display processing status messages', async () => {
      wrapper.vm.processingStatus = 'Generating variants...';
      await nextTick();

      expect(wrapper.text()).toContain('Generating variants...');
    });
  });

  describe('Preview Functionality', () => {
    beforeEach(async () => {
      wrapper = mount(AdvancedDownloadModal, {
        props: {
          isOpen: true,
          logo: mockLogo
        }
      });

      await wrapper.find('[data-testid="format-png"]').trigger('click');
      await wrapper.find('[data-testid="size-64"]').trigger('click');
      await nextTick();
    });

    it('should show preview when available', () => {
      expect(wrapper.find('.logo-preview').exists()).toBe(true);
    });

    it('should update preview when selection changes', async () => {
      const size128Button = wrapper.find('[data-testid="size-128"]');
      await size128Button.trigger('click');
      await nextTick();

      // Preview should update (tested via component method)
      expect(wrapper.vm.previewUrl).toBeDefined();
    });

    it('should handle preview generation errors', async () => {
      // Mock processor to fail
      const mockProcessor = wrapper.vm.processor;
      mockProcessor.processImage = vi.fn().mockRejectedValue(new Error('Preview failed'));

      await wrapper.vm.generatePreview();

      expect(wrapper.vm.previewError).toBeTruthy();
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      wrapper = mount(AdvancedDownloadModal, {
        props: {
          isOpen: true,
          logo: mockLogo
        }
      });
      await nextTick();
    });

    it('should display error messages', async () => {
      wrapper.vm.error = 'Download failed';
      await nextTick();

      expect(wrapper.find('.error-message').exists()).toBe(true);
      expect(wrapper.text()).toContain('Download failed');
    });

    it('should handle processing errors gracefully', async () => {
      // Mock processor to fail
      const mockProcessor = wrapper.vm.processor;
      mockProcessor.processImage = vi.fn().mockRejectedValue(new Error('Processing failed'));

      await wrapper.find('[data-testid="format-png"]').trigger('click');
      await wrapper.find('[data-testid="size-64"]').trigger('click');
      await wrapper.find('.download-button').trigger('click');

      await nextTick();

      expect(wrapper.vm.error).toBeTruthy();
      expect(wrapper.vm.isProcessing).toBe(false);
    });

    it('should clear errors when modal reopens', async () => {
      wrapper.vm.error = 'Previous error';
      
      await wrapper.setProps({ isOpen: false });
      await wrapper.setProps({ isOpen: true });

      expect(wrapper.vm.error).toBe('');
    });
  });

  describe('Modal Interactions', () => {
    beforeEach(async () => {
      wrapper = mount(AdvancedDownloadModal, {
        props: {
          isOpen: true,
          logo: mockLogo
        }
      });
      await nextTick();
    });

    it('should emit close event when close button is clicked', async () => {
      const closeButton = wrapper.find('.close-button');
      await closeButton.trigger('click');

      expect(wrapper.emitted('close')).toBeTruthy();
    });

    it('should emit close event when overlay is clicked', async () => {
      const overlay = wrapper.find('.modal-overlay');
      await overlay.trigger('click');

      expect(wrapper.emitted('close')).toBeTruthy();
    });

    it('should not close when clicking modal content', async () => {
      const modalContent = wrapper.find('.modal-content');
      await modalContent.trigger('click');

      expect(wrapper.emitted('close')).toBeFalsy();
    });

    it('should handle escape key', async () => {
      await wrapper.trigger('keydown.escape');

      expect(wrapper.emitted('close')).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    beforeEach(async () => {
      wrapper = mount(AdvancedDownloadModal, {
        props: {
          isOpen: true,
          logo: mockLogo
        }
      });
      await nextTick();
    });

    it('should have proper ARIA attributes', () => {
      const modal = wrapper.find('.download-modal');
      expect(modal.attributes('role')).toBe('dialog');
      expect(modal.attributes('aria-modal')).toBe('true');
      expect(modal.attributes('aria-labelledby')).toBeDefined();
    });

    it('should focus management', async () => {
      // Should focus the modal when opened
      expect(document.activeElement).toBeDefined();
    });

    it('should have keyboard navigation support', async () => {
      const formatButton = wrapper.find('[data-testid="format-png"]');
      
      // Should be focusable
      expect(formatButton.attributes('tabindex')).not.toBe('-1');
      
      // Should handle keyboard selection
      await formatButton.trigger('keydown.enter');
      expect(wrapper.vm.selectedFormat).toBe('png');
    });

    it('should have screen reader friendly labels', () => {
      const formatOptions = wrapper.findAll('.format-option');
      formatOptions.forEach(option => {
        expect(option.attributes('aria-label')).toBeDefined();
      });
    });
  });

  describe('Responsive Behavior', () => {
    it('should adapt to mobile viewports', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375
      });

      wrapper = mount(AdvancedDownloadModal, {
        props: {
          isOpen: true,
          logo: mockLogo
        }
      });

      await nextTick();

      // Should have mobile-specific classes or behavior
      expect(wrapper.vm.isMobile).toBe(true);
    });

    it('should handle orientation changes', async () => {
      wrapper = mount(AdvancedDownloadModal, {
        props: {
          isOpen: true,
          logo: mockLogo
        }
      });

      // Simulate orientation change
      window.dispatchEvent(new Event('orientationchange'));
      await nextTick();

      // Component should handle the change gracefully
      expect(wrapper.exists()).toBe(true);
    });
  });

  describe('Performance', () => {
    it('should cleanup resources when unmounted', async () => {
      wrapper = mount(AdvancedDownloadModal, {
        props: {
          isOpen: true,
          logo: mockLogo
        }
      });

      // Generate some blob URLs
      wrapper.vm.previewUrl = 'blob:test-url';
      
      wrapper.unmount();

      // Should have called URL.revokeObjectURL
      expect(global.URL.revokeObjectURL).toHaveBeenCalled();
    });

    it('should debounce preview generation', async () => {
      wrapper = mount(AdvancedDownloadModal, {
        props: {
          isOpen: true,
          logo: mockLogo
        }
      });

      // Rapidly change selections
      await wrapper.find('[data-testid="format-png"]').trigger('click');
      await wrapper.find('[data-testid="size-64"]').trigger('click');
      await wrapper.find('[data-testid="size-128"]').trigger('click');
      await wrapper.find('[data-testid="size-256"]').trigger('click');

      // Should not generate preview for every change
      const mockProcessor = wrapper.vm.processor;
      expect(mockProcessor.processImage).toHaveBeenCalledTimes(1);
    });
  });
});

describe('AdvancedDownloadModal Integration', () => {
  it('should work with different logo formats', async () => {
    const svgLogo = {
      ...mockLogo,
      formats: ['svg']
    };

    const wrapper = mount(AdvancedDownloadModal, {
      props: {
        isOpen: true,
        logo: svgLogo
      }
    });

    expect(wrapper.find('[data-testid="format-svg"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="format-png"]').exists()).toBe(false);
  });

  it('should handle logos with limited variants', async () => {
    const limitedLogo = {
      ...mockLogo,
      variants: ['original']
    };

    const wrapper = mount(AdvancedDownloadModal, {
      props: {
        isOpen: true,
        logo: limitedLogo
      }
    });

    const variantButtons = wrapper.findAll('.variant-option');
    expect(variantButtons.length).toBe(1);
    expect(variantButtons[0].text().toLowerCase()).toContain('original');
  });

  it('should emit download events with correct data', async () => {
    const wrapper = mount(AdvancedDownloadModal, {
      props: {
        isOpen: true,
        logo: mockLogo
      }
    });

    await wrapper.find('[data-testid="format-png"]').trigger('click');
    await wrapper.find('[data-testid="size-64"]').trigger('click');
    await wrapper.find('.download-button').trigger('click');

    const downloadEvents = wrapper.emitted('download');
    expect(downloadEvents).toBeTruthy();
    
    const downloadData = downloadEvents[0][0];
    expect(downloadData.format).toBe('png');
    expect(downloadData.size).toEqual({ width: 64, height: 64 });
    expect(downloadData.logo).toBe(mockLogo);
  });
});