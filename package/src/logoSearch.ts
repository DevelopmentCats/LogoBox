/**
 * LogoBox Search Engine
 * Implements text search, category/tag filtering, and fuzzy search algorithms
 */

import type {
  LogoMetadata,
  SearchQuery,
  SearchResult,
  SearchFacets,
  Catalog
} from './types';

/**
 * Fuzzy search configuration
 */
interface FuzzySearchConfig {
  /** Maximum edit distance for fuzzy matching */
  maxDistance: number;
  /** Minimum score threshold (0-1) */
  threshold: number;
  /** Weight for exact matches */
  exactMatchWeight: number;
  /** Weight for prefix matches */
  prefixMatchWeight: number;
  /** Weight for fuzzy matches */
  fuzzyMatchWeight: number;
}

/**
 * Search match result with scoring
 */
interface SearchMatch {
  logo: LogoMetadata;
  score: number;
  matchType: 'exact' | 'prefix' | 'fuzzy' | 'category' | 'tag';
  matchedFields: string[];
}

/**
 * Default fuzzy search configuration
 */
const DEFAULT_FUZZY_CONFIG: FuzzySearchConfig = {
  maxDistance: 2,
  threshold: 0.3,
  exactMatchWeight: 1.0,
  prefixMatchWeight: 0.8,
  fuzzyMatchWeight: 0.6
};

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];
  
  // Initialize matrix
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  // Fill matrix
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

/**
 * Calculate fuzzy match score between query and target string
 */
function calculateFuzzyScore(
  query: string,
  target: string,
  config: FuzzySearchConfig = DEFAULT_FUZZY_CONFIG
): { score: number; matchType: 'exact' | 'prefix' | 'fuzzy' | 'none' } {
  const queryLower = query.toLowerCase();
  const targetLower = target.toLowerCase();
  
  // Exact match
  if (queryLower === targetLower) {
    return { score: config.exactMatchWeight, matchType: 'exact' };
  }
  
  // Prefix match
  if (targetLower.startsWith(queryLower)) {
    return { score: config.prefixMatchWeight, matchType: 'prefix' };
  }
  
  // Check if target contains query as substring
  if (targetLower.includes(queryLower)) {
    return { score: config.prefixMatchWeight * 0.9, matchType: 'prefix' };
  }
  
  // Fuzzy match using Levenshtein distance
  const distance = levenshteinDistance(queryLower, targetLower);
  const maxLength = Math.max(queryLower.length, targetLower.length);
  
  // Only allow fuzzy matching if the distance is reasonable relative to string length
  if (distance <= config.maxDistance && distance < maxLength * 0.5) {
    const similarity = 1 - (distance / maxLength);
    const score = similarity * config.fuzzyMatchWeight;
    
    if (score >= config.threshold) {
      return { score, matchType: 'fuzzy' };
    }
  }
  
  return { score: 0, matchType: 'none' };
}

/**
 * Search logos by text query with fuzzy matching
 */
