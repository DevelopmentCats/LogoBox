# GitHub Actions Workflows

This directory contains the automated deployment workflows for LogoBox, including CDN asset deployment to Cloudflare R2.

## Workflows Overview

### 1. Development Deployment (`deploy-dev.yml`)
**Trigger:** Push to `development` branch or manual dispatch
**Target:** `dev.logobox.dev` website + `cdn.logobox.dev` CDN

**Process:**
1. Run tests and validation
2. Generate logo variants and optimize assets
3. Build catalog
4. **Deploy assets to R2 CDN** (`logobox-dev` bucket)
5. Build and deploy website to Cloudflare Pages
6. Run smoke tests

### 2. Production Deployment (`deploy-production.yml`)
**Trigger:** Push to `main` branch or manual dispatch
**Target:** `logobox.dev` website + `cdn.logobox.dev` CDN

**Process:**
1. Run comprehensive tests
2. Generate logo variants and optimize assets
3. Build catalog
4. **Deploy assets to R2 CDN** (`logobox-cdn` bucket)
5. Build and deploy website to Cloudflare Pages
6. Publish NPM package
7. Create GitHub release
8. Run smoke tests

### Other Workflows
- `asset-processing.yml` - Asset processing and validation
- `npm-publish.yml` / `publish-npm-package.yml` - NPM package publishing
- `pr-preview.yml` - Pull request preview deployments
- `tests.yml` - Standalone test runner

## Required GitHub Secrets

Configure these secrets in your repository settings:

```
CLOUDFLARE_API_TOKEN    # API token with Pages:Edit and R2:Edit permissions
CLOUDFLARE_ACCOUNT_ID   # Your Cloudflare account ID
NPM_TOKEN              # NPM token for package publishing (production only)
```

## CDN Configuration

### Bucket Structure
- **Development:** `logobox-dev` bucket → `cdn.logobox.dev`
- **Production:** `logobox-cdn` bucket → `cdn.logobox.dev`

Both environments serve through the same CDN URL (`cdn.logobox.dev`) but use different R2 buckets.

### Asset Upload Process
Each deployment workflow includes these CDN steps:

1. **Asset Generation:**
   ```bash
   npm run validate-metadata
   npm run generate-variants
   npm run optimize-assets
   npm run build-catalog
   ```

2. **R2 Upload:**
   ```bash
   ./deployment/scripts/deploy-cdn.sh [dev|production]
   ```

3. **Verification:**
   - Tests `https://cdn.logobox.dev/catalog.json`
   - Tests `https://cdn.logobox.dev/logos/github/logo.svg`

## Deployment Flow

```
Push to development → deploy-dev.yml → Build Assets → Upload to R2 → Deploy Website → Test CDN
Push to main → deploy-production.yml → Build Assets → Upload to R2 → Deploy Website → Publish NPM → Test CDN
```

## Integration with Website

The website (`website/src/utils/logoApi.js`) automatically uses the CDN:

```javascript
// Configured via environment variables
BASE_URL: import.meta.env.VITE_CDN_BASE_URL || 'https://cdn.logobox.dev'
CATALOG_PATH: '/catalog.json'
LOGOS_PATH: '/logos'
```

All logo requests automatically use the CDN, with fallback URLs for high availability.