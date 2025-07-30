/**
 * Browser-Side Image Processing Utilities
 * Handles client-side image processing using Canvas API and Web APIs
 */

/**
 * Custom error class for browser image processing
 */
export class BrowserImageError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.name = 'BrowserImageError';
    this.code = code;
    this.details = details;
  }
}

/**
 * Error codes for browser image operations
 */
export const BROWSER_ERROR_CODES = {
  INVALID_FILE: 'INVALID_FILE',
  UNSUPPORTED_FORMAT: 'UNSUPPORTED_FORMAT',
  CANVAS_NOT_SUPPORTED: 'CANVAS_NOT_SUPPORTED',
  PROCESSING_FAILED: 'PROCESSING_FAILED',
  INVALID_DIMENSIONS: 'INVALID_DIMENSIONS',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE'
};

/**
 * Supported formats and constraints
 */
export const SUPPORTED_INPUT_FORMATS = ['image/png', 'image/svg+xml', 'image/jpeg'];
export const SUPPORTED_OUTPUT_FORMATS = ['png', 'svg', 'jpeg'];
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const MAX_CANVAS_SIZE = 4096;

/**
 * Standard logo dimensions for quick selection
 */
export const PRESET_DIMENSIONS = {
  favicon: { width: 16, height: 16, label: 'Favicon (16×16)' },
  small: { width: 32, height: 32, label: 'Small Icon (32×32)' },
  medium: { width: 64, height: 64, label: 'Medium Icon (64×64)' },
  large: { width: 128, height: 128, label: 'Large Icon (128×128)' },
  xlarge: { width: 256, height: 256, label: 'Extra Large (256×256)' },
  xxlarge: { width: 512, height: 512, label: 'Super Large (512×512)' }
};

/**
 * Browser Image Processor class
 */
