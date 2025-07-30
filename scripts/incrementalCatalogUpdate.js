/**
 * Incremental Catalog Update Script
 * Updates catalog when individual logos are added or modified
 */

import fs from 'fs';
import path from 'path';
import { CatalogBuilder } from './buildCatalog.js';

/**
 * Incremental catalog updater
 */
class IncrementalCatalogUpdater {
  constructor(options = {}) {
    this.options = {
      logosDir: options.logosDir || './assets/logos',
      catalogPath: options.catalogPath || './assets/catalog.json',
      ...options
    };
    
    this.catalogBuilder = new CatalogBuilder(this.options);
  }

  /**
   * Update catalog for specific logos
   */
  async updateLogos(logoSlugs) {
    console.log('🔄 Starting incremental catalog update...');
    
    if (!Array.isArray(logoSlugs)) {
      logoSlugs = [logoSlugs];
    }

    // Load existing catalog
    const existingCatalog = await this.loadExistingCatalog();
    
    // Process updated logos
    const updatedLogos = [];
    const errors = [];

    for (const slug of logoSlugs) {
      try {
        const logoData = await this.catalogBuilder.processLogo(slug);
        if (logoData) {
          updatedLogos.push(logoData);
          console.log(`✓ Updated ${slug}`);
        }
      } catch (error) {
        errors.push({ slug, error: error.message });
        console.error(`✗ Failed to update ${slug}: ${error.message}`);
      }
    }

    // Merge with existing catalog
    const updatedCatalog = this.mergeCatalogs(existingCatalog, updatedLogos);
    
    // Save updated catalog
    await this.saveCatalog(updatedCatalog);

    console.log(`\n🔄 Incremental update complete:`);
    console.log(`   ✓ Updated: ${updatedLogos.length} logos`);
    console.log(`   ✗ Errors: ${errors.length} logos`);

    return { updatedLogos, errors };
  }

  /**
   * Load existing catalog
   */
  async loadExistingCatalog() {
    try {
      if (fs.existsSync(this.options.catalogPath)) {
        const catalogContent = fs.readFileSync(this.options.catalogPath, 'utf8');
        return JSON.parse(catalogContent);
      }
    } catch (error) {
      console.warn('Could not load existing catalog, creating new one');
    }
    
    return {
      version: '1.0.0',
      logos: [],
      categories: [],
      tags: []
    };
  }

  /**
   * Merge updated logos with existing catalog
   */
  mergeCatalogs(existingCatalog, updatedLogos) {
    const logoMap = new Map();
    
    // Add existing logos to map
    existingCatalog.logos.forEach(logo => {
      logoMap.set(logo.slug, logo);
    });
    
    // Update with new logo data
    updatedLogos.forEach(logo => {
      logoMap.set(logo.slug, logo);
    });

    // Convert back to array
    const allLogos = Array.from(logoMap.values()).sort((a, b) => 
      a.name.localeCompare(b.name)
    );

    // Rebuild categories and tags
    const categories = new Set();
    const tags = new Set();
    
    allLogos.forEach(logo => {
      logo.categories.forEach(cat => categories.add(cat));
      logo.tags.forEach(tag => tags.add(tag));
    });

    return {
      version: existingCatalog.version || '1.0.0',
      lastUpdated: new Date().toISOString(),
      logos: allLogos,
      categories: Array.from(categories).sort(),
      tags: Array.from(tags).sort(),
      stats: {
        totalLogos: allLogos.length,
        totalCategories: categories.size,
        totalTags: tags.size,
        lastUpdate: new Date().toISOString()
      }
    };
  }

  /**
   * Save catalog to file
   */
  async saveCatalog(catalog) {
    const catalogJson = JSON.stringify(catalog, null, 2);
    fs.writeFileSync(this.options.catalogPath, catalogJson);
  }

  /**
   * Watch for file changes and auto-update
   */
  startWatcher() {
    const chokidar = require('chokidar');
    
    const watcher = chokidar.watch(`${this.options.logosDir}/**/metadata.json`, {
      ignored: /node_modules/,
      persistent: true
    });

    watcher
      .on('add', (filePath) => this.handleFileChange('add', filePath))
      .on('change', (filePath) => this.handleFileChange('change', filePath))
      .on('unlink', (filePath) => this.handleFileChange('delete', filePath));

    console.log('👁️  Watching for logo changes...');
    return watcher;
  }

  /**
   * Handle file change events
   */
  async handleFileChange(event, filePath) {
    const logoSlug = path.basename(path.dirname(filePath));
    
    console.log(`📁 Detected ${event} in ${logoSlug}`);
    
    try {
      if (event === 'delete') {
        await this.removeLogo(logoSlug);
      } else {
        await this.updateLogos([logoSlug]);
      }
    } catch (error) {
      console.error(`Failed to handle ${event} for ${logoSlug}:`, error.message);
    }
  }

  /**
   * Remove logo from catalog
   */
  async removeLogo(logoSlug) {
    const existingCatalog = await this.loadExistingCatalog();
    
    existingCatalog.logos = existingCatalog.logos.filter(
      logo => logo.slug !== logoSlug
    );

    // Rebuild categories and tags
    const categories = new Set();
    const tags = new Set();
    
    existingCatalog.logos.forEach(logo => {
      logo.categories.forEach(cat => categories.add(cat));
      logo.tags.forEach(tag => tags.add(tag));
    });

    existingCatalog.categories = Array.from(categories).sort();
    existingCatalog.tags = Array.from(tags).sort();
    existingCatalog.lastUpdated = new Date().toISOString();

    await this.saveCatalog(existingCatalog);
    console.log(`✓ Removed ${logoSlug} from catalog`);
  }
}

// Export for use in other scripts
export { IncrementalCatalogUpdater };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const logoSlugs = process.argv.slice(2);
  
  if (logoSlugs.length === 0) {
    console.error('Usage: node incrementalCatalogUpdate.js <logo-slug> [<logo-slug> ...]');
    process.exit(1);
  }

  const updater = new IncrementalCatalogUpdater();
  updater.updateLogos(logoSlugs).catch(console.error);
}