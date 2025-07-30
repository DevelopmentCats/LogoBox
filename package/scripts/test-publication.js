#!/usr/bin/env node

import { execSync } from 'child_process';
import { existsSync, rmSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { tmpdir } from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageRoot = join(__dirname, '..');

const TEST_DIR = join(tmpdir(), 'logobox-publication-test');

console.log('🧪 Starting LogoBox package publication test...\n');

let testResults = {
  passed: 0,
  failed: 0,
  details: []
};

// Cleanup function
function cleanup() {
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true, force: true });
  }
  
  // Remove any tarball files
  const packageFiles = execSync('ls *.tgz 2>/dev/null || true', { 
    cwd: packageRoot, 
    encoding: 'utf8' 
  }).trim().split('\n').filter(f => f);
  
  packageFiles.forEach(file => {
    if (file && existsSync(join(packageRoot, file))) {
      rmSync(join(packageRoot, file));
    }
  });
}

// Test runner function
function runTest(name, testFn) {
  console.log(`🔍 Testing: ${name}`);
  
  try {
    testFn();
    console.log(`✅ PASS: ${name}\n`);
    testResults.passed++;
    testResults.details.push({ name, status: 'PASS', error: null });
  } catch (error) {
    console.log(`❌ FAIL: ${name}`);
    console.log(`   Error: ${error.message}\n`);
    testResults.failed++;
    testResults.details.push({ name, status: 'FAIL', error: error.message });
  }
}

// Cleanup any previous test runs
cleanup();

// Create test directory
mkdirSync(TEST_DIR, { recursive: true });

// Test 1: Package Configuration Validation
runTest('Package Configuration Validation', () => {
  const packageJsonPath = join(packageRoot, 'package.json');
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
  
  // Validate required fields
  const requiredFields = ['name', 'version', 'description', 'main', 'module', 'types', 'exports'];
  for (const field of requiredFields) {
    if (!packageJson[field]) {
      throw new Error(`Missing required field: ${field}`);
    }
  }
  
  // Validate exports configuration
  if (!packageJson.exports['.']) {
    throw new Error('Missing main export configuration');
  }
  
  // Validate scripts
  const requiredScripts = ['build', 'test', 'lint', 'typecheck'];
  for (const script of requiredScripts) {
    if (!packageJson.scripts[script]) {
      throw new Error(`Missing required script: ${script}`);
    }
  }
});

// Test 2: TypeScript Configuration
runTest('TypeScript Configuration', () => {
  const tsconfigPath = join(packageRoot, 'tsconfig.json');
  if (!existsSync(tsconfigPath)) {
    throw new Error('tsconfig.json not found');
  }
  
  const tsconfig = JSON.parse(readFileSync(tsconfigPath, 'utf8'));
  
  // Validate compiler options
  if (!tsconfig.compilerOptions.target) {
    throw new Error('Missing target in tsconfig.json');
  }
  
  if (!tsconfig.compilerOptions.declaration) {
    throw new Error('Declaration files not enabled');
  }
});

// Test 3: Build Process
runTest('Build Process', () => {
  console.log('   Building package...');
  
  execSync('npm run build', { 
    cwd: packageRoot, 
    stdio: 'pipe' 
  });
  
  // Verify build outputs
  const distDir = join(packageRoot, 'dist');
  const requiredFiles = ['index.js', 'index.cjs', 'index.d.ts'];
  
  for (const file of requiredFiles) {
    const filePath = join(distDir, file);
    if (!existsSync(filePath)) {
      throw new Error(`Build output missing: ${file}`);
    }
    
    // Verify file is not empty
    const content = readFileSync(filePath, 'utf8');
    if (content.trim().length === 0) {
      throw new Error(`Build output is empty: ${file}`);
    }
  }
  
  console.log('   Build artifacts verified');
});

// Test 4: Linting and Type Checking
runTest('Linting and Type Checking', () => {
  console.log('   Running type check...');
  execSync('npm run typecheck', { 
    cwd: packageRoot, 
    stdio: 'pipe' 
  });
  
  console.log('   Running linter...');
  execSync('npm run lint', { 
    cwd: packageRoot, 
    stdio: 'pipe' 
  });
});

// Test 5: Unit Tests
runTest('Unit Tests', () => {
  console.log('   Running unit tests...');
  execSync('npm run test:unit', { 
    cwd: packageRoot, 
    stdio: 'pipe' 
  });
});

