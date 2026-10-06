import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { expect, it, vi } from 'vitest';

it('exibe os dados aninhados recebidos do FCM e preserva o destino', async () => {
  const listeners = new Map<string, (event: any) => void>();
  const showNotification = vi.fn(async () => undefined);
  const worker = await readFile('apps/web/public/sw.js', 'utf8');
  const self = {
    location: { origin: 'https://leve.example' },
    registration: { showNotification },
    clients: { matchAll: vi.fn(async () => []) },
    addEventListener: (name: string, listener: (event: any) => void) => listeners.set(name, listener),
  };
  runInNewContext(worker, { self, caches: {}, fetch: vi.fn(), URL });
  let completion: Promise<unknown> | undefined;
  listeners.get('push')!({
    data: { json: () => ({ data: { title: 'Lembrete do Leve', body: '“Dentista” começa em 10 minutos. Já já é hora.', url: '/atividade/abc', tag: 'activity-abc' } }) },
    waitUntil: (promise: Promise<unknown>) => { completion = promise; },
  });
  await completion;
  expect(showNotification).toHaveBeenCalledWith('Lembrete do Leve', expect.objectContaining({
    body: '“Dentista” começa em 10 minutos. Já já é hora.',
    data: { url: '/atividade/abc' },
    tag: 'activity-abc',
  }));
});
