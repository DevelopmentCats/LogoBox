#!/usr/bin/env node

/**
 * Run only essential tests for deployment
 * This script runs a subset of tests that are critical for deployment
 */

import { execSync } from 'child_process';

const essentialTests = [
  'website/src/tests/unit/useLogoFilters.test.js',
  'website/src/tests/unit/FilterPanel.simple.test.js',
  'website/src/tests/unit/SearchBar.test.js',
  'website/src/tests/unit/ErrorBoundary.test.js',
  'website/src/tests/unit/router.test.js',
  'tests/unit/downloadUtils.test.ts'
];

console.log('🧪 Running essential tests for deployment...\n');

try {
  const testFiles = essentialTests.join(' ');
  const command = `npx vitest run ${testFiles} --reporter=verbose`;
  
  console.log(`Running: ${command}\n`);
  execSync(command, { stdio: 'inherit' });
  
  console.log('\n✅ Essential tests passed! Deployment can proceed.');
  process.exit(0);
} catch (error) {
  console.error('\n❌ Essential tests failed!');
  console.error('Please fix critical issues before deployment.');
  process.exit(1);
}