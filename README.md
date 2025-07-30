# LogoBox

A comprehensive logo management system providing both web interface and programmatic access to high-quality brand logos with advanced processing capabilities.

## Features

### Core Features
- **Extensive Logo Collection**: Curated collection of popular brand logos
- **Multiple Formats**: SVG, PNG, and other formats available
- **Logo Variants**: Original, white, black, and optimized versions
- **Cross-Platform**: Web interface and NPM package for developers

### Advanced Processing (New!)
- **Dynamic Image Generation**: Real-time logo processing with format conversion
- **On-Demand Resizing**: Generate logos in any dimension up to 2048x2048
- **Format Conversion**: Convert between SVG, PNG, JPEG, and WebP formats
- **Intelligent Caching**: Multi-level caching for optimal performance
- **Batch Processing**: Download multiple sizes and variants simultaneously
- **Error Recovery**: Comprehensive error handling with automatic retry mechanisms

## Quick Start

### Web Interface
Visit the LogoBox website to browse and download logos with our advanced download modal featuring:
- Real-time preview
- Custom size selection
- Format conversion
- Batch downloads
- Variant generation

### NPM Package
```bash
npm install logobox
```

```javascript
import { 
  getAllLogos, 
  getLogo, 
  downloadLogo,
  generateDynamicImage,
  resizeImage 
} from 'logobox';

// Get all available logos
const logos = getAllLogos();

// Get specific logo information
const githubLogo = getLogo('github');

// Download logo in specific format and size
const logoBuffer = await downloadLogo('github', {
  format: 'png',
  width: 128,
  height: 128,
  variant: 'white'
});

// Generate dynamic image with advanced options
const result = await generateDynamicImage('microsoft', {
  width: 256,
  height: 256,
  format: 'webp',
  quality: 90,
  variant: 'black'
});

// Batch resize for multiple dimensions
const sizes = await resizeImage('apple', [
  { width: 32, height: 32 },
  { width: 64, height: 64 },
  { width: 128, height: 128 }
]);
```

## API Reference

### Core Functions

#### `getAllLogos()`
Returns an array of all available logos with metadata.

```javascript
const logos = getAllLogos();
// Returns: Array<LogoMetadata>
```

#### `getLogo(slug: string)`
Get detailed information about a specific logo.

```javascript
const logo = getLogo('github');
// Returns: LogoMetadata | null
```

#### `downloadLogo(slug: string, options?: DownloadOptions)`
Download a logo with specified options.

```javascript
const buffer = await downloadLogo('github', {
  format: 'png',     // 'svg' | 'png' | 'jpeg' | 'webp'
  width: 128,        // 1-2048 pixels
  height: 128,       // 1-2048 pixels
  variant: 'white',  // 'original' | 'white' | 'black' | 'optimized'
  quality: 90        // 1-100 (for JPEG/WebP)
});
```

### Advanced Processing Functions

#### `generateDynamicImage(slug: string, options: DynamicImageOptions)`
Generate logo with advanced processing options.

```javascript
const result = await generateDynamicImage('slack', {
  width: 256,
  height: 256,
  format: 'webp',
  quality: 85,
  variant: 'black',
  background: '#ffffff',  // Optional background color
  padding: 10            // Optional padding in pixels
});

// Returns: DynamicImageResult
// {
//   success: boolean,
//   data: Buffer,
//   metadata: {
//     width: number,
//     height: number,
//     format: string,
//     size: number
//   },
//   cached: boolean
// }
```

#### `resizeImage(slug: string, sizes: ResizeOptions[])`
Generate multiple sizes of a logo efficiently.

```javascript
const results = await resizeImage('twitter', [
  { width: 16, height: 16, name: 'favicon' },
  { width: 32, height: 32, name: 'small' },
  { width: 64, height: 64, name: 'medium' },
  { width: 128, height: 128, name: 'large' }
]);

// Returns: BatchResizeResult
// {
//   success: boolean,
//   results: { [name: string]: DynamicImageResult },
//   successCount: number,
//   errorCount: number,
//   errors?: { [name: string]: Error }
// }
```

