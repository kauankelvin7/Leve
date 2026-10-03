import { spawn } from 'node:child_process';
const mode = process.argv[2] ?? 'e2e';
const phase = mode === 'before' ? 'before' : 'after';
const commands = mode === 'verify' ? [['scripts/glass/check.mjs'], ['node_modules/@playwright/test/cli.js', 'test', '--config', 'playwright.glass.config.ts']] : mode === 'selftest' ? [['scripts/glass/selftest.mjs']] : [['node_modules/@playwright/test/cli.js', 'test', '--config', 'playwright.glass.config.ts', ...process.argv.slice(3)]];
for (const args of commands) {
  const code = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { stdio: 'inherit', env: { ...process.env, GLASS_PHASE: mode === 'verify' ? 'after' : process.env.GLASS_PHASE ?? phase, GLASS_COMPLETE: mode === 'verify' ? '1' : process.env.GLASS_COMPLETE ?? '0', GLASS_CAPTURE: mode === 'before' || mode === 'after' ? '1' : process.env.GLASS_CAPTURE ?? '0', GEMINI_API_KEY: '' } });
    const stop = signal => child.kill(signal); process.on('SIGINT', stop); process.on('SIGTERM', stop);
    child.once('error', reject); child.once('exit', code => { process.removeListener('SIGINT', stop); process.removeListener('SIGTERM', stop); resolve(code ?? 1); });
  });
  if (code) { process.exitCode = code; break; }
}
