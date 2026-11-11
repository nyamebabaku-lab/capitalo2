import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Two apps from one codebase (VITE_APP): live → dist/, demo → dist/demo/.
const APP = process.env.VITE_APP || 'demo';
const LIVE = APP === 'live';
// Android builds (VITE_ROLE = tenant | owner | admin): no service worker, the app ships its own files.
const ROLE = process.env.VITE_ROLE || '';

export default defineConfig({
  base: './',
  define: { 'import.meta.env.VITE_APP': JSON.stringify(APP), 'import.meta.env.VITE_ROLE': JSON.stringify(ROLE) },
  plugins: [
    react(),
    VitePWA({
      disable: !!ROLE,
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'apple-touch-icon.png'],
      manifest: {
        id: LIVE ? 'capitalo2' : 'capitalo2-demo',
        name: LIVE ? 'Capital O2 Estates & Hostel' : 'Capital O2 Hostel — Demo',
        short_name: LIVE ? 'Capital O2' : 'Capital O2 Demo',
        description: 'Capital O2 Estates & Hostel — rent, receipts, repairs, rooms and beds',
        theme_color: '#1f5a23',
        background_color: '#f6f9f4',
        display: 'standalone',
        start_url: './',
        scope: './',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,jpg,woff2}'],
        // The live app's folder also holds the demo; never cache or answer for it.
        globIgnores: LIVE ? ['demo/**'] : [],
        navigateFallbackDenylist: LIVE ? [/\/demo\//] : [],
        runtimeCaching: [{ urlPattern: /supabase\.co\//, handler: 'NetworkOnly' }],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        navigateFallback: 'index.html',
      },
    }),
  ],
  build: { outDir: process.env.OUT_DIR || (LIVE ? 'dist' : 'dist/demo'), emptyOutDir: LIVE || !!process.env.OUT_DIR, chunkSizeWarningLimit: 1500 },
});
