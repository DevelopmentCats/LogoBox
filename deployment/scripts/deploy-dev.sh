#!/bin/bash

# Development deployment script for LogoBox
# This script handles the deployment of the development branch to dev.logobox.dev

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="logobox-dev"
ENVIRONMENT="development"
DOMAIN="dev.logobox.dev"
BUILD_DIR="logobox/website/dist"

echo -e "${BLUE}🚀 Starting LogoBox Development Deployment${NC}"
echo -e "${BLUE}Project: ${PROJECT_NAME}${NC}"
echo -e "${BLUE}Environment: ${ENVIRONMENT}${NC}"
echo -e "${BLUE}Domain: ${DOMAIN}${NC}"
echo ""

# Check if we're in the right directory
if [ ! -f "logobox/package.json" ]; then
    echo -e "${RED}❌ Error: Must be run from the repository root${NC}"
    exit 1
fi

# Check if required environment variables are set
if [ -z "$CLOUDFLARE_API_TOKEN" ] || [ -z "$CLOUDFLARE_ACCOUNT_ID" ]; then
    echo -e "${RED}❌ Error: CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID must be set${NC}"
    echo -e "${YELLOW}💡 Set them in your environment or GitHub secrets${NC}"
    exit 1
fi

# Check if we're on the development branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "development" ]; then
    echo -e "${YELLOW}⚠️  Warning: Not on development branch (current: ${CURRENT_BRANCH})${NC}"
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${RED}❌ Deployment cancelled${NC}"
        exit 1
    fi
fi

# Install dependencies
echo -e "${BLUE}📦 Installing dependencies...${NC}"
cd logobox
npm ci

# Run environment check
echo -e "${BLUE}🔍 Running environment check...${NC}"
npm run env-check

# Run tests (optional, can be skipped with --skip-tests)
if [[ "$1" != "--skip-tests" ]]; then
    echo -e "${BLUE}🧪 Running tests...${NC}"
    npm run test:unit
    npm run test:integration
    
    cd website
    npm run test:unit
    cd ..
    
    cd package
    npm run test:unit
    cd ..
fi

# Validate metadata
echo -e "${BLUE}✅ Validating metadata...${NC}"
npm run validate-metadata

# Generate logo variants
echo -e "${BLUE}🎨 Generating logo variants...${NC}"
npm run generate-variants

# Optimize assets
echo -e "${BLUE}⚡ Optimizing assets...${NC}"
npm run optimize-assets

# Build catalog
echo -e "${BLUE}📚 Building catalog...${NC}"
npm run build-catalog

# Deploy assets to CDN (R2)
echo -e "${BLUE}🚀 Deploying assets to CDN...${NC}"
cd ..
chmod +x ./deployment/scripts/deploy-cdn.sh
./deployment/scripts/deploy-cdn.sh dev
cd logobox

# Build website
echo -e "${BLUE}🏗️  Building website for development...${NC}"
export NODE_ENV=development
export VITE_ENVIRONMENT=development
export VITE_BUILD_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
export VITE_COMMIT_SHA=$(git rev-parse HEAD)
export VITE_GITHUB_REPO="DevelopmentCats/LogoBox"

npm run build --workspace=website

# Copy development-specific configuration files
echo -e "${BLUE}📋 Copying development configuration...${NC}"
cp deployment/cloudflare/_redirects.dev website/dist/_redirects
cp deployment/cloudflare/wrangler.dev.toml wrangler.toml

# Deploy to Cloudflare Pages
echo -e "${BLUE}🌐 Deploying to Cloudflare Pages...${NC}"
cd ..

# Install wrangler if not present
if ! command -v wrangler &> /dev/null; then
    echo -e "${YELLOW}📦 Installing Wrangler...${NC}"
    npm install -g wrangler
fi

# Deploy using wrangler
wrangler pages deploy ${BUILD_DIR} \
    --project-name=${PROJECT_NAME} \
    --compatibility-date=2024-01-01

echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
echo ""
echo -e "${GREEN}🎉 Development site is now live at: https://${DOMAIN}${NC}"
echo -e "${BLUE}📊 Build Information:${NC}"
echo -e "${BLUE}  - Environment: ${ENVIRONMENT}${NC}"
echo -e "${BLUE}  - Commit: $(git rev-parse --short HEAD)${NC}"
echo -e "${BLUE}  - Branch: $(git branch --show-current)${NC}"
echo -e "${BLUE}  - Build Time: $(date -u +"%Y-%m-%dT%H:%M:%SZ")${NC}"
echo ""

# Run smoke tests
echo -e "${BLUE}🔍 Running smoke tests...${NC}"
sleep 10  # Wait for propagation

# Test main page
if curl -f -s https://${DOMAIN}/ > /dev/null; then
    echo -e "${GREEN}✅ Main page accessible${NC}"
else
    echo -e "${RED}❌ Main page not accessible${NC}"
fi

# Test catalog
if curl -f -s https://${DOMAIN}/catalog.json > /dev/null; then
    echo -e "${GREEN}✅ Catalog accessible${NC}"
else
    echo -e "${RED}❌ Catalog not accessible${NC}"
fi

# Test sample logo
if curl -f -s https://${DOMAIN}/logos/github/logo.svg > /dev/null; then
    echo -e "${GREEN}✅ Sample logo accessible${NC}"
else
    echo -e "${RED}❌ Sample logo not accessible${NC}"
fi

echo ""
echo -e "${GREEN}🎊 Development deployment complete!${NC}"
echo -e "${BLUE}Visit your development site: https://${DOMAIN}${NC}"