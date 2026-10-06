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
    data: { json: () => ({ data: { uid: 'account-a', title: 'Dentista', body: 'Seu compromisso começa em 10 minutos.', url: '/atividade/abc', tag: 'activity-abc' } }) },
    waitUntil: (promise: Promise<unknown>) => { completion = promise; },
  });
  await completion;
  expect(showNotification).toHaveBeenCalledWith('Lembrete do Leve', expect.objectContaining({
    body: 'Chegou a hora de uma atividade. Toque para abrir sua agenda.',
    icon: '/icons/icon-192.png?v=4',
    badge: '/icons/badge-96.png?v=4',
    actions: [{ action: 'open-activity', title: 'Ver atividade' }],
    data: { url: '/atividade/abc', uid: 'account-a' },
    tag: 'activity-abc',
  }));
});

it('oferece ícones PNG reais e separados para instalação e máscaras do Android', async () => {
  const manifest = JSON.parse(await readFile('apps/web/public/manifest.webmanifest', 'utf8'));
  const deployment = JSON.parse(await readFile('vercel.json', 'utf8'));
  const fallback = new RegExp(`^${deployment.rewrites.at(-1).source.slice('/:path('.length, -1)}$`);
  expect(manifest.icons.map((icon: { purpose: string }) => icon.purpose)).toEqual(['any', 'any', 'maskable']);
  for (const icon of manifest.icons) {
    const png = await readFile(`apps/web/public${icon.src.split('?')[0]}`);
    expect(png.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
    expect(`${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`).toBe(icon.sizes);
    expect(icon.type).toBe('image/png');
    expect(fallback.test(icon.src.split('?')[0].slice(1))).toBe(false);
  }
  expect(fallback.test('icons/badge-96.png')).toBe(false);
});

it('abre a atividade quando o botão da notificação é acionado', async () => {
  const listeners = new Map<string, (event: any) => void>();
  const navigate = vi.fn(async () => undefined);
  const close = vi.fn();
  const worker = await readFile('apps/web/public/sw.js', 'utf8');
  const client = { url: 'https://leve.example/hoje', focus: vi.fn(async () => client), navigate };
  const self = {
    location: { origin: 'https://leve.example' },
    clients: { matchAll: vi.fn(async () => [client]), openWindow: vi.fn() },
    addEventListener: (name: string, listener: (event: any) => void) => listeners.set(name, listener),
  };
  runInNewContext(worker, { self, caches: {}, fetch: vi.fn(), URL });
  let completion: Promise<unknown> | undefined;
  listeners.get('notificationclick')!({
    action: 'open-activity', notification: { close, data: { url: '/atividade/abc' } },
    waitUntil: (promise: Promise<unknown>) => { completion = promise; },
  });
  await completion;
  expect(close).toHaveBeenCalledOnce();
  expect(client.focus).toHaveBeenCalledOnce();
  expect(navigate).toHaveBeenCalledWith('https://leve.example/atividade/abc');
});