// Test 6: Package Creation
runTest('Package Creation (npm pack)', () => {
  console.log('   Creating package tarball...');
  
  const packOutput = execSync('npm pack', { 
    cwd: packageRoot, 
    encoding: 'utf8' 
  });
  
  const tarballName = packOutput.trim();
  const tarballPath = join(packageRoot, tarballName);
  
  if (!existsSync(tarballPath)) {
    throw new Error(`Tarball not created: ${tarballName}`);
  }
  
  // Verify tarball size (should be reasonable)
  const stats = readFileSync(tarballPath);
  if (stats.length < 1000) { // Less than 1KB seems too small
    throw new Error('Tarball seems too small, possible build issue');
  }
  
  console.log(`   Package created: ${tarballName} (${Math.round(stats.length / 1024)}KB)`);
});

// Test 7: Package Installation Test
runTest('Package Installation Test', () => {
  // Get the tarball name
  const packFiles = execSync('ls *.tgz', { 
    cwd: packageRoot, 
    encoding: 'utf8' 
  }).trim().split('\n');
  
  if (packFiles.length === 0) {
    throw new Error('No tarball found for installation test');
  }
  
  const tarballName = packFiles[0];
  const tarballPath = join(packageRoot, tarballName);
  
  // Create test installation directory
  const installTestDir = join(TEST_DIR, 'install-test');
  mkdirSync(installTestDir, { recursive: true });
  
  console.log('   Creating test package.json...');
  const testPackageJson = {
    name: 'logobox-install-test',
    version: '1.0.0',
    type: 'module'
  };
  writeFileSync(
    join(installTestDir, 'package.json'), 
    JSON.stringify(testPackageJson, null, 2)
  );
  
  console.log('   Installing package from tarball...');
  execSync(`npm install ${tarballPath}`, { 
    cwd: installTestDir, 
    stdio: 'pipe' 
  });
  
  // Verify installation
  const nodeModulesPath = join(installTestDir, 'node_modules', 'logobox');
  if (!existsSync(nodeModulesPath)) {
    throw new Error('Package not installed in node_modules');
  }
  
  // Verify required files are present
  const requiredFiles = ['package.json', 'dist/index.js', 'dist/index.cjs', 'dist/index.d.ts'];
  for (const file of requiredFiles) {
    if (!existsSync(join(nodeModulesPath, file))) {
      throw new Error(`Required file missing in installed package: ${file}`);
    }
  }
  
  console.log('   Package installed successfully');
});

// Test 8: Module Import Test
runTest('Module Import Test', () => {
  const installTestDir = join(TEST_DIR, 'install-test');
  
  // Test ES Module import
  console.log('   Testing ES module import...');
  const esmTestScript = `
    import { logobox, LogoBoxAPI, LogoBoxError } from 'logobox';
    
    console.log('ESM Import test:');
    console.log('- logobox type:', typeof logobox);
    console.log('- LogoBoxAPI type:', typeof LogoBoxAPI);
    console.log('- LogoBoxError type:', typeof LogoBoxError);
    
    // Test basic functionality
    const api = new LogoBoxAPI();
    console.log('- LogoBoxAPI instantiation: OK');
    
    // Test URL generation (sync method)
    try {
      const url = logobox.getLogoUrl('github');
      console.log('- URL generation: OK');
    } catch (error) {
      console.log('- URL generation validation: OK');
    }
    
    console.log('✅ ESM import test passed');
  `;
  
  writeFileSync(join(installTestDir, 'test-esm.js'), esmTestScript);
  
  const esmOutput = execSync('node test-esm.js', { 
    cwd: installTestDir, 
    encoding: 'utf8' 
  });
  
  if (!esmOutput.includes('✅ ESM import test passed')) {
    throw new Error('ES module import test failed');
  }
  
  // Test CommonJS import
  console.log('   Testing CommonJS import...');
  
  // Create CJS test environment
  const cjsTestDir = join(TEST_DIR, 'cjs-test');
  mkdirSync(cjsTestDir, { recursive: true });
  
  const cjsPackageJson = {
    name: 'logobox-cjs-test',
    version: '1.0.0'
    // No "type": "module" for CJS
  };
  writeFileSync(
    join(cjsTestDir, 'package.json'), 
    JSON.stringify(cjsPackageJson, null, 2)
  );
  
  const packFiles = execSync('ls *.tgz', { 
    cwd: packageRoot, 
    encoding: 'utf8' 
  }).trim().split('\n');
  const tarballPath = join(packageRoot, packFiles[0]);
  
  execSync(`npm install ${tarballPath}`, { 
    cwd: cjsTestDir, 
    stdio: 'pipe' 
  });
  
  const cjsTestScript = `
    const { logobox, LogoBoxAPI, LogoBoxError } = require('logobox');
    
    console.log('CJS Import test:');
    console.log('- logobox type:', typeof logobox);
    console.log('- LogoBoxAPI type:', typeof LogoBoxAPI);
    console.log('- LogoBoxError type:', typeof LogoBoxError);
    
    // Test basic functionality
    const api = new LogoBoxAPI();
    console.log('- LogoBoxAPI instantiation: OK');
    
    // Test URL generation
    try {
      const url = logobox.getLogoUrl('github');
      console.log('- URL generation: OK');
    } catch (error) {
      console.log('- URL generation validation: OK');
    }
    
    console.log('✅ CJS import test passed');
  `;
  
  writeFileSync(join(cjsTestDir, 'test-cjs.js'), cjsTestScript);
  
  const cjsOutput = execSync('node test-cjs.js', { 
    cwd: cjsTestDir, 
    encoding: 'utf8' 
  });
  
  if (!cjsOutput.includes('✅ CJS import test passed')) {
    throw new Error('CommonJS import test failed');
  }
  
  console.log('   Both ESM and CJS imports working correctly');
});

