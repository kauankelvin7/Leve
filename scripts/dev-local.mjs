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
  const vendors = ['Java', 'Microsoft', 'Eclipse Adoptium', 'Semeru'];
  for (const vendor of vendors) {
    const vendorDirectory = join(process.env.ProgramFiles, vendor);
    if (!existsSync(vendorDirectory)) continue;
    const installations = readdirSync(vendorDirectory, { withFileTypes: true })
      .filter(entry => entry.isDirectory() && (entry.name.startsWith('jdk') || entry.name.startsWith('jdk-')))
      .map(entry => join(vendorDirectory, entry.name))
      .filter(directory => existsSync(join(directory, 'bin', 'java.exe')))
      .sort()
      .reverse();
    if (installations[0]) return installations[0];
  }
  return undefined;
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
let stopping = false;
const children = [];
let failStartup;
function startChild(name, parts) {
  const child = spawn(parts[0], parts.slice(1), { cwd: process.cwd(), env, stdio: 'inherit' });
  children.push(child);
  child.once('exit', (code, signal) => {
    if (stopping) return;
    stopping = true;
    failStartup?.(new Error(`[${name}] encerrou antes da inicialização${signal ? ` com ${signal}` : ` (código ${code ?? 0})`}.`));
    for (const other of children) if (other !== child && !other.killed) other.kill('SIGTERM');
    process.exitCode = code ?? (signal ? 1 : 0);
    console.error(`[${name}] encerrou${signal ? ` com ${signal}` : ` (código ${code ?? 0})`}.`);
  });
  return child;
}

for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => {
  if (stopping) return;
  stopping = true;
  for (const child of children) if (!child.killed) child.kill(signal);
});

if (emulatorServices.length) startChild('Firebase', [node, 'node_modules/firebase-tools/lib/bin/firebase.js', 'emulators:start', '--project', 'demo-leve', '--only', emulatorServices.join(','), ...persistence]);

async function waitForEmulators() {
  const endpoints = [
    'http://localhost:9099/emulator/v1/projects/demo-leve/config',
    'http://localhost:8080/',
  ];
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if (stopping) throw new Error('O processo local encerrou antes de os emuladores ficarem prontos.');
    const ready = await Promise.all(endpoints.map(async url => {
      try {
        await fetch(url, { signal: AbortSignal.timeout(1_000) });
        return true;
      } catch {
        return false;
      }
    }));
    if (ready.every(Boolean)) return;
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error('Os emuladores Auth e Firestore não ficaram prontos em 120 segundos.');
}

await Promise.race([
  waitForEmulators(),
  new Promise((_, reject) => { failStartup = reject; }),
]).finally(() => { failStartup = undefined; });

startChild('API', [node, 'server/dev.ts']);
startChild('Web', [node, 'node_modules/vite/bin/vite.js', '--config', 'apps/web/vite.config.ts', '--port', '5174', '--strictPort']);
