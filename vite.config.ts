import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Electron loads the build through file://, so every asset URL must be relative.
export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    port: 5199,
    strictPort: false,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'chrome130',
  },
});
