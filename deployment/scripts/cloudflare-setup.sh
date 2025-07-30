#!/bin/bash

# Cloudflare Pages Setup Script for LogoBox
# This script provides instructions and commands for setting up the Cloudflare Pages project

set -e

echo "🚀 LogoBox Cloudflare Pages Setup"
echo "=================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_step() {
    echo -e "${BLUE}📋 $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "website" ]; then
    print_error "Please run this script from the logobox directory"
    exit 1
fi

print_step "Step 1: Prerequisites Check"
echo ""

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    print_warning "Wrangler CLI not found. Installing..."
    npm install -g wrangler
    print_success "Wrangler CLI installed"
else
    print_success "Wrangler CLI is available"
fi

# Check if user is logged in to Cloudflare
if ! wrangler whoami &> /dev/null; then
    print_warning "Not logged in to Cloudflare. Please run:"
    echo "  wrangler login"
    echo ""
    echo "Then re-run this script."
    exit 1
else
    print_success "Logged in to Cloudflare"
fi

print_step "Step 2: Project Configuration"
echo ""

echo "The following configuration will be used:"
echo "  Project Name: logobox"
echo "  GitHub Repository: DevelopmentCats/LogoBox"
echo "  Build Command: npm run build --workspace=website"
echo "  Build Output Directory: logobox/website/dist"
echo "  Root Directory: logobox"
echo "  Node.js Version: 18"
echo ""

print_step "Step 3: Create Cloudflare Pages Project"
echo ""

echo "You have two options to create the Cloudflare Pages project:"
echo ""
echo "Option A: Using Cloudflare Dashboard (Recommended)"
echo "1. Go to https://dash.cloudflare.com/"
echo "2. Navigate to Pages"
echo "3. Click 'Create a project'"
echo "4. Select 'Connect to Git'"
echo "5. Choose GitHub and authorize Cloudflare"
echo "6. Select the 'DevelopmentCats/LogoBox' repository"
echo "7. Configure build settings:"
echo "   - Project name: logobox"
echo "   - Production branch: main"
echo "   - Build command: npm run build --workspace=website"
echo "   - Build output directory: logobox/website/dist"
echo "   - Root directory: logobox"
echo "   - Environment variables: (see pages-config.md)"
echo ""

echo "Option B: Using Wrangler CLI"
echo "Run the following command:"
echo "  wrangler pages project create logobox --production-branch main"
echo ""

read -p "Have you created the Cloudflare Pages project? (y/n): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_warning "Please create the project first, then re-run this script."
    exit 1
fi

print_success "Cloudflare Pages project created"

print_step "Step 4: Configure Environment Variables"
echo ""

echo "Set the following environment variables in the Cloudflare Pages dashboard:"
echo "Go to your project > Settings > Environment Variables"
echo ""

# Read environment variables from .env.example if it exists
if [ -f ".env.example" ]; then
    echo "Production Environment Variables:"
    echo "================================"
    while IFS= read -r line; do
        if [[ $line =~ ^VITE_ ]] && [[ ! $line =~ ^# ]]; then
            echo "  $line"
        fi
    done < .env.example
    echo ""
    
    echo "Additional Production Variables:"
    echo "  NODE_ENV=production"
    echo "  VITE_ENABLE_ANALYTICS=true"
    echo "  VITE_ENABLE_PERFORMANCE_MONITORING=false"
    echo "  VITE_LOG_LEVEL=warn"
    echo ""
    
    echo "Preview Environment Variables:"
    echo "============================="
    echo "  NODE_ENV=development"
    echo "  VITE_ENABLE_ANALYTICS=false"
    echo "  VITE_ENABLE_PERFORMANCE_MONITORING=true"
    echo "  VITE_LOG_LEVEL=debug"
    echo "  (Plus all VITE_ variables with preview-specific values)"
else
    print_warning ".env.example not found. Please refer to pages-config.md for environment variables."
fi

echo ""
read -p "Have you configured the environment variables? (y/n): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_warning "Please configure environment variables, then continue."
fi

print_step "Step 5: Test Build Process"
echo ""

print_step "Installing dependencies..."
npm ci

print_step "Running asset processing..."
npm run generate-variants
npm run optimize-assets
npm run build-catalog

print_step "Building website..."
npm run build --workspace=website

if [ -d "website/dist" ]; then
    print_success "Build completed successfully"
    echo "Build output directory: $(pwd)/website/dist"
    echo "Build size: $(du -sh website/dist | cut -f1)"
else
    print_error "Build failed - dist directory not found"
    exit 1
fi

print_step "Step 6: Deploy to Cloudflare Pages"
echo ""

echo "You can now deploy using one of these methods:"
echo ""
echo "Method 1: Automatic deployment (Recommended)"
echo "  Push your changes to the main branch:"
echo "  git add ."
echo "  git commit -m 'Configure Cloudflare Pages deployment'"
echo "  git push origin main"
echo ""

echo "Method 2: Manual deployment using Wrangler"
echo "  wrangler pages deploy website/dist --project-name logobox"
echo ""

echo "Method 3: Manual deployment via Dashboard"
echo "  1. Go to your Cloudflare Pages project"
echo "  2. Click 'Create deployment'"
echo "  3. Upload the website/dist folder"
echo ""

print_step "Step 7: Verify Deployment"
echo ""

echo "After deployment, verify the following:"
echo "✓ Website loads correctly"
echo "✓ Logo search functionality works"
echo "✓ Asset loading is fast (check Network tab)"
echo "✓ No console errors"
echo "✓ Mobile responsiveness"
echo ""

print_step "Step 8: Configure Custom Domain (Optional)"
echo ""

echo "To set up a custom domain:"
echo "1. Go to your Cloudflare Pages project"
echo "2. Navigate to Custom domains"
echo "3. Click 'Set up a custom domain'"
echo "4. Enter your domain (e.g., logobox.dev)"
echo "5. Follow the DNS configuration instructions"
echo ""

print_success "Cloudflare Pages setup complete!"
echo ""
echo "📚 Additional Resources:"
echo "  - Configuration details: deployment/cloudflare/pages-config.md"
echo "  - Wrangler config: deployment/cloudflare/wrangler.toml"
echo "  - Redirects config: deployment/cloudflare/_redirects"
echo ""
echo "🔗 Useful Links:"
echo "  - Cloudflare Pages Dashboard: https://dash.cloudflare.com/"
echo "  - Pages Documentation: https://developers.cloudflare.com/pages/"
echo "  - GitHub Integration: https://developers.cloudflare.com/pages/get-started/git-integration/"
echo ""

print_success "Setup completed successfully! 🎉"