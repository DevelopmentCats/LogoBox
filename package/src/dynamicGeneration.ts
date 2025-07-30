/**
 * LogoBox Dynamic Image Generation for NPM Package
 * Provides programmatic access to dynamic logo processing capabilities
 */

import type {
  LogoMetadata,
  LogoVariant,
  LogoFormatType,
  Catalog
} from './types';

/**
 * Dynamic generation options interface
 */
export interface DynamicGenerationOptions {
  /** Target width in pixels */
  width?: number;
  /** Target height in pixels */
  height?: number;
  /** Output format */
  format?: 'svg' | 'png' | 'jpeg';
  /** Logo variant */
  variant?: LogoVariant;
  /** Quality for raster formats (0.1 - 1.0) */
  quality?: number;
  /** Maintain aspect ratio */
  maintainAspectRatio?: boolean;
  /** Background color for raster formats */
  backgroundColor?: string;
  /** Cache the result */
  cache?: boolean;
  /** Base URL for API requests */
  baseUrl?: string;
}

/**
 * Generated image result interface
 */
export interface GeneratedImageResult {
  /** Success status */
  success: boolean;
  /** Generated image data URL or URL */
  url: string;
  /** Generated image metadata */
  metadata: {
    width: number;
    height: number;
    format: string;
    variant: string;
    fileSize?: number;
    cached?: boolean;
    processingTime?: number;
  };
  /** Error information if failed */
  error?: {
    message: string;
    code: string;
    details?: Record<string, unknown>;
  };
}

/**
 * Batch generation result interface
 */
export interface BatchGenerationResult {
  /** Success status */
  success: boolean;
  /** Generated images by configuration key */
  results: Record<string, GeneratedImageResult>;
  /** Error information for failed generations */
  errors: Record<string, { message: string; code: string }>;
  /** Summary statistics */
  summary: {
    total: number;
    successful: number;
    failed: number;
  };
}

/**
 * Standard dimension presets
 */
export const DIMENSION_PRESETS = {
  favicon: { width: 16, height: 16, label: 'Favicon' },
  small: { width: 32, height: 32, label: 'Small Icon' },
  medium: { width: 64, height: 64, label: 'Medium Icon' },
  large: { width: 128, height: 128, label: 'Large Icon' },
  xlarge: { width: 256, height: 256, label: 'Extra Large' },
  xxlarge: { width: 512, height: 512, label: 'Super Large' },
  xxxlarge: { width: 1024, height: 1024, label: 'Ultra Large' }
} as const;

/**
 * Error codes for dynamic generation
 */
export const GENERATION_ERROR_CODES = {
  LOGO_NOT_FOUND: 'LOGO_NOT_FOUND',
  INVALID_OPTIONS: 'INVALID_OPTIONS',
  GENERATION_FAILED: 'GENERATION_FAILED',
  NETWORK_ERROR: 'NETWORK_ERROR',
  UNSUPPORTED_FORMAT: 'UNSUPPORTED_FORMAT',
  INVALID_DIMENSIONS: 'INVALID_DIMENSIONS'
} as const;

/**
 * Dynamic Image Generator class
 */
export class DynamicImageGenerator {
  private baseUrl: string;
  private cache: Map<string, GeneratedImageResult>;
  private defaultOptions: Partial<DynamicGenerationOptions>;

  constructor(options: { baseUrl?: string; cache?: boolean } = {}) {
    this.baseUrl = options.baseUrl || process.env.LOGOBOX_API_BASE_URL || 'https://api.logobox.dev';
    this.cache = new Map();
    this.defaultOptions = {
      format: 'svg',
      variant: 'original',
      quality: 0.9,
      maintainAspectRatio: true,
      backgroundColor: 'transparent',
      cache: options.cache ?? true
    };
  }

