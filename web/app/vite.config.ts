import { createReadStream, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// kuromoji's dictionary files are shipped pre-gzipped (public/dict/*.dat.gz)
// and kuromoji gunzips them itself in JS after fetching. Vite's dev/preview
// static server (sirv) auto-detects the .gz extension and serves them with
// `Content-Encoding: gzip`, which makes the browser transparently
// decompress the response before kuromoji ever sees it — so kuromoji's own
// gunzip then fails on already-plain bytes ("invalid file signature"). This
// plugin serves /dict/*.gz ourselves, ahead of sirv, without that header.
function rawDictFiles(): Plugin {
  function middleware(root: string) {
    return (req: import('node:http').IncomingMessage, res: import('node:http').ServerResponse, next: () => void) => {
      const url = req.url ?? ''
      if (!url.startsWith('/dict/') || !url.endsWith('.gz')) return next()
      const filePath = fileURLToPath(new URL('.' + url, `file://${root}/`))
      if (!existsSync(filePath)) return next()
      res.setHeader('Content-Type', 'application/octet-stream')
      createReadStream(filePath).pipe(res)
    }
  }
  return {
    name: 'raw-dict-files',
    configureServer(server) {
      server.middlewares.use(middleware(server.config.root + '/public/'))
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware(server.config.root + '/public/'))
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      // kuromoji's `src/` entry point pulls in zlibjs in a way that
      // breaks under esbuild's CJS->ESM interop (zlibjs's own UMD
      // wrapper relies on a non-strict-mode `this`, which esbuild's
      // conversion leaves `undefined`). kuromoji's prebuilt browser
      // bundle avoids this — it inlines zlibjs with the `this` binding
      // threaded through correctly — so alias straight to it.
      kuromoji: fileURLToPath(new URL('./node_modules/kuromoji/build/kuromoji.js', import.meta.url)),
    },
  },
  plugins: [
    rawDictFiles(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Precache the app shell, the tokenizer dictionary, and the small
      // curated jmdict-mini.json; the full JMdict index and translation
      // model (once wired up) are large enough to fetch and cache on
      // first use instead (see lib/translation, lib/dictionary).
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,json}'],
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
