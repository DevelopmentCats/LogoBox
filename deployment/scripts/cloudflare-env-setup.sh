#!/bin/bash

# Cloudflare Pages Environment Variables Setup Script
# This script helps configure and validate environment variables for LogoBox deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
ENV_TEMPLATE="$PROJECT_ROOT/.env.example"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to print section headers
print_section() {
    echo
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================${NC}"
    echo
}

# Function to validate URL format
validate_url() {
    local url="$1"
    local name="$2"
    
    if [[ $url =~ ^https?:// ]]; then
        print_success "$name URL format is valid: $url"
        return 0
    else
        print_error "$name URL format is invalid: $url"
        return 1
    fi
}

# Function to test URL accessibility
test_url_accessibility() {
    local url="$1"
    local name="$2"
    
    print_status "Testing accessibility of $name: $url"
    
    if curl -f -s --max-time 10 "$url" > /dev/null 2>&1; then
        print_success "$name is accessible"
        return 0
    else
        print_warning "$name is not accessible (this may be expected for new deployments)"
        return 1
    fi
}

# Function to validate environment variable
validate_env_var() {
    local var_name="$1"
    local var_value="$2"
    local var_type="$3"
    
    case $var_type in
        "url")
            validate_url "$var_value" "$var_name"
            ;;
        "number")
            if [[ $var_value =~ ^[0-9]+$ ]]; then
                print_success "$var_name is a valid number: $var_value"
            else
                print_error "$var_name is not a valid number: $var_value"
                return 1
            fi
            ;;
        "boolean")
            if [[ $var_value =~ ^(true|false)$ ]]; then
                print_success "$var_name is a valid boolean: $var_value"
            else
                print_error "$var_name is not a valid boolean: $var_value"
                return 1
            fi
            ;;
        "log_level")
            if [[ $var_value =~ ^(debug|info|warn|error)$ ]]; then
                print_success "$var_name is a valid log level: $var_value"
            else
                print_error "$var_name is not a valid log level: $var_value"
                return 1
            fi
            ;;
        *)
            print_success "$var_name is set: $var_value"
            ;;
    esac
}

# Function to generate environment variables for Cloudflare Pages
generate_cloudflare_env_vars() {
    local environment="$1"
    
    print_section "Environment Variables for Cloudflare Pages ($environment)"
    
    if [[ "$environment" == "production" ]]; then
        cat << 'EOF'
# Production Environment Variables for Cloudflare Pages
# Copy these to your Cloudflare Pages dashboard under Settings > Environment variables > Production

VITE_APP_TITLE=LogoBox
VITE_APP_DESCRIPTION=Browse and discover high-quality logos and icons
VITE_API_BASE_URL=https://api.logobox.dev
VITE_CDN_BASE_URL=https://cdn.logobox.dev
VITE_CATALOG_PATH=/catalog.json
VITE_LOGOS_PATH=/logos
VITE_CDN_FALLBACK_URL_1=https://backup-cdn1.logobox.dev
VITE_CDN_FALLBACK_URL_2=https://backup-cdn2.logobox.dev
VITE_API_TIMEOUT=15000
VITE_API_RETRY_ATTEMPTS=3
VITE_API_RETRY_DELAY=2000
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_PERFORMANCE_MONITORING=false
VITE_LOG_LEVEL=warn
LOGOBOX_BASE_URL=https://logobox.dev
LOGOBOX_CDN_BASE_URL=https://cdn.logobox.dev
LOGOBOX_DEFAULT_VARIANT=original
LOGOBOX_CACHE_ENABLED=true
LOGOBOX_CACHE_TTL=3600000
LOGOBOX_API_BASE_URL=https://api.logobox.dev
EOF
    else
        cat << 'EOF'
# Preview Environment Variables for Cloudflare Pages
# Copy these to your Cloudflare Pages dashboard under Settings > Environment variables > Preview

VITE_APP_TITLE=LogoBox (Preview)
VITE_APP_DESCRIPTION=Browse and discover high-quality logos and icons - Preview Environment
VITE_API_BASE_URL=https://api.logobox.dev
VITE_CDN_BASE_URL=https://cdn.logobox.dev
VITE_CATALOG_PATH=/catalog.json
VITE_LOGOS_PATH=/logos
VITE_CDN_FALLBACK_URL_1=https://backup-cdn1.logobox.dev
VITE_CDN_FALLBACK_URL_2=https://backup-cdn2.logobox.dev
VITE_API_TIMEOUT=10000
VITE_API_RETRY_ATTEMPTS=2
VITE_API_RETRY_DELAY=1000
VITE_ENABLE_ANALYTICS=false
VITE_ENABLE_PERFORMANCE_MONITORING=true
VITE_LOG_LEVEL=debug
LOGOBOX_BASE_URL=https://logobox.dev
LOGOBOX_CDN_BASE_URL=https://cdn.logobox.dev
LOGOBOX_DEFAULT_VARIANT=original
LOGOBOX_CACHE_ENABLED=true
LOGOBOX_CACHE_TTL=1800000
LOGOBOX_API_BASE_URL=https://api.logobox.dev
EOF
    fi
}