function searchByText(
  logos: LogoMetadata[],
  query: string,
  config: FuzzySearchConfig = DEFAULT_FUZZY_CONFIG
): SearchMatch[] {
  if (!query.trim()) {
    return logos.map(logo => ({
      logo,
      score: 1,
      matchType: 'exact' as const,
      matchedFields: []
    }));
  }
  
  const matches: SearchMatch[] = [];
  
  for (const logo of logos) {
    let bestScore = 0;
    let bestMatchType: 'exact' | 'prefix' | 'fuzzy' | 'category' | 'tag' = 'fuzzy';
    const matchedFields: string[] = [];
    
    // Search in name
    const nameMatch = calculateFuzzyScore(query, logo.name, config);
    if (nameMatch.score > bestScore) {
      bestScore = nameMatch.score;
      bestMatchType = nameMatch.matchType;
      matchedFields.length = 0;
      matchedFields.push('name');
    }
    
    // Search in slug
    const slugMatch = calculateFuzzyScore(query, logo.slug, config);
    if (slugMatch.score > bestScore) {
      bestScore = slugMatch.score;
      bestMatchType = slugMatch.matchType;
      matchedFields.length = 0;
      matchedFields.push('slug');
    }
    
    // Search in description (check for substring matches)
    if (logo.description) {
      const descMatch = calculateFuzzyScore(query, logo.description, config);
      if (descMatch.score > bestScore) {
        bestScore = descMatch.score;
        bestMatchType = descMatch.matchType;
        matchedFields.length = 0;
        matchedFields.push('description');
      }
      
      // Also check for word matches in description
      const words = logo.description.toLowerCase().split(/\s+/);
      for (const word of words) {
        const wordMatch = calculateFuzzyScore(query, word, config);
        if (wordMatch.score > bestScore) {
          bestScore = wordMatch.score;
          bestMatchType = wordMatch.matchType;
          matchedFields.length = 0;
          matchedFields.push('description');
        }
      }
    }
    
    // Search in categories
    for (const category of logo.categories) {
      const categoryMatch = calculateFuzzyScore(query, category, config);
      if (categoryMatch.score > bestScore) {
        bestScore = categoryMatch.score;
        bestMatchType = 'category';
        matchedFields.length = 0;
        matchedFields.push('categories');
      }
    }
    
    // Search in tags
    for (const tag of logo.tags) {
      const tagMatch = calculateFuzzyScore(query, tag, config);
      if (tagMatch.score > bestScore) {
        bestScore = tagMatch.score;
        bestMatchType = 'tag';
        matchedFields.length = 0;
        matchedFields.push('tags');
      }
    }
    
    if (bestScore > 0) {
      matches.push({
        logo,
        score: bestScore,
        matchType: bestMatchType,
        matchedFields
      });
    }
  }
  
  return matches;
}

/**
 * Filter logos by categories
 */
function filterByCategories(logos: LogoMetadata[], categories: string[]): LogoMetadata[] {
  if (!categories.length) return logos;
  
  return logos.filter(logo =>
    categories.some(category =>
      logo.categories.includes(category)
    )
  );
}

/**
 * Filter logos by tags
 */
function filterByTags(logos: LogoMetadata[], tags: string[]): LogoMetadata[] {
  if (!tags.length) return logos;
  
  return logos.filter(logo =>
    tags.every(tag =>
      logo.tags.includes(tag)
    )
  );
}

/**
 * Generate search facets from logos
 */
function generateFacets(logos: LogoMetadata[]): SearchFacets {
  const categoryCount = new Map<string, number>();
  const tagCount = new Map<string, number>();
  
  for (const logo of logos) {
    // Count categories
    for (const category of logo.categories) {
      categoryCount.set(category, (categoryCount.get(category) || 0) + 1);
    }
    
    // Count tags
    for (const tag of logo.tags) {
      tagCount.set(tag, (tagCount.get(tag) || 0) + 1);
    }
  }
  
  return {
    categories: Array.from(categoryCount.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count),
    tags: Array.from(tagCount.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
  };
}

/**
 * Sort search results
 */
function sortResults(
  matches: SearchMatch[],
  sortBy: SearchQuery['sortBy'] = 'name',
  sortOrder: SearchQuery['sortOrder'] = 'asc'
): SearchMatch[] {
  return matches.sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case 'name':
        comparison = a.logo.name.localeCompare(b.logo.name);
        break;
      case 'createdAt':
        // Note: catalog doesn't have createdAt, using name as fallback
        comparison = a.logo.name.localeCompare(b.logo.name);
        break;
      case 'updatedAt':
        // Note: catalog doesn't have updatedAt, using name as fallback
        comparison = a.logo.name.localeCompare(b.logo.name);
        break;
      case 'popularity':
        // Sort by score for text searches, then by name
        comparison = b.score - a.score;
        if (comparison === 0) {
          comparison = a.logo.name.localeCompare(b.logo.name);
        }
        break;
      default:
        comparison = a.logo.name.localeCompare(b.logo.name);
    }
    
    return sortOrder === 'desc' ? -comparison : comparison;
  });
}

/**
 * Apply pagination to results
 */