export class BrowserImageProcessor {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.supportedFeatures = this.detectFeatures();
  }

  /**
   * Detect browser feature support
   * @returns {Object} Supported features
   */
  detectFeatures() {
    const features = {
      canvas: false,
      fileAPI: false,
      svgSupport: false,
      webpSupport: false,
      offscreenCanvas: false
    };

    try {
      // Canvas support
      const canvas = document.createElement('canvas');
      features.canvas = !!(canvas.getContext && canvas.getContext('2d'));

      // File API support
      features.fileAPI = !!(window.File && window.FileReader && window.FileList && window.Blob);

      // SVG support
      features.svgSupport = !!(document.createElementNS && 
        document.createElementNS('http://www.w3.org/2000/svg', 'svg').createSVGRect);

      // WebP support (basic check)
      features.webpSupport = canvas.toDataURL('image/webp').indexOf('image/webp') === 5;

      // OffscreenCanvas support
      features.offscreenCanvas = typeof OffscreenCanvas !== 'undefined';

    } catch (error) {
      console.warn('Feature detection failed:', error);
    }

    return features;
  }

  /**
   * Process uploaded file and generate different formats/sizes
   * @param {File} file - Uploaded file
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} Processed image data
   */
  async processFile(file, options = {}) {
    try {
      this.validateFile(file);
      
      const {
        targetFormat = 'png',
        targetWidth,
        targetHeight,
        quality = 0.9,
        maintainAspectRatio = true,
        backgroundColor = 'transparent'
      } = options;

      // Read file as data URL
      const dataUrl = await this.readFileAsDataURL(file);
      const fileType = file.type;

      let processedData;

      if (fileType === 'image/svg+xml') {
        processedData = await this.processSVG(dataUrl, options);
      } else if (fileType.startsWith('image/')) {
        processedData = await this.processRasterImage(dataUrl, options);
      } else {
        throw new BrowserImageError(
          `Unsupported file type: ${fileType}`,
          BROWSER_ERROR_CODES.UNSUPPORTED_FORMAT,
          { fileType }
        );
      }

      return {
        success: true,
        original: {
          name: file.name,
          size: file.size,
          type: file.type,
          dataUrl
        },
        processed: processedData,
        metadata: {
          processedAt: new Date().toISOString(),
          options
        }
      };

    } catch (error) {
      return this.handleError(error, file, options);
    }
  }

  /**
   * Process SVG file
   * @param {string} dataUrl - SVG data URL
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} Processed SVG data
   */
  async processSVG(dataUrl, options) {
    const {
      targetFormat = 'svg',
      targetWidth,
      targetHeight,
      quality = 0.9,
      backgroundColor = 'transparent'
    } = options;

    if (targetFormat === 'svg') {
      // For SVG output, we can manipulate the SVG directly
      const svgContent = this.extractSVGFromDataURL(dataUrl);
      const modifiedSVG = this.modifySVGDimensions(svgContent, targetWidth, targetHeight);
      
      return {
        format: 'svg',
        dataUrl: `data:image/svg+xml;base64,${btoa(modifiedSVG)}`,
        width: targetWidth,
        height: targetHeight,
        size: modifiedSVG.length
      };
    }

    // Convert SVG to raster format
    return await this.convertSVGToRaster(dataUrl, options);
  }

  /**
   * Process raster image (PNG, JPEG)
   * @param {string} dataUrl - Image data URL
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} Processed image data
   */
  async processRasterImage(dataUrl, options) {
    const {
      targetFormat = 'png',
      targetWidth,
      targetHeight,
      quality = 0.9,
      maintainAspectRatio = true,
      backgroundColor = 'transparent'
    } = options;

    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        try {
          const result = this.resizeImage(img, {
            targetWidth,
            targetHeight,
            targetFormat,
            quality,
            maintainAspectRatio,
            backgroundColor
          });
          
          resolve(result);
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => {
        reject(new BrowserImageError(
          'Failed to load image',
          BROWSER_ERROR_CODES.PROCESSING_FAILED
        ));
      };

      img.src = dataUrl;
    });
  }

  /**
   * Convert SVG to raster format using canvas
   * @param {string} svgDataUrl - SVG data URL
   * @param {Object} options - Conversion options
   * @returns {Promise<Object>} Converted image data
   */
  async convertSVGToRaster(svgDataUrl, options) {
    const {
      targetFormat = 'png',
      targetWidth = 256,
      targetHeight = 256,
      quality = 0.9,
      backgroundColor = 'transparent'
    } = options;

    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        try {
          const canvas = this.createCanvas(targetWidth, targetHeight);
          const ctx = canvas.getContext('2d');

          // Set background if specified
          if (backgroundColor && backgroundColor !== 'transparent') {
            ctx.fillStyle = backgroundColor;
            ctx.fillRect(0, 0, targetWidth, targetHeight);
          }

          // Draw SVG to canvas
          ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

          // Convert to target format
          const mimeType = `image/${targetFormat}`;
          const dataUrl = canvas.toDataURL(mimeType, quality);

          resolve({
            format: targetFormat,
            dataUrl,
            width: targetWidth,
            height: targetHeight,
            size: this.estimateDataURLSize(dataUrl)
          });

        } catch (error) {
          reject(new BrowserImageError(
            `SVG conversion failed: ${error.message}`,
            BROWSER_ERROR_CODES.PROCESSING_FAILED,
            { originalError: error.message }
          ));
        }
      };

      img.onerror = () => {
        reject(new BrowserImageError(
          'Failed to load SVG for conversion',
          BROWSER_ERROR_CODES.PROCESSING_FAILED
        ));
      };

      img.src = svgDataUrl;
    });
  }

  /**
   * Resize image using canvas
   * @param {HTMLImageElement} img - Source image
   * @param {Object} options - Resize options
   * @returns {Object} Resized image data
   */
  resizeImage(img, options) {
    const {
      targetWidth,
      targetHeight,
      targetFormat = 'png',
      quality = 0.9,
      maintainAspectRatio = true,
      backgroundColor = 'transparent'
    } = options;

    // Calculate dimensions
    const dimensions = this.calculateDimensions(
      img.width,
      img.height,
      targetWidth,
      targetHeight,
      maintainAspectRatio
    );

    const canvas = this.createCanvas(dimensions.width, dimensions.height);
    const ctx = canvas.getContext('2d');

    // Set background if needed
    if (backgroundColor && backgroundColor !== 'transparent') {
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, dimensions.width, dimensions.height);
    }

    // Enable high-quality scaling
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Draw resized image
    ctx.drawImage(img, 0, 0, dimensions.width, dimensions.height);

    // Convert to target format
    const mimeType = `image/${targetFormat}`;
    const dataUrl = canvas.toDataURL(mimeType, quality);

    return {
      format: targetFormat,
      dataUrl,
      width: dimensions.width,
      height: dimensions.height,
      size: this.estimateDataURLSize(dataUrl)
    };
  }

  /**
   * Generate multiple sizes from a single image
   * @param {File} file - Source file
   * @param {Array} sizes - Array of size objects
   * @param {Object} baseOptions - Base processing options
   * @returns {Promise<Object>} Multiple processed sizes
   */
  async generateMultipleSizes(file, sizes = Object.values(PRESET_DIMENSIONS), baseOptions = {}) {
    try {
      const results = {};
      const errors = {};

      // Read file once
      const dataUrl = await this.readFileAsDataURL(file);
      
      // Process each size
      for (const sizeConfig of sizes) {
        const sizeName = sizeConfig.label || `${sizeConfig.width}x${sizeConfig.height}`;
        
        try {
          const options = {
            ...baseOptions,
            targetWidth: sizeConfig.width,
            targetHeight: sizeConfig.height
          };

          let processedData;
          if (file.type === 'image/svg+xml') {
            processedData = await this.processSVG(dataUrl, options);
          } else {
            processedData = await this.processRasterImage(dataUrl, options);
          }

          results[sizeName] = processedData;
        } catch (error) {
          errors[sizeName] = {
            error: error.message,
            code: error.code
          };
        }
      }

      return {
        success: Object.keys(results).length > 0,
        original: {
          name: file.name,
          size: file.size,
          type: file.type
        },
        results,
        errors: Object.keys(errors).length > 0 ? errors : undefined
      };

    } catch (error) {
      return this.handleError(error, file, { sizes, baseOptions });
    }
  }

  /**
   * Create optimized download package
   * @param {File} file - Source file
   * @param {Object} options - Package options
   * @returns {Promise<Object>} Download package data
   */
  async createDownloadPackage(file, options = {}) {
    const {
      includeSizes = Object.keys(PRESET_DIMENSIONS),
      includeFormats = ['png', 'svg'],
      quality = 0.9
    } = options;

    const packageData = {
      original: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
      files: {},
      metadata: {
        createdAt: new Date().toISOString(),
        sourceFile: {
          name: file.name,
          size: file.size,
          type: file.type
        }
      }
    };

    try {
      // Generate all requested combinations
      for (const format of includeFormats) {
        packageData.files[format] = {};
        
        for (const sizeKey of includeSizes) {
          const sizeConfig = PRESET_DIMENSIONS[sizeKey];
          if (!sizeConfig) continue;

          const processed = await this.processFile(file, {
            targetFormat: format,
            targetWidth: sizeConfig.width,
            targetHeight: sizeConfig.height,
            quality
          });

          if (processed.success) {
            const filename = `${packageData.original}-${sizeKey}.${format}`;
            packageData.files[format][sizeKey] = {
              filename,
              dataUrl: processed.processed.dataUrl,
              size: processed.processed.size,
              dimensions: {
                width: processed.processed.width,
                height: processed.processed.height
              }
            };
          }
        }
      }

      return {
        success: true,
        package: packageData
      };

    } catch (error) {
      return this.handleError(error, file, options);
    }
  }

  /**
   * Validate uploaded file
   * @param {File} file - File to validate
   */
  validateFile(file) {
    if (!file) {
      throw new BrowserImageError(
        'No file provided',
        BROWSER_ERROR_CODES.INVALID_FILE
      );
    }

    if (!SUPPORTED_INPUT_FORMATS.includes(file.type)) {
      throw new BrowserImageError(
        `Unsupported file type: ${file.type}`,
        BROWSER_ERROR_CODES.UNSUPPORTED_FORMAT,
        { fileType: file.type, supportedTypes: SUPPORTED_INPUT_FORMATS }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new BrowserImageError(
        `File too large: ${file.size} bytes (max: ${MAX_FILE_SIZE} bytes)`,
        BROWSER_ERROR_CODES.FILE_TOO_LARGE,
        { fileSize: file.size, maxSize: MAX_FILE_SIZE }
      );
    }

    if (!this.supportedFeatures.canvas) {
      throw new BrowserImageError(
        'Canvas API not supported in this browser',
        BROWSER_ERROR_CODES.CANVAS_NOT_SUPPORTED
      );
    }

    if (!this.supportedFeatures.fileAPI) {
      throw new BrowserImageError(
        'File API not supported in this browser',
        BROWSER_ERROR_CODES.CANVAS_NOT_SUPPORTED
      );
    }
  }

  /**
   * Read file as data URL
   * @param {File} file - File to read
   * @returns {Promise<string>} Data URL
   */
  readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = () => reject(new BrowserImageError(
        'Failed to read file',
        BROWSER_ERROR_CODES.PROCESSING_FAILED
      ));
      
      reader.readAsDataURL(file);
    });
  }

  /**
   * Create canvas element with specified dimensions
   * @param {number} width - Canvas width
   * @param {number} height - Canvas height
   * @returns {HTMLCanvasElement} Canvas element
   */
  createCanvas(width, height) {
    if (width > MAX_CANVAS_SIZE || height > MAX_CANVAS_SIZE) {
      throw new BrowserImageError(
        `Canvas dimensions too large: ${width}x${height} (max: ${MAX_CANVAS_SIZE})`,
        BROWSER_ERROR_CODES.INVALID_DIMENSIONS,
        { width, height, maxSize: MAX_CANVAS_SIZE }
      );
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }

  /**
   * Calculate optimal dimensions for resizing
   * @param {number} sourceWidth - Source width
   * @param {number} sourceHeight - Source height
   * @param {number} targetWidth - Target width
   * @param {number} targetHeight - Target height
   * @param {boolean} maintainAspectRatio - Whether to maintain aspect ratio
   * @returns {Object} Calculated dimensions
   */
  calculateDimensions(sourceWidth, sourceHeight, targetWidth, targetHeight, maintainAspectRatio = true) {
    if (!maintainAspectRatio && targetWidth && targetHeight) {
      return { width: targetWidth, height: targetHeight };
    }

    const sourceRatio = sourceWidth / sourceHeight;

    if (targetWidth && targetHeight) {
      const targetRatio = targetWidth / targetHeight;
      
      if (sourceRatio > targetRatio) {
        return { width: targetWidth, height: Math.round(targetWidth / sourceRatio) };
      } else {
        return { width: Math.round(targetHeight * sourceRatio), height: targetHeight };
      }
    }

    if (targetWidth) {
      return { width: targetWidth, height: Math.round(targetWidth / sourceRatio) };
    }

    if (targetHeight) {
      return { width: Math.round(targetHeight * sourceRatio), height: targetHeight };
    }

    return { width: sourceWidth, height: sourceHeight };
  }

  /**
   * Extract SVG content from data URL
   * @param {string} dataUrl - SVG data URL
   * @returns {string} SVG content
   */
  extractSVGFromDataURL(dataUrl) {
    const base64Data = dataUrl.split(',')[1];
    return atob(base64Data);
  }

  /**
   * Modify SVG dimensions
   * @param {string} svgContent - SVG content
   * @param {number} width - Target width
   * @param {number} height - Target height
   * @returns {string} Modified SVG content
   */
  modifySVGDimensions(svgContent, width, height) {
    let modified = svgContent;
    
    if (width) {
      modified = modified.replace(/width=["'][^"']*["']/, `width="${width}"`);
      if (!modified.includes('width=')) {
        modified = modified.replace('<svg', `<svg width="${width}"`);
      }
    }
    
    if (height) {
      modified = modified.replace(/height=["'][^"']*["']/, `height="${height}"`);
      if (!modified.includes('height=')) {
        modified = modified.replace('<svg', `<svg height="${height}"`);
      }
    }
    
    return modified;
  }

  /**
   * Estimate data URL size in bytes
   * @param {string} dataUrl - Data URL
   * @returns {number} Estimated size in bytes
   */
  estimateDataURLSize(dataUrl) {
    // Remove data URL prefix and calculate base64 size
    const base64Data = dataUrl.split(',')[1];
    return Math.round(base64Data.length * 0.75); // Base64 is ~33% larger than binary
  }

  /**
   * Handle errors and format error response
   * @param {Error} error - Original error
   * @param {File} file - Source file
   * @param {Object} options - Processing options
   * @returns {Object} Error response
   */
  handleError(error, file, options) {
    let code = BROWSER_ERROR_CODES.PROCESSING_FAILED;
    
    if (error instanceof BrowserImageError) {
      code = error.code;
    }

    return {
      success: false,
      error: {
        message: error.message,
        code,
        details: error.details || {}
      },
      request: {
        fileName: file?.name,
        fileSize: file?.size,
        fileType: file?.type,
        options
      }
    };
  }

  /**
   * Get browser capabilities report
   * @returns {Object} Capabilities report
   */
  getCapabilities() {
    return {
      features: this.supportedFeatures,
      limits: {
        maxFileSize: MAX_FILE_SIZE,
        maxCanvasSize: MAX_CANVAS_SIZE
      },
      supportedFormats: {
        input: SUPPORTED_INPUT_FORMATS,
        output: SUPPORTED_OUTPUT_FORMATS
      },
      presetDimensions: PRESET_DIMENSIONS
    };
  }
}

// Export singleton instance
export const browserImageProcessor = new BrowserImageProcessor();
export default browserImageProcessor;