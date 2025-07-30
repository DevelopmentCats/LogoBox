/**
 * Package Publication Integration Tests
 * Tests the package configuration and publication readiness
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const PACKAGE_ROOT = join(process.cwd());

describe('Package Publication Configuration', () => {
  describe('Package.json Configuration', () => {
    it('should have proper exports configuration', () => {
      const packageJsonPath = join(PACKAGE_ROOT, 'package.json');
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
      
      // Validate main export fields
      expect(packageJson.main).toBe('./dist/index.cjs');
      expect(packageJson.module).toBe('./dist/index.js');
      expect(packageJson.types).toBe('./dist/index.d.ts');
      
      // Validate exports configuration
      expect(packageJson.exports).toBeDefined();
      expect(packageJson.exports['.']).toBeDefined();
      expect(packageJson.exports['.'].types).toBe('./dist/index.d.ts');
      expect(packageJson.exports['.'].import).toBe('./dist/index.js');
      expect(packageJson.exports['.'].require).toBe('./dist/index.cjs');
      expect(packageJson.exports['.'].default).toBe('./dist/index.js');
    });

    it('should have proper TypeScript declarations configuration', () => {
      const packageJsonPath = join(PACKAGE_ROOT, 'package.json');
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
      
      // Validate TypeScript support
      expect(packageJson.types).toBe('./dist/index.d.ts');
      expect(packageJson.exports['.'].types).toBe('./dist/index.d.ts');
      
      // Validate TypeScript is in devDependencies
      expect(packageJson.devDependencies.typescript).toBeDefined();
    });

    it('should have proper files configuration for publication', () => {
      const packageJsonPath = join(PACKAGE_ROOT, 'package.json');
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
      
      // Validate files array includes necessary files
      expect(packageJson.files).toContain('dist/**/*');
      expect(packageJson.files).toContain('data/**/*');
      expect(packageJson.files).toContain('README.md');
      expect(packageJson.files).toContain('CHANGELOG.md');
      expect(packageJson.files).toContain('LICENSE');
    });

    it('should have proper publication scripts', () => {
      const packageJsonPath = join(PACKAGE_ROOT, 'package.json');
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
      
      // Validate publication scripts exist
      expect(packageJson.scripts['publish:dry']).toBeDefined();
      expect(packageJson.scripts['publish:patch']).toBeDefined();
      expect(packageJson.scripts['publish:minor']).toBeDefined();
      expect(packageJson.scripts['publish:major']).toBeDefined();
      
      // Validate version scripts exist
      expect(packageJson.scripts['version:patch']).toBeDefined();
      expect(packageJson.scripts['version:minor']).toBeDefined();
      expect(packageJson.scripts['version:major']).toBeDefined();
      
      // Validate build and test scripts
      expect(packageJson.scripts.build).toBeDefined();
      expect(packageJson.scripts.test).toBeDefined();
      expect(packageJson.scripts.lint).toBeDefined();
      expect(packageJson.scripts.typecheck).toBeDefined();
    });

    it('should have proper NPM publication configuration', () => {
      const packageJsonPath = join(PACKAGE_ROOT, 'package.json');
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
      
      // Validate publication config
      expect(packageJson.publishConfig).toBeDefined();
      expect(packageJson.publishConfig.access).toBe('public');
      expect(packageJson.publishConfig.registry).toBe('https://registry.npmjs.org/');
      
      // Validate repository information
      expect(packageJson.repository).toBeDefined();
      expect(packageJson.repository.type).toBe('git');
      expect(packageJson.repository.url).toBeDefined();
      
      // Validate metadata
      expect(packageJson.name).toBe('logobox');
      expect(packageJson.description).toBeDefined();
      expect(packageJson.keywords).toBeDefined();
      expect(packageJson.license).toBe('MIT');
    });
  });

  describe('TypeScript Configuration', () => {
    it('should have proper tsconfig.json for declarations', () => {
      const tsconfigPath = join(PACKAGE_ROOT, 'tsconfig.json');
      expect(existsSync(tsconfigPath)).toBe(true);
      
      const tsconfig = JSON.parse(readFileSync(tsconfigPath, 'utf8'));
      
      // Validate declaration generation is enabled
      expect(tsconfig.compilerOptions.declaration).toBe(true);
      expect(tsconfig.compilerOptions.outDir).toBe('./dist');
      expect(tsconfig.compilerOptions.rootDir).toBe('./src');
    });

    it('should have proper tsup configuration for building', () => {
      const tsupConfigPath = join(PACKAGE_ROOT, 'tsup.config.ts');
      expect(existsSync(tsupConfigPath)).toBe(true);
      
      const tsupConfig = readFileSync(tsupConfigPath, 'utf8');
      
      // Validate tsup generates both CJS and ESM
      expect(tsupConfig).toContain("format: ['cjs', 'esm']");
      expect(tsupConfig).toContain('dts: true');
    });
  });

  describe('Build Scripts Configuration', () => {
    it('should have comprehensive build script', () => {
      const buildScriptPath = join(PACKAGE_ROOT, 'scripts', 'build.js');
      expect(existsSync(buildScriptPath)).toBe(true);
      
      const buildScript = readFileSync(buildScriptPath, 'utf8');
      
      // Validate build script includes necessary steps
      expect(buildScript).toContain('typecheck');
      expect(buildScript).toContain('lint');
      expect(buildScript).toContain('tsup');
      expect(buildScript).toContain('build-info.json');
    });

    it('should have publication script with proper workflow', () => {
      const publishScriptPath = join(PACKAGE_ROOT, 'scripts', 'publish.js');
      expect(existsSync(publishScriptPath)).toBe(true);
      
      const publishScript = readFileSync(publishScriptPath, 'utf8');
      
      // Validate publication workflow
      expect(publishScript).toContain('npm run test:unit');
      expect(publishScript).toContain('node scripts/build.js');
      expect(publishScript).toContain('npm version');
      expect(publishScript).toContain('npm publish');
      expect(publishScript).toContain('--dry-run');
    });

    it('should have version management script', () => {
      const versionScriptPath = join(PACKAGE_ROOT, 'scripts', 'version.js');
      expect(existsSync(versionScriptPath)).toBe(true);
      
      const versionScript = readFileSync(versionScriptPath, 'utf8');
      
      // Validate version management features
      expect(versionScript).toContain('major');
      expect(versionScript).toContain('minor');
      expect(versionScript).toContain('patch');
      expect(versionScript).toContain('CHANGELOG.md');
    });

    it('should have publication testing script', () => {
      const testPublicationPath = join(PACKAGE_ROOT, 'scripts', 'test-publication.js');
      expect(existsSync(testPublicationPath)).toBe(true);
      
      const testScript = readFileSync(testPublicationPath, 'utf8');
      
      // Validate publication testing
      expect(testScript).toContain('npm pack');
      expect(testScript).toContain('npm install');
      expect(testScript).toContain('require(\'logobox\')');
      expect(testScript).toContain('import { logobox, LogoBoxAPI, LogoBoxError }');
    });
  });

  describe('Automated Publishing Configuration', () => {
    it('should have GitHub Actions workflow for NPM publishing', () => {
      const workflowPath = join(PACKAGE_ROOT, '..', '.github', 'workflows', 'publish-npm-package.yml');
      expect(existsSync(workflowPath)).toBe(true);
      
      const workflow = readFileSync(workflowPath, 'utf8');
      
      // Validate workflow triggers
      expect(workflow).toContain('workflow_run');
      expect(workflow).toContain('workflow_dispatch');
      
      // Validate workflow steps
      expect(workflow).toContain('npm ci');
      expect(workflow).toContain('npm run build');
      expect(workflow).toContain('npm run test');
      expect(workflow).toContain('npm publish');
      expect(workflow).toContain('NODE_AUTH_TOKEN');
    });

    it('should have proper workflow triggers for catalog updates', () => {
      const workflowPath = join(PACKAGE_ROOT, '..', '.github', 'workflows', 'publish-npm-package.yml');
      const workflow = readFileSync(workflowPath, 'utf8');
      
      // Validate automated publishing on asset processing completion
      expect(workflow).toContain('Asset Processing Pipeline');
      expect(workflow).toContain('workflow_run');
      expect(workflow).toContain('types:');
      expect(workflow).toContain('completed');
    });
  });

  describe('Integration Test Coverage', () => {
    it('should have comprehensive integration tests for published package', () => {
      const integrationTestPath = join(PACKAGE_ROOT, 'tests', 'integration', 'published-package.test.js');
      expect(existsSync(integrationTestPath)).toBe(true);
      
      const integrationTest = readFileSync(integrationTestPath, 'utf8');
      
      // Validate test coverage
      expect(integrationTest).toContain('Package Installation');
      expect(integrationTest).toContain('CommonJS Module Support');
      expect(integrationTest).toContain('ES Module Support');
      expect(integrationTest).toContain('TypeScript Integration');
      expect(integrationTest).toContain('Cross-Environment Compatibility');
    });

    it('should test both CJS and ESM module formats', () => {
      const integrationTestPath = join(PACKAGE_ROOT, 'tests', 'integration', 'published-package.test.js');
      const integrationTest = readFileSync(integrationTestPath, 'utf8');
      
      // Validate module format testing
      expect(integrationTest).toContain('require(\'logobox\')');
      expect(integrationTest).toContain('import { LogoBoxAPI, logobox }');
      expect(integrationTest).toContain('type: "module"');
    });

    it('should test TypeScript declarations functionality', () => {
      const integrationTestPath = join(PACKAGE_ROOT, 'tests', 'integration', 'published-package.test.js');
      const integrationTest = readFileSync(integrationTestPath, 'utf8');
      
      // Validate TypeScript testing
      expect(integrationTest).toContain('TypeScript');
      expect(integrationTest).toContain('npx tsc');
      expect(integrationTest).toContain('LogoBoxAPI');
      expect(integrationTest).toContain('LogoSearchQuery');
    });
  });
});