#### `getLogoVariants(slug: string, options?: VariantOptions)`
Generate all available variants of a logo.

```javascript
const variants = await getLogoVariants('spotify', {
  width: 128,
  height: 128,
  format: 'png'
});

// Returns: VariantResult
// {
//   success: boolean,
//   variants: {
//     original: DynamicImageResult,
//     white: DynamicImageResult,
//     black: DynamicImageResult,
//     optimized: DynamicImageResult
//   }
// }
```

## Type Definitions

```typescript
interface LogoMetadata {
  slug: string;
  name: string;
  category: string;
  tags: string[];
  formats: string[];
  variants: string[];
  colors: {
    primary: string;
    secondary?: string;
  };
  website?: string;
  description?: string;
}

interface DownloadOptions {
  format?: 'svg' | 'png' | 'jpeg' | 'webp';
  width?: number;
  height?: number;
  variant?: 'original' | 'white' | 'black' | 'optimized';
  quality?: number;
}

interface DynamicImageOptions extends DownloadOptions {
  background?: string;
  padding?: number;
  fit?: 'contain' | 'cover' | 'fill';
}

interface DynamicImageResult {
  success: boolean;
  data: Buffer;
  metadata: {
    width: number;
    height: number;
    format: string;
    size: number;
  };
  cached: boolean;
  processingTime?: number;
}
```

## Configuration

### Environment Variables

LogoBox uses environment variables for configuration across different components. **Never commit `.env` files to version control** - they contain sensitive information.

#### Quick Setup

1. **Copy environment templates:**
   ```bash
   # Root configuration
   cp .env.example .env
   
   # Website configuration
   cp website/.env.example website/.env.development
   cp website/.env.example website/.env.production
   
   # Package configuration
   cp package/.env.example package/.env
   ```

2. **Validate your configuration:**
   ```bash
   npm run env-check
   ```

#### Website Environment Variables

```bash
# Application branding
VITE_APP_TITLE=LogoBox
VITE_APP_DESCRIPTION=Browse and discover high-quality logos and icons

# API and CDN endpoints
VITE_API_BASE_URL=https://api.logobox.dev
VITE_CDN_BASE_URL=https://cdn.logobox.dev
VITE_CATALOG_PATH=/catalog.json
VITE_LOGOS_PATH=/logos

# API client settings
VITE_API_TIMEOUT=15000
VITE_API_RETRY_ATTEMPTS=3
VITE_API_RETRY_DELAY=2000

# Feature flags
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_PERFORMANCE_MONITORING=false
VITE_LOG_LEVEL=warn
```

#### NPM Package Environment Variables

```bash
# Package configuration
LOGOBOX_BASE_URL=https://logobox.dev
LOGOBOX_CDN_BASE_URL=https://cdn.logobox.dev
LOGOBOX_DEFAULT_VARIANT=original
LOGOBOX_CACHE_ENABLED=true
LOGOBOX_CACHE_TTL=3600000
LOGOBOX_API_BASE_URL=https://api.logobox.dev
```

#### Deployment Secrets (GitHub Secrets)

These should **never** be set in `.env` files. Configure them as GitHub Secrets:

```bash
# NPM publishing
NPM_TOKEN=your_npm_token
GITHUB_TOKEN=auto_provided_by_github

# Cloudflare deployment
CLOUDFLARE_API_TOKEN=your_cloudflare_token
CLOUDFLARE_ACCOUNT_ID=your_account_id
```

### Programmatic Configuration

```javascript
import { configure } from 'logobox';

configure({
  logosDir: '/custom/logos/path',
  cache: {
    enabled: true,
    ttl: 3600,
    maxSize: 200
  },
  processing: {
    maxConcurrent: 5,
    enableOptimization: true
  },
  errorHandling: {
    enableLogging: true,
    logLevel: 'warn'
  }
});
```

## Performance Considerations

### Caching Strategy
LogoBox implements intelligent multi-level caching:
- **Memory Cache**: Fast access to recently generated images
- **Disk Cache**: Persistent storage for processed images
- **CDN Integration**: Optional CDN support for global distribution

