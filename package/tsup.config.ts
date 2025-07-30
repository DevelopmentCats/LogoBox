import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  minify: false,
  target: 'es2020',
  outDir: 'dist',
  external: ['node:fs', 'node:path', 'node:crypto'],
  banner: {
    js: '/* LogoBox NPM Package - https://logobox.com */',
  },
  esbuildOptions(options) {
    options.charset = 'utf8';
  },
});