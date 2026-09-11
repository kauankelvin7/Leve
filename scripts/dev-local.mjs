import { spawn } from 'node:child_process';

const env = {
  ...process.env,
  FIREBASE_PROJECT_ID: 'demo-leve',
  FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099',
  FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080',
  VITE_USE_EMULATORS: 'true',
};
const node = process.execPath;
const commands = [
  ['Firebase', [node, 'node_modules/firebase-tools/lib/bin/firebase.js', 'emulators:start', '--project', 'demo-leve', '--only', 'auth,firestore']],
  ['API', [node, 'node_modules/tsx/dist/cli.mjs', 'server/dev.ts']],
  ['Web', [node, 'node_modules/vite/bin/vite.js', '--config', 'apps/web/vite.config.ts']],
];
const concurrent = spawn(node, [
  'node_modules/concurrently/dist/bin/index.js', '--kill-others-on-fail', '--names', commands.map(([name]) => name).join(','),
  ...commands.map(([, parts]) => parts.map(part => part.includes(' ') ? JSON.stringify(part) : part).join(' ')),
], { cwd: process.cwd(), env, stdio: 'inherit' });

for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => concurrent.kill(signal));
concurrent.on('exit', code => process.exitCode = code ?? 1);
