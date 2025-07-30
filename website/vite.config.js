import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig(({ mode }) => ({
  plugins: [
    vue({
      // Enable reactivity transform for better tree-shaking
      reactivityTransform: true,
      // Optimize component rendering
      template: {
        compilerOptions: {
          // Remove comments and whitespace in production
          comments: false,
          whitespace: 'condense'
        }
      }
    })
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  // Base path for deployment
  base: mode === 'production' ? '/' : '/',
  
  // Static site generation configuration
  ssr: {
    noExternal: ['vue', 'vue-router', 'pinia']
  },
  
  test: {
    globals: true,
    environment: 'jsdom'
  },
  
  build: {
    outDir: 'dist',
    sourcemap: mode !== 'production',
    target: 'es2020',
    minify: 'terser',
    cssCodeSplit: true,
    // Generate manifest for asset tracking
    manifest: true,
    // Enable static site generation optimizations
    ssrManifest: true,
    // Enable tree shaking
    rollupOptions: {
      external: [],
      output: {
        // Advanced code splitting strategy
        manualChunks: (id) => {
          // Vendor chunk for core dependencies
          if (id.includes('node_modules')) {
            if (id.includes('vue') || id.includes('vue-router') || id.includes('pinia')) {
              return 'vendor-core'
            }
            // Separate chunk for other vendor libraries
            return 'vendor-libs'
          }
          
          // Components chunk
          if (id.includes('/components/')) {
            return 'components'
          }
          
          // Composables chunk
          if (id.includes('/composables/')) {
            return 'composables'
          }
          
          // Views chunk
          if (id.includes('/views/')) {
            return 'views'
          }
          
          // Utils chunk
          if (id.includes('/utils/') || id.includes('/stores/')) {
            return 'utils'
          }
        },
        // Optimize chunk names for better caching
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId
          if (facadeModuleId) {
            if (facadeModuleId.includes('views/')) {
              return 'assets/views/[name]-[hash].js'
            }
            if (facadeModuleId.includes('components/')) {
              return 'assets/components/[name]-[hash].js'
            }
          }
          return 'assets/[name]-[hash].js'
        },
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.')
          const extType = info[info.length - 1]
          if (/\.(png|jpe?g|gif|svg|webp|ico)$/i.test(assetInfo.name)) {
            return `assets/images/[name]-[hash].${extType}`
          }
          if (/\.(css|scss|sass|less|styl)$/i.test(assetInfo.name)) {
            return `assets/styles/[name]-[hash].${extType}`
          }
          if (/\.(woff2?|eot|ttf|otf)$/i.test(assetInfo.name)) {
            return `assets/fonts/[name]-[hash].${extType}`
          }
          return `assets/[name]-[hash].${extType}`
        }
      },
      // Tree shaking configuration
      treeshake: {
        moduleSideEffects: false,
        propertyReadSideEffects: false,
        annotations: true
      }
    },
    // Terser options for better minification
    terserOptions: {
      compress: {
        drop_console: process.env.NODE_ENV === 'production',
        drop_debugger: true,
        passes: 2
      },
      mangle: {
        safari10: true
      },
      format: {
        comments: false
      }
    },
    // CSS optimization
    cssMinify: true,
    // Report compressed file sizes
    reportCompressedSize: true,
    // Warn about large chunks
    chunkSizeWarningLimit: 500,
    // Static site generation settings
    emptyOutDir: true,
    copyPublicDir: true
  },
  server: {
    port: 3000,
    open: true,
    cors: true
  },
  // Optimization for development
  optimizeDeps: {
    include: ['vue', 'vue-router', 'pinia'],
    exclude: []
  },
  // Performance monitoring in development
  define: {
    __PERFORMANCE_MONITORING__: JSON.stringify(mode === 'development'),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    __VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0')
  },
  
  // Preview server configuration for testing built site
  preview: {
    port: 4173,
    host: true,
    cors: true
  }
}))