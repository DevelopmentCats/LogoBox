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
        CDN_URL="https://dev-cdn.logobox.dev"
        ;;
    "production")
        BUCKET_NAME="logobox-cdn"
        CDN_URL="https://cdn.logobox.dev"
        ;;
    *)
        print_error "Invalid environment. Use: dev or production"
        exit 1
        ;;
esac

print_step "Deploying LogoBox CDN to $ENVIRONMENT environment"
echo "Bucket: $BUCKET_NAME"
echo "CDN URL: $CDN_URL"
echo ""

# Check prerequisites
print_step "Checking prerequisites..."

# Check wrangler
if ! command -v wrangler &> /dev/null; then
    print_error "Wrangler CLI not found. Please install: npm install -g wrangler"
    exit 1
fi
print_success "Wrangler CLI found: $(wrangler --version)"

# Debug: Show current directory and list contents
echo "🔍 Current directory: $(pwd)"
echo "🔍 Directory contents:"
ls -la

# Check for catalog
if [ ! -f "assets/catalog.json" ]; then
    print_error "Catalog not found at assets/catalog.json"
    echo "🔍 Checking for assets directory:"
    if [ -d "assets" ]; then
        echo "Assets directory exists, contents:"
        ls -la assets/
    else
        echo "Assets directory does not exist"
    fi
    exit 1
fi
print_success "Found catalog: assets/catalog.json ($(wc -c < assets/catalog.json) bytes)"

# Check for logo assets
if [ ! -d "assets/logos" ]; then
    print_error "Logo assets not found in assets/logos"
    echo "🔍 Assets directory contents:"
    ls -la assets/ || echo "Assets directory not accessible"
    exit 1
fi

# Count and show logo files
LOGO_COUNT=$(find assets/logos -name "*.svg" 2>/dev/null | wc -l)
print_success "Found $LOGO_COUNT logo files in assets/logos"
if [ "$LOGO_COUNT" -eq 0 ]; then
    print_warning "No SVG files found in assets/logos directory"
    echo "🔍 Contents of assets/logos:"
    ls -la assets/logos/
fi

print_success "Prerequisites check passed"

# Create R2 bucket if it doesn't exist
print_step "Setting up R2 bucket..."

# List buckets with error handling
echo "🔍 Listing existing R2 buckets..."
if ! BUCKET_LIST=$(wrangler r2 bucket list --remote 2>&1); then
    print_error "Failed to list R2 buckets. Error: $BUCKET_LIST"
    exit 1
fi
echo "$BUCKET_LIST"

if ! echo "$BUCKET_LIST" | grep -q "$BUCKET_NAME"; then
    print_warning "Bucket $BUCKET_NAME not found. Creating..."
    if ! wrangler r2 bucket create "$BUCKET_NAME" --remote 2>&1; then
        print_error "Failed to create R2 bucket: $BUCKET_NAME"
        exit 1
    fi
    print_success "Created R2 bucket: $BUCKET_NAME"
else
    print_success "R2 bucket exists: $BUCKET_NAME"
fi

# Upload catalog.json
print_step "Uploading catalog.json..."
echo "🔍 Uploading: assets/catalog.json → $BUCKET_NAME/catalog.json"
if ! wrangler r2 object put "$BUCKET_NAME/catalog.json" --file="assets/catalog.json" --content-type="application/json" --remote 2>&1; then
    print_error "Failed to upload catalog.json"
    exit 1
fi
print_success "Uploaded catalog.json to remote R2 bucket"

# Verify upload
print_step "Verifying catalog upload..."
if wrangler r2 object get "$BUCKET_NAME/catalog.json" --file="/tmp/catalog-verify.json" --remote 2>/dev/null; then
    UPLOADED_SIZE=$(wc -c < /tmp/catalog-verify.json)
    ORIGINAL_SIZE=$(wc -c < assets/catalog.json)
    if [ "$UPLOADED_SIZE" -eq "$ORIGINAL_SIZE" ]; then
        print_success "Catalog verified: $UPLOADED_SIZE bytes"
    else
        print_warning "Size mismatch: original $ORIGINAL_SIZE bytes, uploaded $UPLOADED_SIZE bytes"
    fi
    rm -f /tmp/catalog-verify.json
else
    print_warning "Could not verify catalog upload"
fi

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
                
                echo "🔍 Uploading: $svg_file → $BUCKET_NAME/$remote_path"
                if ! wrangler r2 object put "$BUCKET_NAME/$remote_path" --file="$svg_file" --content-type="image/svg+xml" --remote 2>&1; then
                    print_error "Failed to upload: $svg_file"
                    exit 1
                fi
                
                CURRENT=$((CURRENT + 1))
                echo -ne "\rUploading logos... $CURRENT/$TOTAL_LOGOS"
            fi
        done
    fi
done

echo ""
print_success "Uploaded $TOTAL_LOGOS logo assets"

# Test CDN endpoints
print_step "Testing CDN endpoints..."

# Wait a moment for any propagation
sleep 3

# Test catalog endpoint
CATALOG_ACCESSIBLE=false
LOGO_ACCESSIBLE=false

if curl -f -s "$CDN_URL/catalog.json" > /dev/null 2>&1; then
    print_success "✅ Catalog endpoint accessible: $CDN_URL/catalog.json"
    CATALOG_ACCESSIBLE=true
else
    print_warning "⚠️  Catalog endpoint not accessible: $CDN_URL/catalog.json"
fi

# Test a sample logo
if curl -f -s "$CDN_URL/logos/github/logo.svg" > /dev/null 2>&1; then
    print_success "✅ Sample logo accessible: $CDN_URL/logos/github/logo.svg"
    LOGO_ACCESSIBLE=true
else
    print_warning "⚠️  Sample logo not accessible: $CDN_URL/logos/github/logo.svg"
fi

# Show configuration guidance only if endpoints are not working
if [ "$CATALOG_ACCESSIBLE" = false ] || [ "$LOGO_ACCESSIBLE" = false ]; then
    echo ""
    print_warning "CDN endpoints not fully accessible. Please verify Cloudflare configuration:"
    echo "1. 🌐 Custom domain '$CDN_URL' pointing to R2 bucket '$BUCKET_NAME'"
    echo "2. 🔒 Bucket set to public read access"
    echo "3. ⚡ Caching rules configured for performance"
    echo "4. 🔧 CORS headers set if needed for cross-origin requests"
    echo ""
    echo "📖 Reference: https://developers.cloudflare.com/r2/buckets/public-buckets/"
else
    print_success "🌐 CDN endpoints are fully accessible!"
fi

print_success "🎉 CDN deployment completed!"
echo ""
echo "📊 Deployment Summary:"
echo "   CDN URL: $CDN_URL"
echo "   R2 Bucket: $BUCKET_NAME"
echo "   Assets: $TOTAL_LOGOS logos + catalog.json"
echo "   Environment: $ENVIRONMENT"
echo ""

if [ "$CATALOG_ACCESSIBLE" = true ] && [ "$LOGO_ACCESSIBLE" = true ]; then
    print_success "✅ CDN is fully operational and serving assets!"
    echo "🧪 Test your endpoints:"
    echo "   📄 Catalog: $CDN_URL/catalog.json"
    echo "   🎨 Sample Logo: $CDN_URL/logos/github/logo.svg"
else
    echo "🔧 Next Steps:"
    echo "1. 🧪 Test endpoints: $CDN_URL/catalog.json"
    echo "2. 🔍 Check Cloudflare dashboard if endpoints don't work"
    echo "3. ✅ Verify R2 bucket public access settings"
fi