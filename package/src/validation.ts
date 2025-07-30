/**
 * TypeScript Logo Metadata Validation Utilities
 * Provides validation functions for use in the NPM package
 */

import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { LogoMetadata } from './types.js';
import fs from 'fs';
import path from 'path';

/**
 * JSON Schema for logo metadata validation (TypeScript version)
 */
const metadataSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  required: ['name', 'slug', 'categories', 'tags', 'license', 'variants', 'formats'],
  properties: {
    name: {
      type: 'string',
      minLength: 1,
      maxLength: 100,
      pattern: '^[^\\n\\r\\t]+$',
      description: 'Display name of the logo'
    },
    slug: {
      type: 'string',
      minLength: 1,
      maxLength: 50,
      pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$',
      description: 'URL-friendly slug (kebab-case)'
    },
    categories: {
      type: 'array',
      minItems: 1,
      maxItems: 10,
      items: {
        type: 'string',
        minLength: 1,
        maxLength: 50,
        pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$'
      },
      uniqueItems: true,
      description: 'Categories this logo belongs to'
    },
    tags: {
      type: 'array',
      minItems: 1,
      maxItems: 20,
      items: {
        type: 'string',
        minLength: 1,
        maxLength: 30,
        pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$'
      },
      uniqueItems: true,
      description: 'Tags associated with this logo'
    },
    description: {
      type: 'string',
      minLength: 10,
      maxLength: 500,
      description: 'Optional description of the logo'
    },
    license: {
      oneOf: [
        {
          type: 'string',
          enum: ['MIT', 'Apache-2.0', 'GPL-3.0', 'BSD-3-Clause', 'CC0', 'Fair Use', 'Proprietary'],
          description: 'Simple license string'
        },
        {
          type: 'object',
          required: ['type'],
          properties: {
            type: {
              type: 'string',
              enum: ['MIT', 'Apache-2.0', 'GPL-3.0', 'BSD-3-Clause', 'CC0', 'Fair Use', 'Proprietary']
            },
            url: {
              type: 'string',
              format: 'uri',
              description: 'URL to license text'
            },
            notes: {
              type: 'string',
              maxLength: 200,
              description: 'Additional license notes'
            }
          },
          additionalProperties: false
        }
      ]
    },   
 variants: {
      type: 'object',
      required: ['original', 'white', 'black'],
      properties: {
        original: {
          type: 'string',
          pattern: '^[a-zA-Z0-9._-]+\\.svg$',
          description: 'Original logo filename'
        },
        white: {
          type: 'string',
          pattern: '^[a-zA-Z0-9._-]+\\.svg$',
          description: 'White variant filename'
        },
        black: {
          type: 'string',
          pattern: '^[a-zA-Z0-9._-]+\\.svg$',
          description: 'Black variant filename'
        },
        optimized: {
          type: 'string',
          pattern: '^[a-zA-Z0-9._-]+\\.svg$',
          description: 'Optimized variant filename'
        }
      },
      additionalProperties: false
    },
    formats: {
      type: 'object',
      required: ['svg'],
      properties: {
        svg: {
          oneOf: [
            {
              type: 'string',
              pattern: '^[a-zA-Z0-9._-]+\\.svg$'
            },
            {
              type: 'object',
              required: ['url'],
              properties: {
                url: {
                  type: 'string',
                  pattern: '^[a-zA-Z0-9._-]+\\.svg$'
                },
                fileSize: {
                  type: 'integer',
                  minimum: 1
                },
                checksum: {
                  type: 'string',
                  pattern: '^[a-f0-9]{64}$'
                }
              },
              additionalProperties: false
            }
          ]
        },
        png: {
          type: 'object',
          properties: {
            '64': {
              type: 'object',
              required: ['url'],
              properties: {
                url: {
                  type: 'string',
                  pattern: '^[a-zA-Z0-9._-]+\\.png$'
                },
                fileSize: {
                  type: 'integer',
                  minimum: 1
                },
                checksum: {
                  type: 'string',
                  pattern: '^[a-f0-9]{64}$'
                }
              },
              additionalProperties: false
            },
            '128': {
              type: 'object',
              required: ['url'],
              properties: {
                url: {
                  type: 'string',
                  pattern: '^[a-zA-Z0-9._-]+\\.png$'
                },
                fileSize: {
                  type: 'integer',
                  minimum: 1
                },
                checksum: {
                  type: 'string',
                  pattern: '^[a-f0-9]{64}$'
                }
              },
              additionalProperties: false
            },
            '256': {
              type: 'object',
              required: ['url'],
              properties: {
                url: {
                  type: 'string',
                  pattern: '^[a-zA-Z0-9._-]+\\.png$'
                },
                fileSize: {
                  type: 'integer',
                  minimum: 1
                },
                checksum: {
                  type: 'string',
                  pattern: '^[a-f0-9]{64}$'
                }
              },
              additionalProperties: false
            }
          },
          additionalProperties: false
        }
      },
      additionalProperties: false
    },
    metadata: {
      type: 'object',
      properties: {
        createdAt: {
          type: 'string',
          format: 'date-time',
          description: 'ISO 8601 creation timestamp'
        },
        updatedAt: {
          type: 'string',
          format: 'date-time',
          description: 'ISO 8601 update timestamp'
        },
        fileSize: {
          type: 'integer',
          minimum: 1,
          description: 'Original file size in bytes'
        },
        dimensions: {
          type: 'object',
          required: ['width', 'height'],
          properties: {
            width: {
              type: 'integer',
              minimum: 1,
              maximum: 10000
            },
            height: {
              type: 'integer',
              minimum: 1,
              maximum: 10000
            }
          },
          additionalProperties: false
        }
      },
      additionalProperties: false
    }
  },
  additionalProperties: false
} as const;

