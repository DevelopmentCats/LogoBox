/**
 * LogoBox Logo Retrieval and URL Generation Utilities
 * Functions for retrieving logos by various criteria and generating CDN URLs
 */

import type {
  LogoMetadata,
  LogoVariant,
  Catalog,
  LogoBoxConfig
} from './types';

/**
 * Get configuration from environment variables with fallbacks
 */
function getEnvironmentConfig(): LogoBoxConfig {
  return {
    baseUrl: process.env.LOGOBOX_BASE_URL || 'https://logobox.dev',
    cdnUrl: process.env.LOGOBOX_CDN_BASE_URL || 'https://cdn.logobox.dev',
    defaultVariant: (process.env.LOGOBOX_DEFAULT_VARIANT as LogoVariant) || 'original',
    cache: {
      enabled: process.env.LOGOBOX_CACHE_ENABLED !== 'false',
      ttl: parseInt(process.env.LOGOBOX_CACHE_TTL || '3600000', 10)
    }
  };
}

/**
 * Default configuration for LogoBox (now sourced from environment variables)
 */
const DEFAULT_CONFIG: LogoBoxConfig = getEnvironmentConfig();

/**
 * Current configuration (can be updated via configure function)
 */
let currentConfig: LogoBoxConfig = { ...DEFAULT_CONFIG };

/**
 * Configure LogoBox settings
 */
export function configure(config: Partial<LogoBoxConfig>): void {
  currentConfig = { ...currentConfig, ...config };
}

/**
 * Get current configuration
 */
export function getConfig(): LogoBoxConfig {
  return { ...currentConfig };
}

/**
 * Get logo by slug
 * @param catalog - The logo catalog
 * @param slug - The logo slug to search for
 * @returns LogoMetadata if found, null otherwise
 */
export function getBySlug(catalog: Catalog, slug: string): LogoMetadata | null {
  if (!slug || typeof slug !== 'string') {
    return null;
  }

  const normalizedSlug = slug.toLowerCase().trim();
  return catalog.logos.find(logo => logo.slug === normalizedSlug) || null;
}

/**
 * Get logos by category
 * @param catalog - The logo catalog
 * @param category - The category to filter by
 * @returns Array of LogoMetadata matching the category
 */
export function getByCategory(catalog: Catalog, category: string): LogoMetadata[] {
  if (!category || typeof category !== 'string') {
    return [];
  }

  const normalizedCategory = category.toLowerCase().trim();
  return catalog.logos.filter(logo =>
    logo.categories.some(cat => cat.toLowerCase() === normalizedCategory)
  );
}

/**
 * Get logos by tags (all tags must match)
 * @param catalog - The logo catalog
 * @param tags - Array of tags to filter by
 * @returns Array of LogoMetadata matching all tags
 */
export function getByTags(catalog: Catalog, tags: string[]): LogoMetadata[] {
  if (!Array.isArray(tags) || tags.length === 0) {
    return [];
  }

  const normalizedTags = tags
    .filter(tag => typeof tag === 'string' && tag.trim())
    .map(tag => tag.toLowerCase().trim());

  if (normalizedTags.length === 0) {
    return [];
  }

  return catalog.logos.filter(logo =>
    normalizedTags.every(tag =>
      logo.tags.some(logoTag => logoTag.toLowerCase() === tag)
    )
  );
}

/**
 * Generate CDN URL for a logo variant
 * @param slug - The logo slug
 * @param variant - The logo variant (default: 'original')
 * @param format - The file format (default: 'svg')
 * @returns CDN URL for the logo variant
 */
