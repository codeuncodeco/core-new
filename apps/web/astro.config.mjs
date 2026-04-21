import { defineConfig } from 'astro/config'
import tailwindcss from '@tailwindcss/vite'
import cloudflare from '@astrojs/cloudflare'

export default defineConfig({
  // static by default (every existing page is prerendered at build).
  // /preview/* routes opt out with `export const prerender = false` for SSR.
  output: 'static',
  adapter: cloudflare({
    imageService: 'passthrough',
  }),
  vite: {
    plugins: [tailwindcss()],
  },
})
