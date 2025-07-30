/**
 * LogoBox Download Utilities
 * Functions for downloading logos in different formats and variants
 */

import type {
  LogoMetadata,
  LogoVariant,
  LogoFormatType,
  PngSize
} from './types';

import { getLogoUrl } from './logoRetrieval';

/**
 * Download options interface
 */
export interface DownloadOptions {
  /** Logo variant to download */
  variant?: LogoVariant;
  /** File format to download */
  format?: LogoFormatType;
  /** PNG size (only applicable for PNG format) */
  pngSize?: PngSize;
  /** Custom filename (without extension) */
  filename?: string;
  /** Whether to trigger automatic download */
  autoDownload?: boolean;
}

/**
 * Download result interface
 */
export interface DownloadResult {
  /** Generated download URL */
  url: string;
  /** Generated filename */
  filename: string;
  /** File format */
  format: LogoFormatType;
  /** Logo variant */
  variant: LogoVariant;
  /** MIME type */
  mimeType: string;
  /** Logo metadata */
  logo: LogoMetadata;
}

/**
 * Error codes for download operations
 */
export const DOWNLOAD_ERROR_CODES = {
  INVALID_LOGO: 'INVALID_LOGO',
  INVALID_VARIANT: 'INVALID_VARIANT',
  INVALID_FORMAT: 'INVALID_FORMAT',
  INVALID_PNG_SIZE: 'INVALID_PNG_SIZE',
  DOWNLOAD_FAILED: 'DOWNLOAD_FAILED',
  NETWORK_ERROR: 'NETWORK_ERROR',
  BROWSER_NOT_SUPPORTED: 'BROWSER_NOT_SUPPORTED'
} as const;

/**
 * Download error class
 */
export class DownloadError extends Error {
  public readonly code: string;
  public readonly details?: Record<string, unknown>;

  constructor(message: string, code: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'DownloadError';
    this.code = code;
    this.details = details;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, DownloadError);
    }
  }
}

/**
 * MIME type mapping for different formats
 */
const MIME_TYPES: Record<LogoFormatType, string> = {
  svg: 'image/svg+xml',
  png: 'image/png'
};

/**
 * Validate download options
 */
function validateDownloadOptions(logo: LogoMetadata, options: DownloadOptions): void {
  if (!logo || typeof logo !== 'object') {
    throw new DownloadError(
      'Invalid logo object provided',
      DOWNLOAD_ERROR_CODES.INVALID_LOGO,
      { logo }
    );
  }

  if (!logo.slug || typeof logo.slug !== 'string') {
    throw new DownloadError(
      'Logo must have a valid slug',
      DOWNLOAD_ERROR_CODES.INVALID_LOGO,
      { logo: logo.slug }
    );
  }

  const { variant = 'original', format = 'svg', pngSize } = options;

  // Validate variant
  const validVariants: LogoVariant[] = ['original', 'white', 'black', 'optimized'];
  if (!validVariants.includes(variant)) {
    throw new DownloadError(
      `Invalid variant: ${variant}. Must be one of: ${validVariants.join(', ')}`,
      DOWNLOAD_ERROR_CODES.INVALID_VARIANT,
      { variant, validVariants }
    );
  }

  // Validate format
  const validFormats: LogoFormatType[] = ['svg', 'png'];
  if (!validFormats.includes(format)) {
    throw new DownloadError(
      `Invalid format: ${format}. Must be one of: ${validFormats.join(', ')}`,
      DOWNLOAD_ERROR_CODES.INVALID_FORMAT,
      { format, validFormats }
    );
  }

  // Validate PNG size if format is PNG
  if (format === 'png' && pngSize) {
    const validPngSizes: PngSize[] = ['64', '128', '256'];
    if (!validPngSizes.includes(pngSize)) {
      throw new DownloadError(
        `Invalid PNG size: ${pngSize}. Must be one of: ${validPngSizes.join(', ')}`,
        DOWNLOAD_ERROR_CODES.INVALID_PNG_SIZE,
        { pngSize, validPngSizes }
      );
    }
  }
}

