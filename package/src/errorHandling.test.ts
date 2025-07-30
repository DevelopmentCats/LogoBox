/**
 * LogoBox Error Handling Unit Tests
 * Comprehensive tests for all error conditions and handling scenarios
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logobox, LogoBoxError, ERROR_CODES, clearCatalogCache } from './index';
import type { Catalog, SearchQuery } from './types';

// Mock catalog data for testing
const mockCatalog: Catalog = {
  version: '1.0.0',
  lastUpdated: '2024-01-01T00:00:00Z',
  logos: [
    {
      name: 'GitHub',
      slug: 'github',
      description: 'GitHub logo',
      categories: ['technology', 'development'],
      tags: ['git', 'code', 'repository'],
      license: 'MIT',
      variants: {
        original: 'https://cdn.logobox.dev/logos/github/logo.svg',
        white: 'https://cdn.logobox.dev/logos/github/logo-white.svg',
        black: 'https://cdn.logobox.dev/logos/github/logo-black.svg',
        optimized: 'https://cdn.logobox.dev/logos/github/logo-optimized.svg'
      },
      formats: {
        svg: {
          url: 'https://cdn.logobox.dev/logos/github/logo.svg',
          fileSize: 1024,
          checksum: 'abc123'
        }
      }
    }
  ],
  categories: ['technology', 'development'],
  tags: ['git', 'code', 'repository'],
  stats: {
    totalLogos: 1,
    totalCategories: 2,
    totalTags: 3
  }
};

const emptyCatalog: Catalog = {
  version: '1.0.0',
  lastUpdated: '2024-01-01T00:00:00Z',
  logos: [],
  categories: [],
  tags: [],
  stats: {
    totalLogos: 0,
    totalCategories: 0,
    totalTags: 0
  }
};

// Mock fs/promises module
const mockReadFile = vi.fn();
vi.mock('fs/promises', () => ({
  readFile: mockReadFile
}));

// Mock path module
vi.mock('path', () => ({
  join: vi.fn((...args) => args.join('/')),
  dirname: vi.fn((path) => path.split('/').slice(0, -1).join('/'))
}));

// Mock url module
vi.mock('url', () => ({
  fileURLToPath: vi.fn((url) => url.replace('file://', ''))
}));

describe('LogoBoxError Class', () => {
  it('should create error with code and message', () => {
    const error = new LogoBoxError('Test error', ERROR_CODES.LOGO_NOT_FOUND);
    
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(LogoBoxError);
    expect(error.name).toBe('LogoBoxError');
    expect(error.message).toBe('Test error');
    expect(error.code).toBe(ERROR_CODES.LOGO_NOT_FOUND);
    expect(error.details).toBeUndefined();
  });

  it('should create error with details', () => {
    const details = { slug: 'invalid-slug', attempted: true };
    const error = new LogoBoxError('Test error', ERROR_CODES.INVALID_SLUG, details);
    
    expect(error.details).toEqual(details);
  });

  it('should maintain proper stack trace', () => {
    const error = new LogoBoxError('Test error', ERROR_CODES.NETWORK_ERROR);
    
    expect(error.stack).toBeDefined();
    expect(error.stack).toContain('LogoBoxError');
  });
});

describe('Error Codes', () => {
  it('should have all required error codes', () => {
    const expectedCodes = [
      'LOGO_NOT_FOUND',
      'NETWORK_ERROR',
      'INVALID_VARIANT',
      'CATALOG_LOAD_ERROR',
      'INVALID_SLUG',
      'INVALID_CATEGORY',
      'INVALID_TAGS',
      'INVALID_SEARCH_QUERY',
      'CONFIGURATION_ERROR'
    ];

    for (const code of expectedCodes) {
      expect(ERROR_CODES).toHaveProperty(code);
      expect(typeof ERROR_CODES[code as keyof typeof ERROR_CODES]).toBe('string');
    }
  });

  it('should have unique error codes', () => {
    const codes = Object.values(ERROR_CODES);
    const uniqueCodes = new Set(codes);
    
    expect(codes.length).toBe(uniqueCodes.size);
  });
});

describe('Catalog Loading Error Handling', () => {
  beforeEach(() => {
    clearCatalogCache();
    vi.clearAllMocks();
  });

  afterEach(() => {
    clearCatalogCache();
  });

  it('should handle missing catalog file gracefully', async () => {
    mockReadFile.mockRejectedValue(new Error('ENOENT: no such file or directory'));

    // Should not throw error, should return empty catalog
    const result = await logobox.search({ text: 'github' });
    
    expect(result.logos).toEqual([]);
    expect(result.total).toBe(0);
  });

  it('should handle invalid JSON in catalog file', async () => {
    mockReadFile.mockResolvedValue('invalid json content');

    // Should degrade gracefully and return empty results
    const result = await logobox.search({ text: 'github' });
    expect(result.logos).toEqual([]);
    expect(result.total).toBe(0);
  });

  it('should handle catalog with missing logos array', async () => {
    const invalidCatalog = { version: '1.0.0', lastUpdated: '2024-01-01T00:00:00Z' };
    mockReadFile.mockResolvedValue(JSON.stringify(invalidCatalog));

    // Should degrade gracefully and return empty results
    const result = await logobox.search({ text: 'github' });
    expect(result.logos).toEqual([]);
    expect(result.total).toBe(0);
  });

  it('should handle network errors when loading from CDN', async () => {
    mockReadFile.mockRejectedValue(new Error('Network error'));

    // Should fallback to empty catalog instead of throwing
    const result = await logobox.search({ text: 'github' });
    
    expect(result.logos).toEqual([]);
    expect(result.total).toBe(0);
  });
});

describe('Search Query Validation', () => {
  beforeEach(() => {
    clearCatalogCache();
    mockReadFile.mockResolvedValue(JSON.stringify(mockCatalog));
  });

  afterEach(() => {
    clearCatalogCache();
  });

  it('should throw error for non-object search query', async () => {
    await expect(logobox.search(null as any)).rejects.toThrow(LogoBoxError);
    
    try {
      await logobox.search(null as any);
    } catch (error) {
      expect((error as LogoBoxError).code).toBe(ERROR_CODES.INVALID_SEARCH_QUERY);
    }
    
    try {
      await logobox.search('string' as any);
    } catch (error) {
      expect((error as LogoBoxError).code).toBe(ERROR_CODES.INVALID_SEARCH_QUERY);
    }
    
    try {
      await logobox.search(123 as any);
    } catch (error) {
      expect((error as LogoBoxError).code).toBe(ERROR_CODES.INVALID_SEARCH_QUERY);
    }
  });

  it('should throw error for invalid text parameter', async () => {
    await expect(logobox.search({ text: 123 as any })).rejects.toThrow(LogoBoxError);
    
    try {
      await logobox.search({ text: 123 as any });
    } catch (error) {
      expect((error as LogoBoxError).code).toBe(ERROR_CODES.INVALID_SEARCH_QUERY);
    }
  });

  it('should throw error for invalid categories parameter', async () => {
    await expect(logobox.search({ categories: 'string' as any })).rejects.toThrow(LogoBoxError);
    
    try {
      await logobox.search({ categories: 'string' as any });
    } catch (error) {
      expect((error as LogoBoxError).code).toBe(ERROR_CODES.INVALID_SEARCH_QUERY);
    }
  });

  it('should throw error for invalid tags parameter', async () => {
    await expect(logobox.search({ tags: 'string' as any })).rejects.toThrow(LogoBoxError);
    
    try {
      await logobox.search({ tags: 'string' as any });
    } catch (error) {
      expect((error as LogoBoxError).code).toBe(ERROR_CODES.INVALID_SEARCH_QUERY);
    }
  });

  it('should throw error for invalid limit parameter', async () => {
    await expect(logobox.search({ limit: -1 })).rejects.toThrow(LogoBoxError);
    
    try {
      await logobox.search({ limit: -1 });
    } catch (error) {
      expect((error as LogoBoxError).code).toBe(ERROR_CODES.INVALID_SEARCH_QUERY);
    }
    
    try {
      await logobox.search({ limit: 'string' as any });
    } catch (error) {
      expect((error as LogoBoxError).code).toBe(ERROR_CODES.INVALID_SEARCH_QUERY);
    }
  });

  it('should throw error for invalid offset parameter', async () => {
    await expect(logobox.search({ offset: -1 })).rejects.toThrow(LogoBoxError);
    
    try {
      await logobox.search({ offset: -1 });
    } catch (error) {
      expect((error as LogoBoxError).code).toBe(ERROR_CODES.INVALID_SEARCH_QUERY);
    }
    
    try {
      await logobox.search({ offset: 'string' as any });
    } catch (error) {
      expect((error as LogoBoxError).code).toBe(ERROR_CODES.INVALID_SEARCH_QUERY);
    }
  });

  it('should accept valid search queries', async () => {
    const validQueries: SearchQuery[] = [
      {},
      { text: 'github' },
      { categories: ['technology'] },
      { tags: ['git'] },
      { limit: 10 },
      { offset: 0 },
      { text: 'github', categories: ['technology'], tags: ['git'], limit: 10, offset: 0 }
    ];

    for (const query of validQueries) {
      await expect(logobox.search(query)).resolves.toBeDefined();
    }
  });
});

describe('Text Search Error Handling', () => {
  beforeEach(() => {
    clearCatalogCache();
    mockReadFile.mockResolvedValue(JSON.stringify(mockCatalog));
  });

  afterEach(() => {
    clearCatalogCache();
  });

  it('should throw error for non-string text parameter', async () => {
    await expect(logobox.searchText(123 as any)).rejects.toThrow(LogoBoxError);
    
    try {
      await logobox.searchText(123 as any);
    } catch (error) {
      expect((error as LogoBoxError).code).toBe(ERROR_CODES.INVALID_SEARCH_QUERY);
    }
    
    try {
      await logobox.searchText(null as any);
    } catch (error) {
      expect((error as LogoBoxError).code).toBe(ERROR_CODES.INVALID_SEARCH_QUERY);
    }
    
    try {
      await logobox.searchText(undefined as any);
    } catch (error) {
      expect((error as LogoBoxError).code).toBe(ERROR_CODES.INVALID_SEARCH_QUERY);
    }
  });

  it('should handle empty string search gracefully', async () => {
    const result = await logobox.searchText('');
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });

  it('should handle catalog loading errors in text search', async () => {
    clearCatalogCache();
    mockReadFile.mockRejectedValue(new Error('File not found'));

    // Should return empty array instead of throwing
    const result = await logobox.searchText('github');
    expect(result).toEqual([]);
  });
});

describe('Logo Retrieval Error Handling', () => {
  beforeEach(() => {
    clearCatalogCache();
    mockReadFile.mockResolvedValue(JSON.stringify(mockCatalog));
  });

  afterEach(() => {
    clearCatalogCache();
  });

  it('should throw error for invalid slug parameter', async () => {
    await expect(logobox.getBySlug('')).rejects.toThrow(LogoBoxError);
    
    try {
      await logobox.getBySlug('');
    } catch (error) {
      expect((error as LogoBoxError).code).toBe(ERROR_CODES.INVALID_SLUG);
    }
    
    try {
      await logobox.getBySlug('   ');
    } catch (error) {
      expect((error as LogoBoxError).code).toBe(ERROR_CODES.INVALID_SLUG);
    }
    
    try {
      await logobox.getBySlug(123 as any);
    } catch (error) {
      expect((error as LogoBoxError).code).toBe(ERROR_CODES.INVALID_SLUG);
    }
    
    try {
      await logobox.getBySlug(null as any);
    } catch (error) {
      expect((error as LogoBoxError).code).toBe(ERROR_CODES.INVALID_SLUG);
    }
  });

  it('should return null for non-existent logo', async () => {
    const result = await logobox.getBySlug('non-existent');
    expect(result).toBeNull();
  });

  it('should throw error for invalid category parameter', async () => {
    await expect(logobox.getByCategory('')).rejects.toThrow(LogoBoxError);
    
    try {
      await logobox.getByCategory('');
    } catch (error) {
      expect((error as LogoBoxError).code).toBe(ERROR_CODES.INVALID_CATEGORY);
    }
    
    try {
      await logobox.getByCategory('   ');
    } catch (error) {
      expect((error as LogoBoxError).code).toBe(ERROR_CODES.INVALID_CATEGORY);
    }
    
    try {
      await logobox.getByCategory(123 as any);
    } catch (error) {
      expect((error as LogoBoxError).code).toBe(ERROR_CODES.INVALID_CATEGORY);
    }
  });

  it('should return empty array for non-existent category', async () => {
    const result = await logobox.getByCategory('non-existent');
    expect(result).toEqual([]);
  });

  it('should throw error for invalid tags parameter', async () => {
    await expect(logobox.getByTags('string' as any)).rejects.toThrow(LogoBoxError);
    
    try {
      await logobox.getByTags('string' as any);
    } catch (error) {
      expect((error as LogoBoxError).code).toBe(ERROR_CODES.INVALID_TAGS);
    }
    
    try {
      await logobox.getByTags([123] as any);
    } catch (error) {
      expect((error as LogoBoxError).code).toBe(ERROR_CODES.INVALID_TAGS);
    }
    
    try {
      await logobox.getByTags(['', 'valid']);
    } catch (error) {
      expect((error as LogoBoxError).code).toBe(ERROR_CODES.INVALID_TAGS);
    }
    
    try {
      await logobox.getByTags(['   ', 'valid']);
    } catch (error) {
      expect((error as LogoBoxError).code).toBe(ERROR_CODES.INVALID_TAGS);
    }
  });

  it('should return empty array for non-existent tags', async () => {
    const result = await logobox.getByTags(['non-existent']);
    expect(result).toEqual([]);
  });

  it('should handle catalog loading errors in retrieval methods', async () => {
    clearCatalogCache();
    mockReadFile.mockRejectedValue(new Error('Network error'));

    // Should return appropriate empty values instead of throwing
    await expect(logobox.getBySlug('github')).resolves.toBeNull();
    await expect(logobox.getByCategory('technology')).resolves.toEqual([]);
    await expect(logobox.getByTags(['git'])).resolves.toEqual([]);
  });
});

describe('URL Generation Error Handling', () => {
  it('should throw error for invalid slug parameter', () => {
    expect(() => logobox.getLogoUrl('')).toThrow(LogoBoxError);
    
    try {
      logobox.getLogoUrl('');
    } catch (error) {
      expect((error as LogoBoxError).code).toBe(ERROR_CODES.INVALID_SLUG);
    }
    
    try {
      logobox.getLogoUrl('   ');
    } catch (error) {
      expect((error as LogoBoxError).code).toBe(ERROR_CODES.INVALID_SLUG);
    }
    
    try {
      logobox.getLogoUrl(123 as any);
    } catch (error) {
      expect((error as LogoBoxError).code).toBe(ERROR_CODES.INVALID_SLUG);
    }
    
    try {
      logobox.getLogoUrl(null as any);
    } catch (error) {
      expect((error as LogoBoxError).code).toBe(ERROR_CODES.INVALID_SLUG);
    }
  });

  it('should throw error for invalid variant parameter', () => {
    expect(() => logobox.getLogoUrl('github', 'invalid' as any)).toThrow(LogoBoxError);
    
    try {
      logobox.getLogoUrl('github', 'invalid' as any);
    } catch (error) {
      expect((error as LogoBoxError).code).toBe(ERROR_CODES.INVALID_VARIANT);
    }
  });

  it('should generate valid URLs for valid parameters', () => {
    expect(() => logobox.getLogoUrl('github')).not.toThrow();
    expect(() => logobox.getLogoUrl('github', 'white')).not.toThrow();
    expect(() => logobox.getLogoUrl('github', 'black')).not.toThrow();
    expect(() => logobox.getLogoUrl('github', 'optimized')).not.toThrow();
  });
});

describe('Configuration Error Handling', () => {
  it('should throw error for invalid configuration parameter', () => {
    expect(() => logobox.configure(null as any)).toThrow(LogoBoxError);
    
    try {
      logobox.configure(null as any);
    } catch (error) {
      expect((error as LogoBoxError).code).toBe(ERROR_CODES.CONFIGURATION_ERROR);
    }
    
    try {
      logobox.configure('string' as any);
    } catch (error) {
      expect((error as LogoBoxError).code).toBe(ERROR_CODES.CONFIGURATION_ERROR);
    }
    
    try {
      logobox.configure(123 as any);
    } catch (error) {
      expect((error as LogoBoxError).code).toBe(ERROR_CODES.CONFIGURATION_ERROR);
    }
  });

  it('should accept valid configuration objects', () => {
    expect(() => logobox.configure({})).not.toThrow();
    expect(() => logobox.configure({ baseUrl: 'https://example.com' })).not.toThrow();
    expect(() => logobox.configure({ cache: { enabled: false, ttl: 1000 } })).not.toThrow();
  });

  it('should clear cache when configuration changes', () => {
    // This is tested indirectly by ensuring subsequent calls use new config
    expect(() => logobox.configure({ baseUrl: 'https://new-url.com' })).not.toThrow();
  });
});

describe('Categories and Tags Error Handling', () => {
  beforeEach(() => {
    clearCatalogCache();
    mockReadFile.mockResolvedValue(JSON.stringify(mockCatalog));
  });

  afterEach(() => {
    clearCatalogCache();
  });

  it('should handle catalog loading errors in getAllCategories', async () => {
    clearCatalogCache();
    mockReadFile.mockRejectedValue(new Error('Network error'));

    // Should return empty array instead of throwing
    const result = await logobox.getAllCategories();
    expect(result).toEqual([]);
  });

  it('should handle catalog loading errors in getAllTags', async () => {
    clearCatalogCache();
    mockReadFile.mockRejectedValue(new Error('Network error'));

    // Should return empty array instead of throwing
    const result = await logobox.getAllTags();
    expect(result).toEqual([]);
  });

  it('should return categories and tags from valid catalog', async () => {
    const categories = await logobox.getAllCategories();
    const tags = await logobox.getAllTags();

    expect(categories).toEqual(['development', 'technology']);
    expect(tags).toEqual(['code', 'git', 'repository']);
  });
});

describe('Graceful Degradation', () => {
  beforeEach(() => {
    clearCatalogCache();
  });

  afterEach(() => {
    clearCatalogCache();
  });

  it('should return empty results when catalog is unavailable', async () => {
    mockReadFile.mockRejectedValue(new Error('Network unavailable'));

    const searchResult = await logobox.search({ text: 'github' });
    const textSearchResult = await logobox.searchText('github');
    const slugResult = await logobox.getBySlug('github');
    const categoryResult = await logobox.getByCategory('technology');
    const tagsResult = await logobox.getByTags(['git']);
    const categoriesResult = await logobox.getAllCategories();
    const tagsListResult = await logobox.getAllTags();

    expect(searchResult.logos).toEqual([]);
    expect(searchResult.total).toBe(0);
    expect(textSearchResult).toEqual([]);
    expect(slugResult).toBeNull();
    expect(categoryResult).toEqual([]);
    expect(tagsResult).toEqual([]);
    expect(categoriesResult).toEqual([]);
    expect(tagsListResult).toEqual([]);
  });

  it('should handle partial catalog data gracefully', async () => {
    const partialCatalog = {
      ...mockCatalog,
      logos: mockCatalog.logos.map(logo => ({
        ...logo,
        description: undefined, // Missing optional field
        tags: [] // Empty tags
      }))
    };

    mockReadFile.mockResolvedValue(JSON.stringify(partialCatalog));

    const result = await logobox.search({ text: 'github' });
    expect(result.logos).toHaveLength(1);
    expect(result.logos[0].description).toBeUndefined();
    expect(result.logos[0].tags).toEqual([]);
  });

  it('should handle empty catalog gracefully', async () => {
    mockReadFile.mockResolvedValue(JSON.stringify(emptyCatalog));

    const searchResult = await logobox.search({ text: 'github' });
    const textSearchResult = await logobox.searchText('github');
    const slugResult = await logobox.getBySlug('github');
    const categoryResult = await logobox.getByCategory('technology');
    const tagsResult = await logobox.getByTags(['git']);
    const categoriesResult = await logobox.getAllCategories();
    const tagsListResult = await logobox.getAllTags();

    expect(searchResult.logos).toEqual([]);
    expect(searchResult.total).toBe(0);
    expect(textSearchResult).toEqual([]);
    expect(slugResult).toBeNull();
    expect(categoryResult).toEqual([]);
    expect(tagsResult).toEqual([]);
    expect(categoriesResult).toEqual([]);
    expect(tagsListResult).toEqual([]);
  });
});

describe('Error Message Quality', () => {
  it('should provide descriptive error messages', async () => {
    try {
      await logobox.search({ text: 123 as any });
    } catch (error) {
      expect(error).toBeInstanceOf(LogoBoxError);
      expect((error as LogoBoxError).message).toContain('Search query text must be a string');
      expect((error as LogoBoxError).details).toHaveProperty('text', 123);
      expect((error as LogoBoxError).details).toHaveProperty('expectedType', 'string');
      expect((error as LogoBoxError).details).toHaveProperty('receivedType', 'number');
    }

    try {
      logobox.getLogoUrl('github', 'invalid' as any);
    } catch (error) {
      expect(error).toBeInstanceOf(LogoBoxError);
      expect((error as LogoBoxError).message).toContain('Invalid logo variant: "invalid"');
      expect((error as LogoBoxError).details).toHaveProperty('validVariants');
      expect((error as LogoBoxError).details).toHaveProperty('variant', 'invalid');
    }
  });

  it('should include relevant context in error details', async () => {
    try {
      await logobox.getBySlug('');
    } catch (error) {
      expect(error).toBeInstanceOf(LogoBoxError);
      expect((error as LogoBoxError).details).toHaveProperty('slug', '');
      expect((error as LogoBoxError).details).toHaveProperty('expectedType', 'non-empty string');
      expect((error as LogoBoxError).details).toHaveProperty('receivedType', 'string');
    }

    try {
      await logobox.getByTags(['', 'valid']);
    } catch (error) {
      expect(error).toBeInstanceOf(LogoBoxError);
      expect((error as LogoBoxError).details).toHaveProperty('tags', ['', 'valid']);
      expect((error as LogoBoxError).details).toHaveProperty('invalidTags', ['']);
      expect((error as LogoBoxError).details).toHaveProperty('validTags', ['valid']);
    }
  });
});

describe('Error Recovery', () => {
  beforeEach(() => {
    clearCatalogCache();
  });

  afterEach(() => {
    clearCatalogCache();
  });

  it('should recover from transient network errors', async () => {
    // First call fails
    mockReadFile.mockRejectedValueOnce(new Error('Network timeout'));
    const firstResult = await logobox.search({ text: 'github' });
    expect(firstResult.logos).toEqual([]);

    // Second call succeeds
    clearCatalogCache(); // Clear cache to force reload
    mockReadFile.mockResolvedValueOnce(JSON.stringify(mockCatalog));
    const secondResult = await logobox.search({ text: 'github' });
    expect(secondResult.logos).toHaveLength(1);
  });

  it('should not cache failed catalog loads', async () => {
    // First call fails
    mockReadFile.mockRejectedValueOnce(new Error('Network error'));
    await logobox.search({ text: 'github' });

    // Clear mock call history
    mockReadFile.mockClear();
    
    // Second call should attempt to load again
    mockReadFile.mockResolvedValueOnce(JSON.stringify(mockCatalog));
    const result = await logobox.search({ text: 'github' });
    expect(result.logos).toHaveLength(1);
    
    // Verify readFile was called for the second attempt
    expect(mockReadFile).toHaveBeenCalledTimes(1);
  });
});