# Function to validate current environment
validate_current_environment() {
    print_section "Validating Current Environment Variables"
    
    local errors=0
    
    # Define required variables with their types
    declare -A required_vars=(
        ["VITE_APP_TITLE"]="string"
        ["VITE_APP_DESCRIPTION"]="string"
        ["VITE_API_BASE_URL"]="url"
        ["VITE_CDN_BASE_URL"]="url"
        ["VITE_CATALOG_PATH"]="string"
        ["VITE_LOGOS_PATH"]="string"
        ["VITE_API_TIMEOUT"]="number"
        ["VITE_API_RETRY_ATTEMPTS"]="number"
        ["VITE_API_RETRY_DELAY"]="number"
        ["VITE_ENABLE_ANALYTICS"]="boolean"
        ["VITE_ENABLE_PERFORMANCE_MONITORING"]="boolean"
        ["VITE_LOG_LEVEL"]="log_level"
        ["LOGOBOX_BASE_URL"]="url"
        ["LOGOBOX_CDN_BASE_URL"]="url"
        ["LOGOBOX_DEFAULT_VARIANT"]="string"
        ["LOGOBOX_CACHE_ENABLED"]="boolean"
        ["LOGOBOX_CACHE_TTL"]="number"
        ["LOGOBOX_API_BASE_URL"]="url"
    )
    
    for var_name in "${!required_vars[@]}"; do
        var_value="${!var_name}"
        var_type="${required_vars[$var_name]}"
        
        if [[ -z "$var_value" ]]; then
            print_error "Required environment variable $var_name is not set"
            ((errors++))
        else
            if ! validate_env_var "$var_name" "$var_value" "$var_type"; then
                ((errors++))
            fi
        fi
    done
    
    if [[ $errors -eq 0 ]]; then
        print_success "All environment variables are valid!"
    else
        print_error "Found $errors environment variable issues"
        return 1
    fi
}

# Function to test API connectivity
test_api_connectivity() {
    print_section "Testing API Connectivity"
    
    local api_base_url="${VITE_API_BASE_URL:-https://api.logobox.dev}"
    local cdn_base_url="${VITE_CDN_BASE_URL:-https://cdn.logobox.dev}"
    local catalog_path="${VITE_CATALOG_PATH:-/catalog.json}"
    
    # Test API endpoint
    test_url_accessibility "$api_base_url" "API Base URL"
    
    # Test CDN endpoint
    test_url_accessibility "$cdn_base_url" "CDN Base URL"
    
    # Test catalog endpoint
    test_url_accessibility "$cdn_base_url$catalog_path" "Catalog JSON"
    
    # Test fallback URLs if set
    if [[ -n "${VITE_CDN_FALLBACK_URL_1}" ]]; then
        test_url_accessibility "$VITE_CDN_FALLBACK_URL_1" "CDN Fallback URL 1"
    fi
    
    if [[ -n "${VITE_CDN_FALLBACK_URL_2}" ]]; then
        test_url_accessibility "$VITE_CDN_FALLBACK_URL_2" "CDN Fallback URL 2"
    fi
}

# Function to show usage
show_usage() {
    cat << EOF
Usage: $0 [COMMAND]

Commands:
    generate-production     Generate production environment variables
    generate-preview        Generate preview environment variables
    validate               Validate current environment variables
    test-connectivity      Test API and CDN connectivity
    help                   Show this help message

Examples:
    $0 generate-production    # Generate production env vars for Cloudflare Pages
    $0 generate-preview       # Generate preview env vars for Cloudflare Pages
    $0 validate              # Validate current environment
    $0 test-connectivity     # Test API/CDN connectivity

EOF
}

# Main script logic
main() {
    local command="${1:-help}"
    
    case "$command" in
        "generate-production")
            generate_cloudflare_env_vars "production"
            ;;
        "generate-preview")
            generate_cloudflare_env_vars "preview"
            ;;
        "validate")
            validate_current_environment
            ;;
        "test-connectivity")
            test_api_connectivity
            ;;
        "help"|"--help"|"-h")
            show_usage
            ;;
        *)
            print_error "Unknown command: $command"
            echo
            show_usage
            exit 1
            ;;
    esac
}

# Check if script is being sourced or executed
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi