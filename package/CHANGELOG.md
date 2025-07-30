# Changelog

All notable changes to the LogoBox NPM package will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial package release
- Complete TypeScript support with comprehensive type definitions
- Dual module support (ESM and CommonJS)
- Advanced search functionality with text, category, and tag filtering
- Logo URL generation with multiple variants (original, white, black)
- Built-in caching for improved performance
- Comprehensive error handling with custom error types
- Support for all modern JavaScript environments

### Features
- `logobox` main instance for simple operations
- `LogoBoxAPI` class for advanced usage
- Search methods: `searchText()`, `search()`, `getBySlug()`, `getByCategory()`, `getByTags()`
- Metadata methods: `getAllCategories()`, `getAllTags()`
- URL generation: `getLogoUrl()` with variant support
- Configuration: `configure()` for customizing behavior
- Caching system with configurable TTL
- Custom error types with detailed error codes

### Technical
- Built with TypeScript 5.0+
- Bundled with tsup for optimal output
- Comprehensive test suite with unit and integration tests
- Automated publication workflow
- CDN-optimized asset delivery
- Node.js 16+ compatibility
- Modern ES2020 target

## [1.0.0] - TBD

Initial release of the LogoBox NPM package.