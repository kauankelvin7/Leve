import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('../..', import.meta.url));
const publicFirebaseKeys = new Set([
  'VITE_FIREBASE_API_KEY', 'VITE_FIREBASE_AUTH_DOMAIN', 'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_APP_ID', 'VITE_FIREBASE_MESSAGING_SENDER_ID', 'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MEASUREMENT_ID', 'VITE_USE_EMULATORS',
]);

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, projectRoot, '');
  const leaked = Object.keys(env).filter(key => key.startsWith('VITE_') && !publicFirebaseKeys.has(key) && /private|secret|token|password|credential|client.?email|service.?account/i.test(key));
  if (leaked.length) throw new Error(`Variáveis sensíveis não podem usar o prefixo VITE_: ${leaked.join(', ')}`);
  return {
    root: fileURLToPath(new URL('.', import.meta.url)),
    envDir: projectRoot,
    plugins: [react()],
    build: { outDir: '../../dist', emptyOutDir: true, sourcemap: false },
    server: { host: 'localhost', proxy: { '/api': 'http://localhost:8788' } },
    preview: { host: 'localhost' },
  };
});
