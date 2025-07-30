/**
 * Download Utils Unit Tests
 * Tests for logo download functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { downloadLogo, generateDownloadUrl, validateLogoFormat } from '../../package/src/downloadUtils';

// Mock fetch for testing
global.fetch = vi.fn();

describe('downloadUtils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('downloadLogo', () => {
    it('should download logo successfully', async () => {
      const mockBlob = new Blob(['test svg content'], { type: 'image/svg+xml' });
      
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve(mockBlob),
        headers: new Headers({
          'content-type': 'image/svg+xml',
          'content-length': '16'
        })
      });

      const result = await downloadLogo('github', 'original', 'svg');
      
      expect(result).toBeDefined();
      expect(result.blob).toBe(mockBlob);
      expect(result.filename).toBe('github-logo.svg');
    });

    it('should handle download errors', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      });

      await expect(downloadLogo('nonexistent', 'original', 'svg'))
        .rejects.toThrow('Failed to download logo: 404 Not Found');
    });

    it('should generate correct filename for variants', async () => {
      const mockBlob = new Blob(['test content']);
      
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve(mockBlob),
        headers: new Headers()
      });

      const result = await downloadLogo('github', 'white', 'svg');
      expect(result.filename).toBe('github-logo-white.svg');
    });

    it('should handle PNG format downloads', async () => {
      const mockBlob = new Blob(['png data'], { type: 'image/png' });
      
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve(mockBlob),
        headers: new Headers({ 'content-type': 'image/png' })
      });

      const result = await downloadLogo('github', 'original', 'png', '128');
      expect(result.filename).toBe('github-logo-128.png');
    });
  });

  describe('generateDownloadUrl', () => {
    it('should generate correct SVG URLs', () => {
      const url = generateDownloadUrl('github', 'original', 'svg');
      expect(url).toMatch(/\/logos\/github\/logo\.svg$/);
    });

    it('should generate correct variant URLs', () => {
      const whiteUrl = generateDownloadUrl('github', 'white', 'svg');
      expect(whiteUrl).toMatch(/\/logos\/github\/logo-white\.svg$/);

      const blackUrl = generateDownloadUrl('github', 'black', 'svg');
      expect(blackUrl).toMatch(/\/logos\/github\/logo-black\.svg$/);
    });

    it('should generate correct PNG URLs', () => {
      const url = generateDownloadUrl('github', 'original', 'png', '64');
      expect(url).toMatch(/\/logos\/github\/png\/64\.png$/);
    });

    it('should throw error for PNG without size', () => {
      expect(() => generateDownloadUrl('github', 'original', 'png'))
        .toThrow('Size is required for PNG format');
    });
  });

  describe('validateLogoFormat', () => {
    it('should validate SVG format', () => {
      expect(validateLogoFormat('svg')).toBe(true);
      expect(validateLogoFormat('SVG')).toBe(true);
    });

    it('should validate PNG format', () => {
      expect(validateLogoFormat('png')).toBe(true);
      expect(validateLogoFormat('PNG')).toBe(true);
    });

    it('should reject invalid formats', () => {
      expect(validateLogoFormat('jpg')).toBe(false);
      expect(validateLogoFormat('gif')).toBe(false);
      expect(validateLogoFormat('webp')).toBe(false);
    });

    it('should validate PNG sizes', () => {
      expect(validateLogoFormat('png', '64')).toBe(true);
      expect(validateLogoFormat('png', '128')).toBe(true);
      expect(validateLogoFormat('png', '256')).toBe(true);
      expect(validateLogoFormat('png', '512')).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should handle network errors', async () => {
      (fetch as any).mockRejectedValueOnce(new Error('Network error'));

      await expect(downloadLogo('github', 'original', 'svg'))
        .rejects.toThrow('Network error');
    });

    it('should handle invalid blob responses', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.reject(new Error('Invalid blob')),
        headers: new Headers()
      });

      await expect(downloadLogo('github', 'original', 'svg'))
        .rejects.toThrow('Invalid blob');
    });
  });

  describe('download optimization', () => {
    it('should include proper headers in requests', async () => {
      const mockBlob = new Blob(['test']);
      
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve(mockBlob),
        headers: new Headers()
      });

      await downloadLogo('github', 'original', 'svg');

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Accept': 'image/svg+xml,image/*',
            'Cache-Control': 'no-cache'
          })
        })
      );
    });

    it('should handle compressed responses', async () => {
      const mockBlob = new Blob(['compressed content']);
      
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve(mockBlob),
        headers: new Headers({
          'content-encoding': 'gzip',
          'content-length': '100'
        })
      });

      const result = await downloadLogo('github', 'original', 'svg');
      expect(result.blob).toBe(mockBlob);
    });
  });
});