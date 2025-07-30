# LogoBox API Documentation

This document provides a comprehensive overview of the LogoBox NPM package API for programmatic access to high-quality logos and icons.

## Quick Links

- **[Complete API Reference](./API_REFERENCE.md)** - Detailed API documentation
- **[Usage Examples](./USAGE_EXAMPLES.md)** - Framework integrations and examples
- **[Website Features](./WEBSITE_FEATURES.md)** - Web interface documentation

## Installation

```bash
npm install logobox
```

```bash
yarn add logobox
```

```bash
pnpm add logobox
```

## Quick Start

```javascript
import { logobox } from 'logobox';

// Get a logo URL instantly
const githubLogo = logobox.getLogoUrl('github');
console.log(githubLogo); // https://cdn.logobox.dev/logos/github/logo.svg

// Search for logos
const results = await logobox.searchText('technology');

// Get detailed logo information
const logo = await logobox.getBySlug('github');

// Get logos by category
const devLogos = await logobox.getByCategory('development');
```

## Core API Methods

### Search and Discovery

#### `search(query: SearchQuery): Promise<SearchResult>`
Advanced search with filtering, pagination, and faceted results.

```javascript
const result = await logobox.search({
  text: 'microsoft',
  categories: ['technology'],
  tags: ['software'],
  limit: 20,
  offset: 0
});

console.log(result.logos);      // Array of matching logos
console.log(result.total);      // Total number of matches
console.log(result.facets);     // Available filters
```

#### `searchText(query: string): Promise<LogoMetadata[]>`
Simple text search across logo names, descriptions, and tags.

```javascript
const logos = await logobox.searchText('version control');
```

### Logo Retrieval

#### `getBySlug(slug: string): Promise<LogoMetadata | null>`
Get detailed information about a specific logo.

```javascript
const logo = await logobox.getBySlug('github');
if (logo) {
  console.log(logo.name);        // "GitHub"
  console.log(logo.categories);  // ["technology", "development"]
  console.log(logo.variants);    // URLs for all variants
}
```

#### `getByCategory(category: string): Promise<LogoMetadata[]>`
Get all logos in a specific category.

```javascript
const techLogos = await logobox.getByCategory('technology');
```

#### `getByTags(tags: string[]): Promise<LogoMetadata[]>`
Get logos that have ALL specified tags.

```javascript
const gitLogos = await logobox.getByTags(['git', 'version-control']);
```

### Utility Methods

#### `getAllCategories(): Promise<string[]>`
Get list of all available categories.

```javascript
const categories = await logobox.getAllCategories();
```

#### `getAllTags(): Promise<string[]>`
Get list of all available tags.

```javascript
const tags = await logobox.getAllTags();
```

#### `getLogoUrl(slug: string, variant?: LogoVariant): string`
Generate a CDN URL for a logo variant.

```javascript
const originalUrl = logobox.getLogoUrl('github');              // Original
const whiteUrl = logobox.getLogoUrl('github', 'white');        // White variant
const blackUrl = logobox.getLogoUrl('github', 'black');        // Black variant
```

#### `configure(config: Partial<LogoBoxConfig>): void`
Configure LogoBox settings.

```javascript
logobox.configure({
  cdnUrl: 'https://custom-cdn.example.com',
  defaultVariant: 'white',
  cache: { enabled: true, ttl: 3600000 }
});
```

## TypeScript Support

LogoBox is built with TypeScript and provides comprehensive type definitions:

```typescript
import { 
  logobox, 
  LogoMetadata, 
  SearchQuery, 
  SearchResult,
  LogoBoxError,
  ERROR_CODES 
} from 'logobox';

// Typed search
const query: SearchQuery = {
  text: 'github',
  categories: ['technology'],
  limit: 10
};

const result: SearchResult = await logobox.search(query);
```

### Core Types

