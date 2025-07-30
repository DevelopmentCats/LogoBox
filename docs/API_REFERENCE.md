# LogoBox API Reference

Complete API documentation for the LogoBox NPM package - programmatic access to high-quality logos and icons.

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [API Overview](#api-overview)
- [Core API Methods](#core-api-methods)
- [Search and Discovery](#search-and-discovery)
- [Logo Retrieval](#logo-retrieval)
- [URL Generation](#url-generation)
- [Configuration](#configuration)
- [Error Handling](#error-handling)
- [TypeScript Support](#typescript-support)
- [Advanced Usage](#advanced-usage)
- [Performance Optimization](#performance-optimization)
- [Migration Guide](#migration-guide)

## Installation

### NPM
```bash
npm install logobox
```

### Yarn
```bash
yarn add logobox
```

### PNPM
```bash
pnpm add logobox
```

## Quick Start

### ES Modules (Recommended)
```javascript
import { logobox } from 'logobox';

// Get a logo URL
const githubLogoUrl = logobox.getLogoUrl('github');
console.log(githubLogoUrl); // https://cdn.logobox.dev/logos/github/logo.svg

// Search for logos
const results = await logobox.searchText('technology');
console.log(results); // Array of matching logos
```

### CommonJS
```javascript
const { logobox } = require('logobox');

// Same API as ES modules
const githubLogoUrl = logobox.getLogoUrl('github');
```

### TypeScript
```typescript
import { logobox, LogoBoxAPI, SearchQuery, LogoMetadata } from 'logobox';

const query: SearchQuery = {
  text: 'github',
  categories: ['technology'],
  limit: 10
};

const results = await logobox.search(query);
```

## API Overview

LogoBox provides two main interfaces:

1. **Default Instance (`logobox`)** - Pre-configured instance for immediate use
2. **Class-based API (`LogoBoxAPI`)** - For custom configurations and multiple instances

### Default Instance
```javascript
import { logobox } from 'logobox';

// Ready to use immediately
const logo = await logobox.getBySlug('github');
```

### Class-based API
```javascript
import { LogoBoxAPI } from 'logobox';

const api = new LogoBoxAPI({
  baseUrl: 'https://custom-api.example.com',
  cdnUrl: 'https://custom-cdn.example.com'
});

const logo = await api.getBySlug('github');
```

## Core API Methods

### `search(query: SearchQuery): Promise<SearchResult>`

Advanced search with filtering, pagination, and faceted results.

**Parameters:**
- `query` (SearchQuery): Search query object

**Returns:** Promise<SearchResult> - Comprehensive search results

**Example:**
```javascript
const result = await logobox.search({
  text: 'microsoft',
  categories: ['technology', 'enterprise'],
  tags: ['software', 'cloud'],
  limit: 20,
  offset: 0,
  sortBy: 'name',
  sortOrder: 'asc'
});

console.log(result.logos);           // Array of matching logos
console.log(result.total);           // Total number of matches
console.log(result.facets);          // Available filters
console.log(result.executionTime);   // Search performance metrics
```

**SearchQuery Interface:**
```typescript
interface SearchQuery {
  text?: string;              // Text search across names, descriptions, tags
  categories?: string[];      // Filter by categories
  tags?: string[];           // Filter by tags (all must match)
  limit?: number;            // Maximum results (default: 50)
  offset?: number;           // Pagination offset (default: 0)
  sortBy?: 'name' | 'createdAt' | 'updatedAt' | 'popularity';
  sortOrder?: 'asc' | 'desc';
}
```

**SearchResult Interface:**
```typescript
interface SearchResult {
  logos: Logo[];              // Array of matching logos
  total: number;              // Total matches (before pagination)
  offset: number;             // Current offset
  limit: number;              // Current limit
  facets: SearchFacets;       // Available filters with counts
  executionTime: number;      // Query execution time in ms
}
```

### `searchText(text: string): Promise<LogoMetadata[]>`

Simple text search across logo names, descriptions, and tags.

**Parameters:**
- `text` (string): Search query text

**Returns:** Promise<LogoMetadata[]> - Array of matching logos

**Example:**
```javascript
const logos = await logobox.searchText('version control');
console.log(logos); // Array of logos matching the search term
```

### `getBySlug(slug: string): Promise<LogoMetadata | null>`

Retrieve detailed information about a specific logo by its unique identifier.

**Parameters:**
- `slug` (string): Logo identifier (e.g., 'github', 'microsoft')

**Returns:** Promise<LogoMetadata | null> - Logo metadata or null if not found

**Example:**
```javascript
const logo = await logobox.getBySlug('github');
if (logo) {
  console.log(logo.name);        // "GitHub"
  console.log(logo.categories);  // ["technology", "development"]
  console.log(logo.tags);        // ["git", "version-control", ...]
  console.log(logo.variants);    // URLs for all logo variants
}
```

### `getByCategory(category: string): Promise<LogoMetadata[]>`

Get all logos belonging to a specific category.

**Parameters:**
- `category` (string): Category name

**Returns:** Promise<LogoMetadata[]> - Array of logos in the category

**Example:**
```javascript
const techLogos = await logobox.getByCategory('technology');
console.log(techLogos.length); // Number of technology logos
```

### `getByTags(tags: string[]): Promise<LogoMetadata[]>`

Get logos that have ALL specified tags.

**Parameters:**
- `tags` (string[]): Array of tag names (all must match)

**Returns:** Promise<LogoMetadata[]> - Array of matching logos

**Example:**
```javascript
const gitLogos = await logobox.getByTags(['git', 'version-control']);
console.log(gitLogos); // Logos that have both 'git' AND 'version-control' tags
```

### `getAllCategories(): Promise<string[]>`

Get a list of all available categories.

**Returns:** Promise<string[]> - Sorted array of category names

**Example:**
```javascript
const categories = await logobox.getAllCategories();
console.log(categories); // ['cloud', 'development', 'enterprise', ...]
```

### `getAllTags(): Promise<string[]>`

Get a list of all available tags.

**Returns:** Promise<string[]> - Sorted array of tag names

**Example:**
```javascript
const tags = await logobox.getAllTags();
console.log(tags); // ['api', 'cloud', 'database', 'framework', ...]
```

## Logo Retrieval

### Logo Metadata Structure

```typescript
interface LogoMetadata {
  name: string;              // Display name
  slug: string;              // Unique identifier
  description?: string;      // Optional description
  categories: string[];      // Categories this logo belongs to
  tags: string[];           // Associated tags
  license: string;          // License type
  variants: LogoVariants;   // URLs for all variants
  formats: {                // Available formats
    svg: LogoFormat;
    png?: {
      '64': LogoFormat;
      '128': LogoFormat;
      '256': LogoFormat;
    };
  };
  fileStats?: FileStats;    // File statistics
}
```

### Logo Variants

Each logo is available in multiple variants:

- **`original`** - The original logo as provided
- **`white`** - White version for dark backgrounds
- **`black`** - Black version for light backgrounds  
- **`optimized`** - Size-optimized version

```javascript
const logo = await logobox.getBySlug('github');
console.log(logo.variants.original);   // Original logo URL
console.log(logo.variants.white);      // White variant URL
console.log(logo.variants.black);      // Black variant URL
console.log(logo.variants.optimized);  // Optimized variant URL
```

## URL Generation

### `getLogoUrl(slug: string, variant?: LogoVariant): string`

Generate a CDN URL for a logo variant.

**Parameters:**
- `slug` (string): Logo identifier
- `variant` (LogoVariant, optional): Logo variant (default: 'original')

**Returns:** string - CDN URL for the logo

**Example:**
```javascript
// Get different variants
const originalUrl = logobox.getLogoUrl('github');              // Original
const whiteUrl = logobox.getLogoUrl('github', 'white');        // White variant
const blackUrl = logobox.getLogoUrl('github', 'black');        // Black variant
const optimizedUrl = logobox.getLogoUrl('github', 'optimized'); // Optimized

// Use in HTML
const img = `<img src="${logobox.getLogoUrl('github', 'white')}" alt="GitHub">`;
```

**LogoVariant Type:**
```typescript
type LogoVariant = 'original' | 'white' | 'black' | 'optimized';
```

## Configuration

### `configure(config: Partial<LogoBoxConfig>): void`

Configure LogoBox settings globally.

**Parameters:**
- `config` (Partial<LogoBoxConfig>): Configuration options

**Example:**
```javascript
logobox.configure({
  baseUrl: 'https://api.logobox.dev',
  cdnUrl: 'https://cdn.logobox.dev',
  defaultVariant: 'white',
  cache: {
    enabled: true,
    ttl: 3600000 // 1 hour in milliseconds
  }
});
```

**LogoBoxConfig Interface:**
```typescript
interface LogoBoxConfig {
  baseUrl?: string;           // API base URL
  cdnUrl?: string;           // CDN base URL for assets
  defaultVariant?: LogoVariant; // Default variant for getLogoUrl()
  cache?: {
    enabled: boolean;         // Enable/disable caching
    ttl: number;             // Cache TTL in milliseconds
  };
}
```

### Environment Variables

LogoBox respects the following environment variables:

```bash
# API Configuration
LOGOBOX_BASE_URL=https://api.logobox.dev
LOGOBOX_CDN_BASE_URL=https://cdn.logobox.dev
LOGOBOX_DEFAULT_VARIANT=original

# Cache Configuration
LOGOBOX_CACHE_ENABLED=true
LOGOBOX_CACHE_TTL=3600000
```

## Error Handling

LogoBox provides comprehensive error handling with structured error codes and detailed error information.

### LogoBoxError Class

```typescript
class LogoBoxError extends Error {
  public readonly code: string;
  public readonly details?: Record<string, unknown>;
  
  constructor(message: string, code: string, details?: Record<string, unknown>);
}
```

### Error Codes

```javascript
import { ERROR_CODES } from 'logobox';

// Available error codes
ERROR_CODES.LOGO_NOT_FOUND           // Logo does not exist
ERROR_CODES.INVALID_SLUG             // Invalid logo slug format
ERROR_CODES.INVALID_VARIANT          // Invalid logo variant
ERROR_CODES.INVALID_CATEGORY         // Invalid category name
ERROR_CODES.INVALID_TAGS             // Invalid tags array
ERROR_CODES.INVALID_SEARCH_QUERY     // Invalid search parameters
ERROR_CODES.CATALOG_LOAD_ERROR       // Failed to load logo catalog
ERROR_CODES.CATALOG_VALIDATION_ERROR // Catalog validation failed
ERROR_CODES.NETWORK_ERROR            // Network-related errors
ERROR_CODES.CONFIGURATION_ERROR      // Configuration errors
ERROR_CODES.FILE_SYSTEM_ERROR        // File system errors
ERROR_CODES.TIMEOUT_ERROR            // Request timeout
ERROR_CODES.RATE_LIMIT_ERROR         // Rate limit exceeded
```

### Error Handling Examples

```javascript
import { LogoBoxError, ERROR_CODES } from 'logobox';

try {
  const logo = await logobox.getBySlug('invalid-slug');
} catch (error) {
  if (error instanceof LogoBoxError) {
    console.log('Error code:', error.code);
    console.log('Error message:', error.message);
    console.log('Error details:', error.details);
    
    switch (error.code) {
      case ERROR_CODES.INVALID_SLUG:
        console.log('Please provide a valid logo slug');
        break;
      case ERROR_CODES.NETWORK_ERROR:
        console.log('Network error, please try again');
        break;
      case ERROR_CODES.CATALOG_LOAD_ERROR:
        console.log('Failed to load logo catalog');
        break;
      default:
        console.log('An unexpected error occurred');
    }
  }
}
```

### Graceful Degradation

LogoBox is designed to degrade gracefully when errors occur:

```javascript
// These methods return empty results instead of throwing errors
// when the catalog is unavailable or network issues occur

const logos = await logobox.searchText('github');        // Returns []
const categories = await logobox.getAllCategories();     // Returns []
const tags = await logobox.getAllTags();                // Returns []
const logo = await logobox.getBySlug('github');         // Returns null
const categoryLogos = await logobox.getByCategory('tech'); // Returns []
const tagLogos = await logobox.getByTags(['git']);      // Returns []
```

## TypeScript Support

LogoBox is built with TypeScript and provides comprehensive type definitions.

### Core Types

```typescript
import {
  // Main API interfaces
  LogoBoxAPI,
  logobox,
  
  // Data types
  LogoMetadata,
  Logo,
  LogoVariants,
  LogoFormat,
  LogoFormats,
  
  // Search types
  SearchQuery,
  SearchResult,
  SearchFacets,
  
  // Configuration types
  LogoBoxConfig,
  
  // Error types
  LogoBoxError,
  ERROR_CODES,
  
  // Utility types
  LogoVariant,
  LogoFormatType,
  PngSize,
  
  // Catalog types
  Catalog,
  Category,
  Tag,
  License
} from 'logobox';
```

### Type-Safe Usage

```typescript
// Typed search query
const query: SearchQuery = {
  text: 'github',
  categories: ['technology'],
  tags: ['git', 'version-control'],
  limit: 10,
  offset: 0
};

// Typed results
const result: SearchResult = await logobox.search(query);

// Type-safe logo access
const logo: LogoMetadata | null = await logobox.getBySlug('github');
if (logo) {
  const logoName: string = logo.name;
  const logoCategories: string[] = logo.categories;
  const logoTags: string[] = logo.tags;
}

// Type-safe URL generation
const variant: LogoVariant = 'white';
const url: string = logobox.getLogoUrl('github', variant);
```

### Generic Types

```typescript
// Custom logo processing function
function processLogos<T extends LogoMetadata>(
  logos: T[],
  processor: (logo: T) => T
): T[] {
  return logos.map(processor);
}

// Usage
const processedLogos = processLogos(
  await logobox.searchText('technology'),
  (logo) => ({
    ...logo,
    processedAt: new Date().toISOString()
  })
);
```

## Advanced Usage

### Batch Operations

```javascript
// Process multiple logos efficiently
const logoSlugs = ['github', 'microsoft', 'google', 'apple'];

// Parallel retrieval
const logos = await Promise.all(
  logoSlugs.map(slug => logobox.getBySlug(slug))
);

// Filter out null results
const validLogos = logos.filter(logo => logo !== null);

// Generate URLs for all variants
const logoUrls = logoSlugs.map(slug => ({
  slug,
  urls: {
    original: logobox.getLogoUrl(slug, 'original'),
    white: logobox.getLogoUrl(slug, 'white'),
    black: logobox.getLogoUrl(slug, 'black'),
    optimized: logobox.getLogoUrl(slug, 'optimized')
  }
}));
```

### Custom Search Logic

```javascript
// Complex search with custom filtering
async function findLogosWithCustomCriteria() {
  // Get all technology logos
  const techLogos = await logobox.getByCategory('technology');
  
  // Filter by multiple criteria
  const filteredLogos = techLogos.filter(logo => {
    // Must have specific tags
    const hasRequiredTags = ['api', 'cloud'].some(tag => 
      logo.tags.includes(tag)
    );
    
    // Must not be in certain categories
    const excludeCategories = ['deprecated', 'legacy'];
    const notExcluded = !logo.categories.some(cat => 
      excludeCategories.includes(cat)
    );
    
    return hasRequiredTags && notExcluded;
  });
  
  // Sort by name
  return filteredLogos.sort((a, b) => a.name.localeCompare(b.name));
}
```

### Caching Strategy

```javascript
// Implement custom caching layer
class LogoCache {
  private cache = new Map();
  private ttl = 3600000; // 1 hour
  
  async getWithCache(key: string, fetcher: () => Promise<any>) {
    const cached = this.cache.get(key);
    
    if (cached && Date.now() - cached.timestamp < this.ttl) {
      return cached.data;
    }
    
    const data = await fetcher();
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
    
    return data;
  }
  
  async getCachedLogo(slug: string) {
    return this.getWithCache(`logo:${slug}`, () => 
      logobox.getBySlug(slug)
    );
  }
}

const cache = new LogoCache();
const logo = await cache.getCachedLogo('github');
```

### Integration Patterns

#### React Hook
```typescript
import { useState, useEffect } from 'react';
import { logobox, LogoMetadata } from 'logobox';

function useLogoSearch(query: string) {
  const [logos, setLogos] = useState<LogoMetadata[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  useEffect(() => {
    if (!query.trim()) {
      setLogos([]);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    logobox.searchText(query)
      .then(setLogos)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [query]);
  
  return { logos, loading, error };
}

// Usage in component
function LogoSearchComponent() {
  const [query, setQuery] = useState('');
  const { logos, loading, error } = useLogoSearch(query);
  
  return (
    <div>
      <input 
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search logos..."
      />
      
      {loading && <div>Loading...</div>}
      {error && <div>Error: {error.message}</div>}
      
      <div className="logo-grid">
        {logos.map(logo => (
          <div key={logo.slug}>
            <img 
              src={logobox.getLogoUrl(logo.slug)} 
              alt={logo.name}
            />
            <h3>{logo.name}</h3>
          </div>
        ))}
      </div>
    </div>
  );
}
```

#### Vue Composable
```typescript
import { ref, computed, watch } from 'vue';
import { logobox, LogoMetadata } from 'logobox';

export function useLogoSearch() {
  const query = ref('');
  const logos = ref<LogoMetadata[]>([]);
  const loading = ref(false);
  const error = ref<Error | null>(null);
  
  const searchLogos = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      logos.value = [];
      return;
    }
    
    loading.value = true;
    error.value = null;
    
    try {
      logos.value = await logobox.searchText(searchQuery);
    } catch (err) {
      error.value = err as Error;
    } finally {
      loading.value = false;
    }
  };
  
  watch(query, searchLogos, { immediate: true });
  
  return {
    query,
    logos: computed(() => logos.value),
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    searchLogos
  };
}
```

## Performance Optimization

### Best Practices

1. **Enable Caching**
```javascript
logobox.configure({
  cache: {
    enabled: true,
    ttl: 3600000 // 1 hour
  }
});
```

2. **Use Batch Operations**
```javascript
// Instead of multiple individual calls
const logos = await Promise.all([
  logobox.getBySlug('github'),
  logobox.getBySlug('microsoft'),
  logobox.getBySlug('google')
]);
```

3. **Implement Debouncing for Search**
```javascript
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

const debouncedSearch = debounce(async (query) => {
  const results = await logobox.searchText(query);
  // Handle results
}, 300);
```

4. **Lazy Loading**
```javascript
// Load logo data only when needed
const LazyLogoComponent = {
  data() {
    return {
      logo: null,
      loaded: false
    };
  },
  async mounted() {
    if (this.slug && !this.loaded) {
      this.logo = await logobox.getBySlug(this.slug);
      this.loaded = true;
    }
  }
};
```

### Performance Monitoring

```javascript
// Monitor API performance
const performanceWrapper = {
  async search(query) {
    const start = performance.now();
    try {
      const result = await logobox.search(query);
      const duration = performance.now() - start;
      console.log(`Search took ${duration}ms`);
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      console.log(`Search failed after ${duration}ms:`, error);
      throw error;
    }
  }
};
```

## Migration Guide

### From v1.x to v2.x

#### Breaking Changes

1. **Search API Changes**
```javascript
// v1.x
const results = logobox.search('github');

// v2.x
const results = await logobox.searchText('github');
// or
const results = await logobox.search({ text: 'github' });
```

2. **Error Handling**
```javascript
// v1.x
try {
  const logo = logobox.getLogo('github');
} catch (error) {
  console.log(error.message);
}

// v2.x
try {
  const logo = await logobox.getBySlug('github');
} catch (error) {
  if (error instanceof LogoBoxError) {
    console.log(error.code, error.message);
  }
}
```

3. **Configuration**
```javascript
// v1.x
logobox.setConfig({ apiUrl: 'https://api.example.com' });

// v2.x
logobox.configure({ baseUrl: 'https://api.example.com' });
```

#### Migration Steps

1. **Update imports**
```javascript
// Old
import logobox from 'logobox';

// New
import { logobox } from 'logobox';
```

2. **Update method calls**
```javascript
// Old synchronous calls
const logo = logobox.getLogo('github');
const results = logobox.search('query');

// New async calls
const logo = await logobox.getBySlug('github');
const results = await logobox.searchText('query');
```

3. **Update error handling**
```javascript
// Add proper error handling for async operations
import { LogoBoxError, ERROR_CODES } from 'logobox';

try {
  const logo = await logobox.getBySlug('github');
} catch (error) {
  if (error instanceof LogoBoxError) {
    // Handle LogoBox-specific errors
    switch (error.code) {
      case ERROR_CODES.LOGO_NOT_FOUND:
        // Handle not found
        break;
      case ERROR_CODES.NETWORK_ERROR:
        // Handle network issues
        break;
    }
  }
}
```

---

## Support and Resources

- **GitHub Repository**: [https://github.com/logobox/logobox](https://github.com/logobox/logobox)
- **Issue Tracker**: [https://github.com/logobox/logobox/issues](https://github.com/logobox/logobox/issues)
- **Documentation**: [https://docs.logobox.dev](https://docs.logobox.dev)
- **Examples**: [https://github.com/logobox/logobox/tree/main/examples](https://github.com/logobox/logobox/tree/main/examples)

---

*This documentation is for LogoBox v2.x. For older versions, see the [legacy documentation](./API_LEGACY.md).*