describe('Publication Readiness Validation', () => {
  it('should have all required files for publication', () => {
    const requiredFiles = [
      'package.json',
      'tsconfig.json',
      'tsup.config.ts',
      'scripts/build.js',
      'scripts/publish.js',
      'scripts/version.js',
      'scripts/test-publication.js',
      'tests/integration/published-package.test.js'
    ];
    
    for (const file of requiredFiles) {
      const filePath = join(PACKAGE_ROOT, file);
      expect(existsSync(filePath)).toBe(true);
    }
  });

  it('should have proper package metadata for NPM', () => {
    const packageJsonPath = join(PACKAGE_ROOT, 'package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
    
    // Validate required NPM fields
    expect(packageJson.name).toBe('logobox');
    expect(packageJson.version).toMatch(/^\d+\.\d+\.\d+/);
    expect(packageJson.description).toBeDefined();
    expect(packageJson.keywords).toBeDefined();
    expect(packageJson.author).toBeDefined();
    expect(packageJson.license).toBe('MIT');
    expect(packageJson.repository).toBeDefined();
    expect(packageJson.bugs).toBeDefined();
    expect(packageJson.homepage).toBeDefined();
  });

  it('should have automated publishing workflow configured', () => {
    const workflowPath = join(PACKAGE_ROOT, '..', '.github', 'workflows', 'publish-npm-package.yml');
    expect(existsSync(workflowPath)).toBe(true);
    
    const workflow = readFileSync(workflowPath, 'utf8');
    
    // Validate automated publishing is properly configured
    expect(workflow).toContain('name: Publish NPM Package');
    expect(workflow).toContain('npm publish --access public');
    expect(workflow).toContain('NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}');
  });
});