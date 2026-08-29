import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// The mockups/ directory is what GitHub Pages serves verbatim, so the build
// emits straight into it: explorer.html beside the other static pages, with
// its chunks under mockups/app/. The vanilla whl-* modules in mockups/lib are
// imported as source and bundled; mockups/lib/data and mockups/assets stay
// runtime fetches relative to explorer.html.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@lib': fileURLToPath(new URL('../mockups/lib', import.meta.url)),
      '@mockups': fileURLToPath(new URL('../mockups', import.meta.url)),
    },
  },
  base: './',
  build: {
    outDir: fileURLToPath(new URL('../mockups', import.meta.url)),
    emptyOutDir: false,
    assetsDir: 'app',
    rollupOptions: {
      input: fileURLToPath(new URL('./explorer.html', import.meta.url)),
    },
  },
  server: {
    fs: { allow: ['..'] },
  },
})
