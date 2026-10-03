import { defineConfig } from 'vite'
import type { Plugin } from 'vite'
import react from '@vitejs/plugin-react'

// Link-preview tags need absolute URLs. Use SITE_URL if set, otherwise the
// production domain Vercel provides at build time; fall back to relative
// paths for local builds.
const siteUrl = (
  process.env.SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '')
).replace(/\/$/, '')

const siteUrlPlugin = (): Plugin => ({
  name: 'site-url',
  transformIndexHtml: (html) => html.replaceAll('%SITE_URL%', siteUrl),
})

export default defineConfig({
  plugins: [react(), siteUrlPlugin()],
  build: {
    chunkSizeWarningLimit: 1000,
  },
})
