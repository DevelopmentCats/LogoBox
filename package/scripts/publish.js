#!/usr/bin/env node

import { execSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageRoot = join(__dirname, '..');

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const versionType = args.find(arg => ['patch', 'minor', 'major'].includes(arg)) || 'patch';
const skipTests = args.includes('--skip-tests');

console.log('📦 Starting LogoBox package publication process...\n');
console.log(`🎯 Version type: ${versionType}`);
console.log(`🧪 Dry run: ${isDryRun ? 'Yes' : 'No'}`);
console.log(`⚡ Skip tests: ${skipTests ? 'Yes' : 'No'}\n`);

// Step 1: Pre-flight checks
console.log('🔍 Running pre-flight checks...');

// Check if we're in the right directory
if (!existsSync(join(packageRoot, 'package.json'))) {
  console.error('❌ package.json not found. Are you in the right directory?');
  process.exit(1);
}

// Check if we're on main branch (in CI)
if (process.env.CI && process.env.GITHUB_REF_NAME !== 'main') {
  console.error('❌ Publishing is only allowed from the main branch');
  process.exit(1);
}

// Check for NPM token
if (!isDryRun && !process.env.NODE_AUTH_TOKEN && !process.env.NPM_TOKEN) {
  console.error('❌ NPM authentication token not found');
  console.error('   Set NODE_AUTH_TOKEN or NPM_TOKEN environment variable');
  process.exit(1);
}

console.log('✅ Pre-flight checks passed\n');

// Step 2: Run tests (unless skipped)
if (!skipTests) {
  console.log('🧪 Running tests...');
  
  try {
    execSync('npm run test:unit', { 
      cwd: packageRoot, 
      stdio: 'inherit' 
    });
    console.log('✅ Unit tests passed');
    
    execSync('npm run test:integration', { 
      cwd: packageRoot, 
      stdio: 'inherit' 
    });
    console.log('✅ Integration tests passed\n');
    
  } catch (error) {
    console.error('❌ Tests failed');
    process.exit(1);
  }
} else {
  console.log('⚡ Skipping tests as requested\n');
}

// Step 3: Build the package
console.log('🔨 Building package...');
try {
  execSync('node scripts/build.js', { 
    cwd: packageRoot, 
    stdio: 'inherit' 
  });
  console.log('✅ Package built successfully\n');
} catch (error) {
  console.error('❌ Package build failed');
  process.exit(1);
}

// Step 4: Version bump (if not dry run)
let newVersion;
if (!isDryRun) {
  console.log(`📈 Bumping version (${versionType})...`);
  try {
    const versionOutput = execSync(`npm version ${versionType} --no-git-tag-version`, { 
      cwd: packageRoot, 
      encoding: 'utf8' 
    });
    newVersion = versionOutput.trim();
    console.log(`✅ Version bumped to ${newVersion}\n`);
  } catch (error) {
    console.error('❌ Version bump failed');
    process.exit(1);
  }
} else {
  const packageJson = JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8'));
  newVersion = packageJson.version;
  console.log(`🔍 Current version: ${newVersion} (dry run)\n`);
}

// Step 5: Test package installation
console.log('📦 Testing package installation...');
try {
  // Create a tarball
  const packOutput = execSync('npm pack', { 
    cwd: packageRoot, 
    encoding: 'utf8' 
  });
  const tarballName = packOutput.trim();
  
  console.log(`✅ Package created: ${tarballName}`);
  
  // Test installation in a temporary directory
  const tempDir = '/tmp/logobox-test-install';
  execSync(`mkdir -p ${tempDir}`, { stdio: 'inherit' });
  execSync(`cd ${tempDir} && npm init -y`, { stdio: 'inherit' });
  execSync(`cd ${tempDir} && npm install ${packageRoot}/${tarballName}`, { stdio: 'inherit' });
  
  // Test basic functionality
  const testScript = `
    const { LogoBoxAPI } = require('logobox');
    const api = new LogoBoxAPI();
    console.log('✅ Package installation test passed');
  `;
  
  execSync(`cd ${tempDir} && node -e "${testScript}"`, { stdio: 'inherit' });
  
  // Cleanup
  execSync(`rm -rf ${tempDir}`, { stdio: 'inherit' });
  execSync(`rm ${packageRoot}/${tarballName}`, { stdio: 'inherit' });
  
  console.log('✅ Package installation test passed\n');
  
} catch (error) {
  console.error('❌ Package installation test failed');
  process.exit(1);
}

// Step 6: Publish to NPM (if not dry run)
if (!isDryRun) {
  console.log('🚀 Publishing to NPM...');
  
  try {
    execSync('npm publish --access public', { 
      cwd: packageRoot, 
      stdio: 'inherit' 
    });
    console.log(`✅ Successfully published ${newVersion} to NPM\n`);
  } catch (error) {
    console.error('❌ NPM publication failed');
    process.exit(1);
  }
  
  // Step 7: Update changelog
  console.log('📝 Updating changelog...');
  updateChangelog(newVersion);
  console.log('✅ Changelog updated\n');
  
} else {
  console.log('🔍 Dry run - skipping NPM publication\n');
}

// Step 8: Generate publication report
console.log('📊 Generating publication report...');
const report = {
  version: newVersion,
  timestamp: new Date().toISOString(),
  isDryRun: isDryRun,
  versionType: versionType,
  skipTests: skipTests,
  environment: {
    node: process.version,
    npm: execSync('npm --version', { encoding: 'utf8' }).trim(),
    platform: process.platform,
    arch: process.arch
  }
};

if (!isDryRun) {
  report.published = true;
  report.npmUrl = `https://www.npmjs.com/package/logobox/v/${newVersion.replace('v', '')}`;
}

writeFileSync(
  join(packageRoot, 'dist', 'publication-report.json'), 
  JSON.stringify(report, null, 2)
);

console.log('📋 Publication Summary:');
console.log(`   Version: ${newVersion}`);
console.log(`   Type: ${versionType}`);
console.log(`   Published: ${isDryRun ? 'No (dry run)' : 'Yes'}`);
if (!isDryRun) {
  console.log(`   NPM URL: ${report.npmUrl}`);
}

console.log('\n🎉 Publication process completed successfully!');

function updateChangelog(version) {
  const changelogPath = join(packageRoot, 'CHANGELOG.md');
  const currentDate = new Date().toISOString().split('T')[0];
  
  let changelog = '';
  if (existsSync(changelogPath)) {
    changelog = readFileSync(changelogPath, 'utf8');
  } else {
    changelog = '# Changelog\n\nAll notable changes to this project will be documented in this file.\n\n';
  }
  
  const newEntry = `## [${version.replace('v', '')}] - ${currentDate}\n\n- Package updates and improvements\n- Updated logo catalog\n\n`;
  
  // Insert new entry after the main heading
  const lines = changelog.split('\n');
  const insertIndex = lines.findIndex(line => line.startsWith('## ')) || 3;
  lines.splice(insertIndex, 0, newEntry);
  
  writeFileSync(changelogPath, lines.join('\n'));
}