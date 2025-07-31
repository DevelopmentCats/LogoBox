/**
 * LogoBox API Integration Tests
 * Tests the complete API functionality end-to-end
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { logobox } from '../../package/src/index.ts';

describe('LogoBox API Integration', () => {
  beforeAll(async () => {
    // Setup test environment
  });

  afterAll(async () => {
    // Cleanup test environment
  });

  describe('Search Functionality', () => {
    it('should search logos by text query', async () => {
      const results = await logobox.search({ text: 'github' });
      expect(results).toBeDefined();
      expect(results.logos).toBeDefined();
      expect(Array.isArray(results.logos)).toBe(true);
    });

    it('should return empty array for non-existent logos', async () => {
      const results = await logobox.search({ text: 'nonexistentlogo12345' });
      expect(results.logos).toEqual([]);
      expect(results.total).toBe(0);
    });

    it('should perform case-insensitive search', async () => {
      const lowerResults = await logobox.search({ text: 'github' });
      const upperResults = await logobox.search({ text: 'GITHUB' });
      
      // Compare essential properties (excluding timestamps)
      expect(lowerResults.logos.length).toEqual(upperResults.logos.length);
      expect(lowerResults.total).toEqual(upperResults.total);
      
      if (lowerResults.logos.length > 0 && upperResults.logos.length > 0) {
        expect(lowerResults.logos[0].id).toEqual(upperResults.logos[0].id);
        expect(lowerResults.logos[0].name).toEqual(upperResults.logos[0].name);
        expect(lowerResults.logos[0].slug).toEqual(upperResults.logos[0].slug);
      }
    });
  });

  describe('Logo Retrieval', () => {
    it('should get logo by slug', async () => {
      const logo = await logobox.getBySlug('github');
      expect(logo).toBeDefined();
      if (logo) {
        expect(logo.slug).toBe('github');
        expect(logo.name).toBeDefined();
      }
    });

    it('should return null for non-existent slug', async () => {
      const logo = await logobox.getBySlug('nonexistent');
      expect(logo).toBeNull();
    });

    it('should get logos by category', async () => {
      const logos = await logobox.getByCategory('technology');
      expect(Array.isArray(logos)).toBe(true);
    });

    it('should get logos by tags', async () => {
      const logos = await logobox.getByTags(['javascript']);
      expect(Array.isArray(logos)).toBe(true);
    });
  });

  describe('URL Generation', () => {
    it('should generate correct logo URLs', () => {
      const url = logobox.getLogoUrl('github', 'original');
      expect(url).toMatch(/github\/logo\.svg$/);
    });

    it('should generate variant URLs', () => {
      const whiteUrl = logobox.getLogoUrl('github', 'white');
      expect(whiteUrl).toMatch(/github\/logo-white\.svg$/);
      
      const blackUrl = logobox.getLogoUrl('github', 'black');
      expect(blackUrl).toMatch(/github\/logo-black\.svg$/);
    });
  });

  describe('Metadata Access', () => {
    it('should get all categories', async () => {
      const categories = await logobox.getAllCategories();
      expect(Array.isArray(categories)).toBe(true);
      expect(categories.length).toBeGreaterThan(0);
    });

    it('should get all tags', async () => {
      const tags = await logobox.getAllTags();
      expect(Array.isArray(tags)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid parameters gracefully', async () => {
      // Empty search should return results (not throw)
      const emptySearchResults = await logobox.search({ text: '' });
      expect(emptySearchResults.logos).toBeDefined();
      
      // Invalid slug and category should throw
      await expect(() => logobox.getBySlug('')).rejects.toThrow();
      await expect(() => logobox.getByCategory('')).rejects.toThrow();
    });
  });
});