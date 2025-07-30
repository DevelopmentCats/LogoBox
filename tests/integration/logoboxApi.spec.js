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
      const results = logobox.search('github');
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
    });

    it('should return empty array for non-existent logos', () => {
      const results = logobox.search('nonexistentlogo12345');
      expect(results).toEqual([]);
    });

    it('should perform case-insensitive search', () => {
      const lowerResults = logobox.search('github');
      const upperResults = logobox.search('GITHUB');
      expect(lowerResults).toEqual(upperResults);
    });
  });

  describe('Logo Retrieval', () => {
    it('should get logo by slug', () => {
      const logo = logobox.getBySlug('github');
      expect(logo).toBeDefined();
      if (logo) {
        expect(logo.slug).toBe('github');
        expect(logo.name).toBeDefined();
      }
    });

    it('should return null for non-existent slug', () => {
      const logo = logobox.getBySlug('nonexistent');
      expect(logo).toBeNull();
    });

    it('should get logos by category', () => {
      const logos = logobox.getByCategory('technology');
      expect(Array.isArray(logos)).toBe(true);
    });

    it('should get logos by tags', () => {
      const logos = logobox.getByTags(['javascript']);
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
    it('should get all categories', () => {
      const categories = logobox.getAllCategories();
      expect(Array.isArray(categories)).toBe(true);
      expect(categories.length).toBeGreaterThan(0);
    });

    it('should get all tags', () => {
      const tags = logobox.getAllTags();
      expect(Array.isArray(tags)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid parameters gracefully', () => {
      expect(() => logobox.search('')).not.toThrow();
      expect(() => logobox.getBySlug('')).not.toThrow();
      expect(() => logobox.getByCategory('')).not.toThrow();
    });
  });
});