function paginateResults<T>(
  items: T[],
  offset: number = 0,
  limit: number = 50
): T[] {
  if (limit === 0) {
    return [];
  }
  return items.slice(offset, offset + limit);
}

/**
 * Main search function that combines all search capabilities
 */
export function searchLogos(
  catalog: Catalog,
  query: SearchQuery,
  config: FuzzySearchConfig = DEFAULT_FUZZY_CONFIG
): SearchResult {
  const startTime = Date.now();
  
  let logos = [...catalog.logos];
  
  // Apply category filters
  if (query.categories && query.categories.length > 0) {
    logos = filterByCategories(logos, query.categories);
  }
  
  // Apply tag filters
  if (query.tags && query.tags.length > 0) {
    logos = filterByTags(logos, query.tags);
  }
  
  // Apply text search
  let matches: SearchMatch[];
  if (query.text && query.text.trim()) {
    matches = searchByText(logos, query.text.trim(), config);
  } else {
    matches = logos.map(logo => ({
      logo,
      score: 1,
      matchType: 'exact' as const,
      matchedFields: []
    }));
  }
  
  // Sort results
  const sortedMatches = sortResults(matches, query.sortBy, query.sortOrder);
  
  // Generate facets from all filtered results (before pagination)
  const facets = generateFacets(sortedMatches.map(match => match.logo));
  
  // Apply pagination
  const offset = query.offset || 0;
  const limit = query.limit !== undefined ? query.limit : 50;
  const paginatedMatches = paginateResults(sortedMatches, offset, limit);
  
  const executionTime = Date.now() - startTime;
  
  return {
    logos: paginatedMatches.map(match => ({
      id: match.logo.slug,
      name: match.logo.name,
      slug: match.logo.slug,
      description: match.logo.description,
      categories: match.logo.categories.map(cat => ({ id: cat, name: cat })),
      tags: match.logo.tags.map(tag => ({ id: tag, name: tag })),
      license: {
        type: match.logo.license,
        url: undefined,
        notes: undefined
      },
      variants: match.logo.variants,
      formats: {
        svg: {
          url: match.logo.formats.svg,
          fileSize: 0, // Not available in current catalog structure
          checksum: ''
        }
      },
      metadata: {
        createdAt: new Date(),
        updatedAt: new Date(),
        fileSize: 0,
        dimensions: { width: 0, height: 0 }
      }
    })),
    total: sortedMatches.length,
    offset,
    limit,
    facets,
    executionTime
  };
}

/**
 * Simple text search function for basic queries
 */
export function searchLogosByText(
  catalog: Catalog,
  text: string,
  config: FuzzySearchConfig = DEFAULT_FUZZY_CONFIG
): LogoMetadata[] {
  const result = searchLogos(catalog, { text }, config);
  return result.logos.map(logo => ({
    name: logo.name,
    slug: logo.slug,
    categories: logo.categories.map(cat => cat.name),
    tags: logo.tags.map(tag => tag.name),
    description: logo.description,
    license: logo.license.type,
    variants: logo.variants,
    formats: logo.formats
  }));
}

/**
 * Get logos by category
 */
export function getLogosByCategory(
  catalog: Catalog,
  category: string
): LogoMetadata[] {
  return catalog.logos.filter(logo =>
    logo.categories.includes(category)
  );
}

/**
 * Get logos by tags (all tags must match)
 */
export function getLogosByTags(
  catalog: Catalog,
  tags: string[]
): LogoMetadata[] {
  return catalog.logos.filter(logo =>
    tags.every(tag => logo.tags.includes(tag))
  );
}

/**
 * Get logo by slug
 */
export function getLogoBySlug(
  catalog: Catalog,
  slug: string
): LogoMetadata | null {
  return catalog.logos.find(logo => logo.slug === slug) || null;
}

/**
 * Get all available categories
 */
export function getAllCategories(catalog: Catalog): string[] {
  return [...catalog.categories].sort();
}

/**
 * Get all available tags
 */
export function getAllTags(catalog: Catalog): string[] {
  return [...catalog.tags].sort();
}