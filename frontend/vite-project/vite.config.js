import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const apiProxy = {
  target: 'http://localhost:3000',
  bypass: (req) => {
    if (req.headers.accept && req.headers.accept.includes('html')) {
      return '/index.html';
    }
  }
};

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/user': apiProxy,
      '/problem': apiProxy,
      '/submit': apiProxy,
      '/contest': apiProxy,
      '/ai': apiProxy,
      '/video': apiProxy,
      '/profile': apiProxy,
    }
  }
})