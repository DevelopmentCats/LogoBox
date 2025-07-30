# Cloudflare Pages Environment Variables Configuration

This document provides step-by-step instructions for configuring environment variables in Cloudflare Pages for both production and preview environments.

## Overview

LogoBox requires specific environment variables to be configured in Cloudflare Pages to ensure proper functionality across different deployment environments. These variables control application behavior, API endpoints, CDN configurations, and feature flags.

## Required Environment Variables

### Production Environment Variables

The following variables must be configured in the Cloudflare Pages dashboard for the production environment:

#### Application Configuration
```bash
# Application branding and metadata
VITE_APP_TITLE=LogoBox
VITE_APP_DESCRIPTION=Browse and discover high-quality logos and icons

# API and CDN endpoints
VITE_API_BASE_URL=https://api.logobox.dev
VITE_CDN_BASE_URL=https://cdn.logobox.dev
VITE_CATALOG_PATH=/catalog.json
VITE_LOGOS_PATH=/logos

# Fallback CDN URLs for high availability
VITE_CDN_FALLBACK_URL_1=https://backup-cdn1.logobox.dev
VITE_CDN_FALLBACK_URL_2=https://backup-cdn2.logobox.dev

# API client configuration
VITE_API_TIMEOUT=15000
VITE_API_RETRY_ATTEMPTS=3
VITE_API_RETRY_DELAY=2000

# Feature flags
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_PERFORMANCE_MONITORING=false
VITE_LOG_LEVEL=warn

# NPM package configuration
LOGOBOX_BASE_URL=https://logobox.dev
LOGOBOX_CDN_BASE_URL=https://cdn.logobox.dev
LOGOBOX_DEFAULT_VARIANT=original
LOGOBOX_CACHE_ENABLED=true
LOGOBOX_CACHE_TTL=3600000
LOGOBOX_API_BASE_URL=https://api.logobox.dev
```

### Preview Environment Variables

For preview deployments (pull requests and development branches), use these modified values:

```bash
# Application configuration (same as production)
VITE_APP_TITLE=LogoBox (Preview)
VITE_APP_DESCRIPTION=Browse and discover high-quality logos and icons - Preview Environment

# API and CDN endpoints (can use staging or production endpoints)
VITE_API_BASE_URL=https://api.logobox.dev
VITE_CDN_BASE_URL=https://cdn.logobox.dev
VITE_CATALOG_PATH=/catalog.json
VITE_LOGOS_PATH=/logos

# Fallback CDN URLs
VITE_CDN_FALLBACK_URL_1=https://backup-cdn1.logobox.dev
VITE_CDN_FALLBACK_URL_2=https://backup-cdn2.logobox.dev

# API client configuration (more aggressive for testing)
VITE_API_TIMEOUT=10000
VITE_API_RETRY_ATTEMPTS=2
VITE_API_RETRY_DELAY=1000

# Feature flags (enable more debugging for previews)
VITE_ENABLE_ANALYTICS=false
VITE_ENABLE_PERFORMANCE_MONITORING=true
VITE_LOG_LEVEL=debug

# NPM package configuration (same as production)
LOGOBOX_BASE_URL=https://logobox.dev
LOGOBOX_CDN_BASE_URL=https://cdn.logobox.dev
LOGOBOX_DEFAULT_VARIANT=original
LOGOBOX_CACHE_ENABLED=true
LOGOBOX_CACHE_TTL=1800000
LOGOBOX_API_BASE_URL=https://api.logobox.dev
```

## Step-by-Step Configuration Instructions

### 1. Access Cloudflare Pages Dashboard

1. Log in to your Cloudflare account
2. Navigate to **Pages** in the left sidebar
3. Select your **logobox** project
4. Go to **Settings** → **Environment variables**

### 2. Configure Production Environment Variables

1. In the Environment variables section, select **Production** tab
2. Click **Add variable** for each variable listed in the production section above
3. Enter the **Variable name** exactly as shown (case-sensitive)
4. Enter the corresponding **Value**
5. Click **Save** after adding each variable

**Important Notes:**
- Variable names are case-sensitive and must match exactly
- All variables prefixed with `VITE_` are exposed to the frontend
- Variables without `VITE_` prefix are build-time only

### 3. Configure Preview Environment Variables