  /**
   * Generate a single logo image
   * @param slug - Logo slug
   * @param options - Generation options
   * @returns Promise<GeneratedImageResult>
   */
  async generateImage(
    slug: string,
    options: DynamicGenerationOptions = {}
  ): Promise<GeneratedImageResult> {
    try {
      this.validateSlug(slug);
      this.validateOptions(options);

      const finalOptions = { ...this.defaultOptions, ...options };
      const cacheKey = this.createCacheKey(slug, finalOptions);

      // Check cache first
      if (finalOptions.cache && this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey)!;
        return {
          ...cached,
          metadata: { ...cached.metadata, cached: true }
        };
      }

      // Make API request
      const result = await this.makeApiRequest(slug, finalOptions);

      // Cache successful results
      if (result.success && finalOptions.cache) {
        this.cache.set(cacheKey, result);
      }

      return result;

    } catch (error) {
      return this.handleError(error, slug, options);
    }
  }

  /**
   * Generate multiple sizes for a logo
   * @param slug - Logo slug
   * @param dimensions - Array of dimensions or preset keys
   * @param baseOptions - Base generation options
   * @returns Promise<BatchGenerationResult>
   */
  async generateMultipleSizes(
    slug: string,
    dimensions: Array<{ width: number; height: number } | keyof typeof DIMENSION_PRESETS>,
    baseOptions: DynamicGenerationOptions = {}
  ): Promise<BatchGenerationResult> {
    const results: Record<string, GeneratedImageResult> = {};
    const errors: Record<string, { message: string; code: string }> = {};

    try {
      this.validateSlug(slug);

      const promises = dimensions.map(async (dimension) => {
        const sizeConfig = typeof dimension === 'string' 
          ? DIMENSION_PRESETS[dimension]
          : dimension;
        
        const sizeKey = typeof dimension === 'string' 
          ? dimension 
          : `${sizeConfig.width}x${sizeConfig.height}`;

        try {
          const options = {
            ...baseOptions,
            width: sizeConfig.width,
            height: sizeConfig.height
          };

          const result = await this.generateImage(slug, options);
          results[sizeKey] = result;
        } catch (error) {
          errors[sizeKey] = {
            message: error instanceof Error ? error.message : 'Unknown error',
            code: GENERATION_ERROR_CODES.GENERATION_FAILED
          };
        }
      });

      await Promise.all(promises);

      return {
        success: Object.keys(results).length > 0,
        results,
        errors,
        summary: {
          total: dimensions.length,
          successful: Object.keys(results).length,
          failed: Object.keys(errors).length
        }
      };

    } catch (error) {
      return {
        success: false,
        results: {},
        errors: { general: { 
          message: error instanceof Error ? error.message : 'Unknown error',
          code: GENERATION_ERROR_CODES.GENERATION_FAILED
        }},
        summary: { total: dimensions.length, successful: 0, failed: dimensions.length }
      };
    }
  }

  /**
   * Generate all variants (original, white, black, optimized) for a logo
   * @param slug - Logo slug
   * @param baseOptions - Base generation options
   * @returns Promise<BatchGenerationResult>
   */
  async generateAllVariants(
    slug: string,
    baseOptions: DynamicGenerationOptions = {}
  ): Promise<BatchGenerationResult> {
    const variants: LogoVariant[] = ['original', 'white', 'black', 'optimized'];
    const results: Record<string, GeneratedImageResult> = {};
    const errors: Record<string, { message: string; code: string }> = {};

    try {
      this.validateSlug(slug);

      const promises = variants.map(async (variant) => {
        try {
          const options = { ...baseOptions, variant };
          const result = await this.generateImage(slug, options);
          results[variant] = result;
        } catch (error) {
          errors[variant] = {
            message: error instanceof Error ? error.message : 'Unknown error',
            code: GENERATION_ERROR_CODES.GENERATION_FAILED
          };
        }
      });

      await Promise.all(promises);

      return {
        success: Object.keys(results).length > 0,
        results,
        errors,
        summary: {
          total: variants.length,
          successful: Object.keys(results).length,
          failed: Object.keys(errors).length
        }
      };

    } catch (error) {
      return {
        success: false,
        results: {},
        errors: { general: { 
          message: error instanceof Error ? error.message : 'Unknown error',
          code: GENERATION_ERROR_CODES.GENERATION_FAILED
        }},
        summary: { total: variants.length, successful: 0, failed: variants.length }
      };
    }
  }

  /**
   * Generate a complete logo package (all variants and common sizes)
   * @param slug - Logo slug
   * @param options - Package generation options
   * @returns Promise<BatchGenerationResult>
   */
  async generateLogoPackage(
    slug: string,
    options: {
      formats?: Array<'svg' | 'png'>;
      sizes?: Array<keyof typeof DIMENSION_PRESETS>;
      variants?: LogoVariant[];
      quality?: number;
    } = {}
  ): Promise<BatchGenerationResult> {
    const {
      formats = ['svg', 'png'],
      sizes = ['favicon', 'small', 'medium', 'large', 'xlarge'],
      variants = ['original', 'white', 'black'],
      quality = 0.9
    } = options;

    const results: Record<string, GeneratedImageResult> = {};
    const errors: Record<string, { message: string; code: string }> = {};

    try {
      this.validateSlug(slug);

      const combinations: Array<{
        key: string;
        options: DynamicGenerationOptions;
      }> = [];

      // Generate all combinations
      for (const format of formats) {
        for (const variant of variants) {
          if (format === 'svg') {
            // For SVG, generate without size constraints
            combinations.push({
              key: `${variant}.${format}`,
              options: { format, variant, quality }
            });
          } else {
            // For raster formats, generate all sizes
            for (const sizeKey of sizes) {
              const sizeConfig = DIMENSION_PRESETS[sizeKey];
              combinations.push({
                key: `${variant}-${sizeKey}.${format}`,
                options: {
                  format,
                  variant,
                  width: sizeConfig.width,
                  height: sizeConfig.height,
                  quality
                }
              });
            }
          }
        }
      }

      const promises = combinations.map(async ({ key, options }) => {
        try {
          const result = await this.generateImage(slug, options);
          results[key] = result;
        } catch (error) {
          errors[key] = {
            message: error instanceof Error ? error.message : 'Unknown error',
            code: GENERATION_ERROR_CODES.GENERATION_FAILED
          };
        }
      });

      await Promise.all(promises);

      return {
        success: Object.keys(results).length > 0,
        results,
        errors,
        summary: {
          total: combinations.length,
          successful: Object.keys(results).length,
          failed: Object.keys(errors).length
        }
      };

    } catch (error) {
      return {
        success: false,
        results: {},
        errors: { general: { 
          message: error instanceof Error ? error.message : 'Unknown error',
          code: GENERATION_ERROR_CODES.GENERATION_FAILED
        }},
        summary: { total: 0, successful: 0, failed: 1 }
      };
    }
  }

  /**
   * Get generation statistics
   * @returns Cache and usage statistics
   */
  getStats(): {
    cache: { size: number; keys: string[] };
    baseUrl: string;
    defaultOptions: Partial<DynamicGenerationOptions>;
  } {
    return {
      cache: {
        size: this.cache.size,
        keys: Array.from(this.cache.keys())
      },
      baseUrl: this.baseUrl,
      defaultOptions: { ...this.defaultOptions }
    };
  }

  /**
   * Clear generation cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Update default options
   * @param options - New default options
   */
  setDefaultOptions(options: Partial<DynamicGenerationOptions>): void {
    this.defaultOptions = { ...this.defaultOptions, ...options };
  }

  /**
   * Update base URL for API requests
   * @param baseUrl - New base URL
   */
  setBaseUrl(baseUrl: string): void {
    this.baseUrl = baseUrl;
    this.clearCache(); // Clear cache when base URL changes
  }

  /**
   * Estimate generation cost/time for a batch operation
   * @param combinations - Number of combinations to generate
   * @returns Estimated metrics
   */
  estimateBatchMetrics(combinations: number): {
    estimatedTime: string;
    estimatedCacheHits: number;
    estimatedApiCalls: number;
  } {
    const cached = Array.from(this.cache.keys()).length;
    const cacheHitRate = cached > 0 ? Math.min(0.7, cached / 100) : 0;
    
    const estimatedCacheHits = Math.floor(combinations * cacheHitRate);
    const estimatedApiCalls = combinations - estimatedCacheHits;
    const estimatedTimeMs = estimatedApiCalls * 150; // ~150ms per API call

    return {
      estimatedTime: estimatedTimeMs < 1000 
        ? `${estimatedTimeMs}ms`
        : `${Math.round(estimatedTimeMs / 1000 * 10) / 10}s`,
      estimatedCacheHits,
      estimatedApiCalls
    };
  }

  // Private methods

  private validateSlug(slug: string): void {
    if (!slug || typeof slug !== 'string' || slug.trim().length === 0) {
      throw new Error('Logo slug is required and must be a non-empty string');
    }
  }

  private validateOptions(options: DynamicGenerationOptions): void {
    if (options.width !== undefined) {
      if (!Number.isInteger(options.width) || options.width < 8 || options.width > 2048) {
        throw new Error('Width must be an integer between 8 and 2048');
      }
    }

    if (options.height !== undefined) {
      if (!Number.isInteger(options.height) || options.height < 8 || options.height > 2048) {
        throw new Error('Height must be an integer between 8 and 2048');
      }
    }

    if (options.quality !== undefined) {
      if (typeof options.quality !== 'number' || options.quality < 0.1 || options.quality > 1) {
        throw new Error('Quality must be a number between 0.1 and 1.0');
      }
    }

    if (options.format !== undefined) {
      const validFormats = ['svg', 'png', 'jpeg'];
      if (!validFormats.includes(options.format)) {
        throw new Error(`Format must be one of: ${validFormats.join(', ')}`);
      }
    }

    if (options.variant !== undefined) {
      const validVariants: LogoVariant[] = ['original', 'white', 'black', 'optimized'];
      if (!validVariants.includes(options.variant)) {
        throw new Error(`Variant must be one of: ${validVariants.join(', ')}`);
      }
    }
  }

  private createCacheKey(slug: string, options: DynamicGenerationOptions): string {
    const keyData = {
      slug,
      width: options.width,
      height: options.height,
      format: options.format,
      variant: options.variant,
      quality: options.quality,
      backgroundColor: options.backgroundColor
    };
    return JSON.stringify(keyData);
  }

  private async makeApiRequest(
    slug: string,
    options: DynamicGenerationOptions
  ): Promise<GeneratedImageResult> {
    const params = new URLSearchParams({
      slug,
      ...(options.width && { width: options.width.toString() }),
      ...(options.height && { height: options.height.toString() }),
      ...(options.format && { format: options.format }),
      ...(options.variant && { variant: options.variant }),
      ...(options.quality && { quality: options.quality.toString() }),
      ...(options.backgroundColor && { backgroundColor: options.backgroundColor }),
      ...(options.maintainAspectRatio !== undefined && { 
        maintainAspectRatio: options.maintainAspectRatio.toString() 
      })
    });

    const url = `${this.baseUrl}/api/generate-image?${params.toString()}`;
    const startTime = Date.now();

    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      const fileSize = parseInt(response.headers.get('content-length') || '0');
      
      // For API responses, we get the image URL or data URL
      let imageUrl: string;
      
      if (contentType?.includes('application/json')) {
        const data = await response.json();
        imageUrl = data.url || data.dataUrl;
      } else {
        // Direct image response - create object URL
        const blob = await response.blob();
        imageUrl = URL.createObjectURL(blob);
      }

      return {
        success: true,
        url: imageUrl,
        metadata: {
          width: options.width || 256,
          height: options.height || 256,
          format: options.format || 'svg',
          variant: options.variant || 'original',
          fileSize,
          cached: false,
          processingTime: Date.now() - startTime
        }
      };

    } catch (error) {
      throw new Error(`API request failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private handleError(
    error: unknown,
    slug: string,
    options: DynamicGenerationOptions
  ): GeneratedImageResult {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    let code: string = GENERATION_ERROR_CODES.GENERATION_FAILED;

    if (message.includes('not found')) {
      code = GENERATION_ERROR_CODES.LOGO_NOT_FOUND;
    } else if (message.includes('invalid') || message.includes('must be')) {
      code = GENERATION_ERROR_CODES.INVALID_OPTIONS;
    } else if (message.includes('network') || message.includes('fetch')) {
      code = GENERATION_ERROR_CODES.NETWORK_ERROR;
    }

    return {
      success: false,
      url: '',
      metadata: {
        width: options.width || 0,
        height: options.height || 0,
        format: options.format || 'unknown',
        variant: options.variant || 'original'
      },
      error: {
        message,
        code,
        details: { slug, options }
      }
    };
  }
}

// Convenience functions for common use cases

/**
 * Generate a favicon package for a logo
 * @param slug - Logo slug
 * @param generator - DynamicImageGenerator instance
 * @returns Promise<BatchGenerationResult>
 */
export async function generateFaviconPackage(
  slug: string,
  generator: DynamicImageGenerator
): Promise<BatchGenerationResult> {
  return generator.generateMultipleSizes(slug, [
    'favicon', // 16x16
    'small',   // 32x32
    { width: 48, height: 48 },   // Common favicon size
    'medium',  // 64x64
    { width: 96, height: 96 },   // High DPI favicon
    'large',   // 128x128
    { width: 192, height: 192 }, // Android Chrome
    'xlarge'   // 256x256 - Windows tiles
  ], { format: 'png', variant: 'original' });
}

/**
 * Generate a web development package for a logo
 * @param slug - Logo slug
 * @param generator - DynamicImageGenerator instance
 * @returns Promise<BatchGenerationResult>
 */
export async function generateWebPackage(
  slug: string,
  generator: DynamicImageGenerator
): Promise<BatchGenerationResult> {
  return generator.generateLogoPackage(slug, {
    formats: ['svg', 'png'],
    sizes: ['small', 'medium', 'large', 'xlarge'],
    variants: ['original', 'white', 'black'],
    quality: 0.9
  });
}

/**
 * Generate social media package for a logo
 * @param slug - Logo slug
 * @param generator - DynamicImageGenerator instance
 * @returns Promise<BatchGenerationResult>
 */
export async function generateSocialPackage(
  slug: string,
  generator: DynamicImageGenerator
): Promise<BatchGenerationResult> {
  const socialSizes = [
    { width: 400, height: 400 },   // Facebook profile
    { width: 1200, height: 630 },  // Facebook cover/OpenGraph
    { width: 1024, height: 512 },  // Twitter header
    { width: 500, height: 500 },   // Instagram profile
    { width: 1080, height: 1080 }, // Instagram post
    { width: 1200, height: 1200 }, // LinkedIn profile
    { width: 1584, height: 396 },  // LinkedIn cover
  ];

  return generator.generateMultipleSizes(slug, socialSizes, {
    format: 'png',
    variant: 'original',
    quality: 0.9
  });
}

export default DynamicImageGenerator;