/**
 * Validation error interface
 */
export interface ValidationError {
  field: string;
  message: string;
  value: unknown;
  constraint?: Record<string, unknown>;
}

/**
 * Validation result interface
 */
export interface ValidationResult {
  success: boolean;
  errors: ValidationError[];
}

/**
 * Custom error class for metadata validation
 */
export class MetadataValidationError extends Error {
  public readonly code: string;
  public readonly details: Record<string, unknown>;

  constructor(message: string, code: string, details: Record<string, unknown> = {}) {
    super(message);
    this.name = 'MetadataValidationError';
    this.code = code;
    this.details = details;
  }
}

/**
 * TypeScript metadata validator class
 */
export class TypeScriptMetadataValidator {
  private ajv: Ajv;
  private validate: Ajv.ValidateFunction;

  constructor() {
    this.ajv = new Ajv({ 
      allErrors: true, 
      verbose: true,
      strict: false 
    });
    addFormats(this.ajv);
    this.validate = this.ajv.compile(metadataSchema);
  }

  /**
   * Validates metadata object against schema
   * @param metadata - The metadata object to validate
   * @returns Validation result with success flag and errors
   */
  validateMetadata(metadata: unknown): ValidationResult {
    try {
      const isValid = this.validate(metadata);
      
      if (isValid) {
        return {
          success: true,
          errors: []
        };
      }

      const errors: ValidationError[] = (this.validate.errors || []).map(error => ({
        field: error.instancePath || error.schemaPath,
        message: error.message || 'Validation error',
        value: error.data,
        constraint: error.params
      }));

      return {
        success: false,
        errors
      };
    } catch (error) {
      throw new MetadataValidationError(
        'Failed to validate metadata',
        'VALIDATION_ERROR',
        { originalError: error instanceof Error ? error.message : String(error) }
      );
    }
  }  /**

   * Type guard to check if an object is valid LogoMetadata
   * @param obj - Object to check
   * @returns True if object is valid LogoMetadata
   */
  isValidLogoMetadata(obj: unknown): obj is LogoMetadata {
    const result = this.validateMetadata(obj);
    return result.success;
  }