#### LogoMetadata
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
}
```

#### SearchQuery
```typescript
interface SearchQuery {
  text?: string;              // Text search
  categories?: string[];      // Filter by categories
  tags?: string[];           // Filter by tags
  limit?: number;            // Maximum results
  offset?: number;           // Pagination offset
  sortBy?: 'name' | 'createdAt' | 'updatedAt' | 'popularity';
  sortOrder?: 'asc' | 'desc';
}
```

#### SearchResult
```typescript
interface SearchResult {
  logos: Logo[];              // Array of matching logos
  total: number;              // Total matches
  offset: number;             // Current offset
  limit: number;              // Current limit
  facets: SearchFacets;       // Available filters
  executionTime: number;      // Query time in ms
}
```

## Error Handling

LogoBox provides comprehensive error handling with structured error codes:

```javascript
import { logobox, LogoBoxError, ERROR_CODES } from 'logobox';

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
    }
  }
}
```

### Available Error Codes

- `LOGO_NOT_FOUND` - Logo does not exist
- `INVALID_SLUG` - Invalid logo slug format
- `INVALID_VARIANT` - Invalid logo variant
- `INVALID_CATEGORY` - Invalid category name
- `INVALID_TAGS` - Invalid tags array
- `INVALID_SEARCH_QUERY` - Invalid search parameters
- `CATALOG_LOAD_ERROR` - Failed to load logo catalog
- `NETWORK_ERROR` - Network-related errors
- `CONFIGURATION_ERROR` - Configuration errors

### Graceful Degradation

LogoBox is designed to degrade gracefully when errors occur:

```javascript
// These methods return empty results instead of throwing errors
// when the catalog is unavailable
const logos = await logobox.searchText('github');        // Returns []
const categories = await logobox.getAllCategories();     // Returns []
const logo = await logobox.getBySlug('github');         // Returns null
```

## Framework Integration Examples

### React Hook

```jsx
import { useState, useEffect } from 'react';
import { logobox } from 'logobox';

function useLogoSearch(query) {
  const [logos, setLogos] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query) return;
    
    setLoading(true);
    logobox.searchText(query)
      .then(setLogos)
      .finally(() => setLoading(false));
  }, [query]);

  return { logos, loading };
}

// Usage in component
function LogoSearch() {
  const [query, setQuery] = useState('');
  const { logos, loading } = useLogoSearch(query);

  return (
    <div>
      <input 
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search logos..."
      />
      {loading && <div>Loading...</div>}
      <div className="logo-grid">
        {logos.map(logo => (
          <img 
            key={logo.slug}
            src={logobox.getLogoUrl(logo.slug)} 
            alt={logo.name}
          />
        ))}
      </div>
    </div>
  );
}
```

### Vue Composable

```javascript
// composables/useLogoSearch.js
import { ref, watch } from 'vue';
import { logobox } from 'logobox';

export function useLogoSearch() {
  const query = ref('');
  const logos = ref([]);
  const loading = ref(false);

  watch(query, async (newQuery) => {
    if (!newQuery) {
      logos.value = [];
      return;
    }

    loading.value = true;
    try {
      logos.value = await logobox.searchText(newQuery);
    } finally {
      loading.value = false;
    }
  });

  return { query, logos, loading };
}
```

### Node.js API Server

```javascript
const express = require('express');
const { logobox } = require('logobox');

const app = express();

app.get('/api/logos/search', async (req, res) => {
  try {
    const { q, category, limit = 20 } = req.query;
    
    const result = await logobox.search({
      text: q,
      categories: category ? [category] : undefined,
      limit: parseInt(limit)
    });
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000);
```

## Performance Best Practices

### Caching

```javascript
// Enable caching for better performance
logobox.configure({
  cache: {
    enabled: true,
    ttl: 3600000 // 1 hour
  }
});
```

### Batch Operations

```javascript
// Process multiple logos efficiently
const logoSlugs = ['github', 'microsoft', 'google'];

const logos = await Promise.all(
  logoSlugs.map(slug => logobox.getBySlug(slug))
);

// Generate URLs for all variants
const urls = logoSlugs.map(slug => ({
  slug,
  original: logobox.getLogoUrl(slug, 'original'),
  white: logobox.getLogoUrl(slug, 'white'),
  black: logobox.getLogoUrl(slug, 'black')
}));
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for information about contributing to the LogoBox project.

## License

MIT License - see LICENSE file for details.