### Processing Optimization
- **Sharp Library**: High-performance image processing
- **Worker Threads**: Parallel processing for batch operations
- **Stream Processing**: Memory-efficient handling of large images
- **Format-Specific Optimization**: Optimized pipelines for each format

### Rate Limiting
Built-in rate limiting prevents abuse and ensures fair usage:
- Per-IP request limits
- Configurable time windows
- Graceful degradation under load

## Error Handling

LogoBox provides comprehensive error handling:

```javascript
import { LogoBoxError, ERROR_CODES } from 'logobox';

try {
  const result = await downloadLogo('invalid-logo');
} catch (error) {
  if (error instanceof LogoBoxError) {
    switch (error.code) {
      case ERROR_CODES.LOGO_NOT_FOUND:
        console.log('Logo not found');
        break;
      case ERROR_CODES.INVALID_PARAMETERS:
        console.log('Invalid parameters:', error.details);
        break;
      case ERROR_CODES.PROCESSING_FAILED:
        console.log('Processing failed:', error.message);
        break;
      case ERROR_CODES.RATE_LIMIT_EXCEEDED:
        console.log('Rate limit exceeded, try again later');
        break;
      default:
        console.log('Unknown error:', error.message);
    }
  }
}
```

## Deployment

LogoBox is configured for automated deployment to Cloudflare Pages with GitHub Actions integration.

### Cloudflare Pages Setup

#### Prerequisites
- GitHub repository: `DevelopmentCats/LogoBox`
- Cloudflare account with Pages access
- Node.js 18+ for builds

#### Quick Setup
1. **Run the setup script**:
   ```bash
   cd logobox
   ./deployment/scripts/cloudflare-setup.sh
   ```