export function getLogoUrl(
  slug: string,
  variant: LogoVariant = 'original',
  format: 'svg' | 'png' = 'svg'
): string {
  if (!slug || typeof slug !== 'string') {
    throw new Error('Logo slug is required and must be a string');
  }

  const normalizedSlug = slug.toLowerCase().trim();
  
  // Check if slug is empty after trimming
  if (!normalizedSlug) {
    throw new Error('Logo slug is required and must be a string');
  }
  
  const config = getConfig();
  
  // Validate variant
  const validVariants: LogoVariant[] = ['original', 'white', 'black', 'optimized'];
  if (!validVariants.includes(variant)) {
    throw new Error(`Invalid variant: ${variant}. Must be one of: ${validVariants.join(', ')}`);
  }

  // Build the URL path
  let filename: string;
  if (variant === 'original') {
    filename = `logo.${format}`;
  } else {
    filename = `logo-${variant}.${format}`;
  }

  const urlPath = `/logos/${normalizedSlug}/${filename}`;
  return `${config.cdnUrl}${urlPath}`;
}

/**
 * Generate multiple CDN URLs for all variants of a logo
 * @param slug - The logo slug
 * @param format - The file format (default: 'svg')
 * @returns Object with URLs for all variants
 */
export function getLogoUrls(
  slug: string,
  format: 'svg' | 'png' = 'svg'
): Record<LogoVariant, string> {
  const variants: LogoVariant[] = ['original', 'white', 'black', 'optimized'];
  const urls: Record<LogoVariant, string> = {} as Record<LogoVariant, string>;

  for (const variant of variants) {
    urls[variant] = getLogoUrl(slug, variant, format);
  }

  return urls;
}

/**
 * Get logo with CDN URLs populated
 * @param catalog - The logo catalog
 * @param slug - The logo slug
 * @returns LogoMetadata with CDN URLs populated, or null if not found
 */
export function getLogoWithUrls(catalog: Catalog, slug: string): LogoMetadata | null {
  const logo = getBySlug(catalog, slug);
  if (!logo) {
    return null;
  }

  // Get file size from fileStats if available
  const fileSize = logo.fileStats?.variants?.original?.size || 0;

  // Create a copy with CDN URLs
  const logoWithUrls: LogoMetadata = {
    ...logo,
    variants: {
      original: getLogoUrl(slug, 'original'),
      white: getLogoUrl(slug, 'white'),
      black: getLogoUrl(slug, 'black'),
      optimized: getLogoUrl(slug, 'optimized')
    },
    formats: {
      svg: {
        url: getLogoUrl(slug, 'original', 'svg'),
        fileSize: fileSize,
        checksum: '' // Empty checksum for now
      }
    }
  };

  return logoWithUrls;
}

/**
 * Batch retrieve logos by slugs with CDN URLs
 * @param catalog - The logo catalog
 * @param slugs - Array of logo slugs
 * @returns Array of LogoMetadata with CDN URLs populated
 */
export function getBatchLogosWithUrls(catalog: Catalog, slugs: string[]): LogoMetadata[] {
  if (!Array.isArray(slugs)) {
    return [];
  }

  return slugs
    .map(slug => getLogoWithUrls(catalog, slug))
    .filter((logo): logo is LogoMetadata => logo !== null);
}

/**
 * Get all available categories from catalog
 * @param catalog - The logo catalog
 * @returns Sorted array of category names
 */
export function getAllCategories(catalog: Catalog): string[] {
  return [...catalog.categories].sort();
}

/**
 * Get all available tags from catalog
 * @param catalog - The logo catalog
 * @returns Sorted array of tag names
 */
export function getAllTags(catalog: Catalog): string[] {
  return [...catalog.tags].sort();
}

/**
 * Validate logo slug format
 * @param slug - The slug to validate
 * @returns True if valid, false otherwise
 */
export function isValidSlug(slug: string): boolean {
  if (!slug || typeof slug !== 'string') {
    return false;
  }

  // Don't trim - slugs with spaces should be invalid
  // Slug should be lowercase, contain only letters, numbers, and hyphens
  // Should not start or end with hyphen
  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  return slugRegex.test(slug);
}

/**
 * Get logo statistics from catalog
 * @param catalog - The logo catalog
 * @returns Statistics about the logo collection
 */
export function getLogoStats(catalog: Catalog) {
  return catalog.stats;
}