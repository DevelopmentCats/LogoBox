#!/usr/bin/env node

import { execSync } from 'child_process';
import { existsSync, rmSync, mkdirSync, copyFileSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageRoot = join(__dirname, '..');

console.log('🚀 Starting LogoBox package build process...\n');

// Step 1: Clean previous build
console.log('🧹 Cleaning previous build...');
const distDir = join(packageRoot, 'dist');
if (existsSync(distDir)) {
  rmSync(distDir, { recursive: true, force: true });
}
mkdirSync(distDir, { recursive: true });

// Step 2: Type checking
console.log('🔍 Running type checks...');
try {
  execSync('npm run typecheck', { 
    cwd: packageRoot, 
    stdio: 'inherit' 
  });
  console.log('✅ Type checking passed\n');
} catch (error) {
  console.error('❌ Type checking failed');
  process.exit(1);
}

// Step 3: Linting
console.log('🧽 Running linter...');
try {
  execSync('npm run lint', { 
    cwd: packageRoot, 
    stdio: 'inherit' 
  });
  console.log('✅ Linting passed\n');
} catch (error) {
  console.error('❌ Linting failed');
  process.exit(1);
}

// Step 4: Build with tsup
console.log('📦 Building package with tsup...');
try {
  execSync('npx tsup', { 
    cwd: packageRoot, 
    stdio: 'inherit' 
  });
  console.log('✅ Package build completed\n');
} catch (error) {
  console.error('❌ Package build failed');
  process.exit(1);
}

// Step 5: Generate package info
console.log('📄 Generating package info...');
const packageJson = JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8'));
const buildInfo = {
  name: packageJson.name,
  version: packageJson.version,
  buildTime: new Date().toISOString(),
  nodeVersion: process.version,
  platform: process.platform,
  arch: process.arch,
  gitCommit: process.env.GITHUB_SHA || 'unknown',
  gitBranch: process.env.GITHUB_REF_NAME || 'unknown'
};

writeFileSync(
  join(distDir, 'build-info.json'), 
  JSON.stringify(buildInfo, null, 2)
);

// Step 6: Copy essential files
console.log('📋 Copying essential files...');
const filesToCopy = [
  'README.md',
  'LICENSE',
  'CHANGELOG.md'
];

for (const file of filesToCopy) {
  const sourcePath = join(packageRoot, file);
  const targetPath = join(distDir, file);
  
  if (existsSync(sourcePath)) {
    copyFileSync(sourcePath, targetPath);
    console.log(`  ✅ Copied ${file}`);
  } else {
    console.log(`  ⚠️  ${file} not found, skipping`);
  }
}

// Step 7: Validate build output
console.log('\n🔍 Validating build output...');
const requiredFiles = [
  'index.js',
  'index.cjs',
  'index.d.ts'
];

let validationPassed = true;
for (const file of requiredFiles) {
  const filePath = join(distDir, file);
  if (existsSync(filePath)) {
    console.log(`  ✅ ${file}`);
  } else {
    console.log(`  ❌ ${file} missing`);
    validationPassed = false;
  }
}

if (!validationPassed) {
  console.error('\n❌ Build validation failed - missing required files');
  process.exit(1);
}

// Step 8: Generate bundle analysis
console.log('\n📊 Generating bundle analysis...');
try {
  const stats = {
    files: {},
    totalSize: 0
  };
  
  for (const file of requiredFiles) {
    const filePath = join(distDir, file);
    if (existsSync(filePath)) {
      const content = readFileSync(filePath, 'utf8');
      const size = Buffer.byteLength(content, 'utf8');
      stats.files[file] = {
        size: size,
        sizeFormatted: formatBytes(size)
      };
      stats.totalSize += size;
    }
  }
  
  stats.totalSizeFormatted = formatBytes(stats.totalSize);
  
  writeFileSync(
    join(distDir, 'bundle-stats.json'), 
    JSON.stringify(stats, null, 2)
  );
  
  console.log(`  📦 Total bundle size: ${stats.totalSizeFormatted}`);
  
} catch (error) {
  console.warn('⚠️  Bundle analysis failed:', error.message);
}

console.log('\n🎉 Build completed successfully!');
console.log(`📁 Output directory: ${distDir}`);

function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}