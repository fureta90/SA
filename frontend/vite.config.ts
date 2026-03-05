import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Permite acceso desde cualquier IP
    port: 5174,
    strictPort: true, // Si el puerto está ocupado, intenta otro
    open: false, // No abre el navegador automáticamente
    proxy: {
      '/api-backend': {
        target: 'http://localhost:4001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-backend/, '/api-backend'),
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})
