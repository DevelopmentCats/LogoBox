/**
 * Logo Variants Generator
 * Generates white and black variants from original SVG logos
 */

import fs from 'fs';
import path from 'path';
import { JSDOM } from 'jsdom';
import { optimize } from 'svgo';

/**
 * Generate logo variants (white and black) from original SVG
 */
class LogoVariantsGenerator {
  constructor(options = {}) {
    this.options = {
      logosDir: options.logosDir || './assets/logos',
      outputQuality: options.outputQuality || 'high',
      enableOptimization: options.enableOptimization !== false,
      ...options
    };
  }

  /**
   * Generate variants for all logos
   */
  async generateAllVariants() {
    console.log('🎨 Starting logo variants generation...');
    
    const logosDir = this.options.logosDir;
    const logoDirectories = fs.readdirSync(logosDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    let processedCount = 0;
    let errorCount = 0;

    for (const logoDir of logoDirectories) {
      try {
        await this.generateLogoVariants(logoDir);
        processedCount++;
        console.log(`✓ Generated variants for ${logoDir}`);
      } catch (error) {
        errorCount++;
        console.error(`✗ Failed to generate variants for ${logoDir}:`, error.message);
      }
    }

    console.log(`\n🎨 Variants generation complete:`);
    console.log(`   ✓ Processed: ${processedCount} logos`);
    console.log(`   ✗ Errors: ${errorCount} logos`);
  }

  /**
   * Generate variants for a specific logo
   */
  async generateLogoVariants(logoSlug) {
    const logoDir = path.join(this.options.logosDir, logoSlug);
    const originalSvgPath = path.join(logoDir, 'logo.svg');

    if (!fs.existsSync(originalSvgPath)) {
      throw new Error(`Original SVG not found: ${originalSvgPath}`);
    }

    const originalSvg = fs.readFileSync(originalSvgPath, 'utf8');
    
    // Generate white variant
    const whiteSvg = this.createWhiteVariant(originalSvg);
    const whitePath = path.join(logoDir, 'logo-white.svg');
    fs.writeFileSync(whitePath, whiteSvg);

    // Generate black variant
    const blackSvg = this.createBlackVariant(originalSvg);
    const blackPath = path.join(logoDir, 'logo-black.svg');
    fs.writeFileSync(blackPath, blackSvg);

    // Generate optimized variant
    if (this.options.enableOptimization) {
      const optimizedSvg = await this.optimizeSvg(originalSvg);
      const optimizedPath = path.join(logoDir, 'logo-optimized.svg');
      fs.writeFileSync(optimizedPath, optimizedSvg);
    }
  }

  /**
   * Create white variant by replacing fill colors
   */
  createWhiteVariant(svgContent) {
    const dom = new JSDOM(svgContent, { contentType: 'image/svg+xml' });
    const svg = dom.window.document.querySelector('svg');
    
    // Replace all fill attributes with white
    const elementsWithFill = svg.querySelectorAll('[fill]:not([fill="none"])');
    elementsWithFill.forEach(element => {
      element.setAttribute('fill', '#FFFFFF');
    });

    // Replace fill in style attributes
    const elementsWithStyle = svg.querySelectorAll('[style*="fill"]');
    elementsWithStyle.forEach(element => {
      const style = element.getAttribute('style');
      const updatedStyle = style.replace(/fill\s*:\s*[^;]+/g, 'fill: #FFFFFF');
      element.setAttribute('style', updatedStyle);
    });

    return dom.serialize();
  }

  /**
   * Create black variant by replacing fill colors
   */
  createBlackVariant(svgContent) {
    const dom = new JSDOM(svgContent, { contentType: 'image/svg+xml' });
    const svg = dom.window.document.querySelector('svg');
    
    // Replace all fill attributes with black
    const elementsWithFill = svg.querySelectorAll('[fill]:not([fill="none"])');
    elementsWithFill.forEach(element => {
      element.setAttribute('fill', '#000000');
    });

    // Replace fill in style attributes
    const elementsWithStyle = svg.querySelectorAll('[style*="fill"]');
    elementsWithStyle.forEach(element => {
      const style = element.getAttribute('style');
      const updatedStyle = style.replace(/fill\s*:\s*[^;]+/g, 'fill: #000000');
      element.setAttribute('style', updatedStyle);
    });

    return dom.serialize();
  }

  /**
   * Optimize SVG using SVGO
   */
  async optimizeSvg(svgContent) {
    const result = optimize(svgContent, {
      plugins: [
        'preset-default',
        'removeDimensions',
        'removeViewBox',
      ],
    });
    return result.data;
  }
}

// Export for use in other scripts
export { LogoVariantsGenerator };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const generator = new LogoVariantsGenerator();
  generator.generateAllVariants().catch(console.error);
}