import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  build: {
    target: 'esnext',
    cssMinify: true,
    chunkSizeWarningLimit: 600,
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': 'http://127.0.0.1:5174'
    }
  },
  preview: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': 'http://127.0.0.1:5174'
    }
  }
})
