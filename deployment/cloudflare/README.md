# Cloudflare Pages Deployment Configuration

This directory contains all the configuration files and documentation needed to deploy LogoBox to Cloudflare Pages with proper environment variable management.

## Quick Start

1. **Generate Environment Variables**
   ```bash
   # For production environment
   ./deployment/scripts/cloudflare-env-setup.sh generate-production
   
   # For preview environment
   ./deployment/scripts/cloudflare-env-setup.sh generate-preview
   ```

2. **Configure Cloudflare Pages**
   - Follow the step-by-step guide in [`pages-config.md`](./pages-config.md)
   - Use the generated environment variables from step 1

3. **Validate Configuration**
   ```bash
   # Validate current environment
   ./deployment/scripts/cloudflare-env-setup.sh validate
   
   # Test API connectivity
   ./deployment/scripts/cloudflare-env-setup.sh test-connectivity
   ```

## Files Overview

### Configuration Files

| File | Purpose | Description |
|------|---------|-------------|
| [`wrangler.toml`](./wrangler.toml) | Cloudflare configuration | Advanced settings with compression, caching rules, security headers, and Node.js compatibility |
| [`_redirects`](./_redirects) | SPA routing & optimization | Handles client-side routing, asset optimization, and performance headers |
| [`pages-build.toml`](./pages-build.toml) | Build configuration | Comprehensive build settings for asset processing, optimization, and deployment |
| [`environment-variables.json`](./environment-variables.json) | Variable reference | Complete reference of all environment variables with validation rules |

### Documentation

| File | Purpose | Description |
|------|---------|-------------|
| [`pages-config.md`](./pages-config.md) | Complete setup guide | Comprehensive instructions for Cloudflare Pages configuration |
| [`environment-setup.md`](./environment-setup.md) | Environment variables guide | Detailed guide for configuring environment variables |
| [`README.md`](./README.md) | This file | Overview and quick start guide |

### Scripts

| File | Purpose | Description |
|------|---------|-------------|
| [`../scripts/cloudflare-env-setup.sh`](../scripts/cloudflare-env-setup.sh) | Environment management | Script to generate, validate, and test environment variables |

## Environment Variables Summary

### Production Environment
- **Application**: LogoBox with analytics enabled
- **API Timeout**: 15 seconds with 3 retry attempts
- **Logging**: Warning level
- **Performance Monitoring**: Disabled
- **Cache TTL**: 1 hour

### Preview Environment  
- **Application**: LogoBox (Preview) with analytics disabled
- **API Timeout**: 10 seconds with 2 retry attempts
- **Logging**: Debug level
- **Performance Monitoring**: Enabled
- **Cache TTL**: 30 minutes

## Security Considerations

### Environment Variables
- ✅ All sensitive data handled through GitHub Secrets
- ✅ No API keys or tokens in environment variables
- ✅ HTTPS-only URLs in production
- ✅ Appropriate logging levels for each environment

### Cloudflare Configuration
- ✅ Security headers configured in `wrangler.toml`
- ✅ Content compression enabled
- ✅ Long-term caching for static assets
- ✅ SPA routing properly configured

## Build Configuration

### Cloudflare Pages Settings
```
Project name: logobox
Production branch: main
Build command: npm run build --workspace=website
Build output directory: logobox/website/dist
Root directory: logobox
Node.js version: 18.x (automatic)
```

### Required GitHub Secrets
These secrets must be configured in the GitHub repository:
- `CLOUDFLARE_API_TOKEN`: For deployment authentication
- `CLOUDFLARE_ACCOUNT_ID`: For account identification
- `NPM_TOKEN`: For package publishing (if applicable)

## Troubleshooting

### Common Issues

**Build fails with missing environment variables**
```bash
# Generate and copy the required variables
./deployment/scripts/cloudflare-env-setup.sh generate-production
```

**404 errors on page refresh**
```bash
# Ensure _redirects file is properly configured
cat deployment/cloudflare/_redirects
```

**Assets not loading**
```bash
# Validate CDN configuration
./deployment/scripts/cloudflare-env-setup.sh test-connectivity
```

### Validation Commands

```bash
# Check environment variable format
./deployment/scripts/cloudflare-env-setup.sh validate

# Test API endpoints
curl -f https://api.logobox.dev/health

# Test CDN endpoints  
curl -f https://cdn.logobox.dev/catalog.json
```

## Deployment Process

1. **Automatic Deployments**
   - Production: Triggered by pushes to `main` branch
   - Preview: Triggered by pull requests

2. **Manual Deployments**
   - Use Cloudflare Pages dashboard
   - Select branch and deploy

3. **Monitoring**
   - Check deployment logs in Cloudflare Pages
   - Monitor build times and success rates
   - Review Core Web Vitals in analytics

## Support

For deployment issues:
1. Check the [troubleshooting section](#troubleshooting)
2. Review Cloudflare Pages build logs
3. Validate environment variables using provided scripts
4. Consult the comprehensive guides in this directory

## Next Steps

After completing the Cloudflare configuration:
1. Set up custom domain (if needed)
2. Configure SSL/TLS settings
3. Enable analytics and monitoring
4. Set up automated testing for deployments
5. Configure backup and recovery procedures