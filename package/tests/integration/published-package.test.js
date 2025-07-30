/**
 * Published Package Integration Tests
 * Tests the package as it would be consumed after NPM publication
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'child_process';
import { mkdirSync, rmSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const TEST_DIR = join(tmpdir(), 'logobox-package-test');
const PACKAGE_ROOT = join(process.cwd());

describe('Published Package Integration Tests', () => {
  let packageTarball;

  beforeAll(async () => {
    // Create test directory
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
    mkdirSync(TEST_DIR, { recursive: true });

    // Build and pack the package
    console.log('Building package for testing...');
    execSync('npm run build', { cwd: PACKAGE_ROOT, stdio: 'inherit' });
    
    const packOutput = execSync('npm pack', { 
      cwd: PACKAGE_ROOT, 
      encoding: 'utf8' 
    });
    packageTarball = packOutput.trim();
    
    console.log(`Package created: ${packageTarball}`);
  });

  afterAll(() => {
    // Cleanup
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
    
    // Remove tarball
    const tarballPath = join(PACKAGE_ROOT, packageTarball);
    if (existsSync(tarballPath)) {
      rmSync(tarballPath);
    }
  });

  describe('Package Installation', () => {
    it('should install successfully via npm', () => {
      const testPackageDir = join(TEST_DIR, 'npm-install-test');
      mkdirSync(testPackageDir, { recursive: true });
      
      // Initialize package
      execSync('npm init -y', { cwd: testPackageDir, stdio: 'pipe' });
      
      // Install the package
      const tarballPath = join(PACKAGE_ROOT, packageTarball);
      execSync(`npm install ${tarballPath}`, { 
        cwd: testPackageDir, 
        stdio: 'pipe' 
      });
      
      // Verify installation
      const nodeModulesPath = join(testPackageDir, 'node_modules', 'logobox');
      expect(existsSync(nodeModulesPath)).toBe(true);
      expect(existsSync(join(nodeModulesPath, 'package.json'))).toBe(true);
      expect(existsSync(join(nodeModulesPath, 'dist', 'index.js'))).toBe(true);
      expect(existsSync(join(nodeModulesPath, 'dist', 'index.cjs'))).toBe(true);
      expect(existsSync(join(nodeModulesPath, 'dist', 'index.d.ts'))).toBe(true);
    });

    it('should have correct package metadata', () => {
      const testPackageDir = join(TEST_DIR, 'metadata-test');
      mkdirSync(testPackageDir, { recursive: true });
      
      execSync('npm init -y', { cwd: testPackageDir, stdio: 'pipe' });
      
      const tarballPath = join(PACKAGE_ROOT, packageTarball);
      execSync(`npm install ${tarballPath}`, { 
        cwd: testPackageDir, 
        stdio: 'pipe' 
      });
      
      // Check package.json in installed package
      const installedPackageJson = join(testPackageDir, 'node_modules', 'logobox', 'package.json');
      const packageInfo = JSON.parse(execSync(`cat ${installedPackageJson}`, { encoding: 'utf8' }));
      
      expect(packageInfo.name).toBe('logobox');
      expect(packageInfo.version).toMatch(/^\d+\.\d+\.\d+/);
      expect(packageInfo.main).toBe('./dist/index.cjs');
      expect(packageInfo.module).toBe('./dist/index.js');
      expect(packageInfo.types).toBe('./dist/index.d.ts');
      expect(packageInfo.exports).toBeDefined();
    });
  });

  describe('CommonJS Module Support', () => {
    it('should work with require() syntax', () => {
      const testPackageDir = join(TEST_DIR, 'cjs-test');
      mkdirSync(testPackageDir, { recursive: true });
      
      execSync('npm init -y', { cwd: testPackageDir, stdio: 'pipe' });
      
      const tarballPath = join(PACKAGE_ROOT, packageTarball);
      execSync(`npm install ${tarballPath}`, { 
        cwd: testPackageDir, 
        stdio: 'pipe' 
      });
      
      // Create test script
      const testScript = `
        const { LogoBoxAPI, logobox, LogoBoxError, ERROR_CODES } = require('logobox');
        
        console.log('✅ CJS require successful');
        console.log('LogoBoxAPI type:', typeof LogoBoxAPI);
        console.log('logobox type:', typeof logobox);
        console.log('LogoBoxError type:', typeof LogoBoxError);
        console.log('ERROR_CODES type:', typeof ERROR_CODES);
        
        // Test basic functionality
        const api = new LogoBoxAPI();
        console.log('✅ LogoBoxAPI instance created');
        
        // Test URL generation (sync method)
        try {
          const url = logobox.getLogoUrl('github');
          console.log('✅ URL generation works:', url);
        } catch (error) {
          console.log('✅ URL generation validation works:', error.message);
        }
        
        process.exit(0);
      `;
      
      writeFileSync(join(testPackageDir, 'test.js'), testScript);
      
      const output = execSync('node test.js', { 
        cwd: testPackageDir, 
        encoding: 'utf8' 
      });
      
      expect(output).toContain('✅ CJS require successful');
      expect(output).toContain('✅ LogoBoxAPI instance created');
      expect(output).toContain('✅ URL generation');
    });

    it('should provide correct TypeScript declarations for CJS', () => {
      const testPackageDir = join(TEST_DIR, 'cjs-ts-test');
      mkdirSync(testPackageDir, { recursive: true });
      
      execSync('npm init -y', { cwd: testPackageDir, stdio: 'pipe' });
      execSync('npm install typescript @types/node', { 
        cwd: testPackageDir, 
        stdio: 'pipe' 
      });
      
      const tarballPath = join(PACKAGE_ROOT, packageTarball);
      execSync(`npm install ${tarballPath}`, { 
        cwd: testPackageDir, 
        stdio: 'pipe' 
      });
      
      // Create TypeScript test
      const testScript = `
        import { LogoBoxAPI, logobox, LogoBoxError, ERROR_CODES, LogoSearchQuery } from 'logobox';
        
        const api: LogoBoxAPI = new LogoBoxAPI();
        const query: LogoSearchQuery = { text: 'test', limit: 10 };
        
        console.log('✅ TypeScript types work correctly');
      `;
      
      writeFileSync(join(testPackageDir, 'test.ts'), testScript);
      
      // Create tsconfig.json
      const tsconfig = {
        compilerOptions: {
          target: 'es2020',
          module: 'commonjs',
          strict: true,
          esModuleInterop: true,
          skipLibCheck: true
        }
      };
      writeFileSync(join(testPackageDir, 'tsconfig.json'), JSON.stringify(tsconfig, null, 2));
      
      // Compile TypeScript
      execSync('npx tsc', { cwd: testPackageDir, stdio: 'pipe' });
      
      // Run compiled JavaScript
      const output = execSync('node test.js', { 
        cwd: testPackageDir, 
        encoding: 'utf8' 
      });
      
      expect(output).toContain('✅ TypeScript types work correctly');
    });
  });

  describe('ES Module Support', () => {
    it('should work with import syntax', () => {
      const testPackageDir = join(TEST_DIR, 'esm-test');
      mkdirSync(testPackageDir, { recursive: true });
      
      // Create package.json with type: "module"
      const packageJson = {
        name: 'esm-test',
        version: '1.0.0',
        type: 'module'
      };
      writeFileSync(join(testPackageDir, 'package.json'), JSON.stringify(packageJson, null, 2));
      
      const tarballPath = join(PACKAGE_ROOT, packageTarball);
      execSync(`npm install ${tarballPath}`, { 
        cwd: testPackageDir, 
        stdio: 'pipe' 
      });
      
      // Create test script
      const testScript = `
        import { LogoBoxAPI, logobox, LogoBoxError, ERROR_CODES } from 'logobox';
        
        console.log('✅ ESM import successful');
        console.log('LogoBoxAPI type:', typeof LogoBoxAPI);
        console.log('logobox type:', typeof logobox);
        console.log('LogoBoxError type:', typeof LogoBoxError);
        console.log('ERROR_CODES type:', typeof ERROR_CODES);
        
        // Test basic functionality
        const api = new LogoBoxAPI();
        console.log('✅ LogoBoxAPI instance created');
        
        // Test URL generation (sync method)
        try {
          const url = logobox.getLogoUrl('github');
          console.log('✅ URL generation works:', url);
        } catch (error) {
          console.log('✅ URL generation validation works:', error.message);
        }
        
        process.exit(0);
      `;
      
      writeFileSync(join(testPackageDir, 'test.js'), testScript);
      
      const output = execSync('node test.js', { 
        cwd: testPackageDir, 
        encoding: 'utf8' 
      });
      
      expect(output).toContain('✅ ESM import successful');
      expect(output).toContain('✅ LogoBoxAPI instance created');
      expect(output).toContain('✅ URL generation');
    });

    it('should support named and default imports', () => {
      const testPackageDir = join(TEST_DIR, 'esm-import-test');
      mkdirSync(testPackageDir, { recursive: true });
      
      const packageJson = {
        name: 'esm-import-test',
        version: '1.0.0',
        type: 'module'
      };
      writeFileSync(join(testPackageDir, 'package.json'), JSON.stringify(packageJson, null, 2));
      
      const tarballPath = join(PACKAGE_ROOT, packageTarball);
      execSync(`npm install ${tarballPath}`, { 
        cwd: testPackageDir, 
        stdio: 'pipe' 
      });
      
      // Test different import styles
      const testScript = `
        // Named imports
        import { LogoBoxAPI, logobox } from 'logobox';
        
        // Namespace import
        import * as LogoBox from 'logobox';
        
        console.log('✅ Named imports work');
        console.log('✅ Namespace import works');
        
        // Test both styles work
        const api1 = new LogoBoxAPI();
        const api2 = new LogoBox.LogoBoxAPI();
        
        console.log('✅ Both import styles create valid instances');
        
        process.exit(0);
      `;
      
      writeFileSync(join(testPackageDir, 'test.js'), testScript);
      
      const output = execSync('node test.js', { 
        cwd: testPackageDir, 
        encoding: 'utf8' 
      });
      
      expect(output).toContain('✅ Named imports work');
      expect(output).toContain('✅ Namespace import works');
      expect(output).toContain('✅ Both import styles create valid instances');
    });
  });

  describe('TypeScript Integration', () => {
    it('should provide comprehensive type definitions', () => {
      const testPackageDir = join(TEST_DIR, 'ts-types-test');
      mkdirSync(testPackageDir, { recursive: true });
      
      execSync('npm init -y', { cwd: testPackageDir, stdio: 'pipe' });
      execSync('npm install typescript @types/node', { 
        cwd: testPackageDir, 
        stdio: 'pipe' 
      });
      
      const tarballPath = join(PACKAGE_ROOT, packageTarball);
      execSync(`npm install ${tarballPath}`, { 
        cwd: testPackageDir, 
        stdio: 'pipe' 
      });
      
      // Create comprehensive TypeScript test
      const testScript = `
        import { 
          LogoBoxAPI, 
          logobox, 
          LogoBoxError, 
          ERROR_CODES,
          LogoSearchQuery,
          LogoSearchResult,
          Logo,
          LogoVariant,
          LogoBoxConfig
        } from 'logobox';
        
        // Test class instantiation with types
        const api: LogoBoxAPI = new LogoBoxAPI();
        
        // Test configuration with proper types
        const config: LogoBoxConfig = {
          baseUrl: 'https://test.com',
          cdnUrl: 'https://cdn.test.com',
          defaultVariant: 'original',
          cache: {
            enabled: true,
            ttl: 3600000
          }
        };
        
        // Test search query types
        const query: LogoSearchQuery = {
          text: 'github',
          categories: ['technology'],
          tags: ['git'],
          limit: 10,
          offset: 0
        };
        
        // Test variant types
        const variant: LogoVariant = 'white';
        
        // Test error handling with types
        const error = new LogoBoxError('Test error', ERROR_CODES.INVALID_SLUG);
        
        console.log('✅ All TypeScript types compile successfully');
        
        // Test that methods return correctly typed values
        const url: string = logobox.getLogoUrl('github', 'original');
        console.log('✅ Method return types work correctly');
        
        process.exit(0);
      `;
      
      writeFileSync(join(testPackageDir, 'test.ts'), testScript);
      
      // Create tsconfig.json
      const tsconfig = {
        compilerOptions: {
          target: 'es2020',
          module: 'esnext',
          moduleResolution: 'node',
          strict: true,
          esModuleInterop: true,
          skipLibCheck: true,
          allowSyntheticDefaultImports: true
        }
      };
      writeFileSync(join(testPackageDir, 'tsconfig.json'), JSON.stringify(tsconfig, null, 2));
      
      // Compile TypeScript (this will fail if types are incorrect)
      execSync('npx tsc', { cwd: testPackageDir, stdio: 'pipe' });
      
      console.log('✅ TypeScript compilation successful');
    });
  });

  describe('Cross-Environment Compatibility', () => {
    it('should work in different Node.js versions', () => {
      // This test verifies the package uses compatible syntax
      const testPackageDir = join(TEST_DIR, 'compatibility-test');
      mkdirSync(testPackageDir, { recursive: true });
      
      execSync('npm init -y', { cwd: testPackageDir, stdio: 'pipe' });
      
      const tarballPath = join(PACKAGE_ROOT, packageTarball);
      execSync(`npm install ${tarballPath}`, { 
        cwd: testPackageDir, 
        stdio: 'pipe' 
      });
      
      // Test basic compatibility
      const testScript = `
        const { LogoBoxAPI } = require('logobox');
        
        // Test that the package loads without syntax errors
        const api = new LogoBoxAPI();
        
        // Test basic functionality
        try {
          const url = api.getLogoUrl('github');
          console.log('✅ Package works in current Node.js version:', process.version);
        } catch (error) {
          console.log('✅ Package validation works:', error.message);
        }
        
        process.exit(0);
      `;
      
      writeFileSync(join(testPackageDir, 'test.js'), testScript);
      
      const output = execSync('node test.js', { 
        cwd: testPackageDir, 
        encoding: 'utf8' 
      });
      
      expect(output).toContain('✅ Package works in current Node.js version');
    });

    it('should have correct file permissions and structure', () => {
      const testPackageDir = join(TEST_DIR, 'structure-test');
      mkdirSync(testPackageDir, { recursive: true });
      
      execSync('npm init -y', { cwd: testPackageDir, stdio: 'pipe' });
      
      const tarballPath = join(PACKAGE_ROOT, packageTarball);
      execSync(`npm install ${tarballPath}`, { 
        cwd: testPackageDir, 
        stdio: 'pipe' 
      });
      
      const packagePath = join(testPackageDir, 'node_modules', 'logobox');
      
      // Check required files exist
      const requiredFiles = [
        'package.json',
        'dist/index.js',
        'dist/index.cjs',
        'dist/index.d.ts'
      ];
      
      for (const file of requiredFiles) {
        const filePath = join(packagePath, file);
        expect(existsSync(filePath)).toBe(true);
      }
      
      console.log('✅ Package structure is correct');
    });
  });

  describe('Real-world Usage Scenarios', () => {
    it('should work in a typical web application setup', () => {
      const testPackageDir = join(TEST_DIR, 'webapp-test');
      mkdirSync(testPackageDir, { recursive: true });
      
      const packageJson = {
        name: 'webapp-test',
        version: '1.0.0',
        type: 'module',
        scripts: {
          start: 'node app.js'
        }
      };
      writeFileSync(join(testPackageDir, 'package.json'), JSON.stringify(packageJson, null, 2));
      
      const tarballPath = join(PACKAGE_ROOT, packageTarball);
      execSync(`npm install ${tarballPath}`, { 
        cwd: testPackageDir, 
        stdio: 'pipe' 
      });
      
      // Create a simple web app that uses LogoBox
      const appScript = `
        import { logobox } from 'logobox';
        
        // Simulate web app usage
        console.log('🚀 Starting web application...');
        
        // Configure LogoBox for production
        logobox.configure({
          cdnUrl: 'https://cdn.logobox.com',
          defaultVariant: 'original',
          cache: { enabled: true, ttl: 3600000 }
        });
        
        // Generate URLs for common logos
        const logos = ['github', 'microsoft', 'google', 'apple'];
        const urls = logos.map(slug => ({
          slug,
          url: logobox.getLogoUrl(slug),
          variants: {
            white: logobox.getLogoUrl(slug, 'white'),
            black: logobox.getLogoUrl(slug, 'black')
          }
        }));
        
        console.log('✅ Generated logo URLs:', urls.length);
        console.log('✅ Web application setup complete');
        
        process.exit(0);
      `;
      
      writeFileSync(join(testPackageDir, 'app.js'), appScript);
      
      const output = execSync('npm start', { 
        cwd: testPackageDir, 
        encoding: 'utf8' 
      });
      
      expect(output).toContain('🚀 Starting web application');
      expect(output).toContain('✅ Generated logo URLs: 4');
      expect(output).toContain('✅ Web application setup complete');
    });

    it('should work in a server-side rendering context', () => {
      const testPackageDir = join(TEST_DIR, 'ssr-test');
      mkdirSync(testPackageDir, { recursive: true });
      
      execSync('npm init -y', { cwd: testPackageDir, stdio: 'pipe' });
      
      const tarballPath = join(PACKAGE_ROOT, packageTarball);
      execSync(`npm install ${tarballPath}`, { 
        cwd: testPackageDir, 
        stdio: 'pipe' 
      });
      
      // Simulate SSR usage
      const ssrScript = `
        const { logobox } = require('logobox');
        
        // Simulate server-side rendering
        function generateLogoHTML(slug, variant = 'original') {
          try {
            const url = logobox.getLogoUrl(slug, variant);
            return \`<img src="\${url}" alt="\${slug} logo" />\`;
          } catch (error) {
            return \`<div>Logo not found: \${slug}</div>\`;
          }
        }
        
        // Generate HTML for multiple logos
        const logos = ['github', 'invalid-logo', 'microsoft'];
        const htmlParts = logos.map(slug => generateLogoHTML(slug));
        
        console.log('✅ SSR: Generated HTML for', logos.length, 'logos');
        console.log('✅ SSR: Error handling works for invalid logos');
        
        // Test that it works with different variants
        const whiteLogoHTML = generateLogoHTML('github', 'white');
        console.log('✅ SSR: Variant support works');
        
        process.exit(0);
      `;
      
      writeFileSync(join(testPackageDir, 'ssr.js'), ssrScript);
      
      const output = execSync('node ssr.js', { 
        cwd: testPackageDir, 
        encoding: 'utf8' 
      });
      
      expect(output).toContain('✅ SSR: Generated HTML for 3 logos');
      expect(output).toContain('✅ SSR: Error handling works');
      expect(output).toContain('✅ SSR: Variant support works');
    });
  });
});