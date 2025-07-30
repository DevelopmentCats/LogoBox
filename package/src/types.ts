/**
 * LogoBox TypeScript Interfaces
 * Core type definitions for logo metadata and catalog structure
 */

/**
 * Represents different variants of a logo
 */
export interface LogoVariants {
  /** Original logo as uploaded */
  original: string;
  /** White variant for dark backgrounds */
  white: string;
  /** Black variant for light backgrounds */
  black: string;
  /** Optimized variant with minimal file size */
  optimized: string;
}

/**
 * Represents a single logo format with metadata
 */
export interface LogoFormat {
  /** URL to the logo file */
  url: string;
  /** File size in bytes */
  fileSize: number;
  /** Checksum for integrity verification */
  checksum: string;
}

/**
 * Represents available formats for a logo
 */
export interface LogoFormats {
  /** SVG format (always available) */
  svg: LogoFormat;
  /** PNG formats in different resolutions (optional) */
  png?: {
    '64': LogoFormat;
    '128': LogoFormat;
    '256': LogoFormat;
  };
}

/**
 * License information for a logo
 */
export interface License {
  /** License type (e.g., 'MIT', 'Apache-2.0', 'CC0') */
  type: string;
  /** URL to license text */
  url?: string;
  /** Additional license notes */
  notes?: string;
}

/**
 * Category information
 */
export interface Category {
  /** Category identifier */
  id: string;
  /** Human-readable category name */
  name: string;
  /** Category description */
  description?: string;
}

/**
 * Tag information
 */
export interface Tag {
  /** Tag identifier */
  id: string;
  /** Human-readable tag name */
  name: string;
  /** Tag description */
  description?: string;
}

/**
 * File statistics for logo variants
 */
export interface FileStats {
  variants: {
    original: {
      filename: string;
      size: number;
      createdAt: string;
      updatedAt: string;
    };
    white: {
      filename: string;
      size: number;
      createdAt: string;
      updatedAt: string;
    };
    black: {
      filename: string;
      size: number;
      createdAt: string;
      updatedAt: string;
    };
    optimized: {
      filename: string;
      size: number;
      createdAt: string;
      updatedAt: string;
    };
  };
  directory: string;
}

/**
 * Core logo metadata interface (matches catalog structure)
 */
export interface LogoMetadata {
  /** Display name of the logo */
  name: string;
  /** URL-friendly slug */
  slug: string;
  /** Optional description */
  description?: string;
  /** Categories this logo belongs to */
  categories: string[];
  /** Tags associated with this logo */
  tags: string[];
  /** License information (simplified) */
  license: string;
  /** Available logo variants */
  variants: LogoVariants;
  /** Available formats and their metadata */
  formats: {
    svg: LogoFormat;
  };
  /** File statistics */
  fileStats?: FileStats;
}

/**
 * Simplified logo interface for basic operations
 */
export interface Logo {
  /** Unique identifier */
  id: string;
  /** Display name */
  name: string;
  /** URL-friendly slug */
  slug: string;
  /** Optional description */
  description?: string;
  /** Category objects */
  categories: Category[];
  /** Tag objects */
  tags: Tag[];
  /** License information */
  license: License;
  /** Available variants */
  variants: LogoVariants;
  /** Available formats */
  formats: LogoFormats;
  /** Additional metadata */
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    fileSize: number;
    dimensions: { width: number; height: number };
  };
}

/**
 * Search query parameters
 */
export interface SearchQuery {
  /** Text search query */
  text?: string;
  /** Filter by categories */
  categories?: string[];
  /** Filter by tags */
  tags?: string[];
  /** Maximum number of results */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
  /** Sort order */
  sortBy?: 'name' | 'createdAt' | 'updatedAt' | 'popularity';
  /** Sort direction */
  sortOrder?: 'asc' | 'desc';
}

/**
 * Search result facets for filtering
 */
export interface SearchFacets {
  /** Available categories with counts */
  categories: Array<{ name: string; count: number }>;
  /** Available tags with counts */
  tags: Array<{ name: string; count: number }>;
}

/**
 * Search results with metadata
 */
export interface SearchResult {
  /** Array of matching logos */
  logos: Logo[];
  /** Total number of results (before pagination) */
  total: number;
  /** Current page offset */
  offset: number;
  /** Number of results per page */
  limit: number;
  /** Search facets for filtering */
  facets: SearchFacets;
  /** Query execution time in milliseconds */
  executionTime: number;
}

/**
 * Complete catalog structure
 */
export interface Catalog {
  /** Catalog version */
  version: string;
  /** Last update timestamp */
  lastUpdated: string;
  /** Array of all logos */
  logos: LogoMetadata[];
  /** Available categories */
  categories: string[];
  /** Available tags */
  tags: string[];
  /** Catalog statistics */
  stats: {
    /** Total number of logos */
    totalLogos: number;
    /** Total number of categories */
    totalCategories: number;
    /** Total number of tags */
    totalTags: number;
  };
}

/**
 * Error types for LogoBox operations
 */
export interface LogoBoxError extends Error {
  /** Error code for programmatic handling */
  code: string;
  /** Additional error details */
  details?: Record<string, unknown>;
}

/**
 * Configuration options for LogoBox
 */
export interface LogoBoxConfig {
  /** Base URL for logo assets */
  baseUrl?: string;
  /** CDN URL for optimized delivery */
  cdnUrl?: string;
  /** Default logo variant */
  defaultVariant?: 'original' | 'white' | 'black' | 'optimized';
  /** Cache settings */
  cache?: {
    /** Enable caching */
    enabled: boolean;
    /** Cache TTL in milliseconds */
    ttl: number;
  };
}

/**
 * Logo variant type union
 */
export type LogoVariant = 'original' | 'white' | 'black' | 'optimized';

/**
 * Logo format type union
 */
export type LogoFormatType = 'svg' | 'png';

/**
 * PNG size type union
 */
export type PngSize = '64' | '128' | '256';