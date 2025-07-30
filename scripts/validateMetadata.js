/**
 * Metadata Validation Script
 * Validates all metadata.json files against the schema
 */

import fs from 'fs';
import path from 'path';
import Ajv from 'ajv';

/**
 * Metadata validator class
 */
class MetadataValidator {
  constructor(options = {}) {
    this.options = {
      logosDir: options.logosDir || './assets/logos',
      strict: options.strict !== false,
      ...options
    };
    
    this.ajv = new Ajv({ allErrors: true });
    this.schema = this.getMetadataSchema();
    this.validate = this.ajv.compile(this.schema);
  }

  /**
   * Define the metadata schema
   */
  getMetadataSchema() {
    return {
      type: 'object',
      required: ['name', 'slug', 'categories', 'tags', 'license'],
      properties: {
        name: {
          type: 'string',
          minLength: 1,
          maxLength: 100
        },
        slug: {
          type: 'string',
          pattern: '^[a-z0-9-]+$',
          minLength: 1,
          maxLength: 50
        },
        description: {
          type: 'string',
          maxLength: 500
        },
        categories: {
          type: 'array',
          items: {
            type: 'string',
            pattern: '^[a-z-]+$'
          },
          minItems: 1,
          maxItems: 5
        },
        tags: {
          type: 'array',
          items: {
            type: 'string',
            pattern: '^[a-z-]+$'
          },
          maxItems: 10
        },
        license: {
          type: 'string',
          enum: ['MIT', 'Apache-2.0', 'GPL-3.0', 'BSD-3-Clause', 'CC0-1.0', 'Custom', 'Unknown']
        },
        website: {
          type: 'string',
          format: 'uri'
        },
        keywords: {
          type: 'array',
          items: {
            type: 'string'
          },
          maxItems: 20
        }
      },
      additionalProperties: false
    };
  }

  /**
   * Validate all metadata files
   */
  async validateAllMetadata() {
    console.log('🔍 Starting metadata validation...');
    
    const logosDir = this.options.logosDir;
    const logoDirectories = fs.readdirSync(logosDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    let validCount = 0;
    let errorCount = 0;
    const errors = [];

    for (const logoDir of logoDirectories) {
      try {
        const result = await this.validateLogoMetadata(logoDir);
        if (result.valid) {
          validCount++;
          console.log(`✓ ${logoDir} - Valid`);
        } else {
          errorCount++;
          errors.push({ logo: logoDir, errors: result.errors });
          console.log(`✗ ${logoDir} - Invalid`);
          result.errors.forEach(error => {
            console.log(`    ${error.instancePath}: ${error.message}`);
          });
        }
      } catch (error) {
        errorCount++;
        errors.push({ logo: logoDir, errors: [{ message: error.message }] });
        console.error(`✗ ${logoDir} - Error: ${error.message}`);
      }
    }

    console.log(`\n🔍 Metadata validation complete:`);
    console.log(`   ✓ Valid: ${validCount} logos`);
    console.log(`   ✗ Invalid: ${errorCount} logos`);

    if (errorCount > 0 && this.options.strict) {
      throw new Error(`Validation failed: ${errorCount} logos have invalid metadata`);
    }

    return { validCount, errorCount, errors };
  }

  /**
   * Validate metadata for a specific logo
   */
  async validateLogoMetadata(logoSlug) {
    const logoDir = path.join(this.options.logosDir, logoSlug);
    const metadataPath = path.join(logoDir, 'metadata.json');

    if (!fs.existsSync(metadataPath)) {
      throw new Error(`metadata.json not found in ${logoDir}`);
    }

    // Read and parse metadata
    const metadataContent = fs.readFileSync(metadataPath, 'utf8');
    let metadata;
    
    try {
      metadata = JSON.parse(metadataContent);
    } catch (error) {
      throw new Error(`Invalid JSON in metadata.json: ${error.message}`);
    }

    // Validate against schema
    const valid = this.validate(metadata);
    const errors = valid ? [] : this.validate.errors;

    // Additional custom validations
    if (valid) {
      const customErrors = await this.performCustomValidations(logoSlug, metadata);
      if (customErrors.length > 0) {
        errors.push(...customErrors);
        return { valid: false, errors };
      }
    }

    return { valid, errors };
  }

  /**
   * Perform custom validations beyond schema
   */
  async performCustomValidations(logoSlug, metadata) {
    const errors = [];
    const logoDir = path.join(this.options.logosDir, logoSlug);

    // Check if slug matches directory name
    if (metadata.slug !== logoSlug) {
      errors.push({
        instancePath: '/slug',
        message: `Slug "${metadata.slug}" doesn't match directory name "${logoSlug}"`
      });
    }

    // Check if required SVG files exist
    const requiredFiles = ['logo.svg'];
    for (const file of requiredFiles) {
      const filePath = path.join(logoDir, file);
      if (!fs.existsSync(filePath)) {
        errors.push({
          instancePath: '/files',
          message: `Required file ${file} is missing`
        });
      }
    }

    // Validate categories against known categories
    const knownCategories = [
      'technology', 'social', 'finance', 'development', 'design', 
      'productivity', 'entertainment', 'education', 'business'
    ];
    
    const unknownCategories = metadata.categories.filter(cat => 
      !knownCategories.includes(cat)
    );
    
    if (unknownCategories.length > 0) {
      errors.push({
        instancePath: '/categories',
        message: `Unknown categories: ${unknownCategories.join(', ')}`
      });
    }

    return errors;
  }

  /**
   * Generate validation report
   */
  generateReport(results) {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total: results.validCount + results.errorCount,
        valid: results.validCount,
        invalid: results.errorCount,
        successRate: ((results.validCount / (results.validCount + results.errorCount)) * 100).toFixed(1)
      },
      errors: results.errors
    };

    return report;
  }
}

// Export for use in other scripts
export { MetadataValidator };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const validator = new MetadataValidator();
  validator.validateAllMetadata()
    .then(results => {
      const report = validator.generateReport(results);
      console.log('\n📊 Validation Report:');
      console.log(JSON.stringify(report.summary, null, 2));
      
      if (results.errorCount > 0) {
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('Validation failed:', error.message);
      process.exit(1);
    });
}