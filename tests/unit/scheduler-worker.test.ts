import { webcrypto } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { expect, it, vi } from 'vitest';
import { validTickSignature } from '../../server/tick-signature';

it('worker agenda o tick com assinatura aceita pela API', async () => {
  const source = (await readFile('workers/scheduler/src/index.js', 'utf8')).replace('export default', 'worker =');
  const fetch = vi.fn(async (_input: URL, _init?: RequestInit) => new Response(null, { status: 204 }));
  const sandbox: Record<string, any> = { worker: null, crypto: webcrypto, TextEncoder, Uint8Array, URL, Response, fetch };
  runInNewContext(source, sandbox);
  let completion: Promise<unknown> | undefined;
  await sandbox.worker.scheduled({}, { SCHEDULER_HMAC_SECRET: 'segredo-local', LEVE_API_ORIGIN: 'https://leve.example' }, {
    waitUntil: (promise: Promise<unknown>) => { completion = promise; },
  });
  await completion;

  expect(fetch).toHaveBeenCalledOnce();
  const [url, init] = fetch.mock.calls[0]!;
  const headers = init!.headers as Record<string, string>;
  expect(String(url)).toBe('https://leve.example/api/internal/tick');
  expect(init!.method).toBe('POST');
  expect(validTickSignature('segredo-local', headers['x-leve-timestamp']!, headers['x-leve-signature']!)).toBe(true);
});
