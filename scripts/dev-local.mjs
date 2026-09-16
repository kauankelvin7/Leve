import { spawn } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import net from 'node:net';

function portOpen(port) {
  return new Promise(resolve => {
    const socket = net.createConnection({ host: '127.0.0.1', port });
    socket.once('connect', () => { socket.destroy(); resolve(true); });
    socket.once('error', () => { socket.destroy(); resolve(false); });
    socket.setTimeout(400, () => { socket.destroy(); resolve(false); });
  });
}

function findJavaHome() {
  if (process.env.JAVA_HOME && existsSync(join(process.env.JAVA_HOME, 'bin', 'java.exe'))) return process.env.JAVA_HOME;
  if (process.platform !== 'win32' || !process.env.ProgramFiles) return undefined;
  const vendorDirectory = join(process.env.ProgramFiles, 'Microsoft');
  if (!existsSync(vendorDirectory)) return undefined;
  const installations = readdirSync(vendorDirectory, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && entry.name.startsWith('jdk-'))
    .map(entry => join(vendorDirectory, entry.name))
    .filter(directory => existsSync(join(directory, 'bin', 'java.exe')))
    .sort()
    .reverse();
  return installations[0];
}

const javaHome = findJavaHome();

const env = {
  ...process.env,
  FIREBASE_PROJECT_ID: 'demo-leve',
  FIREBASE_AUTH_EMULATOR_HOST: 'localhost:9099',
  FIRESTORE_EMULATOR_HOST: 'localhost:8080',
  VITE_USE_EMULATORS: 'true',
  XDG_CONFIG_HOME: join(process.cwd(), '.cache'),
  ...(javaHome ? { JAVA_HOME: javaHome, PATH: `${join(javaHome, 'bin')};${process.env.PATH ?? ''}` } : {}),
};
const node = process.execPath;
const emulatorData = join(process.cwd(), '.cache', 'firebase-data');
const persistence = process.env.LEVE_EPHEMERAL === 'true' ? [] : [
  ...(existsSync(join(emulatorData, 'firebase-export-metadata.json')) ? ['--import', emulatorData] : []),
  '--export-on-exit', emulatorData,
];
const [authRunning, firestoreRunning] = await Promise.all([9099, 8080].map(portOpen));
const emulatorServices = ['auth', 'firestore'].filter((service, index) => ![authRunning, firestoreRunning][index]);
if (authRunning || firestoreRunning) console.log(`[Firebase] Reutilizando ${[authRunning && 'Auth', firestoreRunning && 'Firestore'].filter(Boolean).join(' e ')} já ativo(s).`);
const commands = [
  ...(emulatorServices.length ? [['Firebase', [node, 'node_modules/firebase-tools/lib/bin/firebase.js', 'emulators:start', '--project', 'demo-leve', '--only', emulatorServices.join(','), ...persistence]]] : []),
  ['API', [node, 'server/dev.ts']],
  ['Web', [node, 'node_modules/vite/bin/vite.js', '--config', 'apps/web/vite.config.ts', '--port', '5174', '--strictPort']],
];
const concurrent = spawn(node, [
  'node_modules/concurrently/dist/bin/index.js', '--kill-others-on-fail', '--names', commands.map(([name]) => name).join(','),
  ...commands.map(([, parts]) => parts.map(part => part.includes(' ') ? JSON.stringify(part) : part).join(' ')),
], { cwd: process.cwd(), env, stdio: 'inherit' });

for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => concurrent.kill(signal));
concurrent.on('exit', code => process.exitCode = code ?? 1);
