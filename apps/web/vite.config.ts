import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('../..', import.meta.url));
const publicFirebaseKeys = new Set([
  'VITE_FIREBASE_API_KEY', 'VITE_FIREBASE_AUTH_DOMAIN', 'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_APP_ID', 'VITE_FIREBASE_MESSAGING_SENDER_ID', 'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MEASUREMENT_ID', 'VITE_USE_EMULATORS',
]);

function offlinePrecachePlugin(): Plugin {
  return {
    name: 'leve-offline-precache',
    apply: 'build' as const,
    async writeBundle(options) {
      const outputDir = resolve(options.dir ?? join(projectRoot, 'dist'));
      const assetsDir = join(outputDir, 'assets');
      const entries = await readdir(assetsDir, { withFileTypes: true });
      const assets = entries.filter(entry => entry.isFile()).map(entry => `/assets/${entry.name}`).sort();
      const fingerprint = createHash('sha256').update(assets.join('\n')).digest('hex').slice(0, 8);
      const swPath = join(outputDir, 'sw.js');
      let source = await readFile(swPath, 'utf8');
      source = source.replace(/const CACHE = 'leve-shell-[^']+';/, `const CACHE = 'leve-shell-${fingerprint}';`);
      source = source.replace('const PRECACHE_ASSETS = [];', `const PRECACHE_ASSETS = ${JSON.stringify(assets)};`);
      await writeFile(swPath, source);
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, projectRoot, '');
  const leaked = Object.keys(env).filter(key => key.startsWith('VITE_') && !publicFirebaseKeys.has(key) && /private|secret|token|password|credential|api.?key|client.?email|service.?account/i.test(key));
  if (leaked.length) throw new Error(`Variáveis sensíveis não podem usar o prefixo VITE_: ${leaked.join(', ')}`);
  return {
    root: fileURLToPath(new URL('.', import.meta.url)),
    envDir: projectRoot,
    plugins: [react(), offlinePrecachePlugin(), {
      name: 'gika-character-review',
      apply: 'serve',
      configureServer(server) {
        server.middlewares.use(async (request, response, next) => {
          if (request.url?.split('?')[0] !== '/dev/gika-character') return next();
          try {
            const html = await server.transformIndexHtml('/dev/gika-character', '<!doctype html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>Gika · revisão visual</title></head><body><div id="root"></div><script type="module" src="/src/dev/GikaCharacterReview.tsx"></script></body></html>');
            response.setHeader('Content-Type', 'text/html'); response.end(html);
          } catch (error) { next(error); }
        });
      },
    }],
    build: { outDir: '../../dist', emptyOutDir: true, sourcemap: false },
    server: { host: 'localhost', proxy: { '/api': 'http://localhost:8788' } },
    preview: { host: 'localhost' },
  };
});
