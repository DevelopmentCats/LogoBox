import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig(({ mode }) => ({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  base: '/',
  test: {
    globals: true,
    environment: 'jsdom'
  },
  build: {
    outDir: 'dist',
    sourcemap: mode !== 'production',
    emptyOutDir: true
  },
  server: {
    port: 3000,
    open: true
  },
  define: {
    __PERFORMANCE_MONITORING__: JSON.stringify(mode === 'development'),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    __VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0')
  }
}))