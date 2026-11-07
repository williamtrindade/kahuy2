import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import { CSP } from '../backend/src/FrameworksAndDrivers/Http/securityHeaders'

// Para onde o Vite encaminha /api (dev e preview). Padrão: backend local.
const env = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {}
const api = env.KAHUY_API ?? 'http://127.0.0.1:8787'

const securityHeaders = {
  'Content-Security-Policy': CSP,
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
}

// Cloudflare Pages: gera dist/_headers com a mesma CSP da API (fonte única: securityHeaders.ts).
const pagesHeaders = (): Plugin => ({
  name: 'kahuy-pages-headers',
  generateBundle() {
    const lines = Object.entries(securityHeaders).map(([k, v]) => `  ${k}: ${v}`)
    this.emitFile({ type: 'asset', fileName: '_headers', source: ['/*', ...lines, ''].join('\n') })
  },
})

export default defineConfig({
  plugins: [react(), pagesHeaders()],
  build: { chunkSizeWarningLimit: 800 },
  server: { proxy: { '/api': api } },
  preview: { port: 4173, proxy: { '/api': api }, headers: securityHeaders },
  css: { preprocessorOptions: { scss: { quietDeps: true, silenceDeprecations: ['import', 'global-builtin', 'color-functions', 'if-function'] } } },
})
