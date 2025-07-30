#!/usr/bin/env node

import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageRoot = join(__dirname, '..');

// Parse command line arguments
const args = process.argv.slice(2);
const versionType = args[0] || 'patch';
const isDryRun = args.includes('--dry-run');
const skipGit = args.includes('--skip-git');

const validVersionTypes = ['major', 'minor', 'patch', 'prerelease'];

if (!validVersionTypes.includes(versionType)) {
  console.error(`❌ Invalid version type: ${versionType}`);
  console.error(`   Valid types: ${validVersionTypes.join(', ')}`);
  process.exit(1);
}

console.log('🏷️  Starting semantic versioning process...\n');
console.log(`🔢 Version type: ${versionType}`);
console.log(`🧪 Dry run: ${isDryRun ? 'Yes' : 'No'}`);
console.log(`📝 Skip git: ${skipGit ? 'Yes' : 'No'}\n`);

// Step 1: Get current version and calculate new version
console.log('📊 Analyzing current version...');

const packageJsonPath = join(packageRoot, 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
const currentVersion = packageJson.version;

console.log(`Current version: ${currentVersion}`);

// Calculate new version
const newVersion = calculateNewVersion(currentVersion, versionType);
console.log(`New version: ${newVersion}\n`);

// Step 2: Generate changelog entry
console.log('📝 Generating changelog entry...');

const changelogEntry = await generateChangelogEntry(currentVersion, newVersion, versionType);
console.log('✅ Changelog entry generated\n');

if (isDryRun) {
  console.log('🔍 DRY RUN - Changes that would be made:\n');
  console.log(`📦 package.json: ${currentVersion} → ${newVersion}`);
  console.log('📝 CHANGELOG.md: New entry added');
  console.log('\n--- Changelog Entry ---');
  console.log(changelogEntry);
  console.log('--- End Changelog Entry ---\n');
  
  console.log('🔍 Dry run completed - no changes made');
  process.exit(0);
}

// Step 3: Update package.json
console.log('📦 Updating package.json...');
packageJson.version = newVersion;
writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
console.log(`✅ Updated package.json to version ${newVersion}`);

// Step 4: Update CHANGELOG.md
console.log('📝 Updating CHANGELOG.md...');
updateChangelog(changelogEntry);
console.log('✅ Updated CHANGELOG.md');

// Step 5: Git operations (if not skipped)
if (!skipGit) {
  console.log('\n📚 Performing git operations...');
  
  try {
    // Stage changes
    execSync('git add package.json CHANGELOG.md', { 
      cwd: packageRoot, 
      stdio: 'pipe' 
    });
    
    // Commit changes
    const commitMessage = `chore(release): ${newVersion}

${getCommitDescription(versionType, changelogEntry)}`;
    
    execSync(`git commit -m "${commitMessage}"`, { 
      cwd: packageRoot, 
      stdio: 'pipe' 
    });
    
    // Create tag
    execSync(`git tag -a v${newVersion} -m "Release v${newVersion}"`, { 
      cwd: packageRoot, 
      stdio: 'pipe' 
    });
    
    console.log(`✅ Created git commit and tag v${newVersion}`);
    
  } catch (error) {
    console.error('❌ Git operations failed:', error.message);
    console.warn('⚠️  You may need to commit and tag manually');
  }
} else {
  console.log('\n⚡ Skipping git operations as requested');
}

// Step 6: Summary
console.log('\n🎉 Version update completed successfully!');
console.log(`📦 Version: ${currentVersion} → ${newVersion}`);
console.log(`🏷️  Tag: v${newVersion}`);

if (!skipGit) {
  console.log('\n📋 Next steps:');
  console.log('   1. Review the changes');
  console.log('   2. Push to remote: git push && git push --tags');
  console.log('   3. Run npm publish or use the publish script');
}

function calculateNewVersion(currentVersion, versionType) {
  const [major, minor, patch] = currentVersion.split('.').map(Number);
  
  switch (versionType) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'patch':
      return `${major}.${minor}.${patch + 1}`;
    case 'prerelease':
      // Simple prerelease implementation
      const prereleaseMatch = currentVersion.match(/(\d+\.\d+\.\d+)(?:-(\w+)\.(\d+))?/);
      if (prereleaseMatch && prereleaseMatch[2]) {
        // Increment existing prerelease
        const prereleaseNum = parseInt(prereleaseMatch[3]) + 1;
        return `${prereleaseMatch[1]}-${prereleaseMatch[2]}.${prereleaseNum}`;
      } else {
        // First prerelease for this version
        return `${major}.${minor}.${patch + 1}-alpha.0`;
      }
    default:
      throw new Error(`Invalid version type: ${versionType}`);
  }
}

