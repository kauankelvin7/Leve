import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  envDir: fileURLToPath(new URL('../..', import.meta.url)),
  plugins: [react()],
  build: { outDir: '../../dist', emptyOutDir: true },
  server: { host: 'localhost', proxy: { '/api': 'http://localhost:8788' } },
  preview: { host: 'localhost' },
});
