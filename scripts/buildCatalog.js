/**
 * Catalog Builder Script
 * Scans assets directory and builds the master catalog.json file
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

/**
 * Catalog builder class
 */
class CatalogBuilder {
  constructor(options = {}) {
    this.options = {
      logosDir: options.logosDir || './assets/logos',
      outputPath: options.outputPath || './assets/catalog.json',
      cdnBaseUrl: options.cdnBaseUrl || 'https://cdn.logobox.dev',
      includeMetrics: options.includeMetrics !== false,
      ...options
    };
  }

  /**
   * Build the complete catalog
   */
  async buildCatalog() {
    console.log('📚 Building logo catalog...');
    
    const startTime = Date.now();
    const logosDir = this.options.logosDir;
    
    if (!fs.existsSync(logosDir)) {
      throw new Error(`Logos directory not found: ${logosDir}`);
    }

    const logoDirectories = fs.readdirSync(logosDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name)
      .sort();

    const logos = [];
    const categories = new Set();
    const tags = new Set();
    let processedCount = 0;
    let errorCount = 0;

    console.log(`Found ${logoDirectories.length} logo directories`);

    for (const logoDir of logoDirectories) {
      try {
        const logoData = await this.processLogo(logoDir);
        if (logoData) {
          logos.push(logoData);
          logoData.categories.forEach(cat => categories.add(cat));
          logoData.tags.forEach(tag => tags.add(tag));
          processedCount++;
        }
      } catch (error) {
        errorCount++;
        console.error(`✗ Failed to process ${logoDir}:`, error.message);
      }
    }

    const catalog = {
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      logos: logos,
      categories: Array.from(categories).sort(),
      tags: Array.from(tags).sort(),
      stats: {
        totalLogos: logos.length,
        totalCategories: categories.size,
        totalTags: tags.size,
        buildTime: Date.now() - startTime,
        processedCount,
        errorCount
      }
    };

    // Write catalog to file(s)
    const catalogJson = JSON.stringify(catalog, null, 2);
    
    // Write to primary output path (assets directory)
    fs.writeFileSync(this.options.outputPath, catalogJson);
    
    // Also write to website public directory for builds
    const websitePublicPath = './website/public/catalog.json';
    const websitePublicDir = path.dirname(websitePublicPath);
    
    // Ensure website public directory exists
    if (!fs.existsSync(websitePublicDir)) {
      fs.mkdirSync(websitePublicDir, { recursive: true });
    }
    
    fs.writeFileSync(websitePublicPath, catalogJson);
    console.log(`✅ Catalog written to ${this.options.outputPath}`);
    console.log(`✅ Catalog written to ${websitePublicPath}`);
    
    // Copy logo assets to website public directory
    await this.copyLogosToWebsite();

    console.log(`\n📚 Catalog built successfully:`);
    console.log(`   ✓ Processed: ${processedCount} logos`);
    console.log(`   ✗ Errors: ${errorCount} logos`);
    console.log(`   📂 Categories: ${categories.size}`);
    console.log(`   🏷️  Tags: ${tags.size}`);
    console.log(`   📄 Output: ${this.options.outputPath}`);
    console.log(`   ⏱️  Build time: ${Date.now() - startTime}ms`);

    return catalog;
  }

  /**
   * Process a single logo directory
   */
  async processLogo(logoSlug) {
    const logoDir = path.join(this.options.logosDir, logoSlug);
    const metadataPath = path.join(logoDir, 'metadata.json');

    if (!fs.existsSync(metadataPath)) {
      console.warn(`⚠️  No metadata.json found for ${logoSlug}`);
      return null;
    }

    // Read and parse metadata
    const metadataContent = fs.readFileSync(metadataPath, 'utf8');
    const metadata = JSON.parse(metadataContent);

    // Validate required fields
    if (!metadata.name || !metadata.slug) {
      throw new Error(`Invalid metadata for ${logoSlug}: missing name or slug`);
    }

    // Scan for available files
    const variants = await this.scanVariants(logoDir, logoSlug);
    const formats = await this.scanFormats(logoDir, logoSlug);

    // Calculate file metrics if enabled
    const metrics = this.options.includeMetrics ? 
      await this.calculateMetrics(logoDir) : {};

    return {
      name: metadata.name,
      slug: metadata.slug || logoSlug,
      description: metadata.description || '',
      categories: metadata.categories || [],
      tags: metadata.tags || [],
      license: metadata.license || 'Unknown',
      website: metadata.website || '',
      variants,
      formats,
      metrics,
      directory: logoDir,
      lastModified: this.getLastModified(logoDir)
    };
  }