1. Switch to the **Preview** tab in the Environment variables section
2. Repeat the process for preview environment variables
3. Use the preview-specific values listed above

### 4. Verify Configuration

After adding all variables, verify the configuration by:

1. Triggering a new deployment (push to main branch)
2. Checking the build logs for any missing variable warnings
3. Testing the deployed application functionality
4. Verifying API endpoints are accessible

## Environment Variable Categories

### Public Variables (VITE_ prefix)
These variables are embedded in the frontend bundle and are visible to users:
- `VITE_APP_TITLE`
- `VITE_APP_DESCRIPTION`
- `VITE_API_BASE_URL`
- `VITE_CDN_BASE_URL`
- `VITE_CATALOG_PATH`
- `VITE_LOGOS_PATH`
- `VITE_CDN_FALLBACK_URL_1`
- `VITE_CDN_FALLBACK_URL_2`
- `VITE_API_TIMEOUT`
- `VITE_API_RETRY_ATTEMPTS`
- `VITE_API_RETRY_DELAY`
- `VITE_ENABLE_ANALYTICS`
- `VITE_ENABLE_PERFORMANCE_MONITORING`
- `VITE_LOG_LEVEL`

### Build-time Variables
These variables are used during the build process and are not exposed to the frontend:
- `LOGOBOX_BASE_URL`
- `LOGOBOX_CDN_BASE_URL`
- `LOGOBOX_DEFAULT_VARIANT`
- `LOGOBOX_CACHE_ENABLED`
- `LOGOBOX_CACHE_TTL`
- `LOGOBOX_API_BASE_URL`

## Security Considerations

### Sensitive Data Handling
- **Never** include API keys, tokens, or secrets in environment variables
- All sensitive authentication data should be handled through GitHub Secrets
- Environment variables in Cloudflare Pages are visible in build logs

### Variable Validation
- All URLs should use HTTPS in production
- Timeout values should be reasonable (5000-30000ms)
- Log levels should be appropriate for the environment (warn/error for production)

## Troubleshooting

### Common Issues

**Build Failures Due to Missing Variables:**
```bash
Error: Environment variable VITE_API_BASE_URL is not defined
```
**Solution:** Ensure all required variables are added to both production and preview environments.

**API Connection Issues:**
```bash
Failed to fetch from https://api.logobox.dev
```
**Solution:** Verify `VITE_API_BASE_URL` is correctly set and the API endpoint is accessible.

**Asset Loading Problems:**
```bash
Failed to load logo from CDN
```
**Solution:** Check `VITE_CDN_BASE_URL` and ensure the CDN is properly configured.

### Validation Commands

Use these commands to validate your environment configuration:

```bash
# Check if all required variables are set (run in build environment)
node deployment/scripts/env-check.js

# Test API connectivity
curl -f $VITE_API_BASE_URL/health

# Test CDN connectivity
curl -f $VITE_CDN_BASE_URL$VITE_CATALOG_PATH
```

## Environment-Specific Configurations

### Development vs Production Differences

| Variable | Development | Production |
|----------|-------------|------------|
| `VITE_API_TIMEOUT` | 5000 | 15000 |
| `VITE_API_RETRY_ATTEMPTS` | 2 | 3 |
| `VITE_ENABLE_ANALYTICS` | false | true |
| `VITE_ENABLE_PERFORMANCE_MONITORING` | true | false |
| `VITE_LOG_LEVEL` | debug | warn |

### Preview Environment Considerations

Preview environments should:
- Use production API endpoints for consistency
- Enable additional debugging features
- Disable analytics to avoid polluting production data
- Use shorter cache TTLs for faster iteration

## Maintenance

### Regular Tasks
1. **Monthly:** Review and update API endpoints if changed
2. **Quarterly:** Validate all URLs are still accessible
3. **As needed:** Update feature flags based on application requirements

### Version Updates
When updating LogoBox versions:
1. Review changelog for new environment variables
2. Update both production and preview environments
3. Test deployment with new variables
4. Document any breaking changes

## Support

If you encounter issues with environment variable configuration:

1. Check the [Cloudflare Pages documentation](https://developers.cloudflare.com/pages/platform/build-configuration/)
2. Review build logs in the Cloudflare Pages dashboard
3. Validate variable names and values against this document
4. Test with a minimal set of variables first, then add others incrementally