# LogoBox NPM Package

[![npm version](https://badge.fury.io/js/logobox.svg)](https://badge.fury.io/js/logobox)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](http://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Programmatic access to high-quality logos and icons with TypeScript support. LogoBox provides a simple, fast, and reliable way to access thousands of company logos and brand assets in your applications.

## 🚀 Features

- **🎯 Simple API** - Easy-to-use interface for logo discovery and retrieval
- **🔍 Advanced Search** - Text search, category filtering, and tag-based discovery
- **🎨 Multiple Variants** - Original, white, black, and colored logo variants
- **⚡ High Performance** - Built-in caching and CDN-optimized delivery
- **📦 TypeScript First** - Full TypeScript support with comprehensive type definitions
- **🌐 Universal** - Works in Node.js, browsers, and edge environments
- **📱 Modern Standards** - ES modules, CommonJS, and UMD support

## 📦 Installation

```bash
npm install logobox
```

```bash
yarn add logobox
```

```bash
pnpm add logobox
```

## 🏁 Quick Start

### ES Modules (Recommended)

```javascript
import { logobox } from 'logobox';

// Get a logo URL
const githubLogo = logobox.getLogoUrl('github');
console.log(githubLogo); // https://cdn.logobox.com/logos/github/logo.svg

// Search for logos
const techLogos = await logobox.searchText('technology');
console.log(techLogos); // Array of matching logos
```

### CommonJS

```javascript
const { logobox } = require('logobox');

// Same API as ES modules
const githubLogo = logobox.getLogoUrl('github');
```

### TypeScript

```typescript
import { logobox, LogoBoxAPI, LogoSearchQuery } from 'logobox';

// Full type safety
const query: LogoSearchQuery = {
  text: 'github',
  categories: ['technology'],
  limit: 10
};

const results = await logobox.search(query);
```

## 📚 Documentation

### Complete Documentation

- **[API Reference](../docs/API_REFERENCE.md)** - Complete API documentation with all methods and types
- **[Usage Examples](../docs/USAGE_EXAMPLES.md)** - Framework integrations and real-world examples  
- **[Website Features](../docs/WEBSITE_FEATURES.md)** - Web interface documentation

### Quick API Reference

#### Core Instance: `logobox`

The main instance provides a simple interface for common operations:

#### `getLogoUrl(slug: string, variant?: LogoVariant): string`

Generate a CDN URL for a logo.

```javascript
// Basic usage
logobox.getLogoUrl('github'); // Original variant
logobox.getLogoUrl('github', 'white'); // White variant
logobox.getLogoUrl('github', 'black'); // Black variant
```

**Parameters:**
- `slug` (string): The logo identifier (e.g., 'github', 'microsoft')
- `variant` (LogoVariant): Logo variant - 'original', 'white', 'black' (default: 'original')

**Returns:** CDN URL string

#### `searchText(query: string): Promise<Logo[]>`

Simple text search across logo names, descriptions, and tags.

```javascript
const results = await logobox.searchText('version control');
// Returns array of matching logos
```

#### `search(query: LogoSearchQuery): Promise<LogoSearchResult>`

Advanced search with filters and pagination.

```javascript
const result = await logobox.search({
  text: 'microsoft',
  categories: ['technology', 'enterprise'],
  tags: ['software'],
  limit: 20,
  offset: 0
});

console.log(result.logos);      // Array of logos
console.log(result.total);      // Total matching results
console.log(result.facets);     // Available filters
```

#### `getBySlug(slug: string): Promise<Logo | null>`

Get detailed information about a specific logo.

```javascript
const logo = await logobox.getBySlug('github');
if (logo) {
  console.log(logo.name);        // "GitHub"
  console.log(logo.categories);  // ["technology", "development"]
  console.log(logo.tags);        // ["git", "version-control", ...]
}
```

#### `getByCategory(category: string): Promise<Logo[]>`

Get all logos in a specific category.

```javascript
const techLogos = await logobox.getByCategory('technology');
```

#### `getByTags(tags: string[]): Promise<Logo[]>`

Get logos that have ALL specified tags.

```javascript
const gitLogos = await logobox.getByTags(['git', 'version-control']);
```

#### `getAllCategories(): Promise<string[]>`

Get list of all available categories.

```javascript
const categories = await logobox.getAllCategories();
// ['technology', 'enterprise', 'development', ...]
```

#### `getAllTags(): Promise<string[]>`

Get list of all available tags.

```javascript
const tags = await logobox.getAllTags();
// ['git', 'software', 'cloud', ...]
```

#### `configure(config: Partial<LogoBoxConfig>): void`

Configure LogoBox settings.

```javascript
logobox.configure({
  cdnUrl: 'https://your-custom-cdn.com',
  defaultVariant: 'white',
  cache: {
    enabled: true,
    ttl: 3600000 // 1 hour
  }
});
```

### Class-based API: `LogoBoxAPI`

For more control, use the class-based API:

```javascript
import { LogoBoxAPI } from 'logobox';

const api = new LogoBoxAPI({
  baseUrl: 'https://api.logobox.com',
  cdnUrl: 'https://cdn.logobox.com'
});

// Same methods as logobox instance
const logo = await api.getBySlug('github');
```

## 🎨 Logo Variants

LogoBox provides multiple variants for each logo:

- **`original`** - The original logo as provided by the company
- **`white`** - White version, suitable for dark backgrounds
- **`black`** - Black version, suitable for light backgrounds

```javascript
const urls = {
  original: logobox.getLogoUrl('github', 'original'),
  white: logobox.getLogoUrl('github', 'white'),
  black: logobox.getLogoUrl('github', 'black')
};
```

## 🔍 Search and Discovery

### Text Search

Search across logo names, descriptions, and tags:

```javascript
const results = await logobox.searchText('cloud computing');
```

### Advanced Search

Use structured queries for precise filtering:

```javascript
const result = await logobox.search({
  text: 'amazon',
  categories: ['technology', 'cloud'],
  tags: ['aws', 'cloud-computing'],
  limit: 10,
  offset: 0
});

// Access results
console.log(result.logos);           // Matching logos
console.log(result.total);           // Total count
console.log(result.facets);          // Available filters
console.log(result.executionTime);   // Search performance
```

### Category-based Discovery

Explore logos by category:

```javascript
// Get all categories
const categories = await logobox.getAllCategories();

// Get logos in a category
const enterpriseLogos = await logobox.getByCategory('enterprise');
```

### Tag-based Filtering

Filter by specific tags:

```javascript
// Get all tags
const tags = await logobox.getAllTags();

// Get logos with specific tags
const cloudLogos = await logobox.getByTags(['cloud', 'infrastructure']);
```

## ⚙️ Configuration

Customize LogoBox behavior:

```javascript
logobox.configure({
  // API endpoint (usually not needed)
  baseUrl: 'https://api.logobox.com',
  
  // CDN endpoint for logo assets
  cdnUrl: 'https://cdn.logobox.com',
  
  // Default variant for getLogoUrl()
  defaultVariant: 'original',
  
  // Caching settings
  cache: {
    enabled: true,
    ttl: 3600000 // Cache TTL in milliseconds
  }
});
```

## 🚨 Error Handling

LogoBox uses custom error types for better error handling:

```javascript
import { LogoBoxError, ERROR_CODES } from 'logobox';

try {
  const logo = await logobox.getBySlug('invalid-slug');
} catch (error) {
  if (error instanceof LogoBoxError) {
    console.log(error.code);     // ERROR_CODES.INVALID_SLUG
    console.log(error.message);  // Human-readable message
    console.log(error.details);  // Additional error context
  }
}
```

### Error Codes

```javascript
import { ERROR_CODES } from 'logobox';

ERROR_CODES.INVALID_SLUG           // Invalid logo slug
ERROR_CODES.INVALID_VARIANT        // Invalid logo variant
ERROR_CODES.INVALID_SEARCH_QUERY   // Invalid search parameters
ERROR_CODES.INVALID_CATEGORY       // Invalid category
ERROR_CODES.INVALID_TAGS           // Invalid tags
ERROR_CODES.CATALOG_LOAD_ERROR     // Failed to load logo catalog
ERROR_CODES.NETWORK_ERROR          // Network-related errors
```

## 📝 TypeScript Support

LogoBox is built with TypeScript and provides comprehensive type definitions:

```typescript
import { 
  LogoBoxAPI, 
  logobox, 
  Logo, 
  LogoVariant, 
  LogoSearchQuery, 
  LogoSearchResult,
  LogoBoxConfig,
  LogoBoxError,
  ERROR_CODES 
} from 'logobox';

// Typed search query
const query: LogoSearchQuery = {
  text: 'github',
  categories: ['technology'],
  tags: ['git', 'version-control'],
  limit: 10,
  offset: 0
};

// Typed results
const result: LogoSearchResult = await logobox.search(query);

// Logo interface
interface Logo {
  name: string;
  slug: string;
  description: string;
  categories: string[];
  tags: string[];
  website: string;
  variants: LogoVariant[];
}
```

## 🌐 Usage Examples

### React Component

```jsx
import React, { useState, useEffect } from 'react';
import { logobox } from 'logobox';

function LogoSearch() {
  const [logos, setLogos] = useState([]);
  const [query, setQuery] = useState('');

  const searchLogos = async (searchQuery) => {
    try {
      const results = await logobox.searchText(searchQuery);
      setLogos(results);
    } catch (error) {
      console.error('Search failed:', error);
    }
  };

  return (
    <div>
      <input 
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && searchLogos(query)}
        placeholder="Search logos..."
      />
      
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

### Vue Component

```vue
<template>
  <div>
    <input 
      v-model="query" 
      @keyup.enter="searchLogos"
      placeholder="Search logos..."
    >
    
    <div class="logo-grid">
      <div v-for="logo in logos" :key="logo.slug">
        <img :src="getLogoUrl(logo.slug)" :alt="logo.name">
        <h3>{{ logo.name }}</h3>
      </div>
    </div>
  </div>
</template>

<script>
import { logobox } from 'logobox';

export default {
  data() {
    return {
      logos: [],
      query: ''
    };
  },
  methods: {
    async searchLogos() {
      try {
        this.logos = await logobox.searchText(this.query);
      } catch (error) {
        console.error('Search failed:', error);
      }
    },
    getLogoUrl(slug) {
      return logobox.getLogoUrl(slug);
    }
  }
};
</script>
```

### Node.js Server

```javascript
const express = require('express');
const { logobox } = require('logobox');

const app = express();

// API endpoint for logo search
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

// API endpoint for logo details
app.get('/api/logos/:slug', async (req, res) => {
  try {
    const logo = await logobox.getBySlug(req.params.slug);
    
    if (!logo) {
      return res.status(404).json({ error: 'Logo not found' });
    }
    
    res.json(logo);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000);
```

## 🎯 Best Practices

### 1. Error Handling

Always handle errors appropriately:

```javascript
import { LogoBoxError, ERROR_CODES } from 'logobox';

try {
  const logo = await logobox.getBySlug(userInput);
} catch (error) {
  if (error instanceof LogoBoxError) {
    switch (error.code) {
      case ERROR_CODES.INVALID_SLUG:
        showUserError('Please enter a valid logo name');
        break;
      case ERROR_CODES.NETWORK_ERROR:
        showUserError('Network error, please try again');
        break;
      default:
        showUserError('An error occurred');
    }
  }
}
```

### 2. Caching

Enable caching for better performance:

```javascript
logobox.configure({
  cache: {
    enabled: true,
    ttl: 3600000 // 1 hour
  }
});
```

### 3. Lazy Loading

Use lazy loading for better user experience:

```javascript
// Load logo data only when needed
const loadLogo = async (slug) => {
  const logo = await logobox.getBySlug(slug);
  return logo;
};
```

### 4. Batch Operations

Process multiple logos efficiently:

```javascript
const logoSlugs = ['github', 'microsoft', 'google'];

// Parallel loading
const logos = await Promise.all(
  logoSlugs.map(slug => logobox.getBySlug(slug))
);

// Generate URLs efficiently
const urls = logoSlugs.map(slug => ({
  slug,
  original: logobox.getLogoUrl(slug, 'original'),
  white: logobox.getLogoUrl(slug, 'white'),
  black: logobox.getLogoUrl(slug, 'black')
}));
```

## 🔗 Related Projects

- **[LogoBox Website](https://logobox.com)** - Browse logos visually
- **[LogoBox Repository](https://github.com/logobox/logobox)** - Source code and contributions
- **[LogoBox API](https://api.logobox.com)** - REST API documentation

## 📋 Requirements

- Node.js 16.0.0 or higher
- Modern browser with ES2020 support

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](https://github.com/logobox/logobox/blob/main/CONTRIBUTING.md) for details.

## 📞 Support

- **Documentation**: [https://docs.logobox.com](https://docs.logobox.com)
- **Issues**: [GitHub Issues](https://github.com/logobox/logobox/issues)
- **Discussions**: [GitHub Discussions](https://github.com/logobox/logobox/discussions)

---

Made with ❤️ by the LogoBox team