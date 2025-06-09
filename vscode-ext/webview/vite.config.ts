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
      input: './src/index.ts',
      output: {
        format: 'iife',          // ← use IIFE format for webview
        entryFileNames: 'index.js',       // ← force output file name
        manualChunks: undefined,  // ← disables code splitting
        assetFileNames: '[name][extname]',
      }
    }
  }
});