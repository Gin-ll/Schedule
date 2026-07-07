import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  root: 'src',
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      external: [
        'tauri-plugin-sql-api',
        /^\@tauri-apps\/api/,
        /^\@tauri-apps\/plugin/
      ]
    }
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  clearScreen: false,
});