/**
 * Generate filename for download
 */
function generateFilename(logo: LogoMetadata, options: DownloadOptions): string {
  const { variant = 'original', format = 'svg', pngSize, filename } = options;

  // Use custom filename if provided
  if (filename && typeof filename === 'string' && filename.trim()) {
    const cleanFilename = filename.trim().replace(/[^a-zA-Z0-9-_]/g, '-');
    return `${cleanFilename}.${format}`;
  }

  // Generate filename based on logo slug and variant
  let baseFilename = logo.slug;
  
  if (variant !== 'original') {
    baseFilename += `-${variant}`;
  }

  if (format === 'png' && pngSize) {
    baseFilename += `-${pngSize}px`;
  }

  return `${baseFilename}.${format}`;
}

/**
 * Generate download URL for logo
 */
function generateDownloadUrl(logo: LogoMetadata, options: DownloadOptions): string {
  const { variant = 'original', format = 'svg', pngSize } = options;

  if (format === 'svg') {
    return getLogoUrl(logo.slug, variant, 'svg');
  }

  if (format === 'png') {
    if (pngSize) {
      // For specific PNG sizes, construct URL with size parameter
      const baseUrl = getLogoUrl(logo.slug, variant, 'png');
      return baseUrl.replace('.png', `-${pngSize}.png`);
    }
    return getLogoUrl(logo.slug, variant, 'png');
  }

  throw new DownloadError(
    `Unsupported format: ${format}`,
    DOWNLOAD_ERROR_CODES.INVALID_FORMAT,
    { format }
  );
}

/**
 * Prepare download data for a logo
 * @param logo - Logo metadata
 * @param options - Download options
 * @returns Download result with URL and metadata
 */
export function prepareDownload(logo: LogoMetadata, options: DownloadOptions = {}): DownloadResult {
  validateDownloadOptions(logo, options);

  const { variant = 'original', format = 'svg' } = options;
  
  const url = generateDownloadUrl(logo, options);
  const filename = generateFilename(logo, options);
  const mimeType = MIME_TYPES[format];

  return {
    url,
    filename,
    format,
    variant,
    mimeType,
    logo
  };
}

/**
 * Check if browser supports download functionality
 */
function isBrowserSupported(): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return false; // Server-side environment
  }

  // Check for required browser APIs
  return !!(
    document.createElement &&
    document.body &&
    document.body.appendChild &&
    document.body.removeChild
  );
}

/**
 * Download logo file in browser environment
 * @param logo - Logo metadata
 * @param options - Download options
 * @returns Promise that resolves with download result
 */
