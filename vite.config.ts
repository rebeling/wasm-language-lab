import { defineConfig } from 'vite';

export default defineConfig({
  // Vite configuration
  server: {
    port: 5173,
    open: true
  },
  build: {
    target: 'esnext'
  }
});
