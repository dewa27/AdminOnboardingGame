import { defineConfig } from 'vite';

// Phaser 3 + Vite. The `base: './'` keeps relative asset paths so the built
// game can be hosted under any sub-path (or opened locally via the file://
// protocol). Scenes are loaded eagerly via dynamic import in main.js.
export default defineConfig({
  base: './',
  server: {
    port: 5173,
    open: true
  },
  build: {
    outDir: 'dist',
    target: 'es2020',
    sourcemap: true
  }
});