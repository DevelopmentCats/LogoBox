#!/usr/bin/env node

/**
 * Environment Variable Validation Script
 * 
 * This script validates that all required environment variables are set
 * and have valid values for the LogoBox application.
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Color codes for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

// Required environment variables for different components
const requiredVars = {
  website: {
    required: [
      'VITE_APP_TITLE',
      'VITE_APP_DESCRIPTION',
      'VITE_API_BASE_URL',
      'VITE_CDN_BASE_URL',
      'VITE_CATALOG_PATH',
      'VITE_LOGOS_PATH'
    ],
    optional: [
      'VITE_API_TIMEOUT',
      'VITE_API_RETRY_ATTEMPTS',
      'VITE_API_RETRY_DELAY',
      'VITE_ENABLE_ANALYTICS',
      'VITE_ENABLE_PERFORMANCE_MONITORING',
      'VITE_LOG_LEVEL',
      'VITE_CDN_FALLBACK_URL_1',
      'VITE_CDN_FALLBACK_URL_2'
    ]
  },
  package: {
    required: [
      'LOGOBOX_BASE_URL',
      'LOGOBOX_CDN_BASE_URL'
    ],
    optional: [
      'LOGOBOX_DEFAULT_VARIANT',
      'LOGOBOX_CACHE_ENABLED',
      'LOGOBOX_CACHE_TTL',
      'LOGOBOX_API_BASE_URL'
    ]
  },
  deployment: {
    secrets: [
      'NPM_TOKEN',
      'GITHUB_TOKEN',
      'CLOUDFLARE_API_TOKEN',
      'CLOUDFLARE_ACCOUNT_ID'
    ]
  }
};

// Validation rules
const validationRules = {
  'VITE_API_TIMEOUT': (value) => {
    const num = parseInt(value, 10);
    return !isNaN(num) && num > 0 && num <= 60000;
  },
  'VITE_API_RETRY_ATTEMPTS': (value) => {
    const num = parseInt(value, 10);
    return !isNaN(num) && num >= 0 && num <= 10;
  },
  'VITE_API_RETRY_DELAY': (value) => {
    const num = parseInt(value, 10);
    return !isNaN(num) && num >= 0 && num <= 10000;
  },
  'VITE_ENABLE_ANALYTICS': (value) => {
    return value === 'true' || value === 'false';
  },
  'VITE_ENABLE_PERFORMANCE_MONITORING': (value) => {
    return value === 'true' || value === 'false';
  },
  'VITE_LOG_LEVEL': (value) => {
    return ['debug', 'info', 'warn', 'error'].includes(value);
  },
  'LOGOBOX_DEFAULT_VARIANT': (value) => {
    return ['original', 'optimized', 'black', 'white'].includes(value);
  },
  'LOGOBOX_CACHE_ENABLED': (value) => {
    return value === 'true' || value === 'false';
  },
  'LOGOBOX_CACHE_TTL': (value) => {
    const num = parseInt(value, 10);
    return !isNaN(num) && num > 0;
  }
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

function checkEnvFile(filePath, componentName) {
  if (!existsSync(filePath)) {
    logWarning(`${componentName} environment file not found: ${filePath}`);
    return false;
  }
  
  logSuccess(`${componentName} environment file found: ${filePath}`);
  return true;
}

function loadEnvFile(filePath) {
  try {
    const content = readFileSync(filePath, 'utf8');
    const env = {};
    
    content.split('\n').forEach(line => {
      line = line.trim();
      if (line && !line.startsWith('#') && line.includes('=')) {
        const [key, ...valueParts] = line.split('=');
        const value = valueParts.join('=').trim();
        env[key.trim()] = value;
      }
    });
    
    return env;
  } catch (error) {
    logError(`Failed to load environment file: ${filePath}`);
    return {};
  }
}

function validateVariable(key, value, isRequired = false) {
  if (!value || value.trim() === '') {
    if (isRequired) {
      logError(`Required variable ${key} is missing or empty`);
      return false;
    } else {
      logWarning(`Optional variable ${key} is not set`);
      return true;
    }
  }
  
  // Apply validation rules if they exist
  if (validationRules[key]) {
    if (!validationRules[key](value)) {
      logError(`Variable ${key} has invalid value: ${value}`);
      return false;
    }
  }
  
  logSuccess(`${key} = ${value}`);
  return true;
}

function checkComponent(componentName, envVars, config) {
  log(`\n${colors.bold}Checking ${componentName} configuration:${colors.reset}`);
  
  let allValid = true;
  
  // Check required variables
  if (config.required) {
    log('\nRequired variables:');
    for (const varName of config.required) {
      const isValid = validateVariable(varName, envVars[varName], true);
      if (!isValid) allValid = false;
    }
  }
  
  // Check optional variables
  if (config.optional) {
    log('\nOptional variables:');
    for (const varName of config.optional) {
      validateVariable(varName, envVars[varName], false);
    }
  }
  
  // Check secrets (only warn if missing, don't fail)
  if (config.secrets) {
    log('\nSecret variables (should be set in CI/CD):');
    for (const varName of config.secrets) {
      if (process.env[varName]) {
        logSuccess(`${varName} is set`);
      } else {
        logInfo(`${varName} not set (normal for local development)`);
      }
    }
  }
  
  return allValid;
}

function main() {
  log(`${colors.bold}${colors.blue}LogoBox Environment Validation${colors.reset}\n`);
  
  let overallValid = true;
  
  // Check if .env.example files exist
  log(`${colors.bold}Checking .env.example files:${colors.reset}`);
  checkEnvFile(join(rootDir, '.env.example'), 'Root');
  checkEnvFile(join(rootDir, 'website', '.env.example'), 'Website');
  checkEnvFile(join(rootDir, 'package', '.env.example'), 'Package');
  
  // Load environment variables from various sources
  const envSources = [
    join(rootDir, '.env'),
    join(rootDir, '.env.local'),
    join(rootDir, 'website', '.env'),
    join(rootDir, 'website', '.env.local'),
    join(rootDir, 'website', '.env.development'),
    join(rootDir, 'website', '.env.production'),
    join(rootDir, 'package', '.env'),
    join(rootDir, 'package', '.env.local')
  ];
  
  const allEnvVars = { ...process.env };
  
  // Load from .env files
  for (const envFile of envSources) {
    if (existsSync(envFile)) {
      const envVars = loadEnvFile(envFile);
      Object.assign(allEnvVars, envVars);
      logInfo(`Loaded variables from: ${envFile}`);
    }
  }
  
  // Validate each component
  const websiteValid = checkComponent('Website', allEnvVars, requiredVars.website);
  const packageValid = checkComponent('Package', allEnvVars, requiredVars.package);
  checkComponent('Deployment', allEnvVars, requiredVars.deployment);
  
  overallValid = websiteValid && packageValid;
  
  // Summary
  log(`\n${colors.bold}Validation Summary:${colors.reset}`);
  if (overallValid) {
    logSuccess('All required environment variables are properly configured!');
    log('\nYou can now run the application with confidence.');
  } else {
    logError('Some required environment variables are missing or invalid.');
    log('\nPlease check the errors above and update your .env files.');
    log('Refer to .env.example files for the correct format and required variables.');
  }
  
  // Exit with appropriate code
  process.exit(overallValid ? 0 : 1);
}

// Run the validation
main();