import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'IBELL MOBILE Daybook',
        short_name: 'Daybook',
        description: 'Party ledger — cash in/out tracking for IBELL MOBILE',
        theme_color: '#0a7d42',
        background_color: '#f4f5f7',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg}'],
        // Export libraries load on first download, not at install time.
        globIgnores: ['**/exceljs*.js', '**/html2canvas*.js', '**/purify*.js', '**/index.es-*.js'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/assets/'),
            handler: 'CacheFirst',
            options: { cacheName: 'lazy-assets', expiration: { maxEntries: 40 } },
          },
        ],
      },
    }),
  ],
})