  /**
   * Validates and casts an object to LogoMetadata
   * @param obj - Object to validate and cast
   * @returns LogoMetadata object
   * @throws MetadataValidationError if validation fails
   */
  validateAndCast(obj: unknown): LogoMetadata {
    const result = this.validateMetadata(obj);
    
    if (!result.success) {
      throw new MetadataValidationError(
        'Metadata validation failed',
        'VALIDATION_FAILED',
        { errors: result.errors }
      );
    }

    return obj as LogoMetadata;
  }

  /**
   * Validates an array of metadata objects
   * @param metadataArray - Array of metadata objects to validate
   * @returns Validation results for each object
   */
  validateMetadataArray(metadataArray: unknown[]): {
    success: boolean;
    validItems: LogoMetadata[];
    invalidItems: Array<{ index: number; errors: ValidationError[] }>;
  } {
    const validItems: LogoMetadata[] = [];
    const invalidItems: Array<{ index: number; errors: ValidationError[] }> = [];

    metadataArray.forEach((item, index) => {
      const result = this.validateMetadata(item);
      
      if (result.success) {
        validItems.push(item as LogoMetadata);
      } else {
        invalidItems.push({ index, errors: result.errors });
      }
    });

    return {
      success: invalidItems.length === 0,
      validItems,
      invalidItems
    };
  }