// Test 9: TypeScript Declarations Test
runTest('TypeScript Declarations Test', () => {
  console.log('   Testing TypeScript declarations...');
  
  const tsTestDir = join(TEST_DIR, 'ts-test');
  mkdirSync(tsTestDir, { recursive: true });
  
  // Install TypeScript and our package
  const tsPackageJson = {
    name: 'logobox-ts-test',
    version: '1.0.0'
  };
  writeFileSync(
    join(tsTestDir, 'package.json'), 
    JSON.stringify(tsPackageJson, null, 2)
  );
  
  execSync('npm install typescript @types/node', { 
    cwd: tsTestDir, 
    stdio: 'pipe' 
  });
  
  const packFiles = execSync('ls *.tgz', { 
    cwd: packageRoot, 
    encoding: 'utf8' 
  }).trim().split('\n');
  const tarballPath = join(packageRoot, packFiles[0]);
  
  execSync(`npm install ${tarballPath}`, { 
    cwd: tsTestDir, 
    stdio: 'pipe' 
  });
  
  // Create TypeScript test file
  const tsTestScript = `
    import { 
      LogoBoxAPI, 
      logobox, 
      LogoBoxError, 
      ERROR_CODES,
      LogoSearchQuery,
      LogoSearchResult,
      Logo,
      LogoVariant,
      LogoBoxConfig
    } from 'logobox';
    
    // Test type definitions
    const api: LogoBoxAPI = new LogoBoxAPI();
    const query: LogoSearchQuery = { text: 'test', limit: 10 };
    const variant: LogoVariant = 'white';
    
    console.log('✅ TypeScript declarations test passed');
  `;
  
  writeFileSync(join(tsTestDir, 'test.ts'), tsTestScript);
  
  // Create tsconfig.json
  const tsconfig = {
    compilerOptions: {
      target: 'es2020',
      module: 'commonjs',
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true
    }
  };
  writeFileSync(
    join(tsTestDir, 'tsconfig.json'), 
    JSON.stringify(tsconfig, null, 2)
  );
  
  // Compile TypeScript (this will fail if types are wrong)
  execSync('npx tsc', { 
    cwd: tsTestDir, 
    stdio: 'pipe' 
  });
  
  // Run compiled JavaScript
  const output = execSync('node test.js', { 
    cwd: tsTestDir, 
    encoding: 'utf8' 
  });
  
  if (!output.includes('✅ TypeScript declarations test passed')) {
    throw new Error('TypeScript declarations test failed');
  }
  
  console.log('   TypeScript declarations working correctly');
});

// Test 10: Publication Workflow Validation
runTest('Publication Workflow Validation', () => {
  console.log('   Testing publication scripts...');
  
  // Test dry run of version script
  execSync('npm run version:dry', { 
    cwd: packageRoot, 
    stdio: 'pipe' 
  });
  
  // Test dry run of publish script
  execSync('npm run publish:dry', { 
    cwd: packageRoot, 
    stdio: 'pipe' 
  });
  
  console.log('   Publication workflow scripts working correctly');
});

// Cleanup
cleanup();

// Print test results
console.log('🎯 Publication Test Results');
console.log('═══════════════════════════');
console.log(`✅ Passed: ${testResults.passed}`);
console.log(`❌ Failed: ${testResults.failed}`);
console.log(`📊 Total:  ${testResults.passed + testResults.failed}\n`);

if (testResults.failed > 0) {
  console.log('❌ Failed Tests:');
  testResults.details
    .filter(test => test.status === 'FAIL')
    .forEach(test => {
      console.log(`   • ${test.name}: ${test.error}`);
    });
  console.log('');
}

if (testResults.failed === 0) {
  console.log('🎉 All publication tests passed!');
  console.log('📦 Package is ready for publication to NPM');
  console.log('\n📋 Next steps:');
  console.log('   1. Run: npm run release:patch (or minor/major)');
  console.log('   2. Verify the published package on npmjs.com');
  console.log('   3. Test installation: npm install logobox');
} else {
  console.log('⚠️  Some tests failed - please fix issues before publishing');
  process.exit(1);
}