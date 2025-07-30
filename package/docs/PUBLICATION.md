# LogoBox NPM Package Publication Guide

This guide covers the complete publication process for the LogoBox NPM package, including automated workflows, testing, and best practices.

## 📋 Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Development Workflow](#development-workflow)
- [Testing Before Publication](#testing-before-publication)
- [Version Management](#version-management)
- [Publication Process](#publication-process)
- [Automated Workflows](#automated-workflows)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)

## 🎯 Overview

The LogoBox NPM package uses a comprehensive publication system with:

- **Semantic versioning** with automated changelog generation
- **Comprehensive testing** including publication validation
- **Automated CI/CD** with GitHub Actions
- **Multi-format builds** (ESM, CJS, TypeScript declarations)
- **Publication safety checks** to prevent issues

## ✅ Prerequisites

Before publishing, ensure you have:

1. **Node.js 16+** installed
2. **NPM account** with publish permissions
3. **Git repository** properly configured
4. **Environment variables** set up:
   ```bash
   # For automated publishing
   export NPM_TOKEN="your-npm-token"
   export NODE_AUTH_TOKEN="your-npm-token"
   ```

## 🔄 Development Workflow

### 1. Local Development

```bash
# Install dependencies
npm install

# Start development build (watch mode)
npm run dev

# Run tests during development
npm test
```

### 2. Code Quality Checks

```bash
# Type checking
npm run typecheck

# Linting
npm run lint
npm run lint:fix  # Auto-fix issues

# Code formatting
npm run format
npm run format:check
```

### 3. Building

```bash
# Production build
npm run build

# Development build (watch mode)
npm run build:dev

# Simple build (without validation)
npm run build:simple
```

## 🧪 Testing Before Publication

### Comprehensive Publication Test

Run the complete publication test suite:

```bash
npm run test:publication
```

This test validates:
- ✅ Package configuration
- ✅ TypeScript setup
- ✅ Build process
- ✅ Code quality (linting, type checking)
- ✅ Unit tests
- ✅ Package creation (npm pack)
- ✅ Installation testing
- ✅ Module imports (ESM/CJS)
- ✅ TypeScript declarations
- ✅ Publication workflow

### Individual Test Suites

```bash
# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# Test coverage report
npm run test:coverage
```

## 🏷️ Version Management

### Semantic Versioning

Use semantic versioning scripts for version management:

```bash
# Patch version (1.0.0 → 1.0.1)
npm run version:patch

# Minor version (1.0.0 → 1.1.0)
npm run version:minor

# Major version (1.0.0 → 2.0.0)
npm run version:major

# Prerelease version (1.0.0 → 1.0.1-alpha.0)
npm run version:prerelease
```

### Dry Run Testing

Test version changes without applying them:

```bash
npm run version:dry
```

### What Version Scripts Do

1. **Analyze git commits** for changelog generation
2. **Update package.json** with new version
3. **Generate changelog entry** with categorized changes
4. **Create git commit** with standardized message
5. **Create git tag** for the release

### Changelog Generation

The changelog is automatically generated based on:

- **Conventional commits** (feat:, fix:, docs:, etc.)
- **Git history** since last version
- **Breaking changes** (commits with `!`)
- **Version type** (major, minor, patch)

Example changelog entry:
```markdown
## [1.2.0] - 2024-01-15

### Minor release with new features

### ✨ Features
- Add logo search by tags functionality
- Implement caching for better performance

### 🐛 Bug Fixes  
- Fix URL generation for special characters
- Resolve TypeScript declaration issues

### 🚀 Improvements
- Optimize bundle size by 15%
- Improve error messages
```

## 📦 Publication Process

### Manual Publication

#### Option 1: Step-by-Step

```bash
# 1. Test everything
npm run test:publication

# 2. Update version
npm run version:patch  # or minor/major

# 3. Publish to NPM
npm run publish:patch  # or minor/major
```

#### Option 2: One Command

```bash
# Complete release process
npm run release:patch  # or minor/major
```

### Publication Scripts

```bash
# Dry run publication (no actual publish)
npm run publish:dry

# Publish with patch version bump
npm run publish:patch

# Publish with minor version bump
npm run publish:minor

# Publish with major version bump
npm run publish:major
```

### What Publication Scripts Do

1. **Run comprehensive tests** (unit, integration, publication)
2. **Build the package** with all formats
3. **Version bump** (if not already done)
4. **Update changelog** 
5. **Test package installation** locally
6. **Publish to NPM** with public access
7. **Create GitHub release** with notes

## 🤖 Automated Workflows

### GitHub Actions

The package includes automated workflows:

#### Publication Workflow (`.github/workflows/publish-npm-package.yml`)

**Triggers:**
- Asset processing pipeline completion
- Manual dispatch (workflow_dispatch)
- Changes to package or catalog files

**Process:**
1. **Check for changes** - Only publishes when needed
2. **Build and test** - Comprehensive validation
3. **Publish to NPM** - Automated publication
4. **Update repository** - Version bump commit
5. **Create GitHub release** - With changelog

**Manual Trigger:**
```bash
# Via GitHub UI or CLI
gh workflow run publish-npm-package.yml \
  -f version_type=patch \
  -f dry_run=false
```

#### Environment Protection

The workflow uses GitHub environment protection:
- **npm-production** environment with approval gates
- **Required reviewers** for production releases
- **Deployment protection rules**

### Automated Version Detection

The system automatically determines when to publish:

- **Asset updates** → Patch version (catalog changes)
- **Manual trigger** → User-specified version type
- **Code changes** → Based on commit analysis

## 🔧 Troubleshooting

### Common Issues

#### Build Failures

```bash
# Clean and rebuild
npm run clean
npm install
npm run build
```

#### Test Failures

```bash
# Run specific test types
npm run test:unit
npm run test:integration
npm run test:publication

# Check for TypeScript errors
npm run typecheck

# Fix linting issues
npm run lint:fix
```

#### Publication Errors

```bash
# Verify NPM authentication
npm whoami

# Check package configuration
npm run test:publication

# Test dry run first
npm run publish:dry
```

#### Version Conflicts

```bash
# Check current version
npm version

# View git tags
git tag -l

# Reset if needed (careful!)
git tag -d v1.2.3
git reset --hard HEAD~1
```

### Environment Issues

#### NPM Token Issues

```bash
# Verify token is set
echo $NPM_TOKEN

# Login to NPM
npm login

# Check permissions
npm access list packages @your-scope
```

#### Git Issues

```bash
# Check git status
git status

# Verify remote
git remote -v

# Check for uncommitted changes
git diff --stat
```

## 💡 Best Practices

### Development

1. **Always run tests** before committing
2. **Use conventional commits** for better changelogs
3. **Keep dependencies updated** regularly
4. **Run publication tests** before releasing

### Version Management  

1. **Use semantic versioning** appropriately:
   - **Patch**: Bug fixes, small improvements
   - **Minor**: New features, backwards compatible
   - **Major**: Breaking changes
   - **Prerelease**: Testing versions

2. **Review changelog** before publishing
3. **Test major versions** thoroughly
4. **Coordinate breaking changes** with users

### Publication

1. **Always test publication process** first:
   ```bash
   npm run test:publication
   npm run publish:dry
   ```

2. **Use automated workflows** when possible
3. **Monitor publication** on npmjs.com
4. **Verify installation** after publishing:
   ```bash
   npm install logobox@latest
   ```

5. **Update documentation** as needed

### Security

1. **Keep NPM tokens secure**
2. **Use environment variables** for credentials
3. **Review package contents** before publishing:
   ```bash
   npm publish --dry-run
   ```

4. **Monitor for vulnerabilities**:
   ```bash
   npm audit
   npm audit fix
   ```

### Collaboration

1. **Use pull requests** for changes
2. **Require reviews** for releases
3. **Document breaking changes** clearly
4. **Communicate releases** to users

## 📚 Additional Resources

- [NPM Publishing Guide](https://docs.npmjs.com/creating-and-publishing-unscoped-public-packages)
- [Semantic Versioning](https://semver.org/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Keep a Changelog](https://keepachangelog.com/)

## 🆘 Support

If you encounter issues with the publication process:

1. **Check this guide** first
2. **Run diagnostic tests**: `npm run test:publication`
3. **Review logs** in GitHub Actions
4. **Check NPM package page** for published status
5. **Create an issue** in the repository with details

---

## 📋 Quick Reference

### Essential Commands

```bash
# Complete publication test
npm run test:publication

# Version management
npm run version:patch
npm run version:minor  
npm run version:major
npm run version:dry

# Publication
npm run publish:dry
npm run release:patch
npm run release:minor
npm run release:major

# Development
npm run dev
npm run build
npm test
npm run lint
```

### Files and Directories

- `package.json` - Package configuration
- `CHANGELOG.md` - Version history
- `scripts/` - Publication and build scripts
- `.github/workflows/` - Automated workflows
- `dist/` - Build outputs
- `docs/` - Documentation

---

*Last updated: January 2024*