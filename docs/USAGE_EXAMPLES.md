# LogoBox Usage Examples

Comprehensive examples and integration guides for the LogoBox NPM package.

## Table of Contents

- [Basic Usage](#basic-usage)
- [Framework Integrations](#framework-integrations)
- [Advanced Patterns](#advanced-patterns)
- [Real-World Applications](#real-world-applications)
- [Performance Optimization](#performance-optimization)
- [Error Handling Patterns](#error-handling-patterns)

## Basic Usage

### Simple Logo Retrieval

```javascript
import { logobox } from 'logobox';

// Get a logo URL for immediate use
const githubLogo = logobox.getLogoUrl('github');
console.log(githubLogo); // https://cdn.logobox.dev/logos/github/logo.svg

// Get detailed logo information
const logo = await logobox.getBySlug('github');
if (logo) {
  console.log(`${logo.name}: ${logo.description}`);
  console.log(`Categories: ${logo.categories.join(', ')}`);
  console.log(`Tags: ${logo.tags.join(', ')}`);
}
```

### Basic Search

```javascript
// Simple text search
const techLogos = await logobox.searchText('technology');
console.log(`Found ${techLogos.length} technology-related logos`);

// Advanced search with filters
const result = await logobox.search({
  text: 'cloud',
  categories: ['technology', 'enterprise'],
  limit: 10
});

console.log(`Found ${result.total} total matches`);
console.log(`Showing ${result.logos.length} results`);
```

### Logo Variants

```javascript
const slug = 'github';

// Get all variants
const variants = {
  original: logobox.getLogoUrl(slug, 'original'),
  white: logobox.getLogoUrl(slug, 'white'),
  black: logobox.getLogoUrl(slug, 'black'),
  optimized: logobox.getLogoUrl(slug, 'optimized')
};

console.log('Available variants:', variants);

// Use appropriate variant based on background
function getLogoForBackground(slug, isDarkBackground) {
  const variant = isDarkBackground ? 'white' : 'black';
  return logobox.getLogoUrl(slug, variant);
}
```

## Framework Integrations

### React Integration

#### Basic Logo Component

```jsx
import React from 'react';
import { logobox } from 'logobox';

function Logo({ slug, variant = 'original', alt, className, ...props }) {
  const src = logobox.getLogoUrl(slug, variant);
  
  return (
    <img
      src={src}
      alt={alt || `${slug} logo`}
      className={className}
      {...props}
    />
  );
}

// Usage
function App() {
  return (
    <div>
      <Logo slug="github" variant="white" className="logo" />
      <Logo slug="microsoft" alt="Microsoft Corporation" />
    </div>
  );
}
```
#### S
earch Component with Hooks

```jsx
import React, { useState, useEffect } from 'react';
import { logobox, LogoBoxError, ERROR_CODES } from 'logobox';

function useLogoSearch(query, options = {}) {
  const [logos, setLogos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!query.trim()) {
      setLogos([]);
      return;
    }

    setLoading(true);
    setError(null);

    const searchPromise = options.advanced 
      ? logobox.search({ text: query, ...options })
      : logobox.searchText(query);

    searchPromise
      .then(result => {
        const logoData = options.advanced ? result.logos : result;
        setLogos(logoData);
      })
      .catch(err => {
        if (err instanceof LogoBoxError) {
          setError(`Search failed: ${err.message}`);
        } else {
          setError('An unexpected error occurred');
        }
      })
      .finally(() => setLoading(false));
  }, [query, JSON.stringify(options)]);

  return { logos, loading, error };
}

function LogoSearchComponent() {
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [categories, setCategories] = useState([]);

  const { logos, loading, error } = useLogoSearch(query, {
    advanced: true,
    categories: selectedCategory ? [selectedCategory] : undefined,
    limit: 20
  });

  // Load categories on mount
  useEffect(() => {
    logobox.getAllCategories().then(setCategories);
  }, []);

  return (
    <div className="logo-search">
      <form>
        <div className="search-controls">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search logos..."
            className="search-input"
          />
          
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="category-select"
          >
            <option value="">All Categories</option>
            {categories.map(category => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>
      </form>

      {loading && <div className="loading">Searching...</div>}
      {error && <div className="error">{error}</div>}

      <div className="logo-grid">
        {logos.map(logo => (
          <div key={logo.slug} className="logo-card">
            <img
              src={logobox.getLogoUrl(logo.slug)}
              alt={logo.name}
              className="logo-image"
            />
            <div className="logo-info">
              <h3>{logo.name}</h3>
              <p className="logo-categories">
                {logo.categories.join(', ')}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Vue.js Integration

#### Logo Component

```vue
<template>
  <img
    :src="logoUrl"
    :alt="alt || `${slug} logo`"
    :class="className"
    v-bind="$attrs"
  />
</template>

<script>
import { logobox } from 'logobox';

export default {
  name: 'Logo',
  props: {
    slug: {
      type: String,
      required: true
    },
    variant: {
      type: String,
      default: 'original',
      validator: value => ['original', 'white', 'black', 'optimized'].includes(value)
    },
    alt: String,
    className: String
  },
  computed: {
    logoUrl() {
      return logobox.getLogoUrl(this.slug, this.variant);
    }
  }
};
</script>
```

#### Search Composable

```javascript
// composables/useLogoSearch.js
import { ref, computed, watch } from 'vue';
import { logobox, LogoBoxError } from 'logobox';

export function useLogoSearch() {
  const query = ref('');
  const selectedCategories = ref([]);
  const logos = ref([]);
  const loading = ref(false);
  const error = ref(null);
  const categories = ref([]);

  // Load categories on initialization
  const loadFilters = async () => {
    try {
      const categoriesData = await logobox.getAllCategories();
      categories.value = categoriesData;
    } catch (err) {
      console.error('Failed to load filters:', err);
    }
  };

  const searchLogos = async () => {
    if (!query.value.trim() && !selectedCategories.value.length) {
      logos.value = [];
      return;
    }

    loading.value = true;
    error.value = null;

    try {
      const result = await logobox.search({
        text: query.value.trim() || undefined,
        categories: selectedCategories.value.length ? selectedCategories.value : undefined,
        limit: 50
      });

      logos.value = result.logos;
    } catch (err) {
      if (err instanceof LogoBoxError) {
        error.value = `Search failed: ${err.message}`;
      } else {
        error.value = 'An unexpected error occurred';
      }
    } finally {
      loading.value = false;
    }
  };

  // Watch for changes and trigger search
  watch([query, selectedCategories], searchLogos, { deep: true });

  // Initialize
  loadFilters();

  return {
    query,
    selectedCategories,
    logos: computed(() => logos.value),
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    categories: computed(() => categories.value),
    searchLogos
  };
}
```

## Advanced Patterns

### Logo Caching Service

```javascript
class LogoCacheService {
  constructor(options = {}) {
    this.cache = new Map();
    this.ttl = options.ttl || 3600000; // 1 hour
    this.maxSize = options.maxSize || 1000;
  }

  async get(key, fetcher) {
    const cached = this.cache.get(key);
    
    if (cached && Date.now() - cached.timestamp < this.ttl) {
      return cached.data;
    }

    // Clean up expired entries
    this.cleanup();

    const data = await fetcher();
    
    // Ensure cache doesn't exceed max size
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });

    return data;
  }

  cleanup() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp >= this.ttl) {
        this.cache.delete(key);
      }
    }
  }

  clear() {
    this.cache.clear();
  }

  // Specific methods for logo operations
  async getLogo(slug) {
    return this.get(`logo:${slug}`, () => logobox.getBySlug(slug));
  }

  async searchLogos(query) {
    const cacheKey = `search:${JSON.stringify(query)}`;
    return this.get(cacheKey, () => logobox.search(query));
  }

  async getCategories() {
    return this.get('categories', () => logobox.getAllCategories());
  }

  async getTags() {
    return this.get('tags', () => logobox.getAllTags());
  }
}

// Usage
const logoCache = new LogoCacheService({ ttl: 1800000, maxSize: 500 });

// Use cached methods instead of direct logobox calls
const logo = await logoCache.getLogo('github');
const categories = await logoCache.getCategories();
```

### Batch Logo Processor

```javascript
class BatchLogoProcessor {
  constructor(options = {}) {
    this.batchSize = options.batchSize || 10;
    this.delay = options.delay || 100;
  }

  async processBatch(slugs, processor) {
    const results = [];
    
    for (let i = 0; i < slugs.length; i += this.batchSize) {
      const batch = slugs.slice(i, i + this.batchSize);
      
      const batchPromises = batch.map(async (slug) => {
        try {
          const logo = await logobox.getBySlug(slug);
          return processor(logo, slug);
        } catch (error) {
          console.error(`Failed to process logo ${slug}:`, error);
          return null;
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults.filter(result => result !== null));

      // Add delay between batches to avoid overwhelming the API
      if (i + this.batchSize < slugs.length) {
        await new Promise(resolve => setTimeout(resolve, this.delay));
      }
    }

    return results;
  }

  async generateLogoCards(slugs) {
    return this.processBatch(slugs, (logo, slug) => {
      if (!logo) return null;

      return {
        slug,
        name: logo.name,
        description: logo.description,
        urls: {
          original: logobox.getLogoUrl(slug, 'original'),
          white: logobox.getLogoUrl(slug, 'white'),
          black: logobox.getLogoUrl(slug, 'black')
        },
        categories: logo.categories,
        tags: logo.tags
      };
    });
  }

  async validateLogos(slugs) {
    return this.processBatch(slugs, (logo, slug) => ({
      slug,
      exists: logo !== null,
      valid: logo && logo.name && logo.variants
    }));
  }
}

// Usage
const processor = new BatchLogoProcessor({ batchSize: 5, delay: 200 });

const logoSlugs = ['github', 'microsoft', 'google', 'apple', 'amazon'];
const logoCards = await processor.generateLogoCards(logoSlugs);
const validation = await processor.validateLogos(logoSlugs);
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

## Error Handling Patterns

### Comprehensive Error Handling

```javascript
import { LogoBoxError, ERROR_CODES } from 'logobox';

async function safeLogoOperation(operation) {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof LogoBoxError) {
      switch (error.code) {
        case ERROR_CODES.LOGO_NOT_FOUND:
          console.log('Logo not found, using fallback');
          return null;
        case ERROR_CODES.NETWORK_ERROR:
          console.log('Network error, retrying...');
          // Implement retry logic
          break;
        case ERROR_CODES.INVALID_SEARCH_QUERY:
          console.log('Invalid search parameters');
          throw new Error('Please check your search parameters');
        default:
          console.error('LogoBox error:', error.message);
          throw error;
      }
    } else {
      console.error('Unexpected error:', error);
      throw error;
    }
  }
}

// Usage
const logo = await safeLogoOperation(() => logobox.getBySlug('github'));
```

### Retry Mechanism

```javascript
async function withRetry(operation, maxRetries = 3, delay = 1000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      
      if (error instanceof LogoBoxError && 
          error.code === ERROR_CODES.NETWORK_ERROR) {
        console.log(`Attempt ${attempt} failed, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
      } else {
        throw error; // Don't retry for non-network errors
      }
    }
  }
}

// Usage
const logo = await withRetry(() => logobox.getBySlug('github'));
```

This comprehensive usage guide provides practical examples for integrating LogoBox into various frameworks and real-world applications, demonstrating best practices for error handling, performance optimization, and user experience considerations.