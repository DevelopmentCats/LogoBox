/**
 * LogoBox NPM Package
 * Programmatic access to logos and icons
 */

// Export all types
export * from './types';

// Export logo retrieval functions
export * from './logoRetrieval';

// Export dynamic generation functionality
export * from './dynamicGeneration';

// Import types for API definition
import type {
  LogoMetadata,
  SearchQuery,
  SearchResult,
  LogoVariant,
  LogoBoxConfig,
  Catalog
} from './types';

// Import search functions
import { searchLogos, searchLogosByText } from './logoSearch';

// Import retrieval functions
import {
  getBySlug as retrieveBySlug,
  getByCategory as retrieveByCategory,
  getByTags as retrieveByTags,
  getAllCategories as retrieveAllCategories,
  getAllTags as retrieveAllTags,
  getLogoUrl as generateLogoUrl,
  configure as configureLogoBox
} from './logoRetrieval';

/**
 * Error codes for LogoBox operations
 */
export const ERROR_CODES = {
  LOGO_NOT_FOUND: 'LOGO_NOT_FOUND',
  NETWORK_ERROR: 'NETWORK_ERROR',
  INVALID_VARIANT: 'INVALID_VARIANT',
  CATALOG_LOAD_ERROR: 'CATALOG_LOAD_ERROR',
  INVALID_SLUG: 'INVALID_SLUG',
  INVALID_CATEGORY: 'INVALID_CATEGORY',
  INVALID_TAGS: 'INVALID_TAGS',
  INVALID_SEARCH_QUERY: 'INVALID_SEARCH_QUERY',
  CONFIGURATION_ERROR: 'CONFIGURATION_ERROR',
  CATALOG_VALIDATION_ERROR: 'CATALOG_VALIDATION_ERROR',
  FILE_SYSTEM_ERROR: 'FILE_SYSTEM_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  RATE_LIMIT_ERROR: 'RATE_LIMIT_ERROR'
} as const;

/**
 * LogoBox error class with structured error codes
 */
export class LogoBoxError extends Error {
  public readonly code: string;
  public readonly details?: Record<string, unknown>;

  constructor(message: string, code: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'LogoBoxError';
    this.code = code;
    this.details = details;

    // Maintain proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, LogoBoxError);
    }
  }
}

/**
 * Main LogoBox API interface
 */
export interface LogoBoxAPI {
  /** Search logos with advanced query options */
  search(query: SearchQuery): Promise<SearchResult>;
  /** Search logos with simple text query */
  searchText(text: string): Promise<LogoMetadata[]>;
  /** Get logo by slug */
  getBySlug(slug: string): Promise<LogoMetadata | null>;
  /** Get logos by category */
  getByCategory(category: string): Promise<LogoMetadata[]>;
  /** Get logos by tags */
  getByTags(tags: string[]): Promise<LogoMetadata[]>;
  /** Get all available categories */
  getAllCategories(): Promise<string[]>;
  /** Get all available tags */
  getAllTags(): Promise<string[]>;
  /** Generate URL for logo variant */
  getLogoUrl(slug: string, variant?: LogoVariant): string;
  /** Configure LogoBox settings */
  configure(config: Partial<LogoBoxConfig>): void;
}

/**
 * Cached catalog data
 */
let cachedCatalog: Catalog | null = null;
let catalogLoadPromise: Promise<Catalog> | null = null;

/**
 * Load catalog data from local data directory or CDN with enhanced error handling
 */