export async function downloadLogo(logo: LogoMetadata, options: DownloadOptions = {}): Promise<DownloadResult> {
  if (!isBrowserSupported()) {
    throw new DownloadError(
      'Browser environment not supported for downloads',
      DOWNLOAD_ERROR_CODES.BROWSER_NOT_SUPPORTED
    );
  }

  const downloadResult = prepareDownload(logo, options);
  const { autoDownload = true } = options;

  if (autoDownload) {
    try {
      // Create temporary download link
      const link = document.createElement('a');
      link.href = downloadResult.url;
      link.download = downloadResult.filename;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';

      // Temporarily add to DOM and trigger click
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (error) {
      throw new DownloadError(
        `Download failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        DOWNLOAD_ERROR_CODES.DOWNLOAD_FAILED,
        { originalError: error, downloadResult }
      );
    }
  }

  return downloadResult;
}

/**
 * Download multiple logo variants at once
 * @param logo - Logo metadata
 * @param variants - Array of variants to download
 * @param options - Base download options (applied to all variants)
 * @returns Promise that resolves with array of download results
 */
export async function downloadMultipleVariants(
  logo: LogoMetadata,
  variants: LogoVariant[],
  options: Omit<DownloadOptions, 'variant'> = {}
): Promise<DownloadResult[]> {
  if (!Array.isArray(variants) || variants.length === 0) {
    throw new DownloadError(
      'Variants array must be provided and non-empty',
      DOWNLOAD_ERROR_CODES.INVALID_VARIANT,
      { variants }
    );
  }

  const results: DownloadResult[] = [];
  const errors: Error[] = [];

  // Download each variant
  for (const variant of variants) {
    try {
      const result = await downloadLogo(logo, { ...options, variant });
      results.push(result);
    } catch (error) {
      errors.push(error instanceof Error ? error : new Error(String(error)));
    }
  }

  // If all downloads failed, throw the first error
  if (results.length === 0 && errors.length > 0) {
    throw errors[0];
  }

  return results;
}

/**
 * Get download URLs for all available formats and variants
 * @param logo - Logo metadata
 * @returns Object with URLs organized by format and variant
 */
export function getAllDownloadUrls(logo: LogoMetadata): {
  svg: Record<LogoVariant, string>;
  png?: Record<LogoVariant, Record<PngSize, string>>;
} {
  validateDownloadOptions(logo, {});

  const variants: LogoVariant[] = ['original', 'white', 'black', 'optimized'];
  const pngSizes: PngSize[] = ['64', '128', '256'];

  // SVG URLs for all variants
  const svgUrls: Record<LogoVariant, string> = {} as Record<LogoVariant, string>;
  for (const variant of variants) {
    svgUrls[variant] = generateDownloadUrl(logo, { variant, format: 'svg' });
  }

  // PNG URLs for all variants and sizes (if PNG is supported)
  const pngUrls: Record<LogoVariant, Record<PngSize, string>> = {} as Record<LogoVariant, Record<PngSize, string>>;
  for (const variant of variants) {
    pngUrls[variant] = {} as Record<PngSize, string>;
    for (const size of pngSizes) {
      pngUrls[variant][size] = generateDownloadUrl(logo, { 
        variant, 
        format: 'png', 
        pngSize: size 
      });
    }
  }

  return {
    svg: svgUrls,
    png: pngUrls
  };
}

/**
 * Validate if a logo supports a specific format
 * @param logo - Logo metadata
 * @param format - Format to check
 * @returns True if format is supported
 */
export function isFormatSupported(logo: LogoMetadata, format: LogoFormatType): boolean {
  if (!logo || !logo.formats) {
    return false;
  }

  if (format === 'svg') {
    return !!logo.formats.svg;
  }

  if (format === 'png') {
    return !!logo.formats.png;
  }

  return false;
}

/**
 * Get supported formats for a logo
 * @param logo - Logo metadata
 * @returns Array of supported formats
 */
export function getSupportedFormats(logo: LogoMetadata): LogoFormatType[] {
  const formats: LogoFormatType[] = [];

  if (isFormatSupported(logo, 'svg')) {
    formats.push('svg');
  }

  if (isFormatSupported(logo, 'png')) {
    formats.push('png');
  }

  return formats;
}

/**
 * Create a download link element (for custom UI implementations)
 * @param logo - Logo metadata
 * @param options - Download options
 * @returns HTML anchor element configured for download
 */
export function createDownloadLink(logo: LogoMetadata, options: DownloadOptions = {}): HTMLAnchorElement {
  if (!isBrowserSupported()) {
    throw new DownloadError(
      'Browser environment not supported',
      DOWNLOAD_ERROR_CODES.BROWSER_NOT_SUPPORTED
    );
  }

  const downloadResult = prepareDownload(logo, options);
  
  const link = document.createElement('a');
  link.href = downloadResult.url;
  link.download = downloadResult.filename;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.setAttribute('aria-label', `Download ${logo.name} ${downloadResult.variant} logo as ${downloadResult.format.toUpperCase()}`);

  return link;
}