2. **Or follow manual steps**:
   - Go to [Cloudflare Pages Dashboard](https://dash.cloudflare.com/)
   - Create new project connected to GitHub
   - Configure build settings:
     - **Build command**: `npm run build --workspace=website`
     - **Build output directory**: `logobox/website/dist`
     - **Root directory**: `logobox`
     - **Node.js version**: `18`

#### Environment Variables
Configure these in Cloudflare Pages dashboard:

**Production Environment**:
```bash
NODE_ENV=production
VITE_APP_TITLE=LogoBox
VITE_APP_DESCRIPTION=Browse and discover high-quality logos and icons
VITE_API_BASE_URL=https://api.logobox.dev
VITE_CDN_BASE_URL=https://cdn.logobox.dev
VITE_CATALOG_PATH=/catalog.json
VITE_LOGOS_PATH=/logos
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_PERFORMANCE_MONITORING=false
VITE_LOG_LEVEL=warn
```

**Preview Environment**:
```bash
NODE_ENV=development
VITE_ENABLE_ANALYTICS=false
VITE_ENABLE_PERFORMANCE_MONITORING=true
VITE_LOG_LEVEL=debug
```

#### GitHub Secrets
Configure these secrets in your GitHub repository:

```bash
# NPM publishing
NPM_TOKEN=your_npm_token_here

# Cloudflare deployment
CLOUDFLARE_API_TOKEN=your_cloudflare_api_token
CLOUDFLARE_ACCOUNT_ID=your_cloudflare_account_id
```

### Automated Deployment

#### GitHub Actions Workflows
- **Main Deployment**: Triggers on push to `main` branch
- **Preview Deployments**: Creates preview for pull requests
- **NPM Publishing**: Automatically publishes package on version changes
- **Testing**: Runs comprehensive tests on all PRs

#### Deployment Process
1. **Push to main branch**:
   ```bash
   git add .
   git commit -m "Your changes"
   git push origin main
   ```

2. **Automatic pipeline**:
   - Runs tests and linting
   - Processes assets (logos, catalog)
   - Builds website and package
   - Deploys to Cloudflare Pages
   - Publishes NPM package (if version changed)

### Manual Deployment

#### Using Wrangler CLI
```bash
# Install Wrangler
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Build and deploy
npm run build --workspace=website
wrangler pages deploy website/dist --project-name logobox
```

#### Build Verification
```bash
# Test local build
npm run build --workspace=website

# Verify build output
ls -la website/dist/

# Test locally
npm run preview --workspace=website
```

### Custom Domain Setup

1. **In Cloudflare Pages**:
   - Go to Custom domains
   - Add your domain (e.g., `logobox.dev`)
   - Follow DNS configuration instructions

2. **Update configuration**:
   - Uncomment domain routes in `deployment/cloudflare/wrangler.toml`
   - Update environment variables with production URLs

### Performance Optimization

#### Cloudflare Features
- **CDN**: Global edge caching
- **Compression**: Brotli/Gzip enabled
- **HTTP/2**: Multiplexed requests
- **Caching**: Aggressive asset caching (1 year for static assets)

#### Build Optimizations
- **Code Splitting**: Automatic chunk splitting
- **Tree Shaking**: Dead code elimination
- **Asset Optimization**: Image and SVG optimization
- **Bundle Analysis**: Size monitoring and optimization

### Monitoring and Troubleshooting

#### Health Checks
- **Build Status**: Monitor in GitHub Actions
- **Deployment Status**: Check Cloudflare Pages dashboard
- **Performance**: Core Web Vitals monitoring
- **Errors**: Real-time error tracking

#### Common Issues
1. **Build Failures**:
   - Check Node.js version (must be 18+)
   - Verify environment variables
   - Check build logs in GitHub Actions

2. **Deployment Issues**:
   - Verify GitHub integration
   - Check Cloudflare API tokens
   - Ensure build output directory exists

3. **Runtime Errors**:
   - Check browser console
   - Verify API endpoints
   - Check environment variable values

#### Support Resources
- **Configuration**: `deployment/cloudflare/pages-config.md`
- **Setup Script**: `deployment/scripts/cloudflare-setup.sh`
- **Cloudflare Docs**: [Pages Documentation](https://developers.cloudflare.com/pages/)

## Contributing

### Development Setup

```bash
# Clone repository
git clone https://github.com/DevelopmentCats/LogoBox.git
cd LogoBox/logobox

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
cp website/.env.example website/.env.development
cp package/.env.example package/.env

# Edit the .env files with your local configuration
# For development, you typically want:
# - VITE_API_BASE_URL=http://localhost:3001
# - VITE_CDN_BASE_URL=http://localhost:3000/assets
# - LOGOBOX_BASE_URL=http://localhost:3000

# Validate environment setup
npm run env-check

# Run tests
npm test

# Start development server
npm run dev
```

**Important**: Never commit `.env` files to version control. They are already excluded in `.gitignore`.

### Adding New Logos
1. Add logo files to the appropriate category directory
2. Include both SVG and PNG formats when possible
3. Create variants (white, black, optimized) if applicable
4. Update the logo metadata in `logos.json`
5. Run the logo validation script: `npm run validate-logos`

### Testing
- Unit tests: `npm run test:unit`
- Integration tests: `npm run test:integration`
- Performance tests: `npm run test:performance`
- Coverage report: `npm run test:coverage`

## License

MIT License - see LICENSE file for details.

## Support

- GitHub Issues: [Report bugs or request features](https://github.com/your-username/logobox/issues)
- Documentation: [Full API documentation](https://logobox.dev/docs)
- Examples: [Usage examples and tutorials](https://github.com/your-username/logobox/tree/main/examples)

## Changelog

### v2.0.0 (Latest)
- ✨ **New**: Dynamic image generation with real-time processing
- ✨ **New**: On-demand resizing up to 2048x2048 pixels
- ✨ **New**: Format conversion (SVG, PNG, JPEG, WebP)
- ✨ **New**: Advanced download modal with preview
- ✨ **New**: Batch processing capabilities
- ✨ **New**: Comprehensive error handling system
- ⚡ **Improved**: Multi-level caching for better performance
- ⚡ **Improved**: Rate limiting and security enhancements
- 🐛 **Fixed**: Various performance and stability issues

### v1.x.x
- Basic logo collection and download functionality
- Simple web interface
- Core NPM package features