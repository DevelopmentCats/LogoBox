#!/bin/bash

# LogoBox CDN Deployment Script
# Deploys catalog and logo assets to Cloudflare R2 bucket

set -e

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

# Configuration
BUCKET_NAME="logobox-cdn"
ENVIRONMENT=${1:-"dev"}

case $ENVIRONMENT in
    "dev")
        BUCKET_NAME="logobox-dev"
        CDN_URL="https://cdn.logobox.dev"
        ;;
    "staging")
        BUCKET_NAME="logobox-cdn-staging"
        CDN_URL="https://staging-cdn.logobox.dev"
        ;;
    "production")
        BUCKET_NAME="logobox-cdn"
        CDN_URL="https://cdn.logobox.dev"
        ;;
    *)
        print_error "Invalid environment. Use: dev, staging, or production"
        exit 1
        ;;
esac

print_step "Deploying LogoBox CDN to $ENVIRONMENT environment"
echo "Bucket: $BUCKET_NAME"
echo "CDN URL: $CDN_URL"
echo ""

# Check prerequisites
print_step "Checking prerequisites..."

if ! command -v wrangler &> /dev/null; then
    print_error "Wrangler CLI not found. Please install: npm install -g wrangler"
    exit 1
fi

if [ ! -f "assets/catalog.json" ]; then
    print_error "Catalog not found. Please run: npm run build-catalog"
    exit 1
fi

if [ ! -d "assets/logos" ]; then
    print_error "Logo assets not found in assets/logos"
    exit 1
fi

print_success "Prerequisites check passed"

# Create R2 bucket if it doesn't exist
print_step "Setting up R2 bucket..."

if ! wrangler r2 bucket list | grep -q "$BUCKET_NAME"; then
    print_warning "Bucket $BUCKET_NAME not found. Creating..."
    wrangler r2 bucket create "$BUCKET_NAME"
    print_success "Created R2 bucket: $BUCKET_NAME"
else
    print_success "R2 bucket exists: $BUCKET_NAME"
fi

# Upload catalog.json
print_step "Uploading catalog.json..."
wrangler r2 object put "$BUCKET_NAME/catalog.json" --file="assets/catalog.json" --content-type="application/json"
print_success "Uploaded catalog.json"

# Upload logo assets
print_step "Uploading logo assets..."

# Count total logos for progress
TOTAL_LOGOS=$(find assets/logos -name "*.svg" | wc -l)
CURRENT=0

for logo_dir in assets/logos/*/; do
    if [ -d "$logo_dir" ]; then
        logo_name=$(basename "$logo_dir")
        
        # Upload all SVG files in the logo directory
        for svg_file in "$logo_dir"*.svg; do
            if [ -f "$svg_file" ]; then
                filename=$(basename "$svg_file")
                remote_path="logos/$logo_name/$filename"
                
                wrangler r2 object put "$BUCKET_NAME/$remote_path" --file="$svg_file" --content-type="image/svg+xml"
                
                CURRENT=$((CURRENT + 1))
                echo -ne "\rUploading logos... $CURRENT/$TOTAL_LOGOS"
            fi
        done
    fi
done

echo ""
print_success "Uploaded $TOTAL_LOGOS logo assets"

# Set up public access and caching headers
print_step "Configuring bucket settings..."

# Note: This would require additional Cloudflare API calls or Terraform
# For now, these need to be configured manually in the Cloudflare dashboard:
# 1. Set up custom domain (cdn.logobox.dev) pointing to R2 bucket
# 2. Configure caching rules
# 3. Set CORS headers if needed

print_warning "Manual configuration required:"
echo "1. Set up custom domain $CDN_URL pointing to R2 bucket $BUCKET_NAME"
echo "2. Configure caching rules in Cloudflare dashboard"
echo "3. Set appropriate CORS headers if needed"

# Test deployment
print_step "Testing deployment..."

# Wait a moment for propagation
sleep 5

# Test catalog endpoint
if curl -f -s "$CDN_URL/catalog.json" > /dev/null; then
    print_success "Catalog endpoint accessible: $CDN_URL/catalog.json"
else
    print_warning "Catalog endpoint not yet accessible (may need DNS propagation)"
fi

# Test a sample logo
if curl -f -s "$CDN_URL/logos/github/logo.svg" > /dev/null; then
    print_success "Sample logo accessible: $CDN_URL/logos/github/logo.svg"
else
    print_warning "Sample logo not yet accessible (may need DNS propagation)"
fi

print_success "CDN deployment completed!"
echo ""
echo "CDN URL: $CDN_URL"
echo "Bucket: $BUCKET_NAME"
echo "Assets uploaded: $TOTAL_LOGOS logos + catalog"
echo ""
echo "Next steps:"
echo "1. Configure custom domain in Cloudflare dashboard"
echo "2. Update environment variables to use CDN URLs"
echo "3. Test website and npm package integration"