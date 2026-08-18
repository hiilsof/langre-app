import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Precache the app shell plus the tokenizer dictionary; the
      // translation model and JMdict index are large enough to fetch
      // and cache on first use instead (see lib/translation, lib/dictionary).
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        // kuromoji's .dat.gz dictionary files, cached separately since
        // they're binary and not part of the JS/CSS bundle.
        additionalManifestEntries: [],
      },
      includeAssets: ['dict/*.gz'],
      manifest: {
        name: 'Yomikata',
        short_name: 'Yomikata',
        description: 'Offline Japanese reader: furigana, translation, and text-to-speech, all on-device.',
        start_url: '/',
        display: 'standalone',
        background_color: '#edeff1',
        theme_color: '#2f5c8a',
        icons: [],
      },
    }),
  ],
})
