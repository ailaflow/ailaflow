import { defineConfig } from 'vite';
import { fileURLToPath } from 'url';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [tailwindcss()],
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'react'
  },
  resolve: {
    alias: {
      '@aila/model': fileURLToPath(new URL('../model/src/index.ts', import.meta.url))
    }
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        timeout: 0,
        proxyTimeout: 0
      }
    }
  }
});
