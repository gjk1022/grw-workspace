import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: false,
    proxy: {
      '/api': 'http://localhost:8000',
      '/uploads': 'http://localhost:8000'
    },
    watch: {
      usePolling: true,
      interval: 1000
    },
    hmr: {
      overlay: false
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false
  }
})