  /**
   * Scan for logo variants
   */
  async scanVariants(logoDir, logoSlug) {
    const variants = {};
    const variantFiles = {
      original: 'logo.svg',
      white: 'logo-white.svg',
      black: 'logo-black.svg',
      optimized: 'logo-optimized.svg'
    };

    for (const [variant, filename] of Object.entries(variantFiles)) {
      const filePath = path.join(logoDir, filename);
      if (fs.existsSync(filePath)) {
        variants[variant] = `${this.options.cdnBaseUrl}/logos/${logoSlug}/${filename}`;
      }
    }

    return variants;
  }

  /**
   * Scan for logo formats
   */
  async scanFormats(logoDir, logoSlug) {
    const formats = {};

    // SVG format
    const svgPath = path.join(logoDir, 'logo.svg');
    if (fs.existsSync(svgPath)) {
      const stats = fs.statSync(svgPath);
      formats.svg = {
        url: `${this.options.cdnBaseUrl}/logos/${logoSlug}/logo.svg`,
        fileSize: stats.size,
        checksum: this.calculateChecksum(svgPath)
      };
    }

    // PNG formats
    const pngDir = path.join(logoDir, 'png');
    if (fs.existsSync(pngDir)) {
      formats.png = {};
      const pngSizes = ['64', '128', '256'];
      
      for (const size of pngSizes) {
        const pngPath = path.join(pngDir, `${size}.png`);
        if (fs.existsSync(pngPath)) {
          const stats = fs.statSync(pngPath);
          formats.png[size] = {
            url: `${this.options.cdnBaseUrl}/logos/${logoSlug}/png/${size}.png`,
            fileSize: stats.size,
            checksum: this.calculateChecksum(pngPath)
          };
        }
      }
    }

    return formats;
  }

  /**
   * Calculate file metrics
   */
  async calculateMetrics(logoDir) {
    const files = fs.readdirSync(logoDir, { recursive: true });
    let totalSize = 0;
    let fileCount = 0;

    files.forEach(file => {
      const filePath = path.join(logoDir, file);
      if (fs.statSync(filePath).isFile()) {
        totalSize += fs.statSync(filePath).size;
        fileCount++;
      }
    });

    return {
      totalSize,
      fileCount,
      avgFileSize: Math.round(totalSize / fileCount)
    };
  }

  /**
   * Calculate file checksum
   */
  calculateChecksum(filePath) {
    const fileBuffer = fs.readFileSync(filePath);
    const hashSum = crypto.createHash('sha256');
    hashSum.update(fileBuffer);
    return hashSum.digest('hex').substring(0, 16);
  }

  /**
   * Get last modified time for directory
   */
  getLastModified(logoDir) {
    const files = fs.readdirSync(logoDir);
    let latestTime = 0;

    files.forEach(file => {
      const filePath = path.join(logoDir, file);
      const stats = fs.statSync(filePath);
      if (stats.mtime.getTime() > latestTime) {
        latestTime = stats.mtime.getTime();
      }
    });

    return new Date(latestTime).toISOString();
  }

  /**
   * Copy logo assets to website public directory
   */
  async copyLogosToWebsite() {
    const websiteLogosDir = './website/public/logos';
    
    // Ensure website logos directory exists
    if (!fs.existsSync(websiteLogosDir)) {
      fs.mkdirSync(websiteLogosDir, { recursive: true });
    }
    
    // Copy each logo directory
    const logoDirectories = fs.readdirSync(this.options.logosDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);
    
    for (const logoDir of logoDirectories) {
      const sourcePath = path.join(this.options.logosDir, logoDir);
      const destPath = path.join(websiteLogosDir, logoDir);
      
      // Ensure destination directory exists
      if (!fs.existsSync(destPath)) {
        fs.mkdirSync(destPath, { recursive: true });
      }
      
      // Copy all SVG files
      const files = fs.readdirSync(sourcePath);
      for (const file of files) {
        if (file.endsWith('.svg')) {
          const sourceFile = path.join(sourcePath, file);
          const destFile = path.join(destPath, file);
          fs.copyFileSync(sourceFile, destFile);
        }
      }
    }
    
    console.log(`✅ Logo assets copied to ${websiteLogosDir}`);
  }
}

// Export for use in other scripts
export { CatalogBuilder };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const builder = new CatalogBuilder();
  builder.buildCatalog().catch(console.error);
}