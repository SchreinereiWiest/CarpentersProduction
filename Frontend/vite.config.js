import { defineConfig, searchForWorkspaceRoot } from 'vite'
import { fileURLToPath } from 'node:url'
import { readFileSync } from 'node:fs'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const offlineServiceWorker = () => {
  const template = readFileSync(fileURLToPath(new URL('./sw-template.js', import.meta.url)), 'utf8')
  const renderWorker = (urls, buildId) => template
    .replaceAll('__PRECACHE_URLS__', JSON.stringify(urls))
    .replaceAll('__BUILD_ID__', buildId)

  return {
    name: 'offline-service-worker',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        if (request.url?.split('?')[0] !== '/sw.js') return next()
        response.statusCode = 200
        response.setHeader('Content-Type', 'text/javascript; charset=utf-8')
        response.setHeader('Cache-Control', 'no-cache')
        response.end(renderWorker(
          ['/index.html', '/manifest.webmanifest', '/favicon.svg'],
          'development'
        ))
      })
    },
    generateBundle(_options, bundle) {
    const buildAssets = Object.values(bundle)
      .map(item => `/${item.fileName}`)
      .filter(fileName => fileName !== '/sw.js')
    const urls = [...new Set(['/index.html', '/manifest.webmanifest', '/favicon.svg', ...buildAssets])]
    const buildId = buildAssets.join('-').replace(/[^a-zA-Z0-9]/g, '').slice(0, 24) || 'dev'
    this.emitFile({
      type: 'asset',
      fileName: 'sw.js',
      source: renderWorker(urls, buildId)
    })
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), offlineServiceWorker()],

  resolve: {
    alias: {
      '@Engine': fileURLToPath(new URL('../Engine', import.meta.url)),
    },
  },

  test: {
    environment: 'jsdom',
    setupFiles: './test/setup.js',
    include: ['test/**/*.test.{js,jsx}'],
    clearMocks: true,
    restoreMocks: true,
    unstubGlobals: true,
  },

   server: {
    host: true,
    fs: {
      allow: [searchForWorkspaceRoot(fileURLToPath(new URL('.', import.meta.url))), fileURLToPath(new URL('../Engine', import.meta.url))]
    },

    watch: {
      usePolling: true
    }
  }
  
})
