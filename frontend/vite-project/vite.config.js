import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/user': 'http://localhost:3000',
      '/problem': 'http://localhost:3000',
      '/submit': 'http://localhost:3000',
      '/contest': 'http://localhost:3000',
      '/interview': 'http://localhost:3000',
      '/ai': 'http://localhost:3000',
      '/video': 'http://localhost:3000',
      '/profile': 'http://localhost:3000',
    }
  }
})