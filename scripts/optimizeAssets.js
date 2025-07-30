/**
 * Asset Optimization Script
 * Optimizes all logo assets for production deployment
 */

import fs from 'fs';
import path from 'path';
import { optimize } from 'svgo';
import sharp from 'sharp';

/**
 * Asset optimization class
 */
class AssetOptimizer {
  constructor(options = {}) {
    this.options = {
      logosDir: options.logosDir || './assets/logos',
      outputDir: options.outputDir || './dist/assets/logos',
      generatePng: options.generatePng !== false,
      pngSizes: options.pngSizes || [64, 128, 256],
      compressionLevel: options.compressionLevel || 6,
      ...options
    };
  }

  /**
   * Optimize all assets
   */
  async optimizeAllAssets() {
    console.log('🚀 Starting asset optimization...');
    
    const logosDir = this.options.logosDir;
    const logoDirectories = fs.readdirSync(logosDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    let processedCount = 0;
    let errorCount = 0;
    let totalSizeBefore = 0;
    let totalSizeAfter = 0;

    for (const logoDir of logoDirectories) {
      try {
        const result = await this.optimizeLogo(logoDir);
        processedCount++;
        totalSizeBefore += result.sizeBefore;
        totalSizeAfter += result.sizeAfter;
        
        const compressionPercent = ((result.sizeBefore - result.sizeAfter) / result.sizeBefore * 100).toFixed(1);
        console.log(`✓ Optimized ${logoDir} (${compressionPercent}% compression)`);
      } catch (error) {
        errorCount++;
        console.error(`✗ Failed to optimize ${logoDir}:`, error.message);
      }
    }

    const totalCompressionPercent = ((totalSizeBefore - totalSizeAfter) / totalSizeBefore * 100).toFixed(1);
    
    console.log(`\n🚀 Asset optimization complete:`);
    console.log(`   ✓ Processed: ${processedCount} logos`);
    console.log(`   ✗ Errors: ${errorCount} logos`);
    console.log(`   📊 Total compression: ${totalCompressionPercent}%`);
    console.log(`   📦 Size before: ${this.formatBytes(totalSizeBefore)}`);
    console.log(`   📦 Size after: ${this.formatBytes(totalSizeAfter)}`);
  }

  /**
   * Optimize a specific logo
   */
  async optimizeLogo(logoSlug) {
    const logoInputDir = path.join(this.options.logosDir, logoSlug);
    const logoOutputDir = path.join(this.options.outputDir, logoSlug);

    // Ensure output directory exists
    if (!fs.existsSync(logoOutputDir)) {
      fs.mkdirSync(logoOutputDir, { recursive: true });
    }

    let sizeBefore = 0;
    let sizeAfter = 0;

    // Process all SVG files in the logo directory
    const svgFiles = fs.readdirSync(logoInputDir)
      .filter(file => file.endsWith('.svg'));

    for (const svgFile of svgFiles) {
      const inputPath = path.join(logoInputDir, svgFile);
      const outputPath = path.join(logoOutputDir, svgFile);
      
      const result = await this.optimizeSvg(inputPath, outputPath);
      sizeBefore += result.sizeBefore;
      sizeAfter += result.sizeAfter;

      // Generate PNG variants if enabled
      if (this.options.generatePng && svgFile === 'logo.svg') {
        await this.generatePngVariants(outputPath, logoOutputDir);
      }
    }

    // Copy metadata file
    const metadataPath = path.join(logoInputDir, 'metadata.json');
    if (fs.existsSync(metadataPath)) {
      const metadataOutputPath = path.join(logoOutputDir, 'metadata.json');
      fs.copyFileSync(metadataPath, metadataOutputPath);
    }

    return { sizeBefore, sizeAfter };
  }

  /**
   * Optimize a single SVG file
   */
  async optimizeSvg(inputPath, outputPath) {
    const inputContent = fs.readFileSync(inputPath, 'utf8');
    const sizeBefore = Buffer.byteLength(inputContent, 'utf8');

    const result = optimize(inputContent, {
      path: inputPath,
      plugins: [
        'preset-default',
        'removeDimensions',
        'removeViewBox',
        'removeXMLNS',
        'cleanupAttrs',
        'removeDoctype',
        'removeXMLProcInst',
        'removeComments',
        'removeMetadata',
        'removeTitle',
        'removeDesc',
        'removeUselessDefs',
        'removeEditorsNSData',
        'removeEmptyAttrs',
        'removeHiddenElems',
        'removeEmptyText',
        'removeEmptyContainers',
        'removeUnusedNS',
        'convertShapeToPath',
        'mergePaths',
        'convertTransform',
        'sortAttrs',
        'removeDimensions'
      ],
    });

    const sizeAfter = Buffer.byteLength(result.data, 'utf8');
    fs.writeFileSync(outputPath, result.data);

    return { sizeBefore, sizeAfter };
  }

  /**
   * Generate PNG variants from SVG
   */
  async generatePngVariants(svgPath, outputDir) {
    const pngDir = path.join(outputDir, 'png');
    if (!fs.existsSync(pngDir)) {
      fs.mkdirSync(pngDir, { recursive: true });
    }

    for (const size of this.options.pngSizes) {
      const outputPath = path.join(pngDir, `${size}.png`);
      
      await sharp(svgPath)
        .resize(size, size)
        .png({ 
          quality: 100 - this.options.compressionLevel * 10,
          compressionLevel: this.options.compressionLevel 
        })
        .toFile(outputPath);
    }
  }

  /**
   * Format bytes to human readable format
   */
  formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }
}

// Export for use in other scripts
export { AssetOptimizer };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const optimizer = new AssetOptimizer();
  optimizer.optimizeAllAssets().catch(console.error);
}