  /**
   * Validates metadata file from filesystem
   * @param filePath - Path to metadata.json file
   * @returns Validation result with metadata
   * @throws MetadataValidationError if file operations or validation fails
   */
  validateMetadataFile(filePath: string): {
    success: true;
    metadata: LogoMetadata;
    filePath: string;
  } {
    try {
      if (!fs.existsSync(filePath)) {
        throw new MetadataValidationError(
          `Metadata file not found: ${filePath}`,
          'FILE_NOT_FOUND',
          { filePath }
        );
      }

      const fileContent = fs.readFileSync(filePath, 'utf8');
      let metadata: unknown;

      try {
        metadata = JSON.parse(fileContent);
      } catch (parseError) {
        throw new MetadataValidationError(
          `Invalid JSON in metadata file: ${filePath}`,
          'INVALID_JSON',
          { 
            filePath, 
            parseError: parseError instanceof Error ? parseError.message : String(parseError) 
          }
        );
      }

      const result = this.validateMetadata(metadata);
      
      if (!result.success) {
        throw new MetadataValidationError(
          `Metadata validation failed for ${filePath}`,
          'VALIDATION_FAILED',
          { filePath, errors: result.errors }
        );
      }

      return {
        success: true,
        metadata: metadata as LogoMetadata,
        filePath
      };
    } catch (error) {
      if (error instanceof MetadataValidationError) {
        throw error;
      }
      
      throw new MetadataValidationError(
        `Unexpected error validating metadata file: ${filePath}`,
        'UNEXPECTED_ERROR',
        { 
          filePath, 
          originalError: error instanceof Error ? error.message : String(error) 
        }
      );
    }
  }  /*
*
   * Validates all metadata files in a directory
   * @param logoDir - Directory containing logo subdirectories
   * @returns Validation results for all files
   * @throws MetadataValidationError if directory operations fail
   */
  validateAllMetadata(logoDir: string): {
    success: boolean;
    validFiles: Array<{
      path: string;
      slug: string;
      metadata: LogoMetadata;
    }>;
    invalidFiles: Array<{
      path: string;
      slug: string;
      error: {
        code: string;
        message: string;
        details: Record<string, unknown>;
      };
    }>;
    totalFiles: number;
  } {
    const results = {
      success: true,
      validFiles: [] as Array<{
        path: string;
        slug: string;
        metadata: LogoMetadata;
      }>,
      invalidFiles: [] as Array<{
        path: string;
        slug: string;
        error: {
          code: string;
          message: string;
          details: Record<string, unknown>;
        };
      }>,
      totalFiles: 0
    };

    try {
      if (!fs.existsSync(logoDir)) {
        throw new MetadataValidationError(
          `Logo directory not found: ${logoDir}`,
          'DIRECTORY_NOT_FOUND',
          { logoDir }
        );
      }

      const logoSubdirs = fs.readdirSync(logoDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

      for (const subdir of logoSubdirs) {
        const metadataPath = path.join(logoDir, subdir, 'metadata.json');
        results.totalFiles++;

        try {
          const result = this.validateMetadataFile(metadataPath);
          results.validFiles.push({
            path: metadataPath,
            slug: subdir,
            metadata: result.metadata
          });
        } catch (error) {
          results.success = false;
          const validationError = error as MetadataValidationError;
          results.invalidFiles.push({
            path: metadataPath,
            slug: subdir,
            error: {
              code: validationError.code,
              message: validationError.message,
              details: validationError.details
            }
          });
        }
      }

      return results;
    } catch (error) {
      if (error instanceof MetadataValidationError) {
        throw error;
      }
      
      throw new MetadataValidationError(
        `Failed to validate metadata directory: ${logoDir}`,
        'DIRECTORY_VALIDATION_ERROR',
        { 
          logoDir, 
          originalError: error instanceof Error ? error.message : String(error) 
        }
      );
    }
  }  /**

   * Performs additional business logic validation
   * @param metadata - The metadata object
   * @param logoDir - Directory containing the logo files
   * @returns Additional validation results
   */
  validateBusinessRules(metadata: LogoMetadata, logoDir: string): {
    success: boolean;
    errors: ValidationError[];
  } {
    const errors: ValidationError[] = [];

    try {
      // Check if variant files exist
      const variantFiles: Array<keyof typeof metadata.variants> = ['original', 'white', 'black'];
      for (const variant of variantFiles) {
        if (metadata.variants[variant]) {
          const filePath = path.join(logoDir, metadata.variants[variant]);
          if (!fs.existsSync(filePath)) {
            errors.push({
              field: `variants.${variant}`,
              message: `Referenced file does not exist: ${metadata.variants[variant]}`,
              value: metadata.variants[variant]
            });
          }
        }
      }

      // Check if format files exist
      if (typeof metadata.formats.svg === 'string') {
        const svgPath = path.join(logoDir, metadata.formats.svg);
        if (!fs.existsSync(svgPath)) {
          errors.push({
            field: 'formats.svg',
            message: `Referenced SVG file does not exist: ${metadata.formats.svg}`,
            value: metadata.formats.svg
          });
        }
      } else if (metadata.formats.svg?.url) {
        const svgPath = path.join(logoDir, metadata.formats.svg.url);
        if (!fs.existsSync(svgPath)) {
          errors.push({
            field: 'formats.svg.url',
            message: `Referenced SVG file does not exist: ${metadata.formats.svg.url}`,
            value: metadata.formats.svg.url
          });
        }
      }

      // Check PNG format files if they exist
      if (metadata.formats.png) {
        const pngSizes: Array<keyof typeof metadata.formats.png> = ['64', '128', '256'];
        for (const size of pngSizes) {
          const pngFormat = metadata.formats.png[size];
          if (pngFormat?.url) {
            const pngPath = path.join(logoDir, pngFormat.url);
            if (!fs.existsSync(pngPath)) {
              errors.push({
                field: `formats.png.${size}.url`,
                message: `Referenced PNG file does not exist: ${pngFormat.url}`,
                value: pngFormat.url
              });
            }
          }
        }
      }

      // Validate slug matches directory name
      const expectedSlug = path.basename(logoDir);
      if (metadata.slug !== expectedSlug) {
        errors.push({
          field: 'slug',
          message: `Slug "${metadata.slug}" does not match directory name "${expectedSlug}"`,
          value: metadata.slug
        });
      }

      // Validate file extensions
      const svgExtensionRegex = /\.svg$/i;
      const pngExtensionRegex = /\.png$/i;

      // Check variant file extensions
      for (const [variant, filename] of Object.entries(metadata.variants)) {
        if (filename && !svgExtensionRegex.test(filename)) {
          errors.push({
            field: `variants.${variant}`,
            message: `Variant file must have .svg extension: ${filename}`,
            value: filename
          });
        }
      }

      // Check format file extensions
      if (typeof metadata.formats.svg === 'string' && !svgExtensionRegex.test(metadata.formats.svg)) {
        errors.push({
          field: 'formats.svg',
          message: `SVG format file must have .svg extension: ${metadata.formats.svg}`,
          value: metadata.formats.svg
        });
      } else if (metadata.formats.svg?.url && !svgExtensionRegex.test(metadata.formats.svg.url)) {
        errors.push({
          field: 'formats.svg',
          message: `SVG format file must have .svg extension: ${metadata.formats.svg.url}`,
          value: metadata.formats.svg.url
        });
      }

      if (metadata.formats.png) {
        for (const [size, pngFormat] of Object.entries(metadata.formats.png)) {
          if (pngFormat?.url && !pngExtensionRegex.test(pngFormat.url)) {
            errors.push({
              field: `formats.png.${size}.url`,
              message: `PNG format file must have .png extension: ${pngFormat.url}`,
              value: pngFormat.url
            });
          }
        }
      }

      return {
        success: errors.length === 0,
        errors
      };
    } catch (error) {
      // If filesystem operations fail, add a general error
      errors.push({
        field: 'filesystem',
        message: `Failed to validate business rules: ${error instanceof Error ? error.message : String(error)}`,
        value: logoDir
      });

      return {
        success: false,
        errors
      };
    }
  }  /*
*
   * Comprehensive validation that combines schema and business rule validation
   * @param metadata - The metadata object
   * @param logoDir - Optional directory containing the logo files for business rule validation
   * @returns Complete validation results
   */
  validateComprehensive(metadata: unknown, logoDir?: string): {
    success: boolean;
    schemaValidation: ValidationResult;
    businessValidation?: {
      success: boolean;
      errors: ValidationError[];
    };
    metadata?: LogoMetadata;
  } {
    const schemaValidation = this.validateMetadata(metadata);
    
    const result = {
      success: schemaValidation.success,
      schemaValidation,
      metadata: schemaValidation.success ? (metadata as LogoMetadata) : undefined
    } as {
      success: boolean;
      schemaValidation: ValidationResult;
      businessValidation?: {
        success: boolean;
        errors: ValidationError[];
      };
      metadata?: LogoMetadata;
    };

    // Only perform business validation if schema validation passes and logoDir is provided
    if (schemaValidation.success && logoDir && result.metadata) {
      const businessValidation = this.validateBusinessRules(result.metadata, logoDir);
      result.businessValidation = businessValidation;
      result.success = result.success && businessValidation.success;
    }

    return result;
  }
}

/**
 * Default validator instance
 */
export const metadataValidator = new TypeScriptMetadataValidator();

/**
 * Convenience function to validate metadata
 * @param metadata - Metadata object to validate
 * @returns Validation result
 */
export function validateMetadata(metadata: unknown): ValidationResult {
  return metadataValidator.validateMetadata(metadata);
}

/**
 * Convenience function to check if object is valid LogoMetadata
 * @param obj - Object to check
 * @returns True if object is valid LogoMetadata
 */
export function isValidLogoMetadata(obj: unknown): obj is LogoMetadata {
  return metadataValidator.isValidLogoMetadata(obj);
}

/**
 * Convenience function to validate metadata file
 * @param filePath - Path to metadata.json file
 * @returns Validation result with metadata
 */
export function validateMetadataFile(filePath: string) {
  return metadataValidator.validateMetadataFile(filePath);
}

/**
 * Convenience function to validate all metadata files in directory
 * @param logoDir - Directory containing logo subdirectories
 * @returns Validation results for all files
 */
export function validateAllMetadata(logoDir: string) {
  return metadataValidator.validateAllMetadata(logoDir);
}

/**
 * Convenience function for comprehensive validation
 * @param metadata - Metadata object to validate
 * @param logoDir - Optional directory for business rule validation
 * @returns Complete validation results
 */
export function validateComprehensive(metadata: unknown, logoDir?: string) {
  return metadataValidator.validateComprehensive(metadata, logoDir);
}

/**
 * Export the schema for external use
 */
export { metadataSchema };