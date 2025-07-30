# Development Deployment Setup

This document outlines the development deployment configuration for LogoBox, which deploys the `development` branch to `dev.logobox.dev`.

## Overview

The development deployment provides a live environment for testing features before they reach production. It mirrors the production setup but with development-specific optimizations and configurations.

## Deployment Targets

- **Production**: `main` branch → `logobox.com`
- **Development**: `development` branch → `dev.logobox.dev`
- **Preview**: Manual trigger → `preview.logobox.com`

## Configuration Files

### GitHub Actions Workflow
- **File**: `.github/workflows/deploy-dev.yml`
- **Trigger**: Push to `development` branch
- **Target**: `dev.logobox.dev`

### Cloudflare Configuration
- **Wrangler Config**: `deployment/cloudflare/wrangler.dev.toml`
- **Build Config**: `deployment/cloudflare/pages-build.dev.toml`
- **Redirects**: `deployment/cloudflare/_redirects.dev`

### Deployment Script
- **File**: `deployment/scripts/deploy-dev.sh`
- **Usage**: Manual deployment from local environment

## Key Differences from Production

### Caching Strategy
- **Assets**: 1 hour (vs 1 year in production)
- **Logos**: 30 minutes (vs 24 hours in production)
- **Catalog**: 5 minutes (vs 1 hour in production)

### Security Headers
- **CSP**: More permissive for debugging (`unsafe-eval` allowed)
- **Frame Options**: `SAMEORIGIN` (vs `DENY` in production)
- **CORS**: More permissive for development testing

### Build Configuration
- **Minification**: Disabled for easier debugging
- **Source Maps**: Enabled
- **Performance Monitoring**: Enabled
- **Environment**: `NODE_ENV=development`

## Setup Instructions

### 1. Cloudflare Pages Project

Create a new Cloudflare Pages project:

```bash
# Using Wrangler CLI
wrangler pages project create logobox-dev
```

Or create manually in the Cloudflare dashboard:
- Project name: `logobox-dev`
- Custom domain: `dev.logobox.dev`

### 2. GitHub Secrets

Ensure these secrets are configured in your GitHub repository:

- `CLOUDFLARE_API_TOKEN`: API token with Pages:Edit permissions
- `CLOUDFLARE_ACCOUNT_ID`: Your Cloudflare account ID

### 3. DNS Configuration

Add a CNAME record for the development subdomain:

```
Type: CNAME
Name: dev
Target: logobox-dev.pages.dev
Proxy: Enabled (orange cloud)
```

### 4. Environment Setup

The development environment includes these variables:

```bash
NODE_ENV=development
VITE_ENVIRONMENT=development
VITE_BUILD_TIME=<build-timestamp>
VITE_COMMIT_SHA=<git-commit-hash>
VITE_GITHUB_REPO=DevelopmentCats/LogoBox
```

## Deployment Process

### Automatic Deployment

1. Push changes to the `development` branch
2. GitHub Actions automatically triggers the deployment workflow
3. Tests run (can be skipped with workflow dispatch)
4. Website builds with development configuration
5. Deploys to `dev.logobox.dev`
6. Smoke tests verify deployment

### Manual Deployment

```bash
# From repository root
./logobox/deployment/scripts/deploy-dev.sh

# Skip tests
./logobox/deployment/scripts/deploy-dev.sh --skip-tests
```

### Manual Trigger via GitHub

1. Go to Actions tab in GitHub
2. Select "Deploy Development to Cloudflare Pages"
3. Click "Run workflow"
4. Choose options and run

## Monitoring and Testing

### Smoke Tests

The deployment includes automated smoke tests:

- ✅ Main page accessibility (`/`)
- ✅ 404 page handling (`/404.html`)
- ✅ Catalog endpoint (`/catalog.json`)
- ✅ Sample logo (`/logos/github/logo.svg`)

### Build Artifacts

Development builds include:

- Build hash for verification
- Build timestamp
- Commit SHA
- Branch information
- Environment indicators

### Debugging Features

Development environment includes:

- Unminified JavaScript for easier debugging
- Source maps enabled
- More permissive CSP for development tools
- Shorter cache durations for faster iteration
- Environment headers (`X-Environment: development`)

## Troubleshooting

### Common Issues

1. **Build Failures**
   - Check Node.js version compatibility
   - Verify all dependencies are installed
   - Review build logs in GitHub Actions

2. **Deployment Failures**
   - Verify Cloudflare API token permissions
   - Check account ID configuration
   - Ensure project name matches configuration

3. **DNS Issues**
   - Verify CNAME record configuration
   - Check Cloudflare proxy settings
   - Allow time for DNS propagation

### Rollback Process

If deployment fails:

1. Check GitHub Actions logs
2. Review Cloudflare Pages dashboard
3. Consider reverting to previous commit
4. Redeploy after fixing issues

### Support

For deployment issues:

1. Check GitHub Actions workflow logs
2. Review Cloudflare Pages build logs
3. Verify configuration files
4. Test locally before deploying

## Security Considerations

### Development-Specific Settings

- More permissive CORS for testing
- Relaxed CSP for debugging tools
- Shorter cache durations
- Additional debugging headers

### Production Parity

While development has relaxed settings for debugging, it maintains:

- HTTPS enforcement
- Basic security headers
- Content type validation
- XSS protection

## Performance

### Build Optimization

Development builds prioritize:

- Faster build times over optimization
- Debugging capabilities over size
- Iteration speed over caching

### Monitoring

Track development deployment:

- Build times and success rates
- Deployment frequency
- Error rates and types
- Performance metrics

## Future Enhancements

Potential improvements:

- Branch-specific deployments for feature branches
- Integration with PR previews
- Automated testing integration
- Performance monitoring dashboard
- Slack/Discord notifications