async function generateChangelogEntry(currentVersion, newVersion, versionType) {
  const currentDate = new Date().toISOString().split('T')[0];
  
  // Get git commits since last version
  let commits = [];
  try {
    const gitLog = execSync(
      `git log --oneline --pretty=format:"%s" HEAD...v${currentVersion}`,
      { cwd: packageRoot, encoding: 'utf8' }
    ).split('\n').filter(line => line.trim());
    
    commits = gitLog;
  } catch (error) {
    console.warn('⚠️  Could not get git history, using generic changelog entry');
  }
  
  // Parse commits for conventional commit format
  const changes = parseCommits(commits);
  
  let entry = `## [${newVersion}] - ${currentDate}\n\n`;
  
  // Add version type description
  const versionDescriptions = {
    major: 'Major release with breaking changes',
    minor: 'Minor release with new features',
    patch: 'Patch release with bug fixes and improvements',
    prerelease: 'Prerelease version'
  };
  
  entry += `### ${versionDescriptions[versionType]}\n\n`;
  
  // Add categorized changes
  if (changes.breaking.length > 0) {
    entry += '### ⚠️ BREAKING CHANGES\n\n';
    changes.breaking.forEach(change => {
      entry += `- ${change}\n`;
    });
    entry += '\n';
  }
  
  if (changes.features.length > 0) {
    entry += '### ✨ Features\n\n';
    changes.features.forEach(change => {
      entry += `- ${change}\n`;
    });
    entry += '\n';
  }
  
  if (changes.fixes.length > 0) {
    entry += '### 🐛 Bug Fixes\n\n';
    changes.fixes.forEach(change => {
      entry += `- ${change}\n`;
    });
    entry += '\n';
  }
  
  if (changes.improvements.length > 0) {
    entry += '### 🚀 Improvements\n\n';
    changes.improvements.forEach(change => {
      entry += `- ${change}\n`;
    });
    entry += '\n';
  }
  
  if (changes.other.length > 0) {
    entry += '### 🔧 Other Changes\n\n';
    changes.other.forEach(change => {
      entry += `- ${change}\n`;
    });
    entry += '\n';
  }
  
  // If no commits were found, add generic entry
  if (commits.length === 0) {
    entry += '- Package updates and improvements\n';
    entry += '- Updated dependencies and build process\n\n';
  }
  
  return entry;
}

function parseCommits(commits) {
  const changes = {
    breaking: [],
    features: [],
    fixes: [],
    improvements: [],
    other: []
  };
  
  commits.forEach(commit => {
    const message = commit.trim();
    
    // Parse conventional commit format
    const conventionalMatch = message.match(/^(feat|fix|docs|style|refactor|perf|test|chore|build|ci)(\(.+\))?\!?:\s*(.+)$/);
    
    if (conventionalMatch) {
      const [, type, scope, description] = conventionalMatch;
      const isBreaking = message.includes('!:');
      
      const formattedDescription = scope 
        ? `${description} (${scope.slice(1, -1)})`
        : description;
      
      if (isBreaking) {
        changes.breaking.push(formattedDescription);
      } else {
        switch (type) {
          case 'feat':
            changes.features.push(formattedDescription);
            break;
          case 'fix':
            changes.fixes.push(formattedDescription);
            break;
          case 'perf':
          case 'refactor':
            changes.improvements.push(formattedDescription);
            break;
          default:
            changes.other.push(formattedDescription);
        }
      }
    } else {
      // Non-conventional commit
      changes.other.push(message);
    }
  });
  
  return changes;
}

function updateChangelog(newEntry) {
  const changelogPath = join(packageRoot, 'CHANGELOG.md');
  let content = '';
  
  try {
    content = readFileSync(changelogPath, 'utf8');
  } catch (error) {
    content = '# Changelog\n\nAll notable changes to this project will be documented in this file.\n\n';
  }
  
  // Find the position to insert the new entry
  const lines = content.split('\n');
  const insertIndex = lines.findIndex(line => line.startsWith('## [')) || lines.length;
  
  // Insert the new entry
  const newEntryLines = newEntry.split('\n');
  lines.splice(insertIndex, 0, ...newEntryLines);
  
  writeFileSync(changelogPath, lines.join('\n'));
}

function getCommitDescription(versionType, changelogEntry) {
  const descriptions = {
    major: 'Major release with breaking changes and new features',
    minor: 'Minor release with new features and improvements',
    patch: 'Patch release with bug fixes and minor improvements',
    prerelease: 'Prerelease version for testing'
  };
  
  return descriptions[versionType];
}