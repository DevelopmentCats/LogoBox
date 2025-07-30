/**
 * Static Site Pre-rendering Script
 * Generates static HTML files for main routes to improve SEO and initial load performance
 */

import { createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createPinia } from 'pinia'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

// Import app components
import App from '../src/App.vue'
import { routes } from '../src/router/index.js'
import { logoBoxConfig } from '../../../config/index.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const distDir = path.resolve(__dirname, '../dist')
const templatePath = path.resolve(distDir, 'index.html')

/**
 * Routes to pre-render for better SEO
 */
const PRERENDER_ROUTES = [
  '/',
  '/search',
  '/categories',
  '/404'
]

/**
 * Create Vue app instance for SSR
 */
function createApp() {
  const app = createSSRApp(App)
  
  const router = createRouter({
    history: createMemoryHistory(),
    routes
  })
  
  const pinia = createPinia()
  
  app.use(router)
  app.use(pinia)
  
  return { app, router }
}

/**
 * Generate meta tags for a route
 */
function generateMetaTags(route) {
  const baseTitle = 'LogoBox - Logo and Icon Library'
  const baseDescription = 'Browse and download high-quality logos and icons for your projects'
  
  const metaTags = {
    '/': {
      title: baseTitle,
      description: baseDescription,
      keywords: 'logos, icons, branding, download, svg, png'
    },
    '/search': {
      title: 'Search Logos - LogoBox',
      description: 'Search through thousands of high-quality logos and icons',
      keywords: 'search logos, find icons, logo search'
    },
    '/categories': {
      title: 'Logo Categories - LogoBox',
      description: 'Browse logos by category - technology, social media, and more',
      keywords: 'logo categories, technology logos, social media icons'
    },
    '/404': {
      title: 'Page Not Found - LogoBox',
      description: 'The page you are looking for could not be found',
      keywords: 'not found, 404'
    }
  }
  
  return metaTags[route] || metaTags['/']
}

/**
 * Inject meta tags and app state into HTML template
 */
function injectMetaAndState(html, route, appHtml, state = {}) {
  const meta = generateMetaTags(route)
  
  // Inject meta tags
  let injectedHtml = html
    .replace(/<title>.*?<\/title>/, `<title>${meta.title}</title>`)
    .replace(
      /<meta name="description"[^>]*>/,
      `<meta name="description" content="${meta.description}">`
    )
  
  // Add additional meta tags
  const additionalMeta = `
    <meta name="keywords" content="${meta.keywords}">
    <meta property="og:title" content="${meta.title}">
    <meta property="og:description" content="${meta.description}">
    <meta property="og:type" content="website">
    <meta property="og:url" content="${logoBoxConfig.baseUrl}${route}">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${meta.title}">
    <meta name="twitter:description" content="${meta.description}">
    <link rel="canonical" href="${logoBoxConfig.baseUrl}${route}">
  `
  
  injectedHtml = injectedHtml.replace('</head>', `${additionalMeta}</head>`)
  
  // Inject rendered app
  injectedHtml = injectedHtml.replace(
    '<div id="app"></div>',
    `<div id="app">${appHtml}</div>`
  )
  
  // Inject state for hydration
  if (Object.keys(state).length > 0) {
    const stateScript = `<script>window.__INITIAL_STATE__ = ${JSON.stringify(state)}</script>`
    injectedHtml = injectedHtml.replace('</body>', `${stateScript}</body>`)
  }
  
  return injectedHtml
}

/**
 * Pre-render a single route
 */
async function prerenderRoute(route, template) {
  console.log(`Pre-rendering route: ${route}`)
  
  try {
    const { app, router } = createApp()
    
    // Navigate to route
    await router.push(route)
    await router.isReady()
    
    // Render app to string
    const appHtml = await renderToString(app)
    
    // Generate final HTML
    const html = injectMetaAndState(template, route, appHtml)
    
    // Determine output path
    let outputPath
    if (route === '/') {
      outputPath = path.join(distDir, 'index.html')
    } else if (route === '/404') {
      outputPath = path.join(distDir, '404.html')
    } else {
      outputPath = path.join(distDir, route.slice(1), 'index.html')
    }
    
    // Ensure directory exists
    await fs.mkdir(path.dirname(outputPath), { recursive: true })
    
    // Write file
    await fs.writeFile(outputPath, html, 'utf8')
    
    console.log(`✓ Generated: ${outputPath}`)
    
  } catch (error) {
    console.error(`✗ Failed to pre-render ${route}:`, error.message)
    throw error
  }
}

/**
 * Generate sitemap.xml
 */
async function generateSitemap() {
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${PRERENDER_ROUTES.map(route => `
  <url>
    <loc>${logoBoxConfig.baseUrl}${route === '/' ? '' : route}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>${route === '/' ? 'daily' : 'weekly'}</changefreq>
    <priority>${route === '/' ? '1.0' : '0.8'}</priority>
  </url>`).join('')}
</urlset>`
  
  const sitemapPath = path.join(distDir, 'sitemap.xml')
  await fs.writeFile(sitemapPath, sitemap.trim(), 'utf8')
  console.log('✓ Generated sitemap.xml')
}

/**
 * Generate robots.txt
 */
async function generateRobotsTxt() {
  const robots = `User-agent: *
Allow: /

Sitemap: ${logoBoxConfig.baseUrl}/sitemap.xml`
  
  const robotsPath = path.join(distDir, 'robots.txt')
  await fs.writeFile(robotsPath, robots, 'utf8')
  console.log('✓ Generated robots.txt')
}

/**
 * Main pre-rendering function
 */
async function prerender() {
  console.log('Starting static site pre-rendering...')
  
  try {
    // Check if dist directory exists
    const templateExists = await fs.access(templatePath).then(() => true).catch(() => false)
    if (!templateExists) {
      throw new Error('Build output not found. Run "npm run build" first.')
    }
    
    // Read HTML template
    const template = await fs.readFile(templatePath, 'utf8')
    
    // Pre-render all routes
    for (const route of PRERENDER_ROUTES) {
      await prerenderRoute(route, template)
    }
    
    // Generate additional files
    await generateSitemap()
    await generateRobotsTxt()
    
    console.log('✓ Pre-rendering completed successfully!')
    console.log(`Generated ${PRERENDER_ROUTES.length} static pages`)
    
  } catch (error) {
    console.error('✗ Pre-rendering failed:', error.message)
    process.exit(1)
  }
}

// Run pre-rendering if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  prerender()
}

export { prerender }