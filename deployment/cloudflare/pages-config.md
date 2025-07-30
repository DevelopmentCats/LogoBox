# Cloudflare Pages Configuration Guide

This guide provides comprehensive instructions for configuring LogoBox deployment on Cloudflare Pages, including environment variables, build settings, and domain configuration.

## Prerequisites

Before starting, ensure you have:
- A Cloudflare account with Pages access
- GitHub repository access to DevelopmentCats/LogoBox
- Administrative permissions for the Cloudflare account

## Initial Project Setup

### 1. Create Cloudflare Pages Project

1. **Log in to Cloudflare Dashboard**
   - Go to [dash.cloudflare.com](https://dash.cloudflare.com)
   - Navigate to **Pages** in the left sidebar

2. **Connect to Git**
   - Click **Create a project**
   - Select **Connect to Git**
   - Choose **GitHub** as your Git provider
   - Authorize Cloudflare to access your GitHub account

3. **Select Repository**
   - Find and select **DevelopmentCats/LogoBox**
   - Click **Begin setup**

4. **Configure Build Settings**
   ```
   Project name: logobox
   Production branch: main
   Build command: npm run build --workspace=website
   Build output directory: logobox/website/dist
   Root directory: logobox
   ```

5. **Environment Variables** (Configure as detailed below)

6. **Deploy**
   - Click **Save and Deploy**
   - Wait for the initial deployment to complete

## Environment Variables Configuration

### Production Environment

Navigate to **Settings** → **Environment variables** → **Production** tab and add the following variables:

#### Application Configuration
| Variable Name | Value | Description |
|---------------|-------|-------------|
| `VITE_APP_TITLE` | `LogoBox` | Application title displayed in browser |
| `VITE_APP_DESCRIPTION` | `Browse and discover high-quality logos and icons` | Meta description for SEO |

#### API and CDN Configuration
| Variable Name | Value | Description |
|---------------|-------|-------------|
| `VITE_API_BASE_URL` | `https://api.logobox.dev` | Base URL for LogoBox API |
| `VITE_CDN_BASE_URL` | `https://cdn.logobox.dev` | CDN base URL for assets |
| `VITE_CATALOG_PATH` | `/catalog.json` | Path to logo catalog JSON |
| `VITE_LOGOS_PATH` | `/logos` | Path to logos directory |
| `VITE_CDN_FALLBACK_URL_1` | `https://backup-cdn1.logobox.dev` | Primary fallback CDN |
| `VITE_CDN_FALLBACK_URL_2` | `https://backup-cdn2.logobox.dev` | Secondary fallback CDN |

#### API Client Configuration
| Variable Name | Value | Description |
|---------------|-------|-------------|
| `VITE_API_TIMEOUT` | `15000` | API request timeout (milliseconds) |
| `VITE_API_RETRY_ATTEMPTS` | `3` | Number of retry attempts |
| `VITE_API_RETRY_DELAY` | `2000` | Delay between retries (milliseconds) |

#### Feature Flags
| Variable Name | Value | Description |
|---------------|-------|-------------|
| `VITE_ENABLE_ANALYTICS` | `true` | Enable analytics tracking |
| `VITE_ENABLE_PERFORMANCE_MONITORING` | `false` | Enable performance monitoring |
| `VITE_LOG_LEVEL` | `warn` | Logging level (debug/info/warn/error) |

#### NPM Package Configuration
| Variable Name | Value | Description |
|---------------|-------|-------------|
| `LOGOBOX_BASE_URL` | `https://logobox.dev` | Base URL for package API |
| `LOGOBOX_CDN_BASE_URL` | `https://cdn.logobox.dev` | CDN URL for package |
| `LOGOBOX_DEFAULT_VARIANT` | `original` | Default logo variant |
| `LOGOBOX_CACHE_ENABLED` | `true` | Enable package caching |
| `LOGOBOX_CACHE_TTL` | `3600000` | Cache TTL in milliseconds (1 hour) |
| `LOGOBOX_API_BASE_URL` | `https://api.logobox.dev` | API URL for package |

### Preview Environment

Navigate to **Settings** → **Environment variables** → **Preview** tab and add the following variables:

#### Application Configuration (Preview-specific)
| Variable Name | Value | Description |
|---------------|-------|-------------|
| `VITE_APP_TITLE` | `LogoBox (Preview)` | Preview environment title |
| `VITE_APP_DESCRIPTION` | `Browse and discover high-quality logos and icons - Preview Environment` | Preview description |

#### API and CDN Configuration (Same as Production)
Use the same values as production for API and CDN configuration.

#### API Client Configuration (Preview-optimized)
| Variable Name | Value | Description |
|---------------|-------|-------------|
| `VITE_API_TIMEOUT` | `10000` | Shorter timeout for testing |
| `VITE_API_RETRY_ATTEMPTS` | `2` | Fewer retries for faster feedback |
| `VITE_API_RETRY_DELAY` | `1000` | Shorter delay between retries |

#### Feature Flags (Preview-optimized)
| Variable Name | Value | Description |
|---------------|-------|-------------|
| `VITE_ENABLE_ANALYTICS` | `false` | Disable analytics in preview |
| `VITE_ENABLE_PERFORMANCE_MONITORING` | `true` | Enable for debugging |
| `VITE_LOG_LEVEL` | `debug` | More verbose logging |

#### NPM Package Configuration (Preview-optimized)
| Variable Name | Value | Description |
|---------------|-------|-------------|
| `LOGOBOX_CACHE_TTL` | `1800000` | Shorter cache TTL (30 minutes) |

All other NPM package variables remain the same as production.

## Build Configuration

### Build Settings Verification

Ensure your build settings match:

```
Framework preset: None
Build command: npm run build --workspace=website
Build output directory: logobox/website/dist
Root directory (advanced): logobox
```

### Node.js Version

Cloudflare Pages will automatically use Node.js 18.x. If you need a specific version, add:

```
NODE_VERSION=18.17.0
```

## Custom Domain Configuration

### 1. Add Custom Domain

1. Go to **Custom domains** tab in your Pages project
2. Click **Set up a custom domain**
3. Enter your domain (e.g., `logobox.dev`)
4. Follow the DNS configuration instructions

### 2. Configure DNS Records

Add the following DNS records in your domain registrar:

```
Type: CNAME
Name: www
Content: logobox.pages.dev

Type: CNAME  
Name: @
Content: logobox.pages.dev
```

### 3. SSL/TLS Configuration

1. Navigate to **SSL/TLS** → **Overview**
2. Set encryption mode to **Full (strict)**
3. Enable **Always Use HTTPS**

## Security Configuration

### 1. Security Headers

Security headers are configured in `wrangler.toml`:

```toml
[[env.production.rules]]
type = "Text"
globs = ["**/*.html"]
[env.production.rules.result.headers]
"X-Frame-Options" = "DENY"
"X-Content-Type-Options" = "nosniff"
"Referrer-Policy" = "strict-origin-when-cross-origin"
"Permissions-Policy" = "camera=(), microphone=(), geolocation=()"
```

### 2. Access Policies

Configure access policies if needed:

1. Go to **Settings** → **General**
2. Under **Access policy**, configure as needed
3. For public sites, leave as **Public**

## Performance Optimization

### 1. Caching Rules

Caching is configured in `wrangler.toml`:

```toml
# Static assets - long cache
[[env.production.rules]]
type = "Text"
globs = ["**/*.svg", "**/*.png", "**/*.jpg", "**/*.jpeg", "**/*.gif", "**/*.webp", "**/*.ico"]
[env.production.rules.result]
cache_control = "public, max-age=31536000, immutable"

# Assets directory - long cache
[[env.production.rules]]
type = "Text"
globs = ["assets/**/*"]
[env.production.rules.result]
cache_control = "public, max-age=31536000, immutable"
```

### 2. Compression

Compression is enabled for text files:

```toml
[[env.production.rules]]
type = "Text"
globs = ["**/*.html", "**/*.js", "**/*.css", "**/*.json", "**/*.xml", "**/*.txt"]
[env.production.rules.result]
compress = true
```

## Deployment Triggers

### Automatic Deployments

Deployments are triggered by:
- **Production**: Pushes to `main` branch
- **Preview**: Pull requests to `main` branch

### Manual Deployments

To trigger manual deployments:
1. Go to **Deployments** tab
2. Click **Create deployment**
3. Select branch and deploy

## Monitoring and Logs

### 1. Build Logs

Access build logs:
1. Go to **Deployments** tab
2. Click on any deployment
3. View **Build log** and **Function log**

### 2. Analytics

Enable analytics:
1. Go to **Analytics** tab
2. Enable **Web Analytics**
3. Configure tracking as needed

### 3. Real User Monitoring

For advanced monitoring:
1. Enable **Speed** tab analytics
2. Monitor Core Web Vitals
3. Set up alerts for performance issues

## Troubleshooting

### Common Issues

#### Build Failures

**Issue**: `Error: Environment variable VITE_API_BASE_URL is not defined`
**Solution**: Ensure all required environment variables are set in both production and preview environments.

**Issue**: `Build command failed with exit code 1`
**Solution**: Check build logs for specific errors. Common causes:
- Missing dependencies
- TypeScript errors
- Environment variable issues

#### Deployment Issues

**Issue**: `404 errors on page refresh`
**Solution**: Ensure `_redirects` file is properly configured for SPA routing.

**Issue**: `Assets not loading`
**Solution**: Verify `VITE_CDN_BASE_URL` and asset paths are correct.

### Validation Commands

Use the provided script to validate configuration:

```bash
# Generate production environment variables
./deployment/scripts/cloudflare-env-setup.sh generate-production

# Generate preview environment variables  
./deployment/scripts/cloudflare-env-setup.sh generate-preview

# Validate current environment
./deployment/scripts/cloudflare-env-setup.sh validate

# Test connectivity
./deployment/scripts/cloudflare-env-setup.sh test-connectivity
```

## Maintenance

### Regular Tasks

1. **Monthly**: Review environment variables for accuracy
2. **Quarterly**: Update Node.js version if needed
3. **As needed**: Update custom domain SSL certificates

### Updates and Changes

When making changes:
1. Test in preview environment first
2. Update both production and preview variables
3. Monitor deployment logs for issues
4. Verify functionality after deployment

## Support Resources

- [Cloudflare Pages Documentation](https://developers.cloudflare.com/pages/)
- [Build Configuration Reference](https://developers.cloudflare.com/pages/platform/build-configuration/)
- [Environment Variables Guide](https://developers.cloudflare.com/pages/platform/build-configuration/#environment-variables)
- [Custom Domains Setup](https://developers.cloudflare.com/pages/platform/custom-domains/)