import { defineConfig } from 'vite'

// GitHub Pages can be targeted with GITHUB_PAGES=true and an optional
// VITE_BASE=/repo-name/. The default keeps local dev and preview at '/'.
const isPages = process.env.GITHUB_PAGES === 'true'

export default defineConfig({
  base: isPages
    ? (process.env.VITE_BASE || '/nintendo-blue-ocean/')
    : '/',
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
  },
  preview: {
    host: '127.0.0.1',
    port: 4173,
    strictPort: true,
  },
  build: {
    // Pages gets its own artifact and no source maps for a leaner public deploy.
    outDir: isPages ? 'dist-pages' : 'dist',
    sourcemap: !isPages,
  },
})