async function loadCatalog(): Promise<Catalog> {
  // Return cached catalog if available and caching is enabled
  const { getConfig } = await import('./logoRetrieval');
  const config = getConfig();
  if (cachedCatalog && config.cache?.enabled) {
    return cachedCatalog;
  }

  // Return existing promise if already loading
  if (catalogLoadPromise) {
    return catalogLoadPromise;
  }

  catalogLoadPromise = (async (): Promise<Catalog> => {
    const startTime = Date.now();
    let lastError: Error | null = null;

    try {
      // Try to load from local data directory first
      try {
        const fs = await import('fs/promises');
        const path = await import('path');
        const { fileURLToPath } = await import('url');
        
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        const catalogPath = path.join(__dirname, '..', 'data', 'catalog.json');
        
        // Add timeout for file operations
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('File read timeout')), 10000);
        });

        const catalogData = await Promise.race([
          fs.readFile(catalogPath, 'utf-8'),
          timeoutPromise
        ]);

        let catalog: Catalog;
        try {
          catalog = JSON.parse(catalogData);
        } catch (parseError) {
          throw new LogoBoxError(
            'Invalid JSON format in catalog file',
            ERROR_CODES.CATALOG_VALIDATION_ERROR,
            { 
              catalogPath,
              parseError: parseError instanceof Error ? parseError.message : 'Unknown parse error',
              dataPreview: catalogData.substring(0, 100)
            }
          );
        }
        
        // Enhanced catalog validation
        const validationErrors: string[] = [];
        
        if (!catalog.logos || !Array.isArray(catalog.logos)) {
          validationErrors.push('logos array is missing or invalid');
        }
        
        if (!catalog.version || typeof catalog.version !== 'string') {
          validationErrors.push('version field is missing or invalid');
        }
        
        if (!catalog.lastUpdated || typeof catalog.lastUpdated !== 'string') {
          validationErrors.push('lastUpdated field is missing or invalid');
        }
        
        if (!catalog.categories || !Array.isArray(catalog.categories)) {
          validationErrors.push('categories array is missing or invalid');
        }
        
        if (!catalog.tags || !Array.isArray(catalog.tags)) {
          validationErrors.push('tags array is missing or invalid');
        }

        if (validationErrors.length > 0) {
          throw new LogoBoxError(
            `Invalid catalog structure: ${validationErrors.join(', ')}`,
            ERROR_CODES.CATALOG_VALIDATION_ERROR,
            { 
              catalogPath,
              validationErrors,
              catalogKeys: Object.keys(catalog)
            }
          );
        }

        // Validate individual logo entries
        for (let i = 0; i < catalog.logos.length; i++) {
          const logo = catalog.logos[i];
          const logoErrors: string[] = [];
          
          if (!logo.name || typeof logo.name !== 'string') {
            logoErrors.push('name is missing or invalid');
          }
          
          if (!logo.slug || typeof logo.slug !== 'string') {
            logoErrors.push('slug is missing or invalid');
          }
          
          if (!logo.variants || typeof logo.variants !== 'object') {
            logoErrors.push('variants object is missing or invalid');
          }
          
          if (logoErrors.length > 0) {
            console.warn(`Logo at index ${i} has validation errors: ${logoErrors.join(', ')}`, logo);
          }
        }

        cachedCatalog = catalog;
        return catalog;
      } catch (localError) {
        lastError = localError instanceof Error ? localError : new Error(String(localError));
        
        // Enhanced error classification
        if (localError instanceof Error) {
          if (localError.message.includes('ENOENT') || localError.message.includes('no such file')) {
            console.warn('Catalog file not found, using empty catalog fallback');
          } else if (localError.message.includes('EACCES') || localError.message.includes('permission denied')) {
            console.warn('Permission denied accessing catalog file, using empty catalog fallback');
          } else if (localError.message.includes('timeout')) {
            console.warn('Catalog file read timeout, using empty catalog fallback');
          } else {
            console.warn('Failed to load local catalog:', localError.message);
          }
        }
        
        // Try CDN fallback (future implementation)
        try {
          // TODO: Implement CDN fallback
          // const cdnCatalog = await loadFromCDN();
          // if (cdnCatalog) return cdnCatalog;
        } catch (cdnError) {
          console.warn('CDN fallback also failed:', cdnError);
        }
        
        // Return empty catalog as final fallback
        const emptyCatalog: Catalog = {
          version: '1.0.0',
          lastUpdated: new Date().toISOString(),
          logos: [],
          categories: [],
          tags: [],
          stats: {
            totalLogos: 0,
            totalCategories: 0,
            totalTags: 0
          }
        };

        cachedCatalog = emptyCatalog;
        return emptyCatalog;
      }
    } catch (error) {
      catalogLoadPromise = null; // Reset promise on error
      
      // Only throw errors for critical failures, not for graceful degradation scenarios
      if (error instanceof LogoBoxError && error.code === ERROR_CODES.CATALOG_VALIDATION_ERROR) {
        // For validation errors, log and return empty catalog instead of throwing
        console.error('Catalog validation failed, using empty catalog:', error.message);
        
        const emptyCatalog: Catalog = {
          version: '1.0.0',
          lastUpdated: new Date().toISOString(),
          logos: [],
          categories: [],
          tags: [],
          stats: {
            totalLogos: 0,
            totalCategories: 0,
            totalTags: 0
          }
        };

        cachedCatalog = emptyCatalog;
        return emptyCatalog;
      }
      
      // For other critical errors, still throw but with enhanced context
      const loadTime = Date.now() - startTime;
      throw new LogoBoxError(
        `Critical catalog loading failure after ${loadTime}ms: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ERROR_CODES.CATALOG_LOAD_ERROR,
        { 
          originalError: error,
          lastError: lastError ? lastError.message : undefined,
          loadTime,
          timestamp: new Date().toISOString()
        }
      );
    } finally {
      catalogLoadPromise = null;
    }
  })();

  return catalogLoadPromise;
}

/**
 * Clear cached catalog (useful for testing or forcing refresh)
 */
export function clearCatalogCache(): void {
  cachedCatalog = null;
  catalogLoadPromise = null;
}

/**
 * Validate search query parameters with enhanced error messages
 */
function validateSearchQuery(query: SearchQuery): void {
  if (typeof query !== 'object' || query === null) {
    throw new LogoBoxError(
      `Search query must be an object, received ${query === null ? 'null' : typeof query}`,
      ERROR_CODES.INVALID_SEARCH_QUERY,
      { 
        query,
        expectedType: 'object',
        receivedType: query === null ? 'null' : typeof query
      }
    );
  }

  if (query.text !== undefined && typeof query.text !== 'string') {
    throw new LogoBoxError(
      `Search query text must be a string, received ${typeof query.text}`,
      ERROR_CODES.INVALID_SEARCH_QUERY,
      { 
        text: query.text,
        expectedType: 'string',
        receivedType: typeof query.text
      }
    );
  }

  if (query.categories !== undefined && !Array.isArray(query.categories)) {
    throw new LogoBoxError(
      `Search query categories must be an array, received ${typeof query.categories}`,
      ERROR_CODES.INVALID_SEARCH_QUERY,
      { 
        categories: query.categories,
        expectedType: 'array',
        receivedType: typeof query.categories
      }
    );
  }

  if (query.tags !== undefined && !Array.isArray(query.tags)) {
    throw new LogoBoxError(
      `Search query tags must be an array, received ${typeof query.tags}`,
      ERROR_CODES.INVALID_SEARCH_QUERY,
      { 
        tags: query.tags,
        expectedType: 'array',
        receivedType: typeof query.tags
      }
    );
  }

  if (query.limit !== undefined && (typeof query.limit !== 'number' || query.limit < 0 || !Number.isInteger(query.limit))) {
    throw new LogoBoxError(
      `Search query limit must be a non-negative integer, received ${typeof query.limit === 'number' ? query.limit : typeof query.limit}`,
      ERROR_CODES.INVALID_SEARCH_QUERY,
      { 
        limit: query.limit,
        expectedType: 'non-negative integer',
        receivedType: typeof query.limit,
        isInteger: typeof query.limit === 'number' ? Number.isInteger(query.limit) : false
      }
    );
  }

  if (query.offset !== undefined && (typeof query.offset !== 'number' || query.offset < 0 || !Number.isInteger(query.offset))) {
    throw new LogoBoxError(
      `Search query offset must be a non-negative integer, received ${typeof query.offset === 'number' ? query.offset : typeof query.offset}`,
      ERROR_CODES.INVALID_SEARCH_QUERY,
      { 
        offset: query.offset,
        expectedType: 'non-negative integer',
        receivedType: typeof query.offset,
        isInteger: typeof query.offset === 'number' ? Number.isInteger(query.offset) : false
      }
    );
  }

  // Additional validation for array contents
  if (query.categories && Array.isArray(query.categories)) {
    const invalidCategories = query.categories.filter(cat => typeof cat !== 'string' || !cat.trim());
    if (invalidCategories.length > 0) {
      throw new LogoBoxError(
        'All categories must be non-empty strings',
        ERROR_CODES.INVALID_SEARCH_QUERY,
        { 
          categories: query.categories,
          invalidCategories,
          validCount: query.categories.length - invalidCategories.length
        }
      );
    }
  }

  if (query.tags && Array.isArray(query.tags)) {
    const invalidTags = query.tags.filter(tag => typeof tag !== 'string' || !tag.trim());
    if (invalidTags.length > 0) {
      throw new LogoBoxError(
        'All tags must be non-empty strings',
        ERROR_CODES.INVALID_SEARCH_QUERY,
        { 
          tags: query.tags,
          invalidTags,
          validCount: query.tags.length - invalidTags.length
        }
      );
    }
  }
}

/**
 * LogoBox API implementation with comprehensive error handling
 */
export const logobox: LogoBoxAPI = {
  search: async (query: SearchQuery): Promise<SearchResult> => {
    const startTime = Date.now();
    try {
      validateSearchQuery(query);
      const catalog = await loadCatalog();
      const result = searchLogos(catalog, query);
      
      // Add performance metrics
      const executionTime = Date.now() - startTime;
      return {
        ...result,
        executionTime
      };
    } catch (error) {
      if (error instanceof LogoBoxError) {
        // For validation errors, throw immediately
        if (error.code === ERROR_CODES.INVALID_SEARCH_QUERY) {
          throw error;
        }
        
        // For other LogoBox errors, add context and potentially degrade gracefully
        if (error.code === ERROR_CODES.CATALOG_LOAD_ERROR) {
          console.warn('Search degraded due to catalog loading issues:', error.message);
          // Return empty result instead of throwing
          return {
            logos: [],
            total: 0,
            offset: query.offset || 0,
            limit: query.limit || 50,
            facets: { categories: [], tags: [] },
            executionTime: Date.now() - startTime
          };
        }
        
        throw error;
      }
      
      // Wrap unexpected errors
      const executionTime = Date.now() - startTime;
      throw new LogoBoxError(
        `Search operation failed after ${executionTime}ms: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ERROR_CODES.NETWORK_ERROR,
        { 
          originalError: error, 
          query,
          executionTime,
          timestamp: new Date().toISOString()
        }
      );
    }
  },

  searchText: async (text: string): Promise<LogoMetadata[]> => {
    const startTime = Date.now();
    try {
      if (typeof text !== 'string') {
        throw new LogoBoxError(
          `Search text must be a string, received ${typeof text}`,
          ERROR_CODES.INVALID_SEARCH_QUERY,
          { 
            text,
            expectedType: 'string',
            receivedType: typeof text
          }
        );
      }

      const catalog = await loadCatalog();
      return searchLogosByText(catalog, text);
    } catch (error) {
      if (error instanceof LogoBoxError) {
        // For validation errors, throw immediately
        if (error.code === ERROR_CODES.INVALID_SEARCH_QUERY) {
          throw error;
        }
        
        // For catalog loading issues, degrade gracefully
        if (error.code === ERROR_CODES.CATALOG_LOAD_ERROR) {
          console.warn('Text search degraded due to catalog loading issues:', error.message);
          return [];
        }
        
        throw error;
      }
      
      const executionTime = Date.now() - startTime;
      throw new LogoBoxError(
        `Text search operation failed after ${executionTime}ms: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ERROR_CODES.NETWORK_ERROR,
        { 
          originalError: error, 
          text,
          executionTime,
          timestamp: new Date().toISOString()
        }
      );
    }
  },

  getBySlug: async (slug: string): Promise<LogoMetadata | null> => {
    const startTime = Date.now();
    try {
      if (typeof slug !== 'string' || !slug.trim()) {
        throw new LogoBoxError(
          `Logo slug must be a non-empty string, received ${typeof slug}${typeof slug === 'string' ? ` (trimmed: "${slug.trim()}")` : ''}`,
          ERROR_CODES.INVALID_SLUG,
          { 
            slug,
            expectedType: 'non-empty string',
            receivedType: typeof slug,
            trimmedValue: typeof slug === 'string' ? slug.trim() : undefined
          }
        );
      }

      const catalog = await loadCatalog();
      return retrieveBySlug(catalog, slug);
    } catch (error) {
      if (error instanceof LogoBoxError) {
        // For validation errors, throw immediately
        if (error.code === ERROR_CODES.INVALID_SLUG) {
          throw error;
        }
        
        // For catalog loading issues, degrade gracefully
        if (error.code === ERROR_CODES.CATALOG_LOAD_ERROR) {
          console.warn('Logo retrieval degraded due to catalog loading issues:', error.message);
          return null;
        }
        
        throw error;
      }
      
      const executionTime = Date.now() - startTime;
      throw new LogoBoxError(
        `Failed to retrieve logo by slug after ${executionTime}ms: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ERROR_CODES.NETWORK_ERROR,
        { 
          originalError: error, 
          slug,
          executionTime,
          timestamp: new Date().toISOString()
        }
      );
    }
  },

  getByCategory: async (category: string): Promise<LogoMetadata[]> => {
    const startTime = Date.now();
    try {
      if (typeof category !== 'string' || !category.trim()) {
        throw new LogoBoxError(
          `Category must be a non-empty string, received ${typeof category}${typeof category === 'string' ? ` (trimmed: "${category.trim()}")` : ''}`,
          ERROR_CODES.INVALID_CATEGORY,
          { 
            category,
            expectedType: 'non-empty string',
            receivedType: typeof category,
            trimmedValue: typeof category === 'string' ? category.trim() : undefined
          }
        );
      }

      const catalog = await loadCatalog();
      return retrieveByCategory(catalog, category);
    } catch (error) {
      if (error instanceof LogoBoxError) {
        // For validation errors, throw immediately
        if (error.code === ERROR_CODES.INVALID_CATEGORY) {
          throw error;
        }
        
        // For catalog loading issues, degrade gracefully
        if (error.code === ERROR_CODES.CATALOG_LOAD_ERROR) {
          console.warn('Category retrieval degraded due to catalog loading issues:', error.message);
          return [];
        }
        
        throw error;
      }
      
      const executionTime = Date.now() - startTime;
      throw new LogoBoxError(
        `Failed to retrieve logos by category after ${executionTime}ms: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ERROR_CODES.NETWORK_ERROR,
        { 
          originalError: error, 
          category,
          executionTime,
          timestamp: new Date().toISOString()
        }
      );
    }
  },

  getByTags: async (tags: string[]): Promise<LogoMetadata[]> => {
    const startTime = Date.now();
    try {
      if (!Array.isArray(tags)) {
        throw new LogoBoxError(
          `Tags must be an array, received ${typeof tags}`,
          ERROR_CODES.INVALID_TAGS,
          { 
            tags,
            expectedType: 'array',
            receivedType: typeof tags
          }
        );
      }

      const invalidTags = tags.filter(tag => typeof tag !== 'string' || !tag.trim());
      if (invalidTags.length > 0) {
        throw new LogoBoxError(
          `All tags must be non-empty strings. Found ${invalidTags.length} invalid tag(s)`,
          ERROR_CODES.INVALID_TAGS,
          { 
            tags,
            invalidTags,
            validTags: tags.filter(tag => typeof tag === 'string' && tag.trim()),
            invalidCount: invalidTags.length,
            totalCount: tags.length
          }
        );
      }

      const catalog = await loadCatalog();
      return retrieveByTags(catalog, tags);
    } catch (error) {
      if (error instanceof LogoBoxError) {
        // For validation errors, throw immediately
        if (error.code === ERROR_CODES.INVALID_TAGS) {
          throw error;
        }
        
        // For catalog loading issues, degrade gracefully
        if (error.code === ERROR_CODES.CATALOG_LOAD_ERROR) {
          console.warn('Tags retrieval degraded due to catalog loading issues:', error.message);
          return [];
        }
        
        throw error;
      }
      
      const executionTime = Date.now() - startTime;
      throw new LogoBoxError(
        `Failed to retrieve logos by tags after ${executionTime}ms: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ERROR_CODES.NETWORK_ERROR,
        { 
          originalError: error, 
          tags,
          executionTime,
          timestamp: new Date().toISOString()
        }
      );
    }
  },

  getAllCategories: async (): Promise<string[]> => {
    const startTime = Date.now();
    try {
      const catalog = await loadCatalog();
      return retrieveAllCategories(catalog);
    } catch (error) {
      if (error instanceof LogoBoxError) {
        // For catalog loading issues, degrade gracefully
        if (error.code === ERROR_CODES.CATALOG_LOAD_ERROR) {
          console.warn('Categories retrieval degraded due to catalog loading issues:', error.message);
          return [];
        }
        
        throw error;
      }
      
      const executionTime = Date.now() - startTime;
      throw new LogoBoxError(
        `Failed to retrieve categories after ${executionTime}ms: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ERROR_CODES.NETWORK_ERROR,
        { 
          originalError: error,
          executionTime,
          timestamp: new Date().toISOString()
        }
      );
    }
  },

  getAllTags: async (): Promise<string[]> => {
    const startTime = Date.now();
    try {
      const catalog = await loadCatalog();
      return retrieveAllTags(catalog);
    } catch (error) {
      if (error instanceof LogoBoxError) {
        // For catalog loading issues, degrade gracefully
        if (error.code === ERROR_CODES.CATALOG_LOAD_ERROR) {
          console.warn('Tags retrieval degraded due to catalog loading issues:', error.message);
          return [];
        }
        
        throw error;
      }
      
      const executionTime = Date.now() - startTime;
      throw new LogoBoxError(
        `Failed to retrieve tags after ${executionTime}ms: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ERROR_CODES.NETWORK_ERROR,
        { 
          originalError: error,
          executionTime,
          timestamp: new Date().toISOString()
        }
      );
    }
  },

  getLogoUrl: (slug: string, variant?: LogoVariant): string => {
    try {
      if (typeof slug !== 'string' || !slug.trim()) {
        throw new LogoBoxError(
          `Logo slug must be a non-empty string, received ${typeof slug}${typeof slug === 'string' ? ` (trimmed: "${slug.trim()}")` : ''}`,
          ERROR_CODES.INVALID_SLUG,
          { 
            slug,
            expectedType: 'non-empty string',
            receivedType: typeof slug,
            trimmedValue: typeof slug === 'string' ? slug.trim() : undefined
          }
        );
      }

      if (variant !== undefined) {
        const validVariants: LogoVariant[] = ['original', 'white', 'black', 'optimized'];
        if (!validVariants.includes(variant)) {
          throw new LogoBoxError(
            `Invalid logo variant: "${variant}". Must be one of: ${validVariants.join(', ')}`,
            ERROR_CODES.INVALID_VARIANT,
            { 
              variant,
              validVariants,
              receivedType: typeof variant,
              suggestion: `Try using one of: ${validVariants.join(', ')}`
            }
          );
        }
      }

      return generateLogoUrl(slug, variant);
    } catch (error) {
      if (error instanceof LogoBoxError) {
        throw error;
      }
      throw new LogoBoxError(
        `Failed to generate logo URL: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ERROR_CODES.NETWORK_ERROR,
        { 
          originalError: error, 
          slug, 
          variant,
          timestamp: new Date().toISOString()
        }
      );
    }
  },

  configure: (config: Partial<LogoBoxConfig>): void => {
    try {
      if (typeof config !== 'object' || config === null) {
        throw new LogoBoxError(
          `Configuration must be an object, received ${config === null ? 'null' : typeof config}`,
          ERROR_CODES.CONFIGURATION_ERROR,
          { 
            config,
            expectedType: 'object',
            receivedType: config === null ? 'null' : typeof config
          }
        );
      }

      // Validate configuration properties
      const validationErrors: string[] = [];
      
      if (config.baseUrl !== undefined && typeof config.baseUrl !== 'string') {
        validationErrors.push(`baseUrl must be a string, received ${typeof config.baseUrl}`);
      }
      
      if (config.cdnUrl !== undefined && typeof config.cdnUrl !== 'string') {
        validationErrors.push(`cdnUrl must be a string, received ${typeof config.cdnUrl}`);
      }
      
      if (config.defaultVariant !== undefined) {
        const validVariants: LogoVariant[] = ['original', 'white', 'black', 'optimized'];
        if (!validVariants.includes(config.defaultVariant)) {
          validationErrors.push(`defaultVariant must be one of: ${validVariants.join(', ')}, received "${config.defaultVariant}"`);
        }
      }
      
      if (config.cache !== undefined) {
        if (typeof config.cache !== 'object' || config.cache === null) {
          validationErrors.push(`cache must be an object, received ${config.cache === null ? 'null' : typeof config.cache}`);
        } else {
          if (config.cache.enabled !== undefined && typeof config.cache.enabled !== 'boolean') {
            validationErrors.push(`cache.enabled must be a boolean, received ${typeof config.cache.enabled}`);
          }
          if (config.cache.ttl !== undefined && (typeof config.cache.ttl !== 'number' || config.cache.ttl < 0)) {
            validationErrors.push(`cache.ttl must be a non-negative number, received ${typeof config.cache.ttl}`);
          }
        }
      }

      if (validationErrors.length > 0) {
        throw new LogoBoxError(
          `Configuration validation failed: ${validationErrors.join('; ')}`,
          ERROR_CODES.CONFIGURATION_ERROR,
          { 
            config,
            validationErrors,
            validProperties: ['baseUrl', 'cdnUrl', 'defaultVariant', 'cache']
          }
        );
      }

      configureLogoBox(config);
      
      // Clear cache when configuration changes
      clearCatalogCache();
      
      console.log('LogoBox configuration updated successfully');
    } catch (error) {
      if (error instanceof LogoBoxError) {
        throw error;
      }
      throw new LogoBoxError(
        `Configuration operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ERROR_CODES.CONFIGURATION_ERROR,
        { 
          originalError: error, 
          config,
          timestamp: new Date().toISOString()
        }
      );
    }
  }
};

export default logobox;