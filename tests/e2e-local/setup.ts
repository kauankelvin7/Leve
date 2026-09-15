import { spawn } from 'node:child_process';

export default async function setup() {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(process.execPath, ['scripts/seed-local.mjs'], { stdio: 'inherit', env: { ...process.env, LEVE_RESET_SEED: 'true' } });
    child.once('error', reject);
    child.once('exit', code => code === 0 ? resolve() : reject(new Error(`O seed local terminou com código ${code}.`)));
  });
}
