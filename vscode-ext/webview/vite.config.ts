import { defineConfig } from 'vite';

export default defineConfig({
  // plugins: [viteSingleFile()],
  root: '.', // 'webview' dir is current working directory
  base: './',
  build: {
    outDir: './dist',
    emptyOutDir: true,
    assetsDir: '',
    assetsInlineLimit: () => true,
    cssCodeSplit: false,
    rollupOptions: {
      input: './index.html',
      output: {
        entryFileNames: 'index.js',       // ← force output file name
        manualChunks: undefined,  // ← disables code splitting
        assetFileNames: '[name][extname]',
      }
    }
  }
});